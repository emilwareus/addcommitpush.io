# Voice Agents Research Summary

This is the working second brain for the voice-agent presentation. The notes are source-first
and intended to become a future blog article and/or richer presentation sections.

## Current Insight Map

| Insight                                                  | Main claim                                                                                                                                         | Plot/table data                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `INSIGHT_01_latency_budget_is_the_product.md`            | A real-time voice agent is judged by the delay between user intent and audible agent behavior, not by any single model benchmark.                  | `data/turn_detection.csv`, `data/stt_models.csv`, `data/tts_models.csv` |
| `INSIGHT_02_endpointing_is_turn_taking.md`               | VAD detects speech; endpointing decides when the agent is allowed to talk; production systems increasingly add semantic EOU models.                | `data/turn_detection.csv`                                               |
| `INSIGHT_03_streaming_stt_is_not_batch_stt.md`           | WER is necessary but insufficient; voice agents need end-of-turn latency, TTFT, partial stability, entity accuracy, and tails.                     | `data/stt_models.csv`                                                   |
| `INSIGHT_04_tts_latency_is_architecture.md`              | TTS quality metrics miss the agent problem; TTFA, RTF headroom, streaming shape, and interruption behavior matter more.                            | `data/tts_models.csv`                                                   |
| `INSIGHT_05_transport_is_media_correctness.md`           | WebRTC wins for browser/mobile voice because it solves media behavior, not because it is always lower latency.                                     | `data/transport_tradeoffs.csv`                                          |
| `INSIGHT_06_barge_in_is_the_real_system_test.md`         | A voice agent is not conversational until it can hear true interruptions, stop itself cleanly, and keep state coherent.                            | `data/turn_detection.csv`, `data/transport_tradeoffs.csv`               |
| `INSIGHT_07_native_speech_models_change_the_boundary.md` | Native speech-to-speech models attack the cascade itself, but cascaded systems remain easier to debug, evaluate, and control.                      | `data/native_speech_models.csv`                                         |
| `INSIGHT_08_voice_agent_eval_needs_multiple_metrics.md`  | Voice-agent evaluation needs a harness across speech accuracy, turn-taking, latency tails, barge-in, transport, cost, and downstream task success. | All CSVs                                                                |

## High-Level Findings

1. Endpointing is probably the most important latency lever. Silero can classify audio frames
   in tiny chunks, but the agent still needs a policy for "is the user done?" OpenAI exposes
   `server_vad` and `semantic_vad`; LiveKit, Pipecat, and Deepgram all add learned/contextual
   turn logic on top of acoustic VAD.

2. STT leaderboards are not enough. The Open ASR Leaderboard is valuable because it
   standardizes WER and RTFx across many systems, but RTFx is throughput. A voice agent
   needs response latency after speech stops, TTFT, partial stability, and entity accuracy.

3. Moonshine v2 is the clearest local/live ASR paper for this deck. The paper reports
   Apple M3 response latency of 50 ms, 148 ms, and 258 ms for Tiny, Small, and Medium,
   compared with 289 ms, 1,940 ms, and 11,286 ms for Whisper Tiny, Small, and Large v3
   in the same benchmark.

4. TTS is moving in several directions at once. Kokoro/Piper-style small local models are
   practical. F5-TTS gives strong quality/clone data but flow matching is not automatically
   low TTFA. Fish Audio S2 has the strongest primary-source production TTFA/RTF story:
   RTF 0.195 and TTFA as low as 100 ms on H200 serving.

5. WebRTC vs WebSocket is the wrong shallow debate. For browser and mobile, WebRTC is
   a media stack: AEC, Opus, RTP timestamps, jitter buffers, ICE/STUN/TURN, stats, and
   separate media/control paths. WebSocket can work for prototypes and server-to-server,
   but the application inherits the timing and playout problems.

6. Native speech-to-speech models matter because they remove the text bottleneck and
   turn-based assumption. Moshi is the strongest conceptual source: it frames cascades as
   compounding latency, text bottleneck, and turn segmentation, then proposes full-duplex
   multi-stream modeling with a 160 ms theoretical / 200 ms practical latency claim.

## Open Research Gaps

- Need more direct production measurements on the local Jarvis stack: audio capture delay,
  VAD start/stop, STT final, LLM first token, TTS first audio, and playback start.
- Need direct local benchmarks for Kokoro in the current hardware environment.
- Need a clean visual that separates RTF, RTFx, TTFT, TTFA, endpointing latency, and full
  round-trip latency; these are easy to conflate.
- Need more source-backed interruption metrics. LiveKit and Deepgram publish useful claims,
  but open benchmark datasets for barge-in/false-interruption are sparse.
