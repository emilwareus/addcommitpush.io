---
type: insight
title: "Repo-Local Rules Need A Trust Boundary"
slug: repo-local-rules-need-a-trust-boundary
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - security
  - supply-chain
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[repo-local-policy-is-executable-memory]]"
  - "[[typed-rule-signatures-are-capability-contracts]]"
  - "[[effective-false-positives-are-the-adoption-bar]]"
---

# Repo-Local Rules Need A Trust Boundary

The best argument for `polint` is that repo-local policy should be executable.
The strongest objection is the same sentence: executable repo-local policy is
code, and code has a trust boundary.

## Claim

The article should say this plainly:

> `polint` rules are trusted project code. Do not run rules from an untrusted
> repository as if they were inert configuration.

That does not weaken the product story. It makes the story honest.

## Evidence

- Cargo build scripts are compiled and run before the package is built, and can
  perform tasks before the rest of compilation.
- `polint` repo-local rule hosts are built and run through Cargo, with a
  configurable rule-host target directory and Cargo profile
  (`.context/polint/README.md:164-198`).
- GitHub Actions docs warn that privileged workflow triggers combined with
  untrusted pull-request code can expose repositories to compromise, secrets,
  write tokens, and cache sharing.
- GitHub Actions docs say GitHub-hosted runners execute in clean ephemeral VMs,
  while self-hosted runners do not provide the same compromise-resistance
  guarantee for untrusted workflow code.
- `polint` docs provide `polint inspect rule --format json`, `polint test
  --format json`, and JSON schemas as inspectable surfaces before full checks
  run (`.context/polint/docs/CONSUMER-SETUP.md:46-89`).

## Mechanism

There are two distinct uses of `polint`:

| Context | Trust posture |
| --- | --- |
| your repo, your rules | trusted project code, like tests or build scripts |
| external PR to a trusted repo | run with CI privilege separation and least privilege |
| arbitrary cloned repo | untrusted code; inspect before executing |
| AI-agent workspace | trusted only if the agent is allowed to execute project code |

Repo-local rules are closer to test code than to a static config file. They are
reviewable, versioned, and testable, but they still execute.

## Product Implications

The right product shape is not pretending rules are harmless. It is making the
trust boundary visible:

- rule metadata inspection before execution;
- stable rule manifests;
- generated fixtures and `polint test`;
- pinned CI action versions;
- separate review workflows for untrusted PRs;
- clear docs that repo-local rules are code;
- future sandbox or permission model if rules are shared across trust domains.

## Agent-Specific Risk

AI agents make the trust boundary sharper. If an agent can add or modify
`.polint/rules`, and another workflow automatically builds and runs those rules,
then the rule pack is part of the agent's execution surface.

That suggests a simple policy:

> A PR that changes `polint` rules should be reviewed with the same seriousness
> as a PR that changes tests, build scripts, or CI workflows.

## Caveats

This is not unique to `polint`. ESLint plugins, test runners, build tools, code
generators, GitHub Actions, and Cargo build scripts all execute code. The point
is to classify `polint` correctly, not to treat it as unusually dangerous.

## Sources To Cite

- [Cargo build scripts](https://rustwiki.org/en/cargo/reference/build-scripts.html)
- [GitHub Actions secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [polint consumer setup](https://github.com/emilwareus/polint/blob/main/docs/CONSUMER-SETUP.md)
- [polint GitHub Action guide](https://github.com/emilwareus/polint/blob/main/docs/GITHUB-ACTION.md)

## Next Test

Write a short "trust model" section for the article:

- rules are trusted project code;
- use GitHub-hosted runners or isolated runners for untrusted PRs;
- inspect and test rule packs before enabling them in CI;
- do not run arbitrary cloned rule packs in a privileged environment.
