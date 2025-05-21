/**
 * Workflow-related types for SecondBrain project
 */

import { AgentType } from './agent';
import { TaskStatus } from './task';

export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum WorkflowType {
  PLANNING = 'planning',
  DEVELOPMENT = 'development',
  REVIEW = 'review',
  DEPLOYMENT = 'deployment',
  MAINTENANCE = 'maintenance'
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  status: TaskStatus;
  order: number;
  input?: any;
  output?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  dependsOn?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  type: WorkflowType;
  steps: Omit<WorkflowStep, 'id' | 'status' | 'startTime' | 'endTime' | 'input' | 'output' | 'error'>[];
}