#!/bin/bash

# Setup script for Gemini CLI
# Installs dependencies and configures the Gemini API

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js and try again."
    exit 1
fi

# Script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Install dependencies
echo "📦 Installing dependencies..."
npm install @google/generative-ai dotenv --prefix $SCRIPT_DIR

# Configure API key if not already set
if [ ! -f "$ENV_FILE" ] || ! grep -q "GEMINI_API_KEY" "$ENV_FILE"; then
    echo "🔑 Gemini API key setup needed."
    
    # Get API key from user
    read -p "Enter your Gemini API key: " GEMINI_API_KEY
    
    # Add to .env file
    if [ -f "$ENV_FILE" ]; then
        # Append to existing file
        echo "GEMINI_API_KEY=$GEMINI_API_KEY" >> "$ENV_FILE"
        echo "GEMINI_MODEL=gemini-1.5-pro" >> "$ENV_FILE"
    else
        # Create new file
        echo "GEMINI_API_KEY=$GEMINI_API_KEY" > "$ENV_FILE"
        echo "GEMINI_MODEL=gemini-1.5-pro" >> "$ENV_FILE"
    fi
    
    echo "✅ API key saved to $ENV_FILE"
else
    echo "✅ Gemini API key already configured."
fi

# Make the CLI executable
chmod +x "$SCRIPT_DIR/gemini-cli.js"

# Create gemini command
GEMINI_COMMAND="#!/bin/bash
node \"$SCRIPT_DIR/gemini-cli.js\" \"\$@\"
"

# Write to local bin if it exists in PATH
if [ -d "$HOME/.local/bin" ] && echo $PATH | grep -q "$HOME/.local/bin"; then
    echo "$GEMINI_COMMAND" > "$HOME/.local/bin/gemini"
    chmod +x "$HOME/.local/bin/gemini"
    echo "✅ Gemini command installed to $HOME/.local/bin/gemini"
else
    # Create a local script
    echo "$GEMINI_COMMAND" > "$SCRIPT_DIR/gemini"
    chmod +x "$SCRIPT_DIR/gemini"
    echo "✅ Gemini command created at $SCRIPT_DIR/gemini"
    echo "💡 Add this to your PATH or create an alias to use 'gemini' command directly"
fi

echo "🎉 Setup complete! Run gemini to start using the CLI."
echo "💡 If you encounter permission issues, run: chmod +x $SCRIPT_DIR/gemini-cli.js"