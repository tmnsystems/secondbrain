#!/bin/bash
#
# SecondBrain Catalog Maintenance Script
# This script runs the catalog process on a schedule and maintains the database
#

# Log file for tracking execution
LOG_DIR="/Volumes/Envoy/SecondBrain/context_system/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/catalog-maintenance_$TIMESTAMP.log"

# Redirect all output to log file
exec > "$LOG_FILE" 2>&1

echo "===== Starting SecondBrain Catalog Maintenance ====="
echo "Date: $(date)"
echo

cd /Volumes/Envoy/SecondBrain/context_system || {
  echo "Error: Could not change to context_system directory"
  exit 1
}

# Run the cataloging script
echo "Running catalog script..."
node catalog-secondbrain-files.js

# Check exit status
if [ $? -ne 0 ]; then
  echo "Error: Catalog script failed"
  exit 1
fi

# Wait a moment to ensure file writes are complete
sleep 5

# Run the analysis script
echo "Running analysis script..."
node analyze-catalog-results.js

# Check exit status
if [ $? -ne 0 ]; then
  echo "Error: Analysis script failed"
  exit 1
fi

echo
echo "===== Maintenance Complete ====="
echo "Date: $(date)"

# Print instructions for setting up as a scheduled task
echo
echo "To set up as a scheduled task on macOS, use:"
echo "1. Edit your crontab: crontab -e"
echo "2. Add the following line to run weekly (every Sunday at 1 AM):"
echo "   0 1 * * 0 /Volumes/Envoy/SecondBrain/context_system/scheduled-catalog-maintenance.sh"
echo

exit 0