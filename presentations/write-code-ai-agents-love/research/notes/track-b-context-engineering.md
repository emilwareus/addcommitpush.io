# Track B: Codebase Context Engineering

## Bottom Line

Bigger context windows do not remove the need for retrieval. The current evidence favors layered context: a short root instruction file, scoped subtree instructions, structured docs, generated maps, and self-contained task plans.

## Strongest Implications

- Descriptive identifiers, docstrings, and comments improve semantic retrievability.
- Data-flow, call-chain, and dependency structure matter; flat snippet retrieval is weaker.
- Long context can miss relevant information, so high-signal summaries and progressive disclosure matter.
- Selective retrieval is better than always-on retrieval.
- Canonical examples and golden tests should live near the code they govern.
- File and directory summaries can act as useful external memory.
- Long tasks need self-contained plans with validation and decision logs.

## Sources Captured Locally

- CodeBERT (R29)
- GraphCodeBERT (R30)
- RepoCoder (R31)
- Lost in the Middle (R32)
- SWE-bench (R01)
- Repoformer (R33)
- RepoExec (R34)
- ContextBench (R10)
- RepoScope (R38)
- RepoRepair (R39)
- Aider repo map docs (D09)
- Sourcegraph context docs/blogs (D10, D11)

## Recommended Repo Shape

- Root `AGENTS.md` or equivalent: 50-150 lines.
- Scoped instruction files only in complex subtrees.
- `docs/architecture/`, `docs/specs/`, `docs/plans/`, `docs/generated/`.
- Generated route, symbol, dependency, schema, and API summaries.
- Canonical examples and acceptance tests close to the code.
- Freshness checks for generated docs and broken links.
