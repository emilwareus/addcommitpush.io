# INSIGHT 19: Monorepos Are Agent Context Infrastructure

## Claim

A serious monorepo is not "everything dumped into one Git folder." It is a single, versioned, searchable, enforceable context graph for code, docs, infra, tests, SDKs, policies, and examples.

## Why this matters for agents

Agents pay heavily for missing cross-repo context. If the application code lives in one repo, infrastructure in another, API schemas in another, docs in a wiki, and SDKs in generated package repos, an agent must reconstruct the system through external knowledge and stale assumptions. A monorepo can make the relevant world available at one commit.

## Evidence and practitioner signal

- Google's monorepo paper frames the model as a common source of truth for tens of thousands of developers, with explicit tradeoffs and custom tooling.
- Code Simplicity breaks monorepo value into concrete mechanisms: atomic commits across projects, a universal directory hierarchy, one place to check out/commit, a single view of history, and the one-version rule.
- Docs as Code argues that docs should use the same version control, review, and CI workflow as code.
- GitLab's GitOps/IaC guidance treats Git as source of truth for infrastructure and application deployment code.
- Terraform monorepo guidance points out both the coordination benefits and module-versioning tradeoffs.
- Dropbox's monorepo-size writeup is a useful warning: without active investment, large repos can slow clone, CI, and daily development.

## Agent-friendly techniques

- Put these in the same repo when they change together:
  - app code
  - API schemas
  - generated SDKs or generation configs
  - database migrations
  - Terraform/CDK/Kubernetes manifests for app-owned infra
  - docs, ADRs, runbooks, examples, test fixtures
  - CI scripts and release automation
- Make the top-level layout explicit:
  - `apps/`
  - `packages/`
  - `infra/`
  - `docs/`
  - `schemas/`
  - `tools/`
  - `examples/`
- Use package/project ownership boundaries, not random folders.
- Enforce cross-package dependencies with Nx, dependency-cruiser, Bazel/Buck/Pants rules, or custom lint.
- Make affected tests/builds cheap and deterministic; monorepo value collapses if every change requires running everything.
- Keep generated artifacts policy explicit: either commit generated clients deliberately or commit generation config plus CI checks that generated output is fresh.

## Best argument for the talk

For AI agents, the monorepo's special power is **atomic context**:

- The docs match the code at the current commit.
- The API schema matches the generated client at the current commit.
- The infrastructure change can be reviewed with the application change.
- The tests and scripts describe the exact version of the system being edited.

## Caveats

- Monorepos need tooling. Search, ownership, affected builds, dependency rules, sparse checkout/partial clone, and CI caching become infrastructure.
- Access control and secrets require care. "Everything in one repo" does not mean every person or agent can touch everything.
- Shared dependency versions are useful but can make broad upgrades expensive.
- A monorepo without boundaries becomes a larger mess, not a better context layer.

## Talk-ready line

"For agents, a good monorepo is not one repo. It is one commit that contains the whole truth."

## References

D19, D20, D21, D22, D23, D24, D18, R13, R15.
