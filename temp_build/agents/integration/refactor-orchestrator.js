"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefactorOrchestratorIntegration = void 0;
/**
 * Integration between Refactor Agent and Orchestrator Agent
 * Enables workflow structure optimization, resilience improvement, and performance enhancement
 */
class RefactorOrchestratorIntegration {
    /**
     * Create a new RefactorOrchestratorIntegration instance
     * @param orchestrator OrchestratorAgent instance
     * @param refactor RefactorAgent instance
     */
    constructor(orchestrator, refactor) {
        this.orchestrator = orchestrator;
        this.refactor = refactor;
    }
    /**
     * Optimize the structure of a workflow for better maintainability
     * @param workflow Workflow to optimize
     * @returns Optimized workflow
     */
    async optimizeWorkflowStructure(workflow) {
        try {
            // Clone the workflow to avoid modifying the original
            const workflowClone = JSON.parse(JSON.stringify(workflow));
            const optimizedWorkflow = { ...workflowClone };
            // Optimize step naming and organization
            let nextStepCounter = 1;
            // Create a map of existing step IDs to standardized step IDs
            const stepIdMap = new Map();
            // First pass: assign new IDs to all steps
            optimizedWorkflow.steps = optimizedWorkflow.steps.map(step => {
                const standardizedId = `step_${String(nextStepCounter++).padStart(3, '0')}`;
                stepIdMap.set(step.id, standardizedId);
                return {
                    ...step,
                    id: standardizedId,
                    name: this.standardizeStepName(step.name)
                };
            });
            // Second pass: update references to step IDs
            optimizedWorkflow.steps = optimizedWorkflow.steps.map(step => {
                const updatedStep = { ...step };
                // Update "next" references
                if (typeof step.next === 'string' && stepIdMap.has(step.next)) {
                    updatedStep.next = stepIdMap.get(step.next);
                }
                else if (typeof step.next === 'object' && step.next) {
                    // Handle NextExpression
                    const updatedNextExpression = { ...step.next };
                    if (updatedNextExpression.cases) {
                        const updatedCases = {};
                        Object.entries(updatedNextExpression.cases).forEach(([value, targetId]) => {
                            if (typeof targetId === 'string' && stepIdMap.has(targetId)) {
                                updatedCases[value] = stepIdMap.get(targetId) || targetId;
                            }
                            else {
                                updatedCases[value] = targetId;
                            }
                        });
                        updatedNextExpression.cases = updatedCases;
                    }
                    if (updatedNextExpression.default && stepIdMap.has(updatedNextExpression.default)) {
                        updatedNextExpression.default = stepIdMap.get(updatedNextExpression.default);
                    }
                    updatedStep.next = updatedNextExpression;
                }
                // Update onError references
                if (typeof step.onError === 'string' && stepIdMap.has(step.onError)) {
                    updatedStep.onError = stepIdMap.get(step.onError);
                }
                else if (typeof step.onError === 'object' && step.onError && step.onError.fallback) {
                    const updatedErrorAction = { ...step.onError };
                    if (updatedErrorAction.fallback && stepIdMap.has(updatedErrorAction.fallback)) {
                        updatedErrorAction.fallback = stepIdMap.get(updatedErrorAction.fallback);
                    }
                    updatedStep.onError = updatedErrorAction;
                }
                // Update decision branches
                if (step.decision && step.decision.branches) {
                    const updatedDecision = { ...step.decision };
                    const updatedBranches = {};
                    Object.entries(updatedDecision.branches).forEach(([value, targetId]) => {
                        if (typeof targetId === 'string' && stepIdMap.has(targetId)) {
                            updatedBranches[value] = stepIdMap.get(targetId) || targetId;
                        }
                        else {
                            updatedBranches[value] = targetId;
                        }
                    });
                    updatedDecision.branches = updatedBranches;
                    if (updatedDecision.default && stepIdMap.has(updatedDecision.default)) {
                        updatedDecision.default = stepIdMap.get(updatedDecision.default);
                    }
                    updatedStep.decision = updatedDecision;
                }
                return updatedStep;
            });
            // Update error handlers if present
            if (optimizedWorkflow.errorHandlers) {
                optimizedWorkflow.errorHandlers = optimizedWorkflow.errorHandlers.map(handler => {
                    const updatedHandler = { ...handler };
                    if (updatedHandler.handler && stepIdMap.has(updatedHandler.handler)) {
                        updatedHandler.handler = stepIdMap.get(updatedHandler.handler) || updatedHandler.handler;
                    }
                    return updatedHandler;
                });
            }
            // Add a tag to indicate the workflow was optimized
            if (!optimizedWorkflow.tags) {
                optimizedWorkflow.tags = [];
            }
            if (!optimizedWorkflow.tags.includes('optimized')) {
                optimizedWorkflow.tags.push('optimized');
            }
            // Update version if present
            if (optimizedWorkflow.version) {
                const versionParts = optimizedWorkflow.version.split('.');
                if (versionParts.length === 3) {
                    const minor = parseInt(versionParts[1]) + 1;
                    optimizedWorkflow.version = `${versionParts[0]}.${minor}.0`;
                }
            }
            // Update timestamps
            optimizedWorkflow.updatedAt = new Date().toISOString();
            // Save the optimized workflow
            return await this.orchestrator.saveWorkflow(optimizedWorkflow);
        }
        catch (error) {
            console.error('Error optimizing workflow structure:', error);
            throw new Error(`Failed to optimize workflow structure: ${error.message}`);
        }
    }
    /**
     * Improve workflow resilience by enhancing error handling and retry mechanisms
     * @param workflow Workflow to make more resilient
     * @returns Improved workflow with better error handling
     */
    async improveWorkflowResilience(workflow) {
        try {
            // Clone the workflow to avoid modifying the original
            const workflowClone = JSON.parse(JSON.stringify(workflow));
            const resilientWorkflow = { ...workflowClone };
            // Ensure each step has appropriate error handling
            resilientWorkflow.steps = resilientWorkflow.steps.map(step => {
                // Skip for certain step types where error handling might not be needed
                if (step.type === 'wait' || step.type === 'event') {
                    return step;
                }
                // If the step already has error handling, leave it alone
                if (step.onError) {
                    return step;
                }
                // Add default error handling
                return {
                    ...step,
                    onError: {
                        action: 'retry',
                        retry: {
                            maxAttempts: 3,
                            backoffRate: 2.0,
                            interval: 1000
                        }
                    }
                };
            });
            // Ensure the workflow has global error handlers
            if (!resilientWorkflow.errorHandlers) {
                resilientWorkflow.errorHandlers = [];
            }
            // Add a generic error handler if none exists
            if (resilientWorkflow.errorHandlers.length === 0) {
                // Find or create a fallback step
                let fallbackStepId = resilientWorkflow.steps.find(step => step.name.toLowerCase().includes('fallback') || step.name.toLowerCase().includes('error'))?.id;
                // If no fallback step exists, create one
                if (!fallbackStepId) {
                    const fallbackStep = {
                        id: 'error_handler_fallback',
                        name: 'Error Handler Fallback',
                        type: 'task',
                        capability: 'error_logging',
                        input: {
                            message: 'Workflow encountered an unhandled error'
                        }
                    };
                    // Add the fallback step to the workflow
                    resilientWorkflow.steps.push(fallbackStep);
                    fallbackStepId = fallbackStep.id;
                }
                // Add generic error handlers
                resilientWorkflow.errorHandlers.push({
                    error: 'States.ALL',
                    handler: fallbackStepId
                });
            }
            // Set a reasonable default timeout if none is specified
            if (!resilientWorkflow.timeoutMs) {
                resilientWorkflow.timeoutMs = 3600000; // 1 hour
            }
            // Add appropriate tags
            if (!resilientWorkflow.tags) {
                resilientWorkflow.tags = [];
            }
            if (!resilientWorkflow.tags.includes('resilient')) {
                resilientWorkflow.tags.push('resilient');
            }
            // Update version if present
            if (resilientWorkflow.version) {
                const versionParts = resilientWorkflow.version.split('.');
                if (versionParts.length === 3) {
                    const patch = parseInt(versionParts[2]) + 1;
                    resilientWorkflow.version = `${versionParts[0]}.${versionParts[1]}.${patch}`;
                }
            }
            // Update timestamps
            resilientWorkflow.updatedAt = new Date().toISOString();
            // Save the resilient workflow
            return await this.orchestrator.saveWorkflow(resilientWorkflow);
        }
        catch (error) {
            console.error('Error improving workflow resilience:', error);
            throw new Error(`Failed to improve workflow resilience: ${error.message}`);
        }
    }
    /**
     * Eliminate performance bottlenecks in a workflow based on execution metrics
     * @param metrics Workflow execution metrics
     * @returns Analysis and recommended changes to eliminate bottlenecks
     */
    async eliminateWorkflowBottlenecks(metrics) {
        try {
            // Find the workflow based on metrics
            const workflow = await this.orchestrator.getWorkflow(metrics.workflowName);
            // Identify bottleneck steps based on duration and error rates
            const bottlenecks = [];
            // Analyze step metrics to identify bottlenecks
            Object.entries(metrics.stepMetrics).forEach(([stepName, stepMetric]) => {
                // Consider a step a bottleneck if:
                // 1. It takes more than 1.5x the average step duration, or
                // 2. It has a high error rate, or
                // 3. It has a high retry rate
                if (stepMetric.averageDuration > metrics.averageDuration * 1.5 ||
                    stepMetric.errorRate > 0.1 ||
                    stepMetric.retryRate > 0.2) {
                    // Find the corresponding step definition
                    const stepDefinition = workflow.steps.find(step => step.name === stepName);
                    let optimization = '';
                    if (stepMetric.averageDuration > metrics.averageDuration * 2) {
                        if (stepDefinition?.type === 'task') {
                            optimization = 'Convert to parallel execution or optimize capability implementation';
                        }
                        else {
                            optimization = 'Break down into smaller steps or optimize implementation';
                        }
                    }
                    else if (stepMetric.errorRate > 0.2) {
                        optimization = 'Improve error handling and add input validation';
                    }
                    else if (stepMetric.retryRate > 0.3) {
                        optimization = 'Investigate and fix root cause of failures requiring retries';
                    }
                    else {
                        optimization = 'Review step implementation for optimization opportunities';
                    }
                    bottlenecks.push({
                        stepName,
                        averageDuration: stepMetric.averageDuration,
                        errorRate: stepMetric.errorRate,
                        retryRate: stepMetric.retryRate,
                        optimization
                    });
                }
            });
            // Identify agent utilization bottlenecks
            const agentBottlenecks = [];
            Object.entries(metrics.agentUtilization).forEach(([agent, utilization]) => {
                if (utilization > 0.8) {
                    agentBottlenecks.push({
                        agent,
                        utilization,
                        recommendation: 'Consider scaling or load balancing to reduce utilization'
                    });
                }
            });
            // Generate recommendations for workflow-level changes
            const recommendations = [];
            if (bottlenecks.length > 0) {
                recommendations.push(`Optimize bottleneck steps: ${bottlenecks.map(b => b.stepName).join(', ')}`);
            }
            if (agentBottlenecks.length > 0) {
                recommendations.push(`Address high agent utilization: ${agentBottlenecks.map(a => a.agent).join(', ')}`);
            }
            if (metrics.errorRate > 0.1) {
                recommendations.push('Improve overall error handling in the workflow');
            }
            if (metrics.activeExecutions > 10 && metrics.resourceUsage.cpu > 0.7) {
                recommendations.push('Consider implementing rate limiting or throttling for resource-intensive operations');
            }
            return {
                workflowName: metrics.workflowName,
                bottlenecks,
                agentBottlenecks,
                resourceUsage: metrics.resourceUsage,
                recommendations,
                improvementPotential: bottlenecks.length > 0 ? 'high' : (agentBottlenecks.length > 0 ? 'medium' : 'low')
            };
        }
        catch (error) {
            console.error('Error eliminating workflow bottlenecks:', error);
            throw new Error(`Failed to eliminate workflow bottlenecks: ${error.message}`);
        }
    }
    /**
     * Modernize workflow patterns using latest best practices
     * @param workflow Workflow to modernize
     * @returns Modernized workflow with updated patterns
     */
    async modernizeWorkflowPatterns(workflow) {
        try {
            // Clone the workflow to avoid modifying the original
            const workflowClone = JSON.parse(JSON.stringify(workflow));
            const modernizedWorkflow = { ...workflowClone };
            // Modernization techniques to apply
            const modernizationApplied = [];
            // 1. Convert sequential tasks to parallel where possible
            const sequentialSteps = this.findSequentialIndependentSteps(modernizedWorkflow);
            if (sequentialSteps.length >= 2) {
                modernizationApplied.push('Converted sequential independent steps to parallel execution');
                // Create a parallel step to replace the sequential steps
                const parallelStep = {
                    id: `parallel_${Date.now()}`,
                    name: 'Parallel Execution',
                    type: 'parallel',
                    parallel: {
                        branches: sequentialSteps.map((step, index) => ({
                            name: `Branch_${index + 1}`,
                            steps: [step]
                        })),
                        completionStrategy: 'all'
                    }
                };
                // Replace the sequential steps with the parallel step
                // This is a simplified implementation - in a real scenario we would need to
                // handle step references and more complex workflows
                const firstStepIndex = modernizedWorkflow.steps.findIndex(step => step.id === sequentialSteps[0].id);
                modernizedWorkflow.steps.splice(firstStepIndex, sequentialSteps.length, parallelStep);
            }
            // 2. Add input/output validation to steps
            let validationAdded = false;
            modernizedWorkflow.steps = modernizedWorkflow.steps.map(step => {
                // Skip validation for certain step types
                if (step.type === 'wait' || step.type === 'event') {
                    return step;
                }
                // If the step has input but no condition to validate it, add validation
                if (step.input && !step.condition) {
                    validationAdded = true;
                    return {
                        ...step,
                        condition: {
                            expression: `$input('${Object.keys(step.input)[0]}') != null`
                        }
                    };
                }
                return step;
            });
            if (validationAdded) {
                modernizationApplied.push('Added input validation to steps');
            }
            // 3. Enhance error handling with more granular retry policies
            let errorHandlingEnhanced = false;
            modernizedWorkflow.steps = modernizedWorkflow.steps.map(step => {
                // Skip for certain step types
                if (step.type === 'wait' || step.type === 'event') {
                    return step;
                }
                // If the step has a simple retry policy, enhance it with a more granular one
                if (step.onError &&
                    typeof step.onError === 'object' &&
                    step.onError.action === 'retry' &&
                    step.onError.retry &&
                    !step.onError.retry.backoffRate) {
                    errorHandlingEnhanced = true;
                    return {
                        ...step,
                        onError: {
                            ...step.onError,
                            retry: {
                                ...step.onError.retry,
                                backoffRate: 2.0,
                                interval: 1000
                            }
                        }
                    };
                }
                return step;
            });
            if (errorHandlingEnhanced) {
                modernizationApplied.push('Enhanced error handling with granular retry policies');
            }
            // Add appropriate tags
            if (!modernizedWorkflow.tags) {
                modernizedWorkflow.tags = [];
            }
            if (!modernizedWorkflow.tags.includes('modernized')) {
                modernizedWorkflow.tags.push('modernized');
            }
            // Update version if present
            if (modernizedWorkflow.version) {
                const versionParts = modernizedWorkflow.version.split('.');
                if (versionParts.length === 3) {
                    const major = parseInt(versionParts[0]) + 1;
                    modernizedWorkflow.version = `${major}.0.0`;
                }
            }
            // Update timestamps
            modernizedWorkflow.updatedAt = new Date().toISOString();
            // If no modernization was applied, return the original workflow
            if (modernizationApplied.length === 0) {
                return workflow;
            }
            // Save the modernized workflow
            return await this.orchestrator.saveWorkflow(modernizedWorkflow);
        }
        catch (error) {
            console.error('Error modernizing workflow patterns:', error);
            throw new Error(`Failed to modernize workflow patterns: ${error.message}`);
        }
    }
    /**
     * Standardize a step name to follow conventions
     * @param name Original step name
     * @returns Standardized step name
     */
    standardizeStepName(name) {
        if (!name) {
            return 'UnnamedStep';
        }
        // Trim whitespace
        let standardName = name.trim();
        // Remove special characters and replace with spaces
        standardName = standardName.replace(/[^a-zA-Z0-9\s]/g, ' ');
        // Replace multiple spaces with a single space
        standardName = standardName.replace(/\s+/g, ' ');
        // Capitalize each word
        standardName = standardName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        return standardName;
    }
    /**
     * Find sequential steps that could be executed in parallel
     * @param workflow Workflow to analyze
     * @returns Array of steps that could be executed in parallel
     */
    findSequentialIndependentSteps(workflow) {
        // This is a simplified implementation
        // In a real scenario, we would need to analyze step dependencies more thoroughly
        // Look for consecutive task steps without dependencies between them
        const independentSteps = [];
        let currentIndependentGroup = [];
        workflow.steps.forEach(step => {
            // Only consider task steps
            if (step.type === 'task') {
                // If the current group is empty, add this step
                if (currentIndependentGroup.length === 0) {
                    currentIndependentGroup.push(step);
                }
                else {
                    // Check if this step depends on the previous steps in the group
                    // In a real implementation, this would be a more thorough dependency check
                    const isDependentOnGroup = false;
                    if (!isDependentOnGroup) {
                        currentIndependentGroup.push(step);
                    }
                    else {
                        // If the group has multiple steps, add it to the independent groups
                        if (currentIndependentGroup.length > 1) {
                            independentSteps.push(...currentIndependentGroup);
                        }
                        // Start a new group with this step
                        currentIndependentGroup = [step];
                    }
                }
            }
            else {
                // If the group has multiple steps, add it to the independent groups
                if (currentIndependentGroup.length > 1) {
                    independentSteps.push(...currentIndependentGroup);
                }
                // Reset the group
                currentIndependentGroup = [];
            }
        });
        // Add the last group if it has multiple steps
        if (currentIndependentGroup.length > 1) {
            independentSteps.push(...currentIndependentGroup);
        }
        return independentSteps;
    }
}
exports.RefactorOrchestratorIntegration = RefactorOrchestratorIntegration;
