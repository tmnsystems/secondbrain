const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
dotenv.config({ path: "./secondbrain_api_keys.env" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// All the env variable names and friendly labels you want to check
const databasesToTest = [
  ["NOTION_SECONDBRAIN_PROJECTS_DB_ID", "SecondBrain Projects"],
  ["NOTION_SECONDBRAIN_TASKS_DB_ID", "SecondBrain Tasks"],
  ["NOTION_TUBETOTASK_PROJECTS_DB_ID", "TubeToTask Projects"],
  ["NOTION_TUBETOTASK_TASKS_DB_ID", "TubeToTask Tasks"],
  ["NOTION_NYMIRAI_PROJECTS_DB_ID", "NymirAI Projects"],
  ["NOTION_NYMIRAI_TASKS_DB_ID", "NymirAI Tasks"],
  ["NOTION_CLIENTMANAGER_PROJECTS_DB_ID", "ClientManager Projects"],
  ["NOTION_CLIENTMANAGER_TASKS_DB_ID", "ClientManager Tasks"],
  ["NOTION_COACHTINAMARIEAI_PROJECTS_DB_ID", "CoachTinaMarieAI Projects"],
  ["NOTION_COACHTINAMARIEAI_TASKS_DB_ID", "CoachTinaMarieAI Tasks"],
  ["NOTION_CATALOG_DB_ID", "Catalog"],
  ["SECONDBRAIN_TASKS_DATABASE_ID", "Backup Task DB"]
];

(async () => {
  for (const [envVar, label] of databasesToTest) {
    const dbId = process.env[envVar];
    if (!dbId) {
      console.warn(`⚠️  ${label} (${envVar}) is missing from env`);
      continue;
    }

    try {
      const res = await notion.databases.retrieve({ database_id: dbId });
      const title = res.title?.[0]?.plain_text || "(Untitled)";
      console.log(`✅ ${label} (${envVar}) retrieve success: "${title}"`);

      // Test write capability by creating and archiving a test page
      const properties = res.properties || {};
      const titlePropEntry = Object.entries(properties).find(([, prop]) => prop.type === "title");
      if (!titlePropEntry) {
        console.warn(`⚠️  ${label} (${envVar}) has no title property; skipping write test`);
      } else {
        const [titlePropName] = titlePropEntry;
        const pageTitle = `Test entry from script ${new Date().toISOString()}`;
        const createRes = await notion.pages.create({
          parent: { database_id: dbId },
          properties: {
            [titlePropName]: {
              title: [{ type: "text", text: { content: pageTitle } }]
            }
          }
        });
        console.log(`✅ ${label} (${envVar}) write success; created page ${createRes.id}`);

        // Clean up by archiving the test page
        await notion.pages.update({ page_id: createRes.id, archived: true });
        console.log(`♻️  ${label} (${envVar}) write cleanup; archived page ${createRes.id}`);
      }
    } catch (err) {
      console.error(`❌ ${label} (${envVar}) error: ${err.message || err}`);
    }
  }
})();