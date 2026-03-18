# Kokoro TTS — Deep Research Report

How an 82M-parameter model achieves near-human speech quality, and why it's fast enough for real-time voice agents.

**Based on:**
- [Kokoro source code](../../../go-research/external_code/kokoro/kokoro/)
- [iSTFTNet paper (Kaneko et al., 2022)](../../../go-research/external_code/kokoro/2203.02395v1.pdf) — the vocoder architecture
- [StyleTTS 2 paper (Li et al., NeurIPS 2023)](../../../go-research/external_code/kokoro/2306.07691v2.pdf) — the foundational model

---

## 1. What Kokoro Is

Kokoro is an inference-only implementation of **StyleTTS 2** — a text-to-speech model from Columbia University that was the first to achieve human-level speech quality on public benchmarks. On LJSpeech, human evaluators rated StyleTTS 2 *higher than actual human recordings* (CMOS +0.28, p < 0.05).

Kokoro distills this into 82M parameters with a specific vocoder choice (iSTFTNet) that makes it fast enough for real-time streaming on CPU/MPS.

**Key files:**
- [`kokoro/__init__.py`](../../../go-research/external_code/kokoro/kokoro/__init__.py) — Package entry, exports `KModel` and `KPipeline`
- [`kokoro/model.py`](../../../go-research/external_code/kokoro/kokoro/model.py) — Model assembly and forward pass
- [`kokoro/pipeline.py`](../../../go-research/external_code/kokoro/kokoro/pipeline.py) — Full inference pipeline: G2P, chunking, voice loading
- [`kokoro/modules.py`](../../../go-research/external_code/kokoro/kokoro/modules.py) — TextEncoder, ProsodyPredictor, DurationEncoder, PLBERT
- [`kokoro/istftnet.py`](../../../go-research/external_code/kokoro/kokoro/istftnet.py) — Decoder, Generator, SineGen, AdaIN, Snake activation
- [`kokoro/custom_stft.py`](../../../go-research/external_code/kokoro/kokoro/custom_stft.py) — ONNX-compatible STFT via conv1d

---

## 2. Architecture Overview

Kokoro's inference pipeline has four stages:

```
Text → Phonemes → [PLBERT + TextEncoder] → [Duration/Prosody Prediction] → [iSTFTNet Decoder] → Waveform
```

There are **five neural sub-modules** that work together:

| Module | What it does | Params source | Code |
|--------|-------------|---------------|------|
| **PLBERT** | Contextualizes phoneme tokens (ALBERT-based) | Pre-trained on Wikipedia phoneme sequences | [`modules.py:180-183`](../../../go-research/external_code/kokoro/kokoro/modules.py) |
| **TextEncoder** | CNN+BiLSTM encoding of phonemes for acoustic features | Trained E2E | [`modules.py:35-69`](../../../go-research/external_code/kokoro/kokoro/modules.py) |
| **ProsodyPredictor** | Predicts duration, F0 (pitch), and N (energy) per phoneme | Trained E2E | [`modules.py:91-134`](../../../go-research/external_code/kokoro/kokoro/modules.py) |
| **DurationEncoder** | Style-conditioned BiLSTM stack for duration | Trained E2E | [`modules.py:137-176`](../../../go-research/external_code/kokoro/kokoro/modules.py) |
| **Decoder (iSTFTNet)** | Converts features → magnitude + phase → iSTFT → waveform | Trained E2E | [`istftnet.py:384-421`](../../../go-research/external_code/kokoro/kokoro/istftnet.py) |

---

## 3. The Complete Forward Pass — `model.py`

This is the full inference pipeline. Every line matters.

[`model.py:87-119`](../../../go-research/external_code/kokoro/kokoro/model.py)

```python
@torch.no_grad()
def forward_with_tokens(
    self,
    input_ids: torch.LongTensor,     # [1, T] — phoneme token IDs (with BOS/EOS padding)
    ref_s: torch.FloatTensor,         # [1, 256] — the style vector for this voice+length
    speed: float = 1                  # speaking rate multiplier
) -> tuple[torch.FloatTensor, torch.LongTensor]:

    # ─── Step 0: Build masks ───
    # Create a boolean mask for padding positions (all False for single utterance)
    input_lengths = torch.full(
        (input_ids.shape[0],),          # batch size (always 1 at inference)
        input_ids.shape[-1],            # sequence length = number of phonemes
        device=input_ids.device,
        dtype=torch.long
    )
    text_mask = torch.arange(input_lengths.max()).unsqueeze(0).expand(input_lengths.shape[0], -1).type_as(input_lengths)
    text_mask = torch.gt(text_mask+1, input_lengths.unsqueeze(1)).to(self.device)

    # ─── Step 1: PLBERT — Contextualize phonemes for duration prediction ───
    # PLBERT is an ALBERT model pre-trained on phoneme sequences from Wikipedia.
    # It gives us rich contextual embeddings that understand phoneme relationships.
    # Output: [1, T, albert_hidden_size] → projected to [1, hidden_dim, T]
    bert_dur = self.bert(input_ids, attention_mask=(~text_mask).int())
    d_en = self.bert_encoder(bert_dur).transpose(-1, -2)

    # ─── Step 2: Split the 256-dim style vector ───
    # Dims 128-255 → prosody (rhythm, pitch, duration patterns)
    # Dims 0-127 → acoustic (timbre, voice quality) — used later in decoder
    s = ref_s[:, 128:]   # prosodic style: controls HOW the voice speaks

    # ─── Step 3: Duration prediction ───
    # The DurationEncoder processes PLBERT output conditioned on prosodic style.
    # It alternates BiLSTM layers with AdaLayerNorm (style injection at every layer).
    d = self.predictor.text_encoder(d_en, s, input_lengths, text_mask)
    x, _ = self.predictor.lstm(d)

    # Duration is predicted as sigmoid outputs across max_dur dimensions, summed.
    # This gives smooth, continuous values that are then rounded to integers.
    # Dividing by speed gives trivial speaking rate control.
    duration = self.predictor.duration_proj(x)
    duration = torch.sigmoid(duration).sum(axis=-1) / speed
    pred_dur = torch.round(duration).clamp(min=1).long().squeeze()

    # ─── Step 4: Build hard alignment matrix ───
    # Each phoneme is repeated for its predicted duration to create a frame-level sequence.
    # This is DETERMINISTIC — no attention mechanism that can skip/repeat words.
    # pred_dur = [3, 5, 2, ...] → phoneme 0 repeated 3 frames, phoneme 1 repeated 5 frames, etc.
    indices = torch.repeat_interleave(
        torch.arange(input_ids.shape[1], device=self.device), pred_dur
    )
    pred_aln_trg = torch.zeros((input_ids.shape[1], indices.shape[0]), device=self.device)
    pred_aln_trg[indices, torch.arange(indices.shape[0])] = 1
    pred_aln_trg = pred_aln_trg.unsqueeze(0).to(self.device)

    # ─── Step 5: Expand features to frame-level using alignment ───
    # Matrix multiply: [1, hidden, T_phonemes] @ [1, T_phonemes, T_frames]
    # → [1, hidden, T_frames] — each frame now has features from its source phoneme
    en = d.transpose(-1, -2) @ pred_aln_trg

    # ─── Step 6: Predict F0 (pitch) and N (energy) at frame level ───
    # These are predicted from the expanded features + prosodic style.
    # F0 drives the harmonic source excitation in the vocoder.
    # N controls the energy/loudness envelope.
    F0_pred, N_pred = self.predictor.F0Ntrain(en, s)

    # ─── Step 7: TextEncoder — Separate acoustic encoding path ───
    # Unlike PLBERT (used for prosody), the TextEncoder (CNN+BiLSTM) is trained
    # purely for the decoder's needs. It captures acoustic-relevant features.
    t_en = self.text_encoder(input_ids, input_lengths, text_mask)
    # Expand to frame-level using the same alignment
    asr = t_en @ pred_aln_trg

    # ─── Step 8: Decode to audio ───
    # The decoder takes:
    #   asr:        acoustic features at frame level [1, hidden, T_frames]
    #   F0_pred:    pitch contour [1, T_frames]
    #   N_pred:     energy contour [1, T_frames]
    #   ref_s[:, :128]:  acoustic style (timbre) — the OTHER half of the style vector
    audio = self.decoder(asr, F0_pred, N_pred, ref_s[:, :128]).squeeze()
    return audio, pred_dur
```

The `forward()` wrapper that handles phoneme-to-token conversion:

[`model.py:121-137`](../../../go-research/external_code/kokoro/kokoro/model.py)

```python
def forward(
    self,
    phonemes: str,              # e.g. "həlˈoʊ wˈɜːld"
    ref_s: torch.FloatTensor,   # style vector for this voice+length
    speed: float = 1,
    return_output: bool = False
) -> Union['KModel.Output', torch.FloatTensor]:
    # Map each phoneme character to its vocabulary ID, skipping unknowns
    input_ids = list(filter(lambda i: i is not None, map(lambda p: self.vocab.get(p), phonemes)))
    assert len(input_ids)+2 <= self.context_length, (len(input_ids)+2, self.context_length)
    # Wrap with BOS (0) and EOS (0) tokens
    input_ids = torch.LongTensor([[0, *input_ids, 0]]).to(self.device)
    ref_s = ref_s.to(self.device)
    audio, pred_dur = self.forward_with_tokens(input_ids, ref_s, speed)
    audio = audio.squeeze().cpu()
    pred_dur = pred_dur.cpu() if pred_dur is not None else None
    return self.Output(audio=audio, pred_dur=pred_dur) if return_output else audio
```

---

## 4. The Style Vector System — Why Kokoro Sounds Natural

This is the single most important design decision. Every aspect of speech generation is conditioned on a **256-dimensional style vector** via Adaptive Instance Normalization (AdaIN).

### AdaIN — The core conditioning mechanism

[`istftnet.py:20-31`](../../../go-research/external_code/kokoro/kokoro/istftnet.py)

```python
class AdaIN1d(nn.Module):
    """Adaptive Instance Normalization.

    Projects a style vector into per-channel scale (gamma) and shift (beta),
    then modulates the normalized input. This means voice identity doesn't
    just affect the output — it permeates every computation.

    Math: out = (1 + gamma) * InstanceNorm(x) + beta
    """
    def __init__(self, style_dim, num_features):
        super().__init__()
        # InstanceNorm normalizes each channel independently (mean=0, var=1)
        # affine=True adds learnable params (workaround for old ONNX export bug)
        self.norm = nn.InstanceNorm1d(num_features, affine=True)
        # Single linear layer projects 128-dim style → 2 * num_features
        # (one half for gamma/scale, one half for beta/shift)
        self.fc = nn.Linear(style_dim, num_features*2)

    def forward(self, x, s):
        h = self.fc(s)                            # [B, 2*C] from style
        h = h.view(h.size(0), h.size(1), 1)       # [B, 2*C, 1] for broadcasting
        gamma, beta = torch.chunk(h, chunks=2, dim=1)  # split into scale & shift
        return (1 + gamma) * self.norm(x) + beta   # modulate normalized activations
```

### AdaLayerNorm — Style conditioning for the duration path

[`modules.py:72-88`](../../../go-research/external_code/kokoro/kokoro/modules.py)

```python
class AdaLayerNorm(nn.Module):
    """Same idea as AdaIN1d, but uses LayerNorm instead of InstanceNorm.
    Used in the DurationEncoder where we need cross-channel normalization.
    """
    def __init__(self, style_dim, channels, eps=1e-5):
        super().__init__()
        self.channels = channels
        self.eps = eps
        self.fc = nn.Linear(style_dim, channels*2)  # style → (gamma, beta)

    def forward(self, x, s):
        x = x.transpose(-1, -2)
        x = x.transpose(1, -1)
        h = self.fc(s)                                    # project style to 2*channels
        h = h.view(h.size(0), h.size(1), 1)
        gamma, beta = torch.chunk(h, chunks=2, dim=1)     # split
        gamma, beta = gamma.transpose(1, -1), beta.transpose(1, -1)
        x = F.layer_norm(x, (self.channels,), eps=self.eps)  # normalize
        x = (1 + gamma) * x + beta                        # modulate
        return x.transpose(1, -1).transpose(-1, -2)
```

### The 256-dim split

The style vector is split into two halves serving different purposes:

- **Dims 0-127** → condition the **Decoder** (timbre, acoustic characteristics) — [`model.py:118`](../../../go-research/external_code/kokoro/kokoro/model.py)
- **Dims 128-255** → condition the **ProsodyPredictor** (rhythm, pitch patterns, speaking style) — [`model.py:104`](../../../go-research/external_code/kokoro/kokoro/model.py)

This separation means a voice controls both *how it sounds* and *how it speaks* through independent pathways.

### Voice packs — Pre-computed style per utterance length

[`pipeline.py:146-177`](../../../go-research/external_code/kokoro/kokoro/pipeline.py)

```python
def load_single_voice(self, voice: str):
    """Load a voice pack from HuggingFace or local .pt file.

    Voice packs are tensors of shape [510, 256] — one 256-dim style vector
    per possible input length (1 to 510 phonemes). This per-length conditioning
    lets the model adapt prosody to utterance length: short phrases get
    different rhythm than long paragraphs.
    """
    if voice in self.voices:
        return self.voices[voice]
    if voice.endswith('.pt'):
        f = voice
    else:
        f = hf_hub_download(repo_id=self.repo_id, filename=f'voices/{voice}.pt')
        if not voice.startswith(self.lang_code):
            v = LANG_CODES.get(voice, voice)
            p = LANG_CODES.get(self.lang_code, self.lang_code)
            logger.warning(f'Language mismatch, loading {v} voice into {p} pipeline.')
    pack = torch.load(f, weights_only=True)  # shape: [510, 256]
    self.voices[voice] = pack
    return pack

def load_voice(self, voice, delimiter=","):
    """Load one or more voices. Multiple voices are AVERAGED for voice mixing.

    e.g. load_voice("af_bella,af_jessica") → mean of both voice packs.
    This trivially supports voice blending with no retraining.
    """
    if isinstance(voice, torch.FloatTensor):
        return voice
    if voice in self.voices:
        return self.voices[voice]
    packs = [self.load_single_voice(v) for v in voice.split(delimiter)]
    if len(packs) == 1:
        return packs[0]
    self.voices[voice] = torch.mean(torch.stack(packs), dim=0)  # average!
    return self.voices[voice]
```

At inference time, the style vector for the exact phoneme count is selected:

```python
# pipeline.py:242 — inside KPipeline.infer()
pack[len(ps)-1]  # select style vector matching this utterance's phoneme count
```

### Where this comes from (StyleTTS 2 paper)

In the original StyleTTS 2, style vectors are sampled from a **diffusion model** conditioned on the input text. This means the style is *text-dependent* — the same voice saying "I'm angry" vs "I'm happy" gets different style vectors, producing appropriate prosody without explicit emotion labels.

The ablation study (StyleTTS 2 paper, Table 5) shows removing style diffusion causes the largest quality drop (CMOS -0.46), confirming it's the most important component.

For Kokoro's inference, these style vectors have been pre-computed and stored as `.pt` files rather than sampled live from a diffusion model — trading diversity for speed.

---

## 5. Text Encoding — Dual Path Architecture

### TextEncoder — CNN + BiLSTM for acoustic features

[`modules.py:35-69`](../../../go-research/external_code/kokoro/kokoro/modules.py)

```python
class TextEncoder(nn.Module):
    """Encodes phoneme tokens into acoustic feature representations.

    Architecture: Embedding → N x (Conv1d + LayerNorm + LeakyReLU + Dropout) → BiLSTM

    The CNN stack captures LOCAL phoneme patterns (coarticulation effects),
    while the BiLSTM captures LONG-RANGE dependencies (sentence-level prosody).

    This is the ACOUSTIC text encoder — it feeds the decoder.
    PLBERT is the separate PROSODIC text encoder — it feeds duration/F0 prediction.
    """
    def __init__(self, channels, kernel_size, depth, n_symbols, actv=nn.LeakyReLU(0.2)):
        super().__init__()
        self.embedding = nn.Embedding(n_symbols, channels)  # phoneme → dense vector
        padding = (kernel_size - 1) // 2
        self.cnn = nn.ModuleList()
        for _ in range(depth):
            self.cnn.append(nn.Sequential(
                weight_norm(nn.Conv1d(channels, channels, kernel_size=kernel_size, padding=padding)),
                LayerNorm(channels),
                actv,
                nn.Dropout(0.2),
            ))
        # BiLSTM: channels → channels//2 per direction → channels total
        self.lstm = nn.LSTM(channels, channels//2, 1, batch_first=True, bidirectional=True)

    def forward(self, x, input_lengths, m):
        x = self.embedding(x)       # [B, T, channels] — token embeddings
        x = x.transpose(1, 2)       # [B, channels, T] — conv1d expects channels first
        m = m.unsqueeze(1)           # [B, 1, T] — mask for padding
        x.masked_fill_(m, 0.0)

        # Stack of dilated convolutions: each sees kernel_size phonemes of context
        for c in self.cnn:
            x = c(x)
            x.masked_fill_(m, 0.0)   # zero out padded positions after each layer

        x = x.transpose(1, 2)       # [B, T, channels] — LSTM expects time second
        # Pack sequences for efficient batched LSTM processing
        lengths = input_lengths if input_lengths.device == torch.device('cpu') else input_lengths.to('cpu')
        x = nn.utils.rnn.pack_padded_sequence(x, lengths, batch_first=True, enforce_sorted=False)
        self.lstm.flatten_parameters()
        x, _ = self.lstm(x)
        x, _ = nn.utils.rnn.pad_packed_sequence(x, batch_first=True)
        x = x.transpose(-1, -2)     # [B, channels, T] — back to channels-first

        # Zero-pad back to original mask length
        x_pad = torch.zeros([x.shape[0], x.shape[1], m.shape[-1]], device=x.device)
        x_pad[:, :, :x.shape[-1]] = x
        x = x_pad
        x.masked_fill_(m, 0.0)
        return x
```

### PLBERT — Pre-trained Language Model for Prosody

[`modules.py:179-183`](../../../go-research/external_code/kokoro/kokoro/modules.py)

```python
# PLBERT = Phoneme-Level BERT, pre-trained on Wikipedia phoneme sequences.
# Uses ALBERT (A Lite BERT) which SHARES parameters across layers —
# this gives transformer-quality contextual embeddings at a fraction of
# the parameter cost. Critical for keeping the total model at 82M params.
class CustomAlbert(AlbertModel):
    def forward(self, *args, **kwargs):
        # Just extract the hidden states, discard attention/pooler outputs
        outputs = super().forward(*args, **kwargs)
        return outputs.last_hidden_state  # [B, T, albert_hidden_dim]
```

Why two paths? From the StyleTTS 2 paper: separating "prosodic text encoder" from "acoustic text encoder" and using a pre-trained BERT for prosody significantly improves naturalness. The prosodic encoder sees the full linguistic context (from PLBERT's pre-training), while the acoustic encoder is trained purely for the decoder's needs.

---

## 6. Duration & Prosody Prediction

### DurationEncoder — Style-conditioned duration

[`modules.py:137-176`](../../../go-research/external_code/kokoro/kokoro/modules.py)

```python
class DurationEncoder(nn.Module):
    """Predicts how long each phoneme should last, conditioned on voice style.

    Architecture: alternating BiLSTM and AdaLayerNorm layers.
    At EVERY layer, the style vector is:
      1. Concatenated to the input (before BiLSTM)
      2. Used for adaptive normalization (AdaLayerNorm)

    This means duration patterns are FULLY voice-dependent — different voices
    naturally speak at different rhythms without explicit programming.
    """
    def __init__(self, sty_dim, d_model, nlayers, dropout=0.1):
        super().__init__()
        self.lstms = nn.ModuleList()
        for _ in range(nlayers):
            # BiLSTM input: d_model + sty_dim (features concatenated with style)
            self.lstms.append(nn.LSTM(d_model + sty_dim, d_model // 2,
                                       num_layers=1, batch_first=True, bidirectional=True))
            # AdaLayerNorm: re-injects style via learned scale/shift
            self.lstms.append(AdaLayerNorm(sty_dim, d_model))
        self.dropout = dropout
        self.d_model = d_model
        self.sty_dim = sty_dim

    def forward(self, x, style, text_lengths, m):
        masks = m
        x = x.permute(2, 0, 1)                    # [T, B, hidden]
        s = style.expand(x.shape[0], x.shape[1], -1)  # expand style to all timesteps
        x = torch.cat([x, s], axis=-1)            # [T, B, hidden+style] — concatenate!
        x.masked_fill_(masks.unsqueeze(-1).transpose(0, 1), 0.0)
        x = x.transpose(0, 1).transpose(-1, -2)   # [B, hidden+style, T]

        for block in self.lstms:
            if isinstance(block, AdaLayerNorm):
                # Style conditioning via learned scale/shift
                x = block(x.transpose(-1, -2), style).transpose(-1, -2)
                # Re-concatenate style for the next BiLSTM input
                x = torch.cat([x, s.permute(1, 2, 0)], axis=1)
                x.masked_fill_(masks.unsqueeze(-1).transpose(-1, -2), 0.0)
            else:
                # BiLSTM: captures bidirectional context
                x = x.transpose(-1, -2)
                x = nn.utils.rnn.pack_padded_sequence(
                    x, text_lengths.cpu(), batch_first=True, enforce_sorted=False)
                block.flatten_parameters()
                x, _ = block(x)
                x, _ = nn.utils.rnn.pad_packed_sequence(x, batch_first=True)
                x = F.dropout(x, p=self.dropout, training=False)
                x = x.transpose(-1, -2)
                # Zero-pad back to original length
                x_pad = torch.zeros([x.shape[0], x.shape[1], m.shape[-1]], device=x.device)
                x_pad[:, :, :x.shape[-1]] = x
                x = x_pad
        return x.transpose(-1, -2)  # [B, T, hidden]
```

### ProsodyPredictor — F0 and energy prediction

[`modules.py:91-134`](../../../go-research/external_code/kokoro/kokoro/modules.py)

```python
class ProsodyPredictor(nn.Module):
    """Predicts duration, F0 (pitch), and N (energy) for each phoneme.

    Duration path:  PLBERT → DurationEncoder(style) → BiLSTM → Linear → sigmoid → sum
    F0/N path:      expanded features → shared BiLSTM → parallel F0/N branches

    The F0 and N branches use AdainResBlk1d (style-conditioned residual blocks),
    so pitch and energy patterns are also voice-dependent.
    """
    def __init__(self, style_dim, d_hid, nlayers, max_dur=50, dropout=0.1):
        super().__init__()
        self.text_encoder = DurationEncoder(sty_dim=style_dim, d_model=d_hid,
                                             nlayers=nlayers, dropout=dropout)
        # Duration prediction: concat style, BiLSTM, project to max_dur dims
        self.lstm = nn.LSTM(d_hid + style_dim, d_hid // 2, 1,
                            batch_first=True, bidirectional=True)
        self.duration_proj = LinearNorm(d_hid, max_dur)  # → [B, T, max_dur]

        # F0 and N share a BiLSTM, then diverge into separate AdaIN residual chains
        self.shared = nn.LSTM(d_hid + style_dim, d_hid // 2, 1,
                              batch_first=True, bidirectional=True)

        # F0 branch: 3 AdainResBlk1d blocks (with style conditioning)
        self.F0 = nn.ModuleList()
        self.F0.append(AdainResBlk1d(d_hid, d_hid, style_dim, dropout_p=dropout))
        self.F0.append(AdainResBlk1d(d_hid, d_hid // 2, style_dim,
                                      upsample=True, dropout_p=dropout))
        self.F0.append(AdainResBlk1d(d_hid // 2, d_hid // 2, style_dim, dropout_p=dropout))
        self.F0_proj = nn.Conv1d(d_hid // 2, 1, 1, 1, 0)  # → single F0 value per frame

        # N (energy) branch: same architecture, different weights
        self.N = nn.ModuleList()
        self.N.append(AdainResBlk1d(d_hid, d_hid, style_dim, dropout_p=dropout))
        self.N.append(AdainResBlk1d(d_hid, d_hid // 2, style_dim,
                                     upsample=True, dropout_p=dropout))
        self.N.append(AdainResBlk1d(d_hid // 2, d_hid // 2, style_dim, dropout_p=dropout))
        self.N_proj = nn.Conv1d(d_hid // 2, 1, 1, 1, 0)   # → single N value per frame

    def F0Ntrain(self, x, s):
        """Predict F0 (pitch) and N (energy) at frame level.

        x: [B, hidden, T_frames] — frame-level features after duration expansion
        s: [B, 128] — prosodic style vector (dims 128-255 of full style)
        """
        x, _ = self.shared(x.transpose(-1, -2))  # shared BiLSTM
        F0 = x.transpose(-1, -2)
        for block in self.F0:
            F0 = block(F0, s)     # style-conditioned residual blocks
        F0 = self.F0_proj(F0)    # project to single channel

        N = x.transpose(-1, -2)
        for block in self.N:
            N = block(N, s)       # same structure, different weights
        N = self.N_proj(N)

        return F0.squeeze(1), N.squeeze(1)  # [B, T_frames] each
```

### Differentiable duration modeling (StyleTTS 2 paper, Section 3.2.4)

During *training* (not inference), StyleTTS 2 uses a novel differentiable upsampler that replaces the non-differentiable `round()` + `repeat_interleave`. It uses Gaussian kernels to create soft alignments:

```
a_pred[n, i] = softmax(sum over k: q[k,i] * Gaussian(n - l_{i-1}; sigma))
```

This allows end-to-end training with the SLM discriminator (WavLM) — the gradients can flow through the duration prediction, which previous methods couldn't do. Ablation: removing it costs CMOS -0.21.

At inference, the differentiable upsampler is replaced with the simpler hard alignment (round + repeat_interleave), which is faster and deterministic.

---

## 7. The Vocoder: iSTFTNet — Why It's Fast

### The problem with standard vocoders

Traditional mel-spectrogram vocoders (like HiFi-GAN) use CNNs with temporal upsampling to directly predict time-domain waveforms. This means the network must:
1. Recover the original-scale magnitude spectrogram (from 80-dim mel)
2. Reconstruct phase (which was discarded)
3. Convert from frequency to time domain

All three problems are solved implicitly by a black-box CNN — expensive and redundant.

### The iSTFTNet insight

Instead of predicting raw waveforms, **predict magnitude and phase in the STFT domain**, then use the mathematically exact inverse STFT to reconstruct the waveform.

### Decoder — The full vocoder pipeline

[`istftnet.py:384-421`](../../../go-research/external_code/kokoro/kokoro/istftnet.py)

```python
class Decoder(nn.Module):
    """Top-level decoder: processes acoustic features + F0 + N → waveform.

    Flow:
    1. Concatenate acoustic features (asr) with downsampled F0 and N
    2. Encode through AdainResBlk1d (style-conditioned)
    3. Iteratively decode with residual connections to F0/N and asr
    4. Pass to Generator (iSTFTNet) for final waveform synthesis
    """
    def __init__(self, dim_in, style_dim, dim_out,
                 resblock_kernel_sizes, upsample_rates,
                 upsample_initial_channel, resblock_dilation_sizes,
                 upsample_kernel_sizes, gen_istft_n_fft, gen_istft_hop_size,
                 disable_complex=False):
        super().__init__()
        # Initial encoding: [acoustic + F0 + N] → 1024-dim
        self.encode = AdainResBlk1d(dim_in + 2, 1024, style_dim)

        # 4-block decoder stack. First 3 blocks have residual skip connections
        # from asr (64-dim compressed), F0, and N — keeping pitch/energy info flowing
        self.decode = nn.ModuleList()
        self.decode.append(AdainResBlk1d(1024 + 2 + 64, 1024, style_dim))
        self.decode.append(AdainResBlk1d(1024 + 2 + 64, 1024, style_dim))
        self.decode.append(AdainResBlk1d(1024 + 2 + 64, 1024, style_dim))
        self.decode.append(AdainResBlk1d(1024 + 2 + 64, 512, style_dim, upsample=True))

        # Downsample F0/N to match frame rate (stride=2 conv)
        self.F0_conv = weight_norm(nn.Conv1d(1, 1, kernel_size=3, stride=2, groups=1, padding=1))
        self.N_conv = weight_norm(nn.Conv1d(1, 1, kernel_size=3, stride=2, groups=1, padding=1))

        # Compress acoustic features for skip connections
        self.asr_res = nn.Sequential(weight_norm(nn.Conv1d(512, 64, kernel_size=1)))

        # The iSTFTNet generator — this is where the magic happens
        self.generator = Generator(style_dim, resblock_kernel_sizes, upsample_rates,
                                   upsample_initial_channel, resblock_dilation_sizes,
                                   upsample_kernel_sizes, gen_istft_n_fft,
                                   gen_istft_hop_size, disable_complex=disable_complex)

    def forward(self, asr, F0_curve, N, s):
        # Downsample F0 and N to half frame rate
        F0 = self.F0_conv(F0_curve.unsqueeze(1))  # [B, 1, T] → [B, 1, T//2]
        N = self.N_conv(N.unsqueeze(1))

        # Concatenate and encode
        x = torch.cat([asr, F0, N], axis=1)        # [B, hidden+2, T]
        x = self.encode(x, s)                       # style-conditioned encoding

        # Compressed acoustic features for skip connections
        asr_res = self.asr_res(asr)                 # [B, 64, T]

        # Decode with residual skip connections
        res = True
        for block in self.decode:
            if res:
                x = torch.cat([x, asr_res, F0, N], axis=1)  # skip connections
            x = block(x, s)                          # style-conditioned
            if block.upsample_type != "none":
                res = False  # stop skip connections after upsampling

        # Final synthesis: features → magnitude + phase → iSTFT → waveform
        x = self.generator(x, s, F0_curve)
        return x
```

### Generator — iSTFTNet with harmonic source excitation

[`istftnet.py:257-325`](../../../go-research/external_code/kokoro/kokoro/istftnet.py)

```python
class Generator(nn.Module):
    """The core iSTFTNet generator.

    Instead of predicting raw waveforms (like HiFi-GAN), this predicts
    MAGNITUDE and PHASE in the STFT domain, then uses iSTFT for exact
    reconstruction. This is 2-4x faster with comparable quality.

    Additionally uses harmonic-plus-noise source excitation: the network
    starts from physics-based sine waves at F0+harmonics, not from nothing.
    """
    def __init__(self, style_dim, resblock_kernel_sizes, upsample_rates,
                 upsample_initial_channel, resblock_dilation_sizes,
                 upsample_kernel_sizes, gen_istft_n_fft, gen_istft_hop_size,
                 disable_complex=False):
        super().__init__()
        self.num_kernels = len(resblock_kernel_sizes)
        self.num_upsamples = len(upsample_rates)

        # Harmonic source: generates sine waves at F0 and 8 overtones
        self.m_source = SourceModuleHnNSF(
            sampling_rate=24000,
            upsample_scale=math.prod(upsample_rates) * gen_istft_hop_size,
            harmonic_num=8, voiced_threshod=10)

        # F0 upsampling to match audio sample rate
        self.f0_upsamp = nn.Upsample(scale_factor=math.prod(upsample_rates) * gen_istft_hop_size)

        # Transposed convolutions for progressive upsampling
        self.ups = nn.ModuleList()
        for i, (u, k) in enumerate(zip(upsample_rates, upsample_kernel_sizes)):
            self.ups.append(weight_norm(
                nn.ConvTranspose1d(
                    upsample_initial_channel//(2**i),
                    upsample_initial_channel//(2**(i+1)),
                    k, u, padding=(k-u)//2)))

        # AdaINResBlock1 at each upsampling level (with Snake activation!)
        self.resblocks = nn.ModuleList()
        for i in range(len(self.ups)):
            ch = upsample_initial_channel//(2**(i+1))
            for j, (k, d) in enumerate(zip(resblock_kernel_sizes, resblock_dilation_sizes)):
                self.resblocks.append(AdaINResBlock1(ch, k, d, style_dim))

        # Noise injection at each level (harmonic source excitation)
        self.noise_convs = nn.ModuleList()
        self.noise_res = nn.ModuleList()
        # ... (noise convolution setup for each upsampling level)

        # Final conv: predicts n_fft + 2 channels (magnitude + phase)
        self.post_n_fft = gen_istft_n_fft
        self.conv_post = weight_norm(nn.Conv1d(ch, self.post_n_fft + 2, 7, 1, padding=3))

        # STFT module: either torch.stft (GPU) or custom conv1d version (ONNX)
        self.stft = (
            CustomSTFT(filter_length=gen_istft_n_fft, hop_length=gen_istft_hop_size,
                       win_length=gen_istft_n_fft)
            if disable_complex
            else TorchSTFT(filter_length=gen_istft_n_fft, hop_length=gen_istft_hop_size,
                           win_length=gen_istft_n_fft)
        )

    def forward(self, x, s, f0):
        # ─── Generate harmonic source excitation ───
        # From the predicted F0 contour, create sine waves at F0 + 8 harmonics.
        # This gives the network a massive inductive bias — it doesn't need to
        # learn that speech is made of harmonics, just how to shape them.
        with torch.no_grad():
            f0 = self.f0_upsamp(f0[:, None]).transpose(1, 2)  # upsample F0
            har_source, noi_source, uv = self.m_source(f0)     # sine waves + noise
            har_source = har_source.transpose(1, 2).squeeze(1)
            # Get STFT of harmonic source for frequency-domain injection
            har_spec, har_phase = self.stft.transform(har_source)
            har = torch.cat([har_spec, har_phase], dim=1)

        # ─── Progressive upsampling with harmonic injection ───
        for i in range(self.num_upsamples):
            x = F.leaky_relu(x, negative_slope=0.1)

            # Inject harmonic source at this resolution level
            x_source = self.noise_convs[i](har)           # downsample harmonics
            x_source = self.noise_res[i](x_source, s)     # style-conditioned

            x = self.ups[i](x)                              # transposed conv upsample
            if i == self.num_upsamples - 1:
                x = self.reflection_pad(x)
            x = x + x_source                                # ADD harmonic source

            # Multi-kernel residual blocks with Snake activation + AdaIN
            xs = None
            for j in range(self.num_kernels):
                if xs is None:
                    xs = self.resblocks[i*self.num_kernels+j](x, s)
                else:
                    xs += self.resblocks[i*self.num_kernels+j](x, s)
            x = xs / self.num_kernels                        # average across kernels

        # ─── The iSTFT trick: predict magnitude + phase, not raw waveform ───
        x = F.leaky_relu(x)
        x = self.conv_post(x)           # → [B, n_fft+2, T]

        # Split into magnitude and phase
        spec = torch.exp(x[:, :self.post_n_fft // 2 + 1, :])    # magnitude (exp: log-scale → linear)
        phase = torch.sin(x[:, self.post_n_fft // 2 + 1:, :])   # phase (sin: ensures periodicity)

        # Exact inverse STFT → time-domain waveform
        return self.stft.inverse(spec, phase)
```

### AdaINResBlock1 — The workhorse residual block with Snake activation

[`istftnet.py:34-77`](../../../go-research/external_code/kokoro/kokoro/istftnet.py)

```python
class AdaINResBlock1(nn.Module):
    """Style-conditioned residual block with Snake activation.

    Architecture per dilation:
        x → AdaIN(style) → Snake → Conv1d(dilated) → AdaIN(style) → Snake → Conv1d → + residual

    Three dilations (1, 3, 5) capture patterns at different temporal scales.
    Snake activation: x + (1/alpha) * sin(alpha*x)^2
        - alpha is LEARNABLE per channel
        - Designed for periodic signals (audio harmonics)
        - ReLU/LeakyReLU are bad at periodic signals — Snake is purpose-built for audio
    """
    def __init__(self, channels, kernel_size=3, dilation=(1, 3, 5), style_dim=64):
        super().__init__()
        # Dilated convolutions: receptive field grows as 1, 3, 5
        self.convs1 = nn.ModuleList([
            weight_norm(nn.Conv1d(channels, channels, kernel_size, 1,
                                  dilation=d, padding=get_padding(kernel_size, d)))
            for d in dilation
        ])
        # Post-convolutions (dilation=1)
        self.convs2 = nn.ModuleList([
            weight_norm(nn.Conv1d(channels, channels, kernel_size, 1,
                                  dilation=1, padding=get_padding(kernel_size, 1)))
            for _ in dilation
        ])
        # AdaIN at each stage: style → (gamma, beta) per channel
        self.adain1 = nn.ModuleList([AdaIN1d(style_dim, channels) for _ in dilation])
        self.adain2 = nn.ModuleList([AdaIN1d(style_dim, channels) for _ in dilation])
        # Snake alpha: learnable frequency parameter, one per channel
        self.alpha1 = nn.ParameterList([nn.Parameter(torch.ones(1, channels, 1)) for _ in dilation])
        self.alpha2 = nn.ParameterList([nn.Parameter(torch.ones(1, channels, 1)) for _ in dilation])

    def forward(self, x, s):
        for c1, c2, n1, n2, a1, a2 in zip(
            self.convs1, self.convs2, self.adain1, self.adain2, self.alpha1, self.alpha2
        ):
            xt = n1(x, s)                                        # AdaIN: normalize + style modulate
            xt = xt + (1 / a1) * (torch.sin(a1 * xt) ** 2)      # Snake activation
            xt = c1(xt)                                           # dilated convolution
            xt = n2(xt, s)                                        # AdaIN again
            xt = xt + (1 / a2) * (torch.sin(a2 * xt) ** 2)      # Snake activation
            xt = c2(xt)                                           # post-convolution
            x = xt + x                                            # residual connection
        return x
```

### SineGen — Physics-based harmonic source

[`istftnet.py:108-209`](../../../go-research/external_code/kokoro/kokoro/istftnet.py)

```python
class SineGen(nn.Module):
    """Generates sine waves at fundamental frequency (F0) and harmonics.

    For VOICED segments: sum of sine waves at F0, 2*F0, 3*F0, ... 8*F0
    For UNVOICED segments: Gaussian noise (no harmonic structure)

    This is a massive inductive bias — the model doesn't have to learn from
    scratch that speech is made of harmonics. It just shapes them.
    """
    def __init__(self, samp_rate, upsample_scale, harmonic_num=0,
                 sine_amp=0.1, noise_std=0.003,
                 voiced_threshold=0, flag_for_pulse=False):
        super().__init__()
        self.sine_amp = sine_amp
        self.noise_std = noise_std
        self.harmonic_num = harmonic_num    # 8 harmonics above F0
        self.dim = self.harmonic_num + 1    # F0 + 8 harmonics = 9 channels
        self.sampling_rate = samp_rate
        self.voiced_threshold = voiced_threshold
        self.upsample_scale = upsample_scale

    def _f02sine(self, f0_values):
        """Convert F0 values to sine waves via cumulative phase.

        f0_values: [B, T, dim] where dim = F0 + harmonics
        Returns sine waves at each frequency.

        Key insight: phase is computed as cumulative sum of instantaneous
        frequency, normalized by sampling rate. This produces continuous
        phase even when F0 varies over time.
        """
        # Normalize frequency to [0, 1) range (fraction of sampling rate)
        rad_values = (f0_values / self.sampling_rate) % 1

        # Random initial phase for harmonics (NOT for fundamental)
        # This prevents artificial correlation between harmonics
        rand_ini = torch.rand(f0_values.shape[0], f0_values.shape[2], device=f0_values.device)
        rand_ini[:, 0] = 0  # fundamental starts at phase 0
        rad_values[:, 0, :] = rad_values[:, 0, :] + rand_ini

        # Cumulative phase: instantaneous phase = integral of frequency
        # Downsample → cumsum → upsample for efficiency
        rad_values = F.interpolate(
            rad_values.transpose(1, 2),
            scale_factor=1/self.upsample_scale, mode="linear"
        ).transpose(1, 2)
        phase = torch.cumsum(rad_values, dim=1) * 2 * torch.pi
        phase = F.interpolate(
            phase.transpose(1, 2) * self.upsample_scale,
            scale_factor=self.upsample_scale, mode="linear"
        ).transpose(1, 2)
        sines = torch.sin(phase)
        return sines

    def forward(self, f0):
        """Generate harmonic source excitation signal.

        Input: f0 [B, T, 1] — fundamental frequency (0 for unvoiced)
        Output: sine_waves, uv_flag, noise

        Voiced frames: sine waves at F0 * [1, 2, 3, ..., 9] + small noise
        Unvoiced frames: only noise (amplitude matched to sine_amp)
        """
        # Create F0 and all harmonics: F0, 2*F0, 3*F0, ..., 9*F0
        fn = torch.multiply(
            f0, torch.FloatTensor([[range(1, self.harmonic_num + 2)]]).to(f0.device)
        )
        sine_waves = self._f02sine(fn) * self.sine_amp

        # Voiced/unvoiced decision
        uv = (f0 > self.voiced_threshold).type(torch.float32)

        # Noise: small for voiced (adds naturalness), larger for unvoiced
        noise_amp = uv * self.noise_std + (1 - uv) * self.sine_amp / 3
        noise = noise_amp * torch.randn_like(sine_waves)

        # Zero out harmonics for unvoiced, add noise
        sine_waves = sine_waves * uv + noise
        return sine_waves, uv, noise
```

### SourceModuleHnNSF — Merging harmonics into a single excitation

[`istftnet.py:212-254`](../../../go-research/external_code/kokoro/kokoro/istftnet.py)

```python
class SourceModuleHnNSF(nn.Module):
    """Harmonic-plus-Noise Source Module.

    Takes the 9-channel sine output (F0 + 8 harmonics) and merges it
    into a single excitation signal using a LEARNED linear combination.

    The network learns which harmonic mixture sounds most natural,
    rather than using fixed weights.
    """
    def __init__(self, sampling_rate, upsample_scale, harmonic_num=0,
                 sine_amp=0.1, add_noise_std=0.003, voiced_threshod=0):
        super().__init__()
        self.l_sin_gen = SineGen(sampling_rate, upsample_scale, harmonic_num,
                                  sine_amp, add_noise_std, voiced_threshod)
        # Learned linear combination: 9 harmonics → 1 merged excitation
        self.l_linear = nn.Linear(harmonic_num + 1, 1)
        self.l_tanh = nn.Tanh()

    def forward(self, x):
        with torch.no_grad():
            sine_wavs, uv, _ = self.l_sin_gen(x)     # [B, T, 9] sine waves
        sine_merge = self.l_tanh(self.l_linear(sine_wavs))  # [B, T, 1] merged
        noise = torch.randn_like(uv) * self.sine_amp / 3    # noise source
        return sine_merge, noise, uv
```

---

## 8. ONNX-Compatible STFT — Running Anywhere

[`custom_stft.py`](../../../go-research/external_code/kokoro/kokoro/custom_stft.py)

The standard `torch.stft`/`torch.istft` use complex numbers not supported by ONNX. CustomSTFT reimplements STFT as conv1d operations:

```python
class CustomSTFT(nn.Module):
    """STFT/iSTFT without complex ops, using conv1d.

    The key insight: the Discrete Fourier Transform IS a dot product
    between the signal and basis functions (cos/sin at each frequency).
    A dot product over a sliding window IS a convolution.

    So we precompute the DFT basis as conv1d weights and register them
    as buffers. The entire STFT becomes a single conv1d call.
    """
    def __init__(self, filter_length=800, hop_length=200, win_length=800,
                 window="hann", center=True, pad_mode="replicate"):
        super().__init__()
        self.freq_bins = filter_length // 2 + 1

        # Build Hann window
        window_tensor = torch.hann_window(win_length, periodic=True, dtype=torch.float32)

        # ─── Precompute forward DFT as conv weights ───
        # DFT formula: X[k] = sum_n x[n] * e^{-j 2pi k n / N}
        #            = sum_n x[n] * (cos(2pi*k*n/N) - j*sin(2pi*k*n/N))
        n = np.arange(filter_length)
        k = np.arange(self.freq_bins)
        angle = 2 * np.pi * np.outer(k, n) / filter_length

        # Combine DFT basis with window function
        # Shape: [freq_bins, 1, filter_length] — ready for conv1d
        forward_real = np.cos(angle) * window_tensor.numpy()   # real part
        forward_imag = -np.sin(angle) * window_tensor.numpy()  # imaginary part
        self.register_buffer("weight_forward_real",
                             torch.from_numpy(forward_real).float().unsqueeze(1))
        self.register_buffer("weight_forward_imag",
                             torch.from_numpy(forward_imag).float().unsqueeze(1))

        # ─── Precompute inverse DFT as transposed conv weights ───
        inv_scale = 1.0 / filter_length
        angle_t = 2 * np.pi * np.outer(np.arange(filter_length), k) / filter_length
        inv_window = window_tensor.numpy() * inv_scale

        backward_real = np.cos(angle_t).T * inv_window
        backward_imag = np.sin(angle_t).T * inv_window
        self.register_buffer("weight_backward_real",
                             torch.from_numpy(backward_real).float().unsqueeze(1))
        self.register_buffer("weight_backward_imag",
                             torch.from_numpy(backward_imag).float().unsqueeze(1))

    def transform(self, waveform):
        """Forward STFT via conv1d. Returns (magnitude, phase)."""
        if self.center:
            waveform = F.pad(waveform, (self.n_fft // 2, self.n_fft // 2), mode=self.pad_mode)

        x = waveform.unsqueeze(1)  # [B, 1, T]
        # Real DFT via convolution
        real_out = F.conv1d(x, self.weight_forward_real, stride=self.hop_length)
        imag_out = F.conv1d(x, self.weight_forward_imag, stride=self.hop_length)

        magnitude = torch.sqrt(real_out**2 + imag_out**2 + 1e-14)
        phase = torch.atan2(imag_out, real_out)
        return magnitude, phase

    def inverse(self, magnitude, phase, length=None):
        """Inverse STFT via transposed conv1d. Returns waveform."""
        real_part = magnitude * torch.cos(phase)
        imag_part = magnitude * torch.sin(phase)

        # Overlap-add via transposed convolution
        real_rec = F.conv_transpose1d(real_part, self.weight_backward_real, stride=self.hop_length)
        imag_rec = F.conv_transpose1d(imag_part, self.weight_backward_imag, stride=self.hop_length)
        waveform = real_rec - imag_rec  # real iFFT: subtract imaginary part

        if self.center:
            waveform = waveform[..., self.n_fft // 2 : -self.n_fft // 2]
        return waveform
```

This is why Kokoro can run anywhere: CPU (ONNX Runtime), Apple Silicon MPS (PyTorch), browser (ONNX.js / kokoro.js), edge devices.

---

## 9. The Inference Pipeline — `pipeline.py`

### G2P + Chunking + Streaming

[`pipeline.py:361-442`](../../../go-research/external_code/kokoro/kokoro/pipeline.py)

```python
def __call__(
    self,
    text: Union[str, List[str]],
    voice: Optional[str] = None,
    speed: Union[float, Callable[[int], float]] = 1,
    split_pattern: Optional[str] = r'\n+',
    model: Optional[KModel] = None
) -> Generator['KPipeline.Result', None, None]:
    """Full text-to-speech pipeline. Yields audio chunks as a generator.

    Flow: text → split → G2P → chunk to 510 phonemes → synthesize → yield

    Each chunk is independently synthesized — no cross-chunk state.
    The caller yields audio chunks as they're generated for streaming.
    """
    model = model or self.model
    pack = self.load_voice(voice).to(model.device) if model else None

    # Split input text on newlines (or custom pattern)
    if isinstance(text, str):
        text = re.split(split_pattern, text.strip()) if split_pattern else [text]

    for graphemes_index, graphemes in enumerate(text):
        if not graphemes.strip():
            continue

        if self.lang_code in 'ab':  # English
            # G2P: "Hello world" → [MToken("Hello", "həlˈoʊ"), MToken("world", "wˈɜːld")]
            _, tokens = self.g2p(graphemes)

            # Tokenize and chunk to fit 510-phoneme context window
            for gs, ps, tks in self.en_tokenize(tokens):
                if not ps:
                    continue
                elif len(ps) > 510:
                    ps = ps[:510]  # hard truncation safety

                # Synthesize this chunk
                output = KPipeline.infer(model, ps, pack, speed) if model else None

                # Yield result — caller can stream audio immediately
                yield self.Result(
                    graphemes=gs, phonemes=ps, tokens=tks,
                    output=output, text_index=graphemes_index
                )
```

### Waterfall chunking — Smart text splitting

[`pipeline.py:184-199`](../../../go-research/external_code/kokoro/kokoro/pipeline.py)

```python
@staticmethod
def waterfall_last(
    tokens: List[en.MToken],
    next_count: int,
    waterfall: List[str] = ['!.?…', ':;', ',—'],  # priority order for split points
    bumps: List[str] = [')', '"']                   # characters to include after split
) -> int:
    """Find the best split point when text exceeds 510 phonemes.

    Searches BACKWARDS through the token list for natural break points:
    1. First try: sentence-ending punctuation (! . ? ...)
    2. Then try: colons, semicolons
    3. Then try: commas, dashes

    This produces natural-sounding chunk boundaries rather than cutting mid-word.
    """
    for w in waterfall:
        # Search backwards for the highest-priority punctuation
        z = next((i for i, t in reversed(list(enumerate(tokens)))
                  if t.phonemes in set(w)), None)
        if z is None:
            continue
        z += 1
        # Include trailing close-parens or quotes
        if z < len(tokens) and tokens[z].phonemes in bumps:
            z += 1
        # Verify the chunk fits in 510 phonemes
        if next_count - len(KPipeline.tokens_to_ps(tokens[:z])) <= 510:
            return z
    return len(tokens)
```

---

## 10. Training — How StyleTTS 2 Was Trained

Kokoro is inference-only, but understanding the training is key to understanding *why* it works so well. All training details come from the StyleTTS 2 paper (Li et al., NeurIPS 2023).

### Two-stage training

**Stage 1: Reconstruction** (with ground truth audio)
- Train all modules using teacher-forcing
- Losses: mel spectrogram reconstruction, multi-resolution STFT loss, duration/F0/energy regression
- The style encoder extracts style vectors FROM the ground truth audio
- Optimizer: AdamW (lr = 1e-4, weight decay = 0.01), batch size 16

**Stage 2: End-to-end with SLM adversarial training** (text-only)
- Remove the style encoder; replace with style diffusion model
- Train the full pipeline from text alone
- The SLM discriminator (WavLM-based) judges output naturalness at a perceptual level
- The differentiable duration upsampler enables gradients through the whole pipeline
- F0 loss is now computed against the *input style* rather than ground truth
- Optimizer: AdamW (lr = 5e-5), 40 epochs

### Datasets

| Dataset | Hours | Speakers | Used for |
|---------|-------|----------|----------|
| LJSpeech | 24h | 1 | Single-speaker evaluation |
| LibriTTS | 585h | 2,456 | Multi-speaker training |
| VCTK | 44h | 109 | Multi-speaker training + evaluation |

### Loss functions (combined)

```
L_total = L_mel + L_stft + L_dur + L_F0 + L_N + L_SLM + L_diff
```

- **L_mel**: Mel spectrogram reconstruction (L1)
- **L_stft**: Multi-resolution STFT loss (spectral convergence + log magnitude)
- **L_dur**: Duration regression (L1 between predicted and forced-aligned durations)
- **L_F0**: F0 regression (L1 between predicted and extracted F0 contours)
- **L_N**: Energy regression (L1)
- **L_SLM**: SLM adversarial loss (the big innovation — matching WavLM representations)
- **L_diff**: Style diffusion loss (denoising score matching for the diffusion model)

### SLM adversarial training — The key innovation

```
L_slm = min_G max_D [E_x[log D_SLM(x)] + E_t[log(1 - D_SLM(G(t)))]]
```

Where:
- `G(t)` generates speech from text only (no ground truth audio)
- `D_SLM` is a discriminator on top of **WavLM** (a pre-trained speech language model)
- WavLM encodes acoustic → semantic information across its 12 layers
- Matching WavLM representations means matching **human perception** of speech quality

Why this matters: traditional discriminators (multi-period, multi-scale) judge signal-level quality. WavLM judges **linguistic naturalness** — whether the speech sounds like a real human said it. This is why StyleTTS 2 surpasses human recordings on CMOS.

Ablation (StyleTTS 2 paper, Table 5):
- Remove SLM training: **CMOS -0.32**
- Remove style diffusion: **CMOS -0.46** (largest drop)
- Remove differentiable duration: **CMOS -0.21**

### Style diffusion training

The style diffusion model uses a simple U-Net architecture with only **3-5 diffusion steps** (vs hundreds for image diffusion). This works because:
- The style vector is low-dimensional (256d) compared to images
- The target distribution (natural speaking styles for a given text) is relatively smooth
- Classifier-free guidance (w=1 to 2) is used for diversity control

During training, noise is progressively added to the ground truth style vector, and the model learns to denoise. At inference, style is sampled by starting from pure noise and denoising for 3-5 steps.

For Kokoro specifically, the diffusion model is replaced with pre-computed style vectors per voice per utterance length — trading diversity for speed.

---

## 11. The Numbers

| Metric | Value | Source |
|--------|-------|--------|
| Parameters | 82M | Kokoro model card |
| Output sample rate | 24 kHz | [`config.py`](../jarvis/config.py) |
| Voices | 50+ | Voice pack files |
| Context window | 510 phonemes | [`pipeline.py:205`](../../../go-research/external_code/kokoro/kokoro/pipeline.py) |
| Style vector dimensions | 256 (128 acoustic + 128 prosodic) | [`model.py:104,118`](../../../go-research/external_code/kokoro/kokoro/model.py) |
| Time to first audio (streaming) | ~200ms | Empirical |
| StyleTTS 2 MOS on LJSpeech | 3.83 (ground truth: 3.81) | StyleTTS 2 paper, Table 2 |
| StyleTTS 2 CMOS vs ground truth | +0.28 (p < 0.05) | StyleTTS 2 paper, Table 1 |
| StyleTTS 2 CMOS vs NaturalSpeech | +1.07 (p < 0.01) | StyleTTS 2 paper, Table 1 |
| License | Apache 2.0 | pyproject.toml |

---

## 12. Summary: Why 82M Parameters Can Beat Human Recordings

The combination of:

1. **Style diffusion** — captures the full distribution of natural speaking styles (biggest single factor, -0.46 CMOS without it)
2. **SLM adversarial training** — matches WavLM's perception of natural speech (-0.32 without it)
3. **iSTFTNet vocoder** — uses signal processing instead of brute-force upsampling (2-4x faster, same quality)
4. **Harmonic source excitation + Snake** — physics-based inductive bias for audio generation
5. **Explicit duration prediction** — stable, controllable, no attention failures
6. **AdaIN conditioning everywhere** — voice identity permeates every layer
7. **ALBERT for phoneme context** — transformer quality at a fraction of the parameters

Each of these is individually well-understood. The insight of StyleTTS 2 (and by extension Kokoro) is combining all of them in a single end-to-end trained system, where the SLM discriminator forces everything to work together toward human-like speech.

The result: a model small enough to run on a laptop CPU that produces speech human evaluators rate as more natural than actual human recordings.
