---
type: insight
title: "Production Data-Flow Claims Need Tool Doc Crosschecks"
slug: production-data-flow-claims-need-tool-doc-crosschecks
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - data-flow
  - research
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[data-flow-solver-choice-is-a-product-boundary]]"
  - "[[data-flow-policy-needs-paths-budgets-and-models]]"
  - "[[call-graph-claims-need-algorithm-provenance]]"
---

# Production Data-Flow Claims Need Tool Doc Crosschecks

The data-flow research run produced a useful warning: algorithm papers alone do
not describe production analyzer ergonomics. For article-grade claims about
CodeQL, Semgrep, Pysa, or Joern, direct documentation is necessary.

## Claim

Do not use IFDS/SVF papers as stand-ins for production tool behavior. The
article needs separate source trails for:

- algorithmic foundations;
- public rule/query API;
- path evidence;
- model definitions;
- budget and timeout behavior;
- unknown or incomplete result reporting;
- validation methodology.

## Evidence From The Research Gap

The follow-up data-flow report admitted sources for IFDS/IDE and SVF, but did
not admit sources for:

- CodeQL data-flow/path queries;
- Semgrep or Pysa taint mode;
- Joern code property graph queries;
- source/sink/sanitizer/barrier model definitions;
- budgets and timeouts;
- unknown or incomplete flow reporting;
- production precision/recall validation.

That does not mean those tools lack the features. It means the report cannot be
used as evidence for them.

## What Direct Docs Say

Direct documentation fills some gaps:

- CodeQL documents local and global data flow, taint tracking, sources/sinks,
  barriers, and path queries.
- Semgrep taint mode documents `pattern-sources`, `pattern-propagators`,
  `pattern-sanitizers`, and `pattern-sinks`.
- Joern documents the code property graph and custom data-flow semantics, where
  explicit flows can be declared and missing flows are assumed killed.
- Go's `x/tools/go/callgraph/rta` docs describe RTA for Go and explicitly note
  that the discovered call graph does not include reflection edges in the source
  code docs.

## Research Discipline

For each article paragraph about a production tool, tag the source type:

| Claim type | Acceptable source |
| --- | --- |
| algorithm definition | primary paper or official docs |
| public API | official docs |
| empirical result | benchmark or paper with methodology |
| current behavior | official docs or current source |
| limitation | official docs, source comments, issue, or paper |

This prevents a subtle failure mode: using a paper about one solver to imply a
product feature in a tool that uses a different implementation.

## Implication For The Article

The article can still explain IFDS, SVF, CodeQL, Semgrep, and Joern, but it
should keep the categories separate:

- "classic solver families";
- "production query interfaces";
- "repo-local product design."

`polint` belongs in the third category. It can borrow vocabulary from the first
two without claiming to have the same depth today.

## Caveats

Some official docs are high-level and not enough for precision or false-negative
claims. For those, use language like "exposes" or "models," not "proves" or
"guarantees."

## Sources To Cite

- [CodeQL data flow analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [CodeQL path queries](https://codeql.github.com/docs/writing-codeql-queries/creating-path-queries/)
- [Semgrep taint mode](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)
- [Joern code property graph](https://docs.joern.io/code-property-graph/)
- [Joern custom data-flow semantics](https://docs.joern.io/dataflow-semantics/)
- [Go RTA package docs](https://pkg.go.dev/golang.org/x/tools/go/callgraph/rta)

## Next Test

Before writing the final article, create a source matrix with one row per claim
and these columns: claim, source URL, source type, confidence, and wording limit.
Anything without a primary or official source should be marked as conjecture or
removed.
