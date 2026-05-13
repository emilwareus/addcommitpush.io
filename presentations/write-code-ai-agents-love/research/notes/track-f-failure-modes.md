# Track F: Counterexamples and Failure Modes

This memo captures the completed subagent findings for failure modes.

## Bottom Line

Many agent failures are repository and task-design failures:

- ambiguous tasks and hidden conventions,
- brittle or flaky tests,
- weak environment/bootstrap reproducibility,
- poor structural discoverability,
- oversized or noisy context.

More repo instructions are not automatically better. Bloated context files can reduce success and increase cost.

## Failure Patterns

### Underspecified tasks and hidden conventions

OpenAI audits of SWE-bench Verified found large fractions of tasks with underspecified problem statements or problematic tests. Task contracts should include exact scope, expected pattern, non-goals, success criteria, and verification commands.

### Brittle, narrow, or wide tests

Tests should verify behavior, not incidental implementation details. Hidden requirements in tests are especially damaging for agents because the agent cannot ask a maintainer what the test author meant.

### Weak build/setup reproducibility

Installation and setup papers show agents often fail before coding. A repo that needs implicit local setup is not agent-ready.

### Poor repository structure and weak discoverability

Repository-level planning and graph papers show agents lose time reconstructing build, test, and dependency topology. Explicit maps reduce this search burden.

### Oversized context and instruction bloat

Anthropic guidance and AGENTS.md studies warn that context windows are limited and noisy instructions can hurt. Keep root instructions small and move detailed workflows into scoped docs or skills.

## Recommended Repo Instruction Pattern

Use one short root instruction file with:

- exact build/test/lint/typecheck commands,
- three-sentence architecture summary,
- hard constraints,
- non-obvious conventions,
- known gotchas.

Do not pack it with changelogs, obvious file-tree facts, or aspirational rules the repo does not actually follow.

## Recommended Task Contract

Every nontrivial task should specify:

- goal,
- files or directories in scope,
- reference implementation or pattern,
- constraints,
- verification commands,
- non-goals,
- expected output or acceptance criteria,
- repo-specific gotchas.
