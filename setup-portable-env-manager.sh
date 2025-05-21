#!/bin/bash
# Script to set up a portable environment variable manager for SecondBrain

echo "Setting up Portable Environment Manager for SecondBrain..."

# Create directories within the project for portability
SECONDBRAIN_DIR="/Users/tinamarie/dev/SecondBrain"
mkdir -p "$SECONDBRAIN_DIR/.secretstore/secrets"
mkdir -p "$SECONDBRAIN_DIR/.secretstore/env"

# Create a secure encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Save the encryption key securely (user will need to remember this)
echo "Your encryption key is: $ENCRYPTION_KEY"
echo "IMPORTANT: Save this key securely. You will need it to decrypt your credentials."
echo ""

# Create the encryption and decryption utilities
cat > "$SECONDBRAIN_DIR/.secretstore/encrypt.sh" << EOF
#!/bin/bash
# Tool to encrypt API keys and credentials

# Get the script's directory path for portability
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="\$SCRIPT_DIR/secrets"

if [ -z "\$1" ] || [ -z "\$2" ]; then
  echo "Usage: \$0 variable_name value"
  echo "Example: \$0 OPENAI_API_KEY sk-1234567890abcdef"
  exit 1
fi

echo "Encrypting \$1..."
echo "\$2" | openssl enc -aes-256-cbc -a -salt -pass pass:$ENCRYPTION_KEY > "\$SECRETS_DIR/\$1"
echo "Stored encrypted \$1 in \$SECRETS_DIR/\$1"
EOF

cat > "$SECONDBRAIN_DIR/.secretstore/decrypt.sh" << EOF
#!/bin/bash
# Tool to decrypt API keys and credentials

# Get the script's directory path for portability
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="\$SCRIPT_DIR/secrets"

if [ -z "\$1" ]; then
  echo "Usage: \$0 variable_name"
  echo "Example: \$0 OPENAI_API_KEY"
  exit 1
fi

if [ ! -f "\$SECRETS_DIR/\$1" ]; then
  echo "Error: \$1 not found in secrets storage."
  exit 1
fi

cat "\$SECRETS_DIR/\$1" | openssl enc -aes-256-cbc -d -a -salt -pass pass:$ENCRYPTION_KEY
EOF

cat > "$SECONDBRAIN_DIR/.secretstore/load-env.sh" << EOF
#!/bin/bash
# Script to load encrypted environment variables

# Get the script's directory path for portability
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="\$SCRIPT_DIR/secrets"

echo "Loading SecondBrain environment variables..."

# Create a temporary file to store decrypted values
TEMP_ENV=\$(mktemp)

# Process each secret file
for secret in \$SECRETS_DIR/*; do
  if [ -f "\$secret" ]; then
    VAR_NAME=\$(basename "\$secret")
    VAR_VALUE=\$(cat "\$secret" | openssl enc -aes-256-cbc -d -a -salt -pass pass:$ENCRYPTION_KEY 2>/dev/null)
    
    if [ \$? -eq 0 ]; then
      echo "export \$VAR_NAME='\$VAR_VALUE'" >> \$TEMP_ENV
      echo "Loaded: \$VAR_NAME"
    else
      echo "Warning: Failed to decrypt \$VAR_NAME"
    fi
  fi
done

# Source the temporary file
source \$TEMP_ENV

# Remove the temporary file
rm \$TEMP_ENV

echo "Environment loaded successfully!"
EOF

cat > "$SECONDBRAIN_DIR/.secretstore/list-keys.sh" << EOF
#!/bin/bash
# Tool to list stored API keys and credentials

# Get the script's directory path for portability
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
SECRETS_DIR="\$SCRIPT_DIR/secrets"

echo "Stored API Keys and Credentials:"
echo "=============================="

if [ -z "\$(ls -A \$SECRETS_DIR 2>/dev/null)" ]; then
  echo "No credentials stored yet."
else
  for secret in \$SECRETS_DIR/*; do
    VAR_NAME=\$(basename "\$secret")
    echo "\$VAR_NAME"
  done
fi
EOF

# Make the scripts executable
chmod +x "$SECONDBRAIN_DIR/.secretstore/encrypt.sh"
chmod +x "$SECONDBRAIN_DIR/.secretstore/decrypt.sh"
chmod +x "$SECONDBRAIN_DIR/.secretstore/load-env.sh"
chmod +x "$SECONDBRAIN_DIR/.secretstore/list-keys.sh"

# Create aliases file
cat > "$SECONDBRAIN_DIR/.secretstore/env/aliases.sh" << EOF
# SecondBrain Portable Environment Manager

# Get the SecondBrain root directory by finding this file's location
SECRETSTORE_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
SECONDBRAIN_ROOT="\$(cd "\$SECRETSTORE_DIR/.." &> /dev/null && pwd)"

# Export the SecondBrain root directory so scripts can find it
export SECONDBRAIN_ROOT="\$SECONDBRAIN_ROOT"

# Create aliases that work on any computer
alias sb-encrypt="\$SECRETSTORE_DIR/encrypt.sh"
alias sb-decrypt="\$SECRETSTORE_DIR/decrypt.sh"
alias sb-env="source \$SECRETSTORE_DIR/load-env.sh"
alias sb-list="\$SECRETSTORE_DIR/list-keys.sh"

echo "SecondBrain environment activated. Root directory: \$SECONDBRAIN_ROOT"
echo "Available commands: sb-encrypt, sb-decrypt, sb-env, sb-list"
EOF

# Create a README file
cat > "$SECONDBRAIN_DIR/.secretstore/README.md" << EOF
# SecondBrain Portable Environment Manager

A secure, portable way to store and access API keys for the SecondBrain project.

## Portability

This system is designed to work when:
- Moving between computers 
- Using external drives
- Working in different environments

All secrets are stored relative to your SecondBrain project directory.

## Usage

From within your SecondBrain directory, run:

\`\`\`bash
source .secretstore/env/aliases.sh
\`\`\`

### Available Commands

- \`sb-encrypt API_KEY_NAME "your-secret-key"\` - Encrypt and store a new credential
- \`sb-decrypt API_KEY_NAME\` - View a stored credential
- \`sb-env\` - Load all credentials into your environment
- \`sb-list\` - List all stored credential names

### Examples

\`\`\`bash
# Store your OpenAI API key
sb-encrypt OPENAI_API_KEY "sk-1234567890abcdef"

# Store your Claude API key
sb-encrypt CLAUDE_API_KEY "sk-ant-api03-1234567890abcdef"

# Load all keys into environment
sb-env

# List all stored keys
sb-list

# Use the keys in your code
python -c "import os; print(f'OpenAI API Key: {os.environ.get(\"OPENAI_API_KEY\")}')"
\`\`\`

## Security

Keys are encrypted using AES-256-CBC with your master encryption key. 
Never share your encryption key or stored credentials with anyone.

Your encryption key is: $ENCRYPTION_KEY
IMPORTANT: Save this key securely. You will need it to decrypt your credentials.
EOF

# Create a convenience activation script in the main directory
cat > "$SECONDBRAIN_DIR/activate-env.sh" << EOF
#!/bin/bash
# Script to activate the SecondBrain environment

# Source the aliases file to set up the environment
source "\$(dirname "\${BASH_SOURCE[0]}")/.secretstore/env/aliases.sh"
EOF

chmod +x "$SECONDBRAIN_DIR/activate-env.sh"

# Create sample script to show usage
cat > "$SECONDBRAIN_DIR/use-env-manager.sh" << EOF
#!/bin/bash
# Example script showing how to use the Environment Manager

echo "SecondBrain Portable Environment Manager Example"
echo "=============================================="
echo ""
echo "To set up the Environment Manager anywhere:"
echo ""
echo "1. Activate the environment (do this first):"
echo "   source ./activate-env.sh"
echo ""
echo "2. Store your API keys (examples):"
echo "   sb-encrypt OPENAI_API_KEY 'your-api-key-here'"
echo "   sb-encrypt CLAUDE_API_KEY 'your-api-key-here'"
echo "   sb-encrypt MISTRAL_API_KEY 'your-api-key-here'"
echo ""
echo "3. Load your environment:"
echo "   sb-env"
echo ""
echo "4. List all stored keys:"
echo "   sb-list"
echo ""
echo "Your encryption key is stored in .secretstore/README.md"
echo "Make sure to keep a backup of this key in a secure location!"
EOF

chmod +x "$SECONDBRAIN_DIR/use-env-manager.sh"

echo "=========================================================="
echo "Portable Environment Manager set up successfully!"
echo "=========================================================="
echo ""
echo "Whenever you work on SecondBrain, activate the environment first:"
echo "source ./activate-env.sh"
echo ""
echo "This works on any computer, including with external drives."
echo ""
echo "To see usage examples, run:"
echo "./use-env-manager.sh"
echo ""
echo "Your encryption key is: $ENCRYPTION_KEY"
echo "IMPORTANT: Save this key securely. You will need it to decrypt your credentials."