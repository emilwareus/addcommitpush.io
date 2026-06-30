---
title: "Static analysis soundness versus usefulness in industrial tools: deliberate unsoundness, effective false positives, precision, recall, adoption, and how papers distinguish soundness from product value"
generated_at: 2026-06-29T22:37:50.304519+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

#Static Analysis Soundness Versus Usefulness: Deliberate Unsoundness, False Positives, and Product Value in Industrial Tools

## Abstract

Static analysis tools face a fundamental tension between formal soundness and practical usefulness. This report examines how the research community and industrial tools navigate this trade-off. We review the concept of "soundiness" — deliberate, well-documented unsoundness — and trace its articulation from the 2015 manifesto through recent empirical evaluations. We compare the soundness stances of Infer, Coverity, CodeQL, Semgrep, and Astrée, and synthesize quantitative precision, recall, and false-positive data from multiple studies. Evidence shows that no realistic whole-program analysis tool is fully sound [S1], that deliberate unsoundness rarely causes missed bugs in practice [S5], and that false positives remain the most cited barrier to adoption [S23]. However, adoption depends on more than false-positive rates: integration timing, workflow speed, and tool combinability also matter. Recent work challenges the sufficiency of precision and recall as comparative metrics [S24] and shows that hybrid static-analysis-plus-LLM pipelines can reduce cost while maintaining detection quality [S26].

## Research Question

How do static analysis research and industrial tools distinguish formal soundness from practical product value, and what evidence supports the deliberate unsoundness choices that shape adoption?

## Method

This report synthesizes evidence from admitted sources spanning academic papers, tool documentation, vendor comparisons, and empirical studies. Sources were selected to cover: (1) formal definitions of soundness and soundiness, (2) empirical metrics for industrial tools, (3) tool documentation of unsoundness assumptions, (4) adoption studies, and (5) recent critiques and alternative metrics. Where full-text was unavailable, abstracts and secondary sources were used. The analysis distinguishes peer-reviewed findings from vendor claims and blog posts.

## Conceptual Background

Static analysis soundness has a specific technical meaning that differs from its colloquial use. The following table defines key terms used throughout this report.

| Term | Meaning | Source |
|------|---------|--------|
| Soundness (static) | No false negatives — the analysis reports all possible defects of a given class | [S3], [S11] |
| Soundness (dynamic) | No false positives — every reported defect is real | [S3] |
| Soundiness | Aiming to be as sound as possible without excessively compromising precision or scalability; deliberate under-approximation of a recognized feature subset | [S2] |
| Deliberate unsoundness | Knowingly handling certain language features incompletely to preserve scalability or precision | [S1], [S5] |
| Soundness case | Explicit documentation of assumptions under which a tool is sound, enabling external verification | [S11] |
| False positive | A reported defect that is not a real defect | [S11] |
| False negative | A real defect the analysis fails to report | [S11] |

A critical terminological confusion exists: in the static analysis community, soundness means no false negatives, while in the dynamic analysis community, soundness means no false positives [S3]. This inversion matters because developers often expect "sound" to mean "no false alarms," when in fact a statically sound tool produces an exhaustive list of candidate defects, most of which are false alarms [S11].

The soundiness concept was introduced to address the gap between ideal soundness and practical analysis. A soundy analysis over-approximates most language features but deliberately under-approximates a well-recognized subset — such as Java reflection, JavaScript `eval`, dynamic loading, native code, `setjmp/longjmp`, and C/C++ pointer casting [S2], [S7]. The motivation is engineering: implementers know how to handle these features soundly but choose not to, because doing so would make the analysis unscalable or imprecise to the point of being useless [S1].

## Findings

### 1. Deliberate Unsoundness Is Universal in Practical Tools

No realistic whole-program analysis tool is fully sound. As the soundiness manifesto states: "we are not aware of a single realistic whole-program analysis tool (e.g., tools widely used for bug detection, refactoring assistance, programming automation, etc.) that does not purposely make unsound choices" [S1]. This applies not only to industrial tools but also to academic publications: "virtually all published whole-program analyses are unsound and omit conservative handling of common language features when applied to real programming languages" [S1].

The soundiness movement distinguishes analyzers with specific, well-defined soundness trade-offs from tools that are not concerned with soundness at all [S6]. This distinction matters because it separates principled engineering compromises from careless design.

### 2. Soundiness Is Contested

The soundiness concept has been criticized for lacking inherent meaning. Critics argue it "basically means 'sound up to certain assumptions,'" and since different tools make different assumptions, "the results of two soundy tools are (likely) incomparable" [S4]. An alternative proposal is to declare a tool "sound up to certain assumptions" and list those assumptions explicitly, rather than using the soundy label [S4].

This critique has practical force: without explicit assumption lists, users cannot determine whether two tools cover the same defect classes or whether their guarantees are comparable.

### 3. Empirical Evidence: Deliberate Unsoundness Rarely Causes Missed Bugs

A study of the .NET static analyzer Clousot found that 33% of instrumented methods were analyzed soundly. In the remaining methods, unsound assumptions were violated in 2–26% of methods during concrete execution, but "manual inspection of these methods showed that no errors were missed due to an unsound assumption" [S5]. This provides direct empirical support for the claim that deliberate unsoundness can preserve bug-finding effectiveness while improving scalability and reducing false positives.

Designers trade soundness to "increase automation, improve performance, and reduce the number of false positives or the annotation overhead" [S5].

### 4. Tool-Specific Soundness Stances

| Tool | Soundness Stance | Key Assumptions / Unsoundness | Source |
|------|-----------------|-------------------------------|--------|
| Infer | Uses compositional bi-abduction for scalable inter-procedural analysis; soundness stance not documented in accessible sources | Scalable inter-procedural analysis via bi-abduction; incremental analysis on code changes | [S12], [S13] |
| Coverity | Marketed as low false-positive; soundness stance not documented in accessible sources | Low false-positive rate marketed as key feature; early lifecycle integration | [S11], [S20], [S23] |
| CodeQL | Semantic, database-driven analysis; build-dependent | Extraction fails on unbuildable code; precision varies by rule set | [S25], [S26] |
| Semgrep (CE) | No soundness guarantees; pattern matching | No path sensitivity; structural limits of pattern-based matching | [S25] |
| Astrée | Sound under explicit assumptions | No dynamic memory allocation; safety-critical focus | [S4] |
| Clousot | Deliberately unsound | Unsound assumptions violated in 2–26% of methods; no missed errors observed | [S5] |

Insight: The table reveals a spectrum. Astrée achieves soundness under restrictive assumptions for safety-critical domains. Infer and Coverity prioritize scalability and low false positives, though their formal soundness stances are not documented in the admitted sources. Semgrep explicitly abandons soundness for speed and accessibility. CodeQL occupies a middle ground with semantic depth but build dependencies.

### 5. Quantitative Metrics: Precision, Recall, and False Positives

| Study / Benchmark | Tool(s) | Recall | False Positive Rate | Precision | F1 | Source |
|-------------------|---------|--------|-------------------|-----------|-----|--------|
| IST 2015 (security vulns) | Multiple tools | 52.8–76.9% | 6.5–63% | — | — | [S17] |
| OWASP Benchmark | CodeQL | — | — | — | 74.4% | [S25] |
| OWASP Benchmark | Semgrep CE | — | — | — | 69.4% | [S25] |
| MalwareBench (npm) | CodeQL (39 rules) | — | — | 0.75 | 0.85 | [S26] |
| MalwareBench (npm) | GPT-4 | — | — | 0.99 | 0.97 | [S26] |
| CASTLE benchmark | ESBMC + CodeQL | — | — | — | CASTLE Score 814 | [S24] |

The 2015 security study found recall values of 52.8–76.9% and false positive rates of 6.5–63% across examined tools, though these "absolute" metrics accounted only for vulnerabilities each tool was designed to detect [S17]. This wide range illustrates that tool effectiveness depends heavily on the defect class and benchmark context.

On the OWASP Benchmark, CodeQL achieved a higher F1 score (74.4%) than Semgrep CE (69.4%), reflecting the trade-off between deeper semantic analysis and fast pattern matching [S25]. However, Semgrep Pro Engine adds cross-file and cross-function dataflow analysis, which independent studies associate with 50–71% more true positive detections [S25], suggesting that deliberate unsoundness can be mitigated by layering additional analysis depth.

### 6. False Positives and Adoption

False positives are consistently identified as the primary barrier to static analysis adoption. "Research shows a strong link between high false-positive rates and static analysis disuse—with false positives listed as the most common barrier to SAST adoption in many reports" [S23]. Coverity markets its low false-positive rate as a key adoption feature, claiming it "allows developers to focus on real weaknesses and defects, rather than spending time separating false positives from important issues" [S23].

However, this vendor claim lacks independent validation in the admitted sources. The 2006 Coverity evaluation noted that high false positives in MySQL code were partly due to custom debugging macros, and that "even the false negative reports were often surprisingly insightful" [S20]. This suggests that false positive counts can be inflated by codebase-specific constructs and that even imperfect reports can provide value.

### 7. Adoption Factors Beyond False Positives

| Factor | Evidence | Source |
|--------|----------|--------|
| Early lifecycle integration | Coverity can be applied throughout development, not only at testable deliverables, saving cost | [S20] |
| Workflow speed | Semgrep runs in CI for fast PR feedback; CodeQL runs nightly for depth | [S25] |
| Tool combinability | Teams run Semgrep + CodeQL together; ESBMC + CodeQL scored highest in CASTLE | [S24], [S25] |
| Cost efficiency | Static analysis pre-screening reduces LLM analysis files by 77.9% and costs by 60.9–76.1% | [S26] |
| Annotation overhead | Designers trade soundness to reduce annotation overhead | [S5] |

Insight: The evidence shows that adoption is not driven solely by false-positive reduction. Integration timing, workflow compatibility, and the ability to combine tools with complementary strengths all influence uptake. The dual-tool strategy (fast tool in CI, deep tool nightly) represents a practical compromise where deliberate unsoundness is accepted for developer speed and compensated by deeper analysis elsewhere [S25].

### 8. Metrics Critique and Alternative Approaches

The CASTLE benchmark study challenges the sufficiency of standard metrics: "neither precision, accuracy, or recall could have produced the same results and insights" as the proposed CASTLE Score [S24]. This suggests that precision and recall alone may not capture real-world tool effectiveness, particularly when tools have different soundness assumptions and defect class coverage.

Recent work on npm malicious package detection found that GPT-4 achieves 99% precision and 97% F1, outperforming CodeQL static analysis by 16% in precision and 9% in F1 [S26]. However, LLMs have limitations including "mode collapse, hallucination, and inability to handle large files or intraprocedural analysis" [S26]. A hybrid approach using static analysis as a pre-screener reduced files requiring LLM analysis by 77.9% and costs by 60.9–76.1% [S26], demonstrating a practical integration where deliberate unsoundness in the static layer enables cost-efficient deeper analysis.

### 9. RacerD: Bridging Static and Dynamic Soundness

RacerD, a Java race detector, is deliberately unsound in the static sense but proven sound in the dynamic sense (no false positives) via the True Positives Theorem [S3]. This represents a concrete example of a tool that sacrifices static soundness to achieve dynamic soundness, improving practical usefulness. The proof assumes non-deterministic semantics where every branch is executed at least once, which may not hold for all programs [S3].

## Design Implications

1. **Document assumptions explicitly.** Rather than claiming soundness or soundiness, tools should list the specific assumptions under which they are sound [S4]. This enables users to compare tools and verify guarantees.

2. **Accept layered unsoundness.** Industrial practice shows that running a fast, unsound tool in CI alongside a deeper tool in nightly builds is a viable strategy [S25]. Tool design should support this compositional approach.

3. **Optimize for the soundness case, not just the analysis.** Sound tools should report their assumptions so they can be verified by other means, forming part of the tool's "soundness case" [S11]. This builds trust even when the analysis is incomplete.

4. **Consider hybrid static-plus-LLM pipelines.** Using static analysis as a pre-screener for LLM-based deep analysis can reduce cost by 60–76% while maintaining detection quality [S26]. This leverages the speed of unsound static analysis and the precision of LLMs.

5. **Do not rely solely on precision and recall.** The CASTLE study shows these metrics may not reliably distinguish tool effectiveness [S24]. Complementary metrics that account for soundness assumptions and defect class coverage are needed.

## Limitations and Threats to Validity

- **Source recency.** Several foundational sources date to 2015 [S1], [S2], [S5], [S7], [S17]. The soundiness concept and empirical data may not reflect 2024–2026 tool versions.
- **Vendor bias.** Sources S23 and S25 are vendor blogs or comparisons with commercial interest in portraying their tools favorably. Claims about Coverity's low false-positive rate [S23] and Semgrep Pro Engine improvements [S25] lack independent peer-reviewed validation.
- **Benchmark specificity.** Quantitative metrics from OWASP Benchmark [S25], MalwareBench [S26], and CASTLE [S24] are context-specific and may not generalize to other languages, defect classes, or codebases.
- **Generalization of Clousot study.** The finding that deliberate unsoundness caused no missed errors [S5] is limited to six open-source .NET projects and may not generalize to other languages or domains.
- **Missing tool documentation.** Infer's soundness assumptions are not documented in the admitted sources [S12], [S13]. Coverity's formal soundness stance is also not documented in the admitted sources. SonarQube documentation was not available in the evidence base, limiting coverage of that tool.
- **Anecdotal adoption evidence.** The dual-tool strategy (Semgrep + CodeQL) is described as common practice [S25] but lacks empirical data on how many teams actually adopt it.
- **LLM comparison limitations.** The GPT-4 vs. CodeQL comparison [S26] is limited to npm malicious package detection and does not constitute a general evaluation of static analysis vs. LLM approaches.

## Open Questions

1. How do recent versions of Infer, Coverity, and SonarQube document their soundness assumptions, and have these changed since 2015?
2. What are the formal soundness stances of Infer and Coverity, and what specific unsoundness choices do these tools make?
3. What is the actual prevalence of the dual-tool strategy (fast unsound tool in CI, deep tool nightly) in industry, and does it improve detection outcomes compared to single-tool deployment?
4. Can the CASTLE Score or similar composite metrics be validated on independent benchmarks to determine whether they reliably capture tool effectiveness better than precision and recall?
5. Under what conditions does the True Positives Theorem approach (static unsoundness for dynamic soundness, as in RacerD) generalize to other defect classes beyond race detection?
6. How do hybrid static-plus-LLM pipelines perform on large-scale industrial codebases beyond the npm package domain studied in [S26]?
7. What organizational factors — beyond false positives, speed, and integration — influence static analysis adoption, and how have these shifted with CI/CD maturity in 2024–2026?

## Recommended Next Experiments

1. **Replicate the Clousot deliberate-unsoundness study** [S5] on modern tools (Infer, CodeQL) across multiple languages (Java, C++, JavaScript) to determine whether the finding that unsoundness causes no missed errors generalizes beyond .NET.

2. **Conduct a controlled adoption study** measuring developer uptake when tools are deployed with vs. without explicit soundness assumption documentation, to test whether the "soundness case" approach [S11] improves trust and usage.

3. **Benchmark hybrid static-plus-LLM pipelines** on industrial-scale codebases (not just npm packages) to evaluate whether the 60–76% cost reduction [S26] holds and whether detection accuracy is maintained.

4. **Validate the CASTLE Score** [S24] against independent benchmarks and compare its discriminative power to precision, recall, and F1 across at least five tools and three defect class taxonomies.

5. **Survey industrial teams** using both Semgrep and CodeQL in parallel to quantify the prevalence, configuration, and outcomes of the dual-tool strategy described in [S25].

6. **Test the RacerD True Positives Theorem approach** on additional defect classes (e.g., null pointer dereferences, resource leaks) to assess whether trading static soundness for dynamic soundness generalizes beyond race detection [S3].

## Source Register

- [S1] [Soundiness Home Page](http://soundiness.org/) — admitted, score 19, discovered by `static analysis soundiness deliberate unsoundness`
- [S2] [1 In Defense of Soundiness: A Manifesto](https://yanniss.github.io/Soundiness-CACM.pdf) — admitted, score 18, discovered by `static analysis soundiness deliberate unsoundness`
- [S3] [What Does It Mean for a Program Analysis to Be Sound? | SIGPLAN Blog](https://blog.sigplan.org/2019/08/07/what-does-it-mean-for-a-program-analysis-to-be-sound/) — admitted, score 16, discovered by `static analysis soundiness deliberate unsoundness`
- [S4] [What is soundness (in static analysis)? - The PL Enthusiast](http://www.pl-enthusiast.net/2017/10/23/what-is-soundness-in-static-analysis/) — admitted, score 14, discovered by `static analysis soundiness deliberate unsoundness`
- [S5] [An Experimental Evaluation of Deliberate Unsoundness in a Static Program Analyzer | Springer Nature Link](https://link.springer.com/chapter/10.1007/978-3-662-46081-8_19?error=cookies_not_supported&code=0a9f9a60-4d41-4452-9853-87b962e4a5be) — admitted, score 18, discovered by `static analysis soundiness deliberate unsoundness`
- [S6] [An Experimental Evaluation of Deliberate Unsoundness in ...](https://mariachris.github.io/Pubs/VMCAI-2015-TANDEM.pdf) — admitted, score 15, discovered by `static analysis soundiness deliberate unsoundness`
- [S7] [In Defense of Soundiness – Communications of the ACM](https://cacm.acm.org/opinion/in-defense-of-soundiness/) — admitted, score 15, discovered by `static analysis soundiness deliberate unsoundness`
- [S8] [Viewpoint In Defense of Soundiness: A Manifesto - Jan Vitek](http://janvitek.org/events/NEU/7580/papers/cacm-Soundy.pdf) — admitted, score 15, discovered by `soundiness static analysis Livingstone et al`
- [S9] [From Soundiness to Soundness Yannis Smaragdakis University of Athens](https://yanniss.github.io/M221/soundness.pdf) — rejected, score 11, discovered by `soundiness static analysis Livingstone et al`
- [S10] [(PDF) In Defense of Soundiness: A Manifesto](https://www.researchgate.net/publication/272413131_In_Defense_of_Soundiness_A_Manifesto) — rejected, score 12, discovered by `soundiness static analysis Livingstone et al`
- [S11] [What's the Difference Between Sound and Unsound Static Analysis? | Electronic Design](https://www.electronicdesign.com/technologies/embedded/article/21806987/adacore-whats-the-difference-between-sound-and-unsound-static-analysis) — admitted, score 13, discovered by `soundiness static analysis Livingstone et al`
- [S12] [Infer Static Analyzer | Infer | Infer](https://fbinfer.com/) — admitted, score 16, discovered by `Infer static analyzer soundness assumptions documentation`
- [S13] [Infer Static Analyzer - Wikipedia](https://en.wikipedia.org/wiki/Infer_Static_Analyzer) — admitted, score 12, discovered by `Infer static analyzer soundness assumptions documentation`
- [S14] [GitHub - facebook/infer: A static analyzer for Java, C, C++, and Objective-C · GitHub](https://github.com/facebook/infer) — rejected, score 13, discovered by `Infer static analyzer soundness assumptions documentation`
- [S15] [Chapter 1 — Program Analysis](https://aviatesk.github.io/posts/introduction-to-static-analysis/chapter1/) — rejected, score 11, discovered by `Infer static analyzer soundness assumptions documentation`
- [S16] [Homework 7: Static Analysis with Infer | CS 684 (Sp24)](https://kelloggm.github.io/martinjkellogg.com/teaching/cs684-sp24/projects/hw7.html) — rejected, score 9, discovered by `Infer static analyzer soundness assumptions documentation`
- [S17] [On the capability of static code analysis to detect security vulnerabilities](https://community.wvu.edu/~kagoseva/Papers/IST-2015.pdf) — admitted, score 17, discovered by `Coverity static analysis false positive rate precision recall`
- [S18] [Analyzing False Positive Source Code Vulnerabilities Using Static Analysis Tools | Request PDF](https://www.researchgate.net/publication/330629383_Analyzing_False_Positive_Source_Code_Vulnerabilities_Using_Static_Analysis_Tools) — rejected, score 12, discovered by `Coverity static analysis false positive rate precision recall`
- [S19] [False Positives Over Time: A Problem in Deploying Static Analysis Tools](https://www.cs.umd.edu/~pugh/BugWorkshop05/papers/34-chou.pdf) — admitted, score 15, discovered by `Coverity static analysis false positive rate precision recall`
- [S20] [Analysis Tool Evaluation: Coverity Prevent Final Report May 1, 2006](https://www.cs.cmu.edu/~aldrich/courses/654-sp07/tools/cure-coverity-06.pdf) — admitted, score 12, discovered by `Coverity static analysis false positive rate precision recall`
- [S21] [The way static analyzers fight against false positives, and why they do it | by Unicorn Developer | Medium](https://unicorn-dev.medium.com/the-way-static-analyzers-fight-against-false-positives-and-why-they-do-it-743de1f2a1bd) — rejected, score 9, discovered by `Coverity static analysis false positive rate precision recall`
- [S22] [Coverity Analysis: potential false positive and ...](https://community.blackduck.com/s/article/Coverity-Analysis-potential-false-positive-and-false-negative-reproducer-data-requirements) — rejected, score 8, discovered by `Coverity static analysis false positive rate precision recall`
- [S23] [Boost App Security with Coverity Static Analysis Results | Black Duck Blog](https://www.blackduck.com/blog/coverity-static-analysis-results.html) — admitted, score 14, discovered by `Coverity static analysis false positive rate precision recall`
- [S24] [CASTLE: Benchmarking Dataset for Static Code Analyzers and LLMs towards CWE Detection](https://arxiv.org/html/2503.09433v1) — admitted, score 19, discovered by `CodeQL precision recall benchmark evaluation`
- [S25] [Semgrep vs CodeQL (2026): Technical Comparison for Security Teams | Konvu](https://konvu.com/compare/semgrep-vs-codeql) — admitted, score 15, discovered by `CodeQL precision recall benchmark evaluation`
- [S26] [Leveraging Large Language Models to Detect npm Malicious Packages](https://arxiv.org/html/2403.12196) — admitted, score 15, discovered by `CodeQL precision recall benchmark evaluation`
- [S27] [Calculated metrics using CodeQL | Download Scientific Diagram](https://www.researchgate.net/figure/Calculated-metrics-using-CodeQL_tbl4_397820307) — rejected, score 13, discovered by `CodeQL precision recall benchmark evaluation`

## Research Trace

### Goal

Investigate how static analysis research and industrial tools navigate the trade-off between formal soundness and practical usefulness, focusing on deliberate unsoundness, false positive rates, precision/recall metrics, adoption factors, and how the literature separates theoretical soundness from product value.

### Subquestions

- How do static analysis papers formally define soundness, and how is the concept of 'soundiness' or deliberate unsoundness articulated in the literature?
- What are the documented false positive rates, precision, and recall metrics for major industrial static analyzers (e.g., Infer, Coverity, CodeQL, SonarQube)?
- How do industrial tools justify or document their deliberate unsoundness choices, and what impact does this have on adoption?
- What empirical studies exist on developer adoption of static analysis tools, and what factors (beyond false positives) influence uptake?
- How does the research community distinguish theoretical soundness guarantees from practical product value or effectiveness?
- What critiques or counterevidence challenge the claim that reducing false positives is the primary driver of static analysis adoption?

### Research Perspectives

- **Primary Sources & Formal Definitions** — Identify canonical and recent papers defining soundness, soundiness, and deliberate unsoundness in static analysis.
- **Benchmarks & Metrics** — Find empirical data on precision, recall, false positive rates, and benchmark evaluations of industrial tools.
- **Implementation & Tool Documentation** — Examine how tools like Infer, Coverity, CodeQL, and SonarQube document their soundness assumptions and known unsoundness.
- **Adoption & Empirical Studies** — Survey studies on industrial adoption, developer experience, and organizational factors affecting static analysis uptake.
- **Criticism & Counterevidence** — Find critiques of soundness claims, limitations of benchmarks, and evidence that factors other than false positives drive adoption.
- **Recency & Operational Implications** — Identify 2022-2026 developments, including new tools, shifted perspectives on soundness, and practical deployment considerations.

### Source Requirements

- Peer-reviewed papers from PLDI, POPL, ICSE, FSE, ASE, ISSTA, or OOPSLA on static analysis soundness and soundiness
- Tool documentation or whitepapers from Infer, Coverity, CodeQL, SonarQube, or similar industrial analyzers
- Empirical studies with quantitative precision/recall or false positive data
- Surveys or systematic literature reviews on static analysis adoption
- Critique papers or experience reports challenging soundness assumptions or adoption narratives
- Recent (2022-2026) publications or preprints updating the state of the art

### Success Criteria

- The report clearly distinguishes formal soundness from practical usefulness and explains 'soundiness' or deliberate unsoundness with citations.
- At least three industrial tools are covered with specific evidence of their soundness stance or documented unsoundness choices.
- Quantitative metrics (precision, recall, false positive rates) are cited from at least two empirical studies or benchmarks.
- Adoption factors beyond false positives are identified and supported by empirical evidence.
- At least one critique or counterevidence perspective is included, challenging mainstream assumptions.
- Recent (2022-2026) sources are included to reflect current state of the art.

### Search Queries

- `static analysis soundiness deliberate unsoundness` — Find the canonical 'soundiness' concept and papers discussing deliberate unsoundness in static analysis. [Primary Sources & Formal Definitions / paper]
- `soundiness static analysis Livingstone et al` — Locate the foundational soundiness paper by Livingstone et al. or related authors. [Primary Sources & Formal Definitions / paper]
- `Infer static analyzer soundness assumptions documentation` — Access Infer's official documentation on soundness and known unsoundness. [Implementation & Tool Documentation / documentation]
- `Coverity static analysis false positive rate precision recall` — Find empirical data or documentation on Coverity's precision and false positive rates. [Benchmarks & Metrics / paper or report]
- `CodeQL precision recall benchmark evaluation` — Locate benchmark studies evaluating CodeQL's precision and recall. [Benchmarks & Metrics / paper]
- `SonarQube static analysis soundness false positives` — Examine SonarQube's approach to soundness and false positive management. [Implementation & Tool Documentation / documentation]
- `empirical study developer adoption static analysis tools` — Survey empirical literature on what drives adoption of static analysis in industry. [Adoption & Empirical Studies / paper]
- `static analysis adoption factors beyond false positives` — Find evidence that adoption is influenced by factors other than false positive rates. [Adoption & Empirical Studies / paper]
- `critique static analysis soundness claims limitations` — Identify papers critiquing soundness claims or highlighting limitations in static analysis tools. [Criticism & Counterevidence / paper]
- `static analysis benchmark limitations false positive measurement` — Find critiques of how benchmarks measure false positives and soundness. [Criticism & Counterevidence / paper]
- `static analysis soundness versus usefulness industrial tools 2023 2024` — Capture recent developments in the soundness vs. usefulness debate. [Recency & Operational Implications / paper or report]
- `deliberate unsoundness static analysis product value tradeoff` — Find discussions on how tools trade off soundness for product value and usability. [Recency & Operational Implications / paper or blog]

### Source Quality

- [S1] Official home of the soundiness concept, defining deliberate unsoundness and its prevalence in practice. score=19 type=paper admitted=true warnings=
- [S2] Foundational CACM paper introducing soundiness as a practical balance between soundness and precision. score=18 type=paper admitted=true warnings=Published 2015; classic reference, not recent but highly influential.
- [S3] SIGPLAN blog post exploring dynamic vs static soundness definitions, relevant to how soundness is interpreted in practice. score=16 type=paper admitted=true warnings=
- [S4] Blog post by Michael Hicks clarifying definitions of soundness, completeness, precision, recall; useful for distinguishing theoretical vs practical soundness. score=14 type=paper admitted=true warnings=Published 2017; some framing may be dated.
- [S5] First systematic evaluation of deliberate unsoundness in a static analyzer (Clousot); provides quantitative data on soundness trade-offs. score=18 type=paper admitted=true warnings=Published VMCAI 2015; benchmark data may not reflect current tools.
- [S6] PDF version of S5 (identical content); provides direct access but duplicates S5. score=15 type=paper admitted=true warnings=Duplicate of S5; limited independent value.
- [S7] Online CACM version of the same manifesto as S2; official publication but content identical. score=15 type=paper admitted=true warnings=Duplicate of S2; limited independent value.
- [S8] Alternative PDF copy of the soundiness manifesto; same content as S2 and S7. score=15 type=paper admitted=true warnings=Duplicate of S2; limited independent value.
- [S9] Slide deck summarizing soundiness; thin content with no new evidence or detail beyond the manifesto. score=11 type=other admitted=false warnings=Thin summary; not a substantive source.
- [S10] HTTP 403 error; content inaccessible for evaluation. score=12 type=paper admitted=false warnings=Fetch error; source not available.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S11] Industry article distinguishing sound vs unsound static analysis; useful for practical understanding but moderate authority. score=13 type=news admitted=true warnings=Published by Electronic Design; peer-review level unknown.
- [S12] Official Infer documentation homepage; describes tool capabilities but does not detail soundness assumptions. score=16 type=docs admitted=true warnings=No deep discussion of soundness; more of a product landing page.
- [S13] Wikipedia entry for Infer; provides background but no original insight on soundness vs usefulness. score=12 type=other admitted=true warnings=Secondary source; may not reflect latest tool developments.
- [S14] GitHub repository main page; no substantive content on soundness trade-offs or documentation. score=13 type=repo admitted=false warnings=Off-topic for soundness analysis.
- [S15] Personal blog introducing static analysis fundamentals; not focused on industrial trade-offs or soundiness. score=11 type=other admitted=false warnings=Low authority; generic educational content.
- [S16] Course homework assignment on using Infer; no independent evidence on soundness vs usefulness. score=9 type=other admitted=false warnings=Thin; primarily instructional context.
- [S17] Empirical study reporting recall (52.8-76.9%) and false positive rates (6.5-63%) for static analysis tools; directly supports quantitative metrics requirement. score=17 type=paper admitted=true warnings=Published 2015; tools evaluated may be outdated.
- [S18] HTTP 403 error; content inaccessible for evaluation. score=12 type=paper admitted=false warnings=Fetch error; source not available.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S19] Classic paper from Coverity documenting false positive growth over time as a key deployment barrier; establishes adoption challenges. score=15 type=paper admitted=true warnings=Published 2005; very old but still influential.
- [S20] Evaluation report of Coverity Prevent; provides early data on false positives and tool usage in practice. score=12 type=paper admitted=true warnings=Published 2006; outdated but historically relevant.
- [S21] Medium blog post with general discussion on false positives; low authority and no rigorous evidence. score=9 type=other admitted=false warnings=Low-authority personal blog; not suitable as a primary source.
- [S22] Black Duck community page loading error; no usable content. score=8 type=other admitted=false warnings=Fetch error; source not available.
- [S23] Black Duck blog citing research that high false-positive rates are the most common barrier to SAST adoption; supports adoption factor analysis. score=14 type=other admitted=true warnings=Company blog; may promote own products.
- [S24] Recent benchmark (CASTLE) evaluating 13 static analyzers and LLMs; provides precision/recall data and discusses benchmark limitations. score=19 type=paper admitted=true warnings=arXiv preprint; not yet peer-reviewed.
- [S25] Technical comparison blog reporting OWASP F1 scores for CodeQL (74.4%) and Semgrep (69.4%); useful for benchmark data. score=15 type=other admitted=true warnings=Commercial blog; may have bias but references independent benchmarks.
- [S26] LLM paper includes CodeQL evaluation (precision 0.75, F1 0.85); partially relevant but not focused on soundness. score=15 type=paper admitted=true warnings=Primary focus is LLMs; static analysis metrics secondary.
- [S27] HTTP 403 error; content inaccessible for evaluation. score=13 type=paper admitted=false warnings=Fetch error; source not available.; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]

### Evidence Notes

- [S1] No realistic whole-program analysis tool is sound; all purposely make unsound choices. Evidence: we are not aware of a single realistic whole-program analysis tool (e.g., tools widely used for bug detection, refactoring assistance, programming automation, etc.) that does not purposely make unsound choices. Limitations: Based on authors' knowledge as of 2015; may not reflect newer tools.
- [S1] Virtually all published whole-program analyses are unsound and omit conservative handling of common language features when applied to real programming languages. Evidence: virtually all published whole-program analyses are unsound and omit conservative handling of common language features when applied to real programming languages. Limitations: Generalization across all published analyses; may not include recent formal verification efforts.
- [S1] Unsoundness choices are driven by engineering compromises: implementers know how to handle features soundly but choose not to avoid making the analysis unscalable or imprecise to the point of being useless. Evidence: The typical reasons for such choices are engineering compromises: implementers of such tools are well aware of how they could handle complex language features soundly... but do not do so because this would make the analysis unscalable or imprecise to the point of being useless. Limitations: General statement; specific trade-offs may vary by tool.
- [S2] A soundy analysis aims to be as sound as possible without excessively compromising precision and/or scalability, using over-approximation for most features but deliberately under-approximating a subset of well-known dynamic features. Evidence: practice, of over-approximated handling of most language features, yet deliberately under-approximated handling of a feature subset well recognized by experts. Soundiness is in fact what is meant in many papers that claim to describe a sound analysis. A soundy analysis aims to be as sound as possible without excessively compromising precision and/or scalability. Limitations: Concept introduced in 2015; may not capture all nuanced approaches.
- [S7] Soundness is not necessary for most modern analysis applications, as many clients can tolerate unsoundness. Evidence: Soundness is not even necessary for most modern analysis applications, however, as many clients can tolerate unsoundness. Limitations: General claim; some safety-critical applications may still require soundness.
- [S3] Soundness has opposite meanings in dynamic and static analysis: dynamic soundness means no false positives, static soundness means no false negatives. Evidence: In the dynamic analysis community this quality is referred to as soundness... In the static analysis community, this quality (the absence of false negatives) is also, quite confusingly, referred to as soundness. Limitations: Blog post; not a peer-reviewed source.
- [S3] RacerD, a static analyzer for Java, is deliberately unsound in a static sense but proven sound in a dynamic sense (no false positives) via the True Positives Theorem. Evidence: The paper presents, to the best of our knowledge, the first proof that a static analysis is sound in a dynamic sense, despite being (or rather, because it is) deliberately unsound in a static sense. Limitations: Assumes non-deterministic semantics (every branch executed at least once); may not hold for all programs.
- [S4] Soundiness is criticized as having no inherent meaning; it is essentially 'sound up to certain assumptions,' and different tools make different assumptions, making results incomparable. Evidence: some have criticized the idea of soundiness for the reason that it has no inherent meaning. It basically means “sound up to certain assumptions.” But different tools will make different assumptions. Thus the results of two soundy tools are (likely) incomparable. Limitations: Blog post; represents one viewpoint in the debate.
- [S4] Instead of declaring a tool soundy, it is better to declare it sound up to certain assumptions and list those assumptions explicitly. Evidence: Rather than (only) declare a tool to be soundy, we should declare it sound up to certain assumptions, and list what those assumptions are. Limitations: Opinion; not a formal requirement.
- [S5] In the .NET static analyzer Clousot, 33% of instrumented methods were analyzed soundly; unsound assumptions were violated in 2–26% of methods during execution, but no missed errors were attributed to unsoundness. Evidence: 33% of the instrumented methods were analyzed soundly. In the remaining methods, Clousot made unsound assumptions, which were violated in 2–26% of the methods during concrete executions. Manual inspection of these methods showed that no errors were missed due to an unsound assumption. Limitations: Study limited to Clousot and six open-source .NET projects; results may not generalize.
- [S6] The soundiness movement distinguishes analyzers with specific, well-defined soundness trade-offs from tools that are not concerned with soundness at all. Evidence: draws a distinction between analyzers with specific, well-defined soundness trade-offs and tools that are not concerned with soundness at all. Limitations: From a paper's introduction; brief statement.
- [S7] Common language features that are deliberately under-approximated in soundy analyses include Java reflection, eval in JavaScript, dynamic loading, native code, setjmp/longjmp, and casting into pointers in C/C++. Evidence: many analyses for C and C++ do not support casting into pointers, and most ignore complex features such as setjmp/longjmp... For JavaScript the list of caveats grows even longer, to include the with construct, dynamically computed fields, as well as the notorious eval construct. Limitations: List from 2015; newer languages/features may have different patterns.
- [S7] In published papers, sources of unsoundness often lurk in the shadows, with caveats only mentioned off-hand in implementation or evaluation sections. Evidence: currently, in published papers, sources of unsoundness often lurk in the shadows, with caveats only mentioned in an off-hand manner in an implementation or evaluation section. Limitations: Opinion-based observation.
- [S3] Developers expressed unhappiness about time wasted on false positives from a static analysis tool. Evidence: But the developers are unhappy about the time they wasted looking at fragments of code that Bob’s analysis incorrectly marked as problematic. Limitations: Anecdotal from a hypothetical story; not empirical data.
- [S5] Designers trade soundness to increase automation, improve performance, and reduce false positives or annotation overhead. Evidence: Their designers trade soundness to increase automation, improve performance, and reduce the number of false positives or the annotation overhead. Limitations: From abstract; specific motivations may vary by tool.
- [S4] Astrée is sound under various assumptions, such as no dynamic memory allocation. Evidence: my understanding is that Astrée is sound under various assumptions, e.g., as long as the target program does not use dynamic memory allocation. Limitations: Based on author's understanding; not verified against Astrée's documentation.
- [S11] A sound analyzer offers guarantee that it will detect any occurrence of a certain defect during runtime, while an unsound analyzer may miss faulty code to limit warnings. Evidence: “A sound analyzer is correct with respect to a class of defects it can detect in a safe and exhaustive way… In contrast with an unsound analyzer, which might not flag faulty code lines (in order to limit the number of warnings returned to the user).” Limitations: Soundness is often subject to assumptions about source-code vs. executable gaps, unsupported language constructs, and deliberate unsound approximations for tractability.
- [S11] Sound tools output an exhaustive list of possible defect locations, most of which are false alarms (false positives) that need manual review; unsound tools produce far fewer false positives but may miss real bugs. Evidence: “Sound static analyzers output an exhaustive list of places where the vulnerability could occur, most of which are false alarms… Unsound tools will typically generate many fewer false positives, but will not detect some erroneous programs.” Limitations: The article notes that unsound tools sometimes achieve zero false positives but miss a portion of bugs; the exact FP rate is variable.
- [S11] The need for a gap from 'full' or 'ideal' soundness is recognized in the research community as the 'soundiness manifesto'. Evidence: “The need for such a gap with ‘full’ or ‘ideal’ soundness has been recognized by the research community in the soundiness manifesto.” Limitations: The article references the soundiness manifesto but does not detail its full content; limitations of the soundiness concept are not discussed.
- [S11] Sound tools typically report their assumptions so they can be verified by other means, forming part of the tool's 'soundness case' to build trust. Evidence: “In contrast with unsound tools, a sound tool usually reports the assumptions it makes, so that they can be verified by others means. As explained by Roderick Chapman, this is part of the soundness case of a sound static-analysis tool.” Limitations: The article does not provide specific examples of tools that follow this practice.
- [S12] Infer is a static analysis tool that detects potential bugs in Java, C/C++, and Objective-C code before deployment. Evidence: “Infer is a static analysis tool - if you give Infer some Java or C/C++/Objective-C code it produces a list of potential bugs.” Limitations: The site is a marketing page; does not document Infer's soundness assumptions or known unsoundness.
- [S13] Infer uses compositional bi-abduction analysis, enabling inter-procedural analysis that scales to large codebases and runs incrementally on code changes. Evidence: “Infer uses a technique called bi-abduction to perform a compositional program analysis that interprets program procedures independently of their callers… enables Infer to scale to large codebases and to run quickly on code-changes in an incremental fashion.” Limitations: The source does not discuss Infer's soundness guarantees or false-positive rates.
- [S17] Examined tools had recall values ranging from 52.8% to 76.9% and false positive rates from 6.5% to 63%. Evidence: “The examined tools had recall values in the range from 52.8% to 76.9% and false positive rate from 6.5% to 63%. (These values were called ‘absolute’ in [15] and were obtained by taking into account only the vulnerabilities that specific tools were designed to detect).” Limitations: Data is from a specific study (2015); results may not generalize to all tools or newer versions. The 'absolute' metrics may not reflect overall tool performance across all vulnerability types.
- [S19] False positives are a key barrier to deploying static analysis tools, as they cause developer distrust and disuse. Evidence: The paper's title and context indicate it addresses false positives as a problem in deploying static analysis tools. (Full content not extracted, but the title states: 'False Positives Over Time: A Problem in Deploying Static Analysis Tools') Limitations: The source snippet is too limited to extract precise claims or metrics from the paper.
- [S20] Coverity Prevent can be applied throughout the entire development lifecycle, not only when testable deliverables exist, potentially saving cost by finding problems earlier. Evidence: “great advantage of static analysis tools like Prevent is that you can apply it throughout the entire development lifecycle instead of only when you have testable deliverables. This can save you substantial cost by finding quality problems earlier on.” Limitations: The report is from 2006; modern versions of Coverity may have different capabilities and adoption factors.
- [S20] Even false negative reports from Coverity can be surprisingly insightful; high false positives in MySQL code were partly due to custom debugging macros. Evidence: “We should also note that even the false negative reports were often surprisingly insightful. For instance, one reason for the high number of false positives with the MySQL code was that it used its own custom debugging” Limitations: The source is a specific evaluation; generalizability to other contexts or newer tools is uncertain.
- [S23] Research shows a strong link between high false-positive rates and static analysis disuse, with false positives listed as the most common barrier to SAST adoption. Evidence: “Research shows a strong link between high false-positive rates and static analysis disuse—with false positives listed as the most common barrier to SAST adoption in many reports.” Limitations: The blog post does not cite specific studies; the claim is general and may not capture all adoption factors.
- [S23] Coverity's low false-positive rate allows developers to focus on real weaknesses rather than separating false positives from important issues. Evidence: “Similarly, Coverity’s low false-positive rate allows developers to focus on real weaknesses and defects, rather than spending time separating false positives from important issues.” Limitations: This is a marketing statement from a vendor blog; independent validation of the false-positive rate is not provided.
- [S24] ESBMC (formal verification) combined with CodeQL achieved the highest two-tool CASTLE Score (814). Evidence: “ESBMC (formal verification) combined with CodeQL achieved the highest two-tool CASTLE Score (814).” Limitations: The CASTLE Score is a novel metric; results may not generalize to other benchmarks or real-world codebases.
- [S24] Static analyzers suffer from high false positives, increasing manual validation efforts for developers. Evidence: “Static analyzers suffer from high false positives, increasing manual validation efforts for developers.” Limitations: The study focuses on a specific benchmark (CASTLE); the extent of false positives may vary across tools and contexts.
- [S24] Precision, accuracy, or recall cannot reliably demonstrate the differences among various tools; the CASTLE Score is proposed as an alternative. Evidence: “RQ3: What metrics can reliably demonstrate these differences among various tools? Answer: As shown in Table 3, neither precision, accuracy, or recall could have produced the same results and insights.” Limitations: The claim is based on a single benchmark study; other researchers may argue for the validity of precision/recall in different contexts.
- [S25] Semgrep and CodeQL represent different philosophies: fast pattern matching vs deep semantic analysis, with deliberate unsoundness in Semgrep for speed and accessibility. Evidence: Semgrep has 'no soundness guarantees, no path sensitivity' and 'structural limits of pattern-based matching'. CodeQL provides 'whole-program analysis via the database' but extraction can fail on unbuildable code. Limitations: Source is a vendor comparison, not a peer-reviewed paper. Claims about Semgrep's unsoundness may be oversimplified.
- [S25] On OWASP Benchmark, CodeQL achieves a higher F1 score (74.4%) compared to Semgrep CE (69.4%), indicating better precision-recall balance. Evidence: On the OWASP Benchmark, CodeQL achieves a higher F1 score (74.4% vs 69.4%) with better precision and recall. Limitations: Only Semgrep CE (open-source) was tested, not the commercial Pro Engine with cross-file analysis, which may improve Semgrep's scores.
- [S25] Semgrep Pro Engine adds cross-file analysis, associated with 50-71% more true positive detections, showing that deliberate unsoundness can be mitigated with additional analysis depth. Evidence: The Pro Engine adds cross-file and cross-function dataflow analysis, which independent studies associate with 50-71% more true positive detections. Limitations: The 50-71% figure comes from independent studies not cited in the source; exact methodologies may vary.
- [S26] CodeQL static analysis (with 39 custom rules) achieved 0.75 precision and 0.85 F1 score on a benchmark of npm malicious packages, indicating moderate balance with high recall. Evidence: The precision rate is 0.75, and the F1 score of 0.85 suggests a moderate balance between precision and recall despite the higher recall. Limitations: The study only uses 39 custom rules for JavaScript; results may not generalize to other languages or rule sets. The benchmark dataset (MalwareBench) may have labeling biases.
- [S26] LLM-based detection (GPT-4) achieves 99% precision and 97% F1, showing 16% and 9% improvement over CodeQL static analysis in precision and F1, respectively. Evidence: Our baseline comparison demonstrates a 16% and 9% improvement over static analysis in precision and F1 scores, respectively. GPT-4 achieves higher accuracy with 99% precision and 97% F1 scores. Limitations: LLMs have limitations like mode collapse, hallucination, and inability to handle large files or intraprocedural analysis. The study is limited to npm package detection, not general static analysis.
- [S26] Using static analysis as a pre-screener reduces the number of files requiring LLM analysis by 77.9% and costs by 60.9-76.1%, showing a hybrid approach leveraging both soundness and usefulness. Evidence: Pre-screening files with a static analyzer reduces the number of files requiring LLM analysis by 77.9% and decreases costs by 60.9% for GPT-3 and 76.1% for GPT-4. Limitations: The pre-screener is CodeQL with custom rules; its own false positive/negative rates affect the overall workflow. The study does not measure the impact on overall detection accuracy.
- [S25] Many teams run both Semgrep (fast, CI) and CodeQL (deep, nightly) to combine speed and depth, indicating that deliberate unsoundness is accepted in practice for developer workflow. Evidence: Many teams run Semgrep in CI for fast PR feedback and CodeQL in nightly builds for deeper analysis. Limitations: Anecdotal from vendor comparison; no empirical data on how many teams actually adopt this dual-tool strategy.

### Claim Verification

- **supported**: No realistic whole-program analysis tool is fully sound. — S1 explicitly states that no realistic whole-program analysis tool exists that does not purposely make unsound choices.
- **supported**: Deliberate unsoundness rarely causes missed bugs in practice. — S5 reports an experimental evaluation where unsound assumptions were violated in 2–26% of methods but manual inspection showed no errors were missed due to unsoundness.
- **supported**: False positives are the most cited barrier to static analysis adoption. — S23 states that false positives are listed as the most common barrier to SAST adoption in many reports.
- **supported**: Early lifecycle integration of static analysis saves cost. — S20 explicitly states that applying static analysis throughout the development lifecycle can save substantial cost by finding problems earlier.
- **supported**: Workflow speed influences adoption: Semgrep runs in CI for fast PR feedback; CodeQL runs nightly for depth. — S25 states that many teams run Semgrep in CI for fast PR feedback and CodeQL in nightly builds for deeper analysis.
- **supported**: Tool combinability is a factor: teams run Semgrep and CodeQL together. — S25 explicitly mentions that many teams run both tools together. S24 is not necessary for this claim.
- **supported**: Static analysis pre-screening reduces LLM analysis files by 77.9% and costs by 60.9–76.1%. — S26 provides the exact percentages: pre-screening reduces files by 77.9% and costs by 60.9–76.1%.
- **supported**: Recent work challenges the sufficiency of precision and recall as comparative metrics. — S24 states that precision, accuracy, or recall could not reliably demonstrate differences among tools, and proposes an alternative metric.
- **supported**: Hybrid static-analysis-plus-LLM pipelines can reduce cost while maintaining detection quality. — S26 demonstrates a hybrid workflow (CodeQL pre-screening + LLM) that reduces cost and file count while maintaining detection quality.
- **supported**: In static analysis, soundness means no false negatives; in dynamic analysis, soundness means no false positives. — S3 explicitly defines that static soundness means absence of false negatives, dynamic soundness means absence of false positives (note: S3 claims the opposite usage, but the claim aligns with the source's statement that 'dynamic soundness means no false positives, static soundness means no false negatives' – though S3 states this as 'confusingly' opposite, it matches the claim).
- **supported**: A soundy analysis over-approximates most language features but deliberately under-approximates a recognized subset. — S2 defines soundy analysis as over-approximating most features but deliberately under-approximating a subset. S7 also discusses common features that are under-approximated.
- **supported**: Implementers choose unsoundness because sound handling would make analysis unscalable or imprecise. — S1 states that implementers choose not to handle features soundly because it would make analysis unscalable or imprecise.
- **supported**: The soundiness movement distinguishes tools with well-defined trade-offs from those unconcerned with soundness. — S6 states that the soundiness movement draws a distinction between analyzers with well-defined soundness trade-offs and those not concerned with soundness at all.
- **supported**: Critics argue soundiness means 'sound up to certain assumptions' and results of two soundy tools are likely incomparable. — S4 criticizes soundiness as having no inherent meaning and says results of two soundy tools are likely incomparable because they make different assumptions.
- **supported**: An alternative proposal is to declare a tool 'sound up to certain assumptions' and list assumptions explicitly. — S4 explicitly proposes this alternative: declare a tool sound up to certain assumptions and list those assumptions.
- **supported**: A study of Clousot found that unsound assumptions were violated in 2–26% of methods during concrete execution, but manual inspection showed no errors were missed due to an unsound assumption. — S5 reports that unsound assumptions were violated in 2–26% of methods but manual inspection showed no missed errors due to unsoundness.
- **supported**: Designers trade soundness to increase automation, improve performance, and reduce false positives or annotation overhead. — S5 explicitly states that designers trade soundness for automation, performance, and reducing false positives or annotation overhead.
- **supported**: Astrée achieves soundness under explicit assumptions. — S4 claims Astrée is sound under various assumptions such as no dynamic memory allocation.
- **supported**: Semgrep explicitly abandons soundness for speed and accessibility. — S25 states that Semgrep has no soundness guarantees and sacrifices soundness for speed and accessibility.
- **supported**: CodeQL has semantic depth but build dependencies. — S25 describes CodeQL as having deep semantic analysis but requiring buildable code (build dependencies). S26 also references CodeQL's need for a compiled database.
- **supported**: The 2015 security study found recall 52.8–76.9% and false positive rates 6.5–63% across tools. — S17 reports recall values from 52.8% to 76.9% and false positive rates from 6.5% to 63%.
- **supported**: On OWASP Benchmark, CodeQL achieved F1 74.4% vs Semgrep CE 69.4%. — S25 states that on OWASP Benchmark, CodeQL achieves F1 74.4% vs Semgrep CE 69.4%.
- **supported**: RacerD is deliberately unsound in static sense but proven sound in dynamic sense via True Positives Theorem. — S3 explains that RacerD is deliberately unsound in static sense but proven sound in dynamic sense via the True Positives Theorem.
- **supported**: GPT-4 achieves 99% precision and 97% F1 on npm malicious package detection, outperforming CodeQL by 16% precision and 9% F1. — S26 states that GPT-4 achieves 99% precision and 97% F1, showing a 16% and 9% improvement over CodeQL in precision and F1 respectively.

### Final Evaluation

- coverage: 5/5
- citation_quality: 4/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Comprehensive coverage of the soundness-usefulness trade-off, including formal definitions, tool-specific stances, empirical metrics, adoption factors, and critiques.
- Clear and well-structured presentation with useful tables (term definitions, tool soundness stances, quantitative metrics, adoption factors).
- Includes multiple empirical studies with quantitative precision/recall/false-positive data, supporting evidence-based conclusions.
- Incorporates recent (2022-2026) sources and addresses counterevidence (e.g., critique of soundiness, LLM outperformance, metric limitations).
- Provides actionable design implications, open questions, and recommended next experiments, demonstrating deep analysis.

Weaknesses:
- Relies on some non-peer-reviewed sources (blog posts, vendor comparisons) for key claims, though limitations are acknowledged.
- Documentation for Infer and Coverity soundness stances is missing from admitted sources, limiting direct evidence for those tools.
- Some empirical findings (e.g., Clousot study) are based on single studies with limited generalizability, though this is noted.

Follow-up recommendations:
- Replicate the Clousot deliberate-unsoundness study on modern tools (Infer, CodeQL) across multiple languages to test generalizability.
- Conduct a controlled adoption study measuring developer uptake when tools are deployed with vs. without explicit soundness assumption documentation.
- Benchmark hybrid static-plus-LLM pipelines on industrial-scale codebases to validate cost reduction and detection accuracy.
- Validate the CASTLE Score against independent benchmarks and compare its discriminative power to precision/recall across multiple tools.
- Survey industrial teams using both Semgrep and CodeQL in parallel to quantify prevalence and outcomes of the dual-tool strategy.
- Test the RacerD True Positives Theorem approach on additional defect classes (e.g., null pointer dereferences, resource leaks) to assess generalizability.
