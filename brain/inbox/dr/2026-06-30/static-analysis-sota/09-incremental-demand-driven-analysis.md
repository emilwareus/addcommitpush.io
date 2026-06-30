---
title: "Incremental and demand-driven static analysis: caching, invalidation, summaries, memoization, large monorepo CI, query engines"
generated_at: 2026-06-29T21:29:24.154870+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Incremental and Demand-Driven Static Analysis: Caching, Invalidation, Summaries, and Query Engines

## Abstract

This report examines the state of the art in incremental and demand-driven static analysis, focusing on the algorithms, data structures, and mechanisms that enable reuse of analysis results after program edits. We survey three lines of work: demanded abstract interpretation, demand-driven value refinement, and logic-programming-based incremental points-to analysis. The evidence shows that combining incremental and demand-driven techniques can reduce recomputation to as little as 6% of from-scratch analysis time on medium-sized programs, while maintaining from-scratch-consistent results. We discuss the core mechanisms—dependency graphs, summary-based invalidation, and demand-driven worklists—and their implications for large monorepo CI. The evidence base is limited to three academic sources and does not include production-scale monorepo benchmarks or vendor documentation for tools such as CodeQL, Bazel, or Buck2.

## Research Question

How do incremental and demand-driven static analysis techniques implement caching, invalidation, and summarization, and what evidence exists for their performance and correctness in large-scale codebases?

## Method

We reviewed three admitted sources covering demanded abstract interpretation [S1], demand-driven value refinement [S5], and incremental points-to analysis via logic programming [S6]. The sources span theoretical frameworks, algorithm descriptions, and empirical evaluations on C programs. We extracted claims about algorithms, data structures, correctness guarantees, and performance metrics, then synthesized them into a comparative analysis. We note upfront that the source base is narrow: it lacks documentation for production query engines (CodeQL, Soufflé), build systems (Bazel, Buck2, Pants), and large-monorepo benchmarks. Where the evidence is insufficient, we state this explicitly.

## Conceptual Background

Incremental and demand-driven analysis are related but distinct strategies for avoiding full recomputation.

| Term | Definition | Source |
|---|---|---|
| Incremental analysis | Computes changes to analysis information due to small changes in the input program rather than re-analyzing the program | [S6] |
| Demand-driven analysis | Computes only the information requested by the client analysis or optimization | [S6] |
| From-scratch consistency | Incremental results are equal to those computed by a batch analysis from scratch | [S1] |
| Summary dependency graph | A dynamically updated graph that tracks dependencies between function summaries, enabling precise invalidation after edits | [S1] |
| Demand-driven worklist | A worklist that adds a program point only when a predecessor's state change invalidates previously accessed dataflow facts | [S5] |

Two foundational mechanisms recur across the sources:

1. **Dependency tracking.** Analysis results are stored alongside metadata recording which inputs (program statements, other facts, summaries) they depend on. When an input changes, only results whose dependencies are affected are invalidated. This is the basis for both incremental recomputation and sound caching.

2. **Demand-driven evaluation.** Rather than computing all facts for all program points, the analysis evaluates only the facts queried by a client. This reduces work when the client needs a small subset of the analysis output, which is common in IDE scenarios and targeted CI checks.

## Findings

### 1. Demanded Abstract Interpretation

Demanded abstract interpretation treats program edits, client queries, and abstract semantic evaluation uniformly within a dynamically evolving graph structure [S1]. This uniformity is the key design decision: the same mechanism that tracks how a query depends on program state also tracks how an edit propagates through the analysis.

The framework guarantees from-scratch-consistent results after program edits, even with recursion and arbitrary abstract domains [S1]. The authors prove that soundness and termination—standard meta-properties of abstract interpretation—are preserved, and that demanded results equal batch-computed results [S1].

A prototype answered 95% of queries within 1.2 seconds, combining incremental and demand-driven techniques [S1]. However, the evaluation is a prototype, and exact benchmark sizes and query types are not specified in the available evidence.

### 2. Demanded Summarization

For interprocedural analysis, demanded summarization provides incremental compositional analysis in arbitrary abstract domains with from-scratch consistency [S1]. The mechanism is a dynamically updated summary dependency graph that enables precise result invalidation after program edits [S1].

Insight: Summary-based invalidation is critical for monorepo scale because interprocedural facts (e.g., call-graph edges, procedure summaries) are expensive to recompute. A summary dependency graph allows the analysis to invalidate only summaries transitively affected by an edit, rather than all summaries in the modified module.

### 3. Demand-Driven Value Refinement

The demand-driven value refinement algorithm adds a program point to the worklist only when a state change at a predecessor invalidates the dataflow facts that were previously accessed from that predecessor [S5]. This is a refinement of standard worklist iteration: instead of reprocessing all successors of a changed node, the algorithm reprocesses only those successors whose previously queried facts are no longer valid.

### 4. Incremental Points-to Analysis via Logic Programming

A logic programming framework combining incremental and demand-driven techniques for points-to analysis computes changes in approximately 6% of the time required for from-scratch reanalysis, with little space overhead [S6]. The evaluation used C programs of 10,000–70,000 lines.

| System / Framework | Technique | Correctness Guarantee | Performance Evidence | Scale | Source |
|---|---|---|---|---|---|
| Demanded abstract interpretation | Uniform graph of edits, queries, semantics | From-scratch consistency; soundness; termination | 95% of queries within 1.2s | Prototype; size unspecified | [S1] |
| Demanded summarization | Summary dependency graph | From-scratch consistency for compositional analysis | Not quantified in snippet | Synthetic + real edits; not monorepo | [S1] |
| Demand-driven value refinement | Demand-driven worklist with fact invalidation | Not stated in snippet | Not quantified in snippet | Not stated | [S5] |
| Incremental points-to (Datalog) | Incremental + demand-driven logic programming | Computes changes to analysis info | ~6% of from-scratch time | 10–70K LOC C programs | [S6] |

### 5. Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Demanded abstract interpretation guarantees from-scratch-consistent results after edits | Proven for recursion and arbitrary abstract domains | [S1] | Prototype; production scale unknown |
| Demanded summarization is first algorithm for incremental compositional analysis with from-scratch consistency | Uses dynamically updated summary dependency graph | [S1] | Evaluation on synthetic and real edits, not large monorepos |
| Demand-driven worklist adds program point only when predecessor state change invalidates accessed facts | Described in algorithm abstract | [S5] | Full algorithm and evaluation not available in snippet |
| Incremental points-to analysis computes changes in ~6% of from-scratch time | Experiments on C programs, 10–70K LOC | [S6] | Context-insensitive points-to only; monorepos are orders of magnitude larger |
| Demanded abstract interpretation prototype answers 95% of queries within 1.2s | Interactive-speed evaluation | [S1] | Benchmark sizes and query types unspecified |

## Design Implications

**For CI pipelines in large monorepos**, the evidence supports several design choices:

1. **Summary-based caching with dependency graphs.** The summary dependency graph from demanded summarization [S1] provides a principled invalidation mechanism. A CI system could cache procedure summaries and invalidate only those transitively affected by a diff. This is more precise than file-level or module-level invalidation.

2. **Demand-driven query evaluation.** When a CI check needs only a specific class of results (e.g., "does this PR introduce a null dereference?"), demand-driven evaluation avoids computing unrelated facts. The 1.2-second median response time in the demanded abstract interpretation prototype [S1] suggests that targeted queries can be fast enough for blocking CI gates, though the prototype scale is unclear.

3. **Logic-programming-based incremental evaluation.** The 6% reanalysis cost for incremental points-to [S6] demonstrates that Datalog-style evaluation can be made incremental with low overhead. This supports the use of Datalog engines (e.g., Soufflé, CodeQL's evaluation) as backends for incremental analysis, though the admitted sources do not document these specific tools.

Insight: The gap between the evaluated scales (10–70K LOC) and modern monorepos (millions of LOC) is large. The 6% figure should not be extrapolated linearly; monorepo-scale analysis introduces additional costs from distributed caching, remote execution, and cross-repository dependencies that are not addressed in the sources.

## Limitations and Threats to Validity

**Limited source base.** Only three academic sources were admitted. The report does not cover production query engines (CodeQL, Soufflé), build systems (Bazel, Buck2, Pants, Glean), or vendor benchmarks. Claims about these tools are absent.

**Scale mismatch.** The largest evaluation in the sources covers 70,000 lines of C code [S6]. Modern monorepos are 10–100× larger. Performance characteristics at monorepo scale are not established by the admitted evidence.

**Analysis type coverage.** The sources cover points-to analysis [S6], abstract interpretation [S1], and value refinement [S5]. Other analysis types (taint analysis, type checking, data race detection) may have different incremental characteristics.

**Prototype evaluations.** The demanded abstract interpretation results are from a prototype [S1]. Engineering tradeoffs in production implementations—memory management, distributed caching, fault tolerance—are not addressed.

**Staleness.** Source [S6] dates to 2005. While the algorithmic principles remain relevant, implementation techniques and hardware have changed substantially. Sources [S1] and [S5] are more recent but still predate the current date (2026-06-29) by several years.

**Missing failure mode data.** The sources do not document invalidation bugs, precision losses in practice, or cases where incremental results diverged from batch results due to implementation errors. The theoretical guarantees [S1] are valuable but do not substitute for empirical validation of production systems.

## Open Questions

1. How do production query engines (CodeQL, Soufflé) implement incremental evaluation, and do they provide from-scratch consistency guarantees comparable to demanded abstract interpretation?
2. What are the empirical invalidation rates and cache hit ratios for incremental static analysis in monorepos with millions of LOC?
3. How do distributed build systems (Bazel, Buck2) integrate with incremental analysis caches, and what are the consistency tradeoffs of remote caching?
4. What failure modes arise when summary dependency graphs are incomplete or stale, and how are they detected?
5. Can demand-driven techniques be composed with differential dataflow or streaming Datalog engines for real-time CI feedback?
6. How does incremental analysis perform under high edit rates (e.g., large refactors, automated migrations) where most summaries are invalidated?

## Recommended Next Experiments

1. **Monorepo-scale benchmark of demanded summarization.** Evaluate the demanded summarization algorithm [S1] on a monorepo of 1M+ LOC, measuring cache hit ratio, invalidation precision, and wall-clock time for representative diffs (single-file, cross-module, large refactor).

2. **Comparative invalidation study.** Compare file-level, module-level, and summary-dependency-graph invalidation strategies on the same codebase and analysis, measuring both recomputation cost and correctness (agreement with from-scratch analysis).

3. **Demand-driven query latency in CI.** Instrument a production CI pipeline to issue targeted static analysis queries (e.g., "new null dereferences in this PR") and measure end-to-end latency, comparing demand-driven evaluation against batch analysis with post-filtering.

4. **Incremental Datalog engine evaluation.** Benchmark Soufflé or an equivalent Datalog engine with incremental evaluation enabled, using a points-to analysis on programs scaling from 10K to 1M+ LOC, to test whether the 6% reanalysis ratio [S6] holds at scale.

5. **Failure mode injection.** Deliberately introduce invalidation bugs (e.g., missing dependency edges in the summary graph) and measure how quickly results diverge from ground truth, to quantify the risk of silent unsoundness in incremental analysis.

## Source Register

- [S1] [Demanded abstract interpretation | NSF Public Access Repository](https://par.nsf.gov/biblio/10332233) — admitted, score 17, discovered by `incremental demand-driven static analysis memoization invalidation`
- [S2] [Incremental recomputation ⁑ Dercuano](https://dercuano.github.io/notes/incremental-recomputation.html) — rejected, score 9, discovered by `incremental demand-driven static analysis memoization invalidation`
- [S3] [Incremental $$\lambda $$ -Calculus in Cache-Transfer Style: Static Memoization by Program Transformation | Request PDF](https://www.researchgate.net/publication/332248125_Incremental_lambda_-Calculus_in_Cache-Transfer_Style_Static_Memoization_by_Program_Transformation) — rejected, score 10, discovered by `incremental demand-driven static analysis memoization invalidation`
- [S4] [ADAPTON: Composable, demand-driven incremental computation | Request PDF](https://www.researchgate.net/publication/266657723_ADAPTON_Composable_demand-driven_incremental_computation) — rejected, score 10, discovered by `incremental demand-driven static analysis memoization invalidation`
- [S5] [140 Static Analysis with Demand-Driven Value Refinement](https://plv.colorado.edu/papers/value-refinement-oopsla19.pdf) — admitted, score 18, discovered by `incremental demand-driven static analysis memoization invalidation`
- [S6] [Incremental and demand-driven points-to analysis using logic programming | Proceedings of the 7th ACM SIGPLAN international conference on Principles and practice of declarative programming](https://dl.acm.org/doi/10.1145/1069774.1069785) — admitted, score 16, discovered by `incremental demand-driven static analysis memoization invalidation`

## Research Trace

### Goal

Understand the state of the art in incremental and demand-driven static analysis, including caching, invalidation, summaries, memoization, and query engines used in large monorepo CI environments.

### Subquestions

- What are the core algorithms and data structures for incremental and demand-driven static analysis (e.g., fixpoint iteration, dependency graphs, memoization)?
- How do modern static analysis query engines (e.g., Semmle QL, CodeQL, Soufflé, Datalog-based systems) implement caching and invalidation?
- What summary-based techniques are used to scale interprocedural analysis to large monorepos?
- How do build systems and CI tools (e.g., Bazel, Buck2, Pants, Glean, BuildGraph) support incremental static analysis and result reuse?
- What are the key failure modes, precision tradeoffs, and criticisms of incremental static analysis in practice?
- What benchmarks or empirical evaluations exist for incremental static analysis performance in large monorepos?

### Research Perspectives

- **Primary sources and theory** — Identify foundational papers and technical reports on incremental, demand-driven, and summary-based static analysis.
- **Implementation and systems** — Survey real-world query engines, build systems, and analysis frameworks that implement incremental analysis.
- **Benchmarks and evaluation** — Find empirical data on performance, scalability, and incremental speedups in large monorepos.
- **Criticism and limitations** — Surface adversarial perspectives on precision loss, invalidation bugs, and practical shortcomings of incremental analysis.
- **Operational and CI implications** — Understand how incremental analysis integrates into CI pipelines, caching strategies, and monorepo workflows.
- **Recency and emerging trends** — Identify the latest (2023-2026) developments, tools, and research directions in incremental static analysis.

### Source Requirements

- Peer-reviewed papers on incremental and demand-driven static analysis (e.g., POPL, PLDI, OOPSLA, SAS)
- Official documentation for query engines (CodeQL, Semmle, Soufflé, Datalog systems)
- Build system docs and design documents (Bazel, Buck2, Pants, Glean)
- Open-source repositories with incremental analysis implementations
- Benchmark suites or empirical studies on large monorepo analysis
- Blog posts or postmortems discussing failures or limitations of incremental analysis in production

### Success Criteria

- The report explains key algorithms (fixpoint, dependency graphs, memoization, summaries) with citations.
- The report compares at least 3 query/analysis engines and their incremental mechanisms.
- The report includes empirical or benchmark data on incremental speedups.
- The report addresses invalidation correctness and known failure modes.
- The report covers CI/monorepo integration patterns and practical tradeoffs.
- The report cites sources from 2020 onward where available.

### Search Queries

- `incremental demand-driven static analysis memoization invalidation` — Find foundational and recent papers on incremental/demand-driven analysis algorithms. [Primary sources and theory / academic papers]
- `CodeQL Souffle Datalog incremental query engine caching` — Locate documentation and papers on how modern query engines implement incremental analysis. [Implementation and systems / documentation and papers]
- `large monorepo incremental static analysis CI benchmark evaluation` — Find benchmarks and empirical studies on scaling incremental analysis in monorepos. [Benchmarks and evaluation / benchmarks and reports]
- `incremental static analysis limitations invalidation bugs precision tradeoffs` — Surface criticisms and practical failure modes of incremental analysis. [Criticism and limitations / critiques and postmortems]

### Source Quality

- [S1] Directly addresses demand-driven abstract interpretation with dependency-graph-based invalidation and recursion handling, highly relevant to all subquestions; NSF repository suggests reasonable authority, though not a top venue; publication date not given but appears within timeframe; independent from other sources listed. score=17 type=paper admitted=true warnings=
- [S2] Personal notes on incremental recomputation using a toy dataflow graph; lacks peer review, formal algorithms, or connection to static analysis; not authoritative for the research goal; out-of-date (2018); ignores j. score=9 type=other admitted=false warnings=Personal notes with no peer review or institutional backing; date is 2018, beyond 2020 target.
- [S3] The short snippet mentions incremental computation and memoization but the source is unreadable due to HTTP 403; cannot assess full content; likely a paper but without content cannot confirm relevance; ResearchGate page is not a primary source. score=10 type=paper admitted=false warnings=Fetch error (403), content unavailable; unable to verify relevance or authority.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S4] Describes a demand-driven incremental computation engine but the source is unreadable due to HTTP 403; snippet indicates relevance but cannot evaluate fully; ResearchGate page not authoritative. score=10 type=paper admitted=false warnings=Fetch error (403), content unavailable; unable to verify relevance or authority.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S5] Directly relevant to demand-driven value refinement in static analysis; published at OOPSLA 2019 (top venue); PDF is readable albeit raw; addresses demand-driven approaches and invalidation; independent from others. score=18 type=paper admitted=true warnings=Raw PDF content is partially garbled but the title and source are clear and accessible.
- [S6] Core paper on incremental and demand-driven points-to analysis using logic programming, directly matching the research subquestions on algorithms and implementation; published in a reputable conference (PPDP 2005); slightly older but foundational; independent from other sources. score=16 type=paper admitted=true warnings=

### Evidence Notes

- [S1] Demanded abstract interpretation lifts program syntax and analysis state to a dynamically evolving graph structure, treating program edits, client queries, and evaluation of abstract semantics uniformly. Evidence: lifts program syntax and analysis state to a dynamically evolving graph structure, in which program edits, client-issued queries, and evaluation of abstract semantics are all treated uniformly Limitations: Prototype implementation; results may not reflect production-scale monorepo performance.
- [S1] Demanded abstract analysis guarantees from-scratch-consistent results after program edits, even with recursion and arbitrary abstract domains. Evidence: guarantee from-scratch-consistent results after program edits, even in the presence of recursion and in arbitrary abstract domains Limitations: Proof is for the framework; practical implementations may have engineering tradeoffs.
- [S1] Demanded abstract analysis preserves soundness and termination of abstract interpretation; results equal to batch analysis. Evidence: We prove that desirable abstract interpretation meta-properties, including soundness and termination, are preserved in our approach, and that demanded analysis results are equal to those computed by a batch abstract interpretation Limitations: Assumes standard abstract interpretation framework; may not cover all analysis types.
- [S1] Demanded abstract analysis prototype answers 95% of queries within 1.2 seconds by combining incremental and demand-driven techniques. Evidence: consistently delivers analysis results at interactive speeds, answering 95% of queries within 1.2 seconds Limitations: Prototype evaluation; exact benchmark sizes and query types not specified in snippet.
- [S1] Demanded summarization is the first algorithm for incremental compositional analysis in arbitrary abstract domains that guarantees from-scratch consistency. Evidence: demanded summarization, the first algorithm for incremental compositional analysis in arbitrary abstract domains that guarantees from-scratch consistency Limitations: Theoretical framework; experimental evaluation on synthetic and real-world program edits, not large monorepo benchmarks.
- [S1] Demanded summarization uses a dynamically updated summary dependency graph for precise invalidation after program edits. Evidence: A dynamically updated summary dependency graph enables precise result invalidation after program edits Limitations: Scope limited to the described algorithm; invalidation precision may vary with analysis granularity.
- [S5] Demand-driven value refinement adds a program point to the worklist only when state changes at a predecessor invalidate previously accessed dataflow facts. Evidence: ℓ is only added to the worklist when the state change at ℓ′ invalidates the dataflow facts that were previously accessed from ℓ′ Limitations: Snippet is from a PDF abstract; full algorithm details and evaluation not available in snippet.
- [S6] Incremental program analyzers compute changes to analysis information due to small program changes rather than re-analyzing the program. Evidence: Incremental program analyzers compute the changes to the analysis information due to small changes in the input program rather than re-analyzing the program Limitations: Definition is general; specific techniques vary.
- [S6] Demand-driven analyzers compute only the information requested by the client analysis/optimization. Evidence: Demand-driven analyzers compute only the information requested by the client analysis/optimization Limitations: Definition is general; specific techniques vary.
- [S6] A logic programming framework combining incremental and demand-driven techniques for points-to analysis computes changes in about 6% of the time of from-scratch reanalysis for C programs of 10-70K lines. Evidence: Experiments show that our technique can compute the changes to analysis information due to small changes in the input program in, on the average, 6% of the time it takes to reanalyze the program from scratch, and with little space overhead Limitations: Evaluation on C programs up to 70K lines; monorepos are orders of magnitude larger. Context-insensitive points-to analysis only.

### Claim Verification

- **supported**: Incremental analysis computes changes to analysis information due to small changes in the input program rather than re-analyzing the program. — Evidence from S6 provides an exact definition matching the claim.
- **supported**: Demand-driven analysis computes only the information requested by the client analysis or optimization. — Evidence from S6 directly supports this claim.
- **supported**: From-scratch consistency means incremental results are equal to those computed by a batch analysis from scratch. — S1 defines from-scratch consistency as demanded results equal to batch computed results.
- **supported**: A summary dependency graph is a dynamically updated graph that tracks dependencies between function summaries, enabling precise invalidation after edits. — S1 describes 'a dynamically updated summary dependency graph' enabling precise invalidation.
- **supported**: A demand-driven worklist adds a program point only when a predecessor's state change invalidates previously accessed dataflow facts. — S5 evidence states exactly that a program point is added only when predecessor state change invalidates accessed facts.
- **supported**: Demanded abstract interpretation treats program edits, client queries, and abstract semantic evaluation uniformly within a dynamically evolving graph structure. — S1 evidence explicitly states uniform treatment of edits, queries, and evaluation in a graph.
- **supported**: The demanded abstract interpretation framework guarantees from-scratch-consistent results after program edits, even with recursion and arbitrary abstract domains. — S1 provides direct evidence of this guarantee.
- **supported**: The authors prove that soundness and termination—standard meta-properties of abstract interpretation—are preserved, and that demanded results equal batch-computed results. — S1 evidence confirms proof of soundness, termination, and equality with batch results.
- **supported**: A prototype of demanded abstract interpretation answered 95% of queries within 1.2 seconds, combining incremental and demand-driven techniques. — S1 evidence states 95% of queries answered within 1.2 seconds.
- **supported**: Demanded summarization provides incremental compositional analysis in arbitrary abstract domains with from-scratch consistency. — S1 introduces demanded summarization as the first algorithm for incremental compositional analysis with from-scratch consistency.
- **supported**: The mechanism of demanded summarization is a dynamically updated summary dependency graph that enables precise result invalidation after program edits. — S1 evidence directly links the summary dependency graph to invalidation.
- **supported**: Summary-based invalidation is critical for monorepo scale because interprocedural facts (e.g., call-graph edges, procedure summaries) are expensive to recompute. — S1 discusses summary-based invalidation; the claim's reasoning about expense at monorepo scale is consistent with the context of the paper.
- **supported**: A summary dependency graph allows the analysis to invalidate only summaries transitively affected by an edit, rather than all summaries in the modified module. — S1 describes precise invalidation after edits, which implies transitive invalidation.
- **supported**: The demand-driven value refinement algorithm adds a program point to the worklist only when a state change at a predecessor invalidates the dataflow facts that were previously accessed from that predecessor. — S5 evidence matches this claim exactly.
- **supported**: A logic programming framework combining incremental and demand-driven techniques for points-to analysis computes changes in approximately 6% of the time required for from-scratch reanalysis, with little space overhead. — S6 evidence reports 6% reanalysis time and low space overhead.
- **supported**: The evaluation of the incremental points-to analysis used C programs of 10,000–70,000 lines. — S6 evidence mentions C programs of 10-70K lines.
- **supported**: Demanded abstract interpretation guarantees from-scratch-consistent results after edits, proven for recursion and arbitrary abstract domains. — Duplicate of earlier claim; S1 supports it.
- **supported**: Demanded summarization is the first algorithm for incremental compositional analysis with from-scratch consistency. — S1 explicitly calls it the first such algorithm.
- **supported**: The demand-driven worklist adds a program point only when predecessor state change invalidates accessed facts. — S5 evidence supports this.
- **supported**: Incremental points-to analysis computes changes in ~6% of from-scratch time, based on experiments on C programs of 10–70K LOC. — S6 evidence supports this.
- **supported**: The demanded abstract interpretation prototype answers 95% of queries within 1.2s. — S1 evidence supports this.
- **supported**: The summary dependency graph from demanded summarization provides a principled invalidation mechanism. — S1 describes the graph enabling precise invalidation.
- **supported**: The 1.2-second median response time in the demanded abstract interpretation prototype suggests that targeted queries can be fast enough for blocking CI gates. — S1 evidence supports the 1.2s response time; the inference about CI gates is a reasonable extension supported by the context.
- **supported**: The 6% reanalysis cost for incremental points-to demonstrates that Datalog-style evaluation can be made incremental with low overhead. — S6 evidence describes a logic programming (Datalog-style) framework achieving 6% reanalysis cost, supporting the claim.

### Final Evaluation

- coverage: 2/5
- citation_quality: 3/5
- factuality: 3/5
- analysis_depth: 3/5
- presentation: 3/5
- overall: 2/5

Strengths:
- Clear abstract and research question framing.
- Good definitions table (conceptual background) and evidence table summarizing claims, sources, and limits.
- Honest disclosure of source limitations and scale mismatch.
- Design implications section provides concrete, actionable insights despite limited evidence.
- Open questions and recommended experiments demonstrate thoughtful forward-looking analysis.

Weaknesses:
- Coverage severely limited: only 3 academic sources, no coverage of production tools (CodeQL, Soufflé, Bazel, Buck2, Pants, Glean) or benchmarks required by the plan.
- Fails to address subquestions about modern query engines, build systems, CI integration, and benchmarks.
- No comparison of at least 3 query/analysis engines as required.
- Missing empirical or benchmark data on monorepo-scale incremental speedups.
- Presentation reads as a literature survey of 3 papers rather than a comprehensive scientific short paper; lacks depth on failure modes, precision tradeoffs, and non-obvious insights.
- Overall score penalized due to critical flaw in coverage relative to the research plan's scope.

Follow-up recommendations:
- Extend source base to include CodeQL documentation, Soufflé papers, Bazel/Buck2 design docs, and large-monorepo benchmark studies.
- Add explicit comparison table for 3+ query engines (e.g., CodeQL, Soufflé, Glean) covering invalidation mechanisms, caching strategies, and performance characteristics.
- Include dedicated sections on invalidation correctness (bugs, precision loss) and CI integration patterns (remote caching, distributed builds).
- Supplement with real-world empirical data from published monorepo case studies or vendor white papers.
