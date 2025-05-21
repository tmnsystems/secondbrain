/**
 * Page Operations
 * 
 * Handles creating, retrieving, updating, and archiving Notion pages.
 */

import { createPageViaRelay } from '../../lib/relayNotion.js';
// 🔄 Switched to relay—no direct Notion SDK in sandbox
import { isFullPage } from '@notionhq/client';
import { handleApiError } from './utils';

/**
 * Create a new page in Notion
 */
export async function createPage(client: Client, params: any) {
  try {
    const dbId = params.parent?.database_id;
    const titlePropEntry = Object.entries(params.properties || {}).find(([, prop]) => prop?.type === 'title');
    const title = titlePropEntry ? titlePropEntry[1].title[0].plain_text : '';
    const responseId = await createPageViaRelay(dbId, title, params.properties || {});
    return { id: responseId };
  } catch (error) {
    return handleApiError(error, 'Failed to create page');
  }
}

/**
 * Retrieve a page by ID
 */
export async function getPage(client: Client, pageId: string) {
  try {
    const response = await client.pages.retrieve({ page_id: pageId });
    
    if (!isFullPage(response)) {
      throw new Error('Retrieved object is not a page');
    }
    
    return response;
  } catch (error) {
    return handleApiError(error, `Failed to retrieve page: ${pageId}`);
  }
}

/**
 * Update a page's properties
 */
export async function updatePage(client: Client, pageId: string, params: any) {
  try {
    const response = await client.pages.update({
      page_id: pageId,
      ...params
    });
    
    return response;
  } catch (error) {
    return handleApiError(error, `Failed to update page: ${pageId}`);
  }
}

/**
 * Archive a page
 */
export async function archivePage(client: Client, pageId: string) {
  try {
    await client.pages.update({
      page_id: pageId,
      archived: true
    });
    
    return true;
  } catch (error) {
    return handleApiError(error, `Failed to archive page: ${pageId}`);
  }
}

/**
 * Export all page operations
 */
export const pageOperations = {
  createPage,
  getPage,
  updatePage,
  archivePage
};