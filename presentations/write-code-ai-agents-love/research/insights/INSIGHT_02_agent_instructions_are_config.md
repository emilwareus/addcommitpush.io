# INSIGHT 02: Agent Instructions Are Configuration, Not Documentation

`AGENTS.md`, `CLAUDE.md`, Copilot instructions, and Cursor rules should be treated as operational
configuration artifacts -- short, specific, versioned, and tested by observing agent behavior. They
are not READMEs. They are control planes. The evidence shows measurable efficiency gains from
well-scoped instructions, measurable costs from noisy or over-broad ones, and a strong empirical
signal about what developers actually encode in these files.

## Source map

| Ref | Source | Local text | Role |
|---|---|---|---|
| R17 | On the Impact of AGENTS.md (ICSE JAWs 2026) | `paper-text/agents-md-impact-2601.20404.txt` | Paired study: AGENTS.md reduced median runtime 28.6% and output tokens 16.6%. |
| R18 | Evaluating AGENTS.md (ETH Zurich 2026-02) | `paper-text/evaluating-agents-md-2602.11988.txt` | Counter-evidence: context files can reduce success and increase cost by 20%+ when over-broad. |
| R19 | Decoding Configuration of AI Coding Agents (2025-11) | `paper-text/claude-code-configs-2511.09268.txt` | Empirical study of 328 Claude Code config files; reveals what developers encode. |
| R73 | OctoBench (2026-01) | `paper-text/octobench-2601.10343.txt` | Measures scaffold-aware instruction following; shows gap between task-solving and compliance. |
| R74 | Agent READMEs (2025-11) | `paper-text/agent-readmes-context-files-2025.txt` | Empirical study of 2,303 agent context files across Claude Code, Codex, and Copilot repos. |
| D05 | Anthropic: Claude Code best practices | `articles/anthropic-claude-code-best-practices.html` | Official-doc evidence: CLAUDE.md and verification workflows matter. |
| D06 | GitHub Copilot coding agent best practices | `articles/github-copilot-coding-agent-best-practices.html` | Official-doc evidence: repository-wide and path-specific instructions. |
| D07 | Cursor rules for AI | `articles/cursor-rules-for-ai.html` | Official-doc evidence: rule files injected into model context, scope-able. |
| D35 | Builder.io: Improve your AI code output with AGENTS.md | `articles/builder-agents-md.html` | Practitioner signal: small project instructions reduce repeated repo rediscovery. |

## Lulla et al. (R17): AGENTS.md reduces runtime and token cost

### Study design

- 10 repositories, 124 pull requests
- Agent: OpenAI Codex (gpt-5.2-codex)
- Paired within-task design: same task run with and without AGENTS.md
- Inclusion criteria: root-only AGENTS.md, qualifying content categories (conventions, architecture, project description)
- PR constraints: <=100 LoC additions+deletions, <=5 modified files, code-only changes

### Efficiency results

| Metric | Without AGENTS.md | With AGENTS.md | Diff | Diff % |
|---|---:|---:|---:|---:|
| Wall-clock time mean (s) | 162.94 | 129.91 | -33.03 | -20.27% |
| Wall-clock time median (s) | 98.57 | 70.34 | -28.23 | -28.64% |
| Output tokens mean | 5,744.81 | 4,591.46 | -1,153.35 | -20.08% |
| Output tokens median | 2,925.00 | 2,440.00 | -485.00 | -16.58% |
| Input tokens mean | 353,010 | 318,652 | -34,358 | -9.73% |
| Total tokens mean | 687,632 | 619,322 | -68,310 | -9.93% |

Source trace: R17, `paper-text/agents-md-impact-2601.20404.txt`, Table 1.

Statistical significance: Wall-clock time and output tokens show statistically significant differences
(Wilcoxon signed-rank test, p < 0.05). Input tokens and total tokens are not statistically significant.

Key interpretation: "AGENTS.md primarily reduces token usage in a small number of very high-cost
runs, rather than uniformly lowering token consumption across all task instances." The median
reduction in time (28.64%) is larger than the mean reduction (20.27%), suggesting AGENTS.md
prevents long exploration tails.

### Limitations noted in paper

- No correctness evaluation (only sanity-checked 50 random outputs)
- Single agent (Codex only)
- Small PR scope (<=100 LoC)
- Does not isolate which content in AGENTS.md drives the gain

### Corpus and task shape (real OSS, not synthetic)

- **Data source:** Real open-source GitHub repositories from Mohsenimofidi et al.'s prior
  corpus of repos with agent instruction files (R15 in `references.md`), not toy/synthetic
  codebases.
- **Sampling:** Root-only `AGENTS.md`; LLM + manual filter for conventions, architecture, and
  project description (§3.1.2, arXiv PDF **~p. 3**).
- **Tasks:** **124** paired runs from **10** repos: replay **merged PRs** at the pre-merge commit;
  agent asked to recreate the PR from an LLM-generated GitHub-issue-style description when the
  PR body is thin (§3.1.3–3.1.5, **~pp. 3–4**).
- **PR filters:** ≤100 LoC changed, ≤5 files, code-only, merged, PR **after** `AGENTS.md` existed
  (§3.1.3, **~p. 3**).
- **What is measured:** Wall-clock time and token counts only. "Comparable task completion" in
  the abstract means a **50-PR manual sanity check** (non-empty, non-trivial diffs), **not**
  test-pass resolution (§3.1.8, **~p. 4**; §5 roadmap, **~p. 5**).

Source trace: R17, `paper-text/agents-md-impact-2601.20404.txt`, §3–5; JAWs PDF is **5 pages**
([arXiv:2601.20404](https://arxiv.org/abs/2601.20404)).

## Gloaguen et al. (R18): context files can hurt when over-broad

### Study design

- **Two benchmarks, both real OSS:**
  - **SWE-bench Lite:** 300 instances, 11 **popular** Python repos, **no** developer context files
    at benchmark creation (§4.1 Datasets, arXiv PDF **~p. 5**).
  - **AGENT BENCH (new):** **138** instances from **12 niche** repos that already ship
    developer-written root context files; built because popular SWE-bench repos lack real
    `AGENTS.md`/`CLAUDE.md` and may be partially memorized (§1, §3, **~pp. 1–5**).
- **Three conditions** (Figure 1, §4.1 Settings, **~pp. 2 & 5–6**):
  - **NONE:** no context file (on AGENT BENCH, developer file removed).
  - **LLM:** context file auto-generated with each agent's recommended init flow on pre-patch
    repo state **R**.
  - **HUMAN:** developer's pre-patch file (**AGENT BENCH only**).
- **Agents:** Claude Code (Sonnet 4.5), Codex (GPT-5.2, GPT-5.1 mini), Qwen Code (Qwen3-30B);
  one sample per instance (§4.1, **~p. 5**).
- **Success metric:** Patch must make **all** instance tests pass (`exec_R◦X̂(T) = PASS`), i.e.
  SWE-bench-style **resolution rate**, not runtime (§3.1, §4.1 Metrics, **~pp. 3 & 6**).
- **AGENT BENCH construction:** GitHub search → Python + tests + ≥400 PRs → filtered PRs →
  standardized issue text → **LLM-generated unit tests** where PRs lack tests → manual
  de-overfitting (§3.2, **~pp. 3–5**; Table 1 **~p. 4**).

### Key results

| Condition comparison | Resolution / success | Steps & cost |
|---|---|---|
| LLM-generated vs none (SWE-bench Lite) | **−0.5 pp** avg resolution | **+2.45** steps, **+20%** cost (Table 2, **~p. 6**) |
| LLM-generated vs none (AGENT BENCH) | **−2.0 pp** avg resolution | **+3.92** steps, **+23%** cost (Table 2, **~p. 6**) |
| Developer-provided vs none (AGENT BENCH) | **+4%** avg resolution | **+3.34** steps, up to **+19%** cost (§4.2, **~pp. 6–7**) |
| LLM-generated: cells with drop | **5 / 8** model×benchmark settings (Figure 3, **~p. 6**) | steps up in **every** setting |

Source trace: R18, `paper-text/evaluating-agents-md-2602.11988.txt`, §4.2, Table 2, Figure 3
([arXiv:2602.11988](https://arxiv.org/abs/2602.11988)).

### Behavioral changes from context files

- Context files lead to increased exploration, testing, and reasoning by agents
- Agents tend to respect instructions (compliance is high)
- The problem is that unnecessary requirements from context files make tasks harder

### AGENT BENCH statistics

| Property | Mean | Min | Max |
|---|---:|---:|---:|
| PR patch lines edited | 118.9 | 12 | 1,973 |
| PR patch files edited | 2.5 | 1 | 23 |
| Context file words | 641.0 | 24 | 2,003 |
| Context file sections | 9.7 | 1 | 29 |
| Test coverage | 75% | 2.5% | 100% |

The paper's recommendation: "omit LLM-generated context files for the time being" and "include
only minimal requirements (e.g., specific tooling to use with this repository)."

### Docs-stripped ablation (when context replaces missing READMEs)

When all other documentation (`.md`, `docs/`, examples) is removed after generating the context
file, **LLM-generated** files **+2.7%** average resolution on AGENT BENCH and beat developer files
(Figure 5, §4.2, **~p. 7**). Inference: broad always-loaded context hurts most when it **duplicates**
existing docs; on under-documented niche repos, a context file can act as the only manual.

## Reconciling R17 vs R18 (complementary, not contradictory)

Both papers use **real GitHub OSS**. Neither uses purely synthetic codebases. They still answer
different questions under different experimental contracts.

| Dimension | R17 (Lulla et al.) | R18 (Gloaguen et al.) |
|---|---|---|
| Primary outcome | Runtime, tokens | **Test-pass resolution rate** |
| Context file | **Existing human** root `AGENTS.md` only | **None / LLM-generated / human** (human only on AGENT BENCH) |
| Task | Replay **small merged PRs** (≤100 LoC) | **Issue-resolution** benchmarks (SWE-bench Lite + AGENT BENCH) |
| Agents | **Codex only** (`gpt-5.2-codex`) | Claude Code, Codex (2 models), Qwen Code |
| Design | Paired: same snapshot ± file | Benchmark instances; LLM file via agent `/init`-style generation |
| "Success" | Sanity check on 50 outputs | Full test suite must pass |

**When R17's cost/runtime gains apply (~Table 1, p. 4):** Developer-written root file already
tuned to the repo; agent reproduces a **small** historical change; outcome is **fewer tokens and
less wall-clock**, not proven correct patches.

**When R18's success drop and ~20–23% cost rise apply (~Table 2, p. 6):** File adds **policy**
(especially LLM-generated or long human files); agent **obeys** it → more `pytest`, grep/read,
repo tools, reasoning tokens (Figures 6–7, **~pp. 6–7**); tasks get **harder and pricier** without
reliable gains on **resolution**.

**Resolves the blog tension:** Command-like lines (`make test-e2e` seeds DB) match R17's
orientation signal. Broad behavioral prose (hexagonal architecture, "all domain logic in domain")
match R18's extra-requirements mechanism—agents follow them and burn steps.

**Non-claim:** R17 does **not** contradict R18's resolution results; it largely does not measure
resolution. R18 does **not** measure paired PR-replay efficiency with an established human file on
the same 124 tasks.

## Santos et al. (R19): what developers actually encode

### Dataset

- 328 CLAUDE.md files from top-100 popular Claude Code projects
- Median 7 level-2 sections per file; range 0 to 213
- 23 programming languages represented; JS/TS dominant (35 projects)

### Most common concerns in CLAUDE.md files

| Concern | Files containing it | Percentage |
|---|---:|---:|
| Software Architecture | 238 | 72.6% |
| Development Guidelines | 147 | 44.8% |
| Project Overview | 128 | 39.0% |
| Testing | 116 | 35.4% |
| Commands | 109 | 33.2% |
| Dependencies | 101 | 30.8% |
| General Project Guidelines | 84 | 25.6% |
| Integration and Usage | 59 | 18.0% |
| Configuration | 57 | 17.4% |

Source trace: R19, `paper-text/claude-code-configs-2511.09268.txt`, Figure 2.

### Code examples and links in config files

| Category | Code examples | Links |
|---|---:|---:|
| Architecture | 10.98% | 1.83% |
| Development Guidelines | 17.68% | 0.61% |
| Testing | 15.24% | 0.0% |
| Commands | 15.55% | 0.3% |

The dominant pattern: Architecture is the most frequent topic (72.6%), and it rarely links out
to other documents. This means developers are encoding architectural knowledge directly in the
config file, not pointing to external docs.

## OctoBench (R73): compliance vs task-solving gap

OctoBench measures whether agents follow scaffold-specified instructions (system prompts, config
files, tool schemas, memory state) while solving tasks.

| Metric | Value |
|---|---:|
| Environments | 34 |
| Task instances | 217 |
| Scaffold types | 3 |
| Total checklist items | 7,098 |
| Average checklist items per instance | 32.7 |

Key finding: "a systematic gap between task-solving and scaffold-aware compliance." An agent
may appear correct while silently breaking higher-priority constraints from the config file. This
validates the insight: agent instructions must be treated as executable constraints that can be
verified, not just suggestions.

Source trace: R73, `paper-text/octobench-2601.10343.txt`, Table 1.

## Synthesis: what makes agent instructions effective

Combining the positive evidence (R17: efficiency gains) with the negative evidence (R18: over-broad
files hurt), the pattern emerges:

**Effective agent instructions are:**
- Short (median 641 words per R19's finding; the shorter ones in R17 showed gains)
- Specific (exact commands, architecture constraints, not generic advice)
- Actionable (commands the agent can copy-paste and run)
- Minimal (only rules the repo actually follows; stale/aspirational rules are noise)

**Ineffective agent instructions:**
- Long lists of generic engineering advice
- LLM-generated content that adds exploration overhead without precision
- Requirements that contradict the repo's actual state
- Stale changelogs or duplicated information from other docs

### Practical content checklist (inference, supported by R17 + R18 + R19)

Include:
- exact build/test/lint commands
- architecture summary (modules, boundaries, extension points)
- non-obvious conventions (naming, patterns, package structure)
- hard constraints (never do X, always verify with Y)
- known gotchas (environment issues, dependency quirks)
- verification expectations (what the agent should check before finishing)

Exclude:
- stale changelogs
- generic engineering advice available in any tutorial
- long file trees (the agent can list files itself)
- aspirational rules the repo does not actually follow
- duplicated information from README or docs

## Inference

### What the evidence supports:

1. **AGENTS.md measurably reduces agent runtime and token cost** (R17: -28.6% median time,
   -16.6% median output tokens) when content is focused and repos are small-scope tasks.

2. **Over-broad or noisy context files can reduce success rates** (R18: -3% for LLM-generated;
   +20% cost increase) because they trigger more exploration without improving patch quality.

3. **Architecture is the dominant concern** that developers encode (R19: 72.6% of files), followed
   by development guidelines, testing, and commands.

4. **Compliance with instructions is a separate dimension from task success** (R73: systematic
   gap between solving the task and following scaffold rules).

5. **The R17 vs R18 tension resolves cleanly** (see "Reconciling R17 vs R18"): they measure
   different outcomes on different tasks. R17: human file → faster/cheaper PR replay. R18:
   LLM-generated or over-broad file → lower resolution and ~20–23% higher cost on issue benchmarks;
   minimal human file → small +4% resolution gain on AGENT BENCH with cost still up. Signal-to-noise
   and **what you optimize for** (latency vs tests passing) both matter.

### Inference (author conclusion):

- Agent instruction files should be maintained like CI configuration: reviewed, tested against
  agent behavior, and kept lean. Stale or aspirational content is worse than no file at all.
- The "test" for an agent instruction file is: run the agent on a known task with and without it,
  measure time/tokens/success. If the file does not improve outcomes, trim it.

## Non-claims

- The evidence does not prove that AGENTS.md improves correctness. R17 explicitly does not
  evaluate semantic correctness; R18 shows context files can slightly reduce success.
- The evidence does not prove that any specific section ordering or format is optimal. R19
  describes what developers write, not what works best.
- OctoBench (R73) measures instruction following in synthetic environments; it does not directly
  measure the effect of adding or removing a real AGENTS.md from a production repo.
- We cannot claim that the 28.6% runtime reduction from R17 generalizes to all repos or agents.
  It is a single-agent (Codex), small-PR study.
- The +4% success from developer-provided files in R18 is small and may not be statistically
  significant across the full benchmark.

## Blog/presentation visual candidates

1. **R17 paired comparison chart**: wall-clock time and output tokens with/without AGENTS.md.
2. **R19 concern frequency bar chart**: showing Architecture at 72.6% dominance.
3. **R18 three-condition comparison**: no file vs developer-provided vs LLM-generated, showing
   the non-linear relationship.
3b. **R17 vs R18 comparison table** ("Reconciling R17 vs R18"): same OSS, different outcomes
   (efficiency vs resolution)—use for the love/hate AGENTS.md section.
4. **"Control plane, not README" slide**: the talk hook, with the distinction between config
   (versioned, tested, scoped) and documentation (aspirational, verbose, stale).
5. **Practical content checklist**: include/exclude table as a takeaway slide.

## References

- R17: On the Impact of AGENTS.md, `paper-text/agents-md-impact-2601.20404.txt`
- R18: Evaluating AGENTS.md, `paper-text/evaluating-agents-md-2602.11988.txt`
- R19: Decoding Configuration of AI Coding Agents, `paper-text/claude-code-configs-2511.09268.txt`
- R73: OctoBench, `paper-text/octobench-2601.10343.txt`
- R74: Agent READMEs, `paper-text/agent-readmes-context-files-2025.txt`
- D05: Anthropic Claude Code best practices, `articles/anthropic-claude-code-best-practices.html`
- D06: GitHub Copilot coding agent best practices, `articles/github-copilot-coding-agent-best-practices.html`
- D07: Cursor rules for AI, `articles/cursor-rules-for-ai.html`
- D35: Builder.io AGENTS.md guide, `articles/builder-agents-md.html`
