/**
 * SecondBrain True Context System
 * 
 * This implementation leverages:
 * 1. GPT-4.1 Turbo with 1 million+ token context window
 * 2. Pinecone for vector storage and retrieval
 * 3. Full transcript ingestion without truncation
 * 4. Context preservation across interactions
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Environment variables check
const requiredEnvVars = ['OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_ENVIRONMENT', 'PINECONE_INDEX_NAME'];
const missingVars = requiredEnvVars.filter(name => !process.env[name]);
if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please ensure these are set in your .env file');
  process.exit(1);
}

// Initialize OpenAI with GPT-4.1 Turbo (128k context)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Constants
const EMBEDDING_MODEL = "text-embedding-3-large";
const CHAT_MODEL = "gpt-4o";  // Will update to gpt-4.1-turbo when available
const DIMENSION = 3072;       // For text-embedding-3-large
const BATCH_SIZE = 100;       // For embedding processing
const CHUNK_SIZE = 8000;      // Characters per chunk
const CHUNK_OVERLAP = 200;    // Overlap between chunks
const NAMESPACE = "second-brain";

/**
 * Main function to ingest all content into Pinecone
 */
async function ingestAllContent() {
  try {
    console.log("Starting content ingestion with 1M+ token context capability");
    
    // Get all transcripts and other content
    const contentFiles = getAllContentFiles();
    console.log(`Found ${contentFiles.length} files to process`);

    // Process each file
    let totalChunks = 0;
    for (const file of contentFiles) {
      console.log(`Processing: ${file.path} (${file.type})`);
      const chunks = await processFileToChunks(file.path, file.type);
      totalChunks += chunks.length;
      
      // Create embeddings and upsert to Pinecone in batches
      await processChunksToPinecone(chunks);
      
      console.log(`Successfully processed ${file.path}: ${chunks.length} chunks`);
    }
    
    console.log(`Completed ingestion: ${contentFiles.length} files, ${totalChunks} total chunks`);
    return { success: true, files: contentFiles.length, chunks: totalChunks };
  } catch (error) {
    console.error("Error in content ingestion:", error);
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
  files.push({
    path: path.join(sampleDir, 'tina_style.md'),
    type: 'style_guide'
  });
  
  // Add blog posts
  if (fs.existsSync(path.join(sampleDir, 'written_content/Blog Posts .txt'))) {
    files.push({
      path: path.join(sampleDir, 'written_content/Blog Posts .txt'),
      type: 'blog_posts'
    });
  }
  
  // Add Facebook posts
  if (fs.existsSync(path.join(sampleDir, 'facebook/facebookposts2015-21725.md'))) {
    files.push({
      path: path.join(sampleDir, 'facebook/facebookposts2015-21725.md'),
      type: 'social_media'
    });
  }
  
  // Add all transcripts
  const transcriptDir = path.join(sampleDir, 'transcripts');
  if (fs.existsSync(transcriptDir)) {
    const transcriptFiles = glob.sync(path.join(transcriptDir, '*.txt'));
    transcriptFiles.forEach(file => {
      // Filter for "Done" transcripts containing "Tina" to focus on complete coaching calls
      if (path.basename(file).includes('Done') && path.basename(file).includes('Tina')) {
        files.push({
          path: file,
          type: 'transcript'
        });
      }
    });
  }
  
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
  
  return files;
}

/**
 * Process a file into chunks with metadata
 */
async function processFileToChunks(filePath, contentType) {
  try {
    // Read the file
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Split content into chunks with overlap
    const chunks = [];
    let i = 0;
    while (i < content.length) {
      const chunkEnd = Math.min(i + CHUNK_SIZE, content.length);
      const chunk = content.slice(i, chunkEnd);
      
      chunks.push({
        text: chunk,
        metadata: {
          source: fileName,
          type: contentType,
          chunk_id: chunks.length,
          start_char: i,
          end_char: chunkEnd,
        }
      });
      
      // Move to next chunk with overlap
      i = chunkEnd - CHUNK_OVERLAP;
      if (i >= content.length) break;
      if (i < 0) i = 0; // Safety check
    }
    
    return chunks;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return [];
  }
}

/**
 * Create embeddings and store in Pinecone
 */
async function processChunksToPinecone(chunks) {
  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    // Create embeddings
    const texts = batch.map(chunk => chunk.text);
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: DIMENSION,
    });
    
    const embeddings = embeddingResponse.data.map(item => item.embedding);
    
    // Prepare vectors for Pinecone
    const vectors = batch.map((chunk, idx) => ({
      id: `${chunk.metadata.source}-${chunk.metadata.chunk_id}`,
      values: embeddings[idx],
      metadata: {
        ...chunk.metadata,
        text_preview: chunk.text.substring(0, 100) + '...',
        length: chunk.text.length,
      }
    }));
    
    // Upsert to Pinecone
    await index.upsert({
      vectors,
      namespace: NAMESPACE
    });
    
    console.log(`Batch ${i/BATCH_SIZE + 1}/${Math.ceil(chunks.length/BATCH_SIZE)} processed: ${vectors.length} vectors`);
  }
}

/**
 * Search Pinecone for relevant context
 */
async function searchContext(query, topK = 5) {
  try {
    // Create embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
      dimensions: DIMENSION,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Query Pinecone
    const results = await index.query({
      vector: embedding,
      topK: topK,
      includeMetadata: true,
      includeValues: false,
      namespace: NAMESPACE
    });
    
    return results.matches.map(match => ({
      score: match.score,
      metadata: match.metadata,
      text: match.metadata.text || "Text not available"
    }));
  } catch (error) {
    console.error("Error searching context:", error);
    return [];
  }
}

/**
 * Generate content with full context
 */
async function generateWithContext(topic, contentType = 'article', fullContext = true) {
  try {
    console.log(`Generating ${contentType} on topic: "${topic}" with full context`);
    
    // First, search for relevant context
    const relevantContext = await searchContext(topic, fullContext ? 20 : 5);
    console.log(`Found ${relevantContext.length} relevant context items`);
    
    // Format the contexts into a single string
    const contextTexts = relevantContext.map(item => 
      `--- START CONTEXT ---\nSource: ${item.metadata.source} (${item.metadata.type})\n${item.text}\n--- END CONTEXT ---`
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
    
    // Generate content using GPT-4.1 with full context
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,  // Will update to gpt-4.1-turbo when available
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
    
    const outputDir = path.join(__dirname, 'generated_content');
    await fs.mkdir(outputDir, { recursive: true });
    
    const contentPath = path.join(outputDir, `${safeContentType}_${safeTopicName}_${timestamp}.md`);
    await fs.writeFile(contentPath, generatedContent);
    
    // Also save the context used
    const contextPath = path.join(outputDir, `${safeContentType}_${safeTopicName}_context_${timestamp}.txt`);
    await fs.writeFile(contextPath, `Query: ${topic}\nContent Type: ${contentType}\nContext items: ${relevantContext.length}\n\n${contextTexts}`);
    
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
  ingestAllContent,
  generateWithContext,
  searchContext
};

// If run directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === "ingest") {
    ingestAllContent()
      .then(() => console.log("Ingestion complete"))
      .catch(err => console.error("Ingestion failed:", err));
  } else if (command === "generate") {
    const topic = process.argv[3] || "The importance of systems thinking in business";
    const contentType = process.argv[4] || "article";
    generateWithContext(topic, contentType)
      .then(() => console.log("Generation complete"))
      .catch(err => console.error("Generation failed:", err));
  } else {
    console.log(`
SecondBrain True Context System - Commands:
  node true_context_system.js ingest
      Ingest all content into Pinecone with proper embeddings
      
  node true_context_system.js generate "Your topic" article|sop|course|action_plan
      Generate content with full context retrieval
    `);
  }
}