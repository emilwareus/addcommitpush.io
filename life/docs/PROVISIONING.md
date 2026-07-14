# Manual User Provisioning

Life has no create-user or create-credential endpoint. An operator with direct
PostgreSQL access creates the owner and initial bearer credential in one
transaction. The API never accepts an owner ID from a user request.

## Create an owner

Generate a 256-bit token locally and pass only its digest to PostgreSQL:

```bash
export LIFE_USER_TOKEN="$(openssl rand -hex 32)"
export LIFE_USER_TOKEN_HASH="$({ printf %s "$LIFE_USER_TOKEN"; } \
  | openssl dgst -sha256 -binary \
  | openssl base64 -A)"

psql "$DATABASE_URL" \
  --set=display_name='Emil Wareus' \
  --set=timezone='Europe/Stockholm' \
  --set=locale='en' \
  --set=credential_label='primary' \
  --set=token_hash="$LIFE_USER_TOKEN_HASH" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO owners (
    display_name, timezone, locale, profile_markdown
)
VALUES (
    :'display_name', :'timezone', :'locale', ''
)
RETURNING id AS owner_id \gset

INSERT INTO api_credentials (
    owner_id, label, token_hash
)
VALUES (
    :'owner_id', :'credential_label', decode(:'token_hash', 'base64')
);

INSERT INTO audit_events (
    owner_id, action, resource_kind, resource_id, metadata
)
VALUES (
    :'owner_id', 'owner.created', 'owner', :'owner_id',
    '{"provisioned_by":"operator"}'::jsonb
);

COMMIT;
\echo provisioned owner :owner_id
SQL

printf 'Save this bearer token now; it cannot be recovered: %s\n' \
  "$LIFE_USER_TOKEN"
unset LIFE_USER_TOKEN LIFE_USER_TOKEN_HASH
```

Store the raw token in the server-side secret store used by the frontend. Do not
put it in browser storage, client JavaScript, logs, source control, or the Life
database. A request authenticates as this owner with:

```http
Authorization: Bearer <raw token>
```

`POST /v1/owner` does not exist. `GET`, `PUT`, and `DELETE /v1/owner` operate only
on the owner resolved from this credential.

## Rotate or revoke a credential

Create a replacement digest with the same local commands, then insert it for the
owner. Keep both credentials active only for the planned cutover window:

```sql
BEGIN;

INSERT INTO api_credentials (owner_id, label, token_hash, expires_at)
VALUES (
    'OWNER_UUID',
    'primary-rotated-2026-07',
    decode('BASE64_SHA256_DIGEST', 'base64'),
    NULL
);

UPDATE api_credentials
SET revoked_at = now()
WHERE id = 'OLD_CREDENTIAL_UUID'
  AND owner_id = 'OWNER_UUID'
  AND revoked_at IS NULL;

COMMIT;
```

Revocation takes effect on the next API request. Deleting an owner through the
authenticated API or directly in PostgreSQL cascades through that owner's
credentials and data without affecting other owners.
