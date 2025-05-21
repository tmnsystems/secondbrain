/**
 * Context Catalog Integration with SecondBrain Context System
 * 
 * This script demonstrates the integration between the Context Catalog
 * and the existing Three-Layer Context Persistence architecture.
 */

// Import dependencies
const { Pool } = require('pg');
const Redis = require('ioredis');
const { PineconeClient } = require('@pinecone-database/pinecone');
const { Client: NotionClient } = require('@notionhq/client');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Initialize persistence clients
const postgresPool = new Pool({
  connectionString: process.env.POSTGRES_URI
});

const redisClient = new Redis(process.env.REDIS_URI);

const pineconeClient = new PineconeClient();
pineconeClient.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT
});

const notionClient = new NotionClient({
  auth: process.env.NOTION_API_KEY
});

/**
 * Class that demonstrates the integration between Context Catalog
 * and the Three-Layer Context Persistence system
 */
class ContextSystemIntegration {
  constructor() {
    this.postgres = postgresPool;
    this.redis = redisClient;
    this.pinecone = pineconeClient;
    this.notion = notionClient;
  }

  /**
   * Integrate catalog data with context persistence
   */
  async integrateWithContextSystem(filePath) {
    console.log(`Integrating catalog with context system for: ${filePath}`);

    // Step 1: Retrieve catalog metadata from PostgreSQL
    const fileMetadata = await this.getCatalogMetadata(filePath);
    if (!fileMetadata) {
      throw new Error(`File not found in catalog: ${filePath}`);
    }

    // Step 2: Get existing context from Redis (if available)
    const existingContext = await this.getExistingContext(filePath);

    // Step 3: Get semantic embeddings from Pinecone
    const semanticEmbeddings = await this.getSemanticEmbeddings(filePath);

    // Step 4: Integrate catalog metadata with context
    const enhancedContext = this.enhanceContextWithCatalog(
      existingContext, 
      fileMetadata, 
      semanticEmbeddings
    );

    // Step 5: Store enhanced context back to persistence layers
    await this.storeEnhancedContext(filePath, enhancedContext);

    // Step 6: Update Notion with context information
    await this.updateNotionWithContext(filePath, enhancedContext);

    return enhancedContext;
  }

  /**
   * Retrieve catalog metadata from PostgreSQL
   */
  async getCatalogMetadata(filePath) {
    const query = `
      SELECT f.*, m.* 
      FROM files f
      JOIN file_metadata m ON f.id = m.file_id
      WHERE f.file_path = $1
    `;

    const result = await this.postgres.query(query, [filePath]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get existing context from Redis (if available)
   */
  async getExistingContext(filePath) {
    const filePathHash = this.hashPath(filePath);
    const contextKey = `context:${filePathHash}`;
    
    const existingContext = await this.redis.get(contextKey);
    
    if (!existingContext) {
      return null;
    }
    
    return JSON.parse(existingContext);
  }

  /**
   * Get semantic embeddings from Pinecone
   */
  async getSemanticEmbeddings(filePath) {
    const filePathHash = this.hashPath(filePath);
    const index = await this.pinecone.Index("secondbrain");
    
    try {
      const queryResponse = await index.fetch({
        ids: [filePathHash]
      });
      
      if (Object.keys(queryResponse.vectors).length === 0) {
        return null;
      }
      
      return queryResponse.vectors[filePathHash];
    } catch (error) {
      console.error(`Error fetching embeddings for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Integrate catalog metadata with context
   */
  enhanceContextWithCatalog(existingContext, fileMetadata, semanticEmbeddings) {
    // Start with existing context if available, or create new
    const enhancedContext = existingContext || {
      filePath: fileMetadata.file_path,
      content: null,
      metadata: {}
    };
    
    // Add catalog metadata
    enhancedContext.metadata.catalogInfo = {
      project: fileMetadata.project,
      status: fileMetadata.status,
      strategicRelevance: fileMetadata.strategic_relevance,
      businessAlignment: fileMetadata.business_alignment,
      claudeIntegration: fileMetadata.claude_integration,
      implementationQuality: fileMetadata.implementation_quality,
      lastAnalyzed: fileMetadata.last_analyzed
    };
    
    // Add embedding information if available
    if (semanticEmbeddings) {
      enhancedContext.metadata.semanticInfo = {
        embedding: semanticEmbeddings.values,
        // Extract relevant metadata from semanticEmbeddings
        similarConcepts: semanticEmbeddings.metadata?.similarConcepts || []
      };
    }
    
    // Add file relationship information
    enhancedContext.metadata.relationships = {
      imports: [], // Will be populated from database
      importedBy: [], // Will be populated from database
      conceptualLinks: [] // Will be populated from database
    };
    
    return enhancedContext;
  }

  /**
   * Store enhanced context back to persistence layers
   */
  async storeEnhancedContext(filePath, enhancedContext) {
    const filePathHash = this.hashPath(filePath);
    
    // Store in Redis (short-term)
    const contextKey = `context:${filePathHash}`;
    await this.redis.set(
      contextKey, 
      JSON.stringify(enhancedContext),
      'EX', 
      86400 // 24 hours
    );
    
    console.log(`Stored enhanced context in Redis: ${contextKey}`);
    
    // Store in PostgreSQL (medium-term)
    // This would typically be handled by a more complex schema
    // Here we're just demonstrating the concept
    const query = `
      INSERT INTO context_entries (
        file_path, 
        context_data, 
        created_at
      ) VALUES ($1, $2, NOW())
      ON CONFLICT (file_path) DO UPDATE 
      SET context_data = $2, updated_at = NOW()
    `;
    
    await this.postgres.query(query, [
      filePath, 
      JSON.stringify(enhancedContext)
    ]);
    
    console.log(`Stored enhanced context in PostgreSQL for: ${filePath}`);
    
    // Store in Pinecone is handled separately through the catalog process
    
    return true;
  }

  /**
   * Update Notion with context information
   */
  async updateNotionWithContext(filePath, enhancedContext) {
    // Find existing entry in Notion
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_CATALOG_DB_ID,
      filter: {
        property: 'Path',
        rich_text: {
          equals: filePath
        }
      }
    });
    
    if (response.results.length === 0) {
      console.error(`No Notion entry found for ${filePath}`);
      return false;
    }
    
    const pageId = response.results[0].id;
    
    // Update the entry with context information
    await this.notion.pages.update({
      page_id: pageId,
      properties: {
        'Context Status': {
          select: {
            name: 'Integrated'
          }
        }
      }
    });
    
    // Add a comment with context details
    await this.notion.comments.create({
      parent: {
        page_id: pageId
      },
      rich_text: [
        {
          text: {
            content: `Context integrated on ${new Date().toISOString()}\n\n` +
                    `Strategic Relevance: ${enhancedContext.metadata.catalogInfo.strategicRelevance}\n` +
                    `Business Alignment: ${enhancedContext.metadata.catalogInfo.businessAlignment}\n` +
                    `Claude Integration: ${enhancedContext.metadata.catalogInfo.claudeIntegration || 'None'}`
          }
        }
      ]
    });
    
    console.log(`Updated Notion entry for ${filePath}`);
    
    return true;
  }

  /**
   * Simple hash function for file paths
   */
  hashPath(filePath) {
    // In a real implementation, use a proper hash function
    return Buffer.from(filePath).toString('base64');
  }
}

/**
 * Main function to demonstrate integration
 */
async function main() {
  try {
    const integration = new ContextSystemIntegration();
    
    // Example usage - integrate a file
    const filePath = process.argv[2] || '/Volumes/Envoy/SecondBrain/CLAUDE.md';
    
    console.log(`Demonstrating context catalog integration with: ${filePath}`);
    
    const enhancedContext = await integration.integrateWithContextSystem(filePath);
    
    console.log('Integration successful!');
    console.log('Enhanced context:', JSON.stringify(enhancedContext, null, 2).substring(0, 500) + '...');
    
    // Clean up connections
    await postgresPool.end();
    await redisClient.quit();
    
  } catch (error) {
    console.error('Error in integration demo:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ContextSystemIntegration;