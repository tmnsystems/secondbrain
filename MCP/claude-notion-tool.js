#!/usr/bin/env node
// File: /Volumes/Envoy/MCP/claude-notion-tool.js
// CLI tool for using Notion MCP from scripts

import { execSync } from 'child_process';

async function main() {
  // Get command-line arguments
  const [,, mcpServer, toolName, ...args] = process.argv;
  
  if (!mcpServer || !toolName) {
    console.error('Usage: claude-notion-tool.js <mcp-server-name> <tool-name> [args...]');
    process.exit(1);
  }
  
  try {
    // Format the args for Claude's CLI command
    const formattedArgs = args.map(arg => {
      // If the arg is an object or array, stringify it
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      // Otherwise, just make sure it's properly quoted
      return `'${arg}'`;
    }).join(' ');
    
    // Build the claude CLI command
    const command = `claude cli-tool mcp ${mcpServer} ${toolName} ${formattedArgs}`;
    
    // Execute the command
    const result = execSync(command, { encoding: 'utf8' });
    
    // Parse and output the result
    try {
      const parsedResult = JSON.parse(result);
      console.log(JSON.stringify(parsedResult, null, 2));
    } catch (e) {
      // If it's not valid JSON, just output the raw result
      console.log(result);
    }
  } catch (error) {
    console.error('Error calling MCP tool:', error.message);
    process.exit(1);
  }
}

main();