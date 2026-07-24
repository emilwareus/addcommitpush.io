# Life HTTP API

All `/v1` routes except OAuth callbacks and the Linear webhook require
`Authorization: Bearer $LIFE_USER_TOKEN`. Authentication resolves one owner;
handlers do not accept an owner ID from the caller.

## Owner and memories

| Method                 | Route                              | Purpose                            |
| ---------------------- | ---------------------------------- | ---------------------------------- |
| `GET`, `PUT`           | `/v1/owner`                        | Read or update the owner profile   |
| `POST`, `GET`          | `/v1/memories`                     | Create or list memories            |
| `GET`, `PUT`, `DELETE` | `/v1/memories/{id}`                | Read, revise, or retract a memory  |
| `POST`                 | `/v1/memories/search`              | Hybrid full-text and vector search |
| `POST`                 | `/v1/memories/search/exact-vector` | Exact-vector evaluation baseline   |
| `GET`                  | `/v1/timeline`                     | List memories by time and domain   |
| `GET`, `POST`, `PUT`   | `/v1/documents/{path.md}`          | Manage a stable Markdown path      |

All active memories belonging to the authenticated owner are available to
list, search, research, text conversations, and voice tools.

Minimal memory creation request:

```json
{
  "kind": "event",
  "title": "Moved to Stockholm",
  "body_markdown": "I moved to Stockholm in 2018.",
  "domain": "home",
  "occurred_start": "2018-01-01T00:00:00Z",
  "occurred_end": null
}
```

## Conversations and voice

| Method          | Route                                               | Purpose                                   |
| --------------- | --------------------------------------------------- | ----------------------------------------- |
| `POST`, `GET`   | `/v1/conversations`                                 | Create or list conversations              |
| `GET`           | `/v1/conversations/{id}`                            | Read conversation state                   |
| `GET`           | `/v1/conversations/{id}/messages`                   | Read its transcript                       |
| `POST`          | `/v1/conversations/{id}/turns`                      | Run and save a text turn                  |
| `POST`          | `/v1/conversations/{id}/voice-turns`                | Process one uploaded audio turn           |
| `POST`          | `/v1/realtime/sessions`                             | Create a conversation and Realtime secret |
| `GET`, `DELETE` | `/v1/realtime/sessions/{id}`                        | Read or close a voice session             |
| `POST`          | `/v1/realtime/sessions/{id}/tools/record-memory`    | Record a memory during voice              |
| `POST`          | `/v1/realtime/sessions/{id}/tools/search-memory`    | Search memories during voice              |
| `POST`          | `/v1/realtime/sessions/{id}/tools/explore-memories` | Browse memories during voice              |
| `POST`          | `/v1/realtime/sessions/{id}/turns`                  | Save completed voice transcripts          |

Session creation accepts only a title. The server supplies the owner profile and
the record/search/explore tool definitions to OpenAI. Tool endpoints verify that
the stored session is active and belongs to the authenticated owner.

See [Realtime voice](REALTIME_VOICE.md) for the WebRTC and event protocol.

## Research, connectors, and operations

| Method        | Route                                     | Purpose                                 |
| ------------- | ----------------------------------------- | --------------------------------------- |
| `POST`        | `/v1/research`                            | Explicit online research with citations |
| `GET`         | `/v1/connectors`                          | List connectors without credentials     |
| `POST`        | `/v1/connectors/{provider}/oauth/start`   | Start OAuth                             |
| `POST`        | `/v1/connectors/{id}/sync`                | Enqueue an import                       |
| `POST`        | `/v1/connectors/{id}/reset-cursor`        | Reset the next import cursor            |
| `DELETE`      | `/v1/connectors/{id}`                     | Remove local credentials                |
| `GET`, `POST` | `/v1/jobs/{id}` and `/v1/jobs/{id}/retry` | Inspect or retry a job                  |
| `POST`, `GET` | `/v1/health-measurements`                 | Write or list health measurements       |
| `GET`         | `/v1/audit-events`                        | List mutation and security events       |
| `GET`         | `/v1/export`                              | Download structured JSON                |
| `GET`         | `/v1/export/markdown`                     | Download readable Markdown              |
| `GET`         | `/healthz`, `/readyz`                     | Liveness and database readiness         |

Research runs only when explicitly requested, stores cited claims as researched
memories, and rejects evidence that is absent from the cited report.
