/**
 * Core type definitions for the Planner Agent
 */

// Planning task definition
export interface PlanningTask {
  id: string;
  name: string;
  description?: string;
  type: 'setup' | 'implementation' | 'feature' | 'integration' | 'testing' | 'documentation' | 'deployment' | 'generic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration?: number; // In minutes
  dependencies: string[]; // IDs of dependent tasks
  components?: string[]; // Component IDs associated with this task
  features?: string[]; // Feature IDs associated with this task
  assignedTo?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  notionId?: string; // Notion page ID for the task
}

// Project input type
export interface Project {
  name: string;
  description: string;
  objectives: string[];
  constraints?: string[];
  priorities?: string[];
  context?: {
    currentStatus?: string;
    relatedProjects?: string[];
    availableResources?: string[];
  };
}

// Analysis output type
export interface Analysis {
  summary: string;
  components: string[];
  dependencies: Dependency[];
  risks?: Risk[];
}

// Dependency between components
export interface Dependency {
  from: string;
  to: string;
  type?: 'hard' | 'soft';
  description?: string;
}

// Risk assessment
export interface Risk {
  description: string;
  impact: 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  mitigation?: string;
}

// Task definition
export interface Task {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: number; // Story points: 1, 2, 3, 5, 8, 13
  dependencies: string[]; // IDs of dependent tasks
  assignedTo?: string;
  specifications?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  notionId?: string; // Notion page ID for the task
}

// Timeline with milestones
export interface Timeline {
  estimatedDuration: string;
  milestones: Milestone[];
}

// Milestone definition
export interface Milestone {
  name: string;
  date: string;
  tasks: string[]; // IDs of tasks in this milestone
  description?: string;
}

// Specifications for tasks or components
export interface Specifications {
  [key: string]: string; // Task ID -> detailed specifications
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  issues?: string[];
  warnings?: string[];
  suggestions?: string[];
}

// Options for the planner
export interface PlannerOptions {
  detailLevel?: 'high' | 'medium' | 'low';
  timelineRequired?: boolean;
  resourceAllocation?: boolean;
  riskAssessment?: boolean;
  maxTaskCount?: number;
  saveToNotion?: boolean;
}

// Complete response from the planner
export interface PlannerResponse {
  analysis: Analysis;
  tasks: Task[];
  timeline?: Timeline;
  specifications?: Specifications;
  validation: ValidationResult;
  notion?: NotionIntegration;
}

// Notion integration details
export interface NotionIntegration {
  projectId?: string;
  taskIds?: string[];
  projectUrl?: string;
}

// Inter-agent communication message
export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  content: any;
  timestamp: string;
  requestId?: string;
}