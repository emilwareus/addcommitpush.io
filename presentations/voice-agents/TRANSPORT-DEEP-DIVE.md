# Real-Time Transport -- Deep Research Report

WebSockets vs WebRTC for streaming audio in voice agents: protocol internals, latency characteristics, code examples, and why the choice matters less than you think.

**Table of contents:**

1. [The Transport Problem](#1-the-transport-problem) -- what the transport layer actually does in a voice agent
2. [WebSocket Protocol Internals](#2-websocket-protocol-internals) -- TCP, framing, head-of-line blocking
3. [WebRTC Protocol Stack](#3-webrtc-protocol-stack) -- ICE, STUN/TURN, DTLS-SRTP, SDP, RTCP
4. [Head-to-Head Comparison](#4-head-to-head-comparison) -- latency, NAT, echo cancellation, complexity
5. [Implementation: WebSocket Voice Agent](#5-implementation-websocket-voice-agent) -- binary protocol, AudioWorklet, FastAPI
6. [Implementation: WebRTC Voice Agent](#6-implementation-webrtc-voice-agent) -- aiortc, signaling, media tracks
7. [Echo Cancellation Deep Dive](#7-echo-cancellation-deep-dive) -- the one area where WebRTC wins decisively
8. [The Latency Budget Argument](#8-the-latency-budget-argument) -- why transport is <0.1% of total latency
9. [What the Industry Uses](#9-what-the-industry-uses) -- OpenAI, LiveKit, Daily, Twilio, Gemini
10. [Decision Matrix](#10-decision-matrix)
11. [For Our Voice Agent (Jarvis) -- Both Transports, Hot-Swappable](#11-for-our-voice-agent-jarvis----both-transports-hot-swappable)

---

## 1. The Transport Problem

A voice agent pipeline: Mic -> VAD -> STT -> LLM -> TTS -> Speaker. Audio flows continuously in both directions between browser and server. The transport layer sits at the edges -- carrying raw PCM from the browser mic to the server, and synthesized speech back. It also carries control messages: VAD state, transcripts, status updates.

Two requirements:

1. **Low latency.** Audio frames (typically 20-30ms each) must arrive promptly. Humans perceive delays >150ms as "laggy" in conversation.
2. **Bidirectional streaming.** Both sides send data concurrently. HTTP request/response doesn't work here.

Two protocols dominate: WebSockets and WebRTC.

---

## 2. WebSocket Protocol Internals

### The Upgrade Handshake (RFC 6455)

A WebSocket connection starts as HTTP, then upgrades:

```
GET /ws HTTP/1.1
Host: localhost:8765
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

After the handshake, the HTTP connection becomes a persistent, full-duplex TCP channel. Both sides communicate through WebSocket **frames**.

### Frame Format

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+-------------------------------+
|     Extended payload length continued, if payload len == 127  |
+-------------------------------+-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------+-------------------------------+
```

Key details:

- **Opcodes:** 0x1 = text (UTF-8), 0x2 = binary, 0x8 = close, 0x9 = ping, 0xA = pong
- **Masking:** Client-to-server frames MUST be masked (XOR with 4-byte key). Server-to-client frames are NOT masked.
- **Overhead:** 2-14 bytes per frame. For a 960-byte audio chunk (30ms at 16kHz, int16), that's 0.2-1.5% overhead. Negligible.

For voice agents, we use **binary frames (opcode 0x2) for audio** and **text frames (opcode 0x1) for JSON control messages**. This is native multiplexing -- no need for a sub-protocol.

### TCP: The Foundation (and the Problem)

WebSockets run over TCP. TCP provides:

- **Reliable delivery:** Every byte arrives, guaranteed.
- **In-order delivery:** Bytes arrive in the order sent.
- **Flow control:** Receiver advertises buffer space (TCP window).
- **Congestion control:** Sender backs off when the network is congested (cubic, BBR, etc.).

For control messages (transcripts, status), TCP is ideal. For real-time audio, it introduces a fundamental problem.

### Head-of-Line Blocking

TCP guarantees in-order delivery. If packet N is lost in transit, packets N+1, N+2, ... are buffered at the receiver's TCP stack until packet N is retransmitted and arrives.

```
Sender:  [pkt1] [pkt2] [pkt3] [pkt4] [pkt5]
                    X (lost)
Receiver: [pkt1] ...waiting... ...waiting... [pkt2][pkt3][pkt4][pkt5] (burst)
                  ^--- HOL blocking window = 1 RTT
```

For audio streaming at 30ms frames:

- **1 lost packet** = all subsequent frames stall for 1 RTT (20-100ms on internet)
- **Effect:** Brief silence, then a burst of queued audio playing back compressed
- **Perception:** Variable delay (jitter) is worse than consistent delay

### When HOL Blocking Doesn't Matter

In practice, for server-authoritative voice agents, HOL blocking is often irrelevant:

| Scenario                   | Packet loss | HOL stall           | Impact            |
| -------------------------- | ----------- | ------------------- | ----------------- |
| Localhost                  | ~0%         | N/A                 | No impact         |
| LAN (same network)         | <0.01%      | N/A                 | No impact         |
| Internet (good connection) | <0.1%       | ~50ms once per 30s  | Imperceptible     |
| Internet (poor / mobile)   | 1-5%        | 50-200ms frequently | Noticeable jitter |
| Corporate VPN              | 0.1-1%      | Variable            | Depends on VPN    |

The pipeline latency (1-2s for VAD+STT+LLM+TTS) dominates by 100x. A 50ms HOL stall is noise.

---

## 3. WebRTC Protocol Stack

WebRTC ([RFC 8825](https://datatracker.ietf.org/doc/html/rfc8825)) is not one protocol -- it's a collection of protocols working together. Understanding each layer is essential for making informed tradeoffs.

### Layer Diagram

```
Application (your code)
    |
    v
+-----------+     +----------------+
| Audio/    |     | RTCDataChannel |
| Video     |     | (SCTP)         |
| Tracks    |     |                |
+-----------+     +----------------+
    |                    |
    v                    v
+--------+         +--------+
|  SRTP  |         |  SCTP  |
+--------+         +--------+
    |                    |
    v                    v
+----------------------------+
|           DTLS             |
+----------------------------+
    |
    v
+----------------------------+
|      ICE (UDP / TCP)       |
+----------------------------+
    |
    v
+----------------------------+
|        UDP / TCP           |
+----------------------------+
```

### ICE -- Interactive Connectivity Establishment (RFC 8445)

The hardest problem WebRTC solves: finding a network path between two peers, both potentially behind NAT.

**Candidate types:**

| Type                         | Source                     | Latency      | Reliability                |
| ---------------------------- | -------------------------- | ------------ | -------------------------- |
| **host**                     | Local IP address           | Best         | Only works on same network |
| **srflx** (server-reflexive) | Public IP via STUN         | Good         | Fails with symmetric NAT   |
| **relay**                    | TURN server relays traffic | Worst (+hop) | Always works               |

**The ICE process:**

```
1. Both peers gather candidates (host, srflx, relay)
2. Candidates exchanged via signaling channel (your responsibility)
3. ICE agent forms candidate pairs (local, remote)
4. Connectivity checks (STUN binding requests) run on each pair
5. Best working pair selected based on priority
```

**Trickle ICE:** Candidates are sent as they're discovered, not all at once. Reduces connection setup time from seconds to hundreds of milliseconds.

### STUN -- Session Traversal Utilities for NAT (RFC 8489)

A lightweight protocol that lets a client discover its public IP and port:

```
Client (192.168.1.5:12345) --STUN Binding Request--> STUN Server (stun.l.google.com:19302)
                                                              |
Client <--STUN Binding Response (public: 203.0.113.5:54321)--+
```

STUN fails with **symmetric NAT**, where the NAT assigns a different public port for each destination. Common in corporate networks and some mobile carriers.

### TURN -- Traversal Using Relays around NAT (RFC 8656)

When direct connectivity fails, TURN relays all media through a server:

```
Client A --> TURN Server --> Client B
```

TURN always works but adds:

- **Latency:** Extra network hop (typically 10-50ms)
- **Bandwidth cost:** TURN server sees all media traffic
- **Infrastructure cost:** You must run or pay for TURN servers

~10-15% of WebRTC connections in the wild require TURN relay.

### DTLS -- Datagram TLS (RFC 9147)

TLS, but for UDP. WebRTC mandates encryption for all connections.

```
Client                          Server
  |--- ClientHello (UDP) ------->|
  |<-- HelloVerifyRequest -------|   (cookie to prevent DoS)
  |--- ClientHello + cookie ---->|
  |<-- ServerHello, Certificate -|
  |--- Certificate, Finished --->|
  |<-- Finished -----------------|
  |                               |
  | === Encrypted SRTP/SCTP ===   |
```

DTLS handles packet loss and reordering (UDP doesn't guarantee either) with its own retransmission logic for the handshake. After the handshake, keys are derived for SRTP.

### SRTP -- Secure Real-time Transport Protocol (RFC 3711)

Carries the actual audio/video data:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|V=2|P|X|  CC   |M|     PT      |       sequence number         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           timestamp                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           synchronization source (SSRC) identifier            |
+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
|                        encrypted payload                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    SRTP authentication tag                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Key properties:

- **Sequence numbers** for reordering detection and packet loss counting
- **Timestamps** for jitter buffer management
- **Payload types** negotiated via SDP (e.g., Opus = PT 111)
- **No retransmission by default.** Lost packets stay lost. The jitter buffer conceals gaps.

### RTCP -- RTP Control Protocol

Companion to RTP, carries feedback:

- **Sender Reports (SR):** Packet counts, byte counts, NTP timestamps
- **Receiver Reports (RR):** Fraction lost, cumulative lost, jitter, last SR timestamp
- **REMB/TMMBR:** Bandwidth estimation feedback
- **NACK:** Request retransmission of specific packets (optional, for video keyframes)

The sender uses RTCP feedback to adapt: reduce bitrate, change codec, or switch to a lower-quality stream.

### SDP -- Session Description Protocol (RFC 8866)

Describes the media session. Exchanged via offer/answer through your signaling channel:

```
v=0
o=- 4858location4858 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111 0 8
c=IN IP4 0.0.0.0
a=rtpmap:111 opus/48000/2
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=fmtp:111 minptime=10;useinbandfec=1
a=sendrecv
a=ice-ufrag:abcd
a=ice-pwd:efghijklmnopqrstuv
a=fingerprint:sha-256 AA:BB:CC:...
```

This SDP says: "I want to send and receive audio, I prefer Opus at 48kHz, I also support G.711 mu-law and A-law as fallbacks."

### Connection Setup Timeline

```
t=0ms    Signaling: exchange SDP offer/answer
t=50ms   ICE: gather host candidates
t=100ms  ICE: STUN queries for srflx candidates
t=200ms  ICE: connectivity checks begin
t=300ms  ICE: candidate pair selected
t=350ms  DTLS: handshake begins
t=500ms  DTLS: handshake complete, keys derived
t=510ms  First SRTP audio packet sent
```

Compare to WebSocket:

```
t=0ms    TCP handshake (SYN, SYN-ACK, ACK)
t=30ms   TLS handshake (if WSS)
t=80ms   HTTP Upgrade handshake
t=100ms  First binary audio frame sent
```

WebRTC takes 3-5x longer to establish a connection. But once established, audio flows with lower latency characteristics.

---

## 4. Head-to-Head Comparison

| Dimension                          | WebSocket                                  | WebRTC                                   |
| ---------------------------------- | ------------------------------------------ | ---------------------------------------- |
| **Transport**                      | TCP                                        | UDP (SRTP over DTLS)                     |
| **Latency (LAN)**                  | ~1ms                                       | ~1ms                                     |
| **Latency (internet)**             | 5-50ms + HOL risk                          | 5-50ms, no HOL blocking                  |
| **Connection setup**               | ~100ms                                     | ~500ms (ICE + DTLS)                      |
| **NAT traversal**                  | Not needed (client-server)                 | ICE/STUN/TURN required                   |
| **Echo cancellation**              | Manual (flag-based suppression)            | Built-in AEC in browser                  |
| **Noise suppression**              | getUserMedia constraint (variable quality) | Integrated with media pipeline           |
| **Encryption**                     | WSS (TLS over TCP)                         | DTLS-SRTP (mandatory)                    |
| **Codec support**                  | Raw PCM, you choose                        | Opus, G.711, etc. (negotiated via SDP)   |
| **Adaptive bitrate**               | Not built-in                               | RTCP feedback loop (automatic)           |
| **Packet loss handling**           | TCP retransmits (causes stalls)            | Tolerated (concealment / FEC)            |
| **Jitter buffer**                  | You build it                               | Built-in in browser                      |
| **Data channel**                   | Text frames (native JSON)                  | RTCDataChannel (SCTP over DTLS)          |
| **Server complexity**              | Low (any WS library)                       | High (SFU or aiortc)                     |
| **Infrastructure**                 | Any web server                             | STUN/TURN servers needed                 |
| **Browser support**                | Universal since 2012                       | Universal but quirky across browsers     |
| **Lines of code (transport only)** | ~50                                        | ~200+                                    |
| **Server-side libraries**          | Mature everywhere (ws, fastapi, gorilla)   | Limited (aiortc for Python, pion for Go) |

### Codec Implications

WebSocket: you send raw PCM. This means:

- **No compression.** 16kHz int16 mono = 32 KB/s = 256 kbps. Fine for LAN, wasteful for internet.
- **Full control.** Your STT model gets exactly the samples it expects. No codec artifacts.
- **You can compress yourself** (e.g., send Opus-encoded frames), but then you reimplement what WebRTC gives you for free.

WebRTC: codec negotiated via SDP. Typically Opus:

- **Opus at 16kHz:** ~16-32 kbps (10-20x compression vs raw PCM)
- **Built-in FEC** (forward error correction) for packet loss resilience
- **The caveat:** You receive decoded PCM from the browser's media pipeline, but the server gets encoded Opus packets that need decoding before feeding to STT. This adds a decode step and potential quality loss from the encode/decode cycle.

---

## 5. Implementation: WebSocket Voice Agent

This is the approach used in Jarvis. The binary protocol is minimal:

### Binary Frame Protocol

```
Browser -> Server:
  [4 bytes: uint32 LE flags] + [N bytes: PCM int16 audio, 16kHz mono]

  Flags bit 0: is_tts_playing (echo suppression signal)

Server -> Browser:
  [N bytes: raw PCM int16 audio, 24kHz mono]

Text frames (JSON):
  Browser -> Server: {"type": "slide_context", "context": {...}}
  Server -> Browser: {"type": "transcript"|"thinking"|"status"|"listening", ...}
```

### Server (Python, FastAPI)

```python
"""Jarvis WebSocket Server -- FastAPI + uvicorn."""

import json
import struct
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

HEADER_SIZE = 4  # 4 bytes for uint32 flags

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()

    async def send_json(data: dict) -> None:
        await ws.send_text(json.dumps(data))

    async def send_audio(pcm_bytes: bytes) -> None:
        await ws.send_bytes(pcm_bytes)

    pipeline = VoicePipeline(send_json, send_audio)

    try:
        while True:
            message = await ws.receive()

            if "bytes" in message:
                data = message["bytes"]
                if len(data) > HEADER_SIZE:
                    # Unpack 4-byte flags header
                    (flags,) = struct.unpack("<I", data[:HEADER_SIZE])
                    is_tts_playing = bool(flags & 1)
                    pcm_data = data[HEADER_SIZE:]
                    await pipeline.feed_audio(pcm_data, is_tts_playing)

            elif "text" in message:
                msg = json.loads(message["text"])
                msg_type = msg.get("type")

                if msg_type == "slide_context":
                    pipeline.update_slide_context(msg.get("context", {}))
                elif msg_type == "set_streaming":
                    pipeline.update_streaming_config(msg)

    except WebSocketDisconnect:
        print("Client disconnected")
```

Key design decisions:

- **Binary frames for audio.** No base64 encoding. Zero overhead beyond the 2-byte WebSocket header.
- **4-byte flags header.** Future-proof -- 32 bits of flags, currently only bit 0 used. Costs 4 bytes per 960-byte audio frame (0.4% overhead).
- **Text frames for control.** JSON is human-readable, easy to debug. Control messages are infrequent (a few per second), so text overhead doesn't matter.
- **Single connection.** Audio and control share one WebSocket. No connection management complexity.

### Client: AudioWorklet (Mic Capture)

```javascript
/**
 * AudioWorklet processor: runs on dedicated audio thread.
 * Captures device-rate audio, resamples to 16kHz, outputs Int16 PCM.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._enabled = false;
    this._buffer = new Float32Array(0);
    // 32ms frame at device sample rate
    this._frameSize = Math.ceil(sampleRate * 0.032);
    this._targetRate = 16000;
    this._targetFrameSize = 512; // 32ms at 16kHz

    this.port.onmessage = (e) => {
      if (e.data?.type === 'set_enabled') {
        this._enabled = !!e.data.enabled;
      }
    };
  }

  process(inputs) {
    if (!this._enabled) return true;
    const input = inputs[0];
    if (!input?.[0]?.length) return true;

    // Append to buffer
    const channelData = input[0]; // mono
    const newBuffer = new Float32Array(this._buffer.length + channelData.length);
    newBuffer.set(this._buffer);
    newBuffer.set(channelData, this._buffer.length);
    this._buffer = newBuffer;

    // Process complete 32ms frames
    while (this._buffer.length >= this._frameSize) {
      const frame = this._buffer.slice(0, this._frameSize);
      this._buffer = this._buffer.slice(this._frameSize);

      // Downsample to 16kHz via linear interpolation
      const ratio = sampleRate / this._targetRate;
      const output = new Int16Array(this._targetFrameSize);

      for (let i = 0; i < this._targetFrameSize; i++) {
        const srcIndex = i * ratio;
        const srcFloor = Math.floor(srcIndex);
        const srcCeil = Math.min(srcFloor + 1, frame.length - 1);
        const frac = srcIndex - srcFloor;
        const sample = frame[srcFloor] * (1 - frac) + frame[srcCeil] * frac;
        output[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      }

      this.port.postMessage({ type: 'audio', samples: output }, [output.buffer]);
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
```

Why AudioWorklet, not ScriptProcessorNode:

- ScriptProcessorNode runs on the **main thread**. GC pauses, DOM updates, or any JavaScript work causes audio dropouts.
- AudioWorklet runs on a **dedicated audio rendering thread**. Completely decoupled from main-thread jank.
- ScriptProcessorNode is deprecated. AudioWorklet is the standard.

### Client: WebSocket Connection + Audio Playback

```typescript
const HEADER_SIZE = 4;
const TTS_SAMPLE_RATE = 24000;

async function connect() {
  // 1. Get mic access
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
    },
  });

  // 2. Setup AudioContext + Worklet
  const audioCtx = new AudioContext({ sampleRate: 48000 });
  await audioCtx.audioWorklet.addModule('/audio-capture-worklet.js');

  const source = audioCtx.createMediaStreamSource(stream);
  const workletNode = new AudioWorkletNode(audioCtx, 'audio-capture-processor');
  source.connect(workletNode);

  // 3. Open WebSocket
  const ws = new WebSocket('wss://localhost:8765/ws');
  ws.binaryType = 'arraybuffer';

  let isTtsPlaying = false;

  // 4. Wire mic audio -> WebSocket
  workletNode.port.onmessage = (e) => {
    if (e.data?.type === 'audio' && ws.readyState === WebSocket.OPEN) {
      const samples: Int16Array = e.data.samples;
      const flags = isTtsPlaying ? 1 : 0;
      const header = new ArrayBuffer(HEADER_SIZE);
      new DataView(header).setUint32(0, flags, true);

      const frame = new Uint8Array(HEADER_SIZE + samples.byteLength);
      frame.set(new Uint8Array(header), 0);
      frame.set(new Uint8Array(samples.buffer), HEADER_SIZE);

      ws.send(frame.buffer);
    }
  };

  // 5. Handle incoming messages
  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      const msg = JSON.parse(event.data);
      // Handle JSON control messages (transcript, status, etc.)
    } else {
      // Binary: TTS audio (PCM int16, 24kHz)
      playPcmAudio(event.data, audioCtx, TTS_SAMPLE_RATE);
    }
  };
}
```

### TTS Audio Playback Queue

```typescript
class AudioQueue {
  private queue: AudioBuffer[] = [];
  private isPlaying = false;

  constructor(
    private ctx: AudioContext,
    private onPlayingChange: (playing: boolean) => void
  ) {}

  enqueue(pcmInt16: ArrayBuffer): void {
    const int16 = new Int16Array(pcmInt16);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = this.ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    this.queue.push(buffer);

    if (!this.isPlaying) this.playNext();
  }

  private playNext(): void {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlayingChange(false);
      return;
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onPlayingChange(true);
    }

    const buffer = this.queue.shift()!;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.onended = () => this.playNext();
    source.start();
  }
}
```

The `onPlayingChange` callback feeds back into the `isTtsPlaying` flag sent with each audio frame. This is how the WebSocket approach implements echo suppression.

---

## 6. Implementation: WebRTC Voice Agent

### Server (Python, aiortc)

```python
"""WebRTC voice agent server using aiortc."""

import asyncio
import numpy as np
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from av import AudioFrame

class VoiceAgentTrack(MediaStreamTrack):
    """Sends TTS audio back to the browser as an RTP stream."""
    kind = "audio"

    def __init__(self):
        super().__init__()
        self._queue: asyncio.Queue[AudioFrame] = asyncio.Queue()
        self._timestamp = 0

    async def recv(self) -> AudioFrame:
        """Called by aiortc when it needs the next audio frame."""
        frame = await self._queue.get()
        frame.pts = self._timestamp
        frame.time_base = fractions.Fraction(1, 24000)
        self._timestamp += frame.samples
        return frame

    def push_audio(self, pcm_int16: np.ndarray, sample_rate: int = 24000):
        """Push synthesized TTS audio into the RTP stream."""
        frame = AudioFrame.from_ndarray(
            pcm_int16.reshape(1, -1), format="s16", layout="mono"
        )
        frame.sample_rate = sample_rate
        self._queue.put_nowait(frame)


async def handle_offer(offer_sdp: str, offer_type: str) -> str:
    """Process SDP offer from browser, return SDP answer."""
    pc = RTCPeerConnection()
    tts_track = VoiceAgentTrack()

    @pc.on("track")
    def on_track(track: MediaStreamTrack):
        if track.kind == "audio":
            asyncio.ensure_future(process_mic_audio(track, tts_track))

    @pc.on("connectionstatechange")
    async def on_state_change():
        if pc.connectionState == "failed":
            await pc.close()

    # Add TTS output track
    pc.addTrack(tts_track)

    # Set remote offer, create answer
    offer = RTCSessionDescription(sdp=offer_sdp, type=offer_type)
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return pc.localDescription.sdp


async def process_mic_audio(
    mic_track: MediaStreamTrack,
    tts_track: VoiceAgentTrack,
):
    """Receive mic frames -> VAD -> STT -> LLM -> TTS -> send back."""
    audio_buffer = []

    while True:
        try:
            frame = await mic_track.recv()
        except Exception:
            break

        # Convert to float32 for processing
        pcm = frame.to_ndarray().flatten().astype(np.float32) / 32768.0
        audio_buffer.append(pcm)

        # VAD check, accumulate speech, process utterance...
        # When TTS audio is ready:
        # tts_track.push_audio(tts_pcm_int16)
```

### Signaling Server (HTTP endpoint)

WebRTC needs a signaling channel to exchange SDP. Typically a simple HTTP endpoint:

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class SDPOffer(BaseModel):
    sdp: str
    type: str

@app.post("/offer")
async def offer(body: SDPOffer):
    answer_sdp = await handle_offer(body.sdp, body.type)
    return {"sdp": answer_sdp, "type": "answer"}
```

### Client (TypeScript)

```typescript
async function connectWebRTC(signalingUrl: string) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN server for production:
      // { urls: 'turn:turn.example.com', username: 'user', credential: 'pass' }
    ],
  });

  // Get mic with browser's built-in audio processing
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true, // AEC works best with WebRTC playback
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // Send mic to server
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  // Receive TTS audio from server
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play();
    // AEC has access to this playback signal -- echo cancellation works properly
  };

  // ICE candidates (trickle ICE)
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      // In production: send to server via signaling channel
      // For simplicity with aiortc: candidates are gathered before answer
    }
  };

  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering to complete (simple approach, no trickle)
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
    } else {
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') resolve();
      };
    }
  });

  // Exchange SDP via HTTP
  const response = await fetch(signalingUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sdp: pc.localDescription!.sdp,
      type: pc.localDescription!.type,
    }),
  });
  const answer = await response.json();
  await pc.setRemoteDescription(answer);
}
```

### Complexity Comparison

The WebRTC version requires:

- A signaling endpoint (HTTP or WebSocket) separate from the media path
- ICE candidate handling (or waiting for gathering to complete)
- SDP offer/answer exchange
- aiortc or equivalent library on the server (native WebRTC in Python is non-trivial)
- Proper STUN/TURN infrastructure for production

For the same audio-in, audio-out behavior, WebRTC requires ~4x more code and introduces 2-3 additional failure modes (ICE failure, DTLS timeout, codec negotiation mismatch).

---

## 7. Echo Cancellation Deep Dive

This is the one area where WebRTC has a decisive, hard-to-replicate advantage.

### The Problem

When a voice agent speaks through the user's speakers, the microphone picks up that audio. Without echo cancellation, the agent's speech gets fed into STT, creating a feedback loop: agent speaks -> mic captures agent's voice -> STT transcribes agent's words -> LLM responds to its own words -> infinite loop.

### WebRTC AEC (Acoustic Echo Cancellation)

The browser's AEC algorithm has a privileged position:

```
Reference signal (what speakers are playing)
    |
    v
+-------+     +---------+
| AEC   |<----| Mic     |  (mic captures room audio + echo)
| Filter|     | Input   |
+-------+     +---------+
    |
    v
Clean signal (echo removed)
```

The AEC needs two inputs:

1. **The microphone signal** (speech + echo + noise)
2. **The reference signal** (what the speakers are playing -- the agent's voice)

In WebRTC, the browser controls both the playback (via `<audio>` element or MediaStream) and the capture (via getUserMedia). The AEC has direct access to both signals at the audio driver level.

### WebSocket AEC Workarounds

Without WebRTC's integrated AEC, three options:

**Option 1: Mute mic during playback (simplest)**

```python
# Server-side: skip mic frames while TTS is playing
async def feed_audio(self, pcm_bytes: bytes, is_tts_playing: bool) -> None:
    if is_tts_playing:
        self.audio_buffer = []
        self.is_speaking = False
        return
    # ... process audio normally
```

- Works for non-overlapping conversation (agent speaks, then user speaks)
- Prevents barge-in (user cannot interrupt the agent)
- Used in Jarvis

**Option 2: getUserMedia echoCancellation constraint**

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: true },
});
```

- Browser applies AEC to the mic stream before you see it
- Quality varies: Chrome desktop is good, Firefox is inconsistent, mobile Safari has issues
- The AEC works best when the browser controls playback (WebRTC path). When you play audio through Web Audio API (as WebSocket implementations do), the AEC may not have access to the correct reference signal
- **In practice:** works ~80% of the time on Chrome desktop. Not reliable enough for production.

**Option 3: Server-side AEC**

Run an AEC algorithm (SpeexDSP, WebRTC's native AEC module) on the server:

```python
import speexdsp

echo_canceller = speexdsp.EchoCanceller(
    frame_size=480,        # 30ms at 16kHz
    filter_length=4800,    # 300ms tail
    sample_rate=16000,
)

def process_frame(mic_frame, reference_frame):
    """Remove echo of reference signal from mic input."""
    return echo_canceller.process(mic_frame, reference_frame)
```

- Requires sending the reference signal (TTS audio being played) back to the server
- Adds bandwidth (doubling the audio data) and latency
- Quality depends on acoustic model accuracy and tail length tuning
- **When to use:** telephony integrations where you control both legs

### When Echo Cancellation Matters

| Scenario                              | Echo risk | Recommendation                        |
| ------------------------------------- | --------- | ------------------------------------- |
| Agent speaks, user waits, user speaks | None      | Mute-during-playback works            |
| User can interrupt agent (barge-in)   | High      | Need real AEC (WebRTC or server-side) |
| Headphones required                   | None      | No echo path exists                   |
| Speakerphone / laptop speakers        | High      | AEC essential                         |
| Smart speaker / far-field mic         | Very high | Hardware AEC + software AEC           |

---

## 8. The Latency Budget Argument

Here is the actual latency breakdown from Jarvis running on a MacBook Pro (localhost):

```
VAD silence detection:         ~700ms   (46.7%)
Whisper STT (small, CPU):     ~300ms   (20.0%)
Groq LLM TTFT (streaming):   ~150ms   (10.0%)
First sentence buffer:        ~100ms    (6.7%)
Kokoro TTS (first sentence):  ~200ms   (13.3%)
WebSocket round-trip:           ~1ms    (0.07%)
──────────────────────────────────────────────
Total to first audio:         ~1451ms
```

The transport contributes **0.07%** of total latency. Switching from WebSocket (~1ms) to WebRTC (~1ms on localhost) changes nothing.

Even over the internet with 50ms RTT:

```
WebSocket round-trip:          ~50ms    (3.3% of 1500ms)
WebRTC round-trip:             ~50ms    (3.3% of 1500ms)
```

Both protocols add the same network latency. The theoretical advantage of WebRTC (no HOL blocking) would only manifest if:

- Packet loss rate >1% (unusual on modern networks)
- AND pipeline latency is very low (<200ms), making the 50ms HOL stall proportionally significant

### Where to Spend Engineering Effort

Ranked by latency reduction potential:

1. **VAD silence threshold** (700ms -> 400ms): Saves 300ms. Tune `SILENCE_CHUNKS` and `VAD_THRESHOLD`.
2. **Streaming STT** (emit partial transcripts while speaking): Can overlap STT with speech. Saves 200-300ms perceived latency.
3. **Sentence-chunked TTS** (start playing first sentence before full response): Saves 100-500ms depending on response length.
4. **Faster STT model** (Moonshine v2 vs Whisper): 300ms -> 50ms on M3. Saves 250ms.
5. **LLM provider** (Groq vs others): Already optimized at 150ms TTFT.
6. **Transport protocol** (WebSocket vs WebRTC): Saves 0-10ms. Not worth the complexity.

---

## 9. What the Industry Uses

### OpenAI Realtime API

- **Offers both** WebSocket and WebRTC modes
- **WebRTC recommended** for browser-based applications (built-in AEC, lower perceived latency)
- **WebSocket mode** for server-to-server integrations (telephony, backend pipelines)
- In WebRTC mode, control messages go over RTCDataChannel (SCTP), not a separate WebSocket

### LiveKit

- **WebRTC only.** Built an SFU (Selective Forwarding Unit) that handles all WebRTC infrastructure
- **Agents framework:** Python SDK receives audio via WebRTC media tracks, runs your pipeline, sends audio back
- **Handles STUN/TURN** infrastructure for you
- **Why WebRTC:** Their core product is real-time communication rooms. Voice agents are an extension.

### Daily

- **WebRTC-based** infrastructure
- **Pipecat framework:** Abstracts transport -- you can swap between WebRTC and WebSocket backends
- Transport-agnostic pipeline design: your STT/LLM/TTS code doesn't know or care about the transport

### Twilio

- **WebSocket** for Media Streams API
- Audio sent as base64-encoded mu-law in JSON messages over WebSocket
- **Why WebSocket:** Primary use case is telephony. The PSTN leg is not WebRTC. WebSocket bridges the gap between their telephony infrastructure and your application server.
- **The tradeoff:** Base64 encoding adds ~33% bandwidth overhead. mu-law is 8kHz/8-bit (telephony quality). Not optimized for high-fidelity audio.

```json
{
  "event": "media",
  "sequenceNumber": "4",
  "media": {
    "track": "inbound",
    "chunk": "2",
    "timestamp": "5",
    "payload": "base64-encoded-mulaw-audio..."
  }
}
```

### Google Gemini Live / Multimodal Live API

- **WebSocket-based**
- Audio sent as base64-encoded PCM in JSON messages
- Simpler integration model at the cost of ~33% bandwidth overhead from base64
- Native multimodal: no separate STT/TTS pipeline, audio goes directly into the model

### Vapi / Retell / Bland

- **WebRTC-based** (built on LiveKit or Daily)
- Abstract away all transport complexity
- You interact via API, never touch WebRTC directly

### Summary

| Platform        | Transport                           | Why                                     |
| --------------- | ----------------------------------- | --------------------------------------- |
| OpenAI Realtime | Both (WebRTC preferred for browser) | Flexibility across use cases            |
| LiveKit         | WebRTC                              | Core product is real-time communication |
| Daily / Pipecat | WebRTC (with WS abstraction)        | Production infrastructure               |
| Twilio          | WebSocket                           | Telephony bridge, not browser-native    |
| Gemini Live     | WebSocket                           | Simplicity, native multimodal           |
| Vapi / Retell   | WebRTC (abstracted)                 | Built on LiveKit/Daily                  |

---

## 10. Decision Matrix

### Use WebSockets when:

- You control both client and server (demo, internal tool, presentation, prototype)
- Connection is localhost or LAN
- You want to iterate fast on the pipeline, not the transport
- Your pipeline latency (STT + LLM + TTS) is >500ms, making transport optimization irrelevant
- You need structured control messages alongside audio (text + binary frames = trivial multiplexing)
- You're building a telephony integration (WebSocket bridges to PSTN naturally)

### Use WebRTC when:

- Users are on mobile networks or behind restrictive/symmetric NATs
- You need barge-in support (user interrupts agent mid-sentence) -- AEC is essential
- Latency requirements are extreme (<200ms end-to-end, native multimodal APIs)
- You want adaptive bitrate for variable network conditions
- You're building a production system for diverse end-users
- You want Opus compression for bandwidth efficiency over constrained networks

### Use a managed platform (LiveKit, Daily) when:

- You need WebRTC but don't want to run STUN/TURN infrastructure
- You need multi-party audio (more than 1:1)
- You want transport abstracted away so you can focus on the pipeline
- You're building a product, not a presentation

---

## 11. For Our Voice Agent (Jarvis) -- Both Transports, Hot-Swappable

Jarvis supports **both WebSocket and WebRTC**, selectable via a dropdown in the sidebar. The transport can be switched while connected -- disconnect, reconnect on the new transport, same pipeline.

### Why both?

The primary reason is **demonstration**. During the presentation, we show WebSocket first with its `is_tts_playing` echo suppression hack, then hot-swap to WebRTC and show native AEC "just working." The audience sees the same pipeline, same models, same latency -- but the transport-level behavior changes visibly.

### What WebRTC gives us that WebSocket does not

Five concrete things:

1. **Native echo cancellation (AEC).** The browser's AEC operates at the audio driver level. It has access to both the mic input and the speaker output signal. It can subtract the echo properly using an adaptive filter. With WebSocket, the browser plays TTS audio through the Web Audio API (`AudioContext.destination`), and the AEC may not have a reliable reference signal. The workaround is the `is_tts_playing` flag: when Jarvis speaks, the browser tells the server to skip VAD entirely. This works but prevents barge-in -- the user cannot interrupt Jarvis mid-sentence. With WebRTC, the TTS audio arrives as a media track and plays through an `<audio>` element whose output the AEC sees directly. Barge-in works because the AEC removes the echo instead of muting the mic.

2. **Opus codec.** WebSocket sends raw PCM: 16kHz int16 mono = 256 kbps. WebRTC negotiates Opus, compressing to 16-32 kbps (10x reduction). Opus also includes forward error correction (FEC) for packet loss resilience. On localhost this doesn't matter. Over the internet it saves significant bandwidth and handles lossy connections better.

3. **UDP transport (no head-of-line blocking).** WebSocket runs over TCP. If packet N is lost, all subsequent packets stall until the retransmit arrives. For real-time audio, a dropped 20ms frame is imperceptible; a 50-100ms stall causes audible jitter. WebRTC uses UDP via DTLS-SRTP. Lost packets are skipped. The jitter buffer conceals gaps.

4. **Adaptive jitter buffer.** The browser's WebRTC stack includes a built-in jitter buffer that smooths out timing variations in incoming audio. With WebSocket, you'd implement this yourself (Jarvis doesn't -- it plays chunks sequentially via `AudioQueue`, which works on localhost but would produce choppy audio on a variable-latency network).

5. **No AudioWorklet for mic capture.** With WebSocket, an AudioWorklet runs on the browser's audio thread to capture PCM, resample from 48kHz to 16kHz, and ship frames over the socket. With WebRTC, the browser's RTP stack handles capture and Opus encoding natively. The mic track is added to the PeerConnection and audio flows automatically. Less code, fewer moving parts.

### What WebRTC does NOT change

- **VAD.** Silero VAD runs server-side inside `JarvisPipeline.feed_audio()`. Both transports feed audio into the same pipeline. VAD behavior is identical.
- **STT, LLM, TTS.** The pipeline is transport-agnostic. It takes `send_json` and `send_audio` callables. It never knows which transport is active.
- **Latency.** Transport contributes ~1ms on localhost regardless of protocol. The pipeline (VAD + STT + LLM + TTS) dominates at ~1.5s.
- **Control messages.** Both transports carry the same JSON protocol (slide_context, set_streaming, set_stt_model, transcript, status, etc.). WebSocket uses text frames; WebRTC uses an RTCDataChannel.

### The `is_tts_playing` difference

This is the most visible behavioral difference between the two transports:

|                         | WebSocket                                                   | WebRTC                                          |
| ----------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| **Echo suppression**    | `is_tts_playing` flag in binary header                      | Browser AEC (native)                            |
| **During TTS playback** | Mic frames skipped on server                                | Mic frames processed normally                   |
| **Barge-in**            | Not possible                                                | Works (AEC removes echo)                        |
| **Implementation**      | Browser tracks `AudioQueue.isPlaying`, sends flag per frame | `is_tts_playing=False` always -- AEC handles it |

### Architecture

```
Browser (WebSocket mode):
  AudioWorklet -> PCM + is_tts_playing flag -> WebSocket -> Server
  Server -> PCM bytes -> WebSocket -> AudioQueue -> AudioContext.destination

Browser (WebRTC mode):
  getUserMedia -> mic track -> RTCPeerConnection -> SRTP/Opus -> Server
  Server -> AudioSendTrack -> SRTP/Opus -> RTCPeerConnection -> <audio> element
  DataChannel carries JSON control messages (same protocol as WS text frames)
```

The server creates `JarvisPipeline(models, send_json, send_audio)` for both. The `send_json` and `send_audio` callables are closures over the active transport -- WebSocket methods or DataChannel/AudioSendTrack methods.

### Why WebSocket is the default

- **Localhost deployment.** Network advantages of WebRTC (UDP, Opus, jitter buffer) are irrelevant at ~0ms RTT.
- **Simpler debugging.** WebSocket frames are visible in browser DevTools. WebRTC media is opaque.
- **Faster connection.** ~100ms (TCP + TLS + HTTP upgrade) vs ~500ms (ICE + DTLS + SDP exchange).
- **No STUN/TURN.** WebRTC requires at minimum a STUN server for ICE candidate gathering. We use Google's public one (`stun:stun.l.google.com:19302`), which is fine for localhost/LAN but would need TURN for production behind restrictive NATs.

### When to use WebRTC

- Demonstrating AEC vs the `is_tts_playing` hack (the presentation hot-swap demo).
- Testing barge-in behavior.
- If Jarvis were deployed over the internet to real users, WebRTC (or a managed platform like LiveKit/Daily) would be the right choice. The echo cancellation and NAT traversal alone justify the added complexity.

---

## Sources

**WebSocket:**

- [RFC 6455 -- The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

**WebRTC:**

- [RFC 8825 -- Overview: Real-Time Protocols for Browser-Based Applications](https://datatracker.ietf.org/doc/html/rfc8825)
- [RFC 8445 -- Interactive Connectivity Establishment (ICE)](https://datatracker.ietf.org/doc/html/rfc8445)
- [RFC 8489 -- Session Traversal Utilities for NAT (STUN)](https://datatracker.ietf.org/doc/html/rfc8489)
- [RFC 8656 -- Traversal Using Relays around NAT (TURN)](https://datatracker.ietf.org/doc/html/rfc8656)
- [RFC 9147 -- Datagram Transport Layer Security Version 1.3 (DTLS)](https://datatracker.ietf.org/doc/html/rfc9147)
- [RFC 3711 -- The Secure Real-time Transport Protocol (SRTP)](https://datatracker.ietf.org/doc/html/rfc3711)
- [RFC 8866 -- SDP: Session Description Protocol](https://datatracker.ietf.org/doc/html/rfc8866)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

**AudioWorklet:**

- [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)

**Industry:**

- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [LiveKit Agents](https://docs.livekit.io/agents/)
- [Daily Pipecat](https://github.com/pipecat-ai/pipecat)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams)
- [Google Gemini Multimodal Live](https://ai.google.dev/gemini-api/docs/multimodal-live)

**Echo Cancellation:**

- [WebRTC Echo Cancellation -- webrtc.org](https://webrtc.org/)
- [SpeexDSP Echo Cancellation](https://www.speex.org/docs/manual/speex-manual/node7.html)
