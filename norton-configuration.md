# Configuring Norton 360 for Development

This guide will help you configure Norton 360 to work properly with development tools like Docker, Node.js servers, and localhost connections.

## Allow Docker Registry Access

1. Open Norton 360
2. Go to Settings > Firewall > Program Control
3. Find "Docker Desktop" in the list (or add it if not present)
4. Set access to "Automatic" or "Allow" for all connection types
5. Specifically allow outbound connections to:
   - `registry.docker.io` (port 443)
   - `auth.docker.io` (port 443)
   - `registry-1.docker.io` (port 443)

## Allow Localhost Connections

1. Go to Settings > Firewall > Traffic Rules
2. Create a new rule with these settings:
   - Rule Name: "Allow Localhost"
   - Action: Allow
   - Direction: Both
   - Protocol: TCP and UDP
   - Source Address: Local Network (or 127.0.0.1/8)
   - Destination Address: Local Network (or 127.0.0.1/8)
   - Source Ports: All
   - Destination Ports: All

## Allow Development Servers

1. Go to Settings > Firewall > Program Control
2. Add entries for:
   - Node.js (node.exe)
   - npm
   - Your web browsers
3. Set access to "Allow" for all connection types

## Temporarily Disable Firewall (If Needed)

If you're still having issues during development:

1. Go to Settings > Firewall
2. Turn the firewall to "Off" temporarily while developing
3. Remember to turn it back on when done

## Configure Smart Firewall

1. Go to Settings > Firewall > Smart Firewall
2. Set "Program Auto Block" to "Off" during development
3. Add exceptions for development directories

## Add Application Exceptions

1. Go to Settings > Antivirus > Scans and Risks > Exclusions
2. Add exclusions for:
   - `/Users/tinamarie/dev/SecondBrain`
   - `/Users/tinamarie/dev/SecondBrain-Frontend`
   - `/Users/tinamarie/dev/SecondBrain-Content`
   - `/Users/tinamarie/dev/SecondBrain-API`
   - `/Users/tinamarie/vaultwarden-data`

## After Configuration

After configuring Norton 360:

1. Restart your computer
2. Start Docker Desktop
3. Test Docker connection with: `docker run hello-world`
4. Try Vaultwarden setup again with: `bash /Users/tinamarie/dev/SecondBrain/start-vaultwarden-fixed.sh`