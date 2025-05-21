#!/bin/bash
# Tool to decrypt API keys and credentials

# Get the script's directory path for portability
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="$SCRIPT_DIR/secrets"

if [ -z "$1" ]; then
  echo "Usage: $0 variable_name"
  echo "Example: $0 OPENAI_API_KEY"
  exit 1
fi

if [ ! -f "$SECRETS_DIR/$1" ]; then
  echo "Error: $1 not found in secrets storage."
  exit 1
fi

cat "$SECRETS_DIR/$1" | openssl enc -aes-256-cbc -d -a -salt -pass pass:bafca5d8c91672fe2b7f67a8f6a1f8f33f97c76f41d67adfc718bc2a22fe75f4
