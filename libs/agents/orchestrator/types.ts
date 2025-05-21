/**
 * Type definitions for the Orchestrator Agent
 */

/**
 * OrchestratorAgent configuration options
 */
export interface OrchestratorAgentConfig {
  /** Directory to store workflow definitions */
  workflowDir?: string;
  
  /** Registry for agent discovery and capabilities */
  agentRegistry?: string;
  
  /** How to persist workflow state */
  statePersistence?: 'memory' | 'file' | 'database';
  
  /** Maximum number of concurrent tasks */
  concurrencyLimit?: number;
  
  /** Default timeout for tasks in milliseconds */
  defaultTimeoutMs?: number;
  
  /** Retry strategy for failed tasks */
  retryStrategy?: 'none' | 'linear' | 'exponential';
  
  /** Maximum number of retries for failed tasks */
  maxRetries?: number;
  
  /** Level of error handling */
  errorHandlingLevel?: 'minimal' | 'standard' | 'aggressive';
  
  /** Whether to enable monitoring */
  monitoringEnabled?: boolean;
  
  /** Interval for metrics collection in milliseconds */
  metricsInterval?: number;
  
  /** Log level for the agent */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Workflow Definition Types
 */

export interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  required?: string[];
  enum?: any[];
  description?: string;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  version?: string;
  input?: SchemaDefinition;
  output?: SchemaDefinition;
  steps: WorkflowStep[];
  errorHandlers?: ErrorHandler[];
  timeoutMs?: number;
  tags?: string[];
}

export interface Workflow extends WorkflowDefinition {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'active' | 'deprecated';
}

export interface WorkflowInfo {
  id: string;
  name: string;
  description?: string;
  version?: string;
  status: 'draft' | 'active' | 'deprecated';
  stepCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'subworkflow' | 'parallel' | 'decision' | 'wait' | 'event';
  agent?: string;
  capability?: string;
  input?: InputMapping;
  output?: OutputMapping;
  condition?: Condition;
  retry?: RetryPolicy;
  timeout?: number;
  next?: string | NextExpression;
  parallel?: ParallelExecution;
  decision?: DecisionBranches;
  wait?: WaitCondition;
  event?: EventDefinition;
  onError?: string | ErrorAction;
}

export interface InputMapping {
  [key: string]: string | InputMapping;
}

export interface OutputMapping {
  [key: string]: string;
}

export interface Condition {
  expression: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffRate: number;
  interval: number;
}

export interface NextExpression {
  expression: string;
  cases: {
    [value: string]: string;
  };
  default?: string;
}

export interface ParallelExecution {
  branches: ParallelBranch[];
  completionStrategy?: 'all' | 'any' | 'N' | 'percentage';
  completionCount?: number;
  completionPercentage?: number;
}

export interface ParallelBranch {
  name: string;
  steps: WorkflowStep[];
}

export interface DecisionBranches {
  expression: string;
  branches: {
    [value: string]: string;
  };
  default?: string;
}

export interface WaitCondition {
  type: 'duration' | 'timestamp' | 'event';
  duration?: number;
  timestamp?: string;
  event?: {
    name: string;
    condition?: string;
  };
}

export interface EventDefinition {
  name: string;
  source?: string;
  payload?: any;
  correlation?: string;
}

export interface ErrorHandler {
  error: string;
  handler: string;
  retry?: RetryPolicy;
}

export interface ErrorAction {
  action: 'retry' | 'fallback' | 'stop' | 'continue';
  retry?: RetryPolicy;
  fallback?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Execution Types
 */

export interface ExecutionContext {
  id: string;
  workflowName: string;
  workflowId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  input: any;
  output?: any;
  currentSteps: StepExecution[];
  variables: Record<string, any>;
  error?: Error;
  metrics: {
    duration: number;
    stepCount: number;
    completedSteps: number;
    taskCount: number;
    errorCount: number;
    retryCount: number;
  };
}

export interface StepExecution {
  id: string;
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  startTime?: string;
  endTime?: string;
  input?: any;
  output?: any;
  error?: Error;
  retryCount: number;
  nextStep?: string;
}

export interface ExecutionStatus {
  id: string;
  workflowName: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentSteps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  }>;
  startTime: string;
  endTime?: string;
  duration: number;
  error?: {
    message: string;
    stepId?: string;
    stepName?: string;
  };
}

export interface ExecutionInfo {
  id: string;
  workflowName: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration: number;
  progress: number;
}

export interface ExecutionEvent {
  type: string;
  time: string;
  executionId: string;
  workflowName: string;
  step?: string;
  message?: string;
  data?: any;
  error?: Error;
  output?: any;
}

export interface Subscription {
  id: string;
  filter: EventFilter;
  unsubscribe: () => void;
}

export interface EventFilter {
  executionId?: string;
  workflowName?: string;
  eventTypes?: string[];
  stepId?: string;
}

export type EventCallback = (event: ExecutionEvent) => void;

/**
 * Agent Management Types
 */

export interface Agent {
  id?: string;
  name: string;
  type: string;
  capabilities: string[];
  status?: 'online' | 'busy' | 'offline' | 'error';
  execute: (task: Task) => Promise<any>;
  health?: () => Promise<AgentHealth>;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'busy' | 'offline' | 'error';
  capabilities: string[];
  loadFactor: number; // 0-1 where 1 is fully loaded
  taskCount: number;
  successRate: number;
  averageTaskDuration: number;
  lastSeenTime: string;
}

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: {
    memory?: number;
    cpu?: number;
    taskCount?: number;
    queueDepth?: number;
  };
  message?: string;
}

export interface Capability {
  name: string;
  description: string;
  parameters?: SchemaDefinition;
  result?: SchemaDefinition;
  examples?: {
    input: any;
    output: any;
  }[];
}

/**
 * Task Management Types
 */

export interface Task {
  id: string;
  name: string;
  capability: string;
  input: any;
  executionId: string;
  stepId: string;
  priority?: number;
  deadline?: string;
  context?: any;
}

export interface TaskAssignment {
  id: string;
  agentId: string;
  taskName: string;
  input: any;
  status: 'assigned' | 'running' | 'completed' | 'failed';
  assignedTime: string;
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: Error;
  retryCount: number;
  executionId: string;
  stepId: string;
}

export interface TaskStatus {
  id: string;
  status: 'assigned' | 'running' | 'completed' | 'failed';
  agentId?: string;
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: {
    message: string;
    stack?: string;
  };
  retryCount: number;
  retryAllowed: boolean;
}

/**
 * Monitoring Types
 */

export interface WorkflowMetrics {
  workflowName: string;
  totalExecutions: number;
  activeExecutions: number;
  successRate: number;
  averageDuration: number;
  errorRate: number;
  stepMetrics: Record<string, {
    count: number;
    averageDuration: number;
    errorRate: number;
    retryRate: number;
  }>;
  agentUtilization: Record<string, number>;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface SystemMetrics {
  activeWorkflows: number;
  totalTasksProcessed: number;
  tasksPerSecond: number;
  activeAgents: number;
  errorRate: number;
  avgTaskLatency: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: {
      bytesIn: number;
      bytesOut: number;
    };
    storage: number;
  };
  queueSizes: Record<string, number>;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Integration Types
 */

export interface ExternalServiceConfig {
  id?: string;
  name: string;
  type: string;
  config: Record<string, any>;
  operations: string[];
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2';
    credentials?: Record<string, any>;
  };
}

export interface WebhookRegistration {
  id: string;
  event: string;
  url: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
}

/**
 * Integration with Other Agents Types
 */

export interface PlannerOrchestratorIntegration {
  createWorkflowFromPlan: (plan: any) => Promise<Workflow>;
  updateWorkflowBasedOnPlan: (workflow: Workflow, plan: any) => Promise<Workflow>;
  generateExecutionPlan: (requirements: any) => Promise<any>;
  optimizeWorkflowExecution: (workflow: Workflow) => Promise<Workflow>;
}

export interface ExecutorOrchestratorIntegration {
  executeCommandWorkflow: (workflow: Workflow) => Promise<any>;
  manageDeploymentPipeline: (pipeline: any) => Promise<any>;
  configureSystemMonitoring: (config: any) => Promise<any>;
  scheduleRecurringTasks: (tasks: any[]) => Promise<any>;
}

export interface NotionOrchestratorIntegration {
  documentWorkflowExecution: (execution: ExecutionContext) => Promise<any>;
  storeWorkflowDefinition: (workflow: Workflow) => Promise<any>;
  createExecutionDashboard: () => Promise<any>;
  trackAgentPerformance: () => Promise<any>;
}

export interface BuildOrchestratorIntegration {
  generateWorkflowComponents: (spec: any) => Promise<any>;
  createIntegrationLayer: (agents: AgentInfo[]) => Promise<any>;
  implementCustomStepTypes: (stepTypes: any[]) => Promise<any>;
  extendWorkflowCapabilities: (capabilities: any[]) => Promise<any>;
}

export interface ReviewerOrchestratorIntegration {
  validateWorkflowQuality: (workflow: Workflow) => Promise<ValidationResult & { recommendations: string[] }>;
  analyzeWorkflowPerformance: (metrics: WorkflowMetrics) => Promise<any>;
  verifyAgentIntegration: (integration: any) => Promise<any>;
  checkWorkflowSecurity: (workflow: Workflow) => Promise<any>;
}

export interface RefactorOrchestratorIntegration {
  optimizeWorkflowStructure: (workflow: Workflow) => Promise<any>;
  improveWorkflowResilience: (workflow: Workflow) => Promise<any>;
  eliminateWorkflowBottlenecks: (metrics: WorkflowMetrics) => Promise<any>;
  modernizeWorkflowPatterns: (workflow: Workflow) => Promise<any>;
}