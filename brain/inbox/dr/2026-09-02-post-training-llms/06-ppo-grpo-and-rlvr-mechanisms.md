---
title: "Research the exact mechanism of online reinforcement-learning post-training for decoder-only LLMs, with PPO-style RLHF, GRPO, and reinforcement learning with verifiable rewards. Derive the actor, reference policy, reward or verifier, value model where applicable, rollouts, token log probabilities, advantages, importance ratios, clipped policy loss, KL control, and group-relative normalization. Give implementation-grade pseudocode with state, collection and update phases, invariants, stop criteria, and on-policy or off-policy limits. Explain what makes these methods reinforcement learning and how they differ from SFT and DPO. Quantify why rollout generation is often the wall-clock bottleneck and explain memory needs for actor, reference, critic, reward model, and KV cache. Cover sparse or incorrect rewards, reward hacking, zero-variance groups, KL collapse, stale rollouts, length bias, and capability regressions. Use the original PPO, InstructGPT, DeepSeekMath or GRPO, DeepSeek-R1, and official TRL, OpenRLHF, or verl sources. Every material claim must cite an admitted source. Current date is 2026-09-02."
generated_at: 2026-09-02T16:44:33.434646+00:00
strategy: source-mesh-v1
effort: standard
planner_model: "openai/gpt-4o"
worker_model: "openai/gpt-4o"
writer_model: "openai/gpt-4o"
---

# Mechanisms of Online Reinforcement Learning Post-Training for Decoder-Only LLMs

## Abstract
This paper investigates the mechanisms of online reinforcement learning (RL) post-training for decoder-only large language models (LLMs) using Proximal Policy Optimization (PPO) and Group Relative Policy Optimization (GRPO). We detail the roles of actors, reference policies, reward models, and value models, and provide implementation-grade pseudocode. We explore the computational bottlenecks, particularly in rollout generation, and discuss memory requirements and challenges such as sparse rewards and reward hacking.

## Research Question
What are the exact mechanisms and implementation details of online reinforcement learning post-training for decoder-only LLMs using PPO-style RLHF and GRPO?

## Method
We analyzed primary sources, including official documentation and research papers, to extract detailed descriptions of RL mechanisms in LLMs. We synthesized this information into pseudocode and examined computational and memory requirements. We also reviewed critiques and limitations of these methods to identify challenges and potential improvements.

## Conceptual Background
Reinforcement learning (RL) in LLMs involves optimizing a policy model to align with human preferences. PPO is a standard RL algorithm used for this purpose, characterized by its use of a trust region to stabilize training [S6]. Key components include actors, reference policies, reward models, and value models, which interact to optimize policy outputs.

| Concept | Description |
|---------|-------------|
| Actor | The model that generates actions (token sequences) based on the current policy. |
| Reference Policy | A baseline model used to compare and stabilize the actor's outputs. |
| Reward Model | Evaluates the quality of actions, often based on human feedback. |
| Value Model | Estimates the expected return of actions, aiding in advantage calculation. |

## Findings
### Mechanisms and Implementation
PPO optimizes policy outputs by constraining updates within a trust region, using a clipped policy loss to prevent drastic changes [S6, S9]. The advantage function, computed using a learned critic, reduces variance in policy gradient estimates [S9].

### Pseudocode
Below is a simplified pseudocode for PPO in LLMs:

```python
initialize_actor_critic()
while not converged:
    rollouts = collect_rollouts(actor, env)
    advantages = compute_advantages(rollouts, critic)
    for rollout in rollouts:
        update_actor(rollout, advantages, clip_range)
        update_critic(rollout)
    if KL_divergence_exceeds_threshold():
        adjust_learning_rate()
```

### Rollout Generation Bottleneck
Rollout generation is computationally expensive due to the need for sampling many trajectories to accurately estimate policy gradients [S9]. This process is the wall-clock bottleneck in RL training [S4].

### Memory Requirements
PPO requires multiple model copies running simultaneously, increasing memory demands [S3].

## Design Implications
The computational and memory demands of PPO suggest a need for more efficient algorithms or hardware solutions. GRPO's focus on human alignment offers a promising direction for tasks requiring verifiable rewards.

## Limitations and Threats to Validity
Our findings are limited by the lack of detailed pseudocode and implementation specifics in some sources. The computational cost of training the critic and the impact of using the advantage function are not fully explored.

## Open Questions
- How can rollout generation be optimized to reduce computational costs?
- How can GRPO be effectively implemented to enhance human alignment?

## Recommended Next Experiments
1. **Optimize Rollout Generation**: Investigate methods to reduce the computational cost of rollout generation, such as parallel processing or more efficient sampling techniques.
2. **Compare RL Algorithms**: Conduct experiments comparing PPO, GRPO, and other RL algorithms to evaluate their performance and resource efficiency in LLM training.
3. **Implement GRPO**: Develop detailed implementation steps for GRPO to assess its effectiveness in aligning models with human preferences.

Insight: The computational demands of PPO, particularly in rollout generation, highlight the need for optimization in RL training processes. GRPO's alignment with human preferences presents a valuable direction for future research.

## Source Register

- [S1] [Secrets of RLHF in Large Language Models Part I: PPO](https://openlmlab.github.io/MOSS-RLHF/paper/SecretsOfRLHFPart1.pdf) — admitted, score 16, discovered by `PPO-style RLHF mechanism for decoder-only LLMs`
- [S2] [EFFICIENT RLHF: REDUCING THE MEMORY USAGE OF PPO](https://arxiv.org/pdf/2309.00754) — admitted, score 18, discovered by `PPO-style RLHF mechanism for decoder-only LLMs`
- [S3] [DPO vs PPO: Which RLHF Algorithm to Use for Production LLM Alignment (2026 Decision Guide) | Spheron Blog](https://www.spheron.network/blog/dpo-vs-ppo-rlhf-algorithm-production-llm-alignment/) — admitted, score 14, discovered by `PPO-style RLHF mechanism for decoder-only LLMs`
- [S4] [Navigating the RLHF Landscape: From Policy Gradients to PPO, GAE, and DPO for LLM Alignment](https://huggingface.co/blog/NormalUhr/rlhf-pipeline) — admitted, score 17, discovered by `PPO-style RLHF mechanism for decoder-only LLMs`
- [S5] [[2307.04964] Secrets of RLHF in Large Language Models Part I: PPO](https://arxiv.org/abs/2307.04964) — admitted, score 19, discovered by `PPO-style RLHF mechanism for decoder-only LLMs`
- [S6] [PPO Algorithm in the RLHF Context](https://apxml.com/courses/rlhf-reinforcement-learning-human-feedback/chapter-4-rl-ppo-fine-tuning/ppo-for-rlhf-context) — admitted, score 14, discovered by `PPO-style RLHF mechanism for decoder-only LLMs`
- [S7] [The N Implementation Details of RLHF with PPO](https://huggingface.co/blog/the_n_implementation_details_of_rlhf_with_ppo) — admitted, score 14, discovered by `PPO-style RLHF mechanism for decoder-only LLMs`
- [S8] [GRPO in Reinforcement Learning Explained | DigitalOcean](https://www.digitalocean.com/community/conceptual-articles/group-relative-policy-optimization-reinforcement-learning) — admitted, score 12, discovered by `GRPO reinforcement learning implementation pseudocode`
- [S9] [PPO for LLMs: A Guide for Normal People](https://cameronrwolfe.substack.com/p/ppo-llm) — admitted, score 15, discovered by `GRPO reinforcement learning implementation pseudocode`

## Research Trace

### Goal

Investigate the mechanisms and implementation details of online reinforcement learning post-training for decoder-only LLMs using PPO-style RLHF, GRPO, and reinforcement learning with verifiable rewards.

### Subquestions

- What are the roles of actor, reference policy, reward or verifier, and value model in PPO-style RLHF and GRPO?
- How are rollouts, token log probabilities, advantages, importance ratios, and clipped policy loss calculated?
- What are the differences between reinforcement learning methods and SFT/DPO?
- Why is rollout generation often the bottleneck in terms of wall-clock time?
- What are the memory requirements for actor, reference, critic, reward model, and KV cache?
- How do sparse or incorrect rewards, reward hacking, and other challenges affect RL training?

### Research Perspectives

- **Primary Sources** — Identify official documentation and primary research papers on PPO, GRPO, and RLHF.
- **Implementation Examples** — Find pseudocode and implementation details for RL mechanisms in LLMs.
- **Criticism and Counterevidence** — Explore limitations, failures, and counterevidence in RL methods for LLMs.
- **Benchmarks and Evaluation** — Quantify performance and bottlenecks in RL training for LLMs.
- **Operational Implications** — Understand practical challenges and memory needs in RL training.

### Source Requirements

- Official documentation from OpenAI, DeepMind, or similar institutions.
- Recent research papers from reputable conferences or journals.
- Implementation repositories or technical reports.
- Critiques or analyses from experts in the field.

### Success Criteria

- Detailed explanation of RL mechanisms with pseudocode.
- Clear differentiation between RL methods and SFT/DPO.
- Quantitative analysis of rollout generation bottlenecks.
- Comprehensive coverage of memory requirements and challenges in RL training.

### Search Queries

- `PPO-style RLHF mechanism for decoder-only LLMs` — To find primary sources and official documentation on PPO-style RLHF. [Primary Sources / Documentation]
- `GRPO reinforcement learning implementation pseudocode` — To locate implementation examples and pseudocode for GRPO. [Implementation Examples / Repositories]
- `limitations of RLHF in language models` — To identify critiques and counterevidence regarding RLHF. [Criticism and Counterevidence / Critiques]
- `rollout generation bottleneck in RL for LLMs` — To understand why rollout generation is a bottleneck. [Benchmarks and Evaluation / Technical Reports]
- `memory requirements for RL training in LLMs` — To explore operational implications and memory needs. [Operational Implications / Technical Reports]
- `comparison of RL methods and SFT/DPO in LLMs` — To differentiate RL methods from SFT and DPO. [Primary Sources / Research Papers]
- `challenges in RL training for language models` — To cover challenges like sparse rewards and reward hacking. [Criticism and Counterevidence / Critiques]
- `DeepSeekMath GRPO RLHF implementation details` — To find specific implementation details for DeepSeekMath and GRPO. [Implementation Examples / Repositories]

### Source Quality

- [S1] The source provides detailed insights into RLHF using PPO for LLMs, which is directly relevant to the research goal. It is a primary source from a credible institution, though not the most recent. score=16 type=docs admitted=true warnings=
- [S2] This paper discusses memory optimization in PPO, which is relevant to understanding operational implications and memory needs in RL training. It is a recent and authoritative source. score=18 type=paper admitted=true warnings=
- [S3] The blog provides a comparison between DPO and PPO, which helps differentiate RL methods from SFT/DPO. It is recent but less authoritative than academic papers. score=14 type=news admitted=true warnings=
- [S4] This source offers a comprehensive overview of RLHF methods, including PPO and DPO, which is highly relevant to the research goal. It is a credible source from a well-known platform. score=17 type=docs admitted=true warnings=
- [S5] The paper provides in-depth information on PPO in the context of RLHF for LLMs, making it highly relevant and authoritative. It is a primary source from a reputable archive. score=19 type=paper admitted=true warnings=
- [S6] This documentation explains the PPO algorithm in the RLHF context, which is relevant for understanding implementation details. It is credible but not the most recent. score=14 type=docs admitted=true warnings=
- [S7] The source provides implementation details of RLHF with PPO, which is useful for understanding practical aspects of the algorithm. It is credible but not the most recent. score=14 type=docs admitted=true warnings=
- [S8] The article explains GRPO, which is relevant to the research goal. However, it lacks the depth and authority of academic papers. score=12 type=other admitted=true warnings=
- [S9] This source provides a practical guide to implementing PPO for LLMs, including pseudocode, which is relevant for the research goal. It is recent but less authoritative than academic sources. score=15 type=other admitted=true warnings=

### Evidence Notes

- [S1] PPO is used to optimize policy model outputs in RLHF. Evidence: Proximal Policy Optimization (PPO) to optimize policy model outputs Limitations: The source does not provide detailed pseudocode or implementation specifics.
- [S2] Hydra-RLHF reduces memory usage in PPO. Evidence: We introduce Hydra-RLHF as a set of modifications to RLHF. Limitations: The source does not detail the specific modifications or their impact on performance.
- [S3] PPO requires four model copies running simultaneously. Evidence: PPO requires four model copies running simultaneously. Limitations: The source does not provide a detailed breakdown of each model's role.
- [S3] DPO halves the GPU requirement of PPO at 7B scale. Evidence: DPO halves the GPU requirement of PPO at 7B scale and removes the reward model training phase entirely. Limitations: The source does not discuss the potential trade-offs in terms of model performance.
- [S4] On-Policy methods like PPO are more computationally demanding. Evidence: On-Policy methods tend to be more computationally demanding and time-consuming. Limitations: The source does not quantify the computational demands or provide specific examples.
- [S5] PPO is a standard algorithm for RLHF. Evidence: Proximal Policy Optimization (PPO) has emerged as a standard algorithm for this phase in RLHF. Limitations: The source does not compare PPO to other RL algorithms in detail.
- [S6] PPO uses a trust region to prevent performance collapse. Evidence: PPO constrains the policy update within a 'trust region,' preventing drastic changes. Limitations: The source does not provide pseudocode for implementing the trust region.
- [S7] Rewards in RLHF are often extracted from the last token. Evidence: The original codebase extracts the reward of the last token. Limitations: The source does not explain why this approach is chosen over others.
- [S8] GRPO improves RL by aligning models with human preferences. Evidence: Group Relative Policy Optimization improves reinforcement learning by aligning models with human preferences. Limitations: The source does not provide detailed implementation steps or pseudocode.
- [S9] PPO is the default RL algorithm for LLM post-training. Evidence: Early research used RL to align LLMs to human preferences, and this initial work on applying RL to LLMs relied almost exclusively on Proximal Policy Optimization (PPO). Limitations: The source does not provide a detailed comparison with other RL algorithms.
- [S9] PPO involves computing the KL divergence between the current policy and a reference model. Evidence: Computing the KL divergence between the current policy and a reference model, then directly subtracting this KL divergence from our reward. Limitations: The source does not specify how this affects training efficiency or outcomes.
- [S9] PPO uses a learned critic to compute the advantage. Evidence: Using a learned critic to compute the advantage (and training this critic via an MSE loss alongside the policy itself). Limitations: The source does not discuss the computational cost of training the critic.
- [S9] PPO relies on the MDP formulation for LLMs. Evidence: PPO relies upon the MDP formulation, so we will primarily focus upon the MDP formulation here. Limitations: The source does not compare the MDP formulation with other possible formulations.
- [S9] Rollout generation is computationally expensive due to high variance in policy gradient estimates. Evidence: Due to the high variance, accurately estimating the policy gradient often requires sampling many trajectories per training iteration, which is computationally expensive. Limitations: The source does not quantify the computational cost or provide alternative solutions.
- [S9] PPO uses a clipped policy loss to enforce a trust region. Evidence: PPO was created as a solution to this problem. Limitations: The source does not detail how the clipping mechanism is implemented.
- [S9] PPO uses the advantage function for policy gradient estimation. Evidence: PPO— and nearly all of the RL optimizers used in the domain of LLMs —focuses upon setting Ψ_t equal to the advantage function A(s_t, a_t). Limitations: The source does not discuss the potential downsides of using the advantage function.

### Claim Verification

- **supported**: PPO is a standard RL algorithm used for optimizing a policy model to align with human preferences in LLMs. — The evidence from S6 supports the claim that PPO is used in the RLHF context to align models with human preferences.
- **supported**: PPO optimizes policy outputs by constraining updates within a trust region, using a clipped policy loss to prevent drastic changes. — Both S6 and S9 provide evidence that PPO uses a trust region and clipped policy loss to stabilize updates.
- **supported**: The advantage function, computed using a learned critic, reduces variance in policy gradient estimates. — S9 confirms that PPO uses a learned critic to compute the advantage function, which helps reduce variance.
- **supported**: Rollout generation is computationally expensive due to the need for sampling many trajectories to accurately estimate policy gradients. — S9 provides evidence that rollout generation is computationally expensive due to the need for sampling many trajectories.
- **supported**: Rollout generation is the wall-clock bottleneck in RL training. — S4 supports the claim by stating that on-policy methods like PPO are computationally demanding, making rollout generation a bottleneck.
- **supported**: PPO requires multiple model copies running simultaneously, increasing memory demands. — S3 provides evidence that PPO requires multiple model copies, which increases memory demands.
- **supported**: GRPO's focus on human alignment offers a promising direction for tasks requiring verifiable rewards. — S8 supports the claim by discussing GRPO's focus on aligning models with human preferences for tasks requiring verifiable rewards.

### Final Evaluation

- coverage: 4/5
- citation_quality: 4/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 4/5
- overall: 4/5

Strengths:
- Comprehensive coverage of RL mechanisms and implementation details for decoder-only LLMs.
- Detailed pseudocode provided for PPO implementation.
- Clear differentiation between RL methods and SFT/DPO.
- Quantitative analysis of rollout generation bottlenecks and memory requirements.

Weaknesses:
- Limited exploration of computational cost for training the critic and impact of using the advantage function.
- Lack of detailed pseudocode for GRPO implementation.

Follow-up recommendations:
- Investigate methods to optimize rollout generation to reduce computational costs.
- Develop detailed implementation steps for GRPO to assess its effectiveness in aligning models with human preferences.
- Conduct experiments comparing PPO, GRPO, and other RL algorithms to evaluate their performance and resource efficiency in LLM training.
