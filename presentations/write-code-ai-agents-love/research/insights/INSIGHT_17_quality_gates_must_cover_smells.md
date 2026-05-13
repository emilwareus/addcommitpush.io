# INSIGHT 17: Quality Gates Must Cover Smells

## Claim

Passing behavior tests is not enough. Agent-generated code can be correct-looking while introducing structural quality problems.

## Evidence

- Investigating the Smells of LLM Generated Code reports substantially higher smell incidence in LLM-generated Java code than professional references, including implementation and design smells.
- A Causal Perspective on Smells shows static-analysis-based smell measures can detect and help mitigate smell propensity.
- Rethinking Agent-Generated Tests challenges the assumption that asking agents to write more tests reliably improves patch success.
- SWE-CI and Needle in the Repo separate immediate correctness from long-term maintainability.

## Technique

- Run lint, typecheck, format, dead-code checks, and complexity rules.
- Use "no new warnings" CI policy.
- Keep existing behavior tests strong and fast.
- Add review checklist items for redundancy, incomplete implementation, naming inconsistency, unused variables/imports, and broad exceptions.

## Caveat

Agent-generated tests can be useful for exploration, but a curated test suite and static gates remain the more reliable oracle.

## References

R09, R46, R59, R60, R67.
