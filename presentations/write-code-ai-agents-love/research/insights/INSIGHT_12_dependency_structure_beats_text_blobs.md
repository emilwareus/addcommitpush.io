# INSIGHT 12: Dependency Structure Beats Text Blobs

## Claim

AI coding agents perform better when repositories expose dependency structure: imports, calls, type relationships, data flow, entrypoints, ownership, tests, and build edges. Plain text similarity is not enough for repository-scale coding.

## Evidence

- GraphCodeAgent uses a requirement graph plus structural-semantic code graph and reports relative Pass@1 improvements up to 43.81%, with a 94.30% relative improvement on cross-file dependency tasks against its best baseline.
- SLICE combines semantic descriptions with backward program slicing and reports 48-67% improvements over no-retrieval and 32-48% over BM25.
- RepoGraph, Repository Intelligence Graph, CodeGRAG, GraphCodeBERT, and CodePlan all converge on the value of structure-aware retrieval or planning.
- InlineCoder reframes repository completion through call graph context: callers provide usage, callees provide required downstream dependencies.

## Technique

- Keep import/dependency direction explicit.
- Avoid hidden dynamic registration, reflection, monkeypatching, implicit globals, and stringly typed coupling.
- Maintain generated dependency maps for large systems.
- Align folders with architecture and ownership, not accidental chronology.
- Keep entrypoints, adapters, domain logic, persistence, and tests in predictable locations.

## Caveat

Agents do not need every graph dumped into context. They need compact, task-relevant slices of the graph.

## References

R12, R13, R16, R30, R53, R54, R55, R56.
