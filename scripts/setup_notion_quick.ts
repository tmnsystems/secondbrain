/**
 * Quick setup script for Notion integration
 * Takes API key and page ID from environment variables
 */

import { Client } from '@notionhq/client';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Main setup function
async function setupNotion() {
  console.log('🔧 Setting up Notion integration for SecondBrain Planner Agent');
  
  // Get Notion API key and page ID from environment
  const notionApiKey = process.env.NOTION_API_KEY;
  const rootPageId = process.env.NOTION_PAGE_ID;
  
  if (!notionApiKey) {
    console.error('❌ Error: NOTION_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  if (!rootPageId) {
    console.error('❌ Error: NOTION_PAGE_ID environment variable is not set');
    process.exit(1);
  }
  
  // Initialize Notion client
  const notion = new Client({ auth: notionApiKey });
  
  try {
    // Verify API key works by listing users
    const listUsersResponse = await notion.users.list({});
    console.log(`✅ Notion API connection successful! Found ${listUsersResponse.results.length} users.`);
    
    // Create projects database
    console.log('\n📊 Creating Projects database...');
    const projectsDb = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: rootPageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'SecondBrain Projects'
          }
        }
      ],
      properties: {
        Name: {
          title: {}
        },
        Status: {
          select: {
            options: [
              { name: 'Planning', color: 'blue' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Completed', color: 'green' },
              { name: 'On Hold', color: 'gray' }
            ]
          }
        },
        Priority: {
          select: {
            options: [
              { name: 'High', color: 'red' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Low', color: 'blue' }
            ]
          }
        },
        'Start Date': {
          date: {}
        },
        'End Date': {
          date: {}
        },
        Description: {
          rich_text: {}
        },
        Objectives: {
          rich_text: {}
        },
        Constraints: {
          rich_text: {}
        }
      }
    });
    
    console.log(`✅ Projects database created! ID: ${projectsDb.id}`);
    
    // Create tasks database
    console.log('\n📊 Creating Tasks database...');
    const tasksDb = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: rootPageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'SecondBrain Tasks'
          }
        }
      ],
      properties: {
        Name: {
          title: {}
        },
        Status: {
          select: {
            options: [
              { name: 'Not Started', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Completed', color: 'green' },
              { name: 'Blocked', color: 'red' }
            ]
          }
        },
        Priority: {
          select: {
            options: [
              { name: 'High', color: 'red' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Low', color: 'blue' }
            ]
          }
        },
        Project: {
          relation: {
            database_id: projectsDb.id
          }
        },
        'Due Date': {
          date: {}
        },
        Effort: {
          number: {}
        },
        Description: {
          rich_text: {}
        },
        Specifications: {
          rich_text: {}
        },
        Dependencies: {
          relation: {
            database_id: 'self'
          }
        }
      }
    });
    
    console.log(`✅ Tasks database created! ID: ${tasksDb.id}`);
    
    // Create a .env file with the new database IDs
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add environment variables
    const envVars = {
      NOTION_API_KEY: notionApiKey,
      NOTION_ROOT_PAGE_ID: rootPageId,
      NOTION_PROJECT_DB_ID: projectsDb.id,
      NOTION_TASK_DB_ID: tasksDb.id,
      USE_NOTION_INTEGRATION: 'true'
    };
    
    // Update .env file
    for (const [key, value] of Object.entries(envVars)) {
      // Check if the variable already exists in the file
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(envContent)) {
        // Replace existing variable
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new variable
        envContent += `\n${key}=${value}`;
      }
    }
    
    // Write updated content to .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Environment variables updated in .env file');
    console.log('\n🎉 Notion integration setup complete!');
    console.log('\nYou can now use the Planner Agent with your Notion workspace.');
    console.log(`\n📝 Projects Database: ${projectsDb.id}`);
    console.log(`📝 Tasks Database: ${tasksDb.id}`);
    
    // Print Notion links
    console.log(`\n🔗 Projects Database Link: https://notion.so/${projectsDb.id.replace(/-/g, '')}`);
    console.log(`🔗 Tasks Database Link: https://notion.so/${tasksDb.id.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ Error setting up Notion integration:', error);
  }
}

// Run the setup
setupNotion().catch(console.error);