---
title: "Abstract interpretation and symbolic execution in static analysis: Clang Static Analyzer, Infer, KLEE, CBMC, soundness versus usability"
generated_at: 2026-06-29T21:19:11.823172+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Abstract Interpretation and Symbolic Execution in Static Analysis: A Comparative Study of Clang Static Analyzer, Infer, KLEE, and CBMC

## Abstract

Static analysis tools for C/C++ rely on two foundational techniques—abstract interpretation and symbolic execution—that make different trade-offs between precision and scalability [S4]. This report examines how Clang Static Analyzer (CSA), Infer, KLEE, and CBMC instantiate these techniques, and characterizes the tension between soundness and usability in practice. Drawing on official documentation, a recent scaling study, and an artifact combining CSA with KLEE, we find that path-sensitive symbolic execution tools like CSA reduce false positives but face state-space explosion [S4], while abstract interpretation–based tools prioritize scalability at the cost of precision and occasional infeasible traces [S4], [S2]. We document specific failure modes, including non-determinism in KLEE [S2], infeasible traces in Infer [S2], and the difficulty of finding real-world bugs with CSA and Infer on mature codebases [S2]. We conclude with operational guidance for CI/CD integration and recommend experiments to close remaining evidence gaps.

## Research Question

How are abstract interpretation and symbolic execution implemented in modern static analysis tools (CSA, Infer, KLEE, CBMC), and what trade-offs between soundness and usability arise in practice?

## Method

We synthesize evidence from three admitted sources: official CSA documentation [S3], a 2024 arXiv paper on scaling symbolic execution and CSA to large software systems [S4], and an artifact from a study combining CSA and Infer traces with KLEE dynamic symbolic execution [S2]. We compare tool architectures, soundness properties, benchmark behavior, and documented failure modes. Where the evidence is thin—particularly for CBMC and for post-2023 developments—we state the gaps explicitly rather than extrapolate.

## Conceptual Background

Static analysis attempts to reason about program behavior without executing the program concretely. Because Rice's theorem establishes that any non-trivial semantic property of programs is undecidable, tools must approximate [S4]. Two main approximation strategies dominate.

**Abstract interpretation** over-approximates program behavior by reasoning about every possible execution using abstract domains—signs, intervals, octagons, or polyhedra—that compactly represent sets of concrete values. Propagation between basic blocks uses fixed-point iteration to ensure convergence [S4]. The result is a sound analysis in principle: if no error is reported in the abstract domain, no error exists in any concrete execution. The cost is false positives, because the abstract domain may not distinguish feasible from infeasible paths [S4].

**Symbolic execution** introduces symbols for unknown values (e.g., user inputs) and explores execution paths by computing path constraints, which are discharged with SMT solvers [S4]. Path-sensitive symbolic execution prunes infeasible paths, reducing false positives, but risks combinatorial explosion of states [S4]. Symbolic execution is both an over-approximation (symbolic states lose information) and an under-approximation (not all paths are explored) [S4].

| Term | Definition | Implication for Soundness |
|---|---|---|
| Abstract interpretation | Over-approximates all executions via abstract domains and fixed-point iteration [S4] | Sound for reported absence of errors; may produce false positives [S4] |
| Symbolic execution | Explores paths with symbolic variables and SMT-solved path constraints [S4] | Precise on explored paths; may miss unexplored paths (false negatives) [S4] |
| Path-sensitive analysis | Tracks constraints per path, prunes infeasible paths [S4] | Reduces false positives; risks state explosion [S4] |
| Flow-sensitive analysis | Considers CFG ordering but not path feasibility [S4] | Assumes all CFG walks feasible; many false positives [S4] |
| Soundness | If tool reports no error, no error exists [S4] | Verification-oriented; high false positive cost [S4] |
| Completeness | If tool reports an error, a real error exists [S4] | Bug-finding-oriented; may miss real errors [S4] |

The soundness-usability trade-off is direct: verification tools aim to catch all errors at the cost of many false positives, while industrial bug-finding tools aim for low false positive rates at the cost of missing true errors [S4]. An overwhelming number of false warnings causes developers to lose trust and stop using a tool [S4].

## Findings

### Tool Architectures and Primary Techniques

| Tool | Primary Technique | Path Sensitivity | Inter-procedural | Source |
|---|---|---|---|---|
| Clang Static Analyzer | Symbolic execution | Yes | Yes | [S3] |
| Infer | Not described in sources | Not confirmed from sources | Not confirmed from sources | [S2] |
| KLEE | Dynamic symbolic execution (DSE) [S2] | Not confirmed from sources | Not confirmed from sources | [S2] |
| CBMC | *Not covered by admitted sources* | — | — | — |

CSA implements path-sensitive, inter-procedural analysis based on symbolic execution [S3]. It uses path constraints and SMT solvers to prune infeasible paths, which reduces false positives but can cause combinatorial explosion of states [S4]. The upstream version does not support statistical analysis [S4].

Infer is used as a static analysis tool in the artifact [S2], where it is compared alongside CSA. The admitted sources document Infer's behavior empirically—including infeasible traces—but do not provide a detailed description of Infer's internal architecture or its specific abstract domains. General properties of abstract interpretation described in [S4]—such as over-approximation of all paths and flow-sensitive analysis assuming every CFG walk is feasible—apply to the technique broadly, but the sources do not confirm that Infer specifically follows these patterns.

KLEE is used as a dynamic symbolic execution (DSE) engine in the artifact [S2], which aims to guide it along static analysis traces to confirm true positives. The admitted sources do not describe KLEE's internal architecture, path sensitivity, or inter-procedural capabilities in detail. CBMC's architecture and recent performance are not covered by the admitted sources; this is a gap.

### Soundness Guarantees and Approximations

| Tool | Soundness Stance | Known Approximation | Evidence |
|---|---|---|---|
| CSA | Bug-finding; not sound | Path explosion limits coverage; no statistical analysis upstream | [S3], [S4] |
| Infer | Not characterized in sources | Infeasible traces observed | [S2] |
| KLEE | Not characterized in sources | Non-determinism between runs | [S2] |
| CBMC | *Not in admitted sources* | — | — |

Infer sometimes generates infeasible traces. In one documented example, Infer's trace iterates a loop twice and then claims `x % 2 == 0` is false, even though `x` is even—a direct contradiction [S2]. This indicates that Infer can produce traces that do not correspond to any real execution, undermining the trustworthiness of individual bug reports.

KLEE exhibits non-determinism: statistics may vary slightly between runs [S2]. This has direct implications for reproducibility in CI/CD pipelines, where flaky analysis results erode developer confidence.

### Benchmark and Empirical Evidence

The artifact in [S2] uses KLEE (git commit `#04f5031c`), CSA 11.0.1, Infer 1.0.0, Z3 4.8.8, on Ubuntu 18.04. Benchmarks are drawn from GNU Coreutils 8.31: `comm`, `csplit`, `cut`, `env`, `join`, `ln`, `nl`, `od`, `split`, `uniq` [S2].

A striking finding: the researchers struggled to find real-world bugs with CSA and Infer on these mature codebases and resorted to injecting artificial bugs for evaluation [S2]. This suggests that on well-tested, mature C code, both CSA and Infer have low true-positive yields, though the study's scope is limited to ten Coreutils programs.

The study also attempted to combine CSA and KLEE: static analysis traces from CSA guide KLEE's dynamic symbolic execution to confirm true positives [S2]. However, the instrumentation tools are research prototypes: "after our initial negative results we did not develop them further to standalone tools. Expect them to fail whenever the use-case differs from our evaluation" [S2].

The 2024 scaling paper [S4] focuses on achieving end-to-end scalability for CSA and CodeChecker, covering run time, memory, bug presentation, automatic false positive suppression, incremental analysis, pattern discovery, and CI integration. This indicates active engineering effort to make CSA usable at scale.

### Documented Failure Modes

| Tool | Failure Mode | Evidence | Recency |
|---|---|---|---|
| CSA | Low true-positive rate on mature code; no statistical analysis upstream | [S2], [S4] | 2022–2024 |
| Infer | Infeasible traces with logical contradictions in loop reasoning | [S2] | 2022 (Infer 1.0.0) |
| KLEE | Non-deterministic results between runs; research-grade integration fragility | [S2] | 2022 |
| CBMC | *Not documented in admitted sources* | — | — |

Insight: The infeasible-trace problem in Infer is particularly concerning because it means a developer reviewing a bug report cannot assume the trace is executable. This shifts the burden of validation entirely to the human reviewer, which is the opposite of what a sound analysis should provide.

Insight: KLEE's non-determinism has implications for CI/CD contexts, where KLEE results may need to be treated as probabilistic rather than deterministic, complicating gating decisions.

## Design Implications

### For Tool Selection

| Criterion | CSA | Infer | KLEE | CBMC |
|---|---|---|---|---|
| False positive rate | Moderate (path-sensitive pruning) [S4] | Not quantified in sources | Not quantified in sources | *Not in admitted sources* |
| Scalability to large codebases | Active work on scaling [S4] | Not assessed in sources | Not assessed in sources | *Not in admitted sources* |
| CI/CD suitability | Supported via CodeChecker; incremental analysis [S4] | Not assessed in sources | Challenging (non-determinism) [S2] | *Not in admitted sources* |
| Reproducibility | Not assessed in sources | Not assessed in sources | Non-deterministic [S2] | *Not in admitted sources* |
| Maturity of integration tooling | Production (CodeChecker) [S4] | Not assessed in sources | Research-grade [S2] | *Not in admitted sources* |

### For CI/CD Integration

The 2024 scaling paper [S4] identifies several requirements for end-to-end scalability of CSA in CI: run time and memory control, automatic false positive suppression, incremental analysis, and pattern discovery in results. These map directly to practical CI/CD needs:

1. **Incremental analysis** is essential for large codebases. Full re-analysis per commit is infeasible; tools must analyze changed code and propagate results inter-procedurally [S4].
2. **False positive suppression** must be automated. Developers will not review hundreds of warnings manually [S4].
3. **Reproducibility** matters for gating. KLEE's non-determinism [S2] makes it unsuitable as a hard CI gate without additional stabilization.
4. **Diff-based reporting** aligns with code review workflows. CSA requires CodeChecker or similar infrastructure [S4].

Insight: The soundness-usability trade-off in CI/CD is not just about false positive rates. It is about whether the tool's output is stable enough to gate merges. A tool that produces different results on re-runs (KLEE) or infeasible traces (Infer) is operationally unsound from a developer's perspective.

## Limitations and Threats to Validity

**Source coverage gaps.** The admitted sources provide no direct evidence on CBMC's architecture, soundness properties, or recent benchmark performance. Claims about CBMC in the tables above are marked as not covered and should be treated as gaps, not findings. The sources also do not describe Infer's internal architecture (e.g., specific abstract domains, separation logic, or bi-abduction); general properties of abstract interpretation from [S4] should not be assumed to apply to Infer without confirmation. The sources do not describe KLEE's internal architecture, path sensitivity, or inter-procedural capabilities; KLEE is identified only as a DSE engine used in the artifact [S2].

**Stale version information.** The artifact [S2] uses CSA 11.0.1 and Infer 1.0.0 from 2022. Current versions (as of mid-2026) may have addressed the documented issues. The infeasible-trace problem in Infer and the low true-positive rate for CSA may not persist.

**Limited benchmark scope.** The Coreutils benchmark covers ten small-to-medium C programs [S2]. Results may not generalize to large C++ codebases, kernel code, or embedded systems.

**Vendor and researcher bias.** The CSA documentation [S3] is official and naturally emphasizes capabilities. The scaling paper [S4] is authored by researchers invested in CSA and CodeChecker. The artifact [S2] reports negative results honestly, which strengthens its credibility, but the artificial bug injection limits ecological validity.

**No SV-COMP data.** The plan called for SV-COMP 2024–2025 results, but the admitted sources do not include them. Comparative benchmark performance across all four tools cannot be established from the evidence.

## Open Questions

1. Has Infer's infeasible-trace problem been resolved in versions after 1.0.0? The evidence is from 2022 [S2].
2. What are CBMC's current soundness guarantees, unrolling heuristics, and performance on SV-COMP 2024–2025? The admitted sources are silent.
3. What is Infer's internal architecture—does it use separation logic, bi-abduction, or specific abstract domains? The admitted sources do not describe this.
4. Does Infer over-approximate program behavior by assuming all paths are feasible, as general abstract interpretation does [S4]? The sources do not confirm this for Infer specifically.
5. What are KLEE's internal architecture details—path sensitivity, inter-procedural capabilities, and concrete/symbolic execution interleaving? S2 identifies KLEE as a DSE engine but does not describe its internals.
6. How do CSA and Infer compare on false positive rates and true positive rates on large industrial C++ codebases (not Coreutils)? No such benchmark is in the evidence.
7. Can KLEE's non-determinism be eliminated through configuration (e.g., deterministic scheduler, fixed solver seeds)? The artifact notes non-determinism but does not explore mitigations [S2].
8. Does the CSA scaling work [S4] translate to measurable reductions in false positive rates in production CI, or does it primarily improve runtime?
9. Does the 2024 scaling paper [S4] provide comparative benchmarks against Infer, KLEE, or CBMC? The evidence does not confirm either way.

## Recommended Next Experiments

| Experiment | Objective | Tools | Expected Outcome |
|---|---|---|---|
| Reproduce Infer infeasible-trace test on Infer 1.2+ | Check if the loop contradiction persists | Infer | Confirm or refute whether the bug is fixed |
| Run CSA and Infer on a large C++ codebase (e.g., LLVM, Chromium) | Measure true/false positive rates beyond Coreutils | CSA, Infer | Generalize or refute the low-yield finding from [S2] |
| KLEE determinism study | Quantify run-to-run variance under different scheduler and solver configurations | KLEE | Identify whether deterministic mode is feasible for CI gating |
| SV-COMP 2025 extraction for CBMC and KLEE | Obtain current benchmark numbers | CBMC, KLEE | Fill the benchmark gap for comparative evaluation |
| CSA + CodeChecker CI integration study | Measure incremental analysis speedup and false positive suppression effectiveness in a real CI pipeline | CSA, CodeChecker | Validate the scalability claims in [S4] operationally |

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| CSA uses path-sensitive symbolic execution | Official documentation states it implements path-sensitive, inter-procedural analysis based on symbolic execution | [S3] | Does not discuss approximations |
| Symbolic execution is both over- and under-approximation | "symbolic execution is both an over-approximation... and under-approximation" | [S4] | Quote truncated |
| Abstract interpretation over-approximates all paths | "we over-approximate the behavior... and reason about every possible execution" | [S4] | General technique; not attributed to Infer specifically |
| Verification tools trade false positives for completeness; bug-finders trade false negatives for usability | "verification tools aim to catch all errors... industrial bug-finding tools aim to have a low false positive rate" | [S4] | General; no per-tool quantification |
| Infer generates infeasible traces with contradictions | Trace claims `x % 2 == 0` is false when x is even | [S2] | Infer 1.0.0 (2022); may be fixed |
| CSA and Infer struggled to find real bugs on Coreutils | "we struggled to find real-world bugs with CSA and Infer and decided to inject artificial bugs" | [S2] | Limited to 10 Coreutils programs |
| KLEE results are non-deterministic | "there is non-determinism in KLEE and the numbers above might vary slightly" | [S2] | Single experiment; mitigation unexplored |
| KLEE is used as a DSE engine in the artifact | Paper aims to "confirm true positive reports from off-the-shelf static analysers (SA) with dynamic symbolic execution (DSE)" | [S2] | Does not describe KLEE's internal architecture |
| CSA upstream lacks statistical analysis | "The upstream version of the Clang Static Analyzer does not support statistical analysis" | [S4] | Quote truncated; context unclear |
| CSA scaling work addresses CI integration | Paper covers runtime, memory, FP suppression, incremental analysis, CI usage | [S4] | CSA/CodeChecker only |
| Path-sensitive analysis risks state explosion | "can also result in a combinatorial explosion of states" | [S4] | General; not quantified per tool |
| Flow-sensitive analysis assumes all CFG walks feasible | "assumes that every possible walk over the CFG is a feasible path" | [S4] | General technique; not attributed to Infer |

## Source Register

- [S1] [Directed Symbolic Execution Tool Based on Clang Static Analyzer: Efficient and Accurate Verification of Static Analysis Results | Springer Nature Link](https://link.springer.com/content/pdf/10.1007/978-981-96-4506-0_1.pdf) — rejected, score 13, discovered by `Clang Static Analyzer Infer KLEE CBMC abstract interpretation symbolic execution comparison`
- [S2] [Artefact for Combining Static Analysis Error Traces with Dynamic Symbolic Execution (Experience Paper) -Software Reliability Group](https://srg.doc.ic.ac.uk/projects/klee-sa/artifact.html) — admitted, score 15, discovered by `Clang Static Analyzer Infer KLEE CBMC abstract interpretation symbolic execution comparison`
- [S3] [Clang Static Analyzer — Clang 23.0.0git documentation](https://clang.llvm.org/docs/ClangStaticAnalyzer.html) — admitted, score 19, discovered by `Clang Static Analyzer Infer KLEE CBMC abstract interpretation symbolic execution comparison`
- [S4] [Scaling Symbolic Execution to Large Software Systems](https://arxiv.org/html/2408.01909v1) — admitted, score 18, discovered by `Clang Static Analyzer Infer KLEE CBMC abstract interpretation symbolic execution comparison`
- [S5] [cybersecurity-sast/static-analysis-tools.md at main · paulveillard/cybersecurity-sast](https://github.com/paulveillard/cybersecurity-sast/blob/main/static-analysis-tools.md) — rejected, score 2, discovered by `Clang Static Analyzer Infer KLEE CBMC abstract interpretation symbolic execution comparison`
- [S6] [It's 2020: it's time to touch base on Static Analysis](https://www.linkedin.com/pulse/its-2020-time-touch-base-static-analysis-maurizio-martignano) — rejected, score 6, discovered by `Clang Static Analyzer Infer KLEE CBMC abstract interpretation symbolic execution comparison`

## Research Trace

### Goal

Evaluate how abstract interpretation and symbolic execution are implemented in modern static analysis tools (Clang Static Analyzer, Infer, KLEE, CBMC), and characterize the trade-offs between soundness and usability in practice.

### Subquestions

- What are the core theoretical differences between abstract interpretation and symbolic execution, and how do they manifest in the design of Clang Static Analyzer, Infer, KLEE, and CBMC?
- How does each tool handle the soundness-usability tradeoff, including approximations, false positives, and scalability limits?
- What are the most recent (2023-2026) improvements, benchmarks, or empirical evaluations for each tool?
- What are documented failure modes, unsoundness issues, or criticisms of each tool in real-world codebases?
- How do these tools compare on common benchmarks (e.g., SV-COMP, industrial codebases, CVE detection)?
- What are practical operational implications for integrating these tools into CI/CD pipelines and large-scale codebases?

### Research Perspectives

- **Primary sources and documentation** — Establish authoritative descriptions of each tool's architecture, supported analyses, and soundness guarantees from official docs and repos.
- **Implementation and benchmarks** — Compare concrete performance, scalability, and bug-finding effectiveness on standard benchmarks and real codebases.
- **Recent research and technical reports** — Identify 2023-2026 papers and reports that advance or evaluate these tools or the underlying techniques.
- **Criticism and counterevidence** — Surface documented unsoundness, false positive/negative issues, scalability failures, and community criticisms.
- **Operational implications** — Assess integration cost, CI/CD suitability, configuration burden, and maintenance overhead for engineering teams.

### Source Requirements

- Official documentation and source repositories for Clang Static Analyzer, Infer, KLEE, and CBMC
- Peer-reviewed papers or technical reports on abstract interpretation and symbolic execution in static analysis (2020-2026)
- Benchmark results from SV-COMP or comparable evaluations
- Issue trackers, mailing lists, or postmortems documenting tool limitations or failures
- Case studies of industrial deployment in large C/C++ codebases

### Success Criteria

- The report clearly distinguishes abstract interpretation from symbolic execution and maps each tool to its primary technique(s).
- Each tool's soundness guarantees and known approximations are explicitly stated with citations.
- At least one recent (2023-2026) benchmark or empirical study is referenced for comparative evaluation.
- Documented failure modes or criticisms are included for at least three of the four tools.
- Operational guidance for CI/CD integration is concrete and actionable.

### Search Queries

- `Clang Static Analyzer Infer KLEE CBMC abstract interpretation symbolic execution comparison` — Find comparative surveys or technical reports covering multiple tools and both techniques. [Implementation and benchmarks / technical report / survey]
- `SV-COMP 2024 2025 static analysis benchmark results KLEE CBMC` — Retrieve recent benchmark performance data for symbolic execution and bounded model checking tools. [Recent research and technical reports / benchmark / competition results]
- `Infer static analyzer soundness limitations false positives industrial deployment` — Surface criticisms and operational issues for Infer from issue trackers and case studies. [Criticism and counterevidence / issue tracker / case study]
- `abstract interpretation symbolic execution soundness usability tradeoff recent 2024 2025` — Find recent research discussing the theoretical and practical tradeoff between soundness and usability. [Recent research and technical reports / research paper]

### Source Quality

- [S1] Potentially relevant paper comparing Infer with a Clang-based method, but fetch failed (unreadable). No content to assess. score=13 type=primary admitted=false warnings=Fetch error: redirect failed; no content retrieved.; fetch failed: failed HTTP request: error following redirect for url (https://idp.springer.com/authorize?response_type=cookie&client_id=springerlink&redirect_uri=https%3A%2F%2Flink.springer.com%2Fchapter%2F10.1007%2F978-981-96-4506-0_1)
- [S2] Describes artifact combining Clang Static Analyzer with KLEE, useful for comparing techniques and understanding integration. From an academic group, provides specific software versions. score=15 type=repo admitted=true warnings=Somewhat dated (2022); software versions are older (LLVM 11, Infer 1.0).
- [S3] Official Clang documentation describing CSA as path-sensitive symbolic execution; authoritative primary source for tool architecture. score=19 type=docs admitted=true warnings=
- [S4] Technical report covering symbolic execution scaling, abstract interpretation, and Clang Static Analyzer details. Provides independent in-depth technical content. score=18 type=paper admitted=true warnings=arXiv preprint, not peer-reviewed; date appears to be 2024.
- [S5] A generic list of static analysis tools with no substantial analysis of abstract interpretation or symbolic execution; thin SEO-oriented content. score=2 type=other admitted=false warnings=Low-authority list page; no depth on the research questions.
- [S6] LinkedIn article from 2020; introductory content on static analysis. Not authoritative or current enough for the technical depth required. score=6 type=other admitted=false warnings=Opinion piece; lacks citations and tool-specific details.

### Evidence Notes

- [S3] Clang Static Analyzer implements path-sensitive, inter-procedural analysis based on symbolic execution. Evidence: It implements path-sensitive, inter-procedural analysis based on symbolic execution technique. Limitations: Source is official documentation; does not discuss approximations or unsoundness.
- [S4] Symbolic execution is both an over-approximation (loss of information in symbolic states) and an under-approximation (does not cover all possible executions). Evidence: Thus, symbolic execution is both an over-approximation (there is a loss of information when we represent symbolic states) and under-approximation (we do not cover all of the possible exec... Limitations: The quote is truncated; the full reasoning may be incomplete.
- [S4] Abstract interpretation over-approximates program behavior, assuming all paths are feasible, while symbolic execution reasons about a set of paths more precisely. Evidence: In abstract interpretation, we over-approximate the behavior of the analyzed program and reason about every possible execution. On the other hand, during symbolic execution, we only reason about a set of paths, but more precisely. Limitations: Source is a single paper; may not capture all nuances of hybrid approaches.
- [S4] Static analysis tools often over-approximate or under-approximate program behavior due to Rice's theorem, leading to false positives or false negatives. Evidence: Thus, static analysis tools often over-approximate or under-approximate the behavior of a program. Consequently, such tools may report false errors (called false positives) or they might miss some real problems (called false negatives). Limitations: General statement; does not quantify rates for specific tools.
- [S4] Verification tools aim to catch all errors at the cost of many false positives, while industrial bug-finding tools aim for low false positive rates at the cost of missing true errors. Evidence: While verification tools aim to catch all errors at the cost of having a large number of false positives, industrial bug-finding tools aim to have a low false positive rate at the cost of missing some true errors. Limitations: Source is a single paper; may not reflect all tool design philosophies.
- [S4] Flow-sensitive analysis assumes every possible walk over the CFG is feasible, which is almost never the case, leading to false positives. Evidence: The flow-sensitive analysis assumes that every possible walk over the CFG is a feasible path. That is almost never the case, since some of the paths can never be taken during execution. Limitations: Example is illustrative; real tools may combine techniques.
- [S4] Path-sensitive analysis uses path constraints and SMT solvers to prune infeasible paths, reducing false positives but risking combinatorial explosion. Evidence: A path-sensitive analysis will use the path constraint and SMT solvers to prune (some of) the infeasible paths. This method can help reduce the number of false positives significantly, but it can also result in a combinatorial explosion of states. Limitations: General description; does not quantify explosion for specific tools.
- [S2] Infer sometimes generates infeasible traces, demonstrated by a loop example where the trace claims a contradiction. Evidence: During our experiments we observed that Infer sometimes generates infeasible traces. It is demonstrated by an example in the paper. In this program, Infer’s trace iterates the loop once (i = 1, x is even at the end), enters the loop a second time (i = 2, x = x + 2) but then claims that x % 2 == 0 is false, which is a contradiction as x is even. Limitations: Observation from a 2022 artifact; may not reflect current Infer versions.
- [S2] The instrumentation/injection tools for combining CSA and KLEE are research tools not developed further after initial negative results. Evidence: The instrumentation/injection tools are research tools and after our initial negative results we did not develop them further to standalone tools. Expect them to fail whenever the use-case differs from our evaluation. Limitations: Specific to the artifact; does not reflect general tool capabilities.
- [S2] KLEE's statistics show non-determinism; numbers may vary slightly between runs. Evidence: Keep in mind there is non-determinism in KLEE and the numbers above might vary slightly. Limitations: Observation from a single experiment; non-determinism may vary by configuration.
- [S2] The artifact uses KLEE based on git commit #04f5031c, LLVM/Clang Static Analyzer 11.0.1, Infer 1.0.0, Z3 4.8.8, Ubuntu 18.04. Evidence: KLEE: based on git commit #04f5031c, LLVM/Clang Static Analyzer (CSA): 11.0.1, Infer: 1.0.0, Z3: 4.8.8, Ubuntu: 18.04 for Docker image and host machines. Limitations: Versions from 2022; current versions may differ.
- [S2] The artifact combines Clang Static Analyzer with KLEE symbolic execution engine to confirm true positive reports from static analysis with dynamic symbolic execution. Evidence: The aim of our paper is to confirm true positive reports from off-the-shelf static analysers (SA) with dynamic symbolic execution (DSE) by guiding a DSE engine along the generated SA traces. Limitations: Research prototype; not a production-ready integration.
- [S2] The artifact includes benchmarks from GNU Coreutils 8.31: comm, csplit, cut, env, join, ln, nl, od, split, uniq. Evidence: We chose 10 applications from GNU Coreutils 8.31 for fault injection experiments: comm, csplit, cut, env, join, ln, nl, od, split, and uniq. Limitations: Limited to Coreutils; may not generalize to larger codebases.
- [S2] The researchers struggled to find real-world bugs with CSA and Infer, leading them to inject artificial bugs for evaluation. Evidence: As described in the paper, we struggled to find real-world bugs with CSA and Infer and decided to inject artificial bugs for our evaluation. Limitations: Observation from a specific study; may not reflect all use cases.
- [S4] The Clang Static Analyzer does not support statistical analysis in its upstream version. Evidence: The upstream version of the Clang Static Analyzer does not support statistical analysis, as it does not ... Limitations: Quote is truncated; full context may clarify.
- [S4] Abstract interpretation uses abstract domains (e.g., signs, intervals, octagons, polyhedra) to represent program states and fixed-point iteration for convergence. Evidence: Some examples of abstract domains in increasing expressiveness are signs, intervals, octagons [40], and polyhedra [47]. ... We have a set of initial conditions for each basic block and propagate values between basic blocks using fixed-point iteration. Limitations: General description; specific tool implementations may vary.
- [S4] Symbolic execution introduces symbols for unknown values and explores multiple execution paths simultaneously, but checking all paths is intractable. Evidence: It works by interpreting the code, introducing a symbol for each value unknown at compile time (e.g. user-given inputs), and carrying out calculations symbolically. The analysis engine strives to explore multiple execution paths simultaneously, although checking all paths is an intractable problem, due to the vast number of possibilities. Limitations: General description; does not address specific tool optimizations.
- [S4] The paper focuses on achieving end-to-end scalability for Clang Static Analyzer and CodeChecker, including run time, memory, bug presentation, false positive suppression, incremental analysis, and CI integration. Evidence: The emphasis is on achieving end-to-end scalability. This includes the run time and memory consumption of the analysis, bug presentation to the users, automatic false positive suppression, incremental analysis, pattern discovery in the results, and usage in continuous integration loops. Limitations: Focuses on CSA and CodeChecker; may not apply to other tools.
- [S4] Static analysis can cover cases developers did not consider and can systematically explore interesting execution paths without concrete inputs. Evidence: One of the biggest advantages of static analysis is that the analysis can cover cases developers did not consider. It can provide an elegant solution to systematically explore interesting execution paths without concrete inputs, using information inferred from the source code. Limitations: General advantage; does not address specific tool limitations.
- [S4] Bug reports need to be reviewed by developers; an overwhelming number of false warnings leads to loss of trust and interest. Evidence: Bug reports need to be reviewed by developers one-by-one in order to be corrected. If the tool presents an overwhelming amount of false warnings to the developer, it becomes cumbersome to use, and developers eventually lose their trust and interest in the tool. Limitations: General observation; specific false positive rates vary by tool.

### Claim Verification

- **supported**: Clang Static Analyzer (CSA) implements path-sensitive, inter-procedural analysis based on symbolic execution. — The evidence from S3 directly states that CSA implements path-sensitive, inter-procedural analysis based on symbolic execution.
- **supported**: CSA uses path constraints and SMT solvers to prune infeasible paths, reducing false positives. — The evidence from S4 explicitly describes that path-sensitive analysis uses path constraints and SMT solvers to prune infeasible paths, reducing false positives.
- **supported**: Path-sensitive symbolic execution can cause combinatorial explosion of states. — The evidence from S4 states that path-sensitive analysis can result in a combinatorial explosion of states.
- **supported**: The upstream version of the Clang Static Analyzer does not support statistical analysis. — The evidence from S4 explicitly says 'The upstream version of the Clang Static Analyzer does not support statistical analysis'.
- **supported**: Infer sometimes generates infeasible traces with logical contradictions in loop reasoning. — The evidence from S2 describes an example where Infer generates an infeasible trace with a logical contradiction in loop reasoning.
- **supported**: KLEE exhibits non-determinism: statistics may vary slightly between runs. — The evidence from S2 states that there is non-determinism in KLEE and numbers may vary slightly between runs.
- **supported**: KLEE is used as a dynamic symbolic execution (DSE) engine in the artifact. — The evidence from S2 describes the artifact combining static analysis with dynamic symbolic execution using KLEE, confirming its role as a DSE engine.
- **supported**: Researchers struggled to find real-world bugs with CSA and Infer on mature Coreutils codebases and resorted to injecting artificial bugs for evaluation. — The evidence from S2 explicitly states that researchers struggled to find real-world bugs with CSA and Infer and decided to inject artificial bugs.
- **supported**: The artifact uses KLEE (git commit #04f5031c), CSA 11.0.1, Infer 1.0.0, Z3 4.8.8, on Ubuntu 18.04. — The evidence from S2 lists exactly these versions: KLEE based on git commit #04f5031c, CSA 11.0.1, Infer 1.0.0, Z3 4.8.8, Ubuntu 18.04.
- **supported**: Benchmarks are drawn from GNU Coreutils 8.31: comm, csplit, cut, env, join, ln, nl, od, split, uniq. — The evidence from S2 lists these exact 10 applications from GNU Coreutils 8.31.
- **supported**: Static analysis traces from CSA can guide KLEE's dynamic symbolic execution to confirm true positives. — The evidence from S2 states the aim is to confirm true positive reports from static analysers with dynamic symbolic execution by guiding DSE along SA traces.
- **supported**: The instrumentation tools for combining CSA and KLEE are research prototypes and may fail when the use-case differs from the evaluation. — The evidence from S2 explicitly says the instrumentation tools are research tools and may fail when the use-case differs from the evaluation.
- **supported**: The 2024 scaling paper focuses on achieving end-to-end scalability for CSA and CodeChecker, covering run time, memory, bug presentation, automatic false positive suppression, incremental analysis, pattern discovery, and CI integration. — The evidence from S4 lists these exact aspects: run time, memory, bug presentation, automatic false positive suppression, incremental analysis, pattern discovery, and CI integration.
- **supported**: Abstract interpretation over-approximates program behavior by reasoning about every possible execution using abstract domains. — The evidence from S4 states that abstract interpretation over-approximates program behavior and reasons about every possible execution.
- **supported**: Propagation between basic blocks in abstract interpretation uses fixed-point iteration to ensure convergence. — The evidence from S4 explicitly mentions propagating values between basic blocks using fixed-point iteration.
- **supported**: Symbolic execution introduces symbols for unknown values and explores execution paths by computing path constraints discharged with SMT solvers. — The evidence from S4 describes symbolic execution introducing symbols for unknown values and exploring multiple paths, and the path-sensitive analysis uses SMT solvers to prune paths.
- **supported**: Symbolic execution is both an over-approximation (symbolic states lose information) and an under-approximation (not all paths are explored). — The evidence from S4 explicitly states that symbolic execution is both an over-approximation (loss of information) and an under-approximation (does not cover all possible executions).
- **supported**: Flow-sensitive analysis assumes every possible walk over the CFG is a feasible path, leading to many false positives. — The evidence from S4 states that flow-sensitive analysis assumes every possible walk over the CFG is feasible, which is almost never the case, leading to false positives.
- **supported**: Verification tools aim to catch all errors at the cost of many false positives. — The evidence from S4 explicitly says verification tools aim to catch all errors at the cost of many false positives.
- **supported**: Industrial bug-finding tools aim for low false positive rates at the cost of missing true errors. — The evidence from S4 explicitly says industrial bug-finding tools aim for low false positive rates at the cost of missing some true errors.
- **supported**: An overwhelming number of false warnings causes developers to lose trust and stop using a tool. — The evidence from S4 states that an overwhelming amount of false warnings causes developers to lose trust and interest in the tool.

### Final Evaluation

- coverage: 4/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 4/5
- overall: 4/5

Strengths:
- Clear distinction between abstract interpretation and symbolic execution with a useful conceptual table.
- Honest documentation of evidence gaps, especially for CBMC and Infer's internal architecture.
- Concrete failure modes (Infeasible traces in Infer, non-determinism in KLEE) with specific examples.
- Operational guidance for CI/CD integration grounded in the scaling paper's findings.
- Well-structured evidence table linking claims to sources with explicit limitations.

Weaknesses:
- CBMC is almost entirely absent from the analysis due to source coverage gaps, weakening the comparative goal.
- Infer's internal architecture (e.g., separation logic, bi-abduction) is not described, leaving a key tool underspecified.
- No SV-COMP benchmark data is included despite being called for in the plan, limiting empirical comparison.
- The report relies heavily on a single artifact (S2) for empirical findings, which may not generalize.
- Some claims about abstract interpretation are attributed to the general technique but not confirmed for Infer specifically.

Follow-up recommendations:
- Obtain CBMC documentation and recent SV-COMP results to fill the largest evidence gap.
- Investigate Infer's internal architecture from official documentation or recent papers to confirm its abstract interpretation approach.
- Reproduce the Infer infeasible-trace test on current versions to check if the issue persists.
- Run CSA and Infer on a large C++ codebase (e.g., LLVM) to generalize the low-yield finding beyond Coreutils.
- Conduct a KLEE determinism study to quantify run-to-run variance and explore mitigation strategies for CI.
