# INSIGHT 11: Task Specs Are Part of the Codebase

## Claim

For nontrivial work, the task description is a code artifact. It should be scoped, versioned, and verifiable.

## Evidence

- Vendor guidance from OpenAI, Anthropic, GitHub, Google, Cursor, Windsurf, Aider, and Augment converges on bounded tasks, explicit validation, file paths, and examples.
- Track D found evidence that merged agent PRs correlate with shorter, well-scoped issues that name relevant artifacts and implementation hints.
- CodePlan (R16) and SWE-Search (R25) show planning and iterative refinement matter for repository-level tasks.
- OpenAI PLANS.md guidance from Track B treats long-running execution plans as self-contained state for agents.

## Practical Template

Every task that spans more than one local edit cycle should include:

- goal,
- scope,
- relevant files,
- canonical example,
- constraints,
- non-goals,
- validation commands,
- expected output,
- rollback or risk notes.

## Talk Use

"Agents do not read your mind. They read your issue."
