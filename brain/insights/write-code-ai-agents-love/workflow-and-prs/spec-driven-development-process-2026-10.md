---
type: insight
title: "My Spec-Driven Development Process (October 2026)"
slug: spec-driven-development-process-2026-10
created: 2026-10-06
status: working
publish: true
tags:
  - ai-agents
  - workflow
  - spec-driven-development
feeds_into:
  - "[[write-code-ai-agents-love]]"
---
# My Spec-Driven Development Process (October 2026)

This is the process I use to take one issue to a merge-ready pull request with coding agents.
The skills, subagents, validators and templates are open source in
[spec-driven-development/](https://github.com/emilwareus/addcommitpush.io/tree/main/spec-driven-development),
with the product-specific parts replaced by template tags so anyone can copy it.

## Why spec-driven development

Feature work does not fail at typing. It fails at planning and constraints
([[feature-work-fails-at-planning-and-constraints]]). An agent can write a clean patch that
solves the wrong problem, and you only find out in review, inside a large diff.

Spec-driven development moves that discovery earlier. Research and planning are cheap
documents. Code is the expensive part, and it should be the boring part.

The second reason is context. Every stage runs in a fresh agent. Instead of one long session
that slowly forgets what it decided, each stage reads a short document written by the stage
before it: research for the plan, the plan for the implementation, the diff for the review.

## The loop

```text
issue
  -> research          (stops if a question needs a human answer)
  -> plan              (stops if a question needs a human answer)
  -> for each phase:   implement <-> validate, then commit to a draft PR
  -> ultrareview       <-> review fixer, until a full pass has zero findings
  -> validate
  -> security review   <-> fix (re-run ultrareview if code changed)
  -> PR description, ready for review, CI and PR comments
  -> merge-ready       (merging is a human or auto-merge decision, never the agent's)
```

## What makes it work

- **One fresh agent per stage.** The orchestrator owns the plan, the order, Git and the PR.
  Workers own one bounded stage and hand back an artifact.
- **Questions are a hard stop.** When evidence cannot settle a decision that changes product
  behavior, data, security or the PR boundary, the question goes into the owning document
  with options and a recommended default, and the run ends. The agent never picks the default
  for you.
- **Validation is independent and has fix authority.** A different worker validates each
  phase and may fix what the branch broke, and nothing the branch did not break.
- **Ultrareview loops until clean.** A multi-angle review of the whole diff against the base,
  a fixer agent, and another full pass, until one complete pass reports zero actionable
  findings.
- **Evidence is invalidated, not reused.** Any code change invalidates validation, review and
  security results for the affected surfaces. A green run from before the change does not
  count.
- **Structure is checked by scripts.** Research and plan documents pass a structure validator
  before the next stage starts, so a stage cannot skip its own contract.

## How to try it

Point your coding agent at the folder and ask it to recreate the process in your repository.
The README has a guide written for the agent: where skills and subagents go for each tool,
how to resolve the template tags, and how to run one small issue end to end.

Credit: the research, plan and implement commands descend from HumanLayer's open-source
commands (Dex Horthy and the AI That Works crew).
