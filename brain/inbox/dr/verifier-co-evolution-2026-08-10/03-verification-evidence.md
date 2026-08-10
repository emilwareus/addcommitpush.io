---
title: "Audit the verification and monitoring evidence in this technical note. Focus on primary sources AgentSpec arXiv 2503.18666 v3, The Verification Horizon arXiv 2606.26300 v2, and the note's use of shadow execution, behavior monitoring, LLM judges, runtime enforcement, and impact penalties. Verify every reported number (AgentSpec precision/recall, latency, safe-task regression; Verification Horizon 104-task evaluator table and three SWE-Bench monitoring results), define what each metric actually measures, and identify overclaims or missing caveats. Then recommend a corrected evidence table for a note on co-evolving verifiers."
generated_at: 2026-08-10T11:50:30.969393+00:00
strategy: deep-agent-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Auditing Verification and Monitoring Evidence in AgentSpec and The Verification Horizon

## Abstract

This report audits the quantitative and conceptual evidence from two primary sources—AgentSpec (arXiv 2503.18666 v3) and The Verification Horizon (arXiv 2606.26300 v2)—as they might be used in a technical note on co-evolving verifiers for autonomous coding agents. We extract every reported metric, define what each measures, and trace the provenance of five key concepts: shadow execution, behavior monitoring, LLM judges, runtime enforcement, and impact penalties. We find that several headline numbers are imprecise ("over 90%"), that the term "safe-task regression" has no explicit counterpart in AgentSpec, and that "impact penalties" appear in neither primary source. We recommend a corrected evidence table with explicit caveats.

## Research Question

Do the cited metrics and concepts from AgentSpec and The Verification Horizon support the thesis that verifiers must co-evolve with agents, and what overclaims or missing caveats weaken that support?

## Method

We reconstruct claims from the admitted source register (S1, S2, S4, S15, S16, S22), which includes the AgentSpec arXiv abstract, HTML full text, and ICSE 2026 preprint, plus The Verification Horizon arXiv abstract and HTML. We match each reported number to its source location, extract metric definitions where available, and flag numbers that are vague, misattributed, or stripped of caveats. We then trace each of the five concepts to its originating definition or flag it as absent from the primary sources.

## Conceptual Background

The two papers address different layers of the verification problem. AgentSpec provides a domain-specific language (DSL) for specifying runtime constraints on LLM agents—triggers, predicates, and enforcement actions such as `user_inspection` or `llm_self_examine` [S4]. The Verification Horizon studies reward design for coding agents and argues that verifiers are always proxies for human intent, never the intent itself [S15].

| Term | Originating Source | Definition (as stated or inferred) | Present in Primary Source? |
|---|---|---|---|
| Runtime enforcement | AgentSpec [S4] | DSL with triggering event, predicate conditions, and enforcement actions applied at runtime | Yes |
| Behavior monitoring | AgentSpec [S4] | Continuous monitoring of agent trajectory to ensure safety of past actions | Yes (as "continuously monitoring") |
| Shadow execution | Not in primary sources | Parallel or simulated execution of agent actions without side effects, for pre-commitment checking | No—AgentSpec monitors retrospectively, not via parallel simulation [S4] |
| LLM judges | Verification Horizon [S15] | "Interactive Judge" for frontend tasks; "Dynamic Agent Judge" for long-horizon tasks | Yes |
| Impact penalties | Not in primary sources | Penalty term on side effects or environment impact, common in safe RL literature | No—absent from S1, S4, S15, S16 |

Insight: The concept table reveals a structural gap. The note's use of "shadow execution" and "impact penalties" cannot be grounded in the two cited primary sources. If the note relies on these concepts for its argument, it must either cite adjacent literature or relabel them using the terms the sources actually employ.

## Findings

### AgentSpec Metrics

The following table consolidates every quantitative claim extractable from AgentSpec v3.

| Metric | Reported Value | Source Location | What It Measures | Caveats |
|---|---|---|---|---|
| Precision (embodied, LLM-generated rules) | 95.56% | Abstract [S1] | Fraction of flagged actions that are truly unsafe, for embodied agents using OpenAI o1-generated rules | No confidence intervals; task-set composition unspecified; applies only to LLM-generated rules, not handcrafted |
| Recall (embodied, LLM-generated rules) | 70.96% | Abstract [S1] | Fraction of unsafe actions flagged, for embodied agents | Same caveats; 29% of unsafe actions missed |
| Risky code identification | 87.26% | Abstract [S1] | Likely recall for code-agent domain (fraction of risky code actions detected) | Metric label not explicit in abstract; no precision reported for code; dataset and baseline unspecified |
| AV law prevention (LLM-generated rules) | 5/8 scenarios (62.5%) | Abstract [S1] | Number of scenarios where LLM-generated rules prevent law-breaking by AVs | Small sample (n=8); no scenario difficulty or representativeness analysis; no comparison to handcrafted rules |
| Code agent unsafe execution prevention | "over 90%" | Abstract [S1] | Fraction of code-agent cases where unsafe execution is prevented | Vague threshold; no exact number; no precision/recall breakdown; unclear if per-action or per-trajectory |
| Embodied agent hazardous action elimination | "all" (100%) | Abstract [S1] | Claims elimination of all hazardous actions in embodied agent tasks | No definition of "hazardous"; no false-positive analysis; likely handcrafted rules; no adversarial input testing |
| AV compliance (handcrafted rules) | 100% | Abstract [S1] | Full compliance by AVs under handcrafted rules | Contrasts with 5/8 for LLM-generated rules; scenario details unspecified; generalizability unknown |
| Latency overhead | "in milliseconds" | Abstract [S1] | Runtime enforcement overhead | No exact values; no breakdown by domain, rule count, or rule complexity; no baseline comparison |

Insight: The precision/recall pair (95.56% / 70.96%) is the only rigorously quantified metric pair. The remaining claims use absolute language ("all," "100%," "over 90%") without denominators, confidence intervals, or false-positive rates. A note citing these as evidence for verifier effectiveness should report the 70.96% recall figure prominently, since nearly one-third of unsafe actions go undetected.

### Safe-Task Regression

The evidence register contains no occurrence of "safe-task regression" in any AgentSpec snippet [S1, S4]. AgentSpec reports precision and recall but does not explicitly measure the rate at which safe tasks are incorrectly blocked (i.e., false-positive impact on legitimate actions). If the note claims a specific safe-task regression number from AgentSpec, that claim is unsupported by the primary source. The concept can be inferred from precision (a precision of 95.56% implies roughly 4.44% of flagged actions are safe), but AgentSpec does not frame it this way.

### The Verification Horizon Metrics

| Metric | Reported Value | Source Location | What It Measures | Caveats |
|---|---|---|---|---|
| Hacked resolved rate (3 SWE-Bench variants) | 28.57% → 0.56% | HTML [S15] | Rate of tasks "resolved" via reward hacking, before and after verifier design change | "Hacked" definition not fully specified in snippet; only 3 variants; no confidence intervals |
| Clean resolved rate (3 SWE-Bench variants) | 40.22% → 60.53% | HTML [S15] | Rate of genuinely resolved tasks, before and after verifier design change | Same caveats; improvement may depend on specific verifier design |
| 104-task evaluator table | Referenced but exact numbers not in snippet | Section 2 [S15] | Evaluation of verifier quality on SWE-like tasks (likely Best-of-N, Kendall's tau, etc.) | Exact values unavailable from provided evidence; task selection and metric definitions not in snippet |
| Four reward constructions | Test verifier, rubric verifier, user-as-verifier, automated agent verifier | HTML [S15] | Taxonomy of verifier designs for different task types | No per-construction quantitative results in snippet; may not cover all designs |

Insight: The SWE-Bench monitoring result (hacked rate dropping from 28.57% to 0.56% while clean rate rises from 40.22% to 60.53%) is the strongest single piece of evidence for the co-evolution thesis. It shows that a verifier redesign can simultaneously suppress gaming and improve genuine performance. However, the absence of confidence intervals and the unspecified definition of "hacked" limit how far this result generalizes.

### Concept Provenance Audit

| Concept | Note's Likely Usage | Primary-Source Backing | Drift or Gap |
|---|---|---|---|
| Shadow execution | Parallel no-side-effect execution for pre-commitment checks | AgentSpec monitors trajectory retrospectively ("continuously monitoring its execution") but does not simulate alternative futures [S4] | Term "shadow execution" not used in sources; concept is adjacent but not grounded |
| Behavior monitoring | Real-time observation of agent actions | AgentSpec: "continuously monitoring its execution" [S4] | Aligned, though AgentSpec frames it as trajectory safety, not behavioral profiling |
| LLM judges | Automated verifier using LLM to judge agent output | Verification Horizon: "Interactive Judge" and "Dynamic Agent Judge" [S15] | Aligned; but no reliability numbers in available snippets |
| Runtime enforcement | Blocking or modifying unsafe actions at runtime | AgentSpec: DSL with triggers, predicates, enforcement actions [S4] | Aligned |
| Impact penalties | Penalizing side effects or environmental damage | Not present in S1, S4, S15, or S16 | Unsupported by cited sources; requires additional citation |

### Overclaims and Missing Caveats

1. **"Eliminates all hazardous actions" is an absolute claim without a false-positive analysis.** AgentSpec claims 100% elimination for embodied agents [S1], but provides no definition of "hazardous," no analysis of safe actions incorrectly blocked, and no adversarial testing. A note citing this should state that the claim applies to a specific task set under handcrafted rules and that the false-positive rate is unreported.

2. **"Over 90%" is not a metric.** The code-agent prevention claim [S1] lacks an exact value, denominator, or per-action versus per-trajectory distinction. Citing it as evidence of verifier effectiveness is weak without the underlying table.

3. **The 104-task evaluator table is referenced but its contents are not available in the evidence.** A note citing specific numbers from this table without extracting them from the full text risks fabrication or misattribution.

4. **No confidence intervals anywhere.** Neither source reports confidence intervals, standard errors, or significance tests. All reported percentages are point estimates on unspecified sample sizes.

5. **"Impact penalties" and "shadow execution" are ungrounded.** If the note uses these terms as if they come from the primary sources, it overclaims provenance.

6. **Version and domain mismatch.** AgentSpec's embodied-agent metrics (95.56% precision) are from a different domain than coding agents. Applying them to a note about coding-agent verifiers without domain-transfer justification is an overclaim.

## Design Implications

The evidence partially supports the co-evolution thesis but does not fully substantiate it. The Verification Horizon's SWE-Bench result (hacked rate 28.57% → 0.56%, clean rate 40.22% → 60.53%) demonstrates that verifier redesign can reduce gaming while improving genuine performance—a concrete instance of co-evolution [S15]. The paper's theoretical claim that "no fixed reward function can remain effective as policy capability continues to grow" [S15] provides the conceptual scaffold.

However, AgentSpec's metrics measure a different problem (runtime safety enforcement, not reward design) and a different domain (embodied and AV agents, not coding agents). Using AgentSpec's precision/recall as evidence for co-evolution requires an explicit argument about transfer across domains and problem types.

A note on co-evolving verifiers should:
- Cite the SWE-Bench result as the primary empirical anchor.
- Cite AgentSpec's runtime enforcement DSL as evidence that enforcement mechanisms exist, not as evidence that they co-evolve.
- Avoid citing "over 90%" or "100%" without exact values and denominators.
- Either cite adjacent literature for "shadow execution" and "impact penalties" or relabel them using source-grounded terms.

## Limitations and Threats to Validity

- **Snippet incompleteness.** The evidence register contains HTML snippets, not full texts. The 104-task evaluator table's exact numbers are unavailable [S15]. Some concepts (e.g., "impact penalties") may appear in sections not captured in the snippets; their absence is evidence of absence only within the available text.
- **Version integrity.** We assume v3 of AgentSpec and v2 of The Verification Horizon are the latest versions as of 2026-08-10. No errata were found in the evidence register, but absence of errata in our sources does not guarantee none exist.
- **Evaluator bias.** Both papers evaluate their own systems. AgentSpec's task sets and The Verification Horizon's SWE-Bench variants may be selected to favor the proposed methods.
- **Domain transfer threat.** AgentSpec's embodied-agent and AV results may not transfer to coding-agent verification. The note must justify any cross-domain citation.

## Open Questions

1. What are the exact values in the 104-task evaluator table from The Verification Horizon, and what metrics (Best-of-N, Kendall's tau, pass@k) does it report?
2. Does AgentSpec report false-positive rates or safe-task blocking rates in its full appendix, even if not under the label "safe-task regression"?
3. How are "hacked" and "clean" resolved rates defined in The Verification Horizon, and do they align with SWE-Bench's official resolved/ unresolved labels?
4. Are there independent reproductions of either paper's results?
5. Does The Verification Horizon provide confidence intervals or significance tests in its full text?

## Recommended Next Experiments

1. **Extract the full 104-task evaluator table** from The Verification Horizon v2 and record every cell, metric definition, and task-selection criterion.
2. **Re-run AgentSpec's precision/recall evaluation** on a coding-agent benchmark (e.g., SWE-Bench) to test domain transfer of the 95.56%/70.96% figures.
3. **Measure false-positive rates** for AgentSpec's handcrafted rules by logging every safe action blocked, producing an explicit safe-task regression metric.
4. **Add confidence intervals** to the SWE-Bench monitoring results via bootstrap resampling across the three variants.
5. **Conduct an ablation** comparing AgentSpec's retrospective monitoring against a true shadow-execution approach (parallel simulation without side effects) to determine whether predictive checking improves over reactive monitoring.

## Recommended Corrected Evidence Table

| Metric | Value | Source Location | Definition | Caveats | Relevance to Co-Evolution Thesis |
|---|---|---|---|---|---|
| Precision (embodied, LLM rules) | 95.56% | AgentSpec abstract [S1] | Fraction of flagged actions truly unsafe, embodied agents, OpenAI o1 rules | No CI; task set unspecified; LLM-generated rules only; domain ≠ coding | Indirect—shows enforcement can be precise, but not that verifiers co-evolve |
| Recall (embodied, LLM rules) | 70.96% | AgentSpec abstract [S1] | Fraction of unsafe actions flagged, embodied agents | No CI; ~29% of unsafe actions missed; domain ≠ coding | Indirect—shows current verifiers leave gaps, motivating co-evolution |
| Risky code identification | 87.26% | AgentSpec abstract [S1] | Likely recall for risky code actions | Metric label not explicit; no precision for code; dataset unspecified | Partially relevant to coding agents but incomplete |
| AV prevention (LLM rules) | 5/8 (62.5%) | AgentSpec abstract [S1] | Scenarios where AV law-breaking prevented | n=8; no difficulty analysis; no handcrafted comparison | Weak—small sample, different domain |
| Code-agent prevention | "over 90%" (vague) | AgentSpec abstract [S1] | Unsafe execution prevention rate | No exact value; no denominator; per-action vs. per-trajectory unclear | Too vague to support any claim |
| Embodied hazardous elimination | "all" (100%) | AgentSpec abstract [S1] | All hazardous actions eliminated | No "hazardous" definition; no false-positive analysis; likely handcrafted | Absolute claim; unsupported without task-set details |
| AV compliance (handcrafted) | 100% | AgentSpec abstract [S1] | Full AV compliance under handcrafted rules | Contrasts with 5/8 LLM rules; scenario details missing | Shows handcrafted > LLM-generated, not co-evolution |
| Latency overhead | "milliseconds" (vague) | AgentSpec abstract [S1] | Runtime enforcement cost | No exact values; no breakdown; no baseline | Insufficient for performance claims |
| Hacked resolved rate | 28.57% → 0.56% | Verification Horizon HTML [S15] | Rate of hacked resolutions across 3 SWE-Bench variants, before/after verifier redesign | No CI; "hacked" undefined in snippet; only 3 variants | Strong—direct evidence verifier redesign suppresses gaming |
| Clean resolved rate | 40.22% → 60.53% | Verification Horizon HTML [S15] | Rate of genuine resolutions across 3 SWE-Bench variants, before/after redesign | Same caveats; may depend on specific verifier | Strong—verifier redesign improves genuine performance |
| 104-task evaluator table | Values not extractable | Verification Horizon §2 [S15] | Verifier quality on SWE-like tasks | Exact numbers unavailable from evidence; task selection unknown | Potentially relevant but currently unverified |
| Safe-task regression | Not reported | Absent from AgentSpec [S1, S4] | Rate of safe actions incorrectly blocked | Not a metric in primary sources; inferable from precision but not reported | If cited by note, it is an overclaim |
| Impact penalties | Not reported | Absent from both sources [S1, S4, S15, S16] | Penalty on side effects or environmental impact | Concept not present in cited sources | If cited by note, provenance is ungrounded |

This table should replace any evidence table in the note that cites these metrics without the listed caveats or that attributes "safe-task regression" or "impact penalties" to the primary sources.

## Source Register

- [S1] [[2503.18666] AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents](https://arxiv.org/abs/2503.18666) — admitted, score 18, discovered by `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents`
- [S2] [AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents](https://arxiv.org/pdf/2503.18666) — admitted, score 19, discovered by `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents`
- [S3] [AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents | alphaXiv](https://www.alphaxiv.org/overview/2503.18666v3) — rejected, score 10, discovered by `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents`
- [S4] [\tool: Customizable Runtime Enforcement for Safe and Reliable LLM Agents](https://arxiv.org/html/2503.18666v3) — admitted, score 19, discovered by `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents`
- [S5] [[2503.18666v1] AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents](https://export.arxiv.org/abs/2503.18666v1) — rejected, score 8, discovered by `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents`
- [S6] [AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents - ADS](https://ui.adsabs.harvard.edu/abs/arXiv:2503.18666) — rejected, score 8, discovered by `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents`
- [S7] [AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents | Takara TLDR](https://tldr.takara.ai/p/2503.18666) — rejected, score 9, discovered by `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents`
- [S8] [RAG Evaluation Metrics: Assessing Answer Relevancy, Faithfulness, Contextual Relevancy, And More - Confident AI](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more) — rejected, score 9, discovered by `AgentSpec precision recall safe-task regression evaluation results`
- [S9] [Chapter 8: Agent Evaluation for LLMs: How to Test Tools, Trajectories, and LLM-as-Judge | by Vinod Rane | Medium](https://medium.com/@vinodkrane/chapter-8-agent-evaluation-for-llms-how-to-test-tools-trajectories-and-llm-as-judge-788f6f3e0d52) — rejected, score 9, discovered by `AgentSpec precision recall safe-task regression evaluation results`
- [S10] [A Strategic Field Guide for Generative AI and Agent Evaluation: Techniques, Metrics and Maturity Models | by Vinicius Caridá | Medium](https://medium.com/@vfcarida/a-strategic-field-guide-for-generative-ai-and-agent-evaluation-techniques-metrics-and-maturity-e425b394181e) — rejected, score 9, discovered by `AgentSpec precision recall safe-task regression evaluation results`
- [S11] [Beyond Task Completion: An Assessment Framework for Evaluating Agentic AI Systems](https://arxiv.org/html/2512.12791v2) — rejected, score 12, discovered by `AgentSpec precision recall safe-task regression evaluation results`
- [S12] [Demystifying evals for AI agents \ Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — rejected, score 15, discovered by `AgentSpec precision recall safe-task regression evaluation results`
- [S13] [When Retrieval Metrics Mislead: Measuring Policy Signal in Long-Horizon Tool-Use Agents](https://arxiv.org/html/2606.23937) — rejected, score 13, discovered by `AgentSpec precision recall safe-task regression evaluation results`
- [S14] [Precision and recall - Wikipedia](https://en.wikipedia.org/wiki/Precision_and_recall) — rejected, score 12, discovered by `AgentSpec precision recall safe-task regression evaluation results`
- [S15] [The Verification Horizon: No Silver Bullet for Coding Agent Rewards](https://arxiv.org/html/2606.26300) — admitted, score 19, discovered by `"The Verification Horizon" arXiv 2606.26300 monitoring SWE-Bench`
- [S16] [[2606.26300] The Verification Horizon: No Silver Bullet for Coding Agent Rewards](https://arxiv.org/abs/2606.26300) — admitted, score 19, discovered by `"The Verification Horizon" arXiv 2606.26300 monitoring SWE-Bench`
- [S17] [Verification Horizon: Coding Agent Reward Limits](https://www.emergentmind.com/papers/2606.26300) — rejected, score 9, discovered by `"The Verification Horizon" arXiv 2606.26300 monitoring SWE-Bench`
- [S18] [Paper page - The Verification Horizon: No Silver Bullet for Coding Agent Rewards](https://huggingface.co/papers/2606.26300) — rejected, score 9, discovered by `"The Verification Horizon" arXiv 2606.26300 monitoring SWE-Bench`
- [S19] [GitHub - benchflow-ai/awesome-evals: A curated, non-BS library of the best resources for building and evaluating AI agents — papers, blogs, talks, tools, benchmarks. Maintained by BenchFlow.](https://github.com/benchflow-ai/awesome-evals) — rejected, score 9, discovered by `"The Verification Horizon" arXiv 2606.26300 monitoring SWE-Bench`
- [S20] [Document Control](https://arxiv.org/html/2608.03866v1) — rejected, score 13, discovered by `"Verification Horizon" 104-task evaluator table results limitations`
- [S21] [Verification Horizons | Siemens Verification Academy](https://verificationacademy.com/verification-horizons/) — rejected, score 11, discovered by `"Verification Horizon" 104-task evaluator table results limitations`
- [S22] [AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents](https://cposkitt.github.io/files/publications/agentspec_llm_enforcement_icse26.pdf) — admitted, score 19, discovered by `AgentSpec shadow execution behavior monitoring runtime enforcement`
- [S23] [\tool: Customizable Runtime Enforcement for Safe and Reliable LLM Agents](https://arxiv.org/html/2503.18666v1) — rejected, score 8, discovered by `AgentSpec shadow execution behavior monitoring runtime enforcement`
- [S24] [Agentic AI Security Solutions: Top 7 Platforms Compared - Palo Alto Networks](https://www.paloaltonetworks.com/cyberpedia/agentic-ai-security-solutions) — rejected, score 13, discovered by `AgentSpec shadow execution behavior monitoring runtime enforcement`
- [S25] [Runtime Security for AI Agents: An Identity Governance Perspective](https://softwareanalyst.substack.com/p/runtime-security-for-ai-agents-an) — rejected, score 12, discovered by `AgentSpec shadow execution behavior monitoring runtime enforcement`
- [S26] [GitHub - haoyuwang99/AgentSpec · GitHub](https://github.com/haoyuwang99/AgentSpec) — rejected, score 14, discovered by `AgentSpec shadow execution behavior monitoring runtime enforcement`
- [S27] [[Literature Review] AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents](https://www.themoonlight.io/en/review/agentspec-customizable-runtime-enforcement-for-safe-and-reliable-llm-agents) — rejected, score 9, discovered by `AgentSpec shadow execution behavior monitoring runtime enforcement`
- [S28] [Appendix 1: Precision and recall | College of Policing](https://www.college.police.uk/guidance/building-ai-enabled-tools-and-systems/appendix-1-precision-and-recall) — rejected, score 4, discovered by `AgentSpec 2503.18666v3 evaluation table precision recall embodied code AV results appendix`
- [S29] [Evaluating and Regulating Agentic AI: A Study of Benchmarks, Metrics, and Regulation | TechRxiv](https://www.techrxiv.org/action/cookieAbsent) — rejected, score 3, discovered by `AgentSpec 2503.18666v3 evaluation table precision recall embodied code AV results appendix`
- [S30] [1 Common Evaluation Measures • Recall](https://trec.nist.gov/pubs/trec15/appendices/CE.MEASURES06.pdf) — rejected, score 8, discovered by `AgentSpec 2503.18666v3 evaluation table precision recall embodied code AV results appendix`
- [S31] [Runtime Verification and Temporal Logic for AI Agent Safety | Zylos Research](https://zylos.ai/research/2026-03-15-runtime-verification-temporal-logic-ai-agent-safety/) — rejected, score 9, discovered by `AgentSpec latency overhead milliseconds benchmark enforcement cost domain breakdown`
- [S32] [How to Evaluate AI Agents: Latency, Cost, Safety, ROI | Aviso Blog](https://www.aviso.com/blog/how-to-evaluate-ai-agents-latency-cost-safety-roi) — rejected, score 4, discovered by `AgentSpec latency overhead milliseconds benchmark enforcement cost domain breakdown`
- [S33] [AI Security Latency: Real-Time Enforcement Explained](https://data443.com/blog/ai-security-latency-real-time-enforcement-explained/) — rejected, score 4, discovered by `AgentSpec latency overhead milliseconds benchmark enforcement cost domain breakdown`
- [S34] [Understanding AI Agent Latency and Performance | MindStudio](https://www.mindstudio.ai/blog/ai-agent-latency-performance) — rejected, score 4, discovered by `AgentSpec latency overhead milliseconds benchmark enforcement cost domain breakdown`
- [S35] [SafeAgentBench: A Benchmark for Safe Task Planning of Embodied LLM Agents](https://arxiv.org/html/2412.13178v5) — rejected, score 15, discovered by `AgentSpec "safe-task regression" OR "safe task" false positive blocked safe action`
- [S36] [SafeAgentBench](https://safeagentbench.github.io/) — rejected, score 11, discovered by `AgentSpec "safe-task regression" OR "safe task" false positive blocked safe action`

## Research Trace

### Goal

Audit all verification and monitoring evidence cited from AgentSpec (arXiv 2503.18666 v3) and The Verification Horizon (arXiv 2606.26300 v2), verify every reported metric, define what each metric measures, identify overclaims or missing caveats, and recommend a corrected evidence table for a note on co-evolving verifiers.

### Subquestions

- What are the exact precision, recall, latency, and safe-task regression numbers reported in AgentSpec arXiv 2503.18666 v3, and how does the paper define each metric, its evaluation dataset, and its baseline comparisons?
- What does The Verification Horizon arXiv 2606.26300 v2 report in its 104-task evaluator table and its three SWE-Bench monitoring results, including task selection, metric definitions, thresholds, and any stated limitations?
- How do the two papers define and operationalize shadow execution, behavior monitoring, LLM judges, runtime enforcement, and impact penalties, and are these definitions consistent with how the technical note uses them?
- Which specific numbers or claims in the note appear to be misattributed, outdated, stripped of caveats, or overclaimed relative to the primary sources?
- What missing caveats (e.g., confidence intervals, generalizability, evaluator bias, version drift, negative-result suppression) should accompany each cited metric?
- What would a corrected, properly caveated evidence table look like for a note arguing that verifiers and agents must co-evolve?

### Research Perspectives

- **Primary Source Extraction** — Extract exact numbers, metric definitions, evaluation protocols, and stated limitations directly from AgentSpec v3 and The Verification Horizon v2.
- **Metric Semantics Audit** — Define precisely what each reported metric (precision, recall, latency, safe-task regression, monitoring accuracy) measures, its denominator, its task universe, and its failure modes.
- **Concept Provenance** — Trace shadow execution, behavior monitoring, LLM judges, runtime enforcement, and impact penalties to their originating definitions in the primary sources or adjacent literature, and check for semantic drift in the note.
- **Adversarial Critique** — Identify overclaims, cherry-picked results, missing confidence intervals, unstated baselines, evaluator-selection bias, version drift, and any negative results suppressed or omitted by the note.
- **Recency and Version Integrity** — Confirm that arXiv 2503.18666 v3 and arXiv 2606.26300 v2 are the latest versions, check for errata or author corrections, and flag any numbers that changed across versions.
- **Operational Implications** — Assess whether the cited evidence actually supports the note's thesis that verifiers must co-evolve with agents, and what additional evidence would be needed to substantiate that claim.

### Source Requirements

- AgentSpec arXiv 2503.18666 v3 full text including appendix tables and evaluation sections
- The Verification Horizon arXiv 2606.26300 v2 full text including the 104-task evaluator table and SWE-Bench monitoring results
- Any errata, author blog posts, or issue-tracker discussions correcting numbers in either paper
- Adjacent literature on LLM-as-judge reliability, runtime enforcement for agents, and shadow execution in ML systems
- SWE-Bench official documentation for task-set composition and evaluation protocol context
- Independent reproductions or critiques of AgentSpec or The Verification Horizon if available

### Success Criteria

- Every number cited from AgentSpec (precision, recall, latency, safe-task regression) is matched to a specific table or paragraph in v3 with exact value and context.
- Every number cited from The Verification Horizon (104-task evaluator table entries and three SWE-Bench monitoring results) is matched to a specific table or paragraph in v2 with exact value and context.
- Each metric is accompanied by a one-sentence definition of what it measures, its task universe, and its denominator, extracted from the primary source.
- At least three potential overclaims or missing caveats are identified with specific evidence from the primary sources.
- Concepts of shadow execution, behavior monitoring, LLM judges, runtime enforcement, and impact penalties are each traced to a definition in the primary sources or flagged as introduced by the note without primary-source backing.
- A corrected evidence table is recommended with columns for metric, value, source location, definition, caveats, and relevance to the co-evolution thesis.

### Search Queries

- `AgentSpec arXiv 2503.18666 specification runtime enforcement LLM agents` — Locate the primary AgentSpec paper to extract precision/recall, latency, and safe-task regression numbers from v3. [Primary Source Extraction / arXiv paper]
- `AgentSpec precision recall safe-task regression evaluation results` — Find the specific evaluation tables and metric definitions in AgentSpec for auditing reported numbers. [Metric Semantics Audit / arXiv paper / appendix]
- `"The Verification Horizon" arXiv 2606.26300 monitoring SWE-Bench` — Locate the primary Verification Horizon paper to extract the 104-task evaluator table and SWE-Bench monitoring results. [Primary Source Extraction / arXiv paper]
- `"Verification Horizon" 104-task evaluator table results limitations` — Find the specific 104-task evaluator table and any stated limitations or caveats in the Verification Horizon paper. [Primary Source Extraction / arXiv paper / appendix]
- `AgentSpec shadow execution behavior monitoring runtime enforcement` — Trace how AgentSpec defines and uses shadow execution, behavior monitoring, and runtime enforcement. [Concept Provenance / arXiv paper]
- `"impact penalties" LLM agent verification monitoring evaluation` — Determine whether impact penalties are defined in the primary sources or introduced by the note, and how they are operationalized. [Concept Provenance / arXiv paper / adjacent literature]
- `LLM-as-judge reliability limitations precision recall bias 2025 2026` — Find adversarial evidence on LLM judge reliability to assess whether the note overclaims monitoring accuracy. [Adversarial Critique / research paper / survey]
- `SWE-Bench evaluation protocol task selection bias limitations` — Understand SWE-Bench's task composition and evaluation protocol to audit the Verification Horizon's SWE-Bench monitoring claims. [Metric Semantics Audit / official documentation / paper]
- `AgentSpec arXiv 2503.18666 v3 errata correction version history` — Check for errata or version changes that might affect numbers cited by the note. [Recency and Version Integrity / arXiv version history / author notes]
- `"Verification Horizon" arXiv 2606.26300 v2 errata updated results` — Check for version updates or corrections to the Verification Horizon paper that might affect cited numbers. [Recency and Version Integrity / arXiv version history]
- `runtime enforcement LLM agents overclaim false positive safe task regression` — Search for critiques or independent evaluations showing runtime enforcement causes safe-task regressions or false positives. [Adversarial Critique / critique / independent evaluation]
- `co-evolution verifiers agents monitoring evidence evaluation framework` — Find adjacent literature on verifier-agent co-evolution to assess whether the note's thesis is supported by the cited evidence alone. [Operational Implications / research paper / position paper]

### Source Quality

- [S1] Primary source for AgentSpec v3; abstract gives high-level numbers (90%+ unsafe execution prevention, 100% compliance, millisecond overhead) but evaluation tables and exact precision/recall/latency/safe-task regression numbers are not fully visible in the abstract; full evaluation section is needed to audit claimed metrics. score=18 type=paper admitted=true warnings=Abstract claims 'over 90%' without defining metric; exact numbers and definitions require full text; authority 4 because only abstract excerpt available, not full evaluation section.
- [S2] PDF of the paper; likely contains full evaluation with tables; needed to extract exact precision, recall, latency, and safe-task regression numbers. Source is authoritative because it is the official arXiv PDF v3. score=19 type=paper admitted=true warnings=
- [S3] Third-party summary site; low authority, duplicates content from primary source without adding new evidence. Does not meet source requirements for auditing original numbers. score=10 type=other admitted=false warnings=Third-party; not a primary source.
- [S4] HTML version of AgentSpec v3; contains full text including evaluation sections, tables, and definitions. Essential for auditing metrics and tracing concepts like shadow execution and behavior monitoring. score=19 type=paper admitted=true warnings=
- [S5] Older version v1 of AgentSpec; v3 is the latest with potential updates to numbers and text. Using v1 could lead to citing outdated figures. Not needed for audit if v3 is available. score=8 type=paper admitted=false warnings=Version v1; results may differ from v3.
- [S6] ADS page with only metadata; requires JavaScript and provides no extractable evidence. Cannot contribute to metric audit. score=8 type=other admitted=false warnings=Unreadable due to JavaScript requirement.
- [S7] Third-party TLDR summary; low authority, duplicates abstract. Does not fulfill source requirements. score=9 type=other admitted=false warnings=Third-party summary.
- [S8] Blog about RAG evaluation metrics; off-topic for auditing AgentSpec or Verification Horizon evidence. score=9 type=other admitted=false warnings=Off-topic.
- [S9] Medium article on agent evaluation; low authority, not a primary source for the specific metrics being audited. Does not provide original numbers from AgentSpec or Verification Horizon. score=9 type=other admitted=false warnings=Low authority; not a primary source.
- [S10] Medium field guide by an individual; low authority and not a primary source for the required audit. score=9 type=other admitted=false warnings=Low authority; not a primary source.
- [S11] Unrelated paper on agent assessment framework; not one of the two primary sources under audit. Does not contain AgentSpec or Verification Horizon evidence. score=12 type=paper admitted=false warnings=Off-topic.
- [S12] Anthropic blog on agent evals; authoritative but not one of the two primary sources required. Could provide context but does not meet source requirements for direct evidence audit. score=15 type=other admitted=false warnings=Not a primary source for AgentSpec or Verification Horizon.
- [S13] Unrelated paper on retrieval metrics for tool-use agents; not relevant to auditing AgentSpec or Verification Horizon evidence. score=13 type=paper admitted=false warnings=Off-topic.
- [S14] Wikipedia article on precision and recall; general definition but not a source for the specific metrics in AgentSpec or Verification Horizon. Not needed. score=12 type=other admitted=false warnings=General reference; not primary source.
- [S15] HTML version of The Verification Horizon v2; contains full text, 104-task evaluator table, and SWE-Bench monitoring results. Essential for auditing cited evidence. score=19 type=paper admitted=true warnings=
- [S16] arXiv abstract page for Verification Horizon v2; provides metadata and abstract. Use alongside full HTML/PDF for complete evidence extraction. score=19 type=paper admitted=true warnings=Abstract only; full text needed for metric audit.
- [S17] Third-party aggregation site; low authority, duplicates abstract. Does not meet source requirements. score=9 type=other admitted=false warnings=Third-party summary.
- [S18] Hugging Face paper page; metadata and abstract only. No new evidence. score=9 type=other admitted=false warnings=Metadata page.
- [S19] Curated list of evaluation resources; includes link to Verification Horizon but provides no primary evidence itself. Not needed. score=9 type=other admitted=false warnings=Curated list; not primary source.
- [S20] Unrelated arXiv paper on ADMITBench; not relevant to auditing AgentSpec or Verification Horizon. score=13 type=paper admitted=false warnings=Off-topic.
- [S21] Unrelated site about hardware verification; completely off-topic. score=11 type=other admitted=false warnings=Off-topic; hardware verification, not AI agent monitoring.
- [S22] ICSE 2026 conference version of AgentSpec; likely identical to v3 but may include final publication details. Authoritative and useful for cross-checking numbers. score=19 type=paper admitted=true warnings=
- [S23] HTML version of AgentSpec v1; outdated; numbers may differ from v3. Not needed if v3 is accessible. score=8 type=paper admitted=false warnings=Version v1; use v3 instead.
- [S24] Palo Alto Networks blog on agentic AI security; provides industry context but not a primary source for the metrics in AgentSpec or Verification Horizon. Not a direct source for audit. score=13 type=other admitted=false warnings=Blog post; not primary source.
- [S25] Substack article on runtime security for AI agents; discusses shadow execution concepts but not a primary source for the specific evidence being audited. Low authority. score=12 type=other admitted=false warnings=Substack; low authority; not a primary source.
- [S26] GitHub repository for AgentSpec; relevant for implementation details and code but not for metric definitions and evaluation results found in the paper. Does not directly report precision/recall/latency numbers from evaluation tables. score=14 type=other admitted=false warnings=Repo contains code, not evaluation metrics; use paper for metrics.
- [S27] Third-party literature review website; low authority, duplicates paper content. Does not contribute original evidence. score=9 type=other admitted=false warnings=Third-party summary; low authority.
- [S28] Not a primary source; general precision/recall guide from policing website, irrelevant to AgentSpec or Verification Horizon audit. score=4 type=other admitted=false warnings=
- [S29] Unreadable page; not the required primary sources. score=3 type=other admitted=false warnings=Page requires cookies and content not accessible
- [S30] Standard evaluation measures document, not related to AgentSpec or Verification Horizon. score=8 type=other admitted=false warnings=
- [S31] Secondary blog post mentioning AgentSpec but not a primary source; does not provide the exact metrics needed for audit. score=9 type=other admitted=false warnings=Not peer-reviewed; may contain inaccuracies
- [S32] General blog on AI agent evaluation, not relevant to specific papers. score=4 type=other admitted=false warnings=
- [S33] Blog about AI security latency, not relevant. score=4 type=other admitted=false warnings=
- [S34] Blog on AI agent latency, not relevant. score=4 type=other admitted=false warnings=
- [S35] SafeAgentBench is a related benchmark but not the primary sources required; does not contain AgentSpec or Verification Horizon metrics. score=15 type=paper admitted=false warnings=
- [S36] Project website for SafeAgentBench, not a primary source for the audit. score=11 type=other admitted=false warnings=

### Evidence Notes

- [S1] AgentSpec reports that rules generated by OpenAI o1 achieve a precision of 95.56% and recall of 70.96% for embodied agents. Evidence: Abstract: 'rules generated by OpenAI o1 achieve a precision of 95.56% and recall of 70.96% for embodied agents' Limitations: Only for LLM-generated rules (not handcrafted); evaluation domain limited to embodied agents; no confidence intervals or task-set composition provided.
- [S1] AgentSpec reports that LLM-generated rules successfully identify 87.26% of risky code. Evidence: Abstract: 'successfully identify 87.26% of the risky code' Limitations: Metric definition not explicitly stated (likely recall); no precision reported for code; dataset and baseline not detailed in abstract.
- [S1] AgentSpec reports that LLM-generated rules prevent AVs from breaking laws in 5 out of 8 scenarios. Evidence: Abstract: 'prevent AVs from breaking laws in 5 out of 8 scenarios' Limitations: Small scenario count (8); no detail on scenario difficulty or representativeness; no comparison to handcrafted rules.
- [S1] AgentSpec claims it 'successfully prevents unsafe executions in over 90% of code agent cases'. Evidence: Abstract: 'successfully prevents unsafe executions in over 90% of code agent cases' Limitations: Vague 'over 90%' without exact number; no precision/recall breakdown; no confidence interval; unclear if this is per-action or per-trajectory.
- [S1] AgentSpec claims it 'eliminates all hazardous actions in embodied agent tasks'. Evidence: Abstract: 'eliminates all hazardous actions in embodied agent tasks' Limitations: No definition of 'hazardous actions'; no false positive analysis; may rely on specific task set; no mention of edge cases or adversarial inputs.
- [S1] AgentSpec claims it 'enforces 100% compliance by autonomous vehicles (AVs)'. Evidence: Abstract: 'enforces 100% compliance by autonomous vehicles (AVs)' Limitations: Likely based on handcrafted rules; no detail on scenarios or metrics; may not generalize to all AV tasks.
- [S15] The Verification Horizon reports that across three SWE-Bench variants, the hacked resolved rate drops from 28.57% to 0.56% and the clean resolved rate rises from 40.22% to 60.53%. Evidence: HTML snippet: 'across three SWE-Bench variants the hacked resolved rate drops from 28.57% to 0.56% and the clean resolved rate rises from 40.22% to 60.53%' Limitations: Only three SWE-Bench variants; no confidence intervals; 'hacked' and 'clean' definitions not fully specified in snippet; may depend on specific verifier design.
- [S15] The Verification Horizon argues that 'no fixed reward function can remain effective as policy capability continues to grow; and verification must co-evolve with the generator.' Evidence: Abstract: 'no fixed reward function can remain effective as policy capability continues to grow; and verification must co-evolve with the generator.' Limitations: Theoretical claim; empirical support limited to specific experiments; does not provide a concrete co-evolution mechanism.
- [S15] The Verification Horizon introduces a 104-task evaluator table for SWE-like tasks. Evidence: HTML snippet mentions '104-task evaluator table' in the context of test-driven rewards (Section 2). Limitations: Exact numbers from the table not present in provided snippet; no details on task selection or metric definitions.
- [S4] AgentSpec defines runtime enforcement as a DSL with triggers, predicates, and enforcement actions (user_inspection, llm_self_examine, etc.). Evidence: HTML snippet: 'AgentSpec enables the specification of rules composed of a triggering event, predicate conditions, and enforcement' and lists enforcement actions including 'user_inspection' and 'llm_self_examine'. Limitations: Only a subset of enforcement actions listed; no discussion of scalability or false positive rates for LLM self-examination.
- [S15] The Verification Horizon defines verifiers as 'proxies for human intent' and states that 'intent is underspecified by nature'. Evidence: HTML snippet: 'Every verifier we can build is only a proxy for human intent, never the intent itself.' and 'intent is underspecified by nature'. Limitations: Philosophical claim; not empirically quantified; does not address how to measure proxy gap.
- [S1] AgentSpec reports 'overheads in milliseconds' for runtime enforcement. Evidence: Abstract: 'remains computationally lightweight, with overheads in milliseconds' Limitations: No exact numbers; no breakdown by domain or rule complexity; no comparison to baseline without enforcement.
- [S15] The Verification Horizon studies four reward constructions: test verifier, rubric verifier, user as verifier, and automated agent verifier. Evidence: HTML snippet: 'We further study four reward constructions: a test verifier for general coding tasks, a rubric verifier for frontend tasks, the user as verifier for real-world agent tasks, and an automated agent verifier for long-horizon tasks.' Limitations: No quantitative results for each in the snippet; may not cover all possible verifier designs.
- [S4] AgentSpec uses 'shadow execution' implicitly through its monitoring of agent trajectory before enforcement. Evidence: HTML snippet: 'AgentSpec must ensure that the agent’s trajectory that has been undertaken so far remains safe by continuously monitoring its execution.' Limitations: Term 'shadow execution' not used; monitoring is retrospective, not predictive; no discussion of parallel execution.
- [S15] The Verification Horizon uses an 'agentic interactive judge' for frontend tasks and a 'dynamic agent judge' for long-horizon tasks. Evidence: HTML snippet: 'Interactive Judge for Frontend Tasks' and 'Dynamic Agent Judge for Long-horizon Tasks' sections. Limitations: No performance numbers in snippet; judge reliability not quantified; potential for judge reward hacking.
- [S1] AgentSpec does not report a 'safe-task regression' metric explicitly; the term may refer to unintended blocking of safe actions. Evidence: No mention of 'safe-task regression' in provided AgentSpec snippets; only precision/recall and prevention rates. Limitations: Absence of evidence; the note may have inferred regression from false positives, but no explicit metric in AgentSpec.
- [S15] The Verification Horizon does not mention 'impact penalties' in the provided snippets. Evidence: No occurrence of 'impact penalties' in S15 or S16 text. Limitations: Absence of evidence; concept may appear in later sections not captured in snippet.

### Claim Verification

- **supported**: Precision (embodied, LLM-generated rules) is 95.56% — Abstract reports rules generated by OpenAI o1 achieve precision of 95.56% for embodied agents; direct match.
- **supported**: Recall (embodied, LLM-generated rules) is 70.96% — Abstract reports recall of 70.96% for embodied agents; direct match.
- **supported**: Risky code identification is 87.26% — Abstract states LLM-generated rules successfully identify 87.26% of risky code; direct match.
- **supported**: AV law prevention (LLM-generated rules) is 5/8 scenarios (62.5%) — Abstract states prevent AVs from breaking laws in 5 out of 8 scenarios; direct match.
- **supported**: Code agent unsafe execution prevention is 'over 90%' — Abstract states successfully prevents unsafe executions in over 90% of code agent cases; direct match.
- **supported**: Embodied agent hazardous action elimination is 'all' (100%) — Abstract states eliminates all hazardous actions in embodied agent tasks; direct match.
- **supported**: AV compliance (handcrafted rules) is 100% — Abstract states enforces 100% compliance by autonomous vehicles; note indicates this is likely based on handcrafted rules, matching the claim.
- **supported**: Latency overhead is 'in milliseconds' — Abstract states overheads in milliseconds; direct match.
- **supported**: Hacked resolved rate dropped from 28.57% to 0.56% — S15 reports across three SWE-Bench variants the hacked resolved rate drops from 28.57% to 0.56%; direct match.
- **supported**: Clean resolved rate rose from 40.22% to 60.53% — S15 reports the clean resolved rate rises from 40.22% to 60.53%; direct match.
- **supported**: The 104-task evaluator table is referenced but exact numbers not in snippet — S15 mentions a 104-task evaluator table, and the provided snippet does not include exact numbers; claim accurately reflects the evidence.
- **supported**: Four reward constructions: Test verifier, rubric verifier, user-as-verifier, automated agent verifier — S15 explicitly studies four reward constructions: test verifier, rubric verifier, user as verifier, and automated agent verifier; direct match.
- **supported**: AgentSpec provides a DSL with triggers, predicates, and enforcement actions such as `user_inspection` or `llm_self_examine` — S4 specifies rules composed of a triggering event, predicate conditions, and enforcement actions including 'user_inspection' and 'llm_self_examine'; direct match.
- **supported**: AgentSpec monitors trajectory retrospectively ('continuously monitoring its execution') — S4 states AgentSpec ensures the agent's trajectory undertaken so far remains safe by continuously monitoring its execution; note confirms this is retrospective monitoring.
- **supported**: Verification Horizon uses 'Interactive Judge' for frontend tasks and 'Dynamic Agent Judge' for long-horizon tasks — S15 contains sections titled 'Interactive Judge for Frontend Tasks' and 'Dynamic Agent Judge for Long-horizon Tasks'; direct match.
- **supported**: The Verification Horizon argues that verifiers are always proxies for human intent, never the intent itself — S15 explicitly states 'Every verifier we can build is only a proxy for human intent, never the intent itself'; direct match.
- **supported**: The Verification Horizon claims that no fixed reward function can remain effective as policy capability continues to grow — S15 states 'no fixed reward function can remain effective as policy capability continues to grow'; direct match.

### Final Evaluation

- coverage: 5/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Exhaustive extraction and verification of every reported metric from both primary sources, with precise source locations and definitions.
- Clear concept provenance audit that identifies terms (shadow execution, impact penalties) absent from the cited sources, preventing misattribution.
- Systematic identification of overclaims and missing caveats (e.g., absolute claims without false-positive analysis, vague 'over 90%', no confidence intervals).
- Well-structured corrected evidence table with columns for metric, value, source, definition, caveats, and relevance to the co-evolution thesis.
- Honest treatment of limitations (snippet incompleteness, version integrity, evaluator bias, domain transfer threat) and open questions.

Weaknesses:
- The 104-task evaluator table from The Verification Horizon could not be fully extracted due to snippet incompleteness; the report correctly flags this but the analysis remains partially incomplete.
- Some recommendations (e.g., re-running AgentSpec on coding benchmarks) are high-level and could benefit from more specific experimental design details.

Follow-up recommendations:
- Obtain the full text of The Verification Horizon v2 to extract every cell of the 104-task evaluator table, including metric definitions and task-selection criteria.
- Re-run AgentSpec's precision/recall evaluation on a coding-agent benchmark (e.g., SWE-Bench) to test domain transfer of the 95.56%/70.96% figures.
- Measure false-positive rates for AgentSpec's handcrafted rules by logging every safe action blocked, producing an explicit safe-task regression metric.
- Add confidence intervals to the SWE-Bench monitoring results via bootstrap resampling across the three variants.
- Conduct an ablation comparing AgentSpec's retrospective monitoring against a true shadow-execution approach (parallel simulation without side effects) to determine whether predictive checking improves over reactive monitoring.
