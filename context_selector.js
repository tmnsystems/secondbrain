/**
 * SecondBrain Enhanced Context Selector
 * 
 * This module provides advanced context selection functionality:
 * 1. Semantic search for content selection
 * 2. Dynamic context size adjustment
 * 3. Content type weighting and balancing
 * 4. Quality assessment of context relevance
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
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
const EMBEDDING_MODEL = "text-embedding-3-small";
const PROCESSED_CONTENT_DIR = './processed_content';

/**
 * Main function to find relevant context for a topic
 */
async function findEnhancedContext(topic, contentType, maxItems = 5, advancedOptions = {}) {
  try {
    console.log(`Finding enhanced context for: "${topic}" (${contentType})`);
    
    // Load the content index
    const indexPath = path.join(PROCESSED_CONTENT_DIR, 'content_index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const contentIndex = JSON.parse(indexData);
    
    // Default options
    const options = {
      useEmbeddings: true,
      balanceContentTypes: true,
      includeStyleGuide: true,
      priorityBoost: {
        style_guide: 2.0,
        framework: 1.8,
        blog_posts: 1.5,
        transcript: 1.0,
        social_media: 0.7
      },
      contentTypeDistribution: {
        style_guide: 1,
        blog_posts: 2,
        transcript: 2,
        framework: 1,
        social_media: 1
      },
      ...advancedOptions
    };
    
    let selectedItems = [];
    
    // Step 1: Create embedding for the topic if using embeddings
    let topicEmbedding = null;
    if (options.useEmbeddings) {
      topicEmbedding = await createEmbedding(topic);
    }
    
    // Step 2: Initial scoring of all contents based on relevance to topic
    const scoredItems = await scoreContentItems(contentIndex, topic, topicEmbedding, contentType, options);
    
    // Step 3: Make initial selection
    if (options.includeStyleGuide) {
      const styleGuide = contentIndex.find(item => item.type === 'style_guide');
      if (styleGuide) {
        selectedItems.push({
          ...styleGuide,
          score: 1.0,
          reason: "Style guide included by default"
        });
      }
    }
    
    // Step 4: Balance content types if requested
    if (options.balanceContentTypes) {
      const remainingSlots = maxItems - selectedItems.length;
      selectedItems = [...selectedItems, ...selectBalancedItems(scoredItems, remainingSlots, options)];
    } else {
      // Otherwise just take top scored items
      const remainingItems = scoredItems
        .filter(item => !selectedItems.some(selected => selected.fileName === item.fileName))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxItems - selectedItems.length);
      
      selectedItems = [...selectedItems, ...remainingItems];
    }
    
    // Step 5: Load full content for each selected item
    const contextItems = [];
    for (const item of selectedItems) {
      try {
        const itemData = await fs.readFile(item.cachePath, 'utf-8');
        const fullItem = JSON.parse(itemData);
        contextItems.push({
          ...fullItem,
          score: item.score || 0,
          reason: item.reason || "Relevant to topic"
        });
      } catch (error) {
        console.error(`Error loading content for ${item.fileName}:`, error);
      }
    }
    
    console.log(`Selected ${contextItems.length} context items for "${topic}"`);
    return contextItems;
  } catch (error) {
    console.error("Error finding enhanced context:", error);
    return [];
  }
}

/**
 * Score content items based on relevance to the topic
 */
async function scoreContentItems(contentIndex, topic, topicEmbedding, contentType, options) {
  const scoredItems = [];
  
  for (const item of contentIndex) {
    let score = 0;
    
    // Apply priority boost based on content type
    const priorityBoost = options.priorityBoost[item.type] || 1.0;
    score += priorityBoost * 0.2;  // Base score from content type priority
    
    if (options.useEmbeddings && topicEmbedding) {
      // Load the full content to get its embedding
      try {
        const itemData = await fs.readFile(item.cachePath, 'utf-8');
        const fullItem = JSON.parse(itemData);
        
        // Get a preview for embedding (first 2000 chars)
        const contentPreview = fullItem.content.substring(0, 2000);
        const contentEmbedding = await createEmbedding(contentPreview);
        
        // Calculate cosine similarity between topic and content
        if (contentEmbedding) {
          const similarity = calculateCosineSimilarity(topicEmbedding, contentEmbedding);
          score += similarity * 0.8;  // Embedding similarity is 80% of the score
        }
      } catch (error) {
        console.error(`Error processing embeddings for ${item.fileName}:`, error);
        // Use title-based relevance as fallback
        score += calculateStringRelevance(topic, item.fileName) * 0.3;
      }
    } else {
      // Use simple string matching if not using embeddings
      score += calculateStringRelevance(topic, item.contentPreview || item.fileName) * 0.5;
    }
    
    // Adjust score based on content type match with requested content type
    // For example, SOPs are more relevant for SOP generation
    if (contentType) {
      if (contentType.toLowerCase() === 'sop' && item.type === 'sop') {
        score *= 1.2;
      } else if (contentType.toLowerCase() === 'course' && item.type === 'course') {
        score *= 1.2;
      } else if (contentType.toLowerCase() === 'article' && item.type === 'blog_posts') {
        score *= 1.2;
      }
    }
    
    scoredItems.push({
      ...item,
      score,
      reason: `Relevance score: ${score.toFixed(2)}`
    });
  }
  
  // Sort by score
  return scoredItems.sort((a, b) => b.score - a.score);
}

/**
 * Select balanced items across content types
 */
function selectBalancedItems(scoredItems, count, options) {
  const selectedItems = [];
  const distribution = { ...options.contentTypeDistribution };
  let remainingSlots = count;
  
  // First pass: select top items for each content type according to distribution
  Object.keys(distribution).forEach(type => {
    const typeItems = scoredItems
      .filter(item => item.type === type)
      .sort((a, b) => b.score - a.score);
    
    const typeCount = Math.min(distribution[type], remainingSlots, typeItems.length);
    
    if (typeCount > 0) {
      selectedItems.push(...typeItems.slice(0, typeCount));
      remainingSlots -= typeCount;
    }
  });
  
  // Second pass: fill remaining slots with top scored items
  if (remainingSlots > 0) {
    const remainingItems = scoredItems
      .filter(item => !selectedItems.some(selected => selected.fileName === item.fileName))
      .sort((a, b) => b.score - a.score)
      .slice(0, remainingSlots);
    
    selectedItems.push(...remainingItems);
  }
  
  return selectedItems;
}

/**
 * Create embedding for a text using OpenAI
 */
async function createEmbedding(text) {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error("Error creating embedding:", error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
function calculateCosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate simple string relevance
 */
function calculateStringRelevance(topic, text) {
  if (!topic || !text) return 0;
  
  // Convert to lowercase for comparison
  const lowerTopic = topic.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Split into words
  const topicWords = lowerTopic.split(/\s+/).filter(word => word.length > 3);
  
  // Count occurrences of topic words in text
  let matchCount = 0;
  topicWords.forEach(word => {
    if (lowerText.includes(word)) {
      matchCount++;
    }
  });
  
  // Calculate score based on proportion of matched words
  return topicWords.length > 0 ? matchCount / topicWords.length : 0;
}

// Export the functions
module.exports = {
  findEnhancedContext
};

// If run directly
if (require.main === module) {
  const topic = process.argv[2] || "business systems for service businesses";
  const contentType = process.argv[3] || "article";
  const maxItems = parseInt(process.argv[4] || "5");
  
  findEnhancedContext(topic, contentType, maxItems)
    .then(context => {
      console.log(`Found ${context.length} context items for "${topic}":`);
      context.forEach(item => {
        console.log(`- ${item.fileName} (${item.type}): Score ${item.score.toFixed(2)}, ${item.reason}`);
      });
    })
    .catch(err => console.error("Error:", err));
}