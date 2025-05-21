"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initReasoningAgent = exports.ReasoningAgent = void 0;
const langgraph_1 = require("@langchain/langgraph");
const anthropic_1 = require("@langchain/anthropic");
const openai_1 = require("@langchain/openai");
const messages_1 = require("@langchain/core/messages");
const tools_1 = require("@langchain/core/tools");
// Tool for retrieving relevant information from vector store
class RetrieveContextTool extends tools_1.StructuredTool {
    constructor() {
        super(...arguments);
        this.name = "retrieve_context";
        this.description = "Retrieve relevant information from the knowledge base related to the topic";
        this.schema = {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The query to search for in the knowledge base"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of results to return"
                }
            },
            required: ["query"]
        };
    }
    // Mock implementation - would connect to actual vector DB
    async _call({ query, limit = 5 }) {
        // This would be replaced with actual vector store query
        console.log(`Retrieving context for: ${query} (limit: ${limit})`);
        return JSON.stringify([
            { text: "Sample context 1 relevant to the query", source: "document1.txt" },
            { text: "Sample context 2 relevant to the query", source: "document2.txt" }
        ]);
    }
}
// Node functions for the ReasoningAgent graph
async function initializeReasoning(state) {
    const messages = [...state.messages];
    const topic = state.topic;
    if (!topic) {
        return {
            ...state,
            error: "No topic specified for reasoning"
        };
    }
    messages.push(new messages_1.HumanMessage(`I need to reason about the following topic: ${topic}`));
    return {
        ...state,
        messages,
        iteration: 1,
        reasoning_steps: []
    };
}
async function retrieveRelevantContext(state) {
    try {
        const messages = [...state.messages];
        const topic = state.topic;
        // Use the RetrieveContextTool to get relevant information
        const retrieveTool = new RetrieveContextTool();
        const contextResults = await retrieveTool.call({ query: topic, limit: 10 });
        // Parse the JSON results
        const context = JSON.parse(contextResults);
        messages.push(new messages_1.AIMessage(`Retrieved ${context.length} relevant documents.`));
        return {
            ...state,
            messages,
            context
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error retrieving context: ${error.message}`
        };
    }
}
async function performReasoningStep(state) {
    try {
        const messages = [...state.messages];
        const llm = initializeLLM(state);
        const iteration = state.iteration || 1;
        const reasoning_steps = state.reasoning_steps || [];
        // Generate the prompt for this reasoning step
        messages.push(new messages_1.HumanMessage(`For reasoning step ${iteration}, analyze the available information and determine the next logical conclusion or question to explore. Focus on being thorough and systematic in your analysis.`));
        const response = await llm.invoke(messages);
        messages.push(response);
        // Extract and store the reasoning step
        reasoning_steps.push({
            step: iteration,
            content: response.content.toString()
        });
        return {
            ...state,
            messages,
            reasoning_steps,
            iteration: iteration + 1
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error in reasoning step: ${error.message}`
        };
    }
}
async function checkReasoningCompletion(state) {
    const iteration = state.iteration || 1;
    const maxIterations = state.maxIterations || 5;
    // If we've reached the maximum iterations or have an error, move to conclusion
    if (iteration > maxIterations || state.error) {
        return { ...state, conclusion: "ready_for_conclusion" };
    }
    return { ...state };
}
async function formConclusion(state) {
    try {
        const messages = [...state.messages];
        const llm = initializeLLM(state);
        const reasoning_steps = state.reasoning_steps || [];
        messages.push(new messages_1.HumanMessage("Based on all the reasoning steps and analysis performed, synthesize a comprehensive conclusion. Include key insights, any uncertainties, and potential next steps for further investigation."));
        const response = await llm.invoke(messages);
        messages.push(response);
        return {
            ...state,
            messages,
            conclusion: response.content.toString()
        };
    }
    catch (error) {
        return {
            ...state,
            error: `Error forming conclusion: ${error.message}`
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
            temperature: 0.1 // Lower temperature for reasoning
        });
    }
    else {
        return new openai_1.ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
            temperature: 0.1 // Lower temperature for reasoning
        });
    }
}
// ReasoningAgent class
class ReasoningAgent {
    constructor(config = {}) {
        this.config = {
            model: config.model || 'claude',
            apiKey: config.apiKey || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY,
            storageType: config.storageType || 'local',
            maxIterations: config.maxIterations || 5,
            ...config
        };
        // Initialize the StateGraph
        this.graph = new langgraph_1.StateGraph({
            channels: { messages: messages_1.BaseMessage }
        });
        // Add nodes
        this.graph.addNode("initialize_reasoning", initializeReasoning);
        this.graph.addNode("retrieve_context", retrieveRelevantContext);
        this.graph.addNode("perform_reasoning_step", performReasoningStep);
        this.graph.addNode("check_reasoning_completion", checkReasoningCompletion);
        this.graph.addNode("form_conclusion", formConclusion);
        // Define the edges
        this.graph.addEdge("initialize_reasoning", "retrieve_context");
        this.graph.addEdge("retrieve_context", "perform_reasoning_step");
        // Add conditional edges
        this.graph.addConditionalEdges("perform_reasoning_step", (state) => {
            if (state.conclusion === "ready_for_conclusion") {
                return "form_conclusion";
            }
            else {
                return "check_reasoning_completion";
            }
        }, {
            "check_reasoning_completion": "Check if reasoning process should continue",
            "form_conclusion": "Move to forming a conclusion"
        });
        this.graph.addConditionalEdges("check_reasoning_completion", (state) => {
            if (state.conclusion === "ready_for_conclusion") {
                return "form_conclusion";
            }
            else {
                return "perform_reasoning_step";
            }
        }, {
            "perform_reasoning_step": "Continue with another reasoning step",
            "form_conclusion": "Move to forming a conclusion"
        });
        // Compile the graph
        this.graph.compile();
    }
    async reason(topic) {
        const initialState = {
            messages: [
                new messages_1.HumanMessage("You are a reasoning agent specialized in critical thinking, logical analysis, and systematic reasoning. Your role is to analyze topics deeply, considering multiple perspectives and evidence.")
            ],
            topic
        };
        try {
            const result = await this.graph.invoke(initialState);
            return {
                success: !result.error,
                reasoning_steps: result.reasoning_steps,
                conclusion: result.conclusion,
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
exports.ReasoningAgent = ReasoningAgent;
// Factory function to initialize the ReasoningAgent
async function initReasoningAgent(config = {}) {
    return new ReasoningAgent(config);
}
exports.initReasoningAgent = initReasoningAgent;
