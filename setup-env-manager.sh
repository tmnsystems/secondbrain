#!/bin/bash
# Script to set up a secure environment variable manager for SecondBrain

echo "Setting up Secure Environment Manager for SecondBrain..."

# Create directories for the different components
mkdir -p ~/.secondbrain/secrets
mkdir -p ~/.secondbrain/env

# Create a secure encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Save the encryption key securely (user will need to remember this)
echo "Your encryption key is: $ENCRYPTION_KEY"
echo "IMPORTANT: Save this key securely. You will need it to decrypt your credentials."
echo ""

# Create the encryption and decryption utilities
cat > ~/.secondbrain/encrypt.sh << EOF
#!/bin/bash
# Tool to encrypt API keys and credentials

if [ -z "\$1" ] || [ -z "\$2" ]; then
  echo "Usage: \$0 variable_name value"
  echo "Example: \$0 OPENAI_API_KEY sk-1234567890abcdef"
  exit 1
fi

echo "Encrypting \$1..."
echo "\$2" | openssl enc -aes-256-cbc -a -salt -pass pass:$ENCRYPTION_KEY > ~/.secondbrain/secrets/\$1
echo "Stored encrypted \$1 in ~/.secondbrain/secrets/\$1"
EOF

cat > ~/.secondbrain/decrypt.sh << EOF
#!/bin/bash
# Tool to decrypt API keys and credentials

if [ -z "\$1" ]; then
  echo "Usage: \$0 variable_name"
  echo "Example: \$0 OPENAI_API_KEY"
  exit 1
fi

if [ ! -f ~/.secondbrain/secrets/\$1 ]; then
  echo "Error: \$1 not found in secrets storage."
  exit 1
fi

cat ~/.secondbrain/secrets/\$1 | openssl enc -aes-256-cbc -d -a -salt -pass pass:$ENCRYPTION_KEY
EOF

cat > ~/.secondbrain/load-env.sh << EOF
#!/bin/bash
# Script to load encrypted environment variables

# Source this file to load all environment variables:
# source ~/.secondbrain/load-env.sh

echo "Loading SecondBrain environment variables..."

# Create a temporary file to store decrypted values
TEMP_ENV=\$(mktemp)

# Process each secret file
for secret in ~/.secondbrain/secrets/*; do
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

cat > ~/.secondbrain/list-keys.sh << EOF
#!/bin/bash
# Tool to list stored API keys and credentials

echo "Stored API Keys and Credentials:"
echo "=============================="

if [ -z "\$(ls -A ~/.secondbrain/secrets 2>/dev/null)" ]; then
  echo "No credentials stored yet."
else
  for secret in ~/.secondbrain/secrets/*; do
    VAR_NAME=\$(basename "\$secret")
    echo "\$VAR_NAME"
  done
fi
EOF

# Make the scripts executable
chmod +x ~/.secondbrain/encrypt.sh
chmod +x ~/.secondbrain/decrypt.sh
chmod +x ~/.secondbrain/load-env.sh
chmod +x ~/.secondbrain/list-keys.sh

# Create aliases for easy use
cat > ~/.secondbrain/env/aliases.sh << EOF
# Add these to your ~/.bashrc or ~/.zshrc to enable the aliases

alias sb-encrypt="~/.secondbrain/encrypt.sh"
alias sb-decrypt="~/.secondbrain/decrypt.sh"
alias sb-env="source ~/.secondbrain/load-env.sh"
alias sb-list="~/.secondbrain/list-keys.sh"
EOF

# Create a README file
cat > ~/.secondbrain/README.md << EOF
# SecondBrain Environment Manager

A secure way to store and access API keys and credentials for the SecondBrain project.

## Usage

Add these lines to your ~/.bashrc or ~/.zshrc:

\`\`\`bash
# SecondBrain Environment Manager
source ~/.secondbrain/env/aliases.sh
\`\`\`

Then reload your shell or run:
\`\`\`bash
source ~/.secondbrain/env/aliases.sh
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
EOF

# Create sample script to show usage
cat > /Users/tinamarie/dev/SecondBrain/use-env-manager.sh << EOF
#!/bin/bash
# Example script showing how to use the Environment Manager

echo "SecondBrain Environment Manager Example"
echo "======================================"
echo ""
echo "To set up the Environment Manager:"
echo "1. Add this line to your ~/.zshrc file:"
echo "   source ~/.secondbrain/env/aliases.sh"
echo ""
echo "2. Reload your terminal or run:"
echo "   source ~/.secondbrain/env/aliases.sh"
echo ""
echo "3. Store your API keys (examples):"
echo "   sb-encrypt OPENAI_API_KEY 'your-api-key-here'"
echo "   sb-encrypt CLAUDE_API_KEY 'your-api-key-here'"
echo "   sb-encrypt MISTRAL_API_KEY 'your-api-key-here'"
echo ""
echo "4. Load your environment:"
echo "   sb-env"
echo ""
echo "5. List all stored keys:"
echo "   sb-list"
echo ""
echo "Your encryption key is stored in ~/.secondbrain/encrypt.sh"
echo "Make sure to keep a backup of this key in a secure location!"
EOF

chmod +x /Users/tinamarie/dev/SecondBrain/use-env-manager.sh

echo "====================================================="
echo "Environment Manager set up successfully!"
echo "====================================================="
echo ""
echo "Add this line to your ~/.zshrc file:"
echo "source ~/.secondbrain/env/aliases.sh"
echo ""
echo "Then reload your shell or run:"
echo "source ~/.secondbrain/env/aliases.sh"
echo ""
echo "To see usage examples, run:"
echo "/Users/tinamarie/dev/SecondBrain/use-env-manager.sh"
echo ""
echo "Your encryption key is: $ENCRYPTION_KEY"
echo "IMPORTANT: Save this key securely. You will need it to decrypt your credentials."