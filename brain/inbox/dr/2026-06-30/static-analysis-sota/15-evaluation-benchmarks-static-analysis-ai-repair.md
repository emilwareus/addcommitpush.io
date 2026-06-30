---
title: "Evaluation benchmarks for static analysis and AI repair: SWE-bench, Defects4J, Juliet, SV-COMP, precision, recall, actionability, and repair success metrics"
generated_at: 2026-06-29T22:05:57.169005+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Evaluation Benchmarks for Static Analysis and AI Repair: SWE-bench, Defects4J, Juliet, SV-COMP, and the Metrics That Measure Them

## Abstract

This report characterizes the design, strengths, limitations, and operational use of major evaluation benchmarks for static analysis and AI program repair, with a focus on SWE-bench and its recent variants. The admitted evidence provides substantial detail on SWE-bench, SWE-bench Verified, SWE-Bench+, and SWE-Bench Pro, including dataset construction, evaluation protocols, documented biases, and failure modes. However, the admitted source register lacks primary or empirical sources for Defects4J, Juliet, and SV-COMP; these benchmarks are discussed only at a conceptual level, and claims about their specific datasets, metrics, or recent results are flagged as unsupported by the current evidence base. The report distinguishes static analysis metrics (precision, recall, actionability) from repair metrics (plausible vs. correct patches, pass@k, test-based vs. semantic correctness), identifies cross-cutting pitfalls such as test-suite overfitting and data contamination, and offers practical guidance for benchmark selection grounded in the available sources.

## Research Question

How are the major evaluation benchmarks for static analysis and AI repair—SWE-bench, Defects4J, Juliet, and SV-COMP—designed, what metrics do they operationalize, and what are their documented limitations, biases, and practical trade-offs for evaluating real systems?

## Method

This report synthesizes evidence from two admitted sources: a practitioner critique of SWE-bench [S2] and a paper introducing SWE-Bench Pro [S3, S5]. The analysis is limited to what these sources establish. Where the topic requires discussion of Defects4J, Juliet, or SV-COMP, the report provides conceptual background from general domain knowledge but explicitly marks these sections as unsupported by the admitted source register and does not cite specific claims. The report follows a structured comparison across benchmarks, metrics, and limitations, using tables to increase evidence density where appropriate.

## Conceptual Background

### Static Analysis vs. AI Repair Evaluation

Static analysis tools detect potential defects without executing the program. Their evaluation typically centers on whether reported warnings correspond to real defects (precision), whether real defects are found (recall), and whether findings are useful to developers (actionability). AI repair systems generate patches to fix defects; their evaluation centers on whether patches pass tests (plausibility), whether patches are semantically correct, and whether the repair process succeeds within a budget (pass@k).

### Key Terms

| Term | Definition | Evaluation Context |
|---|---|---|
| Precision | Fraction of reported findings that are true positives | Static analysis |
| Recall | Fraction of real defects that are found | Static analysis |
| Actionability | Whether a finding enables a developer to fix the issue | Static analysis |
| Plausible patch | A patch that passes the available test suite | AI repair |
| Correct patch | A patch that is semantically equivalent to a human-intended fix | AI repair |
| Pass@k | Probability that at least one of k generated patches passes tests | AI repair |
| Solution leakage | The fix is revealed in the issue text or comments | AI repair (SWE-bench) |
| Data contamination | Test data appears in model training data | AI repair |
| Test-suite overfitting | A patch passes tests but is not a correct fix | AI repair |

### Benchmark Overview

| Benchmark | Domain | Language(s) | Task Type | Ground Truth | Evidence Status |
|---|---|---|---|---|---|
| SWE-bench | Real GitHub issues | Python | AI repair (issue → patch) | Merged PR + test suite | Well-supported [S2, S3] |
| SWE-bench Verified | Curated subset of SWE-bench | Python | AI repair | Human-verified instances | Supported [S3] |
| SWE-Bench Pro | Enterprise-grade tasks | Python (primarily) | AI repair (long-horizon) | Human-verified reference solutions | Supported [S3, S5] |
| SWE-Bench+ | Contamination-resistant subset | Python | AI repair | Post-cutoff issues, no solution leakage | Supported [S2] |
| Defects4J | Real bug fixes | Java | AI repair / fault localization | Developer patches + test suites | Not in admitted sources |
| Juliet | Synthetic test cases | C/C++/Java | Static analysis (taint, CWE) | Hand-seeded vulnerabilities | Not in admitted sources |
| SV-COMP | Software verification | C | Formal verification | Specification-based | Not in admitted sources |

The four benchmarks beyond SWE-bench and its variants are listed for conceptual completeness. The admitted source register does not contain primary documentation, empirical studies, or critiques for Defects4J, Juliet, or SV-COMP. All specific claims in the remainder of this report are confined to SWE-bench and its derivatives.

## Findings

### SWE-bench: Design and Scale

SWE-bench consists of 2,294 real GitHub issues drawn from 12 popular Python repositories [S2]. Each task instance provides a repository state, an issue description, and a hidden test suite; success is defined as the generated patch passing all tests (both fail-to-pass and pass-to-pass tests). The benchmark evaluates end-to-end repair capability: the system must localize the fault, generate a patch, and produce a working solution.

The evaluation protocol is test-based: a patch is considered successful if and only if it passes the full test suite associated with the issue. No separate semantic correctness check is applied in the standard protocol [S2].

### SWE-bench Verified: Approaching Saturation

SWE-bench Verified is a human-curated subset of 500 instances designed to reduce noise in the original benchmark. State-of-the-art agents have reported pass rates exceeding 70% on this subset [S3]. However, 161 of the 500 instances require only one- to two-line modifications, meaning roughly one-third of the benchmark consists of trivial changes [S3]. This raises concerns about saturation: top systems may achieve high scores without demonstrating deep repair capability.

### SWE-Bench Pro: Long-Horizon Enterprise Tasks

SWE-Bench Pro contains 1,865 problems sourced from 41 actively maintained repositories spanning business applications, B2B services, and developer tools [S3]. The benchmark is designed to be substantially harder than SWE-bench Verified.

| Property | SWE-bench Verified | SWE-Bench Pro |
|---|---|---|
| Instance count | 500 | 1,865 |
| Repository count | 12 (original SWE-bench) | 41 |
| Avg. patch size | Often 1–2 lines (161/500 trivial) | 107.4 lines across 4.1 files |
| Min. lines changed | Not specified | ≥10 |
| SOTA Pass@1 | >70% | ≤23.3% (public), ≤17.8% (commercial) |
| Contamination resistance | Limited | GPL repos (public/held-out), private commercial repos |

Sources: [S3]

SWE-Bench Pro uses two contamination-resistant strategies: (1) selecting GPL-licensed repositories for the public and held-out sets, on the rationale that GPL code is rarely included in LLM training corpora, and (2) acquiring proprietary codebases from real startups for a commercial evaluation set [S3]. State-of-the-art models achieve at most 23.3% Pass@1 on the public set and 17.8% on the commercial set [S3].

### SWE-Bench+: Addressing Leakage

SWE-Bench+ was proposed to address two specific weaknesses in the original SWE-bench: solution leakage and data contamination [S2]. It selects issues with no clear solution in the issue report and collects issues created after LLM training cutoff dates to reduce the risk of contamination [S2].

### Documented Limitations of SWE-bench

The evidence identifies several interrelated limitations:

**Solution leakage.** In 32.67% of SWE-bench issues, the solution is directly provided in the issue report or comments [S2]. This allows models to copy patterns rather than reason about the problem, inflating performance.

**Weak test cases.** Approximately 31.08% of SWE-bench test cases are not comprehensive enough to catch incorrect or incomplete fixes [S2]. Patches may pass tests while being semantically wrong.

**Suspicious fixes.** An analysis of SWE-Agent + GPT-4 found that 63.75% of fixes were "suspicious"—either stemming from solution leakage or passing weak tests despite being incorrect or incomplete [S2]. This finding suggests that leaderboard rankings may overstate genuine repair capability.

**Test-based metric only.** SWE-bench relies solely on test case passing as the success metric, which does not capture code quality dimensions such as efficiency, maintainability, or adherence to project conventions [S2].

**Resource requirements.** Setting up SWE-bench requires a powerful x86_64 machine with at least 120 GB storage, 16 GB+ RAM, and Docker [S2]. This creates practical barriers to reproducibility and accessibility.

**Language narrowness.** SWE-bench is Python-only, limiting generalizability to other languages or enterprise codebases in different ecosystems [S2].

### Failure Mode Analysis in SWE-Bench Pro

SWE-Bench Pro provides a granular failure mode taxonomy. Larger models (e.g., Opus 4.1) primarily fail on semantic or algorithmic correctness in large, multi-file edits, while smaller models (e.g., Qwen 3 32B) more frequently fail due to syntax and formatting errors, tool-use mistakes, or context management failures [S3]. This distinction is diagnostically useful: it suggests that improving smaller models may require better scaffolding and tool integration, while improving larger models may require deeper reasoning capabilities.

Insight: The failure mode split implies that aggregate pass@k scores conflate distinct capability gaps. A system that fails because it cannot manage context windows has a different remediation path than one that fails because its algorithmic reasoning is wrong. Benchmark reports should disaggregate failure modes, not just report pass rates.

### Metrics: Precision, Recall, and Actionability in Static Analysis

The admitted sources do not provide specific evidence on how precision, recall, or actionability are operationalized in Defects4J, Juliet, or SV-COMP. Conceptually:

- **Precision** in static analysis is measured as the fraction of tool-reported warnings that correspond to actual defects. Low precision (high false positive rates) is the most commonly cited reason developers abandon static analysis tools.
- **Recall** is the fraction of real defects the tool detects. In benchmarks like Juliet, where vulnerabilities are hand-seeded, recall can be computed exactly. In real-world codebases, recall is harder to establish because the full set of defects is unknown.
- **Actionability** refers to whether a finding provides enough information for a developer to act. A warning that says "possible null pointer dereference at line 42" is more actionable than one that says "potential issue in module X."

These definitions are standard in the field but are not supported by the admitted source register for the specific benchmarks named.

### Metrics: Repair Success in AI Repair

| Metric | Definition | Used In | Strengths | Weaknesses |
|---|---|---|---|---|
| Plausible patch (test-passing) | Patch passes available test suite | SWE-bench, Defects4J (conceptually) | Automated, scalable | Overfits to weak tests [S2] |
| Correct patch (semantic) | Patch matches developer intent | Research studies | Captures true correctness | Requires manual or formal verification |
| Pass@k | ≥1 of k samples passes tests | SWE-bench, code generation | Accounts for stochasticity | Still test-based; k inflates cost |
| Exact-match | Patch identical to reference | Limited use | Objective | Too strict; many valid patches differ |

Sources: [S2] for SWE-bench-specific claims; other benchmarks conceptual only.

The central tension in AI repair evaluation is the gap between plausible and correct patches. SWE-bench's test-based protocol measures plausibility, not correctness. The 63.75% suspicious-fix rate for SWE-Agent + GPT-4 [S2] quantifies this gap: a substantial fraction of "successful" repairs may be incorrect.

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| SWE-bench has 2,294 issues from 12 Python repos | Dataset description | [S2] | Python-only; may not generalize |
| 32.67% of issues have solution leakage | Empirical analysis | [S2] | Single study; verified subset may differ |
| 31.08% of test cases are weak | Empirical analysis | [S2] | Single study; verified subset may have stronger tests |
| 63.75% of SWE-Agent + GPT-4 fixes are suspicious | Fix analysis | [S2] | One model/scaffold combination |
| SWE-Bench Pro has 1,865 tasks from 41 repos | Dataset description | [S3] | Some sets not publicly accessible |
| SWE-Bench Pro avg. patch: 107.4 lines, 4.1 files | Reference solution stats | [S3] | May not capture all real-world variation |
| SOTA on SWE-Bench Pro public: ≤23.3% Pass@1 | Evaluation results | [S3] | Specific scaffold; rankings may shift |
| SWE-bench Verified SOTA: >70% pass rate | Leaderboard results | [S3] | Varies with scaffold; 161/500 trivial |
| SWE-Bench+ addresses leakage and contamination | Benchmark proposal | [S2] | Not yet widely adopted |
| SWE-bench setup requires 120GB+ storage, 16GB+ RAM | Practical guide | [S2] | Estimates may vary |

## Design Implications

### For Benchmark Selection

1. **Match benchmark difficulty to system maturity.** SWE-bench Verified is approaching saturation for frontier systems (>70% pass rate) and contains many trivial instances [S3]. For evaluating advanced agents, SWE-Bench Pro provides substantially more headroom (≤23.3% Pass@1) [S3]. Using only Verified may mask capability differences between systems.

2. **Account for contamination.** If evaluating models that may have been trained on public GitHub data, prefer contamination-resistant variants. SWE-Bench Pro uses GPL repos and private commercial codebases [S3]; SWE-Bench+ uses post-cutoff issues [S2]. The original SWE-bench provides no such safeguards.

3. **Disaggregate failure modes.** Aggregate pass rates obscure why systems fail. The SWE-Bench Pro failure taxonomy—distinguishing semantic/algorithmic failures from syntax/tool-use/context failures [S3]—should be adopted as a reporting standard.

4. **Do not rely on test-passing alone.** The weak-test and solution-leakage problems documented in SWE-bench [S2] mean that test-based plausibility is a necessary but insufficient success criterion. Evaluators should add manual or automated semantic checks, especially for top-performing systems.

### For Metric Interpretation

5. **Treat precision and recall as orthogonal in static analysis.** A tool with high recall but low precision floods developers with false positives; a tool with high precision but low recall misses real defects. Benchmarks should report both, along with actionability metrics (e.g., time-to-fix, developer acceptance rate).

6. **Distinguish pass@1 from pass@k.** Pass@k with large k can dramatically overstate practical capability. A system that succeeds on its 10th attempt is qualitatively different from one that succeeds on its first.

### For Static Analysis Benchmarks (Defects4J, Juliet, SV-COMP)

The admitted sources do not provide specific guidance for these benchmarks. The following are general principles:

- **Juliet** is useful for measuring recall on known vulnerability patterns (CWEs) but may not generalize to real-world code because vulnerabilities are synthetically seeded.
- **SV-COMP** evaluates formal verification tools against specification-based properties; its scoring system rewards correct verdicts and penalizes incorrect ones, but the benchmark is C-only and focuses on specific property categories.
- **Defects4J** provides real Java bugs with developer patches and test suites, making it suitable for both fault localization and repair evaluation, but it shares the test-suite overfitting problem documented in SWE-bench.

These statements are not supported by the admitted source register and should be verified against primary documentation before use in evaluation decisions.

## Limitations and Threats to Validity

### Evidence Coverage

The most significant threat to the validity of this report is uneven source coverage. The admitted source register contains only two sources, both focused on SWE-bench and its variants [S2, S3, S5]. Defects4J, Juliet, and SV-COMP are named in the research question but have no primary or empirical sources in the evidence base. All claims about these benchmarks are conceptual and should be treated as unsupported.

### Source Bias

Source [S2] is a practitioner blog post from Runloop, a company that offers hosted access to SWE-bench. While the critique is detailed and quantitative, the commercial interest in highlighting benchmark difficulty should be noted. Source [S3] is a preprint paper introducing SWE-Bench Pro; as the benchmark's authors, they have an interest in demonstrating that existing benchmarks are insufficient and that their alternative is needed.

### Single-Study Findings

Several key statistics—the 32.67% solution leakage rate, the 31.08% weak-test rate, and the 63.75% suspicious-fix rate—are drawn from a single analysis [S2]. These figures may not generalize across all SWE-bench versions, model combinations, or evaluation setups. The SWE-bench Verified subset may have different characteristics.

### Temporal Validity

SWE-bench and its variants are evolving rapidly. SWE-Bench Pro results are reported as of late 2025 [S3]; model capabilities and benchmark characteristics may have shifted since then. The current date is 2026-06-29, and no sources from 2026 are in the admitted register.

### Failure Mode Classification

The SWE-Bench Pro failure mode analysis relies on LLM-as-a-judge, which may introduce its own biases in categorizing failure reasons [S3]. The reliability of this classification method is not independently validated in the admitted sources.

## Open Questions

1. **How do Defects4J, Juliet, and SV-COMP compare to SWE-bench on the same dimensions (leakage, weak tests, saturation, contamination)?** The admitted sources cannot answer this. Primary documentation and empirical studies for each benchmark are needed.

2. **What is the actual semantic correctness rate of patches on SWE-bench Verified?** The suspicious-fix analysis [S2] covers the original SWE-bench with one model; a corresponding analysis for Verified with multiple frontier models would clarify whether the saturation concern is warranted.

3. **Do GPL-licensed repositories in SWE-Bench Pro actually reduce contamination?** The assumption that GPL code is rarely in LLM training data is plausible but unverified in the admitted sources. Empirical checks for memorization on these repos would strengthen the claim.

4. **How transferable are SWE-bench findings to non-Python languages?** Both SWE-bench and SWE-Bench Pro are Python-centric. Whether the documented limitations (leakage, weak tests, trivial instances) recur in Java, C, or multi-language benchmarks remains open.

5. **What actionability metrics exist for static analysis benchmarks?** The concept of actionability is widely discussed but poorly operationalized. No source in the admitted register defines a quantitative actionability metric.

## Recommended Next Experiments

1. **Replicate the suspicious-fix analysis on SWE-bench Verified.** Apply the methodology from [S2]—checking for solution leakage and weak tests—to the 500 Verified instances across at least three frontier models. This would determine whether the >70% pass rate reflects genuine capability or inflated metrics.

2. **Cross-benchmark leakage audit.** Apply the solution-leakage detection method from [S2] to Defects4J and other repair benchmarks. If similar leakage rates exist, the problem is systemic; if not, SWE-bench is an outlier.

3. **Semantic correctness study on SWE-Bench Pro.** For the 23.3% of tasks that SWE-Bench Pro agents pass, perform manual or automated semantic review to estimate the plausible-to-correct gap. This would calibrate whether test-passing on harder benchmarks is more or less reliable than on easier ones.

4. **Contamination check for GPL repos.** Test whether frontier models can memorize or reproduce specific code snippets from the GPL-licensed repositories used in SWE-Bench Pro's public set. This would validate the contamination-resistance claim from [S3].

5. **Actionability metric development.** Design and pilot a quantitative actionability metric for static analysis findings—e.g., developer time-to-triage, false-positive confirmation rate, or fix-suggestion acceptance rate—and evaluate it on Juliet or a real-world dataset. No admitted source addresses this gap.

6. **Multi-language SWE-bench extension.** Construct a small (50–100 instance) SWE-bench-style benchmark for a non-Python language (e.g., Java or TypeScript) using the same construction methodology, then evaluate whether the leakage and weak-test problems recur. This would test the language-generalizability concern raised in [S2].

## Source Register

- [S1] [Introducing SWE-bench Verified | OpenAI](https://openai.com/index/introducing-swe-bench-verified/) — rejected, score 19, discovered by `SWE-bench evaluation benchmark AI repair metrics limitations`
- [S2] [SWE-Bench Deep Dive: Unmasking the Limitations of a Popular Benchmark](https://runloop.ai/blog/swe-bench-deep-dive-unmasking-the-limitations-of-a-popular-benchmark) — admitted, score 17, discovered by `SWE-bench evaluation benchmark AI repair metrics limitations`
- [S3] [SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks?](https://arxiv.org/html/2509.16941v1) — admitted, score 19, discovered by `SWE-bench evaluation benchmark AI repair metrics limitations`
- [S4] [SWE-bench Verified - AI Benchmark Explained | DemandSphere](https://www.demandsphere.com/research/demandsphere-radar/ai-frontier-model-tracker/benchmarks/swe-bench/) — rejected, score 13, discovered by `SWE-bench evaluation benchmark AI repair metrics limitations`
- [S5] [arXiv:2509.16941v2 [cs.SE] 14 Nov 2025 SWE-Bench Pro: Can AI Agents Solve](https://arxiv.org/pdf/2509.16941) — admitted, score 19, discovered by `SWE-bench evaluation benchmark AI repair metrics limitations`

## Research Trace

### Goal

Characterize the design, strengths, limitations, and operational use of major evaluation benchmarks for static analysis and AI repair (SWE-bench, Defects4J, Juliet, SV-COMP) and the metrics used to measure precision, recall, actionability, and repair success.

### Subquestions

- What are the task definitions, dataset construction, ground truth, and evaluation protocols for SWE-bench, Defects4J, Juliet, and SV-COMP?
- How are precision, recall, and actionability defined and measured in static analysis benchmarks, and what are known pitfalls (false positives, unsoundness, benchmark bias)?
- What repair success metrics (e.g., plausible vs. correct patches, test-based vs. semantic correctness, pass@k, exact-match) are used in AI repair, and how do they differ across benchmarks?
- What are the documented limitations, biases, and criticisms of each benchmark (e.g., test-suite overfitting, data leakage, language/domain narrowness, saturation)?
- How do recent papers propose new or complementary benchmarks and metrics addressing the limitations of these established ones?
- What practical guidance exists for selecting, configuring, and interpreting these benchmarks for evaluating static analyzers or AI repair systems?

### Research Perspectives

- **Primary sources** — Capture official benchmark documentation, dataset descriptions, and evaluation protocol specifications from maintainers.
- **Benchmarks and metrics** — Identify how precision, recall, actionability, and repair success are operationalized and compared across benchmarks.
- **Implementation and tooling** — Find repos, harnesses, scripts, and integration examples for running these benchmarks.
- **Criticism and counterevidence** — Surface documented limitations, failures, overfitting, data leakage, and critiques of benchmark validity.
- **Recency and evolution** — Identify recent (2024-2026) updates, new benchmark variants, and emerging metrics.
- **Operational implications** — Extract practical guidance for benchmark selection, configuration, and result interpretation in real evaluation pipelines.

### Source Requirements

- Official benchmark websites and dataset documentation (SWE-bench, Defects4J, Juliet/NIST, SV-COMP)
- Peer-reviewed papers introducing or evaluating these benchmarks
- Recent (2024-2026) survey or position papers on benchmark limitations and proposed alternatives
- GitHub repositories with benchmark harnesses, scripts, or leaderboards
- Empirical studies reporting precision/recall or repair success numbers on these benchmarks
- Critiques or blog posts from practitioners on benchmark validity and overfitting

### Success Criteria

- For each benchmark, the report specifies task type, dataset size/composition, ground truth source, language/domain, and evaluation protocol.
- The report clearly distinguishes static analysis metrics (precision, recall, actionability) from repair metrics (plausible/correct patches, pass@k, test-based vs semantic).
- At least three documented limitations or criticisms are presented per benchmark where available.
- Recent (2024-2026) developments or proposed alternatives are included.
- Practical guidance for benchmark selection and interpretation is provided.
- Sources include a mix of primary documentation, empirical papers, and critiques.

### Search Queries

- `SWE-bench evaluation benchmark AI repair metrics limitations` — Find primary and critical sources on SWE-bench design, metrics, and known issues. [Primary sources / documentation/paper]
- `Defects4J Juliet SV-COMP benchmark precision recall static analysis evaluation` — Capture cross-benchmark comparison of static analysis evaluation metrics and protocols. [Benchmarks and metrics / paper/survey]
- `automated program repair benchmark overfitting test-suite correctness 2024 2025` — Surface recent critiques of repair benchmark validity and proposed alternatives. [Criticism and counterevidence / paper]
- `SV-COMP benchmark 2025 2026 results verification precision recall actionability` — Find recent SV-COMP results and metric definitions for static analysis evaluation. [Recency and evolution / report/website]

### Source Quality

- [S1] Source fetch failed with HTTP 403. No content available to score meaningfully. score=19 type=documentation admitted=false warnings=fetch_error: HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S2] Provides a critical perspective on SWE-bench limitations, focusing on test-case overfitting and real-world code quality. Useful for surfacing criticisms and supplementing primary sources. Moderate authority due to blog format but independent perspective. score=17 type=critique admitted=true warnings=Blog post rather than peer-reviewed; authority limited.
- [S3] Introduces SWE-Bench Pro, an extension addressing limitations of SWE-bench. Provides benchmark details, failure analysis, and dataset construction. Fresh, relevant, independent evidence. score=19 type=paper admitted=true warnings=
- [S4] Thin summary/blog-like description of SWE-bench Verified from a marketing-oriented site. Low authority and independence; adds no new evidence beyond what primary sources provide. score=13 type=other admitted=false warnings=Low-authority market analysis; redundant with primary sources.
- [S5] Full PDF of the SWE-Bench Pro paper. Contains dataset details, evaluation protocol, failure mode analysis, and metrics. Authoritative preprint, independent evidence for long-horizon tasks. score=19 type=paper admitted=true warnings=PDF content partially extractable; some details may be obscured.

### Evidence Notes

- [S2] SWE-bench consists of 2,294 real GitHub issues from 12 popular Python repositories. Evidence: SWE-Bench comprises 2,294 complex issues from GitHub, sourced from 12 popular Python repositories. Limitations: Only Python; may not generalize to other languages or enterprise-level codebases.
- [S2] 32.67% of SWE-bench issues have solution leakage, where the solution is directly provided in the issue report or comments. Evidence: A significant portion of the issues (32.67%) in SWE-Bench have solutions directly provided in the issue report or comments. Limitations: This figure is from one study; other versions of SWE-bench (e.g., verified) may mitigate this.
- [S2] 31.08% of SWE-bench test cases are weak—not comprehensive enough to catch incorrect or incomplete fixes. Evidence: Another issue is the presence of weak test cases (31.08%). These tests are not comprehensive enough to catch incorrect or incomplete fixes. Limitations: Weak tests are specific to SWE-bench; newer subsets (verified) may have stronger suites.
- [S2] SWE-Agent + GPT-4 had 63.75% suspicious fixes on SWE-bench, many due to solution leakage or weak tests. Evidence: Suspicious Fixes: 63.75% of the fixes were suspicious. These suspicious fixes either stemmed from solution leakage or passed weak test cases despite being incorrect or incomplete. Limitations: Analysis from one study on one specific model/scaffold combination.
- [S2] Setting up SWE-bench requires substantial resources: x86_64 machine, at least 120 GB storage, 16 GB+ RAM, and Docker. Evidence: Setting up SWE-bench is painful... expect to need a powerful x86_64 machine with ample storage (at least 120GB), significant RAM (16GB+), and sufficient CPU cores. Limitations: The blog acknowledges Runloop provides easier access; resource estimates may vary.
- [S2] SWE-Bench+ was proposed to address solution leakage and data leakage by selecting issues created after LLM training cutoff dates and with no clear solution in the issue. Evidence: SWE-Bench+ focuses on issues with no clear solution provided in the issue report and without potential risk of data leakage. It also collects issues created after the training cutoff dates of LLMs to prevent data leakage. Limitations: SWE-Bench+ is itself a benchmark with its own limitations; not yet widely adopted.
- [S3] SWE-Bench Pro contains 1,865 problems from 41 actively maintained repositories covering business apps, B2B services, and developer tools. Evidence: SWE-Bench Pro contains 1,865 problems sourced from a diverse set of 41 actively maintained repositories spanning business applications, B2B services, and developer tools. Limitations: Commercial set results are released while codebases remain private; public set uses GPL repos which may limit some use cases.
- [S3] Tasks in SWE-Bench Pro are long-horizon: average patch is 107.4 lines across 4.1 files, with at least 10 lines changed; over 100 tasks require >100 lines. Evidence: On average, the reference solutions span 107.4 lines of code across 4.1 files... at least 10 lines of change, and over 100 tasks demand more than 100 lines of modification. Limitations: Tasks are human-verified and augmented, but the benchmark may still not capture all real-world variation.
- [S3] SWE-Bench Pro is contamination-resistant by using GPL-licensed repos for public/held-out sets and proprietary codebases for commercial set. Evidence: Exclusively selecting repositories distributed under strong copyleft licenses (GPL) to construct a public set (11 repositories) and a held-out set (12 repositories), and (2) acquiring commercial codebases from real startups. Limitations: GPL repos may still appear in some training data; held-out and commercial sets are not publicly accessible, limiting community verification.
- [S3] State-of-the-art models achieve <25% Pass@1 on SWE-Bench Pro public set; GPT-5 scores 23.3%, and commercial set performance is below 17.8%. Evidence: LLM agents achieve only modest resolution rates on SWE-Bench Pro (≤23.3% on the public set; ≤17.8% on the commercial set). Limitations: Results are with a specific scaffold (SWE-Agent); different scaffolds may yield different rankings.
- [S3] Failure mode analysis for SWE-Bench Pro shows large models (e.g., Opus 4.1) mainly fail on semantic/algorithmic correctness in large multi-file edits, while smaller models fail on syntax, formatting, tool use, and context management. Evidence: Larger models (e.g., Opus 4.1) often fail on semantic or algorithmic correctness in large, multi-file edits, whereas smaller models (e.g., Qwen 3 32B) more frequently fail due to issues in syntax and formatting, tool use, or context management. Limitations: Failure mode classification relies on LLM-as-a-judge, which may introduce its own biases.
- [S3] SWE-Bench Verified is approaching saturation, with state-of-the-art agents achieving >70% pass rate, and 161 out of 500 instances are trivial (1-2 line changes). Evidence: The state-of-the-art agents have reported over 70% pass rate on SWE-Bench-Verified... SWE-Bench Verified includes a substantial proportion of relatively trivial problems (161 out of 500) that require only one- to two-line modifications. Limitations: Reported pass rates may vary with scaffold and evaluation setup; trivial instances may still be useful for basic sanity checks.
- [S2] SWE-bench relies solely on test case passing as the success metric, which may not capture full code quality (e.g., efficiency, maintainability). Evidence: SWE-Bench primarily relies on passing test cases as the metric for success, which may not capture the full spectrum of code quality. Limitations: The reference to 'static analysis and' is incomplete; further detail may be needed to fully assess implications.

### Claim Verification

- **supported**: SWE-bench consists of 2,294 real GitHub issues drawn from 12 popular Python repositories. — Evidence from S2 explicitly states 'SWE-Bench comprises 2,294 complex issues from GitHub, sourced from 12 popular Python repositories.'
- **supported**: 32.67% of SWE-bench issues have solution leakage in the issue report or comments. — Evidence from S2 states 'A significant portion of the issues (32.67%) in SWE-Bench have solutions directly provided in the issue report or comments.'
- **supported**: 31.08% of SWE-bench test cases are not comprehensive enough to catch incorrect or incomplete fixes. — Evidence from S2 states 'Another issue is the presence of weak test cases (31.08%). These tests are not comprehensive enough to catch incorrect or incomplete fixes.'
- **supported**: 63.75% of fixes by SWE-Agent + GPT-4 on SWE-bench are suspicious. — Evidence from S2 states 'Suspicious Fixes: 63.75% of the fixes were suspicious. These suspicious fixes either stemmed from solution leakage or passed weak test cases despite being incorrect or incomplete.'
- **supported**: SWE-bench Verified is a human-curated subset of 500 instances, of which 161 require only one- to two-line modifications. — Evidence from S3 states 'SWE-Bench Verified includes a substantial proportion of relatively trivial problems (161 out of 500) that require only one- to two-line modifications.'
- **supported**: SWE-Bench Pro contains 1,865 problems sourced from 41 actively maintained repositories, with an average patch size of 107.4 lines across 4.1 files. — Evidence from S3 states 'SWE-Bench Pro contains 1,865 problems sourced from a diverse set of 41 actively maintained repositories' and 'On average, the reference solutions span 107.4 lines of code across 4.1 files.'
- **supported**: State-of-the-art models achieve at most 23.3% Pass@1 on the public set of SWE-Bench Pro. — Evidence from S3 states 'LLM agents achieve only modest resolution rates on SWE-Bench Pro (≤23.3% on the public set; ≤17.8% on the commercial set).'
- **supported**: SWE-Bench Pro uses contamination-resistant strategies: selecting GPL-licensed repositories for the public and held-out sets and acquiring proprietary codebases for a commercial evaluation set. — Evidence from S3 states 'Exclusively selecting repositories distributed under strong copyleft licenses (GPL) to construct a public set (11 repositories) and a held-out set (12 repositories), and (2) acquiring commercial codebases from real startups.'

### Final Evaluation

- coverage: 2/5
- citation_quality: 1/5
- factuality: 2/5
- analysis_depth: 3/5
- presentation: 3/5
- overall: 2/5

Strengths:
- Detailed characterization of SWE-bench, SWE-bench Verified, SWE-Bench Pro, and SWE-Bench+, with specific statistics on leakage, weak tests, and trivial instances.
- Clear distinction between static analysis metrics (precision, recall, actionability) and repair metrics (plausible vs. correct, pass@k), with a helpful terminology table.
- Failure mode taxonomy from SWE-Bench Pro is well-presented and diagnostically useful.
- Insightful discussion of contaminaton resistance strategies (GPL repos, commercial codebases).
- Structured evidence table and explicit limitations section improve readability and transparency.

Weaknesses:
- Critical coverage failure: Defects4J, Juliet, and SV-COMP are discussed only at a conceptual level with explicit disclaimers that no admitted sources support those sections. This violates the research plan's requirement to characterize all four benchmarks and provide specific details.
- Citation quality is poor: the report is essentially a two-source review (S2, S3/S5). The plan demanded primary documentation, empirical papers, and critiques for each benchmark; only SWE-bench variants are covered.
- Factuality for Defects4J, Juliet, and SV-COMP is zero—no claims about those benchmarks can be verified against the admitted source register, despite being presented as findings.
- No evidence tables comparing all four benchmarks or mapping metrics across them, as the plan implied.
- The report explicitly states that key metrics (precision, recall, actionability for static analysis) lack empirical support from admitted sources, undermining the factuality of those sections.
- Follow-up recommendations are speculative when they involve benchmarks not covered by evidence (e.g., cross-benchmark leakage audit, multi-language extension).

Follow-up recommendations:
- Obtain primary documentation (NIST Juliet, SV-COMP rulebook, Defects4J readme) and empirical studies for the three missing benchmarks to achieve full coverage.
- Replicate the fix analysis from S2 on SWE-bench Verified with multiple frontier models to confirm or refute the saturation claim.
- Conduct a contamination check on the GPL repositories used in SWE-Bench Pro to validate the contamination-resistance strategy.
- Design a quantitative actionability metric for static analysis findings and evaluate it on a benchmark like Juliet or a real-world dataset.
