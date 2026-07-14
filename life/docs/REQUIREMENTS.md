# Life Agent Requirements

## Product boundary

`life` is a multi-user Rust backend that builds a separate evidence-linked model
of each person over time. It accepts text and voice conversations, conducts
interviews, imports activity from external accounts, researches an explicitly
identified person online, and stores durable Markdown plus structured claims in
PostgreSQL.

The Next.js application is out of scope. Wake-word detection and microphone
capture are client responsibilities. The primary voice interaction uses WebRTC;
the recorded multipart voice-turn route remains available for non-Realtime
clients.

## Functional requirements

- Store Markdown documents, facts, events, identity, relationships, beliefs,
  emotions, goals, regrets, secrets, journals, reflections, and research notes.
- Preserve source evidence, confidence, sensitivity, temporal precision, and
  the time each assertion entered the system.
- Append revisions. Never erase an earlier assertion when a later assertion
  supersedes or contradicts it.
- Retrieve with PostgreSQL full-text search and pgvector, fused with reciprocal
  rank fusion and filtered by owner and sensitivity.
- Hold normal conversations and structured interviews. Extract memories only
  when the current user message contains supporting evidence.
- Mint owner-bound Realtime sessions for low-latency WebRTC voice, expose only
  owner-scoped memory tools, and durably extract completed transcripts.
- Accept complete audio turns, transcribe them, run the same text-agent
  workflow, and synthesize the reply as speech.
- Research the owner online only through an explicit request, preserving URLs
  and labeling extracted claims as researched rather than user-stated.
- Connect GitHub, Linear, and Gmail through OAuth, encrypt tokens at the
  application boundary, ingest idempotently, and retain provider provenance.
- Expose future-ready health measurements without assuming a device vendor.
- Export the owner's durable Markdown and delete owner data deliberately.
- Support multiple owners without a public user-creation route. Operators
  provision users and high-entropy bearer credentials directly in PostgreSQL.

## Quality and operational requirements

- PostgreSQL is the sole database and queue. No vector database, graph database,
  cache, or message broker is introduced.
- The service starts only with valid database, encryption, and OpenAI
  configuration.
- All protected routes resolve a stored bearer-token digest to exactly one
  owner. Every repository query and cross-table relationship is owner scoped.
- Provider calls have explicit timeouts and return typed failures. There are no
  alternate provider paths.
- Cloud Run deployment listens on `0.0.0.0:$PORT`, uses a non-root image, logs
  structured JSON, and limits database connections.
- `cargo fmt`, strict Clippy, unit tests, PostgreSQL integration tests, and a
  release container build must pass.

## Completion criteria

The backend is complete when every functional requirement has an implemented
route or worker path, migrations run on a clean pgvector PostgreSQL instance,
provider-independent tests pass locally, provider contracts are covered by
fixtures, and deployment/configuration instructions are executable.
