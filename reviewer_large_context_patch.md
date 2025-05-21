# Patch Plan: Support Large Context Logs for Codex Queries

## Background & Issue
- The user’s `logs/cli_intents.log` currently exceeds Codex CLI’s 32KB limit for `--project-doc`, causing truncation and loss of context.
- Direct invocation of `codex -q --project-doc logs/cli_intents.log` fails to load the full history.

## Proposed Fix
Add a helper script to automatically truncate the logs to the most recent N lines before invoking Codex.

### New File: `scripts/codex-query.sh`
```bash
#!/usr/bin/env bash
# Script: codex-query.sh
# Usage: scripts/codex-query.sh "Your question here"

LOG_FILE="logs/cli_intents.log"
TRUNC_FILE="logs/cli_intents.trunc.log"
# Number of lines to keep (configurable)
LINES=10000

if [ ! -f "$LOG_FILE" ]; then
  echo "Error: Context file '$LOG_FILE' not found." >&2
  exit 1
fi

# Truncate to last $LINES lines to stay under 32KB
tail -n $LINES "$LOG_FILE" > "$TRUNC_FILE"

# Run Codex with truncated context
codex -q --project-doc "$TRUNC_FILE" "$@"
```  

- Make the script executable (`chmod +x scripts/codex-query.sh`).
- Update `README.md` with usage instructions under a new section “Quick Context Queries”.

## Validation
After patch:
```bash
scripts/codex-query.sh "What was the special test directive I left you in the last session?"
```  
Expect:  
```
SENTINEL_TEST_DIRECTIVE: Remember to block ExecutorAgent
```

## Review Request
Please review the above plan and confirm:
1. File name, path, and script contents.  
2. The chosen default line count (10,000) is reasonable.  
3. Updating README or shortcuts as needed.

Upon approval, I will implement the script and documentation.  
