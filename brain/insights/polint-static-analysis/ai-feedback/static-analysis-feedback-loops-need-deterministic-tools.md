---
type: insight
title: "Static Analysis Feedback Loops Need Deterministic Tools"
slug: static-analysis-feedback-loops-need-deterministic-tools
created: 2026-06-29
status: working
publish: true
tags:
  - ai-agents
  - static-analysis
  - feedback-loops
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[repo-local-policy-is-executable-memory]]"
  - "[[feedback-loops-need-iteration-budgets]]"
  - "[[models-need-diagnostics-not-self-diagnosis]]"
---

# Static Analysis Feedback Loops Need Deterministic Tools

The important AI-agent finding is not "feedback helps." The sharper claim is
that feedback quality depends on the source of the feedback. Deterministic tool
output and model self-critique should not be collapsed into one category.

## Claim

Static-analysis feedback loops are credible when the feedback comes from an
external, deterministic checker with stable diagnostics. LLM-only critique loops
can look like improvement while increasing security risk.

That distinction matters for `polint`: the product should be framed as an
external diagnostic surface for agents, not another prompt asking the model to
think harder.

## Evidence

- "Static Analysis as a Feedback Loop" reports that GPT-4o guided by Bandit and
  Pylint reduced security issues from more than 40% to 13%, readability
  violations from more than 80% to 11%, and reliability warnings from more than
  50% to 11% within ten iterations.
- "Security Degradation in Iterative AI Code Generation" reports a 37.6%
  increase in critical vulnerabilities after five iterations in AI feedback
  loops without human intervention.
- "Helping LLMs improve code generation using feedback from testing and static
  analysis" reports that open-source LLMs perform poorly at self-detecting C
  errors and vulnerabilities, but can repair flawed code when given test or
  static-analysis feedback.
- FeedbackEval reports that feedback type materially changes repair success, and
  that structured feedback outperforms weaker or less targeted feedback formats.
- `polint`'s own README positions the diagnostic as the missing project context
  injected at the repair moment, not as a generic reasoning instruction
  (`.context/polint/README.md:41-47`).

## Mechanism

A deterministic static-analysis loop changes the agent contract:

1. generate or edit code;
2. run a checker;
3. receive stable file/span/rule/evidence output;
4. repair against that output;
5. rerun the checker.

An LLM-only critique loop has a weaker contract:

1. generate or edit code;
2. ask a model to critique the result;
3. ask a model to apply the critique.

The second loop can invent concerns, miss concrete violations, overfit to vague
advice, or introduce security changes that are not checked by an independent
mechanism.

## Implication For The Article

The article should avoid saying "agents need feedback" as if all feedback is
equivalent. The useful line is:

> Agents need executable feedback whose truth does not depend on the same model
> that wrote the patch.

That connects `polint` to the empirical feedback-loop literature without
overselling static analysis as magic.

## Caveats

Static analyzers can be wrong. A bad rule can create churn, false confidence, or
repair loops around non-issues. The adoption question is still diagnostic
quality, not tool determinism alone.

The current evidence does not isolate every variable. The positive result uses
Bandit/Pylint and GPT-4o on PythonSecurityEval. The negative result studies a
different iterative AI process. The defensible argument is that the feedback
source matters and should be measured, not that every static-analysis loop is
safe.

## Sources To Cite

- [Static Analysis as a Feedback Loop](https://arxiv.org/abs/2508.14419)
- [Security Degradation in Iterative AI Code Generation](https://arxiv.org/abs/2506.11022)
- [FeedbackEval](https://arxiv.org/abs/2504.06939)
- [Helping LLMs improve code generation using feedback from testing and static analysis](https://link.springer.com/article/10.1007/s44163-026-01009-5)

## Next Test

Run the same coding-agent task under four conditions:

- no feedback beyond the prompt;
- model self-critique;
- test feedback;
- `polint` diagnostic feedback.

Measure task success, number of repair iterations, new vulnerabilities, and
whether fixes address the exact reported diagnostic.
