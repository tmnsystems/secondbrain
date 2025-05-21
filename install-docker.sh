#!/bin/bash
# Script to install Docker Desktop on macOS

echo "Starting Docker Desktop installation..."

# Check architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  DOCKER_URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
  echo "Detected Apple Silicon (M1/M2/M3) Mac"
else
  DOCKER_URL="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
  echo "Detected Intel Mac"
fi

# Download Docker Desktop
echo "Downloading Docker Desktop..."
curl -# -L -o /tmp/Docker.dmg "$DOCKER_URL"

# Mount the DMG
echo "Mounting Docker.dmg..."
hdiutil attach /tmp/Docker.dmg

# Copy Docker to Applications
echo "Installing Docker Desktop to Applications folder..."
cp -R "/Volumes/Docker/Docker.app" /Applications/

# Unmount the DMG
echo "Cleaning up..."
hdiutil detach "/Volumes/Docker"
rm /tmp/Docker.dmg

echo "Docker Desktop has been installed to your Applications folder."
echo "Please open Docker Desktop manually and complete the setup."
echo "Once Docker is running, come back to this terminal and run:"
echo "./setup-vaultwarden.sh"
echo ""
echo "Note: You may need to grant security permissions during the Docker setup process."