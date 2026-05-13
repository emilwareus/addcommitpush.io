# INSIGHT 14: Types and Static Surfaces Reduce Hallucinated APIs

## Claim

Agents need to know which members, functions, classes, and external APIs are actually available. Typed and static-analysis-visible surfaces reduce invalid-code errors.

## Evidence

- ToolGen targets undefined-variable and no-member errors and shows autocompletion-visible identifiers help agents generate valid repository-level code.
- CatCoder integrates relevant code and type context for Java/Rust repository code generation; removing type context reduces performance.
- Type-Constrained Code Generation narrows output space and reduces compilation errors.
- A3-CodGen improves repository-level code reuse with local functions, class attributes, and third-party-library awareness.

## Technique

- Use explicit exports and imports.
- Prefer typed public APIs, schemas, and generated clients over loose shape copying.
- Keep class fields and service dependencies declared, not created through dynamic mutation.
- Make language-server and typecheck commands reliable.
- Put approved third-party libraries and internal utility entrypoints in docs or agent instructions.

## Caveat

Static surfaces do not solve logical correctness. They reduce symbol/API hallucination and make verification cheaper.

## References

R43, R51, R63, R64.
