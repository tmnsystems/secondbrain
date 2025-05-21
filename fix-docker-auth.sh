#!/bin/bash
# Fix Docker authentication issues

echo "Fixing Docker Hub authentication issues..."

# Reset Docker configuration
echo "Resetting Docker configuration..."
rm -rf ~/.docker/config.json 2>/dev/null

# Log in to Docker Hub interactively
echo "Logging in to Docker Hub..."
docker login

# Test pull a simple image
echo "Testing Docker pull..."
docker pull hello-world

# If successful, try vaultwarden again
if [ $? -eq 0 ]; then
  echo "Docker authentication fixed successfully!"
  echo ""
  echo "Let's try setting up Vaultwarden again..."
  
  # Set up Vaultwarden
  VAULTWARDEN_DIR="$HOME/vaultwarden-data"
  mkdir -p "$VAULTWARDEN_DIR/data"
  
  # Create docker-compose file with proper image reference
  cat > "$VAULTWARDEN_DIR/docker-compose.yml" << EOL
version: '3'
services:
  vaultwarden:
    image: bitwarden/server:latest
    container_name: vaultwarden
    restart: always
    volumes:
      - ./data:/data
    ports:
      - "8080:80"
    environment:
      - WEBSOCKET_ENABLED=true
      - SIGNUPS_ALLOWED=true
EOL

  # Try to start Vaultwarden
  cd "$VAULTWARDEN_DIR"
  docker-compose up -d
  
  if [ $? -eq 0 ]; then
    echo "Vaultwarden is now running at http://localhost:8080"
    echo "Set up your account and store your API keys securely."
  else
    echo "Still having issues with Vaultwarden. You may need to check Docker settings or network configuration."
  fi
else
  echo "Docker authentication issues persist. You may need to:"
  echo "1. Check your internet connection"
  echo "2. Verify SSL certificates are working"
  echo "3. Check Docker Desktop settings"
  echo "4. Try docker logout and then docker login again"
fi