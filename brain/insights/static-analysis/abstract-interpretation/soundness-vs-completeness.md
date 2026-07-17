---
type: insight
title: "Soundness Vs Completeness"
slug: soundness-vs-completeness
created: 2026-07-16
status: working
publish: true
tags:
  - static analysis
related:
  - "[[dataflow-analysis-as-fixed-point]]"
  - "[[types-as-static-analysis]]"
  - "[[testing-without-running]]"
---

# Soundness Vs Completeness

Abstract interpretation gives static analysis a precise vocabulary for approximation. The
analyzer computes a model of all behaviors, but in a finite abstract domain rather than by
enumerating concrete executions. Soundness means the model does not omit behavior relevant to
the claimed property; completeness means the abstraction loses no relevant precision. The two
are independent: a sound analysis may report many false alarms, and a precise-looking analysis
may miss bugs if it omits paths, language features, or environment behavior. Production tools
spend their budget choosing which guarantees to preserve, which domains to combine, and where
to return “unknown.”

## Start with the property, not the adjective

“Sound” is overloaded. In a static verifier, the usual statement is:

```text
concrete behaviors(P) ⊆ concretize(abstract_result(P))
```

If the abstract result is disjoint from the bad states, then no modeled concrete execution
reaches a bad state. This is the sense in which [Cousot describes abstract interpretation as
an over-approximation of program semantics](https://www.di.ens.fr/~cousot/AI/IntroAbsInt.html).

For a safety analyzer:

- a sound over-approximation may invent a path and report a false alarm;
- it must not omit a real path that reaches the checked error class;
- “no alarm” is a proof only under the analyzer's language, library, environment, and numeric
  semantics assumptions.

The sentence “if the analyzer says no bug, there is no bug” is therefore useful shorthand but
not a universal truth. It means “there is no bug in the specified property under the modeled
semantics, assuming the implementation and models satisfy their soundness proof.” A linter
that checks one rule, a type checker that checks type safety, and Astrée checking C runtime
errors each have a different property boundary.

## Concrete and abstract semantics

Let `C` be a concrete domain of sets of program states or execution traces, ordered by subset.
Let `A` be an abstract domain such as intervals, signs, lock sets, ownership states, or
predicates. The concretization function `γ : A -> C` says which concrete states an abstract
value represents. An interval `[0, 10]` denotes every integer from 0 through 10; `⊤` denotes
all values; `⊥` denotes no states.

An abstraction function `α : C -> A` summarizes concrete sets. For intervals, it is the least
interval containing the set when such an interval is representable. For example:

```text
α({2, 3, 7}) = [2, 7]
γ([2, 7]) = {2, 3, 4, 5, 6, 7}
```

The interval abstraction forgets holes. That is a deliberate precision loss, not a parser bug.
The pair forms a Galois connection when:

```text
α(c) <= a  iff  c ⊆ γ(a)
```

and therefore:

```text
α(γ(a)) <= a
```

The first relationship says `α(c)` is no more abstract than `a` exactly when `a` includes all
of `c`. [A worked sign-domain derivation](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/10.ABSTRACT-INTERPRETATION.html)
shows the same construction with `neg`, `zero`, `pos`, and `num`. A Galois insertion adds the
stronger property `α(γ(a)) = a`, meaning every abstract value is canonical rather than
redundantly representable.

## Sound abstract transfer functions

For a concrete statement transformer `f : C -> C`, an abstract transformer `f# : A -> A` is
sound when:

```text
f(c) ⊆ γ(f#(α(c)))
```

The abstract interpreter applies `f#` instead of executing `f` on every concrete state. For
interval addition:

```text
add([l1, u1], [l2, u2]) = [l1 + l2, u1 + u2]
```

For division, a sound implementation must return `⊤` or an alarm-capable result if the
denominator interval includes zero. A tempting optimization that simply ignores a zero
possibility is an unsound transfer function.

Soundness is compositional. If each expression transfer is sound, each branch transformer is
sound, and the merge operation includes all successor states, the fixed point over the CFG is a
sound over-approximation of the program's reachable states. This is why proof obligations are
attached to domains and library models, not only to the final diagnostic renderer.

## Completeness has several meanings

Completeness is more precise than “find every bug.” In abstract interpretation it commonly
means that an abstract transformer or domain loses no information relevant to a concrete
operation:

```text
f#(α(c)) = α(f(c))
```

for the operation and domain under discussion. Fixpoint completeness asks whether the abstract
fixed point is exactly the abstraction of the concrete fixed point. A tool can be sound but
incomplete because it introduces spurious states or cannot express a relation.

| Claim | What it actually says | Typical failure |
| --- | --- | --- |
| Sound safety verifier | No modeled bad behavior is omitted | Missing a language feature or unsafe library model. |
| Complete abstract transformer | The domain retains all information for one operation | Intervals cannot represent `x != 3` as precisely as a predicate domain. |
| Complete bug detector | Every bug in the declared class is reported | Undecidable for unrestricted programs; requires strong scope assumptions. |
| Witness-producing bug finder | Every reported bug has a concrete counterexample | It may explore only a subset of paths and miss bugs. |
| High recall in a benchmark | It found many labeled cases in that dataset | Dataset, harness, and rule coverage may not generalize. |

The [SIGPLAN discussion of soundness](https://blog.sigplan.org/2019/08/07/what-does-it-mean-for-a-program-analysis-to-be-sound/)
is useful because it distinguishes verification soundness from the testing community's use of
“sound” for “no false-positive witness.” A symbolic executor can produce a real input for every
reported path and still be incomplete because it did not explore the rest of the state space.

## A worked precision loss

Suppose both branches preserve the same sum but swap the individual values:

```text
if (flag) {
  x = 0; y = 1;
} else {
  x = 1; y = 0;
}
assert(x + y == 1);
```

An interval or independent constant domain joins the branch states as:

```text
x = [0, 1]
y = [0, 1]
x + y = [0, 2]
```

It cannot prove the assertion because it forgot the correlation `x + y = 1`. A relational
domain can preserve the invariant, but it costs more memory and transfer work. This is
incompleteness with respect to the assertion, not unsoundness: `[0, 2]` still contains both
concrete branch states.

The choice can be represented as a product ladder:

| Domain | Can express | Cost/precision behavior |
| --- | --- | --- |
| Sign | Negative/zero/positive | Very cheap, many alarms. |
| Interval | Independent lower/upper bounds | Handles ranges, loses correlations and holes. |
| Difference-bound / octagon | Relations such as `x - y <= c` | More relational, more expensive closure. |
| Polyhedra | Linear inequalities | High precision for linear relations, expensive or bounded. |
| Predicate / SMT abstraction | Selected path predicates | Targeted precision, solver and refinement cost. |

Reduced products recover selected correlations between component domains. Astrée's design,
for example, combines non-relational and weakly relational abstractions with domain-specific
relations rather than choosing one universal domain.

## Widening preserves soundness while forcing convergence

Even a sound interval domain has infinite height. A loop that increments `x` can generate an
unbounded ascending sequence. Widening accelerates it:

```text
analyze_loop(header):
  state = bottom
  repeat:
    candidate = transfer_loop(state)
    next = widen(state, candidate)
    if next == state:
      break
    state = next

  for a small number of iterations:
    state = narrow(state, transfer_loop(state))

  return state
```

The widening operator must move to a state that includes the candidate. It may jump from
`[0, 1024]` to `[0, +infinity]`, losing useful information but retaining soundness. Threshold
widening can stop at constants known from the program, and delayed widening can allow a few
precise iterations before extrapolating. Narrowing recovers information only if it remains a
safe subset of the widened invariant.

Widening is not an excuse for arbitrary timeouts. If a solver stops before obtaining a sound
post-fixpoint, a release gate should return `unknown`, conservatively widen the result, or
report that verification was not completed. “No diagnostic emitted” is not equivalent to
“proved safe.”

## Soundness, completeness, and cost

The practical triangle looks like this:

```text
                    More precision / completeness
                              ▲
                              │ solver time,
                              │ memory, modeling work
                              │
   broad cheap domain ◄───────┼───────► rich relational/path domain
   fast, many alarms          │          slower, fewer alarms
                              │
                              ▼
                    reduced operational coverage
                    when scope is deliberately cut
```

| Decision | Preserves | Gives up |
| --- | --- | --- |
| Keep all CFG paths | Verification soundness | Precision at infeasible joins. |
| Add path/context sensitivity | Correlations and call-specific facts | Time, memory, cacheability. |
| Add a richer domain | More provable properties | Transfer complexity and solver cost. |
| Ignore reflection or unknown libraries | Throughput and implementation simplicity | Soundness outside the modeled subset. |
| Bound depth or iterations | Predictable latency | Completeness; must surface `unknown`. |
| Use a witness-producing search | Concrete, actionable counterexamples | Exhaustiveness over paths. |

The correct target is property-specific. A compiler optimization needs a proof that its
transformation preserves semantics. A release-blocking security check may require conservative
reachability. An IDE warning may accept an incomplete, low-latency analysis if its diagnostic
does not claim proof.

## Astrée: domain-specific soundness at scale

[Astrée's documented goal](https://www.astree.ens.fr/) is to prove the absence of runtime errors
in C programs under its modeled semantics. Its architecture uses abstract interpretation,
interval and weakly relational domains, reduced products, disjunction handling, and
widening/narrowing. The analyzer reports possible errors—including false alarms—rather than
silently dropping them; its precision work is aimed at making those alarms rare for the target
class of synchronous embedded control software.

The Astrée site gives a concrete example:

```c
B = (X == 0);
if (!B) {
  Y = 1 / X;
}
```

A relation between `B` and `X` proves that the division is not reached with `X == 0`. An
independent interval domain might retain `X = [0, max]` and raise a divide-by-zero alarm. The
site also reports a historical proof of no runtime errors in 132,000 lines of A340 flight
control C code, using 300 MB and 1 hour 20 minutes on the stated hardware. That is valuable
evidence of the approach's scalability for a constrained domain, but it is an author-maintained
case study, not a universal benchmark for arbitrary C programs.

## Rust's borrow checker: a specialized static safety analysis

Rust is a useful contrast. The borrow checker is not a general interval abstract interpreter;
it is a type- and constraint-based analysis over MIR. The [Rust compiler guide](https://rustc-dev-guide.rust-lang.org/borrow_check.html)
describes move dataflow, MIR type checking, region inference, and a final walk that checks
initialization and borrow rules. Region values are sets of MIR CFG locations, and outlives
constraints propagate through those sets.

```rust
fn invalid() {
    let value = String::from("hello");
    let borrowed = &value;
    drop(value);       // the owner cannot move while borrowed
    println!("{borrowed}");
}
```

The checker rejects this before execution. Its safety guarantee is a theorem about the Rust
language, compiler, libraries, and the safe/unsafe boundary—not a claim that it detects every
semantic bug. `unsafe` code and foreign-function interfaces require separate proof or modeling;
the [RustBelt work](https://plv.mpi-sws.org/rustbelt/popl18/) formalizes safety for a realistic
subset and safe abstractions built over unsafe primitives.

Rust demonstrates a broader point: a type system can be understood as a specialized static
analysis with a compact domain and a strong rejection policy. It gets low-cost, compositional
guarantees by refusing to represent many states. Astrée accepts more programs and reasons about
their numeric traces with an explicit abstract domain. Neither is “more sound” in the abstract;
their guarantees have different predicates and assumptions.

## What an analyzer should report

Every result should carry enough context to distinguish proof from search:

```text
status: proved | alarm | unknown | unsupported
property: divide-by-zero | use-after-move | taint-to-sink | custom assertion
scope: language/version/build configuration/library model
abstraction: interval + octagon | ownership regions | path constraints
evidence: source span, path or invariant, assumptions
budget: time, iterations, contexts, or solver calls
```

This is more honest than a boolean `clean`. Soundness is a contract between the concrete
semantics, abstraction, transfer functions, environment model, and result interpretation. A
reader should be able to identify which link in that chain supports a “no bug” conclusion and
which gaps turn it into a useful but incomplete warning.

## Sources

- [Cousot and Cousot, abstract interpretation and fixed-point approximation](https://www.di.ens.fr/~cousot/COUSOTpapers/POPL77.shtml)
- [Cousot's abstract-interpretation introduction](https://www.di.ens.fr/~cousot/AI/IntroAbsInt.html)
- [Cousot's abstract-interpretation reference page](https://www.di.ens.fr/~cousot/AI/)
- [SIGPLAN, what it means for an analysis to be sound](https://blog.sigplan.org/2019/08/07/what-does-it-mean-for-a-program-analysis-to-be-sound/)
- [Horwitz, abstract interpretation and Galois connections](https://pages.cs.wisc.edu/~horwitz/CS704-NOTES/10.ABSTRACT-INTERPRETATION.html)
- [The Astrée analyzer](https://www.astree.ens.fr/)
- [The Astrée Analyzer paper](https://www.di.ens.fr/~cousot/COUSOTpapers/ESOP05.shtml)
- [Rust compiler borrow checking](https://rustc-dev-guide.rust-lang.org/borrow_check.html)
- [Rust compiler region inference](https://rustc-dev-guide.rust-lang.org/borrow-check/region-inference.html)
- [RustBelt: securing the foundations of Rust](https://plv.mpi-sws.org/rustbelt/popl18/)
