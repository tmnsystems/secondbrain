# Notion MCP Server Implementation Upgrade

## Changes Made

1. **Created MCP Server Implementation**:
   - Built a proper TypeScript-based MCP server using the `mcp-framework` package
   - Located at `/Volumes/Envoy/MCP/notion-mcp-server`
   - Includes tools for:
     - `get-database-ids`: Lists all known Notion database IDs 
     - `create-page`: Creates a new page in a Notion database

2. **Added Scripts and Configuration**:
   - Updated start script: `/Volumes/Envoy/MCP/start-notion-mcp.sh`
   - Created relay implementation: `/Volumes/Envoy/SecondBrain/lib/relayNotion.js.new`

3. **Verified Functionality**:
   - Confirmed server starts successfully
   - Verified Notion API connection
   - Tools are properly registered and available

## Testing the Implementation

1. Start the server:
   ```
   /Volumes/Envoy/MCP/start-notion-mcp.sh
   ```

2. The server will be available at http://localhost:3500

3. To test with Claude CLI:
   ```
   claude cli-tool mcp notion-mcp get-database-ids
   ```

## Deploying the Changes

1. To deploy the updated relay implementation:
   ```
   cp /Volumes/Envoy/SecondBrain/lib/relayNotion.js.new /Volumes/Envoy/SecondBrain/lib/relayNotion.js
   ```

2. Update the Claude configuration file to use the MCP server:
   ~/.config/claude/config.json should include:
   ```json
   {
     "mcpServers": {
       "notion-mcp": {
         "command": "/Volumes/Envoy/MCP/start-notion-mcp.sh",
         "env": {}
       }
     }
   }
   ```

## Rollback Instructions

1. Restore the original relay implementation:
   ```
   cp /Volumes/Envoy/MCP/backups/relayNotion.js.bak /Volumes/Envoy/SecondBrain/lib/relayNotion.js
   ```

2. Remove the MCP server from Claude's configuration:
   Edit ~/.config/claude/config.json and remove the "notion-mcp" entry