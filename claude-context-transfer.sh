#!/bin/bash
# Script to create context files for specialized Claude instances

MAIN_DIR="/Users/tinamarie/dev/SecondBrain"
FRONTEND_DIR="/Users/tinamarie/dev/SecondBrain-Frontend"
CONTENT_DIR="/Users/tinamarie/dev/SecondBrain-Content"
API_DIR="/Users/tinamarie/dev/SecondBrain-API"

echo "Creating context files for specialized Claude instances..."

# Create main project summary for all instances
cat > "$MAIN_DIR/PROJECT_CONTEXT.md" << EOL
# SecondBrain Project Context

## Overview
SecondBrain is a multi-agent AI system designed to analyze, understand, and replicate Tina's unique business coaching style. The system processes transcripts and other content to extract voice patterns, reasoning methods, and teaching approaches.

## Architecture
- LangGraph for structured agent workflows and reasoning
- Claude as primary model for voice replication
- Self-sovereign infrastructure with ChromaDB, Ollama, FastEmbed
- Bolt.diy for development environment with model flexibility
- Human-in-the-loop feedback system for quality control
- Mobile-first web interface

## Key Components
1. Content Processing Pipeline - Extracts style from transcripts
2. Multi-Agent System - Specialized agents working together
3. Human Feedback Loop - Quality assessment and improvement
4. Web Interface - Mobile-accessible Progressive Web App

## Technical Stack
- Python (LangGraph, FastAPI)
- Next.js (Frontend)
- ChromaDB (Vector storage)
- Bolt.diy (Development)
- n8n.io (Workflow automation)
- Vaultwarden (Credential management)

## Specialized Directories
- Main (/SecondBrain) - Core architecture and integration
- Frontend (/SecondBrain-Frontend) - Web UI implementation
- Content (/SecondBrain-Content) - Transcript processing
- API (/SecondBrain-API) - External service connections

## Current Status
- Initial setup complete
- Bolt.diy integration established
- LangGraph agents implemented
- Content processing pipeline developed
- Human feedback system created
- Mobile-first web interface designed
EOL

# Copy main context to all directories
cp "$MAIN_DIR/PROJECT_CONTEXT.md" "$FRONTEND_DIR/"
cp "$MAIN_DIR/PROJECT_CONTEXT.md" "$CONTENT_DIR/"
cp "$MAIN_DIR/PROJECT_CONTEXT.md" "$API_DIR/"

# Create specialized context for Frontend
cat > "$FRONTEND_DIR/FRONTEND_CONTEXT.md" << EOL
# Frontend Context

## Overview
The frontend is a mobile-first web interface built with Next.js and Tailwind CSS. It provides a responsive user experience for interacting with the SecondBrain system.

## Key Components
- Chat Interface - For interacting with AI agents
- File Uploader - For submitting transcripts for analysis
- Feedback Panel - For providing quality feedback on AI outputs
- Settings Panel - For configuring AI models and preferences

## Implementation Details
- Next.js 14 with App Router
- Tailwind CSS for styling
- Mobile-first responsive design with swipe navigation
- Progressive Web App (PWA) capabilities

## Current Status
- Basic UI components implemented
- Mobile responsiveness established
- Chat interface functional
- File upload interface designed
- Feedback mechanism implemented

## Development Focus
Focus exclusively on frontend implementation, including:
1. Responsive UI components
2. Mobile-first design
3. User experience optimization
4. Frontend API integrations
5. Accessibility compliance
6. PWA implementation

## Integration Points
- API endpoints at /api/* connect to the backend services
- WebSocket connections for real-time updates
- LocalStorage for user preferences
EOL

# Create specialized context for Content Processing
cat > "$CONTENT_DIR/CONTENT_CONTEXT.md" << EOL
# Content Processing Context

## Overview
The content processing pipeline analyzes transcripts and other materials to extract Tina's unique voice, reasoning patterns, and teaching style. This system forms the foundation of style replication.

## Pipeline Steps
1. Ingest - Load transcript files
2. Separate Speakers - Identify different speakers in conversations
3. Extract Style - Identify language patterns, analogies, metaphors
4. Analyze Effectiveness - Evaluate teaching effectiveness
5. Recognize Reasoning - Identify reasoning patterns (deductive, inductive, etc.)
6. Catalog Analogies - Extract and categorize analogies and metaphors
7. Vectorize - Create vector embeddings for retrieval

## Implementation Details
- LangGraph for workflow orchestration
- Pydantic models for structured data
- Local vector storage with ChromaDB
- FastEmbed for local embedding generation

## Current Status
- Basic pipeline implemented
- Speaker separation working
- Style pattern extraction functional
- Basic reasoning pattern recognition
- Simple embedding creation

## Development Focus
Focus exclusively on content processing, including:
1. Improving transcript analysis accuracy
2. Enhancing style extraction
3. Developing better reasoning pattern recognition
4. Optimizing embedding generation
5. Implementing more sophisticated speaker separation

## Integration Points
- Outputs processed transcripts as structured JSON
- Creates vector embeddings for knowledge retrieval
- Identifies style patterns for content generation
EOL

# Create specialized context for API Integration
cat > "$API_DIR/API_CONTEXT.md" << EOL
# API Integration Context

## Overview
The API integration connects SecondBrain with external services like Claude, OpenAI, ChromaDB, and n8n.io. This system handles authentication, rate limiting, and data transformation between services.

## External Services
1. Claude API - Primary language model
2. OpenAI API - Alternative language model
3. ChromaDB - Vector database for knowledge storage
4. Mistral AI - Alternative language model
5. n8n.io - Workflow automation

## Implementation Details
- FastAPI for RESTful API endpoints
- Secure credential management with Vaultwarden
- Structured request/response handling
- Rate limiting and error handling
- Logging and monitoring

## Current Status
- Basic API bridge implemented
- Claude integration started
- Initial ChromaDB connection
- API credential management

## Development Focus
Focus exclusively on API integration, including:
1. Implementing robust external API connections
2. Managing authentication and credentials
3. Handling rate limits and quotas
4. Optimizing data transformations
5. Implementing fallback strategies
6. Monitoring and logging

## Integration Points
- Provides unified API for frontend
- Manages credentials for all external services
- Coordinates between multiple AI services
- Handles vector database operations
EOL

# Create Claude startup scripts with context loading
cat > "$MAIN_DIR/start-main-claude.sh" << EOL
#!/bin/bash
echo "Starting Claude Code in MAIN directory with full context..."
cd "$MAIN_DIR"
echo "To start Claude, run:"
echo "claude-code --dangerously-skip-permissions"
echo "Then provide this directive:"
echo "Please read PROJECT_CONTEXT.md to understand the project before proceeding."
EOL

cat > "$FRONTEND_DIR/start-frontend-claude.sh" << EOL
#!/bin/bash
echo "Starting Claude Code in FRONTEND directory with frontend context..."
cd "$FRONTEND_DIR"
echo "To start Claude, run:"
echo "claude-code --dangerously-skip-permissions"
echo "Then provide this directive:"
echo "Please read PROJECT_CONTEXT.md and FRONTEND_CONTEXT.md to understand the project before proceeding. Focus only on frontend implementation."
EOL

cat > "$CONTENT_DIR/start-content-claude.sh" << EOL
#!/bin/bash
echo "Starting Claude Code in CONTENT directory with content processing context..."
cd "$CONTENT_DIR"
echo "To start Claude, run:"
echo "claude-code --dangerously-skip-permissions"
echo "Then provide this directive:"
echo "Please read PROJECT_CONTEXT.md and CONTENT_CONTEXT.md to understand the project before proceeding. Focus only on content processing."
EOL

cat > "$API_DIR/start-api-claude.sh" << EOL
#!/bin/bash
echo "Starting Claude Code in API directory with API integration context..."
cd "$API_DIR"
echo "To start Claude, run:"
echo "claude-code --dangerously-skip-permissions" 
echo "Then provide this directive:"
echo "Please read PROJECT_CONTEXT.md and API_CONTEXT.md to understand the project before proceeding. Focus only on API integration."
EOL

# Make scripts executable
chmod +x "$MAIN_DIR/start-main-claude.sh"
chmod +x "$FRONTEND_DIR/start-frontend-claude.sh"
chmod +x "$CONTENT_DIR/start-content-claude.sh"
chmod +x "$API_DIR/start-api-claude.sh"

echo "Context transfer complete! Each directory now has specialized context files."
echo "To start Claude in each directory with the proper context:"
echo ""
echo "1. Main: ./start-main-claude.sh"
echo "2. Frontend: cd $FRONTEND_DIR && ./start-frontend-claude.sh"
echo "3. Content: cd $CONTENT_DIR && ./start-content-claude.sh" 
echo "4. API: cd $API_DIR && ./start-api-claude.sh"
echo ""
echo "Each instance will have the full project context plus specialized focus."