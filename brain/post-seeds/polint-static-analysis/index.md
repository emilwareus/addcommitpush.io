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
- [[call-graphs-are-approximation-families]]
- [[custom-rules-prove-demand-but-are-engine-bound]]
- [[data-flow-engines-need-representations-before-solvers]]
- [[data-flow-policy-needs-paths-budgets-and-models]]
- [[incrementality-is-analysis-correctness]]
- [[repo-local-policy-is-executable-memory]]
- [[static-analysis-engines-are-fact-pipelines]]
- [[static-analysis-is-a-layered-ecosystem]]
- [[typed-rule-signatures-are-capability-contracts]]
- [[unknowns-are-static-analysis-product-data]]

## Raw synthesis

The long-form research synthesis lives in
`thoughts/shared/research/2026-06-29_static-analysis-polint-insights.md`.

The raw `dr` reports live in `.context/dr/polint-static-analysis/`.

The local `polint` repository snapshot used for this pass lives in
`.context/polint/`.
