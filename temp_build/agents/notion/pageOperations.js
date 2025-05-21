"use strict";
/**
 * Page Operations
 *
 * Handles creating, retrieving, updating, and archiving Notion pages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageOperations = exports.archivePage = exports.updatePage = exports.getPage = exports.createPage = void 0;
const client_1 = require("@notionhq/client");
const utils_1 = require("./utils");
/**
 * Create a new page in Notion
 */
async function createPage(client, params) {
    try {
        const response = await client.pages.create(params);
        return response;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, 'Failed to create page');
    }
}
exports.createPage = createPage;
/**
 * Retrieve a page by ID
 */
async function getPage(client, pageId) {
    try {
        const response = await client.pages.retrieve({ page_id: pageId });
        if (!(0, client_1.isFullPage)(response)) {
            throw new Error('Retrieved object is not a page');
        }
        return response;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to retrieve page: ${pageId}`);
    }
}
exports.getPage = getPage;
/**
 * Update a page's properties
 */
async function updatePage(client, pageId, params) {
    try {
        const response = await client.pages.update({
            page_id: pageId,
            ...params
        });
        return response;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to update page: ${pageId}`);
    }
}
exports.updatePage = updatePage;
/**
 * Archive a page
 */
async function archivePage(client, pageId) {
    try {
        await client.pages.update({
            page_id: pageId,
            archived: true
        });
        return true;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to archive page: ${pageId}`);
    }
}
exports.archivePage = archivePage;
/**
 * Export all page operations
 */
exports.pageOperations = {
    createPage,
    getPage,
    updatePage,
    archivePage
};
