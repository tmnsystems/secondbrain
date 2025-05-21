# Sourcegraph Implementation for SecondBrain

This document outlines the implementation of Sourcegraph for the SecondBrain project - a powerful code search and intelligence platform that enhances development productivity.

## Overview

Sourcegraph provides universal code search and navigation capabilities across the entire SecondBrain codebase. Our implementation includes:

1. Containerized Sourcegraph server with Docker Compose
2. LSIF code intelligence for precise code navigation
3. OAuth SSO integration for secure authentication
4. Admin dashboard bookmarks for easy access
5. Backup and maintenance scripts

## Installation and Setup

### System Architecture

The Sourcegraph implementation consists of:

- **Core Components**: 
  - Sourcegraph server container
  - PostgreSQL database container
  - Redis cache container
  - Docker volumes for persistent storage

- **Integration Points**:
  - Git repositories (local and remote)
  - OAuth providers (GitHub/Google)
  - LSIF indexers for code intelligence

### Directory Structure

```
/Volumes/Envoy/SecondBrain/apps/sourcegraph/
├── docker-compose.yml        # Docker Compose configuration
├── manage-sourcegraph.sh     # Management script
├── upload-lsif-indexes.sh    # LSIF indexing script
├── setup-oauth.sh            # OAuth setup script
├── oauth-sso-config.json     # OAuth configuration template
├── admin-dashboard-bookmark.html  # Admin bookmark page
├── OAUTH_SSO_SETUP.md        # OAuth documentation
└── README.md                 # Usage documentation
```

### Installation Steps

1. Install Docker Desktop
   ```bash
   /Volumes/Envoy/SecondBrain/install-docker.sh
   ```

2. Deploy Sourcegraph stack
   ```bash
   cd /Volumes/Envoy/SecondBrain/apps/sourcegraph
   ./manage-sourcegraph.sh start
   ```

3. Upload LSIF indexes
   ```bash
   ./upload-lsif-indexes.sh
   ```

4. Configure OAuth SSO
   ```bash
   ./setup-oauth.sh github  # or google
   ```

5. Access the admin dashboard bookmark
   ```
   Open /Volumes/Envoy/SecondBrain/apps/sourcegraph/admin-dashboard-bookmark.html in a browser
   ```

## Features

### 1. Code Search and Navigation

- Full-text search across all SecondBrain repositories
- Regular expression and structural search support
- Cross-repository code navigation
- Symbol search for functions, classes, and definitions

### 2. Code Intelligence

- Precise code navigation with LSIF
- Jump-to-definition functionality
- Find-references capabilities
- Hover documentation

### 3. Authentication and Security

- OAuth integration with GitHub/Google
- Optional organization/domain restrictions
- Configurable signup and access policies
- Role-based permissions

### 4. Management and Maintenance

- Simple start/stop/restart commands
- Backup and restore capabilities
- Log access and monitoring
- Configuration management

## Configuration

### Docker Compose Configuration

The `docker-compose.yml` file defines the Sourcegraph deployment with appropriate volume mapping and network settings.

Key configuration points:
- Port 7080 for HTTP access
- Data volumes for persistence
- Environment variables for customization

### OAuth SSO Configuration

OAuth SSO is configured through the Sourcegraph site configuration. See `OAUTH_SSO_SETUP.md` for detailed instructions.

Example GitHub configuration:
```json
{
  "auth.providers": [
    {
      "type": "github",
      "displayName": "GitHub",
      "clientID": "YOUR_CLIENT_ID",
      "clientSecret": "YOUR_CLIENT_SECRET",
      "allowSignup": true
    }
  ]
}
```

### LSIF Configuration

LSIF indexes are generated and uploaded through the `upload-lsif-indexes.sh` script, which:
1. Identifies TypeScript and Python projects
2. Generates appropriate LSIF/SCIP indexes
3. Uploads them to Sourcegraph
4. Provides precise code intelligence

## Usage

### Starting and Stopping

```bash
# Start Sourcegraph
./manage-sourcegraph.sh start

# Stop Sourcegraph
./manage-sourcegraph.sh stop

# Restart Sourcegraph
./manage-sourcegraph.sh restart
```

### Viewing Status and Logs

```bash
# Check status
./manage-sourcegraph.sh status

# View logs
./manage-sourcegraph.sh logs
```

### Backup and Restore

```bash
# Backup data
./manage-sourcegraph.sh backup
```

### Accessing the UI

Access Sourcegraph at http://localhost:7080

## Maintenance

### Updates

To update Sourcegraph to a newer version:

1. Edit the version tag in docker-compose.yml
2. Restart the service
   ```bash
   ./manage-sourcegraph.sh restart
   ```

### Regular Maintenance Tasks

- Check for outdated LSIF indexes
  ```bash
  ./upload-lsif-indexes.sh
  ```
- Monitor disk usage of Docker volumes
- Review security settings periodically

## Troubleshooting

### Common Issues

1. **Docker Connectivity Issues**
   - Check Docker Desktop is running
   - Verify port 7080 is available
   - Check the Docker logs

2. **LSIF Index Failures**
   - Verify repository is correctly configured
   - Check dependencies for LSIF tools
   - Review LSIF upload permissions

3. **OAuth Configuration Problems**
   - Verify client IDs and secrets
   - Check callback URLs match exactly
   - Review Sourcegraph logs for auth errors

## Conclusion

This Sourcegraph implementation provides the SecondBrain project with powerful code intelligence and search capabilities, enhancing developer productivity and code understanding. The integration of OAuth SSO ensures secure access, while LSIF indexing provides precise code navigation.