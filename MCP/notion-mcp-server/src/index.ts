import { MCPServer } from "mcp-framework";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

// Import tools
import GetDatabaseIdsTool from "./tools/GetDatabaseIdsTool";
import CreatePageTool from "./tools/CreatePageTool";

// Load environment variables
dotenv.config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Get Notion API key and verify connection
const NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY) {
  console.error("❌ NOTION_API_KEY not found in environment variables");
  console.error("Please ensure it exists in /Volumes/Envoy/SecondBrain/secondbrain_api_keys.env");
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({ auth: NOTION_API_KEY });

// Verify Notion API connection
async function verifyNotionConnection() {
  try {
    const response = await notion.users.me({});
    console.log(`✅ Connected to Notion as ${response.name}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Notion API:", error);
    return false;
  }
}

// Create MCP Server
const server = new MCPServer({
  name: "notion-mcp",
  transport: {
    type: "sse",
    options: {
      port: 3500
    }
  }
});

// Tools are auto-discovered and registered

// Start server
async function startServer() {
  // First verify Notion connection
  const connected = await verifyNotionConnection();
  if (!connected) {
    console.error("❌ Failed to connect to Notion. Server will start but may not function correctly.");
  }
  
  // Start the server
  await server.start();
  console.log("✅ Notion MCP Server started successfully");
  console.log(`Server available at http://localhost:3500`);
}

startServer().catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});