# INSIGHT 05: Maintainability Beats One-shot Correctness

The next frontier for coding agents is not whether they can pass today's tests on a single snapshot.
It is whether their changes remain easy to extend, adapt, and verify through future changes. A
brittle patch and an extensible patch can both pass the same tests. The difference only emerges
when the codebase must evolve. SWE-CI measures this directly; Needle in the Repo probes it with
structural oracles; and the broader benchmark landscape (FEA-Bench, Multi-SWE-bench, SWE-bench
Live) is slowly expanding beyond Python bug-fixing without yet solving the maintainability question.

## Source map

| Ref | Source                                 | Local text                                            | Role                                                                                 |
| --- | -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| R09 | SWE-CI (2026-03)                       | `paper-text/swe-ci-2603.03823.txt`                    | First benchmark to evaluate long-term maintainability through iterated CI evolution. |
| R46 | Needle in the Repo (2026-03)           | `paper-text/needle-in-the-repo-2603.27745.txt`        | Probes maintainability with structural oracles beyond functional tests.              |
| R08 | FEA-Bench (2025-03)                    | `paper-text/fea-bench-2503.06680.txt`                 | Expands task space to feature implementation across repositories.                    |
| R05 | Multi-SWE-bench (2025-04)              | `paper-text/multi-swe-bench-2504.02605.txt`           | Extends issue resolving beyond Python into multiple ecosystems.                      |
| R06 | SWE-bench Live (2025-05)               | `paper-text/swe-bench-live-2505.23419.txt`            | Addresses contamination and benchmark freshness.                                     |
| R07 | SWE-rebench (2025-05)                  | `paper-text/swe-rebench-2505.20411.txt`               | Automated pipeline for fresh, decontaminated agent tasks.                            |
| R59 | Smells of LLM Generated Code (2025-10) | `paper-text/smells-llm-generated-code-2510.03029.txt` | LLM-generated code shows more design/implementation smells than professional code.   |
| R61 | The Modular Imperative (2025)          | `paper-text/modular-imperative-lmpl-2025.pdf`         | Argues for constraining LLM code through modular design practices.                   |

## SWE-CI (R09): the evolution-based evaluation paradigm

### The core argument

SWE-CI explicitly states the problem with existing benchmarks: "Existing benchmarks almost
exclusively focus on measuring the agent's ability to write functionally correct code. However,
in the real world, successful software is rarely achieved overnight; it is the result of long-term
maintenance."

The key insight is formulated precisely: "an agent's ability to maintain code can only be revealed
through long-term evolution, where the consequences of past decisions accumulate over successive
changes."

### Benchmark design

| Property                             |                                          Value |
| ------------------------------------ | ---------------------------------------------: |
| Total tasks                          |                                            100 |
| Average development history per task |                                       233 days |
| Average consecutive commits per task |                                             71 |
| Evaluation protocol                  |        Architect-Programmer dual-agent CI loop |
| Base requirement                     | Repository with >= 3 years maintenance history |
| Star requirement                     |                                   >= 500 stars |
| Token consumption for experiments    |                            > 10 billion tokens |

Source trace: R09, `paper-text/swe-ci-2603.03823.txt`.

### The EvoScore metric

EvoScore is designed to capture maintainability as a scalar:

```
e = (sum of gamma^i * a(c_i), i=1..N) / (sum of gamma^i, i=1..N)
```

Where:

- `a(c)` is the normalized change: how many tests the agent has gained or lost relative to baseline
- `gamma >= 1` gives later iterations more weight
- When `gamma = 1`, EvoScore is simple average normalized change
- As `gamma` increases, long-term stability is increasingly rewarded

The normalized change formula:

- Improvement: `(n(c) - n(c0)) / (n(c*) - n(c0))` -- fraction of gap closed
- Regression: `(n(c) - n(c0)) / n(c0)` -- fraction of originally-passing tests broken
- Result range: [-1, 1]

### Why EvoScore captures maintainability

The ISO/IEC 25010 standard defines maintainability as "the degree to which software can be
modified effectively without introducing defects or degrading existing quality."

SWE-CI operationalizes this: "more maintainable code is less likely to break future functionality."
An agent that produces clean, extensible code will maintain or improve its EvoScore through
subsequent iterations. An agent that produces brittle, tightly-coupled code will see EvoScore
decline as each new modification breaks something.

### What SWE-CI reveals about current agents

From the paper: "Results reveal that, despite substantial progress on functional correctness,
state-of-the-art models still struggle when tasked with sustaining code quality over extended
evolution."

This is the empirical confirmation of the insight: current agents optimize for the snapshot test,
not for the evolution test. The codebase design implications are about making the "extensible"
path easier for the agent to find and follow.

## Needle in the Repo (R46): structural failures beyond test passing

### The gap between correctness and maintainability

NITR constructs probes that separate functional correctness from structural quality. Each probe
is designed so that success depends primarily on one targeted maintainability dimension.

### NITR results (from prior research notes)

| Metric                                                          |          Value |
| --------------------------------------------------------------- | -------------: |
| Average solve rate across all AI configurations                 |          36.2% |
| Best configuration solve rate                                   |          57.1% |
| Micro cases solve rate                                          |          53.5% |
| Multi-step cases solve rate                                     |          20.6% |
| Outcomes passing functional tests but failing structural oracle | 64/483 (13.3%) |
| Hardest: dependency control                                     |           4.3% |
| Hardest: responsibility decomposition                           |          15.2% |
| Agent-mode improvement over direct inference                    | 45.0% vs 28.2% |

Source trace: R46, `paper-text/needle-in-the-repo-2603.27745.txt`.

### Maintainability dimensions tested

The hardest pressures are architectural rather than local:

- **Dependency control (4.3% success):** Maintaining proper import boundaries and dependency direction
- **Responsibility decomposition (15.2% success):** Splitting functionality into appropriate modules

These are exactly the properties that make code extensible. An agent that bypasses an abstraction
layer or dumps functionality into a single file passes the test but creates future maintenance cost.

### The 13.3% false-positive finding

"64/483 outcomes (13.3%) pass all functional tests yet fail the structural oracle." This means:

- Functional tests are necessary but insufficient
- One in eight "correct" patches introduces structural debt
- Without structural oracles, this debt is invisible until the next modification

Agent-mode configurations improve average performance from 28.2% to 45.0% but do NOT
eliminate architectural failures. This means agent iteration (retry, explore, fix) helps with
functional correctness but does not automatically produce maintainable structure.

## The broader benchmark landscape

### FEA-Bench (R08): feature implementation

FEA-Bench expands beyond bug-fixing to feature implementation. Feature work requires:

- Understanding existing architecture
- Finding extension points
- Maintaining existing behavior while adding new capability
- Respecting patterns and conventions

Feature tasks are inherently more sensitive to maintainability because they add new structure
that must integrate with existing structure. A feature that works but violates the architecture
is worse than no feature.

### Multi-SWE-bench (R05): beyond Python

Multi-SWE-bench extends issue resolving into multiple programming language ecosystems. This
matters for maintainability because:

- Different languages have different modularity mechanisms (modules, packages, traits, interfaces)
- Static type systems provide different levels of structural constraint
- Build systems vary in how they encode and enforce boundaries

### SWE-bench Live and SWE-rebench (R06, R07): freshness

These benchmarks address contamination and freshness but still primarily measure issue
resolution. They do not measure whether the resolution is maintainable. Their contribution
to the maintainability story is indirect: they ensure the evaluation is on genuinely novel tasks
where memorized patches cannot help.

## LLM code smells (R59): empirical evidence of structural problems

R59 finds that LLM-generated code shows substantially more design and implementation smells
than professional reference code. This provides empirical ground truth for the claim that
current models do not naturally produce maintainable code -- they optimize for functional
correctness at the expense of structural quality.

Source trace: R59, `paper-text/smells-llm-generated-code-2510.03029.txt`.

## The Modular Imperative (R61): constraining LLMs through design

R61 argues that modular design practices should constrain, guide, and validate LLM code
generation. The argument is that without explicit modular constraints, LLMs will naturally
produce monolithic, tangled code that passes tests but resists modification.

Source trace: R61, `paper-text/modular-imperative-lmpl-2025.pdf`.

## What agent-friendly codebases should optimize for

Combining the evidence, codebase patterns that support future editability:

| Pattern                                    | Why it helps agents produce maintainable code                    |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Clear module boundaries                    | Agent can see where new code belongs without violating structure |
| Stable public interfaces                   | Agent knows which surfaces are safe to depend on                 |
| Small, focused modules                     | Reduces the scope of changes; limits blast radius                |
| Typed contracts                            | Compiler catches structural violations before tests run          |
| Behavior tests around extension points     | Agent verifies preservation without structural coupling          |
| Migration notes when conventions change    | Agent knows the current preferred pattern                        |
| Examples showing the preferred pattern     | Agent has a template to follow, not just constraints to infer    |
| Structural lints (import boundaries, etc.) | Agent gets fast feedback on architectural violations             |

## Inference

### What the evidence supports:

1. **Snapshot benchmarks systematically hide maintainability differences.** SWE-CI's core insight:
   a brittle patch and an extensible patch can both pass the same tests. The difference appears only
   under evolution.

2. **13.3% of "correct" patches fail structural checks.** NITR proves that functional tests alone
   create a systematic blind spot. Structural oracles are needed.

3. **Architectural properties are the hardest for agents.** Dependency control (4.3%) and
   responsibility decomposition (15.2%) are much harder than local code changes.

4. **LLM-generated code has more smells than professional code.** The default agent output is
   structurally worse, not just functionally different.

5. **Maintainability can be measured through evolution.** SWE-CI's EvoScore provides a concrete,
   computable proxy. The field now has a way to score maintainability, not just correctness.

### Inference (author conclusion):

- The codebase itself must encode maintainability constraints as executable feedback. If the only
  test is "does it work?", agents will produce working-but-brittle code.
- Structural lints, import boundary enforcement, module size limits, and interface stability checks
  turn maintainability from an aspiration into an automated signal.
- The "next agent can change it again" principle should be the design heuristic: every modification
  should be evaluated not just by "does it pass?" but by "does it make the next modification
  easier or harder?"

## Non-claims

- SWE-CI has not yet published a leaderboard showing which agents produce the most maintainable
  code. The benchmark is new (2026-03) and results are preliminary.
- NITR uses curated synthetic probes, not real-world repositories. The 13.3% false-positive rate
  may not generalize to production codebases.
- The "code smells" finding (R59) describes correlation, not causation. LLMs may produce smelly
  code because training data contains smelly code, not because they lack structural understanding.
- None of these papers prove that adding structural lints to a codebase directly improves agent
  output quality. That claim is an inference from the combination of evidence.
- EvoScore has gamma as a hyperparameter. Different gamma values may rank agents differently.
  The "right" weighting of long-term vs short-term quality is a design choice, not an empirical finding.

## Blog/presentation visual candidates

1. **Snapshot vs evolution diagram** (from SWE-CI Figure 1): showing how brittle and extensible
   patches diverge over time.
2. **NITR false-positive stat as headline**: "13.3% of passing patches carry hidden structural debt."
3. **Maintainability dimension heatmap**: showing dependency control (4.3%) and responsibility
   decomposition (15.2%) as the hardest architectural pressures.
4. **EvoScore formula and interpretation**: future-weighted mean as a clean visual.
5. **"Passing the test is table stakes. The real question is whether the next agent can change it again." -- headline slide.**
6. **Pattern table**: clear boundaries, stable interfaces, typed contracts, structural lints.

## References

- R09: SWE-CI, `paper-text/swe-ci-2603.03823.txt`
- R46: Needle in the Repo, `paper-text/needle-in-the-repo-2603.27745.txt`
- R08: FEA-Bench, `paper-text/fea-bench-2503.06680.txt`
- R05: Multi-SWE-bench, `paper-text/multi-swe-bench-2504.02605.txt`
- R06: SWE-bench Live, `paper-text/swe-bench-live-2505.23419.txt`
- R07: SWE-rebench, `paper-text/swe-rebench-2505.20411.txt`
- R59: Smells of LLM Generated Code, `paper-text/smells-llm-generated-code-2510.03029.txt`
- R61: The Modular Imperative, `paper-text/modular-imperative-lmpl-2025.pdf`
