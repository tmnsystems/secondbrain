#!/bin/bash

# Copy SecondBrain to external drive
# This script copies the entire SecondBrain project to an external drive
# Usage: ./copy-to-external-drive.sh

# External drive mount point
EXTERNAL_DRIVE="/Volumes/Envoy"
DESTINATION="$EXTERNAL_DRIVE/SecondBrain"

# Source path
SOURCE="/Users/tinamarie/dev/SecondBrain"

# Create destination directory if it doesn't exist
echo "Creating destination directory..."
mkdir -p "$DESTINATION"

# Create the exclude file
EXCLUDE_FILE="$(mktemp)"
cat > "$EXCLUDE_FILE" << EOF
.git/*
node_modules/*
.pytest_cache/*
coverage/*
__pycache__/*
*.pyc
.DS_Store
EOF

# Copy files
echo "Copying SecondBrain project to external drive..."
rsync -av --progress --exclude-from="$EXCLUDE_FILE" "$SOURCE/" "$DESTINATION/"

# Clean up
rm "$EXCLUDE_FILE"

# Create a README with instructions
cat > "$DESTINATION/PORTABLE_SETUP.md" << EOF
# SecondBrain Portable Setup

This is a portable copy of the SecondBrain project. 

## Setup Instructions

1. Copy this entire directory to your desired location
2. Install required dependencies:
   - Python 3.9+ with venv
   - Node.js 18+
   - Required Python packages: \`pip install -r requirements.txt\`
   - Required Node packages: \`npm install\`

3. Configuration:
   - Set up environment variables in .env file
   - Update any path references if needed

## IncredAgent + Bolt Integration

The integration plan is in the file: INCREDAGENT_BOLT_INTEGRATION.md

## Running the Project

- Run the backend: \`python backend/app.py\`
- Run the front-end: \`cd frontend && npm run dev\`
- Run the bolt setup: \`cd bolt-setup && ./setup-bolt.sh\`

EOF

echo "Creating requirements.txt file for portable setup..."
cat > "$DESTINATION/requirements.txt" << EOF
# Core Dependencies
fastapi>=0.95.0
uvicorn>=0.20.0
python-dotenv>=1.0.0
pydantic>=2.0.0
requests>=2.28.2
httpx>=0.23.3
langchain>=0.0.208
langgraph>=0.0.15
anthropic>=0.5.0
openai>=0.27.8
tiktoken>=0.4.0

# Document Processing
python-docx>=0.8.11
PyPDF2>=3.0.0
markdown>=3.4.3
beautifulsoup4>=4.12.2

# Vector Storage
chromadb>=0.4.6
pinecone-client>=2.2.2

# Utilities
loguru>=0.7.0
tqdm>=4.65.0
pytest>=7.3.1
pytest-asyncio>=0.21.0
EOF

echo "Done! SecondBrain has been copied to $DESTINATION"
echo "See $DESTINATION/PORTABLE_SETUP.md for setup instructions."