/**
 * SecondBrain Local Context System
 * 
 * This implementation leverages:
 * 1. GPT-4o with large context window
 * 2. Local file processing without requiring external vector store
 * 3. Full transcript processing
 * 4. Context preservation across interactions
 */

require('dotenv').config();
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const glob = require('glob');
const { OpenAI } = require('openai');

// Environment variables check
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: Missing OPENAI_API_KEY in environment variables');
  console.error('Please ensure this is set in your .env file');
  process.exit(1);
}

// Initialize OpenAI with GPT-4o
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants
const CHAT_MODEL = "gpt-4o";
const MAX_CONTENT_LENGTH = 100000; // Characters per content chunk
const OUTPUT_DIR = './generated_content';
const CACHE_DIR = './processed_content';

/**
 * Process all content and create an index
 * Uses incremental processing to only process new or modified files
 */
async function processAllContent(forceReprocess = false) {
  try {
    console.log("Starting content processing...");
    
    // Import the process tracker
    const processTracker = require('./process_tracker');
    
    // Create cache directory if it doesn't exist
    await fsPromises.mkdir(CACHE_DIR, { recursive: true });
    
    // Get all content files
    const allContentFiles = getAllContentFiles();
    console.log(`Found ${allContentFiles.length} total files`);
    
    // Determine which files need processing (new or modified)
    let filesToProcess;
    if (forceReprocess) {
      console.log("Force reprocessing all files");
      filesToProcess = allContentFiles.map(file => ({
        ...file,
        is_new: true
      }));
    } else {
      filesToProcess = await processTracker.getFilesToProcess(allContentFiles);
      console.log(`Found ${filesToProcess.length} new or modified files to process`);
    }
    
    // Get processing stats
    const stats = await processTracker.getProcessingStats();
    if (stats.last_process_time) {
      console.log(`Last processing run: ${stats.last_process_time.toISOString()}`);
      console.log(`Previously processed ${stats.total_files} files`);
    } else {
      console.log("This is the first processing run");
    }

    // Process each file
    let processedCount = 0;
    const processedFiles = [];
    
    for (const file of filesToProcess) {
      console.log(`Processing: ${file.path} (${file.type}) - ${file.is_new ? "New file" : "Modified file"}`);
      
      // Generate a cache file name
      const cacheFileName = path.basename(file.path)
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase() + '.json';
      const cachePath = path.join(CACHE_DIR, cacheFileName);
      
      // Always process the file for new or modified content
      // For modified files, we update the cache
      const content = await fsPromises.readFile(file.path, 'utf-8');
      
      // Truncate if necessary
      const truncatedContent = content.length > MAX_CONTENT_LENGTH 
        ? content.slice(0, MAX_CONTENT_LENGTH)
        : content;
      
      const processedContent = {
        fileName: path.basename(file.path),
        filePath: file.path,
        type: file.type,
        priority: getPriorityForType(file.type),
        content: truncatedContent,
        contentPreview: truncatedContent.substring(0, 200) + '...',
        processedAt: new Date().toISOString()
      };
      
      // Save to cache
      await fsPromises.writeFile(cachePath, JSON.stringify(processedContent));
      console.log(`Cached processed content to ${cachePath}`);
      
      // Record for tracker
      processedFiles.push({
        ...file,
        cachePath
      });
      
      processedCount++;
    }
    
    // If no new or modified files, we still need to build the content index
    console.log("Building content index...");
    
    // Create the full content index from all cache files
    const contentIndex = [];
    const cacheFiles = await fsPromises.readdir(CACHE_DIR);
    
    for (const cacheFile of cacheFiles) {
      if (cacheFile.endsWith('.json') && cacheFile !== 'content_index.json' && !cacheFile.includes('process_tracker')) {
        try {
          const cachePath = path.join(CACHE_DIR, cacheFile);
          const cacheData = await fsPromises.readFile(cachePath, 'utf-8');
          const processedContent = JSON.parse(cacheData);
          
          contentIndex.push({
            fileName: processedContent.fileName,
            filePath: processedContent.filePath,
            type: processedContent.type,
            priority: processedContent.priority,
            contentPreview: processedContent.contentPreview,
            cachePath,
            processedAt: processedContent.processedAt || new Date().toISOString()
          });
        } catch (error) {
          console.error(`Error loading cache file ${cacheFile}:`, error);
        }
      }
    }
    
    // Sort by most recently processed first
    contentIndex.sort((a, b) => {
      const dateA = new Date(a.processedAt || 0);
      const dateB = new Date(b.processedAt || 0);
      return dateB - dateA;
    });
    
    // Save the content index
    const indexPath = path.join(CACHE_DIR, 'content_index.json');
    await fsPromises.writeFile(indexPath, JSON.stringify(contentIndex, null, 2));
    
    // Record processed files in the tracker
    await processTracker.recordProcessedFiles(processedFiles);
    
    // Get updated stats
    const updatedStats = await processTracker.getProcessingStats();
    console.log(`Total processed files: ${updatedStats.total_files}`);
    console.log(`Type breakdown: ${JSON.stringify(updatedStats.type_breakdown)}`);
    
    console.log(`Completed processing: ${processedCount} files (${filesToProcess.length - processedCount} skipped)`);
    return { 
      success: true, 
      files: processedCount, 
      totalFiles: updatedStats.total_files,
      indexPath,
      newOrModified: filesToProcess.length
    };
  } catch (error) {
    console.error("Error in content processing:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all content files with their types
 */
function getAllContentFiles() {
  const files = [];
  
  // Primary content source: the writing_samples directory
  const sampleDir = path.join(__dirname, 'apps/ai-writing-system/writing_samples');
  
  // Add style guide
  const styleGuidePath = path.join(sampleDir, 'tina_style.md');
  if (fs.existsSync(styleGuidePath)) {
    files.push({
      path: styleGuidePath,
      type: 'style_guide'
    });
  }
  
  // Add blog posts
  const blogPostsPath = path.join(sampleDir, 'written_content/Blog Posts .txt');
  if (fs.existsSync(blogPostsPath)) {
    files.push({
      path: blogPostsPath,
      type: 'blog_posts'
    });
  }
  
  // Add Facebook posts
  const facebookPostsPath = path.join(sampleDir, 'facebook/facebookposts2015-21725.md');
  if (fs.existsSync(facebookPostsPath)) {
    files.push({
      path: facebookPostsPath,
      type: 'social_media'
    });
  }
  
  // Add ALL transcripts (including Done ones with Tina)
  const transcriptDir = path.join(sampleDir, 'transcripts');
  if (fs.existsSync(transcriptDir)) {
    const transcriptFiles = glob.sync(path.join(transcriptDir, '*.txt'));
    console.log(`Found ${transcriptFiles.length} total transcript files`);
    transcriptFiles.forEach(file => {
      // Check if it's a "Done" transcript
      const fileName = path.basename(file);
      const isDoneTranscript = fileName.includes('Done');
      
      files.push({
        path: file,
        // All files in the transcripts directory are transcripts, regardless of "Done" status
        type: 'transcript'
      });
    });
  }
  
  // Add ALL written content
  const writtenContentDir = path.join(sampleDir, 'written_content');
  if (fs.existsSync(writtenContentDir)) {
    const writtenFiles = glob.sync(path.join(writtenContentDir, '**/*.*'));
    console.log(`Found ${writtenFiles.length} written content files`);
    writtenFiles.forEach(file => {
      // Skip already added Blog Posts file
      if (file === blogPostsPath) return;
      
      files.push({
        path: file,
        type: 'written_content'
      });
    });
  }
  
  // Also search all other potential dirs
  ['facebook', 'marketing', 'prologue.md'].forEach(subPath => {
    const dirPath = path.join(sampleDir, subPath);
    if (fs.existsSync(dirPath)) {
      let pattern = '**/*.*';
      if (subPath.includes('.')) pattern = subPath;
      
      const contentFiles = glob.sync(path.join(sampleDir, pattern));
      contentFiles.forEach(file => {
        // Skip already added files
        if (file === facebookPostsPath || file === styleGuidePath) return;
        
        // Skip files in the transcripts directory, as they're already added with transcript type
        if (file.includes('/transcripts/')) {
          return;
        }
        
        // Determine file type properly
        let type = 'other';
        
        // Check path and filename for accurate typing
        const fileName = path.basename(file).toLowerCase();
        
        if (subPath === 'facebook' || file.includes('facebook')) {
          type = 'social_media';
        } else if (subPath === 'marketing' || file.includes('marketing')) {
          type = 'marketing';
        } else if (fileName.includes('transcript')) {
          type = 'transcript';
        } else if (file.includes('.md') || subPath.includes('.md')) {
          type = 'written_content';
        }
        
        files.push({
          path: file,
          type
        });
      });
    }
  });
  
  // Add any uploads if they exist
  const uploadsDir = path.join(__dirname, 'uploads/content');
  if (fs.existsSync(uploadsDir)) {
    const uploadFiles = glob.sync(path.join(uploadsDir, '**/*.*'));
    uploadFiles.forEach(file => {
      // Determine content type from directory or extension
      let type = 'other';
      if (file.includes('transcript')) type = 'transcript';
      else if (file.includes('blog')) type = 'blog_posts';
      else if (file.includes('framework')) type = 'framework';
      else if (file.includes('sop')) type = 'sop';
      else if (file.includes('course')) type = 'course';
      else if (file.includes('social')) type = 'social_media';
      else {
        // Determine by file extension if not in a typed directory
        const ext = path.extname(file).toLowerCase();
        if (ext === '.md') type = 'blog_posts';
        else if (ext === '.txt') type = 'transcript';
        else if (ext === '.json') type = 'structured_data';
      }
      
      files.push({ path: file, type });
    });
  }
  
  console.log(`Total files to process: ${files.length}`);
  return files;
}

/**
 * Get priority based on content type
 */
function getPriorityForType(type) {
  const priorities = {
    'style_guide': 'very_high',
    'framework': 'very_high',
    'sop': 'high',
    'blog_posts': 'high',
    'course': 'high',
    'transcript': 'medium',
    'social_media': 'low',
    'other': 'low'
  };
  
  return priorities[type] || 'medium';
}

/**
 * Find relevant context for a topic
 */
async function findRelevantContext(topic, maxItems = 5, contentType = 'article') {
  try {
    // Check if enhanced context selector is available
    let contextSelector;
    try {
      contextSelector = require('./context_selector');
      console.log("Using enhanced context selection algorithm");
      
      // Use the enhanced context selector
      return await contextSelector.findEnhancedContext(topic, contentType, maxItems);
    } catch (err) {
      console.log("Enhanced context selector not available, using basic algorithm");
      
      // Fallback to basic context selection
      // Load the content index
      const indexPath = path.join(CACHE_DIR, 'content_index.json');
      const indexData = await fsPromises.readFile(indexPath, 'utf-8');
      const contentIndex = JSON.parse(indexData);
      
      // Sort by priority first
      const priorityOrder = { 'very_high': 0, 'high': 1, 'medium': 2, 'low': 3 };
      contentIndex.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      // Select the top items by priority plus type distribution
      let selectedItems = [];
      
      // Always include style guide
      const styleGuide = contentIndex.find(item => item.type === 'style_guide');
      if (styleGuide) {
        selectedItems.push(styleGuide);
      }
      
      // Add some items from each content type, prioritizing higher priority items
      const types = ['blog_posts', 'transcript', 'framework', 'sop', 'course'];
      for (const type of types) {
        const typeItems = contentIndex.filter(item => item.type === type);
        if (typeItems.length > 0) {
          // Add up to 2 items of each type
          selectedItems = [...selectedItems, ...typeItems.slice(0, 2)];
        }
      }
      
      // Limit to max items
      selectedItems = selectedItems.slice(0, maxItems);
      
      // Load full content for each selected item
      const contextItems = [];
      for (const item of selectedItems) {
        try {
          const itemData = await fsPromises.readFile(item.cachePath, 'utf-8');
          const fullItem = JSON.parse(itemData);
          contextItems.push(fullItem);
        } catch (error) {
          console.error(`Error loading content for ${item.fileName}:`, error);
        }
      }
      
      return contextItems;
    }
  } catch (error) {
    console.error("Error finding relevant context:", error);
    return [];
  }
}

/**
 * Generate content with context
 */
async function generateWithContext(topic, contentType = 'article') {
  try {
    console.log(`Generating ${contentType} on topic: "${topic}" with context`);
    
    // Ensure output directory exists
    await fsPromises.mkdir(OUTPUT_DIR, { recursive: true });
    
    // First, get relevant context
    const relevantContext = await findRelevantContext(topic, 5, contentType);
    console.log(`Found ${relevantContext.length} relevant context items`);
    
    // Format the contexts into a single string
    const contextTexts = relevantContext.map(item => 
      `--- START CONTEXT (${item.type}) ---\nFrom: ${item.fileName}\n${item.content}\n--- END CONTEXT ---`
    ).join('\n\n');
    
    // Create content generation prompt based on type
    let systemPrompt, userPrompt;
    
    switch (contentType.toLowerCase()) {
      case 'sop':
        systemPrompt = `You are Tina Marie Hilton's AI assistant, tasked with creating standard operating procedures in her exact style. Use the provided context to match her tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Create a comprehensive SOP on "${topic}" that sounds exactly like Tina wrote it.
        
The SOP should:
- Be clear enough for a 10-year-old to understand
- Include specific, actionable steps
- Explain the rationale behind each step
- Use Tina's signature metaphors and teaching style
- Follow her value hierarchy and decision frameworks

I've provided extensive context from Tina's writing and speaking to ensure you can match her style perfectly. Use this context to inform how you structure and phrase the SOP.`;
        break;
        
      case 'course':
        systemPrompt = `You are Tina Marie Hilton's AI assistant, tasked with creating course outlines in her exact style. Use the provided context to match her tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Create a detailed course outline on "${topic}" that sounds exactly like Tina designed it.

The course outline should include:
- A compelling course title and subtitle
- 5-7 modules with clear objectives
- Key lessons for each module
- Learning outcomes and action steps
- Tina's signature teaching approaches

I've provided extensive context from Tina's writing and speaking to ensure you can match her course design style perfectly. Use this context to inform how you structure and phrase the course outline.`;
        break;
        
      case 'action_plan':
        systemPrompt = `You are Tina Marie Hilton's AI assistant, tasked with creating action plans in her exact style. Use the provided context to match her tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Create a comprehensive action plan for "${topic}" that sounds exactly like Tina created it.

The action plan should include:
- Clear, sequenced steps
- Rationales for each step
- Implementation guidance
- Success metrics
- Troubleshooting tips

I've provided extensive context from Tina's writing and speaking to ensure you can match her strategic approach perfectly. Use this context to inform how you structure and phrase the action plan.`;
        break;
        
      case 'article':
      default:
        systemPrompt = `You are Tina Marie Hilton's AI assistant, tasked with writing articles in her exact style. Use the provided context to match her tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Write an article on "${topic}" that sounds exactly like Tina wrote it.

The article should:
- Use her unique voice, tone, and rhythm
- Include her characteristic metaphors and analogies
- Follow her reasoning frameworks and teaching approach
- Reflect her values and decision-making style
- Be structured in her typical pattern

I've provided extensive context from Tina's writing and speaking to ensure you can match her style perfectly. Use this context to inform how you write the article.`;
        break;
    }
    
    // Generate content using GPT-4o with context
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `${userPrompt}\n\nHere is the context from Tina's writing and speaking:\n\n${contextTexts}` 
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const generatedContent = response.choices[0].message.content;
    
    // Save the generated content
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopicName = topic.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
    const safeContentType = contentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const contentPath = path.join(OUTPUT_DIR, `${safeContentType}_${safeTopicName}_${timestamp}.md`);
    await fsPromises.writeFile(contentPath, generatedContent);
    
    // Also save the context used
    const contextPath = path.join(OUTPUT_DIR, `${safeContentType}_${safeTopicName}_context_${timestamp}.txt`);
    await fsPromises.writeFile(contextPath, `Query: ${topic}\nContent Type: ${contentType}\nContext items: ${relevantContext.length}\n\n${contextTexts}`);
    
    console.log(`Content saved to: ${contentPath}`);
    console.log(`Context saved to: ${contextPath}`);
    
    return {
      success: true,
      content: generatedContent,
      contentPath,
      contextPath,
      contextItems: relevantContext.length
    };
  } catch (error) {
    console.error("Error generating with context:", error);
    return { success: false, error: error.message };
  }
}

// Export the functions
module.exports = {
  processAllContent,
  generateWithContext
};

// If run directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === "process") {
    processAllContent(false) // only process new or modified files
      .then(() => console.log("Processing complete"))
      .catch(err => console.error("Processing failed:", err));
  } else if (command === "process-force") {
    processAllContent(true) // force reprocessing of all files
      .then(() => console.log("Force processing complete"))
      .catch(err => console.error("Processing failed:", err));
  } else if (command === "generate") {
    const topic = process.argv[3] || "The importance of systems thinking in business";
    const contentType = process.argv[4] || "article";
    generateWithContext(topic, contentType)
      .then(() => console.log("Generation complete"))
      .catch(err => console.error("Generation failed:", err));
  } else {
    console.log(`
SecondBrain Local Context System - Commands:
  node local_context_system.js process
      Process only new or modified content files and update the index
      
  node local_context_system.js process-force
      Force reprocessing of ALL content files, even if unchanged
      
  node local_context_system.js generate "Your topic" article|sop|course|action_plan
      Generate content with context retrieval
    `);
  }
}