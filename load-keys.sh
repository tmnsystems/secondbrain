#!/bin/bash
# Load API keys into environment

# Source the keys file
source "$(dirname "$0")/.keys/api_keys.sh"

# Print confirmation (comment this out if you don't want to see the keys)
echo "API keys loaded successfully:"
echo "CLAUDE_API_KEY: ${CLAUDE_API_KEY:0:8}... (${#CLAUDE_API_KEY} chars)"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:8}... (${#OPENAI_API_KEY} chars)"
echo "MISTRAL_API_KEY: ${MISTRAL_API_KEY:0:8}... (${#MISTRAL_API_KEY} chars)"
