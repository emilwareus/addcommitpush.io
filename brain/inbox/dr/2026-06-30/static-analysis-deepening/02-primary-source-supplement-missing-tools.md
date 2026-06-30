---
title: "Primary-source supplement for static-analysis deepening"
created: 2026-06-30
type: research-note
status: working
---

# Primary-Source Supplement For Static-Analysis Deepening

Two targeted `dr` runs produced useful reports, but both under-admitted several
tool families. This supplement records primary-source facts verified directly
from official docs and canonical papers so the expanded insights can cover those
gaps without relying on weak search output.

## Data Flow And Query Engines

CodeQL's data-flow docs distinguish local flow from global flow. Local flow
stays within one function and is described as fast and precise for many queries;
global flow crosses function boundaries and object properties and is more
expensive. CodeQL also distinguishes normal value-preserving flow from taint
tracking, where derived values are considered influenced by tainted inputs.
Path queries use a `DataFlow::Global<Config>` or `TaintTracking::Global<Config>`
module, import `Flow::PathGraph`, call `flowPath(source, sink)`, and select the
sink plus source/sink path nodes.

Modern CodeQL incremental analysis has two distinct mechanisms in the CLI docs:
diff-informed analysis, which reports alerts on changed lines, and overlay
analysis, which reuses a cached base database. GitHub's 2026 changelog describes
pull-request analysis that creates a database for new or changed code and
combines it with a cached whole-codebase database. The 2023 research prototype
showed why this is hard: fully incremental updates can be around 15 seconds for
commits up to 1000 changed lines, but first analysis can take over an hour and
memory can reach roughly 70 GB.

Sources:

- <https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/>
- <https://codeql.github.com/docs/writing-codeql-queries/creating-path-queries/>
- <https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/scan-from-the-command-line/incremental-analysis>
- <https://github.blog/changelog/2026-03-24-faster-incremental-analysis-with-codeql-in-pull-requests/>
- <https://arxiv.org/pdf/2308.09660>

## SSA, MemorySSA, And Sparse Analysis

The canonical SSA construction algorithm uses dominance frontiers to decide
where phi functions are needed, then renames variables along the dominator tree.
The usual implementation is:

1. Build a CFG.
2. Compute dominators and immediate dominators.
3. Compute dominance frontiers.
4. For each variable, place phi functions at the iterated dominance frontier of
   its definition blocks.
5. Rename variables by walking the dominator tree with one stack per source
   variable.

LLVM MemorySSA applies the SSA idea to memory operations inside one function. It
overlays `MemoryDef`, `MemoryUse`, and `MemoryPhi` nodes on LLVM IR. It uses a
pruned form, placing memory phis only where needed. Because LLVM MemorySSA uses
one memory variable, MemoryDefs are conservative until the walker and alias
analysis disambiguate clobbers. MemorySSA is explicitly intraprocedural.

MLIR's data-flow framework models analyses as lattice values over program
points or SSA values. Its sparse analysis framework propagates along use-def
structure, uses user-defined `visitOperation` transfer functions, and requires
monotonic `join`/`meet` behavior. Integer range analysis uses widening-like
budgeting to force convergence.

Sources:

- <https://www.cs.utexas.edu/~pingali/CS380C/2010/papers/ssaCytron.pdf>
- <https://llvm.org/docs/MemorySSA.html>
- <https://mlir.llvm.org/docs/Tutorials/DataFlowAnalysis/>
- <https://mlir.llvm.org/doxygen/SparseAnalysis_8h_source.html>

## SVF And Sparse Value Flow

SVF describes itself as a static tool for scalable and precise value-flow
analysis. Its public docs list a language-independent IR, call graph,
interprocedural control-flow graph, constraint graph, value-flow graph, multiple
pointer analyses, interprocedural Memory SSA, context-free-language reachability,
and abstract execution. The key design claim is iterative refinement: pointer
analysis and value-flow construction improve each other.

For engine design, SVF is evidence for the "sparse graph over value-flow edges"
pattern: do not run every client over dense CFG edges if the client only cares
about value movement. Construct def-use/value-flow facts once, then let clients
ask source-sink, leak, open/close, and dependence questions over those facts.

Sources:

- <https://svf-tools.github.io/SVF/>
- <https://yuleisui.github.io/publications/cc16.pdf>
- <https://llvm.org/devmtg/2016-03/Presentations/SVF_EUROLLVM2016.pdf>

## Semgrep Taint Semantics

Semgrep taint mode defines sources, propagators, sanitizers, and sinks. Exactness
is semantic, not cosmetic. Exact sources restrict taint to exact matches instead
of subexpressions. Exact sanitizers restrict sanitization to exact matches.
Sinks default toward exact matching, but can be made non-exact. Advanced taint
mode supports side-effectful sources, side-effectful sanitizers, propagators,
field/index sensitivity, taint labels, and control sources. Interprocedural
taint is a Semgrep Pro feature; `--pro-intrafile` crosses functions inside one
file, while `--pro` also crosses file boundaries and requires more memory.

Sources:

- <https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview>
- <https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/advanced>

## Joern CPG Data Flow

Joern exposes data-flow query steps on the code property graph. `reachableBy`
returns sources that can flow to sinks; `reachableByFlows` returns paths. The
2024 Joern interprocedural data-flow note describes a preprocessing step that
computes intraprocedural slices in parallel, followed by on-the-fly symbol
tracking at query time. Joern uses pre-generated `CALL` edges where available,
can use custom call resolvers, creates stub method nodes for unresolved external
calls, and overapproximates external method flows unless default or custom
semantics provide summaries. Its custom semantics language defines explicit
flows between arguments; missing flows are assumed killed.

Sources:

- <https://docs.joern.io/cpgql/data-flow-steps/>
- <https://joern.io/blog/interproc-dataflow-2024/>
- <https://docs.joern.io/dataflow-semantics/>

## Datalog, Souffle, And Doop

Souffle is a Datalog-inspired language initially designed for static analysis.
Its tutorial shows data-flow as recursive relations over CFG facts. For reaching
definitions, `Reachable(u,d)` is generated at definition nodes and propagated
across `Edge(u,v)` when `KillDef(u,d)` is false. This is the same fixed-point
shape as a worklist solver, but expressed declaratively.

Souffle's docs emphasize performance through staged compilation, partial
evaluation, parallelization, and high-performance data structures. Its examples
include typed var-points-to and def-use chain analyses. Doop describes itself as
a collection of analyses expressed as Datalog rules, with the maintained version
targeting Souffle. Doop supports context-insensitive analysis, platform
selection, Android entry points, Java Enterprise entry points, information-flow
analysis, SARIF output, and optional Differential Datalog support for a micro
analysis.

Sources:

- <https://souffle-lang.github.io/docs.html>
- <https://souffle-lang.github.io/tutorial>
- <https://souffle-lang.github.io/examples>
- <https://github.com/plast-lab/doop>

## Call Graphs: SootUp And Go VTA

SootUp's call-graph docs describe the standard precision ladder:

- CHA uses the type hierarchy and includes all implementers of an interface.
- RTA refines CHA by considering only instantiated implementers.
- VTA further refines RTA by considering assigned instantiations and therefore
  points-to relationships.

Go's `golang.org/x/tools/go/callgraph/vta` package computes a call graph using
Variable Type Analysis. It builds a global type-propagation graph, propagates
types and function literals, then uses the labels reaching unresolved call-site
nodes to create callee edges. Its docs state that the result is sound modulo
reflection and `unsafe`, assuming the initial call graph is sound. The package
is experimental and requires SSA with instantiated generics.

Sources:

- <https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/>
- <https://pkg.go.dev/golang.org/x/tools/go/callgraph/vta>

## Implications For Polint

The deepening work should avoid claiming that a repo-local policy engine must
implement every state-of-the-art technique. The better synthesis is:

- Use simple syntax and fact extraction where it is enough.
- Use monotone worklist solvers for local CFG facts.
- Use SSA/sparse value-flow where value movement matters.
- Use IFDS/IDE or Datalog-style fixed points for interprocedural finite
  distributive problems.
- Use explicit source/sink/barrier/summary models rather than pretending
  sanitizers or framework callbacks are automatic.
- Expose policy-level APIs with budgets, precision, unknowns, and path evidence
  instead of raw graph traversal.
- Treat incremental analysis as an architecture from the start: cache base
  facts, key caches by capability/config/version, and invalidate by dependency
  rather than by whole-repo reruns.
