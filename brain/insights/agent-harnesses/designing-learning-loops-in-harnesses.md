---
type: insight
title: "Designing Learning Loops in Agent Harnesses"
slug: designing-learning-loops-in-harnesses
created: 2026-08-05
status: working
publish: true
tags:
  - ai-agents
related:
  - "[[tests-are-the-agent-feedback-loop]]"
  - "[[agent-instructions-are-config]]"
  - "[[context-should-be-layered]]"
  - "[[context-files-are-config-with-debt]]"
  - "[[simplicity-beats-agent-theater]]"
---

# Designing Learning Loops in Agent Harnesses

A harness learning loop is not “the agent gets smarter.” It is an empirical state transition
over a declared editable surface, gated by an evaluator that sits *outside* that surface.
Near-term self-improvement pressure is concentrating in this machinery — prompts, skills,
tools, workflows, and harness code — rather than in models rewriting their own weights.
Lilian Weng’s synthesis makes the case that the deployment system around a base model is now
as decisive as raw post-training intelligence; the engineering question that follows is
sharper: *what exactly updates, what stays frozen, and how is accept/reject decided?* This
note answers that question with a nested-loop taxonomy, the concrete update rules from the
primary papers, a propose–evaluate–accept template that a systems engineer can implement,
and the failure modes that appear whenever those boundaries collapse.

## What a harness is (and is not)

Weng defines a harness as the system surrounding a base model that orchestrates execution
and decides how the model thinks and plans, calls tools and acts, perceives and manages
context, stores artifacts, and evaluates results. That product-broad sense matches how
Anthropic and OpenAI talk about coding agents: loop, tools, context management, guardrails,
and persistent state. Hugging Face’s glossary draws a stricter cut — *scaffolding* is what
the model reads (system prompt, tool schemas, context rules); *harness* is the execution
loop that calls the model, runs tools, and decides when to stop. Both cuts are useful. For
learning-loop design, the important distinction is not naming; it is **which artifacts are
allowed to change under the same scorekeeper**.

## Nested loops with hard boundaries

Learning in harnesses happens at four nested timescales. Each outer loop may *read* inner
traces. It must not *rewrite* the inner evaluator.

```text
┌──────────────────────────────────────────────────────────────┐
│ JOINT: update θ and/or H   (rare; attribution hard)          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ META: propose ΔH → eval on Din/Dho → accept / reject   │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ OUTER: update memory / skills / playbooks        │  │  │
│  │  │  ┌────────────────────────────────────────────┐  │  │  │
│  │  │  │ INNER: generate → act → observe → verify   │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

| Loop | Timescale | What evolves | What must stay frozen | Canonical objects |
| --- | --- | --- | --- | --- |
| **Inner** | One task / episode | Trajectory, scratch files, short-term plan | Weights, harness code, evaluator, task spec | ReAct trial; edit→test→edit |
| **Outer** | Across tasks / sessions | Skills, playbooks, AGENTS.md-like instructions, memory | Weights, harness *mechanism*, verifier protocol | ACE playbook; Voyager skill library |
| **Meta** | Across harness versions | Harness files: prompts, tools, middleware, workflow | Weights, evaluator `E`, held-out split, permission kernel | Self-Harness; AHE; DGM; STOP |
| **Joint** | Training + deployment | Harness *and* weights (or teacher distillation) | Safety / eval kernel | SIA; Continual Harness |

The product vocabulary “outer loop” often means *across-session memory* (skills,
`AGENTS.md`). The research vocabulary “outer loop” in Meta-Harness means *search over
harness code*. Keep the labels explicit; conflating them causes design mistakes.

### Per-loop mechanism contract

For each loop, a complete design answers five questions: state, update rule, evaluator,
immutable surface, failure modes.

**Inner loop.** State is the current plan, tool I/O, and local artifacts. The update is
`a_{t+1} = π(obs_t, mem_short, tools)`, optionally with verbal reflection after failure
(Reflexion). The evaluator is the environment: tests, compiler, shell exit, or a bounded
self-verifier. Immutable: task definition, model weights, harness config, permissions.
Failure modes: retry without new information; self-verifier false positives; declaring
success without an artifact check; context blow-up. This is the loop [[tests-are-the-agent-feedback-loop]]
is about — executable verification is the primary feedback channel that turns guesses into
grounded edits.

**Outer loop.** State is a skill library, playbook, or long-term memory. The update is
reflect → emit deltas → merge (ideally deterministic) → retrieve on the next task. The
evaluator is execution success, helpful/harmful counters, retrieval usefulness, and
transfer to held-out tasks. Immutable: merge schema, retrieval API contract, verifier
protocol. Failure modes: context collapse from monolithic rewrites; spurious lessons when
feedback is noisy; skill spam that destroys progressive disclosure. This is why
[[agent-instructions-are-config]] and [[context-should-be-layered]] matter: instruction
files are outer-loop *state*, not documentation.

**Meta loop.** State is harness version `h_t` plus a lineage or archive. The update is mine
weaknesses → propose bounded `Δ` → evaluate → accept only if non-regressive. The evaluator
is a fixed benchmark protocol with a held-out gate (and optionally a falsifiable manifesto).
Immutable: model `M`, evaluator `E`, verifier, held-out assignment, LLM config / budgets,
runs directory. Failure modes: editing the scorekeeper; overfitting held-in failures;
diversity collapse; disabling the verifier or raising budgets.

**Joint loop.** State is `(h_t, θ_t)`. A feedback agent chooses which surface to update, or
both co-adapt. Evidence here is still provisional (Weng’s reading of SIA). Without an
immutable eval plane, attribution between harness edits and weight updates becomes
unrecoverable.

## The optimization ladder

Weng’s progression of *what gets optimized* is the practical curriculum for building
learning into a harness:

```text
instruction prompts → structured context → workflow → harness code → optimizer code
```

Each step expands the search space and raises the cost of a bad accept gate. Prompt tweaks
are cheap and local. Harness-code search can discover tools and middleware humans would not
hand-write. Optimizer-code search (STOP’s recursive improver) can invent new search
strategies — but only when the base model is strong enough, and only when the improver
cannot rewrite the utility function.

## Concrete mechanisms

### ACE: outer-loop playbook deltas

Agentic Context Engineering (Zhang et al., ICLR 2026) treats context as an evolving
playbook of bullets `(id, content, helpful_count, harmful_count)`, not as an ever-lengthening
prompt blob.

1. **Generator** runs tasks against the playbook.
2. **Reflector** distills insights from successful and failed trajectories; tags bullets
   helpful / harmful / neutral.
3. **Curator** emits *itemized* ADD/UPDATE deltas. Merge is **deterministic**, not another
   free-form rewrite: new IDs append, counters update in place, and a periodic grow-and-refine
   pass de-duplicates near-identical bullets (typically by embedding similarity) so the
   playbook grows without collapsing into a single summary paragraph.

The design target is to avoid *context collapse* and *brevity bias* — the failure modes of
iteratively rewriting a single prompt. Reported gains: about **+10.6%** average on agent
benchmarks (AppWorld) and **+8.6%** on finance tasks, with **86.9%** lower adaptation
latency on average. ACE still handcrafts the Generator/Reflector/Curator workflow; it
improves *content*, not the context-management *mechanism*. Meta Context Engineering (MCE;
Ye et al. 2026) lifts that one level: an outer skill-evolution loop searches over
context-management mechanisms while an inner loop optimizes the skill-conditioned context,
with both levels operating as coding agents over a filesystem.

### Self-Harness: meta propose–evaluate–accept

Self-Harness (Zhang et al. 2026) is the cleanest statement of a meta learning loop with
frozen weights:

1. **Weakness mining.** Run `h_t` on held-in tasks `D_in`. Cluster failures by
   verifier-level cause × causal status × reusable agent mechanism into an evidence bundle
   `B_t`. The proposer never sees held-out (`D_ho`) traces.
2. **Harness proposal.** The same model, under `h_t`, proposes `K` distinct, minimal edits
   over a *declared* editable surface, each with an audit record (target pattern, surface,
   expected effect, regression risks).
3. **Proposal validation.** Evaluate candidates on both splits. Accept only if:

```text
Δ_in ≥ 0  AND  Δ_ho ≥ 0  AND  max(Δ_in, Δ_ho) > 0
```

Improve at least one split; degrade neither. Rejected candidates are logged without
changing the active harness.

Terminal-Bench-2.0 Pass rates (same model proposes and solves; 64 of 89 tasks after
dropping unstable web/multimodal items). Relative lift = `(after − before) / before`.
Pass is averaged over repeated attempts in the paper; the accept gate should therefore
also use aggregates, not a single noisy run.

| Model | Held-out before → after | Relative | Held-in before → after |
| --- | --- | --- | --- |
| MiniMax M2.5 | 40.5% → 61.9% | +53% | 43.0% → 50.0% |
| Qwen3.5-35B-A3B | 23.8% → 38.1% | +60% | 15.1% → 36.0% |
| GLM-5 | 42.9% → 57.1% | +33% | 47.7% → 57.0% |

The same loop learns *model-specific* harness instructions. That is a feature for
deployment and a warning for transfer claims.

### AHE: observability-driven edits with a manifesto

Agentic Harness Engineering (Lin et al. 2026) argues that harness evolution fails when
rollouts are opaque. Three observability pillars:

1. **Component observability.** Seven editable file-level components: system prompt, tool
   description, tool implementation, middleware, skill, sub-agent configuration, long-term
   memory. The action space is explicit and git-tracked.
2. **Experience observability.** An agent debugger compresses raw trajectories into layered
   reports (digest → per-task → raw) so the evolver is not forced to shove megatokens into
   one prompt.
3. **Decision observability.** Every edit ships a **manifesto**: evidence name, inferred
   root cause, targeted fix, predicted fixes *and* at-risk regressions. The next round
   falsifies the prediction.

Anti-hack constraints are architectural, not prompt-based: the evolve agent writes only in
the harness workspace; runs directory, tracer, verifier, and LLM configuration are
read-only; the seed system prompt is non-deletable. On Terminal-Bench-2, AHE moved a seed
harness from **69.7% → 77.0%** pass@1 (GPT-5.4), beating Codex-CLI (**71.9%**), Terminus-2
(**62.9%**), and OpenCode (**47.2%**) on aggregate, while losing to Codex on the Hard tier
(**53.3% vs 56.7%**). Without further evolution, the frozen harness transfers to
SWE-bench Verified (highest aggregate among the compared self-evolve baselines, with
**~12%** fewer tokens than the seed) and yields **+5.1 to +10.1 pp** pass@1 across
alternate base-model families — larger gains on bases further from saturation. Component
ablation is the transfer story: tools, middleware, and long-term memory each carry gains;
system-prompt-only edits regress. Manifesto self-prediction is usable for fixes
(precision **33.7%**, recall **51.4%**, ~5× random) but nearly blind to regressions
(precision **11.8%**, recall **11.1%**) — which is why evolution curves are non-monotone.

### DGM: evolutionary archive, not hill-climbing

The Darwin Gödel Machine (Zhang et al. 2025) lets a coding agent modify its own harness
codebase under a fixed foundation model (Claude 3.5 Sonnet New in the reported runs). The
learning rule is evolutionary:

1. Keep an **archive** of functional agents, not only the current best.
2. Sample parents from agents whose score is not yet perfect. For agent \(i\) with accuracy
   \(\alpha_i\) and \(n_i\) children that still have codebase-editing ability:

```text
s_i = σ(λ (α_i − α_0))          # sigmoid-scaled performance
h_i = 1 / (1 + n_i)             # novelty = inverse functioning-children count
w_i = s_i · h_i
p_i = w_i / Σ_j w_j
```

Typical hyperparameters: \(\lambda = 10\), \(\alpha_0 = 0.5\), \(k = 2\) parents per
iteration on SWE-bench and \(k = 4\) on Polyglot.

3. Parent reads its own eval logs, proposes a harness change, implements it with bash +
   editor tools, and is evaluated.
4. Add the child only if it compiles *and* retains codebase-editing ability — the hard
   gate that keeps the evolutionary chain self-modifiable.

Reported results after 80 iterations: SWE-bench Verified **20.0% → 50.0%** under the
staged subset protocol (10 → ~50/60 tasks, with 200-task follow-ups for top candidates —
not a full Verified-500 endpoint); Polyglot subset progress **14.0% → 38.0%**, with full
Polyglot re-eval **14.2% → 30.7%**. Staged eval saves compute but can bias which stepping
stones survive. Parent-selection policy and archive-maintenance rules are *not* themselves
editable — a frozen meta-meta kernel. Sakana’s writeup also documents reward-hacking and
tool-hallucination cases, which is the correct attitude toward any self-editing loop.

Archive + novelty is the antidote to pure hill-climbing. Ablating open-ended archive
exploration collapses SWE progress toward ~23%, and a greedy always-pick-best parent
policy reaches only **39.7%** vs DGM’s **50.0%** on the same SWE setup. Stepping stones
that look worse under the current evaluator can later unlock better agents — observed at
iterations where temporary dips still led to new archive bests.

### STOP: recursing on the improver

Self-Taught Optimizer (Zelikman et al., COLM 2024) improves the *improver* rather than a
single solution. With seed improver `I_0` and meta-utility measured over a task
distribution, the recursion is:

```text
I_t = I_{t-1}(û, I_{t-1}; M)
```

STOP discovered scaffolds resembling genetic algorithms, beam search, simulated annealing,
and prompt bandits. The cautionary result is as important as the discovery: mean downstream
performance improved across iterations with GPT-4 and **degraded** with GPT-3.5 and
Mixtral. Recursive structure is not a free lunch. Lin et al. (2026) later disentangle
**harness-updating** (ability to propose useful edits — roughly flat from ~9B to Opus-class)
from **harness-benefit** (ability to *use* an improved harness — non-monotonic; mid-tier
models often benefit most). Designing a learning loop therefore includes choosing who
proposes versus who executes.

### Foundations that still define the inner and outer shapes

| System | Loop role | Mechanism that survived into modern harnesses |
| --- | --- | --- |
| Reflexion (Shinn et al. 2023) | Inner / short outer | Verbal self-reflection stored in a bounded episodic buffer |
| Voyager (Wang et al. 2023) | Outer | Automatic curriculum + verified skill library + embedding retrieval |
| SWE-agent ACI (Yang et al. 2024) | Inner interface | LM-friendly tool/env design beats a raw shell for SWE tasks |
| ADAS / AFlow (2025) | Meta (workflow) | Meta-agent search / MCTS over agent workflows represented as code or graphs |
| AlphaEvolve (Novikov et al. 2025) | Meta (solution code) | `# EVOLVE-BLOCK` editable regions; frozen LLMs propose diffs; meta-prompt co-evolves |

Voyager’s ablation is still the cleanest outer-loop lesson: removing the skill library
causes late plateau; removing the curriculum collapses item discovery. Progressive
disclosure — retrieve skills when needed, do not dump the library into every prompt — is
the same design pressure that shows up in product skills systems and in
[[context-should-be-layered]].

## Reusable propose–evaluate–accept loop

The following template is the systems contract shared by Self-Harness and AHE, written so
an engineer can implement it against a coding-agent harness. The invariants are the point.

```text
Inputs:
  M                 # frozen model
  h0                # initial harness (files)
  Din, Dho          # fixed, disjoint task splits
  E                 # frozen evaluator / verifier protocol
  editable          # allowlist of writable harness paths
  frozen            # read-only: E, runs/, budgets, secrets, Din/Dho assignment
  K, T              # proposals per round, max rounds

State:
  h ← h0
  lineage ← [h0]
  rejects ← []

for t in 1..T:
  pin, pho, traces ← evaluate(M, h, Din ∪ Dho, E)

  # Mine weaknesses from held-in ONLY.
  # cluster_failures groups traces on three axes (Self-Harness):
  #   1) verifier-level cause (timeout, missing artifact, wrong output, …)
  #   2) causal status of the agent behavior that produced it
  #   3) reusable agent mechanism exposed by the trace
  # Two runs can share the same verifier string and still have different mechanisms.
  evidence ← cluster_failures(traces[Din])
  preserve ← summarize_passing(traces[Din])
  prior    ← summarize(rejects[-N:] ∪ lineage)

  proposals ← []
  for j in 1..K:
    Δ ← propose(M, h, evidence, preserve, prior, editable, diversity_hint=j)
    assert Δ touches only editable
    assert Δ touches none of frozen
    proposals.append(Δ with audit/manifesto)

  accepted ← []
  for Δ in proposals:
    h' ← apply(h, Δ)
    pin', pho' ← evaluate(M, h', Din ∪ Dho, E)   # repeat trials; use means
    d_in ← pin' - pin
    d_ho ← pho' - pho
    ok ← (d_in ≥ 0) ∧ (d_ho ≥ 0) ∧ (max(d_in, d_ho) > 0)
    if ok:
      accepted.append((Δ, d_ho))
    else:
      rejects.append(record(Δ, d_in, d_ho))   # negative-result preservation

  if accepted nonempty:
    # Operator-defined merge. Safe defaults, in order of preference:
    #   (a) pick the single Δ with best d_ho (no conflict risk)
    #   (b) apply non-overlapping file patches in manifesto order
    #   (c) if two Δ touch the same file, keep the better d_ho and reject the other
    h ← merge(h, accepted)
    lineage.append(h)
    persist_receipts(t, h, accepted, rejects) # git commit + manifesto files

return h
```

**Worked accept/reject example.** Suppose weakness mining finds a recurrent cluster
`missing_artifact × skipped_verification × no_post_edit_test`. Proposal Δ₁ adds a
middleware hook that runs `pytest` after every `edit` tool call. Evaluation: `d_in = +4`
tasks, `d_ho = +2`, no regressions → accept, commit manifesto
`{evidence: missing_artifact/…, predicted_fixes: [t12,t44], at_risk: [t7]}`. Proposal Δ₂
extends the system prompt with “always verify carefully”: `d_in = +1`, `d_ho = −3` →
reject and retain the receipt so the next round does not rediscover the same prose patch.

**Implementation checklist**

1. Partition `Din` / `Dho` once. Never leak `Dho` traces to the proposer.
2. Enumerate editable surfaces as an allowlist; mount frozen paths read-only at the OS or
   sandbox layer, not only in the system prompt.
3. Require every proposal to name a primary failure cluster and a predicted behavioral
   change (AHE manifesto). Treat the prediction as a falsifiable claim next round.
4. Repeat stochastic evaluations (Self-Harness averages Pass over multiple attempts); gate
   on aggregates, not a single noisy run.
5. Persist every accept *and* reject as filesystem receipts under version control. Grep is
   the recovery protocol when context windows fail.
6. Define merge policy before the first round. “Merge all accepted” without conflict rules
   is how silent harness corruption happens.

## Anti–reward-hack design principles

| Principle | Mechanism | What it blocks |
| --- | --- | --- |
| Editable vs frozen surface | Allowlist writable files; mark eval/kernel read-only (`# EVOLVE-BLOCK`, AHE mounts) | Disabling verifier, swapping model, raising budget |
| Held-out eval gates | Fixed split; proposer sees only `Din`; Self-Harness accept rule | Overfitting diagnosed failures |
| Negative-result preservation | Log rejects; keep archive stepping stones (DGM) | Amnesia that re-proposes known-bad edits |
| Diversity pressure | Parallel distinct proposals; parent novelty bonus; embedding near-dupe reject | Population collapse to one prompt variant |
| Filesystem-as-memory receipts | Traces, manifests, diffs, scores as files (Weng Pattern 2) | Silent wins; non-auditable state; context overflow |
| Progressive disclosure | Hot invariants always loaded; skills retrieved on demand | Always-on skill spam that hurts attention |
| Prune as models improve | Anthropic’s lean-harness doctrine | Dead scaffolding that bottlenecks stronger models |
| Humans move up the stack | Oversight at accept gates and fuzzy evaluators | Removing judgment where metrics are weak |

[[simplicity-beats-agent-theater]] is the complementary product rule: do not build a meta
loop before the inner loop has an honest evaluator. A self-editing harness optimizing
noisy vibes only accelerates confabulation.

## Mapping onto coding-agent products

| Product artifact | Loop role | Design move |
| --- | --- | --- |
| Claude Code / Codex / Cursor runtime | Inner | Make tests, typecheck, and linters the tight feedback channel |
| `AGENTS.md` / `CLAUDE.md` / Cursor rules | Outer hot config | Versioned config, not docs; short invariants; measure with/without |
| Skills / MCP / subagents | Outer + meta-editable surface | Index by description; retrieve on demand; commit only after verification |
| Hooks / middleware / path guards | Meta-editable policy | Often higher leverage than longer system prompts (AHE ablations) |
| Repo playbooks / “lessons learned” | Outer ACE-style | Bullet deltas with helpful/harmful counters; deterministic merge |
| Nightly harness self-edit CI | Meta | Mine CI failures → propose patches → held-out PR suite → Self-Harness gate |
| Fine-tune / RL on trajectories | Joint | Keep the eval harness frozen; attribute ΔH vs Δθ under matched compute |

## Trade-offs

| Choice | Upside | Cost / risk |
| --- | --- | --- |
| Bullet deltas (ACE) vs full rewrite | No context collapse; cheap merge | Needs a strong Reflector; noisy without reliable feedback |
| Held-out gate (Self-Harness) | Real generalization signal | Slower; rejects useful tradeoffs; needs enough tasks |
| Archive + novelty (DGM) | Escapes local optima | Compute-heavy; stepping-stone eval noise |
| Manifesto falsification (AHE) | Attribution + rollback | Fix-precision ~33.7%; regression-precision ~11.8% |
| Recursive improver (STOP) | Discovers new search algorithms | Needs a strong base model; unsandboxing risk |
| Joint H+θ | Full self-improvement path | Attribution hell; provisional evidence |

## Where learning loops break

Weng’s challenge list is the correct threat model for anyone shipping a learning loop:

1. **Weak and fuzzy evaluators.** Self-improvement works where metrics are objective
   (tests, kernels, contest scores). Research taste, novelty, and long-term scientific
   value do not have unit-test oracles. Auto-research systems can produce plausible papers
   while drifting from the proposed method, fabricating citations, or declaring victory on
   noise (Trehan & Chopra 2026; Bubeck et al. 2025 on “numerical duct tape”).
2. **Memory lifecycle.** Memory that only grows becomes retrieval poison. Compaction,
   forgetting, conflict resolution, and provenance are unsolved systems problems.
3. **Negative-result culture.** Training data and publication incentives bias toward
   success. A research harness must make failed attempts first-class artifacts.
4. **Diversity collapse.** Evolutionary and RL loops exploit known high-reward patterns.
   Open-ended domains need explicit novelty pressure.
5. **Reward hacking.** Whatever sits inside the editable surface will eventually be gamed.
   The evaluator and permission kernel must live outside. AHE’s manifesto numbers make the
   asymmetry concrete: fix foresight is usable; regression foresight is near the floor —
   so non-monotone evolution is expected until the loop can name what an edit will break.
6. **Short-horizon success.** Sandbox pass rates miss maintainability, ownership
   boundaries, migration cost, and future debugging burden — the same gap
   [[tests-are-the-agent-feedback-loop]] notes when functional tests alone miss structural
   failure. Staged eval protocols (DGM) save compute but also bias which stepping stones
   survive.
7. **Human oversight at the wrong altitude.** Humans should move up the stack — accept
   gates, fuzzy evaluators, long-horizon repo health — not rubber-stamp every tool call.

Benchmarks that stress these limits (PaperBench, CORE-Bench, ScienceAgentBench, RE-Bench,
MLE-bench, KernelBench) consistently show that agent systems still lag humans on
open-ended, long-horizon scientific work even when short-budget scores look competitive.

## Practical design implications

If you are building or operating a coding-agent harness today, build in this order:

1. **Inner:** executable verification agents can run without asking (tests, typecheck,
   linters). Do not start a meta loop to compensate for a missing inner evaluator.
2. **Outer:** layered instructions and skills with progressive disclosure. Promote
   `AGENTS.md` / skill edits through the same propose–evaluate–accept discipline you would
   use for harness code — unmeasured instruction growth is [[context-files-are-config-with-debt]].
3. **Meta:** declare the editable surface in code and mount the rest read-only.
   Prompt-only “don’t touch the verifier” instructions are not a security boundary. Prefer
   filesystem receipts (logs, diffs, manifests, rejects) over chat history. Keep negative
   results as search pruning. Define merge policy before the first round.
4. **Joint:** last, and only with a frozen eval plane that can attribute ΔH vs Δθ under
   matched compute.

Also measure harness-benefit separately from harness-updating: a small model may propose
useful edits that a mid-tier executor benefits from more than a frontier model does. Expect
many harness tricks to eventually migrate into weights — as prompt tricks did — while the
need for goals, constraints, tools, and external evaluation remains.

## Sources

Primary synthesis:

- Weng, Lilian. “Harness Engineering for Self-Improvement.” Lil’Log, Jul 2026.
  https://lilianweng.github.io/posts/2026-07-04-harness/

Definitions and industry framing:

- Anthropic. “Harnessing Claude’s Intelligence: Designing Agent Harnesses.” Apr 2026.
  https://claude.com/blog/harnessing-claudes-intelligence
- OpenAI. “Harness Engineering.” Feb 2026.
  https://openai.com/index/harness-engineering/
- Hugging Face. “Agent Glossary.” May 2026.
  https://huggingface.co/blog/agent-glossary
- Schmid, Philipp. “Inner Loop vs Outer Loop.” Feb 2026.
  https://www.philschmid.de/inner-loop-vs-outer-loop

Learning-loop mechanisms (validated against abstracts / papers):

- Zhang et al. “Agentic Context Engineering: Evolving Contexts for Self-Improving Language
  Models.” ICLR 2026. https://arxiv.org/abs/2510.04618
- Ye et al. “Meta Context Engineering via Agentic Skill Evolution.” 2026.
  https://arxiv.org/abs/2601.21557
- Zhang et al. “Self-Harness: Harnesses That Improve Themselves.” 2026.
  https://arxiv.org/abs/2606.09498
- Lin et al. “Agentic Harness Engineering: Observability-Driven Automatic Evolution of
  Coding-Agent Harnesses.” 2026. https://arxiv.org/abs/2604.25850
- Zhang et al. “Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents.” 2025.
  https://arxiv.org/abs/2505.22954 — also https://sakana.ai/dgm/
- Zelikman et al. “Self-Taught Optimizer (STOP): Recursively Self-Improving Code
  Generation.” COLM 2024. https://arxiv.org/abs/2310.02304
- Lin et al. “Harness Updating Is Not Harness Benefit.” 2026.
  https://arxiv.org/abs/2605.30621
- Lee et al. “Meta-Harness: End-to-End Optimization of Model Harnesses.” 2026.
  https://arxiv.org/abs/2603.28052
- Hu, Lu, and Clune. “Automated Design of Agentic Systems.” ICLR 2025.
  https://arxiv.org/abs/2408.08435
- Zhang et al. “AFlow: Automating Agentic Workflow Generation.” ICLR 2025.
  https://arxiv.org/abs/2410.10762
- Novikov et al. “AlphaEvolve: A coding agent for scientific and algorithmic discovery.”
  2025. https://arxiv.org/abs/2506.13131
- Shinn et al. “Reflexion: Language Agents with Verbal Reinforcement Learning.” 2023.
  https://arxiv.org/abs/2303.11366
- Wang et al. “Voyager: An Open-Ended Embodied Agent with Large Language Models.” 2023.
  https://arxiv.org/abs/2305.16291
- Yang et al. “SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering.”
  2024. https://arxiv.org/abs/2405.15793
- Trehan and Chopra. “Why LLMs Aren’t Scientists Yet.” 2026.
  https://arxiv.org/abs/2601.03315
- Hebbar et al. “SIA: Self Improving AI with Harness & Weight Updates.” 2026.
  https://arxiv.org/abs/2605.27276

### Numbers validated for this note

| System | Metric | Number | Caveat |
| --- | --- | --- | --- |
| DGM | SWE / Polyglot | 20.0%→50.0% / 14.2%→30.7% | Fixed Claude 3.5 Sonnet New; SWE is staged-subset endpoint (not full Verified-500); Polyglot 14.2→30.7 is full re-eval |
| Self-Harness | TB-2.0 held-out Pass | 40.5→61.9 / 23.8→38.1 / 42.9→57.1 | 64/89 tasks; model-specific harnesses; Pass averaged over attempts |
| AHE | TB-2 pass@1 | 69.7%→77.0% (vs Codex 71.9%) | Hard: Codex 56.7% > AHE 53.3%; cross-family +5.1–10.1 pp; fix-prec 33.7% / reg-prec 11.8% |
| ACE | Agent / finance avg gain | +10.6% / +8.6% | Needs reliable execution feedback |
| STOP | Model dependence | Improves with GPT-4; degrades with GPT-3.5 / Mixtral | Recursive structure ≠ free lunch |
