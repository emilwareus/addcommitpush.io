# INSIGHT 04: Tests Are the Agent Feedback Loop

Tests are not just quality gates. For coding agents, tests are the primary feedback channel that
transforms guesses into grounded edits. Without executable verification, agents cannot distinguish
a plausible patch from a correct one. The evidence shows that the entire agentic coding paradigm --
from SWE-bench to Agentless to SWE-CI -- is built on test-based validation. When tests are missing,
slow, flaky, or poorly structured, agent performance degrades measurably.

## Source map

| Ref | Source | Local text | Role |
|---|---|---|---|
| R01 | SWE-bench (2023-10) | `paper-text/swe-bench-2310.06770.txt` | Established executable issue resolution as the core evaluation paradigm. |
| R09 | SWE-CI (2026-03) | `paper-text/swe-ci-2603.03823.txt` | Shifts evaluation from one-shot correctness to long-term maintainability via CI loops. |
| R23 | Agentless (2024-07) | `paper-text/agentless-2407.01489.txt` | localize-repair-validate workflow shows validation is central even in simple systems. |
| R22 | ABTest (2026-04) | `paper-text/abtest-agent-anomalies-2604.03362.txt` | Behavior-driven testing for detecting agent anomalies. |
| R67 | Rethinking Agent-Generated Tests (2026-02) | `paper-text/rethinking-agent-generated-tests-2602.07900.txt` | Counter-evidence on agent self-testing. |
| R46 | Needle in the Repo (2026-03) | `paper-text/needle-in-the-repo-2603.27745.txt` | Shows functional tests alone miss structural/maintainability failures. |
| D05 | Anthropic: Claude Code best practices | `articles/anthropic-claude-code-best-practices.html` | Official-doc evidence: verification workflows. |

## SWE-bench (R01): tests as the paradigm's foundation

SWE-bench established the modern evaluation paradigm for coding agents: given a GitHub issue
and repository snapshot, produce a patch that passes the project's test suite. This design choice --
using existing tests as the oracle -- is not incidental. It is the only scalable, objective way to verify
patches without human review.

The paradigm makes an implicit claim: **if you want agents to work on your code, you need
executable tests that can verify the change.**

### SWE-bench design properties relevant to testing

| Property | Value |
|---|---|
| Evaluation oracle | Repository test suite (fail-to-pass + pass-to-pass) |
| Test requirement | Each task requires tests that fail before fix and pass after |
| Pass-to-pass requirement | Existing tests must continue passing (regression check) |
| Environment | Pre-baked Docker with all dependencies installed |

The dual test requirement (fail-to-pass AND pass-to-pass) is the standard that all subsequent
agent benchmarks have adopted. It encodes two distinct feedback signals:
1. **Fail-to-pass:** Does the patch actually fix the issue?
2. **Pass-to-pass:** Does the patch avoid breaking existing behavior?

Source trace: R01, `paper-text/swe-bench-2310.06770.txt`.

## Agentless (R23): validation as a core workflow phase

Agentless demonstrates that even the simplest competitive approach needs validation as a first-class
phase. The three-phase workflow is:

1. **Localization:** Hierarchical fault localization (files -> classes/functions -> edit locations)
2. **Repair:** Generate multiple candidate patches in diff format
3. **Patch validation:** Re-rank patches using reproduction tests AND regression tests

### Why validation matters in Agentless

Agentless generates multiple candidate patches (not just one). Without test-based validation, it
would have no way to select the correct patch from candidates. The validation phase uses:
- **Generated reproduction tests:** Tests that reproduce the original error
- **Regression tests:** The project's existing test suite

### Agentless results

| Metric | Value |
|---|---|
| SWE-bench Lite performance | 32.00% (96/300 correct fixes) |
| Cost per issue | $0.70 |
| Approach | No autonomous agent; pure localize-repair-validate |

Source trace: R23, `paper-text/agentless-2407.01489.txt`.

The insight: even without agent autonomy, test-based validation is sufficient to select good patches
from a candidate set. The test suite is doing the "intelligence" work of distinguishing correct from
incorrect patches. This makes test quality a direct determinant of agent output quality.

## SWE-CI (R09): maintainability through iterated testing

SWE-CI introduces the evolution-based evaluation paradigm. Instead of testing one snapshot, it
tests whether agent-generated code remains functional through long-term evolution.

### SWE-CI benchmark design

| Property | Value |
|---|---|
| Total tasks | 100 |
| Average development history per task | 233 days |
| Average consecutive commits per task | 71 |
| Evaluation protocol | Architect-Programmer dual-agent CI loop |
| Metric | EvoScore (future-weighted normalized change) |

Source trace: R09, `paper-text/swe-ci-2603.03823.txt`.

### The EvoScore insight

EvoScore measures functional correctness on future modifications. It uses a future-weighted mean:
- Early iterations receive less weight
- Later iterations receive more weight (gamma >= 1)
- An agent that sacrifices short-term speed for cleaner design scores higher
- An agent that accumulates technical debt sees progressively declining performance

The formal definition (normalized change):
- If the agent improves on the base codebase: normalized by total gap to target
- If the agent regresses below baseline: normalized by baseline passing tests
- Result: a(c) in [-1, 1] where 1 = fully closed gap, -1 = broke all passing tests

### Why this matters for test design

SWE-CI's key insight: "Maintainability can be revealed by tracking how functional correctness
changes over time." This means:
- A brittle patch and an extensible patch may both pass the same initial tests
- The difference only appears when the next change arrives
- Tests must cover not just the current behavior but the stability of that behavior under evolution

This argues for **regression test suites** that accumulate over time and catch breakage from
subsequent changes. The test suite is not just a gate; it is a long-term maintenance signal.

## Needle in the Repo (R46): functional tests are necessary but insufficient

NITR demonstrates a critical limitation of test-only evaluation: 13.3% of agent outputs pass all
functional tests yet fail structural/maintainability oracles.

### NITR results

| Metric | Value |
|---|---|
| Average solve rate across all AI configurations | 36.2% |
| Best configuration solve rate | 57.1% |
| Micro cases solve rate | 53.5% |
| Multi-step cases solve rate | 20.6% |
| Outcomes passing tests but failing structural oracle | 64/483 (13.3%) |
| Hardest pressure: dependency control | 4.3% |
| Hardest pressure: responsibility decomposition | 15.2% |
| Agent-mode average (vs direct inference) | 45.0% vs 28.2% |

Source trace: R46, `paper-text/needle-in-the-repo-2603.27745.txt`.

### Implications for test design

The 13.3% "false positive" rate means that relying solely on behavioral tests creates a systematic
blind spot for structural quality. NITR uses dual oracles:
1. Functional tests for required behavior
2. Structural oracles that encode targeted maintainability constraints

This suggests that agent-friendly test suites should include:
- Behavioral tests (does it work?)
- Structural tests or lints (does it maintain the architecture?)
- Both must be automated and fast enough for agent iteration loops

## Agent-Generated Tests (R67): a counter-signal

R67 provides counter-evidence that simply making agents write more tests reliably improves
patch success. The evidence is nuanced -- agent-generated tests can help as validation oracles
during patch selection, but they can also be:
- Over-specified (testing implementation details)
- Under-specified (not capturing the actual bug behavior)
- Flaky or environment-dependent

Source trace: R67, `paper-text/rethinking-agent-generated-tests-2602.07900.txt`.

This reinforces the insight: **human-written, project-maintained tests are more reliable feedback
than agent-generated tests.** The existing test suite is the ground truth; agent-generated tests are
supplementary signals that need their own validation.

## How bad tests confuse agents

Combining evidence from multiple sources, the failure modes for agent-test interaction include:

| Bad test property | How it confuses the agent |
|---|---|
| Hidden requirements in tests | Agent cannot infer what the test actually checks |
| Tests enforce implementation details | Correct behavioral change fails structurally different tests |
| Flaky tests | Agent cannot distinguish its failure from test unreliability |
| Slow all-or-nothing suites | Agent gets no feedback during iteration (timeout or binary) |
| No targeted test path for small changes | Agent must run entire suite, burning tokens and time |
| Missing fail-to-pass tests | Agent has no signal for whether its patch actually fixes the issue |
| Tests with external dependencies | Failures from network/service issues, not code issues |

## Inference

### What the evidence supports:

1. **The entire agentic coding paradigm is built on test-based validation.** SWE-bench, Agentless,
   SWE-CI, and all derivative benchmarks use tests as the oracle. No tests = no agent.

2. **Tests serve multiple roles for agents:** verification oracle (did the patch work?), candidate
   selection (which of N patches is correct?), regression detection (did the patch break something?),
   and evolution tracking (does the code remain healthy over time?).

3. **Functional tests alone miss 13.3% of structural failures** (NITR). Combining behavioral
   tests with structural oracles/lints provides more complete feedback.

4. **Simple localize-repair-validate workflows compete with complex agents** (Agentless at 32%).
   The validation step -- not agent sophistication -- is the critical differentiator.

5. **Maintainability requires long-term test evolution** (SWE-CI). Snapshot benchmarks cannot
   distinguish a brittle fix from an extensible one; only iterated testing reveals this.

### Inference (author conclusion):

Agent-friendly test suites should provide layered verification:
- **Fast unit tests** for local iteration (seconds, targeted, deterministic)
- **Behavior/regression tests** for user-visible behavior (pass-to-pass preservation)
- **Structural tests/lints** for architecture compliance (dependency boundaries, modularity)
- **Typecheck** as broad cheap feedback (catches many errors without running code)
- **CI integration tests** for full system verification
- **Explicit commands in agent instructions** so the agent knows how to run each layer

The "tight feedback loop" principle means: the agent should be able to run a targeted test,
see the result, and iterate -- in seconds, not minutes. All-or-nothing test suites that take
10+ minutes are agent-hostile.

## Non-claims

- The evidence does not prove that more tests always help agent performance. Agent-generated
  tests (R67) can add noise rather than signal. Test quality matters more than test quantity.
- SWE-bench's test-based evaluation assumes tests exist and are correct. For projects without
  good test coverage, the agent paradigm may not apply.
- SWE-CI's EvoScore is a proxy for maintainability, not a direct measurement. The correlation
  between EvoScore and actual human-perceived maintainability is not validated.
- NITR's 13.3% false-positive rate is measured on curated probe tasks, not real-world repos.
  The rate on real codebases may be higher or lower.
- None of these papers measure the effect of test speed on agent iteration efficiency. The "fast
  feedback" argument is inferred from agent architectures, not directly measured.

## Blog/presentation visual candidates

1. **Agentless three-phase diagram**: localize -> repair -> validate, with emphasis on validation
   as the differentiator.
2. **SWE-CI evolution graph**: showing EvoScore declining as technical debt accumulates vs
   remaining stable with maintainable code.
3. **NITR false-positive stat**: "13.3% of patches pass all tests but fail structural checks" as a
   headline number.
4. **Layered verification pyramid**: fast unit tests at base, structural lints at top.
5. **"Agents do not need trust. They need a tight feedback loop." -- headline slide.**

## References

- R01: SWE-bench, `paper-text/swe-bench-2310.06770.txt`
- R09: SWE-CI, `paper-text/swe-ci-2603.03823.txt`
- R23: Agentless, `paper-text/agentless-2407.01489.txt`
- R22: ABTest, `paper-text/abtest-agent-anomalies-2604.03362.txt`
- R46: Needle in the Repo, `paper-text/needle-in-the-repo-2603.27745.txt`
- R67: Rethinking Agent-Generated Tests, `paper-text/rethinking-agent-generated-tests-2602.07900.txt`
- D05: Anthropic Claude Code best practices, `articles/anthropic-claude-code-best-practices.html`
