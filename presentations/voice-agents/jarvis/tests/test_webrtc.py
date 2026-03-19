"""End-to-end WebRTC transport tests.

No mocks. Creates real aiortc peer connections against the server handler,
exchanging SDP, opening DataChannels, and sending/receiving audio frames.
Uses FakeModelManager so no GPU models are needed.
"""

import asyncio
import json

import av
import numpy as np
import pytest
from aiortc import (
    MediaStreamTrack,
    RTCPeerConnection,
    RTCSessionDescription,
)
from aiortc.rtcconfiguration import RTCConfiguration

from jarvis.webrtc import AudioSendTrack, handle_rtc_session
import jarvis.webrtc as webrtc_module


# ─── Helpers ──────────────────────────────────────────────────────────────────


class FakeAgent:
    """Minimal agent stand-in — avoids requiring GROQ_API_KEY."""

    def __init__(self) -> None:
        self.slide_context: dict = {}
        self.batch_response: list[dict] = [
            {"name": "respond", "args": {"text": "Hello from Jarvis."}}
        ]

    def update_slide_context(self, context: dict) -> None:
        self.slide_context = context

    def process_utterance(self, transcript: str) -> list[dict]:
        return self.batch_response

    def process_utterance_streaming(self, transcript: str):
        for tc in self.batch_response:
            if tc["name"] == "respond":
                yield {"type": "delta", "text": tc["args"]["text"]}
            yield {"type": "tool_call", "name": tc["name"], "args": tc["args"]}


class FakeModelManager:
    """Same as test_streaming.py — deterministic, no GPU."""

    def __init__(self) -> None:
        self._transcribe_result = "Hey Jarvis, tell me about yourself"
        self._transcribe_fast_result = "Hey Jarvis tell"
        self._active_stt = "whisper-small"
        self._stt_models = ["whisper-small", "moonshine-small"]

    @property
    def stt_model(self) -> str:
        return self._active_stt

    @property
    def available_stt_models(self) -> list[str]:
        return list(self._stt_models)

    def set_stt_model(self, name: str) -> None:
        if name not in self._stt_models:
            raise ValueError(f"Unknown STT model: {name!r}")
        self._active_stt = name

    def vad_predict(self, audio_chunk: np.ndarray, sample_rate: int) -> float:
        return 0.0  # No speech detected — keeps tests fast

    def transcribe(self, audio: np.ndarray) -> str:
        return self._transcribe_result

    def transcribe_fast(self, audio: np.ndarray) -> str:
        return self._transcribe_fast_result

    async def synthesize_stream(self, text: str, cancel_event=None):
        samples = np.zeros(2400, dtype=np.float32)
        yield samples, 24000


class FakeMicTrack(MediaStreamTrack):
    """Sends a fixed number of silence frames then stops."""

    kind = "audio"

    def __init__(self, num_frames: int = 10) -> None:
        super().__init__()
        self._num_frames = num_frames
        self._sent = 0
        self._pts = 0

    async def recv(self) -> av.AudioFrame:
        if self._sent >= self._num_frames:
            # Keep sending silence (track stays alive until PC closes)
            await asyncio.sleep(0.02)
        self._sent += 1
        frame = av.AudioFrame(format="s16", layout="mono", samples=960)
        for p in frame.planes:
            p.update(bytes(p.buffer_size))
        frame.sample_rate = 48000
        frame.pts = self._pts
        self._pts += 960
        return frame


# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _set_models():
    """Inject FakeModelManager into webrtc module for all tests."""
    original = webrtc_module.models
    webrtc_module.models = FakeModelManager()
    yield
    webrtc_module.models = original


# ─── AudioSendTrack unit tests ───────────────────────────────────────────────


class TestAudioSendTrack:
    """Test the AudioSendTrack in isolation."""

    @pytest.mark.asyncio
    async def test_recv_returns_silence_before_any_push(self) -> None:
        track = AudioSendTrack()
        frame = await track.recv()
        assert isinstance(frame, av.AudioFrame)
        assert frame.sample_rate == 48000
        assert frame.samples == 960  # 20ms at 48kHz
        assert frame.time_base == __import__("fractions").Fraction(1, 48000)

    @pytest.mark.asyncio
    async def test_push_tts_enqueues_20ms_frames(self) -> None:
        track = AudioSendTrack()
        # Push 480 samples at 24kHz (20ms) -> 960 at 48kHz = exactly 1 frame
        pcm = np.zeros(480, dtype=np.int16)
        track.push_tts(pcm.tobytes())

        frame = await track.recv()
        assert isinstance(frame, av.AudioFrame)
        assert frame.sample_rate == 48000
        assert frame.samples == 960

    @pytest.mark.asyncio
    async def test_pts_increments_by_960(self) -> None:
        track = AudioSendTrack()
        # Push enough for 2 frames: 960 samples at 24kHz -> 1920 at 48kHz = 2 frames
        pcm = np.zeros(960, dtype=np.int16)
        track.push_tts(pcm.tobytes())

        f1 = await track.recv()
        f2 = await track.recv()
        assert f1.pts == 0
        assert f2.pts == 960


# ─── SDP exchange tests ──────────────────────────────────────────────────────


class TestSDPExchange:
    """Test that handle_rtc_session produces a valid SDP answer."""

    @pytest.mark.asyncio
    async def test_offer_answer_round_trip(self) -> None:
        """Create a client PC, generate offer, get answer from server handler."""
        client = RTCPeerConnection()
        try:
            # Add a mic track so the offer includes audio
            client.addTrack(FakeMicTrack(num_frames=5))
            # Create a data channel
            dc = client.createDataChannel("control")

            offer = await client.createOffer()
            await client.setLocalDescription(offer)

            # Pass offer to server handler
            answer_sdp = await handle_rtc_session(client.localDescription.sdp, agent=FakeAgent())

            assert isinstance(answer_sdp, str)
            assert "v=0" in answer_sdp
            assert "a=rtpmap" in answer_sdp

            # Set the answer on the client
            answer = RTCSessionDescription(sdp=answer_sdp, type="answer")
            await client.setRemoteDescription(answer)

            assert client.remoteDescription is not None
            assert client.remoteDescription.type == "answer"
        finally:
            await client.close()


# ─── Full connection e2e ──────────────────────────────────────────────────────


class TestWebRTCConnection:
    """Full end-to-end: client PC <-> server handler, DataChannel messages, audio."""

    @pytest.mark.asyncio
    async def test_datachannel_receives_ready_message(self) -> None:
        """Connect and verify the server sends a 'ready' message on the DataChannel."""
        client = RTCPeerConnection()
        received_messages: list[dict] = []
        dc_opened = asyncio.Event()
        ready_received = asyncio.Event()

        try:
            client.addTrack(FakeMicTrack(num_frames=5))
            dc = client.createDataChannel("control")

            @dc.on("open")
            def on_open() -> None:
                dc_opened.set()

            @dc.on("message")
            def on_message(message) -> None:
                msg = json.loads(message)
                received_messages.append(msg)
                if msg.get("type") == "ready":
                    ready_received.set()

            offer = await client.createOffer()
            await client.setLocalDescription(offer)

            answer_sdp = await handle_rtc_session(client.localDescription.sdp, agent=FakeAgent())
            answer = RTCSessionDescription(sdp=answer_sdp, type="answer")
            await client.setRemoteDescription(answer)

            # Wait for DataChannel to open and ready message
            await asyncio.wait_for(dc_opened.wait(), timeout=5.0)
            await asyncio.wait_for(ready_received.wait(), timeout=5.0)

            ready_msgs = [m for m in received_messages if m["type"] == "ready"]
            assert len(ready_msgs) == 1
            assert "stt_models" in ready_msgs[0]
            assert "active_stt_model" in ready_msgs[0]
            assert ready_msgs[0]["active_stt_model"] == "whisper-small"
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_datachannel_set_streaming_config(self) -> None:
        """Send a set_streaming message and verify it doesn't error."""
        client = RTCPeerConnection()
        dc_opened = asyncio.Event()
        ready_received = asyncio.Event()

        try:
            client.addTrack(FakeMicTrack(num_frames=5))
            dc = client.createDataChannel("control")

            @dc.on("open")
            def on_open() -> None:
                dc_opened.set()

            @dc.on("message")
            def on_message(message) -> None:
                msg = json.loads(message)
                if msg.get("type") == "ready":
                    ready_received.set()

            offer = await client.createOffer()
            await client.setLocalDescription(offer)
            answer_sdp = await handle_rtc_session(client.localDescription.sdp, agent=FakeAgent())
            await client.setRemoteDescription(
                RTCSessionDescription(sdp=answer_sdp, type="answer")
            )

            await asyncio.wait_for(dc_opened.wait(), timeout=5.0)
            await asyncio.wait_for(ready_received.wait(), timeout=5.0)

            # Send streaming config
            dc.send(json.dumps({"type": "set_streaming", "stt": True, "llm": True, "tts": True}))
            # Give the server a moment to process
            await asyncio.sleep(0.1)

            # No crash = success. The pipeline accepted the config.
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_datachannel_set_stt_model(self) -> None:
        """Send set_stt_model and verify the server acknowledges with stt_model_changed."""
        client = RTCPeerConnection()
        received_messages: list[dict] = []
        dc_opened = asyncio.Event()
        ready_received = asyncio.Event()
        model_changed = asyncio.Event()

        try:
            client.addTrack(FakeMicTrack(num_frames=5))
            dc = client.createDataChannel("control")

            @dc.on("open")
            def on_open() -> None:
                dc_opened.set()

            @dc.on("message")
            def on_message(message) -> None:
                msg = json.loads(message)
                received_messages.append(msg)
                if msg.get("type") == "ready":
                    ready_received.set()
                elif msg.get("type") == "stt_model_changed":
                    model_changed.set()

            offer = await client.createOffer()
            await client.setLocalDescription(offer)
            answer_sdp = await handle_rtc_session(client.localDescription.sdp, agent=FakeAgent())
            await client.setRemoteDescription(
                RTCSessionDescription(sdp=answer_sdp, type="answer")
            )

            await asyncio.wait_for(dc_opened.wait(), timeout=5.0)
            await asyncio.wait_for(ready_received.wait(), timeout=5.0)

            dc.send(json.dumps({"type": "set_stt_model", "model": "moonshine-small"}))
            await asyncio.wait_for(model_changed.wait(), timeout=5.0)

            changed_msgs = [m for m in received_messages if m["type"] == "stt_model_changed"]
            assert len(changed_msgs) == 1
            assert changed_msgs[0]["model"] == "moonshine-small"
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_client_receives_server_audio_track(self) -> None:
        """Verify the client receives an audio track from the server."""
        client = RTCPeerConnection()
        track_received = asyncio.Event()
        received_track_kind: list[str] = []

        try:
            client.addTrack(FakeMicTrack(num_frames=5))
            dc = client.createDataChannel("control")

            @client.on("track")
            def on_track(track: MediaStreamTrack) -> None:
                received_track_kind.append(track.kind)
                track_received.set()

            offer = await client.createOffer()
            await client.setLocalDescription(offer)
            answer_sdp = await handle_rtc_session(client.localDescription.sdp, agent=FakeAgent())
            await client.setRemoteDescription(
                RTCSessionDescription(sdp=answer_sdp, type="answer")
            )

            await asyncio.wait_for(track_received.wait(), timeout=5.0)
            assert "audio" in received_track_kind
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_shutdown_closes_cleanly(self) -> None:
        """Send shutdown message and verify the PC closes without errors."""
        client = RTCPeerConnection()
        dc_opened = asyncio.Event()
        ready_received = asyncio.Event()

        try:
            client.addTrack(FakeMicTrack(num_frames=5))
            dc = client.createDataChannel("control")

            @dc.on("open")
            def on_open() -> None:
                dc_opened.set()

            @dc.on("message")
            def on_message(message) -> None:
                msg = json.loads(message)
                if msg.get("type") == "ready":
                    ready_received.set()

            offer = await client.createOffer()
            await client.setLocalDescription(offer)
            answer_sdp = await handle_rtc_session(client.localDescription.sdp, agent=FakeAgent())
            await client.setRemoteDescription(
                RTCSessionDescription(sdp=answer_sdp, type="answer")
            )

            await asyncio.wait_for(dc_opened.wait(), timeout=5.0)
            await asyncio.wait_for(ready_received.wait(), timeout=5.0)

            dc.send(json.dumps({"type": "shutdown"}))
            await asyncio.sleep(0.5)

            # No crash = success
        finally:
            await client.close()
