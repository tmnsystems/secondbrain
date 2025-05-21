/**
 * SecondBrain Agent System
 * 
 * This is the entry point for the multi-agent architecture that powers
 * the SecondBrain system. It coordinates specialized agents for content
 * processing, reasoning, and generation tasks using LangGraph.
 */

// Re-export planner agent (existing)
export * from './planner';

// Re-export our new LangGraph-based agents
export * from './content';
export * from './reasoning';
export * from './generation';
export * from './feedback';

// Deer-Flow integration
export * from './deerflow';
export * from './explainer';
// Claude Code Assistant (strict policy wrapper)
export * from './claude-assistant';
// Agent type definitions
export interface AgentDescriptor {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

// Return information about all available agents
export function getAvailableAgents(): AgentDescriptor[] {
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
    },
    {
      name: 'DeerFlowAgent',
      version: '0.1.0',
      description: 'ByteDance Deer-Flow multi-agent orchestration',
      capabilities: ['Workflow orchestration']
    },
    {
      name: 'ExplainerAgent',
      version: '0.1.0',
      description: 'Provides detailed step-by-step explanations using OpenAI 4o',
      capabilities: ['Explanation generation']
    }
  ];
}

/**
 * Initialize the full agent system
 */
export async function initializeAgents(config: any = {}) {
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
  const contentAgent = await import('./content').then(module => module.initContentAgent(finalConfig));
  const reasoningAgent = await import('./reasoning').then(module => module.initReasoningAgent(finalConfig));
  const generationAgent = await import('./generation').then(module => module.initGenerationAgent(finalConfig));
  const feedbackAgent = await import('./feedback').then(module => module.initFeedbackAgent(finalConfig));
  const deerFlowAgent = await import('./deerflow').then(module => module.initDeerFlowAgent(finalConfig));
  const explainerAgent = await import('./explainer').then(module => module.initExplainerAgent(finalConfig));
  
  return {
    status: 'initialized',
    agents: [
      'planner',
      'content',
      'reasoning',
      'generation',
      'feedback',
      'deerflow',
      'explainer'
    ],
    contentAgent,
    reasoningAgent,
    generationAgent,
    feedbackAgent,
    deerFlowAgent,
    explainerAgent,
    config: finalConfig
  };
}