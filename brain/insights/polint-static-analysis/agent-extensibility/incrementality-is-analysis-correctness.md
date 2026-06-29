---
type: insight
title: "Incrementality Is Analysis Correctness"
slug: incrementality-is-analysis-correctness
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - ai-agents
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[agent-extensible-analysis-needs-artifacts]]"
  - "[[static-analysis-engines-are-fact-pipelines]]"
---

# Incrementality Is Analysis Correctness

Caching and incrementality sound like performance work. In an
agent-extensible analyzer, they are also correctness work. If stale facts leak
through, the tool gives the agent wrong instructions.

## Claim

Incrementality is part of the trust model. A cached analysis result is valid
only if every relevant input is still the same: source code, config, rule code,
models, provider versions, extension inputs, toolchain inputs, schema versions,
and upstream facts.

## Mechanism

AI-agent workflows produce frequent small edits. The analyzer has two competing
requirements:

- fast enough to run in the repair loop;
- strict enough to invalidate stale facts when policy inputs change.

This means cache keys cannot be just file path plus content hash. They need to
cover rule options, capability plans, model inputs, provider versions, and
semantic dependencies.

## Evidence

- `polint` says analysis cache keys include source path and content,
  rule/options digest, loaded config, requested capability plan, cache format,
  and `polint` version (`.context/polint/README.md:175-180`).
- Semantic MIR output digests include provider ID/version/schema, config digest,
  topology and symbol graph digests, language lifecycle inputs, model inputs,
  extension inputs, tool inputs, upstream syntax digests, and normalized output
  facts (`.context/polint/crates/polint/src/analysis/provider.rs`).
- The local incremental-query research argues that incrementality must be a
  semantic contract, not just a key-value cache
  (`.context/polint/research/incremental-query-engine/FINAL-REPORT.md`).

## Caveats

This should not become the main article plot. It is a sidebar or deep technical
section.

The current implementation should be checked against the published crate before
making release-specific claims.

## Implication

Use one concrete example:

> A data-flow result is invalid if the source file is unchanged but the model
> that marks `ctx.user.email` as PII changed.

That explains why cache correctness matters more clearly than discussing
incremental query engines in the abstract.

## Next test

Create one cache invalidation table:

| Changed input | Should invalidate |
| --- | --- |
| source file | syntax, symbols, calls, data-flow, rules using the file |
| rule code | diagnostics from that rule |
| source/sink model | data-flow queries using that model |
| provider version | facts from that provider |
| module resolution config | imports, symbols, calls, downstream rules |
