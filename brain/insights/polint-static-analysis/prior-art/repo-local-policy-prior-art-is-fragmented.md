---
type: insight
title: "Repo-Local Policy Prior Art Is Fragmented"
slug: repo-local-policy-prior-art-is-fragmented
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - prior-art
  - developer-tools
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[custom-rules-prove-demand-but-are-engine-bound]]"
  - "[[static-analysis-is-a-layered-ecosystem]]"
  - "[[typed-rule-signatures-are-capability-contracts]]"
---

# Repo-Local Policy Prior Art Is Fragmented

There is a lot of prior art for executable local policy. The gap is not demand.
The gap is that each tool tends to bind policy to a language, a representation,
a query DSL, or a specific architectural problem.

## Claim

`polint` should be positioned as a repo-local policy framework that learns from
existing custom-rule ecosystems without pretending they do not exist.

The differentiator is not "you can write rules." ESLint, Semgrep, ArchUnit,
dependency-cruiser, CodeQL, Joern, and others already prove that. The
differentiator is the combination of:

- repo-owned rules;
- typed fact views;
- multi-language adapter model;
- agent-facing diagnostics;
- no bundled policy;
- local fixtures and inspectable rule metadata.

## Prior Art Map

| Tool family | Strength | Boundary |
| --- | --- | --- |
| ESLint / typescript-eslint | custom AST rules in JS/TS ecosystem | language and parser ecosystem bound |
| Semgrep | cross-language pattern and taint rules | YAML/DSL rule model, semantic depth varies by language |
| CodeQL | rich semantic/data-flow queries | query language and database extraction model |
| Joern | code property graph and vulnerability research | graph DSL and supported-language semantics |
| ArchUnit | executable Java architecture tests | JVM/class model |
| dependency-cruiser | JS/TS dependency boundary rules | import/dependency graph focus |
| OPA/Rego style policy | general policy as code | not codebase-semantic by default |

## Evidence

- ESLint official docs say custom rules are for cases where core rules do not
  cover a use case.
- typescript-eslint documents how custom ESLint rules work with TypeScript parser
  services.
- ArchUnit describes itself as a Java architecture test library for checking
  dependencies, layers, cycles, and other architecture rules.
- dependency-cruiser documents project dependency rules and validates rule sets
  against a schema.
- CodeQL official docs describe data-flow queries and path queries over a
  codebase database.
- Joern official docs describe the code property graph as a cross-language
  intermediate representation for mining code with a Scala-based DSL.
- `polint` README says it is not a replacement for ESLint, Biome, Ruff,
  golangci-lint, or formatters; it is the layer for rules that belong to the
  codebase (`.context/polint/README.md:14-15`).

## Implication For The Article

The article should not imply that `polint` invented custom static analysis. A
more credible framing:

> The industry already agrees that local policy belongs in executable checks.
> The missing piece I wanted was a small, repo-owned, agent-facing framework
> where the rules are ordinary code and the analyzer supplies typed facts.

That lets the article respect prior art while still explaining why `polint`
exists.

## Caveats

Some tools already overlap with parts of `polint`. Semgrep can cover many
cross-language pattern rules. CodeQL can cover sophisticated data-flow queries.
ArchUnit is excellent for Java architecture rules. The article should name the
tradeoff: `polint` is for teams that want policy code to live inside the repo
and fit an agent repair loop.

## Sources To Cite

- [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules)
- [typescript-eslint custom rules](https://typescript-eslint.io/developers/custom-rules/)
- [ArchUnit user guide](https://www.archunit.org/userguide/html/000_Index.html)
- [dependency-cruiser rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [CodeQL data flow analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [Joern code property graph](https://docs.joern.io/code-property-graph/)

## Next Test

Pick three example `polint` rules and write the closest equivalent in ESLint,
Semgrep, and dependency-cruiser. The comparison should show where `polint` is
simpler, where it is weaker, and where it is genuinely different.
