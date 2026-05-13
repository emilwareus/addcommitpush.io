# INSIGHT 06: Types and Interfaces Compress Context

## Claim

Typed interfaces, explicit schemas, and stable public APIs reduce the amount of context an agent must infer from implementation details.

## Evidence

- ContextBench (R10) shows agents struggle with retrieving precise context and often pull noisy material.
- Repository Intelligence Graph (R13) shows structural facts about components, tests, and dependencies help agents answer repository questions faster and more accurately.
- Claude Code configuration analysis (R19) shows developers often encode architecture and testing rules because agents otherwise miss them.
- RepoBench (R03) makes cross-file context a separate measured capability, implying every implicit dependency adds retrieval burden.

## Implication

Make relationships machine-visible:

- type exported functions and components,
- keep schemas near boundaries,
- avoid global mutable state,
- prefer explicit dependency injection over hidden imports,
- name files and modules by responsibility,
- keep generated code out of normal edit paths,
- expose public APIs from predictable entrypoints.

## Talk Use

"Types are not just for compilers. They are compression for agents."
