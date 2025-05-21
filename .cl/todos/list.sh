#!/bin/bash
# Task listing script for SecondBrain
# Displays current tasks and their status

if [ -f "/Volumes/Envoy/SecondBrain/.cl/todos/todo_schema.json" ]; then
  echo "Current Tasks:"
  echo "=============="
  echo ""
  
  # Display pending tasks
  echo "PENDING TASKS:"
  jq -r '.tasks[] | select(.status == "pending") | "- [" + .priority + "] " + .description' /Volumes/Envoy/SecondBrain/.cl/todos/todo_schema.json
  echo ""
  
  # Display in-progress tasks
  echo "IN-PROGRESS TASKS:"
  jq -r '.tasks[] | select(.status == "in_progress") | "- [" + .priority + "] " + .description + "\n  Steps:\n" + (.steps | map("    - " + (if .status == "completed" then "✓" else " " end) + " " + .description) | join("\n"))' /Volumes/Envoy/SecondBrain/.cl/todos/todo_schema.json
  echo ""
  
  # Display completed tasks
  echo "COMPLETED TASKS:"
  jq -r '.tasks[] | select(.status == "completed") | "- " + .description' /Volumes/Envoy/SecondBrain/.cl/todos/todo_schema.json
  echo ""
  
  # Display task dependencies
  echo "TASK DEPENDENCIES:"
  jq -r '.tasks[] | select(.dependencies | length > 0) | "- " + .id + " (" + .description + ") depends on: " + (.dependencies | join(", "))' /Volumes/Envoy/SecondBrain/.cl/todos/todo_schema.json
else
  echo "No task list found. Create a todo list first."
fi