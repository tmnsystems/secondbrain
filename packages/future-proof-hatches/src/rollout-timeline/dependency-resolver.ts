/**
 * Dependency Resolver
 * @module rollout-timeline/dependency-resolver
 * @description Handles dependencies between timeline items
 */

import {
  Timeline,
  TimelineItem,
  Dependency,
  DependencyType,
  TimelineItemType,
  TimelineItemStatus,
  TimelineEvent
} from './types';

/**
 * Validates and resolves dependencies between timeline items
 */
export class DependencyResolver {
  private timeline: Timeline;
  private itemsMap: Map<string, TimelineItem> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private reverseDependencyGraph: Map<string, Set<string>> = new Map();

  /**
   * Create a new dependency resolver
   * @param timeline The timeline to work with
   */
  constructor(timeline: Timeline) {
    this.timeline = timeline;
    this.buildItemsMap();
    this.buildDependencyGraphs();
  }

  /**
   * Check if all dependencies for an item are satisfied
   * @param itemId ID of the item to check
   * @returns Boolean indicating if all dependencies are satisfied
   */
  areDependenciesSatisfied(itemId: string): boolean {
    const item = this.itemsMap.get(itemId);
    if (!item || !item.dependencies || item.dependencies.length === 0) {
      return true;
    }

    return item.dependencies.every(dependency => this.isDependencySatisfied(dependency, item));
  }

  /**
   * Check if a specific dependency is satisfied
   * @param dependency The dependency to check
   * @param dependentItem The item with the dependency
   * @returns Boolean indicating if dependency is satisfied
   */
  isDependencySatisfied(dependency: Dependency, dependentItem: TimelineItem): boolean {
    // If already marked as satisfied, return true
    if (dependency.satisfied) {
      return true;
    }

    const dependsOnItem = this.itemsMap.get(dependency.dependsOn);
    if (!dependsOnItem) {
      return false;
    }

    let satisfied = false;

    switch (dependency.type) {
      case DependencyType.COMPLETION:
        satisfied = dependsOnItem.status === TimelineItemStatus.COMPLETED;
        break;

      case DependencyType.START:
        satisfied = dependsOnItem.status === TimelineItemStatus.IN_PROGRESS ||
                   dependsOnItem.status === TimelineItemStatus.COMPLETED;
        break;

      case DependencyType.PARALLEL:
        // For parallel dependencies, the dependent item can be in progress,
        // but cannot be completed before the dependency is completed
        if (dependentItem.status === TimelineItemStatus.COMPLETED) {
          satisfied = dependsOnItem.status === TimelineItemStatus.COMPLETED;
        } else {
          satisfied = true; // Can be in any state if dependent item is not completed
        }
        break;

      case DependencyType.OPTIONAL:
        // Optional dependencies are always considered satisfied
        satisfied = true;
        break;

      default:
        satisfied = false;
    }

    // Check if there's a custom condition
    if (satisfied && dependency.condition) {
      try {
        // Simplified condition evaluation - in a real scenario, 
        // you might use a proper expression evaluator
        satisfied = this.evaluateCondition(dependency.condition, dependsOnItem, dependentItem);
      } catch (error) {
        console.error(`Error evaluating condition: ${error}`);
        satisfied = false;
      }
    }

    // Update the dependency's satisfied state if it's now satisfied
    if (satisfied) {
      dependency.satisfied = true;
    }

    return satisfied;
  }

  /**
   * Get items that are blocked by a given item
   * @param itemId ID of the item
   * @returns Array of items that depend on this one
   */
  getBlockedItems(itemId: string): TimelineItem[] {
    const blockedIds = this.dependencyGraph.get(itemId) || new Set<string>();
    return Array.from(blockedIds)
      .map(id => this.itemsMap.get(id))
      .filter((item): item is TimelineItem => item !== undefined);
  }

  /**
   * Get items that a given item depends on
   * @param itemId ID of the item
   * @returns Array of items this one depends on
   */
  getDependsOnItems(itemId: string): TimelineItem[] {
    const dependsOnIds = this.reverseDependencyGraph.get(itemId) || new Set<string>();
    return Array.from(dependsOnIds)
      .map(id => this.itemsMap.get(id))
      .filter((item): item is TimelineItem => item !== undefined);
  }

  /**
   * Get items that are ready to start (all dependencies satisfied)
   * @returns Array of items ready to start
   */
  getReadyToStartItems(): TimelineItem[] {
    return Array.from(this.itemsMap.values()).filter(item => 
      item.status === TimelineItemStatus.PENDING &&
      this.areDependenciesSatisfied(item.id)
    );
  }

  /**
   * Check for circular dependencies in the timeline
   * @returns Array of cycles found (each cycle is an array of item IDs)
   */
  findCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stack: string[] = [];
    
    // Helper function for DFS traversal
    const dfs = (itemId: string) => {
      if (inStack.has(itemId)) {
        // Found a cycle
        const cycleStart = stack.indexOf(itemId);
        cycles.push(stack.slice(cycleStart).concat([itemId]));
        return;
      }
      
      if (visited.has(itemId)) return;
      
      visited.add(itemId);
      inStack.add(itemId);
      stack.push(itemId);
      
      const neighbors = this.dependencyGraph.get(itemId) || new Set<string>();
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }
      
      stack.pop();
      inStack.delete(itemId);
    };
    
    // Start DFS from each item
    for (const itemId of this.itemsMap.keys()) {
      if (!visited.has(itemId)) {
        dfs(itemId);
      }
    }
    
    return cycles;
  }

  /**
   * Check if a timeline item can be completed
   * @param itemId ID of the item
   * @returns Boolean indicating if the item can be completed
   */
  canComplete(itemId: string): boolean {
    const item = this.itemsMap.get(itemId);
    if (!item) return false;
    
    // Must be in progress
    if (item.status !== TimelineItemStatus.IN_PROGRESS) {
      return false;
    }
    
    // Check if there are any parallel dependencies that are not completed
    if (item.dependencies) {
      for (const dependency of item.dependencies) {
        if (dependency.type === DependencyType.PARALLEL && !dependency.satisfied) {
          const dependsOnItem = this.itemsMap.get(dependency.dependsOn);
          if (dependsOnItem && dependsOnItem.status !== TimelineItemStatus.COMPLETED) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Update dependency status when an item's status changes
   * @param itemId ID of the item that changed
   * @returns Array of dependencies that were updated
   */
  updateDependencyStatus(itemId: string): Dependency[] {
    const item = this.itemsMap.get(itemId);
    if (!item) return [];
    
    const updatedDependencies: Dependency[] = [];
    const blockedItems = this.getBlockedItems(itemId);
    
    for (const blockedItem of blockedItems) {
      if (!blockedItem.dependencies) continue;
      
      for (const dependency of blockedItem.dependencies) {
        if (dependency.dependsOn === itemId && !dependency.satisfied) {
          const wasSatisfied = this.isDependencySatisfied(dependency, blockedItem);
          if (wasSatisfied) {
            updatedDependencies.push(dependency);
            
            // Emit dependency satisfied event
            this.timeline.on(TimelineEvent.DEPENDENCY_SATISFIED, (event) => {
              console.log(`Dependency satisfied: ${dependency.dependsOn} for ${blockedItem.id}`);
            });
          }
        }
      }
    }
    
    return updatedDependencies;
  }

  /**
   * Get the critical path through the timeline
   * @returns Array of item IDs representing the critical path
   */
  getCriticalPath(): string[] {
    // Build a directed acyclic graph (DAG) of the dependencies
    const dag: Map<string, { id: string, duration: number, dependencies: string[] }> = new Map();
    
    for (const [id, item] of this.itemsMap.entries()) {
      // Skip completed items
      if (item.status === TimelineItemStatus.COMPLETED) continue;
      
      // Calculate duration in days
      let duration = 1; // Default to 1 day
      if (item.plannedEnd && item.plannedStart) {
        duration = Math.max(1, Math.ceil(
          (item.plannedEnd.getTime() - item.plannedStart.getTime()) / (1000 * 60 * 60 * 24)
        ));
      }
      
      // Get dependencies
      const dependencies = item.dependencies 
        ? item.dependencies.map(dep => dep.dependsOn)
        : [];
      
      dag.set(id, { id, duration, dependencies });
    }
    
    // Calculate earliest start times
    const earliestStart: Map<string, number> = new Map();
    const earliestFinish: Map<string, number> = new Map();
    
    // Topological sort function
    const topologicalSort = (dag: Map<string, { id: string, duration: number, dependencies: string[] }>): string[] => {
      const visited = new Set<string>();
      const sorted: string[] = [];
      
      function visit(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const node = dag.get(nodeId);
        if (node) {
          for (const depId of node.dependencies) {
            if (dag.has(depId)) {
              visit(depId);
            }
          }
          sorted.push(nodeId);
        }
      }
      
      for (const nodeId of dag.keys()) {
        visit(nodeId);
      }
      
      return sorted.reverse();
    };
    
    // Get sorted nodes
    const sortedNodes = topologicalSort(dag);
    
    // Forward pass to calculate earliest start/finish times
    for (const nodeId of sortedNodes) {
      const node = dag.get(nodeId);
      if (!node) continue;
      
      let maxDependencyFinish = 0;
      for (const depId of node.dependencies) {
        const depFinish = earliestFinish.get(depId) || 0;
        maxDependencyFinish = Math.max(maxDependencyFinish, depFinish);
      }
      
      earliestStart.set(nodeId, maxDependencyFinish);
      earliestFinish.set(nodeId, maxDependencyFinish + node.duration);
    }
    
    // Backward pass to calculate latest start/finish times
    const latestStart: Map<string, number> = new Map();
    const latestFinish: Map<string, number> = new Map();
    
    // Find project finish time
    const projectFinish = Math.max(...Array.from(earliestFinish.values()), 0);
    
    // Initialize all latest finish times to project finish
    for (const nodeId of dag.keys()) {
      latestFinish.set(nodeId, projectFinish);
    }
    
    // Process nodes in reverse order
    for (const nodeId of sortedNodes.slice().reverse()) {
      const node = dag.get(nodeId);
      if (!node) continue;
      
      // Calculate latest start time
      latestStart.set(nodeId, (latestFinish.get(nodeId) || 0) - node.duration);
      
      // Update dependent nodes
      for (const depId of node.dependencies) {
        const depNode = dag.get(depId);
        if (!depNode) continue;
        
        const currentLatestFinish = latestFinish.get(depId) || 0;
        const newLatestFinish = latestStart.get(nodeId) || 0;
        
        if (newLatestFinish < currentLatestFinish) {
          latestFinish.set(depId, newLatestFinish);
          latestStart.set(depId, newLatestFinish - depNode.duration);
        }
      }
    }
    
    // Calculate slack for each node
    const slack: Map<string, number> = new Map();
    for (const nodeId of dag.keys()) {
      const es = earliestStart.get(nodeId) || 0;
      const ls = latestStart.get(nodeId) || 0;
      slack.set(nodeId, ls - es);
    }
    
    // Critical path is all nodes with zero slack
    const criticalPath: string[] = [];
    for (const [nodeId, slackValue] of slack.entries()) {
      if (slackValue === 0) {
        criticalPath.push(nodeId);
      }
    }
    
    // Sort critical path by earliest start time
    criticalPath.sort((a, b) => {
      const aStart = earliestStart.get(a) || 0;
      const bStart = earliestStart.get(b) || 0;
      return aStart - bStart;
    });
    
    return criticalPath;
  }

  /**
   * Add a dependency between two items
   * @param dependentId ID of the dependent item
   * @param dependsOnId ID of the item being depended on
   * @param type Type of dependency
   * @param options Additional options
   * @returns Boolean indicating success
   */
  addDependency(
    dependentId: string,
    dependsOnId: string,
    type: DependencyType = DependencyType.COMPLETION,
    options: {
      condition?: string;
      delay?: number;
    } = {}
  ): boolean {
    // Check if we have both items
    if (!this.itemsMap.has(dependentId) || !this.itemsMap.has(dependsOnId)) {
      return false;
    }
    
    // Check for circular dependency
    const wouldCreateCycle = this.wouldCreateCycle(dependentId, dependsOnId);
    if (wouldCreateCycle) {
      return false;
    }
    
    // Add to timeline
    const result = this.timeline.addDependency(dependentId, dependsOnId, type, options);
    
    // If successful, update our graphs
    if (result) {
      this.buildItemsMap();
      this.buildDependencyGraphs();
    }
    
    return result;
  }

  /**
   * Remove a dependency between two items
   * @param dependentId ID of the dependent item
   * @param dependsOnId ID of the item being depended on
   * @returns Boolean indicating success
   */
  removeDependency(dependentId: string, dependsOnId: string): boolean {
    const item = this.itemsMap.get(dependentId);
    if (!item || !item.dependencies) return false;
    
    const initialLength = item.dependencies.length;
    item.dependencies = item.dependencies.filter(dep => dep.dependsOn !== dependsOnId);
    
    const removed = item.dependencies.length < initialLength;
    
    if (removed) {
      // Update our graphs
      this.buildDependencyGraphs();
    }
    
    return removed;
  }

  /**
   * Check if the timeline is acyclic (no circular dependencies)
   * @returns Boolean indicating if the timeline is acyclic
   */
  isAcyclic(): boolean {
    return this.findCircularDependencies().length === 0;
  }

  /**
   * Rebuild the timeline with any dependency issues fixed
   * @returns The fixed timeline
   */
  fixDependencyIssues(): Timeline {
    // Fix circular dependencies
    const cycles = this.findCircularDependencies();
    for (const cycle of cycles) {
      if (cycle.length >= 2) {
        // Break the cycle by removing the last dependency in the cycle
        const lastId = cycle[cycle.length - 1];
        const firstId = cycle[0];
        this.removeDependency(lastId, firstId);
      }
    }
    
    // Rebuild our items and graphs
    this.buildItemsMap();
    this.buildDependencyGraphs();
    
    return this.timeline;
  }

  /**
   * Rebuild items map from timeline
   * @private
   */
  private buildItemsMap(): void {
    this.itemsMap.clear();
    
    // Add stages
    for (const stage of this.timeline.stages) {
      this.itemsMap.set(stage.id, stage);
      
      // Add sub-stages recursively
      this.addSubStages(stage);
    }
    
    // Add milestones
    for (const milestone of this.timeline.milestones) {
      this.itemsMap.set(milestone.id, milestone);
    }
  }

  /**
   * Add sub-stages to items map recursively
   * @param stage Parent stage
   * @private
   */
  private addSubStages(stage: TimelineItem): void {
    if (stage.type !== TimelineItemType.STAGE) return;
    
    const typedStage = stage as any; // Type cast to access subStages
    if (!typedStage.subStages || !Array.isArray(typedStage.subStages)) return;
    
    for (const subStage of typedStage.subStages) {
      this.itemsMap.set(subStage.id, subStage);
      
      // Recursively add sub-stages
      this.addSubStages(subStage);
    }
  }

  /**
   * Build dependency graph from items
   * @private
   */
  private buildDependencyGraphs(): void {
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();
    
    // Initialize all items in both graphs
    for (const itemId of this.itemsMap.keys()) {
      this.dependencyGraph.set(itemId, new Set<string>());
      this.reverseDependencyGraph.set(itemId, new Set<string>());
    }
    
    // Build the graphs
    for (const [itemId, item] of this.itemsMap.entries()) {
      if (!item.dependencies) continue;
      
      for (const dependency of item.dependencies) {
        const dependsOnId = dependency.dependsOn;
        
        // Add to dependency graph (dependsOn -> item)
        const blockedItems = this.dependencyGraph.get(dependsOnId) || new Set<string>();
        blockedItems.add(itemId);
        this.dependencyGraph.set(dependsOnId, blockedItems);
        
        // Add to reverse dependency graph (item -> dependsOn)
        const dependsOnItems = this.reverseDependencyGraph.get(itemId) || new Set<string>();
        dependsOnItems.add(dependsOnId);
        this.reverseDependencyGraph.set(itemId, dependsOnItems);
      }
    }
  }

  /**
   * Check if adding a dependency would create a cycle
   * @param from Starting item ID
   * @param to Ending item ID
   * @returns Boolean indicating if a cycle would be created
   * @private
   */
  private wouldCreateCycle(from: string, to: string): boolean {
    // If adding to->from would create a cycle, then from must be reachable from to
    const visited = new Set<string>();
    
    const dfs = (current: string): boolean => {
      if (current === from) return true;
      if (visited.has(current)) return false;
      
      visited.add(current);
      
      const neighbors = this.dependencyGraph.get(current) || new Set<string>();
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) return true;
      }
      
      return false;
    };
    
    return dfs(to);
  }

  /**
   * Evaluate a condition string
   * @param condition Condition string to evaluate
   * @param dependsOnItem Item being depended on
   * @param dependentItem Dependent item
   * @returns Boolean result of condition evaluation
   * @private
   */
  private evaluateCondition(
    condition: string, 
    dependsOnItem: TimelineItem, 
    dependentItem: TimelineItem
  ): boolean {
    // This is a simplified condition evaluator
    // In a real implementation, you might use a proper expression evaluator
    
    // Simple condition matching
    if (condition === 'completed') {
      return dependsOnItem.status === TimelineItemStatus.COMPLETED;
    }
    
    if (condition === 'started') {
      return dependsOnItem.status === TimelineItemStatus.IN_PROGRESS ||
             dependsOnItem.status === TimelineItemStatus.COMPLETED;
    }
    
    if (condition === 'failed') {
      return dependsOnItem.status === TimelineItemStatus.FAILED;
    }
    
    if (condition.startsWith('progress>=')) {
      const threshold = parseInt(condition.substring('progress>='.length), 10);
      if (isNaN(threshold)) return false;
      
      // Only applicable to stages
      if (dependsOnItem.type !== TimelineItemType.STAGE) return false;
      
      const progress = (dependsOnItem as any).progress || 0;
      return progress >= threshold;
    }
    
    // Default to false for unknown conditions
    console.warn(`Unknown condition: ${condition}`);
    return false;
  }
}