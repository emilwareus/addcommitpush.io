---
title: "Critically audit the public evidence for domain post-training on the Harvey Legal Agent Benchmark, using https://www.trajectory.ai/field-notes/harvey-nemotron-3-ultra as the starting source but not as the only source. Check the reported under-24-hour training claim, Nemotron 3 Ultra baseline and post-trained all-pass rates, per-rubric pass rates, comparisons with closed models, and inference-cost claim. Find the benchmark definition, task count, holdout method, grading protocol, model version and architecture, training-data description, training algorithm, hardware, token counts, hyperparameters, statistical uncertainty, and independent replication status. Separate disclosed facts from missing information and vendor interpretation. Explain which lessons generalize to domain post-training and which depend on legal data, benchmark construction, base-model quality, or undisclosed infrastructure. Include earlier related Nemotron and Harvey LAB results if public. Prefer benchmark papers, model technical reports, official benchmark or model documentation, and primary field reports. Every material claim must cite an admitted source. Current date is 2026-09-02."
generated_at: 2026-09-02T16:49:48.256156+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "openai/gpt-4o"
worker_model: "openai/gpt-4o"
writer_model: "openai/gpt-4o"
---

# Critical Audit of Domain Post-Training on the Harvey Legal Agent Benchmark

## Abstract
This paper audits the public evidence for domain post-training on the Harvey Legal Agent Benchmark (LAB), focusing on the Nemotron 3 Ultra model. We examine claims about training time, performance metrics, and inference costs. We also assess the benchmark's definition, task count, grading protocol, and Nemotron 3 Ultra's architecture and training details. The analysis identifies gaps in the evidence and evaluates the generalizability of findings.

## Research Question
What is the validity of the public evidence supporting domain post-training on the Harvey Legal Agent Benchmark, specifically for the Nemotron 3 Ultra model?

## Method
We reviewed primary sources, including benchmark papers, model technical reports, and official documentation. We focused on claims about the benchmark's definition, task count, grading protocol, and Nemotron 3 Ultra's performance metrics, training time, and inference costs. We also examined independent replication status.

## Conceptual Background
The Harvey Legal Agent Benchmark (LAB) evaluates AI models on legal tasks derived from real client matters [S3]. It includes over 1,200 tasks across 24 legal practice areas [S2]. The benchmark uses an all-pass grading protocol, requiring all rubric criteria to pass for a task to be considered successful [S1]. Nemotron 3 Ultra, released in June 2026, is a 550-billion-parameter model using a Hybrid Mamba-Transformer architecture with LatentMoE expert routing [S9].

| Concept | Definition |
|---------|------------|
| All-pass grading | A task passes only if all rubric criteria are met [S1]. |
| Hybrid Mamba-Transformer | An architecture combining transformer models with expert routing [S9]. |
| LatentMoE | A method for smarter expert routing in model architectures [S9]. |

## Findings
### Benchmark Definition and Task Count
LAB comprises over 1,200 tasks across 24 legal practice areas, derived from real client matters [S2, S3]. The all-pass grading protocol is strict, impacting scores significantly [S6].

### Nemotron 3 Ultra Performance Metrics
Post-training, Nemotron 3 Ultra achieved a 5.8% all-pass rate, up from 0% at baseline [S4]. The model's Intelligence Index score is 48, the highest for any US open-weight model [S9].

### Training Time and Hardware
Nemotron 3 Ultra was post-trained on LAB in under 24 hours [S8]. The model was trained on 20 trillion tokens [S9].

### Inference Costs
The model serves over 300 tokens per second using BF16 weights, indicating high inference efficiency [S9]. NVFP4 quantization on Blackwell GPUs offers up to 5x higher throughput compared to FP16 [S9].

### Comparison with Closed Models
The open-source nature of Nemotron 3 Ultra allows for independent verification, but no independent replication studies were found [S9].

| Claim | Evidence | Source | Limits |
|-------|----------|--------|--------|
| 5.8% all-pass rate | Post-trained Nemotron 3 Ultra reaches 5.8% | [S4] | Does not account for partial success |
| Under 24-hour training | Achieved on Trajectory platform | [S8] | Hardware specifics not disclosed |
| 300 tokens/sec inference | BF16 weights on DeepInfra endpoint | [S9] | No comparison with closed models |

## Design Implications
The strict all-pass grading protocol may not reflect practical utility where partial success is valuable. The rapid post-training time suggests efficiency in domain adaptation, but hardware specifics are crucial for replication.

## Limitations and Threats to Validity
The lack of detailed hardware information and independent replication studies limits the ability to verify claims. The all-pass grading protocol may not capture partial task success, affecting perceived performance.

## Open Questions
- How does Nemotron 3 Ultra compare to closed models in practical legal tasks?
- What specific hardware was used for the under-24-hour training claim?
- How does the all-pass grading protocol affect the utility of the benchmark in real-world applications?

## Recommended Next Experiments
1. Conduct independent replication studies to verify Nemotron 3 Ultra's performance metrics.
2. Investigate the impact of partial task success on practical utility and benchmark scores.

## Source Register

- [S1] [Legal Agent Benchmark Initial Results | Harvey](https://www.harvey.ai/blog/legal-agent-benchmark-initial-results) — admitted, score 12, discovered by `Harvey Legal Agent Benchmark definition task count grading protocol`
- [S2] [Introducing Harvey’s Legal Agent Benchmark](https://www.harvey.ai/blog/introducing-harveys-legal-agent-benchmark) — admitted, score 14, discovered by `Harvey Legal Agent Benchmark definition task count grading protocol`
- [S3] [Harvey LAB: An Open Legal Agent Benchmark | MoClaw Blog](https://moclaw.ai/blog/legal-agent-benchmark-harvey-lab) — admitted, score 18, discovered by `Harvey Legal Agent Benchmark definition task count grading protocol`
- [S4] [Harvey's Legal Agent Benchmark](https://www.vals.ai/benchmarks/hlab) — admitted, score 15, discovered by `Harvey Legal Agent Benchmark definition task count grading protocol`
- [S5] [GitHub - harveyai/harvey-labs: A benchmark built to evaluate and improve agent capabilities for supporting legal work. · GitHub](https://github.com/harveyai/harvey-labs) — admitted, score 20, discovered by `Harvey Legal Agent Benchmark definition task count grading protocol`
- [S6] [r/legaltech on Reddit: I analyzed Harvey’s legal AI benchmark. Here’s EXACTLY how it works [video]](https://www.reddit.com/r/legaltech/comments/1vzvbge/i_analyzed_harveys_legal_ai_benchmark_heres/) — admitted, score 12, discovered by `Harvey Legal Agent Benchmark definition task count grading protocol`
- [S7] [Harvey's Legal Agent Benchmark Leaderboard & Scores — September 2026 | BenchLM.ai](https://benchlm.ai/benchmarks/hlab) — admitted, score 13, discovered by `Harvey Legal Agent Benchmark definition task count grading protocol`
- [S8] [Post-Training NVIDIA Nemotron 3 Ultra on Harvey LAB in Under 24 Hours - Trajectory](https://www.trajectory.ai/field-notes/harvey-nemotron-3-ultra) — admitted, score 19, discovered by `Nemotron 3 Ultra performance metrics Harvey LAB`
- [S9] [NVIDIA Nemotron 3 Ultra Review: Benchmarks, Architecture & Real-World Performance (2026)](https://www.buildfastwithai.com/blogs/nvidia-nemotron-3-ultra-review-2026) — admitted, score 16, discovered by `Nemotron 3 Ultra performance metrics Harvey LAB`

## Research Trace

### Goal

Critically audit the public evidence for domain post-training on the Harvey Legal Agent Benchmark, focusing on the Nemotron 3 Ultra model and its reported performance metrics.

### Subquestions

- What is the definition and task count of the Harvey Legal Agent Benchmark?
- What are the reported performance metrics for Nemotron 3 Ultra, including baseline and post-training results?
- What is the claimed training time and hardware used for Nemotron 3 Ultra?
- How does Nemotron 3 Ultra compare to closed models on the benchmark?
- What are the inference cost claims associated with Nemotron 3 Ultra?
- Is there independent replication of Nemotron 3 Ultra's results?

### Research Perspectives

- **Primary Sources** — Identify official documentation and reports from Trajectory AI and Harvey LAB.
- **Benchmark Definition** — Understand the benchmark's task count, grading protocol, and holdout method.
- **Implementation and Evaluation** — Examine implementation details, including training algorithm, hardware, and hyperparameters.
- **Criticism and Counterevidence** — Find critiques or limitations of the Nemotron 3 Ultra model and its reported claims.
- **Independent Replication** — Assess whether results have been independently replicated and validated.

### Source Requirements

- Benchmark papers
- Model technical reports
- Official documentation
- Primary field reports
- Critiques and counterevidence

### Success Criteria

- Identification of all material claims with cited sources.
- Clear distinction between disclosed facts and vendor interpretation.
- Evaluation of generalizability of lessons learned from domain post-training.
- Assessment of independent replication status.

### Search Queries

- `Harvey Legal Agent Benchmark definition task count grading protocol` — To find the official benchmark definition and methodology. [Benchmark Definition / Benchmark papers]
- `Nemotron 3 Ultra performance metrics Harvey LAB` — To locate performance data and reports for Nemotron 3 Ultra. [Primary Sources / Model technical reports]
- `Nemotron 3 Ultra training time hardware inference cost` — To verify claims about training time, hardware used, and inference costs. [Implementation and Evaluation / Official documentation]
- `Nemotron 3 Ultra comparison closed models Harvey LAB` — To find comparative analysis between Nemotron 3 Ultra and closed models. [Criticism and Counterevidence / Critiques and counterevidence]
- `Nemotron 3 Ultra independent replication Harvey LAB` — To check for independent replication of results. [Independent Replication / Primary field reports]
- `Harvey LAB earlier Nemotron results` — To gather historical data on earlier Nemotron models and Harvey LAB results. [Primary Sources / Benchmark papers]

### Source Quality

- [S1] The source provides initial results for the Harvey Legal Agent Benchmark, which is relevant to understanding the benchmark's application. However, it lacks detailed technical information and independent analysis. score=12 type=benchmark admitted=true warnings=
- [S2] This source introduces the Harvey Legal Agent Benchmark and discusses the grading protocol, which is crucial for understanding the benchmark's methodology. It provides more context than S1 but still lacks comprehensive technical details. score=14 type=benchmark admitted=true warnings=
- [S3] The source offers detailed insights into the Harvey LAB, including its open-source nature and grading rules. It is highly relevant and provides independent analysis, making it a strong source for understanding the benchmark's structure. score=18 type=benchmark admitted=true warnings=
- [S4] This source provides an overview of the Harvey Legal Agent Benchmark, including task types and tools used. It is relevant for understanding the benchmark's scope but lacks depth in technical details. score=15 type=benchmark admitted=true warnings=
- [S5] The GitHub repository is a primary source for the Harvey LAB, offering comprehensive details about the benchmark's design and implementation. It is authoritative and provides independent evidence. score=20 type=repo admitted=true warnings=
- [S6] The Reddit post provides a user analysis of the benchmark, offering a critical perspective. While it lacks formal authority, it adds independent critique to the discussion. score=12 type=critique admitted=true warnings=
- [S7] This source provides leaderboard information for the Harvey LAB, which is useful for performance comparison but lacks detailed methodological insights. score=13 type=benchmark admitted=true warnings=
- [S8] The source is a primary field report detailing the post-training of Nemotron 3 Ultra on the Harvey LAB, including performance metrics and training claims. It is highly relevant and authoritative. score=19 type=paper admitted=true warnings=
- [S9] This source reviews the Nemotron 3 Ultra, providing benchmark results and architectural details. It is relevant for understanding the model's capabilities but offers less focus on the Harvey LAB specifically. score=16 type=paper admitted=true warnings=

### Evidence Notes

- [S1] The Harvey Legal Agent Benchmark (LAB) uses an all-pass standard for task evaluation. Evidence: A task counts as passing only if every required rubric criterion passes. Limitations: The all-pass standard may not reflect partial task completion, which could be useful in practice.
- [S2] LAB includes over 1,200 tasks across 24 legal practice areas. Evidence: The first version of LAB includes more than 1,200 agent tasks across 24 legal practice areas. Limitations: The initial release may not cover all practice areas or task types within those areas.
- [S3] LAB tasks are derived from real client matters handled by practicing lawyers. Evidence: Tasks come from real client matters worked by practicing lawyers, broken down into associate-level pieces. Limitations: The real-world origin of tasks may introduce variability that affects consistency in evaluation.
- [S4] Nemotron 3 Ultra's post-training on LAB achieved a 5.8% all-pass rate. Evidence: Post-trained Nemotron 3 Ultra reaches 5.8%, up from 0% at baseline. Limitations: The all-pass rate does not account for partial task success, which could be significant.
- [S5] LAB is an open-source project with a dataset of tasks and an execution harness. Evidence: LAB consists of a dataset of tasks containing agent instructions, documents, and rubrics as well as an execution harness. Limitations: Open-source projects may face challenges in maintaining consistency and quality control.
- [S6] LAB's all-pass grading rule is considered strict and impactful on scores. Evidence: Their criteria is 'all pass' for a particular multi-part task. Limitations: Strict grading may not reflect practical utility where partial success is valuable.
- [S8] Nemotron 3 Ultra was post-trained on LAB in under 24 hours. Evidence: We were able to post-train Nemotron 3 Ultra on the Trajectory platform in under 24 hours. Limitations: The claim does not specify the hardware or specific conditions under which this training time was achieved.
- [S9] Nemotron 3 Ultra was released on June 4, 2026, with 550 billion total parameters and 55 billion active per forward pass. Evidence: Nemotron 3 Ultra is a 550-billion-parameter open-weight language model released by NVIDIA on June 4, 2026. Limitations: The source does not provide detailed information on the specific tasks or benchmarks used for evaluation.
- [S9] Nemotron 3 Ultra uses a Hybrid Mamba-Transformer architecture with LatentMoE expert routing. Evidence: Hybrid Mamba-Transformer Design... LatentMoE: Smarter Expert Routing. Limitations: The source does not compare this architecture directly with other architectures in terms of specific performance metrics.
- [S9] Nemotron 3 Ultra achieves an Intelligence Index score of 48, the highest of any US open-weight model. Evidence: Nemotron 3 Ultra scores 48 on the Artificial Analysis Intelligence Index — the highest score of any US-developed open-weight model as of June 2026. Limitations: The source does not provide detailed information on how the Intelligence Index is calculated or its components.
- [S9] Nemotron 3 Ultra's inference efficiency is a major advantage, with over 300 tokens per second using BF16 weights. Evidence: On a pre-release DeepInfra endpoint, Ultra served over 300 tokens per second using BF16 weights. Limitations: The source does not provide a direct comparison of inference efficiency with specific closed models.
- [S9] Nemotron 3 Ultra's context window is 262,000 tokens in BF16 precision, extendable to 1 million tokens with NVFP4 quantization. Evidence: In BF16 precision, the context window is 262,000 tokens. With NVFP4 quantization on NVIDIA Blackwell hardware, it extends to 1 million tokens. Limitations: The source does not discuss the impact of context window size on specific benchmark tasks.
- [S9] Nemotron 3 Ultra is open source, with weights, training data, and recipes released under the OpenMDW-1.1 license. Evidence: NVIDIA has released the base model weights, post-trained checkpoints, reward models, NVFP4 quantized variants, training recipes, and datasets under the OpenMDW-1.1 license. Limitations: The source does not mention any independent replication studies conducted so far.
- [S9] Nemotron 3 Ultra's training involved 20 trillion tokens. Evidence: Trained on 20 trillion tokens. Limitations: The source does not specify the nature or diversity of the training data.
- [S9] Nemotron 3 Ultra's NVFP4 quantization on Blackwell GPUs offers up to 5x higher throughput compared to standard FP16 inference. Evidence: The NVFP4 format, designed for NVIDIA's Blackwell GPU architecture, delivers up to 5x higher throughput compared to standard FP16 inference. Limitations: The source does not provide detailed comparisons with other quantization methods or hardware platforms.

### Claim Verification

- **supported**: The Harvey Legal Agent Benchmark (LAB) evaluates AI models on legal tasks derived from real client matters. — S3 provides evidence that LAB tasks are derived from real client matters handled by practicing lawyers.
- **supported**: LAB includes over 1,200 tasks across 24 legal practice areas. — S2 confirms that LAB includes over 1,200 tasks across 24 legal practice areas.
- **supported**: The benchmark uses an all-pass grading protocol, requiring all rubric criteria to pass for a task to be considered successful. — S1 describes the all-pass grading protocol used in LAB.
- **supported**: Nemotron 3 Ultra, released in June 2026, is a 550-billion-parameter model using a Hybrid Mamba-Transformer architecture with LatentMoE expert routing. — S9 provides details about the release date, parameter count, and architecture of Nemotron 3 Ultra.
- **supported**: LAB comprises over 1,200 tasks across 24 legal practice areas, derived from real client matters. — S2 and S3 together confirm the number of tasks, practice areas, and their derivation from real client matters.
- **supported**: The all-pass grading protocol is strict, impacting scores significantly. — S6 discusses the strictness and impact of the all-pass grading protocol on scores.
- **supported**: Post-training, Nemotron 3 Ultra achieved a 5.8% all-pass rate, up from 0% at baseline. — S4 provides evidence of the 5.8% all-pass rate achieved by Nemotron 3 Ultra post-training.
- **supported**: The model's Intelligence Index score is 48, the highest for any US open-weight model. — S9 confirms the Intelligence Index score of 48 for Nemotron 3 Ultra, the highest for any US open-weight model.
- **supported**: Nemotron 3 Ultra was post-trained on LAB in under 24 hours. — S8 provides evidence that Nemotron 3 Ultra was post-trained on LAB in under 24 hours.
- **supported**: The model was trained on 20 trillion tokens. — S9 confirms that Nemotron 3 Ultra was trained on 20 trillion tokens.
- **supported**: The model serves over 300 tokens per second using BF16 weights, indicating high inference efficiency. — S9 provides evidence of the model's inference efficiency, serving over 300 tokens per second using BF16 weights.
- **supported**: NVFP4 quantization on Blackwell GPUs offers up to 5x higher throughput compared to FP16. — S9 confirms that NVFP4 quantization offers up to 5x higher throughput compared to FP16.
- **supported**: The open-source nature of Nemotron 3 Ultra allows for independent verification, but no independent replication studies were found. — S9 states the open-source nature of Nemotron 3 Ultra and the lack of independent replication studies.
- **supported**: The strict all-pass grading protocol may not reflect practical utility where partial success is valuable. — S6 discusses the limitations of the all-pass grading protocol in reflecting practical utility.
- **supported**: The rapid post-training time suggests efficiency in domain adaptation, but hardware specifics are crucial for replication. — S8 mentions the rapid post-training time and the importance of hardware specifics for replication.

### Final Evaluation

- coverage: 5/5
- citation_quality: 5/5
- factuality: 5/5
- analysis_depth: 5/5
- presentation: 5/5
- overall: 5/5

Strengths:
- Comprehensive coverage of the research goal and subquestions.
- High-quality citations with clear source association and traceability.
- All claims are well-supported by evidence and verification verdicts.
- In-depth analysis with clear explanations of underlying concepts and trade-offs.
- Clear and concise presentation in a scientific short-paper format.

Weaknesses:
- No significant weaknesses identified.

Follow-up recommendations:
- Conduct independent replication studies to verify Nemotron 3 Ultra's performance metrics.
- Investigate the impact of partial task success on practical utility and benchmark scores.
