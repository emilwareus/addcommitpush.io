---
title: "Deep technical report for expanding durable insights on static analysis data-flow engines. Explain actual algorithms with implementable detail and pseudocode: control-flow graph construction, forward/backward monotone frameworks, lattices, join/meet, worklist solvers, gen/kill reaching definitions, liveness, available expressions, constant propagation, SSA, Memory SSA, sparse value-flow graphs, IFDS, IDE, demand-driven data flow, incremental data-flow, abstract interpretation with widening/narrowing, and how modern tools such as CodeQL, SVF, LLVM/MLIR, Soot/Heros, Joern, Semgrep, and Souffle/Datalog engines operationalize these ideas. Prefer primary papers and official docs. Distinguish proven foundational algorithms from current production state of the art. Include caveats, complexity drivers, and engine design implications for a language-agnostic repo-local policy engine like emilwareus/polint."
generated_at: 2026-06-30T05:46:42.088417+00:00
strategy: deep-agent-v1
effort: deep
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static Analysis Data-Flow Engines: Algorithms, Frameworks, and Design Implications for Language-Agnostic Policy Analysis

## Abstract

This report synthesizes the foundational algorithms underlying static data-flow analysis—monotone frameworks, gen/kill bit-vector problems, IFDS/IDE interprocedural analysis, and the relationship between maximal fixed point (MFP) and meet-over-all-paths (MOP) solutions—with implementable detail. It traces how these algorithms constrain and enable production tools, using FlowDroid as a concrete case study. The evidence base is drawn from seminal papers on monotone frameworks [S31, S35], Kildall's lattice framework [S33], IFDS [S11, S16, S25], IDE [S14, S18, S22, S24], and FlowDroid [S2, S6]. Several planned topics—SSA construction, Memory SSA, sparse value-flow graphs, abstract interpretation with widening/narrowing, and the internal architectures of CodeQL, SVF, LLVM, Joern, Semgrep, and Soufflé—lack admitted sources and are flagged as gaps. The report concludes with design recommendations for a language-agnostic, repo-local policy engine.

## Research Question

What are the precise algorithms, lattice structures, and solver guarantees for static data-flow analysis, and how should these inform the architecture of a language-agnostic, repo-local policy engine?

## Method

This report draws exclusively on the admitted source register, which contains foundational papers on monotone frameworks [S31, S35], Kildall's lattice theory [S33], data-flow analysis lecture notes [S34], IFDS [S11, S16, S25], IDE [S14, S18, S22, S24], Kam-Ullman iterative algorithms [S38], and FlowDroid [S2, S6]. Where topics in the research plan lack admitted sources (SSA, Memory SSA, CodeQL, SVF, LLVM, Joern, Semgrep, Soufflé, abstract interpretation with widening), the report states this explicitly and does not fabricate citations. Algorithmic descriptions are reconstructed from the evidence notes; pseudocode is derived from the formal definitions in the sources.

## Conceptual Background

### Data-Flow Analysis as Fixed-Point Computation

Data-flow analysis models program behavior as the propagation of abstract facts through a control-flow graph (CFG). Each node $n$ in the CFG has an associated transfer function $f_n$ that transforms incoming facts into outgoing facts. At merge points, a confluence operator $\sqcap$ (meet) or $\sqcup$ (join) combines facts from multiple predecessors. The analysis seeks a fixed point: an assignment of facts to every node such that applying all transfer functions and combining yields the same assignment.

### Lattices, Monotonicity, and Distributivity

A lattice $(L, \sqsubseteq)$ is a partially ordered set where every pair of elements has a least upper bound (join, $\sqcup$) and greatest lower bound (meet, $\sqcap$). A complete lattice has joins and meets for all subsets. The height of a lattice is the length of its longest strictly ascending chain; finite-height lattices guarantee termination of iterative solvers.

A transfer function $f$ is **monotone** if $x \sqsubseteq y \implies f(x) \sqsubseteq f(y)$. It is **distributive** if $f(x \sqcap y) = f(x) \sqcap f(y)$ (or analogously for join). Distributivity is strictly stronger than monotonicity [S31, S33].

### MFP vs. MOP

The **meet-over-all-paths (MOP)** solution is the semantic ideal: for every path from entry to node $n$, apply the composed transfer functions to the initial fact, then combine all results with the confluence operator [S34]. The **maximal fixed point (MFP)** solution is what iterative solvers actually compute. For distributive frameworks, MFP = MOP [S33]. For monotone-but-not-distributive frameworks, MFP may be less precise than MOP, and no algorithm can compute MOP for all monotone frameworks [S31].

### Forward/Backward and May/Must Classification

| Dimension | Values | Examples |
|---|---|---|
| Direction | Forward (entry → node) | Reaching definitions, available expressions, constant propagation |
| Direction | Backward (node → exit) | Live variables |
| Confluence | May (union-like) | Reaching definitions, live variables |
| Confluence | Must (intersection-like) | Available expressions |

This classification determines the lattice structure, confluence operator, and initialization values [S34].

## Findings

### 1. Monotone Frameworks and the Worklist Solver

The monotone framework, formalized by Kam and Ullman [S31, S35], generalizes Kildall's earlier distributive framework. The framework consists of:

- A complete lattice $(L, \sqsubseteq)$ with no infinite descending chains (for termination)
- A confluence operator (meet or join)
- Transfer functions $f_n : L \to L$ for each CFG node $n$, all monotone

**Theorem (Kam-Ullman):** For every instance of a monotone framework, the MFP solution exists and can be obtained by Kildall's iterative algorithm [S31].

**Theorem (Precision gap):** When the framework is monotone but not distributive, there exist instances where MOP $\neq$ MFP. Furthermore, no algorithm can compute MOP for all monotone frameworks [S31].

Kildall's original framework imposed the stronger requirement of distributivity and a lattice with no infinite descending chains, guaranteeing both termination and MFP = MOP [S33]. Constant propagation—Kildall's own example—violates distributivity, so the iterative solver produces a safe but potentially imprecise result [S33].

**Worklist solver pseudocode (forward, monotone):**

```
function solve_forward(CFG, L, transfer, meet, boundary):
    for each node n in CFG:
        in[n]  = bottom   // or top for must-problems
        out[n] = bottom
    in[entry] = boundary
    worklist = all nodes in CFG
    while worklist is not empty:
        n = worklist.pop()
        new_in = meet(out[p] for p in predecessors(n))
        new_out = transfer[n](new_in)
        if new_out != out[n]:
            out[n] = new_out
            in[n]  = new_in
            for s in successors(n):
                worklist.add(s)
    return out
```

For backward analyses, swap predecessors/successors and initialize from the exit node.

**Kam-Ullman convergence condition:** A necessary and sufficient condition for a strong bound on iterations when using depth-first ordering is: $(\forall f, g, x)\,[f(g(0)) \geq g(0) \wedge f(x) \geq x]$, where $0$ is the lattice zero [S38]. Several practical analyses do not satisfy this condition, so the bound is not universally applicable.

### 2. Gen/Kill (Bit-Vector) Analyses

Gen/kill problems have transfer functions of the form:

$$f_n(S) = (S \setminus \text{KILL}_n) \cup \text{GEN}_n$$

where $\text{GEN}_n$ and $\text{KILL}_n$ are sets determined solely by node $n$, and the confluence operator is either union (may) or intersection (must) [S34]. These are also called bit-vector problems because the fact domain is a finite set, representable as a bitset.

| Analysis | Direction | Confluence | GEN | KILL | Distributive? |
|---|---|---|---|---|---|
| Reaching definitions | Forward | Union (∪) | Definitions at $n$ | Definitions killed by $n$ | Yes |
| Live variables | Backward | Union (∪) | Variables used at $n$ | Variables defined at $n$ | Yes |
| Available expressions | Forward | Intersection (∩) | Expressions computed at $n$ | Expressions killed by $n$ | Yes |

**Live-variable transfer function** [S34]:

$$f_n(S) = (S - \text{KILL}_n) \cup \text{GEN}_n$$

where $\text{KILL}_n$ is the set of variables defined at $n$ and $\text{GEN}_n$ is the set of variables used at $n$.

Because these analyses are distributive, the worklist solver computes the exact MOP solution [S33]. The fact domain is finite (bounded by the number of definitions, variables, or expressions in the procedure), so termination is guaranteed.

### 3. Constant Propagation: Non-Distributive Analysis

Constant propagation is the canonical example of a monotone-but-not-distributive analysis [S33]. The lattice for a single variable is:

$$\bot \sqsubseteq c \sqsubseteq \top$$

where $\bot$ means "unreachable," $c$ is a specific constant, and $\top$ means "not a constant." For multiple variables, the lattice is the product of per-variable lattices.

The transfer function for an assignment $x = a + b$ is:

$$f_{x=a+b}(env) = env[x \mapsto \text{eval}(a, env) \oplus \text{eval}(b, env)]$$

where $\text{eval}$ returns the constant if both operands are known, and $\top$ otherwise.

**Why it is not distributive:** Consider two paths reaching a merge point: one yields $x = 2, y = 3$ and the other yields $x = 3, y = 2$. The MOP solution for $z = x + y$ at the merge would compute $z = 5$ on each path and combine to $z = 5$. But the MFP solution first merges the environments ($x = \top, y = \top$), then computes $z = \top$. The MFP loses precision because the merge happens before the transfer function is applied [S33].

**Insight:** This precision loss is structural, not an implementation bug. Any iterative solver that merges at CFG join points before applying transfer functions will exhibit it. Path-sensitive analysis or symbolic execution can recover precision at higher cost.

### 4. IFDS: Interprocedural Distributive Data-Flow via Graph Reachability

The IFDS framework (Reps, Horwitz, Sagiv) reduces interprocedural distributive data-flow analysis to a graph-reachability problem solvable in polynomial time [S11, S16, S25].

**Preconditions [S16]:**
- The set of data-flow facts $D$ must be finite.
- Transfer functions must distribute over the confluence operator (union or intersection).

**Scope [S11]:** IFDS handles classical separable (gen/kill) problems—reaching definitions, available expressions, live variables—as well as non-separable problems including truly-live variables, copy constant propagation, and possibly-uninitialized variables.

**Algorithm sketch:**

1. Construct an **exploded supergraph** $G^\#$ from the program's interprocedural CFG. Each node $(n, d)$ in $G^\#$ represents "fact $d$ holds at program point $n$."
2. Add edges $(n, d_1) \to (n', d_2)$ according to the transfer function at $n$: if $d_2 \in f_n(\{d_1\})$, add the edge. Include a special edge $(n, d) \to (n, d)$ for identity.
3. At call sites, add edges from caller to callee (call-to-start) and from callee exit back to caller (exit-to-return), respecting call-return matching.
4. A fact $d$ holds at program point $n$ if and only if there is a realizable path from $(s_{main}, d_0)$ to $(n, d)$ in $G^\#$, where "realizable" means call-return edges are properly matched (context-free language reachability).

**Complexity:** $O(E \cdot D)$ where $E$ is the number of edges in the interprocedural CFG and $D$ is the number of data-flow facts [S11]. This is polynomial in program size.

**Limitation:** IFDS cannot handle infinite-state analyses (e.g., full constant propagation with arbitrary integers) because $D$ must be finite [S16]. Full constant propagation is not distributive and cannot be directly encoded as IFDS.

### 5. IDE: Extending IFDS to Environment Transformers

IDE (Sagiv, Reps, Horwitz) generalizes IFDS to handle **environment transformers**—functions that map symbols to values from a domain $L$ [S14, S18].

**Key properties:**
- IDE is a strict generalization of IFDS: any IFDS problem can be transformed to an equivalent IDE problem [S18].
- IDE handles copy constant propagation ($x := 7; x := y$) and linear constant propagation ($x := 5 \cdot y + 17$) [S14].
- The algorithm uses dynamic programming on the exploded graph, where edges carry environment transformers instead of simple presence/absence.

**Scalability via library summaries:** IDE analyses can scale to large object-oriented libraries using pre-computed library summaries, reducing analysis cost without loss of precision [S24].

**Limitation:** IDE is still restricted to distributive environment transformers. Full constant propagation with arbitrary non-linear operations is not covered [S14].

### 6. FlowDroid: A Production Case Study

FlowDroid is a precise static taint analysis for Android apps, demonstrating context, flow, field, and object sensitivity with lifecycle awareness [S2]. It relies on Soot for Java program analysis and uses IFDS/IDE as its interprocedural data-flow engine [S6].

**Benchmark results:** On DroidBench, FlowDroid achieves 93% recall and 86% precision, outperforming commercial tools IBM AppScan Source and Fortify SCA [S6].

**Lifecycle modeling:** FlowDroid uses a precise model of Android's lifecycle to handle callbacks invoked by the Android framework [S6]. This is a concrete example of how a data-flow engine must model framework callbacks—a concern relevant to any language-agnostic engine that needs to model API callbacks.

**Insight:** FlowDroid's precision depends heavily on modeling the framework's entry points and callback structure. A language-agnostic engine like polint faces an analogous challenge: without accurate models of framework entry points and callback patterns, taint flows through callbacks will be missed.

### 7. Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| IFDS reduces interprocedural distributive data-flow to graph reachability in polynomial time | "transformed into a special kind of graph-reachability problem" | [S11] | Requires finite facts and distributive functions |
| IFDS covers gen/kill and some non-separable problems | "includes many non-separable problems, including truly-live variables, copy constant propagation" | [S11] | Full constant propagation (non-distributive) excluded |
| IFDS requires finite facts and distributive functions | "set of dataflow facts must be a finite set, and that the dataflow functions must distribute" | [S16] | Infinite-state analyses cannot use IFDS directly |
| IDE generalizes IFDS | "Any IFDS problem can be transformed to an equivalent IDE problem" | [S18] | Still limited to distributive environment transformers |
| IDE handles copy and linear constant propagation | "copy constant propagation (x:=7; x:=y) and linear constant propagation (x:=5*y+17)" | [S14] | Non-linear operations not covered |
| IDE scales with pre-computed library summaries | "reduces significantly the cost of whole-program IDE analyses without any loss of precision" | [S24] | Specific to IDE; OO libraries |
| Monotone frameworks generalize Kildall's distributive framework | "meet the monotonicity condition but not Kildall's condition called distributivity" | [S31] | Foundational paper (1977); no modern tool discussion |
| MFP exists for all monotone frameworks; computable by Kildall's algorithm | "maximal fixed point solution exists for every instance... obtained by Kildall's algorithm" | [S31] | MFP may differ from MOP for non-distributive cases |
| MOP uncomputable for general monotone frameworks | "nonexistence of an algorithm to compute the meet over all paths solution for monotone frameworks" | [S31] | Theoretical result; many practical analyses are distributive |
| Kildall's framework requires distributivity for MFP = MOP | "All f_n be distributive, a stronger property than monotonicity" | [S33] | Teaching note; no experimentation |
| Constant propagation is monotone but not distributive | "dataflow functions for constant propagation are not distributive (though they are monotonic)" | [S33] | One small example; real-world precision loss varies |
| Gen/kill problems use f_n(S) = (S - KILL_n) ∪ GEN_n | "dataflow function for each node n has the form: f_n(S) = (S - KILL_n) ∪ GEN_n" | [S34] | Lecture notes; not all analyses fit gen/kill |
| FlowDroid: 93% recall, 86% precision on DroidBench | "greatly outperforming the commercial tools IBM AppScan Source and Fortify SCA" | [S6] | Android-specific benchmark; 2014 results |
| FlowDroid uses Soot and IFDS/IDE | "Inter-procedural data-flow analysis with ifds/ide and soot" | [S6] | Soot is Java-specific |
| Kam-Ullman DFS convergence condition | "necessary and sufficient: (∀f,g,x)[f(g(0)) ≥ g(0) ∧ f(x) ≥ x]" | [S38] | Several practical analyses do not satisfy this condition |

## Design Implications

### What the Evidence Supports for polint

Based on the admitted sources, the following design decisions are evidence-grounded:

**1. Use a monotone worklist solver for intraprocedural analysis.** The worklist algorithm is guaranteed to terminate for finite-height lattices and computes the MFP solution [S31, S33]. For distributive analyses (gen/kill problems), MFP = MOP, so the solver is exact [S33]. For non-distributive analyses (constant propagation), the solver is sound but may lose precision at merge points [S33].

**2. Encode taint-style analyses as IFDS problems.** Taint tracking is a distributive, finite-fact problem (sources, sinks, and taint values form a finite set), making it a natural fit for IFDS [S11, S16]. The $O(E \cdot D)$ complexity is polynomial and practical for repo-local analysis where $D$ (number of taint facts) is bounded by the number of sources/sinks in the policy.

**3. Use IDE for constant propagation when interprocedural precision matters.** IDE handles copy and linear constant propagation with precise interprocedural results [S14, S18]. For a policy engine, linear constant propagation may suffice for rules like "flag if buffer size < threshold."

**4. Pre-compute library summaries for scalability.** IDE analyses can scale to large libraries using pre-computed summaries without precision loss [S24]. For polint, this means summarizing standard library functions once and reusing summaries across analyses.

**5. Model framework entry points and callbacks explicitly.** FlowDroid's precision depends on modeling Android's lifecycle and callbacks [S6]. A language-agnostic engine must provide a mechanism for users to declare entry points and callback patterns, or taint flows through callbacks will be missed.

### What the Evidence Does Not Establish

The admitted sources do not cover:
- SSA construction algorithms (Cytron et al.)
- Memory SSA
- Sparse value-flow graphs (SVF)
- Abstract interpretation with widening/narrowing (Cousot & Cousot)
- Demand-driven and incremental data-flow algorithms
- Internal architectures of CodeQL, SVF, LLVM/MLIR, Soot/Heros, Joern, Semgrep, or Soufflé
- GPU-accelerated or ML-based data-flow analysis

These topics were in the research plan but no sources were admitted for them. Any recommendations about these topics would be inference, not evidence-backed.

### Recommended Architecture for polint

| Component | Recommended Approach | Evidence Basis | Complexity Driver |
|---|---|---|---|
| CFG construction | Build per-function CFGs from language-specific frontends; model exceptions as explicit edges | Inference (no admitted source) | Language-specific edge cases |
| Intraprocedural solver | Monotone worklist with finite-height lattice | [S31, S33] | Lattice height × CFG size |
| Gen/kill analyses | Bit-vector representation; distributive, so MFP = MOP | [S34, S33] | Linear in CFG edges × facts |
| Taint tracking | IFDS encoding on exploded supergraph | [S11, S16] | $O(E \cdot D)$ |
| Constant propagation | IDE for interprocedural; monotone worklist for intraprocedural | [S14, S18, S33] | $O(E \cdot D^2)$ for IDE |
| Library handling | Pre-computed summaries | [S24] | Summary computation cost |
| Framework callbacks | User-declared entry points and callback models | [S6] | Completeness of declarations |

## Limitations and Threats to Validity

**Source coverage gaps.** The admitted source register contains 14 sources, all focused on foundational data-flow theory (monotone frameworks, IFDS/IDE) and FlowDroid. Major topics in the research plan—SSA, Memory SSA, sparse value-flow, abstract interpretation with widening, demand-driven/incremental analysis, and the architectures of CodeQL, SVF, LLVM, Joern, Semgrep, and Soufflé—have no admitted sources. The report cannot make evidence-backed claims about these topics.

**Stale evidence.** The foundational papers date from 1977–1996 [S31, S33, S34, S11, S14, S38]. While the theory is timeless, the production landscape has evolved significantly. FlowDroid results from 2014 [S6] may not reflect current Android analysis state of the art.

**Benchmark generalizability.** FlowDroid's 93% recall and 86% precision are measured on DroidBench, an Android-specific benchmark [S6]. These numbers do not generalize to other languages or domains.

**Theoretical vs. practical precision.** The MFP ≠ MOP result for non-distributive analyses [S31, S33] is a theoretical worst case. In practice, the precision loss depends on program structure and may be smaller than the theory suggests—or larger, if additional approximations (e.g., imprecise CFGs, unsound call graph construction) are introduced.

**No vendor bias assessment.** The FlowDroid results are self-reported by its authors [S6]. No independent replication or adversarial evaluation is available in the admitted sources.

## Open Questions

1. **How do modern tools (CodeQL, SVF, Semgrep, Joern) implement data-flow analysis internally?** The admitted sources do not cover this. Official documentation and source code analysis are needed.

2. **What is the state of the art in incremental and demand-driven data-flow analysis (2020–2026)?** No admitted sources address this. Recent papers on incremental IFDS/IDE or demand-driven reachability would be needed.

3. **How does abstract interpretation with widening/narrowing ensure termination for infinite-height lattices in practice?** The Cousot & Cousot framework is referenced in the plan but no source was admitted. This is critical for any analysis that tracks numeric intervals or symbolic ranges.

4. **What are the documented unsoundness trade-offs in production tools?** The plan requested limitations for CodeQL, SVF, Semgrep, and Joern, but no sources were admitted for these tools.

5. **Can ML-based approaches (GNN, learned data-flow) improve precision or scalability over classical frameworks?** The plan included search queries for ML-based analysis, but no sources were admitted.

## Recommended Next Experiments

1. **Admit sources on SSA, Memory SSA, and sparse value-flow graphs.** Specifically, Cytron et al. (1991) for SSA construction, the LLVM MemorySSA documentation, and SVF papers on sparse value-flow graphs. These are prerequisites for understanding how modern pointer analysis achieves scalability.

2. **Admit official documentation for CodeQL, SVF, LLVM, Soot/Heros, Joern, Semgrep, and Soufflé.** Without these, the report cannot map production tools to foundational algorithms as the success criteria require.

3. **Admit Cousot & Cousot (1977/1979) on abstract interpretation.** This is needed to explain widening/narrowing operators and termination guarantees for infinite-height lattices.

4. **Admit sources on demand-driven and incremental data-flow.** Reps (1995) on demand-driven interprocedural analysis and Pollock & Soffa on incremental iteration would fill this gap.

5. **Prototype an IFDS-based taint tracker for polint.** Given that IFDS is well-supported by evidence [S11, S16, S25] and taint tracking is a natural fit, a prototype would validate the $O(E \cdot D)$ complexity claim on real repositories and identify practical precision/recall trade-offs.

6. **Benchmark polint against FlowDroid on a common subset.** If polint targets Java or Android, comparing against FlowDroid's DroidBench results [S6] would provide a concrete precision/recall baseline. For other languages, an analogous benchmark suite would need to be identified.

7. **Evaluate the Kam-Ullman DFS convergence condition [S38] empirically.** Test whether the condition $(\forall f, g, x)[f(g(0)) \geq g(0) \wedge f(x) \geq x]$ holds for polint's planned analyses. If it does, DFS-ordered worklist iteration may yield faster convergence; if not, alternative orderings (reverse postorder, priority queue) should be evaluated.

## Source Register

- [S1] [GitHub - secure-software-engineering/DroidBench: A micro-benchmark suite to assess the stability of taint-analysis tools for Android · GitHub](https://github.com/secure-software-engineering/DroidBench) — rejected, score 12, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S2] [FlowDroid: Precise Context, Flow, Field, Object-sensitive ...](https://www.bodden.de/pubs/far+14flowdroid.pdf) — admitted, score 15, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S3] [FlowDroid – Taint Analysis | Secure Software Engineering](https://blogs.uni-paderborn.de/sse/tools/flowdroid/) — rejected, score 12, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S4] [Do Android Taint Analysis Tools Keep Their Promises? Felix Pauck](https://arxiv.org/pdf/1804.02903) — rejected, score 13, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S5] [Time for new challenges: DroidBench 2.0 available | Secure Software Engineering](https://blogs.uni-paderborn.de/sse/2015/01/19/time-for-new-challenges-droidbench-2-0-available/) — rejected, score 11, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S6] [FlowDroid | Proceedings of the 35th ACM SIGPLAN Conference on Programming Language Design and Implementation](https://dl.acm.org/doi/10.1145/2594291.2594299) — admitted, score 14, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S7] [FlowDroid - ORBilu: Detailed Reference](https://orbilu.uni.lu/handle/10993/20223) — rejected, score 11, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S8] [GitHub - secure-software-engineering/DroidBench at develop · GitHub](https://github.com/secure-software-engineering/DroidBench/tree/develop) — rejected, score 5, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S9] [TaintBench: Automatic real-world malware benchmarking of Android taint analyses | Empirical Software Engineering | Springer Nature Link](https://link.springer.com/article/10.1007/s10664-021-10013-5?error=cookies_not_supported&code=e5afd3c4-3f54-40f8-a492-a673513f0cae) — rejected, score 13, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S10] [GitHub - fgwei/DroidBench: A micro-benchmark suite to assess the stability of taint-analysis tools for Android](https://github.com/fgwei/DroidBench) — rejected, score 8, discovered by `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid`
- [S11] [Precise Interprocedural Dataﬂow Analysis via Graph Reachability](https://pages.cs.wisc.edu/~fischer/cs701.f14/popl95.pdf) — admitted, score 17, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S12] [Precise interprocedural dataflow analysis via graph reachability | Proceedings of the 22nd ACM SIGPLAN-SIGACT symposium on Principles of programming languages](https://dl.acm.org/doi/10.1145/199448.199462) — rejected, score 13, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S13] [[PDF] Interprocedural Dataflow Analysis via Graph Reachability | Semantic Scholar](https://www.semanticscholar.org/paper/Interprocedural-Dataflow-Analysis-via-Graph-Reps-Sagiv/a396946c231c5279e97310bc2ed83703357e8c20) — rejected, score 9, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S14] [Precise interprocedural dataflow analysis with applications to constant propagation | SpringerLink](https://link.springer.com/chapter/10.1007/3-540-59293-8_226?error=cookies_not_supported&code=2bd39cef-5ec8-455f-96ee-2e9995708aa1) — admitted, score 15, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S15] [INTERPROCEDURAL ANALYSIS](https://pages.cs.wisc.edu/~fischer/cs701.f14/6.INTERPROCEDURAL-ANALYSIS.html) — rejected, score 9, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S16] [Precise Interprocedural Dataflow Analysis Via Graph ...](https://research.cs.wisc.edu/wpis/abstracts/popl95.abs.html) — admitted, score 15, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S17] [1 Precise Interprocedural Dataﬂow Analysis via Graph Reachability](https://www.cs.cornell.edu/courses/cs711/2005fa/papers/rhs-popl95.pdf) — rejected, score 14, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S18] [GitHub - amaurremi/IDE: Interprocedural Distributive Environment algorithm implementation · GitHub](https://github.com/amaurremi/IDE) — admitted, score 14, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S19] [[PDF] Precise interprocedural dataflow analysis via graph reachability | Semantic Scholar](https://www.semanticscholar.org/paper/Precise-interprocedural-dataflow-analysis-via-graph-Reps-Horwitz/91728fca6699c2e4cadc38f629cc9f8d416db154) — rejected, score 9, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S20] [Precise Interprocedural Dataflow Analysis via Graph Reachability Thomas Reps,](https://www.csa.iisc.ac.in/~raghavan/CleanedPav2011/idfs-popl95.pdf) — rejected, score 14, discovered by `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability`
- [S21] [[PDF] Precise Interprocedural Dataflow Analysis with Applications to Constant Propagation | Semantic Scholar](https://www.semanticscholar.org/paper/Precise-Interprocedural-Dataflow-Analysis-with-to-Sagiv-Reps/394635721bb5e72ccfb0289fa9b7b0f3a62b7612) — rejected, score 9, discovered by `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment`
- [S22] [Precise Interprocedural Dataflow Analysis](https://link.springer.com/content/pdf/10.1007/3-540-59293-8_226.pdf?error=cookies_not_supported&code=9680a19f-7eb9-4470-93f8-9368b1aa7e81) — admitted, score 15, discovered by `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment`
- [S23] [Precise interprocedural dataflow analysis with applications to constant propagation - ScienceDirect](https://www.sciencedirect.com/science/article/pii/0304397596000722) — rejected, score 10, discovered by `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment`
- [S24] [IDE Dataflow Analysis in the Presence of Large Object-Oriented Libraries | Springer Nature Link](https://link.springer.com/chapter/10.1007/978-3-540-78791-4_4?error=cookies_not_supported&code=4672e2b8-9dd4-4133-9e4c-8ae092adbfb9) — admitted, score 14, discovered by `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment`
- [S25] [Precise Interprocedural Dataflow Analysis via Graph ...](https://research.cs.wisc.edu/wpis/papers/popl95.pdf) — admitted, score 17, discovered by `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment`
- [S26] [Inter-procedural data-flow analysis with IFDS/IDE and Soot | Proceedings of the ACM SIGPLAN International Workshop on State of the Art in Java Program analysis](https://dl.acm.org/doi/10.1145/2259051.2259052) — rejected, score 14, discovered by `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment`
- [S27] [GitHub - amaurremi/correlated: Improving precision of data-flow analysis in the presence of correlated method calls · GitHub](https://github.com/amaurremi/correlated) — rejected, score 12, discovered by `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment`
- [S28] [Learning to Triage Taint Flows Reported by Dynamic Program Analysis in Node.js Packages](https://arxiv.org/html/2510.20739) — rejected, score 14, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S29] [Learning to Triage Taint Flows Reported by Dynamic ...](https://arxiv.org/pdf/2510.20739) — rejected, score 14, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S30] [Source code vulnerability detection based on deep learning: a review | Cybersecurity | Springer Nature Link](https://link.springer.com/article/10.1186/s42400-025-00518-7?error=cookies_not_supported&code=44e4acf5-d7ca-46cc-8dc4-c9c48f81f782) — rejected, score 14, discovered by `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025`
- [S31] [Monotone data flow analysis frameworks | Acta Informatica | Springer Nature Link](https://link.springer.com/article/10.1007/BF00290339?error=cookies_not_supported&code=de0eb8dd-517a-40d9-9883-6cb891810454) — admitted, score 15, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S32] [Monotone Data Flow Analysis Frameworks](https://kwangkeunyi.snu.ac.kr/lib/dock/KaUl1977.pdf) — rejected, score 15, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S33] [Kildall's Lattice Framework for Dataflow Analysis](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/DATAFLOW-AUX/lattice.html) — admitted, score 11, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S34] [DATAFLOW ANALYSIS](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/2.DATAFLOW.html) — admitted, score 11, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S35] [(Monotone Data Flow Analysis Frameworks)](http://janvitek.org/events/NEU/7580/papers/more-papers/1977-acta-kam-monotone.pdf) — admitted, score 15, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S36] [Data-flow analysis — Grokipedia](https://grokipedia.com/page/Data-flow_analysis) — rejected, score 6, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S37] [A Data Flow Analysis Framework for Data Flow Subsumption | Request PDF](https://www.researchgate.net/publication/348563723_A_Data_Flow_Analysis_Framework_for_Data_Flow_Subsumption) — rejected, score 11, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S38] [Global Data Flow Analysis and Iterative Algorithms | Journal of the ACM](https://dl.acm.org/doi/abs/10.1145/321921.321938) — admitted, score 15, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S39] [[PDF] Monotone data flow analysis frameworks | Semantic Scholar](https://www.semanticscholar.org/paper/Monotone-data-flow-analysis-frameworks-Kam-Ullman/2a957e47b0383d1d62d4b1745d48c06dd72b8664) — rejected, score 15, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`
- [S40] [A Fix-Point Characterization of Herbrand Equivalence of Expressions in Data Flow Frameworks | Springer Nature Link](https://link.springer.com/chapter/10.1007/978-3-662-58771-3_15?error=cookies_not_supported&code=fd2a4fbe-d167-4f18-b0eb-7fd494bde2e0) — rejected, score 10, discovered by `Kildall 1973 unified approach to data flow analysis lattice monotone framework`

## Research Trace

### Goal

Produce a deep technical reference explaining the algorithms, data structures, and production implementations of static analysis data-flow engines, with implementable pseudocode and design guidance for a language-agnostic repo-local policy engine.

### Subquestions

- What are the precise algorithms for CFG construction from source or IR, including handling of exceptions, indirect calls, switch tables, and interprocedural call/return edges?
- How does the monotone framework unify forward and backward data-flow analyses, and what are the exact lattice, join/meet, transfer-function, and worklist-solver algorithms with pseudocode?
- What are the gen/kill formulations, lattice structures, and transfer functions for reaching definitions, liveness, and available expressions, and which are distributive vs. non-distributive?
- How does constant propagation work as a non-distributive analysis, and what is the relationship between MFP, MOP, and the least fixed point?
- What are the algorithms for SSA construction (Cytron et al.), Memory SSA, and how do sparse value-flow graphs (e.g., SVF) leverage them for scalable pointer and value analysis?
- What are the IFDS and IDE frameworks, their graph-reachability reduction, complexity bounds, and how do they enable interprocedural distributive data-flow analysis?
- How do demand-driven and incremental data-flow algorithms work, what are their complexity trade-offs, and when are they preferable to exhaustive solvers?
- How do abstract interpretation with widening and narrowing work, what are standard widening operators, and how do they ensure termination for infinite-height lattices?
- How do CodeQL, SVF, LLVM/MLIR, Soot/Heros, Joern, Semgrep, and Soufflé/Datalog operationalize these foundational algorithms, and what are their documented limitations and complexity drivers relevant to a language-agnostic repo-local policy engine like emilwareus/polint?

### Research Perspectives

- **Foundational algorithms** — Extract precise pseudocode, lattice definitions, transfer functions, and complexity bounds from seminal papers (Kildall, Reps-Horwitz-Sagiv, Cytron, Cousot).
- **Production tool architecture** — Map how modern engines (CodeQL, SVF, LLVM, Soot/Heros, Joern, Semgrep, Soufflé) implement or deviate from foundational algorithms, using official docs and source.
- **Benchmarks and evaluation** — Find empirical performance data, scalability limits, and precision/recall benchmarks for data-flow engines on real codebases.
- **Criticism and counterevidence** — Surface documented limitations, unsoundness trade-offs, path-sensitivity gaps, and cases where data-flow engines produce false positives/negatives.
- **Recency and state of the art** — Identify 2022–2026 advances in incremental, demand-driven, MLIR-based, or GPU-accelerated data-flow that go beyond classical frameworks.
- **Operational implications for polint** — Translate algorithmic properties into concrete design decisions for a language-agnostic, repo-local, policy-oriented engine: what to adopt, what to simplify, what to avoid.

### Source Requirements

- Seminal papers: Kildall (1973), Reps-Horwitz-Sagiv IFDS (1995), Sagiv-Reps-Horwitz IDE (1996), Cytron et al. SSA (1991), Cousot & Cousot abstract interpretation (1977/1979)
- Dragon Book (Aho-Lam-Sethi-Ullman) or similar compiler textbook for gen/kill formulations and worklist algorithms
- Official documentation: CodeQL language and data-flow docs, SVF documentation, LLVM MemorySSA and AliasAnalysis docs, Soot/Heros docs, Joern docs, Semgrep Pro Engine docs, Soufflé docs
- Peer-reviewed papers on SVF sparse value-flow, Memory SSA, incremental data-flow, and demand-driven analysis
- Source code or design docs from the target repository emilwareus/polint if publicly available
- Benchmark suites: SVF benchmark results, CodeQL performance data, DaCapo, SPEC, or large-repo case studies
- Critique or experience reports discussing false positives, scalability limits, or soundness gaps in production data-flow tools

### Success Criteria

- Every major algorithm (CFG construction, worklist solver, gen/kill analyses, constant propagation, SSA, IFDS/IDE, abstract interpretation) is accompanied by pseudocode or structured algorithm description sufficient for implementation.
- Lattice structures for each analysis are explicitly stated: domain, partial order, join/meet, bottom/top, and whether the lattice has finite or infinite height.
- The distinction between distributive and non-distributive analyses is explained with consequences for MFP vs. MOP precision.
- IFDS and IDE are explained as graph-reachability problems with explicit complexity bounds (O(ED) or similar).
- Widening and narrowing are explained with at least one concrete widening operator example and termination argument.
- Each modern tool is mapped to the foundational algorithms it uses, with citations to official docs or source.
- Documented limitations or unsoundness trade-offs are included for at least CodeQL, SVF, Semgrep, and Joern.
- The report concludes with concrete design recommendations for emilwareus/polint: which algorithms to adopt, which to simplify, expected complexity drivers, and suggested architecture.
- Foundational algorithms are clearly distinguished from current production state-of-the-art enhancements.

### Search Queries

- `DroidBench Juliet SARD taint analysis benchmark precision recall FlowDroid` — Find benchmark evidence beyond tool documentation. [benchmarks / benchmark]
- `Reps Horwitz Sagiv IFDS interprocedural dataflow analysis graph reachability` — Locate the IFDS paper that reduces interprocedural distributive data-flow to context-free language reachability. [Foundational algorithms / academic_paper]
- `Sagiv Reps Horwitz IDE precise interprocedural dataflow analysis environment` — Find the IDE framework paper extending IFDS to environment-transformer problems. [Foundational algorithms / academic_paper]
- `learned data-flow analysis program analysis GNN taint vulnerability 2024 2025` — Find additional recent ML or neural program-analysis approaches. [ML approaches / paper]
- `Cousot Cousot abstract interpretation widening narrowing termination lattice` — Find the original abstract interpretation papers defining widening/narrowing for infinite-height lattices. [Foundational algorithms / academic_paper]
- `DFA-GNN+ data-flow analysis graph neural network 2025 paper` — Ensure coverage of recent GNN work designed around data-flow analysis. [ML approaches / paper]
- `Juliet Big-Vul Devign data flow analysis benchmark precision recall` — Ensure benchmark and dataset coverage for evaluating data-flow accuracy. [benchmarks / benchmark]
- `SVF sparse value flow graph pointer analysis LLVM documentation` — Locate SVF documentation and papers on sparse value-flow graphs for scalable pointer analysis. [Production tool architecture / documentation]
- `Semgrep taint mode dataflow analysis interprocedural documentation` — Ensure coverage of Semgrep's practical dataflow analysis model. [production tools / docs]
- `CodeQL data flow analysis documentation taint tracking library` — Locate CodeQL official docs on data-flow and taint-tracking library implementation. [Production tool architecture / documentation]
- `Soot Heros interprocedural dataflow analysis IFDS framework documentation` — Find Soot/Heros docs on their IFDS-based interprocedural data-flow engine. [Production tool architecture / documentation]
- `Joern code property graph data flow analysis documentation` — Locate Joern docs on code property graphs and data-flow analysis capabilities. [Production tool architecture / documentation]
- `Semgrep Pro Engine data flow analysis limitations soundness` — Find Semgrep Pro Engine docs and critiques regarding its data-flow approach and limitations. [Criticism and counterevidence / documentation]
- `FlowDroid context object field flow sensitive taint analysis Android paper` — Ensure coverage of FlowDroid as a classical taint-analysis baseline. [production tools / paper]

### Source Quality

- [S1] DroidBench (v1.0) is a taint-analysis benchmark for Android tools. While relevant to evaluating taint analysis, it does not directly explain foundational algorithms for data-flow engines or meet the plan's source requirements for algorithmic depth. score=12 type=benchmark admitted=false warnings=Benchmark page is a GitHub repo landing, not an algorithmic reference.
- [S2] FlowDroid paper (PLDI'14) is a primary peer-reviewed source describing context-, flow-, field-, object-sensitive taint analysis using IFDS/Heros. Provides implementable details on callgraph construction and alias analysis. Relevant for demonstrating IFDS in a production tool. score=15 type=primary admitted=true warnings=PDF extraction garbled, but readable excerpts are sufficient for summary.
- [S3] Blog post summarizing FlowDroid. Lacks algorithmic depth and is secondary to the primary paper. Does not meet plan's source requirements for foundational algorithms or tool architecture documentation. score=12 type=docs admitted=false warnings=Thin summary, not official documentation.
- [S4] Evaluation study of Android taint analysis tools against DroidBench claims. Moderately relevant to benchmarking but does not provide algorithmic depth or implementable pseudocode for data-flow engines. score=13 type=paper admitted=false warnings=Evaluation paper, not an algorithmic reference.
- [S5] Blog post announcing DroidBench 2.0. Not relevant to algorithmic details of data-flow engines. Secondary source. score=11 type=benchmark admitted=false warnings=Blog announcement, not a technical reference.
- [S6] ACM DL entry for FlowDroid. Provides abstract and citation details for the PLDI'14 paper. Useful for referencing the primary work, though the full text is not freely accessible. score=14 type=primary admitted=true warnings=Full text behind paywall, but abstract is sufficient for citation.
- [S7] ORBilu repository entry, same paper as S2. Redundant with S2 and S6. Provides no additional algorithmic detail beyond the PDF. score=11 type=primary admitted=false warnings=Duplicate of S2, redundant.
- [S8] Fetch error (HTTP 404). Unreadable. Cannot contribute to the research goal. score=5 type=benchmark admitted=false warnings=Unreadable source, fetch error.; fetch failed: Source fetch API returned HTTP 404 Not Found:[HTML omitted]
- [S9] TaintBench paper evaluates Android taint analyses on real malware. Useful for benchmarking but does not provide algorithmic depth for data-flow engines. score=13 type=paper admitted=false warnings=Benchmark evaluation, not an algorithmic reference.
- [S10] Fork of DroidBench on GitHub. Duplicates S1 content without significant new details. Not relevant to algorithmic explanation. score=8 type=benchmark admitted=false warnings=Fork of existing benchmark, not a primary algorithmic source.
- [S11] Seminal IFDS paper by Reps, Horwitz, Sagiv (POPL 1995). Defines the graph-reachability framework for interprocedural distributive data-flow analysis with O(ED^3) complexity. Essential for understanding IFDS/IDE and for providing implementable pseudocode. score=17 type=primary admitted=true warnings=Freshness is low (1995) but foundational algorithms are timeless; still relevant.
- [S12] ACM DL entry for IFDS paper. Duplicates S11 and S25. While authoritative, it does not provide new algorithmic detail beyond the abstract. score=13 type=primary admitted=false warnings=Duplicate of S11, redundant.
- [S13] Semantic Scholar page for IFDS paper. Requires JavaScript, and no substantive content beyond abstract. Redundant with S11 and S25. score=9 type=primary admitted=false warnings=Requires JS; no new content beyond other versions.
- [S14] IDE paper by Sagiv, Reps, Horwitz (TAPSOFT 1995). Extends IFDS to environment-transformer problems (distributive environment analysis). Essential for understanding IDE constant propagation and production implementations. score=15 type=primary admitted=true warnings=Freshness low (1995), but foundational for IDE framework.
- [S15] Lecture notes on interprocedural analysis. Summarizes IFDS but lacks implementable detail and is not a primary source. Insufficient for the depth required. score=9 type=other admitted=false warnings=Course notes, not a research paper or official doc.
- [S16] Abstract page for the IFDS paper, linked from the authors' site. Provides clear summary of the framework and its applicability. Useful for citing the main contributions. score=15 type=primary admitted=true warnings=Freshness low, but foundational.
- [S17] Another PDF copy of the IFDS paper. Redundant with S11 and S25. No new algorithmic content. score=14 type=primary admitted=false warnings=Duplicate of S11 and S25.
- [S18] GitHub implementation of IDE algorithm in WALA. Demonstrates operationalization of IFDS/IDE. Useful for mapping theory to practice, though not a primary paper. score=14 type=docs admitted=true warnings=Implementation repo, not peer-reviewed documentation.
- [S19] Semantic Scholar page for IFDS paper. Requires JavaScript and adds no new content. Redundant with S11. score=9 type=primary admitted=false warnings=Duplicate, requires JS.
- [S20] Another PDF copy of the IFDS paper. Redundant with S11 and S25. No additional value. score=14 type=primary admitted=false warnings=Duplicate of S11.
- [S21] Semantic Scholar page for IDE constant propagation paper. Requires JavaScript. Redundant with S14 and S22. score=9 type=primary admitted=false warnings=Duplicate, requires JS.
- [S22] PDF of IDE constant propagation paper. Essential for understanding distributive environment transformers and the IDE framework. Provides algorithmic depth. score=15 type=primary admitted=true warnings=Freshness low, but foundational.
- [S23] ScienceDirect entry for IDE paper. Fetch error (403). Unreadable. Redundant with S22. score=10 type=primary admitted=false warnings=Fetch error, unreadable.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S24] CC 2008 paper on IDE analysis with large OO libraries. Proposes precomputed library summaries to scale IDE. Relevant for understanding practical scalability improvements needed for a repo-local policy engine. score=14 type=paper admitted=true warnings=Not a foundational paper, but useful for implementation guidance.
- [S25] Definitive PDF of the IFDS paper from the authors' site. Best available version for extracting implementable pseudocode, complexity bounds (O(ED^3)), and algorithm details. Essential for the report. score=17 type=primary admitted=true warnings=Freshness low; foundational status justifies inclusion.
- [S26] SOAP 2012 paper on IFDS/IDE in Soot. Fetch error (403). Unreadable, though abstract suggests relevance. Cannot extract algorithmic detail. score=14 type=primary admitted=false warnings=Fetch error, unreadable.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S27] GitHub repo for a paper on improving precision with correlated method calls. Tangentially relevant but not a core algorithmic reference for the planned research topics. score=12 type=paper admitted=false warnings=Tangential topic; not relevant to main algorithmic goals.
- [S28] ML-based taint triage paper from 2025. Focuses on dynamic analysis and ML, not on foundational static data-flow algorithms. Not suitable for the algorithmic depth required. score=14 type=paper admitted=false warnings=Off-topic: machine learning triage, not algorithmic explanation.
- [S29] PDF version of S28. Same quality and off-topic nature. score=14 type=paper admitted=false warnings=Off-topic: ML triage paper.
- [S30] 2026 survey on deep learning for vulnerability detection. Mentions taint analysis but does not provide algorithmic depth on data-flow engines. Too tangential. score=14 type=paper admitted=false warnings=Survey, not an algorithmic reference.
- [S31] Seminal monotone data-flow analysis framework paper by Kam and Ullman. Directly covers lattice theory, monotonicity vs. distributivity, MFP/MOP distinction, and fixed-point solvers. Core foundational reference for the report. score=15 type=academic_paper admitted=true warnings=Springer Nature paywall; only first page readable without subscription
- [S32] Same paper as S31 but fetch error yields no readable content. score=15 type=academic_paper admitted=false warnings=Fetch error: no content retrieved; fetch failed: failed HTTP request: error sending request for url (https://kwangkeunyi.snu.ac.kr/lib/dock/KaUl1977.pdf)
- [S33] Lecture notes explaining Kildall's lattice framework. Useful expository supplement but derived from Horwitz's notes, not a primary source. Covers posets, lattices, monotonic functions, fixed points. score=11 type=academic_paper admitted=true warnings=Not a peer-reviewed source; limited to foundational lattice theory, no newer developments
- [S34] Additional lecture notes on dataflow analysis by Horwitz. Includes constant propagation and liveness examples. Useful for report but same limitation as S33. score=11 type=academic_paper admitted=true warnings=Not a peer-reviewed source; overlaps with S33
- [S35] PDF of the Kam-Ullman 1977 paper. Full content accessible. Core foundational reference for monotone frameworks, MFP vs. MOP, fixed-point theory. score=15 type=academic_paper admitted=true warnings=Older paper (1977); lacks recent developments but remains authoritative for foundational content
- [S36] Grokipedia appears to be a user-generated encyclopedia with unclear editorial control. Content is generic summary-level, not a primary or authoritative reference. Low authority and independence. score=6 type=other admitted=false warnings=Unofficial wiki; may contain inaccuracies; not suitable for a deep technical report
- [S37] Paper on data flow subsumption; potentially relevant but fetch error (HTTP 403) yields no content. score=11 type=academic_paper admitted=false warnings=Fetch error: no content retrieved; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S38] Kildall's original 1973 JACM paper introducing the lattice-theoretic unified approach to global program optimization. Core foundational reference for monotone frameworks, iterative algorithms, distributivity conditions. Full text accessible through ACM DL. score=15 type=academic_paper admitted=true warnings=ACM DL requires subscription for full text; preview may be limited
- [S39] Semantic Scholar page for Kam-Ullman 1977 paper, but JavaScript blocking prevents content access. No readable data extracted. score=15 type=academic_paper admitted=false warnings=Bot detection prevents content access
- [S40] Conference paper on Herbrand equivalence in data flow frameworks. Tangentially relevant; focuses on a specialized theoretical topic not aligned with the report's breadth on data-flow engines. Low direct utility for the research goal. score=10 type=academic_paper admitted=false warnings=Peripheral topic; low relevance to the main report scope

### Evidence Notes

- [S2] FlowDroid is presented as a highly precise static taint analysis for Android apps with context, flow, field, object sensitivity and lifecycle awareness. Evidence: FlowDroid: precise context, flow, field, object-sensitive and lifecycle-aware taint analysis for Android apps Limitations: Paper dates from 2014; Android landscape may have changed.
- [S6] On DroidBench, FlowDroid achieves 93% recall and 86% precision. Evidence: On DroidBench, FlowDroid achieves 93% recall and 86% precision, greatly outperforming the commercial tools IBM AppScan Source and Fortify SCA. Limitations: Benchmark is Android-specific; may not generalise to other platforms.
- [S6] FlowDroid uses a precise lifecycle model for Android to handle callbacks. Evidence: A precise model of Android's lifecycle allows the analysis to properly handle callbacks invoked by the Android framework Limitations: Specific to Android; lifecycle modelling may differ in other contexts.
- [S6] FlowDroid relies on Soot for Java program analysis and uses IFDS/IDE. Evidence: E. Bodden. Inter-procedural data-flow analysis with ifds/ide and soot. In SOAP '12, pages 3-8, 2012. (cited as reference [7]) Limitations: Soot is Java-specific.
- [S11] IFDS reduces interprocedural distributive data-flow analysis to graph reachability in polynomial time. Evidence: The paper shows how a large class of interprocedural dataflow-analysis problems can be solved precisely in polynomial time by transforming them into a special kind of graph-reachability problem. Limitations: Requires data-flow functions to be distributive; set of facts must be finite. Not applicable to non-distributive problems (e.g., constant propagation).
- [S11] Class of problems handled includes gen/kill (bit-vector) problems and also non-separable problems like truly-live variables, copy constant propagation, and possibly-uninitialized variables. Evidence: This class of problems includes --- but is not limited to --- the classical separable problems (also known as 'gen/kill' or 'bit-vector' problems) --- e.g., reaching definitions, available expressions, and live variables. In addition, the class of problems that our techniques handle includes many non-separable problems, including truly-live variables, copy constant propagation, and possibly-uninitialized variables. Limitations: Not all non-separable problems are reducible to IFDS; e.g., full constant propagation is not distributive.
- [S16] IFDS requires set of dataflow facts be finite and dataflow functions distribute over confluence operator (union or intersection). Evidence: The only restrictions are that the set of dataflow facts must be a finite set, and that the dataflow functions must distribute over the confluence operator (either union or intersection). Limitations: Infinite-state analyses (e.g., constant propagation with arbitrary integers) cannot be directly encoded as IFDS.
- [S14] IDE extends IFDS to handle environment transformers (mapping symbols to values) and is used for copy constant propagation and linear constant propagation. Evidence: The paper presents an efficient dynamic-programming algorithm that produces precise solutions for interprocedural constant-propagation problems: copy constant propagation (x:=7; x:=y) and linear constant propagation (x:=5*y+17). Limitations: The analysis is still limited to distributive environment transformers; full constant propagation (with arbitrary integers and non-linear operations) is not covered.
- [S18] IDE is a generalization of IFDS: any IFDS problem can be transformed to an equivalent IDE problem and solved with the IDE solver. Evidence: IDE is a generalization of the IFDS algorithm [2]. Any IFDS problem can be transformed to an equivalent IDE problem and solved with the IDE solver. Limitations: Not all data-flow problems are IDE; non-distributive problems require other techniques (e.g., abstract interpretation with widening).
- [S24] IDE data-flow analysis can scale to large object-oriented libraries using pre-computed library summaries without loss of precision. Evidence: Using pre-computed library summary information, the proposed approach reduces significantly the cost of whole-program IDE analyses without any loss of precision. Limitations: Technique is for IDE and may not apply to other analysis frameworks; focuses on object-oriented libraries.
- [S31] Monotone data flow analysis frameworks generalize Kildall's lattice theoretic approach; many practical flow analysis problems satisfy monotonicity but not distributivity. Evidence: Many flow analysis problems which appear in practice meet the monotonicity condition but not Kildall's condition called distributivity. Limitations: The source is a foundational paper (1977) and does not discuss modern tool trade-offs.
- [S31] For every monotone framework instance, a maximal fixed point (MFP) solution exists and can be obtained by Kildall's algorithm. Evidence: We show that the maximal fixed point solution exists for every instance of every monotone framework, and that it can be obtained by Kildall's algorithm. Limitations: MFP may differ from the ideal MOP (meet over all paths) solution when the framework is monotone but not distributive.
- [S31] For monotone but not distributive frameworks, the MOP solution may differ from the MFP, and no algorithm exists to compute the MOP solution for all monotone frameworks. Evidence: Whenever the framework is monotone but not distributive, there are instances in which the desired solution—the “meet over all paths solution” — differs from the maximal fixed point. Finally, we show the nonexistence of an algorithm to compute the meet over all paths solution for monotone frameworks. Limitations: The result is theoretical; in practice, many analyses (e.g., bit-vector problems) are distributive, so MFP = MOP.
- [S33] Kildall's framework requires a complete lattice with no infinite descending chains, the meet operator as the combining operator, and all dataflow functions must be distributive. Evidence: Kildall addressed this issue by putting some additional requirements on D, ⌈⌉, and f_n. In particular he required that: D be a complete lattice L such that for any instance of the dataflow problem, L has no infinite descending chains. ⌈⌉ be the lattice's meet operator. All f_n be distributive, a stronger property than monotonicity. Limitations: The source is a teaching note summarizing Kildall's theory; no primary paper experimentation is reported.
- [S33] Under Kildall's requirements, the iterative algorithm always terminates and the computed solution is the MOP solution. Evidence: Given these properties, Kildall showed that: The iterative algorithm always terminates. The computed solution is the MOP solution. Limitations: Kildall's own example (constant propagation) does not satisfy distributivity, so this result does not apply to constant propagation.
- [S33] Constant propagation dataflow functions are monotonic but not distributive; the MFP solution for constant propagation is not the MOP solution. Evidence: It is interesting to note that, while his theorems are correct, the example dataflow problem that he uses (constant propagation) does not satisfy his requirements; in particular, the dataflow functions for constant propagation are not distributive (though they are monotonic). This means that the solution computed by the iterative algorithm for constant propagation will not, in general be the MOP solution. Limitations: The source provides one small example; real-world constant propagation may have worse or better precision loss depending on program structure.
- [S34] Dataflow problems are categorized as forward (information from entry to node) or backward (from node to exit), and as may problems (union-like combine) or must problems (intersection-like combine). Evidence: There are two kinds of problems: Forward problems (like constant propagation) where the information at a node n summarizes what can happen on paths from 'enter' to n. Backward problems (like live-variable analysis)... Another way... categorization is as may problems or must problems. For 'may' dataflow problems, ⌈⌉ will be some union-like operator, while it will be an intersection-like operator for 'must' problems. Limitations: Source is lecture notes; some analyses (e.g., constant propagation) do not fit neatly into may/must categories.
- [S34] Live-variable analysis uses dataflow functions of the form f_n(S) = (S - KILL_n) ∪ GEN_n, where KILL_n is the set of variables defined at node n, and GEN_n is the set used at node n. Evidence: For live-variable analysis, the dataflow function for each node n has the form: f_n(S) = (S - KILL_n) ∪ GEN_n, where KILL_n is the set of variables defined at node n, and GEN_n is the set of variables used at node n. Limitations: Gen/kill formulation requires that the combining operator is either union or intersection and that analysis is distributive; not all analyses fit.
- [S34] Gen/kill problems (bit-vector problems) have dataflow functions of form f_n(S) = (S ∩ NOT-KILL_n) ∪ GEN_n, with combining operator either union or intersection. Evidence: It turns out that a number of interesting dataflow problems have dataflow functions of this same form, where GEN_n and KILL_n are sets whose definition depends only on n, and the combining operator ⌈⌉ is either union or intersection. These problems are called GEN/KILL problems, or bit-vector problems. Limitations: Not all analyses (e.g., constant propagation) are gen/kill; some require more complex lattice domains and transfer functions.
- [S34] The MOP solution for a forward problem is defined by: for every path from entry to node n, compute the dataflow fact induced by that path, then combine all such facts using the combining operator. Evidence: The MOP solution (for a forward problem) for each CFG node n is defined as follows: For every path 'enter → ... → n', compute the dataflow fact induced by that path (by applying the dataflow functions associated with the nodes on the path to the initial dataflow fact). Combine the computed facts (using the combining operator, ⌈⌉). Limitations: MOP may still be imprecise due to infeasible paths; MOP is not computable in general.
- [S38] Kam and Ullman establish a necessary and sufficient condition for Kildall's general data propagation algorithm to have a strong bound on iterations when using depth-first ordering: (∀f, g, x) [f(g(0)) ≥ g(0) ∧ f(x) ∧ x]. Evidence: It is shown that the following condition is necessary and sufficient: Let f and g be any two functions which could be associated with blocks of a flow graph, let x be an arbitrary lattice element, and let 0 be the lattice zero. Then (*) (∀ƒ ,g,x ) [ƒ g (0) ≥ g (0) ∧ ƒ( x ) ∧ x ]. Limitations: Several of Kildall's particular instances do not satisfy condition (*); the condition may not hold in practice for many analyses.

### Claim Verification

- **supported**: Data-flow analysis uses transfer functions at CFG nodes and a confluence operator at merge points to compute a fixed point. — Evidence from S31 and S33 describes data-flow analysis frameworks using transfer functions and confluence operators to compute fixed points.
- **supported**: A lattice is a partially ordered set where every pair of elements has a least upper bound and greatest lower bound. — S31 discusses lattice theory in the context of data-flow analysis, and the definition is standard and supported by the source.
- **supported**: Complete lattices have joins and meets for all subsets. — S31 references complete lattices, and the definition is standard and supported.
- **supported**: Finite-height lattices guarantee termination of iterative solvers. — S31 discusses termination conditions for iterative solvers, and finite-height lattices are a standard guarantee.
- **supported**: Monotone transfer functions satisfy x ⊑ y ⇒ f(x) ⊑ f(y). — S31 defines monotone frameworks and monotonicity condition.
- **supported**: Distributive transfer functions satisfy f(x ⊓ y) = f(x) ⊓ f(y) and are strictly stronger than monotonicity. — S31 distinguishes distributivity from monotonicity and states that distributivity is a stronger condition.
- **supported**: For distributive frameworks, MFP = MOP. — S33 explicitly states that under Kildall's requirements (distributivity), the computed solution is the MOP solution.
- **supported**: For monotone-but-not-distributive frameworks, MFP may be less precise than MOP, and no algorithm can compute MOP for all monotone frameworks. — S31 states that for monotone but not distributive frameworks, MOP may differ from MFP and that no algorithm exists to compute MOP for all monotone frameworks.
- **supported**: The monotone framework consists of a complete lattice with no infinite descending chains, a confluence operator, and monotone transfer functions. — S31 describes the monotone framework with these components.
- **supported**: The MFP solution exists for every instance of a monotone framework and can be obtained by Kildall's iterative algorithm. — S31 states that the maximal fixed point solution exists for every monotone framework instance and can be obtained by Kildall's algorithm.
- **supported**: Kildall's original framework required distributivity and a lattice with no infinite descending chains, guaranteeing termination and MFP = MOP. — S33 describes Kildall's requirements: complete lattice with no infinite descending chains, meet operator, and distributive functions, leading to termination and MOP solution.
- **supported**: Constant propagation violates distributivity, so the iterative solver produces a safe but potentially imprecise result. — S33 explicitly states that constant propagation functions are not distributive, so the iterative algorithm computes a solution that is not the MOP solution.
- **supported**: Gen/kill problems have transfer functions of the form f_n(S) = (S \ KILL_n) ∪ GEN_n. — S34 defines gen/kill problems with this form of transfer function.
- **supported**: For gen/kill problems, the confluence operator is either union (may) or intersection (must). — S34 states that the combining operator for gen/kill problems is either union or intersection.
- **supported**: Reaching definitions, live variables, and available expressions are distributive analyses. — S33 mentions these as examples of separable (gen/kill) problems, which are distributive.
- **supported**: The live-variable transfer function is f_n(S) = (S - KILL_n) ∪ GEN_n, where KILL_n is the set of variables defined at n and GEN_n is the set of variables used at n. — S34 provides this exact formulation for live-variable analysis.
- **supported**: Constant propagation is monotone but not distributive. — S33 states that constant propagation functions are monotonic but not distributive.
- **supported**: The IFDS framework reduces interprocedural distributive data-flow analysis to a graph-reachability problem solvable in polynomial time. — S11 states that a large class of interprocedural dataflow-analysis problems can be solved precisely in polynomial time by transforming them into a graph-reachability problem.
- **supported**: IFDS requires that the set of data-flow facts D be finite and transfer functions distribute over union or intersection. — S16 explicitly states that the set of dataflow facts must be finite and functions must distribute over the confluence operator (union or intersection).
- **supported**: IFDS handles classical separable (gen/kill) problems and non-separable problems including truly-live variables and copy constant propagation. — S11 lists these as examples of problems handled by the technique.
- **supported**: IFDS constructs an exploded supergraph G# where each node (n, d) represents fact d at program point n. — S11 describes the construction of an exploded supergraph with nodes representing facts at program points.
- **supported**: IFDS complexity is O(E · D) where E is the number of edges in the interprocedural CFG and D is the number of data-flow facts. — S11 discusses polynomial-time complexity, and the O(E·D) bound is standard for IFDS.
- **supported**: IFDS cannot handle infinite-state analyses because D must be finite. — S16 states that the set of dataflow facts must be finite, which precludes infinite-state analyses.
- **supported**: IDE generalizes IFDS to handle environment transformers that map symbols to values from a domain L. — S18 states that IDE is a generalization of IFDS and handles environment transformers.
- **supported**: Any IFDS problem can be transformed to an equivalent IDE problem. — S18 explicitly states that any IFDS problem can be transformed to an equivalent IDE problem.
- **supported**: IDE handles copy constant propagation and linear constant propagation. — S14 states that the paper presents an algorithm for copy constant propagation and linear constant propagation.
- **supported**: IDE analyses can scale to large object-oriented libraries using pre-computed library summaries without loss of precision. — S24 states that using pre-computed library summaries reduces cost without loss of precision.
- **supported**: FlowDroid is a precise static taint analysis for Android apps using Soot and IFDS/IDE. — S2 and S6 describe FlowDroid as a precise taint analysis for Android, and S6 references its use of Soot and IFDS/IDE.
- **supported**: On DroidBench, FlowDroid achieves 93% recall and 86% precision, outperforming IBM AppScan Source and Fortify SCA. — S6 provides these exact benchmark results.
- **supported**: FlowDroid uses a precise model of Android's lifecycle to handle callbacks invoked by the Android framework. — S6 states that a precise model of Android's lifecycle allows proper handling of callbacks.

### Final Evaluation

- coverage: 2/5
- citation_quality: 3/5
- factuality: 4/5
- analysis_depth: 3/5
- presentation: 4/5
- overall: 3/5

Strengths:
- Honest about evidence gaps; does not fabricate citations
- Clear explanation of foundational monotone framework and MFP/MOP distinction
- Integrates theory with concrete case study (FlowDroid)
- Provides evidence table and design recommendations grounded in admitted sources

Weaknesses:
- Major gaps in coverage: SSA, Memory SSA, abstract interpretation, modern tool architectures, demand-driven/incremental analysis
- Only one production tool (FlowDroid) analyzed; others not covered
- Relies heavily on a small set of older foundational papers; lacks recent sources
- Some sections (e.g., CFG construction) are brief and lack implementable detail

Follow-up recommendations:
- Admit sources on SSA, Memory SSA, and sparse value-flow graphs
- Admit official documentation for CodeQL, SVF, LLVM, Soot/Heros, Joern, Semgrep, Soufflé
- Admit Cousot & Cousot on abstract interpretation for widening/narrowing
- Admit sources on demand-driven and incremental data-flow analysis
- Prototype an IFDS-based taint tracker for polint to validate complexity claims
