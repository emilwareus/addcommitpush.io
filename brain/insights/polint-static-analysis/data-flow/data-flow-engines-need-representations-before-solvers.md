---
type: insight
title: "Data-Flow Engines Need Representations Before Solvers"
slug: data-flow-engines-need-representations-before-solvers
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - data-flow
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[static-analysis-engines-are-fact-pipelines]]"
  - "[[data-flow-policy-needs-paths-budgets-and-models]]"
---

# Data-Flow Engines Need Representations Before Solvers

It is tempting to describe data-flow analysis by naming IFDS, IDE, lattices, and
worklist solvers. Those matter. But the product problem starts earlier: what is
the representation, what are the places, and what facts can a rule safely query?

## Claim

A useful data-flow engine should be representation-first, not solver-first.

The build order is:

```text
parse -> stable IDs -> normalized IR/MIR -> places -> CFG
      -> local def-use/value edges -> call facts -> summaries
      -> source/sink/barrier models -> bounded path queries -> diagnostics
```

IFDS/IDE can be internal solvers for the right finite distributive subproblems.
They should not be the first public abstraction.

## Mechanism

Data flow depends on a semantic graph, not just syntax. The engine needs:

- stable identities for files, functions, symbols, and expressions;
- a normalized representation for operations;
- local control-flow structure;
- places or access paths;
- local value-flow edges;
- call-site and return edges;
- summaries for functions and libraries;
- source, sink, sanitizer, and barrier models;
- query budgets and path evidence.

Without these layers, a solver only computes over unstable or underspecified
inputs.

## Evidence

- CodeQL says data-flow graphs model semantic runtime value flow rather than AST
  structure.
- CodeQL distinguishes local data flow from global data flow and notes global
  flow is more expensive.
- CodeQL lists practical challenges such as unavailable standard-library source,
  runtime behavior, aliasing, and large data-flow graphs.
- The `dr` data-flow report scored 3/5 and supports IFDS/IDE and sparse
  value-flow as medium-confidence background. It cites IFDS/IDE finite
  distributive domains and SVF's sparse memory-SSA approach.
- `polint` data-flow facts encode nodes, edges, models, budgets, edge kind,
  algorithm, status, precision, validation, confidence, provenance, evidence,
  and input stable keys
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:10-77`).
- Edge kinds include local value edges, call-boundary edges, summaries,
  unknown/havoc, budget truncation, sources, sinks, sanitizers, barriers, and
  models (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:95-121`).

## Caveats

This insight is partly architectural. It should be phrased as how a robust
engine should be built, not as a claim that every layer is stable public
`polint` API today.

IFDS/IDE should not be dismissed. The point is sequencing: representation first,
solver second, product API third.

## Implication

The article should explain data flow as an engineering stack:

1. representation;
2. local edges;
3. interprocedural summaries;
4. models;
5. query;
6. evidence.

That will be clearer than starting with theory.

## Next test

Build a toy example:

```text
request.query.cmd -> validateCommand(...) -> exec(...)
```

Then show the minimum facts needed to classify it:

- source;
- value edge;
- sanitizer/barrier;
- sink;
- path status.
