// File: /Volumes/Envoy/MCP/simple-notion-mcp.js
// Simple Notion MCP Server for testing

import { MCPServer } from 'mcp-framework';
import dotenv from 'dotenv';

// Load environment variables from SecondBrain
dotenv.config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Create the MCP server
const server = new MCPServer({
  name: "notion-mcp",
  description: "A server for interacting with Notion API",
  transport: {
    type: "sse", // Use Server-Sent Events for transport
    options: {
      port: 3500,
      host: "localhost"
    }
  }
});

// Simple test tool
server.addTool("getEnvironmentInfo", {
  description: "Get information about the environment",
  execute: async () => {
    return {
      node_version: process.version,
      os: process.platform,
      current_directory: process.cwd(),
      env_vars: {
        notion_key_exists: !!process.env.NOTION_API_KEY, // Don't show actual key
        task_db: process.env.NOTION_TASK_DATABASE_ID || "Not set",
        project_db: process.env.NOTION_PROJECT_DATABASE_ID || "Not set"
      }
    };
  }
});

// Start the server
console.log("Starting Notion MCP Server...");
server.start().then(() => {
  console.log(`✅ Server started on http://localhost:3500`);
}).catch(err => {
  console.error(`❌ Failed to start server:`, err);
});