---
type: insight
title: "Call Graphs Are Approximation Families"
slug: call-graphs-are-approximation-families
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - call-graphs
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[unknowns-are-static-analysis-product-data]]"
  - "[[static-analysis-engines-are-fact-pipelines]]"
---

# Call Graphs Are Approximation Families

"Build a call graph" is underspecified. A call graph is not a single truth. It
is an approximation whose precision depends on language semantics, roots,
dependency scope, type information, dispatch model, heap abstraction,
frameworks, and unsupported dynamic features.

## Claim

`polint` should not expose "the call graph" as a raw singular object. It should
expose call facts with algorithm, status, precision, provenance, and unresolved
reasons.

## Mechanism

Call graph construction is a ladder.

| Level | What it gives | Cost and risk |
| --- | --- | --- |
| Direct syntactic calls | call sites and obvious callees | misses dynamic targets |
| Import/name binding | resolved named calls | depends on module resolution |
| CHA | possible virtual/interface targets from class hierarchy | over-approximates |
| RTA | reachable instantiated types | sensitive to roots and partial programs |
| VTA | assigned instantiations and type flow | more precision, more state |
| Points-to/context-sensitive | heap/function-value targets | expensive and model-heavy |
| Framework/repo models | route, DI, registry, callback edges | requires local modeling |
| Unresolved facts | honest unknowns | needs UI and rule semantics |

For JavaScript, TypeScript, and Python, functions are values and properties can
be dynamic. For Go, interface dispatch, function values, build tags, tests,
goroutines, reflection, and unsafe all matter. No one algorithm covers this
cleanly across languages.

## Evidence

- SootUp presents CHA, RTA, and VTA as separate call-graph construction
  algorithms. RTA refines CHA by considering instantiated implementers; VTA
  refines further through assignments and points-to relationships.
- The local `polint` call-graph research says a call graph is an approximation
  family parameterized by language semantics, entrypoints, dependency scope,
  dispatch model, heap/type abstraction, context sensitivity, and feature
  models (`.context/polint/research/call-graphs/FINAL-REPORT.md`).
- `polint` call facts include `CallSiteFact`, `CallTargetFact`, and
  `UnresolvedCallFact`, with target status, algorithm, provenance, precision,
  and unresolved reasons
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:7-58`).
- `CallAlgorithm` includes syntax, direct reference, import binding, Go static,
  Go CHA/RTA/VTA, function-token flow, type hierarchy, points-to,
  framework-model, repo-model, and unsupported tiers
  (`.context/polint/crates/polint/src/analysis/calls/facts.rs:122-148`).
- The `dr` call-graph report scored 2/5. It is useful as a lead for CHA/RTA/VTA
  sources, but incomplete for points-to, context sensitivity, and JS/TS limits.

## Caveats

The article should not imply that all call graph tiers are equally implemented
or stable in `polint`. Some are architecture direction, preview, or internal.

"Conservative" means different things depending on whether the rule cares about
false positives or false negatives. A security reachability rule and a "ban
direct call" rule may need different defaults.

## Implication

Algorithm provenance is a product feature. A rule author should know whether a
call edge came from syntax, import binding, RTA, framework model, or a repo
model.

## Next test

Create a small article example with the same source code analyzed at three
levels:

1. direct calls only;
2. import binding;
3. framework route model.

Show how the diagnostic changes and where unresolved edges remain.
