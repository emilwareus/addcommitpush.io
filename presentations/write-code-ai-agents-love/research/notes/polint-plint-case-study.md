# polint / plint Case Study

This is a local implementation note for the talk. It should be framed as "one option I use," not as a product pitch.

## Short version

`polint` is a "bring your own rules" linting framework. The rule logic lives as Rust code in the consumer repository, while `polint` supplies the scanning infrastructure: SDK, parsers, fact views, diagnostics, local runner, config, cache, stable JSON/SARIF output, baselines, ignores, and CI/agent affordances.

This matters because some architecture rules are too project-specific or stateful for YAML pattern tools. YAML tools are excellent for many cases, but once a rule needs cross-file evidence, computed exceptions, test coverage heuristics, or domain-specific path semantics, code becomes the more natural rule language.

## What polint contributes to the research argument

The broader research thesis says agents do better when intent is executable. `polint` is a concrete example:

- agent-facing prose remains useful, but analyzable conventions become code
- diagnostics inject missing project context at the exact edit location
- rule output is machine-readable, so agents can parse and remediate it
- baselines let a repo ratchet policy adoption without requiring a flag day
- ignores are inspectable debt, not invisible comments

Talk framing:

> "For normal patterns, use normal tools. But when your rule is really your architecture encoded in code, a code-based rule pack is often the escape hatch."

## Public polint repo findings

Source: `https://github.com/emilwareus/polint`, downloaded locally as `articles/polint-readme.md`.

Key facts:

- README positions it as "AI-agent-native, shadcn-style linting for rules you own."
- It explicitly ships no built-in policy rules.
- `polint init` creates `.polint.toml`, `.polint/rules/src/`, `.polint/cache/`, `.polint/.gitignore`, and a Rust toolchain pin when needed.
- `polint new-rule <go|ts|js|generic> <name>` creates a Rust rule module in the repo.
- Rules use `#[polint::rule]` functions with typed fact-view parameters such as `StringLiterals<'_>`, `Imports<'_>`, and `GoTests<'_>`.
- `RuleCtx` reports diagnostics, source paths, rule options, and metadata.
- JSON reports have a stable schema and deterministic ordering.
- SARIF output supports code scanning workflows.
- Baselines distinguish existing debt from new violations.
- Comment ignores support local suppression, while `polint ignores` makes suppressed debt discoverable.

## Agent-playbook findings

Source: `articles/polint-agent-playbook.md`.

Agent-specific affordances:

- `polint check --format json`
- `--only-rule` for focused remediation
- `--max-diagnostics` to cap output without changing failure semantics
- `--fail-on warn|error|none` for severity gates
- `polint check --baseline --new-only` for ratcheting
- `polint ignores --format json` for cleanup tasks

This is useful for the talk because it treats lint output as an agent protocol, not just a human terminal message.

## Real usage in `/Users/emilwareus/Development/plint`

The `plint` repo is a concrete "agent-friendly repo" case study because it combines:

- root `AGENTS.md` and scoped `backend/AGENTS.md`
- a monorepo with `apps/`, `packages/`, `backend/`, `sdks/`, `iac/`, `docs/`, and `thoughts/`
- Pulumi infra in the same repo under `iac/`
- generated OpenAPI contract artifacts under `backend/openapi/`
- generated TypeScript SDK under `packages/sdk-ts`
- generated Go SDK under `sdks/plint/go`
- repo-local custom lint policy under `.polint/rules`
- a pre-existing Go boundary analyzer under `backend/tools/bcimportlint`

The `.polint.toml` describes the project intent directly:

> `# polint is for repo-local engineering policy as code.`

The current `.polint.toml` config wires 17 rules, all warning-level during adoption:

- `plint/service-http-component-test-evidence`
- `plint/backend-layer-imports`
- `plint/backend-app-registry-no-repositories`
- `plint/backend-app-root-registry-only`
- `plint/backend-app-handler-shape`
- `plint/backend-adapter-typed-errors`
- `plint/backend-domain-infra-purity`
- `plint/backend-mutating-routes-require-csrf`
- `plint/backend-active-school-routes-require-guard`
- `plint/backend-context-propagation`
- `plint/backend-repository-interface-location`
- `plint/backend-domain-typed-errors`
- `plint/backend-uuid-boundary`
- `plint/backend-gorm-adapter-test-coverage`
- `plint/backend-http-route-component-tests`
- `plint/backend-domain-test-coverage`
- `plint/backend-test-parallel-and-helper`

The rules cover several categories that are hard to keep reliable through prose:

- layer import direction
- domain/app purity from transport and persistence infrastructure
- route registration security requirements
- context propagation
- typed error discipline
- UUID boundary usage
- repository interface placement
- HTTP route/component test evidence
- GORM adapter test coverage
- test shape conventions

## Example: architecture boundary as code

`backend_layer_imports.rs` checks source and target package metadata and emits context-specific messages:

- `ports` may not import same-context `adapters`, `domain`, or `appports`
- `app` may not import same-context `adapters`, `ports`, or `service`
- `api/module` implementations may not import same-context domain/repository/adapter internals
- `domain` may not import adapters, ports, or service

This is stronger than "follow clean architecture" because the rule knows Plint's actual folder structure and exception cases.

## Example: route security as code

`backend_route_security.rs` checks `backend/internal/**/ports/http.go` and enforces:

- mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`) should include `auth.RequireCSRF()`
- routes under `/v1/schools/active/` should include `auth.RequireActiveSchool()`
- the login route is explicitly exempted as the credential exchange

This is a good agent example because route registration is an easy place for an agent to add a feature and forget security middleware.

## Example: tests as visible evidence

`backend_http_route_component_tests.rs` collects registered route handlers and service component test names. It warns when a handler lacks direct `TestHttp_*` coverage or explicit route-matrix coverage.

This illustrates the "quality gate beyond tests" point: it does not prove behavior, but it catches missing evidence paths when agents add routes.

## Interaction with generated SDKs

`plint` also demonstrates the generated-SDK flavor:

- `backend/openapi/swagger.json` is generated from the Go backend.
- `openapitools.json` generates:
  - TypeScript SDK: `packages/sdk-ts`
  - Go SDK: `sdks/plint/go`
- `make generate-sdks-backend` regenerates OpenAPI, TS SDK, Go SDK, adjusts package metadata, builds TS outputs, and runs Go SDK tests.
- `backend/AGENTS.md` explicitly says not to hand-edit `backend/openapi/`, `packages/sdk-ts/src/`, or `sdks/plint/go/`.
- backend component tests are expected to use the generated Go SDK rather than hand-written HTTP requests.

This is a strong real-world example for the claim: "Generate API contracts into code agents can inspect and use."

## Interaction with monorepo/context

`BACKEND_ARCHITECTURE.md` explicitly says Plint should keep backend in the same repo as client, desktop shell, generated SDKs, and infrastructure.

This supports the monorepo section:

- app code, backend code, generated contracts, generated SDKs, docs, tests, migrations, and infra can be changed atomically
- agents can inspect all of them in one local filesystem
- the repo includes both human instructions and executable enforcement

## Caveats to mention

- This is not a replacement for ESLint/Semgrep/Nx/ast-grep. It is an option when rules need code-level flexibility.
- Rule code adds maintenance burden. Bad rules can become noisy or encode stale architecture.
- Rust rule packs are powerful but introduce a toolchain requirement.
- Rules should start as warnings or baselined checks when adopting in an existing repo.
- polint currently appears early-stage: small public footprint, 0.1.x versioning, and owner-driven usage.

## How to present without overselling

Recommended phrasing:

> "I use this pattern myself. For ordinary rules, YAML and existing linters are great. But for repo-specific architecture, I want the rule to be code, versioned inside the repo, with JSON output an agent can loop on. `polint` is my current experiment in that direction."

Avoid:

- "polint replaces Semgrep/ESLint."
- "everyone should use this."
- "YAML rules are bad."

Better:

- "Rules as code is one more tool in the executable-architecture toolbox."
- "The important part is not the tool; it is that repo-specific intent becomes runnable."

## References

D13-D18, D31-D33, local `/Users/emilwareus/Development/plint/.polint.toml`, local `/Users/emilwareus/Development/plint/.polint/rules/src`, local `/Users/emilwareus/Development/plint/BACKEND_ARCHITECTURE.md`, local `/Users/emilwareus/Development/plint/backend/CODE_PATTERNS.md`.
