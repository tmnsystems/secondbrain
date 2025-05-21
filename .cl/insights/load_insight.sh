#!/bin/bash
# /Volumes/Envoy/SecondBrain/.cl/insights/load_insight.sh
# Loads insights from the strategy library

set -e

# Default values
VERBOSE=false
OUTPUT_FILE=""
INSIGHT_ID=""
TAG=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--id)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        INSIGHT_ID=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -t|--tag)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        TAG=$2
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
      echo "  -i, --id <insight-id>  ID of the specific insight to load"
      echo "  -t, --tag <tag>        Tag to filter insights (returns the most recent)"
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
mkdir -p "/Volumes/Envoy/SecondBrain/.cl/insights/cache"

# Default output file if not specified
if [ -z "$OUTPUT_FILE" ]; then
  TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
  OUTPUT_FILE="/Volumes/Envoy/SecondBrain/.cl/insights/cache/insight_${TIMESTAMP}.md"
fi

STRATEGY_LIB="/Volumes/Envoy/SecondBrain/strategy_library"
INDEX_FILE="${STRATEGY_LIB}/_index.json"

if [ ! -f "$INDEX_FILE" ]; then
  echo "Error: Index file not found at $INDEX_FILE" >&2
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed. Please install jq to use this script." >&2
  exit 1
fi

# Determine which insight to load
if [ -n "$INSIGHT_ID" ]; then
  # Find insight by ID
  INSIGHT_PATH=$(jq -r ".insights[] | select(.id == \"$INSIGHT_ID\") | .file_path" "$INDEX_FILE")
  if [ -z "$INSIGHT_PATH" ] || [ "$INSIGHT_PATH" == "null" ]; then
    echo "Error: No insight found with ID $INSIGHT_ID" >&2
    exit 1
  fi
elif [ -n "$TAG" ]; then
  # Find most recent insight by tag
  # Assumes insights are sorted by date in ID (YYYY-MM-DD_*)
  INSIGHT_ID=$(jq -r ".tags[\"$TAG\"] | sort | reverse | .[0]" "$INDEX_FILE")
  if [ -z "$INSIGHT_ID" ] || [ "$INSIGHT_ID" == "null" ]; then
    echo "Error: No insights found with tag $TAG" >&2
    exit 1
  fi
  INSIGHT_PATH=$(jq -r ".insights[] | select(.id == \"$INSIGHT_ID\") | .file_path" "$INDEX_FILE")
else
  echo "Error: Either --id or --tag must be specified" >&2
  exit 1
fi

# Full path to insight
FULL_INSIGHT_PATH="${STRATEGY_LIB}/${INSIGHT_PATH}"

if [ ! -f "$FULL_INSIGHT_PATH" ]; then
  echo "Error: Insight file not found at $FULL_INSIGHT_PATH" >&2
  exit 1
fi

# Load insight
if $VERBOSE; then
  echo "Loading insight from $FULL_INSIGHT_PATH"
fi

# Copy insight to output file
cp "$FULL_INSIGHT_PATH" "$OUTPUT_FILE"

if $VERBOSE; then
  echo "Insight saved to $OUTPUT_FILE"
  WORD_COUNT=$(wc -w < "$OUTPUT_FILE")
  echo "Word count: $WORD_COUNT"
fi

# Return the path to the insight file
echo "$OUTPUT_FILE"