# Life Agent Roadmap

## Phase 1: Foundations (complete)

- Rust package, strict linting, configuration, typed errors, per-user bearer
  authentication, and manual provisioning.
- PostgreSQL/pgvector schema and migration lifecycle.
- Cloud Run container and local PostgreSQL environment.

## Phase 2: Durable memory and retrieval (complete)

- Owner-scoped memory/document CRUD and append-only revision semantics.
- Embeddings, full-text/vector reciprocal-rank fusion, provenance, export.
- Contradiction records and retrieval evaluation fixtures.

## Phase 3: Conversations, interviews, and voice (complete)

- Conversation history and structured Responses API output.
- Evidence-validated memory extraction and interview question lifecycle.
- Realtime WebRTC session preparation, owner-scoped function tools, durable
  transcript extraction, plus complete-turn transcription and speech.

## Phase 4: Research and activity ingestion (complete)

- Explicit online research with preserved citations.
- Encrypted OAuth and idempotent GitHub, Linear, and Gmail synchronization.
- PostgreSQL worker queue, webhook verification, audit trail.

## Phase 5: Operations and verification (complete)

- Health measurement contract, owner export/deletion, readiness and telemetry.
- Unit, integration, API, provider-fixture, migration, and container tests.
- Threat-model and requirements audit; deployment runbook.
- Multi-user isolation constraints and integration tests across credentials,
  memories, sources, conversations, Realtime sessions, and deletion.
