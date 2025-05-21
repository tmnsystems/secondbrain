#!/bin/bash
# Test the human-in-the-loop feedback system

# Set the base directory
BASE_DIR="$(pwd)/bolt-setup"
FEEDBACK_DIR="$BASE_DIR/feedback_data"

# Ensure the virtual environment is activated
source "$BASE_DIR/venv/bin/activate"

# Run the feedback system with a sample content
echo "Testing human-in-the-loop feedback system..."
python "$BASE_DIR/feedback_system.py"

# Check if the feedback data exists
if [ -d "$FEEDBACK_DIR/content" ] && [ "$(ls -A $FEEDBACK_DIR/content)" ]; then
  echo "Success! Feedback data saved to: $FEEDBACK_DIR"
  echo "Here's a preview of the content data:"
  ls -la "$FEEDBACK_DIR/content"
  
  # Show the first content file
  CONTENT_FILE=$(ls "$FEEDBACK_DIR/content" | head -n 1)
  if [ -n "$CONTENT_FILE" ]; then
    echo "Content file: $CONTENT_FILE"
    head -n 20 "$FEEDBACK_DIR/content/$CONTENT_FILE"
    echo "..."
  fi
  
  echo "Recommendations:"
  ls -la "$FEEDBACK_DIR/recommendations"
else
  echo "Error: Feedback data not found at $FEEDBACK_DIR/content"
fi