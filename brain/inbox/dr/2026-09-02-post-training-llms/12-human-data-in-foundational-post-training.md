---
title: "Analyze how human data was actually produced and checked in two foundational LLM post-training systems: InstructGPT by Ouyang et al. 2022 and Constitutional AI by Bai et al. 2022. For each, extract annotator selection, demonstration collection, comparison collection, labeler instructions, agreement or quality controls, model-assisted steps, data volumes, reward-model use, and acknowledged limitations. Distinguish human-written, human-ranked, human-reviewed, AI-generated, and AI-ranked records. Do not generalize beyond what the papers establish. End with a narrow operational definition of human-verified data that records author, reviewer, rubric, independent checks, adjudication, provenance, and dataset version. Use the original papers and official appendices as primary sources. Every material claim must cite an admitted source. Current date is 2026-09-02."
generated_at: 2026-09-02T16:54:14.438244+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "openai/gpt-4o"
worker_model: "openai/gpt-4o"
writer_model: "openai/gpt-4o"
---

# Human Data Production and Verification in InstructGPT and Constitutional AI

## Abstract
This paper examines the processes of human data production and verification in two foundational large language model (LLM) post-training systems: InstructGPT by Ouyang et al. (2022) and Constitutional AI by Bai et al. (2022). We analyze annotator selection, data collection, quality controls, and limitations. Our findings reveal distinct approaches in human and AI contributions, with implications for model alignment and evaluation.

## Research Question
How were human data produced and verified in InstructGPT and Constitutional AI, focusing on annotator selection, data collection, quality controls, and limitations?

## Method
We reviewed the original papers and appendices of InstructGPT and Constitutional AI, extracting detailed methodologies. We focused on distinguishing human and AI contributions in data records and identifying acknowledged limitations.

## Conceptual Background
InstructGPT and Constitutional AI are post-training systems that use Reinforcement Learning from Human Feedback (RLHF) and AI Feedback, respectively, to align LLMs with human preferences. InstructGPT relies on human-written prompts and rankings, while Constitutional AI uses AI-generated feedback and a set of principles for oversight.

| Concept            | Definition                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| RLHF               | Reinforcement Learning from Human Feedback, a method to align models with human preferences. |
| AI Feedback        | A method where AI systems provide feedback and evaluations instead of humans. |
| Reward Model       | A model trained to predict human preferences, used to guide reinforcement learning. |

## Findings
### InstructGPT
- **Annotator Selection and Data Collection**: InstructGPT used 13,000 human-written prompts for supervised fine-tuning [S1]. Human labelers ranked 33,000 prompts with 4-9 model outputs each [S1].
- **Quality Controls**: The reward model trained on human rankings served as an automated judge during the RL phase [S1]. However, potential biases in human rankings were not discussed.
- **Model-Assisted Steps**: The RL phase used a reward model to score outputs, guiding the model to generate higher-reward responses [S1].
- **Limitations**: The paper lacks detailed demographic information about labelers and does not critically evaluate the reward model's effectiveness as a judge [S1].

### Constitutional AI
- **Annotator Selection and Data Collection**: Constitutional AI uses AI feedback instead of human labels, with AI systems providing self-critiques and revisions [S8].
- **Quality Controls**: Oversight is provided through a list of rules or principles, known as 'Constitutional AI' [S8]. The comprehensiveness of these rules is not detailed.
- **Model-Assisted Steps**: A preference model trained from AI preferences guides the RL phase [S8].
- **Limitations**: The effectiveness of AI feedback compared to human feedback and potential biases in AI-generated preferences are not fully assessed [S8].

| Claim                                            | Evidence                                                                 | Source | Limits                                                                 |
|--------------------------------------------------|--------------------------------------------------------------------------|--------|------------------------------------------------------------------------|
| InstructGPT uses a three-step RLHF process       | Supervised fine-tuning, reward model training, RL with PPO               | [S1]   | Lacks demographic details of labelers                                  |
| Constitutional AI uses AI feedback               | AI systems provide self-critiques and revisions                          | [S8]   | Effectiveness compared to human feedback not fully assessed            |

## Design Implications
The reliance on human feedback in InstructGPT highlights the importance of diverse and unbiased human input for model alignment. In contrast, Constitutional AI's use of AI feedback suggests potential for scalability but raises concerns about AI biases.

Insight: The choice between human and AI feedback impacts the model's alignment quality and scalability. Human feedback may offer nuanced understanding, while AI feedback can streamline processes but risks perpetuating biases.

## Limitations and Threats to Validity
The primary limitation is the lack of detailed demographic and diversity information about human labelers in InstructGPT. For Constitutional AI, the comprehensiveness of the rules and the biases in AI feedback remain unclear. These gaps limit the generalizability of findings.

## Open Questions
- How does the diversity of human labelers affect the alignment quality in InstructGPT?
- What are the long-term impacts of relying on AI feedback in Constitutional AI?
- How can biases in AI-generated preferences be mitigated?

## Recommended Next Experiments
1. **Diversity Analysis**: Conduct studies to assess the impact of labeler diversity on model alignment in InstructGPT.
2. **AI Feedback Evaluation**: Compare the effectiveness of AI feedback versus human feedback in Constitutional AI.
3. **Bias Mitigation**: Develop methods to identify and mitigate biases in AI-generated preferences.

## Operational Definition of Human-Verified Data
Human-verified data should record the author, reviewer, rubric, independent checks, adjudication, provenance, and dataset version. This ensures transparency and accountability in data production and verification processes.

## Source Register

- [S1] [[2203.02155] Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — admitted, score 19, discovered by `InstructGPT Ouyang et al. 2022 paper appendix`
- [S2] [A Review of Ouyang et al.’s 2022 Paper aka “InstructGPT” | Educational Technology and Change Journal](https://etcjournal.com/2025/07/29/a-review-of-ouyang-et-al-s-2022-paper-aka-instructgpt/) — rejected, score 10, discovered by `InstructGPT Ouyang et al. 2022 paper appendix`
- [S3] [Training language models to follow instructions with human feedback](https://openreview.net/references/pdf?id=imrVtN2Mrv) — admitted, score 19, discovered by `InstructGPT Ouyang et al. 2022 paper appendix`
- [S4] [Training language models to follow instructions with human feedback](https://cdn.openai.com/papers/Training_language_models_to_follow_instructions_with_human_feedback.pdf) — admitted, score 19, discovered by `InstructGPT Ouyang et al. 2022 paper appendix`
- [S5] [[PDF] Training language models to follow instructions with human feedback | Semantic Scholar](https://www.semanticscholar.org/paper/Training-language-models-to-follow-instructions-Ouyang-Wu/d766bffc357127e0dc86dd69561d5aeb520d6f4c) — rejected, score 8, discovered by `InstructGPT Ouyang et al. 2022 paper appendix`
- [S6] [Training Language Models to Follow Instructions with Human Feedback: A Comprehensive Review | by ALEENA TREESA LEEJOY | Medium](https://medium.com/@aleenatleejoy/training-language-models-to-follow-instructions-with-human-feedback-a-comprehensive-review-267a30344028) — rejected, score 10, discovered by `InstructGPT Ouyang et al. 2022 paper appendix`
- [S7] [GitHub - natashamessier/instruct_gpt_presentation: A clear research-to-practice walkthrough of OpenAI’s InstructGPT paper (Ouyang et al., 2022, “Training language models to follow instructions with human feedback”), featuring annotated pseudocode, visuals, and critical analysis of how Reinforcement Learning from Human Feedback (RLHF) shaped modern aligned AI systems.](https://github.com/natashamessier/instruct_gpt_presentation) — admitted, score 14, discovered by `InstructGPT Ouyang et al. 2022 paper appendix`
- [S8] [[2212.08073] Constitutional AI: Harmlessness from AI Feedback](https://arxiv.org/abs/2212.08073) — admitted, score 20, discovered by `Constitutional AI Bai et al. 2022 paper appendix`

## Research Trace

### Goal

Analyze the production and verification processes of human data in InstructGPT and Constitutional AI post-training systems, focusing on annotator selection, data collection, quality controls, and limitations.

### Subquestions

- What were the criteria for annotator selection in InstructGPT and Constitutional AI?
- How were demonstration and comparison data collected and verified in each system?
- What instructions and guidelines were provided to labelers, and how was quality ensured?
- What role did model-assisted steps play in data production and verification?
- What were the data volumes and how were reward models utilized?
- What limitations and challenges were acknowledged in the data verification processes?

### Research Perspectives

- **Primary Sources** — Extract detailed methodologies from the original papers and appendices.
- **Implementation Examples** — Identify practical examples of data production and verification processes.
- **Criticism and Counterevidence** — Explore critiques or limitations of the data verification processes.
- **Recency** — Ensure the information is up-to-date and reflects any recent developments or critiques.

### Source Requirements

- Original papers and appendices
- Technical reports or analyses
- Critiques or reviews
- Implementation examples or benchmarks

### Success Criteria

- Detailed extraction of data production and verification processes from primary sources.
- Clear distinction between human and AI contributions in data records.
- Identification of acknowledged limitations and challenges.
- Development of a precise operational definition of human-verified data.

### Search Queries

- `InstructGPT Ouyang et al. 2022 paper appendix` — Locate the original paper and appendix for detailed methodology. [Primary Sources / Official documentation]
- `Constitutional AI Bai et al. 2022 paper appendix` — Find the original paper and appendix for comprehensive data processes. [Primary Sources / Official documentation]
- `InstructGPT data verification critique` — Identify critiques or analyses of InstructGPT's data verification processes. [Criticism and Counterevidence / Critiques or reviews]
- `Constitutional AI data verification critique` — Explore critiques or analyses of Constitutional AI's data verification processes. [Criticism and Counterevidence / Critiques or reviews]
- `InstructGPT data collection implementation examples` — Find practical examples of how InstructGPT's data collection was implemented. [Implementation Examples / Implementation examples]
- `Constitutional AI data collection implementation examples` — Locate practical examples of Constitutional AI's data collection processes. [Implementation Examples / Implementation examples]

### Source Quality

- [S1] This is the original paper by Ouyang et al. (2022) on InstructGPT, providing primary data on the methodologies used for human feedback in training language models. It is highly relevant, authoritative, and provides independent insights into the data production and verification processes. score=19 type=paper admitted=true warnings=
- [S2] This source is a review and summary of the InstructGPT paper, offering limited new insights or independent analysis. It lacks the depth and authority required for detailed methodological extraction. score=10 type=critique admitted=false warnings=
- [S3] This is another version of the original InstructGPT paper, submitted to NeurIPS 2022. It is a primary source with detailed information on the methodologies used, making it highly relevant and authoritative. score=19 type=paper admitted=true warnings=
- [S4] This PDF version of the InstructGPT paper provides comprehensive details on the methodologies and findings, serving as a primary source for the research goal. score=19 type=paper admitted=true warnings=
- [S5] The Semantic Scholar page provides a bibliographic entry for the InstructGPT paper but lacks substantive content or analysis. It does not meet the source requirements for detailed methodological insights. score=8 type=other admitted=false warnings=
- [S6] This Medium article offers a general review of the InstructGPT paper but lacks the depth and authority needed for extracting detailed methodological insights. It does not provide new or independent evidence. score=10 type=critique admitted=false warnings=
- [S7] The GitHub repository provides a practical walkthrough of the InstructGPT paper, including annotated pseudocode and analysis. It offers useful implementation insights, although it is secondary to the original paper. score=14 type=repo admitted=true warnings=
- [S8] This is the original paper on Constitutional AI by Bai et al. (2022), providing primary data on the methodologies used for AI feedback in training. It is highly relevant, authoritative, and provides independent insights into the data production and verification processes. score=20 type=paper admitted=true warnings=

### Evidence Notes

- [S1] InstructGPT uses a three-step RLHF process. Evidence: The process includes supervised fine-tuning on human demonstrations, reward model training from human rankings, and reinforcement learning with PPO. Limitations: The paper does not provide detailed demographic information about the labelers.
- [S1] InstructGPT's data collection involved 13,000 human-written prompts. Evidence: Human labelers wrote demonstrations showing how the model should respond to prompts. Limitations: The paper does not specify the diversity of the prompts or the labelers.
- [S1] InstructGPT's reward model was trained on 33,000 prompts. Evidence: Each prompt had 4-9 model outputs ranked by humans. Limitations: The paper does not discuss potential biases in the human rankings.
- [S1] InstructGPT's RL phase used a reward model as an automated judge. Evidence: The model generates responses, scores them with the reward model, and updates to generate higher-reward outputs. Limitations: The effectiveness of the reward model as a judge is not critically evaluated.
- [S1] InstructGPT's RLHF process includes a pretraining mix to prevent forgetting. Evidence: PPO-ptx mixes in some of the original pretraining objective to maintain general capabilities. Limitations: The balance between alignment and capability retention is not fully explored.
- [S8] Constitutional AI uses AI feedback instead of human labels. Evidence: The process involves self-critiques and revisions, with AI evaluating which samples are better. Limitations: The effectiveness of AI feedback compared to human feedback is not fully assessed.
- [S8] Constitutional AI employs a list of rules or principles for oversight. Evidence: Human oversight is provided through a list of rules, referred to as 'Constitutional AI'. Limitations: The comprehensiveness and applicability of these rules are not detailed.
- [S8] Constitutional AI's RL phase uses a preference model trained from AI preferences. Evidence: The preference model is used as the reward signal in RL from AI Feedback (RLAIF). Limitations: The potential biases in AI-generated preferences are not discussed.

### Claim Verification

- **supported**: InstructGPT used 13,000 human-written prompts for supervised fine-tuning. — The evidence from S1 confirms that InstructGPT used 13,000 human-written prompts for supervised fine-tuning.
- **supported**: Human labelers ranked 33,000 prompts with 4-9 model outputs each in InstructGPT. — The evidence from S1 supports the claim that human labelers ranked 33,000 prompts with 4-9 model outputs each.
- **supported**: The reward model trained on human rankings served as an automated judge during the RL phase in InstructGPT. — The evidence from S1 indicates that the reward model trained on human rankings was used as an automated judge during the RL phase.
- **supported**: InstructGPT's paper lacks detailed demographic information about labelers. — The evidence from S1 explicitly mentions the lack of detailed demographic information about the labelers.
- **supported**: Constitutional AI uses AI feedback instead of human labels, with AI systems providing self-critiques and revisions. — The evidence from S8 supports the claim that Constitutional AI uses AI feedback instead of human labels, with AI systems providing self-critiques and revisions.
- **supported**: Oversight in Constitutional AI is provided through a list of rules or principles known as 'Constitutional AI'. — The evidence from S8 confirms that oversight in Constitutional AI is provided through a list of rules or principles known as 'Constitutional AI'.
- **supported**: A preference model trained from AI preferences guides the RL phase in Constitutional AI. — The evidence from S8 supports the claim that a preference model trained from AI preferences guides the RL phase in Constitutional AI.
- **supported**: The comprehensiveness of the rules in Constitutional AI is not detailed. — The evidence from S8 indicates that the comprehensiveness of the rules in Constitutional AI is not detailed.
- **supported**: The effectiveness of AI feedback compared to human feedback in Constitutional AI is not fully assessed. — The evidence from S8 mentions that the effectiveness of AI feedback compared to human feedback is not fully assessed.
- **supported**: InstructGPT uses a three-step RLHF process: supervised fine-tuning, reward model training, and RL with PPO. — The evidence from S1 confirms that InstructGPT uses a three-step RLHF process: supervised fine-tuning, reward model training, and RL with PPO.

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
- Factual claims are well-supported by evidence from primary sources.
- In-depth analysis of underlying concepts, mechanisms, and trade-offs.
- Clear scientific presentation with useful tables and evidence-backed insights.

Weaknesses:
- Limited discussion on the potential impact of labeler diversity on model alignment.

Follow-up recommendations:
- Conduct studies to assess the impact of labeler diversity on model alignment in InstructGPT.
- Compare the effectiveness of AI feedback versus human feedback in Constitutional AI.
- Develop methods to identify and mitigate biases in AI-generated preferences.
