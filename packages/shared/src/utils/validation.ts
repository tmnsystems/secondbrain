/**
 * Validation utility functions for SecondBrain project
 */

import { Task, TaskStatus, TaskPriority } from '../types/task';
import { Workflow, WorkflowStatus, WorkflowType } from '../types/workflow';

/**
 * Validate a task object
 * @param task The task object to validate
 * @returns An object with isValid and errors properties
 */
export function validateTask(task: Partial<Task>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!task.id) {
    errors.push('Task ID is required');
  }

  if (!task.title) {
    errors.push('Task title is required');
  }

  if (!task.status || !Object.values(TaskStatus).includes(task.status as TaskStatus)) {
    errors.push('Task status is invalid or missing');
  }

  if (!task.priority || !Object.values(TaskPriority).includes(task.priority as TaskPriority)) {
    errors.push('Task priority is invalid or missing');
  }

  if (!task.assignedTo) {
    errors.push('Task must be assigned to an agent');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate a workflow object
 * @param workflow The workflow object to validate
 * @returns An object with isValid and errors properties
 */
export function validateWorkflow(workflow: Partial<Workflow>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!workflow.id) {
    errors.push('Workflow ID is required');
  }

  if (!workflow.name) {
    errors.push('Workflow name is required');
  }

  if (!workflow.type || !Object.values(WorkflowType).includes(workflow.type as WorkflowType)) {
    errors.push('Workflow type is invalid or missing');
  }

  if (!workflow.status || !Object.values(WorkflowStatus).includes(workflow.status as WorkflowStatus)) {
    errors.push('Workflow status is invalid or missing');
  }

  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}