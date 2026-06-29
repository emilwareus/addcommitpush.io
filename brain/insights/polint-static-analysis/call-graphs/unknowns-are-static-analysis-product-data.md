---
type: insight
title: "Unknowns Are Static Analysis Product Data"
slug: unknowns-are-static-analysis-product-data
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - call-graphs
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[call-graphs-are-approximation-families]]"
  - "[[data-flow-policy-needs-paths-budgets-and-models]]"
---

# Unknowns Are Static Analysis Product Data

A static analyzer that silently drops unknown calls or truncated flows hides
false-negative risk. For repo-local policy, unknowns should be facts the rule
author can inspect and the agent can act on.

## Claim

Unknown, unsupported, ambiguous, setup-missing, and budget-exceeded states are
not implementation details. They are product data.

## Mechanism

Repo-local policy often needs to decide what to do when analysis cannot prove a
relationship.

Examples:

- A security rule may fail closed when request data might reach a sink.
- A migration rule may warn only on confirmed direct calls.
- A review rule may ask for human review if framework routing is unresolved.
- An agent repair loop may generate a model when a route registration pattern is
  missing.

That requires unknowns to be queryable. A boolean "found/not found" API is too
small.

## Evidence

- `CallTargetStatus` includes `Resolved`, `Ambiguous`, `Unresolved`,
  `Unsupported`, `SetupMissing`, `BudgetExceeded`, and `Rejected`
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:150-158`).
- `UnresolvedCallReason` includes function values, dynamic properties,
  interface dispatch, `eval`, `call/apply/bind`, framework dispatch,
  reflection, goroutine boundaries, dynamic imports, proxies/accessors, missing
  references, missing import resolution, setup missing, unsupported syntax,
  budget exceeded, and unknown callees
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:161-175`).
- `analysis_plan.rs` reserves raw `cfg`, `call_graph`, and `coverage_facts` as
  unsupported raw capabilities while exposing policy-level `events`, `calls`,
  `control_flow`, and `dataflow` preview surfaces
  (`.context/polint/crates/polint/src/analysis_plan.rs:700-729`).
- `policy_queries.rs` treats found, unknown, and budget-exceeded data-flow paths
  as different policy results
  (`.context/polint/crates/polint/src/policy_queries.rs:46-132`).

## Caveats

Unknowns can become noise. They need to be scoped by rule, file, capability, and
precision tier.

The UI should not print the entire internal uncertainty graph by default. It
should show the smallest useful explanation and provide inspect commands for
deeper debugging.

## Implication

The article can make this point concrete:

```text
local/no-raw-admin-reachable could not prove reachability through 3 framework
dispatch sites. Add a repo route model or lower the rule to direct calls only.
```

That is better than silently passing.

## Next test

Design one `polint unknowns --rule <id>` output example for the article. It
should show:

- capability;
- file/span;
- unresolved reason;
- affected rule;
- suggested next artifact: rule change, model, fixture, or setup command.
