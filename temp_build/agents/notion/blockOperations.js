"use strict";
/**
 * Block Operations
 *
 * Handles creating, retrieving, updating, and deleting blocks within Notion pages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockOperations = exports.deleteBlock = exports.updateBlock = exports.getBlocks = exports.createBlocks = void 0;
const utils_1 = require("./utils");
/**
 * Create blocks in a page or block
 */
async function createBlocks(client, blockId, blocks) {
    try {
        const response = await client.blocks.children.append({
            block_id: blockId,
            children: blocks
        });
        return response.results;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to create blocks in ${blockId}`);
    }
}
exports.createBlocks = createBlocks;
/**
 * Get all blocks in a page or block
 */
async function getBlocks(client, blockId) {
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
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to retrieve blocks from ${blockId}`);
    }
}
exports.getBlocks = getBlocks;
/**
 * Update a block's content
 */
async function updateBlock(client, blockId, params) {
    try {
        const response = await client.blocks.update({
            block_id: blockId,
            ...params
        });
        return response;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to update block: ${blockId}`);
    }
}
exports.updateBlock = updateBlock;
/**
 * Delete a block
 */
async function deleteBlock(client, blockId) {
    try {
        await client.blocks.delete({
            block_id: blockId
        });
        return true;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to delete block: ${blockId}`);
    }
}
exports.deleteBlock = deleteBlock;
/**
 * Export all block operations
 */
exports.blockOperations = {
    createBlocks,
    getBlocks,
    updateBlock,
    deleteBlock
};
