/**
 * Extractor Operations
 * 
 * Handles extracting and formatting content from Notion pages.
 */

import { Client } from '@notionhq/client';
import { handleApiError } from './utils';

/**
 * Extract content from a page in a specified format
 */
export async function extractContent(
  client: Client,
  pageId: string,
  format: 'markdown' | 'plaintext' | 'html' = 'markdown'
) {
  try {
    // Get the page
    const page = await client.pages.retrieve({ page_id: pageId });
    
    // Get all blocks in the page
    const blocks = await getAllBlocksRecursively(client, pageId);
    
    // Format the content based on the requested format
    let content = '';
    
    // Add the page title
    // @ts-ignore - The title property is not properly typed
    const title = page.properties?.title?.title?.map(t => t.plain_text).join('') || 'Untitled';
    
    switch (format) {
      case 'markdown':
        content = `# ${title}\n\n`;
        content += await blocksToMarkdown(blocks);
        break;
        
      case 'plaintext':
        content = `${title}\n\n`;
        content += await blocksToPlainText(blocks);
        break;
        
      case 'html':
        content = `<h1>${title}</h1>`;
        content += await blocksToHtml(blocks);
        break;
    }
    
    return content;
  } catch (error) {
    return handleApiError(error, `Failed to extract content from page: ${pageId}`);
  }
}

/**
 * Get all blocks recursively (including nested blocks)
 */
async function getAllBlocksRecursively(client: Client, blockId: string) {
  const blocks = [];
  
  // Get the initial set of blocks
  const response = await client.blocks.children.list({
    block_id: blockId
  });
  
  for (const block of response.results) {
    blocks.push(block);
    
    // If the block has children, get them recursively
    if (block.has_children) {
      const childBlocks = await getAllBlocksRecursively(client, block.id);
      blocks.push(...childBlocks);
    }
  }
  
  // If there are more blocks, fetch them
  if (response.has_more && response.next_cursor) {
    const nextResponse = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: response.next_cursor
    });
    
    for (const block of nextResponse.results) {
      blocks.push(block);
      
      // If the block has children, get them recursively
      if (block.has_children) {
        const childBlocks = await getAllBlocksRecursively(client, block.id);
        blocks.push(...childBlocks);
      }
    }
  }
  
  return blocks;
}

/**
 * Convert blocks to Markdown format
 */
async function blocksToMarkdown(blocks: any[]) {
  let markdown = '';
  
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        markdown += getTextContent(block.paragraph) + '\n\n';
        break;
        
      case 'heading_1':
        markdown += '# ' + getTextContent(block.heading_1) + '\n\n';
        break;
        
      case 'heading_2':
        markdown += '## ' + getTextContent(block.heading_2) + '\n\n';
        break;
        
      case 'heading_3':
        markdown += '### ' + getTextContent(block.heading_3) + '\n\n';
        break;
        
      case 'bulleted_list_item':
        markdown += '- ' + getTextContent(block.bulleted_list_item) + '\n';
        break;
        
      case 'numbered_list_item':
        markdown += '1. ' + getTextContent(block.numbered_list_item) + '\n';
        break;
        
      case 'to_do':
        const checked = block.to_do.checked ? '[x]' : '[ ]';
        markdown += `- ${checked} ${getTextContent(block.to_do)}\n`;
        break;
        
      case 'toggle':
        markdown += '> ' + getTextContent(block.toggle) + '\n\n';
        break;
        
      case 'code':
        markdown += '```' + (block.code.language || '') + '\n';
        markdown += getTextContent(block.code) + '\n';
        markdown += '```\n\n';
        break;
        
      case 'quote':
        markdown += '> ' + getTextContent(block.quote) + '\n\n';
        break;
        
      case 'callout':
        const emoji = block.callout.icon?.emoji || '';
        markdown += `> ${emoji} ${getTextContent(block.callout)}\n\n`;
        break;
        
      case 'divider':
        markdown += '---\n\n';
        break;
    }
  }
  
  return markdown;
}

/**
 * Convert blocks to plain text
 */
async function blocksToPlainText(blocks: any[]) {
  let text = '';
  
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        text += getTextContent(block.paragraph) + '\n\n';
        break;
        
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        text += getTextContent(block[block.type]) + '\n\n';
        break;
        
      case 'bulleted_list_item':
        text += '* ' + getTextContent(block.bulleted_list_item) + '\n';
        break;
        
      case 'numbered_list_item':
        text += '1. ' + getTextContent(block.numbered_list_item) + '\n';
        break;
        
      case 'to_do':
        const marker = block.to_do.checked ? '[DONE]' : '[ ]';
        text += `${marker} ${getTextContent(block.to_do)}\n`;
        break;
        
      case 'code':
        text += getTextContent(block.code) + '\n\n';
        break;
        
      case 'quote':
      case 'callout':
        text += getTextContent(block[block.type]) + '\n\n';
        break;
        
      case 'divider':
        text += '----------------\n\n';
        break;
    }
  }
  
  return text;
}

/**
 * Convert blocks to HTML
 */
async function blocksToHtml(blocks: any[]) {
  let html = '';
  
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        html += `<p>${getTextContent(block.paragraph)}</p>`;
        break;
        
      case 'heading_1':
        html += `<h1>${getTextContent(block.heading_1)}</h1>`;
        break;
        
      case 'heading_2':
        html += `<h2>${getTextContent(block.heading_2)}</h2>`;
        break;
        
      case 'heading_3':
        html += `<h3>${getTextContent(block.heading_3)}</h3>`;
        break;
        
      case 'bulleted_list_item':
        html += `<li>${getTextContent(block.bulleted_list_item)}</li>`;
        // Note: In a real implementation, we'd need to handle list grouping properly
        break;
        
      case 'numbered_list_item':
        html += `<li>${getTextContent(block.numbered_list_item)}</li>`;
        // Note: In a real implementation, we'd need to handle list grouping properly
        break;
        
      case 'to_do':
        const checked = block.to_do.checked ? ' checked' : '';
        html += `<div><input type="checkbox"${checked}> ${getTextContent(block.to_do)}</div>`;
        break;
        
      case 'code':
        html += `<pre><code class="language-${block.code.language || 'plaintext'}">${getTextContent(block.code)}</code></pre>`;
        break;
        
      case 'quote':
        html += `<blockquote>${getTextContent(block.quote)}</blockquote>`;
        break;
        
      case 'callout':
        const emoji = block.callout.icon?.emoji || '';
        html += `<div class="callout">${emoji} ${getTextContent(block.callout)}</div>`;
        break;
        
      case 'divider':
        html += '<hr>';
        break;
    }
  }
  
  return html;
}

/**
 * Get plain text content from a rich text block
 */
function getTextContent(block: any) {
  if (!block || !block.rich_text) {
    return '';
  }
  
  return block.rich_text.map((text: any) => text.plain_text).join('');
}

/**
 * Export all extractor operations
 */
export const extractorOperations = {
  extractContent
};