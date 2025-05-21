#!/bin/bash
# Script to use KeePassXC locally without Docker

echo "Setting up KeePassXC for API key management..."

# Check if Homebrew is installed
if ! command -v brew &>/dev/null; then
  echo "Homebrew not found. Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "Homebrew is already installed."
fi

# Install KeePassXC using Homebrew
echo "Installing KeePassXC using Homebrew..."
brew install --cask keepassxc

# Create a database directory that will move with your project
KPDB_DIR="/Users/tinamarie/dev/SecondBrain/.keys"
mkdir -p "$KPDB_DIR"

# Create instructions file
cat > "$KPDB_DIR/README.md" << 'EOF'
# SecondBrain API Key Management with KeePassXC

KeePassXC is a secure, open-source password manager that can store all your API keys.

## Setup Instructions

1. Open KeePassXC from your Applications folder

2. Create a new database:
   - File > New Database
   - Save it as "SecondBrain.kdbx" in this directory
   - Set a strong master password

3. Add your API keys:
   - Click the "Add Entry" button (or press Ctrl+N)
   - Title: "Claude API"
   - Username: "Claude"
   - Password: Your actual API key
   - Repeat for each API key you need to store

## Accessing on Multiple Computers

1. The database file (.kdbx) will move with your project
2. Install KeePassXC on each computer you use
3. Open the database file from this directory

## Integration with Code

KeePassXC provides several ways to integrate with your code:
- Command-line interface (CLI)
- Browser extension
- Auto-type feature

## Security Benefits

- Military-grade AES-256 encryption
- Master password protection
- Optional key file for two-factor security
- No network access required
- Open-source security
EOF

# Create convenience script to open KeePassXC
cat > "/Users/tinamarie/dev/SecondBrain/open-keys.sh" << 'EOF'
#!/bin/bash
# Script to open KeePassXC with the SecondBrain database

# Find the KeePassXC location
if [ -d "/Applications/KeePassXC.app" ]; then
  KEEPASSXC="/Applications/KeePassXC.app/Contents/MacOS/KeePassXC"
else
  KEEPASSXC=$(which keepassxc 2>/dev/null)
fi

if [ -z "$KEEPASSXC" ]; then
  echo "KeePassXC not found. Please make sure it's installed."
  exit 1
fi

# Find the database file
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="$DIR/.keys/SecondBrain.kdbx"

# If database doesn't exist yet, just open KeePassXC
if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH"
  echo "Opening KeePassXC. Please create a new database and save it to the location above."
  open -a KeePassXC
else
  # Open the database
  open -a KeePassXC "$DB_PATH"
fi
EOF

chmod +x "/Users/tinamarie/dev/SecondBrain/open-keys.sh"

echo "====================================================="
echo "KeePassXC setup complete!"
echo "====================================================="
echo ""
echo "To use KeePassXC with SecondBrain:"
echo ""
echo "1. Run this command to open KeePassXC:"
echo "   ./open-keys.sh"
echo ""
echo "2. Follow the instructions in .keys/README.md to create and set up your database"
echo ""
echo "This solution:"
echo "- Works on any Mac without Docker"
echo "- Provides strong encryption for your API keys"
echo "- Works with external drives and between computers"
echo "- Is maintained by security professionals"
echo ""
echo "I'll now open KeePassXC for you to set up your database..."

# Open KeePassXC
bash "/Users/tinamarie/dev/SecondBrain/open-keys.sh"