---
type: insight
title: "Compressed Memory Lives In The KV Cache, Not The Embedding Stream"
slug: compressed-memory-lives-in-the-kv-cache
created: 2026-09-04
status: working
publish: true
tags:
  - llm-memory
related:
  - "[[context-should-be-layered]]"
  - "[[more-context-can-hurt]]"
  - "[[long-context-needs-structure]]"
  - "[[post-training-open-weight-llms]]"
---

# Compressed Memory Lives In The KV Cache, Not The Embedding Stream

"Compress the context into vectors and inject them straight into the model as memory, so it
gets more effective context without paying for more tokens" is one sentence describing at
least three unrelated engineering programs. They act at different points in the model, they
need different amounts of training, and their maturity differs by years. Only one of them runs
today on an open-weight checkpoint with no model modification. This note separates the
families, gives the measured compression ratios and the exact conditions under which they
hold, shows the eviction loop and the recurrent-memory loop in enough detail to implement,
and marks the claims the current evidence does not support.

The short version: the key-value (KV) cache is the only latent representation a pretrained
transformer already produces and already attends over, which is why it is the only place
compressed vectors behave like memory without retraining. Compressing it works: 8.33:1 with
no measured loss against a full cache, and graceful degradation out to 143:1 on
retrieval-shaped work. It works less well on reasoning, and the reason is structural rather
than incidental. Every selection rule that ships today scores individual tokens by the
attention mass they have already received. That preserves *where* the salient information sat
and discards *how* the pieces relate.

## Source map

Twelve admitted sources. Standing is listed because half of this literature is preprints and
code repositories, and two of the load-bearing claims come from artifacts that were never peer
reviewed.

| Ref | Source | Standing | Role in this note |
| --- | --- | --- | --- |
| P1 | [When Do Prompting and Prefix-Tuning Work? A Theory of Capabilities and Limitations](https://arxiv.org/html/2310.19698v2) | arXiv, theory | Prefix/context tuning cannot change relative attention patterns; it only biases attention output in a fixed direction. |
| P2 | [Soft prompts (Hugging Face PEFT docs)](https://huggingface.co/docs/peft/conceptual_guides/prompting) | Vendor documentation | Definition: learnable tensors concatenated with input embeddings, optimized to a dataset, not human readable. |
| K1 | [Hold Onto That Thought: Assessing KV Cache Compression On Reasoning](https://arxiv.org/html/2512.12008v1) | arXiv preprint, benchmark | H2O and SnapKV-D dominant for reasoning models; low budgets elongate reasoning traces. |
| K2 | [KVCache-Factory](https://github.com/Zefan-Cai/KVCache-Factory) | Code repository | 18 KV compression methods in one codebase; the deployability signal. |
| K3 | [Benchmarking KV-Cache Optimizations across Task Quality and System Performance for Long-Context Serving](https://arxiv.org/html/2607.05399v1) | arXiv preprint, benchmark | KIVI4 most stable across models, SnapKV best throughput, CaM workload-sensitive; compression ratio is a poor predictor of end-to-end performance. |
| K4 | [PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling](https://arxiv.org/html/2406.02069v4) | arXiv preprint | 12% and 0.7% retention results on LongBench/TREC; 128-entry Needle-in-a-Haystack. |
| K5 | [In-context KV-Cache Eviction for LLMs via Attention-Gate](https://arxiv.org/html/2410.12876v3) | arXiv preprint | Learned in-context eviction; 62.8% eviction with +13.9% on RTE; 4x4090 / 5,000-sample training cost; attention-bias critique of H2O. |
| K6 | [Learning to Evict from Key-Value Cache](https://arxiv.org/html/2602.10238v1) | arXiv preprint, recent | KVP: eviction as reinforcement learning; zero-shot generalization; the backward-looking critique of heuristics. |
| K7 | [streaming-llm (mit-han-lab)](https://github.com/mit-han-lab/streaming-llm) | Code repository for the ICLR 2024 paper | Attention sinks; 4M-token stability; 22.2x speedup; explicit statement that the context window is *not* expanded. |
| M1 | [Recurrent Memory Transformer](https://arxiv.org/abs/2207.06881) | arXiv, abstract only in this register | Memory tokens with no architecture change; comparison to Transformer-XL; training requirement. |
| M2 | [HMT: Hierarchical Memory Transformer for Long Context Language Processing](https://arxiv.org/html/2405.06067v1) | arXiv preprint | Hierarchical memory perplexity gains; 0.5%-2% parameter overhead; PubMedQA. |
| M3 | [recurrent-memory-transformer-pytorch (lucidrains)](https://github.com/lucidrains/recurrent-memory-transformer-pytorch) | Third-party code repository | `num_memory_tokens` as the explicit bottleneck; the second-hand 1M-token copying claim. |

## The four families and where they act

The families are usually listed as alternatives. They are not. They act at four different
points in one pipeline, and the injection point determines almost everything else: whether
training is required, whether it composes with the rest of the stack, and whether it is
memory at all.

```text
     raw text
        |
        |  (4) LEARNED REPLACEMENT TOKENS
        |      gist tokens, context distillation, token merging
        |      rewrite k context tokens into j << k tokens before the model sees them
        |      [no compression ratio or fidelity number in this evidence base]
        v
    tokenizer
        |
        v
    embeddings  <---- (1) SOFT PROMPTS / PREFIX TUNING
        |                 learnable tensor prepended to the embedding stream (P2)
        |                 biases attention output; cannot re-rank content (P1)
        v
  +--------------------------------------------------+
  |  layers 1..L                                     |
  |    Q, K, V projections                           |
  |    out = softmax(Q K_cache^T / sqrt(d)) V_cache  | <-- (2) KV-CACHE COMPRESSION
  |                                                  |         evict / quantize rows of
  +--------------------------------------------------+         K_cache and V_cache,
        |                                                       per layer, per head,
        v                                                       at every decode step
     logits -> next token
        |
        +--- (3) CROSS-SEGMENT MEMORY TOKENS (RMT, HMT)
             re-enter the model per segment:
             mem_{i+1} = model(mem_i ++ segment_i)[write positions]
```

| # | Family | Injection point | What it actually replaces | Training | Evidence status |
| --- | --- | --- | --- | --- | --- |
| 1 | Soft prompts, prefix tuning, p-tuning | Input embeddings, before layer 1 | Nothing. It adds a per-task bias | Per dataset | Not a context-compression method (P1, P2) |
| 2 | KV-cache compression | Attention-time keys/values inside every layer | Stored KV of tokens already processed | None for heuristics; small for learned policies | Most quantified family; 18 methods in one repo (K2) |
| 3 | Cross-segment memory tokens (RMT, HMT) | Token positions in each segment's input/output | The previous segment's raw tokens | Per model, usually per task | Measured on perplexity and one QA set (M1, M2) |
| 4 | Learned replacement tokens (gist, context distillation, ToMe) | The token sequence itself | Spans of original context | Yes | No admitted source gives numbers |

Maturity runs 2 > 3 > 4, with 1 outside the ordering because it is a different thing wearing
the same words.

## Family 1: the embedding stream is the wrong injection point

A soft prompt is a learnable tensor concatenated with the input embeddings and optimized
against a dataset. It is not human readable, because the virtual tokens do not correspond to
the embeddings of any real word (P2). This is the technique people reach for when they hear
"inject vectors into the model," and it is the one that cannot do the job.

The limiting result is theoretical and sharp. Context-based fine-tuning cannot change the
relative attention pattern over the content. It can only bias the output of an attention layer
in a fixed direction (P1). The mechanical reading: a prefix appends extra keys and values that
every query may attend to. Appending keys rescales every content weight by the same softmax
denominator, so the ordering of attention *over the content* is unchanged. What the prefix adds
is a pull toward its own value vectors. A prefix can therefore turn up a routing behaviour the
base model already has. It cannot install a new one.

| Property | Soft prompt / prefix tuning | Consequence |
| --- | --- | --- |
| Injection point | Input embeddings (P2) | Competes with the prompt for context length, does not bypass it |
| Expressiveness | Cannot change relative attention over content; biases output in a fixed direction (P1) | Elicits existing capability; cannot represent a task needing new information routing |
| Readability | Not human readable (P2) | No provenance, no diff, no way to inspect what was "remembered" |
| Context compression | Not its function | No token-equivalent capacity is reported by any admitted source |
| Training cost | Low; few learnable parameters | Cheap, and cheap at the wrong thing |

Treat "soft prompts as compressed memory" as a category error. They are task adapters. If a
system needs to recall a specific fact from a specific earlier document, a tensor trained to
minimize loss over a dataset distribution is not the mechanism that will do it.

## Family 2: the KV cache, and why compressing it works post hoc

During autoregressive decoding a transformer recomputes nothing about the past. For each layer
and each KV head it keeps one key row and one value row per past position, so the cache size is

```text
bytes = 2 * n_layers * n_kv_heads * d_head * seq_len * bytes_per_element
```

linear in sequence length and completely independent of what the tokens say. That linearity is
the problem. It is also the opportunity: the cache is a set of per-position rows, so rows can
be dropped, quantized, or merged without touching a single model weight.

This is the mechanical reason family 2 works with no training while families 1, 3, and 4 need
it. The KV cache is a representation the model already produces and already consumes. Eviction
leaves the surviving rows bit-identical, so the model stays on distribution; quantization
perturbs them slightly. Anything injected into the embedding stream is out-of-distribution
input until you train for it.

| Compression axis | Operation on the cache | State of the row afterwards | Named in this evidence base |
| --- | --- | --- | --- |
| Eviction | Delete rows | Gone, and no later query can recover it | StreamingLLM, H2O, SnapKV, PyramidKV, Attention-Gate, KVP |
| Quantization | Store rows at lower precision | Present, perturbed | KIVI / KIVI4 (K3) |
| Budget allocation | Choose how many rows survive per layer and head | Unchanged; sets how many survive | PyramidKV; AdaKV, HeadKV listed in K2 |

KVCache-Factory bundles FullKV, StreamingLLM, H2O, SnapKV, Quest, NACL, Scissorhands,
MiniCache, PyramidKV, CAM, L2Norm, AdaKV, HeadKV, ThinK, HeadInfer, MInference, KIVI, KVQuant,
and GEAR behind one interface (K2). That is the practical answer to "can I try this today":
yes, on an open checkpoint, without touching weights. K2 reports no performance numbers of its
own, so it is evidence of engineering interest, not of production adoption.

One gap to keep in view while reading the rest of this section: the admitted sources report
SnapKV, KIVI, and CaM by benchmark standing rather than by algorithm. This note therefore does
not describe their selection rules, and the axis labels above are standard background, not a
claim any admitted source makes about those three methods.

### Measured results

| Method | Compression | Fidelity result | Setting | Ref |
| --- | --- | --- | --- | --- |
| PyramidKV | 8.33:1 (12% retained) | Matches a full KV cache | LongBench | K4 |
| PyramidKV | 143:1 (0.7% retained) | Up to +20.5 absolute accuracy on TREC **versus other compressors at the same budget** | LongBench / TREC | K4 |
| PyramidKV | 128 KV entries total | 100% accuracy | Needle-in-a-Haystack, LLaMA-3-70B | K4 |
| StreamingLLM | Sinks + rolling window, unbounded stream | Stable language modeling to 4M tokens and beyond, no fine-tuning | Llama-2, MPT, Falcon, Pythia | K7 |
| StreamingLLM | Same | Up to 22.2x speedup over sliding-window recomputation | Streaming setting | K7 |
| Attention-Gate | 2.69:1 (62.8% evicted) | +13.9% accuracy on RTE | LLaMA2-7B | K5 |
| H2O + SnapKV-D | Budget varied | Dominant strategies for reasoning models | Llama-3.1-8B-Instruct | K1 |
| KIVI4 | Not reported here | Most stable quality across models | Llama-3.1-8B, Mistral-7B, LongBench | K3 |
| SnapKV | Not reported here | Strongest long-context throughput | Llama-3.1-8B, Mistral-7B | K3 |
| CaM | Not reported here | Large gains on selected QA, substantial workload sensitivity | Same benchmark | K3 |

Ratios recomputed from the retention fractions the sources report: 1/0.12 = 8.33, 1/0.007 =
142.9, 1/(1 - 0.628) = 2.69.

Three readings that the headline numbers invite and the sources do not support:

1. **The +20.5 on TREC is not a gain over the full cache.** It is a gain over other compression
   techniques at the same 0.7% budget (K4). At extreme budgets the interesting question is which
   compressor degrades least, and PyramidKV wins that comparison.
2. **4M tokens is stream length, not memory depth.** K7 states plainly that the context window is
   not expanded and that only recent tokens plus the attention sinks are recognized, which makes
   StreamingLLM unsuitable for tasks requiring full historical context. It is a stability and
   throughput result, not a recall result.
3. **100% on Needle-in-a-Haystack is a retrieval result.** One planted fact, recovered from 128
   surviving entries on a 70B model (K4). It says nothing about a task that must combine five
   facts scattered through the same haystack.

### Why sinks exist and why they are protected

Window attention alone collapses once the text exceeds the window. Retaining the KV of the
initial tokens largely recovers its performance (K7). The common intuition is that softmax
normalization forces every head to place a full unit of attention mass somewhere, and the
earliest positions absorb the surplus when nothing else is relevant, so evicting them distorts
every subsequent attention distribution. K7 records the phenomenon and notes it is not fully
explained theoretically. Either way the engineering consequence is firm: the first few
positions belong in a never-evict set.

### Pseudocode: the eviction decision loop

One layer, one head. The policy is the swappable part, and swapping it is the entire
difference between StreamingLLM, H2O, Attention-Gate, and KVP.

```text
# Inputs
#   budget[l]   entries kept per head at layer l
#   live        ordered set of cached positions (seeded by the prompt)
#   K[p], V[p]  key and value row for position p
#   n_sink, W   protected prefix length and rolling window length
#   policy      scoring rule; heuristic or learned
# Carried state
#   score[p]    importance estimate per live position
# Invariant
#   |live| <= budget[l] after every step, and evicted positions never return.

function decode_step(t, hidden_t):
    q_t, k_t, v_t = project(hidden_t)
    live.add(t); K[t], V[t] = k_t, v_t

    attn = softmax(q_t · K[live]^T / sqrt(d))        # normalized over LIVE positions only
    out  = attn · V[live]

    score = policy.update(score, attn, live, t)

    while |live| > budget[l]:
        candidates = { p in live : not protected(p, t) }
        if candidates is empty: raise BudgetTooSmall  # budget < n_sink + W
        victim = argmin_{p in candidates} score[p]
        live.remove(victim); free(K[victim], V[victim])

    return out

function protected(p, t):
    return p < n_sink or p > t - W                   # attention sinks + recent window

# --- policies -------------------------------------------------------------

policy_streaming.update(score, attn, live, t):       # StreamingLLM (K7)
    return score                                     # no ranking at all; protected() is the policy

policy_h2o.update(score, attn, live, t):             # heavy hitters (K1, K5)
    for p in live: score[p] += attn[p]               # cumulative attention received
    return score

policy_gate.update(score, attn, live, t):            # Attention-Gate (K5)
    for p in live: score[p] = g_theta(K[p], V[p], head_state)   # trained module, in-context signal
    return score

policy_kvp.update(score, attn, live, t):             # KVP (K6)
    for p in live: score[p] = Q_theta(state(p, live, t))        # RL estimate of FUTURE utility
    return score
```

What the loop actually does, in implementation-checklist terms:

- **Inputs and outputs.** In: the hidden state stream and a per-layer budget. Out: attention
  outputs computed over the surviving positions only. These are not the uncompressed model's
  outputs. The softmax renormalizes over a subset, so every evicted row silently changes the
  weight given to every row that remains.
- **State.** One scalar score per live position, per head, per layer, plus the protected set.
- **Invariant.** `|live| <= budget[l]` holds after every decode step, so peak cache memory is
  bounded by the budget rather than by sequence length.
- **What changes state.** Each decode step appends exactly one row and evicts zero or more.
- **Termination and its edge case.** The `while` loop removes one element per iteration, so it
  terminates provided `budget[l] >= n_sink + W`. Below that threshold the protected set alone
  exceeds the budget and the loop cannot make progress. This is the first thing that breaks when
  a budget is tuned down aggressively.
- **Complexity.** Scoring and eviction are O(|live|) per head per step, negligible next to the
  attention matmul. The win is that |live| stops growing: peak cache memory becomes
  `budget / seq_len` of the uncompressed cache.
- **Where precision is lost.** `argmin score[p]` ranks positions by a marginal statistic. H2O
  ranks by the attention mass a token has already received. A *relation* between two tokens is a
  property of a pair, and neither member needs high individual mass for the pair to matter to a
  query that has not been issued yet. Per-token eviction cannot preserve pairwise structure by
  construction. This is an inference from the selection rule, not a measured result, but it
  predicts the retrieval-versus-reasoning gap the benchmarks report.

Budget allocation is a second, orthogonal knob. Early evictors use a flat `budget[l]` across
layers. PyramidKV varies it per layer, which is the "pyramidal information funneling" its name
refers to (K4). The admitted evidence reports the outcome of that schedule, not the schedule
itself, so treat the exact per-layer allocation as unverified here.

### Heuristic versus learned eviction

K6 makes the theoretical case against heuristics directly: they are indirect proxies for a
token's future importance, and they assume that what was important before will remain
important. That assumption fails on any task whose information need shifts mid-generation, and
K6 presents it as a theoretical argument whose empirical weight depends on the task. KVP reframes eviction as a sequential decision problem trained with
reinforcement learning, beats the baselines on RULER and OASST2-4k, and generalizes zero-shot
to LongBench, BOOLQ, and ARC (K6). The cost is that training needs pre-computed generation
traces plus the RL loop.

Attention-Gate takes the cheaper route: a trained in-context gate rather than a policy over
future utility. Its headline is 62.8% of tokens evicted with a 13.9% accuracy *improvement* on
RTE (K5), which is a reminder that eviction is not purely subtractive. Dropping low-value rows
can sharpen the attention distribution over what remains. The training cost is four RTX 4090s
and 5,000 samples of continual pre-training on LLaMA2-7B (K5). That is a single-node
experiment, not a training program.

K5 also claims H2O suffers from an attention-bias problem, over-prioritizing either initial or
recent tokens. Note the incentive: this is the Attention-Gate paper characterizing the method
it is displacing. The claim is plausible given the attention-sink phenomenon that K7 documents
independently, but it has not been verified by a neutral source in this register.

## Family 3: memory tokens and the fixed bottleneck

The Recurrent Memory Transformer adds special memory tokens to the input or output sequence
with no changes to the transformer itself (M1). The document is cut into segments. Each forward
pass sees the memory state, one segment of real tokens, and a set of write positions whose
output hidden states become the memory for the next segment. In the reference PyTorch
implementation `num_memory_tokens = 128` is documented as determining "the bottleneck for
information being passed to the future" (M3). That comment is the whole mechanism in one line.

### Pseudocode: the RMT segment loop

```text
# Inputs
#   document   token stream of length N
#   L          segment length in tokens
#   m          number of memory tokens (128 in the reference implementation, M3)
#   model      unmodified transformer with window >= 2m + L
# Output
#   per-segment predictions, plus the final memory state
# Invariant
#   the model never sees more than one segment of raw tokens at a time; everything
#   older reaches it only through the m memory vectors.
# Compression ratio
#   L : m, fixed at configuration time, independent of segment content.

mem = learned_init(m)                              # m trainable vectors

for seg in chunks(document, L):
    x      = concat(mem, embed(seg), write_slots(m))
    h      = model(x)                              # ordinary self-attention over all of x
    y[seg] = h[positions_of(seg)]                  # task output for this segment
    mem    = h[positions_of(write_slots)]          # compressed state carried forward

# Training: the loss on segment i depends on memory produced by segments < i, so
# gradients flow back through the recurrence. RMT requires training to control the
# memory operations, and the memory tokens add compute overhead (M1). The admitted
# source is the abstract only, so the curriculum and truncation depth are outside
# this evidence base.
```

The bottleneck is the whole story. Compression ratio is `L : m` and is fixed by configuration,
so a segment carrying one fact and a segment carrying fifty facts both exit through the same
`m` vectors. RMT performs on par with Transformer-XL on language modeling at smaller memory
sizes and outperforms it on tasks that require longer sequence processing (M1). That is the
shape a fixed bottleneck predicts: no advantage when the memory is small, real gains when the
alternative is truncation. M3 relays a
follow-up claim that RMT can copy information across at least 1 million tokens. That claim is a
GitHub readme describing a paper the reader is not shown. Treat it as a lead, not a result.

Predicted from the bottleneck and *not* measured by any admitted source: sparse-fact tasks
should survive far better than dense recall, because the fixed `m` vectors cannot expand when
the segment carries more information.

### HMT: hierarchy over a flat state

| Measurement | Result | Setting | Ref |
| --- | --- | --- | --- |
| Perplexity improvement, Wikitext-103 | 25.5% (OPT), 17.6% (OpenLlamaV2) | Multiple samples concatenated | M2 |
| Perplexity improvement, PG-19 | 11.4% (OPT), 9.48% (OpenLlamaV2) | Book-length text | M2 |
| HMT versus RMT | 13% better perplexity (Wikitext-103), 5.42% (PG-19) | Same backbones | M2 |
| Parameter overhead | 0.5% to 2% of the backbone | Plug-in, fine-tuning required | M2 |
| PubMedQA | +9.81% long-answer contextual reasoning, +1.0% short-answer accuracy | Multi-context QA | M2 |

HMT replaces the flat single-level memory with multiple memory levels, and the 13% margin over
RMT on Wikitext-103 at 0.5%-2% extra parameters (M2) is the cleanest available argument that
the hierarchy, not just the presence of memory, is doing work. The important caveat is the
evaluation surface: perplexity on two language-modeling corpora plus one biomedical QA set. No
admitted source evaluates RMT or HMT on multi-step reasoning.

## Family 4: no numbers

Gist tokens, context distillation, and token merging (ToMe) belong to the family that is
closest to the naive mental model: learn a compressor that rewrites k context tokens into
j << k tokens the model consumes in place of the original text. A gist token is exactly that,
a learned compressed representation of a context segment.

No admitted source in this register provides a compression ratio, a fidelity number, or a
token-equivalent capacity for any of them. The family is in scope and out of evidence. Any
ratio quoted for gist tokens elsewhere is unverified by this note.

## Fidelity: retrieval survives, reasoning pays in tokens

| Task shape | What the evidence shows | Ref | What survives / what breaks |
| --- | --- | --- | --- |
| Single-fact retrieval | 128 KV entries, 100% on Needle-in-a-Haystack, LLaMA-3-70B | K4 | Position of a salient span is recoverable from a tiny cache |
| Mixed long-context | 12% retention matches a full cache on LongBench | K4 | Aggregate long-context quality holds at ~8:1 |
| Extreme budget | 0.7% retention still leads other compressors, +20.5 on TREC | K4 | Degradation is graceful and method-dependent |
| Reasoning | Eviction at low budgets produces longer reasoning traces | K1 | Accuracy may hold while total generated tokens rise |
| Streaming | 4M tokens stable, but window not expanded, only recent + sinks recognized | K7 | Fluency survives; historical recall does not exist |
| Task adaptation | Cannot change relative attention patterns | P1 | Novel information routing is unreachable |
| Language modeling | Hierarchical memory improves perplexity substantially | M2 | Gains bounded by whether `m` fits the task |

The reasoning result in K1 is the one that changes a cost model. Fidelity loss does not always
appear in the accuracy column. It can appear in the token bill, as the model compensating for
lost context by thinking longer. K1 observes the elongation and does not explain the mechanism,
so treat the size of the effect as workload-specific and measure it before shipping.

Synthesis, and the sentence worth keeping: current compression preserves *where* information
was and loses *how* it connects. Sinks and heavy hitters both select on per-position salience.
Retrieval is a per-position question, so it survives extreme compression. Multi-step reasoning
is a question about relations between positions, and a per-token argmin has no representation
of a relation to protect. That framing follows from the algorithm shape shown above rather than
from a controlled experiment, but it is consistent with every fidelity result in the table.

## Can a base LLM be trained to consume such memories?

| Family | Model change | Training data | Compute | Generalizes to unseen tasks? |
| --- | --- | --- | --- | --- |
| Heuristic KV eviction (StreamingLLM, H2O, SnapKV, PyramidKV) | None; runs on the stock checkpoint (K2, K7) | None | Inference-time only | Yes by construction, but backward-looking: assumes past importance predicts future need (K6) |
| Quantized KV (KIVI4) | None | None | Inference-time only | Most stable quality across the models tested (K3) |
| Learned in-context gate (Attention-Gate) | Small gate modules added | 5,000 samples, continual pre-training | 4x RTX 4090 on LLaMA2-7B (K5) | Not established beyond the datasets tested |
| Learned eviction policy (KVP) | Policy network, no backbone change | Pre-computed generation traces + RL loop (K6) | RL training overhead, not quantified | **Yes.** Zero-shot to LongBench, BOOLQ, ARC beyond its training distribution (K6) |
| Cross-segment memory tokens (RMT, HMT) | Memory tokens; HMT adds 0.5%-2% parameters (M2) | Task data; training required to control memory operations (M1) | Not quantified beyond parameter overhead | Per task. Evaluated on perplexity and one QA set only |
| Soft prompts / prefix tuning | Prefix parameters only | Per dataset (P2) | Low | **No.** Cannot learn tasks needing attention patterns the base model lacks (P1) |

The direct answer to the question: for family 2 there is often nothing to train, and where
there is, KVP demonstrates that a learned eviction policy transfers zero-shot to tasks it never
saw (K6). For family 3 the answer is yes but per task, and the training is a real project. For
family 1 the answer is no, and it is a theorem-shaped no rather than an engineering gap (P1).

## Choosing a method

| Workload | Method the evidence points to | Ref | Caveat |
| --- | --- | --- | --- |
| Unbounded streaming, only recent context matters | StreamingLLM | K7 | No historical recall. Do not use where old context must be retrievable |
| Single-fact retrieval over long documents | PyramidKV at extreme budgets | K4 | Demonstrated on retrieval-shaped benchmarks, not multi-hop |
| Throughput-bound long-context serving | SnapKV | K3 | Reported as a system-performance winner, not a quality winner |
| Quality stability across several backbones | KIVI4 | K3 | Benchmarked on Llama-3.1-8B and Mistral-7B only |
| Reasoning models | H2O, SnapKV-D | K1 | Budget for trace elongation at low cache budgets |
| Diverse or unknown workloads, willing to train | KVP | K6 | Needs generation traces; preprint-stage evidence |
| Long-context language modeling past the window | HMT | M2 | Per-task training; perplexity-heavy evaluation |
| Task adaptation | Soft prompts | P1, P2 | This is not memory. Do not budget it as context |

One rule outranks the table: compression ratio alone is a poor predictor of end-to-end
performance (K3). CaM produces large gains on selected QA workloads and substantial sensitivity
elsewhere (K3). Pick by workload, then measure on your own traffic.

## Failure modes, including the ones nobody has measured

| Failure mode | Mechanism | Evidence | Standing |
| --- | --- | --- | --- |
| Attention bias | H2O over-prioritizes initial or recent tokens | K5 | Weak. Claimed by a competing method's paper; plausible given sinks (K7) but not independently verified |
| Reasoning-trace elongation | Low budgets make reasoning models generate longer traces, trading cache memory for generation cost | K1 | Observed; mechanism not explained by the source |
| Backward-looking selection | Heuristics assume past importance predicts future utility | K6 | Theoretical argument plus KVP's empirical margin |
| Budget below the protected set | `budget < n_sink + W` leaves the evictor with no legal victim | Mechanism, this note | Implementation edge case, not a research finding |
| Hallucination amplification | Hypothesized: eviction removes the grounding a claim needed | **None** | Not covered. No admitted source measures factuality under compression |
| Position drift | Hypothesized: positional encodings shift as entries are removed | **None** | Not covered by any admitted source |
| Interpolation artifacts | Hypothesized: merged or quantized rows land between real representations | **None** | Not covered by any admitted source |

The last three were in the research plan and are not supported by the admitted sources. Absence
of evidence is not evidence of absence. They remain the right things to instrument first in any
deployment, precisely because nobody has published the measurement.

## Limits of this evidence base

- **Benchmark fragmentation.** No source evaluates all four families on a common benchmark. The
  KV family reports on LongBench, TREC, Needle-in-a-Haystack, RTE, RULER, OASST2-4k, BOOLQ, and
  ARC. The recurrent family reports on Wikitext-103, PG-19, and PubMedQA. The overlap is empty.
  Every cross-family comparison in this note, including the maturity ordering, is indirect.
- **Narrow model coverage.** Llama-3.1-8B and Mistral-7B carry most KV results (K1, K3),
  LLaMA-3-70B carries the Needle-in-a-Haystack result (K4), LLaMA2-7B carries Attention-Gate
  (K5), and OPT plus OpenLlamaV2 carry HMT (M2). Nothing here establishes behaviour on
  frontier-scale or mixture-of-experts models.
- **Family 4 is unquantified.** Gist tokens, context distillation, and ToMe have no compression
  ratios or fidelity numbers in this register.
- **No production case studies.** No admitted source documents any of these methods running in a
  deployed system at scale. K2's 18-method codebase shows engineering interest, not adoption.
- **Two load-bearing artifacts are not peer reviewed.** The 1M-token copying claim is a GitHub
  readme relaying a follow-up paper (M3), and the RMT entry is an abstract (M1). K6 is a very
  recent preprint with correspondingly limited external validation.
- **One claim has an interested author.** The attention-bias critique of H2O comes from the paper
  proposing the replacement (K5).
- **Missing operational numbers.** Only StreamingLLM reports a speedup (22.2x, streaming only,
  K7). No admitted source gives GPU memory footprints at serving scale, end-to-end latency for
  most methods, or training cost for RMT and HMT beyond parameter overhead.

## What this changes for building on top

1. **Compression does not reduce prompt cost.** Eviction and quantization act on keys and values
   that already exist, which means prefill compute has already been spent by the time anything is
   dropped. The savings are cache memory, decode-time bandwidth, and the ability to keep
   generating past the window. "More effective context at no token cost" is true for the cache
   and false for the prompt.
2. **None of this is cross-request memory.** Every method here operates within one sequence or
   one document pass. No admitted source persists a compressed latent, stores it, and re-injects
   it into a later request. The thing most people mean by "give the agent memory" is not what
   this literature has measured.
3. **Keep the text.** An evicted cache cannot be diffed, and a soft prompt is not human readable
   by construction (P2). Compression is a serving optimization, so keep the source text as the
   system of record and keep a full-context reference run for evaluation. See
   [[context-should-be-layered]].
4. **Measure generated tokens, not only accuracy.** Turning on aggressive eviction for a
   reasoning workload can hold accuracy and raise cost (K1). An eval harness that reports only
   quality will report success.
5. **Route by task shape.** Retrieval-shaped subtasks tolerate extreme compression. Anything that
   must combine several facts should keep a larger budget, which is the same conclusion
   [[long-context-needs-structure]] reaches from the retrieval side.
6. **If you train anything, train the eviction policy, not a prefix.** KVP's zero-shot transfer
   (K6) and Attention-Gate's four-GPU training cost (K5) make learned eviction the cheapest
   trainable component in this stack with a demonstrated generalization result behind it.

## Open questions

1. What compression ratio and fidelity do gist tokens and context distillation actually achieve?
   No admitted source answers this.
2. Does KV-cache compression increase hallucination rate? No factuality measurement exists under
   compression in this register.
3. How do RMT and HMT perform on multi-step reasoning rather than perplexity and biomedical QA?
4. What is the serving-scale GPU memory footprint of each method? Only StreamingLLM reports a
   system number.
5. Do learned eviction policies stay stable under distribution shift at inference time? KVP's
   zero-shot result is promising but tested on a limited task set.
6. Do hierarchical memory and KV-cache compression compose, or interfere? No source tests the
   combination.

## References

- P1: [When Do Prompting and Prefix-Tuning Work? A Theory of Capabilities and Limitations](https://arxiv.org/html/2310.19698v2)
- P2: [Soft prompts, Hugging Face PEFT documentation](https://huggingface.co/docs/peft/conceptual_guides/prompting)
- K1: [Hold Onto That Thought: Assessing KV Cache Compression On Reasoning](https://arxiv.org/html/2512.12008v1)
- K2: [KVCache-Factory: Unified KV Cache Compression Methods for Auto-Regressive Models](https://github.com/Zefan-Cai/KVCache-Factory)
- K3: [Benchmarking KV-Cache Optimizations across Task Quality and System Performance for Long-Context Serving](https://arxiv.org/html/2607.05399v1)
- K4: [PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling](https://arxiv.org/html/2406.02069v4)
- K5: [In-context KV-Cache Eviction for LLMs via Attention-Gate](https://arxiv.org/html/2410.12876v3)
- K6: [Learning to Evict from Key-Value Cache](https://arxiv.org/html/2602.10238v1)
- K7: [Efficient Streaming Language Models with Attention Sinks (streaming-llm)](https://github.com/mit-han-lab/streaming-llm)
- M1: [Recurrent Memory Transformer](https://arxiv.org/abs/2207.06881)
- M2: [HMT: Hierarchical Memory Transformer for Long Context Language Processing](https://arxiv.org/html/2405.06067v1)
- M3: [recurrent-memory-transformer-pytorch](https://github.com/lucidrains/recurrent-memory-transformer-pytorch)

Research trail for this note: `brain/inbox/dr/2026-09-04/llm-latent-memory.md`.
