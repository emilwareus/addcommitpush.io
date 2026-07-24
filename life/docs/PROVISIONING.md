# Owner provisioning

Life has no public create-owner or create-credential endpoint. Pulumi creates a
random owner UUID, credential UUID, and 256-bit bearer token. The raw token is
stored in Secret Manager; PostgreSQL stores only its SHA-256 digest.

After every production infrastructure update, GitHub Actions executes
`life-provision`. The binary:

1. runs the checked-in SQLx migrations;
2. upserts the fixed owner;
3. upserts the fixed primary credential and its token digest;
4. exits non-zero if configuration, migration, or provisioning fails.

The operation is idempotent. It never prints the bearer token.

## Run provisioning manually

Use the managed Cloud Run job rather than connecting to PostgreSQL from a local
machine:

```bash
gcloud run jobs execute life-provision \
  --project=addcommitpush-life \
  --region=europe-west1 \
  --wait
```

Inspect recent executions:

```bash
gcloud run jobs executions list \
  --job=life-provision \
  --project=addcommitpush-life \
  --region=europe-west1
```

## Retrieve server-only values

Copy the UI password:

```bash
gcloud secrets versions access latest \
  --project=addcommitpush-life \
  --secret=life-ui-password |
  pbcopy
```

The bearer token is synchronized automatically to the Vercel production
environment as `LIFE_USER_TOKEN`. Do not put it in browser storage, client
JavaScript, logs, source control, or the database.

Authenticated backend requests use:

```http
Authorization: Bearer <raw token>
```

`POST /v1/owner` does not exist. `GET` and `PUT /v1/owner` operate only on the
owner resolved from that credential.

## Rotation

Credential and UI secret rotation must be implemented as a Pulumi change so the
new values, provisioning job, and Vercel configuration move together. Do not
edit the generated secrets by hand: Pulumi would restore its recorded values on
the next deployment.

Rotating `LIFE_ENCRYPTION_KEY` is separate and requires an explicit re-encryption
migration before changing the secret. Existing connector credentials cannot be
decrypted with a replacement key.
