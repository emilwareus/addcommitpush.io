---
type: insight
title: "F5-TTS Shows That Alignment Can Be Learned as Flow-Matched Speech Infilling"
slug: f5-tts-e2-tts-flow-matching
created: 2026-07-02
status: working
publish: true
tags:
  - speech synthesis
---

# F5-TTS Shows That Alignment Can Be Learned as Flow-Matched Speech Infilling

F5-TTS is best understood as an engineering refinement of E2 TTS, not as a
separate conceptual break. E2 TTS showed that zero-shot text-to-speech can drop
the usual duration model, grapheme-to-phoneme conversion, and phoneme-level
alignment by converting text into a padded character sequence and training a
conditional flow-matching model to infill masked mel-spectrogram spans. F5-TTS
keeps that objective but changes the backbone from an E2-style flat U-Net
Transformer to a DiT-style transformer with ConvNeXt V2 text refinement and an
inference-time flow-step schedule called Sway Sampling. The result is not an
autoregressive LLM for speech. It is a non-autoregressive continuous generative
model whose transformer predicts a vector field over mel frames, conditioned on
reference audio and text.

## Background: What Problem E2 And F5 Remove

Classic high-quality TTS systems usually split the problem into several
specialized models:

| Component | Role | Why it is expensive |
| --- | --- | --- |
| Text normalization / G2P | Convert text into phonemes or normalized units. | Language-specific rules, lexicons, and edge cases. |
| Duration or alignment model | Decide how many acoustic frames each text unit occupies. | Requires forced alignment, monotonic constraints, or learned duration prediction. |
| Acoustic model | Generate acoustic features or codec tokens. | Often depends on the alignment model's errors. |
| Vocoder | Convert acoustic features into waveform samples. | Usually separate but well understood. |

E2 TTS removes the explicit alignment stack. It represents the transcript as a
character sequence and pads it with filler tokens until its length equals the
number of mel frames. This is a crude representation: text characters are sparse
semantic information, while mel frames are dense acoustic time. The surprising
result in E2 is that a sufficiently large flow-matching transformer can learn
the alignment implicitly from speech-infilling examples.

F5-TTS accepts the same premise but argues that E2's direct concatenation of
sparse text and dense acoustic features makes optimization slow and brittle.
The F5 paper attributes E2's failures to deep entanglement between semantic and
acoustic features. F5's main architectural bet is modest: give the text stream a
small ConvNeXt V2 preprocessing space before fusing it with noisy speech and the
masked reference spectrogram.

## The E2/F5 Data Representation

Each training example starts as an audio-transcript pair:

- audio waveform `x_audio`;
- transcript `y = [c_1, c_2, ..., c_M]`;
- mel spectrogram `x_1 in R^{N x F}`, where `N` is the number of frames and `F`
  is the mel feature dimension.

The text sequence is padded to the acoustic frame length:

```text
z = [c_1, c_2, ..., c_M, <F>, <F>, ..., <F>]   length(z) = N
```

The filler token is not a duration label. It is a way to put text and speech on
a common sequence axis so the transformer can attend over equal-length arrays.
During inference, the sequence is formed from:

```text
z_ref_gen = [reference transcript, target text, filler tokens]
```

and the acoustic condition is:

```text
[reference mel frames, zeros for the region to generate]
```

The model's job is to generate the missing target mel frames while preserving
speaker, timbre, and style information from the reference audio.

## Flow Matching In Plain Terms

Diffusion-style models learn to generate data by moving from noise to a sample.
Conditional flow matching expresses this as a continuous vector field. Instead
of predicting the next token, the model predicts "which direction should this
noisy mel spectrogram move at time `t` so that it becomes real speech by
`t = 1`?"

F5's implementation uses the optimal-transport conditional path:

```text
x_t = (1 - t) * x_0 + t * x_1
u_t = x_1 - x_0
```

where:

- `x_0` is Gaussian noise with the same shape as the mel spectrogram;
- `x_1` is the real mel spectrogram;
- `t ~ Uniform(0, 1)`;
- `u_t` is the target flow vector;
- the transformer predicts `v_theta(x_t, condition, text, t)`.

The loss is a masked mean-squared error:

```text
L = MSE(v_theta(x_t, condition, text, t), x_1 - x_0)
```

but only over the randomly masked span. This matters: the model is not asked to
reconstruct the whole utterance uniformly. It is trained as a speech-infilling
model: "given the unmasked acoustic context and the full text, fill the missing
audio."

The public F5-TTS implementation mirrors this directly in
`src/f5_tts/model/cfm.py`: it samples `x0 = torch.randn_like(x1)`, samples a
random time, builds `phi = (1 - t) * x0 + t * x1`, sets the target `flow = x1 -
x0`, zeros the random span in the condition, and computes MSE only on the
masked span.

## Training Algorithm

F5 and E2 share the same high-level training loop.

```text
input:
  dataset D of (waveform, transcript) pairs
  mel extractor M
  tokenizer T
  transformer vector-field model v_theta
  mask fraction range [0.7, 1.0]
  audio-condition dropout p_audio
  full-condition dropout p_uncond

for each minibatch:
  x1 = M(waveform)                         # real mel, shape [B, N, F]
  z = pad(T(transcript), length=N, token=<F>)

  valid_mask = frames_before_padding(x1)
  span_mask = random_contiguous_span(valid_mask, fraction in [0.7, 1.0])

  x0 = normal_like(x1)
  t = uniform(0, 1)
  xt = (1 - t) * x0 + t * x1
  target_flow = x1 - x0

  cond_audio = x1 with span_mask set to zero

  if Bernoulli(p_audio):
    cond_audio = zeros_like(cond_audio)

  if Bernoulli(p_uncond):
    cond_audio = zeros_like(cond_audio)
    z = filler-or-zero text condition

  pred_flow = v_theta(xt, cond_audio, z, t)
  loss = mean_square(pred_flow - target_flow over span_mask)
  update theta

termination:
  stop after scheduled updates or epochs; inference uses EMA weights in F5.
```

The production-relevant invariants are:

- the predicted tensor shape must match the mel tensor shape;
- the text sequence is truncated or padded to the target acoustic length;
- the training mask must exclude padding frames;
- the loss is only valid on the masked span;
- classifier-free guidance only works because the model sees dropped-condition
  examples during training.

## Inference Algorithm

At inference time the system takes a short reference audio clip, its transcript,
and target text. The public API can transcribe the reference audio with Whisper
if no reference text is provided, but the model itself still conditions on text.

```text
input:
  reference waveform x_ref
  reference transcript y_ref
  target text y_gen
  duration N_total
  number of function evaluations K
  CFG strength alpha
  Sway coefficient s

prepare:
  ref_mel = M(x_ref)
  z = pad(T(y_ref + y_gen), length=N_total, token=<F>)
  cond = [ref_mel, zeros for generated duration]
  cond_mask = true on reference frames, false on generation frames
  y0 = Gaussian noise [N_total, F]

sample timesteps:
  u_i = i / K for i = 0..K
  t_i = u_i + s * (cos(pi * u_i / 2) - 1 + u_i)

integrate ODE:
  for t_i from 0 to 1:
    pred_cond = v_theta(y, cond, z, t_i)
    pred_uncond = v_theta(y, zeros, dropped_text, t_i)
    dy_dt = pred_cond + alpha * (pred_cond - pred_uncond)
    y = ODE_step(y, dy_dt)

restore:
  y[reference frames] = ref_mel
  generated_mel = y[target frames]
  waveform = vocoder(generated_mel)
```

The F5 code defaults to 32 NFE, CFG strength `2.0`, Sway Sampling coefficient
`-1`, Euler integration for the current F5 API, and Vocos mel decoding unless a
BigVGAN path is chosen. Duration is not predicted by a learned duration model in
the default inference script. It is estimated from the ratio between reference
audio length, reference text length, target text length, and requested speed,
unless `fix_duration` is supplied.

## Architecture: Transformer, But Not An LLM

The phrase "LLM architecture" is misleading here. F5-TTS uses transformer
building blocks, but it is not a language model in the autoregressive
next-token sense:

| Property | Autoregressive LLM | F5-TTS |
| --- | --- | --- |
| Output | Discrete text tokens. | Continuous mel-spectrogram flow vectors. |
| Generation order | Left-to-right token sampling. | Non-autoregressive ODE integration over all frames. |
| Training target | Next-token cross entropy. | Masked flow-vector MSE. |
| Time axis | Token positions. | Mel frame positions plus flow time `t`. |
| Conditioning | Prompt tokens / context window. | Noisy mel, masked reference mel, padded text, flow step. |

F5's base model configuration is DiT-like:

| Component | F5-TTS base setting |
| --- | --- |
| Backbone | Diffusion Transformer (`DiT`) |
| Transformer depth | 22 layers |
| Hidden dimension | 1024 |
| Attention heads | 16 |
| FFN multiplier | 2 |
| Text dimension | 512 |
| Text preprocessing | 4 ConvNeXt V2 blocks |
| Mel representation | 100-bin log mel, 24 kHz audio, hop length 256 |
| Vocoder | Vocos by default; BigVGAN supported |
| Public v1 checkpoint | `F5TTS_v1_Base`, safetensors via Hugging Face |

The backbone pipeline is:

```text
text tokens -> embedding -> sinusoidal position -> ConvNeXt V2 text blocks
noisy mel + masked mel + refined text -> linear projection
projected sequence + convolutional position embedding
DiT blocks with RoPE attention and time-conditioned AdaLN
final AdaLN + linear projection -> predicted mel flow
```

The architectural difference from E2 is not that F5 adds a giant text encoder.
It does the opposite: it keeps the system small enough to remain "text in,
speech out", but inserts just enough local temporal modeling for text before
joint speech-text attention. E2's reproduction in the repo uses `UNetT`, a flat
U-Net-style transformer with skip connections. F5 removes that long U-Net
structure and uses DiT blocks with adaptive layer normalization conditioned by
the flow step.

## What Sway Sampling Changes

Uniform ODE timesteps spend equal resolution across the whole noise-to-data
path. F5 argues that early flow steps are especially important for deciding the
coarse speech plan: content, alignment, and speaker-conditioned trajectory.
Sway Sampling reshapes uniformly spaced values `u` into timesteps:

```text
t = u + s * (cos(pi * u / 2) - 1 + u)
```

with `s < 0` shifting more function evaluations toward smaller `t`. This is an
inference-time change. It does not require retraining because it only changes
where the ODE solver evaluates the learned vector field.

In the F5 paper's ablation, Sway Sampling improves both F5 and E2. On
LibriSpeech-PC test-clean, F5-TTS with 32 NFE improves from 2.84 WER without
Sway Sampling to 2.41 WER with it in the Table 5 midpoint-solver ablation. The
same table reports E2 improving from 2.95 WER to 2.84 WER at 32 NFE with Sway
Sampling. The improvement is larger for F5 because its architecture is already
more robust to text-audio alignment.

## Performance Claims And How To Read Them

E2 TTS reports unusually strong zero-shot English results on LibriSpeech-PC
test-clean:

| System | Data | WER (%) lower is better | SIM-o higher is better |
| --- | ---: | ---: | ---: |
| Ground truth | - | 2.0 | 0.695 |
| VALL-E | 60K h English | 4.9 | 0.500 |
| NaturalSpeech 3 | 60K h English | 2.6 | 0.632 |
| Voicebox reproduction | 50K h English | 2.2 | 0.667 |
| E2 TTS | 50K h English | 2.0 | 0.675 |
| E2 TTS + unsupervised pretraining | 50K h English | 1.9 | 0.708 |
| E2 TTS | 200K h proprietary | 1.9 | 0.707 |

The most important caveat is that E2's headline results are English and partly
depend on very large training data or pretraining. The F5 paper's reproduction
finds E2 strong in speaker similarity but less robust in multilingual
zero-shot settings, especially Mandarin, where the paper reports persistent
failure cases with WER over 50% for a subset of samples during training.

F5's main table reports these LibriSpeech-PC results on a released 1,127-sample
4-to-10-second subset:

| System | Training data | WER (%) | SIM-o | RTF |
| --- | ---: | ---: | ---: | ---: |
| Ground truth | - | 2.23 | 0.69 | - |
| Vocoder resynthesis | - | 2.32 | 0.66 | - |
| CosyVoice | 170K h multilingual | 3.59 | 0.66 | 0.92 |
| FireRedTTS | 248K h multilingual | 2.69 | 0.47 | 0.84 |
| E2 TTS reproduction, 32 NFE | 100K h multilingual | 2.95 | 0.69 | 0.68 |
| F5-TTS, 16 NFE | 100K h multilingual | 2.53 | 0.66 | 0.15 |
| F5-TTS, 32 NFE | 100K h multilingual | 2.42 | 0.66 | 0.31 |

This table should not be read as "F5 dominates every model on every metric."
The published baseline rows combine different model sizes, datasets, languages,
and disclosed evaluation conditions. The reliable conclusion is narrower and
more useful: F5 preserves the simple E2 pipeline while improving robustness and
real-time factor against the authors' E2 reproduction under their released
evaluation setup.

The repo README reports an even lower deployment RTF when the model is served
through Triton/TensorRT-LLM on an L20 GPU: about 0.039-0.040 RTF for server or
offline TRT-LLM modes versus about 0.147 RTF for offline PyTorch under the
README's 16-NFE benchmark. That is an implementation/deployment result, not the
same condition as the paper's RTX 3090 table, but it is useful for operational
expectations.

## Practical Engineering Implications

F5-TTS is attractive because its training recipe is simple for a modern neural
TTS system:

- no phoneme aligner is required;
- no learned duration model is required for the default path;
- no autoregressive codec-token language model is required;
- the same model supports zero-shot voice cloning, speech editing-style
  infilling, code switching, and speed control through duration.

But the simplicity pushes responsibility into the data and the conditioning:

| Issue | Mechanism | Practical consequence |
| --- | --- | --- |
| Reference transcript quality matters. | The prompt transcript is concatenated with generated text. | ASR errors in reference text can leak into alignment or pronunciation. |
| Duration is still a control variable. | Filler tokens need a target frame count. | Bad duration estimates can cause rushed speech, silence, truncation, or stretched prosody. |
| Text-audio length mismatch is learned, not solved. | Characters are padded to mel length without explicit boundaries. | Out-of-distribution text, repetitions, and rare pronunciations can still break alignment. |
| CFG doubles inference work when used literally. | Conditional and unconditional vector fields are both evaluated. | Latency depends strongly on CFG, NFE, solver, and batching. |
| Vocoder affects measured WER and quality. | The flow model outputs mel features, not waveform. | Vocos and BigVGAN can shift intelligibility, similarity, and latency. |

For fine-tuning, the practical recipe is to preserve the model's infilling
assumption. A dataset should provide clean audio paths and transcripts; the repo
expects CSV-style `audio_file|text` metadata for custom data preparation. The
base model uses frame-based batching, 24 kHz audio, 100 mel channels, and a
learning-rate schedule around `7.5e-5` for full training. Fine-tuning with only a
few updates may need EMA disabled because early EMA weights can remain dominated
by the pretrained checkpoint.

## The Core Insight

The real lesson of E2/F5 is that text-speech alignment can be shifted from a
separate symbolic preprocessing problem into the continuous generative model,
provided the model is trained as masked speech infilling over large paired
speech-text data. E2 proves the idea. F5 makes it more practical by reducing
the worst optimization pathology: raw padded characters and dense acoustic
frames are too mismatched to simply concatenate and hope for robust alignment.
ConvNeXt text refinement gives the character stream a local temporal model
before joint attention, while DiT/AdaLN conditioning gives the flow step a
cleaner role than appending time as another token.

This is why F5-TTS is a useful design pattern beyond this specific repository:
if a task requires aligning a sparse symbolic condition to a dense continuous
sequence, a small modality-specific preprocessing stage before a shared
diffusion/flow transformer can outperform both extremes: fully hand-engineered
alignment and fully raw concatenation.

## Sources

- Sefik Emre Eskimez et al., "E2 TTS: Embarrassingly Easy Fully
  Non-Autoregressive Zero-Shot TTS", arXiv:2406.18009,
  https://arxiv.org/abs/2406.18009.
- Yushen Chen et al., "F5-TTS: A Fairytaler that Fakes Fluent and Faithful
  Speech with Flow Matching", ACL 2025 / arXiv:2410.06885,
  https://aclanthology.org/2025.acl-long.313/ and
  https://arxiv.org/abs/2410.06885.
- SWivid/F5-TTS official repository, inspected at commit `2ae2c9b`,
  https://github.com/SWivid/F5-TTS.
- F5-TTS implementation files: `src/f5_tts/model/cfm.py`,
  `src/f5_tts/model/backbones/dit.py`, `src/f5_tts/model/backbones/unett.py`,
  `src/f5_tts/infer/utils_infer.py`, and `src/f5_tts/configs/F5TTS_v1_Base.yaml`
  in the official repository.
