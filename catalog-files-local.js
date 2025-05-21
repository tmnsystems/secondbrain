/**
 * Catalog SecondBrain Files (Local Version)
 * This script scans the SecondBrain directory and catalogs all files locally
 * without requiring the Notion API.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisify fs functions
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

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
const BATCH_SIZE = 100; // Process files in batches of 100
const BATCH_DELAY = 10; // Wait 10ms between batches to avoid high CPU
const CHECKPOINT_INTERVAL = 500; // Save checkpoint every 500 files

// Create logs directory if it doesn't exist
const logsDir = path.join(SECONDBRAIN_DIR, 'context_system', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

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
    
    // Check for API code
    if (fileName.includes('api') ||
        relativePath.includes('api') ||
        relativePath.includes('endpoint') ||
        relativePath.includes('routes')) {
      return 'API';
    }
    
    // Check for test files
    if (fileName.includes('test') ||
        fileName.includes('spec') ||
        pathParts.includes('tests') ||
        pathParts.includes('__tests__')) {
      return 'Test';
    }
    
    // Check for documentation
    if (fileType === 'Markdown' ||
        fileName.includes('readme') ||
        fileName.includes('doc') ||
        pathParts.includes('docs')) {
      return 'Documentation';
    }
    
    // Check for configuration
    if (fileType === 'Configuration' ||
        fileName.includes('config') ||
        fileName.includes('.env')) {
      return 'Configuration';
    }
    
    // Check for data files
    if (fileType === 'Data' ||
        pathParts.includes('data') ||
        pathParts.includes('fixtures') ||
        pathParts.includes('processed_data')) {
      return 'Data';
    }
    
    // Default to 'Unknown'
    return 'Unknown';
  } catch (error) {
    console.error(`Error determining strategic relevance for ${filePath}:`, error);
    return 'Unknown';
  }
}

// Determine Claude integration
async function determineClaudeIntegration(filePath, strategicRelevance) {
  try {
    const relativePath = path.relative(SECONDBRAIN_DIR, filePath);
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName === 'claude.md' || fileName.includes('prompt')) {
      return 'Prompt';
    }
    
    if (strategicRelevance === 'Context System' && 
       (fileName.includes('load') || fileName.includes('persist'))) {
      return 'Context Loader';
    }
    
    if (fileName.includes('agent') && 
       (fileName.includes('claude') || fileName.includes('anthropic'))) {
      return 'Agent Integration';
    }
    
    if (relativePath.includes('claude') || relativePath.includes('anthropic')) {
      return 'API Integration';
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
    const fileName = path.basename(filePath).toLowerCase();
    const fileContent = await readFile(filePath, 'utf8').catch(() => '');
    
    const storageIntegrations = [];
    
    // Check for Redis integration
    if (fileName.includes('redis') || fileContent.includes('redis')) {
      storageIntegrations.push('Redis');
    }
    
    // Check for PostgreSQL integration
    if (fileName.includes('postgres') || 
        fileName.includes('pg') || 
        fileContent.includes('postgres') || 
        fileContent.includes('pg.connect')) {
      storageIntegrations.push('PostgreSQL');
    }
    
    // Check for Pinecone integration
    if (fileName.includes('pinecone') || fileContent.includes('pinecone')) {
      storageIntegrations.push('Pinecone');
    }
    
    // Check for other storage systems
    if (fileName.includes('supabase') || fileContent.includes('supabase')) {
      storageIntegrations.push('Supabase');
    }
    
    if (fileName.includes('notion') || fileContent.includes('notion')) {
      storageIntegrations.push('Notion');
    }
    
    if (storageIntegrations.length === 0) {
      return 'None';
    }
    
    return storageIntegrations.join(', ');
  } catch (error) {
    console.error(`Error determining storage integration for ${filePath}:`, error);
    return 'None';
  }
}

// Determine actions needed
async function determineActionNeeded(filePath, fileType, strategicRelevance) {
  try {
    // For simplicity, just identify if the file needs attention
    // In a real implementation, this would be more sophisticated
    
    if (strategicRelevance === 'Unknown') {
      return 'Needs Classification';
    }
    
    if (path.basename(filePath).includes('TODO')) {
      return 'Implementation Required';
    }
    
    const fileStats = await stat(filePath);
    const modifiedTime = fileStats.mtime;
    const now = new Date();
    const daysSinceModified = (now - modifiedTime) / (1000 * 60 * 60 * 24);
    
    // Files older than 90 days that are strategic might need review
    if (daysSinceModified > 90 && 
       (strategicRelevance === 'Agent Logic' || 
        strategicRelevance === 'Context System')) {
      return 'Review for Currency';
    }
    
    return 'None';
  } catch (error) {
    console.error(`Error determining action needed for ${filePath}:`, error);
    return 'Error - Needs Investigation';
  }
}

// Determine business alignment
function determineBusinessAlignment(project, strategicRelevance) {
  try {
    if (project === 'TubeToTask') {
      return 'SaaS Product';
    }
    
    if (project === 'NymirAI') {
      return 'SaaS Product';
    }
    
    if (project === 'ClientManager') {
      return 'SaaS Product';
    }
    
    if (project === 'CoachTinaMarieAI') {
      return 'Core Business';
    }
    
    if (project === 'IncredAgents') {
      return 'Core Business';
    }
    
    if (strategicRelevance === 'Agent Logic' || 
        strategicRelevance === 'Context System') {
      return 'Core Infrastructure';
    }
    
    return 'Support';
  } catch (error) {
    console.error(`Error determining business alignment:`, error);
    return 'Unknown';
  }
}

// Process file data
async function processFile(filePath) {
  try {
    // Get basic file info
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;
    const fileModified = fileStats.mtime;
    
    // Skip very large files (> 10MB)
    if (fileSize > 10 * 1024 * 1024) {
      console.log(`Skipping large file: ${filePath} (${fileSize} bytes)`);
      return {
        path: filePath,
        size: fileSize,
        type: 'Large File',
        project: 'Unknown',
        strategicRelevance: 'Unknown',
        note: 'File too large to process'
      };
    }
    
    // Determine file properties
    const fileName = path.basename(filePath);
    const fileType = determineFileType(filePath);
    const project = determineProject(filePath);
    
    // Deeper analysis
    const strategicRelevance = await determineStrategicRelevance(filePath, fileType);
    const claudeIntegration = await determineClaudeIntegration(filePath, strategicRelevance);
    let storageIntegration = 'None';
    
    // Only check storage integration for code files to save time
    if (['TypeScript/JavaScript', 'Python'].includes(fileType)) {
      storageIntegration = await determineStorageIntegration(filePath);
    }
    
    const actionsNeeded = await determineActionNeeded(filePath, fileType, strategicRelevance);
    const businessAlignment = determineBusinessAlignment(project, strategicRelevance);
    
    // Create file info object
    const fileInfo = {
      fileName: fileName,
      filePath: filePath,
      fileSize: fileSize,
      fileModified: fileModified,
      fileType: fileType,
      project: project,
      status: 'Active',
      strategicRelevance: strategicRelevance,
      claudeIntegration: claudeIntegration,
      storageIntegration: storageIntegration,
      actionsNeeded: actionsNeeded,
      businessAlignment: businessAlignment
    };
    
    console.log(`Processing: ${filePath}`);
    
    return fileInfo;
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
    console.log("===== Cataloging SecondBrain Files (Local Version) =====\n");
    
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
    
    console.log(`Log saved to: ${logPath}`);
    
    // Generate summary file with stats
    const summary = {
      timestamp: new Date().toISOString(),
      totalFiles: results.length,
      byProject: {},
      byType: {},
      byStrategicRelevance: {},
      byBusinessAlignment: {},
      actionsNeeded: {}
    };
    
    // Generate stats
    results.forEach(file => {
      // Count by project
      summary.byProject[file.project] = (summary.byProject[file.project] || 0) + 1;
      
      // Count by type
      summary.byType[file.fileType] = (summary.byType[file.fileType] || 0) + 1;
      
      // Count by strategic relevance
      summary.byStrategicRelevance[file.strategicRelevance] = 
        (summary.byStrategicRelevance[file.strategicRelevance] || 0) + 1;
      
      // Count by business alignment
      summary.byBusinessAlignment[file.businessAlignment] = 
        (summary.byBusinessAlignment[file.businessAlignment] || 0) + 1;
      
      // Count actions needed
      if (file.actionsNeeded !== 'None') {
        summary.actionsNeeded[file.actionsNeeded] = 
          (summary.actionsNeeded[file.actionsNeeded] || 0) + 1;
      }
    });
    
    // Save summary
    const summaryPath = path.join(logDir, `catalog-summary_${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    // Also save a markdown version for easy reading
    const markdownSummary = `# SecondBrain Catalog Summary
    
## Overview
- **Total Files:** ${results.length}
- **Scan Date:** ${new Date().toISOString()}

## Files by Project
${Object.entries(summary.byProject)
  .sort((a, b) => b[1] - a[1])
  .map(([project, count]) => `- **${project}:** ${count} files`)
  .join('\n')}

## Files by Type
${Object.entries(summary.byType)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => `- **${type}:** ${count} files`)
  .join('\n')}

## Files by Strategic Relevance
${Object.entries(summary.byStrategicRelevance)
  .sort((a, b) => b[1] - a[1])
  .map(([relevance, count]) => `- **${relevance}:** ${count} files`)
  .join('\n')}

## Files by Business Alignment
${Object.entries(summary.byBusinessAlignment)
  .sort((a, b) => b[1] - a[1])
  .map(([alignment, count]) => `- **${alignment}:** ${count} files`)
  .join('\n')}

## Actions Needed
${Object.keys(summary.actionsNeeded).length === 0 ? 
  '- No actions needed' : 
  Object.entries(summary.actionsNeeded)
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => `- **${action}:** ${count} files`)
    .join('\n')}

## Files Needing Attention

${results
  .filter(file => file.actionsNeeded !== 'None')
  .slice(0, 50) // Limit to 50 files to prevent massive files
  .map(file => `- **${file.filePath}** (${file.actionsNeeded})`)
  .join('\n')}

${results.filter(file => file.actionsNeeded !== 'None').length > 50 ? 
  `\n*...and ${results.filter(file => file.actionsNeeded !== 'None').length - 50} more files*` : 
  ''}

---

*This summary was generated on ${new Date().toISOString()}*
`;
    
    const markdownPath = path.join(logDir, `catalog-summary_${new Date().toISOString().replace(/:/g, '-')}.md`);
    fs.writeFileSync(markdownPath, markdownSummary);
    
    console.log(`Summary saved to: ${summaryPath}`);
    console.log(`Markdown summary saved to: ${markdownPath}`);
    
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
}

// Run the script
main();