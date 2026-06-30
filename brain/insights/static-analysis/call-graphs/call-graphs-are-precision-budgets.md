---
type: insight
title: "Call Graphs Are Precision Budgets"
slug: call-graphs-are-precision-budgets
created: 2026-06-30
status: working
publish: true
tags:
  - static analysis
feeds_into:
  - "[[polint]]"
related:
  - "[[static-analysis-engines-are-fact-pipelines]]"
---

# Call Graphs Are Precision Budgets

A call graph is a directed graph from caller to callee. In static analysis, it is rarely a
perfect truth. It is an approximation whose algorithm determines the precision budget for
every downstream analysis: reachability policies, taint tracking, dead-code detection,
effect summaries, and agent context selection.

## Why Call Graphs Are Hard

Direct calls are easy:

```go
refund()
```

Virtual calls, interface calls, higher-order functions, function literals, reflection,
dynamic imports, and framework callbacks are harder:

```go
var w Writer = auditWriter{}
w.Write(data)
```

The analyzer must decide which concrete method could be called. If it includes too many
targets, downstream rules produce false positives. If it misses targets, downstream rules
produce false negatives. This is why call graphs should be described with precision,
confidence, and known gaps.

## The CHA -> RTA -> VTA Ladder

SootUp's documentation gives a compact ladder:

| Algorithm | Information used | Resulting approximation |
| --- | --- | --- |
| CHA | Type hierarchy | Include all implementers/subtypes that could respond. |
| RTA | Type hierarchy + instantiated types | Exclude implementers never instantiated. |
| VTA | Instantiated types + assignment/points-to relationships | Exclude types that cannot flow to this receiver. |

CHA is the broad baseline. It asks: "given the declared receiver type, which methods exist
in the hierarchy?" RTA adds allocation facts: "which implementers are actually
instantiated?" VTA adds flow facts: "which instantiated values can be assigned to this
receiver?"

The ladder is a sequence of filters:

```text
candidate callees = hierarchy_targets(call_site)

if algorithm >= RTA:
  candidate callees = candidate callees where declaring type is instantiated

if algorithm >= VTA:
  candidate callees = candidate callees where value may flow to receiver
```

The higher rungs are more precise because they use more facts. They are also more expensive
because those facts must be computed and maintained.

## Go VTA Shows The Language-Specific Work

The Go `x/tools/go/callgraph/vta` package documents the same idea for Go. VTA builds a
global type propagation graph and propagates types and function literals through it. The
implementation has Go-specific nodes for nested pointers to interfaces and function literals
so it can infer higher-order function flow. For unresolved call sites, it uses the set of
types and functions reaching the call-site node to create callees.

The docs also state the soundness caveat: the result is sound modulo reflection and unsafe,
assuming the initial graph is sound. That caveat should appear in diagnostics or capability
reports. Reflection and unsafe are not edge cases in the type-theory sense; they are exact
places where the analysis contract changes.

## Call Graph Construction Pseudocode

```text
build_call_graph(program, entrypoints, mode):
  hierarchy = build_type_hierarchy(program)
  instantiated = {}
  points_to = {}
  graph = empty_graph()
  worklist = entrypoints

  while worklist not empty:
    fn = worklist.pop()

    if mode >= RTA:
      instantiated += allocation_types(fn)

    if mode >= VTA:
      points_to = propagate_assignments(points_to, fn)

    for call in calls_in(fn):
      targets = direct_targets(call)

      if call.is_dynamic:
        targets += hierarchy_targets(hierarchy, call.receiver_type)

      if mode >= RTA:
        targets = filter_by_instantiated(targets, instantiated)

      if mode >= VTA:
        targets = filter_by_receiver_flow(targets, points_to, call.receiver)

      for target in targets:
        if graph.add_edge(fn, target, provenance(call, mode)):
          worklist.push(target)

  return graph
```

This pseudocode is intentionally simplified. Real engines need method signatures,
overrides, generics, build tags, module resolution, external summaries, dynamic dispatch,
closures, and framework entrypoints. The useful part is the shape: call graph construction
is a fixed-point process once the set of reachable functions and instantiated types can grow.

## Provenance Matters

Every edge should know why it exists:

| Edge provenance | Example |
| --- | --- |
| Direct syntax | `handler()` call in `routes.go` |
| CHA | receiver declared as interface `Writer` |
| RTA | `auditWriter{}` allocated in reachable code |
| VTA | allocation flows through assignment to `w` |
| Framework model | Express route callback treated as entrypoint |
| Dynamic/unknown | reflection or unresolved import prevents proof |

Without provenance, a reachability diagnostic cannot explain whether the path is exact,
conservative, or heuristic.

## Practical Policy Use

Call graphs are valuable for repo-local policies:

| Policy | Required graph precision |
| --- | --- |
| "No production root reaches raw admin API" | Direct + conservative dynamic edges |
| "HTTP handlers must not call shell wrappers" | Entrypoints + call graph + data flow |
| "Tests may call fixture helpers; production may not" | Root classification + include/exclude tests |
| "Migration helper is no longer reachable" | Enough call edges to avoid false confidence |

For polint, the right public surface is not a raw `CallGraph<'_>` view. It is a bounded
policy query such as `Calls::forbidden_reachable(ReachQuery)`, with `max_depth`,
`max_paths`, precision filtering, and visible budget evidence.

## Edge Cases

| Edge case | Risk | Engine response |
| --- | --- | --- |
| Reflection / `unsafe` | Missed edges | Mark capability/precision gap. |
| Dynamic imports | Incomplete module graph | Emit unresolved/dynamic import facts. |
| Framework callbacks | Missing entrypoints | Add explicit framework models or local entrypoint config. |
| Tests and fixtures | False positives from test-only paths | Track root kind and `include_tests`. |
| Large SCCs | Slow reachability | Use budgets and surface truncation. |

The key is to avoid binary language like "reachable" when the graph is approximate. Say
"reachable under conservative direct/refined-call facts" or "unknown due to reflection" when
that is what the engine knows.

## Sources

- [SootUp call graph construction](https://soot-oss.github.io/SootUp/v1.1.2/call-graph-construction/)
- [Go `callgraph/vta` package](https://pkg.go.dev/golang.org/x/tools/go/callgraph/vta)
- [Scalable Propagation-Based Call Graph Construction Algorithms](http://web.cs.ucla.edu/~palsberg/paper/oopsla00.pdf)
- [The Complexity of Andersen's Analysis in Practice](https://manu.sridharan.net/files/sas2009.pdf)
- [polint calls facts](https://github.com/emilwareus/polint/blob/main/docs/facts/calls.md)

