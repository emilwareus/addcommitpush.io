---
type: insight
title: "Effective False Positives Are The Adoption Bar"
slug: effective-false-positives-are-the-adoption-bar
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - diagnostics
  - developer-tools
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[repo-local-policy-is-executable-memory]]"
  - "[[unknowns-are-static-analysis-product-data]]"
  - "[[repo-local-policy-needs-an-agent-repair-benchmark]]"
---

# Effective False Positives Are The Adoption Bar

The adoption problem in static analysis is not just incorrect warnings. It is
warnings developers and agents do not act on.

## Claim

`polint` should optimize for effective false positives: diagnostics that fail to
produce useful action, even when the underlying analysis is technically correct.

For a repo-local linter, that includes:

- a warning that is true but too low-value;
- a warning that lacks enough evidence to repair;
- a warning that fires on legacy debt during a new-code review;
- a warning that says "possible" without confidence or precision;
- a warning an agent fixes by making a larger, worse change.

## Evidence

- Google's Tricorder paper distinguishes an analyzer writer's false positive
  from a developer's false positive: to a developer, a false positive is any
  report they did not want to see.
- The Google SWE static-analysis chapter reports Tricorder's overall effective
  false-positive rate just below 5%, across more than 30 languages and more than
  100 analyzers.
- Google's static-analysis guidance emphasizes code-review integration and
  actionable findings, not just offline report volume.
- `polint` supports `--fail-on none`, baselines, comment ignores, ignore stats,
  short summaries, JSON output, and review-mode diff gating
  (`.context/polint/README.md:200-279`, `.context/polint/README.md:294-390`).

## Mechanism

Effective false positives are product failures at the diagnostic boundary. They
often come from one of four issues:

| Failure | Example | Better design |
| --- | --- | --- |
| scope | reports all historical debt | review mode or baseline |
| evidence | reports "bad API" without caller context | include import/call evidence |
| precision | reports maybe-flow as definite-flow | label status and confidence |
| repair | tells agent "fix this" without expected pattern | include repair direction |

This is why `polint`'s local-policy framing is strong. Repo owners can choose
rules where local value is high enough to justify enforcement.

## Agent-Specific Twist

For humans, an effective false positive wastes attention. For agents, it can
also create bad code. An agent may "fix" a warning by:

- removing a useful test;
- adding an unsafe suppression;
- changing the public API;
- bypassing the intended architecture;
- broadening a sanitizer or guard beyond what the app needs.

So the metric is not just "did the warning annoy someone?" It is "what did the
repair loop do because of this warning?"

## Implication For The Article

The article should make actionability central. The line:

> The most important static-analysis metric for agents is not how many things
> you can flag. It is how often the flag causes the right patch.

That is a better bridge from classic static analysis to agent-era static
analysis than "static analysis is old/new."

## Caveats

Google's Tricorder numbers are internal and should not be presented as a target
`polint` has already met. They are evidence that large-scale adoption depends on
developer trust and actionability.

Local policy can make false positives worse if teams encode taste as hard
failure. `polint` needs adoption modes and honest severity defaults.

## Sources To Cite

- [Tricorder: Building a Program Analysis Ecosystem](https://research.google.com/pubs/archive/43322.pdf)
- [Software Engineering at Google: Static Analysis](https://abseil.io/resources/swe-book/html/ch20.html)

## Next Test

For every article example rule, write down the expected repair and one
plausible bad repair. If the diagnostic does not prevent the bad repair, the
rule example is not yet article-grade.
