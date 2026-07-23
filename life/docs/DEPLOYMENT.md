# Cloud Run deployment

The production deployment is fully managed by
[`infra/`](../../infra/README.md). Do not deploy the API or worker manually:
merging `main` builds one immutable image, applies the Pulumi stack, migrates and
provisions the database, verifies the API, updates Vercel's server-only
configuration, and deploys the frontend.

## Runtime shape

- `life-api` is a public Cloud Run service on `0.0.0.0:$PORT`.
- `life-worker` is a Cloud Run job that runs `life-worker --drain` hourly.
- `life-provision` runs migrations and idempotently provisions the fixed owner
  and bearer credential after each deployment.
- `life-postgres` is a zonal Cloud SQL PostgreSQL 17 `db-f1-micro` instance.
- The API and worker use `life-runtime`; the migration job uses the narrower
  `life-provision` identity. Both reach PostgreSQL through the Cloud SQL
  connector and can read only their required Secret Manager values.

Cloud Run is publicly invokable because OAuth providers and Linear must reach
callback and webhook paths. Owner-data routes still require the generated bearer
credential. The browser never receives that credential: Next.js route handlers
hold it in a sensitive Vercel production variable.

## Deployment invariants

- API autoscaling is 0–1 instances with request-based CPU allocation.
- The API has 1 vCPU, 512 MiB memory, and a five-connection SQL pool.
- Each job runs one task with no automatic task retry.
- `/healthz` proves the process can answer HTTP.
- `/readyz` executes `SELECT 1` against PostgreSQL.
- OAuth callback URLs use the deterministic API origin:

  ```text
  https://life-api-1011975881194.europe-west1.run.app/v1/oauth/github/callback
  https://life-api-1011975881194.europe-west1.run.app/v1/oauth/linear/callback
  https://life-api-1011975881194.europe-west1.run.app/v1/oauth/gmail/callback
  ```

- The Linear webhook target is:

  ```text
  https://life-api-1011975881194.europe-west1.run.app/v1/webhooks/linear
  ```

Provider credentials are intentionally absent until a connector is enabled.
Add each provider's client ID and secret as a pair to `infra/index.ts` and its
Pulumi configuration before enabling it; do not create unmanaged runtime
configuration with `gcloud`.

Operational commands, cost controls, bootstrap details, and recovery procedures
live in the [infrastructure runbook](../../infra/README.md).
