# INSIGHT 01: Agents Need Maps, Not Dumps

AI coding agents perform better when the repository exposes structure as a compact, authoritative
map rather than dumping raw files into the context window. Dumping more context increases noise
and recall/precision imbalance. Telling the agent how components, tests, and dependencies relate --
through explicit graphs, repo maps, or structured summaries -- yields measurable gains in accuracy,
speed, and retrieval quality.

## Source map

| Ref | Source                                          | Local text                                                | Role                                                                                                               |
| --- | ----------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| R10 | ContextBench (2026-02)                          | `paper-text/contextbench-2602.05892.txt`                  | Measures retrieval quality during issue resolution; shows recall-over-precision bias and explored-vs-utilized gap. |
| R03 | RepoBench (2023-06)                             | `paper-text/repobench-2306.03091.txt`                     | Splits repo-level completion into retrieval and generation; makes cross-file retrieval an explicit bottleneck.     |
| R12 | RepoGraph (ICLR 2025)                           | `paper-text/repograph-2410.14684.txt`                     | Adds a line-level dependency graph as a plug-in module; boosts SWE-bench by 32.8% relative.                        |
| R13 | Repository Intelligence Graph (2026-01)         | `paper-text/repository-intelligence-graph-2601.10112.txt` | Deterministic build/test-centered map; +12.2% accuracy, -53.9% time across 3 agents and 8 repos.                   |
| R14 | AI-assisted Coding with Cody (2024-08)          | `paper-text/cody-context-retrieval-2408.05344.txt`        | Practitioner architecture: search + code intelligence > raw long-context for code recommendations.                 |
| R16 | CodePlan (2023-09)                              | `paper-text/codeplan-2309.12499.txt`                      | Repository-level tasks need planning over dependency structure, not direct generation.                             |
| D09 | Aider Repo Map docs                             | `articles/aider-repomap.md`                               | Practitioner signal: repo maps help agents work in larger codebases.                                               |
| D10 | Sourcegraph: How Cody understands your codebase | `articles/sourcegraph-how-cody-understands-codebase.html` | Official-doc evidence: code search + code intelligence, not prompt stuffing.                                       |

## ContextBench: agents favor recall over precision

ContextBench (R10) introduces 1,136 issue-resolution tasks from 66 repositories across 8
programming languages. Each task is annotated with human-verified gold contexts (522,115 lines
across 4,548 files). The benchmark tracks what code agents inspect during resolution, not just
whether they produce a passing patch.

Key finding: sophisticated agent scaffolding yields only marginal gains in context retrieval over
a minimal baseline -- echoing "The Bitter Lesson" of AI research. All agents and LLMs consistently
favor recall over precision. This means they retrieve broad, noisy context.

### ContextBench agent retrieval data (GPT-5 backbone)

| Agent          | File Recall | File Precision | File F1 | Block Recall | Block Precision | Block F1 | Pass@1 |
| -------------- | ----------: | -------------: | ------: | -----------: | --------------: | -------: | -----: |
| mini-SWE-Agent |       0.682 |          0.709 |   0.634 |        0.369 |           0.645 |    0.375 |  0.472 |
| Agentless      |       0.609 |          0.352 |   0.390 |        0.344 |           0.328 |    0.242 |  0.452 |
| SWE-agent      |       0.726 |          0.537 |   0.544 |        0.312 |           0.625 |    0.285 |  0.490 |
| OpenHands      |       0.733 |          0.400 |   0.463 |        0.283 |           0.505 |    0.190 |  0.490 |
| Prometheus     |       0.717 |          0.336 |   0.403 |        0.258 |           0.646 |    0.285 |  0.512 |

Source trace: R10, `paper-text/contextbench-2602.05892.txt`, Table 2.

Critical observation: "Significant gaps exist between retrieved and utilized context. Agents often
inspect gold-relevant code but fail to retain or use it in final patch generation, highlighting
consolidation as a key bottleneck." The problem is not just finding the right context -- it is
organizing it so the agent can act on it.

### Benchmark scope

| Measurement                             |   Value |
| --------------------------------------- | ------: |
| Total tasks                             |   1,136 |
| Lite subset                             |     500 |
| Repositories                            |      66 |
| Programming languages                   |       8 |
| Gold context lines                      | 522,115 |
| Gold context files                      |   4,548 |
| Gold context blocks (classes/functions) |  23,116 |

## RepoBench: cross-file retrieval as explicit bottleneck

RepoBench (R03) decomposes repository-level code completion into three sub-tasks:

1. **RepoBench-R (Retrieval):** Find the most relevant code snippet from other files.
2. **RepoBench-C (Completion):** Predict the next line given pre-selected context.
3. **RepoBench-P (Pipeline):** End-to-end retrieval + completion.

The benchmark uses tree-sitter to parse import statements and identify cross-file dependencies.
The "Cross-File-First" (XF-F) setting -- masking the first appearance of a cross-file reference --
is the hardest, because no prior in-file usage exists. This makes it a pure retrieval problem.

The implication for codebase design: when the agent has no in-file usage to learn from, it depends
entirely on how discoverable and navigable cross-file dependencies are. Explicit imports, typed
interfaces, and package boundaries directly affect retrieval quality.

Source trace: R03, `paper-text/repobench-2306.03091.txt`.

## RepoGraph: structured graphs boost SWE-bench performance

RepoGraph (R12, ICLR 2025) constructs a line-level graph where:

- Nodes = lines of code (definitions or references)
- Edges = dependency relationships (invoke, contain)

Ego-graph retrieval from this structure is integrated into both agent and procedural frameworks as a
`search_repograph(param)` action.

### RepoGraph results on SWE-bench

| Framework integration                                         | Relative improvement |
| ------------------------------------------------------------- | -------------------: |
| Average relative improvement (4 systems, 2 lines of approach) |                32.8% |

The paper demonstrates that RepoGraph helps both agent-based and procedural frameworks. It
operates at line, file, and repository level simultaneously. The node filtering step is important:
it excludes built-in/stdlib calls and third-party library calls, focusing only on project-internal
dependencies.

Source trace: R12, `paper-text/repograph-2410.14684.txt`.

## Repository Intelligence Graph (RIG): deterministic build/test map

RIG (R13) is the strongest direct evidence for the "map not dump" claim. It constructs a
deterministic, evidence-backed architectural graph from build and test artifacts.

### RIG evaluation results across 3 agents and 8 repositories

| Metric                                                |                         Value |
| ----------------------------------------------------- | ----------------------------: |
| Mean accuracy improvement (with RIG vs without)       |                        +12.2% |
| Mean completion time reduction                        |                        -53.9% |
| Mean absolute time reduction per repository           |                -124.4 seconds |
| Mean efficiency improvement (seconds per score point) |                        -57.8% |
| Multilingual repo accuracy improvement                |                        +17.7% |
| Multilingual repo efficiency improvement              |                        -69.5% |
| Single-language repo accuracy improvement             |                         +6.6% |
| Single-language repo efficiency improvement           |                        -46.1% |
| Average RIG JSON size                                 |  20,692 bytes (~5,173 tokens) |
| Largest RIG in corpus                                 | 60,076 bytes (~15,000 tokens) |

Source trace: R13, `paper-text/repository-intelligence-graph-2601.10112.txt`.

The key design choice: RIG is build-and-test-centered, not code-centered. Nodes are components,
aggregators, runners, tests, external packages. Edges record dependency, coverage, and orchestration
relationships. This answers agent questions like "which components depend on X?" without scanning
source code.

RIG benefits are larger on structurally complex repositories and on harder questions. This means
the value of a map increases as the codebase becomes more complex -- exactly when dumping raw
context becomes most harmful.

## CodePlan: planning over dependencies, not direct generation

CodePlan (R16) formalizes repository-level coding as a planning problem. It uses incremental
dependency analysis and change-may-impact analysis to propagate edits across file boundaries.

Key result: CodePlan gets 5/6 repositories to pass validity checks (build without errors, correct
edits), while baselines without planning (but with the same context) get 0/6.

The implication: when a change escapes a function's signature boundary, it must propagate to
callers. Without a dependency map, the agent cannot reason about this propagation. With
explicit dependency structure, it can plan a multi-step chain of edits.

Source trace: R16, `paper-text/codeplan-2309.12499.txt`.

## Inference

### What the evidence supports:

1. **Retrieval is noisy.** Agents over-retrieve and under-utilize. More sophisticated scaffolding does
   not fix this (ContextBench). The codebase must help the agent find and use the right context.

2. **Structured graphs outperform flat retrieval.** RepoGraph (+32.8%) and RIG (+12.2% accuracy,
   -53.9% time) both demonstrate that explicit structural representations improve agent performance
   over baseline approaches that scan files ad hoc.

3. **Build/test structure is particularly high-value.** RIG shows that build-and-test topology -- not
   just code-level dependencies -- is what agents most struggle to recover on their own.

4. **Cross-file dependencies are the retrieval bottleneck.** RepoBench's XF-F setting isolates this;
   when the agent has never seen a module used in-file, retrieval from structure is all it has.

5. **Planning needs structure.** CodePlan demonstrates that multi-file changes require dependency
   analysis; direct generation without structural awareness fails.

### Inference (author conclusion, not directly from papers):

- A short, authoritative repo map (modules, boundaries, canonical examples, test coverage topology)
  should be cheaper and more effective than dumping full files into context.
- The map should be deterministic (generated from build/test artifacts or maintained as config),
  not generated on-the-fly by the agent.
- Maps should answer: What are the modules? Where do tests live? What builds what? What are the
  extension points? What is generated vs hand-written?

## Non-claims

- The evidence does not prove that any specific map format (JSON, Markdown, YAML) is superior.
  RIG uses JSON; Aider's repo map uses a tag-based text format. The content matters more than
  serialization.
- RepoGraph operates at line-level granularity; RIG operates at component/build-target level.
  These are different scopes and are not directly comparable.
- ContextBench measures retrieval quality but does not directly manipulate map presence. It is
  observational evidence about what goes wrong, not experimental evidence about specific fixes.
- None of these papers test the specific act of "adding a CLAUDE.md/AGENTS.md architecture summary."
  That claim must be sourced from the agent instructions research (INSIGHT_02).

## Blog/presentation visual candidates

1. **ContextBench radar chart** (from Figure 1 in paper): shows recall >> precision for all agents.
2. **RIG before/after comparison**: time and accuracy with vs without the map.
3. **RepoGraph integration diagram**: how graph retrieval plugs into both agent and procedural workflows.
4. **CodePlan propagation example**: showing how one seed edit propagates to 5+ derived edits
   across files via dependency analysis.
5. **"Floor plan vs warehouse" metaphor slide**: the talk hook.

## References

- R10: ContextBench, `paper-text/contextbench-2602.05892.txt`
- R03: RepoBench, `paper-text/repobench-2306.03091.txt`
- R12: RepoGraph, `paper-text/repograph-2410.14684.txt`
- R13: Repository Intelligence Graph, `paper-text/repository-intelligence-graph-2601.10112.txt`
- R14: Cody context retrieval, `paper-text/cody-context-retrieval-2408.05344.txt`
- R16: CodePlan, `paper-text/codeplan-2309.12499.txt`
- D09: Aider repo map docs, `articles/aider-repomap.md`
- D10: Sourcegraph Cody, `articles/sourcegraph-how-cody-understands-codebase.html`
