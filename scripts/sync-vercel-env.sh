#!/usr/bin/env bash
#
# Sync local .env variables to Vercel environments using Vercel CLI
# Usage: Ensure Vercel CLI is installed and logged in (`npm install -g vercel && vercel login`),
# then run this script from the project root:
#   bash scripts/sync-vercel-env.sh

set -euo pipefail

# Project settings
PROJECT_NAME="$(basename $(git remote get-url origin) .git)"
ENVIRONMENTS=("production" "preview" "development")
ENV_FILE=""
# Determine source env file: prefer secondbrain_api_keys.env, else .env
if [ -f "secondbrain_api_keys.env" ]; then
  ENV_FILE="secondbrain_api_keys.env"
elif [ -f ".env" ]; then
  ENV_FILE=".env"
else
  echo "❌ No environment file found (secondbrain_api_keys.env or .env)."
  exit 1
fi

# Check prerequisites
if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Vercel CLI not found. Please install with: npm install -g vercel"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file $ENV_FILE not found in project root."
  exit 1
fi

echo "🔄 Syncing .env variables to Vercel project: $PROJECT_NAME"

# Loop through each key=value in .env (ignoring comments)
while IFS='=' read -r KEY VAL; do
  # Skip empty lines and comments
  [[ -z "$KEY" || "$KEY" =~ ^# ]] && continue
  for ENV in "${ENVIRONMENTS[@]}"; do
    echo " → Setting $KEY in $ENV"
    # Set the variable, overwriting if exists
    printf "%s" "$VAL" | vercel env add "$KEY" "$ENV" --yes
  done
done < <(grep -v '^#' "$ENV_FILE" | sed '/^$/d')

echo "✅ All environment variables synced to Vercel for $PROJECT_NAME."
exit 0