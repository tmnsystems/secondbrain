import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

// Load environment variables 
dotenv.config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Get Notion API key
const NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY) {
  console.error("❌ NOTION_API_KEY not found in environment variables");
  console.error("Please ensure it exists in /Volumes/Envoy/SecondBrain/secondbrain_api_keys.env");
}

// Initialize Notion client
const notion = new Client({ auth: NOTION_API_KEY });

interface CreatePageInput {
  databaseId: string;
  title: string;
  properties?: Record<string, any>;
}

class CreatePageTool extends MCPTool<CreatePageInput> {
  name = "create-page";
  description = "Create a new page in the specified Notion database";

  schema = {
    databaseId: {
      type: z.string(),
      description: "The ID of the database where the page should be created",
    },
    title: {
      type: z.string(),
      description: "The title of the new page",
    },
    properties: {
      type: z.record(z.any()).optional(),
      description: "Additional properties for the page (optional)",
    },
  };

  async execute({ databaseId, title, properties = {} }: CreatePageInput) {
    try {
      console.log(`Creating page with title "${title}" in database ${databaseId}`);
      
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
        message: `Successfully created page "${title}" in database ${databaseId}`
      };
    } catch (error: any) {
      console.error("Error creating page:", error.message);
      return { error: error.message };
    }
  }
}

export default CreatePageTool;