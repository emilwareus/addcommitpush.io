---
type: insight
title: "Typed Rule Signatures Are Capability Contracts"
slug: typed-rule-signatures-are-capability-contracts
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - rust
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[static-analysis-engines-are-fact-pipelines]]"
  - "[[fact-models-make-static-rules-agent-usable]]"
---

# Typed Rule Signatures Are Capability Contracts

`polint`'s most important API move is small: a Rust rule function asks for typed
fact views as parameters. That function signature becomes the rule's analysis
contract.

## Claim

The rule signature is the build plan. A parameter like `StringLiterals<'_>` or
`ResolvedImports<'_>` is not just data access. It declares which analysis facts
the engine must prepare before the rule can run.

## Mechanism

In a conventional custom linter, capabilities often live in docs, config, or
implicit visitor behavior. In `polint`, the typed function signature gives the
macro enough information to derive a rule manifest and capability requirements.

This gives agents and humans a narrow surface:

- inspect a rule;
- see required facts;
- run only the needed capability plan;
- fail clearly if setup is missing;
- generate diagnostics from stable typed views.

## Evidence

- The README says typed fact-view parameters are the facts a rule can read, and
  `polint` derives analysis capabilities from the function signature
  (`.context/polint/README.md:114-119`).
- The macro collects view parameters and maps them to capability methods
  (`.context/polint/crates/polint-macros/src/lib.rs:56-70`).
- It generates rule metadata, capability declarations, fact-view requirements,
  and view bindings around the original function
  (`.context/polint/crates/polint-macros/src/lib.rs:76-124`).
- The mapping from view types to capabilities is explicit and centralized
  (`.context/polint/crates/polint-macros/src/lib.rs:354-378`).

## Example shape

```rust
#[polint::rule]
fn no_raw_colors(
    ctx: &mut RuleCtx<'_>,
    literals: StringLiterals<'_>,
) -> RuleResult {
    // The signature says this rule needs string literal facts.
}
```

The useful article sentence:

> The rule signature tells the engine what to build.

## Caveats

Rust rule authoring is not the lowest-friction path for every team. This API
needs templates, fixtures, examples, and agent-generated scaffolding.

The signature can describe fact requirements, but it cannot make weak facts
strong. If import resolution or symbol analysis is missing, the rule still needs
honest setup diagnostics.

## Implication

This API design connects engine design to agent UX. The agent can inspect a rule
and learn what the engine needs without reading a separate config file.

## Next test

Add one article-ready example that starts as prose:

> Do not use raw color strings in TSX.

Then show:

1. the typed rule signature;
2. the derived capability;
3. one diagnostic;
4. one agent repair loop.
