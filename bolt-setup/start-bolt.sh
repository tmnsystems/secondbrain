#!/bin/bash
# Start Bolt.diy server
set -e

BOLT_DIY_DIR="/Users/tinamarie/dev/secondbrain/bolt-setup/bolt.diy"

echo "Starting Bolt.diy server..."
cd "$BOLT_DIY_DIR"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found, installing..."
    npm install -g pnpm
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Start the development server
pnpm run dev
