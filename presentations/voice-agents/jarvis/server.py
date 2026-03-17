"""Jarvis WebSocket Server — FastAPI + uvicorn entry point.

Binary protocol:
  Browser → Server: 4-byte flags header (uint32 LE, bit 0 = is_tts_playing) + PCM int16 audio
  Server → Browser: raw PCM int16 audio (24kHz mono)

JSON protocol (text frames):
  Browser → Server: {"type": "slide_context", "context": {...}}
  Server → Browser: {"type": "transcript"|"thinking"|"status"|"listening", ...}
"""

import json
import os
import struct

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

from .config import WS_PORT
from .models import ModelManager
from .pipeline import JarvisPipeline

HEADER_SIZE = 4  # 4 bytes for uint32 flags

app = FastAPI(title="Jarvis Voice Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared model manager — loaded once at startup
models = ModelManager()


@app.on_event("startup")
async def startup() -> None:
    print("Loading models...")
    models.load_all()
    print("Models loaded. Jarvis is ready.")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    print("Client connected")

    async def send_json(data: dict) -> None:
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            pass  # Client may have disconnected

    async def send_audio(pcm_bytes: bytes) -> None:
        try:
            await ws.send_bytes(pcm_bytes)
        except Exception:
            pass  # Client may have disconnected

    pipeline = JarvisPipeline(models, send_json, send_audio)

    # Signal readiness
    await send_json({"type": "ready"})

    try:
        while True:
            message = await ws.receive()

            if "bytes" in message:
                data = message["bytes"]
                if len(data) > HEADER_SIZE:
                    (flags,) = struct.unpack("<I", data[:HEADER_SIZE])
                    is_tts_playing = bool(flags & 1)
                    pcm_data = data[HEADER_SIZE:]
                    await pipeline.feed_audio(pcm_data, is_tts_playing)

            elif "text" in message:
                try:
                    msg = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type")

                if msg_type == "slide_context":
                    pipeline.update_slide_context(msg.get("context", {}))
                    print(f"Slide context updated: {msg.get('context', {}).get('current_title', '?')}")
                elif msg_type == "shutdown":
                    print("Shutdown requested")
                    break

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")


def main() -> None:
    """Entry point for `python -m jarvis.server`."""
    import uvicorn

    ssl_keyfile = os.environ.get("SSL_KEYFILE", "localhost+1-key.pem")
    ssl_certfile = os.environ.get("SSL_CERTFILE", "localhost+1.pem")

    use_ssl = os.path.exists(ssl_certfile) and os.path.exists(ssl_keyfile)

    protocol = "wss" if use_ssl else "ws"
    print(f"Starting Jarvis on {protocol}://localhost:{WS_PORT}")

    if not use_ssl:
        print("WARNING: No SSL certs found. Running without SSL.")
        print("  For HTTPS sites, generate certs with: mkcert localhost 127.0.0.1")

    uvicorn.run(
        "jarvis.server:app",
        host="0.0.0.0",
        port=WS_PORT,
        ssl_keyfile=ssl_keyfile if use_ssl else None,
        ssl_certfile=ssl_certfile if use_ssl else None,
    )


if __name__ == "__main__":
    main()
