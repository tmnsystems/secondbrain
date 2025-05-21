#!/bin/bash
# Process just a single specific transcript for testing

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

# Reset progress and topics database
rm -f "../../topic_database/processing_progress.json"
rm -f "../../topic_database/topics_database.json"

# Process just a specific transcript from Fuji
echo "Starting topic analyzer for just one specific transcript..."
python3 -c "
import sys
sys.path.append('.')
from topic_analyzer import TranscriptProcessor

processor = TranscriptProcessor()
processor.process_file('/Volumes/Envoy/SecondBrain/processed_content/done_transcript_for_fuji_tina_coaching_8__txt.json')
processor.export_to_notion_format()
print('Processing completed with specific file.')
"

# Output location of results
echo ""
echo "Processing complete! Results are available at:"
echo "$(pwd)/../../topic_database/topics_database.json"
echo ""
echo "You can view the results through the API at: http://localhost:3030/api/topics"