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
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowManagement = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const uuid_1 = require("uuid");
/**
 * Workflow Management module for the Orchestrator Agent
 * Handles workflow definition, validation, storage, and basic execution control
 */
exports.workflowManagement = {
    /**
     * Define a new workflow
     * @param name Workflow name
     * @param definition Workflow definition
     * @param config Orchestrator agent configuration
     * @returns Created workflow
     */
    async defineWorkflow(name, definition, config) {
        try {
            // Create a new workflow with ID and timestamps
            const now = new Date().toISOString();
            const workflow = {
                ...definition,
                id: (0, uuid_1.v4)(),
                name: name,
                createdAt: now,
                updatedAt: now,
                status: 'draft'
            };
            // Validate the workflow
            const validationResult = await this.validateWorkflow(workflow, config);
            if (!validationResult.valid) {
                const errorMessages = validationResult.errors
                    .filter(e => e.severity === 'error')
                    .map(e => `${e.path}: ${e.message}`)
                    .join(', ');
                throw new Error(`Invalid workflow definition: ${errorMessages}`);
            }
            // Save the workflow
            await this.saveWorkflow(workflow, config);
            return workflow;
        }
        catch (error) {
            console.error('Error defining workflow:', error);
            throw new Error(`Failed to define workflow: ${error.message}`);
        }
    },
    /**
     * Load a workflow from storage
     * @param workflowNameOrId Workflow name or ID
     * @param config Orchestrator agent configuration
     * @returns Loaded workflow
     */
    async loadWorkflow(workflowNameOrId, config) {
        try {
            // For file-based storage
            if (!config.statePersistence || config.statePersistence === 'file') {
                const workflowDir = config.workflowDir || path.join(process.cwd(), 'workflows');
                // First, try to load by ID (exact filename)
                let filePath = path.join(workflowDir, `${workflowNameOrId}.json`);
                if (!fs.existsSync(filePath)) {
                    // If not found, try to find by name (slower, needs to scan directory)
                    const files = fs.readdirSync(workflowDir);
                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const content = JSON.parse(fs.readFileSync(path.join(workflowDir, file), 'utf-8'));
                            if (content.name === workflowNameOrId) {
                                filePath = path.join(workflowDir, file);
                                break;
                            }
                        }
                    }
                }
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Workflow not found: ${workflowNameOrId}`);
                }
                const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                return workflowData;
            }
            // For memory-based storage (in a real implementation, this would be in-memory DB)
            // This is just a placeholder
            throw new Error(`Workflow storage method not implemented: ${config.statePersistence}`);
        }
        catch (error) {
            console.error('Error loading workflow:', error);
            throw new Error(`Failed to load workflow: ${error.message}`);
        }
    },
    /**
     * Save a workflow to storage
     * @param workflow Workflow to save
     * @param config Orchestrator agent configuration
     */
    async saveWorkflow(workflow, config) {
        try {
            // Update the modification timestamp
            workflow.updatedAt = new Date().toISOString();
            // For file-based storage
            if (!config.statePersistence || config.statePersistence === 'file') {
                const workflowDir = config.workflowDir || path.join(process.cwd(), 'workflows');
                // Ensure directory exists
                if (!fs.existsSync(workflowDir)) {
                    fs.mkdirSync(workflowDir, { recursive: true });
                }
                const filePath = path.join(workflowDir, `${workflow.id}.json`);
                fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
                return;
            }
            // For memory-based storage (in a real implementation, this would be in-memory DB)
            // This is just a placeholder
            throw new Error(`Workflow storage method not implemented: ${config.statePersistence}`);
        }
        catch (error) {
            console.error('Error saving workflow:', error);
            throw new Error(`Failed to save workflow: ${error.message}`);
        }
    },
    /**
     * List all workflows
     * @param config Orchestrator agent configuration
     * @returns Array of workflow info objects
     */
    async listWorkflows(config) {
        try {
            // For file-based storage
            if (!config.statePersistence || config.statePersistence === 'file') {
                const workflowDir = config.workflowDir || path.join(process.cwd(), 'workflows');
                // Ensure directory exists
                if (!fs.existsSync(workflowDir)) {
                    fs.mkdirSync(workflowDir, { recursive: true });
                    return [];
                }
                const files = fs.readdirSync(workflowDir);
                const workflows = [];
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const content = JSON.parse(fs.readFileSync(path.join(workflowDir, file), 'utf-8'));
                            workflows.push({
                                id: content.id,
                                name: content.name,
                                description: content.description,
                                version: content.version,
                                status: content.status || 'draft',
                                stepCount: content.steps?.length || 0,
                                createdAt: content.createdAt,
                                updatedAt: content.updatedAt,
                                tags: content.tags
                            });
                        }
                        catch (err) {
                            console.warn(`Failed to read workflow file ${file}: ${err.message}`);
                        }
                    }
                }
                return workflows;
            }
            // For memory-based storage (in a real implementation, this would be in-memory DB)
            // This is just a placeholder
            throw new Error(`Workflow storage method not implemented: ${config.statePersistence}`);
        }
        catch (error) {
            console.error('Error listing workflows:', error);
            throw new Error(`Failed to list workflows: ${error.message}`);
        }
    },
    /**
     * Validate a workflow definition
     * @param workflow Workflow to validate
     * @param config Orchestrator agent configuration
     * @returns Validation results
     */
    async validateWorkflow(workflow, config) {
        try {
            const errors = [];
            // Basic validation
            if (!workflow.name) {
                errors.push({
                    path: 'name',
                    message: 'Workflow name is required',
                    severity: 'error'
                });
            }
            if (!workflow.steps || !Array.isArray(workflow.steps)) {
                errors.push({
                    path: 'steps',
                    message: 'Workflow must have an array of steps',
                    severity: 'error'
                });
            }
            else if (workflow.steps.length === 0) {
                errors.push({
                    path: 'steps',
                    message: 'Workflow must have at least one step',
                    severity: 'warning'
                });
            }
            else {
                // Validate each step
                workflow.steps.forEach((step, index) => {
                    if (!step.id) {
                        errors.push({
                            path: `steps[${index}].id`,
                            message: 'Step ID is required',
                            severity: 'error'
                        });
                    }
                    if (!step.name) {
                        errors.push({
                            path: `steps[${index}].name`,
                            message: 'Step name is required',
                            severity: 'error'
                        });
                    }
                    if (!step.type) {
                        errors.push({
                            path: `steps[${index}].type`,
                            message: 'Step type is required',
                            severity: 'error'
                        });
                    }
                    else {
                        // Type-specific validation
                        switch (step.type) {
                            case 'task':
                                if (!step.capability) {
                                    errors.push({
                                        path: `steps[${index}].capability`,
                                        message: 'Task step requires a capability',
                                        severity: 'error'
                                    });
                                }
                                break;
                            case 'parallel':
                                if (!step.parallel || !Array.isArray(step.parallel.branches) || step.parallel.branches.length === 0) {
                                    errors.push({
                                        path: `steps[${index}].parallel.branches`,
                                        message: 'Parallel step requires at least one branch',
                                        severity: 'error'
                                    });
                                }
                                break;
                            case 'decision':
                                if (!step.decision || !step.decision.expression) {
                                    errors.push({
                                        path: `steps[${index}].decision.expression`,
                                        message: 'Decision step requires an expression',
                                        severity: 'error'
                                    });
                                }
                                if (!step.decision || !step.decision.branches || Object.keys(step.decision.branches).length === 0) {
                                    errors.push({
                                        path: `steps[${index}].decision.branches`,
                                        message: 'Decision step requires at least one branch',
                                        severity: 'error'
                                    });
                                }
                                break;
                            case 'wait':
                                if (!step.wait || (!step.wait.duration && !step.wait.timestamp && !step.wait.event)) {
                                    errors.push({
                                        path: `steps[${index}].wait`,
                                        message: 'Wait step requires a duration, timestamp, or event',
                                        severity: 'error'
                                    });
                                }
                                break;
                            case 'event':
                                if (!step.event || !step.event.name) {
                                    errors.push({
                                        path: `steps[${index}].event.name`,
                                        message: 'Event step requires an event name',
                                        severity: 'error'
                                    });
                                }
                                break;
                        }
                    }
                    // Check for step references
                    if (step.next && typeof step.next === 'string') {
                        const nextStepId = step.next;
                        const stepExists = workflow.steps.some(s => s.id === nextStepId);
                        if (!stepExists) {
                            errors.push({
                                path: `steps[${index}].next`,
                                message: `Next step '${nextStepId}' does not exist in the workflow`,
                                severity: 'error'
                            });
                        }
                    }
                });
                // Check for cyclic references
                try {
                    const cycles = this.detectCycles(workflow.steps);
                    if (cycles.length > 0) {
                        cycles.forEach(cycle => {
                            errors.push({
                                path: 'steps',
                                message: `Cyclic dependency detected: ${cycle.join(' -> ')}`,
                                severity: 'error'
                            });
                        });
                    }
                }
                catch (err) {
                    errors.push({
                        path: 'steps',
                        message: `Error checking for cycles: ${err.message}`,
                        severity: 'error'
                    });
                }
            }
            return {
                valid: !errors.some(e => e.severity === 'error'),
                errors
            };
        }
        catch (error) {
            console.error('Error validating workflow:', error);
            return {
                valid: false,
                errors: [{
                        path: '',
                        message: `Validation error: ${error.message}`,
                        severity: 'error'
                    }]
            };
        }
    },
    /**
     * Detect cycles in workflow steps
     * @param steps Workflow steps
     * @returns Array of cycles detected
     */
    detectCycles(steps) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        // Create adjacency list
        const adjacencyList = {};
        steps.forEach(step => {
            adjacencyList[step.id] = [];
            // Handle direct next reference
            if (step.next && typeof step.next === 'string') {
                adjacencyList[step.id].push(step.next);
            }
            // Handle next expression
            if (step.next && typeof step.next === 'object' && step.next.cases) {
                Object.values(step.next.cases).forEach(nextStep => {
                    adjacencyList[step.id].push(nextStep);
                });
                if (step.next.default) {
                    adjacencyList[step.id].push(step.next.default);
                }
            }
            // Handle decision branches
            if (step.decision && step.decision.branches) {
                Object.values(step.decision.branches).forEach(nextStep => {
                    adjacencyList[step.id].push(nextStep);
                });
                if (step.decision.default) {
                    adjacencyList[step.id].push(step.decision.default);
                }
            }
        });
        // DFS to detect cycles
        const detectCycleUtil = (nodeId, path = []) => {
            // If already in recursion stack, we found a cycle
            if (recursionStack.has(nodeId)) {
                const cycleStart = path.findIndex(id => id === nodeId);
                if (cycleStart >= 0) {
                    cycles.push(path.slice(cycleStart).concat(nodeId));
                }
                return;
            }
            // If already visited and no cycle found, skip
            if (visited.has(nodeId)) {
                return;
            }
            // Mark node as visited and add to recursion stack
            visited.add(nodeId);
            recursionStack.add(nodeId);
            // Visit all neighbors
            if (adjacencyList[nodeId]) {
                for (const neighbor of adjacencyList[nodeId]) {
                    detectCycleUtil(neighbor, [...path, nodeId]);
                }
            }
            // Remove from recursion stack
            recursionStack.delete(nodeId);
        };
        // Start DFS from each node
        for (const step of steps) {
            if (!visited.has(step.id)) {
                detectCycleUtil(step.id);
            }
        }
        return cycles;
    },
    /**
     * Initialize a new execution context for a workflow
     * @param workflow Workflow to execute
     * @param input Input data for the workflow
     * @returns Execution context
     */
    initializeExecution(workflow, input) {
        const now = new Date().toISOString();
        const initialSteps = this.getInitialSteps(workflow);
        return {
            id: (0, uuid_1.v4)(),
            workflowName: workflow.name,
            workflowId: workflow.id,
            status: 'running',
            startTime: now,
            input,
            currentSteps: initialSteps.map(step => ({
                id: (0, uuid_1.v4)(),
                stepId: step.id,
                stepName: step.name,
                status: 'pending',
                retryCount: 0
            })),
            variables: {
                input
            },
            metrics: {
                duration: 0,
                stepCount: workflow.steps.length,
                completedSteps: 0,
                taskCount: 0,
                errorCount: 0,
                retryCount: 0
            }
        };
    },
    /**
     * Get the initial steps to execute in a workflow
     * @param workflow Workflow to analyze
     * @returns Array of initial steps
     */
    getInitialSteps(workflow) {
        // Simplified implementation - in reality, this would be more complex
        // For a basic linear workflow, the first step is the only initial step
        if (workflow.steps && workflow.steps.length > 0) {
            return [workflow.steps[0]];
        }
        return [];
    },
    /**
     * Get the status of an execution
     * @param execution Execution context
     * @returns Execution status
     */
    getExecutionStatus(execution) {
        const now = new Date();
        const startTime = new Date(execution.startTime);
        const duration = execution.endTime
            ? new Date(execution.endTime).getTime() - startTime.getTime()
            : now.getTime() - startTime.getTime();
        // Calculate progress (simplified)
        const totalSteps = execution.metrics.stepCount;
        const completedSteps = execution.metrics.completedSteps;
        const progress = totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) / 100 : 0;
        return {
            id: execution.id,
            workflowName: execution.workflowName,
            status: execution.status,
            progress,
            currentSteps: execution.currentSteps.map(step => ({
                id: step.id,
                name: step.stepName,
                status: step.status
            })),
            startTime: execution.startTime,
            endTime: execution.endTime,
            duration,
            error: execution.error ? {
                message: execution.error.message,
                stepId: execution.currentSteps.find(s => s.status === 'failed')?.stepId,
                stepName: execution.currentSteps.find(s => s.status === 'failed')?.stepName
            } : undefined
        };
    }
};
