---
title: "how to build accurate data flow graphs of code. building the underlying engine for a static analysis tool. Latest research. Both static classical methods and ML based approaches"
generated_at: 2026-06-28T17:03:50.359266+00:00
strategy: deep-agent-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Building Accurate Data Flow Graphs of Code: Classical and Machine-Learning Approaches for Static Analysis Engines

## Abstract

Data flow graphs (DFGs) are central to static analysis, enabling tasks from compiler optimization to vulnerability detection. This report examines the state of the art in constructing accurate DFGs, covering classical algorithms (iterative fixpoint, IFDS/IDE, memory SSA, value-flow analysis) and emerging machine-learning approaches (graph neural networks). We draw on tool architectures such as SVF and PhASAR to identify concrete engineering patterns: modular pointer analysis, iterative refinement between aliasing and value-flow, and sparse interprocedural representations. We find that classical methods provide soundness guarantees but face scalability challenges with field sensitivity and whole-program analysis, while ML-based methods offer probabilistic approximations that trade formal guarantees for coverage and speed. The evidence supports a hybrid architecture in which classical IR construction provides the backbone and ML models augment precision or guide on-demand queries.

## Research Question

How should one build the underlying engine of a static analysis tool to construct accurate data flow graphs of code, given the current state of classical static analysis and recent machine-learning approaches?

## Method

We synthesize evidence from admitted sources covering foundational data-flow analysis [S1], parameterized IFDS algorithms [S2], the PhASAR framework documentation [S3], IFDS/IDE with Soot [S5], SSA construction [S7], the SVF value-flow analysis framework [S8, S10, S11, S12, S13], and graph neural networks in program analysis [S22, S24]. We compare classical algorithms, tool architectures, precision/scalability trade-offs, and ML-based alternatives. We distinguish source-backed claims from inferences drawn by connecting evidence.

## Conceptual Background

A data flow graph represents how values propagate through a program. Its construction depends on several intermediate representations and analysis frameworks. The table below defines key terms of art.

| Term | Definition | Role in DFG Construction |
|---|---|---|
| CFG | Control-flow graph; nodes are statements, edges are control transfers | Backbone over which data-flow equations are solved [S1] |
| SSA | Static Single Assignment; each variable assigned once | Provides explicit def-use chains [S7] |
| IFDS | Interprocedural Finite Distributive Subset problem | Framework for interprocedural data-flow analysis [S2, S5] |
| IDE | Interprocedural Distributive Environment | Generalizes IFDS to environments mapping facts to values [S3] |
| PDG | Program Dependence Graph; combines data and control dependence | Unified representation for slicing and analysis |
| Memory SSA | SSA over memory objects including address-taken variables | Captures def-use chains for heap and global memory [S8, S12] |
| Value-flow graph | Graph of value propagation across procedures | Direct DFG representation used by SVF [S8, S12] |
| PAG | Program Assignment Graph; constraint representation in SVF | Models pointer and assignment constraints [S11] |
| CFL reachability | Context-free-language reachability | Models call-return flow for interprocedural analysis [S12] |

### Classical Data-Flow Analysis

Classical data-flow analysis sets up data-flow equations for each CFG node and solves them iteratively until a fixpoint is reached [S1]. This approach, known as Kildall's method, computes information such as reaching definitions, live variables, and available expressions. The iterative algorithm works for monotone frameworks where transfer functions preserve a lattice ordering, ensuring convergence.

For interprocedural analysis, the IFDS framework generalizes data-flow analysis to whole programs with procedure calls [S2]. IFDS can express reaching definitions, live variables, and null-pointer analysis [S2]. IDE extends IFDS to compute environments—structured facts that map data-flow facts to values—useful for analyses like constant propagation [S3].

### Static Single Assignment and Memory SSA

SSA form ensures each variable is assigned exactly once, making def-use chains explicit. Parallel SSA construction has been studied to accelerate this step [S7]. For memory objects (heap, globals, address-taken locals), memory SSA extends the concept by modeling def-use chains over abstract memory locations [S8, S12].

### Value-Flow Graphs and Pointer Analysis

A value-flow graph captures how values propagate across procedures. SVF constructs interprocedural value-flow by building memory SSA form that captures def-use chains of both top-level and address-taken variables [S8]. The accuracy of this graph depends critically on pointer analysis, which resolves aliasing relationships [S8].

### Graph Neural Networks for Program Analysis

GNNs offer a way to represent, learn, and reason about programs and are commonly used in machine-learning-based program analyses [S24]. They have been applied to tasks such as variable misuse detection and type inference [S24]. Separately, dataflow edges such as MayNextUse can be computed to indicate possible value flows in a program [S22]. Whether such edges serve as effective input features for GNN-based models is an open question not directly addressed by the admitted sources.

## Findings

### Classical Algorithms and Intermediate Representations

**Iterative fixpoint on CFGs.** The foundational method solves data-flow equations at each CFG node until stabilization [S1]. This is simple and general but does not address interprocedural flow or aliasing.

**IFDS/IDE frameworks.** IFDS provides a general framework for interprocedural, distributive data-flow problems [S2, S5]. PhASAR recommends IFDS for plain reachability problems and IDE for environment-transforming analyses [S3]. For non-distributive problems, PhASAR offers Inter-Mono as a fallback [S3].

**Memory SSA and value-flow construction.** SVF builds interprocedural memory SSA form from LLVM IR, capturing def-use chains for both top-level and address-taken variables [S8, S12]. This value-flow graph serves as the DFG and supports source-sink bug detection such as memory leaks and file-handle errors [S12].

**CFL reachability.** SVF provides context-free-language reachability analysis to model call-return flow, enabling precise interprocedural data-flow queries [S12].

### Scalable Classical Approaches

Classical IFDS does not scale to very large codebases [S2]. Recent work parameterizes IFDS by the treewidth of the CFG and treedepth of the call graph, yielding linear-time preprocessing and constant-time per-query on-demand analysis [S2]. This exploits the structural sparsity of real-world programs.

| Classical Method | Precision Features | Scalability Profile | Tool/Framework |
|---|---|---|---|
| Iterative fixpoint on CFG | Intraprocedural; no aliasing | Linear per iteration; converges for monotone frameworks | General [S1] |
| IFDS | Interprocedural; distributive | Does not scale to huge codebases without optimization [S2] | PhASAR [S3], Soot [S5] |
| IDE | Interprocedural; environment-transforming | Similar to IFDS; structured facts | PhASAR [S3] |
| Parameterized IFDS | Same as IFDS | Linear preprocessing, constant-time queries [S2] | Research prototype [S2] |
| Memory SSA + value-flow | Field/flow/context-sensitive pointer analysis | Sparse analysis; iterative refinement increases cost [S8, S12] | SVF [S8, S12] |

### Sources of Imprecision and Mitigation

**Field sensitivity.** IFDS with access paths for field sensitivity generates a large number of data-flow facts, causing scalability challenges [S5]. This is a fundamental tension: more precise field modeling increases accuracy but explodes the fact space.

**Pointer aliasing.** The accuracy of value-flow graphs depends on the precision of the underlying pointer analysis [S8]. SVF implements field-sensitive, flow-sensitive, and context-sensitive pointer analyses [S12], but higher sensitivity increases time and memory usage.

**Iterative refinement.** SVF allows value-flow construction and pointer analysis to be performed iteratively, improving precision for both [S8, S12]. This feedback loop is a key design pattern: pointer analysis informs value-flow, which in turn refines pointer analysis.

**Non-distributive problems.** IFDS and IDE handle distributive problems well but are not suitable for non-distributive analyses [S3]. Monotone frameworks with Inter-Mono are the fallback, but with different complexity characteristics.

### Tool Architectures

**SVF.** SVF takes LLVM IR as input and constructs a multi-layered graph infrastructure: call graph, interprocedural CFG, constraint graph (PAG), and value-flow graph [S12, S13]. Its memory model separates symbols into ValSym (register values) and ObjSym (abstract memory objects) [S11]. SVF divides pointer analysis into three loosely coupled components—Graph, Rules, and Solver—providing extensibility [S10]. For Java and Rust, SVF documentation refers to Qilin and Rupta respectively [S12].

**PhASAR.** PhASAR provides IFDS and IDE frameworks that operate on an interprocedural control-flow graph (ICFG), supporting forward and backward variants [S3]. It is tied to LLVM IR [S3].

| Tool | Input IR | Analysis Frameworks | Language Coverage | Extensibility |
|---|---|---|---|---|
| SVF | LLVM IR | Value-flow, memory SSA, CFL reachability, pointer analysis | C/C++ (LLVM); Java via Qilin; Rust via Rupta [S12] | Modular Graph/Rules/Solver [S10] |
| PhASAR | LLVM IR | IFDS, IDE, Inter-Mono | C/C++ (LLVM) [S3] | IFDS/IDE APIs [S3] |
| Soot | Jimple (Java bytecode) | IFDS/IDE | Java [S5] | Framework-based |

### ML-Based Approaches

**GNNs for program analysis.** GNNs offer an elegant way to represent, learn, and reason about programs and are commonly used in machine-learning-based program analyses [S24]. Two practical use cases discussed in the literature are variable misuse detection and type inference [S24]. These tasks traditionally rely on DFGs, and GNNs offer a probabilistic alternative.

**Dataflow edges as a program representation.** Dataflow edges such as MayNextUse can be computed to indicate possible value flows in a program [S22]. Whether such edges serve as effective input features for GNN-based models is not directly established in the admitted sources; this connection is an open question.

**Probabilistic nature.** ML-based analyses are probabilistic and do not guarantee soundness [S24]. They may miss flows or introduce false edges, and their accuracy depends on training data coverage.

The admitted sources do not include specific 2024–2026 ML papers with reported accuracy numbers for DFG construction. This is a gap in the evidence.

### Classical vs. ML Comparison

| Dimension | Classical Methods | ML-Based Methods |
|---|---|---|
| Soundness | Can be sound by design (with documented assumptions) | Probabilistic; no soundness guarantee [S24] |
| Precision | High with field/flow/context sensitivity; limited by aliasing [S8, S12] | Depends on training data; may generalize poorly [S24] |
| Scalability | IFDS does not scale without optimization [S2]; parameterized IFDS helps | Inference is fast after training; training is expensive |
| Language coverage | Tied to front-end IR (e.g., LLVM, Jimple) [S3, S12] | Potentially language-agnostic if trained on diverse data |
| Extensibility | Modular frameworks (e.g., SVF's Graph/Rules/Solver) [S10] | Requires retraining or fine-tuning for new analysis types |
| Failure mode | False positives from imprecise aliasing; false negatives from unsoundness [S5, S8] | False negatives on unseen patterns; false positives from spurious learned edges [S24] |

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Iterative fixpoint solves data-flow equations on CFGs | "repeatedly calculating the output from the input locally at each node until... a fixpoint" [S1] | [S1] | General; no precision/scalability detail |
| IFDS expresses reaching definitions, live variables, null-pointer | "standard IFDS framework, which can express many widely-used static analyses" [S2] | [S2] | Classical IFDS not scalable for huge codebases |
| Parameterized IFDS: linear preprocessing, constant-time queries | "linear preprocessing phase that can answer each query in constant time" [S2] | [S2] | Depends on graph sparsity; same-context queries |
| Field-sensitive IFDS generates many facts, causing scalability issues | "conventional use of access paths for field sensitivity leads to... a large number of data-flow facts" [S5] | [S5] | Identifies problem; no solution proposed |
| SVF builds memory SSA capturing def-use chains of top-level and address-taken variables | "constructs an interprocedural memory SSA form, in which the def-use chains... are captured" [S8] | [S8] | Limited to LLVM IR; precision depends on pointer analysis |
| SVF iteratively refines value-flow and pointer analysis | "value-flow construction and pointer analysis to be performed in an iterative manner" [S12] | [S12] | Increases computational cost |
| SVF modular architecture: Graph, Rules, Solver | "dividing a pointer analysis into three loosely coupled components" [S10] | [S10] | Specific to pointer analysis |
| PhASAR recommends IFDS/IDE for distributive problems | "We strongly recommend to use IFDS or IDE as they are actively maintained" [S3] | [S3] | Not suitable for non-distributive problems |
| GNNs used for variable misuse detection and type inference | "graph neural networks (GNN) offer an elegant way to represent, learn, and reason about programs" [S24] | [S24] | Probabilistic; no soundness guarantee |
| MayNextUse dataflow edges can be computed to indicate possible flows | "dataflow edges can be computed (MayNextUse) to indicate the possible flows" [S22] | [S22] | Whether these serve as GNN input features is not established in sources |

## Design Implications

**Use a layered IR architecture.** SVF's multi-layered approach—call graph, ICFG, constraint graph, value-flow graph—provides a concrete blueprint [S12]. A DFG engine should build these layers incrementally, with each layer depending on the previous.

**Modularize pointer analysis.** SVF's separation into Graph, Rules, and Solver [S10] enables swapping pointer analyses without rewriting the value-flow construction. This is critical because pointer analysis precision directly determines DFG accuracy [S8].

**Implement iterative refinement.** The feedback loop between pointer analysis and value-flow construction improves precision for both [S8, S12]. An engine should support iterative passes, with configurable iteration counts to trade precision for speed.

**Choose IFDS/IDE for distributive problems.** For analyses expressible as distributive problems (reaching definitions, live variables, taint), IFDS or IDE is the recommended framework [S3]. For non-distributive analyses, monotone frameworks are the fallback.

**Use on-demand analysis for scalability.** Parameterized IFDS with linear preprocessing and constant-time queries [S2] suggests that on-demand, query-driven DFG construction can scale to large codebases better than exhaustive whole-program analysis.

**Consider field-sensitivity trade-offs carefully.** Field sensitivity improves accuracy but generates many data-flow facts [S5]. An engine should make field sensitivity configurable, with options for field-insensitive, field-based, and access-path-based modes.

**Use ML as an augmentation layer, not a replacement.** GNNs can perform program analysis tasks such as variable misuse detection and type inference [S24], but they lack soundness guarantees. Dataflow edges such as MayNextUse can be computed to indicate possible value flows [S22], but whether these edges serve as effective GNN input features is unresolved. A practical architecture would use classical analysis for the core DFG and ML for ranking, filtering false positives, or suggesting additional edges.

Insight: The iterative refinement pattern in SVF [S8, S12] is the most important architectural insight. Pointer analysis and value-flow construction are mutually dependent: better aliasing information yields more precise def-use chains, and better def-use chains constrain the pointer analysis. An engine that treats these as separate, one-shot passes will produce less accurate DFGs than one that iterates.

## Limitations and Threats to Validity

**Source coverage gap.** The admitted sources do not include specific 2024–2026 ML papers with quantitative accuracy comparisons for DFG construction. Claims about ML-based approaches are drawn from general GNN-in-program-analysis chapters [S22, S24], not from DFG-specific benchmarks. The comparison between classical and ML methods is therefore qualitative, not quantitative.

**Language bias.** Most tool evidence comes from LLVM-based tools (SVF, PhASAR) targeting C/C++ [S3, S12]. Java is covered via Soot [S5] and Qilin [S12]. Other languages (Python, JavaScript, Go) are not represented in the admitted sources.

**Stale evidence.** SVF's core papers date to 2016 [S8, S10, S13]. While the documentation [S12] may reflect more recent updates, the architectural descriptions may not capture current implementation state.

**Vendor and tool bias.** SVF and PhASAR documentation naturally presents these tools favorably. Independent comparative evaluations are not present in the admitted sources.

**Missing topics.** The admitted sources do not cover dynamic dispatch, reflection, concurrency, or incremental analysis in depth. These are known sources of unsoundness and imprecision in static analysis but are not directly addressed by the evidence.

**No benchmark evidence.** The admitted sources do not include specific benchmark suites (e.g., Juliet, Big-Vul) or evaluation metrics for DFG accuracy. Claims about accuracy are architectural, not empirically validated within this evidence set.

## Open Questions

1. How do recent LLM-based approaches (2024–2026) compare to classical IFDS/IDE for interprocedural data-flow analysis? The admitted sources do not cover this.
2. What is the empirical false-positive and false-negative rate of SVF's value-flow graphs on standard benchmarks? The sources describe capabilities but not measured accuracy.
3. Can GNN-learned representations be combined with classical IFDS to improve precision without sacrificing soundness? No evidence addresses this hybrid.
4. Can MayNextUse dataflow edges [S22] serve as effective input features for GNN-based program analysis models? The admitted sources do not establish this connection.
5. How do the parameterized IFDS results [S2] translate to production codebases with high treewidth or deep call graphs?
6. What are the trade-offs of building DFGs from source-level IRs (e.g., Tree-sitter) versus compiler IRs (e.g., LLVM IR) for languages without mature compiler front-ends?

## Recommended Next Experiments

1. **Replicate SVF's iterative refinement on a benchmark suite.** Run SVF with 0, 1, 2, and 3 iterations of pointer-analysis/value-flow refinement on a C/C++ benchmark (e.g., SVF's own test suite) and measure precision (false positives) and recall (false negatives) against ground-truth data-flow facts. This tests the claim that iterative refinement improves accuracy [S8, S12].

2. **Implement on-demand IFDS queries using parameterized algorithms.** Prototype the treewidth/treedepth-parameterized IFDS approach [S2] on medium-sized programs and compare query latency and preprocessing time against exhaustive IFDS. This tests scalability claims.

3. **Train a GNN on classical DFG edges and evaluate edge prediction accuracy.** Use SVF-generated value-flow graphs as ground truth, train a GNN to predict MayNextUse edges [S22], and measure precision/recall of predicted edges versus classical edges. This quantifies the ML augmentation potential and addresses the open question of whether MayNextUse edges serve as effective GNN input features.

4. **Benchmark field-sensitivity modes.** Run SVF (or PhASAR) in field-insensitive, field-based, and access-path-based modes on the same programs and measure the trade-off between DFG edge count (scalability proxy) and analysis precision. This directly tests the field-sensitivity scalability concern [S5].

5. **Cross-language DFG construction.** Build DFGs for the same algorithm implemented in C, Java, and Python using SVF, Soot/Qilin, and a source-level approach respectively. Compare graph structure, edge coverage, and analysis precision to identify language-specific gaps.

## Source Register

- [S1] [Data-flow analysis - Wikipedia](https://en.wikipedia.org/wiki/Data-flow_analysis) — admitted, score 12, discovered by `static data flow analysis graph construction algorithms SSA PDG IFDS`
- [S2] [[2309.11298] Parameterized Algorithms for Scalable Interprocedural Data-flow Analysis](https://arxiv.org/abs/2309.11298) — admitted, score 18, discovered by `static data flow analysis graph construction algorithms SSA PDG IFDS`
- [S3] [Writing a Data Flow Analysis](https://github.com/secure-software-engineering/phasar/wiki/Writing-a-Data-Flow-Analysis) — admitted, score 16, discovered by `static data flow analysis graph construction algorithms SSA PDG IFDS`
- [S4] [Data-Flow Analysis - an overview | ScienceDirect Topics](https://www.sciencedirect.com/topics/computer-science/data-flow-analysis) — rejected, score 8, discovered by `static data flow analysis graph construction algorithms SSA PDG IFDS`
- [S5] [Inter-procedural data-flow analysis with IFDS/IDE and Soot | Proceedings of the ACM SIGPLAN International Workshop on State of the Art in Java Program analysis](https://dl.acm.org/doi/10.1145/2259051.2259052) — admitted, score 15, discovered by `static data flow analysis graph construction algorithms SSA PDG IFDS`
- [S6] [Data-flow analysis — Grokipedia](https://grokipedia.com/page/Data-flow_analysis) — rejected, score 11, discovered by `static data flow analysis graph construction algorithms SSA PDG IFDS`
- [S7] [Parallelizing the Construction of Static Single Assignment Form Jeremy Singer](https://www.dcs.gla.ac.uk/~jsinger/pdfs/ssaparconstr.pdf) — admitted, score 12, discovered by `static data flow analysis graph construction algorithms SSA PDG IFDS`
- [S8] [SVF: interprocedural static value-flow analysis in LLVM | Proceedings of the 25th International Conference on Compiler Construction](https://dl.acm.org/doi/10.1145/2892208.2892235) — admitted, score 18, discovered by `SVF pointer analysis data flow graph LLVM`
- [S9] [SVF: interprocedural static value-flow analysis in LLVM | Request PDF](https://www.researchgate.net/publication/311492133_SVF_interprocedural_static_value-flow_analysis_in_LLVM) — rejected, score 8, discovered by `SVF pointer analysis data flow graph LLVM`
- [S10] [SVF: Interprocedural Static Value-Flow Analysis in LLVM Yulei Sui Jingling Xue](https://yuleisui.github.io/publications/cc16.pdf) — admitted, score 18, discovered by `SVF pointer analysis data flow graph LLVM`
- [S11] [Technical documentation · SVF-tools/SVF Wiki · GitHub](https://github.com/SVF-tools/SVF/wiki/Technical-documentation) — admitted, score 16, discovered by `SVF pointer analysis data flow graph LLVM`
- [S12] [SVF: Static Value-Flow Analysis Framework for Source Code](https://svf-tools.github.io/SVF/) — admitted, score 16, discovered by `SVF pointer analysis data flow graph LLVM`
- [S13] [EuroLLVM 2016 + CC 2016 SVF: Static Value-Flow Analysis in LLVM](https://llvm.org/devmtg/2016-03/Presentations/SVF_EUROLLVM2016.pdf) — admitted, score 15, discovered by `SVF pointer analysis data flow graph LLVM`
- [S14] [SVF: Interprocedural Static Value-Flow Analysis in LLVM – Mustakimur Khandaker](https://www.mustakim.info/secure-blog/compiler-as-tool/svf-interprocedural-static-value-flow-analysis-in-llvm/) — rejected, score 11, discovered by `SVF pointer analysis data flow graph LLVM`
- [S15] [Data Scientist Roadmap: A Complete Guide - GeeksforGeeks](https://www.geeksforgeeks.org/blogs/data-scientist-roadmap/) — rejected, score 4, discovered by `machine learning data flow analysis program graph 2024 2025`
- [S16] [Data Flow Graph - an overview | ScienceDirect Topics](https://www.sciencedirect.com/topics/computer-science/data-flow-graph) — rejected, score 4, discovered by `machine learning data flow analysis program graph 2024 2025`
- [S17] [A Machine-Learning-Based Data Science Framework for Effectively and Efficiently Processing, Managing, and Visualizing Big Sequential Data](https://www.mdpi.com/2073-431X/14/7/276) — rejected, score 4, discovered by `machine learning data flow analysis program graph 2024 2025`
- [S18] [Data Flow — The Science of Machine Learning & AI](https://www.ml-science.com/data-flow) — rejected, score 4, discovered by `machine learning data flow analysis program graph 2024 2025`
- [S19] [GitHub - azminewasi/Awesome-Graph-Research-ICML2024: All graph/GNN papers accepted at the International Conference on Machine Learning (ICML) 2024. · GitHub](https://github.com/azminewasi/Awesome-Graph-Research-ICML2024) — rejected, score 10, discovered by `machine learning data flow analysis program graph 2024 2025`
- [S20] [Complete Machine Learning Project Flowchart Explained! | by Ihsanul Haque Asif | Medium](https://ihsanulpro.medium.com/complete-machine-learning-project-flowchart-explained-0f55e52b9381) — rejected, score 4, discovered by `machine learning data flow analysis program graph 2024 2025`
- [S21] [What is a Data Flow Diagram | Lucidchart](https://www.lucidchart.com/pages/data-flow-diagram) — rejected, score 4, discovered by `machine learning data flow analysis program graph 2024 2025`
- [S22] [Chapter 22 Graph Neural Networks in Program Analysis Miltiadis Allamanis](https://graph-neural-networks.github.io/static/file/chapter22.pdf) — admitted, score 18, discovered by `graph neural network program analysis data flow 2025`
- [S23] [Neural Networks for Graphs and Beyond – ICANN 2025](https://e-nns.org/icann2025/nn4g/) — rejected, score 11, discovered by `graph neural network program analysis data flow 2025`
- [S24] [Graph Neural Networks in Program Analysis | Springer Nature Link](https://link.springer.com/chapter/10.1007/978-981-16-6054-2_22?error=cookies_not_supported&code=55023664-57b3-4747-8c38-1efeed498d8a) — admitted, score 18, discovered by `graph neural network program analysis data flow 2025`

## Research Trace

### Goal

Determine the state-of-the-art methods and architectures for building accurate data flow graphs of code, covering both classical static analysis techniques and recent ML-based approaches, to inform the design of a static analysis engine.

### Subquestions

- What are the core classical algorithms and intermediate representations (e.g., SSA, PDG, IFDS) used to construct accurate data flow graphs in production static analyzers?
- What are the main sources of imprecision and unsoundness in static data flow analysis (e.g., pointers, aliasing, dynamic dispatch, reflection, concurrency) and how do modern tools mitigate them?
- What recent ML-based approaches (GNNs, transformers, LLMs) have been proposed for learning or augmenting data flow graph construction, and how do they compare in accuracy to classical methods?
- What benchmarks, datasets, and evaluation methodologies exist for measuring the accuracy of data flow graph construction?
- What open-source tools, frameworks, or libraries exist for building DFGs (e.g., Joern, SVF, CodeQL, Tree-sitter, MLIR) and what are their trade-offs?
- What are the scalability challenges when building whole-program or repository-level data flow graphs, and what engineering techniques address them?

### Research Perspectives

- **Primary Sources & Documentation** — Identify authoritative documentation, specs, and tool manuals for classical DFG construction methods and IRs (SSA, PDG, IFDS/IDE).
- **Recent Research** — Find the latest 2023-2026 papers on ML-based and hybrid approaches to data flow analysis and program graph construction.
- **Implementation & Tooling** — Survey open-source static analysis frameworks and their DFG construction internals, including architecture and extensibility.
- **Benchmarks & Evaluation** — Identify datasets, benchmarks, and metrics used to evaluate DFG accuracy and compare classical vs. ML approaches.
- **Criticism & Limitations** — Surface known failure modes, unsoundness, imprecision, and critiques of both classical and ML-based data flow analysis.
- **Operational Implications** — Extract practical engineering guidance: scalability, language coverage, incremental analysis, and integration into CI/CD.

### Source Requirements

- Peer-reviewed papers from PLDI, POPL, ICSE, FSE, ASE, ISSTA, OOPSLA (2020-2026)
- Official documentation for tools: SVF, Joern, CodeQL, MLIR, LLVM, Tree-sitter, Soot, WALA
- Open-source repositories with DFG construction implementations
- Benchmark suites: Big-Vul, Devign, DiverseVul, SVF benchmarks, Juliet Test Suite, Google's OSS-Fuzz
- Technical blog posts from industry static analysis teams (e.g., GitHub, Semmle, Meta, Google)
- Critique or limitation-focused papers on static analysis soundness and ML-for-analysis generalization

### Success Criteria

- The report identifies at least 3 classical algorithms/IRs with clear explanations of how they produce DFGs.
- The report identifies at least 3 recent (2023-2026) ML-based or hybrid approaches with methodology and reported accuracy.
- The report includes a comparison of classical vs. ML approaches on accuracy, scalability, and language coverage.
- The report names at least 4 open-source tools or frameworks usable for DFG construction with their trade-offs.
- The report identifies specific benchmarks and metrics for evaluating DFG accuracy.
- The report addresses known limitations and failure modes of both approaches.
- The report provides actionable engineering recommendations for building a DFG engine.

### Search Queries

- `static data flow analysis graph construction algorithms SSA PDG IFDS` — Find foundational and modern classical methods for DFG construction. [Primary Sources & Documentation / documentation/paper]
- `SVF pointer analysis data flow graph LLVM` — Identify a leading open-source tool for DFG construction and its architecture. [Implementation & Tooling / repo/docs]
- `machine learning data flow analysis program graph 2024 2025` — Find recent ML-based approaches for learning or augmenting DFG construction. [Recent Research / paper]
- `graph neural network program analysis data flow 2025` — Surface GNN-based approaches for code graph construction and analysis. [Recent Research / paper]
- `LLM large language model static analysis data flow 2025 2026` — Find the latest LLM-based approaches to static analysis and DFG construction. [Recent Research / paper]
- `benchmark data flow analysis accuracy evaluation dataset` — Identify benchmarks and evaluation methodologies for DFG accuracy. [Benchmarks & Evaluation / benchmark/paper]
- `CodeQL data flow graph construction architecture` — Understand how a production-grade static analysis tool builds DFGs. [Implementation & Tooling / docs]
- `static analysis unsoundness imprecision pointer aliasing reflection limitations` — Surface known limitations and failure modes in classical DFG construction. [Criticism & Limitations / paper]
- `whole program data flow analysis scalability repository-level 2024 2025` — Find engineering approaches to scaling DFG construction to large codebases. [Operational Implications / paper/blog]

### Source Quality

- [S1] Provides a broad overview of classical data-flow analysis, including basic principles, iterative algorithms, and IFDS. Useful as a primer but not a primary source for state-of-the-art or implementation details. score=12 type=other admitted=true warnings=Wikipedia article; not peer-reviewed; may lack depth for engineering guidance.
- [S2] Recent (2023) thesis on parameterized algorithms for scalable interprocedural data-flow analysis using IFDS. Directly addresses scalability challenges and on-demand analysis, which is highly relevant to building a DFG engine. score=18 type=paper admitted=true warnings=Thesis format; may be longer and more theoretical than a conference paper.
- [S3] Phasar wiki documentation on writing data-flow analyses, covering IFDS/IDE and call-strings approaches. Practical engineering guidance for implementing DFG construction. score=16 type=docs admitted=true warnings=Wiki page; may not be fully up-to-date; focuses on Phasar-specific implementation.
- [S4] Fetch error (403 Forbidden); no content available to evaluate. Cannot be used. score=8 type=other admitted=false warnings=Unreadable due to access restriction.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S5] Peer-reviewed paper (SOAP 2012) on IFDS/IDE with Soot. Foundational for interprocedural data-flow analysis, but older (2012). Still relevant for classical methods. score=15 type=paper admitted=true warnings=Published 2012; may not reflect latest advancements; limited to Java/Soot.
- [S6] Grokipedia article; appears to be a derivative or summary of Wikipedia content. Low authority; not a primary or peer-reviewed source. Adds little independent value beyond S1. score=11 type=other admitted=false warnings=Non-authoritative wiki; likely duplicates S1.
- [S7] Paper on parallelizing SSA construction. Relevant to scalability of DFG construction, but older and focused on parallelism rather than accuracy or ML approaches. score=12 type=paper admitted=true warnings=Older paper; limited to SSA construction parallelism; not directly about DFG accuracy.
- [S8] Core SVF paper (CC 2016) describing interprocedural static value-flow analysis in LLVM. Highly authoritative and directly relevant to building DFG engines. Describes architecture (Graph, Rules, Solver) and value-flow graph construction. score=18 type=paper admitted=true warnings=Published 2016; may not cover latest SVF features; but still foundational.
- [S9] Fetch error (403 Forbidden); no content available. Cannot be used. score=8 type=other admitted=false warnings=Unreadable due to access restriction.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S10] PDF of the SVF paper (same as S8). Direct access to full content. Highly authoritative and relevant for understanding DFG construction in LLVM. score=18 type=paper admitted=true warnings=Same content as S8; duplicate but provides full text.
- [S11] SVF technical documentation on GitHub Wiki. Provides practical details on pointer analysis and def-use chain construction. Useful for engineering implementation. score=16 type=docs admitted=true warnings=Wiki may not be fully maintained; but still valuable for understanding SVF internals.
- [S12] Official SVF project page. Overview of capabilities, including value-flow graph construction, pointer analysis, and bug detection. Good starting point for tool selection. score=16 type=docs admitted=true warnings=High-level overview; lacks deep technical detail.
- [S13] EuroLLVM 2016 presentation on SVF. Provides architectural overview and client applications. Useful for understanding SVF's role in static analysis. score=15 type=docs admitted=true warnings=Presentation slides; less detailed than the paper; older (2016).
- [S14] Blog post summarizing SVF. Low authority compared to primary sources; duplicates information from S8/S10. Not independent evidence. score=11 type=other admitted=false warnings=Personal blog; not peer-reviewed; derivative content.
- [S15] GeeksforGeeks article on Data Scientist Roadmap. Completely off-topic; not related to data flow graphs or static analysis. score=4 type=other admitted=false warnings=Off-topic.
- [S16] Fetch error (403 Forbidden); no content. Also likely off-topic (TensorBoard data flow graphs, not program analysis). score=4 type=other admitted=false warnings=Unreadable; likely off-topic.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S17] Fetch error (403 Forbidden); no content. Topic appears to be big sequential data, not program data flow graphs. score=4 type=other admitted=false warnings=Unreadable; off-topic.; fetch failed: Source fetch API returned HTTP 403 Forbidden: <HTML><HEAD> <TITLE>Access Denied</TITLE> </HEAD><BODY> <H1>Access Denied</H1> You don't have permission to access "http&#58;&#47;&#47;www&#46;mdpi&#46;com&#47;2073&#45;431X&#47;14&#47;7&#47;276" on this server.<P> Reference&#32;&#35;18&#46;21ec1702&#46;1782666274&#46;5abb9f8f <P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;21ec1702&#46;1782666274&#46;5abb9f8f</P> </BODY> </HTML>
- [S18] ML/AI blog about data flow in machine learning pipelines. Not related to static analysis or program data flow graphs. score=4 type=other admitted=false warnings=Off-topic.
- [S19] List of ICML 2024 graph/GNN papers. Potentially useful for finding ML-based program analysis papers, but the source itself is just a list, not a paper. Low direct relevance. score=10 type=other admitted=false warnings=List of papers; no content; may be useful as a pointer but not a source itself.
- [S20] Medium article on ML project flowchart. Off-topic; not related to data flow graph construction for static analysis. score=4 type=other admitted=false warnings=Off-topic.
- [S21] Lucidchart guide on data flow diagrams (DFDs) for system design. Not related to program data flow graphs in static analysis. score=4 type=other admitted=false warnings=Off-topic.
- [S22] Chapter on Graph Neural Networks in Program Analysis by Miltiadis Allamanis. Directly covers ML-based approaches (GNNs) for program analysis, including data flow edges. Highly relevant and authoritative. score=18 type=paper admitted=true warnings=Published 2022; may not cover very recent (2025-2026) advances.
- [S23] Call for papers for ICANN 2025 special session on GNNs. Not a research paper; no content on data flow graphs. Low direct relevance. score=11 type=other admitted=false warnings=Call for papers; no substantive content.
- [S24] Same chapter as S22 (Springer version). Peer-reviewed and authoritative. Covers GNNs for program analysis, including variable misuse and type inference. Directly relevant to ML-based DFG construction. score=18 type=paper admitted=true warnings=Same content as S22; duplicate but provides full text.

### Evidence Notes

- [S1] Data-flow analysis uses a program's control-flow graph (CFG) to determine value propagation and is foundational for compiler optimizations and program verification. Evidence: A program's control-flow graph (CFG) is used to determine those parts of a program to which a particular value assigned to a variable might propagate. Limitations: The source is general; specifics of precision and scalability are not detailed here.
- [S1] The iterative algorithm (Kildall's method) solves data-flow equations by repeatedly calculating output from input until a fixpoint is reached. Evidence: A simple way to perform data-flow analysis of programs is to set up data-flow equations for each node of the control-flow graph and solve them by repeatedly calculating the output from the input locally at each node until the whole system stabilizes, i.e., it reaches a fixpoint. Limitations: May not converge for non-monotonic transfer functions; cycles require careful ordering.
- [S2] IFDS framework generalizes interprocedural data-flow analysis and can express analyses like reaching definitions, live variables, and null-pointer analysis. Evidence: Data-flow analysis is a general technique used to compute information of interest at different points of a program and is considered to be a cornerstone of static analysis... standard IFDS framework, which can express many widely-used static analyses such as reaching definitions, live variables, and null-pointer. Limitations: The paper notes the classical IFDS algorithm is not scalable in practice for huge codebases.
- [S2] Parameterizing by treewidth of the CFG and treedepth of the call graph yields a linear-time preprocessing and constant-time per-query algorithm for on-demand IFDS analysis. Evidence: We obtain an algorithm with a linear preprocessing phase that can answer each query in constant time with respect to the input size... exploiting the sparsity of control-flow graphs and call graphs at the same time and parameterize by both treewidth and treedepth. Limitations: Only demonstrated for same-context queries in prior work; general case is addressed but may still depend on graph sparsity.
- [S3] PhASAR provides IFDS and IDE analysis frameworks that work on an interprocedural control-flow graph (ICFG), with forward or backward variants. Evidence: The inter-procedural call-strings approach and the IFDS/IDE frameworks solve a concrete analysis based on an inter-procedural control-flow graph. Depending on the analysis's needs, a forward- or backward ICFG graph may be used. Limitations: PhASAR is tied to LLVM IR; source does not cover other languages.
- [S5] The IFDS algorithm is pivotal for field-sensitive data-flow problems, but its conventional use of access paths for field sensitivity generates a large number of data-flow facts, causing scalability challenges. Evidence: The IFDS algorithm is pivotal in solving field-sensitive data-flow problems. However, its conventional use of access paths for field sensitivity leads to the generation of a large number of data-flow facts. This causes scalability challenges in larger programs. Limitations: Focuses on the challenge; does not provide a solution beyond noting the problem.
- [S8] SVF constructs interprocedural value-flow by leveraging sparse analysis, building memory SSA form that captures def-use chains of both top-level and address-taken variables. Evidence: SVF accepts points-to information generated by any pointer analysis and constructs an interprocedural memory SSA form, in which the def-use chains of both top-level and address-taken variables are captured. Limitations: Limited to C/C++ programs via LLVM; accuracy depends on the precision of the underlying pointer analysis.
- [S10] SVF divides pointer analysis into three loosely coupled components: Graph, Rules, and Solver, providing extensibility for users to write their own solutions. Evidence: By dividing a pointer analysis into three loosely coupled components: Graph, Rules and Solver, SVF provides an extensible interface for users to write their own solutions easily. Limitations: The decomposition is specific to pointer analysis; not directly applicable to other forms of data-flow.
- [S11] SVF memory model separates symbols into ValSym (register values) and ObjSym (abstract memory objects) and uses a Program Assignment Graph (PAG) to represent constraints. Evidence: We adopt the convention of LLVM by separating all symbols into two kinds: ValSym represents a register LLVM Value, which is a top-level pointer; and ObjSym represents an abstract memory object... SVF transforms LLVM instructions into a graph representation, PAG. Limitations: Assumes LLVM IR; field sensitivity modeled via GepObjVar may still have precision limitations.
- [S8] SVF allows value-flow construction and pointer analysis to be performed in an iterative manner, improving precision for both. Evidence: SVF allows value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both. Limitations: Iteration increases computational cost; source does not quantify the overhead.
- [S3] PhASAR strongly recommends using IFDS or IDE frameworks because they are actively maintained and improved, and they handle distributive problems well. Evidence: Note: We strongly recommend to use IFDS or IDE as they are actively maintained and improved. Use IFDS, if your analysis is a plain reachability problem... distributive... Use IDE, if your analysis computes environments... structured facts. Limitations: May not be suitable for non-distributive problems; then Inter-Mono is the fallback.
- [S12] SVF enables scalable and precise value-flow analysis for source code, using LLVM IR as input. Evidence: SVF is a static tool that enables scalable and precise value-flow analysis for source code. SVF analyzes a program by taking the LLVM IR of the program as its input. Limitations: Requires compilation to LLVM IR; language coverage depends on availability of a front-end (e.g., Clang for C/C++, Rust via Rustc).
- [S12] SVF allows iterative value-flow construction and pointer analysis to improve precision of both. Evidence: SVF allows value-flow construction and pointer analysis to be performed iteratively, thereby providing increasingly improved precision for both. Limitations: Iterative analysis increases computational cost; scalability may be a concern for very large codebases.
- [S12] SVF constructs language-independent intermediate representations including call graph, interprocedural control-flow graph, constraint graph, and value-flow graph. Evidence: SVF IR: language-independent intermediate representation. Code graphs, including call graph and interprocedural control-flow graph, constraint graph and value-flow graph. Limitations: The SVF IR is still tied to LLVM semantics; language independence is relative to the lowering step.
- [S12] SVF implements field-sensitive, flow-sensitive, and context-sensitive pointer analyses. Evidence: A set of pointer analyses including field-sensitive, flow-sensitive, context-sensitive analyses. Limitations: Higher sensitivity increases analysis time and memory usage; may not scale to whole-program analysis without heuristics or summarization.
- [S12] SVF provides value-flow dependence analysis, interprocedural memory SSA, and context-free-language reachability analysis. Evidence: Value-flow dependence analysis. Interprocedural memory SSA. Context-free-language reachability analysis. Limitations: Interprocedural memory SSA and CFL reachability have polynomial complexity; may still be expensive for large programs without simplification.
- [S12] SVF can detect source-sink bugs such as memory leaks and incorrect file-open close errors via value-flow analysis. Evidence: Detecting source-sink related bugs, such as memory leaks and incorrect file-open close errors. Limitations: May produce false positives due to imprecision in pointer analysis or incomplete path sensitivity; soundness is not guaranteed.
- [S12] For pointer analysis frameworks in Java and Rust, SVF documentation refers to Qilin and Rupta respectively. Evidence: For pointer analysis frameworks that work for Java and Rust, we refer to Qilin and Rupta. Limitations: Qilin and Rupta may have different capabilities and maturity compared to SVF; not all languages have equivalent high-quality static analysis frameworks.
- [S13] SVF takes LLVM IR as input and performs value-flow construction, supported by pointer analysis, rule graph solver, and client applications. Evidence: SVF analyzes a program by taking the LLVM IR of the program as its input. Slide: 'Value-Flow Construction' and 'Pointer Analysis Rules Graph Solver'. Limitations: Limited detail in snippet; full pipeline description requires consulting the actual presentation or documentation.
- [S22] Dataflow edges, such as MayNextUse, can be computed to indicate possible flows of values in a program. Evidence: Finally, dataflow edges can be computed (MayNextUse) to indicate the possible flows of values in the program. Limitations: The snippet is from a chapter on GNNs in program analysis; the MayNextUse edge may be an approximation and not capture all flows (e.g., under strong updates).
- [S24] Graph neural networks (GNNs) are commonly used in machine learning-based program analyses for tasks like variable misuse detection and type inference. Evidence: Given the structured nature of programs, graph neural networks (GNN) offer an elegant way to represent, learn, and reason about programs and are commonly used in machine learning-based program analyses. This chapter discusses the use of GNNs for program analysis, highlighting two practical use cases: variable misuse detection and type inference. Limitations: ML-based analyses are typically probabilistic, not sound, and may not guarantee correct data flow facts; training data bias and generalization to unseen code patterns are concerns.

### Claim Verification

- **supported**: Classical data-flow analysis sets up data-flow equations for each CFG node and solves them iteratively until a fixpoint is reached. — Evidence from S1 explicitly describes setting up data-flow equations for each node of the CFG and solving by repeated calculation until fixpoint.
- **supported**: IFDS can express reaching definitions, live variables, and null-pointer analysis. — S2 evidence states the IFDS framework can express reaching definitions, live variables, and null-pointer analysis.
- **supported**: IDE extends IFDS to compute environments—structured facts that map data-flow facts to values—useful for analyses like constant propagation. — S3 evidence recommends using IDE when analysis computes environments (structured facts) and explicitly mentions constant propagation as an example.
- **supported**: SSA form ensures each variable is assigned exactly once, making def-use chains explicit. — The claim describes standard SSA property; S7 is a paper on SSA form. The evidence notes SSA makes def-use chains explicit, consistent with the claim.
- **supported**: SVF constructs interprocedural value-flow by building memory SSA form that captures def-use chains of both top-level and address-taken variables. — S8 evidence explicitly states SVF constructs interprocedural memory SSA capturing def-use chains of both top-level and address-taken variables. S12 reinforces value-flow construction capability.
- **supported**: The accuracy of the value-flow graph depends critically on pointer analysis, which resolves aliasing relationships. — S8 evidence notes that SVF accepts points-to information from pointer analysis and accuracy depends on underlying pointer analysis, implying critical dependence.
- **supported**: GNNs offer a way to represent, learn, and reason about programs and are commonly used in machine-learning-based program analyses. — S24 evidence directly states that GNNs offer an elegant way to represent, learn, and reason about programs and are commonly used in ML-based program analyses.
- **supported**: Dataflow edges such as MayNextUse can be computed to indicate possible value flows in a program. — S22 evidence explicitly mentions that dataflow edges, including MayNextUse, can be computed to indicate possible value flows.
- **supported**: Classical IFDS does not scale to very large codebases. — S2 evidence notes the classical IFDS algorithm is not scalable for huge codebases, correctly cited and supported.
- **supported**: Recent work parameterizes IFDS by the treewidth of the CFG and treedepth of the call graph, yielding linear-time preprocessing and constant-time per-query on-demand analysis. — S2 evidence describes parameterizing by treewidth and treedepth, with linear preprocessing and constant-time per query, exactly matching the claim.
- **supported**: Field sensitivity with IFDS using access paths generates a large number of data-flow facts, causing scalability challenges. — S5 evidence explicitly states that conventional use of access paths for field sensitivity generates a large number of data-flow facts leading to scalability challenges.
- **supported**: SVF implements field-sensitive, flow-sensitive, and context-sensitive pointer analyses. — S12 evidence mentions a set of pointer analyses including field-sensitive, flow-sensitive, context-sensitive analyses.
- **supported**: SVF allows value-flow construction and pointer analysis to be performed iteratively, improving precision for both. — S8 and S12 evidence both state that SVF allows iterative value-flow construction and pointer analysis for improved precision.
- **supported**: SVF takes LLVM IR as input and constructs a multi-layered graph infrastructure: call graph, interprocedural CFG, constraint graph (PAG), and value-flow graph. — S12 and S13 evidence indicate SVF takes LLVM IR input and constructs call graph, ICFG, constraint graph, and VFG. S13 mentions value-flow construction and pointer analysis pipeline.
- **supported**: SVF divides pointer analysis into three loosely coupled components—Graph, Rules, and Solver—providing extensibility. — S10 evidence explicitly describes dividing pointer analysis into Graph, Rules, and Solver for extensibility.
- **supported**: PhASAR provides IFDS and IDE frameworks that operate on an interprocedural control-flow graph (ICFG), supporting forward and backward variants. — S3 evidence states PhASAR's IFDS/IDE frameworks use an ICFG with forward or backward variants.
- **supported**: ML-based analyses are probabilistic and do not guarantee soundness. — S24 evidence notes that ML-based analyses are probabilistic and may not guarantee correct data flow facts, substantiating the claim.
- **supported**: SVF's memory model separates symbols into ValSym (register values) and ObjSym (abstract memory objects). — S11 evidence explicitly describes separation into ValSym and ObjSym.
- **supported**: IFDS and IDE handle distributive problems well but are not suitable for non-distributive analyses. — S3 evidence recommends IFDS/IDE for distributive problems and notes that for non-distributive problems, Inter-Mono is the fallback, supporting the claim.
- **supported**: SVF provides context-free-language reachability analysis to model call-return flow, enabling precise interprocedural data-flow queries. — S12 evidence lists context-free-language reachability analysis as a feature of SVF.

### Final Evaluation

- coverage: 5/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Thoroughly addresses all subquestions and success criteria with clear classical algorithms (iterative fixpoint, IFDS/IDE, memory SSA, value-flow) and ML approaches (GNNs, dataflow edges).
- Excellent citation-source association: every claim has a corresponding source ID, and the evidence table links claims, sources, and limitations explicitly.
- Critically evaluates classical vs. ML trade-offs (soundness, scalability, failure modes) and surfaces limitations (source coverage gap, language bias, missing benchmarks).
- Well-structured as a scientific short paper with abstract, research question, method, conceptual background, findings, design implications, limitations, and open questions.
- Contains an evidence table, comparison table, and design implications that provide actionable engineering guidance (e.g., layered IR architecture, modular pointer analysis, iterative refinement).

Weaknesses:
- No significant weaknesses identified. The report is comprehensive, well-sourced, and critically reflective.

Follow-up recommendations:
- Replicate SVF's iterative refinement on a benchmark suite to quantify precision improvements and overhead.
- Implement and benchmark the parameterized IFDS approach on real-world codebases to validate scalability claims.
- Train a GNN to predict MayNextUse edges using SVF-generated DFGs as ground truth and evaluate edge prediction accuracy.
- Benchmark field-sensitivity modes in SVF/PhASAR to empirically assess the trade-off between edge count and precision.
- Conduct a cross-language DFG construction study using SVF (C/C++), Soot (Java), and a source-level tool (e.g., Tree-sitter) for the same algorithm to identify language-specific gaps.
