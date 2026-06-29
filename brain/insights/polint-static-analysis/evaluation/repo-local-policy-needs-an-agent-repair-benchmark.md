---
type: insight
title: "Repo-Local Policy Needs An Agent Repair Benchmark"
slug: repo-local-policy-needs-an-agent-repair-benchmark
created: 2026-06-29
status: working
publish: true
tags:
  - ai-agents
  - evaluation
  - static-analysis
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[static-analysis-feedback-loops-need-deterministic-tools]]"
  - "[[feedback-loops-need-iteration-budgets]]"
  - "[[effective-false-positives-are-the-adoption-bar]]"
---

# Repo-Local Policy Needs An Agent Repair Benchmark

The current research supports the direction, but it does not yet prove the exact
`polint` claim. The missing study is not another generic SAST benchmark. It is a
repo-local policy repair benchmark for coding agents.

## Claim

To make the article defensible, `polint` needs a benchmark that measures whether
agents repair local policy violations better with executable diagnostics than
with prose instructions alone.

The benchmark should evaluate the product thesis directly:

> Can a repo-local static-analysis rule make an AI coding agent do the right
> thing faster, with fewer regressions, and less review intervention?

## Why Existing Evidence Is Not Enough

The second research pass found useful adjacent evidence:

- static-analysis feedback can reduce LLM-generated code issues in a controlled
  PythonSecurityEval setting;
- feedback-driven repair success depends on feedback type;
- context files do not reliably improve coding-agent task success in the studied
  AGENTS.md settings;
- AI-only iterative improvement can increase critical vulnerabilities.

None of those directly measures:

- repo-local architecture policy;
- custom rules owned by the repository;
- agent repair from `polint` diagnostics;
- false-positive cascades in an agent loop;
- multi-language policy checks;
- review-time diff-gated policy.

That gap should become an article asset, not a hidden weakness.

## Benchmark Shape

Create a small suite of seeded repository tasks:

| Task family | Example violation | Expected repair |
| --- | --- | --- |
| design system | raw color literal | use token import |
| internal API | raw fetch to internal service | use generated client |
| security | user input reaches shell | add approved guard or API |
| migration | new code uses deprecated helper | use replacement helper |
| testing | missing regression assertion | add targeted test |
| architecture | feature imports another feature | route through boundary module |

Each task should have paired conditions:

- prose policy only;
- `AGENTS.md` policy only;
- review comment style instruction;
- `polint` diagnostic only;
- `polint` diagnostic plus prose policy.

## Metrics

Measure at least:

- task success;
- violation fixed;
- unrelated diff size;
- new lint/type/test failures;
- new security issue count where applicable;
- number of agent iterations;
- diagnostic-following accuracy;
- false-positive repair rate;
- time and token cost.

For graph and data-flow rules, also record:

- path status;
- unknown count;
- budget-exceeded count;
- model/setup-missing count;
- whether the agent treats incomplete analysis as "safe."

## Product Feedback

The benchmark should feed back into `polint` rule and diagnostic design. If an
agent repeatedly misrepairs a rule, the likely fix is not a bigger prompt. It may
be:

- better evidence;
- narrower spans;
- a clearer repair phrase;
- an example fixture;
- a rule split into two simpler checks;
- a lower default severity;
- a setup diagnostic instead of a policy diagnostic.

## Caveats

The benchmark should not be designed to flatter `polint`. Include cases where
prose is enough, where static analysis cannot know the answer, and where the
right response is to ask a human.

The article can still be written before the full benchmark exists, but it should
separate supported claims from proposed validation.

## Sources To Cite

- [Static Analysis as a Feedback Loop](https://arxiv.org/abs/2508.14419)
- [FeedbackEval](https://arxiv.org/abs/2504.06939)
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988)
- [Security Degradation in Iterative AI Code Generation](https://arxiv.org/abs/2506.11022)

## Next Test

Implement the first five benchmark tasks in a temporary fixture repo and run two
agents across the same randomized task order. The minimum publishable result is
not a leaderboard; it is a table showing where diagnostics changed behavior and
where they did not.
