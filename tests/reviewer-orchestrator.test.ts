import { OrchestratorAgent } from '../libs/agents/orchestrator';
import { ReviewerAgent } from '../libs/agents/reviewer';
import { ReviewerOrchestratorIntegration } from '../libs/agents/integration/reviewer-orchestrator';
import { 
  Workflow, 
  WorkflowMetrics,
  ValidationResult
} from '../libs/agents/orchestrator/types';

// Add missing Workflow properties to test objects
const mockWorkflowProperties = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'active' as const
};

// Add missing ParallelBranch properties to test objects
const mockParallelBranch = (name: string): { name: string, steps: any[] } => ({
  name,
  steps: []
});

// Mock the OrchestratorAgent
jest.mock('../libs/agents/orchestrator', () => {
  const mockFindAgentsByType = jest.fn().mockImplementation((type: string) => {
    if (type === 'nonexistent') {
      return [];
    }
    
    return [{
      id: `${type}1`,
      name: `${type} Agent`,
      type,
      status: 'online',
      capabilities: ['code_review', 'security_check'],
      loadFactor: 0.5,
      taskCount: 2,
      successRate: 0.95,
      averageTaskDuration: 100,
      lastSeenTime: new Date().toISOString()
    }];
  });

  return {
    OrchestratorAgent: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        validateWorkflow: jest.fn().mockImplementation((workflow: Workflow) => {
          // Simple validation - check that workflow has steps
          if (!workflow.steps || workflow.steps.length === 0) {
            return {
              valid: false,
              errors: [{ path: 'steps', message: 'Workflow must have at least one step' }]
            };
          }
          return { valid: true, errors: [] };
        }),
        findAgentsByType: mockFindAgentsByType
      };
    })
  };
});

// Mock the ReviewerAgent
jest.mock('../libs/agents/reviewer', () => {
  return {
    ReviewerAgent: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe('ReviewerOrchestratorIntegration', () => {
  let orchestrator: any;
  let reviewer: any;
  let integration: ReviewerOrchestratorIntegration;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create instances
    orchestrator = new OrchestratorAgent();
    reviewer = new ReviewerAgent();
    
    // Create integration
    integration = new ReviewerOrchestratorIntegration(orchestrator, reviewer);
  });
  
  test('should validate workflow quality for valid workflow', async () => {
    const workflow: Workflow = {
      id: 'workflow1',
      name: 'Test Workflow',
      description: 'A test workflow',
      version: '1.0.0',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'task',
          capability: 'command_execution',
          input: {
            command: 'echo "Hello"'
          },
          onError: 'fail',
          timeout: 30000
        }
      ],
      ...mockWorkflowProperties
    };
    
    const result = await integration.validateWorkflowQuality(workflow);
    
    // Verify that the orchestrator.validateWorkflow was called
    expect(orchestrator.validateWorkflow).toHaveBeenCalledWith(workflow);
    
    // Verify the result structure
    expect(result).toEqual({
      valid: true,
      errors: [],
      recommendations: []
    });
  });
  
  test('should validate workflow quality for invalid workflow', async () => {
    const workflow: Workflow = {
      id: 'workflow2',
      name: 'Invalid Workflow',
      description: 'An invalid workflow',
      version: '1.0.0',
      steps: [], // Empty steps array will cause validation failure
      ...mockWorkflowProperties
    };
    
    const result = await integration.validateWorkflowQuality(workflow);
    
    // Verify that the orchestrator.validateWorkflow was called
    expect(orchestrator.validateWorkflow).toHaveBeenCalledWith(workflow);
    
    // Verify the result structure
    expect(result).toEqual({
      valid: false,
      errors: [{ path: 'steps', message: 'Workflow must have at least one step' }],
      recommendations: [
        'Fix structural issues before continuing with deeper validation',
        'Fix issue at steps: Workflow must have at least one step'
      ]
    });
  });
  
  test('should validate workflow quality with recommendations', async () => {
    const workflow: Workflow = {
      id: 'workflow3',
      name: 'Workflow with Issues',
      description: 'A workflow with quality issues',
      version: '1.0.0',
      steps: [
        {
          id: 'step1',
          name: '@Invalid Name!',
          type: 'task',
          capability: 'command_execution',
          input: {
            command: 'echo "Hello"'
          }
          // Missing onError and timeout
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'parallel',
          parallel: {
            branches: [
              // Need to fully instantiate ParallelBranch objects according to the interface
              mockParallelBranch('Branch 1'),
              mockParallelBranch('Branch 2'),
              mockParallelBranch('Branch 3'),
              mockParallelBranch('Branch 4'),
              mockParallelBranch('Branch 5'),
              mockParallelBranch('Branch 6')
            ]
          }
          // Missing onError and timeout
        }
      ],
      ...mockWorkflowProperties
    };
    
    const result = await integration.validateWorkflowQuality(workflow);
    
    // Verify that the orchestrator.validateWorkflow was called
    expect(orchestrator.validateWorkflow).toHaveBeenCalledWith(workflow);
    
    // Verify the result structure
    expect(result.valid).toBe(true);
    expect(result.recommendations).toContain('Improve step naming: use clear, descriptive names without special characters');
    expect(result.recommendations).toContain('Add error handling to steps that lack it');
    expect(result.recommendations).toContain('Set appropriate timeouts for steps to prevent indefinite hangs');
    expect(result.recommendations).toContain('Consider splitting very large parallel branches into smaller units');
  });
  
  test('should analyze workflow performance', async () => {
    const metrics: WorkflowMetrics = {
      workflowName: 'Test Workflow',
      totalExecutions: 10,
      activeExecutions: 1,
      averageDuration: 5000,
      successRate: 0.8,
      errorRate: 0.2,
      stepMetrics: {
        'step1': { 
          count: 10,
          averageDuration: 2000, 
          errorRate: 0.05, 
          retryRate: 0.1 
        },
        'step2': { 
          count: 10,
          averageDuration: 9000, // Slow step (> 1.5x average)
          errorRate: 0.15, // High error rate (> 0.1)
          retryRate: 0.25 // High retry rate (> 0.2)
        }
      },
      resourceUsage: {
        cpu: 0.85, // High CPU usage (> 0.8)
        memory: 0.65,
        network: 0.5
      },
      agentUtilization: {
        'agent1': 0.95, // High utilization (> 0.9)
        'agent2': 0.2 // Low utilization (< 0.3)
      }
    };
    
    const result = await integration.analyzeWorkflowPerformance(metrics);
    
    // Verify the result structure
    expect(result.workflowName).toBe(metrics.workflowName);
    expect(result.performanceScore).toBeLessThan(100); // Score should be reduced due to issues
    
    // Verify bottlenecks
    expect(result.bottlenecks.slowSteps).toContain('step2');
    expect(result.bottlenecks.highErrorSteps).toContain('step2');
    expect(result.bottlenecks.highRetrySteps).toContain('step2');
    expect(result.bottlenecks.resourceIssues).toContain('High CPU utilization');
    
    // Verify recommendations
    expect(result.recommendations).toContain('Optimize slow steps: step2');
    expect(result.recommendations).toContain('Improve error handling for steps with high error rates: step2');
    expect(result.recommendations).toContain('Investigate steps with high retry rates: step2');
    expect(result.recommendations).toContain('Workflow error rate is above 10%, investigate and resolve recurring issues');
    expect(result.recommendations).toContain('CPU usage is high, consider optimizing computationally intensive steps');
    expect(result.recommendations).toContain('Agent(s) with high utilization may be bottlenecks: agent1');
    expect(result.recommendations).toContain('Consider redistributing tasks from high to low utilization agents: agent2');
    
    expect(result.improvementPotential).toBe('high');
  });
  
  test('should verify agent integration for valid agents', async () => {
    const integrationConfig = {
      sourceAgent: 'Planner',
      targetAgent: 'Executor',
      requiredCapabilities: ['project_analysis', 'command_execution']
    };
    
    const result = await integration.verifyAgentIntegration(integrationConfig);
    
    // Verify that findAgentsByType was called for both agent types
    expect(orchestrator.findAgentsByType).toHaveBeenCalledWith('Planner');
    expect(orchestrator.findAgentsByType).toHaveBeenCalledWith('Executor');
    
    // Verify the result structure
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.agentTypes).toEqual({
      source: 'Planner',
      target: 'Executor'
    });
    expect(result.capabilities.source).toEqual(['code_review', 'security_check']);
    expect(result.capabilities.target).toEqual(['code_review', 'security_check']);
    expect(result.capabilities.missing).toEqual(['project_analysis', 'command_execution']);
    
    expect(result.recommendations).toContain('Add missing capabilities to one of the agent types');
  });
  
  test('should verify agent integration for nonexistent agents', async () => {
    const integrationConfig = {
      sourceAgent: 'nonexistent',
      targetAgent: 'Executor',
      requiredCapabilities: ['command_execution']
    };
    
    const result = await integration.verifyAgentIntegration(integrationConfig);
    
    // Verify the result structure
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Source agent type 'nonexistent' not found in registry");
    expect(result.recommendations).toContain('Register missing agent types before attempting integration');
  });
  
  test('should check workflow security', async () => {
    const workflow: Workflow = {
      id: 'workflow4',
      name: 'Security Test Workflow',
      description: 'A workflow with security issues',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          name: { type: 'string' as const }
          // Missing 'data' input validation
        }
      },
      steps: [
        {
          id: 'step1',
          name: 'Deployment Step',
          type: 'task',
          capability: 'deployment',
          input: {
            data: 'workflow.input.data' // Uses unvalidated input
          }
          // Missing error handling, timeout, and agent restriction
        }
      ],
      ...mockWorkflowProperties
    };
    
    const result = await integration.checkWorkflowSecurity(workflow);
    
    // Verify the result structure
    expect(result.workflowName).toBe(workflow.name);
    expect(result.securityScore).toBeLessThan(100); // Score should be reduced due to issues
    
    // Verify security issues
    expect(result.issues.total).toBeGreaterThan(0);
    
    // Check for specific security issues
    const issueTypes = result.securityIssues.map((issue: any) => issue.issue);
    expect(issueTypes).toEqual(expect.arrayContaining([
      expect.stringContaining('uses input "data" which is not validated in workflow input schema'),
      expect.stringContaining('does not have error handling'),
      expect.stringContaining('does not have a timeout specified'),
      expect.stringContaining('performs sensitive operation "deployment" without agent restriction')
    ]));
    
    // Verify recommendations
    expect(result.recommendations).toEqual(expect.arrayContaining([
      expect.stringContaining('Add validation for'),
      expect.stringContaining('Add proper error handling'),
      expect.stringContaining('Add a timeout'),
      expect.stringContaining('Restrict execution to specific trusted agent')
    ]));
  });
});