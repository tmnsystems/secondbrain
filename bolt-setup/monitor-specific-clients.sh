#!/bin/bash
# Monitor specific client transcripts processing

# Navigate to the script directory
cd "$(dirname "$0")/api-bridge"

# Check for Python environment
if [ -d "../venv" ]; then
    echo "Activating virtual environment..."
    source "../venv/bin/activate"
fi

# Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "OPENAI_API_KEY environment variable not set."
    
    # Check if there's a .env file to source
    if [ -f ".env" ]; then
        echo "Loading environment variables from .env file..."
        export $(grep -v '^#' .env | xargs)
    else
        # Prompt for API key if not found
        echo "Please enter your OpenAI API key:"
        read -s OPENAI_API_KEY
        export OPENAI_API_KEY
    fi
fi

# Ensure script is executable
chmod +x monitor_topic_analyzer.py

# Start the monitoring script for specific clients
echo "Starting monitoring for specific clients (Aretas, Fuji, Esther)..."
python3 monitor_topic_analyzer.py --clients aretas fuji esther --chunk-size 5

# This script will continue running until you press Ctrl+C