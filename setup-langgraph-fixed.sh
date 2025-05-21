#!/bin/bash
# Setup script for LangGraph-based SecondBrain agent system (Fixed version)

# Ensure we're in the project root
cd "$(dirname "$0")"

echo "Setting up LangGraph-based SecondBrain agent system..."

# Install required NPM packages
echo "Installing NPM dependencies..."
npm install --save dotenv @langchain/langgraph @langchain/anthropic @langchain/openai \
  @langchain/community @langchain/core chromadb @pinecone-database/pinecone

# Create necessary directories
echo "Creating required directories..."
mkdir -p processed_transcripts generated_content feedback_data

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "Creating sample .env file..."
  cat > .env << EOL
# API Keys
CLAUDE_API_KEY=
OPENAI_API_KEY=

# Storage Configuration
PINECONE_API_KEY=
PINECONE_INDEX_NAME=secondbrain

# Directory Paths
TRANSCRIPTS_DIR=./apps/ai-writing-system/writing_samples/transcripts
PROCESSED_DIR=./processed_transcripts
GENERATED_DIR=./generated_content
FEEDBACK_DIR=./feedback_data
EOL
  echo "Please edit the .env file and add your API keys."
else
  echo ".env file already exists, skipping creation."
fi

# Create package.json if it doesn't exist
if [ ! -f "package.json" ]; then
  echo "Creating package.json..."
  cat > package.json << EOL
{
  "name": "second-brain",
  "version": "0.1.0",
  "description": "SecondBrain multi-agent system with LangGraph",
  "scripts": {
    "test:agents": "ts-node scripts/test_agent_system.ts",
    "process:transcript": "ts-node scripts/process_transcript.ts",
    "generate:content": "ts-node scripts/generate_content.ts",
    "build": "tsc",
    "start": "ts-node demo.ts"
  },
  "dependencies": {
    "@langchain/anthropic": "^0.1.3",
    "@langchain/community": "^0.0.36",
    "@langchain/core": "^0.1.39",
    "@langchain/langgraph": "^0.0.30",
    "@langchain/openai": "^0.0.20",
    "chromadb": "^1.8.1",
    "dotenv": "^16.4.5",
    "@pinecone-database/pinecone": "^1.1.2",
    "typescript": "^5.3.3"
  },
  "devDependencies": {
    "@types/node": "^20.11.28",
    "ts-node": "^10.9.2"
  }
}
EOL
else
  # Update existing package.json scripts
  echo "Updating existing package.json..."
  # We'd typically use jq here, but for simplicity we'll copy and edit package.json
  cp package.json package.json.bak
  
  # Check if scripts section exists and add our scripts
  if grep -q '"scripts"' package.json; then
    echo "Scripts section exists, please manually add the scripts."
    echo "The following scripts should be added to your package.json:"
    echo "  \"test:agents\": \"ts-node scripts/test_agent_system.ts\","
    echo "  \"process:transcript\": \"ts-node scripts/process_transcript.ts\","
    echo "  \"generate:content\": \"ts-node scripts/generate_content.ts\","
  else
    echo "No scripts section found, adding one..."
    # Simple insertion of scripts section - not robust but functional for demo
    sed -i.bak '/"name": "second-brain"/a \
  "scripts": {\
    "test:agents": "ts-node scripts/test_agent_system.ts",\
    "process:transcript": "ts-node scripts/process_transcript.ts",\
    "generate:content": "ts-node scripts/generate_content.ts",\
    "build": "tsc",\
    "start": "ts-node demo.ts"\
  },' package.json
  fi
fi

# Create tsconfig.json if it doesn't exist
if [ ! -f "tsconfig.json" ]; then
  echo "Creating tsconfig.json..."
  cat > tsconfig.json << EOL
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["libs/**/*", "scripts/**/*", "*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOL
fi

# Update agent content file to fix pydantic-js dependency
echo "Updating ContentAgent to remove pydantic-js dependency..."
sed -i.bak 's/import { Pydantic } from .*pydantic-js.*/\/\/ Removed pydantic-js dependency/' /Users/tinamarie/dev/SecondBrain/libs/agents/content/index.ts

# Create additional script files for convenience
echo "Creating additional script files..."

# Create script for processing a transcript
mkdir -p scripts
cat > scripts/process_transcript.ts << EOL
/**
 * Script to process a transcript with the ContentAgent
 * 
 * Usage: 
 *   npm run process:transcript -- path/to/transcript.txt
 */

import dotenv from 'dotenv';
import * as path from 'path';
import { initializeAgents } from '../libs/agents';

// Load environment variables
dotenv.config();

// Get transcript path from command line args
const transcriptPath = process.argv[2];

if (!transcriptPath) {
  console.error('Please provide a transcript path as an argument');
  process.exit(1);
}

// Process the transcript
async function processTranscript() {
  console.log(\`Processing transcript: \${transcriptPath}\`);
  
  // Initialize the agent system
  const system = await initializeAgents();
  
  // Process the transcript
  const result = await system.contentAgent.processTranscript(transcriptPath);
  
  if (result.success) {
    console.log('Transcript processed successfully!');
    console.log('Style profile:', result.style_profile);
  } else {
    console.error('Error processing transcript:', result.error);
    process.exit(1);
  }
}

// Run the script
processTranscript()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
EOL

# Create script for generating content
cat > scripts/generate_content.ts << EOL
/**
 * Script to generate content using the GenerationAgent
 * 
 * Usage:
 *   npm run generate:content -- "Topic" path/to/style_profile.json
 */

import dotenv from 'dotenv';
import * as path from 'path';
import { initializeAgents } from '../libs/agents';

// Load environment variables
dotenv.config();

// Get arguments from command line
const topic = process.argv[2];
const styleProfilePath = process.argv[3];

if (!topic || !styleProfilePath) {
  console.error('Usage: npm run generate:content -- "Topic" path/to/style_profile.json');
  process.exit(1);
}

// Generate content
async function generateContent() {
  console.log(\`Generating content on topic: \${topic}\`);
  console.log(\`Using style profile: \${styleProfilePath}\`);
  
  // Initialize the agent system
  const system = await initializeAgents();
  
  // Generate content
  const result = await system.generationAgent.generateContent(topic, { styleProfilePath });
  
  if (result.success) {
    console.log('Content generated successfully!');
    console.log('Content brief:', result.content_brief);
    console.log('Generated content:', result.revised_draft || result.draft);
  } else {
    console.error('Error generating content:', result.error);
    process.exit(1);
  }
}

// Run the script
generateContent()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
EOL

# Create a simple script for processing the sample transcript
cat > process_sample_transcript.sh << EOL
#!/bin/bash
# Script to process a sample transcript

# Ensure we're in the project root
cd "\$(dirname "\$0")"

# Copy the sample transcript to a working directory
SAMPLE_TRANSCRIPT="\$1"
TRANSCRIPT_NAME="\$(basename "\$SAMPLE_TRANSCRIPT")"
TRANSCRIPT_DIR="./transcripts"

mkdir -p "\$TRANSCRIPT_DIR"
cp "\$SAMPLE_TRANSCRIPT" "\$TRANSCRIPT_DIR/\$TRANSCRIPT_NAME"

echo "Processing transcript: \$TRANSCRIPT_NAME"
echo "Running: npm run process:transcript -- \$TRANSCRIPT_DIR/\$TRANSCRIPT_NAME"

# Process the transcript
npm run process:transcript -- "\$TRANSCRIPT_DIR/\$TRANSCRIPT_NAME"
EOL

# Make scripts executable
chmod +x setup-langgraph-fixed.sh
chmod +x process_sample_transcript.sh

echo ""
echo "Setup complete!"
echo "Next steps:"
echo "1. Edit the .env file and add your API keys"
echo "2. Run 'npm install' to install dependencies"
echo "3. Process your sample transcript with:"
echo "   ./process_sample_transcript.sh '/Users/tinamarie/Downloads/Mark Sweet + Basis + Tina's transcript (9).txt'"
echo ""
echo "For processing a specific transcript:"
echo "  npm run process:transcript -- path/to/transcript.txt"
echo ""
echo "For generating content with a style profile:"
echo "  npm run generate:content -- \"Your Topic\" path/to/style_profile.json"
echo ""