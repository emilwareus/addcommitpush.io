---
title: "Correction note: emilwareus/polint is the intended polint project"
created: 2026-06-30
type: correction-note
status: working
---

# Correction Note: `emilwareus/polint` Is the Intended Polint Project

## Why This Note Exists

The archived report
`brain/inbox/dr/2026-06-30/static-analysis-sota/17-polint-factual-overview.md`
describes `ziima/polint`, a gettext PO-file linter. That report is internally
consistent for the project it found, but it is not about the repository relevant
to this research thread.

The intended project is:

- Repository: <https://github.com/emilwareus/polint>
- Local research clone used for verification:
  `.context/polint-src`

This note supersedes report 17 for any future article, insight, or synthesis
about the user's polint project. Keep report 17 in the archive because it
documents the name collision.

## Correct Project Summary

`emilwareus/polint` is a Rust framework for repo-local static-analysis rules.
Its own README describes it as "repo-local lint rules for the policies only your
team knows" and says it provides fast file discovery, parsers, typed facts,
diagnostics, caching, CI output, and an SDK while the repository owner supplies
the policy.

The project is not positioned as a replacement for generic linters, formatters,
or language-specific toolchains. Its stated niche is project-specific policy:
internal API usage, security guardrails, migration rules, design-token
enforcement, test-quality expectations, and review conventions that are often
repeated in prompts or pull-request comments.

## Verified Architecture Claims

| Claim | Evidence | Notes |
| --- | --- | --- |
| Rules live in the consuming repository. | README setup creates `.polint/rules/src/` and a repo-local rule pack. | This makes policy versioned with the code it governs. |
| The framework ships no bundled policy rules. | README states that polint ships the SDK, parsers, facts, diagnostics, config, cache, and CI output, not built-in policy rules. | Templates are scaffolds, not enabled rules. |
| Rule authors write Rust functions against typed fact views. | README shows `#[polint::rule]` functions taking `RuleCtx<'_>` plus views such as `StringLiterals<'_>`, `Imports<'_>`, and `GoTests<'_>`. | The function signature declares the analysis capabilities a rule needs. |
| Current fact families are intentionally factual and span-backed. | `docs/ANALYSIS-ROADMAP.md` calls polint facts-first and lists shipped TS/JS literals, JSX attributes, Go imports, complexity, branch facts, and Go test facts. | Deeper symbol, call graph, CFG, dataflow, and taint work is planned. |
| Agents are a first-class consumer. | `docs/AGENT-PLAYBOOK.md` recommends `--format ai-friendly`, JSON reports, bounded querying of `.polint/output/latest.json`, baselines, ignores, and rerun loops. | This supports the article angle about executable feedback for AI coding agents. |
| Output integrates with existing review and security surfaces. | README and agent playbook mention JSON, SARIF, baselines, comment ignores, and review-time diff rules. | This places polint in the same operational ecosystem as CI and code scanning tools. |

## Neutral Positioning Against Adjacent Tools

Polint belongs between conventional linters and full program-analysis platforms:

- Compared with ESLint, Ruff, Biome, and golangci-lint, polint is not a
  language's standard lint rule ecosystem. It is the repository-owned policy
  layer for checks that are too local, cross-language, or team-specific to
  belong upstream.
- Compared with Semgrep, polint is not primarily a pattern DSL. It lets teams
  write Rust code over extracted facts and diagnostics surfaces.
- Compared with CodeQL, polint is not a whole-program query database for broad
  vulnerability research. Its nearer goal is fast repo-local policy feedback
  that can be reviewed, tested, and run by humans, CI, and agents.

## Implication For Future Insights

Use the following framing when synthesizing insights:

> Polint treats static analysis as executable local context. Instead of asking
> AI agents to remember every repository convention from prose, it turns the
> checkable parts of those conventions into versioned, testable, repo-local
> rules with agent-consumable diagnostics.

The most important research connection is not "yet another linter." It is the
design space where static analysis becomes a repair loop for AI-assisted
software engineering: precise enough to find project-specific violations, simple
enough to run locally and in CI, and structured enough for agents to consume
without reading the whole repository or every historical review comment.

## Sources

- `emilwareus/polint` README, local clone at `.context/polint-src/README.md`.
- `emilwareus/polint` agent playbook, local clone at
  `.context/polint-src/docs/AGENT-PLAYBOOK.md`.
- `emilwareus/polint` analysis roadmap, local clone at
  `.context/polint-src/docs/ANALYSIS-ROADMAP.md`.
- GitHub repository: <https://github.com/emilwareus/polint>
- ESLint custom rule docs: <https://eslint.org/docs/latest/extend/custom-rules>
- Semgrep taint/data-flow docs:
  <https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview>
- CodeQL overview: <https://codeql.github.com/docs/codeql-overview/about-codeql/>
- SARIF 2.1.0 standard:
  <https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html>
