import { PlannerAgent } from '../libs/agents/planner';
import { OrchestratorAgent } from '../libs/agents/orchestrator';
import { BuildAgent } from '../libs/agents/build';
import { ExecutorAgent } from '../libs/agents/executor';
import { NotionAgent } from '../libs/agents/notion';
import { ReviewerAgent } from '../libs/agents/reviewer';
import { RefactorAgent } from '../libs/agents/refactor';

import { PlannerOrchestratorIntegration } from '../libs/agents/integration/planner-orchestrator';
import { PlannerExecutorIntegration } from '../libs/agents/integration/planner-executor';
import { ExecutorOrchestratorIntegration } from '../libs/agents/integration/executor-orchestrator';
import { BuildOrchestratorIntegration } from '../libs/agents/integration/build-orchestrator';
import { NotionOrchestratorIntegration } from '../libs/agents/integration/notion-orchestrator';
import { ReviewerOrchestratorIntegration } from '../libs/agents/integration/reviewer-orchestrator';
import { RefactorOrchestratorIntegration } from '../libs/agents/integration/refactor-orchestrator';

describe('System Integration Tests', () => {
  // Define agents
  let orchestrator: OrchestratorAgent;
  let planner: PlannerAgent;
  let executor: ExecutorAgent;
  let builder: BuildAgent;
  let notion: NotionAgent;
  let reviewer: ReviewerAgent;
  let refactor: RefactorAgent;
  
  // Define integrations
  let plannerOrchestrator: PlannerOrchestratorIntegration;
  let plannerExecutor: PlannerExecutorIntegration;
  let executorOrchestrator: ExecutorOrchestratorIntegration;
  let buildOrchestrator: BuildOrchestratorIntegration;
  let notionOrchestrator: NotionOrchestratorIntegration;
  let reviewerOrchestrator: ReviewerOrchestratorIntegration;
  let refactorOrchestrator: RefactorOrchestratorIntegration;
  
  beforeEach(() => {
    // Initialize agents with test configurations
    orchestrator = new OrchestratorAgent({ 
      workflowDir: './test-workflows',
      statePersistence: 'memory'
    });
    
    planner = new PlannerAgent({
      logLevel: 'error'
    });
    
    executor = new ExecutorAgent({
      workDir: './test-workspace',
      logLevel: 'error'
    });
    
    builder = new BuildAgent({
      projectRoot: './test-project',
      templateDir: './test-templates'
    });
    
    notion = new NotionAgent({
      // Using mock config for tests
      apiKey: 'test-api-key',
      projectDatabaseId: 'test-project-db',
      taskDatabaseId: 'test-task-db'
    });
    
    reviewer = new ReviewerAgent({
      logLevel: 'error'
    });
    
    refactor = new RefactorAgent({
      logLevel: 'error'
    });
    
    // Create integrations
    plannerOrchestrator = new PlannerOrchestratorIntegration(orchestrator, planner);
    plannerExecutor = new PlannerExecutorIntegration(planner, executor);
    executorOrchestrator = new ExecutorOrchestratorIntegration(orchestrator, executor);
    buildOrchestrator = new BuildOrchestratorIntegration(orchestrator, builder);
    notionOrchestrator = new NotionOrchestratorIntegration(orchestrator, notion);
    reviewerOrchestrator = new ReviewerOrchestratorIntegration(orchestrator, reviewer);
    refactorOrchestrator = new RefactorOrchestratorIntegration(orchestrator, refactor);
  });
  
  // Skip this test in normal runs to avoid actual API calls
  test.skip('Full system integration flow', async () => {
    // 1. Create a project plan with the planner
    const projectRequirements = {
      name: 'Test Integration Project',
      description: 'A test project to validate the integration of all agents',
      objectives: [
        'Create a simple web application',
        'Use a modern frontend framework',
        'Include automated testing'
      ],
      constraints: [
        'Complete within 2 weeks',
        'Use TypeScript',
        'Follow best practices'
      ]
    };
    
    // Generate plan with the planner
    const plan = await planner.generateProjectPlan(projectRequirements);
    
    // 2. Create workflow from plan via orchestrator
    const workflow = await plannerOrchestrator.createWorkflowFromPlan(plan);
    
    // 3. Execute setup tasks via executor
    const setupPhaseResult = await executorOrchestrator.executeCommandWorkflow(workflow);
    
    // 4. Generate components via builder
    const componentSpec = {
      name: 'UIComponents',
      components: [
        { name: 'Header', type: 'module' },
        { name: 'Footer', type: 'module' },
        { name: 'Sidebar', type: 'module' }
      ],
      targetPath: '/src/components'
    };
    
    const buildResult = await buildOrchestrator.generateWorkflowComponents(componentSpec);
    
    // 5. Document in Notion
    const executionContext = {
      id: 'execution-1',
      workflowName: workflow.name,
      workflowId: workflow.id,
      status: 'completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      input: projectRequirements,
      output: setupPhaseResult,
      currentSteps: [],
      variables: {},
      metrics: {
        duration: 0,
        stepCount: 0,
        completedSteps: 0,
        taskCount: 0,
        errorCount: 0,
        retryCount: 0
      }
    };
    
    const documentationResult = await notionOrchestrator.documentWorkflowExecution(executionContext);
    
    // 6. Validate workflow quality
    const qualityResult = await reviewerOrchestrator.validateWorkflowQuality(workflow);
    
    // 7. Optimize workflow
    const optimizationResult = await refactorOrchestrator.optimizeWorkflowStructure(workflow);
    
    // Assert all parts worked
    expect(plan).toBeDefined();
    expect(workflow).toBeDefined();
    expect(setupPhaseResult).toBeDefined();
    expect(buildResult.components.length).toBe(3);
    expect(documentationResult).toBeDefined();
    expect(qualityResult.valid).toBe(true);
    expect(optimizationResult).toBeDefined();
  });
  
  // This test can be run in normal test runs
  test('Multi-agent orchestration', async () => {
    // Mock the executeTask method for this test to avoid actual API calls
    jest.spyOn(planner, 'executeTask').mockImplementation(async (task) => {
      return { 
        id: 'plan-1',
        name: 'Test Plan',
        tasks: [
          { id: 'task-1', name: 'Setup Project', priority: 'high', description: 'Set up project structure', effort: 2, dependencies: [] }
        ]
      };
    });
    
    jest.spyOn(orchestrator, 'defineWorkflow').mockImplementation(async (id, definition) => {
      return {
        id,
        ...definition,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active' as const
      };
    });
    
    jest.spyOn(orchestrator, 'startWorkflow').mockImplementation(async () => {
      return {
        id: 'execution-1',
        workflowName: 'Test Workflow',
        workflowId: 'workflow-1',
        status: 'running',
        startTime: new Date().toISOString(),
        input: {},
        output: undefined,
        currentSteps: [],
        variables: {},
        metrics: {
          duration: 0,
          stepCount: 0,
          completedSteps: 0,
          taskCount: 0,
          errorCount: 0,
          retryCount: 0
        }
      };
    });
    
    // Create a multi-agent workflow
    const requirements = {
      name: 'Multi-Agent Test',
      description: 'Test multi-agent coordination'
    };
    
    // Generate a plan
    const plan = await planner.generateProjectPlan(requirements);
    
    // Create a workflow
    const workflow = await plannerOrchestrator.createWorkflowFromPlan(plan);
    
    // Create a step in the workflow that involves the build agent
    const buildStep = {
      id: 'build-step',
      name: 'Build Components',
      components: [{ name: 'TestComponent', type: 'module' }]
    };
    
    // Mock builder's createComponent
    jest.spyOn(builder, 'createComponent').mockImplementation(async () => {
      return {
        name: 'TestComponent',
        type: 'module',
        content: '// Generated TestComponent',
        path: 'src/testcomponent.ts'
      };
    });
    
    // Call build agent through orchestrator
    const buildResult = await buildOrchestrator.generateWorkflowComponents({
      name: 'TestWorkflow',
      components: [buildStep.components[0]],
      targetPath: '/test'
    });
    
    // Verify the results
    expect(plan).toBeDefined();
    expect(workflow).toBeDefined();
    expect(buildResult).toBeDefined();
    expect(buildResult.components).toHaveLength(1);
    expect(buildResult.components[0].name).toBe('TestComponent');
  });
});