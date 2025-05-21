#!/bin/bash
# Direct fix for Docker authentication issues

echo "Applying direct fixes for Docker authentication issues..."

# Force logout any existing Docker sessions
docker logout

# Clear credential helpers that might be causing issues
if [ -f ~/.docker/config.json ]; then
  echo "Backing up and recreating Docker config..."
  cp ~/.docker/config.json ~/.docker/config.json.bak
  cat > ~/.docker/config.json << EOF
{
  "auths": {},
  "credHelpers": {},
  "credStore": "",
  "experimental": "disabled",
  "stackOrchestrator": "swarm"
}
EOF
fi

# Restart Docker daemon
echo "Restarting Docker Desktop..."
osascript -e 'quit app "Docker Desktop"'
sleep 3
open -a "Docker Desktop"
echo "Waiting for Docker to restart (30 seconds)..."
sleep 30

# Try anonymous image pull (no auth required)
echo "Testing Docker with anonymous pull..."
docker pull hello-world:linux

# If pull works, set up Vaultwarden with a specific version reference
if [ $? -eq 0 ]; then
  echo "Docker pull succeeded! Setting up Vaultwarden..."
  
  # Set up local Vaultwarden with specific version
  mkdir -p ~/vaultwarden-data/data
  
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

  # Run Vaultwarden with the specific version
  cd ~/vaultwarden-data
  docker-compose up -d
  
  if [ $? -eq 0 ]; then
    echo "Vaultwarden is now running at http://localhost:8080"
    echo "You can access it to store your API keys securely!"
  else
    echo "Vaultwarden startup failed. Let's try with bitwardenrs image..."
    
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
    
    if [ $? -eq 0 ]; then
      echo "Vaultwarden (bitwardenrs) is now running at http://localhost:8080"
    else
      echo "Both image attempts failed. Trying with Docker run command directly..."
      
      docker run -d --name vaultwarden -v ~/vaultwarden-data/data:/data \
        -p 8080:80 -e WEBSOCKET_ENABLED=true -e SIGNUPS_ALLOWED=true \
        vaultwarden/server:1.27.0 || docker run -d --name vaultwarden \
        -v ~/vaultwarden-data/data:/data -p 8080:80 \
        -e WEBSOCKET_ENABLED=true -e SIGNUPS_ALLOWED=true \
        bitwardenrs/server:latest
        
      if [ $? -eq 0 ]; then
        echo "Vaultwarden is now running at http://localhost:8080"
      else
        echo "All attempts to start Vaultwarden failed."
        echo "This might be due to persistent Docker network issues."
        echo "Please check your Docker settings and network configuration."
      fi
    fi
  fi
else
  echo "Docker is still having issues. Please try:"
  echo "1. Opening Docker Desktop settings"
  echo "2. Going to 'Docker Engine' section"
  echo "3. Adding this to the configuration JSON:"
  echo '   "insecure-registries": ["registry-1.docker.io"]'
  echo "4. Restarting Docker Desktop"
  echo "5. Running this script again"
fi