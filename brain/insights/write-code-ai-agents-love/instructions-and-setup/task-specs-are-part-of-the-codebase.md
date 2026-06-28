---
type: insight
title: "Task Specs Are Part of the Codebase"
slug: task-specs-are-part-of-the-codebase
created: 2026-06-28
status: working
publish: true
tags:
  - ai-agents
  - research
feeds_into:
  - "[[write-code-ai-agents-love]]"
original_path: "presentations/write-code-ai-agents-love/research/insights/INSIGHT_11_task_specs_are_part_of_the_codebase.md"
---
# INSIGHT 11: Task Specs Are Part of the Codebase

For nontrivial work, the task description is a code artifact. It should be scoped, versioned, and
verifiable. Agents do not read your mind; they read your issue. The quality of that issue directly
affects whether the agent converges on a valid solution, spirals into irrelevant exploration, or
hallucinates constraints that do not exist.

## Source map

| Ref     | Source                                                       | Local text                                   | Role in this insight                                                                                              |
| ------- | ------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| R16     | CodePlan                                                     | `paper-text/codeplan-2309.12499.txt`         | Shows repository-level tasks need planning over dependency structure; seed specifications drive the plan graph.   |
| R25     | SWE-Search                                                   | `paper-text/swe-search-iclr-2025.txt`        | MCTS-based iterative refinement improves agent outcomes; clear initial problem descriptions feed the search tree. |
| R17     | On the Impact of AGENTS.md                                   | `paper-text/agents-md-impact-2601.20404.txt` | Paired study: AGENTS.md reduced median runtime 28.64% and output tokens 16.58%.                                   |
| R73     | OctoBench                                                    | `paper-text/octobench-2601.10343.txt`        | Scaffold-aware instruction following; persistent constraints and task specs measured via 7,098 checklist items.   |
| D01-D09 | Vendor docs (OpenAI, Anthropic, GitHub, Cursor, Aider, etc.) | Various articles/ files                      | Converge on bounded tasks, explicit validation, file paths, and examples.                                         |
| D35     | Builder.io AGENTS.md guide                                   | `articles/builder-agents-md.html`            | Practitioner signal: small project instructions reduce repeated repo rediscovery.                                 |

## CodePlan: task specs as seed specifications

CodePlan (Microsoft Research, 2023) frames repository-level coding as a planning problem. The
input is a repository state, a set of seed edit specifications, and a correctness oracle. The key
insight for this note is how the paper defines seed specifications:

> "The edits follow from the task description, whereas derived edits are identified and
> contextualized based on a combination of incremental dependency analysis, change may-impact
> analysis and an adaptive planning algorithm."

Source trace: R16, `paper-text/codeplan-2309.12499.txt`, lines 156-160.

### CodePlan results copied from the paper

| Evaluation criterion                 |   CodePlan | Baselines (without planning) |
| ------------------------------------ | ---------: | ---------------------------: |
| Repositories passing validity checks |        5/6 |                          0/6 |
| Repository sizes (files changed)     | 2-97 files |                   Same repos |

The paper demonstrates that well-specified seed tasks plus dependency-aware planning can get
5/6 repositories to pass build oracles, while baselines with the same contextual information but
no planning cannot get any to pass. The task specification quality matters because vague specs
cannot produce useful seed nodes in the plan graph.

### What a seed specification contains in CodePlan

- A natural language instruction or a set of initial code edits
- A correctness oracle (build, tests, static analysis, type checks)
- Enough information to identify the first edit location
- Enough information for the planner to derive dependent edits via may-impact analysis

This maps directly to the practical template: goal, scope, relevant files, constraints, validation
commands.

## SWE-Search: iterative refinement needs a clear starting problem

SWE-Search (ICLR 2025) uses MCTS with a hybrid value function to explore solution
trajectories for repository-level tasks. Its performance improvement (23% relative over
standard open-source agents) comes from backtracking and re-evaluation.

Source trace: R25, `paper-text/swe-search-iclr-2025.txt`, lines 22-26.

### SWE-Search data from the paper

| Metric                                    |          Value |
| ----------------------------------------- | -------------: |
| Relative improvement over standard agents |            23% |
| Number of models tested                   |              5 |
| Benchmark                                 | SWE-bench-lite |

The relevance to task specs: MCTS exploration is only as good as the root node definition. The
problem formalization (Section 3.1) defines M = (S, C, A, V, P, p0, rho) where C includes
"metadata about the repository and the initial problem description." If the initial problem
description is ambiguous or incomplete, the agent's exploration tree wastes branches on
incorrect interpretations.

## AGENTS.md impact: persistent instructions reduce waste

The paired study on AGENTS.md (R17) provides the most direct measurement of structured
repository-level instructions on agent efficiency.

### AGENTS.md efficiency data copied from the paper

| Metric                     | Without AGENTS.md |   With AGENTS.md | Delta % |
| -------------------------- | ----------------: | ---------------: | ------: |
| Wall-clock time median (s) |             98.57 |            70.34 | -28.64% |
| Wall-clock time mean (s)   |            162.94 |           129.91 | -20.27% |
| Output tokens mean         |          5,744.81 |         4,798.60 | -16.58% |
| Output tokens median       |          2,925.00 |         2,440.00 | -16.58% |
| Total tokens mean          |           687,632 | 632,000 (approx) |     ~8% |

Source trace: R17, `paper-text/agents-md-impact-2601.20404.txt`, Table 1.

### Study design details

- Agent: OpenAI Codex (gpt-5.2-codex)
- Repositories: 10 (from 26 qualifying repos with root AGENTS.md)
- Pull requests: up to 15 per repo, 124 total
- Size constraint: additions + deletions <= 100 LoC, <= 5 files
- Paired within-task design: same PR, same snapshot, only AGENTS.md presence varies

The study shows that persistent, structured task context (AGENTS.md acts as a persistent
partial task spec) reduces agent wall-clock time and token consumption while maintaining
comparable task completion behavior. This is practitioner signal for the value of codified
instructions.

## OctoBench: heterogeneous constraints need explicit specs

OctoBench (R73) measures scaffold-aware instruction following. It packages 34 environments
and 217 tasks with 7,098 objective checklist items across three scaffold types.

### OctoBench statistics

| Metric                              | Value |
| ----------------------------------- | ----: |
| Scaffold types                      |     3 |
| Environments                        |    34 |
| Task instances                      |   217 |
| Checklist items total               | 7,098 |
| Avg. checklist items per instance   |  32.7 |
| Median checklist items per instance |    34 |

Source trace: R73, `paper-text/octobench-2601.10343.txt`, Table 1.

The key finding: "Experiments on eight representative models reveal a systematic gap between
task-solving and scaffold-aware compliance." Agents can solve the functional task but still
violate the persistent constraints. This confirms that task specs must include not just "what to
build" but "what rules to follow while building it."

## Vendor convergence: practitioner signal

Multiple vendor docs independently converge on the same task spec elements. This is not paper
evidence but practitioner signal from production agent systems:

| Vendor / Tool         | Key guidance                                                | Source   |
| --------------------- | ----------------------------------------------------------- | -------- |
| OpenAI Codex          | Layered instruction discovery; AGENTS.md + task description | D01, D04 |
| Anthropic Claude Code | CLAUDE.md; verification workflows; context management       | D05      |
| GitHub Copilot        | Repository-wide + path-specific instructions                | D06      |
| Cursor                | Rule files injected into model context, scoped by path      | D07      |
| Aider                 | Coding conventions codified; repo map for navigation        | D08, D09 |
| Builder.io guide      | Concise rules, copy-paste commands, progressive disclosure  | D35      |

All recommend: bounded scope, explicit validation commands, relevant file paths, and examples.
None recommend "just describe what you want in a sentence."

## Inference for codebase design

The evidence supports treating task specifications as first-class code artifacts. Specifically:

1. **Seed specifications drive planning.** CodePlan shows the plan graph is only as good as its
   seeds. Vague issues produce vague plans that fail validation.

2. **Search trees waste compute on ambiguity.** SWE-Search's MCTS explores branches
   proportional to interpretation uncertainty. Clearer specs mean tighter search.

3. **Persistent instructions reduce runtime.** AGENTS.md reduces median wall-clock time by
   ~29%. The instruction file acts as a persistent partial task spec that prevents rediscovery.

4. **Compliance requires explicit constraints.** OctoBench shows agents satisfy functional
   requirements but miss process constraints. Task specs must encode both.

### Practical task spec template

Every task that spans more than one local edit cycle should include:

| Element               | Why                                                     |
| --------------------- | ------------------------------------------------------- |
| Goal                  | Seeds the plan graph (CodePlan)                         |
| Scope                 | Bounds MCTS exploration (SWE-Search)                    |
| Relevant files        | Reduces retrieval noise, cuts runtime (AGENTS.md study) |
| Canonical example     | Anchors expected behavior                               |
| Constraints           | Prevents compliance violations (OctoBench)              |
| Non-goals             | Prevents over-engineering and scope creep               |
| Validation commands   | Provides the oracle (CodePlan: build, test, lint)       |
| Expected output       | Enables automated acceptance checking                   |
| Rollback / risk notes | Signals when to abort rather than expand                |

## What I should not claim

- I should not claim that task specs guarantee success. CodePlan still fails on 1/6 repos even
  with good specs. SWE-Search still has failures even with clear problems.
- I should not claim AGENTS.md is the same as a task spec. It is persistent project context, not
  per-task description. But the same principle applies: structured, codified information reduces
  agent waste.
- The AGENTS.md study uses small PRs (<=100 LoC). Effect on larger tasks is not measured.
- OctoBench measures instruction following, not solution quality. High compliance does not
  guarantee correct code.
- Vendor guidance is practitioner signal, not controlled experiment. It reflects what tool builders
  observe but does not prove causation.

## Blog visual candidates

1. CodePlan plan graph: seed spec -> derived edits -> validation oracle. Shows how the task
   spec feeds the planning loop.
2. AGENTS.md efficiency bar chart: wall-clock time and output tokens with/without.
3. Task spec template as a structured card: goal, scope, files, example, constraints, validation.
4. Vendor convergence table: what each tool recommends (showing the pattern).
5. OctoBench compliance gap: task-solving rate vs. constraint-following rate.

## References

- R16: CodePlan, `paper-text/codeplan-2309.12499.txt`
- R17: On the Impact of AGENTS.md, `paper-text/agents-md-impact-2601.20404.txt`
- R25: SWE-Search, `paper-text/swe-search-iclr-2025.txt`
- R73: OctoBench, `paper-text/octobench-2601.10343.txt`
- D01-D09: Vendor documentation (various articles/)
- D35: Builder.io AGENTS.md guide, `articles/builder-agents-md.html`
