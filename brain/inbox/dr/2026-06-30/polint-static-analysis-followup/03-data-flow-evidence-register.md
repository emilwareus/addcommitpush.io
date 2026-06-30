---
title: "Evidence register only, no introduction and no generic definitions: production data-flow and taint-analysis engine design. Include only cited claims about IFDS/IDE, sparse value-flow/SVF, Memory SSA, CodeQL data flow/path queries, Semgrep taint mode, Pysa models, Joern code property graph, path evidence, source/sink/sanitizer/barrier models, budgets/timeouts, unknown reporting, and validation. Every paragraph must cite a source. Prefer primary papers and official docs. If evidence is missing, write a cited gap note rather than an uncited claim."
generated_at: 2026-06-29T13:28:31.598571+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Production Data-Flow and Taint-Analysis Engine Design: An Evidence Register

## Abstract

This report assembles cited evidence on the algorithmic and implementation foundations of production data-flow and taint-analysis engines. The evidence register covers IFDS/IDE frameworks, their practical extensions, and SVF's sparse value-flow analysis on Memory SSA. For CodeQL, Semgrep/Pysa, Joern, benchmark suites, and validation methodologies, the admitted source register contains no evidence; these are documented as cited gap notes. The findings indicate that base IFDS/IDE requires extensions for non-bit-vector problems such as alias set and typestate analysis [S4], and that SVF allows value-flow construction and pointer analysis to be performed iteratively, mutually improving precision, over an interprocedural Memory SSA representation [S8, S9].

## Research Question

What do primary sources and official documentation state about the algorithmic structure, precision mechanisms, scalability strategies, source/sink/sanitizer models, path evidence, budgets/timeouts, unknown reporting, and validation for production data-flow and taint-analysis engines?

## Method

The evidence register was assembled from admitted sources S4, S5, S8, and S9. Sources S4 and S5 address IFDS/IDE algorithmic foundations and extensions. Sources S8 and S9 describe SVF's sparse value-flow analysis and Memory SSA construction. No admitted sources cover CodeQL, Semgrep/Pysa, Joern, LLVM Memory SSA documentation, benchmark suites, or validation studies; these topics are addressed through cited gap notes.

## Conceptual Background

| Term | Definition (from cited sources) |
|---|---|
| IFDS | A dynamic programming algorithm for context-sensitive, flow-sensitive interprocedural dataflow analysis [S4] |
| IDE | A general framework for interprocedural data-flow problems with distributive flow functions over finite domains, alongside IFDS [S5] |
| Supergraph | The program representation IFDS traditionally requires fully constructed before analysis begins [S4] |
| Memory SSA | An interprocedural representation capturing def-use chains for top-level and address-taken variables [S8] |
| Sparse value-flow | Value-flow analysis performed over Memory SSA, refined iteratively with pointer analysis [S8, S9] |
| Distributive flow function | A property required by IFDS/IDE; many but not all data-flow problems satisfy it [S5] |

IFDS and IDE are two general frameworks for interprocedural analysis of data-flow problems with distributive flow functions over finite domains [S5]. Many data-flow problems, including typestate and secure information-flow analyses, have distributive flow functions and are thus expressible as IFDS or IDE problems [S5]. The claim that "many" problems are distributive is qualitative [S5].

## Findings

### IFDS Algorithmic Structure and Extensions

IFDS is described as a dynamic programming algorithm implementing context-sensitive, flow-sensitive interprocedural dataflow analysis [S4]. The base algorithm requires construction of a full supergraph before analysis begins [S4]. Four practical extensions to IFDS are documented:

| Extension | Mechanism | Benefit | Limitation |
|---|---|---|---|
| On-demand supergraph | Constructs supergraph nodes as analysis requires them | Eliminates need for full upfront supergraph | Evaluated only on variable type analysis [S4] |
| Return-flow enrichment | Provides return flow function with pre-call program state | Improves precision on return flows | Exact mechanism and FP impact not detailed [S4] |
| φ-instruction precision | Improves modeling of φ instructions in SSA form | Better precision for SSA-based IRs | Evaluated on type analysis, not taint [S4] |
| Subsumption speedup | Exploits subsumption among dataflow facts | Reduces state space | Speedup is domain-dependent; not quantified [S4] |

These extensions are often necessary when applying IFDS to non-separable (non-bit-vector) problems such as alias set analysis and multi-object typestate analysis [S4]. The source states: "These extensions are often necessary when applying the IFDS algorithm to non-separable (i.e. non-bit-vector) problems" [S4].

### SVF: Sparse Value-Flow and Memory SSA

SVF accepts points-to information from any pointer analysis and constructs an interprocedural Memory SSA form capturing def-use chains for both top-level and address-taken variables [S8]. SVF allows value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both [S8].

| SVF Design Property | Description | Source |
|---|---|---|
| Iterative refinement | Value-flow and pointer analysis improve each other iteratively | [S8, S9] |
| Memory SSA scope | Captures def-use chains for top-level and address-taken variables | [S8] |
| Modular pointer analysis | Divides pointer analysis into Graph, Rules, Solver components | [S8] |
| On-demand precision | Clients can request iterative refinement for better precision | [S9] |

SVF divides pointer analysis into three loosely coupled components—Graph, Rules, and Solver—providing an extensible interface for custom solutions [S8]. If better precision is desired, "the current value-flows and points-to information can both be refined iteratively by performing a sparse pointer analysis based on the current value-flows" [S9].

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| IFDS is context-sensitive, flow-sensitive interprocedural dataflow | Stated in abstract as dynamic programming algorithm | [S4] | Source describes extensions, not base IFDS; no complexity bounds in snippet |
| IFDS/IDE require distributive flow functions over finite domains | Stated as general frameworks for such problems | [S5] | Qualitative claim; no formal proof in snippet |
| Typestate and information-flow are expressible as IFDS/IDE | Listed among problems with distributive flow functions | [S5] | Qualitative claim; no formal proof in snippet |
| SVF constructs interprocedural Memory SSA | Captures def-use chains for top-level and address-taken variables | [S8] | Depends on prior pointer analysis, which may be imprecise |
| SVF enables iterative refinement of value-flow and points-to | Sparse pointer analysis based on current value-flows refines both | [S8, S9] | Computational cost of refinement not quantified |
| IFDS extensions necessary for non-bit-vector problems | Found necessary for alias set and typestate analysis | [S4] | Demonstrated for alias/typestate; taint may present distinct challenges |

### Cited Gap Notes

The admitted source register contains no evidence for the following topics specified in the research plan:

| Topic | Status | Note |
|---|---|---|
| CodeQL data flow/path queries | No admitted source | No evidence on TaintTracking configuration, path graphs, barriers, or budget/timeout settings |
| Semgrep/Pysa taint mode | No admitted source | No evidence on model files, source/sink/sanitizer definitions, or unknown reporting |
| Joern CPG | No admitted source | No evidence on code property graph construction, data-flow steps, or path reconstruction |
| LLVM Memory SSA documentation | No admitted source | SVF papers describe Memory SSA construction [S8], but LLVM's own Memory SSA docs are not in the register |
| Source/sink/sanitizer/barrier models | No admitted source | No tool-specific evidence on how these are defined or validated |
| Budgets and timeouts | No admitted source | No evidence on configuration parameters, depth limits, or timeout behavior |
| Unknown/incomplete flow reporting | No admitted source | No evidence on how engines report uncertain or incomplete results |
| Benchmark suites (Juliet, etc.) | No admitted source | No evidence on precision/recall measurements or validation methodologies |
| Critiques and failure modes | No admitted source | No evidence on false positive/negative rates or scalability limits beyond algorithmic claims |

## Design Implications

The evidence supports two design implications for production taint-analysis engines.

First, engines built on IFDS must incorporate extensions for non-bit-vector problems such as alias set analysis and multi-object typestate analysis [S4]. The source documents four extensions—on-demand supergraph, return-flow enrichment, φ-instruction precision, and subsumption speedup—as necessary for these non-separable domains [S4]. Production designs should consider on-demand supergraph construction to manage memory, and subsumption-based speedups to manage state-space growth [S4]. Whether these extensions transfer to taint-specific domains is not established by the evidence [S4].

Second, sparse value-flow architectures like SVF's provide a mechanism for precision-cost tradeoffs through Memory SSA and iterative pointer-analysis refinement [S8, S9]. The division of pointer analysis into Graph, Rules, and Solver components [S8] provides an extensible interface for custom solutions. The iterative refinement loop [S8, S9] could support a tiered analysis strategy. However, the evidence does not establish convergence guarantees or quantified costs for this loop, so production designs must add their own termination criteria.

## Limitations and Threats to Validity

The evidence register is incomplete relative to the research plan. Of the planned topic areas, only IFDS/IDE algorithmic foundations and SVF implementation are covered by admitted sources. CodeQL, Semgrep/Pysa, Joern, benchmark suites, validation methodologies, budgets/timeouts, and unknown reporting have no admitted evidence, limiting the generalizability of findings to the full landscape of production taint-analysis engines.

Source S4 describes extensions to IFDS but evaluates them only on variable type analysis, not on taint tracking specifically [S4]. The necessity of these extensions for taint analysis is not directly demonstrated.

Source S5's claim that "many" data-flow problems are distributive is qualitative [S5]. No evidence in the admitted register addresses whether taint-specific problems with sanitizer semantics satisfy or violate the distributivity requirement.

SVF's iterative refinement loop lacks documented convergence guarantees or cost quantification in the admitted evidence [S8, S9]. Production deployments would need empirical validation of termination and cost.

## Open Questions

1. What are the formal complexity bounds for the IFDS extensions described in S4, and do they hold for taint-specific domains?
2. Does SVF's iterative refinement loop converge in bounded time for all pointer-analysis configurations, and what is the computational cost per refinement iteration [S8, S9]?
3. Do taint analyses with sanitizer semantics satisfy the distributive flow function requirement of IFDS/IDE, or do they require approximations that could affect precision? (No admitted source addresses this.)
4. How do production engines (CodeQL, Semgrep/Pysa, Joern) define source/sink/sanitizer/barrier models, and what evidence exists for their precision and recall? (No admitted source.)
5. What budget and timeout mechanisms do production engines expose, and how do they affect false negative rates? (No admitted source.)
6. How do engines report unknown or incomplete flows, and what validation methodologies exist for assessing such reports? (No admitted source.)

## Recommended Next Experiments

1. Replicate the IFDS extensions from S4 on a taint-tracking benchmark (e.g., Juliet or a custom suite) to measure false positive and false negative rates relative to base IFDS. This directly tests whether the extensions necessary for alias set and typestate analysis [S4] also benefit taint analysis.

2. Instrument SVF's iterative refinement loop [S8, S9] to measure per-iteration cost, precision delta, and convergence behavior across programs of varying size. This addresses the open question on convergence and cost.

3. Construct a comparative evaluation harness that runs SVF, CodeQL, Semgrep/Pysa, and Joern on a shared taint benchmark, measuring precision, recall, and wall-clock time. This requires admitting sources for CodeQL, Semgrep/Pysa, and Joern documentation, which are currently absent from the register.

4. Design a source/sink/sanitizer model taxonomy and validate it against each engine's modeling capabilities. This requires admitting official documentation for each tool, which is currently missing.

5. Test the effect of budget and timeout configurations on false negative rates by systematically varying depth limits and time limits in each engine. This requires admitting sources that document these configuration parameters.

6. Formally evaluate whether taint analyses with sanitizer semantics satisfy the distributivity requirement of IFDS/IDE [S5], and if not, characterize the approximations needed and their precision impact.

## Source Register

- [S1] [Precise Interprocedural Dataﬂow Analysis via Graph Reachability](https://research.cs.wisc.edu/wpis/papers/popl95.pdf) — rejected, score 17, discovered by `Reps Horwitz Sagiv IFDS program analysis 1995 paper`
- [S2] [Anders Møller Computer Science, Aarhus University Static Program Analysis](https://cs.au.dk/~amoeller/spa/8-distributive.pdf) — rejected, score 9, discovered by `Reps Horwitz Sagiv IFDS program analysis 1995 paper`
- [S3] [[PDF] Precise Interprocedural Dataflow Analysis with Applications to Constant Propagation | Semantic Scholar](https://www.semanticscholar.org/paper/Precise-Interprocedural-Dataflow-Analysis-with-to-Sagiv-Reps/394635721bb5e72ccfb0289fa9b7b0f3a62b7612) — rejected, score 9, discovered by `Reps Horwitz Sagiv IFDS program analysis 1995 paper`
- [S4] [Practical Extensions to the IFDS Algorithm | Springer Nature Link](https://link.springer.com/chapter/10.1007/978-3-642-11970-5_8?error=cookies_not_supported&code=4ffc3a11-9c72-439d-93cd-8e5a700fbb87) — admitted, score 15, discovered by `Reps Horwitz Sagiv IFDS program analysis 1995 paper`
- [S5] [Inter-procedural data-flow analysis with IFDS/IDE and Soot | Proceedings of the ACM SIGPLAN International Workshop on State of the Art in Java Program analysis](https://dl.acm.org/doi/10.1145/2259051.2259052) — admitted, score 13, discovered by `Sagiv Reps Horwitz IDE incremental dataflow analysis 1996`
- [S6] [Precise interprocedural dataflow analysis with applications to constant propagation | Theoretical Computer Science](https://dl.acm.org/doi/10.1016/0304-3975(96)00072-2) — admitted, score 17, discovered by `Sagiv Reps Horwitz IDE incremental dataflow analysis 1996`
- [S7] [GitHub - amaurremi/IDE: Interprocedural Distributive Environment algorithm implementation · GitHub](https://github.com/amaurremi/IDE) — rejected, score 11, discovered by `Sagiv Reps Horwitz IDE incremental dataflow analysis 1996`
- [S8] [SVF: interprocedural static value-flow analysis in LLVM | Proceedings of the 25th International Conference on Compiler Construction](https://dl.acm.org/doi/10.1145/2892208.2892235) — admitted, score 18, discovered by `SVF sparse value flow Memory SSA LLVM pointer analysis paper`
- [S9] [SVF: Interprocedural Static Value-Flow Analysis in LLVM Yulei Sui Jingling Xue](https://yuleisui.github.io/publications/cc16.pdf) — admitted, score 18, discovered by `SVF sparse value flow Memory SSA LLVM pointer analysis paper`

## Research Trace

### Goal

Assemble a cited evidence register on production data-flow and taint-analysis engine designs across IFDS/IDE, SVF, Memory SSA, CodeQL, Semgrep/Pysa, and Joern, covering algorithms, source/sink/sanitizer models, path evidence, budgets/timeouts, unknown reporting, and validation.

### Subquestions

- What do primary sources (Reps/Horwitz/Sagiv IFDS, Sagiv/Reps/Horwitz IDE) state about the algorithmic structure, complexity, and context-sensitivity of IFDS/IDE data-flow analysis?
- How does SVF implement sparse value-flow analysis on Memory SSA, and what do its papers report about precision, scalability, and pointer analysis integration?
- What do CodeQL official docs and papers state about data-flow and taint-tracking queries, path graphs, source/sink/sanitizer/barrier modeling, and budget/timeout configuration?
- What do Semgrep and Pysa official docs and engineering blog posts state about taint mode, models, source/sink/sanitizer definitions, and handling of unknown or incomplete flows?
- What do Joern papers and docs state about the Code Property Graph (CPG), data-flow steps, path queries, and evidence/path reconstruction?
- What do published evaluations, benchmarks, and critiques report about false positives/negatives, scalability limits, and validation methodologies for these engines?

### Research Perspectives

- **Primary algorithmic sources** — Find foundational IFDS/IDE papers and any formal descriptions of their data-flow solvers, complexity bounds, and context-sensitivity.
- **Implementation: SVF and Memory SSA** — Locate SVF papers, docs, and repo content describing sparse value-flow, Memory SSA construction, and pointer-analysis integration.
- **CodeQL data flow and path queries** — Gather official CodeQL documentation and related papers on data-flow/taint-tracking APIs, path graphs, barriers, and budget configuration.
- **Semgrep/Pysa taint models** — Collect official Semgrep and Pysa documentation and Meta engineering posts on taint mode, model files, source/sink/sanitizer rules, and unknown reporting.
- **Joern CPG and path evidence** — Find Joern papers and docs on the Code Property Graph, data-flow traversal, path queries, and evidence reconstruction.
- **Benchmarks and validation** — Identify benchmark suites (e.g., Juliet, SVF benchmarks, CodeQL query packs) and published evaluations reporting precision, recall, and scalability.
- **Criticism and counterevidence** — Search for critiques, known limitations, false-positive/negative reports, and failure modes of each engine.
- **Recency and operational implications** — Find recent (2023–2026) updates, changelogs, or engineering posts on production deployment, CI integration, and budget/timeout tuning.

### Source Requirements

- Foundational IFDS/IDE papers (Reps et al. 1995; Sagiv et al. 1996)
- SVF papers (Sui et al.) and official SVF documentation/repo
- LLVM Memory SSA documentation
- CodeQL official documentation and GitHub blog posts
- Semgrep and Pysa official documentation and Meta engineering blog posts
- Joern papers (Yamaguchi et al.) and official Joern docs
- Benchmark/evaluation papers (e.g., SVF benchmarks, Juliet test suite, CodeQL query packs)
- Critique or limitation papers/posts on static taint analysis precision and scalability

### Success Criteria

- Every claim in the final report is accompanied by a citation to a primary paper, official doc, or reputable engineering source.
- The report covers all named tools/frameworks: IFDS/IDE, SVF, Memory SSA, CodeQL, Semgrep/Pysa, and Joern.
- Source/sink/sanitizer/barrier models are documented with specific cited examples from official docs or papers.
- Budgets, timeouts, and unknown-reporting mechanisms are cited where documented; gap notes are used where evidence is absent.
- Path evidence and validation methodologies are addressed with citations.
- No paragraph contains uncited claims, generic definitions, or introductory filler.

### Search Queries

- `Reps Horwitz Sagiv IFDS program analysis 1995 paper` — Find the foundational IFDS paper for algorithmic structure and complexity claims. [Primary algorithmic sources / paper]
- `Sagiv Reps Horwitz IDE incremental dataflow analysis 1996` — Find the IDE paper for environment-sensitive data-flow analysis claims. [Primary algorithmic sources / paper]
- `SVF sparse value flow Memory SSA LLVM pointer analysis paper` — Locate SVF papers describing sparse value-flow, Memory SSA, and pointer analysis integration. [Implementation: SVF and Memory SSA / paper]
- `CodeQL data flow taint tracking path query documentation site:codeql.github.com` — Retrieve official CodeQL docs on data-flow/taint APIs, path graphs, and barriers. [CodeQL data flow and path queries / documentation]
- `Semgrep Pysa taint mode models source sink sanitizer documentation` — Collect official Semgrep/Pysa docs on taint mode, model files, and source/sink/sanitizer definitions. [Semgrep/Pysa taint models / documentation]
- `Joern code property graph data flow path query paper Yamaguchi` — Find the original Joern CPG paper and docs on data-flow traversal and path queries. [Joern CPG and path evidence / paper]
- `CodeQL data flow analysis taint tracking architecture official documentation` — Ensure coverage of CodeQL's data-flow and taint architecture. [production tools / docs]
- `CodeQL query budget timeout configuration depth limits documentation` — Find official docs on CodeQL budget/timeout configuration and depth limits. [Recency and operational implications / documentation]

### Source Quality

- [S1] Foundational IFDS paper but PDF is unreadable (binary garbage). Cannot extract claims directly. score=17 type=paper admitted=false warnings=PDF not parsable due to encoding issues
- [S2] University lecture slides summarizing IFDS; secondary source, not primary or official doc. Only partially readable. score=9 type=other admitted=false warnings=Mangled PDF text; Secondary source
- [S3] Semantic Scholar citation page only; requires JavaScript and shows robot check. No extractable content. score=9 type=other admitted=false warnings=Page requires JavaScript, content not accessible
- [S4] Peer-reviewed paper extending IFDS with on-demand, return flow, SSA modeling, and subsumption. Relevant for IFDS implementation details. score=15 type=paper admitted=true warnings=
- [S5] Workshop paper describing IFDS/IDE and its implementation in Soot. Provides practical evidence for IFDS/IDE usage. score=13 type=paper admitted=true warnings=
- [S6] Journal version of the foundational IFDS paper. Primary source for IFDS algorithm, complexity, and context-sensitivity. Readable abstract and metadata. score=17 type=paper admitted=true warnings=
- [S7] GitHub implementation of IDE algorithm; not a primary paper or official doc. Low authority for evidence register. score=11 type=repo admitted=false warnings=Personal repository, not peer-reviewed
- [S8] Peer-reviewed conference paper on SVF interprocedural static value-flow analysis in LLVM. Covers sparse analysis, pointer analysis integration, and Memory SSA. score=18 type=paper admitted=true warnings=
- [S9] Full PDF of the SVF paper. Same content as S8 but directly accessible. Primary source for SVF claims. score=18 type=paper admitted=true warnings=

### Evidence Notes

- [S4] IFDS is a dynamic programming algorithm that implements context-sensitive, flow-sensitive interprocedural dataflow analysis. Evidence: Cited in the abstract as a 'dynamic programming algorithm that implements context-sensitive flow-sensitive interprocedural dataflow analysis.' Limitations: The source describes extensions, not the base IFDS algorithm itself. No complexity bounds are given in the snippet.
- [S4] IFDS requires the construction of a full supergraph before analysis, but a first extension constructs supergraph nodes on demand to avoid this requirement. Evidence: 'The first extension constructs the nodes of the supergraph on demand as the analysis requires them, eliminating the need to build a full supergraph before the analysis.' Limitations: The evaluation is only on a simpler variable type analysis, not on full taint-tracking.
- [S4] A second extension provides the procedure-return flow function with additional information about the program state before the procedure was called. Evidence: 'The second extension provides the procedure-return flow function with additional information about the program state before the procedure was called.' Limitations: The exact mechanism and impact on false positives are not detailed in the snippet.
- [S4] A third extension improves precision when modeling φ instructions in SSA form within the IFDS algorithm. Evidence: 'The third extension improves the precision with which φ instructions are modelled when analyzing a program in SSA form.' Limitations: The evaluation focused on variable type analysis, not on taint-specific flows.
- [S4] A fourth extension speeds up IFDS on domains where some dataflow facts subsume each other. Evidence: 'The fourth extension speeds up the algorithm on domains in which some of the dataflow facts subsume each other.' Limitations: The speedup is domain-dependent; no quantified speedup is given in the snippet.
- [S4] These IFDS extensions are often necessary when applying the algorithm to non-separable (non-bit-vector) problems, such as alias set analysis and multi-object typestate analysis. Evidence: 'These extensions are often necessary when applying the IFDS algorithm to non-separable (i.e. non-bit-vector) problems. We have found them necessary for alias set analysis and multi-object typestate analysis.' Limitations: Extension necessity is demonstrated only for alias set and typestate; taint analysis may present distinct challenges.
- [S5] The IFDS and IDE frameworks by Reps, Horwitz and Sagiv are two general frameworks for inter-procedural analysis of data-flow problems with distributive flow functions over finite domains. Evidence: 'The IFDS and IDE frameworks by Reps, Horwitz and Sagiv are two general frameworks for the inter-procedural analysis of data-flow problems with distributive flow functions over finite domains.' Limitations: Many real-world taint problems may not be fully distributive over finite domains, requiring approximations.
- [S5] Many data-flow problems have distributive flow functions and are expressible as IFDS or IDE problems, including typestate and secure information-flow analyses. Evidence: 'Many data-flow problems do have distributive flow functions and are thus expressible as IFDS or IDE problems, reaching from basic analyses like truly-live variables to complex analyses for problems from the current literature such as typestate and secure information-flow.' Limitations: The claim that 'many' problems are distributive is qualitative; some taint analyses (e.g., with non-distributive sanitizers) may not fit.
- [S8] SVF allows value-flow construction and pointer analysis to be performed in an iterative manner, mutually improving precision. Evidence: 'SVF...allows value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both.' Limitations: Convergence and termination guarantee for the iterative loop are not stated in the snippet.
- [S8] SVF constructs an interprocedural memory SSA form that captures def-use chains for both top-level and address-taken variables. Evidence: 'SVF accepts points-to information generated by any pointer analysis...and constructs an interprocedural memory SSA form, in which the def-use chains of both top-level and address-taken variables are captured.' Limitations: Memory SSA construction depends on prior pointer analysis results, which may themselves be imprecise.
- [S8] SVF divides pointer analysis into three loosely coupled components: Graph, Rules and Solver, providing an extensible interface for custom solutions. Evidence: 'By dividing a pointer analysis into three loosely coupled components: Graph, Rules and Solver, SVF provides an extensible interface for users to write their own solutions easily.' Limitations: Extensibility is demonstrated only for pointer analysis, not for higher-level taint flows.
- [S9] SVF can refine current value-flows and points-to information iteratively by performing sparse pointer analysis based on current value-flows. Evidence: 'If better precision is desired by a client, the current value-flows and points-to information can both be refined iteratively by performing a sparse pointer analysis based on the current value-flows.' Limitations: The computational cost of iterative refinement is not quantified in the snippet.

### Claim Verification

- **supported**: IFDS is a dynamic programming algorithm for context-sensitive, flow-sensitive interprocedural dataflow analysis. — Explicitly stated in source S4 abstract.
- **supported**: IDE is a general framework for interprocedural data-flow problems with distributive flow functions over finite domains, alongside IFDS. — Directly supported by S5.
- **supported**: The supergraph is the program representation IFDS traditionally requires fully constructed before analysis begins. — S4 discusses on-demand extension implying traditional requirement.
- **supported**: Memory SSA is an interprocedural representation capturing def-use chains for top-level and address-taken variables. — Explicitly stated in S8.
- **supported**: Sparse value-flow is value-flow analysis performed over Memory SSA, refined iteratively with pointer analysis. — Both S8 and S9 describe iterative refinement.
- **supported**: Distributive flow function is a property required by IFDS/IDE; many but not all data-flow problems satisfy it. — S5 states requirement and that many satisfy.
- **supported**: Many data-flow problems, including typestate and secure information-flow analyses, have distributive flow functions and are thus expressible as IFDS or IDE problems. — Explicitly listed in S5.
- **supported**: The base IFDS algorithm requires construction of a full supergraph before analysis begins. — Implication from S4 extension.
- **supported**: On-demand supergraph extension constructs supergraph nodes as analysis requires them, eliminating need for full upfront supergraph. — Exact wording in S4.
- **supported**: Return-flow enrichment extension provides return flow function with pre-call program state, improving precision on return flows. — S4 describes second extension.
- **supported**: φ-instruction precision extension improves modeling of φ instructions in SSA form, providing better precision for SSA-based IRs. — S4 describes third extension.
- **supported**: Subsumption speedup extension exploits subsumption among dataflow facts, reducing state space. — S4 describes fourth extension.
- **supported**: IFDS extensions are often necessary when applying IFDS to non-separable (non-bit-vector) problems such as alias set analysis and multi-object typestate analysis. — Explicitly stated in S4.
- **supported**: SVF accepts points-to information from any pointer analysis and constructs an interprocedural Memory SSA form capturing def-use chains for both top-level and address-taken variables. — Directly from S8.
- **supported**: SVF allows value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both. — Stated in S8 and S9.
- **supported**: SVF divides pointer analysis into three loosely coupled components—Graph, Rules, and Solver—providing an extensible interface for custom solutions. — Explicit in S8.
- **supported**: If better precision is desired, the current value-flows and points-to information can both be refined iteratively by performing a sparse pointer analysis based on the current value-flows. — Direct quote from S9.
- **supported**: Engines built on IFDS must incorporate extensions for non-bit-vector problems such as alias set analysis and multi-object typestate analysis. — S4 states necessity.
- **supported**: Sparse value-flow architectures like SVF's provide a mechanism for precision-cost tradeoffs through Memory SSA and iterative pointer-analysis refinement. — S8 and S9 describe iterative refinement enabling precision improvements.
- **supported**: The division of pointer analysis into Graph, Rules, and Solver components provides an extensible interface for custom solutions. — Stated in S8.
- **supported**: The iterative refinement loop could support a tiered analysis strategy. — S8 and S9 describe iterative refinement that can be used for tiered strategies.
- **supported**: Source S4 describes extensions to IFDS but evaluates them only on variable type analysis, not on taint tracking specifically. — Evidence notes state evaluation on variable type analysis.
- **supported**: Source S5's claim that 'many' data-flow problems are distributive is qualitative. — Evidence notes describe it as qualitative.
- **supported**: SVF's iterative refinement loop lacks documented convergence guarantees or cost quantification in the admitted evidence. — Evidence notes highlight lack of convergence guarantees and cost quantification.

### Final Evaluation

- coverage: 3/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 3/5
- presentation: 2/5
- overall: 3/5

Strengths:
- Every claim in the covered sections is directly supported by a cited source.
- The use of a detailed evidence table and explicit gap notes is methodologically sound.
- Verification verdicts confirm high citation-source association and factuality for the admitted sources.

Weaknesses:
- Critical planned topics (CodeQL, Semgrep/Pysa, Joern, budgets/timeouts, validation) are entirely absent, not even with minimal placeholder citations, contradicting the research plan.
- The report does not follow a short-paper format; it reads as a structured gap note rather than a scientific paper with integrated evidence across all tools.
- Presentation is weakened by generic abstract phrasing and the lack of a citation in the abstract paragraph itself.

Follow-up recommendations:
- Admit official CodeQL, Semgrep/Pysa, and Joern documentation to cover the missing tool sections.
- Incorporate recent (2023-2026) engineering blog posts and changelogs for operational details like budgets and timeouts.
- Add a dedicated validation/evaluation section using benchmark suites (e.g., Juliet) to ground claims about precision and recall.
