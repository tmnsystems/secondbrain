#!/bin/bash
#
# Session Initialization Shortcut
# Run this at the beginning of every Claude session
#

# Display welcome message
echo "===== Initializing SecondBrain Session ====="
echo "Running session initialization script..."
echo

# Before initializing, back up local env file to the Envoy drive
echo "🚧 Backing up local .env to Envoy drive..."
bash /Volumes/Envoy/SecondBrain/scripts/backup-env.sh
echo
# Run the initialization script
node /Volumes/Envoy/SecondBrain/initialize-session.js

# Exit with the same status as the initialization script
exit $?