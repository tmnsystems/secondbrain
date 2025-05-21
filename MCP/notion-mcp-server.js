// File: /Volumes/Envoy/MCP/notion-mcp-server.js
// Notion MCP Server for SecondBrain project
// Created to bypass OpenAI Codex sandbox limitations

import { MCPServer } from 'mcp-framework';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from SecondBrain
dotenv.config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Get Notion API key
const NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY) {
  console.error("❌ NOTION_API_KEY not found in environment variables");
  console.error("Please ensure it exists in /Volumes/Envoy/SecondBrain/secondbrain_api_keys.env");
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({ auth: NOTION_API_KEY });

// Store database IDs from environment
const dbIds = {
  tasks: process.env.SECONDBRAIN_TASKS_DATABASE_ID || process.env.NOTION_TASK_DATABASE_ID,
  catalog: process.env.NOTION_CATALOG_DB_ID,
  projects: process.env.NOTION_PROJECT_DATABASE_ID,
};

// Create the MCP server
const server = new MCPServer({
  name: "notion-mcp",
  description: "A server for interacting with Notion API",
  transport: {
    type: process.env.MCP_TRANSPORT || "sse",
    options: {
      port: parseInt(process.env.MCP_PORT || "3500"),
      host: process.env.MCP_HOST || "localhost"
    }
  }
});

// Verify Notion API connection on startup
async function verifyNotionConnection() {
  try {
    const response = await notion.users.me({});
    console.log(`✅ Connected to Notion as ${response.name}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Notion API:", error.message);
    return false;
  }
}

// Create a page in a database
server.registerTool({
  name: "createPage",
  description: "Create a new page in the specified Notion database",
  parameters: {
    databaseId: {
      description: "The ID of the database where the page should be created",
      type: "string",
      required: true
    },
    title: {
      description: "The title of the new page",
      type: "string",
      required: true
    },
    properties: {
      description: "Additional properties for the page (optional)",
      type: "object",
      required: false
    }
  },
  execute: async ({ databaseId, title, properties = {} }) => {
    try {
      // Prepare title property based on database schema
      const pageProperties = {
        "Name": { 
          title: [{ text: { content: title } }] 
        },
        ...properties
      };
      
      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: pageProperties
      });
      
      return {
        id: response.id,
        url: response.url,
        message: `Successfully created page "${title}" in database ${databaseId}`
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Query a database
server.registerTool({
  name: "queryDatabase",
  description: "Query a Notion database with optional filter and sort parameters",
  parameters: {
    databaseId: {
      description: "The ID of the database to query",
      type: "string",
      required: true
    },
    filter: {
      description: "Filter criteria (optional)",
      type: "object",
      required: false
    },
    sorts: {
      description: "Sort criteria (optional)",
      type: "array",
      required: false
    },
    pageSize: {
      description: "Number of results to return (max 100)",
      type: "number",
      required: false
    }
  },
  execute: async ({ databaseId, filter = null, sorts = null, pageSize = 100 }) => {
    try {
      const queryParams = {
        database_id: databaseId,
        page_size: pageSize
      };
      
      if (filter) {
        queryParams.filter = filter;
      }
      
      if (sorts) {
        queryParams.sorts = sorts;
      }
      
      const response = await notion.databases.query(queryParams);
      return {
        results: response.results,
        has_more: response.has_more,
        next_cursor: response.next_cursor,
        message: `Successfully queried database ${databaseId}, found ${response.results.length} results`
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Update a page
server.registerTool({
  name: "updatePage",
  description: "Update an existing page in Notion",
  parameters: {
    pageId: {
      description: "The ID of the page to update",
      type: "string",
      required: true
    },
    properties: {
      description: "The properties to update",
      type: "object",
      required: true
    }
  },
  execute: async ({ pageId, properties }) => {
    try {
      const response = await notion.pages.update({
        page_id: pageId,
        properties: properties
      });
      
      return {
        id: response.id,
        url: response.url,
        message: `Successfully updated page ${pageId}`
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Get database metadata
server.registerTool({
  name: "getDatabaseMetadata",
  description: "Retrieve metadata about a Notion database",
  parameters: {
    databaseId: {
      description: "The ID of the database",
      type: "string",
      required: true
    }
  },
  execute: async ({ databaseId }) => {
    try {
      const response = await notion.databases.retrieve({
        database_id: databaseId
      });
      
      return {
        id: response.id,
        title: response.title,
        properties: response.properties,
        message: `Successfully retrieved database metadata for ${databaseId}`
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Get page content
server.registerTool({
  name: "getPageContent",
  description: "Retrieve a page's content including blocks",
  parameters: {
    pageId: {
      description: "The ID of the page",
      type: "string",
      required: true
    }
  },
  execute: async ({ pageId }) => {
    try {
      // Get page properties
      const page = await notion.pages.retrieve({
        page_id: pageId
      });
      
      // Get page blocks (content)
      const blocks = await notion.blocks.children.list({
        block_id: pageId
      });
      
      return {
        id: page.id,
        url: page.url,
        properties: page.properties,
        blocks: blocks.results,
        message: `Successfully retrieved page ${pageId} with ${blocks.results.length} blocks`
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Add a block to a page
server.registerTool({
  name: "addBlockToPage",
  description: "Add a new block to a page",
  parameters: {
    pageId: {
      description: "The ID of the page",
      type: "string",
      required: true
    },
    blockContent: {
      description: "The content for the block",
      type: "string",
      required: true
    },
    blockType: {
      description: "The type of block (paragraph, heading_1, to_do, bulleted_list_item, etc.)",
      type: "string",
      required: false
    }
  },
  execute: async ({ pageId, blockContent, blockType = "paragraph" }) => {
    try {
      let blockData = {};
      
      // Configure block based on type
      if (blockType === "paragraph") {
        blockData = {
          paragraph: {
            rich_text: [{ type: "text", text: { content: blockContent } }]
          }
        };
      } else if (blockType.startsWith("heading_")) {
        blockData = {
          [blockType]: {
            rich_text: [{ type: "text", text: { content: blockContent } }]
          }
        };
      } else if (blockType === "to_do") {
        blockData = {
          to_do: {
            rich_text: [{ type: "text", text: { content: blockContent } }],
            checked: false
          }
        };
      } else if (blockType === "bulleted_list_item") {
        blockData = {
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: blockContent } }]
          }
        };
      }
      
      const response = await notion.blocks.children.append({
        block_id: pageId,
        children: [
          {
            object: "block",
            type: blockType,
            ...blockData
          }
        ]
      });
      
      return {
        results: response.results,
        message: `Successfully added ${blockType} block to page ${pageId}`
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// List databases in workspace (accessible to integration)
server.registerTool({
  name: "listDatabases",
  description: "List all databases accessible to the integration",
  parameters: {},
  execute: async () => {
    try {
      const response = await notion.search({
        filter: {
          property: "object",
          value: "database"
        }
      });
      
      return {
        results: response.results.map(db => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || "Untitled",
          url: db.url
        })),
        message: `Found ${response.results.length} databases`
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Get table of all known database IDs
server.registerTool({
  name: "getDatabaseIds",
  description: "Return a table of all known database IDs from environment",
  parameters: {},
  execute: async () => {
    return {
      databases: {
        tasks: dbIds.tasks || "Not configured",
        catalog: dbIds.catalog || "Not configured",
        projects: dbIds.projects || "Not configured",
        secondbrain_tasks: process.env.SECONDBRAIN_TASKS_DATABASE_ID || "Not configured",
        notion_task: process.env.NOTION_TASK_DATABASE_ID || "Not configured",
        notion_project: process.env.NOTION_PROJECT_DATABASE_ID || "Not configured",
        notion_catalog: process.env.NOTION_CATALOG_DB_ID || "Not configured"
      },
      message: "Retrieved all known database IDs from environment"
    };
  }
});

// Start the server
async function startServer() {
  // First verify Notion connection
  const connected = await verifyNotionConnection();
  if (!connected) {
    console.error("❌ Failed to connect to Notion. Server will start but may not function correctly.");
  }
  
  // Print configuration info
  console.log(`🚀 Starting Notion MCP Server with transport: ${server.transport.type}`);
  if (server.transport.type === "sse") {
    console.log(`Server will be available at http://${server.transport.options.host}:${server.transport.options.port}`);
  }
  
  // Actually start the server
  await server.start();
  console.log("✅ Notion MCP Server started successfully");
}

startServer().catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});