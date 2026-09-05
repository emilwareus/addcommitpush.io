---
title: "The underlying problem: how can a language model hold and use more information than its token context window allows? Research ALL families of memory mechanisms beyond in-context tokens: (1) cross-request KV-cache reuse in serving systems (SGLang RadixAttention, PromptCache, CacheBlend, vLLM prefix caching, Anthropic/OpenAI context caching APIs) as practical persistence of compressed state across requests; (2) weights as memory: fine-tuning and context distillation as lossy compression, LoRA adapters as swappable memory cartridges, test-time training and Titans (Google 2025) learning-to-memorize at test time, memory layers with product-key lookup (Meta Memory Layers at Scale); (3) fixed-size-state sequence models: Mamba, S4, xLSTM, RWKV where the hidden state IS a constant-size compressed memory, what information theory says about lossy state vs lossless attention access, and hybrid attention+SSM models; (4) reasoning directly over latent embeddings instead of decoded tokens: Meta Large Concept Model, Coconut chain-of-continuous-thought, byte latent transformer, diffusion LLMs iterating over latent states; (5) external episodic memory systems for agents (Mem0, Zep/Graphiti knowledge graphs, Letta/MemGPT lineage, sleep-time compute) and what they still store as text; (6) information-theoretic and empirical limits: what fixed-size state provably cannot preserve, measured retrieval-vs-reasoning degradation, and which approaches work on frozen open-weight models today versus requiring training. Include concrete benchmark numbers, compression ratios, and production maturity."
generated_at: 2026-09-05T08:21:28.884424443+00:00
strategy: deep-agent-v1
effort: deep
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Beyond the Context Window: A Systematic Comparison of Memory Mechanisms for Language Model Inference

## Abstract

This report catalogs and compares mechanisms by which language models persist, compress, and retrieve information beyond their token context window. The admitted evidence covers one family in depth — cross-request KV-cache reuse in serving systems and proprietary API context caching — with concrete throughput, latency, cost, and cache-hit-rate measurements across production and research systems. SGLang's RadixAttention achieves up to 6.4× throughput over baseline inference systems [S2], while vLLM prefix caching delivers 254% higher output throughput and 78% lower time-to-first-token on Qwen3-32B [S13]. Anthropic and OpenAI offer API-level context caching with 90% cost reductions on cache reads [S31, S40]. CacheBlend extends reuse beyond prefix-only matching by selectively recomputing 5–18% of tokens, achieving 2.2–3.3× TTFT reduction with negligible quality loss [S21, S29]. The evidence register does not contain sources for five other planned mechanism families — weights as memory, fixed-size-state sequence models, latent embedding reasoning, external episodic memory, and information-theoretic limits — and these gaps are reported as limitations.

## Research Question

How can a language model hold and use more information than its token context window allows? The research plan specified six families of memory mechanisms: (1) cross-request KV-cache reuse in serving systems, (2) weights as memory via fine-tuning and context distillation, (3) fixed-size-state sequence models, (4) reasoning over latent embeddings, (5) external episodic memory for agents, and (6) information-theoretic and empirical limits. The admitted evidence addresses family (1) and its API-level counterparts with strong coverage. Families (2)–(6) lack admitted sources and are treated as open gaps.

## Method

Evidence was gathered from official API documentation, arXiv papers, technical blogs, GitHub repositories, and third-party benchmark reports. Each source was assigned an admission score based on provenance type (peer-reviewed paper, official documentation, or technical blog) and relevance to the research question. Sources scoring above the admission threshold were retained. Claims are cited inline with source markers [S#]. Where vendor blogs report performance numbers, the limitation is noted. No code was executed; all numbers are transcribed from published sources.

## Conceptual Background

Language model inference proceeds in two phases. During **prefill**, the model processes the input prompt and computes key-value (KV) tensors for each attention layer. During **decode**, the model generates output tokens autoregressively, attending to the cached KV tensors from prefill. The prefill step is compute-bound and often the dominant cost for long prompts; decode is memory-bandwidth-bound.

A **KV cache** stores the key and value tensors produced during prefill. If a subsequent request shares the same prompt prefix, the cached tensors can be reused, skipping recomputation of that prefix. This is the basis of **prefix caching**. The **cache hit rate** — the fraction of input tokens served from cache rather than recomputed — directly determines latency and cost savings [S14].

**RadixAttention**, introduced by SGLang, organizes KV caches in a radix tree that enables automatic reuse of any shared prefix across requests [S1, S2]. This contrasts with simple single-request caching, which discards KV tensors after each request completes. RadixAttention generalizes prefix caching to arbitrary request trees, including multi-turn conversations where each turn shares a prefix with the previous turn.

**Time-to-first-token (TTFT)** measures the latency from request submission to the first decoded token. Because prefill is the slowest part of a request, cache hits that skip prefill produce large TTFT reductions — 30–80% in typical deployments [S40].

| Term | Definition |
|---|---|
| KV cache | Key-value tensors computed during prefill; stored for reuse across decode or across requests |
| Prefill | Forward pass over the input prompt; compute-bound, dominates latency for long inputs |
| Cache hit rate | Fraction of input tokens served from reused KV cache rather than recomputed |
| Prefix caching | Reuse of KV cache for the leading shared prefix of a prompt |
| RadixAttention | SGLang's radix-tree-based automatic cross-request prefix cache reuse |
| TTFT | Time-to-first-token; latency from request to first generated output token |
| Non-prefix KV reuse | Reuse of cached KV blocks at arbitrary positions, not just the prefix |
| TTL | Time-to-live for cached content before eviction; resets on access in some APIs |

## Findings

### Cross-Request KV-Cache Reuse in Serving Systems

#### SGLang RadixAttention

SGLang's RadixAttention stores KV caches in a radix tree indexed by token sequences. When a new request arrives, the tree is traversed to find the longest matching prefix; matched KV tensors are reused and only the unmatched suffix is computed. SGLang reports up to 5× higher throughput than Guidance and vLLM on Llama-7B and Mixtral-8x7B [S1], and up to 6.4× over state-of-the-art inference systems in its paper [S2]. The 6.4× figure includes contributions from both RadixAttention and compressed finite-state-machine decoding; the isolated cache-reuse contribution is not reported.

On H100 hardware with ShareGPT workloads, SGLang achieves 16,215 tokens/second versus vLLM's 12,553 — a 29% throughput advantage — with TTFT of 79ms versus 103ms (23% faster) [S4]. For multi-turn agentic workloads with 60%+ prefix overlap, RadixAttention delivers 75–95% cache hit rates [S3]. On a single H100 with Llama-3.3-70B-Instruct, first-request TTFT is 280–320ms, dropping to 80–120ms for subsequent cached requests — approximately a 3× reduction [S3].

A direct head-to-head on DeepSeek-R1-Distill-Llama-70B with 7k context shows SGLang RadixAttention completing in 4.287s versus 5.093s for fresh context (~20% speedup) and 4.572s for vLLM's cache (~10% advantage over vLLM APC) [S5]. Across broader benchmarks, RadixAttention cache hit rates range from 50% to nearly 99% [S8].

SGLang is deployed on over 400,000 GPUs in production at xAI, NVIDIA, AMD, and LinkedIn [S4], though this claim originates from a commercial blog without independent verification.

#### SGLang HiCache: Hierarchical KV Caching

SGLang HiCache extends KV cache storage beyond GPU memory to CPU RAM, disk, and remote storage backends (3FS, Mooncake). HiCache achieves up to 6× throughput improvement and up to 80% TTFT reduction [S7]. On DeepSeek-R1-671B with Mooncake, cache hits produce an 84% TTFT reduction [S7]. On Qwen3-Coder-480B with 3FS, integrating HiCache raised cache hit rate from 40% to 80%, doubled inference throughput, and reduced session-average TTFT by 56% [S7].

#### vLLM Automatic Prefix Caching

vLLM implements automatic prefix caching (APC), which reuses KV tensors for shared prompt prefixes without explicit user annotation. On Qwen3-32B with a custom dataset at ~50% cache hit rate, APC increases output token throughput from 426.89 to 1,513.23 tokens/second (254% improvement) and reduces mean TTFT from 4,343ms to 969.71ms (78% reduction) [S13].

On a single ~10,000-token prompt to Qwen3-32B, prefix caching reduces TTFT from 4.3 seconds to 0.6 seconds [S14].

However, vLLM APC has known limitations. On random datasets without shared prefixes, APC introduces ~36.7% throughput reduction and ~25% TPOT increase — the overhead of cache management with no benefit [S12]. Under shared-prefix conditions, TensorRT-LLM APC improves throughput by ~34.7% and TPOT by ~20.9%, while vLLM achieves more modest gains of ~13.3% throughput and ~9.8% TPOT [S12]. The gap stems from a vLLM v0.6.3 scheduler limitation: it does not account for cache hits when calculating prefill tokens, constraining batched prefill requests and reducing KV cache utilization [S12]. This was addressed in vLLM v0.6.5.

#### vLLM FP8 KV-Cache Quantization

Beyond reuse, vLLM supports FP8 quantization of KV cache tensors, reducing memory from ~17.2 GB (FP16) to ~8.6 GB (FP8) — a 2× compression ratio — while increasing output throughput by 22% (785.61 to 955.22 tokens/second on Qwen3-32B with ShareGPT) [S13]. This trades minor precision loss for doubled cache capacity at no architectural cost.

#### Distributed KV-Cache Scheduling (llm-d)

The llm-d project reports 57× faster response times and doubled throughput on identical hardware when using prefix-cache-aware distributed scheduling versus naive scheduling [S14]. These numbers lack detailed benchmark conditions.

### Non-Prefix and Semantic KV-Cache Reuse

Standard prefix caching reuses only the leading shared prefix. For RAG workloads with multiple retrieved documents, only the first chunk is a prefix; subsequent chunks' KV caches are not reused, making prefix caching "almost as slow as full KV recompute" for multi-chunk inputs [S21, S30].

**CacheBlend** addresses this by selectively recomputing KV values for a small fraction of tokens to recover cross-attention information lost in independent chunk encoding. CacheBlend reduces TTFT by 2.2–3.3× and increases throughput by 2.8–5× compared to full KV recompute, with negligible quality loss (0.01–0.03 F1/Rouge-L) [S21, S29]. Only 5–18% of tokens per layer need recomputation [S29]. CacheBlend achieves 0.1–0.2 higher F1 on QA and 0.03–0.25 higher Rouge-L on summarization compared to full KV reuse (e.g., PromptCache), which ignores cross-attention between chunks [S30]. It is implemented on top of vLLM and available at github.com/LMCache/LMCache [S21, S30].

CacheBlend pipelines partial KV recomputation with KV cache retrieval from slower storage, allowing disk-based cache without extra latency [S21].

**KVLink** fine-tunes models with special tokens to link precomputed KV caches from multiple documents. It reduces TTFT by up to 90% and improves QA accuracy by an average of 4% over CacheBlend and PromptCache across 7 datasets [S24]. However, it requires fine-tuning (tested on Llama-3.2-1B and 3B) and cannot be applied to frozen models. Naive separate encoding without cross-attention can cause up to 35% relative accuracy decrease on QA tasks [S24].

**SemShareKV** applies locality-sensitive hashing (LSH) on token embeddings for fuzzy matching, enabling KV cache sharing across semantically similar but lexically different prompts. It achieves up to 6.25× speedup and 42% lower GPU memory with 5k-token inputs, with "negligible" quality degradation [S25]. It incorporates Rotary Position Embedding (RoPE) to preserve positional information [S25].

| System | Mechanism | Max Throughput Gain | TTFT Reduction | Quality Impact | Frozen Model? | Source |
|---|---|---|---|---|---|---|
| SGLang RadixAttention | Prefix tree KV reuse | 6.4× over SOTA [S2] | 3× on 70B [S3] | None reported | Yes | [S1, S2] |
| SGLang HiCache | Hierarchical (GPU→CPU→disk) | 6× [S7] | 80–84% [S7] | None reported | Yes | [S7] |
| vLLM APC | Prefix KV reuse | 254% (2.54×) [S13] | 78% [S13] | None reported | Yes | [S12, S13] |
| CacheBlend | Selective non-prefix recompute | 2.8–5× [S21] | 2.2–3.3× [S21] | 0.01–0.03 F1 loss [S29] | Yes (on vLLM) | [S21, S29] |
| KVLink | Fine-tuned cache linking | — | Up to 90% [S24] | +4% avg accuracy [S24] | No (requires FT) | [S24] |
| SemShareKV | LSH fuzzy token matching | 6.25× [S25] | — | "Negligible" [S25] | Yes | [S25] |

### Proprietary API Context Caching

#### Anthropic Prompt Caching

Anthropic offers explicit prompt caching on Claude models. Cache writes cost 1.25× base input price for a 5-minute TTL and 2.0× for a 1-hour TTL; cache reads cost 0.10× base — a 90% discount [S31, S36]. Up to 4 cache breakpoints are allowed per request, applied in order: tools, system, then messages [S31].

Minimum cacheable token thresholds vary by model: Opus 5 requires 512 tokens, Sonnet 4.6 requires 1,024, and Haiku 4.5 requires 4,096. Prompts below these thresholds silently never cache [S31].

Automatic caching (top-level `cache_control`) dynamically moves the breakpoint to the last cacheable block as a conversation grows [S31]. Cache reads do not count toward input-token-per-minute (ITPM) rate limits; Anthropic's example shows a 2,000,000 ITPM limit with 80% cache hit rate enabling 10,000,000 effective input tokens per minute [S33].

Cache invalidation occurs from whitespace differences, tool definition reordering, system content type mismatches (string vs. typed array), or TTL expiration [S37]. Cache is per organization, not per API key [S37].

Around March 6–7, 2026, Anthropic silently reduced the default TTL from 1 hour to 5 minutes. Analysis of 119,866 Claude Code API calls showed 17.1% waste overall, with up to 52.5% waste in January before the change [S33]. A 200K-token Opus session costs $1.25 per cold write after a 5-minute idle gap versus $0.10 per subsequent in-window message [S33]. Claude Code engineer Thariq Shihipar stated: "prompt caching is the architectural constraint around which the product is built" [S38]. The tool list is locked at session start to prevent cache invalidation.

Production users report 85–92% of input tokens as cache reads [S39]. Combining prompt caching with the Batch API yields up to 95% savings on repeated portions (50% batch discount + 90% cache read discount) [S36], though batch requests have async delivery up to 24 hours.

#### OpenAI Context Caching

OpenAI's prompt caching is automatic on GPT-5.x models with a 24-hour default TTL and a 1,024-token minimum [S40]. Cache retention may vary by account; users have no explicit control over cache breakpoints [S40]. On Amazon Bedrock, GPT-5.6 models support explicit `prompt_cache_breakpoint` with a 30-minute TTL and 1,024-token minimum [S34].

#### Google Gemini Context Caching

Google Gemini requires creating a named cache object with explicit storage costs. Gemini 3.5 Flash cache reads cost $0.0075 per million tokens; storage costs $1.00 per million tokens per hour, with a 4,096-token minimum [S40]. The storage cost model means low-traffic workloads may pay more in storage than they save on reads.

#### OpenRouter Routing Optimization

OpenRouter uses provider-sticky routing to route subsequent requests to the same provider endpoint after a cached request, maximizing cache hit rates across multi-provider setups. Sticky sessions expire after 10 minutes of inactivity [S32].

| Provider | TTL | Cache Write Cost | Cache Read Cost | Min Tokens | Explicit Control | Source |
|---|---|---|---|---|---|---|
| Anthropic (5-min) | 5 min, refreshed on access | 1.25× base input | 0.10× base (90% off) | 512–4,096 | Yes, up to 4 breakpoints | [S31, S36] |
| Anthropic (1-hr) | 1 hour | 2.0× base input | 0.10× base | Same | Yes, explicit TTL field | [S31, S36] |
| OpenAI (first-party) | 24 hr default | 1× base (automatic) | 0.50× base | 1,024 | No (automatic) | [S40] |
| OpenAI (Bedrock) | 30 min | — | — | 1,024 | Yes, breakpoint API | [S34] |
| Google Gemini | User-defined (storage billed) | Base input | 0.10× base + storage/hr | 4,096 | Yes, named cache object | [S40] |

### Production Maturity and Deployment Signals

SGLang is deployed on over 400,000 GPUs with adoption at xAI, NVIDIA, AMD, and LinkedIn [S4]. LMCache (which implements CacheBlend) has 11,700 GitHub stars, integration with NVIDIA Dynamo, and PyTorch Foundation recognition [S27]. vLLM prefix caching is a standard feature in vLLM releases but had scheduler limitations through v0.6.3 [S12]. Anthropic's prompt caching is GA with automatic and explicit modes [S31]. OpenAI's caching is automatic and GA on GPT-5.x models [S40].

The KV-cache hit rate is described as "the single most important metric for a production-stage AI agent" by Manus [S14], directly affecting both latency and cost.

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| SGLang achieves up to 6.4× throughput over SOTA | Paper abstract; not isolated to cache reuse alone | [S2] | Combined with FSM decoding; specific benchmarks |
| vLLM APC gives 254% throughput, 78% TTFT reduction on Qwen3-32B | Benchmark output, ~50% hit rate | [S13] | Single model, custom dataset, H100 |
| CacheBlend reduces TTFT 2.2–3.3× with 5–18% token recompute | Paper, 3 LLMs, 4 datasets | [S21, S29] | QA/summarization only; not tested on all tasks |
| Anthropic cache reads cost 0.10× base; writes 1.25× (5-min) or 2.0× (1-hr) | Official documentation | [S31, S36] | Per-model min tokens; TTL reset behavior |
| vLLM APC degrades 36.7% throughput on non-shared prefixes | Benchmark, Llama-3.1-8B, A100, v0.6.3 | [S12] | Fixed in v0.6.5; later versions may reduce overhead |
| Naive separate KV encoding loses up to 35% QA accuracy | Cited prior work (Sun et al., 2024) | [S24] | Specific to QA; exact numbers from cited work |
| KVLink reduces TTFT up to 90%, improves accuracy 4% avg | Paper, 7 datasets, Llama-3.2-1B/3B | [S24] | Requires fine-tuning; small models only |
| Production users see 85–92% cache read fraction | Anecdotal HN report | [S39] | Single user; not peer-reviewed |

## Design Implications

**Insight:** The evidence supports a two-tier memory architecture for production agents: (1) exact-prefix KV reuse via RadixAttention or vLLM APC for the system prompt and conversation history, and (2) non-prefix KV reuse via CacheBlend for RAG document chunks. Prefix caching alone is insufficient for multi-chunk RAG because only the first chunk benefits [S21, S30].

For proprietary API users, cache design should minimize prefix mutation. Locking tool definitions at session start, matching content types exactly across turns, and keeping idle gaps under the TTL window are the primary levers [S37, S38]. The Anthropic TTL reduction from 1 hour to 5 minutes [S33] means that workloads with gaps exceeding 5 minutes now face frequent cold writes at 1.25× base cost, making the 1-hour TTL option (2.0× write cost) economically viable for bursty traffic.

Cache reads not counting toward ITPM rate limits [S33] means caching is not only a cost lever but a throughput multiplier. A workload achieving 80% cache hit rate effectively gains 5× headroom against rate limits.

The overhead of prefix caching on non-shared-prefix workloads — 36.7% throughput reduction in vLLM [S12] — means caching should be disabled or workload patterns should be designed to maximize prefix overlap. Agent frameworks that inject variable content (timestamps, random IDs) at the start of prompts defeat prefix caching.

FP8 KV-cache quantization [S13] offers a complementary compression mechanism that doubles cache capacity with 22% throughput gain, stacking with reuse-based approaches.

## Limitations and Threats to Validity

**Evidence scope.** The admitted source register covers family (1) of the research plan — cross-request KV-cache reuse and API context caching — with depth. The register contains no admitted sources for the other five planned families: (2) weights as memory (context distillation, LoRA, test-time training, Titans, Memory Layers at Scale), (3) fixed-size-state sequence models (Mamba, S4, xLSTM, RWKV) and their information-theoretic limits, (4) latent embedding reasoning (Large Concept Model, Coconut, byte latent transformer, diffusion LLMs), (5) external episodic memory (Mem0, Zep, Letta/MemGPT, sleep-time compute), and (6) information-theoretic bounds on fixed-size state capacity. All claims about these families in this report are absent; their omission is a limitation of the evidence collection, not of the mechanisms themselves.

**Vendor bias.** Performance numbers from SGLang [S1, S3, S7], vLLM ecosystem [S12, S13], and Anthropic [S31, S36] originate from or are closely associated with the systems being measured. Independent third-party benchmarks [S4, S5] partially corroborate SGLang's claims but use different hardware and workloads. The 400,000-GPU deployment claim [S4] has no independent verification.

**Benchmark specificity.** Most measurements use specific models (Llama-3.3-70B, Qwen3-32B, DeepSeek-R1-Distill-Llama-70B), specific hardware (H100, A100, A10G), and specific datasets (ShareGPT, custom). Generalization to other configurations is uncertain. Cache hit rates are highly workload-dependent: the same system reports 50% [S8] to 99% [S8] across benchmarks.

**Stale evidence.** vLLM v0.6.3 scheduler limitations [S12] were fixed in v0.6.5. The Anthropic TTL change from 1 hour to 5 minutes [S33] occurred around March 2026; pricing and TTL policies may change further. OpenAI's 24-hour TTL [S40] may vary by account.

**Quality metrics.** CacheBlend's quality impact is measured on QA and summarization [S29, S30]; reasoning, code generation, and open-ended tasks are not covered. SemShareKV's quality degradation is described as "negligible" without quantification [S25].

## Open Questions

1. What is the information-theoretic capacity of a fixed-size KV cache versus a variable-length attention window? No admitted source addresses this bound.
2. How do weights-as-memory approaches (fine-tuning, LoRA, context distillation) compare to KV-cache reuse in information retention per parameter? No admitted source provides compression ratios or retention metrics for these mechanisms.
3. Can external episodic memory systems (Mem0, Zep, Letta) achieve retrieval accuracy competitive with in-context retrieval, and at what compression ratio? No admitted source benchmarks these systems.
4. What is the cross-attention information loss from non-prefix KV reuse (CacheBlend, KVLink) on reasoning tasks versus QA and summarization? Quality is only measured on the latter [S29].
5. How does FP8 KV-cache quantization interact with prefix caching — does quantization noise reduce cache hit rates by changing the exact-match key? No source addresses this interaction.
6. What are the theoretical limits on how much information a fixed-size hidden state (as in SSMs) can preserve versus a variable-length KV cache? No admitted source provides this analysis.

## Recommended Next Experiments

1. **Cross-family compression comparison.** Measure the same 32K-token document under (a) in-context tokens, (b) KV-cache reuse with prefix caching, (c) KV-cache reuse with CacheBlend, (d) FP8 quantized KV cache, and (e) context distillation into weights. Report QA accuracy, storage cost in bytes, and retrieval latency for each. This directly answers the research question across mechanism families.

2. **CacheBlend on reasoning benchmarks.** Evaluate CacheBlend's selective recompute on GSM8K, MATH, and HumanEval to determine whether the 5–18% recompute fraction is sufficient for reasoning tasks or whether cross-attention matters more for multi-step inference than for QA.

3. **FP8 × prefix caching interaction.** Benchmark vLLM with FP8 KV cache and prefix caching simultaneously to measure whether quantization-induced key differences reduce hit rates or whether exact-match persists at FP8 precision.

4. **TTL sensitivity analysis.** Measure cost and latency as a function of idle gap distribution for Anthropic's 5-minute and 1-hour TTLs across realistic agent workloads (coding sessions, research assistants, customer support). The March 2026 TTL change [S33] makes this economically urgent.

5. **External memory retrieval accuracy.** Benchmark Mem0, Zep/Graphiti, and Letta/MemGPT on a shared retrieval task set (e.g., LOCOMO or a custom multi-session evaluation) to compare their storage formats, retrieval accuracy, and latency against in-context baselines. This fills the largest evidence gap in the register.

## Source Register

- [S1] [Fast and Expressive LLM Inference with RadixAttention and SGLang - LMSYS Org](https://www.lmsys.org/blog/2024-01-17-sglang/) — admitted, score 18, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S2] [SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/pdf/2312.07104) — admitted, score 18, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S3] [SGLang Production Deployment Guide: RadixAttention and Multi-Turn Inference on GPU Cloud (2026) | Spheron Blog](https://www.spheron.network/blog/sglang-production-deployment-guide/) — admitted, score 13, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S4] [SGLang: The Complete Guide to High-Performance LLM Inference | Inference.net](https://inference.net/content/sglang-complete-guide/) — admitted, score 13, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S5] [SGLang vs vLLM: Multi-Turn Chat and KV Cache Reuse](https://www.runpod.io/blog/sglang-vs-vllm-kv-cache) — admitted, score 13, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S6] [SGLang Learning Series — Part 1: Shared Prefix, KV Cache, and RadixAttention | by Dharamendra Kumar | Medium](https://medium.com/@dharamendra1314.kumar/sglang-learning-series-part-1-shared-prefix-kv-cache-and-radixattention-d7a847d20b1f) — rejected, score 0, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S7] [SGLang HiCache: Fast Hierarchical KV Caching with Your Favorite Storage Backends - LMSYS Org](https://www.lmsys.org/blog/2025-09-10-sglang-hicache/) — admitted, score 20, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S8] [Serving SGLang: Launch a Production-Style Server](https://learnopencv.com/sglang-a-production-server/) — admitted, score 13, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S9] [NeurIPS Poster SGLang: Efficient Execution of Structured Language Model Programs](https://neurips.cc/virtual/2024/poster/94872) — admitted, score 16, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S10] [[2312.07104] SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/abs/2312.07104) — admitted, score 18, discovered by `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025`
- [S11] [Automatic Prefix Caching - vLLM](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/) — rejected, score 0, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S12] [[vLLM vs TensorRT-LLM] #12. Automatic Prefix Caching - The official SqueezeBits Tech blog](https://blog.squeezebits.com/vllm-vs-tensorrtllm-12-automatic-prefix-caching-38189) — admitted, score 15, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S13] [vLLM Optimization Techniques: 5 Practical Methods to Improve Performance](https://jarvislabs.ai/blog/vllm-optimization-techniques) — admitted, score 13, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S14] [KV-Cache Wins You Can See: From Prefix Caching in vLLM to Distributed Scheduling with llm-d | llm-d](https://llm-d.ai/blog/kvcache-wins-you-can-see) — admitted, score 13, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S15] [Automatic Prefix Caching - vLLM Documentation](https://docs.vllm.ai/en/v0.21.0/features/automatic_prefix_caching/) — rejected, score 0, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S16] [Tutorial: Benchmark prefix caching with gpt-oss on vLLM on Neuron — AWS Neuron Documentation](https://awsdocs-neuron.readthedocs-hosted.com/en/v2.32.0/vllm-neuron/docs/tutorials/tutorial-prefix-caching-gpt-oss-benchmarking.html) — admitted, score 19, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S17] [vllm/benchmarks/benchmark_prefix_caching.py at main · vllm-project/vllm](https://github.com/vllm-project/vllm/blob/main/benchmarks/benchmark_prefix_caching.py) — admitted, score 19, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S18] [Automatic Prefix Caching — vLLM](https://docs.vllm.ai/en/v0.7.0/features/automatic_prefix_caching.html) — rejected, score 0, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S19] [r/LocalLLaMA on Reddit: We tested 5 vLLM optimizations: Prefix Cache, FP8, CPU Offload, Disagg P/D, and Sleep Mode](https://www.reddit.com/r/LocalLLaMA/comments/1r61so4/we_tested_5_vllm_optimizations_prefix_cache_fp8/) — rejected, score 0, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S20] [Introduction — vLLM](https://docs.vllm.ai/en/v0.5.3/automatic_prefix_caching/apc.html) — rejected, score 0, discovered by `vLLM automatic prefix caching performance benchmark latency reduction`
- [S21] [CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion](https://arxiv.org/html/2405.16444v3) — admitted, score 20, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S22] [CacheBlend: Fast Large Language Model Serving for RAG ...](https://arxiv.org/pdf/2405.16444) — admitted, score 20, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S23] [[2405.16444] CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion](https://arxiv.org/abs/2405.16444) — admitted, score 20, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S24] [KVLink: Accelerating Large Language Models via Efficient KV Cache Reuse](https://arxiv.org/html/2502.16002v1) — admitted, score 20, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S25] [SemShareKV: Efficient KVCache Sharing for Semantically Similar Prompts via Token-Level LSH Matching](https://arxiv.org/html/2509.24832v1) — admitted, score 20, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S26] [Better KV Cache for LLM Serving Yuhan Liu 04/09/2025 1](https://llmsystem.github.io/llmsystem2025spring/assets/files/llmsys-23-LMCache_yuhan_liu-168b4d638987bf0e6408d553486059b1.pdf) — admitted, score 11, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S27] [GitHub - LMCache/LMCache: LMCache: Supercharge Your LLM with the Fastest KV Cache Layer · GitHub](https://github.com/lmcache/lmcache) — admitted, score 20, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S28] [CacheBlend: Fast Large Language Model Serving for RAG with](https://www.cs.princeton.edu/~ravian/COS597_F24/papers/cacheblend.pdf) — admitted, score 20, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S29] [CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion | alphaXiv](https://www.alphaxiv.org/abs/2405.16444) — admitted, score 13, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S30] [\name: Fast Large Language Model Serving with Cached Knowledge Fusion](https://arxiv.org/html/2405.16444v1) — admitted, score 19, discovered by `PromptCache CacheBlend KV cache sharing language model serving arXiv`
- [S31] [Prompt caching - Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — admitted, score 20, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S32] [Prompt Caching - Optimize AI Model Costs with Smart Caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching) — admitted, score 15, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S33] [Anthropic Cut Claude's Cache TTL: 2026 Fix to Reclaim ...](https://www.keepmyprompts.com/en/blog/claude-cache-ttl-cut-2026-reclaim-api-bill) — admitted, score 15, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S34] [Prompt caching for faster model inference - Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) — admitted, score 17, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S35] [Prompt Caching With the Claude API: A Practical Guide - DEV Community](https://dev.to/thegdsks/prompt-caching-with-the-claude-api-a-practical-guide-14ce) — rejected, score 11, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S36] [Anthropic API Pricing in 2026: Complete Guide — Models, Caching, Batch & Optimization](https://www.finout.io/blog/anthropic-api-pricing) — admitted, score 15, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S37] [Claude Prompt Caching Pricing: 5-Min vs 1-Hour Cache (2026) | Respan](https://www.respan.ai/articles/claude-prompt-caching) — admitted, score 15, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S38] [Anthropic Prompt Cache TTL + Cost Mechanics | Brandon Wie](https://brandonwie.dev/posts/anthropic-prompt-cache-ttl) — admitted, score 15, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S39] [Anthropic API pricing 2026: full rate card and hidden costs | eesel AI](https://www.eesel.ai/blog/anthropic-api-pricing) — admitted, score 15, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`
- [S40] [Prompt Caching in 2026: Cut Your LLM API Costs by Up to 90% | DevToolLab Blog](https://devtoollab.com/blog/prompt-caching-guide) — admitted, score 15, discovered by `Anthropic prompt caching API documentation pricing TTL minimum cache length 2025 2026`

## Research Trace

### Goal

Systematically catalog and compare all families of memory mechanisms that allow language models to persist, compress, and retrieve information beyond their token context window, with concrete benchmarks, compression ratios, and production-readiness assessments.

### Subquestions

- What are the measured throughput, latency, and cache-hit-rate improvements from cross-request KV-cache reuse in serving systems (SGLang RadixAttention, vLLM automatic prefix caching, PromptCache, CacheBlend)?
- How do Anthropic and OpenAI context caching APIs work, what are their pricing and TTL policies, and what real-world latency reductions do they deliver?
- How do weights-as-memory approaches (context distillation, fine-tuning, LoRA adapters) compare in information retention versus in-context tokens, and what compression ratios and degradation rates have been measured?
- What are Titans (Google 2025), test-time training, and Meta Memory Layers at Scale, what are their architecture details, and what benchmark improvements do they show over baseline transformers?
- What does information theory say about the capacity of fixed-size hidden states (Mamba, S4, xLSTM, RWKV) versus variable-length attention, and what are proven bounds on information loss?
- How do hybrid attention+SSM architectures (Jamba, Griffin, Zamba) combine both paradigms, and what do long-context benchmarks (RULER, LongBench, etc.) show about their effective memory?
- What approaches reason directly over latent embeddings (Meta Large Concept Model, Coconut, byte latent transformer, diffusion LLMs), and what are the trade-offs versus token-based chain-of-thought?
- What external episodic memory systems (Mem0, Zep/Graphiti, Letta/MemGPT, sleep-time compute) exist for agents, what storage formats do they use, and what retrieval accuracy and latency benchmarks are reported?
- Which of these families work on frozen open-weight models today versus requiring training, and what are the concrete production maturity levels (experimental, beta, GA) for each?

### Research Perspectives

- **Primary Sources and Official Documentation** — Obtain official specs, API docs, release notes, and blog posts from SGLang, vLLM, Anthropic, OpenAI, Meta, Google, and other primary sources.
- **Benchmarks and Empirical Evaluation** — Find published benchmark numbers: throughput, latency, cache hit rates, retrieval accuracy, long-context scores, compression ratios, and degradation curves.
- **Information-Theoretic Limits** — Identify theoretical analyses of fixed-size state capacity, lossy compression bounds, and provable limitations of compressed memory versus attention.
- **Implementation and Production Maturity** — Assess deployment status: GitHub stars, production usage, API availability, enterprise adoption, and stability indicators for each mechanism.
- **Criticism and Counterevidence** — Find failures, known limitations, negative results, and comparative studies showing where each approach breaks down.
- **Frozen-Model Compatibility** — Determine which approaches require no training, which need fine-tuning, and which are only compatible with specific architectures.
- **Recency (2025-2026)** — Prioritize the latest developments including Titans, LCM, Coconut, and any 2025-2026 benchmark updates.

### Source Requirements

- Official API documentation for Anthropic prompt caching and OpenAI context caching
- SGLang and vLLM GitHub repos and technical blog posts with benchmark numbers
- arXiv papers for Titans, Memory Layers at Scale, Mamba/S4, xLSTM, RWKV, Coconut, Large Concept Model, byte latent transformer
- Benchmark papers: RULER, LongBench,needle-in-haystack, MTOB, or equivalent long-context evaluations
- GitHub repos and docs for Mem0, Zep/Graphiti, Letta/MemGPT with usage metrics
- Information-theoretic papers on state-space model capacity or transformer memory bounds
- Industry blog posts (Meta, Google, Anthropic, OpenAI, Mistral) with production deployment details
- Comparative or survey papers covering multiple memory mechanisms
- Negative results or limitation-focused papers on fixed-size state models

### Success Criteria

- At least one concrete throughput or latency number per KV-cache reuse system (SGLang, vLLM, PromptCache, CacheBlend)
- Pricing and TTL details for both Anthropic and OpenAI context caching APIs with measured latency reduction
- Compression ratio or information retention metric for at least one weights-as-memory approach (context distillation or LoRA)
- Architecture summary and at least one benchmark result for Titans, Memory Layers, and one test-time training method
- Stated theoretical bound or empirical evidence for fixed-size state information loss in SSMs versus attention
- At least one long-context benchmark comparison for hybrid attention+SSM models (e.g., Jamba on RULER or LongBench)
- Architecture and at least one result for latent reasoning approaches (LCM, Coconut, or byte latent transformer)
- Feature comparison table for external memory systems (Mem0, Zep, Letta) including storage format, retrieval method, and any accuracy benchmarks
- Clear classification of each mechanism family as frozen-model-compatible or training-required, with production maturity level
- At least one compression ratio or bits-per-token equivalent metric across two or more mechanism families for cross-comparison

### Search Queries

- `SGLang RadixAttention KV cache reuse throughput benchmark 2024 2025` — Find primary benchmark numbers for SGLang's cross-request cache reuse system. [Benchmarks and Empirical Evaluation / github_repo / technical_blog]
- `vLLM automatic prefix caching performance benchmark latency reduction` — Obtain vLLM prefix caching throughput and latency improvements from docs or benchmarks. [Primary Sources and Official Documentation / github_repo / documentation]
- `PromptCache CacheBlend KV cache sharing language model serving arXiv` — Find the PromptCache and CacheBlend papers with their measured cache reuse benefits. [Benchmarks and Empirical Evaluation / arxiv_paper]
- `Anthropic prompt caching API pricing TTL latency documentation 2025 2026` — Get official Anthropic context caching API specs, pricing, and measured latency reductions. [Primary Sources and Official Documentation / official_documentation]
- `OpenAI cached input tokens API pricing context caching benchmark` — Get official OpenAI context caching API specs and any reported performance numbers. [Primary Sources and Official Documentation / official_documentation]
- `context distillation fine-tuning lossy compression language model information retention` — Find papers measuring how well fine-tuning/distillation preserves information versus in-context tokens. [Information-Theoretic Limits / arxiv_paper]
- `Google Titans learning to memorize test time 2025 architecture benchmark` — Find the Titans paper (Google 2025) with architecture details and benchmark comparisons to transformers. [Benchmarks and Empirical Evaluation / arxiv_paper]
- `Meta memory layers product key lookup scaling transformer benchmark 2024` — Find the Meta Memory Layers at Scale paper with architecture and scaling results. [Primary Sources and Official Documentation / arxiv_paper]
- `Mamba S4 xLSTM RWKV fixed hidden state information capacity limit lossy compression` — Find information-theoretic analyses or empirical studies of fixed-size state limitations in SSMs. [Information-Theoretic Limits / arxiv_paper]
- `Jamba hybrid attention SSM long context benchmark RULER LongBench results 2025` — Get benchmark comparisons for hybrid attention+SSM models on long-context tasks. [Benchmarks and Empirical Evaluation / benchmark_report]
- `Meta Large Concept Model latent reasoning abstraction benchmark arXiv 2025` — Find the LCM paper with architecture details and performance comparisons to token-based models. [Benchmarks and Empirical Evaluation / arxiv_paper]
- `Coconut chain of continuous thought latent reasoning language model arXiv` — Find the Coconut paper showing continuous-latent chain-of-thought reasoning results. [Benchmarks and Empirical Evaluation / arxiv_paper]
- `Mem0 Zep Graphiti Letta MemGPT agent memory benchmark retrieval accuracy comparison 2025` — Find comparative benchmarks or feature analyses for external agent memory systems. [Implementation and Production Maturity / github_repo / benchmark_report]
- `state space model attention comparison limitations failure cases needle in haystack retrieval degradation` — Find adversarial evidence: where SSMs fail relative to attention on specific memory/retrieval tasks. [Criticism and Counterevidence / arxiv_paper / benchmark_report]

### Source Quality

- [S1] Official LMSYS blog post with RadixAttention details and up to 5x throughput benchmark. Primary source for SGLang. score=18 type=technical_blog admitted=true warnings=
- [S2] NeurIPS 2024 paper providing full technical details and benchmarks for SGLang. Primary academic source. score=18 type=paper admitted=true warnings=PDF may be difficult to parse automatically
- [S3] Third-party deployment guide mentioning 60%+ prefix overlap and TTFT reductions. Adds production context but not primary. score=13 type=technical_blog admitted=true warnings=Third-party source, may contain marketing claims
- [S4] Guide claiming up to 6x throughput. Provides performance numbers but from a third-party inference platform. score=13 type=technical_blog admitted=true warnings=Third-party, unverified claims
- [S5] Runpod blog comparing SGLang and vLLM for multi-turn chat, estimates 10-20% improvement. Useful comparative perspective. score=13 type=technical_blog admitted=true warnings=Anecdotal estimate, not rigorous benchmark
- [S6] Fetch error 403, content unreadable. score=0 type=technical_blog admitted=false warnings=HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S7] Official LMSYS blog on SGLang HiCache with concrete numbers: 56% TTFT reduction, 2x throughput, cache hit rate 40% to 80%. Highly relevant and authoritative. score=20 type=technical_blog admitted=true warnings=
- [S8] Tutorial blog reporting cache hit rates 50-99%. Provides useful ranges but from a tutorial site. score=13 type=technical_blog admitted=true warnings=Third-party tutorial, not primary
- [S9] NeurIPS poster page confirming acceptance and abstract. High authority but limited detail. score=16 type=other admitted=true warnings=Only abstract, no detailed numbers
- [S10] arXiv abstract page for SGLang paper, states up to 6.4x throughput. Primary source. score=18 type=paper admitted=true warnings=
- [S11] Fetch error 429, content unreadable. score=0 type=docs admitted=false warnings=HTTP 429 Too Many Requests; fetch failed: Source fetch API returned HTTP 429 Too Many Requests:[HTML omitted]
- [S12] Detailed comparison of vLLM and TensorRT-LLM prefix caching, reports ~36.7% throughput overhead in vLLM. Critical negative result. score=15 type=technical_blog admitted=true warnings=Third-party analysis, but well-documented
- [S13] Overview of vLLM optimizations including prefix caching and FP8 KV cache. Useful for context but not primary. score=13 type=technical_blog admitted=true warnings=Marketing content from GPU provider
- [S14] Claims 57x faster response times and double throughput from prefix caching. Provides dramatic numbers but from a company blog. score=13 type=technical_blog admitted=true warnings=May be exaggerated for promotional purposes
- [S15] Fetch error 429, content unreadable. score=0 type=docs admitted=false warnings=HTTP 429 Too Many Requests; fetch failed: Source fetch API returned HTTP 429 Too Many Requests:[HTML omitted]
- [S16] Official AWS Neuron tutorial for benchmarking prefix caching on vLLM. High authority and provides methodology. score=19 type=docs admitted=true warnings=Specific to AWS Neuron hardware
- [S17] Official vLLM benchmark script for prefix caching. Primary source for benchmarking methodology. score=19 type=repo admitted=true warnings=Code only, no results
- [S18] Fetch error 429, content unreadable. score=0 type=docs admitted=false warnings=HTTP 429 Too Many Requests; fetch failed: Source fetch API returned HTTP 429 Too Many Requests:[HTML omitted]
- [S19] Fetch error 403, content unreadable. score=0 type=other admitted=false warnings=HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden: <body class=theme-beta><div><style>.theme-light,:root{--rem360:22.5rem;--rem320:20rem;--rem192:12rem;--rem144:9rem;--rem128:8rem;--rem96:6rem;--rem90:5.625rem;--rem88:5.5rem;--rem64:4rem;--rem56:3.5rem;--rem48:3rem;--rem40:2.5rem;--rem36:2.25rem;--rem32:2rem;--rem28:1.75rem;--rem26:1.625rem;--rem24:1.5rem;--rem22:1.375rem;--rem20:1.25rem;--rem18:1.125rem;--rem16:1rem;--rem15:0.9375rem;--rem14:0.875rem;--rem12:0.75rem;--rem10:0.625rem;--rem8:0.5rem;--rem6:0.375rem;--rem4:0.25rem;--rem2:0.125rem;--rem1:0.0625rem;--spacer-4xs:0.125rem;--...
- [S20] Fetch error 429, content unreadable. score=0 type=docs admitted=false warnings=HTTP 429 Too Many Requests; fetch failed: Source fetch API returned HTTP 429 Too Many Requests:[HTML omitted]
- [S21] CacheBlend paper (EuroSys 2025) presenting selective KV cache recomputation for RAG. Primary source with detailed evaluation. score=20 type=paper admitted=true warnings=
- [S22] PDF version of CacheBlend paper. Same content as S21. score=20 type=paper admitted=true warnings=PDF may be difficult to parse automatically
- [S23] arXiv abstract page for CacheBlend. Primary source. score=20 type=paper admitted=true warnings=
- [S24] KVLink paper (arXiv Feb 2025) extending CacheBlend with link tokens. Primary source with benchmarks. score=20 type=paper admitted=true warnings=
- [S25] SemShareKV paper (arXiv Sep 2025) using LSH for semantic KV cache sharing. Novel approach, primary source. score=20 type=paper admitted=true warnings=
- [S26] Lecture slides summarizing KV cache reuse techniques. Useful overview but not a primary source. score=11 type=other admitted=true warnings=Slides, not a full paper
- [S27] LMCache GitHub repository implementing CacheBlend and other KV cache reuse. Primary implementation source. score=20 type=repo admitted=true warnings=
- [S28] Another copy of CacheBlend PDF from Princeton. Same as S22. score=20 type=paper admitted=true warnings=Duplicate of S22
- [S29] alphaXiv summary page for CacheBlend. Provides abstract and discussion but not primary. score=13 type=other admitted=true warnings=Third-party platform
- [S30] Earlier version (v1) of CacheBlend paper. Primary source with same core content. score=19 type=paper admitted=true warnings=Earlier version, may differ from final
- [S31] Official Anthropic prompt caching documentation with TTL, pricing, and usage details. score=20 type=official_documentation admitted=true warnings=
- [S32] OpenRouter's guide on prompt caching with model-specific cacheable token lengths. score=15 type=official_documentation admitted=true warnings=
- [S33] Detailed analysis of Anthropic's cache TTL reduction in March 2026 and its cost implications. score=15 type=other admitted=true warnings=Not official documentation; may contain inaccuracies
- [S34] AWS Bedrock documentation on prompt caching, including implicit and explicit caching types. score=17 type=official_documentation admitted=true warnings=
- [S35] Community blog post with practical tips; low authority and redundant with official docs. score=11 type=other admitted=false warnings=Low authority source
- [S36] Comprehensive pricing guide for Anthropic API including caching costs. score=15 type=other admitted=true warnings=Not official; may have errors
- [S37] Article on Claude prompt caching pricing with TTL comparisons. score=15 type=other admitted=true warnings=Not official source
- [S38] Technical deep-dive into Anthropic cache TTL mechanics and cost implications. score=15 type=other admitted=true warnings=Personal blog, not official
- [S39] Detailed Anthropic API pricing guide including prompt caching. score=15 type=other admitted=true warnings=Not official source
- [S40] Guide on prompt caching in 2026 covering multiple providers. score=15 type=other admitted=true warnings=Not official source

### Evidence Notes

- [S1] SGLang with RadixAttention achieves up to 5× higher throughput than Guidance and vLLM on Llama-7B and Mixtral-8x7B. Evidence: Figures 1 and 2 show SGLang outperformed baseline systems in all benchmarks, achieving up to 5 times higher throughput. Limitations: Benchmarks on A10G GPUs with specific model sizes; results may not generalize to larger models or H100 hardware.
- [S2] SGLang achieves up to 6.4× higher throughput compared to state-of-the-art inference systems. Evidence: Abstract: 'Experiments show that SGLang achieves up to 6.4x higher throughput compared to state-of-the-art inference systems.' Limitations: The 6.4× figure may include contributions from both RadixAttention and structured decoding; not isolated to KV cache reuse alone.
- [S3] SGLang RadixAttention delivers significant TTFT reduction on workloads with 60%+ prefix overlap, with 75-95% cache hit rates on multi-turn conversations. Evidence: Blog states: 'delivering significant TTFT reductions on workloads with 60%+ prefix overlap' and 'Workloads where agents share a fixed system prompt... see 75-95% cache hit rates on multi-turn conversations.' Limitations: Numbers from a vendor blog; not peer-reviewed. Cache hit rates depend on exact prefix matching and workload characteristics.
- [S3] First request TTFT ~280-320ms, subsequent requests 80-120ms with RadixAttention on Llama-3.3-70B-Instruct on H100. Evidence: Benchmark script output: 'First request TTFT: 280-320 ms' and 'Subsequent requests avg TTFT: 80-120 ms'. Limitations: Measured on a single H100 with specific model and prompt; results vary with context length and hardware.
- [S4] SGLang achieves 16,215 tokens/second vs vLLM 12,553 (29% advantage) on H100 with ShareGPT workload; TTFT 79ms vs 103ms (23% faster). Evidence: Article states: 'Throughput: 16,215 tokens/second vs vLLM’s 12,553—a 29% advantage' and 'Time-to-First-Token (TTFT): 79ms mean vs 103ms—23% faster'. Limitations: Numbers from a third-party guide; original benchmark source not cited. Workload is ShareGPT, which may not represent all use cases.
- [S4] SGLang is deployed on over 400,000 GPUs in production at companies including xAI, NVIDIA, AMD, and LinkedIn. Evidence: Article: 'SGLang is deployed on over 400,000 GPUs worldwide' and 'xAI uses SGLang for Grok inference, AMD and NVIDIA include SGLang in their AI software stacks, LinkedIn runs production workloads.' Limitations: Claim from a commercial blog; no independent verification. Deployment count may include various configurations.
- [S5] On DeepSeek-R1-Distill-Llama-70B with 7k context, SGLang RadixAttention gives ~20% speed improvement over fresh context (5.093s to 4.287s), and ~10% boost over vLLM cache (4.572s). Evidence: Benchmark table: '7k context, fresh 5.093s, cache 4.287s' for SGLang; vLLM '7k context, cache 4.572s'. Limitations: Single model and hardware configuration (2× H100); results may differ with other models or context lengths.
- [S7] SGLang HiCache with hierarchical KV caching achieves up to 6× throughput improvement and up to 80% TTFT reduction; 84% TTFT reduction on DeepSeek-R1-671B with Mooncake. Evidence: Blog: 'HiCache achieved up to 6× throughput improvement and up to 80% reduction in TTFT' and 'cache hits achieved an 84% reduction in TTFT compared to full re-computation' (Ant Group evaluation). Limitations: Requires additional storage backends (3FS, Mooncake) and infrastructure; not a drop-in replacement for standard RadixAttention.
- [S7] HiCache increased cache hit rate from 40% to 80% and doubled inference throughput on Qwen3-Coder-480B with 3FS. Evidence: Community quote: 'By integrating SGLang HiCache with DeepSeek 3FS KVStore... the session’s average TTFT dropped by 56%, inference throughput doubled, and the cache hit rate jumped from 40% to 80%.' Limitations: Reported by Novita AI; not independently verified. Specific to 3FS backend and coding agent workload.
- [S8] RadixAttention cache hit rates range from 50% to nearly 99% across benchmarks. Evidence: Article: 'Experimental results show cache hit rates ranging from 50% to nearly 99% across benchmarks.' Limitations: No specific benchmark or model cited; likely from the original SGLang paper but not detailed here.
- [S12] vLLM automatic prefix caching introduces ~36.7% throughput reduction and ~25% TPOT increase on random datasets without shared prefixes. Evidence: Figure 2 and text: 'throughput reduction of ~36.7% and a TPOT increase of ~25.0%' on random fixed dataset. Limitations: Measured on Llama-3.1-8B on A100 with vLLM v0.6.3; later versions may reduce overhead.
- [S12] With shared prefix datasets, TensorRT-LLM APC improves throughput by ~34.7% and TPOT by ~20.9%; vLLM improves throughput by ~13.3% and TPOT by ~9.8%. Evidence: Figure 4 and text: 'TensorRT-LLM, throughput improved by ~34.7%, and TPOT saw a ~20.9% gain, while vLLM achieved more modest improvements of ~13.3% in throughput and ~9.8% in TPOT.' Limitations: Specific to vLLM v0.6.3; v0.6.5 addressed scheduler issue. TensorRT-LLM numbers may not be reproducible due to proprietary code.
- [S12] vLLM v0.6.3 scheduler does not account for cache hits when calculating prefill tokens, causing performance degradation under high concurrency with long inputs. Evidence: Text: 'The current scheduler does not account for cache hits when calculating prefill tokens during scheduling, which constrains the number of batched prefill requests and reduces KV cache utilization.' Limitations: Fixed in vLLM v0.6.5; older versions may exhibit this issue.
- [S13] vLLM prefix caching with Qwen3-32B increases output token throughput by 254% (from 426.89 to 1,513.23 tok/s) and reduces mean TTFT by 78% (from 4,343 ms to 969.71 ms). Evidence: Output token throughput (tok/s) 426.89 without prefix caching vs 1,513.23 with prefix caching; mean TTFT (ms) 4,343.00 vs 969.71. Limitations: Tested on Qwen3-32B with custom dataset; cache hit rate was ~50%; results may vary with different models and workloads.
- [S13] vLLM FP8 KV-cache reduces memory usage by ~50% compared to FP16 and increases output token throughput by 22% (from 785.61 to 955.22 tok/s) on Qwen3-32B with ShareGPT dataset. Evidence: Memory usage calculation: FP16 ~17.2 GB, FP8 ~8.6 GB; throughput 785.61 tok/s (FP16) vs 955.22 tok/s (FP8). Limitations: Slight precision loss; requires hardware support for optimal FP8 operations; tested on specific model and dataset.
- [S14] llm-d precise prefix-cache aware scheduling delivers 57x faster response times and double the throughput on identical hardware compared to naive distributed scheduling. Evidence: Our benchmarks show 57x faster response times and double the throughput on identical hardware. Limitations: Specific hardware and workload not detailed; benchmark conditions not fully specified.
- [S14] Anthropic Claude Sonnet pricing shows a 10x cost difference between cached and uncached tokens ($0.30 vs $3.00 per million tokens). Evidence: The cost for processing tokens that are already in the cache is 10 times lower than for uncached tokens ($0.30 vs. $3.00 per million). Limitations: Pricing as of blog date (Sep 2025); may change; only one model tier mentioned.
- [S14] vLLM prefix caching reduces time-to-first-token from 4.3 seconds to 0.6 seconds for a ~10,000 token prompt on Qwen/Qwen3-32B. Evidence: In a simple test sending a request with a ~10,000 token prompt to a Qwen/Qwen3-32B instance a second time, time-to-first-token drops from 4.3 seconds to just 0.6 seconds. Limitations: Test is for a single repeated request; cache hit rate is 100% in this test; real-world hit rates vary.
- [S21] CacheBlend reduces time-to-first-token (TTFT) by 2.2–3.3× and increases inference throughput by 2.8–5× compared to full KV recompute, without compromising generation quality. Evidence: By comparing CacheBlend with the state-of-the-art KV cache reusing schemes on three open-source LLMs of various sizes and four popular benchmark datasets, we show that CacheBlend reduces TTFT by 2.2–3.3× and increases the inference throughput by 2.8-5× from full KV recompute without compromising generation quality. Limitations: Requires precomputed KV caches for each chunk; selective recompute fraction <15% typically; tested on specific LLMs and benchmarks.
- [S21] CacheBlend selectively recomputes KV values for less than 15% of tokens to achieve same generation quality as full prefill. Evidence: Comparing with full KV recompute, an update fraction of less than 15% can typically generate same-quality responses based on our experience. Limitations: Fraction may vary with task and model; based on empirical observation, not theoretical bound.
- [S24] KVLink reduces time-to-first-token by up to 90% compared to standard LLM inference by reusing precomputed KV caches. Evidence: By leveraging precomputed KV caches, our approach reduces time-to-first-token by up to 90% compared to standard LLM inference. Limitations: Requires fine-tuning with special tokens; tested on Llama-3.2-1B and 3B; may not generalize to all models.
- [S24] KVLink improves question answering accuracy by an average of 4% over state-of-the-art methods (CacheBlend, PromptCache) on 7 datasets. Evidence: Experiments across 7 datasets demonstrate that KVLink improves question answering accuracy by an average of 4% over state-of-the-art methods. Limitations: Improvement is average; varies by dataset; requires fine-tuning which may not be feasible for all users.
- [S24] Naive separate encoding of documents into KV caches can cause up to 35% relative accuracy decrease on QA tasks. Evidence: Prior work has reported up to a 35% relative decrease in accuracy on QA tasks when each retrieved document is encoded into KV cache separately. Limitations: Specific to QA tasks; exact numbers from cited prior work (Sun et al., 2024) not detailed here.
- [S25] SemShareKV achieves up to 6.25× speedup and 42% lower GPU memory usage with 5k token inputs via fuzzy token matching using LSH. Evidence: Experiments on diverse summarization datasets show up to 6.25× speedup and 42% lower GPU memory usage with 5k tokens input, with negligible quality degradation. Limitations: Requires semantically similar prompts; tested on summarization datasets; quality degradation is 'negligible' but not quantified.
- [S21] Prefix caching only reuses KV cache of the first text chunk; subsequent chunks are not reused, making it nearly as slow as full recompute for multi-chunk inputs like RAG. Evidence: Only the first text chunk is the prefix, and other reused texts’ KV caches are not reused. As a result, the speed of prefix caching will be almost as slow as full KV recompute when input consists of many reused text chunks. Limitations: Assumes multiple text chunks; single-chunk scenarios still benefit.
- [S21] CacheBlend pipelines partial KV recomputation with KV cache retrieval from slower storage, enabling use of disk-based cache without extra latency. Evidence: The small extra delay for recomputing some tokens can be pipelined with the retrieval of KV caches within the same job, allowing CacheBlend to store KV caches in slower devices with more storage capacity while retrieving them without increasing the inference delay. Limitations: Requires careful pipelining; effectiveness depends on storage latency and compute overlap.
- [S13] vLLM prefix caching cache hit rate was around 50% in the benchmark with Qwen3-32B and custom dataset. Evidence: Also, cache hit rate was around 50% when we activated the prefix caching. Limitations: Hit rate depends on workload; this is a single measurement with a specific dataset.
- [S13] vLLM FP8 KV-cache reduces memory usage by approximately 50% compared to FP16, from ~17.2 GB to ~8.6 GB for a specific configuration. Evidence: Memory usage comparison: FP16 KV-Cache = ~17.2 GB, FP8 KV-Cache = ~8.6 GB. Limitations: Configuration-specific (64 layers, 8 KV heads, head dim 128, seq len 8192, batch 8); actual savings vary.
- [S14] The KV-cache hit rate is described as 'the single most important metric for a production-stage AI agent' by Manus, affecting both latency and cost. Evidence: Manus, Context Engineering for AI Agents: 'The KV-cache hit rate is the single most important metric for a production-stage AI agent. It directly affects both latency and cost.' Limitations: Quote from a third-party blog; not a peer-reviewed claim.
- [S21] CacheBlend is implemented on top of vLLM and code is available at https://github.com/LMCache/LMCache. Evidence: We implemented CacheBlend on top of vLLM ... The code is available at https://github.com/LMCache/LMCache. Limitations: May require additional dependencies; not yet merged into vLLM mainline.
- [S24] KVLink uses Llama-3.2-1B and Llama-3.2-3B as backbone models and fine-tunes them with special tokens. Evidence: We evaluate two backbone LLMs including Llama-3.2-1B and Llama-3.2-3B. Limitations: Only tested on small models; fine-tuning may not preserve all original capabilities.
- [S25] SemShareKV uses locality-sensitive hashing (LSH) on token embeddings for fuzzy matching, incorporating Rotary Position Embedding (RoPE) to preserve positional information. Evidence: SemShareKV applies fuzzy token matching using locality-sensitive hashing (LSH) on token embeddings and incorporates Rotary Position Embedding (RoPE) to better preserve positional information. Limitations: Requires semantically similar prompts; LSH may have false positives/negatives.
- [S27] LMCache supports non-prefix KV reuse by reusing cached KV blocks at any position, leveraging CacheBlend for selective recomputation. Evidence: Non-prefix KV reuse: Extend KV reuse beyond prefix caching by reusing cached KV blocks at any position in the prompt. This leverages CacheBlend to selectively recompute tokens for quality recovery. Limitations: No specific benchmark numbers provided in this source; relies on CacheBlend for quality recovery.
- [S27] LMCache has 11.7k GitHub stars, integration with NVIDIA Dynamo, and recognition from PyTorch Foundation, indicating production maturity. Evidence: 11.7k stars; NVIDIA Dynamo integrates LMCache; LMCache joins the PyTorch Foundation and Tensormesh unveiled. Limitations: Star count and integrations are not direct performance metrics; may not reflect all deployment scenarios.
- [S29] CacheBlend reduces time-to-first-token (TTFT) by 2.2-3.3x compared to full KV recompute. Evidence: CacheBlend reduces time-to-first-token (TTFT) by 2.2-3.3x and increases the inference throughput by 2.8-5x from full KV recompute. Limitations: Numbers based on evaluations on three open-source LLMs and four benchmark datasets; may vary with different models and workloads.
- [S29] CacheBlend increases inference throughput by 2.8-5x. Evidence: CacheBlend reduces time-to-first-token (TTFT) by 2.2-3.3x and increases the inference throughput by 2.8-5x from full KV recompute. Limitations: Same as above.
- [S29] CacheBlend results in negligible quality drop (0.01-0.03 F1/Rouge-L) compared to full recompute. Evidence: Negligible quality drop (0.01-0.03 in F1/Rouge-L scores) compared to full recomputation. Limitations: Only evaluated on specific tasks (QA, summarization); not tested on all possible tasks.
- [S29] Only 5-18% of tokens per layer need to be recomputed to achieve minimal quality loss. Evidence: CacheBlend requires recomputing only 5-18% of tokens per layer to achieve minimal quality loss. Limitations: Ratio may depend on model architecture and input characteristics.
- [S30] CacheBlend achieves 0.1-0.2 higher F1 scores on QA and 0.03-0.25 higher Rouge-L on summarization compared to full KV reuse. Evidence: CacheBlend achieves almost the same TTFT but 0.1-0.2 higher absolute F1-scores on QA tasks and 0.03-0.25 higher absolute Rouge-L scores on summarization. Limitations: Comparison is against full KV reuse (e.g., PromptCache), not against full recompute; numbers are absolute differences.
- [S30] CacheBlend is implemented on top of vLLM. Evidence: We implemented CacheBlend on top of vLLM. Limitations: May require modifications to vLLM; not a standalone system.
- [S30] In multi-chunk inputs like RAG, prefix caching only reuses the first chunk, making it almost as slow as full KV recompute. Evidence: prefix caching only stores and reuses the KV cache of the prefix of the LLM input... Thus, only the first text chunk is the prefix, and other reused texts’ KV caches are not reused. As a result, the speed of prefix caching will be almost as slow as full KV recompute. Limitations: Assumes multiple chunks; for single-chunk inputs, prefix caching is effective.
- [S30] Full KV reuse (e.g., PromptCache) ignores cross-attention between chunks, leading to quality degradation. Evidence: Full KV reuse... ignores the important cross-attention... The cross-attention information cannot be pre-computed as the preceding chunks are not known in advance. Limitations: Some recovery may be possible with adjustments, but not mentioned here.
- [S30] CacheBlend parallelizes partial KV update with fetching of KV cache for next layer, hiding recomputation delay and enabling use of slower storage. Evidence: CacheBlend parallelizes partial KV update on one layer with the fetching of the KV cache on the next layer... pipelining enables CacheBlend to store KV caches in slower non-volatile devices without incurring extra delay. Limitations: Requires pipeline parallelism; may add complexity.
- [S31] Anthropic prompt caching reduces input token costs by 90% on cache hits, with a default 5-minute TTL that refreshes on each access. Evidence: Cache hits cost 0.1× base input price. Default TTL is 5 minutes, refreshed each time cached content is used. Limitations: TTL resets from request start, not response end; a 4-minute response leaves only 1 minute for reuse.
- [S31] Anthropic offers a 1-hour TTL option at 2× base input price for cache writes, in addition to the 5-minute default at 1.25×. Evidence: In the pricing table: 5-minute cache writes are 1.25× base, 1-hour writes are 2× base. Cache reads are 0.1× for both. Limitations: Only available on supported models (Opus 5, Sonnet 5, etc.); requires explicit TTL field in cache_control.
- [S31] Cache prefixes are created in order: tools, system, then messages. Up to 4 cache breakpoints allowed per request. Evidence: The API docs state: 'Cache prefixes are created in the following order: tools, system, then messages.' And 'You can place cache_control on up to 4 content blocks.' Limitations: Exceeding 4 breakpoints returns a 400 error; automatic caching uses one slot.
- [S31] Automatic caching (top-level cache_control) dynamically moves the cache breakpoint to the last cacheable block as the conversation grows. Evidence: The docs describe automatic caching: 'The cache breakpoint automatically moves to the last cacheable block in each request.' Limitations: Incompatible with legacy Amazon Bedrock (Opus 4.6 and earlier) where it returns a 400 error.
- [S31] Minimum token thresholds for caching vary by model: Opus 5 requires 512 tokens, Sonnet 4.6 requires 1,024, Haiku 4.5 requires 4,096. Evidence: The pricing table shows minimum cacheable tokens: 512 for Opus 5, 1,024 for Sonnet 4.6, 4,096 for Haiku 4.5. Limitations: Thresholds differ per model; must be checked against the specific model used.
- [S33] Anthropic silently reduced the default prompt cache TTL from 1 hour to 5 minutes around March 6-7, 2026, causing cost increases of 30-60% for some workloads. Evidence: Analysis of 119,866 Claude Code API calls showed 1-hour TTL used from Feb 1 to Mar 5, then 5-minute after Mar 6-7. Cost impact: 17.1% waste overall, up to 52.5% in January. Limitations: Data from a single developer's machines; may not generalize to all usage patterns.
- [S33] A 200K-token Opus session costs $1.25 per cold write after a 5-minute idle gap, versus $0.10 per subsequent in-window message. Evidence: Cost math: 'Cold write on resume after 5min idle: 200K × $6.25/MTok = $1.25. Subsequent in-window message: 200K × $0.50/MTok = $0.10.' Limitations: Assumes Opus 4.7 pricing; other models differ.
- [S33] Cache reads do not count toward the input-token-per-minute (ITPM) rate limit, effectively multiplying throughput. Evidence: Anthropic's worked example: a 2,000,000 ITPM limit with 80% cache hit rate allows 10,000,000 input tokens per minute. Limitations: Applies to most models; Haiku 3.5 was an exception but is retired.
- [S34] Amazon Bedrock supports both Implicit and Explicit prompt caching for Anthropic and OpenAI models, with TTL of 5 minutes or 1 hour. Evidence: The Bedrock docs list supported models, token minimums (e.g., Claude Opus 5: 512 tokens, 4 breakpoints, 5-min or 1-hour TTL). Limitations: Cache hit rates are not guaranteed; best-effort for implicit caching.
- [S34] OpenAI GPT-5.6 models on Bedrock support explicit prompt caching with a 30-minute TTL and minimum 1,024 tokens. Evidence: Table: GPT-5.6 Sol, Terra, Luna support prompt_cache_breakpoint on input blocks, 1,024 token minimum, 30-minute TTL. Limitations: Only available on Bedrock; first-party OpenAI API may differ.
- [S36] Anthropic's prompt caching write costs are 1.25× base input for 5-minute TTL and 2.0× for 1-hour TTL, with reads at 0.10× (90% discount). Evidence: Pricing table: '5-min cache write: 1.25× base, 1-hr cache write: 2.0× base, cache hit: 0.10× base.' Limitations: Multipliers stack with other modifiers like batch discount and data residency surcharge.
- [S36] Combining prompt caching with the Batch API yields up to 95% savings on repeated input portions (50% batch discount + 90% cache read discount). Evidence: The article states: 'Batch gives 50% off all tokens, combine it with cache reads and you reach 95% savings on the repeated portion.' Limitations: Batch requests have async delivery (up to 24 hours); not suitable for real-time use.
- [S37] Cache invalidation common causes: whitespace differences, tool definition reordering, system content type mismatch (string vs array), and TTL expiration. Evidence: The article lists: 'whitespace difference between calls, tool definitions reordered, system content type mismatch (string vs typed array), or the 5-minute TTL elapsed.' Limitations: Specific to Anthropic's cache keying; other providers may have different invalidation rules.
- [S37] Cache is per organization, not per API key, so multiple keys in the same org share the cache. Evidence: The FAQ states: 'Cache is per organization, not per API key. Multiple keys in the same org share cache.' Limitations: May cause unexpected cache sharing across teams; can be either a feature or a privacy concern.
- [S38] Claude Code's design is built around prompt caching; tool list is locked at session start to avoid cache invalidation. Evidence: Per Thariq Shihipar (Claude Code engineer): 'prompt caching is the architectural constraint around which the product is built.' Tool list locked at session start to keep prefix stable. Limitations: Specific to Claude Code; general API usage may not require such strict constraints.
- [S39] Production automation users report 85% to 92% of input tokens as cache reads, dramatically reducing effective cost. Evidence: Quotes a Hacker News user: 'i run a bunch of claude agents for automation and like 85% of input tokens end up being cached reads.' Limitations: Anecdotal; may not represent all workloads.
- [S40] Prompt caching reduces latency by 30-80% for cache hits because the prefill step is skipped. Evidence: The article states: 'Latency typically drops 30-80% for cache hits because prefill is often the slowest part of a request.' Limitations: Exact reduction depends on prompt size, model, and provider; no citation for specific benchmark.
- [S40] OpenAI's prompt caching is automatic on GPT-5.x models with a 24-hour default TTL and a minimum 1,024 tokens. Evidence: The article states: 'OpenAI checks whether your request prefix matches a recent cached prefix server-side' and 'Cache retention defaults to 24 hours for most accounts.' Minimum 1,024 tokens. Limitations: Cache retention may vary by account; no explicit control over cache boundaries.
- [S40] Google Gemini's explicit context caching requires creating a named cache object, storing it per token-hour, with reads at 10% of base rate. Evidence: Pricing: Gemini 3.5 Flash cache read $0.0075/M, storage $1.00/M tokens/hr. Minimum cache size 4,096 tokens. Limitations: Storage cost can exceed savings for low-traffic workloads; requires explicit cache management.
- [S32] OpenRouter uses provider sticky routing to maximize cache hit rates by routing subsequent requests to the same provider after a cached request. Evidence: The docs state: 'OpenRouter uses provider sticky routing to route your subsequent requests to the same provider endpoint after a cached request.' Sticky sessions expire after 10 minutes of inactivity. Limitations: Sticky routing is defeated if user specifies manual provider order; session_id can be used for explicit control.

### Claim Verification

- **supported**: SGLang's RadixAttention achieves up to 6.4× throughput over baseline inference systems. — Evidence from S2 abstract confirms up to 6.4x higher throughput compared to state-of-the-art inference systems.
- **supported**: vLLM prefix caching delivers 254% higher output throughput and 78% lower time-to-first-token on Qwen3-32B. — S13 provides numbers showing 254% throughput increase (426.89 to 1513.23 tok/s) and 78% TTFT reduction (4343 ms to 969.71 ms).
- **supported**: Anthropic and OpenAI offer API-level context caching with 90% cost reductions on cache reads. — S31 states Anthropic cache reads cost 0.1× base (90% reduction). S40 mentions both Anthropic and OpenAI support prompt caching with up to 90% cost reduction.
- **supported**: CacheBlend extends reuse beyond prefix-only matching by selectively recomputing 5–18% of tokens, achieving 2.2–3.3× TTFT reduction with negligible quality loss. — S21 reports TTFT reduction of 2.2–3.3× and selective recompute of <15% tokens. S29 confirms 5–18% token recompute and 2.2–3.3× TTFT reduction.
- **supported**: SGLang reports up to 5× higher throughput than Guidance and vLLM on Llama-7B and Mixtral-8x7B. — S1 evidence states 'achieving up to 5 times higher throughput' in benchmarks.
- **supported**: On H100 hardware with ShareGPT workloads, SGLang achieves 16,215 tokens/second versus vLLM's 12,553 — a 29% throughput advantage — with TTFT of 79ms versus 103ms (23% faster). — S4 provides exact throughput and TTFT numbers matching the claim.
- **supported**: For multi-turn agentic workloads with 60%+ prefix overlap, RadixAttention delivers 75–95% cache hit rates. — S3 evidence states 75–95% cache hit rates on multi-turn conversations with shared system prompts.
- **supported**: On a single H100 with Llama-3.3-70B-Instruct, first-request TTFT is 280–320ms, dropping to 80–120ms for subsequent cached requests — approximately a 3× reduction. — S3 provides specific TTFT ranges for first and subsequent requests, showing ~3× reduction.
- **supported**: A direct head-to-head on DeepSeek-R1-Distill-Llama-70B with 7k context shows SGLang RadixAttention completing in 4.287s versus 5.093s for fresh context (~20% speedup) and 4.572s for vLLM's cache (~10% advantage over vLLM APC). — S5 benchmark table shows exact times and the evidence note confirms ~20% speedup and ~10% advantage over vLLM.
- **supported**: Across broader benchmarks, RadixAttention cache hit rates range from 50% to nearly 99%. — S8 evidence states cache hit rates ranging from 50% to nearly 99% across benchmarks.
- **supported**: SGLang is deployed on over 400,000 GPUs in production at xAI, NVIDIA, AMD, and LinkedIn. — S4 confirms deployment on over 400,000 GPUs and mentions xAI, NVIDIA, AMD, and LinkedIn.
- **supported**: SGLang HiCache achieves up to 6× throughput improvement and up to 80% TTFT reduction. — S7 evidence states up to 6× throughput improvement and up to 80% TTFT reduction.
- **supported**: On DeepSeek-R1-671B with Mooncake, cache hits produce an 84% TTFT reduction. — S7 evidence reports 84% TTFT reduction on DeepSeek-R1-671B with Mooncake.
- **supported**: On Qwen3-Coder-480B with 3FS, integrating HiCache raised cache hit rate from 40% to 80%, doubled inference throughput, and reduced session-average TTFT by 56%. — S7 includes a community quote with all these specific numbers.
- **supported**: On Qwen3-32B with a custom dataset at ~50% cache hit rate, vLLM APC increases output token throughput from 426.89 to 1,513.23 tokens/second (254% improvement) and reduces mean TTFT from 4,343ms to 969.71ms (78% reduction). — S13 provides all numbers including ~50% cache hit rate, throughput and TTFT improvements.
- **supported**: On a single ~10,000-token prompt to Qwen3-32B, prefix caching reduces TTFT from 4.3 seconds to 0.6 seconds. — S14 evidence shows TTFT drop from 4.3s to 0.6s for a ~10,000-token prompt.
- **supported**: On random datasets without shared prefixes, vLLM APC introduces ~36.7% throughput reduction and ~25% TPOT increase. — S12 evidence provides these exact percentages for random fixed dataset.
- **supported**: Under shared-prefix conditions, TensorRT-LLM APC improves throughput by ~34.7% and TPOT by ~20.9%, while vLLM achieves more modest gains of ~13.3% throughput and ~9.8% TPOT. — S12 evidence matches all percentages given in the claim.
- **supported**: vLLM supports FP8 quantization of KV cache tensors, reducing memory from ~17.2 GB (FP16) to ~8.6 GB (FP8) — a 2× compression ratio — while increasing output throughput by 22% (785.61 to 955.22 tokens/second on Qwen3-32B with ShareGPT). — S13 provides memory reduction and throughput numbers exactly as stated.
- **supported**: The llm-d project reports 57× faster response times and doubled throughput on identical hardware when using prefix-cache-aware distributed scheduling versus naive scheduling. — S14 evidence confirms 57× faster response times and double throughput.
- **supported**: CacheBlend reduces TTFT by 2.2–3.3× and increases throughput by 2.8–5× compared to full KV recompute, with negligible quality loss (0.01–0.03 F1/Rouge-L). — S21 provides TTFT and throughput ranges. S29 confirms quality loss of 0.01–0.03 F1/Rouge-L.
- **supported**: Only 5–18% of tokens per layer need recomputation in CacheBlend. — S29 evidence states recomputation of only 5–18% of tokens per layer.
- **supported**: CacheBlend achieves 0.1–0.2 higher F1 on QA and 0.03–0.25 higher Rouge-L on summarization compared to full KV reuse (e.g., PromptCache). — S30 evidence provides these specific ranges for F1 and Rouge-L improvements.
- **supported**: KVLink reduces TTFT by up to 90% and improves QA accuracy by an average of 4% over CacheBlend and PromptCache across 7 datasets. — S24 evidence states up to 90% TTFT reduction and 4% average accuracy improvement over state-of-the-art methods.
- **supported**: Naive separate encoding without cross-attention can cause up to 35% relative accuracy decrease on QA tasks. — S24 evidence reports up to 35% relative accuracy decrease on QA tasks.
- **supported**: SemShareKV achieves up to 6.25× speedup and 42% lower GPU memory with 5k-token inputs, with 'negligible' quality degradation. — S25 evidence confirms up to 6.25× speedup, 42% lower memory, and negligible quality degradation.
- **supported**: Anthropic prompt caching: cache writes cost 1.25× base input price for a 5-minute TTL and 2.0× for a 1-hour TTL; cache reads cost 0.10× base — a 90% discount. — S31 and S36 both provide these exact pricing multipliers.
- **supported**: Up to 4 cache breakpoints are allowed per request in Anthropic prompt caching. — S31 evidence states up to 4 cache_control content blocks allowed.
- **supported**: Minimum cacheable token thresholds for Anthropic: Opus 5 requires 512 tokens, Sonnet 4.6 requires 1,024, and Haiku 4.5 requires 4,096. — S31 evidence lists these exact minimum token thresholds.
- **supported**: Cache reads do not count toward input-token-per-minute (ITPM) rate limits; Anthropic's example shows a 2,000,000 ITPM limit with 80% cache hit rate enabling 10,000,000 effective input tokens per minute. — S33 evidence provides the ITPM example and states cache reads do not count toward limits.
- **supported**: Cache invalidation in Anthropic occurs from whitespace differences, tool definition reordering, system content type mismatches (string vs. typed array), or TTL expiration. — S37 evidence lists these exact causes of cache invalidation.
- **supported**: Anthropic silently reduced the default TTL from 1 hour to 5 minutes around March 6–7, 2026. Analysis of 119,866 Claude Code API calls showed 17.1% waste overall, with up to 52.5% waste in January before the change. — S33 evidence confirms the TTL reduction date and provides exact waste percentages from analysis of 119,866 calls.

### Final Evaluation

- coverage: 2/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 3/5
- presentation: 3/5
- overall: 2/5

Strengths:
- Excellent depth on cross-request KV-cache reuse family with concrete throughput, latency, and cost numbers from multiple systems (SGLang, vLLM, CacheBlend, KVLink, SemShareKV).
- Strong citation quality: every claim is linked to a specific source with clear evidence and limitations noted.
- Good use of evidence tables and comparison tables for KV-cache systems and proprietary API caching.
- Honest and explicit about evidence gaps for the other five planned mechanism families.
- Includes practical design implications and open questions that follow from the evidence.

Weaknesses:
- Fails to address 5 of 6 planned mechanism families (weights as memory, fixed-size-state models, latent embedding reasoning, external episodic memory, information-theoretic limits) despite the research plan requiring them. This is a critical coverage failure.
- No evidence tables for the missing families, which the plan explicitly required (e.g., compression ratios, benchmark comparisons).
- Presentation reads more like a technical blog post than a scientific short paper: uses dramatic headings ('Beyond the Context Window'), lacks a formal methods section, and has no abstract structured as a scientific summary.
- Analysis depth is limited to one family; no synthesis across families, no comparison of trade-offs between KV-cache reuse and other approaches, no information-theoretic analysis.
- The report does not meet the success criteria for 5 of 10 required items (e.g., no compression ratio for weights-as-memory, no benchmark for Titans, no theoretical bound for SSMs, no external memory comparison table).

Follow-up recommendations:
- Expand evidence collection to cover the five missing families: weights as memory (context distillation, LoRA, Titans, Memory Layers), fixed-size-state models (Mamba, S4, xLSTM, RWKV), latent embedding reasoning (LCM, Coconut, byte latent transformer), external episodic memory (Mem0, Zep, Letta), and information-theoretic limits.
- Add a cross-family comparison table with compression ratios, retrieval accuracy, and production maturity for all six families.
- Restructure the report as a scientific short paper with standard sections: Abstract, Introduction, Methods, Results, Discussion, Conclusion. Remove dramatic headings and generic AI prose.
- Include a formal information-theoretic analysis or at minimum cite known bounds on fixed-size state capacity versus attention.
- Add benchmark numbers for at least one approach from each missing family to meet the success criteria.
