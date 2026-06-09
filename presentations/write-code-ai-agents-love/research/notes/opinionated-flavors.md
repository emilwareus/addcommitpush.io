# Opinionated Flavors to Add to the Talk

These are the user's stronger opinions, backed by practitioner research and connected to the agent-performance thesis.

## 1. Custom lint rules

Position:

Custom lint rules are how a team turns "the way we do things here" into executable architecture.

Why it belongs:

- Agents are good at reacting to deterministic failures.
- Lint output is concise, local, and actionable.
- Custom rules prevent repeated human review comments.
- Rules are better than prompts for import boundaries, raw API call bans, generated-code rules, schema validation requirements, and forbidden modules.

Best phrasing:

"Do not put your architecture only in `AGENTS.md`. Put it in ESLint, Semgrep, ast-grep, dependency-cruiser, or Nx boundaries, and let the agent iterate against the failure."

Important caveat:

Only encode rules that are mechanically detectable. Bad rules become build-breaking folklore.

References: D13-D18.

## 2. Everything in the monorepo

Position:

If the agent needs it to make the change correctly, it should be in the repo: docs, schemas, infra, runbooks, generated clients, examples, migrations, tests, fixtures, and CI scripts.

Why it belongs:

- Agents cannot reliably use context they cannot see.
- A monorepo provides one commit that ties application code to docs, infra, schemas, and generated artifacts.
- Atomic changes across app/API/infra/docs reduce coordination failures.

Best phrasing:

"A good monorepo is a context database with commits."

Important caveat:

This only works with real boundaries, ownership, affected builds, sparse/partial checkout, and CI investment. Without that, the monorepo becomes a larger pile of ambiguity.

References: D19-D24, D18.

## 3. Generated SDKs for APIs

Position:

Raw API calls are stringly typed integration debt. Generate SDKs from contracts and force code through the generated client.

Why it belongs:

- Agents hallucinate URLs, parameters, response shapes, and error behavior.
- Generated clients expose APIs as typed symbols.
- Generated SDKs create local examples and signatures that retrieval can find.
- Specs become a source of truth that can drive docs, mocks, tests, SDKs, and MCP/tools.

Best phrasing:

"If your API has a contract, generate the contract into code before asking an agent to use it."

Important caveat:

The spec must be accurate. A generated SDK from a bad spec gives agents confident wrongness.

References: D25-D30, R42, R43, R51, R52.

## How these three fit together

The three opinions share one principle:

Make intent executable.

- Custom lint rules execute architecture.
- Monorepos execute context coherence.
- Generated SDKs execute API contracts.

This is stronger than "write clean code." It says the codebase should mechanically prevent the classes of mistakes agents tend to make.
