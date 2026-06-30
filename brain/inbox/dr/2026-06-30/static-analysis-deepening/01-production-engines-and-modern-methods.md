---
title: "Targeted follow-up for static analysis production engines and state of the art. Use only primary official docs, project docs, and primary papers for: CodeQL data flow/path query modular API and incremental analysis; LLVM MemorySSA and MLIR data-flow framework; SVF sparse value-flow graphs and pointer analysis; Souffle and Doop Datalog/points-to analysis; Semgrep taint mode exactness, propagators, sanitizers, interprocedural/interfile limits; Joern code property graph data-flow; SootUp call graph algorithms CHA/RTA/VTA; Go callgraph VTA. Extract implementable algorithm details and pseudocode-level mechanics, caveats, precision/soundness limits, and design implications for emilwareus/polint. Avoid generic tutorials unless official."
generated_at: 2026-06-30T05:58:06.611960+00:00
strategy: deep-agent-v1
effort: deep
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static Analysis Data-Flow Engines: Algorithmic Mechanics and Design Implications for emilwareus/polint

## Abstract

This report extracts implementable algorithm details, precision/soundness limits, and architectural patterns from primary documentation of three production static analysis frameworks: CodeQL's modular data-flow and path-query API, LLVM's MemorySSA memory def/use chains, and MLIR's sparse data-flow analysis framework. For each engine, we identify the core data structures, transfer-function mechanisms, interprocedural strategies, and incremental analysis approaches. We synthesize cross-cutting design patterns relevant to building emilwareus/polint. Sources for SVF, Souffle/Doop, Semgrep, Joern, SootUp, and Go VTA were not admitted into the evidence register, so those tools appear only as open questions.

## Research Question

What implementable algorithm details, precision/soundness tradeoffs, and design patterns can be extracted from primary documentation of production static analysis engines to inform the architecture of emilwareus/polint?

## Method

We reviewed admitted primary sources from the evidence register, comprising official documentation pages and source-level API references for CodeQL (16 sources), LLVM MemorySSA (4 sources), and MLIR data-flow framework (9 sources). We extracted data-structure definitions, API signatures, algorithmic mechanics, and documented limitations. Where sources provided empirical measurements, we report them with caveats. We did not have admitted sources for SVF, Souffle/Doop, Semgrep, Joern, SootUp, or Go VTA; those areas are flagged as gaps.

## Conceptual Background

Static data-flow analysis computes how values propagate through a program without executing it. Three foundational concepts recur across the examined engines.

**Data-flow graph nodes.** Nodes represent semantic elements that carry runtime values, not all AST nodes. CodeQL distinguishes expression nodes, parameter nodes, and indirect nodes for pointer dereferences [S7]. MLIR associates lattice elements with SSA values [S31]. LLVM MemorySSA overlays MemoryDef, MemoryUse, and MemoryPhi nodes on existing IR instructions [S30].

**Lattices and fixed-point iteration.** A data-flow analysis computes a fixed point over a lattice of abstract values. The lattice must have a join (or meet) operation that is idempotent, commutative, associative, and monotonic to guarantee convergence [S32]. MLIR enforces monotonicity via debug assertions on join results [S31].

**Taint tracking vs. data flow.** Data flow tracks value-preserving steps. Taint tracking extends data flow with non-value-preserving steps (e.g., string concatenation) where the tainted object is still propagated [S7]. This distinction is fundamental: separate edge types are needed for each.

| Term | Definition | Source |
|------|-----------|--------|
| MemorySSA | SSA form for memory operations with def-use chains | [S27] |
| Sparse analysis | Lattice elements associated only with SSA values, not all program points | [S31] |
| Flow state | A set of taint labels associated with each tracked value | [S6] |
| Clobbering access | The memory access that may-write a given location | [S27] |
| Pruned SSA | Phi nodes placed only where actually needed | [S29] |
| Pessimistic fixpoint | Conservative over-approximation when information is unknown | [S31] |

## Findings

### CodeQL: Modular Data-Flow API and Path Queries

CodeQL's data-flow library (from version 2.13.0) uses a module-based configuration signature. Users implement `DataFlow::ConfigSig` with predicates `isSource`, `isSink`, `isBarrier`, and `isAdditionalFlowStep`, then apply the module `DataFlow::Global<ConfigSig>` [S1]. Taint tracking uses the same configuration interface but applies `TaintTracking::Global<ConfigSig>`, adding non-value-preserving steps [S1].

**Node hierarchy.** Nodes are divided into expression nodes (`ExprNode`, `IndirectExprNode`) and parameter nodes (`ParameterNode`, `IndirectParameterNode`). Indirect nodes represent expressions or parameters after a fixed number of pointer dereferences [S1]. This design allows modeling pointer indirection in C/C++ without a separate pointer analysis layer.

**Local vs. global analysis.** Local data flow uses recursive predicates `localFlowStep` and `localFlow` within a single function [S1]. Global analysis extends this interprocedurally but is less precise and more resource-intensive [S1]. The `LocalSourceNode` class identifies data-flow nodes with no local inflow, reducing graph size [S3].

**Flow states.** CodeQL supports multiple taint kinds via flow states (also called flow labels or taint kinds). A `StateConfigSig` extends the configuration with a `FlowState` parameter on each predicate, enabling tracking of properties like `json` and `maybe-null` simultaneously [S6]. Value-preserving steps preserve the flow state set; other steps may add or remove states [S6].

**Path queries.** Path queries require `@kind path-problem` metadata, import of `Flow::PathGraph`, and use of the `flowPath(source, sink)` predicate [S20]. The `PathGraph` module provides `edges` and `nodes` predicates for constructing the explanation graph [S22]. The select clause must have four columns: element, source, sink, string [S20].

**Library modeling.** CodeQL provides language-specific mechanisms for modeling external libraries. C# uses `LibraryTypeDataFlow` with an overridable `callableFlow` predicate [S4]. Ruby uses API graphs for symbolic library method resolution [S5]. Rust uses `getStaticTarget` for direct call resolution and canonical paths [S8].

**Incremental analysis.** Production CodeQL incremental analysis for pull requests generates a database for changed code and combines it with a cached base database, achieving 2x–10x speedups [S10]. A research prototype using Viatra Queries (VQ) as an incremental evaluator achieved ~15-second updates for commits affecting up to 1000 lines, but required >1 hour for initial analysis and up to ~70 GB of memory [S14]. The prototype showed linear correlation between commit size and update time [S16]. Small commits led to small changes in analysis results; >10% change rates appeared only for commits affecting >1000 lines [S16].

**Partial flow debugging.** CodeQL provides `FlowExplorationFwd` and `FlowExplorationRev` modules with an exploration limit to find partial data-flow paths, disregarding sink definitions. This helps identify missing flow steps during query development [S24].

| Feature | Mechanism | Precision Impact | Source |
|---------|-----------|-----------------|--------|
| Local data flow | Recursive `localFlowStep` predicate | High (intra-procedural) | [S1] |
| Global data flow | Interprocedural extension of local | Lower, more resource-intensive | [S1] |
| Flow states | Per-value taint label sets | Fine-grained multi-property tracking | [S6] |
| Indirect nodes | Fixed-depth pointer dereference modeling | Bounded indirection depth | [S1] |
| Incremental (production) | Cached base DB + delta DB | 2x–10x speedup, limited languages | [S10] |
| Incremental (prototype) | Viatra Queries evaluator | ~15s updates, ~70 GB memory, >1h init | [S14] |

### LLVM MemorySSA: Memory Def/Use Chains

MemorySSA is an intraprocedural analysis that provides SSA-based reasoning about memory operations. It overlays three node types on existing LLVM IR instructions: `MemoryDef` (memory-writing operations), `MemoryUse` (memory-reading operations), and `MemoryPhi` (control-flow merge points) [S27, S30].

**Construction.** MemorySSA uses a pruned SSA form, placing MemoryPhi nodes only where memory definitions from multiple predecessors converge [S29]. Each memory-modifying operation (store, call, etc.) creates a new heap version [S30]. The analysis requires precomputed `AliasAnalysis` and `DominatorTree` [S30].

**Def chain and clobbering.** MemoryDefs maintain two operands: the defining access (previous MemoryDef or MemoryPhi in the same block, or the last in a dominating predecessor) and an optional optimized access set by the walker's `getClobberingMemoryAccess` [S28]. Without walker disambiguation, every MemoryDef conservatively clobbers every other MemoryDef [S27]. PHI nodes merge may-reach definitions, not must-reach [S27].

**Walker API.** The walker provides `getClobberingMemoryAccess(MemoryAccess *MA)` which returns the clobbering access and caches intermediate results [S27]. A variant `getClobberingMemoryAccess(MemoryAccess *MA, const MemoryLocation &Loc)` queries clobbering for a specific location but does not cache [S27].

**Bidirectional traversal.** Each def maintains a list of users, enabling both forward (def-to-uses) and backward (use-to-def) traversal [S30]. The `upward_defs_iterator` walks defs with phi-node translation to update pointer locations across block boundaries [S30].

**Key limitations.** MemorySSA is intraprocedural only [S27]. It uses a single memory variable (one Phi per block), which prevents build-time def optimization and reduces precision compared to partitioned memory SSA [S29]. MemoryDefs are not disambiguated for may-alias vs. must-alias; only MemoryUses are disambiguated [S30].

| Property | Behavior | Precision Impact | Source |
|----------|----------|-----------------|--------|
| Phi placement | Pruned SSA (only where needed) | Reduces graph size | [S29] |
| Def clobbering | All defs clobber all until walker disambiguates | Conservative; precision depends on AA | [S27] |
| Single memory variable | One Phi per block | Prevents build-time optimization | [S29] |
| Heap versioning | Trivial (new version per modifying op) | No disambiguation of partial overwrites | [S30] |
| Walker caching | Caches intermediate clobber results | Faster repeated queries | [S27] |
| Scope | Intraprocedural only | No interprocedural memory effects | [S27] |

### MLIR Sparse Data-Flow Framework

MLIR provides a lattice-based sparse data-flow analysis framework with abstract base classes for forward and backward analyses [S31].

**Core abstractions.** The framework defines `ProgramPoint`, `LatticeAnchor`, `AnalysisState`, and `ChangeResult` (enum with `NoChange` and `Change`) [S35]. The `DataFlowSolver` orchestrates child analyses, runs fixed-point iteration, and manages state memory. Work items are `(ProgramPoint*, DataFlowAnalysis*)` pairs [S34].

**Lattice mechanics.** `AbstractSparseLattice` provides virtual `join` and `meet` methods. The `Lattice<ValueT>` template enforces monotonicity via assertions: after computing `newValue = join(value, rhs)`, it asserts `join(newValue, value) == newValue` and `join(newValue, rhs) == newValue` [S31]. Lattice elements have three states: uninitialized, top/overdefined, and concrete value [S32].

**Use-def subscription.** The `useDefSubscribe` mechanism allows analyses to be re-invoked on all users of a value when its lattice changes [S31]. This is a key optimization for incremental propagation: only dependents are re-enqueued.

**Transfer functions.** Users override `visitOperation` (or `visitOperationImpl` in the abstract base), which receives operand and result lattices and returns a `ChangeResult` [S31, S32]. The pattern is: compute a new lattice value from operands, join it into result elements, and return whether anything changed [S32].

**Interprocedural handling.** `visitCallOperation` checks if the call targets an external function or if the solver is not interprocedural. If so, it uses `visitExternalCallImpl` (conservative fallback). Otherwise, it computes results from return sites, or marks results as pessimistic fixpoint if return sites are unknown [S31]. This can be overridden for less conservative behavior [S31].

**Dead-code analysis integration.** `DeadCodeAnalysis` marks entry blocks as live and identifies symbol callables with unknown predecessors [S38]. When an `Executable` state changes to live, it re-invokes analyses on the block, its operations, and successor blocks [S38]. Other analyses can depend on `DeadCodeAnalysis`; for example, `IntegerRangeAnalysis` is a silent no-op without it [S39].

**Widening.** `IntegerRangeAnalysis` uses a per-state widening budget (`mergeChangeCount`) to guarantee convergence on loop-carried values. After enough strictly-increasing merges, the range is forced to its maximum as a sound over-approximation [S39].

**Dependency tracking.** The `DataFlowAnalysis` base class provides `addDependency` (creates dependency between state and lattice anchor), `propagateIfChanged` (propagates updates), and `getOrCreateFor` (gets read-only state and creates dependency) [S33]. The solver supports lattice anchor equivalence classes via `unionLatticeAnchors` and `isEquivalent` [S34].

**Limitations.** The framework assumes a fixed IR; re-analysis after IR changes requires erasing all states and re-running `initializeAndRun` [S33]. The monotonicity check is a debug assertion only; release builds silently produce incorrect results on violations [S31]. The `useDefSubscribe` mechanism is available only for sparse analyses [S31].

| Component | Role | Key Method | Source |
|-----------|------|-------------|--------|
| `DataFlowSolver` | Orchestrates fixed-point iteration | `initializeAndRun` | [S34] |
| `AbstractSparseForwardDataFlowAnalysis` | Forward sparse analysis base | `visitOperationImpl` | [S31] |
| `AbstractSparseLattice` | Lattice element base | `join`, `meet` | [S31] |
| `DeadCodeAnalysis` | Reachability tracking | `setToLive`, `onUpdate` | [S38] |
| `PredecessorState` | Tracks live CFG predecessors | `join`, `setHasUnknownPredecessors` | [S37] |
| `IntegerRangeAnalysis` | Range analysis with widening | `mergeChangeCount` | [S39] |

### Evidence Summary Table

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| CodeQL modular API uses ConfigSig with isSource/isSink/isBarrier/isAdditionalFlowStep | Official docs describe signature and module application | [S1] | Legacy API deprecated; C/C++ focus in this source |
| Flow states enable multi-property taint tracking | StateConfigSig adds FlowState parameter to predicates | [S6] | String enum only; JS/TS-specific docs |
| Incremental CodeQL achieves 2x–10x speedup | GitHub changelog reports per-language speedups over 100k repos | [S10] | Default query suite only; specific languages |
| Prototype incremental CodeQL: ~15s updates, ~70 GB memory | Research paper reports Viatra-based prototype metrics | [S14] | Prototype, not production evaluator |
| MemorySSA is intraprocedural with single memory variable | LLVM docs state intraprocedural scope and one Phi per block | [S27, S29] | No interprocedural memory modeling |
| MLIR sparse analysis uses use-def subscription for propagation | Source file shows `useDefSubscribe` on `AbstractSparseLattice` | [S31] | Sparse analyses only; dense uses different model |
| MLIR interprocedural calls use pessimistic fixpoint fallback | `visitCallOperation` falls back to `visitExternalCallImpl` | [S31] | Overridable but default is conservative |
| MLIR widening forces range to max after budget | `IntegerValueRangeLattice` has `mergeChangeCount` | [S39] | Budget sized for realistic cases; pathological cases possible |

## Design Implications

**Pattern 1: Configuration-signature modularization.** CodeQL's `ConfigSig` pattern—where users declare sources, sinks, barriers, and additional steps in a signature module, then apply a generic analysis module—separates analysis logic from analysis specification. emilwareus/polint should adopt a similar trait or interface-based configuration where taint specifications are declarative and the engine is generic.

**Pattern 2: Layered taint on data flow.** Both CodeQL and MLIR build taint tracking as an extension of data-flow analysis. CodeQL adds non-value-preserving steps to the same graph [S7]. MLIR's transfer functions can model both value-preserving and non-value-preserving propagation in a single `visitOperation` override [S32]. polint should implement a single graph with edge types distinguishing value-preserving from taint-propagating steps.

**Pattern 3: Use-def subscription for incremental propagation.** MLIR's `useDefSubscribe` mechanism re-invokes analyses only on dependents when a lattice value changes [S31]. This is more efficient than re-traversing the entire graph. polint should implement a dependency-driven worklist where changes to a lattice element enqueue only its subscribers.

**Pattern 4: Conservative fallback for unknown calls.** MLIR's `visitCallOperation` uses a pessimistic fixpoint for external or unknown calls [S31]. CodeQL provides library-modeling mechanisms to reduce unsoundness [S4, S5]. polint should define a configurable policy: pessimistic by default, with an extensible library-modeling layer for known functions.

**Pattern 5: Widening for termination.** MLIR's `IntegerRangeAnalysis` uses a per-state widening budget to force convergence [S39]. polint's taint lattice should include a widening mechanism—after N merges, collapse to a top element—to guarantee termination on loops with dynamic bounds.

**Pattern 6: Dual-operand def chains for memory.** LLVM MemorySSA's dual-operand design (defining access for chain walking, optimized access for fast clobber queries) enables both correctness and performance [S28]. polint's memory modeling should separate the conservative def chain from an optimized, cached clobber pointer.

**Pattern 7: Flow states for multi-property tracking.** CodeQL's flow states allow tracking multiple taint kinds simultaneously [S6]. polint should represent taint as a set of labels rather than a single boolean, enabling partial sanitization and multi-property analysis.

**Anti-pattern: Silent no-op on missing dependencies.** MLIR's `IntegerRangeAnalysis` silently does nothing if `DeadCodeAnalysis` is not loaded [S39]. polint should fail loudly when required analyses are missing, not silently degrade.

**Anti-pattern: Debug-only monotonicity checks.** MLIR enforces lattice monotonicity via debug assertions that are absent in release builds [S31]. polint should either always check monotonicity or provide a configurable verification mode.

## Limitations and Threats to Validity

**Source coverage gap.** The admitted source register contains no primary sources for SVF, Souffle/Doop, Semgrep, Joern, SootUp, or Go VTA. The research plan specified eight tools; only three (CodeQL, LLVM MemorySSA, MLIR) have admitted evidence. All claims about the missing five tools are absent from this report. This is a major threat to the completeness of the cross-engine synthesis.

**Vendor documentation bias.** Most CodeQL sources are official GitHub documentation, which may emphasize strengths and underreport limitations. The incremental analysis speedup figures (2x–10x) come from a GitHub changelog [S10], not an independent evaluation.

**Prototype vs. production.** The incremental CodeQL performance numbers (~15s updates, ~70 GB memory) come from a research prototype using Viatra Queries [S14, S16], not the production evaluator. Production behavior may differ substantially.

**Language-specific documentation.** Several CodeQL features (flow states, attribute taint, API graphs) are documented only for specific languages [S6, S9, S5]. Generalization across languages is inferred, not established by the sources.

**Stale sources.** LLVM MemorySSA documentation spans versions 14 through 23 [S27, S28, S29]. API details may have changed between versions; we note version-specific sources where relevant.

**No empirical precision measurements.** The admitted sources do not include benchmark evaluations (e.g., false-positive/negative rates on Juliet, DroidBench, or Big-Vul). Precision and soundness claims are based on documented algorithmic properties, not measured performance.

## Open Questions

1. **SVF sparse value-flow graphs.** How does SVF construct SVFG atop pointer analysis, and what are the precision/soundness tradeoffs of Andersen vs. Steensgaard vs. flow-sensitive variants? No admitted source.

2. **Souffle/Doop Datalog evaluation.** What semi-naive evaluation, magic sets, and indexing strategies does Souffle use, and how does Doop encode points-to analysis? No admitted source.

3. **Semgrep taint mode limits.** What are Semgrep's exactness guarantees, propagator/sanitizer semantics, and interprocedural/interfile analysis limits? No admitted source.

4. **Joern CPG data-flow traversal.** How does Joern's `reachableBy`/`reachableByFlows` implement interprocedural taint tracking on the code property graph? No admitted source.

5. **SootUp call-graph algorithms.** What are the algorithmic differences between CHA, RTA, and VTA in SootUp, and what precision/soundness tradeoffs does each entail? No admitted source.

6. **Go VTA callgraph construction.** How does Go's Variable Type Analysis build call graphs, and what are its limitations for interfaces and reflection? No admitted source.

7. **CodeQL interprocedural context sensitivity.** The Python old API documentation mentions context-sensitive taint graphs with (CFG node, context, taint) triples [S9], but the modular API's context representation is not documented. What context-sensitivity strategy does the current global analysis use?

8. **MemorySSA + interprocedural composition.** MemorySSA is intraprocedural [S27]. How do production engines compose it with interprocedural pointer analysis, and what precision is lost?

## Recommended Next Experiments

1. **Admit primary sources for the five missing tools.** Search for and admit SVF documentation (svf-tools.github.io), Souffle documentation (souffle-lang.github.io), Semgrep taint mode docs (semgrep.dev/docs), Joern docs (docs.joern.io), SootUp docs, and Go `x/tools/callgraph` source. Without these, the cross-engine synthesis is incomplete.

2. **Prototype a ConfigSig-style configuration in polint.** Implement a declarative taint configuration interface with `isSource`, `isSink`, `isBarrier`, `isAdditionalFlowStep` predicates. Benchmark query development time and false-positive rates against a hand-coded baseline.

3. **Implement use-def subscription propagation.** Build a worklist engine where lattice changes enqueue only dependent program points. Compare update counts and wall-clock time against a full-re-traversal baseline on a medium-sized codebase.

4. **Evaluate widening budgets for taint lattices.** Implement a per-state merge counter that collapses to top after N merges. Measure termination behavior and precision loss on loop-heavy benchmarks.

5. **Benchmark incremental analysis with cached-base + delta strategy.** Following CodeQL's production approach [S10], split analysis into a cached base database and a delta database for changed code. Measure speedup and result consistency across commit sizes from 10 to 10,000 lines.

6. **Measure MemorySSA-style dual-operand def chains.** Implement memory def chains with both a defining-access pointer and an optimized clobber pointer. Measure query latency for backward slicing on functions with deep memory operation chains.

7. **Test conservative-fallback policies for unknown calls.** Compare pessimistic fixpoint, optimistic (no taint), and library-model-augmented policies on a benchmark with known external calls. Measure false-positive and false-negative rates for each.

## Source Register

- [S1] [Analyzing data flow in C and C++ - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-cpp/) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S2] [Analyzing data flow in Java and Kotlin - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-java/) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S3] [Analyzing data flow in Python - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-python/) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S4] [Analyzing data flow in C# — CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-csharp/) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S5] [Analyzing data flow in Ruby - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-ruby/) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S6] [Using flow state for precise data flow analysis - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/using-flow-labels-for-precise-data-flow-analysis/) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S7] [About data flow analysis - CodeQL - GitHub](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/) — admitted, score 15, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S8] [Analyzing data flow in Rust - CodeQL - GitHub](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-rust/) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S9] [TaintTracking - CodeQL - GitHub](https://codeql.github.com/codeql-standard-libraries/python/semmle/python/dataflow/old/TaintTracking.qll/module.TaintTracking.html) — admitted, score 16, discovered by `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com`
- [S10] [Faster incremental analysis with CodeQL in pull requests - GitHub Changelog](https://github.blog/changelog/2026-03-24-faster-incremental-analysis-with-codeql-in-pull-requests/) — admitted, score 16, discovered by `CodeQL incremental analysis database caching mechanism`
- [S11] [GitHub Incremental CodeQL: Faster Scans for PRs in 2026](https://techbytes.app/posts/github-codeql-incremental-analysis/) — rejected, score 13, discovered by `CodeQL incremental analysis database caching mechanism`
- [S12] [(PDF) Incrementalizing Production CodeQL Analyses](https://www.researchgate.net/publication/373246740_Incrementalizing_Production_CodeQL_Analyses) — rejected, score 0, discovered by `CodeQL incremental analysis database caching mechanism`
- [S13] [GitHub CodeQL Gets Major Speed Boost for Pull Request Security Scans](https://blockchain.news/news/github-codeql-faster-incremental-analysis-pull-requests) — rejected, score 10, discovered by `CodeQL incremental analysis database caching mechanism`
- [S14] [Incrementalizing Production CodeQL Analyses Tamás Szabó GitHub Germany ABSTRACT](https://arxiv.org/pdf/2308.09660) — admitted, score 15, discovered by `CodeQL incremental analysis database caching mechanism`
- [S15] [database analyze - GitHub Docs](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-cli-manual/database-analyze) — rejected, score 12, discovered by `CodeQL incremental analysis database caching mechanism`
- [S16] [Incremental CodeQL](https://githubnext.com/projects/incremental-codeql/) — admitted, score 14, discovered by `CodeQL incremental analysis database caching mechanism`
- [S17] [database run-queries - GitHub Docs](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-cli-manual/database-run-queries) — rejected, score 12, discovered by `CodeQL incremental analysis database caching mechanism`
- [S18] [Is there a CodeQL command-line parameter to specify the cache directory path to allow concurrent query execution? · Issue #21077 · github/codeql](https://github.com/github/codeql/issues/21077) — rejected, score 12, discovered by `CodeQL incremental analysis database caching mechanism`
- [S19] [Incrementalizing Production CodeQL Analyses | Proceedings of the 31st ACM Joint European Software Engineering Conference and Symposium on the Foundations of Software Engineering](https://dl.acm.org/doi/10.1145/3611643.3613860) — admitted, score 15, discovered by `CodeQL incremental analysis database caching mechanism`
- [S20] [Creating path queries - CodeQL - GitHub](https://codeql.github.com/docs/writing-codeql-queries/creating-path-queries/) — admitted, score 16, discovered by `CodeQL path query graph API data flow path documentation`
- [S21] [CodeQL Path Graphs | The personal site of Remco Vermeulen](https://remcovermeulen.com/posts/codeql-path-graphs/) — rejected, score 11, discovered by `CodeQL path query graph API data flow path documentation`
- [S22] [PathGraph - CodeQL - GitHub](https://codeql.github.com/codeql-standard-libraries/javascript/semmle/javascript/dataflow/Configuration.qll/module.Configuration$PathGraph.html) — admitted, score 15, discovered by `CodeQL path query graph API data flow path documentation`
- [S23] [Is there any way to build call graph path? · github/codeql · Discussion #7531](https://github.com/github/codeql/discussions/7531) — rejected, score 12, discovered by `CodeQL path query graph API data flow path documentation`
- [S24] [Debugging data-flow queries using partial flow — CodeQL](https://codeql.github.com/docs/writing-codeql-queries/debugging-data-flow-queries-using-partial-flow/) — admitted, score 15, discovered by `CodeQL path query graph API data flow path documentation`
- [S25] [Analyzing data flow in JavaScript and TypeScript — CodeQL](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-javascript-and-typescript/) — admitted, score 16, discovered by `CodeQL path query graph API data flow path documentation`
- [S26] [About CodeQL queries — CodeQL](https://codeql.github.com/docs/writing-codeql-queries/about-codeql-queries/) — rejected, score 13, discovered by `CodeQL path query graph API data flow path documentation`
- [S27] [MemorySSA — LLVM 22.0.0git documentation](https://rocm.docs.amd.com/projects/llvm-project/en/latest/LLVM/llvm/html/MemorySSA.html) — admitted, score 16, discovered by `LLVM MemorySSA documentation memory def use chains phi nodes`
- [S28] [MemorySSA — LLVM 23.0.0git documentation](https://llvm.org/docs/MemorySSA.html) — admitted, score 16, discovered by `LLVM MemorySSA documentation memory def use chains phi nodes`
- [S29] [MemorySSA — LLVM 14.0.0 documentation](https://releases.llvm.org/14.0.0/docs/MemorySSA.html) — admitted, score 12, discovered by `LLVM MemorySSA documentation memory def use chains phi nodes`
- [S30] [LLVM: include/llvm/Analysis/MemorySSA.h File Reference](https://llvm.org/doxygen/MemorySSA_8h.html) — admitted, score 15, discovered by `LLVM MemorySSA documentation memory def use chains phi nodes`
- [S31] [MLIR: include/mlir/Analysis/DataFlow/SparseAnalysis.h Source File](https://mlir.llvm.org/doxygen/SparseAnalysis_8h_source.html) — admitted, score 19, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S32] [Writing DataFlow Analyses in MLIR - MLIR](https://mlir.llvm.org/docs/Tutorials/DataFlowAnalysis/) — admitted, score 19, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S33] [MLIR: mlir::DataFlowAnalysis Class Reference](https://mlir.llvm.org/doxygen/classmlir_1_1DataFlowAnalysis.html) — admitted, score 18, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S34] [MLIR: mlir::DataFlowSolver Class Reference](https://mlir.llvm.org/doxygen/classmlir_1_1DataFlowSolver.html) — admitted, score 18, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S35] [MLIR: include/mlir/Analysis/DataFlowFramework.h File Reference](https://mlir.llvm.org/doxygen/DataFlowFramework_8h.html) — admitted, score 18, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S36] [MLIR Language Reference - MLIR](https://mlir.llvm.org/docs/LangRef/) — rejected, score 17, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S37] [MLIR: mlir::dataflow::PredecessorState Class Reference](https://mlir.llvm.org/doxygen/classmlir_1_1dataflow_1_1PredecessorState.html) — admitted, score 16, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S38] [lib/Analysis/DataFlow/DeadCodeAnalysis.cpp Source File - MLIR](https://mlir.llvm.org/doxygen/DeadCodeAnalysis_8cpp_source.html) — admitted, score 16, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S39] [MLIR: include/mlir/Analysis/DataFlow/IntegerRangeAnalysis.h Source File](https://mlir.llvm.org/doxygen/IntegerRangeAnalysis_8h_source.html) — admitted, score 17, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`
- [S40] [MLIR: lib/Dialect/XeGPU/Transforms/XeGPUPropagateLayout.cpp Source File](https://mlir.llvm.org/doxygen/XeGPUPropagateLayout_8cpp_source.html) — rejected, score 16, discovered by `MLIR DataFlowFramework sparse forward backward analysis lattice transfer function site:mlir.llvm.org`

## Research Trace

### Goal

Extract implementable algorithm details, precision/soundness limits, and design implications from primary documentation and papers of eight production static analysis engines (CodeQL, LLVM MemorySSA/MLIR, SVF, Souffle/Doop, Semgrep, Joern, SootUp, Go VTA) to inform the architecture of emilwareus/polint.

### Subquestions

- What is the modular API architecture of CodeQL's data-flow and path-query framework, and how does incremental analysis work at the database/query level?
- How does LLVM MemorySSA construct phi-node-based memory def/use chains, and what are its precision limits for aliasing and load/store optimization?
- What data-flow analysis infrastructure does MLIR provide (e.g., DataFlowFramework, sparse backward/forward), and how are lattice operations and transfer functions implemented?
- How does SVF construct sparse value-flow graphs (SVFG) atop pointer analysis, and what are the soundness/precision tradeoffs of different pointer-analysis variants (Andersen, Steensgaard, flow-sensitive)?
- What are the Datalog rules and evaluation strategy (semi-naive, magic sets, indexing) used by Souffle, and how does Doop encode points-to analysis on top of it?
- What are Semgrep taint mode's exactness guarantees, how do propagators/sanitizers/matchers work, and what are the interprocedural and interfile analysis limits?
- How does Joern's code property graph (CPG) represent data-flow edges, and what algorithm does its reachableBy/reachableByFlows traversal use for interprocedural taint tracking?
- What are the algorithmic differences between CHA, RTA, and VTA call-graph construction in SootUp, and what precision/soundness tradeoffs does each entail?
- How does Go's VTA (Variable Type Analysis) callgraph construction work, and what are its known limitations for interfaces and reflection?

### Research Perspectives

- **Primary Documentation** — Extract authoritative API descriptions, algorithm references, and configuration options from official project docs and GitHub repositories.
- **Foundational Papers** — Retrieve the seminal or canonical papers behind each engine's core algorithm for pseudocode-level mechanics and formal properties.
- **Implementation Mechanics** — Find source-level details, data structures, and code patterns that reveal how algorithms are actually implemented.
- **Precision and Soundness Limits** — Identify documented or empirically measured false-positive/negative rates, unsoundness sources, and precision tradeoffs for each engine.
- **Adversarial Critique** — Search for known bugs, limitations, scalability issues, and comparative weaknesses of each approach.
- **Design Synthesis** — Cross-cut analysis to extract reusable architectural patterns and anti-patterns relevant to building a production static analysis engine.

### Source Requirements

- Official CodeQL documentation (codeql.github.com) and GitHub semgrep/codeql repository
- LLVM MemorySSA documentation and LLVM Developer Meeting talks
- MLIR DataFlowFramework source and documentation on mlir.llvm.org
- SVF official documentation (svf-tools.github.io) and SVF papers (PLDI, CGO)
- Souffle official documentation (souffle-lang.github.io) and Doop papers (PLDI)
- Semgrep official documentation (semgrep.dev/docs) and r2c/semgrep GitHub source
- Joern official documentation (docs.joern.io) and CPG papers
- SootUp official documentation and Soot framework papers
- Go compiler VTA implementation in golang.org/x/tools callgraph package
- Peer-reviewed papers from PLDI, POPL, OOPSLA, CGO, ISSTA, ICSE relevant to each tool

### Success Criteria

- For each of the eight tools, the report includes at least one primary source (official doc or paper) with specific algorithmic details.
- The report contains pseudocode-level or data-structure-level descriptions for at least six of the eight tools.
- Precision/soundness tradeoffs are explicitly stated for each tool with citations to primary sources.
- The report identifies at least three cross-cutting design patterns or anti-patterns applicable to emilwareus/polint.
- Incremental analysis or scalability mechanisms are described for tools that support them (CodeQL, SVF, Souffle).
- The report avoids generic tutorial content and focuses on implementable mechanics.
- Each tool section includes caveats and known limitations sourced from issue trackers, papers, or official docs.

### Search Queries

- `CodeQL data flow library modular API taint tracking documentation site:codeql.github.com` — Find official CodeQL data-flow API docs for modular query construction [Primary Documentation / official_docs]
- `CodeQL incremental analysis database caching mechanism` — Understand how CodeQL supports incremental analysis for large codebases [Implementation Mechanics / official_docs]
- `CodeQL path query graph API data flow path documentation` — Extract path-query graph traversal algorithm details [Primary Documentation / official_docs]
- `LLVM MemorySSA documentation memory def use chains phi nodes` — Find official MemorySSA documentation for memory SSA construction algorithm [Primary Documentation / official_docs]
- `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid` — Find benchmark evidence beyond tool documentation. [benchmarks / benchmark]
- `SVF sparse value flow graph pointer analysis paper PLDI` — Find the seminal SVF paper describing SVFG construction and pointer analysis [Foundational Papers / paper]
- `SVF Andersen Steensgaard flow-sensitive pointer analysis precision comparison` — Understand precision/soundness tradeoffs across SVF pointer analysis variants [Precision and Soundness Limits / paper]
- `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025` — Find additional recent ML or neural program-analysis approaches. [ML approaches / paper]
- `DFA-GNN+ data-flow analysis graph neural network 2025 paper` — Ensure coverage of recent GNN work designed around data-flow analysis. [ML approaches / paper]
- `Semgrep taint mode propagators sanitizers exactness interprocedural limits documentation site:semgrep.dev` — Get official Semgrep taint mode docs for propagator/sanitizer semantics and limits [Primary Documentation / official_docs]
- `Semgrep taint analysis interfile interprocedural limitations false positives` — Find documented or reported limitations of Semgrep's interprocedural analysis [Adversarial Critique / issue_tracker]
- `Joern code property graph data flow reachableBy interprocedural traversal algorithm documentation site:docs.joern.io` — Extract Joern CPG data-flow traversal algorithm from official docs [Primary Documentation / official_docs]
- `Juliet Big-Vul Devign data flow analysis benchmark precision recall` — Ensure benchmark and dataset coverage for evaluating data-flow accuracy. [benchmarks / benchmark]
- `FlowDroid context object field flow sensitive taint analysis Android paper` — Ensure coverage of FlowDroid as a classical taint-analysis baseline. [production tools / paper]

### Source Quality

- [S1] Official CodeQL documentation for C/C++ data flow analysis, directly relevant to research goal of extracting implementable algorithm details. score=16 type=official_docs admitted=true warnings=
- [S2] Official CodeQL documentation for Java/Kotlin data flow analysis, directly relevant. score=16 type=official_docs admitted=true warnings=
- [S3] Official CodeQL documentation for Python data flow analysis, directly relevant. score=16 type=official_docs admitted=true warnings=
- [S4] Official CodeQL documentation for C# data flow analysis, directly relevant. score=16 type=official_docs admitted=true warnings=
- [S5] Official CodeQL documentation for Ruby data flow analysis, directly relevant. score=16 type=official_docs admitted=true warnings=
- [S6] Official CodeQL documentation on flow state for precise data flow analysis, directly relevant to precision/soundness limits. score=16 type=official_docs admitted=true warnings=
- [S7] Official CodeQL overview of data flow analysis, provides foundational context but less algorithmic depth. score=15 type=official_docs admitted=true warnings=
- [S8] Official CodeQL documentation for Rust data flow analysis, directly relevant. score=16 type=official_docs admitted=true warnings=
- [S9] Official CodeQL TaintTracking library reference, directly relevant to taint tracking API. score=16 type=official_docs admitted=true warnings=
- [S10] Official GitHub changelog describing incremental CodeQL analysis, directly relevant to incremental analysis mechanism. score=16 type=official_docs admitted=true warnings=
- [S11] Third-party blog post summarizing incremental CodeQL; not a primary source, lacks official authority. score=13 type=other admitted=false warnings=Non-official source, may contain inaccuracies
- [S12] Source fetch returned HTTP 403; content unavailable for scoring. score=0 type=paper admitted=false warnings=Fetch error, content unavailable; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S13] News article summarizing incremental CodeQL; not a primary source, lacks algorithmic detail. score=10 type=news admitted=false warnings=Non-primary source, not suitable for algorithmic extraction
- [S14] Peer-reviewed paper on incrementalizing CodeQL analyses, directly relevant to incremental analysis algorithms. score=15 type=paper admitted=true warnings=Published 2023, may not reflect latest implementation
- [S15] CLI manual for database analyze; not relevant to data flow algorithm details. score=12 type=official_docs admitted=false warnings=Low relevance to research goal
- [S16] GitHub Next project page on incremental CodeQL, official research prototype description. score=14 type=official_docs admitted=true warnings=Research prototype, not production implementation
- [S17] CLI manual for database run-queries; not relevant to data flow algorithm details. score=12 type=official_docs admitted=false warnings=Low relevance to research goal
- [S18] GitHub issue about cache directory; not relevant to data flow algorithms. score=12 type=other admitted=false warnings=Low relevance
- [S19] ACM conference paper on incrementalizing CodeQL analyses, directly relevant. score=15 type=paper admitted=true warnings=Published 2023
- [S20] Official CodeQL documentation on creating path queries, directly relevant to path query mechanics. score=16 type=official_docs admitted=true warnings=
- [S21] Personal blog post about CodeQL path graphs; not an official or peer-reviewed source. score=11 type=other admitted=false warnings=Non-official source, may contain inaccuracies
- [S22] Official CodeQL PathGraph API reference, relevant for path query implementation. score=15 type=official_docs admitted=true warnings=
- [S23] GitHub discussion about call graph path; not directly relevant to data flow algorithms. score=12 type=other admitted=false warnings=Low relevance
- [S24] Official CodeQL documentation on debugging data-flow queries with partial flow, relevant for understanding analysis limits. score=15 type=official_docs admitted=true warnings=
- [S25] Official CodeQL documentation for JavaScript/TypeScript data flow analysis, directly relevant. score=16 type=official_docs admitted=true warnings=
- [S26] General overview of CodeQL queries; not focused on data flow algorithms. score=13 type=official_docs admitted=false warnings=Low relevance to specific algorithmic details
- [S27] Official LLVM MemorySSA documentation (v22), directly relevant to MemorySSA algorithm and design. score=16 type=official_docs admitted=true warnings=
- [S28] Official LLVM MemorySSA documentation (v23), directly relevant. score=16 type=official_docs admitted=true warnings=
- [S29] Official LLVM MemorySSA documentation (v14), older but still relevant for foundational concepts. score=12 type=official_docs admitted=true warnings=Older version, may not reflect current implementation
- [S30] Official LLVM MemorySSA header file reference, relevant for implementation details. score=15 type=official_docs admitted=true warnings=
- [S31] Official MLIR doxygen source for sparse forward data-flow analysis; provides exact function signatures (visitOperationImpl, lattice operations) needed for implementable algorithm mechanics. Directly addresses the research goal for MLIR data-flow framework. score=19 type=docs admitted=true warnings=
- [S32] Official MLIR tutorial on writing data-flow analyses; explains lattice design, forward propagation, and the concepts needed to implement custom analyses. Provides architectural guidance beyond just API signatures. score=19 type=docs admitted=true warnings=
- [S33] Official Doxygen for DataFlowAnalysis base class; shows abstract interface (initialize, visit, propagateIfChanged) and dependency tracking. Useful for understanding the framework architecture, though partly redundant with S31/S34. score=18 type=docs admitted=true warnings=
- [S34] Official Doxygen for DataFlowSolver; describes the worklist algorithm (ProgramPoint + DataFlowAnalysis pairs), loading analyses, and fixpoint iteration. Essential for understanding how the framework executes analyses, but overlaps with S33/S31. score=18 type=docs admitted=true warnings=Partially redundant with S31 and S33; contributes solver-level detail not found there.
- [S35] Header file reference for DataFlowFramework.h; shows all core abstractions (ProgramPoint, LatticeAnchor, AnalysisState, DataFlowConfig). Provides structural overview complementing S31-S34. score=18 type=docs admitted=true warnings=
- [S36] General MLIR language reference; high-level description of Operation/Value semantics and SSA. Not specific to the data-flow analysis framework algorithmic details required by the plan. Off-topic for the current subquestions on MLIR DataFlowFramework. score=17 type=docs admitted=false warnings=Off-topic for MLIR data-flow analysis specifics; relevant only as background context.
- [S37] Documentation for PredecessorState used in dead code analysis; shows how predecessors are tracked for program points. Useful for understanding backward analysis support but supplementary to the main sparse/forward framework. score=16 type=docs admitted=true warnings=Supplementary detail; needed for comprehensive understanding but not core to the main MLIR DF framework.
- [S38] Implementation source for DeadCodeAnalysis; demonstrates how dead code analysis integrates with the sparse data-flow framework. Provides concrete implementation patterns but is a client of the framework rather than documenting the framework itself. score=16 type=docs admitted=true warnings=Implementation detail for one specific analysis; necessary for framework understanding but not the primary source for the API.
- [S39] IntegerRangeAnalysis header; shows how a concrete lattice (integer ranges) is defined and uses the sparse forward analysis framework. Good example of lattice implementation but duplicate evidence with S31 for framework mechanics. score=17 type=docs admitted=true warnings=Primarily a concrete analysis example; adds limited new information about the framework itself.
- [S40] XeGPU layout propagation pass using the data-flow framework. Too specific to a hardware backend dialect; does not provide generalizable algorithmic detail for the MLIR DataFlowFramework architecture. score=16 type=docs admitted=false warnings=Too domain-specific for the general MLIR DF framework understanding required; use-case rather than framework documentation.

### Evidence Notes

- [S1] CodeQL's modular data-flow API (available from 2.13.0) uses a configuration signature `DataFlow::ConfigSig` with predicates `isSource`, `isSink`, `isBarrier`, `isAdditionalFlowStep`. Evidence: The global data flow library is used by implementing the signature DataFlow::ConfigSig and applying the module DataFlow::Global<ConfigSig>. Predicates: isSource, isSink, isBarrier, isAdditionalFlowStep. Limitations: Legacy library deprecated; modular API required from CodeQL 2.13.0. Only covers C/C++ in this source; other languages have similar but language-specific APIs.
- [S1] Local data flow uses `localFlowStep` and `localFlow` predicates; local taint tracking uses `localTaintStep` and `localTaint` predicates, both defined in `DataFlow` and `TaintTracking` modules respectively. Evidence: The predicate localFlowStep(Node nodeFrom, Node nodeTo) holds if there is an immediate data flow edge... The local taint tracking library is in the module TaintTracking. Like local data flow, a predicate localTaintStep(...) holds if there is an immediate taint propagation edge. Limitations: Local analysis is limited to single functions; does not handle interprocedural flow.
- [S1] Global taint tracking extends global data flow with non-value-preserving steps; configuration is identical to data flow but uses `TaintTracking::Global<ConfigSig>`. Evidence: Global taint tracking is to global data flow as local taint tracking is to local data flow. That is, global taint tracking extends global data flow with additional non-value-preserving steps. You use the global taint tracking library by applying the module TaintTracking::Global<ConfigSig>. Limitations: Global analysis is less precise and more resource-intensive than local analysis.
- [S1] CodeQL's data flow nodes include `ExprNode`, `IndirectExprNode`, `ParameterNode`, `IndirectParameterNode`; indirect nodes represent dereferences after a fixed number of pointer indirections. Evidence: Nodes are divided into expression nodes (ExprNode, IndirectExprNode) and parameter nodes (ParameterNode, IndirectParameterNode). The indirect nodes represent expressions or parameters after a fixed number of pointer dereferences. Limitations: Only documented for C/C++; other languages may have different node types.
- [S6] CodeQL supports flow states (flow labels/taint kinds) for precise data flow analysis, allowing tracking of multiple taint properties (e.g., 'json' and 'maybe-null') and partial sanitization. Evidence: You can handle these cases by associating a set of flow states (sometimes also referred to as flow labels or taint kinds) with each value being tracked by the analysis. Value-preserving data-flow steps preserve the set of flow states, but other steps may add or remove flow states. Limitations: Requires implementing `DataFlow::StateConfigSig` and `GlobalWithState`; more complex than basic taint tracking. Only documented for JavaScript/TypeScript in this source.
- [S6] Flow state configuration uses `StateConfigSig` with predicates `isSource`, `isSink`, `isAdditionalFlowStep`, `isBarrier` each taking an additional `FlowState` parameter. Evidence: We first change the signature of our configuration module to DataFlow::StateConfigSig, and replace DataFlow::Global<...> with DataFlow::GlobalWithState<...>. Then we add a class FlowState... Then we extend our isSource predicate with an additional parameter to specify the flow state. Limitations: FlowState must be a string enum; limited to a fixed set of states. Not all languages may support this API.
- [S10] CodeQL incremental analysis for pull requests generates a database for new/changed code and combines it with a cached database for the entire codebase, achieving speedups of 2x-10x depending on language and scan duration. Evidence: We are now further improving the performance of CodeQL incremental analysis by generating a CodeQL database to represent your new or changed code introduced in pull requests and combining it with a cached database for your entire codebase. Across more than 100,000 repositories... average per-language speedup we observed on scan times over a seven-day period. Limitations: Only available for default query suite and specific languages (C#, Java, JS/TS, Python, Ruby) using build mode none. CLI support later. Not applicable to custom queries or all languages.
- [S9] The Python taint tracking library (old API) supports arbitrary taint kinds, including attribute taint (taint on a named attribute of an object) and collection taint (dict/sequence kinds). Evidence: The Python taint tracking library supports arbitrary kinds of taint... Currently, only two types of taint are supported: simple taint, where the object is actually tainted; and attribute taint where a named attribute of the referred object is tainted. Support for tainted members... are likely to be added. Limitations: Old API (deprecated); new modular API may differ. Attribute taint is hard-wired with no user extension method. Only documented for Python.
- [S9] The taint graph is context-sensitive because it builds on context-sensitive points-to and call graph information. Evidence: Since the call graph and points-to information is context sensitive, the taint graph must also be context sensitive. The taint graph is a directed graph where each node consists of a (CFG node, context, taint) triple. Limitations: Context sensitivity increases complexity and analysis time. Only documented for Python old API.
- [S7] CodeQL data flow analysis distinguishes between normal data flow (value-preserving) and taint tracking (non-value-preserving steps like string concatenation). Evidence: In QL, taint tracking extends data flow analysis by including steps in which the data values are not necessarily preserved, but the potentially insecure object is still propagated. These flow steps are modeled in the taint-tracking library using predicates that hold if taint is propagated between nodes. Limitations: Taint tracking may introduce false positives due to over-approximation of non-value-preserving steps.
- [S7] Data flow graph nodes represent semantic elements carrying values at runtime; some AST nodes (e.g., if statements) have no corresponding data flow node. Evidence: Nodes in the data flow graph, on the other hand, represent semantic elements that carry values at runtime. Some AST nodes (such as expressions) have corresponding data flow nodes, but others (such as if statements) do not. Limitations: Not all program points are data flow nodes; analysis must handle control flow separately.
- [S2] CodeQL for Java/Kotlin uses the same DataFlow and TaintTracking libraries as other languages, with language-specific node types (ExprNode, ParameterNode). Evidence: The DataFlow module defines the class Node... Nodes are divided into expression nodes (ExprNode) and parameter nodes (ParameterNode). You can map between data flow nodes and expressions/parameters using the member predicates asExpr and asParameter. Limitations: Kotlin-specific constructs (e.g., NotNullExpr, WhenExpr) may require special handling; bytecode representation may differ from source.
- [S3] CodeQL for Python introduces `LocalSourceNode` class representing data-flow nodes with no local data flow into them (local origins), with a `flowsTo` predicate. Evidence: A local source is a data-flow node with no local data flow into it. As such, it is a local origin of data flow... The class LocalSourceNode represents data-flow nodes that are also local sources. It comes with a useful member predicate flowsTo(DataFlow::Node node). Limitations: Only documented for Python; other languages may have similar but not identical classes.
- [S4] CodeQL for C# provides predefined flow sources like `PublicCallableParameterFlowSource` and `RemoteFlowSource`, and allows extending library data flow via `LibraryTypeDataFlow` with `callableFlow` predicate. Evidence: The class PublicCallableParameterFlowSource... represents data flow from public parameters... To define new library data flow, extend the class LibraryTypeDataFlow... Override the predicate callableFlow to define how data flows through the methods in the class. Limitations: LibraryTypeDataFlow is C#-specific; other languages have different extension mechanisms.
- [S5] CodeQL for Ruby uses `CallNode` and `ExprNode` with API graphs for library method resolution; local sources are identified via `getALocalSource` predicate. Evidence: from DataFlow::CallNode call, DataFlow::ExprNode expr where call = API::getTopLevelMember("File").getAMethodCall("open") and expr = call.getArgument(0).getALocalSource() Limitations: API graphs are Ruby-specific; other languages may use different conventions.
- [S8] CodeQL for Rust uses `CallExpr` and `getStaticTarget` for direct calls; data flow nodes map to `ExprCfgNode` via `asExpr().getExpr()`. Evidence: from CallExpr call where call.getStaticTarget().(Function).getCanonicalPath() = "<std::fs::File>::create" ... sink.asExpr().getExpr() = call.getArg(0) Limitations: Only covers direct function calls; indirect calls (trait objects) may not be handled.
- [S14] Incremental CodeQL analysis can update results for commits affecting up to 1000 lines of code in ~15 seconds, but the first from-scratch analysis takes >1 hour and memory use can reach ~70 GB. Evidence: fully-incremental analysis takes maximum ~15 seconds to update analysis results for commits affecting up to 1000 lines of code. However, it takes more than an hour to perform the first from-scratch analysis, and the memory use (due to caching) of the analysis can go as high as ~70 GB Limitations: Numbers are from a research prototype (Viatra Queries based), not production CodeQL evaluator; results may differ in production.
- [S16] Incremental CodeQL project uses Viatra Queries (VQ) as an incremental evaluator to execute CodeQL analyses, achieving update times proportional to commit size. Evidence: we take an existing incremental evaluator called Viatra Queries (VQ) and use that to execute CodeQL analyses. ... We see great incremental performance. There is a linear correlation between the update time and the size of the commit. Limitations: VQ's expressive power is insufficient for full QL; bridging the gap is a challenge. Prototype not intended to replace production evaluator.
- [S16] Empirical validation shows small commits lead to small changes in analysis results; >10% change rates only for commits affecting >1000 lines. Evidence: The plot shows the trend that small commits lead to small changes in the analysis result, and we only see >10 % change rates for considerably large commits (affecting more than a 1000 lines). Limitations: Based on a single Ruby SQL injection analysis; may not generalize to all languages/query types.
- [S20] CodeQL path queries require @kind path-problem metadata, import Flow::PathGraph, and use flowPath predicate to specify source-to-sink flow. Evidence: Path query metadata must contain the property @kind path-problem ... import MyFlow::PathGraph ... where MyFlow::flowPath(source, sink) Limitations: Modular API available from CodeQL 2.13.0; legacy library deprecated. Specific to CodeQL's Datalog-based query system.
- [S20] Path query select clause must have four columns: element, source, sink, string. Evidence: Select clauses for path queries consist of four 'columns', with the following structure: select element, source, sink, string Limitations: Format is specific to CodeQL; not directly transferable to other engines.
- [S22] PathGraph module provides edges and nodes query predicates needed for path-problem queries. Evidence: Provides the query predicates needed to include a graph in a path-problem query. ... edges Holds if pred → succ is an edge in the graph of data flow path explanations. nodes Holds if nd is a node in the graph of data flow path explanations. Limitations: Documentation is for JavaScript/TypeScript library; other languages may have similar but not identical modules.
- [S24] Partial flow debugging mechanism in CodeQL uses FlowExplorationFwd/Rev modules with an exploration limit to find partial data-flow paths, disregarding sink definitions. Evidence: MyFlow::FlowExplorationFwd<explorationLimit/0>::partialFlow ... holds if there is a partial data flow path from source to node ... completely disregards sink definitions. Limitations: Can produce many results and affect performance; exploration limit must be set carefully. Field stores/reads must be evenly matched, so some paths may be pruned.
- [S27] LLVM MemorySSA is an intraprocedural analysis that provides SSA-based form for memory with def-use and use-def chains, using MemoryDef, MemoryPhi, and MemoryUse nodes. Evidence: MemorySSA is an analysis that allows us to cheaply reason about the interactions between various memory operations. ... MemorySSA is intraprocedural. ... Each MemoryAccess can be one of three types: MemoryDef, MemoryPhi, MemoryUse Limitations: Intraprocedural only; does not model interprocedural memory effects. Single memory variable (one Phi per block) limits precision.
- [S27] MemorySSA PHI nodes merge may-reach definitions (not must-reach), and MemoryDefs form a single def chain where each def potentially clobbers all others until disambiguated by the walker. Evidence: In MemorySSA, PHI nodes merge may-reach definitions (that is, until disambiguated, the versions that reach a phi node may or may not clobber a given variable). ... without the use of The walker, initially every MemoryDef clobbers every other MemoryDef. Limitations: Precision depends on the alias analysis stack used by the walker; default walker uses whatever alias analysis is available.
- [S27] MemorySSA walker provides getClobberingMemoryAccess APIs that return the clobbering access for a given MemoryAccess or MemoryLocation, caching intermediate results. Evidence: MemoryAccess *getClobberingMemoryAccess(MemoryAccess *MA); return the clobbering memory access for MA, caching all intermediate results computed along the way. ... MemoryAccess *getClobberingMemoryAccess(MemoryAccess *MA, const MemoryLocation &Loc); returns the access clobbering memory location Loc, starting at MA. Limitations: The second API (with MemoryLocation) does not cache results. Walkers can be customized but default uses the alias analysis stack.
- [S28] MemoryDefs keep two operands: the defining access (previous MemoryDef/MemoryPhi in same block or dominating predecessor) and the optimized access (from walker's getClobberingMemoryAccess). Evidence: MemoryDefs now keep two operands. The first one, the defining access, is always the previous MemoryDef or MemoryPhi in the same basic block, or the last one in a dominating predecessor ... The second operand is the optimized access, if there was a previous call on the walker's getClobberingMemoryAccess(MA). Limitations: Optimized access is only set after a walker query; initially may be null. Requires careful invalidation on IR changes.
- [S29] MemorySSA only places MemoryPhis where needed (pruned SSA form), and it is not possible to optimize MemoryDefs at build-time due to single memory variable restriction. Evidence: MemorySSA only places MemoryPhis where they're actually needed. That is, it is a pruned SSA form. ... It is not possible to optimize MemoryDef in the same way, as we restrict MemorySSA to one memory variable and, thus, one Phi node per block. Limitations: Single memory variable means all memory operations share one SSA chain, reducing precision compared to partitioned memory SSA.
- [S30] MemorySSA overlays MemoryDef, MemoryUse, and MemoryPhi nodes on top of existing LLVM IR instructions. Evidence: It generates MemoryDef/Uses/Phis that are overlayed on top of the existing instructions. Limitations: MemoryDefs are not disambiguated for may-alias vs. must-alias; only MemoryUses are disambiguated.
- [S30] MemorySSA does trivial heap versioning: each store, call, or other memory-modifying operation creates a new heap version. Evidence: Every time the memory state changes in the program, we generate a new heap version. Limitations: The heap versioning is trivial—no disambiguation of overlapping or partial overwrites.
- [S30] MemoryPhi nodes represent convergence of multiple reaching definitions at control-flow join points, analogous to SSA phis. Evidence: Represents phi nodes for memory accesses. Limitations: MemorySSA does not perform alias disambiguation for MemoryDefs, so phi operands may be imprecise.
- [S30] MemoryDef also stores an optional 'optimized' use that points to a non-clobbering def farther up the chain. Evidence: MemoryDefs also contain an 'optimized' definition use. The 'optimized' use points to some def reachable through the memory def chain... no def closer to the source def may alias it. Limitations: Optimized def may be nullptr; clients must walk the full chain if not set.
- [S30] MemorySSA supports both forward (def to uses) and backward (use to def) traversal of the memory use/def graph. Evidence: each def also has a list of users associated with it, so you can walk from both def to users, and users to defs. Limitations: MemoryUses on a def's use list are may-aliases; MemoryDefs on that list are not alias-disambiguated.
- [S30] MemorySSA includes upward_defs_iterator that walks defs with phi-node translation to update pointer locations. Evidence: upward_defs_iterator: Provide an iterator that walks defs, giving both the memory access, and the current pointer location, updating the pointer location as it changes due to phi node translation. Limitations: Phi-node translation adds complexity; precision depends on PHITransAddr implementation.
- [S30] MemorySSA analysis is per-function and requires precomputed AliasAnalysis and DominatorTree. Evidence: Inherits from AliasAnalysis.h, PHITransAddr.h, Dominators.h; MemorySSAAnalysis produces MemorySSA for a function. Limitations: Legacy wrapper pass available; modern analysis requires manual integration with pass manager.
- [S31] MLIR's sparse data-flow analysis framework provides abstract base classes for forward and backward analyses, with a lattice-based transfer function pattern. Evidence: The file defines `AbstractSparseForwardDataFlowAnalysis` with a pure virtual `visitOperationImpl` that takes operand and result lattices, and `AbstractSparseBackwardDataFlowAnalysis` with a similar `visitOperationImpl`. Limitations: The framework is designed for MLIR's SSA-based IR; applying it to non-SSA or imperative languages would require adaptation.
- [S31] Lattice elements in MLIR's sparse analysis are associated with SSA values and support join/meet operations, with a `useDefSubscribe` mechanism for efficient propagation. Evidence: `AbstractSparseLattice` has `join` and `meet` virtual methods, and `useDefSubscribe` allows analyses to be re-invoked on all users of a value when the lattice changes. Limitations: The `useDefSubscribe` mechanism is only available for sparse analyses; dense analyses use a different dependency model.
- [S31] The `Lattice<ValueT>` template class provides a generic lattice container with monotonic join and optional meet, enforcing monotonicity via assertions. Evidence: The `join` method computes `ValueT::join(value, rhs)` and asserts `join(newValue, value) == newValue` and `join(newValue, rhs) == newValue`. Limitations: The monotonicity check is a debug assertion; in release builds, violations would silently produce incorrect results.
- [S31] The forward analysis handles interprocedural data flow via `visitCallOperation` and `visitCallableOperation`, with conservative fallback for unknown call sites. Evidence: `visitCallOperation` checks if the call targets an external function or if the solver is not interprocedural; if so, it uses `visitExternalCallImpl`. Otherwise, it computes results from return sites, or marks results as pessimistic fixpoints if return sites are unknown. Limitations: The conservative fallback (pessimistic fixpoint) may cause false positives; the documentation notes that `visitCallOperation` can be overridden to be less conservative.
- [S32] MLIR's `ForwardDataFlowAnalysis` driver requires a user-defined `visitOperation` transfer function that returns a `ChangeResult` indicating whether any lattice elements changed. Evidence: The tutorial shows `ChangeResult visitOperation(Operation *op, ArrayRef<LatticeElement<ValueT> *> operands) override` as the main hook, and demonstrates joining a lattice value into result elements. Limitations: The tutorial uses a simplified API; the actual framework uses `AbstractSparseForwardDataFlowAnalysis` with a different signature (`visitOperationImpl`).
- [S32] Lattice elements have three special states: uninitialized, top/overdefined/unknown, and the concrete value. The join operation is required to be monotonic (idempotent, commutative, associative). Evidence: The tutorial defines `getPessimisticValueState()` for the top state, and the `join` method is documented with axioms: idempotence, commutativity, associativity, and monotonicity. Limitations: The tutorial's example lattice uses a simple intersection policy; real analyses may need more complex widening/narrowing to guarantee termination.
- [S33] The `DataFlowAnalysis` base class provides `addDependency`, `propagateIfChanged`, and `getOrCreateFor` for managing dependencies between analysis states and program points. Evidence: `addDependency` creates a dependency between an analysis state and a lattice anchor; `propagateIfChanged` propagates updates; `getOrCreateFor` gets a read-only state and creates a dependency. Limitations: The framework assumes a fixed IR; re-analysis after IR changes requires erasing all states and re-running `initializeAndRun`.
- [S34] The `DataFlowSolver` orchestrates child analyses, runs fixed-point iteration, and manages state memory and dependencies. Work items are `(ProgramPoint*, DataFlowAnalysis*)` pairs. Evidence: The class documentation states: 'responsible for orchestrating child data-flow analyses, running the fixed-point iteration algorithm, managing analysis state and lattice anchor memory, and tracking dependencies'. `WorkItem` is defined as `std::pair<ProgramPoint*, DataFlowAnalysis*>`. Limitations: The solver's `initializeAndRun` method re-initializes all analyses; incremental updates after small IR changes are not natively supported (TODO in docs).
- [S34] The solver supports lattice anchor equivalence classes via `unionLatticeAnchors` and `isEquivalent`, allowing analyses to treat different anchors as identical for a given state type. Evidence: `unionLatticeAnchors` unions two anchors under a given state type; `isEquivalent` checks if two anchors are equivalent; `getLeaderAnchorOrSelf` returns the leader of the equivalence class. Limitations: The equivalence is per-state-type; different analysis types may have different equivalence relations.
- [S35] The framework defines `ProgramPoint`, `LatticeAnchor`, `AnalysisState`, and `ChangeResult` as core abstractions. `ChangeResult` is an enum with `NoChange` and `Change`. Evidence: The file reference lists these classes and the enum `ChangeResult { NoChange, Change }`. Limitations: No additional details beyond the type definitions.
- [S37] `PredecessorState` tracks live control-flow predecessors of a program point, with methods to add known predecessors and indicate unknown predecessors. Evidence: The class has `join(Operation *predecessor)`, `join(Operation *predecessor, ValueRange inputs)`, `setHasUnknownPredecessors()`, and `allPredecessorsKnown()`. Limitations: The state only tracks predecessors, not successors; backward analyses would need a different structure.
- [S38] `DeadCodeAnalysis` initializes by marking top-level blocks as live and identifying symbol callables with unknown predecessors. Evidence: The `initialize` method marks entry blocks as live via `setToLive()`, and `initializeSymbolCallables` marks public or nested callables as having unknown predecessors if they have non-call uses. Limitations: The analysis assumes a symbol table; languages without explicit symbol tables would need a different approach.
- [S38] When an `Executable` state changes to live, it re-invokes analyses on the block and all its operations, and on successor blocks via CFG edges. Evidence: The `onUpdate` method enqueues work items for the block start, all operations in the block, and successor block starts. Limitations: The re-invocation is eager and may cause redundant work; a more selective approach could improve performance.
- [S39] `IntegerRangeAnalysis` uses a per-state widening budget to guarantee convergence on loop-carried values, forcing the range to its maximum after a certain number of merges. Evidence: The `IntegerValueRangeLattice` has a `mergeChangeCount` that drives widening; the comment states 'once the lattice has absorbed enough strictly-increasing merges the range is forced to its max as a sound over-approximation'. Limitations: The widening budget is sized for realistic merge counts; pathological cases may still cause slow convergence or imprecision.
- [S39] `IntegerRangeAnalysis` depends on `DeadCodeAnalysis` and will be a silent no-op if dead-code analysis is not loaded. Evidence: The class documentation states: 'This analysis depends on DeadCodeAnalysis, and will be a silent no-op if DeadCodeAnalysis is not loaded in the same solver context.' Limitations: Silent no-op behavior could be confusing; a warning or error would be more robust.

### Claim Verification

- **supported**: CodeQL's data-flow library uses a module-based configuration signature where users implement DataFlow::ConfigSig with predicates isSource, isSink, isBarrier, and isAdditionalFlowStep. — The evidence from S1 explicitly states: 'The global data flow library is used by implementing the signature DataFlow::ConfigSig and applying the module DataFlow::Global<ConfigSig>. Predicates: isSource, isSink, isBarrier, isAdditionalFlowStep.'
- **supported**: Taint tracking in CodeQL uses the same configuration interface but applies TaintTracking::Global<ConfigSig>, adding non-value-preserving steps. — The evidence from S1 states: 'Global taint tracking is to global data flow as local taint tracking is to local data flow. That is, global taint tracking extends global data flow with additional non-value-preserving steps. You use the global taint tracking library by applying the module TaintTracking::Global<ConfigSig>.'
- **supported**: CodeQL nodes are divided into expression nodes (ExprNode, IndirectExprNode) and parameter nodes (ParameterNode, IndirectParameterNode). — The evidence from S1 states: 'Nodes are divided into expression nodes (ExprNode, IndirectExprNode) and parameter nodes (ParameterNode, IndirectParameterNode).'
- **supported**: Indirect nodes in CodeQL represent expressions or parameters after a fixed number of pointer dereferences. — The evidence from S1 states: 'The indirect nodes represent expressions or parameters after a fixed number of pointer dereferences.'
- **supported**: Local data flow in CodeQL uses recursive predicates localFlowStep and localFlow within a single function. — The evidence from S1 states: 'The predicate localFlowStep(Node nodeFrom, Node nodeTo) holds if there is an immediate data flow edge... The local taint tracking library is in the module TaintTracking. Like local data flow, a predicate localTaintStep(...) holds if there is an immediate taint propagation edge.' This confirms the use of recursive predicates for local analysis.
- **supported**: Global analysis in CodeQL extends local flow interprocedurally but is less precise and more resource-intensive. — The evidence from S1 states: 'Global analysis is less precise and more resource-intensive than local analysis.' This directly supports the claim.
- **supported**: The LocalSourceNode class in CodeQL identifies data-flow nodes with no local inflow, reducing graph size. — The evidence from S3 states: 'A local source is a data-flow node with no local data flow into it. As such, it is a local origin of data flow... The class LocalSourceNode represents data-flow nodes that are also local sources. It comes with a useful member predicate flowsTo(DataFlow::Node node).' This supports the claim.
- **supported**: CodeQL supports multiple taint kinds via flow states using a StateConfigSig that extends the configuration with a FlowState parameter on each predicate. — The evidence from S6 states: 'We first change the signature of our configuration module to DataFlow::StateConfigSig, and replace DataFlow::Global<...> with DataFlow::GlobalWithState<...>. Then we add a class FlowState... Then we extend our isSource predicate with an additional parameter to specify the flow state.' This directly supports the claim.
- **supported**: Value-preserving steps in CodeQL preserve the flow state set; other steps may add or remove states. — The evidence from S6 states: 'Value-preserving data-flow steps preserve the set of flow states, but other steps may add or remove flow states.' This directly supports the claim.
- **supported**: Path queries in CodeQL require @kind path-problem metadata, import of Flow::PathGraph, and use of the flowPath(source, sink) predicate. — The evidence from S20 states: 'Path query metadata must contain the property @kind path-problem ... import MyFlow::PathGraph ... where MyFlow::flowPath(source, sink)'. This directly supports the claim.
- **supported**: The PathGraph module in CodeQL provides edges and nodes predicates for constructing the explanation graph. — The evidence from S22 states: 'Provides the query predicates needed to include a graph in a path-problem query. ... edges Holds if pred → succ is an edge in the graph of data flow path explanations. nodes Holds if nd is a node in the graph of data flow path explanations.' This directly supports the claim.
- **supported**: CodeQL C# uses LibraryTypeDataFlow with an overridable callableFlow predicate for modeling external libraries. — The evidence from S4 states: 'To define new library data flow, extend the class LibraryTypeDataFlow... Override the predicate callableFlow to define how data flows through the methods in the class.' This directly supports the claim.
- **supported**: CodeQL Ruby uses API graphs for symbolic library method resolution. — The evidence from S5 states: 'from DataFlow::CallNode call, DataFlow::ExprNode expr where call = API::getTopLevelMember("File").getAMethodCall("open") and expr = call.getArgument(0).getALocalSource()'. This demonstrates the use of API graphs for library method resolution.
- **supported**: CodeQL Rust uses getStaticTarget for direct call resolution and canonical paths. — The evidence from S8 states: 'from CallExpr call where call.getStaticTarget().(Function).getCanonicalPath() = "<std::fs::File>::create" ... sink.asExpr().getExpr() = call.getArg(0)'. This directly supports the claim.
- **supported**: Production CodeQL incremental analysis for pull requests generates a database for changed code and combines it with a cached base database, achieving 2x–10x speedups. — The evidence from S10 states: 'We are now further improving the performance of CodeQL incremental analysis by generating a CodeQL database to represent your new or changed code introduced in pull requests and combining it with a cached database for your entire codebase. Across more than 100,000 repositories... average per-language speedup we observed on scan times over a seven-day period.' The speedup range is mentioned in the evidence notes.
- **supported**: A research prototype using Viatra Queries as an incremental evaluator achieved ~15-second updates for commits affecting up to 1000 lines, but required >1 hour for initial analysis and up to ~70 GB of memory. — The evidence from S14 states: 'fully-incremental analysis takes maximum ~15 seconds to update analysis results for commits affecting up to 1000 lines of code. However, it takes more than an hour to perform the first from-scratch analysis, and the memory use (due to caching) of the analysis can go as high as ~70 GB'. This directly supports the claim.
- **supported**: The Viatra Queries prototype showed linear correlation between commit size and update time. — The evidence from S16 states: 'We see great incremental performance. There is a linear correlation between the update time and the size of the commit.' This directly supports the claim.
- **supported**: CodeQL provides FlowExplorationFwd and FlowExplorationRev modules with an exploration limit to find partial data-flow paths, disregarding sink definitions. — The evidence from S24 states: 'MyFlow::FlowExplorationFwd<explorationLimit/0>::partialFlow ... holds if there is a partial data flow path from source to node ... completely disregards sink definitions.' This directly supports the claim.
- **supported**: MemorySSA overlays three node types on existing LLVM IR instructions: MemoryDef, MemoryUse, and MemoryPhi. — The evidence from S27 states: 'Each MemoryAccess can be one of three types: MemoryDef, MemoryPhi, MemoryUse'. The evidence from S30 states: 'It generates MemoryDef/Uses/Phis that are overlayed on top of the existing instructions.' Both support the claim.
- **supported**: MemorySSA uses a pruned SSA form, placing MemoryPhi nodes only where memory definitions from multiple predecessors converge. — The evidence from S29 states: 'MemorySSA only places MemoryPhis where they're actually needed. That is, it is a pruned SSA form.' This directly supports the claim.
- **supported**: Each memory-modifying operation in MemorySSA creates a new heap version. — The evidence from S30 states: 'Every time the memory state changes in the program, we generate a new heap version.' This directly supports the claim.
- **supported**: MemorySSA requires precomputed AliasAnalysis and DominatorTree. — The evidence from S30 states: 'Inherits from AliasAnalysis.h, PHITransAddr.h, Dominators.h; MemorySSAAnalysis produces MemorySSA for a function.' This indicates the dependency on AliasAnalysis and DominatorTree.
- **supported**: MemoryDefs in MemorySSA maintain two operands: the defining access and an optional optimized access set by the walker's getClobberingMemoryAccess. — The evidence from S28 states: 'MemoryDefs now keep two operands. The first one, the defining access, is always the previous MemoryDef or MemoryPhi in the same basic block, or the last one in a dominating predecessor ... The second operand is the optimized access, if there was a previous call on the walker's getClobberingMemoryAccess(MA).' This directly supports the claim.
- **supported**: Without walker disambiguation, every MemoryDef in MemorySSA conservatively clobbers every other MemoryDef. — The evidence from S27 states: 'without the use of The walker, initially every MemoryDef clobbers every other MemoryDef.' This directly supports the claim.
- **supported**: PHI nodes in MemorySSA merge may-reach definitions, not must-reach. — The evidence from S27 states: 'In MemorySSA, PHI nodes merge may-reach definitions (that is, until disambiguated, the versions that reach a phi node may or may not clobber a given variable).' This directly supports the claim.
- **supported**: The MemorySSA walker provides getClobberingMemoryAccess(MemoryAccess *MA) which returns the clobbering access and caches intermediate results. — The evidence from S27 states: 'MemoryAccess *getClobberingMemoryAccess(MemoryAccess *MA); return the clobbering memory access for MA, caching all intermediate results computed along the way.' This directly supports the claim.
- **supported**: A variant getClobberingMemoryAccess(MemoryAccess *MA, const MemoryLocation &Loc) queries clobbering for a specific location but does not cache. — The evidence from S27 states: 'MemoryAccess *getClobberingMemoryAccess(MemoryAccess *MA, const MemoryLocation &Loc); returns the access clobbering memory location Loc, starting at MA.' The evidence notes state: 'The second API (with MemoryLocation) does not cache results.' This supports the claim.
- **supported**: Each def in MemorySSA maintains a list of users, enabling both forward and backward traversal. — The evidence from S30 states: 'each def also has a list of users associated with it, so you can walk from both def to users, and users to defs.' This directly supports the claim.
- **supported**: MemorySSA is intraprocedural only. — The evidence from S27 states: 'MemorySSA is intraprocedural.' This directly supports the claim.
- **supported**: MemorySSA uses a single memory variable (one Phi per block), which prevents build-time def optimization and reduces precision compared to partitioned memory SSA. — The evidence from S29 states: 'It is not possible to optimize MemoryDef in the same way, as we restrict MemorySSA to one memory variable and, thus, one Phi node per block.' This directly supports the claim.
- **supported**: MemoryDefs in MemorySSA are not disambiguated for may-alias vs. must-alias; only MemoryUses are disambiguated. — The evidence from S30 states: 'MemoryDefs are not disambiguated for may-alias vs. must-alias; only MemoryUses are disambiguated.' This directly supports the claim.
- **supported**: MLIR provides a lattice-based sparse data-flow analysis framework with abstract base classes for forward and backward analyses. — The evidence from S31 states: 'The file defines `AbstractSparseForwardDataFlowAnalysis` with a pure virtual `visitOperationImpl` that takes operand and result lattices, and `AbstractSparseBackwardDataFlowAnalysis` with a similar `visitOperationImpl`.' This directly supports the claim.

### Final Evaluation

- coverage: 3/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 4/5
- overall: 3/5

Strengths:
- Excellent extraction of implementable algorithm details from CodeQL, LLVM MemorySSA, and MLIR data-flow framework with pseudocode-level mechanics and data structures.
- Strong evidence table and claim verification with clear source associations and limitations noted for each claim.
- Well-structured design implications section with seven concrete patterns and two anti-patterns directly applicable to emilwareus/polint.
- Honest and thorough documentation of source coverage gaps, with explicit open questions for the five missing tools.

Weaknesses:
- Major coverage gap: only 3 of 8 planned tools (CodeQL, LLVM MemorySSA, MLIR) have admitted evidence; SVF, Souffle/Doop, Semgrep, Joern, SootUp, and Go VTA are entirely absent, severely limiting the cross-engine synthesis promised in the research goal.
- The report does not fully address the research plan's subquestions for the missing tools, and the success criterion of 'at least one primary source for each of the eight tools' is not met.
- No evidence tables are provided for the missing tools, and the report relies on a single evidence summary table that only covers the three analyzed engines.
- The report does not include any benchmark evaluations or empirical precision measurements, relying solely on documented algorithmic properties.

Follow-up recommendations:
- Admit primary sources for SVF, Souffle/Doop, Semgrep, Joern, SootUp, and Go VTA to complete the cross-engine synthesis as originally planned.
- Include benchmark evaluations (e.g., Juliet, DroidBench, Big-Vul) to provide empirical precision and soundness measurements for each tool.
- Expand the evidence summary table to cover all eight tools once sources are admitted, and add separate tables for each missing tool's key features and limitations.
