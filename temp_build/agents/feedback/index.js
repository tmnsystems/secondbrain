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
exports.initFeedbackAgent = exports.FeedbackAgent = void 0;
const langgraph_1 = require("@langchain/langgraph");
const anthropic_1 = require("@langchain/anthropic");
const openai_1 = require("@langchain/openai");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const messages_1 = require("@langchain/core/messages");
// Node functions for the FeedbackAgent graph
async function analyzeContent(state) {
    try {
        const messages = [...state.messages];
        const llm = initializeLLM(state);
        const content = state.content;
        const styleProfile = state.style_profile;
        if (!content) {
            return {
                ...state,
                error: "No content provided for analysis"
            };
        }
        let analysisPrompt = "Analyze the provided content against the style profile. Focus on:";
        analysisPrompt += "\n1. Tone and voice consistency";
        analysisPrompt += "\n2. Language pattern adherence";
        analysisPrompt += "\n3. Sentence structure alignment";
        analysisPrompt += "\n4. Word choice appropriateness";
        analysisPrompt += "\n5. Overall authenticity to the original style";
        if (styleProfile) {
            analysisPrompt += "\n\nStyle Profile Reference:";
            Object.entries(styleProfile).forEach(([key, value]) => {
                if (key !== 'raw_profile') {
                    analysisPrompt += `\n- ${key}: ${JSON.stringify(value)}`;
                }
            });
        }
        analysisPrompt += "\n\nContent to analyze:";
        analysisPrompt += "\n" + content;
        analysisPrompt += "\n\nProvide your analysis as a structured evaluation with clear ratings (1-10) for each area and specific examples.";
        messages.push(new messages_1.HumanMessage(analysisPrompt));
        const response = await llm.invoke(messages);
        messages.push(response);
        return {
            ...state,
            messages,
            feedback: response.content.toString()
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error analyzing content: ${error.message}`
        };
    }
}
async function generateRevisionSuggestions(state) {
    try {
        const messages = [...state.messages];
        const llm = initializeLLM(state);
        const content = state.content;
        const feedback = state.feedback;
        if (!feedback) {
            return {
                ...state,
                error: "No feedback available to generate revision suggestions"
            };
        }
        let suggestionsPrompt = "Based on the analysis, provide specific, actionable revision suggestions to better align the content with the target style. For each suggestion:";
        suggestionsPrompt += "\n1. Quote the specific text that needs revision";
        suggestionsPrompt += "\n2. Explain why it doesn't match the style";
        suggestionsPrompt += "\n3. Provide a rewritten version that better matches the style";
        suggestionsPrompt += "\n\nOrganize your suggestions by priority (critical, important, minor).";
        messages.push(new messages_1.HumanMessage(suggestionsPrompt));
        const response = await llm.invoke(messages);
        messages.push(response);
        // Extract revision suggestions into a structured format
        // This would typically parse the LLM's response into a more usable structure
        const revisions = [
            {
                priority: "critical",
                suggestions: []
            },
            {
                priority: "important",
                suggestions: []
            },
            {
                priority: "minor",
                suggestions: []
            }
        ];
        return {
            ...state,
            messages,
            revisions
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error generating revision suggestions: ${error.message}`
        };
    }
}
async function saveFeedback(state) {
    try {
        const feedback = state.feedback;
        const revisions = state.revisions;
        const content = state.content;
        const config = state;
        if (!feedback || !revisions) {
            return {
                ...state,
                error: "Missing feedback or revisions to save"
            };
        }
        // Create a feedback record
        const feedbackRecord = {
            timestamp: new Date().toISOString(),
            feedback,
            revisions,
            content: content?.substring(0, 500) + "...", // Store a preview of the content
            human_feedback: state.human_feedback || null,
            approved: state.approved || false
        };
        // Save to feedback directory
        const feedbackDir = config.feedbackDir || './feedback_data';
        // Ensure directory exists
        await fs.mkdir(feedbackDir, { recursive: true });
        // Create timestamped filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = path.join(feedbackDir, `feedback_${timestamp}.json`);
        // Save content
        await fs.writeFile(outputPath, JSON.stringify(feedbackRecord, null, 2));
        return {
            ...state,
            messages: [
                ...state.messages,
                new messages_1.AIMessage(`Feedback saved to ${outputPath}`)
            ]
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error saving feedback: ${error.message}`
        };
    }
}
async function waitForHumanFeedback(state) {
    // In a real implementation, this would pause execution and wait for human input
    // For this demo, we'll simulate human feedback
    // This is a placeholder - in a real implementation, this would be an async function
    // that waits for human feedback via a web interface or other input mechanism
    console.log("Waiting for human feedback...");
    console.log("(This is a placeholder - in a real app, this would wait for actual input)");
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate human feedback
    const simulatedHumanFeedback = `
  The content captures most of my style elements but needs adjustments:
  
  1. The intro paragraph doesn't have my usual directness
  2. Some metaphors feel forced rather than natural
  3. Overall structure is good
  4. Please add more concrete examples
  
  I approve with these revisions.
  `;
    return {
        ...state,
        human_feedback: simulatedHumanFeedback,
        approved: true // In a real implementation, this would be set based on actual approval
    };
}
async function applyRevisions(state) {
    try {
        const messages = [...state.messages];
        const llm = initializeLLM(state);
        const content = state.content;
        const humanFeedback = state.human_feedback;
        if (!content || !humanFeedback) {
            return {
                ...state,
                error: "Missing content or human feedback for revision"
            };
        }
        let revisionPrompt = "Revise the content according to the provided human feedback. Apply all suggested changes while maintaining overall coherence.";
        revisionPrompt += "\n\nOriginal Content:";
        revisionPrompt += "\n" + content;
        revisionPrompt += "\n\nHuman Feedback:";
        revisionPrompt += "\n" + humanFeedback;
        revisionPrompt += "\n\nProvide the fully revised content without explanations.";
        messages.push(new messages_1.HumanMessage(revisionPrompt));
        const response = await llm.invoke(messages);
        messages.push(response);
        // Update the content with the revised version
        return {
            ...state,
            messages,
            content: response.content.toString()
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error applying revisions: ${error.message}`
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
            temperature: 0.2 // Lower temperature for analysis
        });
    }
    else {
        return new openai_1.ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
            temperature: 0.2 // Lower temperature for analysis
        });
    }
}
// FeedbackAgent class
class FeedbackAgent {
    constructor(config = {}) {
        this.config = {
            model: config.model || 'claude',
            apiKey: config.apiKey || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY,
            feedbackDir: config.feedbackDir || './feedback_data',
            approvalRequired: config.approvalRequired !== undefined ? config.approvalRequired : true,
            autoApplyFeedback: config.autoApplyFeedback || false,
            ...config
        };
        // Initialize the StateGraph
        this.graph = new langgraph_1.StateGraph({
            channels: { messages: messages_1.BaseMessage }
        });
        // Add nodes
        this.graph.addNode("analyze_content", analyzeContent);
        this.graph.addNode("generate_revision_suggestions", generateRevisionSuggestions);
        this.graph.addNode("save_feedback", saveFeedback);
        this.graph.addNode("wait_for_human_feedback", waitForHumanFeedback);
        this.graph.addNode("apply_revisions", applyRevisions);
        // Define the basic edges
        this.graph.addEdge("analyze_content", "generate_revision_suggestions");
        this.graph.addEdge("generate_revision_suggestions", "save_feedback");
        // Conditional edges based on approval requirements
        if (this.config.approvalRequired) {
            this.graph.addEdge("save_feedback", "wait_for_human_feedback");
            if (this.config.autoApplyFeedback) {
                this.graph.addEdge("wait_for_human_feedback", "apply_revisions");
            }
        }
        // Compile the graph
        this.graph.compile();
    }
    async evaluateContent(content, styleProfile) {
        const initialState = {
            messages: [
                new messages_1.HumanMessage("You are a feedback agent specialized in evaluating content against specific style profiles. Your goal is to ensure content authentically matches the target style and voice.")
            ],
            content,
            style_profile: styleProfile
        };
        try {
            const result = await this.graph.invoke(initialState);
            return {
                success: !result.error,
                feedback: result.feedback,
                revisions: result.revisions,
                human_feedback: result.human_feedback,
                approved: result.approved,
                revised_content: result.content !== content ? result.content : undefined,
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
}
exports.FeedbackAgent = FeedbackAgent;
// Factory function to initialize the FeedbackAgent
async function initFeedbackAgent(config = {}) {
    return new FeedbackAgent(config);
}
exports.initFeedbackAgent = initFeedbackAgent;
