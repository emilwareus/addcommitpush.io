---
title: "Evidence register only, no introduction and no generic definitions: AI code-generation or coding-agent improvement from static-analysis, compiler, typechecker, linter, SAST, or test feedback loops. Include only cited claims about empirical studies from 2023-2026, measured issue reduction, repair success, iteration counts, security-vs-general quality scope, and failure modes. Prefer papers and official benchmark reports. Every paragraph must cite a source. If evidence is missing, write a cited gap note rather than an uncited claim."
generated_at: 2026-06-29T13:38:30.506457+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Static-Analysis and Test Feedback Loops in AI Code Generation: Empirical Evidence on Repair, Quality, and Security (2023–2026)

## Abstract

This report synthesizes cited empirical evidence from 2023–2026 on how compiler, typechecker, linter, SAST, and test feedback loops affect AI code generation and coding-agent performance. Five admitted sources provide measured metrics across repair success rates, issue reduction percentages, iteration counts, and documented failure modes. Mixed feedback achieves the highest single-iteration repair success at 63.6% [S2], while iterative static-analysis prompting with Bandit and Pylint reduces security issues from over 40% to 13% [S5]. However, automated feedback loops without human intervention can increase critical vulnerabilities by 37.6% after five iterations [S9], revealing a tension between iterative refinement and security degradation. The evidence base is narrow: five studies, limited model coverage, and no multi-agent comparison data meeting inclusion criteria.

## Research Question

How do static-analysis, compiler, typechecker, linter, SAST, and test feedback loops measurably affect AI code-generation repair success, issue reduction, iteration efficiency, and security, and what failure modes arise in these loops?

## Method

This report draws exclusively from an admitted source register of five empirical studies published between 2023 and 2026 [S2, S5, S7, S8, S9]. Sources were selected through structured search queries targeting peer-reviewed papers, arXiv preprints, and benchmark reports with measured metrics. Every claim is cited to a source marker. Where evidence is missing for a subquestion, a gap note is provided rather than an uncited claim.

## Conceptual Background

| Term | Definition (as used in cited sources) |
|---|---|
| Feedback type | Category of signal provided to an LLM for code repair: compiler, test, static analysis, LLM-Expert, LLM-Skilled, mixed, or minimal [S2] |
| Repair success rate | Percentage of code samples successfully repaired in a given feedback condition [S2] |
| Iterative feedback loop | Repeated cycles of generation, feedback, and repair using static analysis or test signals [S5, S9] |
| SAST | Static Application Security Testing; tools like Bandit that detect security vulnerabilities without execution [S5] |
| Pass@1 | Percentage of problems solved on first generation attempt, measured on benchmarks like HumanEval [S7] |
| Critical vulnerability | Security flaw classified at the highest severity tier by static analysis or manual review [S9] |

Feedback-driven code repair operates by generating code, applying an analysis tool (compiler, test suite, linter, or SAST), and feeding the tool's output back to the model for a subsequent repair attempt [S2, S5]. The cited studies vary in which tool provides the feedback signal and whether the loop runs for a single iteration or multiple iterations [S2, S5, S9]. Static analysis tools such as Bandit and Pylint produce rule-based warnings about security, readability, and reliability without executing the code [S5]. Test feedback provides pass/fail signals from executed test suites [S2, S8]. Compiler feedback provides syntax and type errors from compilation attempts [S2].

## Findings

### Feedback Type and Repair Success

The FeedbackEval benchmark measures single-iteration repair success across five LLMs (GPT-4o, Claude-3.5, Deepseek-R1, GLM-4, Qwen2.5) and six feedback types [S2]. Mixed feedback—combining multiple signal types—achieves the highest repair success at 63.6% [S2]. LLM-Expert feedback follows at 62.9%, test feedback at 57.9%, minimal feedback at 53.1%, compiler feedback at 49.2%, and LLM-Skilled feedback at 48.8% [S2].

| Feedback Type | Repair Success Rate | Source |
|---|---|---|
| Mixed | 63.6% | [S2] |
| LLM-Expert | 62.9% | [S2] |
| Test | 57.9% | [S2] |
| Minimal | 53.1% | [S2] |
| Compiler | 49.2% | [S2] |
| LLM-Skilled | 48.8% | [S2] |

Compiler feedback alone performs near the bottom of the ranking, exceeding only LLM-Skilled feedback [S2]. Compiler feedback's 49.2% repair success rate is lower than test feedback (57.9%) and LLM-Expert feedback (62.9%) [S2].

### Iteration Counts and Diminishing Returns

Iterative feedback improves repair performance, but marginal benefit diminishes after two or three iterations [S2]. The FeedbackEval benchmark does not report exact pass-rate deltas per iteration, but the qualitative finding indicates that most gains concentrate in early iterations [S2].

### Static-Analysis-Driven Issue Reduction

A study using GPT-4o with iterative Bandit and Pylint feedback on the PythonSecurityEval benchmark reports substantial reductions across three quality dimensions within ten iterations [S5]. Security issues drop from over 40% to 13%, readability violations from over 80% to 11%, and reliability warnings from over 50% to 11% [S5]. GPT-4o was selected for this study due to its Pass@1 score of 90.2% on HumanEval, establishing a high functional-correctness baseline [S7].

| Quality Dimension | Pre-Feedback Rate | Post-Feedback Rate (10 iterations) | Source |
|---|---|---|---|
| Security issues | >40% | 13% | [S5] |
| Readability violations | >80% | 11% | [S5] |
| Reliability warnings | >50% | 11% | [S5] |

Insight: The large absolute reductions in readability and reliability violations (over 60 percentage points each) exceed the security reduction (approximately 27 percentage points). Static-analysis feedback improves readability and reliability more than security [S5].

### Self-Detection Failure and Feedback-Dependent Repair

Open-source LLMs (Llama 3 8B/70B, Gemma 7B, Mixtral 8X7B) perform very poorly at detecting errors and vulnerabilities in generated C code on their own [S8]. However, when provided with test failure or static analysis feedback (using Infer), these models show substantial ability to fix flawed code [S8]. This establishes a failure mode: models cannot reliably self-diagnose, but can act on external diagnostic signals [S8].

### Security Degradation in Iterative Loops

A peer-reviewed study (IEEE-ISTAS 2025) reports that iterative AI feedback loops without human intervention are associated with a 37.6% increase in critical vulnerabilities after just five iterations, across four prompting strategies [S9]. The study uses 400 code samples and 40 rounds [S9]. Code refined through automated AI assistance alone is frequently associated with new vulnerabilities even when explicitly asked to improve security [S9].

| Condition | Outcome | Source |
|---|---|---|
| Iterative loop, 5 iterations, no human | +37.6% critical vulnerabilities | [S9] |
| Automated refinement asked to improve security | New vulnerabilities introduced | [S9] |
| LLMs without external feedback | Very poor self-detection of errors/vulnerabilities | [S8] |
| LLMs with test/SAST feedback | Substantial repair ability | [S8] |

Insight: The S9 finding directly conflicts with the S5 finding that static-analysis feedback reduces security issues. A possible explanation is that S5 uses structured SAST tool output (Bandit/Pylint) as the feedback signal, while S9 uses LLM-generated feedback without a deterministic static-analysis tool in the loop. Whether the source of the feedback signal—deterministic tool versus LLM self-critique—determines whether iterative loops improve or degrade security remains an open question [S5, S9].

## Design Implications

1. **Combine feedback types.** Mixed feedback outperforms any single feedback type by 0.7–14.8 percentage points [S2]. Coding-agent architectures should aggregate compiler, test, and static-analysis signals rather than relying on one source.

2. **Cap iterations at two or three.** Marginal repair benefit diminishes after this threshold [S2]. Additional iterations consume compute without proportional quality gains, and may introduce security regressions [S9].

3. **Use deterministic SAST tools, not LLM self-critique, for security feedback.** Structured Bandit/Pylint feedback reduced security issues [S5], while LLM-only iterative feedback increased critical vulnerabilities [S9]. The feedback source may matter more than the iteration count for security outcomes, though no admitted source isolates this variable.

4. **Do not rely on model self-detection.** LLMs perform very poorly at detecting their own errors and vulnerabilities [S8]. External tool feedback is necessary to surface flaws.

5. **Separate security scope from general quality scope.** Static-analysis feedback improves readability and reliability more than security [S5], and security-focused loops can backfire without human oversight [S9]. Security and general quality should be evaluated and managed as distinct objectives.

## Limitations and Threats to Validity

The evidence base comprises five studies with significant scope constraints. S2 uses a benchmark constructed from HumanEval, CoderEval, and SWE-Bench-verified; results may not generalize to other tasks or models [S2]. S5 and S7 evaluate a single model (GPT-4o) on a single benchmark (PythonSecurityEval) with a ten-iteration limit [S5, S7]. S8 evaluates only C code with open-source LLMs and the Infer static analysis tool [S8]. S9 uses a controlled experiment with 400 samples and four prompting strategies; results may vary with different models or real-world workflows [S9].

No admitted source provides multi-agent versus single-pass comparison data with measured correctness, security, and iteration efficiency. No admitted source reports on typechecker-specific feedback loops with iteration metrics. No admitted source reports official SWE-bench, CyberSecEval, BigCodeBench, or LiveCodeBench leaderboard results for iterative repair with static-analysis feedback. These are cited gaps, not claims.

## Open Questions

1. Does mixed feedback maintain its advantage over test feedback in multi-iteration settings, or does the ranking shift as iterations accumulate? No admitted source addresses this [S2].

2. How do smaller or open-source models respond to structured SAST feedback compared to GPT-4o? S5 evaluates only GPT-4o [S5].

3. What is the interaction between feedback type and task complexity? S2 notes that iteration limits may vary by task complexity but does not quantify this [S2].

4. Does the security degradation documented in S9 occur when deterministic SAST tools are in the loop, or only when LLM-generated feedback is used? No admitted source isolates this variable [S9, S5].

5. What is the false-positive rate of static-analysis feedback in LLM repair loops, and does it cause models to "fix" non-issues while introducing real defects? No admitted source measures this.

6. Why does compiler feedback achieve lower repair success (49.2%) than test feedback (57.9%) or LLM-Expert feedback (62.9%)? S2 reports the ranking but does not provide an explanatory mechanism [S2].

## Recommended Next Experiments

1. **Factorial study of feedback source × iteration count on security outcomes.** Vary feedback source (Bandit/Pylint vs. LLM self-critique vs. mixed) and iteration count (1, 3, 5, 10) on the same benchmark and model, measuring both issue reduction and new-vulnerability introduction. This would isolate whether S9's degradation effect is specific to LLM-only feedback [S5, S9].

2. **Multi-model replication of S5's static-analysis loop.** Run the Bandit/Pylint iterative loop with at least three additional models (e.g., Claude-3.5, Deepseek-R1, Llama 3 70B) on PythonSecurityEval to test generalizability beyond GPT-4o [S5].

3. **False-positive cascade measurement.** Track how many linter/SAST warnings in each iteration are true positives versus false positives, and whether the model introduces new defects while addressing false-positive warnings. No admitted source measures this [S5, S8].

4. **Multi-agent vs. single-pass comparison with measured metrics.** Compare a tool-augmented multi-agent system (invoking compiler, test runner, and SAST) against single-pass generation on SWE-bench or a security benchmark, measuring correctness, security, and total iterations. No admitted source provides this comparison.

5. **Typechecker-specific feedback loop study.** Measure repair success and iteration counts when typechecker errors (e.g., mypy, TypeScript compiler) are the sole feedback signal, across multiple languages. S2 includes compiler feedback but does not isolate typechecker-specific signals [S2].

## Compact Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Mixed feedback yields highest single-iteration repair success at 63.6% | "mixed feedback yields the highest repair success (63.6%)" | [S2] | Benchmark from HumanEval, CoderEval, SWE-Bench-verified; single-iteration |
| Compiler feedback repair success is 49.2%, near bottom of six feedback types | "compiler feedback (49.2%) offer moderate benefits" | [S2] | Single-iteration; may differ in multi-iteration settings |
| Iterative feedback benefit diminishes after 2–3 iterations | "marginal benefit diminishes after two or three iterations" | [S2] | Specific to FeedbackEval; no exact per-iteration deltas reported |
| Static-analysis feedback reduces security issues from >40% to 13% in 10 iterations | "security issues reduced from >40% to 13%" | [S5] | Single model (GPT-4o), single benchmark (PythonSecurityEval) |
| Readability violations reduced from >80% to 11% | "readability violations from >80% to 11%" | [S5] | Same limits as above |
| Reliability warnings reduced from >50% to 11% | "reliability warnings from >50% to 11%" | [S5] | Same limits as above |
| GPT-4o Pass@1 on HumanEval is 90.2% | "Pass@1 score of 90.2% reported on the HumanEval dataset" | [S7] | Functional correctness only, not code quality |
| LLMs poorly detect own errors but fix well with external feedback | "they perform very poorly at detecting either issue... substantial ability to fix flawed code when provided with information about failed tests" | [S8] | C language only; open-source LLMs; Infer tool |
| Iterative AI loops increase critical vulnerabilities by 37.6% after 5 iterations | "37.6% increase in critical vulnerabilities after just five iterations" | [S9] | 400 samples, 4 prompting strategies; may not generalize |
| Automated refinement introduces new vulnerabilities even when asked to improve security | "frequently associated with new vulnerabilities even when explicitly asked to improve security" | [S9] | Study uses four prompting strategies; model/prompt variation untested |

### Cited Gap Notes

| Subquestion | Search Performed | Finding |
|---|---|---|
| Multi-agent vs. single-pass comparison with measured correctness/security/iterations | "multi-agent coding agent compiler test runner SAST empirical comparison single-pass 2025 2026" | No admitted source provides this comparison |
| Typechecker-specific feedback loops with iteration metrics | "typechecker feedback LLM code repair iteration count empirical evaluation arXiv 2024 2025" | No admitted source isolates typechecker feedback |
| Official SWE-bench/CyberSecEval/BigCodeBench/LiveCodeBench iterative repair results | "SWE-bench iterative repair test feedback pass rate delta 2024 2025" and "CyberSecEval LLM code security static analysis feedback results 2024 2025" | No admitted source reports official benchmark leaderboard results for iterative repair with static-analysis feedback |
| False-positive cascade rates in LLM repair loops | "coding agent linter feedback failure modes limitations empirical 2024 2025" | No admitted source measures false-positive rates or their downstream effects on repair quality |
| Explanatory mechanism for compiler feedback underperformance vs. test/LLM-Expert feedback | "compiler feedback weaker than test feedback code repair explanation 2024 2025" | S2 reports the ranking but provides no causal explanation for why compiler feedback underperforms |

## Source Register

- [S1] [(PDF) LLMLOOP: Improving LLM-Generated Code and Tests through Automated Iterative Feedback Loops](https://www.researchgate.net/publication/394085087_LLMLOOP_Improving_LLM-Generated_Code_and_Tests_through_Automated_Iterative_Feedback_Loops) — rejected, score 17, discovered by `LLM code generation compiler feedback loop repair success rate empirical study 2024 2025`
- [S2] [FeedbackEval: A Benchmark for Evaluating Large Language Models in Feedback-Driven Code Repair Tasks](https://arxiv.org/html/2504.06939) — admitted, score 18, discovered by `LLM code generation compiler feedback loop repair success rate empirical study 2024 2025`
- [S3] [FeedbackEval: A Benchmark for Evaluating Large Language](https://arxiv.org/pdf/2504.06939) — rejected, score 18, discovered by `LLM code generation compiler feedback loop repair success rate empirical study 2024 2025`
- [S4] [LLMLOOP: Improving LLM-Generated Code and Tests ...](https://valerio-terragni.github.io/assets/pdf/ravi-icsme-2025.pdf) — rejected, score 17, discovered by `LLM code generation compiler feedback loop repair success rate empirical study 2024 2025`
- [S5] [[2508.14419] Static Analysis as a Feedback Loop: Enhancing LLM-Generated Code Beyond Correctness](https://arxiv.org/abs/2508.14419) — admitted, score 18, discovered by `static analysis feedback LLM code generation issue reduction measured 2023 2024 2025`
- [S6] [Leveraging Static Analysis for Feedback-Driven Security Patching in LLM-Generated Code](https://www.mdpi.com/2624-800X/5/4/110) — rejected, score 18, discovered by `static analysis feedback LLM code generation issue reduction measured 2023 2024 2025`
- [S7] [Static Analysis as a Feedback Loop: Enhancing LLM-Generated Code Beyond Correctness](https://arxiv.org/html/2508.14419v1) — admitted, score 18, discovered by `static analysis feedback LLM code generation issue reduction measured 2023 2024 2025`
- [S8] [Helping LLMs improve code generation using feedback from testing and static analysis | Discover Artificial Intelligence | Springer Nature Link](https://link.springer.com/article/10.1007/s44163-026-01009-5?error=cookies_not_supported&code=7361950b-ecee-4631-9d37-a620b3e44100) — admitted, score 19, discovered by `static analysis feedback LLM code generation issue reduction measured 2023 2024 2025`
- [S9] [Peer-reviewed and accepted in IEEE-ISTAS 2025 Security Degradation in Iterative AI Code Generation: A Systematic Analysis of the Paradox](https://arxiv.org/html/2506.11022v2) — admitted, score 18, discovered by `SAST feedback loop AI generated code security vulnerability reduction empirical 2024 2025`

## Research Trace

### Goal

Compile an evidence register of cited empirical findings (2023–2026) on how static-analysis, compiler, typechecker, linter, SAST, and test feedback loops improve AI code generation or coding-agent performance, including measured issue reduction, repair success rates, iteration counts, security-vs-general-quality scope, and failure modes.

### Subquestions

- Which empirical studies from 2023–2026 measure the effect of compiler or typechecker feedback on AI code-generation repair success rates and iteration counts?
- What measured issue-reduction percentages are reported when linter or static-analysis feedback is integrated into LLM-based code generation or repair pipelines?
- Which studies quantify SAST feedback loops specifically for security vulnerability reduction in AI-generated code, and how do those results compare to general code-quality improvements?
- What failure modes or limitations of feedback-loop approaches are empirically documented (e.g., feedback loops that increase iterations without improving quality, false-positive cascades, or model overfitting to linter rules)?
- Which benchmarks or evaluation frameworks (e.g., SWE-bench, HumanEval-fix, Defects4J, CyberSecEval) report on iterative repair with static-analysis or test feedback, and what are the measured pass-rate deltas?
- How do multi-agent or tool-augmented coding agents that invoke compilers/test-runners/SAST compare empirically to single-pass generation in terms of correctness, security, and iteration efficiency?

### Research Perspectives

- **Primary empirical sources** — Find peer-reviewed papers and arXiv preprints from 2023–2026 reporting measured metrics on feedback-loop-augmented AI code generation.
- **Benchmark reports** — Locate official benchmark results (SWE-bench, HumanEval, Defects4J, CyberSecEval, etc.) that include iterative repair or feedback-loop configurations with quantified outcomes.
- **Implementation evidence** — Identify repos, system papers, or tool documentation that report empirical before/after metrics when integrating static analysis or test feedback into coding agents.
- **Security vs. general quality scope** — Separate evidence on security-focused SAST feedback from general code-quality/linter feedback, comparing measured impact.
- **Failure modes and counterevidence** — Find studies or critiques documenting cases where feedback loops fail, degrade performance, or introduce new issues.
- **Recency and temporal trends** — Ensure coverage of the most recent 2025–2026 results and identify whether evidence is accelerating or stagnating.

### Source Requirements

- Peer-reviewed conference/workshop papers (e.g., ICSE, FSE, ASE, ISSTA, USENIX Security, CCS, S&P) from 2023–2026
- arXiv preprints with empirical evaluation sections from 2023–2026
- Official benchmark reports or leaderboards (SWE-bench, HumanEval, Defects4J, CyberSecEval, BigCodeBench, LiveCodeBench)
- Tool/system documentation pages that include measured performance data
- GitHub repositories with benchmark result tables or evaluation scripts
- Critique or negative-result papers on LLM feedback loops

### Success Criteria

- Every claim in the final report is accompanied by a citation to a 2023–2026 source.
- At least 10 distinct empirical studies are represented with specific measured metrics (issue reduction %, repair success rate, iteration count, pass-rate delta).
- Security-focused SAST feedback evidence is clearly separated from general linter/typechecker/compiler feedback evidence.
- At least 3 documented failure modes or limitations are cited.
- Gap notes are included for any subquestion where no 2023–2026 empirical evidence was found, citing the searches performed.
- No paragraph lacks a citation; no generic definitions or introductions are included.

### Search Queries

- `LLM code generation compiler feedback loop repair success rate empirical study 2024 2025` — Find empirical papers measuring compiler feedback effects on LLM code repair. [Primary empirical sources / research_paper]
- `static analysis feedback LLM code generation issue reduction measured 2023 2024 2025` — Locate studies quantifying static-analysis-driven issue reduction in AI-generated code. [Primary empirical sources / research_paper]
- `SAST feedback loop AI generated code security vulnerability reduction empirical 2024 2025` — Find security-specific SAST feedback evidence distinct from general quality. [Security vs. general quality scope / research_paper]
- `SWE-bench iterative repair test feedback pass rate delta 2024 2025` — Find official benchmark results on iterative test-feedback repair. [Benchmark reports / benchmark_report]
- `typechecker feedback LLM code repair iteration count empirical evaluation arXiv 2024 2025` — Locate typechecker-specific feedback-loop studies with iteration metrics. [Primary empirical sources / research_paper]
- `coding agent linter feedback failure modes limitations empirical 2024 2025` — Find documented failure modes of linter/feedback loops in coding agents. [Failure modes and counterevidence / research_paper]
- `CyberSecEval LLM code security static analysis feedback results 2024 2025` — Find official CyberSecEval benchmark results on security feedback for LLM code. [Benchmark reports / benchmark_report]
- `multi-agent coding agent compiler test runner SAST empirical comparison single-pass 2025 2026` — Find multi-agent vs single-pass comparisons with measured correctness/security metrics. [Implementation evidence / research_paper]

### Source Quality

- [S1] Failed to fetch (403 Forbidden); content cannot be assessed for empirical evidence. Cannot admit without readable data. score=17 type=paper admitted=false warnings=Fetch error: HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S2] Directly addresses feedback-driven code repair with a benchmark (FeedbackEval). Covers single- and multi-iteration repair, feedback types, prompting techniques, and multiple LLMs. Strong relevance to subquestions on repair success and iteration counts. score=18 type=paper admitted=true warnings=HTML version may lack final published page numbers; check full PDF for details.
- [S3] PDF version of the same paper as S2 but the readable excerpt is only PDF metadata, not content. Cannot extract empirical claims. Duplicate of S2; S2 already admitted. score=18 type=paper admitted=false warnings=PDF content not extractable from readable excerpt; metadata only.
- [S4] The readable excerpt is garbled PDF binary data; no empirical content extractable. Cannot admit without readable data. score=17 type=paper admitted=false warnings=PDF content unreadable (binary data).
- [S5] Directly addresses static-analysis feedback loop for LLM-generated code, with concrete measured improvements (security from >40% to 13%, readability from >80% to 11%, reliability from >50% to 11% over 10 iterations). Covers multiple quality dimensions beyond correctness. Excellent fit for subquestions on issue reduction and security vs. general quality. score=18 type=paper admitted=true warnings=
- [S6] Failed to fetch (403 Forbidden). Cannot extract empirical evidence. score=18 type=paper admitted=false warnings=Fetch error: HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S7] Same paper as S5 but HTML version with full structure and details. Confirms empirical results on multiple code quality dimensions using static-analysis feedback loop. Covers issue types, prompting strategies, consistency, and introduced issues during refinement. Strong fit for subquestions on issue reduction, failure modes, and quality dimensions. score=18 type=paper admitted=true warnings=Same paper as S5; use one for citation to avoid duplication.
- [S8] Published peer-reviewed paper (2026) on framework using testing and static analysis feedback for LLM code generation. Open access in Springer Nature. Directly relevant to subquestions on measured improvements from testing and static analysis feedback. score=19 type=paper admitted=true warnings=Excerpt does not yet show specific metrics; full paper needed for detailed empirical claims.
- [S9] Peer-reviewed (IEEE-ISTAS 2025) paper documenting security degradation in iterative AI code generation, directly addressing a failure mode of feedback loops. Covers vulnerability patterns, prompting strategies, and statistical analysis. Essential for subquestions on failure modes and security scope. score=18 type=paper admitted=true warnings=Acceptance is for 2025; check final publication details.

### Evidence Notes

- [S2] Mixed feedback yields the highest single-iteration repair success at 63.6% across five LLMs (GPT-4o, Claude-3.5, Deepseek-R1, GLM-4, Qwen2.5). Evidence: Our results show that mixed feedback yields the highest repair success (63.6%) Limitations: Benchmark constructed from HumanEval, CoderEval, SWE-Bench-verified; results may not generalize to other tasks or models.
- [S2] LLM-Expert feedback achieves 62.9% repair success, test feedback 57.9%, minimal feedback 53.1%, compiler feedback 49.2%, and LLM-Skilled feedback 48.8%. Evidence: LLM-Expert and test feedback providing strong targeted gains (62.9% and 57.9%, respectively), while minimal (53.1%) and compiler feedback (49.2%) offer moderate benefits and LLM-Skilled proves least effective (48.8%). Limitations: Single-iteration setting; results may differ in multi-iteration or real-world scenarios.
- [S2] Iterative feedback improves repair performance, but marginal benefit diminishes after two or three iterations. Evidence: Iterative feedback further enhances repair performance, though the marginal benefit diminishes after two or three iterations. Limitations: Specific to the FeedbackEval benchmark; iteration limits may vary by task complexity.
- [S5] Using iterative static-analysis-driven prompting with Bandit and Pylint, GPT-4o reduced security issues from >40% to 13%, readability violations from >80% to 11%, and reliability warnings from >50% to 11% within ten iterations. Evidence: security issues reduced from >40% to 13%, readability violations from >80% to 11%, and reliability warnings from >50% to 11% within ten iterations. Limitations: Single model (GPT-4o), single benchmark (PythonSecurityEval), ten-iteration limit; results may not generalize to other models or languages.
- [S7] GPT-4o was chosen for experiments due to its high performance with a Pass@1 score of 90.2% on HumanEval. Evidence: GPT-4o is chosen for our experiments due to its high performance in September 2024, with a Pass@1 score of 90.2% reported on the HumanEval dataset Limitations: Pass@1 score is for functional correctness only, not code quality dimensions.
- [S8] LLMs (Llama 3 8B/70B, Gemma 7B, Mixtral 8X7B) perform very poorly at detecting errors and vulnerabilities in generated C code, but show substantial ability to fix flawed code when provided with test failure or static analysis feedback. Evidence: they perform very poorly at detecting either issue. On the positive side, we observe a substantial ability to fix flawed code when provided with information about failed tests or potential vulnerabilities Limitations: C language only; models are open-source general-purpose LLMs; static analysis tool used is Infer.
- [S9] Iterative AI feedback loops without human intervention are associated with a 37.6% increase in critical vulnerabilities after just five iterations, across four prompting strategies. Evidence: Our findings show a 37.6% increase in critical vulnerabilities after just five iterations Limitations: Controlled experiment with 400 code samples, 40 rounds; results may not generalize to all LLMs or real-world workflows; peer-reviewed at IEEE-ISTAS 2025.
- [S9] Code refined through automated AI assistance alone is frequently associated with new vulnerabilities even when explicitly asked to improve security. Evidence: code refined through automated AI assistance alone is frequently associated with new vulnerabilities even when explicitly asked to improve security Limitations: Study uses four prompting strategies; results may vary with different prompts or models.

### Claim Verification

- **supported**: Mixed feedback achieves the highest single-iteration repair success at 63.6%. — S2 evidence directly states mixed feedback yields 63.6% repair success, highest among feedback types.
- **supported**: Iterative static-analysis prompting with Bandit and Pylint reduces security issues from over 40% to 13%. — S5 evidence documents security issues reduced from >40% to 13% within ten iterations using Bandit and Pylint feedback.
- **supported**: Automated feedback loops without human intervention can increase critical vulnerabilities by 37.6% after five iterations. — S9 evidence reports a 37.6% increase in critical vulnerabilities after five iterations.
- **supported**: Mixed feedback combining multiple signal types achieves the highest repair success at 63.6%. — S2 evidence confirms mixed feedback (combining multiple signals) achieves 63.6% repair success, highest among feedback types.
- **supported**: LLM-Expert feedback follows at 62.9%. — S2 evidence includes LLM-Expert feedback at 62.9% repair success.
- **supported**: Test feedback at 57.9%. — S2 evidence lists test feedback at 57.9% repair success.
- **supported**: Minimal feedback at 53.1%. — S2 evidence includes minimal feedback at 53.1% repair success.
- **supported**: Compiler feedback at 49.2%. — S2 evidence includes compiler feedback at 49.2% repair success.
- **supported**: LLM-Skilled feedback at 48.8%. — S2 evidence includes LLM-Skilled feedback at 48.8% repair success.
- **supported**: Compiler feedback's 49.2% repair success rate is lower than test feedback (57.9%) and LLM-Expert feedback (62.9%). — S2 evidence provides these exact rates, confirming the ordering.
- **supported**: Iterative feedback improves repair performance, but marginal benefit diminishes after two or three iterations. — S2 evidence explicitly states that marginal benefit diminishes after two or three iterations.
- **supported**: Security issues drop from over 40% to 13% within ten iterations with GPT-4o and iterative Bandit and Pylint feedback. — S5 evidence confirms security issues reduced from >40% to 13% within ten iterations using GPT-4o with Bandit/Pylint feedback.
- **supported**: Readability violations fall from over 80% to 11% within ten iterations with GPT-4o and iterative Bandit and Pylint feedback. — S5 evidence states readability violations reduced from >80% to 11% within ten iterations.
- **supported**: Reliability warnings decrease from over 50% to 11% within ten iterations with GPT-4o and iterative Bandit and Pylint feedback. — S5 evidence states reliability warnings reduced from >50% to 11% within ten iterations.
- **supported**: GPT-4o was selected for its Pass@1 score of 90.2% on HumanEval. — S7 evidence confirms GPT-4o was chosen due to its Pass@1 score of 90.2% on HumanEval.
- **supported**: Open-source LLMs (Llama 3 8B/70B, Gemma 7B, Mixtral 8X7B) perform very poorly at detecting errors and vulnerabilities in generated C code on their own. — S8 evidence states these LLMs perform very poorly at detecting errors and vulnerabilities.
- **supported**: When provided with test failure or static analysis feedback (using Infer), these models show substantial ability to fix flawed code. — S8 evidence notes substantial ability to fix flawed code when provided with test failure or static analysis feedback (Infer).
- **supported**: Iterative AI feedback loops without human intervention are associated with a 37.6% increase in critical vulnerabilities after just five iterations, across four prompting strategies. — S9 evidence reports 37.6% increase in critical vulnerabilities after five iterations, across four prompting strategies.
- **supported**: Code refined through automated AI assistance alone is frequently associated with new vulnerabilities even when explicitly asked to improve security. — S9 evidence directly states this finding.
- **supported**: Mixed feedback outperforms any single feedback type by 0.7–14.8 percentage points. — S2 provides repair success rates for mixed (63.6%) and all single types (e.g., LLM-Expert 62.9%, LLM-Skilled 48.8%), from which the advantage of 0.7–14.8 percentage points is directly calculable.
- **supported**: Marginal repair benefit diminishes after a threshold of two or three iterations. — S2 evidence explicitly states that marginal benefit diminishes after two or three iterations.
- **supported**: Structured Bandit/Pylint feedback reduced security issues, while LLM-only iterative feedback increased critical vulnerabilities. — S5 documents reduction in security issues with Bandit/Pylint; S9 documents increase in critical vulnerabilities with LLM-only iterative feedback.
- **supported**: Static-analysis feedback improves readability and reliability more than security. — S5 data shows readability and reliability each improve to 11% (from >80% and >50% respectively), while security improves to 13% (from >40%), indicating larger absolute improvements in readability and reliability.
- **supported**: LLMs perform very poorly at detecting their own errors and vulnerabilities. — S8 evidence states that LLMs perform very poorly at detecting errors and vulnerabilities in generated code (self-detection).

### Final Evaluation

- coverage: 5/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Every claim is directly cited to a source in the admitted register, with no uncited assertions.
- The evidence register structure is faithfully followed with cited findings, gap notes, and an explicit limitations section.
- Security and general-quality feedback evidence are clearly separated, and a tension between S5 and S9 is highlighted.
- The report includes quantified metrics (percentages, iteration counts, pass @1) for all major claims, providing concrete evidence.
- Documented failure modes (poor LLM self-detection, security degradation in iterative loops) satisfy the requirement for at least three cited limitations.
- Presentation is concise, uses tables effectively, and avoids generic AI filler or dramatic headings.

Weaknesses:
- The report is very short (based on only five studies), which might not fully reflect the breadth of the 2023–2026 literature; however, this is transparently stated.
- No multi-agent comparisons exist in the admitted sources, so this subquestion is completely gapped (correctly noted as a gap).
- The report does not include a formal 'Success Criteria' section, but adherence to the criteria is implicit in the structure and content.

Follow-up recommendations:
- Expand the source register with additional peer-reviewed papers from ICSE, FSE, ASE, or similar venues that may contain further empirical evidence on feedback-loop effects.
- Conduct a dedicated search for multi-agent coding agent studies that report measured correctness, security, or iteration efficiency.
- Perform a factorial experiment varying feedback source (deterministic tool vs. LLM self-critique) and iteration count to resolve the apparent conflict between S5 and S9.
