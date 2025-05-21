/**
 * Executor-Planner Integration
 * 
 * This module demonstrates how the Executor Agent integrates with the Planner Agent
 * to execute tasks based on project plans.
 */

import { PlannerAgent } from '../planner';
import { ExecutorAgent } from '../executor';
import { EventEmitter } from 'events';

// Task status types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

// Task interface between Planner and Executor
export interface Task {
  id: string;
  name: string;
  description: string;
  type: 'shell' | 'git' | 'deploy' | 'test' | 'monitor';
  command: string;
  options: any;
  dependencies?: string[];
  status: TaskStatus;
  result?: {
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
  };
}

export class ExecutorPlannerIntegration extends EventEmitter {
  private planner: PlannerAgent;
  private executor: ExecutorAgent;
  private taskQueue: Task[] = [];
  private isRunning: boolean = false;
  
  constructor(planner: PlannerAgent, executor: ExecutorAgent) {
    super();
    this.planner = planner;
    this.executor = executor;
  }
  
  /**
   * Run tasks from a plan created by the Planner Agent
   */
  async runPlan(planId: string, options: { 
    sequential?: boolean, 
    stopOnFailure?: boolean 
  } = {}) {
    const { sequential = true, stopOnFailure = true } = options;
    
    // Get plan from the Planner Agent
    const plan = await this.planner.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }
    
    // Add tasks to the queue
    this.taskQueue = [...this.taskQueue, ...plan.tasks];
    
    // Start execution if not already running
    if (!this.isRunning) {
      this.isRunning = true;
      
      if (sequential) {
        await this.runTasksSequentially(stopOnFailure);
      } else {
        await this.runTasksConcurrently(stopOnFailure);
      }
      
      this.isRunning = false;
    }
    
    // Return updated plan
    return await this.planner.getPlan(planId);
  }
  
  /**
   * Run tasks one after another
   */
  private async runTasksSequentially(stopOnFailure: boolean) {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) continue;
      
      // Mark task as in progress
      task.status = 'in_progress';
      this.emit('taskStarted', task);
      
      try {
        // Execute the task
        const result = await this.executeTask(task);
        
        // Update task status
        task.status = result.success ? 'completed' : 'failed';
        task.result = result;
        
        // Emit task update event
        this.emit('taskUpdated', task);
        
        // Stop on failure if configured
        if (!result.success && stopOnFailure) {
          break;
        }
      } catch (error: any) {
        // Handle execution errors
        task.status = 'failed';
        task.result = {
          success: false,
          output: '',
          error: error.message,
          executionTime: 0
        };
        
        this.emit('taskError', task, error);
        
        if (stopOnFailure) {
          break;
        }
      }
    }
  }
  
  /**
   * Run tasks concurrently if they don't have dependencies
   */
  private async runTasksConcurrently(stopOnFailure: boolean) {
    // Group tasks by their dependencies
    const tasksByLevel = this.groupTasksByDependencyLevel();
    
    // Execute tasks level by level
    for (const levelTasks of tasksByLevel) {
      // Run all tasks at this level concurrently
      const results = await Promise.all(
        levelTasks.map(async (task) => {
          task.status = 'in_progress';
          this.emit('taskStarted', task);
          
          try {
            const result = await this.executeTask(task);
            task.status = result.success ? 'completed' : 'failed';
            task.result = result;
            this.emit('taskUpdated', task);
            return { task, success: result.success };
          } catch (error: any) {
            task.status = 'failed';
            task.result = {
              success: false,
              output: '',
              error: error.message,
              executionTime: 0
            };
            this.emit('taskError', task, error);
            return { task, success: false };
          }
        })
      );
      
      // Check if any tasks failed
      if (stopOnFailure && results.some(r => !r.success)) {
        break;
      }
    }
    
    // Clear the task queue since we've processed everything
    this.taskQueue = [];
  }
  
  /**
   * Group tasks by their dependency levels for concurrent execution
   */
  private groupTasksByDependencyLevel(): Task[][] {
    const result: Task[][] = [];
    const taskMap = new Map<string, Task>();
    const visited = new Set<string>();
    
    // Create a map of tasks by ID
    for (const task of this.taskQueue) {
      taskMap.set(task.id, task);
    }
    
    // Helper function to get task level recursively
    const getTaskLevel = (task: Task, levelMap: Map<string, number>) => {
      if (levelMap.has(task.id)) {
        return levelMap.get(task.id)!;
      }
      
      if (visited.has(task.id)) {
        throw new Error(`Circular dependency detected for task ${task.id}`);
      }
      
      visited.add(task.id);
      
      let maxLevel = 0;
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          const dependency = taskMap.get(depId);
          if (!dependency) {
            throw new Error(`Dependency ${depId} not found for task ${task.id}`);
          }
          
          const depLevel = getTaskLevel(dependency, levelMap);
          maxLevel = Math.max(maxLevel, depLevel + 1);
        }
      }
      
      levelMap.set(task.id, maxLevel);
      visited.delete(task.id);
      return maxLevel;
    };
    
    // Calculate level for each task
    const levelMap = new Map<string, number>();
    for (const task of this.taskQueue) {
      getTaskLevel(task, levelMap);
    }
    
    // Group tasks by level
    const tasksByLevel = new Map<number, Task[]>();
    for (const task of this.taskQueue) {
      const level = levelMap.get(task.id)!;
      if (!tasksByLevel.has(level)) {
        tasksByLevel.set(level, []);
      }
      tasksByLevel.get(level)!.push(task);
    }
    
    // Sort levels and return grouped tasks
    const maxLevel = Math.max(...Array.from(tasksByLevel.keys()));
    for (let i = 0; i <= maxLevel; i++) {
      if (tasksByLevel.has(i)) {
        result.push(tasksByLevel.get(i)!);
      }
    }
    
    return result;
  }
  
  /**
   * Execute a single task using the Executor Agent
   */
  private async executeTask(task: Task) {
    const { type, command, options } = task;
    
    switch (type) {
      case 'shell':
        return await this.executor.executeCommand(command, options);
        
      case 'git':
        return await this.executor.git(command, options);
        
      case 'deploy':
        return await this.executor.deploy(command, options.environment, options);
        
      case 'test':
        return await this.executor.runTests(command, options);
        
      case 'monitor':
        return await this.executor.monitor(command, options);
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }
  
  /**
   * Add a task to the execution queue
   */
  addTask(task: Task) {
    this.taskQueue.push(task);
    this.emit('taskAdded', task);
  }
  
  /**
   * Get the current task queue
   */
  getTaskQueue() {
    return [...this.taskQueue];
  }
  
  /**
   * Clear the task queue
   */
  clearTaskQueue() {
    this.taskQueue = [];
    this.emit('queueCleared');
  }
  
  /**
   * Cancel a specific task by ID
   */
  cancelTask(taskId: string) {
    const index = this.taskQueue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      const task = this.taskQueue[index];
      task.status = 'cancelled';
      this.taskQueue.splice(index, 1);
      this.emit('taskCancelled', task);
      return true;
    }
    return false;
  }
}

export default ExecutorPlannerIntegration;