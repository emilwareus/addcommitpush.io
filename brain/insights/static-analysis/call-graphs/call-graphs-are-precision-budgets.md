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

## Direct Calls Are A Baseline, Not A Call Graph

The simplest call graph only records syntactically named callees.

```text
build_direct_call_graph(program):
  graph = new_graph()

  for function in program.functions:
    for call in function.calls:
      if call.target_is_known_by_syntax:
        graph.add_edge(
          caller=function,
          callee=resolve_named_target(call),
          provenance="direct"
        )

  return graph
```

That graph is cheap and exact for direct calls, but it is incomplete for most modern
programs. Interface dispatch, trait objects, class methods, closures, higher-order
functions, dependency injection, route tables, reflection, async callbacks, and dynamic
imports all create call edges that are not visible as one syntactic name.

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

## CHA: Type-Hierarchy Overapproximation

Class hierarchy analysis asks: given the declared receiver type, which concrete methods in
the subtype hierarchy could implement this call? It does not require knowing whether those
types are ever allocated.

```text
build_cha(program, entrypoints):
  hierarchy = build_type_hierarchy(program)
  graph = new_graph()
  reachable = set(entrypoints)
  worklist = list(entrypoints)

  while worklist not empty:
    function = worklist.pop()

    for call in function.calls:
      if call.is_direct:
        targets = {resolve_direct(call)}
      else:
        targets = dispatch_targets(
          hierarchy,
          receiver_static_type=call.receiver_type,
          method_name=call.method_name,
          signature=call.signature
        )

      for target in targets:
        if graph.add_edge(function, target, provenance="CHA"):
          if target not in reachable:
            reachable.add(target)
            worklist.push(target)

  return graph
```

CHA's strength is sound conservative coverage under a closed-world type hierarchy. Its
weakness is obvious: if an interface has 30 implementers and one receiver can only hold one
of them, CHA still adds all 30 unless another filter removes them.

## RTA: Only Instantiated Types Can Dispatch

Rapid type analysis refines CHA by maintaining the set of allocation types seen in reachable
code. A virtual target is kept only if the declaring/receiver type is compatible with an
instantiated type.

```text
build_rta(program, entrypoints):
  hierarchy = build_type_hierarchy(program)
  instantiated = empty_set()
  graph = new_graph()
  reachable = set(entrypoints)
  worklist = list(entrypoints)

  while worklist not empty:
    function = worklist.pop()

    for allocation in allocations_in(function):
      if instantiated.add(allocation.type):
        // A newly instantiated type can make old virtual calls reachable.
        worklist.add_all(reachable)

    for call in function.calls:
      if call.is_direct:
        targets = {resolve_direct(call)}
      else:
        targets = dispatch_targets(hierarchy, call.receiver_type, call.method_name)
        targets = {
          target for target in targets
          if exists type in instantiated:
            type_can_dispatch_to(type, target)
        }

      for target in targets:
        if graph.add_edge(function, target, provenance="RTA"):
          if reachable.add(target):
            worklist.push(target)

  return graph
```

RTA is still whole-program and still approximate. It does not know whether the specific
receiver at a call site can receive a type. It only knows that the type appears somewhere in
reachable code.

## VTA: Propagate Types Through Variables

Variable type analysis adds a type-propagation graph. Allocation sites introduce type
labels. Assignments, parameter passing, returns, field stores/loads, and closure captures
move those labels. A dynamic call uses labels reaching its receiver to pick targets.

```text
build_vta(program, entrypoints):
  type_graph = new_graph()
  labels = map node -> set()

  for function in reachable_by_direct_or_seed(program, entrypoints):
    for allocation in allocations_in(function):
      labels[node_for(allocation.result)].add(allocation.type)

    for assignment in assignments_in(function):
      type_graph.add_edge(node_for(assignment.source), node_for(assignment.target))

    for call in calls_in(function):
      add_parameter_return_edges(type_graph, call)
      if call.is_function_value_call:
        add_function_literal_edges(type_graph, call)

  changed = true
  while changed:
    changed = false
    for edge in type_graph.edges:
      if labels[edge.to].add_all(labels[edge.from]):
        changed = true

  graph = new_graph()
  for function in program.functions:
    for call in calls_in(function):
      if call.is_direct:
        graph.add_edge(function, resolve_direct(call), provenance="direct")
      else:
        for type in labels[node_for(call.receiver)]:
          for target in dispatch_targets_for_runtime_type(type, call):
            graph.add_edge(function, target, provenance="VTA", evidence=type)

  return graph
```

Go's VTA package uses this shape: build a global type-propagation graph, propagate types and
function literals, then create callees for unresolved call sites from the labels reaching
those nodes. Its documented caveat is also exactly the right diagnostic language: sound
modulo reflection and `unsafe`, assuming the initial graph is sound.

## Points-To Analysis Is The More General Version

VTA propagates type labels. Points-to analysis propagates abstract object identities:
allocation sites, heap objects, functions, closures, or summary objects. Dynamic dispatch
then asks which objects a receiver may point to.

A simple inclusion-based Andersen-style analysis can be written as constraints:

```text
collect_constraints(program):
  for statement in program:
    if statement is x = new T:
      add_constraint(address_of(allocation_site(statement)) subset pts[x])

    if statement is x = y:
      add_constraint(pts[y] subset pts[x])

    if statement is x = *y:
      add_constraint(for each object o in pts[y]: pts[o] subset pts[x])

    if statement is *x = y:
      add_constraint(for each object o in pts[x]: pts[y] subset pts[o])

solve_points_to(constraints):
  points_to = map variable_or_object -> set()
  worklist = constraints

  while worklist not empty:
    constraint = worklist.pop()
    delta = apply_constraint(points_to, constraint)

    if delta is not empty:
      for dependent in constraints_depending_on(constraint.target):
        worklist.push(dependent)

  return points_to
```

Steensgaard-style analysis is faster because it unifies points-to sets instead of maintaining
inclusion constraints:

```text
unify_points_to(x, y):
  root_x = find(x)
  root_y = find(y)
  if root_x != root_y:
    union(root_x, root_y)
    union(points_to[root_x], points_to[root_y])
```

The trade-off is precision. Inclusion constraints can represent `pts[y] subset pts[x]`
without making `x` and `y` identical. Unification often collapses distinct objects into one
equivalence class. That speed/precision trade-off then flows directly into call graph
quality and data-flow noise.

| Algorithm family | Core approximation | Typical effect |
| --- | --- | --- |
| CHA | All subtype implementers are possible. | Fast, conservative, many dynamic edges. |
| RTA | Only reachable allocated types are possible. | Less noise, still call-site-insensitive. |
| VTA | Types flow through assignments and calls. | More precise receivers, needs propagation graph. |
| Andersen-style points-to | Points-to sets are inclusion constraints. | More precise, can be expensive. |
| Steensgaard-style points-to | Assignments unify abstract locations. | Very fast, coarser aliases. |

## Datalog Encoding Of Call Graphs

Whole-program call graph construction maps naturally to Datalog. The rule engine derives
`ReachableMethod`, `InstantiatedType`, and `CallEdge` until no new facts appear.

```text
ReachableMethod(entry) :-
  EntryPoint(entry).

InstantiatedType(type) :-
  ReachableMethod(method),
  Alloc(method, _, type).

CallEdge(caller, callee) :-
  ReachableMethod(caller),
  DirectCall(caller, _, callee).

CallEdge(caller, callee) :-
  ReachableMethod(caller),
  VirtualCall(caller, callSite, receiverStaticType, methodName),
  InstantiatedType(runtimeType),
  Subtype(runtimeType, receiverStaticType),
  Dispatch(runtimeType, methodName, callee).

ReachableMethod(callee) :-
  CallEdge(_, callee).
```

Adding VTA means replacing the global `InstantiatedType` filter with a relation such as
`TypeFlowsTo(valueNode, runtimeType)` and using the receiver node at each virtual call.
Datalog does not remove the modeling problem. It makes the fixed-point dependencies
explicit.

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
- [Doop framework](https://github.com/plast-lab/doop)
- [Souffle examples](https://souffle-lang.github.io/examples)
- [polint calls facts](https://github.com/emilwareus/polint/blob/main/docs/facts/calls.md)
