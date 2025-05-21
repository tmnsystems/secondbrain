#!/usr/bin/env bash
#
# codex-query.sh
#
# Query the OpenAI Codex CLI with up-to-date context loaded from the local intent log,
# truncated to avoid the 32KB project-doc limit.
# Usage:
#   scripts/codex-query.sh "Your question here"

LOG_FILE="logs/cli_intents.log"
TRUNC_FILE="logs/cli_intents.trunc.log"
# Number of lines to keep (configurable to stay under 32KB)
LINES=10000

if [ ! -f "$LOG_FILE" ]; then
  echo "Error: Context file '$LOG_FILE' not found." >&2
  exit 1
fi

# Truncate to last $LINES lines
tail -n $LINES "$LOG_FILE" > "$TRUNC_FILE"

# Invoke Codex in quiet mode with truncated context
codex -q --project-doc "$TRUNC_FILE" "$@"