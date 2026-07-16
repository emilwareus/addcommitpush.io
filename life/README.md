# Life

`life` is the Rust/PostgreSQL backend for a voice-first personal memory agent.
The main interaction is a Realtime WebRTC conversation in which Life interviews
the owner, records memories as they are shared, and searches or explores the
owner's complete memory collection.

Every protected request is scoped to the owner resolved from a bearer token.
PostgreSQL stores memories, transcripts, connector data, audit events, health
measurements, and exports. It also provides full-text and pgvector retrieval and
acts as the connector worker queue.

## Core capabilities

- Typed Markdown memories with append-only revisions and a chronological view.
- Hybrid full-text and vector search over every active memory for the owner.
- Realtime voice with three tools: record, search, and explore memories.
- Durable text and voice conversations.
- Explicit cited online research.
- Encrypted GitHub, Linear, and Gmail connectors with idempotent ingestion.
- Health measurements, audit history, and JSON/Markdown export.

Read the [API](docs/API.md), [architecture](docs/ARCHITECTURE.md),
[Realtime voice contract](docs/REALTIME_VOICE.md), and
[threat model](docs/THREAT_MODEL.md) before changing an integration boundary.

## Local setup

```bash
cp .env.example .env
set -a
source .env
set +a
docker compose up --detach --wait postgres
cargo run --locked --bin life-api
```

The service does not read `.env` itself. Configuration must be exported by the
shell or a secrets manager. Startup validates configuration and applies the SQLx
migrations.

Run all backend quality gates:

```bash
make check
```

Run the connector worker continuously:

```bash
cargo run --locked --bin life-worker
```

The Next.js application proxies Life requests from its server so the browser
never receives the Life bearer token. The browser receives only the short-lived
OpenAI Realtime client secret needed for its WebRTC connection.
