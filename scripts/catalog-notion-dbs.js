#!/usr/bin/env node
// Catalog all Notion database IDs from env and fetch their metadata

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('@notionhq/client');

// Determine project base directory
const baseDir = path.resolve(__dirname, '..');

// Load environment variables from either secondbrain_api_keys.env or .env
const envPath = fs.existsSync(path.join(baseDir, 'secondbrain_api_keys.env'))
  ? path.join(baseDir, 'secondbrain_api_keys.env')
  : path.join(baseDir, '.env');
dotenv.config({ path: envPath });

// Initialize Notion client
if (!process.env.NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY not set in environment.');
  process.exit(1);
}
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Extract all env entries for NOTION_*_DB_ID
const entries = Object.entries(process.env)
  .filter(([key]) => key.startsWith('NOTION_') && key.endsWith('_DB_ID'))
  .map(([key, id]) => ({ key, id }));

(async () => {
  const catalog = [];
  for (const { key, id } of entries) {
    try {
      const db = await notion.databases.retrieve({ database_id: id });
      const title = Array.isArray(db.title)
        ? db.title.map(t => t.plain_text).join('')
        : '(no title)';
      catalog.push({ key, id, title, url: db.url });
    } catch (error) {
      catalog.push({ key, id, title: null, url: null, error: error.message });
    }
  }

  // Ensure infra directory exists
  const infraDir = path.join(baseDir, 'infra');
  if (!fs.existsSync(infraDir)) fs.mkdirSync(infraDir, { recursive: true });

  // Write catalog to JSON
  const outFile = path.join(infraDir, 'notion_databases_catalog.json');
  fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2));
  console.log(`📘 Wrote ${catalog.length} entries to ${outFile}`);

  // Detect duplicate IDs
  const counts = catalog.reduce((acc, entry) => {
    acc[entry.id] = (acc[entry.id] || 0) + 1;
    return acc;
  }, {});
  const duplicates = Object.entries(counts).filter(([, c]) => c > 1);
  if (duplicates.length) {
    console.warn('⚠️ Duplicate DB IDs found:');
    duplicates.forEach(([id, count]) => console.warn(` - ${id}: ${count} times`));
  }
})();