# Track D: Docs, Tests, Types, and Examples

## Evidence Strength

- High: tests and execution feedback.
- High: concise context and issue quality.
- Medium: typed interfaces and contracts.
- Medium-low but directionally strong: module boundaries as a standalone variable.

## Main Findings

- Relevant docs improve code generation when retrievable.
- Full dependency context beats misleading partial context in repository-level generation.
- Type constraints reduce compilation errors and improve correctness.
- Good agent tasks are shorter, scoped, and name relevant artifacts.
- Context files can reduce success when too broad or noisy.
- Agent PRs increasingly include tests.
- Outcome-based checks are better than brittle step-by-step scripts.
- Stable machine-readable contracts reduce drift across frontend/backend or API boundaries.

## Repo Implications

- Keep root agent instructions minimal.
- Put detailed guidance near the code it governs.
- Preserve and advertise fast checks.
- Keep golden examples for common patterns.
- Make boundaries explicit and stable.
- Prefer explicit TypeScript interfaces at boundaries.
- Write tasks like issue specs with acceptance checks.
