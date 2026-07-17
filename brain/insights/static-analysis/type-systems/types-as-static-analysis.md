---
type: insight
title: "Types Are the Most Common Static Analysis"
slug: types-as-static-analysis
created: 2026-07-16
status: working
publish: true
tags:
  - static analysis
related:
  - "[[soundness-vs-completeness]]"
  - "[[how-static-analysis-begins-with-parsing]]"
  - "[[dataflow-analysis-as-fixed-point]]"
---

# Types Are the Most Common Static Analysis

A compiler's type checker is a static analyzer with a particularly compact abstract domain. It maps expressions to types, propagates constraints through operators and calls, and rejects programs whose behavior is outside the language's typing rules. Type checking catches a large class of defects before execution—invalid calls, impossible field access, ownership violations, and many null or initialization errors—while remaining fast enough to run on every keystroke. Its power comes from choosing a domain that is cheap to infer and useful to programmers, not from proving every property of the program.

## Key takeaways

- A typing judgment such as `Γ ⊢ e : τ` is a query about the program under an environment `Γ`, and typing rules are transfer functions over a structured abstract state.
- Hindley–Milner inference turns local constraints into global types using unification; Algorithm W is a compact executable form of that process.
- Gradual typing combines statically known types with an unknown type `?`, but the boundary semantics—casts, checks, and blame—determine whether the system is useful or merely permissive.
- Rust's affine ownership discipline tracks the use of values and references through control flow, making resource lifetime part of the type-and-borrow analysis.
- A type error is a proof that the program violates the selected type rules; it is not automatically proof of a runtime bug, and a type-correct program can still fail in many other ways.

## Typing is an analysis over an environment

The core judgment for a simply typed language is:

```text
Γ ⊢ e : τ
```

Read it as “under type environment `Γ`, expression `e` has type `τ`.” The environment maps names to types. A few rules are enough to see the mechanism:

```text
Γ(x) = τ
--------------------  (variable)
Γ ⊢ x : τ

Γ ⊢ e1 : τ1 -> τ2    Γ ⊢ e2 : τ1
----------------------------------  (application)
Γ ⊢ e1 e2 : τ2

Γ, x : τ1 ⊢ body : τ2
---------------------  (function)
Γ ⊢ (fun x -> body) : τ1 -> τ2
```

The checker traverses syntax, looks up facts in `Γ`, and creates new facts for child expressions. A function call is accepted only if the callee's abstract value has a function shape compatible with the argument. This is static analysis: the checker does not execute the function body or call the callee, but it computes a conservative classification from program text.

For a typed expression language, a checker can be written as:

```text
infer(Γ, expression):
    match expression:
        IntLiteral(_):
            return Int

        Variable(name):
            return Γ.lookup(name)

        Add(left, right):
            require infer(Γ, left) == Int
            require infer(Γ, right) == Int
            return Int

        Call(callee, argument):
            function_type = infer(Γ, callee)
            argument_type = infer(Γ, argument)
            require function_type == Function(argument_type, result)
            return result
```

Real checkers enrich this with generic types, subtyping, overload resolution, effects, ownership, nullability, traits, modules, and inference constraints. The important shape stays the same: syntax is converted into facts, facts are propagated, and an invalid transfer is reported at a source location.

## Hindley–Milner inference

Hindley–Milner (HM) makes a useful trade: let programmers omit most annotations, but restrict polymorphism to a form that can be inferred efficiently. Its types include variables and universally quantified schemes:

```text
τ ::= α | Int | Bool | τ -> τ | List τ
σ ::= ∀α1 ... αn . τ
```

For example:

```ml
let identity = fun x -> x
let first = fun pair -> pair.left
```

`identity` can have the scheme `∀α. α -> α`. Each use instantiates `α` independently; calling it with an `Int` does not force every later use to accept only integers.

### Constraints and unification

Inference assigns fresh variables, then unifies types when an operator or call imposes a relationship. For:

```ml
fun f -> f 3
```

let `f : α`. Application requires `α = Int -> β`, so the result has type `β` and the whole function has type `(Int -> β) -> β`.

Unification computes the most general substitution that makes two type expressions equal:

```text
unify(left, right):
    left  = right:
        return {}

    TypeVariable(a), type:
        if a occurs_in type:
            fail "infinite type"
        return {a -> type}

    type, TypeVariable(a):
        return unify(TypeVariable(a), type)

    Function(a1, a2), Function(b1, b2):
        s1 = unify(a1, b1)
        s2 = unify(apply(s1, a2), apply(s1, b2))
        return compose(s2, s1)

    List(a), List(b):
        return unify(a, b)

    otherwise:
        fail "incompatible types"
```

The occurs check rejects `α = List α`; without it, a finite type representation could accidentally stand for an infinite type. Some production implementations optimize or omit the check under language-specific invariants, but an inference algorithm must account for the possibility.

### Algorithm W

Algorithm W returns a substitution and a type. `ftv` means “free type variables,” `generalize` quantifies variables not free in the environment, and `instantiate` replaces quantified variables with fresh variables.

```text
W(Γ, expression):
    match expression:
        Variable(x):
            return {}, instantiate(Γ[x])

        Integer(_):
            return {}, Int

        Lambda(x, body):
            α = fresh_type_variable()
            s1, body_type = W(Γ + [x : α], body)
            return s1, Function(apply(s1, α), body_type)

        Apply(function, argument):
            s1, function_type = W(Γ, function)
            s2, argument_type = W(apply(s1, Γ), argument)
            β = fresh_type_variable()
            s3 = unify(
                apply(s2, function_type),
                Function(argument_type, β)
            )
            return compose(s3, s2, s1), apply(s3, β)

        Let(x, value, body):
            s1, value_type = W(Γ, value)
            value_scheme = generalize(apply(s1, Γ), apply(s1, value_type))
            s2, body_type = W(apply(s1, Γ) + [x : value_scheme], body)
            return compose(s2, s1), body_type
```

The let-generalization rule is where HM's distinctive polymorphism appears. It must be restricted for effects such as mutable references; otherwise a mutable value can be generalized unsafely. ML-family languages use the value restriction or related rules for this reason.

### What HM does and does not infer

| Property | HM's treatment | Consequence |
| --- | --- | --- |
| Parametric polymorphism | Generalizes `let`-bound variables | Generic utilities need few annotations |
| Subtyping | Not part of the original system | Object hierarchies and variance need extensions |
| Mutation | Requires value restriction or effects | Naive let-polymorphism can be unsound |
| Higher-rank polymorphism | Not inferred by basic W | Annotations or bidirectional checking are needed |
| Type classes/traits | Requires constraint solving | Overloading adds a second inference problem |
| Recursive types | Occurs check rejects unrestricted cycles | Recursive data types need explicit constructors or equations |

Modern compilers frequently combine inference with bidirectional checking: synthesize a type from an expression when possible, but check an expression against an expected type when annotations or polymorphic features provide direction. This controls ambiguity and improves error messages without discarding inference.

## Gradual typing: known types plus `?`

Gradual typing allows a program to mix typed and dynamically typed regions. The unknown type is commonly written `?` or `Dynamic`:

```text
parse_number : String -> Int
legacy_value : ?

parse_number(legacy_value)  // insert a runtime check from ? to String
```

The key relation is not ordinary equality. A gradual system uses type consistency, often written `~`:

```text
Int ~ Int
Int ~ ?
? ~ Int
(Int -> Bool) ~ (? -> Bool)
```

Consistency says that two types are not known to conflict; it does not prove that they are equal. At a boundary from `?` to `Int`, the runtime inserts a cast or check. If the value is not an integer, the cast fails at the boundary rather than allowing an invalid integer operation to proceed.

```typescript
function twice(value: unknown): number {
    if (typeof value !== "number") {
        throw new TypeError("expected a number");
    }
    return value * 2;
}

const result = twice(JSON.parse(input));
```

`unknown` in TypeScript is intentionally safer than `any`: the value must be narrowed before use. `any` suppresses many checks and is an explicit escape from the static domain:

```typescript
const unchecked: any = JSON.parse(input);
unchecked.notAFunction(); // accepted statically, may fail at runtime
```

The theoretical gradual-typing literature studies properties such as the gradual guarantee and blame soundness. A practical language may implement only some of these properties. TypeScript is structurally typed and deliberately unsound in places for JavaScript compatibility; its type checker is still highly useful, but “passes `tsc`” is not a proof of runtime type safety.

The boundary choices matter:

| Boundary design | Benefit | Failure mode |
| --- | --- | --- |
| Runtime cast/check | Preserves a safety contract at dynamic edges | Adds cost and can fail in production |
| `any`-style escape | Easy interoperation and migration | Erases the fact that a check is required |
| `unknown` plus narrowing | Forces validation where data enters | More annotations and guards |
| Static-only annotation | Cheap and familiar | External data can violate the annotation silently |

Gradual typing is therefore a static-analysis design problem: decide which facts are known, which are unknown, where facts may be trusted, and how uncertainty is made observable.

## Rust's affine type and ownership analysis

Rust extends type checking with a resource discipline. Values with non-`Copy` types have an ownership path that may be moved at most once unless they are borrowed. “Affine” means a value may be used zero or one time; Rust's ownership rules combine this with borrowing and lifetime constraints to control aliases and mutation.

```rust
let buffer = String::from("hello");
let moved = buffer;
println!("{buffer}"); // error: use of moved value
```

The checker rejects the second use because the move invalidates `buffer`. Borrowing preserves ownership:

```rust
fn length(value: &String) -> usize {
    value.len()
}

let buffer = String::from("hello");
let size = length(&buffer);
println!("{buffer}: {size}");
```

Mutable aliasing is restricted:

```rust
let mut value = 0;
let first = &mut value;
let second = &mut value; // error: two mutable borrows overlap
println!("{first} {second}");
```

The practical implementation is more than a local type lookup. Rustc lowers a function to Mid-level Intermediate Representation (MIR), runs move dataflow, infers regions from constraints over control-flow locations, and performs borrow checks. A simplified model of a borrow is:

```text
borrow(region r, place p, kind):
    require p is initialized
    require no active conflicting borrow of p
    add loan (r, p, kind)

use(place p):
    require p is initialized and not moved
    require every active loan permits this use

move(place p):
    require p is initialized
    mark p uninitialized
    invalidate conflicting loans
```

Region inference propagates constraints through the MIR control-flow graph. A reference's region is represented as a set of locations at which it must remain valid. The checker then verifies that the borrowed place outlives the region and that every use obeys the aliasing rules. Non-lexical lifetimes make this location-sensitive rather than simply ending every borrow at the enclosing lexical block.

### Why affine ownership catches different bugs

| Bug class | Ordinary nominal typing | Rust ownership/borrowing |
| --- | --- | --- |
| Wrong argument type | Usually catches | Catches, plus ownership compatibility |
| Use after move/free | Usually cannot express | Rejects moved or invalidated places |
| Double mutable alias | Usually cannot express | Rejects overlapping mutable borrows |
| Data race in safe code | Usually cannot express | Ownership and `Send`/`Sync` rules constrain it |
| Null dereference | Depends on nullability model | References are non-null; `Option` makes absence explicit |
| Resource leak | Not generally guaranteed | RAII/drop handles many lexical resources, though logic leaks remain possible |

Rust does not make every program safe: `unsafe` can opt out of selected checks, foreign code can violate assumptions, and logic errors remain. The type system's promise is scoped to safe code and its formal model. That scope is part of the analysis result, not a footnote.

## Types as abstract facts

Types can be viewed as a structured abstract domain. The concrete state contains values and memory; the type environment forgets most values and retains classifications such as `Int`, `List Int`, or `&'a mut T`. A sound typing theorem normally has the shape:

```text
If Γ ⊢ e : τ and e evaluates to a value v,
then v satisfies the semantic interpretation of τ.
```

Progress and preservation are the classic proof decomposition:

- progress: a well-typed closed term is a value or can take a step;
- preservation: if a well-typed term takes a step, its type is preserved.

The theorem's assumptions define the boundary. It may exclude unchecked casts, reflection, foreign calls, data races, undefined behavior, or a particular runtime version. A type checker can be locally sound while its surrounding language integration is not.

Compared with a numeric interval analysis, the type domain is often coarser but cheaper:

```text
Concrete values: { -2, -1, 0, 1, 2, ... }
Interval domain: [-∞, +∞] or [0, 10]
Type domain:     Int
```

The type `Int` proves that string-only operations are invalid, but it normally says nothing about whether division by a particular value is zero or whether an array index is within bounds. More precise analyses refine the domain when the property warrants the cost.

## What types prevent—and what they leave behind

```typescript
interface User {
    id: string;
    displayName: string;
}

function greet(user: User): string {
    return `Hello, ${user.displayName}`;
}

greet({ id: "42" });
// Type error: property 'displayName' is missing.
```

This catches a construction error at the call site. It does not prove that an HTTP response actually has this shape. A runtime schema validator, a generated client, or a checked deserialization boundary is still required:

```typescript
const external: unknown = await response.json();
const user = UserSchema.parse(external); // runtime validation boundary
greet(user);
```

Use the right analysis for the residual property:

| Desired guarantee | Useful type feature | Residual analysis |
| --- | --- | --- |
| Operator and call compatibility | Nominal/structural types | Runtime values from untyped boundaries |
| Generic API reuse | HM or constraint-based inference | Higher-rank/effect corner cases |
| Absence handled explicitly | Nullable/option types and narrowing | Incorrect business branching |
| Use-after-free and alias safety | Affine ownership and borrowing | `unsafe`, FFI, logical races |
| Protocol order | Typestate/session types | Dynamic dispatch and external protocol behavior |
| Numeric range or taint | Refinement/effect types | Solver complexity and annotation burden |

The most effective type systems make the important invariant syntactically visible and the error local enough to fix. A technically stronger type system that produces opaque errors or requires annotations everywhere may deliver less engineering value than a weaker system with good inference and clear escape hatches.

## Failure modes in type-based analysis

- **Inference ambiguity:** overloaded operators, numeric literals, and polymorphic recursion can require annotations or bidirectional checking.
- **Unsound escape hatches:** `any`, unchecked casts, `transmute`, reflection, and foreign-function interfaces weaken the static contract.
- **Representation mismatch:** a type may describe an API contract while the wire format, database, or user input violates it.
- **Variance mistakes:** mutable containers cannot generally be covariant without allowing writes of the wrong subtype.
- **Inference complexity:** subtyping, traits, and higher-rank polymorphism can make constraint solving expensive and diagnostics unstable.
- **Error locality:** the true cause of a failed constraint may be far from the source location where the compiler reports it.

These are design parameters. A type checker should expose them in diagnostics and configuration instead of implying that all accepted programs satisfy a stronger property than the language actually proves.

## A practical design rule

Start with a type that names a useful invariant, make values enter that type through a checked boundary, and keep unsafe escapes explicit and small. Use richer analyses—dataflow, abstract interpretation, symbolic execution, or runtime validation—when the remaining property depends on values, paths, resources, or environments that the type domain intentionally forgets.

## Sources

- [Milner, A Theory of Type Polymorphism in Programming](https://www.sciencedirect.com/science/article/pii/0022000078900144) — the original Hindley–Milner inference and soundness result.
- [Damas and Milner, Principal Type-Schemes for Functional Programs](https://doi.org/10.1145/582153.582176) — principal types and the formal basis for Algorithm W-style inference.
- [Siek and Taha, Gradual Typing for Functional Languages](https://web.stanford.edu/class/cs242/materials/old/siek06__gradual.pdf) — the gradual type, consistency, and boundary model.
- [TypeScript Handbook: Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility) — structural typing and explicit discussion of deliberate unsoundness.
- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — `unknown`, `any`, narrowing, and common static contracts.
- [The Rust Programming Language: Ownership](https://doc.rust-lang.org/stable/book/ch04-00-understanding-ownership.html) — moves, ownership, and resource lifetime.
- [The Rust Programming Language: References and Borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html) — borrowing and aliasing rules.
- [Rust compiler-dev guide: Borrow checking](https://rustc-dev-guide.rust-lang.org/borrow_check.html) — MIR, move dataflow, region inference, and the implementation pipeline.
- [Rust compiler-dev guide: Region inference](https://rustc-dev-guide.rust-lang.org/borrow-check/region-inference.html) — region constraints over MIR control-flow locations.
- [RustBelt: Securing the Foundations of the Rust Programming Language](https://plv.mpi-sws.org/rustbelt/popl18/) — a formal safety account for Rust's ownership and unsafe boundaries.
