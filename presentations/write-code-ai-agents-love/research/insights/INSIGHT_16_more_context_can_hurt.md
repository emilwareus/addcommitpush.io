# INSIGHT 16: More Context Can Hurt

## Claim

Large context windows and long instruction files do not automatically improve agent performance. Irrelevant context raises cost and can reduce success.

## Evidence

- Evaluating AGENTS.md finds context files tended to reduce success and increased inference cost by over 20%; the authors recommend minimal human-written requirements.
- A3-CodGen reports that adding too much global context can underperform smaller, more selective context.
- Lost in the Middle shows that long-context models can miss information depending on placement.
- The chunking study finds retrieval configuration has non-obvious tradeoffs; function chunks were not Pareto-optimal.

## Technique

- Put only durable, mandatory facts in root `AGENTS.md`.
- Use scoped docs, package-level instructions, and skills for specialized workflows.
- Retrieve callers, callees, tests, examples, and contracts before broad unrelated files.
- Design modules so relevant context is compact and local.

## Caveat

This is not an argument for less documentation. It is an argument for layered, scoped, retrievable documentation.

## References

R18, R32, R49, R64.
