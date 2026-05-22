# INSIGHT 26: Static Surfaces Are Agent Affordances

## Working conclusion

Names, types, SDKs, generated clients, declarations, imports, and static tooling are not just
"developer experience." They are affordances for agents. They turn hidden behavior into local,
searchable, compiler-checkable facts.

This is one of the clearest code-pattern insights: agents do better when the repo exposes what is
available and what is valid.

## Hard data

| Source | Data point | What it suggests |
|---|---:|---|
| CrossCodeEval | StarCoder Python EM 8.82 -> 15.72 with retrieved context; 21.01 reference-assisted | Cross-file API context materially improves completion. |
| CrossCodeEval | Almost 100% of references contain names needing cross-file info; only 2% predictable from current file | Repository APIs are not optional context. |
| Chunking RAG | Function chunks 24.21 EM vs sliding window 28.40 on CCEval | Function-sized context is not automatically best. |
| Naming affects LLMs | Java GraphCodeBERT MRR 70.36 -> 17.03 after all names perturbed | Names are retrieval metadata. |
| When Names Disappear | GPT-4o class summarization 87.3 -> 58.7 under obfuscation | Names carry intent, especially for semantic tasks. |
| Type-Constrained Code Generation | Compile errors reduced 74.8% HumanEval, 56.0% MBPP | Type constraints beat syntax-only validity. |
| Type-Constrained Code Generation | Pass@1 relative gains: +3.5% synthesis, +5.0% translation, +37.0% repair | Types help most when repairing broken code. |
| CatCoder | Java pass@k up to +17.35%, compile@k up to +14.44% | Type context improves repository-level generation. |
| ToolGen | Dependency coverage +31.4-39.1%, static validity +44.9-57.7% | Enumerated accessible symbols reduce hallucinated dependencies. |
| A3-CodGen | Global retrieval F1: k=5 0.601, k=10 0.526, k=15 0.479 | Curated API candidates beat dumping more candidates. |

Plot-ready data: `research/data/names_types_apis.csv`.

## Notes

This is where the generated-SDK argument becomes evidence-backed rather than just opinion. The
papers are not all about SDKs, but they converge on the same mechanism. Agents need to know which
API is legal. Types, declarations, generated clients, LSP symbols, and autocomplete tools all expose
that legality locally.

Raw HTTP calls are bad agent affordances because the contract is hidden in strings, docs, and
runtime behavior. A generated client turns the contract into import names, request types, response
types, errors, mocks, examples, and compiler diagnostics. The agent can search it, autocomplete it,
and repair against it.

Names deserve their own emphasis. The naming studies show that identifiers are not cosmetic. They
are semantic handles. A model may still parse the AST after names are obfuscated, but intent-level
tasks collapse. This supports a concrete rule for the article: use stable domain vocabulary across
routes, schemas, docs, tests, and code. A wrong name is not harmless; it is a false retrieval key.

The chunking result prevents over-simplification. "Small functions" is not the evidence-backed
rule. Function chunks were not Pareto-optimal in the RAG study. The agent often needs imports,
declarations, adjacent usage, callers, and tests. The better rule is coherent neighborhoods, not
tiny fragments.

## Relevance to code patterns

- Prefer typed public interfaces at package and API boundaries.
- Generate SDKs/clients from schemas instead of hand-writing raw calls.
- Keep schemas, generated clients, examples, and contract tests close enough to discover together.
- Name exported functions after domain intent.
- Keep domain vocabulary consistent across layers.
- Avoid reflection/dynamic registration unless there is a discoverable manifest.
- Use LSP/static-analysis-friendly structure over clever runtime magic.

## Caveats

Strong types and generated SDKs do not replace tests. They constrain shape and reduce invalid API
usage; they do not prove business correctness.

Generated clients can become stale. The agent-friendly version is schema committed, generator
configured, output predictable, regeneration command documented, and CI checking drift.

## References

R43, R49, R51, R62, R63, R64, R65, R66, D25-D30.

