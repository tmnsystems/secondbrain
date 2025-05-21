#!/bin/bash
# Start Vaultwarden directly

# Create the necessary directories if they don't exist
mkdir -p ~/vaultwarden-data/data

# Create the docker-compose file
cat > ~/vaultwarden-data/docker-compose.yml << EOF
version: '3'
services:
  vaultwarden:
    image: vaultwarden/server:1.27.0
    container_name: vaultwarden
    restart: always
    volumes:
      - ./data:/data
    ports:
      - "8080:80"
    environment:
      - WEBSOCKET_ENABLED=true
      - SIGNUPS_ALLOWED=true
EOF

# Navigate to the directory and start Vaultwarden
cd ~/vaultwarden-data
docker-compose up -d

# Check if Vaultwarden is running
if docker ps | grep -q vaultwarden; then
  echo "Vaultwarden is now running at http://localhost:8080"
  echo ""
  echo "To access it:"
  echo "1. Open your browser to http://localhost:8080"
  echo "2. Create your master account"
  echo "3. Store your API keys securely"
  echo ""
  echo "Your API keys will be encrypted and accessible from any device"
else
  echo "Vaultwarden failed to start."
  
  # Try with alternative image
  cat > ~/vaultwarden-data/docker-compose.yml << EOF
version: '3'
services:
  vaultwarden:
    image: bitwardenrs/server:latest
    container_name: vaultwarden
    restart: always
    volumes:
      - ./data:/data
    ports:
      - "8080:80"
    environment:
      - WEBSOCKET_ENABLED=true
      - SIGNUPS_ALLOWED=true
EOF

  docker-compose up -d
  
  if docker ps | grep -q vaultwarden; then
    echo "Vaultwarden is now running at http://localhost:8080"
  else
    echo "Still having issues. Please check Docker logs."
  fi
fi