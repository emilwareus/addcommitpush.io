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

Request the microphone with echo cancellation, noise suppression, and automatic
gain control. Echo cancellation is what makes barge-in work on laptop speakers:
without it the assistant's own voice re-enters the microphone and trips server
voice activity detection.

Life configures transcription pinned to the owner's language, `near_field` input
noise reduction, semantic voice activity detection at `medium` eagerness,
interruption, one-question-at-a-time interview behavior, and these tools:

- `record_life_memory`
- `search_life_memory`
- `explore_life_memories`

Noise reduction runs before turn detection, so it reduces false turn ends in a
noisy room. Eagerness sets how long a pause may run before the model answers:
`low` allows 8 seconds, `medium` 4, `high` 2.

## 2a. Input transcription is a separate model

The Realtime model consumes audio directly. Input transcription is a second,
asynchronous model whose output is guidance about what was said, not what the
model heard. The two can disagree.

`audio.input.transcription.language` is therefore required, derived from the
owner's `locale`. Left unset, the transcriber auto-detects a language per
utterance, and on a wrong guess it _translates_ rather than transcribes. The
visible symptom is an assistant that answers your English correctly while the
transcript records your turn in Norwegian or Swedish — and because the durable
turn commit stores that transcript, the person's own words enter their permanent
life record in a language they never spoke.

A misdetection is silent. Nothing in the event stream reports it.

## 2b. Retune turn taking mid-session

`session.update` changes any field except `model` and `voice`. Send it over the
data channel to re-tune turn taking without reconnecting, then read the effective
value back from `session.updated`.

Echo the whole `audio.input` object the server reported in `session.created`,
with only `eagerness` changed. A partial `audio.input` risks dropping the
transcription model and noise reduction Life minted, and losing input
transcription silently stops every later turn from being saved.

```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "audio": {
      "input": {
        "noise_reduction": { "type": "near_field" },
        "transcription": { "model": "gpt-4o-transcribe", "language": "en" },
        "turn_detection": {
          "type": "semantic_vad",
          "eagerness": "low",
          "create_response": true,
          "interrupt_response": true
        }
      }
    }
  }
}
```

`eagerness` may also come back as `auto`, the provider default, which behaves as
`medium`. Accept it.

## 2c. Interrupt the assistant

Speaking over the assistant interrupts it automatically because
`interrupt_response` is set.

To interrupt from the UI, send `output_audio_buffer.clear`, which discards the
audio the server already buffered for WebRTC playback. Precede it with
`response.cancel` **only while a response is still being generated**. Generation
usually finishes seconds before playback does, and cancelling when there is
nothing to cancel makes the server emit an `error` event.

The server then emits `output_audio_buffer.cleared`. Treat a `cleared` that
arrives after `output_audio_buffer.stopped` for the same response as a no-op: the
audio had already drained, so the person heard the whole answer and the turn
stays saveable.

On WebRTC the server truncates unplayed audio itself, so the client never sends
`conversation.item.truncate`.

## 3. Forward tool calls

For each completed function call, parse its arguments and call the matching Life
endpoint under `/v1/realtime/sessions/{id}/tools/`. Forward the JSON response as
a `function_call_output` with the original `call_id`, then send
`{"type":"response.create"}`.

Search arguments:

```json
{ "query": "places I felt at home", "limit": 12 }
```

Explore arguments:

```json
{ "kind": null, "domain": "family", "limit": 12 }
```

Record arguments:

```json
{
  "kind": "preference",
  "title": "Prefers quiet mornings",
  "body_markdown": "The owner prefers quiet mornings for focused work.",
  "domain": "daily life",
  "occurred_start": null
}
```

Keep every returned memory ID for the current response so the transcript can
preserve citations.

## 4. Commit fully played transcripts

Wait for complete input transcription, complete output audio transcript, and
`response.done`. For WebRTC, also wait for `output_audio_buffer.stopped`, which
confirms the response audio has completely drained after `response.done`. Do not
commit deltas or responses followed by `output_audio_buffer.cleared` or
`conversation.item.truncated`; those contain transcript text the user did not
hear.

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
