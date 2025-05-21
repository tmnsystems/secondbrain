#!/bin/bash
# Context loader script for SecondBrain
# Loads root context and directory-specific context

set -e

# Default values
VERBOSE=false
OUTPUT_FILE=""
ROOT_CONTEXT="/Volumes/Envoy/SecondBrain/CLAUDE.md"
SPECIFIC_CONTEXT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--context)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        SPECIFIC_CONTEXT=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -o|--output)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        OUTPUT_FILE=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -c, --context <path>   Path to directory-specific CLAUDE.md"
      echo "  -o, --output <path>    Path to output combined context"
      echo "  -v, --verbose          Enable verbose output"
      echo "  -h, --help             Show this help message"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create .cl directory if it doesn't exist
mkdir -p "$(dirname "$ROOT_CONTEXT")/.cl/context"

# Default output file if not specified
if [ -z "$OUTPUT_FILE" ]; then
  TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
  OUTPUT_FILE="$(dirname "$ROOT_CONTEXT")/.cl/context/combined_${TIMESTAMP}.md"
fi

# Check if root context exists
if [ ! -f "$ROOT_CONTEXT" ]; then
  echo "Error: Root context file not found at $ROOT_CONTEXT" >&2
  exit 1
fi

# Load root context
if $VERBOSE; then
  echo "Loading root context from $ROOT_CONTEXT"
fi
ROOT_CONTENT=$(cat "$ROOT_CONTEXT")

# Check if specific context exists
if [ -n "$SPECIFIC_CONTEXT" ]; then
  if [ ! -f "$SPECIFIC_CONTEXT" ]; then
    echo "Error: Specific context file not found at $SPECIFIC_CONTEXT" >&2
    exit 1
  fi
  
  # Load specific context
  if $VERBOSE; then
    echo "Loading specific context from $SPECIFIC_CONTEXT"
  fi
  SPECIFIC_CONTENT=$(cat "$SPECIFIC_CONTEXT")
  
  # Create combined context
  COMBINED_CONTENT="$ROOT_CONTENT"$'\n\n'"# Directory-Specific Context"$'\n\n'"$SPECIFIC_CONTENT"
else
  # Only root context
  COMBINED_CONTENT="$ROOT_CONTENT"
fi

# Save to output file
echo "$COMBINED_CONTENT" > "$OUTPUT_FILE"

# Calculate approximate token count (4 chars ≈ 1 token)
TOKEN_ESTIMATE=$(echo "$COMBINED_CONTENT" | wc -c | awk '{print int($1/4)}')

if $VERBOSE; then
  echo "Combined context saved to $OUTPUT_FILE"
  echo "Approximate token count: $TOKEN_ESTIMATE"
fi

# Return the path to the combined context file
echo "$OUTPUT_FILE"