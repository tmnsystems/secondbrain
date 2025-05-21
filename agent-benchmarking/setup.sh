#!/bin/bash
# Setup script for Agent Benchmarking Framework

set -e  # Exit on error

# Navigate to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "Setting up Agent Benchmarking Framework..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install httpx asyncio pytest pytest-asyncio pygithub flask notion-client

# Set up tasks
echo "Setting up benchmark tasks..."
python setup_tasks.py

# Create reports directory
mkdir -p reports

echo "Setup complete! You can now run benchmarks with:"
echo "python run_benchmarks.py"
echo ""
echo "To run a specific task:"
echo "python run_benchmarks.py --task legacy_refactor"
echo ""
echo "To use smart agent routing:"
echo "python run_benchmarks.py --agent smart"