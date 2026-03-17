# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "faster-whisper>=1.0.0",
#     "numpy>=1.24.0",
#     "sounddevice>=0.5.0",
# ]
# ///
"""
01 — Basic Speech-to-Text with faster-whisper

Records 5 seconds of audio from your microphone, then transcribes it
using faster-whisper (small model, CPU int8).

Usage:
    uv run 01-whisper-basic.py
"""

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel

SAMPLE_RATE = 16000
DURATION_S = 5
MODEL_SIZE = "small"

print(f"Loading Whisper ({MODEL_SIZE}, int8)...")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

print(f"Recording {DURATION_S}s — speak now!")
audio = sd.rec(
    int(DURATION_S * SAMPLE_RATE),
    samplerate=SAMPLE_RATE,
    channels=1,
    dtype="float32",
)
sd.wait()
print("Recording complete.\n")

audio = audio.squeeze()  # (samples,)

segments, info = model.transcribe(audio, beam_size=5, language="en")
text = " ".join(seg.text for seg in segments).strip()

print(f"Language: {info.language} (prob {info.language_probability:.2f})")
print(f"Transcript: {text}")
