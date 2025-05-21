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

```bash
source .secretstore/env/aliases.sh
```

### Available Commands

- `sb-encrypt API_KEY_NAME "your-secret-key"` - Encrypt and store a new credential
- `sb-decrypt API_KEY_NAME` - View a stored credential
- `sb-env` - Load all credentials into your environment
- `sb-list` - List all stored credential names

### Examples

```bash
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
```

## Security

Keys are encrypted using AES-256-CBC with your master encryption key. 
Never share your encryption key or stored credentials with anyone.

Your encryption key is: bafca5d8c91672fe2b7f67a8f6a1f8f33f97c76f41d67adfc718bc2a22fe75f4
IMPORTANT: Save this key securely. You will need it to decrypt your credentials.
