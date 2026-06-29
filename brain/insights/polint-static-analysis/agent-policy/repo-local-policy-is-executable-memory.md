---
type: insight
title: "Repo-Local Policy Is Executable Memory"
slug: repo-local-policy-is-executable-memory
created: 2026-06-29
status: working
publish: true
tags:
  - ai-agents
  - static-analysis
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[context-files-are-config-with-debt]]"
  - "[[static-diagnostics-are-agent-interfaces]]"
---

# Repo-Local Policy Is Executable Memory

The strongest `polint` framing is not "a linter with clever rules." It is
"executable repository memory." The repo already contains local knowledge in
docs, comments, review threads, and developer habits. The statically checkable
part should become a tool the agent can run and repair against.

## Claim

Agent instruction files are useful orientation, but executable checks are a
stronger medium for requirements that can be mechanically detected.

Prose says what to remember. A rule creates a failure at the exact point where
the agent can repair it.

## Mechanism

A text instruction asks the agent to do four things:

1. retain the instruction;
2. recognize that it applies;
3. map it to the current code;
4. choose a repair.

A static diagnostic collapses this into a concrete interface:

1. file and span;
2. rule ID;
3. violated local policy;
4. evidence;
5. repair direction;
6. CI or review status.

That is why repo-local static analysis is not just governance. It is an agent
interface.

## Evidence

- AGENTS.md describes itself as a predictable place for coding-agent context and
  instructions.
- The 2026 arXiv paper "Evaluating AGENTS.md" reports that context files do not
  generally improve task success in the studied settings and increase inference
  cost by more than 20% on average.
- `polint` says agents do not reliably remember local conventions from
  `AGENTS.md`, prompts, or review comments, and turns the statically checkable
  parts into executable feedback (`.context/polint/README.md:25-30`).
- The 2025 "Static Analysis as a Feedback Loop" paper reports large reductions
  in LLM-generated code issues when GPT-4o is iteratively guided by Bandit and
  Pylint feedback.
- `polint`'s README example says the diagnostic should tell the agent exactly
  how to fix the raw-color violation (`.context/polint/README.md:41-47`).

## Caveats

This does not mean `AGENTS.md` is bad. It means prose should handle orientation,
workflow, and judgment, while executable checks handle deterministic local
policy.

The AGENTS.md evaluation should not be overgeneralized. It is evidence of a
tradeoff, not proof that context files are useless.

## Implication

The article thesis can be:

> Some rules are too important to leave as instructions in a text file. If a
> machine can check them, make the machine check them.

## Next test

Compare three policy encodings on the same agent task:

- `AGENTS.md` only;
- review comment only;
- `polint` rule with a focused diagnostic.

Measure repair success, number of agent iterations, false positives, and
whether the agent introduces a compensating regression.
