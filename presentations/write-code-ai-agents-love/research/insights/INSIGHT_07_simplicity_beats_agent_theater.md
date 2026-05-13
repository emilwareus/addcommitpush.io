# INSIGHT 07: Simplicity Beats Agent Theater

## Claim

Complex agent orchestration is not a replacement for clear repository structure and deterministic validation.

## Evidence

- Agentless (R23) demonstrates a simple localize -> repair -> validate workflow can be competitive with more elaborate agents.
- ContextBench (R10) finds sophisticated scaffolding yields only marginal gains in context retrieval.
- SWE-Search (R25) and AutoCodeRover (R24) improve search/refinement, but still depend on repository navigation and feedback.

## Implication

Before adding agent complexity, fix the repository:

- clear task contracts,
- reliable tests,
- searchable structure,
- precise instructions,
- reproducible setup.

Then use orchestration for tasks that genuinely need parallel exploration or multiple perspectives.

## Talk Use

"If the repo is opaque, more agents just parallelize confusion."
