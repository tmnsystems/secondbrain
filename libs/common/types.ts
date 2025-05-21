/**
 * Common type definitions for the SecondBrain system
 */

/**
 * Base configuration for all agents
 */
export interface AgentConfig {
  /**
   * Log level for the agent
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  /**
   * Unique identifier for the agent instance
   */
  agentId?: string;
  
  /**
   * Directory for agent data
   */
  dataDir?: string;
  
  /**
   * Whether to enable verbose mode
   */
  verbose?: boolean;
}

/**
 * Base interface for all task definitions
 */
export interface Task {
  /**
   * Unique identifier for the task
   */
  id: string;
  
  /**
   * Task name
   */
  name: string;
  
  /**
   * Task description
   */
  description?: string;
  
  /**
   * Task type
   */
  type: string;
  
  /**
   * Task input data
   */
  input?: Record<string, any>;
  
  /**
   * Task priority
   */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  
  /**
   * Other tasks that must be completed before this task
   */
  dependencies?: string[];
  
  /**
   * Estimated time to complete the task (in minutes)
   */
  estimatedDuration?: number;
  
  /**
   * Additional metadata for the task
   */
  metadata?: Record<string, any>;
}

/**
 * Status of a task
 */
export interface TaskStatus {
  /**
   * Task ID
   */
  id: string;
  
  /**
   * Current status
   */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  
  /**
   * Progress percentage (0-100)
   */
  progress?: number;
  
  /**
   * Result of the task if completed
   */
  result?: any;
  
  /**
   * Error details if failed
   */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  
  /**
   * Start time
   */
  startTime?: string;
  
  /**
   * End time
   */
  endTime?: string;
}

/**
 * Result of task execution
 */
export interface TaskResult<T = any> {
  /**
   * Task ID
   */
  taskId: string;
  
  /**
   * Whether the task was successful
   */
  success: boolean;
  
  /**
   * Task output data
   */
  data?: T;
  
  /**
   * Error information if not successful
   */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  
  /**
   * Execution duration in milliseconds
   */
  duration: number;
  
  /**
   * Execution metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Agent capability definition
 */
export interface Capability {
  /**
   * Name of the capability
   */
  name: string;
  
  /**
   * Description of what the capability does
   */
  description: string;
  
  /**
   * Parameters the capability accepts
   */
  parameters?: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: any;
  }>;
  
  /**
   * Result schema for the capability
   */
  result?: {
    type: string;
    description: string;
    properties?: Record<string, {
      type: string;
      description: string;
    }>;
  };
}

/**
 * Agent health status
 */
export interface AgentHealth {
  /**
   * Agent status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /**
   * Detailed health information
   */
  details?: {
    memory?: number;
    cpu?: number;
    taskCount?: number;
    queueDepth?: number;
    uptime?: number;
  };
  
  /**
   * Status message
   */
  message?: string;
}

/**
 * Agent information
 */
export interface AgentInfo {
  /**
   * Agent ID
   */
  id: string;
  
  /**
   * Agent name
   */
  name: string;
  
  /**
   * Agent type
   */
  type: string;
  
  /**
   * Agent status
   */
  status: 'online' | 'busy' | 'offline' | 'error';
  
  /**
   * List of capabilities this agent provides
   */
  capabilities: string[];
  
  /**
   * Load factor (0-1 where 1 is fully loaded)
   */
  loadFactor: number;
  
  /**
   * Number of tasks currently assigned
   */
  taskCount: number;
  
  /**
   * Success rate of tasks
   */
  successRate: number;
  
  /**
   * Average task duration in milliseconds
   */
  averageTaskDuration: number;
  
  /**
   * ISO timestamp when the agent was last seen
   */
  lastSeenTime: string;
}