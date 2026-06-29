---
type: insight
title: "Static Analysis For Agents Needs Policy Fixtures"
slug: static-analysis-for-agents-needs-policy-fixtures
created: 2026-06-29
status: working
publish: true
tags:
  - evaluation
  - ai-agents
  - static-analysis
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[repo-local-policy-needs-an-agent-repair-benchmark]]"
  - "[[models-need-diagnostics-not-self-diagnosis]]"
  - "[[effective-false-positives-are-the-adoption-bar]]"
---

# Static Analysis For Agents Needs Policy Fixtures

General coding benchmarks are not enough to prove the `polint` thesis. We need
small, controlled policy fixtures where the variable is the feedback medium.

## Claim

The next research step should be a `polint` policy-fixture benchmark:

- same repo;
- same seeded violation;
- same agent;
- different feedback channel.

This directly tests whether executable repo-local diagnostics improve agent
behavior compared with prose instructions.

## Evidence

- SWE-bench evaluates language models on real GitHub issues and pull requests,
  but it is a broad software-engineering benchmark, not a repo-local policy
  feedback benchmark.
- SWE-bench Verified is a human-validated subset of 500 SWE-bench instances for
  more reliable coding-agent evaluation.
- Defects4J provides reproducible real bugs and infrastructure for Java software
  engineering research.
- NIST's Juliet suite provides synthetic test cases with known flaws for
  evaluating static analyzers and software assurance tools.
- None of these directly measures whether an AI coding agent follows a
  repo-local policy better after a tool diagnostic than after prose context.

## Fixture Design

Each fixture should contain:

- a repo-local policy;
- one seeded violation;
- one expected repair;
- at least one tempting bad repair;
- tests or assertions for behavior;
- a `polint` rule fixture;
- a prose-only instruction variant;
- a review-comment variant;
- an agent-run transcript.

Example fixture:

| Field | Value |
| --- | --- |
| policy | Frontend code must call generated API client, not raw `fetch` |
| seeded violation | new component calls `/api/customer` directly |
| expected repair | import and call `customerClient.getCustomer` |
| bad repair | wrap raw `fetch` in another helper |
| measurement | diagnostic fixed, tests pass, no raw fetch remains |

## Metrics

Track:

- policy violation fixed;
- behavioral tests passed;
- unrelated diff lines;
- new warnings introduced;
- number of agent attempts;
- whether repair touched the diagnostic span;
- whether the agent used a suppression;
- whether the agent created a workaround.

For security fixtures, add:

- new vulnerability count;
- sink/source path still present;
- guard/sanitizer semantics preserved.

## Article Implication

The article can say:

> I do not need a benchmark that proves `polint` solves software engineering. I
> need one that proves a narrower claim: agents repair local policy better when
> the policy is executable and diagnostic-shaped.

That is more defensible and easier to run.

## Caveats

Tiny fixtures can overfit. The benchmark should include at least one case where
the right result is "do not auto-repair; ask for a human decision."

## Sources To Cite

- [SWE-bench](https://www.swebench.com/original.html)
- [SWE-bench Verified](https://www.swebench.com/verified.html)
- [Defects4J](https://github.com/rjust/defects4j)
- [NIST Juliet Test Suite](https://www.nist.gov/publications/juliet-11-cc-and-java-test-suite)

## Next Test

Build five fixtures:

- raw API call;
- raw design token;
- secret logged;
- missing migration guard;
- user-controlled shell command.

Run each under prose-only, `AGENTS.md`, review-comment, and `polint diagnostic`
conditions.
