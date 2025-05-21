/**
 * Utility functions for the Notion Agent
 */

/**
 * Handle API errors with consistent formatting
 */
export function handleApiError(error: any, message: string) {
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

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
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