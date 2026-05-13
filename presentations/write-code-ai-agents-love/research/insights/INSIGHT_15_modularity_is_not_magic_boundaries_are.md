# INSIGHT 15: Modularity Is Not Magic; Boundaries Are

## Claim

"Make it modular" is too vague. The research supports useful boundaries, not modularity as an aesthetic or raw file/function count.

## Evidence

- CodeChain shows modular decomposition plus self-revision and verified submodules can improve code generation.
- Revisiting Modularity finds no clear positive correlation between modularity score and generation performance, and sometimes weak negative relationships.
- The chunking study finds function-level chunks underperformed Declaration, Sliding Window, and cAST strategies.

## Technique

- Split modules around responsibility, ownership, dependency direction, and testability.
- Keep an API contract and focused tests at each boundary.
- Keep related declarations, imports, examples, and tests close enough for retrieval.
- Avoid micro-modules that force agents to reconstruct simple behavior across many files.

## Caveat

Small functions help humans and tools when they sit inside coherent neighborhoods. Isolated tiny functions with hidden context are not agent-friendly by themselves.

## References

R47, R48, R49, R61.
