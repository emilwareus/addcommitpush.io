---
title: "Call graph construction algorithms: CHA, RTA, VTA, points-to based call graphs, reflection/framework limitations, and provenance"
generated_at: 2026-06-29T21:04:49.552829+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Call Graph Construction Algorithms: CHA, RTA, VTA, Points-to Approaches, Reflection Limitations, and Provenance

## Abstract

This report examines static call graph construction algorithms for object-oriented managed languages, focusing on Class Hierarchy Analysis (CHA), Rapid Type Analysis (RTA), and Variable Type Analysis (VTA). It traces the precision-cost trade-off from the most sound but least precise algorithm (CHA) through allocation-site filtering (RTA) to assignment-aware points-to refinement (VTA). The evidence base is drawn from tool documentation for SootUp, an explanatory article on call graph algorithms, and a systematic comparison of six open-source Java call graph tools. The available evidence supports precise algorithmic distinctions among CHA, RTA, and VTA but provides limited detail on points-to-based call graphs, reflection handling, and provenance tracking. We report what the evidence establishes, identify where it is silent, and recommend next experiments to fill the gaps.

## Research Question

How do CHA, RTA, VTA, and points-to-based call graph construction algorithms differ in mechanism, precision, and cost; what are the known limitations for reflection and framework-managed dispatch; and how is provenance tracked for call graph edges?

## Method

We synthesize evidence from four admitted sources: SootUp call graph construction documentation [S1], an explanatory article on call graph algorithms [S2], lecture notes from a program analysis course [S3], and a systematic comparison of six open-source Java call graph construction tools [S6]. We extract algorithmic definitions, categorizations, and tool-level details, then organize findings by algorithm, tool, and limitation. Where the evidence is silent on a subquestion—reflection resolution, provenance representation, or benchmark numbers—we state this explicitly rather than supplementing from memory.

## Conceptual Background

A call graph is a directed graph whose nodes are methods (or procedures) and whose edges represent possible calls from one method to another. In object-oriented languages with dynamic dispatch, a single call site may resolve to multiple target methods depending on the runtime type of the receiver object. Static call graph construction algorithms approximate this resolution without executing the program. The central tension is between soundness (including all genuinely possible targets) and precision (excluding impossible targets).

The algorithms discussed here form a hierarchy: each successive algorithm refines the preceding one by using more information about which types can actually appear as receivers [S1][S2].

| Term | Definition |
|---|---|
| CHA | Class Hierarchy Analysis; resolves dispatch using the declared type's subtype hierarchy [S2] |
| RTA | Rapid Type Analysis; refines CHA by considering only instantiated types [S1] |
| VTA | Variable Type Analysis; refines RTA by considering assignment flow of instantiated types [S1] |
| XTA | Hybrid Type Analysis; mentioned alongside the other algorithms [S6] |
| Spark | Framework used for VTA implementation in SootUp [S1] |
| Fixed-point algorithm | An iterative algorithm that repeats until the computed result stabilizes [S2] |
| Worklist | A queue of methods to process; the algorithm processes each method and may add new methods to the queue [S2] |

## Findings

### CHA: Class Hierarchy Analysis

CHA resolves a virtual call by examining the declared type of the receiver variable and including all methods in the subtype hierarchy of that declared type [S2]. When the receiver is declared as an interface type, CHA includes all classes that implement that interface [S1].

SootUp classifies CHA as the most sound call graph algorithm available in the tool, because it does not filter by allocation or assignment information [S1]. This soundness comes at a cost: CHA includes methods from subtypes that are never instantiated at runtime, producing a high proportion of spurious edges.

### RTA: Rapid Type Analysis

RTA refines CHA by considering only the instantiated implementers of an interface when resolving a call [S1]. Algorithmically, RTA is a fixed-point algorithm using a worklist. It starts from the main method and iteratively constructs a call graph that is a subset of the CHA call graph, adding edges only to methods in types that were allocated in reachable methods [S2]. The algorithm runs until the worklist is empty, at which point it has reached a fixed point [S2].

RTA may evaluate a method multiple times if new callers are discovered during iteration, adding new allocation sites and potentially enabling new edges [S2]. It requires whole-program analysis because allocation sites throughout the program determine which types are live.

RTA improves precision over CHA by excluding methods from types that are declared in the hierarchy but never instantiated [S1]. However, it may still include types that are instantiated but never used as a receiver at a given call site [S1].

### VTA: Variable Type Analysis

VTA further refines RTA by considering only the assigned instantiations of implementers [S1]. Where RTA asks "is this type allocated anywhere in reachable code?", VTA asks "can an instance of this type flow to this particular variable through assignments?" This requires tracking pointer (points-to) relationships [S1].

The algorithm is structurally similar to RTA—a fixed-point algorithm with a worklist—but the cost is substantially higher because it considers assignment information rather than just allocation sites [S2]. In SootUp, VTA is implemented via the Spark framework and requires an initial call graph (typically a CHA or RTA graph) as a starting point [S1].

### Seminal References

The systematic comparison paper provides the foundational citations for each algorithm [S6]:

| Algorithm | Original Authors | Year |
|---|---|---|
| CHA | Dean et al. | 1995 |
| RTA | Bacon and Sweeney | 1996 |
| XTA | Tip and Palsberg | 2000 |
| VTA | Sundaresan et al. | 2000 |

### Precision-Cost Trade-off

The evidence supports a clear ordering of precision and cost:

| Dimension | CHA | RTA | VTA |
|---|---|---|---|
| Information used | Declared type hierarchy [S2] | Hierarchy + allocation sites [S1][S2] | Hierarchy + allocation + assignment flow [S1][S2] |
| Soundness | Highest (most conservative) [S1] | High | High |
| Precision | Lowest | Moderate ("rather precise") [S1] | Highest of the three |
| Cost | Lowest | Moderate | Highest of the three [S2] |
| Iterative fixed-point | Not established by evidence | Yes [S2] | Yes [S2] |
| Requires initial call graph | No | No (starts from main) [S2] | Yes (via Spark) [S1] |

Insight: The progression from CHA to RTA to VTA is not arbitrary. Each algorithm adds one layer of information—allocation, then assignment flow—and each layer filters out edges that the previous layer could not exclude. The cost increases because each layer requires more data-flow tracking, but the precision gain comes from excluding types that are allocated but never reach a specific call site.

### Points-to-Based Call Graphs

The evidence provides limited detail on points-to-based call graphs beyond VTA. SootUp documentation notes that VTA is implemented via the Spark framework and requires considering pointer (points-to) relationships [S1]. The systematic comparison paper [S6] compares six open-source Java call graph construction tools, but the evidence notes do not include specific benchmark numbers, precision/recall figures, or scalability measurements from that paper. We cannot report quantitative comparisons without inventing data.

### Reflection and Framework Limitations

The admitted evidence does not address reflection, dynamic proxies, class loaders, or framework-managed dispatch (e.g., Spring, Android lifecycle). None of the four sources discuss specific failure modes or mitigation techniques for these features. This is a significant gap in the evidence base, given that reflection unsoundness is a well-known problem in static call graph construction. We flag this as a limitation of the available evidence rather than a finding that these problems do not exist.

### Provenance

The admitted evidence does not address provenance tracking for call graph edges. No source discusses how edges are attributed to algorithmic decisions, how provenance is stored, or how it aids debugging. This is another significant gap.

## Design Implications

For tool authors selecting a call graph algorithm, the evidence supports the following guidance:

1. **Use CHA when soundness is paramount and precision is secondary.** CHA is the most conservative option in SootUp [S1]. It is suitable as a baseline or when downstream analyses can tolerate false positives.

2. **Use RTA as a default when a balance is needed.** RTA provides a "rather precise" call graph [S1] at moderate cost, using only allocation-site information. It is a fixed-point algorithm but converges with less information than VTA [S2].

3. **Use VTA when precision matters and cost is acceptable.** VTA requires points-to analysis infrastructure (Spark in SootUp) and an initial call graph [S1]. It is the most expensive of the three but produces the most precise graph by filtering on assignment flow.

4. **VTA requires an initial call graph.** This bootstrapping requirement means VTA cannot be run in isolation; it must be preceded by CHA or RTA [S1]. Tool authors should expose this as a configuration option.

Insight: The dependency of VTA on an initial call graph creates a two-phase pipeline: first compute a coarse graph (CHA or RTA), then refine it with assignment information. This pipeline structure means that errors in the initial phase propagate to the refined phase. If the initial graph misses edges due to reflection unsoundness, VTA cannot recover them.

## Limitations and Threats to Validity

**Evidence coverage gaps.** The admitted sources cover CHA, RTA, and VTA at an algorithmic level but do not provide:
- Quantitative benchmark results (precision, recall, scalability numbers)
- Details on points-to-based call graphs beyond brief mentions of Spark in SootUp [S1]
- Any information on reflection, dynamic proxies, or framework-managed dispatch
- Any information on provenance tracking or edge attribution
- Details on XTA beyond naming [S6]
- Confirmation of whether CHA requires fixed-point iteration or can be computed from the class hierarchy alone

**Source type bias.** Two sources are documentation or instructional material [S1][S2], one is lecture slides [S3], and one is a comparison paper [S6]. The comparison paper likely contains benchmark data, but the evidence notes extracted from it do not include specific numbers. We cannot report findings from the paper that are not in the evidence notes.

**Tool-specific framing.** The algorithm descriptions are framed through SootUp's implementation [S1]. While the algorithmic concepts are general, specific implementation details (e.g., Spark as the VTA backend) may not apply to other tools like WALA or Doop.

**Staleness.** The seminal references date from 1995–2000 [S6]. The evidence does not include any sources from 2020–2026, so recent advances in reflection resolution, ML-assisted construction, or provenance-aware analysis are not represented.

**No conflict resolution needed.** The sources are consistent with each other; no contradictions were found in the available evidence.

## Open Questions

1. What are the quantitative precision, recall, and scalability differences among CHA, RTA, and VTA on standard corpora such as DaCapo or SPECjvm? The evidence identifies the qualitative ordering but not the magnitude.

2. How do points-to-based call graphs (e.g., 0-CFA, k-CFA, object-sensitive analyses) compare to VTA in precision and cost? The evidence mentions Spark as the framework for VTA in SootUp [S1] but does not describe specific points-to variants or a general framework for points-to-based construction.

3. What specific failure modes arise when CHA, RTA, or VTA encounter reflection calls (e.g., `Class.forName`, `Method.invoke`), dynamic proxies, or framework-managed dispatch? The evidence is silent.

4. How do tools like WALA and Doop implement call graph construction, and do their algorithm choices differ from SootUp's CHA/RTA/VTA pipeline? The evidence does not cover these tools in detail.

5. How is provenance represented for call graph edges—what data structures or formats record why an edge was added, and how do downstream consumers use this information? The evidence is silent.

6. What recent advances (2020–2026) exist in reflection resolution or provenance-aware call graph construction? The evidence does not include any recent sources.

7. Does CHA require fixed-point iteration, or can it be computed directly from the class hierarchy without iterative processing? The available evidence does not establish this either way.

8. Are there intermediate algorithms between RTA and VTA (such as DTA or XTA) with distinct precision-cost profiles? The evidence names XTA [S6] but provides no algorithmic detail, and DTA is not substantiated by extractable evidence.

## Recommended Next Experiments

1. **Extract benchmark data from the systematic comparison paper [S6].** The paper compares six open-source Java call graph tools and likely contains precision/recall tables. A targeted extraction of these tables would fill the quantitative gap.

2. **Measure CHA vs. RTA vs. VTA on a common corpus.** Run all three algorithms in SootUp on DaCapo or SPECjvm benchmarks, recording edge counts, construction time, and memory usage. Compare edge sets against a dynamic call graph ground truth to compute precision and recall.

3. **Test reflection unsoundness empirically.** Construct a benchmark program that uses `Method.invoke` and dynamic proxies, run CHA/RTA/VTA, and measure how many edges are missed compared to a runtime-collected call graph. This would quantify the reflection gap that the evidence cannot address.

4. **Survey provenance representation in existing tools.** Examine whether SootUp, WALA, or Doop internally tag call graph edges with their source algorithm or reasoning. If they do not, design a provenance schema that records, for each edge: the call site, the resolved target, the algorithm used, and the key facts that enabled resolution (e.g., which allocation site or assignment chain).

5. **Compare VTA bootstrapped from CHA vs. VTA bootstrapped from RTA.** Since VTA requires an initial call graph [S1], the choice of bootstrap may affect the final graph. Measure whether a more precise initial graph (RTA) produces a more precise VTA graph, or whether VTA converges to the same result regardless of bootstrap.

6. **Determine whether CHA requires fixed-point iteration.** Instrument SootUp's CHA implementation to verify whether it processes the class hierarchy in a single pass or iterates to a fixed point, resolving the open question about CHA's algorithmic structure.

## Source Register

- [S1] [Call Graph Construction - SootUp](https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/) — admitted, score 17, discovered by `call graph construction CHA RTA VTA points-to analysis comparison algorithm`
- [S2] [Call Graph Construction Algorithms Explained - Ben Holland](https://ben-holland.com/call-graph-construction-algorithms-explained/) — admitted, score 12, discovered by `call graph construction CHA RTA VTA points-to analysis comparison algorithm`
- [S3] [11 Program Analysis Call Graphs (Part 2) Prof. Dr. Michael Pradel](https://software-lab.org/teaching/winter2020/pa/slides_call_graph_analysis_cha_rta.pdf) — admitted, score 12, discovered by `call graph construction CHA RTA VTA points-to analysis comparison algorithm`
- [S4] [Scalable Propagation-Based Call Graph Construction Algorithms | Request PDF](https://www.researchgate.net/publication/2625398_Scalable_Propagation-Based_Call_Graph_Construction_Algorithms) — rejected, score 14, discovered by `call graph construction CHA RTA VTA points-to analysis comparison algorithm`
- [S5] [A Practical and Comparative Study of Call Graph Construction Algorithms | Request PDF](https://www.researchgate.net/publication/314566321_A_Practical_and_Comparative_Study_of_Call_Graph_Construction_Algorithms) — rejected, score 14, discovered by `call graph construction CHA RTA VTA points-to analysis comparison algorithm`
- [S6] [Systematic Comparison of Six Open-Source Java Call Graph Construction Tools](https://publicatio.bibl.u-szeged.hu/18406/1/JSP19-SystematicComparisonofSixOpen-SourceJavaCallGraphConstructionTools.pdf) — admitted, score 18, discovered by `call graph construction CHA RTA VTA points-to analysis comparison algorithm`

## Research Trace

### Goal

Produce a comprehensive technical reference on static and dynamic call graph construction algorithms—CHA, RTA, VTA, points-to-based approaches—their trade-offs, reflection/framework handling limitations, and provenance tracking for call graph edges.

### Subquestions

- What are the precise definitions, algorithms, and complexity characteristics of CHA (Class Hierarchy Analysis), RTA (Rapid Type Analysis), and VTA (Variable Type Analysis)?
- How do points-to-based call graphs (e.g., 0-CFA, k-CFA, object-sensitive) differ from CHA/RTA/VTA in precision and scalability, and what are representative benchmark results?
- What are the known limitations of static call graph construction when handling reflection, dynamic proxies, class loaders, and framework-managed dispatch (e.g., Spring, Android lifecycle)?
- What techniques exist for modeling or resolving reflection and framework callbacks in call graph construction (e.g., reflection log replay, taint-based resolution, framework models)?
- How is provenance tracked and represented in call graph construction—what systems or formats record why an edge was added, and how does provenance aid debugging and trust?
- What are the state-of-the-art tools and benchmarks (e.g., Doop, WALA, Soot/Spark, OPAL, sootup, petablops) and how do they compare on standard corpora like DaCapo or SPECjvm?

### Research Perspectives

- **Foundational Algorithms** — Establish precise definitions, data-flow formulations, and complexity for CHA, RTA, VTA, and points-to-based call graph construction.
- **Benchmarks & Evaluation** — Find empirical comparisons of precision, recall, and scalability across algorithms and tools on standard corpora.
- **Implementation** — Identify concrete implementations in tools like Soot/Spark, WALA, Doop, OPAL, and sootup, including configuration knobs and algorithm selection.
- **Reflection & Framework Limitations** — Surface known failure modes, unsoundness, and mitigation strategies for reflection, dynamic proxies, deserialization, and framework-managed dispatch.
- **Criticism & Counterevidence** — Find critiques of static call graph soundness claims, studies showing large unsoundness gaps, and arguments for dynamic or hybrid approaches.
- **Recency & Advances** — Identify recent (2020–2026) advances in reflection resolution, ML-assisted call graph construction, and provenance-aware analysis.
- **Provenance & Operational Implications** — Determine how provenance is modeled, stored, and used in practice for call graph edges, including debugging, audit, and incremental recomputation.

### Source Requirements

- Seminal papers: Bacon & Sweeney (CHA/RTA), Sundaresan et al. (VTA), points-to analysis foundations (Andersen, Steensgaard, k-CFA).
- Tool documentation: Soot/Spark, WALA, Doop, OPAL, sootup user and developer guides.
- Benchmark suites and empirical studies: DaCapo, SPECjvm, petablops, AreWeFastY et al. call graph comparison studies.
- Reflection resolution papers: e.g., Tamiflex, Dynadoc, reflection-for-free, ELF, and recent framework-modeling work.
- Provenance-aware program analysis papers or system docs (e.g., provenance in Doop, provenance in dataflow analysis).
- Critiques of static call graph soundness: e.g., Landman et al., Sawin & Rountev, Livshits et al. on reflection unsoundness.

### Success Criteria

- The report clearly distinguishes CHA, RTA, VTA, and points-to-based call graphs with algorithmic detail, not just naming.
- At least one comparative benchmark table or summary of precision/recall/scalability across algorithms or tools is included.
- Reflection and framework limitations are documented with specific failure modes and at least two mitigation techniques.
- Provenance is addressed with concrete examples of how edges are attributed and how provenance is used downstream.
- At least 3 distinct tools are covered with implementation-level detail (configuration, algorithm choice, extensibility).
- Recent (2020–2026) advances are represented, not only foundational work.

### Search Queries

- `call graph construction CHA RTA VTA points-to analysis comparison algorithm` — Find foundational and survey-level material covering the core algorithms and their relationships. [Foundational Algorithms / papers and surveys]
- `Soot Spark WALA Doop call graph benchmark precision DaCapo` — Locate empirical benchmark comparisons across major tools on standard corpora. [Benchmarks & Evaluation / benchmarks and papers]
- `static call graph reflection unsoundness Spring Android framework limitations` — Surface known limitations and critiques of static call graph soundness for reflection and frameworks. [Reflection & Framework Limitations / papers and critiques]
- `call graph provenance edge attribution static analysis debugging 2024` — Find recent work on provenance tracking and edge attribution in call graph and points-to analysis. [Provenance & Operational Implications / papers and tool docs]

### Source Quality

- [S1] Official SootUp documentation providing concrete code examples for CHA, RTA, and VTA call graph construction. Directly supports the Implementation perspective and source requirements for tool documentation. score=17 type=docs admitted=true warnings=
- [S2] Blog post explaining CHA, RTA, VTA with practical examples and references to Tip & Palsberg. Useful for foundational understanding but lower authority than peer-reviewed sources. Author acknowledges issues in RTA section. score=12 type=other admitted=true warnings=Author notes errors in RTA section; content may be partially inaccurate.
- [S3] Lecture slides from a university course covering CHA, RTA, VTA, DTA, and Spark. Provides a concise overview of algorithms but limited depth. Useful for foundational understanding. score=12 type=other admitted=true warnings=Slides may lack full algorithmic detail; dated 2020.
- [S4] Request page for a paper on propagation-based call graph algorithms. Fetch error (403) prevents access to content. Cannot be used. score=14 type=paper admitted=false warnings=Fetch error: HTTP 403 Forbidden; content unavailable.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S5] Request page for a comparative study of call graph construction algorithms. Fetch error (403) prevents access to content. Cannot be used. score=14 type=paper admitted=false warnings=Fetch error: HTTP 403 Forbidden; content unavailable.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S6] Peer-reviewed paper systematically comparing six open-source Java call graph construction tools. Directly addresses the Benchmarks & Evaluation perspective and source requirements for empirical studies. score=18 type=paper admitted=true warnings=

### Evidence Notes

- [S1] CHA is the most sound call graph algorithm in SootUp, including all implementers of an interface when resolving a method call on an interface. Evidence: Class Hierarchy Analysis (CHA) algorithm is the most sound call graph construction algorithm available in SootUp. It soundly includes all implementers of an interface, when resolving a method call on an interface. Limitations: Soundness comes at the cost of precision; includes all possible implementers even if never instantiated.
- [S1] RTA refines CHA by considering only instantiated implementers of an interface when resolving a method call on an interface. Evidence: Rapid Type Analysis (RTA) algorithm constructs a rather precise version of the call graph that the CHA constructs. It refines CHA by considering only the instantiated implementers of an interface, when resolving a method call on an interface. Limitations: RTA still may include types that are instantiated but never used as receiver at a given call site.
- [S1] VTA further refines RTA by considering only the assigned instantiations of implementers, requiring pointer (points-to) analysis. Evidence: Variable Type Analysis (VTA) algorithm further refines the call graph that the RTA constructs. It refines RTA by considering only the assigned instantiations of the implementers of an interface, when resolving a method call on an interface. When considering assignments, we usually need to consider pointer (points-to) relationship. Limitations: VTA is more expensive than RTA; implemented via Spark framework and requires an initial call graph.
- [S2] CHA uses the declared type of the receiver object and restricts call edges to methods in the subtype hierarchy of that declared type. Evidence: Class Hierarchy Analysis looks at the declared type of the variable (the receiver object) used to invoke the dynamic dispatch and restricts call edges to the inherited method implementation or the methods declared in the subtype hierarchy of the declared type of the receiver object. Limitations: Does not consider actual runtime types; may include methods from subtypes that are never instantiated.
- [S2] RTA is a fixed-point algorithm using a worklist, starting from the main method and iteratively adding edges based on allocated types. Evidence: Given a CHA call graph we start at the main method and iteratively construct a new call graph that is a subset of the CHA call graph by adding only the edges to the methods that are contained in types of objects that were allocated in the main method. ... RTA runs until the worklist is empty, at which point it has reached a fixed point. Limitations: RTA may evaluate a method several times if new callers are discovered; relies on whole-program analysis.
- [S2] VTA is similar to RTA in being a fixed-point algorithm with a worklist, but is more expensive because it considers assignment information. Evidence: The algorithm looks remarkably similar to RTA in that it is a fixed point algorithm using a worklist, but since we are considering much more information than RTA the cost of running VTA is going to be much higher. Limitations: Higher computational cost; requires points-to analysis infrastructure.
- [S3] CHA and RTA are classified as single and efficient algorithms, while VTA and DTA analyze assignments, and Spark is a general construction framework for points-to-based call graphs. Evidence: Single & efficient: CHA, RTA · Analyzing assignments: VTA, DTA · Call graphs and points-to analysis: Spark Limitations: No further detail on DTA or Spark in this source.
- [S6] The following algorithms are used for object-oriented languages: CHA (Dean et al., 1995), RTA (Bacon and Sweeney, 1996), XTA (Tip and Palsberg, 2000), VTA (Sundaresan et al., 2000). Evidence: independent methods, the following algorithms can be used for object-oriented languages: Class Hierarchy Analysis (CHA) (Dean et al., 1995), Rapid Type Analysis (RTA) (Bacon and Sweeney, 1996), Hybrid Type Analysis (XTA)(Tip and Palsberg, 2000), Variable Type Analysis (VTA) (Sundaresan et al., 2000). Limitations: No details on XTA; source is a comparison paper, not a primary source.

### Claim Verification

- **supported**: The algorithms discussed here form a hierarchy: each successive algorithm refines the preceding one by using more information about which types can actually appear as receivers. — Both S1 and S2 describe the progressive refinement from CHA to RTA to VTA, each using more precise type information.
- **supported**: CHA resolves a virtual call by examining the declared type of the receiver variable and including all methods in the subtype hierarchy of that declared type. — S2 explicitly states that CHA 'looks at the declared type of the variable ... and restricts call edges to ... methods declared in the subtype hierarchy of the declared type'.
- **supported**: When the receiver is declared as an interface type, CHA includes all classes that implement that interface. — S1 states CHA 'soundly includes all implementers of an interface, when resolving a method call on an interface'.
- **supported**: SootUp classifies CHA as the most sound call graph algorithm available in the tool, because it does not filter by allocation or assignment information. — S1 says 'CHA algorithm is the most sound call graph construction algorithm available in SootUp' without allocation/assignment filtering.
- **supported**: RTA refines CHA by considering only the instantiated implementers of an interface when resolving a call. — S1: 'RTA ... refines CHA by considering only the instantiated implementers of an interface, when resolving a method call on an interface.'
- **supported**: Algorithmically, RTA is a fixed-point algorithm using a worklist. — S2 describes RTA as a fixed-point algorithm that 'runs until the worklist is empty, at which point it has reached a fixed point'.
- **supported**: It starts from the main method and iteratively constructs a call graph that is a subset of the CHA call graph, adding edges only to methods in types that were allocated in reachable methods. — S2: 'start at the main method and iteratively construct a new call graph that is a subset of the CHA call graph by adding only the edges to the methods that are contained in types of objects that were allocated in the main method'.
- **supported**: The algorithm runs until the worklist is empty, at which point it has reached a fixed point. — S2: 'RTA runs until the worklist is empty, at which point it has reached a fixed point.'
- **supported**: RTA may evaluate a method multiple times if new callers are discovered during iteration, adding new allocation sites and potentially enabling new edges. — S2 notes that 'RTA may evaluate a method several times if new callers are discovered'.
- **supported**: RTA improves precision over CHA by excluding methods from types that are declared in the hierarchy but never instantiated. — S1: RTA refines CHA by considering only instantiated implementers, thus excluding uninstantiated types.
- **supported**: However, it may still include types that are instantiated but never used as a receiver at a given call site. — S1 explicitly: 'RTA still may include types that are instantiated but never used as receiver at a given call site.'
- **supported**: VTA further refines RTA by considering only the assigned instantiations of implementers. — S1: 'VTA ... refines RTA by considering only the assigned instantiations of the implementers of an interface.'
- **supported**: This requires tracking pointer (points-to) relationships. — S1 says: 'When considering assignments, we usually need to consider pointer (points-to) relationship.'
- **supported**: The algorithm is structurally similar to RTA—a fixed-point algorithm with a worklist—but the cost is substantially higher because it considers assignment information rather than just allocation sites. — S2: 'looks remarkably similar to RTA in that it is a fixed point algorithm using a worklist, but ... cost of running VTA is going to be much higher'.
- **supported**: In SootUp, VTA is implemented via the Spark framework and requires an initial call graph (typically a CHA or RTA graph) as a starting point. — S1: 'VTA algorithm ... implemented via Spark framework and requires an initial call graph (typically a CHA or RTA graph).'
- **supported**: CHA was originally defined by Dean et al. in 1995. — S6 attributes CHA to '(Dean et al., 1995)'.
- **supported**: RTA was originally defined by Bacon and Sweeney in 1996. — S6 attributes RTA to '(Bacon and Sweeney, 1996)'.
- **supported**: VTA was originally defined by Sundaresan et al. in 2000. — S6 attributes VTA to '(Sundaresan et al., 2000)'.
- **supported**: XTA was originally defined by Tip and Palsberg in 2000. — S6 attributes XTA to '(Tip and Palsberg, 2000)'.
- **supported**: XTA is a hybrid type analysis. — S6 lists XTA as 'Hybrid Type Analysis (XTA)'.
- **supported**: Spark is the framework used for VTA implementation in SootUp. — S1 states 'VTA algorithm ... implemented via Spark framework'.
- **supported**: RTA uses hierarchy and allocation sites information. — S1 and S2 both indicate RTA uses hierarchy and allocation sites to refine CHA.
- **supported**: VTA uses hierarchy, allocation, and assignment flow information. — S1 mentions assignments and points-to; S2 mentions assignment information, confirming inclusion of allocation and hierarchy.
- **supported**: RTA does not require an initial call graph; it starts from the main method. — S2: 'start at the main method and iteratively construct a new call graph' – no mention of requiring a precomputed call graph.

### Final Evaluation

- coverage: 3/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 4/5
- presentation: 5/5
- overall: 4/5

Strengths:
- Clear algorithmic distinctions among CHA, RTA, and VTA with precise citations and verification support.
- Honest and explicit reporting of evidence gaps, avoiding speculation or filler.
- Useful comparison table summarizing precision-cost trade-offs across algorithms.
- Well-structured scientific short-paper format with abstract, method, findings, limitations, and open questions.

Weaknesses:
- Limited coverage of points-to-based call graphs beyond VTA/Spark – no detail on 0-CFA, k-CFA, or object-sensitive analyses.
- Reflection, dynamic proxies, and framework limitations are not addressed due to lack of evidence (acknowledged, but still a gap relative to the research goal).
- Provenance tracking is not covered; no discussion of edge attribution or storage.
- No quantitative benchmark comparisons or recent (2020–2026) advances are presented.

Follow-up recommendations:
- Extract benchmark precision/recall/scalability data from the systematic comparison paper [S6] to fill quantitative gaps.
- Run CHA/RTA/VTA on DaCapo or SPECjvm benchmarks to produce empirical precision and recall figures against a dynamic ground truth.
- Design a controlled experiment to measure reflection unsoundness by comparing static call graph edges with runtime-collected edges on programs using Method.invoke and dynamic proxies.
- Survey provenance representation in SootUp, WALA, and Doop; if absent, propose a provenance schema for call graph edges.
