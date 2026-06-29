---
type: insight
title: "Models Need Diagnostics, Not Self-Diagnosis"
slug: models-need-diagnostics-not-self-diagnosis
created: 2026-06-29
status: working
publish: true
tags:
  - ai-agents
  - static-analysis
  - diagnostics
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[static-analysis-feedback-loops-need-deterministic-tools]]"
  - "[[repo-local-policy-is-executable-memory]]"
  - "[[typed-rule-signatures-are-capability-contracts]]"
---

# Models Need Diagnostics, Not Self-Diagnosis

The agent workflow should not assume that a model can reliably notice when its
own patch violates local policy. The stronger design is to make the violation
observable through an external diagnostic.

## Claim

LLMs are often better at acting on concrete diagnostic feedback than at finding
their own mistakes. `polint` should therefore optimize for diagnostic shape:
small span, clear rule ID, evidence, and a repair instruction.

## Evidence

- The Springer paper on testing and static-analysis feedback reports that
  evaluated open-source LLMs performed poorly at detecting errors and
  vulnerabilities in their own C code, but showed substantial repair ability
  when given failed-test or Infer static-analysis feedback.
- FeedbackEval reports meaningful differences between feedback types, with
  structured feedback materially improving repair outcomes.
- The AGENTS.md evaluation reports that coding agents tend to follow context
  file instructions, but that context files do not generally improve task
  success in the studied settings and increase inference cost by more than 20%.
- `polint`'s README explicitly targets the gap where agents do not reliably
  remember local conventions from prompts, context files, or review comments
  (`.context/polint/README.md:25-30`).
- `polint` generated rules include positive and negative fixture cases, creating
  a local loop where the rule itself can be tested before it is used as agent
  feedback (`.context/polint/README.md:87-100`).

## Mechanism

Self-diagnosis asks the agent:

> Did you violate any local rule you may or may not remember?

A diagnostic asks:

> At this span, rule `local/no-raw-colors` found `#ff00aa`. Replace it with a
> design token.

The second prompt has fewer degrees of freedom. It gives the model a target, an
evidence item, and a bounded repair surface.

## Diagnostic Requirements

For agent repair, a diagnostic should carry:

- stable rule ID;
- exact path and range;
- severity;
- short problem statement;
- evidence values;
- repair direction;
- setup or precision status when relevant;
- suppressibility policy.

This is why `polint` diagnostics are not just developer UX. They are the public
API between repo-local policy and coding agents.

## Implication For The Article

The article should distinguish three kinds of memory:

| Memory form | What it is good for | Where it fails |
| --- | --- | --- |
| Context file | workflow and orientation | applying every local rule at the right span |
| Review comment | human judgment and nuance | consistency, timing, repeatability |
| Static diagnostic | specific checkable policy | subjective or runtime-only judgment |

`polint` is for the third column, not for replacing the other two.

## Caveats

Diagnostics can still be too vague. A span without evidence, a generic "do not
do this" message, or a noisy rule can recreate the same ambiguity as prose.

The self-diagnosis evidence is currently strongest for C code and specific
open-source models. The design lesson is still useful, but the article should
avoid claiming all models fail equally.

## Sources To Cite

- [Helping LLMs improve code generation using feedback from testing and static analysis](https://link.springer.com/article/10.1007/s44163-026-01009-5)
- [FeedbackEval](https://arxiv.org/abs/2504.06939)
- [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988)

## Next Test

Create paired prompts for the same task:

- one prompt includes the local policy as prose;
- one prompt omits the policy but runs `polint` after the patch.

Compare how often the agent finds and fixes the violation, and whether it edits
unrelated code.
