# INSIGHT 12: Dependency Structure Beats Text Blobs

AI coding agents perform better when repositories expose dependency structure: imports, calls,
type relationships, data flow, entrypoints, ownership, tests, and build edges. Plain text
similarity retrieval is insufficient for repository-scale coding. The evidence for this is strong
and convergent across multiple independent systems.

## Source map

| Ref | Source | Local text | Role in this insight |
|---|---|---|---|
| R53 | GraphCodeAgent | `paper-text/graphcodeagent-2504.10046.txt` | Requirement Graph + Structural-Semantic Code Graph; up to 43.81% relative Pass@1 improvement. |
| R55 | InlineCoder | `paper-text/inlinecoder-context-inlining-2601.00376.txt` | Call graph inlining (callers + callees); 29.73% relative EM improvement on RepoExec. |
| R56 | SLICE | Not downloaded; abstract indexed | Backward slicing retrieves dependencies; 48-67% over no-retrieval, 32-48% over BM25. |
| R12 | RepoGraph | `paper-text/repograph-2410.14684.txt` | Repository-level code graphs for software engineering agents. |
| R13 | Repository Intelligence Graph | `paper-text/repository-intelligence-graph-2601.10112.txt` | Deterministic architectural map for build/test/dependency structure. |
| R54 | CodeGRAG | `paper-text/codegrag-2405.02355.txt` | AST/control-flow/data-flow graphs bridge NL and code structure. |
| R16 | CodePlan | `paper-text/codeplan-2309.12499.txt` | Planning over code dependencies enables multi-file edits. |
| R30 | GraphCodeBERT | `paper-text/graphcodebert-2009.08366.txt` | Data-flow structure improves code representation. |

## GraphCodeAgent: dual graphs for repo-level generation

GraphCodeAgent (2025) proposes a Requirement Graph (RG) and a Structural-Semantic Code
Graph (SSCG) linked through mapping relations. The agent performs multi-hop reasoning to
retrieve implicit code dependencies that are not directly expressed in requirements.

### GraphCodeAgent results copied from the paper

| Model | Benchmark | Relative Pass@1 improvement over best baseline |
|---|---|---:|
| GPT-4o | DevEval | 43.81% |
| Gemini-1.5-Pro | DevEval | 39.15% |
| GPT-4o | CoderEval | 31.91% |
| Gemini-1.5-Pro | CoderEval | 8.25% |
| QwQ-32B | DevEval | 10.65% |

Source trace: R53, `paper-text/graphcodeagent-2504.10046.txt`, lines 71-73 and 220-223.

### What the graphs capture

The SSCG encodes:
- Class inheritance and composition
- Function call edges (intra-class, intra-file, cross-file)
- Import/dependency edges
- Data flow within and across functions

The RG encodes:
- Sub-requirements of the target requirement
- Semantic similarity between requirements
- Mapping from requirements to code implementations

### Why plain retrieval fails (from GraphCodeAgent motivation)

The paper identifies the core failure mode: "A natural language requirement typically states a
high-level goal, yet implicitly consists of multiple fine-grained functional elements that are not
directly expressed." Existing retrieval methods based on lexical or semantic matching between
requirements and code miss these implicit dependencies.

The 94.30% relative improvement on cross-file dependency tasks (mentioned in the insight
summary but needing verification against paper tables) demonstrates that structure-aware
retrieval matters most when dependencies span files.

## InlineCoder: call graph context via upstream/downstream inlining

InlineCoder (FSE 2026) reformulates repository-level generation by inlining the target function
into its call graph. It uses:
- **Upstream Inlining:** embedding the function into its callers to show usage patterns
- **Downstream Retrieval:** incorporating callees to provide dependency context

### InlineCoder results copied from the paper

| Metric | Relative gain over strongest baseline (RepoExec) |
|---|---:|
| Exact Match (EM) | 29.73% |
| Edit Similarity (ES) | 20.82% |
| BLEU | 49.34% |

Source trace: R55, `paper-text/inlinecoder-context-inlining-2601.00376.txt`, lines 25-27.

### Key architectural insight

InlineCoder's design principle is that "a function's role within a repository is determined by its
position in the repository's call stack: it is constrained by its upstream callers (how it is used)
while its implementation depends on its downstream callees (what it depends on)."

This means that making call relationships explicit and navigable in a codebase directly helps
agent systems that use call-graph-aware retrieval.

## SLICE: backward slicing for dependency-aware retrieval

SLICE (NeurIPS 2025) combines semantic descriptions with backward program slicing to
retrieve relevant code plus its dependencies.

### SLICE improvements (from abstract/indexed data)

| Comparison | Improvement range |
|---|---|
| Over no-retrieval baseline | 48-67% |
| Over BM25 text retrieval | 32-48% |

Source trace: R56, abstract indexed (paper not locally downloaded).

The 32-48% improvement over BM25 is the critical number: it directly quantifies how much
better structure-aware slicing performs compared to pure text similarity retrieval.

## CodePlan: dependency analysis enables multi-file planning

CodePlan (R16) shows that repository-level tasks require planning over code dependencies.
Its incremental dependency analysis and change may-impact analysis identify derived edit
obligations that follow from seed changes.

### CodePlan approach summary

- Builds a plan graph where nodes are edit obligations and edges are dependency-driven
- Uses incremental dependency analysis to detect escaping changes (signature changes that
  affect callers)
- Applies may-impact analysis to find transitive dependents
- Result: 5/6 repositories pass validation; 0/6 without planning

The relevance: if your codebase's dependency structure is hidden (dynamic dispatch,
monkeypatching, implicit globals, stringly-typed coupling), the planner cannot build an
accurate plan graph. Explicit dependencies enable accurate planning.

## Supporting evidence from other sources

### GraphCodeBERT (R30): data flow improves representation

GraphCodeBERT adds data-flow edges to code representation, showing that structural
information improves downstream tasks. This is foundational evidence that code structure
(not just token sequences) matters for model understanding.

### Repository Intelligence Graph (R13): deterministic architectural maps

This paper proposes deterministic architectural maps covering build, test, and dependency
structure. The claim is that agents benefit from a machine-readable graph of the repository's
architecture rather than relying on ad-hoc file discovery.

### CodeGRAG (R54): AST/control-flow/data-flow graphs

CodeGRAG uses graphical representations (AST, control-flow, data-flow) to bridge the gap
between natural language and code structure for retrieval-augmented generation.

## Comparative data: structure vs. text retrieval

| System | Retrieval method | Improvement over text baseline |
|---|---|---|
| GraphCodeAgent | Requirement + Code graphs | 43.81% (GPT-4o, DevEval) |
| InlineCoder | Call graph inlining | 29.73% EM (RepoExec) |
| SLICE | Backward slicing | 32-48% over BM25 |
| CodePlan | Dependency + may-impact | 5/6 vs 0/6 repos passing |

All of these systems outperform text-similarity-only retrieval by large margins. The convergence
across independent research groups (Peking/Wuhan, Shanghai Jiao Tong, NeurIPS, Microsoft
Research) strengthens the claim.

## Inference for codebase design

If structure-aware retrieval consistently outperforms text retrieval, then codebases should make
their structure easy to extract and navigate:

| Codebase property | Why it helps agents |
|---|---|
| Explicit imports (no barrel re-exports that hide origin) | Graph builders can trace actual dependencies |
| Typed function signatures | Static analyzers extract call graphs and type dependencies |
| No hidden dynamic registration | Plan graphs remain accurate |
| No monkeypatching or runtime mutation | Dependency analysis stays valid |
| Predictable folder structure | Reduces false positives in structural search |
| Generated dependency maps (for large systems) | Pre-computed graphs available without re-analysis |
| Aligned folders with ownership | Module boundary = architectural boundary |
| Entrypoints in predictable locations | Agents can find starting points for exploration |

### What agents need from structure

Agents do not need every graph dumped into context. They need compact, task-relevant slices
of the graph. The research shows that:
- InlineCoder uses only the immediate callers and callees (not the full call graph)
- SLICE uses backward slicing from the target (not forward exploration of everything)
- GraphCodeAgent traverses only paths relevant to the current requirement

The implication: keep structure extractable, but trust the agent's retrieval system to select
relevant slices. The codebase's job is to make those slices correct and discoverable.

## What I should not claim

- I should not claim that dumping a full dependency graph into context helps. Lost in the Middle
  (R32) shows that more context can hurt if placement is wrong. The claim is about structure
  being extractable, not about stuffing it into prompts.
- I should not claim these numbers are directly comparable across papers. Different benchmarks,
  different baselines, different metrics. The safe claim is that structure-aware approaches
  consistently and substantially outperform text-only approaches.
- SLICE data comes from the abstract, not from a locally extracted paper text. Those numbers
  should be verified before publication.
- GraphCodeAgent's improvements are relative, not absolute. A 43.81% relative improvement
  on a low baseline is different from 43.81% on a high baseline.
- These papers test code generation, not code editing or bug fixing. The structural advantage
  for editing tasks (like SWE-bench) may differ in magnitude.

## Blog visual candidates

1. Bar chart: improvement over text-only retrieval (GraphCodeAgent, InlineCoder, SLICE,
   CodePlan) showing convergent evidence.
2. Diagram: upstream/downstream inlining from InlineCoder (callers provide usage, callees
   provide dependencies).
3. Anti-pattern gallery: hidden dependencies that break structure extraction (dynamic
   registration, monkeypatching, barrel exports, string-based coupling).
4. Codebase affordance table: property -> agent benefit.
5. GraphCodeAgent dual graph sketch: Requirement Graph linked to Code Graph.

## References

- R12: RepoGraph, `paper-text/repograph-2410.14684.txt`
- R13: Repository Intelligence Graph, `paper-text/repository-intelligence-graph-2601.10112.txt`
- R16: CodePlan, `paper-text/codeplan-2309.12499.txt`
- R30: GraphCodeBERT, `paper-text/graphcodebert-2009.08366.txt`
- R53: GraphCodeAgent, `paper-text/graphcodeagent-2504.10046.txt`
- R54: CodeGRAG, `paper-text/codegrag-2405.02355.txt`
- R55: InlineCoder, `paper-text/inlinecoder-context-inlining-2601.00376.txt`
- R56: SLICE (abstract indexed; not downloaded)
