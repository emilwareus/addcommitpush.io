# INSIGHT 01: Agents Need Maps, Not Dumps

## Claim

AI coding agents perform better when the repository exposes structure as a compact, authoritative map. Dumping more files into context is a weak substitute for telling the agent how components, tests, and dependencies relate.

## Evidence

- ContextBench (R10) measures intermediate context retrieval and finds agents favor recall over precision, retrieve noisy context, and often fail to use relevant context they already inspected.
- RepoBench (R03) splits repository completion into retrieval and completion tasks, making cross-file retrieval an explicit bottleneck.
- RepoGraph (R12) and Repository Intelligence Graph (R13) both test explicit graph representations of repository structure.
- Sourcegraph Cody material (R14, D10, D11) frames code search and code intelligence as the context layer for large codebases.
- CodePlan (R16) argues repository-level tasks need planning over dependencies rather than direct generation.

## Implication

For agent-friendly repos, maintain a short map that answers:

- What are the major modules?
- Which files are canonical examples?
- What builds what?
- Which tests cover which areas?
- Which directories are generated, vendored, or dangerous to edit?
- Where are public interfaces defined?

## Talk Use

"Do not give the agent the warehouse. Give it the floor plan."

Use this to argue for repo maps, package boundaries, and generated architecture indexes.
