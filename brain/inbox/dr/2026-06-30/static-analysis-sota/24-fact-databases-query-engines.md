---
title: "Fact databases and query engines for static analysis: CodeQL databases, Datalog, Souffle, Doop, bddbddb, Joern code property graph, Kythe or SCIP indexes, schema design, incremental updates, and query ergonomics"
generated_at: 2026-06-29T22:52:42.675370+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Fact Databases and Query Engines for Static Analysis: A Comparative Study of CodeQL, Datalog/Soufflé, Doop/bddbddb, and Index-Based Systems

## Abstract

Static analysis tools increasingly rely on dedicated fact databases and declarative query engines to express and evaluate program properties. This report compares five families of systems: CodeQL's relational QL databases, Soufflé's compiled Datalog dialect, the Doop framework for Java pointer analysis, bddbddb's BDD-backed Datalog, and index-based representations (Kythe, SCIP). We examine how each system models code facts, what query language it offers, whether it supports incremental updates, and where documented scalability and ergonomic limits arise. Evidence is drawn from official documentation and peer-reviewed papers. We find that CodeQL and Soufflé represent the two dominant Datalog-based approaches, differing in compilation strategy, modularity, and incremental support; Doop demonstrates order-of-magnitude speedups over BDD-based predecessors; and index formats like SCIP/Kythe occupy a different niche optimized for navigation rather than deep analysis. No single system dominates across all dimensions of schema expressiveness, query ergonomics, incremental updates, and scalability.

## Research Question

How do fact databases and query engines for static analysis differ in their fact models, query languages, schema design, incremental update support, and practical scalability, and what tradeoffs do these differences impose on analysis designers?

## Method

We reviewed official documentation for CodeQL [S1, S2, S3, S7], Soufflé [S8, S9, S10, S11, S13], and index formats, together with peer-reviewed papers on Doop [S15, S16, S17, S18], bddbddb [S22, S23, S25], and an overview of Datalog for static analysis [S24]. Where available, we examined benchmark infrastructure [S19] and community guides [S14]. We extracted claims about fact models, query languages, incremental support, and performance, then cross-referenced them to identify agreements and gaps. Because the source register lacks Joern CPG and Kythe/SCIP primary documentation, those systems are discussed at a conceptual level with explicit uncertainty flagged; no claims about their internals are source-backed.

## Conceptual Background

Static analysis requires representing code as facts (relations over program entities) and evaluating queries over those facts (e.g., reachability, data flow, pointer aliasing). Datalog is well-suited because it naturally expresses mutually recursive analyses and separates specification from evaluation order [S24]. Three execution strategies dominate: (1) interpreted semi-naive evaluation, (2) compilation to native code, and (3) symbolic representation via binary decision diagrams. Query ergonomics depend on type systems, modularity features, and whether the language supports object-oriented abstraction over flat relations.

### Concept Table

| Term | Meaning |
|---|---|
| Extensional database (EDB) | Base facts loaded from extraction; not derived. |
| Intensional database (IDB) | Derived facts computed by rules. |
| Stratified negation | Negation permitted only when there is no recursion through negation. |
| Semi-naive evaluation | Incremental fixpoint computation that only processes new tuples. |
| BDD | Binary Decision Diagram; compact representation of Boolean functions used to encode large relations. |
| TRAP file | CodeQL intermediate format produced by extractors; interpreted relative to a schema [S2]. |
| CPG | Code Property Graph; merges AST, CFG, and program dependence graph into one structure (Joern; not source-backed here). |
| EDB/IDB separation | Distinguishes input facts from derived facts; central to Datalog evaluation. |

## Findings

### CodeQL: Relational Schema with Object-Oriented Datalog

CodeQL databases store a full hierarchical representation of code including the abstract syntax tree, data flow graph, and control flow graph [S1]. Each language has its own schema defining the relations used [S1]. Extractors produce TRAP files — UTF-8 files that, when interpreted relative to a `.dbscheme` file, create the dataset [S2]. For compiled languages, extraction monitors the build process; for interpreted languages, the extractor runs directly on source [S1].

The query language QL is a Datalog dialect with stratified semantics and object-oriented classes [S3]. Classes are modeled as predicates and inheritance as implication, providing OO abstraction without compromising the logical foundation [S7]. QL inherits recursive predicates from Datalog and adds aggregates [S7]. Stratified semantics restrict certain recursive patterns, notably negation through recursion [S3].

**Schema**: A `.dbscheme` file describes column types and extensional relations [S2]. There is no public-facing specification for schema syntax [S2], which limits third-party tooling.

**Incremental updates**: The source register does not document CodeQL's incremental update mechanism in detail. CodeQL databases are typically rebuilt per analysis run; the docs describe extraction as producing a fresh dataset rather than patching an existing one [S1, S2]. This suggests limited incremental support at the database level, though query result caching may exist.

Insight: CodeQL's design couples a language-specific relational schema with an OO query layer. This improves query readability for security analysts but ties analysis to per-language schemas, making cross-language analysis require separate databases [S1].

### Soufflé: Compiled Datalog with Typed Relations

Soufflé requires explicit relation declarations with typed attributes: `number`, `symbol`, `unsigned`, `float` [S8, S11]. Rules are Horn clauses with a head and body; facts are unconditional rules [S8]. The language extends Datalog with arithmetic functors, making it Turing-equivalent and capable of non-termination [S9].

Soufflé translates Datalog rules into parallel C++ code, compiled to an executable [S14]. This enables low-overhead parallel evaluation but prevents incremental updates without recompilation and re-execution from scratch [S14]. All output is materialized at the end of evaluation; there is no interactive mode [S9].

**Schema and indexing**: Relations are internally clusters of indexes, automatically chosen via combinatorial optimization [S10]. Three data structures are available: B-tree (default), Brie (for dense data), and Eqrel (for equivalence relations using union-find) [S10]. The Eqrel structure provides linear representation of equivalence relations, avoiding quadratic tuple explosion — critical for alias set or type equivalence computations [S10].

**Modularity**: Soufflé supports components with inheritance and namespaces, enabling reusable analysis libraries [S11]. User-defined functors in C/C++ extend the language [S8].

**Query ergonomics**: Implicit joins via variable reuse avoid explicit JOIN syntax [S14]. Aggregates use the syntax `var = aggregate : { body }` [S14]. Negated literals do not bind variables, requiring stratification [S13].

### Doop: Declarative Pointer Analysis on Datalog

Doop is a declarative framework for Java static analysis centered on pointer analysis [S17]. It uses LogiQL, a Datalog dialect from LogicBlox, to specify analyses [S17]. Fact generation uses Soot/Jimple to process Java bytecode [S17]. Doop's Datalog specifications undergo optimization — variable reordering and folding via temporary relations — yielding order-of-magnitude runtime improvements [S18].

Doop is more than 15x faster than PADDLE for 1-call-site sensitive analysis on DaCapo benchmarks [S15]. It scales to analyses that were impossible with PADDLE and bddbddb [S15]. The key optimization targets highly recursive Datalog programs [S16]. Doop is modular and configurable to analyses with a wide range of characteristics due to its declarative nature [S16].

Limitations: Doop expects LogicBlox engine version 3.10.X for the tutorial [S17]; input facts auto-generated by Soot may lose original variable names [S17]. Context depth must be bounded [S18]. Reflection and exception handling details are unclear from the available sources [S18].

### bddbddb: BDD-Based Datalog

bddbddb implements Datalog with stratified negation, totally-ordered finite domains, and comparison operators, using BDDs to represent relations [S22]. BDDs enable efficient representation and operations on large relations, with time proportional to BDD size rather than tuple count [S22]. This allows context-sensitive pointer analysis for large programs [S22, S25].

The critical limitation is variable ordering: BDD performance depends heavily on ordering, and the paper notes that ordering is critical for performance [S22]. Context-insensitive points-to analysis was about twice as fast as hand-tuned approaches, but BDD-based representation may have overhead for small relations [S22].

### Index Formats: Kythe and SCIP

The source register does not contain primary documentation for Kythe or SCIP. Based on general knowledge (not source-backed), these are code intelligence index formats that represent cross-reference and definition facts. They are optimized for navigation (jump-to-definition, find-references) rather than deep data flow or pointer analysis. We flag this as a significant evidence gap. No claims about their schemas, incremental update mechanisms, or performance characteristics are supported by admitted sources.

### Joern Code Property Graph

Similarly, the source register lacks primary Joern documentation. The CPG concept — merging AST, CFG, and program dependence graph — is widely described but not source-backed here. No claims about Joern's query language, schema, or scalability are supported.

### Comparative Summary

| System | Fact Model | Query Language | Incremental | Compilation |
|---|---|---|---|---|
| CodeQL | Relational per-language schema; AST+CFG+DFG [S1] | QL (Datalog + OO classes) [S3, S7] | Not documented in sources; DB rebuilt per run [S1, S2] | Interpreted by CodeQL CLI |
| Soufflé | Typed relations (4 primitive types) [S11] | Datalog + components + functors [S8, S9] | None; recompiles from scratch [S14] | Translates to C++ [S14] |
| Doop | Java bytecode facts via Soot [S17] | LogiQL (LogicBlox Datalog) [S17] | Not documented | LogicBlox engine [S17] |
| bddbddb | Finite-domain relations as BDDs [S22] | Datalog with stratified negation [S22] | Not documented | BDD operations [S22, S25] |
| Kythe/SCIP | Not source-backed | Not source-backed | Not source-backed | Not source-backed |

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| CodeQL stores AST, CFG, DFG in per-language schema | "The database contains a full, hierarchical representation of the code, including... AST, the data flow graph, and the control flow graph." [S1] | S1 | Language-specific; cross-language needs separate DBs |
| QL is Datalog with stratified semantics and OO classes | "The query language is a dialect of Datalog, using stratified semantics, and it includes object-oriented classes." [S3] | S3 | Stratification restricts negation through recursion |
| Soufflé compiles to parallel C++ | "Soufflé specifically translates Datalog rules directly into highly optimized parallel C++ code" [S14] | S14 | No incremental updates; recompiles from scratch |
| Soufflé Eqrel uses union-find for linear equivalence relations | "the Eqrel data structure provides a linear representation of equivalence relations, by using a union-find based algorithm" [S10] | S10 | Only for reflexive, symmetric, transitive binary relations |
| Soufflé is Turing-equivalent via arithmetic functors | "Soufflé extends Datalog to make it Turing-equivalent through arithmetic functors" [S9] | S9 | Programs may not terminate |
| Doop is 15x faster than PADDLE for 1-call-site analysis | "DOOP is more than 15x faster than PADDLE for a 1-call-site sensitive analysis of the DaCapo benchmarks" [S15] | S15 | Benchmark from 2009; hardware/software evolved |
| bddbddb uses BDDs; variable ordering is critical | "bddbddb uses binary decision diagrams (BDDs) to efficiently represent large relations" [S22] | S22 | Overhead for small relations; ordering critical |
| No public spec for CodeQL schema syntax | "There is currently no public-facing specification for the syntax of schemas" [S2] | S2 | Limits third-party tooling and schema introspection |

### Datalog Execution and Optimization Comparison

| Feature | CodeQL (QL) | Soufflé | Doop (LogiQL) | bddbddb |
|---|---|---|---|---|
| Recursion | Yes (stratified) [S3] | Yes (stratified) [S13] | Yes | Yes (stratified negation) [S22] |
| Aggregates | Yes [S7] | Yes [S14] | Yes | Not documented |
| Object orientation | Yes (classes as predicates) [S7] | Components [S11] | No | No |
| Index selection | Not documented | Auto + manual [S10] | LogicBlox engine | BDD variable ordering [S22] |
| Modularity | QL libraries | Components + inheritance [S11] | Analysis configurations [S16] | Not documented |
| Termination guarantee | Yes (stratified) | No (Turing-equivalent) [S9] | Yes (Datalog) | Yes (Datalog) |

## Design Implications

1. **Schema design should separate EDB from IDB cleanly.** CodeQL and Soufflé both follow this pattern: extractors produce base facts, and rules derive additional facts [S1, S2, S8]. This separation enables semi-naive evaluation and potential future incremental support. Designers building custom fact databases should maintain this boundary.

2. **Choose the execution model based on analysis size and recurrence depth.** Soufflé's compilation to C++ suits large batch analyses with deep recursion [S14, S19]. BDD-based representation (bddbddb) excels for relations with high redundancy but requires careful variable ordering [S22]. Doop's aggressive optimization of recursive rules targets the specific workload of pointer analysis [S16, S18].

3. **Incremental update support is a critical gap.** Soufflé explicitly lacks incremental updates — any change requires recompilation and re-execution [S14]. CodeQL databases appear to be rebuilt per analysis [S1, S2]. For CI-integrated analysis on large codebases, this means full recomputation per change. Designers should consider caching query results or sharding databases by module to mitigate this.

4. **Type systems improve query correctness but add annotation burden.** Soufflé's typed Datalog enables early error detection [S8], but type inference is limited to variables in rules [S8]. CodeQL's OO class abstraction over relations [S7] provides a different ergonomic improvement: analysts reason about object types rather than table columns. Schema designers should choose based on whether their users are analysis experts (prefer Soufflé's explicit types) or security practitioners (prefer CodeQL's OO abstraction).

5. **Specialized data structures matter for specific analyses.** Soufflé's Eqrel relation using union-find avoids quadratic explosion for equivalence relations [S10]. For alias analysis or type inference, choosing an engine with such specialized representations can be the difference between feasible and infeasible computation.

## Limitations and Threats to Validity

**Missing primary sources**: The source register lacks official Joern, Kythe, and SCIP documentation. Claims about these systems are not source-backed and should be treated as unsupported. This is a significant scope limitation given that the research goal explicitly includes Joern CPG, Kythe, and SCIP.

**Stale benchmarks**: The Doop performance claim (15x faster than PADDLE) dates to 2009 [S15]. Hardware, JVMs, and Datalog engines have evolved substantially. The claim demonstrates that Datalog-based approaches can outperform BDD-based approaches, but the magnitude may not hold today.

**Vendor and maintainer bias**: Soufflé documentation [S8, S9, S10] is maintained by the Soufflé team and naturally emphasizes strengths. CodeQL documentation [S1, S2, S3] is maintained by GitHub and similarly emphasizes capabilities. Independent comparative evaluations are absent from the source register.

**Incomplete incremental update evidence**: None of the admitted sources provide rigorous documentation of incremental update mechanisms for any system. Claims about CodeQL's lack of incremental support are inferred from the extraction workflow description [S1, S2], not from an explicit statement. Soufflé's lack of incremental support is explicitly stated [S14].

**No recent developments covered**: The source register does not contain 2023-2026 developments for CodeQL, Soufflé, Joern, or SCIP. The most recent Soufflé guide [S14] is dated 2026 but is a community guide, not official documentation.

**Doop engine dependency**: Doop depends on LogicBlox, a commercial Datalog engine [S17]. The availability and licensing of LogicBlox may limit reproducibility. Soufflé's benchmark infrastructure for Doop [S19] may use Soufflé as the backend instead, but the sources do not confirm this.

## Open Questions

1. What incremental update mechanisms, if any, does CodeQL provide at the database or query level? The sources describe extraction [S1, S2] but not incremental patching.
2. How do Kythe and SCIP schemas compare to CodeQL's `.dbscheme` in expressiveness for data flow analysis? Primary sources are absent.
3. Can Soufflé be extended with incremental evaluation (e.g., DRed or counting algorithm) without fundamental architectural changes? The compilation-to-C++ model [S14] may preclude this.
4. How does Joern's CPG query language compare to Datalog in expressiveness and performance for taint analysis? No source-backed evidence is available.
5. Do modern CodeQL or Soufflé benchmarks exist for large monorepos (>10M LOC)? The Doop benchmarks [S19] target Java programs but not industrial-scale repositories.
6. What is the maintenance burden of maintaining per-language CodeQL schemas [S1] versus a unified Soufflé fact model?

## Recommended Next Experiments

1. **Incremental update benchmark**: Instrument CodeQL and Soufflé on a medium-sized codebase (e.g., 100K LOC) with controlled single-file changes. Measure wall-clock time for full rebuild versus hypothetical incremental evaluation. This directly addresses the incremental update gap identified in the findings.

2. **Schema expressiveness comparison**: Implement the same data flow taint analysis in CodeQL QL, Soufflé Datalog, and (if documentation becomes available) Joern's query language. Compare lines of code, query complexity, and evaluation time. This tests whether OO abstraction in QL [S7] provides measurable ergonomic benefit over Soufflé's flat relational model.

3. **Eqrel vs. B-tree on alias analysis**: Using Soufflé, run a context-insensitive alias analysis with relations declared as Eqrel versus default B-tree. Measure memory and time on a benchmark from the Doop suite [S19]. This validates the claim that Eqrel's union-find representation [S10] provides linear scaling for equivalence relations.

4. **Reproduce Doop speedup on modern hardware**: Re-run the Doop 1-call-site sensitive analysis on DaCapo benchmarks using current Soufflé as the backend [S19]. Compare against the 2009 PADDLE baseline [S15] and a modern BDD-based tool if available. This addresses the staleness threat.

5. **SCIP/Kythe feasibility for analysis queries**: Once primary SCIP or Kythe documentation is available, evaluate whether their schemas can represent data flow facts (e.g., def-use chains, call graph edges). If not, document the specific gaps and propose minimal schema extensions. This fills the evidence gap on index formats.

## Source Register

- [S1] [About CodeQL — CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/) — admitted, score 18, discovered by `CodeQL database schema facts relations query language documentation`
- [S2] [CodeQL glossary - bqrs file - GitHub](https://codeql.github.com/docs/codeql-overview/codeql-glossary/) — admitted, score 18, discovered by `CodeQL database schema facts relations query language documentation`
- [S3] [QL language specification - CodeQL - GitHub](https://codeql.github.com/docs/ql-language-reference/ql-language-specification/) — admitted, score 18, discovered by `CodeQL database schema facts relations query language documentation`
- [S4] [CodeQL documentation - GitHub](https://codeql.github.com/docs/) — admitted, score 18, discovered by `CodeQL database schema facts relations query language documentation`
- [S5] [CodeQL Microsoft documentation - Basic of CodeQL | PDF](https://www.slideshare.net/slideshow/codeql-microsoft-documentation-basic-of-codeql/269810994) — admitted, score 10, discovered by `CodeQL database schema facts relations query language documentation`
- [S6] [CodeQL queries — CodeQL](https://codeql.github.com/docs/writing-codeql-queries/codeql-queries/) — admitted, score 18, discovered by `CodeQL database schema facts relations query language documentation`
- [S7] [About the QL language - CodeQL - GitHub](https://codeql.github.com/docs/ql-language-reference/about-the-ql-language/) — admitted, score 18, discovered by `CodeQL database schema facts relations query language documentation`
- [S8] [Program | Soufflé • A Datalog Synthesis Tool for Static Analysis](https://souffle-lang.github.io/program) — admitted, score 18, discovered by `Souffle Datalog language manual syntax relations`
- [S9] [Tutorial | Soufflé • A Datalog Synthesis Tool for Static Analysis](https://souffle-lang.github.io/tutorial) — admitted, score 18, discovered by `Souffle Datalog language manual syntax relations`
- [S10] [Relations | Soufflé • A Datalog Synthesis Tool for Static Analysis](https://souffle-lang.github.io/relations) — admitted, score 18, discovered by `Souffle Datalog language manual syntax relations`
- [S11] [souffle-lang.github.io/pages/docs/programs.md at master · souffle-lang/souffle-lang.github.io](https://github.com/souffle-lang/souffle-lang.github.io/blob/master/pages/docs/programs.md) — admitted, score 18, discovered by `Souffle Datalog language manual syntax relations`
- [S12] [souffle-lang.github.io/pages/docs/tutorial.md at master · souffle-lang/souffle-lang.github.io](https://github.com/souffle-lang/souffle-lang.github.io/blob/master/pages/docs/tutorial.md) — admitted, score 18, discovered by `Souffle Datalog language manual syntax relations`
- [S13] [user manual - oracle/souffle GitHub Wiki](https://github-wiki-see.page/m/oracle/souffle/wiki/user-manual) — admitted, score 10, discovered by `Souffle Datalog language manual syntax relations`
- [S14] [The Comprehensive Guide to Soufflé Datalog in 2026 | Datalog.dev](https://datalog.dev/) — admitted, score 14, discovered by `Souffle Datalog language manual syntax relations`
- [S15] [Static Analysis and Types - OOPSLa](https://oopsla.org/2009/program/research-program/106-static-analysis-and-types.html) — admitted, score 17, discovered by `Doop static analysis Datalog points-to benchmark`
- [S16] [Strictly declarative specification of sophisticated points-to analyses | ACM SIGPLAN Notices](https://dl.acm.org/doi/10.1145/1639949.1640108) — admitted, score 17, discovered by `Doop static analysis Datalog points-to benchmark`
- [S17] [Doop Framework 101](https://plast-lab.github.io/doop-pldi15-tutorial/) — admitted, score 13, discovered by `Doop static analysis Datalog points-to benchmark`
- [S18] [Doop: Strictly Declarative Specification of Sophisticated Points-to Analyses | CS294-260](https://inst.eecs.berkeley.edu/~cs294-260/sp24/2024-02-07-doop) — admitted, score 14, discovered by `Doop static analysis Datalog points-to benchmark`
- [S19] [Benchmarks | Soufflé • A Datalog Synthesis Tool for Static Analysis](https://souffle-lang.github.io/benchmarks) — admitted, score 15, discovered by `Doop static analysis Datalog points-to benchmark`
- [S20] [Program Repair Guided by Datalog-Defined Static Analysis | Request PDF](https://www.researchgate.net/publication/376092037_Program_Repair_Guided_by_Datalog-Defined_Static_Analysis) — rejected, score 12, discovered by `Doop static analysis Datalog points-to benchmark`
- [S21] [Using Datalog for Fast and Easy Program Analysis | Request PDF](https://www.researchgate.net/publication/221313280_Using_Datalog_for_Fast_and_Easy_Program_Analysis) — rejected, score 14, discovered by `Doop static analysis Datalog points-to benchmark`
- [S22] [Using Datalog with Binary Decision Diagrams for Program Analysis | Springer Nature Link](https://link.springer.com/chapter/10.1007/11575467_8?error=cookies_not_supported&code=6f1f258c-0f41-4710-b508-be713ea5cb54) — admitted, score 16, discovered by `bddbddb BDD Datalog static analysis paper`
- [S23] [Using Datalog with Binary Decision Diagrams for Program Analysis](https://people.csail.mit.edu/mcarbin/papers/aplas05.pdf) — admitted, score 16, discovered by `bddbddb BDD Datalog static analysis paper`
- [S24] [Datalog for Static Analysis May 9, 2017 Ben Greenman Abstract](https://users.cs.utah.edu/~blg/resources/notes/datalog-for-static-analysis/datalog-for-static-analysis.pdf) — admitted, score 12, discovered by `bddbddb BDD Datalog static analysis paper`
- [S25] [Context-Sensitive Program Analysis as Database Queries Monica S. Lam](https://www.cs.columbia.edu/~junfeng/10fa-e6998/papers/bddbddb.pdf) — admitted, score 16, discovered by `bddbddb BDD Datalog static analysis paper`
- [S26] [(PDF) Using Datalog with Binary Decision Diagrams for Program Analysis](https://www.researchgate.net/publication/221323151_Using_Datalog_with_Binary_Decision_Diagrams_for_Program_Analysis) — rejected, score 13, discovered by `bddbddb BDD Datalog static analysis paper`
- [S27] [Formulog: Datalog for SMT-based static analysis](https://www.researchgate.net/publication/347696050_Formulog_Datalog_for_SMT-based_static_analysis) — rejected, score 10, discovered by `bddbddb BDD Datalog static analysis paper`

## Research Trace

### Goal

Understand the landscape of fact databases and query engines used for static analysis, comparing their schemas, query ergonomics, incremental update support, and practical tradeoffs across CodeQL, Datalog/Souffle/Doop/bddbddb, Joern CPG, and Kythe/SCIP indexes.

### Subquestions

- How do CodeQL databases represent facts and relations, and what query ergonomics and incremental update capabilities does the CodeQL engine provide?
- What are the core data models and query languages of Souffle, Doop, and bddbddb, and how do they differ in scalability and use cases?
- How does the Joern code property graph model facts, and what are its query ergonomics and limitations compared to Datalog-based systems?
- How do Kythe and SCIP index schemas represent code facts, and what are their tradeoffs for static analysis queries versus CodeQL or Datalog?
- What schema design patterns are recommended for static analysis fact databases, and how do they affect incremental updates and query performance?
- What are known failures, scalability limits, or criticisms of these systems in real-world static analysis workloads?

### Research Perspectives

- **Primary sources** — Find official docs, specs, and schema definitions from CodeQL, Souffle, Joern, Kythe, and SCIP maintainers.
- **Implementation** — Identify repos, architecture descriptions, and concrete examples of fact extraction and querying.
- **Benchmarks** — Locate performance, scalability, and incremental update benchmarks for these engines.
- **Academic research** — Find papers on Datalog-based static analysis, BDD optimizations, and code property graphs.
- **Criticism and counterevidence** — Surface limitations, failed deployments, and comparative critiques of these systems.
- **Recency** — Capture 2023-2026 developments in CodeQL, Souffle, Joern, SCIP, and related tooling.
- **Operational implications** — Assess practical concerns: incremental updates, CI integration, query authoring difficulty, and maintenance burden.

### Source Requirements

- Official CodeQL documentation and GitHub repo
- Souffle language manual and academic papers
- Doop and bddbddb papers or repos
- Joern docs and code property graph schema references
- Kythe schema documentation and SCIP spec
- Independent benchmarks or comparative studies
- Critical blog posts or issue discussions about scalability or ergonomics

### Success Criteria

- The report clearly distinguishes each system's fact model, query language, and intended use case.
- It compares incremental update support across at least CodeQL, Souffle, Joern, and SCIP/Kythe.
- It includes concrete schema examples or relation definitions where available.
- It cites at least one benchmark or performance study for Datalog-based analysis.
- It surfaces at least two documented limitations or criticisms of these systems.
- It covers 2023-2026 developments where relevant.

### Search Queries

- `CodeQL database schema facts relations query language documentation` — Find official CodeQL docs on fact representation and query ergonomics. [Primary sources / documentation]
- `Souffle Datalog language manual syntax relations` — Obtain Souffle's official language reference and data model. [Primary sources / documentation]
- `Doop static analysis Datalog points-to benchmark` — Find Doop papers and benchmarks for Datalog-based analysis. [Academic research / paper]
- `bddbddb BDD Datalog static analysis paper` — Locate the foundational bddbddb paper and its optimizations. [Academic research / paper]
- `Joern code property graph schema query language docs` — Get Joern's CPG model and query ergonomics from official docs. [Primary sources / documentation]
- `Kythe schema index format static analysis` — Find Kythe's schema and indexing model for code facts. [Primary sources / documentation]
- `SCIP code intelligence index format specification` — Obtain the SCIP spec and how it represents code facts. [Primary sources / documentation]
- `Datalog incremental update static analysis scalability` — Find research on incremental Datalog evaluation for large codebases. [Benchmarks / paper]
- `CodeQL incremental analysis performance limitations` — Surface critiques and limits of CodeQL's incremental support. [Criticism and counterevidence / discussion]
- `Souffle vs CodeQL vs Joern static analysis comparison` — Find comparative discussions of these engines. [Criticism and counterevidence / discussion]
- `SCIP index vs Kythe comparison code intelligence` — Compare SCIP and Kythe schemas and tradeoffs. [Implementation / documentation]
- `code property graph query ergonomics limitations real world` — Find operational critiques of CPG-based querying. [Operational implications / blog]

### Source Quality

- [S1] Official CodeQL overview describing database schema and relations. score=18 type=docs admitted=true warnings=
- [S2] CodeQL glossary defining database schema, BQRS files, and terms. score=18 type=docs admitted=true warnings=
- [S3] QL language specification, a Datalog dialect for CodeQL databases. score=18 type=docs admitted=true warnings=
- [S4] Central CodeQL documentation hub with guides and language references. score=18 type=docs admitted=true warnings=
- [S5] Slideshare summary of CodeQL basics; not an official source. score=10 type=other admitted=true warnings=Third-party repost of Microsoft documentation, may be outdated or incomplete.
- [S6] Official guide to CodeQL queries, metadata, and result definitions. score=18 type=docs admitted=true warnings=
- [S7] Official introduction to QL language, its declarative and object-oriented nature. score=18 type=docs admitted=true warnings=
- [S8] Soufflé language manual with relation declarations, facts, rules, and output directives. score=18 type=docs admitted=true warnings=
- [S9] Soufflé tutorial explaining Datalog basics, goals, and output simulation. score=18 type=docs admitted=true warnings=
- [S10] Soufflé relations documentation covering index clustering, types, and declarations. score=18 type=docs admitted=true warnings=
- [S11] Same content as S8, hosted on official Soufflé GitHub repository. score=18 type=docs admitted=true warnings=
- [S12] Same content as S9, hosted on official Soufflé GitHub repository. score=18 type=docs admitted=true warnings=
- [S13] Archived wiki mirror of old Soufflé user manual; useful for historical context but may be outdated. score=10 type=docs admitted=true warnings=Mirror of 2016 wiki, not official documentation.
- [S14] Third-party comprehensive guide to Soufflé Datalog updated for 2026; practical examples and comparisons. score=14 type=other admitted=true warnings=Not an official source; community-maintained tutorial.
- [S15] Seminal DOOP paper from OOPSLA 2009 showing 15x speedup over PADDLE using Datalog. score=17 type=paper admitted=true warnings=
- [S16] Same DOOP paper published in ACM SIGPLAN Notices. score=17 type=paper admitted=true warnings=
- [S17] PLDI 2015 tutorial on DOOP framework; covers setup and declarative analysis. score=13 type=paper admitted=true warnings=Tutorial material, not a peer-reviewed publication.
- [S18] UC Berkeley lecture notes on DOOP paper, Spring 2024; provides discussion and context. score=14 type=paper admitted=true warnings=Lecture notes, not original research.
- [S19] Soufflé benchmarks page with scripts and Doop benchmark programs for performance comparison. score=15 type=benchmark admitted=true warnings=
- [S20] Requested paper on program repair guided by Datalog-defined static analysis; fetch error prevented reading. score=12 type=paper admitted=false warnings=HTTP 403 Forbidden: source not accessible.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S21] Requested paper on using Datalog for fast program analysis; fetch error prevented reading. score=14 type=paper admitted=false warnings=HTTP 403 Forbidden: source not accessible.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S22] Foundational bddbddb paper describing BDD-based Datalog for program analysis (APLAS 2005). score=16 type=paper admitted=true warnings=
- [S23] Direct PDF of the bddbddb paper from MIT CSAIL. score=16 type=paper admitted=true warnings=
- [S24] Lecture notes summarizing Datalog for static analysis, covering bddbddb and Doop. score=12 type=paper admitted=true warnings=Not a peer-reviewed paper; student notes from 2017.
- [S25] Full paper on context-sensitive program analysis as database queries using bddbddb. score=16 type=paper admitted=true warnings=
- [S26] ResearchGate entry for bddbddb paper; fetch error prevented reading. score=13 type=paper admitted=false warnings=HTTP 403 Forbidden: source not accessible.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S27] ResearchGate entry for Formulog (Datalog for SMT-based analysis); fetch error and mismatch with bddbddb snippet. score=10 type=paper admitted=false warnings=HTTP 403 Forbidden: source not accessible; snippet may be misattributed.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]

### Evidence Notes

- [S1] CodeQL databases contain a full hierarchical representation including AST, data flow graph, and control flow graph, with a language-specific schema defining relations. Evidence: The database contains a full, hierarchical representation of the code, including a representation of the abstract syntax tree, the data flow graph, and the control flow graph. Each language has its own unique database schema that defines the relations used to create a database. Limitations: The schema is language-specific, so cross-language analysis requires separate databases.
- [S1] CodeQL extractors produce relational data from source files; for compiled languages they monitor the build process, for interpreted languages they run directly on source. Evidence: For compiled languages, extraction works by monitoring the normal build process. Each time a compiler is invoked to process a source file, a copy of that file is made, and all relevant information about the source code is collected. For interpreted languages, the extractor runs directly on the source code, resolving dependencies. Limitations: For compiled languages, extraction requires a working build environment; for interpreted languages, dependency resolution may be incomplete.
- [S3] QL is a dialect of Datalog with stratified semantics and object-oriented classes, operating on relational data. Evidence: QL is a query language for CodeQL databases. The data is relational: named relations hold sets of tuples. The query language is a dialect of Datalog, using stratified semantics, and it includes object-oriented classes. Limitations: Stratified semantics restrict certain recursive patterns (e.g., negation through recursion).
- [S2] A QL database schema is a .dbscheme file describing column types and extensional relations; extractors produce TRAP files that are used to create the dataset. Evidence: A QL database schema is a file describing the column types and extensional relations that make up a raw QL dataset. It is a text file with the .dbscheme extension. ... TRAP file is a UTF-8 encoded file generated by a CodeQL extractor with the extension .trap. They contain the information that, when interpreted relative to a QL database schema, is used to create a QL dataset. Limitations: There is currently no public-facing specification for the syntax of schemas (stated in S2).
- [S8] Soufflé requires explicit relation declarations with typed attributes (number, symbol, unsigned, float) and uses a typed Datalog dialect for static checking. Evidence: Soufflé requires the declaration of relations. ... .decl A(x:number, y:number). defines the relation A that contains pairs of numbers only. ... Soufflé utilises a typed Datalog dialect to conduct static checks enabling the early detection of errors. Limitations: Type system may require explicit annotations; type inference is limited to variables in rules.
- [S8] Soufflé rules are conditional logic statements (Horn clauses) with a head and body; facts are unconditional rules. Evidence: A rule starts with a head followed by a body. For example, A(x,y) :- B(x,y). holds for a pair (x,y) if it is in B. ... A fact is a rule that holds unconditionally, i.e., a fact is a Horn Clause A(1,2) ⇐ true. Limitations: Recursive rules may require stratification or other restrictions; performance can depend on rule ordering.
- [S8] Soufflé supports components for modularization, inheritance, and user-defined functors in C/C++ for extending the language. Evidence: Soufflé has components to modularise large logic programs. A component may contain other components, relation and type declarations, facts, rules, and directives. ... Programmers can declare user-defined functors for extending Soufflé. User-defined functors are implemented in C/C++. Limitations: Components add complexity; user-defined functors require C/C++ knowledge and may introduce performance overhead.
- [S8] Soufflé's auto-scheduler can improve rule performance, but hand-tuning may be required for optimal performance. Evidence: The performance of rules can be automatically improved by using Soufflé’s auto-scheduler. Note that to achieve optimal performance of rules, hand-tuning may be required. Limitations: Hand-tuning is non-trivial and may require deep understanding of the evaluation strategy.
- [S7] QL is declarative, object-oriented, and optimized for hierarchical data; it inherits recursive predicates from Datalog and adds aggregates. Evidence: QL is a declarative, object-oriented query language that is optimized to enable efficient analysis of hierarchical data structures. ... QL inherits recursive predicates from Datalog, and adds support for aggregates, making even complex queries concise and simple. Limitations: No imperative features; all operations are logical, which may be unfamiliar to some users.
- [S7] In QL, classes are modeled as predicates and inheritance as implication, providing object-orientation without compromising logical foundation. Evidence: Object orientation is an important feature of QL. ... This is achieved by defining a simple object model where classes are modeled as predicates and inheritance as implication. Limitations: The OO model is logical, not imperative; class instantiation is not memory allocation but logical membership.
- [S9] Soufflé extends Datalog with arithmetic functors, making it Turing-equivalent and capable of non-termination. Evidence: For practical usage, Soufflé extends Datalog to make it Turing-equivalent through arithmetic functors. This results in the ability of the programmer to write programs that may never terminate. Limitations: Non-termination is possible if functors are used without constraints; the source notes this is analogous to an infinite loop in C.
- [S9] Soufflé uses output directives to simulate goals; there is no interactive mode. Evidence: A goal in Datalog is a logical relation of the form false <= p, where p is a logical relation. In the case of Soufflé, goals are simulated by output directives. Limitations: No interactive querying; entire program must be evaluated to see results.
- [S9] Soufflé supports input/output directives for relations, reading from .facts files and writing to .csv by default. Evidence: The input directive .input <relation-name> reads from the <relation-name>.facts, which is assumed to be tab-separated by default. The output directive .output <relation-name> writes to a file, usually <relation-name>.csv. Limitations: File-based I/O may be slow for very large fact sets; no streaming or database-backed input.
- [S10] Soufflé relations are internally represented as clusters of indexes, automatically chosen via combinatorial optimization. Evidence: In Soufflé, relations are cluster of indexes. The indexes are automatically chosen using a combinatorial optimisation problem so that all operations on a relation can be covered by an index using a minimal number of indexes. Limitations: Auto-indexing may not be optimal for all workloads; the source notes that hand-tuning may be required for optimal performance.
- [S10] Soufflé provides three internal data structures for relations: B-tree (default), Brie (for dense data), and Eqrel (for equivalence relations). Evidence: Currently, the possible data structures are B-tree, Brie, and Eqrel (for equivalence relations). Limitations: Brie is slower than B-tree in average case; Eqrel is only for equivalence relations and requires special semantics.
- [S10] The Eqrel data structure provides a linear representation of equivalence relations using union-find, avoiding quadratic tuple explosion. Evidence: In Soufflé, the Eqrel data structure provides a linear representation of equivalence relations, by using a union-find based algorithm. Limitations: Only applicable to binary relations that are reflexive, symmetric, and transitive; not a general-purpose optimization.
- [S11] Soufflé has four primitive types: symbol, number, unsigned, and float. Evidence: There are four primitive types in Soufflé, i.e., symbol, number, unsigned, and float. Limitations: Number is signed integer (typically 32-bit); range may be insufficient for some analyses.
- [S11] Soufflé supports components for modular large-scale logic programming, with inheritance and namespaces. Evidence: Soufflé has components to modularise large logic programs. A component may contain other components, relation and type declarations, facts, rules, and directives. Components can have one or more super-components from which they can inherit. Limitations: Component system adds complexity; not all Datalog engines support modularity.
- [S13] Soufflé requires stratified negation; negated literals do not bind variables. Evidence: Negated literals do not bind variables. For example, A(x,y) :- R(x), !S(y). is not valid as the set of values that 'y' can take is not clear. Limitations: Stratification requirement prevents certain recursive negations; programmer must ensure stratification.
- [S14] Soufflé translates Datalog rules into highly optimized parallel C++ code, which is then compiled to an executable. Evidence: Soufflé specifically translates Datalog rules directly into highly optimized parallel C++ code, which is then compiled to an executable. Limitations: No incremental update support; any change to facts or rules requires recompilation and re-execution from scratch.
- [S14] Soufflé uses implicit joins by reusing variable names across predicates, avoiding explicit JOIN syntax. Evidence: In SQL, you write JOIN on a.id = b.id. In Datalog, you just reuse the same variable name. parent(x, y), parent(y, z) implicitly joins on y. Limitations: Implicit joins can be confusing for users accustomed to SQL; no explicit join control may hinder optimization in complex queries.
- [S14] Soufflé supports aggregates with syntax: var = aggregate : { body }. Evidence: Aggregates in Soufflé look slightly mathematical. The syntax is var = aggregate : { body }. Limitations: Aggregate semantics in Datalog can be subtle; Soufflé's implementation may require careful stratification.
- [S15] DOOP, a Datalog-based points-to analysis framework, is more than 15x faster than PADDLE for 1-call-site sensitive analysis on DaCapo benchmarks. Evidence: For the exact same logical points-to definitions (and, consequently, identical precision) DOOP is more than 15x faster than PADDLE for a 1-call-site sensitive analysis of the DaCapo benchmarks. Limitations: Benchmark from 2009; hardware and software have evolved. Speedup may not hold for all analyses or modern JVMs.
- [S15] DOOP scales to very precise analyses that were impossible with PADDLE and bddbddb. Evidence: Additionally, DOOP scales to very precise analyses that are impossible with PADDLE and Whaley et al.'s bddbddb, directly addressing open problems in past literature. Limitations: The claim is from 2009; bddbddb may have been improved or superseded. No comparison with Soufflé or CodeQL.
- [S16] DOOP uses a novel optimization technique targeting highly recursive Datalog programs, achieving order-of-magnitude runtime improvements. Evidence: We carry the declarative approach further than past work by describing the full end-to-end analysis in Datalog and optimizing aggressively using a novel technique specifically targeting highly recursive Datalog programs. Limitations: The paper does not detail the technique in the abstract; full details require reading the paper.
- [S16] DOOP is modular and can be easily configured to analyses with a wide range of characteristics due to its declarative nature. Evidence: Finally, our implementation is modular and can be easily configured to analyses with a wide range of characteristics, largely due to its declarativeness. Limitations: Modularity may come at the cost of performance if not carefully optimized; the paper does not quantify configuration overhead.
- [S17] Doop is a declarative framework for Java static analysis centered on pointer analysis, using Datalog (LogiQL) to specify analyses. Evidence: Doop provides a large variety of analyses and also the surrounding scaffolding to run an analysis end-to-end (fact generation, processing, statistics, etc.). The declarative nature of Doop stems from its use of Datalog (more specifically, LogiQL, a Datalog dialect developed by LogicBlox). Limitations: Doop expects LogicBlox engine version 3.10.X for the tutorial; input facts are auto-generated by Soot, which may lose original variable names.
- [S18] Doop's Datalog specifications undergo novel optimization (variable reordering and folding) yielding order-of-magnitude speedups. Evidence: Once the Datalog specifications have been generated, they go through a novel optimization process developed by the authors, which produces a semantically equivalent Datalog program with full order-of-magnitude improvements in runtime. Doop is faster than the state-of-the-art points-to analyzers and achieves higher precision. Limitations: The context-depth used in the analysis has to be bounded; reflection and exception handling details are unclear from the paper.
- [S19] Soufflé includes benchmarks for Doop programs (2-object-sensitive+heap) and provides scripts to measure compilation and execution time. Evidence: Doop programs are available under benchmarks/2-object-sensitive+heap; big_benchmark.sh executes timer.sh for a collection of Doop benchmarks (antlr, xalan, eclipse). timer.sh outputs real, user, sys time and memory for Datalog-to-C++ compilation, C++ compilation, and execution. Limitations: The benchmarks are limited to the provided Doop programs; no scalability numbers are given in the source itself, but the framework is available.
- [S22] bddbddb implements Datalog with stratified negation, totally-ordered finite domains, and comparison operators, using BDDs to represent relations. Evidence: This paper describes bddbddb, a BDD-Based Deductive DataBase, which implements the declarative language Datalog with stratified negation, totally-ordered finite domains and comparison operators. bddbddb uses binary decision diagrams (BDDs) to efficiently represent large relations. Limitations: BDDs require careful variable ordering; the paper notes that ordering is critical for performance. The context-insensitive points-to analysis was about twice as fast as hand-tuned, but BDD-based may have overhead for small relations.
- [S24] Datalog is a good fit for static analysis because it naturally expresses mutually recursive analyses and separates specification from evaluation. Evidence: Program analysis as an 'amalgamation of mutually recursive tasks.' For instance, points-to depends on call-graph, reachability; Datalog encodings yield a uniform solution and techniques for efficient Datalog evaluation apply directly. Limitations: The overview does not provide specific performance numbers or discuss limitations such as bounded contexts or imprecision.
- [S25] Context-sensitive program analysis can be expressed as database queries and translated to BDD operations. Evidence: Section 2 motivates user-specified analysis. Section 3 shows program database representation and Datalog specification. Section 5 shows translation of Datalog to BDD operations. Limitations: The paper does not provide concrete performance benchmarks or discuss scalability limits beyond the examples.

### Claim Verification

- **supported**: Static analysis tools increasingly rely on dedicated fact databases and declarative query engines to express and evaluate program properties. — The claim is general and supported by multiple sources describing CodeQL, Souffle, Doop, and bddbddb — all of which use dedicated fact databases and declarative engines. However, the claim is overarching and not all cited sources directly assert this general trend; some only describe specific tools. Nonetheless, the evidence collectively supports the claim.
- **supported**: CodeQL databases store a full hierarchical representation of code including the abstract syntax tree, data flow graph, and control flow graph. — Source S1 explicitly states: 'The database contains a full, hierarchical representation of the code, including a representation of the abstract syntax tree, the data flow graph, and the control flow graph.'
- **supported**: Each CodeQL language has its own schema defining the relations used. — Source S1 states: 'Each language has its own unique database schema that defines the relations used to create a database.'
- **supported**: CodeQL extractors produce TRAP files — UTF-8 files that, when interpreted relative to a .dbscheme file, create the dataset. — Source S2 describes TRAP files as UTF-8 encoded files that, when interpreted relative to a .dbscheme file, create a QL dataset.
- **supported**: For compiled languages, CodeQL extraction monitors the build process; for interpreted languages, the extractor runs directly on source. — Source S1 explains: 'For compiled languages, extraction works by monitoring the normal build process. ... For interpreted languages, the extractor runs directly on the source code.'
- **supported**: QL is a Datalog dialect with stratified semantics and object-oriented classes. — Source S3 states: 'The query language is a dialect of Datalog, using stratified semantics, and it includes object-oriented classes.'
- **supported**: QL classes are modeled as predicates and inheritance as implication. — Source S7 states: 'classes are modeled as predicates and inheritance as implication.'
- **supported**: QL inherits recursive predicates from Datalog and adds aggregates. — Source S7 states: 'QL inherits recursive predicates from Datalog, and adds support for aggregates.'
- **supported**: A .dbscheme file describes column types and extensional relations. — Source S2 says: 'A QL database schema is a file describing the column types and extensional relations that make up a raw QL dataset.'
- **supported**: There is no public-facing specification for CodeQL schema syntax. — Source S2 notes: 'There is currently no public-facing specification for the syntax of schemas.'
- **supported**: Soufflé requires explicit relation declarations with typed attributes: number, symbol, unsigned, float. — Source S8 gives an example '.decl A(x:number, y:number)' and mentions typed Datalog. Source S11 explicitly lists the primitive types: symbol, number, unsigned, float.
- **supported**: Soufflé rules are Horn clauses with a head and body; facts are unconditional rules. — Source S8 states: 'A rule starts with a head followed by a body. ... A fact is a rule that holds unconditionally, i.e., a fact is a Horn Clause A(1,2) ⇐ true.'
- **supported**: Soufflé extends Datalog with arithmetic functors, making it Turing-equivalent and capable of non-termination. — Source S9 explicitly says: 'Soufflé extends Datalog to make it Turing-equivalent through arithmetic functors. This results in the ability ... to write programs that may never terminate.'
- **supported**: Soufflé translates Datalog rules into parallel C++ code, compiled to an executable. — Source S14 states: 'Soufflé specifically translates Datalog rules directly into highly optimized parallel C++ code, which is then compiled to an executable.'
- **supported**: Soufflé has no interactive mode; all output is materialized at the end of evaluation. — Source S9 says: 'In the case of Soufflé, goals are simulated by output directives.' and the tutorial implies there is no interactive mode, only output at end. However, the exact statement 'no interactive mode' is not directly quoted; the evidence shows goals are simulated via output directives, which implies materialization at the end. Supported but with caveat: the exact phrase is not present.
- **supported**: Soufflé relations are internally clusters of indexes, automatically chosen via combinatorial optimization. — Source S10 states: 'In Soufflé, relations are cluster of indexes. The indexes are automatically chosen using a combinatorial optimisation problem.'
- **supported**: Soufflé's Eqrel data structure provides a linear representation of equivalence relations using a union-find based algorithm. — Source S10 states: 'the Eqrel data structure provides a linear representation of equivalence relations, by using a union-find based algorithm.'
- **supported**: Soufflé supports components with inheritance and namespaces. — Source S11 mentions: 'Components can have one or more super-components from which they can inherit.' Namespaces are also supported via components.
- **supported**: Soufflé supports user-defined functors in C/C++. — Source S8 says: 'Programmers can declare user-defined functors for extending Soufflé. User-defined functors are implemented in C/C++.'
- **supported**: Soufflé uses implicit joins via variable reuse, avoiding explicit JOIN syntax. — Source S14 explains: 'In Datalog, you just reuse the same variable name. parent(x, y), parent(y, z) implicitly joins on y.'
- **supported**: Soufflé negated literals do not bind variables, requiring stratification. — Source S13 states: 'Negated literals do not bind variables.' and Soufflé requires stratified negation.
- **supported**: Doop uses LogiQL, a Datalog dialect from LogicBlox, to specify analyses. — Source S17 says: 'Doop stems from its use of Datalog (more specifically, LogiQL, a Datalog dialect developed by LogicBlox).'
- **supported**: Doop fact generation uses Soot/Jimple to process Java bytecode. — Source S17 mentions using Soot to generate facts: 'input facts are auto-generated by Soot.'
- **supported**: Doop's Datalog specifications undergo optimization — variable reordering and folding via temporary relations — yielding order-of-magnitude runtime improvements. — Source S18 says: 'Once the Datalog specifications have been generated, they go through a novel optimization process ... which produces a semantically equivalent Datalog program with full order-of-magnitude improvements in runtime.' This includes variable reordering and caching via temporary relations.

### Final Evaluation

- coverage: 3/5
- citation_quality: 3/5
- factuality: 4/5
- analysis_depth: 5/5
- presentation: 4/5
- overall: 3/5

Strengths:
- Clear comparative analysis of CodeQL, Soufflé, Doop, and bddbddb with detailed fact models and query languages.
- Good use of evidence tables and claim verification to support findings.
- Identifies critical gap in incremental update support across systems.
- Provides design implications and open questions that guide future work.
- Honest about missing sources for Joern, Kythe, SCIP and flags unsupported claims.

Weaknesses:
- Significant evidence gaps: Joern, Kythe, and SCIP are not covered due to missing primary sources, despite being part of the research goal.
- Some claims about CodeQL incremental updates are inferred rather than directly cited.
- Benchmarks are stale (2009 Doop vs PADDLE) and no recent performance data is included.
- Lacks concrete schema examples or relation definitions for most systems beyond Soufflé.
- Does not cover 2023-2026 developments as intended; acknowledges lack of recency.

Follow-up recommendations:
- Obtain primary documentation for Joern, Kythe, and SCIP to complete the comparative analysis.
- Run incremental update benchmarks on CodeQL and Soufflé with controlled code changes to quantify rebuild costs.
- Reproduce Doop speedup on modern hardware using Soufflé as backend to update performance claims.
- Implement a common taint analysis in CodeQL QL, Soufflé Datalog, and Joern's query language to compare expressiveness and performance.
- Evaluate SCIP/Kythe schemas for data flow fact representation and propose extensions if needed.
