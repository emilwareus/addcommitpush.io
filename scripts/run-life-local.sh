#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIRECTORY/.." && pwd)"
GCP_PROJECT_ID="addcommitpush-life"

required_commands=(gcloud pbcopy pnpm)
for command_name in "${required_commands[@]}"; do
  command -v "$command_name" >/dev/null
done

export LIFE_API_BASE_URL="https://life-api-1011975881194.europe-west1.run.app"
export LIFE_EXPECTED_OWNER_ID="aa2e669e-902e-3189-b9c5-86dab903ab4b"
export LIFE_UI_ORIGIN="http://localhost:49237"
LIFE_USER_TOKEN="$(
  gcloud secrets versions access latest \
    --project="$GCP_PROJECT_ID" \
    --secret=life-user-token
)"
export LIFE_USER_TOKEN
LIFE_UI_PASSWORD_HASH="$(
  gcloud secrets versions access latest \
    --project="$GCP_PROJECT_ID" \
    --secret=life-ui-password-hash
)"
export LIFE_UI_PASSWORD_HASH
LIFE_UI_SESSION_SECRET="$(
  gcloud secrets versions access latest \
    --project="$GCP_PROJECT_ID" \
    --secret=life-ui-session-secret
)"
export LIFE_UI_SESSION_SECRET

gcloud secrets versions access latest \
  --project="$GCP_PROJECT_ID" \
  --secret=life-ui-password |
  pbcopy

printf 'Life UI password copied to the clipboard.\n'
printf 'Starting http://localhost:49237/life\n'

cd "$REPOSITORY_ROOT"
exec pnpm dev
