---
type: insight
title: "Language-Agnostic Analysis Is A Fact Contract"
slug: language-agnostic-analysis-is-a-fact-contract
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - language-agnostic
  - engine-design
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[static-analysis-engines-are-fact-pipelines]]"
  - "[[typed-rule-signatures-are-capability-contracts]]"
  - "[[production-data-flow-claims-need-tool-doc-crosschecks]]"
---

# Language-Agnostic Analysis Is A Fact Contract

"Language agnostic" is easy to overclaim. The defensible version is not "the
same static analysis works equally in every language." It is "the engine exposes
a stable fact contract, and each language adapter earns its precision."

## Claim

`polint` should define language-agnostic behavior at the fact and diagnostic
layer, not at the parser or semantic-analysis layer.

Different languages need different adapters. The shared product contract is:

- stable file/function/symbol IDs;
- typed fact views;
- capability declarations;
- precision/status/provenance labels;
- diagnostics and evidence;
- tests for adapter behavior.

## Evidence

- Tree-sitter describes itself as a parser generator and incremental parsing
  library that builds concrete syntax trees and efficiently updates them.
- Oxc documents a high-performance Rust JavaScript/TypeScript parser with its
  own AST, including specific identifier node distinctions rather than generic
  ESTree identifiers.
- SCIP describes itself as a language-agnostic protocol for indexing source code
  for code navigation such as go-to-definition and find-references.
- Semgrep generic mode docs explicitly warn that generic matching does not
  understand the syntax of unsupported languages, and result quality can vary by
  language and code shape.
- `polint` currently uses Go and TypeScript/JavaScript adapters and says more
  languages can be added through the adapter contract
  (`.context/polint/AGENTS.md:4-8`).
- `polint` rule functions request typed fact views such as `StringLiterals<'_>`,
  `Imports<'_>`, and `GoTests<'_>`, and capabilities are derived from those
  signatures (`.context/polint/README.md:114-126`).

## Mechanism

There are three layers:

| Layer | Language-specific? | Example |
| --- | --- | --- |
| parsing | yes | tree-sitter-go, Oxc TS/JS parser |
| semantic facts | partly | imports, symbols, references, tests, calls |
| policy surface | should be stable | typed views, diagnostics, evidence |

The more semantic the fact, the more adapter-specific work it requires. A string
literal fact is relatively portable. A symbol reference, framework entrypoint,
or data-flow summary is not.

## Article Implication

Use a precise line:

> `polint` is language-agnostic at the policy layer, not magically language
> omniscient underneath it.

That line prevents a technical reader from dismissing the article as hand-wavy.

## Caveats

The article should not imply that adding a parser equals adding useful semantic
analysis. Parser support is the first step. Useful repo-local policy usually
needs imports, symbols, framework conventions, test facts, and unknown reporting.

## Sources To Cite

- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [Oxc parser architecture](https://oxc.rs/docs/learn/architecture/parser)
- [SCIP Code Intelligence Protocol](https://github.com/scip-code/scip)
- [Semgrep generic pattern matching](https://docs.semgrep.dev/writing-rules/generic-pattern-matching)

## Next Test

Pick one policy and classify its fact requirements:

- syntax-only;
- import-aware;
- symbol-aware;
- call-graph-aware;
- data-flow-aware;
- framework-model-aware.

That classification can become the article's "how hard is this rule?" table.
