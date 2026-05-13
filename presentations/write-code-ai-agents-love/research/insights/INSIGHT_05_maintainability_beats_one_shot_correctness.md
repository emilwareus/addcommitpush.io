# INSIGHT 05: Maintainability Beats One-shot Correctness

## Claim

The next frontier is not whether agents can pass today's tests. It is whether their changes remain easy to extend, adapt, and verify through future changes.

## Evidence

- SWE-CI (R09) explicitly argues that snapshot benchmarks hide maintainability differences. A brittle patch and an extensible patch can both pass the same tests.
- FEA-Bench (R08) and Multi-SWE-bench (R05) expand the task space beyond Python bug fixing.
- SWE-bench Live and SWE-rebench (R06, R07) address contamination and benchmark freshness, but still mostly measure issue resolution.

## Implication

Agent-friendly codebases should optimize for future editability:

- clear boundaries,
- stable public interfaces,
- small modules,
- typed contracts,
- behavior tests around extension points,
- migration notes when conventions change,
- examples that show the preferred pattern.

## Talk Use

"Passing the test is table stakes. The real question is whether the next agent can change it again."
