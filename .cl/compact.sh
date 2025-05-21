#!/bin/bash
# Memory compaction script for SecondBrain
# Triggers the memory compaction process to optimize context usage

echo "Starting memory compaction process..."
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Create session summary log
SUMMARY_FILE="/Volumes/Envoy/SecondBrain/.cl/session_summaries/$(date -u +"%Y%m%d_%H%M%S")_summary.md"
mkdir -p /Volumes/Envoy/SecondBrain/.cl/session_summaries

# Record memory usage statistics
echo "## Memory Usage Before Compaction" > "$SUMMARY_FILE"
echo "* Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$SUMMARY_FILE"

# Collect completed tasks
echo "## Completed Tasks" >> "$SUMMARY_FILE"
echo "The following tasks were completed in this session:" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

# Read the current todos file and extract completed tasks
jq -r '.tasks[] | select(.status == "completed") | "* " + .description' /Volumes/Envoy/SecondBrain/.cl/todos/todo_schema.json >> "$SUMMARY_FILE" 2>/dev/null || echo "* No completed tasks found" >> "$SUMMARY_FILE"

echo "" >> "$SUMMARY_FILE"
echo "## Session Context" >> "$SUMMARY_FILE"
echo "Key information to preserve from this session:" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
echo "* Working on context management system implementation" >> "$SUMMARY_FILE"
echo "* Implementing claude.md hierarchy for scoped context" >> "$SUMMARY_FILE"
echo "* Creating task persistence with .cl/todos JSON structure" >> "$SUMMARY_FILE"
echo "* Implementing memory compaction at 70% context threshold" >> "$SUMMARY_FILE"

echo "Memory compaction completed."
echo "Session summary saved to: $SUMMARY_FILE"
echo "You can continue with a cleaner context while preserving critical information."