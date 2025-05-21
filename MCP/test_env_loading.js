/**
 * Test script to check environment variable loading
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load the environment variables from the specified file
const envPath = path.resolve('/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env');
console.log(`Loading env file from: ${envPath}`);
console.log(`File exists: ${fs.existsSync(envPath)}`);

dotenv.config({ path: envPath });

// Log the current working directory
console.log(`Current working directory: ${process.cwd()}`);

// Check for Notion database IDs
const notionDbVariables = [
  'NOTION_SECONDBRAIN_PROJECTS_DB_ID',
  'NOTION_PROJECT_DB_ID',
  'NOTION_SECONDBRAIN_TASKS_DB_ID',
  'NOTION_TASK_DB_ID',
  'NOTION_DEPENDENCY_DB_ID'
];

console.log('\nChecking Notion database ID variables:');
notionDbVariables.forEach(varName => {
  console.log(`${varName}: ${process.env[varName] || 'not set'}`);
});

// Print full environment for debugging
console.log('\nAll environment variables:');
Object.keys(process.env)
  .filter(key => key.includes('NOTION'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });