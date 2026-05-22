# INSIGHT 24: Context Files Are Config With Debt

## Working conclusion

`AGENTS.md`, `CLAUDE.md`, Copilot instructions, and skills are not documentation in the normal
sense. They are runtime configuration for a probabilistic worker. That makes them powerful, but it
also gives them debt: stale commands, duplicated rules, over-broad guidance, old model
workarounds, and hidden priority conflicts.

The right pattern is not "write more instructions." The right pattern is "keep always-loaded context
small, scoped, executable, and maintained like config."

## Hard data

| Source | Data point | What it suggests |
|---|---:|---|
| AGENTS.md impact | Median runtime 98.57s -> 70.34s (-28.64%) | Root instructions can reduce wasted motion. |
| AGENTS.md impact | Mean output tokens 5,744.81 -> 4,591.46 (-20.08%) | Good context can reduce generation cost. |
| Evaluating AGENTS.md | LLM context: -0.5 pp SWE-bench Lite, -2 pp AGENT BENCH; cost +20%/+23% | Extra context can hurt success and cost. |
| Evaluating AGENTS.md | Developer context improves performance about 4% on average but adds 3.34 steps | Human-written context helps more, still with carrying cost. |
| Agent READMEs | 2,303 files from 1,925 repos | Context files are now a real ecosystem artifact. |
| Agent READMEs | Median words: CLAUDE.md 485, AGENTS.md 335.5, Copilot 535 | These files are already long enough to matter. |
| Agent READMEs | Testing 75.0%, implementation 69.9%, architecture 67.7%, build/run 62.3% | Real teams mostly encode operational workflow. |
| Agent READMEs | Security 14.5%, performance 14.5%, UI/UX 8.7% | Non-functional requirements are underrepresented. |
| SWE-Skills-Bench | Aggregate pass-rate +1.2 pp; tokens +10.5%; 39/49 skills no pass-rate gain | On-demand skills are high-variance context. |
| OctoBench | Claude Opus 4.5 CSR 85.64% vs ISR 28.11% | Agents often satisfy individual checks but fail full constraint conjunction. |

Plot-ready data: `research/data/context_instruction_cost.csv`.

## Notes

The papers disagree in a productive way. One AGENTS.md paper finds efficiency gains. Another finds
cost increases and slight success drops for generated context files. Agent READMEs shows that the
ecosystem has already adopted these files, but also that they are long, difficult to read, and skewed
toward functional operations. SWE-Skills-Bench shows most skills do not move pass rate. OctoBench
shows per-check compliance does not imply successful multi-source instruction following.

The synthesis is clear: these files are configuration, not lore. Config is useful when specific and
current. Config is dangerous when stale, duplicated, or ambiguous.

The "second brain" version of this should be explicit. The blog post should be polished and short.
The insight files can be long and source-heavy. The repo-level `AGENTS.md` should be shorter than
both. It should point to the deeper documents and encode only the constraints that must be loaded
on every task.

Short source phrases worth quoting: Agent READMEs says context files define "architecture,
constraints, and conventions." Evaluating AGENTS.md says agents tend to "respect their
instructions." The problem is not whether agents read the file; the problem is what the file makes
them do.

## Relevance to code patterns

- Root instructions should name commands, boundaries, generated-code policy, and risky operations.
- Path-specific instructions should exist only when local conventions differ.
- Put long workflows in scripts, skills, or linked docs instead of always-loaded root context.
- Lint context files for stale paths and stale commands.
- Sort rules by importance, not by historical append order.
- Remove old "model workaround" rules when they are no longer true.

## Caveats

The AGENTS.md efficiency paper did not evaluate semantic correctness deeply; it measured runtime
and tokens plus a manual sanity check. The Evaluating AGENTS.md paper has stronger task-success
evidence, but includes generated context files that may be worse than carefully maintained human
files. The honest claim is mixed: context files are leverage and liability.

## References

R17, R18, R19, R21, R73, R74, D34-D53.

