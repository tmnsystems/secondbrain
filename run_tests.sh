#!/bin/bash
# Simple shell script to run the tests with proper Python paths

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the tests with PYTHONPATH set
cd "$SCRIPT_DIR"
PYTHONPATH="$SCRIPT_DIR" python3 -m unittest discover -s src/tests -v