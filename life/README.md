# Life

`life` is the Rust/PostgreSQL backend for private personal knowledge agents. It
supports multiple manually provisioned users while keeping every credential,
query, relationship, job, and export scoped to one owner. It stores durable
Markdown and structured, provenance-linked memories; supports conversation,
interviews, real-time voice, hybrid retrieval, explicit online research, and
activity ingestion.

Read [the requirements](docs/REQUIREMENTS.md) and
[architecture](docs/ARCHITECTURE.md) before changing the data model. The
[HTTP API](docs/API.md), [Cloud Run runbook](docs/DEPLOYMENT.md), and
[threat model](docs/THREAT_MODEL.md) define its integration and privacy contract.
See [user provisioning](docs/PROVISIONING.md) before making an API request and
[the Realtime voice contract](docs/REALTIME_VOICE.md) before building a client.

## What is implemented

- Append-only typed memories, stable Markdown document paths, life timeline,
  structured facts, relations, contradictions, provenance, and audit events.
- PostgreSQL `tsvector` plus pgvector HNSW candidates fused with reciprocal-rank
  fusion. PostgreSQL is also the only worker queue.
- Per-user bearer credentials stored only as SHA-256 digests. There is no user
  creation API; an operator provisions and rotates users directly in PostgreSQL.
- Evidence-validated conversations, adaptive interviews, cited reflections,
  transcription/speech voice turns, and owner-bound Realtime WebRTC sessions.
- Explicit cited online research and encrypted OAuth for GitHub, Linear, and
  Gmail, with idempotent source ingestion by a Rust worker.
- Vendor-neutral future health measurements, complete JSON/Markdown export, and
  deliberate owner deletion.
- Non-root multi-stage image for the API and Cloud Run Job worker.

## Local setup

```bash
cp .env.example .env
# Replace every required secret, then export the file into your shell.
set -a
source .env
set +a
docker compose up --detach --wait postgres
cargo run --locked --bin life-api
```

The service never reads `.env` itself. This makes the runtime contract identical
on a developer machine and Cloud Run. Use your shell or a secrets tool to export
the values.

Run all quality gates:

```bash
make check
```

Run the connector worker continuously on a developer machine:

```bash
cargo run --locked --bin life-worker
```

Drain queued jobs once, as the Cloud Run Job does:

```bash
cargo run --locked --bin life-worker -- --drain
```

The API starts only when required configuration is valid and migrations have
completed. `OPENAI_API_KEY` is required even when only repository routes are in
use because there is one configured reasoning/embedding/voice path and no
provider downgrade.

No frontend is included. The intended client keeps each Life bearer token in a
server-side application session, requests a short-lived OpenAI client secret
through `POST /v1/realtime/sessions`, and connects the browser microphone to
OpenAI over WebRTC. Memory tool calls and completed transcripts return through
the authenticated Life API. Wake-word detection remains a browser concern.
