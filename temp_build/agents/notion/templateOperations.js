"use strict";
/**
 * Template Operations
 *
 * Handles creating and applying templates for Notion pages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateOperations = exports.applyTemplate = exports.createTemplate = void 0;
const utils_1 = require("./utils");
// Store templates in memory
// In a production system, this would be stored in a database
const templates = new Map();
/**
 * Create a new template
 */
async function createTemplate(client, templateName, content) {
    try {
        // Store the template in memory
        templates.set(templateName, content);
        return {
            name: templateName,
            blocks: content.length
        };
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to create template: ${templateName}`);
    }
}
exports.createTemplate = createTemplate;
/**
 * Apply a template to a page
 */
async function applyTemplate(client, pageId, templateName, variables = {}) {
    try {
        // Get the template
        const template = templates.get(templateName);
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }
        // Process the template with variables
        const processedBlocks = template.map(block => {
            // Deep clone the block to avoid modifying the template
            const processedBlock = JSON.parse(JSON.stringify(block));
            // Replace variables in text content
            if (processedBlock.content?.text) {
                processedBlock.content.text = replaceVariables(processedBlock.content.text, variables);
            }
            return processedBlock;
        });
        // Apply the processed blocks to the page
        await client.blocks.children.append({
            block_id: pageId,
            children: processedBlocks
        });
        return true;
    }
    catch (error) {
        return (0, utils_1.handleApiError)(error, `Failed to apply template: ${templateName} to page: ${pageId}`);
    }
}
exports.applyTemplate = applyTemplate;
/**
 * Replace template variables in a string
 */
function replaceVariables(text, variables) {
    let result = text;
    // Replace all {{variableName}} with the corresponding value
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(value));
    }
    return result;
}
/**
 * Export all template operations
 */
exports.templateOperations = {
    createTemplate,
    applyTemplate
};
