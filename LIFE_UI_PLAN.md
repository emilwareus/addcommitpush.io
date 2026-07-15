# Life UI implementation plan

- Status: proposed
- Repository state reviewed: `build-personal-life-agent` at `22a7907`
- Scope: Next.js UI, its server-side proxy, and the smallest backend contract change needed for OAuth
- Non-goal: this document does not implement the UI

## Decision summary

Build Life as a private, dynamic application under `/life` inside the existing Next.js 16 app. Keep
the public blog static and visually unchanged. The Life route tree gets its own layout, navigation,
error boundaries, and privacy policy. It must not load PostHog or include Life URLs in the sitemap.

Use one authentication path:

- Emil signs in with a separate high-entropy Life UI password.
- A Next.js Route Handler verifies a scrypt password hash, checks the configured Life bearer token
  against `GET /v1/owner`, and confirms the returned owner UUID against an allowlisted UUID.
- Next.js returns a short-lived, signed, `HttpOnly` application-session cookie. The cookie contains
  no Life token and no personal data.
- All Life data access goes through server-only code. That code reads the manually provisioned Life
  bearer token from the deployment secret store and attaches it to requests to Axum.
- The browser receives only the Next.js application session and, while starting voice, the ten-minute
  OpenAI Realtime client secret minted by Life.

This fits the backend's existing identity boundary. Axum continues to derive `owner_id` only from the
bearer credential. Next.js adds human authentication and never lets a request body, URL, tool call, or
browser-side state select an owner.

The primary voice interface uses native browser WebRTC. It follows `life/docs/REALTIME_VOICE.md`
exactly: create a Life session, connect to OpenAI with the ephemeral secret, forward memory tools
through the authenticated Next.js proxy, assemble completed transcripts, commit each provider
response once, and explicitly close the session. Do not silently switch to the multipart voice route
when Realtime fails.

## Product boundary

### Required first release

1. Owner-only login and logout.
2. Life dashboard with recent active memories, timeline entries, conversations, connector state,
   health summary, and audit activity.
3. Realtime voice conversation with live transcript, mute, end-session control, memory tool status,
   durable-commit status, and explicit errors.
4. Memory list, hybrid search, filters, detail, provenance, relations, revisions, create, revise, and
   retract operations.
5. Timeline grouped in the owner's timezone, with range and domain filters.
6. Settings for the owner profile, sensitivity defaults, GitHub/Linear/Gmail connector management,
   exports, and logout.

### Follow immediately after the core release

- Conversation history and transcript pages.
- Contradiction review and resolution.
- Explicit online research with preserved citations.
- Health measurement browsing and manual entry.
- Reflections and adaptive interviews.
- Memory-edge creation and a compact relationship view.

These are already supported by the backend. They should use the same typed client and privacy
boundary, not separate integration paths.

### Explicit non-goals

- No public registration, account selection, or user-provisioning UI. Owners and credentials remain
  manually provisioned in PostgreSQL.
- No Life bearer token in React props, client JavaScript, HTML, cookies, local storage, session
  storage, URLs, or logs.
- No direct browser calls to the Life API.
- No alternate database, vector store, queue, or browser-side cache of durable personal data.
- No automatic WebRTC-to-multipart voice fallback.
- No wake word in the first release. The browser contract allows it later, but explicit Start and End
  controls are easier to reason about and test.
- No ambient web research. Every research run starts from an explicit owner action and query.

## What the backend already provides

The backend is a single Rust crate with an Axum API, PostgreSQL 18 plus pgvector, and a separate Rust
worker. PostgreSQL is both the durable store and connector job queue.

### Authentication and owner isolation

- Every protected `/v1` handler requires `Authorization: Bearer <token>`.
- `api_credentials` stores only SHA-256 token digests. Credentials can expire or be revoked.
- There is no user-creation API. Provisioning and rotation are direct PostgreSQL operator actions.
- Authentication resolves the credential to one `owner_id`. Handlers do not accept an owner ID.
- Repository queries bind that owner ID, and composite foreign keys block cross-owner relationships.
- Another owner's resource generally appears as `404`, including Realtime sessions.
- OAuth callbacks and the Linear webhook are public because providers must call them. OAuth uses a
  ten-minute, one-use, hashed state; Linear verifies HMAC and a one-minute timestamp window.

The UI must preserve this model. The configured bearer credential belongs only to Emil, and the
frontend must also compare `GET /v1/owner.id` with `LIFE_EXPECTED_OWNER_ID` before establishing an
application session.

### Durable memory model

`Memory` is the canonical display and retrieval unit. Relevant fields are:

| Field group | Fields | UI meaning |
| --- | --- | --- |
| Identity | `id`, `owner_id`, `kind`, `title`, `domain` | Stable detail link, type badge, grouping |
| Content | `body_markdown`, `document_path` | Rendered Markdown and optional durable virtual path |
| Structured claim | `subject`, `predicate`, `object_value` | Inspectable fact triple; JSON value must remain typed |
| Trust | `epistemic_status`, `confidence`, `evidence_excerpt` | How the claim entered Life and what supports it |
| Privacy | `sensitivity` | `standard`, `private`, `intimate`, or `restricted` |
| Priority | `importance` | Integer from 0 to 10 |
| Valid time | `occurred_start`, `occurred_end`, `temporal_precision` | Timeline placement and precision |
| Provenance | `source_id`, `source_message_id`, `derived_from_id` | Imported, conversational, researched, or derived source |
| Revision time | `supersedes_id`, `superseded_at`, `recorded_at`, `updated_at` | Append-only history, never in-place rewriting |

Kinds include documents, events, facts, identity, relationships, beliefs, emotions, goals, regrets,
secrets, journals, reflections, health, research, life periods, people, places, projects, decisions,
achievements, habits, preferences, and values. Epistemic states include `user_stated`, `observed`,
`imported`, `researched`, `inferred`, `disputed`, `retracted`, and `superseded`.

Normal list, timeline, and search queries return only active, non-retracted memories. Revising a
memory appends a new row and marks the prior row superseded. Retraction also appends a new retraction
row. The UI must use "Revise" and "Retract" language, never imply destructive editing or deletion.

Hybrid search embeds the query, gets full-text candidates with PostgreSQL `websearch_to_tsquery`,
gets semantic candidates through pgvector HNSW cosine distance, and combines their ranks with
reciprocal-rank fusion. Importance and recency break close scores. The production search endpoint is
the UI path; exact-vector search is an evaluation tool and should not appear in normal navigation.

### Timeline

`GET /v1/timeline` returns active memories ordered by `occurred_start DESC NULLS LAST`, then
`recorded_at`. It accepts `start`, `end`, `domain`, and `limit` up to 500. Bounds apply to
`occurred_start`, not interval overlap. The UI must state this behavior in filter help and keep an
"Undated" group for rows whose `occurred_start` is null when no lower bound excludes them.

Render dates in `Owner.timezone`, while sending ISO instants to the API. Show the stored temporal
precision rather than inventing precision in formatting. A year-level memory should display as a
year even though its bound is represented by a timestamp.

### Conversations, interviews, and voice

- Conversations have `conversation`, `interview`, or `research` mode and `active` or `completed`
  status.
- Messages preserve role, content, modality, provider response ID, cited memory IDs, and timestamp.
- Text turns retrieve context, generate an answer, verify extracted evidence against the current user
  message, and atomically commit messages plus accepted memories.
- Interviews create a conversation, opening question, rationale, and explicit question lifecycle.
- The multipart voice route transcribes, reasons, synthesizes MP3, and commits after all provider work
  succeeds. It is a separate client mode, not a recovery path for Realtime.
- Realtime creates a durable conversation and a Life session fixed to one owner and sensitivity set.
  The OpenAI secret lasts ten minutes for connection; the connected Life/OpenAI session lasts at most
  60 minutes.

Life configures the Realtime session server-side with `gpt-realtime-2.1` by default, the `marin`
voice, configured input transcription, low-eagerness semantic VAD, automatic responses,
interruption, and the `search_life_memory` function. The browser must not replace the instructions or
tools with `session.update`.

### Research

`POST /v1/research` accepts an explicit query and sensitivity. It searches the web through OpenAI,
returns a Markdown report plus citations, verifies that every extracted evidence excerpt occurs in
the report and every source URL is in the provider citations, and stores accepted memories with
`researched` epistemic status. The UI must display the report, source links, and created memories as
one result. It must not present researched claims as owner-stated facts.

### Connectors and jobs

GitHub, Linear, and Gmail use OAuth. Tokens are encrypted with AES-256-GCM before PostgreSQL storage;
list responses never contain them. Connector states are `pending`, `connected`, `syncing`, `error`,
or `revoked`. Sync creates an idempotent PostgreSQL job with `queued`, `running`, `completed`, or
`failed` state.

- GitHub imports authenticated activity events.
- Linear imports the owner's issues and can enqueue work from verified webhooks.
- Gmail imports recent/incremental message metadata and snippets, not full bodies or attachments.
- Changed source records append memory revisions; retries do not duplicate unchanged records.
- A stale Gmail history cursor fails explicitly. Cursor reset is a deliberate operator action.
- Revoking a connector erases local encrypted credentials but does not revoke the provider grant.

### Health data

Health measurements are vendor-neutral: metric code, numeric value, unit, measured interval,
arbitrary JSON dimensions, optional source record, and creation time. The list endpoint currently
returns the newest 1,000 measurements without server-side metric or time filters. Initial charts can
group the returned data by `metric_code` and `unit`; larger datasets should prompt a backend query
extension rather than a second health storage model.

### Audit, portability, and deletion

- Audit events expose action, resource kind/ID, metadata, and occurrence time, newest first, up to
  1,000 rows.
- JSON export includes the complete owner graph. Markdown export includes every memory revision.
- Owner deletion requires an exact display-name confirmation and cascades online PostgreSQL data.
  Backups, logs, exports, provider data, and OpenAI retention have separate lifecycles.

## Backend API map and UI use

All rows below are bearer-protected unless marked public.

### Owner and knowledge

| Method | Backend path | Planned UI use |
| --- | --- | --- |
| `GET / PUT / DELETE` | `/v1/owner` | Login identity check; profile settings; guarded data deletion |
| `POST / GET` | `/v1/memories` | Create memory; paged active-memory browser |
| `GET / PUT / DELETE` | `/v1/memories/{id}` | Detail; append revision; append retraction |
| `POST` | `/v1/memories/search` | Normal hybrid search with explicit sensitivities |
| `POST` | `/v1/memories/search/exact-vector` | Evaluation only; no normal UI |
| `GET` | `/v1/timeline` | Timeline range/domain query |
| `GET / POST / PUT` | `/v1/documents/{path.md}` | Later document editor; list through memory kind filter |
| `POST` | `/v1/memory-edges` | Later relationship creation |
| `GET` | `/v1/memories/{id}/edges` | Memory detail relations |
| `GET / PUT` | `/v1/contradictions`, `/v1/contradictions/{id}` | Review and resolve conflicts |
| `POST` | `/v1/reflections` | Explicit reflection action from dashboard/search |

### Conversations and voice

| Method | Backend path | Planned UI use |
| --- | --- | --- |
| `POST / GET` | `/v1/conversations` | Text conversation creation and history list |
| `GET` | `/v1/conversations/{id}` | Conversation header/state |
| `GET` | `/v1/conversations/{id}/messages` | Durable transcript and Realtime reconciliation |
| `POST` | `/v1/conversations/{id}/turns` | Text conversation turn |
| `POST` | `/v1/conversations/{id}/voice-turns` | Known but excluded from Realtime recovery logic |
| `POST` | `/v1/interviews` | Start a themed interview |
| `GET / DELETE` | `/v1/interviews/{id}` | Interview state and deliberate completion |
| `GET` | `/v1/interviews/{id}/questions` | Question history and status |
| `POST` | `/v1/realtime/sessions` | Mint Life session and OpenAI ephemeral secret |
| `GET / DELETE` | `/v1/realtime/sessions/{id}` | Inspect or close the owner-scoped session |
| `POST` | `/v1/realtime/sessions/{id}/tools/search-memory` | Forward `search_life_memory` calls |
| `POST` | `/v1/realtime/sessions/{id}/turns` | Atomically extract and commit completed transcripts |

### Research, connectors, health, and operations

| Method | Backend path | Planned UI use |
| --- | --- | --- |
| `POST` | `/v1/research` | Explicit research workspace |
| `GET` | `/v1/connectors` | Provider cards and status |
| `POST` | `/v1/connectors/{provider}/oauth/start` | Begin OAuth |
| `GET`, public | `/v1/oauth/{provider}/callback` | Provider callback; requires redirect contract change below |
| `POST` | `/v1/connectors/{id}/sync` | Enqueue sync and receive job |
| `POST` | `/v1/connectors/{id}/reset-cursor` | Confirmed recovery operation |
| `DELETE` | `/v1/connectors/{id}` | Remove local credentials |
| `GET / POST` | `/v1/jobs/{id}`, `/v1/jobs/{id}/retry` | Poll sync; explicitly retry failed job |
| `POST`, public | `/v1/webhooks/linear` | No UI; provider integration only |
| `POST / GET` | `/v1/health-measurements` | Manual entry and health views |
| `GET` | `/v1/audit-events` | Recent-activity view and security audit |
| `GET` | `/v1/export`, `/v1/export/markdown` | Data and privacy downloads |
| `GET`, public | `/healthz`, `/readyz` | Deployment monitoring, not owner dashboard auth |

## Proposed architecture

```text
                                  public site
browser ---------------------------------------------------> Next.js static routes

                                  private Life UI
browser -- signed HttpOnly UI cookie --> Next.js Server Components / Route Handlers
                                               |
                                               | server-only LIFE_USER_TOKEN
                                               v
                                       Rust/Axum Life API
                                               |
                                  owner-scoped PostgreSQL transactions
                                               |
                                  PostgreSQL queue --> Rust worker --> providers

                                  Realtime voice
browser -- create session --> Next.js --> Life API --> OpenAI client secret
browser -- microphone/audio + events -------- WebRTC --------> OpenAI Realtime
browser -- tool call/turn commit --> Next.js --> Life API --> PostgreSQL/OpenAI Responses
```

### Rendering model

Life pages are personalized and must be dynamic. Set `export const dynamic = 'force-dynamic'` and
`export const revalidate = 0` on the authenticated Life layout or pages, and use `cache:
'no-store'` for Life calls. This is intentionally different from static blog routes. It does not
change the blog's `dynamic = 'error'` and `revalidate = false` contract.

Use Server Components for initial data and read-heavy panels. Use Client Components only for:

- login form state;
- filters that should update without navigation;
- mutation feedback and confirmations;
- connector job polling;
- charts with interaction;
- the complete Realtime/WebRTC state machine.

Do not put fetched Life objects into a global client store. Server-render the initial view, keep only
the active panel's state in its Client Component, and refresh server data after mutations.

### Separate public and private layouts

The current root layout always installs PostHog and public navigation. Life data must not pass through
that tree. Refactor route groups without changing URLs:

```text
app/
  layout.tsx                         # html, body, fonts, globals only
  (public)/
    layout.tsx                       # PHProvider, PostHogPageView, Navigation, site-shell
    page.tsx                         # existing /
    blog/[slug]/page.tsx             # existing public routes moved here
    brain/...
    presentations/...
    status/...
    about/...
  (life)/
    life/
      layout.tsx                     # private visual shell, metadata noindex
      login/page.tsx                 # only unauthenticated Life surface
      (authenticated)/
        layout.tsx                   # server-side requireLifeSession()
        page.tsx                     # /life dashboard
        voice/page.tsx
        memories/page.tsx
        memories/[id]/page.tsx
        timeline/page.tsx
        conversations/page.tsx
        conversations/[id]/page.tsx
        research/page.tsx
        health/page.tsx
        contradictions/page.tsx
        settings/page.tsx
        settings/connectors/page.tsx
        settings/data/page.tsx
  api/life/...                       # authenticated BFF Route Handlers
  robots.ts
  sitemap.ts
proxy.ts                             # Next.js 16 request gate, formerly middleware
```

The route-group move is mechanical but high-risk because it touches established URLs. Do it before
Life UI work, then prove that every public URL, sitemap entry, feed, metadata object, and static build
still behaves identically.

## Authentication design

### Why this design

The backend bearer token authenticates an API principal, not a browser session. Asking Emil to type
that token into a web form would put the credential in browser memory and violate the backend's
frontend contract. A generic Basic Auth prompt also has poor logout and session controls. A full
third-party identity provider adds an external account and dependency for a single owner.

Use a small owner-only password session instead. The Life token stays in the server secret store and
still remains the sole identity presented to Axum.

### Required secrets

| Environment variable | Purpose |
| --- | --- |
| `LIFE_API_BASE_URL` | HTTPS base URL of the Axum service |
| `LIFE_USER_TOKEN` | Emil's manually provisioned high-entropy bearer credential |
| `LIFE_EXPECTED_OWNER_ID` | UUID that `GET /v1/owner` must return |
| `LIFE_UI_PASSWORD_HASH` | Versioned scrypt hash with salt; never store the plaintext password |
| `LIFE_UI_SESSION_SECRET` | At least 32 random bytes for HMAC signing application sessions |
| `LIFE_UI_ORIGIN` | Exact production frontend origin for Origin/Host checks |

None may use a `NEXT_PUBLIC_` prefix. Parse and validate the complete server configuration lazily at
request time so public static builds do not require Life secrets, but a Life request fails closed when
configuration is absent or malformed.

### Auth flow

```text
1. Browser -> GET /life
2. proxy.ts verifies __Host-life_session signature and expiry
3a. Invalid/missing cookie -> 303 /life/login?next=/life
3b. Valid cookie -> authenticated Life route

4. Browser -> POST /api/life/auth/login { password, next }
5. Route Handler:
   - rejects an invalid Origin and oversized/invalid body
   - verifies LIFE_UI_PASSWORD_HASH with scrypt and constant-time comparison
   - calls GET {LIFE_API_BASE_URL}/v1/owner with server-side LIFE_USER_TOKEN
   - requires response.owner.id === LIFE_EXPECTED_OWNER_ID
   - emits a signed, short-lived application session
6. Route Handler -> Set-Cookie: __Host-life_session=<signed payload>
   HttpOnly; Secure; SameSite=Strict; Path=/
7. Browser -> 303 validated same-origin `next` path

8. Authenticated page or BFF request:
   - proxy.ts verifies cookie before routing
   - authenticated layout/Route Handler verifies it again at the trust boundary
   - server client attaches LIFE_USER_TOKEN to the Axum request
   - Axum hashes the token and resolves Emil's owner ID

9. Browser -> POST /api/life/auth/logout
10. Route Handler expires the cookie and redirects to /life/login
```

### Session format

Use a compact versioned payload containing only `sub: "life-owner"`, `iat`, `exp`, and a random
nonce. Sign it with HMAC-SHA-256 through Web Crypto so both `proxy.ts` and Node Route Handlers can
verify it. An eight-hour absolute expiry is sufficient; do not implement "remember me" in the first
release. The payload needs no encryption because it contains no personal data or credential.

`proxy.ts` should match `/life/:path*` and `/api/life/:path*`. Allow only the login page and login
handler without a session. Return redirects for document requests and JSON `401` for API requests.
The authenticated layout and each Route Handler still call `requireLifeSession`; the proxy is an
early gate, not the only authorization check.

If Axum returns `401`, clear the application cookie and require a fresh login. This catches bearer
rotation or revocation. Never forward Axum's `Authorization` header, request headers, or raw error
body to the browser.

### Login abuse controls

- Use a high-entropy password distinct from the Life token and session secret.
- Apply a production WAF rate limit to `/api/life/auth/login`, for example five failures per IP per
  15 minutes, plus a conservative global ceiling.
- Return the same response and similar work for unknown/incorrect credentials.
- Record only timestamp, result category, and request ID. Do not log passwords, cookies, IP-derived
  identity profiles, bearer tokens, or response bodies.
- Accept `next` only when it is a relative path under `/life`; otherwise reject the request.
- Use POST for login and logout. No state mutation may use GET.

## API integration approach

### Typed server client

Add a server-only Life module:

```text
lib/life/
  contracts.ts          # TypeScript types plus Zod response/request schemas
  constants.ts          # kinds, statuses, sensitivities, temporal precision
  errors.ts             # sanitized LifeApiError and UI mapping
  config.server.ts      # validated server-only environment
  session.server.ts     # HMAC session issue/verify, requireLifeSession
  client.server.ts      # fetch wrapper that adds the bearer token
  queries.server.ts     # composed dashboard/detail queries
  formatting.ts         # timezone and enum display helpers safe for either runtime
```

Use the Rust structs in `life/src/models.rs` as the contract source. Mirror UUIDs and timestamps as
strings at the transport boundary. Validate every backend response with Zod before returning it to a
component. Do not use `any` or assume provider JSON shapes in UI code.

`client.server.ts` should:

1. accept a fixed method/path and typed body;
2. construct URLs only below the configured Life base URL;
3. add `Authorization: Bearer ${LIFE_USER_TOKEN}` and `Accept: application/json`;
4. set `cache: 'no-store'` and an explicit timeout with `AbortSignal.timeout`;
5. parse the backend's `{ error: { code, message } }` envelope on failure;
6. keep internal/upstream details server-side and map known `401`, `404`, `409`, `422`, `502`, and
   `503` cases to stable UI errors;
7. attach a request ID for correlation without logging bodies.

Do not create a generic open proxy. Server Components can call the server client directly. Client
Components call narrow same-origin Route Handlers that validate their own request schema and invoke
one specific server-client operation.

### Browser-facing Route Handlers

Organize BFF handlers by action rather than exposing arbitrary backend paths:

```text
app/api/life/
  auth/login/route.ts
  auth/logout/route.ts
  memories/route.ts
  memories/search/route.ts
  memories/[id]/route.ts
  contradictions/[id]/route.ts
  realtime/sessions/route.ts
  realtime/sessions/[id]/route.ts
  realtime/sessions/[id]/search-memory/route.ts
  realtime/sessions/[id]/turns/route.ts
  connectors/[provider]/start/route.ts
  connectors/[id]/sync/route.ts
  connectors/[id]/reset-cursor/route.ts
  connectors/[id]/revoke/route.ts
  jobs/[id]/route.ts
  jobs/[id]/retry/route.ts
  owner/route.ts
  research/route.ts
  reflections/route.ts
  health/route.ts
  export/json/route.ts
  export/markdown/route.ts
```

Every mutating handler must verify the application session, exact `Origin`, content type, and Zod
body before calling Life. SameSite cookies help with CSRF but do not replace Origin checks. Download
handlers must preserve `Content-Type` and `Content-Disposition`, stream the backend body, and set
`Cache-Control: private, no-store`.

### Fetching and refresh behavior

- Server Components fetch initial dashboard, detail, and list data directly in parallel.
- Search uses POST because the query and sensitivity selection are personal data. Do not put the
  free-text query in the URL or browser history.
- Stable list filters such as memory kind, domain, and timeline range may use URL search parameters.
- After a mutation, refresh the affected server route and keep the success message local.
- Use the already installed SWR only for bounded polling, primarily active connector jobs. Stop on
  `completed` or `failed`; do not poll every dashboard panel.
- No Next.js data cache, CDN cache, service worker cache, or prefetch of private detail routes.
- Add `Cache-Control: private, no-store, max-age=0` and `Vary: Cookie` to Life HTML and API responses.

## Route and screen specification

### `/life/login`

Purpose: the only unauthenticated Life page.

- Minimal Life wordmark, password input, submit button, and generic error.
- No public site navigation, PostHog, owner name, API health, or explanation of stored data.
- Disable submit while verifying but keep keyboard and screen-reader behavior.
- Redirect an already authenticated session to the validated `next` route or `/life`.

### `/life`

Purpose: a compact view of what Life currently knows and what changed.

Fetch in parallel:

- owner;
- `GET /memories?limit=8`;
- `GET /timeline?limit=12`;
- conversations, sliced to the most recent five;
- connectors;
- audit events, sliced to recent activity;
- health measurements, grouped into the latest value per metric;
- contradictions, to show pending count.

Panels:

1. **Start a conversation**: dominant Voice action plus secondary Text and Interview actions.
2. **Recent memories**: title, kind, domain, sensitivity, epistemic status, occurred/recorded time.
3. **Timeline**: the next useful chronological slice, with undated items separated.
4. **Recent conversations**: mode, status, update time, transcript link.
5. **Sources**: GitHub, Linear, and Gmail status, last sync, current error.
6. **Health**: latest value/time per metric, explicitly labeled by unit.
7. **Needs review**: pending contradictions and connectors whose current state is `error`.
8. **Activity**: audited mutations with human-readable action labels. Keep raw metadata behind a
   disclosure control.

The existing API over-fetches conversations, health, contradictions, and audit events for this page.
That is acceptable for the owner-only first release, but measure response sizes. Add limit/filter
query parameters to Axum before those responses become large; do not introduce a frontend shadow
database for summaries.

### `/life/voice`

Purpose: the primary low-latency Life interaction.

Before connecting:

- Title field with a useful default based on local time, editable before session creation.
- Sensitivity selector defaulting to `standard` and `private`.
- `intimate` and `restricted` require explicit selection for every session. Explain that the choice is
  fixed until the session ends.
- Microphone selection after permission, with a clear permission-denied state.
- Start button; do not request microphone permission on page load.

While connected:

- Large listening/speaking state, elapsed time, fixed sensitivity badges, and connection state.
- Live user and assistant transcript. Deltas are visually provisional; completed text is distinct.
- Mute/unmute, input-device selector where supported, and End session.
- A small tool indicator such as "Searching 12 memories" without dumping private tool results into
  logs or transient notifications.
- Per-turn persistence marker: `speaking`, `committing`, `saved`, or `not saved`.
- Explicit error panel with action appropriate to state. A failed durable commit must remain visible
  and retryable with the same provider response ID.

After close:

- Stop every local media track, detach the remote stream, close the data channel and peer connection,
  then call the Life close endpoint.
- Link to the durable conversation transcript.
- If the tab disappears without an acknowledged close, local resources still close during cleanup;
  the server-side session expires at its fixed 60-minute limit. Do not claim it was closed unless the
  DELETE succeeded.

### `/life/memories`

Purpose: browse active memory and run hybrid retrieval.

Two explicit modes:

- **Browse** calls `GET /memories` with kind, domain, limit, and offset.
- **Search** calls `POST /memories/search` with query, limit, and sensitivities.

Filters must cover kind, domain, and sensitivity. Browse cannot currently filter sensitivity on the
server, so either filter only the current page with a clear label or add a backend sensitivity query
before presenting it as a global filter. Search defaults to standard/private. Intimate/restricted are
always opt-in.

Search result cards show title, excerpt, kind, domain, sensitivity, epistemic status, occurred time,
source presence, and score. Describe score as retrieval rank, not probability or confidence. Browse
cards show confidence and importance separately.

Add a manual-memory form from the full `MemoryInput` contract. Use constrained enum controls,
owner-timezone date inputs, Markdown body, optional structured triple, and a JSON editor only for
`object_value`. Validate time bounds, confidence, importance, and document-path rules before submit.

### `/life/memories/[id]`

Purpose: inspect one assertion and its context.

- Render Markdown safely with `react-markdown` and `remark-gfm`; do not enable raw HTML.
- Show all trust, sensitivity, temporal, structured, and provenance fields.
- Fetch relations and resolve the other memory titles in one bounded parallel batch where possible.
- Link the source conversation when `source_message_id` is present and exposed by a future lookup.
- Link the prior revision through `supersedes_id`. The current API can walk backward one request at a
  time; add a revision-chain endpoint later if this becomes slow.
- "Revise" starts from the current fields and calls PUT, creating a new row.
- "Retract" uses an explicit confirmation and calls DELETE, creating a retraction revision.
- Do not offer hard delete.

### `/life/timeline`

Purpose: view memories by valid time, not by ingestion time.

- Range presets: all, year, quarter, month, plus custom owner-timezone bounds.
- Domain and kind presentation filters. Domain is server-side; kind is local until the backend accepts
  it.
- Group day/minute precision by day, month precision by month, year precision by year, and unknown
  precision under Undated.
- Intervals get a visible start/end connector. Do not imply interval-overlap filtering because the
  backend currently filters on `occurred_start` only.
- On narrow screens use a single chronological rail. On wide screens use a two-column year marker
  and event list, not a dense chart that hides Markdown and provenance.

### `/life/conversations` and `/life/conversations/[id]`

- List mode, title, status, creation/update time.
- Transcript renders role, modality, time, and cited-memory links.
- Realtime commit conflict reconciliation reads this endpoint to determine whether a provider response
  already exists.
- Text composer posts turns only to active conversations and shows created memories after the answer.
- Interview transcripts additionally show question status and rationale.

### `/life/settings` and `/life/settings/connectors`

Owner settings:

- Display name, IANA timezone, locale, and profile Markdown from `GET/PUT /owner`.
- Profile copy must warn that it is included in model context for relevant agent operations.
- Default UI sensitivity preferences may be stored only in the signed application session or a new
  backend owner-preferences field. Do not put private content in local storage.

Connector cards:

- provider, account name, status, scopes, token expiry, last sync, last error;
- Connect/Reconnect starts OAuth;
- Sync now enqueues or returns the existing queued/running job;
- job polling shows attempts and sanitized failure detail;
- Retry appears only for a failed job;
- Reset cursor requires an explicit warning, especially for Gmail;
- Revoke confirms that local tokens are erased and that provider-side revocation is separate.

The current OAuth callback returns connector JSON on the Life API origin. Change it before shipping
the connector UI:

1. Add a validated `LIFE_FRONTEND_BASE_URL` to the backend.
2. On successful callback, return `303 See Other` to
   `${LIFE_FRONTEND_BASE_URL}/life/settings/connectors?oauth=<provider>&status=connected`.
3. On typed OAuth failure, redirect with only provider and a stable error code. Do not put provider
   tokens, OAuth code/state, connector JSON, or raw upstream messages in the URL.
4. Keep the one-use state as the owner binding. Do not accept an arbitrary `return_to` from the
   browser.

This is one narrow backend change. It removes the need for popup polling or a second OAuth path.

### `/life/research`

- Require an explicit query and sensitivity on every run.
- State that profile Markdown is supplied to disambiguate the owner.
- The result view keeps report, citations, and stored researched memories together.
- Open source URLs with safe external-link attributes.
- Make ambiguity visible; do not convert absence of created memories into an error if the report could
  not support durable claims.
- Research is never scheduled or triggered from ordinary search.

### `/life/health`

- Group series only when metric code and unit match.
- Show measured start/end, dimensions, and provenance.
- Manual entry uses numeric value, unit, owner-timezone datetime, optional end, and typed JSON
  dimensions.
- Use the existing Recharts dependency for accessible trend charts, but keep the exact values in a
  table. Charts must not imply normalized semantics across units or vendors.

### `/life/contradictions` and `/life/settings/data`

Contradictions show both memory records, explanation, status, and resolution. Resolution requires a
non-empty note and one of `confirmed`, `not_a_contradiction`, or `resolved`.

Data settings provide JSON and Markdown exports with no caching. Owner deletion belongs behind a
separate danger panel, exact display-name entry, second confirmation, and a fresh password check.
After success, clear the application session. Explain backup and provider retention before the final
action.

## Component breakdown

### New shared Life components

| Component | Responsibility | Runtime |
| --- | --- | --- |
| `LifeShell` | Private header, desktop rail/mobile navigation, logout | Server shell plus small client menu |
| `LifePageHeader` | Kicker, title, description, optional actions | Server |
| `LifeErrorPanel` | Stable, accessible error presentation with request ID | Either |
| `SensitivitySelector` | Ordered explicit sensitivity selection and warnings | Client |
| `SensitivityBadge` | Consistent privacy label | Server-safe |
| `EpistemicBadge` | Trust/provenance label | Server-safe |
| `MemoryCard` | Compact browse/search/timeline representation | Server-safe |
| `MemoryMetadata` | Full trust, time, source, revision fields | Server-safe |
| `MarkdownContent` | Safe GFM rendering with no raw HTML | Server-safe |
| `TimelineRail` | Precision-aware chronological grouping | Server-safe |
| `ActivityList` | Audit action mapping and metadata disclosure | Server-safe |
| `ConnectorCard` | OAuth, sync, reset, revoke, job state | Client |
| `ConfirmAction` | Accessible confirmation for destructive/sensitive actions | Client |
| `HealthSeries` | Recharts visualization plus exact-value table | Client |

### Realtime components and modules

| Component/module | Responsibility |
| --- | --- |
| `VoiceSessionSetup` | title, sensitivity, permission, input-device selection |
| `VoiceSessionPanel` | connected session controls and state |
| `VoiceTranscript` | provisional deltas, completed turns, citation links, save state |
| `VoiceStatus` | idle/connecting/listening/speaking/tool/commit/closing/error presentation |
| `useRealtimeVoiceSession` | owns peer connection, media stream, data channel, cleanup |
| `realtime-events.ts` | strict discriminated event parsing; rejects malformed events |
| `realtime-turn-assembler.ts` | pairs exact input/output transcripts with provider response IDs |
| `realtime-tool-handler.ts` | forwards fixed memory function, returns output by `call_id` |

The hook is the only owner of `RTCPeerConnection`, `MediaStream`, `RTCDataChannel`, the ephemeral
secret, and event listeners. Components receive derived state and commands. This prevents two peers
or duplicate listeners after React rerenders.

### Existing design system to reuse

- IBM Plex Mono body type and Spectral display headings.
- CSS variables for paper/ink light mode and dark mode.
- `site-container`, `display-heading`, `section-kicker`, dashed borders, zero radius, flat surfaces.
- `Button`, `Card`, `Badge`, `Popover`, `Slider`, and `Textarea` under `components/ui`.
- Installed Radix primitives for dialog, select, checkbox, tabs, and accessible confirmation flows.
- `lucide-react` icons, `cn`, `date-fns`, `react-markdown`, `remark-gfm`, SWR, Zod, and Recharts.

Do not reuse the public `Navigation` inside Life. Create a compact private shell that looks like the
same site but prioritizes frequent app navigation and a visible locked/private state. Do not add a
new component library or a rounded SaaS-dashboard visual language.

## Realtime WebRTC flow in detail

### Client state machine

```text
idle
  -> requesting_microphone
  -> creating_life_session
  -> connecting_webrtc
  -> listening <-> speaking
  -> resolving_memory_tool -> speaking
  -> committing_turn -> listening
  -> closing
  -> closed

Any active state -> error_with_cleanup
```

Do not model errors as `idle`; an error can leave a durable conversation, an active provider session,
or an uncommitted transcript and must remain visible.

### Connection sequence

1. User explicitly selects sensitivity and presses Start.
2. Browser requests microphone media and stores the selected audio track in component memory.
3. Browser calls `POST /api/life/realtime/sessions` with title and sensitivities.
4. Next.js verifies the application session and proxies to `POST /v1/realtime/sessions` with Emil's
   bearer token.
5. Life validates sensitivities, creates the OpenAI session, creates the durable conversation and
   Life Realtime session, and returns the session objects plus the one-time client secret.
6. Browser immediately creates one `RTCPeerConnection`, one autoplay remote `<audio>` element, and
   one `oai-events` data channel; it adds the microphone track before making the offer.
7. Browser creates and sets its SDP offer, then posts the SDP directly to
   `https://api.openai.com/v1/realtime/calls` with the ephemeral secret.
8. Browser sets the returned SDP answer as remote description and waits for the data channel and
   connection state to become ready.
9. The ephemeral secret is dropped from React state once the connection is established. It is never
   persisted or logged.

This is the ephemeral-token path documented by OpenAI and already implemented by Life's session
creation contract. Do not add the standard OpenAI API key to Next.js; Axum alone owns it.

### Event handling and memory tools

Parse data-channel JSON through a strict event schema. Track events by item ID, response ID, and
function `call_id`, not arrival order alone.

When a completed response output item is a function call named `search_life_memory`:

1. Parse only `{ query, limit }`; require limit 1 to 20.
2. Call the same-origin session-specific memory-search handler. Do not accept owner, conversation, or
   sensitivities from the function arguments.
3. Life reloads the active session and applies its stored owner and sensitivity set.
4. Union the returned memory IDs into the citation set for that provider response.
5. Send a `conversation.item.create` function-call output with the original `call_id` and a
   JSON-encoded search result.
6. Send `response.create` after the function output.

Reject unknown function names and surface the protocol error. Do not execute arbitrary tools from a
model event.

### Transcript assembly and durable commit

Maintain an assembler keyed by provider response ID:

- collect input transcription completion events;
- collect assistant audio-transcript deltas for display only;
- store assistant text only from its completion event;
- observe `response.done` and its terminal status;
- attach the union of memory IDs returned to tools for that response.

Commit only when the exact completed user transcript, exact completed assistant transcript, and
completed provider response ID are all present. Never commit deltas. POST:

```json
{
  "user_transcript": "exact completed input",
  "assistant_transcript": "exact completed output",
  "provider_response_id": "resp_...",
  "cited_memory_ids": ["memory UUIDs returned during this response"]
}
```

Life does not regenerate the answer. It runs structured extraction outside the audio latency path,
checks evidence and citations, embeds accepted memories, and commits both messages plus memories in
one transaction.

Keep a per-response commit ledger in memory. On network failure, show `not saved` and allow retry with
the identical request and provider response ID. On `409`, fetch the durable conversation messages:
if that provider response ID exists, mark the turn saved; otherwise keep the conflict visible. Never
invent a new provider response ID to bypass idempotency.

Interruption tests must cover a cancelled/incomplete response, a later completed response, and tool
calls across both. Only completed transcripts are eligible for commit, and citation IDs may not leak
from one response ledger into another.

### Close and cleanup

The End action executes in this order:

1. stop microphone tracks;
2. close data channel;
3. close peer connection and detach remote audio;
4. call the authenticated Next.js close handler, which DELETEs the Life session;
5. mark closed only after the backend acknowledges it.

Closing Life also completes the durable conversation. Tool calls and commits after close or expiry
must render the backend's conflict state. Page unmount performs local media cleanup immediately. A
best-effort navigation request may attempt server close, but the UI must not report success without
acknowledgement; the fixed server expiry is the authoritative cleanup for an abruptly closed tab.

## What's new and what's reused

| Area | Reused | New |
| --- | --- | --- |
| Framework | Next.js 16 App Router, React 19, strict TypeScript | Dynamic private route group and `proxy.ts` gate |
| Styling | Tailwind v4, CSS variables, mono/serif type, dashed square components | Life shell, navigation, privacy/status variants |
| UI primitives | Existing local components and installed Radix packages | Select/dialog/checkbox wrappers only where missing |
| Data validation | Zod 4 | Rust-contract schemas and sanitized errors |
| Data fetching | Native `fetch`, Server Components, SWR | Server-only bearer client and narrow BFF handlers |
| Voice | Browser WebRTC/media APIs, Life Realtime endpoints | Typed event parser, turn assembler, voice hook and panels |
| Charts | Recharts | Vendor-neutral health series/table components |
| Authentication | Life bearer auth and manual provisioning | Owner password session, HMAC cookie, owner UUID check |
| Observability | Axum request IDs/audit events, platform logs | Sanitized BFF request IDs and auth metrics |
| Dependencies | Current package set | None required for the first release |

## Security and privacy requirements

### Route and indexing controls

- `proxy.ts` protects both HTML and `/api/life` before route execution.
- Authenticated layouts and handlers verify sessions again.
- Life layouts export `robots: { index: false, follow: false, nocache: true }`.
- Add `/life` and `/api/life` disallow rules in `app/robots.ts` and keep them out of `app/sitemap.ts`.
- Add `X-Robots-Tag: noindex, nofollow, noarchive` at the response layer. Robots rules are not access
  control; authentication remains mandatory.
- Disable automatic prefetch on links to especially sensitive detail/export routes.

### Browser policy

Set route-scoped headers for Life:

- `Cache-Control: private, no-store, max-age=0`;
- `Referrer-Policy: no-referrer`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY` or equivalent CSP `frame-ancestors 'none'`;
- `Permissions-Policy: microphone=(self), camera=(), geolocation=()`;
- a CSP that limits scripts to the Next.js app and `connect-src` to self plus
  `https://api.openai.com` for the SDP exchange.

Test the CSP against Next.js production output and WebRTC. Do not weaken the public site's policy to
make Life work.

### Secret handling

- Keep Life and session secrets only in the hosting secret store and server runtime.
- Add `import 'server-only'` to config, session issuance, and Life client modules.
- Never serialize config objects into RSC props.
- Redact `Authorization`, cookies, SDP, ephemeral secrets, transcripts, memory bodies, research
  reports, connector errors, and health dimensions from logs.
- Return stable UI error codes and request IDs. Server logs may record route, status, duration, and
  backend error class, never the body.
- Rotate the Life credential through manual provisioning, then update the deployment secret and
  revoke the old digest. Rotate the UI session secret to invalidate all UI sessions.

### Sensitivity and model boundary

- Search and voice default to `standard` and `private` only.
- `intimate` and `restricted` are opt-in per search or Realtime session.
- A Realtime session's allowed sensitivities are immutable in the UI.
- Treat imported email, research, and retrieved memory as evidence, never instructions.
- State in settings that relevant content crosses the OpenAI trust boundary even with `store: false`.
- Do not launch with intimate/restricted data until the deployed OpenAI project's retention and
  access policy is accepted.

### CSRF, injection, and output safety

- Verify exact Origin on every mutation and login/logout request.
- Use SameSite=Strict, Secure, HttpOnly cookies and POST-only mutation endpoints.
- Validate every URL/path segment, UUID, enum, number, date, and JSON body with Zod.
- Do not offer a generic Life path proxy or forward client-supplied headers.
- Render Markdown without raw HTML. Sanitize external URL protocols and use safe link attributes.
- Never interpolate memory text into HTML, CSS, logs, or model-control events as instructions.
- Keep research query and memory search text out of URL parameters.

### Operational controls

- Put WAF rate limits on login and private API endpoints in addition to bearer auth.
- Monitor Axum `/readyz` separately. Do not expose readiness details on the owner dashboard before
  authentication.
- Alert on repeated UI login failures, backend `401`, connector failures, and Realtime commit errors,
  using counts rather than personal payloads.
- Test backup retention, export handling, owner deletion, bearer revocation, and connector-provider
  revocation before enabling the data-deletion screen.

## Backend contract gaps to close

Only one backend change blocks a clean required flow:

1. **OAuth callback redirect**: replace the public JSON success page with a fixed, configured frontend
   redirect as described above.

The following are useful, but do not block the first release:

2. Add `limit`/cursor filters to conversations, audit events, contradictions, and health
   measurements to avoid dashboard over-fetching.
3. Add sensitivity filtering to memory browse so the UI can offer a truthful server-wide filter.
4. Add kind filtering and interval-overlap semantics to timeline if those controls prove necessary.
5. Add a revision-chain endpoint and source/message lookup endpoint for richer provenance.
6. Add a small dashboard summary endpoint only if measured parallel-call latency warrants it. Do not
   add it preemptively or create a second read model in Next.js.

Document and version any contract change in `life/docs/API.md`, Rust models, handler tests, and the
TypeScript schemas in the same change.

## Implementation phases

### Phase 0: Contract fixtures and route separation

Work:

- Capture representative sanitized JSON fixtures for owner, memory, search hit, timeline,
  conversation/message, Realtime session, research, connector/job, health, contradiction, audit, and
  error envelopes.
- Build Zod schemas and TypeScript types from `life/src/models.rs`.
- Refactor public routes under `(public)` and reduce `app/layout.tsx` to the neutral root.
- Add the private Life layout without data screens.

Exit criteria:

- All existing public URLs and metadata are unchanged.
- Public pages still build statically.
- Life routes contain no PostHog provider or public navigation.
- Contract fixtures parse; malformed fixtures fail.

### Phase 1: Authentication and server boundary

Work:

- Add validated server configuration, scrypt login, HMAC session cookie, logout, `proxy.ts`, and
  server-side `requireLifeSession`.
- Add the server-only Life client and stable error mapping.
- Add no-store, noindex, CSP, referrer, frame, and permissions headers.
- Add production WAF rules and secret-provisioning runbook.

Exit criteria:

- Every `/life` page except login and every `/api/life` route returns redirect/401 without a valid
  cookie.
- Tampered and expired cookies fail closed.
- Login succeeds only when password, bearer credential, and expected owner UUID all match.
- No bearer token or private response appears in browser storage, HTML, RSC payloads, bundles, or
  logs.

### Phase 2: Dashboard, memory, and timeline

Work:

- Build the Life shell and dashboard queries/panels.
- Add browse, hybrid search, explicit sensitivity, detail, relations, manual create, revise, and
  retract.
- Add precision-aware timeline with range/domain filters.
- Add conversation list/detail for links created by voice.

Exit criteria:

- Search results match direct backend calls for the same sensitivity set.
- Active lists hide superseded/retracted rows; detail preserves revision history.
- Timeline renders in the owner's timezone without fabricating precision.
- Mutations refresh the correct panels and leave append-only history intact.

### Phase 3: Realtime voice

Work:

- Implement setup, media permission, native peer connection, remote audio, and data channel.
- Add strict event parsing, memory tool forwarding, per-response citation ledgers, transcript
  assembly, durable commit, reconciliation, and cleanup.
- Add transcript persistence states and accessible controls.

Exit criteria:

- The browser receives only the ephemeral OpenAI secret, never standard OpenAI or Life credentials.
- Owner and sensitivities cannot be changed by tool arguments.
- Completed user/assistant transcripts commit once with the correct provider response ID and cited
  memory IDs.
- Interruption, function calls, commit failure/retry, `409` reconciliation, explicit close, expiry,
  permission denial, and network loss have tested states.
- A Realtime failure never invokes the multipart voice endpoint.

### Phase 4: Connectors and owner settings

Work:

- Implement the fixed OAuth callback redirect in Axum and update docs/tests.
- Build owner profile editing and connector cards.
- Add OAuth start, job polling, sync, failed-job retry, reset cursor, and revoke confirmations.

Exit criteria:

- OAuth state binds callback to Emil without exposing tokens or state in the frontend redirect.
- Provider tokens never appear in Next.js responses or logs.
- Job polling terminates and accurately distinguishes queued/running/completed/failed.
- Gmail cursor reset and connector revoke copy describe their actual consequences.

### Phase 5: Research, health, review, and portability

Work:

- Add explicit research result/citation view.
- Add health table, charts, and manual measurement entry.
- Add contradictions, reflections, interviews, exports, and guarded owner deletion.
- Add backend query filters where measured payload size requires them.

Exit criteria:

- Research claims retain `researched` labels and citations.
- Health series never combine different metric codes or units.
- Contradiction resolution requires a supported terminal status and note.
- Exports are no-store downloads; deletion clears the UI session after confirmed backend success.

### Phase 6: Security and release verification

Work:

- Run the complete automated matrix below.
- Perform a threat-model review against `life/docs/THREAT_MODEL.md`.
- Test production secret rotation, WAF behavior, CSP, browser microphone permissions, OAuth callbacks,
  worker scheduling, export, and deletion runbooks.
- Roll out first with standard/private sensitivity only; enable intimate/restricted after retention
  policy and leak tests pass.

Exit criteria:

- All required checks pass.
- A manual network inspection shows no private analytics calls and no leaked credentials.
- Emil can log in, search, speak, commit a turn, inspect the memory it created, sync each configured
  connector, export data, and log out on the production origin.

## Verification plan

### Static and type checks

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `cd life && make check` for any backend contract or OAuth change

Do not run `pnpm dev` from Codex. For browser verification, ask a human to start it and point
Playwright at the supplied port.

### Authentication and authorization tests

- Missing, malformed, expired, and tampered application cookies.
- Correct password with wrong/revoked Life bearer token.
- Correct bearer token resolving to an unexpected owner UUID.
- Login rate limit and generic failure response.
- Unsafe `next` redirect, cross-origin mutation, missing Origin, and wrong content type.
- Unauthenticated access to every `/life` and `/api/life` route.
- Backend `401` clears the UI session.
- No private route is indexed, cached, framed, prefetched, or tracked by PostHog.

### Contract and data tests

- Zod fixtures for every Rust response and error envelope.
- Memory kind/status/sensitivity/precision exhaustiveness.
- Append revision and retraction behavior.
- Search sensitivity leak test for intimate/restricted rows.
- Timeline owner-timezone and precision cases, including null time and intervals.
- Research report with zero, one, and many citations/memories.
- Connector state and job state transition fixtures.
- Health metric/unit grouping and arbitrary dimensions.

### Realtime tests

Use deterministic mocked `RTCPeerConnection`, media tracks, data channel, and backend fixtures for:

- session creation and SDP exchange;
- data channel opening before event use;
- input transcript completion and output transcript completion;
- one and multiple memory tool calls;
- unknown tool rejection;
- response interruption and resumed completion;
- citation isolation by response;
- duplicate `response.done` and duplicate commit suppression;
- commit network failure, identical retry, and `409` transcript reconciliation;
- close order, route navigation, tab cleanup, and 60-minute expiry;
- microphone denial, device removal, ICE/peer failure, provider error, and backend conflict.

Then run a manual production-like test in current Chrome, Safari, and Firefox on desktop and mobile
Safari. Confirm microphone UX, remote autoplay behavior after the user gesture, interruption quality,
and transcript accuracy.

### Security inspection

- Search built client artifacts and captured network logs for `LIFE_USER_TOKEN`, session secret,
  standard OpenAI API key, bearer headers, and sample private text.
- Inspect response headers and CDN behavior for private HTML, API JSON, exports, and OAuth redirects.
- Confirm PostHog receives no `/life` pageview, autocapture, error payload, or transcript.
- Fuzz UUIDs, enum values, document paths, JSON dimensions, Markdown links, and Realtime events.
- Verify logs contain request IDs and classes only, not bodies or secrets.

## Release and operations checklist

1. Provision Emil and a new frontend-specific Life bearer credential using
   `life/docs/PROVISIONING.md`; do not reuse an operator shell token indefinitely.
2. Store all six frontend secrets in the production secret store.
3. Configure `LIFE_ALLOWED_ORIGIN` to the exact frontend origin and the new fixed frontend callback
   base URL in Life.
4. Register exact GitHub, Linear, and Gmail callback URLs against the Life API origin.
5. Configure gateway/WAF rate limits for Life API, login, and BFF routes.
6. Deploy Life API and worker; run migrations; verify `/healthz` and `/readyz` privately.
7. Deploy Next.js; verify public static routes before touching Life.
8. Run the owner-only production smoke path from login through logout.
9. Rotate the frontend bearer credential once to prove revocation and UI `401` handling.
10. Document OpenAI, Cloud SQL backup, application log, export, and provider retention before storing
    intimate or restricted material.

## Source basis

Repository sources reviewed for this plan:

- [`life/README.md`](life/README.md)
- [`life/docs/API.md`](life/docs/API.md)
- [`life/docs/ARCHITECTURE.md`](life/docs/ARCHITECTURE.md)
- [`life/docs/PROVISIONING.md`](life/docs/PROVISIONING.md)
- [`life/docs/REALTIME_VOICE.md`](life/docs/REALTIME_VOICE.md)
- [`life/docs/THREAT_MODEL.md`](life/docs/THREAT_MODEL.md)
- [`life/docs/REQUIREMENTS.md`](life/docs/REQUIREMENTS.md)
- [`life/docs/DEPLOYMENT.md`](life/docs/DEPLOYMENT.md)
- [`life/src/api.rs`](life/src/api.rs)
- [`life/src/models.rs`](life/src/models.rs)
- [`life/src/db.rs`](life/src/db.rs)
- [`life/src/openai.rs`](life/src/openai.rs)
- [`life/src/connectors.rs`](life/src/connectors.rs)
- [`life/src/research.rs`](life/src/research.rs)
- [`life/migrations/0001_initial.sql`](life/migrations/0001_initial.sql)
- [`life/migrations/0002_operational_constraints.sql`](life/migrations/0002_operational_constraints.sql)
- [`app/layout.tsx`](app/layout.tsx), [`app/globals.css`](app/globals.css),
  [`components/navigation.tsx`](components/navigation.tsx), and [`components/ui`](components/ui)
- [OpenAI Realtime API with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)

When code, local docs, and external examples differ, the checked-in Life contract wins for this UI.
In particular, the backend has already chosen the ephemeral-token WebRTC path, fixed session tools and
instructions, owner-bound memory proxy, and out-of-band durable transcript commit.
