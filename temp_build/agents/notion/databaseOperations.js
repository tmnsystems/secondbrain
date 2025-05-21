"use strict";
/**
 * Database Operations
 *
 * Handles creating, retrieving, updating, and querying Notion databases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseOperations = exports.queryDatabase = exports.updateDatabase = exports.getDatabase = exports.createDatabase = void 0;
const utils_1 = require("./utils");
/**
 * Create a new database
 */
async function createDatabase(client, params) {
    try {
        const response = await client.databases.create(params);
        return response;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, 'Failed to create database');
    }
}
exports.createDatabase = createDatabase;
/**
 * Retrieve a database by ID
 */
async function getDatabase(client, databaseId) {
    try {
        const response = await client.databases.retrieve({
            database_id: databaseId
        });
        return response;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to retrieve database: ${databaseId}`);
    }
}
exports.getDatabase = getDatabase;
/**
 * Update a database's properties
 */
async function updateDatabase(client, databaseId, params) {
    try {
        const response = await client.databases.update({
            database_id: databaseId,
            ...params
        });
        return response;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to update database: ${databaseId}`);
    }
}
exports.updateDatabase = updateDatabase;
/**
 * Query a database with filters, sorts, etc.
 */
async function queryDatabase(client, databaseId, query) {
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
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to query database: ${databaseId}`);
    }
}
exports.queryDatabase = queryDatabase;
/**
 * Export all database operations
 */
exports.databaseOperations = {
    createDatabase,
    getDatabase,
    updateDatabase,
    queryDatabase
};
