/**
 * Block Operations
 * 
 * Handles creating, retrieving, updating, and deleting blocks within Notion pages.
 */

import { Client } from '@notionhq/client';
import { handleApiError } from './utils';

/**
 * Create blocks in a page or block
 */
export async function createBlocks(client: Client, blockId: string, blocks: any[]) {
  try {
    const response = await client.blocks.children.append({
      block_id: blockId,
      children: blocks
    });
    
    return response.results;
  } catch (error) {
    return handleApiError(error, `Failed to create blocks in ${blockId}`);
  }
}

/**
 * Get all blocks in a page or block
 */
export async function getBlocks(client: Client, blockId: string) {
  try {
    // Get the initial set of blocks
    const response = await client.blocks.children.list({
      block_id: blockId
    });
    
    let blocks = response.results;
    let hasMore = response.has_more;
    let nextCursor = response.next_cursor;
    
    // If there are more blocks, fetch them
    while (hasMore && nextCursor) {
      const nextResponse = await client.blocks.children.list({
        block_id: blockId,
        start_cursor: nextCursor
      });
      
      blocks = [...blocks, ...nextResponse.results];
      hasMore = nextResponse.has_more;
      nextCursor = nextResponse.next_cursor;
    }
    
    return blocks;
  } catch (error) {
    return handleApiError(error, `Failed to retrieve blocks from ${blockId}`);
  }
}

/**
 * Update a block's content
 */
export async function updateBlock(client: Client, blockId: string, params: any) {
  try {
    const response = await client.blocks.update({
      block_id: blockId,
      ...params
    });
    
    return response;
  } catch (error) {
    return handleApiError(error, `Failed to update block: ${blockId}`);
  }
}

/**
 * Delete a block
 */
export async function deleteBlock(client: Client, blockId: string) {
  try {
    await client.blocks.delete({
      block_id: blockId
    });
    
    return true;
  } catch (error) {
    return handleApiError(error, `Failed to delete block: ${blockId}`);
  }
}

/**
 * Export all block operations
 */
export const blockOperations = {
  createBlocks,
  getBlocks,
  updateBlock,
  deleteBlock
};