# Realtime Voice Client Contract

Realtime WebRTC is Life's primary interface. Audio travels directly between the
browser and OpenAI. Identity, memory tools, and durable transcripts go through
the authenticated Life API.

```text
browser -- app session --> Next.js server -- Life token --> Life API
browser ---------------- ephemeral WebRTC ----------------> OpenAI
OpenAI tool call --> browser --> Next.js server --> Life memory tool
completed transcript --> Next.js server --> Life turn endpoint
```

The browser must never receive the Life bearer token or standard OpenAI API key.

## 1. Create a session

```http
POST /v1/realtime/sessions
Authorization: Bearer <Life token>
Content-Type: application/json

{"title":"Evening conversation"}
```

The response contains the durable conversation, Life session, and short-lived
OpenAI client secret. Life stores the OpenAI session ID, not the secret.

## 2. Connect WebRTC

Attach the microphone, remote audio element, and an `oai-events` data channel to
an `RTCPeerConnection`. Send the SDP offer to
`https://api.openai.com/v1/realtime/calls` with `client_secret.value`, then apply
the returned SDP answer.

Life configures transcription, semantic voice activity detection, interruption,
one-question-at-a-time interview behavior, and these tools:

- `record_life_memory`
- `search_life_memory`
- `explore_life_memories`

## 3. Forward tool calls

For each completed function call, parse its arguments and call the matching Life
endpoint under `/v1/realtime/sessions/{id}/tools/`. Forward the JSON response as
a `function_call_output` with the original `call_id`, then send
`{"type":"response.create"}`.

Search arguments:

```json
{"query":"places I felt at home","limit":12}
```

Explore arguments:

```json
{"kind":null,"domain":"family","limit":12}
```

Record arguments:

```json
{
  "kind":"preference",
  "title":"Prefers quiet mornings",
  "body_markdown":"The owner prefers quiet mornings for focused work.",
  "domain":"daily life",
  "occurred_start":null
}
```

Keep every returned memory ID for the current response so the transcript can
preserve citations.

## 4. Commit completed transcripts

Wait for complete input transcription, complete output audio transcript, and
`response.done`. Do not commit deltas.

```http
POST /v1/realtime/sessions/{id}/turns
Authorization: Bearer <Life token>
Content-Type: application/json

{
  "user_transcript":"I do my clearest thinking before breakfast.",
  "assistant_transcript":"What makes that time feel different?",
  "provider_response_id":"resp_123",
  "cited_memory_ids":["MEMORY_UUID_FROM_A_TOOL"]
}
```

This endpoint stores the exact transcripts and citations. It does not regenerate
the answer or run another memory-extraction model. Provider response IDs make
the commit idempotent.

## 5. Close

Stop microphone tracks, close WebRTC resources, and call:

```http
DELETE /v1/realtime/sessions/{id}
Authorization: Bearer <Life token>
```

Life closes the session and completes the durable conversation. Tool calls and
turn commits fail after close or expiry.
