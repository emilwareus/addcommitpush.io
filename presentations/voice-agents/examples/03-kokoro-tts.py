# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "kokoro-onnx>=0.4.0",
#     "numpy>=1.24.0",
#     "sounddevice>=0.5.0",
# ]
# ///
"""
03 — Text-to-Speech with Kokoro-82M (ONNX)

Synthesizes a sentence using kokoro-onnx and plays it through
your speakers.

Prerequisites:
    Download models to a local `models/` directory:
        kokoro-v1.0.onnx
        voices-v1.0.bin
    See: https://github.com/thewh1teagle/kokoro-onnx

Usage:
    uv run 03-kokoro-tts.py
    uv run 03-kokoro-tts.py "Your custom text here"
"""

import sys

import numpy as np
import sounddevice as sd
import kokoro_onnx

MODEL_PATH = "models/kokoro-v1.0.onnx"
VOICES_PATH = "models/voices-v1.0.bin"
VOICE = "am_adam"
SPEED = 1.0
LANG = "en-us"

text = sys.argv[1] if len(sys.argv) > 1 else (
    "Hello! I'm Kokoro, an 82 million parameter text-to-speech model. "
    "I can run entirely on your CPU in real time."
)

print(f"Loading Kokoro from {MODEL_PATH}...")
kokoro = kokoro_onnx.Kokoro(MODEL_PATH, VOICES_PATH)

print(f"Synthesizing: \"{text}\"")
samples, sample_rate = kokoro.create(text, voice=VOICE, speed=SPEED, lang=LANG)

print(f"Playing audio ({len(samples)} samples at {sample_rate} Hz)...")
sd.play(samples, samplerate=sample_rate)
sd.wait()
print("Done.")
