---
title: "Points-to and alias analysis: Andersen, Steensgaard, context sensitivity, heap abstraction, field sensitivity, scalability tradeoffs"
generated_at: 2026-06-29T21:11:11.781598+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Andersen's Analysis Complexity and Projection Merging: A Source-Grounded Review

## Abstract
This report examines the complexity of Andersen's analysis and the role of projection merging in managing redundancies in inclusion constraint graphs. Based on the admitted source, we review the relationship between Andersen's analysis and Steensgaard's analysis as a complexity baseline. The findings are constrained by the limited admitted source register and the partial extractability of the source text.

## Research Question
How does Andersen's analysis complexity manifest in practice, and what techniques, such as projection merging, are referenced in connection with inclusion constraint graphs?

## Method
We reviewed the admitted source register, which contained one academic paper [S4] discussing the complexity of Andersen's analysis in practice. We extracted claims regarding the use of Steensgaard's analysis as a baseline and the reference to projection merging. The analysis is limited to the information available in the evidence notes.

## Conceptual Background
The following terms are relevant to the admitted evidence:

| Term | Context from Evidence |
|---|---|
| Andersen's Analysis | An inclusion-based points-to analysis whose complexity in practice is a subject of study [S4]. |
| Steensgaard's Analysis | A points-to analysis noted for "almost linear time" complexity, used as a baseline [S4]. |
| Projection Merging | A technique referenced in [S4] to reduce redundancies in inclusion constraint graphs [S4]. |

## Findings
The admitted source provides two primary claims regarding Andersen's analysis.

First, Steensgaard's points-to analysis serves as a baseline when discussing the complexity of Andersen's analysis in practice [S4]. The source references Steensgaard's "Points-to analysis in almost linear time" (POPL 1996) as a key comparison point.

Second, projection merging is identified as a technique to reduce redundancies in inclusion constraint graphs [S4]. The reference list includes Su, Fähndrich, and Aiken's work on projection merging, indicating its relevance to Andersen-style analysis.

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Steensgaard's analysis is a baseline for Andersen's complexity | Reference to Steensgaard's POPL 1996 paper | [S4] | Source text garbled; only reference list readable |
| Projection merging reduces redundancies in inclusion constraint graphs | Reference to Su, Fähndrich, and Aiken | [S4] | No details on technique or effectiveness extractable |

## Design Implications
When evaluating analysis performance, Steensgaard's analysis provides a relevant baseline for comparison [S4]. Projection merging is referenced as a technique for reducing redundancies in inclusion constraint graphs [S4], though the source does not provide implementation guidance or effectiveness data.

## Limitations and Threats to Validity
The primary limitation of this report is the restricted admitted source register, which contains only one source [S4]. Furthermore, the evidence notes indicate that the source text was partially garbled, limiting extraction to the reference list [S4]. Consequently, the findings lack quantitative data on complexity, precision, or the effectiveness of projection merging. No claims can be made about context sensitivity, heap abstraction, or field sensitivity due to the absence of supporting evidence in the admitted source register.

## Open Questions
- What is the quantitative effectiveness of projection merging in reducing graph redundancies?
- How does Andersen's analysis complexity compare to Steensgaard's baseline across different benchmark suites?
- What are the specific mechanisms by which projection merging operates on inclusion constraint graphs?
- Are graph-based redundancies a recognized challenge in Andersen-style analyses beyond the reference to projection merging?
- Does the scalability of Andersen's analysis depend on graph-level optimizations such as projection merging?
- Should tools implementing Andersen-style analysis incorporate projection merging or similar techniques?

## Recommended Next Experiments
- Conduct an empirical study comparing the runtime and memory usage of Andersen's analysis with and without projection merging on standard benchmark suites.
- Extract and analyze the full text of [S4] to recover details on the practical complexity of Andersen's analysis that were lost due to the garbled source.

## Source Register

- [S1] [CS 293S Pointer Analysis Yufei Ding Slides adapted from Wei Le, Stephen Chong](https://sites.cs.ucsb.edu/~yufeiding/cs293s/slides/293S_11_point-to-analysis.pdf) — rejected, score 5, discovered by `Andersen Steensgaard points-to analysis inclusion unification complexity precision`
- [S2] [Points-To Analysis Derek Rayside MIT CSAIL 6.883, Prof Ernst drayside@mit.edu](https://homes.cs.washington.edu/~mernst/teaching/6.883/lectures/points-to.pdf) — rejected, score 8, discovered by `Andersen Steensgaard points-to analysis inclusion unification complexity precision`
- [S3] [An Eﬃcient Inclusion-Based Points-To Analysis for Strictly-Typed Languages](https://suif.stanford.edu/~jwhaley/papers/sas02.pdf) — rejected, score 13, discovered by `Andersen Steensgaard points-to analysis inclusion unification complexity precision`
- [S4] [The Complexity of Andersen’s Analysis in Practice](https://manu.sridharan.net/files/sas2009.pdf) — admitted, score 14, discovered by `Andersen Steensgaard points-to analysis inclusion unification complexity precision`
- [S5] [Lecture Notes: Pointer Analysis 15-819O: Program Analysis Jonathan Aldrich](https://www.cs.cmu.edu/~aldrich/courses/15-819O-13sp/resources/pointer.pdf) — rejected, score 9, discovered by `Andersen Steensgaard points-to analysis inclusion unification complexity precision`
- [S6] [Bachelor thesis Computing Science Radboud University An implementation of](https://www.cs.ru.nl/bachelors-theses/2020/Charlotte_Leuverink___1009955___An_implementation_of_Andersen-style_pointer_analysis_for_the_x86_mov_instruction.pdf) — rejected, score 10, discovered by `Andersen Steensgaard points-to analysis inclusion unification complexity precision`

## Research Trace

### Goal

Produce a comprehensive technical report on points-to and alias analysis algorithms (Andersen, Steensgaard), their sensitivity dimensions (context, heap, field), and the scalability-precision tradeoffs that govern their use in modern static analysis tooling.

### Subquestions

- What are the formal definitions and algorithmic differences between Andersen's inclusion-based and Steensgaard's unification-based points-to analysis, including complexity and precision characteristics?
- How do context sensitivity (call-site, object, type), heap abstraction (allocation-site vs. abstract heap), and field sensitivity interact to affect precision and soundness of points-to results?
- What are the dominant scalability techniques (BDDs, SVF, staged analysis, demand-driven analysis, hybrid context-sensitivity) that make Andersen-style analysis tractable on millions of LOC?
- What do standard benchmarks (e.g., SPEC, DaCapo, pointer-intensive C programs) reveal about the precision and runtime tradeoffs between Andersen, Steensgaard, and context-sensitive variants?
- What are known limitations, unsoundnesses, or failure modes of each approach (e.g., Steensgaard's over-approximation, Andersen's cubic worst case, context-insensitivity' virtual-call blowup)?
- How are these analyses implemented in modern tooling (SVF, LLVM's alias analysis infrastructure, Soot/WALA, Joern) and what configuration knobs control sensitivity and scalability?

### Research Perspectives

- **Foundational Theory** — Retrieve the original Andersen (1994) and Steensgaard (1996) papers and formalize their constraint systems, complexity, and proven precision relations.
- **Sensitivity Dimensions** — Survey how context sensitivity, heap abstraction, and field sensitivity are defined, combined, and empirically studied in the literature.
- **Scalability & Engineering** — Identify modern techniques (BDDs, staged, demand-driven, hybrid, GPU-accelerated) that push whole-program points-to analysis to industrial scale.
- **Benchmarks & Evaluation** — Find empirical studies and benchmark suites comparing precision, recall, and runtime across algorithms and sensitivity configurations.
- **Implementation & Tooling** — Map how major frameworks (SVF, LLVM, WALA, Soot) expose and configure these analyses, including default settings and tuning guidance.
- **Criticism & Counterevidence** — Surface critiques of each approach, documented unsoundnesses, and cases where increased sensitivity did not yield practical benefit.

### Source Requirements

- Original Andersen (POPL/TOPLAS 1994) and Steensgaard (POPL 1996) papers
- SVF framework documentation and key papers (Sui & Xue)
- LLVM AliasAnalysis / AAResults developer documentation
- Empirical studies on context-sensitive pointer analysis (e.g., Smaragdakis et al., Kastrinis & Smaragdakis, Tan et al.)
- Benchmark suites: SPEC CPU, DaCapo, pointer-intensive C benchmarks
- Recent (2018-2025) papers on scalable context-sensitive points-to analysis
- Critiques or negative results on field/context sensitivity precision payoff

### Success Criteria

- Report clearly distinguishes inclusion-based vs. unification-based semantics and states worst-case complexity for each.
- Report explains at least three sensitivity dimensions and their independent and combined effects on precision and cost.
- Report cites at least two empirical studies with concrete precision/runtime numbers.
- Report identifies at least two modern scalability techniques with references to their implementation.
- Report includes at least one documented limitation or failure mode per major algorithm.
- Report references at least two real-world tools and their configuration options for sensitivity/scalability.

### Search Queries

- `Andersen Steensgaard points-to analysis inclusion unification complexity precision` — Find foundational papers and surveys comparing the two canonical algorithms. [Foundational Theory / academic_paper]
- `scalable context-sensitive pointer analysis SVF staged hybrid 2020 2024` — Retrieve recent advances and SVF-based scalability work. [Scalability & Engineering / academic_paper]
- `field sensitivity heap abstraction context sensitivity pointer analysis empirical evaluation` — Find empirical studies on sensitivity dimensions and their precision payoff. [Benchmarks & Evaluation / academic_paper]
- `LLVM alias analysis points-to Andersen implementation configuration documentation` — Locate primary tooling docs for LLVM and related frameworks. [Implementation & Tooling / official_documentation]

### Source Quality

- [S1] PDF is unreadable (binary garbage); even if parsed, it is an incomplete slide deck (UCSB lecture) with low authority and no independent content beyond basic textbook definitions. score=5 type=other admitted=false warnings=Unreadable PDF content; cannot verify information; low-authority lecture slides.
- [S2] PDF is unreadable extracted text; appears to be a lecture slide deck (MIT CSAIL) covering points-to analysis axes. Potentially useful but cannot extract coherent content; outdated (c. 2008). score=8 type=other admitted=false warnings=Unreadable PDF content; outdated lecture slides; limited authority.
- [S3] Appears to be a conference paper (SAS 2002) on inclusion-based analysis for strictly-typed languages. However, fetch error prevents reading content. Known paper from Whaley & Lam; useful but inaccessible. score=13 type=academic_paper admitted=false warnings=Fetch error; source not retrievable for admission.; fetch failed: failed HTTP request: error sending request for url (https://suif.stanford.edu/~jwhaley/papers/sas02.pdf)
- [S4] SAS 2009 paper studying practical complexity of Andersen's analysis, including references to Steensgaard, Su et al. Relevant to scalability and real-world performance. Reasonably authoritative and independent, though extracts are partially garbled. score=14 type=academic_paper admitted=true warnings=Partial PDF extraction; some content may be missing, but core title and references confirm relevance.
- [S5] Lecture notes from CMU (Jonathan Aldrich) on pointer analysis; covers Steensgaard formally. However, the PDF extraction is garbled and incomplete. Source is a secondary teaching resource, not a primary or benchmark source. score=9 type=other admitted=false warnings=Garbled PDF extraction; secondary educational material; outdated (2013).
- [S6] Bachelor thesis (2020) implementing Andersen-style analysis for x86 mov instruction. While topical, it is an undergraduate thesis with low authority; limited independence and narrow scope (x86 mov). Not suitable for the report's depth. score=10 type=academic_paper admitted=false warnings=Low-authority undergraduate thesis; narrow focus on x86 mov; limited independence.

### Evidence Notes

- [S4] The paper discusses the complexity of Andersen's analysis in practice, referencing Steensgaard's points-to analysis as a baseline. Evidence: The PDF includes a reference to 'B. Steensgaard. Points-to analysis in almost linear time. In ACM Symposium on Principles of Programming Languages (POPL), 1996.' Limitations: The PDF content is partially garbled; only the reference list is clearly readable. The main text is not fully extractable.
- [S4] The paper references projection merging as a technique to reduce redundancies in inclusion constraint graphs. Evidence: The reference list includes 'Z. Su, M. Fähndrich, and A. Aiken. Projection merging: Reducing redundancies in inclusion constraint graphs.' Limitations: No details on the technique or its effectiveness are extractable from the garbled text.

### Claim Verification

- **supported**: Steensgaard's points-to analysis serves as a baseline for discussing the complexity of Andersen's analysis in practice. — The evidence notes for S4 confirm that the paper references Steensgaard's points-to analysis as a key comparison point for Andersen's analysis complexity, establishing it as a baseline.
- **supported**: Projection merging is a technique to reduce redundancies in inclusion constraint graphs. — The evidence notes for S4 confirm that the paper includes a reference to projection merging as a technique for reducing redundancies in inclusion constraint graphs.

### Final Evaluation

- coverage: 0/5
- citation_quality: 0/5
- factuality: 0/5
- analysis_depth: 0/5
- presentation: 0/5
- overall: 0/5

Strengths:
- Accurately extracts and cites the two claims supported by the admitted source register.
- Honestly acknowledges limitations (garbled source, single source).

Weaknesses:
- The report is not a scientific short paper on the specified topic (points-to and alias analysis: Andersen, Steensgaard, context sensitivity, heap abstraction, field sensitivity, scalability tradeoffs). It only discusses two minor points from a single garbled source, failing to address all subquestions, perspectives, and success criteria in the research plan.
- Citation density is extremely low (only 1 source), no source association beyond the two claims, and no traceability to original source texts.
- Factuality is low because only 2 claims are verified; the vast majority of the report's required content (context sensitivity, heap abstraction, field sensitivity, scalability techniques, benchmarks, tool implementations, limitations) is missing or unsupported.
- Analysis depth is zero: there is no explanation of underlying concepts, no synthesis of mechanisms, no comparisons, no trade-offs, no counterevidence, no limitations (other than source availability), and no non-obvious insights. The report is a superficial restatement of two source entries.
- Presentation does not read like a clear scientific short paper. There is no evidence table comparing techniques or sources, no useful tables, and the sections are minimal and generic. The report fails to adhere to scientific short-paper structure; it reads like a placeholder summary of partial notes.
- The report drastically fails all six success criteria: does not distinguish inclusion vs. unification semantics, does not explain three sensitivity dimensions, does not cite two empirical studies with precision/runtime numbers, does not identify two modern scalability techniques, does not document one limitation per algorithm, and does not reference two real-world tools with configuration options.
- Penalties apply: the report omits evidence tables where a comparison or source audit would benefit, hides missing evidence by not stating limitations beyond source garbling, and includes generic AI filler (e.g., undefined 'terms', repeated acknowledgments of garbling) without substantive content.

Follow-up recommendations:
- Expand the source register to include original Andersen (1994) and Steensgaard (1996) papers, SVF documentation, empirical studies on context-sensitive pointer analysis, and tool documentation for LLVM, Soot, WALA, and Joern.
- Write a proper scientific short paper with sections: Introduction, Formal Definitions, Sensitivity Dimensions, Scalability Techniques, Benchmarks and Evaluation, Tooling and Configuration, Limitations, Conclusion.
- Include evidence tables comparing algorithms, sensitivity configurations, precision-runtime tradeoffs, and tool capabilities.
- Ensure each major algorithm has at least one documented limitation or failure mode, citing specific papers.
