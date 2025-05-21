#!/bin/bash

# Setup Notion and start the Planner Interface
# This script integrates with the SecondBrain Notion agent

set -e # Exit on error

# Script location and directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS_DIR="$SCRIPT_DIR/apps"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
INTERFACE_DIR="$APPS_DIR/PlannerInterface"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js and try again."
    exit 1
fi

# Check for Notion setup
if [ ! -f "$SCRIPT_DIR/.env" ] || ! grep -q "NOTION_API_KEY" "$SCRIPT_DIR/.env"; then
    echo "🔧 Notion setup needed."
    
    # Interactive setup
    read -p "Enter your Notion API key: " NOTION_API_KEY
    read -p "Enter your Notion parent page ID: " NOTION_PAGE_ID
    
    # Run setup
    echo "🔧 Setting up Notion integration..."
    export NOTION_API_KEY=$NOTION_API_KEY
    export NOTION_ROOT_PAGE_ID=$NOTION_PAGE_ID
    
    if [ -f "$SCRIPTS_DIR/setup_notion.ts" ]; then
        node "$SCRIPTS_DIR/setup_notion.ts"
    else
        echo "❌ Notion setup script not found at $SCRIPTS_DIR/setup_notion.ts"
        exit 1
    fi
else
    echo "✅ Notion appears to be configured."
fi

# Start the Planner Interface
echo "🚀 Starting the SecondBrain Planner Interface..."

# Navigate to the interface directory
cd "$INTERFACE_DIR"

# Install any missing dependencies
if [ ! -f "node_modules/.bin/express" ]; then
    echo "📦 Installing dependencies..."
    npm install express dotenv
fi

# Run the interface
echo "🌐 Launching Planner Interface at http://localhost:3000"
node run.js