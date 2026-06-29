---
type: insight
title: "Agent-Extensible Analysis Needs Artifacts"
slug: agent-extensible-analysis-needs-artifacts
created: 2026-06-29
status: working
publish: true
tags:
  - ai-agents
  - static-analysis
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[repo-local-policy-is-executable-memory]]"
  - "[[unknowns-are-static-analysis-product-data]]"
---

# Agent-Extensible Analysis Needs Artifacts

The important agent loop is not "ask the model to write a rule." It is "inspect
facts and unknowns, classify the gap, create the right artifact, test it, and
accept it only if the evidence improves."

## Claim

Agents should author analysis artifacts, not only prose and rules.

The right artifact might be:

- a rule;
- a source/sink model;
- a sanitizer/barrier model;
- a summary;
- a framework model;
- a provider extension;
- a fixture;
- an eval case.

## Mechanism

If an agent writes a large rule to compensate for missing framework semantics,
the rule becomes brittle. If the agent instead adds a framework model and a
fixture, multiple rules can reuse the same new fact.

Artifact choice is the control point:

| Need | Artifact |
| --- | --- |
| Emit a diagnostic from existing facts | Rule |
| Teach sources, sinks, sanitizers, or barriers | Model |
| Reuse API behavior across rules | Summary |
| Teach route, DI, or callback semantics | Framework/repo model |
| Add new extraction logic | Provider extension |
| Prove behavior and prevent regression | Fixture/eval |

## Evidence

- Local agent rule-authoring research recommends typed Rust rules, declarative
  model packs, process-isolated provider extensions, summary domains, fixture
  harnesses, and inspect/explain/diff tools
  (`.context/polint/research/agent-rule-authoring/FINAL-REPORT.md`).
- `polint` exposes agent-oriented JSON surfaces: `polint inspect rule`,
  `polint facts list`, `polint unknowns`, and `polint explain`
  (`.context/polint/README.md:97-100`).
- `DataFlowModelFact` carries model kind, provider ID, model ID, status,
  precision, validation, confidence, provenance, evidence, and stable key
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:51-67`).
- Call facts include `FrameworkModel` and `RepoModel` algorithms
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:142-147`).

## Caveats

Some model-pack and provider-extension ideas are preview or future-facing. The
article should mark them as design direction unless writing against a release
where those surfaces are stable.

Agent-generated analysis artifacts need review. A bad model can create false
confidence across many rules.

## Implication

The article can include a section with this title:

> The rule is sometimes the wrong artifact.

That line explains why `polint` needs facts, models, provenance, and fixtures,
not only custom lint functions.

## Next test

Build one end-to-end agent workflow:

1. run a rule;
2. see unknown framework dispatch;
3. inspect facts;
4. add a small repo model;
5. add fixture;
6. rerun;
7. compare diagnostic evidence before and after.
