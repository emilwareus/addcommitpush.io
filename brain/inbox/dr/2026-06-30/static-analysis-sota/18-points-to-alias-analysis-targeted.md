---
title: "Points-to and alias analysis targeted primary sources: Andersen inclusion-based analysis, Steensgaard unification-based analysis, SVF, context sensitivity, field sensitivity, heap abstraction"
generated_at: 2026-06-29T22:12:48.907814+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Points-to and Alias Analysis: Inclusion vs Unification, Precision Dimensions, and Engineering Gaps

## Abstract
This report synthesizes evidence on points-to and alias analysis from two admitted sources. It compares Andersen's inclusion-based analysis with Steensgaard's unification-based analysis, covering complexity and precision trade-offs. It then addresses the precision dimensions of field sensitivity and heap abstraction where evidence exists. The evidence base is narrow: two sources, one a lecture note and one a research paper. The report distinguishes what the evidence supports from what it does not establish, and it explicitly notes missing information on context sensitivity, modern frameworks such as SVF, and recent advances from 2023 to 2026.

## Research Question
How do foundational points-to analysis algorithms differ in mechanism, cost, and precision, and how do field sensitivity and heap abstraction shape those trade-offs?

## Method
The report draws exclusively from the admitted source register: a lecture note on pointer analysis [S4] and a paper on unification-based pointer analysis [S2]. No external sources, URLs, or benchmark numbers were admitted. The method is to extract claims, note their limits, and infer design implications only where the evidence directly supports them. Where the register lacks evidence for a planned subquestion, the report states that absence rather than filling gaps with memory.

## Conceptual Background
Points-to analysis computes the set of abstract memory locations that a pointer may reference. Alias analysis uses points-to results to decide whether two pointers may refer to the same location. Two foundational approaches are discussed in the admitted evidence.

Inclusion-based analysis, associated with Andersen, is described in the lecture note as having worst-case cubic time complexity in program size [S4]. The lecture note motivates Steensgaard's approach as a response to this cost [S4].

Unification-based analysis, associated with Steensgaard, is described in the research paper as "significantly faster than an inclusion-based one at the expense of producing very imprecise results" [S2].

Field sensitivity is introduced in the lecture note through field constraints on abstract locations representing objects [S4]. Heap abstraction is referenced through the concept of abstract locations that represent objects [S4].

| Term | Meaning | Source basis |
|---|---|---|
| Inclusion-based analysis | Andersen's algorithm; worst-case cubic in program size | [S4] |
| Unification-based analysis | Steensgaard-style; significantly faster but very imprecise | [S2] |
| Field sensitivity | Field constraints on abstract locations representing objects | [S4] |
| Heap abstraction | Objects represented by abstract locations | [S4] |
| Context sensitivity | Procedure calls distinguished by calling context | Not in admitted evidence |

## Findings

### Andersen vs Steensgaard: Complexity and Precision
The lecture note states that "Andersen's algorithm is cubic in the size of the program, in the worst" [S4]. This establishes a scalability concern for inclusion-based analysis.

The same note continues: "For large programs, a cubic algorithm is too inefficient. Steensgaard pro-" [S4], indicating that Steensgaard's approach was designed to address this cost. The research paper confirms the trade-off: "a unification-based analysis is significantly faster than an inclusion-based one at the expense of producing very imprecise results" [S2].

The cubic bound for Andersen [S4] and the "very imprecise" result for unification [S2] represent two ends of a cost-precision trade-off. The evidence does not describe the internal mechanism of either algorithm beyond these characterizations.

| Aspect | Andersen (inclusion-based) | Steensgaard (unification-based) |
|---|---|---|
| Worst-case cost | Cubic in program size [S4] | "Significantly faster" than inclusion-based [S2] |
| Precision | Not directly characterized in evidence | "Very imprecise" [S2] |
| Failure mode | Scalability on large programs [S4] | Imprecision [S2] |

### Field Sensitivity and Heap Abstraction
The lecture note introduces field sensitivity through constraints on abstract locations. It states: "We can define a new kind of constraints for fields: ... Now assume that objects (e.g. in Java) are represented by abstract locations l. We can process field constraints with the following rules" [S4]. This indicates that field sensitivity is modeled by defining field constraints on abstract locations, though the specific processing rules are not provided in the admitted snippet.

The same note flags a language-specific limit: "Java but not for C. We can define a new kind of constraints for fields" [S4]. The snippet is fragmented, but it indicates that field constraints as described fit Java-style object models and may not transfer directly to C.

### Context Sensitivity
The admitted evidence does not provide direct claims about context sensitivity variants such as call-site, object-sensitivity, or type-sensitivity. The lecture note [S4] discusses pointer analysis and field constraints, but the admitted snippets do not mention context sensitivity by name. The research paper [S2] focuses on unification-based analysis and oversharing, not context sensitivity. This is a gap in the evidence base.

### SVF and Modern Frameworks
The admitted source register contains no sources on SVF, its documentation, its GitHub repository, or its benchmark numbers. The plan requested SVF primary documentation and associated publications, but none were admitted. The report cannot make source-backed claims about SVF's implementation of Andersen-style analysis, its performance on SPEC or SV-Benchmarks, or its precision characteristics. This absence is noted as a limitation.

### Recent Advances (2023-2026)
The current date is 2026-06-29. The admitted register contains no sources from 2023 to 2026. Source S2 is from 2019 (arxiv 1906.01706), and S4 is a lecture note with no clear date in the admitted evidence. The report cannot identify recent advances such as ML-guided analysis, demand-driven points-to, or GPU-accelerated analysis from the admitted evidence. This absence is noted.

## Design Implications
If scale matters more than precision, a unification-based Steensgaard-style analysis offers significantly faster performance at the cost of "very imprecise" results [S2].

Field sensitivity should be considered when the target language has stable, named fields, as in Java [S4]. For C, the engineer should treat field sensitivity as uncertain because the evidence indicates field constraints may not apply directly [S4].

The evidence does not support specific recommendations for choosing inclusion-based analysis based on precision priority, for context sensitivity, SVF, or recent tooling. Engineers should not infer design choices in those areas from this report alone.

## Limitations and Threats to Validity
The evidence base is small. Two sources cannot ground a full synthesis. Source S4 is a lecture note; lecture notes may not be peer-reviewed, and the snippets are truncated, which threatens completeness [S4]. Source S2 is a research paper but may advocate for unification-based analysis, which introduces potential bias in its characterization of inclusion-based analysis as too slow or unification as merely "imprecise" [S2]. The claim "very imprecise" is qualitative and lacks quantitative comparison [S2].

The register lacks sources on SVF, context sensitivity variants, empirical benchmark suites, C-specific failure modes, and any 2023-2026 work. Any inference beyond the two sources is marked as inference, not established fact.

## Open Questions
1. Under what conditions should an inclusion-based Andersen-style analysis be preferred over unification-based analysis for precision? The evidence states Andersen is cubic [S4] and Steensgaard is faster but imprecise [S2], but does not make an explicit recommendation for choosing inclusion-based analysis when precision matters.
2. How does SVF implement Andersen-style analysis, and what are its measured runtime, memory, and precision on standard benchmarks? No admitted evidence answers this.
3. What are the relative precision and cost of call-site, object-sensitivity, and type-sensitivity? No admitted evidence answers this.
4. How do field sensitivity and heap abstraction fail in C under unions, casts, and pointer arithmetic? The evidence only hints at a Java-C difference [S4].
5. What are the significant 2023-2026 advances in points-to analysis? No admitted evidence covers this period.
6. Is the "very imprecise" characterization of unification-based analysis quantitatively valid across benchmark suites? The claim is qualitative [S2].
7. What is the internal mechanism by which unification-based analysis produces imprecision? The evidence states it is "very imprecise" [S2] but does not describe the merging or equivalence-class mechanism.
8. How does inclusion-based analysis model points-to sets internally? The evidence states it is cubic [S4] but does not describe the subset-constraint model.

## Recommended Next Experiments
1. Implement a small Andersen-style inclusion-based analysis and a Steensgaard-style unification-based analysis on the same set of LLVM IR programs. Measure wall-clock time, peak memory, and the size of points-to sets. This would test the cubic-cost claim [S4] and the "very imprecise" claim [S2] with concrete numbers.
2. Add field sensitivity to the Andersen implementation for a Java-like subset and for a C subset with unions and casts. Compare alias precision. This would test whether the Java-C distinction indicated in [S4] produces measurable precision loss in C.
3. Run the Andersen implementation with and without context sensitivity (call-site and object-sensitivity) on a medium benchmark. Measure precision gain and cost. This would fill the context-sensitivity gap in the admitted evidence.
4. Locate and admit SVF documentation and its primary publication. Re-run the synthesis with SVF benchmark numbers to address the framework gap.

## Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Andersen is cubic in program size, worst case | "Andersen's algorithm is cubic in the size of the program, in the worst" | [S4] | Truncated snippet; lecture note, may not be peer-reviewed |
| Cubic cost motivates Steensgaard | "For large programs, a cubic algorithm is too inefficient. Steensgaard pro-" | [S4] | Incomplete sentence; exact motivation not fully captured |
| Unification is faster but very imprecise | "a unification-based analysis is significantly faster than an inclusion-based one at the expense of producing very imprecise results" | [S2] | Qualitative; no quantitative comparison; possible bias toward unification |
| Field sensitivity via field constraints on abstract locations | "We can define a new kind of constraints for fields: ... Now assume that objects (e.g. in Java) are represented by abstract locations l" | [S4] | Rules not provided in snippet; Java-specific framing |
| Field constraints may differ for C | "Java but not for C. We can define a new kind of constraints for fields" | [S4] | Fragmented snippet; distinction unclear |

## Source Register

- [S1] [Comparative Study of Andersen’s and Steensgaard’s](https://thegrenze.com/pages/servej.php?fn=186.pdf&name=Comparative+Study+of+Andersen%E2%80%99s+and+Steensgaard%E2%80%99sApproaches+of+Pointer+Analysis&id=1898&association=GRENZE&journal=GIJET&year=2023&volume=9&issue=2) — rejected, score 11, discovered by `Andersen inclusion-based points-to analysis Steensgaard unification-based comparison`
- [S2] [Unification-based Pointer Analysis without Oversharing](https://arxiv.org/pdf/1906.01706) — admitted, score 16, discovered by `Andersen inclusion-based points-to analysis Steensgaard unification-based comparison`
- [S3] [Points-To Analysis Derek Rayside MIT CSAIL 6.883, Prof Ernst drayside@mit.edu](https://homes.cs.washington.edu/~mernst/teaching/6.883/lectures/points-to.pdf) — rejected, score 11, discovered by `Andersen inclusion-based points-to analysis Steensgaard unification-based comparison`
- [S4] [Lecture Notes: Pointer Analysis 15-819O: Program Analysis Jonathan Aldrich](https://www.cs.cmu.edu/~aldrich/courses/15-819O-13sp/resources/pointer.pdf) — admitted, score 14, discovered by `Andersen inclusion-based points-to analysis Steensgaard unification-based comparison`
- [S5] [An Eﬃcient Inclusion-Based Points-To Analysis for Strictly-Typed Languages](https://suif.stanford.edu/~jwhaley/papers/sas02.pdf) — rejected, score 14, discovered by `Andersen inclusion-based points-to analysis Steensgaard unification-based comparison`

## Research Trace

### Goal

Produce a rigorous technical synthesis of points-to and alias analysis covering foundational algorithms (Andersen, Steensgaard), modern frameworks (SVF), and key precision dimensions (context, field, heap sensitivity), grounded in primary sources and recent advances.

### Subquestions

- What are the formal definitions, complexity, and key algorithmic differences between Andersen's inclusion-based and Steensgaard's unification-based points-to analyses?
- How does SVF implement and extend Andersen-style analysis, and what are its documented performance and precision characteristics on standard benchmarks (e.g., SPEC, SV-Benchmarks)?
- What are the main forms of context sensitivity (call-site, object-sensitivity, type-sensitivity) and what evidence exists for their precision/cost trade-offs in points-to analysis?
- What is field sensitivity, how does it interact with heap abstraction (e.g., allocation-site vs access-path), and what are known limitations in C/C++ with unions, casts, and pointer arithmetic?
- What heap abstraction strategies exist (allocation-site, access-based, flow-insensitive) and how do they affect soundness and scalability?
- What are the most significant recent (2023-2026) advances, critiques, or empirical evaluations of points-to analysis precision and scalability?

### Research Perspectives

- **Primary sources / foundational algorithms** — Locate and summarize the original Andersen and Steensgaard papers and their formal definitions, complexity bounds, and algorithmic structure.
- **Implementation / framework** — Examine SVF's architecture, documentation, and source to understand how modern inclusion-based analysis is engineered and optimized.
- **Precision dimensions** — Analyze context sensitivity, field sensitivity, and heap abstraction as independent precision axes, with evidence on their individual and combined effects.
- **Benchmarks / evaluation** — Find empirical studies comparing analyses on standard benchmark suites, including precision metrics and runtime/memory costs.
- **Criticism / counterevidence** — Surface limitations, unsoundnesses, and critiques of points-to analysis, including cases where analyses fail or degrade (e.g., C idioms, reflection, dynamic loading).
- **Recency / state of the art** — Identify 2023-2026 advances such as ML-guided analysis, demand-driven points-to, GPU-accelerated analysis, or new context-sensitivity variants.

### Source Requirements

- Original Andersen (1994) and Steensgaard (1996) papers or authoritative reproductions
- SVF official documentation, GitHub repository, and associated publications (e.g., Sui & Xue)
- LLVM-based points-to analysis literature (e.g., DSA, CFL-Anderson, Flow-sensitive variants)
- Empirical evaluation papers on context/field/heap sensitivity trade-offs
- Recent (2023-2026) papers from PLDI, POPL, OOPSLA, ASE, ICSE, ISSTA on points-to analysis
- Benchmark suites: SPEC CPU, SV-Benchmarks, DaCapo, pointer analysis benchmarks
- Critiques or empirical studies documenting unsoundness or precision failures

### Success Criteria

- Report includes formal or semi-formal description of Andersen vs Steensgaard algorithms with complexity and precision trade-offs.
- Report cites SVF primary documentation and at least one SVF-related publication with benchmark numbers.
- Report distinguishes context sensitivity variants (call-site, object, type) with evidence on relative precision/cost.
- Report explains field sensitivity and heap abstraction with at least one concrete example of failure mode (e.g., union, cast, pointer arithmetic).
- Report includes at least two recent (2023-2026) references or explicitly notes their absence.
- Report identifies at least one known limitation or unsoundness of mainstream points-to analyses.

### Search Queries

- `Andersen inclusion-based points-to analysis Steensgaard unification-based comparison` — Find primary or authoritative secondary sources comparing the two foundational algorithms. [Primary sources / foundational algorithms / paper]
- `SVF static value-flow analysis LLVM documentation github` — Locate SVF's official docs, repo, and implementation details for Andersen-style analysis. [Implementation / framework / docs/repo]
- `context sensitivity field sensitivity heap abstraction points-to analysis precision evaluation` — Find empirical studies on precision dimensions and their trade-offs. [Precision dimensions / paper]
- `points-to analysis limitations unsoundness C pointer arithmetic unions 2024 2025` — Surface critiques and failure modes, plus recent advances. [Criticism / counterevidence / paper]

### Source Quality

- [S1] Fetch error (403) prevents reading; title suggests a comparative study but cannot verify quality or content. score=11 type=paper admitted=false warnings=Fetch error: HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S2] ArXiv paper on unification-based pointer analysis without oversharing; directly compares Andersen and Steensgaard, relevant to foundational algorithms and precision trade-offs. PDF is readable despite binary content. score=16 type=paper admitted=true warnings=
- [S3] Lecture slides from MIT/CSAIL; provides comparison of Andersen vs Steensgaard but is a secondary teaching resource, not a primary source. PDF is readable but content is limited. score=11 type=paper admitted=false warnings=Secondary source (lecture slides); Limited depth
- [S4] Lecture notes from CMU by Jonathan Aldrich; covers Andersen and Steensgaard algorithms, field constraints, and complexity. Authoritative academic source, though not a primary research paper. score=14 type=paper admitted=true warnings=Secondary source (lecture notes); Dated (2013)
- [S5] Fetch error prevents reading; title suggests an efficient inclusion-based points-to analysis for strictly-typed languages, likely relevant to Andersen-style analysis. Cannot verify content. score=14 type=paper admitted=false warnings=Fetch error: failed HTTP request; fetch failed: failed HTTP request: error sending request for url (https://suif.stanford.edu/~jwhaley/papers/sas02.pdf)

### Evidence Notes

- [S2] Unification-based (Steensgaard-style) analysis is significantly faster than inclusion-based (Andersen-style) analysis but produces very imprecise results. Evidence: a unification-based analysis is significantly faster than an inclusion-based one at the expense of producing very imprecise results. Limitations: The claim is qualitative ('very imprecise') and from a paper that may advocate for unification-based analysis; no quantitative comparison given.
- [S4] Andersen's inclusion-based algorithm has worst-case cubic time complexity in program size. Evidence: that Andersen’s algorithm is cubic in the size of the program, in the worst ... Limitations: The snippet is truncated; full context not available. Lecture notes may not be peer-reviewed.
- [S4] For large programs, the cubic complexity of Andersen's algorithm is too inefficient, motivating Steensgaard's unification-based approach. Evidence: For large programs, a cubic algorithm is too inefficient. Steensgaard pro- Limitations: Incomplete sentence; the exact motivation is not fully captured.
- [S4] Field sensitivity can be modeled by defining field constraints on abstract locations representing objects, with specific processing rules. Evidence: We can define a new kind of constraints for fields: ... Now assume that objects (e.g. in Java) are represented by abstract locations l. We can process field constraints with the following rules: Limitations: The actual rules are not provided in the snippet; only the idea is mentioned. Also, it is specific to Java, not C/C++.
- [S4] The lecture notes discuss pointer analysis for Java but note that field constraints may differ for C. Evidence: Java but not for C. We can define a new kind of constraints for fields: Limitations: The snippet is fragmented; the exact distinction is not clear.

### Claim Verification

- **supported**: Andersen's algorithm is cubic in program size, worst case. — Evidence from S4 directly states that Andersen's algorithm is cubic in program size in the worst case.
- **supported**: Cubic cost motivates Steensgaard. — Evidence from S4 indicates that cubic inefficiency for large programs motivated Steensgaard's approach.
- **supported**: Unification-based analysis is significantly faster than inclusion-based analysis but produces very imprecise results. — Evidence from S2 directly supports the claim about speed and imprecision trade-off.
- **supported**: Field sensitivity is modeled by field constraints on abstract locations representing objects. — Evidence from S4 describes field constraints on abstract locations representing objects.
- **supported**: Field constraints as described fit Java-style object models and may not transfer directly to C. — Evidence from S4 notes that field constraints are for Java and not for C, implying limited transferability.

### Final Evaluation

- coverage: 3/5
- citation_quality: 2/5
- factuality: 4/5
- analysis_depth: 3/5
- presentation: 3/5
- overall: 3/5

Strengths:
- Explicitly and transparently acknowledges gaps in evidence instead of fabricating information.
- Provides clear, source-grounded comparison of Andersen vs Steensgaard with limitations noted.
- Includes a useful evidence table summarizing claims, sources, and limitations.
- Discusses field sensitivity and heap abstraction with direct reference to admitted sources.
- Open questions and recommended next experiments show careful reasoning about what is unknown.

Weaknesses:
- Coverage is incomplete: fails to address context sensitivity, SVF framework, and recent (2023-2026) advances as planned.
- Citation quality is low: only two sources (S2 and S4), one a lecture note with truncated snippets, no SVF documentation or recent papers.
- Analysis depth is limited: does not explain mechanisms (e.g., subset constraints vs. unification), no comparison of context sensitivity variants, no discussion of heap abstraction strategies or failure modes in C.
- Presentation reads more like a meta-analysis of evidence gaps than a scientific short paper; lacks technical depth in explaining algorithms.
- No evidence tables for comparison of context sensitivity or heap abstraction strategies (as would be expected).
- Follow-up recommendations are generic and not actionable beyond 'locate SVF documentation'.

Follow-up recommendations:
- Admit at least one SVF primary source (e.g., Sui & Xue PLDI 2016) and include its benchmark numbers and architecture description.
- Admit one or two recent (2023-2026) papers on context sensitivity or ML-guided analysis to meet the recency criterion.
- Expand the report to include mechanism-level explanations of Andersen and Steensgaard algorithms (e.g., constraint graphs, union-find).
- Add a section comparing context sensitivity variants with quantitative evidence on precision/cost trade-offs.
- Include a concrete example of field sensitivity failure in C (e.g., union type punning or pointer arithmetic).
