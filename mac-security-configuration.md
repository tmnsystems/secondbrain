# Configuring Mac Security for Docker and Development

## Application Permissions

1. **System Settings > Privacy & Security**
   - Check "Full Disk Access" - ensure Terminal and Docker Desktop are allowed
   - Check "Network" - ensure Docker Desktop is allowed
   - Check "App Management" - Docker Desktop should be allowed

2. **Gatekeeper Warnings**
   - If you see "app cannot be opened because it is from an unidentified developer"
   - Go to System Settings > Privacy & Security
   - Look for messages about blocked applications at the bottom
   - Click "Open Anyway" for Docker Desktop

## Mac Firewall Settings

1. **System Settings > Network > Firewall**
   - If firewall is on, click "Options..." or "Firewall Options..."
   - Ensure "Docker Desktop" is set to "Allow incoming connections"
   - Add Terminal app and allow incoming connections

## Check Network Monitoring/Security Software

1. **Little Snitch or similar tools**
   - Check if you have network monitoring tools installed
   - Ensure they allow Docker to communicate with external servers
   - Allow connections to registry.docker.io

## DNS Issues

1. **Try alternative DNS servers**
   - System Settings > Network > [Your connection] > Details > DNS
   - Try adding Google DNS servers: 8.8.8.8 and 8.8.4.4

## Reset Docker Desktop

1. **Reset Docker Desktop settings**
   - Open Docker Desktop
   - Click on the gear icon (Preferences)
   - Click "Troubleshoot" or "Reset"
   - Select "Reset to factory defaults"

## Command Line Fixes

1. **Check Docker status**
   ```bash
   docker info
   ```

2. **Reset Docker credentials**
   ```bash
   rm -rf ~/.docker/config.json
   docker login
   ```

3. **Check DNS resolution**
   ```bash
   ping registry.docker.io
   ```

4. **Check for SSL certificate issues**
   ```bash
   curl -v https://registry.docker.io
   ```

## Using Docker Without Authentication

The error suggests Docker can't authenticate with the registry. Try using a public image that doesn't require authentication:

1. **Modified docker-compose.yml**
   ```yaml
   version: '3'
   services:
     bitwarden:
       image: bitwarden/self-host:latest
       container_name: bitwarden
       restart: always
       volumes:
         - ./data:/data
       ports:
         - "8080:80"
   ```

2. **Or try a simple test image**
   ```bash
   docker run hello-world
   ```