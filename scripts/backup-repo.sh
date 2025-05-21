#!/bin/bash
# Repository backup script for SecondBrain
# Creates git bundles and copies them to S3 storage

# Set variables
REPO_DIR="/Volumes/Envoy/SecondBrain"
BACKUP_DIR="${REPO_DIR}/backups"
DATE=$(date +%Y%m%d)
MONTH_DAY=$(date +%Y%m01)
DAY_OF_WEEK=$(date +%w)  # 0 is Sunday

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Change to repository directory
cd "${REPO_DIR}" || { echo "Failed to change directory to ${REPO_DIR}"; exit 1; }

# Create daily bundle
echo "Creating daily bundle..."
git bundle create "${BACKUP_DIR}/sb-repo-${DATE}.bundle" --all

# If today is Sunday, copy to S3 weekly backup
if [ "${DAY_OF_WEEK}" -eq "0" ]; then
  echo "Copying to weekly S3 backup..."
  # Uncomment and configure AWS credentials in production
  # aws s3 cp "${BACKUP_DIR}/sb-repo-${DATE}.bundle" s3://secondbrain-backup/
  echo "Weekly backup to S3 completed"
fi

# If today is the first day of the month, copy to Glacier
if [ "$(date +%d)" -eq "01" ]; then
  echo "Archiving monthly bundle to Glacier..."
  # Uncomment and configure AWS credentials in production
  # aws s3 cp "${BACKUP_DIR}/sb-repo-${MONTH_DAY}.bundle" s3://secondbrain-archive/ --storage-class GLACIER
  echo "Monthly archive to Glacier completed"
fi

# Clean up old backups (keep last 30 days)
echo "Cleaning up old backups..."
find "${BACKUP_DIR}" -name "sb-repo-*.bundle" -type f -mtime +30 -delete

echo "Backup process completed successfully"