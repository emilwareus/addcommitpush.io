# Jarvis — AI Co-Presenter Backend

Local Python backend for the Jarvis AI co-presenter. Runs the full voice pipeline:
**Silero VAD → faster-whisper STT → Groq LLM (with tools) → Kokoro TTS**

## Prerequisites

- macOS (tested on Apple Silicon)
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (`brew install uv`)
- `espeak-ng` (required by Kokoro)
- `mkcert` (for WSS from HTTPS sites)
- Groq API key

## Setup

```bash
# 1. Install system dependencies
brew install espeak-ng mkcert

# 2. Setup trusted localhost SSL (needed if presentation runs on HTTPS/Vercel)
mkcert -install
cd presentations/voice-agents/jarvis
mkcert localhost 127.0.0.1

# 3. Install dependencies with uv
uv sync

# 4. Download Kokoro models
mkdir -p models
cd models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ..

# 5. Set Groq API key
export GROQ_API_KEY=your-key-here
```

## Run

```bash
cd presentations/voice-agents/jarvis
uv run jarvis
```

Jarvis starts on `wss://localhost:8765` (or `ws://` without SSL certs).

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
                                    Silero VAD (30ms chunks)
                                          ↓ (on silence)
                                    faster-whisper STT
                                          ↓
                                    Groq LLM (tool use)
                                     ↙          ↘
              update_thinking        respond
              (sidebar text)    (TTS → audio → WebSocket → browser speakers)
```
