import { StateGraph } from '@langchain/langgraph';
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';

// Generation Agent Types
interface GenerationAgentConfig {
  model: string;
  apiKey?: string;
  styleProfilePath?: string;
  outputDir?: string;
  formatOptions?: string[];
}

interface GenerationState {
  messages: BaseMessage[];
  topic?: string;
  style_profile?: any;
  content_brief?: string;
  draft?: string;
  revised_draft?: string;
  output_format?: string;
  error?: string;
}

// Tool for loading style profiles
class LoadStyleProfileTool extends StructuredTool {
  name = "load_style_profile";
  description = "Load a style profile from the file system";
  schema = {
    type: "object",
    properties: {
      profilePath: {
        type: "string",
        description: "Path to the style profile JSON file"
      }
    },
    required: ["profilePath"]
  };
  
  async _call({ profilePath }) {
    try {
      const profileData = await fs.readFile(profilePath, 'utf-8');
      return profileData;
    } catch (error) {
      throw new Error(`Failed to load style profile: ${error.message}`);
    }
  }
}

// Node functions for the GenerationAgent graph
async function loadStyleProfile(state: GenerationState): Promise<GenerationState> {
  try {
    const messages = [...state.messages];
    const config = state as unknown as GenerationAgentConfig;
    
    if (!config.styleProfilePath) {
      return {
        ...state,
        error: "No style profile path specified"
      };
    }
    
    const loadTool = new LoadStyleProfileTool();
    const profileData = await loadTool.call({ profilePath: config.styleProfilePath });
    const styleProfile = JSON.parse(profileData);
    
    messages.push(new AIMessage(`Loaded style profile with ${Object.keys(styleProfile).length} attributes`));
    
    return {
      ...state,
      messages,
      style_profile: styleProfile
    };
  } catch (error) {
    return {
      ...state,
      error: `Error loading style profile: ${error.message}`
    };
  }
}

async function createContentBrief(state: GenerationState): Promise<GenerationState> {
  try {
    const messages = [...state.messages];
    const llm = initializeLLM(state);
    const topic = state.topic;
    const styleProfile = state.style_profile;
    
    if (!topic) {
      return {
        ...state,
        error: "No topic specified for content generation"
      };
    }
    
    if (!styleProfile) {
      return {
        ...state,
        error: "No style profile available for generation"
      };
    }
    
    // Create a prompt for the content brief
    messages.push(new HumanMessage(`Create a detailed content brief for a piece about "${topic}". Use the style profile's characteristics to inform the structure, tone, language patterns, and approach. The brief should include key points to cover, structure, tone guidance, and specific style elements to incorporate.`));
    
    const response = await llm.invoke(messages);
    messages.push(response);
    
    return {
      ...state,
      messages,
      content_brief: response.content.toString()
    };
  } catch (error) {
    return {
      ...state,
      error: `Error creating content brief: ${error.message}`
    };
  }
}

async function generateInitialDraft(state: GenerationState): Promise<GenerationState> {
  try {
    const messages = [...state.messages];
    const llm = initializeLLM(state);
    const topic = state.topic;
    const styleProfile = state.style_profile;
    const contentBrief = state.content_brief;
    const outputFormat = state.output_format || "markdown";
    
    // Comprehensive system message with style profile details
    let stylePrompt = "Generate content that exactly matches this style profile:\n\n";
    
    // Add style profile details
    Object.entries(styleProfile).forEach(([key, value]) => {
      if (key !== 'raw_profile') {
        stylePrompt += `${key}: ${JSON.stringify(value)}\n`;
      }
    });
    
    // Add content brief
    stylePrompt += `\nContent Brief:\n${contentBrief}\n\n`;
    
    // Add output format instructions
    stylePrompt += `Generate the content in ${outputFormat} format. Focus on perfectly matching the voice, tone, pacing, word choice, and sentence structures described in the style profile.`;
    
    messages.push(new HumanMessage(stylePrompt));
    
    const response = await llm.invoke(messages);
    messages.push(response);
    
    return {
      ...state,
      messages,
      draft: response.content.toString()
    };
  } catch (error) {
    return {
      ...state,
      error: `Error generating initial draft: ${error.message}`
    };
  }
}

async function refineContent(state: GenerationState): Promise<GenerationState> {
  try {
    const messages = [...state.messages];
    const llm = initializeLLM(state);
    const draft = state.draft;
    const styleProfile = state.style_profile;
    
    if (!draft) {
      return {
        ...state,
        error: "No draft available to refine"
      };
    }
    
    // Create a prompt for refining the content
    let refinePrompt = "Refine the draft to perfect the style match. Specifically:\n\n";
    
    // Add specific refinement instructions based on style profile
    if (styleProfile.tone) {
      refinePrompt += `1. Adjust the tone to more precisely match: ${JSON.stringify(styleProfile.tone)}\n`;
    }
    
    if (styleProfile.sentence_structure) {
      refinePrompt += `2. Revise sentence structures to match: ${JSON.stringify(styleProfile.sentence_structure)}\n`;
    }
    
    if (styleProfile.word_choice) {
      refinePrompt += `3. Replace words/phrases to better align with: ${JSON.stringify(styleProfile.word_choice)}\n`;
    }
    
    refinePrompt += "\nDon't explain your changes - just provide the refined content in the same format as the original.";
    
    messages.push(new HumanMessage(refinePrompt));
    
    const response = await llm.invoke(messages);
    messages.push(response);
    
    return {
      ...state,
      messages,
      revised_draft: response.content.toString()
    };
  } catch (error) {
    return {
      ...state,
      error: `Error refining content: ${error.message}`
    };
  }
}

async function saveGeneratedContent(state: GenerationState): Promise<GenerationState> {
  try {
    const messages = [...state.messages];
    const revisedDraft = state.revised_draft || state.draft;
    const topic = state.topic;
    const outputFormat = state.output_format || "markdown";
    const config = state as unknown as GenerationAgentConfig;
    
    if (!revisedDraft) {
      return {
        ...state,
        error: "No content available to save"
      };
    }
    
    // Create a safe filename from the topic
    const safeFilename = topic
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    
    // Determine file extension based on format
    const fileExtension = outputFormat === 'markdown' ? 'md' : 
                         outputFormat === 'html' ? 'html' : 'txt';
    
    const outputDir = config.outputDir || './generated_content';
    
    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `${safeFilename}_${timestamp}.${fileExtension}`);
    
    // Save content
    await fs.writeFile(outputPath, revisedDraft);
    
    return {
      ...state,
      messages: [
        ...messages,
        new AIMessage(`Content saved to ${outputPath}`)
      ]
    };
  } catch (error) {
    return {
      ...state,
      error: `Error saving content: ${error.message}`
    };
  }
}

// Helper functions
function initializeLLM(state: GenerationState) {
  const config = state as unknown as GenerationAgentConfig;
  
  // Default to Claude if available, otherwise OpenAI
  if (config.model.includes('claude') || process.env.CLAUDE_API_KEY) {
    return new ChatAnthropic({
      apiKey: process.env.CLAUDE_API_KEY,
      model: "claude-3-opus-20240229",
      temperature: 0.7 // Higher temperature for creativity
    });
  } else {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o",
      temperature: 0.7 // Higher temperature for creativity
    });
  }
}

// GenerationAgent class
export class GenerationAgent {
  private graph: StateGraph<GenerationState>;
  private config: GenerationAgentConfig;
  
  constructor(config: Partial<GenerationAgentConfig> = {}) {
    this.config = {
      model: config.model || 'claude',
      apiKey: config.apiKey || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY,
      styleProfilePath: config.styleProfilePath,
      outputDir: config.outputDir || './generated_content',
      formatOptions: config.formatOptions || ['markdown', 'html', 'text'],
      ...config
    };
    
    // Initialize the StateGraph
    this.graph = new StateGraph<GenerationState>({
      channels: { messages: BaseMessage }
    });
    
    // Add nodes
    this.graph.addNode("load_style_profile", loadStyleProfile);
    this.graph.addNode("create_content_brief", createContentBrief);
    this.graph.addNode("generate_initial_draft", generateInitialDraft);
    this.graph.addNode("refine_content", refineContent);
    this.graph.addNode("save_generated_content", saveGeneratedContent);
    
    // Define the edges
    this.graph.addEdge("load_style_profile", "create_content_brief");
    this.graph.addEdge("create_content_brief", "generate_initial_draft");
    this.graph.addEdge("generate_initial_draft", "refine_content");
    this.graph.addEdge("refine_content", "save_generated_content");
    
    // Compile the graph
    this.graph.compile();
  }
  
  async generateContent(topic: string, options: { 
    styleProfilePath?: string, 
    outputFormat?: string 
  } = {}): Promise<any> {
    // Override config with options if provided
    const styleProfilePath = options.styleProfilePath || this.config.styleProfilePath;
    
    if (!styleProfilePath) {
      return {
        success: false,
        error: "No style profile path specified"
      };
    }
    
    const initialState: GenerationState = {
      messages: [
        new HumanMessage("You are a content generation agent specialized in mimicking specific writing styles and voices. Your goal is to create content that's indistinguishable from the original author's style.")
      ],
      topic,
      output_format: options.outputFormat || "markdown"
    };
    
    // Add config properties to state to make them available in node functions
    const stateWithConfig = {
      ...initialState,
      styleProfilePath
    };
    
    try {
      const result = await this.graph.invoke(stateWithConfig);
      return {
        success: !result.error,
        content_brief: result.content_brief,
        draft: result.draft,
        revised_draft: result.revised_draft,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Factory function to initialize the GenerationAgent
export async function initGenerationAgent(config: Partial<GenerationAgentConfig> = {}): Promise<GenerationAgent> {
  return new GenerationAgent(config);
}