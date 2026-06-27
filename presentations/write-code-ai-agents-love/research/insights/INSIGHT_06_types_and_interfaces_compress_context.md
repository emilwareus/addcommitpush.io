# INSIGHT 06: Types and Interfaces Compress Context

Typed interfaces, explicit schemas, and stable public APIs reduce the amount of context an agent
must infer from implementation details. When types are visible, an agent can reason about what a
function accepts, returns, and depends on without reading its body. When types are absent, the agent
must retrieve implementation files, trace runtime behavior, and guess at contracts, which inflates
token usage, increases retrieval noise, and degrades patch quality.

This is not an argument for type systems in general. It is a narrower claim: for AI agents operating
on repositories, type annotations and explicit interface definitions function as compressed context
that substitutes for much larger volumes of implementation code.

## Source map

| Ref | Source                           | Local text                                                | Role in this insight                                                                                                                 |
| --- | -------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R10 | ContextBench                     | `paper-text/contextbench-2602.05892.txt`                  | Shows agents retrieve noisy context and struggle with precision; types reduce what must be retrieved.                                |
| R43 | Type-Constrained Code Generation | `paper-text/type-constrained-codegen-2504.09246.txt`      | Direct evidence that type constraints reduce compilation errors by more than half and improve functional correctness.                |
| R63 | CatCoder                         | `paper-text/catcoder-2406.03283.txt`                      | Shows type context (API signatures, fields, methods) combined with code retrieval improves repository-level generation up to 17.35%. |
| R13 | Repository Intelligence Graph    | `paper-text/repository-intelligence-graph-2601.10112.txt` | Structural facts (components, dependencies, tests) improve agent accuracy by 12.2% and reduce completion time by 53.9%.              |
| R19 | Claude Code Configs              | `paper-text/claude-code-configs-2511.09268.txt`           | Empirical study showing developers encode architecture and testing rules because agents otherwise miss structural relationships.     |
| R03 | RepoBench                        | `paper-text/repobench-2306.03091.txt`                     | Cross-file context is a separately measured capability; implicit dependencies impose retrieval burden.                               |

## ContextBench: agents favor recall over precision

ContextBench is a process-oriented evaluation of context retrieval in coding agents. It measures how
agents retrieve and use code context during issue resolution, using 1,136 tasks from 66 repositories
across 8 programming languages, each with human-annotated gold contexts.

### Key ContextBench data

| Measurement                        |   Value | Unit      |
| ---------------------------------- | ------: | --------- |
| Issue-resolution tasks             |   1,136 | tasks     |
| Repositories                       |      66 | repos     |
| Programming languages              |       8 | languages |
| Human-verified gold context lines  | 522,115 | lines     |
| Gold context classes and functions |  23,116 | blocks    |
| Gold context files                 |   4,548 | files     |

Source trace: R10, `paper-text/contextbench-2602.05892.txt`.

Key findings relevant to the types claim:

1. "Sophisticated agent scaffolding yields only marginal gains in context retrieval" -- the problem
   is not search complexity but knowing what to search for.
2. "LLMs consistently favor recall over precision" -- agents retrieve broad context to maximize
   coverage, introducing substantial noise that undermines precision.
3. "Significant gaps exist between retrieved and utilized context" -- agents often inspect
   gold-relevant code but fail to retain or use it in final patch generation.

Inference: if an agent could resolve a function's contract from a type signature instead of from its
implementation body, it would need to retrieve fewer files, produce less noise, and have a higher
chance of using the relevant material in the final patch. Types compress the retrieval target.

## Type-Constrained Code Generation: types halve compilation errors

This paper introduces type-constrained decoding for LLM code generation. The constraint uses the
TypeScript type system to reject invalid token completions during generation.

### Type-Constrained Decoding data

| Measurement                                                |    Value | Context                                                |
| ---------------------------------------------------------- | -------: | ------------------------------------------------------ |
| Compilation errors due to type violations                  |      94% | Of all compilation errors in generated TypeScript code |
| Compilation errors due to syntax                           |       6% | Syntax is the minor part of the problem                |
| Reduction in compilation errors                            |     >50% | Type-constrained vs. unconstrained decoding            |
| Functional correctness improvement (synthesis/translation) | 3.5-5.5% | Relative improvement                                   |
| Functional correctness improvement (repair)                |      37% | Relative improvement on average                        |
| Model sizes evaluated                                      |   2B-34B | Parameters                                             |

Source trace: R43, `paper-text/type-constrained-codegen-2504.09246.txt`.

This paper operates at the decoding level, not the repository level. But the lesson generalizes: when
type information is available, it eliminates the largest category of mechanical errors (94% of
compilation failures are type errors, not syntax errors). For agents working on repositories, this
means that visible type annotations in the codebase provide the same constraint benefit passively --
the agent can check its generated code against declared types without needing to execute it.

## CatCoder: type context as essential complement to code retrieval

CatCoder is a repository-level code generation framework that combines code retrieval with type
context extraction via static analyzers. The key insight is that retrieved code alone is insufficient;
the agent also needs the API surface of related types.

### CatCoder data

| Measurement                            |                                      Value | Context                                          |
| -------------------------------------- | -----------------------------------------: | ------------------------------------------------ |
| Java benchmark tasks                   |                                        199 | tasks                                            |
| Rust benchmark tasks                   |                                         90 | tasks                                            |
| Improvement over RepoCoder (compile@k) |                               up to 14.44% | percentage points                                |
| Improvement over RepoCoder (pass@k)    |                               up to 17.35% | percentage points                                |
| Type context content                   | Fields, method signatures of related types | Extracted by static analyzer                     |
| Performance improvement                |       Consistent across all evaluated LLMs | Both code-specialized and general-purpose models |

Source trace: R63, `paper-text/catcoder-2406.03283.txt`.

The motivating example in the paper is instructive: to generate a correct `triu` method for a
`RealMatrix` interface, an LLM needs both (1) a relevant code example showing instantiation
patterns and (2) the type context showing available methods like `getEntry(row, column)`. Neither
source alone is sufficient. The paper demonstrates that "the absence of type context increases the
risk of hallucination, such as referencing non-existent methods or fields."

This directly supports the insight: visible type definitions (interfaces, method signatures, field
declarations) are high-value context that substitutes for much larger volumes of implementation code.

## Repository Intelligence Graph: structural facts reduce exploration

RIG provides a deterministic, build-and-test-centered architectural graph that agents can consult
instead of reverse-engineering project structure through file exploration.

### RIG data

| Measurement                                              |                      Value | Context                                |
| -------------------------------------------------------- | -------------------------: | -------------------------------------- |
| Mean accuracy improvement with RIG                       |                      12.2% | Relative, across 8 repos and 3 agents  |
| Mean completion time reduction                           |                      53.9% | Wall-clock seconds                     |
| Mean efficiency improvement (seconds per correct answer) |                      57.8% | Reduction                              |
| Multi-lingual repo accuracy improvement                  |                      17.7% | Where structural complexity is highest |
| Multi-lingual repo efficiency improvement                |                      69.5% | Where exploration cost is highest      |
| Single-language repo accuracy improvement                |                       6.6% | Lower complexity, less benefit         |
| Agents evaluated                                         | Claude Code, Cursor, Codex | 3 commercial agents                    |
| Repositories                                             |                          8 | Low to high build complexity           |

Source trace: R13, `paper-text/repository-intelligence-graph-2601.10112.txt`.

RIG is not type annotations per se, but it is the same principle operating at the architecture level:
providing a machine-readable structural description that the agent can consult directly, instead of
forcing it to infer structure from scattered build files and source code. The largest gains appear in
multilingual repositories where cross-language dependencies are encoded across heterogeneous build
systems -- exactly the case where implicit relationships are hardest to discover.

## Claude Code Configs: developers encode architecture because agents miss it

The empirical study of 328 Claude Code configuration files found that 72.6% specify application
architecture. The median file has 7 level-2 headings. This is practitioner evidence that developers
find it necessary to explicitly state structural relationships that agents otherwise miss.

### Config study data

| Measurement                      |                           Value |
| -------------------------------- | ------------------------------: |
| Configuration files analyzed     |                             328 |
| Files specifying architecture    |                           72.6% |
| Top programming languages        | JS/TS (35), Python (16), Go (9) |
| Median project stars             |                             950 |
| Median project age               |                       58 months |
| Median level-2 headings per file |                               7 |

Source trace: R19, `paper-text/claude-code-configs-2511.09268.txt`.

## RepoBench: cross-file context as a separate measured capability

RepoBench separates retrieval (RepoBench-R), completion (RepoBench-C), and pipeline
(RepoBench-P) tasks. The XF-F (Cross-File-First) setting is hardest because there is no prior
in-file usage of the module to serve as a hint. This directly demonstrates that every implicit
dependency adds retrieval burden.

### RepoBench data

| Measurement                    |                    Value |
| ------------------------------ | -----------------------: |
| Python test repositories       |                    1,075 |
| Java test repositories         |                      594 |
| Task settings                  | XF-F (hardest), XF-R, IF |
| Hard subset candidate snippets |             10+ per task |

Source trace: R03, `paper-text/repobench-2306.03091.txt`.

The relevance to types: in the XF-F setting, the agent encounters a cross-file dependency for the
first time with no in-file hint. If the dependency is typed (with clear import types, interface
definitions, or documented API contracts), the retrieval problem is localized to a known signature.
If it is untyped and dynamic, the agent must search for usage patterns across the repository.

## Explicit inference

Based on the evidence above, the following inferences are defensible:

1. **Types reduce retrieval volume.** ContextBench shows agents retrieve too much and use too
   little. Types provide a compact representation of what matters (the contract), reducing what
   the agent needs to find.

2. **Types reduce generation errors mechanically.** Type-constrained decoding eliminates over
   half of compilation errors. The same information, when present in a codebase as annotations,
   gives agents a checkable constraint during code generation.

3. **Types are necessary alongside code examples.** CatCoder shows that code retrieval alone is
   insufficient; the type context (available fields and methods) is the missing piece. Both sources
   together produce correct code; either alone does not.

4. **Structural maps compound the type benefit.** RIG shows 12.2% accuracy gains from
   architectural facts. When types define module boundaries AND those boundaries are visible
   as a graph, the agent spends dramatically less time on exploration.

5. **Developers already know this.** 72.6% of Claude Code configs encode architecture -- the
   community implicitly acknowledges that agents need explicit structural information.

## What this does not prove

- This does not prove that dynamically typed languages are unsuitable for agents. It proves that
  agents benefit from explicit contracts, which types happen to provide efficiently.

- This does not prove that adding more types always improves agent performance. Overly complex
  generic types or deeply nested type hierarchies may themselves become noise. The benefit comes
  from types at boundaries, not types everywhere.

- This does not prove that type annotations alone are sufficient context. CatCoder explicitly shows
  that code examples AND type context are both needed.

- The type-constrained decoding paper operates at the token level with small programs. Scaling
  to repository-level generation is an inference, not a demonstrated result.

- RIG's gains are measured on structured Q&A tasks, not on open-ended patch generation. The
  transfer to SWE-bench-style tasks is plausible but not directly measured in that paper.

## Codebase design implications

| Agent need                             | Type/interface affordance  | Concrete repo artifact                                   |
| -------------------------------------- | -------------------------- | -------------------------------------------------------- |
| Know what a function accepts           | Parameter types            | `function process(input: ParsedEvent): Result`           |
| Know what a module exports             | Public API surface         | `export type { Config, Plugin, Handler }` in index.ts    |
| Know available operations on an object | Interface/class definition | `interface RealMatrix { getEntry(r, c): double }`        |
| Know module dependencies               | Import types               | Explicit typed imports, no `require()` with implicit any |
| Know architectural boundaries          | Module boundary types      | Barrel files with typed re-exports                       |
| Avoid hallucinating APIs               | Visible method signatures  | Generated API docs, TypeDoc output, or .d.ts files       |
| Navigate unfamiliar codebase           | Structural graph           | Generated dependency graph, RIG-style JSON               |

## Blog visual candidates

1. ContextBench precision vs. recall radar chart -- agents over-retrieve, types narrow the target.
2. Type-constrained decoding: 94% of compilation errors are type errors, not syntax errors.
3. CatCoder improvement table: code retrieval alone vs. code + type context.
4. RIG accuracy improvement by repository complexity -- structural information helps most where
   dependencies are implicit and cross-language.
5. Conceptual diagram: type annotation as context compression (one line of type replaces N lines
   of implementation the agent would otherwise need to read).

## References

- R03: RepoBench, `paper-text/repobench-2306.03091.txt`
- R10: ContextBench, `paper-text/contextbench-2602.05892.txt`
- R13: Repository Intelligence Graph, `paper-text/repository-intelligence-graph-2601.10112.txt`
- R19: Claude Code Configs, `paper-text/claude-code-configs-2511.09268.txt`
- R43: Type-Constrained Code Generation, `paper-text/type-constrained-codegen-2504.09246.txt`
- R63: CatCoder, `paper-text/catcoder-2406.03283.txt`
