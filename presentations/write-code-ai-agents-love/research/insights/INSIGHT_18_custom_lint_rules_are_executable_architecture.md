# INSIGHT 18: Custom Lint Rules Are Executable Architecture

## Claim

If an architectural rule matters, encode it as a lint/static-analysis rule instead of only describing it in prose. Agents follow concrete feedback loops better than vague guidance.

## Why this matters for agents

Agent instructions are useful, but they are lossy. A prompt can say "do not call the database from UI code," but a custom lint rule can fail the exact import that violates the boundary. That turns a human convention into an executable constraint the agent can run, inspect, and fix.

## Evidence and practitioner signal

- ESLint explicitly supports custom rules when core rules do not cover a use case.
- typescript-eslint documents type-aware custom rules using parser services and the TypeScript checker.
- Semgrep positions custom rules as secure guardrails that can enforce organization-specific conventions in IDEs, PRs, and pre-commit.
- Semgrep's rule examples include turning guidelines such as authentication requirements into code patterns.
- ast-grep provides YAML lint rules over syntax trees, with file globs, severity, messages, and optional fixes.
- Nx's `@nx/enforce-module-boundaries` shows a mature version of this idea: architectural dependency rules can be encoded as tags and enforced during linting.

## Agent-friendly techniques

- Create rules for architectural boundaries:
  - UI cannot import persistence modules.
  - Server-only modules cannot be imported into client bundles.
  - Feature packages cannot bypass public package exports.
  - No imports from `internal/` outside the owning package.
- Create rules for approved integration patterns:
  - API calls must use generated SDK clients.
  - External input must pass through a schema validator.
  - Database writes must go through service/repository modules.
- Create rules for agent failure modes:
  - Ban unused exports and dead files.
  - Ban broad exception handling unless annotated.
  - Ban `any`, `@ts-ignore`, or test-only helpers in production code.
- Put custom rule tests next to the rule implementation. Agents need examples of both valid and invalid code.
- Prefer rules with precise messages and fix suggestions. The rule output should tell the agent what to do next.

## Implementation sketch

For a TypeScript repo:

1. Start with existing tools: `eslint`, `typescript-eslint`, `@nx/enforce-module-boundaries`, `eslint-plugin-import`, `eslint-plugin-boundaries`, or `dependency-cruiser`.
2. Add custom ESLint rules only for conventions that cannot be expressed with standard plugins.
3. Use Semgrep or ast-grep for cross-language, migration, security, or pattern rules.
4. Run the rules in CI and expose one local command, such as `pnpm lint:architecture`.
5. Document the rule IDs in `AGENTS.md` only briefly; the executable rule is the source of truth.

## Local option: polint

`polint` is a useful local case study for this section. It is not the only answer, and it should not be pitched as a replacement for normal linters. The point is the pattern: "bring your own rules" as code.

Unlike YAML-first pattern tools, `polint` keeps rule packs as normal Rust code inside the consumer repo under `.polint/rules`. The framework supplies scanning infrastructure: SDK, parser-backed fact views, diagnostics, local runner, config, cache, stable JSON/SARIF output, baselines, ignore handling, and CI/agent affordances. The project owns the policy.

The real `plint` repo uses this for backend architecture guardrails. Its `.polint.toml` says the intent directly: "polint is for repo-local engineering policy as code." Current rules cover layer imports, domain/app purity, route security, context propagation, typed errors, UUID boundaries, handler shape, repository placement, and test evidence.

This is a good "I use this option" example for the talk:

> "For normal cases, use normal lint tools. When the rule needs repo-specific logic, cross-file evidence, generated-contract awareness, or domain-specific exceptions, I want the rule to be code."

## Caveats

- Bad lint rules create noise, and agents may optimize for satisfying the rule instead of preserving intent.
- Rules need tests and owners. A stale rule is prompt poison with a compiler.
- Use lint for mechanically detectable boundaries, not nuanced design judgment.

## Talk-ready line

"Do not ask the agent to remember your architecture. Make the architecture fail the build when it is violated."

## References

D13, D14, D15, D16, D17, D18, D31, D32, D33, R59, R60.
