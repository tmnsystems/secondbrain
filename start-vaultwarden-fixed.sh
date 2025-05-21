#!/bin/bash
# Script to start Vaultwarden service

VAULTWARDEN_DIR="/Users/tinamarie/vaultwarden-data"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker doesn't seem to be running. Please start Docker Desktop first."
  exit 1
fi

# Create data directory if it doesn't exist
mkdir -p "$VAULTWARDEN_DIR/data"

# Navigate to Vaultwarden directory
cd "$VAULTWARDEN_DIR"

# Make sure docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
  echo "docker-compose.yml not found. Creating it now..."
  cat > "docker-compose.yml" << EOL
version: '3'
services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: always
    volumes:
      - ./data:/data
    ports:
      - "8080:80"
    environment:
      - WEBSOCKET_ENABLED=true  # Enable websockets for sync
      - SIGNUPS_ALLOWED=true    # Set to false after initial setup
EOL
fi

# Start Vaultwarden
echo "Starting Vaultwarden..."
docker-compose up -d

# Check if it's running
if docker ps | grep -q "vaultwarden"; then
  echo "Vaultwarden is now running!"
  echo "You can access it at: http://localhost:8080"
  echo "Admin interface: http://localhost:8080/admin"
  echo ""
  echo "IMPORTANT:"
  echo "After creating your account, consider setting SIGNUPS_ALLOWED=false in docker-compose.yml for security"
else
  echo "Failed to start Vaultwarden. Please check the Docker logs."
fi