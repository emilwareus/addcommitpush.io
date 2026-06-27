# Voice Agents Research Status

Last updated: 2026-05-22

## Scope

Created a second-brain research structure for the existing `presentations/voice-agents`
material. The goal is to preserve long-form, source-backed insight notes for a future
blog article and richer presentation sections.

## Created

- `references.md` - source index with local archive paths.
- `summary.md` - high-level map of the voice-agent insight set.
- `graph.json` - explicit insight/document graph for the voice-agent research folder.
- `AGENTS.md` - rules for writing long-form voice-agent research insights.
- `papers/` - downloaded primary papers.
- `paper-text/` - extracted text from downloaded papers.
- `articles/` - archived official docs/model cards/articles.
- `data/` - chart-ready CSVs for STT, TTS, turn detection, transport, and native speech models.
- `insights/` - eight long-form research notes.

## Insight Files

|   # | File                                                              | Lines | Role                                                   |
| --: | ----------------------------------------------------------------- | ----: | ------------------------------------------------------ |
|   1 | `insights/INSIGHT_01_latency_budget_is_the_product.md`            |   236 | Full latency waterfall and data trace.                 |
|   2 | `insights/INSIGHT_02_endpointing_is_turn_taking.md`               |   189 | VAD, endpointing, semantic EOU, and human turn-taking. |
|   3 | `insights/INSIGHT_03_streaming_stt_is_not_batch_stt.md`           |   188 | STT metrics beyond WER.                                |
|   4 | `insights/INSIGHT_04_tts_latency_is_architecture.md`              |   200 | TTS TTFA/RTF/architecture tradeoffs.                   |
|   5 | `insights/INSIGHT_05_transport_is_media_correctness.md`           |   174 | WebRTC vs WebSocket as media responsibility.           |
|   6 | `insights/INSIGHT_06_barge_in_is_the_real_system_test.md`         |   167 | Barge-in, cancellation, echo, and state coherence.     |
|   7 | `insights/INSIGHT_07_native_speech_models_change_the_boundary.md` |   161 | Cascaded vs native speech-to-speech.                   |
|   8 | `insights/INSIGHT_08_voice_agent_eval_needs_multiple_metrics.md`  |   213 | Trace-based eval harness and metric matrix.            |

## Site Brain Integration

Added eight voice-agent insight objects to `lib/insights.ts` and two graph documents:

- `voice-agents-deck`
- `voice-agents-article-draft`

The `/brain` graph can now discover these notes alongside the code-agent research. The
canonical long-form versions remain the Markdown files under this folder.

## Primary Source Archive

Downloaded and extracted:

- Whisper (`2212.04356`)
- Moonshine (`2410.15608`)
- Moonshine v2 (`2602.12241`)
- Open ASR Leaderboard (`2510.06961`)
- StyleTTS 2 (`2306.07691`)
- F5-TTS (`2410.06885`)
- Spark-TTS (`2503.01710`)
- Fish Audio S2 (`2603.08823`)
- Moshi (`2410.00037`)
- Qwen2.5-Omni (`2503.20215`)
- Mini-Omni (`2408.16725`)
- GLM-4-Voice (`2412.02612`)

Archived official docs/model cards/articles for OpenAI Realtime, LiveKit, Pipecat,
Deepgram Flux, Silero VAD, Kokoro, NVIDIA ASR cards, Qwen ASR, WebRTC protocols,
human turn-taking, and ITU G.114.

## Remaining Work

- Measure Jarvis locally with a trace waterfall: VAD, endpointing, STT, LLM, TTS, playback,
  and interruption timestamps.
- Build a small Jarvis regression set with pauses, interruptions, backchannels, noisy playback,
  and domain terms from the deck.
- Add publication-quality charts generated from `data/*.csv`.
- Re-check dynamic vendor pages before publishing precise current pricing or leaderboard claims.
