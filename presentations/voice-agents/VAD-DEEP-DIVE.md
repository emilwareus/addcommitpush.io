# Voice Activity Detection -- Deep Research Report

How VAD drives the entire state machine of a real-time voice agent, and why getting it wrong ruins everything downstream.

**Based on:**

- [Silero VAD GitHub](https://github.com/snakers4/silero-vad) -- MIT, ~2MB, the de facto standard
- [The Gradient: One Voice Detector to Rule Them All](https://thegradient.pub/one-voice-detector-to-rule-them-all/) -- Silero team's own writeup
- [Silero VAD Quality Metrics](https://github.com/snakers4/silero-vad/wiki/Quality-Metrics) -- ROC-AUC benchmarks
- [AssemblyAI: Turn Detection and Endpointing](https://www.assemblyai.com/blog/turn-detection-endpointing-voice-agent) -- the frontier
- Jarvis source code: [`pipeline.py`](jarvis/pipeline.py), [`config.py`](jarvis/config.py), [`models.py`](jarvis/models.py)

---

## 1. What VAD Actually Does in a Voice Agent

VAD is not just "detecting speech." It solves three engineering problems that cascade through the entire pipeline:

### Problem 1: Turn-taking / Endpointing

Determining when the user has _finished_ speaking so the agent can respond. This is the single most impactful UX parameter in a voice agent. The silence threshold (how long to wait after speech stops) controls the tradeoff:

- **Too short (200ms)**: cuts users off mid-thought during natural pauses
- **Too long (1000ms+)**: the agent feels sluggish, conversation loses flow
- **Sweet spot**: 500-700ms for most conversational use cases

In Jarvis, the 700ms silence threshold is nearly half the total 1.5s latency budget. Per AssemblyAI, endpointing is "a completely different order of magnitude" of delay compared to other latency sources.

### Problem 2: Compute Gating

Without VAD, you send continuous audio to STT, wasting CPU/GPU cycles transcribing silence. In typical conversations, silence dominates -- 60-80% of audio is non-speech. VAD acts as a gate: only forward audio frames when speech is detected.

### Problem 3: Pipeline State Management

VAD drives the entire state machine:

```
IDLE -> [VAD fires] -> LISTENING -> [700ms silence] -> PROCESSING (STT + LLM) -> RESPONDING (TTS) -> IDLE
```

Every downstream component depends on VAD's decisions. A false positive wastes an LLM call. A false negative drops the user's utterance entirely.

---

## 2. Silero VAD -- The De Facto Standard

### Architecture

Silero VAD is a neural network combining multi-head attention with LSTM temporal modeling. The pipeline (revealed by ONNX model inspection):

```
Audio Input (512 samples @ 16kHz = 32ms)
  -> STFT (spectral feature extraction)
  -> Encoder (convolutional feature compression)
  -> LSTM Decoder (2 stacked layers, 64 hidden units each)
  -> Voice Probability Output (0.0 to 1.0)
```

The LSTM hidden/cell states carry context across chunks with shape `(2, batch, 64)` -- 2 stacked layers, 64 units. The first ~4 computation steps depend only on the audio data (STFT + encoder); only the LSTM step uses and updates the recurrent state. This gives Silero temporal context across chunks without requiring the caller to manage windowing.

The Silero team notes: "you can achieve good results with any sort of fully feedforward network." The MHA + LSTM choice was a design decision for better temporal modeling, not a requirement.

### Model Specs

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| Size           | ~2 MB (v5/v6)                                 |
| Parameters     | Not publicly disclosed                        |
| Sample rates   | 8 kHz and 16 kHz only                         |
| Window size    | 512 samples @ 16kHz = **32ms** (fixed in v5+) |
| Inference time | <1ms per chunk on single CPU thread           |
| Training data  | ~13,000 hours, 6,000+ languages               |
| License        | MIT                                           |
| Output         | Float 0.0-1.0 (speech probability)            |

### Silero v5 Changes (from v4)

- 3x faster TorchScript inference; 10% faster ONNX
- Model size doubled from ~1MB to ~2MB (more capacity)
- 5-7% quality improvement on clean audio
- "Significantly more robust on noisy data"
- Fixed window sizes only (512 samples @ 16kHz) -- `window_size_samples` deprecated
- Context passing: part of previous chunk automatically passed with current chunk
- Negligible quality difference between 8kHz and 16kHz

### Silero v6 (Latest)

- ROC-AUC improved from 0.96 (v5) to 0.97

### API

Basic batch usage:

```python
from silero_vad import load_silero_vad, read_audio, get_speech_timestamps

model = load_silero_vad()
wav = read_audio('path_to_audio_file')
speech_timestamps = get_speech_timestamps(wav, model, return_seconds=True)
```

Streaming usage (as in Jarvis):

```python
# models.py:113-116
def vad_predict(self, audio_chunk: np.ndarray, sample_rate: int) -> float:
    tensor = self._torch.from_numpy(audio_chunk).float()
    return self._vad(tensor, sample_rate).item()
```

Key `get_speech_timestamps` parameters:

| Parameter                 | Default | Purpose                                    |
| ------------------------- | ------- | ------------------------------------------ |
| `threshold`               | 0.5     | Speech probability threshold (0.0-1.0)     |
| `min_speech_duration_ms`  | 250     | Minimum speech segment length              |
| `min_silence_duration_ms` | 100     | Minimum silence to split segments          |
| `speech_pad_ms`           | 30      | Padding added before/after speech segments |
| `max_speech_duration_s`   | inf     | Maximum speech segment length              |

---

## 3. ROC-AUC Benchmarks -- Silero vs. the Field

Multi-domain validation set (17 hours, 9 datasets):

| Model                    | ROC-AUC  | Accuracy |
| ------------------------ | -------- | -------- |
| **Silero v6**            | **0.97** | **0.92** |
| Silero v5                | 0.96     | 0.91     |
| FireRed VAD              | 0.94     | 0.88     |
| Commercial VAD (unnamed) | 0.93     | 0.87     |
| Silero v4                | 0.91     | 0.85     |
| Silero v3                | 0.92     | --       |
| **WebRTC VAD**           | **0.73** | **0.74** |

The gap between Silero (0.97) and WebRTC (0.73) is enormous. WebRTC is "extremely fast and pretty good at separating noise from silence, but pretty poor at separating speech from noise."

Source: [Silero VAD Quality Metrics Wiki](https://github.com/snakers4/silero-vad/wiki/Quality-Metrics)

---

## 4. WebRTC VAD -- The Classic Baseline

### How It Works

WebRTC VAD is a Gaussian Mixture Model (GMM) operating on subband energy features:

1. Audio resampled to 8kHz internally
2. Frequency range 0-4kHz divided into **6 subbands**: 80-250Hz, 250-500Hz, 500-1kHz, 1-2kHz, 2-3kHz, 3-4kHz
3. Logarithmic energy calculated per subband (6 features total)
4. Two GMMs (speech model and noise model) compute probability for each subband
5. Probabilities weighted and combined
6. Total energy checked against `kMinEnergy` threshold
7. Binary speech/non-speech decision

Frame sizes: 10ms, 20ms, or 30ms (80, 160, or 240 samples at 8kHz).

Four aggressiveness modes (`kVadNormal` through `kVadVeryAggressive`) use different GMM parameters and decision thresholds. Higher aggressiveness = more likely to flag a frame as speech (fewer false negatives, more false positives).

### Why It Still Matters

- Essentially zero CPU cost (pure C, no ML framework)
- Deterministic behavior
- Works well as a first-pass energy gate before a neural VAD
- Ideal for embedded/IoT where even Silero's 1ms is too much

### Where It Falls Apart

Non-stationary noise: typing, music, HVAC hum, coughing. The 6-subband energy features cannot distinguish speech from noise with similar spectral profiles. This is where Silero's neural approach (trained on 13,000 hours with diverse noise conditions) dominates.

---

## 5. Other Notable VAD Systems

### pyannote-audio VAD

- Processes raw audio waveforms directly (no handcrafted features)
- Part of the broader pyannote speaker diarization toolkit
- Fine-grained segmentation (126 segments for ~30 min audio vs NeMo's 1209)
- Best for multi-speaker scenarios (9+ speakers)
- GPU-preferred; not designed for real-time single-stream use cases

### NVIDIA NeMo VAD (MarbleNet)

- Takes mel spectrograms as input
- Multi-scale segmentation approach
- ~9% lower Diarization Error Rate for 2-speaker scenarios
- ~2x slower processing than pyannote
- Best for enterprise-scale with NVIDIA GPU infrastructure

### FireRed VAD

- Scores 0.94 ROC-AUC on Silero's benchmark
- Strongest non-Silero open-source competitor

### Picovoice Cobra

- Commercial, claims strong noise robustness
- Competitive with Silero in noisy environments (per Picovoice's own benchmarks)

---

## 6. Engineering Details for Real-Time VAD

### Frame Size and Hop Size

| System              | Frame size                 | Notes                            |
| ------------------- | -------------------------- | -------------------------------- |
| Silero v5+          | 512 samples / 32ms @ 16kHz | Fixed, not configurable          |
| WebRTC              | 10ms, 20ms, or 30ms        | Shorter = faster onset detection |
| Production standard | 25ms frame, 10ms hop       | With Hamming windowing           |

Tradeoff: shorter frames detect onset faster but misclassify more; longer frames improve accuracy but add detection delay. Silero chose 32ms as the sweet spot.

### Threshold Tuning

- **0.5**: universal default (Silero, OpenAI, LiveKit)
- **0.7**: Pipecat's stricter default for noisy environments
- Higher thresholds in noisy environments reduce false positives
- Lower thresholds in quiet environments catch soft speech

### Pre-Speech Buffer (Prefix Padding)

When VAD triggers, you need the audio from _before_ the trigger to avoid clipping the first syllable. This is a circular buffer maintained continuously.

| Framework           | Pre-speech buffer |
| ------------------- | ----------------- |
| OpenAI Realtime API | 300ms             |
| LiveKit             | 500ms             |
| Pipecat             | configurable      |

### Post-Speech Silence (Endpointing Threshold)

After VAD probability drops below threshold, how long to wait before declaring end-of-utterance:

| Framework           | Silence threshold |
| ------------------- | ----------------- |
| OpenAI Realtime API | 200ms             |
| Pipecat             | 200ms             |
| LiveKit             | 550ms             |
| **Jarvis**          | **700ms**         |

### Hangover / Speech Continuation

During the silence detection phase, silence chunks are still appended to the audio buffer. This ensures word-final consonants and brief pauses within utterances are captured. Silero's default `speech_pad_ms` of 30ms adds padding at the raw VAD level; frameworks add their own on top.

### State Reset / Drift Prevention

Silero's LSTM carries state across chunks, which is the source of its temporal smoothing. But state can drift over long sessions. Pipecat resets model state every 5 seconds to prevent this. Other approaches:

- Median filtering to smooth single-frame glitches
- Hysteresis: different thresholds for onset (higher) vs. termination (lower) to prevent rapid flickering

### Non-Speech Sound Handling

This is where WebRTC fails and Silero succeeds. Typing, coughing, door slams, music all have energy in speech-frequency bands. Silero's neural approach handles these far better, but is still imperfect. Some pipelines layer a volume gate (Pipecat's `min_volume: 0.6`) before VAD as a cheap first filter.

Per LiveKit: "if VAD is continuously triggered by background noise, turn detection can be significantly delayed" -- false positives cascade into delayed endpointing because the silence timer keeps resetting.

---

## 7. How Jarvis Uses VAD

### Configuration

[`config.py`](jarvis/config.py)

```python
CHUNK_MS = 32              # Silero v5 requires exactly 512 samples at 16kHz
CHUNK_SAMPLES = 512
INPUT_SAMPLE_RATE = 16000
VAD_THRESHOLD = 0.5
SILENCE_DURATION_MS = 700
SILENCE_CHUNKS = 21        # 700 / 32 = ~21 chunks of silence before utterance end
```

### VAD State Machine

[`pipeline.py:109-150`](jarvis/pipeline.py)

The state machine tracks `is_speaking` (bool) and `silence_count` (int):

```
Audio chunk arrives (512 samples, 32ms)
  -> VAD predicts speech probability (0.0-1.0)
  -> If prob >= 0.5:
       is_speaking = True
       silence_count = 0
       Append to audio_buffer
       Send {"type": "listening", "active": true} to browser
  -> If prob < 0.5 and is_speaking:
       silence_count += 1
       Still append to buffer (captures trailing audio)
       If silence_count >= 21 (~700ms):
         -> UTTERANCE COMPLETE
         -> Send to STT -> LLM -> TTS
         -> Reset state
```

### Echo Suppression

[`pipeline.py:81-87`](jarvis/pipeline.py)

While TTS is playing (`is_tts_playing`), all incoming audio is discarded and VAD state is reset. This prevents the agent from hearing its own voice through the microphone and entering a feedback loop.

### STT Handoff

When an utterance is complete:

1. All buffered chunks (including up to 700ms trailing silence) concatenated into a single numpy array
2. Minimum length check: rejects audio shorter than ~0.3 seconds
3. `models.transcribe(full_audio)` runs faster-whisper on the complete utterance
4. Transcript passed to LLM agent
5. LLM response synthesized via Kokoro TTS

---

## 8. The Frontier: Semantic VAD

Traditional VAD uses acoustic features only. The next generation fuses speech understanding with turn detection.

### OpenAI Realtime API -- `semantic_vad`

Instead of pure silence detection, a classifier trained on conversational patterns determines when the user is _semantically done_ speaking. Configuration is simple -- just an `eagerness` parameter (`low`, `medium`, `high`, `auto`).

### AssemblyAI -- Text + Audio Fusion

Fuses text content and audio context to predict end-of-turn:

| Parameter                                | Default           |
| ---------------------------------------- | ----------------- |
| `end_of_turn_confidence_threshold`       | 0.7               |
| `min_end_of_turn_silence_when_confident` | 160ms             |
| `max_turn_silence`                       | 2400ms (fallback) |

Their comparison of approaches:

| Approach   | Input                    | VAD Dependency | Noise Robustness |
| ---------- | ------------------------ | -------------- | ---------------- |
| LiveKit    | Text only                | High           | Poor             |
| Pipecat    | Audio features (prosody) | None           | Poor             |
| AssemblyAI | Text + Audio context     | Low            | Good             |

### Deepgram Flux

Fuses speech recognition and turn detection in the same model, avoiding the separate VAD -> STT -> endpointing pipeline entirely. The model outputs both transcription and turn boundaries simultaneously.

### The Challenge

Semantic VAD is promising but currently only available behind commercial APIs. No open-source equivalent exists yet. For Jarvis, the acoustic-only approach (Silero + silence threshold) remains the practical choice.

---

## 9. Why VAD Matters for Voice Agents -- Summary

### The Latency Stack

In Jarvis's pipeline, the latency budget for one turn looks like:

| Stage                           | Latency       | Notes                            |
| ------------------------------- | ------------- | -------------------------------- |
| VAD detecting end-of-speech     | ~700ms        | The silence threshold            |
| STT (faster-whisper small, CPU) | ~300ms        | Could be 50-148ms with Moonshine |
| LLM inference                   | ~200-500ms    | Depends on model and prompt      |
| TTS (Kokoro, CPU)               | ~50-100ms     | First chunk streaming            |
| **Total**                       | **~1.3-1.6s** |                                  |

VAD's 700ms is the single largest contributor. Reducing it improves perceived responsiveness more than any other optimization.

### What Makes a Good VAD for Voice Agents

1. **Low false positive rate**: false triggers waste an LLM call and break conversation flow
2. **Low false negative rate**: missing speech means the user has to repeat themselves
3. **Fast onset detection**: the pre-speech buffer compensates, but faster is better
4. **Robust to noise**: typing, music, HVAC, other speakers -- all must be rejected
5. **Lightweight**: must run on CPU alongside STT, LLM, and TTS without contention
6. **Stateful**: must track temporal context across chunks for smooth decisions

Silero VAD hits all six. At ~2MB and <1ms per 32ms chunk, it is effectively free compared to the STT and LLM stages. Its 0.97 ROC-AUC is 33% better than WebRTC's 0.73. For voice agents, it is the obvious choice.

---

## 10. Sources

- [Silero VAD GitHub](https://github.com/snakers4/silero-vad) -- MIT license, v5/v6
- [Silero VAD Quality Metrics Wiki](https://github.com/snakers4/silero-vad/wiki/Quality-Metrics)
- [The Gradient: One Voice Detector to Rule Them All](https://thegradient.pub/one-voice-detector-to-rule-them-all/)
- [AssemblyAI: Turn Detection and Endpointing in Voice Agents](https://www.assemblyai.com/blog/turn-detection-endpointing-voice-agent)
- [Deepgram: Introducing Flux](https://deepgram.com/learn/introducing-flux-conversational-speech-recognition)
- [OpenAI Realtime VAD Documentation](https://developers.openai.com/api/docs/guides/realtime-vad)
- [LiveKit Silero VAD Plugin](https://docs.livekit.io/agents/logic/turns/vad/)
- [Pipecat SileroVADAnalyzer](https://docs.pipecat.ai/server/utilities/audio/silero-vad-analyzer)
- [DeepWiki: WebRTC VAD Implementation](https://deepwiki.com/gkonovalov/android-vad/3.1-webrtc-vad)
- [Picovoice: Best VAD Comparison 2026](https://picovoice.ai/blog/best-voice-activity-detection-vad/)
