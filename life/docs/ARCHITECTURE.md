# Life Agent Architecture

Life uses one Rust package and one PostgreSQL database. The API resolves each
bearer credential to an owner and passes that owner ID into every query and
mutation. A separate Rust worker claims connector jobs from PostgreSQL with
`FOR UPDATE SKIP LOCKED`.

## Primary path

Realtime voice is the product entry point. The API creates a durable
conversation and an OpenAI Realtime session, then returns a short-lived client
secret. The browser carries audio over WebRTC and forwards model tool calls
through the authenticated Next.js proxy.

```text
browser microphone -------- WebRTC --------> OpenAI Realtime
       |                                          |
       | application session                      | record/search/explore
       v                                          v
Next.js server proxy ------------------------> Axum API
                                                   |
                                                   v
                                      PostgreSQL + pgvector
                                                   |
                                                   v
                                    connector worker and providers
```

The Realtime model has exactly three memory tools:

1. `record_life_memory` writes a durable memory when the owner shares something
   worth preserving.
2. `search_life_memory` runs hybrid retrieval for a precise question.
3. `explore_life_memories` browses recent memories, optionally by kind or domain.

The tool route and bearer credential determine the owner. A model cannot choose
another owner. Completed user and assistant transcripts are committed directly;
there is no second extraction pass after the spoken response.

## Memory and retrieval

`memories` is the searchable unit. It combines Markdown with optional structured
facts, temporal bounds, epistemic status, confidence, importance, provenance,
full-text terms, and a 1536-dimensional embedding. Revisions append a new row
with `supersedes_id` and mark the earlier row inactive.

Hybrid retrieval embeds the query, gathers PostgreSQL full-text and pgvector
HNSW candidates, and combines their ranks with reciprocal-rank fusion. Recency
and importance are bounded tie-breakers. Exact vector search remains an explicit
evaluation route.

## Trust boundaries

- PostgreSQL stores only SHA-256 digests of Life bearer tokens.
- Every repository query binds the authenticated owner.
- Composite owner foreign keys prevent cross-owner links.
- OAuth tokens are encrypted with AES-256-GCM before storage.
- Model requests set `store: false`; content still crosses the model-provider
  boundary and deployment policy must account for that.
- Imported and retrieved content is treated as evidence, never instructions.
- Online research is explicit and preserves its source URLs.

## Failure semantics

Each operation has one path. Provider or database failures return a typed error;
connector jobs record a failure for deliberate retry. The service does not
switch providers or silently change transport. A recorded Realtime memory is
durable as soon as its tool call succeeds. Transcript persistence is idempotent
by provider response ID.
