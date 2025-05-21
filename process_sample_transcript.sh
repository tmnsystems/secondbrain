#!/bin/bash
# Script to process a sample transcript

# Ensure we're in the project root
cd "$(dirname "$0")"

# Copy the sample transcript to a working directory
SAMPLE_TRANSCRIPT="$1"
TRANSCRIPT_NAME="$(basename "$SAMPLE_TRANSCRIPT")"
TRANSCRIPT_DIR="./transcripts"

mkdir -p "$TRANSCRIPT_DIR"
cp "$SAMPLE_TRANSCRIPT" "$TRANSCRIPT_DIR/$TRANSCRIPT_NAME"

echo "Processing transcript: $TRANSCRIPT_NAME"
echo "Running: npm run process:transcript -- $TRANSCRIPT_DIR/$TRANSCRIPT_NAME"

# Process the transcript
npm run process:transcript -- "$TRANSCRIPT_DIR/$TRANSCRIPT_NAME"
