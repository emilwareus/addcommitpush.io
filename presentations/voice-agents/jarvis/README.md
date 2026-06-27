# Jarvis — AI Co-Presenter Backend

Local Python backend for the Jarvis AI co-presenter. Runs the full voice pipeline:
**Silero VAD → faster-whisper STT → Groq LLM (with tools) → Kokoro TTS (MPS/GPU)**

Kokoro TTS runs on Apple Silicon GPU (MPS) when available, faster-whisper on CPU (int8).

## Prerequisites

- macOS (tested on Apple Silicon)
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (`brew install uv`)
- `espeak-ng` (required by Kokoro)
- `mkcert` (for WSS from HTTPS sites)
- Groq API key

## Quick Start

```bash
cd presentations/voice-agents/jarvis
make setup   # installs deps, certs, creates .env
# Edit .env and add your GROQ_API_KEY
make run
```

## Manual Setup

```bash
# 1. Install system dependencies
brew install espeak-ng mkcert

# 2. Setup trusted localhost SSL (needed if presentation runs on HTTPS/Vercel)
mkcert -install
cd presentations/voice-agents/jarvis
mkcert localhost 127.0.0.1

# 3. Install dependencies with uv
uv sync

# 4. Configure API key
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# 5. Run
make run
```

Kokoro models are downloaded automatically from HuggingFace on first run.

## Run

```bash
cd presentations/voice-agents/jarvis
make run
```

Jarvis starts on `wss://localhost:8765` (or `ws://` without SSL certs).
On Apple Silicon, you should see: `Devices: STT=cpu, TTS=mps, VAD=cpu`

## Protocol

### Binary frames (audio)

**Browser → Server:** `[4-byte flags (uint32 LE)] + [PCM int16 16kHz mono]`

- Flags bit 0: `is_tts_playing` (for echo suppression)

**Server → Browser:** `[PCM int16 24kHz mono]` (raw, no header)

### JSON frames (control)

**Browser → Server:**

- `{"type": "slide_context", "context": {"current_title": "...", ...}}`
- `{"type": "shutdown"}`

**Server → Browser:**

- `{"type": "ready"}` — models loaded, ready for audio
- `{"type": "transcript", "text": "...", "role": "user"|"assistant"}`
- `{"type": "thinking", "text": "..."}` — sidebar observation
- `{"type": "listening", "active": true|false}` — VAD state
- `{"type": "status", "status": "idle"|"thinking"|"speaking"}`

## Architecture

```
Browser (mic) → [PCM 16kHz + flags] → WebSocket
                                          ↓
                                    Silero VAD (30ms chunks, CPU)
                                          ↓ (on silence)
                                    faster-whisper STT (CPU, int8)
                                          ↓
                                    Groq LLM (tool use, cloud API)
                                     ↙          ↘
              update_thinking        respond
              (sidebar text)    (Kokoro TTS on MPS/GPU → audio → WebSocket → speakers)
```
