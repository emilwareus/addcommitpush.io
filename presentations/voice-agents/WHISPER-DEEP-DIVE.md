# Whisper STT -- Deep Research Report

How OpenAI's encoder-decoder Transformer turns audio into text, and why it remains the foundation for open-source speech recognition.

**Based on:**

- [Whisper source code](../../../go-research/external_code/whisper/whisper/)
- [Whisper paper (Radford et al., 2022)](../../../go-research/external_code/whisper/whisper_paper_2212.04356.pdf) -- "Robust Speech Recognition via Large-Scale Weak Supervision"

---

## 1. What Whisper Is

Whisper is an encoder-decoder Transformer trained on **680,000 hours** of weakly supervised audio from the internet. Unlike prior work that required fine-tuning per dataset, Whisper generalizes zero-shot across domains, accents, and noise conditions. On the Kincaid46 benchmark, its WER is within 1 percentage point of professional human transcribers.

The key insight: scaling weakly supervised pre-training to 680K hours (vs ~1K hours in academic datasets) eliminates the need for dataset-specific fine-tuning. The model learns to handle punctuation, capitalization, and formatting directly, replacing the traditional inverse text normalization pipeline.

**Key files:**

- [`whisper/model.py`](../../../go-research/external_code/whisper/whisper/model.py) -- Model architecture (encoder, decoder, attention)
- [`whisper/audio.py`](../../../go-research/external_code/whisper/whisper/audio.py) -- Audio preprocessing, mel spectrogram
- [`whisper/tokenizer.py`](../../../go-research/external_code/whisper/whisper/tokenizer.py) -- BPE tokenizer, special tokens, timestamp tokens
- [`whisper/decoding.py`](../../../go-research/external_code/whisper/whisper/decoding.py) -- Decoding loop, beam search, logit filters
- [`whisper/transcribe.py`](../../../go-research/external_code/whisper/whisper/transcribe.py) -- Main transcription pipeline, sliding window
- [`whisper/timing.py`](../../../go-research/external_code/whisper/whisper/timing.py) -- Word-level timestamps via cross-attention DTW

---

## 2. Architecture Overview

```
Audio (16kHz) --> Mel Spectrogram (80/128 bands) --> [Conv Stem + Transformer Encoder] --> [Transformer Decoder with Cross-Attention] --> Text Tokens
```

The architecture is a standard encoder-decoder Transformer with two notable choices:

1. A convolutional stem (not learned embeddings) for the audio input
2. A multitask training format that handles transcription, translation, language ID, and VAD through special tokens

### Model Sizes

From [`model.py`](../../../go-research/external_code/whisper/whisper/model.py) `ModelDimensions` and the paper Table 1:

| Model    | Layers (enc/dec) | Width | Heads | Head dim | FFN dim | Params |
| -------- | ---------------- | ----- | ----- | -------- | ------- | ------ |
| tiny     | 4 / 4            | 384   | 6     | 64       | 1536    | 39M    |
| base     | 6 / 6            | 512   | 8     | 64       | 2048    | 74M    |
| small    | 12 / 12          | 768   | 12    | 64       | 3072    | 244M   |
| medium   | 24 / 24          | 1024  | 16    | 64       | 4096    | 769M   |
| large-v3 | 32 / 32          | 1280  | 20    | 64       | 5120    | 1550M  |
| turbo    | 32 / **4**       | 1280  | 20    | 64       | 5120    | 809M   |

Key observations:

- Encoder and decoder always have the **same width** but turbo slashes decoder from 32 to 4 layers (the core speed trick -- same encoder quality, much faster decoding).
- Head dimension is always 64, FFN is always 4x width.
- large-v3 increased mel bands from 80 to 128 and added Cantonese (vocab 51866 vs 51865).

---

## 3. Audio Preprocessing -- `audio.py`

### Hard-coded constants

[`audio.py:12-22`](../../../go-research/external_code/whisper/whisper/audio.py)

```python
# hard-coded audio hyperparameters
SAMPLE_RATE = 16000
N_FFT = 400
HOP_LENGTH = 160
CHUNK_LENGTH = 30
N_SAMPLES = CHUNK_LENGTH * SAMPLE_RATE  # 480000 samples in a 30-second chunk
N_FRAMES = exact_div(N_SAMPLES, HOP_LENGTH)  # 3000 frames in a mel spectrogram input

N_SAMPLES_PER_TOKEN = HOP_LENGTH * 2  # the initial convolutions has stride 2
FRAMES_PER_SECOND = exact_div(SAMPLE_RATE, HOP_LENGTH)  # 10ms per audio frame
TOKENS_PER_SECOND = exact_div(SAMPLE_RATE, N_SAMPLES_PER_TOKEN)  # 20ms per audio token
```

| Constant            | Value      | Meaning                           |
| ------------------- | ---------- | --------------------------------- |
| `SAMPLE_RATE`       | 16,000 Hz  |                                   |
| `N_FFT`             | 400        | 25ms window at 16kHz              |
| `HOP_LENGTH`        | 160        | 10ms hop at 16kHz                 |
| `CHUNK_LENGTH`      | 30 seconds | Fixed processing window           |
| `N_SAMPLES`         | 480,000    | 30s \* 16kHz                      |
| `N_FRAMES`          | 3,000      | 480000 / 160 mel frames           |
| `TOKENS_PER_SECOND` | 50         | After conv2 stride-2: 100 fps / 2 |

Each encoder token represents **20ms** of audio. The 30-second chunk produces exactly **1500 encoder tokens** (3000 mel frames / 2 from the stride-2 convolution).

### Audio loading

Uses `ffmpeg` as a subprocess to decode any audio format, downmix to mono, resample to 16kHz, output raw PCM s16le. Normalized to float32 by dividing by 32768.0.

### Mel spectrogram computation

[`audio.py:110-157`](../../../go-research/external_code/whisper/whisper/audio.py)

```python
def log_mel_spectrogram(
    audio: Union[str, np.ndarray, torch.Tensor],
    n_mels: int = 80,
    padding: int = 0,
    device: Optional[Union[str, torch.device]] = None,
):
    if not torch.is_tensor(audio):
        if isinstance(audio, str):
            audio = load_audio(audio)
        audio = torch.from_numpy(audio)

    if device is not None:
        audio = audio.to(device)
    if padding > 0:
        audio = F.pad(audio, (0, padding))
    window = torch.hann_window(N_FFT).to(audio.device)
    stft = torch.stft(audio, N_FFT, HOP_LENGTH, window=window, return_complex=True)
    magnitudes = stft[..., :-1].abs() ** 2

    filters = mel_filters(audio.device, n_mels)
    mel_spec = filters @ magnitudes

    log_spec = torch.clamp(mel_spec, min=1e-10).log10()
    log_spec = torch.maximum(log_spec, log_spec.max() - 8.0)
    log_spec = (log_spec + 4.0) / 4.0
    return log_spec
```

Steps:

1. Hann window, size 400 (25ms)
2. STFT with `torch.stft(audio, n_fft=400, hop_length=160)`
3. Squared magnitude: `stft[..., :-1].abs() ** 2`
4. Mel filterbank (80 or 128 bands) from `assets/mel_filters.npz`, originally `librosa.filters.mel(sr=16000, n_fft=400, n_mels=80)`
5. Log scaling with clamping: `clamp(1e-10) -> log10 -> clamp(max - 8.0) -> (log_spec + 4.0) / 4.0`

The normalization maps to roughly [-1, 1]. The `+4.0` shift and `/4.0` compress the 80dB dynamic range.

### The 30-second window constraint

`pad_or_trim` ensures every input is exactly 480,000 samples. Shorter audio is **zero-padded**; longer audio is truncated. This means a 2-second utterance still processes 30 seconds of (mostly silent) mel spectrogram -- a major efficiency problem that Moonshine solves.

---

## 4. The Encoder -- `model.py:174-204`

[`model.py:174-204`](../../../go-research/external_code/whisper/whisper/model.py)

```python
class AudioEncoder(nn.Module):
    def __init__(
        self, n_mels: int, n_ctx: int, n_state: int, n_head: int, n_layer: int
    ):
        super().__init__()
        self.conv1 = Conv1d(n_mels, n_state, kernel_size=3, padding=1)
        self.conv2 = Conv1d(n_state, n_state, kernel_size=3, stride=2, padding=1)
        self.register_buffer("positional_embedding", sinusoids(n_ctx, n_state))

        self.blocks: Iterable[ResidualAttentionBlock] = nn.ModuleList(
            [ResidualAttentionBlock(n_state, n_head) for _ in range(n_layer)]
        )
        self.ln_post = LayerNorm(n_state)

    def forward(self, x: Tensor):
        x = F.gelu(self.conv1(x))
        x = F.gelu(self.conv2(x))
        x = x.permute(0, 2, 1)

        assert x.shape[1:] == self.positional_embedding.shape, "incorrect audio shape"
        x = (x + self.positional_embedding).to(x.dtype)

        for block in self.blocks:
            x = block(x)

        x = self.ln_post(x)
        return x
```

Output: `(batch, 1500, n_state)` -- 1500 tokens, each representing 20ms of audio.

The convolutional stem is minimal: just two 1D convolutions. The stride-2 in conv2 reduces the sequence length from 3000 to 1500, which halves the quadratic attention cost.

**Fixed sinusoidal positional embeddings** ([`model.py:62-68`](../../../go-research/external_code/whisper/whisper/model.py)):

```python
def sinusoids(length, channels, max_timescale=10000):
    """Returns sinusoids for positional embedding"""
    assert channels % 2 == 0
    log_timescale_increment = np.log(max_timescale) / (channels // 2 - 1)
    inv_timescales = torch.exp(-log_timescale_increment * torch.arange(channels // 2))
    scaled_time = torch.arange(length)[:, np.newaxis] * inv_timescales[np.newaxis, :]
    return torch.cat([torch.sin(scaled_time), torch.cos(scaled_time)], dim=1)
```

Unlike the decoder which uses learned positions. Generated as `sin/cos` on alternating dimensions with standard Transformer frequency scaling.

---

## 5. The Decoder -- `model.py:207-249`

[`model.py:207-249`](../../../go-research/external_code/whisper/whisper/model.py)

```python
class TextDecoder(nn.Module):
    def __init__(
        self, n_vocab: int, n_ctx: int, n_state: int, n_head: int, n_layer: int
    ):
        super().__init__()

        self.token_embedding = nn.Embedding(n_vocab, n_state)
        self.positional_embedding = nn.Parameter(torch.empty(n_ctx, n_state))

        self.blocks: Iterable[ResidualAttentionBlock] = nn.ModuleList(
            [
                ResidualAttentionBlock(n_state, n_head, cross_attention=True)
                for _ in range(n_layer)
            ]
        )
        self.ln = LayerNorm(n_state)

        mask = torch.empty(n_ctx, n_ctx).fill_(-np.inf).triu_(1)
        self.register_buffer("mask", mask, persistent=False)

    def forward(self, x: Tensor, xa: Tensor, kv_cache: Optional[dict] = None):
        offset = next(iter(kv_cache.values())).shape[1] if kv_cache else 0
        x = (
            self.token_embedding(x)
            + self.positional_embedding[offset : offset + x.shape[-1]]
        )
        x = x.to(xa.dtype)

        for block in self.blocks:
            x = block(x, xa, mask=self.mask, kv_cache=kv_cache)

        x = self.ln(x)
        logits = (
            x @ torch.transpose(self.token_embedding.weight.to(x.dtype), 0, 1)
        ).float()

        return logits
```

Key differences from the encoder:

- **Learned** positional embeddings (encoder uses fixed sinusoidal)
- **Cross-attention** to encoder output in every block
- **Causal mask** (upper-triangular -inf) for autoregressive generation
- **Weight tying**: output logits reuse the token embedding matrix -- no separate projection layer

### Context window split

The decoder context is 448 tokens, split:

- Up to 224 for **prompt** (previous text conditioning)
- Up to 224 for **new generation**

This means the model can only generate ~224 tokens per 30-second chunk.

---

## 6. Attention Details -- `model.py:81-139`

### ResidualAttentionBlock

[`model.py:142-171`](../../../go-research/external_code/whisper/whisper/model.py)

Each block: `Pre-LN Self-Attention -> Pre-LN Cross-Attention (optional) -> Pre-LN FFN`

The FFN is `Linear(d, 4d) -> GELU -> Linear(4d, d)`.

### MultiHeadAttention tricks

[`model.py:81-139`](../../../go-research/external_code/whisper/whisper/model.py)

```python
class MultiHeadAttention(nn.Module):
    use_sdpa = True

    def __init__(self, n_state: int, n_head: int):
        super().__init__()
        self.n_head = n_head
        self.query = Linear(n_state, n_state)
        self.key = Linear(n_state, n_state, bias=False)
        self.value = Linear(n_state, n_state)
        self.out = Linear(n_state, n_state)

    def forward(self, x, xa=None, mask=None, kv_cache=None):
        q = self.query(x)
        if kv_cache is None or xa is None or self.key not in kv_cache:
            k = self.key(x if xa is None else xa)
            v = self.value(x if xa is None else xa)
        else:
            # for cross-attention, calculate keys and values once and reuse
            k = kv_cache[self.key]
            v = kv_cache[self.value]
        wv, qk = self.qkv_attention(q, k, v, mask)
        return self.out(wv), qk

    def qkv_attention(self, q, k, v, mask=None):
        n_batch, n_ctx, n_state = q.shape
        scale = (n_state // self.n_head) ** -0.25          # <-- split scaling
        q = q.view(*q.shape[:2], self.n_head, -1).permute(0, 2, 1, 3)
        k = k.view(*k.shape[:2], self.n_head, -1).permute(0, 2, 1, 3)
        v = v.view(*v.shape[:2], self.n_head, -1).permute(0, 2, 1, 3)

        if SDPA_AVAILABLE and MultiHeadAttention.use_sdpa:
            a = scaled_dot_product_attention(q, k, v, is_causal=mask is not None and n_ctx > 1)
            out = a.permute(0, 2, 1, 3).flatten(start_dim=2)
            qk = None
        else:
            qk = (q * scale) @ (k * scale).transpose(-1, -2)  # <-- scale applied to Q and K separately
            if mask is not None:
                qk = qk + mask[:n_ctx, :n_ctx]
            qk = qk.float()
            w = F.softmax(qk, dim=-1).to(q.dtype)
            out = (w @ v).permute(0, 2, 1, 3).flatten(start_dim=2)
            qk = qk.detach()
        return out, qk
```

1. **Split scaling**: Instead of `scale = 1/sqrt(d_k)` on the QK product, applies `d_k^{-0.25}` to Q and K separately before the dot product. Mathematically identical but avoids fp16 overflow when QK values are large pre-scaling.

2. **Key has no bias**: `nn.Linear(n_state, n_state, bias=False)` for keys, all others have bias. This is a minor memory/compute saving.

3. **Cross-attention caching**: Keys and values for the encoder output are computed once and reused across all decoder steps. This is the standard optimization for encoder-decoder models.

### KV Cache via Forward Hooks

[`model.py:310-341`](../../../go-research/external_code/whisper/whisper/model.py)

```python
def install_kv_cache_hooks(self, cache: Optional[dict] = None):
    cache = {**cache} if cache is not None else {}
    hooks = []

    def save_to_cache(module, _, output):
        if module not in cache or output.shape[1] > self.dims.n_text_ctx:
            # save as-is, for the first token or cross attention
            cache[module] = output
        else:
            cache[module] = torch.cat([cache[module], output], dim=1).detach()
        return cache[module]

    def install_hooks(layer: nn.Module):
        if isinstance(layer, MultiHeadAttention):
            hooks.append(layer.key.register_forward_hook(save_to_cache))
            hooks.append(layer.value.register_forward_hook(save_to_cache))

    self.decoder.apply(install_hooks)
    return cache, hooks
```

Rather than modifying the attention code, Whisper installs PyTorch `register_forward_hook` on key/value projection layers. The hook intercepts outputs and concatenates to a cache tensor. Elegant: avoids changing the attention forward pass at all.

### Mixed Precision Wrappers

[`model.py:39-59`](../../../go-research/external_code/whisper/whisper/model.py)

```python
class LayerNorm(nn.LayerNorm):
    def forward(self, x: Tensor) -> Tensor:
        return super().forward(x.float()).type(x.dtype)

class Linear(nn.Linear):
    def forward(self, x: Tensor) -> Tensor:
        return F.linear(
            x,
            self.weight.to(x.dtype),
            None if self.bias is None else self.bias.to(x.dtype),
        )

class Conv1d(nn.Conv1d):
    def _conv_forward(self, x, weight, bias):
        return super()._conv_forward(
            x, weight.to(x.dtype), None if bias is None else bias.to(x.dtype)
        )
```

Custom `LayerNorm` casts to float32 for normalization, then back to input dtype. Custom `Linear`/`Conv1d` cast weights to input dtype. This allows fp16 inference while keeping normalization numerically stable.

---

## 7. Tokenizer -- `tokenizer.py`

### Vocabulary

Uses **tiktoken** (OpenAI's BPE) with the GPT-2 tokenization regex pattern. Two encodings:

- `gpt2` for English-only models
- `multilingual` with refit vocabulary for multilingual models

### Special tokens layout

[`tokenizer.py:340-355`](../../../go-research/external_code/whisper/whisper/tokenizer.py)

Appended after the base BPE vocabulary in exact order:

1. `<|endoftext|>` (EOT)
2. `<|startoftranscript|>` (SOT)
3. **99-100 language tokens**: `<|en|>`, `<|zh|>`, `<|de|>`, ... (100 for v3, adds `<|yue|>` Cantonese)
4. `<|translate|>`, `<|transcribe|>`
5. `<|startoflm|>`, `<|startofprev|>`, `<|nospeech|>`, `<|notimestamps|>`
6. **1501 timestamp tokens**: `<|0.00|>` through `<|30.00|>` at 0.02s resolution

The 0.02s timestamp resolution matches TOKENS_PER_SECOND = 50 (1/50 = 0.02s).

### Multitask format

The decoder's initial token sequence encodes the task:

```
[<|startoftranscript|>] [<|language|>] [<|transcribe|> or <|translate|>] [<|notimestamps|> (optional)]
```

This is how one model handles transcription, translation, and language ID -- through the token prefix, not separate model heads.

---

## 8. Decoding Pipeline -- `decoding.py`

### Temperature fallback

[`transcribe.py:184-224`](../../../go-research/external_code/whisper/whisper/transcribe.py)

```python
def decode_with_fallback(segment: torch.Tensor) -> DecodingResult:
    temperatures = (
        [temperature] if isinstance(temperature, (int, float)) else temperature
    )
    decode_result = None

    for t in temperatures:
        kwargs = {**decode_options}
        if t > 0:
            # disable beam_size and patience when t > 0
            kwargs.pop("beam_size", None)
            kwargs.pop("patience", None)
        else:
            # disable best_of when t == 0
            kwargs.pop("best_of", None)

        options = DecodingOptions(**kwargs, temperature=t)
        decode_result = model.decode(segment, options)

        needs_fallback = False
        if (
            compression_ratio_threshold is not None
            and decode_result.compression_ratio > compression_ratio_threshold
        ):
            needs_fallback = True  # too repetitive
        if (
            logprob_threshold is not None
            and decode_result.avg_logprob < logprob_threshold
        ):
            needs_fallback = True  # average log probability is too low
        if (
            no_speech_threshold is not None
            and decode_result.no_speech_prob > no_speech_threshold
            and logprob_threshold is not None
            and decode_result.avg_logprob < logprob_threshold
        ):
            needs_fallback = False  # silence
        if not needs_fallback:
            break

    return decode_result
```

Default schedule: `(0.0, 0.2, 0.4, 0.6, 0.8, 1.0)`. For each segment:

1. Start with temperature 0.0 (greedy/beam search)
2. Check quality:
   - **Compression ratio > 2.4**: gzip ratio of decoded text -- high values mean repetitive text (hallucination)
   - **Average log probability < -1.0**: low confidence
3. If either fails, retry with next temperature
4. At temperature > 0, beam search is disabled -- uses sampling with best_of instead

### Timestamp rules -- the most complex filter

[`decoding.py:441-505`](../../../go-research/external_code/whisper/whisper/decoding.py)

`ApplyTimestampRules` enforces:

1. Timestamps must appear in **pairs** (start, end)
2. Timestamps must be **monotonically increasing**
3. First token must be a timestamp
4. `max_initial_timestamp` limits the first timestamp (default 1.0s)
5. **Timestamp forcing**: when sum of timestamp probabilities exceeds max text token probability, all text tokens are suppressed -- forces a timestamp emission

```python
class ApplyTimestampRules(LogitFilter):
    def apply(self, logits: Tensor, tokens: Tensor):
        # suppress <|notimestamps|>
        if self.tokenizer.no_timestamps is not None:
            logits[:, self.tokenizer.no_timestamps] = -np.inf

        # timestamps have to appear in pairs, except directly before EOT
        for k in range(tokens.shape[0]):
            sampled_tokens = tokens[k, self.sample_begin :]
            seq = [t for t in sampled_tokens.tolist()]
            last_was_timestamp = len(seq) >= 1 and seq[-1] >= self.tokenizer.timestamp_begin
            penultimate_was_timestamp = len(seq) < 2 or seq[-2] >= self.tokenizer.timestamp_begin

            if last_was_timestamp:
                if penultimate_was_timestamp:  # has to be non-timestamp
                    logits[k, self.tokenizer.timestamp_begin :] = -np.inf
                else:  # cannot be normal text tokens
                    logits[k, : self.tokenizer.eot] = -np.inf

            timestamps = sampled_tokens[sampled_tokens.ge(self.tokenizer.timestamp_begin)]
            if timestamps.numel() > 0:
                # timestamps shouldn't decrease; force nonzero length segments
                if last_was_timestamp and not penultimate_was_timestamp:
                    timestamp_last = timestamps[-1]
                else:
                    timestamp_last = timestamps[-1] + 1
                logits[k, self.tokenizer.timestamp_begin : timestamp_last] = -np.inf

        if tokens.shape[1] == self.sample_begin:
            # suppress non-timestamp tokens at the beginning
            logits[:, : self.tokenizer.timestamp_begin] = -np.inf
            if self.max_initial_timestamp_index is not None:
                last_allowed = self.tokenizer.timestamp_begin + self.max_initial_timestamp_index
                logits[:, last_allowed + 1 :] = -np.inf

        # if sum of probability over timestamps > any text token, force timestamp
        logprobs = F.log_softmax(logits.float(), dim=-1)
        for k in range(tokens.shape[0]):
            timestamp_logprob = logprobs[k, self.tokenizer.timestamp_begin :].logsumexp(dim=-1)
            max_text_token_logprob = logprobs[k, : self.tokenizer.timestamp_begin].max()
            if timestamp_logprob > max_text_token_logprob:
                logits[k, : self.tokenizer.timestamp_begin] = -np.inf
```

### No-speech detection

At the first decoding step, the softmax probability for `<|nospeech|>` is captured. If > 0.6 and avg_logprob < -1.0, the segment is skipped as silence.

### Beam search

[`decoding.py:301-404`](../../../go-research/external_code/whisper/whisper/decoding.py)

Standard beam search with patience. At each step:

- Top `beam_size + 1` candidates per beam
- Cumulative log probabilities tracked
- Finished sequences (ending in EOT) stored separately
- KV cache rearranged for new beam ordering

---

## 9. Transcription Pipeline -- `transcribe.py`

The main loop processes audio longer than 30 seconds with a sliding window:

### Sliding window

[`transcribe.py:272-399`](../../../go-research/external_code/whisper/whisper/transcribe.py)

1. Compute mel for entire audio + 30s of silence padding
2. Language detection on first 30s segment (if auto)
3. Main loop advances a `seek` pointer across mel frames:
   - Extract up to 3000 mel frames, pad to exactly 3000
   - Decode with temperature fallback
   - Advance seek based on predicted timestamps

The core of the sliding window loop:

```python
while clip_idx < len(seek_clips):
    seek_clip_start, seek_clip_end = seek_clips[clip_idx]
    if seek >= seek_clip_end:
        clip_idx += 1
        continue
    time_offset = float(seek * HOP_LENGTH / SAMPLE_RATE)
    segment_size = min(N_FRAMES, content_frames - seek, seek_clip_end - seek)
    mel_segment = mel[:, seek : seek + segment_size]
    mel_segment = pad_or_trim(mel_segment, N_FRAMES).to(model.device).to(dtype)

    result: DecodingResult = decode_with_fallback(mel_segment)
    tokens = torch.tensor(result.tokens)

    # Find consecutive timestamp tokens to split segments
    timestamp_tokens = tokens.ge(tokenizer.timestamp_begin)
    consecutive = torch.where(timestamp_tokens[:-1] & timestamp_tokens[1:])[0]
    consecutive.add_(1)

    if len(consecutive) > 0:
        # Split at consecutive timestamp boundaries
        slices = consecutive.tolist()
        last_slice = 0
        for current_slice in slices:
            sliced_tokens = tokens[last_slice:current_slice]
            start_timestamp_pos = sliced_tokens[0].item() - tokenizer.timestamp_begin
            end_timestamp_pos = sliced_tokens[-1].item() - tokenizer.timestamp_begin
            current_segments.append(new_segment(
                start=time_offset + start_timestamp_pos * time_precision,
                end=time_offset + end_timestamp_pos * time_precision,
                tokens=sliced_tokens, result=result,
            ))
            last_slice = current_slice
        # Seek to the last timestamp
        last_timestamp_pos = tokens[last_slice - 1].item() - tokenizer.timestamp_begin
        seek += last_timestamp_pos * input_stride
    else:
        # No consecutive timestamps -- advance by full segment
        seek += segment_size
```

### Seek advancement

If output contains **consecutive timestamp tokens** (e.g., `text <|2.50|><|2.50|> text`), the segment is split at those boundaries. Otherwise, seek advances by the full 3000 frames.

### Previous text conditioning

When `condition_on_previous_text=True` (default), all previously decoded tokens are passed as the prompt. This provides context but can propagate errors. Reset if temperature exceeded 0.5.

### Hallucination detection

[`transcribe.py:419-472`](../../../go-research/external_code/whisper/whisper/transcribe.py)

When `word_timestamps=True`, detects anomalous words (probability < 0.15, duration < 133ms or > 2s). If surrounded by silence exceeding a threshold, the segment is skipped.

---

## 10. Word-Level Timestamps -- `timing.py`

### Cross-attention DTW alignment

[`timing.py:163-242`](../../../go-research/external_code/whisper/whisper/timing.py)

1. Run model forward with SDPA disabled (to get raw attention weights)
2. Extract QK weights from specific **alignment heads** (pre-identified per model size, stored in `_ALIGNMENT_HEADS`)
3. Median filter (width=7) for smoothing
4. Average across selected heads
5. **Dynamic Time Warping (DTW)** on the negative attention matrix

DTW implementations: CPU via numba JIT, GPU via Triton kernel.

---

## 11. Training Details (from the paper)

### Dataset

680,000 hours from the internet:

- 117,000 hours covering 96 non-English languages
- 125,000 hours of X->en translation data
- Rest is English transcription

Audio broken into 30-second segments paired with transcript subsets. Segments with no speech used for VAD training data.

### Data filtering

- Automated removal of machine-generated transcripts (avoid "transcript-ese")
- Audio language detector (fine-tuned VoxLingua107) to verify language matches
- Fuzzy de-duping of transcripts
- Manual inspection pass removing high-error-rate sources
- Transcript-level de-duplication against evaluation datasets

### Training

- FP16 with dynamic loss scaling and activation checkpointing
- AdamW with gradient norm clipping
- Linear LR decay to zero after 2048 warmup steps
- Batch size 256, trained for 2^20 updates (2-3 passes over dataset)
- No data augmentation or regularization
- Large V2 added SpecAugment, Stochastic Depth, BPE Dropout for regularization

### Multitask format

All tasks encoded as token sequences (paper Figure 1):

- `<|startoftranscript|>` -> language tag -> `<|transcribe|>` or `<|translate|>` -> timestamps -> text -> `<|endoftext|>`
- No-speech segments: `<|nospeech|>`
- Previous text conditioning via `<|startofprev|>` prefix

---

## 12. Key Results (from the paper)

### Zero-shot robustness

Whisper Large V2 achieves 2.7% WER on LibriSpeech test-clean. But the real story is **robustness**: on 12 out-of-distribution datasets, it achieves 55.2% relative error reduction vs a supervised LibriSpeech model with the same in-distribution WER.

### Scaling behavior

- Performance scales smoothly with both model size and dataset size
- WER halves for every 16x increase in training data (log-linear relationship, R^2 = 0.83)
- Diminishing returns above 54,000 hours for English -- may be approaching human-level saturation
- Multilingual and multitask models benefit more from scale than English-only

### Long-form transcription heuristics (paper Table 7)

Each intervention reduces average WER incrementally:
| Strategy | Average WER |
|----------|-------------|
| Greedy only | 11.0 |
| + Beam search | 10.6 |
| + Temperature fallback | 10.6 |
| + VAD detection | 10.2 |
| + Previous text conditioning | 10.0 |
| + Initial timestamp constraint | 10.0 |

### Noise robustness

Whisper outperforms LibriSpeech-trained models under high noise (SNR < 10 dB) because its training data includes diverse real-world recording conditions.

---

## 13. Why Whisper Matters for Voice Agents

### Strengths

1. **Zero-shot generalization**: no fine-tuning needed for new domains
2. **Robust to noise**: trained on real-world internet audio
3. **Multitask**: one model does transcription, translation, language ID, timestamps
4. **Well-understood**: most studied open-source ASR model, huge ecosystem (faster-whisper, whisper.cpp, etc.)

### Weaknesses for real-time use

1. **30-second fixed window**: a 2-second command still processes 30 seconds of mel spectrogram
2. **Quadratic attention**: TTFT grows quadratically with utterance length
3. **Autoregressive decoder**: sequential token generation adds latency
4. **No native streaming**: must wait for the full utterance before decoding begins

These weaknesses are exactly what Moonshine v2 addresses with its sliding-window encoder and variable-length input.

---

## 14. Sources

- [Whisper paper (arXiv 2212.04356)](https://arxiv.org/abs/2212.04356)
- [Whisper GitHub](https://github.com/openai/whisper)
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) -- CTranslate2 backend, up to 8.9x faster
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) -- C/C++ port with ggml
