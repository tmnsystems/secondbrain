#!/bin/bash
# Script to create symbolic links for all client transcripts in the main transcripts directory
# This allows the SecondBrain to work with transcripts while maintaining client folder structure

# Ensure we're in the project root
cd "$(dirname "$0")"

# Base directories
TRANSCRIPTS_DIR="./transcripts"
PROCESSED_DIR="./processed_transcripts"

# Create directories if they don't exist
mkdir -p "$TRANSCRIPTS_DIR"
mkdir -p "$PROCESSED_DIR"

# Find all txt files in client subdirectories
find "$TRANSCRIPTS_DIR" -mindepth 2 -type f -name "*.txt" | while read -r transcript; do
    # Get filename
    filename=$(basename "$transcript")
    
    # Create symbolic link in the main transcripts directory
    if [ ! -e "$TRANSCRIPTS_DIR/$filename" ]; then
        ln -s "$transcript" "$TRANSCRIPTS_DIR/$filename"
        echo "Created link for $filename"
    fi
done

echo "All transcript links created successfully"