"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initContentAgent = exports.ContentAgent = void 0;
const langgraph_1 = require("@langchain/langgraph");
const anthropic_1 = require("@langchain/anthropic");
const openai_1 = require("@langchain/openai");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const messages_1 = require("@langchain/core/messages");
// Node functions for the ContentAgent graph
async function ingestTranscript(state) {
    try {
        const messages = [...state.messages];
        const current_file = state.current_file;
        if (!current_file) {
            return {
                ...state,
                error: "No transcript file specified for ingestion"
            };
        }
        // Read the transcript file
        const content = await fs.readFile(current_file, 'utf-8');
        messages.push(new messages_1.HumanMessage(`I need to analyze the following transcript: ${content}`));
        return {
            ...state,
            messages
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error ingesting transcript: ${error.message}`
        };
    }
}
async function analyzeContent(state) {
    try {
        const messages = [...state.messages];
        const llm = initializeLLM(state);
        messages.push(new messages_1.HumanMessage("Extract the key concepts, themes, and unique language patterns from this transcript. Focus on identifying the speaker's unique voice, terminology, metaphors, and teaching approaches."));
        const response = await llm.invoke(messages);
        messages.push(response);
        return {
            ...state,
            messages,
            extracted_content: {
                concepts: [], // To be populated with structured data from LLM response
                themes: [],
                terminology: [],
                metaphors: [],
                teaching_patterns: []
            }
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error analyzing content: ${error.message}`
        };
    }
}
async function extractStyleProfile(state) {
    try {
        const messages = [...state.messages];
        const llm = initializeLLM(state);
        messages.push(new messages_1.HumanMessage("Based on the analysis, create a comprehensive style profile that captures this person's unique voice, including tone, pacing, word choice, sentence structure, and rhetorical devices. Structure this as a JSON object with the following keys: tone, pacing, word_choice, sentence_structure, rhetorical_devices, and unique_patterns."));
        const response = await llm.invoke(messages);
        messages.push(response);
        // Extract JSON from the response text
        const responseText = response.content.toString();
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
            responseText.match(/{[\s\S]*}/);
        let styleProfile = {};
        if (jsonMatch) {
            try {
                styleProfile = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            }
            catch (e) {
                console.warn("Failed to parse JSON from response, using raw text");
                styleProfile = { raw_profile: responseText };
            }
        }
        else {
            styleProfile = { raw_profile: responseText };
        }
        return {
            ...state,
            messages,
            style_profile: styleProfile
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error extracting style profile: ${error.message}`
        };
    }
}
async function saveProcessedContent(state) {
    try {
        const { style_profile, current_file } = state;
        if (!style_profile) {
            return {
                ...state,
                error: "No style profile to save"
            };
        }
        if (!current_file) {
            return {
                ...state,
                error: "No source file specified"
            };
        }
        // Generate a filename based on the original transcript
        const basename = path.basename(current_file, path.extname(current_file));
        const processedDir = process.env.PROCESSED_DIR || './processed_transcripts';
        // Ensure directory exists
        await fs.mkdir(processedDir, { recursive: true });
        // Save style profile as JSON
        const outputPath = path.join(processedDir, `${basename}_style_profile.json`);
        await fs.writeFile(outputPath, JSON.stringify(style_profile, null, 2));
        return {
            ...state,
            messages: [
                ...state.messages,
                new messages_1.AIMessage(`Style profile saved to ${outputPath}`)
            ]
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error saving processed content: ${error.message}`
        };
    }
}
// Helper functions
function initializeLLM(state) {
    const config = state;
    // Default to Claude if available, otherwise OpenAI
    if (config.model.includes('claude') || process.env.CLAUDE_API_KEY) {
        return new anthropic_1.ChatAnthropic({
            apiKey: process.env.CLAUDE_API_KEY,
            model: "claude-3-opus-20240229",
            temperature: 0.3
        });
    }
    else {
        return new openai_1.ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
            temperature: 0.3
        });
    }
}
// ContentAgent class
class ContentAgent {
    constructor(config = {}) {
        this.config = {
            model: config.model || 'claude',
            apiKey: config.apiKey || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY,
            storageType: config.storageType || 'local',
            transcriptDir: config.transcriptDir || './transcripts',
            processedDir: config.processedDir || './processed_transcripts',
            ...config
        };
        // Initialize the StateGraph
        this.graph = new langgraph_1.StateGraph({
            channels: { messages: messages_1.BaseMessage }
        });
        // Add nodes
        this.graph.addNode("ingest_transcript", ingestTranscript);
        this.graph.addNode("analyze_content", analyzeContent);
        this.graph.addNode("extract_style_profile", extractStyleProfile);
        this.graph.addNode("save_processed_content", saveProcessedContent);
        // Define the edges
        this.graph.addEdge("ingest_transcript", "analyze_content");
        this.graph.addEdge("analyze_content", "extract_style_profile");
        this.graph.addEdge("extract_style_profile", "save_processed_content");
        // Compile the graph
        this.graph.compile();
    }
    async processTranscript(filePath) {
        const initialState = {
            messages: [
                new messages_1.HumanMessage("You are a content analysis agent specialized in understanding writing styles, voices, and teaching approaches. Your task is to analyze transcripts and extract the unique style and voice of the speaker.")
            ],
            current_file: filePath
        };
        try {
            const result = await this.graph.invoke(initialState);
            return {
                success: !result.error,
                style_profile: result.style_profile,
                error: result.error
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async processMultipleTranscripts(directoryOrFiles) {
        let files = [];
        if (typeof directoryOrFiles === 'string') {
            // Process directory
            const entries = await fs.readdir(directoryOrFiles, { withFileTypes: true });
            files = entries
                .filter(entry => entry.isFile() && entry.name.endsWith('.txt'))
                .map(entry => path.join(directoryOrFiles, entry.name));
        }
        else {
            // Process array of files
            files = directoryOrFiles;
        }
        const results = [];
        for (const file of files) {
            const result = await this.processTranscript(file);
            results.push({
                file,
                ...result
            });
        }
        return results;
    }
}
exports.ContentAgent = ContentAgent;
// Factory function to initialize the ContentAgent
async function initContentAgent(config = {}) {
    return new ContentAgent(config);
}
exports.initContentAgent = initContentAgent;
