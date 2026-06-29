---
type: insight
title: "Custom Rules Prove Demand, But Are Engine-Bound"
slug: custom-rules-prove-demand-but-are-engine-bound
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
  - "[[static-analysis-is-a-layered-ecosystem]]"
  - "[[custom-lint-rules-are-executable-architecture]]"
---

# Custom Rules Prove Demand, But Are Engine-Bound

The custom-rule ecosystem is prior art, not competition to ignore. ESLint,
Semgrep, CodeQL, Joern, ast-grep, OPA/Rego, and Sonar-style systems all prove
that teams need to encode local policy. The gap is that most custom rules are
bound to one language, one query model, one runtime, or one representation.

## Claim

`polint` should acknowledge that custom rule authoring is already mainstream.
Its differentiated bet is repo-owned Rust policy over typed, multi-language
facts, with agent-friendly inspection and diagnostics.

## Mechanism

Most custom-rule systems optimize for one of four shapes:

| Tool family | Authoring shape | Strong fit | Boundary |
| --- | --- | --- | --- |
| ESLint | JavaScript visitor rules | JS/TS AST policy | language-bound |
| Semgrep | YAML patterns and taint rules | fast custom guardrails | pattern language boundary |
| CodeQL | semantic query language | rich data-flow and path queries | specialized query expertise |
| Joern | graph traversal DSL | code property graph exploration | graph and DSL expertise |
| ast-grep | AST structural search/rewrite | syntactic rewrites and lint | parser and pattern boundary |
| `polint` | Rust rules over typed facts | repo-owned policy code | higher authoring cost |

The tradeoff is not "YAML bad, code good." YAML is excellent when a rule is a
pattern. Code becomes useful when the rule needs local state, exceptions, typed
facts, custom evidence, or nontrivial repair guidance.

## Evidence

- ESLint custom rules expose metadata and a `create(context)` visitor API.
- Semgrep taint mode exposes source, sink, sanitizer, and propagator
  vocabulary.
- CodeQL path queries require a source/sink configuration and path graph imports
  for path explanations.
- Joern exposes a code property graph with overlays for richer program
  relationships.
- `polint` rules are plain Rust functions over typed fact views
  (`.context/polint/README.md:114-126`).
- `#[polint::rule]` maps typed view parameters to capabilities such as imports,
  resolved imports, symbols, references, events, calls, control flow, data flow,
  metrics, literals, JSX attributes, and changed files
  (`.context/polint/crates/polint-macros/src/lib.rs:354-378`).

## Caveats

Rust rule authoring is powerful but less accessible than YAML. `polint` needs
scaffolds, examples, fixtures, and agent-oriented `inspect` output to keep that
power usable.

The article should not imply that a code-based rule engine is always better.
Many organization rules are simple enough for Semgrep, ESLint, or ast-grep.

## Implication

The article can frame `polint` as an escape hatch for policy that is too local
or too semantic for generic linters:

> I did not want another YAML pattern language. I wanted repo-local policy code
> over stable facts.

## Next test

Choose five representative repo policies and classify the simplest workable
tool:

- raw color strings in JSX;
- raw API calls instead of generated SDK;
- mutating routes require CSRF guard;
- request data cannot reach shell execution;
- new persistence model requires index review.

Use the result to keep the article honest about where `polint` belongs.
