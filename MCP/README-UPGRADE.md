# SecondBrain Notion MCP Integration

This directory contains a Model Context Protocol (MCP) server that enables Claude and other AI assistants to interact with Notion directly, bypassing the OpenAI Codex sandbox limitations.

## Overview

The MCP server provides the following capabilities:

1. **Database Operations**
   - List all configured Notion databases
   - Create pages in Notion databases
   - Query database contents

2. **Authentication**
   - Uses the existing Notion API key from SecondBrain env files
   - No additional setup required

3. **Integration Methods**
   - Direct API access via REST endpoints
   - Claude CLI integration
   - Updated relay script for backward compatibility

## Getting Started

1. **Start the MCP Server**

   ```bash
   /Volumes/Envoy/MCP/start-notion-mcp.sh
   ```

   The server will be available at http://localhost:3500

2. **Test the Connection**

   ```bash
   claude cli-tool mcp notion-mcp get-database-ids
   ```

   This should return a list of all configured Notion databases.

3. **Update Relay Implementation (Optional)**

   ```bash
   cp /Volumes/Envoy/SecondBrain/lib/relayNotion.js.new /Volumes/Envoy/SecondBrain/lib/relayNotion.js
   ```

   This adds MCP fallback to the existing relay implementation.

## Using the MCP Server

### With Claude

Claude can now use the Notion MCP server directly:

```
create a page titled "Test Page" in my tasks database
```

Claude will use the MCP server to create the page in Notion.

### From JavaScript

```javascript
import fetch from "node-fetch";

const response = await fetch("http://localhost:3500/mcp/rpc", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method: "create-page",
    params: {
      databaseId: "YOUR_DATABASE_ID",
      title: "Page Title",
      properties: {}
    }
  }),
});

const result = await response.json();
console.log(result);
```

## Extending the Server

The MCP server is built with TypeScript using the `mcp-framework` package. To add more tools:

1. Navigate to the server directory:
   ```bash
   cd /Volumes/Envoy/MCP/notion-mcp-server
   ```

2. Add a new tool:
   ```bash
   ./node_modules/.bin/mcp add tool your-tool-name
   ```

3. Edit the tool file in `src/tools/YourToolNameTool.ts`

4. Build the server:
   ```bash
   npm run build
   ```

5. Restart the server to apply changes

## Troubleshooting

If you encounter issues:

1. Check the server logs for errors
2. Verify the Notion API key in `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env`
3. Ensure the SecondBrain database IDs are correctly configured

For more details on changes made, see [CHANGELOG-UPGRADE.md](/Volumes/Envoy/MCP/CHANGELOG-UPGRADE.md)