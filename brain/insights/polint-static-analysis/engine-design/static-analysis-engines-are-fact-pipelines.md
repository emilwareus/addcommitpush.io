---
type: insight
title: "Static Analysis Engines Are Fact Pipelines"
slug: static-analysis-engines-are-fact-pipelines
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - engine-design
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[fact-models-make-static-rules-agent-usable]]"
  - "[[typed-rule-signatures-are-capability-contracts]]"
---

# Static Analysis Engines Are Fact Pipelines

The practical unit of a static-analysis engine is not the AST. It is a pipeline
that turns source files into stable facts, makes capability dependencies
explicit, runs rules against typed views, and emits diagnostics with evidence.

## Claim

The right mental model for `polint` is:

```text
source files -> parsers -> native facts -> derived facts -> capability plan
             -> typed views -> rules -> diagnostics -> review/CI output
```

This is more useful than presenting the engine as "parser plus rules." Many
interesting policies need imports, symbols, references, calls, control flow,
data flow, changed-file facts, model facts, and provenance.

## Mechanism

Static-analysis engine design has three separations:

1. Extraction: produce facts from source code and toolchain inputs.
2. Derivation: compute higher-level facts such as resolved imports, symbols,
   call edges, summaries, and data-flow edges.
3. Policy: let rules ask questions over stable views without depending on raw
   parser internals.

This separation makes local policy authoring tractable. A repo rule should not
need to know every parser detail just to ask "does this changed route handler
call the approved client?"

## Evidence

- `polint` exposes typed fact views and derives rule capabilities from function
  signatures (`.context/polint/README.md:114-119`).
- `analysis_plan.rs` adds dependencies for richer capabilities. Calls, control
  flow, and data flow depend on resolved imports, module graph, symbols, and
  references (`.context/polint/crates/polint/src/analysis_plan.rs:674-678`).
- `docs/facts/policy-queries.md` says the public style is typed views plus one
  query object and one view method. It explicitly avoids a string query
  language, fluent builder DSL, closure filter DSL, or public graph traversal
  API.
- The API visibility plan separates stable fact views, preview policy views,
  deferred raw graph APIs, and internal provider/parser/database details
  (`.context/polint/docs/API-VISIBILITY-PLAN.md`).
- CodeQL and Joern show the same broad principle from different designs:
  meaningful analysis happens over semantic program representations, not just
  raw syntax.

## Caveats

The pipeline can become too abstract. The product surface should keep common
rule authoring simple: imports, paths, symbols, literals, calls, changed files,
and a few policy queries.

The article should avoid making internal graph machinery sound like stable
public API if it is still preview or internal.

## Implication

The "designing a static analysis engine" section should focus less on named
algorithms and more on boundaries:

- stable IDs;
- fact schemas;
- capability planning;
- typed views;
- provenance;
- budgets;
- diagnostics.

Algorithms matter, but the product succeeds when the engine turns them into
usable facts.

## Next test

Create one diagram for the article:

```text
files
  -> parser facts
  -> import/symbol/reference facts
  -> call/control/data-flow facts
  -> rule capability plan
  -> typed view
  -> diagnostic
```

Use a single example rule through the diagram: "backend code must use generated
client for internal API calls."
