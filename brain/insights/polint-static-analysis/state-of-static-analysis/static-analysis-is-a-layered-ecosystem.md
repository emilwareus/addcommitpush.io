---
type: insight
title: "Static Analysis Is A Layered Ecosystem"
slug: static-analysis-is-a-layered-ecosystem
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - ai-agents
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[custom-lint-rules-are-executable-architecture]]"
  - "[[fact-models-make-static-rules-agent-usable]]"
---

# Static Analysis Is A Layered Ecosystem

Static analysis is not one product category. It is a stack of representations,
solvers, rule APIs, and delivery surfaces. The useful article framing is not
"static analysis is back." It never left. The shift is that AI coding agents
make repo-local engineering policy part of the runtime of software delivery.

## Claim

The modern static-analysis landscape is layered: formatters, typecheckers, AST
linters, semantic linters, SAST tools, path/data-flow engines, graph query
engines, policy-as-code systems, and code-review integrations all solve
different parts of the problem.

`polint` should be positioned as the repo-local policy layer. It should not be
positioned as a replacement for ESLint, Ruff, Biome, Semgrep, CodeQL,
typecheckers, or formatters.

## Mechanism

Each layer knows a different set of facts.

| Layer | Examples | What it can know | What it usually cannot know |
| --- | --- | --- | --- |
| Formatter/typechecker | Prettier, `tsc`, mypy | syntax, types, style | local architecture intent |
| AST linter | ESLint, Ruff, Clippy | language-specific patterns | cross-language repo contracts |
| Pattern/static SAST | Semgrep, ast-grep | configurable syntax and data-flow patterns | exact internal framework semantics |
| Semantic graph/query | CodeQL, Joern | call, control, and data-flow models | repo-specific conventions unless modeled |
| Repo-local policy | `polint` | team-owned executable conventions | anything not statically observable |

This matters because a rule like "do not import raw persistence from UI code" is
not a formatting rule, and a rule like "request data must not reach shell
execution without validation" is not a simple AST rule. They need different fact
families and different evidence.

## Evidence

- `polint` says it is not a replacement for ESLint, Biome, Ruff, golangci-lint,
  or formatters. It is for rules that belong to the codebase
  (`.context/polint/README.md:14-15`).
- `polint` ships no built-in policy rules. The repo owns its rules while
  `polint` supplies discovery, typed facts, diagnostics, caching, and output
  (`.context/polint/README.md:35-37`).
- ESLint has an official custom-rule API, which shows that local policy rule
  authoring is a mainstream need in JavaScript and TypeScript.
- CodeQL distinguishes local and global data flow and says global data flow is
  more expensive.
- Joern's code property graph is explicitly a shared representation over syntax,
  control flow, and data flow.
- The `dr` state-of-static-analysis report scored 1/5, so it is only useful as
  a lead. This insight is grounded mainly in primary docs and the local `polint`
  repo.

## Caveats

The phrase "language agnostic" needs care. For `polint`, it should describe the
architecture and rule API, not equal semantic precision across every language
today.

The article should also avoid claiming that repo-local policy is new. The
stronger claim is narrower: AI agents make repo-local policy more urgent because
the feedback has to reach the machine during repair.

## Implication

The article should start from a taxonomy, not a tool pitch. The reader should
understand why the world already has many static-analysis tools and why there is
still a gap for repo-owned executable policy.

## Next test

Build a small comparison table for the article using one policy across layers:
"UI code must not call raw API endpoints."

Evaluate how much each layer can know:

- formatter: nothing;
- typechecker: maybe invalid API surface;
- AST linter: raw string or forbidden import;
- Semgrep/CodeQL: call or taint pattern;
- `polint`: repo-owned rule with the project's approved generated SDK path.
