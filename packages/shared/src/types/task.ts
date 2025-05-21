/**
 * Task-related types for SecondBrain project
 */

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dependencies?: string[];
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TaskUpdate {
  status?: TaskStatus;
  notes?: string;
  metadata?: Record<string, any>;
}