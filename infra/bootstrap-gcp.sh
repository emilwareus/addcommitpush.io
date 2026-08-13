#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="addcommitpush-life"
BILLING_ACCOUNT="012E23-CF597A-29BBB1"
REGION="europe-west1"
STATE_BUCKET="addcommitpush-life-pulumi-state"
GITHUB_REPOSITORY="emilwareus/addcommitpush.io"
DEPLOY_SERVICE_ACCOUNT="github-deploy"
WORKLOAD_IDENTITY_POOL="github-actions"
WORKLOAD_IDENTITY_PROVIDER="github"

required_commands=(gcloud gh)
for command_name in "${required_commands[@]}"; do
  command -v "$command_name" >/dev/null
done

if [[ -z "${PULUMI_CONFIG_PASSPHRASE:-}" ]]; then
  echo "PULUMI_CONFIG_PASSPHRASE must be set before bootstrapping." >&2
  exit 1
fi

if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud projects create "$PROJECT_ID" --name="addcommitpush Life"
fi

gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"

gcloud services enable \
  artifactregistry.googleapis.com \
  billingbudgets.googleapis.com \
  cloudresourcemanager.googleapis.com \
  cloudscheduler.googleapis.com \
  compute.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  serviceusage.googleapis.com \
  sqladmin.googleapis.com \
  sts.googleapis.com \
  --project="$PROJECT_ID"

if ! gcloud storage buckets describe "gs://$STATE_BUCKET" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$STATE_BUCKET" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access
fi
gcloud storage buckets update "gs://$STATE_BUCKET" --versioning

if ! gcloud iam service-accounts describe \
  "$DEPLOY_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOY_SERVICE_ACCOUNT" \
    --project="$PROJECT_ID" \
    --display-name="GitHub production deployer"
fi

if ! gcloud iam workload-identity-pools describe "$WORKLOAD_IDENTITY_POOL" \
  --project="$PROJECT_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$WORKLOAD_IDENTITY_POOL" \
    --project="$PROJECT_ID" \
    --location=global \
    --display-name="GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "$WORKLOAD_IDENTITY_PROVIDER" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$WORKLOAD_IDENTITY_PROVIDER" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" \
    --display-name="addcommitpush.io main branch" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='$GITHUB_REPOSITORY' && assertion.ref=='refs/heads/main'"
fi

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
DEPLOY_SERVICE_ACCOUNT_EMAIL="$DEPLOY_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
WORKLOAD_IDENTITY_PROVIDER_NAME="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_IDENTITY_POOL/providers/$WORKLOAD_IDENTITY_PROVIDER"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_IDENTITY_POOL/attribute.repository/$GITHUB_REPOSITORY"

project_roles=(
  roles/artifactregistry.admin
  roles/cloudscheduler.admin
  roles/cloudsql.admin
  roles/iam.serviceAccountAdmin
  roles/iam.serviceAccountUser
  roles/resourcemanager.projectIamAdmin
  roles/run.admin
  roles/secretmanager.admin
  roles/secretmanager.secretAccessor
  roles/serviceusage.serviceUsageAdmin
)
for role in "${project_roles[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT_EMAIL" \
    --role="$role" \
    --condition=None >/dev/null
done

gcloud storage buckets add-iam-policy-binding "gs://$STATE_BUCKET" \
  --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.admin" >/dev/null

gcloud billing accounts add-iam-policy-binding "$BILLING_ACCOUNT" \
  --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/billing.costsManager" >/dev/null

gh variable set GCP_PROJECT_ID --body "$PROJECT_ID"
gh variable set GCP_REGION --body "$REGION"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --body "$WORKLOAD_IDENTITY_PROVIDER_NAME"
gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --body "$DEPLOY_SERVICE_ACCOUNT_EMAIL"
gh variable set PULUMI_BACKEND_URL --body "gs://$STATE_BUCKET"
gh secret set PULUMI_CONFIG_PASSPHRASE --body "$PULUMI_CONFIG_PASSPHRASE"

printf 'Bootstrapped project %s and GitHub OIDC deploy identity %s.\n' \
  "$PROJECT_ID" "$DEPLOY_SERVICE_ACCOUNT_EMAIL"
