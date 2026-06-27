# Voice Agents Research References

This index is for the second-brain notes under `presentations/voice-agents/research`.
Downloaded papers live in `papers/`; extracted text lives in `paper-text/`; archived web
sources live in `articles/`.

## Local Deck And Existing Research

| ID       | Source                    | Local path                                                                     | Role                                                     |
| -------- | ------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| R-VA-001 | Local STT deep dive       | `../STT-DEEP-DIVE.md`                                                          | Existing STT research and benchmark caveats.             |
| R-VA-002 | Local VAD deep dive       | `../VAD-DEEP-DIVE.md`                                                          | Existing VAD state-machine and Silero/WebRTC comparison. |
| R-VA-027 | Local TTS deep dive       | `../TTS-DEEP-DIVE.md`                                                          | Existing open-source TTS model survey.                   |
| R-VA-028 | Local transport deep dive | `../TRANSPORT-DEEP-DIVE.md`                                                    | Existing WebSocket/WebRTC transport analysis.            |
| R-VA-035 | STT benchmark slide       | `../../../components/presentations/voice-agents/slides/06b-stt-benchmarks.tsx` | Chart-ready STT model data used by the deck.             |
| R-VA-036 | TTS benchmark slide       | `../../../components/presentations/voice-agents/slides/08b-tts-benchmarks.tsx` | Chart-ready TTS model data used by the deck.             |

## Speech-To-Text

| ID       | Source                                                                               | URL                                                | Local path                                                                                     | Role                                                        |
| -------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| R-VA-003 | Moonshine v2: Ergodic Streaming Encoder ASR for Latency-Critical Speech Applications | https://arxiv.org/abs/2602.12241                   | `papers/moonshine-v2-2602.12241.pdf`, `paper-text/moonshine-v2-2602.12241.txt`                 | Primary latency and WER data for edge/live ASR.             |
| R-VA-004 | Open ASR Leaderboard                                                                 | https://arxiv.org/abs/2510.06961                   | `papers/open-asr-leaderboard-2510.06961.pdf`, `paper-text/open-asr-leaderboard-2510.06961.txt` | Reproducible WER/RTFx benchmark across ASR systems.         |
| R-VA-026 | NVIDIA Parakeet TDT 0.6B v3 model card                                               | https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3 | `articles/nvidia-parakeet-tdt-06b-v3.html`                                                     | Current open ASR card with WER and RTFx values.             |
| R-VA-030 | Whisper paper                                                                        | https://arxiv.org/abs/2212.04356                   | `papers/whisper-2212.04356.pdf`, `paper-text/whisper-2212.04356.txt`                           | Baseline Whisper architecture and 680k-hour training claim. |

## VAD, Endpointing, And Turn-Taking

| ID       | Source                                        | URL                                                                                                  | Local path                                                                                                                  | Role                                                     |
| -------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| R-VA-005 | Silero VAD quality metrics                    | https://github.com/snakers4/silero-vad/wiki/Quality-Metrics                                          | `articles/silero-vad-quality-metrics.html`                                                                                  | Silero/WebRTC ROC-AUC and accuracy comparison.           |
| R-VA-006 | Silero VAD GitHub / defaults                  | https://github.com/snakers4/silero-vad                                                               | `../VAD-DEEP-DIVE.md`                                                                                                       | Chunk size, default thresholds, CPU-cost claims.         |
| R-VA-007 | OpenAI Realtime API reference                 | https://developers.openai.com/api/reference/resources/realtime                                       | `articles/openai-realtime-api-reference.html`                                                                               | Official server_vad and semantic_vad knobs/defaults.     |
| R-VA-008 | LiveKit turns overview and turn detector docs | https://docs.livekit.io/agents/logic/turns/                                                          | `articles/livekit-turns.html`                                                                                               | Official turn detection modes and interruption guidance. |
| R-VA-009 | Pipecat Smart Turn docs                       | https://docs.pipecat.ai/server/utilities/turn-detection/smart-turn-overview                          | `articles/pipecat-smart-turn.html`                                                                                          | Context-aware turn completion model and timing claims.   |
| R-VA-020 | Deepgram Flux docs and launch post            | https://developers.deepgram.com/docs/flux/quickstart                                                 | `articles/deepgram-flux-quickstart.html`, `articles/deepgram-flux-configuration.html`, `articles/deepgram-flux-launch.html` | Conversational STT and EOT timing claims.                |
| R-VA-022 | Stivers et al. human turn-taking              | https://www.mpi.nl/publications/item66202/universals-and-cultural-variation-turn-taking-conversation | `articles/human-turn-taking-stivers.html`                                                                                   | Human response offset baseline.                          |
| R-VA-023 | ITU-T G.114                                   | https://www.itu.int/ITU-T/recommendations/rec.aspx?rec=G.114                                         | `articles/itu-g114.html`                                                                                                    | One-way voice latency planning guidance.                 |

## Text-To-Speech

| ID       | Source                  | URL                                       | Local path                                                                       | Role                                                        |
| -------- | ----------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| R-VA-010 | Kokoro-82M model card   | https://huggingface.co/hexgrad/Kokoro-82M | `articles/kokoro-82m-model-card.html`                                            | Small local TTS candidate and model-size/license facts.     |
| R-VA-011 | StyleTTS 2              | https://arxiv.org/abs/2306.07691          | `papers/styletts2-2306.07691.pdf`, `paper-text/styletts2-2306.07691.txt`         | Kokoro lineage; MOS/CMOS and RTF data.                      |
| R-VA-012 | F5-TTS                  | https://arxiv.org/abs/2410.06885          | `papers/f5-tts-2410.06885.pdf`, `paper-text/f5-tts-2410.06885.txt`               | Flow-matching TTS WER/SIM/UTMOS/RTF data.                   |
| R-VA-013 | Spark-TTS               | https://arxiv.org/abs/2503.01710          | `papers/spark-tts-2503.01710.pdf`, `paper-text/spark-tts-2503.01710.txt`         | LLM-based TTS with BiCodec and UTMOS/WER data.              |
| R-VA-014 | Fish Audio S2           | https://arxiv.org/abs/2603.08823          | `papers/fish-audio-s2-2603.08823.pdf`, `paper-text/fish-audio-s2-2603.08823.txt` | Production-serving TTFA/RTF and Seed-TTS-Eval WER/CER data. |
| R-VA-015 | Fish Speech v1.5        | https://arxiv.org/abs/2411.01156          | Not downloaded                                                                   | Prior Fish-family baseline.                                 |
| R-VA-016 | XTTS v2 model card/docs | https://huggingface.co/coqui/XTTS-v2      | Not downloaded                                                                   | Legacy voice-cloning baseline.                              |
| R-VA-017 | Piper                   | https://github.com/rhasspy/piper          | Not downloaded                                                                   | Deterministic local CPU baseline.                           |

## Transport And Native Speech-To-Speech

| ID       | Source                                | URL                                                                   | Local path                                                                        | Role                                                        |
| -------- | ------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| R-VA-018 | Moshi                                 | https://arxiv.org/abs/2410.00037                                      | `papers/moshi-2410.00037.pdf`, `paper-text/moshi-2410.00037.txt`                  | Full-duplex speech-text model and latency claims.           |
| R-VA-019 | Qwen2.5-Omni                          | https://arxiv.org/abs/2503.20215                                      | `papers/qwen25-omni-2503.20215.pdf`, `paper-text/qwen25-omni-2503.20215.txt`      | Thinker-Talker native multimodal speech architecture.       |
| R-VA-024 | Mini-Omni                             | https://arxiv.org/abs/2408.16725                                      | `papers/mini-omni-2408.16725.pdf`, `paper-text/mini-omni-2408.16725.txt`          | Open research-grade end-to-end real-time speech model.      |
| R-VA-025 | GLM-4-Voice                           | https://arxiv.org/abs/2412.02612                                      | `papers/glm-4-voice-2412.02612.pdf`, `paper-text/glm-4-voice-2412.02612.txt`      | Low-bitrate speech tokenizer and end-to-end spoken chatbot. |
| R-VA-029 | MDN WebRTC protocols                  | https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols | `articles/mdn-webrtc-protocols.html`                                              | ICE/STUN/TURN protocol reference.                           |
| R-VA-031 | OpenAI Realtime WebRTC/WebSocket docs | https://developers.openai.com/api/docs/guides/realtime-webrtc         | `articles/openai-realtime-webrtc.html`, `articles/openai-realtime-websocket.html` | Official transport split for browser/mobile vs server-side. |
| R-VA-032 | LiveKit transport docs                | https://docs.livekit.io/transport/                                    | `articles/livekit-transport.html`                                                 | Production WebRTC/media substrate reference.                |
| R-VA-033 | Pipecat transport docs                | https://docs.pipecat.ai/pipecat/learn/transports                      | `articles/pipecat-transports.html`, `articles/pipecat-choosing-transport.html`    | Transport-selection guidance.                               |
