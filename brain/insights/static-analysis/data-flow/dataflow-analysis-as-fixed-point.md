---
type: insight
title: "Dataflow Analysis As A Fixed Point"
slug: dataflow-analysis-as-fixed-point
created: 2026-07-16
status: working
publish: true
tags:
  - static analysis
related:
  - "[[data-flow-engines-are-fixed-point-machines]]"
  - "[[cfg-construction-and-traversal]]"
  - "[[soundness-vs-completeness]]"
---

# Dataflow Analysis As A Fixed Point

Dataflow analysis is the discipline of asking which abstract facts hold at program points and
then solving the resulting graph equations. The algorithmic center is simple: a transfer
function transforms facts through a node, a join or meet combines facts at a control-flow
merge, and a worklist repeats the equations until another pass changes nothing. The important
engineering decisions are the fact lattice, direction, may/must interpretation, boundary
conditions, and treatment of infinite ascending chains. The same fixed-point machine can power
reaching definitions, live variables, available expressions, taint tracking, resource-state
checking, and many interprocedural summaries.

## The dataflow equation

Let `G = (N, E, entry, exit)` be a CFG. A forward analysis stores `IN[n]` and `OUT[n]` for
each node:

```text
IN[entry] = boundary
IN[n]      = join(OUT[p] for p in predecessors(n))       if n != entry
OUT[n]     = transfer[n](IN[n])
```

A backward analysis reverses the dependency:

```text
OUT[exit] = boundary
OUT[n]    = join(IN[s] for s in successors(n))             if n != exit
IN[n]     = transfer[n](OUT[n])
```

The equations are recursive when the CFG has a loop. The `OUT` state of a loop body affects
the next iteration's `IN` state, which affects the body again. The analyzer is not simulating a
particular input. It is finding a stable solution for an abstract transition system.

## Lattices: the meaning of “combine”

A lattice gives the solver a partial order and operations for combining information. Use a
fact universe `U` for a simple powerset example. With the subset order:

- `bottom (⊥) = ∅` means no fact is known in a may analysis.
- `top (⊤) = U` means every fact remains possible.
- `join (⊔) = union` keeps facts true on at least one path.
- `meet (⊓) = intersection` keeps facts true on every path.

The names “bottom” and “top” are relative to the chosen order. A must analysis commonly starts
non-entry nodes at `U` and decreases them with intersection; the result is a greatest fixed
point in the subset ordering. A may analysis starts at `∅` and grows with union; the result is a
least fixed point. The semantic question determines the initialization, not the other way
around.

| Analysis question | Direction | Path merge | Typical initialization | Fact interpretation |
| --- | --- | --- | --- | --- |
| Which definitions may reach this use? | Forward | Union | `∅` at entry | At least one path carries the definition. |
| Which variables may be read later? | Backward | Union | `∅` at exit | At least one continuation reads the variable. |
| Which expressions are available on every path? | Forward | Intersection | `U` before non-entry nodes | Every path computed the expression without killing it. |
| Which locks are definitely held? | Forward | Intersection | Policy-specific top/bottom | Every path preserves the lock fact. |
| Which inputs can taint a value? | Forward | Union | Empty taint set | Any source path contributes a label. |

For a domain to support a useful solver, `transfer` and `join` should be monotone:

```text
a <= b  implies  transfer(a) <= transfer(b)
```

Adding input facts must not make a transfer function remove information in an unrelated way.
Monotonicity is what lets the iteration move consistently toward a fixed point rather than
oscillate.

## Fixed-point theory in practical terms

Collect all node states into one vector `X`. The dataflow equations define a monotone global
function `F` such that `F(X)` is one complete pass over the equations. A fixed point satisfies
`F(X) = X`.

[Kildall's 1973 framework](https://doi.org/10.1145/512927.512945) formalized a general graph
algorithm for global program optimization. [Cousot and Cousot's 1977 abstract-interpretation
framework](https://www.di.ens.fr/~cousot/COUSOTpapers/POPL77.shtml) places the same idea in a
semantic model: classical analyses compute program properties as limits of finite Kleene
sequences or approximations to those sequences.

The lattice theorem gives the implementation obligations:

```text
If L is a complete lattice and F : L -> L is monotone:
  F has a least fixed point and a greatest fixed point.

If the ascending (or descending) chain has finite height:
  X0 = bottom
  Xi+1 = F(Xi)
  reaches a fixed point after finitely many strict changes.

If transfer functions are distributive over the merge operation:
  the fixed-point solution matches the meet-over-all-feasible-paths result
  for the corresponding finite framework.
```

The last line is a precision theorem, not a termination theorem. A monotone but non-distributive
analysis can terminate and remain sound while losing information earlier than the ideal
meet-over-all-paths computation.

## The worklist solver

Recomputing every node on every round is easy to understand but wasteful. The worklist contains
only nodes whose input might have changed.

```text
solve_forward(cfg, lattice, boundary, transfer, join):
  IN  = map node -> lattice.bottom
  OUT = map node -> lattice.bottom

  IN[cfg.entry] = boundary
  worklist = [cfg.entry]

  while worklist is not empty:
    node = worklist.pop()
    old_out = OUT[node]
    OUT[node] = transfer[node](IN[node])

    if OUT[node] == old_out:
      continue

    for successor in cfg.successors(node):
      candidate = join(IN[successor], OUT[node])
      if candidate != IN[successor]:
        IN[successor] = candidate
        worklist.push(successor)

  return IN, OUT
```

The state and invariants are concrete:

| Item | Meaning |
| --- | --- |
| `IN[n]` | The current merge of propagated predecessor facts. |
| `OUT[n]` | The transfer of the current `IN[n]`. |
| `worklist` | Nodes whose successors may receive a new contribution. |
| Invariant | Every propagated contribution is included in the successor's current state. |
| State change | A join or transfer adds information in a may analysis, or removes information in a must analysis. |
| Termination | A finite-height lattice permits only finitely many strict changes per node. |
| Main cost | Number of node reprocessings multiplied by transfer and merge cost. |

For a bit-vector lattice with `B` facts and machine word width `w`, union and intersection
are `O(B / w)`. A conservative worklist envelope is `O(I * E * C)`, where `I` is the number
of effective iterations, `E` is the number of CFG edges, and `C` is the cost of a transfer and
merge. Reverse postorder often reduces `I` for reducible graphs, but it does not change the
fixed point.

## Reaching definitions: forward and may

For each assignment, create a definition ID. A definition `d` reaches a point if some path from
`d` to that point contains no later definition of the same variable.

For a block `n`:

```text
OUT[n] = GEN[n] union (IN[n] - KILL[n])
IN[n]  = union(OUT[p] for p in predecessors(n))
```

Worked example:

```text
entry:
  d1: x = 0
  if (flag) {
    d2: x = 1
  }
  use(x)
```

At the use, `{d1, d2}` reaches the read. `d1` survives the false branch and `d2` reaches via
the true branch. The analysis is intentionally a may result: it does not claim both
definitions execute on one path.

```text
compute_reaching_definitions(cfg):
  definitions = enumerate_assignments(cfg)

  for block in cfg.blocks:
    GEN[block] = definitions_created(block)
    KILL[block] = definitions_of_same_variables(definitions, GEN[block])
    IN[block] = empty_bitset()
    OUT[block] = empty_bitset()

  worklist = all_blocks(cfg)
  while worklist is not empty:
    block = worklist.pop()
    new_in = union(OUT[pred] for pred in block.predecessors)
    new_out = GEN[block] union (new_in - KILL[block])

    if new_in != IN[block] or new_out != OUT[block]:
      IN[block] = new_in
      OUT[block] = new_out
      worklist.add_all(block.successors)

  return IN, OUT
```

In SSA form, each use has a definition or PHI value directly, so a large portion of this dense
analysis becomes sparse def-use traversal. The semantic question has not disappeared; the IR
has made the answer cheaper to query.

## Live variables: backward and may

A variable is live before a statement when a future path may read it before a redefinition.
For a block:

```text
IN[n]  = USE[n] union (OUT[n] - DEF[n])
OUT[n] = union(IN[s] for s in successors(n))
```

```text
compute_live_variables(cfg):
  for block in cfg.blocks:
    USE[block] = reads_before_writes(block)
    DEF[block] = writes(block)
    IN[block] = empty_set()
    OUT[block] = empty_set()

  worklist = reverse_postorder(cfg)
  while worklist is not empty:
    block = worklist.pop()
    new_out = union(IN[succ] for succ in block.successors)
    new_in = USE[block] union (new_out - DEF[block])

    if new_in != IN[block] or new_out != OUT[block]:
      IN[block] = new_in
      OUT[block] = new_out
      worklist.add_all(block.predecessors)

  return IN, OUT
```

Live-variable facts drive register allocation and dead-store elimination, but they also make
useful policy evidence: a value that is live across a call, a lock, or a suspension point has a
different resource lifetime than a value that dies immediately.

## Available expressions: forward and must

An expression is available at a block only if every path to that block evaluated it and no
operand was redefined. This is a must problem:

```text
IN[entry] = empty_set
IN[n]     = intersection(OUT[p] for p in predecessors(n))
OUT[n]    = GEN[n] union (IN[n] - KILL[n])
```

Non-entry `IN` states start at the universe of candidate expressions and decrease. A tempting
but incorrect implementation starts them at `∅` and unions facts, which answers “available on
some path” rather than “available on every path.” The distinction is visible at a branch where
only one arm computes `x + y`.

## Convergence, widening, and narrowing

Bitsets and finite enums have finite height. Numeric intervals do not:

```text
while (x >= 0) {
  x = x + 1;
}
```

The interval sequence can grow from `[0, 0]` to `[0, 1]`, `[0, 2]`, and so on. A widening
operator accelerates an ascending chain by jumping to a safe limit:

```text
widen([l1, u1], [l2, u2]):
  lower = l1 if l2 >= l1 else -infinity
  upper = u1 if u2 <= u1 else +infinity
  return [lower, upper]
```

In a real analyzer, thresholds such as known constants, array bounds, or machine limits can
avoid jumping to infinity too early. Narrowing then tries to recover precision after the
widened invariant stabilizes:

```text
state = bottom
repeat until stable:
  candidate = transfer(state)
  state = widen(state, candidate)

repeat a bounded number of times:
  candidate = transfer(state)
  state = narrow(state, candidate)
```

The widening result must remain an over-approximation if the analysis is claiming soundness.
An arbitrary iteration limit is not widening: it is an incomplete computation. If a budget
expires, the engine should return `unknown` or a conservative top state rather than silently
reporting “clean.” Existing static-analysis infrastructure often hides this machinery behind
policy queries, but the public result still needs a precision or budget status.

## Common precision losses

| Loss | Mechanism | Mitigation |
| --- | --- | --- |
| Path merge | Facts from different branches join early | Path sensitivity, predicates, or relational domains. |
| Aliasing | Two names may refer to one memory location | Points-to analysis, MemorySSA, or conservative clobbers. |
| Calls | Callee effects are unknown or summarized coarsely | Context-sensitive summaries and library models. |
| Exceptions | Exceptional edges are omitted or over-approximated | Explicit exceptional CFG and cleanup modeling. |
| Infinite values | Domain cannot represent unbounded growth | Widening, thresholds, narrowing, or bounded domains. |
| Broken frontend | Parser or name resolution loses a construct | Capability facts and an explicit unknown status. |

The fixed point is only as meaningful as the graph, domain, and transfer functions it solves.
An analyzer can prove that its equations reached a stable state while still being wrong about
the program because the abstraction omitted a language feature.

## Sources

- [Kildall, “A unified approach to global program optimization”](https://doi.org/10.1145/512927.512945)
- [Cousot and Cousot, “Abstract interpretation”](https://www.di.ens.fr/~cousot/COUSOTpapers/POPL77.shtml)
- [Kildall-style lattice framework notes](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/DATAFLOW-AUX/lattice.html)
- [Abstract interpretation and fixed points](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/10.ABSTRACT-INTERPRETATION.html)
- [MLIR data-flow analysis tutorial](https://mlir.llvm.org/docs/Tutorials/DataFlowAnalysis/)
- [LLVM MemorySSA](https://llvm.org/docs/MemorySSA.html)
- [Existing fixed-point engine note](../data-flow/data-flow-engines-are-fixed-point-machines.md)
