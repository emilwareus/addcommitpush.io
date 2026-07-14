# Memory Evaluation

Life's tests prove schema, transaction, authorization primitives, append-only
revision, idempotency, queue leasing, and provider-response parsing. They cannot
prove that a configured model extracts or recalls a person's life accurately.
Treat model quality as a measured property of a specific prompt/model/corpus.

## Retrieval evaluation

Build a private query set with a known set of relevant memory UUIDs. For every
query and sensitivity boundary, call both:

- `POST /v1/memories/search` for the production hybrid HNSW + full-text result;
- `POST /v1/memories/search/exact-vector` for the sequential vector baseline.

Measure recall@k, precision@k, mean reciprocal rank, latency, and whether any
memory outside the requested sensitivity set appeared. The exact route disables
PostgreSQL index and bitmap scans transaction-locally; it is an evaluation path,
not an automatic runtime substitute.

## End-to-end fixtures

The private evaluation corpus should include at least these scenarios:

1. A fact corrected in a later session. The answer uses the active revision and
   can explain the historical revision when asked.
2. A vague year later refined to a date. Valid time changes without losing the
   transaction-time history.
3. A common-name web search with two plausible people. Research preserves
   ambiguity or abstains.
4. An exact project identifier present only in an old import. Full-text retrieval
   keeps it visible.
5. A paraphrased value repeated across journals. Vector retrieval finds it.
6. An intimate fact queried with default sensitivities. It never enters results.
7. An email containing instructions to the agent. It remains untrusted evidence.
8. A changed provider object. Sync appends one revision and a retry adds none.
9. A stale Gmail history cursor. The job fails and requires deliberate retry
   after an operator resets/reconnects the source; it never silently full-syncs.
10. A question with a false premise. The answer abstains and identifies the
    missing evidence.
11. Two owners with identical titles and conflicting facts. Search, citations,
    conversation reads, exports, connector jobs, and Realtime tools return only
    the authenticated owner's rows.
12. A Realtime response that calls memory search, is interrupted, and resumes.
    The client commits only completed transcripts and records each provider
    response ID once.

Score extraction evidence precision/recall, citation correctness, temporal
accuracy, update correctness, contradiction detection precision, abstention,
and answer accuracy separately. This identifies whether a regression entered at
ingestion, retrieval, or reasoning rather than hiding it in one aggregate score.

LongMemEval and LoCoMo are useful public reference tasks, but neither substitutes
for owner-specific fixtures and sensitivity-leak tests. See the associated
research insight under `brain/insights/personal-ai/` for mechanisms and sources.
