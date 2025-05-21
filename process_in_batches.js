/**
 * SecondBrain Batch Style Analyzer
 * 
 * This script processes content in smaller batches to avoid timeouts,
 * maintains context across batches, and provides progress indicators.
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const { OpenAI } = require('openai');

// Environment variables check
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: Missing OPENAI_API_KEY in environment variables');
  console.error('Please ensure this is set in your .env file');
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants
const CHAT_MODEL = "gpt-4o";
const PROCESSED_CONTENT_DIR = './processed_content';
const PROCESSED_DATA_DIR = './processed_data';
const BATCH_STATE_FILE = path.join(PROCESSED_DATA_DIR, 'batch_processing_state.json');
const BATCH_SIZE = 5; // Number of files to process in each batch
const PROGRESS_LOG = path.join(PROCESSED_DATA_DIR, 'processing_progress.log');

/**
 * Main function to analyze the style from processed content in batches
 */
async function analyzeContentStyleInBatches() {
  try {
    console.log("Starting batched style analysis...");
    
    // Create output directory if it doesn't exist
    await fs.mkdir(PROCESSED_DATA_DIR, { recursive: true });
    
    // Load the content index
    const indexPath = path.join(PROCESSED_CONTENT_DIR, 'content_index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const contentIndex = JSON.parse(indexData);
    
    console.log(`Found ${contentIndex.length} total processed content items to analyze`);
    
    // Load or initialize batch state
    let batchState = await loadBatchState();
    
    // If we're starting fresh, initialize state
    if (!batchState.started) {
      batchState = {
        started: true,
        totalFiles: contentIndex.length,
        processedFiles: 0,
        completedFiles: [],
        startTime: new Date().toISOString(),
        lastBatchTime: new Date().toISOString()
      };
      await saveBatchState(batchState);
      await logProgress(`Starting full processing of ${contentIndex.length} files`);
    }
    
    // Filter out already processed files
    const remainingFiles = contentIndex.filter(file => 
      !batchState.completedFiles.includes(file.fileName)
    );
    
    if (remainingFiles.length === 0) {
      console.log("All files have been processed! Creating combined profile...");
      await logProgress(`All ${batchState.totalFiles} files processed successfully!`);
      await createCombinedProfile();
      return { success: true, message: "All files processed and combined profile created" };
    }
    
    // Take the next batch
    const currentBatch = remainingFiles.slice(0, BATCH_SIZE);
    
    console.log(`Processing batch of ${currentBatch.length} files (${batchState.processedFiles + 1} to ${batchState.processedFiles + currentBatch.length} of ${contentIndex.length})`);
    await logProgress(`Processing batch of ${currentBatch.length} files (${batchState.processedFiles + 1} to ${batchState.processedFiles + currentBatch.length} of ${contentIndex.length})`);
    
    // Process each file in the batch
    for (const file of currentBatch) {
      console.log(`Analyzing style for: ${file.fileName} (${file.type})`);
      await logProgress(`Processing file: ${file.fileName} (${file.type})`);
      
      try {
        // Load the full content
        const contentData = await fs.readFile(file.cachePath, 'utf-8');
        const contentItem = JSON.parse(contentData);
        
        // Generate a style profile for this content
        const profile = await generateStyleProfile(contentItem);
        
        // Save the individual style profile
        const profileFileName = path.basename(file.fileName, path.extname(file.fileName))
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase() + '_style_profile.json';
        const profilePath = path.join(PROCESSED_DATA_DIR, profileFileName);
        await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
        
        console.log(`Saved style profile to ${profilePath}`);
        
        // Update state with this completed file
        batchState.completedFiles.push(file.fileName);
        batchState.processedFiles++;
        await saveBatchState(batchState);
      } catch (error) {
        console.error(`Error processing file ${file.fileName}:`, error);
        await logProgress(`ERROR processing file: ${file.fileName} - ${error.message}`);
      }
    }
    
    // Update the last batch time
    batchState.lastBatchTime = new Date().toISOString();
    await saveBatchState(batchState);
    
    const completion = (batchState.processedFiles / batchState.totalFiles * 100).toFixed(2);
    console.log(`Batch complete! Overall progress: ${completion}% (${batchState.processedFiles}/${batchState.totalFiles})`);
    await logProgress(`Batch complete! Overall progress: ${completion}% (${batchState.processedFiles}/${batchState.totalFiles})`);
    
    // Check if we've completed all files
    if (batchState.processedFiles >= batchState.totalFiles) {
      console.log("All files have been processed! Creating combined profile...");
      await logProgress(`All ${batchState.totalFiles} files processed successfully!`);
      await createCombinedProfile();
      return { success: true, message: "All files processed and combined profile created" };
    }
    
    return { 
      success: true, 
      message: `Batch complete! Overall progress: ${completion}%`,
      completed: false
    };
  } catch (error) {
    console.error("Error in batched style analysis:", error);
    await logProgress(`ERROR in batch processing: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a style profile for a piece of content
 */
async function generateStyleProfile(contentItem) {
  try {
    // Analyze the content using GPT-4o
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { 
          role: "system", 
          content: `You are an expert stylistic analyzer and content profiler. Your task is to deeply analyze the writing style, 
tone, rhetorical devices, and unique patterns of the provided content. Extract the author's distinctive voice elements 
that make their content recognizable and unique.` 
        },
        { 
          role: "user", 
          content: `Analyze this content (${contentItem.type}) and create a comprehensive style profile.
Extract the following elements:

1. Voice and Tone: Identify the overall tone (formal, conversational, direct, etc.) and distinctive voice patterns.
2. Characteristic Phrases: Extract unique phrases, idioms, or expressions that the author frequently uses.
3. Metaphors and Analogies: Identify common metaphors, analogies, and comparative devices.
4. Structural Patterns: Analyze how content is typically structured, including paragraph length, transitions, and overall organization.
5. Rhetorical Devices: Identify recurring rhetorical techniques like questions, repetition, lists, emphasis, etc.
6. Conceptual Frameworks: Extract any recognizable thinking frameworks, decision models, or teaching methodologies.
7. Value Hierarchy: Determine what the author seems to value most based on emphasis and repetition.
8. Distinctive Vocabulary: Extract unusual, distinctive, or frequent word choices.

Content to analyze:
${contentItem.content}

Format your response as a JSON object with these categories. Include specific examples for each element where possible.`
        }
      ],
      temperature: 0.1,  // Lower temperature for more consistent analysis
      response_format: { type: "json_object" }
    });
    
    // Parse and return the profile
    const profileData = JSON.parse(response.choices[0].message.content);
    
    // Add metadata
    return {
      source: contentItem.fileName,
      type: contentItem.type,
      analyzed_at: new Date().toISOString(),
      profile: profileData
    };
  } catch (error) {
    console.error(`Error generating style profile for ${contentItem.fileName}:`, error);
    // Return basic metadata with error
    return {
      source: contentItem.fileName,
      type: contentItem.type,
      analyzed_at: new Date().toISOString(),
      error: error.message,
      profile: {
        note: "Analysis failed. See error message."
      }
    };
  }
}

/**
 * Create a combined style profile from all individual profiles
 */
async function createCombinedProfile() {
  try {
    console.log("Creating combined profile from all individual profiles...");
    await logProgress("Creating combined profile from all individual profiles...");
    
    // Load all individual profiles
    const profileFiles = glob.sync(path.join(PROCESSED_DATA_DIR, '*_style_profile.json'));
    console.log(`Found ${profileFiles.length} style profiles to combine`);
    
    // Load each profile
    const profiles = [];
    for (const file of profileFiles) {
      try {
        const data = await fs.readFile(file, 'utf-8');
        profiles.push(JSON.parse(data));
      } catch (error) {
        console.error(`Error loading profile ${file}:`, error);
      }
    }
    
    // Convert profiles to a format that can be analyzed
    const profilesText = JSON.stringify(profiles, null, 2);
    
    // Generate a combined profile using GPT-4o
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { 
          role: "system", 
          content: `You are an expert at synthesizing stylistic analyses. Your task is to combine multiple content style profiles
into a unified, comprehensive style guide that captures the essence of the author's unique voice.` 
        },
        { 
          role: "user", 
          content: `I have ${profiles.length} style profile analyses from different content pieces by the same author.
Create a unified style profile that synthesizes these individual analyses into a comprehensive guide.

For each category:
1. Identify the most consistent and distinctive patterns across all profiles
2. Note any variations in style between different content types
3. Provide concrete examples for each element
4. Rank elements by distinctiveness and frequency

The unified profile should be usable as a style guide for generating new content that sounds
authentically like the original author.

Here are the individual profiles:
${profilesText}

Format your response as a detailed JSON object with the same categories as the input profiles, 
but with synthesized information and weighted importance for each element.`
        }
      ],
      temperature: 0.2,  // Slightly higher temperature for creative synthesis
      response_format: { type: "json_object" }
    });
    
    // Parse and return the combined profile
    const combinedProfile = JSON.parse(response.choices[0].message.content);
    
    // Add metadata
    const finalProfile = {
      created_at: new Date().toISOString(),
      source_profiles: profiles.length,
      source_types: [...new Set(profiles.map(p => p.type))],
      profile: combinedProfile
    };
    
    // Save the combined profile
    const combinedProfilePath = path.join(PROCESSED_DATA_DIR, 'combined_style_profile.json');
    await fs.writeFile(combinedProfilePath, JSON.stringify(finalProfile, null, 2));
    
    // Also save as master profile for consistency with other scripts
    const masterProfilePath = path.join(PROCESSED_DATA_DIR, 'master_style_profile.json');
    await fs.writeFile(masterProfilePath, JSON.stringify(finalProfile, null, 2));
    
    console.log(`Combined profile created from ${profiles.length} individual profiles`);
    console.log(`Combined profile saved to: ${combinedProfilePath}`);
    console.log(`Master profile saved to: ${masterProfilePath}`);
    await logProgress(`SUCCESS: Combined profile created from ${profiles.length} individual profiles`);
    
    return { success: true };
  } catch (error) {
    console.error("Error creating combined profile:", error);
    await logProgress(`ERROR creating combined profile: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Load the current batch processing state
 */
async function loadBatchState() {
  try {
    const data = await fs.readFile(BATCH_STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, return initial state
    return {
      started: false,
      totalFiles: 0,
      processedFiles: 0,
      completedFiles: [],
      startTime: null,
      lastBatchTime: null
    };
  }
}

/**
 * Save the current batch processing state
 */
async function saveBatchState(state) {
  await fs.writeFile(BATCH_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Log progress to a file for monitoring
 */
async function logProgress(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  try {
    await fs.appendFile(PROGRESS_LOG, logMessage);
  } catch (error) {
    console.error("Error writing to progress log:", error);
  }
}

/**
 * Get progress statistics
 */
async function getProgressStats() {
  try {
    // Load batch state
    const batchState = await loadBatchState();
    
    if (!batchState.started) {
      return { 
        started: false,
        message: "Batch processing has not started yet" 
      };
    }
    
    // Calculate progress percentage
    const percentComplete = (batchState.processedFiles / batchState.totalFiles * 100).toFixed(2);
    
    // Calculate time elapsed since start
    const startTime = new Date(batchState.startTime);
    const now = new Date();
    const elapsedMs = now - startTime;
    const elapsedHours = (elapsedMs / (1000 * 60 * 60)).toFixed(2);
    
    // Calculate time since last batch
    const lastBatchTime = new Date(batchState.lastBatchTime);
    const sinceLastBatchMs = now - lastBatchTime;
    const sinceLastBatchMinutes = (sinceLastBatchMs / (1000 * 60)).toFixed(2);
    
    // Count the number of created style profiles
    const profileCount = glob.sync(path.join(PROCESSED_DATA_DIR, '*_style_profile.json')).length;
    
    // Get content type distribution
    const profileFiles = glob.sync(path.join(PROCESSED_DATA_DIR, '*_style_profile.json'));
    const typeDistribution = {};
    
    for (const file of profileFiles) {
      try {
        const data = await fs.readFile(file, 'utf-8');
        const profile = JSON.parse(data);
        const type = profile.type || 'unknown';
        
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      } catch (error) {
        // Skip files that can't be parsed
      }
    }
    
    return {
      started: true,
      totalFiles: batchState.totalFiles,
      processedFiles: batchState.processedFiles,
      percentComplete: `${percentComplete}%`,
      elapsedTime: `${elapsedHours} hours`,
      timeSinceLastBatch: `${sinceLastBatchMinutes} minutes`,
      profileCount,
      typeDistribution,
      startTime: batchState.startTime,
      lastBatchTime: batchState.lastBatchTime
    };
  } catch (error) {
    console.error("Error getting progress stats:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Export functions
module.exports = {
  analyzeContentStyleInBatches,
  getProgressStats,
  createCombinedProfile
};

// If run directly
if (require.main === module) {
  const command = process.argv[2] || "process";
  
  if (command === "process") {
    analyzeContentStyleInBatches()
      .then(result => {
        if (result.success) {
          console.log(result.message);
          if (!result.completed) {
            console.log("To continue processing the next batch, run this script again");
          }
        } else {
          console.error("Batch processing failed:", result.error);
        }
      })
      .catch(err => console.error("Unexpected error:", err));
  } else if (command === "stats") {
    getProgressStats()
      .then(stats => {
        console.log("=== Style Processing Progress ===");
        console.log(JSON.stringify(stats, null, 2));
      })
      .catch(err => console.error("Error getting stats:", err));
  } else if (command === "combine") {
    createCombinedProfile()
      .then(result => {
        if (result.success) {
          console.log("Combined profile created successfully");
        } else {
          console.error("Combined profile creation failed:", result.error);
        }
      })
      .catch(err => console.error("Unexpected error:", err));
  } else {
    console.log(`
SecondBrain Batch Style Analyzer - Commands:
  node process_in_batches.js process
      Process the next batch of content files
      
  node process_in_batches.js stats
      Show current processing statistics and progress
      
  node process_in_batches.js combine
      Create a combined style profile from all individual profiles
    `);
  }
}