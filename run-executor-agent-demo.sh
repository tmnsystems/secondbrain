#!/bin/bash

# Run the Executor Agent demonstration
# This script compiles and runs the demonstration scripts

# Set variables
BASEDIR=$(dirname "$0")
cd "$BASEDIR"

echo "📦 Installing dependencies if needed..."
npm install

echo "🔨 Compiling TypeScript files..."
npx tsc

echo "🚀 Running Executor Agent demonstrations..."

# Update Notion task status
echo "📝 Updating Notion task status..."
node dist/update-notion-task-status.js

# Run full demonstration
echo "🎮 Running full demonstration..."
node dist/demonstrate-executor-agent.js

echo "✅ Demonstration completed"
echo "📄 See the executor-implementation-log.md and executor-agent-implementation-summary.md files for details"