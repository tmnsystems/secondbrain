#!/usr/bin/env bash
# Backup local .env file to the Envoy drive and rotate backups (keep latest 3)

BACKUP_DIR="/Volumes/Envoy/env-backups"
# Determine source env file: prefer secondbrain_api_keys.env, else .env
BASE_DIR="/Volumes/Envoy/SecondBrain"
if [ -f "$BASE_DIR/secondbrain_api_keys.env" ]; then
  SOURCE_FILE="$BASE_DIR/secondbrain_api_keys.env"
elif [ -f "$BASE_DIR/.env" ]; then
  SOURCE_FILE="$BASE_DIR/.env"
else
  echo "⚠️  No environment file found (secondbrain_api_keys.env or .env); skipping backup."
  exit 0
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# If .env not present, skip backup
if [ ! -f "$SOURCE_FILE" ]; then
  echo "⚠️  .env not found at $SOURCE_FILE; skipping backup."
  exit 0
fi

# Create new backup with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/.env-$TIMESTAMP"
cp "$SOURCE_FILE" "$BACKUP_FILE"
echo "✅  .env backed up to $BACKUP_FILE"

# Rotate: keep only the 3 most recent backups
BACKUPS=( $(ls -1t "$BACKUP_DIR"/.env-* 2>/dev/null) )
COUNT=${#BACKUPS[@]}
if [ "$COUNT" -gt 3 ]; then
  for (( i=3; i<COUNT; i++ )); do
    rm -f "${BACKUPS[$i]}"
    echo "🗑️  Removed old backup ${BACKUPS[$i]}"
  done
fi

# Report final backup count
BACKUPS_AFTER=( $(ls -1t "$BACKUP_DIR"/.env-* 2>/dev/null) )
echo "🔄  Backup rotation complete. Kept ${#BACKUPS_AFTER[@]} backups."
exit 0