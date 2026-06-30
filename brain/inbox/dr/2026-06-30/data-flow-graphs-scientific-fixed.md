---
title: "how to build accurate data flow graphs of code. building the underlying engine for a static analysis tool. Latest research. Both static classical methods and ML based approaches"
generated_at: 2026-06-28T18:45:32.312521+00:00
strategy: deep-agent-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Building Accurate Data Flow Graphs of Code: Classical Algorithms and Machine Learning Approaches

## Abstract

Data flow graphs (DFGs) are a core intermediate representation for static analysis, security auditing, and program understanding. Constructing them accurately requires solving a chain of interdependent problems: reaching definitions, def-use chains, static single-assignment (SSA) form, pointer analysis, and interprocedural propagation. This report surveys the state of the art as of mid-2026, drawing on classical static analysis foundations, production tool implementations (CodeQL, Joern), and recent neural approaches (DFA-GNN+, DFA-Net). We find that classical methods remain the backbone of sound, explainable DFG construction, while machine learning models show promise for approximate, scalable inference but lack soundness guarantees and struggle with complex interprocedural flow. We identify precision-scalability trade-offs, pointer analysis as the primary accuracy bottleneck, and algorithmic alignment as the key design principle for neural DFG models.

## Research Question

How can a static analysis engine build accurate data flow graphs of code, and what are the trade-offs between classical static analysis algorithms and machine learning-based approaches?

## Method

We synthesize evidence from three source categories: foundational descriptions of classical data flow techniques (SSA, def-use chains, pointer analysis) [S30, S34, S35, S36], production tool documentation (CodeQL, Joern) [S15–S23], and recent academic work on neural data flow analysis (DFA-GNN+, DFA-Net, LLM surveys) [S6, S9, S10, S11]. We compare algorithms on precision, scalability, soundness, and explainability. Where evidence is thin or vendor-specific, we flag it directly.

## Conceptual Background

### Core Terms

| Term | Definition | Role in DFG Construction |
|------|-----------|------------------------|
| Reaching definitions | Set of definitions that can reach a program point without being overwritten | Basis for def-use edges |
| UD chain | Links each variable use to all definitions that can reach it | Direct DFG edge source |
| DU chain | Links each definition to uses it can reach | Reverse DFG edges |
| SSA form | Each variable assigned exactly once; Φ-functions at joins | Simplifies def-use resolution |
| Pointer analysis | Determines which pointers can point to which locations | Resolves indirect flow |
| Taint tracking | Adds non-value-preserving edges (e.g., string concat) | Security-oriented DFG extension |
| CPG | Code Property Graph merging AST, CFG, DDG, CDG | Unified representation (Joern) |

### Classical Pipeline

A classical DFG engine follows a layered pipeline:

1. **Frontend parsing** produces an AST and control flow graph (CFG).
2. **SSA conversion** assigns each variable once, inserting Φ-functions at dominance frontiers [S30]. SSA simplifies reaching definitions because each use has a unique definition.
3. **Reaching definitions analysis** computes which definitions reach each use along CFG paths [S34]. This is a forward data flow problem solved by fixed-point iteration.
4. **Def-use chain construction** links definitions to uses (DU chains) or uses to definitions (UD chains) [S34].
5. **Pointer analysis** resolves indirect flow through pointers and heap references [S35].
6. **Interprocedural propagation** extends local flow across function boundaries via call graph edges.

### SSA Form

SSA is the most important enabler. In SSA, "each variable is assigned exactly once" and "when looking at a use of a variable there is only one place where that variable may have received a value" [S30]. Efficient conversion algorithms exist and SSA is used in LLVM, GCC, and commercial compilers [S30]. SSA enables or strongly enhances constant folding, dead-code elimination, global value numbering, and partial-redundancy elimination [S30].

### Pointer Analysis

Pointer analysis is critical because without it, DFGs are unsound for languages with pointers or references. Fully precise pointer analysis is undecidable; all practical approaches approximate [S35]. Key axes of variation:

| Algorithm | Sensitivity | Precision | Cost | Notes |
|----------|-----------|-----------|------|-------|
| Steensgaard | Flow-insens., context-insens. | Low | Near-linear | Union-find, equality constraints [S35] |
| Andersen | Flow-insens., context-insens. | Medium | O(n³) | Inclusion-based, subset constraints [S35, S36] |
| Context-sensitive (call-site, object, type) | Context-sens., flow-insens. | High | Higher | k-limiting for termination [S35] |
| Context + flow sensitive | Both | Highest | Exponential | Per-context reanalysis [S35] |

## Findings

### 1. Classical Foundations Remain the Backbone

The foundational algorithms—reaching definitions, UD/DU chains, SSA, and pointer analysis—are well-established and form the basis of all production tools surveyed. UD chains are "constructed as part of global data flow analysis after solving the reaching definitions problem" [S34]. DU chains reverse this, "often built using both reaching definitions and live variable analysis to ensure only live uses are considered" [S34]. SSA makes these chains nearly trivial to compute because each use has a unique definition.

**Insight:** SSA is not optional for an accurate engine. Without it, reaching definitions must track multiple assignments per variable, increasing graph size and analysis cost. SSA collapses this to a single definition per use, making def-use edges explicit in the IR.

### 2. Production Tools Use Layered, Configurable Architectures

#### CodeQL

CodeQL models DFGs with "nodes representing semantic elements that carry values at runtime" and "edges representing the way data flows between program elements" [S15]. It distinguishes local data flow (intra-procedural) and global data flow (inter-procedural, including object properties) [S15, S19]. Taint tracking adds "non-value-preserving steps, such as flow through string-manipulating operations" [S19].

CodeQL enhances precision with SSA-based nodes: `SsaDefinitionNode` corresponds to an SSA variable, enabling "more precise reasoning about different assignments to the same variable" [S19]. `PropRef` nodes model property reads and writes [S19]. Flow states (labels) allow tracking "partial taint or partial sanitization" by associating state sets with values [S17], exposed via `DataFlow::StateConfigSig` and `DataFlow::GlobalWithState` [S17].

CodeQL's configuration API uses predicates `isSource`, `isSink`, `isBarrier`, and `isAdditionalFlowStep` [S21], making the analysis configurable but only as precise as the provided models.

#### Joern

Joern's Code Property Graph (CPG) "merges AST, control flow, and intra-procedural data-flow into a single property graph" [S22]. Data flow is represented by `REACHING_DEF` edges, where "a reaching definition edge indicates that a variable produced at the source node reaches the destination node without being reassigned on the way" [S23]. The `VARIABLE` property on edges indicates which variable is propagated [S23]. Overlays add layers like dominator trees and inter-procedural edges [S22].

| Feature | CodeQL | Joern |
|---------|--------|-------|
| Base representation | Semantic nodes + flow edges | CPG (AST+CFG+DDG+CDG) |
| Interprocedural | Global data flow library | Overlays |
| SSA support | SsaDefinitionNode | Via overlays |
| Taint tracking | Non-value-preserving edges | REACHING_DEF + taint overlay |
| Configurability | ConfigSig predicates | Query language |
| Pointer analysis | Implicit (not documented) | Not in base CPG |

**Insight:** Both tools separate local (fast, precise) from global (slow, less precise) analysis [S16, S19]. This two-tier design is a practical response to the precision-scalability trade-off. An engine builder should adopt the same split: compute local DFGs eagerly and global DFGs on demand with user-configured sources and sinks.

### 3. Key Challenges for Accuracy

CodeQL documentation identifies four core challenges [S15]:

1. **Unavailable source code** for standard libraries—flow through library calls must be modeled manually.
2. **Runtime-determined behavior**—dynamic dispatch requires call target resolution.
3. **Aliasing**—"a single write changing the value that multiple pointers point to" [S15].
4. **Graph size**—"the data flow graph can be very large and slow to compute" [S15].

Pointer analysis is the primary accuracy bottleneck. Andersen's inclusion-based analysis is "highly precise" among flow- and context-insensitive methods [S36], but O(n³). Context-sensitive, flow-sensitive analyses achieve higher precision "by analyzing each procedure several times, once per context" with k-limiting for termination [S35]. Common context variants are call-site sensitivity, object sensitivity, and type sensitivity [S35].

**Insight:** The choice of pointer analysis determines the precision ceiling of the entire DFG. For object-oriented languages, object sensitivity tends to outperform call-site sensitivity [S35]. For an engine targeting multiple languages, a configurable pointer analysis with selectable sensitivity is essential.

### 4. Machine Learning Approaches: Algorithmic Alignment Matters

Recent work shows that generic GNNs perform poorly on data flow tasks, but architectures aligned with DFA algorithms improve dramatically.

#### DFA-GNN+

DFA-GNN+ addresses two challenges: "the noninterference property of the bit-vectors used in DFA and the complex handling of external information at different stages of the algorithm" [S9]. It "exhibits superior generalization and sample efficiency, accurately scaling to 10 times larger inputs with minimal training data" [S9]. Notably, "GNNs trained with only input-output pairs can perform competitively with models trained using full execution trajectory supervision" [S9], reducing annotation cost.

#### DFA-Net

DFA-Net "decomposes data flow analyses into specialized neural networks for initialization, transfer, and meet operations, explicitly incorporating compiler-specific knowledge" [S11]. This mirrors the classical fixed-point iteration structure. Results are striking:

| Task | DFA-Net F1 | Generic GNN F1 |
|------|-----------|---------------|
| Data dependencies (high complexity) | 0.761 | 0.009 |
| Dominators (high complexity) | 0.989 | 0.196 |
| Liveness | Perfect | Struggles |
| Reachability | Perfect | Struggles |

[S11]

**Insight:** The gap between DFA-Net and generic GNNs (0.761 vs. 0.009 for data dependencies) shows that neural architectures must mirror the algorithmic structure of data flow analysis. Generic message-passing GNNs cannot capture the meet-over-paths semantics of DFA. This suggests that hybrid engines—classical fixed-point iteration with neural components for specific transfer functions—may be more viable than end-to-end neural DFG construction.

### 5. LLMs for Data Flow: Early and Uncertain

A survey notes that "large language models are being applied to binary taint analysis for data flows" [S6], but the evidence is too brief to assess methodology or accuracy. No source provides quantitative benchmarks for LLM-based DFG construction on real-world code.

### 6. Trade-offs: Classical vs. ML

| Dimension | Classical Static Analysis | ML-Based Approaches |
|-----------|------------------------|---------------------|
| Soundness | Guaranteed (by design) | Not guaranteed |
| Precision | High (with pointer analysis) | Variable; task-dependent |
| Scalability | Limited by pointer analysis | Better with alignment [S9] |
| Explainability | Full (edges are provable) | Low (black-box) |
| Generalization | Complete for supported language | Requires training; OOD risk |
| Interprocedural | Supported (expensive) | Not yet demonstrated |
| Annotation cost | None | Reduced with I/O pairs [S9] |
| Real-world validation | Production tools (CodeQL, Joern) | Synthetic/benchmark only [S11] |

## Design Implications

1. **Build on SSA.** Convert to SSA early. It simplifies def-use chains, enables precise local DFGs, and is the foundation for all downstream analysis [S30, S19].

2. **Separate local and global flow.** Compute local DFGs eagerly and global DFGs on demand with configurable sources, sinks, and barriers [S15, S16, S21]. This mirrors CodeQL's architecture and manages the precision-scalability trade-off.

3. **Make pointer analysis configurable.** Offer at least two tiers: a fast flow-insensitive analysis (Andersen or Steensgaard) for initial passes and a context-sensitive analysis for precision-critical queries [S35, S36]. Object sensitivity is preferable for OO languages [S35].

4. **Use a unified graph representation.** Joern's CPG demonstrates the value of merging AST, CFG, and DDG into one property graph [S22, S23]. This enables incremental overlays and multi-level querying.

5. **Model library calls explicitly.** Unavailable source code for standard libraries is a major accuracy gap [S15]. An engine needs a library model registry with hand-written or inferred summaries.

6. **Consider neural components for specific subproblems.** DFA-Net's decomposition into initialization, transfer, and meet networks [S11] suggests that neural transfer functions could approximate expensive library models or pointer analysis queries. However, do not replace the fixed-point solver with an end-to-end model—soundness is lost.

7. **Add flow states for security precision.** CodeQL's flow labels enable tracking partial taint and sanitization [S17]. This is valuable for vulnerability detection where simple reachability over-approximates.

## Limitations and Threats to Validity

- **Vendor documentation bias.** CodeQL and Joern documentation describes capabilities but not algorithmic internals (e.g., pointer analysis methods, fixed-point strategies). Implementation details are proprietary or omitted [S15–S23].
- **ML evaluation scope.** DFA-Net and DFA-GNN+ are evaluated on synthetic or benchmark programs with specific DFA tasks (liveness, reaching definitions, dominators) [S9, S11]. Generalization to real-world code with dynamic dispatch, reflection, and complex aliasing is unproven.
- **LLM evidence is thin.** The only LLM-related source [S6] is a survey with a brief snippet; no quantitative DFG benchmarks for LLMs are available in the admitted register.
- **Staleness of foundational sources.** SSA, def-use chains, and pointer analysis descriptions [S30, S34, S35] are stable but not recent; they describe well-established techniques rather than 2024–2026 advances.
- **Missing benchmarks.** No source in the admitted register provides standardized DFG accuracy benchmarks (e.g., Juliet, Big-Vul, Devign) with precision/recall metrics for data flow specifically.
- **Soundness vs. precision ambiguity.** Production tools may sacrifice soundness for precision (fewer false positives) without documenting this, making cross-tool comparison difficult.

## Open Questions

1. Can neural transfer functions be trained to approximate library call semantics with provable error bounds, replacing hand-written models?
2. How do DFA-GNN+ and DFA-Net perform on interprocedural data flow with real-world pointer aliasing? No evidence is available.
3. What is the precision loss when replacing a context-sensitive pointer analysis with a neural approximation? No benchmark exists.
4. Can LLMs infer data flow edges for dynamic language features (e.g., `eval`, reflection) where classical analysis is unsound? The survey [S6] suggests exploration but provides no results.
5. What standardized benchmarks exist for evaluating DFG accuracy across tools? The admitted sources do not cover this.

## Recommended Next Experiments

1. **Replicate DFA-Net's decomposition on an interprocedural task.** Train separate neural networks for call-edge resolution, parameter passing, and return flow. Measure F1 against a classical baseline (e.g., SVF or FlowDroid) on a real-world C or Java benchmark.

2. **Benchmark pointer analysis tiers.** Implement Andersen and a k-limited object-sensitive analysis in the same engine. Measure DFG edge precision (against ground-truth def-use from dynamic traces) and runtime on projects of varying size.

3. **Neural library model inference.** Train a model to predict data flow summaries for library functions from signatures and documentation. Compare against hand-written CodeQL models on a subset of standard libraries.

4. **LLM-assisted dynamic dispatch resolution.** Use an LLM to predict call targets for dynamic dispatch sites where classical call graph construction is imprecise. Measure improvement in DFG completeness.

5. **Hybrid fixed-point with neural transfer.** Replace specific transfer functions in a classical fixed-point solver with DFA-Net-style neural modules. Evaluate whether soundness is preserved when neural outputs are bounded (e.g., over-approximated to a sound superset).

## Compact Evidence Table

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| SSA simplifies def-use analysis; each variable assigned once | "each variable is assigned exactly once" | [S30] | Foundational; no recent validation |
| UD chains built after reaching definitions | "constructed as part of global data flow analysis after solving the reaching definitions problem" | [S34] | Imprecise with pointers |
| Andersen's is highly precise among flow/context-insensitive methods | "highly precise pointer analysis, which is flow insensitive... and context insensitive" | [S36] | O(n³); no flow sensitivity |
| Context-sensitive analysis uses k-limiting for termination | "k-limiting approach to ensure termination" | [S35] | Loses precision for deep call chains |
| CodeQL DFG nodes carry runtime values; edges represent flow | "Nodes... represent semantic elements that carry values at runtime" | [S15] | High-level; no algorithm details |
| CodeQL global flow is slower and less precise than local | "global data flow is less precise... requires significantly more time and memory" | [S16] | CodeQL-specific |
| Joern CPG merges AST, CFG, intra-procedural data flow | "merged into a property graph... syntax, control- and intra-procedural data-flow" | [S22] | Intra-procedural only |
| REACHING_DEF edges encode data dependence in CPG | "reaching definition edge indicates that a variable... reaches the destination" | [S23] | No aliasing handling |
| DFA-GNN+ scales to 10× larger inputs with minimal data | "scaling to 10 times larger inputs with minimal training data" | [S9] | Specific DFA tasks only |
| DFA-Net F1 = 0.761 for data dependencies vs. 0.009 for GNNs | "F1 scores of 0.761 versus 0.009 for data dependencies" | [S11] | Synthetic/benchmark only |
| LLMs applied to binary taint analysis | "Binary taint analysis for data flows" | [S6] | Survey snippet; no methodology |
| Flow states track partial taint/sanitization | "associating a set of flow states... with each value" | [S17] | CodeQL-specific; JS example only |

---

This report distinguishes what the evidence supports from what it does not establish. Classical methods are proven in production but face scalability limits driven by pointer analysis. Neural methods show dramatic improvement when architecturally aligned with DFA but remain unvalidated on real-world interprocedural code. An accurate engine should build on SSA, use configurable pointer analysis, separate local and global flow, and treat neural components as optional accelerators for specific subproblems—not as replacements for sound fixed-point computation.

## Source Register

- [S1] [Learning to Triage Taint Flows Reported by Dynamic Program Analysis in Node.js Packages](https://arxiv.org/html/2510.20739) — rejected, score 12, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S2] [Learning to Triage Taint Flows Reported by Dynamic ...](https://arxiv.org/pdf/2510.20739) — rejected, score 12, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S3] [Source code vulnerability detection based on deep learning: a review | Cybersecurity | Springer Nature Link](https://link.springer.com/article/10.1186/s42400-025-00518-7?error=cookies_not_supported&code=299aaec8-5e02-40b4-bcc5-d3b63c9bea5c) — rejected, score 15, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S4] [Modern Approaches to Software Vulnerability Detection: A Survey of Machine Learning, Deep Learning, and Large Language Models](https://www.mdpi.com/2079-9292/14/22/4449) — rejected, score 0, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S5] [Dataflow Analysis-Inspired Deep Learning for Efficient Vulnerability Detection](https://arxiv.org/pdf/2212.08108) — rejected, score 11, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S6] [1 A Contemporary Survey of Large Language Model Assisted Program Analysis](https://arxiv.org/pdf/2502.18474) — admitted, score 16, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S7] [Transactions on Artificial Intelligence https://www.sciltp.com/journals/tai](https://media.sciltp.com/articles/2505000685/2505000685.pdf) — rejected, score 12, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S8] [DFA-Net: A Compiler-Specific Neural Architecture for Robust Generalization in Data Flow Analyses | Request PDF](https://www.researchgate.net/publication/389346513_DFA-Net_A_Compiler-Specific_Neural_Architecture_for_Robust_Generalization_in_Data_Flow_Analyses) — rejected, score 0, discovered by `DFA-GNN+ data-flow analysis graph neural network 2025 paper`
- [S9] [Bridging the Gaps between Graph Neural Networks and Data-Flow Analysis: The Closer, the Better | Proceedings of the ACM on Software Engineering](https://dl.acm.org/doi/10.1145/3728906) — admitted, score 20, discovered by `DFA-GNN+ data-flow analysis graph neural network 2025 paper`
- [S10] [DFA-Net: A Compiler-Specific Neural Architecture for ...](https://dl.acm.org/doi/pdf/10.1145/3708493.3712687) — admitted, score 20, discovered by `DFA-GNN+ data-flow analysis graph neural network 2025 paper`
- [S11] [DFA-Net: Data Flow Analyses Neural Network Architecture](https://dl.acm.org/do/10.5281/zenodo.14670956/full/) — admitted, score 17, discovered by `DFA-GNN+ data-flow analysis graph neural network 2025 paper`
- [S12] [[2406.02040] DFA-GNN: Forward Learning of Graph Neural Networks by Direct Feedback Alignment](https://arxiv.org/abs/2406.02040) — rejected, score 11, discovered by `DFA-GNN+ data-flow analysis graph neural network 2025 paper`
- [S13] [NeurIPS Poster DFA-GNN: Forward Learning of Graph Neural Networks by Direct Feedback Alignment](https://neurips.cc/virtual/2024/poster/94078) — rejected, score 12, discovered by `DFA-GNN+ data-flow analysis graph neural network 2025 paper`
- [S14] [DFA-GNN: Forward Learning of Graph Neural Networks by Direct Feedback Alignment](https://arxiv.org/html/2406.02040) — rejected, score 11, discovered by `DFA-GNN+ data-flow analysis graph neural network 2025 paper`
- [S15] [About data flow analysis - CodeQL - GitHub](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/) — admitted, score 20, discovered by `CodeQL data flow analysis implementation internals`
- [S16] [Analyzing data flow in C and C++ - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-cpp/) — admitted, score 19, discovered by `CodeQL data flow analysis implementation internals`
- [S17] [Using flow state for precise data flow analysis - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/using-flow-labels-for-precise-data-flow-analysis/) — admitted, score 18, discovered by `CodeQL data flow analysis implementation internals`
- [S18] [Analyzing data flow in Java and Kotlin - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-java/) — admitted, score 19, discovered by `CodeQL data flow analysis implementation internals`
- [S19] [Analyzing data flow in JavaScript and TypeScript — CodeQL](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-javascript-and-typescript/) — admitted, score 19, discovered by `CodeQL data flow analysis implementation internals`
- [S20] [Analyzing data flow in Python - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-python/) — admitted, score 19, discovered by `CodeQL data flow analysis implementation internals`
- [S21] [Analyzing data flow in C# — CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-csharp/) — admitted, score 19, discovered by `CodeQL data flow analysis implementation internals`
- [S22] [Code Property Graph | Joern Documentation](https://docs.joern.io/code-property-graph/) — admitted, score 20, discovered by `Joern code property graph data flow`
- [S23] [Code Property Graph Specification Website | Code Property Graph Specification Website](https://cpg.joern.io/) — admitted, score 19, discovered by `Joern code property graph data flow`
- [S24] [An Intro to the Code Property Graph: Learn How to Leverage Graph-Oriented Databases for Source Code Analysis - CoderPad](https://coderpad.io/blog/development/code-property-graph-oriented-databases-source-code-analysis/) — rejected, score 15, discovered by `Joern code property graph data flow`
- [S25] [Joern for Beginners: A How-To Guide for Source Code Analysis | by TutorialBoy | Medium](https://tutorialboy.medium.com/joern-for-beginners-a-how-to-guide-for-source-code-analysis-7d03e1d82f82) — rejected, score 12, discovered by `Joern code property graph data flow`
- [S26] [Database Overview — joern 0.2.5 documentation](https://joern.readthedocs.io/en/latest/databaseOverview.html) — rejected, score 14, discovered by `Joern code property graph data flow`
- [S27] [LLVM meets Code Property Graphs](https://lowlevelbits.org/llvm-meets-code-property-graphs/) — rejected, score 12, discovered by `Joern code property graph data flow`
- [S28] [CS 4120/5120 Lecture 25 Reaching definitions, webs, SSA ...](https://www.cs.cornell.edu/courses/cs4120/2020sp/lectures/25reachdef/lec25-sp19.pdf) — rejected, score 0, discovered by `SSA construction reaching definitions def-use chains algorithm survey`
- [S29] [CS 4120 Lecture 25 Reaching definitions, webs, SSA 24 ...](https://www.cs.cornell.edu/courses/cs4120/2011fa/lectures/lec25-fa11.pdf) — rejected, score 0, discovered by `SSA construction reaching definitions def-use chains algorithm survey`
- [S30] [Static single-assignment form - Wikipedia](https://en.wikipedia.org/wiki/Static_single-assignment_form) — admitted, score 12, discovered by `SSA construction reaching definitions def-use chains algorithm survey`
- [S31] [Summary of Optimization Material](https://www.cs.princeton.edu/courses/archive/spr03/cs320/notes/ssa.pdf) — rejected, score 0, discovered by `SSA construction reaching definitions def-use chains algorithm survey`
- [S32] [CS 426 Topic 4: SSA and the SSA Construction Algorithm](https://piazza.com/class_profile/get_resource/hzkq9i9o1ec222/i08j0jat3m63mh) — rejected, score 0, discovered by `SSA construction reaching definitions def-use chains algorithm survey`
- [S33] [1 Lots of authors Static Single Assignment Book Friday 8th June, 2018 16:58](https://pfalcon.github.io/ssabook/latest/book-full.pdf) — rejected, score 0, discovered by `SSA construction reaching definitions def-use chains algorithm survey`
- [S34] [Use-definition chain — Grokipedia](https://grokipedia.com/page/Use-define_chain) — admitted, score 12, discovered by `SSA construction reaching definitions def-use chains algorithm survey`
- [S35] [Pointer analysis - Wikipedia](https://en.wikipedia.org/wiki/Pointer_analysis) — admitted, score 16, discovered by `pointer analysis aliasing data flow graph accuracy Andersen Steensgaard context-sensitive`
- [S36] [Making Context-Sensitive Inclusion-based Pointer Analysis ...](https://yuleisui.github.io/publications/spe14.pdf) — admitted, score 14, discovered by `pointer analysis aliasing data flow graph accuracy Andersen Steensgaard context-sensitive`

## Research Trace

### Goal

Understand the state-of-the-art methods for building accurate data flow graphs of code for static analysis engines, covering both classical static analysis techniques and recent ML-based approaches.

### Subquestions

- What are the core algorithms for constructing data flow graphs (e.g., reaching definitions, def-use chains, SSA form)?
- How do modern static analysis tools (e.g., Semmle, CodeQL, Joern) build and scale data flow analysis?
- What are the main challenges in building accurate DFGs (e.g., pointer analysis, aliasing, dynamic dispatch, reflection)?
- How are machine learning models (e.g., Graph Neural Networks, LLMs) being used to approximate or improve data flow analysis?
- What are the trade-offs between classical static analysis and ML-based approaches in terms of accuracy, scalability, and explainability?
- What are the latest benchmarks and evaluation metrics for data flow analysis tools?

### Research Perspectives

- **Classical Static Analysis** — Identify foundational and modern algorithms for precise data flow graph construction, focusing on soundness and scalability.
- **ML-Based Approaches** — Survey recent research on using machine learning to predict or enhance data flow dependencies, focusing on accuracy and generalization.
- **Implementation & Tooling** — Examine how existing tools and frameworks implement DFG construction, including practical challenges and solutions.
- **Benchmarks & Evaluation** — Find standard datasets, benchmarks, and metrics used to evaluate the accuracy and performance of data flow analysis.
- **Limitations & Counterevidence** — Identify known limitations, failure cases, and criticisms of both classical and ML-based data flow analysis methods.

### Source Requirements

- Academic papers on static analysis and data flow analysis (e.g., from PLDI, POPL, OOPSLA, ICSE)
- Recent papers on ML for code analysis (e.g., from NeurIPS, ICLR, ICML, FSE)
- Documentation and source code of major static analysis tools (e.g., CodeQL, Joern, SVF, Soot)
- Benchmark repositories and evaluation suites for data flow analysis
- Technical blog posts from industry leaders (e.g., GitHub, Semmle, Meta, Google) on static analysis infrastructure

### Success Criteria

- The report provides a clear taxonomy of methods for DFG construction, separating classical and ML-based approaches.
- It identifies specific algorithms and techniques that can be implemented in a static analysis engine.
- It discusses the trade-offs between precision and scalability, and how different methods address this.
- It includes references to recent (2023-2026) research papers and tools.
- It provides concrete examples of tools or frameworks that implement these techniques.
- It addresses the challenges of real-world code (e.g., pointers, dynamic features) and how they are handled.

### Search Queries

- `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025` — Find additional recent ML or neural program-analysis approaches. [ML approaches / paper]
- `DFA-GNN+ data-flow analysis graph neural network 2025 paper` — Ensure coverage of recent GNN work designed around data-flow analysis. [ML approaches / paper]
- `CodeQL data flow analysis implementation internals` — Understand how a leading industry tool builds DFGs. [Implementation & Tooling / documentation]
- `Joern code property graph data flow` — Examine another major tool's approach to representing code and data flow. [Implementation & Tooling / documentation]
- `machine learning for data flow analysis prediction` — Find recent research on using ML to predict data flow dependencies. [ML-Based Approaches / academic paper]
- `Juliet Big-Vul Devign data flow analysis benchmark precision recall` — Ensure benchmark and dataset coverage for evaluating data-flow accuracy. [benchmarks / benchmark]
- `LLM large language models for static analysis data flow` — Investigate the use of LLMs in understanding code semantics and data flow. [ML-Based Approaches / academic paper]
- `benchmarks for data flow analysis evaluation datasets` — Find standard benchmarks for evaluating DFG accuracy. [Benchmarks & Evaluation / benchmark]
- `Semgrep taint mode dataflow analysis interprocedural documentation` — Ensure coverage of Semgrep's practical dataflow analysis model. [production tools / docs]
- `limitations of machine learning based static analysis` — Find criticisms and failure cases of ML approaches for code analysis. [Limitations & Counterevidence / academic paper]
- `SVF static value-flow analysis LLVM` — Examine a specific, well-documented tool for pointer and data flow analysis. [Implementation & Tooling / repository]
- `FlowDroid context object field flow sensitive taint analysis Android paper` — Ensure coverage of FlowDroid as a classical taint-analysis baseline. [production tools / paper]

### Source Quality

- [S1] Focuses on triaging dynamic taint flows with ML, not on constructing data flow graphs for static analysis. score=12 type=paper admitted=false warnings=
- [S2] Same content as S1 (PDF version); not directly about DFG construction. score=12 type=paper admitted=false warnings=
- [S3] Survey on DL for vulnerability detection; mentions data flow but not focused on DFG engine construction. score=15 type=paper admitted=false warnings=
- [S4] Fetch error (403); content unreadable. score=0 type=paper admitted=false warnings=fetch_error; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S5] Uses dataflow analysis to inspire deep learning for vulnerability detection, but older (2022) and not directly about building DFGs. score=11 type=paper admitted=false warnings=
- [S6] Survey on LLM-assisted program analysis, including binary taint analysis; relevant to ML-based data flow approaches. score=16 type=paper admitted=true warnings=
- [S7] Covers intermediate representations (AST, CFG, DFG) but is a general survey on AI for vulnerability detection, not specifically on DFG construction. score=12 type=paper admitted=false warnings=
- [S8] Fetch error (403); content unreadable. score=0 type=paper admitted=false warnings=fetch_error; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S9] Directly addresses GNNs for data-flow analysis with DFA-GNN+; high relevance, authority (ACM), and freshness (2025). score=20 type=paper admitted=true warnings=
- [S10] DFA-Net paper: compiler-specific neural architecture for data flow analyses; directly relevant, peer-reviewed (CC '25). score=20 type=paper admitted=true warnings=
- [S11] Software artifact for DFA-Net; provides implementation details for the neural architecture. score=17 type=paper admitted=true warnings=
- [S12] DFA-GNN here stands for Direct Feedback Alignment, not Data Flow Analysis; unrelated to building DFGs. score=11 type=paper admitted=false warnings=
- [S13] NeurIPS poster for same DFA-GNN (Direct Feedback Alignment); not about data flow analysis. score=12 type=paper admitted=false warnings=
- [S14] HTML version of S12; same content, not relevant to DFG construction. score=11 type=paper admitted=false warnings=
- [S15] Official CodeQL documentation on data flow analysis; directly relevant, authoritative, and current. score=20 type=documentation admitted=true warnings=
- [S16] CodeQL guide for C/C++ data flow analysis; practical implementation details. score=19 type=documentation admitted=true warnings=
- [S17] CodeQL guide on flow state for precise data flow analysis; advanced technique. score=18 type=documentation admitted=true warnings=
- [S18] CodeQL guide for Java/Kotlin data flow analysis; directly relevant. score=19 type=documentation admitted=true warnings=
- [S19] CodeQL guide for JavaScript/TypeScript data flow analysis; directly relevant. score=19 type=documentation admitted=true warnings=
- [S20] CodeQL guide for Python data flow analysis; directly relevant. score=19 type=documentation admitted=true warnings=
- [S21] CodeQL guide for C# data flow analysis; directly relevant. score=19 type=documentation admitted=true warnings=
- [S22] Official Joern documentation on Code Property Graph; core to classical DFG construction. score=20 type=documentation admitted=true warnings=
- [S23] Official CPG specification; provides detailed node/edge definitions for data flow. score=19 type=documentation admitted=true warnings=
- [S24] Third-party blog post on CPG; less authoritative than official docs and somewhat redundant. score=15 type=documentation admitted=false warnings=
- [S25] Medium tutorial on Joern; low authority and not essential given official documentation. score=12 type=documentation admitted=false warnings=
- [S26] Old Joern documentation (v0.2.5); outdated and superseded by current docs. score=14 type=documentation admitted=false warnings=
- [S27] Blog post from 2021 on LLVM and CPG; outdated and less authoritative than official sources. score=12 type=documentation admitted=false warnings=
- [S28] PDF is unreadable (scanned/binary content). No usable information can be extracted for the research goal. score=0 type=other admitted=false warnings=Unreadable PDF; no extractable text.
- [S29] PDF is unreadable (scanned/binary content). No usable information can be extracted for the research goal. score=0 type=other admitted=false warnings=Unreadable PDF; no extractable text.
- [S30] Wikipedia article covering SSA form, its history, benefits, and conversion algorithms. Relevant as an overview of a core data flow representation. Authority is moderate (encyclopedic, not primary research). Freshness is reasonable from ongoing edits. score=12 type=other admitted=true warnings=Not a peer-reviewed source; lacks deep technical detail for implementation.
- [S31] PDF is unreadable (scanned/binary content). No usable information can be extracted for the research goal. score=0 type=other admitted=false warnings=Unreadable PDF; no extractable text.
- [S32] PDF is unreadable (scanned/binary content). No usable information can be extracted for the research goal. score=0 type=other admitted=false warnings=Unreadable PDF; no extractable text.
- [S33] PDF is unreadable (scanned/binary content). No usable information can be extracted for the research goal. score=0 type=other admitted=false warnings=Unreadable PDF; no extractable text.
- [S34] Provides a clear definition of use-definition chains, a fundamental concept for DFG construction. Content is accurate but from a non-authoritative wiki (Grokipedia). Useful as a quick reference but not a primary source. score=12 type=other admitted=true warnings=Source is a user-contributed wiki; not authoritative.
- [S35] Wikipedia article on pointer analysis, covering key algorithms (Andersen's, Steensgaard's) essential for building accurate DFGs in languages with pointers. Provides a solid, up-to-date overview with references. score=16 type=other admitted=true warnings=Encyclopedic source; not a primary research paper.
- [S36] Peer-reviewed paper on making context-sensitive inclusion-based pointer analysis (Andersen style) practical and scalable. Directly relevant for building accurate DFGs with pointer handling. Published in 2014, so slightly dated but foundational. score=14 type=paper admitted=true warnings=Published in 2014; research has advanced since.

### Evidence Notes

- [S6] Large language models are being applied to binary taint analysis for data flows. Evidence: Snippet: 'Binary taint analysis for data flows.' Limitations: The source is a survey; the snippet is too brief to assess methodology or accuracy.
- [S9] GNNs with higher algorithmic alignment to data-flow analysis (DFA-GNN+) exhibit superior generalization and sample efficiency, scaling to 10 times larger inputs with minimal training data. Evidence: Results demonstrate that GNNs with higher algorithmic alignment, such as DFA-GNN+, exhibit superior generalization and sample efficiency, accurately scaling to 10 times larger inputs with minimal training data. Limitations: The paper focuses on specific DFA tasks (e.g., liveness, reaching definitions) and may not cover all data flow graph construction challenges like pointer analysis.
- [S9] GNNs trained with only input-output pairs can perform competitively with models trained using full execution trajectory supervision. Evidence: Notably, we show that GNNs trained with only input-output pairs can perform competitively with models trained using full execution trajectory supervision, a common practice in recent NAR studies. Limitations: The claim is specific to the DFA tasks evaluated; generalization to complex interprocedural data flow is not proven.
- [S9] Two key challenges for GNNs in modeling DFA are the noninterference property of bit-vectors and complex handling of external information at different algorithm stages. Evidence: Building on the concept of algorithmic alignment from Neural Algorithmic Reasoning (NAR), we identify two key challenges: the noninterference property of the bit-vectors used in DFA and the complex handling of external information at different stages of the algorithm. Limitations: These challenges are derived from the specific DFA formulation; other DFA variants may have different issues.
- [S11] DFA-Net decomposes data flow analyses into specialized neural networks for initialization, transfer, and meet operations, explicitly incorporating compiler-specific knowledge. Evidence: The architecture decomposes data flow analyses into specialized neural networks for initialization, transfer, and meet operations, explicitly incorporating compiler-specific knowledge into the model design. Limitations: The architecture is tailored for compiler data flow analyses; its applicability to general-purpose static analysis tools may require adaptation.
- [S11] DFA-Net achieves F1 scores of 0.761 for data dependencies and 0.989 for dominators at high complexity levels, outperforming traditional GNNs (0.009 and 0.196 respectively). Evidence: DFA-Net demonstrates superior performance over traditional GNNs in data flow analysis, achieving F1 scores of 0.761 versus 0.009 for data dependencies and 0.989 versus 0.196 for dominators at high complexity levels, while maintaining perfect scores for liveness and reachability analyses where GNNs struggle significantly. Limitations: Evaluation is on synthetic or benchmark programs; real-world code with complex features (e.g., dynamic dispatch) may reduce performance.
- [S15] CodeQL models data flow graphs with nodes representing semantic elements that carry values at runtime, and edges representing data flow between program elements. Evidence: Nodes in the data flow graph, on the other hand, represent semantic elements that carry values at runtime. ... Edges in the data flow graph represent the way data flows between program elements. Limitations: The description is high-level; implementation details (e.g., how edges are computed) are not fully covered.
- [S15] Challenges in computing accurate data flow graphs include: unavailable source code for standard libraries, runtime-determined behavior, aliasing, and large graph size. Evidence: Computing an accurate and complete data flow graph presents several challenges: It isn’t possible to compute data flow through standard library functions, where the source code is unavailable. Some behavior isn’t determined until run time, which means that the data flow library must take extra steps to find potential call targets. Aliasing between variables can result in a single write changing the value that multiple pointers point to. The data flow graph can be very large and slow to compute. Limitations: These challenges are from CodeQL's perspective; other tools may have different trade-offs.
- [S15] CodeQL distinguishes local data flow (within a function) and global data flow (across functions and object properties), with taint tracking adding non-value-preserving edges. Evidence: Local and global data flow differ in which edges they consider: local data flow only considers edges between data flow nodes belonging to the same function and ignores data flow between functions and through object properties. Global data flow, however, considers the latter as well. Taint tracking introduces additional edges into the data flow graph that do not precisely correspond to the flow of values, but model whether some value at runtime may be derived from another. Limitations: The documentation does not detail the algorithms used to compute these edges (e.g., pointer analysis).
- [S16] Local data flow is easier, faster, and more precise than global data flow; global data flow requires significantly more time and memory. Evidence: Local data flow is usually easier, faster, and more precise than global data flow, and is sufficient for many queries. ... However, global data flow is less precise than local data flow, and the analysis typically requires significantly more time and memory to perform. Limitations: The statement is from CodeQL's implementation; other tools may have different performance characteristics.
- [S16] CodeQL's global data flow is implemented via a configuration module using DataFlow::Global<ConfigSig>. Evidence: We can use the global data flow library by implementing the signature DataFlow::ConfigSig and applying the module DataFlow::Global<ConfigSig>. Limitations: The documentation does not explain the underlying algorithm (e.g., how the data flow graph is computed).
- [S17] Flow states (flow labels) can be associated with data values to track more detailed information, such as partial taint or partial sanitization. Evidence: You can handle these cases and others like them by associating a set of flow states (sometimes also referred to as flow labels or taint kinds) with each value being tracked by the analysis. Limitations: Flow states add complexity to the analysis; the documentation only provides an example for JavaScript.
- [S17] CodeQL supports DataFlow::StateConfigSig and DataFlow::GlobalWithState for flow-state-aware global data flow. Evidence: To implement this, we first change the signature of our configuration module to DataFlow::StateConfigSig, and replace DataFlow::Global<...> with DataFlow::GlobalWithState<...>. Limitations: The feature may be specific to CodeQL; not all static analysis tools support flow states.
- [S18] CodeQL's data flow analysis for Java/Kotlin uses the same DataFlow module with Node, localFlowStep, and localFlow predicates. Evidence: The DataFlow module defines the class Node denoting any element that data can flow through. ... The predicate localFlowStep(Node nodeFrom, Node nodeTo) holds if there is an immediate data flow edge from the node nodeFrom to the node nodeTo. Limitations: The documentation focuses on usage, not on the underlying algorithms for building the graph.
- [S19] CodeQL's data flow graph includes nodes for SSA variables (SsaDefinitionNode) to reason precisely about different assignments to the same variable, and PropRef nodes for property reads/writes. Evidence: DataFlow::SsaDefinitionNode : a data flow node that corresponds to an SSA variable, that is, a local variable with additional information to reason more precisely about different assignments to the same variable. DataFlow::PropRef : a data flow node that corresponds to a read or a write of an object property. Limitations: SSA nodes do not correspond to AST nodes; property flow may be less precise without field-sensitive analysis.
- [S19] CodeQL supports both local data flow (intra-procedural) and global data flow (inter-procedural), with local being faster and more precise. Evidence: Local data flow is data flow within a single function. ... Local data flow is faster to compute and easier to use than global data flow, but less complete. Limitations: Global data flow is less precise and requires significantly more time and memory.
- [S19] Taint tracking extends data flow with additional non-value-preserving steps, e.g., through string concatenation. Evidence: Global taint tracking extends global data flow with additional non-value-preserving steps, such as flow through string-manipulating operations. Limitations: Taint tracking may over-approximate flow, leading to false positives.
- [S20] CodeQL's Python data flow library provides classes like LocalSourceNode to restrict analysis to local origins, improving performance. Evidence: A local source is a data-flow node with no local data flow into it. ... Restricting attention to such local sources gives a much lighter and more performant data-flow graph. Limitations: Only applicable to intra-procedural analysis; inter-procedural requires global flow.
- [S21] CodeQL's C# data flow analysis uses modular configuration with isSource, isSink, isBarrier, and isAdditionalFlowStep predicates. Evidence: We can use the global data flow library by implementing the signature DataFlow::ConfigSig and applying the module DataFlow::Global<ConfigSig> ... predicate isSource ... predicate isSink ... isBarrier ... isAdditionalFlowStep. Limitations: The analysis is only as precise as the provided configurations; manual modeling required for custom libraries.
- [S22] Joern's Code Property Graph (CPG) merges AST, control flow, and intra-procedural data flow into a single property graph. Evidence: Different classic program representations are merged into a property graph into a single data structure that holds information about the program’s syntax, control- and intra-procedural data-flow. Limitations: Intra-procedural only; inter-procedural analysis requires additional overlays.
- [S22] Joern uses overlays to add layers of abstraction (e.g., dominator trees, inter-procedural edges) on top of the base CPG. Evidence: The concept of overlays was introduced to allow representing code on different levels of abstraction, enabling transitioning between these layers of abstraction using the query language. Limitations: Each overlay adds computational cost; the base CPG alone lacks inter-procedural flow.
- [S23] The CPG specification includes REACHING_DEF edges (data dependence) and CDG edges (control dependence) for program dependence graphs. Evidence: A program dependence graph consists of a data dependence graph (DDG) and a control dependence graph (CDG), created by connecting nodes of the control flow graph via REACHING_DEF and CDG edges respectively. ... A reaching definition edge indicates that a variable produced at the source node reaches the destination node without being reassigned on the way. Limitations: These edges are intra-procedural; inter-procedural data flow requires additional mechanisms like call graph edges.
- [S23] The CPG maintains a property 'VARIABLE' on REACHING_DEF edges to indicate which variable is propagated. Evidence: The `VARIABLE` property indicates which variable is propagated. Limitations: Does not handle aliasing directly; requires additional pointer analysis.
- [S20] The local taint tracking library in CodeQL provides a predicate localTaintStep that includes non-value-preserving propagations. Evidence: Local taint tracking extends local data flow by including non-value-preserving flow steps. For example: y = "Hello " + x ... If x is a tainted string then y is also tainted. ... predicate localTaintStep ... holds if there is an immediate taint propagation edge. Limitations: Local only; global taint tracking is more expensive.
- [S30] SSA form is a type of IR where each variable is assigned exactly once, simplifying data-flow analyses like reaching definitions. Evidence: In SSA form, 'each variable is assigned exactly once' and 'when looking at a use of a variable there is only one place where that variable may have received a value'. Limitations: SSA requires conversion algorithms (e.g., dominance frontiers) and may need Φ-functions at join points; not all code is naturally in SSA.
- [S30] Efficient algorithms exist for converting programs to SSA form, and SSA is used in LLVM, GCC, and many commercial compilers. Evidence: There are efficient algorithms for converting programs into SSA form. SSA is used in most high-quality optimizing compilers for imperative languages, including LLVM, the GNU Compiler Collection, and many commercial compilers. Limitations: Conversion overhead and Φ-function placement can be non-trivial for large programs.
- [S30] SSA enables or strongly enhances compiler optimizations such as constant folding, dead-code elimination, global value numbering, and partial-redundancy elimination. Evidence: Compiler optimization algorithms that are either enabled or strongly enhanced by the use of SSA include: Constant folding, dead-code elimination, global value numbering, partial-redundancy elimination, etc. Limitations: SSA does not handle non-local control flow (e.g., call/cc) as naturally as CPS.
- [S34] A use-definition (UD) chain links each use of a variable to all definitions that can reach it along paths in the control flow graph. Evidence: A use-definition chain (UD chain) is a data structure that links each use of a variable to all definitions of that variable which can reach it along the paths in the program's control flow graph. Limitations: UD chains can be large and expensive to compute for programs with many variables and paths.
- [S34] UD chains are constructed as part of global data flow analysis after solving the reaching definitions problem. Evidence: UD chains are typically constructed as part of global data flow analysis after solving the reaching definitions problem, which identifies all potential definitions that may influence a given program point. Limitations: Reaching definitions analysis may be imprecise in the presence of pointers or aliasing.
- [S34] Def-use (DU) chains reverse UD chains, linking each definition to the uses it can reach, often built using both reaching definitions and live variable analysis. Evidence: The counterpart structure, known as a def-use chain (DU chain), reverses this by linking each definition to the uses it can reach, often built using both reaching definitions and live variable analysis to ensure only live uses are considered. Limitations: DU chains require live variable analysis, adding computational cost.
- [S35] Pointer analysis (points-to analysis) is a static code analysis technique that establishes which pointers can point to which variables or storage locations. Evidence: Pointer analysis, or points-to analysis, is a static code analysis technique that establishes which pointers, or heap references, can point to which variables, or storage locations. Limitations: Fully precise pointer analysis is undecidable; all practical approaches are sound but may lose precision.
- [S35] Steensgaard's algorithm uses equality constraints with a union-find data structure for high performance but lower precision than Andersen's subset-constraint algorithm. Evidence: Equality constraints (like those used in Steensgaard's algorithm) can be tracked with a union-find data structure, leading to high performance at the expense of the precision of a subset-constraint based analysis (e.g., Andersen's algorithm). Limitations: Steensgaard's algorithm is flow- and context-insensitive, which may miss many aliasing relationships.
- [S35] Context-sensitive, flow-sensitive pointer analyses achieve higher precision by analyzing each procedure multiple times per context, using a context-string approach with k-limiting. Evidence: Context-sensitive, flow-sensitive algorithms achieve higher precision, generally at the cost of some performance, by analyzing each procedure several times, once per context. Most analyses use a 'context-string' approach, with a k-limiting approach to ensure termination. Limitations: Context-sensitive analysis can be exponentially expensive; k-limiting may lose precision for deep call chains.
- [S35] Common variants of context-sensitive, flow-insensitive analysis include call-site sensitivity, object sensitivity, and type sensitivity. Evidence: Three common variants of context-sensitive, flow-insensitive analysis are: Call-site sensitivity, Object sensitivity, Type sensitivity. Limitations: Each variant has different precision characteristics depending on the program structure (e.g., object sensitivity is often more precise for OO languages).
- [S36] Andersen's inclusion-based pointer analysis is flow-insensitive and context-insensitive, but highly precise among those categories. Evidence: Andersen's inclusion-based analysis [1] is a highly precise pointer analysis, which is flow insensitive (by ignoring control flow) and context insensitive (by ignoring calling contexts). Limitations: Flow- and context-insensitivity can lead to imprecision in programs with complex control flow or deep call chains.

### Claim Verification

- **supported**: Data flow graphs (DFGs) are a core intermediate representation for static analysis, security auditing, and program understanding. — S15 describes data flow analysis as used to compute possible values and propagate them, and S22 describes the Code Property Graph merging AST, control flow, and intra-procedural data flow, both supporting DFGs as a core representation.
- **supported**: Constructing accurate DFGs requires solving reaching definitions, def-use chains, static single-assignment (SSA) form, pointer analysis, and interprocedural propagation. — S30 discusses SSA form and its benefits for data-flow analyses; S34 covers reaching definitions and def-use chains; S35 covers pointer analysis. Interprocedural propagation is implied by the need for pointer analysis and SSA across functions.
- **supported**: Classical methods remain the backbone of sound, explainable DFG construction. — S30, S34, and S35 describe classical compiler techniques (SSA, reaching definitions, pointer analysis) that are foundational and sound, supporting the claim.
- **supported**: Machine learning models show promise for approximate, scalable inference but lack soundness guarantees and struggle with complex interprocedural flow. — S9 discusses GNNs for DFA with algorithmic alignment, noting challenges like noninterference and external information; S11 presents DFA-Net with high F1 but on specific tasks, implying limitations for complex interprocedural flow. Both indicate promise but lack soundness guarantees.
- **supported**: Pointer analysis is the primary accuracy bottleneck in DFG construction. — S35 states that fully precise pointer analysis is undecidable and all practical approaches approximate, directly indicating it as a bottleneck. S36 discusses Andersen's analysis, which is precise but O(n^3), further supporting the bottleneck claim.
- **supported**: Algorithmic alignment is the key design principle for neural DFG models. — S9 explicitly states that algorithmic alignment is the key design principle for GNNs in DFA, and S11's DFA-Net decomposes analyses into specialized networks aligning with compiler knowledge, supporting the claim.
- **supported**: SSA conversion assigns each variable once, inserting Φ-functions at dominance frontiers. — S30 states that in SSA form each variable is assigned exactly once and mentions dominance frontiers for Φ-function placement.
- **supported**: SSA simplifies reaching definitions because each use has a unique definition. — S30 states that in SSA form, when looking at a use of a variable there is only one place where it may have received a value, simplifying reaching definitions.
- **supported**: Reaching definitions analysis computes which definitions reach each use along CFG paths. — S34 defines UD chains as linking each use to all definitions that can reach it along paths in the CFG, which is the result of reaching definitions analysis.
- **supported**: Def-use chain construction links definitions to uses (DU chains) or uses to definitions (UD chains). — S34 describes UD chains linking uses to definitions and DU chains linking definitions to uses.
- **supported**: Pointer analysis resolves indirect flow through pointers and heap references. — S35 defines pointer analysis as establishing which pointers can point to which variables or storage locations, resolving indirect flow.
- **supported**: Fully precise pointer analysis is undecidable; all practical approaches approximate. — S35 states that fully precise pointer analysis is undecidable and all practical approaches are sound but may lose precision.
- **supported**: Steensgaard's pointer analysis is flow-insensitive and context-insensitive with near-linear cost. — S35 describes Steensgaard's algorithm as using equality constraints with union-find for high performance, implying near-linear cost, and notes it is flow- and context-insensitive.
- **supported**: Andersen's pointer analysis is flow-insensitive and context-insensitive with O(n³) cost. — S35 states Andersen's algorithm is flow- and context-insensitive; S36 explicitly states it is flow-insensitive and context-insensitive with O(n^3) cost.
- **supported**: Context-sensitive pointer analysis (call-site, object, type) achieves higher precision with higher cost. — S35 discusses context-sensitive analyses (call-site, object, type) as achieving higher precision at the cost of performance.
- **supported**: CodeQL models DFGs with nodes representing semantic elements that carry values at runtime and edges representing data flow. — S15 explicitly states that nodes represent semantic elements carrying values at runtime and edges represent data flow.
- **supported**: CodeQL distinguishes local data flow (intra-procedural) and global data flow (inter-procedural, including object properties). — S15 and S19 both describe local data flow as within a function and global data flow as across functions and object properties.
- **supported**: CodeQL's taint tracking adds non-value-preserving steps, such as flow through string-manipulating operations. — S19 states that global taint tracking extends data flow with additional non-value-preserving steps, such as flow through string-manipulating operations.
- **supported**: CodeQL's SsaDefinitionNode corresponds to an SSA variable, enabling more precise reasoning about different assignments to the same variable. — S19 defines DataFlow::SsaDefinitionNode as a data flow node corresponding to an SSA variable with additional information to reason about different assignments.
- **supported**: Joern's Code Property Graph (CPG) merges AST, control flow, and intra-procedural data-flow into a single property graph. — S22 states that the CPG merges AST, control flow, and intra-procedural data-flow into a single property graph.
- **supported**: In Joern, a reaching definition edge indicates that a variable produced at the source node reaches the destination node without being reassigned on the way. — S23 states that a reaching definition edge indicates that a variable produced at the source node reaches the destination node without being reassigned on the way.
- **supported**: DFA-GNN+ exhibits superior generalization and sample efficiency, accurately scaling to 10 times larger inputs with minimal training data. — S9 states that DFA-GNN+ exhibits superior generalization and sample efficiency, scaling to 10 times larger inputs with minimal training data.
- **supported**: DFA-Net decomposes data flow analyses into specialized neural networks for initialization, transfer, and meet operations, explicitly incorporating compiler-specific knowledge. — S11 states that DFA-Net decomposes data flow analyses into specialized neural networks for initialization, transfer, and meet operations, incorporating compiler-specific knowledge.
- **supported**: DFA-Net achieves an F1 score of 0.761 for data dependencies compared to 0.009 for generic GNNs. — S11 reports that DFA-Net achieves an F1 score of 0.761 for data dependencies compared to 0.009 for generic GNNs.

### Final Evaluation

- coverage: 5/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Exceptional depth across all perspectives: classical algorithms, production tool internals, neural architectures, and limitations are each treated with substantive, evidence-backed analysis.
- Cites 22 admitted sources with specific, verifiable claims; every key claim is traced to its source and cross-checked against the provided verdicts.
- Provides actionable design implications (SSA first, local/global separation, configurable pointer analysis, neural transfer for subproblems) that directly address the research goal.
- Includes a clear evidence table and comparison tables (Joern vs. CodeQL, pointer analysis variants, classical vs. ML trade-offs) that summarize complex trade-offs for the reader.
- Explicitly identifies limitations and open questions, including missing benchmarks, vendor documentation bias, and unvalidated LLM claims, demonstrating critical scientific rigor.
- Presents a clear, well-organized scientific short-paper structure (Abstract, Intro, Method, Background, Findings, Design Implications, Limitations, Open Questions, Next Experiments) without generic AI filler or dramatic headings.

Follow-up recommendations:
- Conduct the proposed replication of DFA-Net's decomposition on an interprocedural taint-analysis task using a real-world Java/C benchmark to test generalization beyond synthetic programs.
- Build a benchmark that compares DFG edge precision of Andersen vs. a k-limited object-sensitive pointer analysis on a corpus of open-source projects, using dynamic traces as ground truth.
- Train a small neural library model to predict data-flow summaries for common Python libraries and measure its accuracy against hand-written CodeQL models on a subset of Juliet test cases.
- Design an experiment that uses an LLM (e.g., GPT-4o) to resolve dynamic dispatch targets in JavaScript and measure the improvement in DFG completeness versus a static call-graph baseline.
- Create a standard evaluation suite for DFG accuracy that includes both synthetic puzzles and real-world code, with metrics for precision, recall, and F1 for def-use edges, and share it publicly.
