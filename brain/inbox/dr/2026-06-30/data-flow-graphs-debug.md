---
title: "how to build accurate data flow graphs of code. building the underlying engine for a static analysis tool. Latest research. Both static classical methods and ML based approaches"
generated_at: 2026-06-28T16:37:13.498523+00:00
strategy: deep-agent-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Building Accurate Data Flow Graphs of Code: Classical and ML-Based Approaches for Static Analysis Engines

## Executive Summary

Constructing accurate data flow graphs (DFGs) is a foundational challenge in building static analysis tools. Classical approaches—rooted in IFDS/IDE graph-reachability algorithms, points-to analysis, and SSA-based value-flow construction—remain the backbone of production-grade DFG engines. Frameworks such as SVF (LLVM/C/C++), Joern (multi-language via Code Property Graphs), Soot, and WALA (Java) provide reusable, extensible infrastructure, each with distinct precision-scalability trade-offs. Recent ML/LLM-based approaches show promise for vulnerability triage and pattern recognition on data flow graphs but face fundamental limitations: token limits prevent whole-repository reasoning, code embeddings fail to capture interprocedural flows, and LLMs struggle to generate correct analysis queries. The most promising 2025–2026 direction is hybrid architectures that combine classical DFG engines (e.g., Joern's CPG) with LLMs via tool-use protocols, achieving practical vulnerability discovery that neither approach achieves alone.

## Key Takeaways

1. **IFDS/IDE remains the theoretical core** for interprocedural data flow analysis, reducing dataflow problems to graph reachability on a "supergraph" [S5][S6]. IDE generalizes IFDS and can be more efficient for problems with large value domains (e.g., constant propagation) [S2][S3]. Both require distributive flow functions, limiting applicability [S7].

2. **Precision bottlenecks are well-characterized**: infeasible paths from correlated method calls [S4], field-sensitivity fact explosion [S1], aliasing, dynamic dispatch, and concurrency all degrade DFG accuracy. Mitigations include context-sensitivity, access-path compression, and iterative pointer-analysis refinement.

3. **SVF** provides a mature, modular DFG engine for LLVM-based languages, using interprocedural memory SSA, sparse analysis, and iterative value-flow/pointer-analysis refinement [S8][S9][S10]. It supports field-, flow-, and context-sensitive pointer analyses and now includes Python bindings and LLVM-21 support [S14].

4. **Joern's Code Property Graph (CPG)** merges AST, CFG, call graph, and PDG (including REACHING_DEF edges for data flow) into a single queryable graph, supporting C/C++, Java, Python, JavaScript, Kotlin, and binaries [S15][S16][S17]. It includes a taint-analysis engine [S20] and has been industrially adopted (ShiftLeft) [S15].

5. **Pure LLM approaches fail at interprocedural DFG reasoning**: token limits, inability to capture cross-function data flows in embeddings, and inability to generate correct CPGQL queries are documented failure modes [S19]. LLMs hallucinate API methods and produce syntactically invalid queries for multi-hop traversals [S19].

6. **Hybrid CPG+LLM approaches show real results**: codebadger integrates Joern's CPG with LLMs via MCP tools (slicing, taint tracking, data flow analysis), enabling discovery of a previously unreported libtiff buffer overflow and a first-attempt patch for CVE-2025-6021 in libxml2 [S19].

7. **ML on DFGs is effective for triage, not construction**: GNNs and fine-tuned LLMs operating on dynamic taint provenance graphs achieve F1=0.915 for vulnerability triage, with 99.2% recall at precision 0.8 [S22]. However, these models consume pre-built graphs—they do not construct DFGs themselves.

8. **Static analysis produces more false positives than dynamic analysis**, complicating triage and motivating ML-assisted filtering [S22].

## Analysis

### Classical Algorithms for DFG Construction

**IFDS (Interprocedural Finite Distributive Subset)** reduces interprocedural dataflow analysis to valid-path reachability on a supergraph by incrementally constructing PathEdge tables [S5][S6]. It applies when flow functions distribute over meet, which constrains the class of analyzable problems [S7]. Flow-insensitive problems reduce to ordinary reachability; flow-sensitive problems require reachability along realizable (context-valid) paths [S5].

**IDE (Interprocedural Distributive Environment)** generalizes IFDS by separating a finite domain D from a potentially infinite value domain V [S2]. Any IFDS problem can be transformed to IDE [S2]. For problems like constant propagation, IDE is more efficient because V's size is irrelevant to algorithmic complexity [S3]. This makes IDE preferable for analyses with large or infinite value domains.

**Key imprecision sources in IFDS/IDE-based DFGs:**
- **Correlated method calls** create infeasible interprocedural paths that standard IFDS/IDE cannot prune, inflating false data-flow edges [S4].
- **Field sensitivity** via access paths generates a large number of data-flow facts, causing scalability problems [S1]. Access-path compression or alternative representations may be needed.
- **Non-distributive flow functions** fall outside IFDS/IDE's applicability, requiring alternative techniques [S7].

**Framework implementations differ in priorities:** Soot's IFDS/IDE implementation prioritizes extensibility and ease of use, while WALA's prioritizes memory efficiency [S1]. This is a critical architectural decision when selecting a base for a DFG engine.

### SVF: Sparse Value-Flow Analysis for LLVM

SVF constructs an interprocedural memory SSA form capturing def-use chains of both top-level and address-taken variables, using points-to information from any pointer analysis (e.g., Andersen's) [S9]. Its core innovation is **iterative refinement**: value-flow construction and pointer analysis improve each other's precision iteratively [S9].

SVF's architecture separates pointer analysis into three loosely coupled components—Graph, Rules, and Solver—enabling extensibility [S9]. It provides a language-independent IR (SVFIR) and generates call graphs, interprocedural CFGs, constraint graphs, and value-flow graphs [S10]. Supported analyses include [S14]:
- **Whole-program analysis (WPA)**: field-sensitive, flow-sensitive
- **Demand-driven analysis (DDA)**: flow-sensitive, context-sensitive points-to
- **Memory SSA (MSSA)**: memory regions, side-effects, SSA form
- **CFL reachability**: standard solver, graph, and grammar
- **Abstract execution (AE)**: cross-domain, recursion, typestate
- **Multithreaded analysis (MTA)**: value-flows for multithreaded programs
- **SABER**: memory leak and double-free detection

SVF now supports LLVM-21, a new build system, and SVF-Python for writing analyzers in Python [S14]. It is limited to LLVM IR input, meaning non-C/C++ languages require additional frontends.

### Joern: Code Property Graphs for Multi-Language DFG

Joern's CPG is a directed, edge-labeled, attributed multigraph with layers including AST, CallGraph, CFG, Dominators, and PDG (comprising CDG for control dependence and REACHING_DEF for data dependence) [S16]. The REACHING_DEF edges in the PDG layer directly encode data flow dependencies—the core of the DFG [S16].

The CPG concept evolved from intra-procedural data flow (2014) to interprocedural analysis (2014–2016), and from 2017 served as the foundation for ShiftLeft's commercial static analysis [S15]. Joern replaced its original graph database with OverflowDB and later flatgraph (v4.0.0), and uses a Scala-based DSL for querying [S15].

Language support maturity varies: C/C++ and Java are rated "Very High," while Ruby is "Medium-Low" [S17]. Joern includes a taint-analysis engine for propagating attacker-controlled data [S20], making it directly usable for DFG-based security analysis.

### ML/LLM-Based Approaches

**Pure LLM limitations for DFG reasoning** are well-documented as of 2026 [S19]:
- Token limits prevent loading entire repositories, making interprocedural flow analysis impossible from raw code alone.
- Code embeddings fail to capture interprocedural data flows.
- LLMs cannot reliably generate CPGQL queries due to scarcity in training corpora, leading to hallucinated API methods and syntactically invalid queries for multi-hop traversals.

**Hybrid CPG+LLM (codebadger, 2026):** codebadger is an MCP server integrating Joern's CPG engine with LLMs, providing high-level tools for program slicing, taint tracking, data flow analysis, call graph extraction, and bounds checking [S19]. By abstracting CPGQL behind tool interfaces, it bypasses LLM query-generation failures. Demonstrated results include navigating an 8,000-method codebase, discovering a previously unreported libtiff buffer overflow, and generating a correct first-attempt patch for CVE-2025-6021 in libxml2 [S19]. *Inference: these results are anecdotal and may not generalize; the paper is a workshop paper and may not be fully peer-reviewed.*

**ML for DFG-based triage (2025):** A study of 1,883 Node.js packages evaluated GNNs, classical ML, LLMs, and hybrid GNN-LLM models for triaging dynamic taint analysis provenance graphs [S22]. Key results:
- Top LLM: F1=0.915; best GNN/classical ML: F1=0.904 [S22].
- At <7% false-negative rate, the leading model eliminates 66.9% of benign packages from manual review at ~60 ms/package [S22].
- At precision 0.8, the best model detects 99.2% of exploitable taint flows [S22].

*Critical caveat:* These ML models consume pre-built provenance graphs from dynamic analysis—they do not construct DFGs. Their accuracy reflects triage performance, not DFG construction quality. The benchmark is limited to Node.js ACE/ACI vulnerabilities [S22].

### Benchmarks and Evaluation

| Benchmark | Scope | Metrics | Limitations |
|-----------|-------|---------|-------------|
| Node.js taint triage dataset [S22] | 1,883 Node.js packages with ACE/ACI vulnerabilities | F1, precision, recall, false-negative rate, throughput | Dynamic analysis ground truth; Node.js only; triage not construction |
| SVF source-sink bug detection [S10][S14] | C programs (memory leaks, double-frees, file-open/close errors) | Bug detection accuracy | Precision depends on pointer analysis; no standardized precision/recall reporting |
| codebadger case studies [S19] | libtiff, libxml2 (CVE-2025-6021) | Qualitative vulnerability discovery/patching | Anecdotal; workshop paper; no systematic evaluation |

*Inference:* There is a notable gap in standardized benchmarks for evaluating static DFG construction accuracy (edge-level precision/recall). Existing benchmarks focus on downstream tasks (bug detection, triage) rather than DFG edge correctness.

## Trade-offs and Edge Cases

### Classical Approaches

| Dimension | Trade-off |
|-----------|-----------|
| **IFDS vs. IDE** | IFDS is simpler but limited to finite domains; IDE handles infinite value domains with potentially better complexity for problems like constant propagation [S2][S3] |
| **Context sensitivity** | Higher precision but exponential blowup in data-flow facts; SVF offers configurable levels [S10] |
| **Field sensitivity** | Improves precision for struct/object fields but causes fact explosion in IFDS [S1] |
| **Flow sensitivity** | More precise ordering but significantly more expensive; SVF supports both flow-sensitive and flow-insensitive modes [S10] |
| **Soot vs. WALA** | Soot: extensible, easier to use; WALA: memory-efficient but harder to extend [S1] |
| **SVF (LLVM) vs. Joern (multi-language)** | SVF offers deeper precision for C/C++ via pointer analysis and memory SSA; Joern offers broader language coverage but with varying frontend maturity [S9][S17] |
| **Infeasible paths** | Correlated method calls create false data-flow edges that IFDS/IDE cannot prune without additional analysis [S4] |
| **CFL reachability** | More precise interprocedural matching but computationally expensive [S10] |

### ML/LLM Approaches

| Dimension | Trade-off |
|-----------|-----------|
| **Pure LLM** | Flexible, zero-shot, but cannot reason over interprocedural flows due to token limits and embedding limitations [S19] |
| **GNN on DFGs** | Effective for classification/triage on graph-structured data, but requires pre-built graphs and labeled training data [S22] |
| **Hybrid CPG+LLM** | Combines precision of classical DFG with LLM reasoning; bypasses query-generation failures via tool abstraction [S19]. Risk: inherits CPG imprecision; LLM may misinterpret tool outputs |
| **Dynamic vs. static DFG for ML input** | Dynamic provenance graphs are more precise (fewer false positives) but miss unexecuted paths; static DFGs are more complete but noisier [S22] |

### Edge Cases and Failure Modes

- **Reflection, dynamic dispatch, and eval**: Not addressed by the admitted sources for classical methods; SVF targets C where these are less prevalent. Joern's PHP support explored dynamically-typed language challenges [S15], but maturity is uncertain.
- **Concurrency**: SVF's MTA handles multithreaded value-flows [S14], but precision and scalability for complex synchronization patterns are not quantified in the sources.
- **LLM hallucination in query generation**: Even with CPG access, LLMs hallucinate API methods and produce invalid CPGQL for multi-hop traversals [S19]. This is a fundamental limitation of training-data scarcity, not easily solved by prompting alone.
- **Static analysis false positives**: Static analysis generates more false positives than dynamic analysis [S22], which compounds when DFGs feed downstream tools. ML triage can filter but introduces its own false negatives.

## Confidence and Open Questions

**High confidence (strong source backing):**
- IFDS/IDE theory, precision limitations, and framework trade-offs [S1][S2][S3][S4][S5][S6][S7]
- SVF architecture, analyses, and capabilities [S8][S9][S10][S14]
- Joern CPG schema, evolution, and language support [S15][S16][S17][S20]
- LLM limitations for interprocedural DFG reasoning [S19]
- ML triage effectiveness on pre-built provenance graphs [S22]

**Medium confidence:**
- codebadger's practical effectiveness: demonstrated on specific case studies but lacks systematic evaluation; workshop paper [S19]
- SVF-Python maturity: mentioned in release notes but no detailed evaluation [S14]

**Low confidence / gaps in evidence:**
- **No source provides edge-level precision/recall metrics for static DFG construction.** Existing evaluations measure downstream tasks (bug detection, triage), not DFG accuracy directly.
- **No source covers CodeQL's internal DFG architecture** in detail, despite it being a major framework. The plan requested CodeQL coverage, but no admitted source provides this.
- **No source covers FlowDroid, WALA's DFG capabilities in detail, or Soot's DFG beyond IFDS/IDE implementation notes.**
- **No source provides 2024–2026 academic papers on GNN-based DFG construction** (as opposed to triage on pre-built graphs). The ML evidence is limited to triage and hybrid tool-use.
- **Stale evidence:** SVF's core architecture paper is from 2016 [S9]; the CPG concept paper references 2014–2017 work [S15]. While both tools are actively maintained [S14][S17], the academic descriptions may not reflect current implementations.
- **Vendor bias:** Joern documentation [S15][S16][S17] and SVF documentation [S10][S14] are self-reported; independent comparative evaluations are absent from the admitted sources.

## Next Actions

1. **Select a base framework** based on target languages: SVF for deep C/C++ precision (leveraging memory SSA and iterative pointer analysis [S9][S10]); Joern for multi-language coverage (CPG with REACHING_DEF edges [S16][S17]); Soot/WALA for Java-specific IFDS/IDE [S1].

2. **Implement interprocedural DFG using IFDS or IDE** depending on value domain characteristics. Use IDE for analyses with large/infinite value domains (e.g., constant propagation) [S2][S3]. Address infeasible paths via correlated-call analysis [S4] and field-sensitivity fact explosion via access-path compression [S1].

3. **Adopt a hybrid CPG+LLM architecture** for downstream analysis tasks: expose DFG operations (slicing, taint tracking, data flow queries) as high-level tools via MCP or similar protocols, avoiding direct LLM query generation [S19].

4. **Build edge-level DFG evaluation benchmarks**: Existing benchmarks measure downstream task accuracy, not DFG construction quality. Create micro-benchmarks with known ground-truth data flow edges (def-use chains across procedures, alias-sensitive flows, field-sensitive flows) and measure edge-level precision/recall.

5. **Investigate CodeQL, FlowDroid, and WALA** directly—the admitted sources do not cover these in sufficient depth. CodeQL's taint-tracking configuration and data flow library architecture would complement the Joern/SVF comparison.

6. **Explore GNN-based DFG refinement**: While current ML work focuses on triage [S22], a promising research direction is using GNNs to predict missing or spurious DFG edges as a post-processing step on classical DFGs, potentially improving precision without sacrificing soundness.

7. **Address language-specific challenges** (reflection, dynamic dispatch, eval) that are underrepresented in the admitted sources. These are critical for Python, JavaScript, and Java DFG accuracy but require evidence beyond the current source register.

## Source Register

- [S1] [Inter-procedural data-flow analysis with IFDS/IDE and Soot | Proceedings of the ACM SIGPLAN International Workshop on State of the Art in Java Program analysis](https://dl.acm.org/doi/10.1145/2259051.2259052) — admitted, score 16, discovered by `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis`
- [S2] [GitHub - amaurremi/IDE: Interprocedural Distributive Environment algorithm implementation · GitHub](https://github.com/amaurremi/IDE) — admitted, score 16, discovered by `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis`
- [S3] [Inter-procedural Data-ﬂow Analysis with IFDS/IDE and Soot ∗ Eric Bodden](http://www.bodden.de/pubs/bodden12inter-procedural.pdf) — admitted, score 16, discovered by `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis`
- [S4] [Precise Data Flow Analysis in the Presence of Correlated Method Calls](https://mrapoport.com/publ/correlated.pdf) — admitted, score 16, discovered by `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis`
- [S5] [Precise Interprocedural Dataﬂow Analysis via Graph Reachability](https://pages.cs.wisc.edu/~fischer/cs701.f14/popl95.pdf) — admitted, score 14, discovered by `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis`
- [S6] [Practical Extensions to the IFDS Algorithm - PLG](https://plg.uwaterloo.ca/~olhotak/pubs/cc10.pdf) — admitted, score 17, discovered by `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis`
- [S7] [Interprocedural Data Flow Analysis in Soot using Value Contexts Rohan Padhye](https://rohan.padhye.org/files/vasco-soap13.pdf) — admitted, score 15, discovered by `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis`
- [S8] [SVF: Interprocedural Static Value-Flow Analysis in LLVM Yulei Sui Jingling Xue](https://yuleisui.github.io/publications/cc16.pdf) — admitted, score 18, discovered by `SVF static value-flow analysis framework LLVM data flow graph`
- [S9] [SVF: interprocedural static value-flow analysis in LLVM | Proceedings of the 25th International Conference on Compiler Construction](https://dl.acm.org/doi/10.1145/2892208.2892235) — admitted, score 18, discovered by `SVF static value-flow analysis framework LLVM data flow graph`
- [S10] [SVF: Static Value-Flow Analysis Framework for Source Code](https://svf-tools.github.io/SVF/) — admitted, score 20, discovered by `SVF static value-flow analysis framework LLVM data flow graph`
- [S11] [SVF: interprocedural static value-flow analysis in LLVM | Request PDF](https://www.researchgate.net/publication/311492133_SVF_interprocedural_static_value-flow_analysis_in_LLVM) — rejected, score 12, discovered by `SVF static value-flow analysis framework LLVM data flow graph`
- [S12] [SVF: Interprocedural Static Value-Flow Analysis in LLVM – Mustakimur Khandaker](https://www.mustakim.info/secure-blog/compiler-as-tool/svf-interprocedural-static-value-flow-analysis-in-llvm/) — rejected, score 10, discovered by `SVF static value-flow analysis framework LLVM data flow graph`
- [S13] [[PDF] SVF: interprocedural static value-flow analysis in LLVM | Semantic Scholar](https://www.semanticscholar.org/paper/SVF:-interprocedural-static-value-flow-analysis-in-Sui-Xue/e988198a8b5b7a9835d8f97e108928ed8ad8855c) — rejected, score 15, discovered by `SVF static value-flow analysis framework LLVM data flow graph`
- [S14] [GitHub - SVF-tools/SVF: Static Value-Flow Analysis Framework for Source Code · GitHub](https://github.com/SVF-tools/SVF) — admitted, score 20, discovered by `SVF static value-flow analysis framework LLVM data flow graph`
- [S15] [Code Property Graph | Joern Documentation](https://docs.joern.io/code-property-graph/) — admitted, score 20, discovered by `Joern code property graph data flow analysis static analysis engine`
- [S16] [Code Property Graph Specification Website | Code Property Graph Specification Website](https://cpg.joern.io/) — admitted, score 19, discovered by `Joern code property graph data flow analysis static analysis engine`
- [S17] [GitHub - joernio/joern: Open-source code analysis platform for C/C++/Java/Binary/Javascript/Python/Kotlin based on code property graphs. Discord https://discord.gg/vv4MH284Hc · GitHub](https://github.com/joernio/joern) — admitted, score 20, discovered by `Joern code property graph data flow analysis static analysis engine`
- [S18] [Joern for Beginners: A How-To Guide for Source Code Analysis | by TutorialBoy | Medium](https://tutorialboy.medium.com/joern-for-beginners-a-how-to-guide-for-source-code-analysis-7d03e1d82f82) — rejected, score 12, discovered by `Joern code property graph data flow analysis static analysis engine`
- [S19] [Bridging Code Property Graphs and Language Models for Program Analysis](https://arxiv.org/html/2603.24837v1) — admitted, score 19, discovered by `Joern code property graph data flow analysis static analysis engine`
- [S20] [Overview | Joern Documentation](https://docs.joern.io/) — admitted, score 20, discovered by `Joern code property graph data flow analysis static analysis engine`
- [S21] [Getting started with static code analysis using Joern | by Eli Rizk | Medium](https://medium.com/@elirizk/getting-started-with-static-code-analysis-using-joern-6311e611be91) — rejected, score 12, discovered by `Joern code property graph data flow analysis static analysis engine`
- [S22] [Learning to Triage Taint Flows Reported by Dynamic Program Analysis in Node.js Packages](https://arxiv.org/html/2510.20739) — admitted, score 17, discovered by `machine learning data flow analysis taint detection GNN 2024 2025`
- [S23] [Modern Approaches to Software Vulnerability Detection: A Survey of Machine Learning, Deep Learning, and Large Language Models](https://www.mdpi.com/2079-9292/14/22/4449) — rejected, score 16, discovered by `machine learning data flow analysis taint detection GNN 2024 2025`
- [S24] [Graph neural networks for anomaly detection: a systematic review of dynamic temporal approaches | Artificial Intelligence Review | Springer Nature Link](https://link.springer.com/article/10.1007/s10462-026-11532-7?error=cookies_not_supported&code=fa574dfc-408c-4fb1-b155-0f0893c6fc59) — rejected, score 16, discovered by `machine learning data flow analysis taint detection GNN 2024 2025`

## Research Trace

### Goal

Identify the latest techniques and research for building an accurate data flow graph (DFG) extraction engine for static analysis, covering both classical static analysis methods and modern ML-based approaches.

### Subquestions

- What are the classical algorithms and data structures for constructing precise interprocedural data flow graphs (e.g., IFDS, IDE, points-to analysis, SSA)?
- What are the main sources of imprecision in DFG construction (e.g., aliasing, reflection, dynamic dispatch, concurrency) and how do modern static analyzers mitigate them?
- What open-source static analysis frameworks provide reusable DFG construction engines (e.g., Joern, SVF, Soot, CodeQL, FlowDroid) and how do they compare in architecture and accuracy?
- What recent ML or LLM-based approaches have been proposed for data flow analysis, taint analysis, or DFG construction, and how do they compare to classical methods in accuracy and scalability?
- What benchmarks and datasets exist for evaluating data flow analysis accuracy (e.g., Juliet, SARD, Big-Vul, Devign, custom micro-benchmarks) and what metrics are used?
- What are the known failure modes, false positive/negative rates, and scalability limits of both classical and ML-based DFG approaches reported in recent literature?

### Research Perspectives

- **Classical Static Analysis** — Understand foundational and modern classical algorithms for precise DFG construction, including IFDS/IDE, SSA, points-to, and context-sensitivity.
- **Implementation & Tooling** — Survey existing open-source engines and frameworks that implement DFG extraction, their architecture, and practical integration patterns.
- **ML/LLM-based Approaches** — Identify recent research applying machine learning or LLMs to data flow analysis, including learned representations, GNNs, and LLM-based reasoning for taint/data flow.
- **Benchmarks & Evaluation** — Find benchmarks, datasets, and evaluation methodologies for measuring DFG accuracy, precision, and recall.
- **Criticism & Limitations** — Surface counterevidence, failure modes, scalability issues, and comparative weaknesses of both classical and ML-based approaches.
- **Recency & State-of-the-Art** — Ensure coverage of the latest 2024-2026 research papers and developments in DFG construction and static analysis.

### Source Requirements

- Peer-reviewed academic papers on data flow analysis, IFDS/IDE, and ML for static analysis (2020-2026)
- Official documentation and repositories of major static analysis frameworks (Joern, SVF, Soot, CodeQL, FlowDroid, Wala)
- Technical reports or blog posts from industry static analysis teams (e.g., GitHub CodeQL, Semmle, Microsoft, Google)
- Benchmark suites and evaluation datasets for data flow and taint analysis
- Comparative studies or surveys of static analysis accuracy and scalability
- Critiques or empirical studies reporting false positive/negative rates of DFG-based analyses

### Success Criteria

- The report identifies at least 3 classical algorithms with clear descriptions of their precision/scalability trade-offs for DFG construction.
- The report surveys at least 4 open-source frameworks with their DFG capabilities, architecture, and language support.
- The report identifies at least 3 recent ML/LLM-based approaches with reported accuracy or comparison to classical baselines.
- The report includes at least 2 benchmarks or datasets with evaluation metrics for DFG accuracy.
- The report explicitly discusses failure modes and limitations of both classical and ML approaches.
- The report includes references from 2024 or later to ensure recency.

### Search Queries

- `interprocedural data flow graph construction algorithms IFDS IDE points-to analysis` — Find foundational and advanced classical algorithms for precise DFG construction. [Classical Static Analysis / academic paper / survey]
- `SVF static value-flow analysis framework LLVM data flow graph` — Identify a leading open-source DFG/points-to engine and its architecture. [Implementation & Tooling / official repo / documentation]
- `Joern code property graph data flow analysis static analysis engine` — Survey Joern's CPG approach which combines AST, CFG, and DFG. [Implementation & Tooling / official documentation / repo]
- `machine learning data flow analysis taint detection GNN 2024 2025` — Find recent ML-based approaches for data flow and taint analysis. [ML/LLM-based Approaches / research paper]
- `LLM large language model static analysis data flow reasoning 2025 2026` — Identify the latest LLM-based approaches for DFG construction or taint analysis. [ML/LLM-based Approaches / research paper / preprint]
- `benchmark dataset data flow analysis accuracy evaluation precision recall` — Find benchmarks and metrics for evaluating DFG accuracy. [Benchmarks & Evaluation / benchmark / dataset]
- `static analysis false positives imprecision aliasing dynamic dispatch mitigation` — Surface sources of imprecision and mitigation strategies in DFG construction. [Criticism & Limitations / empirical study / survey]
- `CodeQL data flow analysis architecture precision scalability` — Understand GitHub CodeQL's approach to DFG construction and its trade-offs. [Implementation & Tooling / official documentation / technical report]
- `limitations of machine learning static analysis scalability failure modes 2024` — Find counterevidence and limitations of ML-based approaches for static analysis. [Criticism & Limitations / research paper / critique]

### Source Quality

- [S1] Foundational IFDS/IDE tutorial from a leading researcher (Bodden), directly relevant to classical DFG algorithms. Very high authority and relevance, but published 2012, so freshness is limited for 2026 state-of-the-art. score=16 type=academic paper admitted=true warnings=Dated (2012); supplementary with newer sources for 2026 perspective
- [S2] GitHub repo for IDE algorithm implementation built on WALA. High relevance for implementation details of IFDS/IDE. Repository is still maintained (updated 2025), provides independent evidence for IDE solvers. score=16 type=repo admitted=true warnings=Implementation-focused; needs pairing with theoretical papers
- [S3] Detailed IFDS/IDE paper by Bodden with side-by-side comparison and complexity analysis. Directly relevant and authoritative. Freshness is low (2012) but fundamental to the topic. score=16 type=academic paper admitted=true warnings=Dated (2012); supplement with modern critiques
- [S4] SAS 2015 paper on correlated method calls and their impact on precision. Relevant to failure modes of classical DFG. Provides independent perspective on imprecision sources. Older but still valuable. score=16 type=academic paper admitted=true warnings=2015 publication; not recent
- [S5] Seminal POPL 1995 paper introducing IFDS via graph reachability. Foundational for interprocedural DFG. Extremely high authority, but very low freshness. Still relevant for understanding origins. score=14 type=academic paper admitted=true warnings=Very old (1995); use for background only
- [S6] CC 2010 paper on practical extensions to IFDS, addressing scalability. Directly relevant to classical DFG with practical value. Independence is high as it covers distinct extensions. score=17 type=academic paper admitted=true warnings=Moderate age (2010); not recent but still cited
- [S7] SOAP 2013 paper on value contexts in Soot for interprocedural DFG. Relevant to classical methods. Authority is solid (Padhye). Freshness low. Provides unique perspective on value contexts. score=15 type=academic paper admitted=true warnings=Dated (2013)
- [S8] CC 2016 paper introducing SVF, a leading open-source value-flow framework on LLVM. Highly relevant for DFG construction engine. Very authoritative (peer-reviewed). Still used widely. score=18 type=academic paper admitted=true warnings=2016; framework is actively updated but paper is not recent
- [S9] ACM proceedings version of the SVF paper. Same content and assessment as S8. High relevance and authority. score=18 type=academic paper admitted=true warnings=Redundant with S8; use one
- [S10] Official SVF website and documentation. Extremely relevant for tooling perspective. Authority is official. Freshness is high (documentation updated for current version, 2025-2026). Independent source for architecture and usage. score=20 type=official documentation admitted=true warnings=
- [S11] ResearchGate page for SVF paper is unreadable due to 403 error and CAPTCHA. Cannot extract content. Not admitted. score=12 type=academic paper admitted=false warnings=Fetch error: 403 Forbidden, page blocked by CAPTCHA; fetch failed: Source fetch API returned HTTP 403 Forbidden: <html lang="en"><head><title>researchgate.net</title><style>#cmsg{animation: A 1.5s;}@keyframes A{0%{opacity:0;}99%{opacity:0;}100%{opacity:1;}}</style></head><body style="margin:0"><p id="cmsg">Please enable JS and disable any ad blocker</p><script data-cfasync="false">var dd={'rt':'c','cid':'AHrlqAAAAAMACe6-3hdeJ34AWaA2Yg==','hsh':'2B205E52288E6D0CF00A1BB40B7A18','t':'fe','qp':'','s':61645,'e':'fd40333c40996b157fbb757839269aa89160db46b2a1406a3d9965338435835acce9bd87aa924d98bbfc347909d4108a','host':'geo.captcha-delivery.com','cookie':'uFm37JVyne5oXzUwL3z3wfqQ9etNwcg31rE_UNdEwHvksG_6HZkegh1eawEBT6vfH110Vd9_GSvdT7FBnjco4EC17k83orpt_sL9d9XmV8ES_7ZJnmVVdLVsv2soVjQP'}</script><script data-cfasync="false" src="https://ct.captcha-delivery.com/c.js"></script><script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'a12e1e42ff3fe9c1',t:'MTc4MjY2NDY2OA=='};var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script></body></html>
- [S12] Personal blog summary of SVF paper. Low authority, thin content that largely mirrors the original paper. Adds little independent value over S8/S9/S10. score=10 type=blog/summary admitted=false warnings=Thin summary; use primary sources instead
- [S13] Semantic Scholar page for SVF paper is blocked by JavaScript anti-bot requirement. Cannot extract meaningful content. Not admitted. score=15 type=academic paper admitted=false warnings=Fetch error: requires JavaScript / anti-bot challenge
- [S14] Official GitHub repository for SVF. Extremely relevant for implementation and tooling. Highest authority and freshness (active development). Independent from papers. score=20 type=repo admitted=true warnings=Requires pairing with paper for algorithms understanding
- [S15] Joern official documentation page for Code Property Graph (CPG). Directly relevant to DFG construction via CPG. Official source, highly authoritative. Freshness high (2026). Independent perspective on CPG-based DFG. score=20 type=official documentation admitted=true warnings=
- [S16] Official CPG specification website from Joern project. Provides detailed schema for DFG nodes and edges. High relevance and authority. Current documentation. score=19 type=official documentation admitted=true warnings=Schema-focused; less on algorithms
- [S17] Official Joern GitHub repository. Highly relevant for implementation and tooling. Active development (2026). Independent source from other frameworks. score=20 type=repo admitted=true warnings=Requires supplementing with documentation for architecture understanding
- [S18] Medium tutorial on Joern. Low authority (personal blog). Content is basic and duplicates official docs. Not a primary source for research. score=12 type=blog/tutorial admitted=false warnings=Low authority; use official docs instead
- [S19] arXiv 2026 paper on bridging CPG and LLMs for program analysis. Directly relevant to ML/LLM-based approaches for DFG. Very fresh (March 2026). Provides independent perspective on integrating CPG with LLMs. score=19 type=research paper admitted=true warnings=Preprint; not yet peer-reviewed
- [S20] Joern main documentation overview page. Covers supported languages, taint analysis, and architecture. High relevance and authority. Current. score=20 type=official documentation admitted=true warnings=Overview-level; needs deeper pages for detailed algorithms
- [S21] Medium tutorial on Joern basics. Low authority. Content is introductory and largely redundant with official docs. Not suitable as a research source. score=12 type=blog/tutorial admitted=false warnings=Low authority; thin content
- [S22] arXiv 2025 paper on using ML/GNN/LLMs to triage dynamic taint flows. Relevant to ML-based taint analysis, a related area to DFG. Fresh (2025). Independent perspective on combining program analysis and ML. score=17 type=research paper admitted=true warnings=Focuses on dynamic analysis and triage, not DFG construction per se; tangentially relevant
- [S23] MDPI survey on ML/DL/LLM for vulnerability detection. Potentially relevant but fetch returned 403 Access Denied. Cannot evaluate content. score=16 type=research paper admitted=false warnings=Fetch error: 403 Access Denied; fetch failed: Source fetch API returned HTTP 403 Forbidden: <HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 
You don't have permission to access "http&#58;&#47;&#47;www&#46;mdpi&#46;com&#47;2079&#45;9292&#47;14&#47;22&#47;4449" on this server.<P>
Reference&#32;&#35;18&#46;21ec1702&#46;1782664668&#46;5a812e93
<P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;21ec1702&#46;1782664668&#46;5a812e93</P>
</BODY>
</HTML>

- [S24] Springer survey on GNN for anomaly detection (dynamic temporal). Not focused on DFG construction or static analysis. Off-topic for the research plan. score=16 type=research paper admitted=false warnings=Off-topic; focuses on dynamic temporal anomaly detection, not code data flow graphs

### Evidence Notes

- [S1] The IFDS algorithm is pivotal for field-sensitive data-flow problems but conventional use of access paths leads to a large number of data-flow facts, causing scalability challenges. Evidence: The IFDS algorithm is pivotal in solving field-sensitive data-flow problems. However, its conventional use of access paths for field sensitivity leads to the generation of a large number of data-flow facts. Limitations: The paper identifies the problem but does not fully solve it; extensions like access path compression may be needed.
- [S1] Soot's IFDS/IDE implementation prioritizes extensibility and ease of use, while WALA's implementation prioritizes memory efficiency. Evidence: While WALA's implementation is geared much towards memory efficiency, ours is currently geared more towards extensibility and ease of use and we focus on efficiency as a secondary goal. Limitations: Soot's implementation may be less efficient for large programs; WALA's may be harder to extend.
- [S2] IDE is a generalization of IFDS; any IFDS problem can be transformed to an equivalent IDE problem and solved with the IDE solver. Evidence: IDE is a generalization of the IFDS algorithm. Any IFDS problem can be transformed to an equivalent IDE problem and solved with the IDE solver. Limitations: IDE may have different performance characteristics; transformation overhead may exist.
- [S3] For problems like constant propagation, IDE can be more efficient than IFDS because the value domain size is irrelevant to IDE's complexity. Evidence: In IDE, on the other hand, one can model the problem by choosing just D := Var as the finite domain and V := N as the value domain. Since the size of V is irrelevant to the complexity of the IDE algorithm, IDE will terminate more quickly. Limitations: This advantage applies only when the problem can be naturally expressed with a separate value domain; not all problems fit.
- [S4] Existing data-flow analysis algorithms (IFDS/IDE) are unable to ignore infeasible paths caused by correlated method calls, leading to imprecision. Evidence: The program's interprocedural control-flow graph will contain infeasible paths. Existing algorithms for data-flow analysis are unable to ignore such infeasible paths. Limitations: The paper proposes a solution (correlated method calls), but the snippet only states the problem; the solution may add complexity.
- [S5] Flow-insensitive interprocedural dataflow-analysis problems can be solved via ordinary reachability, while flow-sensitive problems require reachability along realizable paths. Evidence: flow-insensitive interprocedural dataflow-analysis problems can be converted to reachability problems. Because they deal only with flow-insensitive problems, the solution method involves ordinary reachability rather than the more difficult question of reachability along realizable paths. Limitations: This is a classic result; not new. Realizable path reachability is more computationally expensive.
- [S6] The IFDS algorithm reduces dataflow analysis to valid-path reachability on the supergraph by incrementally constructing PathEdge and PathEdge tables. Evidence: The dataflow analysis therefore reduces to valid-path reachability on the supergraph. The IFDS algorithm works by incrementally constructing two tables, PathEdge and ... Limitations: The snippet is incomplete; full details require reading the paper. The approach may have high memory usage for large programs.
- [S7] Graph reachability based interprocedural analysis is a special case of the functional approach, requiring flow functions to distribute over meet. Evidence: Graph reachability based interprocedural analysis is a special case of the functional approach. Formally, it requires flow functions 2^A → 2^A to distribute over the meet operation so that they can be decomposed into meets of flow functions A → A. Limitations: Not all data-flow problems have distributive flow functions; non-distributive problems require different techniques.
- [S8] SVF provides a higher-level abstraction graph extracted from LLVM IR, indicating where pointer analysis should be performed for value-flow analysis. Evidence: Graph is a higher-level abstraction extracted from the LLVM IR of a program, indicating where pointer analysis should be performed. Limitations: The snippet is brief; more details on SVF's architecture and accuracy are needed. It is tied to LLVM IR.
- [S9] SVF enables scalable and precise interprocedural static value-flow analysis for C programs by leveraging sparse analysis and iterative value-flow construction and pointer analysis. Evidence: SVF, a tool that enables scalable and precise interprocedural Static Value-Flow analysis for C programs by leveraging recent advances in sparse analysis. SVF ... allows value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both. Limitations: Focused on C programs; requires LLVM IR as input; precision depends on the pointer analysis used (e.g., Andersen's).
- [S9] SVF constructs an interprocedural memory SSA form capturing def-use chains of both top-level and address-taken variables. Evidence: SVF accepts points-to information generated by any pointer analysis (e.g., Andersen’s analysis) and constructs an interprocedural memory SSA form, in which the def-use chains of both top-level and address-taken variables are captured. Limitations: Assumes points-to information is available; may not handle all language features (e.g., reflection) not present in C.
- [S9] SVF divides pointer analysis into three loosely coupled components: Graph, Rules, and Solver, providing an extensible interface. Evidence: By dividing a pointer analysis into three loosely coupled components: Graph, Rules and Solver, SVF provides an extensible interface for users to write their own solutions easily. Limitations: The paper is from 2016; newer versions may have evolved but the core architecture remains.
- [S10] SVF provides a language-independent intermediate representation (SVFIR) and generates code graphs including call graph, interprocedural control-flow graph, constraint graph, and value-flow graph. Evidence: SVF IR: language-independent intermediate representation. Code graphs, including call graph and interprocedural control-flow graph, constraint graph and value-flow graph. Limitations: The IR is language-independent but the tool primarily targets LLVM IR; support for other languages may require additional frontends.
- [S10] SVF supports a set of pointer analyses including field-sensitive, flow-sensitive, and context-sensitive analyses. Evidence: A set of pointer analyses including field-sensitive, flow-sensitive, context-sensitive analyses. Limitations: Scalability may decrease with higher sensitivity levels; trade-offs between precision and performance are inherent.
- [S10] SVF includes value-flow dependence analysis, interprocedural memory SSA, and context-free-language reachability analysis. Evidence: Value-flow dependence analysis. Interprocedural memory SSA. Context-free-language reachability analysis. Limitations: CFL reachability can be computationally expensive; scalability to very large codebases may be limited.
- [S10] SVF can detect source-sink related bugs such as memory leaks and incorrect file-open close errors. Evidence: Detecting source-sink related bugs, such as memory leaks and incorrect file-open close errors. Limitations: Detection accuracy depends on the precision of the underlying DFG and pointer analysis; false positives/negatives are possible.
- [S14] SVF now supports LLVM-21, a new build system, and SVF-Python enabling developers to write static analyzers in Python. Evidence: SVF now supports LLVM-21 (Contributed by cjsrxzdyzds). SVF now supports new build system ... SVF-Python is now available, enabling developers to write static analyzers in Python by leveraging the SVF library. Limitations: Python bindings may have performance overhead compared to native C++ usage; maturity of the Python API may vary.
- [S14] SVF includes analyses such as abstract execution (AE), whole program analysis (WPA), demand-driven analysis (DDA), memory SSA construction (MSSA), memory error checking (SABER), multithreaded analysis (MTA), and CFL reachability. Evidence: SVF is able to perform AE (abstract execution): cross-domain execution (ICSE'24), recursion analysis (ECOOP'25) typestate analysis (FSE'24); WPA (whole program analysis): field-sensitive (SAS'19), flow-sensitive (CGO'21, OOPSLA'21) analysis; DDA (demand-driven analysis): flow-sensitive, context-sensitive points-to analysis (FSE'16, TSE'18); MSSA (memory SSA form construction): memory regions, side-effects, SSA form (JSS'18); SABER (memory error checking): memory leaks and double-frees (ISSTA'12, TSE'14, ICSE'18); MTA (analysis of multithreaded programs): value-flows for multithreaded programs (CGO'16); CFL (context-free-reachability analysis): standard CFL solver, graph and grammar (OOPSLA'22, PLDI'23). Limitations: Some analyses (e.g., MTA) are specialized; not all may be needed for a general-purpose DFG engine. Performance and scalability vary per analysis.
- [S15] The code property graph (CPG) merges classic program representations (syntax, control flow, intra-procedural data flow) into a single property graph stored in a graph database. Evidence: Different classic program representations are merged into a property graph into a single data structure that holds information about the program’s syntax, control- and intra-procedural data-flow. The property graph is stored in a graph database and made accessible via a domain specific language (DSL) for the identification of programming patterns. Limitations: Intra-procedural data flow only in the original CPG; interprocedural analysis was added later. Storage in a graph database may introduce overhead.
- [S15] From 2014-2016, research extended the CPG concept for interprocedural analysis, learning typical data-flow patterns, dominator trees, and dynamically-typed languages like PHP. Evidence: From 2014-2016, research followed on (a) extending the concept for interprocedural analysis, (b) using the graph as a basis for learning typical data-flow patterns in a program, (c) the effects of introducing further classic program representations such as dominator trees, (d) and the applicability of the approach for dynamically-typed languages such as PHP. Limitations: The learning of data-flow patterns is not detailed; may be preliminary. Dynamically-typed language support may have limitations.
- [S15] From 2017 onwards, the CPG served as the technological foundation for ShiftLeft Inc.'s static analysis solutions. Evidence: From 2017 onwards, the code property graph served as the technological foundation for the static analysis solutions developed at ShiftLeft Inc. Limitations: Commercial solutions may have proprietary extensions not available in open-source Joern.
- [S15] Joern replaced both the storage backend and query language with its own graph database OverflowDB (later flatgraph) and a Scala-based DSL. Evidence: As the limitations of this approach became more apparent over the years, we replaced both the storage backend and query language with our own graph database OverflowDB. ... Joern v4.0.0 migrates from overflowdb to flatgraph. Limitations: Custom graph database may have a learning curve; migration may break backward compatibility.
- [S16] The CPG specification defines a directed, edge-labeled, attributed multigraph with layers including MetaData, FileSystem, Namespace, AST, CallGraph, CFG, Dominators, PDG (including CDG and REACHING_DEF), and more. Evidence: The code property graph is a directed, edge-labeled, attributed multigraph. ... The graph schema is structured into multiple layers ... MetaData, FileSystem, Namespace, Method, Type, Ast, CallGraph, Cfg, Dominators, Pdg (CDG, REACHING_DEF), etc. Limitations: The specification is specific to Joern; other tools may use different representations. Some layers may not be fully implemented for all frontends.
- [S17] Joern is an open-source code analysis platform for C/C++/Java/Binary/Javascript/Python/Kotlin based on code property graphs, developed for vulnerability discovery and research. Evidence: Joern is a platform for analyzing source code, bytecode, and binary executables. It generates code property graphs (CPGs), a graph representation of code for cross-language code analysis. ... Joern is developed with the goal of providing a useful tool for vulnerability discovery and research in static program analysis. Limitations: Maturity varies by language (e.g., C/C++ and Java are 'Very High', Ruby is 'Medium-Low'). Some frontends may not produce fully accurate DFGs.
- [S20] Joern provides a taint-analysis engine that allows static propagation of attacker-controlled data. Evidence: Joern provides a taint-analysis engine that allows the propagation of attacker-controlled data in the code to be analyzed statically. Limitations: Taint analysis precision depends on the underlying DFG and may have false positives/negatives; may not handle all implicit flows.
- [S19] LLMs face critical challenges in analyzing security vulnerabilities in real-world codebases: token limits prevent loading entire repositories, code embeddings fail to capture inter-procedural data flows, and LLMs struggle to generate complex static analysis queries (e.g., CPGQL). Evidence: Large Language Models (LLMs) face critical challenges when analyzing security vulnerabilities in real-world codebases: token limits prevent loading entire repositories, code embeddings fail to capture inter-procedural data flows, and LLMs struggle to generate complex static analysis queries. Limitations: The paper is from 2026; these limitations may be partially addressed by future models or techniques.
- [S19] codebadger integrates Joern's CPG engine with LLMs via high-level tools (program slicing, taint tracking, data flow analysis, call graph extraction, bounds checking) using the Model Context Protocol (MCP). Evidence: We introduce codebadger, an open-source Model Context Protocol (MCP) server that integrates Joern’s Code Property Graph (CPG) engine with LLMs. ... codebadger provides high-level tools for program slicing, taint tracking, data flow analysis, and semantic code navigation. Limitations: The approach relies on the accuracy of Joern's CPG; LLM may still make errors in tool invocation or interpretation. The paper is a workshop paper; may not be fully peer-reviewed.
- [S19] codebadger enabled an LLM to discover and exploit a previously unreported buffer overflow in libtiff and generate a correct patch for CVE-2025-6021 in libxml2 on the first attempt. Evidence: We demonstrate its effectiveness through three use cases: (1) navigating an 8,000-method codebase to audit memory safety patterns, (2) discovering and exploiting a previously unreported buffer overflow in libtiff, and (3) generating a correct patch for an integer overflow vulnerability (CVE-2025-6021) in libxml2 on the first attempt. Limitations: Anecdotal evidence; may not generalize to all vulnerability types or codebases. The 'first attempt' claim may depend on specific LLM configuration.
- [S19] LLMs struggle to generate correct CPGQL queries due to scarcity of CPGQL in training corpora, leading to hallucinated API methods or syntactically invalid queries. Evidence: LLMs struggle to generate correct queries for non-trivial analyses due to the scarcity of CPGQL in general-purpose training corpora. ... models frequently hallucinate API methods or produce syntactically invalid queries when attempting multi-hop traversals. Limitations: This limitation may be mitigated by fine-tuning or few-shot prompting, but the paper suggests it remains a significant challenge.
- [S22] Dynamic taint analysis tools can produce provenance graphs capturing all operations on attacker-controlled inputs flowing to a sink, which can be used as input to ML models for triage. Evidence: Dynamic taint analysis tools like NodeMedic or NodeMedic-FINE output taint provenance graphs capturing all operations performed on attacker-controlled inputs flowing to the sink. Limitations: The approach is dynamic, not static; it requires execution and may not cover all code paths. The study focuses on Node.js JavaScript packages only.
- [S22] Traditional ML models (e.g., Graph Neural Networks) can be configured to serve as a vulnerability report triage tool by performing binary classification on provenance graphs derived from dynamic taint analysis. Evidence: First, traditional ML models (e.g., Graph Neural Networks–GNNs) can be configured to serve as a vulnerability report triage tool by performing binary classification on the provenance graphs. Limitations: The study uses dynamic analysis output, not static DFG construction; the GNN is used for triage, not for building the DFG itself.
- [S22] LLMs fine-tuned on data annotated by a dynamic taint analysis tool achieve strong vulnerability triage performance, with the top LLM achieving F1=0.915. Evidence: The top LLM achieves F1=0.915, while the best GNN and classical ML models reaching F1=0.904. Limitations: The LLM is used for triage, not for constructing the DFG; the input is already a provenance graph from dynamic analysis. The study is limited to Node.js and ACE/ACI vulnerabilities.
- [S22] At a less than 7% false-negative rate, the leading model eliminates 66.9% of benign packages from manual review, taking around 60 ms per package. Evidence: At a less than 7% false-negative rate, the leading model eliminates 66.9% of benign packages from manual review, taking around 60 ms per package. Limitations: The metric is for triage, not DFG construction accuracy; the time is per package, not per graph construction.
- [S22] When tuned to operate at precision 0.8, the best model can detect 99.2% of exploitable taint flows while missing only 0.8%. Evidence: If the best model is tuned to operate at a precision level of 0.8 (i.e., allowing 20% false positives amongst all warnings), our approach can detect 99.2% of exploitable taint flows while missing only 0.8%. Limitations: The result is for triage of dynamic analysis reports, not for static DFG construction; the precision/recall trade-off is specific to the triage task.
- [S22] Dynamic taint analysis tools can cover entire codebases and identify vulnerabilities across complex data flow patterns, unlike ML models that operate on limited contexts. Evidence: In contrast, dynamic taint analysis tools can cover entire codebases and identify vulnerabilities across complex data flow patterns. Limitations: The statement is about dynamic analysis, not static; the comparison is with ML models that operate on single functions or small snippets, not necessarily with static DFG engines.
- [S22] Static analysis techniques often generate even more false positives than dynamic analysis, complicating triage. Evidence: On the other hand, static analysis techniques often generate even more false positives, further complicating the triaging process. Limitations: The statement is general and not quantified; it is from the introduction of a paper focused on dynamic analysis triage.
- [S22] The study collected a benchmark of 1,883 Node.js packages, each containing one reported ACE or ACI vulnerability from a dynamic taint analysis tool. Evidence: We focus on Node.js packages and collect a benchmark of 1,883 Node.js packages, each containing one reported ACE or ACI vulnerability. Limitations: The benchmark is specific to Node.js and ACE/ACI vulnerabilities; it uses dynamic analysis reports, not static DFG ground truth.
- [S22] The paper evaluates GNN, classical ML, LLM, and hybrid GNN-LLM models for triage on provenance graphs from dynamic taint analysis. Evidence: We evaluate a variety of machine learning approaches, including classical models, graph neural networks (GNNs), large language models (LLMs), and hybrid models that combine GNN and LLMs, trained on data based on a dynamic program analysis tool’s output. Limitations: The models are used for triage, not for constructing the DFG; the input graphs are from dynamic analysis.

### Claim Verification

- **supported**: IFDS/IDE reduces dataflow problems to graph reachability on a supergraph. — S5 and S6 both describe reduction of dataflow analysis to graph reachability (valid-path reachability on supergraph).
- **supported**: IDE generalizes IFDS and can be more efficient for problems with large value domains like constant propagation. — S2 states IDE is a generalization of IFDS. S3 explains that for constant propagation, IDE is more efficient because size of value domain is irrelevant to IDE's complexity.
- **supported**: IFDS/IDE requires distributive flow functions, limiting applicability. — S7 confirms that graph-reachability based interprocedural analysis requires flow functions to distribute over meet, limiting application to distributive problems.
- **supported**: Correlated method calls create infeasible interprocedural paths that standard IFDS/IDE cannot prune. — S4 states that existing algorithms (IFDS/IDE) are unable to ignore infeasible paths caused by correlated method calls.
- **supported**: Field sensitivity via access paths causes fact explosion in IFDS. — S1 explains that conventional use of access paths for field sensitivity leads to a large number of data-flow facts, causing scalability challenges.
- **supported**: SVF uses interprocedural memory SSA, sparse analysis, and iterative value-flow/pointer-analysis refinement. — S9 describes iterative value-flow construction and pointer analysis; S9 and S10 mention memory SSA; S8,S9,S10 all discuss sparse analysis. All three sources cover these elements.
- **supported**: SVF supports field-, flow-, and context-sensitive pointer analyses and includes Python bindings and LLVM-21 support. — S14 explicitly states support for field-sensitive, flow-sensitive, context-sensitive analyses; also mentions SVF-Python and LLVM-21 support.
- **supported**: Joern's Code Property Graph merges AST, CFG, call graph, and PDG (including REACHING_DEF edges) into a single queryable graph. — S15 describes CPG merging syntax, control-flow, intra-procedural data-flow; S16 lists layers including AST, CallGraph, CFG, PDG with REACHING_DEF; S17 confirms CPG generation.
- **supported**: Joern includes a taint-analysis engine and has been industrially adopted by ShiftLeft. — S20 states 'Joern provides a taint-analysis engine'; S15 states 'From 2017 onwards, the CPG served as the technological foundation for ShiftLeft Inc.'
- **supported**: Pure LLM approaches fail at interprocedural DFG reasoning due to token limits, inability to capture cross-function data flows, and inability to generate correct CPGQL queries. — S19 states token limits prevent loading entire repositories, code embeddings fail to capture inter-procedural data flows, and LLMs struggle to generate complex static analysis queries.
- **supported**: LLMs hallucinate API methods and produce syntactically invalid queries for multi-hop traversals. — S19 states 'models frequently hallucinate API methods or produce syntactically invalid queries when attempting multi-hop traversals.'
- **supported**: codebadger integrates Joern's CPG with LLMs via MCP tools, enabling discovery of a previously unreported libtiff buffer overflow and a first-attempt patch for CVE-2025-6021 in libxml2. — S19 describes codebadger integrating Joern's CPG with LLMs via MCP tools and reports discovering a previously unreported buffer overflow in libtiff and generating a correct patch for CVE-2025-6021 on first attempt.
- **supported**: GNNs and fine-tuned LLMs on dynamic taint provenance graphs achieve F1=0.915 for vulnerability triage, with 99.2% recall at precision 0.8. — S22 states top LLM achieves F1=0.915; at precision 0.8, 99.2% recall is achieved.
- **supported**: ML models for triage consume pre-built graphs and do not construct DFGs themselves. — S22 describes ML models (GNN, LLM) performing binary classification on provenance graphs (pre-built by dynamic taint analysis). They do not construct DFGs.
- **supported**: Static analysis produces more false positives than dynamic analysis. — S22 states 'static analysis techniques often generate even more false positives than dynamic analysis.'
- **supported**: Soot's IFDS/IDE implementation prioritizes extensibility and ease of use, while WALA's prioritizes memory efficiency. — S1 states 'WALA's implementation is geared much towards memory efficiency, ours is currently geared more towards extensibility and ease of use.' (Soot is the subject of the paper.)
- **supported**: SVF's core innovation is iterative refinement: value-flow construction and pointer analysis improve each other's precision iteratively. — S9 describes 'value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both'.
- **supported**: SVF's architecture separates pointer analysis into three loosely coupled components: Graph, Rules, and Solver. — S9 explicitly states 'by dividing a pointer analysis into three loosely coupled components: Graph, Rules and Solver.'
- **supported**: Joern replaced its original graph database with OverflowDB and later flatgraph (v4.0.0), and uses a Scala-based DSL for querying. — S15 says 'we replaced both the storage backend and query language with our own graph database OverflowDB' and 'v4.0.0 migrates from overflowdb to flatgraph'. Also mentions Scala-based DSL.
- **supported**: The CPG concept evolved from intra-procedural data flow (2014) to interprocedural analysis (2014–2016), and from 2017 served as the foundation for ShiftLeft's commercial static analysis. — S15 describes timeline: 2014-2016 research extending CPG for interprocedural analysis; from 2017 foundation for ShiftLeft.

### Final Evaluation

- coverage: 4/5
- citation_quality: 4/5
- factuality: 5/5
- analysis_depth: 4/5
- presentation: 5/5
- overall: 4/5

Strengths:
- Comprehensive coverage of classical IFDS/IDE algorithms, SVF, and Joern architectures with clear precision-scalability trade-offs.
- Strong citation traceability: every major claim is directly supported by evidence and verified.
- Effective synthesis of hybrid CPG+LLM approaches (codebadger) and ML-based triage (S22), showing practical integration patterns.
- Clear and structured presentation with executive summary, key takeaways, and actionable next actions.

Weaknesses:
- Missing in-depth analysis of CodeQL, FlowDroid, and WALA DFG capabilities despite being listed in source requirements.
- No edge-level precision/recall metrics for static DFG construction; existing benchmarks measure downstream tasks only.
- ML-based approaches covered focus on triage rather than DFG construction; no 2024-2026 papers on GNN-based DFG construction were found.
- Reliance on self-reported documentation for SVF and Joern without independent comparative evaluation.

Follow-up recommendations:
- Investigate CodeQL's taint-tracking configuration and data flow library architecture directly to complement Joern/SVF comparison.
- Explore FlowDroid and WALA for Java-specific DFG construction with IFDS/IDE, focusing on memory efficiency vs extensibility trade-offs.
- Build a micro-benchmark suite for edge-level DFG evaluation (def-use chains, alias-sensitive flows, field-sensitive flows) to enable standardized precision/recall measurement.
- Research GNN-based post-processing to refine classical DFGs by predicting missing or spurious edges, potentially improving accuracy without sacrificing soundness.
