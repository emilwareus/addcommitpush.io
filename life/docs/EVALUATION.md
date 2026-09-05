# Memory Evaluation

Tests prove schema, transactions, authorization, revision semantics,
idempotency, job leasing, and provider parsing. Model recall and interview
quality must be measured on a specific prompt, model, and owner corpus.

## Retrieval

Build a private query set with known relevant memory UUIDs. Compare:

- `POST /v1/memories/search` for production hybrid retrieval;
- `POST /v1/memories/search/exact-vector` for the sequential vector baseline.

Measure recall@k, precision@k, mean reciprocal rank, and latency. The exact route
is an explicit evaluation operation, not an automatic runtime substitute.

## End-to-end fixtures

Include at least:

1. A fact corrected later; only the active revision answers current questions.
2. A vague year refined to a date without losing revision history.
3. An exact project identifier present only in an old import.
4. A paraphrased value repeated across journals.
5. An imported email that contains instructions to the agent.
6. A changed provider object where retry creates no duplicate.
7. A false-premise question that causes abstention.
8. Two owners with identical titles; all reads and tools remain isolated.
9. A Realtime response that records a memory and searches prior context.
10. An interrupted Realtime response; only completed transcripts are committed.

Score extraction evidence, citation correctness, temporal accuracy, update
behavior, abstention, and answer accuracy separately. This localizes regressions
to ingestion, retrieval, or reasoning.
