const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "./secondbrain_api_keys.env" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const databaseId = process.env.NOTION_SECONDBRAIN_TASKS_DB_ID;

(async () => {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: "Codex Write Test " + new Date().toISOString(),
              },
            },
          ],
        },
      },
    });
    console.log("[✅] Successfully wrote to Notion:", response.id);
  } catch (error) {
    console.error("[❌] Failed to write:", error.message || error);
  }
})();