#!/bin/bash
# Script to process the sample transcript

# Ensure we're in the project root
cd "$(dirname "$0")"

# Create transcript directory
mkdir -p transcripts

# Copy the sample transcript to our working directory
SAMPLE_TRANSCRIPT="/Users/tinamarie/Downloads/Mark Sweet + Basis + Tina's transcript (9).txt"
DEST_FILE="transcripts/sweet_basis_tina_transcript.txt"

echo "Copying sample transcript to $DEST_FILE"
cp "$SAMPLE_TRANSCRIPT" "$DEST_FILE"

# Update package.json with scripts if they don't exist
if ! grep -q '"process:transcript"' package.json; then
  echo "Adding scripts to package.json..."
  # Create a temporary file with the updated package.json
  cat package.json | jq '. + {scripts: {
    "test:agents": "ts-node scripts/test_agent_system.ts",
    "process:transcript": "ts-node scripts/process_transcript.ts",
    "generate:content": "ts-node scripts/generate_content.ts"
  }}' > package.json.new
  mv package.json.new package.json
fi

# Check Claude API key
if [ -z "$CLAUDE_API_KEY" ]; then
  if grep -q "CLAUDE_API_KEY=" .env; then
    echo "Loading API key from .env file"
    source .env
  else
    echo "WARNING: CLAUDE_API_KEY not found in environment or .env file!"
    echo "Processing may fail without a valid API key."
  fi
fi

# Run the transcript processing script
echo "Processing transcript..."
npx ts-node scripts/process_transcript.ts "$DEST_FILE"

echo "Done!"