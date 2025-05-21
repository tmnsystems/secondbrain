/**
 * Database Operations
 * 
 * Handles creating, retrieving, updating, and querying Notion databases.
 */

import { Client } from '@notionhq/client';
import { handleApiError } from './utils';

/**
 * Create a new database
 */
export async function createDatabase(client: Client, params: any) {
  try {
    const response = await client.databases.create(params);
    return response;
  } catch (error) {
    return handleApiError(error, 'Failed to create database');
  }
}

/**
 * Retrieve a database by ID
 */
export async function getDatabase(client: Client, databaseId: string) {
  try {
    const response = await client.databases.retrieve({
      database_id: databaseId
    });
    
    return response;
  } catch (error) {
    return handleApiError(error, `Failed to retrieve database: ${databaseId}`);
  }
}

/**
 * Update a database's properties
 */
export async function updateDatabase(client: Client, databaseId: string, params: any) {
  try {
    const response = await client.databases.update({
      database_id: databaseId,
      ...params
    });
    
    return response;
  } catch (error) {
    return handleApiError(error, `Failed to update database: ${databaseId}`);
  }
}

/**
 * Query a database with filters, sorts, etc.
 */
export async function queryDatabase(client: Client, databaseId: string, query: any) {
  try {
    // Initial query
    const response = await client.databases.query({
      database_id: databaseId,
      ...query
    });
    
    let results = response.results;
    let hasMore = response.has_more;
    let nextCursor = response.next_cursor;
    
    // If there are more results, fetch them
    while (hasMore && nextCursor) {
      const nextResponse = await client.databases.query({
        database_id: databaseId,
        ...query,
        start_cursor: nextCursor
      });
      
      results = [...results, ...nextResponse.results];
      hasMore = nextResponse.has_more;
      nextCursor = nextResponse.next_cursor;
    }
    
    return {
      results,
      hasMore,
      nextCursor
    };
  } catch (error) {
    return handleApiError(error, `Failed to query database: ${databaseId}`);
  }
}

/**
 * Export all database operations
 */
export const databaseOperations = {
  createDatabase,
  getDatabase,
  updateDatabase,
  queryDatabase
};