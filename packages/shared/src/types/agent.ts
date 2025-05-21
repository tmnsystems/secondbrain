/**
 * Agent-related types for SecondBrain project
 */

export enum AgentType {
  PLANNER = 'planner',
  EXECUTOR = 'executor',
  REVIEWER = 'reviewer',
  REFACTOR = 'refactor',
  BUILD = 'build',
  ORCHESTRATOR = 'orchestrator',
  NOTION = 'notion'
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
  error?: Error;
}

export interface Agent {
  config: AgentConfig;
  process(input: any): Promise<AgentResult>;
  getName(): string;
  getType(): AgentType;
}