# Research archive: Designing learning loops in agent harnesses

Date: 2026-08-05
Primary seed: https://lilianweng.github.io/posts/2026-07-04-harness/
Promoted insight: `brain/insights/agent-harnesses/designing-learning-loops-in-harnesses.md`

## Research method

1. Full read of Weng (Jul 4 2026) Lil’Log post on harness engineering for self-improvement.
2. Parallel subagent research on harness definitions, learning-loop mechanisms, and related systems.
3. Primary-source validation against arXiv abstracts / papers and first-party blogs for every
   quantitative claim promoted into the insight.
4. Cross-check against existing vault notes on agent feedback loops and instruction config.

## Claim validation register

| Claim | Source | Status | Notes |
| --- | --- | --- | --- |
| DGM SWE 20%→50%, Polyglot 14.2%→30.7%, Claude 3.5 Sonnet | arXiv:2505.22954, sakana.ai/dgm | Verified | SWE-bench Verified staged-subset endpoint (not full Verified-500); Polyglot 14.2→30.7 is full re-eval; subset path was 14.0→38.0 |
| Self-Harness MiniMax/Qwen/GLM held-out lifts | arXiv:2606.09498 | Verified | 40.5→61.9 / 23.8→38.1 / 42.9→57.1; held-in 43.0→50.0 / 15.1→36.0 / 47.7→57.0; TB-2.0 64/89 tasks |
| ACE Generator/Reflector/Curator; +10.6% / +8.6% | arXiv:2510.04618 | Verified | Incremental bullets + grow-and-refine de-dupe; needs reliable feedback |
| AHE 69.7→77.0; Codex Hard exception; transfer | arXiv:2604.25850 | Verified | Hard: Codex 56.7% > AHE 53.3%; cross-family +5.1–10.1 pp; fix-prec 33.7% / reg-prec 11.8%; SWE transfer highest aggregate, ~12% fewer tokens vs seed |
| STOP improves with GPT-4, degrades weaker | arXiv:2310.02304 | Verified | Correct arXiv id (not in Weng’s numbered list style) |
| Harness-updating flat; harness-benefit non-monotonic | arXiv:2605.30621 | Verified | Weng figure caption has Qwen2 typo; paper uses Qwen3/3.5 |
| Meta-Harness FS history + Pareto frontier | arXiv:2603.28052 | Verified | Init from Terminus-KIRA / Terminus-2 |
| MCE bi-level skill/context | arXiv:2601.21557 | Verified | Tools match coding-env set |
| ADAS Meta Agent Search | arXiv:2408.08435 | Verified | ICLR 2025 |
| AFlow MCTS workflows | arXiv:2410.10762 | Verified | Beats manual + ADAS on reported tasks |
| AlphaEvolve EVOLVE-BLOCK markers | arXiv:2506.13131 | Verified | |
| Promptbreeder mutation prompts evolve | arXiv:2309.16797 | Verified | Prompt-space only |
| Anthropic harness = loop/tools/context/guardrails | claude.com blog Apr 2026 | Verified | Industry framing; not cited by Weng |
| OpenAI harness engineering ~1M LOC / 0 human LOC claim | openai.com Feb 2026 | First-party | Practice narrative; not independently audited |
| HF scaffold vs harness split | huggingface.co/blog/agent-glossary | Verified | Stricter than Weng’s broad harness |
| Near-term RSI via harness not weights | Weng thesis | Prediction | Strong evidence of harness-level gains; not open-ended RSI proof |

## Terminology conflicts to keep explicit

- **Weng / Anthropic / product:** harness = everything non-model.
- **HF glossary:** scaffolding (what model reads) vs harness (execution loop).
- **Phil Schmid “outer loop”:** across-session memory/skills.
- **Meta-Harness “outer loop”:** search over harness code.
- Never collapse these without labeling.

## Design thesis promoted

A learning loop is a permissioned state machine: declare what may change, freeze the
scorekeeper, accept only non-regressive held-out gains, and write every reject to the
filesystem so the next proposer cannot pretend the failure never happened.

## Nested loop taxonomy used in insight

1. Inner — within-task generate/act/observe/verify
2. Outer — across-task memory/skills/playbooks
3. Meta — harness/workflow self-modification
4. Joint — harness + weights

## Gaps / open questions left in the insight

- Fuzzy evaluators for research taste / maintainability
- Safe evolution of parent-selection / archive policy itself
- Held-out size vs sample efficiency
- Joint-loop attribution under matched compute
- Negative-result schema for reusable failure memory
- Whether AGENTS.md edits should use CI suites as accept gates

## Related vault notes

- `tests-are-the-agent-feedback-loop` — inner-loop evaluator
- `agent-instructions-are-config` — outer-loop hot state
- `context-files-are-config-with-debt` — unmeasured instruction growth
- `context-should-be-layered` — progressive disclosure
- `simplicity-beats-agent-theater` — don’t meta-optimize noise
- `long-term-learning` — human learning science (analogy only; different domain)

## Primary URLs fetched

- https://lilianweng.github.io/posts/2026-07-04-harness/
- https://arxiv.org/abs/2505.22954
- https://arxiv.org/abs/2606.09498
- https://arxiv.org/abs/2510.04618
- https://arxiv.org/abs/2604.25850
- https://arxiv.org/abs/2310.02304
- https://arxiv.org/abs/2605.30621
- https://arxiv.org/abs/2603.28052
- https://arxiv.org/abs/2601.21557
- https://arxiv.org/abs/2408.08435
- https://arxiv.org/abs/2410.10762
- https://arxiv.org/abs/2506.13131
- https://sakana.ai/dgm/
- https://claude.com/blog/harnessing-claudes-intelligence
- https://openai.com/index/harness-engineering/
- https://huggingface.co/blog/agent-glossary
- https://www.philschmid.de/inner-loop-vs-outer-loop
