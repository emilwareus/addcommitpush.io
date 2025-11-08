#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage: bash scripts/deploy-vercel.sh [preview|production] [--prebuilt] [--staged] [--skip-domain] [--output <file>]

Deploy this Next.js app to Vercel via CLI.

Arguments:
  environment        One of: preview (default) | production

Flags:
  --prebuilt         Build locally with `vercel build` and deploy with `--prebuilt`.
  --staged           For production only: create a production build without assigning domains (staged prod).
  --skip-domain      Alias for --staged (kept for clarity with Vercel docs wording).
  --output <file>    Write the deployment URL to the given file in addition to stdout.

Required environment variables:
  VERCEL_TOKEN       Personal/token for Vercel CLI auth.
  VERCEL_ORG_ID      Vercel organization/team ID or slug.
  VERCEL_PROJECT_ID  Vercel project ID.

Examples:
  bash scripts/deploy-vercel.sh preview
  bash scripts/deploy-vercel.sh production
  bash scripts/deploy-vercel.sh production --staged
  bash scripts/deploy-vercel.sh preview --prebuilt --output .vercel/last-deployment-url.txt

Reference: https://vercel.com/docs/cli/deploying-from-cli
USAGE
}

log() {
  echo "[deploy] $*" >&2
}

# Defaults
ENVIRONMENT="preview"
USE_PREBUILT="false"
STAGED_PROD="false"
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    preview|production)
      ENVIRONMENT="$1"
      shift
      ;;
    --prebuilt)
      USE_PREBUILT="true"
      shift
      ;;
    --staged|--skip-domain)
      STAGED_PROD="true"
      shift
      ;;
    --output)
      OUTPUT_FILE="${2:-}"
      if [[ -z "$OUTPUT_FILE" ]]; then
        echo "--output requires a file path" >&2
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Missing VERCEL_TOKEN env var" >&2
  exit 1
fi
if [[ -z "${VERCEL_ORG_ID:-}" ]]; then
  echo "Missing VERCEL_ORG_ID env var" >&2
  exit 1
fi
if [[ -z "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "Missing VERCEL_PROJECT_ID env var" >&2
  exit 1
fi

cd "$REPO_ROOT"

# Determine which package runner to use (pnpx if pnpm is available, otherwise npx)
if command -v pnpm >/dev/null 2>&1; then
  PKG_RUNNER="pnpx"
else
  PKG_RUNNER="npx"
fi

log "Ensuring Vercel CLI is available (using $PKG_RUNNER)..."
$PKG_RUNNER --yes vercel@latest --version >/dev/null 2>&1 || true

PULL_ENV="$ENVIRONMENT"
if [[ "$ENVIRONMENT" == "production" ]]; then
  PULL_ENV="production"
else
  PULL_ENV="preview"
fi

log "Preparing .vercel config via 'vercel pull' for environment: $PULL_ENV"
$PKG_RUNNER --yes vercel@latest pull \
  --yes \
  --environment "$PULL_ENV" \
  --token "$VERCEL_TOKEN" \
  --scope "$VERCEL_ORG_ID" 1>/dev/null

DEPLOY_CMD=($PKG_RUNNER --yes vercel@latest)

if [[ "$USE_PREBUILT" == "true" ]]; then
  log "Building locally with 'vercel build'..."
  $PKG_RUNNER --yes vercel@latest build 1>/dev/null
  DEPLOY_CMD+=(deploy --prebuilt)
else
  # Deploy from source; Vercel will build remotely
  DEPLOY_CMD+=()
fi

if [[ "$ENVIRONMENT" == "production" ]]; then
  DEPLOY_CMD+=(--prod)
  if [[ "$STAGED_PROD" == "true" ]]; then
    DEPLOY_CMD+=(--skip-domain)
  fi
fi

DEPLOY_CMD+=(--yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID")

log "Running: ${DEPLOY_CMD[*]}"
set +e
DEPLOYMENT_URL="$(${DEPLOY_CMD[@]} 2>/dev/null)"
STATUS=$?
set -e

if [[ $STATUS -ne 0 || -z "$DEPLOYMENT_URL" ]]; then
  echo "Vercel deployment failed" >&2
  exit ${STATUS:-1}
fi

mkdir -p "$REPO_ROOT/.vercel"
echo "$DEPLOYMENT_URL" > "$REPO_ROOT/.vercel/last-deployment-url.txt"

if [[ -n "$OUTPUT_FILE" ]]; then
  mkdir -p "$(dirname "$OUTPUT_FILE")"
  echo "$DEPLOYMENT_URL" > "$OUTPUT_FILE"
fi

echo "$DEPLOYMENT_URL"


