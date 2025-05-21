#!/usr/bin/env bash
set -e

# Bootstrap GitHub repository using GitHub CLI (gh).
# This script requires gh CLI installed and authenticated via `gh auth login` or GITHUB_TOKEN.

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed."
  echo "Please install it (e.g., 'brew install gh' on macOS) and authenticate: 'gh auth login'."
  exit 1
fi

# Accept slug and optional description as positional args, else prompt interactively
if [ -n "$1" ]; then
  REPO_SLUG="$1"
  REPO_DESC="$2"
else
  read -p "Enter GitHub repository slug (owner/repo): " REPO_SLUG
  if [ -z "$REPO_SLUG" ]; then
    echo "Error: repository slug is required."
    exit 1
  fi
  read -p "Enter repository description (optional): " REPO_DESC
fi

# Create the repo, add remote, and push
echo "Creating repository '$REPO_SLUG'..."
gh repo create "$REPO_SLUG" --private --description "$REPO_DESC" --source . --remote origin --push

echo "Repository created and code pushed to https://github.com/$REPO_SLUG"