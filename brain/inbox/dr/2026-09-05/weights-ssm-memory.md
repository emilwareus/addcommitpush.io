---
title: "Mamba S4 xLSTM RWKV fixed hidden state memory limits long context recall benchmarks hybrid Jamba Titans memory layers LoRA context distillation"
generated_at: 2026-09-05T09:02:50.813997355+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Fixed Hidden States, Hybrid Layers, and Memory Augmentation: Can SSM/RNN Architectures Match Transformer Long-Context Recall?

## Abstract

Fixed-hidden-state sequence models—Mamba/S4, xLSTM, and RWKV—achieve linear or constant-memory inference by compressing the entire context into a state of bounded dimension. This compression creates a capacity bottleneck: as context length grows, the state cannot faithfully retain all information needed for exact retrieval. Theoretical and empirical evidence shows that standard state-space models (SSMs) lack the expressiveness to solve multi-query joint recall under sub-quadratic time complexity [S1], and that Mamba's global hidden-state channels suffer exponential decay that limits recall beyond the training length [S3]. Hybrid architectures that interleave SSM layers with attention layers—Jamba and its successor Jamba-1.5—report effective context lengths of 256K tokens on the RULER benchmark while reducing KV-cache memory by roughly 10× compared to Transformer-only models of similar scale [S13]. Memory-augmented architectures such as Titans replace the fixed-size state with a deep neural long-term memory module and report needle-in-a-haystack accuracy beyond 2M tokens [S15]. Context distillation via LoRA or similar adapter methods is discussed in the literature but the admitted sources provide no measured fidelity numbers for long-context recall compression. This report synthesizes the admitted evidence, distinguishes recall from understanding, and identifies where benchmark methodology gaps prevent fair comparison.

## Research Question

Can fixed-hidden-state architectures (Mamba/S4, xLSTM, RWKV) achieve Transformer-level long-context recall, and to what extent do hybrid architectures (Jamba), memory-augmented models (Titans), memory layers, and LoRA-based context distillation close the gap?

## Method

This report synthesizes evidence from 12 admitted sources: primary architecture papers (Mamba [S2], xLSTM [S26], Jamba [S8], Jamba-1.5 [S13], Titans [S15]), analytical and criticism papers [S1, S3, S27], a Google DeepMind blog on Titans/MIRAS [S17], a deployment-oriented blog on xLSTM/RWKV-7 [S22], and secondary summaries of xLSTM [S25]. Where sources report benchmark numbers, they are quoted directly; where only qualitative claims exist, this is flagged. No independent re-evaluation was performed.

## Conceptual Background

### Fixed hidden-state compression

SSMs (Mamba/S4) compress the entire preceding context into a fixed-size state whose dimension does not grow with sequence length. At inference, this yields O(1) per-token time and O(d) space complexity [S27]. xLSTM, RWKV-7, and Mamba-3 similarly maintain a fixed-size recurrent state that does not grow with context length, keeping VRAM constant regardless of sequence length [S22]. The trade-off is that the amount of storable information is bounded by the state dimension.

### Recall vs. understanding

Long-context recall means exact or near-exact retrieval of information placed far back in the input. Long-context understanding means reasoning over the full context (e.g., summarization, aggregation). These are distinct: a model can rank documents well [S27] while failing to retrieve a specific needle.

### Associative vs. joint recall

Standard associative recall assumes unique key-value mappings independent of context. Joint recall adds context-dependency: the correct value depends on surrounding context, not just the key [S1]. SSMs may pass simple associative recall while failing context-dependent retrieval.

### Sparse attention taxonomy

Context-independent sparse attention (CISA) uses fixed patterns (sliding window, A-shaped, dilated). Context-dependent sparse attention (CDSA) uses content-dependent routing such as locality-sensitive hashing (LSH) attention [S1]. Only CDSA restores the expressiveness needed for joint recall.

### Memory augmentation

Titans introduces a neural long-term memory module—a deep MLP that is updated during inference—rather than a fixed vector or matrix state [S15]. This is distinct from KV-cache attention, which stores growing key-value pairs without compression.

| Term | Definition |
|---|---|
| Fixed hidden state | Recurrent state of bounded dimension d that does not grow with context length |
| Needle-in-a-haystack | Retrieval task: find a specific statement embedded in a long, irrelevant context |
| Joint recall | Context-dependent associative recall where the value depends on surrounding context |
| CDSA | Context-dependent sparse attention (e.g., LSH); content-routed |
| CISA | Context-independent sparse attention (e.g., sliding window); pattern-fixed |
| Neural long-term memory | Titans' deep MLP memory module updated at inference time |
| Effective context length | Maximum context length at which a model maintains benchmark accuracy above a threshold |

## Findings

### 1. Theoretical capacity limits of fixed-state models

Standard SSMs provably lack the expressiveness to solve multi-query joint recall under sub-quadratic time complexity [S1]. The proof applies to a synthetic joint-recall task where key-value associations depend on context, not merely on keys. The implication is that no fixed-size state, regardless of dimension, can represent all context-dependent associations without attention-like routing.

Titans frames the same intuition informally: "a very long context cannot be properly compressed in a small vector-valued or matrix-valued states" [S15]. Google's December 2025 blog restates this: "this fixed-size compression cannot adequately capture the rich information in very long sequences" [S17].

Mamba compresses context into a state of dimension d, achieving O(1) inference time but limited by "the amount of information that can be compressed, i.e. the hidden state size" [S27]. No source quantifies the exact capacity bound in bits or tokens.

### 2. Mechanism of Mamba's recall degradation

LongMamba [S3] identifies a concrete mechanism: Mamba's hidden-state channels split into local and global channels. Global channels are the bottleneck because "cumulative hidden-state decay increases exponentially with context length and their receptive fields fail to generalize beyond training length" [S3]. The paper proposes a training-free fix—token filtering so only critical tokens accumulate in memory—but the admitted excerpt contains no accuracy numbers.

### 3. Empirical SSM vs. Transformer recall

Recent studies show SSMs "generally underperform compared to Transformers in long-context understanding tasks" [S3]. The original Mamba paper claims it is "the first attention-free model to match the performance of a very strong Transformer recipe (Transformer++)" [S2], but notes that "full results on context length 8k are missing for the RWKV and RetNet baselines" [S2], complicating head-to-head comparison.

On the Multi-Query Associative Recall task (up to 256 key-value pairs), xLSTM[1:1] "performed best" among non-transformer models (Mamba, RWKV-5, RWKV-6), but still trailed Transformers [S25]. This task is short-context (256 pairs), so it does not establish long-context recall superiority.

xLSTM shows sequence-length extrapolation from 2048 to 16384 tokens on perplexity [S25, S26], but perplexity is not recall accuracy. The extrapolation result suggests the architecture does not collapse on longer sequences, but does not prove faithful retrieval.

### 4. Hybrid architectures: Jamba

Jamba is a Transformer-Mamba mixture-of-experts model: 12B active, 52B total parameters, fitting on a single 80GB GPU, supporting up to 256K-token context [S8]. The architecture interleaves attention and Mamba layers. Jamba's needle-in-a-haystack evaluation reports recall of statements placed mid-context up to 256K tokens [S8], though the excerpt provides no accuracy percentages.

Jamba-1.5 extends this: "the only models with an effective length of 256K on the RULER benchmark, while offering 10x reduction in KV cache memory" [S13]. RULER comprises 13 synthetic tasks including 8 needle-in-a-haystack variants, variable tracking, aggregation, and QA [S13].

A key architectural finding: "in a hybrid architecture, the Mamba-1-Attention combination works better than Mamba-2-Attention... Mamba-2 outperforms Mamba-1 without attention, the hybrid Mamba-1-Attention performs better" [S13]. This was observed at 350M and 1.3B scale trained for 100B tokens.

Jamba-1.5-Large uses a 1:7 attention-to-Mamba layer ratio, 94B active / 398B total parameters, and serves 256K context on 8×80GB GPUs with ExpertsInt8 [S13].

| Model | Architecture | Max Context | KV Cache at Max Context | RULER Effective Length |
|---|---|---|---|---|
| Jamba-1.5-Mini (52B/12B) | Hybrid Mamba-1 + Attention MoE | 256K | 4 GB (16-bit) | 256K [S13] |
| Jamba-1.5-Large (398B/94B) | Hybrid Mamba-1 + Attention MoE | 256K | 9 GB (16-bit) | 256K [S13] |
| Mixtral 8x7B | Transformer MoE | 32K | 32 GB | Not reported |
| LLaMA-3.1 70B | Transformer | 128K | 80 GB | Not reported |

### 5. Memory-augmented architectures: Titans

Titans introduces a neural long-term memory module implemented as a deep MLP, updated during inference using a surprise metric based on gradient magnitude [S15, S17]. The model "can effectively scale to larger than 2M context window size with higher accuracy in needle-in-haystack tasks compared to baselines" [S15]. The surprise mechanism: "The model uses this internal error signal (the gradient) as a mathematical equivalent of saying, 'This is unexpected and important!'" [S17]. Momentum combines momentary and past surprise for selective updates.

The admitted excerpts contain no detailed benchmark tables, accuracy percentages, or baseline names for Titans. The claims are abstract-level from a preprint and a promotional blog.

### 6. Fixed-state architecture comparison

| Architecture | State Type | Key Mechanism | Parallelizable | Reported Recall Strength |
|---|---|---|---|---|
| Mamba / Mamba-2 | Selective SSM | Input-dependent gating, fixed d | Yes | Degrades beyond training length [S3] |
| xLSTM (mLSTM) | Matrix memory + exponential gating | Parallelizable matrix state | Yes (mLSTM) | Best non-Transformer on MQAR (256 pairs) [S25] |
| xLSTM (sLSTM) | Scalar memory with mixing | Memory mixing improves recall | No | Outperforms mLSTM on formal language [S25] |
| RWKV-7 | Linear attention + time-mixing | Fixed recurrent state [S22] | Yes | No long-context recall numbers in sources |
| Mamba-3 | Selective state space | Fixed recurrent state [S22] | Yes | 2-4 GB state for 7B model [S22] |

### 7. Context distillation and LoRA

The admitted sources contain no measured fidelity numbers for LoRA-based context distillation of long-context information. The search plan included this subquestion, but no source in the register reports quantitative results on compressing long-context knowledge into adapter weights. This is a gap in the available evidence.

### 8. Operational trade-offs

Fixed-state models maintain constant VRAM regardless of context length: "The recurrent state size for a 7B model is 2-4 GB regardless of whether you have processed 2K tokens or 2M tokens" [S22]. However, compute still scales linearly with context length. Hybrid models like Jamba reduce KV-cache memory by roughly 10× compared to Transformer-only models at equivalent context [S13], but require attention layers whose KV cache grows with context.

### Evidence table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| SSMs lack expressiveness for multi-query joint recall under sub-quadratic time | Formal theorem | [S1] | Synthetic task; sub-quadratic constraint |
| Mamba global channels decay exponentially, limiting recall beyond training length | Per-channel attention-pattern analysis | [S3] | Mamba-specific; no accuracy numbers in excerpt |
| Jamba-1.5 achieves 256K effective context on RULER with 10× KV-cache reduction | Authors' evaluation | [S13] | RULER-specific; author-reported |
| Titans scales beyond 2M context with higher needle-in-haystack accuracy | Abstract claim | [S15] | Preprint; no detailed benchmark tables |
| xLSTM[1:1] best non-Transformer on MQAR (256 pairs) | Experiment | [S25] | Short-context task; still behind Transformers |
| Fixed-state compression cannot capture rich information in very long sequences | Framing argument | [S15, S17] | Not a formal impossibility proof |
| Mamba-1+Attention hybrid beats Mamba-2+Attention hybrid | 350M/1.3B experiments, 100B tokens | [S13] | Small scale; may not hold at all scales |
| SSMs (Mamba) compress context into fixed-size state with O(1) time, O(d) space | Theoretical characterization | [S27] | SSM-specific; does not cover xLSTM or RWKV complexity |
| xLSTM, RWKV-7, Mamba-3 maintain fixed-size recurrent state with constant VRAM | Deployment blog | [S22] | No recall accuracy numbers; blog source |
| No LoRA context distillation fidelity numbers available | Absence of evidence | — | Gap in admitted sources |

## Design Implications

**Insight:** The theoretical result from [S1] and the empirical mechanism from [S3] converge on the same conclusion: fixed-size states cannot perform context-dependent recall without attention-like routing. This means pure SSM/RNN architectures are structurally limited for long-context retrieval, regardless of state dimension. The fix is not larger states but selective access to past tokens.

**Insight:** Jamba's 1:7 attention-to-Mamba ratio [S13] suggests that a small fraction of attention layers is sufficient to restore recall while preserving most of the SSM's memory and throughput advantages. This is a practical design lever: the ratio controls the recall-efficiency trade-off.

**Insight:** Titans' surprise-based memory update [S17] offers a different design path: instead of interleaving attention layers, augment the recurrent state with a learnable memory module that selectively stores surprising tokens. This could be combined with SSM layers, but no source reports such a combination.

For practitioners choosing between architectures:

| Use case | Recommended architecture | Rationale |
|---|---|---|
| Long-context exact retrieval (>64K) | Hybrid (Jamba-class) or Titans | Pure SSMs provably limited [S1, S3] |
| Long-context summarization/aggregation | Pure SSM may suffice | Understanding ≠ recall; SSMs competitive on ranking [S27] |
| Memory-constrained serving (single GPU) | Hybrid with low attention ratio | 10× KV-cache reduction [S13] |
| Million-token context | Titans (experimental) | Reports >2M context [S15]; not production-validated |
| Short-context associative recall | xLSTM | Best non-Transformer on MQAR [S25] |

## Limitations and Threats to Validity

1. **Benchmark heterogeneity.** Needle-in-a-haystack evaluations differ in needle placement, context composition, metric, and pass/fail threshold. Jamba reports recall "in the middle of contexts" [S8] but no accuracy percentage. RULER uses 13 tasks [S13] but "effective length" is benchmark-specific. Cross-architecture comparison requires identical evaluation protocols, which the sources do not guarantee.

2. **Author-reported results.** Jamba and Titans results come from the proposing authors. Jamba's "only models with effective length of 256K on RULER" [S13] and Titans' ">2M context" [S15] lack independent reproduction in the admitted sources.

3. **Scale mismatch.** Jamba's Mamba-1-vs-Mamba-2 hybrid finding was at 350M/1.3B scale [S13]. Whether the 1:7 ratio generalizes to larger scales is unconfirmed.

4. **Missing baselines.** The original Mamba paper notes missing 8K-context results for RWKV and RetNet [S2]. RWKV long-context recall numbers are absent from the entire admitted source register.

5. **No LoRA distillation evidence.** The plan included context distillation, but no admitted source reports measured fidelity for compressing long-context information into adapter weights.

6. **Promotional sources.** The Google blog [S17] and Spheron deployment blog [S22] may have vendor or promotional bias. The Spheron blog is not peer-reviewed and may oversimplify architectural details.

7. **Recency vs. validation.** Titans [S15] is a preprint with abstract-level claims. The December 2025 Google blog [S17] is a summary, not peer-reviewed evidence.

## Open Questions

1. What accuracy does Jamba achieve on RULER's 8 needle-in-a-haystack variants at 128K and 256K, broken down by variant? The sources report "effective length" but not per-task accuracy.

2. Does the Mamba-1+Attention superiority over Mamba-2+Attention [S13] hold at 7B+ scale and beyond 100B training tokens?

3. What are RWKV-7's long-context recall numbers on needle-in-a-haystack or RULER? No admitted source provides them.

4. Can Titans' neural long-term memory module be combined with SSM layers (rather than attention) to achieve recall at lower memory cost than Jamba?

5. What is the information-theoretic capacity of a fixed state of dimension d, measured in retrievable key-value pairs, as a function of context length? No source quantifies this.

6. Does LongMamba's training-free token filtering [S3] recover recall accuracy comparable to hybrid architectures, and at what throughput cost?

7. Can LoRA-based context distillation compress a 128K context into adapter weights with >90% recall fidelity? No evidence is available.

8. Do xLSTM and RWKV-7 achieve the same O(1) per-token time and O(d) space complexity as SSMs (Mamba), or do their different state structures (matrix memory, linear attention) yield different complexity profiles? S27 characterizes only SSMs; S22 confirms constant VRAM but does not provide per-token time or space complexity for xLSTM or RWKV-7.

## Recommended Next Experiments

1. **Unified RULER evaluation.** Run Mamba-2, xLSTM (1:1), RWKV-7, Jamba-1.5-Mini, and a Transformer baseline (LLaMA-3.1 8B) on the full RULER suite at 32K, 64K, 128K, and 256K tokens with identical evaluation code. Report per-task accuracy, not aggregate "effective length."

2. **Controlled needle-in-a-haystack sweep.** Vary needle depth (0%, 25%, 50%, 75%, 100% of context) and context length (4K–256K) for each architecture. This isolates position-dependent recall failure from length-dependent failure.

3. **LongMamba vs. Jamba recall comparison.** Apply LongMamba's training-free token filtering to pure Mamba-2 and compare recall accuracy and throughput against Jamba at matched parameter count. This tests whether training-free mitigation matches architectural hybridization.

4. **Titans memory module ablation.** Replace Titans' neural long-term memory with (a) a fixed-size vector state, (b) a growing KV cache, and (c) a LoRA adapter, holding all else constant. Measure needle-in-a-haystack accuracy at 128K, 512K, and 2M tokens. This isolates the contribution of the memory module.

5. **LoRA context distillation fidelity test.** Fine-tune LoRA adapters on a 128K-context document, then evaluate recall of specific facts from that document using only the adapter weights (no context provided). Measure recall fidelity as a function of adapter rank and document length. This directly addresses the open question on context distillation.

6. **Scale test of Mamba-1 vs. Mamba-2 hybrid ratio.** Train 7B hybrid models with Mamba-1+Attention and Mamba-2+Attention at 1:7 and 1:15 ratios for 500B tokens. Evaluate on RULER at 64K and 128K. This tests whether [S13]'s small-scale finding generalizes.

7. **Capacity quantification.** For a fixed state of dimension d ∈ {256, 1024, 4096}, measure the maximum number of random key-value pairs retrievable with >95% accuracy as a function of context length. This provides the missing quantitative capacity bound.

## Source Register

- [S1] [Overcoming Long-Context Limitations of State-Space Models via Context-Dependent Sparse Attention](https://arxiv.org/html/2507.00449v3) — admitted, score 18, discovered by `Mamba state space model long context recall limitations benchmark`
- [S2] [Mamba: Linear-Time Sequence Modeling with Selective State Spaces](https://arxiv.org/pdf/2312.00752) — admitted, score 19, discovered by `Mamba state space model long context recall limitations benchmark`
- [S3] [LongMamba: Enhancing Mamba’s Long Context Capabilities via Training-Free Receptive Field Enlargement](https://arxiv.org/html/2504.16053v1) — admitted, score 17, discovered by `Mamba state space model long context recall limitations benchmark`
- [S4] [How Mamba Beats Transformers at Long Sequences | Galileo](https://galileo.ai/blog/mamba-linear-scaling-transformers) — rejected, score 11, discovered by `Mamba state space model long context recall limitations benchmark`
- [S5] [r/MachineLearning on Reddit: [R] Mamba: Can We Achieve Infinite Context Length?](https://www.reddit.com/r/MachineLearning/comments/1it279f/r_mamba_can_we_achieve_infinite_context_length/) — rejected, score 6, discovered by `Mamba state space model long context recall limitations benchmark`
- [S6] [[2312.00752] Mamba: Linear-Time Sequence Modeling with Selective State Spaces](https://arxiv.org/abs/2312.00752) — rejected, score 15, discovered by `Mamba state space model long context recall limitations benchmark`
- [S7] [What Is A Mamba Model? | IBM](https://www.ibm.com/think/topics/mamba-model) — rejected, score 10, discovered by `Mamba state space model long context recall limitations benchmark`
- [S8] [Jamba: A Hybrid Transformer-Mamba Language Model](https://arxiv.org/html/2403.19887v1) — admitted, score 19, discovered by `Jamba hybrid Mamba Transformer architecture long context needle in haystack results`
- [S9] [Jamba: A Hybrid Transformer-Mamba Language Model Opher Lieber∗ Barak Lenz∗](https://arxiv.org/pdf/2403.19887) — rejected, score 15, discovered by `Jamba hybrid Mamba Transformer architecture long context needle in haystack results`
- [S10] [HYBRID TRANSFORMER-MAMBA LANGUAGE MODELS](https://proceedings.iclr.cc/paper_files/paper/2025/file/a9ed43fa31dc8b4a7d7a673d713dcb5f-Paper-Conference.pdf) — admitted, score 20, discovered by `Jamba hybrid Mamba Transformer architecture long context needle in haystack results`
- [S11] [[2403.19887] Jamba: A Hybrid Transformer-Mamba Language Model](https://arxiv.org/abs/2403.19887) — rejected, score 15, discovered by `Jamba hybrid Mamba Transformer architecture long context needle in haystack results`
- [S12] [Jamba: Revolutionizing Language Modeling with a Hybrid Transformer-Mamba Architecture - Ajith Vallath Prabhakar](https://ajithp.com/2024/04/10/jamba-revolutionizing-language-modeling-with-a-hybrid-transformer-mamba-architecture/) — rejected, score 10, discovered by `Jamba hybrid Mamba Transformer architecture long context needle in haystack results`
- [S13] [Jamba-1.5: Hybrid Transformer-Mamba Models at Scale](https://arxiv.org/html/2408.12570v1) — admitted, score 19, discovered by `Jamba hybrid Mamba Transformer architecture long context needle in haystack results`
- [S14] [Jamba: A Hybrid Transformer-Mamba Language Model with Mixture-of-Experts | by Sulbha Jain | Medium](https://sulbhajain.medium.com/jamba-a-hybrid-transformer-mamba-language-model-with-mixture-of-experts-506281f2398e) — rejected, score 6, discovered by `Jamba hybrid Mamba Transformer architecture long context needle in haystack results`
- [S15] [Titans: Learning to Memorize at Test Time](https://arxiv.org/html/2501.00663v1) — admitted, score 19, discovered by `Titans Google DeepMind memory augmented transformer long context paper 2024 2025`
- [S16] [[2501.00663] Titans: Learning to Memorize at Test Time](https://arxiv.org/abs/2501.00663) — rejected, score 15, discovered by `Titans Google DeepMind memory augmented transformer long context paper 2024 2025`
- [S17] [Titans + MIRAS: Helping AI have long-term memory](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/) — admitted, score 16, discovered by `Titans Google DeepMind memory augmented transformer long context paper 2024 2025`
- [S18] [Google Titans Model Explained : The Future of Memory-Driven AI Architectures | by Sahin Ahmed(Data Scientist/MLE) | Medium](https://medium.com/@sahin.samia/google-titans-model-explained-the-future-of-memory-driven-ai-architectures-109ed6b4a7d8) — rejected, score 6, discovered by `Titans Google DeepMind memory augmented transformer long context paper 2024 2025`
- [S19] [r/GeminiAI on Reddit: AGI is closer than we think: Google just unveiled "Titans," a new architecture capable of real-time learning and infinite memory](https://www.reddit.com/r/GeminiAI/comments/1pfa8ue/agi_is_closer_than_we_think_google_just_unveiled/) — rejected, score 6, discovered by `Titans Google DeepMind memory augmented transformer long context paper 2024 2025`
- [S20] [Titans: Learning to Memorize at Test Time Ali Behrouz †, Peilin Zhong](https://arxiv.org/pdf/2501.00663) — rejected, score 15, discovered by `Titans Google DeepMind memory augmented transformer long context paper 2024 2025`
- [S21] [Google Titans architecture, helping AI have long-term memory | Hacker News](https://news.ycombinator.com/item?id=46181231) — rejected, score 10, discovered by `Titans Google DeepMind memory augmented transformer long context paper 2024 2025`
- [S22] [Deploy xLSTM and RWKV-7 on GPU Cloud: Linear-Attention Alternatives for Million-Token Context Inference (2026) | Spheron Blog](https://www.spheron.network/blog/xlstm-rwkv7-linear-attention-gpu-cloud-deployment-2026/) — admitted, score 14, discovered by `xLSTM vs Mamba vs RWKV long context performance comparison benchmark`
- [S23] [r/LocalLLaMA on Reddit: Why bother with RWKV/Mamba instead of decoder transformers?](https://www.reddit.com/r/LocalLLaMA/comments/1hs3966/why_bother_with_rwkvmamba_instead_of_decoder/) — rejected, score 6, discovered by `xLSTM vs Mamba vs RWKV long context performance comparison benchmark`
- [S24] [xLSTM-mLSTM: Advanced Recurrent Memory Models](https://www.emergentmind.com/topics/xlstm-mlstm) — rejected, score 11, discovered by `xLSTM vs Mamba vs RWKV long context performance comparison benchmark`
- [S25] [xLSTM: Extended Long Short-Term Memory - by Grigory Sapunov](https://gonzoml.substack.com/p/xlstm-extended-long-short-term-memory) — admitted, score 13, discovered by `xLSTM vs Mamba vs RWKV long context performance comparison benchmark`
- [S26] [xLSTM: Extended Long Short-Term Memory Maximilian Beck∗1,2,3](https://arxiv.org/pdf/2405.04517) — admitted, score 19, discovered by `xLSTM vs Mamba vs RWKV long context performance comparison benchmark`
- [S27] [RankMamba: Benchmarking Mamba’s Document Ranking Performance in the Era of Transformers](https://arxiv.org/html/2403.18276v3) — admitted, score 17, discovered by `xLSTM vs Mamba vs RWKV long context performance comparison benchmark`

## Research Trace

### Goal

Evaluate the long-context recall limitations of fixed-hidden-state architectures (Mamba/S4, xLSTM, RWKV), and assess whether hybrid models (Jamba, Titans), memory layers, and LoRA-based context distillation can close the gap with Transformer attention for long-context retrieval.

### Subquestions

- What are the theoretical and empirical memory-capacity limits of fixed hidden-state architectures (Mamba/S4, xLSTM, RWKV) when asked to recall specific information from very long contexts?
- How do Mamba, xLSTM, and RWKV compare to Transformers on established long-context recall benchmarks (needle-in-a-haystack, LongBench, RULER, etc.)?
- What is the Jamba hybrid architecture, and does interleaving Mamba layers with Transformer attention layers measurably improve long-context recall over pure Mamba?
- What is the Titans architecture, how do its memory modules differ from standard hidden states, and what recall improvements does it report?
- What are memory layers (e.g., learned memory tokens, retrieval-augmented hidden states), and how effectively do they extend the effective memory of fixed-state models?
- How effective is LoRA-based or other context distillation at compressing long-context information into a smaller fixed state, and what recall fidelity is retained?

### Research Perspectives

- **Primary sources** — Obtain architecture descriptions, capacity analyses, and benchmark numbers directly from Mamba, S4, xLSTM, RWKV, Jamba, and Titans papers and model cards.
- **Benchmarks** — Collect quantitative long-context recall results across architectures on common benchmarks (needle-in-a-haystack, LongBench, RULER, SCROLLS, InfiniteBench).
- **Criticism and counterevidence** — Find papers or analyses that explicitly show where SSMs/RNNs fail at long-context retrieval, including information-loss proofs, copy-task failures, and association-recall limitations.
- **Implementation and operational implications** — Assess throughput, memory footprint, training cost, and serving latency trade-offs among pure SSM, hybrid, and memory-augmented approaches.
- **Context distillation and compression** — Evaluate the state of LoRA-based and other context-distillation methods for compressing long-context information into fixed-size representations.
- **Recency** — Identify the latest (2025-2026) developments in hybrid SSM-Transformer architectures and memory-augmented models.

### Source Requirements

- arxiv papers for Mamba, Mamba-2, S4, xLSTM, RWKV, Jamba, Titans
- Official model cards or technical reports (AI21 Jamba, Google Titans, NX-AI xLSTM, RWKV)
- Long-context benchmark suites: LongBench, RULER, InfiniteBench,needle-in-a-haystack, SCROLLS, LongBench v2
- Independent evaluation or reproducibility studies comparing SSM vs Transformer recall
- Blog posts or release notes from AI21, Google DeepMind, Mistral, or Microsoft on hybrid memory architectures
- GitHub repos with benchmark scripts or evaluation logs for the architectures in question
- Papers on information-theoretic capacity of RNNs/SSMs for associative recall

### Success Criteria

- Report includes specific benchmark numbers (e.g., needle-in-a-haystack accuracy at 32k, 64k, 128k tokens) for at least three of Mamba, xLSTM, RWKV, and a Transformer baseline.
- Report identifies the theoretical or empirical cause of fixed-state recall degradation (e.g., compression bottleneck, finite state dimension, training data distribution).
- Report quantifies the recall improvement that hybrid architectures (Jamba, Titans) achieve over their pure-SSM counterparts on the same benchmarks.
- Report distinguishes between recall (exact retrieval), understanding (reasoning over context), and generation tasks, and does not conflate them.
- Report covers context distillation / LoRA approaches and reports any measured fidelity-to-original numbers.
- Report includes at least one source from 2025 or 2026 discussing the most recent state of the art.
- Report flags where benchmark methodology differs across papers (context length, metric, needle placement) to enable fair comparison.

### Search Queries

- `Mamba state space model long context recall limitations benchmark` — Find the core evidence that pure Mamba/S4 degrades on long-context retrieval tasks. [Criticism and counterevidence / paper]
- `Jamba hybrid Mamba Transformer architecture long context needle in haystack results` — Retrieve Jamba's own reported long-context recall numbers and architecture details. [Primary sources / technical_report]
- `Titans Google DeepMind memory augmented transformer long context paper 2024 2025` — Find the Titans paper describing its memory modules and recall improvements. [Primary sources / paper]
- `xLSTM vs Mamba vs RWKV long context performance comparison benchmark` — Obtain head-to-head comparisons of fixed-state architectures on long-context tasks. [Benchmarks / paper]
- `RULER benchmark long context evaluation state space models RNN transformer` — Retrieve results from the RULER benchmark which explicitly tests multi-needle and recall tasks. [Benchmarks / paper]
- `fixed hidden state capacity RNN information bottleneck associative recall theory` — Find theoretical work on why fixed-size hidden states cannot perfectly store unbounded context. [Criticism and counterevidence / paper]
- `Mamba copy task failure associative recall state space model limitation` — Find specific failure modes of SSMs on copy or recall tasks that Transformers handle. [Criticism and counterevidence / paper]
- `LoRA context distillation long context compression fidelity` — Find work on distilling long-context knowledge into adapter weights or smaller models. [Context distillation and compression / paper]
- `RWKV long context recall evaluation needle in haystack` — Obtain RWKV-specific long-context evaluation results. [Benchmarks / paper]
- `memory layers LLM long context retrieval augmented hidden state 2025` — Find work on explicit memory layers or memory tokens that augment fixed-state models. [Implementation and operational implications / paper]
- `Jamba vs Mamba throughput latency comparison hybrid SSM transformer tradeoff` — Assess the operational cost of hybrid architectures relative to pure SSM. [Implementation and operational implications / technical_report]
- `hybrid state space model transformer long context 2025 2026 latest architecture` — Identify the most recent developments in hybrid architectures. [Recency / paper]

### Source Quality

- [S1] Directly addresses long-context limitations of SSMs and proposes hybrid with sparse attention; includes theoretical analysis and empirical verification on multi-query joint recall. score=18 type=paper admitted=true warnings=
- [S2] Original Mamba paper defining the architecture; essential baseline for long-context recall evaluation. score=19 type=paper admitted=true warnings=
- [S3] Identifies exponential hidden-state decay as key bottleneck for Mamba long-context tasks; proposes training-free receptive field enlargement. score=17 type=paper admitted=true warnings=
- [S4] Blog summary of Mamba; lacks new research or benchmark numbers; thin secondary source. score=11 type=other admitted=false warnings=Blog post, not primary research.
- [S5] Fetch error; unreadable. Reddit thread, low authority. score=6 type=other admitted=false warnings=Fetch error: HTTP 403; content unavailable.; fetch failed: Source fetch API returned HTTP 403 Forbidden: <body class=theme-beta><div><style>.theme-light,:root{--rem360:22.5rem;--rem320:20rem;--rem192:12rem;--rem144:9rem;--rem128:8rem;--rem96:6rem;--rem90:5.625rem;--rem88:5.5rem;--rem64:4rem;--rem56:3.5rem;--rem48:3rem;--rem40:2.5rem;--rem36:2.25rem;--rem32:2rem;--rem28:1.75rem;--rem26:1.625rem;--rem24:1.5rem;--rem22:1.375rem;--rem20:1.25rem;--rem18:1.125rem;--rem16:1rem;--rem15:0.9375rem;--rem14:0.875rem;--rem12:0.75rem;--rem10:0.625rem;--rem8:0.5rem;--rem6:0.375rem;--rem4:0.25rem;--rem2:0.125rem;--rem1:0.0625rem;--spacer-4xs:0.125rem;--...
- [S6] Duplicate of S2; only abstract page, redundant with PDF version. score=15 type=paper admitted=false warnings=Duplicate of S2.
- [S7] IBM introductory blog; high-level overview with no new benchmarks or analysis. score=10 type=other admitted=false warnings=Introductory blog, not a research source.
- [S8] Official Jamba technical report; provides needle-in-a-haystack results up to 256K tokens and architecture details. score=19 type=technical_report admitted=true warnings=
- [S9] Duplicate of S8; PDF version of the same report. score=15 type=technical_report admitted=false warnings=Duplicate of S8.
- [S10] ICLR 2025 paper on Jamba-1.5; includes RULER benchmark results and 256K context evaluation. score=20 type=technical_report admitted=true warnings=
- [S11] Duplicate of S8; abstract page only. score=15 type=technical_report admitted=false warnings=Duplicate of S8.
- [S12] Personal blog post summarizing Jamba; no original results. score=10 type=other admitted=false warnings=Personal blog, not primary source.
- [S13] Official Jamba-1.5 report; provides RULER and InfiniteBench evaluations for long-context recall. score=19 type=technical_report admitted=true warnings=
- [S14] Fetch error; unreadable. Medium blog, low authority. score=6 type=other admitted=false warnings=Fetch error: HTTP 403; content unavailable.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S15] Titans paper from Google Research; introduces neural long-term memory module and reports needle-in-a-haystack and BABILong results. score=19 type=paper admitted=true warnings=
- [S16] Duplicate of S15; abstract page only. score=15 type=paper admitted=false warnings=Duplicate of S15.
- [S17] Official Google Research blog post summarizing Titans; provides accessible overview and context. score=16 type=other admitted=true warnings=Blog post summarizing the paper; less technical detail.
- [S18] Fetch error; unreadable. Medium blog, low authority. score=6 type=other admitted=false warnings=Fetch error: HTTP 403; content unavailable.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S19] Fetch error; unreadable. Reddit thread, low authority. score=6 type=other admitted=false warnings=Fetch error: HTTP 403; content unavailable.; fetch failed: Source fetch API returned HTTP 403 Forbidden: <body class=theme-beta><div><style>.theme-light,:root{--rem360:22.5rem;--rem320:20rem;--rem192:12rem;--rem144:9rem;--rem128:8rem;--rem96:6rem;--rem90:5.625rem;--rem88:5.5rem;--rem64:4rem;--rem56:3.5rem;--rem48:3rem;--rem40:2.5rem;--rem36:2.25rem;--rem32:2rem;--rem28:1.75rem;--rem26:1.625rem;--rem24:1.5rem;--rem22:1.375rem;--rem20:1.25rem;--rem18:1.125rem;--rem16:1rem;--rem15:0.9375rem;--rem14:0.875rem;--rem12:0.75rem;--rem10:0.625rem;--rem8:0.5rem;--rem6:0.375rem;--rem4:0.25rem;--rem2:0.125rem;--rem1:0.0625rem;--spacer-4xs:0.125rem;--...
- [S20] Duplicate of S15; PDF version. score=15 type=paper admitted=false warnings=Duplicate of S15.
- [S21] Hacker News discussion; anecdotal and lacks rigorous evaluation. score=10 type=other admitted=false warnings=Forum discussion, not a research source.
- [S22] Spheron blog provides deployment insights and performance comparisons for xLSTM and RWKV-7; includes practical operational implications. score=14 type=other admitted=true warnings=Company blog; may lack rigorous peer review.
- [S23] Fetch error; unreadable. Reddit thread, low authority. score=6 type=other admitted=false warnings=Fetch error: HTTP 403; content unavailable.; fetch failed: Source fetch API returned HTTP 403 Forbidden: <body class=theme-beta><div><style>.theme-light,:root{--rem360:22.5rem;--rem320:20rem;--rem192:12rem;--rem144:9rem;--rem128:8rem;--rem96:6rem;--rem90:5.625rem;--rem88:5.5rem;--rem64:4rem;--rem56:3.5rem;--rem48:3rem;--rem40:2.5rem;--rem36:2.25rem;--rem32:2rem;--rem28:1.75rem;--rem26:1.625rem;--rem24:1.5rem;--rem22:1.375rem;--rem20:1.25rem;--rem18:1.125rem;--rem16:1rem;--rem15:0.9375rem;--rem14:0.875rem;--rem12:0.75rem;--rem10:0.625rem;--rem8:0.5rem;--rem6:0.375rem;--rem4:0.25rem;--rem2:0.125rem;--rem1:0.0625rem;--spacer-4xs:0.125rem;--...
- [S24] Emergent Mind aggregator page; secondary summary with no new data. score=11 type=other admitted=false warnings=Aggregator, not original research.
- [S25] Detailed Substack post comparing xLSTM, RWKV-4, Llama, and Mamba on sequence length extrapolation; includes benchmark comparisons. score=13 type=other admitted=true warnings=Blog post, not peer-reviewed.
- [S26] xLSTM paper; provides architecture details and comparison with Mamba, RWKV, and Transformers on language modeling and extrapolation. score=19 type=paper admitted=true warnings=
- [S27] Benchmarks Mamba's document ranking performance; relevant for long-context understanding and includes training throughput analysis. score=17 type=paper admitted=true warnings=

### Evidence Notes

- [S1] Standard SSMs lack the representational capacity to solve multi-query joint recall under sub-quadratic time complexity; augmenting them with context-dependent sparse attention restores expressiveness. Evidence: we prove that SSMs do not have the expressiveness to solve multi-query joint recall in sub-quadratic time complexity Limitations: Theorem is for a synthetic joint-recall task and sub-quadratic time constraint, not for every long-context benchmark.
- [S1] The standard associative-recall synthetic task is criticized as insufficient because it assumes unique key-value mappings independent of context; joint recall adds context-dependency. Evidence: Associative recall does not account for context. Joint recall extends associative recall by incorporating context-dependency into key-value associations. Limitations: Argument made by the paper authors to motivate their task; no external validation in this source.
- [S1] HAX, a context-dependent sparse attention method with sparse Key Selection, instantiates the theoretical CDSA solution and achieves the best performance when integrated into Mamba or Mamba-2. Evidence: Integrating Mamba or Mamba2 with HAX achieves the best performance... HAX consistently outperforms SSM baselines and SSMs integrated with context-independent sparse attention (CISA). Limitations: Evaluated by the proposing authors on synthetic and NLP benchmarks; no production-scale evidence in this source.
- [S1] Context-Dependent Sparse Attention (CDSA) includes content-dependent patterns such as LSH attention, while context-independent sparse attention (CISA) includes sliding-window, A-shaped, and dilated attention. Evidence: Locality-sensitive hashing (LSH) attention exemplifies CDSA, while context-independent sparse attention (CISA) includes sliding window attention, A-shaped attention, and dilated attention. Limitations: Theoretical classification from S1; empirical support is limited to the paper's own experiments.
- [S3] Mamba offers linear computational complexity and constant memory as context length grows, but recent empirical studies show SSMs such as Mamba generally underperform Transformers on long-context understanding tasks. Evidence: offering linear computational complexity and constant memory usage as context length increases... recent studies have shown that SSMs, such as Mamba models, generally underperform compared to Transformers in long-context understanding tasks. Limitations: Aggregate statement; per-task differences may exist.
- [S3] Mamba hidden-state channels split into local and global channels; global channels are the key bottleneck for long-context performance because cumulative hidden-state decay increases exponentially with context length and their receptive fields fail to generalize beyond training length. Evidence: the inability of global channels to handle global information from sequences longer than their training length—due to exponential hidden state decay—is the key bottleneck limiting Mamba’s effectiveness in long-context tasks. Limitations: Based on per-channel attention-pattern analysis of Mamba; may not generalize to all SSMs or RNNs.
- [S3] LongMamba is a training-free method that mitigates hidden-state memory decay in global channels by identifying critical tokens and applying token filtering so only critical tokens accumulate in memory. Evidence: mitigate the hidden state memory decay in these global channels by preventing the accumulation of unimportant tokens in their memory... applying token filtering to accumulate only those critical tokens. Limitations: Claims from the paper; exact benchmark numbers are not present in the provided excerpt.
- [S8] Jamba is a hybrid Transformer-Mamba mixture-of-experts architecture; the released base model has 12B active and 52B total parameters, fits on a single 80GB GPU, and supports up to 256K-token context. Evidence: a powerful model that fits in a single 80GB GPU... strong results for up to 256K tokens context length. Limitations: Specific to Jamba's configuration and training; not a general result for all hybrids.
- [S8] Jamba's needle-in-a-haystack evaluation reports recall of statements placed in the middle of contexts up to 256K tokens. Evidence: needle-in-a-haystack evaluation showing Jamba’s ability to recall statements placed in the middle of contexts of up to 256K tokens length. Limitations: Source is a figure caption; no accuracy percentages are given in the excerpt.
- [S8] Jamba argues that RNN/SSM hidden states capture long-distance relationships only to a limited extent, while Transformers suffer from KV-cache memory and slow inference; the hybrid aims to balance both. Evidence: RNN models... struggle with long distance relationships, which the hidden state captures to only a limited extent. Limitations: Paper's framing; the limitation is not quantified in this excerpt.
- [S8] Before Jamba, prior Attention-SSM hybrids at small scale either lagged pure Mamba or attention-only Mistral-7B; Jamba claims to be the first production-grade Attention-SSM hybrid. Evidence: All of this renders Jamba the first production-grade Attention-SSM hybrid model. Limitations: Claim from Jamba authors; 'production-grade' is a label rather than a measured property.
- [S13] Jamba-1.5 models are claimed to be the only open-weight models with an effective context length of 256K on the RULER benchmark, while offering a 10x reduction in KV-cache memory. Evidence: making them the only models with an effective length of 256K on the RULER benchmark, while offering 10x reduction in KV cache memory Limitations: Authors' evaluation; 'effective length' is RULER-specific.
- [S13] RULER consists of 13 synthetic tasks, including 8 variants of needle-in-a-haystack with multiple needles, one variable-tracking task, two aggregation tasks, and two long-context QA tasks. Evidence: RULER includes 8 variants of needle-in-a-haystack retrieval tasks ... It also has one variable tracking task ... two aggregation tasks ... and two question-answering tasks Limitations: Synthetic tasks may not fully reflect natural long-context usage.
- [S13] In Jamba's hybrid architecture, Mamba-1 paired with attention performs better than Mamba-2 paired with attention, and the hybrid beats pure Mamba-2; without attention, Mamba-2 outperforms Mamba-1. Evidence: we found that in a hybrid architecture, the Mamba-1-Attention combination works better than Mamba-2-Attention... Mamba-2 outperforms Mamba-1 without attention, the hybrid Mamba-1-Attention performs better. Limitations: Experiments were at 350M and 1.3B scale trained for 100B tokens.
- [S13] Jamba-1.5-Large uses a 1:7 attention-to-Mamba layer ratio within blocks, has 94B active and 398B total parameters, and with ExpertsInt8 quantization can be served on 8 80GB GPUs at 256K-token context. Evidence: a : m = 1 : 7 ratio of attention-to-Mamba layers... Jamba-1.5-Large can be served on a single machine with 8 80GB GPUs with context lengths up to 256K tokens. Limitations: Configuration-specific; the ratio was found optimal in Jamba training, not established as universal.
- [S13] At 256K context, Jamba-1.5-Mini uses a 4GB 16-bit KV cache and Jamba-1.5-Large uses 9GB, compared with 32GB for Mixtral 8x7B and 80GB for LLaMA-3.1 70B. Evidence: Jamba-1.5-Mini 52B 12B 4GB Jamba-1.5-Large 398B 94B 9GB Table 1 Limitations: KV-cache size alone; total memory depends on weights and quantization.
- [S15] Titans frames attention as short-term memory that stores growing key-value pairs without compression, while recurrent models compress data into fixed-size hidden states; a very long context cannot be properly compressed into a small vector or matrix state. Evidence: a very long context cannot be properly compressed in a small vector-valued or matrix-valued states Limitations: Cites Wang 2024; the statement is a framing argument rather than a formal impossibility proof.
- [S15] Titans introduces a neural long-term memory module implemented as a deep MLP, rather than a fixed-size vector or matrix, and reports scaling beyond 2M context with higher needle-in-haystack accuracy than baselines. Evidence: acts as a deep neural network (specifically, a multi-layer perceptron)... can effectively scale to larger than 2M context window size with higher accuracy in needle-in-haystack tasks compared to baselines. Limitations: Preprint; abstract-level claims without detailed benchmark tables in the excerpt.
- [S17] Google's December 2025 blog introduces Titans and MIRAS as a way to update model memory during inference and claims fixed-size compression in SSMs/RNNs cannot adequately capture rich information in very long sequences. Evidence: these models offer fast, linear scaling by compressing context into a fixed-size. However, this fixed-size compression cannot adequately capture the rich information in very long sequences. Limitations: Blog summary rather than peer-reviewed evidence; may be promotional.
- [S17] Titans uses a surprise metric based on gradient magnitude to selectively update long-term memory with unexpected or novel inputs, and incorporates momentum to combine momentary and past surprise. Evidence: The model uses this internal error signal (the gradient) as a mathematical equivalent of saying, 'This is unexpected and important!'... Momentum: The model considers both 'momentary surprise' (the current input) and 'past surprise' Limitations: Conceptual explanation; no evaluation numbers are provided in the blog excerpt.
- [S2] The Mamba paper claims it is the first attention-free model to match a strong Transformer++ recipe, especially as sequence length grows, while noting that full context-length-8k results are missing for RWKV and RetNet baselines. Evidence: Mamba is the first attention-free model to match the performance of a very strong Transformer recipe (Transformer++) ... full results on context length 8k are missing for the RWKV and RetNet baselines Limitations: Snippet is decontextualized; the PDF body was not extractable in the provided source text.
- [S22] xLSTM, RWKV-7, and Mamba-3 all maintain a fixed-size recurrent state that does not grow with context length, making VRAM constant regardless of sequence length. Evidence: The recurrent state size for a 7B model is 2-4 GB regardless of whether you have processed 2K tokens or 2M tokens. Limitations: Compute still scales linearly with context length; no recall accuracy numbers provided; source is a blog post, not peer-reviewed.
- [S22] xLSTM uses matrix memory cells with exponential gating, RWKV-7 uses time-mixing with linear attention, and Mamba-3 uses selective state space. Evidence: Architecture comparison table in the blog post lists xLSTM as 'Extended LSTM with matrix memory', RWKV-7 as 'Linear attention with time-mixing', Mamba-3 as 'Selective state space (SSM)'. Limitations: Blog post summary; may oversimplify architectural details.
- [S25] On the Multi-Query Associative Recall task (up to 256 key-value pairs), xLSTM[1:1] performed best among non-transformer models (Mamba, RWKV-5, RWKV-6). Evidence: In the experiments section: 'Transformers are the gold standard here, and among all non-transformer models (Mamba, RWKV-5, RWKV-6, xLSTM[1:1], xLSTM[1:0]), xLSTM[1:1] performed best.' Limitations: Task is limited to 256 pairs (short context); not a long-context benchmark; still behind transformers.
- [S25] sLSTM outperforms mLSTM on formal language tasks, but mLSTM parallelizes well due to lack of memory mixing. Evidence: Results confirm that transformers and SSMs are fundamentally less powerful than RNNs... Also, sLSTM outperforms mLSTM. Limitations: Formal language tasks may not generalize to natural language long-context recall.
- [S25] xLSTM shows good sequence length extrapolation from 2048 to 16384 tokens. Evidence: On the trained context of 2048, they checked extrapolation to a greater length, up to size 16384; with xLSTM, all is well. Limitations: Only perplexity is reported, not recall accuracy; extrapolation success may not guarantee recall performance.
- [S26] xLSTM, RWKV-4, Llama, and Mamba (1.3B parameters) were trained on context length 2048 and tested for sequence length extrapolation up to 16384. Evidence: Sequence Length Extrapolation. Firstly, we test the sequence length extrapolation for 1.3B-sized, large models of xLSTM, RWKV-4, Llama, and Mamba. All models are trained on context length 2048 and checked extrapolation to 16384. Limitations: The snippet does not give the actual results; only the test setup is described.
- [S27] Mamba compresses context into a smaller state, achieving O(1) inference time, but is limited by the amount of information that can be compressed, i.e., the hidden state size. Evidence: State space models compress the context into a smaller state, achieving O(1) time complexity and O(d) space complexity in inference time. ... but also limited by the amount of information that can be compressed, i.e. the hidden state size. Limitations: No quantification of the capacity limit; theoretical claim not tied to specific recall benchmarks.
- [S27] Mamba models achieve competitive performance on document ranking, matching or surpassing transformer-based LMs of similar sizes. Evidence: Mamba models can achieve competitive performance, often matching or even surpassing transformer-based LMs of similar sizes. Limitations: Document ranking is not the same as exact recall; also lower training throughput compared to efficient transformers.

### Claim Verification

- **supported**: Standard state-space models (SSMs) lack the expressiveness to solve multi-query joint recall under sub-quadratic time complexity. — S1 proves that SSMs lack expressiveness for multi-query joint recall under sub-quadratic time complexity.
- **supported**: Mamba's global hidden-state channels suffer exponential decay that limits recall beyond the training length. — S3 identifies exponential hidden-state decay in global channels as the key bottleneck limiting Mamba's long-context performance.
- **supported**: Hybrid architectures that interleave SSM layers with attention layers—Jamba and its successor Jamba-1.5—report effective context lengths of 256K tokens on the RULER benchmark while reducing KV-cache memory by roughly 10× compared to Transformer-only models of similar scale. — S13 states Jamba-1.5 models are the only open-weight models with an effective context length of 256K on RULER and offer 10x KV-cache reduction.
- **supported**: Memory-augmented architectures such as Titans replace the fixed-size state with a deep neural long-term memory module and report needle-in-a-haystack accuracy beyond 2M tokens. — S15 says Titans is a deep MLP memory module that scales beyond 2M context with higher needle-in-haystack accuracy.
- **supported**: SSMs (Mamba/S4) compress the entire preceding context into a fixed-size state whose dimension does not grow with sequence length. At inference, this yields O(1) per-token time and O(d) space complexity. — S27 states SSMs compress context into a fixed-size state, achieving O(1) time and O(d) space complexity at inference.
- **supported**: xLSTM, RWKV-7, and Mamba-3 similarly maintain a fixed-size recurrent state that does not grow with context length, keeping VRAM constant regardless of sequence length. — S22 states that xLSTM, RWKV-7, and Mamba-3 maintain a fixed-size recurrent state, keeping VRAM constant regardless of sequence length.
- **supported**: Standard associative recall assumes unique key-value mappings independent of context. Joint recall adds context-dependency: the correct value depends on surrounding context, not just the key. — S1 states that associative recall does not account for context and that joint recall adds context-dependency.
- **supported**: Context-independent sparse attention (CISA) uses fixed patterns (sliding window, A-shaped, dilated). Context-dependent sparse attention (CDSA) uses content-dependent routing such as locality-sensitive hashing (LSH) attention. — S1 provides a classification: CISA includes sliding window, A-shaped, and dilated attention; CDSA includes LSH attention.
- **supported**: Titans introduces a neural long-term memory module—a deep MLP that is updated during inference—rather than a fixed vector or matrix state. — S15 introduces a long-term memory module as a deep MLP, updated during inference, contrasting with fixed-size states.
- **supported**: Titans frames the same intuition informally: 'a very long context cannot be properly compressed in a small vector-valued or matrix-valued states'. — S15 contains the exact quoted phrase: 'a very long context cannot be properly compressed in a small vector-valued or matrix-valued states'.
- **supported**: Google's December 2025 blog restates this: 'this fixed-size compression cannot adequately capture the rich information in very long sequences'. — S17, the Google blog, states 'fixed-size compression cannot adequately capture the rich information in very long sequences'.
- **supported**: Mamba compresses context into a state of dimension d, achieving O(1) inference time but limited by 'the amount of information that can be compressed, i.e. the hidden state size'. — S27 states that Mamba compresses context into a state and is limited by the amount of information that can be compressed, i.e., the hidden state size.
- **supported**: LongMamba identifies a concrete mechanism: Mamba's hidden-state channels split into local and global channels. Global channels are the bottleneck because 'cumulative hidden-state decay increases exponentially with context length and their receptive fields fail to generalize beyond training length'. — S3 describes the per-channel receptive field analysis in Mamba and states that global channels suffer exponential decay that limits generalization beyond training length.
- **supported**: Recent studies show SSMs 'generally underperform compared to Transformers in long-context understanding tasks'. — S3 states that SSMs such as Mamba generally underperform compared to Transformers in long-context understanding tasks.
- **supported**: The original Mamba paper claims it is 'the first attention-free model to match the performance of a very strong Transformer recipe (Transformer++)'. — The evidence note for S2 confirms this claim: 'Mamba is the first attention-free model to match the performance of a very strong Transformer recipe (Transformer++)'.
- **supported**: The original Mamba paper notes that 'full results on context length 8k are missing for the RWKV and RetNet baselines'. — The evidence note for S2 states: 'full results on context length 8k are missing for the RWKV and RetNet baselines'.
- **supported**: On the Multi-Query Associative Recall task (up to 256 key-value pairs), xLSTM[1:1] 'performed best' among non-transformer models (Mamba, RWKV-5, RWKV-6), but still trailed Transformers. — S25 says that xLSTM[1:1] performed best among non-transformer models on the Multi-Query Associative Recall task.
- **supported**: xLSTM shows sequence-length extrapolation from 2048 to 16384 tokens on perplexity. — S25 states that xLSTM was tested for extrapolation from 2048 to 16384 and 'all is well'; S26 describes the same setup.
- **supported**: Jamba is a Transformer-Mamba mixture-of-experts model: 12B active, 52B total parameters, fitting on a single 80GB GPU, supporting up to 256K-token context. — S8 reports Jamba as having 12B active and 52B total parameters, fits in an 80GB GPU, and supports up to 256K-token context.
- **supported**: Jamba's needle-in-a-haystack evaluation reports recall of statements placed mid-context up to 256K tokens. — S8 describes a needle-in-a-haystack evaluation showing Jamba’s ability to recall statements in contexts up to 256K tokens.
- **supported**: Jamba-1.5 extends this: 'the only models with an effective length of 256K on the RULER benchmark, while offering 10x reduction in KV cache memory'. — S13 states that Jamba-1.5 models are the only models with an effective length of 256K on RULER and offer 10x KV-cache reduction.
- **supported**: RULER comprises 13 synthetic tasks including 8 needle-in-a-haystack variants, variable tracking, aggregation, and QA. — S13 lists the components of RULER: 8 needle-in-a-haystack variants, one variable tracking task, two aggregation tasks, and two QA tasks.
- **supported**: In a hybrid architecture, the Mamba-1-Attention combination works better than Mamba-2-Attention... Mamba-2 outperforms Mamba-1 without attention, the hybrid Mamba-1-Attention performs better. — S13 explicitly states: 'in a hybrid architecture, the Mamba-1-Attention combination works better than Mamba-2-Attention... Mamba-2 outperforms Mamba-1 without attention, the hybrid Mamba-1-Attention performs better.'
- **supported**: Jamba-1.5-Large uses a 1:7 attention-to-Mamba layer ratio, 94B active / 398B total parameters, and serves 256K context on 8×80GB GPUs with ExpertsInt8. — S13 specifies a 1:7 ratio, 94B active / 398B total parameters, and serving on 8×80GB GPUs with 256K context using ExpertsInt8 quantization.

### Final Evaluation

- coverage: 4/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 4/5

Strengths:
- Clear conceptual distinction between recall and understanding prevents conflation of benchmarks.
- Provides both a theoretical proof (S1) and a concrete degradation mechanism (S3) for fixed-state limits.
- Includes practical design implications (e.g., 1:7 attention-to-Mamba ratio, memory trade-offs) and operational comparisons.
- Honest about missing evidence (LoRA distillation, RWKV recall numbers) and benchmark methodology gaps.

Weaknesses:
- No exact accuracy percentages for Jamba's needle-in-a-haystack or Titans' benchmark tables, only claims from sources.
- Discussion of memory layers beyond Titans is absent; the topic is underdeveloped.
- Relies on low-authority blog sources (S22, S25) for some architecture claims and complexity profiles.
- RWKV long-context recall results are entirely absent from the admitted evidence register.

Follow-up recommendations:
- Run unified RULER evaluation on Mamba-2, xLSTM (1:1), RWKV-7, Jamba-1.5-Mini, and a Transformer baseline at 32K–256K to obtain directly comparable per-task accuracy.
- Conduct controlled needle-in-a-haystack sweeps varying needle depth and context length to isolate position-dependent failure.
- Compare LongMamba (training-free filtering) vs. Jamba at matched parameter count on recall and throughput.
- Perform LoRA context distillation fidelity test: fine-tune LoRA on a 128K document, then measure recall of facts using only adapter weights as a function of rank.
- Quantify the information-theoretic capacity of fixed states: measure max retrievable key-value pairs for state dimension d and context length L.
