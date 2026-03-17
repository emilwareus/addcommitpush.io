# Building Real-Time Voice Agents — Presenter Script
## Slide Deck with Speaker Notes

**Event:** Barrel.ai | March 2026
**Speaker:** Emil Wareus (+ Jarvis AI co-presenter)
**Total Duration:** ~30 minutes (including Q&A)

**IMPORTANT:** Jarvis must be running before you start. `cd jarvis && make run`
Jarvis is your co-presenter from the very first slide. Introduce him early, interact throughout.

---

## Section Walkthrough

| Act | Slides | Section | Duration | What Happens |
|-----|--------|---------|----------|--------------|
| 1 | 1-3 | **Intro + Meet Jarvis** | ~5 min | Title, about me, introduce Jarvis live — chat with him |
| 2 | 4 | **The Pipeline** | ~3 min | 6-stage pipeline overview |
| 3 | 5-9 | **Building Blocks** | ~6 min | STT, TTS, VAD — 1-2 min each |
| 4 | 10-11 | **Transport & Latency** | ~3 min | WebSocket, echo suppression, latency budget |
| 5 | 12 | **Live Coding** | ~5 min | Run 1-2 example scripts |
| 6 | 13 | **Homegrown vs API** | ~2 min | Quick trade-off discussion |
| 7 | 14 | **How Jarvis Was Built** | ~2 min | Agent design — two tools, slide context |
| 8 | 15 | **Q&A + Resources** | ~4 min | Questions — can ask Jarvis too |

---

## SLIDE 1: Title
**Duration:** 1 minute

### Visual
Title slide: "Building Real-Time Voice Agents"
Barrel.ai, date, speaker name.

### Speaker Notes
"Welcome everyone to Barrel.ai! Tonight we're going to build a real-time voice agent from scratch — open-source tools, running locally on this laptop.

And I'm not doing it alone..."

---

## SLIDE 2: About
**Duration:** 2 minutes

### Visual
Speaker introduction card.

### Speaker Notes
"Quick intro — I'm Emil Wareus. Co-founder of oaiz — an event-driven agentic workflow platform where AI becomes self-aware of its own performance and self-improves. Previously co-founded Debricked, open-source security, acquired by Micro Focus.

I built Podidex — lets you talk to your podcasts using the same tech stack we'll discuss today. Same pipeline, same patterns, deployed on GPU.

I write at addcommitpush.io."

---

## SLIDE 3: "Hey Jarvis..." — Meet My Co-Presenter
**Duration:** 2 minutes

### Visual
Big "Hey Jarvis..." heading. Tech stack pills: Whisper STT, Kokoro TTS, Silero VAD, Groq LLM, WebSocket.

### Speaker Notes
"So — I have a co-presenter tonight. Jarvis is an AI voice agent running right here on my laptop. He's been listening since we started."

[Address Jarvis:]

"Hey Jarvis — say hello to the audience."

[Let Jarvis respond]

"Everything you just heard went through this stack — Whisper for speech-to-text, Kokoro for the voice, Silero for detecting when I'm talking, Groq for reasoning, and WebSocket to tie it all together.

No Docker. No cloud GPU. Just this MacBook. Let me show you how it works."

---

## SLIDE 4: The Voice Agent Pipeline
**Duration:** 3 minutes

### Visual
6-stage pipeline: Mic -> VAD -> STT -> LLM -> TTS -> Speaker
All visible at once. Tagline: "Each stage adds latency. The art is in making the total feel instant."

### Speaker Notes
"Every voice agent — Siri, Alexa, Jarvis here — follows this same pipeline.

Capture audio from the mic. VAD detects when someone is speaking. STT transcribes the speech. LLM reasons and decides what to say. TTS synthesizes the response. Speaker plays it back.

Six stages. Each one adds latency. The art is making the total feel instant. Let's look at what we're using for each one."

---

## SLIDE 5: Speech-to-Text: The Ears
**Duration:** 2 minutes

### Visual
STT options, Whisper architecture, code snippet.

### Speaker Notes
"For STT we use faster-whisper — a CTranslate2 reimplementation of OpenAI's Whisper. About 4x faster than the original.

We run the 'small' model — 244M parameters, int8 quantized for CPU. Sweet spot between speed and accuracy. Three lines of code:

```python
model = WhisperModel('small', device='cpu', compute_type='int8')
segments, _ = model.transcribe(audio, beam_size=5, language='en')
```

Alternatives: Deepgram if you want cloud with lowest latency, Moonshine for edge devices."

---

## SLIDE 6: Whisper: How It Works
**Duration:** 1 minute

### Visual
Architecture diagram: Audio -> Log-Mel Spectrogram -> Encoder -> Decoder -> Text.
Model size table: tiny (39M) through large-v3 (1.5B).

### Speaker Notes
"Quick architecture: audio becomes a log-mel spectrogram, encoder processes it, decoder generates text token by token.

Model sizes from tiny at 39M to large-v3 at 1.5B. We pick small — fast enough on CPU, accurate enough for English. int8 quantization halves memory and speeds things up."

---

## SLIDE 7: Text-to-Speech: The Voice
**Duration:** 2 minutes

### Visual
TTS options, Kokoro stats, code snippet.

### Speaker Notes
"For TTS — Kokoro. 82 million parameters, Apache 2.0 license.

The voice you heard Jarvis use — that's Kokoro. ~200ms to first audio with streaming synthesis. 50+ voices available. Code is three lines.

The key for real-time is streaming — it starts yielding audio before the full sentence is done. That's what makes Jarvis feel responsive.

ElevenLabs is better quality if you're okay with cloud. But we want local."

---

## SLIDE 8: Kokoro-82M: Fast & Open TTS
**Duration:** 1 minute

### Visual
Kokoro stats card, streaming synthesis diagram.

### Speaker Notes
"Key numbers: 82M params, 24kHz output, ONNX runtime — no PyTorch at inference.

Streaming synthesis is the critical feature — start playing audio before the full response is generated. You just heard it in action with Jarvis. That's the real demo."

---

## SLIDE 9: Voice Activity Detection
**Duration:** 2 minutes

### Visual
VAD approaches, turn-taking flow diagram.

### Speaker Notes
"VAD — the unsung hero. Silero VAD is a 1.8MB neural network that tells us: is someone speaking right now?

We feed it 30ms audio chunks. When speech probability exceeds 0.5, we accumulate. When we get 700ms of silence — utterance complete, send to STT.

That 700ms is a UX knob. Shorter = more responsive but more false triggers. You can feel this with Jarvis — there's a beat after I stop talking before he processes."

[Optionally ask Jarvis something to demonstrate the VAD delay]

---

## SLIDE 10: Making It Feel Real-Time
**Duration:** 2 minutes

### Visual
WebSocket protocol diagram, binary frame format, echo suppression.

### Speaker Notes
"Transport: WebSocket, not WebRTC. Simpler, good enough for our use case.

Binary protocol: 4-byte flags header plus PCM int16 audio. Bit 0 in the header = 'is TTS playing.' AudioWorklet runs on the browser's audio thread — no glitches from JS garbage collection.

Echo suppression: when Jarvis speaks, the browser sets that flag, and the backend skips VAD. Otherwise Jarvis would hear himself and start a conversation with himself."

---

## SLIDE 11: The Latency Budget
**Duration:** 1 minute

### Visual
Latency waterfall: VAD 700ms + Whisper 300ms + Groq 150ms + Buffer 100ms + Kokoro 200ms + WS ~1ms = ~1.5s

### Speaker Notes
"The full budget: about 1.5 seconds from when you stop speaking to first audio back.

Biggest cost is the 700ms silence threshold — we're literally waiting for you to stop talking. Optimizations exist: reduce silence threshold, speculative execution, sentence-chunked TTS. But 1.5s already feels conversational."

---

## SLIDE 12: Let's Build It
**Duration:** 5 minutes

### Visual
"Let's Build It" — switch to terminal.

### Speaker Notes
[Switch to terminal — `cd presentations/voice-agents/examples/`]

"Let me show you how little code this takes."

**Script 1: `05-full-pipeline.py`** (~3 min)
"This is the full pipeline in ~100 lines. VAD, Whisper, Groq, Kokoro — everything wired together."

```
uv run 05-full-pipeline.py
```

[Have a short voice conversation with it]

"100 lines. That's a complete voice agent."

**Optional if time allows: `02-vad-streaming.py`** (~2 min)
"Here's just the VAD + STT piece — watch how it detects speech in real time."

```
uv run 02-vad-streaming.py
```

[Speak, show VAD detection]

"Jarvis is this, plus a WebSocket server and an agent layer on top."

---

## SLIDE 13: Homegrown vs API: Trade-offs
**Duration:** 2 minutes

### Visual
Comparison table: Latency, Cost, Quality, Privacy, Customization, Offline.

### Speaker Notes
"Should you build this yourself?

APIs like OpenAI Realtime give you ~500ms and best quality. We can't beat that on latency. But: full privacy, total customization, works offline. Your audio never leaves the device.

For learning and for specific use cases — homegrown makes sense."

---

## SLIDE 14: How Jarvis Was Built
**Duration:** 2 minutes

### Visual
Jarvis architecture diagram + agent tool design.

### Speaker Notes
"So how does Jarvis — who's been with us this whole talk — actually work?

Same pipeline. Browser captures audio via AudioWorklet, streams over WebSocket. Backend runs VAD, Whisper, Groq.

The twist is the agent design. Groq has two tools:
1. `respond` — speak aloud. Used when addressed as 'Jarvis.'
2. `update_thinking` — post to the sidebar. Used for everything else.

Jarvis is ALWAYS listening. He just chooses when to speak vs. when to think silently. He also gets slide context — the frontend tells him which slide we're on.

About 500 lines of Python, 300 lines of TypeScript. That's the whole thing."

[Optionally: "Hey Jarvis, anything you want to add?"]

---

## SLIDE 15: Questions & Resources
**Duration:** 4+ minutes

### Visual
Resources: faster-whisper, kokoro-onnx, Silero VAD, Groq API, Podidex.
Speaker info: Emil Wareus, addcommitpush.io

### Speaker Notes
"Questions? Feel free to ask Jarvis too — he's still listening.

[If needed, prompt:]
- Who's going to try building one?
- What would you use a voice agent for?
- Anyone using the commercial APIs?

All the code is open source — the Jarvis backend is ~500 lines of Python.

Thanks everyone!"

---

# TIMING SUMMARY

| Slide | Content | Duration |
|-------|---------|----------|
| 1 | Title | 1 min |
| 2 | About | 2 min |
| 3 | Meet Jarvis + tech stack | 2 min |
| 4 | Pipeline overview | 3 min |
| 5 | STT / faster-whisper | 2 min |
| 6 | Whisper architecture | 1 min |
| 7 | TTS / Kokoro | 2 min |
| 8 | Kokoro deep dive | 1 min |
| 9 | VAD / Silero | 2 min |
| 10 | Transport + echo suppression | 2 min |
| 11 | Latency budget | 1 min |
| 12 | Live coding | 5 min |
| 13 | Homegrown vs API | 2 min |
| 14 | How Jarvis was built | 2 min |
| 15 | Q&A + Resources | 4+ min |
| **TOTAL** | **15 slides** | **~32 min** |

---

# KEY MOMENTS

| When | What | Notes |
|------|------|-------|
| Slide 3 | Jarvis says hello | First interaction — audience sees it's real |
| Slide 9 | VAD demo with Jarvis | Ask Jarvis something to show the delay |
| Slide 12 | Live coding | Run full pipeline script, ~100 lines |
| Slide 14 | Agent design | "Two tools: respond and update_thinking" |
| Slide 15 | Q&A with Jarvis | Audience can ask Jarvis questions |

---

# DEMO PREPARATION CHECKLIST

```
[ ] Jarvis backend running: cd jarvis && make run
[ ] Models downloaded: make models (kokoro-v1.0.onnx, voices-v1.0.bin)
[ ] .env configured with GROQ_API_KEY
[ ] SSL certs generated: mkcert localhost 127.0.0.1
[ ] Presentation server running (Next.js dev server)
[ ] Terminal ready in presentations/voice-agents/examples/
[ ] Example scripts pre-tested: uv run 05-full-pipeline.py (and optionally 02-vad-streaming.py)
[ ] Microphone tested and working
[ ] Speaker volume set (audience needs to hear Jarvis)
[ ] Backup: screenshots/recordings of demos in case of failure
```

# EQUIPMENT NEEDED

```
[ ] Laptop with all models loaded and warm
[ ] External microphone (if venue is noisy)
[ ] Audio output to venue speakers (for Jarvis + TTS demos)
[ ] Presentation at localhost:3001/presentations/voice-agents
[ ] Terminal with examples/ directory ready
[ ] Water
```
