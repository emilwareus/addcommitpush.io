"""WebRTC transport for Jarvis.

Uses aiortc to handle peer connections. The browser sends mic audio
via an RTP track and receives TTS audio back the same way. A
DataChannel carries the same JSON control protocol as the WebSocket.
"""

import asyncio
import fractions
import json
import time
from typing import TYPE_CHECKING

import av
import numpy as np
from aiortc import (
    MediaStreamTrack,
    RTCPeerConnection,
    RTCSessionDescription,
)
from aiortc.mediastreams import MediaStreamError
from aiortc.rtcconfiguration import RTCConfiguration
from fastapi import APIRouter

from .audio import upsample_to_48k
from .config import CHUNK_SAMPLES, VAD_THRESHOLD, SILENCE_DURATION_MS, WEBRTC_SAMPLE_RATE
from .pipeline import JarvisPipeline

if TYPE_CHECKING:
    from .models import ModelManager

# Set by server.py at startup
models: "ModelManager | None" = None

rtc_router = APIRouter()

# Keep references so connections aren't garbage-collected
_peer_connections: set[RTCPeerConnection] = set()

# Opus standard: 20ms frames at 48kHz = 960 samples
SAMPLES_PER_FRAME = 960
FRAME_DURATION = 0.020  # 20ms


class AudioSendTrack(MediaStreamTrack):
    """Pushes TTS PCM audio (24kHz int16) to the browser as 48kHz Opus frames.

    Paces output at real-time (20ms per frame) to avoid bursts.
    When no TTS audio is queued, sends silence to keep the track alive.
    """

    kind = "audio"

    def __init__(self) -> None:
        super().__init__()
        self._queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._sample_rate = WEBRTC_SAMPLE_RATE
        self._samples_per_frame = SAMPLES_PER_FRAME
        self._bytes_per_frame = SAMPLES_PER_FRAME * 2  # s16 = 2 bytes/sample
        self._pts = 0
        self._start: float | None = None
        # Buffer for TTS audio that arrives in non-20ms chunks
        self._buffer = b""

    def push_tts(self, pcm_int16_bytes: bytes) -> None:
        """Enqueue TTS audio (24kHz int16 mono) for sending to the browser."""
        pcm = np.frombuffer(pcm_int16_bytes, dtype=np.int16)
        # Upsample 24kHz -> 48kHz for Opus
        pcm_48k = upsample_to_48k(pcm)
        raw = pcm_48k.tobytes()

        # Append to buffer, enqueue complete 20ms frames
        self._buffer += raw
        while len(self._buffer) >= self._bytes_per_frame:
            chunk = self._buffer[: self._bytes_per_frame]
            self._buffer = self._buffer[self._bytes_per_frame :]
            self._queue.put_nowait(chunk)

    def clear(self) -> None:
        """Flush all queued TTS audio (barge-in)."""
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        self._buffer = b""

    async def recv(self) -> av.AudioFrame:
        """Called by aiortc to pull the next audio frame to send."""
        if self.readyState != "live":
            raise MediaStreamError

        # Pace to real-time wall clock
        if self._start is None:
            self._start = time.time()
        else:
            wait = self._start + (self._pts / self._sample_rate) - time.time()
            if wait > 0:
                await asyncio.sleep(wait)

        # Get audio data or silence
        try:
            chunk = self._queue.get_nowait()
        except asyncio.QueueEmpty:
            chunk = b"\x00" * self._bytes_per_frame

        samples = np.frombuffer(chunk, dtype=np.int16)
        frame = av.AudioFrame.from_ndarray(
            samples.reshape(1, -1), format="s16", layout="mono"
        )
        frame.pts = self._pts
        frame.sample_rate = self._sample_rate
        frame.time_base = fractions.Fraction(1, self._sample_rate)
        self._pts += self._samples_per_frame
        return frame


async def handle_rtc_session(offer_sdp: str, *, agent: object | None = None) -> str:
    """Create a WebRTC peer connection, wire up pipeline, return answer SDP.

    Args:
        offer_sdp: Client's SDP offer string.
        agent: Optional agent instance for the pipeline (testing).
    """
    assert models is not None, "ModelManager not initialized"

    pc = RTCPeerConnection(
        configuration=RTCConfiguration(iceServers=[])
    )
    _peer_connections.add(pc)

    audio_send = AudioSendTrack()
    pc.addTrack(audio_send)

    pipeline: JarvisPipeline | None = None
    dc_ref: list = []  # mutable container for the DataChannel reference

    async def send_json(data: dict) -> None:
        if dc_ref and dc_ref[0].readyState == "open":
            try:
                dc_ref[0].send(json.dumps(data))
            except Exception:
                pass

    async def send_audio(pcm_bytes: bytes) -> None:
        audio_send.push_tts(pcm_bytes)

    original_send_json = send_json

    async def send_json_with_clear(data: dict) -> None:
        """Wraps send_json to also flush audio queue on clear_audio."""
        if data.get("type") == "clear_audio":
            audio_send.clear()
        await original_send_json(data)

    # Resampler: Opus 48kHz stereo/mono -> 16kHz mono for STT
    resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)

    def _init_datachannel(channel) -> None:
        """Wire up a DataChannel (called once the channel is open)."""
        nonlocal pipeline
        dc_ref.clear()
        dc_ref.append(channel)

        pipeline = JarvisPipeline(models, send_json_with_clear, send_audio, agent=agent)

        # Signal readiness (same shape as WebSocket ready message)
        channel.send(
            json.dumps(
                {
                    "type": "ready",
                    "stt_models": models.available_stt_models,
                    "active_stt_model": models.stt_model,
                    "llm_models": pipeline.agent.available_llm_models,
                    "active_llm_model": pipeline.agent.llm_model,
                    "vad_threshold": VAD_THRESHOLD,
                    "vad_silence_ms": SILENCE_DURATION_MS,
                    "barge_in_enabled": False,
                }
            )
        )

        @channel.on("message")
        def on_message(message) -> None:
            if pipeline is None:
                return
            try:
                msg = json.loads(message)
            except json.JSONDecodeError:
                return

            msg_type = msg.get("type")
            if msg_type == "slide_context":
                pipeline.update_slide_context(msg.get("context", {}))
            elif msg_type == "set_streaming":
                pipeline.update_streaming_config(msg)
            elif msg_type == "set_stt_model":
                model_name = msg.get("model", "")
                pipeline.set_stt_model(model_name)
                channel.send(
                    json.dumps({"type": "stt_model_changed", "model": model_name})
                )
            elif msg_type == "set_llm_model":
                model_name = msg.get("model", "")
                pipeline.set_llm_model(model_name)
                channel.send(
                    json.dumps({"type": "llm_model_changed", "model": model_name})
                )
            elif msg_type == "set_barge_in":
                enabled = bool(msg.get("enabled", False))
                pipeline.update_barge_in(enabled)
                channel.send(
                    json.dumps({"type": "barge_in_changed", "enabled": enabled})
                )
            elif msg_type == "barge_in_interrupt":
                if pipeline.barge_in_enabled:
                    pipeline._tts_cancel.set()
                    audio_send.clear()
                    channel.send(json.dumps({"type": "clear_audio"}))
            elif msg_type == "set_vad_config":
                pipeline.update_vad_config(msg)
                channel.send(
                    json.dumps({
                        "type": "vad_config_changed",
                        "threshold": pipeline.vad_threshold,
                        "silence_ms": pipeline.silence_duration_ms,
                    })
                )
            elif msg_type == "shutdown":
                asyncio.ensure_future(_close_pc(pc))

    @pc.on("datachannel")
    def on_datachannel(channel) -> None:
        # In aiortc, the received channel may already be open
        if channel.readyState == "open":
            _init_datachannel(channel)
        else:
            @channel.on("open")
            def on_open() -> None:
                _init_datachannel(channel)

    @pc.on("track")
    def on_track(track: MediaStreamTrack) -> None:
        if track.kind != "audio":
            return

        async def receive_audio() -> None:
            # Buffer resampled audio so we feed the pipeline in 512-sample
            # chunks (32ms at 16kHz) — matching what the AudioWorklet sends
            # over WebSocket. Silero VAD expects exactly 512 samples.
            pcm_buf = np.empty(0, dtype=np.int16)

            while True:
                try:
                    frame = await track.recv()
                except MediaStreamError:
                    break
                except Exception:
                    break
                if pipeline is None:
                    continue

                # Use av.AudioResampler for proper 48kHz -> 16kHz conversion
                resampled_frames = resampler.resample(frame)
                for resampled in resampled_frames:
                    pcm_int16 = resampled.to_ndarray().flatten().astype(np.int16)
                    pcm_buf = np.concatenate([pcm_buf, pcm_int16])

                # Feed pipeline in 512-sample chunks
                while len(pcm_buf) >= CHUNK_SAMPLES:
                    chunk = pcm_buf[:CHUNK_SAMPLES]
                    pcm_buf = pcm_buf[CHUNK_SAMPLES:]
                    await pipeline.feed_audio(
                        chunk.tobytes(), is_tts_playing=False
                    )

        asyncio.ensure_future(receive_audio())

    @pc.on("connectionstatechange")
    async def on_connection_state_change() -> None:
        if pc.connectionState in ("failed", "closed"):
            await _close_pc(pc)

    # SDP exchange
    offer = RTCSessionDescription(sdp=offer_sdp, type="offer")
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return pc.localDescription.sdp


async def _close_pc(pc: RTCPeerConnection) -> None:
    _peer_connections.discard(pc)
    await pc.close()


@rtc_router.post("/rtc/offer")
async def rtc_offer(body: dict) -> dict:
    answer_sdp = await handle_rtc_session(body["sdp"])
    return {"sdp": answer_sdp, "type": "answer"}
