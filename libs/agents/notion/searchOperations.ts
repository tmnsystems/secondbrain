/**
 * Search Operations
 * 
 * Handles searching across Notion workspace for pages and databases.
 */

import { Client } from '@notionhq/client';
import { isFullPage, isFullDatabase } from '@notionhq/client';
import { handleApiError } from './utils';

/**
 * Search across the workspace
 */
export async function search(client: Client, query: string, params: any = {}) {
  try {
    // Initial search
    const response = await client.search({
      query,
      ...params
    });
    
    let results = response.results;
    let hasMore = response.has_more;
    let nextCursor = response.next_cursor;
    
    // If there are more results, fetch them
    while (hasMore && nextCursor) {
      const nextResponse = await client.search({
        query,
        ...params,
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
    return handleApiError(error, `Failed to search for: ${query}`);
  }
}

/**
 * Search for pages only
 */
export async function searchPages(client: Client, query: string, params: any = {}) {
  try {
    const searchResults = await search(client, query, {
      ...params,
      filter: { property: 'object', value: 'page' }
    });
    
    // Filter out any non-page results just to be safe
    const pages = searchResults.results.filter(result => isFullPage(result));
    
    return {
      results: pages,
      hasMore: searchResults.hasMore,
      nextCursor: searchResults.nextCursor
    };
  } catch (error) {
    return handleApiError(error, `Failed to search for pages: ${query}`);
  }
}

/**
 * Search for databases only
 */
export async function searchDatabases(client: Client, query: string, params: any = {}) {
  try {
    const searchResults = await search(client, query, {
      ...params,
      filter: { property: 'object', value: 'database' }
    });
    
    // Filter out any non-database results just to be safe
    const databases = searchResults.results.filter(result => isFullDatabase(result));
    
    return {
      results: databases,
      hasMore: searchResults.hasMore,
      nextCursor: searchResults.nextCursor
    };
  } catch (error) {
    return handleApiError(error, `Failed to search for databases: ${query}`);
  }
}

/**
 * Export all search operations
 */
export const searchOperations = {
  search,
  searchPages,
  searchDatabases
};