"use strict";
/**
 * Configuration management for agent functionality
 * Loads environment variables and provides configuration values
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pineconeConfig = exports.notionConfig = exports.openaiConfig = exports.claudeConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables from .env file
function loadEnv() {
    // Try to load from .env file
    const envPath = path_1.default.resolve(process.cwd(), '.env');
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
        console.log('Loaded environment variables from .env file');
    }
    else {
        console.warn('No .env file found. Using existing environment variables.');
    }
}
// Call this function when the module is imported
loadEnv();
/**
 * Validates that required environment variables are present
 * @param keys List of required environment variable keys
 */
function validateEnvVars(keys) {
    const missing = keys.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
/**
 * Agent configuration object with all settings
 */
exports.config = {
    // Claude API configuration
    claude: {
        apiKey: process.env.CLAUDE_API_KEY || '',
        defaultModel: 'claude-3-sonnet-20240229',
        haiku: 'claude-3-haiku-20240307',
        opus: 'claude-3-opus-20240229',
    },
    // OpenAI API configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        defaultModel: 'gpt-4.1-mini',
        reviewerModel: 'gpt-3.5-turbo-0301',
        // Model for Deer-Flow agent workflows
        deerFlowModel: process.env.DEER_FLOW_MODEL || 'deer-flow',
    },
    // Notion API configuration
    notion: {
        apiKey: process.env.NOTION_API_KEY || '',
        rootPageId: process.env.NOTION_ROOT_PAGE_ID || '',
        projectDatabaseId: process.env.NOTION_PROJECT_DB_ID || '',
        taskDatabaseId: process.env.NOTION_TASK_DB_ID || '',
        dependencyDatabaseId: process.env.NOTION_DEPENDENCY_DB_ID || '',
    },
    // Pinecone configuration
    pinecone: {
        apiKey: process.env.PINECONE_API_KEY || '',
        indexName: process.env.PINECONE_INDEX_NAME || '',
    },
    // Environment settings
    environment: {
        isDevelopment: process.env.NODE_ENV !== 'production',
        logLevel: process.env.LOG_LEVEL || 'info',
    },
    // Validate required configuration
    validate: () => {
        try {
            // Validate Claude API key (required)
            validateEnvVars(['CLAUDE_API_KEY']);
            // Validate Notion API key if using Notion integration
            if (process.env.USE_NOTION_INTEGRATION === 'true') {
                validateEnvVars(['NOTION_API_KEY', 'NOTION_ROOT_PAGE_ID']);
            }
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
};
// Export individual configurations for convenience
exports.claudeConfig = exports.config.claude;
exports.openaiConfig = exports.config.openai;
exports.notionConfig = exports.config.notion;
exports.pineconeConfig = exports.config.pinecone;
