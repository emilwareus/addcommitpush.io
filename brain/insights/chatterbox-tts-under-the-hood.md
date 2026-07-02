---
type: insight
title: "Chatterbox Is A Speech-Token LLM Wrapped Around A Flow-Matching Decoder"
slug: chatterbox-tts-under-the-hood
created: 2026-07-02
status: working
publish: true
tags:
  - speech synthesis
---

# Chatterbox Is A Speech-Token LLM Wrapped Around A Flow-Matching Decoder

Chatterbox is easiest to understand as a two-stage speech system. The first
stage, `T3`, is a transformer language-model-style token generator that maps
text plus voice conditions into discrete S3 speech tokens. The second stage,
`S3Gen`, is a token-to-waveform decoder: it upsamples those speech tokens into
mel-spectrogram frames using a causal conditional flow-matching model, then
converts the mels into waveform with a HiFT-GAN-style vocoder. This makes
Chatterbox architecturally closer to codec-token TTS systems such as CosyVoice
than to F5-TTS. F5-TTS predicts continuous mel flow directly from padded text;
Chatterbox first lets an autoregressive transformer decide a semantic/acoustic
speech-token sequence, then lets a diffusion/flow decoder render it.

## What The Model Family Contains

The public repository currently exposes several related models behind similar
APIs:

| Model | Public size claim | Languages | Main difference |
| --- | ---: | --- | --- |
| Chatterbox English | 500M | English | Llama-style `T3`, CFG, emotion exaggeration, S3Gen decoder. |
| Chatterbox Multilingual V3 | 500M | 23+ in repo/model card | Multilingual tokenizer, language tags, V3 T3 checkpoint, improved stability claims. |
| Single Language Pack | 500M each | 6 dedicated finetunes | Per-language variants for Chinese, Spanish variants, Portuguese variants, and Hindi. |
| Chatterbox Turbo | 350M | English | GPT2-medium-style `T3`, native paralinguistic tags, mean-flow/distilled S3Gen. |
| Chatterbox VC | S3Gen only | Source audio dependent | Voice conversion path that skips T3 and re-decodes source S3 tokens with a target voice. |

The source code is inference-oriented. It includes model definitions and loss
methods, but not a complete training pipeline, dataset manifest, or full
reproducible recipe. The Hugging Face model card states that the 500M model uses
a 0.5B Llama backbone and was trained on 0.5M hours of cleaned data. Treat that
as a disclosed model-card claim, not as a locally reproducible fact from the
repo.

## The Core Data Flow

The TTS path has four representations:

```text
text
  -> text tokens
  -> S3 speech tokens at 25 tokens/second
  -> 80-bin mel frames at 50 frames/second
  -> 24 kHz waveform
```

The important ratio is built into the implementation:

- S3 tokenizer input sample rate: 16 kHz.
- S3 token rate: 25 Hz.
- S3Gen output sample rate: 24 kHz.
- S3Gen mel extractor: 80 mel bins, 24 kHz, hop size 480, so 50 mel frames/s.
- `token_mel_ratio = 2`: one speech token corresponds to two mel frames.

That ratio is why `S3Gen` can take a generated token sequence of length `T` and
produce an acoustic condition of length roughly `2T`. Voice conversion uses the
same trick: tokenize source speech to S3 tokens, then decode those tokens with a
new target speaker reference.

## Reference Audio Becomes Two Kinds Of Conditioning

Voice cloning in Chatterbox is not one embedding. The reference clip is split
into conditions for both stages.

For `T3`, the reference audio contributes:

- a 256-dimensional voice-encoder speaker embedding;
- reference S3 speech tokens from the prompt audio;
- an `emotion_adv` scalar for original/multilingual models;
- no CLAP embedding in the public code path, even though the dataclass leaves a
  slot for it.

For `S3Gen`, the reference audio contributes:

- `prompt_token`: S3 tokens from the target voice prompt;
- `prompt_feat`: 24 kHz mel frames from the target voice prompt;
- `embedding`: a speaker embedding from the S3Gen/CAMPPlus speaker encoder.

The default reference windows differ by model:

| Path | T3 prompt tokens use | S3Gen prompt features use |
| --- | ---: | ---: |
| English / multilingual | first 6 seconds at 16 kHz | first 10 seconds at 24 kHz |
| Turbo | first 15 seconds at 16 kHz | first 10 seconds at 24 kHz |
| VC | no T3 prompt | first 10 seconds at 24 kHz |

This matters operationally. The generated voice is constrained both by a global
speaker embedding and by local prompt tokens/features. A noisy or mismatched
reference can affect content planning in T3 and timbre rendering in S3Gen.

## Stage 1: T3 Is The Autoregressive Speech-Token Model

`T3` stands for token-to-token. It wraps a Hugging Face transformer backbone but
uses custom input embeddings and output heads:

```text
condition embeddings + text token embeddings + generated speech token embeddings
  -> LlamaModel or GPT2Model backbone
  -> speech-token logits
```

For the 500M English and multilingual models, `T3Config` uses:

| Parameter | Value in repo |
| --- | ---: |
| Backbone config | `Llama_520M` |
| Hidden size | 1024 |
| Layers | 30 |
| Attention heads | 16 |
| KV heads | 16 |
| Text vocabulary | 704 English, 2454 multilingual |
| Speech vocabulary | 8194 total IDs |
| Usable S3 speech tokens | IDs `< 6561` |
| Start/stop speech tokens | 6561 / 6562 |
| Max speech tokens | 4096 |
| Prompt speech token length | 150 for 500M models |
| Learned text/speech position embeddings | enabled |

For Turbo, the code switches `T3` to a GPT2-medium-style config:

| Parameter | Turbo value |
| --- | ---: |
| Backbone config | `GPT2_medium` |
| Layers | 24 |
| Hidden size | 1024 |
| Heads | 16 |
| Text vocabulary | 50276 |
| Speech token dictionary size | 6563 |
| Prompt speech token length | 375 |
| Perceiver resampler | disabled |
| Emotion conditioning | disabled |

The "LLM" part is therefore real, but scoped. T3 is not producing text and it is
not producing waveform. It is a causal transformer that samples one speech token
at a time from a vocabulary learned by S3Tokenizer.

## T3 Conditioning And CFG

For the original and multilingual Llama-backed models, Chatterbox implements
classifier-free guidance in token-logit space. The public `generate` functions
duplicate the text tokens into a batch of two. In `T3.prepare_input_embeds`,
the second row has its text embedding zeroed when `cfg_weight > 0`.

During generation:

```text
conditional_logits   = logits with text condition
unconditional_logits = logits with text embedding zeroed
guided_logits = conditional_logits + cfg_weight * (conditional_logits - unconditional_logits)
```

This means `cfg_weight` is mostly a text-following and pacing knob, not a
speaker-cloning knob. The unconditioned row still receives the same speaker and
prompt conditioning. The README tips line up with that mechanism: lower
`cfg_weight` can help when speech is too fast, and language-transfer accent
issues can be reduced by setting CFG to zero.

Turbo does not support CFG, `min_p`, or emotion exaggeration in the public API.
The Turbo `generate` method logs that those controls are ignored, then uses
top-k/top-p/temperature/repetition penalty over the GPT-style speech-token
generator.

## Text Tokenization Is Part Of The Model

The English tokenizer is simple: spaces become a `[SPACE]` token and the model
uses explicit start/stop tokens around text.

The multilingual tokenizer does more work:

| Language feature | Implementation detail |
| --- | --- |
| Language control | Prepends a token such as `[fr]` or `[zh]`. |
| Unicode normalization | Lowercases and applies NFKD normalization by default. |
| Chinese | Converts Chinese glyphs into Cangjie token sequences when mapping is available. |
| Japanese | Converts kanji phrases to hiragana with `pykakasi`, then NFKD-normalizes. |
| Hebrew | Optionally adds diacritics through `dicta_onnx`. |
| Korean | Decomposes Hangul syllables into Jamo. |
| Russian | Optionally adds stress marks through `russian_text_stresser`. |

Those transforms are not incidental cleanup. They define the text distribution
that the multilingual T3 model expects. A production wrapper that bypasses or
changes them is changing the model's input language.

## Stage 2: S3Gen Converts Tokens To Audio

`S3Gen` is built from three submodules:

| Submodule | Role |
| --- | --- |
| `S3Tokenizer` | Converts 16 kHz reference/source audio into discrete speech tokens at 25 Hz. |
| `S3Token2Mel` | Encodes token embeddings with an upsampling Conformer and decodes 80-bin mels with CFM. |
| `HiFTGenerator` | Converts 80-bin mels into waveform using predicted F0 and an ISTFT/HiFiGAN-style generator. |

The `S3Token2Mel` path is:

```text
speech tokens
  -> embedding table
  -> UpsampleConformerEncoder
       output_size=512, heads=8, linear_units=2048, blocks=6
  -> projection to 80-channel mel condition `mu`
  -> CausalConditionalCFM
  -> generated mels
```

`CausalConditionalCFM` uses a U-Net-like one-dimensional decoder with causal
convolutions and transformer blocks:

| Decoder setting | Value |
| --- | ---: |
| Input channels before concat | 320 |
| Output mel channels | 80 |
| Causal mode | true |
| Main channel width | 256 |
| Down blocks | 1 configured level |
| Transformer blocks per down/up/mid block | 4 |
| Mid blocks | 12 |
| Attention heads | 8 |
| Attention head dim | 64 |
| CFM solver | Euler |
| Time schedule | cosine |
| Training CFG drop rate | 0.2 |
| Inference CFG rate | 0.7 |

During inference, S3Gen concatenates the prompt tokens with generated tokens,
encodes them together, uses prompt mel frames as a fixed prefix condition, then
throws away the generated mel prefix and returns only the new region.

## Flow Matching In S3Gen

The S3Gen flow objective is similar in spirit to E2/F5 but applies one level
later. It does not align text to frames. T3 already generated a speech-token
sequence. S3Gen's job is to map a speech-token-derived condition `mu` plus
speaker/reference conditions to realistic mel frames.

The public loss method shows the conditional flow-matching target:

```text
t = sample_time()
if cosine schedule:
  t = 1 - cos(pi * t / 2)

z = Normal(0, I)
y = (1 - (1 - sigma_min) * t) * z + t * x1
u = x1 - (1 - sigma_min) * z

pred = estimator(y, mask, mu, t, speaker_embedding, prompt_condition)
loss = MSE(pred * mask, u * mask) / normalized_mask_size
```

For non-Turbo inference, S3Gen starts from random noise and runs Euler steps
from 0 to 1. The public default is 10 CFM timesteps. For each step it evaluates
two batches:

```text
conditioned branch:   x, mu, speaker embedding, prompt mel condition
unconditioned branch: x, zeros, zeros, zeros
dxdt = (1 + inference_cfg_rate) * dxdt_cond - inference_cfg_rate * dxdt_uncond
x = x + dt * dxdt
```

For Turbo, `S3Gen(meanflow=True)` loads `s3gen_meanflow.safetensors`.
The README/model card describes this as a distilled speech-token-to-mel decoder
that reduces the old 10-step bottleneck to one step. The public code currently
calls the mean-flow S3Gen with `n_cfm_timesteps=2`, and the mean-flow branch
does not run CFG at inference because the distilled model is treated as already
distilled from guided outputs.

## Full TTS Inference Pseudocode

```text
input:
  text
  optional reference audio path
  generation controls:
    cfg_weight, exaggeration, temperature, top_p, min_p, repetition_penalty

prepare reference:
  ref_24k = load(reference, sample_rate=24000)
  ref_16k = resample(ref_24k, 16000)

  s3gen_ref = first 10 seconds of ref_24k
  t3_ref = first 6 seconds of ref_16k        # 15 seconds for Turbo

  prompt_tokens = S3Tokenizer(t3_ref)
  speaker_emb = VoiceEncoder(ref_16k)
  s3gen_ref_dict = S3Gen.embed_ref(s3gen_ref)

  t3_cond = {
    speaker_emb,
    cond_prompt_speech_tokens: prompt_tokens,
    emotion_adv: exaggeration
  }

tokenize text:
  normalized_text = punc_norm(text)
  text_tokens = tokenizer(normalized_text)
  text_tokens = [SOT] + text_tokens + [EOT]

generate speech tokens:
  if cfg_weight > 0 and model is non-Turbo:
    duplicate text batch
    zero second row's text embeddings inside T3

  speech_tokens = autoregressive_sample(
    transformer=T3,
    condition=t3_cond,
    text_tokens=text_tokens,
    top_p/min_p/temperature/repetition_penalty
  )

  speech_tokens = remove stop/special/OOV tokens

decode waveform:
  mels = S3Gen.flow_inference(
    speech_tokens=speech_tokens,
    ref_dict=s3gen_ref_dict,
    n_cfm_timesteps=10 or mean-flow setting
  )
  wav = HiFTGenerator(mels)
  wav = fade initial frames to reduce prompt spillover
  wav = PerthImplicitWatermarker.apply_watermark(wav)
```

## Voice Conversion Pseudocode

Voice conversion is TTS without text and without T3:

```text
input:
  source_audio
  target_voice_audio

target_ref_dict = S3Gen.embed_ref(first 10 seconds of target_voice_audio)
source_tokens = S3Tokenizer(resample(source_audio, 16000))

wav = S3Gen.inference(
  speech_tokens=source_tokens,
  ref_dict=target_ref_dict
)
wav = Perth watermark
```

This is a clean separation of content and timbre, but only to the extent that
S3 tokens are speaker-independent. In practice, codec/speech tokens can still
carry prosody, rhythm, pronunciation, and some speaker residue. The target
reference conditions then steer the decoder toward the new timbre.

## Training Signals Visible In Code

The repo does not ship full training scripts, but the model classes expose the
main losses.

For T3, `loss()` runs a teacher-forced transformer forward over condition,
text, and speech token embeddings, then computes two cross-entropy losses:

```text
loss_text = CE(text_head(text_latents), text_tokens)
loss_speech = CE(speech_head(speech_latents), speech_tokens)
```

The speech-token loss is the important TTS objective. The text loss likely helps
shape shared hidden states over the text region, but inference only samples from
the speech head.

For S3Gen, `CausalMaskedDiffWithXvec.compute_loss()`:

1. embeds ground-truth speech tokens;
2. upsamples them through the Conformer encoder;
3. projects a speaker embedding;
4. optionally copies an early random prefix of real mels into the condition;
5. trains the conditional flow decoder to predict the vector field toward the
   target mel spectrogram.

The CFM code randomly drops conditioning at `training_cfg_rate = 0.2`, which is
what makes S3Gen's inference-time CFG branch meaningful.

What is not visible in the public repo:

- exact dataset composition beyond the model-card claim of 0.5M cleaned hours;
- tokenizer training procedure;
- T3/S3Gen training schedules;
- objective weighting between `loss_text` and `loss_speech`;
- how emotion/exaggeration labels were constructed;
- exact evaluation prompts and raw listener data for the closed-source
  comparisons.

## Controls And What They Really Affect

| Control | Applies to | Mechanism | Practical effect |
| --- | --- | --- | --- |
| `audio_prompt_path` | T3 and S3Gen | Builds speaker embeddings, prompt speech tokens, prompt mel features. | Voice identity, accent, prosody, and timbre. |
| `cfg_weight` | T3 non-Turbo | Extrapolates text-conditioned speech-token logits away from no-text logits. | More text adherence; can increase speed or rigidity. |
| `exaggeration` | T3 non-Turbo | Linear projection of scalar emotion token into condition prefix. | More expressive/dramatic token planning; often needs lower CFG. |
| `temperature` | T3/Turbo | Softmax scaling before sampling. | Higher variation, higher instability risk. |
| `top_p`, `min_p`, `top_k` | T3/Turbo | Sampling filters over speech-token logits. | Controls token diversity and repetition. |
| `language_id` | Multilingual | Prepended language token plus language-specific normalization. | Determines expected grapheme/phoneme behavior. |
| `n_cfm_timesteps` | S3Gen | Number of flow decoder Euler steps. | Mel quality/latency trade-off; Turbo uses mean-flow. |

The model-card tip that higher exaggeration can speed up speech is plausible
from this architecture: exaggeration affects T3's token planning, not the
vocoder directly. If it causes T3 to emit fewer or denser speech tokens for the
same text, the S3Gen output duration changes because token count determines mel
length.

## Performance Claims And Caveats

Resemble and the repo make several performance claims:

| Claim | Source type | Caveat |
| --- | --- | --- |
| Chatterbox 500M uses a 0.5B Llama backbone and 0.5M hours of cleaned data. | Hugging Face model card. | Dataset recipe and training run are not reproduced in repo. |
| Multilingual V3 improves speaker similarity, hallucination reduction, and naturalness. | Repo/model card/vendor blog. | Useful directionally; public objective benchmark table is limited. |
| Turbo is 350M and lower compute/VRAM. | Repo/model card. | The exact parameter split by T3/S3Gen/VE is not documented. |
| Turbo runs up to 6x faster than real time with roughly 75 ms latency. | Resemble/vendor page and model card. | Hardware, batch size, text length, and measurement protocol are not disclosed. |
| Turbo distills the token-to-mel decoder from 10 steps to one. | Repo/model card/vendor page. | Public code calls mean-flow inference with 2 timesteps. |
| 63.75% of blind evaluators preferred original Chatterbox over ElevenLabs. | Resemble/Podonos subjective evaluation. | Sample size, confidence intervals, and exact ElevenLabs model version are not disclosed. |
| Turbo win rates: 65.3% vs ElevenLabs Turbo v2.5, 49.8% vs Cartesia Sonic 3, 59.1% vs VibeVoice 7B. | Resemble/Podonos pages. | Subjective A/B tests; strong signal for preference, not a mechanistic benchmark. |
| PerTh watermark survives common transformations and is near-100% detectable. | Resemble README/model card/vendor page. | Watermarking is a responsible-AI feature, not a guarantee against adversarial removal. |

The most defensible engineering conclusion is not "Chatterbox beats every
commercial model." It is that Chatterbox packages a modern, inspectable
speech-token TTS stack with permissive licensing, voice cloning, emotional
controls, and watermarking. The model internals are visible enough to reason
about latency and failure modes, but not enough to fully reproduce training.

## Failure Modes To Expect

| Failure mode | Likely mechanism |
| --- | --- |
| Off-prompt continuation or repetition | Autoregressive T3 token generation drifts before EOS. |
| Accent leakage in cross-language cloning | Reference prompt language and target `language_id` disagree; T3/S3Gen preserve prompt accent cues. |
| Too-fast delivery | T3 emits too few speech tokens for the text; high CFG/exaggeration can interact with pacing. |
| Prompt spillover at beginning | S3Gen conditions on prompt mels and generated mels in one sequence; code fades the first frames as an ad hoc mitigation. |
| Long text instability | `max_new_tokens=1000` default and autoregressive sampling make long-form generation accumulate errors. |
| Turbo ignoring controls | Turbo disables CFG/exaggeration/min-p in the API; those knobs are not bugs, they are unsupported for that model. |
| Language-specific text surprises | Optional normalizers may be missing, or text preprocessing may not match training distribution. |

## The Core Insight

Chatterbox's design is a useful decomposition: put linguistic planning,
duration, emotion, and coarse prosody into an autoregressive speech-token model,
then put high-fidelity rendering and voice identity into a conditional
flow-matching decoder. This gives the system two different kinds of control.
T3 decides "what sequence of speech-like units should be spoken"; S3Gen decides
"how should those units sound in this target voice?"

That split explains both the strengths and the costs. Chatterbox can clone
voices from short references, support voice conversion, expose expressive
sampling knobs, and use LLM infrastructure for the token generator. But it also
inherits autoregressive failure modes: repetition, EOS failures, pacing drift,
and latency proportional to token count. Turbo attacks the second-stage
bottleneck by distilling token-to-mel generation, but the architecture remains
a token planner plus acoustic renderer.

For engineers choosing or modifying Chatterbox, the highest-leverage questions
are therefore not only "which checkpoint sounds best?" They are:

- Is my failure in T3 token planning or in S3Gen rendering?
- Is the reference audio hurting the text planner, the acoustic decoder, or both?
- Do I need CFG/exaggeration controls, or should I use Turbo's simpler low-latency path?
- Am I preserving the exact multilingual tokenizer behavior expected by the checkpoint?
- Can I evaluate preference, speaker similarity, intelligibility, and latency separately?

Those questions follow directly from the architecture. Chatterbox is not a
single black-box TTS model; it is a layered speech-token system where each layer
has a different job and a different failure surface.

## Sources

- Resemble AI Chatterbox official repository, inspected at commit `65b1843`,
  https://github.com/resemble-ai/chatterbox.
- ResembleAI/chatterbox Hugging Face model card and API metadata,
  https://huggingface.co/ResembleAI/chatterbox.
- ResembleAI/chatterbox-turbo Hugging Face model card and API metadata,
  https://huggingface.co/ResembleAI/chatterbox-turbo.
- Resemble AI, "Chatterbox Turbo: Open Source, Ultrafast Text-to-Speech",
  https://www.resemble.ai/learn/models/chatterbox-turbo.
- Resemble AI, "Chatterbox Multilingual: Open Source, Watermarked Multilingual
  TTS", https://www.resemble.ai/learn/models/chatterbox-multilingual.
- NVIDIA NIM model card for `chatterbox-multilingual-tts`,
  https://build.nvidia.com/resembleai/chatterbox-multilingual-tts/modelcard.
- Podonos evaluation page for Resemble AI Chatterbox benchmarking,
  https://podonos.com/resembleai/chatterbox.
- Relevant repository files: `src/chatterbox/tts.py`,
  `src/chatterbox/mtl_tts.py`, `src/chatterbox/tts_turbo.py`,
  `src/chatterbox/vc.py`, `src/chatterbox/models/t3/t3.py`,
  `src/chatterbox/models/t3/modules/t3_config.py`,
  `src/chatterbox/models/t3/modules/cond_enc.py`,
  `src/chatterbox/models/s3tokenizer/s3tokenizer.py`,
  `src/chatterbox/models/s3gen/s3gen.py`,
  `src/chatterbox/models/s3gen/flow.py`,
  `src/chatterbox/models/s3gen/flow_matching.py`, and
  `src/chatterbox/models/s3gen/hifigan.py`.
