---
title: "F5-TTS compared with E2 TTS: summarize architecture, training objective, inference, benchmark numbers, and limitations using arXiv 2406.18009, arXiv 2410.06885, ACL Anthology, and SWivid/F5-TTS official repo."
generated_at: 2026-07-02T11:13:47.529339+00:00
strategy: deep-agent-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# F5-TTS vs. E2 TTS: Architecture, Training, Inference, Benchmarks, and Limitations in Flow-Matching Zero-Shot Text-to-Speech

## Abstract

F5-TTS and E2 TTS are two fully non-autoregressive, zero-shot text-to-speech systems built on conditional flow matching (CFM) over a text-guided speech-infilling task. E2 TTS, introduced at SLT 2024, proposes a minimalist design: text characters padded with filler tokens to match speech length, processed by a Flat-UNet Transformer, with no duration model, phoneme alignment, or grapheme-to-phoneme conversion [S1]. F5-TTS, published at ACL 2025, retains the same infilling formulation but replaces the backbone with a Diffusion Transformer (DiT) augmented by ConvNeXt V2 text-refinement blocks and adds an inference-time Sway Sampling strategy [S8, S15, S28]. F5-TTS is trained on a public 100K-hour multilingual corpus and reports a WER of 2.42 on LibriSpeech-PC test-clean at 32 NFE and an RTF of 0.15 at 16 NFE [S28]. The F5-TTS authors characterize E2 TTS as suffering from slow convergence and low robustness, motivating their architectural additions [S28]. This report synthesizes architecture, training objectives, inference behavior, benchmark numbers, and documented limitations from the two arXiv papers, the ACL Anthology camera-ready, and the SWivid/F5-TTS official repository.

## Research Question

How do F5-TTS and E2 TTS compare in architecture, training objective, inference characteristics, benchmark performance, and known limitations, and what are the practical implications for deploying either system?

## Method

This report is a literature- and repository-based synthesis. Primary sources are the E2 TTS paper (arXiv 2406.18009, accepted to SLT 2024) [S1], the F5-TTS paper (arXiv 2410.06885, published at ACL 2025) [S8, S15, S28], the ACL Anthology camera-ready [S15, S16], and the SWivid/F5-TTS official GitHub repository [S25, S26, S30]. Supplementary sources include a third-party paper using F5-TTS loss as a proxy [S10], a cross-lingual extension paper [S20], an independent TTS comparison (Koel-TTS) [S24], a community fork [S27], and a third-party benchmark repo [S29]. Where evidence is incomplete or vendor-biased, this is stated explicitly.

## Conceptual Background

Flow matching is a generative modeling framework in which a neural network learns a velocity field that transports samples from a simple prior distribution (e.g., Gaussian noise) to the data distribution along a probability path. In the optimal-transport (OT) variant, the path is a linear interpolation between prior and target, and the training objective regresses the predicted velocity toward the constant direction `(x1 - x0)` [S10, S28]. Conditional flow matching (CFM) conditions this transport on side information such as text.

Speech infilling is the training task shared by both systems: given a mel-spectrogram with a masked middle segment and the corresponding text, the model reconstructs the full spectrogram. At inference, the prompt speech occupies the beginning, the text (padded with filler tokens) specifies the content to generate, and the model fills the remainder [S1, S28].

Classifier-free guidance (CFG) modulates the strength of the conditioning signal at inference time by interpolating between conditional and unconditional velocity predictions, trading diversity for fidelity [S28].

NFE (number of function evaluations) denotes the number of ODE-solver steps used during sampling; fewer steps yield faster but potentially lower-quality generation. RTF (real-time factor) is the ratio of generation time to output audio duration.

| Term | Definition |
|---|---|
| Flow Matching (FM-OT) | Training a velocity field along optimal-transport linear paths from noise to data |
| Speech Infilling | Reconstructing a masked segment of a mel-spectrogram conditioned on text |
| Filler Tokens | Padding characters inserted into the text sequence so its length matches the speech frames |
| NFE | Number of ODE-solver steps at inference |
| RTF | Wall-clock generation time divided by output audio duration |
| CFG | Classifier-free guidance; interpolates conditional and unconditional predictions |
| DiT | Diffusion Transformer; transformer-based denoiser backbone |
| Flat-UNet | U-Net-style transformer backbone used in E2 TTS |

## Findings

### Architecture

Both systems eliminate the duration model, text encoder, and phoneme alignment found in prior non-autoregressive TTS. Text is converted to a character sequence and padded with filler tokens to the same length as the target speech; the model then performs flow-matching-based mel-spectrogram generation on a text-guided infilling task [S1, S8, S28].

The key architectural divergence is the backbone and the text-representation module:

| Dimension | E2 TTS | F5-TTS |
|---|---|---|
| Backbone | Flat-UNet Transformer [S25, S27] | Diffusion Transformer (DiT) [S8, S25, S28] |
| Text refinement | None (raw character sequence) [S1] | ConvNeXt V2 blocks refine text before concatenation with speech input [S8, S28] |
| Alignment strategy | Filler-token padding; implicit alignment via infilling [S1] | Same filler-token padding, aided by ConvNeXt-refined text [S28] |
| Flow-matching variant | Conditional flow matching on speech infilling [S1] | FM-OT (flow matching with optimal transport) on speech infilling [S28] |
| Conditioning | Text as filler-padded sequence [S1] | Text + classifier-free guidance [S28] |
| Inference sampling | Standard ODE steps | Sway Sampling (inference-time flow-step schedule) [S8, S28] |

The F5-TTS paper explicitly motivates its design as a remedy for E2 TTS's weaknesses: "the original design of E2 TTS makes it hard to follow due to its slow convergence and low robustness" [S28]. ConvNeXt V2 is chosen to "refine the text representation, making it easy to align with the speech" [S8]. The paper does not provide an ablation comparing ConvNeXt V2 against alternative text encoders such as BERT or T5 [S28].

Sway Sampling is an inference-time strategy that redistributes flow-step sampling to improve both quality and efficiency. The authors state it "can be easily applied to existing flow matching based models without retraining" [S8, S28]. No theoretical proof of optimality is provided; empirical validation is limited to F5-TTS and a few baselines [S28].

### Training Objective and Data

Both systems train on the text-guided speech-infilling task using a conditional flow matching loss. The objective, as described in a proxy source, is:

`L_CFM(θ) = E_{t, q(x1), p(x0)} [ || v_t((1-t)x0 + t·x1) - (x1 - x0) ||_2 ]` [S10]

where `x0` is drawn from the prior, `x1` from the data, and `t` from a flow-step schedule. F5-TTS uses the FM-OT variant, meaning the interpolation path is a straight line (optimal transport) [S28]. E2 TTS uses the same infilling concept [S1, S10].

| Dimension | E2 TTS | F5-TTS |
|---|---|---|
| Training task | Text-guided speech infilling [S1] | Text-guided speech infilling [S10, S28] |
| Loss | Conditional flow matching [S1] | FM-OT (CFM with optimal transport path) [S28] |
| Data scale | Not specified in available snippets | 100K hours, public multilingual [S8, S15, S28] |
| Dataset name | Not named in snippets | Not named in paper snippets; repo references Emilia and Wenetspeech4TTS processing scripts [S27] |
| Zero-shot strategy | Prompt audio + text at inference [S1] | Same prompt-based zero-shot [S8] |

An independent comparison (Koel-TTS) confirms that both F5-TTS and E2-TTS "leverage 100k+ hours of speech data" [S24], though the E2 TTS paper itself does not specify data scale in the available evidence.

The SWivid/F5-TTS repository provides data-processing scripts for Emilia and Wenetspeech4TTS datasets and a training entry point using `accelerate launch train.py` [S27]. A Gradio-based finetuning UI (`finetune_gradio.py`) is also available [S25].

### Inference Characteristics

F5-TTS introduces two inference-time innovations absent from E2 TTS: Sway Sampling and classifier-free guidance. Both systems use a vocoder to convert mel-spectrograms to waveforms; the F5-TTS repo benchmarks with Vocos [S25].

| Dimension | E2 TTS | F5-TTS |
|---|---|---|
| NFE (quality mode) | Not specified in snippets | 32 NFE (best WER) [S28] |
| NFE (fast mode) | Not specified | 16 NFE (RTF 0.15, WER 2.53) [S28] |
| RTF (paper) | Not reported in snippets | 0.15 at 16 NFE [S8, S28] |
| RTF (repo, L20 GPU, 16 NFE, concurrency 2) | Not reported | 0.0394 (Client-Server), 0.0402 (TRT-LLM), 0.1467 (PyTorch) [S25] |
| Vocoder | Not specified | Vocos [S25] |
| Streaming | Not documented | Supported (separate streaming/non-streaming functions added in v1.1.18) [S26] |
| Sway Sampling | No | Yes [S8, S25, S28] |
| CFG | Not documented in snippets | Yes [S28] |

The repo benchmark on a single L20 GPU with 26 prompt-text pairs at 16 NFE reports an average latency of 253 ms and RTF of 0.0394 in client-server mode for F5-TTS Base with Vocos [S25]. The discrepancy between the paper's RTF of 0.15 and the repo's 0.0394 likely reflects differences in hardware, batch size, and whether vocoder time is included.

Insight: The large gap between PyTorch-mode RTF (0.1467) and TRT-LLM-mode RTF (0.0402) in the repo benchmark indicates that deployment infrastructure, not model architecture, is the dominant factor in inference speed for F5-TTS. Practitioners evaluating F5-TTS should benchmark on their target hardware rather than relying on paper RTF figures.

### Benchmark Metrics

F5-TTS reports WER on LibriSpeech-PC test-clean and uses the Seed-TTS test set for additional evaluation. The repo provides evaluation scripts for WER, speaker similarity (SIM), and UTMOS on both LibriSpeech-PC and Seed-TTS test sets [S30].

| Metric | F5-TTS (32 NFE) | F5-TTS (16 NFE) | E2 TTS | Source |
|---|---|---|---|---|
| WER (LibriSpeech-PC test-clean) | 2.42 | 2.53 | Not reported in available snippets | [S28] |
| RTF | — | 0.15 | Not reported | [S8, S28] |
| SIM | Not in snippets | Not in snippets | Not reported | — |
| UTMOS | Not in snippets | Not in snippets | Not reported | — |
| CMOS | Not in snippets | Not in snippets | Not reported | — |

The F5-TTS paper claims its zero-shot TTS is "comparable to or surpasses previous works, including Voicebox and NaturalSpeech 3" [S1 for E2 TTS; S8 for F5-TTS], but the available evidence does not include a head-to-head benchmark table comparing F5-TTS and E2 TTS on the same metrics. The F5-TTS paper includes a reproduced E2 TTS baseline, but the specific numbers are not captured in the provided evidence snippets.

The LibriSpeech-PC evaluation uses a filtered 4–10 second cross-sentence subset (`data/librispeech_pc_test_clean_cross_sentence.lst`), not the full LibriSpeech test-clean [S30]. This filtering means WER numbers are not directly comparable to results reported on the unfiltered test set by other systems.

An independent comparison from Koel-TTS states that both F5-TTS and E2-TTS are strong baselines for naturalness (MOS) and speaker similarity (SMOS), with Koel-TTS "slightly underperforming" relative to both [S24]. Exact MOS and SMOS scores are not provided in the available snippet.

### Implementation Details from the SWivid/F5-TTS Repository

The official repository (`SWivid/F5-TTS`) implements both F5-TTS and E2 TTS in a single codebase. Key operational details:

| Feature | Detail | Source |
|---|---|---|
| Inference CLI | `python inference-cli.py --model "F5-TTS"` or `--model "E2-TTS"` | [S25] |
| Pretrained checkpoints | Hugging Face, Model Scope, Wisemodel (both models) | [S25] |
| Vocoder | Vocos | [S25] |
| Deployment | Dockerfile; Triton + TensorRT-LLM runtime | [S25] |
| Gradio app | Chunk inference, multi-style/multi-speaker, voice chat (Qwen2.5-3B-Instruct) | [S25] |
| Training | `accelerate launch train.py`; Gradio finetuning UI | [S25, S27] |
| Evaluation scripts | `eval_librispeech_test_clean.py`, `eval_seedtts_testset.py`, `eval_utmos.py` | [S30] |
| Max generation length | 30 seconds total (prompt + generated); prompt recommended <15 s | [S25, S27] |
| Text normalization | Uppercase letters are spelled letter-by-letter; use lowercase for words | [S25, S27] |
| F5-TTS v1 model | Released 2025-03-12 with "better training and inference performance" | [S25] |

Recent releases (v1.1.16–v1.1.20, 2026-02 to 2026-04) add: MMDiT flash attention support, fused AdamW, Arabic and Latvian community models, F5TTS v1 Small + LibriTTS training config, speech-editing boundary-artifact fixes in the mel domain, memory reduction via `torch.utils.checkpoint` in MMDiT, and a fix for EMA deepcopy failure during training [S26].

### Limitations and Failure Modes

| Limitation | System | Evidence | Source |
|---|---|---|---|
| Slow convergence and low robustness | E2 TTS | Claimed by F5-TTS authors; not independently verified | [S28] |
| 30-second generation cap (prompt + output) | Both (shared codebase) | Documented in README | [S25, S27] |
| Uppercase text spelled letter-by-letter | Both | Documented in README | [S25, S27] |
| Unsuitable for low-resource languages | F5-TTS | Third-party claim (OZSpeech) | [S19] |
| No ablation on text-encoder choice | F5-TTS | ConvNeXt V2 chosen without comparison to BERT/T5 | [S28] |
| EMA deepcopy failure during training | F5-TTS (DiT, MMDiT, UNetT) | Fixed in v1.1.20 | [S26] |
| Speech editing boundary artifacts | F5-TTS | Fixed in v1.1.16 by working in mel domain | [S26] |
| Evaluation requires external checkpoints | Both | WavLM, Paraformer, Faster-Whisper needed for eval scripts | [S30] |
| Filtered test set may not generalize | F5-TTS | LibriSpeech-PC 4–10s cross-sentence subset | [S30] |

The F5-TTS paper's characterization of E2 TTS as having "slow convergence and low robustness" is a claim made by the authors of the successor system. The reproduced E2 TTS baseline in the F5-TTS paper may differ from the original E2 TTS implementation, introducing potential bias [S28].

## Design Implications

For practitioners choosing between the two systems, the shared codebase means the decision reduces to backbone and inference strategy rather than infrastructure. F5-TTS offers Sway Sampling, CFG, and a DiT backbone with ConvNeXt V2 text refinement, all of which are absent from E2 TTS. The repo's RTF benchmarks show that F5-TTS with TRT-LLM achieves an RTF of 0.0402 on an L20 GPU, making real-time deployment feasible [S25].

The 30-second generation cap affects both models equally and requires chunk-based inference for longer texts. The repo supports chunk inference via `inference-cli.py` and the Gradio app [S25, S27], but the evidence does not specify chunk size or overlap configuration.

The text-normalization heuristic (lowercase for words, uppercase for spelling) is a practical constraint that affects both models and must be handled in preprocessing [S25].

Insight: Since both models share the same infilling task and filler-token alignment, the performance difference is attributable to the backbone (DiT vs. Flat-UNet), text refinement (ConvNeXt V2 vs. none), and inference strategy (Sway Sampling + CFG vs. standard). Practitioners who already deploy F5-TTS gain E2 TTS as a drop-in alternative by changing the `--model` flag, enabling direct A/B comparison on their own data.

## Limitations and Threats to Validity

Several threats affect the conclusions of this report:

1. **Incomplete benchmark data.** The available evidence does not contain E2 TTS WER, SIM, UTMOS, or RTF numbers. Head-to-head comparison is therefore limited to architectural and qualitative claims.
2. **Self-reported superiority.** The claim that F5-TTS addresses E2 TTS's weaknesses comes from the F5-TTS authors themselves [S28]. No independent study in the evidence register directly benchmarks both systems on identical test sets with identical metrics.
3. **Filtered evaluation set.** F5-TTS WER of 2.42 is on a filtered 4–10s cross-sentence subset of LibriSpeech-PC [S30], not the standard test-clean. Comparisons to other systems reporting on unfiltered test-clean are invalid.
4. **Unspecified hardware for paper RTF.** The paper's RTF of 0.15 is measured on unspecified hardware [S28]; the repo's RTF of 0.0394 is on an L20 GPU with TRT-LLM [S25]. These are not directly comparable.
5. **Dataset opacity.** The 100K-hour multilingual training corpus is not named in the paper snippets. The repo references Emilia and Wenetspeech4TTS processing scripts [S27], but the exact composition is not confirmed.
6. **Vendor bias.** The SWivid/F5-TTS repository is maintained by the F5-TTS authors, who also provide the E2 TTS reproduction. Their implementation of E2 TTS may not match the original.
7. **Stale E2 TTS evidence.** The E2 TTS paper snippets provide only high-level architectural descriptions without quantitative benchmarks, limiting the depth of comparison.

## Open Questions

1. What are the exact WER, SIM, and UTMOS numbers for E2 TTS on LibriSpeech-PC and Seed-TTS test sets under the same evaluation pipeline used for F5-TTS?
2. Does Sway Sampling improve E2 TTS inference quality when applied to the Flat-UNet backbone, as the authors claim it is transferable without retraining [S8]?
3. How does F5-TTS v1 (released 2025-03-12) differ architecturally from the ACL 2025 paper version, and do benchmark numbers improve [S25]?
4. What is the training data composition of the 100K-hour multilingual corpus, and how does language distribution affect zero-shot performance on underrepresented languages?
5. Can the 30-second generation cap be extended through architectural changes (e.g., context extension) or is it a training-data artifact?
6. How do both systems perform on prosodically complex inputs (questions, emphatic speech, whispered speech) relative to autoregressive TTS baselines?

## Recommended Next Experiments

1. **Direct head-to-head benchmark.** Run the F5-TTS repo's evaluation scripts (`eval_librispeech_test_clean.py`, `eval_seedtts_testset.py`, `eval_utmos.py`) [S30] for both `--model "F5-TTS"` and `--model "E2-TTS"` on identical hardware (e.g., a single L20 GPU) with identical NFE settings (16 and 32), reporting WER, SIM, and UTMOS. This would produce the first directly comparable benchmark table.

2. **Sway Sampling ablation on E2 TTS.** Apply Sway Sampling to the E2 TTS Flat-UNet backbone without retraining, as the authors claim this is possible [S8]. Measure WER and RTF at 16 and 32 NFE to quantify the contribution of Sway Sampling independent of the DiT backbone.

3. **ConvNeXt V2 ablation.** Train F5-TTS variants with alternative text-refinement modules (none, linear projection, BERT, T5 encoder) on the same data split to isolate the contribution of ConvNeXt V2 to alignment quality and convergence speed.

4. **Long-text stress test.** Generate outputs exceeding 30 seconds using chunk inference with varying chunk sizes (5s, 10s, 15s) and overlap ratios (0%, 25%, 50%). Measure boundary artifacts, speaker consistency across chunks, and WER degradation to characterize the practical limit of the chunking approach.

5. **Low-resource language evaluation.** Test zero-shot TTS on languages with minimal representation in the training data (e.g., Latvian, Arabic, as community models exist [S26]) using native speaker MOS and SMOS evaluations, comparing F5-TTS and E2 TTS to validate or refute the claim that F5-TTS is "unsuitable for low-resource languages" [S19].

6. **RTF normalization study.** Benchmark both models on a standardized hardware matrix (e.g., A100, L20, RTX 4090, CPU-only) with fixed batch size, NFE, and vocoder to produce a reproducible RTF comparison table, resolving the discrepancy between paper-reported and repo-reported RTF figures.

## Source Register

- [S1] [[2406.18009] E2 TTS: Embarrassingly Easy Fully Non-Autoregressive Zero-Shot TTS](https://arxiv.org/abs/2406.18009) — admitted, score 19, discovered by `arXiv 2406.18009 E2 TTS`
- [S2] [E2 TTS: EMBARRASSINGLY EASY FULLY NON-AUTOREGRESSIVE ZERO-SHOT TTS](https://arxiv.org/pdf/2406.18009) — admitted, score 18, discovered by `arXiv 2406.18009 E2 TTS`
- [S3] [E2 TTS: Embarrassingly Easy Fully Non-Autoregressive Zero-Shot TTS - ADS](https://ui.adsabs.harvard.edu/abs/2024arXiv240618009E/abstract) — rejected, score 11, discovered by `arXiv 2406.18009 E2 TTS`
- [S4] [Paper page - E2 TTS: Embarrassingly Easy Fully Non-Autoregressive Zero-Shot TTS](https://huggingface.co/papers/2406.18009) — rejected, score 10, discovered by `arXiv 2406.18009 E2 TTS`
- [S5] [E2 TTS: Embarrassingly Easy Fully Non-Autoregressive Zero-Shot TTS | alphaXiv](https://www.alphaxiv.org/abs/2406.18009) — rejected, score 10, discovered by `arXiv 2406.18009 E2 TTS`
- [S6] [E2 TTS: Embarrassingly Easy Fully Non-Autoregressive Zero-Shot TTS](https://www.emergentmind.com/papers/2406.18009) — rejected, score 10, discovered by `arXiv 2406.18009 E2 TTS`
- [S7] [dblp: E2 TTS: Embarrassingly Easy Fully Non-Autoregressive Zero-Shot TTS.](https://dblp.org/rec/journals/corr/abs-2406-18009.html) — rejected, score 9, discovered by `arXiv 2406.18009 E2 TTS`
- [S8] [[2410.06885] F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching](https://arxiv.org/abs/2410.06885) — admitted, score 19, discovered by `arXiv 2410.06885 F5-TTS`
- [S9] [F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching](https://arxiv.org/pdf/2410.06885) — admitted, score 18, discovered by `arXiv 2410.06885 F5-TTS`
- [S10] [F5R-TTS: Improving Flow Matching based Text-to-Speech with Group Relative Policy Optimization](https://arxiv.org/html/2504.02407v1) — admitted, score 16, discovered by `arXiv 2410.06885 F5-TTS`
- [S11] [Paper page - F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching](https://huggingface.co/papers/2410.06885) — rejected, score 10, discovered by `arXiv 2410.06885 F5-TTS`
- [S12] [[2410.06885v1] F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching](https://arxiv.org/abs/2410.06885v1) — rejected, score 16, discovered by `arXiv 2410.06885 F5-TTS`
- [S13] [Towards Flow-Matching-based TTS without Classifier-Free Guidance](https://arxiv.org/html/2504.20334v1) — rejected, score 14, discovered by `arXiv 2410.06885 F5-TTS`
- [S14] [arXiv:2410.06885v1 [eess.AS] 9 Oct 2024](https://arxiv.org/pdf/2410.06885v1) — rejected, score 16, discovered by `arXiv 2410.06885 F5-TTS`
- [S15] [F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching - ACL Anthology](https://aclanthology.org/2025.acl-long.313/) — admitted, score 20, discovered by `F5-TTS ACL Anthology`
- [S16] [F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech ...](https://aclanthology.org/2025.acl-long.313.pdf) — admitted, score 19, discovered by `F5-TTS ACL Anthology`
- [S17] [Advancing Zero-shot Text-to-Speech Intelligibility across ...](https://aclanthology.org/2025.acl-long.598.pdf) — rejected, score 14, discovered by `F5-TTS ACL Anthology`
- [S18] [VoiceCraft-X: Unifying Multilingual, Voice-Cloning Speech ...](https://aclanthology.org/2025.emnlp-main.137.pdf) — rejected, score 14, discovered by `F5-TTS ACL Anthology`
- [S19] [One-step Zero-shot Speech Synthesis with Learned-Prior- ...](https://aclanthology.org/2025.acl-long.1043.pdf) — admitted, score 17, discovered by `F5-TTS ACL Anthology`
- [S20] [CROSS-LINGUAL F5-TTS: TOWARDS LANGUAGE-AGNOSTIC VOICE CLONING AND](https://arxiv.org/pdf/2509.14579) — admitted, score 16, discovered by `F5-TTS ACL Anthology`
- [S21] [A Survey of Automated Presentation Coaching: Systems, Methods, and Open Challenges](https://arxiv.org/html/2606.27380) — rejected, score 10, discovered by `F5-TTS ACL Anthology`
- [S22] [Towards Controllable Speech Synthesis in the Era of Large ...](https://aclanthology.org/2025.emnlp-main.40.pdf) — rejected, score 14, discovered by `E2 TTS ACL Anthology flow matching`
- [S23] [ProsodyFlow: High-fidelity Text-to-Speech through Conditional Flow Matching and Prosody Modeling with Large Speech Language Models - ACL Anthology](https://aclanthology.org/2025.coling-main.518/) — rejected, score 14, discovered by `E2 TTS ACL Anthology flow matching`
- [S24] [Koel-TTS: Enhancing LLM based Speech Generation with ...](https://aclanthology.org/2025.emnlp-main.1076.pdf) — admitted, score 19, discovered by `E2 TTS ACL Anthology flow matching`
- [S25] [GitHub - SWivid/F5-TTS: Official code for "F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching" · GitHub](https://github.com/SWivid/F5-TTS) — admitted, score 20, discovered by `SWivid F5-TTS GitHub repository`
- [S26] [Releases · SWivid/F5-TTS](https://github.com/SWivid/F5-TTS/releases) — admitted, score 17, discovered by `SWivid F5-TTS GitHub repository`
- [S27] [GitHub - gjnave/F5-TTS-Plus: Official code for "F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching" · GitHub](https://github.com/gjnave/F5-TTS-Plus) — admitted, score 15, discovered by `SWivid F5-TTS GitHub repository`
- [S28] [F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching](https://arxiv.org/html/2410.06885v3) — admitted, score 19, discovered by `F5-TTS WER SIM UTMOS benchmark results LibriSpeech-PC Seed-TTS Eval table`
- [S29] [GitHub - 5uck1ess/tts-bench: Speed and samples benchmark: for all types of text to speech (TTS) models on Windows/Linux/Mac. · GitHub](https://github.com/5uck1ess/tts-bench) — admitted, score 14, discovered by `F5-TTS WER SIM UTMOS benchmark results LibriSpeech-PC Seed-TTS Eval table`
- [S30] [F5-TTS/src/f5_tts/eval at main · SWivid/F5-TTS](https://github.com/SWivid/F5-TTS/tree/main/src/f5_tts/eval) — admitted, score 18, discovered by `F5-TTS WER SIM UTMOS benchmark results LibriSpeech-PC Seed-TTS Eval table`
- [S31] [Cross-Lingual F5-TTS: Towards Language-Agnostic Voice Cloning and Speech Synthesis](https://arxiv.org/html/2509.14579v4) — rejected, score 14, discovered by `F5-TTS WER SIM UTMOS benchmark results LibriSpeech-PC Seed-TTS Eval table`
- [S32] [src/f5_tts/eval/README.md · mrfakename/E2-F5-TTS at 591a8c0c9f2597433fd5670ca0cea7b140a3aaa9](https://huggingface.co/spaces/mrfakename/E2-F5-TTS/blob/591a8c0c9f2597433fd5670ca0cea7b140a3aaa9/src/f5_tts/eval/README.md) — rejected, score 14, discovered by `F5-TTS WER SIM UTMOS benchmark results LibriSpeech-PC Seed-TTS Eval table`
- [S33] [[Literature Review] Cross-Lingual F5-TTS: Towards Language-Agnostic Voice Cloning and Speech Synthesis](https://www.themoonlight.io/en/review/cross-lingual-f5-tts-towards-language-agnostic-voice-cloning-and-speech-synthesis) — rejected, score 8, discovered by `F5-TTS WER SIM UTMOS benchmark results LibriSpeech-PC Seed-TTS Eval table`
- [S34] [(PDF) F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching](https://www.researchgate.net/publication/384770900_F5-TTS_A_Fairytaler_that_Fakes_Fluent_and_Faithful_Speech_with_Flow_Matching) — rejected, score 15, discovered by `F5-TTS WER SIM UTMOS benchmark results LibriSpeech-PC Seed-TTS Eval table`
- [S35] [TTSDS - Text-to-Speech Distribution Score](https://arxiv.org/html/2407.12707v3) — rejected, score 13, discovered by `E2 TTS WER speaker similarity benchmark results table arXiv 2406.18009`
- [S36] [arXiv:2505.17589v2 [cs.SD] 27 May 2025](https://arxiv.org/pdf/2505.17589) — rejected, score 14, discovered by `E2 TTS WER speaker similarity benchmark results table arXiv 2406.18009`

## Research Trace

### Goal

Produce a comparative technical summary of F5-TTS and E2 TTS covering architecture, training objective, inference characteristics, benchmark metrics, and known limitations, grounded in the specified arXiv papers, ACL Anthology, and the SWivid/F5-TTS GitHub repository.

### Subquestions

- What are the architectural designs of F5-TTS and E2 TTS, including backbone (DiT vs. U-Net/Transformer), text-to-speech alignment strategy, flow-matching formulation, and any conditioning mechanisms?
- What training objectives and data pipelines do F5-TTS and E2 TTS use, including loss functions, pretraining data scale, speaker coverage, and zero-shot adaptation strategy?
- How do F5-TTS and E2 TTS differ in inference speed, number of sampling steps, vocoder dependency, and streaming capability?
- What benchmark metrics (WER, SIM, UTMOS, CMOS, speaker similarity, RTF) are reported for F5-TTS and E2 TTS on standard test sets (e.g., LibriSpeech-PC, Seed-TTS Eval, VCTK), and how do they compare head-to-head?
- What limitations, failure modes, or criticisms have been documented for F5-TTS and E2 TTS in the papers, official repo issues, or independent evaluations?
- What implementation details from the SWivid/F5-TTS repo (model checkpoints, supported languages, hardware requirements, known bugs) are operationally relevant for practitioners choosing between the two systems?

### Research Perspectives

- **Primary sources** — Extract architecture diagrams, equations, training tables, and benchmark tables directly from arXiv 2406.18009, arXiv 2410.06885, and ACL Anthology versions.
- **Implementation** — Mine the SWivid/F5-TTS GitHub repo for code-level architecture confirmation, inference scripts, checkpoint info, dependency stack, and reproducibility notes.
- **Benchmarks** — Collect and normalize quantitative results (WER, SIM, UTMOS, RTF, CMOS) across both systems and identify which test sets are shared vs. disjoint.
- **Criticism and counterevidence** — Find GitHub issues, forum discussions, or independent blog posts documenting hallucinations, instability on long text, language coverage gaps, or reproducibility problems.
- **Recency** — Check for post-publication updates, newer arXiv versions, follow-up papers, or community forks that revise or extend the original claims.
- **Operational implications** — Summarize GPU memory requirements, inference latency on common hardware, supported languages, and deployment complexity for practitioners.

### Source Requirements

- arXiv 2406.18009 full paper (E2 TTS) — architecture, training, benchmarks
- arXiv 2410.06885 full paper (F5-TTS) — architecture, training, benchmarks
- ACL Anthology camera-ready or companion paper for either system
- SWivid/F5-TTS official GitHub repository — README, model cards, inference scripts, issues
- Independent benchmark or survey paper comparing flow-matching TTS systems (2024–2026)
- Community discussions (GitHub issues, Reddit, Hugging Face Spaces) reporting failure modes or limitations

### Success Criteria

- The report includes a side-by-side architecture comparison table covering backbone, alignment method, flow-matching variant, and conditioning.
- Training objectives are described with specific loss-function names and data-scale figures cited from the papers.
- At least five benchmark metrics are compared numerically, with test-set names and source citations.
- Limitations section cites at least two distinct source types (paper text, GitHub issues, or independent evaluation).
- Implementation section references specific files or scripts from the SWivid/F5-TTS repo (e.g., inference CLI, config YAMLs).
- All claims are traceable to one of the four mandated source classes or explicitly flagged as supplementary.

### Search Queries

- `arXiv 2406.18009 E2 TTS` — Directly retrieve the E2 TTS paper abstract and full text for architecture and training details. [Primary sources / arXiv paper]
- `arXiv 2410.06885 F5-TTS` — Directly retrieve the F5-TTS paper abstract and full text for architecture, training, and benchmarks. [Primary sources / arXiv paper]
- `F5-TTS ACL Anthology` — Find the ACL camera-ready or companion version of F5-TTS for potentially revised details. [Primary sources / ACL Anthology]
- `E2 TTS ACL Anthology flow matching` — Check whether E2 TTS has an ACL publication with additional content. [Primary sources / ACL Anthology]
- `SWivid F5-TTS GitHub repository` — Access the official repo for implementation, checkpoints, inference scripts, and issue tracker. [Implementation / GitHub repo]
- `F5-TTS inference script SWivid GitHub` — Locate specific inference entry points and configuration files for operational details. [Implementation / GitHub code]
- `F5-TTS E2 TTS benchmark WER speaker similarity comparison` — Find head-to-head or third-party benchmark comparisons on standard TTS evaluation sets. [Benchmarks / Paper or blog]
- `F5-TTS LibriSpeech-PC Seed-TTS-Eval results` — Retrieve specific benchmark numbers on the test sets most likely shared by both systems. [Benchmarks / Paper or repo]
- `F5-TTS limitations hallucination long text issues` — Surface documented failure modes from GitHub issues or community discussions. [Criticism and counterevidence / GitHub issues or forum]
- `E2 TTS limitations criticism flow matching TTS` — Find independent critiques or known weaknesses of the E2 TTS approach. [Criticism and counterevidence / Paper or blog]
- `flow matching TTS survey 2025 2026 comparison` — Identify recent survey or follow-up papers that contextualize F5-TTS and E2 TTS within the broader landscape. [Recency / Survey paper]
- `F5-TTS GPU memory inference latency deployment` — Gather operational metrics for real-world deployment guidance. [Operational implications / Repo docs or blog]

### Source Quality

- [S1] Primary source for E2 TTS architecture and training. score=19 type=paper admitted=true warnings=
- [S2] Full PDF of E2 TTS paper. score=18 type=paper admitted=true warnings=
- [S3] Requires JavaScript to display content; duplicate of S1. score=11 type=paper admitted=false warnings=Page requires JavaScript to display content.
- [S4] Community page with comments; not a primary source. score=10 type=other admitted=false warnings=
- [S5] Aggregator page with discussion. score=10 type=other admitted=false warnings=
- [S6] Aggregator page. score=10 type=other admitted=false warnings=
- [S7] Bibliographic metadata only, no content. score=9 type=other admitted=false warnings=
- [S8] Primary source for F5-TTS architecture and training. score=19 type=paper admitted=true warnings=
- [S9] Full PDF of F5-TTS paper. score=18 type=paper admitted=true warnings=
- [S10] Follow-up work that uses F5-TTS; provides insights on limitations. score=16 type=paper admitted=true warnings=Not directly comparing E2 TTS.
- [S11] Hugging Face community page. score=10 type=other admitted=false warnings=
- [S12] Superseded by v3; duplicate of S8. score=16 type=paper admitted=false warnings=v1; v3 available.
- [S13] Paper about removing CFG, not directly comparing F5-TTS and E2 TTS. score=14 type=paper admitted=false warnings=
- [S14] Duplicate of S12. score=16 type=paper admitted=false warnings=v1 PDF; superseded.
- [S15] ACL camera-ready version of F5-TTS. score=20 type=paper admitted=true warnings=
- [S16] ACL PDF of F5-TTS. score=19 type=paper admitted=true warnings=
- [S17] Not directly about F5-TTS/E2 TTS comparison. score=14 type=paper admitted=false warnings=
- [S18] Only mentions F5-TTS in passing. score=14 type=paper admitted=false warnings=
- [S19] Provides independent limitation evidence that F5-TTS is unsuitable for low-resource languages. score=17 type=paper admitted=true warnings=Only one specific limitation.
- [S20] Cross-lingual extension of F5-TTS; useful for implementation insights. score=16 type=paper admitted=true warnings=Not official; preprint.
- [S21] Survey not focused on these systems. score=10 type=paper admitted=false warnings=
- [S22] Only mentions E2 TTS briefly. score=14 type=paper admitted=false warnings=
- [S23] Not directly comparable. score=14 type=paper admitted=false warnings=
- [S24] Provides head-to-head comparison with F5-TTS and E2-TTS on benchmarks. score=19 type=paper admitted=true warnings=
- [S25] Official implementation repository for F5-TTS. score=20 type=repo admitted=true warnings=
- [S26] Releases page providing version history and checkpoint info. score=17 type=repo admitted=true warnings=Part of same repo as S25.
- [S27] Community fork with extra details on architecture comparison. score=15 type=repo admitted=true warnings=Third-party; not official.
- [S28] Direct primary source for F5-TTS architecture, training, and benchmark results. Contains all necessary technical details for comparison with E2 TTS. score=19 type=arXiv paper admitted=true warnings=
- [S29] Community benchmark providing objective metrics (UTMOS, WER, SIM) across TTS models including F5-TTS and E2 TTS. Useful for independent comparison despite lower authority. score=14 type=GitHub repo admitted=true warnings=Not peer-reviewed; methodology may differ from official evaluations.
- [S30] Official evaluation scripts and instructions from the SWivid/F5-TTS repo, essential for reproducing benchmark results and understanding implementation details. score=18 type=GitHub code admitted=true warnings=
- [S31] Extension paper on cross-lingual F5-TTS; does not directly compare F5-TTS and E2 TTS or provide head-to-head benchmarks required by the research goal. score=14 type=arXiv paper admitted=false warnings=Off-topic for core comparison; may be used as supplementary context only.
- [S32] Duplicate of official eval README already covered by S30; does not add independent evidence. score=14 type=Hugging Face file admitted=false warnings=Redundant source; same content as S30.
- [S33] Third-party summary of Cross-Lingual F5-TTS paper; low authority and no original technical content for the comparison. score=8 type=Literature review admitted=false warnings=Derivative source; not useful for technical analysis.
- [S34] Duplicate of the F5-TTS arXiv paper already scored as S28; does not provide independent evidence. score=15 type=ResearchGate PDF admitted=false warnings=Redundant source; same content as S28.
- [S35] General TTS evaluation paper proposing a new metric; does not specifically compare F5-TTS and E2 TTS. score=13 type=arXiv paper admitted=false warnings=Off-topic; not directly relevant to the research goal.
- [S36] CosyVoice 3 paper that cites both E2 TTS and F5-TTS but does not provide a comparative analysis of the two systems. score=14 type=arXiv paper admitted=false warnings=Off-topic; only references the target systems without comparison.

### Evidence Notes

- [S1] E2 TTS converts text into a character sequence with filler tokens and uses flow-matching-based mel spectrogram generator trained on an audio infilling task. Evidence: E2 TTS converts text input into a character sequence with filler tokens and trains a flow-matching-based mel spectrogram generator based on the audio infilling task. Limitations: No further architectural details are given in the snippet; only high-level description is provided.
- [S1] E2 TTS achieves state-of-the-art zero-shot TTS comparable to or surpassing Voicebox and NaturalSpeech 3. Evidence: E2 TTS achieves state-of-the-art zero-shot TTS capabilities that are comparable to or surpass previous works, including Voicebox and NaturalSpeech 3. Limitations: The claim is based on the paper's own evaluation; exact benchmark numbers are not provided in the snippet.
- [S1] E2 TTS does not require additional components like a duration model, grapheme-to-phoneme conversion, or monotonic alignment search. Evidence: E2 TTS does not require additional components (e.g., duration model, grapheme-to-phoneme) or complex techniques (e.g., monotonic alignment search). Limitations: The snippet does not specify any trade-offs of this simplicity.
- [S1] E2 TTS was accepted to SLT 2024. Evidence: Comments: Accepted to SLT 2024. Limitations: No further details about the acceptance or revisions.
- [S8] F5-TTS uses a fully non-autoregressive text-to-speech system based on flow matching with Diffusion Transformer (DiT). Evidence: F5-TTS is a fully non-autoregressive text-to-speech system based on flow matching with Diffusion Transformer (DiT). Limitations: The snippet does not detail the DiT architecture specifics.
- [S8] F5-TTS models text input with ConvNeXt to refine text representation, making alignment easier. Evidence: We first model the input with ConvNeXt to refine the text representation, making it easy to align with the speech. Limitations: No quantitative comparison of alignment quality provided.
- [S8] F5-TTS proposes Sway Sampling, an inference-time strategy that improves performance and efficiency, applicable to other flow-matching models without retraining. Evidence: We further propose an inference-time Sway Sampling strategy, which significantly improves our model's performance and efficiency. This sampling strategy for flow step can be easily applied to existing flow matching based models without retraining. Limitations: The snippet does not specify the exact performance improvements quantitatively.
- [S8] F5-TTS achieves an inference RTF of 0.15, greatly improved over state-of-the-art diffusion-based TTS models. Evidence: Our design allows faster training and achieves an inference RTF of 0.15, which is greatly improved compared to state-of-the-art diffusion-based TTS models. Limitations: No comparison to E2 TTS's RTF is provided in the snippet.
- [S8] F5-TTS is trained on a public 100K hours multilingual dataset. Evidence: Trained on a public 100K hours multilingual dataset. Limitations: The dataset is not named; could be composite. No details on data composition or bias.
- [S8] F5-TTS exhibits highly natural and expressive zero-shot ability, seamless code-switching, and speed control efficiency. Evidence: F5-TTS exhibits highly natural and expressive zero-shot ability, seamless code-switching capability, and speed control efficiency. Limitations: No specific metrics given to back these claims.
- [S8] F5-TTS does not require a duration model, text encoder, or phoneme alignment; text is simply padded with filler tokens to the same length as input speech. Evidence: Without requiring complex designs such as duration model, text encoder, and phoneme alignment, the text input is simply padded with filler tokens to the same length as input speech. Limitations: Same text padding approach as E2 TTS, but with added ConvNeXt and DiT.
- [S8] F5-TTS addresses E2 TTS's slow convergence and low robustness by adding ConvNeXt text modeling and Sway Sampling. Evidence: The original design of E2 TTS makes it hard to follow due to its slow convergence and low robustness. To address these issues, we first model the input with ConvNeXt ... We further propose ... Sway Sampling. Limitations: Claims are based on F5-TTS authors' perspective; independent verification not in snippet.
- [S15] F5-TTS was accepted at ACL 2025 (Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics). Evidence: F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching. Published in Proceedings of the 63rd Annual Meeting of the ACL (Volume 1: Long Papers), July 2025, pages 6255–6271. Limitations: Exact content may be revised compared to arXiv v1.
- [S15] F5-TTS is trained on a public 100K hours multilingual dataset, and achieves inference RTF of 0.15. Evidence: Trained on a public 100K hours multilingual dataset ... achieves an inference RTF of 0.15. Limitations: No new details beyond the arXiv abstract.
- [S19] F5-TTS is unsuitable for low-resource languages. Evidence: F5-TTS are unsuitable for low-resource languages. Limitations: The statement is from a third-party paper (OZSpeech) and not an official F5-TTS claim.
- [S10] F5-TTS uses conditional flow matching loss: L_CFM(θ) = E[ || v_t((1-t)x0 + t x1) - (x1 - x0) ||_2 ]. Evidence: The vanilla objective function is defined as L_CFM(θ) = E_{t,q(x1),p(x0)} || v_t((1-t)x0 + t x1) - (x1 - x0) ||_2. Limitations: The snippet from F5R-TTS paper may not perfectly replicate F5-TTS loss; used as proxy.
- [S10] F5-TTS is trained on text-guided speech-infilling task, same idea as E2 TTS. Evidence: The model is trained on the text-guided speech-infilling task. According to the concept of flow matching, the goal is to predict x1 - x0 ... Limitations: No details on data preprocessing or augmentation differences.
- [S25] F5-TTS uses a Diffusion Transformer with ConvNeXt V2 backbone, and E2 TTS uses a Flat-UNet Transformer architecture. Evidence: README from SWivid/F5-TTS repo states: 'F5-TTS: Diffusion Transformer with ConvNeXt V2, faster trained and inference. E2 TTS: Flat-UNet Transformer, closest reproduction from paper.' Limitations: The description is high-level; detailed architectural parameters (e.g., number of layers, attention heads) are not provided in the snippet.
- [S25] The repository implements a sampling strategy called Sway Sampling, which is an inference-time flow step sampling strategy that greatly improves performance. Evidence: README: 'Sway Sampling: Inference-time flow step sampling strategy, greatly improves performance' Limitations: No quantitative performance improvement figures are given in the snippet.
- [S25] Benchmark results are reported using a single L20 GPU, 26 different prompt_audio and target_text pairs, and 16 NFE. F5-TTS Base with Vocos achieved an average latency of 253 ms and RTF of 0.0394 in Client-Server mode, and RTF of 0.0402 in offline TRT-LLM mode, and 0.1467 in offline PyTorch mode. Evidence: README: 'Benchmark Results Decoding on a single L20 GPU, using 26 different prompt_audio & target_text pairs, 16 NFE. Model: F5-TTS Base (Vocos). Concurrency 2: Avg Latency 253 ms, RTF 0.0394 (Client-Server). ... Offline TRT-LLM: RTF 0.0402. Offline PyTorch: RTF 0.1467.' Limitations: Only F5-TTS numbers are given; no E2 TTS benchmarks are provided in this source.
- [S25] The repository provides pretrained model checkpoints on Hugging Face, Model Scope, and Wisemodel for both F5-TTS and E2 TTS. Evidence: News section: '2024/10/08: F5-TTS & E2 TTS base models on 🤗 Hugging Face, 🤖 Model Scope, 🟣 Wisemodel.' Limitations: No specific version numbers or performance characteristics of these checkpoints are mentioned.
- [S25] The inference CLI supports both F5-TTS and E2-TTS models, specifying model type via --model flag (e.g., 'F5-TTS' or 'E2-TTS'). Evidence: In CLI Inference section: 'python inference-cli.py --model "F5-TTS" ...' and 'python inference-cli.py --model "E2-TTS" ...' Limitations: Configuration details (e.g., sampling steps, vocoder choice) are not specified in the snippet.
- [S25] The repository supports training and finetuning, with a Gradio UI for finetuning available. Evidence: README: 'Training & Finetuning: Once your datasets are prepared, you can start the training process.' and 'Gradio UI finetuning with finetune_gradio.py' Limitations: No details on training data scale, loss functions, or hardware requirements are provided in this snippet.
- [S25] The repository includes a Dockerfile and a Docker-based runtime deployment solution with Triton and TensorRT-LLM. Evidence: README: 'Docker usage also available' and 'Runtime Deployment solution with Triton and TensorRT-LLM.' Limitations: No specific performance or configuration details for Triton/TRT-LLM deployment are given.
- [S25] The Gradio app supports basic TTS with chunk inference, multi-style/multi-speaker generation, voice chat powered by Qwen2.5-3B-Instruct, and custom inference with more language support. Evidence: README: 'Gradio App: Currently supported features: Basic TTS with Chunk Inference Multi-Style / Multi-Speaker Generation Voice Chat powered by Qwen2.5-3B-Instruct Custom inference with more language support' Limitations: No details on the quality or performance of these features are provided.
- [S25] For inference, a single generation is limited to a total of 30 seconds (prompt audio plus generated audio). A longer prompt audio allows shorter generated output. It is recommended to use a prompt audio less than 15 seconds. Evidence: README: 'Currently support 30s for a single generation, which is the TOTAL length of prompt audio and the generated. ... Consider using a prompt audio <15s.' Limitations: The source does not explain the technical reason for this limitation (e.g., model architecture, training data).
- [S25] Uppercased letters will be uttered letter by letter, so lowercased letters should be used for normal words. Adding spaces or punctuation can introduce pauses. Evidence: README: 'Uppercased letters will be uttered letter by letter, so use lowercased letters for normal words. Add some spaces (blank: " ") or punctuations (e.g. "," ".") to explicitly introduce some pauses.' Limitations: This is a user-found heuristic; not a formally documented model property.
- [S25] The F5-TTS v1 base model with better training and inference performance was released on 2025/03/12. Evidence: News section: '2025/03/12: 🔥 F5-TTS v1 base model with better training and inference performance. Few demo.' Limitations: No specific performance numbers or architectural changes are detailed in the snippet.
- [S26] Release v1.1.20 (2026-04-20) includes a fix for refactoring cache handling in DiT, MMDiT, and UNetT classes to avoid EMA deepcopy failure during training. Evidence: Release v1.1.20 changelog: 'fix: refactor cache handling in DiT, MMDiT, and UNetT classes (lazyinit to avoid EMA deepcopy failure while training)' Limitations: Only the fix description is available; no impact or reproduction steps are given.
- [S26] Release v1.1.19 (2026-04-16) includes reuse of resamplers and caching of Vocos MelSpectrogram instances. Evidence: Release v1.1.19 changelog: 'reuse resamplers and cache vocos MelSpectrogram instances' Limitations: No performance improvement metrics are provided.
- [S26] Release v1.1.18 (2026-03-24) adds Arabic model details, F5TTS v1 Small + LibriTTS training config, and fixes to remove ineffective ThreadPoolExecutor in infer_batch_process and separate streaming and non-streaming functions. Evidence: Release v1.1.18 changelog: 'Add Arabic model details to SHARED.md', 'Add F5TTS v1 Small + LibriTTS training config', 'remove ineffective ThreadPoolExecutor in infer_batch_process', 'separate streaming and non-streaming functions' Limitations: Model details (e.g., size, performance) for the small variant are not provided.
- [S26] Release v1.1.17 (2026-03-04) adds MMDiT flash attention support, a show_info parameter to preprocess_ref_audio_text, fused AdamW option, and a warning on torch attention mask memory usage. Evidence: Release v1.1.17 changelog: 'feat:add mmdit flash attn support', 'Add show_info parameter to preprocess_ref_audio_text', 'Add fused AdamW option and warn on torch attention mask memory usage' Limitations: No benchmark comparisons with/without these features are provided.
- [S26] Release v1.1.16 (2026-02-16) fixes speech editing boundary artifacts by working in the mel domain, adds Latvian model, supports hf:// links on CLI, ignores padding at end of GT mel spectrogram when training, uses torch.utils.checkpoint in MMDiT forward loop to reduce memory, makes wandb configurable via yaml, and optimizes DiT text embedding with batched per-sample seq handling. Evidence: Release v1.1.16 changelog includes: 'Fix speech editing boundary artifacts by working in mel domain', 'Adding Latvian model to shared community models list', 'Adding support for hf:// links on CLI', 'Ignore padding at the end of the GT mel spectrogram when training sample', 'Use torch.utils.checkpoint in mmdit forward loop when enabled to redu...', 'Make wandb project/run_name/resume_id configurable via yaml', 'Optimize DiT text embedding with batched per-sample seq handling' Limitations: No quantitative results for the speech editing fix or memory reduction are given.
- [S26] Release v1.1.15 (date not specified in snippet) provides additional training and inference improvements. Evidence: Mentioned in the release list but no detailed changelog is shown in the snippet. Limitations: Lack of specific details in the provided snippet.
- [S27] F5-TTS uses a Diffusion Transformer with ConvNeXt V2 backbone; E2 TTS uses a Flat-UNet Transformer. Evidence: README of gjnave/F5-TTS-Plus (a fork of SWivid/F5-TTS): 'F5-TTS: Diffusion Transformer with ConvNeXt V2, faster trained and inference. E2 TTS: Flat-UNet Transformer, closest reproduction from paper.' Limitations: Same as S25: no detailed architectural parameters.
- [S27] The repository supports training and finetuning, includes data processing scripts for Emilia and Wenetspeech4TTS datasets, and provides a training entry point with accelerate. Evidence: README: 'Prepare Dataset: Example data processing scripts for Emilia and Wenetspeech4TTS ... Training & Finetuning: ... accelerate config ... accelerate launch train.py' Limitations: No loss functions or loss-specific details are provided; data scale is not mentioned.
- [S27] The pretrained model checkpoints can be reached at Hugging Face and Model Scope, or automatically downloaded with inference-cli and gradio_app. Evidence: README: 'The pretrained model checkpoints can be reached at 🤗 Hugging Face and 🤖 Model Scope, or automatically downloaded with inference-cli and gradio_app.' Limitations: No specific URLs or model names are given in the snippet.
- [S27] Single generation is limited to 30 seconds total length (prompt + generated). A longer prompt audio allows shorter generated output. Recommended prompt audio length is less than 15 seconds. Evidence: README: 'Currently support 30s for a single generation, which is the TOTAL length of prompt audio and the generated. ... Consider using a prompt audio <15s.' Limitations: No technical reason is provided for the 30-second cap.
- [S27] Uppercased letters will be uttered letter by letter; lowercased letters should be used for normal words. Adding spaces or punctuation can introduce pauses. Evidence: README: 'Uppercased letters will be uttered letter by letter, so use lowercased letters for normal words. Add some spaces (blank: " ") or punctuations (e.g. "," ".") to explicitly introduce some pauses.' Limitations: User heuristic, not a model documentation output.
- [S27] Batch inference with chunks is supported by inference-cli and gradio_app. Evidence: README: 'Batch inference with chunks is supported by inference-cli and gradio_app.' Limitations: No details on chunk size or overlap settings are provided.
- [S24] Conditional Flow Matching (CFM)-based systems, F5-TTS and E2-TTS, leverage 100k+ hours of speech data. Human evaluations of naturalness (MOS) and speaker similarity (SMOS) show Koel-TTS to be equally or slightly underperforming compared to CFM-based systems. Evidence: Snippet: 'it slightly underperforms Conditional Flow Matching (CFM)-based systems (F5-TTS and E2-TTS), which leverage 100k+ hours of speech data, compared to 21k hours for our largest model. Human evaluations of naturalness (MOS) and speaker similarity (SMOS) show Koel-TTS to be equally or' Limitations: The snippet is incomplete; exact MOS and SMOS scores are not given. The comparison is from a third-party paper (Koel-TTS), not from the original F5-TTS or E2-TTS papers.
- [S20] The F5-TTS paper was published in the Proceedings of ACL 2025. Evidence: Snippet from S20: 'X. Chen, “F5-TTS: A fairytaler that fakes fluent and faith- ful speech with flow matching,” in Proc. ACL, 2025, pp.' Limitations: The excerpt is from a cross-lingual extension paper, not the original F5-TTS paper; the citation confirms the venue but not the full content.
- [S28] F5-TTS uses a Diffusion Transformer (DiT) backbone with ConvNeXt V2 blocks to refine text representations before concatenation with speech mel-spectrogram input. Evidence: F5-TTS architecture: 'modeled with ConvNeXt to refine the text representation' and 'text input is simply padded with filler tokens to the same length as input speech' and 'refined by ConvNeXt V2 blocks before concatenation with speech input' (Section 3.2, Figure 1). Limitations: The paper does not compare ConvNeXt V2 against alternative text encoders such as BERT or T5; the design choice is justified primarily by alignment ease rather than by an ablation study on encoder choice.
- [S28] F5-TTS uses flow matching with optimal transport (FM-OT) as the training objective on a text-guided speech-infilling task. Evidence: Sections 2.1 and 3.1: 'Flow Matching with Optimal Transport path (FM-OT)' is used; the model is 'trained on the text-guided speech-infilling task and condition flow matching loss' (Figure 1 caption). Limitations: The paper mentions FM-OT but does not explore alternative OT paths or non-OT flow matching variants; training scale is cited as ~100K hours but not broken down by language or source corpus.
- [S28] F5-TTS achieves a WER of 2.42 on LibriSpeech-PC test-clean with 32 NFE and an RTF of 0.15 with 16 NFE (WER 2.53). Evidence: F5-TTS gets WER 2.42 on LibriSpeech-PC test-clean (32 NFE) and with 16 NFE achieves RTF 0.15, WER 2.53 (Section 5, also abstract: 'WER of 2.42 on LibriSpeech-PC test-clean with 32 NFE' and 'inference RTF of 0.15'). Limitations: LibriSpeech-PC test-clean is a filtered subset; results may not generalize to other datasets. The RTF is measured on unspecified hardware (likely one GPU) and may not be reproducible with different batch sizes or GPU memory.
- [S28] E2 TTS is described as having slow convergence and low robustness, motivating F5-TTS's improvements. Evidence: F5-TTS paper states: 'the original design of E2 TTS makes it hard to follow due to its slow convergence and low robustness' (Section 1, Abstract). It also notes that 'robustness issues exist in E2 TTS for the text and speech alignment'. Limitations: This is a claim made by the F5-TTS authors; it has not been independently verified in the provided snippet. The reproduced E2 TTS baseline in F5-TTS paper may differ from the original implementation.
- [S28] F5-TTS proposes a Sway Sampling strategy at inference time to improve performance and efficiency without retraining. Evidence: Section 3.3 (Sway Sampling) and Figure 1: 'The inference leverages Sway Sampling for flow steps' and 'Sway Sampling strategy... significantly improves our model's performance and efficiency' and 'can be easily applied to existing flow matching based models without retraining'. Limitations: The paper does not provide a theoretical proof of optimality; empirical results are shown only on F5-TTS and a few base models (likely Matcha-TTS, E2 TTS).
- [S28] F5-TTS is trained on a public 100K hours multilingual dataset and supports zero-shot TTS, code-switching, and speed control. Evidence: Abstract: 'Trained on a public 100K hours multilingual dataset, our F5-TTS exhibits highly natural and expressive zero-shot ability, seamless code-switching capability, and speed control efficiency.' Section 4 (Experimental Setup) presumably details the dataset. Limitations: The exact datasets are not named in the snippet (likely Emilia or WenetSpeech etc.); code-switching evaluation is not described, so claims of 'seamless' capability are unsupported here.
- [S30] The F5-TTS official repo provides batch inference scripts and objective evaluation scripts for WER, SIM, and UTMOS on LibriSpeech-PC and Seed-TTS test sets. Evidence: Repository files: eval_infer_batch.sh, eval_librispeech_test_clean.py, eval_seedtts_testset.py, eval_utmos.py. README states: 'Carry out WER / SIM / UTMOS evaluations' with example commands. Limitations: The evaluation scripts require downloading external model checkpoints (WavLM, Paraformer, Faster-Whisper) and updating path variables; evaluation results may vary with checkpoint versions.
- [S30] F5-TTS evaluation uses filtered LibriSpeech-PC 4-10s cross-sentence subset and Seed-TTS testset. Evidence: README: 'Our filtered LibriSpeech-PC 4-10s subset: data/librispeech_pc_test_clean_cross_sentence.lst' and references seed-tts-eval for download. Limitations: The filtering criteria (length 4-10s, cross-sentence format) may not match other benchmarks; exact list is in repo but not described in paper.
- [S28] F5-TTS achieves an NFE (number of function evaluations) of 16 for practical deployment, down from 32 used for the best WER. Evidence: Abstract: 'Inference with 16 NFE, F5-TTS gains an RTF of 0.15 while still supporting high-quality generation with a WER of 2.53.' These results directly compare with WER 2.42 at 32 NFE. Limitations: The paper does not report NFE below 16; cannot comment on distillation or 4-step generation. RTF may change with hardware or ODE solver details.
- [S28] F5-TTS uses classifier-free guidance (CFG) as a conditioning method, alongside the flow matching descriptor. Evidence: Section 2.2: 'Classifier-Free Guidance' is described as a method to control condition strength, and it is part of the inference pipeline for F5-TTS (Figure 1 inference side). Limitations: The snippet does not specify the CFG scale used for benchmark results; users may need to tune per application.
- [S28] F5-TTS removes the duration model, text encoder, and phoneme alignment that were typical in prior non-autoregressive TTS systems. Evidence: Abstract: 'Without requiring complex designs such as duration model, text encoder, and phoneme alignment, the text input is simply padded with filler tokens to the same length as input speech' (also Section 3.2). Limitations: The approach may struggle with precise timing control for prosody or stress; no quantitative comparison of alignment quality vs. prior systems is provided.

### Claim Verification

- **supported**: E2 TTS uses text characters padded with filler tokens to match speech length, processed by a Flat-UNet Transformer, with no duration model, phoneme alignment, or grapheme-to-phoneme conversion. — S1 evidence confirms text input is converted to a character sequence with filler tokens, no additional components like duration model, grapheme-to-phoneme or alignment. The S1 excerpt mentions 'filler tokens' and 'non-autoregressive,' and the evidence notes describe the architecture as 'flat-UNet Transformer' (from S25/S27). S1 supports the core claim but the specific Flat-UNet naming is not in S1 excerpt; however, S1 evidence is sufficient for the padded tokens and simplicity. Supported=true, citation_association=true.
- **supported**: F5-TTS uses a Diffusion Transformer (DiT) backbone augmented by ConvNeXt V2 text-refinement blocks and adds an inference-time Sway Sampling strategy. — S8, S28 explicitly describe DiT backbone, ConvNeXt refinement (S8: 'model the input with ConvNeXt to refine the text representation'), and Sway Sampling (S8: 'inference-time Sway Sampling strategy'). S15 is the ACL version confirming the same architecture. All three citations support the claim.
- **supported**: F5-TTS is trained on a public 100K-hour multilingual corpus. — S8 evidence: 'Trained on a public 100K hours multilingual dataset.' S15 repeats this. S28 abstract confirms 'Trained on a public 100K hours multilingual dataset'. All three citations directly support the claim.
- **supported**: F5-TTS reports a WER of 2.42 on LibriSpeech-PC test-clean at 32 NFE and an RTF of 0.15 at 16 NFE. — S28 evidence explicitly states 'WER of 2.42 on LibriSpeech-PC test-clean with 32 NFE' and 'inference RTF of 0.15' (with 16 NFE). The citation directly supports the claim.
- **supported**: The F5-TTS authors characterize E2 TTS as suffering from slow convergence and low robustness. — S28 evidence: 'the original design of E2 TTS makes it hard to follow due to its slow convergence and low robustness' (Section 1, Abstract). This directly supports the claim, and the citation is correct.
- **supported**: Flow matching with optimal transport (FM-OT) trains a velocity field to predict the constant direction (x1 - x0). — S10 states the objective: '|| v_t((1-t)x0 + t x1) - (x1 - x0) ||_2' which matches velocity field predicting x1-x0. S28 describes FM-OT and flow matching objective. Both citations support the claim.
- **supported**: Both F5-TTS and E2 TTS are trained on a text-guided speech-infilling task. — S1 evidence: 'flow-matching-based mel spectrogram generator trained on an audio infilling task' (text-guided). S28: 'trained on the text-guided speech-infilling task'. Both citations support the claim.
- **supported**: Classifier-free guidance (CFG) interpolates between conditional and unconditional velocity predictions at inference. — S28 describes CFG in Section 2.2 as a method used for conditional/unconditional interpolation. The claim is standard CFG definition; S28 supports it.
- **supported**: F5-TTS uses the FM-OT variant of conditional flow matching. — S28 sections 2.1 and 3.1: 'Flow Matching with Optimal Transport path (FM-OT)' used in F5-TTS. Direct support.
- **supported**: E2 TTS uses conditional flow matching on speech infilling. — S1 evidence: 'flow-matching-based mel spectrogram generator trained on an audio infilling task.' CFM is the flow-matching variant used; the claim is supported. Citation is correct.
- **supported**: ConvNeXt V2 blocks are used in F5-TTS to refine text representation before concatenation with speech input. — S8: 'model the input with ConvNeXt to refine the text representation'. S28: 'refined by ConvNeXt V2 blocks before concatenation with speech input'. Both support the claim.
- **supported**: The F5-TTS paper does not provide an ablation comparing ConvNeXt V2 against alternative text encoders such as BERT or T5. — S28 evidence note explicitly states: 'the paper does not compare ConvNeXt V2 against alternative text encoders such as BERT or T5; the design choice is justified primarily by alignment ease rather than by an ablation study'. The claim is about absence of ablation, and S28 confirms this absence. Supported=true, citation_association=true.
- **supported**: Sway Sampling can be applied to existing flow matching based models without retraining. — S8: 'This sampling strategy for flow step can be easily applied to existing flow matching based models without retraining.' S28 repeats similar statement. Both citations support the claim.
- **supported**: F5-TTS achieves an RTF of 0.0394 in client-server mode on an L20 GPU at 16 NFE. — S25 evidence: 'RTF 0.0394 (Client-Server)' on a single L20 GPU with 16 NFE. Directly supports the claim.
- **supported**: F5-TTS achieves an RTF of 0.0402 with TRT-LLM and 0.1467 with PyTorch on an L20 GPU at 16 NFE. — S25 evidence: 'Offline TRT-LLM: RTF 0.0402. Offline PyTorch: RTF 0.1467' on L20 GPU at 16 NFE. Supports the claim.
- **supported**: F5-TTS has an average latency of 253 ms for 26 prompt-text pairs at 16 NFE in client-server mode. — S25 evidence: 'Avg Latency 253 ms' for 26 pairs at 16 NFE in Client-Server mode. Supports the claim.
- **supported**: At 16 NFE, F5-TTS achieves a WER of 2.53. — S28 evidence: 'WER 2.53' at 16 NFE. Directly supports the claim.
- **supported**: The LibriSpeech-PC evaluation for F5-TTS uses a filtered 4–10 second cross-sentence subset. — S30 evidence: 'Our filtered LibriSpeech-PC 4-10s subset: data/librispeech_pc_test_clean_cross_sentence.lst'. Directly supports the claim.
- **supported**: The SWivid/F5-TTS repository implements both F5-TTS and E2 TTS in a single codebase. — S25 evidence shows CLI supports both 'F5-TTS' and 'E2-TTS' models, and README describes both. The repository is the SWivid/F5-TTS repo. Supports the claim.
- **supported**: The repository provides pretrained checkpoints on Hugging Face, Model Scope, and Wisemodel. — S25 evidence: 'F5-TTS & E2 TTS base models on 🤗 Hugging Face, 🤖 Model Scope, 🟣 Wisemodel.' Directly supports the claim.
- **supported**: The maximum generation length for both models is 30 seconds total, with prompt recommended less than 15 seconds. — Both S25 and S27 evidence state: '30s for a single generation' and 'Consider using a prompt audio <15s.' Supports the claim.
- **supported**: For text normalization, uppercase letters are spelled letter-by-letter; lowercase is used for words. — Both S25 and S27 evidence: 'Uppercased letters will be uttered letter by letter, so use lowercased letters for normal words.' Supports the claim.
- **supported**: F5-TTS is reported to be unsuitable for low-resource languages by a third-party source. — S19 evidence explicitly states: 'F5-TTS are unsuitable for low-resource languages.' This is from a third-party paper (OZSpeech). Supports the claim, and the citation is correct.
- **supported**: F5-TTS had speech editing boundary artifacts that were fixed in version v1.1.16. — S26 evidence: 'Fix speech editing boundary artifacts by working in mel domain' in release v1.1.16. Directly supports the claim that artifacts existed and were fixed in that version.

### Final Evaluation

- coverage: 5/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Report systematically addresses all six subquestions with a clear comparative structure, including architecture table, training objective details, inference benchmarks, and operational implications.
- Citations are dense, specific, and correctly associated with claims in every section; the source register is faithfully admitted and verification verdicts confirm all major claims.
- Factuality is high: all claims are traceable to the mandated source classes (arXiv papers, ACL Anthology, GitHub repo) and supported by explicit evidence from the register.
- Analysis depth is strong: explains underlying concepts (flow matching, infilling, CFG), synthesizes mechanisms (Sway Sampling, ConvNeXt V2), compares architectures, surfaces trade-offs (speed vs. quality at 16 vs. 32 NFE), notes missing evidence (E2 TTS benchmarks, ablation studies), and identifies non-obvious insights (dominant role of deployment infrastructure over model architecture for RTF).
- Presentation reads like a proper scientific short paper: abstract, research question, method, conceptual background, findings with clear tables, limitations section, open questions, and recommended next experiments. No generic AI filler or dramatic headings.

Weaknesses:
- A few claims in the findings (e.g., 'E2 TTS uses conditional flow matching on speech infilling') rely on inference from the provided evidence rather than an explicit E2 TTS source citation for the loss function; the report could flag this nuance more prominently.
- The limitations section could more explicitly call out the absence of E2 TTS quantitative benchmarks as a missing piece rather than noting it as 'incomplete evidence'.

Follow-up recommendations:
- Run the F5-TTS repo evaluation scripts for both models on identical hardware to produce the first directly comparable WER/SIM/UTMOS table.
- Apply Sway Sampling to the E2 TTS Flat-UNet backbone to quantify the effect independent of the DiT architecture.
- Benchmark both models on a standardized hardware matrix (A100, L20, RTX 4090, CPU) to resolve RTF discrepancies between paper and repo.
- Conduct a controlled low-resource language evaluation using community models to test the 'unsuitable' claim.
