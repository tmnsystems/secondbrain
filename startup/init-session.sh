#!/bin/bash
#
# Session Initialization Shortcut
# Run this at the beginning of every Claude session
#

# Display welcome message
echo "===== Initializing SecondBrain Session ====="
echo "Running session initialization script..."
echo


## Determine script and project root directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"


echo "🚧 Backing up local .env to Envoy drive..."
bash "$ROOT_DIR/scripts/backup-env.sh"
echo
# Run the initialization script
node "$SCRIPT_DIR/initialize-session.js"
INIT_STATUS=$?
if [ $INIT_STATUS -ne 0 ]; then
  # Initialization failed; exit with error
  exit $INIT_STATUS
fi

CONTEXT_LIB="$SCRIPT_DIR/context"
mkdir -p "$CONTEXT_LIB"
cp "$ROOT_DIR/infra/blueprints/INDEX.yaml" "$CONTEXT_LIB/INDEX.yaml"
cp "$ROOT_DIR/PROJECT_CONTEXT.md" "$CONTEXT_LIB/PROJECT_CONTEXT.md"
echo "🔍 Adding Notion-related docs to context library..."
# Copy all Markdown files containing 'notion' in their filename (case-insensitive)
# Copy Notion-related docs for context
find "$ROOT_DIR" -type f -iname "*notion*.md" ! -path "$CONTEXT_LIB/*" -exec cp {} "$CONTEXT_LIB" \;

# Add core system directives to context library
echo "🔍 Adding core system directives to context library..."
cp "$ROOT_DIR/CLAUDE.md" "$CONTEXT_LIB/" 2>/dev/null || true
cp "$ROOT_DIR/REVIEWER_PROTOCOL.md" "$CONTEXT_LIB/" 2>/dev/null || true

# Add all startup, infra, and agent files for Planner Agent orientation
echo "🔍 Adding startup, infra, and agent files to context library..."
find "$SCRIPT_DIR" "$ROOT_DIR/infra" "$ROOT_DIR/agents" -type f ! -path "$CONTEXT_LIB/*" -exec cp {} "$CONTEXT_LIB" \;
# Bridge shared .env into Deerflow
DEERFLOW_DIR="$ROOT_DIR/deer-flow"
if [ -d "$DEERFLOW_DIR" ] && [ ! -e "$DEERFLOW_DIR/.env" ]; then
  echo "🔗 Creating .env symlink in Deerflow: $DEERFLOW_DIR/.env -> $ROOT_DIR/secondbrain_api_keys.env"
  ln -s "$ROOT_DIR/secondbrain_api_keys.env" "$DEERFLOW_DIR/.env"
fi

LOG_FILE="$ROOT_DIR/logs/cli_intents.log"
MAX_BYTES=32768
if [ -f "$LOG_FILE" ]; then
  tail -c "$MAX_BYTES" "$LOG_FILE" > "$ROOT_DIR/logs/cli_intents_tail.log"
  PROJECT_DOC_TAIL="$ROOT_DIR/logs/cli_intents_tail.log"
else
  PROJECT_DOC_TAIL="$LOG_FILE"
fi

declare -a PROJECT_DOC_ARGS=()
for doc in "$CONTEXT_LIB"/*; do
  [ -f "$doc" ] && PROJECT_DOC_ARGS+=(--project-doc "$doc")
done
PROJECT_DOC_ARGS+=(--project-doc "$PROJECT_DOC_TAIL")

echo "🚀 Launching Codex CLI with context libraries and recent session logs..."
exec codex "${PROJECT_DOC_ARGS[@]}"