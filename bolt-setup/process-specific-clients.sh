#!/bin/bash
# Process specific client transcripts with the topic analyzer

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
chmod +x topic_analyzer.py

# Process specific clients (Aretas, Fuji, and Esther)
echo "Starting topic analyzer for specific clients (Aretas, Fuji, Esther)..."
python3 topic_analyzer.py --clients aretas fuji esther --chunk-size 5

# Output location of results
echo ""
echo "Processing complete! Results are available at:"
echo "$(pwd)/../../topic_database/topics_database.json"
echo ""
echo "You can view the results through the API at: http://localhost:3030/api/topics"