"""JarvisPipeline — orchestrates Audio In → VAD → STT → Agent → TTS → Audio Out.

Adapted from Podidex's SpeechPipeline but simplified:
- No speculative execution (simpler, sufficient for presentation)
- No barge-in (Jarvis speaks rarely, no need to interrupt)
- Backend VAD via Silero (not frontend RMS)
- Echo suppression via is_tts_playing flag from browser
"""

import asyncio
import re

import numpy as np

from .agent import JarvisAgent
from .audio import float32_to_int16
from .config import (
    CHUNK_SAMPLES,
    INPUT_SAMPLE_RATE,
    SILENCE_CHUNKS,
    VAD_THRESHOLD,
)
from .models import ModelManager

# ~1 second of speech at 32ms per chunk
PARTIAL_STT_INTERVAL = 31

# Regex to split text on sentence boundaries while keeping the delimiters
SENTENCE_BOUNDARY = re.compile(r'(?<=[.!?])\s+')


class JarvisPipeline:
    """Per-connection voice pipeline."""

    def __init__(self, models: ModelManager, send_json, send_audio, agent: JarvisAgent | None = None) -> None:
        """
        Args:
            models: Shared ModelManager instance.
            send_json: Async callable to send a JSON dict to the browser.
            send_audio: Async callable to send PCM bytes to the browser.
            agent: Optional JarvisAgent instance (created automatically if not provided).
        """
        self.models = models
        self.send_json = send_json
        self.send_audio = send_audio
        self.agent = agent if agent is not None else JarvisAgent()

        # VAD state
        self.audio_buffer: list[np.ndarray] = []
        self.is_speaking = False
        self.silence_count = 0

        # Echo suppression
        self.is_tts_playing = False

        # Processing lock — prevent overlapping utterance processing
        self._processing = False

        # Streaming config (all OFF by default = current batch behavior)
        self.streaming_config = {"stt": False, "llm": False, "tts": False}

        # STT streaming state
        self._chunks_since_partial = 0

    def update_streaming_config(self, config: dict) -> None:
        """Update streaming knobs from browser toggle."""
        for key in ("stt", "llm", "tts"):
            if key in config:
                self.streaming_config[key] = bool(config[key])

    async def feed_audio(self, pcm_bytes: bytes, is_tts_playing: bool) -> None:
        """Process an incoming audio chunk from the browser.

        Args:
            pcm_bytes: Raw PCM int16 audio at 16kHz.
            is_tts_playing: Whether TTS audio is currently playing in the browser.
        """
        self.is_tts_playing = is_tts_playing

        # Echo suppression: skip processing while TTS is playing
        if is_tts_playing:
            # Reset VAD state so we don't carry over stale speech
            if self.is_speaking:
                self.audio_buffer = []
                self.is_speaking = False
                self.silence_count = 0
            return

        # Don't accumulate audio while we're processing an utterance
        if self._processing:
            return

        # Convert int16 PCM to float32 normalized
        chunk = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        # Ensure chunk is exactly CHUNK_SAMPLES (480) for Silero VAD
        if len(chunk) < CHUNK_SAMPLES:
            chunk = np.pad(chunk, (0, CHUNK_SAMPLES - len(chunk)))
        elif len(chunk) > CHUNK_SAMPLES:
            # Process in CHUNK_SAMPLES-sized pieces
            for i in range(0, len(chunk), CHUNK_SAMPLES):
                sub = chunk[i : i + CHUNK_SAMPLES]
                if len(sub) == CHUNK_SAMPLES:
                    await self._process_vad_chunk(sub)
            return

        await self._process_vad_chunk(chunk)

    async def _process_vad_chunk(self, chunk: np.ndarray) -> None:
        """Process a single VAD-sized chunk."""
        speech_prob = self.models.vad_predict(chunk, INPUT_SAMPLE_RATE)

        if speech_prob >= VAD_THRESHOLD:
            self.is_speaking = True
            self.silence_count = 0
            self.audio_buffer.append(chunk)
            self._chunks_since_partial += 1

            await self.send_json({"type": "listening", "active": True})

            # STT streaming: emit partial transcripts while speaking
            if (
                self.streaming_config["stt"]
                and self._chunks_since_partial >= PARTIAL_STT_INTERVAL
                and len(self.audio_buffer) > 0
            ):
                self._chunks_since_partial = 0
                audio_so_far = np.concatenate(self.audio_buffer)
                loop = asyncio.get_event_loop()
                partial = await loop.run_in_executor(
                    None, self.models.transcribe_fast, audio_so_far
                )
                if partial.strip():
                    await self.send_json({
                        "type": "partial_transcript",
                        "text": partial,
                    })

        elif self.is_speaking:
            self.silence_count += 1
            self.audio_buffer.append(chunk)

            if self.silence_count >= SILENCE_CHUNKS:
                # Utterance complete — process it
                self._chunks_since_partial = 0
                await self.send_json({"type": "listening", "active": False})
                await self._process_utterance()
                self.audio_buffer = []
                self.is_speaking = False
                self.silence_count = 0

    async def _process_utterance(self) -> None:
        """Process a complete utterance through STT → Agent → TTS."""
        if not self.audio_buffer or self._processing:
            return

        self._processing = True
        try:
            full_audio = np.concatenate(self.audio_buffer)

            # Minimum audio length check (~0.3s)
            if len(full_audio) < INPUT_SAMPLE_RATE * 0.3:
                return

            # STT
            transcript = self.models.transcribe(full_audio)
            if not transcript.strip():
                return

            # Send transcript to browser
            await self.send_json({
                "type": "transcript",
                "text": transcript,
                "role": "user",
            })

            # Agent processing
            await self.send_json({"type": "status", "status": "thinking"})

            if self.streaming_config["llm"]:
                await self._process_utterance_streaming(transcript)
            else:
                await self._process_utterance_batch(transcript)

            await self.send_json({"type": "status", "status": "idle"})
        finally:
            self._processing = False

    async def _process_utterance_batch(self, transcript: str) -> None:
        """Batch LLM processing (original behavior)."""
        loop = asyncio.get_event_loop()
        tool_calls = await loop.run_in_executor(
            None, self.agent.process_utterance, transcript
        )

        for tc in tool_calls:
            if tc["name"] == "update_thinking":
                await self.send_json({
                    "type": "thinking",
                    "text": tc["args"]["thought"],
                })
            elif tc["name"] == "respond":
                response_text = tc["args"]["text"]

                await self.send_json({
                    "type": "transcript",
                    "text": response_text,
                    "role": "assistant",
                })

                await self.send_json({"type": "status", "status": "speaking"})
                await self._synthesize_and_send(response_text)

    async def _process_utterance_streaming(self, transcript: str) -> None:
        """Streaming LLM processing with optional sentence-level TTS.

        Uses an asyncio.Queue to bridge the sync generator (in executor)
        with the async event loop, so deltas are sent as they arrive.
        """
        queue: asyncio.Queue[dict | None] = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def _run_stream() -> None:
            for event in self.agent.process_utterance_streaming(transcript):
                loop.call_soon_threadsafe(queue.put_nowait, event)
            loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

        # Start the LLM stream in a thread
        stream_task = loop.run_in_executor(None, _run_stream)

        full_respond_text = ""
        tts_started = False
        tts_sentence_buffer = ""

        while True:
            event = await queue.get()
            if event is None:
                break

            if event["type"] == "delta":
                await self.send_json({
                    "type": "response_delta",
                    "text": event["text"],
                })

                # Sentence-level TTS: kick off synthesis on sentence boundaries
                if self.streaming_config["tts"]:
                    tts_sentence_buffer += event["text"]
                    while True:
                        match = SENTENCE_BOUNDARY.search(tts_sentence_buffer)
                        if not match:
                            break
                        sentence = tts_sentence_buffer[: match.start()].strip()
                        tts_sentence_buffer = tts_sentence_buffer[match.end() :]
                        if sentence:
                            if not tts_started:
                                await self.send_json({"type": "status", "status": "speaking"})
                                tts_started = True
                            await self._synthesize_and_send(sentence)

            elif event["type"] == "tool_call":
                if event["name"] == "update_thinking":
                    await self.send_json({
                        "type": "thinking",
                        "text": event["args"]["thought"],
                    })
                elif event["name"] == "respond":
                    full_respond_text = event["args"]["text"]
                    # Send final transcript to replace/finalize the delta message
                    await self.send_json({
                        "type": "transcript",
                        "text": full_respond_text,
                        "role": "assistant",
                    })

        await stream_task  # ensure executor thread is done

        if not full_respond_text:
            return

        if self.streaming_config["tts"]:
            # Synthesize any leftover text after the last sentence boundary
            leftover = tts_sentence_buffer.strip()
            if leftover:
                if not tts_started:
                    await self.send_json({"type": "status", "status": "speaking"})
                await self._synthesize_and_send(leftover)
        else:
            # TTS streaming OFF — synthesize the full text as one batch
            await self.send_json({"type": "status", "status": "speaking"})
            await self._synthesize_and_send(full_respond_text)

    async def _synthesize_and_send(self, text: str) -> None:
        """Synthesize text with Kokoro and stream audio to the browser."""
        async for samples, _sr in self.models.synthesize_stream(text):
            int16_samples = float32_to_int16(samples)
            await self.send_audio(int16_samples.tobytes())

    def update_slide_context(self, context: dict) -> None:
        """Update the agent's knowledge of the current slide."""
        self.agent.update_slide_context(context)
