#!/bin/bash
# Tool to encrypt API keys and credentials

# Get the script's directory path for portability
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="$SCRIPT_DIR/secrets"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 variable_name value"
  echo "Example: $0 OPENAI_API_KEY sk-1234567890abcdef"
  exit 1
fi

echo "Encrypting $1..."
echo "$2" | openssl enc -aes-256-cbc -a -salt -pass pass:bafca5d8c91672fe2b7f67a8f6a1f8f33f97c76f41d67adfc718bc2a22fe75f4 > "$SECRETS_DIR/$1"
echo "Stored encrypted $1 in $SECRETS_DIR/$1"
