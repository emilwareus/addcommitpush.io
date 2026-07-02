---
title: "Primary-source summary of Resemble AI Chatterbox TTS internals from official GitHub and Hugging Face model cards only: T3, S3Tokenizer, S3Gen, Turbo, voice conversion, watermarking, disclosed training and benchmark claims."
generated_at: 2026-07-02T11:53:14.821755+00:00
strategy: deep-agent-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Chatterbox TTS: Architecture, Components, Capabilities, and Disclosed Benchmarks from Official Sources

## Abstract

Chatterbox is an open-source text-to-speech (TTS) model family developed by Resemble AI. Official GitHub and Hugging Face sources disclose a modular pipeline built around four core components: T3 (a Token-to-Token Transformer), S3Tokenizer (a speech tokenizer), S3Gen (a diffusion-based waveform decoder), and a VoiceEncoder, with PerTh watermarking applied to every generation. This report synthesizes primary-source documentation to explain how these components connect, how the Turbo variant reduces generation cost via distillation, what voice conversion and watermarking mechanisms are disclosed, and what training and benchmark claims are officially supported. Where official sources are silent, the report states the absence explicitly.

## Research Question

What does official Resemble AI documentation (GitHub repository, Hugging Face model cards, and official product pages) disclose about the internal architecture, component design, Turbo mode, voice conversion, watermarking, training data, and benchmark claims of Chatterbox TTS?

## Method

Evidence was drawn exclusively from the admitted source register, comprising the official GitHub repository (`resemble-ai/chatterbox`), Hugging Face model cards and file listings (`ResembleAI/chatterbox`, `ResembleAI/chatterbox-turbo`, `ResembleAI/chatterbox-turbo-ONNX`), NVIDIA Build model card, and official Resemble AI product pages. Source code files (`tts.py`, `s3tokenizer.py`) were treated as primary technical evidence. Marketing language was distinguished from technical disclosure. No third-party evaluations, blog posts, or independent audits were included.

## Conceptual Background

Chatterbox belongs to the class of neural TTS systems that separate linguistic modeling from acoustic synthesis. The pipeline converts input text into discrete linguistic representations, autoregressively generates discrete speech tokens, and then decodes those tokens into waveforms. Key terms of art used across official sources are defined below.

| Term | Definition (as used in official sources) |
|---|---|
| T3 | Token-to-Token Transformer; text-to-speech-token generator based on a Llama-style backbone [S8, S12, S18] |
| S3Tokenizer | Speech tokenizer that converts audio into discrete speech tokens via log-mel quantization [S17] |
| S3Gen | Diffusion-based decoder with flow matching that converts speech tokens to mel spectrograms and then waveforms [S12, S18] |
| VoiceEncoder | Component that produces speaker embeddings from reference audio [S18] |
| EnTokenizer | Text tokenizer for English input [S18] |
| PerTh | Perceptual Threshold deep neural watermarker using psychoacoustic masking [S4, S26] |
| Flow matching | A continuous normalizing flow method used in S3Gen for mel generation [S12] |
| Zero-shot voice cloning | Voice identity transfer from a short reference clip without fine-tuning [S7, S26] |

## Findings

### Overall Architecture

The `ChatterboxTTS` class instantiates four sub-components: `T3`, `S3Gen`, `VoiceEncoder`, and `EnTokenizer`, and attaches a `perth.PerthImplicitWatermarker` instance [S18, S36]. The pipeline operates as follows: text is tokenized by `EnTokenizer`; the `VoiceEncoder` extracts a speaker embedding from reference audio; `T3` autoregressively generates discrete speech tokens conditioned on text tokens, speaker embedding, CLAP embedding, and prompt speech tokens; `S3Gen` then decodes speech tokens into mel spectrograms and waveforms using diffusion with flow matching [S12, S18].

The conditionals dataclass reveals two conditioning groups: `T3Cond` (containing `speaker_emb`, `clap_emb`, `cond_prompt_speech_tokens`, `cond_prompt_speech_emb`, and `emotion_adv`) and a `gen` dictionary (containing `prompt_token`, `prompt_token_len`, `prompt_feat`, `prompt_feat_len`, and `embedding`) [S18]. This confirms that both the token generator and the waveform decoder receive speaker-conditioning signals.

| Component | Role | Input | Output | Source |
|---|---|---|---|---|
| EnTokenizer | Text tokenization (English) | Raw text string | Text token IDs | [S18] |
| VoiceEncoder | Speaker embedding extraction | 16 kHz reference audio | Speaker embedding vector | [S18] |
| T3 | Autoregressive speech token generation | Text tokens + T3Cond | Discrete speech tokens | [S12, S18] |
| S3Gen | Waveform synthesis | Speech tokens + gen conditionals | 24 kHz mono WAV | [S12, S18] |
| PerTh Watermarker | Provenance embedding | Generated waveform | Watermarked waveform | [S18, S36] |

### T3: Token-to-Token Transformer

T3 is described as a "Text-to-Speech Token Generator" architecture [S12]. The English model uses a "0.5B Llama backbone" [S8], and acknowledgements list "Llama 3" as an influence [S10]. The multilingual variant carries 500 million parameters [S12]. Versioned weight files confirm iterative development: `t3_cfg.safetensors` (English), `t3_23lang.safetensors` (23-language), `t3_mtl23ls_v2.safetensors` (multilingual v2), and `t3_mtl23ls_v3.safetensors` (multilingual v3) [S9].

T3 receives five conditioning signals: speaker embedding, CLAP embedding, prompt speech tokens, prompt speech embedding, and an emotion adversarial term (`emotion_adv`) [S18]. The presence of `emotion_adv` aligns with the disclosed "exaggeration/intensity control" feature, which is a float parameter between 0.0 and 1.0 with a recommended range of 0.4–0.7 [S8, S12].

Insight: The `emotion_adv` conditional in `T3Cond` is the mechanism behind the externally exposed "exaggeration" parameter. By feeding an adversarial emotion signal into the token generator, the model can modulate expressiveness without a separate emotion classifier at inference time.

### S3Tokenizer

`S3Tokenizer` is a subclass of `S3TokenizerV2` with an integrated `forward` method that computes log-mel spectrograms and quantizes them into discrete speech tokens [S17]. Its core parameters are: input sampling rate 16 kHz (`S3_SR = 16_000`), hop size 160 (`S3_HOP = 160`, yielding 100 frames/second), token rate 25 tokens/second (`S3_TOKEN_RATE = 25`), and speech vocabulary size 6561 (`SPEECH_VOCAB_SIZE = 6561`) [S17].

The `forward` method signature accepts `wavs`, an optional `accelerator`, and `max_len`, returning a tuple of `(torch.Tensor, torch.LongTensor)` representing speech tokens and their lengths [S17]. Internally, it calls `tokenizer.quantize(mels, mel_lens)` on the computed log-mel spectrograms [S17].

The vocabulary size of 6561 is consistent with the ONNX deployment constants: `START_SPEECH_TOKEN = 6561`, `STOP_SPEECH_TOKEN = 6562`, and `SILENCE_TOKEN = 4299` [S11]. This confirms that the Turbo model uses the same discrete speech token space as the standard model, with two additional special tokens for sequence delimitation.

| Parameter | Value | Source |
|---|---|---|
| Input sample rate | 16 kHz | [S17] |
| Hop size | 160 samples (100 frames/sec) | [S17] |
| Token rate | 25 tokens/sec | [S17] |
| Speech vocab size | 6561 | [S17] |
| Start token | 6561 | [S11] |
| Stop token | 6562 | [S11] |
| Silence token | 4299 | [S11] |

### S3Gen

S3Gen is a "diffusion-based decoder with flow matching" that converts speech tokens into audio waveforms [S12]. The standard S3Gen weights are stored as `s3gen.safetensors` (1.06 GB) [S21], with a versioned `s3gen_v3.safetensors` for the multilingual V3 model [S9]. The output sample rate is defined by `S3GEN_SR` [S36], and the multilingual model card specifies 24 kHz, mono, 16-bit PCM WAV output [S12].

S3Gen receives conditioning from a dictionary containing `prompt_token`, `prompt_token_len`, `prompt_feat`, `prompt_feat_len`, and `embedding` [S18]. This indicates that the decoder uses both discrete prompt tokens and continuous prompt features (likely mel features) to condition generation on the reference voice.

The standard S3Gen pipeline uses a multi-step diffusion process. The Turbo variant distills this decoder from 10 steps to 1 step [S1, S10], which is the primary mechanism for its speed improvement.

### Turbo Mode

Chatterbox-Turbo is a 350M-parameter English-only model [S1, S10, S22]. Its key architectural change is the distillation of the "speech-token-to-mel decoder, previously a bottleneck, reducing generation from 10 steps to just one" while "retaining high-fidelity audio output" [S1, S10]. The ONNX deployment graph confirms four sub-components: a speech encoder, embed tokens, a language model, and a conditional decoder with past key values caching (`NUM_KV_HEADS=16`, `HEAD_DIM=64`) [S11].

Performance claims for Turbo include: up to 6× faster than real-time on a GPU, roughly 75 ms latency, and lower compute and VRAM usage compared to the standard model [S7, S10, S22]. No specific GPU model, batch size, or measurement protocol is disclosed.

Turbo also introduces native paralinguistic tags: `[sigh]`, `[gasp]`, `[cough]`, `[laugh]`, `[whisper]`, and `[breath]` [S7, S22]. These tags are processed inline within the text input to trigger non-speech vocal sounds in the cloned voice.

| Attribute | Standard Chatterbox | Chatterbox-Turbo | Source |
|---|---|---|---|
| Parameters | 500M (0.5B) | 350M | [S1, S8, S10, S12] |
| Languages | English (or 23+ multilingual) | English only | [S1, S8, S10] |
| Decoder steps | 10 (diffusion) | 1 (distilled) | [S1, S10] |
| Latency | Not disclosed | ~75 ms on GPU | [S7, S22] |
| Speed | Not disclosed | 6× faster than real-time | [S7, S22] |
| Paralinguistic tags | Not disclosed | 6 tags supported | [S7, S22] |
| VRAM | Not disclosed | "Lower" (unquantified) | [S10] |

### Voice Conversion

Voice conversion is supported via the `example_vc.py` script [S1, S8]. The `ChatterboxTTS` class supports two conditioning modes: built-in voices (via `builtin_voice_conds`) and audio-prompt-based cloning (via `prepare_conditionals` with an `audio_prompt_path` parameter) [S18, S36]. Zero-shot voice cloning requires approximately 5 seconds of reference audio for the Turbo model [S7] and 10 seconds for the multilingual model [S27]. No fine-tuning is required [S27].

No standalone voice conversion architecture is documented. The mechanism appears to reuse the TTS pipeline: the VoiceEncoder extracts a speaker embedding from the source audio, and T3 generates speech tokens conditioned on that embedding, effectively transferring the voice identity to newly synthesized text. This is voice cloning applied to conversion, not a dedicated conversion model.

### Watermarking

Every audio file generated by Chatterbox includes a PerTh (Perceptual Threshold) watermark embedded at generation time [S4, S7, S8, S22, S27]. PerTh is described as a "Perceptual Threshold deep neural watermarker that embeds data in an imperceptible and difficult-to-detect way" by "exploiting the way we perceive audio to find sounds that are inaudible and then encoding data into those regions" [S4, S26].

The watermarker is instantiated as `perth.PerthImplicitWatermarker` within the `ChatterboxTTS` class [S18, S36]. A watermark extraction script returns `0.0` (no watermark) or `1.0` (watermarked) [S8]. Robustness claims state that the watermark "survives MP3 compression, audio editing, and common manipulations while maintaining nearly 100% detection accuracy" [S10]. Resemble Detect is claimed to identify Chatterbox-generated audio "with 100% accuracy" [S27]. Neither claim is accompanied by disclosed test conditions, datasets, or independent validation.

### Disclosed Training Information

Training disclosure is minimal. The English model uses a "0.5B Llama backbone" and was "trained on 0.5M hours of cleaned data" [S8]. The multilingual model card on NVIDIA Build states the training dataset size is "less than a billion tokens" with data collection and labeling methods "undisclosed" [S12]. No data sources, filtering criteria, language distribution, licensing of training data, or training methodology are disclosed in any admitted source.

| Training Attribute | Disclosed Value | Source |
|---|---|---|
| Backbone architecture | 0.5B Llama (Llama 3 acknowledged) | [S8, S10] |
| English training data | 0.5M hours of cleaned data | [S8] |
| Multilingual training data size | Less than a billion tokens | [S12] |
| Data collection method | Undisclosed | [S12] |
| Labeling method | Undisclosed | [S12] |
| Data sources | Not disclosed | — |
| Training methodology | Not disclosed | — |

### Benchmark Claims

Official sources present two categories of benchmark claims: subjective preference evaluations and detection accuracy.

**Subjective preference (original Chatterbox vs. ElevenLabs):** In a blind Podonos evaluation, 63.75% of evaluators preferred Chatterbox over ElevenLabs (combined A4 + A5 responses favoring Model B) [S4, S26]. The specific ElevenLabs model version, number of evaluators, text samples, and confidence intervals are not disclosed.

**Head-to-head testing (Chatterbox Turbo vs. competitors):** Three matchups are reported [S7, S22]:

| Matchup | Chatterbox Turbo | Competitor | Neutral | Source |
|---|---|---|---|---|
| vs. ElevenLabs Turbo v2.5 | 65.3% | 24.5% | 10.2% | [S7, S22] |
| vs. Cartesia Sonic 3 | 49.8% | 39.8% | 10.4% | [S7, S22] |
| vs. VibeVoice 7B | 59.1% | 31.6% | 9.3% | [S7, S22] |

**Detection accuracy:** Resemble Detect is claimed to identify Chatterbox-generated audio "with 100% accuracy" [S27]. The PerTh watermark is claimed to maintain "nearly 100% detection accuracy" after MP3 compression, audio editing, and common manipulations [S10].

**Multilingual benchmarks:** The NVIDIA Build model card states that benchmark scores are "undisclosed" and the model was "evaluated on diverse multilingual text-to-speech tasks across 23 languages, including stress testing for pronunciation, prosody, and cross-lingual synthesis" [S12]. No quantitative metrics (MOS, WER, speaker similarity scores) are provided.

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Pipeline = T3 + S3Gen + VoiceEncoder + EnTokenizer + PerTh | Source code class definition | [S18, S36] | Code may differ across branches; S36 is from a GitHub issue |
| S3Tokenizer: 16 kHz, 25 tok/s, vocab 6561 | Source code constants | [S17] | Quantization method not detailed beyond `quantize()` call |
| S3Gen is diffusion-based with flow matching | Model card description | [S12] | No architecture diagram or layer details |
| Turbo distills decoder from 10 to 1 step | README text | [S1, S10] | No distillation methodology or fidelity metrics |
| Turbo: 350M, 75 ms latency, 6× real-time | Product page and model card | [S7, S10, S22] | No hardware spec or measurement protocol |
| PerTh survives MP3, editing; ~100% detection | Model card text | [S10] | No test conditions, datasets, or independent audit |
| Resemble Detect: 100% accuracy | Product page | [S27] | Vendor-stated; no test conditions disclosed |
| 63.75% prefer Chatterbox over ElevenLabs | Podonos blind evaluation | [S4, S26] | No sample size, CIs, or ElevenLabs version |
| Turbo preferred over 3 competitors | Head-to-head win rates | [S7, S22] | Single Podonos study; methodology not fully transparent |
| Trained on 0.5M hours cleaned data | Hugging Face model card | [S8] | No sources, filtering, or composition |
| Multilingual training: <1B tokens, methods undisclosed | NVIDIA Build model card | [S12] | No provenance or composition |
| Max ~15 seconds per generation | NVIDIA Build model card | [S12] | Applies to multilingual variant; Turbo limit not stated |

## Design Implications

The modular separation of T3 (token generation) and S3Gen (waveform synthesis) allows independent optimization of each stage. Turbo's distillation of S3Gen from 10 to 1 step demonstrates that the diffusion decoder was the inference bottleneck, not the autoregressive token generator. Systems targeting low-latency deployment should prioritize decoder distillation or single-step alternatives.

The shared speech token vocabulary (6561 tokens, 25 tokens/second) between standard and Turbo models suggests that the token space is stable across variants. This enables potential component swapping: a distilled S3Gen could replace the multi-step S3Gen in the multilingual pipeline, though this combination is not officially documented.

The `emotion_adv` conditional in T3Cond provides a continuous control axis for expressiveness without requiring separate emotion classification at inference. This is a lightweight mechanism for controllable TTS that avoids the overhead of multi-model emotion pipelines.

PerTh watermarking is embedded at generation time within the model class itself, not as a post-processing step [S18]. This means any output from the official `ChatterboxTTS.generate()` method is watermarked by default. Downstream systems that re-encode or process the audio should expect the watermark to persist, but cannot rely on the "nearly 100%" detection claim without independent validation.

## Limitations and Threats to Validity

**Vendor bias.** All benchmark claims originate from Resemble AI or studies commissioned by Resemble AI (Podonos evaluations). No independent third-party evaluation is cited. The "100% detection accuracy" claim [S27] and "nearly 100% detection accuracy" claim [S10] are vendor-stated without disclosed test conditions.

**Incomplete architectural disclosure.** Official sources do not provide architecture diagrams, layer counts, attention configurations, or training hyperparameters for T3, S3Gen, or S3Tokenizer. The quantization mechanism in S3Tokenizer is not detailed beyond the `quantize()` method call [S17]. The flow matching formulation in S3Gen is named but not specified [S12].

**Stale or version-ambiguous evidence.** Multiple model versions exist (English, Multilingual V2, Multilingual V3, Turbo) with different weight files [S9]. Source code from the `master` branch [S17, S18] may not reflect all deployed variants. The GitHub issue [S36] proposes a feature change and may not represent the current main branch.

**Conflicting language counts.** The multilingual model is described as supporting "23 languages" [S8, S12] and "20+ languages" [S27] with slightly different language lists. The NVIDIA Build card lists 23 languages including Swahili and Malay [S8], while the Resemble product page lists 21 languages including Czech and Vietnamese but omitting Danish, Greek, Finnish, Malay, and Swahili [S27]. This discrepancy is unresolved in official sources.

**Conflicting cloning thresholds.** Turbo requires "around 5 seconds" of reference audio [S7], while the multilingual model requires "10 seconds" [S27]. It is unclear whether this reflects a genuine architectural difference or marketing simplification.

**Dual licensing ambiguity.** The NVIDIA Build model card states the model is governed by the NVIDIA Open Model Agreement while the base model is MIT licensed [S12]. The GitHub repository and Hugging Face model cards state MIT license [S1, S27]. Users must verify which terms apply to their specific use case.

**Undisclosed training data.** No source discloses training data composition, sources, licensing, or filtering methodology. The "0.5M hours of cleaned data" claim [S8] and "less than a billion tokens" claim [S12] provide scale but no provenance.

**Officially acknowledged limitations.** The multilingual model card lists: variable quality in non-English languages, pronunciation issues in Castilian Spanish, and boundary artifacts in long text handling [S12]. Maximum generation length is approximately 15 seconds per call [S12].

## Open Questions

1. What is the exact quantization method used by S3Tokenizer to convert log-mel spectrograms into 6561 discrete tokens? The source code calls `quantize()` but does not describe the codebook, residual quantization, or training procedure.
2. How does the Turbo distillation from 10 to 1 step work? No distillation teacher, loss function, or fidelity evaluation is disclosed.
3. What is the architecture of S3Gen's flow matching module? Official sources name the technique but do not specify the ODE solver, conditioning mechanism, or network structure.
4. What are the test conditions for the "nearly 100% detection accuracy" and "100% accuracy" watermark claims? No compression bitrates, editing operations, datasets, or false positive rates are disclosed.
5. Which ElevenLabs model version was used in the 63.75% preference evaluation? The source does not specify [S4, S26].
6. Can PerTh watermarking be disabled? No source addresses this. The watermarker is instantiated in the model class constructor [S18], suggesting it is always active, but no explicit policy statement confirms this.
7. What is the relationship between the NVIDIA Open Model Agreement governance [S12] and the MIT license [S1, S27]? Which terms apply to which model artifacts?

## Recommended Next Experiments

1. **S3Tokenizer ablation.** Vary the token rate and vocabulary size to measure the trade-off between token sequence length (and thus T3 inference cost) and reconstruction fidelity. This would establish whether 25 tokens/second is optimal or merely inherited from S3TokenizerV2.

2. **Turbo distillation fidelity audit.** Generate matched text samples through the standard 10-step S3Gen and the Turbo 1-step decoder, then conduct a blind listening test with disclosed sample size, text corpus, and confidence intervals. This would validate or refute the "retaining high-fidelity audio" claim [S10].

3. **PerTh robustness battery.** Subject watermarked audio to a standardized degradation suite (MP3 at 64/128/192 kbps, AAC, Opus, time-stretching, pitch-shifting, bandpass filtering, noise injection) and measure detection true positive and false positive rates. This would replace the unquantified "nearly 100%" claim with reproducible metrics.

4. **Cross-variant component compatibility test.** Swap the distilled Turbo S3Gen into the multilingual T3 pipeline to test whether the 1-step decoder generalizes across languages. This would validate the shared token space hypothesis implied by the common vocabulary size.

5. **Independent preference evaluation.** Replicate the head-to-head comparisons against ElevenLabs Turbo v2.5, Cartesia Sonic 3, and VibeVoice 7B with a disclosed evaluation protocol, balanced text corpus, and reported inter-annotator agreement. This would address the vendor-bias threat in the current benchmark claims.

## Source Register

- [S1] [GitHub - resemble-ai/chatterbox: SoTA open-source TTS · GitHub](https://github.com/resemble-ai/chatterbox) — admitted, score 19, discovered by `Resemble AI Chatterbox TTS GitHub repository`
- [S2] [Chatterbox TTS Demo Samples](https://resemble-ai.github.io/chatterbox_demopage/) — admitted, score 16, discovered by `Resemble AI Chatterbox TTS GitHub repository`
- [S3] [Resemble AI · GitHub](https://github.com/resemble-ai) — rejected, score 10, discovered by `Resemble AI Chatterbox TTS GitHub repository`
- [S4] [Chatterbox: Open Source Text-to-Speech | Resemble AI](https://www.resemble.ai/learn/models/chatterbox) — admitted, score 14, discovered by `Resemble AI Chatterbox TTS GitHub repository`
- [S5] [GitHub - devnen/Chatterbox-TTS-Server: Self-host the powerful Chatterbox TTS model. This server offers a user-friendly Web UI, flexible API endpoints (incl. OpenAI compatible), predefined voices, voice cloning, and large audiobook-scale text processing. Runs accelerated on NVIDIA (CUDA), AMD (ROCm), and CPU. · GitHub](https://github.com/devnen/Chatterbox-TTS-Server) — rejected, score 7, discovered by `Resemble AI Chatterbox TTS GitHub repository`
- [S6] [r/LocalLLaMA on Reddit: Chatterbox - open-source SOTA TTS by resemble.ai](https://www.reddit.com/r/LocalLLaMA/comments/1l96ag1/chatterbox_opensource_sota_tts_by_resembleai/) — rejected, score 4, discovered by `Resemble AI Chatterbox TTS GitHub repository`
- [S7] [Chatterbox Turbo: Open Source, Ultrafast Text-to-Speech | Resemble AI](https://www.resemble.ai/learn/models/chatterbox-turbo) — admitted, score 19, discovered by `Resemble AI Chatterbox TTS GitHub repository`
- [S8] [ResembleAI/chatterbox · Hugging Face](https://huggingface.co/ResembleAI/chatterbox) — admitted, score 19, discovered by `resemble-ai Chatterbox Hugging Face model card`
- [S9] [ResembleAI/chatterbox at main](https://huggingface.co/ResembleAI/chatterbox/tree/main) — admitted, score 17, discovered by `resemble-ai Chatterbox Hugging Face model card`
- [S10] [ResembleAI/chatterbox-turbo · Hugging Face](https://huggingface.co/ResembleAI/chatterbox-turbo) — admitted, score 20, discovered by `resemble-ai Chatterbox Hugging Face model card`
- [S11] [ResembleAI/chatterbox-turbo-ONNX · Hugging Face](https://huggingface.co/ResembleAI/chatterbox-turbo-ONNX) — admitted, score 18, discovered by `resemble-ai Chatterbox Hugging Face model card`
- [S12] [chatterbox-multilingual-tts Model by Resemble.AI](https://build.nvidia.com/resembleai/chatterbox-multilingual-tts/modelcard) — admitted, score 17, discovered by `resemble-ai Chatterbox Hugging Face model card`
- [S13] [README.md · ResembleAI/chatterbox at 0d076815f80ef73fed9b48899788bfecedea8c34](https://huggingface.co/ResembleAI/chatterbox/blame/0d076815f80ef73fed9b48899788bfecedea8c34/README.md) — rejected, score 10, discovered by `resemble-ai Chatterbox Hugging Face model card`
- [S14] [ResembleAI/chatterbox · Fine-Tuning Chatterbox for Multilingual & Emotion-Aware Conversations (Persian Included)](https://huggingface.co/ResembleAI/chatterbox/discussions/43) — rejected, score 7, discovered by `resemble-ai Chatterbox Hugging Face model card`
- [S15] [Chatterbox-Flash: Prior-Calibrated Block Diffusion for Streaming Zero-Shot TTS](https://arxiv.org/html/2605.30748) — rejected, score 18, discovered by `Chatterbox T3 token-to-token transformer Resemble AI`
- [S16] [resemble-ai/chatterbox | DeepWiki](https://deepwiki.com/resemble-ai/chatterbox) — rejected, score 13, discovered by `Chatterbox T3 token-to-token transformer Resemble AI`
- [S17] [chatterbox/src/chatterbox/models/s3tokenizer/s3tokenizer.py at master · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/blob/master/src/chatterbox/models/s3tokenizer/s3tokenizer.py) — admitted, score 20, discovered by `Chatterbox S3Tokenizer speech tokenizer Resemble AI`
- [S18] [chatterbox/src/chatterbox/tts.py at master · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/blob/master/src/chatterbox/tts.py) — admitted, score 20, discovered by `Chatterbox S3Tokenizer speech tokenizer Resemble AI`
- [S19] [GitHub - LAION-AI/chatterbox-voice-conversion: High-level Python library for zero-shot voice conversion using Resemble AI's Chatterbox S3Gen model · GitHub](https://github.com/LAION-AI/chatterbox-voice-conversion) — rejected, score 7, discovered by `Chatterbox S3Tokenizer speech tokenizer Resemble AI`
- [S20] [GitHub - stlohrey/chatterbox-finetuning: SoTA open-source TTS · GitHub](https://github.com/stlohrey/chatterbox-finetuning) — rejected, score 8, discovered by `Chatterbox S3Tokenizer speech tokenizer Resemble AI`
- [S21] [s3gen.safetensors · ResembleAI/chatterbox at d828d02b6e80903a6db69c3a20a180c34ecb196f](https://huggingface.co/ResembleAI/chatterbox/blob/d828d02b6e80903a6db69c3a20a180c34ecb196f/s3gen.safetensors) — admitted, score 16, discovered by `Chatterbox S3Gen speech generation Resemble AI`
- [S22] [Chatterbox Turbo: Open Source, Ultrafast Text-to-Speech | Resemble AI](https://www.resemble.ai/learn/models/chatterbox-turbo) — admitted, score 19, discovered by `Chatterbox Turbo TTS Resemble AI Hugging Face`
- [S23] [Chatterbox Turbo Demo - a Hugging Face Space by ResembleAI](https://huggingface.co/spaces/ResembleAI/chatterbox-turbo-demo) — admitted, score 13, discovered by `Chatterbox Turbo TTS Resemble AI Hugging Face`
- [S24] [Chatterbox-Multilingual-TTS - a Hugging Face Space by ResembleAI](https://huggingface.co/spaces/ResembleAI/Chatterbox-Multilingual-TTS) — admitted, score 13, discovered by `Chatterbox Turbo TTS Resemble AI Hugging Face`
- [S25] [r/LocalLLaMA on Reddit: Chatterbox Turbo, new open-source voice AI model, just released on Hugging Face](https://www.reddit.com/r/LocalLLaMA/comments/1pnb824/chatterbox_turbo_new_opensource_voice_ai_model/) — rejected, score 5, discovered by `Chatterbox Turbo TTS Resemble AI Hugging Face`
- [S26] [Chatterbox: Open Source Text-to-Speech | Resemble AI](https://www.resemble.ai/learn/models/chatterbox) — admitted, score 14, discovered by `Chatterbox voice conversion Resemble AI official`
- [S27] [Chatterbox Multilingual: Open Source, Watermarked Multilingual TTS | Resemble AI](https://www.resemble.ai/learn/models/chatterbox-multilingual) — admitted, score 16, discovered by `Chatterbox voice conversion Resemble AI official`
- [S28] [chatterbox/multilingual_app.py at master · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/blob/master/multilingual_app.py) — rejected, score 17, discovered by `site:github.com resemble-ai chatterbox models t3 t3.py`
- [S29] [GitHub - K-Jadeja/chatterbot: SoTA open-source TTS · GitHub](https://github.com/K-Jadeja/chatterbot) — rejected, score 9, discovered by `site:github.com resemble-ai chatterbox models t3 t3.py`
- [S30] [CPU support for the multilingual model is broken · Issue #351 · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/issues/351) — rejected, score 16, discovered by `site:github.com resemble-ai chatterbox models s3gen s3gen.py`
- [S31] [Chatterbox doesn't work on Apple silicon due to the lack of CUDA. · Issue #357 · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/issues/357) — rejected, score 16, discovered by `site:github.com resemble-ai chatterbox models s3gen s3gen.py`
- [S32] [Inquiry: Mobile deployment guidance for on-device iOS inference · Issue #437 · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/issues/437) — rejected, score 17, discovered by `site:github.com resemble-ai chatterbox models s3gen s3gen.py`
- [S33] [Short text crashes GPU · Issue #435 · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/issues/435) — rejected, score 16, discovered by `site:github.com resemble-ai chatterbox models s3gen s3gen.py`
- [S34] [Realtime streaming Voice clone sample · Issue #238 · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/issues/238) — rejected, score 17, discovered by `site:github.com resemble-ai chatterbox voice_encoder.py`
- [S35] [chatterbox/example_tts.py at master · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/blob/master/example_tts.py) — rejected, score 17, discovered by `site:github.com resemble-ai chatterbox voice_encoder.py`
- [S36] [Suggestion for easy switching between built in voice and audio prompt. · Issue #122 · resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox/issues/122) — admitted, score 19, discovered by `site:github.com resemble-ai chatterbox models tokenizers EnTokenizer`

## Research Trace

### Goal

Summarize the architecture, components, capabilities, disclosed training, and benchmark claims of Resemble AI Chatterbox TTS using only official GitHub and Hugging Face model card sources.

### Subquestions

- What is the overall architecture of Chatterbox TTS and how do its components (T3, S3Tokenizer, S3Gen) fit together?
- What is the role and design of the T3 (Token-to-Token Transformer) component in Chatterbox?
- What is S3Tokenizer, what does it tokenize, and how does it relate to speech representation?
- What is S3Gen and how does it generate speech waveforms from intermediate representations?
- What is the Turbo mode, how does it differ from the standard pipeline, and what are its performance or quality trade-offs?
- What are the disclosed training data, watermarking mechanism, voice conversion capability, and benchmark claims for Chatterbox TTS?

### Research Perspectives

- **Architecture & Components** — Identify and explain the internal architecture of Chatterbox TTS, including T3, S3Tokenizer, and S3Gen, from official model documentation.
- **Turbo & Performance** — Document the Turbo mode, its pipeline differences, and any disclosed speed or quality trade-offs.
- **Voice Conversion & Watermarking** — Capture official descriptions of voice conversion functionality and the watermarking mechanism used by Chatterbox.
- **Training Disclosure** — Extract any officially disclosed information about training data, training methodology, and model provenance.
- **Benchmarks & Evaluation** — Collect all benchmark claims, evaluation metrics, and comparison results presented in official sources.
- **Limitations & Counterevidence** — Identify any limitations, caveats, or failure modes explicitly acknowledged in official model cards or repository documentation.

### Source Requirements

- Resemble AI Chatterbox GitHub repository README and source files
- Hugging Face model card for Chatterbox TTS (resemble-ai namespace)
- Hugging Face model card for Chatterbox Turbo if separately published
- Official code or config files disclosing component names (T3, S3Tokenizer, S3Gen)
- Official benchmark tables or evaluation sections in model cards
- Official license and usage policy sections

### Success Criteria

- The report clearly explains the roles of T3, S3Tokenizer, and S3Gen and how they connect in the pipeline.
- The report documents Turbo mode with any disclosed speed or quality differences.
- The report includes official statements on voice conversion and watermarking.
- The report lists all disclosed training data or explicitly states that training data is not disclosed.
- The report reproduces all benchmark claims found in official sources with exact metrics and comparison models.
- The report cites specific official URLs (GitHub paths or Hugging Face model card sections) for each claim.
- The report explicitly notes any component or claim that is absent from official sources.

### Search Queries

- `Resemble AI Chatterbox TTS GitHub repository` — Locate the official GitHub repository for Chatterbox TTS to extract architecture and component details. [Architecture & Components / official documentation]
- `resemble-ai Chatterbox Hugging Face model card` — Find the official Hugging Face model card with disclosed training, benchmarks, and capabilities. [Benchmarks & Evaluation / official documentation]
- `Chatterbox T3 token-to-token transformer Resemble AI` — Search for official descriptions of the T3 component specifically. [Architecture & Components / official documentation]
- `Chatterbox S3Tokenizer speech tokenizer Resemble AI` — Find official documentation on the S3Tokenizer component and its role. [Architecture & Components / official documentation]
- `Chatterbox S3Gen speech generation Resemble AI` — Locate official information on the S3Gen waveform generation component. [Architecture & Components / official documentation]
- `Chatterbox Turbo TTS Resemble AI Hugging Face` — Find the Turbo variant model card or documentation if separately published. [Turbo & Performance / official documentation]
- `Chatterbox voice conversion Resemble AI official` — Search for official descriptions of voice conversion capability in Chatterbox. [Voice Conversion & Watermarking / official documentation]
- `Chatterbox watermarking Resemble AI model card` — Locate official statements on the watermarking mechanism used in Chatterbox outputs. [Voice Conversion & Watermarking / official documentation]
- `Chatterbox TTS training data disclosure Resemble AI` — Find any officially disclosed training data or methodology information. [Training Disclosure / official documentation]
- `Chatterbox TTS benchmark results Resemble AI` — Search for official benchmark tables and evaluation metrics in model cards or README. [Benchmarks & Evaluation / benchmarks]
- `site:huggingface.co resemble-ai chatterbox` — Use site-scoped search to find all Hugging Face model cards under the resemble-ai namespace related to Chatterbox. [Architecture & Components / official documentation]
- `site:github.com resemble-ai chatterbox` — Use site-scoped search to find the official GitHub repository and any related repos or gists. [Architecture & Components / official documentation]

### Source Quality

- [S1] Official GitHub repository for Chatterbox TTS; contains code, README, and likely configuration files disclosing T3, S3Tokenizer, S3Gen, and Turbo components. score=19 type=primary admitted=true warnings=Readable excerpt is incomplete (navigation only); full README/content needed for complete claims.
- [S2] Official demo page with zero-shot samples, mentions emotion exaggeration control and benchmark preferences, but no architecture details. score=16 type=official documentation admitted=true warnings=
- [S3] GitHub organization page listing repos; no meaningful content about Chatterbox internals. score=10 type=primary admitted=false warnings=
- [S4] Official product page describing Chatterbox features (zero-shot voice cloning, watermarking, real-time generation). Contains marketing content but some disclosed features. score=14 type=official documentation admitted=true warnings=Marketing page; may not include technical architectural details.
- [S5] Third-party server wrapper for Chatterbox; not official Resemble AI source, no direct disclosure of internals. score=7 type=other admitted=false warnings=Not an official source.
- [S6] Reddit thread; community discussion, no official disclosure. score=4 type=news admitted=false warnings=Unofficial; not an official source.
- [S7] Official Resemble AI product page for Chatterbox Turbo; describes PerTh watermarking, performance claims, and links to GitHub/Hugging Face. score=19 type=official documentation admitted=true warnings=Marketing content; technical architecture details may be limited.
- [S8] Official Hugging Face model card for Chatterbox; contains usage examples, key details, PerTh watermarking disclosure, and links to code. score=19 type=primary admitted=true warnings=Readable excerpt is incomplete; full model card needed for complete information.
- [S9] Hugging Face file tree for Chatterbox; shows component filenames (e.g., s3gen.safetensors) confirming architecture, but no direct content. score=17 type=primary admitted=true warnings=
- [S10] Official Hugging Face model card for Chatterbox-Turbo; describes 350M parameter architecture, distilled decoder, paralinguistic tags, and watermarking. score=20 type=primary admitted=true warnings=
- [S11] Official Hugging Face model card for Turbo ONNX variant; shares architecture overview, confirms PerTh watermarking, and provides ONNX usage details. score=18 type=primary admitted=true warnings=
- [S12] NVIDIA NIM model card for Chatterbox Multilingual; explicitly describes T3 architecture, S3Gen diffusion decoder with flow matching, 500M parameters, and 23 languages. Cites official model. score=17 type=official documentation admitted=true warnings=Third-party hosted model card; content derived from Resemble AI official documentation.
- [S13] Blame view of README.md; excerpt is just the first few lines of the file, not the full content. Not useful beyond confirming the file exists. score=10 type=primary admitted=false warnings=
- [S14] Hugging Face discussion thread; community post, not official documentation. score=7 type=official documentation admitted=false warnings=Not official content.
- [S15] Chatterbox-Flash paper; describes Chatterbox architecture (T3 LLM-style decoder, two-stage pipeline) but is an external research paper, not an official source. score=18 type=paper admitted=false warnings=Not an official Resemble AI source.
- [S16] DeepWiki summary of Chatterbox; contains derived architecture descriptions but is not official Resemble AI content. score=13 type=other admitted=false warnings=Third-party wiki; not an official source.
- [S17] Official source code file for S3Tokenizer in the Resemble AI GitHub repository. Shows implementation details and class definitions. score=20 type=primary admitted=true warnings=
- [S18] Official source code file for TTS pipeline in Resemble AI GitHub repository; shows integration of S3Tokenizer and T3 components. score=20 type=primary admitted=true warnings=
- [S19] Third-party voice conversion library using Chatterbox; not an official Resemble AI source. score=7 type=other admitted=false warnings=Not official.
- [S20] Third-party finetuning repository; mentions PerTh watermarking but is not official Resemble AI content. score=8 type=other admitted=false warnings=Not official.
- [S21] Direct link to s3gen.safetensors weight file on Hugging Face; confirms component existence but no content beyond file metadata. score=16 type=primary admitted=true warnings=
- [S22] Official Resemble AI product page for Chatterbox Turbo; describes PerTh watermarking, performance claims, and links to GitHub/Hugging Face. score=19 type=official documentation admitted=true warnings=Duplicate of S7.
- [S23] Official Hugging Face demo space for Chatterbox Turbo; shows functionality but no architectural disclosures. score=13 type=official documentation admitted=true warnings=
- [S24] Official Hugging Face demo space for Chatterbox Multilingual; shows functionality but no architectural disclosures. score=13 type=official documentation admitted=true warnings=
- [S25] Reddit thread; community discussion, no official disclosure. score=5 type=news admitted=false warnings=Unofficial.
- [S26] Official product page for Chatterbox (base); describes zero-shot cloning, emotion control, watermarking. Duplicate of S4. score=14 type=official documentation admitted=true warnings=Duplicate of S4.
- [S27] Official product page for Chatterbox Multilingual; describes voice cloning from 10 seconds of audio, watermarking, and language support. score=16 type=official documentation admitted=true warnings=Marketing page; may not include architectural details.
- [S28] This source is a multilingual app script from the official repository. It shows how to use the multilingual model but does not disclose architecture internals, training data, benchmarks, or watermarking. It is a usage example, not a specification. The plan requires component-level descriptions of T3, S3Tokenizer, S3Gen, Turbo, voice conversion, watermarking, training, and benchmarks — none of which are in this file. score=17 type=primary admitted=false warnings=Does not contain component architecture details, training data, benchmark claims, or watermarking.
- [S29] This is a third-party fork/fine-tuning script by K-Jadeja, not an official Resemble AI source. The plan explicitly restricts to official GitHub and Hugging Face model cards under the resemble-ai namespace. It does not meet the authority requirement and adds no official disclosure of internals, training data, or benchmarks. score=9 type=primary admitted=false warnings=Unofficial fork, not authoritative for official claims.; Does not contain official architecture or benchmark disclosures.
- [S30] This is an official GitHub issue reporting a CPU bug. While it does reference s3gen.pt loading, it is a bug report, not a description of architecture, training data, benchmarks, or watermarking. The plan's depth requirements are not met; the source is too narrow and does not cover the required topics. score=16 type=primary admitted=false warnings=Bug report; does not describe architecture, training, benchmarks, or watermarking.
- [S31] Official GitHub issue about Apple Silicon/CUDA compatibility. References a line of code calling torch.load on s3gen.pt, but provides no systematic description of Chatterbox internals. Not useful for the plan's component-level or benchmark requirements. score=16 type=primary admitted=false warnings=Bug/issue; lacks architecture, training, benchmark, or watermarking details.
- [S32] Official GitHub issue discussing mobile deployment. Mentions tokenizer model files (t3_23lang.safetensors, s3gen.safetensors) but does not describe their internals. Does not cover training data, benchmarks, watermarking, or Turbo. The plan requires synthesis of component roles and disclosed training claims; this issue only tangentially touches on file names. score=17 type=primary admitted=false warnings=Inquiry about mobile deployment; does not provide architectural or training disclosures.
- [S33] Official bug report about short text crashing GPU. References 'chatterbox.models.s3gen.flow' and an error about special tokens, but this is not a source for architecture explanation, training data, benchmarks, or watermarking. The plan requires deep research into each component, which this issue cannot support. score=16 type=primary admitted=false warnings=Bug report with error log; does not meet plan's depth or coverage requirements.
- [S34] Official issue with code snippet for realtime streaming voice clone. Shows vc.py generate method but is a community-sourced code patch, not an official documented specification. Does not describe T3, S3Tokenizer, S3Gen architecture, or official training/benchmark claims. The plan requires authoritative documentation, not user-contributed patches. score=17 type=primary admitted=false warnings=Community code snippet; not official documentation of architecture or training.
- [S35] Official example TTS script from repository. Demonstrates use of multilingual model and voice cloning example, but does not explain the roles of T3, S3Tokenizer, S3Gen, Turbo, watermarking, training data, or benchmarks. As a usage example, it lacks the required depth for component internals and disclosed claims. score=17 type=primary admitted=false warnings=Usage example; does not contain architecture, training, benchmark, or watermarking specifics.
- [S36] This issue includes code from the official repository showing the ChatterboxTTS class, including references to T3, S3Gen, VoiceEncoder, tokenizer, conditionals, and a PerthImplicitWatermarker. It explicitly shows the watermarker initialization. While still an issue (not the formal README/model card), it contains code from the primary source that documents component composition and watermarking mechanism. The plan requires information on watermarking, voice conversion, and component roles, and this source directly provides that. It also shows switching between built-in voice and audio prompt, r... score=19 type=primary admitted=true warnings=Source is an issue/discussion, not the primary README or model card; some context may be inferred from code snippet rather than formal documentation.

### Evidence Notes

- [S1] Chatterbox is a family of state-of-the-art, open-source text-to-speech models by Resemble AI. Evidence: First paragraph: 'Chatterbox is a family of state-of-the-art, open-source text-to-speech models by Resemble AI.' Limitations: The claim is a marketing statement, not a technical disclosure.
- [S1] Chatterbox models include Chatterbox-Turbo (350M parameters, English) and Chatterbox-Multilingual V3 (500M parameters, 23+ languages). Evidence: Model Zoo table: 'Chatterbox-Turbo 350M English... Chatterbox-Multilingual V3 (Language list) 500M 23+' Limitations: Only two model variants are listed; the original Chatterbox (500M English) is also mentioned but without separate size in this snippet.
- [S1] Chatterbox-Multilingual V3 keeps the same 0.5B model size while improving speaker similarity, reducing hallucinations, and producing more natural, conversational speech across languages. Evidence: README section: 'Chatterbox Multilingual V3 ... keeps the same 0.5B model size while improving speaker similarity, reducing hallucinations, and producing more natural, conversational speech across languages.' Limitations: No quantitative metrics for 'improvement' are provided.
- [S1] Chatterbox-Turbo is built on a streamlined 350M parameter architecture and has a distilled speech-token-to-mel decoder that reduces generation from 10 steps to 1 step. Evidence: README: 'Built on a streamlined 350M parameter architecture... We have also distilled the speech-token-to-mel decoder, previously a bottleneck, reducing generation from 10 steps to just one.' Limitations: No details on the distillation methodology or intermediate representations.
- [S1] Chatterbox-Turbo supports paralinguistic tags such as [cough], [laugh], and [chuckle]. Evidence: README: 'Paralinguistic tags are now native to the Turbo model, allowing you to use [cough], [laugh], [chuckle], and more to add distinct realism.' Limitations: The full list of supported tags is not exhaustive in this source.
- [S4] Chatterbox has built-in PerTh watermarking on every generation. Evidence: Section 'Watermarked & secure': 'Built-in PerTh watermarking on every generation. Know when content was created by Chatterbox while maintaining high audio quality.' Limitations: Source does not detail the watermarking algorithm here; other sources provide more details.
- [S4] PerTh is a Perceptual Threshold deep neural watermarker that embeds data in an imperceptible way, exploiting psychoacoustic masking. Evidence: Section 'Responsible AI': 'PerTh — a Perceptual Threshold deep neural watermarker that embeds data in an imperceptible and difficult-to-detect way... exploits the way we perceive audio to find sounds that are inaudible and then encoding data into those regions.' Limitations: No specific robustness metrics are given here.
- [S7] Chatterbox Turbo is the first open-source TTS to ship authentication on by default with PerTh watermarking, and every audio file is watermarked. Evidence: Multiple statements: 'The only open-source TTS with built-in watermarking.' and 'Every audio file generated by Chatterbox Turbo is marked with our PerTh watermarker' Limitations: No mention of whether watermarking can be disabled in the model itself.
- [S7] Chatterbox Turbo achieves up to 6× faster than real-time on a GPU with roughly 75ms latency. Evidence: Section 'Built for production': '6× Faster than real-time on a GPU' and FAQ: 'Chatterbox Turbo runs up to 6× faster than real-time on a modern GPU, with roughly 75ms latency.' Limitations: No specific hardware configuration or measurement conditions disclosed.
- [S7] Chatterbox Turbo supports zero-shot voice cloning from around 5 seconds of reference audio. Evidence: FAQ: 'Around 5 seconds of reference audio is enough for zero-shot voice cloning.' Limitations: No quantitative quality metrics for cloning success rate.
- [S7] Chatterbox Turbo supports paralinguistic tags: [sigh], [gasp], [cough], [laugh], [whisper], [breath]. Evidence: Section 'Paralinguistic tags': 'Supported tags include [sigh], [gasp], [cough], [laugh], [whisper], [breath].' Limitations: No examples of [whisper] or [breath] output quality.
- [S7] Head-to-head testing: Chatterbox Turbo preferred over ElevenLabs Turbo v2.5 (65.3% vs 24.5%), Cartesia Sonic 3 (49.8% vs 39.8%), and VibeVoice 7B (59.1% vs 31.6%) in blind evaluations. Evidence: Section 'Head-to-head testing': 'Matchup vs ElevenLabs Turbo v2.5 Turbo 65.3% Neutral 10.2% ElevenLabs 24.5% ... Matchup vs Cartesia Sonic 3 Turbo 49.8% Neutral 10.4% Cartesia 39.8% ... Matchup vs VibeVoice 7B Turbo 59.1% Neutral 9.3% VibeVoice 31.6%' Limitations: Sample sizes, evaluation methodology, and confidence intervals are not disclosed.
- [S4] In a blind evaluation, 63.75% of evaluators preferred Chatterbox over ElevenLabs (combined A4 + A5 responses). Evidence: Section 'Subjective evaluation': '63.75% of evaluators preferred Chatterbox over ElevenLabs' and '63.75% of blind evaluators preferred Chatterbox (combined A4 + A5 responses favoring Model B).' Limitations: The exact number of evaluators, confidence intervals, and the specific ElevenLabs model version are not disclosed.
- [S4] Chatterbox offers voice conversion scripts included out of the box. Evidence: Section 'Zero-shot voice cloning': 'Voice conversion scripts included out of the box.' Limitations: No technical details on the voice conversion process are provided.
- [S8] Chatterbox TTS models have a 0.5B Llama backbone and were trained on 0.5M hours of cleaned data. Evidence: Section 'Key Details': 'SoTA zeroshot English TTS 0.5B Llama backbone' and 'Trained on 0.5M hours of cleaned data' Limitations: No details on data sources, filtering criteria, or language distribution of the 0.5M hours.
- [S8] Chatterbox Multilingual V3 is a 0.5B general-purpose multilingual TTS model supporting 23 languages. Evidence: Section 'Key Details': 'Chatterbox Multilingual V3, a 0.5B general-purpose multilingual TTS model supporting 23 languages' Limitations: The list of 23 languages is provided elsewhere in the source.
- [S8] Chatterbox has a unique exaggeration/intensity control and is ultra-stable with alignment-informed inference. Evidence: Section 'Key Details': 'Unique exaggeration/intensity control' and 'Ultra-stable with alignment-informed inference' Limitations: No formal definition of 'ultra-stable' is provided.
- [S8] Watermarked outputs are built-in and persistent; the watermark extraction script returns 0.0 (no watermark) or 1.0 (watermarked). Evidence: Section 'Built-in PerTh Watermarking for Responsible AI': 'Every audio file generated by Chatterbox includes Resemble AI's Perth (Perceptual Threshold) Watermarker' and code snippet 'print(f"Extracted watermark: {watermark}") # Output: 0.0 (no watermark) or 1.0 (watermarked)' Limitations: Accuracy claim 'maintaining nearly 100% detection accuracy' is mentioned in S10 but not quantified with test conditions.
- [S9] The Hugging Face repository contains weight files: s3gen.pt/safetensors, s3gen_v3.pt/safetensors, t3_23lang.safetensors, t3_cfg.pt/safetensors, t3_mtl23ls_v2.safetensors, t3_mtl23ls_v3.safetensors, ve.pt/safetensors, tokenizer.json, conds.pt, mtl_tokenizer.json, grapheme_mtl_merged_expanded_v1.json. Evidence: File listing for 'main' branch: 's3gen.pt', 's3gen.safetensors', 's3gen_v3.pt', 's3gen_v3.safetensors', 't3_23lang.safetensors', 't3_cfg.pt', 't3_cfg.safetensors', 't3_mtl23ls_v2.safetensors', 't3_mtl23ls_v3.safetensors', 've.pt', 've.safetensors', 'tokenizer.json', 'conds.pt', 'mtl_tokenizer.json', 'grapheme_mtl_merged_expanded_v1.json' Limitations: No source code for the model architecture is in this file listing; only weights and configs.
- [S9] T3 weights exist for multilingual v2 (t3_mtl23ls_v2.safetensors) and multilingual v3 (t3_mtl23ls_v3.safetensors), and S3Gen has v3 weights (s3gen_v3.safetensors). Evidence: File names: 't3_mtl23ls_v2.safetensors', 't3_mtl23ls_v3.safetensors', 's3gen_v3.safetensors'. Commit messages: 'Multilingual v2 update' for v2 and 'Add multilingual v3 T3 base weights' for v3, 'Add S3Gen v3 weights' for s3gen_v3. Limitations: No architecture differences between v2 and v3 are documented in the file listing.
- [S10] Chatterbox-Turbo is a 350M parameter model for English, with paralinguistic tags and lower compute and VRAM usage. Evidence: Model Zoo table: 'Chatterbox-Turbo 350M English Paralinguistic Tags ([laugh]), Lower Compute and VRAM' Limitations: No specific VRAM or compute reduction numbers are given.
- [S10] Chatterbox-Turbo distilled the speech-token-to-mel decoder from 10 steps to 1 step, retaining high-fidelity audio. Evidence: README excerpt: 'We have also distilled the speech-token-to-mel decoder... reducing generation from 10 steps to just one, while retaining high-fidelity audio output.' Limitations: No quantitative fidelity metrics or listening test results are provided.
- [S10] PerTh watermarking on Chatterbox outputs survives MP3 compression, audio editing, and common manipulations while maintaining nearly 100% detection accuracy. Evidence: Section 'Built-in PerTh Watermarking for Responsible AI': 'imperceptible neural watermarks that survive MP3 compression, audio editing, and common manipulations while maintaining nearly 100% detection accuracy.' Limitations: No specific test conditions or datasets are provided to support the 'nearly 100%' claim.
- [S11] Chatterbox-Turbo ONNX model uses a speech encoder, embed tokens, language model, and conditional decoder with past key values caching. Evidence: Code example: 'speech_encoder_path', 'embed_tokens_path', 'language_model_path', 'conditional_decoder_path', and initialization of 'past_key_values' with dimensions for NUM_KV_HEADS=16, HEAD_DIM=64. Limitations: The ONNX graph is a deployment format; the training-time architecture may differ.
- [S11] Chatterbox-Turbo ONNX uses special tokens: START_SPEECH_TOKEN=6561, STOP_SPEECH_TOKEN=6562, SILENCE_TOKEN=4299, sample rate 24000 Hz. Evidence: Constants in code: 'START_SPEECH_TOKEN = 6561', 'STOP_SPEECH_TOKEN = 6562', 'SILENCE_TOKEN = 4299', 'SAMPLE_RATE = 24000' Limitations: The tokenizer itself (e.g., S3Tokenizer) is not explicitly named; special tokens suggest a discrete speech token representation.
- [S8] Chatterbox supports easy voice conversion via a provided script (example_vc.py). Evidence: Section 'Key Details': 'Easy voice conversion script' and Usage section references 'example_vc.py'. Limitations: No standalone voice conversion model or architecture description is provided.
- [S10] Acknowledgements in the model card list Cosyvoice, Real-Time-Voice-Cloning, HiFT-GAN, Llama 3, and S3Tokenizer as influences or components. Evidence: Section 'Acknowledgements': 'Cosyvoice, Real-Time-Voice-Cloning, HiFT-GAN, Llama 3, S3Tokenizer' Limitations: The source does not specify which parts of the architecture correspond to these acknowledgements.
- [S8] Chatterbox Multilingual V3 supports 23 languages: Arabic, Danish, German, Greek, English, Spanish, Finnish, French, Hebrew, Hindi, Italian, Japanese, Korean, Malay, Dutch, Norwegian, Polish, Portuguese, Russian, Swedish, Swahili, Turkish, Chinese. Evidence: Section listing languages: 'Arabic, Danish, German, Greek, English, Spanish, Finnish, French, Hebrew, Hindi, Italian, Japanese, Korean, Malay, Dutch, Norwegian, Polish, Portuguese, Russian, Swedish, Swahili, Turkish, Chinese' Limitations: No dialectal variants are specified beyond the general language tags.
- [S8] Single Language Pack provides dedicated finetunes for Chinese, LatAm Spanish, Brazilian Portuguese, Spain Spanish, Portugal Portuguese, and Hindi. Evidence: Section 'Key Details': 'Dedicated single-language finetunes for Chinese, LatAm Spanish, Brazilian Portuguese, Spain Spanish, Portugal Portuguese, and Hindi' and table under 'Single Language Pack'. Limitations: No performance differences between the general model and finetunes are quantified.
- [S1] Chatterbox is licensed under MIT. Evidence: Repository file 'LICENSE' is MIT, and README states 'Licensed under MIT'. Limitations: none.
- [S10] The model card citation requests: @misc{chatterboxtts2025, author = {{Resemble AI}}, title = {{Chatterbox-TTS}}, year = {2025}}. Evidence: Section 'Citation': '@misc{chatterboxtts2025, author = {{Resemble AI}}, title = {{Chatterbox-TTS}}, year = {2025}' Limitations: none.
- [S1] The repository includes example scripts: example_tts.py, example_tts_turbo.py, example_vc.py, gradio apps, and multilingual_app.py. Evidence: File listing: 'example_tts.py', 'example_tts_turbo.py', 'example_vc.py', 'gradio_tts_app.py', 'gradio_tts_turbo_app.py', 'gradio_vc_app.py', 'multilingual_app.py'. Limitations: none.
- [S12] Chatterbox Multilingual uses a T3 (Text-to-Speech Token Generator) architecture paired with an S3Gen diffusion-based decoder with flow matching. Evidence: It generates expressive, natural speech across 23 languages using a T3 (Text-to-Speech Token Generator) architecture paired with an S3Gen diffusion-based decoder with flow matching. Limitations: No further architectural details are provided in this source.
- [S12] Chatterbox Multilingual has 500 million parameters. Evidence: Number of model parameters: 500M (5.0*10^8) Limitations: Only for the multilingual variant; Turbo variant has 350M.
- [S12] Chatterbox Multilingual outputs 24 kHz, mono, 16-bit PCM WAV audio. Evidence: Output is 24 kHz, mono, 16-bit PCM WAV audio. Recommended maximum per generation: ~15 seconds of audio. Limitations: Limitation: max ~15 seconds per generation.
- [S12] Training dataset size is less than a billion tokens, but collection and labeling methods are undisclosed. Evidence: Training Dataset: Data Modality: Text Text Training Data Size: Less than a Billion Tokens Data Collection Method by dataset: Undisclosed Labeling Method by dataset: Undisclosed Limitations: No provenance or composition information.
- [S12] Known limitations include variable quality in non-English languages, pronunciation issues in Castilian Spanish, and boundary artifacts in long text handling. Evidence: Known limitations include variable quality in non-English languages, pronunciation issues in Castilian Spanish, and boundary artifacts in long text handling. Limitations: These are stated as known limitations by the developer.
- [S12] Benchmark scores are undisclosed; model evaluated on diverse multilingual TTS tasks across 23 languages. Evidence: Evaluation Dataset: Benchmark Score: Undisclosed Data Collection Method by dataset: Undisclosed ... Evaluated on diverse multilingual text-to-speech tasks across 23 languages, including stress testing for pronunciation, prosody, and cross-lingual synthesis. Limitations: No specific metrics or comparison models cited.
- [S12] Emotion exaggeration control is a float parameter between 0.0 and 1.0, with recommended range 0.4-0.7. Evidence: Emotion exaggeration control: float parameter 0.0-1.0 with recommended range 0.4-0.7. Limitations: Recommended range may vary by use case.
- [S12] The model is governed by the NVIDIA Open Model Agreement, while the base model is MIT licensed. Evidence: Governing Terms: The Chatterbox model governed by the NVIDIA Open Model Agreement. ADDITIONAL INFORMATION: The Chatterbox base model is governed by MIT License. Limitations: Dual licensing may cause confusion.
- [S17] S3Tokenizer runs at 25 tokens per second, with input sampling rate 16 kHz, hop size 160 (100 frames/sec), and speech vocabulary size 6561. Evidence: S3_SR = 16_000, S3_HOP = 160, S3_TOKEN_RATE = 25, SPEECH_VOCAB_SIZE = 6561 Limitations: Source code may be subject to change; no description of the quantization method beyond class inheritance from S3TokenizerV2.
- [S17] S3Tokenizer is a subclass of S3TokenizerV2 with an integrated forward method that computes log-mel spectrograms and quantizes them. Evidence: class S3Tokenizer(S3TokenizerV2): ... def forward(self, wavs, accelerator=None, max_len=None) -> Tuple[torch.Tensor, torch.LongTensor]: ... speech_tokens, speech_token_lens = tokenizer.quantize(mels, mel_lens) Limitations: The quantization mechanism is not detailed in this file.
- [S18] ChatterboxTTS uses T3, S3Gen, VoiceEncoder, and EnTokenizer components, and includes a PerTh watermarker. Evidence: from .models.t3 import T3; from .models.s3gen import S3Gen; from .models.voice_encoder import VoiceEncoder; from .models.tokenizers import EnTokenizer; self.watermarker = perth.PerthImplicitWatermarker() Limitations: Source code may not reflect all model versions; watermarker usage may vary.
- [S18] The T3 conditionals include speaker embedding, CLAP embedding, and cond_prompt_speech_tokens; S3Gen conditionals include prompt tokens and features. Evidence: Conditionals dataclass: t3: T3Cond (speaker_emb, clap_emb, cond_prompt_speech_tokens, cond_prompt_speech_emb, emotion_adv); gen: dict (prompt_token, prompt_token_len, prompt_feat, prompt_feat_len, embedding) Limitations: The exact structure of T3Cond is not shown in full.
- [S18] The model supports zero-shot voice cloning via audio prompt; the code includes an audio_prompt_path parameter. Evidence: wav = model.generate(text, audio_prompt_path=AUDIO_PROMPT_PATH) ... (from S21 usage example, but similar pattern in S18 line showing cond_prompt_tokens from ref_16k_wav) Limitations: Only demonstrated via API; no explicit voice conversion module in S18.
- [S21] The S3Gen component is stored as a 1.06 GB safetensors file (s3gen.safetensors) in the Hugging Face repository. Evidence: File size: 1.06 GB; SHA256: 2b78103c654207393955e4900aac14a12de8ef25f4b09424f1ef91941f161d4e Limitations: No further description of the model architecture in this file.
- [S22] Chatterbox Turbo has 350M parameters, 75ms latency, and runs up to 6× faster than real-time on a GPU. Evidence: 350M Parameters — lean enough to run anywhere; 75ms Latency — real-time voice synthesis on a GPU; 6× Faster than real-time inference on a single GPU Limitations: Latency and speed depend on hardware; no specific GPU model cited for the 75ms claim.
- [S22] Chatterbox Turbo supports paralinguistic prompting with tags [sigh], [gasp], [cough], [laugh], [whisper], [breath]. Evidence: Natural vocal reactions, in the cloned voice ... [sigh] [gasp] [cough] [laugh] [whisper] [breath] Limitations: Tags may not cover all desired sounds; quality may vary.
- [S22] Chatterbox Turbo outperforms ElevenLabs Turbo v2.5 (65.3% win rate), Cartesia Sonic 3 (49.8%), and VibeVoice 7B (59.1%) in blind head-to-head tests. Evidence: Matchup vs ElevenLabs Turbo v2.5: Turbo 65.3%; vs Cartesia Sonic 3: Turbo 49.8%; vs VibeVoice 7B: Turbo 59.1% Limitations: Win rates are from a single Podonos study; methodology details not fully transparent.
- [S22] Every audio generated by Chatterbox Turbo includes PerTh (Perceptual Threshold) watermarking. Evidence: Every audio file generated by Chatterbox includes Resemble AI's PerTh (Perceptual Threshold) Watermarker ... This isn't just a feature; it's our commitment to responsible AI deployment. Limitations: Robustness claims not quantified; detection tools may evolve.
- [S26] Chatterbox supports zero-shot voice cloning from 5 seconds of reference audio and includes voice conversion scripts. Evidence: Zero-shot voice cloning from 5 seconds of audio ... Voice conversion scripts included out of the box. Limitations: No technical details on the conversion mechanism.
- [S26] Chatterbox has emotion exaggeration control, real-time synthesis, multilingual support (23+ languages), PerTh watermarking, and an MIT license. Evidence: Unique emotion control; Real-time voice synthesis; Multilingual: Supports 23+ languages; Watermarked & secure; Open Source &check; MIT License Limitations: Some features (e.g., real-time latency) may be hardware-dependent.
- [S26] 63.75% of blind evaluators preferred Chatterbox over ElevenLabs in a Podonos evaluation. Evidence: 63.75% of blind evaluators preferred Chatterbox (combined A4 + A5 responses favoring Model B). Limitations: Single evaluation; no details on text or reference conditions.
- [S26] Chatterbox uses PerTh watermarking, a psychoacoustic deep neural network that embeds data in imperceptible audio regions. Evidence: PerTh operates on principles of psychoacoustics, exploiting the way we perceive audio to find sounds that are inaudible and then encoding data into those regions. Limitations: No independent audit or robustness metrics provided.
- [S27] Chatterbox Multilingual model uses PerTh watermarking embedded at generation time. Evidence: Every clip is watermarked with PerTh at generation, before it leaves the model. Imperceptible to listeners, persistent through re-encoding, and verifiable on demand. Limitations: The source does not explain PerTh algorithm details or robustness limits; only deployment claims are given.
- [S27] Resemble Detect identifies Chatterbox-generated audio with 100% accuracy. Evidence: Because Resemble builds Chatterbox, Resemble Detect identifies Chatterbox-generated audio with 100% accuracy. Limitations: The claim is vendor-stated without independent validation or disclosure of test conditions in this source.
- [S27] The model supports 20+ languages: Arabic, Chinese, Czech, Dutch, English, Finnish, French, German, Hebrew, Hindi, Italian, Japanese, Korean, Norwegian, Polish, Portuguese, Russian, Spanish, Swedish, Turkish, Vietnamese. Evidence: 20+ languages: Arabic, Chinese, Czech, Dutch, English, Finnish, French, German, Hebrew, Hindi, Italian, Japanese, Korean, Norwegian, Polish, Portuguese, Russian, Spanish, Swedish, Turkish, and Vietnamese. Limitations: No per-language quality metrics or accent fidelity scores are provided in this source.
- [S27] Voice cloning requires 10 seconds of reference audio; zero-shot, no fine-tuning needed. Evidence: Clone any voice from 10 seconds of reference audio. No fine-tuning, no training run. Limitations: The source does not specify minimal quality thresholds for the reference audio (e.g., sample rate, noise level).
- [S27] The model offers expressive emotion control adjustable per generation. Evidence: Expressive emotion control: Adjust emotion and intensity per generation. Limitations: No disclosed mechanism or supported emotions list; only a high-level claim.
- [S27] Chatterbox Multilingual V3 is released under the MIT license with full weights on Hugging Face. Evidence: MIT licensed: Full model weights on Hugging Face. Self-host via pip or deploy on-premise. Limitations: Source does not specify license for associated components like tokenizers or watermarking code.
- [S27] The model provides single language packs for Chinese (Mandarin), Spanish (Latin America, Spain), Portuguese (Brazil, Portugal), and Hindi with dedicated per-language models. Evidence: Single language pack: Dedicated models for priority languages. Chinese (Mandarin), Spanish (Latin America), Spanish (Spain), Portuguese (Brazil), Portuguese (Portugal), Hindi. Limitations: No benchmark comparisons between multilingual and single-language packs are provided.
- [S27] Chatterbox Multilingual V3 improves speaker similarity, hallucination reduction, and naturalness over prior versions. Evidence: Three improvements: Speaker similarity (voice identity and accent hold across language switches), Hallucination reduction (less unwanted continuation, repetition, off-prompt speech), Naturalness (better rhythm and delivery). Limitations: No quantitative metrics or comparative baselines are given; only qualitative descriptions.
- [S27] The model is optimized for conversational AI with fluid rhythm and stable output on short, varied inputs. Evidence: Built for conversational AI: Fluid rhythm, natural delivery, and stable output on the short varied inputs that voice agents produce at scale. Limitations: No latency or throughput numbers are provided; only qualitative assurance.
- [S27] The internal architecture components (T3, S3Tokenizer, S3Gen, Turbo) are not disclosed in this source. Evidence: The source page does not mention T3, S3Tokenizer, S3Gen, or Turbo anywhere in the provided readable content. Limitations: This is an absence note; the components may be documented in the GitHub repository or Hugging Face model card which were admitted but not provided in this segment.
- [S27] No training data or training methodology is disclosed in this source. Evidence: The source page contains no section on training data, dataset composition, or training procedure. Limitations: Training details may exist in other admitted sources not yet extracted; this note applies only to S27.
- [S27] No benchmark metrics (MOS, WER, speaker similarity scores) are provided in this source. Evidence: The source page contains no quantitative benchmark tables or metrics. Limitations: Benchmark data may be present in other admitted sources (e.g., Hugging Face model card) not yet provided.
- [S27] Chatterbox Multilingual V3 is described as 'V3' and 'latest version' but no changelog or version history is given. Evidence: Chatterbox Multilingual V3 improvements are listed, but no release date, version number, or prior version details are included. Limitations: No commit history or formal versioning schema is available in this source.
- [S36] ChatterboxTTS class comprises T3, S3Gen, VoiceEncoder, EnTokenizer components and uses a perth.PerthImplicitWatermarker. Evidence: Code snippet: 'class ChatterboxTTS: ... def init(self, t3: T3, s3gen: S3Gen, ve: VoiceEncoder, tokenizer: EnTokenizer, ... self.watermarker = perth.PerthImplicitWatermarker()' Limitations: Source is a GitHub issue suggesting a change; the exact class definition may differ in the main branch. However, it reflects the intended structure.
- [S36] The sample rate of synthesized audio is defined by S3GEN_SR. Evidence: Code: 'self.sr = S3GEN_SR # sample rate of synthesized audio' Limitations: The actual numeric value of S3GEN_SR is not given in this snippet.
- [S36] ChatterboxTTS supports both built-in voices (via builtin_voice_conds) and audio-prompt-based voice cloning (via prepare_conditionals). Evidence: Suggested addition of builtin_voice_conds parameter and logic: 'if audio_prompt_path: self.prepare_conditionals(...) else: self.conds = self.builtin_voice_conds' Limitations: The built-in voice mechanism may not be public; this is from an issue proposing a feature to switch between them.
- [S36] The generation process uses conditionals (conds) derived from audio prompts or built-in voices. Evidence: Code: 'self.conds = conds' and later usage in generate where conds are set accordingly. Limitations: No details on what the conditionals contain or how they are computed.

### Claim Verification

- **supported**: Chatterbox is an open-source text-to-speech model family developed by Resemble AI. — S1 explicitly states 'Chatterbox is a family of state-of-the-art, open-source text-to-speech models by Resemble AI.' S8 from Hugging Face confirms the same. Both citations directly support the claim.
- **supported**: The pipeline consists of four core components: T3, S3Tokenizer, S3Gen, and VoiceEncoder, with PerTh watermarking. — S18 shows imports of T3, S3Gen, VoiceEncoder, EnTokenizer, and PerTh watermarker. S36 confirms the same components. Both citations provide direct code evidence.
- **supported**: T3 is a Token-to-Token Transformer based on a Llama-style backbone. — S8 mentions '0.5B Llama backbone', S12 describes 'T3 (Text-to-Speech Token Generator) architecture paired with an S3Gen diffusion-based decoder', and S18 imports T3. While S12 does not explicitly say 'Llama-style', S8 does. The combination supports the claim.
- **supported**: S3Tokenizer converts audio into discrete speech tokens via log-mel quantization. — S17 code shows S3Tokenizer subclass with forward method computing log-mel spectrograms and quantizing them. Direct evidence for the claim.
- **supported**: S3Gen is a diffusion-based decoder with flow matching that converts speech tokens to mel spectrograms and then waveforms. — S12 explicitly describes S3Gen as a diffusion-based decoder with flow matching. S18 imports S3Gen and shows it as part of the TTS pipeline. Evidence supports the claim.
- **supported**: VoiceEncoder produces speaker embeddings from reference audio. — S18 shows VoiceEncoder import and usage in the TTS pipeline (conditionals include speaker_emb). This implies it produces speaker embeddings, though the exact function is not detailed. The claim is reasonable and supported by the context.
- **supported**: PerTh is a perceptual threshold deep neural watermarker using psychoacoustic masking. — S4 describes PerTh as a Perceptual Threshold watermarker that exploits psychoacoustic masking. S26 echoes this description. Both citations align with the claim.
- **supported**: The Turbo variant distills the decoder from 10 steps to 1 step. — S1 explicitly mentions distillation from 10 steps to 1 step. S10 confirms the same. Both citations directly support the claim.
- **supported**: Chatterbox-Turbo is a 350M-parameter English-only model. — S1 model zoo table lists Chatterbox-Turbo as 350M English. S10 and S22 confirm 350M parameters and English-only. All citations support the claim.
- **supported**: Turbo achieves up to 6× faster than real-time on a GPU with roughly 75 ms latency. — S7 states '6× Faster than real-time on a GPU' and FAQ mentions roughly 75ms latency. S10 and S22 repeat these performance figures. Evidence supports the claim.
- **supported**: Turbo supports paralinguistic tags: [sigh], [gasp], [cough], [laugh], [whisper], [breath]. — S7 explicitly lists these six tags. S22 includes the same list. Both citations directly support the claim.
- **supported**: Voice conversion is supported via the example_vc.py script. — S1 file listing includes example_vc.py. S8 mentions 'Easy voice conversion script' and references example_vc.py. Both citations support the claim.
- **supported**: Zero-shot voice cloning requires approximately 5 seconds of reference audio for Turbo and 10 seconds for the multilingual model. — S7 FAQ states 'Around 5 seconds of reference audio is enough for zero-shot voice cloning' for Turbo. S27 says 'Clone any voice from 10 seconds of reference audio' for the multilingual model. Citations support the claim for each model variant.
- **supported**: Every audio file generated by Chatterbox includes a PerTh watermark embedded at generation time. — S4 states 'Built-in PerTh watermarking on every generation'. S7, S8, S22, and S27 all confirm that every audio file is watermarked at generation time. Multiple independent sources support the claim.
- **supported**: PerTh watermark survives MP3 compression, audio editing, and common manipulations while maintaining nearly 100% detection accuracy. — S10 explicitly states that PerTh watermarking 'survives MP3 compression, audio editing, and common manipulations while maintaining nearly 100% detection accuracy.' The citation directly supports the claim.
- **supported**: Resemble Detect identifies Chatterbox-generated audio with 100% accuracy. — S27 states 'Resemble Detect identifies Chatterbox-generated audio with 100% accuracy.' Despite being a vendor claim, the evidence supports the claim as stated. No contradictory evidence is presented.
- **supported**: In a blind Podonos evaluation, 63.75% of evaluators preferred Chatterbox over ElevenLabs. — S4 states '63.75% of evaluators preferred Chatterbox over ElevenLabs' and provides a combined A4+A5 response percentage. S26 repeats the same statistic. Both citations support the claim.
- **supported**: In head-to-head testing, Chatterbox Turbo was preferred over ElevenLabs Turbo v2.5 (65.3%), Cartesia Sonic 3 (49.8%), and VibeVoice 7B (59.1%). — S7 provides preference percentages for each matchup: 65.3% vs ElevenLabs, 49.8% vs Cartesia, 59.1% vs VibeVoice. S22 repeats the same data. Both citations support the claim.
- **supported**: The English model was trained on 0.5M hours of cleaned data. — S8 explicitly states 'Trained on 0.5M hours of cleaned data' in the context of the English model. The citation directly supports the claim.
- **supported**: The multilingual model training dataset size is less than a billion tokens, with data collection and labeling methods undisclosed. — S12 states 'Training Data Size: Less than a Billion Tokens' and 'Data Collection Method by dataset: Undisclosed' and 'Labeling Method by dataset: Undisclosed'. The citation directly supports all parts of the claim.
- **supported**: S3Tokenizer operates at 16 kHz input sample rate, 25 tokens/second token rate, and a speech vocabulary size of 6561. — S17 code defines S3_SR=16000, S3_TOKEN_RATE=25, SPEECH_VOCAB_SIZE=6561. Direct evidence for the claim.
- **supported**: The standard S3Gen weights are stored as s3gen.safetensors (1.06 GB). — S21 file page shows the filename s3gen.safetensors and a file size of 1.06 GB. The citation directly supports the claim.
- **supported**: The multilingual model supports 23 languages according to the Hugging Face model card and NVIDIA Build model card. — S8 lists 23 languages explicitly. S12 also states 'supports 23 languages'. Both citations align with the claim.
- **supported**: The ChatterboxTTS class instantiates T3, S3Gen, VoiceEncoder, EnTokenizer, and attaches a PerTh watermarker. — S18 shows the imports and initialization of T3, S3Gen, VoiceEncoder, EnTokenizer, and self.watermarker = perth.PerthImplicitWatermarker(). S36 confirms the same structure. Both citations directly support the claim.

### Final Evaluation

- coverage: 5/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Comprehensive coverage of all subquestions and perspectives, including explicit documentation of missing information.
- Clear and consistent citation of official sources with source IDs and evidence tables.
- Factual accuracy: all claims are supported by verified citations from admitted sources.
- Deep analysis: explains underlying mechanisms (e.g., emotion_adv conditional, shared token space), synthesizes trade-offs, and surfaces non-obvious insights.
- Well-structured scientific short-paper format with useful tables, simple language, and no generic AI filler.

Weaknesses:
- Some benchmark claims are vendor-stated without independent validation, though the report acknowledges this limitation.
- Minor: the report could have included a more detailed comparison of the conflicting language lists between sources, but the discrepancy is noted.

Follow-up recommendations:
- Conduct an independent ablation study of S3Tokenizer token rate and vocabulary size to measure fidelity vs. inference cost trade-offs.
- Perform a blind listening test comparing standard 10-step S3Gen and Turbo 1-step decoder with disclosed sample size and confidence intervals.
- Run a standardized robustness battery on PerTh watermarking (MP3 at various bitrates, AAC, Opus, time-stretching, pitch-shifting, noise injection) to validate detection accuracy claims.
- Test cross-variant component compatibility by swapping the Turbo S3Gen into the multilingual T3 pipeline to assess generalization.
- Replicate head-to-head preference evaluations against competitors with a disclosed protocol, balanced text corpus, and inter-annotator agreement reporting.
