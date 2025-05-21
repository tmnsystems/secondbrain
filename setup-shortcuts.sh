#!/bin/bash
#
# Setup Shortcuts for SecondBrain
# This script adds aliases for common SecondBrain commands
#

# Determine which shell configuration file to use
SHELL_CONFIG=""
if [[ -f "$HOME/.zshrc" ]]; then
  SHELL_CONFIG="$HOME/.zshrc"
  echo "Found Zsh configuration at $SHELL_CONFIG"
elif [[ -f "$HOME/.bashrc" ]]; then
  SHELL_CONFIG="$HOME/.bashrc"
  echo "Found Bash configuration at $SHELL_CONFIG"
elif [[ -f "$HOME/.bash_profile" ]]; then
  SHELL_CONFIG="$HOME/.bash_profile"
  echo "Found Bash profile at $SHELL_CONFIG"
else
  echo "Could not find shell configuration file. Please add the aliases manually."
  exit 1
fi

# Add aliases to shell configuration
echo "" >> "$SHELL_CONFIG"
echo "# SecondBrain Shortcuts" >> "$SHELL_CONFIG"
echo "alias init-session='$PWD/init-session.sh'" >> "$SHELL_CONFIG"
echo "alias catalog-files='node $PWD/context_system/catalog-secondbrain-files.js'" >> "$SHELL_CONFIG"
echo "alias analyze-catalog='node $PWD/context_system/analyze-catalog-results.js'" >> "$SHELL_CONFIG"

# Make the changes available in the current session
echo "Aliases added to $SHELL_CONFIG"
echo "To use the aliases immediately, run: source $SHELL_CONFIG"
echo ""
echo "Now you can use these commands:"
echo "  init-session   - Initialize a new Claude session"
echo "  catalog-files  - Catalog all files in SecondBrain"
echo "  analyze-catalog - Analyze the catalog results"
echo ""
echo "Remember: Always run init-session at the beginning of every Claude session!"