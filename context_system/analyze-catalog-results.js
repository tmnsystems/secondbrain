/**
 * Analyze SecondBrain catalog results
 * This script analyzes the catalog results to identify duplicates,
 * strategic drift, and other patterns.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Get Notion API key and database ID
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_CATALOG_DB_ID = process.env.NOTION_CATALOG_DB_ID;

if (!NOTION_API_KEY) {
  console.error("Error: NOTION_API_KEY not found in environment variables");
  process.exit(1);
}

if (!NOTION_CATALOG_DB_ID) {
  console.error("Error: NOTION_CATALOG_DB_ID not found in environment variables");
  console.error("Please run setup-catalog-database.js first");
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({
  auth: NOTION_API_KEY
});

// SecondBrain root directory
const SECONDBRAIN_DIR = '/Volumes/Envoy/SecondBrain';

// Analyze results to generate insights
function analyzeResults(results) {
  // Filter valid results
  const validResults = results.filter(r => r && r.fileInfo);
  
  // Project breakdown
  const projectCounts = {};
  validResults.forEach(r => {
    const project = r.fileInfo.project;
    projectCounts[project] = (projectCounts[project] || 0) + 1;
  });
  
  // Status breakdown
  const statusCounts = {};
  validResults.forEach(r => {
    const status = r.fileInfo.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  // Strategic relevance breakdown
  const relevanceCounts = {};
  validResults.forEach(r => {
    const relevance = r.fileInfo.strategicRelevance;
    relevanceCounts[relevance] = (relevanceCounts[relevance] || 0) + 1;
  });
  
  // File types breakdown
  const typeCounts = {};
  validResults.forEach(r => {
    const type = r.fileInfo.type;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  // Actions needed breakdown
  const actionCounts = {};
  validResults.forEach(r => {
    if (r.fileInfo.actionsNeeded && r.fileInfo.actionsNeeded.length > 0) {
      r.fileInfo.actionsNeeded.forEach(action => {
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      });
    }
  });
  
  // Claude integration breakdown
  const claudeIntegrationCounts = {};
  validResults.forEach(r => {
    const integration = r.fileInfo.claudeIntegration;
    claudeIntegrationCounts[integration] = (claudeIntegrationCounts[integration] || 0) + 1;
  });
  
  // Storage integration breakdown
  const storageIntegrationCounts = {};
  validResults.forEach(r => {
    if (r.fileInfo.storageIntegration && r.fileInfo.storageIntegration.length > 0) {
      r.fileInfo.storageIntegration.forEach(storage => {
        storageIntegrationCounts[storage] = (storageIntegrationCounts[storage] || 0) + 1;
      });
    }
  });
  
  // Last modified analysis
  const filesByAge = {
    'Last 7 days': 0,
    'Last 30 days': 0,
    'Last 90 days': 0,
    'Last 180 days': 0,
    'Older': 0
  };
  
  const now = new Date();
  validResults.forEach(r => {
    const lastModified = new Date(r.fileInfo.lastModified);
    const daysDiff = Math.floor((now - lastModified) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) filesByAge['Last 7 days']++;
    else if (daysDiff <= 30) filesByAge['Last 30 days']++;
    else if (daysDiff <= 90) filesByAge['Last 90 days']++;
    else if (daysDiff <= 180) filesByAge['Last 180 days']++;
    else filesByAge['Older']++;
  });
  
  // Find potential duplicates
  const fileNames = {};
  const potentialDuplicates = [];
  
  validResults.forEach(r => {
    const fileName = path.basename(r.fileInfo.path);
    if (!fileNames[fileName]) {
      fileNames[fileName] = [];
    }
    fileNames[fileName].push(r.fileInfo.path);
  });
  
  Object.entries(fileNames).forEach(([name, paths]) => {
    if (paths.length > 1) {
      potentialDuplicates.push({
        fileName: name,
        paths: paths
      });
    }
  });
  
  // Final analytics
  return {
    totalFiles: validResults.length,
    projects: projectCounts,
    statuses: statusCounts,
    strategicRelevance: relevanceCounts,
    fileTypes: typeCounts,
    actionsNeeded: actionCounts,
    claudeIntegration: claudeIntegrationCounts,
    storageIntegration: storageIntegrationCounts,
    filesByAge: filesByAge,
    potentialDuplicates: potentialDuplicates
  };
}

// Create analytics summary in Notion
async function createAnalyticsSummary(analytics) {
  try {
    console.log('Creating analytics summary in Notion...');
    
    // Format projects breakdown
    let projectsText = '**Project Breakdown:**\n';
    Object.entries(analytics.projects).forEach(([project, count]) => {
      projectsText += `- ${project}: ${count} files\n`;
    });
    
    // Format status breakdown
    let statusText = '**Status Breakdown:**\n';
    Object.entries(analytics.statuses).forEach(([status, count]) => {
      statusText += `- ${status}: ${count} files\n`;
    });
    
    // Format actions breakdown
    let actionsText = '**Actions Needed:**\n';
    Object.entries(analytics.actionsNeeded).forEach(([action, count]) => {
      actionsText += `- ${action}: ${count} files\n`;
    });
    
    // Format duplicates
    let duplicatesText = '**Potential Duplicates:**\n';
    analytics.potentialDuplicates.slice(0, 20).forEach(dup => { // Show just top 20
      duplicatesText += `- ${dup.fileName} (${dup.paths.length} instances)\n`;
    });
    if (analytics.potentialDuplicates.length > 20) {
      duplicatesText += `- (${analytics.potentialDuplicates.length - 20} more...)\n`;
    }
    
    // Create a page in Notion with the summary
    const response = await notion.pages.create({
      parent: {
        database_id: NOTION_CATALOG_DB_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: `SecondBrain Analytics - ${new Date().toISOString().split('T')[0]}`
              }
            }
          ]
        },
        Type: {
          select: {
            name: 'Documentation'
          }
        },
        Path: {
          rich_text: [
            {
              text: {
                content: 'Generated Analysis'
              }
            }
          ]
        },
        Status: {
          select: {
            name: '✅ Active'
          }
        },
        Project: {
          select: {
            name: 'SecondBrain'
          }
        },
        'Strategic Relevance': {
          select: {
            name: 'Documentation'
          }
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                text: {
                  content: 'SecondBrain System Analysis'
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: `Analysis generated on ${new Date().toLocaleString()}. Total files analyzed: ${analytics.totalFiles}.`
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: projectsText
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: statusText
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: actionsText
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: duplicatesText
                }
              }
            ]
          }
        }
      ]
    });
    
    console.log(`Analytics summary created in Notion: ${response.id}`);
    return response.id;
  } catch (error) {
    console.error('Error creating analytics summary:', error);
    return null;
  }
}

// Main function
async function main() {
  try {
    console.log("===== Analyzing SecondBrain Catalog =====\n");
    
    // Verify database exists
    try {
      await notion.databases.retrieve({ database_id: NOTION_CATALOG_DB_ID });
      console.log(`Connected to Notion catalog database: ${NOTION_CATALOG_DB_ID}`);
    } catch (error) {
      console.error("Error accessing Notion database:", error);
      process.exit(1);
    }
    
    // Find the latest scan log
    const logDir = path.join(SECONDBRAIN_DIR, 'apps', 'TubeToTask', 'logs');
    if (!fs.existsSync(logDir)) {
      console.error("Error: No logs directory found. Please run catalog-secondbrain-files.js first.");
      process.exit(1);
    }
    
    // Get all scan log files
    const logFiles = fs.readdirSync(logDir)
      .filter(file => file.startsWith('catalog-scan_') && file.endsWith('.json'))
      .map(file => path.join(logDir, file));
    
    if (logFiles.length === 0) {
      console.error("Error: No scan logs found. Please run catalog-secondbrain-files.js first.");
      process.exit(1);
    }
    
    // Get the most recent log file
    const latestLog = logFiles.sort((a, b) => {
      return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
    })[0];
    
    console.log(`Using latest scan log: ${latestLog}`);
    
    // Load the log file
    const logData = JSON.parse(fs.readFileSync(latestLog, 'utf8'));
    
    // Analyze the results
    const analytics = analyzeResults(logData.files);
    
    // Save analytics to a separate file for easier review
    const analyticsPath = path.join(logDir, `catalog-analytics_${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
    
    console.log(`Analytics saved to: ${analyticsPath}`);
    
    // Update notion with analytics summary
    const summaryId = await createAnalyticsSummary(analytics);
    
    console.log(`Analytics summary created in Notion: ${summaryId}`);
    console.log("You can now view the analysis in your Notion catalog database");
    
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeResults,
  createAnalyticsSummary
};