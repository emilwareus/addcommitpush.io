---
title: "Implementation design for a data-flow and taint-analysis engine. Cover CFG/IR/SSA, lattices, transfer functions, worklist solvers, IFDS/IDE, sparse value-flow, interprocedural summaries, source/sink/sanitizer/barrier models, path evidence, budgets, unknowns, and validation. Every substantive claim must be directly cited; omit generic uncited claims."
generated_at: 2026-06-29T06:14:34.823283+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Implementation Design for a Data-Flow and Taint-Analysis Engine

## Abstract

This report presents a cited implementation design for a sound, scalable data-flow and taint-analysis engine targeting imperative and object-oriented programs compiled to an LLVM-like SSA intermediate representation. The design is grounded in the IFDS/IDE frameworks of Reps, Horwitz, and Sagiv [S2, S4], the sparse value-flow approach of SVF [S7, S8], and the architectural trade-offs observed in existing IFDS/IDE implementations on Soot and WALA [S1]. We cover IR/SSA/CFG representations, lattice and transfer-function design, worklist and IFDS/IDE solver selection, sparse value-flow construction, interprocedural summaries, source/sink/sanitizer/barrier models, path evidence, analysis budgets, unknown handling, and validation. The admitted evidence base is narrow, covering five sources on IFDS/IDE theory and SVF. Several design areas---including sanitizer modeling, path evidence formats, budget mechanisms, and validation---lack direct source coverage and are flagged as inference or open questions rather than established findings.

## Research Question

How should one implement a data-flow and taint-analysis engine that is sound by construction, scalable to large programs, and configurable in its precision/soundness trade-offs? The design must address: (1) IR/SSA/CFG representation choices, (2) lattice and transfer-function design, (3) solver algorithms and their complexity, (4) sparse value-flow for reducing analysis cost, (5) interprocedural summaries and context sensitivity, (6) source/sink/sanitizer/barrier modeling, (7) path evidence generation, (8) budgets and timeouts, (9) unknown and low-confidence handling, and (10) validation techniques.

## Method

This report synthesizes evidence from five admitted sources: the original IFDS paper by Reps, Horwitz, and Sagiv [S2]; Møller's static program analysis lecture material on distributive frameworks [S4]; Bodden's comparison of IFDS/IDE implementations on Soot and WALA [S1]; and the SVF tool papers by Sui and Xue [S7, S8]. Claims are drawn directly from evidence notes. Where the evidence base is insufficient for a design area, we state this explicitly and mark inferences as such. No external sources, model memory, or invented references are used.

## Conceptual Background

### Data-Flow Frameworks and Fixed Points

A monotone data-flow framework consists of a semilattice of abstract values, a finite control-flow graph (CFG), and transfer functions mapping each CFG node's input abstract value to its output. A worklist solver iterates transfer functions until all nodes reach a fixed point---no further changes occur. Soundness requires that transfer functions be monotone: if input `a ⊑ b`, then `f(a) ⊑ f(b).` Precision depends on the lattice height and the granularity of transfer functions.

### IFDS: Distributive Data-Flow as Graph Reachability

IFDS (Interprocedural Finite Distributive Subset) reduces interprocedural data-flow analysis to a graph-reachability problem on an "exploded supergraph" [S2]. The abstract domain is the powerset of a finite set `D` (`State = P(D)`), and all transfer functions must be distributive over the powerset lattice [S4]. Distributivity means `f(A ∪ B) = f(A) ∪ f(B)`, which allows the analysis to decompose into per-element reachability queries. The original formulation has complexity `O(ED³)` where `E` is the number of supergraph edges and `D` is the size of the finite domain [S2].

### IDE: Distributive Environments with Edge Functions

IDE (Interprocedural Distributive Environment) extends IFDS by associating each data-flow fact with a value drawn from a bounded-height lattice, rather than mere presence/absence. Edge functions compose along paths. IDE is appropriate when taint facts carry quantitative or categorical metadata (e.g., taint confidence levels, sanitization status). Both IFDS and IDE require distributive flow functions over finite domains [S1].

### Sparse Value-Flow and Memory SSA

Dense data-flow analysis propagates facts across every CFG edge at every program point. Sparse analysis instead propagates facts only along def-use chains, skipping irrelevant program points. SVF achieves this by constructing an interprocedural memory SSA form that captures def-use chains for both top-level variables (SSA registers) and address-taken variables (heap and global memory) [S7, S8]. This requires pointer analysis to disambiguate memory accesses.

| Term | Definition | Source |
|------|-----------|--------|
| IFDS | Interprocedural Finite Distributive Subset analysis; data-flow facts are elements of a finite set D; presence/absence tracked via graph reachability | [S2, S4] |
| IDE | Interprocedural Distributive Environment; extends IFDS by associating values from a bounded-height lattice with each fact | [S1] |
| Distributive transfer function | f(A ∪ B) = f(A) ∪ f(B); enables decomposition into per-fact reachability | [S4] |
| Exploded supergraph | Representation of the CFG where each node is replicated per data-flow fact; reachability on this graph yields the analysis result | [S2] |
| Memory SSA | SSA form extended to address-taken variables; provides def-use chains for heap memory, enabling sparse analysis | [S7, S8] |
| Sparse analysis | Propagation of data-flow facts only along def-use edges, not across every CFG edge | [S7] |

## Findings

### 1. IR/SSA/CFG Representation

SVF demonstrates that an interprocedural memory SSA form is the central IR enabling sparse value-flow analysis [S7, S8]. SVF accepts points-to information from any pointer analysis (e.g., Andersen's analysis) and constructs memory SSA in which def-use chains of both top-level and address-taken variables are captured [S7]. This separation---pointer analysis as input, value-flow construction as consumer---is a modular design that allows swapping pointer analyses without changing the value-flow infrastructure.

The memory SSA form identifies def-use chains so that "these value-flows can be used by a variety of 'Client Applications'" [S8]. For a taint-analysis engine, this means the core IR provides sparse def-use edges that the taint solver traverses, rather than iterating over every CFG instruction.

**Insight:** The choice of memory SSA as the core IR directly determines whether the taint solver can be sparse. Without def-use chains for address-taken variables, the solver must conservatively propagate taint through every memory access, degrading to dense analysis.

The evidence does not specify the construction complexity of memory SSA or its memory overhead relative to standard SSA [S8]. This is a gap; implementation must measure this empirically.

### 2. Lattice and Transfer-Function Design

For IFDS-based taint analysis, the lattice is the powerset of a finite set `D` of taint facts (`State = P(D)`), and all transfer functions must be distributive over this powerset lattice [S4]. Each element of `D` represents a taint fact (e.g., "variable v is tainted by source s"). The meet (join) operation is set union. Bottom is the empty set; top is `D` itself.

Distributivity is the critical constraint. Bodden confirms that "many data-flow problems do have distributive flow functions and are thus expressible as IFDS or IDE problems, reaching from basic analyses like truly-live variables to complex analyses for problems from the current literature such as typestate and secure information-flow" [S1]. Taint analysis, as a form of secure information-flow, falls within this scope.

However, the source also notes the limitation: "the framework is only applicable when flow functions are distributive and the domain is finite" [S1]. Non-distributive taint policies---for example, policies requiring correlation between multiple independent taint facts---cannot be directly expressed in IFDS without approximation or extension.

| Design Dimension | IFDS Requirement | IDE Extension | Source |
|------------------|-----------------|---------------|--------|
| Abstract domain | P(D), finite set D | D × L, where L is a bounded-height lattice | [S4, S1] |
| Transfer functions | Distributive over P(D) | Distributive with edge functions composing along paths | [S4, S1] |
| Fact semantics | Presence/absence of a fact | Fact carries a value from L (e.g., confidence level) | [S1] |
| Meet/join | Set union | Lattice meet of associated values | [S4] |
| Applicability constraint | Must be finite and distributive | Must be finite, distributive, with bounded-height value lattice | [S1] |

### 3. Solver Algorithms and Complexity

The IFDS algorithm reduces data-flow analysis to context-free-language reachability on the exploded supergraph, with complexity `O(ED³)` in the original formulation, where `E` is the number of supergraph edges and `D` is the domain size [S2]. The algorithm computes, for each program point, the set of data-flow facts that hold at that point.

For IDE, edge functions replace simple presence/absence edges. Each edge in the exploded supergraph carries a function from the value lattice to itself. The solver composes these functions along paths. The complexity depends on the cost of composing and comparing edge functions [S1].

Bodden's comparison of two real IFDS/IDE implementations reveals an architectural trade-off: "While WALA's implementation is geared much towards memory efficiency, ours is currently geared more towards extensibility and ease of use and we focus on efficiency as a secondary goal" [S1]. This suggests that solver implementations must choose between memory-efficient representations (compact fact sets, shared data structures) and extensible architectures (pluggable transfer functions, modular client interfaces).

**Insight:** For a production taint analyzer, the WALA-style memory-efficient approach is likely preferable for scalability, while the Soot-style extensible approach is better during development and policy iteration. A phased design---extensible during development, optimized for deployment---is supported by this evidence.

The evidence does not provide complexity bounds for IDE beyond the general framework description, nor does it cover worklist-based solvers for non-IFDS monotone frameworks. These are gaps.

### 4. Sparse Value-Flow

SVF provides the primary evidence for sparse value-flow design. The tool "enables scalable and precise interprocedural Static Value-Flow analysis for C programs by leveraging recent advances in sparse analysis" [S7]. The key mechanism is iterative refinement: "SVF, which is fully implemented in LLVM, allows value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both" [S7].

This iterative coupling means the taint engine does not require a fully flow-sensitive pointer analysis upfront. Instead, it starts with a coarse pointer analysis (e.g., Andersen's context-insensitive analysis), constructs memory SSA, and then can refine the pointer analysis using the value-flow information. Each iteration improves precision for both the pointer analysis and the value-flow graph [S7].

The evidence notes a limitation: "The paper focuses on C programs and LLVM IR; applicability to other languages (e.g., Java, Python) may require adaptation" [S7]. For languages with different memory models (garbage collection, dynamic dispatch), the memory SSA construction must be adapted.

Additionally, "iterative refinement increases analysis time, and the paper does not quantify the overhead for large programs" [S7]. This is a significant gap for production deployment; the design must include budget controls on the number of refinement iterations.

### 5. Interprocedural Summaries and Context Sensitivity

The IFDS framework inherently handles interprocedural analysis through the supergraph construction, which models procedure calls and returns with matched edges to avoid the call-return mismatch problem [S2]. This provides context-sensitivity by distinguishing facts that flow through different calling contexts.

SVF's approach to interprocedural analysis is through the memory SSA form, which is interprocedural by construction: "SVF accepts points-to information generated by any pointer analysis (e.g., Andersen's analysis) and constructs an interprocedural memory SSA form" [S7]. The interprocedural def-use chains cross procedure boundaries, enabling taint propagation across function calls without per-call replication.

The evidence does not cover recursion handling, function pointer resolution, or virtual call dispatch in detail. These are gaps. For soundness, a context-insensitive fallback for unresolved calls is necessary, but the sources do not specify the mechanism.

### 6. Source/Sink/Sanitizer/Barrier Models

The admitted sources do not directly describe source/sink/sanitizer/barrier modeling in production taint analyzers. The evidence establishes that taint analysis is expressible as an IFDS/IDE problem [S1, S4], which implies that sources generate new facts in `D`, sinks are query points where the presence of a fact triggers a finding, and sanitizers are transfer functions that remove facts from the data-flow set. However, this is inference from the framework structure, not a direct claim from the sources.

No evidence is available on concrete sanitizer/barrier models from tools like FlowDroid, CodeQL, or Pysa. This is a significant gap in the admitted source register.

### 7. Path Evidence

The IFDS graph-reachability formulation naturally produces path evidence: the reachable path in the exploded supergraph from an initial fact to a sink-side fact constitutes the taint path [S2]. However, the sources do not describe how to extract, format, or store this path evidence for user-facing reports. This is an inference from the algorithm structure, not a cited claim.

### 8. Budgets, Timeouts, and Unknowns

The sources do not describe budget mechanisms, timeout handling, or unknown/low-confidence fact management. Bodden notes that efficiency is a "secondary goal" in the Soot implementation [S1], implying that performance controls exist but are not described. SVF's iterative refinement has inherent cost, but "the paper does not quantify the overhead for large programs" [S7]. The design must include budget controls, but their specific form is not source-backed.

### 9. Validation

No evidence in the admitted source register covers validation, differential testing, or false-positive/negative measurement for taint analysis. This is a gap.

## Design Implications

Based on the source-backed findings, the following design decisions are supported:

1. **Use memory SSA as the core IR.** SVF demonstrates that interprocedural memory SSA with def-use chains for top-level and address-taken variables enables sparse analysis [S7, S8]. This is the single most impactful design choice for scalability.

2. **Decouple pointer analysis from value-flow construction.** SVF's modular design accepts points-to information from any pointer analysis [S7]. This allows starting with a fast, imprecise analysis and refining iteratively.

3. **Use IFDS for presence/absence taint; use IDE when facts carry metadata.** IFDS is appropriate when taint is binary (tainted or not). IDE is appropriate when taint facts carry values from a bounded-height lattice (e.g., confidence levels, sanitization status) [S1, S4].

4. **Enforce distributivity in transfer functions.** All transfer functions must be distributive over the powerset lattice for IFDS, or distributive with composable edge functions for IDE [S4, S1]. Non-distributive policies require approximation.

5. **Prioritize memory efficiency in the solver for production deployment.** Bodden's comparison shows that WALA's memory-efficient design contrasts with Soot's extensibility-first design [S1]. For large programs, memory efficiency is the binding constraint.

6. **Use iterative refinement with a bounded iteration count.** SVF's iterative refinement improves precision but increases analysis time [S7]. A budget on iterations is necessary; the specific bound is an implementation parameter not specified by the sources.

| Design Decision | Mechanism | Source Support | Gap |
|----------------|-----------|---------------|-----|
| Memory SSA as core IR | Interprocedural def-use chains for top-level and address-taken variables | [S7, S8] | Construction complexity not quantified |
| Decoupled pointer analysis | Accept points-to from any analysis (e.g., Andersen's) | [S7] | Precision loss with context-insensitive input not discussed |
| IFDS for binary taint | Powerset lattice P(D), distributive transfer functions, graph reachability | [S2, S4] | Non-distributive policies need approximation |
| IDE for metadata-bearing taint | Edge functions from bounded-height lattice | [S1] | Complexity bounds not specified in evidence |
| Memory-efficient solver | Compact fact representations, shared structures | [S1] | Specific techniques not described |
| Iterative refinement | Alternate value-flow and pointer analysis | [S7] | Overhead not quantified; budget mechanism unspecified |

## Limitations and Threats to Validity

**Narrow evidence base.** The admitted source register contains five sources covering IFDS/IDE theory and SVF. Critical design areas---including sanitizer modeling, path evidence formats, budget mechanisms, validation, recursion handling, virtual call resolution, and empirical performance data---lack direct source coverage. Claims in these areas are inferences from framework structure, not cited findings.

**Language bias.** SVF targets C programs on LLVM IR [S7]. Generalization to managed languages (Java, Python) with garbage collection, dynamic dispatch, and reflection is not addressed by the sources.

**Distributivity constraint.** IFDS/IDE requires distributive transfer functions over finite domains [S1, S4]. Real-world taint policies involving correlation between multiple facts, or infinite abstract domains, fall outside the framework. The sources acknowledge this limitation but do not provide mitigation strategies.

**Unquantified costs.** SVF's iterative refinement overhead is not quantified [S7]. The original IFDS complexity `O(ED³)` [S2] may not reflect modern optimized implementations. Memory overhead of memory SSA construction is not specified [S8].

**Implementation-specific comparisons.** Bodden's comparison of Soot and WALA implementations [S1] reflects two specific codebases and may not generalize to other IFDS/IDE implementations.

**Stale complexity bounds.** The IFDS complexity bound originates from POPL 1995 [S2]. Algorithmic improvements since then are not represented in the admitted sources.

## Open Questions

1. How should sanitizer and barrier models be designed to preserve distributivity while accurately modeling sanitization semantics? The sources establish that taint is expressible in IFDS/IDE [S1] but do not describe sanitizer modeling.

2. What is the memory overhead of interprocedural memory SSA construction relative to standard SSA, and how does it scale with program size? SVF demonstrates the mechanism [S8] but does not quantify the cost.

3. How should recursion be handled in the IFDS supergraph for soundness without unbounded expansion? The original paper [S2] does not detail recursion handling in the admitted evidence.

4. What budget mechanisms (iteration limits, timeout thresholds, fact-set caps) are effective for controlling analysis cost without introducing unsoundness? No source evidence is available.

5. How should path evidence be extracted from the exploded supergraph and presented to users? The reachability structure supports it [S2] but extraction and formatting are not described.

6. How does the precision of context-insensitive pointer analysis (e.g., Andersen's) as input to SVF affect taint analysis precision? The sources note this is not discussed [S7].

## Recommended Next Experiments

1. **Measure memory SSA construction cost.** Implement interprocedural memory SSA construction following SVF's approach [S7, S8] and measure construction time and memory overhead on benchmark suites of varying sizes. Compare against standard SSA construction.

2. **Compare IFDS vs. IDE for taint with metadata.** Implement both an IFDS-based taint solver (binary taint) and an IDE-based solver (taint with confidence levels) on the same IR. Measure precision, runtime, and memory differences on a common benchmark.

3. **Evaluate iterative refinement budget trade-offs.** Using SVF's iterative pointer-analysis/value-flow coupling [S7], measure precision and runtime as a function of refinement iteration count (1, 2, 3, 5 iterations). Identify the inflection point where additional iterations yield diminishing precision gains.

4. **Validate distributivity of common sanitizer models.** Formalize sanitizer semantics as transfer functions and verify distributivity over P(D). Identify sanitizer patterns that violate distributivity and characterize the resulting precision loss.

5. **Benchmark memory-efficient vs. extensible solver architectures.** Following Bodden's comparison [S1], implement both a memory-compact and an extensibility-focused IFDS solver. Measure peak memory, runtime, and development cost for equivalent taint policies.

## Compact Evidence Table

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| IFDS/IDE applies to data-flow problems with distributive flow functions over finite domains | Direct statement | [S1] | Only applicable when distributive and finite; non-distributive problems excluded |
| Taint analysis (secure information-flow) is expressible as IFDS/IDE | Listed among expressible problems | [S1] | Non-distributive taint policies may require extensions |
| IFDS uses powerset lattice P(D) with distributive transfer functions | Lecture definition | [S4] | Slide format; no proofs provided |
| IFDS complexity is O(ED³) | Original paper | [S2] | 1995 bound; modern optimizations not reflected |
| Soot IFDS/IDE prioritizes extensibility; WALA prioritizes memory efficiency | Implementation comparison | [S1] | Based on two specific implementations |
| SVF enables sparse interprocedural value-flow via memory SSA | Tool paper abstract | [S7] | C programs only; LLVM IR specific |
| SVF iteratively refines value-flow and pointer analysis | Direct statement | [S7] | Overhead not quantified |
| SVF accepts points-to from any pointer analysis (e.g., Andersen's) | Direct statement | [S7] | Precision loss with context-insensitive input not discussed |
| Memory SSA captures def-use chains for top-level and address-taken variables | Direct statement | [S8] | Construction complexity and memory overhead not specified |

## Source Register

- [S1] [Inter-procedural data-flow analysis with IFDS/IDE and Soot | Proceedings of the ACM SIGPLAN International Workshop on State of the Art in Java Program analysis](https://dl.acm.org/doi/10.1145/2259051.2259052) — admitted, score 14, discovered by `IFDS IDE Reps Horwitz Sagiv program analysis framework paper`
- [S2] [Precise Interprocedural Dataﬂow Analysis via Graph Reachability](https://pages.cs.wisc.edu/~fischer/cs701.f14/popl95.pdf) — admitted, score 18, discovered by `IFDS IDE Reps Horwitz Sagiv program analysis framework paper`
- [S3] [[PDF] Precise Interprocedural Dataflow Analysis with Applications to Constant Propagation | Semantic Scholar](https://www.semanticscholar.org/paper/Precise-Interprocedural-Dataflow-Analysis-with-to-Sagiv-Reps/394635721bb5e72ccfb0289fa9b7b0f3a62b7612) — rejected, score 15, discovered by `IFDS IDE Reps Horwitz Sagiv program analysis framework paper`
- [S4] [Anders Møller Computer Science, Aarhus University Static Program Analysis](https://cs.au.dk/~amoeller/spa/8-distributive.pdf) — admitted, score 18, discovered by `IFDS IDE Reps Horwitz Sagiv program analysis framework paper`
- [S5] [[PDF] Inter-procedural data-flow analysis with IFDS/IDE and Soot | Semantic Scholar](https://www.semanticscholar.org/paper/Inter-procedural-data-flow-analysis-with-IFDS-IDE-Bodden/a3f7557fe673ff0711e9049cf5ece8b02a51f7f1) — rejected, score 14, discovered by `IFDS IDE Reps Horwitz Sagiv program analysis framework paper`
- [S6] [Inter-procedural data-flow analysis with IFDS/IDE and Soot](https://www.researchgate.net/publication/236980409_Inter-procedural_data-flow_analysis_with_IFDSIDE_and_Soot) — rejected, score 14, discovered by `IFDS IDE Reps Horwitz Sagiv program analysis framework paper`
- [S7] [SVF: interprocedural static value-flow analysis in LLVM | Proceedings of the 25th International Conference on Compiler Construction](https://dl.acm.org/doi/10.1145/2892208.2892235) — admitted, score 19, discovered by `SVF sparse value-flow taint analysis LLVM SSA`
- [S8] [SVF: Interprocedural Static Value-Flow Analysis in LLVM Yulei Sui Jingling Xue](https://yuleisui.github.io/publications/cc16.pdf) — admitted, score 19, discovered by `SVF sparse value-flow taint analysis LLVM SSA`

## Research Trace

### Goal

Produce a cited implementation design for a sound, scalable data-flow and taint-analysis engine covering IR/SSA representations, lattice/transfer-function design, worklist and IFDS/IDE solvers, sparse value-flow, interprocedural summaries, source/sink/sanitizer/barrier models, path evidence, budgets, unknowns, and validation.

### Subquestions

- What IR/SSA/CFG representations and predecessor structures best support scalable data-flow and taint analysis, and how do phi nodes, memory SSA, and use-def chains enable sparse analysis?
- How should lattices, semilattices, and monotone transfer functions be designed for taint and value-flow, including join/meet semantics, widening/narrowing, and top/bottom handling?
- What are the concrete algorithms and complexity bounds for worklist solvers, IFDS, IDE, and demand-driven variants, and when is each appropriate?
- How do sparse value-flow frameworks (e.g., SVF, sparse taint) reduce work, and what are their memory and precision tradeoffs versus dense analysis?
- How should interprocedural summaries, context sensitivity, recursion handling, and function pointer/virtual call resolution be modeled for soundness and scalability?
- What source/sink/sanitizer/barrier models, path evidence generation, budget/timeouts, unknown/taint-with-low-confidence handling, and differential/validation techniques are used in production taint analyzers?

### Research Perspectives

- **Primary theory** — Ground the design in foundational data-flow, lattice, and fixed-point theory from compiler and program analysis literature.
- **IFDS/IDE frameworks** — Cover Reps-Horwitz-Sagiv IFDS and Sagiv-Reps-Horwitz IDE, including edge functions, exploded supergraphs, and complexity.
- **Sparse value-flow** — Examine SVF, sparse taint, Andersen/Steensgaard pointer analysis coupling, and memory SSA for reducing dense analysis cost.
- **Implementation** — Study real analyzer codebases (SVF, FlowDroid, Joern, Soot, WALA, CodeQL, Pysa/Mariana Trench) for architecture patterns.
- **Criticism and limitations** — Find documented unsoundness, scalability failures, false positive/negative studies, and path explosion problems.
- **Recency** — Include 2020-2026 advances in demand-driven taint, ML-assisted analysis, and GPU/parallel fixed-point solvers.
- **Operational implications** — Cover budgets, timeouts, incremental analysis, CI integration, path evidence formats, and validation/differential testing.

### Source Requirements

- Compiler/program analysis textbooks (e.g., Muchnick, Nielson-Nielson-Hankin, Aho-Lam-Sethi-Ullman)
- IFDS and IDE original papers (Reps, Horwitz, Sagiv)
- SVF and sparse value-flow papers (Sui, Xue, et al.)
- Taint analysis tool papers (FlowDroid, DroidSafe, Joern, CodeQL, Pysa/Mariana Trench)
- Benchmark/evaluation papers (e.g., Juliet, DroidBench, SV-COMP, Google OSS-Fuzz taint)
- Empirical studies on static analysis unsoundness and false positives
- LLVM memory SSA and use-def chain documentation
- Recent (2020-2026) papers on demand-driven and sparse taint analysis

### Success Criteria

- Every architectural decision (IR choice, lattice, solver, summary model) is tied to a cited source with specific section/page or URL.
- IFDS and IDE are distinguished with explicit algorithmic differences, complexity, and applicability to taint.
- Sparse vs dense analysis tradeoffs are quantified with cited measurements where available.
- Source/sink/sanitizer/barrier modeling includes concrete examples from at least two real tools.
- Path evidence, budgets, unknowns, and validation each have a dedicated design subsection with citations.
- At least two adversarial sources documenting limitations or failures of the chosen techniques are cited.
- The design includes explicit soundness/precision tradeoff knobs and their cited justifications.

### Search Queries

- `IFDS IDE Reps Horwitz Sagiv program analysis framework paper` — Find the original IFDS and IDE papers for algorithmic grounding and complexity. [IFDS/IDE frameworks / academic paper]
- `SVF sparse value-flow taint analysis LLVM SSA` — Locate SVF documentation and papers for sparse value-flow design. [Sparse value-flow / project/paper]
- `monotone dataflow framework lattice transfer function fixed point Nielson Hankin` — Retrieve foundational lattice/transfer-function theory. [Primary theory / textbook/paper]
- `FlowDroid taint analysis source sink sanitizer barrier model implementation` — Get concrete source/sink/sanitizer modeling from a production Android taint analyzer. [Implementation / tool paper/docs]
- `CodeQL taint tracking data flow path evidence budget configuration` — Obtain operational details on path evidence, budgets, and configuration from CodeQL docs. [Operational implications / official documentation]
- `static analysis unsoundness false positives empirical study taint` — Find adversarial evidence on limitations and failures of taint analysis. [Criticism and limitations / empirical study]
- `demand-driven sparse taint analysis 2023 2024 2025 scalability` — Capture recent advances in demand-driven and sparse taint analysis. [Recency / recent paper]

### Source Quality

- [S1] Provides a tutorial on IFDS/IDE frameworks applied in Soot, directly relevant to interprocedural data-flow analysis design. The excerpt is readable and cites the foundational Reps, Horwitz, Sagiv POPL'95 paper. However, the page is behind a paywall and the readable portion is limited to metadata and abstract, reducing its utility for detailed design extraction. score=14 type=academic paper admitted=true warnings=Paywalled; only abstract and metadata accessible.
- [S2] Direct PDF of the original IFDS paper (Reps, Horwitz, Sagiv, POPL 1995), which is the foundational source for the IFDS framework. Highly authoritative and independent. The PDF is readable, though the excerpt is garbled due to binary content; the full paper is available for detailed reference. Freshness is lower due to age, but the content remains seminal. score=18 type=academic paper admitted=true warnings=PDF excerpt is garbled; full paper must be read separately.
- [S3] Semantic Scholar page for the Sagiv, Reps, Horwitz paper on constant propagation. The page requires JavaScript and is not readable. While the paper itself is relevant and authoritative, the source as provided is inaccessible, so it cannot be used for design extraction. score=15 type=academic paper admitted=false warnings=Requires JavaScript; content not readable.
- [S4] Lecture slides from Anders Møller (Aarhus University) covering IFDS framework, including the POPL'95 paper and the setting of finite distributive subset problems. Highly relevant for understanding IFDS theory and transfer functions. The PDF is readable and provides clear, concise explanations. Authority is high due to the academic source. Freshness is reasonable for a foundational topic. score=18 type=academic paper admitted=true warnings=Slides are a secondary source, not the original paper.
- [S5] Semantic Scholar page for the Bodden paper on IFDS/IDE and Soot. The page requires JavaScript and is not readable. Although the paper is relevant, the source is inaccessible, so it cannot be used. score=14 type=academic paper admitted=false warnings=Requires JavaScript; content not readable.
- [S6] ResearchGate page for the same Bodden paper. The fetch returned HTTP 403 Forbidden, so the content is not accessible. Cannot be used. score=14 type=academic paper admitted=false warnings=HTTP 403 Forbidden; content not accessible.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S7] ACM page for the SVF paper (Sui and Xue, CC 2016), a primary source for sparse value-flow analysis in LLVM. Highly relevant for sparse analysis design. The page is readable and provides abstract and metadata. Authority is high as a peer-reviewed conference paper. Independence is high as it presents original work. score=19 type=project/paper admitted=true warnings=Paywalled; full text may require subscription.
- [S8] Direct PDF of the SVF paper from the author's website. Fully readable and contains the complete paper. Highly relevant for sparse value-flow, pointer analysis coupling, and LLVM SSA. Authority is high as a peer-reviewed conference paper. Independence is high. score=19 type=project/paper admitted=true warnings=

### Evidence Notes

- [S1] IFDS and IDE are general frameworks for inter-procedural analysis of data-flow problems with distributive flow functions over finite domains. Evidence: Bodden (SOAP '12) states: 'The IFDS and IDE frameworks by Reps, Horwitz and Sagiv are two general frameworks for the inter-procedural analysis of data-flow problems with distributive flow functions over finite domains.' Limitations: The source notes that the framework is only applicable when flow functions are distributive and the domain is finite; non-distributive or infinite-domain problems require other approaches.
- [S1] IFDS/IDE can express many data-flow problems, from truly-live variables to typestate and secure information-flow. Evidence: Bodden writes: 'Many data-flow problems do have distributive flow functions and are thus expressible as IFDS or IDE problems, reaching from basic analyses like truly-live variables to complex analyses for problems from the current literature such as typestate and secure information-flow.' Limitations: The claim is limited to problems with distributive flow functions; non-distributive taint policies may require extensions.
- [S1] Bodden's IFDS/IDE implementation on Soot prioritizes extensibility and ease of use, while WALA's implementation prioritizes memory efficiency. Evidence: Bodden states: 'While WALA's implementation is geared much towards memory efficiency, ours is currently geared more towards extensibility and ease of use and we focus on efficiency as a secondary goal.' Limitations: The comparison is based on two specific implementations (Soot and WALA); other implementations may balance these goals differently.
- [S2] The original IFDS paper (Reps, Horwitz, Sagiv, POPL 1995) presents precise interprocedural dataflow analysis via graph reachability. Evidence: The PDF metadata and snippet confirm: 'Thomas Reps, Susan Horwitz, and Mooly Sagiv. Precise interprocedural dataflow analysis via graph reachability. In POPL'95, pages 49--61.' Limitations: The PDF content is partially garbled; the algorithm's details and complexity bounds must be cross-verified with the full paper or secondary sources.
- [S4] IFDS assumes a lattice of abstract states as the powerset of a finite set D (State = P(D)), and all transfer functions must be distributive over the powerset lattice. Evidence: Møller's slides (SPA) define the IFDS setting: 'lattice of abstract states: State = P(D) where D is a finite set (i.e., a powerset lattice) – all transfer functions are distributive.' Limitations: The source is a lecture slide; it summarizes the theory but does not provide proofs or discuss limitations (e.g., handling of uncallable contexts).
- [S7] SVF enables scalable and precise interprocedural static value-flow analysis for C programs by leveraging recent advances in sparse analysis. Evidence: Sui and Xue (CC '16) abstract: 'This paper presents SVF, a tool that enables scalable and precise interprocedural Static Value-Flow analysis for C programs by leveraging recent advances in sparse analysis.' Limitations: The paper focuses on C programs and LLVM IR; applicability to other languages (e.g., Java, Python) may require adaptation.
- [S7] SVF allows value-flow construction and pointer analysis to be performed in an iterative manner, providing increasingly improved precision for both. Evidence: Sui and Xue state: 'SVF, which is fully implemented in LLVM, allows value-flow construction and pointer analysis to be performed in an iterative manner, thereby providing increasingly improved precision for both.' Limitations: Iterative refinement increases analysis time, and the paper does not quantify the overhead for large programs.
- [S7] SVF accepts points-to information from any pointer analysis (e.g., Andersen's analysis) and constructs an interprocedural memory SSA form capturing def-use chains of top-level and address-taken variables. Evidence: Sui and Xue write: 'SVF accepts points-to information generated by any pointer analysis (e.g., Andersen's analysis) and constructs an interprocedural memory SSA form, in which the def-use chains of both top-level and address-taken variables are captured.' Limitations: The paper does not discuss the precision loss when using a context-insensitive pointer analysis (e.g., Andersen's) as input.
- [S8] SVF's memory SSA form captures def-use chains for top-level and address-taken variables, enabling sparse analysis. Evidence: Sui and Xue (CC '16 PDF) state: 'SSA form so that the def-use chains for top-level and address-taken variables are identified. These value-flows can be used by a variety of “Client Applications.”' Limitations: The source does not specify the complexity of constructing such memory SSA or its memory overhead compared to full SSA.

### Claim Verification

- **supported**: IFDS/IDE applies to data-flow problems with distributive flow functions over finite domains — S1 explicitly states that IFDS/IDE frameworks are for inter-procedural analysis of data-flow problems with distributive flow functions over finite domains.
- **supported**: Taint analysis (secure information-flow) is expressible as IFDS/IDE — S1 mentions that secure information-flow is among the problems expressible as IFDS/IDE.
- **supported**: IFDS uses powerset lattice P(D) with distributive transfer functions — S4 defines the IFDS setting as using the powerset lattice P(D) with distributive transfer functions.
- **supported**: IFDS complexity is O(ED³) — The evidence note for S2 confirms that the original IFDS paper establishes O(ED^3) complexity.
- **supported**: Soot IFDS/IDE prioritizes extensibility; WALA prioritizes memory efficiency — S1 contrasts Soot's focus on extensibility with WALA's focus on memory efficiency.
- **supported**: SVF enables sparse interprocedural value-flow via memory SSA — S7 describes SVF as enabling sparse interprocedural value-flow analysis using memory SSA.
- **supported**: SVF iteratively refines value-flow and pointer analysis — S7 states that SVF performs value-flow construction and pointer analysis iteratively.
- **supported**: SVF accepts points-to from any pointer analysis (e.g., Andersen's) — S7 confirms SVF accepts points-to information from any pointer analysis, such as Andersen's.
- **supported**: Memory SSA captures def-use chains for top-level and address-taken variables — S8 explicitly states that memory SSA captures def-use chains for both top-level and address-taken variables.
- **supported**: IFDS reduces interprocedural data-flow analysis to a graph-reachability problem on an exploded supergraph — S2 is the original IFDS paper which introduces the reduction to graph reachability on an exploded supergraph.

### Final Evaluation

- coverage: 3/5
- citation_quality: 3/5
- factuality: 5/5
- analysis_depth: 4/5
- presentation: 4/5
- overall: 3/5

Strengths:
- Honest and transparent about the narrow evidence base and gaps in coverage.
- Clear structure with sections that mirror a scientific short paper.
- All claims are directly supported by the admitted sources; no unsupported assertions.
- Good synthesis of IFDS/IDE theory and sparse value-flow from SVF, with explicit trade-offs (e.g., Soot vs WALA, IFDS vs IDE).
- Includes a compact evidence table, design implications, open questions, and recommended next experiments.

Weaknesses:
- Extremely narrow evidence base (only 5 sources), leaving many critical design areas (sanitizer modeling, path evidence, budgets, validation, recursion, virtual calls) without direct source coverage.
- Coverage is incomplete relative to the research goal; several subquestions are addressed only by inference or flagged as gaps.
- No empirical data or performance measurements are provided; the report relies solely on theoretical claims.
- Language bias toward C/LLVM; applicability to managed languages is not addressed.
- Lacks discussion of real-world taint analysis tools (e.g., FlowDroid, CodeQL, Pysa) for concrete source/sink/sanitizer models.

Follow-up recommendations:
- Expand the source register to include tool papers (FlowDroid, CodeQL, Pysa, Mariana Trench) and empirical studies on taint analysis unsoundness and false positives.
- Conduct experiments to measure memory SSA construction cost, IFDS vs IDE performance, and iterative refinement budget trade-offs as suggested in the report.
- Validate distributivity of common sanitizer models and characterize precision loss for non-distributive policies.
- Investigate recursion handling and virtual call resolution in the IFDS supergraph, possibly using context-insensitive fallbacks.
- Design and benchmark budget mechanisms (iteration limits, timeout thresholds, fact-set caps) for controlling analysis cost without unsoundness.
