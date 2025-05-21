#!/bin/bash
# Test the transcript processor with the sample transcript

# Set the base directory
BASE_DIR="$(pwd)/bolt-setup"
OUTPUT_DIR="$BASE_DIR/processed_transcripts"

# Ensure the virtual environment is activated
source "$BASE_DIR/venv/bin/activate"

# Process the sample transcript
echo "Processing sample transcript..."
python "$BASE_DIR/transcript_processor.py" "$BASE_DIR/sample_transcript.txt" "$OUTPUT_DIR"

# Check if the processed transcript exists
OUTPUT_FILE="$OUTPUT_DIR/sample_transcript_processed.json"
if [ -f "$OUTPUT_FILE" ]; then
  echo "Success! Processed transcript saved to: $OUTPUT_FILE"
  echo "Here's a preview of the processed content:"
  head -n 20 "$OUTPUT_FILE"
  echo "..."
  echo "To view the full content: cat $OUTPUT_FILE"
else
  echo "Error: Processed transcript not found at $OUTPUT_FILE"
fi