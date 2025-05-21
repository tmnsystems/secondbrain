#!/bin/bash
# Tool to list stored API keys and credentials

# Get the script's directory path for portability
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="$SCRIPT_DIR/secrets"

echo "Stored API Keys and Credentials:"
echo "=============================="

if [ -z "$(ls -A $SECRETS_DIR 2>/dev/null)" ]; then
  echo "No credentials stored yet."
else
  for secret in $SECRETS_DIR/*; do
    VAR_NAME=$(basename "$secret")
    echo "$VAR_NAME"
  done
fi
