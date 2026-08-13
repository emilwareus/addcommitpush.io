#!/usr/bin/env bash

set -euo pipefail

required_variables=(
  GCP_PROJECT_ID
  LIFE_API_BASE_URL
  LIFE_EXPECTED_OWNER_ID
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
  VERCEL_TOKEN
)
for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    printf 'Missing %s environment variable.\n' "$variable_name" >&2
    exit 1
  fi
done

vercel_command=(
  pnpx
  vercel@56.5.0
  --token
  "$VERCEL_TOKEN"
  --scope
  "$VERCEL_ORG_ID"
)

"${vercel_command[@]}" pull \
  --yes \
  --environment=production \
  >/dev/null

set_vercel_secret() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | "${vercel_command[@]}" env add \
    "$name" \
    production \
    --force \
    --sensitive \
    --yes \
    >/dev/null
}

secret_value="$(gcloud secrets versions access latest \
  --project="$GCP_PROJECT_ID" --secret=life-user-token)"
set_vercel_secret LIFE_USER_TOKEN "$secret_value"

secret_value="$(gcloud secrets versions access latest \
  --project="$GCP_PROJECT_ID" --secret=life-ui-password-hash)"
set_vercel_secret LIFE_UI_PASSWORD_HASH "$secret_value"

secret_value="$(gcloud secrets versions access latest \
  --project="$GCP_PROJECT_ID" --secret=life-ui-session-secret)"
set_vercel_secret LIFE_UI_SESSION_SECRET "$secret_value"

set_vercel_secret LIFE_API_BASE_URL "$LIFE_API_BASE_URL"
set_vercel_secret LIFE_EXPECTED_OWNER_ID "$LIFE_EXPECTED_OWNER_ID"
set_vercel_secret LIFE_UI_ORIGIN "https://addcommitpush.io"

unset secret_value
echo "Synchronized Life production environment variables to Vercel."
