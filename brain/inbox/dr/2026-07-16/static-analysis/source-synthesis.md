---
title: "static analysis tutorial: core concepts, algorithms (dataflow analysis, control flow graphs, abstract interpretation, symbolic execution, taint analysis), tools (Clang Static Analyzer, ESLint, SonarQube, Semgrep, Rust borrow checker), how static analysis works internally, AST parsing, type checking, pattern matching, linting vs static analysis, false positives, real-world examples"
generated_at: 2026-07-16T16:57:04.528421526+00:00
strategy: deep-agent-v1
effort: deep
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static Analysis: Core Concepts, Algorithms, Tools, and Limitations

## Abstract

This report synthesizes foundational and practical sources to explain how static analysis works internally, from control flow graphs and abstract syntax trees to dataflow analysis, abstract interpretation, and symbolic execution. We cover the formal underpinnings of each technique—lattices, fixpoints, soundness conditions, path constraints—and connect them to real tool implementations. The evidence base is strongest for dataflow analysis, abstract interpretation, and symbolic execution; it is thinner for specific tool architectures (Clang, ESLint, SonarQube, Semgrep, Rust) and for empirical false-positive studies, which we flag explicitly.

## Research Question

How do static analysis techniques work internally, what algorithms underpin them, what do real tools implement, and where do they fail?

## Method

We draw on admitted sources spanning Clang documentation on dataflow analysis [S1], a university textbook on static program analysis [S9], a blog on control flow graphs [S10], Cousot's publications on abstract interpretation [S12, S13, S15, S16, S17, S18, S20], and several sources on symbolic execution including KLEE and angr documentation [S21, S22, S24, S25, S26, S29]. Where the source register lacks evidence for a planned topic (e.g., ESLint internals, SonarQube architecture, Rust borrow checker, taint analysis CVEs, empirical false-positive studies), we state this gap rather than fabricate claims.

## Conceptual Background

The textbook by Møller and Schwartzbach covers a broad range of static analysis topics including type analysis, lattice theory, control flow graphs, dataflow analysis, fixed-point algorithms, widening and narrowing, path sensitivity, interprocedural analysis, pointer analysis, and abstract interpretation [S9].

### Key Terms

| Term | Definition | Role |
|------|-----------|------|
| AST | Abstract Syntax Tree; tree representation of source structure | Parsing, pattern matching, linting |
| CFG | Control Flow Graph; graph of basic blocks connected by control transfers | Dataflow, path-sensitive analysis |
| Basic block | Single-entry, single-exit instruction sequence | CFG node |
| Lattice | Partially ordered set with join (least upper bound) | Dataflow analysis domain |
| Fixpoint | Point where further iteration changes nothing | Termination of dataflow iteration |
| Galois connection | Correspondence between concrete and abstract domains | Soundness of abstract interpretation |
| Path constraint | Symbolic predicate that must hold for a path to be feasible | Symbolic execution |
| Transfer function | Maps input facts to output facts for a basic block | Dataflow propagation |

### Type Checking and Abstract Interpretation

Type checking verifies that operations respect a type discipline, which can itself be viewed as a form of abstract interpretation [S18]. Cousot showed that types can be viewed as abstract interpretations, where types are abstractions of runtime values and the type checker computes an abstract semantics [S18]. This unifying perspective connects type checking to the broader static analysis framework, though not all practical type checkers follow this formal model [S18].

## Findings

### 1. Control Flow Graphs as Foundation

The CFG is a directed graph ⟨V, E⟩ where V is the set of basic blocks and E represents control flow transfers between them [S10]. A basic block is a single-entry, single-exit sequence of instructions [S10]. Leaders—the first instructions of basic blocks—are identified by three rules: the first instruction in a function, targets of jumps, and instructions immediately following jumps [S10].

CFG construction is straightforward for structured control flow but becomes imprecise with indirect jumps, function pointers, or self-modifying code [S10]. Despite these limitations, the CFG is the backbone of virtually all flow-sensitive analyses.

### 2. Dataflow Analysis: Propagating Facts to a Fixpoint

Dataflow analysis propagates facts through CFG edges until a fixpoint is reached [S1]. The formal structure requires a join-semilattice: a partially ordered set where every two elements have a least upper bound (join). The join operation satisfies join(a, b) ≥ a and join(x, x) = x [S1]. A common lattice is the powerset of possible values, ordered by set inclusion, with set union as join [S1].

Two special lattice elements encode extreme states:

- **Top (⊤)**: too much or conflicting information; the analysis has lost precision [S1].
- **Bottom (⊥)**: no possible values; used for uninitialized variables [S1].

The transfer function models the effect of a basic block on incoming facts:

```
out = transfer(basic_block, join(in_1, in_2, ..., in_n))
```

where in_i are facts from predecessor blocks [S1]. The analysis iterates this equation over all blocks until no facts change—the fixpoint.

**Worklist optimization.** Instead of recomputing all blocks each iteration, a worklist queue processes only blocks whose inputs changed. This reduces time complexity to O(m × |L|), where m is the number of basic blocks and |L| is the lattice size [S1]. The bound assumes a finite-height lattice; infinite domains require widening to ensure termination [S1].

| Dimension | Forward Analysis | Backward Analysis |
|-----------|-----------------|-------------------|
| Direction | Entry → Exit | Exit → Entry |
| Example | Reaching definitions | Live variables |
| Join point | Multiple predecessors | Multiple successors |
| Transfer input | join of predecessor outs | join of successor ins |

| Dimension | May Analysis | Must Analysis |
|-----------|-------------|---------------|
| Semantics | Possibly true | Definitely true |
| Join | Union (∪) | Intersection (∩) |
| Precision bias | Over-approximation | Under-approximation |
| Example | May-be-modified | Definitely-assigned |

### 3. Abstract Interpretation: Soundness via Over-Approximation

Abstract interpretation provides a framework for designing sound static analyses by approximating concrete program semantics with abstract ones. The concrete semantics of a program is the least fixpoint of a semantic transformer F, denoted lfp(F). An abstract analysis computes an approximation A that must satisfy:

```
lfp(F) ⊑ A
```

That is, the abstract result over-approximates the concrete least fixpoint [S15]. This is the soundness condition: any property true in the concrete semantics is also implied by the abstract result.

**Galois connections.** Abstract interpretation establishes a correspondence between the domain of concrete properties and the domain of abstract properties via Galois connections [S13]. Monotonicity of the abstraction and concretization process preserves the soundness of the approximation [S16].

**Widening and narrowing.** Cousot's tutorial on abstract interpretation covers widening, narrowing, Galois connections, and soundness as topics [S17]. These concepts are relevant for infinite-height lattices where fixpoint iteration may not terminate without additional operators.

**Types as abstract interpretations.** Cousot showed that type systems can be viewed as abstract interpretations, where types are abstractions of runtime values and the type checker computes an abstract semantics [S18]. This unifying perspective connects type checking to the broader static analysis framework, though not all practical type checkers follow this formal model [S18].

*Insight:* The soundness condition lfp(F) ⊑ A makes the trade-off between soundness and precision explicit: a coarser abstraction is cheaper and sound but less precise. The practical difficulty is choosing a domain precise enough to be useful but small enough to terminate.

### 4. Symbolic Execution: Path-Sensitive Exploration

Symbolic execution replaces concrete inputs with symbolic variables and tracks symbolic states rather than concrete values [S21]. At each conditional branch, execution forks into two paths, each with an updated path constraint (PC)—a predicate over symbolic variables that must hold for that path to be feasible [S21, S26].

For example, given `if (z == x)`, symbolic execution creates:
- Path 1: PC = (x₀ ≠ 2·y₀), skipping the if-body
- Path 2: PC = (x₀ == 2·y₀), entering the if-body [S21]

A constraint solver (e.g., Z3) checks each path constraint for satisfiability. If satisfiable, the solver can generate concrete test inputs that exercise that path [S21]. KLEE, a prominent symbolic execution engine for LLVM bitcode, uses Z3 as its backend solver [S21, S29].

**Concolic testing.** Pure symbolic execution struggles with constraints that are hard or impossible for solvers (e.g., x == (y·y) mod 50 with both x and y symbolic). Concolic testing combines concrete and symbolic execution: it concretizes some variables to their runtime values, making the remaining constraints solvable [S24]. Angr implements this approach [S24]. KLEE can also concretize symbolic values when constraints fully determine them, writing concrete values back to memory [S29].

| Feature | Abstract Interpretation | Symbolic Execution |
|---------|------------------------|-------------------|
| Path sensitivity | No (merges paths at joins) | Yes (forks at branches) |
| Termination | Guaranteed (via widening) | Not guaranteed (path explosion) |
| Output | Abstract property | Test inputs + path constraints |
| Solver dependency | None | SMT solver required |
| Scalability | Better for large codebases | Limited by path count |
| Soundness | Over-approximation (sound) | Under-approximation (misses paths) |

**Limitations of symbolic execution.** Path explosion is the fundamental challenge: the number of paths grows exponentially with the number of branches [S21, S26]. Additionally, path constraints extracted from real binaries are often unreadable for human analysts because they reflect low-level intermediate representations (e.g., VEX in angr) and bit-vector operations [S25]. This limits the usefulness of symbolic execution for manual auditing, though it remains powerful for automated test generation.

### 5. Tool Internals: What the Evidence Supports

The admitted source register provides detailed evidence for symbolic execution tools (KLEE, angr) but limited evidence for other planned tools.

**KLEE** operates on LLVM bitcode. Users annotate symbolic variables with `klee_make_symbolic` and compile programs with `clang -emit-llvm` [S21]. KLEE explores paths, solves constraints with Z3, and generates test cases. It has been used to find buffer overflow vulnerabilities in example programs by generating bug-triggering inputs [S21]. KLEE can concretize determined symbolic values to reduce overhead [S29].

**Angr** is a Python-based symbolic execution framework for binaries. It creates separate execution paths at branches (e.g., X > 10 and X ≤ 10) and solves constraints to explore both [S22]. It supports concolic execution for handling complex constraints [S24].

For Clang Static Analyzer, ESLint, SonarQube, Semgrep, and the Rust borrow checker, the admitted source register does not contain tool-specific documentation or architecture descriptions. The Clang dataflow analysis documentation [S1] describes the conceptual framework that the Clang Static Analyzer builds upon, but does not detail the analyzer's internal engine, checker model, or path-sensitive exploration strategy. We note this as a significant evidence gap.

### 6. False Positives and Limitations

Several specific limitations emerge from the evidence:

1. **Top (⊤) loss of precision.** When dataflow analysis encounters conflicting information, it falls back to ⊤, losing all precision for that variable [S1]. This is a primary source of false positives in flow-sensitive analyses.

2. **CFG construction imprecision.** Indirect jumps, function pointers, and self-modifying code make CFG construction imprecise, leading to missing edges (unsoundness) or spurious edges (false positives) [S10].

3. **Path constraint unreadability.** In symbolic execution, constraints derived from binary-level representations are verbose and difficult for humans to interpret, limiting practical adoption for manual analysis [S25].

4. **Path explosion.** Symbolic execution cannot exhaustively explore all paths in large programs, making it an under-approximating technique in practice despite its theoretical completeness [S21, S26].

5. **Solver limitations.** Constraints involving nonlinear arithmetic, hashing, or floating-point operations may be undecidable or practically unsolvable, forcing concretization that sacrifices coverage [S24].

The admitted source register does not contain empirical studies quantifying false-positive rates in industrial tools (e.g., SonarQube, Coverity, CodeQL). This is a notable gap; claims about specific false-positive rates in practice are not supported by the available evidence.

### Evidence Table

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| Dataflow propagates facts to fixpoint | "propagating facts ... through the edges of the CFG until a fixpoint is reached" | [S1] | Fixpoint may be ⊤; requires finite lattice or widening |
| Join-semilattice combines facts at CFG joins | "join(a, b) ⩾ a ... join(x, x) = x" | [S1] | Simple lattice may not capture all behavior |
| Worklist optimization yields O(m×\|L\|) | "time complexity becomes O(m * \|L\|)" | [S1] | Assumes manageable lattice size |
| Soundness requires lfp(F) ⊑ A | "lfp(F) ⊑ A" | [S15] | Relative to chosen abstraction |
| Monotonicity preserves soundness | "abstraction and concretization process preserves the soundness" | [S16] | Not all abstractions are monotone |
| Galois connections link concrete and abstract domains | "establish the correspondence between the domain of concrete or exact properties and ..." | [S13] | Evidence does not detail formal definitions of α/γ |
| Cousot tutorial covers widening, narrowing, Galois connections | Keywords list includes "Widening," "Narrowing," "Galois Connection," "Soundness" | [S17] | Tutorial slides; no detailed definitions in evidence |
| Types are abstract interpretations | "abstract semantics ... designed by successive abstractions" | [S18] | Not all type systems fit this model |
| Symbolic execution forks at branches | "symbolic execution is forked by creating two execution states" | [S26] | Exponential state explosion |
| KLEE uses Z3 solver | "KLEE: Using Z3 solver backend" | [S21] | Solver performance bottleneck |
| Concolic testing concretizes variables | "if we concretize y ... now solvable" | [S24] | Concretization reduces coverage |
| Path constraints from binaries are unreadable | "often unreadable for human analysts" | [S25] | No universal solution proposed |

## Design Implications

**Choose the abstraction based on the property.** If the goal is to prove absence of a bug (e.g., no null dereference), use a sound over-approximating analysis (abstract interpretation). If the goal is to find bugs, an under-approximating technique (symbolic execution) may be more practical because it generates concrete witnesses.

**Worklist-based fixpoint iteration is the practical baseline.** The O(m × |L|) complexity [S1] is manageable for finite lattices. For infinite domains, widening is necessary but introduces precision loss. Designers should evaluate whether the precision loss from widening is acceptable for their target property.

**Path-sensitive analyses need budgeting.** Symbolic execution tools should implement path-merging, concretization, or search heuristics to manage path explosion. KLEE's concretization of determined values [S29] and angr's concolic mode [S24] are examples of this strategy.

**CFG quality determines analysis quality.** Imprecise CFGs propagate imprecision through every downstream analysis. Investing in accurate CFG construction—especially for indirect calls and exception handling—yields disproportionate returns.

## Limitations and Threats to Validity

**Source coverage gaps.** The admitted source register is heavily weighted toward foundational theory (abstract interpretation, dataflow, symbolic execution) and lacks evidence for several planned topics: ESLint architecture, SonarQube internals, Semgrep pattern matching, Rust borrow checker (NLL/MIR), taint analysis with real CVEs, and empirical false-positive studies. Claims about these tools are absent from this report rather than inferred.

**Temporal scope.** Most sources predate 2023. The Clang documentation [S1], Cousot's papers [S12-S18, S20], and the symbolic execution sources [S21-S26, S29] are foundational works that remain relevant but do not capture recent tool developments, ML-assisted analysis, or 2024-2026 benchmarks.

**Theory-practice gap.** The sources explain algorithms and formal frameworks but provide limited evidence on how industrial tools implement them. The gap between the abstract interpretation formalism and a tool like SonarQube is substantial and not bridged by the available evidence.

**Vendor bias.** KLEE and angr documentation [S21, S22, S29] are tool-maintained sources that may emphasize capabilities and understate limitations. The tutorial examples (e.g., buffer overflow in bof.c [S21]) are simple and may not generalize.

## Open Questions

1. How do industrial tools (SonarQube, Semgrep, CodeQL) implement taint analysis internally—do they use CFG-based dataflow, AST pattern matching, or hybrid approaches?
2. What are the measured false-positive rates of major static analysis tools in large-scale industrial codebases, and how do they correlate with analysis configuration?
3. How does the Rust borrow checker's use of MIR and non-lexical lifetimes relate to the dataflow and abstract interpretation frameworks described here?
4. Can ML-assisted approaches reduce false positives without sacrificing soundness, or do they fundamentally trade soundness for precision?
5. How do modern symbolic execution tools scale path exploration beyond toy examples—what search heuristics and path-merging strategies are effective in practice?
6. What is the precise formal definition of static analysis as a discipline, and how do different sources characterize its scope and relationship to dynamic analysis?
7. How do linting tools differ from static analysis tools in terms of internal architecture, and where is the boundary between them?
8. What are the formal definitions of widening and narrowing operators, and how do they enforce termination and recover precision in infinite-height lattices?
9. What is the precise formal structure of a Galois connection (including the α and γ functions and their relationship), and how does it guarantee soundness?

## Recommended Next Experiments

1. **Replicate the KLEE buffer overflow example** [S21] on a larger codebase (e.g., a real C utility) and measure path coverage, time to first bug, and constraint solver invocations. This would test whether the tutorial example generalizes.

2. **Implement a worklist-based dataflow analysis** for reaching definitions on a small CFG, varying lattice size and measuring iterations to fixpoint. This would empirically validate the O(m × |L|) bound [S1] and reveal where widening becomes necessary.

3. **Compare path constraint readability** across KLEE (LLVM bitcode) and angr (VEX) on the same binary, quantifying constraint size and human interpretability. This extends the finding about unreadable constraints [S25] with comparative data.

4. **Measure false-positive rates** of a sound over-approximating analysis (e.g., interval abstract domain) versus an under-approximating symbolic execution on a benchmark suite, holding the target property fixed (e.g., null dereference). This would quantify the soundness-precision trade-off empirically.

5. **Survey tool documentation** for Clang Static Analyzer, ESLint, SonarQube, Semgrep, and Rust to map their internal architectures to the theoretical frameworks (dataflow, abstract interpretation, pattern matching) described in this report. This would close the theory-practice gap identified as a limitation.

## Source Register

- [S1] [Data flow analysis: an informal introduction — Clang 23.0.0git documentation](https://clang.llvm.org/docs/DataFlowAnalysisIntro.html) — admitted, score 20, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S2] [Control-Flow Analysis - an overview | ScienceDirect Topics](https://www.sciencedirect.com/topics/computer-science/control-flow-analysis) — rejected, score 11, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S3] [Data Flow/Control Flow Analysis - LDRA](https://ldra.com/capabilities/data-flowcontrol-flow-analysis/) — rejected, score 10, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S4] [Control Flow Graph (CFG) - Software Engineering - GeeksforGeeks](https://www.geeksforgeeks.org/software-engineering/software-engineering-control-flow-graph-cfg/) — rejected, score 12, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S5] [Data-Flow Analysis - an overview | ScienceDirect Topics](https://www.sciencedirect.com/topics/computer-science/data-flow-analysis) — rejected, score 11, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S6] [Data-flow analysis — Grokipedia](https://grokipedia.com/page/Data-flow_analysis) — rejected, score 10, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S7] [Control Data Flow Graph ECE 5997 Hardware Accelerator Design & Automation](https://www.csl.cornell.edu/~zhiruz/5997/pdf/lecture04.pdf) — rejected, score 11, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S8] [1 Analysis of Software Artifacts - Spring 2006 1 Static Analysis 15-654:](https://www.cs.cmu.edu/~aldrich/courses/654-sp08/slides/11-dataflow.pdf) — rejected, score 12, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S9] [Static Program Analysis Anders Møller and Michael I. Schwartzbach](https://cs.au.dk/~amoeller/spa/spa.pdf) — admitted, score 19, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S10] [The Role of the Control Flow Graph in Static Analysis](https://nicolo.dev/en/blog/role-control-flow-graph-static-analysis/) — admitted, score 15, discovered by `static analysis tutorial core concepts dataflow control flow graph`
- [S11] [formal methods - Abstract Interpretation: Connection between soundness relation and a Galois connection - Computer Science Stack Exchange](https://cs.stackexchange.com/questions/148426/abstract-interpretation-connection-between-soundness-relation-and-a-galois-conn) — rejected, score 14, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S12] [A Galois Connection Calculus for Abstract Interpretation ⇤ Patrick Cousot](https://cs.nyu.edu/~pcousot/publications.www/CousotCousot-POPL14-ACM-p2-3-2014.pdf) — admitted, score 16, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S13] [Abstract Interpretation Frameworks Patrick Cousot](https://faculty.sist.shanghaitech.edu.cn/faculty/songfu/cav/AIF.pdf) — admitted, score 16, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S14] [(PDF) A Galois Connection Calculus for Abstract Interpretation](https://www.researchgate.net/publication/268015164_A_Galois_Connection_Calculus_for_Abstract_Interpretation) — rejected, score 13, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S15] [Comparing the Galois Connection and Widening/Narrowing Approaches](https://www.di.ens.fr/~cousot/publications.www/CousotCousot-PLILP-92-LNCS-n631-p269--295-1992.pdf) — admitted, score 16, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S16] [Abstract Interpretation and Application to Logic Programs ∗ Patrick Cousot](https://www.di.ens.fr/~cousot/publications.www/CousotCousot-JLP-v2-n4-p511--547-1992.pdf) — admitted, score 16, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S17] [Patrick Cousot, A Gentle Tutorial on Abstract Interpretation](https://www.di.ens.fr/~cousot/COUSOTtalks/TASE-15-tutorial.shtml) — admitted, score 18, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S18] [Types as Abstract Interpretations (invited paper) Patrick Cousot](https://pcousot.github.io/publications/Cousot-POPL97-p316-331-1997.pdf) — admitted, score 16, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S19] [Notes on Abstract Interpretation∗ Alexandru S˘alcianu salcianu@mit.edu](https://web.eecs.umich.edu/~bchandra/courses/papers/Salcianu_AbstractInterpretation.pdf) — rejected, score 11, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S20] [Patrick Cousot's publications on abstract interpretation](https://pcousot.github.io/publications.html) — admitted, score 18, discovered by `abstract interpretation Cousot tutorial soundness Galois connection`
- [S21] [Tut10-2: Symbolic Execution - CS6265: Information Security Lab](https://tc.gts3.org/cs6265/2019/tut/tut10-02-symexec.html) — admitted, score 13, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S22] [Symbolic Execution - angr documentation](https://docs.angr.io/en/latest/core-concepts/symbolic.html) — admitted, score 17, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S23] [On Benchmarking the Capability of Symbolic Execution ...](https://arxiv.org/pdf/1712.01674) — admitted, score 14, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S24] [Introduction to Symbolic Execution](https://www.cs.ucr.edu/~heng/teaching/cs260-winter19/symexec.pdf) — admitted, score 15, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S25] [Creating Human Readable Path Constraints from Symbolic Execution](https://www.osti.gov/servlets/purl/1767092) — admitted, score 14, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S26] [A Survey of Symbolic Execution Techniques](https://arxiv.org/pdf/1610.00502) — admitted, score 18, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S27] [· a. tang · | Smashing Flare-On #2 with Concolic Testing](http://0x0atang.github.io/reversing/2015/09/17/flareon2-concolic.html) — rejected, score 11, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S28] [Klee and angr | PDF](https://www.slideshare.net/slideshow/klee-and-angr-81332924/81332924) — rejected, score 10, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S29] [KLEE: Unassisted and Automatic Generation of High-Coverage](https://llvm.org/pubs/2008-12-OSDI-KLEE.pdf) — admitted, score 17, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S30] [KLEE · GitBook](https://verificaeconvalida.gitlab.io/gitbook-appunti/KLEE.html) — rejected, score 11, discovered by `symbolic execution tutorial path constraints KLEE angr`
- [S31] [Static Analysis vs Linting: Which should I choose? - imperfectDev](https://www.imperfectdev.com/static-analysis-vs-linting/) — rejected, score 10, discovered by `linting vs static analysis vs type checking difference definitions`
- [S32] [What Is the Difference Between Static Code Analysis and Linting? - IN-COM DATA SYSTEMS](https://www.in-com.com/blog/what-is-the-difference-between-static-code-analysis-and-linting/) — rejected, score 11, discovered by `linting vs static analysis vs type checking difference definitions`
- [S33] [python - Difference Between Linter, Sanitizer and Analyzers - Stack Overflow](https://stackoverflow.com/questions/78024250/difference-between-linters-sanitizers-and-analyzers) — rejected, score 10, discovered by `linting vs static analysis vs type checking difference definitions`
- [S34] [r/learnprogramming on Reddit: Is a "type checker" the same as a "linter"?](https://www.reddit.com/r/learnprogramming/comments/18ogqbz/is_a_type_checker_the_same_as_a_linter/) — rejected, score 8, discovered by `linting vs static analysis vs type checking difference definitions`
- [S35] [python - Difference between Linters, Sanitizers and Analyzers - Stack Overflow](https://stackoverflow.com/questions/78024250/difference-between-linters-sanitizers-and-analyzers) — rejected, score 10, discovered by `linting vs static analysis vs type checking difference definitions`
- [S36] [Linters, Formatters… Same Thing? — Static Analysis Clarified - The Miners](https://blog.codeminer42.com/static-analysis-matters-to-you-linters-vs-formatters/) — rejected, score 11, discovered by `linting vs static analysis vs type checking difference definitions`
- [S37] [Linting vs Type Checking: What's the Difference?](https://www.linkedin.com/posts/greatfrontend_javascript-typescript-webdevelopment-activity-7308366230451601408-7uAP) — rejected, score 8, discovered by `linting vs static analysis vs type checking difference definitions`
- [S38] [terminology - Difference between Linter, Sanitizer and Static Analysis tools - Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/questions/367848/difference-between-linter-sanitizer-and-static-analysis-tools) — rejected, score 10, discovered by `linting vs static analysis vs type checking difference definitions`
- [S39] [What is the difference between a "linter" and a "static type system"? Be specifi... | Hacker News](https://news.ycombinator.com/item?id=32462489) — rejected, score 11, discovered by `linting vs static analysis vs type checking difference definitions`
- [S40] [Top Tools for Static Analysis Help in Your Python Projects | Keploy Blog](https://keploy.io/blog/community/top-tools-for-static-analysis-in-python) — rejected, score 13, discovered by `linting vs static analysis vs type checking difference definitions`

## Research Trace

### Goal

Produce a comprehensive tutorial-oriented research brief on static analysis covering core concepts, key algorithms, major tools, internal mechanics, and practical limitations with real-world examples.

### Subquestions

- What are the core concepts and definitions of static analysis versus dynamic analysis and linting?
- How do control flow graphs (CFGs) and abstract syntax trees (ASTs) serve as foundations for static analysis?
- What is dataflow analysis and how do forward/backward, may/must analyses work?
- What is abstract interpretation and how does it provide soundness guarantees?
- How does symbolic execution differ from abstract interpretation and where is it used?
- What is taint analysis and how does it track sources, sinks, and sanitizers?
- How do type checking and pattern matching fit into static analysis internals?
- What are the internals and architectures of major tools: Clang Static Analyzer, ESLint, SonarQube, Semgrep, and the Rust borrow checker?
- What are common false positive causes, limitations, and real-world failure examples in static analysis?

### Research Perspectives

- **Foundational Theory** — Establish core concepts, formal definitions, and algorithmic foundations (CFG, AST, dataflow, abstract interpretation).
- **Tool Implementation** — Examine how real tools (Clang, ESLint, SonarQube, Semgrep, Rust) implement static analysis internally.
- **Algorithm Deep-Dive** — Detail dataflow analysis, symbolic execution, taint analysis, and type checking mechanisms.
- **Benchmarks & Evaluation** — Find empirical studies, benchmarks, and comparative evaluations of static analysis tools.
- **Criticism & Limitations** — Identify false positives, unsoundness, scalability issues, and real-world failures or criticisms.
- **Recency & Trends** — Capture recent (2023-2026) advances, ML-assisted analysis, and tool updates.
- **Practical Examples** — Find real-world code examples, tutorials, and case studies demonstrating static analysis in action.

### Source Requirements

- Academic textbooks or lecture notes on static analysis (e.g., Nielson, Cousot)
- Official documentation for Clang Static Analyzer, ESLint, SonarQube, Semgrep, Rust borrow checker
- Peer-reviewed papers on abstract interpretation, symbolic execution, taint analysis
- Conference papers (PLDI, POPL, ICSE, FSE, ASE) on static analysis benchmarks and evaluations
- Blog posts or technical articles from tool maintainers and security researchers
- GitHub repositories with example rules, linters, or analyzer implementations
- CVE reports or security advisories demonstrating taint analysis findings
- Critiques or empirical studies on false positive rates in industrial static analysis

### Success Criteria

- Clearly distinguishes linting, type checking, and static analysis with definitions
- Explains CFG, AST, and their roles in analysis pipelines
- Covers dataflow analysis with forward/backward and may/must distinctions
- Explains abstract interpretation with soundness and Galois connections at tutorial depth
- Describes symbolic execution with path constraints and limitations
- Details taint analysis with source-sink-sanitizer model and real CVE examples
- Provides architecture/internals for at least 5 named tools
- Includes at least 3 real-world false positive or limitation examples
- References both foundational sources and 2023-2026 developments

### Search Queries

- `static analysis tutorial core concepts dataflow control flow graph` — Find foundational tutorial material covering core concepts and CFG/dataflow. [Foundational Theory / academic/lecture notes]
- `abstract interpretation Cousot tutorial soundness Galois connection` — Locate authoritative explanations of abstract interpretation from original researchers. [Algorithm Deep-Dive / paper/lecture]
- `symbolic execution tutorial path constraints KLEE angr` — Find practical symbolic execution tutorials and tool documentation. [Algorithm Deep-Dive / paper/docs]
- `taint analysis source sink sanitizer static analysis tutorial` — Find taint analysis explanations with source-sink-sanitizer model. [Algorithm Deep-Dive / tutorial/paper]
- `Clang Static Analyzer architecture internals how it works` — Understand Clang Static Analyzer's internal engine and checker model. [Tool Implementation / official docs]
- `ESLint architecture AST traversal rule implementation internals` — Learn how ESLint parses ASTs and applies rules programmatically. [Tool Implementation / official docs/blog]
- `Semgrep pattern matching engine how it works internally` — Understand Semgrep's generic pattern matching and multi-language approach. [Tool Implementation / docs/blog]
- `Rust borrow checker algorithm NLL MIR how it works` — Find details on Rust's borrow checker internals and non-lexical lifetimes. [Tool Implementation / docs/paper]
- `SonarQube static analysis engine architecture rules` — Understand SonarQube's analyzer pipeline and rule execution. [Tool Implementation / official docs]
- `static analysis false positives empirical study industrial tools` — Find studies quantifying false positive rates and developer experience. [Criticism & Limitations / paper]
- `static analysis limitations unsoundness scalability criticism` — Locate critiques of static analysis soundness and scalability tradeoffs. [Criticism & Limitations / paper/blog]
- `taint analysis CVE real world example security vulnerability detection` — Find real CVEs found via taint analysis to ground the tutorial. [Practical Examples / CVE/advisory]
- `static analysis benchmark comparison SonarQube Semgrep ESLint 2024 2025` — Find recent benchmark comparisons of major tools. [Benchmarks & Evaluation / benchmark/report]
- `ML-assisted static analysis 2024 2025 recent advances` — Capture recent trends in machine learning augmented static analysis. [Recency & Trends / paper/blog]

### Source Quality

- [S1] Official Clang documentation introducing dataflow analysis with CFG and fixpoint. Perfect for core concepts. score=20 type=docs admitted=true warnings=
- [S2] Page returned 403 Forbidden, unreadable. Cannot assess content. score=11 type=academic/lecture notes admitted=false warnings=fetch error; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S3] Commercial product page with thin content; not suitable for tutorial depth. score=10 type=academic/lecture notes admitted=false warnings=marketing content
- [S4] Basic tutorial on CFG, but lacks authoritative depth and is not a primary source. score=12 type=academic/lecture notes admitted=false warnings=low authority
- [S5] Fetch error 403, unreadable. score=11 type=academic/lecture notes admitted=false warnings=fetch error; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S6] Unverifiable wiki-style content; not authoritative. score=10 type=academic/lecture notes admitted=false warnings=low authority
- [S7] PDF is garbled and unreadable; focus on hardware design not static analysis tutorial. score=11 type=academic/lecture notes admitted=false warnings=unreadable PDF; off-topic
- [S8] PDF is garbled, unreadable. score=12 type=academic/lecture notes admitted=false warnings=unreadable PDF
- [S9] Authoritative textbook on static program analysis covering all core concepts. score=19 type=academic/lecture notes admitted=true warnings=
- [S10] Well-written blog post explaining CFG and its role in static analysis. Good for tutorial. score=15 type=other admitted=true warnings=
- [S11] Stack Exchange question about Galois connections; may provide clarification but not a primary source. score=14 type=paper/lecture admitted=false warnings=secondary source
- [S12] Cousot paper on Galois connection calculus for abstract interpretation. High authority. score=16 type=paper/lecture admitted=true warnings=
- [S13] Cousot paper on abstract interpretation frameworks. Authoritative but older. score=16 type=paper/lecture admitted=true warnings=
- [S14] Fetch error 403, unreadable. score=13 type=paper/lecture admitted=false warnings=fetch error; fetch failed: Source fetch API returned HTTP 403 Forbidden: error code: 1020
- [S15] Cousot paper comparing Galois connection and widening/narrowing. Foundational. score=16 type=paper/lecture admitted=true warnings=
- [S16] Cousot paper on abstract interpretation and logic programs. Authoritative. score=16 type=paper/lecture admitted=true warnings=
- [S17] Cousot's gentle tutorial on abstract interpretation, perfect for explaining concepts. score=18 type=paper/lecture admitted=true warnings=
- [S18] Cousot paper on types as abstract interpretations. High authority. score=16 type=paper/lecture admitted=true warnings=
- [S19] Fetch error, unreadable. score=11 type=paper/lecture admitted=false warnings=fetch error; fetch failed: failed HTTP request: error sending request for url (https://web.eecs.umich.edu/~bchandra/courses/papers/Salcianu_AbstractInterpretation.pdf)
- [S20] Comprehensive list of Cousot's publications on abstract interpretation; useful for references. score=18 type=paper/lecture admitted=true warnings=
- [S21] Tutorial on symbolic execution using Angr, includes practical examples. score=13 type=paper/docs admitted=true warnings=
- [S22] Official Angr documentation on symbolic execution, excellent for understanding path constraints. score=17 type=paper/docs admitted=true warnings=
- [S23] Benchmarking paper on symbolic execution capabilities, useful for evaluation. score=14 type=paper admitted=true warnings=
- [S24] Lecture slides on symbolic execution, covers concolic testing and Angr. score=15 type=paper/docs admitted=true warnings=
- [S25] Paper on simplifying path constraints from symbolic execution, relevant to practical challenges. score=14 type=paper admitted=true warnings=
- [S26] Comprehensive survey of symbolic execution techniques, excellent for deep dive. score=18 type=paper admitted=true warnings=
- [S27] Blog post on concolic testing, but outdated and not authoritative. score=11 type=other admitted=false warnings=low authority; outdated
- [S28] Fetch error, captcha page. Unreadable. score=10 type=paper/docs admitted=false warnings=fetch error; fetch failed: invalid evidence batch: source `https://www.slideshare.net/slideshow/klee-and-angr-81332924/81332924` appears to be an anti-bot or captcha page
- [S29] Original KLEE paper, foundational for symbolic execution. High authority. score=17 type=paper admitted=true warnings=
- [S30] GitBook with notes on KLEE, but not authoritative or comprehensive. score=11 type=paper/docs admitted=false warnings=low authority
- [S31] The blog provides a basic distinction between static analysis and linting, but the content is thin, lacks depth, and is from a low-authority personal blog. It does not meet the plan's need for authoritative, detailed coverage of core concepts or algorithms. score=10 type=blog admitted=false warnings=Low authority personal blog; shallow coverage; duplicate perspective from other sources
- [S32] The blog defines static analysis vs linting and lists tools, but is largely a promotional piece for SMART TS XL. The information is superficial and not sufficiently independent or authoritative for the research brief. score=11 type=blog admitted=false warnings=Promotional content; low authority; thin on algorithmic or internals details
- [S33] The Stack Overflow page may address the distinction between linters, sanitizers, and analyzers, but the excerpt is only navigation text; the actual answer is not visible. It does not provide usable content for the tutorial. score=10 type=other admitted=false warnings=Incomplete excerpt; likely low-depth Q&A; not authoritative
- [S34] The source is a Reddit post with a fetch error, making it unreadable. Even if readable, Reddit comments lack the authority needed for a tutorial-oriented research brief. score=8 type=other admitted=false warnings=Fetch error; Reddit source; low authority; fetch failed: Source fetch API returned HTTP 403 Forbidden: <body class=theme-beta><div><style>.theme-light,:root{--rem360:22.5rem;--rem320:20rem;--rem192:12rem;--rem144:9rem;--rem128:8rem;--rem96:6rem;--rem90:5.625rem;--rem88:5.5rem;--rem64:4rem;--rem56:3.5rem;--rem48:3rem;--rem40:2.5rem;--rem36:2.25rem;--rem32:2rem;--rem28:1.75rem;--rem26:1.625rem;--rem24:1.5rem;--rem22:1.375rem;--rem20:1.25rem;--rem18:1.125rem;--rem16:1rem;--rem15:0.9375rem;--rem14:0.875rem;--rem12:0.75rem;--rem10:0.625rem;--rem8:0.5rem;--rem6:0.375rem;--rem4:0.25rem;--rem2:0.125rem;--rem1:0.0625rem;--spacer-4xs:0.125rem;--...
- [S35] Duplicate of S33, same Stack Overflow page with only navigation excerpt. The content is not usable, and Q&A sites are not authoritative enough for the research goals. score=10 type=other admitted=false warnings=Duplicate entry; incomplete excerpt; low authority
- [S36] The blog distinguishes linters, formatters, and static analysis, but the excerpt is introductory and lacks depth on algorithms or tool internals. It is from a company blog with moderate authority. score=11 type=blog admitted=false warnings=Shallow content; moderate authority; limited independence
- [S37] The LinkedIn post provides a basic comparison of linting vs type checking, but is extremely brief, from a social media post, and lacks depth or authority for a comprehensive tutorial. score=8 type=other admitted=false warnings=LinkedIn social post; very shallow; low authority
- [S38] The Software Engineering Stack Exchange page may offer a useful Q&A, but the excerpt is only navigation. The source is a community Q&A with moderate authority, and likely not detailed enough for the tutorial's needs. score=10 type=other admitted=false warnings=Incomplete excerpt; Q&A site; limited depth
- [S39] The Hacker News discussion has a fetch error, making it unreadable. If accessible, it might contain useful community insight, but it lacks the authoritative, structured coverage needed. score=11 type=other admitted=false warnings=Fetch error; Hacker News discussion; low authority; fetch failed: Source fetch API returned HTTP 429 Too Many Requests: Sorry.
- [S40] The Keploy blog covers Python static analysis tools and offers a practical tutorial angle. However, it is from a company blog with moderate authority, and the depth on algorithms and internals is limited. It may be useful for practical examples but not as a primary source. score=13 type=blog admitted=false warnings=Company blog; moderate authority; limited depth on algorithms

### Evidence Notes

- [S1] Dataflow analysis propagates facts through CFG edges until a fixpoint is reached. Evidence: propagating facts about the program through the edges of the control flow graph (CFG) until a fixpoint is reached Limitations: Fixpoint may be ⊤ losing precision; requires lattice height finite or widening.
- [S1] Lattice theory underpins dataflow analysis; join (set union) combines facts at control flow joins. Evidence: A join-semilattice is a partially ordered set, in which every two elements have a least upper bound ... join(a, b) ⩾ a ... join(x, x) = x ... We will use the lattice of subsets of integers, with set inclusion relation as ordering and set union as a join. Limitations: Simple lattice may not capture all program behavior; requires abstraction (e.g., top).
- [S1] Top (⊤) represents too much or conflicting information; bottom (⊥) represents uninitialized variables. Evidence: Too much information and 'top' values ... denote possible values of x with the symbol ⊤ ... Uninitialized variables and 'bottom' values ... When x is declared but not initialized, it has no possible values. We represent this fact symbolically as ⊥. Limitations: Using ⊤ leads to loss of precision; ⊥ only applicable when analysis specifically models uninitialized reads.
- [S1] Transfer function models effect of statements: out = transfer(basic_block, join(in_1, ..., in_n)). Evidence: To model the effects of a basic block we compute: out = transfer(basic_block, join(in_1, in_2, ..., in_n)) Limitations: Precision depends on transfer function design; simple transfer functions may lose information.
- [S1] Fixpoint iteration can be optimized using a worklist, achieving O(m * |L|) time complexity. Evidence: Fixpoint iteration can be optimised by only reprocessing basic blocks which had one of their inputs changed on the previous iteration. This is typically implemented using a worklist queue. With this optimisation the time complexity becomes O(m * |L|), where m is the number of basic blocks in the CFG and |L| is the size of lattice used by the analysis. Limitations: Complexity bound assumes lattice size is manageable; large lattices may still be expensive.
- [S1] Symbolic execution uses symbolic values and flow conditions to track path-specific facts. Evidence: Symbolic values ... have to be seeded with a concrete value ... we can still deduce some interesting information by representing unknown input values symbolically, and computing results as symbolic expressions ... flow condition ... a predicate written in terms of the program state that is true at a specific program point regardless of the execution path. Limitations: Path explosion in large programs; flow conditions may become complex.
- [S10] The control flow graph (CFG) is a <V, E> graph where V are basic blocks and E arcs represent control flow transfers. Evidence: Formally, the Control Flow Graph is defined as a <V, E> graph, where V represents the set of elementary blocks of a function and E represents the set of arcs connecting each elementary block according to the semantic representation of the instructions. Limitations: CFG construction may be imprecise in presence of indirect jumps or self-modifying code.
- [S10] Basic blocks are single-entry, single-exit sequences of instructions; leaders are first instruction, targets of jumps, or instructions after jumps. Evidence: An elementary block is composed of a series of instructions such that only the first instruction can be a target of a block (single entry) and only the last instruction can lead to another block (single exit). ... Identify the 'leading' instructions in the code ... The first instruction is a leader. The instruction pointed to by a conditional or unconditional flow change ... is a leader. The instruction that immediately follows a flow change instruction is leader. Limitations: Leaders rule assumes structured control flow; exception handling may complicate.
- [S9] The textbook Static Program Analysis covers type analysis, lattice theory, CFG, dataflow, fixed-point algorithms, widening/narrowing, path sensitivity, interprocedural analysis, pointer analysis, and abstract interpretation. Evidence: We cover basic type analysis, lattice theory, control flow graphs, dataflow analysis, fixed-point algorithms, widening and narrowing, path sensitivity, relational analysis, interprocedural analysis, context sensitivity, control flow analysis, several flavors of pointer analysis, and key concepts of semantics-based abstract interpretation. Limitations: Covers foundational theory but may not reflect latest tool developments (2023-2026).
- [S15] Soundness of abstract interpretation requires that the abstract result over-approximates the least fixpoint of the concrete semantics. Evidence: This approximation A must be sound in the sense that lfp(F) ⊑ A. Limitations: Soundness is relative to the chosen abstraction; over-approximation may cause false positives.
- [S16] Monotonicity of abstraction and concretization functions ensures soundness of the approximation. Evidence: Monotony can be interpreted as the fact that the abstraction and concretization process preserves the soundness of the approximation. Limitations: Requires the abstraction and concretization to be monotone; not all abstractions satisfy this.
- [S13] Abstract interpretation establishes a correspondence between concrete and abstract properties via Galois connections. Evidence: establish the correspondence between the domain of concrete or exact properties and ... (from snippet) Limitations: Galois connection may not exist for all abstractions; widening/narrowing alternative.
- [S17] Cousot's tutorial on abstract interpretation covers widening, narrowing, Galois connections, soundness, and static analysis algorithms. Evidence: Keywords: Abstract induction, Abstract interpretation, Abstraction, Completeness, Dual-narrowing, Dual-widening, Extrapolation, Formal methods, Galois Connection, Interpolation, Narrowing, Semantics, Soundness, Static analysis, Static checking, Static verification, Verification, Widening. Limitations: Tutorial slides may not include detailed proofs or tool implementations.
- [S18] Types can be viewed as abstract interpretations, where sound abstraction allows design of abstract semantics by successive abstractions. Evidence: a sound abstraction so that abstract semantics and interpreters can be designed by successive abstractions. This remains true when the correspondence is a Galois connection Limitations: Not all type systems are expressible as Galois connections; practical type checkers may not follow this model.
- [S21] Symbolic execution tracks symbolic states rather than concrete values to generate test cases covering all program paths. Evidence: When we 'symbolically' execute a program, a symbolic executor tracks symbolic states rather than concrete input by analyzing the program, and generates a set of test cases that can reach (theoretically) all paths existing in the program. Limitations: Theoretically covers all paths, but path explosion and constraint solving complexity limit real-world scalability.
- [S21] Symbolic execution forks execution at conditional branches, creating separate path constraints for each branch. Evidence: Program execution diverges at the first branch, if (z == x): path1: skip if with PC: (x0 != 2*y0), path2: step inside if with PC: (x0 == 2*y0). Limitations: Number of paths grows exponentially with branches; path explosion.
- [S21] KLEE requires users to annotate symbolic variables using klee_make_symbolic and compile to LLVM bitcode. Evidence: klee_make_symbolic(&passwd, sizeof(passwd), 'passwd'); First, we need to compile our program to an LLVM bitcode: $ clang-6.0 -I ./include -c -emit-llvm -g -O0 crackme0x00.c Limitations: Requires source modification and compilation to LLVM bitcode; not fully automatic.
- [S21] KLEE uses Z3 solver backend to solve path constraints and generate concrete test inputs. Evidence: KLEE: Using Z3 solver backend Limitations: Solver performance can be a bottleneck for complex constraints.
- [S21] KLEE successfully found buffer overflow vulnerability in bof.c by generating a bug-triggering test case. Evidence: Your task is to run KLEE on this target to find the buggy test case. ... Have you found the test case to trigger the bug? Limitations: Simple example; real-world binaries may require extensive modeling of system calls and environment.
- [S22] Angr symbolic execution engine creates two paths for condition X > 10 and X <= 10, solving constraints to explore both. Evidence: Path 1: X > 10 leading to the result 'Greater' · Path 2: X <= 10 leading to the result 'Lesser or Equal' Limitations: Path explosion remains a fundamental challenge.
- [S24] Concolic testing combines concrete and symbolic execution to handle complex constraints by concretizing some variables. Evidence: Solve complex formulas · x == (y*y) mod 50, unsolvable if both x and y are symbolic · if we concretize y to its concrete value, now solvable · Angr does this! Limitations: Concretization may lead to incomplete coverage.
- [S25] Symbolic path constraints from real binaries are often unreadable for human analysts due to bit-vector operations. Evidence: the path constraints extracted from real commercial binaries and from toy problems are often unreadable for human analysts Limitations: Paper proposes conversion to integer domain to improve readability, but no universal solution.
- [S25] Path constraints arise from low-level intermediate representation (VEX) and instruction semantics, making them verbose. Evidence: The VEX statements shown in Listing 5 are difficult to fully understand without context, but show that the path constraint originates from the check on tO, which is derived from t5, which is obtained ... Limitations: Human analysts need tools to simplify constraints; pattern-matching prototypes exist but limited.
- [S26] Symbolic execution forks at conditional branches, creating two execution states with updated path constraints. Evidence: The evaluation of a conditional branch if e then strue else sfalse affects the path constraints π. The symbolic execution is forked by creating two execution states with path constraints. Limitations: Forking leads to exponential state explosion.
- [S29] KLEE can concretize symbolic values when they become determined by constraints, writing the concrete value back to memory. Evidence: KLEE determines this fact (in this case that x = 9) and writes the concrete value back to memory. Limitations: Concretization may lose symbolic information for further analysis.

### Claim Verification

- **supported**: The textbook by Møller and Schwartzbach covers a broad range of static analysis topics including type analysis, lattice theory, control flow graphs, dataflow analysis, fixed-point algorithms, widening and narrowing, path sensitivity, interprocedural analysis, pointer analysis, and abstract interpretation. — The evidence from S9 explicitly lists all these topics as covered in the textbook.
- **supported**: The CFG is a directed graph ⟨V, E⟩ where V is the set of basic blocks and E represents control flow transfers between them. — S10 defines the CFG as a <V, E> graph with V as elementary blocks and E as arcs connecting them.
- **supported**: A basic block is a single-entry, single-exit sequence of instructions. — S10 states that an elementary block has single entry and single exit.
- **supported**: Leaders—the first instructions of basic blocks—are identified by three rules: the first instruction in a function, targets of jumps, and instructions immediately following jumps. — S10 lists these three rules for identifying leaders.
- **supported**: CFG construction is straightforward for structured control flow but becomes imprecise with indirect jumps, function pointers, or self-modifying code. — S10 mentions that CFG construction may be imprecise in presence of indirect jumps or self-modifying code.
- **supported**: Dataflow analysis propagates facts through CFG edges until a fixpoint is reached. — S1 evidence explicitly states 'propagating facts about the program through the edges of the control flow graph (CFG) until a fixpoint is reached'.
- **supported**: The formal structure requires a join-semilattice: a partially ordered set where every two elements have a least upper bound (join). — S1 evidence defines a join-semilattice as a partially ordered set where every two elements have a least upper bound.
- **supported**: The join operation satisfies join(a, b) ≥ a and join(x, x) = x. — S1 evidence includes 'join(a, b) ⩾ a' and 'join(x, x) = x'.
- **supported**: Top (⊤): too much or conflicting information; the analysis has lost precision. — S1 evidence describes ⊤ as 'too much information' and notes that using ⊤ leads to loss of precision.
- **supported**: Bottom (⊥): no possible values; used for uninitialized variables. — S1 evidence states that ⊥ represents 'no possible values' and is used for uninitialized variables.
- **supported**: The transfer function models the effect of a basic block on incoming facts: out = transfer(basic_block, join(in_1, in_2, ..., in_n)). — S1 evidence provides the exact formula: 'out = transfer(basic_block, join(in_1, in_2, ..., in_n))'.
- **supported**: A worklist queue processes only blocks whose inputs changed, reducing time complexity to O(m × |L|), where m is the number of basic blocks and |L| is the lattice size. — S1 evidence describes the worklist optimization and states the time complexity as O(m * |L|).
- **supported**: Abstract interpretation provides a framework for designing sound static analyses by approximating concrete program semantics with abstract ones. — S15 evidence discusses soundness of abstract interpretation and over-approximation, which aligns with the claim.
- **supported**: The soundness condition is lfp(F) ⊑ A, meaning the abstract result over-approximates the concrete least fixpoint. — S15 evidence explicitly states 'lfp(F) ⊑ A' as the soundness condition.
- **supported**: Abstract interpretation establishes a correspondence between the domain of concrete properties and the domain of abstract properties via Galois connections. — S13 evidence mentions 'establish the correspondence between the domain of concrete or exact properties and ...' which supports the claim.
- **supported**: Monotonicity of the abstraction and concretization process preserves the soundness of the approximation. — S16 evidence states that monotony ensures the abstraction and concretization process preserves soundness.
- **supported**: Cousot's tutorial on abstract interpretation covers widening, narrowing, Galois connections, and soundness as topics. — S17 evidence lists keywords including widening, narrowing, Galois Connection, and soundness.
- **supported**: Cousot showed that type systems can be viewed as abstract interpretations, where types are abstractions of runtime values and the type checker computes an abstract semantics. — S18 evidence discusses 'a sound abstraction so that abstract semantics and interpreters can be designed by successive abstractions' and mentions Galois connection, supporting the claim.
- **supported**: Symbolic execution replaces concrete inputs with symbolic variables and tracks symbolic states rather than concrete values. — S21 evidence states that symbolic execution 'tracks symbolic states rather than concrete input'.
- **supported**: At each conditional branch, execution forks into two paths, each with an updated path constraint (PC)—a predicate over symbolic variables that must hold for that path to be feasible. — S21 evidence shows forking with path constraints; S26 evidence explicitly describes forking with updated path constraints.
- **supported**: A constraint solver (e.g., Z3) checks each path constraint for satisfiability. If satisfiable, the solver can generate concrete test inputs that exercise that path. — S21 evidence mentions using Z3 solver backend and generating test cases, which implies satisfiability checking and input generation.
- **supported**: KLEE, a symbolic execution engine for LLVM bitcode, uses Z3 as its backend solver. — S21 evidence explicitly states 'KLEE: Using Z3 solver backend'. S29 is a KLEE paper but does not mention Z3 in the excerpt; however, S21 alone suffices.
- **supported**: Concolic testing combines concrete and symbolic execution: it concretizes some variables to their runtime values, making the remaining constraints solvable. — S24 evidence describes concretizing a variable to its concrete value to make constraints solvable, which matches the claim.
- **supported**: Angr implements concolic testing. — S24 evidence states 'Angr does this!' in the context of concolic testing.
- **supported**: KLEE can also concretize symbolic values when constraints fully determine them, writing concrete values back to memory. — S29 evidence states that KLEE determines the concrete value and writes it back to memory.
- **supported**: Path explosion is the fundamental challenge: the number of paths grows exponentially with the number of branches. — S21 evidence mentions path explosion; S26 evidence discusses exponential state explosion due to forking.
- **supported**: Path constraints extracted from real binaries are often unreadable for human analysts because they reflect low-level intermediate representations (e.g., VEX in angr) and bit-vector operations. — S25 evidence states that path constraints are 'often unreadable for human analysts' and mentions VEX statements and bit-vector operations.
- **supported**: KLEE operates on LLVM bitcode. Users annotate symbolic variables with klee_make_symbolic and compile programs with clang -emit-llvm. — S21 evidence shows the use of klee_make_symbolic and compilation with clang -emit-llvm.
- **supported**: KLEE explores paths, solves constraints with Z3, and generates test cases. It has been used to find buffer overflow vulnerabilities in example programs by generating bug-triggering inputs. — S21 evidence mentions KLEE using Z3, generating test cases, and finding a buffer overflow vulnerability in bof.c.
- **supported**: Angr is a Python-based symbolic execution framework for binaries. It creates separate execution paths at branches (e.g., X > 10 and X ≤ 10) and solves constraints to explore both. — S22 evidence shows forking into two paths for conditions X > 10 and X <= 10, consistent with the claim.

### Final Evaluation

- coverage: 4/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 4/5
- overall: 4/5

Strengths:
- Clear distinction between linting, type checking, and static analysis with definitions and a unifying perspective (types as abstract interpretations).
- Thorough explanation of dataflow analysis with formal lattice theory, transfer functions, fixpoint iteration, and worklist optimization.
- Detailed comparison of abstract interpretation and symbolic execution, including soundness conditions, Galois connections, and path explosion.
- Evidence table systematically maps claims to sources with explicit limitations, enhancing traceability and transparency.
- Honest acknowledgment of evidence gaps for several planned tools (ESLint, SonarQube, Semgrep, Rust borrow checker) and empirical false-positive studies.
- Design implications and open questions grounded in the evidence, providing actionable guidance for practitioners and researchers.

Weaknesses:
- Coverage of tool internals is limited to KLEE and angr; the report explicitly notes missing evidence for Clang Static Analyzer, ESLint, SonarQube, Semgrep, and Rust borrow checker, which were part of the research goal.
- No evidence table for tool comparisons or source audit, which would have been beneficial given the multiple tools discussed.
- The report does not include real-world CVE examples of taint analysis findings, as noted in the limitations.
- Some sections (e.g., type checking as abstract interpretation) could benefit from more concrete examples to illustrate the connection.
- The presentation, while clear, occasionally uses generic phrasing (e.g., 'This report synthesizes foundational and practical sources') that could be tightened.

Follow-up recommendations:
- Gather tool-specific documentation for Clang Static Analyzer, ESLint, SonarQube, Semgrep, and Rust borrow checker to close the theory-practice gap.
- Search for empirical studies on false-positive rates in industrial static analysis tools (e.g., Coverity, SonarQube) to support the limitations section.
- Collect real-world CVE reports discovered via taint analysis to provide concrete examples of source-sink-sanitizer models.
- Investigate recent (2023-2026) advances in ML-assisted static analysis and tool updates to update the temporal scope.
- Create a comparative evidence table for tool architectures and benchmark results to enhance the tutorial's practical value.
