#!/bin/bash
# Start API Bridge server
set -e

# Get the absolute path to the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_BRIDGE_DIR="${SCRIPT_DIR}/api-bridge"

echo "Starting API Bridge server from ${API_BRIDGE_DIR}..."
cd "$API_BRIDGE_DIR"

# Check if .env file exists, if not create it from template
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit the .env file with your configuration details."
    echo "Press Enter to continue or Ctrl+C to exit and edit the file manually."
    read
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server in development mode if available
if grep -q '"dev"' package.json; then
    echo "Starting server in development mode..."
    npm run dev
else
    echo "Starting server..."
    npm start
fi