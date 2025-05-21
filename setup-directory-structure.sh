#!/bin/bash
# Setup script for SecondBrain directory structure

# Base directories
MAIN_DIR="/Users/tinamarie/dev/SecondBrain"
FRONTEND_DIR="/Users/tinamarie/dev/SecondBrain-Frontend"
CONTENT_DIR="/Users/tinamarie/dev/SecondBrain-Content"
API_DIR="/Users/tinamarie/dev/SecondBrain-API"

echo "Setting up SecondBrain directory structure..."

# Create directories if they don't exist
mkdir -p "$FRONTEND_DIR" "$CONTENT_DIR" "$API_DIR"

# Setup Frontend directory
echo "Setting up Frontend directory..."
cp -r "$MAIN_DIR/bolt-setup/web-interface/"* "$FRONTEND_DIR/" 2>/dev/null || true
mkdir -p "$FRONTEND_DIR/app/components" "$FRONTEND_DIR/app/api" "$FRONTEND_DIR/public"

# Setup Content directory
echo "Setting up Content directory..."
cp "$MAIN_DIR/bolt-setup/transcript_processor.py" "$CONTENT_DIR/" 2>/dev/null || true
cp "$MAIN_DIR/bolt-setup/sample_transcript.txt" "$CONTENT_DIR/" 2>/dev/null || true
mkdir -p "$CONTENT_DIR/transcripts" "$CONTENT_DIR/processed_transcripts"

# Create sample transcript directories in Content directory
mkdir -p "$CONTENT_DIR/transcripts/raw" "$CONTENT_DIR/transcripts/processed"

# Setup API directory
echo "Setting up API directory..."
cp -r "$MAIN_DIR/bolt-setup/api-bridge/"* "$API_DIR/" 2>/dev/null || true
mkdir -p "$API_DIR/apis/claude" "$API_DIR/apis/openai" "$API_DIR/apis/chroma" "$API_DIR/apis/mistral" "$API_DIR/apis/n8n"
mkdir -p "$API_DIR/config" "$API_DIR/tests"

# Create credential templates
cat > "$API_DIR/config/credentials.example.env" << EOL
# API Credentials - NEVER commit this file with real credentials
# Copy to credentials.env and add your real API keys

# Anthropic Claude API
CLAUDE_API_KEY=your_claude_api_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key

# Other services
N8N_URL=http://localhost:5678
N8N_AUTH_TOKEN=your_n8n_token
EOL

# Create .gitignore files to prevent committing credentials
cat > "$API_DIR/config/.gitignore" << EOL
# Don't commit real credentials
credentials.env
*.pem
*.key
EOL

echo "Directory structure setup complete!"
echo "======================================================================================="
echo "Your SecondBrain is now organized into four specialized directories:"
echo ""
echo "1. MAIN: $MAIN_DIR"
echo "   - Core architecture, agent design, and integration planning"
echo "   - Run 'claude-code' here for high-level architecture work"
echo ""
echo "2. FRONTEND: $FRONTEND_DIR"
echo "   - Web UI implementation and design"
echo "   - Run 'cd $FRONTEND_DIR && claude-code' here for UI-focused work"
echo ""
echo "3. CONTENT: $CONTENT_DIR"
echo "   - Transcript processing pipeline and content analysis"
echo "   - Run 'cd $CONTENT_DIR && claude-code' here for processing work"
echo ""
echo "4. API: $API_DIR"
echo "   - External service integrations (Claude, OpenAI, ChromaDB, etc.)"
echo "   - Run 'cd $API_DIR && claude-code' here for API integration work"
echo "======================================================================================="