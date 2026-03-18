"""Jarvis LLM Agent — multi-provider agent with tool use.

Supports Groq and OpenAI as LLM backends, switchable at runtime.

The agent processes transcribed utterances and decides whether to:
1. Respond vocally (via the `respond` tool) — only when addressed as "Jarvis"
2. Update its thinking display (via `update_thinking`) — silent sidebar observations
3. Do nothing — when the speech is just the presenter talking
"""

import json
import re
from pathlib import Path

from groq import Groq
from openai import OpenAI

from .config import DEFAULT_LLM_MODEL, LLM_MODELS, MAX_TOKENS, TEMPERATURE

RESEARCH_DIR = Path(__file__).parent.parent


def _load_slide_notes_by_title() -> dict[str, str]:
    """Load slide notes from slide-content.json, keyed by title."""
    path = Path(__file__).parent / "slide-content.json"
    data = json.loads(path.read_text())
    return {s["title"]: s["notes"] for s in data["slides"]}


def _load_research_docs() -> dict[str, str]:
    """Load deep-dive research documents from the presentation directory."""
    docs: dict[str, str] = {}
    for name, filename in [
        ("Kokoro TTS", "KOKORO-DEEP-DIVE.md"),
        ("Transport (WebSocket vs WebRTC)", "TRANSPORT-DEEP-DIVE.md"),
        ("Whisper STT", "WHISPER-DEEP-DIVE.md"),
        ("Moonshine STT", "MOONSHINE-DEEP-DIVE.md"),
        ("STT Landscape", "STT-DEEP-DIVE.md"),
        ("TTS Landscape", "TTS-DEEP-DIVE.md"),
    ]:
        path = RESEARCH_DIR / filename
        if path.exists():
            docs[name] = path.read_text()
    return docs


SLIDE_NOTES_BY_TITLE = _load_slide_notes_by_title()
RESEARCH_DOCS = _load_research_docs()

RESEARCH_TOPIC_LIST = ", ".join(RESEARCH_DOCS.keys())

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "respond",
            "description": (
                "Generate a spoken voice response to the audience. "
                "ONLY call this when the user says 'hey Jarvis' or directly addresses Jarvis."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The text to speak aloud. Keep it concise (1-3 sentences).",
                    }
                },
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_thinking",
            "description": (
                "Update the thinking display in the sidebar. "
                "Use this to show observations, insights, or processing status WITHOUT speaking aloud."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "thought": {
                        "type": "string",
                        "description": "Internal observation or note to display in the sidebar.",
                    }
                },
                "required": ["thought"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_research",
            "description": (
                f"Look up detailed research on a topic. Available topics: {RESEARCH_TOPIC_LIST}. "
                "Call this when the presenter or audience asks a technical question you need "
                "deep knowledge to answer. The result will be added to your context."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": f"The research topic to look up. Must be one of: {RESEARCH_TOPIC_LIST}",
                    }
                },
                "required": ["topic"],
            },
        },
    },
]


def build_system_prompt(slide_context: dict, llm_model_name: str = "") -> str:
    return f"""You are Jarvis, an AI co-presenter at a technical talk about building real-time voice agents.
You are co-presenting with Emil Wåreus at Barrel.ai. You are always listening and aware of what is being said.

Current slide: {slide_context.get('current_title', 'Unknown')}
Current slide content: {slide_context.get('current_notes', '')}
Next slide: {slide_context.get('next_title', 'None')}
Slides remaining: {slide_context.get('remaining', 0)}

You have been built using:
- faster-whisper (small model) + Moonshine v2 (small/medium) for speech-to-text (switchable live)
- Kokoro-82M (PyTorch, am_adam voice) for text-to-speech
- Silero VAD for voice activity detection
- LLM: {llm_model_name or 'unknown'} (switchable between Groq and OpenAI models)
- WebSocket + WebRTC (hot-swappable) for real-time audio streaming
- All running locally on macOS (no Docker)

You have deep research available on: {RESEARCH_TOPIC_LIST}.
Use the lookup_research tool when you need detailed technical knowledge to answer a question.

Rules:
- You are ALWAYS listening and processing what you hear
- Use update_thinking to show your observations in the sidebar (the audience can see this)
- ONLY use the respond tool when you hear "hey Jarvis" or are directly addressed by name
- When responding, keep it concise (1-3 sentences) — you're speaking aloud
- You know the full presentation content and can preview upcoming topics
- Be witty, sharp, and technically knowledgeable
- Reference specific things that were said earlier in the talk
- If asked about yourself, explain how you were built (the tech stack above)
- When asked a deep technical question, use lookup_research first, then respond with specifics

Conversation so far (what you've heard):
"""


def _build_llm_clients() -> dict[str, dict]:
    """Build client instances for each configured LLM model."""
    clients: dict[str, dict] = {}
    groq_client: Groq | None = None
    openai_client: OpenAI | None = None
    for cfg in LLM_MODELS:
        if cfg["provider"] == "groq":
            if groq_client is None:
                groq_client = Groq()
            clients[cfg["name"]] = {"client": groq_client, "model": cfg["model"]}
        elif cfg["provider"] == "openai":
            if openai_client is None:
                openai_client = OpenAI()
            clients[cfg["name"]] = {"client": openai_client, "model": cfg["model"]}
    return clients


class JarvisAgent:
    """Multi-provider LLM agent that processes utterances and returns tool calls."""

    def __init__(self) -> None:
        self._llm_clients = _build_llm_clients()
        self._active_llm = DEFAULT_LLM_MODEL
        self.conversation_history: list[dict] = []
        self.slide_context: dict = {}
        self.transcript_buffer: str = ""

    @property
    def llm_model(self) -> str:
        """Name of the active LLM model."""
        return self._active_llm

    @property
    def available_llm_models(self) -> list[str]:
        """Names of all configured LLM models."""
        return list(self._llm_clients.keys())

    def set_llm_model(self, name: str) -> None:
        """Switch the active LLM model."""
        if name not in self._llm_clients:
            raise ValueError(f"Unknown LLM model: {name!r}. Available: {list(self._llm_clients.keys())}")
        self._active_llm = name

    def _chat_create(self, *, stream: bool = False, **kwargs):
        """Create a chat completion using the active LLM backend."""
        entry = self._llm_clients[self._active_llm]
        return entry["client"].chat.completions.create(
            model=entry["model"],
            stream=stream,
            **kwargs,
        )

    def update_slide_context(self, context: dict) -> None:
        """Update the agent's knowledge of the current slide.

        Enriches current_notes from slide-content.json if not already provided.
        """
        if not context.get("current_notes"):
            title = context.get("current_title", "")
            context["current_notes"] = SLIDE_NOTES_BY_TITLE.get(title, "")
        self.slide_context = context

    def append_transcript(self, text: str) -> None:
        """Append heard speech to the running transcript buffer."""
        self.transcript_buffer += " " + text
        # Keep last ~2000 chars to manage context size
        if len(self.transcript_buffer) > 2000:
            self.transcript_buffer = self.transcript_buffer[-2000:]

    def _build_messages(self, system_prompt: str) -> list[dict]:
        """Build the messages array for the LLM call."""
        return [
            {"role": "system", "content": system_prompt},
            *self.conversation_history,
        ]

    def _trim_history(self) -> None:
        """Keep conversation history within bounds."""
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]

    @staticmethod
    def _resolve_research(topic: str) -> str:
        """Look up a research document by topic name. Fuzzy matches on substring."""
        topic_lower = topic.lower()
        for name, content in RESEARCH_DOCS.items():
            if topic_lower in name.lower() or name.lower() in topic_lower:
                # Truncate to ~6000 chars to stay within context budget
                return content[:6000]
        return f"No research found for topic: {topic}"

    def process_utterance(self, transcript: str) -> list[dict]:
        """Process a complete utterance through the LLM.

        Supports multi-turn tool use: if the LLM calls lookup_research,
        the result is injected and the LLM is called again.

        Args:
            transcript: The transcribed text of what was just said.

        Returns:
            List of tool call dicts: [{"name": str, "args": dict}, ...]
        """
        self.append_transcript(transcript)
        self.conversation_history.append({"role": "user", "content": transcript})
        self._trim_history()

        system_prompt = build_system_prompt(self.slide_context, self._active_llm)
        system_prompt += self.transcript_buffer

        messages = self._build_messages(system_prompt)

        # Allow up to 2 rounds (research lookup + final response)
        for _ in range(2):
            response = self._chat_create(
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=MAX_TOKENS,
                temperature=TEMPERATURE,
            )

            message = response.choices[0].message
            tool_calls = []
            needs_followup = False

            if message.tool_calls:
                for tc in message.tool_calls:
                    args = json.loads(tc.function.arguments)
                    if tc.function.name == "lookup_research":
                        # Handle internally: inject research and re-call LLM
                        research_content = self._resolve_research(args.get("topic", ""))
                        messages.append({
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [{"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}],
                        })
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": research_content,
                        })
                        needs_followup = True
                    else:
                        tool_calls.append({"name": tc.function.name, "args": args})

            if needs_followup:
                continue

            # Record in history
            self.conversation_history.append({
                "role": "assistant",
                "content": message.content or "",
            })
            return tool_calls

        # Fallthrough: record whatever we got
        self.conversation_history.append({
            "role": "assistant",
            "content": message.content or "",
        })
        return tool_calls

    def process_utterance_streaming(self, transcript: str):
        """Process an utterance with streaming LLM response.

        Supports multi-turn: if the LLM calls lookup_research in the first
        (non-streaming) pass, we inject the result and stream the second call.

        Yields dicts:
          {"type": "delta", "text": str}       — incremental *text content* (not raw JSON)
          {"type": "tool_call", "name": str, "args": dict} — completed tool call
        """
        self.append_transcript(transcript)
        self.conversation_history.append({"role": "user", "content": transcript})
        self._trim_history()

        system_prompt = build_system_prompt(self.slide_context, self._active_llm)
        system_prompt += self.transcript_buffer

        messages = self._build_messages(system_prompt)

        # First pass: non-streaming to check for lookup_research
        first_response = self._chat_create(
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )

        first_message = first_response.choices[0].message
        has_research_lookup = False

        if first_message.tool_calls:
            for tc in first_message.tool_calls:
                if tc.function.name == "lookup_research":
                    args = json.loads(tc.function.arguments)
                    research_content = self._resolve_research(args.get("topic", ""))
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}],
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": research_content,
                    })
                    has_research_lookup = True

        if not has_research_lookup:
            # No research lookup — replay the first response as if it were streamed
            tool_calls = []
            if first_message.tool_calls:
                for tc in first_message.tool_calls:
                    args = json.loads(tc.function.arguments)
                    if tc.function.name == "respond":
                        yield {"type": "delta", "text": args["text"]}
                    tool_calls.append({"name": tc.function.name, "args": args})
                for tc_dict in tool_calls:
                    yield {"type": "tool_call", "name": tc_dict["name"], "args": tc_dict["args"]}
            self.conversation_history.append({
                "role": "assistant",
                "content": first_message.content or "",
            })
            return

        # Second pass: stream the follow-up response with research context
        yield from self._stream_llm(messages)

    def _stream_llm(self, messages: list[dict]):
        """Stream an LLM call, yielding delta and tool_call events."""
        stream = self._chat_create(
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            stream=True,
        )

        tool_call_buffers: dict[int, dict] = {}
        content_buffer = ""

        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if not delta:
                continue

            if delta.content:
                content_buffer += delta.content

            if delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    idx = tc_delta.index
                    if idx not in tool_call_buffers:
                        tool_call_buffers[idx] = {"name": "", "arguments": ""}
                    if tc_delta.function:
                        if tc_delta.function.name:
                            tool_call_buffers[idx]["name"] = tc_delta.function.name
                        if tc_delta.function.arguments:
                            tool_call_buffers[idx]["arguments"] += tc_delta.function.arguments

                            buf = tool_call_buffers[idx]
                            if buf["name"] == "respond":
                                text = _extract_respond_delta(buf)
                                if text:
                                    yield {"type": "delta", "text": text}

        for _idx, buf in sorted(tool_call_buffers.items()):
            args = json.loads(buf["arguments"])
            yield {"type": "tool_call", "name": buf["name"], "args": args}

        self.conversation_history.append({
            "role": "assistant",
            "content": content_buffer,
        })


_VALUE_PREFIX = re.compile(r'"text"\s*:\s*"')


def _extract_respond_delta(buf: dict) -> str:
    """Extract new text content from the accumulated respond arguments.

    The JSON arguments are always {"text": "CONTENT"}. We track where the
    text value starts and how much we've already yielded. We hold back 2
    characters to avoid yielding the closing '"}' of the JSON.
    """
    args_str = buf["arguments"]

    # Find where the text value starts (only once)
    if "_vstart" not in buf:
        m = _VALUE_PREFIX.search(args_str)
        if m:
            buf["_vstart"] = m.end()
            buf["_yielded"] = 0
        else:
            return ""

    vstart = buf["_vstart"]
    # Hold back 2 chars to avoid yielding closing "}
    safe_end = max(0, len(args_str) - vstart - 2)

    if safe_end <= buf["_yielded"]:
        return ""

    new_text = args_str[vstart + buf["_yielded"] : vstart + safe_end]
    buf["_yielded"] = safe_end
    return new_text
