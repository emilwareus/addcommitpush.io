"""Integration tests for Jarvis streaming pipeline.

These tests hit real services (Groq API) and use real pipeline logic.
No mocks for the streaming logic itself. Uses FakeAgent only to avoid
requiring GROQ_API_KEY for config/STT/sentence-boundary tests.
The AgentStreaming and PipelineStreaming test classes use real Groq API.
"""

import asyncio
import json
import re

import numpy as np
import pytest

from jarvis.agent import JarvisAgent, _extract_respond_delta
from jarvis.pipeline import JarvisPipeline, SENTENCE_BOUNDARY


# ─── Helpers ──────────────────────────────────────────────────────────────────


class FakeAgent:
    """Minimal agent stand-in for tests that don't need LLM calls."""

    def __init__(self) -> None:
        self.slide_context: dict = {}
        self._active_llm = "gpt-oss-120b"
        self._llm_models = ["gpt-oss-120b", "gpt-5.4"]
        # Configurable response for testing
        self.batch_response: list[dict] = [
            {"name": "respond", "args": {"text": "Hello! I am Jarvis. Nice to meet you."}}
        ]

    @property
    def llm_model(self) -> str:
        return self._active_llm

    @property
    def available_llm_models(self) -> list[str]:
        return list(self._llm_models)

    def set_llm_model(self, name: str) -> None:
        if name not in self._llm_models:
            raise ValueError(f"Unknown LLM model: {name!r}")
        self._active_llm = name

    def update_slide_context(self, context: dict) -> None:
        self.slide_context = context

    def process_utterance(self, transcript: str) -> list[dict]:
        return self.batch_response

    def process_utterance_streaming(self, transcript: str):
        """Simulate streaming: yield clean text deltas then the tool call."""
        for tc in self.batch_response:
            if tc["name"] == "respond":
                text = tc["args"]["text"]
                # Yield word-by-word to simulate real streaming
                words = text.split(" ")
                for i, word in enumerate(words):
                    delta = word if i == 0 else " " + word
                    yield {"type": "delta", "text": delta}
            yield {"type": "tool_call", "name": tc["name"], "args": tc["args"]}


class FakeModelManager:
    """Minimal model manager that provides real transcription-like behavior
    without loading GPU models. Uses deterministic responses for testing."""

    def __init__(self) -> None:
        self._transcribe_result = "Hey Jarvis, tell me about yourself"
        self._transcribe_fast_result = "Hey Jarvis tell"
        self._active_stt = "whisper-small"
        self._stt_models = ["whisper-small", "moonshine-small", "moonshine-medium"]

    @property
    def stt_model(self) -> str:
        return self._active_stt

    @property
    def available_stt_models(self) -> list[str]:
        return list(self._stt_models)

    def set_stt_model(self, name: str) -> None:
        if name not in self._stt_models:
            raise ValueError(f"Unknown STT model: {name!r}")
        self._active_stt = name

    def vad_predict(self, audio_chunk: np.ndarray, sample_rate: int) -> float:
        """Always returns speech detected."""
        return 0.9

    def transcribe(self, audio: np.ndarray) -> str:
        return self._transcribe_result

    def transcribe_fast(self, audio: np.ndarray) -> str:
        return self._transcribe_fast_result

    async def synthesize_stream(self, text: str, cancel_event=None):
        """Yield a small chunk of fake audio for each call."""
        samples = np.zeros(2400, dtype=np.float32)  # 100ms at 24kHz
        yield samples, 24000


class MessageCollector:
    """Collects JSON messages and audio sent by the pipeline."""

    def __init__(self) -> None:
        self.json_messages: list[dict] = []
        self.audio_chunks: list[bytes] = []

    async def send_json(self, data: dict) -> None:
        self.json_messages.append(data)

    async def send_audio(self, pcm_bytes: bytes) -> None:
        self.audio_chunks.append(pcm_bytes)

    def messages_of_type(self, msg_type: str) -> list[dict]:
        return [m for m in self.json_messages if m.get("type") == msg_type]

    def clear(self) -> None:
        self.json_messages.clear()
        self.audio_chunks.clear()


# ─── Pipeline unit tests (no Groq API needed) ────────────────────────────────


class TestStreamingConfig:
    """Test streaming config management."""

    def test_default_config_is_all_off(self) -> None:
        collector = MessageCollector()
        pipeline = JarvisPipeline(
            FakeModelManager(), collector.send_json, collector.send_audio, agent=FakeAgent()
        )
        assert pipeline.streaming_config == {"stt": False, "llm": False, "tts": False}

    def test_update_streaming_config(self) -> None:
        collector = MessageCollector()
        pipeline = JarvisPipeline(
            FakeModelManager(), collector.send_json, collector.send_audio, agent=FakeAgent()
        )
        pipeline.update_streaming_config({"stt": True, "llm": False, "tts": True})
        assert pipeline.streaming_config == {"stt": True, "llm": False, "tts": True}

    def test_update_streaming_config_partial(self) -> None:
        collector = MessageCollector()
        pipeline = JarvisPipeline(
            FakeModelManager(), collector.send_json, collector.send_audio, agent=FakeAgent()
        )
        pipeline.update_streaming_config({"stt": True})
        assert pipeline.streaming_config == {"stt": True, "llm": False, "tts": False}

    def test_update_streaming_config_ignores_unknown_keys(self) -> None:
        collector = MessageCollector()
        pipeline = JarvisPipeline(
            FakeModelManager(), collector.send_json, collector.send_audio, agent=FakeAgent()
        )
        pipeline.update_streaming_config({"stt": True, "foo": "bar"})
        assert pipeline.streaming_config == {"stt": True, "llm": False, "tts": False}


class TestExtractRespondDelta:
    """Test _extract_respond_delta extracts only text value content."""

    def test_no_delta_before_value_starts(self) -> None:
        buf = {"name": "respond", "arguments": '{"te'}
        assert _extract_respond_delta(buf) == ""

    def test_no_delta_for_key_prefix(self) -> None:
        buf = {"name": "respond", "arguments": '{"text": "'}
        # Only 0 chars of value content, holdback of 2 means nothing to yield
        assert _extract_respond_delta(buf) == ""

    def test_yields_text_content_not_json(self) -> None:
        buf = {"name": "respond", "arguments": '{"text": "Hello world'}
        result = _extract_respond_delta(buf)
        # "Hello world" is 11 chars of value, holdback 2 = yield 9 chars
        assert result == "Hello wor"
        assert '{"text"' not in result

    def test_incremental_yields(self) -> None:
        buf = {"name": "respond", "arguments": '{"text": "Hello'}
        d1 = _extract_respond_delta(buf)
        assert d1 == "Hel"  # 5 chars - 2 holdback = 3

        buf["arguments"] += " world"
        d2 = _extract_respond_delta(buf)
        assert d2 == "lo wor"  # new content up to holdback

        buf["arguments"] += '!"}'
        d3 = _extract_respond_delta(buf)
        assert d3 == "ld!"  # remaining content, holdback covers "}

    def test_no_json_wrapper_in_output(self) -> None:
        """Full JSON argument string should never leak JSON syntax."""
        buf = {"name": "respond", "arguments": '{"text": "Hi there."}'}
        all_text = ""
        all_text += _extract_respond_delta(buf)
        assert "{" not in all_text
        assert "}" not in all_text
        assert '"text"' not in all_text

    def test_empty_text_value(self) -> None:
        buf = {"name": "respond", "arguments": '{"text": ""}'}
        assert _extract_respond_delta(buf) == ""


class TestSentenceBoundary:
    """Test the SENTENCE_BOUNDARY regex used for TTS streaming."""

    def test_splits_on_period(self) -> None:
        text = "Hello world. How are you?"
        parts = SENTENCE_BOUNDARY.split(text)
        assert parts == ["Hello world.", "How are you?"]

    def test_splits_on_exclamation(self) -> None:
        text = "Wow! That is great."
        parts = SENTENCE_BOUNDARY.split(text)
        assert parts == ["Wow!", "That is great."]

    def test_splits_on_question_mark(self) -> None:
        text = "Really? I think so. Me too!"
        parts = SENTENCE_BOUNDARY.split(text)
        assert parts == ["Really?", "I think so.", "Me too!"]

    def test_no_split_on_abbreviation_like_patterns(self) -> None:
        # Single sentence, no space after period at end
        text = "Hello world."
        parts = SENTENCE_BOUNDARY.split(text)
        assert parts == ["Hello world."]

    def test_empty_string(self) -> None:
        parts = SENTENCE_BOUNDARY.split("")
        assert parts == [""]


class TestSTTStreamingPartials:
    """Test that STT streaming emits partial_transcript messages."""

    @pytest.mark.asyncio
    async def test_partial_transcripts_emitted_when_stt_streaming_on(self) -> None:
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio, agent=FakeAgent())
        pipeline.update_streaming_config({"stt": True})

        # Simulate 40 speech chunks (~1.3s of speech, enough to trigger a partial)
        chunk = np.ones(512, dtype=np.float32) * 0.1  # Speech-like amplitude
        for _ in range(40):
            await pipeline._process_vad_chunk(chunk)

        partials = collector.messages_of_type("partial_transcript")
        assert len(partials) >= 1
        assert partials[0]["text"] == "Hey Jarvis tell"

    @pytest.mark.asyncio
    async def test_no_partials_when_stt_streaming_off(self) -> None:
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio, agent=FakeAgent())
        # STT streaming OFF (default)

        chunk = np.ones(512, dtype=np.float32) * 0.1
        for _ in range(40):
            await pipeline._process_vad_chunk(chunk)

        partials = collector.messages_of_type("partial_transcript")
        assert len(partials) == 0


class TestBatchPipeline:
    """Test the batch (non-streaming) utterance processing path using FakeAgent."""

    @pytest.mark.asyncio
    async def test_batch_utterance_sends_transcript_and_audio(self) -> None:
        """With all streaming OFF, verify the batch path sends transcript + audio."""
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio, agent=FakeAgent())

        # Simulate a complete utterance in the buffer
        chunk = np.ones(512, dtype=np.float32) * 0.1
        pipeline.audio_buffer = [chunk] * 200  # ~6.4s of audio

        await pipeline._process_utterance()

        # Should have user transcript
        user_transcripts = [
            t for t in collector.messages_of_type("transcript")
            if t.get("role") == "user"
        ]
        assert len(user_transcripts) == 1
        assert user_transcripts[0]["text"] == "Hey Jarvis, tell me about yourself"

        # Should have assistant transcript (from FakeAgent)
        assistant_transcripts = [
            t for t in collector.messages_of_type("transcript")
            if t.get("role") == "assistant"
        ]
        assert len(assistant_transcripts) == 1
        assert "Jarvis" in assistant_transcripts[0]["text"]

        # Should have audio output
        assert len(collector.audio_chunks) > 0

        # Should NOT have response_delta (batch mode)
        assert len(collector.messages_of_type("response_delta")) == 0

        # Should have status transitions: thinking -> speaking -> idle
        statuses = [s["status"] for s in collector.messages_of_type("status")]
        assert "thinking" in statuses
        assert "speaking" in statuses
        assert "idle" in statuses

    @pytest.mark.asyncio
    async def test_streaming_llm_sends_deltas_with_fake_agent(self) -> None:
        """With LLM streaming ON, pipeline should send response_delta messages."""
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio, agent=FakeAgent())
        pipeline.update_streaming_config({"llm": True})

        chunk = np.ones(512, dtype=np.float32) * 0.1
        pipeline.audio_buffer = [chunk] * 200

        await pipeline._process_utterance()

        # Should have response_delta messages
        deltas = collector.messages_of_type("response_delta")
        assert len(deltas) > 0, "LLM streaming ON but no response_delta messages"

        # Should have final assistant transcript
        assistant_transcripts = [
            t for t in collector.messages_of_type("transcript")
            if t.get("role") == "assistant"
        ]
        assert len(assistant_transcripts) == 1

        # Should have audio
        assert len(collector.audio_chunks) > 0

    @pytest.mark.asyncio
    async def test_tts_streaming_splits_sentences_with_fake_agent(self) -> None:
        """With LLM + TTS streaming ON, should synthesize per-sentence."""
        collector = MessageCollector()
        models = FakeModelManager()
        # Use multi-sentence response
        agent = FakeAgent()
        agent.batch_response = [
            {"name": "respond", "args": {"text": "First sentence. Second sentence. Third sentence."}}
        ]
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio, agent=agent)
        pipeline.update_streaming_config({"llm": True, "tts": True})

        chunk = np.ones(512, dtype=np.float32) * 0.1
        pipeline.audio_buffer = [chunk] * 200

        await pipeline._process_utterance()

        # With 3 sentences, we should get at least 3 audio synthesis calls
        # Each fake synthesize_stream yields 1 chunk
        assert len(collector.audio_chunks) >= 3

    @pytest.mark.asyncio
    async def test_tts_batch_with_llm_streaming_synthesizes_once(self) -> None:
        """With LLM streaming ON but TTS OFF, should synthesize full text at once."""
        collector = MessageCollector()
        models = FakeModelManager()
        agent = FakeAgent()
        agent.batch_response = [
            {"name": "respond", "args": {"text": "First sentence. Second sentence. Third sentence."}}
        ]
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio, agent=agent)
        pipeline.update_streaming_config({"llm": True, "tts": False})

        chunk = np.ones(512, dtype=np.float32) * 0.1
        pipeline.audio_buffer = [chunk] * 200

        await pipeline._process_utterance()

        # With TTS streaming OFF, Kokoro's synthesize_stream yields chunks but
        # was called only once with the full text, so we get 1 chunk
        assert len(collector.audio_chunks) == 1


# ─── Agent streaming tests (requires GROQ_API_KEY) ───────────────────────────


@pytest.mark.skipif(
    not __import__("os").environ.get("GROQ_API_KEY"),
    reason="GROQ_API_KEY not set",
)
class TestAgentStreaming:
    """Integration tests for agent streaming with real Groq API."""

    def test_batch_process_utterance_returns_tool_calls(self) -> None:
        agent = JarvisAgent()
        agent.slide_context = {"current_title": "Test", "remaining": 5}
        result = agent.process_utterance("Hey Jarvis, say hello")
        # Should return at least one tool call (respond or update_thinking)
        assert isinstance(result, list)
        for tc in result:
            assert "name" in tc
            assert "args" in tc
            assert tc["name"] in ("respond", "update_thinking")

    def test_streaming_process_utterance_yields_events(self) -> None:
        agent = JarvisAgent()
        agent.slide_context = {"current_title": "Test", "remaining": 5}

        events = list(agent.process_utterance_streaming("Hey Jarvis, say hello"))
        assert len(events) > 0

        # Should have at least one tool_call event
        tool_calls = [e for e in events if e["type"] == "tool_call"]
        assert len(tool_calls) >= 1

        for tc in tool_calls:
            assert tc["name"] in ("respond", "update_thinking")
            assert "args" in tc

    def test_streaming_yields_deltas_before_tool_call(self) -> None:
        """When the agent uses the respond tool, deltas should come before the final tool_call."""
        agent = JarvisAgent()
        agent.slide_context = {"current_title": "Test", "remaining": 5}

        events = list(agent.process_utterance_streaming("Hey Jarvis, say hello"))

        # Find if there's a respond tool call
        respond_calls = [e for e in events if e["type"] == "tool_call" and e["name"] == "respond"]
        deltas = [e for e in events if e["type"] == "delta"]

        if respond_calls:
            # If there's a respond call, there should be deltas before it
            assert len(deltas) > 0, "Expected delta events before respond tool call"
            # All deltas should come before tool calls in the event list
            first_tool_call_idx = next(
                i for i, e in enumerate(events) if e["type"] == "tool_call"
            )
            delta_indices = [
                i for i, e in enumerate(events) if e["type"] == "delta"
            ]
            assert all(
                d < first_tool_call_idx for d in delta_indices
            ), "Deltas should come before tool calls"

    def test_streaming_delta_text_matches_final_respond_args(self) -> None:
        """The concatenation of all delta texts should be the respond text
        (minus up to 2 chars from holdback)."""
        agent = JarvisAgent()
        agent.slide_context = {"current_title": "Test", "remaining": 5}

        events = list(agent.process_utterance_streaming("Hey Jarvis, say hello"))

        respond_calls = [e for e in events if e["type"] == "tool_call" and e["name"] == "respond"]
        deltas = [e for e in events if e["type"] == "delta"]

        if respond_calls and deltas:
            delta_concat = "".join(d["text"] for d in deltas)
            final_text = respond_calls[0]["args"]["text"]
            # Deltas are now clean text content (not raw JSON).
            # Due to the 2-char holdback, the delta_concat may be missing
            # the last 2 characters of the final text.
            assert final_text.startswith(delta_concat), (
                f"Delta concat should be a prefix of final text.\n"
                f"  delta_concat: {delta_concat!r}\n"
                f"  final_text:   {final_text!r}"
            )

    def test_conversation_history_updated_after_streaming(self) -> None:
        agent = JarvisAgent()
        agent.slide_context = {"current_title": "Test", "remaining": 5}

        initial_len = len(agent.conversation_history)
        list(agent.process_utterance_streaming("Hey Jarvis, say hello"))

        # Should have added user message and assistant response
        assert len(agent.conversation_history) >= initial_len + 2


# ─── Full pipeline streaming integration (requires GROQ_API_KEY) ─────────────


@pytest.mark.skipif(
    not __import__("os").environ.get("GROQ_API_KEY"),
    reason="GROQ_API_KEY not set",
)
class TestPipelineStreamingRealAPI:
    """End-to-end pipeline streaming tests with real Groq API + real JarvisAgent."""

    @pytest.mark.asyncio
    async def test_streaming_llm_sends_response_deltas(self) -> None:
        """With LLM streaming ON, pipeline should send response_delta messages."""
        collector = MessageCollector()
        models = FakeModelManager()
        # No agent= arg: uses real JarvisAgent with real Groq API
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio)
        pipeline.update_streaming_config({"llm": True})

        chunk = np.ones(512, dtype=np.float32) * 0.1
        pipeline.audio_buffer = [chunk] * 200

        await pipeline._process_utterance()

        deltas = collector.messages_of_type("response_delta")
        transcripts = collector.messages_of_type("transcript")
        statuses = collector.messages_of_type("status")

        user_transcripts = [t for t in transcripts if t.get("role") == "user"]
        assert len(user_transcripts) == 1

        status_values = [s["status"] for s in statuses]
        assert "thinking" in status_values
        assert "idle" in status_values

        # "Hey Jarvis" in transcript should trigger a respond
        assistant_transcripts = [t for t in transcripts if t.get("role") == "assistant"]
        if assistant_transcripts:
            assert len(deltas) > 0, "LLM streaming ON but no response_delta messages sent"
            assert "speaking" in status_values
            assert len(collector.audio_chunks) > 0

    @pytest.mark.asyncio
    async def test_batch_llm_sends_no_deltas(self) -> None:
        """With LLM streaming OFF, pipeline should NOT send response_delta messages."""
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(models, collector.send_json, collector.send_audio)

        chunk = np.ones(512, dtype=np.float32) * 0.1
        pipeline.audio_buffer = [chunk] * 200

        await pipeline._process_utterance()

        deltas = collector.messages_of_type("response_delta")
        assert len(deltas) == 0, "Batch mode should not produce response_delta messages"


# ─── STT model switching tests ────────────────────────────────────────────────


class TestSTTModelSwitching:
    """Test STT model switching via FakeModelManager and pipeline."""

    def test_default_stt_model(self) -> None:
        models = FakeModelManager()
        assert models.stt_model == "whisper-small"

    def test_available_stt_models(self) -> None:
        models = FakeModelManager()
        assert models.available_stt_models == ["whisper-small", "moonshine-small", "moonshine-medium"]

    def test_set_stt_model(self) -> None:
        models = FakeModelManager()
        models.set_stt_model("moonshine-small")
        assert models.stt_model == "moonshine-small"

    def test_set_stt_model_unknown_raises(self) -> None:
        models = FakeModelManager()
        with pytest.raises(ValueError, match="Unknown STT model"):
            models.set_stt_model("nonexistent")

    def test_pipeline_set_stt_model_delegates(self) -> None:
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(
            models, collector.send_json, collector.send_audio, agent=FakeAgent()
        )
        pipeline.set_stt_model("moonshine-medium")
        assert models.stt_model == "moonshine-medium"

    def test_pipeline_set_stt_model_invalid_raises(self) -> None:
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(
            models, collector.send_json, collector.send_audio, agent=FakeAgent()
        )
        with pytest.raises(ValueError):
            pipeline.set_stt_model("bad-model")


# ─── LLM model switching tests ───────────────────────────────────────────────


class TestLLMModelSwitching:
    """Test LLM model switching via FakeAgent and pipeline."""

    def test_default_llm_model(self) -> None:
        agent = FakeAgent()
        assert agent.llm_model == "gpt-oss-120b"

    def test_available_llm_models(self) -> None:
        agent = FakeAgent()
        assert agent.available_llm_models == ["gpt-oss-120b", "gpt-5.4"]

    def test_set_llm_model(self) -> None:
        agent = FakeAgent()
        agent.set_llm_model("gpt-5.4")
        assert agent.llm_model == "gpt-5.4"

    def test_set_llm_model_unknown_raises(self) -> None:
        agent = FakeAgent()
        with pytest.raises(ValueError, match="Unknown LLM model"):
            agent.set_llm_model("nonexistent")

    def test_pipeline_set_llm_model_delegates(self) -> None:
        collector = MessageCollector()
        models = FakeModelManager()
        agent = FakeAgent()
        pipeline = JarvisPipeline(
            models, collector.send_json, collector.send_audio, agent=agent
        )
        pipeline.set_llm_model("gpt-5.4")
        assert agent.llm_model == "gpt-5.4"

    def test_pipeline_set_llm_model_invalid_raises(self) -> None:
        collector = MessageCollector()
        models = FakeModelManager()
        pipeline = JarvisPipeline(
            models, collector.send_json, collector.send_audio, agent=FakeAgent()
        )
        with pytest.raises(ValueError):
            pipeline.set_llm_model("bad-model")


# ─── OpenAI gpt-5.4 integration test (requires OPENAI_API_KEY) ──────────────


@pytest.mark.skipif(
    not __import__("os").environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set",
)
class TestOpenAIGPT54:
    """Integration test: real call to gpt-5.4 via JarvisAgent."""

    def test_gpt54_responds_to_hi(self) -> None:
        """Send 'Hey Jarvis, hi' to gpt-5.4 and verify we get a valid response."""
        agent = JarvisAgent()
        agent.set_llm_model("gpt-5.4")
        agent.slide_context = {"current_title": "Test Slide", "remaining": 1}

        result = agent.process_utterance("Hey Jarvis, hi")

        assert isinstance(result, list)
        assert len(result) >= 1

        # Should have a respond or update_thinking tool call
        names = [tc["name"] for tc in result]
        assert any(n in ("respond", "update_thinking") for n in names), (
            f"Expected respond or update_thinking, got: {names}"
        )

        # If there's a respond call, text should be non-empty
        respond_calls = [tc for tc in result if tc["name"] == "respond"]
        for tc in respond_calls:
            assert "text" in tc["args"]
            assert len(tc["args"]["text"].strip()) > 0

    def test_gpt54_streaming_responds(self) -> None:
        """Stream 'Hey Jarvis, hi' to gpt-5.4 and verify delta + tool_call events."""
        agent = JarvisAgent()
        agent.set_llm_model("gpt-5.4")
        agent.slide_context = {"current_title": "Test Slide", "remaining": 1}

        events = list(agent.process_utterance_streaming("Hey Jarvis, hi"))

        assert len(events) > 0

        tool_calls = [e for e in events if e["type"] == "tool_call"]
        assert len(tool_calls) >= 1

        names = [tc["name"] for tc in tool_calls]
        assert any(n in ("respond", "update_thinking") for n in names), (
            f"Expected respond or update_thinking, got: {names}"
        )
