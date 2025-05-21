#!/bin/bash
# Setup script for Vaultwarden (self-hosted password manager)

echo "Setting up Vaultwarden using Docker..."

# Create directory for Vaultwarden data
VAULTWARDEN_DIR="$HOME/vaultwarden-data"
mkdir -p "$VAULTWARDEN_DIR"

# Create docker-compose.yml file
cat > "$VAULTWARDEN_DIR/docker-compose.yml" << EOL
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
      - ADMIN_TOKEN=\${ADMIN_TOKEN}  # Set this for admin page access
EOL

# Create .env file for secrets
cat > "$VAULTWARDEN_DIR/.env" << EOL
# Generate a secure token with: openssl rand -base64 48
ADMIN_TOKEN=YOUR_SECURE_ADMIN_TOKEN
EOL

# Create admin token and update .env file
ADMIN_TOKEN=$(openssl rand -base64 48)
sed -i '' "s/YOUR_SECURE_ADMIN_TOKEN/$ADMIN_TOKEN/g" "$VAULTWARDEN_DIR/.env"

echo "Vaultwarden setup complete!"
echo "======================================================================================="
echo "To start Vaultwarden, navigate to $VAULTWARDEN_DIR and run:"
echo "docker-compose up -d"
echo ""
echo "Then access Vaultwarden at: http://localhost:8080"
echo "Admin interface is at: http://localhost:8080/admin with the token in .env file"
echo ""
echo "SECURITY NOTES:"
echo "1. After initial setup, set SIGNUPS_ALLOWED=false in docker-compose.yml"
echo "2. Consider setting up a reverse proxy with HTTPS for production use"
echo "3. Back up the $VAULTWARDEN_DIR/data directory regularly"
echo "======================================================================================="
echo ""
echo "Your admin token is: $ADMIN_TOKEN"
echo "IMPORTANT: Save this token securely, as it won't be shown again!"