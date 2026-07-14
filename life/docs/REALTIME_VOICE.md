# Realtime Voice Client Contract

Realtime WebRTC is Life's primary conversational interface. The browser carries
audio directly to OpenAI, while the Life API remains authoritative for identity,
memory access, sensitivity, and durable storage.

```text
browser -- application session --> frontend server -- Life token --> Life API
browser ---------------- ephemeral WebRTC -----------------------> OpenAI
OpenAI function call --> browser --> frontend server --> Life memory tool
completed transcripts --> frontend server --> Life durable turn endpoint
```

The frontend server must map its authenticated user to exactly one Life bearer
token. The browser must never receive that token or the standard OpenAI API key.
It may receive the short-lived OpenAI client secret returned by Life.

## 1. Create the session

The frontend server calls Life on behalf of its logged-in user:

```http
POST /v1/realtime/sessions
Authorization: Bearer <user's Life token>
Content-Type: application/json

{
  "title": "Evening reflection",
  "sensitivities": ["standard", "private"]
}
```

The response contains:

- `realtime_session`: the Life session ID, fixed sensitivity set, durable
  conversation ID, and 60-minute expiry;
- `conversation`: the durable transcript container;
- `client_secret`: the OpenAI ephemeral `value`, its ten-minute connection
  expiry, and effective Realtime session configuration.

Life sends a stable hashed owner ID to OpenAI as the safety identifier. It stores
the OpenAI session ID, never the ephemeral secret. The browser should establish
WebRTC immediately; expiration of the client secret prevents a new connection,
while the connected Realtime session has OpenAI's 60-minute maximum duration.

## 2. Connect WebRTC

Use the returned `client_secret.value` to authenticate the browser's SDP offer
directly to `POST https://api.openai.com/v1/realtime/calls`. Attach the microphone
track, remote audio element, and an `oai-events` data channel before creating the
offer. OpenAI's [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
contains the canonical browser handshake.

Life configures:

- `gpt-realtime-2.1` by default with the `marin` voice;
- input transcription using the configured transcription model;
- low-eagerness semantic VAD, automatic responses, and interruption;
- the `search_life_memory` function tool;
- concise, one-question-at-a-time interview behavior.

The client should not send `session.update` to replace Life's instructions or
tools. This is a behavior contract, not the isolation boundary: the Life tool
endpoint still fixes the owner and sensitivities from server-side state.

## 3. Forward memory function calls

When a completed Realtime response output item has `type: "function_call"` and
`name: "search_life_memory"`, parse its JSON arguments and call the frontend's
authenticated proxy for:

```http
POST /v1/realtime/sessions/{life_session_id}/tools/search-memory
Authorization: Bearer <user's Life token>
Content-Type: application/json

{
  "query": "university studies and how they felt",
  "limit": 12
}
```

The request has no owner or sensitivity field. Life resolves both from the
credential and stored session, verifies that the session is active, embeds the
query, and runs PostgreSQL hybrid retrieval. A different user's token receives
`404` for the session.

Return the JSON hits to Realtime through the data channel, preserving the
function `call_id`:

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "function_call_output",
    "call_id": "call_123",
    "output": "<JSON-encoded Life search response>"
  }
}
```

Then send `{"type":"response.create"}`. Keep the IDs of every memory returned
for that response; they form the allowed citation set when the durable turn is
committed. OpenAI's [function-calling guide](https://developers.openai.com/api/docs/guides/realtime-conversations#function-calling)
defines the event sequence.

## 4. Assemble and commit a completed turn

Track input transcription completion events, output audio-transcript completion
events, and `response.done` by item/response ID. Do not commit deltas. Once the
exact user transcript and complete assistant transcript for one response are
available, proxy this request to Life:

```http
POST /v1/realtime/sessions/{life_session_id}/turns
Authorization: Bearer <user's Life token>
Content-Type: application/json

{
  "user_transcript": "I regret not taking that opportunity in 2019.",
  "assistant_transcript": "That still sounds emotionally present for you. What made the choice difficult?",
  "provider_response_id": "resp_123",
  "cited_memory_ids": ["MEMORY_UUID_RETURNED_BY_THE_TOOL"]
}
```

This endpoint does not regenerate the spoken answer. Outside the audio latency
path, Life retrieves context, asks the Responses API only for structured memory
and contradiction extraction, verifies every evidence excerpt against the exact
user transcript, verifies every citation against this owner and sensitivity set,
embeds accepted memories, and commits both messages and memories atomically.

`provider_response_id` is unique within the conversation. A retry after a
successful commit returns `409` instead of duplicating the turn; the client can
read `/v1/conversations/{conversation_id}/messages` to reconcile state.

## 5. Close and clean up

Stop microphone tracks, close the peer connection and data channel, then proxy:

```http
DELETE /v1/realtime/sessions/{life_session_id}
Authorization: Bearer <user's Life token>
```

Life marks both the Realtime session and its durable conversation complete. Tool
calls and turn commits are rejected after close or the 60-minute expiry. Create a
new Life session to continue talking.

## Client state machine

```text
idle
  -> creating_life_session
  -> connecting_webrtc
  -> listening <-> speaking
  -> resolving_tool -> speaking
  -> committing_turn -> listening
  -> closing
  -> closed
```

Surface provider and Life API errors explicitly. Do not silently switch to the
multipart voice route, discard a failed durable commit, or reuse another user's
session. Wake-word detection, push-to-talk, mute, device selection, and visual
transcript presentation remain frontend responsibilities.
