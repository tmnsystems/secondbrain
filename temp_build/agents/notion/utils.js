"use strict";
/**
 * Utility functions for the Notion Agent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = exports.sleep = exports.handleApiError = void 0;
/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error, message) {
    console.error(`${message}:`, error);
    // Format the error response
    const errorResponse = {
        success: false,
        error: {
            message: message,
            code: error.code || 'UNKNOWN_ERROR',
            status: error.status || 500,
            details: error.message || 'Unknown error occurred'
        }
    };
    // Return the formatted error
    return errorResponse;
}
exports.handleApiError = handleApiError;
/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let retries = 0;
    let delay = initialDelay;
    while (true) {
        try {
            return await fn();
        }
        catch (error) {
            // Don't retry if we've reached the max retries
            if (retries >= maxRetries) {
                throw error;
            }
            // Don't retry if the error is not retryable
            // Usually rate limiting (429) is retryable, but not authorization errors (401, 403)
            if (error.status && (error.status === 401 || error.status === 403)) {
                throw error;
            }
            // Wait before retrying
            await sleep(delay);
            // Increase the delay for next retry (exponential backoff)
            delay *= 2;
            retries++;
        }
    }
}
exports.retryWithBackoff = retryWithBackoff;
