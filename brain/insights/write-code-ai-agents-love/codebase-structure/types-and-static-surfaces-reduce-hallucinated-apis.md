---
type: insight
title: "Types and Static Surfaces Reduce Hallucinated APIs"
slug: types-and-static-surfaces-reduce-hallucinated-apis
created: 2026-06-28
status: working
publish: true
tags:
  - ai-agents
  - research
feeds_into:
  - "[[write-code-ai-agents-love]]"
original_path: "presentations/write-code-ai-agents-love/research/insights/INSIGHT_14_types_and_static_surfaces_reduce_hallucinated_apis.md"
---
# INSIGHT 14: Types and Static Surfaces Reduce Hallucinated APIs

Agents need to know which members, functions, classes, and external APIs are actually
available. Typed and static-analysis-visible surfaces reduce invalid-code errors -- specifically
undefined-variable errors, no-member errors, compilation failures, and API hallucination. The
evidence converges from four independent approaches: autocompletion integration, type context
injection, type-constrained decoding, and library-aware retrieval.

## Source map

| Ref | Source                           | Local text                                                    | Role in this insight                                                               |
| --- | -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| R51 | ToolGen                          | `paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt` | Autocompletion-visible identifiers reduce undefined-variable and no-member errors. |
| R63 | CatCoder                         | `paper-text/catcoder-2406.03283.txt`                          | Type context from static analyzers improves Java/Rust repository generation.       |
| R43 | Type-Constrained Code Generation | `paper-text/type-constrained-codegen-2504.09246.txt`          | Type system constraints during decoding reduce compilation errors by >50%.         |
| R64 | A3-CodGen                        | `paper-text/a3-codgen-2312.05772.txt`                         | Local/global/third-party-library-aware retrieval improves code reuse.              |

## ToolGen: autocompletion tools eliminate dependency errors

ToolGen (NTU Singapore, 2024) integrates program-analysis-based autocompletion tools into
the code generation process. The motivation: "in real-world code repositories, more than 70%
of functions are not standalone" and LLMs "cannot be aware of repository-level dependencies
during the code generation process."

Source trace: R51, `paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt`, lines 20-22.

### ToolGen results copied from the paper

| Metric                           |   CodeGPT |    CodeT5 | CodeLlama |
| -------------------------------- | --------: | --------: | --------: |
| Dependency Coverage improvement  |    +31.4% |    +39.1% |    +36.7% |
| Static Validity Rate improvement |    +57.7% |    +44.9% |    +49.2% |
| Pass@1 on CoderEval              |      same |    +40.0% |    +25.0% |
| Latency per function (seconds)   | 0.63-2.34 | 0.63-2.34 | 0.63-2.34 |

Source trace: R51, lines 78-88.

### How ToolGen works

1. **Offline phase:** Analyzes source files, builds ASTs, identifies positions where
   autocompletion tools should be triggered (positions involving repository-level identifiers).
   Inserts a `<COMP>` marker token and fine-tunes the LLM on augmented functions.

2. **Online phase:** During generation, whenever the model predicts `<COMP>`, ToolGen
   invokes the autocompletion tool (Jedi for Python) which provides valid completion
   suggestions from the current repository context. A constrained greedy search selects the
   best suggestion.

### The illustrative example

When encountering `self.` in the file `layers/layer.py` from repo `zomux/deepy`:

- CodeLlama predicts `_updates` -> **no-member error**
- Jedi provides 68 accessible attributes, including the correct `_registered_updates` at
  position 46

The model hallucinates a plausible-sounding attribute that does not exist. The autocompletion
tool knows what actually exists because it analyzes the type's defined members.

### New metrics introduced

ToolGen introduces two dependency-focused metrics:

- **Dependency Coverage:** fraction of repository-level dependencies correctly resolved
- **Static Validity Rate:** fraction of generated functions that pass static validity checks
  (no undefined-variable, no-member, import errors)

These metrics directly measure what typed/static surfaces provide: correct symbol resolution.

## CatCoder: type context for repository-level generation

CatCoder (Zhejiang University, 2025) enhances repository-level code generation by integrating
both retrieved code and type context extracted from static analyzers.

### CatCoder results copied from the paper

| Metric    | Improvement over RepoCoder (Java) | Improvement over RepoCoder (Rust) |
| --------- | --------------------------------: | --------------------------------: |
| compile@k |                      up to 14.44% |                      up to 14.44% |
| pass@k    |                      up to 17.35% |                      up to 17.35% |

Source trace: R63, `paper-text/catcoder-2406.03283.txt`, lines 19-20 and 117-119.

### What type context provides

For the motivating example (Apache Commons Math, `triu` method):

- The LLM knows the algorithm (extract upper triangular part)
- But it does not know that `RealMatrix` requires `getEntry(row, column)` for access
- It does not know that `Array2DRowRealMatrix` is the concrete constructor
- **Type context from static analyzer provides:** field definitions, method signatures, class
  hierarchy for `RealMatrix` and its implementations

Source trace: R63, lines 149-159.

### CatCoder's three-stage pipeline

1. **Retrieve relevant code** from the repository (similarity-based)
2. **Extract type context** using static analyzer: dependent types, field/method signatures
3. **Integrate both** into a single prompt for the LLM

The key insight: "the types associated with a function can also serve as valuable references for
LLMs. Specifically, these related types provide a rich set of fields and methods from which the
LLM can select when generating code."

### Ablation evidence

The paper notes that removing type context reduces performance. The combination of
retrieved code + type context outperforms either alone. This confirms that type information
is complementary to code similarity retrieval -- not redundant.

## Type-Constrained Code Generation: formal guarantees during decoding

Type-Constrained Code Generation (ETH Zurich + UC Berkeley, 2025) takes the strongest
approach: enforcing type system rules during the decoding process itself.

### Type-Constrained results copied from the paper

| Effect                                                     | Value                   |
| ---------------------------------------------------------- | ----------------------- |
| Compilation error reduction                                | >50% (more than half)   |
| Functional correctness improvement (synthesis/translation) | +3.5% to +5.5% relative |
| Functionally correct repair improvement                    | +37% relative           |
| Model sizes tested                                         | 2B to 34B parameters    |
| Language                                                   | TypeScript              |

Source trace: R43, `paper-text/type-constrained-codegen-2504.09246.txt`, lines 88-91.

### Error distribution finding

The paper reports a critical finding about where compilation errors come from:

| Error type                        | Share of compilation errors (TypeScript) |
| --------------------------------- | ---------------------------------------: |
| Type errors (failing type checks) |                                      94% |
| Syntactic errors                  |                                       6% |

Source trace: R43, lines 57-63.

This means: **94% of compilation errors in LLM-generated TypeScript are type errors, not
syntax errors.** Constraining only syntax (prior work) barely helps. Constraining types
eliminates the dominant error class.

### How type constraining works

The approach builds a prefix automaton that:

1. Maintains a type environment for completed expressions
2. Assesses whether partial expressions can be completed to match a required type
3. Uses type inhabitation search to determine valid completions
4. Rejects tokens that would make well-typed completion impossible

The result: generated code is guaranteed to be well-typed upon termination (a formal soundness
guarantee).

## A3-CodGen: library awareness prevents compatibility errors

A3-CodGen (Australian National University + Zhejiang University, 2024) provides the
library-awareness angle. It identifies three categories of repository information:

### Three information types in A3-CodGen

| Type        | Definition                                       | Failure mode without it                   |
| ----------- | ------------------------------------------------ | ----------------------------------------- |
| Local       | Current file: defined functions, variables, FQNs | Logic errors, missed local APIs           |
| Global      | Other files in same repo: importable functions   | Code duplication, missing reuse           |
| Third-party | Pre-installed libraries accessible via import    | ModuleNotFoundError, compatibility issues |

Source trace: R64, `paper-text/a3-codgen-2312.05772.txt`, lines 69-85.

### Key finding

"According to a previous study, only around 30% of methods operate independently in
open-source projects." The remaining 70% depend on other code in the repository.

Source trace: R64, lines 77-78.

### A3-CodGen results

The framework generates code with higher reuse rates compared to human developers.
Specifically:

- Outperforms GitHub Copilot on global reuse and third-party library reuse
- Performs similarly on local reuse
- Identifies optimal configurations for local and global information ("too much global context
  can hurt" -- information overload risk)

## Inference for codebase design

The evidence supports concrete codebase practices:

| Practice                           | Mechanism                                                    | Evidence            |
| ---------------------------------- | ------------------------------------------------------------ | ------------------- |
| Explicit exports and imports       | Makes available symbols discoverable by static tools         | R51 (ToolGen)       |
| Typed public APIs                  | Type context enables CatCoder-style static analysis          | R63 (CatCoder)      |
| Declared class fields/dependencies | Prevents no-member errors; autocompletion works              | R51 (ToolGen)       |
| No dynamic mutation of types       | Static analyzers cannot track runtime-added members          | R43, R63            |
| Reliable typecheck commands        | Enables type-constrained generation and validation           | R43                 |
| Approved library lists in docs     | Prevents third-party hallucination                           | R64 (A3-CodGen)     |
| Generated SDK clients from OpenAPI | Provides typed, discoverable API surfaces                    | Practitioner signal |
| Schema-first design                | Types exist before implementation; agents can reference them | R63, inference      |

### The fundamental mechanism

All four papers converge on the same underlying mechanism:

1. LLMs hallucinate API surfaces (members, functions, imports) that do not exist
2. The hallucination rate is proportional to the invisibility of valid alternatives
3. Making valid alternatives visible (via types, autocompletion, or constrained decoding)
   dramatically reduces invalid code
4. The dominant error class (94% for TypeScript) is type errors, not syntax errors

Therefore: typed, statically analyzable codebases give agents access to the valid symbol
space, reducing hallucination of the invalid symbol space.

## What I should not claim

- I should not claim types solve logical correctness. All four papers are about reducing
  structural/compilation errors, not about generating logically correct implementations.
  ToolGen's Pass@1 improvements are modest compared to its validity improvements.

- I should not claim dynamic languages are hopeless. ToolGen works on Python using Jedi
  (which infers types at runtime-analysis time). A3-CodGen works on Python. But the
  type-constrained approach (R43) is explicitly limited to statically typed languages.

- CatCoder's focus on "statically typed programming languages" is deliberate: "dynamically
  typed languages determine variable types at runtime, making type information less accessible
  and more ambiguous." For Python codebases, type hints (PEP 484) partially bridge this gap.

- The 94% figure for type errors is specific to TypeScript. Other languages may have different
  error distributions. But the directional claim (types dominate over syntax) is likely general.

- A3-CodGen finds that "too much global context can hurt." Type information is useful in
  doses. Dumping all types from a large codebase into context would trigger information
  overload. The agent needs relevant type slices.

## Blog visual candidates

1. Error distribution pie chart: 94% type errors vs 6% syntax errors in LLM-generated
   TypeScript. Single most striking number.
2. ToolGen before/after: `self._updates` (hallucinated) vs `self._registered_updates`
   (from autocompletion). Concrete, relatable.
3. CatCoder three-stage diagram: retrieve code + extract types + generate. Shows how type
   context complements retrieval.
4. Improvement table across all four systems: convergent evidence from independent groups.
5. Codebase affordance mapping: typed API -> fewer hallucinated members -> higher compile
   rate.

## References

- R43: Type-Constrained Code Generation, `paper-text/type-constrained-codegen-2504.09246.txt`
- R51: ToolGen, `paper-text/toolgen-autocomplete-repo-codegen-2401.06391.txt`
- R63: CatCoder, `paper-text/catcoder-2406.03283.txt`
- R64: A3-CodGen, `paper-text/a3-codgen-2312.05772.txt`
