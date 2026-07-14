# Cloud Run Deployment

## Runtime shape

Deploy the same image twice:

- `life-api` is a Cloud Run service listening on `0.0.0.0:$PORT`.
- `life-worker` is a Cloud Run Job invoked with `--command life-worker` and
  `--args --drain`. It atomically drains the PostgreSQL queue and exits.

This keeps PostgreSQL as the only state store and queue. Schedule the worker job
at the desired latency or execute it after enqueueing syncs. The API never starts
an untracked in-process background task.

## Prerequisites

1. Create Cloud SQL for PostgreSQL with the `vector` extension available.
2. Create a database and least-privilege application user that can run the two
   checked-in migrations. After migration, production may use a separate runtime
   role with DML rights if schema changes are run as a release step.
3. Store `DATABASE_URL`, `LIFE_ENCRYPTION_KEY`, and `OPENAI_API_KEY` in Secret
   Manager. The encryption key is exactly 32 random bytes encoded as base64 and
   is separate from PostgreSQL. User bearer tokens are manually issued and only
   their SHA-256 digests are stored in PostgreSQL.
4. Keep Cloud SQL private or attach it through the Cloud SQL connector. Limit
   `DATABASE_MAX_CONNECTIONS` per instance so maximum instances multiplied by
   pool size stays below the Cloud SQL connection budget.

Generate the application encryption key once:

```bash
openssl rand -base64 32    # LIFE_ENCRYPTION_KEY
```

Provision each owner and bearer credential using [the operator runbook](PROVISIONING.md).
Never put a Life user token in browser JavaScript. A future Next.js frontend
must authenticate the human itself and attach the matching Life token only from
server-side route handlers.

## Build and migrate

```bash
export PROJECT_ID=your-project
export REGION=europe-west1
export IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/apps/life:latest"

gcloud builds submit --project "$PROJECT_ID" --tag "$IMAGE" life
```

Run the image's migration-only mode from a trusted release environment that has
the same Cloud SQL connectivity and secrets:

```bash
life-api --migrate-only
```

The process exits non-zero on a missing secret, unreachable database, checksum
mismatch, or failed extension/schema migration.

## Deploy the API

The exact Cloud SQL URL depends on whether the service uses private IP or a Unix
socket. With the Cloud SQL connector, SQLx accepts a PostgreSQL URL whose `host`
query parameter points at `/cloudsql/PROJECT:REGION:INSTANCE`.

```bash
gcloud run deploy life-api \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --allow-unauthenticated \
  --add-cloudsql-instances "$PROJECT_ID:$REGION:life" \
  --set-env-vars 'LIFE_ALLOWED_ORIGIN=https://your-frontend.example,LIFE_PUBLIC_BASE_URL=https://life-api.example,DATABASE_MAX_CONNECTIONS=5,RUST_LOG=info' \
  --set-secrets 'DATABASE_URL=life-database-url:latest,LIFE_ENCRYPTION_KEY=life-encryption-key:latest,OPENAI_API_KEY=openai-api-key:latest'
```

The service is publicly invokable because OAuth providers and Linear must reach
their callback/webhook paths. Every owner-data route remains protected by
a per-user bearer credential; put rate limiting at the load balancer/gateway and
never treat the public callback paths as owner authentication.

Configure OAuth providers only when used. Each client ID and secret must be set
as a pair. Provider callback URLs are:

```text
https://YOUR_PUBLIC_BASE/v1/oauth/github/callback
https://YOUR_PUBLIC_BASE/v1/oauth/linear/callback
https://YOUR_PUBLIC_BASE/v1/oauth/gmail/callback
```

The Linear webhook target is
`https://YOUR_PUBLIC_BASE/v1/webhooks/linear`; set the matching
`LINEAR_WEBHOOK_SECRET`.

## Deploy and invoke the worker

```bash
gcloud run jobs deploy life-worker \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --command /usr/local/bin/life-worker \
  --args=--drain \
  --tasks 1 \
  --max-retries 0 \
  --add-cloudsql-instances "$PROJECT_ID:$REGION:life" \
  --set-env-vars 'DATABASE_MAX_CONNECTIONS=5,RUST_LOG=info' \
  --set-secrets 'DATABASE_URL=life-database-url:latest,LIFE_ENCRYPTION_KEY=life-encryption-key:latest,OPENAI_API_KEY=openai-api-key:latest'

gcloud run jobs execute life-worker \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --wait
```

Set Cloud Scheduler to execute the job when periodic connector latency is
acceptable. `--max-retries 0` is intentional: an individual failed ingestion
job is recorded as failed and must be retried through the API after inspection.

## Operational checks

- `/healthz` proves the process can answer HTTP.
- `/readyz` executes `SELECT 1` against PostgreSQL.
- JSON logs include request IDs and worker/job IDs.
- OAuth access and refresh tokens are AES-256-GCM ciphertext with connector UUID
  associated data. Rotating `LIFE_ENCRYPTION_KEY` requires an explicit re-encrypt
  migration; simply changing it makes old tokens undecryptable.
- Back up PostgreSQL, test restore, and document backup deletion retention before
  storing intimate data.
