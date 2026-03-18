"""Jarvis LLM Agent — Groq-powered agent with tool use.

The agent processes transcribed utterances and decides whether to:
1. Respond vocally (via the `respond` tool) — only when addressed as "Jarvis"
2. Update its thinking display (via `update_thinking`) — silent sidebar observations
3. Do nothing — when the speech is just the presenter talking
"""

import json
import re
from pathlib import Path

from groq import Groq

from .config import GROQ_MODEL, MAX_TOKENS, TEMPERATURE


def _load_slide_notes_by_title() -> dict[str, str]:
    """Load slide notes from slide-content.json, keyed by title."""
    path = Path(__file__).parent / "slide-content.json"
    data = json.loads(path.read_text())
    return {s["title"]: s["notes"] for s in data["slides"]}


SLIDE_NOTES_BY_TITLE = _load_slide_notes_by_title()

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
]


def build_system_prompt(slide_context: dict) -> str:
    return f"""You are Jarvis, an AI co-presenter at a technical talk about building real-time voice agents.
You are co-presenting with Emil Wåreus at Barrel.ai. You are always listening and aware of what is being said.

Current slide: {slide_context.get('current_title', 'Unknown')}
Current slide content: {slide_context.get('current_notes', '')}
Next slide: {slide_context.get('next_title', 'None')}
Slides remaining: {slide_context.get('remaining', 0)}

You have been built using:
- faster-whisper (small model) for speech-to-text
- Kokoro-82M (kokoro-onnx, am_adam voice) for text-to-speech
- Silero VAD for voice activity detection
- Groq API (GPT-OSS 120B) for reasoning
- WebSocket (WSS via mkcert) for real-time audio streaming
- All running locally on macOS (no Docker)

Rules:
- You are ALWAYS listening and processing what you hear
- Use update_thinking to show your observations in the sidebar (the audience can see this)
- ONLY use the respond tool when you hear "hey Jarvis" or are directly addressed by name
- When responding, keep it concise (1-3 sentences) — you're speaking aloud
- You know the full presentation content and can preview upcoming topics
- Be witty, sharp, and technically knowledgeable
- Reference specific things that were said earlier in the talk
- If asked about yourself, explain how you were built (the tech stack above)

Conversation so far (what you've heard):
"""


class JarvisAgent:
    """Groq LLM agent that processes utterances and returns tool calls."""

    def __init__(self) -> None:
        self.client = Groq()
        self.conversation_history: list[dict] = []
        self.slide_context: dict = {}
        self.transcript_buffer: str = ""

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

    def process_utterance(self, transcript: str) -> list[dict]:
        """Process a complete utterance through the LLM.

        Args:
            transcript: The transcribed text of what was just said.

        Returns:
            List of tool call dicts: [{"name": str, "args": dict}, ...]
        """
        self.append_transcript(transcript)

        self.conversation_history.append({"role": "user", "content": transcript})

        # Keep last 20 messages to manage context
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]

        system_prompt = build_system_prompt(self.slide_context)
        # Append the full transcript buffer to the system prompt
        system_prompt += self.transcript_buffer

        messages = [
            {"role": "system", "content": system_prompt},
            *self.conversation_history,
        ]

        response = self.client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )

        message = response.choices[0].message
        tool_calls = []

        if message.tool_calls:
            for tc in message.tool_calls:
                args = json.loads(tc.function.arguments)
                tool_calls.append({
                    "name": tc.function.name,
                    "args": args,
                })
            # Record in history (simplified — no tool_call IDs needed)
            self.conversation_history.append({
                "role": "assistant",
                "content": message.content or "",
            })
        elif message.content:
            self.conversation_history.append({
                "role": "assistant",
                "content": message.content,
            })

        return tool_calls

    def process_utterance_streaming(self, transcript: str):
        """Process an utterance with streaming LLM response.

        Yields dicts:
          {"type": "delta", "text": str}       — incremental *text content* (not raw JSON)
          {"type": "tool_call", "name": str, "args": dict} — completed tool call
        """
        self.append_transcript(transcript)
        self.conversation_history.append({"role": "user", "content": transcript})

        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]

        system_prompt = build_system_prompt(self.slide_context)
        system_prompt += self.transcript_buffer

        messages = [
            {"role": "system", "content": system_prompt},
            *self.conversation_history,
        ]

        stream = self.client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            stream=True,
        )

        # Accumulate tool call fragments by index
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

                            # For respond tool, extract and yield only the text
                            # value content — not the raw JSON wrapper.
                            buf = tool_call_buffers[idx]
                            if buf["name"] == "respond":
                                text = _extract_respond_delta(buf)
                                if text:
                                    yield {"type": "delta", "text": text}

        # Emit completed tool calls
        for _idx, buf in sorted(tool_call_buffers.items()):
            args = json.loads(buf["arguments"])
            yield {"type": "tool_call", "name": buf["name"], "args": args}

        # Record in history
        if tool_call_buffers:
            self.conversation_history.append({
                "role": "assistant",
                "content": content_buffer,
            })
        elif content_buffer:
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
