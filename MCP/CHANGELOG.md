# Notion MCP Integration Changelog

Created on: Tue May 20 20:58:26 PDT 2025

## Changes

1. Created Notion MCP server in /Volumes/Envoy/MCP/notion-mcp-server.js
2. Created setup script in /Volumes/Envoy/MCP/setup-notion-mcp.js
3. Created CLI tool script in /Volumes/Envoy/MCP/claude-notion-tool.js
4. Backed up original /Volumes/Envoy/SecondBrain/lib/relayNotion.js to /Volumes/Envoy/MCP/backups/relayNotion.js.bak

## Rollback Instructions

1. To restore the original relay functionality:
   - Copy /Volumes/Envoy/MCP/backups/relayNotion.js.bak back to /Volumes/Envoy/SecondBrain/lib/relayNotion.js

2. To disable the MCP server:
   - Remove the notion-mcp entry from ~/.config/claude/config.json

