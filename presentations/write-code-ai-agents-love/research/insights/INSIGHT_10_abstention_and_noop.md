# INSIGHT 10: Agent-friendly Repos Help Agents Not Edit

## Claim

Good coding agents must sometimes conclude that no code change is required. Repositories can make this easier by exposing behavior, constraints, and verification paths clearly.

## Evidence

- FixedBench (R41) evaluates no-op tasks and reports that strong agents often still propose unnecessary code changes.
- Needle in the Repo (R46) separates functional tests from structural maintainability oracles.
- SWE-CI (R09) shows long-term maintainability depends on avoiding regressions across future changes, not only passing the current test suite.
- ABTest (R22) frames behavior-driven tests as a way to catch agent anomalies.

## Implication

Agent-ready repos should make "do nothing" defensible:

- clear current behavior docs,
- tests that demonstrate the existing contract,
- issue templates that distinguish bug reports from questions,
- ownership and scope notes,
- changelog or migration docs for intentional behavior,
- review guidance that flags unnecessary churn.

## Talk Use

"The most expensive agent bug is the confident edit you did not need."
