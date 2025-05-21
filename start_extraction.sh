#!/bin/bash
# Script to start the extraction server as a background process

# Ensure proper directory structure exists
mkdir -p /Volumes/Envoy/SecondBrain/logs
mkdir -p /Volumes/Envoy/SecondBrain/state
mkdir -p /Volumes/Envoy/SecondBrain/extracted_content

# Start the extraction server in daemon mode
cd /Volumes/Envoy/SecondBrain
python3 src/extract_server.py start --daemon

# Give it a moment to start
sleep 2

# Check if it's running
python3 src/extract_server.py status

# Setup a log watcher
echo "Tailing the log file in a separate process..."
echo "Press Ctrl+C to stop watching logs (extraction will continue in background)"
tail -f /Volumes/Envoy/SecondBrain/logs/extraction_server.log

echo "The extraction server is still running in the background."
echo "You can check status with: python3 src/extract_server.py status"
echo "You can stop it with: python3 src/extract_server.py stop"