---
type: insight
title: "Data-Flow Solver Choice Is A Product Boundary"
slug: data-flow-solver-choice-is-a-product-boundary
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - data-flow
  - engine-design
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[data-flow-engines-need-representations-before-solvers]]"
  - "[[data-flow-policy-needs-paths-budgets-and-models]]"
  - "[[production-data-flow-claims-need-tool-doc-crosschecks]]"
---

# Data-Flow Solver Choice Is A Product Boundary

The article should not make data-flow sound like a single feature. "We have data
flow" can mean local def-use links, sparse value-flow, IFDS/IDE, taint tracking,
summary-based interprocedural flow, or a query over imported facts.

## Claim

`polint` should expose data-flow as policy queries and facts, not as a public
commitment to one solver family. The solver is an implementation boundary. The
public contract is the result shape: path, status, precision, evidence,
provenance, model, and budget.

## Evidence

- IFDS/IDE literature frames many interprocedural data-flow problems as
  distributive flow functions over finite domains, but practical IFDS extensions
  are needed for non-bit-vector problems such as alias-set and multi-object
  typestate analysis.
- SVF builds sparse value-flow over interprocedural Memory SSA and allows
  iterative refinement between value-flow and pointer analysis.
- CodeQL exposes local/global data flow and taint tracking through query
  libraries, and path queries visualize flow paths in code scanning and VS Code.
- Semgrep taint mode exposes sources, propagators, sanitizers, and sinks in a
  rule-oriented YAML surface.
- Joern stores code property graphs and lets users add custom data-flow
  semantics where explicit argument-to-argument flows are declared and missing
  flows are treated as killed.
- `polint` data-flow facts already model algorithm, status, precision,
  validation, confidence, provenance, model, budget, evidence, and stable keys
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:29-77`).

## Mechanism

A solver answers an internal question:

> How do we search or compute flow facts efficiently enough for this program?

A policy query answers a product question:

> Under this model and budget, can source S reach sink T without barrier B?

Those should remain separate. If the public API exposes "IFDS" too early, the
product inherits the solver's limits as user-visible semantics. If the public
API exposes `FlowQuery`, `PathStatus`, `Precision`, and `Evidence`, the engine
can evolve from simple local flow to richer interprocedural flow without
rewriting rule authors' mental model.

## Product Boundary

Public rule authors should ask:

```text
flow.from(source).to(sink).unless(barrier).within_budget(...)
```

The engine should decide whether that query uses:

- local MIR edges;
- summaries;
- call graph edges;
- imported framework models;
- sparse value-flow;
- an IFDS-style reachability solver;
- a future external engine.

The returned result must explain what happened.

## Implication For The Article

The data-flow section should be written as engine design, not algorithm fandom:

> Pick the public evidence model before you pick the solver.

That is the through-line from IFDS, SVF, CodeQL, Semgrep, Joern, and `polint`.

## Caveats

The second research pass did not admit official CodeQL/Semgrep/Joern docs into
the data-flow report, so those claims should be supported directly from official
docs in the article. The IFDS/SVF claims are better supported by the evidence
register.

## Sources To Cite

- [Practical Extensions to the IFDS Algorithm](https://link.springer.com/chapter/10.1007/978-3-642-11970-5_8)
- [SVF: Interprocedural Static Value-Flow Analysis in LLVM](https://yuleisui.github.io/publications/cc16.pdf)
- [CodeQL data flow analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [CodeQL path queries](https://codeql.github.com/docs/writing-codeql-queries/creating-path-queries/)
- [Semgrep taint mode](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)
- [Joern custom data-flow semantics](https://docs.joern.io/dataflow-semantics/)

## Next Test

Write one data-flow policy example and express it three ways:

- `polint` policy-query pseudocode;
- Semgrep taint YAML;
- CodeQL query sketch.

The comparison should reveal which parts are policy semantics and which parts
are engine-specific machinery.
