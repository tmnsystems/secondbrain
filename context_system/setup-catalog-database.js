/**
 * Setup Catalog Database in Notion
 * This script creates a database in Notion to catalog all SecondBrain files
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const { verifyReviewerApproval } = require('../utils/reviewer');
require('dotenv').config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Get Notion API key
const NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY) {
  console.error("Error: NOTION_API_KEY not found in environment variables");
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({
  auth: NOTION_API_KEY
});

// Catalog database schema - without relation field initially
const catalogDatabaseSchema = {
  Name: {
    title: {}
  },
  Type: {
    select: {
      options: [
        { name: 'Script', color: 'blue' },
        { name: 'Documentation', color: 'green' },
        { name: 'Configuration', color: 'yellow' },
        { name: 'Data', color: 'orange' },
        { name: 'HTML/CSS', color: 'purple' },
        { name: 'TypeScript/JavaScript', color: 'red' },
        { name: 'Python', color: 'brown' },
        { name: 'Markdown', color: 'gray' },
        { name: 'JSON', color: 'pink' },
        { name: 'Other', color: 'default' }
      ]
    }
  },
  Path: {
    rich_text: {}
  },
  Size: {
    number: {
      format: 'number'
    }
  },
  'Last Modified': {
    date: {}
  },
  Status: {
    select: {
      options: [
        { name: '✅ Active', color: 'green' },
        { name: '🟡 In Progress', color: 'yellow' },
        { name: '🔴 Abandoned', color: 'red' },
        { name: '♻️ Duplicated', color: 'orange' },
        { name: '❓ Unknown', color: 'gray' }
      ]
    }
  },
  Project: {
    select: {
      options: [
        { name: 'SecondBrain', color: 'blue' },
        { name: 'TubeToTask', color: 'green' },
        { name: 'NymirAI', color: 'orange' },
        { name: 'ClientManager', color: 'pink' },
        { name: 'CoachTinaMarieAI', color: 'purple' },
        { name: 'IncredAgents', color: 'blue' },
        { name: 'Other', color: 'gray' }
      ]
    }
  },
  'Strategic Relevance': {
    select: {
      options: [
        { name: 'Agent Logic', color: 'blue' },
        { name: 'Context System', color: 'green' },
        { name: 'Embedding Config', color: 'yellow' },
        { name: 'UI Component', color: 'purple' },
        { name: 'API Integration', color: 'orange' },
        { name: 'Database Layer', color: 'red' },
        { name: 'Claude Prompt', color: 'pink' },
        { name: 'Infrastructure', color: 'brown' },
        { name: 'Documentation', color: 'gray' },
        { name: 'Other', color: 'default' }
      ]
    }
  },
  'Action Needed': {
    multi_select: {
      options: [
        { name: '🧼 Cleanup', color: 'blue' },
        { name: '🧩 Refactor', color: 'yellow' },
        { name: '✅ Merge', color: 'green' },
        { name: '🗑️ Delete', color: 'red' },
        { name: '📋 Document', color: 'purple' },
        { name: '🧪 Test', color: 'orange' },
        { name: '🔄 Update', color: 'gray' }
      ]
    }
  },
  'Claude Integration': {
    select: {
      options: [
        { name: 'Prompt Template', color: 'blue' },
        { name: 'Context Loader', color: 'green' },
        { name: 'Memory System', color: 'yellow' },
        { name: 'Agent Logic', color: 'purple' },
        { name: 'None', color: 'gray' }
      ]
    }
  },
  'Storage Integration': {
    multi_select: {
      options: [
        { name: 'Redis', color: 'red' },
        { name: 'PostgreSQL', color: 'blue' },
        { name: 'Pinecone', color: 'yellow' },
        { name: 'Notion', color: 'gray' },
        { name: 'Filesystem', color: 'green' },
        { name: 'Vercel', color: 'purple' },
        { name: 'Linode', color: 'orange' },
        { name: 'Slack', color: 'pink' }
      ]
    }
  },
  Notes: {
    rich_text: {}
  }
};

/**
 * Find IncredAgents page
 */
async function findIncredAgentsPage() {
  try {
    console.log("Searching for IncredAgents page in Notion...");
    
    const searchResults = await notion.search({
      query: "IncredAgents",
      filter: {
        property: "object",
        value: "page"
      }
    });
    
    if (searchResults.results.length > 0) {
      const page = searchResults.results[0];
      console.log(`Found IncredAgents page: ${page.id}`);
      return page.id;
    }
    
    console.error("IncredAgents page not found. Please run setup-notion-for-all-projects.js first.");
    process.exit(1);
  } catch (error) {
    console.error("Error finding IncredAgents page:", error);
    throw error;
  }
}

/**
 * Create SecondBrain Catalog database
 */
async function createCatalogDatabase(parentId) {
  try {
    console.log(`Creating SecondBrain File Catalog database...`);
    
    // Create initial database without relation field
    const response = await notion.databases.create({
      parent: {
        type: "page_id",
        page_id: parentId
      },
      title: [
        {
          type: "text",
          text: {
            content: "SecondBrain File Catalog"
          }
        }
      ],
      properties: catalogDatabaseSchema
    });
    
    console.log(`Database created: ${response.id}`);
    
    // Wait a moment to ensure database is created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add self-referential relation field
    try {
      await notion.databases.update({
        database_id: response.id,
        properties: {
          'Related Files': {
            relation: {
              database_id: response.id,
              dual_property: "Referenced By"
            }
          }
        }
      });
      console.log('Added self-referential relation field successfully');
    } catch (relError) {
      console.error('Error adding relation field:', relError);
      console.log('Relation field can be added manually in Notion');
    }
    
    // Update environment file with database ID
    updateEnvironmentFile(response.id);
    
    return response.id;
  } catch (error) {
    console.error("Error creating catalog database:", error);
    throw error;
  }
}

/**
 * Update environment file with database ID
 */
function updateEnvironmentFile(databaseId) {
  try {
    console.log("Updating environment file with catalog database ID...");
    
    const envPath = '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env';
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add database ID
    if (envContent.includes('NOTION_CATALOG_DB_ID=')) {
      envContent = envContent.replace(
        /NOTION_CATALOG_DB_ID=.*/,
        `NOTION_CATALOG_DB_ID=${databaseId}`
      );
    } else {
      envContent += `\nNOTION_CATALOG_DB_ID=${databaseId}`;
    }
    
    // Write updated content back to file
    fs.writeFileSync(envPath, envContent);
    
    console.log("Environment file updated with catalog database ID");
  } catch (error) {
    console.error("Error updating environment file:", error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("===== Setting up SecondBrain File Catalog Database =====\n");
    
    // Verify with Reviewer Agent
    console.log("Verifying approval with Reviewer Agent...");
    const reviewStatus = await verifyReviewerApproval(
      'Setup SecondBrain File Catalog Database', 
      { requireNotion: false, bypassForTesting: process.env.NODE_ENV === 'development' }
    );
    
    if (!reviewStatus.approved) {
      console.error(`Error: ${reviewStatus.message}`);
      console.error("Please consult the Reviewer Agent before running this script.");
      process.exit(1);
    }
    
    console.log("✅ Reviewer Agent approval verified. Proceeding with database setup.");
    
    // Find IncredAgents page
    const incredAgentsId = await findIncredAgentsPage();
    
    // Create catalog database
    const databaseId = await createCatalogDatabase(incredAgentsId);
    
    console.log("\n===== Setup Complete =====");
    console.log(`Catalog Database ID: ${databaseId}`);
    console.log("You can now use this database to catalog all SecondBrain files");
    
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
}

// Run the script
main();