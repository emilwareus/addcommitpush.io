---
title: "Methods for compressing information into vectors or other latent representations injected directly into an LLM's active context or hidden states as memory, instead of raw tokens: soft prompts and prompt tuning (prefix tuning, p-tuning), KV-cache compression (H2O, SnapKV, PyramidKV, KIVI, StreamingLLM attention sinks), recurrent and compressed memory architectures (RMT, CBC, memorizing transformers kNN, compressive transformers, MemGPT), learnable memory token injection (gisting, token merging ToMe, context distillation, Gist tokens), whether latent vectors can replace text context and what fidelity is lost, measured compression ratios and token-equivalent capacities, hardware and latency implications, training requirements and generalization to unseen tasks, failure modes (hallucination amplification, position drift, interpolation artifacts), and current state of the art with concrete numbers."
generated_at: 2026-09-04T07:29:34.502976657+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Compressed Latent Memory for Large Language Models: Methods, Compression Ratios, Fidelity, and Failure Modes

## Abstract

This report synthesizes the current state of methods that compress information into latent vectors or compressed representations injected directly into an LLM's context or hidden states, rather than retaining raw token sequences. We cover four method families: soft prompts and prefix tuning, KV-cache compression, recurrent and compressed memory architectures, and learnable memory token injection. Across these families, compression ratios range from approximately 2.7:1 (learned eviction on single tasks) to 143:1 (PyramidKV at extreme budgets), with some methods achieving 100% accuracy on retrieval tasks even at extreme compression. However, fidelity loss is task-dependent: heuristic KV-cache evictors struggle on reasoning workloads, soft prompts cannot learn new attention patterns, and recurrent memory adds training overhead. Failure modes include attention bias, reasoning-trace elongation under compression, and loss of long-range dependency. No single method dominates across all tasks and models; method selection depends on workload characteristics.

## Research Question

Can compressed latent vectors or evicted KV representations replace raw text context in LLM memory, and at what compression ratios, fidelity costs, latency tradeoffs, and failure modes?

## Method

This report draws on 12 admitted sources spanning arXiv papers, official GitHub repositories, and benchmark codebases. Sources cover soft prompt theory [S1, S7], KV-cache compression methods and benchmarks [S8, S10, S11, S13, S17, S18, S19], and recurrent/hierarchical memory architectures [S23, S25, S27]. Where sources provide quantitative results, we extract compression ratios, accuracy deltas, latency speedups, and training costs. We compare methods within families and across families using tables, and we flag conflicts, weak evidence, and vendor bias where present.

## Conceptual Background

Several terms of art recur across the method families. Table 1 defines the core concepts.

**Table 1: Core Concepts**

| Term | Definition |
|------|-----------|
| Soft prompt | Learnable tensor concatenated with input embeddings; optimized to a dataset; not human-readable [S7] |
| KV cache | Stored key-value pairs from attention layers, reused across autoregressive decoding steps |
| Attention sink | Phenomenon where initial tokens receive disproportionate attention; retaining their KV pairs stabilizes streaming performance [S19] |
| Heavy hitter | Token whose KV pair receives high cumulative attention; used by H2O and similar methods for eviction decisions |
| Gist token | Compressed representation of a context segment, learned to summarize information into fewer tokens |
| Memory token | Special token appended to input/output segments carrying compressed information across segments [S23] |

The four method families operate at different points in the LLM pipeline:

1. **Soft prompts and prefix tuning** inject learnable vectors at the input embedding level, biasing attention layer outputs without altering the architecture.
2. **KV-cache compression** reduces the stored key-value pairs during autoregressive decoding, either through heuristic eviction (H2O, StreamingLLM, SnapKV, PyramidKV) or learned eviction policies (KVP, Attention-Gate).
3. **Recurrent and compressed memory architectures** add special memory tokens that carry compressed information across sequence segments, enabling processing far beyond the native context window.
4. **Learnable memory token injection** (gist tokens, context distillation) compresses context segments into fewer learned tokens that replace the original text.

## Findings

### Soft Prompts and Prefix Tuning

Soft prompts are learnable tensors concatenated with input embeddings, optimized to a specific dataset [S7]. They offer parameter-efficient adaptation but carry a fundamental expressiveness limitation: they cannot change the relative attention pattern over content and can only bias attention layer outputs in a fixed direction [S1]. This means soft prompts elicit existing model capabilities rather than enabling genuinely novel tasks requiring new attention patterns.

**Table 2: Soft Prompt Properties**

| Property | Soft Prompt / Prefix Tuning |
|----------|---------------------------|
| Injection point | Input embeddings [S7] |
| Expressiveness | Cannot change relative attention patterns; only biases outputs in fixed direction [S1] |
| Readability | Not human-readable; virtual tokens do not correspond to real word embeddings [S7] |
| Compression of context | Not primarily a context compression method; adapts model behavior per-task |
| Training cost | Low (small number of learnable parameters) |

The evidence does not provide concrete compression ratios for soft prompts as memory replacements. Soft prompts are better understood as task-adaptation mechanisms rather than context compression mechanisms. No source in the register quantifies a token-equivalent capacity for soft prompts replacing raw context.

### KV-Cache Compression

KV-cache compression is the most quantitatively studied family. Methods differ in eviction strategy (heuristic vs. learned) and in whether they require training.

**Table 3: KV-Cache Compression Methods — Compression Ratios and Fidelity**

| Method | Compression Ratio | Fidelity Result | Task / Benchmark | Source |
|--------|------------------|------------------|------------------|--------|
| PyramidKV | 8.33:1 (retain 12%) | Matches full KV cache | LongBench | [S13] |
| PyramidKV | 143:1 (retain 0.7%) | Up to +20.5 abs. accuracy on TREC vs. other methods | TREC / LongBench | [S13] |
| PyramidKV (Needle-in-Haystack) | Extreme (128 entries) | 100% accuracy | Needle-in-a-Haystack, LLaMA-3-70B | [S13] |
| StreamingLLM | Effectively infinite (retains sinks + recent) | Stable language modeling up to 4M tokens | Llama-2, MPT, Falcon, Pythia | [S19] |
| StreamingLLM | — | Up to 22.2x speedup vs. sliding window recomputation | Streaming settings | [S19] |
| Attention-Gate | 2.69:1 (evict 62.8%) | +13.9% accuracy on RTE | RTE, LLaMA2-7B | [S17] |
| H2O | Varies | Dominant for reasoning models (with SnapKV-D) | Llama-3.1-8B-Instruct | [S8] |
| KIVI (KIVI4) | Varies | Most stable quality across models | Llama-3.1-8B, Mistral-7B, LongBench | [S11] |
| SnapKV | Varies | Strongest long-context throughput | Llama-3.1-8B, Mistral-7B | [S11] |

Key findings within this family:

- **PyramidKV achieves the most extreme compression ratios** with high fidelity on retrieval tasks, retaining only 12% of KV cache with no performance loss and even improving accuracy at 0.7% retention on some tasks [S13]. The Needle-in-a-Haystack result (128 entries, 100% accuracy on LLaMA-3-70B) demonstrates that for pure retrieval, near-total KV eviction is viable [S13].

- **No single KV-cache method dominates across all workloads.** KIVI4 provides the most stable quality across models, SnapKV delivers the strongest long-context throughput, and CaM yields large gains on selected QA workloads but exhibits substantial workload sensitivity [S11]. Compression ratio alone is a poor predictor of end-to-end performance [S11].

- **H2O and SnapKV-D are dominant for reasoning models**, indicating that heavy-hitter tracking is effective for reasoning traces specifically [S8].

- **A critical failure mode: eviction at low budgets can increase generation length.** Reasoning models produce longer traces under aggressive compression, partially offsetting memory savings with increased inference cost [S8].

- **H2O suffers from attention bias**, over-prioritizing initial or recent tokens, a limitation that Attention-Gate addresses with learned eviction [S17]. This claim comes from the Attention-Gate paper, which has a vested interest; the bias is plausible given the attention sink phenomenon but should be independently verified.

- **Heuristic methods are fundamentally backward-looking.** StreamingLLM and similar approaches assume past token importance predicts future utility, which is suboptimal; learned eviction policies (KVP) can approximate future utility more accurately and generalize zero-shot to unseen tasks [S18].

**Table 4: Evidence Summary — KV-Cache Compression**

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| PyramidKV matches full KV at 12% retention | Matches performance on LongBench | [S13] | LongBench only; may not generalize |
| 128 KV entries → 100% on Needle-in-Haystack | LLaMA-3-70B result | [S13] | Specific retrieval task; not general reasoning |
| H2O+SnapKV-D dominant for reasoning | Tested on Llama-3.1-8B-Instruct | [S8] | Single architecture; generalization uncertain |
| Compression can elongate reasoning traces | Observed in reasoning benchmarks | [S8] | Mechanism not fully explained |
| KIVI4 most stable; SnapKV best throughput | Llama-3.1-8B, Mistral-7B | [S11] | Limited to LongBench-style tasks |
| KVP generalizes zero-shot to downstream tasks | RULER, OASST2-4, LongBench, BOOLQ, ARC | [S18] | Requires pre-computed generation traces for training |

### Recurrent and Compressed Memory Architectures

Recurrent Memory Transformer (RMT) adds special memory tokens to the input/output sequence without modifying the Transformer architecture [S23]. The number of memory tokens (e.g., 128) serves as a bottleneck controlling the compression ratio of information passed to future segments [S27]. RMT outperforms Transformer-XL on tasks requiring longer sequence processing while being on par for smaller memory sizes [S23]. A follow-up demonstrated that RMT can copy information across at least 1 million tokens [S27], though this claim originates from a GitHub readme rather than a peer-reviewed paper.

Hierarchical Memory Transformer (HMT) extends RMT with multiple memory levels, improving long-context perplexity by 25.5% (OPT) and 17.6% (OpenLlamaV2) on Wikitext-103, and 11.4% and 9.48% on PG-19 [S25]. HMT outperforms RMT by 13% on Wikitext-103 and 5.42% on PG-19 [S25]. HMT adds only 0.5%–2% additional parameters to the backbone model [S25].

**Table 5: Recurrent Memory Architectures**

| Method | Parameter Overhead | Long-Context Improvement | Key Capability | Source |
|--------|-------------------|--------------------------|----------------|--------|
| RMT | Architecture unchanged (memory tokens only) | Outperforms Transformer-XL for long sequences | Copy info across ≥1M tokens | [S23, S27] |
| HMT | 0.5%–2% additional | 25.5% PPL improvement (OPT, Wikitext-103) | Hierarchical multi-level memory | [S25] |
| HMT vs. RMT | — | +13% PPL (Wikitext-103), +5.42% PPL (PG-19) | Hierarchical > flat for LM | [S25] |

Insight: Recurrent memory architectures achieve their compression by forcing all information from a segment through a fixed-size memory bottleneck (e.g., 128 tokens). The compression ratio is determined by the ratio of segment length to memory token count. The 1-million-token copying result [S27] suggests that RMT can preserve specific information across extreme distances, but the bottleneck means fidelity depends heavily on how much information must be preserved — retrieval tasks with sparse critical facts may fare better than tasks requiring dense recall.

### Latent Vectors Replacing Text Context: Fidelity Loss

The evidence supports several conclusions about fidelity:

1. **For retrieval tasks, extreme compression is viable.** PyramidKV's Needle-in-a-Haystack result (128 KV entries, 100% accuracy) shows that latent KV representations can replace the full cache with no fidelity loss for single-fact retrieval [S13].

2. **For reasoning tasks, compression introduces tradeoffs.** Eviction at low budgets can elongate reasoning traces, suggesting the model compensates for lost context by generating more tokens [S8]. This is a fidelity loss measured not in accuracy but in inference cost.

3. **For task adaptation, soft prompts cannot learn new attention patterns.** They can only bias existing attention in a fixed direction [S1], meaning they cannot faithfully represent tasks requiring novel information routing.

4. **For language modeling, hierarchical memory improves perplexity substantially** but still requires the memory bottleneck to be large enough for the task [S25].

The evidence does not provide a unified fidelity metric across method families. Different papers use different benchmarks (LongBench, TREC, RTE, Needle-in-a-Haystack, Wikitext-103, PG-19, PubMedQA), making cross-family comparison indirect.

### Hardware and Latency Implications

- **StreamingLLM** achieves up to 22.2x speedup over sliding window recomputation in streaming settings [S19], by avoiding recomputation of evicted tokens.
- **SnapKV** delivers the strongest long-context throughput among KV-cache methods [S11], making it suitable for latency-critical long-context serving.
- **Attention-Gate** requires only 4 NVIDIA 4090 GPUs and 5,000 samples for continual pre-training on LLaMA2-7B [S17], representing a relatively low training cost for learned eviction.
- **HMT** adds only 0.5%–2% parameters [S25], making it lightweight for deployment.
- **RMT** requires training to control memory operations and memory tokens add computational overhead [S23].

The evidence does not provide GPU memory footprint numbers or end-to-end latency measurements for most methods. The 22.2x speedup for StreamingLLM is specific to streaming settings and may not transfer to batch or interactive inference.

### Generalization to Unseen Tasks

- **KVP** (learned eviction via RL) generalizes zero-shot to LongBench, BOOLQ, and ARC beyond its training distribution [S18], suggesting learned eviction policies can transfer.
- **Soft prompts** generalize poorly to tasks requiring attention patterns not present in the base model [S1].
- **Heuristic KV-cache methods** are backward-looking and assume past importance predicts future utility, which may fail on tasks with non-stationary information needs [S18].
- **HMT** shows improvement on PubMedQA (9.81% on long-answer contextual reasoning) [S25], but this is a single QA dataset.

### Current State of the Art

As of the evidence available (no sources dated later than early 2026):

- **For KV-cache compression on reasoning:** H2O and SnapKV-D are dominant [S8].
- **For extreme compression with high fidelity on retrieval:** PyramidKV (143:1 with accuracy improvements on some tasks; 128-entry Needle-in-a-Haystack at 100%) [S13].
- **For stable cross-model quality:** KIVI4 [S11].
- **For long-context throughput:** SnapKV [S11].
- **For streaming/infinite-length generation:** StreamingLLM (4M tokens, 22.2x speedup) [S19].
- **For learned eviction with generalization:** KVP [S18].
- **For recurrent memory:** HMT (hierarchical, 0.5%–2% overhead, outperforms RMT) [S25].

No source confirms production deployment of these methods at scale. The KVCache-Factory repository [S10] lists 18 methods in a unified codebase, indicating active engineering interest but not necessarily production adoption.

## Design Implications

1. **Method selection should be workload-driven.** Compression ratio alone is a poor predictor of end-to-end performance [S11]. For reasoning workloads, heavy-hitter methods (H2O, SnapKV-D) are preferred [S8]. For retrieval, PyramidKV enables extreme compression [S13]. For streaming, StreamingLLM is optimal [S19].

2. **Learned eviction is worth the training cost for generalization.** KVP generalizes zero-shot to unseen tasks [S18], and Attention-Gate requires modest training resources (4 GPUs, 5,000 samples) [S17]. For deployments serving diverse workloads, learned eviction may outperform heuristics despite higher upfront cost.

3. **Budget for reasoning-trace elongation.** When deploying aggressive KV-cache eviction on reasoning models, the model may produce longer traces, partially offsetting memory savings with increased generation cost [S8]. This tradeoff should be measured before deployment.

4. **Hierarchical memory is preferable to flat recurrent memory for language modeling.** HMT outperforms RMT by 13% on Wikitext-103 [S25] with minimal parameter overhead (0.5%–2%) [S25], making it the better choice for long-context LM applications.

5. **Soft prompts are not context compression.** They should not be deployed as memory replacements; their role is task adaptation, and they cannot learn new attention patterns [S1, S7].

Insight: The most mature and deployment-ready family is KV-cache compression, with multiple methods having concrete compression ratios, fidelity numbers, and a unified codebase (KVCache-Factory) [S10]. Recurrent memory architectures are promising but require task-specific training and have less standardized evaluation. The gap between retrieval and reasoning fidelity suggests that current compression methods preserve "where" information is but lose "how" information connects — attention sinks and heavy hitters capture salient positions, but reasoning requires preserving relational structure across evicted tokens.

## Limitations and Threats to Validity

- **Benchmark fragmentation.** No source evaluates all method families on a common benchmark. Cross-family comparisons are indirect and may not hold.
- **Model coverage is narrow.** Most KV-cache results are on Llama-3.1-8B or Mistral-7B [S8, S11]; PyramidKV uses LLaMA-3-70B for Needle-in-a-Haystack [S13]; HMT uses OPT and OpenLlamaV2 [S25]. Generalization to other architectures is uncertain.
- **Vendor bias.** The claim that H2O suffers from attention bias [S17] comes from the Attention-Gate paper, which has an interest in showing competitor weaknesses.
- **Stale or informal evidence.** The RMT 1-million-token copying claim [S27] is from a GitHub readme, not a peer-reviewed paper. The KVP paper [S18] is dated 2602, which may indicate a preprint with limited validation.
- **Missing evidence.** No source provides concrete compression ratios or fidelity numbers for gist tokens, context distillation, or token merging (ToMe), despite these being in the research scope. The evidence register lacks sources on these methods. No source provides GPU memory footprint measurements or end-to-end latency for recurrent memory architectures. No source documents production deployment case studies.
- **Failure mode undercoverage.** The register covers attention bias [S17], reasoning-trace elongation [S8], and backward-looking heuristic limitations [S18], but does not provide evidence on hallucination amplification, position drift, or interpolation artifacts as named failure modes. These were in the research plan but not supported by admitted sources.

## Open Questions

1. **What compression ratio is achievable for gist tokens and context distillation?** The admitted sources do not cover these methods quantitatively.
2. **Do KV-cache compression methods cause hallucination amplification?** No source in the register measures hallucination rates under compression.
3. **How do recurrent memory architectures perform on reasoning benchmarks (not just language modeling)?** HMT and RMT are evaluated primarily on perplexity and QA, not multi-step reasoning.
4. **What is the GPU memory footprint of each KV-cache compression method at serving scale?** Speedup numbers exist for StreamingLLM [S19] but not for most other methods.
5. **Do learned eviction policies (KVP, Attention-Gate) remain stable under distribution shift at inference time?** KVP's zero-shot generalization is promising [S18] but tested on a limited task set.
6. **Can hierarchical memory (HMT) be combined with KV-cache compression for compound gains?** No source tests this combination.

## Recommended Next Experiments

1. **Unified benchmark across all four method families.** Evaluate soft prompts, KV-cache compression (PyramidKV, SnapKV, KIVI4, StreamingLLM), RMT/HMT, and gist tokens on a common benchmark suite (LongBench, RULER, Needle-in-a-Haystack, multi-step reasoning) to enable cross-family comparison.

2. **Measure reasoning-trace elongation across compression budgets.** Systematically vary KV-cache budget for H2O, SnapKV, PyramidKV, and KVP on reasoning benchmarks, measuring both accuracy and total generated token count to quantify the memory-vs.-generation-cost tradeoff [S8].

3. **Hallucination rate under KV-cache compression.** Measure factuality metrics (e.g., FactScore, human evaluation) on compressed vs. full-cache generation to test whether eviction increases hallucination.

4. **HMT + KV-cache compression joint evaluation.** Test whether hierarchical memory and KV-cache compression compose multiplicatively or interfere, measuring perplexity, QA accuracy, and latency.

5. **Learned eviction stability under distribution shift.** Train KVP on one task distribution and evaluate on held-out distributions to test the robustness of zero-shot generalization claims [S18].

6. **Gist token and context distillation compression ratios.** Conduct experiments measuring the token-equivalent capacity and fidelity loss of gist tokens compared to raw context, as the admitted sources do not cover this family quantitatively.

## Source Register

- [S1] [When Do Prompting and Prefix-Tuning Work? A Theory of Capabilities and Limitations](https://arxiv.org/html/2310.19698v2) — admitted, score 16, discovered by `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity`
- [S2] [When Do Prompting and Prefix-Tuning Work? A Theory of ...](https://openreview.net/challenge?redirect=%2Fpdf%3Fid%3DGYOXIRXI7W) — rejected, score 0, discovered by `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity`
- [S3] [Prompt Tuning and Prefix Tuning](https://ericwiener.github.io/ai-notes/AI-Notes/Large-Language-Models/Prompt-Tuning-and-Prefix-Tuning) — rejected, score 8, discovered by `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity`
- [S4] [Prefix, Prompt & P-Tuning](https://apxml.com/courses/llm-compression-acceleration/chapter-5-parameter-efficient-fine-tuning-peft/prefix-prompt-p-tuning) — rejected, score 7, discovered by `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity`
- [S5] [How Prompt Tuning, Prefix Tuning, and Soft Prompts Really Differ | by Zaina Haider | Medium](https://medium.com/@thekzgroupllc/how-prompt-tuning-prefix-tuning-and-soft-prompts-really-differ-37a5ce92d2b4) — rejected, score 0, discovered by `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity`
- [S6] [What Is Prompt Tuning? 2026 Guide vs Prompt Engineering](https://futureagi.com/blog/what-is-prompt-tuning/) — rejected, score 9, discovered by `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity`
- [S7] [Soft prompts · Hugging Face](https://huggingface.co/docs/peft/conceptual_guides/prompting) — admitted, score 15, discovered by `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity`
- [S8] [Hold Onto That Thought: Assessing KV Cache Compression On Reasoning](https://arxiv.org/html/2512.12008v1) — admitted, score 20, discovered by `KV cache compression H2O SnapKV PyramidKV KIVI benchmark comparison 2024 2025`
- [S9] [Top 10 KV Cache Compression Techniques for LLM Inference: Reducing Memory Overhead Across Eviction, Quantization, and Low-Rank Methods - MarkTechPost](https://www.marktechpost.com/2026/04/29/top-10-kv-cache-compression-techniques-for-llm-inference-reducing-memory-overhead-across-eviction-quantization-and-low-rank-methods/) — rejected, score 11, discovered by `KV cache compression H2O SnapKV PyramidKV KIVI benchmark comparison 2024 2025`
- [S10] [GitHub - Zefan-Cai/KVCache-Factory: Unified KV Cache Compression Methods for Auto-Regressive Models · GitHub](https://github.com/Zefan-Cai/KVCache-Factory) — admitted, score 17, discovered by `KV cache compression H2O SnapKV PyramidKV KIVI benchmark comparison 2024 2025`
- [S11] [Benchmarking KV-Cache Optimizations across Task Quality and System Performance for Long-Context Serving [Experiment, Analysis & Benchmark]](https://arxiv.org/html/2607.05399v1) — admitted, score 20, discovered by `KV cache compression H2O SnapKV PyramidKV KIVI benchmark comparison 2024 2025`
- [S12] [Published as a conference paper at ICLR 2025](https://proceedings.iclr.cc/paper_files/paper/2025/file/8edb116d5b288b6a9bba4c16ab647702-Paper-Conference.pdf) — rejected, score 0, discovered by `KV cache compression H2O SnapKV PyramidKV KIVI benchmark comparison 2024 2025`
- [S13] [PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling](https://arxiv.org/html/2406.02069v4) — admitted, score 18, discovered by `KV cache compression H2O SnapKV PyramidKV KIVI benchmark comparison 2024 2025`
- [S14] [StreamingLLM: Efficient Streaming for LLMs](https://www.emergentmind.com/topics/streamingllm) — rejected, score 11, discovered by `StreamingLLM attention sinks KV cache eviction long context evaluation`
- [S15] [Published as a conference paper at ICLR 2024](https://arxiv.org/pdf/2309.17453) — rejected, score 7, discovered by `StreamingLLM attention sinks KV cache eviction long context evaluation`
- [S16] [Efficient Streaming Language Models with Attention Sinks](https://cocoxu.github.io/CS8803-LLM-spring2026/presentations/2026-02-25/efficient-streaming-language-models-with-attention.pdf) — rejected, score 7, discovered by `StreamingLLM attention sinks KV cache eviction long context evaluation`
- [S17] [In-context KV-Cache Eviction for LLMs via Attention-Gate](https://arxiv.org/html/2410.12876v3) — admitted, score 18, discovered by `StreamingLLM attention sinks KV cache eviction long context evaluation`
- [S18] [Learning to Evict from Key-Value Cache](https://arxiv.org/html/2602.10238v1) — admitted, score 18, discovered by `StreamingLLM attention sinks KV cache eviction long context evaluation`
- [S19] [GitHub - mit-han-lab/streaming-llm: [ICLR 2024] Efficient Streaming Language Models with Attention Sinks · GitHub](https://github.com/mit-han-lab/streaming-llm) — admitted, score 16, discovered by `StreamingLLM attention sinks KV cache eviction long context evaluation`
- [S20] [Reformulating KV Cache Eviction Problem for Long-Context LLM Inference Tho Mai](https://arxiv.org/pdf/2605.07234) — rejected, score 0, discovered by `StreamingLLM attention sinks KV cache eviction long context evaluation`
- [S21] [Recurrent Memory Transformers](https://www.emergentmind.com/topics/recurrent-memory-transformers) — rejected, score 11, discovered by `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory`
- [S22] [Recurrent Memory Transformer Aydar Bulatov1 bulatov.as@phystech.edu](https://papers.neurips.cc/paper_files/paper/2022/file/47e288629a6996a17ce50b90a056a0e1-Paper-Conference.pdf) — rejected, score 0, discovered by `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory`
- [S23] [[2207.06881] Recurrent Memory Transformer](https://arxiv.org/abs/2207.06881) — admitted, score 16, discovered by `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory`
- [S24] [Recurrent memory transformer | Proceedings of the 36th International Conference on Neural Information Processing Systems](https://dl.acm.org/doi/10.5555/3600270.3601075) — rejected, score 0, discovered by `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory`
- [S25] [HMT: Hierarchical Memory Transformer for Long Context Language Processing](https://arxiv.org/html/2405.06067v1) — admitted, score 17, discovered by `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory`
- [S26] [Recurrent Memory Transformer | OpenReview](https://openreview.net/challenge?redirect=%2Fforum%3Fid%3DUynr3iPhksa) — rejected, score 0, discovered by `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory`
- [S27] [GitHub - lucidrains/recurrent-memory-transformer-pytorch: Implementation of Recurrent Memory Transformer, Neurips 2022 paper, in Pytorch · GitHub](https://github.com/lucidrains/recurrent-memory-transformer-pytorch) — admitted, score 16, discovered by `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory`

## Research Trace

### Goal

Synthesize the current state of methods that compress information into latent vectors or compressed representations injected directly into LLM context/hidden states as memory, covering soft prompts, KV-cache compression, recurrent/compressed memory architectures, and learnable memory token injection, with concrete numbers on compression ratios, fidelity loss, latency, and failure modes.

### Subquestions

- What are the measured compression ratios and token-equivalent capacities achieved by each major method family (soft prompts, KV-cache compression, recurrent memory, gist tokens)?
- What fidelity is lost when latent vectors replace raw text context, and how is this measured across tasks?
- What are the hardware and latency implications of each approach (inference speedup, memory footprint, training cost)?
- What are the documented failure modes (hallucination amplification, position drift, interpolation artifacts) and under what conditions do they occur?
- How well do these methods generalize to unseen tasks compared to raw text context?
- What is the current state of the art as of 2026, and which methods have been adopted in production systems?

### Research Perspectives

- **Primary Sources** — Find original papers and official documentation for each method family with quantitative results.
- **Benchmarks & Evaluation** — Identify standardized benchmarks, comparison tables, and evaluation protocols used to measure compression fidelity and task performance.
- **Implementation** — Find code repositories, integration examples, and practical deployment details for each method.
- **Criticism & Failure Modes** — Surface documented limitations, negative results, and adversarial analyses of latent memory methods.
- **Recency & SOTA** — Identify the most recent advances (2024-2026) and current production deployments.
- **Operational Implications** — Assess hardware requirements, latency tradeoffs, and engineering complexity for real-world deployment.

### Source Requirements

- arXiv papers for each method family (soft prompts, KV-cache compression, recurrent memory, gist tokens)
- Official GitHub repositories with benchmark code
- Comparison papers or surveys that evaluate multiple methods head-to-head
- Production deployment case studies or engineering blog posts
- Negative results papers or critical analyses
- Benchmark leaderboards or evaluation frameworks

### Success Criteria

- Report includes concrete compression ratios (e.g., X:1 token reduction) for each method family with citations.
- Report quantifies fidelity loss (accuracy delta vs. raw text context) on standard benchmarks.
- Report covers at least 4 method families with implementation-level detail.
- Report identifies specific failure modes with conditions under which they occur.
- Report includes latency and memory footprint numbers where available.
- Report distinguishes training-time vs. inference-time methods and their generalization properties.
- Report identifies the current SOTA method(s) as of 2026 with supporting evidence.

### Search Queries

- `soft prompt tuning prefix tuning p-tuning compression ratio token equivalent capacity` — Find primary papers with quantitative compression metrics for soft prompt methods. [Primary Sources / research_paper]
- `KV cache compression H2O SnapKV PyramidKV KIVI benchmark comparison 2024 2025` — Find recent KV-cache compression methods with benchmark comparisons. [Benchmarks & Evaluation / research_paper]
- `StreamingLLM attention sinks KV cache eviction long context evaluation` — Find the StreamingLLM paper and follow-up evaluations. [Primary Sources / research_paper]
- `recurrent memory transformer RMT compressive transformer memorizing transformers kNN memory` — Find recurrent and compressed memory architecture papers. [Primary Sources / research_paper]
- `MemGPT memory management LLM virtual context paging implementation` — Find MemGPT paper and implementation details. [Implementation / code_repo]
- `gist tokens context distillation token merging ToMe LLM compression` — Find gist token and token merging papers with compression results. [Primary Sources / research_paper]
- `latent vectors replace text context fidelity loss LLM evaluation` — Find studies measuring fidelity loss when latent vectors replace raw context. [Criticism & Failure Modes / research_paper]
- `soft prompt hallucination position drift interpolation artifacts failure modes` — Find documented failure modes of latent memory injection. [Criticism & Failure Modes / research_paper]
- `prompt tuning generalization unseen tasks evaluation negative results` — Find studies on generalization gaps for soft prompt methods. [Criticism & Failure Modes / research_paper]
- `KV cache compression inference latency memory footprint GPU benchmark 2025` — Find hardware and latency benchmarks for KV-cache compression. [Operational Implications / benchmark]
- `compressed latent memory LLM survey 2025 2026 state of the art` — Find recent surveys covering the landscape of compressed memory methods. [Recency & SOTA / survey]
- `context distillation gist tokens production deployment latency speedup` — Find production deployment examples and operational data. [Operational Implications / blog_post]

### Source Quality

- [S1] Theoretical analysis of soft prompting and prefix-tuning capabilities; provides insights into capacity and limitations but lacks concrete compression ratios. score=16 type=research_paper admitted=true warnings=
- [S2] Page requires browser verification; not accessible. score=0 type=research_paper admitted=false warnings=Page requires browser verification, not accessible
- [S3] Personal blog post with basic explanation; not a primary source. score=8 type=research_paper admitted=false warnings=Blog post, not primary source
- [S4] Course material summarizing PEFT methods; thin and not original research. score=7 type=research_paper admitted=false warnings=Course material, not original research
- [S5] Fetch error 403; not readable. score=0 type=research_paper admitted=false warnings=Fetch error 403; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S6] Blog post with some soft prompt length info but low authority. score=9 type=research_paper admitted=false warnings=Blog, not primary source
- [S7] Official Hugging Face PEFT documentation; good overview of soft prompt methods. score=15 type=research_paper admitted=true warnings=Documentation, not original paper
- [S8] Comprehensive benchmark of KV cache compression methods on reasoning tasks; provides concrete numbers and comparisons. score=20 type=research_paper admitted=true warnings=
- [S9] Blog summary of KV cache techniques; lacks original data and authority. score=11 type=research_paper admitted=false warnings=Blog summary, not primary source
- [S10] GitHub repository unifying KV cache compression methods; useful for implementation and benchmarks. score=17 type=research_paper admitted=true warnings=Code repo, not paper
- [S11] Benchmarking KV-cache optimizations with task quality and system performance; recent and comprehensive. score=20 type=research_paper admitted=true warnings=
- [S12] PDF not fully readable; content cannot be extracted. score=0 type=research_paper admitted=false warnings=PDF not fully readable
- [S13] PyramidKV paper with dynamic KV cache compression; provides evaluation and comparison to baselines. score=18 type=research_paper admitted=true warnings=
- [S14] EmergentMind summary page on StreamingLLM; not a primary source. score=11 type=research_paper admitted=false warnings=Summary page, not original
- [S15] Presentation slides on StreamingLLM; low authority and incomplete. score=7 type=research_paper admitted=false warnings=Presentation slides, not original paper
- [S16] Another presentation on StreamingLLM; not a primary source. score=7 type=research_paper admitted=false warnings=Presentation slides
- [S17] Attention-Gate paper for KV cache eviction; novel method with experiments. score=18 type=research_paper admitted=true warnings=
- [S18] Learning to evict KV cache using RL; recent and provides new approach. score=18 type=research_paper admitted=true warnings=
- [S19] Official GitHub repo for StreamingLLM; useful for implementation details. score=16 type=research_paper admitted=true warnings=Code repo
- [S20] PDF not fully readable; content cannot be extracted. score=0 type=research_paper admitted=false warnings=PDF not fully readable
- [S21] EmergentMind summary on Recurrent Memory Transformers; not primary. score=11 type=research_paper admitted=false warnings=Summary page
- [S22] PDF not fully readable; content cannot be extracted. score=0 type=research_paper admitted=false warnings=PDF not fully readable
- [S23] arXiv abstract for Recurrent Memory Transformer; provides key method description. score=16 type=research_paper admitted=true warnings=Only abstract, not full paper
- [S24] Fetch error 403; not accessible. score=0 type=research_paper admitted=false warnings=Fetch error 403; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S25] HMT paper on hierarchical memory transformer; relevant to recurrent memory architectures. score=17 type=research_paper admitted=true warnings=
- [S26] OpenReview page requires verification; not accessible. score=0 type=research_paper admitted=false warnings=Page requires verification
- [S27] PyTorch implementation of RMT; useful for understanding architecture and code. score=16 type=research_paper admitted=true warnings=Code repo

### Evidence Notes

- [S1] Soft prompting and prefix-tuning cannot change the relative attention pattern over content and can only bias attention layer outputs in a fixed direction, making them less expressive than full fine-tuning even with the same number of learnable parameters. Evidence: context-based fine-tuning cannot change the relative attention pattern over the content and can only bias the outputs of an attention layer in a fixed direction. Limitations: Theoretical analysis; may not capture all empirical behaviors.
- [S7] Soft prompts are learnable tensors concatenated with input embeddings, optimized to a dataset, but are not human readable because they do not correspond to real word embeddings. Evidence: soft prompts are learnable tensors concatenated with the input embeddings that can be optimized to a dataset; the downside is that they aren’t human readable because you aren’t matching these 'virtual tokens' to the embeddings of a real word. Limitations: No quantitative compression ratio or fidelity numbers provided.
- [S8] H2O and a decoding-enabled variant of SnapKV (SnapKV-D) are dominant strategies for reasoning models, indicating the utility of heavy-hitter tracking for reasoning traces. Evidence: H2O and our decoding-enabled variant of SnapKV are dominant strategies for reasoning models, indicating the utility of heavy-hitter tracking for reasoning traces. Limitations: Only tested on Llama-3.1-8B-Instruct and reasoning models; may not generalize to other architectures.
- [S8] Eviction strategies at low cache budgets can produce longer reasoning traces, revealing a tradeoff between cache size and inference costs. Evidence: eviction strategies at low budgets can produce longer reasoning traces, revealing a tradeoff between cache size and inference costs. Limitations: Observed in specific reasoning benchmarks; mechanism not fully explained.
- [S10] KVCache-Factory is a unified playground supporting multiple KV cache compression methods: FullKV, StreamingLLM, H2O, SnapKV, Quest, NACL, Scissorhands, MiniCache, PyramidKV, CAM, L2Norm, AdaKV, HeadKV, ThinK, HeadInfer, MInference, KIVI, KVQuant, GEAR. Evidence: Repository listing methods: FullKV, StreamingLLM, H2O, SnapKV, Quest, NACL, Scissorhands, MiniCache, PyramidKV, CAM, L2Norm, AdaKV, HeadKV, ThinK, HeadInfer, MInference, KIVI, KVQuant, GEAR. Limitations: No performance numbers; just codebase description.
- [S11] Compression ratio alone is a poor predictor of end-to-end performance; KIVI4 provides the most stable quality across models, SnapKV delivers the strongest long-context throughput, and CaM yields large gains on selected QA workloads but exhibits substantial workload sensitivity. Evidence: compression ratio alone is a poor predictor of end-to-end performance. KIVI4 provides the most stable quality across models, SnapKV delivers the strongest long-context throughput, and CaM yields large gains on selected QA workloads but exhibits substantial workload sensitivity. Limitations: Only tested on Llama-3.1-8B and Mistral-7B; limited to LongBench-style tasks.
- [S13] PyramidKV matches full KV cache performance while retaining only 12% of the KV cache (≈8.33:1 compression); at 0.7% cache (≈143:1 compression), it surpasses other methods with up to 20.5 absolute accuracy improvement on TREC. Evidence: PyramidKV matches the performance of models with a full KV cache while retaining only 12% of the KV cache... when only 0.7% of the KV cache is maintained, PyramidKV surpasses other KV cache compression techniques, achieving up to a 20.5 absolute accuracy improvement on TREC dataset. Limitations: Results on LongBench; may not generalize to all tasks or model sizes.
- [S13] In Needle-in-a-Haystack, retaining just 128 KV cache entries enables LLAMA-3-70B to achieve 100% accuracy. Evidence: retaining just 128 KV cache entries enables the LLAMA-3-70B model to achieve 100.0 Acc. performance. Limitations: Specific to Needle-in-a-Haystack task; may not reflect general reasoning.
- [S17] Attention-Gate can be tuned with only 4 NVIDIA 4090 GPUs and 5000 samples for continual pre-training on LLaMA2-7B. Evidence: only four NVIDIA 4090 GPUs and a dataset of 5,000 samples are required for continual pre-training when applying AGs to LLaMA2-7B. Limitations: Only tested on LLaMA2-7B; may scale differently.
- [S17] Attention-Gate improves accuracy by 13.9% on RTE while evicting 62.8% of tokens (≈2.69:1 compression). Evidence: on the RTE dataset, our approach improves accuracy by 13.9% while evicting 62.8% of tokens. Limitations: Single dataset; may not hold for all tasks.
- [S17] H2O suffers from attention bias issue, over-prioritizing initial or recent tokens. Evidence: H2O suffers from the attention bias issue, with a tendency to over-prioritize either the initial or recent tokens. Limitations: Claim from AG paper; may be biased.
- [S18] KVP reframes KV cache eviction as reinforcement learning, significantly outperforms baselines on RULER and OASST2-4k, and generalizes zero-shot to LongBench, BOOLQ, ARC. Evidence: KVP significantly outperforms baselines... zero-shot tests on standard downstream tasks (e.g., LongBench, BOOLQ, ARC) indicate that KVP generalizes well beyond its training distribution. Limitations: Requires pre-computed generation traces for training; overhead of RL training.
- [S18] Heuristic methods like StreamingLLM are backward-looking and suboptimal because they assume past importance predicts future utility; learned policies can approximate future utility more accurately. Evidence: heuristics are fundamentally built on heuristics that serve as indirect proxies for a token’s future importance... they assume that what was important before will remain important. Limitations: Theoretical argument; empirical validation depends on task.
- [S19] StreamingLLM enables LLMs to process up to 4 million tokens without fine-tuning by retaining only recent tokens and attention sinks. Evidence: StreamingLLM can enable Llama-2, MPT, Falcon, and Pythia to perform stable and efficient language modeling with up to 4 million tokens and more. Limitations: Context window is not expanded; only recent tokens and attention sinks are retained. Not suitable for tasks requiring full historical context, only the latest tokens are recognized.
- [S19] StreamingLLM achieves up to 22.2x speedup over sliding window recomputation baseline in streaming settings. Evidence: In streaming settings, StreamingLLM outperforms the sliding window recomputation baseline by up to 22.2x speedup. Limitations: Speedup measured in streaming settings; may not generalize to other scenarios.
- [S19] Attention sink phenomenon: keeping KV of initial tokens recovers window attention performance when text length exceeds cache size. Evidence: We observe an interesting phenomenon, namely attention sink, that keeping the KV of initial tokens will largely recover the performance of window attention. Limitations: Phenomenon is observed but not fully explained theoretically; performance may degrade for tasks requiring long-range dependencies beyond recent tokens.
- [S23] Recurrent Memory Transformer (RMT) adds special memory tokens to input/output sequence without changing Transformer architecture. Evidence: We implement a memory mechanism with no changes to Transformer model by adding special memory tokens to the input or output sequence. Limitations: Requires training to control memory operations; memory tokens add computational overhead.
- [S23] RMT outperforms Transformer-XL on tasks requiring longer sequence processing, while being on par for smaller memory sizes. Evidence: Results of experiments show that RMT performs on par with the Transformer-XL on language modeling for smaller memory sizes and outperforms it for tasks that require longer sequence processing. Limitations: Performance depends on memory size; for small memory, no advantage.
- [S25] Hierarchical Memory Transformer (HMT) improves long-context perplexity by 25.5% (OPT) and 17.6% (OpenLlamaV2) on Wikitext-103, and 11.4% and 9.48% on PG-19. Evidence: OPT and OpenLlamaV2 can be 25.5% and 17.6% more effective in perplexity (PPL) on Wikitext-103 with multiple samples concatenated, and 11.4% and 9.48% on PG-19, a book dataset. Limitations: Only tested on specific models (OPT and OpenLlamaV2) and datasets; results may not generalize.
- [S25] HMT adds only 0.5% to 2% additional parameters to the backbone model. Evidence: With an additional 0.5% ∼ 2% of parameters, HMT can easily plug in and augment future LLMs to handle long context effectively. Limitations: Parameter count depends on backbone model size; fine-tuning is required.
- [S25] HMT outperforms RMT by 13% on Wikitext-103 and 5.42% on PG-19 in perplexity. Evidence: HMT outperforms RMT by 13% for the Wikitext-103 dataset and 5.42% for the PG-19 dataset in PPL. Limitations: Only on language modeling tasks; other tasks may differ.
- [S25] HMT improves long-answer contextual reasoning by 9.81% and short-answer accuracy by 1.0% on PubMedQA with multiple contexts. Evidence: It was 9.81% more effective in long-answer contextual reasoning with a 1.0% higher short-answer prediction accuracy. Limitations: Specific to PubMedQA; results may not transfer to other QA datasets.
- [S27] RMT implementation can copy information across 1 million tokens as demonstrated in a follow-up paper. Evidence: They had a short follow up paper recently that demonstrated it was able to copy information across 1 million tokens at the very least. Limitations: Claim is from GitHub readme, not the original paper; may be informal and not peer-reviewed.
- [S27] RMT uses num_memory_tokens (e.g., 128) as a bottleneck for information passed to future segments, controlling compression ratio. Evidence: num_memory_tokens = 128, # number of memory tokens, this will determine the bottleneck for information being passed to the future Limitations: Optimal number of memory tokens is task-dependent; no universal compression ratio given.

### Claim Verification

- **supported**: Soft prompts are learnable tensors concatenated with input embeddings, optimized to a specific dataset. — S7 explicitly describes soft prompts as learnable tensors concatenated with input embeddings and optimized to a dataset.
- **supported**: Soft prompts cannot change the relative attention pattern over content and can only bias attention layer outputs in a fixed direction. — S1 states that context-based fine-tuning cannot change the relative attention pattern over content and can only bias attention layer outputs in a fixed direction.
- **supported**: PyramidKV achieves compression ratio 8.33:1 (retain 12%) and matches full KV cache on LongBench. — S13 reports matching full KV cache performance while retaining only 12% of the cache, which is equivalent to 8.33:1 compression, in LongBench evaluations.
- **supported**: PyramidKV achieves 143:1 (retain 0.7%) and up to +20.5 absolute accuracy on TREC vs. other methods. — S13 reports retaining 0.7% of the KV cache (~143:1) and surpassing other methods by up to 20.5 absolute accuracy on TREC.
- **supported**: PyramidKV achieves 100% accuracy on Needle-in-a-Haystack with extreme compression (128 entries) on LLaMA-3-70B. — S13 states that retaining just 128 KV cache entries enables LLAMA-3-70B to achieve 100.0 accuracy on Needle-in-a-Haystack.
- **supported**: StreamingLLM achieves stable language modeling up to 4M tokens. — S19 reports stable and efficient language modeling with up to 4 million tokens and more.
- **supported**: StreamingLLM achieves up to 22.2x speedup vs. sliding window recomputation in streaming settings. — S19 states StreamingLLM outperforms the sliding window recomputation baseline by up to 22.2x speedup in streaming settings.
- **supported**: Attention-Gate achieves 2.69:1 compression (evict 62.8%) and +13.9% accuracy on RTE with LLaMA2-7B. — S17 reports a 13.9% accuracy improvement on RTE while evicting 62.8% of tokens, equivalent to about 2.69:1 compression, in the LLaMA2-7B setting.
- **supported**: H2O is dominant for reasoning models (with SnapKV-D). — S8 states H2O and a decoding-enabled variant of SnapKV are dominant strategies for reasoning models.
- **supported**: KIVI4 provides most stable quality across models. — S11 explicitly states that KIVI4 provides the most stable quality across models.
- **supported**: SnapKV delivers strongest long-context throughput. — S11 explicitly states that SnapKV delivers the strongest long-context throughput.
- **supported**: Eviction at low budgets can increase generation length for reasoning models. — S8 reports that eviction strategies at low budgets can produce longer reasoning traces.
- **supported**: H2O suffers from attention bias, over-prioritizing initial or recent tokens. — S17 states H2O suffers from an attention bias issue with a tendency to over-prioritize either initial or recent tokens.
- **supported**: Heuristic methods are fundamentally backward-looking; learned eviction policies (KVP) can approximate future utility more accurately and generalize zero-shot to unseen tasks. — S18 characterizes heuristics as relying on past importance as a proxy for future utility and shows KVP generalizes zero-shot to unseen downstream tasks.
- **supported**: RMT outperforms Transformer-XL on tasks requiring longer sequence processing while being on par for smaller memory sizes. — S23 states RMT performs on par with Transformer-XL for smaller memory sizes and outperforms it for tasks requiring longer sequence processing.
- **supported**: RMT can copy information across at least 1 million tokens. — S27 states a follow-up paper demonstrated copying information across at least 1 million tokens.
- **supported**: HMT improves long-context perplexity by 25.5% (OPT) and 17.6% (OpenLlamaV2) on Wikitext-103, and 11.4% and 9.48% on PG-19. — S25 reports these exact perplexity improvements for OPT and OpenLlamaV2 on Wikitext-103 and PG-19.
- **supported**: HMT outperforms RMT by 13% on Wikitext-103 and 5.42% on PG-19. — S25 explicitly reports HMT outperforming RMT by 13% on Wikitext-103 and 5.42% on PG-19.
- **supported**: HMT adds only 0.5%–2% additional parameters to the backbone model. — S25 states HMT adds only 0.5% to 2% additional parameters.
- **supported**: KVP generalizes zero-shot to LongBench, BOOLQ, and ARC beyond its training distribution. — S18 reports zero-shot tests on LongBench, BOOLQ, and ARC showing KVP generalizes beyond its training distribution.
- **supported**: Soft prompts generalize poorly to tasks requiring attention patterns not present in the base model. — S1 states prefix-tuning/context-based fine-tuning may not learn new tasks requiring different attention patterns, supporting the generalization limitation.
- **supported**: Heuristic KV-cache methods are backward-looking and assume past importance predicts future utility, which may fail on tasks with non-stationary information needs. — S18 directly supports the backward-looking assumption and notes its suboptimality; failure on changing information needs follows from this assumption.
- **supported**: HMT shows improvement on PubMedQA (9.81% on long-answer contextual reasoning). — S25 reports a 9.81% improvement in long-answer contextual reasoning on PubMedQA.
- **supported**: Attention-Gate requires only 4 NVIDIA 4090 GPUs and 5,000 samples for continual pre-training on LLaMA2-7B. — S17 states only four NVIDIA 4090 GPUs and 5,000 samples are required for continual pre-training with LLaMA2-7B.

### Final Evaluation

- coverage: 4/5
- citation_quality: 4/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 4/5
- overall: 4/5

Strengths:
- Comprehensive coverage of KV-cache compression methods with concrete compression ratios and fidelity numbers across multiple benchmarks.
- Clear identification of workload-dependent trade-offs, e.g., reasoning models benefit from heavy-hitter methods while retrieval allows extreme compression.
- Well-structured tables that enable direct comparison of methods, compression ratios, and performance metrics.
- Honest acknowledgment of missing evidence (gist tokens, production deployments) and limitations (benchmark fragmentation, narrow model coverage).
- Actionable design implications and recommended next experiments grounded in source findings.

Weaknesses:
- Limited quantitative coverage of gist tokens, context distillation, and token merging (ToMe) due to admitted source gaps, leaving a key method family under-analyzed.
- Soft prompt and prefix tuning section provides no compression ratios or token-equivalent capacities, reducing its utility for the research goal.
- Vendor bias discussion (Attention-Gate paper's claim about H2O) is noted but not independently verified or further contextualized.
- Training costs for recurrent memory architectures (RMT, HMT) are not quantified beyond parameter overhead, missing a key operational dimension.

Follow-up recommendations:
- Conduct a unified benchmark across all four method families (soft prompts, KV-cache compression, recurrent memory, gist tokens) on LongBench, RULER, and multi-step reasoning tasks.
- Measure reasoning-trace elongation across compression budgets for H2O, SnapKV, PyramidKV, and KVP to quantify memory-vs.-generation-cost tradeoffs.
- Evaluate hallucination rates under KV-cache compression using factual accuracy metrics like FactScore to test whether eviction increases hallucination.
- Test joint application of hierarchical memory (HMT) and KV-cache compression for potential compound gains in perplexity, accuracy, and latency.
- Assess robustness of learned eviction policies (KVP) under distribution shift by training on one task distribution and evaluating on multiple held-out sets.
- Perform controlled experiments to establish compression ratios and fidelity loss for gist tokens and context distillation, which remain unquantified in the current literature.
