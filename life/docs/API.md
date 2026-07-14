# Life HTTP API

All `/v1` routes except OAuth callbacks and the Linear webhook require
`Authorization: Bearer $LIFE_USER_TOKEN`. PostgreSQL stores only the token's
SHA-256 digest; authentication resolves it to one owner and handlers never accept
an owner ID from the caller. Responses and errors are JSON unless a route
explicitly returns Markdown. There is deliberately no user-creation endpoint;
see [manual provisioning](PROVISIONING.md).

## Owner and durable knowledge

| Method | Route | Purpose |
| --- | --- | --- |
| `GET`, `PUT`, `DELETE` | `/v1/owner` | Read, update, or explicitly delete the authenticated owner |
| `POST`, `GET` | `/v1/memories` | Create or list typed Markdown memories |
| `GET`, `PUT`, `DELETE` | `/v1/memories/{id}` | Read, append a revision, or append a retraction |
| `POST` | `/v1/memories/search` | PostgreSQL full-text + pgvector reciprocal-rank fusion |
| `POST` | `/v1/memories/search/exact-vector` | Sequential exact-vector baseline for recall evaluation |
| `GET` | `/v1/timeline` | Query active memories by time interval and domain |
| `GET`, `POST`, `PUT` | `/v1/documents/{path.md}` | Read, create, or revise a durable Markdown path |
| `POST` | `/v1/memory-edges` | Link two memories with a typed relation |
| `GET` | `/v1/memories/{id}/edges` | Read incoming and outgoing relations |
| `GET` | `/v1/contradictions` | Review detected conflicts |
| `PUT` | `/v1/contradictions/{id}` | Confirm, dismiss, or resolve a conflict |
| `POST` | `/v1/reflections` | Derive a cited higher-level reflection from retrieved memories |

Memory kinds include events, facts, identity, relationships, beliefs, emotions,
goals, regrets, secrets, journals, reflections, health, research, life periods,
people, places, projects, decisions, achievements, habits, preferences, and
values. Every row also carries an epistemic status, sensitivity, confidence,
importance, temporal precision, optional structured subject/predicate/object,
and provenance.

Create a manual memory:

```bash
curl --fail-with-body http://localhost:8080/v1/memories \
  --header "Authorization: Bearer $LIFE_USER_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{
    "kind": "life_period",
    "title": "Studied at Lund University",
    "body_markdown": "I studied theoretical physics at Lund University.",
    "document_path": null,
    "domain": "education",
    "subject": "owner",
    "predicate": "studied_at",
    "object_value": "Lund University",
    "epistemic_status": "user_stated",
    "sensitivity": "private",
    "confidence": 1,
    "importance": 8,
    "occurred_start": null,
    "occurred_end": null,
    "temporal_precision": "unknown",
    "source_id": null,
    "source_message_id": null,
    "evidence_excerpt": null,
    "derived_from_id": null
  }'
```

Search defaults to `standard` and `private`; intimate and restricted material is
retrieved only when explicitly included in `sensitivities`.

## Conversation, interviews, and voice

| Method | Route | Purpose |
| --- | --- | --- |
| `POST`, `GET` | `/v1/conversations` | Create or list conversations |
| `GET` | `/v1/conversations/{id}` | Read conversation state |
| `GET` | `/v1/conversations/{id}/messages` | Read its durable transcript |
| `POST` | `/v1/conversations/{id}/turns` | Text turn with retrieval and evidence-checked extraction |
| `POST` | `/v1/conversations/{id}/voice-turns` | Multipart audio → transcript → turn → MP3 response |
| `POST` | `/v1/interviews` | Start an adaptive themed interview |
| `GET`, `DELETE` | `/v1/interviews/{id}` | Read or complete an interview |
| `GET` | `/v1/interviews/{id}/questions` | Inspect question/answer lifecycle |
| `POST` | `/v1/realtime/sessions` | Create a durable conversation and mint an owner-bound Realtime secret |
| `GET`, `DELETE` | `/v1/realtime/sessions/{id}` | Read or close the authenticated owner's session |
| `POST` | `/v1/realtime/sessions/{id}/tools/search-memory` | Execute the model's owner- and sensitivity-scoped memory tool |
| `POST` | `/v1/realtime/sessions/{id}/turns` | Validate and durably commit a completed Realtime voice exchange |

Realtime WebRTC is the primary voice path. Session creation accepts a title and
one or more fixed sensitivity values. It returns the durable conversation,
server-side Realtime session, and a ten-minute OpenAI client secret. The Life
session remains usable for the provider's 60-minute maximum session duration.
The secret is returned once and never stored. See [the client contract](REALTIME_VOICE.md)
for WebRTC setup, function-call forwarding, transcript assembly, and commit
ordering.

The complete-turn voice operation is multipart form data with one `audio` file
and an optional JSON `sensitivities` field. Its JSON response contains the exact
transcript, committed turn, base64 MP3, and media type. The 25 MiB request limit
is enforced before provider processing. It is intended for clients that cannot
use Realtime WebRTC.

Wake-word detection and microphone permission belong in the browser client.
Neither the Realtime client secret nor a function call can choose an owner. The
backend derives the owner from its bearer credential and derives allowed
sensitivities and conversation ID from the stored Realtime session.

## Research and connectors

`POST /v1/research` is the only online-person research path. It requires an
explicit query, preserves web citations, rejects extracted evidence not present
verbatim in the cited report, and labels stored claims `researched`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/connectors` | List GitHub, Linear, and Gmail connections without tokens |
| `POST` | `/v1/connectors/{provider}/oauth/start` | Create a ten-minute one-use OAuth state and authorization URL |
| `GET` | `/v1/oauth/{provider}/callback` | Validate state, exchange code, verify external identity, encrypt tokens |
| `POST` | `/v1/connectors/{id}/sync` | Enqueue an idempotent PostgreSQL sync job |
| `POST` | `/v1/connectors/{id}/reset-cursor` | Explicitly request the next sync to use its initial mode |
| `DELETE` | `/v1/connectors/{id}` | Erase local credentials and revoke local access |
| `GET` | `/v1/jobs/{id}` | Read job status |
| `POST` | `/v1/jobs/{id}/retry` | Deliberately retry a failed job |
| `POST` | `/v1/webhooks/linear` | Verify Linear HMAC/timestamp and enqueue each connected Linear owner |

GitHub imports authenticated activity events, Linear imports the owner's issues,
and Gmail imports recent/incremental message metadata and snippets. Provider IDs
and content hashes make reprocessing idempotent. Changed source records append a
new memory revision; they never overwrite history. A stale Gmail history cursor
fails the job explicitly instead of silently starting a different sync mode.

## Health, audit, and portability

| Method | Route | Purpose |
| --- | --- | --- |
| `POST`, `GET` | `/v1/health-measurements` | Vendor-neutral metric, unit, interval, dimensions, and provenance |
| `GET` | `/v1/audit-events` | Inspect security and mutation events |
| `GET` | `/v1/export` | Complete structured JSON export |
| `GET` | `/v1/export/markdown` | Human-readable Markdown export of every memory revision |
| `GET` | `/healthz` | Process liveness |
| `GET` | `/readyz` | PostgreSQL readiness |

Deleting `/v1/owner` requires `confirm_display_name` to exactly match the owner.
The database cascades the deletion through all owner data. Cloud SQL backups and
provider-side data have separate retention lifecycles; see the threat model.
