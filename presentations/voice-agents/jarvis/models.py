"""ModelManager — loads and manages Whisper, Kokoro, and Silero VAD models.

Adapted from Podidex's ModelManager pattern.
Uses MPS (Apple Silicon GPU) for Kokoro TTS, CPU for faster-whisper and VAD.
Thread-safe access via per-model locks.
"""

import platform
import threading
import time

import numpy as np

from .config import (
    KOKORO_SPEED,
    KOKORO_VOICE,
    OUTPUT_SAMPLE_RATE,
    WHISPER_COMPUTE_TYPE,
    WHISPER_MODEL,
)


def _is_mps_available() -> bool:
    """Check if Apple Silicon MPS is available."""
    try:
        import torch

        backends = getattr(torch, "backends", None)
        mps_module = getattr(backends, "mps", None)
        is_available = getattr(mps_module, "is_available", None)
        return bool(callable(is_available) and is_available())
    except Exception:
        return False


def _detect_tts_device() -> str:
    """Detect the best device for Kokoro TTS (supports MPS)."""
    if _is_mps_available() and platform.system() == "Darwin":
        return "mps"
    return "cpu"


class ModelManager:
    """Loads and manages all ML models for Jarvis. Thread-safe."""

    def __init__(self) -> None:
        self._stt_lock = threading.Lock()
        self._tts_lock = threading.Lock()
        self._whisper = None
        self._kokoro = None
        self._vad = None
        self._tts_device = "cpu"

    def load_all(self) -> None:
        """Load all models. Call once at startup."""
        t0 = time.time()

        # Silero VAD (1.8MB, instant load)
        print("  Loading Silero VAD...")
        import torch
        from silero_vad import load_silero_vad

        self._vad = load_silero_vad()
        self._torch = torch
        print(f"  VAD loaded in {time.time() - t0:.1f}s")

        # faster-whisper (CPU only — no MPS support in CTranslate2)
        t1 = time.time()
        print(f"  Loading faster-whisper ({WHISPER_MODEL}, {WHISPER_COMPUTE_TYPE})...")
        from faster_whisper import WhisperModel

        self._whisper = WhisperModel(
            WHISPER_MODEL,
            device="cpu",
            compute_type=WHISPER_COMPUTE_TYPE,
        )
        print(f"  Whisper loaded in {time.time() - t1:.1f}s")

        # Kokoro TTS (PyTorch — supports MPS on Apple Silicon)
        t2 = time.time()
        self._tts_device = _detect_tts_device()
        print(f"  Loading Kokoro TTS (device={self._tts_device})...")
        from kokoro import KPipeline

        self._kokoro = KPipeline(lang_code="a", device=self._tts_device)
        print(f"  Kokoro loaded in {time.time() - t2:.1f}s")

        # Pre-warm TTS to avoid first-call latency
        print("  Warming up TTS...")
        for _, _, audio in self._kokoro("warmup", voice=KOKORO_VOICE):
            if audio is not None:
                break

        print(f"  All models loaded in {time.time() - t0:.1f}s")
        print(f"  Devices: STT=cpu, TTS={self._tts_device}, VAD=cpu")

    @property
    def tts_device(self) -> str:
        """The device Kokoro TTS is running on."""
        return self._tts_device

    def vad_predict(self, audio_chunk: np.ndarray, sample_rate: int) -> float:
        """Returns speech probability for a 30ms chunk."""
        tensor = self._torch.from_numpy(audio_chunk).float()
        return self._vad(tensor, sample_rate).item()

    def transcribe(self, audio: np.ndarray) -> str:
        """Transcribe audio with Whisper. Thread-safe."""
        with self._stt_lock:
            segments, _ = self._whisper.transcribe(
                audio,
                beam_size=5,
                language="en",
                vad_filter=False,
            )
            return " ".join(s.text for s in segments).strip()

    def transcribe_fast(self, audio: np.ndarray) -> str:
        """Fast transcription with beam_size=1 for partial/interim results."""
        with self._stt_lock:
            segments, _ = self._whisper.transcribe(
                audio,
                beam_size=1,
                language="en",
                vad_filter=False,
            )
            return " ".join(s.text for s in segments).strip()

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        """Synthesize text to audio with Kokoro. Thread-safe.

        Returns:
            Tuple of (float32 audio samples, sample_rate).
        """
        with self._tts_lock:
            audio_chunks = []
            for _, _, audio in self._kokoro(
                text, voice=KOKORO_VOICE, speed=KOKORO_SPEED
            ):
                if audio is not None:
                    audio_chunks.append(audio.numpy() if hasattr(audio, "numpy") else audio)
            if audio_chunks:
                return np.concatenate(audio_chunks), OUTPUT_SAMPLE_RATE
            return np.array([], dtype=np.float32), OUTPUT_SAMPLE_RATE

    async def synthesize_stream(self, text: str):
        """Async generator yielding (samples, sample_rate) chunks.

        Uses Kokoro's generator API for lower time-to-first-audio.
        Holds the TTS lock for the entire stream.
        """
        with self._tts_lock:
            for _, _, audio in self._kokoro(
                text, voice=KOKORO_VOICE, speed=KOKORO_SPEED
            ):
                if audio is not None:
                    samples = audio.numpy() if hasattr(audio, "numpy") else audio
                    yield samples, OUTPUT_SAMPLE_RATE
