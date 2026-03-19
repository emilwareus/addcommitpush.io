"""ModelManager — loads and manages STT backends, Kokoro TTS, and Silero VAD.

Adapted from Podidex's ModelManager pattern.
Uses MPS (Apple Silicon GPU) for Kokoro TTS, CPU for STT and VAD.
Thread-safe access via per-model locks.
"""

import platform
import threading
import time

import numpy as np

from .config import (
    DEFAULT_STT_MODEL,
    KOKORO_SPEED,
    KOKORO_VOICE,
    OUTPUT_SAMPLE_RATE,
    STT_MODELS,
    WHISPER_COMPUTE_TYPE,
    WHISPER_MODEL,
)
from .stt import MoonshineBackend, STTBackend, WhisperBackend


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
        self._stt_backends: dict[str, STTBackend] = {}
        self._active_stt: str = DEFAULT_STT_MODEL
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

        # STT backends — all pre-loaded for instant hot-swap
        t1 = time.time()
        print(f"  Loading whisper-small ({WHISPER_MODEL}, {WHISPER_COMPUTE_TYPE})...")
        self._stt_backends["whisper-small"] = WhisperBackend(WHISPER_MODEL, WHISPER_COMPUTE_TYPE)
        print(f"  whisper-small loaded in {time.time() - t1:.1f}s")

        t2 = time.time()
        print("  Loading moonshine-small...")
        self._stt_backends["moonshine-small"] = MoonshineBackend("moonshine-small", "SMALL_STREAMING")
        print(f"  moonshine-small loaded in {time.time() - t2:.1f}s")

        t3 = time.time()
        print("  Loading moonshine-medium...")
        self._stt_backends["moonshine-medium"] = MoonshineBackend("moonshine-medium", "MEDIUM_STREAMING")
        print(f"  moonshine-medium loaded in {time.time() - t3:.1f}s")

        self._active_stt = DEFAULT_STT_MODEL

        # Kokoro TTS (PyTorch — supports MPS on Apple Silicon)
        t4 = time.time()
        self._tts_device = _detect_tts_device()
        print(f"  Loading Kokoro TTS (device={self._tts_device})...")
        from kokoro import KPipeline

        self._kokoro = KPipeline(lang_code="a", device=self._tts_device)
        print(f"  Kokoro loaded in {time.time() - t4:.1f}s")

        # Pre-warm TTS to avoid first-call latency
        print("  Warming up TTS...")
        for _, _, audio in self._kokoro("warmup", voice=KOKORO_VOICE):
            if audio is not None:
                break

        print(f"  All models loaded in {time.time() - t0:.1f}s")
        print(f"  STT backends: {list(self._stt_backends.keys())} (active: {self._active_stt})")
        print(f"  Devices: STT=cpu, TTS={self._tts_device}, VAD=cpu")

    @property
    def tts_device(self) -> str:
        """The device Kokoro TTS is running on."""
        return self._tts_device

    def vad_predict(self, audio_chunk: np.ndarray, sample_rate: int) -> float:
        """Returns speech probability for a 30ms chunk."""
        tensor = self._torch.from_numpy(audio_chunk).float()
        return self._vad(tensor, sample_rate).item()

    @property
    def stt_model(self) -> str:
        """Name of the active STT backend."""
        return self._active_stt

    @property
    def available_stt_models(self) -> list[str]:
        """Names of all loaded STT backends."""
        return list(self._stt_backends.keys())

    def set_stt_model(self, name: str) -> None:
        """Switch the active STT backend. Thread-safe."""
        if name not in self._stt_backends:
            raise ValueError(f"Unknown STT model: {name!r}. Available: {list(self._stt_backends.keys())}")
        with self._stt_lock:
            self._active_stt = name

    def transcribe(self, audio: np.ndarray) -> str:
        """Transcribe audio with the active STT backend. Thread-safe."""
        with self._stt_lock:
            return self._stt_backends[self._active_stt].transcribe(audio)

    def transcribe_fast(self, audio: np.ndarray) -> str:
        """Fast transcription with the active STT backend. Thread-safe."""
        with self._stt_lock:
            return self._stt_backends[self._active_stt].transcribe_fast(audio)

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

    async def synthesize_stream(self, text: str, cancel_event: threading.Event | None = None):
        """Async generator yielding (samples, sample_rate) chunks.

        Uses Kokoro's generator API for lower time-to-first-audio.
        Holds the TTS lock for the entire stream.

        Args:
            text: Text to synthesize.
            cancel_event: If set, stops synthesis between chunks (barge-in).
        """
        with self._tts_lock:
            for _, _, audio in self._kokoro(
                text, voice=KOKORO_VOICE, speed=KOKORO_SPEED
            ):
                if cancel_event and cancel_event.is_set():
                    break
                if audio is not None:
                    samples = audio.numpy() if hasattr(audio, "numpy") else audio
                    yield samples, OUTPUT_SAMPLE_RATE
