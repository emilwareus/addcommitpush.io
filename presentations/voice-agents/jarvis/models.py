"""ModelManager — loads and manages Whisper, Kokoro, and Silero VAD models.

Adapted from Podidex's ModelManager pattern. Simplified for CPU-only macOS.
Thread-safe access via per-model locks.
"""

import threading
import time

import numpy as np

from .config import (
    KOKORO_LANG,
    KOKORO_SPEED,
    KOKORO_VOICE,
    WHISPER_COMPUTE_TYPE,
    WHISPER_MODEL,
)


class ModelManager:
    """Loads and manages all ML models for Jarvis. Thread-safe."""

    def __init__(self) -> None:
        self._stt_lock = threading.Lock()
        self._tts_lock = threading.Lock()
        self._whisper = None
        self._kokoro = None
        self._vad = None

    def load_all(self) -> None:
        """Load all models. Call once at startup."""
        t0 = time.time()

        # Silero VAD (1.8MB, instant load)
        print("  Loading Silero VAD...")
        import torch  # noqa: F811
        from silero_vad import load_silero_vad

        self._vad = load_silero_vad()
        self._torch = torch
        print(f"  VAD loaded in {time.time() - t0:.1f}s")

        # faster-whisper (small model, CPU int8)
        t1 = time.time()
        print(f"  Loading faster-whisper ({WHISPER_MODEL}, {WHISPER_COMPUTE_TYPE})...")
        from faster_whisper import WhisperModel

        self._whisper = WhisperModel(
            WHISPER_MODEL,
            device="cpu",
            compute_type=WHISPER_COMPUTE_TYPE,
        )
        print(f"  Whisper loaded in {time.time() - t1:.1f}s")

        # kokoro-onnx (CPU, ~80MB quantized)
        t2 = time.time()
        print("  Loading Kokoro TTS...")
        import kokoro_onnx

        self._kokoro = kokoro_onnx.Kokoro(
            "models/kokoro-v1.0.onnx",
            "models/voices-v1.0.bin",
        )
        print(f"  Kokoro loaded in {time.time() - t2:.1f}s")

        # Pre-warm TTS to avoid first-call latency
        print("  Warming up TTS...")
        self._kokoro.create(
            "warmup",
            voice=KOKORO_VOICE,
            speed=KOKORO_SPEED,
            lang=KOKORO_LANG,
        )

        print(f"  All models loaded in {time.time() - t0:.1f}s")

    def vad_predict(self, audio_chunk: np.ndarray, sample_rate: int) -> float:
        """Returns speech probability for a 30ms chunk.

        Args:
            audio_chunk: float32 audio, 480 samples at 16kHz.
            sample_rate: Sample rate (16000).

        Returns:
            Speech probability [0, 1].
        """
        tensor = self._torch.from_numpy(audio_chunk).float()
        return self._vad(tensor, sample_rate).item()

    def transcribe(self, audio: np.ndarray) -> str:
        """Transcribe audio with Whisper. Thread-safe.

        Args:
            audio: float32 normalized audio at 16kHz.

        Returns:
            Transcribed text.
        """
        with self._stt_lock:
            segments, _ = self._whisper.transcribe(
                audio,
                beam_size=5,
                language="en",
                vad_filter=False,
            )
            return " ".join(s.text for s in segments).strip()

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        """Synthesize text to audio with Kokoro. Thread-safe.

        Args:
            text: Text to synthesize.

        Returns:
            Tuple of (float32 audio samples, sample_rate).
        """
        with self._tts_lock:
            samples, sr = self._kokoro.create(
                text,
                voice=KOKORO_VOICE,
                speed=KOKORO_SPEED,
                lang=KOKORO_LANG,
            )
            return samples, sr

    async def synthesize_stream(self, text: str):
        """Async generator yielding (samples, sample_rate) chunks.

        Uses Kokoro's streaming API for lower time-to-first-audio.
        Holds the TTS lock for the entire stream.
        """
        with self._tts_lock:
            stream = self._kokoro.create_stream(
                text,
                voice=KOKORO_VOICE,
                speed=KOKORO_SPEED,
                lang=KOKORO_LANG,
            )
            async for samples, sr in stream:
                yield samples, sr
