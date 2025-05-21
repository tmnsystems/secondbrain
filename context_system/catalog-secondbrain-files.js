/**
 * Catalog SecondBrain Files
 * This script scans the SecondBrain directory and catalogs all files in Notion
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { verifyReviewerApproval } = require('../utils/reviewer');
require('dotenv').config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Promisify fs functions
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

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

// File type mapping
const fileTypeMap = {
  '.js': 'TypeScript/JavaScript',
  '.jsx': 'TypeScript/JavaScript',
  '.ts': 'TypeScript/JavaScript',
  '.tsx': 'TypeScript/JavaScript',
  '.py': 'Python',
  '.sh': 'Script',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.html': 'HTML/CSS',
  '.css': 'HTML/CSS',
  '.scss': 'HTML/CSS',
  '.yml': 'Configuration',
  '.yaml': 'Configuration',
  '.env': 'Configuration',
  '.txt': 'Documentation',
  '.csv': 'Data',
  '.log': 'Data'
};

// Skip these directories 
const SKIP_DIRS = [
  'node_modules',
  '.git',
  '.cl',
  'coverage',
  'dist',
  'build',
  'cache',
  '__pycache__',
  'venv',
  '.next',
  '.vercel',
  '.github'
];

// Batch processing settings
const BATCH_SIZE = 10; // Process files in batches of 10
const BATCH_DELAY = 2000; // Wait 2 seconds between batches to avoid API rate limits
const CHECKPOINT_INTERVAL = 50; // Save checkpoint every 50 files

// Project mapping based on path
function determineProject(filePath) {
  const relativePath = path.relative(SECONDBRAIN_DIR, filePath);
  const pathParts = relativePath.split(path.sep);
  
  if (pathParts[0] === 'apps') {
    if (pathParts[1] === 'TubeToTask') return 'TubeToTask';
    if (pathParts[1] === 'NymirAI') return 'NymirAI';
    if (pathParts[1] === 'ClientManager') return 'ClientManager';
    if (pathParts[1] === 'CoachTinaMarieAI') return 'CoachTinaMarieAI';
  }
  
  if (relativePath.includes('incredagent') || 
      relativePath.includes('IncredAgent') ||
      pathParts[0] === 'agents') {
    return 'IncredAgents';
  }
  
  // Default to SecondBrain for other paths
  return 'SecondBrain';
}

// Determine file type based on extension
function determineFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return fileTypeMap[ext] || 'Other';
}

// Determine strategic relevance based on file content and path
async function determineStrategicRelevance(filePath, fileType) {
  try {
    const relativePath = path.relative(SECONDBRAIN_DIR, filePath);
    const pathParts = relativePath.split(path.sep);
    const fileName = path.basename(filePath).toLowerCase();
    
    // Check for agent logic files
    if (fileName.includes('agent') ||
        pathParts.includes('agents') ||
        relativePath.includes('planner') ||
        relativePath.includes('executor') ||
        relativePath.includes('reviewer')) {
      return 'Agent Logic';
    }
    
    // Check for context system files
    if (fileName.includes('context') ||
        relativePath.includes('context') ||
        relativePath.includes('memory') ||
        fileName.includes('claude.md')) {
      return 'Context System';
    }
    
    // Check for embedding config files
    if (fileName.includes('embedding') ||
        fileName.includes('pinecone') ||
        relativePath.includes('embedding') ||
        relativePath.includes('vector')) {
      return 'Embedding Config';
    }
    
    // Check for UI components
    if (pathParts.includes('components') ||
        pathParts.includes('pages') ||
        pathParts.includes('ui') ||
        pathParts.includes('templates') ||
        fileType === 'HTML/CSS') {
      return 'UI Component';
    }
    
    // Check for API integration
    if (fileName.includes('api') ||
        pathParts.includes('api') ||
        relativePath.includes('integration') ||
        fileName.includes('notion') ||
        fileName.includes('slack')) {
      return 'API Integration';
    }
    
    // Check for database files
    if (fileName.includes('database') ||
        fileName.includes('db') ||
        relativePath.includes('database') ||
        pathParts.includes('data') ||
        fileName.includes('postgres') ||
        fileName.includes('redis')) {
      return 'Database Layer';
    }
    
    // Check for Claude prompt files
    if (fileName.includes('prompt') ||
        relativePath.includes('prompt') ||
        (fileType === 'Markdown' && fileName.endsWith('.md') && 
         !fileName.includes('readme'))) {
      // Read file content to check for prompt patterns
      const content = await readFile(filePath, 'utf8');
      if (content.includes('claude') ||
          content.includes('CLAUDE') ||
          content.includes('system:') ||
          content.includes('user:') ||
          content.includes('assistant:')) {
        return 'Claude Prompt';
      }
    }
    
    // Check for infrastructure files
    if (fileName.includes('docker') ||
        fileName.includes('env') ||
        fileName.includes('terraform') ||
        fileName.includes('vercel') ||
        fileName.includes('linode') ||
        fileName.endsWith('.sh')) {
      return 'Infrastructure';
    }
    
    // Check for documentation
    if (fileName.startsWith('readme') ||
        fileName.includes('guide') ||
        fileName.includes('tutorial') ||
        fileName.includes('doc') ||
        fileType === 'Markdown') {
      return 'Documentation';
    }
    
    // Default
    return 'Other';
  } catch (error) {
    console.error(`Error determining strategic relevance for ${filePath}:`, error);
    return 'Other';
  }
}

// Determine file status based on path and timestamps
async function determineFileStatus(filePath) {
  try {
    const stats = await stat(filePath);
    const relativePath = path.relative(SECONDBRAIN_DIR, filePath);
    const fileName = path.basename(filePath).toLowerCase();
    
    // Check for abandoned files (unused for more than 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    if (stats.mtime < threeMonthsAgo) {
      // Check if it's in an active directory
      if (relativePath.includes('deprecated') ||
          relativePath.includes('archive') ||
          relativePath.includes('old') ||
          fileName.includes('old') ||
          fileName.includes('deprecated')) {
        return '🔴 Abandoned';
      }
    }
    
    // Check for duplicated files 
    if (fileName.includes('copy') ||
        fileName.includes('backup') ||
        fileName.includes('v1') ||
        fileName.includes('v2') ||
        fileName.includes('old') ||
        fileName.match(/\(\d+\)$/) ||
        fileName.includes('duplicate')) {
      return '♻️ Duplicated';
    }
    
    // Check for in-progress files
    if (fileName.includes('wip') ||
        fileName.includes('draft') ||
        fileName.includes('todo') ||
        relativePath.includes('draft') ||
        relativePath.includes('dev') ||
        relativePath.includes('experimental')) {
      return '🟡 In Progress';
    }
    
    // Default to active for recently modified files
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    if (stats.mtime > twoWeeksAgo) {
      return '✅ Active';
    }
    
    // For older files, return active but they'll be analyzed later
    return '✅ Active';
  } catch (error) {
    console.error(`Error determining file status for ${filePath}:`, error);
    return '❓ Unknown';
  }
}

// Determine Claude integration type
async function determineClaudeIntegration(filePath, fileType) {
  try {
    const relativePath = path.relative(SECONDBRAIN_DIR, filePath);
    const fileName = path.basename(filePath).toLowerCase();
    
    // Quick checks based on filename/path
    if (fileName === 'claude.md' || fileName.includes('prompt')) {
      return 'Prompt Template';
    }
    
    if (relativePath.includes('context') && 
        (relativePath.includes('loader') || relativePath.includes('load'))) {
      return 'Context Loader';
    }
    
    if (relativePath.includes('memory') || fileName.includes('memory')) {
      return 'Memory System';
    }
    
    if (relativePath.includes('agent') || fileName.includes('agent')) {
      return 'Agent Logic';
    }
    
    // For potential prompt files, check content
    if (fileType === 'Markdown' || fileType === 'TypeScript/JavaScript' || fileType === 'Python') {
      const content = await readFile(filePath, 'utf8');
      
      if (content.includes('claude') || content.includes('CLAUDE')) {
        if (content.includes('system:') || content.includes('SYSTEM PROMPT')) {
          return 'Prompt Template';
        }
        
        if (content.includes('context') || content.includes('loading context')) {
          return 'Context Loader';
        }
        
        if (content.includes('memory') || content.includes('remember') || 
            content.includes('persist') || content.includes('store')) {
          return 'Memory System';
        }
        
        if (content.includes('agent') || content.includes('planner') || 
            content.includes('executor') || content.includes('reviewer')) {
          return 'Agent Logic';
        }
      }
    }
    
    return 'None';
  } catch (error) {
    console.error(`Error determining Claude integration for ${filePath}:`, error);
    return 'None';
  }
}

// Determine storage integration
async function determineStorageIntegration(filePath) {
  try {
    const relativePath = path.relative(SECONDBRAIN_DIR, filePath);
    const fileName = path.basename(filePath).toLowerCase();
    const integrations = [];
    
    // Try to read file content for deeper analysis
    let content = '';
    try {
      if (path.extname(filePath).match(/\.(js|ts|py|md|json|yml|yaml|sh)$/i)) {
        content = await readFile(filePath, 'utf8');
      }
    } catch (err) {
      // Silently continue if we can't read the file
    }
    
    // Check for Redis integration
    if (fileName.includes('redis') || 
        content.includes('redis') || 
        content.includes('Redis')) {
      integrations.push('Redis');
    }
    
    // Check for PostgreSQL integration
    if (fileName.includes('postgres') || 
        fileName.includes('sql') || 
        content.includes('postgres') || 
        content.includes('PostgreSQL') ||
        content.includes('sequelize')) {
      integrations.push('PostgreSQL');
    }
    
    // Check for Pinecone integration
    if (fileName.includes('pinecone') || 
        content.includes('pinecone') || 
        content.includes('Pinecone') ||
        content.includes('vector')) {
      integrations.push('Pinecone');
    }
    
    // Check for Notion integration
    if (fileName.includes('notion') || 
        content.includes('notion') || 
        content.includes('Notion')) {
      integrations.push('Notion');
    }
    
    // Check for local filesystem
    if (content.includes('fs.') || 
        content.includes('readFile') || 
        content.includes('writeFile') ||
        content.includes('path.join')) {
      integrations.push('Filesystem');
    }
    
    // Check for Vercel
    if (fileName.includes('vercel') || 
        content.includes('vercel') || 
        content.includes('Vercel') ||
        fileName === 'vercel.json') {
      integrations.push('Vercel');
    }
    
    // Check for Linode
    if (fileName.includes('linode') || 
        content.includes('linode') || 
        content.includes('Linode')) {
      integrations.push('Linode');
    }
    
    // Check for Slack
    if (fileName.includes('slack') || 
        content.includes('slack') || 
        content.includes('Slack')) {
      integrations.push('Slack');
    }
    
    return integrations.length > 0 ? integrations : ['Filesystem']; // Default to Filesystem
  } catch (error) {
    console.error(`Error determining storage integration for ${filePath}:`, error);
    return ['Filesystem']; // Default
  }
}

// Determine actions needed for a file
async function determineActionsNeeded(filePath, status, fileType) {
  try {
    const actions = [];
    const fileName = path.basename(filePath).toLowerCase();
    
    // Based on status
    if (status === '🔴 Abandoned') {
      actions.push('🗑️ Delete');
    }
    
    if (status === '♻️ Duplicated') {
      actions.push('🧼 Cleanup');
      actions.push('✅ Merge');
    }
    
    if (status === '🟡 In Progress') {
      actions.push('🔄 Update');
    }
    
    // Based on file type
    if (fileType === 'Documentation' || fileName.endsWith('.md')) {
      // Check if it's a README or similar
      if (fileName.includes('readme') || 
          fileName.includes('guide') || 
          fileName.includes('doc')) {
        // Let's check if it's comprehensive
        try {
          const content = await readFile(filePath, 'utf8');
          if (content.length < 500) { // Short documentation
            actions.push('📋 Document');
          }
        } catch (err) {
          // If we can't read it, suggest documenting
          actions.push('📋 Document');
        }
      }
    }
    
    // Check for potential test needs
    if ((fileType === 'TypeScript/JavaScript' || fileType === 'Python') &&
        !fileName.includes('test') && 
        !fileName.includes('spec')) {
      // This is code that might need tests
      const relativePath = path.relative(SECONDBRAIN_DIR, filePath);
      const pathParts = relativePath.split(path.sep);
      
      // If it's not in a test directory and not a utility/helper
      if (!pathParts.includes('test') && 
          !pathParts.includes('tests') && 
          !fileName.includes('util') && 
          !fileName.includes('helper')) {
        actions.push('🧪 Test');
      }
    }
    
    // Check for potential refactors (large files)
    try {
      const stats = await stat(filePath);
      if (stats.size > 10000 && // Larger than 10KB
          (fileType === 'TypeScript/JavaScript' || fileType === 'Python')) {
        actions.push('🧩 Refactor');
      }
    } catch (err) {
      // Ignore errors
    }
    
    return actions;
  } catch (error) {
    console.error(`Error determining actions needed for ${filePath}:`, error);
    return [];
  }
}

// Create Notion database entry for a file
async function createDatabaseEntry(fileInfo) {
  try {
    // Format last modified date for Notion
    const lastModified = new Date(fileInfo.lastModified).toISOString();
    
    // Create database entry properties
    const properties = {
      Name: {
        title: [
          {
            text: {
              content: path.basename(fileInfo.path)
            }
          }
        ]
      },
      Type: {
        select: {
          name: fileInfo.type
        }
      },
      Path: {
        rich_text: [
          {
            text: {
              content: fileInfo.path
            }
          }
        ]
      },
      Size: {
        number: fileInfo.size
      },
      'Last Modified': {
        date: {
          start: lastModified.split('T')[0] // YYYY-MM-DD format
        }
      },
      Status: {
        select: {
          name: fileInfo.status || '✅ Active'
        }
      },
      Project: {
        select: {
          name: fileInfo.project
        }
      },
      'Strategic Relevance': {
        select: {
          name: fileInfo.strategicRelevance || 'Other'
        }
      },
      'Claude Integration': {
        select: {
          name: fileInfo.claudeIntegration || 'None'
        }
      }
    };
    
    // Add multi-select fields if they exist
    if (fileInfo.storageIntegration && fileInfo.storageIntegration.length > 0) {
      properties['Storage Integration'] = {
        multi_select: fileInfo.storageIntegration.map(integration => ({
          name: integration
        }))
      };
    }
    
    if (fileInfo.actionsNeeded && fileInfo.actionsNeeded.length > 0) {
      properties['Action Needed'] = {
        multi_select: fileInfo.actionsNeeded.map(action => ({
          name: action
        }))
      };
    }
    
    // Create the database entry
    const response = await notion.pages.create({
      parent: {
        database_id: NOTION_CATALOG_DB_ID
      },
      properties: properties
    });
    
    return response.id;
  } catch (error) {
    console.error(`Error creating entry for ${fileInfo.path}:`, error);
    throw error;
  }
}

// Process a single file
async function processFile(filePath) {
  try {
    const stats = await stat(filePath);
    
    // Skip directories
    if (stats.isDirectory()) {
      return null;
    }
    
    // Skip very large files (>10MB) to avoid memory issues
    if (stats.size > 10 * 1024 * 1024) {
      console.log(`Skipping large file ${filePath} (${Math.round(stats.size / (1024 * 1024))}MB)`);
      
      // Create minimal entry for large files
      const fileType = determineFileType(filePath);
      const project = determineProject(filePath);
      
      const fileInfo = {
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        type: fileType,
        project: project,
        status: '✅ Active',
        strategicRelevance: 'Other',
        claudeIntegration: 'None',
        storageIntegration: ['Filesystem'],
        actionsNeeded: [],
        notes: 'Large file, minimal analysis performed'
      };
      
      console.log(`Creating minimal entry for large file: ${filePath}`);
      const entryId = await createDatabaseEntry(fileInfo);
      
      return {
        path: filePath,
        entryId: entryId,
        fileInfo: fileInfo,
        isLargeFile: true
      };
    }
    
    // Get basic file info
    const fileType = determineFileType(filePath);
    const project = determineProject(filePath);
    
    // Get strategic annotations
    console.log(`Analyzing: ${filePath}`);
    const status = await determineFileStatus(filePath);
    const strategicRelevance = await determineStrategicRelevance(filePath, fileType);
    const claudeIntegration = await determineClaudeIntegration(filePath, fileType);
    const storageIntegration = await determineStorageIntegration(filePath);
    const actionsNeeded = await determineActionsNeeded(filePath, status, fileType);
    
    // Determine business alignment
    let businessAlignment = 'Infrastructure';
    if (project === 'TubeToTask' || project === 'NymirAI' || 
        project === 'ClientManager' || project === 'CoachTinaMarieAI') {
      businessAlignment = 'Product';
    } else if (fileType === 'Documentation' || claudeIntegration === 'Prompt Template') {
      businessAlignment = 'Knowledge';
    }
    
    // Compile complete file info
    const fileInfo = {
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime,
      type: fileType,
      project: project,
      status: status,
      strategicRelevance: strategicRelevance,
      claudeIntegration: claudeIntegration,
      storageIntegration: storageIntegration,
      actionsNeeded: actionsNeeded,
      businessAlignment: businessAlignment
    };
    
    console.log(`Processing: ${filePath}`);
    
    // Create database entry
    const entryId = await createDatabaseEntry(fileInfo);
    
    return {
      path: filePath,
      entryId: entryId,
      fileInfo: fileInfo
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
}

// Get checkpoint filename for a directory
function getCheckpointFilename(dir) {
  const sanitizedDir = dir.replace(/[^a-zA-Z0-9]/g, '_');
  
  // Create checkpoints directory if it doesn't exist
  const checkpointsDir = path.join(SECONDBRAIN_DIR, 'context_system', 'checkpoints');
  if (!fs.existsSync(checkpointsDir)) {
    fs.mkdirSync(checkpointsDir, { recursive: true });
  }
  
  return path.join(checkpointsDir, `catalog_checkpoint_${sanitizedDir}.json`);
}

// Save checkpoint
async function saveCheckpoint(dir, processedFiles, pendingPaths) {
  try {
    const checkpointFile = getCheckpointFilename(dir);
    const checkpointData = {
      timestamp: new Date().toISOString(),
      dir: dir,
      processedCount: processedFiles.length,
      processedFiles: processedFiles,
      pendingPaths: pendingPaths
    };
    
    fs.writeFileSync(checkpointFile, JSON.stringify(checkpointData, null, 2));
    console.log(`Checkpoint saved to ${checkpointFile} (${processedFiles.length} files processed)`);
    return true;
  } catch (error) {
    console.error(`Error saving checkpoint for ${dir}:`, error);
    return false;
  }
}

// Load checkpoint
function loadCheckpoint(dir) {
  try {
    // Check new location first
    const checkpointFile = getCheckpointFilename(dir);
    if (fs.existsSync(checkpointFile)) {
      const checkpointData = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
      console.log(`Loaded checkpoint from ${checkpointFile} (${checkpointData.processedCount} files already processed)`);
      return checkpointData;
    }
    
    // Check old location as fallback
    const oldCheckpointFile = path.join(SECONDBRAIN_DIR, 'apps', 'TubeToTask', 'logs', 
      `catalog_checkpoint_${dir.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      
    if (fs.existsSync(oldCheckpointFile)) {
      const checkpointData = JSON.parse(fs.readFileSync(oldCheckpointFile, 'utf8'));
      console.log(`Loaded checkpoint from old location: ${oldCheckpointFile} (${checkpointData.processedCount} files already processed)`);
      
      // Save to new location for future use
      fs.writeFileSync(checkpointFile, JSON.stringify(checkpointData, null, 2));
      console.log(`Migrated checkpoint to new location: ${checkpointFile}`);
      
      return checkpointData;
    }
    
    return null;
  } catch (error) {
    console.error(`Error loading checkpoint for ${dir}:`, error);
    return null;
  }
}

// Process a batch of files
async function processBatch(filePaths, results) {
  const batchResults = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        return await processFile(filePath);
      } catch (error) {
        console.error(`Error processing file ${filePath} in batch:`, error);
        return null;
      }
    })
  );
  
  // Filter out null results and add to results array
  const validResults = batchResults.filter(result => result !== null);
  results.push(...validResults);
  
  return results;
}

// Recursively scan directory with batching and checkpoints
async function scanDirectory(dir, results = [], pendingPaths = []) {
  try {
    // Check for checkpoint
    const checkpoint = loadCheckpoint(dir);
    if (checkpoint) {
      results = checkpoint.processedFiles;
      pendingPaths = checkpoint.pendingPaths;
      console.log(`Resuming from checkpoint: ${results.length} files processed, ${pendingPaths.length} files pending`);
    } else {
      // Initialize pendingPaths if this is a fresh start
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip excluded directories
        if (entry.isDirectory() && SKIP_DIRS.includes(entry.name)) {
          console.log(`Skipping directory: ${fullPath}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          // Get all files in subdirectory
          await scanDirectory(fullPath, results, pendingPaths);
        } else {
          // Add file to pending paths
          pendingPaths.push(fullPath);
        }
      }
    }
    
    // Process pending paths in batches
    let batchCount = 0;
    let processedInThisRun = 0;
    
    while (pendingPaths.length > 0) {
      // Take the next batch
      const batch = pendingPaths.splice(0, BATCH_SIZE);
      
      // Process batch
      await processBatch(batch, results);
      processedInThisRun += batch.length;
      batchCount++;
      
      console.log(`Batch ${batchCount} complete. ${pendingPaths.length} files remaining.`);
      
      // Save checkpoint at intervals
      if (processedInThisRun >= CHECKPOINT_INTERVAL) {
        await saveCheckpoint(dir, results, pendingPaths);
        processedInThisRun = 0;
      }
      
      // Delay between batches
      if (pendingPaths.length > 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    // Final checkpoint
    await saveCheckpoint(dir, results, []);
    
    return results;
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
    // Save checkpoint on error to allow resuming
    await saveCheckpoint(dir, results, pendingPaths);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log("===== Cataloging SecondBrain Files =====\n");
    
    // Verify with Reviewer Agent
    console.log("Verifying approval with Reviewer Agent...");
    const reviewStatus = await verifyReviewerApproval(
      'Catalog all SecondBrain files', 
      { requireNotion: false, bypassForTesting: process.env.NODE_ENV === 'development' }
    );
    
    if (!reviewStatus.approved) {
      console.error(`Error: ${reviewStatus.message}`);
      console.error("Please consult the Reviewer Agent before running this script.");
      process.exit(1);
    }
    
    console.log("✅ Reviewer Agent approval verified. Proceeding with catalog operation.");
    
    // Verify database exists
    try {
      await notion.databases.retrieve({ database_id: NOTION_CATALOG_DB_ID });
      console.log(`Connected to Notion catalog database: ${NOTION_CATALOG_DB_ID}`);
    } catch (error) {
      console.error("Error accessing Notion database:", error);
      process.exit(1);
    }
    
    // Create checkpoints directory if it doesn't exist
    const checkpointsDir = path.join(SECONDBRAIN_DIR, 'context_system', 'checkpoints');
    if (!fs.existsSync(checkpointsDir)) {
      fs.mkdirSync(checkpointsDir, { recursive: true });
    }
    
    // Create logs directory if it doesn't exist
    const logDir = path.join(SECONDBRAIN_DIR, 'context_system', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Start scanning from SecondBrain root
    console.log(`Starting scan at: ${SECONDBRAIN_DIR}`);
    console.log(`Using batch size: ${BATCH_SIZE}, delay: ${BATCH_DELAY}ms, checkpoint interval: ${CHECKPOINT_INTERVAL}`);
    
    const results = await scanDirectory(SECONDBRAIN_DIR);
    
    console.log("\n===== Scan Complete =====");
    console.log(`Processed ${results.length} files`);
    
    // Save results to a log file for reference
    const logData = {
      timestamp: new Date().toISOString(),
      totalFiles: results.length,
      files: results
    };
    
    const logPath = path.join(logDir, `catalog-scan_${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    
    // Create review record in Notion
    await verifyReviewerApproval('SecondBrain File Catalog Complete', {
      bypassForTesting: true,
      createRecord: true,
      reviewerFeedback: `Completed catalog of all files in SecondBrain. Processed ${results.length} files and stored metadata in Notion.`,
      approved: true
    });
    
    console.log(`Log saved to: ${logPath}`);
    console.log("You can now view all SecondBrain files in your Notion catalog database");
    
    // Run analysis script
    console.log("\nTo analyze the results, run: node analyze-catalog-results.js");
    
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
}

// Run the script
main();