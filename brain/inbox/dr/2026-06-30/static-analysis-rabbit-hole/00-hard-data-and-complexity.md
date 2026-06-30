---
title: "Deep hard-data research for static analysis insight expansion. Find primary papers, official docs, and benchmark/evaluation sources with concrete measurements and complexity bounds for: monotone frameworks and MFP/MOP, IFDS/IDE complexity and Reps-Horwitz-Sagiv tabulation, FlowDroid DroidBench precision/recall, SVF performance and precision claims, Souffle/Datalog evaluation performance and semi-naive algorithms, Doop pointer-analysis variants and context-sensitivity, CodeQL incremental analysis speedups and memory costs, Semgrep interprocedural/interfile taint limits and memory recommendations, Joern interprocedural data-flow architecture/performance if available, SootUp CHA/RTA/VTA docs, Go VTA limitations, LLVM MemorySSA limits, MLIR data-flow widening examples. Extract numeric results, asymptotic complexity, benchmark names, caveats, and source URLs. The output will be used to double the depth of brain/insights static-analysis notes, so prioritize implementable detail and data tables over prose."
generated_at: 2026-06-30T07:05:32.078900+00:00
strategy: deep-agent-v1
effort: deep
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static Analysis Frameworks: Complexity Bounds, Benchmark Measurements, and Documented Limitations

## Abstract

This report consolidates formal complexity bounds, benchmark measurements, and architectural limitations for major static analysis frameworks and data-flow algorithms. It covers monotone framework theory (MFP vs. MOP), IFDS/IDE tabulation complexity, FlowDroid precision/recall on DroidBench, and SVF pointer-analysis performance. For several requested tools (Soufflé, Doop, CodeQL, Semgrep, Joern, SootUp, Go VTA, LLVM MemorySSA, MLIR), the admitted source register yielded no primary evidence; this absence is reported as a finding. The evidence spans foundational theory papers from 1973--1996 through 2024--2025 implementation evaluations, with explicit attention to configuration dependence and threats to validity.

## Research Question

What concrete measurements, asymptotic complexity bounds, benchmark names, and documented limitations can be extracted from primary sources for major static analysis frameworks and data-flow algorithms, to expand static-analysis insight notes with implementable detail?

## Method

Sources were selected from an admitted register of 26 documents spanning academic papers, official documentation, benchmark repositories, and tool reference pages. Evidence was extracted as structured notes keyed to source IDs. Where the register contained no evidence for a requested topic (e.g., Soufflé, Doop, CodeQL, Semgrep, Joern, SootUp, Go VTA, LLVM MemorySSA, MLIR), the absence is reported explicitly rather than supplemented from model memory. All numeric claims are traced to source IDs [S#].

## Conceptual Background

Static data-flow analysis computes program properties by solving fixpoint equations over a lattice of abstract values. Two solution concepts dominate the literature:

| Term | Definition | Key Property |
|------|-----------|--------------|
| MFP (Maximal Fixed Point) | Least fixpoint of the data-flow equations under monotone transfer functions | Always computable for finite-height lattices; may differ from MOP |
| MOP (Meet Over All Paths) | Join of transfer-function compositions over all executable paths | Desired precision; uncomputable in general for monotone frameworks |
| Monotone framework | Transfer functions are monotonic w.r.t. lattice order | Guarantees MFP existence and Kildall convergence |
| Distributive framework | Transfer functions distribute over join | Guarantees MFP = MOP |
| IFDS | Interprocedural Finite Distributive Subset problem; powerset lattice over finite D | Polynomial-time via graph reachability |
| IDE | Interprocedural Distributive Environment; environment transformers over finite domain | Extends IFDS to value-transformer problems |
| SVFG | Sparse Value-Flow Graph | Captures value dependencies for flow-sensitive pointer analysis |

## Findings

### Monotone Frameworks: MFP, MOP, and Complexity

The maximal fixed point (MFP) solution exists for every instance of every monotone framework and can be obtained by Kildall's iterative algorithm [S4]. However, when the framework is monotone but not distributive, the MOP solution can differ from MFP [S4]. Furthermore, there is no algorithm to compute MOP for monotone frameworks in general [S4].

Kildall's original framework required distributive data-flow functions to guarantee both termination and that the computed solution equals MOP [S6]. Constant propagation is monotonic but not distributive, so Kildall's theorem does not guarantee MOP for it [S6]. This is a practical case where the MFP/MOP gap manifests.

Complexity results reveal a surprising inversion depending on lattice finiteness:

| Problem | Lattice Condition | Complexity | Source |
|---------|------------------|------------|--------|
| MFP | Finite lattice (≥4 elements) | P-complete | [S8] |
| MOP | Finite lattice | NL-complete (efficiently parallelizable) | [S8] |
| MFP | Finite height | Polynomial time | [S8] |
| MOP | Infinite lattice | Undecidable | [S8] |

The iterative algorithm converges when the value domain is a partial order with finite height and transfer functions/join are monotonic [S9]. MFP is P-complete even for four-element lattices [S8], while MOP over finite lattices is NL-complete and hence efficiently parallelizable [S8]—a counterintuitive result given that MOP is the "harder" concept semantically.

Insight: The complexity inversion means that for finite lattices, MOP is in a lower complexity class (NL) than MFP (P-complete). However, MOP's uncomputability for infinite lattices (e.g., constant propagation with unbounded value domains) forces practical tools to compute MFP, accepting the precision gap.

### IFDS/IDE: Complexity and Extensions

The IFDS framework transforms interprocedural data-flow-analysis problems with distributive flow functions over finite domains into graph-reachability problems, solvable in polynomial time [S11], [S13]. The formal setup uses a powerset lattice State = P(D) where D is a finite set, with all transfer functions required to be distributive [S12].

The Reps-Horwitz-Sagiv tabulation algorithm has the following asymptotic complexity:

| Metric | Complexity | Source |
|--------|-----------|--------|
| Time | O(\|E\| · \|D\|³) | [S20] |
| Space | O(\|E\| · \|D\|²) | [S20] |

Here |E| is the interprocedural control-flow graph (ICFG) edge count and |D| is the number of data-flow facts [S20]. The cubic factor in |D| makes domain size the primary scalability bottleneck.

The IDE algorithm extends IFDS to distributive environment transformers, enabling precise solutions for copy constant propagation and linear constant propagation [S16]. Both IFDS and IDE require distributive flow functions over finite domains [S17].

Four practical extensions to IFDS have been documented: (1) on-demand supergraph construction, (2) enhanced return flow with additional information, (3) improved φ-instruction precision for SSA, and (4) subsumption-based speedup for domains where facts subsume each other [S14]. These extensions were evaluated on variable type analysis [S14].

Implementation tradeoffs exist between IFDS solvers. WALA's IFDS implementation targets memory efficiency, while Soot's targets extensibility and ease of use with efficiency as a secondary goal [S17]. This statement dates to 2012 and current versions may differ.

A key scalability challenge for IDE analysis arises from large libraries. Pre-computed library summaries can reduce cost without precision loss [S21].

### FlowDroid: Access Path Explosion and DroidBench Results

FlowDroid uses 5-limited access paths by default. For some programs, the number of access paths can be almost an order of magnitude larger than the number of base variables [S20]. This domain explosion directly impacts IFDS/IDE complexity through the |D| factor.

The IDEDroid approach mitigates this by propagating only base variables and modeling access paths as a CFL-reachability IDE problem, reducing |D| [S20]. Measured improvements:

| Metric | IDEDroid vs. FlowDroid | Source |
|--------|----------------------|--------|
| Speedup range | 2.1× – 2,368.4× | [S20] |
| Average speedup | 222.0× | [S20] |
| Precision gain (false positives reduced) | up to 20.0% | [S20] |
| Evaluation scope | 24 Android apps | [S20] |

FlowDroid's headline numbers on DroidBench are 93% recall and 86% precision [S27]. However, independent evaluation reveals deviations from promised values:

| Evaluation | Finding | Source |
|-----------|---------|--------|
| Official FlowDroid page | 93% recall, 86% precision | [S27] |
| Independent study (pre-v3.0 DroidBench) | FlowDroid closest to promise, 9% relative deviation; other tools 19–25% below | [S29] |
| Multi-version study | Detailed per-benchmark results for FlowDroid v2.7.1, v2.0, v1.5, Amandroid v3.1.1 on 158 DroidBench v3.0 apps + 24 ICCBench v2.0 apps | [S28] |

Insight: The 9% relative deviation between promised and measured precision/recall [S29] is not a tool defect per se—it reflects configuration dependence (source/sink lists, taint wrapper settings, callback handling). The multi-version study [S28] provides the most granular data but is tied to specific tool versions and configurations.

### SVF: Flow-Sensitive Pointer Analysis Architecture and Performance

SVF's architecture follows a two-phase pipeline: a flow-insensitive Andersen pointer analysis serves as a pre-step to build a Sparse Value-Flow Graph (SVFG), which then enables flow-sensitive analysis [S32], [S35]. The SVFG precisely captures value flows reflecting execution order [S31]. Andersen's analysis is described as "well studied, relatively performant, and precise enough to produce an acceptable SVFG" [S35].

The value-flow graph summarizes dependencies between pointer variables, including memory dependencies via dereferences [S37]. Flow-sensitive points-to analysis can be simplified to a general graph reachability problem in this value-flow graph [S37]. The original implementation was approximately 2,000 lines of code with runtime comparable to state-of-the-art flow-insensitive analysis [S37].

SVF exposes multiple Andersen variants: Andersen_WPA, AndersenSCD_WPA, AndersenSFR_WPA, and AndersenWaveDiff_WPA [S39]. These include wave propagation and SFR (sparse flow-refined) options [S39].

The Cg-FsPta algorithm (2025) addresses a limitation of prior CFG-based flow-sensitive techniques: because they bundle statements into nodes, graph simplification and dynamic solving techniques are not applicable [S32]. Cg-FsPta instead uses a flow-sensitive constraint graph (FSConsG) that separates address-taken variables into versions according to execution points and uses def-use chains [S32].

| Metric | Cg-FsPta vs. State-of-Art (VSFS) | Source |
|--------|--------------------------------|--------|
| Average memory reduction | 33.05% | [S32] |
| Average speedup | 7.27× | [S32] |
| Precision | Identical to SFS and semi-sparse approach | [S32] |
| Benchmark | SPEC CPU 2017 | [S32] |

SUPA, SVF's demand-driven pointer analysis, uses a pre-analysis to build an SVFG and then answers queries on demand [S33]. No performance or precision numbers were available in the admitted evidence for SUPA.

SVF's flow-sensitive context-sensitive pointer analysis has been applied beyond traditional static analysis, including use in high-level synthesis (LegUp HLS) [S40], though no quantitative SVF performance evaluation was provided in that context.

### Topics With No Admitted Evidence

The following requested topics yielded no evidence in the admitted source register:

| Topic | Requested Data | Evidence Status |
|-------|---------------|-----------------|
| Soufflé/Datalog | Semi-naive evaluation, complexity, optimizations | No sources admitted |
| Doop | Context-sensitivity variants, precision/performance tradeoffs | No sources admitted |
| CodeQL | Incremental analysis speedups, memory costs | No sources admitted |
| Semgrep | Interprocedural/interfile taint limits, memory recommendations | No sources admitted |
| Joern | Interprocedural data-flow architecture, performance | No sources admitted |
| SootUp | CHA/RTA/VTA call graph docs | No sources admitted |
| Go VTA | Limitations, devirtualization scope | No sources admitted |
| LLVM MemorySSA | Documented limits, alias analysis constraints | No sources admitted |
| MLIR | Data-flow widening examples, sparse propagation | No sources admitted |

This absence is itself a finding: the research plan's search queries for these topics did not yield admitted sources. The report does not supplement from model memory per the stated rules.

## Design Implications

1. **Domain size dominates IFDS/IDE scalability.** The O(|E|·|D|³) time complexity means that reducing |D| (e.g., IDEDroid's base-variable-only propagation [S20]) can yield orders-of-magnitude speedups even when |E| grows.

2. **MFP is the practical ceiling for non-distributive problems.** Constant propagation and similar non-distributive analyses cannot achieve MOP [S6], [S4]. Tools should document this gap rather than implying optimality.

3. **Two-phase pointer analysis is the established pattern.** Flow-insensitive Andersen pre-analysis → SVFG construction → flow-sensitive solving is used across SVF, Cg-FsPta, and SUPA [S32], [S35], [S33]. The pre-analysis quality directly determines SVFG precision.

4. **Benchmark numbers are configuration-bound.** FlowDroid's 93%/86% [S27] vs. 9% deviation in independent evaluation [S29] demonstrates that headline numbers require configuration context to be actionable.

5. **Library summarization is essential for IDE scalability.** Pre-computed summaries reduce whole-program IDE cost without precision loss [S21], which is critical for Android and other large-library contexts.

6. **Missing evidence for 9 of 13 requested tools** indicates either that primary sources were not surfaced by the search strategy or that public performance data is genuinely scarce for these tools. Either way, insight notes should flag these gaps.

## Limitations and Threats to Validity

- **Source coverage gap.** The admitted register contains 26 sources but covers only 4 of 13 requested topics in depth. Foundational theory (MFP/MOP, IFDS/IDE) and FlowDroid/SVF are well-covered; Soufflé, Doop, CodeQL, Semgrep, Joern, SootUp, Go VTA, LLVM MemorySSA, and MLIR are entirely absent.

- **Stale evidence.** Several sources predate 2020. The Soot vs. WALA IFDS comparison [S17] dates to 2012. The SVFG performance claim of ~2,000 LOC and runtime comparable to flow-insensitive analysis [S37] dates to 2011. Modern implementations may differ substantially.

- **Vendor/self-reporting bias.** FlowDroid's headline numbers [S27] come from the tool's own page. Independent evaluation [S29] shows deviations. SVF-related claims [S32] come from the algorithm's authors.

- **Benchmark specificity.** Cg-FsPta results are on SPEC CPU 2017 only [S32]. IDEDroid results are on 24 Android apps [S20]. FlowDroid multi-version results are on DroidBench v3.0 and ICCBench v2.0 [S28]. Generalization to other workloads is unverified.

- **Pre-print sources.** S31 and S32 are arXiv pre-prints, not peer-reviewed publications. Claims of identical precision to SFS [S32] lack a provided proof in the extracted snippet.

- **Complexity assumptions.** IFDS complexity bounds [S20] assume the standard Reps-Horwitz-Sagiv tabulation algorithm; optimized implementations may have different characteristics.

## Open Questions

1. What are the actual semi-naive Datalog evaluation complexity bounds and optimization techniques in Soufflé, and how do they compare to IFDS-based approaches for pointer analysis?

2. What incremental analysis speedup factors and memory overhead does CodeQL achieve in practice, and are they documented in official docs or peer-reviewed evaluations?

3. What are Semgrep's concrete interprocedural depth limits, interfile taint propagation constraints, and memory recommendations as of 2026?

4. How does Joern's CPG-based interprocedural data-flow compare architecturally and performance-wise to IFDS/IDE tabulation?

5. What are the documented precision and scalability limits of Go VTA, LLVM MemorySSA, and MLIR data-flow widening, and are there issue-tracker entries or design docs quantifying them?

6. Does the MFP/MOP gap for constant propagation [S6] have measurable impact on downstream analyses (e.g., dead code elimination, bounds analysis) in production compilers?

7. Whether P-completeness of MFP [S8] implies practical non-parallelizability remains an open inference; the source establishes P-completeness but does not explicitly draw this conclusion.

## Recommended Next Experiments

1. **Replicate FlowDroid DroidBench evaluation** with current tool versions (2025--2026) across multiple configurations (taint wrapper modes, access path limits, callback handling) to produce a configuration-sensitive precision/recall matrix.

2. **Measure |D| scaling** for IFDS/IDE analyses on real-world programs with and without access-path limiting (à la IDEDroid [S20]) to validate the cubic-domain-size bottleneck empirically.

3. **Benchmark Cg-FsPta [S32] beyond SPEC CPU 2017** on large real-world C/C++ programs (e.g., PostgreSQL, Chromium subsystems) to test whether the 7.27× speedup and 33.05% memory reduction generalize.

4. **Conduct a systematic source search** for the 9 missing topics using tool-specific queries (e.g., "Soufflé semi-naive evaluation complexity site:souffle-lang.github.io", "CodeQL incremental analysis memory site:codeql.github.com") to fill the evidence gap.

5. **Compare WALA vs. Soot IFDS implementations** on identical benchmarks to update the 2012 memory-efficiency vs. extensibility tradeoff claim [S17] with current versions.

6. **Quantify the MFP/MOP precision gap** for constant propagation on standard benchmarks by computing both solutions for small programs where MOP is tractable, measuring the frequency and magnitude of divergence.

## Source Register

- [S1] [2 Monotone Dataflow Frameworks](https://people.cs.vt.edu/ryder/516/sp06/lectures/DataflowAnalysis-2.pdf) — rejected, score 7, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S2] [On the computational complexity of Data Flow Analysis over finite bounded meet semilattices](https://www.researchgate.net/publication/352459003_On_the_computational_complexity_of_Data_Flow_Analysis_over_finite_bounded_meet_semilattices) — rejected, score 13, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S3] [On the computational complexity of Data Flow Analysis over finite bounded meet semilattices - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0304397521003637) — rejected, score 13, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S4] [Monotone data flow analysis frameworks | Acta Informatica | Springer Nature Link](https://link.springer.com/article/10.1007/BF00290339?error=cookies_not_supported&code=a988acd8-6653-456b-9f85-e71f05c3617b) — admitted, score 16, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S5] [Carnegie Mellon Lecture 5 Foundations of Data Flow Analysis](https://www.cs.cmu.edu/afs/cs/academic/class/15745-s13/public/lectures/L5-Foundations-of-Dataflow-1up.pdf) — rejected, score 7, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S6] [Kildall's Lattice Framework for Dataflow Analysis](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/DATAFLOW-AUX/lattice.html) — admitted, score 13, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S7] [DATAFLOW ANALYSIS](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/2.DATAFLOW.html) — admitted, score 13, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S8] [[1303.4315] On the computational complexity of Data Flow Analysis](https://arxiv.org/abs/1303.4315) — admitted, score 16, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S9] [Data-flow analysis - Wikipedia](https://en.wikipedia.org/wiki/Data-flow_analysis) — admitted, score 12, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S10] [GitHub - wenkokke/MonoProc: A framework for data-flow analysis of a simple imperative programming language. · GitHub](https://github.com/wenkokke/MonoProc) — rejected, score 9, discovered by `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall`
- [S11] [Precise Interprocedural Dataﬂow Analysis via Graph Reachability](https://pages.cs.wisc.edu/~fischer/cs701.f14/popl95.pdf) — admitted, score 16, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S12] [Anders Møller Computer Science, Aarhus University Static Program Analysis](https://cs.au.dk/~amoeller/spa/8-distributive.pdf) — admitted, score 14, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S13] [Precise Interprocedural Dataflow Analysis via Graph Reachability Thomas Reps,](https://www.csa.iisc.ac.in/~raghavan/CleanedPav2011/idfs-popl95.pdf) — admitted, score 16, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S14] [Practical Extensions to the IFDS Algorithm | Springer Nature Link](https://link.springer.com/chapter/10.1007/978-3-642-11970-5_8?error=cookies_not_supported&code=309d3ccc-e19f-43e6-9930-1dcf9097b251) — admitted, score 14, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S15] [[PDF] Interprocedural Dataflow Analysis via Graph Reachability | Semantic Scholar](https://www.semanticscholar.org/paper/Interprocedural-Dataflow-Analysis-via-Graph-Reps-Sagiv/a396946c231c5279e97310bc2ed83703357e8c20) — rejected, score 13, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S16] [Precise interprocedural dataflow analysis with applications to constant propagation | SpringerLink](https://link.springer.com/chapter/10.1007/3-540-59293-8_226?error=cookies_not_supported&code=560c38e9-fde4-4ea4-b05f-3efd5d327f49) — admitted, score 16, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S17] [Inter-procedural data-flow analysis with IFDS/IDE and Soot | Proceedings of the ACM SIGPLAN International Workshop on State of the Art in Java Program analysis](https://dl.acm.org/doi/10.1145/2259051.2259052) — admitted, score 14, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S18] [[PDF] Precise Interprocedural Dataflow Analysis with Applications to Constant Propagation | Semantic Scholar](https://www.semanticscholar.org/paper/Precise-Interprocedural-Dataflow-Analysis-with-to-Sagiv-Reps/394635721bb5e72ccfb0289fa9b7b0f3a62b7612) — rejected, score 13, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S19] [Generating Precise and Concise Procedure Summaries Greta Yorsh ∗](https://csaws.cs.technion.ac.il/~yahave/papers/popl08.pdf) — admitted, score 14, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S20] [Boosting the Performance of Alias-Aware IFDS Analysis with CFL-Based Environment Transformers | Proceedings of the ACM on Programming Languages](https://dl.acm.org/doi/10.1145/3689804) — admitted, score 17, discovered by `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis`
- [S21] [IDE Dataflow Analysis in the Presence of Large Object-Oriented Libraries | Springer Nature Link](https://link.springer.com/chapter/10.1007/978-3-540-78791-4_4?error=cookies_not_supported&code=69926208-23a5-43d1-b2ee-5d0981bc48a5) — admitted, score 14, discovered by `IDE dataflow analysis Sagiv Reps Horwitz complexity limitations`
- [S22] [Inter-procedural data-flow analysis with IFDS/IDE and Soot](https://www.researchgate.net/publication/236980409_Inter-procedural_data-flow_analysis_with_IFDSIDE_and_Soot) — rejected, score 13, discovered by `IDE dataflow analysis Sagiv Reps Horwitz complexity limitations`
- [S23] [GitHub - amaurremi/IDE: Interprocedural Distributive Environment algorithm implementation · GitHub](https://github.com/amaurremi/IDE) — rejected, score 9, discovered by `IDE dataflow analysis Sagiv Reps Horwitz complexity limitations`
- [S24] [Precise interprocedural dataflow analysis with applications to constant propagation - ScienceDirect](https://www.sciencedirect.com/science/article/pii/0304397596000722) — rejected, score 13, discovered by `IDE dataflow analysis Sagiv Reps Horwitz complexity limitations`
- [S25] [On the complexity of dataflow analysis of logic programs | Springer Nature Link](https://link.springer.com/content/pdf/10.1007%2F3-540-55719-9_100.pdf) — rejected, score 8, discovered by `IDE dataflow analysis Sagiv Reps Horwitz complexity limitations`
- [S26] [FlowDroid: Precise Context, Flow, Field, Object-sensitive ...](https://www.bodden.de/pubs/far+14flowdroid.pdf) — admitted, score 17, discovered by `FlowDroid DroidBench precision recall benchmark results taint wrapper`
- [S27] [FlowDroid – Taint Analysis | Secure Software Engineering](https://blogs.uni-paderborn.de/sse/tools/flowdroid/) — admitted, score 16, discovered by `FlowDroid DroidBench precision recall benchmark results taint wrapper`
- [S28] [Benchmarks](https://resess.github.io/artifacts/StaticTaint/benchmark/) — admitted, score 17, discovered by `FlowDroid DroidBench precision recall benchmark results taint wrapper`
- [S29] [Do Android Taint Analysis Tools Keep Their Promises? Felix Pauck](https://arxiv.org/pdf/1804.02903) — admitted, score 16, discovered by `FlowDroid DroidBench precision recall benchmark results taint wrapper`
- [S30] [TaintBench: Automatic Real-World Malware Benchmarking of Android Taint Analyses](https://dl.gi.de/server/api/core/bitstreams/c577fc21-8fed-482a-bc32-25e0ba5861cd/content) — admitted, score 16, discovered by `FlowDroid DroidBench precision recall benchmark results taint wrapper`
- [S31] [An Efficient Andersen-Style Flow-Sensitive Pointer Analysis](https://arxiv.org/pdf/2508.01974) — admitted, score 20, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S32] [Flow Sensitivity without Control Flow Graph: An Efficient Andersen-Style Flow-Sensitive Pointer Analysis](https://arxiv.org/html/2508.01974v1) — admitted, score 20, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S33] [Value-Flow-Based Demand-Driven Pointer Analysis for C ...](https://yuleisui.github.io/publications/tse18.pdf) — admitted, score 17, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S34] [Pointer analysis - Wikipedia](https://en.wikipedia.org/wiki/Pointer_analysis) — rejected, score 10, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S35] [Object Versioning for Flow-Sensitive Pointer Analysis](https://yuleisui.github.io/publications/cgo21.pdf) — admitted, score 18, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S36] [Implementing a flow and context-sensitive pointer analysis · Issue #80 · SVF-tools/SVF](https://github.com/SVF-tools/SVF/issues/80) — rejected, score 15, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S37] [Boosting the performance of flow-sensitive points-to analysis using value flow | Proceedings of the 19th ACM SIGSOFT symposium and the 13th European conference on Foundations of software engineering](https://dl.acm.org/doi/10.1145/2025113.2025160) — admitted, score 17, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S38] [SVF: interprocedural static value-flow analysis in LLVM | Request PDF](https://www.researchgate.net/publication/311492133_SVF_interprocedural_static_value-flow_analysis_in_LLVM) — rejected, score 18, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S39] [Static Value-Flow Analysis: SVF::Andersen Class Reference](https://svf-tools.github.io/SVF-doxygen/html/classSVF_1_1Andersen.html) — admitted, score 16, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`
- [S40] [Precise Pointer Analysis in High-Level Synthesis](https://johnwickerson.github.io/papers/precise_pointer_analysis_FPL20.pdf) — admitted, score 17, discovered by `SVF pointer analysis Andersen Steensgaard flow-sensitive benchmark results memory performance`

## Research Trace

### Goal

Collect concrete measurements, asymptotic complexity bounds, benchmark names, and documented limitations for major static analysis frameworks and data-flow algorithms to expand static-analysis insight notes with implementable detail and data tables.

### Subquestions

- What are the formal definitions, complexity bounds, and convergence guarantees for monotone framework MFP vs MOP in dataflow analysis?
- What is the asymptotic complexity of IFDS/IDE per Reps-Horwitz-Sagiv tabulation, and what practical limitations or extensions exist?
- What precision/recall numbers does FlowDroid achieve on DroidBench, and how do configurations (taint wrapper, static fields, callbacks) affect results?
- What performance and precision claims does SVF make for Andersen vs Steensgaard vs flow-sensitive pointer analysis, with benchmark names and timings?
- How does Souffle's semi-naive Datalog evaluation perform, and what complexity characteristics and optimization techniques are documented?
- What context-sensitivity variants does Doop support, and what precision/performance tradeoffs are reported in the literature?
- What incremental analysis speedups and memory costs does CodeQL document or report, and what are the measured improvements?
- What are Semgrep's interprocedural and interfile taint analysis limits, memory recommendations, and known false negative scenarios?
- What documented limitations exist for Go VTA, LLVM MemorySSA, SootUp CHA/RTA/VTA, Joern interprocedural data-flow, and MLIR data-flow widening, with numeric or architectural detail?

### Research Perspectives

- **Primary theory** — Find foundational papers defining monotone frameworks, MFP/MOP, IFDS/IDE, and tabulation with formal complexity.
- **Official documentation** — Extract tool-specific limits, configuration knobs, memory recommendations, and architectural descriptions from official docs.
- **Benchmarks and evaluations** — Collect benchmark suite names, precision/recall numbers, timings, and memory measurements from published evaluations.
- **Implementation detail** — Surface algorithmic choices, data structures, and engineering tradeoffs from repos, design docs, and technical reports.
- **Criticism and counterevidence** — Find known failures, scalability limits, false positive/negative reports, and critiques of claimed performance or precision.
- **Recency** — Prefer recent (2020-2026) sources for actively developed tools; note version numbers and dates.
- **Operational implications** — Extract actionable guidance: memory limits, incremental speedup factors, configuration recommendations, and deployment caveats.

### Source Requirements

- Foundational papers: Reps-Horwitz-Sagiv 1995, Sagiv-Reps-Horwitz 1996 (IFDS/IDE), Kildall 1973, Cousot-Cousot monotone frameworks
- Official tool documentation: CodeQL docs, Semgrep docs, Joern docs, SootUp docs, LLVM docs, MLIR docs, Go compiler docs
- Benchmark suites: DroidBench, SVF benchmarks, DaCapo, SPEC, Doop benchmarks, CodeQL query performance tests
- Peer-reviewed evaluations: PLDI, OOPSLA, ISSTA, ICSE, ASE papers on FlowDroid, SVF, Doop, Souffle
- Repository READMEs and release notes: GitHub repos for SVF, Souffle, Doop, SootUp, Joern, Semgrep
- Issue trackers and discussions: GitHub issues, LLVM bugzilla/issues, Go issue tracker for documented limitations
- Technical reports and theses with detailed measurements and complexity analysis

### Success Criteria

- Report includes formal complexity bounds for MFP/MOP and IFDS/IDE tabulation with citations to primary papers.
- Report contains a data table of FlowDroid DroidBench results with precision, recall, F-measure, and configuration details.
- Report includes SVF benchmark timings and memory numbers for at least two pointer analysis algorithms with benchmark names.
- Report documents Souffle semi-naive evaluation complexity and at least two optimization techniques with references.
- Report lists Doop context-sensitivity variants (e.g., context-insensitive, 1-call-site-sensitive, 2-type-sensitive) with precision/performance tradeoff data.
- Report includes CodeQL incremental analysis speedup factors and memory cost numbers from official docs or evaluations.
- Report captures Semgrep interprocedural/interfile taint limits, memory recommendations, and at least two known false negative scenarios.
- Report documents limitations for Go VTA, LLVM MemorySSA, SootUp CHA/RTA/VTA, Joern, and MLIR data-flow widening with source URLs.
- All numeric claims include source URLs, version numbers, and dates where available.
- Report prioritizes tables and bullet lists over prose for rapid integration into existing notes.

### Search Queries

- `monotone framework dataflow analysis MFP MOP fixpoint iteration complexity Kildall` — Find foundational theory for monotone frameworks and MFP/MOP convergence guarantees. [Primary theory / academic paper]
- `Reps Horwitz Sagiv tabulation IFDS complexity O(ED) program analysis` — Locate the primary IFDS paper with formal complexity bounds. [Primary theory / academic paper]
- `IDE dataflow analysis Sagiv Reps Horwitz complexity limitations` — Find the IDE extension paper and its complexity analysis. [Primary theory / academic paper]
- `FlowDroid DroidBench precision recall benchmark results taint wrapper` — Extract concrete precision/recall numbers and configuration effects from FlowDroid evaluations. [Benchmarks and evaluations / benchmark/paper]
- `SVF pointer analysis performance benchmark Andersen Steensgaard flow-sensitive timings` — Collect SVF performance and precision claims with benchmark names. [Benchmarks and evaluations / paper/repo]
- `Souffle Datalog semi-naive evaluation performance complexity optimization` — Document Souffle's evaluation algorithm, complexity, and optimizations. [Implementation detail / paper/docs]
- `Doop pointer analysis context sensitivity variants precision performance tradeoff` — Find Doop's context-sensitivity options and measured tradeoffs. [Benchmarks and evaluations / paper/repo]
- `CodeQL incremental analysis speedup memory cost documentation` — Extract CodeQL incremental analysis performance and memory data from official docs. [Official documentation / official docs]
- `Semgrep interprocedural taint analysis limitations memory recommendations false negatives` — Find Semgrep's documented interprocedural limits and operational guidance. [Official documentation / official docs/issues]
- `Joern interprocedural data flow architecture performance CPG` — Locate Joern's interprocedural data-flow design and any performance data. [Implementation detail / docs/repo]
- `SootUp CHA RTA VTA call graph construction documentation` — Find SootUp's call graph algorithm docs and limitations. [Official documentation / official docs]
- `Go compiler VTA virtual table analysis limitations devirtualization` — Document Go VTA's scope, limitations, and architectural details. [Criticism and counterevidence / official docs/issues]
- `LLVM MemorySSA limitations documentation alias analysis` — Collect LLVM MemorySSA's documented limits and usage constraints. [Official documentation / official docs]
- `MLIR data flow analysis widening examples sparse propagation` — Find MLIR data-flow widening examples and architectural details. [Implementation detail / official docs/repo]

### Source Quality

- [S1] PDF is unreadable (binary/encoded content). No usable information can be extracted. score=7 type=other admitted=false warnings=Unreadable PDF content
- [S2] Fetch error (403). No content available to score or extract data. score=13 type=paper admitted=false warnings=HTTP 403 Forbidden - no content; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S3] Fetch error (403). No content available to score or extract data. score=13 type=paper admitted=false warnings=HTTP 403 Forbidden - no content; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S4] Foundational Kam & Ullman 1977 paper defining monotone frameworks, MFP vs MOP, and showing MOP is not always computable. Directly addresses subquestion 1. score=16 type=paper admitted=true warnings=Published 1977 - low freshness but foundational
- [S5] PDF is unreadable (binary/encoded content). No usable information can be extracted. score=7 type=other admitted=false warnings=Unreadable PDF content
- [S6] Clear lecture notes explaining Kildall's lattice framework, MOP vs equation solution, and fixed-point theory. Useful for subquestion 1. score=13 type=other admitted=true warnings=Lecture notes, not peer-reviewed; no explicit complexity bounds
- [S7] Lecture notes summarizing Kildall's and Kam/Ullman results on distributivity vs monotonicity and MOP solution. Complements S6. score=13 type=other admitted=true warnings=Lecture notes, not peer-reviewed; no explicit complexity bounds
- [S8] ArXiv paper proving MFP is P-complete even on 4-element lattice, and MOP is NL-complete. Directly provides complexity bounds for subquestion 1. score=16 type=paper admitted=true warnings=ArXiv preprint, not peer-reviewed; published 2013
- [S9] Wikipedia overview of data-flow analysis, including iterative algorithm, fixpoint, and IFDS. Useful as a secondary reference but not primary. score=12 type=other admitted=true warnings=Wikipedia - secondary source, may lack depth
- [S10] GitHub repo for a teaching framework. Not a primary source for complexity or benchmarks. Off-topic for the research goal. score=9 type=repo admitted=false warnings=Teaching tool, not authoritative for research data
- [S11] Primary IFDS paper (Reps, Horwitz, Sagiv, POPL 1995). Defines the framework and complexity O(ED^3). Essential for subquestion 2. score=16 type=paper admitted=true warnings=Published 1995 - low freshness but foundational
- [S12] Lecture slides on IFDS/IDE from Anders Møller. Clearly explains the setting, powerset lattice, and transfer functions. Useful for subquestion 2. score=14 type=other admitted=true warnings=Lecture slides, not peer-reviewed
- [S13] Another copy of the primary IFDS paper. Same content as S11. Provides redundancy but still authoritative. score=16 type=paper admitted=true warnings=Duplicate of S11; published 1995
- [S14] CC 2010 paper extending IFDS with on-demand node construction, return-flow info, φ-instruction precision, and subsumption. Practical extensions for subquestion 2. score=14 type=paper admitted=true warnings=Published 2010 - moderate freshness
- [S15] Semantic Scholar page requires JavaScript; no readable content extracted. score=13 type=paper admitted=false warnings=Requires JavaScript - no content
- [S16] IDE paper (Sagiv, Reps, Horwitz, TAPSOFT 1995). Presents dynamic-programming algorithm for distributive environment transformers. Essential for subquestion 2. score=16 type=paper admitted=true warnings=Published 1995 - low freshness but foundational
- [S17] SOAP 2012 paper on IFDS/IDE with Soot. Describes frameworks and implementation. Useful for subquestion 2 and tool context. score=14 type=paper admitted=true warnings=Published 2012 - moderate freshness
- [S18] Semantic Scholar page requires JavaScript; no readable content extracted. score=13 type=paper admitted=false warnings=Requires JavaScript - no content
- [S19] POPL 2008 paper on generating procedure summaries for IFDS/IDE. Provides formal definitions and examples. Useful for subquestion 2. score=14 type=paper admitted=true warnings=Published 2008 - moderate freshness
- [S20] Recent PACMPL paper (2024) on boosting alias-aware IFDS with CFL-based environment transformers. Describes iterative fixed-point algorithm. Useful for subquestion 2. score=17 type=paper admitted=true warnings=
- [S21] CC 2008 paper on IDE analysis with large libraries. Proposes library summary generation. Useful for subquestion 2 scalability. score=14 type=paper admitted=true warnings=Published 2008 - moderate freshness
- [S22] Fetch error (403). No content available to score or extract data. score=13 type=paper admitted=false warnings=HTTP 403 Forbidden - no content; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S23] GitHub repo for an IDE algorithm implementation. No performance data or benchmarks. Off-topic for the research goal. score=9 type=repo admitted=false warnings=Implementation repo, no evaluation data
- [S24] Fetch error (403). No content available to score or extract data. score=13 type=paper admitted=false warnings=HTTP 403 Forbidden - no content; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S25] Fetch error (redirect failure). No content available. Topic (logic programs) is tangential to the research goal. score=8 type=paper admitted=false warnings=Fetch error; tangential topic; fetch failed: failed HTTP request: error following redirect for url (https://link.springer.com/chapter/10.1007/3-540-55719-9_100)
- [S26] Primary FlowDroid paper (PLDI 2014). Introduces DroidBench and reports precision/recall. Essential for subquestion 3. score=17 type=paper admitted=true warnings=Published 2014 - moderate freshness
- [S27] Official FlowDroid tool page. Reports 93% recall and 86% precision on DroidBench. Directly addresses subquestion 3. score=16 type=other admitted=true warnings=Tool page, not peer-reviewed; may not include full configuration details
- [S28] Benchmark page with detailed results for FlowDroid, Amandroid, DroidSafe on DroidBench v3.0. Includes precision, recall, F-measure, and configuration details. Essential for subquestion 3. score=17 type=benchmark admitted=true warnings=
- [S29] ArXiv paper evaluating Android taint analysis tools. Reports FlowDroid's deviation from promised values (9% relative deviation). Useful for subquestion 3. score=16 type=paper admitted=true warnings=ArXiv preprint, not peer-reviewed; published 2018
- [S30] TaintBench paper evaluating FlowDroid and Amandroid on real-world malware. Reports low recall and precision differences. Useful for subquestion 3. score=16 type=paper admitted=true warnings=
- [S31] Directly addresses flow-sensitive Andersen-style pointer analysis with value-flow graph (SVFG) and FSConsG, which is central to the SVF performance and precision claims subquestion. The title and metadata indicate a 2025 paper (fresh), authored by researchers linked to SVF work, and presents a novel approach with evaluation against VSFS baseline. The PDF content is unextractable but the title and metadata confirm high relevance and authority. score=20 type=paper admitted=true warnings=PDF content not fully extractable from snippet; actual numeric results not visible
- [S32] HTML version of the same paper as S31, provides readable structure with sections on approach, evaluation, and comparison with SVFG. Directly addresses SVF performance claims with concrete methodology, experimental setup, and comparison. Highly relevant to SVF precision/performance subquestion and source requirement for peer-reviewed evaluations. score=20 type=paper admitted=true warnings=
- [S33] TSE 2018 paper on value-flow-based demand-driven pointer analysis (SUPA). Addresses SVF-related value-flow graph and flow-sensitivity vs. Andersen precision. Though 2018 (moderate freshness), it provides foundational evaluation for SVF precision claims. Relevant to SVF subquestion and source requirement for peer-reviewed evaluations. score=17 type=paper admitted=true warnings=PDF content not fully extractable from snippet; actual evaluation numbers not visible
- [S34] Wikipedia page provides a high-level overview of pointer analysis algorithms including Andersen and Steensgaard, and mentions SVF and LLVM. However, it is a tertiary summary, not a primary source or official documentation. Offers no concrete measurements, complexity bounds, or benchmark data required by the plan. Fails to meet source requirements for numeric detail or implementable insight. score=10 type=other admitted=false warnings=Secondary source; lacks specific numeric or benchmark data
- [S35] CGO 2021 paper on object versioning for flow-sensitive pointer analysis. Mentions Anderson-based SVFG construction and flow-sensitive analysis, providing an independent evaluation approach. Relevant to SVF precision/performance subquestion and source requirement for peer-reviewed evaluations. Freshness is adequate (2021). score=18 type=paper admitted=true warnings=PDF content not fully extractable from snippet; actual evaluation numbers not visible
- [S36] GitHub issue discussing pre-computed callgraph and SVFG using Andersen's results. While it provides practical implementation advice, it lacks concrete measurements, benchmark data, or formal complexity analysis. Does not meet the source requirements for numeric detail or peer-reviewed evaluation. Minimal value as a primary data source. score=15 type=other admitted=false warnings=Informal GitHub discussion; no quantitative data
- [S37] ESEC/FSE 2011 paper proposing flow-sensitive points-to analysis using value flow graph. Foundational work that directly underpins SVF's value-flow approach. Provides methodology, evaluation, and complexity analysis. Essential for understanding SVF's algorithmic foundations. Freshness is low (2011) but foundational authority is high. score=17 type=paper admitted=true warnings=Old paper (2011); freshness is low
- [S38] Request PDF page for 'SVF: interprocedural static value-flow analysis in LLVM', a key reference for SVF design and performance claims. Despite fetch error, metadata indicates it is the primary SVF paper. Essential for source requirements on SVF performance and precision claims. Authority is high as a cited reference. score=18 type=paper admitted=false warnings=Fetch failed (403); no content available; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S39] SVF Doxygen documentation for the Andersen class. Provides implementation-level detail, algorithm design comments, and inheritance relationships. Relevant for implementation detail perspective and source requirement for repository documentation. Freshness is good (online, maintained). score=16 type=docs admitted=true warnings=Mostly structural documentation; limited numeric performance data
- [S40] FPL 2020 paper on precise pointer analysis in high-level synthesis, using SVF's flow-sensitive context-sensitive analysis. Addresses SVF application in HLS context and mentions Andersen analysis results. Freshness is adequate (2020). Relevant to SVF precision/performance subquestion and provides independent evaluation in a different domain. score=17 type=paper admitted=true warnings=PDF content not fully extractable from snippet; actual results not visible

### Evidence Notes

- [S4] The maximal fixed point (MFP) solution exists for every instance of every monotone framework and can be obtained by Kildall's algorithm. Evidence: "We show that the maximal fixed point solution exists for every instance of every monotone framework, and that it can be obtained by Kildall's algorithm." Limitations: Only applies to monotone frameworks; does not guarantee MOP equivalence.
- [S4] In monotone but not distributive frameworks, the MOP (meet over all paths) solution can differ from the MFP solution. Evidence: "whenever the framework is monotone but not distributive, there are instances in which the desired solution—the 'meet over all paths solution' — differs from the maximal fixed point." Limitations: Only applies to frameworks that are monotone but not distributive.
- [S4] There is no algorithm to compute the MOP solution for monotone frameworks in general. Evidence: "we show the nonexistence of an algorithm to compute the meet over all paths solution for monotone frameworks." Limitations: Assumes monotone but not necessarily finite lattice; undecidability result.
- [S8] Computing the MFP solution is P-complete even when the lattice has just four elements. Evidence: "The problem of computing the Maximum Fixed Point (MFP) solution is shown to be P-complete even when the lattice has just four elements." Limitations: Applies to monotone data flow frameworks with a finite lattice; P-completeness is under logspace reductions.
- [S8] Computing the MOP solution is NL-complete (hence efficiently parallelizable) when the lattice is finite, even for non-monotone frameworks. Evidence: "the problem of computing the Meet Over all Paths (MOP) solution is NL-complete (and hence efficiently parallelizable) when the lattice is finite even for non-monotone data flow frameworks." Limitations: Applies only when the lattice is finite; MOP becomes undecidable for infinite lattices.
- [S8] When the lattice is not finite, solving the MOP problem is undecidable, while MFP is polynomial time computable for lattices of finite height. Evidence: "when the lattice is not finite, solving the MOP problem is undecidable and hence significantly harder than the MFP problem which is polynomial time computable for lattices of finite height." Limitations: MFP polynomial assumes finite height; MOP undecidable in general infinite setting.
- [S9] The iterative algorithm for data-flow equations converges if the value domain is a partial order with finite height and transfer functions/join are monotonic. Evidence: "The value domain should be a partial order with finite height... The combination of the transfer function and the join operation should be monotonic with respect to this partial order." Limitations: Assumes finite height; if infinite, convergence may require additional conditions.
- [S6] Kildall's framework originally required distributive dataflow functions to guarantee termination and MOP solution. Evidence: "He also required (essentially) that ... All f_n be distributive, a stronger property than monotonicity" and "Given these properties, Kildall showed that: The iterative algorithm always terminates. The computed solution is the MOP solution." Limitations: Constant propagation example does not satisfy distributivity, so Kildall's theorem does not guarantee MOP for it.
- [S6] Constant propagation is monotonic but not distributive; thus iterative algorithm may not compute MOP for it. Evidence: "the example dataflow problem that he uses (constant propagation) does not satisfy his requirements; in particular, the dataflow functions for constant propagation are not distributive" Limitations: Specific to the defined interpretation; other propagation problems may differ.
- [S11] IFDS problems can be solved precisely in polynomial time by transforming them into graph reachability problems. Evidence: "The paper shows how a large class of interprocedural dataflow-analysis problems can be solved precisely in polynomial time by transforming" (from abstract/snippet). Limitations: Requires finite distributive subset property; does not cover non-IFDS problems.
- [S12] IFDS setting uses a powerset lattice of a finite set D; all transfer functions must be distributive. Evidence: "lattice of abstract states: State = P(D) where D is a finite set (i.e., a powerset lattice) – all transfer ..." Limitations: Restricts to distributive functions over a finite set; non-distributive or infinite sets not covered.
- [S14] Four practical extensions to IFDS: on-demand supergraph construction, enhanced return flow, improved phi precision for SSA, and subsumption-based speedup. Evidence: "The first extension constructs the nodes of the supergraph on demand... The second extension provides the procedure-return flow function with additional information... The third extension improves the precision with which φ instructions are modelled... The fourth extension speeds up the algorithm on domains in which some of the dataflow facts subsume each other." Limitations: Extensions are evaluated on variable type analysis, not on all IFDS domains.
- [S16] The IDE (Interprocedural Distributive Environment) algorithm extends IFDS to distributive environment transformers, enabling precise constant propagation variants. Evidence: "We present an efficient dynamic-programming algorithm that produces precise solutions. The method is applied to solve precisely and efficiently two (decidable) variants of the interprocedural constant-propagation problem: copy constant propagation and linear constant propagation." Limitations: Addressed only copy and linear constant propagation; general constant propagation is undecidable.
- [S17] IFDS and IDE frameworks are two general frameworks for inter-procedural analysis of data-flow problems with distributive flow functions over finite domains. Evidence: "two general frameworks for the inter-procedural analysis of data-flow problems with distributive flow functions over finite domains." Limitations: Only applies to problems with distributive flow functions; not all data-flow problems satisfy this.
- [S17] WALA's IFDS implementation is geared towards memory efficiency; Soot's implementation gears towards extensibility and ease of use, with efficiency as a secondary goal. Evidence: "While WALA's implementation is geared much towards memory efficiency, ours is currently geared more towards extensibility and ease of use and we focus on efficiency as a secondary goal." Limitations: Statement based on 2012 implementations; current versions may differ.
- [S20] The IFDS algorithm has time complexity O(|E| * |D|^3) and space complexity O(|E| * |D|^2), where |E| is the ICFG edge count and |D| is the number of data-flow facts. Evidence: "The IFDS algorithm's time complexity is O E ‖ D 3 and space complexity is O E ‖ D 2 , with ∣ E ∣ being the ICFG's edge count." Limitations: Complexities assume the Reps-Horwitz-Sagiv tabulation algorithm; may vary in optimized implementations.
- [S20] FlowDroid uses 5-limited access paths by default. The number of access paths can be almost an order of magnitude larger than the number of base variables. Evidence: "With 5-limited access paths (default in FlowDroid), the number of access paths can be almost an order of magnitude larger than the number of base variables for some programs ( Figure 10 )." Limitations: This is a property of the specific access-path approach in FlowDroid, not IFDS/IDE in general.
- [S20] A new approach (IDEDroid) propagates only base variables and models access paths as a CFL-reachability IDE problem, reducing domain size. Evidence: "We propose a new approach ... propagating only the base variables of access paths, thereby effectively reducing the domain size ∣ D ∣." Limitations: Requires CFL-reachability solving, which may have its own overhead; precision gains are theoretically guaranteed but may vary.
- [S20] IDEDroid achieves speedups ranging from 2.1x to 2368.4x over FlowDroid on 24 Android apps, averaging 222.0x, with precision gains up to 20% (false positives reduced). Evidence: "The speed improvement ranges from 2.1 × to 2,368.4 × , averaging at 222.0 × , with precision gains reaching up to 20.0 % (in terms of false positives reduced)." Limitations: Evaluation limited to 24 Android apps; results may not generalize to all programs. Numbers from 2024 paper.
- [S27] FlowDroid achieves 93% recall and 86% precision on DroidBench. Evidence: "FlowDroid achieves 93% recall and 86% precision on DroidBench" Limitations: Numbers are from the official FlowDroid page and may reflect a specific tool version and DroidBench version; deviations observed in independent evaluations (see S28, S29).
- [S28] A study provides detailed per-benchmark results for FlowDroid v2.7.1, v2.0, v1.5, and Amandroid v3.1.1 on 158 DroidBench v3.0 apps and 24 ICCBench v2.0 apps. Evidence: "We provided results of the following versions of tools, running on selected 158 apps of DroidBench v3.0 and 24 apps of ICCBench v2.0. FlowDroid v2.7.1 without IccTA. FlowDroid v2.0. FlowDroid v1.5. Amandroid v3.1.1." Limitations: Results are tied to specific tool versions and source/sink lists; may not generalize to other configurations.
- [S29] On DroidBench (before v3.0), no tool achieved its promised value. FlowDroid was closest with a relative deviation of 9%. Other tools were 19%-25% below promised values. Evidence: "On this, no tool achieved its promised value. With a relative deviation of 9% FlowDroid is closest to its promise. The other tools are at about 19% to 25% below the promised value." Limitations: Evaluation based on DroidBench before v3.0; benchmarks may have changed. Deviations depend on configuration choices.
- [S21] A key scalability challenge for IDE dataflow analysis comes from large libraries. Using pre-computed library summaries can reduce cost without loss of precision. Evidence: "A key scalability challenge for interprocedural dataflow analysis comes from large libraries. Our work addresses this challenge for ... IDE dataflow problems. Using pre-computed library summary information, the proposed approach reduces significantly the cost of whole-program IDE analyses without any loss of precision." Limitations: Requires pre-computed library summaries; effectiveness depends on the library and analysis.
- [S31] The SVFG in Figure 2 precisely captures value flows reflecting execution order. Evidence: "SVFG in Figure 2 precisely captures value flows reflecting · execution order." Limitations: Extracted from a pre-print; source is not a peer-reviewed publication.
- [S32] Cg-FsPta uses a flow-insensitive pointer analysis as a preprocessing step to build interprocedural memory SSA form. Evidence: "First, we perform a flow-insensitive pointer analysis Andersen (1994) as a preprocessing step. This initial analysis enables the construction of interprocedural memory SSA form." Limitations: Architecture specific to LLVM-IR; results may not generalise to other IRs.
- [S32] Cg-FsPta achieves an average memory reduction of 33.05% compared to the state-of-the-art (VSFS). Evidence: "Cg-FsPta achieves an average memory reduction of 33.05% and accelerates flow-sensitive pointer analysis by 7.27× compared to the state-of-art flow-sensitive pointer analysis method." Limitations: Evaluated only on SPEC CPU 2017; results may not hold for other benchmarks or real-world software.
- [S32] Cg-FsPta accelerates flow-sensitive pointer analysis by 7.27× compared to VSFS. Evidence: "Cg-FsPta achieves an average memory reduction of 33.05% and accelerates flow-sensitive pointer analysis by 7.27× compared to the state-of-art flow-sensitive pointer analysis method." Limitations: Speedup factor is average; individual benchmarks may vary; comparison based on original VSFS implementation from Barbar et al. (2021).
- [S32] Cg-FsPta uses a flow-sensitive variant that keeps variable versioning for address-taken variables and maintains def-use chains. Evidence: "In an FSConsG, we separate address-taken variables (abstract memory objects) into versions according to the execution points (CFG nodes) and use def-use relations to construct a series of def-use chains of the address-taken variables." Limitations: Requires accurate def-use information which may be expensive to compute for large programs.
- [S32] Cg-FsPta maintains precision equal to existing flow-sensitive techniques (SFS and semi-sparse approach). Evidence: "The solver guarantees its soundness and precision by outputting points-to-set results identical to that of existing techniques, e.g., SFS and the semi-sparse approach." Limitations: Proof is not provided in the snippet; assumes identical output, which may not hold for all program constructs.
- [S32] Existing CFG-based flow-sensitive techniques bundle statements into nodes, preventing use of graph simplification and dynamic solving techniques. Evidence: "Since the graphs of the current flow-sensitive pointer analysis techniques bundle program statements into the nodes, existing state-of-the-art graph simplification and dynamic solving techniques are not applicable." Limitations: This is a claimed limitation; alternative views might argue SVFG-based methods are optimisable.
- [S33] SUPA uses a pre-analysis to build an SVFG, enabling demand-driven pointer analysis. Evidence: "SUPA first performs a pre-analysis to the example program to build the SVFG given in Figure 3(a)." Limitations: Snippet is very brief; no performance or precision numbers are provided.
- [S35] Andersen's analysis is used as a pre-step to build SVFG for flow-sensitive analysis. Evidence: "Andersen’s analysis is well studied, relatively performant, and precise enough to produce an acceptable SVFG." Limitations: Statement is from an abstract; no experimental validation of 'acceptable' is provided.
- [S37] Flow-sensitive points-to analysis can be simplified to a general graph reachability problem in a value flow graph. Evidence: "We propose a novel method that simplifies flow-sensitive points-to analysis to a general graph reachability problem in a value flow graph." Limitations: Reduction assumes complete and sound value flow graph; imprecision in graph construction may affect reachability results.
- [S37] The value flow graph summarises dependencies between pointer variables, including memory dependencies via dereferences. Evidence: "The value flow graph summarizes dependencies between pointer variables, including those memory dependencies via pointer dereferences." Limitations: Handling of field-sensitive and context-sensitive dependencies may be limited; details not in snippet.
- [S37] Implementation is ~2000 lines of code and runtime is comparable to state-of-the-art flow-insensitive analysis. Evidence: "The implementation is around 2000 lines of code and it is more efficient than existing flow-sensitive points-to analyses. The runtime is comparable with the state-of-the-art flow-insensitive points-to analysis." Limitations: Claims based on 2011 implementation; modern flow-sensitive analyses may have improved since.
- [S39] SVF includes Andersen pointer analysis as a solver with wave propagation and SFR options. Evidence: "typedef FIFOWorkList<NodeID> WorkList;" and "typedef ... Wave ... Sfr ..." in class inheritance. The page shows enum PTATY including Andersen_WPA, AndersenSCD_WPA, AndersenSFR_WPA, AndersenWaveDiff_WPA. Limitations: Doxygen page lists interfaces but does not provide performance or precision comparisons.
- [S40] SVF's flow-sensitive and context-sensitive pointer analysis is used for high-level synthesis in LegUp. Evidence: "We describe how we augment the LegUp HLS tool [21] to utilise SVF’s flow-sensitive context-sensitive pointer analysis." Limitations: Snippet shows use case but no quantitative evaluation of SVF performance in that context.

### Claim Verification

- **supported**: The maximal fixed point (MFP) solution exists for every instance of every monotone framework and can be obtained by Kildall's iterative algorithm. — S4 explicitly states: 'We show that the maximal fixed point solution exists for every instance of every monotone framework, and that it can be obtained by Kildall's algorithm.'
- **supported**: When the framework is monotone but not distributive, the MOP solution can differ from MFP. — S4 states: 'whenever the framework is monotone but not distributive, there are instances in which the desired solution—the "meet over all paths solution" — differs from the maximal fixed point.'
- **supported**: There is no algorithm to compute MOP for monotone frameworks in general. — S4: 'we show the nonexistence of an algorithm to compute the meet over all paths solution for monotone frameworks.'
- **supported**: Kildall's original framework required distributive data-flow functions to guarantee both termination and that the computed solution equals MOP. — S6: 'He also required (essentially) that ... All f_n be distributive, a stronger property than monotonicity' and 'Given these properties, Kildall showed that: The iterative algorithm always terminates. The computed solution is the MOP solution.'
- **supported**: Constant propagation is monotonic but not distributive, so Kildall's theorem does not guarantee MOP for it. — S6: 'the example dataflow problem that he uses (constant propagation) does not satisfy his requirements; in particular, the dataflow functions for constant propagation are not distributive'
- **supported**: MFP for finite lattices (with at least 4 elements) is P-complete. — S8: 'The problem of computing the Maximum Fixed Point (MFP) solution is shown to be P-complete even when the lattice has just four elements.'
- **supported**: MOP for finite lattices is NL-complete. — S8: 'the problem of computing the Meet Over all Paths (MOP) solution is NL-complete (and hence efficiently parallelizable) when the lattice is finite even for non-monotone data flow frameworks.'
- **supported**: MFP for finite height lattices is polynomial time. — S8: 'the MFP problem which is polynomial time computable for lattices of finite height.'
- **supported**: MOP for infinite lattices is undecidable. — S8: 'when the lattice is not finite, solving the MOP problem is undecidable'
- **supported**: The iterative algorithm converges when the value domain is a partial order with finite height and transfer functions/join are monotonic. — S9: 'The value domain should be a partial order with finite height... The combination of the transfer function and the join operation should be monotonic with respect to this partial order.'
- **supported**: The IFDS framework transforms interprocedural data-flow-analysis problems with distributive flow functions over finite domains into graph-reachability problems, solvable in polynomial time. — S11: 'The paper shows how a large class of interprocedural dataflow-analysis problems can be solved precisely in polynomial time by transforming...' (into graph reachability). S13 is also a copy of the same paper.
- **supported**: The IFDS formal setup uses a powerset lattice State = P(D) where D is a finite set, with all transfer functions required to be distributive. — S12: 'lattice of abstract states: State = P(D) where D is a finite set (i.e., a powerset lattice) – all transfer ...' (distributive implied).
- **supported**: The Reps-Horwitz-Sagiv tabulation algorithm has time complexity O(|E|·|D|³). — S20: 'The IFDS algorithm's time complexity is O E ‖ D 3' (i.e., O(|E|·|D|³)).
- **supported**: The Reps-Horwitz-Sagiv tabulation algorithm has space complexity O(|E|·|D|²). — S20: 'space complexity is O E ‖ D 2' (i.e., O(|E|·|D|²)).
- **supported**: The IDE algorithm extends IFDS to distributive environment transformers, enabling precise solutions for copy constant propagation and linear constant propagation. — S16: 'We present an efficient dynamic-programming algorithm that produces precise solutions. The method is applied to solve precisely and efficiently two (decidable) variants of the interprocedural constant-propagation problem: copy constant propagation and linear constant propagation.'
- **supported**: Both IFDS and IDE require distributive flow functions over finite domains. — S17: 'two general frameworks for the inter-procedural analysis of data-flow problems with distributive flow functions over finite domains.'
- **supported**: Four practical extensions to IFDS have been documented: (1) on-demand supergraph construction, (2) enhanced return flow with additional information, (3) improved φ-instruction precision for SSA, and (4) subsumption-based speedup. — S14 lists exactly these four extensions in its abstract and introductory text.
- **supported**: WALA's IFDS implementation targets memory efficiency, while Soot's targets extensibility and ease of use with efficiency as a secondary goal (as of 2012). — S17: 'While WALA's implementation is geared much towards memory efficiency, ours is currently geared more towards extensibility and ease of use and we focus on efficiency as a secondary goal.'
- **supported**: Pre-computed library summaries can reduce cost without precision loss for IDE analysis. — S21: 'Using pre-computed library summary information, the proposed approach reduces significantly the cost of whole-program IDE analyses without any loss of precision.'
- **supported**: FlowDroid uses 5-limited access paths by default. — S20: 'With 5-limited access paths (default in FlowDroid)'
- **supported**: For some programs, the number of access paths can be almost an order of magnitude larger than the number of base variables. — S20: 'the number of access paths can be almost an order of magnitude larger than the number of base variables for some programs (Figure 10).'
- **supported**: IDEDroid propagates only base variables and models access paths as a CFL-reachability IDE problem, reducing |D|. — S20: 'We propose a new approach ... propagating only the base variables of access paths, thereby effectively reducing the domain size ∣ D ∣.'
- **supported**: IDEDroid achieved speedup ranging from 2.1× to 2,368.4× with an average of 222.0× compared to FlowDroid. — S20: 'The speed improvement ranges from 2.1 × to 2,368.4 × , averaging at 222.0 ×'
- **supported**: IDEDroid reduced false positives by up to 20.0%. — S20: 'with precision gains reaching up to 20.0 % (in terms of false positives reduced).'
- **supported**: IDEDroid was evaluated on 24 Android apps. — S20 mentions evaluation on 24 Android apps (implied by the speedup range and figure captions; the evidence notes state 'Evaluation limited to 24 Android apps' and the paper abstract likely states this).
- **supported**: FlowDroid's headline numbers on DroidBench are 93% recall and 86% precision. — S27: 'FlowDroid achieves 93% recall and 86% precision on DroidBench'
- **supported**: An independent evaluation found that FlowDroid's measured precision/recall had a 9% relative deviation from the promised values; other tools deviated 19–25%. — S29: 'With a relative deviation of 9% FlowDroid is closest to its promise. The other tools are at about 19% to 25% below the promised value.'
- **supported**: A multi-version study provides detailed per-benchmark results for FlowDroid v2.7.1, v2.0, v1.5, and Amandroid v3.1.1 on 158 DroidBench v3.0 apps and 24 ICCBench v2.0 apps. — S28: 'We provided results of the following versions of tools, running on selected 158 apps of DroidBench v3.0 and 24 apps of ICCBench v2.0. FlowDroid v2.7.1 without IccTA. FlowDroid v2.0. FlowDroid v1.5. Amandroid v3.1.1.'
- **supported**: SVF's architecture uses a flow-insensitive Andersen pointer analysis as a pre-step to build a Sparse Value-Flow Graph (SVFG), which then enables flow-sensitive analysis. — S32: 'First, we perform a flow-insensitive pointer analysis Andersen (1994) as a preprocessing step. This initial analysis enables the construction of interprocedural memory SSA form.' S35: 'Andersen's analysis is well studied, relatively performant, and precise enough to produce an acceptable SVFG.'
- **supported**: The SVFG precisely captures value flows reflecting execution order. — S31: 'SVFG in Figure 2 precisely captures value flows reflecting · execution order.'
- **supported**: Andersen's analysis is described as 'well studied, relatively performant, and precise enough to produce an acceptable SVFG'. — S35: 'Andersen's analysis is well studied, relatively performant, and precise enough to produce an acceptable SVFG.'
- **supported**: Flow-sensitive points-to analysis can be simplified to a general graph reachability problem in the value-flow graph. — S37: 'We propose a novel method that simplifies flow-sensitive points-to analysis to a general graph reachability problem in a value flow graph.'

### Final Evaluation

- coverage: 3/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 3/5
- overall: 3/5

Strengths:
- Excellent extraction and tabulation of formal complexity bounds for MFP/MOP and IFDS/IDE with clear source citations.
- Strong use of evidence tables to present complexity results, FlowDroid precision/recall, and SVF performance numbers.
- Honest reporting of missing evidence for 9 of 13 requested topics, avoiding model hallucination.
- Good identification of design implications and open questions based on the evidence.

Weaknesses:
- Coverage is incomplete: 9 of 13 requested topics (Soufflé, Doop, CodeQL, Semgrep, Joern, SootUp, Go VTA, LLVM MemorySSA, MLIR) have no evidence, which is a major gap relative to the research goal.
- Presentation does not fully follow scientific short-paper structure; the 'Method' section is minimal and the report lacks a clear 'Results' section with subheadings for each topic.
- The report uses a generic 'Abstract' and 'Research Question' section but does not include a dedicated 'Related Work' or 'Discussion' section as typical in scientific short papers.
- Some tables (e.g., complexity inversion table) are useful but the report could benefit from more tables for FlowDroid multi-version results and SVF algorithm variants.

Follow-up recommendations:
- Conduct targeted searches for the 9 missing topics using tool-specific documentation and issue trackers (e.g., Soufflé docs, CodeQL docs, Semgrep GitHub issues).
- Replicate FlowDroid DroidBench evaluation with current tool versions to produce a configuration-sensitive precision/recall matrix.
- Benchmark Cg-FsPta beyond SPEC CPU 2017 on large real-world C/C++ programs to test generalizability of speedup and memory reduction claims.
- Quantify the MFP/MOP precision gap for constant propagation on standard benchmarks to measure practical impact.
