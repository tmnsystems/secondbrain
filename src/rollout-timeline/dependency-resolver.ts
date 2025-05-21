/**
 * Dependency resolver for timeline items
 */

import { TimelineInterface, TimelineItem, TimelineItemStatus, DependencyType } from './types';

/**
 * Validates and resolves dependencies between timeline items
 */
export class DependencyResolver {
  private timeline: TimelineInterface;

  /**
   * Create a new DependencyResolver
   */
  constructor(timeline: TimelineInterface) {
    this.timeline = timeline;
  }

  /**
   * Check for circular dependencies in the timeline
   * Returns an array of cycles if found, empty array if no cycles
   */
  findCircularDependencies(): string[][] {
    // Build a dependency graph
    const graph: Record<string, string[]> = {};
    
    // Add all timeline items to the graph
    [...this.timeline.stages, ...this.timeline.milestones].forEach(item => {
      graph[item.id] = [];
    });
    
    // Add dependencies to the graph
    [...this.timeline.stages, ...this.timeline.milestones].forEach(item => {
      if (item.dependencies && item.dependencies.length > 0) {
        item.dependencies.forEach(dep => {
          graph[item.id].push(dep.dependsOnId);
        });
      }
    });
    
    // Find cycles using DFS
    const cycles: string[][] = [];
    const visited: Record<string, boolean> = {};
    const recursionStack: Record<string, boolean> = {};
    
    const dfs = (node: string, path: string[] = []): void => {
      visited[node] = true;
      recursionStack[node] = true;
      
      path.push(node);
      
      for (const neighbor of graph[node] || []) {
        if (!visited[neighbor]) {
          dfs(neighbor, [...path]);
        } else if (recursionStack[neighbor]) {
          // Found a cycle
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            cycles.push(path.slice(cycleStartIndex).concat(neighbor));
          }
        }
      }
      
      recursionStack[node] = false;
    };
    
    // Run DFS on all nodes
    Object.keys(graph).forEach(node => {
      if (!visited[node]) {
        dfs(node);
      }
    });
    
    return cycles;
  }

  /**
   * Check if dependencies are valid
   * Returns true if all dependencies are valid
   */
  validateDependencies(): boolean {
    // Check for circular dependencies
    const cycles = this.findCircularDependencies();
    if (cycles.length > 0) {
      return false;
    }
    
    // Check that all dependencies reference valid timeline items
    let allValid = true;
    
    [...this.timeline.stages, ...this.timeline.milestones].forEach(item => {
      if (item.dependencies && item.dependencies.length > 0) {
        item.dependencies.forEach(dep => {
          const dependsOn = this.timeline.getItemById(dep.dependsOnId);
          if (!dependsOn) {
            allValid = false;
          }
        });
      }
    });
    
    return allValid;
  }

  /**
   * Get the critical path through the timeline
   * Returns an array of timeline item IDs that form the critical path
   */
  getCriticalPath(): string[] {
    // Build a graph of the timeline
    type Node = {
      id: string;
      earliestStart: number;
      earliestFinish: number;
      latestStart: number;
      latestFinish: number;
      slack: number;
      duration: number;
      dependencies: string[];
      dependents: string[];
    };
    
    const graph: Record<string, Node> = {};
    
    // Initialize nodes
    [...this.timeline.stages, ...this.timeline.milestones].forEach(item => {
      let duration = 0;
      
      // Estimate duration for stages
      if ('tasks' in item) {
        // For stages, use the sum of task estimated hours, or a default
        const totalEstimatedHours = item.tasks.reduce((sum, task) => {
          return sum + (task.estimatedHours || 0);
        }, 0);
        
        // Convert hours to days (assuming 8 hours per day)
        duration = Math.ceil(totalEstimatedHours / 8) || 1; // At least 1 day
      } else {
        // For milestones, use 0 duration by default
        duration = 0;
      }
      
      // If planned dates are available, use those for duration
      if (item.plannedStartDate && item.plannedEndDate) {
        const startTime = item.plannedStartDate.getTime();
        const endTime = item.plannedEndDate.getTime();
        duration = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
      }
      
      graph[item.id] = {
        id: item.id,
        earliestStart: 0,
        earliestFinish: duration,
        latestStart: Infinity,
        latestFinish: Infinity,
        slack: Infinity,
        duration,
        dependencies: [],
        dependents: []
      };
    });
    
    // Add dependencies
    [...this.timeline.stages, ...this.timeline.milestones].forEach(item => {
      if (item.dependencies && item.dependencies.length > 0) {
        item.dependencies.forEach(dep => {
          if (dep.type === DependencyType.FINISH_TO_START || 
              dep.type === DependencyType.FINISH_TO_FINISH) {
            // Only consider FS and FF dependencies for critical path
            graph[item.id].dependencies.push(dep.dependsOnId);
            graph[dep.dependsOnId].dependents.push(item.id);
          }
        });
      }
    });
    
    // Forward pass - calculate earliest start and finish times
    const sorted = this.topologicalSort(graph);
    
    sorted.forEach(id => {
      const node = graph[id];
      
      // Calculate earliest start based on dependencies
      if (node.dependencies.length > 0) {
        node.earliestStart = Math.max(
          ...node.dependencies.map(depId => graph[depId].earliestFinish)
        );
      }
      
      // Calculate earliest finish
      node.earliestFinish = node.earliestStart + node.duration;
    });
    
    // Backward pass - calculate latest start and finish times
    const maxFinish = Math.max(...Object.values(graph).map(node => node.earliestFinish));
    
    // Initialize latest finish for terminal nodes (those with no dependents)
    Object.values(graph).forEach(node => {
      if (node.dependents.length === 0) {
        node.latestFinish = maxFinish;
        node.latestStart = node.latestFinish - node.duration;
      }
    });
    
    // Process in reverse topological order
    [...sorted].reverse().forEach(id => {
      const node = graph[id];
      
      // Calculate latest finish based on dependents
      if (node.dependents.length > 0) {
        node.latestFinish = Math.min(
          ...node.dependents.map(depId => graph[depId].latestStart)
        );
      }
      
      // Calculate latest start
      node.latestStart = node.latestFinish - node.duration;
      
      // Calculate slack
      node.slack = node.latestStart - node.earliestStart;
    });
    
    // Find the critical path (nodes with zero slack)
    const criticalPath = Object.values(graph)
      .filter(node => node.slack === 0)
      .map(node => node.id);
    
    return criticalPath;
  }

  /**
   * Get all timeline items sorted in topological order
   * (an item comes before all items that depend on it)
   */
  private topologicalSort(graph: Record<string, { dependencies: string[] }>): string[] {
    const result: string[] = [];
    const visited: Record<string, boolean> = {};
    const temp: Record<string, boolean> = {}; // For cycle detection
    
    const visit = (id: string): void => {
      // Skip if already visited
      if (visited[id]) return;
      
      // Check for cycles
      if (temp[id]) {
        throw new Error('Circular dependency detected');
      }
      
      // Mark as temporarily visited
      temp[id] = true;
      
      // Visit dependencies
      for (const depId of graph[id].dependencies) {
        visit(depId);
      }
      
      // Mark as visited
      visited[id] = true;
      temp[id] = false;
      
      // Add to result
      result.push(id);
    };
    
    // Visit all nodes
    Object.keys(graph).forEach(id => {
      if (!visited[id]) {
        visit(id);
      }
    });
    
    return result;
  }

  /**
   * Get items that can start based on their dependencies
   */
  getItemsReadyToStart(): TimelineItem[] {
    return [...this.timeline.stages, ...this.timeline.milestones].filter(item => {
      if (item.status !== TimelineItemStatus.PENDING) {
        return false;
      }
      
      return this.timeline.canItemStart(item.id);
    });
  }

  /**
   * Get the next items that should be worked on
   * based on priority and dependencies
   */
  getNextItems(limit: number = 5): TimelineItem[] {
    const readyItems = this.getItemsReadyToStart();
    
    // Sort by priority and dependencies
    return readyItems
      .sort((a, b) => {
        // First by priority (higher priority first)
        if (a.priority !== b.priority) {
          const priorityOrder: Record<string, number> = {
            'critical': 0,
            'high': 1,
            'medium': 2,
            'low': 3
          };
          
          return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
        }
        
        // Then by critical path (items on critical path first)
        const criticalPath = this.getCriticalPath();
        const aOnCriticalPath = criticalPath.includes(a.id);
        const bOnCriticalPath = criticalPath.includes(b.id);
        
        if (aOnCriticalPath !== bOnCriticalPath) {
          return aOnCriticalPath ? -1 : 1;
        }
        
        // Finally by planned start date
        if (a.plannedStartDate && b.plannedStartDate) {
          return a.plannedStartDate.getTime() - b.plannedStartDate.getTime();
        }
        
        return 0;
      })
      .slice(0, limit);
  }

  /**
   * Check if completing the given timeline item would unblock other items
   */
  getItemsUnblockedBy(id: string): TimelineItem[] {
    const dependents = this.timeline.getItemDependents(id);
    
    return dependents.filter(dep => {
      // Check if this item is the last blocker
      const item = this.timeline.getItemById(dep.id);
      if (!item || !item.dependencies) {
        return false;
      }
      
      // Check if all other dependencies are satisfied
      return item.dependencies.every(dependency => {
        if (dependency.dependsOnId === id) {
          return true; // Assume this dependency will be satisfied
        }
        
        const dependsOn = this.timeline.getItemById(dependency.dependsOnId);
        return dependsOn && dependsOn.status === TimelineItemStatus.COMPLETED;
      });
    });
  }

  /**
   * Calculate the estimated completion date for the timeline
   * based on current progress and dependencies
   */
  estimateCompletionDate(): Date | null {
    try {
      // Use critical path to estimate completion
      const criticalPathIds = this.getCriticalPath();
      const criticalPathItems = criticalPathIds
        .map(id => this.timeline.getItemById(id))
        .filter(Boolean) as TimelineItem[];
      
      if (criticalPathItems.length === 0) {
        return null;
      }
      
      // Calculate total duration and progress
      let totalDuration = 0;
      let completedDuration = 0;
      
      criticalPathItems.forEach(item => {
        // Determine duration
        let duration = 0;
        
        // If planned dates are available, use those
        if (item.plannedStartDate && item.plannedEndDate) {
          const startTime = item.plannedStartDate.getTime();
          const endTime = item.plannedEndDate.getTime();
          duration = (endTime - startTime) / (1000 * 60 * 60 * 24);
        } else {
          // Default duration for stages and milestones
          duration = 'tasks' in item ? 5 : 0; // 5 days for stages, 0 for milestones
        }
        
        totalDuration += duration;
        
        // Count completed duration
        if (item.status === TimelineItemStatus.COMPLETED) {
          completedDuration += duration;
        } else if (item.status === TimelineItemStatus.IN_PROGRESS) {
          // For in-progress items, assume half completed
          completedDuration += duration / 2;
        }
      });
      
      // Calculate remaining duration
      const remainingDuration = totalDuration - completedDuration;
      
      // Calculate estimated completion date
      const now = new Date();
      const completionDate = new Date(now.getTime() + remainingDuration * 24 * 60 * 60 * 1000);
      
      return completionDate;
    } catch (error) {
      console.error('Error estimating completion date:', error);
      return null;
    }
  }
}