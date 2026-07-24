# Life Agent Requirements

## Product boundary

Life is a multi-owner Rust backend and Next.js interface for preserving and
revisiting a person's memories. Voice is the default experience. The agent asks
questions, records durable thoughts and events, and uses existing memories to
continue the conversation.

## Functional requirements

- Store typed Markdown memories with time, provenance, confidence, and
  append-only revision history.
- Search every active memory for the authenticated owner with PostgreSQL
  full-text search and pgvector reciprocal-rank fusion.
- Provide Realtime voice tools to record, search, and explore memories.
- Persist exact text and voice conversation transcripts.
- Show memories as a searchable list, detail view, and timeline.
- Research only after an explicit request and preserve supporting URLs.
- Connect GitHub, Linear, and Gmail with encrypted OAuth credentials and
  idempotent imports.
- Store vendor-neutral health measurements.
- Expose audit history and complete JSON/Markdown export.
- Support multiple owners without a public user-creation route.

## Operational requirements

- PostgreSQL is the only database and queue.
- Every protected route and repository query is owner scoped.
- The service starts only with valid database, encryption, and OpenAI config.
- Provider calls have timeouts and typed failures; there are no alternate
  provider or transport paths.
- Cloud Run listens on `0.0.0.0:$PORT`, runs as non-root, emits structured logs,
  and limits database connections.
- Formatting, Clippy, tests, migrations, and the release container must pass.

## Completion criteria

The product is complete when a clean database migrates, the voice tools can
record/search/explore real owner data, transcripts are durable, connector jobs
are idempotent, exports are complete, and cross-owner isolation tests pass.
