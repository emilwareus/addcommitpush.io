# Moonshine v2 STT -- Deep Research Report

How an ergodic streaming encoder achieves Whisper-level accuracy at a fraction of the latency, and why it matters for edge voice agents.

**Based on:**

- [Moonshine source code](../../../go-research/external_code/moonshine/)
- [Moonshine v2 paper (Kudlur et al., Feb 2026)](../../../go-research/external_code/moonshine/moonshine_v2_paper_2602.12241.pdf) -- "Ergodic Streaming Encoder ASR for Latency-Critical Speech Applications"
- [Original Moonshine paper (Jeffries et al., 2024)](https://arxiv.org/abs/2410.15608) -- "Speech recognition for live transcription and voice commands"

---

## 1. What Moonshine v2 Is

Moonshine v2 is a family of streaming ASR models designed for **latency-critical edge deployment**. The key innovation: replacing Whisper's full-attention encoder with a **sliding-window ("ergodic") encoder** that achieves bounded, constant-time-to-first-token regardless of utterance length.

The results are dramatic. On an Apple M3:

- Moonshine v2 Tiny: **50ms** latency (5.8x faster than Whisper Tiny at 289ms)
- Moonshine v2 Small: **148ms** latency (13.1x faster than Whisper Small at 1940ms)
- Moonshine v2 Medium: **258ms** latency (43.7x faster than Whisper Large-v3 at 11286ms)

And accuracy matches models **6x their size** on Open ASR benchmarks.

**Key files:**

- [`core/moonshine-model.cpp`](../../../go-research/external_code/moonshine/core/moonshine-model.cpp) -- Non-streaming model inference, dimensions at lines 40-54
- [`core/moonshine-streaming-model.cpp`](../../../go-research/external_code/moonshine/core/moonshine-streaming-model.cpp) -- Streaming 5-stage pipeline (frontend, encoder, adapter, cross_kv, decoder_kv)
- [`core/moonshine-streaming-model.h`](../../../go-research/external_code/moonshine/core/moonshine-streaming-model.h) -- Streaming state and config structs
- [`core/transcriber.h`](../../../go-research/external_code/moonshine/core/transcriber.h) -- High-level pipeline with VAD and speaker ID
- [`core/bin-tokenizer/bin-tokenizer.cpp`](../../../go-research/external_code/moonshine/core/bin-tokenizer/bin-tokenizer.cpp) -- Custom binary tokenizer
- [`core/voice-activity-detector.h`](../../../go-research/external_code/moonshine/core/voice-activity-detector.h) -- Silero VAD integration

---

## 2. The Core Problem Moonshine Solves

### Why Whisper is slow for real-time

Whisper's encoder uses **full self-attention**: every frame attends to every other frame. This has two consequences:

1. Attention cost is **O(T^2)** in sequence length
2. The encoder must process the **entire utterance** before any decoder token can be emitted

For a 100M-parameter encoder at 0.1 TOPS (typical edge device), the Moonshine paper shows TTFT crosses the 250ms interactive voice limit at just 4.1 seconds of audio (paper Figure 1).

### Moonshine's solution: sliding-window attention

Replace full attention with a fixed window `(w_left, w_right)`:

- Attention cost becomes **O(T \* w)** -- linear in sequence length
- The encoder can emit representations incrementally as local context arrives
- TTFT becomes **bounded and constant**, regardless of utterance length

---

## 3. Architecture -- Four-Stage Pipeline

```
Raw Audio (16kHz) --> [Audio Preprocessor] --> [Streaming Encoder] --> [Adapter] --> [Decoder with Cross-Attention]
```

### Model Dimensions in C++

[`moonshine-model.cpp:40-57`](../../../go-research/external_code/moonshine/core/moonshine-model.cpp)

```cpp
// Tiny settings.
#define MOONSHINE_TINY_NUM_LAYERS 6
#define MOONSHINE_TINY_NUM_KV_HEADS 8
#define MOONSHINE_TINY_HEAD_DIM 36

#define MOONSHINE_TINY_PAST_ELEMENT_COUNT \
  (MOONSHINE_TINY_NUM_KV_HEADS * MOONSHINE_TINY_HEAD_DIM)

// Base settings.
#define MOONSHINE_BASE_NUM_LAYERS 8
#define MOONSHINE_BASE_NUM_KV_HEADS 8
#define MOONSHINE_BASE_HEAD_DIM 52

#define MOONSHINE_BASE_PAST_ELEMENT_COUNT \
  (MOONSHINE_BASE_NUM_KV_HEADS * MOONSHINE_BASE_HEAD_DIM)

#define MOONSHINE_DECODER_START_TOKEN_ID 1
#define MOONSHINE_EOS_TOKEN_ID 2
```

### Model Sizes

From the paper Table 1:

| Model  | Enc dim | Dec dim | Layers (Enc/Dec) | Pre    | Enc    | Adap  | Dec     | Total       |
| ------ | ------- | ------- | ---------------- | ------ | ------ | ----- | ------- | ----------- |
| Tiny   | 320     | 320     | 6/6              | 2.08M  | 7.39M  | 1.31M | 22.80M  | **33.57M**  |
| Small  | 620     | 512     | 10/10            | 7.74M  | 43.49M | 2.86M | 69.27M  | **123.36M** |
| Medium | 768     | 640     | 14/14            | 11.86M | 93.66M | 3.64M | 135.77M | **244.93M** |

Note: the **decoder has substantially more parameters than the encoder** because each decoder layer includes cross-attention projections (in addition to self-attention) and uses SwiGLU feed-forward blocks while the encoder does not.

---

## 4. Audio Preprocessor -- Learned Frontend, Not Mel Spectrograms

This is one of Moonshine's key innovations. From the paper Section 3.1:

> "Our audio preprocessor is intentionally lightweight: it converts raw audio to a 50 Hz feature sequence using simple operations with no right context."

### Pipeline

[Paper Figure 3](../../../go-research/external_code/moonshine/moonshine_v2_paper_2602.12241.pdf)

```
Raw waveform [1, N]
  --> Frame Blocking: non-overlapping 80-sample windows (5ms at 16kHz) --> [1, T, 80]
  --> Per-frame CMVN (cepstral mean and variance normalization)
  --> asinh nonlinearity (smooth, nearly linear near zero, log-like for large values)
  --> Linear + SiLU --> [1, T, dim]
  --> Causal Conv1 (stride 2) --> [1, T/2, dim]
  --> Causal Conv2 (stride 2) --> [1, T/4, dim]
```

The two causal stride-2 convolutions reduce the frame rate by 4x: from ~200 fps (80-sample frames at 16kHz) to **~50 fps** -- matching Whisper's feature rate for easy comparison.

### Why not mel spectrograms?

1. **No STFT needed** -- raw waveform input avoids the non-trivial mel computation
2. **Learned features** -- the linear + convolution layers learn task-optimal representations
3. **Streamable** -- causal convolutions process audio incrementally (the streaming model maintains conv buffer state across chunks)
4. **Quantization-friendly** -- the paper notes that the frontend requires at least B16 precision since inputs correspond to 16-bit audio values

### Streaming state -- Frontend ONNX session

[`moonshine-streaming-model.cpp:416-577`](../../../go-research/external_code/moonshine/core/moonshine-streaming-model.cpp)

The frontend ONNX session takes raw audio plus five state buffers, and returns features plus updated state:

```cpp
int MoonshineStreamingModel::process_audio_chunk(MoonshineStreamingState *state,
                                                 const float *audio_chunk,
                                                 size_t chunk_len,
                                                 int *features_out) {
  // Prepare input tensors -- raw audio + persistent state buffers
  std::vector<float> audio_vec(audio_chunk, audio_chunk + chunk_len);
  std::vector<int64_t> audio_shape = {1, static_cast<int64_t>(chunk_len)};
  std::vector<int64_t> sample_buffer_shape = {1, 79};
  std::vector<int64_t> conv1_shape = {1, config.d_model_frontend, 4};
  std::vector<int64_t> conv2_shape = {1, config.c1, 4};
  std::vector<int64_t> frame_count_shape = {1};

  // ... ORT tensor creation ...

  // Run frontend
  const char *input_names[] = {"audio_chunk",  "sample_buffer", "sample_len",
                               "conv1_buffer", "conv2_buffer",  "frame_count"};
  const char *output_names[] = {"features",         "sample_buffer_out",
                                "sample_len_out",   "conv1_buffer_out",
                                "conv2_buffer_out", "frame_count_out"};
  OrtStatus *status = ORT_RUN(ort_api, frontend_session, input_names, inputs, 6,
                              output_names, 6, outputs);

  // Accumulate features into state
  if (num_features > 0) {
    float *feat_data = nullptr;
    ort_api->GetTensorMutableData(outputs[0], (void **)&feat_data);
    state->accumulated_features.insert(state->accumulated_features.end(),
                                       feat_data, feat_data + feat_size);
    state->accumulated_feature_count += num_features;
  }

  // Update persistent state from outputs
  memcpy(state->sample_buffer.data(), sample_buffer_out, 79 * sizeof(float));
  state->sample_len = *sample_len_out;
  memcpy(state->conv1_buffer.data(), conv1_out, config.d_model_frontend * 4 * sizeof(float));
  memcpy(state->conv2_buffer.data(), conv2_out, config.c1 * 4 * sizeof(float));
  state->frame_count = *frame_count_out;
  // ...
}
```

The frontend maintains three buffers across chunks:

- `sample_buffer[79]` -- residual raw samples
- `conv1_buffer[d_model*4]` -- conv1 state
- `conv2_buffer[c1*4]` -- conv2 state

---

## 5. The Ergodic Streaming Encoder

### Sliding-window self-attention

The encoder is a standard Transformer stack with one critical change: each layer uses **sliding-window attention** instead of full attention. Window sizes are specified as `(w_left, w_right)` in frames.

From the paper Section 3.2:

In Moonshine v2:

- First two and last two encoder layers: **(16, 4)**
- All intermediate layers: **(16, 0)** -- strictly causal

This means:

- **Left context**: 16 frames = 320ms of past audio
- **Right context (lookahead)**: 4 frames = 80ms of future audio (only in boundary layers)
- **Total lookahead**: 4 \* 20ms = 80ms

### No positional embeddings (ergodic)

The encoder uses **no absolute or relative positional embeddings**. This is deliberate:

> "Encoder computations are translation-invariant in time: for any local window, the same function is applied regardless of where that window occurs in the utterance. Informally, the encoder is _ergodic_ in the sense that it has no explicit notion of absolute position; it can only infer structure from the content of the local context provided by sliding-window attention."

This is a strong design choice. It means:

- The encoder produces identical outputs for identical local windows regardless of position
- Position information comes only from the _content_ of the sliding window
- The model can process audio of any length without positional encoding limitations

### Provisional vs. finalized states

Because of the 80ms lookahead, encoder representations can be:

- **Finalized**: enough future audio has arrived (16 frames = 320ms of additional audio)
- **Provisional**: may change as more audio arrives

For live captioning, the system can decode from provisional states immediately -- the displayed text naturally improves as finalized states replace provisional ones.

### Why this makes TTFT bounded

With full attention, encoding N frames costs O(N^2) -- the encoder must wait for the entire utterance. With sliding-window attention:

- Each frame only attends to `w` neighbors
- Encoding proceeds incrementally as audio arrives
- The encoder can start emitting after just `w_right * 20ms = 80ms` of audio
- TTFT is **constant regardless of utterance length** (paper Figure 5)

---

## 6. The Adapter

The adapter bridges the ergodic encoder and the decoder. It adds:

1. **Learned positional embedding** -- the encoder is position-free, but the decoder needs position information
2. **Linear projection** -- when encoder dim differs from decoder dim (e.g., Small: 620 -> 512)

This keeps the encoder clean (no positional info, purely local processing) while giving the decoder the global context it needs.

---

## 7. The Decoder

Standard causal Transformer with:

- **RoPE** (Rotary Position Embeddings) -- not learned positional embeddings like Whisper
- Cross-attention to adapter features
- SwiGLU feed-forward blocks (vs GELU FFN in encoder)
- Autoregressive text token generation

The decoder still uses full attention and is autoregressive, so generating a long transcript still requires a token-by-token serial loop. The paper notes this as a limitation and suggests future work on CTC or monotonic transducers (like NVIDIA's Parakeet TDT approach).

### Token limit as hallucination guard

[`moonshine-model.cpp:341-343`](../../../go-research/external_code/moonshine/core/moonshine-model.cpp)

Max tokens = `ceil(audio_duration * 6.5)` for Latin scripts, `* 13.0` for non-Latin. If the model generates more tokens than this relative to audio duration, decoding stops.

---

## 8. Streaming Implementation -- Five ONNX Sessions

The C++ streaming implementation decomposes the model into five independently-cached stages:

[`moonshine-streaming-model.cpp`](../../../go-research/external_code/moonshine/core/moonshine-streaming-model.cpp)

| Stage          | ONNX file        | Input                                | Output                        | Cached?                         |
| -------------- | ---------------- | ------------------------------------ | ----------------------------- | ------------------------------- |
| **Frontend**   | `frontend.ort`   | raw audio chunk + conv buffers       | features `[1, T, enc_dim]`    | Conv buffers                    |
| **Encoder**    | `encoder.ort`    | features + left context              | encoded frames                | Sliding window state            |
| **Adapter**    | `adapter.ort`    | new encoder frames + position offset | "memory" (cross-attn context) | Appends incrementally           |
| **Cross KV**   | `cross_kv.ort`   | full memory                          | cross-attention K/V           | Invalidated when memory changes |
| **Decoder KV** | `decoder_kv.ort` | token + cross K/V + self K/V cache   | next token logits             | Self-attn KV cache              |

The key insight: by decomposing into stages, each can be cached independently. New audio only triggers frontend -> encoder -> adapter. Cross K/V is lazily recomputed only when memory changes. Decoder reuses cached self-attention K/V.

### Encoder sliding window in streaming

[`moonshine-streaming-model.cpp:579-679`](../../../go-research/external_code/moonshine/core/moonshine-streaming-model.cpp)

```cpp
int MoonshineStreamingModel::encode(MoonshineStreamingState *state,
                                    bool is_final, int *new_frames_out) {
  int total_features = state->accumulated_feature_count;

  // Only encode "stable" frames -- those with enough future context
  const int stable_count =
      is_final ? total_features
               : std::max(0, total_features - config.total_lookahead);
  const int new_frames = stable_count - state->encoder_frames_emitted;
  if (new_frames <= 0) {
    if (new_frames_out) *new_frames_out = 0;
    return 0;
  }

  // Encoder uses a sliding window with fixed per-layer left context.
  const int left_context_frames = 16 * config.depth;
  int window_start = state->encoder_frames_emitted - left_context_frames;
  if (window_start < 0) {
    window_start = 0;
  }
  const int window_size = total_features - window_start;

  // Run encoder on windowed accumulated features.
  std::vector<int64_t> feat_shape = {1, window_size, config.encoder_dim};
  const float *features_ptr =
      state->accumulated_features.data() + window_start * config.encoder_dim;

  OrtStatus *status = ORT_RUN(ort_api, encoder_session,
                              enc_input_names, &features_tensor, 1,
                              enc_output_names, 1, enc_outputs);
  // ... extract new_frames from the tail of the encoded output ...
}
```

The encoder uses left context of `16 * depth` frames. Only "stable" frames are processed: `total_features - total_lookahead` frames. Stable means enough future audio has arrived to produce a finalized representation.

### Speculative decoding

[`moonshine-streaming-model.cpp:1166-1336`](../../../go-research/external_code/moonshine/core/moonshine-streaming-model.cpp)

The C++ implementation supports speculative decoding:

1. Accept optional `speculative_tokens` from a prior decode
2. Single forward pass with BOS + speculative tokens
3. Verify predictions against speculative tokens, find divergence point
4. Accept verified tokens, continue autoregressive from divergence

---

## 9. Tokenizer -- Custom Binary Format

Moonshine uses a custom binary tokenizer (not SentencePiece or HuggingFace tokenizers at runtime):

[`bin-tokenizer.cpp:10-46`](../../../go-research/external_code/moonshine/core/bin-tokenizer/bin-tokenizer.cpp)

- Flat file format: each token stored as length byte(s) + raw UTF-8 bytes
- Token 0: PAD, Token 1: BOS, Token 2: EOS
- Vocab size: **32,768** for streaming models
- Uses SentencePiece's `_` (U+2581) as space character
- Encoding: naive longest-match-first greedy (not BPE merge rules at runtime)

Converted from SentencePiece `.model` or HuggingFace `tokenizer.json` via `scripts/convert_tokenizer.py`.

---

## 10. The Full Transcription Pipeline -- `transcriber.h`

The high-level `Transcriber` class orchestrates:

1. **Audio ingestion**: buffers raw PCM, resamples to 16kHz internally
2. **Voice Activity Detection**: Silero VAD with configurable threshold (default 0.5), hop size 512 samples (32ms)
3. **STT**: for each VAD segment, run non-streaming or streaming model
4. **Speaker ID** (optional): embedded speaker embedding model + online clustering for diarization
5. **Word timestamps** (optional): via cross-attention weights from decoder

---

## 11. ONNX Runtime Deployment

### Model format

Models use `.ort` files -- ONNX Runtime's memory-mappable flatbuffer format. On non-Windows platforms, models are **mmap'd** directly.

[`moonshine-model.cpp:82-100`](../../../go-research/external_code/moonshine/core/moonshine-model.cpp)

```cpp
MoonshineModel::MoonshineModel(bool log_ort_run, float max_tokens_per_second)
    : encoder_session(nullptr),
      decoder_session(nullptr),
      tokenizer(nullptr),
      max_tokens_per_second(max_tokens_per_second),
      log_ort_run(log_ort_run) {
  ort_api = OrtGetApiBase()->GetApi(ORT_API_VERSION);
  LOG_ORT_ERROR(ort_api, ort_api->CreateEnv(ORT_LOGGING_LEVEL_WARNING,
                                            "MoonshineModel", &ort_env));
  LOG_ORT_ERROR(ort_api,
                ort_api->CreateCpuMemoryInfo(
                    OrtDeviceAllocator, OrtMemTypeDefault, &ort_memory_info));
  // Use a custom allocator that tracks memory usage.
  ort_session_allocator = new MoonshineOrtAllocator(ort_memory_info);
  // ...
}
```

ORT session configuration:

- `load_model_format = "ORT"` -- flatbuffer format
- `use_ort_model_bytes_directly = "1"` -- zero-copy model loading
- `disable_prepacking = "1"` -- reduces memory overhead
- CPU memory arena disabled -- custom allocator

### Quantization

Post-training quantization to 8-bit weights and 8-bit MatMul. The convolutional frontend is kept at B16 float precision because its inputs map to 16-bit audio ranges.

---

## 12. Benchmark Results (from the paper)

### WER on Open ASR benchmarks (paper Table 3)

| Dataset       | Tiny (34M) | Small (123M) | Medium (245M) |
| ------------- | ---------- | ------------ | ------------- |
| AMI           | 19.03      | 12.54        | 10.68         |
| Earnings-22   | 20.27      | 13.53        | 11.90         |
| GigaSpeech    | 13.90      | 10.41        | 9.63          |
| Libri (clean) | 4.49       | 2.49         | 2.08          |
| Libri (other) | 12.09      | 6.78         | 5.00          |
| SPGISpeech    | 6.16       | 3.19         | 2.58          |
| TED-LIUM      | 6.12       | 3.77         | 2.99          |
| VoxPopuli     | 14.02      | 9.98         | 8.54          |
| **Average**   | **12.01**  | **7.84**     | **6.65**      |

### Response latency comparison (paper Table 2)

On Apple MacBook M3:

| Model               | Latency (ms) | Compute Load (%) |
| ------------------- | ------------ | ---------------- |
| Moonshine Tiny      | 27           | 5.91             |
| Moonshine v2 Tiny   | **50**       | 8.03             |
| Moonshine v2 Small  | **148**      | 17.97            |
| Moonshine v2 Medium | **258**      | 28.95            |
| Whisper Tiny        | 289          | 8.46             |
| Whisper Base        | 553          | 16.19            |
| Whisper Small       | 1940         | 56.84            |
| Whisper Large v3    | 11286        | 330.65           |

Moonshine v2 Medium achieves **lower latency than Whisper Tiny** while having **better accuracy than Whisper Large-v3**.

### Pareto frontier (paper Figure 4)

On accuracy vs. parameter count:

- Moonshine v2 and NVIDIA models lie on a similar Pareto frontier
- Moonshine fills the **lower end** (sub-1B parameters, sub-1GB memory)
- NVIDIA's models are optimized for GPUs with multi-PFLOP compute
- Both sit above OpenAI's Whisper frontier

---

## 13. Key Differences: Moonshine vs. Whisper

| Feature                           | Whisper                                                | Moonshine v2                    |
| --------------------------------- | ------------------------------------------------------ | ------------------------------- |
| **Audio input**                   | Mel spectrogram (STFT + filterbank)                    | Raw waveform (learned frontend) |
| **Input length**                  | Fixed 30s, zero-padded                                 | Variable length, no padding     |
| **Encoder attention**             | Full (O(T^2))                                          | Sliding window (O(T\*w))        |
| **Positional encoding (encoder)** | Fixed sinusoidal                                       | None (ergodic)                  |
| **Positional encoding (decoder)** | Learned                                                | RoPE                            |
| **TTFT**                          | Grows with utterance length                            | Bounded, constant               |
| **Streaming**                     | Not native                                             | Native 5-stage pipeline         |
| **Multitask**                     | Transcription + translation + language ID + timestamps | Transcription only              |
| **Languages**                     | 99-100 languages                                       | 8 languages (English primary)   |
| **Training data**                 | 680K hours (weakly supervised)                         | ~300K hours                     |
| **Decoder FFN**                   | GELU                                                   | SwiGLU                          |
| **Runtime**                       | PyTorch                                                | ONNX Runtime (C++, mmap)        |

---

## 14. Why Moonshine Matters for Voice Agents

### The streaming story

For a voice agent, the critical metric is **response latency** -- the time from when the user stops speaking to when they hear a response. This includes:

1. VAD detecting end-of-speech (~200ms)
2. **STT processing** (Moonshine: 50-258ms vs Whisper: 289-11286ms)
3. LLM inference (~200-500ms)
4. TTS generation (~50-200ms)

Moonshine v2's bounded TTFT means STT is no longer the bottleneck. A Moonshine v2 Small (123M, 148ms) provides better accuracy than Whisper Small (244M, 1940ms) while using half the parameters and taking 13x less time.

### For Jarvis specifically

Our Jarvis voice agent uses faster-whisper (small, int8, CPU). Moonshine v2 Small could be a drop-in improvement:

- Similar accuracy (7.84% avg WER vs ~7-8% for faster-whisper small)
- 13x lower latency
- Native ONNX runtime (no Python dependency)
- Built-in VAD and streaming support

---

## 15. Sources

- [Moonshine v2 paper (arXiv 2602.12241)](https://arxiv.org/abs/2602.12241)
- [Original Moonshine paper (arXiv 2410.15608)](https://arxiv.org/abs/2410.15608)
- [Moonshine GitHub](https://github.com/usefulsensors/moonshine)
- [Whisper paper (arXiv 2212.04356)](https://arxiv.org/abs/2212.04356) -- for comparison
- [Open ASR Leaderboard paper (arXiv 2510.06961)](https://arxiv.org/abs/2510.06961)
