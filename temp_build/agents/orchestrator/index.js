"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgent = void 0;
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const workflowManagement_1 = require("./workflowManagement");
const agentCoordination_1 = require("./agentCoordination");
const errorHandling_1 = require("./errorHandling");
/**
 * OrchestratorAgent - Coordinates communication and workflow execution across all agents
 * This agent serves as the central orchestration layer for the MCP architecture
 */
class OrchestratorAgent {
    /**
     * Create a new OrchestratorAgent instance
     * @param config Configuration options for the Orchestrator Agent
     */
    constructor(config = {}) {
        this.executions = new Map();
        this.eventListeners = new Map();
        this.externalServices = new Map();
        this.webhooks = new Map();
        // Default configuration
        this.config = {
            workflowDir: path.join(process.cwd(), 'workflows'),
            agentRegistry: '',
            statePersistence: 'file',
            concurrencyLimit: 10,
            defaultTimeoutMs: 300000, // 5 minutes
            retryStrategy: 'exponential',
            maxRetries: 3,
            errorHandlingLevel: 'standard',
            monitoringEnabled: true,
            metricsInterval: 60000, // 1 minute
            logLevel: 'info',
            ...config
        };
        // Resolve workflow directory to absolute path if not already
        if (!path.isAbsolute(this.config.workflowDir)) {
            this.config.workflowDir = path.resolve(process.cwd(), this.config.workflowDir);
        }
        // Start metrics collection if enabled
        if (this.config.monitoringEnabled && this.config.metricsInterval) {
            this.startMetricsCollection();
        }
        console.log(`OrchestratorAgent initialized with config:`, Object.entries(this.config)
            .filter(([key]) => key !== 'agentRegistry') // Don't log potentially sensitive info
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}));
    }
    // Workflow Management Methods
    /**
     * Define a new workflow
     * @param name Workflow name
     * @param definition Workflow definition
     * @returns Created workflow
     */
    async defineWorkflow(name, definition) {
        return workflowManagement_1.workflowManagement.defineWorkflow(name, definition, this.config);
    }
    /**
     * Load a workflow from storage
     * @param workflowNameOrId Workflow name or ID
     * @returns Loaded workflow
     */
    async loadWorkflow(workflowNameOrId) {
        return workflowManagement_1.workflowManagement.loadWorkflow(workflowNameOrId, this.config);
    }
    /**
     * Save a workflow to storage
     * @param workflow Workflow to save
     * @param path Optional path to save to
     */
    async saveWorkflow(workflow, path) {
        return workflowManagement_1.workflowManagement.saveWorkflow(workflow, this.config);
    }
    /**
     * List all workflows
     * @returns Array of workflow info objects
     */
    async listWorkflows() {
        return workflowManagement_1.workflowManagement.listWorkflows(this.config);
    }
    /**
     * Validate a workflow definition
     * @param workflow Workflow to validate
     * @returns Validation results
     */
    async validateWorkflow(workflow) {
        return workflowManagement_1.workflowManagement.validateWorkflow(workflow, this.config);
    }
    // Execution Control Methods
    /**
     * Start a workflow execution
     * @param workflowName Name or ID of the workflow to start
     * @param input Input data for the workflow
     * @returns Execution context
     */
    async startWorkflow(workflowName, input) {
        try {
            // Load the workflow
            const workflow = await this.loadWorkflow(workflowName);
            // Initialize execution context
            const execution = workflowManagement_1.workflowManagement.initializeExecution(workflow, input || {});
            // Store the execution
            this.executions.set(execution.id, execution);
            // Emit execution started event
            this.emitEvent({
                type: 'execution.started',
                time: new Date().toISOString(),
                executionId: execution.id,
                workflowName: workflow.name,
                data: { input }
            });
            // Schedule the execution
            this.scheduleExecution(execution);
            return execution;
        }
        catch (error) {
            console.error('Error starting workflow:', error);
            throw new Error(`Failed to start workflow: ${error.message}`);
        }
    }
    /**
     * Resume a paused workflow execution
     * @param executionId ID of the execution to resume
     * @param input Optional additional input data
     * @returns Updated execution context
     */
    async resumeWorkflow(executionId, input) {
        try {
            // Get the execution
            const execution = this.executions.get(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }
            // Check if the execution is paused
            if (execution.status !== 'paused') {
                throw new Error(`Cannot resume execution with status: ${execution.status}`);
            }
            // Update execution status
            execution.status = 'running';
            // Merge additional input if provided
            if (input) {
                execution.variables = {
                    ...execution.variables,
                    additionalInput: input
                };
            }
            // Emit execution resumed event
            this.emitEvent({
                type: 'execution.resumed',
                time: new Date().toISOString(),
                executionId: execution.id,
                workflowName: execution.workflowName,
                data: { input }
            });
            // Schedule the execution
            this.scheduleExecution(execution);
            return execution;
        }
        catch (error) {
            console.error('Error resuming workflow:', error);
            throw new Error(`Failed to resume workflow: ${error.message}`);
        }
    }
    /**
     * Pause a running workflow execution
     * @param executionId ID of the execution to pause
     */
    async pauseWorkflow(executionId) {
        try {
            // Get the execution
            const execution = this.executions.get(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }
            // Check if the execution is running
            if (execution.status !== 'running') {
                throw new Error(`Cannot pause execution with status: ${execution.status}`);
            }
            // Update execution status
            execution.status = 'paused';
            // Emit execution paused event
            this.emitEvent({
                type: 'execution.paused',
                time: new Date().toISOString(),
                executionId: execution.id,
                workflowName: execution.workflowName
            });
        }
        catch (error) {
            console.error('Error pausing workflow:', error);
            throw new Error(`Failed to pause workflow: ${error.message}`);
        }
    }
    /**
     * Stop a workflow execution
     * @param executionId ID of the execution to stop
     */
    async stopWorkflow(executionId) {
        try {
            // Get the execution
            const execution = this.executions.get(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }
            // Update execution status
            execution.status = 'cancelled';
            execution.endTime = new Date().toISOString();
            // Emit execution cancelled event
            this.emitEvent({
                type: 'execution.cancelled',
                time: new Date().toISOString(),
                executionId: execution.id,
                workflowName: execution.workflowName
            });
        }
        catch (error) {
            console.error('Error stopping workflow:', error);
            throw new Error(`Failed to stop workflow: ${error.message}`);
        }
    }
    /**
     * Get the status of an execution
     * @param executionId ID of the execution
     * @returns Execution status
     */
    async getExecutionStatus(executionId) {
        try {
            // Get the execution
            const execution = this.executions.get(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }
            return workflowManagement_1.workflowManagement.getExecutionStatus(execution);
        }
        catch (error) {
            console.error('Error getting execution status:', error);
            throw new Error(`Failed to get execution status: ${error.message}`);
        }
    }
    // Agent Management Methods
    /**
     * Register an agent with the orchestrator
     * @param agent Agent to register
     * @param capabilities Array of agent capabilities
     * @returns Agent ID
     */
    async registerAgent(agent, capabilities) {
        return agentCoordination_1.agentCoordination.registerAgent(agent, capabilities, this.config);
    }
    /**
     * Unregister an agent from the orchestrator
     * @param agentId ID of the agent to unregister
     */
    async unregisterAgent(agentId) {
        return agentCoordination_1.agentCoordination.unregisterAgent(agentId, this.config);
    }
    /**
     * List all registered agents
     * @returns Array of agent info objects
     */
    async listAgents() {
        return agentCoordination_1.agentCoordination.listAgents(this.config);
    }
    /**
     * Get the capabilities of an agent
     * @param agentId ID of the agent
     * @returns Array of capability names
     */
    async getAgentCapabilities(agentId) {
        return agentCoordination_1.agentCoordination.getAgentCapabilities(agentId, this.config);
    }
    /**
     * Find agents with a specific capability
     * @param capability Capability to search for
     * @returns Array of agent info objects
     */
    async findAgentsByCapability(capability) {
        return agentCoordination_1.agentCoordination.findAgentsByCapability(capability, this.config);
    }
    /**
     * Find agents of a specific type
     * @param type Agent type to search for
     * @returns Array of agent info objects
     */
    async findAgentsByType(type) {
        // Get all agents
        const allAgents = await this.listAgents();
        // Filter by type
        return allAgents.filter(agent => agent.type === type);
    }
    // Task Management Methods
    /**
     * Assign a task to an agent
     * @param agentId ID of the agent to assign to
     * @param task Task to assign
     * @returns Task assignment
     */
    async assignTask(task) {
        return agentCoordination_1.agentCoordination.assignTask(task, this.config);
    }
    /**
     * Assign multiple tasks in bulk
     * @param tasks Array of tasks to assign
     * @returns Array of task assignments
     */
    async bulkAssignTasks(tasks) {
        return agentCoordination_1.agentCoordination.bulkAssignTasks(tasks, this.config);
    }
    /**
     * Get the status of a task
     * @param taskId ID of the task
     * @returns Task status
     */
    async getTaskStatus(taskId) {
        return agentCoordination_1.agentCoordination.getTaskStatus(taskId, this.config);
    }
    /**
     * Complete a task with a result
     * @param taskId ID of the task
     * @param result Result of the task
     */
    async completeTask(taskId, result) {
        return agentCoordination_1.agentCoordination.completeTask(taskId, result, this.config);
    }
    /**
     * Fail a task with an error
     * @param taskId ID of the task
     * @param error Error that caused the failure
     */
    async failTask(taskId, error) {
        return agentCoordination_1.agentCoordination.failTask(taskId, error, this.config);
    }
    // Monitoring Methods
    /**
     * Get metrics for a workflow
     * @param workflowName Name of the workflow
     * @returns Workflow metrics
     */
    async getWorkflowMetrics(workflowName) {
        try {
            // This would collect and aggregate metrics for the workflow
            // For now, we'll just return a placeholder
            const metrics = {
                workflowName,
                totalExecutions: 0,
                activeExecutions: 0,
                successRate: 0,
                averageDuration: 0,
                errorRate: 0,
                stepMetrics: {},
                agentUtilization: {},
                resourceUsage: {
                    cpu: 0,
                    memory: 0,
                    network: 0
                }
            };
            // Count executions for this workflow
            let totalExecutions = 0;
            let successfulExecutions = 0;
            let totalDuration = 0;
            let activeExecutions = 0;
            for (const execution of this.executions.values()) {
                if (execution.workflowName === workflowName) {
                    totalExecutions++;
                    if (execution.status === 'running' || execution.status === 'paused') {
                        activeExecutions++;
                    }
                    if (execution.status === 'completed') {
                        successfulExecutions++;
                        if (execution.startTime && execution.endTime) {
                            const start = new Date(execution.startTime);
                            const end = new Date(execution.endTime);
                            totalDuration += end.getTime() - start.getTime();
                        }
                    }
                }
            }
            // Calculate metrics
            metrics.totalExecutions = totalExecutions;
            metrics.activeExecutions = activeExecutions;
            metrics.successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
            metrics.averageDuration = successfulExecutions > 0 ? totalDuration / successfulExecutions : 0;
            metrics.errorRate = totalExecutions > 0 ? (totalExecutions - successfulExecutions) / totalExecutions : 0;
            return metrics;
        }
        catch (error) {
            console.error('Error getting workflow metrics:', error);
            throw new Error(`Failed to get workflow metrics: ${error.message}`);
        }
    }
    /**
     * Get overall system metrics
     * @returns System metrics
     */
    async getSystemMetrics() {
        try {
            // This would collect system-wide metrics
            // For now, we'll just return a placeholder
            // Count active workflows
            let activeWorkflows = 0;
            let totalExecutions = this.executions.size;
            let successfulExecutions = 0;
            for (const execution of this.executions.values()) {
                if (execution.status === 'running' || execution.status === 'paused') {
                    activeWorkflows++;
                }
                if (execution.status === 'completed') {
                    successfulExecutions++;
                }
            }
            // Get agent metrics
            const agents = await this.listAgents();
            const activeAgents = agents.filter(a => a.status === 'online' || a.status === 'busy').length;
            // Calculate error rate
            const errorRate = totalExecutions > 0 ? (totalExecutions - successfulExecutions) / totalExecutions : 0;
            // Create system metrics
            const metrics = {
                activeWorkflows,
                totalTasksProcessed: 0, // Would be aggregated from task history
                tasksPerSecond: 0, // Would be calculated from recent task completions
                activeAgents,
                errorRate,
                avgTaskLatency: 0, // Would be calculated from task durations
                resourceUtilization: {
                    cpu: 0, // Would be measured from system
                    memory: 0, // Would be measured from system
                    network: {
                        bytesIn: 0,
                        bytesOut: 0
                    },
                    storage: 0
                },
                queueSizes: {},
                healthStatus: errorRate > 0.5 ? 'unhealthy' : (errorRate > 0.2 ? 'degraded' : 'healthy')
            };
            return metrics;
        }
        catch (error) {
            console.error('Error getting system metrics:', error);
            throw new Error(`Failed to get system metrics: ${error.message}`);
        }
    }
    /**
     * List all active executions
     * @returns Array of execution info objects
     */
    async listActiveExecutions() {
        try {
            const activeExecutions = [];
            for (const execution of this.executions.values()) {
                if (execution.status === 'running' || execution.status === 'paused') {
                    const status = await this.getExecutionStatus(execution.id);
                    activeExecutions.push({
                        id: execution.id,
                        workflowName: execution.workflowName,
                        status: execution.status,
                        startTime: execution.startTime,
                        endTime: execution.endTime,
                        duration: status.duration,
                        progress: status.progress
                    });
                }
            }
            return activeExecutions;
        }
        catch (error) {
            console.error('Error listing active executions:', error);
            throw new Error(`Failed to list active executions: ${error.message}`);
        }
    }
    /**
     * Get the execution history for an execution
     * @param executionId ID of the execution
     * @returns Array of execution events
     */
    async getExecutionHistory(executionId) {
        try {
            // This would retrieve the history of events for an execution
            // For now, we'll just return a placeholder
            return [];
        }
        catch (error) {
            console.error('Error getting execution history:', error);
            throw new Error(`Failed to get execution history: ${error.message}`);
        }
    }
    /**
     * Subscribe to execution events
     * @param filter Event filter
     * @param callback Callback function for events
     * @returns Subscription
     */
    async subscribeToEvents(filter, callback) {
        try {
            const subscriptionId = (0, uuid_1.v4)();
            // Store the subscription
            this.eventListeners.set(subscriptionId, { filter, callback });
            // Return the subscription
            return {
                id: subscriptionId,
                filter,
                unsubscribe: () => {
                    this.eventListeners.delete(subscriptionId);
                }
            };
        }
        catch (error) {
            console.error('Error subscribing to events:', error);
            throw new Error(`Failed to subscribe to events: ${error.message}`);
        }
    }
    // Integration Methods
    /**
     * Register an external service
     * @param service External service configuration
     * @returns Service ID
     */
    async registerExternalService(service) {
        try {
            // Generate ID if not provided
            const serviceId = service.id || (0, uuid_1.v4)();
            const serviceWithId = { ...service, id: serviceId };
            // Store the service
            this.externalServices.set(serviceId, serviceWithId);
            return serviceId;
        }
        catch (error) {
            console.error('Error registering external service:', error);
            throw new Error(`Failed to register external service: ${error.message}`);
        }
    }
    /**
     * Call an operation on an external service
     * @param serviceId ID of the service
     * @param operation Operation to call
     * @param params Parameters for the operation
     * @returns Result of the operation
     */
    async callExternalService(serviceId, operation, params) {
        try {
            // Get the service
            const service = this.externalServices.get(serviceId);
            if (!service) {
                throw new Error(`External service not found: ${serviceId}`);
            }
            // Check if the operation is supported
            if (!service.operations.includes(operation)) {
                throw new Error(`Operation not supported by service: ${operation}`);
            }
            // In a real implementation, this would make an API call to the external service
            // For now, we'll just return a placeholder
            return {
                result: 'External service call not implemented yet',
                operation,
                params
            };
        }
        catch (error) {
            console.error('Error calling external service:', error);
            throw new Error(`Failed to call external service: ${error.message}`);
        }
    }
    /**
     * Register a webhook for an event
     * @param event Event to subscribe to
     * @param url URL to call when the event occurs
     * @returns Webhook ID
     */
    async registerWebhook(event, url) {
        try {
            const webhookId = (0, uuid_1.v4)();
            // Store the webhook
            this.webhooks.set(webhookId, {
                id: webhookId,
                event,
                url,
                status: 'active',
                createdAt: new Date().toISOString(),
                successCount: 0,
                failureCount: 0
            });
            return webhookId;
        }
        catch (error) {
            console.error('Error registering webhook:', error);
            throw new Error(`Failed to register webhook: ${error.message}`);
        }
    }
    /**
     * Trigger an event manually
     * @param event Event name
     * @param payload Event payload
     */
    async triggerEvent(event, payload) {
        try {
            const eventObj = {
                type: event,
                time: new Date().toISOString(),
                executionId: '',
                workflowName: '',
                data: payload
            };
            this.emitEvent(eventObj);
        }
        catch (error) {
            console.error('Error triggering event:', error);
            throw new Error(`Failed to trigger event: ${error.message}`);
        }
    }
    // Private Methods
    /**
     * Schedule a workflow execution
     * @param execution Execution context to schedule
     */
    async scheduleExecution(execution) {
        try {
            // Check if the execution is running
            if (execution.status !== 'running') {
                return;
            }
            // Get pending steps
            const pendingSteps = execution.currentSteps.filter(s => s.status === 'pending');
            if (pendingSteps.length === 0) {
                // No pending steps, check if we're done
                const allStepsCompleted = execution.currentSteps.every(s => s.status === 'completed');
                const anyStepsFailed = execution.currentSteps.some(s => s.status === 'failed');
                if (allStepsCompleted) {
                    // All steps completed successfully
                    execution.status = 'completed';
                    execution.endTime = new Date().toISOString();
                    // Emit execution completed event
                    this.emitEvent({
                        type: 'execution.completed',
                        time: new Date().toISOString(),
                        executionId: execution.id,
                        workflowName: execution.workflowName,
                        output: execution.output
                    });
                }
                else if (anyStepsFailed) {
                    // One or more steps failed
                    execution.status = 'failed';
                    execution.endTime = new Date().toISOString();
                    // Emit execution failed event
                    this.emitEvent({
                        type: 'execution.failed',
                        time: new Date().toISOString(),
                        executionId: execution.id,
                        workflowName: execution.workflowName,
                        error: execution.error
                    });
                }
                else {
                    // Steps are running or skipped, wait for them to complete
                    // In a real implementation, this would be handled by a state machine
                }
                return;
            }
            // Process each pending step
            for (const step of pendingSteps) {
                // Load the workflow
                const workflow = await this.loadWorkflow(execution.workflowName);
                // Find the step definition
                const stepDefinition = workflow.steps.find(s => s.id === step.stepId);
                if (!stepDefinition) {
                    console.error(`Step not found in workflow: ${step.stepId}`);
                    continue;
                }
                // Process step based on type
                switch (stepDefinition.type) {
                    case 'task':
                        await this.processTaskStep(execution, step, stepDefinition);
                        break;
                    case 'subworkflow':
                        // Not implemented yet
                        break;
                    case 'parallel':
                        // Not implemented yet
                        break;
                    case 'decision':
                        // Not implemented yet
                        break;
                    case 'wait':
                        // Not implemented yet
                        break;
                    case 'event':
                        // Not implemented yet
                        break;
                    default:
                        console.error(`Unknown step type: ${stepDefinition.type}`);
                }
            }
        }
        catch (error) {
            console.error('Error scheduling execution:', error);
            // Update execution status
            execution.status = 'failed';
            execution.error = error;
            execution.endTime = new Date().toISOString();
            // Emit execution failed event
            this.emitEvent({
                type: 'execution.failed',
                time: new Date().toISOString(),
                executionId: execution.id,
                workflowName: execution.workflowName,
                error
            });
        }
    }
    /**
     * Process a task step
     * @param execution Execution context
     * @param step Step execution
     * @param stepDefinition Step definition
     */
    async processTaskStep(execution, step, stepDefinition) {
        try {
            // Check if the step has a capability
            if (!stepDefinition.capability) {
                throw new Error(`Task step requires a capability: ${stepDefinition.id}`);
            }
            // Update step status
            step.status = 'running';
            step.startTime = new Date().toISOString();
            // Emit step started event
            this.emitEvent({
                type: 'step.started',
                time: new Date().toISOString(),
                executionId: execution.id,
                workflowName: execution.workflowName,
                step: stepDefinition.id
            });
            // Prepare task input
            const input = stepDefinition.input
                ? this.resolveInputMapping(stepDefinition.input, execution)
                : {};
            // Create task
            const task = {
                id: (0, uuid_1.v4)(),
                name: stepDefinition.name,
                capability: stepDefinition.capability,
                input,
                executionId: execution.id,
                stepId: stepDefinition.id
            };
            // Assign the task
            const assignment = await this.assignTask(task);
            // Wait for task completion (in a real implementation, this would be event-driven)
            const interval = setInterval(async () => {
                try {
                    const taskStatus = await this.getTaskStatus(task.id);
                    if (taskStatus.status === 'completed') {
                        // Task completed successfully
                        clearInterval(interval);
                        // Update step status
                        step.status = 'completed';
                        step.endTime = new Date().toISOString();
                        step.output = taskStatus.result;
                        // Store output in variables if mapping exists
                        if (stepDefinition.output) {
                            this.applyOutputMapping(stepDefinition.output, taskStatus.result, execution);
                        }
                        // Update metrics
                        execution.metrics.completedSteps++;
                        // Emit step completed event
                        this.emitEvent({
                            type: 'step.completed',
                            time: new Date().toISOString(),
                            executionId: execution.id,
                            workflowName: execution.workflowName,
                            step: stepDefinition.id,
                            output: taskStatus.result
                        });
                        // Schedule next steps
                        if (stepDefinition.next) {
                            const nextStepId = typeof stepDefinition.next === 'string'
                                ? stepDefinition.next
                                : this.determineNextStep(stepDefinition.next, execution);
                            if (nextStepId) {
                                // Add the next step to current steps
                                execution.currentSteps.push({
                                    id: (0, uuid_1.v4)(),
                                    stepId: nextStepId,
                                    stepName: nextStepId, // Will be updated when processing
                                    status: 'pending',
                                    retryCount: 0
                                });
                                // Schedule execution to process the new step
                                this.scheduleExecution(execution);
                            }
                        }
                        else {
                            // No next step, check if we're done
                            this.scheduleExecution(execution);
                        }
                    }
                    else if (taskStatus.status === 'failed') {
                        // Task failed
                        clearInterval(interval);
                        // Handle error
                        await errorHandling_1.errorHandling.handleStepError(taskStatus.error, execution, step, stepDefinition, this.config);
                        // Schedule execution to handle error
                        this.scheduleExecution(execution);
                    }
                }
                catch (error) {
                    console.error('Error checking task status:', error);
                    // Continue checking (don't clear interval)
                }
            }, 1000); // Check every second
        }
        catch (error) {
            console.error('Error processing task step:', error);
            // Handle error
            await errorHandling_1.errorHandling.handleStepError(error, execution, step, stepDefinition, this.config);
            // Schedule execution to handle error
            this.scheduleExecution(execution);
        }
    }
    /**
     * Resolve input mapping against execution context
     * @param mapping Input mapping
     * @param execution Execution context
     * @returns Resolved input
     */
    resolveInputMapping(mapping, execution) {
        // This would resolve input mappings against the execution context
        // For now, we'll just return a copy of the mapping
        return { ...mapping };
    }
    /**
     * Apply output mapping to execution context
     * @param mapping Output mapping
     * @param output Output data
     * @param execution Execution context
     */
    applyOutputMapping(mapping, output, execution) {
        // This would apply output mappings to the execution context
        // For now, we'll just store the output directly
        execution.output = output;
    }
    /**
     * Determine the next step based on a next expression
     * @param nextExpression Next expression
     * @param execution Execution context
     * @returns ID of the next step
     */
    determineNextStep(nextExpression, execution) {
        // This would evaluate the expression against the execution context
        // For now, we'll just return the default case
        return nextExpression.default || '';
    }
    /**
     * Emit an event to all interested listeners
     * @param event Event to emit
     */
    emitEvent(event) {
        // Send event to all matching listeners
        for (const [id, subscription] of this.eventListeners.entries()) {
            try {
                const filter = subscription.filter;
                // Check if the event matches the filter
                if ((!filter.executionId || filter.executionId === event.executionId) &&
                    (!filter.workflowName || filter.workflowName === event.workflowName) &&
                    (!filter.eventTypes || filter.eventTypes.includes(event.type)) &&
                    (!filter.stepId || event.step === filter.stepId)) {
                    // Invoke callback
                    subscription.callback(event);
                }
            }
            catch (error) {
                console.error(`Error in event listener ${id}:`, error);
            }
        }
        // Send event to webhooks
        for (const [id, webhook] of this.webhooks.entries()) {
            if (webhook.event === event.type || webhook.event === '*') {
                // In a real implementation, this would make an HTTP request to the webhook URL
                // For now, we'll just log it
                console.log(`Would send webhook ${id} for event ${event.type} to ${webhook.url}`);
            }
        }
    }
    /**
     * Start periodic metrics collection
     */
    startMetricsCollection() {
        // Clear any existing interval
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        // Start new interval
        this.metricsInterval = setInterval(async () => {
            try {
                // Collect system metrics
                const metrics = await this.getSystemMetrics();
                // Emit metrics event
                this.emitEvent({
                    type: 'system.metrics',
                    time: new Date().toISOString(),
                    executionId: '',
                    workflowName: '',
                    data: metrics
                });
                // Log health status if it's not healthy
                if (metrics.healthStatus !== 'healthy') {
                    console.warn(`System health is ${metrics.healthStatus}: ${metrics.activeWorkflows} active workflows, ${metrics.errorRate.toFixed(2)}% error rate`);
                }
            }
            catch (error) {
                console.error('Error collecting metrics:', error);
            }
        }, this.config.metricsInterval);
    }
}
exports.OrchestratorAgent = OrchestratorAgent;
// Export all types for external use
__exportStar(require("./types"), exports);
