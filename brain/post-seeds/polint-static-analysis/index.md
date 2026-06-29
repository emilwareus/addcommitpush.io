---
type: post-seed
title: "Static Analysis For AI Agents"
slug: polint-static-analysis
created: 2026-06-29
status: collecting
publish: true
tags:
  - static-analysis
  - ai-agents
  - polint
---

# Static Analysis For AI Agents

This seed collects insight notes for a future article on why I built `polint`: a
repo-local, language-agnostic linter framework with no bundled policy rules.

The working thesis: prompts and `AGENTS.md` files are useful orientation, but
the statically checkable parts of repository policy should become executable
feedback. `polint` is the layer that turns local architecture rules, security
guardrails, migration rules, and agent repair instructions into small rules over
typed facts.

## Linked insights

- [[agent-extensible-analysis-needs-artifacts]]
- [[agent-feedback-needs-standard-diagnostic-formats]]
- [[call-graph-claims-need-algorithm-provenance]]
- [[call-graphs-are-approximation-families]]
- [[custom-rules-prove-demand-but-are-engine-bound]]
- [[data-flow-engines-need-representations-before-solvers]]
- [[data-flow-policy-needs-paths-budgets-and-models]]
- [[data-flow-solver-choice-is-a-product-boundary]]
- [[effective-false-positives-are-the-adoption-bar]]
- [[feedback-loops-need-iteration-budgets]]
- [[incrementality-is-analysis-correctness]]
- [[language-agnostic-analysis-is-a-fact-contract]]
- [[models-need-diagnostics-not-self-diagnosis]]
- [[production-data-flow-claims-need-tool-doc-crosschecks]]
- [[repo-local-policy-needs-an-agent-repair-benchmark]]
- [[repo-local-policy-is-executable-memory]]
- [[repo-local-rules-need-a-trust-boundary]]
- [[static-analysis-engines-are-fact-pipelines]]
- [[static-analysis-is-a-layered-ecosystem]]
- [[static-analysis-feedback-loops-need-deterministic-tools]]
- [[static-analysis-for-agents-needs-policy-fixtures]]
- [[the-next-article-move-is-a-measured-case-study]]
- [[typed-rule-signatures-are-capability-contracts]]
- [[unknowns-are-static-analysis-product-data]]

## Raw synthesis

The long-form research synthesis lives in
`thoughts/shared/research/2026-06-29_static-analysis-polint-insights.md`.

The raw `dr` reports live in `.context/dr/polint-static-analysis/`.

The second follow-up `dr` reports live in
`.context/dr/polint-static-analysis-followup/`.

The local `polint` repository snapshot used for this pass lives in
`.context/polint/`.
