#!/bin/bash
# Simple script to set up Notion databases for SecondBrain

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3."
    exit 1
fi

# Install required packages
echo "Installing required Python packages..."
pip3 install requests python-dotenv

# Run the Python script
echo "Setting up Notion databases..."
python3 /Users/tinamarie/dev/SecondBrain/setup-notion.py

# Open the Notion page (if the script succeeded)
if [ $? -eq 0 ]; then
    # Extract the page ID from the .env file
    ROOT_PAGE_ID=$(grep NOTION_ROOT_PAGE_ID .env | cut -d= -f2)
    
    # Remove hyphens from the ID for the URL
    PAGE_URL="https://notion.so/${ROOT_PAGE_ID//-/}"
    
    echo "Opening Notion page in browser: $PAGE_URL"
    open "$PAGE_URL"
fi