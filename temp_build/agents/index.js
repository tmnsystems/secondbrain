"use strict";
/**
 * SecondBrain Agent System
 *
 * This is the entry point for the multi-agent architecture that powers
 * the SecondBrain system. It coordinates specialized agents for content
 * processing, reasoning, and generation tasks using LangGraph.
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAgents = exports.getAvailableAgents = void 0;
// Re-export planner agent (existing)
__exportStar(require("./planner"), exports);
// Re-export our new LangGraph-based agents
__exportStar(require("./content"), exports);
__exportStar(require("./reasoning"), exports);
__exportStar(require("./generation"), exports);
__exportStar(require("./feedback"), exports);
// Return information about all available agents
function getAvailableAgents() {
    return [
        {
            name: 'PlannerAgent',
            version: '0.1.0',
            description: 'Breaks down complex projects into actionable tasks and timelines',
            capabilities: [
                'Project analysis',
                'Task generation',
                'Timeline creation',
                'Specification generation',
                'Plan validation'
            ]
        },
        {
            name: 'ContentAgent',
            version: '0.1.0',
            description: 'Processes and analyzes content to extract knowledge and patterns',
            capabilities: [
                'Transcript processing',
                'Speaker separation',
                'Style extraction',
                'Pattern recognition',
                'Knowledge indexing'
            ]
        },
        {
            name: 'ReasoningAgent',
            version: '0.1.0',
            description: 'Analyzes reasoning patterns and generates structured thought processes',
            capabilities: [
                'Analogical reasoning',
                'Deductive reasoning',
                'Inductive reasoning',
                'Pattern matching',
                'Mental model creation'
            ]
        },
        {
            name: 'GenerationAgent',
            version: '0.1.0',
            description: 'Creates content matching specific voice and style patterns',
            capabilities: [
                'Content creation',
                'Style matching',
                'Voice replication',
                'Format adaptation',
                'Quality control'
            ]
        },
        {
            name: 'FeedbackAgent',
            version: '0.1.0',
            description: 'Collects and processes human feedback to improve system performance',
            capabilities: [
                'Feedback collection',
                'Model adjustment recommendations',
                'Quality evaluation',
                'Improvement tracking',
                'Human-in-the-loop integration'
            ]
        }
    ];
}
exports.getAvailableAgents = getAvailableAgents;
/**
 * Initialize the full agent system
 */
async function initializeAgents(config = {}) {
    console.log('Initializing SecondBrain Agent System with LangGraph...');
    // Setup default configuration
    const finalConfig = {
        models: {
            primary: process.env.CLAUDE_API_KEY ? 'claude' : 'openai',
            fallback: 'openai'
        },
        storage: {
            vectorDb: process.env.PINECONE_API_KEY ? 'pinecone' : 'chroma',
            documentStore: 'local'
        },
        feedback: {
            enabled: true,
            approvalRequired: true
        },
        ...config
    };
    // Initialize each agent type (these will be implemented in their respective folders)
    const contentAgent = await Promise.resolve().then(() => __importStar(require('./content'))).then(module => module.initContentAgent(finalConfig));
    const reasoningAgent = await Promise.resolve().then(() => __importStar(require('./reasoning'))).then(module => module.initReasoningAgent(finalConfig));
    const generationAgent = await Promise.resolve().then(() => __importStar(require('./generation'))).then(module => module.initGenerationAgent(finalConfig));
    const feedbackAgent = await Promise.resolve().then(() => __importStar(require('./feedback'))).then(module => module.initFeedbackAgent(finalConfig));
    return {
        status: 'initialized',
        agents: [
            'planner',
            'content',
            'reasoning',
            'generation',
            'feedback'
        ],
        contentAgent,
        reasoningAgent,
        generationAgent,
        feedbackAgent,
        config: finalConfig
    };
}
exports.initializeAgents = initializeAgents;
