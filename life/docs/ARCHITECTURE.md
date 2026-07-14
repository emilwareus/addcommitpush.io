# Life Agent Architecture

## Decision summary

The system uses one Rust package and one PostgreSQL database. The API resolves
each bearer credential to an owner, then passes that owner ID into every
conversation, retrieval, CRUD, OAuth, and job operation. There is no HTTP user
creation route. A separate worker binary claims PostgreSQL jobs with
`FOR UPDATE SKIP LOCKED` for connector synchronization. Reflections and
contradiction extraction run synchronously in evidence-checked API operations.
Both binaries share the same library and migrations.

Realtime voice is the primary interaction. The authenticated API creates an
owner-scoped conversation and an OpenAI Realtime session, then returns a
ten-minute ephemeral connection secret. The browser sends microphone and model
audio directly over WebRTC. Its function calls go through a Life endpoint whose
route session fixes both `owner_id` and allowed sensitivities; tool arguments
cannot select either. After each completed response, the client submits the
exact user and assistant transcripts. A non-latency-critical Responses call
extracts memories, validates exact evidence and citations, and atomically commits
both messages plus all accepted memories.

The multipart voice route is a separate complete-turn operation for clients
without WebRTC. It transcribes, reasons, synthesizes, and commits only after all
provider work succeeds.

```text
browser microphone -------- WebRTC --------> OpenAI Realtime
       |                                          |
       | app session                              | function call
       v                                          v
server-side frontend proxy -----------------> Axum API
                                                  |
                                     owner-scoped transaction
                                                  |
                                                  v
                                      PostgreSQL 18 + pgvector
                                                  |
                                      PostgreSQL job queue
                                                  |
                                                  v
                                             Rust worker
                                      GitHub / Linear / Gmail
```

## Memory model

`memories` is the canonical searchable unit. A row combines readable Markdown
with optional subject–predicate–object structure, temporal bounds, epistemic
status, sensitivity, confidence, importance, provenance, full-text terms, and a
1536-dimensional embedding. Documents and journals use a stable virtual path.

Revisions append a row with `supersedes_id` and mark the prior row's
`superseded_at`; contradictions link two rows and require an explicit status.
This prevents the agent from silently rewriting the owner's history.

Source records represent imported or researched evidence. Messages are also
first-class evidence: automatically extracted claims carry the exact user-text
excerpt that justified them. The service rejects an extraction candidate whose
evidence is absent from the current message.

## Retrieval algorithm

1. Embed the query with the configured 1536-dimensional model.
2. Select full-text candidates using `websearch_to_tsquery` and `ts_rank_cd`.
3. Select semantic candidates with pgvector cosine distance and strict iterative
   HNSW scanning.
4. Fuse ranks using reciprocal rank fusion, then apply recency and importance as
   bounded tie-breakers rather than allowing them to overpower relevance.
5. Return memory IDs, evidence, provenance, and scores to the reasoner.

Exact PostgreSQL search remains available for evaluation. HNSW is an operational
optimization whose recall must be measured against that exact baseline.

## Privacy and trust boundaries

- Life bearer tokens are random per-user credentials. PostgreSQL stores only
  their SHA-256 digests; the raw token is shown only during manual provisioning.
- The authenticated owner comes only from the bearer token. Request bodies,
  paths, Realtime tool arguments, and connector payloads cannot choose it.
- Composite owner foreign keys prevent a row from linking to another owner's
  memory, message, source, conversation, connector, or health record.
- OAuth tokens are encrypted with AES-256-GCM before PostgreSQL storage; the key
  is injected separately by Cloud Run.
- Content is protected by database encryption, network controls, bearer auth,
  owner scoping, sensitivity filters, audit events, and explicit export/delete.
- Model calls set `store: false`. Content sent to a model still leaves the trust
  boundary; deployment must use an OpenAI project with the required retention
  policy before intimate data is entered.
- Online identity research is never ambient. The owner supplies the query and
  explicitly starts the operation, and every resulting claim remains labeled
  `researched` with source URLs.

## Failure semantics

There is one path per operation. A failed transcription, embedding, reasoning,
speech, OAuth exchange, or database write returns a typed error or marks the
queued job failed. The service does not switch providers, silently omit vector
search, or downgrade a voice turn to text. Jobs may be deliberately retried by
an operator; retries are idempotent through provider external IDs and content
hashes.

A failed Realtime connection leaves only a short-lived empty conversation. A
failed durable turn extraction or commit stores no partial messages or memories.
Closing a Realtime session also completes its durable conversation.

## Extensibility

Health data uses vendor-neutral metric codes, units, intervals, source records,
and JSON dimensions. New devices map into this contract rather than creating a
device-specific database. New activity connectors implement the same ingest
contract: external identity, cursor, normalized source record, extracted memory,
and provenance.
