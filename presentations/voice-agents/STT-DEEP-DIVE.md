# Speech-to-Text Models -- Deep Research Report

A comparative analysis of STT options for real-time voice agents: accuracy, speed, cost, and architecture.

**Models covered:** OpenAI Whisper, faster-whisper, Moonshine, Deepgram Nova-3, Google Cloud STT (Chirp), Mistral Voxtral

**Table of contents:**
1. [How STT Models Are Evaluated](#1-how-stt-models-are-evaluated) -- metrics, datasets, and why benchmarks lie
2. [Head-to-Head Comparison](#2-head-to-head-comparison) -- accuracy, speed, cost
3. [OpenAI Whisper](#3-openai-whisper----the-foundation)
4. [faster-whisper](#4-faster-whisper----same-brain-faster-body)
5. [Moonshine](#5-moonshine----built-for-the-edge)
6. [Deepgram Nova-3](#6-deepgram-nova-3----production-streaming)
7. [Google Cloud STT (Chirp)](#7-google-cloud-speech-to-text-chirp)
8. [Mistral Voxtral](#8-mistral-voxtral----the-new-contender)
9. [Decision Matrix](#9-decision-matrix-for-voice-agents)
10. [For Our Voice Agent (Jarvis)](#10-for-our-voice-agent-jarvis)

---

## 1. How STT Models Are Evaluated

### 1.1 Word Error Rate (WER)

The dominant metric for STT accuracy. Measures how many words the model gets wrong compared to a human-written reference transcript.

**Formula:**

```
WER = (S + D + I) / N
```

- **S (Substitutions):** A word in the reference is replaced by a different word. "The cat **sat** on the mat" transcribed as "The cat **set** on the mat" -- one substitution.
- **D (Deletions):** A reference word is missing from the output. "The cat sat **on** the mat" becomes "The cat sat the mat" -- one deletion.
- **I (Insertions):** The output contains a word not in the reference. "The cat sat on the mat" becomes "The cat **just** sat on the mat" -- one insertion.
- **N:** Total words in the reference transcript.

The alignment between hypothesis and reference is computed using dynamic programming (minimum edit distance at the word level), finding the optimal alignment that minimizes S + D + I.

**WER can exceed 100%** if the model hallucinates many extra words (insertions push the numerator above N).

**What counts as "good" WER:**

| Domain | Typical WER | Why |
|--------|-------------|-----|
| Read audiobooks (LibriSpeech clean) | 1-3% | Studio quality, clear enunciation |
| TED talks | 3-6% | Prepared speech, some accents |
| Earnings calls | 8-15% | Domain jargon, phone audio, multiple speakers |
| Meeting transcription | 12-25% | Overlapping speakers, far-field mics |
| Noisy phone calls | 15-30%+ | Background noise, compression, accents |

Human transcriber disagreement is typically **4-5% WER**, which sets a practical floor.

**Limitations of WER -- and they are serious:**

- **All errors weighted equally.** Deleting "um" counts the same as substituting "innocent" for "guilty."
- **Semantically better transcriptions can score worse.** "I'm an engineer" vs reference "I am an engineer" -- the contraction counts as a substitution + deletion (22.2% WER). Meanwhile "I am an enginear" scores only 11.1% WER despite being less useful.
- **Formatting creates phantom errors.** "Dr." vs "doctor", "$5" vs "five dollars", "1,000" vs "1000" inflate WER. This is why normalization is critical -- but normalization itself is non-standardized.
- **Reference transcripts contain errors.** Human transcribers are inconsistent. A model that correctly transcribes something the annotator got wrong gets penalized.
- **Averages hide distribution.** 5% mean WER might be 1% on clean audio and 40% on accented speech.

### 1.2 Character Error Rate (CER)

Same formula as WER, but computed at the character level:

```
CER = (S_c + D_c + I_c) / N_c
```

**When CER is preferred:**
- **Languages without word boundaries.** Mandarin, Japanese, Thai use no whitespace between words, making WER meaningless. CER is the standard metric for these languages.
- **Fine-grained error analysis.** WER treats "cat" -> "bat" and "cat" -> "refrigerator" as equally wrong (one substitution). CER scores the first as 1/3 errors and the second much higher.
- CER is always lower than or equal to WER for whitespace-delimited languages.

### 1.3 Real-Time Factor (RTF)

Measures processing speed relative to audio duration:

```
RTF = processing_time / audio_duration
```

| RTF | Meaning | "Nx" notation |
|-----|---------|---------------|
| 0.1 | 10x faster than real-time | 10x real-time |
| 0.5 | 2x faster than real-time | 2x real-time |
| 1.0 | Exactly real-time | 1x real-time |
| 2.0 | Half as fast as real-time | 0.5x real-time |

For voice agents, you want RTF well below 1.0 (typically 0.1-0.3) to leave budget for network latency, VAD, LLM inference, and TTS in the response pipeline.

RTF is **hardware-dependent**. Always report the hardware alongside the number.

### 1.4 Latency Metrics for Streaming STT

Three distinct measurements, each answering a different question:

**Time to First Token (TTFT):** Time from when audio streaming begins to when the first partial transcript appears. Measures perceived responsiveness. But beware: early partials are often wrong and require correction. Fast TTFT does not mean the system is actually *useful* quickly.

**Finals Latency / End-of-Utterance Latency:** Time from when the user **stops speaking** to when the **final, stable transcript** is available. This is the metric that matters most for voice agents, because the LLM cannot start generating a response until the transcript is finalized.

```
finals_latency = endpointing_latency + processing_latency
```

- Endpointing latency: time for VAD to decide the user stopped (typically 200-500ms of silence)
- Processing latency: time to finalize the transcript after endpoint detection

**Partial Update Cadence:** How frequently interim hypotheses update during ongoing speech. Matters for live captioning and barge-in detection (detecting the user is interrupting).

Always report **P50, P95, and P99 percentiles**. A system with 200ms P50 but 2000ms P99 will feel terrible 1% of the time.

### 1.5 Standard Benchmark Datasets

Each dataset probes a different axis. A model's score on one says little about another.

| Dataset | Hours | Source | What it tests | Difficulty |
|---------|-------|--------|---------------|------------|
| **LibriSpeech clean** | ~5.4h test | Audiobooks (LibriVox) | Studio-quality read speech | Easy (near-saturated, top models <2% WER) |
| **LibriSpeech other** | ~5.3h test | Audiobooks (noisier subset) | Accented/unclear read speech | Medium |
| **Common Voice** | Varies | Crowd-sourced Wikipedia readings | Accent diversity, variable mic quality | Medium-Hard (100+ languages) |
| **FLEURS** | ~12min/lang | Native speakers reading translations | Cross-lingual comparison (102 languages) | Medium (controlled recording) |
| **VoxPopuli** | ~1,800h labeled | European Parliament recordings | Non-native English accents, formal speech | Medium-Hard |
| **Earnings22** | 119h | Corporate earnings calls | Financial jargon, multi-speaker, phone audio | Hard |
| **GigaSpeech** | 10,000h | Audiobooks + podcasts + YouTube | Multi-domain generalization | Medium-Hard |
| **AMI** | 100h | Recorded meetings, multiple mic types | Overlapping speakers, far-field, crosstalk | Very Hard (especially SDM) |
| **SPGISpeech** | 5,000h | S&P Global earnings transcriptions | Professional transcription style matching | Medium |
| **TED-LIUM** | 452h | TED talks | Prepared speech, diverse topics | Medium |

**Why scores diverge across datasets:** A model optimized on clean read speech (LibriSpeech) will collapse on AMI because it has never seen overlapping speakers through a distant microphone. A model fine-tuned on financial transcripts knows ticker symbols but struggles with casual podcast speech. Each dataset probes: audio quality, speaker diversity, domain vocabulary, recording conditions, and speech style.

### 1.6 The AA-WER Benchmark (Artificial Analysis)

Created because existing benchmarks are stale, have reference transcript errors, and do not target voice agent use cases.

**Composition:**

| Dataset | Weight | Size | Domain |
|---------|--------|------|--------|
| **AA-AgentTalk** (proprietary) | 50% | 469 samples, ~250 min | Voice agent interactions: 6 content categories, 17 accent groups, 8 speaking styles |
| **VoxPopuli-Cleaned-AA** | 25% | 628 samples, ~119 min | European parliamentary speech (non-native accents) |
| **Earnings22-Cleaned-AA** | 25% | 6 samples, ~115 min | Corporate earnings calls |

Key design choices:
- **AA-AgentTalk is proprietary and not public** -- reduces training-set contamination / benchmark leakage
- **Cleaned references** -- VoxPopuli and Earnings22 transcripts were manually corrected to remove human annotator errors
- **Custom normalizer** -- extends OpenAI's Whisper normalizer with digit splitting, leading zero preservation, proper noun variants
- **Time-weighted WER** -- longer samples contribute proportionally more

### 1.7 Why Vendor Benchmarks Lie

**Cherry-picked datasets.** Vendors select datasets where their model excels. LibriSpeech clean (studio audiobooks) produces impressive numbers that collapse on real Zoom calls.

**Training on test data (benchmark leakage).** Public test sets are downloadable. Nothing prevents including LibriSpeech test data in training. This produces artificially perfect scores.

**Normalization games.** A vendor can apply aggressive normalization to their output (expanding contractions, normalizing numbers) while applying minimal normalization to competitors. Normalization differences alone can swing WER by **15+ percentage points**.

**Reporting only averages.** A single mean WER across all test files hides catastrophic tail performance on accented speakers or noisy audio.

**Selective file exclusion.** Omitting files a model performs poorly on, or adding files competitors struggle with.

**The production gap.** Deepgram's own buyer's guide states that production ASR accuracy degrades **7.5x to 16x** from benchmark numbers. Background noise, spontaneous speech, domain terminology, and concurrent load compound into failures that clean benchmarks do not predict.

**Trust hierarchy (most to least trustworthy):**
1. Independent benchmarks with published methodology, cleaned references, and held-out test data (AA-WER)
2. Independent benchmarks on public datasets (HuggingFace Open ASR Leaderboard)
3. Vendor benchmarks on public datasets with published methodology
4. Vendor benchmarks on undisclosed datasets (treat as marketing material)

---

## 2. Head-to-Head Comparison

### Accuracy (WER)

| Model | LibriSpeech Clean | LibriSpeech Other | AA-WER (independent) | Notes |
|-------|-------------------|-------------------|----------------------|-------|
| **Whisper tiny** (39M) | 7.54% | 17.15% | -- | English-only `.en` variant: 5.6% clean |
| **Whisper base** (74M) | 5.01% | 12.85% | -- | |
| **Whisper small** (244M) | 3.43% | 7.63% | -- | |
| **Whisper medium** (769M) | 2.90% | 5.90% | -- | |
| **Whisper large-v3** (1.55B) | ~2.7% | ~4.5% | ~10.6% | 10-20% error reduction over v2 |
| **Whisper turbo** (809M) | ~3.0% | ~5.0% | -- | Comparable to large-v2, 8x faster than large |
| **faster-whisper** | identical | identical | identical | Same weights, CTranslate2 backend |
| **Moonshine v1 Tiny** (27M) | 4.52% | 11.71% | -- | 28% fewer params than Whisper tiny |
| **Moonshine v1 Base** (62M) | 3.23% | 8.18% | -- | 15% fewer params than Whisper base |
| **Moonshine v2 Tiny** (34M) | 4.49% | 12.09% | -- | Streaming encoder |
| **Moonshine v2 Small** (123M) | 2.49% | 6.78% | -- | |
| **Moonshine v2 Medium** (245M) | 2.08% | 5.00% | -- | Beats Whisper large-v3 at 6x fewer params |
| **Deepgram Nova-3** | -- | -- | 12.8% | Vendor claims 5.26% batch, 6.84% streaming |
| **Google Chirp 2** | -- | -- | 9.8% | |
| **Voxtral Mini (3B)** | 1.86% | 4.04% | 3.7% | Open weights, Apache 2.0. LS WER from Voxtral paper Table 3 (self-reported) |
| **Voxtral Small (24B)** | 1.53% | 3.14% | 3.0% | Open weights, Apache 2.0. LS WER from Voxtral paper Table 3 (self-reported) |
| **Voxtral Mini Transcribe V2** | -- | -- | 3.6% | Closed weights |
| **Voxtral Realtime (4B)** | -- | -- | ~3.6-5.6% | Depends on latency setting (2.4s to 240ms) |

**Key finding:** Voxtral leads on independent benchmarks. Moonshine v2 Medium beats Whisper large-v3 on LibriSpeech with 6x fewer parameters. Cloud APIs (Deepgram, Google) score worse on independent benchmarks than their marketing suggests.

### Speed / Latency

| Model | Latency / RTF | Hardware | Notes |
|-------|---------------|----------|-------|
| **Whisper large-v3** | ~10x real-time | A100 GPU | Batch only, no native streaming |
| **Whisper turbo** | ~80x real-time | A100 GPU | 8x faster than large, batch only |
| **faster-whisper large-v2** | 2.3x faster than Whisper (fp16) | RTX 3070 Ti | 8.4x faster with batch=8 |
| **faster-whisper large-v2** | 8.9x faster than Whisper (int8, batch=8) | RTX 3070 Ti | 16s vs 2m23s for same audio |
| **faster-whisper (CPU, int8, batch=8)** | 8.2x faster than Whisper | i7-12700K | 51s vs 6m58s (small model) |
| **Moonshine v2 Tiny** | 50ms per utterance | Apple M3 | 5.8x faster than Whisper Tiny |
| **Moonshine v2 Small** | 148ms per utterance | Apple M3 | 13.1x faster than Whisper Small |
| **Moonshine v2 Medium** | 258ms per utterance | Apple M3 | 43.7x faster than Whisper large-v3 |
| **Moonshine v2 Tiny** | 237ms per utterance | Raspberry Pi 5 | Real-time capable on edge hardware |
| **Deepgram Nova-3** | sub-300ms streaming | Cloud | WebSocket, ~100-200ms chunk size |
| **Google Chirp 2** | ~70 audio sec/sec compute | Cloud | Streaming supported, latency not published |
| **Voxtral Realtime** | 240ms - 2.4s configurable | Cloud / self-hosted (4B) | Accuracy degrades at lower latency |
| **Voxtral Transcribe V2** | ~3x faster than ElevenLabs Scribe | Cloud | Batch only |

**Key finding:** For self-hosted real-time: faster-whisper with VAD is the proven path. Moonshine v2 is the speed king, especially on edge. For cloud streaming: Deepgram has the lowest latency. Voxtral Realtime is the only open-weights streaming model with near-offline accuracy.

### Cost

| Model | Pricing | Notes |
|-------|---------|-------|
| **Whisper (self-hosted)** | Free (MIT license) | Compute cost only: ~$0.003-0.005/min on A100 |
| **Whisper (OpenAI API)** | $0.006/min | whisper-1 endpoint |
| **GPT-4o Mini Transcribe** | $0.003/min | OpenAI's cheapest API option |
| **faster-whisper (self-hosted)** | Free (MIT license) | Same compute as Whisper but uses less GPU |
| **Moonshine (self-hosted)** | Free (MIT license) | Runs on Raspberry Pi -- minimal compute cost |
| **Deepgram Nova-3 (batch)** | $0.0043/min | Pay-as-you-go |
| **Deepgram Nova-3 (streaming)** | $0.0077/min | 79% premium over batch |
| **Google Chirp (standard)** | $0.016/min | All Chirp models same price |
| **Google Chirp (dynamic batch)** | ~$0.004/min | 75% discount, up to 24hr turnaround |
| **Voxtral Transcribe V2 (batch)** | $0.003/min | Among the cheapest cloud options |
| **Voxtral Realtime (streaming)** | $0.006/min | Open weights also available for self-hosting |

**Key finding:** Self-hosted faster-whisper or Moonshine is cheapest at scale. For cloud APIs, Voxtral batch ($0.003/min) and GPT-4o Mini Transcribe ($0.003/min) tie for cheapest. Google is the most expensive at $0.016/min standard rate.

---

## 3. OpenAI Whisper -- The Foundation

### Architecture

Encoder-decoder Transformer trained on 680,000 hours of weakly supervised web audio.

- **Input:** 30-second audio chunks converted to log-Mel spectrogram (80 bins; 128 for large-v3)
- **Encoder:** 2 convolutional layers + sinusoidal positional embeddings + Transformer blocks
- **Decoder:** Standard Transformer decoder with learned positional embeddings
- **Tokenizer:** Byte-pair encoding (GPT-2 style)

| Size | Encoder + Decoder Layers | d_model | Heads | Parameters |
|------|--------------------------|---------|-------|------------|
| tiny | 4 + 4 | 384 | 6 | 39M |
| base | 6 + 6 | 512 | 8 | 74M |
| small | 12 + 12 | 768 | 12 | 244M |
| medium | 24 + 24 | 1024 | 16 | 769M |
| large | 32 + 32 | 1280 | 20 | 1550M |
| turbo | 32 + **4** | 1280 | 20 | 809M |

Turbo's trick: keep the full 32-layer encoder but shrink the decoder to just 4 layers. The encoder does the heavy lifting; the decoder just needs to emit tokens.

### Training Data

- 680K hours from the web (~77 years of continuous audio)
- 117K hours in 96 non-English languages
- 125K hours of X-to-English translation data
- large-v3 adds: 1M hours weakly labeled + 4M hours pseudo-labeled (using large-v2 as teacher)

### The 30-Second Problem

Whisper always processes a fixed 30-second window, padding shorter audio with silence. This is the fundamental bottleneck for real-time use: a 2-second voice command still burns compute for 30 seconds of input. This is what Moonshine and streaming architectures fix.

---

## 4. faster-whisper -- Same Brain, Faster Body

faster-whisper is a reimplementation of Whisper using **CTranslate2**, a C++ inference engine optimized for Transformer models.

### How It Gets Faster

- Optimized CUDA kernels
- Weight quantization (int8, float16)
- Layer fusion (combining sequential operations)
- Batch reordering
- Efficient memory allocation

### Benchmark: large-v2 on RTX 3070 Ti 8GB

| Implementation | Precision | Batch | Time | VRAM |
|----------------|-----------|-------|------|------|
| openai/whisper | fp16 | 1 | 2m23s | 4708 MB |
| faster-whisper | fp16 | 1 | 1m03s | 4525 MB |
| faster-whisper | fp16 | 8 | **17s** | 6090 MB |
| faster-whisper | int8 | 1 | 59s | **2926 MB** |
| faster-whisper | int8 | 8 | **16s** | 4500 MB |

**Result: 8.9x faster with int8 + batching, at 38% less VRAM.**

### CPU Benchmark: small model on i7-12700K

| Implementation | Precision | Batch | Time | RAM |
|----------------|-----------|-------|------|-----|
| openai/whisper | fp32 | 1 | 6m58s | 2335 MB |
| faster-whisper | int8 | 8 | **51s** | 3608 MB |

**8.2x faster on CPU.** This matters for deployments without GPUs.

### Accuracy

Identical to original Whisper -- same model weights, different inference engine. int8 quantization causes <0.5% WER degradation.

---

## 5. Moonshine -- Built for the Edge

### What Makes It Different

Moonshine (by Useful Sensors / moonshine-ai) rethinks the architecture for real-time on-device use:

1. **No 30-second padding.** Processes only actual audio length. This alone is a 5x speedup for short utterances.
2. **Raw waveform input.** No mel spectrogram -- operates directly on 16kHz audio via 3 convolution layers with strides of 64, 3, 2 (384x audio compression vs Whisper's 320x).
3. **RoPE positional embeddings.** Enables variable-length inputs without retraining (Whisper uses fixed absolute/sinusoidal embeddings).
4. **SwiGLU activation** in decoder (same as Llama).

### Moonshine v2: Streaming Architecture

Released February 2026, v2 adds a streaming encoder:

- **Sliding-window self-attention:** Each frame attends to a bounded local neighborhood (16 left, 4 right frames for outer layers). Lookahead is ~80ms.
- **No positional embeddings in encoder:** Translation-invariant ("ergodic"). Position info added via adapter before decoding.
- **Constant time-to-first-token:** v1's full-attention encoder had TTFT growing linearly with utterance length. v2 is constant.

### The Params-vs-Accuracy Story

This is Moonshine's strongest argument:

| Model | Params | Avg WER (8 datasets) |
|-------|--------|---------------------|
| Whisper tiny.en | 37.8M | 12.81% |
| Moonshine v1 Tiny | 27.1M | 12.66% |
| Whisper base.en | 72.6M | 10.32% |
| Moonshine v1 Base | 61.5M | 10.07% |
| Whisper large-v3 | 1550M | ~7.44% |
| **Moonshine v2 Medium** | **245M** | **6.65%** |

Moonshine v2 Medium beats Whisper large-v3 with **6x fewer parameters**.

Their "Flavors of Moonshine" paper showed monolingual Moonshine models (27M params) achieve error rates 48% lower than Whisper Tiny, outperform the 9x-larger Whisper Small, and match the 28x-larger Whisper Medium.

### Limitations

- **Language support:** 8 languages (English, Spanish, Mandarin, Japanese, Korean, Vietnamese, Ukrainian, Arabic) via monolingual models. Whisper covers 99+.
- **No translation.** Whisper has built-in X-to-English translation.
- **No word-level timestamps** in v1.
- **Smaller ecosystem.** Whisper has faster-whisper, whisper.cpp, WhisperX, etc.
- **All benchmarks are self-reported** -- no independent third-party validation yet.

---

## 6. Deepgram Nova-3 -- Production Streaming

### Architecture

Proprietary transformer-based, two components:
1. **Acoustic Transformer** -- encodes audio waveforms
2. **Language Transformer** -- decodes with prompt context

Uses Transformer-XL-style backbone for long-range context. Trained with multi-stage curriculum on synthetic + real-world data.

### Accuracy

- **Vendor-reported:** 5.26% WER batch, 6.84% streaming (2,703 files, 81.69 hours, 9 domains)
- **Independent (Artificial Analysis):** 12.8% WER
- The gap is real and meaningful. Deepgram likely benchmarks on cleaner audio.

### Streaming

- sub-300ms latency (~250ms typical)
- WebSocket connections with 100-200ms audio chunks
- Interim results with speech-final detection
- Built-in speaker diarization

### Features

- 36+ languages
- Multilingual code-switching (10 languages)
- Keyterm prompting (boost domain-specific terms)
- PII redaction
- Nova-3 Medical variant (63.7% WER improvement in healthcare)

### Pricing

- Batch: $0.0043/min
- Streaming: $0.0077/min
- Diarization add-on: $0.0020/min (streaming)
- Billed per second, $200 free credits for new accounts

---

## 7. Google Cloud Speech-to-Text (Chirp)

### Models

- **Chirp** (v1): First large multilingual ASR
- **Chirp 2**: Improved accuracy, word-level timestamps, model adaptation, speech translation
- **Chirp 3** (GA 2025): Diarization, auto language detection, 100+ languages

### Accuracy

Google does not publish official WER numbers. Independent benchmarks:
- Chirp: 11.6% AA-WER
- Chirp 2: 9.8% AA-WER (better than Deepgram Nova-3 at 12.8%, but nearly 4x the price)

### Pricing

- Standard: $0.016/min (all Chirp models)
- Dynamic Batch: ~$0.004/min (75% discount, up to 24hr turnaround)
- Free tier: 60 min/month
- $300 in free GCP credits for new customers

### Latency

Not publicly benchmarked in milliseconds. Chirp 2 processes ~70 audio seconds per second of compute (batch). Generally considered higher latency than Deepgram for real-time.

---

## 8. Mistral Voxtral -- The New Contender

### Architecture

Multimodal encoder-decoder, not a pure audio model:

1. **Audio Encoder:** Frozen Whisper large-v3 encoder (640M params)
2. **Audio-Language Adapter:** 2-layer adapter (~52M params), downsamples audio embeddings by 4x
3. **LLM Decoder:** Mistral Small 3.1 backbone (~22.9B for Voxtral Small)

Voxtral Realtime (4B) uses a **custom causal audio encoder** (not bidirectional Whisper encoder) that processes audio left-to-right, with sliding window attention for unbounded streaming.

### Model Variants

**Generation 1 (July 2025):**
| Model | Params | Weights |
|-------|--------|---------|
| Voxtral Mini 3B | 3B | Open (Apache 2.0) |
| Voxtral Small 24B | 24.3B | Open (Apache 2.0) |

**Generation 2 (February 2026):**
| Model | Params | Weights | Use Case |
|-------|--------|---------|----------|
| Voxtral Mini Transcribe V2 | Undisclosed | **Closed** (API only) | Batch: diarization, timestamps, context biasing |
| Voxtral Mini 4B Realtime | 4B | Open (Apache 2.0) | Streaming: configurable latency/accuracy tradeoff |

### Accuracy vs Latency Tradeoff (Realtime)

- At 2.4s delay: matches batch-quality accuracy
- At 480ms delay: within 1-2% WER of batch
- At 240ms (minimum): accuracy degrades further

### Pricing

- Batch (Transcribe V2): $0.003/min
- Streaming (Realtime): $0.006/min

### Why It Matters

Voxtral Realtime is the **only open-weights streaming STT model achieving near-offline accuracy at sub-500ms latency**. The 4B model is self-hostable at ~9GB GPU RAM.

---

## 9. Decision Matrix for Voice Agents

### If you need: lowest latency streaming
**Deepgram Nova-3** (sub-300ms, battle-tested) or **faster-whisper + VAD** (self-hosted, proven)

### If you need: best accuracy
**Voxtral Small 24B** (3.0% AA-WER, open weights) or **Voxtral Transcribe V2** (3.6% AA-WER, API only)

### If you need: on-device / edge
**Moonshine v2 Tiny** (34M params, 237ms on Raspberry Pi 5, 50ms on M3)

### If you need: cheapest at scale
**faster-whisper (self-hosted)** or **Moonshine (self-hosted)** -- both MIT license, zero per-minute cost

### If you need: most languages
**Whisper large-v3** (99+ languages) or **Google Chirp 3** (100+ languages)

### If you need: open-weights streaming
**Voxtral Realtime 4B** (Apache 2.0, only option in this category with near-offline accuracy)

---

## 10. For Our Voice Agent (Jarvis)

We use **faster-whisper** with the large-v3 model. Why:

- **Proven ecosystem.** Massive community, battle-tested in production.
- **Speed.** 8.9x faster than vanilla Whisper with int8 + batching. Fast enough for real-time with VAD chunking.
- **Accuracy.** Same weights as Whisper large-v3 (~2.7% on LibriSpeech clean).
- **Self-hosted.** No per-minute cost, no vendor lock-in, no data leaving our infrastructure.
- **CPU-capable.** Runs on CPU with int8 quantization -- no GPU required for demo scenarios.

The tradeoff: no native streaming. We solve this with VAD (Voice Activity Detection) to chunk audio into utterances, then transcribe each chunk. This adds latency (~300-500ms per chunk) but keeps the architecture simple.

If we were starting fresh in 2026, **Voxtral Realtime 4B** would be worth evaluating -- it's the first open-weights model that does streaming natively with competitive accuracy. And **Moonshine v2 Medium** is remarkable for matching Whisper large-v3 accuracy at 6x fewer parameters.

---

## Sources

**Whisper:**
- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [Whisper Paper](https://cdn.openai.com/papers/whisper.pdf) -- "Robust Speech Recognition via Large-Scale Weak Supervision"
- [HuggingFace whisper-large-v3-turbo](https://huggingface.co/openai/whisper-large-v3-turbo)
- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)

**faster-whisper:**
- [faster-whisper GitHub](https://github.com/SYSTRAN/faster-whisper) -- benchmark tables
- [Modal: Choosing Whisper Variants](https://modal.com/blog/choosing-whisper-variants)

**Moonshine:**
- [Moonshine GitHub](https://github.com/moonshine-ai/moonshine)
- [Moonshine v1 Paper (arXiv 2410.15608)](https://arxiv.org/abs/2410.15608)
- [Moonshine v2 Paper (arXiv 2602.12241)](https://arxiv.org/abs/2602.12241)
- [Flavors of Moonshine (arXiv 2509.02523)](https://arxiv.org/abs/2509.02523)

**Deepgram:**
- [Introducing Nova-3](https://deepgram.com/learn/introducing-nova-3-speech-to-text-api)
- [Deepgram Pricing](https://deepgram.com/pricing)
- [Deepgram STT Benchmarks](https://deepgram.com/learn/speech-to-text-benchmarks)

**Google Cloud:**
- [Google Cloud STT Pricing](https://cloud.google.com/speech-to-text/pricing)
- [Chirp 2 Docs](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-2)
- [Chirp 3 Docs](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3)

**Voxtral:**
- [Voxtral Transcribe 2 Announcement](https://mistral.ai/news/voxtral-transcribe-2)
- [Voxtral arXiv Paper](https://arxiv.org/html/2507.13264v1)
- [Voxtral Mini 4B Realtime on HuggingFace](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602)
- [Mistral Audio Transcription Docs](https://docs.mistral.ai/capabilities/audio_transcription)

**Independent Benchmarks:**
- [Artificial Analysis STT Leaderboard](https://artificialanalysis.ai/speech-to-text)
- [AA-WER v2.0 Methodology](https://artificialanalysis.ai/articles/aa-wer-v2)
- [Northflank STT Benchmarks 2026](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)

**Evaluation Metrics & Methodology:**
- [Word Error Rate - Wikipedia](https://en.wikipedia.org/wiki/Word_error_rate)
- [Is Word Error Rate Useful? - AssemblyAI](https://www.assemblyai.com/blog/word-error-rate)
- [The Problem with WER - Speechmatics](https://www.speechmatics.com/company/articles-and-news/the-problem-with-word-error-rate-wer)
- [Speed You Can Trust: STT Metrics for Voice Agents - Speechmatics](https://www.speechmatics.com/company/articles-and-news/speed-you-can-trust-the-stt-metrics-that-matter-for-voice-agents)
- [How to Measure Latency in STT - Gladia](https://www.gladia.io/blog/measuring-latency-in-stt)
- [Evaluating Streaming STT for Voice Agents - AssemblyAI](https://www.assemblyai.com/docs/evaluations/voice-agents)
- [Measuring Streaming Latency - Deepgram](https://developers.deepgram.com/docs/measuring-streaming-latency)
- [Lies, Damn Lies, and Benchmarks - Deepgram](https://deepgram.com/learn/lies-damn-lies-and-benchmarks)
- [Open ASR Leaderboard Paper](https://arxiv.org/html/2510.06961v1)
- [HuggingFace Audio Course: ASR Evaluation](https://huggingface.co/learn/audio-course/en/chapter5/evaluation)
