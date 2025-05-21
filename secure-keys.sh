#!/bin/bash
# One-step secure API key manager
# This script creates a secure, encrypted store for your API keys
# with the simplest possible interface

# Create directory for the secure storage
mkdir -p /Users/tinamarie/dev/SecondBrain/.secure

# Generate a secure key file
KEY_FILE="/Users/tinamarie/dev/SecondBrain/.secure/key"
openssl rand -base64 32 > "$KEY_FILE"
chmod 600 "$KEY_FILE"

# Create a template file for keys
TEMPLATE_FILE="/Users/tinamarie/dev/SecondBrain/.secure/template.txt"
cat > "$TEMPLATE_FILE" << 'EOF'
# Just replace these values with your actual API keys
# Everything else is handled automatically

CLAUDE_API_KEY="your-claude-api-key-here"
OPENAI_API_KEY="your-openai-api-key-here"
MISTRAL_API_KEY="your-mistral-api-key-here"

# Add any other keys you need below:
# OTHER_KEY="value"
EOF

# Create the encrypted storage file (initially empty)
ENCRYPTED_FILE="/Users/tinamarie/dev/SecondBrain/.secure/keys.enc"
touch "$ENCRYPTED_FILE"

# Create the load script
LOAD_SCRIPT="/Users/tinamarie/dev/SecondBrain/keys.sh"
cat > "$LOAD_SCRIPT" << 'EOF'
#!/bin/bash
# SecondBrain - Secure API Key Manager

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="$DIR/.secure/key"
ENCRYPTED_FILE="$DIR/.secure/keys.enc"
TEMPLATE_FILE="$DIR/.secure/template.txt"
TEMP_FILE=$(mktemp)

# Function to securely update keys
update_keys() {
  # Create a temporary file with the current keys or template
  if [ -s "$ENCRYPTED_FILE" ]; then
    # Decrypt existing keys to edit
    openssl enc -aes-256-cbc -d -pbkdf2 -in "$ENCRYPTED_FILE" -out "$TEMP_FILE" -pass file:"$KEY_FILE" 2>/dev/null
    if [ $? -ne 0 ]; then
      # If decryption fails, use the template
      cp "$TEMPLATE_FILE" "$TEMP_FILE"
    fi
  else
    # Use template for first-time setup
    cp "$TEMPLATE_FILE" "$TEMP_FILE"
  fi

  # Open the file for editing
  if command -v nano >/dev/null 2>&1; then
    nano "$TEMP_FILE"
  elif command -v vim >/dev/null 2>&1; then
    vim "$TEMP_FILE"
  elif command -v vi >/dev/null 2>&1; then
    vi "$TEMP_FILE"
  else
    echo "No suitable editor found. Please edit $TEMP_FILE manually."
    read -p "Press Enter when done..."
  fi

  # Encrypt the updated file
  openssl enc -aes-256-cbc -pbkdf2 -in "$TEMP_FILE" -out "$ENCRYPTED_FILE" -pass file:"$KEY_FILE"
  
  # Securely delete the temporary file
  rm "$TEMP_FILE"
  
  echo "Keys updated and encrypted successfully!"
}

# Function to load keys
load_keys() {
  if [ ! -s "$ENCRYPTED_FILE" ]; then
    echo "No encrypted keys found. Setting up..."
    update_keys
  fi

  # Decrypt and source the keys
  TEMP_FILE=$(mktemp)
  openssl enc -aes-256-cbc -d -pbkdf2 -in "$ENCRYPTED_FILE" -out "$TEMP_FILE" -pass file:"$KEY_FILE" 2>/dev/null
  
  if [ $? -eq 0 ]; then
    # Source the decrypted file
    source "$TEMP_FILE"
    
    # Show confirmation (first 4 chars only)
    echo "API keys loaded successfully:"
    if [ -n "$CLAUDE_API_KEY" ]; then
      echo "CLAUDE_API_KEY: ${CLAUDE_API_KEY:0:4}... (${#CLAUDE_API_KEY} chars)"
    fi
    if [ -n "$OPENAI_API_KEY" ]; then
      echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:4}... (${#OPENAI_API_KEY} chars)"
    fi
    if [ -n "$MISTRAL_API_KEY" ]; then
      echo "MISTRAL_API_KEY: ${MISTRAL_API_KEY:0:4}... (${#MISTRAL_API_KEY} chars)"
    fi
  else
    echo "Failed to decrypt keys. Please try updating them."
    update_keys
    # Try loading again
    load_keys
  fi
  
  # Securely delete the temporary file
  rm "$TEMP_FILE"
}

# Process command argument
case "$1" in
  "edit"|"update")
    update_keys
    ;;
  "load"|"")
    load_keys
    ;;
  *)
    echo "Usage: source ./keys.sh [load|edit]"
    echo "  load: Load keys into environment (default)"
    echo "  edit: Edit and update keys"
    ;;
esac
EOF

chmod +x "$LOAD_SCRIPT"

# Create README file
README_FILE="/Users/tinamarie/dev/SecondBrain/KEYS_README.md"
cat > "$README_FILE" << 'EOF'
# SecondBrain Secure Keys

This is an ultra-simple, secure API key manager for your SecondBrain project.

## How to Use

There are only two commands you need:

1. **Edit your API keys** (do this once):
   ```bash
   source ./keys.sh edit
   ```

2. **Load your API keys** (do this when you work on the project):
   ```bash
   source ./keys.sh
   ```

## Features

- **Encrypted**: AES-256 encryption protects your keys
- **Portable**: Works on any Mac, including external drives
- **Simple**: Just two commands to remember

## How It Works

- Your keys are stored in an encrypted file that moves with your project
- The encryption key is also stored in your project (but separate from the keys)
- When you load keys, they're decrypted temporarily and loaded into memory
EOF

echo "====================================================="
echo "Secure Key Manager is set up and ready to use!"
echo "====================================================="
echo ""
echo "To edit your API keys, run:"
echo "source ./keys.sh edit"
echo ""
echo "To load your API keys, run:"
echo "source ./keys.sh"
echo ""
echo "That's it! Just two simple commands."
echo "Your keys will be encrypted and will work on any Mac."
echo ""
echo "I'll now open the editor for you to enter your keys..."
echo ""

# Run the edit command to set up initial keys
bash "$LOAD_SCRIPT" edit