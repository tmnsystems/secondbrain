#!/bin/bash
# Script to install KeePassXC password manager

echo "Setting up KeePassXC Password Manager..."

# Check if brew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install KeePassXC
echo "Installing KeePassXC..."
brew install --cask keepassxc

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "KeePassXC installed successfully!"
    echo ""
    echo "To use KeePassXC:"
    echo "1. Open it from your Applications folder"
    echo "2. Create a new database file to store your passwords"
    echo "3. Save the database file in a secure location"
    echo ""
    echo "SECURITY RECOMMENDATIONS:"
    echo "- Create a strong master password"
    echo "- Store your database file in iCloud or another secure backup location"
    echo "- Consider setting up key file authentication for extra security"
    echo ""
    echo "KeePassXC can be used to securely store:"
    echo "- API keys for Claude, OpenAI, etc."
    echo "- Database credentials"
    echo "- Server access credentials"
    echo "- Other sensitive information"
else
    echo "Failed to install KeePassXC. Please try installing it manually."
fi