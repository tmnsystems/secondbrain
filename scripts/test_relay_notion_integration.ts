/**
 * Test script for Notion relay integration: createPageViaRelay fallback logic.
 * Attempts to write a test page to each configured Notion database using createPageViaRelay.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Use absolute path to the env file
const envFilePath = '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env';
console.log(`Loading environment from: ${envFilePath}`);
if (fs.existsSync(envFilePath)) {
  const result = dotenv.config({ path: envFilePath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Environment loaded successfully');
    
    // Manually map the environment variables to match what config.ts expects
    if (process.env.NOTION_SECONDBRAIN_PROJECTS_DB_ID) {
      process.env.NOTION_PROJECT_DB_ID = process.env.NOTION_SECONDBRAIN_PROJECTS_DB_ID;
    }
    if (process.env.NOTION_SECONDBRAIN_TASKS_DB_ID) {
      process.env.NOTION_TASK_DB_ID = process.env.NOTION_SECONDBRAIN_TASKS_DB_ID;
      process.env.NOTION_DEPENDENCY_DB_ID = process.env.NOTION_SECONDBRAIN_TASKS_DB_ID;
    }
    
    console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? 'Present (hidden)' : 'Not found');
    console.log('NOTION_PROJECT_DB_ID:', process.env.NOTION_PROJECT_DB_ID);
    console.log('NOTION_TASK_DB_ID:', process.env.NOTION_TASK_DB_ID);
    console.log('NOTION_DEPENDENCY_DB_ID:', process.env.NOTION_DEPENDENCY_DB_ID);
  }
} else {
  console.error('ENV file not found:', envFilePath);
}

import { createPageViaRelay } from '../lib/relayNotion.js';

// Create our own config object instead of importing from config.ts
const notionConfig = {
  apiKey: process.env.NOTION_API_KEY || '',
  rootPageId: process.env.NOTION_ROOT_PAGE_ID || '',
  projectDatabaseId: process.env.NOTION_PROJECT_DB_ID || '',
  taskDatabaseId: process.env.NOTION_TASK_DB_ID || '',
  dependencyDatabaseId: process.env.NOTION_DEPENDENCY_DB_ID || '',
};

// Print the config values
console.log('\nNotion Config:');
console.log('projectDatabaseId:', notionConfig.projectDatabaseId);
console.log('taskDatabaseId:', notionConfig.taskDatabaseId);
console.log('dependencyDatabaseId:', notionConfig.dependencyDatabaseId);

const dbEntries: [keyof typeof notionConfig, string][] = [
  ['projectDatabaseId', 'Project Database'],
  ['taskDatabaseId', 'Task Database'],
  ['dependencyDatabaseId', 'Dependency Database'],
];

async function testRelayIntegration() {
  console.log('🔍 Testing Notion relay integration via createPageViaRelay');

  for (const [key, label] of dbEntries) {
    const dbId = notionConfig[key];
    if (!dbId) {
      console.warn(
        `⚠️ ${label} (config.${key}) not set`
      );
      continue;
    }
    try {
      console.log(
        `\n➡️  Testing write to ${label} (ID: ${dbId})`
      );
      const pageId = await createPageViaRelay(
        dbId,
        `Test Relay Write ${new Date().toISOString()}`,
        {}
      );
      console.log(
        `✅ ${label} write succeeded: page ID ${pageId}`
      );
    } catch (error: any) {
      console.error(
        `❌ ${label} write failed: ${error.message || error}`
      );
    }
  }
}

testRelayIntegration().catch((err) => {
  console.error('❌ Test script encountered an error:', err);
  process.exit(1);
});