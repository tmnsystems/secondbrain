#!/bin/bash
# Simple script to set up API keys with minimal effort

# Set up the directory structure
mkdir -p /Users/tinamarie/dev/SecondBrain/.keys

# Create a simple file to store keys
KEYS_FILE="/Users/tinamarie/dev/SecondBrain/.keys/api_keys.sh"

# Create the file with template
cat > "$KEYS_FILE" << 'EOF'
# API Keys for SecondBrain
# Replace the placeholder values with your actual keys

# Anthropic (Claude) API Key
export CLAUDE_API_KEY="your-claude-key-here"

# OpenAI API Key
export OPENAI_API_KEY="your-openai-key-here"

# Mistral AI Key (if you have one)
export MISTRAL_API_KEY="your-mistral-key-here"

# Add any other keys you need below
# export OTHER_API_KEY="your-other-key-here"
EOF

# Make it executable
chmod +x "$KEYS_FILE"

# Create a simple activation script
cat > "/Users/tinamarie/dev/SecondBrain/load-keys.sh" << 'EOF'
#!/bin/bash
# Load API keys into environment

# Source the keys file
source "$(dirname "$0")/.keys/api_keys.sh"

# Print confirmation (comment this out if you don't want to see the keys)
echo "API keys loaded successfully:"
echo "CLAUDE_API_KEY: ${CLAUDE_API_KEY:0:8}... (${#CLAUDE_API_KEY} chars)"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:8}... (${#OPENAI_API_KEY} chars)"
echo "MISTRAL_API_KEY: ${MISTRAL_API_KEY:0:8}... (${#MISTRAL_API_KEY} chars)"
EOF

chmod +x "/Users/tinamarie/dev/SecondBrain/load-keys.sh"

# Open the keys file for editing
echo "================================================"
echo "I've created a simple system for your API keys."
echo "================================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Edit this file to add your keys:"
echo "   /Users/tinamarie/dev/SecondBrain/.keys/api_keys.sh"
echo ""
echo "2. When you need to use your keys, run:"
echo "   source ./load-keys.sh"
echo ""
echo "That's it! This works on any computer and will move with your project."
echo ""
echo "I'll now open the file so you can paste your keys:"

# Try to open the file with an appropriate editor
if command -v code &> /dev/null; then
    code "$KEYS_FILE"
elif command -v open &> /dev/null; then
    open -t "$KEYS_FILE"
elif command -v nano &> /dev/null; then
    nano "$KEYS_FILE"
else
    echo "Please edit $KEYS_FILE with your preferred text editor."
fi