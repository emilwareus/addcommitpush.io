# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "silero-vad>=5.1",
#     "numpy>=1.24.0",
#     "sounddevice>=0.5.0",
#     "torch>=2.0.0",
# ]
# ///
"""
02 — Streaming Voice Activity Detection with Silero VAD

Streams microphone audio through Silero VAD and prints whether
speech is detected in real time (30 ms chunks).

Usage:
    uv run 02-vad-streaming.py
    # Press Ctrl+C to stop
"""

import numpy as np
import sounddevice as sd
import torch
from silero_vad import load_silero_vad

SAMPLE_RATE = 16000
CHUNK_MS = 30
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_MS / 1000)  # 480
THRESHOLD = 0.5

print("Loading Silero VAD...")
vad = load_silero_vad()

print("Listening — speak to see detection. Ctrl+C to stop.\n")

was_speaking = False

try:
    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        blocksize=CHUNK_SAMPLES,
    ) as stream:
        while True:
            chunk, _ = stream.read(CHUNK_SAMPLES)
            tensor = torch.from_numpy(chunk.squeeze()).float()
            prob = vad(tensor, SAMPLE_RATE).item()

            is_speaking = prob >= THRESHOLD

            if is_speaking and not was_speaking:
                print(f"🎤 Speaking... (confidence {prob:.2f})")
            elif not is_speaking and was_speaking:
                print(f"   Silence.   (confidence {prob:.2f})")

            was_speaking = is_speaking

except KeyboardInterrupt:
    print("\nStopped.")
