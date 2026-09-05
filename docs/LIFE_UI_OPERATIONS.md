# Life UI operations

The Life UI is an owner-only boundary. Provision all six server-only variables from `.env.example`
in the deployment secret store. Never use a `NEXT_PUBLIC_` prefix. The configured bearer credential
must resolve to exactly `LIFE_EXPECTED_OWNER_ID` through `GET /v1/owner`.

## Password hash

Store the UI password as this exact versioned format:

```text
$scrypt$v=1$N=32768,r=8,p=1$<base64url salt>$<base64url 32+ byte hash>
```

Use a random salt of at least 16 bytes and a separate high-entropy password. Generate the hash in a
trusted operator environment, write only the encoded result to the secret store, and do not put the
plaintext in shell history, repository files, logs, or deployment metadata.

`LIFE_UI_SESSION_SECRET` must contain at least 32 random characters. Rotating it invalidates every UI
session. Rotate the dedicated Life bearer credential by provisioning the replacement, updating the
deployment secret, verifying login, and then revoking the prior digest.

## Required gateway rules

Configure these at the production WAF or edge gateway; application code is not a distributed rate
limiter.

- `/api/life/auth/login`: at most five failed attempts per source address per 15 minutes, plus a
  conservative global ceiling.
- `/api/life/*`: authenticated per-source request ceiling appropriate for one owner; reject oversized
  bodies before forwarding.
- `/life/*` and `/api/life/*`: do not cache responses and preserve the application privacy headers.
- Alert on counts of login failures, Life API `401` responses, connector failures, and turn failures.
  Do not include cookies, request bodies, memory text, transcripts, tokens, or raw upstream errors.

## Deployment smoke test

1. Verify `/`, `/blog/*`, `/brain`, `/presentations`, `/about`, and `/status` remain public.
2. Verify an unauthenticated `/life` request redirects to `/life/login` and an unauthenticated
   `/api/life/owner` request returns JSON `401`.
3. Verify wrong password, wrong bearer token, and wrong expected owner UUID all fail sign-in.
4. Inspect Life HTML and network traffic for PostHog requests and credential material; neither may be
   present.
5. Create, revise, and retract a disposable memory; confirm the prior revisions remain addressable.
6. Inspect response headers for no-store, noindex, CSP, no-referrer, frame denial, and the restricted
   permissions policy.
