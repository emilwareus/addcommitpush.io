---
type: insight
title: "Data-Flow Policy Needs Paths, Budgets, And Models"
slug: data-flow-policy-needs-paths-budgets-and-models
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
  - "[[data-flow-engines-need-representations-before-solvers]]"
  - "[[unknowns-are-static-analysis-product-data]]"
---

# Data-Flow Policy Needs Paths, Budgets, And Models

For repo-local policy, a data-flow finding without path evidence is hard to
trust. A data-flow engine without budgets is hard to run in CI. A data-flow
engine without source, sink, sanitizer, and barrier models is too generic to
understand the repo.

## Claim

The public data-flow API should expose bounded policy queries, not raw graph
traversal.

The result should distinguish:

- found path;
- no path under the current model;
- unknown;
- setup missing;
- budget exceeded.

## Mechanism

Policy authors usually do not want to traverse arbitrary graph nodes. They want
to ask:

> Can data matching source S reach sink T unless it passes through barrier B?

That query needs:

- source definitions;
- sink definitions;
- propagators;
- sanitizers;
- barriers;
- summaries;
- path evidence;
- precision and confidence labels;
- budget state.

This is the convergent vocabulary across Semgrep, CodeQL, Pysa-style systems,
and `polint`'s own policy-query direction.

## Evidence

- CodeQL path queries are for visualizing information flow through a codebase
  and require source, sink, and data-flow step definitions.
- Semgrep taint mode exposes sources, sinks, sanitizers, propagators, and taint
  traces.
- `polint` data-flow status includes `BudgetExceeded`; precision includes
  `Exact`, `SetupAware`, `Syntax`, `Conservative`, `Heuristic`, and `Unknown`;
  provenance includes native, summary, extension, model, and query
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:132-175`).
- `policy_queries.rs` models found, unknown, and budget-exceeded data-flow paths
  as possible results, not just found paths
  (`.context/polint/crates/polint/src/policy_queries.rs:46-132`).
- `DataFlowModelFact` stores model kind, provider ID, model ID, status,
  precision, validation, confidence, provenance, evidence, and stable key
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:51-67`).

## Caveats

Path evidence can overwhelm the reader. The diagnostic should show the shortest
useful path, with inspect commands for the rest.

Budgets are not just performance knobs. A budget-exceeded result is not a safe
"no issue." It is an incomplete analysis result.

## Implication

The article should use the phrase "bounded proof, not omniscience." That keeps
the data-flow section credible and product-focused.

## Next test

Draft one diagnostic for each result state:

- found;
- not found;
- unknown due to unresolved call;
- setup missing due to missing model;
- budget exceeded.

Use the same source/sink query so the distinction is visible.
