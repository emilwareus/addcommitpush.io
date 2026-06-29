---
type: insight
title: "Call Graph Claims Need Algorithm Provenance"
slug: call-graph-claims-need-algorithm-provenance
created: 2026-06-29
status: working
publish: true
tags:
  - static-analysis
  - call-graphs
  - engine-design
  - polint
feeds_into:
  - "[[polint-static-analysis]]"
related:
  - "[[call-graphs-are-approximation-families]]"
  - "[[unknowns-are-static-analysis-product-data]]"
  - "[[production-data-flow-claims-need-tool-doc-crosschecks]]"
---

# Call Graph Claims Need Algorithm Provenance

The phrase "the call graph says" is too vague. A call graph is the output of a
chosen approximation under a chosen set of language assumptions.

## Claim

Every call edge should carry algorithm provenance. At minimum, a rule should be
able to distinguish:

- direct syntactic edge;
- CHA edge;
- RTA edge;
- VTA or points-to-derived edge;
- framework model edge;
- heuristic edge;
- unresolved or unsupported edge.

The rule author should not have to reverse-engineer how confident the engine is.

## Evidence

- SootUp documents CHA, RTA, and VTA as distinct call graph construction
  algorithms, with RTA refining CHA and VTA refining RTA through assignment and
  points-to information.
- SootUp's VTA documentation notes its dependency on Spark pointer analysis and
  says a Spark reimplementation in SootUp is under development.
- The Tip and Palsberg propagation-based call graph paper reports RTA, XTA, and
  YTA as separate algorithms with benchmark running times.
- The Andersen analysis paper is evidence that points-to analysis has practical
  complexity concerns, even when worst-case complexity does not dominate typical
  programs.
- Go's RTA package documents RTA as a fast call graph and reachable-code
  algorithm for Go.
- `polint` call and data-flow facts already carry algorithm, precision,
  provenance, status, confidence, and stable keys in related fact models.

## Mechanism

Algorithm provenance changes rule semantics. For example:

```text
Forbid raw SQL calls reachable from request handlers.
```

That rule has different meaning under:

- direct call edges only;
- RTA with package loading;
- framework entrypoint models;
- conservative heuristic edges through callbacks;
- no reflection modeling.

A high-severity diagnostic from a direct edge is not the same kind of claim as a
low-confidence diagnostic from a framework model.

## Product Shape

A call edge should be inspectable as data:

```text
caller: handlePost
callee: db.Raw
algorithm: rta
precision: setup_aware
provenance: native
status: present
evidence: receiver type instantiated in package api
```

Unknowns should also be inspectable:

```text
call_site: invoke(handlerName)
status: unknown
reason: dynamic property read
precision: unknown
```

This lets a policy rule decide whether unknowns are acceptable, warnings, or
hard failures.

## Implication For The Article

The call-graph section should avoid a linear "simple to advanced" story. Better:

> A call graph is not a feature toggle. It is a family of approximations, and
> the approximation must travel with the edge.

That keeps the article credible with static-analysis readers and useful for
agent-tool design.

## Caveats

The second research report did not admit sources for Steensgaard, context or
object sensitivity, JavaScript/TypeScript dynamic-call limits, or precision and
recall benchmarks. Those claims need separate sources before they appear in the
article.

## Sources To Cite

- [SootUp call graph construction](https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/)
- [Scalable Propagation-Based Call Graph Construction Algorithms](http://web.cs.ucla.edu/~palsberg/paper/oopsla00.pdf)
- [The Complexity of Andersen's Analysis in Practice](https://manu.sridharan.net/files/sas2009.pdf)
- [Go RTA package docs](https://pkg.go.dev/golang.org/x/tools/go/callgraph/rta)

## Next Test

For each call edge in a `polint` explain output, include the algorithm,
precision, status, and provenance. Then write an example rule that accepts only
direct/RTA edges for errors and downgrades heuristic/framework edges to warnings.
