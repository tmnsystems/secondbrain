import { v4 as uuidv4 } from 'uuid';
import { 
  AgentConfig, 
  AgentHealth, 
  AgentInfo, 
  Capability,
  Task,
  TaskResult
} from './types';
import { createLogger, logger } from './logger';

/**
 * Base interface for all agents in the system
 */
export interface Agent {
  /**
   * Initialize the agent
   */
  initialize(): Promise<void>;
  
  /**
   * Get information about the agent
   */
  getInfo(): AgentInfo;
  
  /**
   * Get the agent's health status
   */
  getHealth(): Promise<AgentHealth>;
  
  /**
   * Get the capabilities provided by this agent
   */
  getCapabilities(): Capability[];
  
  /**
   * Execute a task using this agent
   * @param task The task to execute
   */
  executeTask(task: Task): Promise<TaskResult>;
  
  /**
   * Shutdown the agent
   */
  shutdown(): Promise<void>;
}

/**
 * Abstract base class that implements common agent functionality
 */
export abstract class AbstractAgent implements Agent {
  /** Agent ID */
  protected id: string;
  
  /** Agent type */
  protected type: string;
  
  /** Agent name */
  protected name: string;
  
  /** Agent config */
  protected config: AgentConfig;
  
  /** Agent logger */
  protected logger: ReturnType<typeof createLogger>;
  
  /** Agent status */
  protected status: 'online' | 'busy' | 'offline' | 'error';
  
  /** Task metrics */
  protected metrics: {
    taskCount: number;
    successfulTasks: number;
    failedTasks: number;
    totalDuration: number;
  };
  
  /** Start time */
  protected startTime: Date;
  
  /** Last seen time */
  protected lastSeenTime: string;
  
  /**
   * Create a new AbstractAgent
   * @param type The type of agent
   * @param config Agent configuration
   */
  constructor(type: string, config: AgentConfig) {
    this.id = config.agentId || uuidv4();
    this.type = type;
    this.name = `${type}-${this.id.substring(0, 8)}`;
    this.config = config;
    this.logger = createLogger({
      level: config.logLevel || 'info',
      service: this.name
    });
    this.status = 'offline';
    this.metrics = {
      taskCount: 0,
      successfulTasks: 0,
      failedTasks: 0,
      totalDuration: 0
    };
    this.startTime = new Date();
    this.lastSeenTime = new Date().toISOString();
  }
  
  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    this.status = 'online';
    this.logger.info(`Agent ${this.name} initialized`);
  }
  
  /**
   * Get information about the agent
   */
  getInfo(): AgentInfo {
    this.lastSeenTime = new Date().toISOString();
    
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      capabilities: this.getCapabilities().map(c => c.name),
      loadFactor: this.calculateLoadFactor(),
      taskCount: this.metrics.taskCount,
      successRate: this.calculateSuccessRate(),
      averageTaskDuration: this.calculateAverageTaskDuration(),
      lastSeenTime: this.lastSeenTime
    };
  }
  
  /**
   * Get the agent's health status
   */
  async getHealth(): Promise<AgentHealth> {
    this.lastSeenTime = new Date().toISOString();
    
    return {
      status: 'healthy',
      details: {
        taskCount: this.metrics.taskCount,
        uptime: Date.now() - this.startTime.getTime()
      }
    };
  }
  
  /**
   * Execute a task using this agent
   * @param task The task to execute
   */
  async executeTask(task: Task): Promise<TaskResult> {
    this.status = 'busy';
    this.metrics.taskCount++;
    this.lastSeenTime = new Date().toISOString();
    
    this.logger.info(`Executing task: ${task.id} - ${task.name}`);
    
    const startTime = Date.now();
    
    try {
      const result = await this.performTask(task);
      const duration = Date.now() - startTime;
      
      this.metrics.successfulTasks++;
      this.metrics.totalDuration += duration;
      this.status = 'online';
      
      return {
        taskId: task.id,
        success: true,
        data: result,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.metrics.failedTasks++;
      this.metrics.totalDuration += duration;
      this.status = 'online';
      
      this.logger.error(`Task failed: ${task.id}`, { error });
      
      // Handle the error object safely
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof Error && 'code' in error ? (error as any).code : undefined;
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      return {
        taskId: task.id,
        success: false,
        error: {
          message: errorMessage || 'Unknown error',
          code: errorCode,
          stack: errorStack
        },
        duration
      };
    }
  }
  
  /**
   * Shutdown the agent
   */
  async shutdown(): Promise<void> {
    this.status = 'offline';
    this.logger.info(`Agent ${this.name} shutdown`);
  }
  
  /**
   * Calculate the agent's load factor (0-1)
   */
  protected calculateLoadFactor(): number {
    // Default implementation - override in specific agents
    return this.status === 'busy' ? 1 : 0;
  }
  
  /**
   * Calculate the agent's success rate
   */
  protected calculateSuccessRate(): number {
    if (this.metrics.taskCount === 0) return 1;
    return this.metrics.successfulTasks / this.metrics.taskCount;
  }
  
  /**
   * Calculate the average task duration
   */
  protected calculateAverageTaskDuration(): number {
    if (this.metrics.taskCount === 0) return 0;
    return this.metrics.totalDuration / this.metrics.taskCount;
  }
  
  /**
   * Abstract method to perform the actual task
   * Must be implemented by subclasses
   */
  protected abstract performTask(task: Task): Promise<any>;
  
  /**
   * Abstract method to get agent capabilities
   * Must be implemented by subclasses
   */
  abstract getCapabilities(): Capability[];
}