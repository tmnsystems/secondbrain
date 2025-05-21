import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to env files
const secondBrainDir = '/Volumes/Envoy/SecondBrain';
const envFilePath = path.join(secondBrainDir, 'secondbrain_api_keys.env');

// Load env file
console.log(`Loading environment from: ${envFilePath}`);
if (fs.existsSync(envFilePath)) {
  const result = dotenv.config({ path: envFilePath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Environment loaded successfully');
  }
} else {
  console.error('ENV file not found:', envFilePath);
}

// Print environment variables we're looking for
console.log('\nNotion API Variables:');
console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? 'Present (hidden)' : 'Not found');
console.log('USE_NOTION_INTEGRATION:', process.env.USE_NOTION_INTEGRATION);

console.log('\nDatabase IDs:');
console.log('NOTION_PROJECT_DB_ID:', process.env.NOTION_PROJECT_DB_ID);
console.log('NOTION_TASK_DB_ID:', process.env.NOTION_TASK_DB_ID);
console.log('NOTION_DEPENDENCY_DB_ID:', process.env.NOTION_DEPENDENCY_DB_ID);

console.log('\nOther Database IDs (from secondbrain_api_keys.env):');
console.log('NOTION_SECONDBRAIN_PROJECTS_DB_ID:', process.env.NOTION_SECONDBRAIN_PROJECTS_DB_ID);
console.log('NOTION_SECONDBRAIN_TASKS_DB_ID:', process.env.NOTION_SECONDBRAIN_TASKS_DB_ID);

// Print mapped values that would be used by config.ts
console.log('\nMapped values (how they would be set in config.ts):');
console.log('projectDatabaseId:', process.env.NOTION_SECONDBRAIN_PROJECTS_DB_ID || process.env.NOTION_PROJECT_DB_ID || '');
console.log('taskDatabaseId:', process.env.NOTION_SECONDBRAIN_TASKS_DB_ID || process.env.NOTION_TASK_DB_ID || '');
console.log('dependencyDatabaseId:', process.env.NOTION_SECONDBRAIN_TASKS_DB_ID || process.env.NOTION_DEPENDENCY_DB_ID || '');