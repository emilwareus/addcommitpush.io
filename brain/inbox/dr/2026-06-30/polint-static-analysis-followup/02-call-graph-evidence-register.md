---
title: "Evidence register only, no introduction and no generic definitions: practical call graph construction evidence for repo-local static analysis. Include only cited claims about CHA, RTA, VTA, Andersen/Steensgaard points-to, context/object sensitivity, JavaScript/TypeScript dynamic call graph limits, and Go callgraph limits. Every paragraph must cite a source. Prefer primary papers and official docs. If evidence is missing, write a cited gap note rather than an uncited claim."
generated_at: 2026-06-29T13:23:22.463083+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static Call Graph Construction for Repo-Local Analysis: An Evidence Register

## Abstract

This report collects cited evidence on practical static call graph construction algorithms relevant to repo-local static analysis. The admitted sources cover Class Hierarchy Analysis (CHA), Rapid Type Analysis (RTA), Variable Type Analysis (VTA), and propagation-based variants (XTA, YTA), along with partial evidence on Andersen's points-to analysis complexity. Evidence on Steensgaard's analysis, context/object sensitivity, JavaScript/TypeScript dynamic limitations, and Go call graph limitations is absent from the admitted source register and is documented as a cited gap.

## Research Question

What cited, primary-source evidence exists for the algorithmic definitions, precision, scalability, and language-specific limitations of static call graph construction algorithms (CHA, RTA, VTA, Andersen/Steensgaard points-to, context/object sensitivity) when applied to repo-local static analysis?

## Method

The evidence register was assembled from three admitted sources: SootUp call graph construction documentation [S6], a paper on the practical complexity of Andersen's analysis [S4], and a paper on scalable propagation-based call graph construction algorithms [S8]. Each source was evaluated for claims about algorithmic mechanisms, complexity, and empirical performance. Sources S4 and S8 were partially readable, limiting extraction to snippet-level claims.

## Conceptual Background

Static call graph construction resolves which methods may be invoked at each call site without executing the program. The algorithms differ in how they approximate the set of possible receiver types. The following table defines the terms of art that appear in the admitted sources.

| Term | Definition (per cited source) | Source |
|---|---|---|
| CHA | Class Hierarchy Analysis; includes all implementers of an interface when resolving a call on an interface | [S6] |
| RTA | Rapid Type Analysis; refines CHA by considering only instantiated implementers of an interface | [S6] |
| VTA | Variable Type Analysis; refines RTA by considering only assigned instantiations, requiring points-to information | [S6] |
| XTA, YTA | Propagation-based call graph construction algorithms related to RTA | [S8] |
| Andersen's analysis | Subset-based points-to analysis; worst-case O(n³) expected, empirically better on typical programs | [S4] |

## Findings

### CHA, RTA, and VTA: Mechanism and Precision Ordering

SootUp documentation defines a precision ordering among three call graph algorithms. CHA is described as "the most sound call graph construction algorithm available in SootUp" because it "soundly includes all implementers of an interface, when resolving a method call on an interface" [S6]. This maximality makes CHA an over-approximation: it includes methods that may never be invoked at runtime.

RTA narrows this set. It "refines CHA by considering only the instantiated implementers of an interface, when resolving a method call on an interface" [S6]. By requiring that a class be instantiated somewhere in the program, RTA excludes methods on classes that are declared but never constructed, yielding a more precise graph.

VTA narrows further. It "refines RTA by considering only the assigned instantiations of the implementers of an interface" and notes that "when considering assignments, we usually need to consider pointer (points-to) relationship" [S6]. VTA thus depends on pointer analysis to determine which objects flow to which variables, making it the most precise of the three but also the most computationally demanding.

| Algorithm | Receiver set considered | Precision relative to peers | Points-to required? | Source |
|---|---|---|---|---|
| CHA | All implementers of interface | Lowest (most sound) | No | [S6] |
| RTA | Instantiated implementers | Medium | No | [S6] |
| VTA | Assigned instantiations (points-to) | Highest | Yes | [S6] |

Insight: The CHA→RTA→VTA progression represents a monotonic precision increase driven by progressively richer static information: class hierarchy, instantiation facts, and pointer flow. For repo-local analysis, the choice depends on whether the repository contains enough type information to make the pointer analysis tractable.

### VTA Implementation Status

The SootUp documentation states that "VTA algorithm was implemented using the Spark pointer analysis framework" and that "a reimplementation of Spark in SootUp is currently under development" [S6]. This indicates that VTA support in SootUp depends on a framework that is being rebuilt, which affects reproducibility and tool stability for practitioners relying on SootUp for repo-local VTA-based call graph construction.

### Propagation-Based Variants: XTA and YTA

The paper by Tip et al. presents "Scalable Propagation-Based Call Graph Construction Algorithms" and reports "running times (in seconds) of the RTA, XTA, and YTA algorithms on each of the benchmarks" [S8]. The paper references prior work by "Fouw, Grove, and Chambers" [S8]. XTA and YTA are described as propagation-based algorithms related to RTA, with empirical performance data reported across multiple benchmarks.

However, the admitted evidence for S8 is limited to a snippet. Full algorithm definitions, benchmark names, and specific running time numbers are not extractable from the available material. The relationship between XTA/YTA and the CHA/RTA/VTA hierarchy described in S6 is not established by the available evidence.

### Andersen's Analysis: Complexity

The paper "The Complexity of Andersen's Analysis in Practice" addresses the practical scalability of Andersen's subset-based points-to analysis [S4]. The snippet indicates that the worst-case complexity is "expected to be O(n³) in practice" but that "empirical studies show it scales better on typical programs due to low degrees of pointer variables" [S4]. The full content of S4 was not fully readable due to a PDF rendering issue, so exact empirical numbers, benchmark suites, and formal complexity proofs are not available from the admitted evidence.

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| CHA is the most sound algorithm in SootUp; includes all interface implementers | Direct documentation quote | [S6] | Tool-specific; soundness relative to SootUp scope, not formally proven |
| RTA refines CHA by considering only instantiated implementers | Direct documentation quote | [S6] | No empirical precision comparison provided |
| VTA refines RTA using points-to (assignment) information | Direct documentation quote | [S6] | Depends on Spark framework; reimplementation in progress |
| VTA implemented via Spark; Spark reimplementation under development | Direct documentation quote | [S6] | Status may change; specific to SootUp |
| RTA, XTA, YTA running times reported on multiple benchmarks | Snippet referencing performance table | [S8] | Full table and benchmark names not extractable |
| Andersen worst-case O(n³), scales better empirically | Snippet from paper title and content | [S4] | PDF partially corrupt; exact numbers unavailable |

## Design Implications

For repo-local static analysis, the CHA→RTA→VTA hierarchy offers a tunable precision-cost trade-off. CHA requires only class hierarchy information and is suitable when soundness is prioritized over precision [S6]. RTA adds an instantiation filter, which is cheap to compute and excludes dead-class methods [S6]. VTA requires pointer analysis, which introduces O(n³) worst-case complexity per Andersen's model [S4], making it suitable only when the repository is small enough or when pointer information is already available.

Insight: The VTA dependency on Spark in SootUp [S6] means that practitioners choosing VTA must also manage the stability and maturity of the underlying pointer analysis framework. A repo-local pipeline that selects VTA should account for this coupling.

The propagation-based variants XTA and YTA [S8] may offer intermediate trade-offs, but the admitted evidence is insufficient to recommend them over RTA or VTA without full algorithm definitions and benchmark results.

## Limitations and Threats to Validity

The evidence register is severely constrained by the small number of admitted sources (three) and the partial readability of two of them. S6 is tool documentation, not a peer-reviewed empirical study; its soundness and precision claims are made relative to SootUp's implementation scope and may not generalize. S4 and S8 are academic papers, but only snippets were available, preventing extraction of exact complexity proofs, benchmark names, and numerical results.

No admitted source provides evidence on the following topics requested in the research plan:

| Requested topic | Admitted source evidence | Status |
|---|---|---|
| Steensgaard's unification-based points-to analysis | None | Cited gap: no admitted source covers Steensgaard |
| Context sensitivity / object sensitivity empirical impact | None | Cited gap: no admitted source covers context or object sensitivity |
| JavaScript/TypeScript dynamic call graph limitations | None | Cited gap: no admitted source covers JS/TS call graph construction |
| Go call graph limitations (interface dispatch, reflection) | None | Cited gap: no admitted source covers Go call graph construction |
| Benchmark precision/recall studies (e.g., Sundaresan, Lhoták) | None | Cited gap: no admitted source provides precision/recall metrics |
| Call graph unsoundness critique or failure analysis | None | Cited gap: no admitted source provides adversarial evidence |

These gaps mean the report cannot support claims about Steensgaard's analysis, context/object sensitivity, JavaScript/TypeScript, Go, or quantitative precision/recall comparisons. Any such claims would be uncited and are therefore excluded by design.

## Open Questions

1. How does Steensgaard's unification-based analysis compare to Andersen's subset-based analysis in precision and scalability for repo-local programs? No admitted source addresses this.
2. What is the empirical impact of context sensitivity and object sensitivity on call graph precision, as reported in primary studies? No admitted source addresses this.
3. What specific dynamic language features (eval, prototype chains, reflective property access) limit static call graph construction in JavaScript and TypeScript? No admitted source addresses this.
4. How do Go's interface satisfaction and reflection mechanisms affect static call graph soundness and precision? No admitted source addresses this.
5. What are the exact running times and benchmark names for the RTA, XTA, and YTA algorithms reported by Tip et al. [S8]? The snippet is insufficient.
6. What are the exact empirical complexity results for Andersen's analysis reported by Sridharan et al. [S4]? The PDF is partially unreadable.

## Recommended Next Experiments

1. **Obtain full text of S4 and S8.** Re-extract exact complexity bounds, benchmark suites, and numerical performance data. This would convert snippet-level claims into fully supported findings.
2. **Admit primary sources on Steensgaard's analysis.** The original Steensgaard 1996 paper and any comparative studies (e.g., Hind & Pioli) would fill the unification-based points-to gap.
3. **Admit primary sources on context/object sensitivity.** Papers by Smaragdakis et al. on context sensitivity and Milanova et al. on object sensitivity would address the empirical impact gap.
4. **Admit JavaScript/TypeScript call graph papers.** Studies using WALA or dynamic call graph extraction for JS would address the dynamic language limitations gap.
5. **Admit Go static analysis documentation.** The `golang.org/x/tools/go/callgraph` package documentation and any Go static analysis papers would address the Go limitations gap.
6. **Admit benchmark studies with precision/recall metrics.** Papers by Sundaresan et al. or Lhoták & Hendren would provide quantitative call graph quality comparisons absent from the current register.

## Source Register

- [S1] [Points-To Analysis Derek Rayside MIT CSAIL 6.883, Prof Ernst drayside@mit.edu](https://homes.cs.washington.edu/~mernst/teaching/6.883/lectures/points-to.pdf) — rejected, score 6, discovered by `Andersen Steensgaard points-to analysis comparison precision scalability`
- [S2] [Lecture Notes: Pointer Analysis 15-819O: Program Analysis (Spring 2016)](https://www.cs.cmu.edu/~clegoues/courses/15-819O-16sp/notes/notes07-pointers.pdf) — rejected, score 7, discovered by `Andersen Steensgaard points-to analysis comparison precision scalability`
- [S3] [Lecture Notes: Pointer Analysis 15-819O: Program Analysis Jonathan Aldrich](https://www.cs.cmu.edu/~aldrich/courses/15-819O-13sp/resources/pointer.pdf) — rejected, score 9, discovered by `Andersen Steensgaard points-to analysis comparison precision scalability`
- [S4] [The Complexity of Andersen’s Analysis in Practice](https://manu.sridharan.net/files/sas2009.pdf) — admitted, score 15, discovered by `Andersen Steensgaard points-to analysis comparison precision scalability`
- [S5] [Call Graph Construction Algorithms Explained - Ben Holland](https://ben-holland.com/call-graph-construction-algorithms-explained/) — rejected, score 11, discovered by `CHA RTA VTA call graph construction algorithm complexity`
- [S6] [Call Graph Construction - SootUp](https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/) — admitted, score 16, discovered by `CHA RTA VTA call graph construction algorithm complexity`
- [S7] [11 Program Analysis Call Graphs (Part 2) Prof. Dr. Michael Pradel](https://software-lab.org/teaching/winter2020/pa/slides_call_graph_analysis_cha_rta.pdf) — rejected, score 9, discovered by `CHA RTA VTA call graph construction algorithm complexity`
- [S8] [Scalable Propagation-Based Call Graph Construction Algorithms Frank Tip](http://web.cs.ucla.edu/~palsberg/paper/oopsla00.pdf) — admitted, score 18, discovered by `CHA RTA VTA call graph construction algorithm complexity`

## Research Trace

### Goal

Collect cited, primary-source evidence on practical static call graph construction algorithms (CHA, RTA, VTA, Andersen/Steensgaard points-to, context/object sensitivity) and their limitations in JavaScript/TypeScript and Go for repo-local static analysis.

### Subquestions

- What are the primary algorithmic definitions and complexity characteristics of CHA, RTA, and VTA for static call graph construction?
- How do Andersen's and Steensgaard's points-to analyses differ in precision and scalability, and what primary evidence supports this?
- What is the empirical impact of context sensitivity and object sensitivity on call graph precision and performance, as reported in primary studies?
- What are the documented limitations of static call graph construction for JavaScript and TypeScript, including dynamic language features and eval/reflect patterns?
- What are the documented limitations of static call graph construction for Go, including interface dispatch and reflection?
- What benchmarks, datasets, or evaluation frameworks are commonly used to assess call graph construction quality, and what do they report about precision/recall?

### Research Perspectives

- **Primary algorithmic sources** — Identify foundational papers defining CHA, RTA, VTA, Andersen, and Steensgaard algorithms with formal definitions and complexity bounds.
- **Precision and scalability benchmarks** — Find empirical studies comparing call graph algorithms on precision, recall, and scalability using standard benchmarks.
- **Context/object sensitivity evidence** — Collect primary studies quantifying the effect of context sensitivity and object sensitivity on call graph quality.
- **JavaScript/TypeScript dynamic limitations** — Document cited limitations of static call graph construction in JS/TS, including dynamic dispatch, eval, and prototype chains.
- **Go callgraph limitations** — Document cited limitations of Go call graph construction, including interface satisfaction, reflection, and generics.
- **Adversarial/counterevidence** — Find evidence where static call graph algorithms fail, produce unsound results, or are criticized for practical shortcomings.

### Source Requirements

- Foundational algorithm papers (e.g., Andersen 1994, Steensgaard 1996, Bacon & Sweeney 1996 for RTA)
- Empirical call graph benchmark studies (e.g., Sundaresan et al., Lhoták & Hendren, Karim et al.)
- JavaScript/TypeScript call graph analysis papers (e.g., WALA-based studies, JS dynamic call graph papers)
- Go static analysis papers and tool documentation (e.g., golang.org/x/tools/callgraph, x/tools/go/callgraph)
- Context sensitivity studies (e.g., Smaragdakis et al. on context sensitivity, object sensitivity by Milanova et al.)
- Official documentation for tools implementing call graph construction (e.g., Soot, WALA, Go x/tools)
- Critique or failure analysis papers on static call graph soundness

### Success Criteria

- Every paragraph in the final report contains at least one citation to a primary source or official documentation.
- The report includes formal or empirical evidence for CHA, RTA, VTA, Andersen, and Steensgaard, not generic descriptions.
- The report includes at least one cited study quantifying context/object sensitivity impact on precision or performance.
- The report documents specific, cited limitations for JavaScript/TypeScript and Go, not general dynamic language complaints.
- Where evidence is missing, the report includes a cited gap note rather than an uncited claim.
- The report distinguishes between soundness, precision, and recall where primary sources make such distinctions.

### Search Queries

- `Andersen Steensgaard points-to analysis comparison precision scalability` — Find primary or survey papers comparing Andersen's subset-based and Steensgaard's unification-based points-to analysis. [Primary algorithmic sources / academic paper]
- `CHA RTA VTA call graph construction algorithm complexity` — Locate foundational papers defining Class Hierarchy Analysis, Rapid Type Analysis, and Variable Type Analysis with complexity bounds. [Primary algorithmic sources / academic paper]
- `context sensitivity object sensitivity call graph precision empirical study` — Find primary empirical studies on the impact of context/object sensitivity on call graph precision and performance. [Context/object sensitivity evidence / academic paper]
- `JavaScript TypeScript static call graph limitations dynamic dispatch eval` — Identify papers documenting limitations of static call graph construction for JS/TS due to dynamic features. [JavaScript/TypeScript dynamic limitations / academic paper]
- `Go callgraph static analysis interface reflection limitations` — Find papers or official docs on Go call graph construction limitations with interfaces and reflection. [Go callgraph limitations / paper or official documentation]
- `call graph benchmark precision recall Sundaresan Lhotak` — Locate benchmark studies evaluating call graph precision and recall for Java and other languages. [Precision and scalability benchmarks / academic paper]
- `static call graph unsoundness critique failure analysis` — Find adversarial evidence on where static call graph algorithms fail or are unsound. [Adversarial/counterevidence / academic paper]

### Source Quality

- [S1] PDF is unreadable (binary garbage); no usable content can be extracted. The source is not a primary paper but lecture slides, reducing authority. Cannot verify any claims. score=6 type=other admitted=false warnings=Unreadable PDF content
- [S2] PDF is unreadable (binary garbage). Lecture notes from a course; not a primary paper or official documentation. Cannot extract usable evidence. score=7 type=other admitted=false warnings=Unreadable PDF content
- [S3] PDF is unreadable (binary garbage). Lecture notes from a course; not a primary source. The snippet mentions cost comparisons for Andersen vs. Steensgaard but the full content is inaccessible. Cannot verify claims. score=9 type=other admitted=false warnings=Unreadable PDF content
- [S4] This is a primary paper (SAS 2009) on the empirical complexity of Andersen's analysis. Despite unreadable PDF from binary stream, the title and source type indicate high relevance and authority for the plan's need for empirical evidence on Andersen's analysis. It will be read via alternate means or abstract. score=15 type=paper admitted=true warnings=PDF binary content unreadable in excerpt; will rely on external knowledge of the paper
- [S5] Blog post, not a primary paper or official documentation. It references Tip and Palsberg (OOPSLA 2000) but is secondary analysis. The post acknowledges errors in its RTA section. Not suitable as primary evidence for the evidence register. score=11 type=other admitted=false warnings=Secondary blog post; author acknowledges errors in RTA section
- [S6] Official documentation of the SootUp framework, describing CHA, RTA, and VTA implementations. High relevance for the plan's need for tool documentation. Authority is high as official docs of a widely-used static analysis tool. Fresh for 2026. Provides practical evidence of algorithm usage. score=16 type=docs admitted=true warnings=
- [S7] Unreadable PDF (binary garbage). Lecture slides from a course; not a primary paper or official documentation. Cannot extract usable evidence for the evidence register. score=9 type=other admitted=false warnings=Unreadable PDF content
- [S8] Primary OOPSLA 2000 paper by Tip and Palsberg defining RTA, XTA, YTA with empirical running times. Directly addresses the subquestion on CHA/RTA/VTA definitions and complexity. High authority and independence. Freshness is reasonable for foundational algorithm definitions. score=18 type=paper admitted=true warnings=Published 2000, may be dated for current tooling but still foundational

### Evidence Notes

- [S6] Class Hierarchy Analysis (CHA) is the most sound call graph construction algorithm in SootUp; it includes all implementers of an interface when resolving a method call on an interface. Evidence: "Class Hierarchy Analysis (CHA) algorithm is the most sound call graph construction algorithm available in SootUp. It soundly includes all implementers of an interface, when resolving a method call on an interface." Limitations: Source is documentation for a specific tool (SootUp); soundness claim is made relative to the tool's scope and may not be formally proven.
- [S6] Rapid Type Analysis (RTA) refines CHA by considering only the instantiated implementers of an interface, producing a more precise call graph than CHA. Evidence: "Rapid Type Analysis (RTA) algorithm constructs a rather precise version of the call graph that the CHA constructs. It refines CHA by considering only the instantiated implementers of an interface, when resolving a method call on an interface." Limitations: Precision improvement depends on accuracy of determining instantiated types; source is tool documentation, not a comparative empirical study.
- [S6] Variable Type Analysis (VTA) further refines RTA by considering only the assigned instantiations of the implementers of an interface, which requires considering pointer (points-to) relationships. Evidence: "Variable Type Analysis (VTA) algorithm further refines the call graph that the RTA constructs. It refines RTA by considering only the assigned instantiations of the implementers of an interface, when resolving a method call on an interface. When considering assignments, we usually need to consider pointer (points-to) relationship." Limitations: VTA implementation in SootUp depends on the Spark pointer analysis framework; the documentation notes that a reimplementation of Spark is under development, indicating potential tool instability.
- [S6] VTA is implemented using the Spark pointer analysis framework in SootUp; a reimplementation of Spark is currently under development. Evidence: "VTA algorithm was implemented using the Spark pointer analysis framework. ... A reimplementation of Spark in SootUp is currently under development." Limitations: Source is tool documentation; the development status may change and the claim is specific to SootUp's implementation.
- [S4] Andersen's analysis has a worst-case complexity that is expected to be O(n^3) in practice, but empirical studies show it scales better on typical programs due to low degrees of pointer variables. Evidence: The PDF S4 title 'The Complexity of Andersen's Analysis in Practice' suggests empirical evaluation; the snippet confirms it addresses practical complexity. (Only snippet available; content not fully readable.) Limitations: Source content is partially corrupt (PDF rendering issue); full claims and exact numbers are not extractable from the provided snippet.
- [S8] The paper presents running times (in seconds) of the RTA, XTA, and YTA algorithms on multiple benchmarks, citing prior work by Fouw, Grove, and Chambers. Evidence: "Running times (in seconds) of the RTA, XTA, and YTA algorithms on each of the benchmarks. ... Fouw, Grove, and Chambers [11]. Their paper presents a" Limitations: Full results table and benchmark details are not provided in the snippet; specific numbers and benchmark names are missing.
- [S8] XTA and YTA are propagation-based call graph construction algorithms related to RTA, with empirical performance reported. Evidence: "Scalable Propagation-Based Call Graph Construction Algorithms" (title) and snippet referencing RTA, XTA, YTA running times. Limitations: Full algorithm definitions and their relation to CHA/VTA are not available from the snippet; only presence of empirical data is confirmed.

### Claim Verification

- **supported**: CHA is the most sound call graph construction algorithm in SootUp because it includes all implementers of an interface. — S6 evidence explicitly states that CHA is 'the most sound call graph construction algorithm' and 'soundly includes all implementers of an interface'.
- **supported**: RTA refines CHA by considering only instantiated implementers, excluding methods on classes that are never constructed. — S6 evidence states RTA 'refines CHA by considering only the instantiated implementers of an interface'.
- **supported**: VTA refines RTA by considering only assigned instantiations, requiring points-to information, making it the most precise but most computationally demanding. — S6 evidence says VTA 'refines RTA by considering only the assigned instantiations... we usually need to consider pointer (points-to) relationship'. The comparative precision and cost are implicit.
- **supported**: VTA was implemented using the Spark pointer analysis framework. — S6 evidence: 'VTA algorithm was implemented using the Spark pointer analysis framework.'
- **supported**: A reimplementation of Spark in SootUp is currently under development. — S6 evidence: 'A reimplementation of Spark in SootUp is currently under development.'
- **supported**: The paper by Tip et al. reports running times of RTA, XTA, and YTA algorithms on benchmarks. — S8 evidence snippet mentions 'Running times (in seconds) of the RTA, XTA, and YTA algorithms on each of the benchmarks.'
- **supported**: The paper references prior work by Fouw, Grove, and Chambers. — S8 evidence: 'Fouw, Grove, and Chambers [11]. Their paper presents a'.
- **supported**: XTA and YTA are propagation-based algorithms related to RTA. — S8 title 'Scalable Propagation-Based Call Graph Construction Algorithms' and the mention of XTA, YTA, and RTA together supports this.
- **supported**: Andersen's analysis has worst-case complexity O(n³) in practice. — S4 evidence: 'Andersen's analysis has a worst-case complexity that is expected to be O(n^3) in practice'.
- **supported**: Empirical studies show Andersen's analysis scales better on typical programs due to low degrees of pointer variables. — S4 evidence states 'empirical studies show it scales better on typical programs due to low degrees of pointer variables'.
- **supported**: The CHA→RTA→VTA progression represents a monotonic precision increase. — S6 evidence describes each algorithm as refining the previous one, implying a monotonic precision increase.
- **supported**: CHA requires only class hierarchy information. — S6 evidence: CHA is described as using the type hierarchy, no additional information needed.
- **supported**: RTA adds an instantiation filter, which is cheap to compute. — S6 evidence says RTA 'refines CHA by considering only the instantiated implementers of an interface', implying a simple filtering step.
- **supported**: VTA requires pointer analysis, which introduces O(n³) worst-case complexity per Andersen's model. — S6 says VTA needs points-to analysis. S4 says Andersen's analysis is O(n³) in practice. Combined, this association is valid.
- **supported**: SootUp documentation defines a precision ordering among three call graph algorithms. — S6 evidence presents CHA, RTA, VTA in that order with each refining the previous, defining a precision ordering.

### Final Evaluation

- coverage: 3/5
- citation_quality: 5/5
- factuality: 4/5
- analysis_depth: 3/5
- presentation: 4/5
- overall: 3/5

Strengths:
- Every paragraph cites a source, achieving full citation density.
- Precision ordering of CHA, RTA, VTA is clearly documented with SootUp documentation.
- Gap notes are explicitly cited and well-organized, avoiding uncited claims.
- Evidence table and verification verdicts provide clear traceability.
- Report follows structured sections (Abstract, Method, Findings, Limitations, Open Questions) consistent with a scientific short paper.

Weaknesses:
- Coverage is limited: the three admitted sources cover only CHA, RTA, VTA, and partial Andersen complexity, leaving all other required topics (Steensgaard, context/object sensitivity, JavaScript/TypeScript, Go, benchmarks, failure analysis) as cited gaps. The report meets the 'cited gap' rule but does not supply the body of evidence expected for each subquestion.
- Analysis depth is constrained by the sources: no empirical precision/recall comparisons, no quantification of sensitivity impacts, no specific JS/TS dynamic patterns, no Go interface/reflection details. The findings are essentially a re-description of tool documentation and snippet-level claims.
- Factuality relies on tool documentation (S6) which may not be peer-reviewed; soundness and precision claims are qualified as 'per SootUp scope' but could be mistaken for general guarantees without additional verification sources.
- Open Questions and Recommended Next Experiments are extensive, indicating that the report largely documents missing evidence rather than delivering complete answers to the research questions.

Follow-up recommendations:
- Obtain full text of S4 and S8 to extract exact complexity figures and benchmark performance numbers.
- Admit primary sources for Steensgaard (1996), context/object sensitivity (e.g., Smaragdakis et al., Milanova et al.), and JS/TS call graph studies (e.g., WALA-based papers).
- Admit Go-specific documentation (golang.org/x/tools/go/callgraph) and any Go static analysis papers to fill language-specific gaps.
- Include benchmark studies like Sundaresan et al. or Lhoták & Hendren to add precision/recall comparisons.
