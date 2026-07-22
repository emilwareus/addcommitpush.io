# Threat Model and Privacy Contract

## Assets and boundaries

Life stores deeply personal memories, transcripts, email snippets, work
activity, health measurements, researched claims, and OAuth credentials.
PostgreSQL contains searchable plaintext memory. OAuth credentials are encrypted
with AES-256-GCM and a key kept outside PostgreSQL.

The trusted computing base includes the Rust services, Next.js server, runtime
configuration, database operators, and selected model/provider APIs. OpenAI
requests set `store: false`, but relevant content still crosses that provider
boundary.

## Principal threats and controls

| Threat                             | Control                                                                                                       | Residual risk                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Caller reads another owner's data  | Bearer auth resolves one owner; every query binds that owner; composite foreign keys reject cross-owner links | The application database role remains trusted                     |
| Browser leaks a Life token         | The Next.js server proxies Life requests; the browser receives only a short-lived Realtime secret             | A client implementation can violate the contract                  |
| Database dump exposes memories     | Private networking, IAM, encryption at rest, least privilege, and audit                                       | Database administrators and runtime compromise can read plaintext |
| Database dump exposes OAuth tokens | AES-256-GCM, random nonces, associated data, and a separate runtime key                                       | Runtime compromise can access ciphertext and key                  |
| Imported text injects instructions | Imported and retrieved text is treated as evidence; model output is schema constrained                        | Models can still reason incorrectly                               |
| Model invents a fact               | Text extraction requires evidence from the current message; voice records through an explicit tool            | A false statement can still be faithfully recorded                |
| Replayed OAuth or webhooks         | One-use expiring OAuth state and timestamped HMAC verification                                                | A compromised browser session can authorize the wrong account     |
| Connector retry duplicates history | Provider IDs and content hashes provide idempotency; changed content appends a revision                       | Provider deletions are not mirrored automatically                 |
| Accidental deletion                | Exact display-name confirmation and bearer authentication                                                     | Backups have a separate lifecycle                                 |

## Collection limits

Connectors import bounded surfaces: GitHub activity, Linear issues, and Gmail
metadata/snippets. Gmail does not import attachment bytes or full message
bodies. Online research never runs in the background.

## Incident and deletion semantics

Revoking a connector removes local encrypted credentials but does not revoke the
provider grant. Deleting an owner cascades through live PostgreSQL rows. Backups,
logs, exports, provider data, and model-provider retention follow separate
policies.

If a bearer token leaks, revoke its credential, issue a new one, and inspect the
owner's audit history. If an encryption key or OAuth client secret leaks, rotate
it, redeploy, revoke provider grants, and re-encrypt connector tokens in a
controlled migration.
