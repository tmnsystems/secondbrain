"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../../orchestrator");
const reviewer_1 = require("../../reviewer");
const refactor_1 = require("../../refactor");
const build_1 = require("../../build");
const planner_1 = require("../../planner");
const executor_1 = require("../../executor");
const reviewer_orchestrator_1 = require("../reviewer-orchestrator");
const refactor_orchestrator_1 = require("../refactor-orchestrator");
const build_orchestrator_1 = require("../build-orchestrator");
const planner_orchestrator_1 = require("../planner-orchestrator");
const executor_orchestrator_1 = require("../executor-orchestrator");
// Mock all agent classes
jest.mock('../../orchestrator');
jest.mock('../../reviewer');
jest.mock('../../refactor');
jest.mock('../../build');
jest.mock('../../planner');
jest.mock('../../executor');
describe('Orchestrator Agent Integrations', () => {
    // Common mock instances
    let mockOrchestrator;
    let mockReviewer;
    let mockRefactor;
    let mockBuilder;
    let mockPlanner;
    let mockExecutor;
    beforeEach(() => {
        // Reset all mocks
        jest.resetAllMocks();
        // Create mock instances
        mockOrchestrator = new orchestrator_1.OrchestratorAgent({});
        mockReviewer = new reviewer_1.ReviewerAgent({});
        mockRefactor = new refactor_1.RefactorAgent({});
        mockBuilder = new build_1.BuildAgent({});
        mockPlanner = new planner_1.PlannerAgent({});
        mockExecutor = new executor_1.ExecutorAgent({});
    });
    describe('ReviewerOrchestratorIntegration', () => {
        let integration;
        beforeEach(() => {
            integration = new reviewer_orchestrator_1.ReviewerOrchestratorIntegration(mockOrchestrator, mockReviewer);
        });
        test('validateWorkflowQuality calls validateWorkflow on orchestrator', async () => {
            // Setup mocks
            const mockWorkflow = { id: '123', name: 'test', steps: [], status: 'active' };
            mockOrchestrator.validateWorkflow.mockResolvedValue({ valid: true, errors: [] });
            // Call the method
            await integration.validateWorkflowQuality(mockWorkflow);
            // Assertions
            expect(mockOrchestrator.validateWorkflow).toHaveBeenCalledWith(mockWorkflow);
        });
        test('analyzeWorkflowPerformance generates appropriate recommendations', async () => {
            // Setup test metrics
            const mockMetrics = {
                workflowName: 'test-workflow',
                totalExecutions: 100,
                activeExecutions: 5,
                successRate: 0.85,
                averageDuration: 5000,
                errorRate: 0.15,
                stepMetrics: {
                    'step1': {
                        count: 50,
                        averageDuration: 2000,
                        errorRate: 0.05,
                        retryRate: 0.1
                    },
                    'step2': {
                        count: 50,
                        averageDuration: 8000, // slow step
                        errorRate: 0.25, // high error rate
                        retryRate: 0.3 // high retry rate
                    }
                },
                agentUtilization: {
                    'agent1': 0.95, // high utilization
                    'agent2': 0.2 // low utilization
                },
                resourceUsage: {
                    cpu: 0.9, // high CPU
                    memory: 0.7,
                    network: 0.5
                }
            };
            // Call the method
            const result = await integration.analyzeWorkflowPerformance(mockMetrics);
            // Assertions
            expect(result.workflowName).toBe('test-workflow');
            expect(result.performanceScore).toBeDefined();
            expect(result.bottlenecks).toBeDefined();
            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(result.recommendations).toContain(expect.stringContaining('step2'));
            expect(result.recommendations).toContain(expect.stringContaining('agent1'));
            expect(result.recommendations).toContain(expect.stringContaining('CPU'));
        });
        test('checkWorkflowSecurity identifies security issues', async () => {
            // Setup test workflow with security issues
            const mockWorkflow = {
                id: '123',
                name: 'test',
                status: 'active',
                steps: [
                    {
                        id: 'step1',
                        name: 'step1',
                        type: 'task',
                        capability: 'deployment',
                        input: { key: 'value' }
                        // Missing onError and agent
                    }
                ]
            };
            // Call the method
            const result = await integration.checkWorkflowSecurity(mockWorkflow);
            // Assertions
            expect(result.workflowName).toBe('test');
            expect(result.securityScore).toBeDefined();
            expect(result.securityRating).toBeDefined();
            expect(result.securityIssues.length).toBeGreaterThan(0);
            expect(result.recommendations.length).toBeGreaterThan(0);
        });
    });
    describe('RefactorOrchestratorIntegration', () => {
        let integration;
        beforeEach(() => {
            integration = new refactor_orchestrator_1.RefactorOrchestratorIntegration(mockOrchestrator, mockRefactor);
        });
        test('optimizeWorkflowStructure standardizes step IDs and names', async () => {
            // Setup mocks
            const mockWorkflow = {
                id: '123',
                name: 'test',
                status: 'active',
                steps: [
                    {
                        id: 'random-id-1',
                        name: 'Step with special chars!!!',
                        type: 'task'
                    },
                    {
                        id: 'another-random-id',
                        name: 'lowercase step name',
                        type: 'task',
                        next: 'random-id-1'
                    }
                ]
            };
            mockOrchestrator.saveWorkflow.mockImplementation(async (wf) => wf);
            // Call the method
            const result = await integration.optimizeWorkflowStructure(mockWorkflow);
            // Assertions
            expect(result.steps[0].id).toMatch(/^step_\d{3}$/);
            expect(result.steps[0].name).toBe('Step With Special Chars');
            expect(result.steps[1].id).toMatch(/^step_\d{3}$/);
            expect(result.steps[1].name).toBe('Lowercase Step Name');
            expect(result.steps[1].next).toBe(result.steps[0].id); // Next reference updated
            expect(result.tags).toContain('optimized');
            expect(mockOrchestrator.saveWorkflow).toHaveBeenCalled();
        });
        test('improveWorkflowResilience adds error handling to steps', async () => {
            // Setup mocks
            const mockWorkflow = {
                id: '123',
                name: 'test',
                status: 'active',
                steps: [
                    {
                        id: 'step1',
                        name: 'Step Without Error Handling',
                        type: 'task'
                    },
                    {
                        id: 'step2',
                        name: 'Step With Error Handling',
                        type: 'task',
                        onError: {
                            action: 'stop'
                        }
                    },
                    {
                        id: 'step3',
                        name: 'Wait Step',
                        type: 'wait'
                    }
                ]
            };
            mockOrchestrator.saveWorkflow.mockImplementation(async (wf) => wf);
            // Call the method
            const result = await integration.improveWorkflowResilience(mockWorkflow);
            // Assertions
            expect(result.steps[0].onError).toBeDefined();
            expect(result.steps[0].onError.action).toBe('retry');
            expect(result.steps[0].onError.retry).toBeDefined();
            expect(result.steps[1].onError.action).toBe('stop'); // Original preserved
            expect(result.steps[2].onError).toBeUndefined(); // Wait step skipped
            expect(result.errorHandlers).toBeDefined();
            expect(result.errorHandlers.length).toBeGreaterThan(0);
            expect(result.tags).toContain('resilient');
            expect(mockOrchestrator.saveWorkflow).toHaveBeenCalled();
        });
        test('eliminateWorkflowBottlenecks identifies performance issues', async () => {
            // Setup mocks
            mockOrchestrator.getWorkflow.mockResolvedValue({
                id: '123',
                name: 'test-workflow',
                steps: [
                    { id: 'step1', name: 'step1', type: 'task' },
                    { id: 'step2', name: 'step2', type: 'task' }
                ]
            });
            const mockMetrics = {
                workflowName: 'test-workflow',
                averageDuration: 1000,
                errorRate: 0.05,
                activeExecutions: 15,
                stepMetrics: {
                    'step1': {
                        averageDuration: 500,
                        errorRate: 0.02,
                        retryRate: 0.05
                    },
                    'step2': {
                        averageDuration: 2500, // slow step
                        errorRate: 0.15, // high error rate
                        retryRate: 0.25 // high retry rate
                    }
                },
                agentUtilization: {
                    'agent1': 0.9 // high utilization
                },
                resourceUsage: {
                    cpu: 0.8,
                    memory: 0.6,
                    network: 0.4
                }
            };
            // Call the method
            const result = await integration.eliminateWorkflowBottlenecks(mockMetrics);
            // Assertions
            expect(result.workflowName).toBe('test-workflow');
            expect(result.bottlenecks.length).toBeGreaterThan(0);
            expect(result.bottlenecks[0].stepName).toBe('step2');
            expect(result.agentBottlenecks.length).toBeGreaterThan(0);
            expect(result.agentBottlenecks[0].agent).toBe('agent1');
            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(mockOrchestrator.getWorkflow).toHaveBeenCalledWith('test-workflow');
        });
    });
    describe('BuildOrchestratorIntegration', () => {
        let integration;
        beforeEach(() => {
            integration = new build_orchestrator_1.BuildOrchestratorIntegration(mockOrchestrator, mockBuilder);
        });
        test('generateWorkflowComponents calls generateComponent on builder', async () => {
            // Setup mocks
            const mockSpec = {
                name: 'TestComponent',
                components: [
                    { name: 'Component1' },
                    { name: 'Component2' }
                ],
                targetPath: '/path/to/components'
            };
            mockBuilder.generateComponent.mockResolvedValue({ name: 'Generated' });
            // Call the method
            await integration.generateWorkflowComponents(mockSpec);
            // Assertions
            expect(mockBuilder.generateComponent).toHaveBeenCalledTimes(2);
            expect(mockBuilder.generateComponent).toHaveBeenCalledWith({ name: 'Component1' });
            expect(mockBuilder.generateComponent).toHaveBeenCalledWith({ name: 'Component2' });
        });
    });
    describe('PlannerOrchestratorIntegration', () => {
        let integration;
        beforeEach(() => {
            integration = new planner_orchestrator_1.PlannerOrchestratorIntegration(mockOrchestrator, mockPlanner);
        });
        test('createWorkflowFromPlan creates workflow from planner output', async () => {
            // Setup mocks
            const mockPlan = {
                name: 'Test Plan',
                description: 'Test Description',
                tasks: [
                    {
                        id: 'task1',
                        name: 'Task 1',
                        type: 'development',
                        description: 'Task 1 Description',
                        dependencies: []
                    },
                    {
                        id: 'task2',
                        name: 'Task 2',
                        type: 'testing',
                        description: 'Task 2 Description',
                        dependencies: ['task1']
                    }
                ]
            };
            mockOrchestrator.defineWorkflow.mockImplementation(async (name, def) => ({
                ...def,
                id: 'workflow-123',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            // Call the method
            const result = await integration.createWorkflowFromPlan(mockPlan);
            // Assertions
            expect(mockOrchestrator.defineWorkflow).toHaveBeenCalledWith('Test Plan', expect.objectContaining({
                name: 'Test Plan',
                description: 'Test Description',
                steps: expect.arrayContaining([
                    expect.objectContaining({ id: 'task1', name: 'Task 1' }),
                    expect.objectContaining({ id: 'task2', name: 'Task 2' })
                ])
            }));
            expect(result.id).toBe('workflow-123');
        });
    });
    describe('ExecutorOrchestratorIntegration', () => {
        let integration;
        beforeEach(() => {
            integration = new executor_orchestrator_1.ExecutorOrchestratorIntegration(mockOrchestrator, mockExecutor);
        });
        test('executeCommandWorkflow calls executeWorkflow on orchestrator', async () => {
            // Setup mocks
            const mockWorkflow = { id: '123', name: 'test', steps: [], status: 'active' };
            mockOrchestrator.executeWorkflow.mockResolvedValue({ id: 'execution-123', status: 'completed' });
            // Call the method
            await integration.executeCommandWorkflow(mockWorkflow);
            // Assertions
            expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }));
        });
    });
});
