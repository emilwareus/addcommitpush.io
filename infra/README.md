# Life production infrastructure

Pulumi owns the production backend in the `addcommitpush-life` Google Cloud
project. Merging `main` applies the stack, runs the idempotent migration and
owner-provisioning job, verifies the API, synchronizes server-only values to
Vercel, and then deploys the site.

## Production shape

| Resource             | Name                                   | Cost control                                             |
| -------------------- | -------------------------------------- | -------------------------------------------------------- |
| Cloud Run service    | `life-api`                             | Request billing, 0–1 instances, CPU throttled while idle |
| Cloud Run job        | `life-worker`                          | One task, no retries, invoked hourly                     |
| Cloud Run job        | `life-provision`                       | One task, invoked once after each deployment             |
| Cloud SQL            | `life-postgres`                        | PostgreSQL 17, `db-f1-micro`, zonal, 10 GB HDD           |
| Cloud Scheduler      | `life-worker-hourly`                   | One hourly schedule                                      |
| Artifact Registry    | `apps`                                 | Untagged images deleted after 14 days                    |
| Secret Manager       | `life-*`                               | Runtime and Vercel server-only configuration             |
| Cloud Billing budget | `addcommitpush Life monthly budget`    | 150 SEK warning threshold                                |
| Pulumi state         | `gs://addcommitpush-life-pulumi-state` | Object versioning enabled                                |

Cloud Run genuinely scales the API to zero. Cloud SQL cannot scale to zero and
is the only meaningful fixed idle cost. The selected shared-core instance is the
smallest practical managed PostgreSQL option for this backend. The 150 SEK
budget sends billing-account alerts at 50%, 80%, and 100%, including a forecast
alert; a Google Cloud budget is an alert, not a spending cap.

## Automatic deployment

`.github/workflows/deploy.yml` uses GitHub OIDC and Google Workload Identity
Federation. There is no long-lived Google service-account key.

On a push to `main`, the workflow:

1. authenticates as `github-deploy@addcommitpush-life.iam.gserviceaccount.com`;
2. builds the `life` image for `linux/amd64` and applies the Pulumi stack;
3. executes `life-provision` to run checked-in migrations and upsert the owner;
4. checks `/readyz` and the authenticated `/v1/owner` response;
5. reads frontend secrets from Secret Manager and writes them as sensitive
   Vercel production variables;
6. deploys the production Next.js app.

The Workload Identity provider accepts only this repository's `main` ref.
Pull-request workflows deploy only a Vercel preview and cannot mutate Google
Cloud.

Runtime IAM is split by purpose: `life-runtime` can read only the database,
encryption, and OpenAI secrets; `life-provision` can read only the database URL
and owner token; `life-scheduler` can invoke only the worker job.

The repository already has these GitHub Actions variables:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`
- `PULUMI_BACKEND_URL`

It also has `PULUMI_CONFIG_PASSPHRASE` plus the existing Vercel token, org, and
project secrets.

## Local operations

Authenticate and load the existing stack:

```bash
gcloud auth login
export PULUMI_CONFIG_PASSPHRASE="$(
  security find-generic-password \
    -s addcommitpush-life-pulumi \
    -a emilwareus \
    -w
)"
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
pulumi login gs://addcommitpush-life-pulumi-state
pulumi stack select production --cwd infra
```

Preview or apply:

```bash
pnpm infra:preview
pnpm infra:up
```

Execute and inspect the worker:

```bash
gcloud run jobs execute life-worker \
  --project=addcommitpush-life \
  --region=europe-west1 \
  --wait

gcloud run jobs executions list \
  --job=life-worker \
  --project=addcommitpush-life \
  --region=europe-west1
```

Inspect the API:

```bash
curl --fail --silent \
  https://life-api-1011975881194.europe-west1.run.app/readyz

gcloud run services logs read life-api \
  --project=addcommitpush-life \
  --region=europe-west1 \
  --limit=100
```

Copy the generated Life UI password without printing it:

```bash
gcloud secrets versions access latest \
  --project=addcommitpush-life \
  --secret=life-ui-password |
  pbcopy
```

## First-time bootstrap

The live project is already bootstrapped. `infra/bootstrap-gcp.sh` is the
idempotent recovery path for a new account or project: it links billing, enables
APIs, creates the versioned state bucket, creates the GitHub deploy identity and
OIDC provider, grants deployment roles, and writes the repository variables.

For a brand-new stack:

```bash
export PULUMI_CONFIG_PASSPHRASE="$(openssl rand -base64 32)"
bash infra/bootstrap-gcp.sh

pulumi login gs://addcommitpush-life-pulumi-state
pulumi stack init production --cwd infra
pulumi config set gcp:project addcommitpush-life --cwd infra --stack production
pulumi config set gcp:region europe-west1 --cwd infra --stack production
pulumi config set gcp:billingProject addcommitpush-life --cwd infra --stack production
pulumi config set gcp:userProjectOverride true --cwd infra --stack production
pulumi config set addcommitpush-life:frontendOrigin \
  https://addcommitpush.io --cwd infra --stack production
pulumi config set --secret addcommitpush-life:openaiApiKey \
  --cwd infra --stack production
```

Keep `Pulumi.production.yaml` in source control: it contains configuration and
encrypted ciphertext, not plaintext secrets. The passphrase stays in GitHub
Actions and the local macOS Keychain.

## Recovery and deletion

`life-postgres` has Google deletion protection and Pulumi resource protection.
Destroying or replacing it therefore requires two explicit code changes. Do not
remove those guards merely to make an update pass.

The database has seven retained automated backups. Point-in-time recovery is
disabled to keep the hobby-project cost down. Test restores before treating the
service as the only copy of irreplaceable data.

Rotating `addcommitpush-life:openaiApiKey` creates a new Secret Manager version
on the next Pulumi update. Rotating `life-encryption-key` requires an explicit
data re-encryption migration first; replacing it directly makes stored connector
tokens unreadable.
