import { MCPTool } from "mcp-framework";
import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables 
dotenv.config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Store database IDs from environment
const dbIds = {
  tasks: process.env.SECONDBRAIN_TASKS_DATABASE_ID || process.env.NOTION_TASK_DATABASE_ID,
  catalog: process.env.NOTION_CATALOG_DB_ID,
  projects: process.env.NOTION_PROJECT_DATABASE_ID,
};

class GetDatabaseIdsTool extends MCPTool<{}> {
  name = "get-database-ids";
  description = "Return a table of all known database IDs from environment";

  schema = {};

  async execute() {
    console.log("Executing getDatabaseIds tool");
    
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
}

export default GetDatabaseIdsTool;