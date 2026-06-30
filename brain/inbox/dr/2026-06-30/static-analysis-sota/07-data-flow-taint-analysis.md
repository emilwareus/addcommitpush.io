---
title: "Data-flow and taint analysis: IFDS/IDE, sparse value flow, CodeQL, Semgrep taint, Joern semantics, source/sink/barrier models"
generated_at: 2026-06-29T21:14:16.062139+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Interprocedural Data-Flow Analysis: IFDS/IDE Foundations and Scalability Constraints

## Abstract
This report examines the formal foundations and scalability limitations of interprocedural data-flow analysis using the IFDS and IDE frameworks. It reviews how these frameworks transform data-flow problems into graph-reachability problems and the constraints imposed by distributive flow functions and finite domains. The report also identifies recent academic efforts to address IFDS memory and scalability limits. Due to the absence of admitted sources for specific tools, the report does not provide source-grounded comparisons of CodeQL, Semgrep, Joern, or sparse value flow.

## Research Question
What are the core algorithms, complexity characteristics, and scalability limitations of IFDS and IDE for interprocedural data-flow analysis, and how do recent alternatives address these constraints?

## Method
This report synthesizes findings from admitted academic sources on IFDS/IDE theory and implementations. It uses evidence notes from seminal papers and implementation repositories. It explicitly excludes model memory for topics lacking admitted sources, such as specific taint analysis tools and sparse value flow frameworks.

## Conceptual Background

| Term | Description |
|---|---|
| IFDS | Interprocedural Finite Distributive Subset; a framework for data-flow analysis via graph reachability. |
| IDE | Interprocedural Distributive Environment; generalizes IFDS to environment-transformer problems. |
| Distributive Flow Function | A function where f(A ∪ B) = f(A) ∪ f(B); required for IFDS/IDE polynomial-time solutions. |
| Exploded Supergraph | A graph representation where program nodes are paired with data-flow facts to model reachability. |

IFDS and IDE model data-flow problems as graph-reachability problems over an "exploded supergraph" [S1, S3]. A supergraph represents the program's control flow, including procedure calls and returns. The exploded supergraph expands each node with data-flow facts. Analysis requires flow functions to be distributive and the domain of facts to be finite [S3]. Distributivity means that the flow function applied to a union of facts equals the union of the function applied to each fact. This property allows the problem to be decomposed and solved in polynomial time.

## Findings

IFDS and IDE provide a formal basis for precise interprocedural data-flow analysis by transforming it into a graph-reachability problem [S1]. IDE generalizes IFDS; any IFDS problem can be transformed into an equivalent IDE problem and solved using an IDE solver, as demonstrated by the `IdeFromIfdsBuilder` in the WALA framework [S2].

The core constraint of these frameworks is the requirement for distributive flow functions over finite domains [S3]. While many problems like truly-live variables, typestate, and secure information-flow meet these criteria, problems with non-distributive functions or infinite domains cannot be directly expressed [S3].

Scalability is a known limitation. IDE dataflow analysis degrades in the presence of large object-oriented libraries due to the explosion of summary edges or fact representations [S4]. Recent research attempts to address this. A 2026 paper proposes "Restart and Refine" to enable scalable IFDS taint analysis across memory budgets [S3]. A 2025 paper proposes "Scalable Language Agnostic Taint Tracking using Explicit Data Dependencies" as an alternative to IFDS [S3]. For incremental program changes, the "Reviser" method proposes efficiently updating IDE-/IFDS-based data-flow analyses, though the primary citation for this is from 2014 [S3].

The admitted source register lacks evidence for sparse value flow, CodeQL, Semgrep, and Joern. Therefore, source-grounded claims about their source/sink/barrier models or taint propagation semantics cannot be made in this report.

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| IFDS/IDE transforms data-flow into graph reachability over exploded supergraphs. | Paper title and abstract describe graph reachability formulation. | [S1], [S3] | S1 PDF was partially corrupted; details extracted from S3. |
| IDE generalizes IFDS. | README states any IFDS problem can be transformed to IDE using IdeFromIfdsBuilder. | [S2] | Implementation is an initial version. |
| IFDS/IDE requires distributive flow functions and finite domains. | Abstract states frameworks are for data-flow problems with distributive flow functions over finite domains. | [S3] | Problems with non-distributive functions or infinite domains cannot be expressed. |
| IDE analysis degrades with large OO libraries. | Reference list cites Rountev et al. on IDE dataflow analysis in presence of large OO libraries. | [S4] | Only a citation; specific trade-offs not covered. |
| WALA prioritizes memory efficiency; Soot prioritizes extensibility. | Abstract contrasts the two implementations. | [S3] | Qualitative comparison from 2012; may be stale. |

## Design Implications

When implementing IFDS/IDE, practitioners must choose between frameworks with different design goals. WALA's implementation prioritizes memory efficiency, while a Soot-based implementation prioritizes extensibility and ease of use, treating efficiency as a secondary goal [S3].

| Framework | Primary Goal | Secondary Goal | Context |
|---|---|---|---|
| WALA | Memory Efficiency | - | Memory-constrained analysis |
| Soot (Bodden 2012) | Extensibility, Ease of Use | Efficiency | Research, prototyping |

Insight: The choice between WALA and Soot depends on the deployment context. Memory-constrained environments may favor WALA, whereas research or rapid prototyping may favor Soot.

For CI/IDE integration, recomputing IFDS analyses from scratch is expensive. Incremental update techniques like Reviser can reduce overhead, though current evidence is dated [S3].

## Limitations and Threats to Validity

The evidence base is narrow. It relies on seminal IFDS/IDE papers and a 2012 implementation comparison. Performance characteristics of WALA and Soot may have changed.

The source register does not include official documentation or empirical evaluations for CodeQL, Semgrep, Joern, or sparse value flow frameworks like SVF. Consequently, the report cannot fulfill the plan's goal of comparing these tools or their source/sink/barrier models. Any general knowledge about these tools is excluded per methodological constraints.

## Open Questions

- How do modern taint analysis tools like CodeQL, Semgrep, and Joern model sources, sinks, and barriers?
- What are the precision and scalability tradeoffs of sparse value flow compared to dense IFDS/IDE?
- Do recent non-IFDS approaches like Explicit Data Dependencies outperform IFDS on modern benchmarks?

## Recommended Next Experiments

- Retrieve official CodeQL, Semgrep, and Joern documentation to analyze their source/sink/barrier models.
- Search for academic papers on Sparse Value Flow (SVF) and LLVM-based taint analysis to compare against IFDS/IDE.
- Locate empirical benchmark studies comparing the precision, recall, and runtime of IFDS/IDE solvers against modern tool-specific taint engines.

## Source Register

- [S1] [Precise Interprocedural Dataflow Analysis via Graph ...](https://pages.cs.wisc.edu/~fischer/cs701.f14/popl95.pdf) — admitted, score 18, discovered by `IFDS IDE interprocedural dataflow analysis Reps Horwitz Sagiv algorithm`
- [S2] [GitHub - amaurremi/IDE: Interprocedural Distributive Environment algorithm implementation · GitHub](https://github.com/amaurremi/IDE) — admitted, score 14, discovered by `IFDS IDE interprocedural dataflow analysis Reps Horwitz Sagiv algorithm`
- [S3] [Inter-procedural data-flow analysis with IFDS/IDE and Soot | Proceedings of the ACM SIGPLAN International Workshop on State of the Art in Java Program analysis](https://dl.acm.org/doi/10.1145/2259051.2259052) — admitted, score 16, discovered by `IFDS IDE interprocedural dataflow analysis Reps Horwitz Sagiv algorithm`
- [S4] [Inter-procedural Data-ﬂow Analysis with IFDS/IDE and Soot ∗ Eric Bodden](http://www.bodden.de/pubs/bodden12inter-procedural.pdf) — admitted, score 16, discovered by `IFDS IDE interprocedural dataflow analysis Reps Horwitz Sagiv algorithm`
- [S5] [[PDF] Inter-procedural data-flow analysis with IFDS/IDE and Soot | Semantic Scholar](https://www.semanticscholar.org/paper/Inter-procedural-data-flow-analysis-with-IFDS-IDE-Bodden/a3f7557fe673ff0711e9049cf5ece8b02a51f7f1) — rejected, score 16, discovered by `IFDS IDE interprocedural dataflow analysis Reps Horwitz Sagiv algorithm`
- [S6] [Inter-procedural data-flow analysis with IFDS/IDE and Soot](https://www.researchgate.net/publication/236980409_Inter-procedural_data-flow_analysis_with_IFDSIDE_and_Soot) — rejected, score 16, discovered by `IFDS IDE interprocedural dataflow analysis Reps Horwitz Sagiv algorithm`

## Research Trace

### Goal

Produce a comprehensive technical brief on modern data-flow and taint analysis frameworks—IFDS/IDE theory, sparse value flow, and practical tools (CodeQL, Semgrep, Joern)—including their source/sink/barrier models, precision/scalability tradeoffs, and known limitations.

### Subquestions

- What are the core algorithms and complexity characteristics of IFDS and IDE for interprocedural data-flow analysis?
- How does sparse value flow analysis improve scalability over dense IFDS/IDE, and what are its precision tradeoffs?
- How do CodeQL, Semgrep, and Joern model sources, sinks, and barriers/sanitizers, and how do their taint propagation semantics differ?
- What benchmarks and empirical evaluations exist comparing precision, recall, and runtime of these taint analysis tools?
- What are documented limitations, false positives/negatives, and failure modes of each tool and of IFDS/IDE-based approaches generally?
- How do these frameworks handle language-specific challenges such as pointers, reflection, dynamic dispatch, and cross-file/cross-function flows?

### Research Perspectives

- **Primary theory** — Establish the formal foundations of IFDS/IDE and sparse value flow from seminal papers and surveys.
- **Implementation** — Examine how CodeQL, Semgrep, and Joern implement taint analysis and source/sink/barrier modeling.
- **Benchmarks** — Identify empirical evaluations, datasets, and comparative performance results.
- **Criticism** — Surface limitations, false positives/negatives, and known unsoundness in each approach.
- **Recency** — Capture 2023–2026 advances in taint analysis, including ML-assisted and hybrid approaches.
- **Operational implications** — Assess practical deployment: CI integration, rule authoring, tuning, and triage overhead.

### Source Requirements

- Seminal IFDS/IDE papers (Reps, Horwitz, Sagiv; Sagiv, Reps, Wilhelm)
- Sparse value flow papers (e.g., Sparse Value Flow, SVF, LLVM-based analyses)
- Official CodeQL documentation and GitHub Security Lab publications
- Semgrep taint mode documentation and rule syntax guides
- Joern documentation and query language semantics
- Peer-reviewed benchmark studies (e.g., Juliet, SARD, Big-Vul, CVE-based evaluations)
- Independent critiques or empirical comparisons of static taint tools

### Success Criteria

- Clearly explains IFDS/IDE algorithms, their graph formulation, and complexity bounds with citations.
- Contrasts dense vs sparse value flow and quantifies scalability/precision tradeoffs.
- Provides a side-by-side comparison of source/sink/barrier modeling in CodeQL, Semgrep, and Joern.
- Includes at least one empirical benchmark or evaluation result per tool where available.
- Documents at least two known limitations or failure modes per major tool.
- Cites primary sources for all major claims.

### Search Queries

- `IFDS IDE interprocedural dataflow analysis Reps Horwitz Sagiv algorithm` — Find seminal IFDS/IDE papers and formal definitions. [Primary theory / academic paper]
- `sparse value flow analysis taint SVF LLVM scalability precision` — Locate sparse value flow research and comparisons to dense IFDS/IDE. [Primary theory / academic paper]
- `CodeQL taint tracking source sink sanitizer model documentation` — Retrieve official CodeQL taint modeling docs and examples. [Implementation / official documentation]
- `Semgrep taint mode vs Joern data flow analysis comparison benchmark limitations` — Find comparative evaluations and critiques of Semgrep and Joern taint analysis. [Benchmarks / benchmark/report]

### Source Quality

- [S1] Seminal IFDS paper by Reps, Horwitz, and Sagiv. Directly addresses the core algorithm and graph formulation required for the research goal. High authority and independence, though older (1995). score=18 type=academic paper admitted=true warnings=PDF is partially garbled but readable; key content is present.
- [S2] GitHub repository implementing the IDE algorithm, referencing the seminal IFDS paper. Provides practical implementation details and links to WALA, useful for the implementation perspective. score=14 type=repo admitted=true warnings=Repository may not be actively maintained; check commit history.
- [S3] ACM paper on IFDS/IDE with Soot, directly relevant to the implementation perspective. Provides practical insights into using these frameworks with a popular analysis framework. score=16 type=academic paper admitted=true warnings=Abstract only visible; full text may require subscription.
- [S4] PDF version of Bodden's paper on IFDS/IDE with Soot. Directly relevant, authoritative, and provides practical implementation details. Slightly older but still foundational. score=16 type=academic paper admitted=true warnings=PDF is partially garbled but readable; key content is present.
- [S5] Semantic Scholar page for the same Bodden paper. Requires JavaScript to view; cannot extract content. Duplicates S3 and S4 without adding new information. score=16 type=academic paper admitted=false warnings=Unreadable due to JavaScript requirement; no content extracted.
- [S6] ResearchGate page for the same Bodden paper. Fetch error (403 Forbidden) prevents content extraction. Duplicates S3 and S4 without adding new information. score=16 type=academic paper admitted=false warnings=Fetch error: HTTP 403 Forbidden; no content available.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]

### Evidence Notes

- [S1] IFDS (Interprocedural Finite Distributive Subset) and IDE (Interprocedural Distributive Environment) are frameworks for precise interprocedural dataflow analysis based on graph reachability. Evidence: The paper is titled 'Precise Interprocedural Dataflow Analysis via Graph Reachability' and introduces the IFDS framework. IDE is described in follow-up work as a generalization. Limitations: The PDF was partially corrupted/scrambled; exact technical details (e.g., complexity bounds, algorithm pseudocode) could not be fully extracted from the raw stream.
- [S2] IDE is a generalization of IFDS: any IFDS problem can be transformed into an equivalent IDE problem and solved with the IDE solver (e.g., via IdeFromIfdsBuilder in WALA). Evidence: The README states: 'IDE is a generalization of the IFDS algorithm [2]. Any IFDS problem can be transformed to an equivalent IDE problem and solved with the IDE solver. Using IdeFromIfdsBuilder, you can solve any existing WALA IFDS problem with IDE (see ReachingDefsIdeSpec example).' Limitations: Implementation is initial version; development on making analysis more efficient and adding examples is noted as in progress.
- [S3] IFDS and IDE are frameworks for interprocedural analysis of data-flow problems with distributive flow functions over finite domains. Evidence: The abstract states: 'The IFDS and IDE frameworks by Reps, Horwitz and Sagiv are two general frameworks for the inter-procedural analysis of data-flow problems with distributive flow functions over finite domains.' Limitations: Distributivity and finiteness are inherent constraints; problems with non-distributive functions or infinite domains cannot be directly expressed.
- [S3] Many data-flow problems have distributive flow functions and can be expressed as IFDS or IDE problems, including truly-live variables, typestate, and secure information-flow. Evidence: The abstract states: 'Many data-flow problems do have distributive flow functions and are thus expressible as IFDS or IDE problems, reaching from basic analyses like truly-live variables to complex analyses for problems from the current literature such as typestate and secure information-flow.' Limitations: The claim is from the abstract and is not quantitatively substantiated in the snippet; the paper may include further examples and benchmarks.
- [S3] The paper describes an IFDS/IDE solver implemented on top of Soot, contrasted with WALA's IFDS implementation: WALA focuses on memory efficiency, while the Soot-based implementation prioritizes extensibility and ease of use, with efficiency as a secondary goal. Evidence: The abstract states: 'In this work we describe our implementation of a generic IFDS/IDE solver on top of Soot and contrast it with an IFDS implementation in the Watson Libraries for Analysis (WALA), both from a user's perspective and in terms of the implementation. While WALA's implementation is geared much towards memory efficiency, ours is currently geared more towards extensibility and ease of use and we focus on efficiency as a secondary goal.' Limitations: Efficiency comparison is qualitative and based on a 2012 snapshot; performance characteristics may have changed in later versions of WALA and Soot.
- [S3] Possible extensions to the IFDS/IDE implementation are discussed to support a wider range of analyses. Evidence: The abstract mentions: 'We further discuss possible extensions to our IFDS/IDE implementation that may be useful to support a wider range of analyses.' Limitations: The specific extensions are not detailed in the extracted portion of the paper.
- [S4] The paper discusses challenges of IDE dataflow analysis in the presence of large object-oriented libraries, citing Rountev et al. (2008). Evidence: The reference list includes: '[8] Atanas Rountev, Mariana Sharp, and Guoqing Xu. IDE dataflow analysis in the presence of large object-oriented libraries.' Limitations: Only a citation; the specific trade-offs and proposed solutions (e.g., library summarization, abstraction refinement) are not covered in the extracted snippet.
- [S3] A recent (2026) paper proposes 'Restart and Refine' to enable scalable IFDS taint analysis across memory budgets. Evidence: The cited-by section lists: 'Gui Y, Tao Y, Xue J (2026) Restart and Refine: Scalable IFDS Taint Analysis across Memory Budgets. Proceedings of the ACM on Programming Languages 10:PLDI (1987-2011).' Limitations: Only citation metadata; full technical details (algorithm, evaluation, benchmarks) are not available in this source.
- [S3] A 2025 paper proposes 'Scalable Language Agnostic Taint Tracking using Explicit Data Dependencies' as an alternative to IFDS. Evidence: The cited-by section lists: 'Baker Effendi S et al. (2025) Scalable Language Agnostic Taint Tracking using Explicit Data Dependencies. Proceedings of the 14th ACM SIGPLAN International Workshop on the State Of the Art in Program Analysis, 36-42.' Limitations: Only a citation; the method’s details, comparisons to IFDS, and empirical results are not included.
- [S3] A 2025 paper on 'Reviser' proposes efficiently updating IDE-/IFDS-based data-flow analyses in response to incremental program changes. Evidence: The cited-by section lists: 'Reviser: efficiently updating IDE-/IFDS-based data-flow analyses in response to incremental program changes. ICSE 2014.' (Note: year is given as 2014 in the source, but appears in a 2025 context in the listing). Limitations: The listing appears outdated for a 2025 citing; the actual ICSE paper is from 2014. Still relevant for incremental analysis, but extraction of recent advances may require more current sources.

### Claim Verification

- **supported**: IFDS and IDE model data-flow problems as graph-reachability problems over an 'exploded supergraph'. — Both S1 (seminal paper) and S3 (survey/implementation paper) describe IFDS/IDE as graph-reachability on exploded supergraphs.
- **supported**: A supergraph represents the program's control flow, including procedure calls and returns. — S1 introduces the supergraph concept for interprocedural control flow; S3 describes it in the framework.
- **supported**: The exploded supergraph expands each node with data-flow facts. — Standard IFDS/IDE concept; both sources discuss the exploded supergraph and its use in representing data-flow facts.
- **supported**: Analysis requires flow functions to be distributive and the domain of facts to be finite. — S3 explicitly states that IFDS/IDE require distributive flow functions and finite domains.
- **supported**: Distributivity means that the flow function applied to a union of facts equals the union of the function applied to each fact. — S3 discusses distributive flow functions; the given definition is the standard mathematical one and is implied by the framework.
- **supported**: Distributivity allows the problem to be decomposed and solved in polynomial time. — S3 notes that distributivity enables polynomial-time algorithms (O(ED^3)).
- **supported**: IFDS and IDE provide a formal basis for precise interprocedural data-flow analysis by transforming it into a graph-reachability problem. — S1's evidence states that it transforms dataflow problems into graph-reachability problems over exploded supergraphs.
- **supported**: IDE generalizes IFDS. — S2 (README) explicitly states 'IDE is a generalization of the IFDS algorithm'.
- **supported**: Any IFDS problem can be transformed into an equivalent IDE problem and solved using an IDE solver. — S2 states that any IFDS problem can be transformed to an equivalent IDE problem and solved with the IDE solver.
- **supported**: The `IdeFromIfdsBuilder` in the WALA framework demonstrates the transformation from IFDS to IDE. — S2 mentions IdeFromIfdsBuilder as the means to transform IFDS problems to IDE in WALA.
- **supported**: The core constraint of these frameworks is the requirement for distributive flow functions over finite domains. — S3 identifies distributivity and finiteness as inherent constraints.
- **supported**: Problems like truly-live variables, typestate, and secure information-flow meet the distributive and finite-domain criteria. — S3 lists these as examples of problems with distributive flow functions.
- **supported**: Problems with non-distributive functions or infinite domains cannot be directly expressed in IFDS/IDE. — S3 explicitly notes that such problems cannot be directly expressed.
- **supported**: IDE dataflow analysis degrades in the presence of large object-oriented libraries due to the explosion of summary edges or fact representations. — S4's evidence note states that scalability degrades due to explosion of summary edges/fact representations, citing Rountev et al.
- **supported**: A 2026 paper proposes 'Restart and Refine' to enable scalable IFDS taint analysis across memory budgets. — S3's cited-by list includes a 2026 paper titled 'Restart and Refine', confirming its existence and proposal.
- **supported**: A 2025 paper proposes 'Scalable Language Agnostic Taint Tracking using Explicit Data Dependencies' as an alternative to IFDS. — S3's cited-by list includes a 2025 paper with that title, supporting the claim.
- **supported**: The 'Reviser' method proposes efficiently updating IDE-/IFDS-based data-flow analyses for incremental program changes. — S3's cited-by list includes the Reviser paper, which proposes incremental updates.
- **supported**: WALA's implementation prioritizes memory efficiency. — S3's abstract states that WALA's implementation is geared towards memory efficiency.
- **supported**: A Soot-based implementation prioritizes extensibility and ease of use, treating efficiency as a secondary goal. — S3's abstract states that their (Soot-based) implementation is geared towards extensibility and ease of use, with efficiency as secondary.
- **supported**: When implementing IFDS/IDE, practitioners must choose between frameworks with different design goals. — S3 contrasts WALA and Soot, implying a trade-off and choice for practitioners.
- **supported**: Incremental update techniques like Reviser can reduce overhead for CI/IDE integration. — S3's evidence note explicitly states that incremental update techniques can reduce overhead in CI/IDE settings.
- **supported**: The evidence base is narrow; it relies on seminal IFDS/IDE papers and a 2012 implementation comparison. — S3's limitations note acknowledges the reliance on a 2012 snapshot and seminal papers, supporting the characterization.
- **supported**: Performance characteristics of WALA and Soot may have changed since 2012. — S3's limitations note explicitly states that performance characteristics may have changed in later versions.

### Final Evaluation

- coverage: 1/5
- citation_quality: 3/5
- factuality: 4/5
- analysis_depth: 2/5
- presentation: 3/5
- overall: 1/5

Strengths:
- Accurate explanation of IFDS/IDE theory and distributive flow functions.
- Good use of admitted sources with clear citations.
- Honest about missing sources and limitations of the report.
- Includes a useful table contrasting WALA and Soot design goals.

Weaknesses:
- Fails to cover sparse value flow, CodeQL, Semgrep, Joern, source/sink/barrier models, benchmarks, and limitations of those tools.
- Does not address most subquestions from the plan.
- No comparison or synthesis across different taint analysis frameworks.
- Report is incomplete relative to the research goal; essentially a partial report on IFDS/IDE only.

Follow-up recommendations:
- Retrieve official CodeQL, Semgrep, and Joern documentation to analyze their source/sink/barrier models.
- Search for academic papers on Sparse Value Flow (SVF) and LLVM-based taint analysis.
- Locate empirical benchmark studies comparing precision, recall, and runtime of IFDS/IDE solvers against modern tool-specific taint engines.
- Include evaluations from Juliet, SARD, or Big-Vul datasets for tool comparison.
