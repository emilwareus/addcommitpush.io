"""STT backend abstraction — pluggable speech-to-text engines.

Supports faster-whisper and moonshine-voice with a common interface.
All backends accept float32 numpy arrays at 16kHz and return text.
"""

from typing import Protocol

import numpy as np


class STTBackend(Protocol):
    """Common interface for speech-to-text backends."""

    name: str

    def transcribe(self, audio: np.ndarray) -> str:
        """Full-quality transcription."""
        ...

    def transcribe_fast(self, audio: np.ndarray) -> str:
        """Fast transcription for partial/interim results."""
        ...


class WhisperBackend:
    """faster-whisper STT backend."""

    def __init__(self, model_size: str, compute_type: str) -> None:
        from faster_whisper import WhisperModel

        self.name = f"whisper-{model_size}"
        self._model = WhisperModel(model_size, device="cpu", compute_type=compute_type)

    def transcribe(self, audio: np.ndarray) -> str:
        segments, _ = self._model.transcribe(
            audio, beam_size=5, language="en", vad_filter=False,
        )
        return " ".join(s.text for s in segments).strip()

    def transcribe_fast(self, audio: np.ndarray) -> str:
        segments, _ = self._model.transcribe(
            audio, beam_size=1, language="en", vad_filter=False,
        )
        return " ".join(s.text for s in segments).strip()


class MoonshineBackend:
    """moonshine-voice STT backend."""

    def __init__(self, name: str, model_arch: str) -> None:
        from moonshine_voice import ModelArch, Transcriber, get_model_for_language

        arch = getattr(ModelArch, model_arch)
        model_path, resolved_arch = get_model_for_language("en", arch)
        self.name = name
        self._transcriber = Transcriber(
            model_path, resolved_arch, options={"vad_threshold": 0.0},
        )

    def transcribe(self, audio: np.ndarray) -> str:
        transcript = self._transcriber.transcribe_without_streaming(audio, 16000)
        return " ".join(line.text for line in transcript.lines).strip()

    def transcribe_fast(self, audio: np.ndarray) -> str:
        # Moonshine is already fast; no beam_size knob
        return self.transcribe(audio)
