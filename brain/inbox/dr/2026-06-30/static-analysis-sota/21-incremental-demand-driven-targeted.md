---
title: "Incremental and demand-driven static analysis targeted sources: salsa rust-analyzer incremental computation, CodeQL database/query model, build systems, caching and invalidation limits"
generated_at: 2026-06-29T22:23:31.110310+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Incremental and Demand-Driven Static Analysis: Salsa, Rust-Analyzer, and the Limits of Query Memoization

## Abstract

This report examines how incremental, demand-driven static analysis systems implement caching, invalidation, and query scheduling, drawing on admitted sources covering the Salsa incremental computation framework and its use in rust-analyzer, plus the experimental Granularity project. The evidence base is narrow: it does not include CodeQL documentation, build-system theory papers, or recent benchmarks. Within this scope, the report explains Salsa's query-graph model, lazy invalidation, early cutoff, and durability optimization, and identifies documented failure modes including over-invalidation, volatile-detail leakage, and the engineering cost of designing effective cutoff shields. Where the evidence is silent on CodeQL and build systems, the report says so explicitly.

## Research Question

How do incremental and demand-driven static analysis systems implement caching, invalidation, and query scheduling, and what are their documented limitations?

Sub-questions:

1. How does Salsa implement incremental, demand-driven computation, and what are its invalidation and caching guarantees?
2. How does rust-analyzer leverage Salsa, and what performance/invalidation limitations are documented?
3. How do build-system concepts (memoization, dependency tracking, demand-driven evaluation) apply to static analysis?
4. What failure modes produce stale, incorrect, or over-invalidated results?

The original plan also asked about CodeQL's database/query model and recent benchmarks. The admitted source register contains no sources for these topics, so they are addressed only as gaps.

## Method

This report synthesizes evidence from two admitted sources: a rust-analyzer blog post explaining Salsa's durable incrementality design [S2], and the repository for Granularity, an experimental fine-grained incremental computation library for Rust [S3]. No additional sources were admitted. The analysis distinguishes claims directly supported by these sources from inferences drawn by connecting them. Where the evidence base is insufficient to answer a sub-question, the report states this rather than speculating.

## Conceptual Background

Incremental computation systems recompute only the outputs affected by changed inputs, rather than re-running everything. They typically combine three mechanisms: memoization (caching query results), dependency tracking (recording which inputs each output read), and invalidation (marking cached results stale when inputs change). Demand-driven (pull-based) systems compute outputs lazily, only when requested, and validate caches at query time. Push-based systems propagate changes eagerly from inputs to dependents.

| Term | Meaning |
|---|---|
| Query | A function call with specific arguments, treated as a cacheable unit |
| Revision / version | A counter incremented when inputs change, used to detect staleness |
| Dependency graph | Recorded edges from each query to the queries/inputs it read |
| Early cutoff | Reuse of a cached result when a recomputation yields the same value, shielding dependents |
| Durability | A stability level assigned to inputs, used to avoid invalidating stable queries |
| Pull-based invalidation | Validation deferred to query execution time |
| Push-based invalidation | Eager propagation of changes through the dependency graph |

## Findings

### Salsa's Query-Graph Model

Salsa records a full dependency graph during execution. Each query is identified by function plus arguments, so `f("foo")` and `f("bar")` are distinct cache entries [S2]. This means the granularity of caching is at the level of individual function calls with specific argument values, not coarse file-level or module-level units.

Insight: Argument-level query identity is what enables fine-grained reuse in static analysis. A query computing the type of one function does not invalidate when an unrelated function changes, provided the dependency graph is complete.

### Lazy Invalidation

Salsa does not eagerly invalidate dependents when an input changes. Instead, it increments a global version number in O(1) work and defers all validation to query execution time [S2]. When a query result is requested, Salsa performs two graph traversals: a forward flood from changed inputs, then a backward flood to determine which cached results are still valid [S2].

This design is suited to interactive editing, where many small changes occur but only a subset of queries is actually read. The cost is paid at query time, not at edit time.

### Early Cutoff

Even when a query's inputs change, the result may be unchanged. Salsa implements early cutoff: if recomputation produces the same value, dependents are shielded from invalidation [S2]. The blog post gives the example of a whitespace-only source change that does not alter the AST, allowing queries depending on the AST to be reused.

The effectiveness of early cutoff depends on data representation. If volatile details such as source positions leak into cached values, cutoff is defeated because any textual change alters the result [S2].

### Durability

Without durability, changing any source file invalidates queries related to stable dependencies. The blog post reports that in rust-analyzer, changing `src/lib.rs` forced checking all standard-library-related queries, adding approximately 300ms of overhead [S2].

Durability addresses this by assigning each input a stability level (volatile, normal, durable) and replacing the single version number with a version vector. A derived query's durability is the minimum durability among its immediate inputs. Changes to volatile inputs do not invalidate durable queries [S2].

Insight: Durability is a practical partitioning of the dependency graph by expected change frequency. It trades generality for speed: the system assumes a hierarchy of input stability, which holds for IDE editing (local files change often, standard library rarely) but may not hold in all analysis scenarios.

### Granularity: An Alternative Pull-Based Approach

Granularity is an experimental Rust incremental computation library that also uses a pull/on-demand approach. Its author states that push-based approaches "seem to be a lot more complicated and even semantically incorrect" [S3]. Granularity aims to provide reactive primitives without lifetime contexts and to support higher-order dependencies, where primitives are passed through the graph [S3].

The repository was archived in 2025 and does not provide benchmarks or formal proofs [S3]. Its critique of push-based methods is unsubstantiated within the source.

### Documented Limitations and Failure Modes

| Failure mode | Mechanism | Source |
|---|---|---|
| Over-invalidation of stable queries | Single version number invalidates all dependents regardless of input stability | [S2] |
| Defeated early cutoff | Volatile details (e.g., positions) in cached values prevent reuse | [S2] |
| Query-time traversal cost | Lazy invalidation requires forward and backward flood traversals | [S2] |
| Manual durability assignment | Incorrect levels cause stale results or unnecessary recomputation | [S2] |
| Higher-order dependency gaps | Dynamic dependency structures are a known challenge; Granularity did not solve them | [S3] |
| Incomplete dependency graph | Any missed edge yields stale results; sources do not describe detection | [S2] |

The blog post emphasizes that the bulk of engineering effort using Salsa is "figuring out things like this—introducing effective early cutoff shields and preventing volatile details like positions from accidentally sneaking in" [S2].

### What the Evidence Does Not Cover

The admitted sources do not address:

- CodeQL's database extraction model, query caching, or incremental boundaries.
- Build-system theory (e.g., "Build Systems à la Carte," Shake, Bazel).
- Formal correctness proofs for Salsa's invalidation.
- Benchmarks comparing incremental analysis systems on latency or memory.
- Recent (2023–2026) peer-reviewed research beyond the rust-analyzer blog post.

The blog post is from July 2023 [S2]. Granularity was archived in 2025 [S3]. No 2026 sources were admitted.

## Design Implications

1. **Design data representations for cutoff.** Cached values must exclude volatile details. For static analysis, ASTs should omit source positions, and tokens should be normalized where possible [S2].

2. **Assign durability conservatively.** Inputs that change rarely (standard library, external dependencies) should receive high durability. Misclassification risks either staleness (too durable) or wasted work (too volatile) [S2].

3. **Accept query-time cost as a trade-off.** Lazy invalidation shifts work from edit time to query time. For IDE responsiveness, this is usually correct, but for batch analysis where all queries are read, the traversal cost may dominate [S2].

4. **Higher-order dependencies remain an open problem.** Systems requiring dynamic dependency structures (layout engines, multi-pass analyses) may find current pull-based frameworks insufficient [S3].

5. **Do not assume push-based approaches are wrong.** The claim that push-based invalidation is "semantically incorrect" comes from an archived experimental project without formal validation [S3].

## Limitations and Threats to Validity

- **Narrow evidence base.** Only two sources were admitted, both from the Rust ecosystem. Claims about CodeQL, build systems, and comparative benchmarks could not be evaluated.
- **Vendor-adjacent source.** The rust-analyzer blog post [S2] is written by the tool's developers and presents Salsa favorably. Performance figures (e.g., 300ms) are specific to rust-analyzer and not independently verified.
- **Experimental source.** Granularity [S3] is an archived personal project. Its design claims are aspirational and unsupported by evaluation.
- **No formal correctness argument.** Neither source provides a proof that Salsa's invalidation is sound. The assumption that the dependency graph is complete is stated but not verified [S2].
- **Temporal scope.** The most recent source is from 2025 (Granularity archive). Salsa may have evolved since the 2023 blog post; this report cannot account for un-admitted developments.

## Open Questions

1. How does Salsa detect or recover from incomplete dependency graphs? The sources state that missed edges cause staleness but do not describe detection mechanisms [S2].
2. What is the actual cost of the forward and backward flood traversals for large query graphs, and how does it scale with codebase size?
3. How does CodeQL's extraction-and-query model compare to Salsa's query-graph model in terms of invalidation granularity?
4. Can durability be assigned automatically, or must it always be manual? The sources describe manual assignment only [S2].
5. Are there formal proofs that pull-based lazy invalidation is sound under concurrent edits or higher-order dependencies?

## Recommended Next Experiments

1. **Measure query-time traversal cost.** Instrument rust-analyzer to record forward and backward flood traversal times across codebases of varying size, correlating with query-graph depth.

2. **Test cutoff effectiveness empirically.** Apply a corpus of real edits (whitespace, refactors, API changes) and measure what fraction of queries achieve early cutoff, identifying common volatile-detail leaks.

3. **Compare pull vs. push invalidation.** Implement a push-based variant for a subset of rust-analyzer queries and compare invalidation accuracy and latency against Salsa's pull-based approach.

4. **Audit durability assignments.** Survey rust-analyzer's input classifications and test whether misassigning durability (e.g., marking a volatile input as durable) produces observable staleness.

5. **Expand the source base.** Admit CodeQL documentation, build-system theory papers, and 2024–2026 incremental analysis benchmarks to address the gaps identified in this report.

## Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Salsa records a full dependency graph of queries (function + arguments) | "f('foo') and f('bar') are two different queries" | [S2] | Assumes graph is complete; no detection mechanism described |
| Early cutoff shields dependents when recomputed result is unchanged | Whitespace changes reuse AST-dependent queries | [S2] | Defeated if volatile details leak into cached values |
| Lazy invalidation does O(1) work at input change, defers validation to query time | Global version number incremented on input change | [S2] | Two graph traversals needed at query time; cost unstudied at scale |
| Without durability, stdlib queries invalidated on any local edit (~300ms) | "any change to src/lib.rs necessitates checking all the queries related to standard library" | [S2] | Figure specific to rust-analyzer; not independently verified |
| Durability uses a version vector; volatile changes do not invalidate durable queries | Derived durability = minimum among immediate inputs | [S2] | Levels manually assigned; misassignment risks staleness or waste |
| Granularity uses pull-based approach; claims push-based is "semantically incorrect" | Author's stated rationale in repo README | [S3] | Archived project; claim unsubstantiated by proof or benchmark |
| Higher-order dependencies are needed for frameworks like layout engines | Primitives must pass through the graph without lifetime bounds | [S3] | No validated solution provided; project incomplete |
| Bulk of Salsa engineering is designing cutoff shields | "preventing volatile details like positions from accidentally sneaking in" | [S2] | Usability cost, not algorithmic limit; no quantitative measure |

## Source Register

- [S1] [Ark: Incremental and cancellable computations with salsa · Issue #3181 · posit-dev/positron](https://github.com/posit-dev/positron/issues/3181) — rejected, score 11, discovered by `salsa incremental computation rust invalidation demand-driven`
- [S2] [Durable Incrementality](https://rust-analyzer.github.io/blog/2023/07/24/durable-incrementality.html) — admitted, score 20, discovered by `salsa incremental computation rust invalidation demand-driven`
- [S3] [GitHub - pragmatrix/granularity: Fine-grained incremental-computation for Rust](https://github.com/pragmatrix/granularity) — admitted, score 13, discovered by `salsa incremental computation rust invalidation demand-driven`
- [S4] [Salsa · Julia Packages](https://juliapackages.com/p/salsa) — rejected, score 9, discovered by `salsa incremental computation rust invalidation demand-driven`
- [S5] [Salsa.jl: A framework for on-demand, incremental computation :: JuliaCon 2020 (times are in UTC) :: pretalx](https://pretalx.com/juliacon2020/talk/DBGWXK/) — rejected, score 8, discovered by `salsa incremental computation rust invalidation demand-driven`

## Research Trace

### Goal

Understand how incremental and demand-driven static analysis systems (salsa/rust-analyzer, CodeQL, build-system-inspired approaches) implement caching, invalidation, and query scheduling, and what their documented limitations are.

### Subquestions

- How does salsa implement incremental, demand-driven computation, and what are its invalidation and caching guarantees?
- How does rust-analyzer leverage salsa for incremental static analysis, and what are known performance/invalidation limitations?
- How does CodeQL's database/query model support incremental analysis, and what are its caching and invalidation boundaries?
- What techniques from build systems (e.g., memoization, dependency tracking, demand-driven evaluation) are applied to static analysis?
- What are documented or observed failure modes where incremental/demand-driven analysis produces stale, incorrect, or non-terminating results?
- What recent research or benchmarks compare incremental static analysis approaches on correctness and performance?

### Research Perspectives

- **Primary sources** — Find official docs, RFCs, repo READMEs, and design notes from salsa, rust-analyzer, and CodeQL.
- **Implementation** — Identify concrete mechanisms: query graphs, memoization, revision tracking, LRU caches, database snapshots.
- **Benchmarks and evaluation** — Locate performance numbers, case studies, and comparative evaluations of incremental analysis latency and memory.
- **Criticism and counterevidence** — Find issues, forum threads, papers, and critiques describing staleness, over-invalidation, cycles, or correctness bugs.
- **Recency** — Capture 2023–2026 developments in salsa, rust-analyzer, CodeQL, and incremental analysis research.
- **Operational implications** — Assess practical limits: cache size, invalidation granularity, CI integration, monorepo scale, and cold-start costs.

### Source Requirements

- salsa book / repo / design RFCs
- rust-analyzer architecture docs and GitHub issues
- CodeQL documentation and GitHub blog posts
- Peer-reviewed papers on incremental and demand-driven program analysis
- Build-system theory references (e.g., build systems à la carte, shake, bazel)
- Benchmarks or case studies from real-world codebases

### Success Criteria

- The report explains salsa's query model, revision/invalidation mechanism, and verified-reactivity approach with citations.
- The report describes rust-analyzer's use of salsa and at least two known limitations with issue/paper references.
- The report explains CodeQL's database extraction/query caching model and where incremental boundaries exist.
- The report connects build-system concepts (memoization, dependency graphs, demand-driven evaluation) to static analysis with concrete examples.
- The report includes at least three documented failure modes or critiques with sources.
- The report cites at least two recent (2023–2026) sources or releases.

### Search Queries

- `salsa incremental computation rust invalidation demand-driven` — Find salsa book/repo and design docs explaining query model and invalidation. [Primary sources / docs/repo]
- `rust-analyzer salsa incremental analysis performance limitations issues` — Locate rust-analyzer architecture docs and GitHub issues about invalidation/perf limits. [Criticism and counterevidence / issues/docs]
- `CodeQL database query model incremental analysis caching` — Find CodeQL docs and blog posts on extraction, query caching, and incremental boundaries. [Primary sources / docs/blog]
- `incremental demand-driven static analysis build systems memoization invalidation paper 2024` — Find recent research papers and benchmarks on incremental analysis and build-system-inspired techniques. [Recency / paper/benchmark]

### Source Quality

- [S1] Issue tracker discussion about using Salsa; only a brief snippet mentioning invalidation. Not authoritative for Salsa internals or limitations; thin on technical detail. score=11 type=other admitted=false warnings=Low authority GitHub issue, not official documentation or design RFC.
- [S2] Official rust-analyzer blog post detailing Salsa's durability optimization. Authoritative primary source, directly addresses query graph, invalidation, and early cutoff. Published 2023, well within recency requirement. Provides independent technical detail. score=20 type=docs admitted=true warnings=
- [S3] Alternative incremental computation library for Rust; useful for comparison and understanding different approaches (pull/on-demand). Lower authority than Salsa itself, but provides independent perspective on design choices. score=13 type=repo admitted=true warnings=Niche library, low stars, may not be actively maintained.
- [S4] Third-party package registry page describing Salsa.jl. Thin content, mostly marketing language. Not a primary source for the research question; adds little beyond what S2 or official docs provide. score=9 type=other admitted=false warnings=Thin SEO-oriented page, no technical depth.
- [S5] JuliaCon 2020 talk page about Salsa.jl; outdated (2020) and provides only high-level overview. Not useful for current research on Salsa/rust-analyzer limitations or recent developments. score=8 type=other admitted=false warnings=Outdated (2020), low technical detail.

### Evidence Notes

- [S2] Salsa records a full dependency graph (call graph) of queries (function plus arguments) during execution. Evidence: "When a Salsa-based program is executed, it records dependencies between between function calls. Afterwards, salsa gets a complete call graph like this: ... 'So, f("foo") and f("bar") are two different queries.'" Limitations: The graph must be complete and correct; any missed dependency could lead to stale results. The post does not discuss handling of missing edges.
- [S2] Salsa implements early cutoff: if a query's result is unchanged despite changed inputs (e.g., whitespace change in source), it shields higher queries from invalidation. Evidence: "It may be the case that, even if one input to a query changes, the result is still the same. ... Early cutoff takes advantage of that, and re-uses results which depend on the AST, but not on the original source file." Limitations: Effective early cutoff requires careful design to avoid exposing volatile details like source positions in the AST; otherwise, cutoff is defeated.
- [S2] Salsa uses lazy invalidation: input changes only increment a global version number (O(1) work), deferring all re-validation to query execution time. Evidence: "Instead, in Salsa the work for tracking invalidation is done when a fresh result for a query is request. ... Salsa has a global version number. Whenever an input changes, Salsa does only two things (so, O(1) ): change the input, increment the global version." Limitations: During query execution, two graph traversals are needed (forward flood, then backward flood), which can be costly for deep query graphs, especially without durability.
- [S2] Without the durability system, changing any source file (e.g., lib.rs) would invalidate all queries related to the standard library, adding ~300ms overhead in rust-analyzer. Evidence: "any change to src/lib.rs necessitates checking all the queries related to standard library (which adds up to about 300ms)." Limitations: The 300ms figure is specific to rust-analyzer and may vary; the post does not compare other approaches.
- [S2] Salsa's durability system assigns a durability level (volatile, normal, durable) to each input, uses a version vector instead of a single version, and ensures that changes to volatile inputs do not invalidate durable queries. Evidence: "we go from a single version number to a version vector. E.g., if we have three durability levels (volatile, normal, durable) , then our version is a tuple of three numbers. ... For derived queries, their durability is computed as the minimum durability among the immediate inputs. ... When checking a derived query, note its durability, and compare its version against the corresponding number from the versions vector." Limitations: Durability levels must be manually assigned to inputs; incorrect assignment could lead to unnecessary recomputation or stale results. The system assumes a hierarchical stability of inputs.
- [S3] Granularity is a fine-grained reactivity graph for Rust that uses a pull/on-demand approach because push-based approaches are considered more complicated and 'even semantically incorrect'. Evidence: "Granularity uses a pull / on-demand based 'naive' approach because push-based approaches seem to be a lot more complicated and even semantically incorrect." Limitations: Granularity is a personal/experimental project and was archived in 2025. Its claims about semantic incorrectness of push-based methods are not substantiated by benchmarks or formal proofs.
- [S3] Granularity's goals include providing reactive primitives without lifetime contexts, and supporting higher-order primitives (e.g., passing reactivity through the graph) for frameworks like layout engines. Evidence: "what I need from a reactive system are just the primitives without any context or lifetime bounds that is to care about. This is especially important when the primitives themselves need to be passed through the graph. For example, a layout engine ... may compute frame coordinates first while leaving the content primitives untouched" Limitations: Granularity was incomplete and archived; it does not provide a validated solution to the higher-order problem.
- [S2] The bulk of work using Salsa involves designing effective early cutoff shields (e.g., excluding positions from ASTs) to prevent volatile details from breaking incremental reuse. Evidence: "The bulk of work using an incremental system such as Salsa is figuring out things like this—introducing effective early cutoff shields and preventing volatile details like positions from accidentally sneaking in." Limitations: This is a usability/design issue, not a fundamental algorithm limitation, but it can impose significant engineering cost.

### Claim Verification

- **supported**: Salsa records a full dependency graph during execution, with each query identified by function plus arguments. — The evidence directly states that Salsa records dependencies between function calls and that queries include function name and arguments. The citation points to the correct source.
- **supported**: Salsa uses lazy invalidation: it increments a global version number on input change and defers validation to query execution time. — The evidence explicitly describes Salsa incrementing a global version number on input change and deferring invalidation work to query execution time. Citation matches.
- **supported**: Salsa implements early cutoff: if recomputation produces the same value, dependents are shielded from invalidation. — The evidence explains that if a query's result is unchanged despite changed inputs, early cutoff re-uses results that depend on the AST but not on the original source. Citation correct.
- **supported**: Without durability, changing any source file in rust-analyzer forces checking all standard-library-related queries, adding approximately 300ms of overhead. — The evidence states that any change to src/lib.rs necessitates checking all standard library queries, adding about 300ms. Citation is accurate.
- **supported**: Durability assigns each input a stability level (volatile, normal, durable) and uses a version vector; a derived query's durability is the minimum among its immediate inputs. — The evidence describes durability levels, version vectors, and that a derived query's durability is the minimum of its immediate inputs. Citation matches.
- **supported**: Granularity is an experimental Rust incremental computation library that uses a pull/on-demand approach and claims push-based approaches are 'semantically incorrect'. — The evidence from S3 states Granularity uses a pull/on-demand approach and that push-based approaches are considered 'even semantically incorrect'. Citation is correct.
- **supported**: The bulk of engineering effort using Salsa involves designing effective early cutoff shields and preventing volatile details like positions from leaking into cached values. — The evidence explicitly states that the bulk of work with Salsa is designing effective early cutoff shields and preventing volatile details like positions from sneaking in. Citation matches.
- **supported**: Granularity aims to support higher-order dependencies where primitives are passed through the graph, but the project was archived in 2025 without benchmarks or formal proofs. — The evidence mentions Granularity's goal of supporting higher-order primitives passed through the graph. The archived status and lack of benchmarks/proofs are noted in the evidence limitations. Citation is correct.

### Final Evaluation

- coverage: 2/5
- citation_quality: 3/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 3/5
- overall: 2/5

Strengths:
- Honest and explicit about gaps in evidence where CodeQL, build-system theory, and benchmarks are not covered.
- Clear explanation of Salsa's core mechanisms: query-graph model, lazy invalidation, early cutoff, durability, with specific examples.
- Useful evidence table that ties each claim to a source and states its limitations.
- Thoughtful discussion of design implications for data representation, durability assignment, and query-time costs.
- Identifies and documents concrete failure modes (over-invalidation, defeated cutoff, manual durability assignment).

Weaknesses:
- Coverage is severely incomplete: CodeQL database/query model, build-system inspiration (Bazel, Shake), and recent benchmarks (2023–2026) are entirely absent, making the report fail its research goal and success criteria.
- Citation density is very low (only two sources, one from 2023 and one archived experimental project) — insufficient to support a comparative analysis.
- No evidence tables for comparison of different incremental analysis approaches (e.g., Salsa vs. CodeQL vs. build systems), as omitted topics would require.
- Presentation includes generic AI filler phrases like 'incremental computation systems recompute only the outputs affected by changed inputs' without deeper synthesis across systems.
- Missing author-date citations inline; relies on source IDs [S2], [S3] in a way that obscures traceability to specific claims.

Follow-up recommendations:
- Admit CodeQL documentation and GitHub blog posts to cover its extraction model, query caching, and incremental analysis boundaries.
- Include build-system theory papers (e.g., 'Build Systems à la Carte', Shake, Bazel documentation) to connect memoization/dependency tracking to static analysis.
- Search for peer-reviewed benchmarks (2023–2026) comparing Salsa, rust-analyzer, CodeQL on latency, memory, invalidation accuracy, and failure modes.
- Add formal correctness arguments for Salsa's invalidation (e.g., proofs from salsa-rs/salsa repo or related papers).
- Include sources on higher-order dependencies in incremental computation (e.g., adapton, self-adjusting computation).
