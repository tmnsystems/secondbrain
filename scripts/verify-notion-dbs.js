#!/usr/bin/env node
/**
 * Verify connectivity to configured Notion databases for SecondBrain.
 * Tests retrieval of each database to ensure the integration has proper access.
 */

const { Client } = require('@notionhq/client');
const dotenv = require('dotenv');

// Load environment variables from SecondBrain API keys file
dotenv.config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

const notionApiKey = process.env.NOTION_API_KEY;
if (!notionApiKey) {
  console.error('❌ NOTION_API_KEY not set in environment.');
  process.exit(1);
}
const notion = new Client({ auth: notionApiKey });

// List of configured databases to verify
const databases = [
  { name: 'CLI Sessions Tasks DB', id: process.env.SECONDBRAIN_TASKS_DATABASE_ID },
  { name: 'File Catalog DB', id: process.env.NOTION_FILE_CATALOG_ID },
  { name: 'Drift Monitor DB', id: process.env.NOTION_DRIFT_BOARD_ID },
  { name: 'Tech Debt DB', id: process.env.NOTION_TECH_DEBT_DB_ID }
];

(async () => {
  console.log('🔍 Verifying configured Notion databases...');
  for (const { name, id } of databases) {
    if (!id) {
      console.warn(`⚠️ ${name} not configured (env var missing)`);
      continue;
    }
    try {
      await notion.databases.retrieve({ database_id: id });
      console.log(`✅ ${name} accessible (ID: ${id})`);
    } catch (err) {
      console.error(`❌ Failed to access ${name} (ID: ${id}):`, err.message);
    }
  }
  console.log('\n🎉 Notion database connectivity verification complete.');
})();