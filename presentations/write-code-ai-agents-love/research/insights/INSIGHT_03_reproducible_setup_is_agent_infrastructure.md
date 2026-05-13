# INSIGHT 03: Reproducible Setup Is Agent Infrastructure

## Claim

Agent performance depends on whether the repository can be installed, built, and tested from scratch without tacit human knowledge.

## Evidence

- Beyond pip install (R27) evaluates LLM agents installing Python projects and shows setup is a nontrivial task.
- SetupBench (R28) isolates environment bootstrap and local service configuration as a benchmark problem.
- SWE-bench and SWE-bench Live (R01, R06) rely on executable repository snapshots because verification needs a reproducible environment.
- GitHub Copilot and Anthropic docs (D05, D06) emphasize test and setup commands in repository instructions.

## Implication

Agent-friendly repos need:

- pinned package manager and lockfile,
- one-command install/bootstrap,
- one-command test or documented targeted tests,
- explicit environment variables,
- container or devcontainer where setup is complex,
- seeded local services and fixtures,
- no hidden manual setup.

## Talk Use

"If a new laptop cannot run it, neither can a fresh agent."
