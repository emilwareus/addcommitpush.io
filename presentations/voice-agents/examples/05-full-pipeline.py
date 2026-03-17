# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "faster-whisper>=1.0.0",
#     "kokoro-onnx>=0.4.0",
#     "silero-vad>=5.1",
#     "groq>=0.11.0",
#     "numpy>=1.24.0",
#     "sounddevice>=0.5.0",
#     "torch>=2.0.0",
# ]
# ///
"""
05 — Full Voice Pipeline: VAD → Whisper → Groq → Kokoro

Minimal end-to-end voice agent. Listens for speech, transcribes it,
generates a response with Groq, synthesizes audio with Kokoro,
and plays it back. ~100 lines of core logic.

Prerequisites:
    - Models in models/ (kokoro-v1.0.onnx, voices-v1.0.bin)
    - export GROQ_API_KEY=your-key

Usage:
    uv run 05-full-pipeline.py
    # Speak, wait for silence, hear the response. Ctrl+C to stop.
"""

import numpy as np
import sounddevice as sd
import torch
from faster_whisper import WhisperModel
from groq import Groq
from silero_vad import load_silero_vad
import kokoro_onnx

# --- Config ---
SAMPLE_RATE = 16000
CHUNK_MS = 30
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_MS / 1000)
VAD_THRESHOLD = 0.5
SILENCE_CHUNKS = 23  # ~700 ms of silence ends an utterance

WHISPER_MODEL = "small"
GROQ_MODEL = "llama-3.3-70b-versatile"
KOKORO_MODEL = "models/kokoro-v1.0.onnx"
KOKORO_VOICES = "models/voices-v1.0.bin"
VOICE = "am_adam"

# --- Load models ---
print("Loading models...")
vad = load_silero_vad()
whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
kokoro = kokoro_onnx.Kokoro(KOKORO_MODEL, KOKORO_VOICES)
groq_client = Groq()

# Pre-warm TTS
kokoro.create("ready", voice=VOICE, speed=1.0, lang="en-us")
print("All models loaded. Speak!\n")

# --- Pipeline ---
def transcribe(audio: np.ndarray) -> str:
    segments, _ = whisper.transcribe(audio, beam_size=5, language="en")
    return " ".join(s.text for s in segments).strip()


def generate_response(text: str) -> str:
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful voice assistant. Keep responses to 1-2 sentences."},
            {"role": "user", "content": text},
        ],
        max_tokens=150,
        temperature=0.7,
    )
    return response.choices[0].message.content


def speak(text: str) -> None:
    samples, sr = kokoro.create(text, voice=VOICE, speed=1.0, lang="en-us")
    sd.play(samples, samplerate=sr)
    sd.wait()


# --- Main loop ---
audio_buffer: list[np.ndarray] = []
is_speaking = False
silence_count = 0

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

            if prob >= VAD_THRESHOLD:
                if not is_speaking:
                    print("Listening...", end="", flush=True)
                is_speaking = True
                silence_count = 0
                audio_buffer.append(chunk.squeeze())

            elif is_speaking:
                silence_count += 1
                audio_buffer.append(chunk.squeeze())

                if silence_count >= SILENCE_CHUNKS:
                    # Utterance complete — run the pipeline
                    full_audio = np.concatenate(audio_buffer)
                    audio_buffer.clear()
                    is_speaking = False
                    silence_count = 0

                    transcript = transcribe(full_audio)
                    if not transcript.strip():
                        continue

                    print(f"\nYou: {transcript}")

                    response = generate_response(transcript)
                    print(f"AI:  {response}\n")

                    speak(response)

except KeyboardInterrupt:
    print("\nStopped.")
