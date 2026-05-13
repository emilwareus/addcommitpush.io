# INSIGHT 09: Long Context Still Needs Structure

## Claim

Large context windows do not eliminate the need for repository retrieval, maps, and scoped documentation.

## Evidence

- Lost in the Middle (R32) shows models can underuse relevant information depending on where it appears in long context.
- LongCodeBench (R37) and YABLoCo (R36) move evaluation toward very large real repositories and show repo-scale work remains hard.
- Coding Agents are Effective Long-Context Processors (R40) argues agents can use filesystems/tools as a better long-context interface than raw attention alone.
- ContextBench (R10) shows agents often retrieve too much context and still fail to use relevant material in the final patch.

## Implication

The repo should support progressive disclosure:

- root map,
- scoped docs,
- generated symbol/dependency maps,
- canonical examples,
- searchable docs,
- exact commands,
- focused task specs.

## Talk Use

"A million-token window is not a map. It is just a bigger room to get lost in."
