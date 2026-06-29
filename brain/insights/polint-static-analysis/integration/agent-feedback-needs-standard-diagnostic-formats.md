---
type: insight
title: "Agent Feedback Needs Standard Diagnostic Formats"
slug: agent-feedback-needs-standard-diagnostic-formats
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - diagnostics
  - ci
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[models-need-diagnostics-not-self-diagnosis]]"
  - "[[effective-false-positives-are-the-adoption-bar]]"
  - "[[data-flow-policy-needs-paths-budgets-and-models]]"
---

# Agent Feedback Needs Standard Diagnostic Formats

For humans, terminal output can be enough. For agents, code review, and CI, the
diagnostic format is part of the product.

## Claim

`polint` should treat output formats as agent interfaces:

- concise terminal output for humans;
- JSON for agents and scripts;
- GitHub annotations for pull requests;
- SARIF for code scanning and security workflows;
- explain/unknowns endpoints for deeper inspection.

The article should not present diagnostics as a cosmetic layer. They are how the
analysis becomes useful.

## Evidence

- SARIF is an OASIS standard format for static-analysis tool output.
- GitHub code scanning accepts SARIF from third-party tools and can display
  resulting alerts in the repository.
- GitHub's SARIF upload docs say the `category` parameter can distinguish
  multiple analyses on the same commit, including different monorepo slices.
- `polint` exposes `--format github` in its GitHub Action examples and review
  workflow examples (`.context/polint/README.md:382-407`).
- `polint` writes stable JSON output under `.polint/output/latest.json` and
  explicitly advises agents to select slices rather than paste the whole report
  (`.context/polint/README.md:241-249`).
- `polint` docs define an AI-friendly schema and stable JSON schemas for
  reports, rule inspection, tests, facts, unknowns, explains, ignores, and cache
  status (`.context/polint/docs/schemas/`).

## Mechanism

Different consumers need different projections of the same finding:

| Consumer | Needs |
| --- | --- |
| human in terminal | short summary and examples |
| reviewer | inline file/line annotation |
| GitHub security tab | SARIF result identity, rule metadata, locations |
| agent | compact JSON with rule ID, span, evidence, repair direction |
| maintainer | explain output, unknowns, suppressions, cache state |

If the output format is weak, the analysis cannot land. The same fact can be
useful in JSON and invisible in a noisy terminal dump.

## Article Implication

The article should include one screenshot or compact snippet of a diagnostic
moving through the loop:

```text
rule -> diagnostic -> JSON/GitHub/SARIF -> agent repair -> rerun
```

That is a more concrete story than "a linter finds issues."

## Caveats

SARIF is not the best agent format. It is excellent for ecosystem integration,
but it can be lossy for rich data-flow evidence. `polint` should preserve a
native JSON format as the canonical agent surface and treat SARIF as a projection.

## Sources To Cite

- [SARIF 2.1.0 specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [GitHub SARIF upload docs](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
- [GitHub SARIF support](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support)
- [polint GitHub Action guide](https://github.com/emilwareus/polint/blob/main/docs/GITHUB-ACTION.md)

## Next Test

For one future article example, show the same `polint` finding in:

- human output;
- JSON;
- GitHub annotation;
- SARIF.

Then explain what information each format loses or preserves.
