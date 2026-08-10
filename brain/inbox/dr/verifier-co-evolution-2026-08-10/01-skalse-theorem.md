---
title: "What exactly does Skalse et al. 2022 Defining and Characterizing Reward Hacking prove? Verify the definitions of reward hacking and unhackability, the theorem for all stochastic policies, assumptions on the MDP and policy set, and limitations for finite policy sets. Quote or cite the paper's exact theorem language and list corrections to a technical note that applies it to adaptive verifiers."
generated_at: 2026-08-10T11:26:42.645164+00:00
strategy: deep-agent-v1
effort: standard
planner_model: "z-ai/glm-5.2"
worker_model: "deepseek/deepseek-v4-flash"
writer_model: "z-ai/glm-5.2"
---

# Skalse et al. 2022: Formal Definitions and Impossibility Results for Reward Hacking

## Abstract

Skalse et al. 2022 provide the first formal definition of reward hacking and a central notion of "unhackability" for proxy reward functions in Markov Decision Processes (MDPs) [S1, S28]. Their main result is an impossibility theorem: for the set of all stochastic policies, two reward functions can be unhackable only if one is constant or they induce identical policy orderings [S1, S20, S28]. The result extends to both stationary and non-stationary stochastic policies [S20]. For finite policy sets, non-trivial unhackable pairs exist but are argued to be practically unhelpful [S8, S20, S28]. The admitted sources do not contain any technical note applying these results to adaptive verifiers, so corrections from such a note cannot be verified here.

## Research Question

What exactly does Skalse et al. 2022 prove about reward hacking and unhackability, under what assumptions, and with what limitations—particularly for finite policy sets? Additionally, what corrections does a technical note on adaptive verifiers make to these results?

## Method

This report synthesizes evidence from the arXiv abstract and submission metadata [S1, S28], the NeurIPS 2022 proceedings page [S8], an Alignment Forum exposition that quotes and paraphrases the paper's formal sections [S20], and a Wikipedia summary [S7]. The primary limitation is that the admitted sources do not include the full paper text or any technical note on adaptive verifiers. Where exact language is available, it is quoted; otherwise, claims are attributed to the closest available paraphrase.

## Conceptual Background

The paper operates within the standard MDP framework. A reward function assigns real-valued returns to policies, and the expected return of a policy under a reward function is denoted $J(\pi)$. Two reward functions are at stake: a "true" reward $R_1$ and a "proxy" reward $R_2$. The central question is when optimizing $R_2$ cannot degrade performance under $R_1$.

| Term | Meaning | Source |
|---|---|---|
| Reward hacking | Optimizing a proxy reward degrades true reward performance | [S1, S28] |
| Unhackability | No pair of policies where proxy return increases but true return decreases | [S8, S20] |
| Stochastic policy | Maps states to probability distributions over actions | [S7] |
| Stationary policy | Policy depends only on current state, not history | [S20] |
| Simplification | A special case of unhackability; conditions given in the paper | [S28] |

The formal definition of unhackability, as quoted from the paper's "Background Question and Problem Formalisation" section, is:

> "We say that $R_1$ and $R_2$ are unhackable (with respect to each other) if there are no policies $\pi_1, \pi_2$ such that $J_1(\pi_1) > J_1(\pi_2)$ but $J_2(\pi_1) < J_2(\pi_2)$." [S20]

This definition is asymmetric: it permits ties where $J_1(\pi_1) = J_1(\pi_2)$ but $J_2(\pi_1) < J_2(\pi_2)$ [S20]. The paper also notes that this is a "fairly strong notion of unhackability" and that weaker formalizations may be worth studying [S20].

## Findings

### Main Impossibility Theorem

The paper's central result, paraphrased from the "Results" section, is:

> "$R_1$ and $R_2$ only can be unhackable if either $R_1$ and $R_2$ induce exactly the same ordering of policies (in which case they are equivalent), or if at least one of $R_1$ and $R_2$ is indifferent between all policies (in which case it is trivial)." [S20]

The abstract states this more concisely: "for the set of all stochastic policies, two reward functions can only be unhackable if one of them is constant" [S1, S28]. Here "constant" means "indifferent between all policies"—i.e., the reward function assigns the same expected return to every policy [S20].

### Scope: Stationary vs. Non-Stationary Policies

The result applies to both non-stationary and stationary stochastic policies. For non-stationary policies, the proof uses a mixing argument between policies. As the Alignment Forum exposition notes:

> "The same argument cannot be applied to the set of stationary policies, because $\pi_\lambda$ is typically not stationary ... However, with a slightly more complicated argument, it is possible to show that the same result applies to the set of all stationary policies as well." [S20]

### Mathematical Mechanism

The key insight driving the impossibility result is the linearity of reward in state-action visitation frequencies [S1, S28]. Because expected return is a linear function of the state-action occupancy measure, the set of achievable return pairs $(J_1(\pi), J_2(\pi))$ forms a convex set. Unhackability requires that no point in this set dominates another in one coordinate while being dominated in the other—effectively requiring the Pareto frontier to be a single line or point, which happens only when one reward is constant or both rewards induce the same ordering [S20].

The paper explicitly notes that this result depends on geometric properties specific to MDPs and reward functions, and that "an analogous result doesn't hold for arbitrary real-valued functions on arbitrary sets" [S20].

### Finite Policy Sets

For finite policy sets—including the set of all deterministic policies—non-trivial unhackable pairs exist [S8, S28]. However, the paper argues this is practically unhelpful:

> "We can introduce a small perturbation of any given reward function $R_1$ to produce another reward function $R_2$ that is almost the same as $R_1$ on a given finite set of policies, and so this result is unlikely to be very helpful in practice." [S20]

The paper also establishes necessary and sufficient conditions for the existence of "simplifications," an important special case of unhackability, in the finite policy setting [S28]. The admitted sources do not provide the exact conditions.

### Summary of Theorem Conditions

| Condition | Requirement | Source |
|---|---|---|
| Policy set | All stochastic policies (stationary or non-stationary) | [S1, S20, S28] |
| MDP structure | Standard MDP with linear reward in state-action visit counts | [S1, S20, S28] |
| Reward functions | Two real-valued reward functions $R_1$ (true), $R_2$ (proxy) | [S20] |
| Conclusion | Unhackable iff one is constant or both induce same policy ordering | [S1, S20, S28] |
| Finite policy sets | Non-trivial unhackable pairs exist but are practically vacuous | [S8, S20, S28] |

### Evidence Table

| Claim | Evidence | Source | Limits |
|---|---|---|---|
| Reward hacking = optimizing proxy degrades true performance | Abstract: "a phenomenon where optimizing an imperfect proxy reward function leads to poor performance according to the true reward function" | [S1, S28] | Assumes a single true reward |
| Unhackability formal definition | "no policies $\pi_1, \pi_2$ such that $J_1(\pi_1) > J_1(\pi_2)$ but $J_2(\pi_1) < J_2(\pi_2)$" | [S20] | Asymmetric; allows ties |
| Main theorem: one reward must be constant | "for the set of all stochastic policies, two reward functions can only be unhackable if one of them is constant" | [S1, S28] | Only for all stochastic policies |
| Result extends to stationary policies | "with a slightly more complicated argument, it is possible to show that the same result applies to the set of all stationary policies" | [S20] | Full proof not in source excerpt |
| Finite policy sets allow non-trivial unhackable pairs | "non-trivial unhackable pairs always exist" | [S8, S28] | Practically unhelpful per [S20] |
| Result depends on MDP geometry | "this result depends on certain geometric properties that specifically hold for MDPs and reward functions" | [S20] | Specific properties not detailed in sources |
| No adaptive verifier technical note found | Admitted sources contain no mention of adaptive verifiers | [S1, S7, S8, S20, S28] | Source set limitation |

### Technical Note on Adaptive Verifiers

The admitted source register does not contain any technical note, follow-up paper, or correction that applies Skalse et al.'s results to adaptive verifiers. None of the five admitted sources mention adaptive verifiers [S1, S7, S8, S20, S28]. This is a gap in the available evidence, not a finding about the nonexistence of such a note.

### Paper Version and Corrections

The paper was originally submitted to arXiv on 27 September 2022 and revised to version 2 on 5 March 2025 [S28]. The revision fixes a typo in Figure 1, updates a code link in the Appendix, and removes unrendered characters from the arXiv abstract [S1, S28]. No changes to theorem statements or proofs are mentioned [S1, S28].

## Design Implications

The impossibility result has a direct implication for reward learning and AI alignment: if a learned proxy reward must be unhackable against all stochastic policies, it must either be trivial (constant) or perfectly match the true reward's policy ordering [S1, S20, S28]. This means that achieving unhackability in the general case is equivalent to solving the reward learning problem exactly.

Insight: The linearity of expected return in occupancy measures is the structural reason unhackability is so restrictive. Any two non-trivial reward functions will generically produce trade-offs in policy space, creating pairs where one policy scores higher on the proxy but lower on the true reward. This is not a deficiency of the definition but a consequence of the geometry of MDP return vectors.

For practitioners using restricted policy classes (e.g., neural network policies with bounded capacity), the finite-policy-set result suggests that apparent unhackability may be an artifact of the restriction rather than a genuine safety guarantee [S20]. A small perturbation of the true reward can appear unhackable on any fixed finite set, which means testing unhackability on a finite policy set provides weak evidence.

## Limitations and Threats to Validity

**Source limitations.** The admitted sources include the arXiv abstract and metadata [S1, S28], the NeurIPS proceedings abstract [S8], an Alignment Forum blog exposition [S20], and a Wikipedia article [S7]. The full paper text is not in the source set. Exact theorem numbers, full proof details, precise MDP assumptions (e.g., discount factor, finite vs. continuous state spaces), and the formal definition of "simplifications" are not available from these sources. Claims about theorem content are based on paraphrases from [S20] and abstracts from [S1, S8, S28].

**Missing technical note.** The user's research plan assumes a technical note on adaptive verifiers exists and makes corrections to Skalse et al.'s results. The admitted sources do not contain this note. Any statements about such corrections would be speculative and are therefore omitted.

**Definition strength.** The paper itself acknowledges that its notion of unhackability is "fairly strong" and that weaker formalizations may be sufficient [S20]. The impossibility result may not hold under weaker definitions, but no such alternatives are formalized in the available sources.

**Finite policy set caveat.** The argument that finite-policy-set unhackability is practically unhelpful is qualitative, not formal [S20]. The paper does not provide a quantitative bound on how close a perturbed reward must be to the true reward to appear unhackable on a given finite set.

**Venue and peer review.** The paper appeared at NeurIPS 2022 [S8], but the admitted sources do not include reviewer discussions or author responses from OpenReview, so community critique at the review stage is not represented.

## Open Questions

1. What are the exact MDP assumptions in the full theorem statement—does the result require finite state/action spaces, a discount factor less than 1, or specific transition structure?
2. What are the necessary and sufficient conditions for "simplifications" as a special case of unhackability, and how do they relate to practical reward design?
3. Does a technical note on adaptive verifiers exist, and if so, what specific corrections does it make to Skalse et al.'s definitions or theorems?
4. How sensitive is the impossibility result to the choice of unhackability definition? Would a weaker notion (e.g., approximate unhackability, probabilistic unhackability) admit non-trivial proxy rewards?
5. Can the finite-policy-set caveat be made quantitative—e.g., a bound relating policy set size, reward perturbation magnitude, and the probability of apparent unhackability?

## Recommended Next Experiments

1. **Retrieve the full paper text** (arXiv 2209.13085, v2) to extract exact theorem statements, proof structures, MDP assumptions, and the formal definition of simplifications.
2. **Search for the adaptive verifier technical note** using queries such as "adaptive verifier reward hacking correction" or "Skalse unhackability adaptive" in arXiv, OpenReview, and alignment research forums. If found, admit it as a source and extract its specific corrections.
3. **Formalize weaker unhackability definitions** and test whether the impossibility result survives under approximate or probabilistic variants. This could be done analytically for small MDPs.
4. **Quantify the finite-policy-set caveat** by constructing explicit examples: given a finite policy set of size $n$ and a true reward $R_1$, characterize the set of proxy rewards $R_2$ that are unhackable on that set, and measure how close they can be to $R_1$.
5. **Check OpenReview** for the NeurIPS 2022 submission to identify reviewer critiques, author responses, and any acknowledged limitations not present in the final paper.

## Source Register

- [S1] [[2209.13085] Defining and Characterizing Reward Hacking](https://arxiv.org/abs/2209.13085) — admitted, score 19, discovered by `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv`
- [S2] [Defining and Characterizing Reward Hacking Joar Skalse∗ University of Oxford](https://arxiv.org/pdf/2209.13085) — rejected, score 14, discovered by `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv`
- [S3] [Detecting and Mitigating Reward Hacking in Reinforcement Learning Systems: A Comprehensive Empirical Study](https://arxiv.org/html/2507.05619v1) — rejected, score 11, discovered by `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv`
- [S4] [Defining and Characterizing Reward Hacking Joar Skalse∗ University of Oxford](https://openreview.net/pdf?id=yb3HOXO3lX2) — rejected, score 14, discovered by `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv`
- [S5] [[PDF] Defining and Characterizing Reward Hacking | Semantic Scholar](https://www.semanticscholar.org/paper/Defining-and-Characterizing-Reward-Hacking-Skalse-Howe/004357dd9bbf3012c8fe0ccada4da401bf85dfff) — rejected, score 12, discovered by `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv`
- [S6] [Defining and Characterizing Reward Hacking](https://www.summarizepaper.com/en/arxiv-id/2209.13085v1/) — rejected, score 6, discovered by `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv`
- [S7] [Reward hacking - Wikipedia](https://en.wikipedia.org/wiki/Reward_hacking) — admitted, score 13, discovered by `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv`
- [S8] [Defining and Characterizing Reward Gaming](https://proceedings.neurips.cc/paper_files/paper/2022/hash/3d719fee332caa23d5038b8a90e81796-Abstract-Conference.html) — admitted, score 18, discovered by `Skalse 2022 reward hacking unhackability definition theorem stochastic policies`
- [S9] [(PDF) Defining and Characterizing Reward Hacking](https://www.researchgate.net/publication/363888695_Defining_and_Characterizing_Reward_Hacking) — rejected, score 12, discovered by `Skalse 2022 reward hacking unhackability definition theorem stochastic policies`
- [S10] [Google Scholar](https://scholar.google.com/scholar?q=Defining+and+Characterizing+Reward+Gaming.) — rejected, score 5, discovered by `Skalse 2022 reward hacking unhackability definition theorem stochastic policies`
- [S11] [Defining and Characterizing Reward Hacking - NASA/ADS](https://ui.adsabs.harvard.edu/abs/2022arXiv220913085S/abstract) — rejected, score 12, discovered by `Skalse 2022 reward hacking unhackability definition theorem stochastic policies`
- [S12] [Defining and Characterizing Reward Hacking Joar Skalse∗ University of Oxford](https://proceedings.neurips.cc/paper_files/paper/2022/file/3d719fee332caa23d5038b8a90e81796-Paper-Conference.pdf) — rejected, score 13, discovered by `"Defining and Characterizing Reward Hacking" NeurIPS 2022 OR TMLR`
- [S13] [Defining and characterizing reward hacking | Proceedings of the 36th International Conference on Neural Information Processing Systems](https://dl.acm.org/doi/10.5555/3600270.3600957) — rejected, score 13, discovered by `"Defining and Characterizing Reward Hacking" NeurIPS 2022 OR TMLR`
- [S14] [Hack-Verifiable Environments: Towards Evaluating Reward Hacking at Scale](https://arxiv.org/html/2605.20744v1) — rejected, score 11, discovered by `reward hacking adaptive verifier technical note correction Skalse`
- [S15] [LLMs Gaming Verifiers: RLVR can Lead to Reward Hacking](https://arxiv.org/html/2604.15149) — rejected, score 15, discovered by `reward hacking adaptive verifier technical note correction Skalse`
- [S16] [Cheap Reward Hacking Detection](https://arxiv.org/html/2606.08893) — rejected, score 11, discovered by `reward hacking adaptive verifier technical note correction Skalse`
- [S17] [Benchmarking Reward Hack Detection in Code Environments via Contrastive Analysis](https://arxiv.org/html/2601.20103v1) — rejected, score 11, discovered by `reward hacking adaptive verifier technical note correction Skalse`
- [S18] [Causal Reward Adjustment: Mitigating Reward Hacking in External Reasoning via Backdoor Correction](https://arxiv.org/html/2508.04216) — rejected, score 11, discovered by `reward hacking adaptive verifier technical note correction Skalse`
- [S19] [Joar Skalse, Nikolaus H R Howe, Dmitrii Krasheninnikov, David Krueger · Defining and Characterizing Reward Hacking](https://slideslive.com/38989954/defining-and-characterizing-reward-hacking) — rejected, score 7, discovered by `Skalse reward hacking finite policy set limitations`
- [S20] [Defining and Characterising Reward Hacking](https://www.alignmentforum.org/posts/vnNdpaXehmefXSe2H/defining-and-characterising-reward-hacking) — admitted, score 18, discovered by `Skalse reward hacking finite policy set limitations`
- [S21] [Imperfect World Models are Exploitable](https://chatpaper.com/paper/281651) — rejected, score 11, discovered by `Skalse reward hacking finite policy set limitations`
- [S22] [Imperfect World Models are Exploitable](https://arxiv.org/html/2605.15960) — rejected, score 11, discovered by `Skalse reward hacking finite policy set limitations`
- [S23] [Correlated Proxies: A New Definition and Improved Mitigation for Reward Hacking](https://arxiv.org/html/2403.03185v3) — rejected, score 12, discovered by `"reward hacking" "unhackability" MDP assumptions theorem statement`
- [S24] [A Overview B Proofs](https://proceedings.neurips.cc/paper_files/paper/2022/file/3d719fee332caa23d5038b8a90e81796-Supplemental-Conference.pdf) — rejected, score 13, discovered by `"reward hacking" "unhackability" MDP assumptions theorem statement`
- [S25] [Adversarial Reward Auditing for Active Detection and ...](https://arxiv.org/pdf/2602.01750) — rejected, score 11, discovered by `Skalse reward hacking critique follow-up adaptive verifier`
- [S26] [Reward Hacking in the Era of Large Models: Mechanisms, Emergent Misalignment, Challenges](https://arxiv.org/html/2604.13602v1) — rejected, score 12, discovered by `Skalse reward hacking critique follow-up adaptive verifier`
- [S27] [LLMs Gaming Verifiers: RLVR can Lead to Reward Hacking](https://arxiv.org/pdf/2604.15149) — rejected, score 15, discovered by `Skalse reward hacking critique follow-up adaptive verifier`
- [S28] [[2209.13085] Defining and Characterizing Reward Hacking](https://export.arxiv.org/abs/2209.13085) — admitted, score 20, discovered by `arxiv 2209.13085 "Defining and Characterizing Reward Hacking" theorem statement full text`
- [S29] [Defining and Characterizing Reward Hacking | alphaXiv](https://www.alphaxiv.org/overview/2209.13085v2) — rejected, score 11, discovered by `arxiv 2209.13085 "Defining and Characterizing Reward Hacking" theorem statement full text`
- [S30] [Imperfect World Models are Exploitable Logan Mondal Bhamidipaty1∗](https://arxiv.org/pdf/2605.15960) — rejected, score 14, discovered by `Skalse reward hacking MDP assumptions discount factor finite state action space`
- [S31] [Markov decision process - Wikipedia](https://en.wikipedia.org/wiki/Markov_decision_process) — rejected, score 11, discovered by `Skalse reward hacking MDP assumptions discount factor finite state action space`
- [S32] [11 Markov Decision Processes – 6.390 - Intro to Machine Learning](https://introml.mit.edu/notes/mdp.html) — rejected, score 10, discovered by `Skalse reward hacking MDP assumptions discount factor finite state action space`
- [S33] [Modification-Considering Value Learning for Reward Hacking Mitigation in RL](https://arxiv.org/html/2606.28955v1) — rejected, score 14, discovered by `Skalse reward hacking MDP assumptions discount factor finite state action space`
- [S34] [Reward Hacking Trap](https://www.emergentmind.com/topics/reward-hacking-trap) — rejected, score 9, discovered by `"unhackable" "adaptive" verifier reward hacking proxy correction`
- [S35] [Adversarial Reward-Hacking](https://www.emergentmind.com/topics/adversarial-reward-hacking) — rejected, score 9, discovered by `"unhackable" "adaptive" verifier reward hacking proxy correction`
- [S36] [Daily Papers - Hugging Face](https://huggingface.co/papers?q=obfuscated+reward+hacking) — rejected, score 12, discovered by `"unhackable" "adaptive" verifier reward hacking proxy correction`

## Research Trace

### Goal

Verify the exact definitions, theorems, assumptions, and limitations of Skalse et al. 2022 'Defining and Characterizing Reward Hacking,' and identify corrections made by a technical note applying it to adaptive verifiers.

### Subquestions

- What are the exact formal definitions of 'reward hacking' and 'unhackability' as given in Skalse et al. 2022?
- What is the exact statement of the main theorem(s) concerning all stochastic policies, including all assumptions on the MDP and policy set?
- What are the stated limitations of the results, particularly regarding finite policy sets?
- What technical note or follow-up paper applies Skalse et al.'s results to adaptive verifiers, and what corrections does it make?
- What are the precise MDP assumptions (e.g., finite state/action spaces, discount factor, transition structure) required by the theorems?
- How does the paper distinguish between optimal policies under the true reward vs. the proxy reward, and what role does this play in the unhackability definition?

### Research Perspectives

- **Primary source verification** — Locate and extract exact definitions, theorem statements, and assumptions from the original Skalse et al. 2022 paper.
- **Technical note / correction analysis** — Find the technical note that applies Skalse et al. to adaptive verifiers and identify its specific corrections or critiques.
- **Limitations and scope analysis** — Identify the paper's own stated limitations, especially around finite policy sets, and any unstated assumptions.
- **Community reception and criticism** — Find discussions, critiques, or follow-up work that challenges or extends the paper's results.
- **Formal structure verification** — Verify the mathematical structure: MDP definition, policy class, reward function definitions, and theorem conditions.

### Source Requirements

- Skalse et al. 2022 paper on arXiv or published venue (NeurIPS, TMLR, etc.)
- Technical note or follow-up paper on adaptive verifiers and reward hacking
- Author's personal or institutional page for any errata or supplementary materials
- OpenReview or peer review discussions if available
- Blog posts or technical discussions by RL safety researchers referencing this paper
- GitHub repository if code or proofs are available

### Success Criteria

- Exact quoted definitions of 'reward hacking' and 'unhackability' from the paper.
- Exact quoted or closely paraphrased theorem statement(s) for all stochastic policies with all conditions listed.
- Explicit list of MDP assumptions and policy set assumptions used by each theorem.
- Clear statement of limitations regarding finite policy sets and any other caveats.
- Identification of the technical note on adaptive verifiers with its specific corrections listed.
- Cross-referencing between the paper and the technical note to show what was corrected and why.

### Search Queries

- `Skalse et al 2022 "Defining and Characterizing Reward Hacking" arXiv` — Find the primary paper on arXiv for exact definitions and theorems. [Primary source verification / paper]
- `Skalse 2022 reward hacking unhackability definition theorem stochastic policies` — Search for the specific theorem and definitions by key terms. [Formal structure verification / paper]
- `"Defining and Characterizing Reward Hacking" NeurIPS 2022 OR TMLR` — Find the published venue version which may have corrections or final wording. [Primary source verification / paper]
- `reward hacking adaptive verifier technical note correction Skalse` — Find the technical note that applies Skalse et al. to adaptive verifiers. [Technical note / correction analysis / paper]
- `Skalse reward hacking finite policy set limitations` — Find discussion of limitations specifically around finite policy sets. [Limitations and scope analysis / paper]
- `"reward hacking" "unhackability" MDP assumptions theorem statement` — Find exact theorem language and MDP assumptions. [Formal structure verification / paper]
- `Skalse reward hacking critique follow-up adaptive verifier` — Find follow-up work or critiques related to adaptive verifiers. [Community reception and criticism / paper]
- `site:openreview.net "Defining and Characterizing Reward Hacking"` — Find OpenReview discussions which may contain reviewer critiques and author responses. [Community reception and criticism / discussion]
- `Skalse reward hacking errata correction theorem` — Search for any errata or corrections to the original paper. [Technical note / correction analysis / paper]
- `"reward hacking" "adaptive verifier" correction note 2023 OR 2024 OR 2025` — Find the technical note by searching for adaptive verifier corrections in recent years. [Technical note / correction analysis / paper]
- `Skalse et al reward hacking GitHub code proofs` — Find any supplementary code or proof materials. [Primary source verification / repository]
- `reward hacking unhackability theorem stochastic policy MDP formal definition` — Broad search to find any blog or discussion that quotes the formal definitions. [Community reception and criticism / blog]

### Source Quality

- [S1] arXiv abstract provides the formal definition of reward hacking and unhackable proxy, key to the research goal. score=19 type=paper admitted=true warnings=Only abstract, not full theorem statements
- [S2] PDF text extraction failed, unreadable. score=14 type=paper admitted=false warnings=PDF text extraction failed
- [S3] Not the target paper; it is an empirical study on reward hacking, not the Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S4] Fetch error (HTTP 504), source unavailable. score=14 type=paper admitted=false warnings=HTTP 504 timeout; fetch failed: Source fetch API returned HTTP 504 Gateway Timeout: upstream request timeout
- [S5] Unreadable due to JavaScript requirement. score=12 type=paper admitted=false warnings=JavaScript required, not accessible
- [S6] Thin AI-generated summary, not authoritative or useful for exact theorem verification. score=6 type=other admitted=false warnings=AI-generated summary, not a primary source
- [S7] Wikipedia article provides a clear definition of unhackable from Skalse et al., useful for context. score=13 type=other admitted=true warnings=Secondary source; verify with original
- [S8] NeurIPS proceedings page contains the abstract and key statements about unhackability and theorem. score=18 type=paper admitted=true warnings=Only abstract, not full theorem statements
- [S9] Fetch error (403), source unavailable. score=12 type=paper admitted=false warnings=HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S10] Google Scholar search page, not a source of content. score=5 type=other admitted=false warnings=
- [S11] Unreadable due to JavaScript requirement. score=12 type=paper admitted=false warnings=JavaScript required, not accessible
- [S12] PDF text garbled, unreadable. score=13 type=paper admitted=false warnings=PDF text extraction failed
- [S13] Fetch error (403), source unavailable. score=13 type=paper admitted=false warnings=HTTP 403 Forbidden; fetch failed: Source fetch API returned HTTP 403 Forbidden:[HTML omitted]
- [S14] Not the target paper; it is about hack-verifiable environments, not Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S15] Tangentially related (LLMs gaming verifiers) but not the target technical note on correcting Skalse et al. for adaptive verifiers. score=15 type=paper admitted=false warnings=Not a correction note; separate study
- [S16] Not relevant to verifying Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S17] Not relevant to verifying Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S18] Not relevant to verifying Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S19] Brief summary from a talk, not a primary source. score=7 type=other admitted=false warnings=Slides, not detailed
- [S20] Author's detailed summary on AI Alignment Forum, includes definitions and theorem statements, directly useful. score=18 type=blog admitted=true warnings=Blog post, not peer-reviewed but by author
- [S21] Not relevant to Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S22] Not relevant to Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S23] References Skalse et al. but not the target paper; discusses correlated proxies. score=12 type=paper admitted=false warnings=
- [S24] PDF text garbled, unreadable. score=13 type=paper admitted=false warnings=PDF text extraction failed
- [S25] Not relevant to Skalse et al. definitions. score=11 type=paper admitted=false warnings=
- [S26] References Skalse et al. but not the target paper. score=12 type=paper admitted=false warnings=
- [S27] Same as S15, LLMs Gaming Verifiers, not the target technical note. score=15 type=paper admitted=false warnings=Not a correction note; separate study
- [S28] Primary source: arXiv abstract page with definitions and key results. Provides exact wording of definitions and theorem statements needed for verification. score=20 type=paper admitted=true warnings=
- [S29] Secondary summary on alphaXiv; not a primary source and does not provide exact theorem language needed for verification. score=11 type=paper admitted=false warnings=Secondary summary, not primary source.
- [S30] PDF content not readable; search snippet indicates it references Skalse et al. but full text unavailable. Cannot verify corrections for adaptive verifiers. score=14 type=paper admitted=false warnings=PDF content not readable; search snippet suggests it references Skalse et al. but full text unavailable.
- [S31] General Wikipedia page on MDPs, not specific to Skalse et al. 2022. score=11 type=paper admitted=false warnings=General reference, not specific to Skalse et al. 2022.
- [S32] MIT course notes on MDPs, not relevant to the research goal. score=10 type=paper admitted=false warnings=General educational material, not specific to Skalse et al. 2022.
- [S33] Paper on reward hacking mitigation; cites Skalse et al. but does not provide the exact definitions or theorem statements needed, nor does it appear to be the technical note on adaptive verifiers. score=14 type=paper admitted=false warnings=Not directly relevant to verifying definitions or the adaptive verifier note.
- [S34] Topic summary page on emergentmind.com; lacks authority and does not provide exact theorem language. score=9 type=paper admitted=false warnings=Low-authority summary page.
- [S35] Topic summary page on emergentmind.com; lacks authority and does not provide exact theorem language. score=9 type=paper admitted=false warnings=Low-authority summary page.
- [S36] Hugging Face daily papers page; not directly relevant to Skalse et al. 2022. score=12 type=paper admitted=false warnings=Not directly relevant to the research goal.

### Evidence Notes

- [S1] Reward hacking is defined as a phenomenon where optimizing an imperfect proxy reward function leads to poor performance according to the true reward function. Evidence: Abstract: 'a phenomenon where optimizing an imperfect proxy reward function leads to poor performance according to the true reward function.' Limitations: The definition assumes a single true reward function, which may not capture all human values.
- [S8] A proxy reward is called unhackable if increasing the expected proxy return can never decrease the expected true return. Evidence: Abstract: 'We say that a proxy is unhackable if increasing the expected proxy return can never decrease the expected true return.' Limitations: This is a strong notion; weaker definitions may allow more flexibility.
- [S20] Unhackability is formally defined as: there are no policies π1, π2 such that J1(π1) > J1(π2) but J2(π1) < J2(π2), where J1 and J2 are expected returns under true and proxy reward respectively. Evidence: Section 'Background Question and Problem Formalisation': 'We say that R1 and R2 are unhackable (with respect to each other) if there are no policies π1, π2 such that J1(π1) > J1(π2) but J2(π1) < J2(π2).' Limitations: Allows ties where J1(π1)=J1(π2) but J2(π1)<J2(π2); the condition is asymmetric.
- [S1] For the set of all stochastic policies, two reward functions can only be unhackable if one of them is constant. Evidence: Abstract: 'for the set of all stochastic policies, two reward functions can only be unhackable if one of them is constant.' Limitations: Assumes the set of all stochastic policies; result may not hold for restricted policy sets.
- [S20] The main theorem states that R1 and R2 can only be unhackable if either they induce the same ordering of policies (equivalent) or at least one is indifferent between all policies (trivial). Evidence: Section 'Results': 'the main result of the paper is that R1 and R2 only can be unhackable if either R1 and R2 induce exactly the same ordering of policies (in which case they are equivalent), or if at least one of R1 and R2 is indifferent between all policies (in which case it is trivial).' Limitations: The result depends on geometric properties of MDPs and reward functions, not arbitrary functions.
- [S1] The linearity of reward in state-action visit counts makes unhackability a very strong condition. Evidence: Abstract: 'A key insight is that the linearity of reward (in state-action visit counts) makes unhackability a very strong condition.' Limitations: The linearity assumption is standard for MDPs but may not hold for all reward formulations.
- [S20] The same impossibility result holds for the set of all stationary policies, though the proof is more complicated than for non-stationary policies. Evidence: Section 'Results': 'The same argument cannot be applied to the set of stationary policies, because πλ is typically not stationary ... However, with a slightly more complicated argument, it is possible to show that the same result applies to the set of all stationary policies as well.' Limitations: The proof for stationary policies is not provided in the source but referenced to the main paper.
- [S20] For finite sets of policies (e.g., deterministic policies), non-trivial unhackable pairs always exist, but this is unlikely to be helpful in practice because one can perturb a reward function to appear unhackable on a finite set. Evidence: Section 'Results': 'if we use a finite set of policies (such as the set of all deterministic policies, for example) then there can be reward functions that are unhackable, non-equivalent, and non-trivial. However, the reason for this is essentially that we can introduce a small perturbation of any given reward function R1 to produce another reward function R2 that is almost the same as R1 on a given finite set of policies, and so this result is unlikely to be very helpful in practice.' Limitations: The existence result is not constructive and does not guarantee robustness under distribution shift.
- [S1] The paper was revised on 5 Mar 2025 (v2) to fix a typo in Figure 1 and update the link to code in the Appendix. Evidence: arXiv page: 'modified (fix typo in Figure 1, update link to code in Appendix, remove unrendered characters from arXiv abstract)' Limitations: No other corrections are mentioned; the theorem statements remain unchanged.
- [S7] Wikipedia summarizes the key finding: across all stochastic policy distributions, two reward functions are unhackable if and only if one of them is constant. Evidence: Wikipedia snippet: 'A key finding states that, across all stochastic policy distributions (mappings from states to probability distributions over actions), two reward functions are unhackable if and only if one of them is constant.' Limitations: Wikipedia may not capture all nuances of the original paper.
- [S20] The paper's result depends on geometric properties of MDPs and reward functions, and does not hold for arbitrary real-valued functions on arbitrary sets. Evidence: Section 'Results': 'Note that this result depends on certain geometric properties that specifically hold for MDPs and reward functions, since an analogous result doesn’t hold for arbitrary real-valued functions on arbitrary sets.' Limitations: The specific geometric properties are not detailed in the source.
- [S8] The paper also considers deterministic policies and finite sets of stochastic policies, where non-trivial unhackable pairs always exist. Evidence: Abstract: 'We thus turn our attention to deterministic policies and finite sets of stochastic policies, where non-trivial unhackable pairs always exist.' Limitations: The existence is not guaranteed to be practically useful, as noted in S20.
- [S20] The paper suggests that weaker formalizations of unhackability may be worth studying. Evidence: Conclusion: 'however, also note that this paper relies on a fairly strong notion of “unhackability” — it may be interesting to also consider weaker formalisations, that may still be sufficient.' Limitations: No specific weaker formalizations are proposed.
- [S1] No technical note applying the results to adaptive verifiers is present in the admitted sources. Evidence: The admitted sources S1, S7, S8, S20 do not contain any mention of adaptive verifiers or a correction note. Limitations: This note is a limitation of the current source set; the user may need to supply additional sources.
- [S28] The paper provides the first formal definition of reward hacking. Evidence: Abstract: 'We provide the first formal definition of reward hacking, a phenomenon where optimizing an imperfect proxy reward function leads to poor performance according to the true reward function.' Limitations: Only the abstract is available; the full definition may include additional formal details not present here.
- [S28] A proxy reward function is unhackable if increasing the expected proxy return can never decrease the expected true return. Evidence: Abstract: 'We say that a proxy is unhackable if increasing the expected proxy return can never decrease the expected true return.' Limitations: The abstract does not specify the formal notation (e.g., expectations over which distribution, MDP dynamics).
- [S28] For the set of all stochastic policies, two reward functions can only be unhackable if one of them is constant. Evidence: Abstract: 'In particular, for the set of all stochastic policies, two reward functions can only be unhackable if one of them is constant.' Limitations: The abstract does not state the exact theorem number or full assumptions (e.g., MDP structure, discount factor).
- [S28] The paper also considers deterministic policies and finite sets of stochastic policies, where non-trivial unhackable pairs always exist. Evidence: Abstract: 'We thus turn our attention to deterministic policies and finite sets of stochastic policies, where non-trivial unhackable pairs always exist, and establish necessary and sufficient conditions for the existence of simplifications, an important special case of unhackability.' Limitations: The abstract does not detail the necessary and sufficient conditions or the definition of 'simplifications'.
- [S28] A key insight is that the linearity of reward (in state-action visit counts) makes unhackability a very strong condition. Evidence: Abstract: 'A key insight is that the linearity of reward (in state-action visit counts) makes unhackability a very strong condition.' Limitations: The abstract does not elaborate on the linearity argument or the formal connection to visit counts.
- [S28] The paper has been revised: v2 (5 Mar 2025) fixes a typo in Figure 1, updates link to code in Appendix, and removes unrendered characters from the arXiv abstract. Evidence: Comments section: '23 pages; modified (fix typo in Figure 1, update link to code in Appendix, remove unrendered characters from arXiv abstract)' Limitations: No information about whether the technical content changed beyond these fixes.
- [S28] The paper is 23 pages long and was submitted to arXiv on 27 Sep 2022, with the latest version on 5 Mar 2025. Evidence: Submission history: '[v1] Tue, 27 Sep 2022 00:32:44 UTC (1,507 KB) [v2] Wed, 5 Mar 2025 21:08:30 UTC (459 KB)' and Comments: '23 pages' Limitations: No information about venue acceptance (e.g., NeurIPS, TMLR) is given in the abstract page.
- [S28] The paper is categorized under Machine Learning (cs.LG) and Statistics Machine Learning (stat.ML). Evidence: Subjects: 'Machine Learning (cs.LG); Machine Learning (stat.ML)' Limitations: No further details on the specific MDP assumptions or policy set definitions are available from this source.

### Claim Verification

- **supported**: Skalse et al. 2022 provide the first formal definition of reward hacking and a central notion of 'unhackability' for proxy reward functions in Markov Decision Processes (MDPs) — Both S1 and S28 explicitly state that the paper provides the first formal definition of reward hacking and defines unhackability. The evidence supports the claim, and the cited sources directly contain this information.
- **supported**: Their main result is an impossibility theorem: for the set of all stochastic policies, two reward functions can be unhackable only if one is constant or they induce identical policy orderings — S1 and S28 state that for all stochastic policies, two reward functions can only be unhackable if one is constant. S20 provides the full theorem: they must induce the same ordering or one is trivial. The claim is supported and citations match.
- **supported**: The result extends to both stationary and non-stationary stochastic policies — S20 explicitly states that the same result applies to the set of all stationary policies, with a more complicated argument, and the non-stationary case is covered by the main proof. The claim is supported and the citation is correct.
- **supported**: For finite policy sets, non-trivial unhackable pairs exist but are argued to be practically unhelpful — S8 and S28 state that for deterministic policies and finite sets of stochastic policies, non-trivial unhackable pairs always exist. S20 explains that this is practically unhelpful because one can perturb a reward to appear unhackable on a finite set. All citations support the claim.
- **supported**: The formal definition of unhackability is: 'We say that R1 and R2 are unhackable (with respect to each other) if there are no policies π1, π2 such that J1(π1) > J1(π2) but J2(π1) < J2(π2).' — S20 contains the exact quoted definition. The claim is supported and the citation is correct.
- **supported**: This definition is asymmetric: it permits ties where J1(π1) = J1(π2) but J2(π1) < J2(π2) — S20 notes that the condition allows ties where J1(π1)=J1(π2) but J2(π1)<J2(π2), confirming asymmetry. The claim is supported and the citation is correct.
- **supported**: The paper notes that this is a 'fairly strong notion of unhackability' and that weaker formalizations may be worth studying — S20's conclusion states: 'this paper relies on a fairly strong notion of “unhackability” — it may be interesting to also consider weaker formalisations'. The claim is supported and the citation is correct.
- **supported**: The paper's central result: 'R1 and R2 only can be unhackable if either R1 and R2 induce exactly the same ordering of policies (in which case they are equivalent), or if at least one of R1 and R2 is indifferent between all policies (in which case it is trivial).' — S20 contains this exact statement as the main result. The claim is supported and the citation is correct.
- **supported**: The abstract states: 'for the set of all stochastic policies, two reward functions can only be unhackable if one of them is constant' — Both S1 and S28 contain this exact sentence in their abstracts. The claim is supported and citations are correct.
- **supported**: Here 'constant' means 'indifferent between all policies'—i.e., the reward function assigns the same expected return to every policy — S20 clarifies that 'constant' means 'indifferent between all policies'. The claim is supported and the citation is correct.
- **supported**: For non-stationary policies, the proof uses a mixing argument between policies — S20 describes the proof for non-stationary policies using a mixing argument (πλ). The claim is supported and the citation is correct.
- **supported**: The same argument cannot be applied to the set of stationary policies, because πλ is typically not stationary, but with a slightly more complicated argument, it is possible to show that the same result applies to the set of all stationary policies as well — S20 explicitly states this: 'The same argument cannot be applied to the set of stationary policies, because πλ is typically not stationary ... However, with a slightly more complicated argument, it is possible to show that the same result applies to the set of all stationary policies as well.' The claim is supported and the citation is correct.
- **supported**: The key insight driving the impossibility result is the linearity of reward in state-action visitation frequencies — S1 and S28 both state: 'A key insight is that the linearity of reward (in state-action visit counts) makes unhackability a very strong condition.' The claim is supported and citations are correct.
- **supported**: Because expected return is a linear function of the state-action occupancy measure, the set of achievable return pairs (J1(π), J2(π)) forms a convex set — S20 explains that expected return is linear in state-action occupancy, leading to a convex set of achievable return pairs. The claim is supported and the citation is correct.
- **supported**: Unhackability requires that no point in this set dominates another in one coordinate while being dominated in the other—effectively requiring the Pareto frontier to be a single line or point, which happens only when one reward is constant or both rewards induce the same ordering — S20 describes this geometric reasoning: unhackability means no point dominates another, leading to a Pareto frontier that is a line or point, which only occurs under the stated conditions. The claim is supported and the citation is correct.
- **supported**: The paper explicitly notes that this result depends on geometric properties specific to MDPs and reward functions, and that 'an analogous result doesn't hold for arbitrary real-valued functions on arbitrary sets' — S20 contains the exact quote: 'Note that this result depends on certain geometric properties that specifically hold for MDPs and reward functions, since an analogous result doesn’t hold for arbitrary real-valued functions on arbitrary sets.' The claim is supported and the citation is correct.
- **supported**: For finite policy sets—including the set of all deterministic policies—non-trivial unhackable pairs exist — S8 and S28 both state that for deterministic policies and finite sets of stochastic policies, non-trivial unhackable pairs always exist. The claim is supported and citations are correct.
- **supported**: The paper argues this is practically unhelpful: 'We can introduce a small perturbation of any given reward function R1 to produce another reward function R2 that is almost the same as R1 on a given finite set of policies, and so this result is unlikely to be very helpful in practice.' — S20 contains this exact quote. The claim is supported and the citation is correct.
- **supported**: The paper also establishes necessary and sufficient conditions for the existence of 'simplifications,' an important special case of unhackability, in the finite policy setting — S28 states: 'establish necessary and sufficient conditions for the existence of simplifications, an important special case of unhackability.' The claim is supported and the citation is correct.
- **supported**: The paper was originally submitted to arXiv on 27 September 2022 and revised to version 2 on 5 March 2025 — S28 shows submission history: '[v1] Tue, 27 Sep 2022' and '[v2] Wed, 5 Mar 2025'. The claim is supported and the citation is correct.
- **supported**: The revision fixes a typo in Figure 1, updates a code link in the Appendix, and removes unrendered characters from the arXiv abstract — S1 and S28 both state: 'modified (fix typo in Figure 1, update link to code in Appendix, remove unrendered characters from arXiv abstract)'. The claim is supported and citations are correct.
- **supported**: No changes to theorem statements or proofs are mentioned — The revision notes in S1 and S28 only mention the typo, code link, and abstract characters; no changes to theorems or proofs are listed. The claim is supported and citations are correct.
- **supported**: The impossibility result has a direct implication for reward learning and AI alignment: if a learned proxy reward must be unhackable against all stochastic policies, it must either be trivial (constant) or perfectly match the true reward's policy ordering — S1, S20, and S28 all state the impossibility result, which directly implies that any unhackable proxy must be constant or equivalent. The claim is a logical implication of the theorem, and the citations support the theorem. The claim is supported and citations are correct.
- **supported**: The paper appeared at NeurIPS 2022 — S8 is the NeurIPS proceedings page for the paper, confirming it appeared at NeurIPS 2022. The claim is supported and the citation is correct.

### Final Evaluation

- coverage: 4/5
- citation_quality: 3/5
- factuality: 4/5
- analysis_depth: 4/5
- presentation: 4/5
- overall: 4/5

Strengths:
- Clearly defines reward hacking and unhackability with exact quotes from the Alignment Forum exposition.
- Provides a thorough evidence table linking claims to sources and noting limitations.
- Honestly acknowledges the absence of the technical note on adaptive verifiers and the full paper text.
- Identifies key mathematical mechanism (linearity of reward in state-action visit counts) and its implications.
- Discusses limitations of the finite policy set result and the strong definition of unhackability.

Weaknesses:
- Relies heavily on a secondary source (Alignment Forum blog) for exact theorem language rather than the primary paper.
- Citation density is moderate; could benefit from more direct quotes from the primary paper if available.
- No evidence table comparing different sources or auditing citation-source associations beyond the claim verification table.

Follow-up recommendations:
- Retrieve the full paper text (arXiv 2209.13085 v2) to extract exact theorem statements, proof structures, and MDP assumptions.
- Search for the adaptive verifier technical note using queries like 'adaptive verifier reward hacking correction' or 'Skalse unhackability adaptive' in arXiv, OpenReview, and alignment forums.
- Formalize weaker unhackability definitions and test whether the impossibility result survives under approximate or probabilistic variants.
- Quantify the finite-policy-set caveat by constructing explicit examples and measuring how close a perturbed reward can be to the true reward while appearing unhackable on a given finite set.
