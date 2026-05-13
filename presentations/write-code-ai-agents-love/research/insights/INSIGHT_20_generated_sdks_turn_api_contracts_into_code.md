# INSIGHT 20: Generated SDKs Turn API Contracts Into Code

## Claim

Agents should not hand-roll raw API calls when a typed, generated client can be produced from the API contract. Generated SDKs convert remote API behavior into searchable, typed, versioned code.

## Why this matters for agents

Raw `fetch`/`axios` calls hide the contract in strings: URL paths, query names, request bodies, response shapes, pagination, auth, retries, and error handling. Agents are likely to miss one of those details. A generated SDK moves those details into types, functions, schemas, and tests the agent can inspect.

## Evidence and practitioner signal

- OpenAPI Generator supports 50+ client generators and lets API maintainers generate/distribute official SDKs.
- Microsoft Kiota generates API clients for OpenAPI-described APIs across languages, with authentication, serialization, and middleware abstractions.
- Orval generates type-safe TypeScript clients, models, mocks, and query integrations from OpenAPI.
- Speakeasy generates SDKs from OpenAPI/JSON Schema with typed models and validation-oriented language support.
- Stainless generates production TypeScript SDKs from OpenAPI specs.
- FastAPI highlights OpenAPI as the mechanism for up-to-date docs, SDKs, and automation workflows.
- Prior research in the corpus supports the same direction: DocPrompting shows API documentation helps code generation; type-constrained generation and ToolGen show types/available symbols reduce invalid code.

## Agent-friendly techniques

- Treat OpenAPI/JSON Schema/TypeSpec/protobuf as a first-class source artifact.
- Generate clients in CI and fail if committed generated clients are stale.
- Prefer SDK methods over raw URL strings:
  - good: `client.users.getUser({ userId })`
  - risky: `fetch('/api/users/' + id)`
- Generate request/response types and runtime validators where possible.
- Keep generated code in a predictable folder:
  - `packages/api-client/src/generated/`
  - `apps/web/src/lib/api/generated/`
  - `schemas/openapi.yaml`
- Add lint rules that ban raw calls to internal APIs when a generated SDK exists.
- Keep examples near the generated client showing authentication, retries, pagination, and error handling.

## Generated vs committed

Two workable patterns:

- Commit generated SDKs when they are consumed by many packages, need code review, or serve as a readable local context artifact for agents.
- Do not commit generated SDKs when the generator is fast, deterministic, and CI verifies generation before build.

The key is not which policy you choose. The key is that the contract, generator config, and validation command are in the repo and easy for agents to run.

## Caveats

- Generated clients are only as good as the spec. A stale or vague OpenAPI file creates typed lies.
- Generated SDKs can be noisy. Keep them isolated and mark them as generated.
- Some APIs need hand-written ergonomic wrappers. If so, keep the wrapper thin and tested.
- Forward compatibility matters. Strict types are valuable during development, but clients may need graceful handling for unknown enum values or additive fields.

## Talk-ready line

"Do not make the agent reverse-engineer your API from stringly typed fetch calls. Generate the API into code it can read."

## References

D25, D26, D27, D28, D29, D30, R42, R43, R51, R52.
