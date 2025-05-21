"use strict";
/**
 * Search Operations
 *
 * Handles searching across Notion workspace for pages and databases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchOperations = exports.searchDatabases = exports.searchPages = exports.search = void 0;
const client_1 = require("@notionhq/client");
const utils_1 = require("./utils");
/**
 * Search across the workspace
 */
async function search(client, query, params = {}) {
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
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to search for: ${query}`);
    }
}
exports.search = search;
/**
 * Search for pages only
 */
async function searchPages(client, query, params = {}) {
    try {
        const searchResults = await search(client, query, {
            ...params,
            filter: { property: 'object', value: 'page' }
        });
        // Filter out any non-page results just to be safe
        const pages = searchResults.results.filter(result => (0, client_1.isFullPage)(result));
        return {
            results: pages,
            hasMore: searchResults.hasMore,
            nextCursor: searchResults.nextCursor
        };
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to search for pages: ${query}`);
    }
}
exports.searchPages = searchPages;
/**
 * Search for databases only
 */
async function searchDatabases(client, query, params = {}) {
    try {
        const searchResults = await search(client, query, {
            ...params,
            filter: { property: 'object', value: 'database' }
        });
        // Filter out any non-database results just to be safe
        const databases = searchResults.results.filter(result => (0, client_1.isFullDatabase)(result));
        return {
            results: databases,
            hasMore: searchResults.hasMore,
            nextCursor: searchResults.nextCursor
        };
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to search for databases: ${query}`);
    }
}
exports.searchDatabases = searchDatabases;
/**
 * Export all search operations
 */
exports.searchOperations = {
    search,
    searchPages,
    searchDatabases
};
