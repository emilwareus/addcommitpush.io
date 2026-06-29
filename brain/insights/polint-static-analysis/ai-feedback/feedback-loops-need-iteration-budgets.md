---
type: insight
title: "Feedback Loops Need Iteration Budgets"
slug: feedback-loops-need-iteration-budgets
created: 2026-06-29
status: working
publish: true
tags:
  - ai-agents
  - feedback-loops
  - static-analysis
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[static-analysis-feedback-loops-need-deterministic-tools]]"
  - "[[data-flow-policy-needs-paths-budgets-and-models]]"
  - "[[repo-local-policy-needs-an-agent-repair-benchmark]]"
---

# Feedback Loops Need Iteration Budgets

An agent repair loop is a control system. Without an iteration budget, the system
can spend compute chasing low-value warnings, or worse, keep changing code until
it creates a new defect.

## Claim

Static-analysis feedback loops should have explicit budgets:

- maximum repair attempts;
- maximum diagnostic count per attempt;
- maximum path depth for graph findings;
- maximum issue classes to repair per loop;
- stop conditions for repeated or oscillating diagnostics.

The loop should report "budget exhausted" as a meaningful result, not silently
pretend the code is clean.

## Evidence

- FeedbackEval reports that iterative feedback improves repair performance, but
  the marginal benefit diminishes after two or three rounds.
- The security-degradation paper reports a 37.6% increase in critical
  vulnerabilities after five AI refinement iterations without human
  intervention.
- `polint` already models `BudgetExceeded` in data-flow status
  (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:132-140`).
- `polint` data-flow budgets distinguish node limit, edge limit, path depth, and
  path count (`.context/polint/crates/polint/src/analysis/data_flow/facts.rs:186-192`).
- `policy_queries.rs` treats found paths, unknown paths, budget-exceeded paths,
  and not-found paths as distinct states in the query loop
  (`.context/polint/crates/polint/src/policy_queries.rs:84-132`).

## Mechanism

Budgets protect two separate loops:

1. analysis search;
2. agent repair.

Analysis search budgets prevent graph work from becoming unbounded. Agent repair
budgets prevent a model from treating every rerun as permission to rewrite more
of the system.

Those loops should be connected. If analysis returns budget exceeded, the agent
should not infer "safe." It should receive a diagnostic that says the result is
incomplete and explains which limit was hit.

## Product Shape

A good `polint` repair loop could expose:

```text
rule_id: local/no-raw-colors
status: found
attempt: 1/3
repair_scope: src/Button.tsx:18
stop_after: diagnostic gone or attempt budget exhausted
```

For graph analysis:

```text
rule_id: local/user-input-to-shell
status: budget_exceeded
limit: path_depth=40
observed: path_depth=40
meaning: analysis did not prove absence of flow
```

## Implication For The Article

Use budgets as a credibility marker. The point is not that `polint` can prove
arbitrary repo policy. The point is that it can run bounded, repeatable checks
and communicate the boundary.

The article phrase:

> A bounded diagnostic is more useful than an unbounded promise.

## Caveats

The "two or three iterations" finding comes from FeedbackEval's benchmark
setting. It should inform default budgets, not become a universal law.

Some migration rules may need more attempts because the repair is mechanical but
large. In those cases, the budget should shift from "agent attempts" to "changed
files" or "diagnostics fixed per patch."

## Sources To Cite

- [FeedbackEval](https://arxiv.org/abs/2504.06939)
- [Security Degradation in Iterative AI Code Generation](https://arxiv.org/abs/2506.11022)
- [Static Analysis as a Feedback Loop](https://arxiv.org/abs/2508.14419)

## Next Test

Run one `polint` rule in a controlled agent loop with repair budgets of 1, 2, 3,
5, and 10 attempts. Track success, diff size, new lint failures, and whether the
agent starts editing outside the diagnostic span as the budget increases.
