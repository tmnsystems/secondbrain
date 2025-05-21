/**
 * Vector store service for SecondBrain project
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { Document, VectorStoreProvider } from '../types';
import { Logger } from './logger';

export class PineconeProvider implements VectorStoreProvider {
  private client: Pinecone;
  private index: any; // Type would be more specific in real implementation
  private namespace: string;
  private logger: Logger;

  constructor(apiKey: string, environment: string, indexName: string, namespace = '') {
    this.client = new Pinecone({ apiKey, environment });
    this.index = this.client.index(indexName);
    this.namespace = namespace;
    this.logger = new Logger('PineconeProvider');
  }

  async addDocuments(documents: Document[]): Promise<void> {
    try {
      this.logger.debug(`Adding ${documents.length} documents to Pinecone`);
      
      const vectors = documents.map(doc => ({
        id: doc.id,
        values: doc.embedding || [],
        metadata: doc.metadata
      }));

      // Pinecone operations might need adjustments based on the latest API
      await this.index.upsert({
        vectors,
        namespace: this.namespace
      });
      
      this.logger.info(`Successfully added ${documents.length} documents to Pinecone`);
    } catch (error) {
      this.logger.error('Error adding documents to Pinecone:', error);
      throw error;
    }
  }

  async search(query: string, limit = 10): Promise<Document[]> {
    try {
      this.logger.debug(`Searching Pinecone for: ${query}`);
      
      // This is a simplified example - in a real implementation,
      // you would first convert the query to an embedding before searching
      
      const results = await this.index.query({
        vector: [], // This would be the embedding vector for the query
        topK: limit,
        includeMetadata: true,
        namespace: this.namespace
      });

      return results.matches.map(match => ({
        id: match.id,
        content: match.metadata.content || '',
        metadata: match.metadata
      }));
    } catch (error) {
      this.logger.error('Error searching Pinecone:', error);
      throw error;
    }
  }

  async delete(ids: string[]): Promise<void> {
    try {
      this.logger.debug(`Deleting ${ids.length} documents from Pinecone`);
      
      await this.index.delete({
        ids,
        namespace: this.namespace
      });
      
      this.logger.info(`Successfully deleted ${ids.length} documents from Pinecone`);
    } catch (error) {
      this.logger.error('Error deleting documents from Pinecone:', error);
      throw error;
    }
  }
}

// Factory for creating the appropriate vector store provider
export class VectorStoreService {
  static createProvider(
    type: string, 
    apiKey: string, 
    environment: string, 
    indexName: string, 
    namespace = ''
  ): VectorStoreProvider {
    switch (type.toLowerCase()) {
      case 'pinecone':
        return new PineconeProvider(apiKey, environment, indexName, namespace);
      default:
        throw new Error(`Unsupported vector store provider: ${type}`);
    }
  }
}