# Building Real-Time Voice Agents — Presenter Script
## Slide Deck with Speaker Notes

**Event:** Barrel.ai | March 2026
**Speaker:** Emil Wareus (+ Jarvis AI co-presenter)
**Total Duration:** ~31 minutes (including Q&A)

**IMPORTANT:** Jarvis must be running before you start. `cd jarvis && make run`
Jarvis is your co-presenter from the very first slide. Introduce him early, interact throughout.

---

## Section Walkthrough

| Act | Slides | Section | Duration | What Happens |
|-----|--------|---------|----------|--------------|
| 1 | 1-3 | **Intro + Meet Jarvis** | ~5 min | Title, about me, introduce Jarvis live — chat with him |
| 2 | 4 | **The Pipeline** | ~3 min | 6-stage pipeline overview |
| 3 | 5-9B | **Building Blocks** | ~7 min | VAD, STT, TTS — following the pipeline order |
| 4 | 10-11B | **Transport & Latency** | ~5 min | WebSocket, WebRTC hot-swap demo, echo suppression, latency budget |
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

## SLIDE 5: Voice Activity Detection
**Duration:** 2 minutes

### Visual
VAD approaches, turn-taking flow diagram.

### Speaker Notes
"VAD — the unsung hero. Silero VAD is a 1.8MB neural network that tells us: is someone speaking right now?

We feed it 30ms audio chunks. When speech probability exceeds 0.5, we accumulate. When we get 700ms of silence — utterance complete, send to STT.

That 700ms is a UX knob. Shorter = more responsive but more false triggers. You can feel this with Jarvis — there's a beat after I stop talking before he processes."

[Optionally ask Jarvis something to demonstrate the VAD delay]

---

## SLIDE 6: Speech-to-Text: The Ears
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

## SLIDE 7: Whisper: How It Works
**Duration:** 1 minute

### Visual
Architecture diagram: Audio -> Log-Mel Spectrogram -> Encoder -> Decoder -> Text.
Model size table: tiny (39M) through large-v3 (1.5B).

### Speaker Notes
"Quick architecture: audio becomes a log-mel spectrogram, encoder processes it, decoder generates text token by token.

Model sizes from tiny at 39M to large-v3 at 1.5B. We pick small — fast enough on CPU, accurate enough for English. int8 quantization halves memory and speeds things up."

---

## SLIDE 8: Text-to-Speech: The Voice
**Duration:** 2 minutes

### Visual
TTS options, Kokoro stats, code snippet.

### Speaker Notes
"For TTS — Kokoro. 82 million parameters, Apache 2.0 license.

The voice you heard Jarvis use — that's Kokoro. ~200ms to first audio with streaming synthesis. 50+ voices available. Code is three lines.

The key for real-time is streaming — it starts yielding audio before the full sentence is done. That's what makes Jarvis feel responsive.

ElevenLabs is better quality if you're okay with cloud. But we want local."

---

## SLIDE 9: Kokoro: How Inference Works
**Duration:** 1.5 minutes

### Visual
Inference pipeline: text -> phonemes -> acoustic path + prosody path -> iSTFTNet vocoder -> waveform.

### Speaker Notes
"This is the slide that explains how Kokoro actually works at inference time.

The flow is: text to phonemes, then two learned paths. One path builds acoustic features for the decoder. The other is the prosody path, which means it decides how the speech should be delivered over time: duration, pitch, and energy.

A phoneme is just a unit of sound, not a letter. For example, the word 'cat' is three phonemes: k, ae, t. That's useful because TTS cares about how words sound, not how they are spelled.

That split is important. Instead of asking one giant autoregressive model to do everything, Kokoro predicts the structure of speech explicitly. It decides how long each phoneme lasts, what the F0 contour should be, and how the energy should vary, then hands that to the vocoder.

If someone here has done classic speech or DSP, you can think of this as putting the latent structure of speech back into the architecture instead of hoping a giant decoder rediscovers it.

So slide 9 is really the pipeline view: what sounds to say, how to say them, and then how to turn that plan into actual audio."

---

## SLIDE 9B: Why 82M Still Sounds Good
**Duration:** 1 minute

### Visual
Pipeline view of Kokoro's main submodules with parameter allocation and training-status labels: external G2P, pre-trained/fine-tuned PLBERT, and end-to-end trained TextEncoder, ProsodyPredictor, and Decoder/iSTFTNet.

### Speaker Notes
"Now the obvious question: why does such a small model sound this good?

This slide is meant to be read left to right as the model, not as a list of disconnected ideas.

Start with phoneme tokens. Those feed two paths.

Also notice the labels on the slide. The grapheme-to-phoneme front-end is external preprocessing, not something Kokoro trains itself.

The upper path is PLBERT plus a projection layer. This is the pre-trained language-model-like part, then adapted to Kokoro. It gives contextual features for the prosody side. Then the prosody predictor explicitly predicts duration, pitch, and energy.

The lower path is the TextEncoder, which is trained end-to-end with the rest of the acoustic model and builds acoustic content features for the decoder.

Both paths meet in the decoder, which is also trained end-to-end, and that is where most of the parameters live. That's the main message of the slide: Kokoro spends most of its capacity on waveform generation, not on a giant language-style backbone.

The core conditioning trick is the 256-dimensional style vector injected throughout the network with adaptive normalization. Half mainly controls timbre, meaning the color or character of the voice, and half controls prosody, meaning rhythm, pitch, and emphasis over time.

Then the other big idea is the vocoder: iSTFTNet. Instead of directly predicting raw waveform samples, it predicts spectral magnitude and phase, then uses inverse STFT to reconstruct audio. That's a really smart inductive bias. You're letting DSP do the mathematically solved part, and using the neural net for the hard perceptual part.

And one subtle but important detail: in full StyleTTS 2, style is sampled from a diffusion model. Kokoro simplifies that for inference by using precomputed voice packs. So you keep much of the naturalness benefit of style conditioning without paying diffusion-time latency at runtime.

So the reason 82M works is not magic. It's good decomposition: explicit speech structure, strong style conditioning, and most of the parameter budget concentrated in the DSP-aware vocoder where the audio quality problem is hardest.

And yes, the practical payoff is streaming synthesis. Jarvis can start speaking before the full response is finished, but the reason that feels good is the architecture underneath, not just the API."

---

## SLIDE 10: Making It Feel Real-Time — WebSocket
**Duration:** 2 minutes

### Visual
WebSocket protocol diagram, binary frame format, echo suppression hack.

### Speaker Notes
"Transport is the last piece of the pipeline. Jarvis currently runs on WebSocket. Let me show you the protocol.

Binary frames: 4-byte flags header plus PCM int16 audio. Bit 0 in that header is 'is TTS playing.' The AudioWorklet runs on the browser's dedicated audio thread — no glitches from JS garbage collection.

Here's the hack: echo suppression. When Jarvis speaks, the browser sets that flag, and the backend skips VAD entirely. Otherwise Jarvis would hear himself through the speakers and start a conversation with himself.

It works. But it means you cannot interrupt Jarvis while he's speaking. No barge-in. The mic is effectively muted during TTS playback. For a co-presenter that speaks rarely, that's fine. For a conversational agent, it's a dealbreaker."

---

## SLIDE 11: WebRTC — What Changes
**Duration:** 2 minutes

### Visual
Side-by-side: WebSocket vs WebRTC. Key differences highlighted: native AEC, Opus codec, UDP transport, jitter buffer.

### Speaker Notes
"So what does WebRTC give us that WebSocket doesn't?

Five things.

First: native echo cancellation. The browser's AEC has access to both the mic input and the speaker output at the audio driver level. It can subtract the echo signal properly. No is_tts_playing hack, no mic muting. Barge-in just works — you can talk while Jarvis is speaking.

Second: Opus codec. WebSocket sends raw PCM — 256 kbps for 16kHz int16 mono. WebRTC negotiates Opus, which compresses that down to 16-32 kbps. Ten times less bandwidth. Includes built-in forward error correction.

Third: UDP transport. WebSocket runs on TCP. If one packet is lost, everything behind it stalls until the retransmit arrives — head-of-line blocking. WebRTC uses UDP via SRTP. Lost packets are just skipped. For real-time audio, a dropped 20ms frame is better than a 50ms stall.

Fourth: adaptive jitter buffer. The browser automatically smooths out timing variations in incoming audio. With WebSocket you'd build that yourself.

Fifth: no AudioWorklet needed for capture. The browser's WebRTC stack captures, encodes, and sends mic audio natively through the RTP track.

Let me show you the difference live."

[Switch transport dropdown in Jarvis sidebar from WebSocket to WebRTC]

"Watch: Jarvis disconnects, reconnects over WebRTC. Same pipeline on the server — same VAD, same Whisper, same Groq, same Kokoro. Only the transport changed."

[Speak to Jarvis, demonstrate it working]

"Now try talking while Jarvis is speaking. On WebSocket that was impossible — the mic was muted. On WebRTC, AEC handles it."

---

## SLIDE 11B: The Latency Budget
**Duration:** 1 minute

### Visual
Latency waterfall: VAD 700ms + Whisper 300ms + Groq 150ms + Buffer 100ms + Kokoro 200ms + Transport ~1ms = ~1.5s

### Speaker Notes
"The full budget: about 1.5 seconds from when you stop speaking to first audio back.

Notice the transport line: ~1ms. Whether that's WebSocket or WebRTC on localhost, it's the same. Transport is 0.07% of total latency. The win from WebRTC is not speed — it's the features: AEC, Opus, jitter buffering.

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
| 5 | VAD / Silero | 2 min |
| 6 | STT / faster-whisper | 2 min |
| 7 | Whisper architecture | 1 min |
| 8 | TTS / Kokoro | 2 min |
| 9 | Kokoro inference pipeline | 1.5 min |
| 9B | Why Kokoro works | 1 min |
| 10 | WebSocket transport + echo hack | 2 min |
| 11 | WebRTC — what changes + live hot-swap | 2 min |
| 11B | Latency budget | 1 min |
| 12 | Live coding | 5 min |
| 13 | Homegrown vs API | 2 min |
| 14 | How Jarvis was built | 2 min |
| 15 | Q&A + Resources | 4+ min |
| **TOTAL** | **17 slides** | **~35 min** |

---

# KEY MOMENTS

| When | What | Notes |
|------|------|-------|
| Slide 3 | Jarvis says hello | First interaction — audience sees it's real |
| Slide 5 | VAD demo with Jarvis | Ask Jarvis something to show the delay |
| Slide 11 | WebRTC hot-swap | Live toggle WebSocket->WebRTC, demo barge-in with AEC |
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
