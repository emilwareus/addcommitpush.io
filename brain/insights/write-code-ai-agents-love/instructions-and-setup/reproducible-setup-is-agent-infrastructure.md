---
type: insight
title: "Reproducible Setup Is Agent Infrastructure"
slug: reproducible-setup-is-agent-infrastructure
created: 2026-06-28
status: working
publish: true
tags:
  - ai-agents
  - research
feeds_into:
  - "[[write-code-ai-agents-love]]"
original_path: "presentations/write-code-ai-agents-love/research/insights/INSIGHT_03_reproducible_setup_is_agent_infrastructure.md"
---
# INSIGHT 03: Reproducible Setup Is Agent Infrastructure

Agent performance depends on whether the repository can be installed, built, and tested from
scratch without tacit human knowledge. Environment bootstrap -- dependency installation, service
configuration, database setup, and build toolchain resolution -- is a nontrivial task that current
agents fail at 35-62% of the time even in controlled benchmarks. If a new laptop cannot run the
project, neither can a fresh agent.

## Source map

| Ref | Source                                       | Local text                                                 | Role                                                                                     |
| --- | -------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| R27 | Beyond pip install / Installamatic (2024-12) | `paper-text/installamatic-2412.06294.txt`                  | Evaluates LLM agents installing 40 Python projects; 55% success rate.                    |
| R28 | SetupBench (2025-07)                         | `paper-text/setupbench-2507.09063.txt`                     | 93-instance benchmark isolating environment-bootstrap skill; 34.4-62.4% overall success. |
| R01 | SWE-bench (2023-10)                          | `paper-text/swe-bench-2310.06770.txt`                      | Relies on pre-baked Docker images; setup is assumed, not tested.                         |
| R06 | SWE-bench Live (2025-05)                     | `paper-text/swe-bench-live-2505.23419.txt`                 | Addresses freshness but still provides pre-configured environments.                      |
| D05 | Anthropic: Claude Code best practices        | `articles/anthropic-claude-code-best-practices.html`       | Official-doc evidence: emphasizes test and setup commands.                               |
| D06 | GitHub Copilot coding agent best practices   | `articles/github-copilot-coding-agent-best-practices.html` | Official-doc evidence: setup instructions in repository.                                 |
| R75 | GitTaskBench (AAAI 2026)                     | `papers/gittaskbench-aaai-2026.pdf`                        | End-to-end repo reuse benchmark with autonomous environment setup.                       |

## Installamatic (R27): installation is a hard agent task

### Study design

- 40 open-source Python repositories sampled from GitHub
- Repositories span star ranges: 1k-5k, 5k-10k, 10k-20k, >20k (10 from each)
- Agent: custom LLM-based agent that searches documentation and writes Dockerfiles
- Ground truth: manually verified installation process for each repository
- Oracle: successful test suite execution as proof of correct installation
- All repositories required to have test suites in `test/` or `tests/` directories

### Key results

| Metric                                          |                                 Value |
| ----------------------------------------------- | ------------------------------------: |
| Repositories tested                             |                                    40 |
| Successfully installed (at least 1/10 attempts) |                              21 (55%) |
| Installation method diversity                   | multiple (pip, conda, docker, manual) |

Source trace: R27, `paper-text/installamatic-2412.06294.txt`.

### Failure causes identified

The paper identifies common causes for installation failure:

- Inadequate or missing documentation (68% of developers cite this as an issue per Aghajani et al.)
- Inappropriate installation instructions (63% cite this)
- Agent difficulty gathering task-relevant information from the repository
- Lack of code examples in installation documentation

### Key recommendation from the paper

- Include a repair step after initial installation attempt
- Provide code examples of the installation process in documentation
- Installation documentation quality directly affects agent success

### Why this matters for agent-friendly codebases

The benchmark reveals that installation is not a trivial prerequisite that can be assumed. Even when
documentation exists, agents struggle to:

1. Find the right documentation files
2. Distinguish install-relevant from non-relevant documentation
3. Handle cases where instructions are incomplete or environment-specific
4. Manage dependency conflicts and system-level requirements

## SetupBench (R28): systematic measurement of bootstrap failure

### Benchmark composition

| Category                 | Instances | Ecosystems / Engines                                |
| ------------------------ | --------: | --------------------------------------------------- |
| Repo Setup               |        54 | Python, TypeScript, JavaScript, Go, Rust, Java, C++ |
| Dependency Resolution    |        16 | npm, pip/Poetry, Bundler                            |
| Database Setup           |        15 | PostgreSQL, MySQL, SQLite, Redis, MongoDB           |
| Background-Service Setup |         8 | Gunicorn, Celery, NGINX, file-watchers, autossh     |
| **Total**                |    **93** | 7 languages, 5 DB engines                           |

Source trace: R28, `paper-text/setupbench-2507.09063.txt`, Table 1.

### Success rates by task category and model

| Task family              |    GPT 4o |   GPT 4.1 | Claude 3.5 | Claude 3.7 |  Claude 4 |
| ------------------------ | --------: | --------: | ---------: | ---------: | --------: |
| Background-service setup |     50.0% |     62.5% |      75.0% |      87.5% |     75.0% |
| Local-DB setup           |     20.0% |     33.3% |      40.0% |      53.3% |     46.7% |
| Repo setup               |     38.9% |     46.3% |      50.0% |      44.4% |     57.4% |
| Dependency resolution    |     25.0% |     75.0% |      68.8% |      87.5% |     87.5% |
| **Overall**              | **34.4%** | **50.5%** |  **53.8%** |  **57.0%** | **62.4%** |

Source trace: R28, `paper-text/setupbench-2507.09063.txt`, Table 2.

### Token usage and step count (average)

| Task family           | Model    | Avg tokens | Avg steps |
| --------------------- | -------- | ---------: | --------: |
| Repo setup            | Claude 4 |     1,158K |      42.9 |
| Repo setup            | GPT 4o   |       323K |      21.3 |
| Dependency resolution | Claude 4 |     1,847K |      74.3 |
| Dependency resolution | GPT 4o   |       435K |      34.1 |
| Overall               | Claude 4 |     1,129K |      47.1 |
| Overall               | GPT 4o   |       303K |      23.2 |

### Three critical failure modes

1. **Incomplete development tooling installation:** Agents install the main packages but miss
   required system libraries, compilers, or database headers.
2. **Hallucinated task constraints:** Agents invent requirements not present in the task
   specification, leading to unnecessary steps and failures.
3. **Non-persistent environment modifications:** Changes are made in ways that do not survive
   session boundaries, breaking agent-human collaboration workflows.

### Efficiency analysis

- 38-69% of agent actions are unnecessary compared to optimal human behavior
- Three primary sources of inefficiency:
  1. Redundant file reads
  2. Poor instruction following
  3. Off-target exploration (examining setup-adjacent but not setup-informative files)

## The SWE-bench gap: setup is assumed, not tested

SWE-bench (R01) and SWE-bench Live (R06) rely on pre-baked Docker images with every
dependency pre-installed. This is necessary for reproducible evaluation but creates a systematic
blind spot: agents look impressive on leaderboards while potentially failing the first hurdle a
developer encounters.

SetupBench's core argument: "an agent may look impressive on leaderboards while still failing
the first hurdle a developer encounters: 'it cannot run my code'."

This gap means that SWE-bench scores overestimate real-world agent utility for any project
where the agent would need to set up its own environment -- which is most real projects.

## Inference

### What the evidence supports:

1. **Environment setup is quantifiably hard.** Best models achieve only 57-62% on SetupBench;
   the installation task alone has a 55% ceiling in Installamatic. This is not a solved problem.

2. **Repo setup (54 instances) is the largest and most representative category.** Success rates
   range from 38.9% (GPT 4o) to 57.4% (Claude 4). Even the strongest model fails ~43% of
   repo setup tasks.

3. **Database and dependency tasks are the hardest surface.** Local-DB setup reaches only 20-53%
   success. This aligns with Constraint Decay findings (INSIGHT_22) about data-layer interaction.

4. **Agent inefficiency is massive.** 38-69% of steps are wasted. This means agent costs are
   2-3x what they need to be, purely from poor exploration during setup.

5. **Documentation quality directly affects setup success.** Both papers emphasize that missing,
   incomplete, or inappropriate documentation is a primary failure cause.

### Inference (author conclusion):

Agent-friendly repositories must treat setup as infrastructure:

- **Pinned package manager and lockfile** -- eliminates version resolution ambiguity
- **One-command install/bootstrap** -- reduces the search problem to a single known command
- **One-command test** -- provides a verification oracle
- **Explicit environment variables** -- prevents agents from hallucinating config
- **Container/devcontainer for complex setups** -- encapsulates system dependencies
- **Seeded local services and fixtures** -- makes database/service setup deterministic
- **No hidden manual setup steps** -- everything documented and executable

The "one-command" principle is critical because it reduces agent actions from dozens of
exploratory steps to a single known command. SetupBench shows agents waste 38-69% of steps
on exploration; a documented single command eliminates that exploration entirely.

## Non-claims

- SetupBench tests OpenHands only. Results may not generalize to other agent architectures
  that have different tool interfaces or exploration strategies.
- Installamatic tests a custom agent on Python projects only. Other ecosystems (Java, Rust, Go)
  may have different setup difficulty profiles.
- Neither paper tests whether having a CLAUDE.md/AGENTS.md with setup instructions
  specifically helps. The connection to agent instruction files is inferred, not measured.
- Success on SetupBench does not mean the agent can then productively modify the codebase.
  Setup is necessary but not sufficient.
- The "55% success" from Installamatic allows 10 attempts. Single-attempt success is lower
  and would be the more realistic measure for production use.

## Blog/presentation visual candidates

1. **SetupBench success rate heatmap**: models x task categories, showing the 20-87% range.
2. **Efficiency waste chart**: 38-69% of steps are unnecessary vs optimal human.
3. **"If a new laptop cannot run it, neither can a fresh agent" headline slide.**
4. **Three failure modes diagram**: incomplete tooling, hallucinated constraints, non-persistent
   changes -- as a flow showing where each fails in the bootstrap sequence.
5. **Checklist slide**: the one-command principle with concrete examples.

## References

- R27: Beyond pip install / Installamatic, `paper-text/installamatic-2412.06294.txt`
- R28: SetupBench, `paper-text/setupbench-2507.09063.txt`
- R01: SWE-bench, `paper-text/swe-bench-2310.06770.txt`
- R06: SWE-bench Live, `paper-text/swe-bench-live-2505.23419.txt`
- R75: GitTaskBench, `papers/gittaskbench-aaai-2026.pdf`
- D05: Anthropic Claude Code best practices, `articles/anthropic-claude-code-best-practices.html`
- D06: GitHub Copilot coding agent best practices, `articles/github-copilot-coding-agent-best-practices.html`
