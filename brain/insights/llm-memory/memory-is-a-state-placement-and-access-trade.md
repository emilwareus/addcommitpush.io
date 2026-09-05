---
type: insight
title: "Memory Beyond the Context Window Is a State-Placement and Access Trade"
slug: memory-is-a-state-placement-and-access-trade
created: 2026-09-05
status: working
publish: true
tags:
  - llm-memory
related:
  - "[[compressed-memory-lives-in-the-kv-cache]]"
---

# Memory Beyond the Context Window Is a State-Placement and Access Trade

Attention is expensive because it preserves a strong interface: every past position remains
individually addressable by every later query. The stored KV rows grow as O(n), full prefill
attention costs O(n²), and each decode step reads O(n) past state. At the representation level,
this is lossless random access to the retained past, although it does not guarantee that a model
will retrieve the right fact. Every cheaper memory mechanism weakens one part of that contract.
It either stores fewer distinguishable states, restricts which positions can be reached, learns
a lossy summary, or retrieves a small subset from an external index.

That gives a more useful definition of model memory than “how many tokens fit.” A mechanism is
defined by three coordinates:

1. **Where state lives:** attention cache, recurrent state, model or adapter weights, latent
   trajectory, or external store.
2. **What one more token costs:** growing state, fixed state with an update, no inference-time
   state growth after training, or growth outside the model.
3. **How a later query accesses it:** exact per-position attention, prefix identity, learned
   routing, approximate matching, or retrieval followed by re-injection.

The evidence supports a blunt conclusion. The production frontier in September 2026 is not a
new sequence architecture. It is cross-request KV persistence: radix-indexed prefix reuse,
hierarchical placement across GPU/CPU/disk, partial recomputation for non-prefix chunks, and
early semantic matching. Fixed-state, test-time-learning, and latent-reasoning models expose
better asymptotics or richer computation, but their evidence is narrower and usually requires
training a different model. Durable, portable, compressed latent memory that survives requests
and moves across model versions remains undemonstrated in this report set.

This is a sequel to [[compressed-memory-lives-in-the-kv-cache]]. That note already establishes
that KV eviction and quantization save cache capacity and decode bandwidth after prefill, not the
prefill computation already spent, and that soft prompts are task adapters rather than generic
episodic memory. Those mechanisms are referenced here only where they locate a point in the
larger design space.

## Source map

The map separates papers and official documentation from vendor or third-party measurements.
Several results are preprints or author-reported; that standing is part of the evidence.

| Ref | Source | Role |
| --- | --- | --- |
| K1 | [SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/abs/2312.07104), NeurIPS 2024 | RadixAttention and the combined 6.4× throughput result. |
| K2 | [SGLang HiCache](https://www.lmsys.org/blog/2025-09-10-sglang-hicache/), official LMSYS report | GPU-to-CPU/disk/remote KV hierarchy; throughput, TTFT, and hit-rate results. |
| K3 | [vLLM optimization benchmarks](https://jarvislabs.ai/blog/vllm-optimization-techniques), GPU-provider blog | APC and FP8 measurements on Qwen3-32B; configuration-specific. |
| K4 | [CacheBlend](https://arxiv.org/html/2405.16444v3), EuroSys 2025 | Selective recomputation for non-prefix RAG chunks. |
| K5 | [KVLink](https://arxiv.org/html/2502.16002v1), arXiv preprint | Fine-tuned link tokens for separately encoded KV chunks. |
| K6 | [SemShareKV](https://arxiv.org/html/2509.24832v1), arXiv preprint | LSH-based fuzzy token matching for semantically similar prompts. |
| K7 | [Anthropic prompt-caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), official API docs | Cache breakpoints, TTLs, minimums, and price multipliers. |
| K8 | [Analysis of Anthropic's March 2026 TTL change](https://www.keepmyprompts.com/en/blog/claude-cache-ttl-cut-2026-reclaim-api-bill), third party, 119,866 calls | Evidence for the reported default-TTL change and workload economics. |
| K9 | [Prompt caching in 2026](https://devtoollab.com/blog/prompt-caching-guide), third-party comparison | OpenAI automatic 24-hour retention claim and Gemini named-cache pricing. |
| K10 | [vLLM versus TensorRT-LLM automatic prefix caching](https://blog.squeezebits.com/vllm-vs-tensorrtllm-12-automatic-prefix-caching-38189), third-party benchmark | Historical no-hit overhead and the v0.6.3 scheduler limitation. |
| F1 | [Overcoming Long-Context Limitations of State-Space Models via Context-Dependent Sparse Attention](https://arxiv.org/html/2507.00449v3), arXiv theory and experiments | Multi-query joint-recall lower bound; CISA versus CDSA. |
| F2 | [Mamba](https://arxiv.org/pdf/2312.00752), primary paper | Selective fixed-state sequence model. |
| F3 | [LongMamba](https://arxiv.org/html/2504.16053v1), arXiv preprint | Global-channel exponential decay and training-free token filtering. |
| F4 | [xLSTM](https://arxiv.org/pdf/2405.04517), primary paper | Matrix/scalar recurrent memories and length extrapolation setup. |
| F5 | [Jamba-1.5](https://arxiv.org/html/2408.12570v1), primary technical report | 256K RULER result, 1:7 attention-to-Mamba ratio, and KV footprint. |
| F6 | [Titans: Learning to Memorize at Test Time](https://arxiv.org/html/2501.00663v1), preprint; abstract-level evidence here | Surprise-updated neural memory and the >2M needle claim. |
| F7 | [Google Research on Titans and MIRAS](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/), vendor blog | Accessible account of gradient surprise and momentum. |
| L1 | [Training Large Language Models to Reason in a Continuous Latent Space](https://arxiv.org/abs/2412.06769), COLM 2025 | Coconut's recurrent hidden-state reasoning and BFS-like superposition. |
| L2 | [Large Concept Models](https://ai.meta.com/research/publications/large-concept-models-language-modeling-in-a-sentence-representation-space/), primary Meta source | Sentence-level concept space. |
| L3 | [Dynamic Large Concept Models](https://arxiv.org/html/2512.24617v1), December 2025 preprint | Learned variable boundaries and matched-FLOP result. |
| L4 | [Byte Latent Transformer](https://arxiv.org/html/2412.09871v1), primary paper | Entropy-based byte patching and three-module architecture. |
| A1 | [Mem0 repository](https://github.com/mem0ai/mem0), vendor implementation/benchmark | ADD-only extraction, retrieval pipeline, and 2026 benchmark scores. |
| A2 | [State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026), Mem0-authored comparison | LOCOMO competitor scores and Mem0 improvement breakdown; interested source. |
| A3 | [Mem0](https://mem0.ai/), vendor documentation | “Dream” product signal; no disclosed consolidation algorithm. |

## The design space

### The baseline contract: addressable state, not magical recall

For a decoder transformer with `n` retained positions, attention preserves one key and one value
row per position per layer. A query can score all rows and combine their values. “Lossless” here
means that no position has first been summarized into a shared fixed state. Finite precision,
positional encoding, model capacity, and learned attention can still produce retrieval errors.

The cost contract is equally precise:

```text
stored KV rows                 = O(n)
full causal-attention prefill  = O(n²) pair interactions
one autoregressive decode step = O(n) past-row reads
```

The alternatives below should be read as bets about which property a workload can surrender.
“Fixed” means independent of context length, not infinite information capacity. “External” means
the model's active state can stay bounded while the database still grows.

### Taxonomy by state, marginal cost, and access

| Mechanism | State location | Growth per context token | Access pattern | Training required | Production maturity, Sep 2026 | Evidence and boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Full transformer attention | Per-layer KV cache | O(n) memory; O(n²) full prefill | Content-addressed access to every retained position | Base-model training | Default architecture | Strongest representation-level access contract; runtime cost grows with retained context. |
| SGLang RadixAttention | Cross-request KV blocks in a token radix tree | O(unique cached prefix tokens); zero prefill for a hit | Exact longest-prefix match | No | Deployed serving system | Up to 6.4× throughput versus prior systems, but the paper's headline includes structured decoding as well as caching (K1). |
| vLLM APC | KV blocks managed by the serving engine | O(unique cached prefix blocks) | Exact shared prefix | No | Standard serving feature | On Qwen3-32B at about 50% hit rate: output throughput rose 426.89→1,513.23 tok/s, reported as +254%, and mean TTFT fell 4,343→969.71 ms (K3). |
| SGLang HiCache | KV hierarchy across GPU, CPU, disk, and remote stores | O(unique cache), with bounded GPU residency | Exact prefix plus tier lookup | No | Production-oriented system | Up to 6× throughput and 80% TTFT reduction; one Qwen3-Coder-480B/3FS deployment report moved hit rate 40→80%, doubled throughput, and cut mean session TTFT 56% (K2). |
| CacheBlend | Precomputed chunk KV plus selectively recomputed rows | O(cached chunk tokens); 5–18% recompute per layer | Arbitrary chunk reuse with selective cross-attention repair | No backbone training | Research implementation on vLLM/LMCache | 2.2–3.3× lower TTFT and 2.8–5× throughput versus full recompute, with 0.01–0.03 F1/Rouge-L loss on tested QA/summarization tasks (K4). |
| KVLink | Precomputed document KV plus learned link tokens | O(cached document tokens) | Learned linking among separately encoded chunks | Yes; tested on Llama-3.2-1B/3B | Preprint | Up to 90% TTFT reduction and +4% average QA accuracy over CacheBlend/PromptCache across seven datasets; the method cannot be applied to a frozen arbitrary checkpoint (K5). |
| SemShareKV | KV cache indexed by hashes of token embeddings | O(cached candidates), reduced by sharing | Approximate semantic match via LSH, with RoPE handling | No | Preprint | Up to 6.25× speedup and 42% less GPU memory at 5K input tokens on summarization; quality loss is only described as negligible (K6). |
| API context caching | Provider-owned KV or equivalent internal cache | Provider-managed; billed by write/read/retention policy | Exact or provider-defined prefix identity | No | GA product surface | Anthropic exposes breakpoints and TTL price tiers; OpenAI is reported as automatic; Gemini exposes named caches with storage billing (K7, K9). |
| FP8 KV quantization | Same per-position KV cache at lower precision | O(n) at half the FP16 bytes | Same address set, perturbed numeric state | No | Available in vLLM on supported hardware | Qwen3-32B measurement: about 17.2→8.6 GB and 785.61→955.22 tok/s, a 22% throughput increase (K3). See [[compressed-memory-lives-in-the-kv-cache]] for quantization trade-offs. |
| Mamba/S4-class selective SSM | Fixed recurrent hidden state | O(1) state; O(1) recurrent work per new token in the report's characterization | Learned sequential update; no direct old-position lookup | Architecture training | Research architecture, not a drop-in memory layer | Mamba's global channels accumulate exponential decay beyond trained lengths (F2, F3). This report set has no standalone S4 benchmark. |
| xLSTM | Fixed scalar and/or matrix recurrent memory | Fixed with context length | Learned recurrent gates and matrix associations | Architecture training | Research architecture | Best non-transformer in a reported 256-pair MQAR comparison, still behind transformers; extrapolation 2,048→16,384 was measured with perplexity, not exact recall (F4). |
| RWKV-7 | Fixed recurrent state with time mixing/linear attention | Fixed with context length | Learned recurrent update | Architecture training | Maturity not assessable from the admitted evidence | The report set gives no RWKV-7 long-context recall number. |
| Jamba-1.5 hybrid | Fixed Mamba state plus KV on sparse attention layers | O(n) only in attention layers; about 10× lower KV reported | Recurrent routing most layers; random access in attention layers | Full architecture training | Released open-weight model; author-reported benchmark | 256K effective length on RULER with a 1:7 attention:Mamba ratio; 4 GB KV for Mini and 9 GB for Large at 256K versus 32 GB Mixtral and 80 GB Llama-3.1-70B comparators (F5). |
| Context distillation / LoRA cartridge | Base or adapter weights | Zero state growth per input token after training; fixed bytes per adapter | Knowledge elicited through learned computation, not addressable positions | Fine-tuning | Not assessable as memory from this evidence base | No admitted report source measures how faithfully an adapter compresses a long context. Treat “memory cartridge” as a hypothesis until recall, provenance, interference, and forgetting are quantified. |
| Titans | Deep neural long-term-memory module updated during inference | Update per token; exact state-size scaling is not established by the recovered excerpts | Surprise-gated learned write/read plus attention variants | Architecture training; test-time updates | Preprint | Reports higher needle accuracy beyond 2M context, but the evidence available here is abstract-level and lacks tables, percentages, and named baselines (F6, F7). |
| Meta memory layers / product-key lookup | Not established in these reports | Not established | Not established | Architecture training is asserted only by the task framing | Not assessable from this evidence base | The requested mechanism received no admitted source in the reports. No algorithm, capacity, benchmark, or maturity claim is defensible here. |
| Coconut | Recurrent continuous hidden states during reasoning | Grows with latent reasoning steps, not stored context length | Learned latent transition; multiple alternatives can coexist in one state | Multi-stage curriculum | Research | Evaluated with GPT-2 on GSM8K, ProntoQA, and ProsQA; reported advantage is on search-heavy logical reasoning, without effect sizes in the recovered evidence (L1). |
| LCM / DLCM | Sentence or learned variable-length concept embeddings | O(number of concepts), compressed relative to tokens | Attention/reasoning over concept positions | Full training | Research/preprint | DLCM at ratio 4 moved about one-third of inference compute into the reasoning backbone and gained +2.69% across 12 zero-shot tasks at matched FLOPs (L2, L3). |
| BLT | Dynamic byte patches around a latent transformer | O(number of patches); patch length expands in predictable regions | Global processing at patch level, local byte encode/decode | Full training | Published research with code | Entropy of the next byte controls boundaries; evaluated up to 8B parameters and 8T bytes, but the report provides no long-context-memory benchmark (L4). |
| Mem0 / Zep / Letta agent memory | External vector, graph, key-value, or filesystem records | O(events) outside the model; bounded retrieved working set | Semantic, lexical, entity, temporal, graph, or exact retrieval | No model retraining; extraction/ranking calls still needed | Shipping frameworks, uneven independent evidence | Mem0 reports 92.5 LOCOMO, versus Zep 80.32 and Letta 74.0 in a Mem0-authored comparison; Zep/Letta primary sources were not recovered (A1, A2). |
| Sleep-time consolidation / Dream | External memory rewritten offline | Store grows online; offline jobs may deduplicate or abstract | Batch re-indexing and later retrieval | System-specific | Product signal, not an evidenced algorithm | Mem0 markets Dream as keeping memory accurate as it grows but discloses no mechanism or evaluation (A3). |

This table exposes two common category errors. First, cached context is not weight memory. It
persists activations tied to a model and prompt prefix. Second, latent reasoning is not durable
memory. Coconut changes the substrate of intermediate computation, but the report does not show
those states being serialized, retrieved in a later request, or consumed by another model.

## Cross-request KV persistence is the current systems frontier

Within-request KV compression asks which past rows to keep. Cross-request persistence asks a
different question: which computation from an earlier request can be made valid for this one?
The validation rule defines the system.

### Prefix identity: RadixAttention and APC

A radix tree stores token sequences on edges and KV blocks at nodes. A request walks the tree
until the next token or compressed edge no longer matches, computes only the suffix, then inserts
new blocks. Prefix identity preserves exact previously computed activations. The price is
brittleness: one changed token near the front invalidates everything
after it.

```text
# Inputs
#   request[0..n)          token IDs for one prompt
#   root                   radix root; edges carry token spans
# State
#   node.children          first-token-indexed outgoing compressed edges
#   node.kv_blocks         KV for the path from root through this node
# Output
#   matched_blocks         reusable KV for the longest exact prefix
#   miss_offset            first request token that still needs prefill
# Invariant
#   concatenating edge spans from root to node equals the token prefix whose KV
#   is stored at node; a returned block was computed for exactly that prefix.

function longest_prefix_match(root, request):
    node = root
    offset = 0
    matched_blocks = []

    while offset < length(request):
        edge = node.children.get(request[offset])
        if edge is absent:
            break

        common = exact_common_prefix(edge.tokens, request[offset..])
        matched_blocks.extend(edge.kv_blocks[0..common])
        offset = offset + common

        if common < length(edge.tokens):
            break                         # mismatch inside compressed edge

        node = edge.child

    return matched_blocks, offset

function complete_request(request, matched_blocks, miss_offset):
    new_blocks = prefill(request[miss_offset..], initial_kv=matched_blocks)
    radix_insert(request, new_blocks)
```

The loop terminates because `offset` increases on every full edge match and stops on the first
mismatch. Lookup cost is O(p) token comparisons for matched prefix length `p`, before hash and
tree constants. Precision is lost only by the match policy, not by reuse itself: exact matching
returns the original KV. The invariant implies that cache keys must isolate incompatible models
and tokenizers; otherwise identical token IDs need not denote compatible activations. Prefix
mutation from tool ordering, whitespace, timestamps, or random IDs shortens the match (K7). A
minimal fixture should prove full hit, partial-edge hit, first-token miss, and rejection across
model or tokenizer versions.

The headline 6.4× SGLang result cannot be assigned to radix reuse alone because structured
decoding also contributes (K1). The vLLM numbers are narrower and more interpretable: at about
50% cache hit rate on one Qwen3-32B workload, +254% output throughput and 78% lower mean TTFT
(K3). Both results depend on prefix overlap. A reported vLLM v0.6.3 test found 36.7% lower
throughput on random prompts with no reusable prefix; its scheduler issue was addressed in
v0.6.5, so the number is a historical failure case, not a current estimate (K10).

### Capacity hierarchy: HiCache

Radix matching decides *whether* a prefix is reusable. HiCache decides *where* its blocks live.
Hot blocks stay on GPU; colder blocks spill to CPU, disk, or remote storage and are promoted on a
hit. This increases retained history without pretending storage latency is free. The system must
overlap transfer with remaining prefill or decode work, keep hot metadata searchable, and evict
without discarding pinned blocks. Reported maxima are 6× throughput and 80% TTFT reduction (K2).
The strongest application-shaped result is the Qwen3-Coder-480B/3FS report: cache hit rate
doubled from 40% to 80%, throughput doubled, and mean session TTFT fell 56% (K2). It is still an
author-associated report, not a controlled independent reproduction.

### Non-prefix validity: repair, train, or approximate

RAG breaks exact-prefix reuse because only the first retrieved chunk is a prefix. Independently
encoding each later document gives cheap reusable KV but omits cross-attention to earlier chunks.
The reports cite up to 35% relative QA loss for naive separate encoding (K5). Three approaches
make different bets:

| Approach | Validity repair | Precision sacrificed | Evidence |
| --- | --- | --- | --- |
| CacheBlend | Recompute a selected 5–18% of token rows per layer to recover cross-attention; pipeline repair against storage reads | Unselected rows keep context-mismatched KV | 2.2–3.3× TTFT reduction; 0.01–0.03 F1/Rouge-L loss on tested QA/summarization (K4). |
| KVLink | Train special link tokens so the model learns to combine precomputed document caches | Portability to frozen checkpoints | +4% mean QA versus CacheBlend/PromptCache on seven datasets; small 1B/3B backbones (K5). |
| SemShareKV | Use LSH to find token-level semantic matches and adjust for position with RoPE | False-positive and false-negative approximate matches | Up to 6.25× speedup and 42% lower GPU memory on 5K-token summarization inputs; quality not quantified beyond “negligible” (K6). |

This is the actual progression from exact reuse toward semantic memory: identity, selective repair,
learned linking, approximate matching. Each wider match class improves capacity utilization by
weakening a validity guarantee.

### API caching turns memory policy into economics

Anthropic prices a 5-minute cache write at 1.25× base input, a 1-hour write at 2.0×, and reads at
0.10×; the cache is refreshed on access (K7). The break-even condition for `r` reads after one
write, relative to paying base input price for all `r + 1` requests, is:

```text
5-minute cache:  1.25 + 0.10r < 1 + r   => r > 0.278
1-hour cache:    2.00 + 0.10r < 1 + r   => r > 1.111
```

Because reads are integral, the 5-minute tier wins after one hit and the 1-hour tier after two,
before output costs and latency are considered. TTL expiry and invalidation determine whether
those hits happen. A third-party analysis of 119,866 Claude Code calls places a silent default
TTL reduction around March 6–7, 2026 and reports 17.1% waste overall (K8). This is a single
operator's dataset, not official confirmation.

OpenAI caching is reported as automatic with a default 24-hour retention and no explicit
breakpoints. Gemini uses named caches and, for the reported Gemini 3.5 Flash price, charges
$0.0075 per million cached-read tokens plus $1.00 per million tokens per hour of storage (K9).
These values come from a third-party comparison and can change. The architectural point is more
stable than the price: automatic caches optimize for invisibility, explicit breakpoints optimize
for control, and token-hour billing makes reuse frequency part of memory design.

FP8 composes with reuse because it changes the bytes per stored row, not which prefix maps to a
cache entry. One Qwen3-32B measurement halves KV footprint from about 17.2 to 8.6 GB and raises
throughput 22% (K3). The report does not test whether FP8 and cross-request caching together
preserve quality or hit behavior, so that composition remains an experiment rather than a
published result.

## Fixed state buys asymptotics by giving up joint recall

The most important negative result in this evidence base is narrower and stronger than “RNNs
forget.” Standard SSMs cannot solve *multi-query joint recall* in sub-quadratic time (F1). Joint
recall makes a key's correct value depend on surrounding context. A model must preserve not only
individual key-value pairs but the relations that disambiguate them. Context-independent sparse
patterns such as sliding windows, A-shaped attention, and dilation do not restore the missing
expressiveness. Content-dependent sparse attention, such as LSH-based key selection, does in the
paper's construction (F1).

The boundary conditions matter. This is a theorem about a synthetic task, standard SSMs, and a
sub-quadratic time requirement. It does not say a fixed-state model cannot summarize, rank a
document, or answer any long-context question. It says bounded state plus cheap sequential access
cannot provide the same general joint-recall contract as content-routed access to stored
positions.

Mamba supplies a concrete failure mechanism. Its global hidden-state channels carry information
through repeated transitions. LongMamba finds that cumulative decay in those channels grows
exponentially with distance and that their receptive fields fail to generalize beyond training
length (F3). Filtering the stream so only critical tokens update global memory is a training-free
mitigation. It reduces destructive accumulation; the recovered report contains no accuracy or
throughput number for the fix.

This also explains why a benchmark name is not enough:

| Evaluation | What success establishes | What it does not establish |
| --- | --- | --- |
| Perplexity extrapolation | The sequence model remains predictive beyond its training length | Exact recall of a distant fact |
| Single needle | One salient position survives or is found | Several facts can be joined correctly |
| MQAR | Multiple key-value associations survive | Context-dependent joint recall at long length |
| RULER | A mix of eight needle variants, variable tracking, aggregation, and QA | Natural workload performance under a specific latency/cost budget |
| LOCOMO | Conversational memory answers under one harness | Equal extraction models, token budgets, latency, and vendor tuning across systems |

xLSTM's matrix memory and exponential gating improve recurrent capacity. In a reported MQAR test
up to 256 key-value pairs, xLSTM[1:1] led the non-transformer models but still trailed transformers;
its 2,048→16,384 extrapolation result is perplexity, not recall (F4). RWKV-7 has no admitted
long-context recall number in the reports. These are evidence gaps, not negative results.

Jamba's hybrid result is the cleanest systems answer to the theorem: keep cheap recurrent state
for most layers and retain attention where exact content-dependent access matters. Jamba-1.5
uses one attention layer for seven Mamba layers, reports 256K effective length on RULER, and uses
about 10× less KV than transformer-only comparators (F5). The result is author-reported and the
optimal ratio was found in smaller 350M/1.3B experiments trained for 100B tokens, so 1:7 is a
measured design point, not a universal constant.

The synthesis from [[compressed-memory-lives-in-the-kv-cache]] survives the larger design space.
Retrieval can tolerate extreme compression when the answer is attached to one individually
salient position. Reasoning over several facts needs relations. Fixed-state recurrence compresses
all relations through the same channel; per-position KV eviction protects marginal salience;
external retrieval returns a bounded set of records. All three can pass a needle test while
failing joint recall. The benchmark must vary relation count and query timing, not only context
length.

## Weights as memory separate write cost from read cost

Weights offer the opposite economics from context: an expensive write phase followed by zero
additional state growth per inference token. Fine-tuning or distillation can move a distribution
of behavior or knowledge into parameters, and a LoRA adapter can make that state swappable. But
weights expose learned computation, not an addressable record. They do not preserve source
boundaries, timestamps, deletion semantics, or a guaranteed mapping from a query to one stored
event.

The report set contains no measured long-context context-distillation or LoRA fidelity. It cannot
answer how many random facts survive at a given adapter rank, how knowledge interferes across
cartridges, or whether removal restores the base model exactly at the behavior level. Therefore
“weights as episodic memory” is a plausible program, not an evidenced production mechanism here.

Two things frequently grouped with weight memory should stay separate:

- API context caching ships today, but it stores provider-side computation associated with an
  input prefix. It does not write facts into model weights.
- Soft prompts and prefixes are learned tensors, but they bias an existing model and do not
  provide generic random access to compressed source material. Their theory and limits are covered
  in [[compressed-memory-lives-in-the-kv-cache]].

The requested Meta product-key memory-layer family is also outside the admitted evidence. The
reports name the topic in their search plan but recover no source, algorithm, or benchmark. A
source map that pretends otherwise would erase the difference between a research lead and an
established result.

### Titans makes the memory itself learn at test time

Titans replaces a shallow recurrent vector or matrix with a deep MLP memory module updated during
inference. The write signal is the gradient of the memory's reconstruction or association loss:
unexpected inputs produce a larger gradient and therefore a stronger update. Momentum carries
past surprise forward, and forgetting controls stale state (F6, F7).

```text
# Inputs
#   x_t                    representation observed at step t
#   M_t                    parameters of the neural memory before the update
# State
#   u_t                    momentum-smoothed surprise update
# Output
#   M_{t+1}                memory used by later tokens
# Invariant
#   the update rule has fixed parameter shapes; information changes M, not its shape.

prediction = memory_read(M_t, key(x_t))
loss_t = association_loss(prediction, value(x_t))
surprise_t = gradient(loss_t, M_t)

u_t = combine_momentary_and_past_surprise(u_(t-1), surprise_t)
retained_M = forget_stale_state(M_t)
M_(t+1) = write_surprising_association(retained_M, u_t)
```

The pseudocode captures only what the report establishes conceptually. The exact loss, parameter
partition, optimizer, forgetting rule, and schedules must come from the full Titans implementation
before coding. Its time and memory complexity are not quantified in the recovered excerpts.
Overwrite, forgetting, finite MLP capacity, and a surprise proxy that can mistake novelty for
future utility are mechanism-derived failure hypotheses, not measured failures in this report set.

Titans reports higher needle-in-a-haystack accuracy beyond 2M tokens (F6). The recovered evidence
does not include the table, accuracy, baseline names, or independent replication. Confidence is
low-to-medium: the mechanism is specified at a useful level, but the headline capacity claim is
preprint- and author-dependent.

## Latent reasoning changes the computational alphabet, not persistence

Coconut, LCM/DLCM, and BLT compress different units:

| Family | Unit replaced | Boundary rule | Computation gained | Cost or loss |
| --- | --- | --- | --- | --- |
| Coconut | Decoded chain-of-thought token | Fixed number of latent steps per replaced reasoning step during curriculum | A continuous state can encode several alternative next steps, producing BFS-like search | Requires staged training; state is opaque; GPT-2-scale evidence (L1). |
| LCM | Token sequence | Sentence boundary | Global reasoning over fewer semantic units | Fixed sentences mismatch variable information density (L2). |
| DLCM | Token sequence | Learned variable semantic boundary | At ratio 4, about one-third of inference compute moves to a larger reasoning backbone | +2.69% mean at matched FLOPs is modest and preprint-only (L3). |
| BLT | Tokenized text | Entropy of the next byte | Long predictable patches receive less global compute; difficult regions receive shorter patches | Needs local encoder/decoder and entropy model; no memory-recall result here (L4). |

Coconut feeds the last hidden state back as the next input embedding without decoding it. The
authors interpret the state as holding multiple possible next moves, which permits BFS-like
exploration instead of committing to one textual step (L1). This is a reasoning result, not a
storage result. No report shows a Coconut state remaining valid after the model weights change or
being loaded into a different architecture.

LCM and DLCM operate at concept granularity. DLCM's ratio-4 result matters because it controls
inference FLOPs: compression frees about one-third of the budget for a higher-capacity reasoning
backbone and yields +2.69% over 12 zero-shot tasks (L3). BLT applies the same resource-allocation
idea below tokens: next-byte entropy decides patch boundaries, so predictable spans consume fewer
global steps (L4). Neither result establishes durable cross-session memory, but both offer a
principle for deciding *what deserves its own memory unit*.

## External episodic memory preserves durability by paying retrieval cost

Agent memory systems keep records outside the model, then retrieve a bounded subset into the next
request. This is the only family in the evidence base that naturally supports cross-session
durability, deletion, timestamps, and inspectable provenance. It also gives up end-to-end random
access: the model sees only records selected by extraction, indexing, query construction, ranking,
and token budget.

Mem0's April 2026 design uses one ADD-only extraction call, entity linking, parallel semantic,
BM25, and entity scores, plus time-aware ranking (A1). Avoiding UPDATE/DELETE simplifies ingestion
and shifts conflict resolution to temporal retrieval. That is a write/read trade, not free memory.

| System | LOCOMO | Other reported results | Evidence quality |
| --- | ---: | --- | --- |
| Mem0 new algorithm | 92.5 | LongMemEval 94.4; BEAM 64.1 at 1M and 48.6 at 10M, about 6.9K retrieved tokens/query | Vendor repository and managed-platform results (A1). |
| Zep | 80.32 | LongMemEval 71.2 | Reported by competitor Mem0; primary source absent (A2). |
| Letta | 74.0 | Not reported | Reported by competitor Mem0 using gpt-4o-mini/filesystem configuration; primary source absent (A2). |

The comparison is directional, not a leaderboard. The report does not establish identical model
backbones, budgets, latency constraints, or configurations. Mem0 also attributes its largest
within-system gains to temporal queries (+29.6 points) and multi-hop reasoning (+23.1), which is
more diagnostic than the aggregate but remains self-reported (A2).

“Sleep-time compute” proposes an offline write-amplification stage: deduplicate episodes, resolve
conflicts, infer abstractions, and rebuild indexes before the next session. The report finds no
formal evaluation of such a pipeline. Mem0's Dream announcement is only a product signal without
technical details (A3). Any consolidation benefit below is therefore a testable architecture
hypothesis, not a measured claim.

## The out-of-the-box synthesis: memory units should be learned, dual, and layered

The three report-backed convergence points are proposals, not implemented systems:

1. **Continuous-thought latents as episodic traces.** A Coconut state could store the reasoning
   trajectory behind a decision, not only a text summary. Retrieval could replay that state during
   offline consolidation. No source demonstrates stable serialization or later re-injection.
2. **Entropy-based segmentation.** BLT's boundary rule suggests spending more memory units on
   locally surprising interactions and merging predictable acknowledgements. DLCM suggests
   learning semantic boundaries rather than equating one message or session with one memory.
3. **Concept-level multi-hop substrate.** Entity-linked episodes could be grouped into concepts so
   multi-hop retrieval traverses a concept graph before text is reintroduced. DLCM and Mem0 make
   the components plausible; no source measures the composition.

The architecture implied by those proposals keeps four responsibilities separate:

```text
interaction stream
       |
       v
+--------------------+   boundary confidence, entropy, provenance
| 1. INGEST/SEGMENT  |   variable-size episodes; raw text remains authoritative
+--------------------+
       |
       v
+--------------------+   text + concept embedding + optional model-specific latent
| 2. DUAL ENCODE      |   never make an opaque latent the only copy
+--------------------+
       |
       v
+--------------------+   exact IDs + BM25 + semantic + entity + temporal/graph routes
| 3. RETRIEVE/REPLAY  |   assemble bounded working context or warm reusable KV
+--------------------+
       |
       v
+--------------------+   offline deduplication, conflict sets, abstractions, re-indexing
| 4. CONSOLIDATE     |   every derived memory keeps links to source episodes
+--------------------+
       |
       +-------------------------------> next request
```

The sharper conclusions follow from locating each layer in the design space:

### 1. The production frontier is validity-aware KV reuse

RadixAttention, APC, HiCache, and CacheBlend operate on frozen models and attack prefill directly.
Their gains are measured in TTFT and throughput, and the underlying serving abstractions already
exist. SemShareKV marks the frontier: expand the hit set from identical tokens to semantically
similar tokens without corrupting position-dependent state. That is a cache-validity problem,
not a new memory architecture problem.

**Confidence:** high for exact prefix reuse as a mature systems technique; medium for hierarchical
and non-prefix extensions; low-to-medium for semantic reuse because the evidence is one preprint
and “negligible” quality is not quantified.

### 2. “Weights as memory is shipping” currently conflates three state types

Context caches ship, and LoRA adapters ship, but the former stores activations and the report set
does not establish the latter as episodic memory. Titans updates a neural memory at test time but
is a preprint architecture. Treating all three as “weights” hides their invalidation rules: prefix
mutation invalidates cache state, adapter training changes behavior globally, and Titans overwrites
a learned memory online.

**Implication:** expose state type and provenance in the product. A user should be able to tell
whether “remembered” means a cached prefix, retrieved record, active adapter, or online weight
update, because deletion and audit semantics differ.

### 3. The unresolved gap is a portable latent memory ABI

No source demonstrates a compressed latent that is durable across requests, portable across model
versions, selectively addressable, auditable against source text, and cheap to update. KV tensors
are precise but model-, layer-, position-, and prompt-specific. Adapters are portable only to a
compatible base model and have no per-event address. Coconut states are model-specific and
ephemeral. External text is portable and auditable but pays tokenization, retrieval, and prefill
again.

This is an inference from the empty intersection of demonstrated properties, not a published
impossibility result. The likely interface is dual: canonical text/graph records for durability
and provenance, plus disposable model-specific compiled forms such as KV blocks, embeddings, or
latents. “Compiled memory” should be invalidated and rebuilt when its model, tokenizer, position,
or retrieval context changes.

### 4. Segmentation may matter more than the compressor

Every mechanism has a unit of forgetting: KV block, recurrent update, concept, patch, adapter, or
external episode. Fixed message/session boundaries ignore information density. BLT and DLCM both
improve compute allocation by learning or estimating boundaries. Applied to memory, the hypothesis
is that better units reduce both over-compression of dense reasoning and over-storage of routine
text before any retrieval model is changed.

**Confidence:** medium for the principle in language modeling, low for agent memory because no
source tests the transfer.

## Selection by workload

| Workload | Evidence-backed combination | Why this combination | Main risk and required metric |
| --- | --- | --- | --- |
| Multi-turn agent on an open model | Stable prompt layout + RadixAttention/APC + HiCache when GPU residency is insufficient + external episodic store for sessions beyond cache retention | Exact overlap removes repeated prefill; external records provide durable, inspectable cross-session state (K1, K2, A1). | Prefix mutation and stale retrieval. Track cache-hit tokens, TTFT, retrieval precision, and answer provenance separately. |
| RAG serving with recurring document chunks | CacheBlend over precomputed chunk KV; FP8 for capacity; keep full recompute as an evaluation reference, not a runtime fallback | Prefix caches miss all but the first reordered chunk; selective repair recovers cross-chunk interactions with 5–18% recompute (K4, K3). | QA/summarization evidence may not transfer to code or reasoning. Measure quality and TTFT on the actual query mix. |
| Million-token exact recall | Jamba-class hybrid for a trainable/open architecture; Titans only as an experimental lane; external retrieval when records can remain textual | Pure fixed state lacks the joint-recall contract; sparse attention restores content-dependent access. Jamba reports 256K RULER; Titans claims >2M needles (F1, F5, F6). | Needle success can hide relational failure. Sweep number of needles, relation hops, positions, and lengths. |
| Cross-session personalization | External scoped memory as system of record + immutable source events + temporal/entity retrieval + optional per-model compiled KV/embedding cache | Only external records provide natural durability, deletion, provenance, and model independence in this evidence base (A1). | Identity bleed, stale preferences, and vendor-biased benchmarks. Evaluate deletions, contradictions, tenant isolation, and temporal queries. |
| High-volume repeated API prompt | Provider context cache with static tools/system prefix; choose TTL from measured reuse intervals | It requires no model control and can reduce cached input price/TTFT; Anthropic reads cost 0.10× base (K7). | Cold-write amplification and policy churn. Model idle-gap distribution against TTL and verify billed cache tokens. |
| Long streaming summarization where exact old facts are secondary | Mamba/xLSTM-class fixed state, or a low-attention hybrid if recall still matters | Fixed state bounds active memory while compute stays linear in sequence length; hybrid attention restores some addressability (F3, F4, F5). | Perplexity or fluency may hide recall loss. Include joint recall and factuality, not only language-model loss. |

## Limits of the evidence

- **Benchmark fragmentation.** Serving papers report TTFT, throughput, F1, Rouge-L, or cache hit
  rates. Sequence architectures report MQAR, needles, perplexity, or RULER. Agent systems report
  LOCOMO, LongMemEval, and BEAM. No common harness supports a causal cross-family ranking.
- **Narrow model coverage.** Qwen3-32B carries the APC/FP8 numbers; CacheBlend covers three open
  models and four QA/summarization datasets; KVLink uses Llama-3.2-1B/3B; Coconut uses GPT-2;
  Jamba and Titans report their own architectures. Results do not establish behavior on arbitrary
  frontier or open-weight models.
- **No LoRA/context-distillation fidelity numbers.** The report set cannot quantify adapter rank
  versus retrievable facts, provenance, interference, or forgetting.
- **Titans is under-resolved.** The recovered evidence is preprint and abstract level for the
  >2M claim. Accuracy tables, baselines, state-size scaling, and independent replication are
  absent. Google's explanation is a vendor blog.
- **Meta memory layers are not evidenced.** They were requested in the research plan but no
  admitted source survived into the reports. This note does not infer their algorithm or results.
- **Zep and Letta lack primary sources here.** Their LOCOMO values come from a Mem0-authored
  comparison and may reflect different backbones, budgets, or configurations.
- **Sleep-time compute is under-evidenced.** Dream has no disclosed algorithm or ablation. The
  proposed consolidation layer is architectural synthesis, not an empirical result.
- **Operational policies are time-sensitive.** Anthropic's March 2026 TTL change is third-party
  analysis; OpenAI retention and Gemini prices come from a third-party comparison. Recheck them
  before making a purchasing decision.

## Open questions and cheap next experiments

The highest-value experiments do not require training a frontier model.

| Experiment | Open implementation | Procedure | Decision signal |
| --- | --- | --- | --- |
| Prefix-layout sensitivity | vLLM APC or SGLang | Replay one agent trace while moving timestamps, tool order, and volatile IDs from prefix to suffix. Record cached-token fraction, TTFT, and throughput. | Whether prompt layout produces enough reuse to justify cache management. |
| APC × FP8 composition | vLLM, one supported open checkpoint | Run four cells: neither, APC only, FP8 only, both. Hold requests and scheduler settings fixed; compare hit rate, KV bytes, TTFT, throughput, and task quality. | Whether the two optimizations compose without hidden quality or scheduling cost. |
| CacheBlend on relational tasks | LMCache/vLLM | Sweep 5%, 10%, 15%, and 20% selective recompute on a small multi-hop QA set plus GSM8K/HumanEval-style prompts. Compare with full recompute. | Whether relation-heavy work needs a larger repair budget than QA/summarization. |
| Fixed-state capacity curve | Small Mamba, xLSTM, RWKV, and transformer checkpoints | Generate random key-value sets at increasing pair counts; test associative recall and context-dependent joint recall separately at matched state/parameter scale. | Retrieval capacity at 95% accuracy and the gap between marginal and relational memory. |
| LoRA as a memory cartridge | One 1B–3B open base model | Train rank-swept adapters on one synthetic document, remove the document, and test exact facts, contradictions, deletion by adapter removal, and unrelated capability drift. | Facts per adapter byte, interference curve, and whether “memory” survives paraphrased queries. |
| External-memory neutral benchmark | Mem0, Zep, Letta with one local or API backbone | Pin the same extractor, generator, retrieved-token budget, and latency cap on a LOCOMO subset; retain retrieval traces. | Whether the vendor-reported ordering survives controlled components. |
| Entropy versus message segmentation | Byte-entropy script plus any vector store | Segment the same conversations by fixed messages, fixed tokens, and entropy changes; hold embedder/retriever constant. | Retrieval precision/recall, segment count, index bytes, and multi-hop answer score. |
| Auditable sleep-time consolidation | A local event log and vector/graph index | Add deduplication, contradiction clustering, and abstraction one at a time; never delete source events. Re-run temporal and multi-hop queries after each stage. | Which offline operation improves retrieval and which destroys provenance or current facts. |

Three experiments deserve priority. First, APC × FP8 measures a composition practitioners can
deploy immediately. Second, the fixed-state capacity curve turns a theorem-shaped limitation into
an engineering curve. Third, the LoRA cartridge test fills the largest gap in the weights-as-memory
claim with a model small enough to run locally.

## Conclusion

There is no single ladder from “short memory” to “long memory.” There are incompatible access
contracts. Attention pays growing memory and compute to keep past positions individually
addressable. Recurrent models pay constant active state by forcing history through learned updates.
Weights move write cost into training and remove per-token growth, while losing record-level
addressability. External systems keep durable records but expose only what retrieval selects.
Latent reasoning changes the unit and topology of computation, not yet the persistence boundary.

For AI automation products, the defensible stack today is layered: exact cross-request KV reuse
for repeated computation, selective non-prefix repair for recurring RAG chunks, external text and
graphs as the durable system of record, and model-specific latent or KV forms as disposable
compiled artifacts. Hybrids, Titans, and latent-reasoning models are research lanes worth testing,
not substitutes for cache discipline and auditable external memory. The frontier is the interface
between these layers: a memory unit whose provenance is durable, whose compiled representation is
cheap, and whose access policy preserves the relations the next query will need.

Research trail:

- `brain/inbox/dr/2026-09-05/kv-reuse-serving.md`
- `brain/inbox/dr/2026-09-05/weights-ssm-memory.md`
- `brain/inbox/dr/2026-09-05/latent-reasoning-agent-memory.md`
