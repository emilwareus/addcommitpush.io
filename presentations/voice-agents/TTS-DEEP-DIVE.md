# Open-Source TTS -- Deep Research Report

Comprehensive survey of open-source text-to-speech models for real-time voice agents (March 2026).

---

## 1. Evaluation Methodology

### Quality Metrics

- **MOS (Mean Opinion Score)**: Human listeners rate naturalness 1-5. Gold standard but expensive.
- **UTMOS**: Neural MOS predictor trained on VoiceMOS Challenge data. Correlates well with human MOS. Used by F5-TTS, Spark-TTS papers. Scale: 1-5, where >4.0 is near-human.
- **CMOS (Comparative MOS)**: A/B preference test. Reports relative quality vs a reference. Used by Sesame CSM.
- **SMOS (Similarity MOS)**: Rates how similar synthesized speech sounds to a target speaker. Scale: 1-5.

### Intelligibility Metrics

- **WER (Word Error Rate)**: Run ASR on synthesized audio and compare to input text. Lower = more intelligible. F5-TTS uses Whisper-large-v3 for this.
- **CER (Character Error Rate)**: Same as WER but character-level. Used for Chinese evaluations.

### Speaker Similarity

- **SIM-o / SECS**: Cosine similarity between speaker embeddings (WavLM, Resemblyzer, SpeechBrain). Higher = better voice cloning.

### Speed Metrics

- **RTF (Real-Time Factor)**: `processing_time / audio_duration`. RTF < 1.0 means faster than real-time. E.g., RTF 0.2 = 5x real-time.
- **TTFA (Time to First Audio)**: Latency before first audio chunk arrives. Critical for streaming.

### Standard Benchmarks

- **LibriSpeech test-clean**: English audiobook recordings. Most common for UTMOS evaluation.
- **Seed-TTS test-en/zh**: Evaluation set from ByteDance. Used by F5-TTS, Spark-TTS, Fish Audio.
- **LJSpeech**: Single-speaker English. Used for StyleTTS 2 / Kokoro lineage.

---

## 2. Model Survey

### Kokoro-82M

- **Architecture**: StyleTTS 2 + iSTFTNet vocoder, 82M parameters
- **License**: Apache 2.0
- **Quality**: No MOS/UTMOS published for Kokoro itself. Based on StyleTTS 2 which achieved MOS 3.87 on LJSpeech OOD (surpassing ground truth 3.70, CMOS +0.28 vs human, p=0.021). #1 open-weights on Artificial Analysis TTS Arena (ELO ~1072). TTS Arena V2: ELO 1497, rank #17, 45% win rate across 3268 votes.
- **Speed**: ~5x real-time on CPU (32-vCPU AMD EPYC), ~96x on A10G GPU
- **Source**: [HuggingFace](https://huggingface.co/hexgrad/Kokoro-82M), [Benchmark Gist](https://gist.github.com/efemaer/23d9a3b949b751dde315192b4dcf0653), [StyleTTS 2 Paper](https://arxiv.org/abs/2306.07691), [Artificial Analysis](https://artificialanalysis.ai/text-to-speech/leaderboard)
- **Why it matters**: Smallest model that competes with much larger ones. StyleTTS 2 architecture is the first to achieve human-level quality on public benchmarks. Runs on CPU for real-time voice agents.

### F5-TTS (336M)

- **Architecture**: DiT (Diffusion Transformer), 22 layers, flow matching
- **License**: CC-BY-NC-4.0
- **Quality**: UTMOS 3.90 (LibriSpeech-PC), WER 2.42% (32 NFE)
- **Speed**: RTF 0.15 (16 NFE) / 0.31 (32 NFE) on RTX 3090
- **Source**: [arXiv 2410.06885](https://arxiv.org/abs/2410.06885), [GitHub](https://github.com/SWivid/F5-TTS)
- **Why it matters**: Most comprehensively benchmarked OSS TTS. Good balance of quality and speed.

### Spark-TTS (0.5B)

- **Architecture**: BiCodec audio tokenizer + Qwen2.5-0.5B LLM
- **License**: Apache 2.0
- **Quality**: UTMOS 4.35 (LibriSpeech test-clean), WER 1.98% (Seed-TTS test-en)
- **Speed**: No RTF published
- **Source**: [arXiv 2503.01710](https://arxiv.org/abs/2503.01710), [GitHub](https://github.com/SparkAudio/Spark-TTS)
- **Why it matters**: Highest published UTMOS score among OSS models (exceeds ground truth 4.08).

### XTTS v2 (~482M)

- **Architecture**: VQ-VAE (13M) + GPT-2 (443M) + HiFi-GAN (26M)
- **License**: CPML (Coqui Public Model License -- restrictive)
- **Quality**: UTMOS 4.007, CMOS +0.41 vs HierSpeech++
- **Speed**: No RTF published
- **Source**: [arXiv 2406.04904](https://arxiv.org/abs/2406.04904), [HuggingFace](https://huggingface.co/coqui/XTTS-v2)
- **Why it matters**: Strong zero-shot voice cloning across 17 languages. But license is restrictive.

### Fish Audio S2 (~4.4B)

- **Architecture**: Audio Tokenizer (446M) + Slow AR (Qwen3-4B) + Fast AR decoder
- **License**: CC-BY-NC-SA-4.0
- **Quality**: WER 0.99% (en) / 0.54% (zh) on Seed-TTS-Eval
- **Speed**: RTF 0.195 on H200 with SGLang, TTFA <100ms
- **Source**: [arXiv 2603.08823](https://arxiv.org/html/2603.08823)
- **Why it matters**: Lowest WER among OSS TTS models. Dual AR architecture for streaming.

### Orpheus (3B)

- **Architecture**: Llama-3B backbone + SNAC audio tokens
- **License**: Apache 2.0
- **Quality**: No published benchmarks
- **Speed**: ~200ms streaming latency
- **Source**: [GitHub](https://github.com/canopyai/Orpheus-TTS), [HuggingFace](https://huggingface.co/canopylabs/orpheus-3b-0.1-ft)
- **Why it matters**: LLM-native TTS with emotion tags. Apache 2.0. Strong community adoption.

### Dia (1.6B)

- **Architecture**: Encoder-decoder transformer with DAC audio codes
- **License**: Apache 2.0
- **Quality**: No published benchmarks
- **Speed**: ~40 tokens/s on A4000 (86 tokens = 1s audio, RTF ~0.47)
- **Source**: [HuggingFace](https://huggingface.co/nari-labs/Dia-1.6B), [GitHub](https://github.com/nari-labs/dia)
- **Why it matters**: Multi-speaker dialogue generation with non-speech sounds (laughs, etc.).

### Piper (~15-20M)

- **Architecture**: VITS, exported to ONNX
- **License**: MIT
- **Quality**: No published benchmarks
- **Speed**: ~5x real-time on CPU (third-party estimate)
- **Source**: [GitHub](https://github.com/rhasspy/piper)
- **Why it matters**: Extremely lightweight, runs on Raspberry Pi. Home assistant focused.

### Bark (~900M)

- **Architecture**: 3 transformer stages (semantic, coarse, fine acoustic)
- **License**: MIT
- **Quality**: No published benchmarks
- **Speed**: ~1x real-time on enterprise GPU
- **Source**: [GitHub](https://github.com/suno-ai/bark)
- **Note**: Largely superseded by newer models. No paper, no benchmarks.

### Parler TTS (0.3-2B)

- **Architecture**: DAC-based with natural language voice descriptions
- **License**: Apache 2.0
- **Quality**: No published quality benchmarks
- **Source**: [arXiv 2402.01912](https://arxiv.org/abs/2402.01912), [GitHub](https://github.com/huggingface/parler-tts)
- **Why it matters**: Describe the voice you want in natural language instead of cloning.

### MeloTTS

- **Architecture**: VITS-based, undisclosed parameter count
- **License**: MIT
- **Quality**: No published benchmarks
- **Speed**: "CPU real-time" per README
- **Source**: [GitHub](https://github.com/myshell-ai/MeloTTS)
- **Why it matters**: MIT license, lightweight, multilingual.

### Sesame CSM (1B open)

- **Architecture**: 1B backbone + 100M decoder (open). Internal: 3B/8B variants.
- **License**: Apache 2.0
- **Quality**: CMOS study published as graphs only (no numeric values). Near-human without context.
- **Source**: [Sesame research](https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice), [HuggingFace](https://huggingface.co/sesame/csm-1b)
- **Why it matters**: "Crossing the uncanny valley" -- internal 8B model reportedly near-human, but benchmarks are only for the unreleased larger model.

---

## 3. Key Observations

### The Benchmark Gap

The most striking finding: **most OSS TTS models publish zero standardized quality benchmarks**. Only F5-TTS, Spark-TTS, and XTTS v2 have published UTMOS scores. Only F5-TTS, Spark-TTS, and Fish Audio have WER numbers.

Models without any published quality metrics: Kokoro-82M, Bark, Piper, Orpheus, Dia, Parler TTS, MeloTTS, OuteTTS.

### Speed vs Quality Trade-off

- **CPU real-time** (RTF ~0.2): Kokoro-82M, Piper, MeloTTS -- small models, lower quality ceiling
- **GPU real-time** (RTF 0.1-0.5): F5-TTS, Dia, Fish Audio S2 -- larger models, higher quality
- **GPU near-real-time** (~1x): Bark, XTTS v2 -- older architectures, less efficient

### Architecture Trends (2025-2026)

1. **LLM-based**: Orpheus (Llama), Spark-TTS (Qwen), Fish Audio S2 (Qwen) -- treat TTS as next-token prediction on audio codes
2. **Flow matching / DiT**: F5-TTS -- diffusion-based, controllable quality via NFE steps
3. **Classic VITS/StyleTTS**: Kokoro, Piper, MeloTTS -- fast, lightweight, battle-tested
4. **Dialogue-native**: Dia, Sesame CSM -- multi-speaker, conversational

### For Voice Agents Specifically

For real-time voice agents, the critical metrics are:

1. **TTFA < 200ms** -- user perceives delay beyond this
2. **RTF < 0.5** -- must generate audio faster than playback
3. **Streaming support** -- chunk-level output, not full-utterance

Best candidates: Kokoro-82M (CPU, tiny, fast), Fish Audio S2 (best WER, streaming), Orpheus (LLM-native streaming).

---

## 4. Sources

- [Kokoro-82M HuggingFace](https://huggingface.co/hexgrad/Kokoro-82M)
- [Kokoro RTF Benchmark](https://gist.github.com/efemaer/23d9a3b949b751dde315192b4dcf0653)
- [F5-TTS Paper](https://arxiv.org/abs/2410.06885)
- [Spark-TTS Paper](https://arxiv.org/abs/2503.01710)
- [XTTS v2 Paper](https://arxiv.org/abs/2406.04904)
- [Fish Audio S2 Report](https://arxiv.org/abs/2603.08823)
- [Fish Speech v1.5 Paper](https://arxiv.org/abs/2411.01156)
- [Artificial Analysis TTS Arena](https://artificialanalysis.ai/text-to-speech/leaderboard)
- [Bark GitHub](https://github.com/suno-ai/bark)
- [Piper GitHub](https://github.com/rhasspy/piper)
- [Orpheus GitHub](https://github.com/canopyai/Orpheus-TTS)
- [Dia HuggingFace](https://huggingface.co/nari-labs/Dia-1.6B)
- [Sesame CSM Research](https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice)
- [Parler TTS Paper](https://arxiv.org/abs/2402.01912)
- [MeloTTS GitHub](https://github.com/myshell-ai/MeloTTS)
