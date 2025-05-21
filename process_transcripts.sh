#!/bin/bash
# Script to process transcripts with SecondBrain

# Get the transcript path from argument
TRANSCRIPT_PATH="$1"

if [ -z "$TRANSCRIPT_PATH" ]; then
    echo "Error: No transcript path provided"
    exit 1
fi

if [ ! -f "$TRANSCRIPT_PATH" ]; then
    echo "Error: Transcript file not found: $TRANSCRIPT_PATH"
    exit 1
fi

# Ensure we're in the project root
cd "$(dirname "$0")"

# Copy the transcript to a working directory if needed
TRANSCRIPT_NAME="$(basename "$TRANSCRIPT_PATH")"
TRANSCRIPT_DIR="./transcripts"

echo "Processing transcript: $TRANSCRIPT_NAME"

# Initialize processing flag
PROCESSED=false

# Check if npm process:transcript command exists and run it
if npm run | grep -q "process:transcript"; then
    echo "Running npm process:transcript"
    npm run process:transcript -- "$TRANSCRIPT_PATH"
    PROCESSED=true
fi

# Check if transcript processor exists and run it
if [ -f "./bolt-setup/transcript_processor.py" ]; then
    echo "Running LangGraph transcript processor"
    python3 ./bolt-setup/transcript_processor.py "$TRANSCRIPT_PATH" "./processed_transcripts"
    PROCESSED=true
fi

# Check if no processing method was found
if [ "$PROCESSED" = false ]; then
    echo "Warning: No transcript processing method found. Creating placeholder metadata."
    
    # Create minimal metadata as a fallback
    OUTPUT_DIR="./processed_transcripts"
    mkdir -p "$OUTPUT_DIR"
    
    BASENAME=$(basename "$TRANSCRIPT_PATH" .txt)
    
    # Create minimal metadata file
    cat > "$OUTPUT_DIR/${BASENAME}_minimal_metadata.json" << EOF
{
  "source": "$TRANSCRIPT_PATH",
  "processed_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "processor": "minimal_fallback",
  "status": "imported_only"
}
EOF
    
    echo "Created minimal metadata at $OUTPUT_DIR/${BASENAME}_minimal_metadata.json"
fi

echo "Transcript processing complete"
exit 0