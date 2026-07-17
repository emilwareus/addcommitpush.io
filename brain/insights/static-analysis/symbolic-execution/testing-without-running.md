---
type: insight
title: "Symbolic Execution Is Constraint-Guided Testing Without Concrete Inputs"
slug: testing-without-running
created: 2026-07-16
status: working
publish: true
tags:
  - static analysis
related:
  - "[[dataflow-analysis-as-fixed-point]]"
  - "[[soundness-vs-completeness]]"
  - "[[call-graphs-are-precision-budgets]]"
---

# Symbolic Execution Is Constraint-Guided Testing Without Concrete Inputs

Static analysis usually merges many executions into an abstract state. Symbolic execution takes the opposite route: it keeps a separate symbolic state for a path and asks a constraint solver which inputs can reach the next branch. The result is a collection of concrete test cases, crash witnesses, or proofs that a particular path is infeasible. It is therefore best understood as constraint-guided testing, not as a magical way to execute every possible program path.

## Key takeaways

- A symbolic state contains a program location, symbolic memory, and a path condition over symbolic inputs.
- A conditional forks a state only when both branch constraints are satisfiable; an SMT solver converts the surviving path into a concrete test input.
- Path explosion comes from the product of feasible branch choices, but solver cost, memory modeling, loops, and external environments are equally important.
- Concolic execution follows one concrete run while attaching symbolic expressions to the values observed on that run, then negates selected branches to generate neighboring tests.
- KLEE, SymCC, and angr share the core idea but operate at different layers: source/IR execution, compiler-instrumented native execution, and binary/IR analysis.

## The execution state

For a small imperative language, model a state as:

```text
S = (pc, σ, π, τ)

pc  program counter or IR instruction
σ   symbolic store: locations -> symbolic expressions
π   path condition: Boolean formula over symbolic inputs
τ   execution trace and side metadata
```

At program start, an input byte `x` is not assigned a concrete number. It is represented by a variable `X`, and the initial path condition is `true`:

```text
X = symbolic_byte("x")
π = true
```

If the program evaluates `if (x == 0)`, the executor constructs two successor states:

```text
then: π ∧ (X == 0)
else: π ∧ (X != 0)
```

The executor queries satisfiability before retaining either state. A model such as `X = 0` is a witness for the first path; a model such as `X = 1` is a witness for the second. The path condition is not merely a log of observed values: it is the logical description of every concrete input that follows that path under the executor's semantics.

### A concrete example

```c
int classify(unsigned char x, unsigned char y) {
    if (x == 0) {
        return y == 42 ? 1 : 2;
    }

    if ((unsigned)x * (unsigned)y == 0x100) {
        return 3;
    }

    return 4;
}
```

The path returning `3` has the condition:

```text
X != 0 ∧ X * Y = 256
```

For 8-bit inputs, one satisfying model is `X = 2, Y = 128`. A concrete fuzzer might take a long time to discover that multiplication relation; symbolic execution asks the solver for it directly. The executor must model the casts and the 32-bit multiplication correctly. Treating `X * Y` as unbounded mathematical integers would admit models that the C program cannot produce.

## From AST to symbolic instructions

Symbolic execution is normally performed after parsing and some lowering. The executor needs explicit control-flow successors and operations whose semantics it can encode. A typical pipeline is:

```mermaid
flowchart LR
    source[Source] --> frontend[Parser and type checker]
    frontend --> ir[IR or machine instructions]
    ir --> executor[Symbolic or concolic executor]
    executor --> constraints[Path constraints]
    constraints --> solver[SMT solver]
    solver --> tests[Concrete tests and witnesses]
```

An AST-level interpreter can work for a toy language, but mature systems lower to LLVM IR, an intermediate representation such as VEX, or a custom execution model. Lowering makes branches, arithmetic widths, loads, stores, calls, and exceptional exits explicit. It also shifts the hard problem from syntax to semantic coverage: the executor must faithfully model the selected IR and its runtime environment.

For a branch `br c, L_then, L_else`, a simplified transition is:

```text
execute_branch(S, c, L_then, L_else):
    value = eval(c, S.σ)
    true_state  = S with pc = L_then and π = S.π ∧ value
    false_state = S with pc = L_else and π = S.π ∧ ¬value

    return [state for state in [true_state, false_state]
            if SAT(state.π)]
```

The `eval` result may be a Boolean expression such as `X + 1 < Y`. If a branch condition is concrete, only one successor is produced. If the solver returns `unknown`, the executor has to honor its analysis contract: it may stop that state, model the operation conservatively, or use a configured approximation. Silently treating `unknown` as `unsat` would create a false claim that a path is unreachable.

## The core worklist algorithm

The scheduler determines which feasible state to explore next. Depth-first search is cheap and often reaches deep bugs quickly; breadth-first search gives a bounded-depth view; coverage-guided schedulers prioritize states likely to execute new edges. A generic executor looks like this:

```text
symbolically_execute(program, symbolic_inputs):
    initial = State(
        pc = program.entry,
        store = initialize_symbolic_store(symbolic_inputs),
        path_condition = true,
        trace = []
    )
    pending = PriorityQueue([initial])
    results = []

    while pending is not empty:
        state = pending.pop()

        if state.steps >= MAX_STEPS:
            results.append(Timeout(state))
            continue

        if state.pc is a terminal instruction:
            results.append(classify_terminal_state(state))
            continue

        successors = step(state)
        for successor in successors:
            answer = solver.check(successor.path_condition)

            if answer == SAT:
                pending.push(successor)
            elif answer == UNKNOWN:
                results.append(UnknownPath(successor))
            # UNSAT states are discarded: no concrete input can reach them.

    return results
```

The executor may query the solver at every branch, or defer queries and prune in batches. It may also cache `(path-condition, solver-context)` results, simplify formulas, and ask for a model only when a terminal event or test artifact is needed. The logical state and the scheduling state should stay separate: changing the scheduler must not change which paths are semantically feasible.

### A path tree, not one execution trace

For this program:

```c
void check(int x, int y) {
    if (x > 0) {
        if (y == 7) {
            abort();
        }
    }
}
```

The state tree is:

| State | Path condition | Event |
| --- | --- | --- |
| `S0` | `true` | entry |
| `S1` | `X > 0` | inner branch |
| `S2` | `X <= 0` | normal return |
| `S3` | `X > 0 ∧ Y = 7` | `abort` |
| `S4` | `X > 0 ∧ Y ≠ 7` | normal return |

The solver can produce `X = 1, Y = 7` for `S3`. A dynamic test runner then executes that concrete input to confirm the crash in the actual build. That final replay is valuable: it catches mismatches between the symbolic model and the deployed runtime, but it does not replace symbolic feasibility checking.

## Constraints, memory, and calls

The arithmetic in a path condition is only one part of the semantic model.

### Bit-precise values

Machine integers wrap, shift, truncate, and compare as signed or unsigned values. For example, an 8-bit addition should be encoded as:

```text
Z = (zero_extend_32(X) + zero_extend_32(Y)) mod 256
```

The exact encoding depends on the solver theory. A source-language executor that loses bit width can report impossible overflows or miss real ones. Floating point, NaNs, undefined behavior, vector instructions, and atomics require additional modeling choices.

### Symbolic memory

For a concrete array index, a load is straightforward:

```text
load(A, i) = A[i]
```

For a symbolic index, `I`, the executor may construct a read-over-write array expression, fork on possible aliases, or use a memory abstraction. Each choice trades solver size against precision. An array model can preserve the relation between writes and reads, while aggressive concretization can make execution faster but miss paths that depend on an unobserved index.

### Calls and environment boundaries

The executor must decide what `read`, `malloc`, threads, syscalls, files, clocks, network responses, and native libraries mean. A summary can expose only the relevant relation:

```text
read(fd, buf, n):
    for i in [0, n): buf[i] = fresh_byte("read_" + i)
    return fresh_int("bytes_read") with 0 <= result <= n
```

This is useful for finding input-driven bugs, but it is not a proof about a real filesystem. An unsound or overconstrained summary changes the set of explored paths. KLEE's environment modeling is one reason it could analyze utility programs that are difficult to treat as closed mathematical functions.

## KLEE, SymCC, and angr

| System | Execution layer | Main technique | Strength | Main boundary |
| --- | --- | --- | --- | --- |
| KLEE | LLVM bitcode | Explicit-state symbolic execution | Makes path conditions and test cases first-class; models POSIX-like environments | State and solver costs grow rapidly with branching and complex memory |
| SymCC | Compiler-instrumented native code | Compiler-based concolic execution | Reuses native execution and instruments only symbolic operations; often much faster | Concrete execution can miss paths until branch mutations explore them |
| angr | Binaries through IR and analyses | Symbolic execution plus static binary analysis | Works without source across architectures; supports CFG and memory analyses | Binary lifting, calling conventions, libraries, and path search need careful configuration |

KLEE's OSDI evaluation explored Coreutils and reported 56 serious bugs across 452 applications. SymCC's USENIX Security evaluation reported speedups of up to three orders of magnitude over KLEE in the tested workloads and confirmed vulnerabilities in OpenJPEG. These are workload-specific results, not universal rankings: the layer at which a tool executes, the available environment models, and the chosen search strategy dominate practical performance.

In angr, a minimal conceptual pattern is:

```python
import angr

project = angr.Project("./program", auto_load_libs=False)
state = project.factory.entry_state()
simulation = project.factory.simulation_manager(state)
simulation.explore(find=0x4011A6, avoid=0x4011C0)

if simulation.found:
    witness = simulation.found[0].posix.dumps(0)
```

The exact addresses and input model are binary-specific. `find` and `avoid` describe a search objective; they are not a proof that every other path was explored.

## Path explosion

If a program has `b` independent, feasible binary branches, a naive path search has up to `2^b` leaves. Loops add unbounded families of paths, and symbolic memory can multiply states again. The useful quantity is not syntactic branch count but the number and cost of feasible, semantically distinct states.

| Cause | Why it expands | Typical response | Precision risk |
| --- | --- | --- | --- |
| Independent branches | Each branch forks the state tree | Coverage-guided or random-path scheduling | Can postpone rare paths |
| Loops | Each iteration creates another path prefix | Loop bounds, state merging, summarization | Misses behaviors beyond bound |
| Symbolic pointers | Alias choices affect loads and stores | Array theory, alias constraints, concretization | Loses alias-dependent paths |
| Large string/byte inputs | Many comparisons generate long formulas | String theories, taint-guided slicing | Unsupported operations become opaque |
| Shared state and threads | Interleavings multiply paths | Partial-order reduction, schedules, summaries | May omit races or schedules |
| Environment calls | External state is unbounded | Models, replay, seeded files | Results depend on model fidelity |
| Solver-hard formulas | One query dominates runtime | Simplification, query caching, bit-blasting limits | Timeouts create unknown paths |

State merging replaces two states with one state containing an `ite` expression:

```text
S_then: X > 0,  V = 1
S_else: X <= 0, V = 2
merge:  true,   V = ite(X > 0, 1, 2)
```

This reduces scheduler pressure but moves the branch complexity into later expressions and may make solver queries harder. Merge only when the states have compatible control location, memory representation, and event semantics.

Loop handling must state its contract. A bound of ten iterations can find a bug reachable within ten iterations; it cannot establish safety after ten. An invariant or a sound abstract summary can cover all iterations, but then the technique has moved toward abstract interpretation rather than pure path enumeration.

## Concolic execution

Concolic, or concrete-plus-symbolic, execution runs a real input while recording symbolic expressions for values that depend on input. It then negates a branch in the recorded path and asks the solver for a new input.

```text
concolic_search(seed):
    input = seed
    seen = set()
    queue = [input]

    while queue is not empty:
        input = queue.pop()
        trace, symbolic_branches = run_concretely_with_expressions(input)

        for branch_index from last to first:
            prefix = symbolic_branches[0:branch_index]
            branch = symbolic_branches[branch_index]
            target = prefix ∧ ¬branch.taken_condition

            if (branch_index, target) in seen:
                continue
            seen.add((branch_index, target))

            if solver.check(target) == SAT:
                queue.push(solver.model_as_input(target))

    return all_replayed_inputs
```

Negating the last branch first gives depth-first exploration of adjacent paths. A coverage-guided variant scores mutations by new edges, rare branches, or distance to a target. DART and later concolic techniques demonstrated the practical value of combining concrete executions with symbolic constraints, especially when full symbolic memory or library modeling is too expensive.

Concolic execution inherits a subtle limitation: only operations observed in the concrete run necessarily acquire useful expressions. If a native library, indirect call, or data-dependent memory operation is concretized, branch negation may not be able to reach alternatives that depend on it. The test harness should report which bytes and branches remained symbolic rather than presenting coverage as semantic completeness.

## When symbolic execution finds what another analysis misses

Symbolic execution is particularly effective when a bug requires a conjunction of path conditions that a cheap, merged analysis cannot retain:

```c
int parse_header(const unsigned char *p) {
    if (p[0] != 'P' || p[1] != 'K') return 0;

    unsigned short length = ((unsigned short)p[2] << 8) | p[3];
    if (length == 0x1234 && p[length] == '!') {
        return vulnerable_read(p + 4, length);
    }
    return 0;
}
```

A path-insensitive range analysis may know that `length` is between `0` and `65535` but fail to connect the header bytes to `length` and the later dereference. A symbolic executor preserves:

```text
P0 = 'P' ∧ P1 = 'K'
∧ ((P2 << 8) | P3) = 0x1234
∧ P[0x1234] = '!'
```

and can construct a witness if the memory object is modeled as large enough. Conversely, a sound abstract interpreter may prove a broad safety property that symbolic execution cannot establish because it stopped at a loop bound. The techniques answer different questions: “show me an input for this path” versus “overapproximate all paths enough to prove this invariant.”

Symbolic execution is also useful on stripped binaries, where source-level rules and types are unavailable. The price is the quality of disassembly, calling-convention recovery, library summaries, and architecture semantics. An apparently precise path constraint over a wrong lifted instruction is still a wrong result.

## Reporting results honestly

A symbolic-execution result should distinguish at least four outcomes:

| Result | Meaning |
| --- | --- |
| Confirmed witness | A concrete input was generated and replayed to reproduce the event |
| Solver-proven infeasible | The current path condition is unsatisfiable under the encoded model |
| Explored without event | The state reached a terminal or configured boundary without the target |
| Inconclusive | Timeout, unsupported instruction, bound, missing model, or solver `unknown` prevented a conclusion |

“No crash found” is not “the program is safe.” It means no explored and modeled state produced the configured event. The distinction matters in CI: a timeout should not be silently converted into a green security result, and a model mismatch should be visible next to the witness.

## Production checklist

Before trusting a symbolic-execution campaign, record:

- the executable or IR hash, compiler flags, target architecture, and runtime model;
- symbolic input ranges, object sizes, loop and recursion bounds, and solver timeouts;
- unsupported operations and concretized values;
- path scheduler, state-merging policy, and coverage metric;
- whether every reported witness was replayed against the real artifact;
- whether results are claims about bug finding, reachability, or a bounded safety property.

The most robust workflow uses symbolic execution to generate high-value witnesses and targeted regressions, then feeds those tests into ordinary dynamic and static checks. It gives the path-sensitive engine a concrete feedback channel without pretending that enumerating a useful subset of paths is equivalent to analyzing the whole program.

## Sources

- [KLEE: Unassisted and Automatic Generation of High-Coverage Tests for Complex Systems Programs](https://www.usenix.org/legacy/events/osdi08/tech/full_papers/cadar/cadar_html/index.html) — symbolic states, search, environment models, and the Coreutils evaluation.
- [SymCC: Efficient Compiler-Based Symbolic Execution](https://www.usenix.org/conference/usenixsecurity20/presentation/poeplau) — compiler-based concolic execution and performance evaluation.
- [angr quickstart](https://api.angr.io/en/latest/quickstart.html) — binary loading, states, simulation managers, and target exploration.
- [angr symbolic execution concepts](https://api.angr.io/en/v9.2.112/core-concepts/symbolic.html) — symbolic values, constraints, and solver-backed states.
- [angr CFG analyses](https://api.angr.io/en/latest/analyses/cfg.html) — static and emulated CFG recovery in a binary-analysis toolkit.
- [DART: Directed Automated Random Testing](https://osl.cs.illinois.edu/publications/conf/hvc/Sen09.html) — the concolic testing model and path-directed input generation.
- [SMT-LIB](https://smt-lib.org/) — standard theories and interchange language for satisfiability modulo theories.
