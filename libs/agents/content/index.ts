import { StateGraph, Thing } from '@langchain/langgraph';
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';

// Content Agent Types
interface ContentAgentConfig {
  model: string;
  apiKey?: string;
  storageType: 'chroma' | 'pinecone' | 'local';
  vectorDbKey?: string;
  transcriptDir?: string;
  processedDir?: string;
}

interface ContentState {
  messages: BaseMessage[];
  current_file?: string;
  extracted_content?: any;
  style_profile?: any;
  error?: string;
}

// Node functions for the ContentAgent graph
async function ingestTranscript(state: ContentState): Promise<ContentState> {
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
    
    messages.push(new HumanMessage(`I need to analyze the following transcript: ${content}`));
    
    return {
      ...state,
      messages
    };
  } catch (error) {
    return {
      ...state,
      error: `Error ingesting transcript: ${error.message}`
    };
  }
}

async function analyzeContent(state: ContentState): Promise<ContentState> {
  try {
    const messages = [...state.messages];
    const llm = initializeLLM(state);
    
    messages.push(new HumanMessage("Extract the key concepts, themes, and unique language patterns from this transcript. Focus on identifying the speaker's unique voice, terminology, metaphors, and teaching approaches."));
    
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
  } catch (error) {
    return {
      ...state,
      error: `Error analyzing content: ${error.message}`
    };
  }
}

async function extractStyleProfile(state: ContentState): Promise<ContentState> {
  try {
    const messages = [...state.messages];
    const llm = initializeLLM(state);
    
    messages.push(new HumanMessage("Based on the analysis, create a comprehensive style profile that captures this person's unique voice, including tone, pacing, word choice, sentence structure, and rhetorical devices. Structure this as a JSON object with the following keys: tone, pacing, word_choice, sentence_structure, rhetorical_devices, and unique_patterns."));
    
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
      } catch (e) {
        console.warn("Failed to parse JSON from response, using raw text");
        styleProfile = { raw_profile: responseText };
      }
    } else {
      styleProfile = { raw_profile: responseText };
    }
    
    return {
      ...state,
      messages,
      style_profile: styleProfile
    };
  } catch (error) {
    return {
      ...state,
      error: `Error extracting style profile: ${error.message}`
    };
  }
}

async function saveProcessedContent(state: ContentState): Promise<ContentState> {
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
        new AIMessage(`Style profile saved to ${outputPath}`)
      ]
    };
  } catch (error) {
    return {
      ...state,
      error: `Error saving processed content: ${error.message}`
    };
  }
}

// Helper functions
function initializeLLM(state: ContentState) {
  const config = state as unknown as ContentAgentConfig;
  
  // Default to Claude if available, otherwise OpenAI
  if (config.model.includes('claude') || process.env.CLAUDE_API_KEY) {
    return new ChatAnthropic({
      apiKey: process.env.CLAUDE_API_KEY,
      model: "claude-3-opus-20240229",
      temperature: 0.3
    });
  } else {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o",
      temperature: 0.3
    });
  }
}

// ContentAgent class
export class ContentAgent {
  private graph: StateGraph<ContentState>;
  private config: ContentAgentConfig;
  
  constructor(config: Partial<ContentAgentConfig> = {}) {
    this.config = {
      model: config.model || 'claude',
      apiKey: config.apiKey || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY,
      storageType: config.storageType || 'local',
      transcriptDir: config.transcriptDir || './transcripts',
      processedDir: config.processedDir || './processed_transcripts',
      ...config
    };
    
    // Initialize the StateGraph
    this.graph = new StateGraph<ContentState>({ 
      channels: { messages: BaseMessage }
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
  
  async processTranscript(filePath: string): Promise<any> {
    const initialState: ContentState = {
      messages: [
        new HumanMessage("You are a content analysis agent specialized in understanding writing styles, voices, and teaching approaches. Your task is to analyze transcripts and extract the unique style and voice of the speaker.")
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
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async processMultipleTranscripts(directoryOrFiles: string | string[]): Promise<any[]> {
    let files: string[] = [];
    
    if (typeof directoryOrFiles === 'string') {
      // Process directory
      const entries = await fs.readdir(directoryOrFiles, { withFileTypes: true });
      files = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.txt'))
        .map(entry => path.join(directoryOrFiles, entry.name));
    } else {
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

// Factory function to initialize the ContentAgent
export async function initContentAgent(config: Partial<ContentAgentConfig> = {}): Promise<ContentAgent> {
  return new ContentAgent(config);
}