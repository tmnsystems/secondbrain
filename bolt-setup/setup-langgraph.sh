#!/bin/bash
# Setup script for LangGraph integration with Bolt.diy
set -e

SETUP_DIR="$(pwd)/bolt-setup"

echo "Setting up LangGraph integration with Bolt.diy..."

# Create a virtual environment if it doesn't exist
if [ ! -d "$SETUP_DIR/venv" ]; then
  echo "Creating Python virtual environment..."
  python -m venv "$SETUP_DIR/venv"
fi

# Activate the virtual environment
source "$SETUP_DIR/venv/bin/activate"

# Install dependencies
echo "Installing Python dependencies..."
pip install -r "$SETUP_DIR/requirements.txt"

echo "Setup complete! You can now run the LangGraph integration with:"
echo "source $SETUP_DIR/venv/bin/activate"
echo "python $SETUP_DIR/langgraph_integration.py"