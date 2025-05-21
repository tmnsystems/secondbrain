/**
 * Fix script for test_relay_notion_integration.ts
 * Temporarily updates the config.ts file to use the correct env variable names
 */

import fs from 'fs';
import path from 'path';

// Paths
const configPath = '/Volumes/Envoy/SecondBrain/libs/agents/common/config.ts';
const testScriptPath = '/Volumes/Envoy/SecondBrain/scripts/test_relay_notion_integration.ts';

// Update config.ts to use correct env variable names
console.log('Updating config.ts to use correct env variable names...');
let configContent = fs.readFileSync(configPath, 'utf8');

// Original config section
const originalConfigSection = `  // Notion API configuration
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    rootPageId: process.env.NOTION_ROOT_PAGE_ID || '',
    projectDatabaseId: process.env.NOTION_PROJECT_DB_ID || '',
    taskDatabaseId: process.env.NOTION_TASK_DB_ID || '',
    dependencyDatabaseId: process.env.NOTION_DEPENDENCY_DB_ID || '',
  },`;

// Updated config section
const updatedConfigSection = `  // Notion API configuration
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    rootPageId: process.env.NOTION_ROOT_PAGE_ID || '',
    projectDatabaseId: process.env.NOTION_SECONDBRAIN_PROJECTS_DB_ID || process.env.NOTION_PROJECT_DB_ID || '',
    taskDatabaseId: process.env.NOTION_SECONDBRAIN_TASKS_DB_ID || process.env.NOTION_TASK_DB_ID || '',
    dependencyDatabaseId: process.env.NOTION_SECONDBRAIN_TASKS_DB_ID || process.env.NOTION_DEPENDENCY_DB_ID || '',
  },`;

// Update test script to use correct env file
console.log('Updating test_relay_integration.ts to use the correct env file...');
let testScriptContent = fs.readFileSync(testScriptPath, 'utf8');

const originalImport = `import dotenv from 'dotenv';
dotenv.config();`;

const updatedImport = `import dotenv from 'dotenv';
import path from 'path';
// Use absolute path to the env file
dotenv.config({ path: path.resolve(process.cwd(), 'secondbrain_api_keys.env') });`;

if (configContent.includes(originalConfigSection)) {
  configContent = configContent.replace(originalConfigSection, updatedConfigSection);
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Updated config.ts');
} else if (configContent.includes(updatedConfigSection)) {
  console.log('⚠️ Config.ts already updated');
} else {
  console.error('❌ Could not find config section to update');
}

if (testScriptContent.includes(originalImport)) {
  testScriptContent = testScriptContent.replace(originalImport, updatedImport);
  fs.writeFileSync(testScriptPath, testScriptContent);
  console.log('✅ Updated test_relay_integration.ts');
} else if (testScriptContent.includes(updatedImport)) {
  console.log('⚠️ Test script already updated');
} else {
  console.error('❌ Could not find import section to update');
}

console.log('\nNow run the test with:');
console.log('node /Volumes/Envoy/SecondBrain/scripts/test_relay_notion_integration.ts');