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

The algorithm is not "run CHA, then filter once." It is a fixed point over two mutually
dependent sets:

| Set | Meaning |
| --- | --- |
| `ReachableMethods` | Methods whose bodies must be scanned. |
| `InstantiatedTypes` | Concrete classes/types allocated in reachable methods. |
| `SeenVirtualCalls` | Virtual call sites discovered while scanning reachable methods. |
| `CallEdges` | Caller -> callee edges justified by direct calls or dispatch over instantiated types. |

New reachable methods can allocate new types. New types can make previously seen virtual
calls resolve to new methods. Those new methods can allocate more types. That is the loop.

Formally, RTA computes the least fixed point of two monotone sets:

```text
R = reachable methods
S = instantiated runtime classes/types

Seed:
  EntryPoints subset R

Rules:
  if m in R and DirectCall(m, c), then c in R

  if m in R and Alloc(m, T), then T in S

  if m in R
     and VirtualCall(m, site, staticType, sig)
     and T in S
     and T <: staticType
     and Dispatch(T, sig) = c,
  then Edge(m, site, c) and c in R
```

This is the implementation reason RTA needs both a method worklist and a type worklist. A
new method can add a new allocation type. A new allocation type can add targets for old
virtual call sites. Those targets are methods, so the loop continues until neither `R` nor
`S` grows.

```text
Algorithm RTA(P, EntryPoints)
Input:
  P = program with methods, allocation sites, and call sites
  EntryPoints = roots such as main, tests, exported handlers, framework callbacks
Output:
  CallEdges = over-approximated caller -> callee relation

State:
  ReachableMethods = EntryPoints
  InstantiatedTypes = empty set
  SeenVirtualCalls = empty set
  CallEdges = empty set
  MethodWorklist = EntryPoints
  TypeWorklist = empty queue

while MethodWorklist is not empty or TypeWorklist is not empty:
  while MethodWorklist is not empty:
    m = MethodWorklist.pop()

    for allocation in allocations(m):
      c = allocation.concrete_type
      if c not in InstantiatedTypes:
        InstantiatedTypes.add(c)
        TypeWorklist.push(c)

    for call in call_sites(m):
      if call.kind == direct:
        target = resolve_direct(call)
        add_edge_and_reach(m, target)

      if call.kind == virtual:
        SeenVirtualCalls.add((m, call))
        for c in InstantiatedTypes:
          if compatible(c, call.receiver_static_type):
            target = dispatch(c, call.signature)
            if target exists:
              add_edge_and_reach(m, target)

  while TypeWorklist is not empty:
    c = TypeWorklist.pop()

    for (caller, call) in SeenVirtualCalls:
      if compatible(c, call.receiver_static_type):
        target = dispatch(c, call.signature)
        if target exists:
          add_edge_and_reach(caller, target)

procedure add_edge_and_reach(caller, callee):
  if (caller, callee) not in CallEdges:
    CallEdges.add((caller, callee))
  if callee not in ReachableMethods:
    ReachableMethods.add(callee)
    MethodWorklist.push(callee)

return CallEdges
```

RTA is still whole-program and still approximate. It does not know whether the specific
receiver at a call site can receive a type. It only knows that the type appears somewhere in
reachable code.

### RTA Helper Functions

```text
compatible(concrete_type, static_receiver_type):
  return concrete_type == static_receiver_type
      or concrete_type is subtype of static_receiver_type
      or concrete_type implements static_receiver_type

dispatch(concrete_type, signature):
  current = concrete_type
  while current exists:
    if current declares method with signature:
      return current.method(signature)
    current = current.superclass
  return null
```

The important implementation detail is `TypeWorklist`. Without it, the algorithm can miss
edges when a virtual call site is discovered before the relevant allocation type. With it,
every newly instantiated type is tested against every virtual call site already seen.

### RTA Worked Example

```text
interface Writer { write(s) }
class AuditWriter implements Writer { write(s) { log(s) } }
class NullWriter implements Writer { write(s) { } }

main:
  w = new AuditWriter()
  send(w)

send(Writer w):
  w.write("ok")
```

Step by step:

| Step | New reachable method | New instantiated type | New edge |
| --- | --- | --- | --- |
| seed | `main` | none | none |
| scan `main` | `send` | `AuditWriter` | `main -> send` |
| process `AuditWriter` | none yet | none | none |
| scan `send` | `AuditWriter.write` | none | `send -> AuditWriter.write` |

CHA would include `send -> AuditWriter.write` and `send -> NullWriter.write` because both
types implement `Writer`. RTA excludes `NullWriter.write` because no reachable allocation
creates `NullWriter`.

Now change `main`:

```text
main:
  if flag:
    unused = new NullWriter()
  w = new AuditWriter()
  send(w)
```

RTA now includes `send -> NullWriter.write`, even if `unused` never flows to `w`, because RTA
is allocation-sensitive but not variable-flow-sensitive. VTA or points-to analysis is needed
to remove that edge.

### RTA Invariant And Cost

The invariant is:

```text
For every virtual call site in SeenVirtualCalls and every type in InstantiatedTypes,
CallEdges contains the dispatch target if the type is compatible with the receiver.
```

Naive RTA cost is roughly:

```text
O(method bodies scanned + allocation sites + direct calls
  + |SeenVirtualCalls| * |InstantiatedTypes| * dispatch_cost)
```

Production implementations index virtual call sites by receiver static type and method
signature so a new instantiated type only revisits compatible call-site buckets.

### RTA As A Cross-Product Engine

The Go `callgraph/rta` docs describe a useful implementation perspective: RTA crosses newly
discovered runtime types with known invoke-mode call sites, and newly address-taken
functions with known dynamic function calls. The fixed point grows from both sides of each
cross-product.

```text
Algorithm RTA_CROSS_PRODUCT(P, roots)
State:
  R = set(roots)
  RuntimeTypes = empty set
  AddressTakenBySignature = map signature -> set(function)
  DynamicFunctionCalls = empty list
  InterfaceInvokeSites = empty list
  Work = queue(roots)

procedure add_reachable(fn):
  if fn not in R:
    R.add(fn)
    Work.push(fn)

procedure add_runtime_type(T):
  if RuntimeTypes.add(T):
    for site in InterfaceInvokeSites:
      resolve_interface_site_with_type(site, T)

procedure add_interface_site(site):
  InterfaceInvokeSites.append(site)
  for T in RuntimeTypes:
    resolve_interface_site_with_type(site, T)

procedure resolve_interface_site_with_type(site, T):
  if compatible(T, site.static_receiver_type):
    target = dispatch(T, site.signature)
    if target exists:
      emit Edge(site.caller, site, target, reason="RTA-interface")
      add_reachable(target)

procedure add_address_taken_function(g):
  if AddressTakenBySignature[g.signature].add(g):
    for site in DynamicFunctionCalls:
      if site.signature == g.signature:
        emit Edge(site.caller, site, g, reason="RTA-function-value")
        add_reachable(g)

while Work not empty:
  fn = Work.pop()

  for event in scan(fn):
    match event:
      StaticCall(target):
        emit Edge(fn, event.site, target, reason="direct")
        add_reachable(target)

      Allocation(T) or MakeInterface(T):
        add_runtime_type(T)

      AddressTaken(function g):
        add_address_taken_function(g)

      DynamicFunctionCall(site):
        DynamicFunctionCalls.append(site)
        for g in AddressTakenBySignature[site.signature]:
          emit Edge(fn, site, g, reason="RTA-function-value")
          add_reachable(g)

      InterfaceInvoke(site):
        add_interface_site(site)

return R, RuntimeTypes, Edges
```

This version makes the non-order-dependence explicit. If a call site is discovered first,
the later runtime type resolves it. If the runtime type is discovered first, the later call
site is resolved immediately. The same pattern applies to address-taken functions and
function-value calls.

## VTA: Propagate Types Through Variables

Variable type analysis adds a type-propagation graph. Allocation sites introduce type
labels. Assignments, parameter passing, returns, field stores/loads, and closure captures
move those labels. A dynamic call uses labels reaching its receiver to pick targets.

The formal difference from RTA is that RTA has one global set `InstantiatedTypes`, while VTA
has many local `TypeOf(node)` sets.

```text
Node = variables, fields, returns, parameters, function literals, aggregate summary nodes

Initial labels:
  TypeOf(v) contains T       if v is the result of new T
  TypeOf(fnode) contains f   if fnode denotes function literal f

Flow constraints:
  TypeOf(dst) includes TypeOf(src)         for assignment src -> dst
  TypeOf(formal) includes TypeOf(actual)   for parameter passing
  TypeOf(callResult) includes TypeOf(ret)  for return flow
  TypeOf(field[T.f]) includes TypeOf(v)    for store receiver.f = v
  TypeOf(loadResult) includes TypeOf(field[T.f]) for load receiver.f

Dynamic dispatch:
  if VirtualCall(site, receiverNode, sig)
     and T in TypeOf(receiverNode)
     and Dispatch(T, sig) = target,
  then Edge(site.caller, site, target).
```

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

An inclusion-based, flow-insensitive Andersen-style analysis can be specified by
constraints:

| Program statement | Constraint |
| --- | --- |
| `x = &o` or `x = new T` | `{o} subset pts(x)` |
| `x = y` | `pts(y) subset pts(x)` |
| `x = *y` | for each `o in pts(y)`: `pts(o) subset pts(x)` |
| `*x = y` | for each `o in pts(x)`: `pts(y) subset pts(o)` |
| `x = y.f` field-sensitive | for each `o in pts(y)`: `pts(o.f) subset pts(x)` |
| `x.f = y` field-sensitive | for each `o in pts(x)`: `pts(y) subset pts(o.f)` |

A finite abstract heap makes this terminate: each pair `(variable_or_location, object)` can
be added at most once. The precision question is the heap abstraction: one object per
allocation site, per type, per context, per allocation-site/context pair, or some bounded
summary for containers and unknown libraries.

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

Steensgaard's unification-based analysis is the canonical speed endpoint: linear space and
almost-linear time in the size of the input constraints. The cost is coarser equivalence
classes. After unification, future information about either representative becomes
information about both.

| Algorithm family | Core approximation | Typical effect |
| --- | --- | --- |
| CHA | All subtype implementers are possible. | Fast, conservative, many dynamic edges. |
| RTA | Only reachable allocated types are possible. | Less noise, still call-site-insensitive. |
| VTA | Types flow through assignments and calls. | More precise receivers, needs propagation graph. |
| Andersen-style points-to | Points-to sets are inclusion constraints. | More precise, can be expensive. |
| Steensgaard-style points-to | Assignments unify abstract locations. | Very fast, coarser aliases. |

## Context Sensitivity Is A Second Precision Budget

Context-insensitive analysis has one abstract state per function or variable.
Context-sensitive analysis qualifies facts with an abstract calling context.

```text
Context-insensitive:
  pts(var) = {objects from all callers}

Call-string sensitivity:
  pts(var, last_k_call_sites)

Object sensitivity:
  pts(var, last_k_receiver_allocation_sites)

Type sensitivity:
  pts(var, last_k_receiver_types)
```

Call-string sensitivity is natural for procedural and higher-order flow. Object sensitivity
is often stronger for object-oriented dispatch because receiver allocation sites explain
method behavior better than caller sites. Type sensitivity is cheaper because it collapses
allocation sites of the same type.

Call graph extraction then becomes context-qualified:

```text
for each virtual call site site in caller context ctx:
  for object o in pts(receiver(site), ctx):
    target = dispatch(type(o), signature(site))
    callee_ctx = next_context(policy, ctx, site, o)
    emit Edge((caller, ctx), site, (target, callee_ctx))
```

The cost driver is no longer just source methods or call sites. It is the number of
reachable `(method, context)` pairs and context-qualified points-to facts.

## Hard Data: Size Is Not Precision

Empirical call-graph data is awkward because "the call graph" depends on the language
frontend, benchmark inputs, entrypoints, reflection model, library model, and dynamic
baseline. Still, several measurements are useful calibration points.

| Source | Measurement | Interpretation caveat |
| --- | --- | --- |
| Tip/Palsberg OOPSLA 2000 propagation-based algorithms | Algorithms between RTA and 0-CFA scaled to a 325 KLOC Java program; the most precise variants removed up to 29.0% of call edges versus RTA, with 7.2% average edge reduction; reachable method bodies fell only up to 3.0%, 1.6% average. | Edge count can improve more than reachable-method count; cost rose for more precise variants. |
| Tip/Palsberg OOPSLA 2000 XTA | XTA made up to 26.3% of RTA-polymorphic virtual call sites monomorphic, 12.5% average; reported up to 8.3x slowdown versus RTA. | More precision can be visible at call sites even when reachable-method count barely changes. |
| Steensgaard POPL 1996 | Unification-based points-to analysis has almost-linear time and linear-space behavior; reported practical runs include roughly 75 KLOC C in about 27 seconds and 127 K non-empty LOC for Emacs in about 50 seconds. | Very fast because assignments collapse equivalence classes; not comparable in precision to inclusion-based analyses. |
| Doop OOPSLA 2009 | Datalog implementation reported 16.3x average speedup over Paddle for 1-call-site-sensitive DaCapo analysis and 15x for 1-object-sensitive analysis. | Same logical analysis can have very different cost depending on relation representation and engine. |
| "Total Recall?" ISSTA 2024 | On Batik, reported CHA method precision and edge precision diverged sharply: OPAL CHA had 7.3% method precision and 0.9% edge precision; WALA CHA had 9.0% method precision and 0.8% edge precision. | Reachable-method count and edge count measure different failure modes; algorithm name is not a precision guarantee. |

The practical conclusion is not "always choose the most precise call graph." It is: choose
the weakest graph that can support the policy's recall/precision posture, and expose the
precision tier in the diagnostic. A rule that blocks releases on production reachability
needs a different graph contract than a review-only architectural smell.

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

The same schema can express multiple analysis modes. They should not all be enabled as one
analysis; CHA, RTA, and VTA are alternative rule families over shared input facts.

```text
// Inputs
EntryPoint(method)
DirectCall(caller, site, callee)
VirtualCall(caller, site, receiverVar, staticType, signature)
Alloc(method, heapObject, type)
AllocResult(heapObject, variable)
Subtype(childType, parentType)
Dispatch(runtimeType, signature, callee)
Assign(sourceVar, targetVar)
Formal(callee, index, formalVar)
Actual(site, index, actualVar)
ReturnVar(callee, returnVar)
CallResult(site, resultVar)

// Shared reachability skeleton
Reachable(method) :-
  EntryPoint(method).

CallEdge(caller, site, callee, "direct") :-
  Reachable(caller),
  DirectCall(caller, site, callee).

Reachable(callee) :-
  CallEdge(_, _, callee, _).

// CHA mode
CallEdge(caller, site, callee, "CHA") :-
  Reachable(caller),
  VirtualCall(caller, site, _, staticType, sig),
  Subtype(runtimeType, staticType),
  Dispatch(runtimeType, sig, callee).

// RTA mode
InstantiatedType(type) :-
  Reachable(method),
  Alloc(method, _, type).

CallEdge(caller, site, callee, "RTA") :-
  Reachable(caller),
  VirtualCall(caller, site, _, staticType, sig),
  InstantiatedType(runtimeType),
  Subtype(runtimeType, staticType),
  Dispatch(runtimeType, sig, callee).

// VTA-style type propagation
VarType(variable, type) :-
  Reachable(method),
  Alloc(method, heap, type),
  AllocResult(heap, variable).

VarType(dst, type) :-
  Assign(src, dst),
  VarType(src, type).

VarType(formal, type) :-
  CallEdge(_, site, callee, _),
  Actual(site, i, actual),
  Formal(callee, i, formal),
  VarType(actual, type).

VarType(result, type) :-
  CallEdge(_, site, callee, _),
  ReturnVar(callee, ret),
  CallResult(site, result),
  VarType(ret, type).

CallEdge(caller, site, callee, "VTA") :-
  Reachable(caller),
  VirtualCall(caller, site, receiver, _, sig),
  VarType(receiver, runtimeType),
  Dispatch(runtimeType, sig, callee).
```

A production Datalog engine still needs indexes, delta evaluation, provenance, and context
columns. The rules show the semantics; the evaluator determines whether those semantics are
fast enough on a real repository.

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
- [Go `callgraph/rta` package](https://pkg.go.dev/golang.org/x/tools/go/callgraph/rta)
- [Go `callgraph/vta` package](https://pkg.go.dev/golang.org/x/tools/go/callgraph/vta)
- [Scalable Propagation-Based Call Graph Construction Algorithms](http://web.cs.ucla.edu/~palsberg/paper/oopsla00.pdf)
- [Fast Static Analysis of C++ Virtual Function Calls](https://web.cs.ucla.edu/~palsberg/tba/papers/bacon-sweeney-oopsla96.pdf)
- [Practical Virtual Method Call Resolution for Java](https://web.cs.ucla.edu/~palsberg/tba/papers/sundaresan-et-al-oopsla00.pdf)
- [The Complexity of Andersen's Analysis in Practice](https://manu.sridharan.net/files/sas2009.pdf)
- [Program Analysis and Specialization for the C Programming Language](https://www.cs.cornell.edu/courses/cs711/2005fa/papers/andersen-thesis94.pdf)
- [Points-to Analysis in Almost Linear Time](https://www.cs.cornell.edu/courses/cs711/2005fa/papers/steensgaard-popl96.pdf)
- [Pick Your Contexts Well: Understanding Object-Sensitivity](https://yanniss.github.io/typesens-popl11.pdf)
- [Strictly Declarative Specification of Sophisticated Points-to Analyses](https://yanniss.github.io/doop-datalog2.0.pdf)
- [Total Recall? How Good Are Static Call Graphs Really?](https://www.opal-project.de/articles/TotalRecall%40ISSTA24.pdf)
- [Doop framework](https://github.com/plast-lab/doop)
- [Souffle examples](https://souffle-lang.github.io/examples)
- [polint calls facts](https://github.com/emilwareus/polint/blob/main/docs/facts/calls.md)
