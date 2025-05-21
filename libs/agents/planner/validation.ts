/**
 * Plan validation functionality for the Planner Agent
 * Validates plans for completeness, consistency, and feasibility
 */

import type { Task, Analysis, Timeline, Specifications, ValidationResult } from './types';

/**
 * Validates a complete plan for consistency and completeness
 */
export function validatePlan({
  analysis,
  tasks,
  timeline,
  specifications
}: {
  analysis: Analysis;
  tasks: Task[];
  timeline?: Timeline;
  specifications?: Specifications;
}): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for basic completeness
  if (!analysis || !tasks || tasks.length === 0) {
    issues.push('Plan is incomplete: missing analysis or tasks');
    return { valid: false, issues, warnings, suggestions };
  }
  
  // Validate tasks against components
  validateTasksAgainstComponents(tasks, analysis, warnings, suggestions);
  
  // Validate task dependencies
  validateTaskDependencies(tasks, issues, warnings);
  
  // Validate timeline if present
  if (timeline) {
    validateTimeline(timeline, tasks, issues, warnings, suggestions);
  }
  
  // Validate specifications if present
  if (specifications) {
    validateSpecifications(specifications, tasks, warnings, suggestions);
  }
  
  // Determine overall validity
  const valid = issues.length === 0;
  
  return {
    valid,
    issues: issues.length > 0 ? issues : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

/**
 * Validates tasks against identified components
 */
function validateTasksAgainstComponents(
  tasks: Task[],
  analysis: Analysis,
  warnings: string[],
  suggestions: string[]
) {
  // Check if all components have associated tasks
  const componentNames = analysis.components;
  const taskNames = tasks.map(t => t.name.toLowerCase());
  const taskDescriptions = tasks.map(t => t.description.toLowerCase());
  
  for (const component of componentNames) {
    const componentLower = component.toLowerCase();
    const hasTask = taskNames.some(name => name.includes(componentLower)) || 
                   taskDescriptions.some(desc => desc.includes(componentLower));
    
    if (!hasTask) {
      warnings.push(`Component "${component}" may not have associated tasks`);
      suggestions.push(`Consider adding tasks for the "${component}" component`);
    }
  }
}

/**
 * Validates task dependencies for consistency
 */
function validateTaskDependencies(
  tasks: Task[],
  issues: string[],
  warnings: string[]
) {
  const taskIds = new Set(tasks.map(t => t.id));
  
  // Check for circular dependencies and missing dependencies
  for (const task of tasks) {
    // Check for dependencies on non-existent tasks
    for (const depId of task.dependencies) {
      if (!taskIds.has(depId)) {
        issues.push(`Task "${task.name}" depends on non-existent task ID "${depId}"`);
      }
    }
    
    // Check for circular dependencies (basic check)
    const dependencyChain = new Set([task.id]);
    let current = task;
    
    // Follow the chain of dependencies
    let iterations = 0;
    const maxIterations = tasks.length * 2; // Safety to prevent infinite loops
    
    while (current.dependencies.length > 0 && iterations < maxIterations) {
      iterations++;
      const nextDepId = current.dependencies[0];
      if (dependencyChain.has(nextDepId)) {
        issues.push(`Circular dependency detected involving task "${task.name}"`);
        break;
      }
      
      dependencyChain.add(nextDepId);
      const nextTask = tasks.find(t => t.id === nextDepId);
      if (!nextTask) break;
      current = nextTask;
    }
    
    // Check for tasks with many dependencies
    if (task.dependencies.length > 3) {
      warnings.push(`Task "${task.name}" has ${task.dependencies.length} dependencies, which may indicate excessive complexity`);
    }
  }
  
  // Check for disconnected tasks (no dependencies and not depended on)
  for (const task of tasks) {
    const isDependent = tasks.some(t => t.dependencies.includes(task.id));
    if (task.dependencies.length === 0 && !isDependent && tasks.length > 1) {
      warnings.push(`Task "${task.name}" appears to be disconnected from other tasks`);
    }
  }
}

/**
 * Validates timeline for consistency with tasks
 */
function validateTimeline(
  timeline: Timeline,
  tasks: Task[],
  issues: string[],
  warnings: string[],
  suggestions: string[]
) {
  const taskIds = new Set(tasks.map(t => t.id));
  const timelinedTaskIds = new Set<string>();
  
  // Check each milestone
  for (const milestone of timeline.milestones) {
    // Check for tasks in timeline that don't exist in the task list
    for (const taskId of milestone.tasks) {
      if (!taskIds.has(taskId)) {
        issues.push(`Milestone "${milestone.name}" references non-existent task ID "${taskId}"`);
      } else {
        timelinedTaskIds.add(taskId);
      }
    }
    
    // Check milestone dates (only basic format validation)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(milestone.date)) {
      issues.push(`Milestone "${milestone.name}" has invalid date format: "${milestone.date}"`);
    }
  }
  
  // Check for tasks not included in any milestone
  for (const task of tasks) {
    if (!timelinedTaskIds.has(task.id)) {
      warnings.push(`Task "${task.name}" is not included in any milestone`);
    }
  }
  
  // Check for empty milestones
  const emptyMilestones = timeline.milestones.filter(m => m.tasks.length === 0);
  if (emptyMilestones.length > 0) {
    for (const milestone of emptyMilestones) {
      warnings.push(`Milestone "${milestone.name}" has no associated tasks`);
    }
  }
}

/**
 * Validates specifications for completeness
 */
function validateSpecifications(
  specifications: Specifications,
  tasks: Task[],
  warnings: string[],
  suggestions: string[]
) {
  const highPriorityTasks = tasks.filter(t => t.priority === 'high');
  const specTaskIds = Object.keys(specifications);
  
  // Check if all high-priority tasks have specifications
  for (const task of highPriorityTasks) {
    if (!specTaskIds.includes(task.id)) {
      warnings.push(`High-priority task "${task.name}" has no detailed specifications`);
      suggestions.push(`Create detailed specifications for task "${task.name}"`);
    }
  }
  
  // Check for specifications of non-existent tasks
  const taskIds = new Set(tasks.map(t => t.id));
  for (const specTaskId of specTaskIds) {
    if (!taskIds.has(specTaskId)) {
      warnings.push(`Specifications exist for non-existent task ID "${specTaskId}"`);
    }
  }
  
  // Check for very short specifications
  for (const [taskId, spec] of Object.entries(specifications)) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) continue;
    
    if (spec.length < 100) {
      warnings.push(`Specifications for task "${task.name}" appear to be too brief (${spec.length} chars)`);
    }
  }
}