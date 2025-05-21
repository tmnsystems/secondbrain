/**
 * SecondBrain Process Tracker
 * 
 * This module tracks which files have been processed and when:
 * 1. Records file paths and last modified times
 * 2. Determines which files are new or modified
 * 3. Allows incremental processing of only changed content
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Constants
const TRACKER_FILE = './processed_content/process_tracker.json';

/**
 * Load the process tracker
 */
async function loadTracker() {
  try {
    const data = await fs.readFile(TRACKER_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If tracker doesn't exist, create an empty one
    return {
      last_process_time: null,
      processed_files: {}
    };
  }
}

/**
 * Save the process tracker
 */
async function saveTracker(tracker) {
  try {
    await fs.mkdir(path.dirname(TRACKER_FILE), { recursive: true });
    await fs.writeFile(TRACKER_FILE, JSON.stringify(tracker, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving tracker:", error);
    return false;
  }
}

/**
 * Calculate file hash for content comparison
 */
async function calculateFileHash(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto
      .createHash('md5')
      .update(content)
      .digest('hex');
  } catch (error) {
    console.error(`Error calculating hash for ${filePath}:`, error);
    return null;
  }
}

/**
 * Determine which files need processing
 */
async function getFilesToProcess(allFiles) {
  try {
    // Load the tracker
    const tracker = await loadTracker();
    const newOrModifiedFiles = [];
    
    // Check each file
    for (const file of allFiles) {
      const filePath = file.path;
      
      try {
        // Get file stats
        const stats = await fs.stat(filePath);
        const modifiedTime = stats.mtime.getTime();
        const currentHash = await calculateFileHash(filePath);
        
        // Check if the file is new or modified
        const trackedFile = tracker.processed_files[filePath];
        if (
          !trackedFile || 
          trackedFile.modified_time < modifiedTime ||
          trackedFile.hash !== currentHash
        ) {
          newOrModifiedFiles.push({
            ...file,
            modified_time: modifiedTime,
            hash: currentHash,
            is_new: !trackedFile
          });
        }
      } catch (error) {
        console.error(`Error checking file ${filePath}:`, error);
      }
    }
    
    return newOrModifiedFiles;
  } catch (error) {
    console.error("Error determining files to process:", error);
    // If error, process all files
    return allFiles.map(file => ({
      ...file,
      is_new: true
    }));
  }
}

/**
 * Record processed files in the tracker
 */
async function recordProcessedFiles(processedFiles) {
  try {
    // Load the current tracker
    const tracker = await loadTracker();
    
    // Update with newly processed files
    processedFiles.forEach(file => {
      tracker.processed_files[file.path] = {
        path: file.path,
        type: file.type,
        modified_time: file.modified_time || Date.now(),
        hash: file.hash,
        last_processed: Date.now()
      };
    });
    
    // Update last process time
    tracker.last_process_time = Date.now();
    
    // Save the updated tracker
    return await saveTracker(tracker);
  } catch (error) {
    console.error("Error recording processed files:", error);
    return false;
  }
}

/**
 * Get processing stats
 */
async function getProcessingStats() {
  try {
    const tracker = await loadTracker();
    const fileCount = Object.keys(tracker.processed_files).length;
    const typeBreakdown = {};
    
    // Count files by type
    Object.values(tracker.processed_files).forEach(file => {
      if (!typeBreakdown[file.type]) {
        typeBreakdown[file.type] = 0;
      }
      typeBreakdown[file.type]++;
    });
    
    return {
      total_files: fileCount,
      last_process_time: tracker.last_process_time ? new Date(tracker.last_process_time) : null,
      type_breakdown: typeBreakdown
    };
  } catch (error) {
    console.error("Error getting processing stats:", error);
    return {
      total_files: 0,
      last_process_time: null,
      type_breakdown: {}
    };
  }
}

// Export the functions
module.exports = {
  getFilesToProcess,
  recordProcessedFiles,
  getProcessingStats
};