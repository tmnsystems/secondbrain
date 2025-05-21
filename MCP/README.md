# SecondBrain Notion MCP Server

This directory contains a custom MCP (Model Context Protocol) server that enables direct Notion API integration for the SecondBrain project, bypassing OpenAI Codex sandbox limitations.

## Components

- `notion-mcp-server.js`: The core MCP server implementation
- `setup-notion-mcp.js`: Setup script for installing dependencies and configuring the environment
- `claude-notion-tool.js`: Command-line utility for invoking MCP tools from scripts
- `start-notion-mcp.sh`: Simple script to start the MCP server
- `relayNotion.js.new`: Updated relay implementation that falls back to MCP when needed

## Setup Instructions

1. Install dependencies and configure the environment:
   ```
   cd /Volumes/Envoy/MCP
   node setup-notion-mcp.js
   ```

2. Start the MCP server:
   ```
   ./start-notion-mcp.sh
   ```

3. (Optional) Update the relay script in the SecondBrain project:
   ```
   cp /Volumes/Envoy/MCP/relayNotion.js.new /Volumes/Envoy/SecondBrain/lib/relayNotion.js
   ```

## Testing

To test that the MCP server is working correctly:

```
node claude-notion-tool.js notion-mcp getDatabaseIds
```

Or use the Claude CLI directly:

```
claude cli-tool mcp notion-mcp getDatabaseIds
```

## Available Tools

The MCP server provides the following tools for interacting with Notion:

- `createPage`: Create a new page in a Notion database
- `queryDatabase`: Query a Notion database with optional filters
- `updatePage`: Update an existing page in Notion
- `getDatabaseMetadata`: Get metadata about a Notion database
- `getPageContent`: Get a page's content including blocks
- `addBlockToPage`: Add a new block to a page
- `listDatabases`: List all databases accessible to the integration
- `getDatabaseIds`: Get a table of all known database IDs from environment

## Rollback Instructions

If you need to revert to the original implementation, see the CHANGELOG.md file for detailed instructions.

## Security Notes

This implementation:
1. Reads all credentials from the existing SecondBrain environment
2. Does not expose additional access beyond what the Notion API already permits
3. Supports multiple authentication fallbacks for maximum reliability