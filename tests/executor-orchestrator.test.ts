import { OrchestratorAgent } from '../libs/agents/orchestrator';
import { ExecutorAgent } from '../libs/agents/executor';
import { ExecutorOrchestratorIntegration } from '../libs/agents/integration/executor-orchestrator';
import { Workflow } from '../libs/agents/orchestrator/types';

// Add missing Workflow properties to test objects
const mockWorkflowProperties = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'active' as const
};

// Mock the OrchestratorAgent
jest.mock('../libs/agents/orchestrator', () => {
  return {
    OrchestratorAgent: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        startWorkflow: jest.fn().mockResolvedValue({
          id: 'execution123',
          workflowId: 'workflow1',
          status: 'running',
          startTime: new Date().toISOString()
        }),
        subscribeToEvents: jest.fn().mockImplementation((filter, callback) => {
          // Simulate workflow completion after a short delay
          setTimeout(() => {
            callback({
              type: 'execution.completed',
              executionId: 'execution123',
              workflowId: 'workflow1',
              output: {
                result: 'Workflow executed successfully',
                steps: 3,
                completedAt: new Date().toISOString()
              }
            });
          }, 100);
          
          return { unsubscribe: jest.fn() };
        }),
        defineWorkflow: jest.fn().mockImplementation((id, definition) => {
          return {
            id,
            ...definition,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active' as const
          };
        }),
        registerWebhook: jest.fn().mockResolvedValue({
          id: 'webhook123',
          event: 'system.alert',
          url: 'https://example.com/webhook'
        })
      };
    })
  };
});

// Mock the ExecutorAgent
jest.mock('../libs/agents/executor', () => {
  const mockMonitor = jest.fn().mockResolvedValue({
    id: 'monitor123',
    target: 'system',
    status: 'active',
    metrics: ['cpu', 'memory', 'disk', 'network'],
    startedAt: new Date().toISOString()
  });

  return {
    ExecutorAgent: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        monitor: mockMonitor
      };
    })
  };
});

describe('ExecutorOrchestratorIntegration', () => {
  let orchestrator: any;
  let executor: any;
  let integration: ExecutorOrchestratorIntegration;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create instances
    orchestrator = new OrchestratorAgent();
    executor = new ExecutorAgent();
    
    // Create integration
    integration = new ExecutorOrchestratorIntegration(orchestrator, executor);
  });
  
  test('should execute command workflow', async () => {
    const workflow: Workflow = {
      id: 'workflow1',
      name: 'Command Workflow',
      description: 'A workflow that executes commands',
      version: '1.0.0',
      steps: [
        {
          id: 'step1',
          name: 'First Command',
          type: 'task',
          capability: 'command_execution',
          input: {
            command: 'echo "Hello"'
          },
          next: 'step2'
        },
        {
          id: 'step2',
          name: 'Second Command',
          type: 'task',
          capability: 'command_execution',
          input: {
            command: 'ls -la'
          },
          next: 'step3'
        },
        {
          id: 'step3',
          name: 'Final Command',
          type: 'task',
          capability: 'command_execution',
          input: {
            command: 'echo "Done"'
          }
        }
      ],
      ...mockWorkflowProperties
    };
    
    const result = await integration.executeCommandWorkflow(workflow);
    
    // Verify that startWorkflow was called with the right workflow ID
    expect(orchestrator.startWorkflow).toHaveBeenCalledWith(workflow.id);
    
    // Verify that subscribeToEvents was called
    expect(orchestrator.subscribeToEvents).toHaveBeenCalledWith(
      { executionId: 'execution123' },
      expect.any(Function)
    );
    
    // Verify the result structure
    expect(result).toEqual({
      result: 'Workflow executed successfully',
      steps: 3,
      completedAt: expect.any(String)
    });
  });
  
  test('should manage deployment pipeline', async () => {
    const pipeline = {
      name: 'Test Pipeline',
      projectPath: '/path/to/project',
      environment: 'staging',
      prepareCommand: 'npm ci',
      buildCommand: 'npm run build',
      testPattern: 'tests/**/*.spec.ts'
    };
    
    const result = await integration.manageDeploymentPipeline(pipeline);
    
    // Verify that defineWorkflow was called
    expect(orchestrator.defineWorkflow).toHaveBeenCalledWith(
      expect.stringMatching(/^deployment-\d+$/),
      expect.objectContaining({
        name: `Deployment Pipeline: ${pipeline.name}`,
        steps: expect.arrayContaining([
          expect.objectContaining({
            id: 'prepare',
            input: { command: pipeline.prepareCommand }
          }),
          expect.objectContaining({
            id: 'build',
            input: { command: pipeline.buildCommand }
          }),
          expect.objectContaining({
            id: 'test',
            input: { pattern: pipeline.testPattern }
          }),
          expect.objectContaining({
            id: 'deploy',
            input: {
              environment: pipeline.environment,
              path: pipeline.projectPath
            }
          })
        ])
      })
    );
    
    // Verify that the workflow was executed
    expect(orchestrator.startWorkflow).toHaveBeenCalled();
    
    // Verify the result structure
    expect(result).toEqual({
      result: 'Workflow executed successfully',
      steps: 3,
      completedAt: expect.any(String)
    });
  });
  
  test('should configure system monitoring', async () => {
    const config = {
      target: 'application',
      interval: 30000,
      metrics: ['cpu', 'memory', 'requests'],
      alertThresholds: {
        cpu: 70,
        memory: 85
      },
      alertWebhook: 'https://example.com/alerts'
    };
    
    const result = await integration.configureSystemMonitoring(config);
    
    // Verify that executor.monitor was called with the right parameters
    expect(executor.monitor).toHaveBeenCalledWith(
      config.target,
      {
        interval: config.interval,
        metrics: config.metrics,
        alertThresholds: config.alertThresholds
      }
    );
    
    // Verify that registerWebhook was called for the alert webhook
    expect(orchestrator.registerWebhook).toHaveBeenCalledWith(
      'system.alert',
      config.alertWebhook
    );
    
    // Verify the result structure
    expect(result).toEqual({
      monitoring: {
        id: 'monitor123',
        target: 'system',
        status: 'active',
        metrics: ['cpu', 'memory', 'disk', 'network'],
        startedAt: expect.any(String)
      },
      metrics: {
        endpoint: '/metrics',
        interval: config.interval
      },
      alerts: {
        webhook: config.alertWebhook
      }
    });
  });
  
  test('should schedule recurring tasks', async () => {
    const tasks = [
      {
        name: 'Daily Backup',
        schedule: '0 0 * * *', // Daily at midnight
        workflow: {
          id: 'backup-workflow',
          name: 'Backup Workflow'
        }
      },
      {
        name: 'Weekly Report',
        schedule: '0 9 * * 1', // Every Monday at 9am
        workflow: {
          id: 'report-workflow',
          name: 'Report Generation Workflow'
        }
      }
    ];
    
    const result = await integration.scheduleRecurringTasks(tasks);
    
    // Verify the result structure
    expect(result.tasks).toHaveLength(2);
    expect(result.scheduleId).toMatch(/^schedule-\d+$/);
    expect(result.message).toBe('Recurring tasks scheduled successfully');
    
    // Verify task details
    result.tasks.forEach((scheduledTask: any, index: number) => {
      expect(scheduledTask.id).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(scheduledTask.name).toBe(tasks[index].name);
      expect(scheduledTask.schedule).toBe(tasks[index].schedule);
      expect(scheduledTask.workflow).toBe(tasks[index].workflow);
      expect(scheduledTask.next_run).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });
  
  test('should calculate next run time for schedule', () => {
    // Direct access to private method is not type-safe, let's make it explicit
    const integration_any = integration as any;
    const calculateNextRun = integration_any.calculateNextRun.bind(integration_any);
    
    const schedule = '0 9 * * 1'; // Every Monday at 9am
    const nextRun = calculateNextRun(schedule);
    
    // Just test that it returns a valid ISO date string
    expect(nextRun).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    
    // Should be in the future
    expect(new Date(nextRun).getTime()).toBeGreaterThan(Date.now());
  });
});