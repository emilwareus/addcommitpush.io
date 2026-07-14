# Threat Model and Privacy Contract

## Assets and trust boundaries

Life stores unusually sensitive assets: identity history, relationships,
beliefs, emotions, regrets, secrets, journals, email snippets, work activity,
health measurements, voice transcripts, model-derived reflections, and OAuth
credentials. PostgreSQL contains searchable plaintext memory because full-text
and vector retrieval must operate over it. OAuth credentials are the exception:
they are encrypted at the application boundary with AES-256-GCM and a key that
is never stored in PostgreSQL.

The trusted computing base is the Rust binaries, their runtime configuration,
Cloud Run/Cloud SQL operators, the future server-side frontend, and selected
model/provider APIs. `store: false` is sent on OpenAI Responses requests, but it
does not make a request local: relevant content crosses the OpenAI trust boundary.
Do not enter intimate data until the deployed OpenAI project has an acceptable
retention and access policy.

## Principal threats and controls

| Threat | Control | Residual risk |
| --- | --- | --- |
| Internet caller reads life data | Every protected route hashes a high-entropy bearer credential, resolves exactly one owner, and ignores owner IDs from client input; gateway rate limiting is required | A leaked user token grants access to that user's data until manually revoked |
| User reads another user's data | Repository reads and writes bind the authenticated owner; composite owner foreign keys reject cross-owner links; integration tests exercise cross-user reads, conversations, sources, Realtime sessions, and deletion | The application database role is trusted and is not constrained by PostgreSQL row-level security; every new query needs an owner-scope review |
| Browser bundle leaks a Life bearer token | Contract requires a server-side frontend proxy; the browser receives only its application session and a short-lived OpenAI Realtime secret | A future frontend can violate this contract |
| Database dump exposes memories | Cloud SQL encryption, private networking/IAM, least privilege, audit, sensitivity filters | Database administrators and compromised runtime roles can read plaintext memories |
| Database dump exposes provider tokens | AES-256-GCM ciphertext, random nonce, connector UUID as associated data, separate Secret Manager key | Runtime compromise can access both ciphertext and key |
| Prompt injection in imported email/web/memory | Retrieved and imported text is explicitly treated as evidence, never instructions; structured output is schema constrained | Models can still reason incorrectly; evidence validation does not prove truth |
| Model invents a personal fact | Conversational extraction requires a verbatim excerpt from the current user turn; research extraction requires report evidence and a known citation URL | A quoted false statement can still be faithfully stored as user-stated or researched |
| Identity collision in online research | Research is explicit, includes owner profile, demands ambiguity reporting, and stores researched epistemic status/citations | Common names can still yield ambiguous evidence |
| OAuth CSRF/replay | 256-bit random state material, SHA-256 at rest, ten-minute expiry, atomic one-use deletion | A compromised browser session can authorize the wrong account |
| Webhook forgery/replay | Linear HMAC over raw bytes and one-minute timestamp window | Legitimate duplicated events can enqueue the same idempotent job |
| Connector retries duplicate or rewrite history | External IDs and content hashes are idempotency keys; changed records append revisions | Provider deletion is not currently mirrored as a tombstone |
| Agent silently rewrites the past | Revisions and retractions append; contradiction rows remain reviewable | Bad initial extraction remains visible until retracted |
| Accidental mass deletion | Exact display-name confirmation and bearer auth | PostgreSQL backups persist according to independent retention policies |
| Health-device schema lock-in | Vendor-neutral metric code, unit, interval, dimensions, and source provenance | Device semantics still need per-provider normalization and unit validation |

## Data minimization and sensitivity

The default retrieval boundary includes only `standard` and `private` memories.
`intimate` and `restricted` data requires an explicit sensitivity selection per
request. A Realtime session fixes its sensitivity set at creation; tool-call
arguments cannot widen it. Sensitivity remains an intent boundary within one
owner, not cryptographic compartmentalization: that owner's bearer principal can
create another session that includes every sensitivity.

Connectors import bounded activity surfaces: GitHub events, Linear issues, and
Gmail metadata/snippets. Gmail does not import attachment bytes or full message
bodies. Online person research never runs ambiently. These bounds should be
revisited deliberately before increasing collection.

## Incident and deletion semantics

Revoking a connector erases its local encrypted tokens immediately but does not
revoke the grant at the provider; revoke it in the provider account as well.
Deleting the owner cascades through online PostgreSQL rows. Cloud SQL backups,
logs, exports, provider data, and OpenAI retention follow their own policies and
cannot honestly be represented as instant erasure. The deployment owner must
document those retention periods and test restore/deletion procedures.

If a user bearer token leaks, set its `api_credentials.revoked_at`, issue a new
manual credential, and inspect that owner's audit history. If
`LIFE_ENCRYPTION_KEY` or an OAuth client secret leaks, rotate it in Secret
Manager, deploy a new revision, revoke provider grants, and inspect audit/job
history. Encryption-key rotation additionally requires decrypting and
re-encrypting connector tokens under both keys in a controlled migration; there
is intentionally no alternate key path in the runtime.
