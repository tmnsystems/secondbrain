#!/bin/bash
# Script to load encrypted environment variables

# Get the script's directory path for portability
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="$SCRIPT_DIR/secrets"

echo "Loading SecondBrain environment variables..."

# Create a temporary file to store decrypted values
TEMP_ENV=$(mktemp)

# Process each secret file
for secret in $SECRETS_DIR/*; do
  if [ -f "$secret" ]; then
    VAR_NAME=$(basename "$secret")
    VAR_VALUE=$(cat "$secret" | openssl enc -aes-256-cbc -d -a -salt -pass pass:bafca5d8c91672fe2b7f67a8f6a1f8f33f97c76f41d67adfc718bc2a22fe75f4 2>/dev/null)
    
    if [ $? -eq 0 ]; then
      echo "export $VAR_NAME='$VAR_VALUE'" >> $TEMP_ENV
      echo "Loaded: $VAR_NAME"
    else
      echo "Warning: Failed to decrypt $VAR_NAME"
    fi
  fi
done

# Source the temporary file
source $TEMP_ENV

# Remove the temporary file
rm $TEMP_ENV

echo "Environment loaded successfully!"
