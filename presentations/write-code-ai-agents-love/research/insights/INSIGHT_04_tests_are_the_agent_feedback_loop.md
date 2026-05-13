# INSIGHT 04: Tests Are the Agent Feedback Loop

## Claim

Tests are not just quality gates. For coding agents, tests are the main feedback channel that lets them turn guesses into grounded edits.

## Evidence

- SWE-bench (R01) made executable issue resolution the core evaluation mode for coding agents.
- SWE-CI (R09) shows one-shot correctness is insufficient; maintainability appears through repeated changes and regression behavior.
- ABTest (R22) proposes behavior-driven testing for agent anomalies.
- Agentless (R23) relies on a localize -> repair -> validate workflow, showing validation is central even in simpler systems.

## Failure Mode

Bad tests confuse agents:

- hidden requirements in tests,
- tests that enforce implementation details,
- flaky tests,
- slow all-or-nothing suites,
- no targeted test path for a small change.

## Practical Rule

Provide layered verification:

- fast unit tests for local iteration,
- behavior/regression tests for user-visible behavior,
- typecheck and lint for broad cheap feedback,
- CI for integration,
- explicit commands in agent instructions.

## Talk Use

"Agents do not need trust. They need a tight feedback loop."
