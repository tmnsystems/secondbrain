import { OrchestratorAgent } from '../libs/agents/orchestrator';
import { BuildAgent } from '../libs/agents/build';
import { BuildOrchestratorIntegration } from '../libs/agents/integration/build-orchestrator';
import { AgentInfo, Capability } from '../libs/agents/orchestrator/types';

// Mock the OrchestratorAgent
jest.mock('../libs/agents/orchestrator', () => {
  return {
    OrchestratorAgent: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        findAgentsByCapability: jest.fn().mockResolvedValue([
          { id: 'agent1', name: 'Agent 1', capabilities: ['code_generation'] }
        ]),
        assignTask: jest.fn().mockResolvedValue({
          taskId: 'task123',
          agentId: 'agent1'
        }),
        getTaskStatus: jest.fn().mockResolvedValue({
          status: 'completed',
          result: { success: true, files: ['file1.ts', 'file2.ts'] }
        })
      };
    })
  };
});

// Mock the BuildAgent
jest.mock('../libs/agents/build', () => {
  return {
    BuildAgent: jest.fn().mockImplementation((config) => {
      // Ensure config has the required projectRoot
      const safeConfig = {
        projectRoot: '/test/project',
        ...(config || {})
      };
      
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        createComponent: jest.fn().mockImplementation(async (name, type = 'module', options = {}) => {
          // Handle both object spec and direct parameters
          let componentName = name;
          let componentType = type;
          
          // If a component spec object is passed as the first parameter, extract values from it
          if (typeof name === 'object') {
            const spec = name;
            componentName = spec.name;
            componentType = spec.type || 'module';
          }
          
          return {
            name: componentName,
            type: componentType,
            content: `// Generated ${componentName}`,
            path: `src/${componentName.toLowerCase()}.ts`
          };
        })
      };
    })
  };
});

describe('BuildOrchestratorIntegration', () => {
  let orchestrator: jest.Mocked<OrchestratorAgent>;
  let builder: jest.Mocked<BuildAgent>;
  let integration: BuildOrchestratorIntegration;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create instances with minimal config objects
    orchestrator = new OrchestratorAgent({}) as jest.Mocked<OrchestratorAgent>;
    builder = new BuildAgent({ projectRoot: '/test/project' }) as jest.Mocked<BuildAgent>;
    
    // Create integration
    integration = new BuildOrchestratorIntegration(orchestrator, builder);
  });
  
  test('should generate workflow components', async () => {
    const spec = {
      name: 'TestWorkflow',
      components: [
        { name: 'Component1', type: 'module' },
        { name: 'Component2', type: 'module' }
      ],
      targetPath: '/src/workflows'
    };
    
    const result = await integration.generateWorkflowComponents(spec);
    
    // Verify that the builder.createComponent was called for each component
    expect(builder.createComponent).toHaveBeenCalledTimes(2);
    expect(builder.createComponent).toHaveBeenCalledWith(
      spec.components[0].name, 
      spec.components[0].type || 'module', 
      spec.components[0]
    );
    expect(builder.createComponent).toHaveBeenCalledWith(
      spec.components[1].name, 
      spec.components[1].type || 'module', 
      spec.components[1]
    );
    
    // Verify the result structure
    expect(result).toEqual({
      name: spec.name,
      components: [
        {
          name: 'Component1',
          type: 'module',
          content: '// Generated Component1',
          path: 'src/component1.ts'
        },
        {
          name: 'Component2',
          type: 'module',
          content: '// Generated Component2',
          path: 'src/component2.ts'
        }
      ],
      path: spec.targetPath,
      generatedAt: expect.any(String)
    });
  });
  
  test('should create integration layer', async () => {
    const agents: AgentInfo[] = [
      {
        id: 'agent1',
        name: 'Agent 1',
        type: 'Planner',
        status: 'online', // Changed from 'active' to match the enum
        capabilities: ['project_analysis', 'task_generation'],
        loadFactor: 0.5,
        taskCount: 0,
        successRate: 1.0,
        averageTaskDuration: 100,
        lastSeenTime: new Date().toISOString()
      },
      {
        id: 'agent2',
        name: 'Agent 2',
        type: 'Executor',
        status: 'online', // Changed from 'active' to match the enum
        capabilities: ['command_execution', 'deployment'],
        loadFactor: 0.2,
        taskCount: 0,
        successRate: 1.0,
        averageTaskDuration: 150,
        lastSeenTime: new Date().toISOString()
      }
    ];
    
    const result = await integration.createIntegrationLayer(agents);
    
    // Verify the number of component generations
    // 1 for each agent type plus 1 for the index file
    expect(builder.createComponent).toHaveBeenCalledTimes(3);
    
    // Verify the result structure
    expect(result).toEqual({
      files: [
        {
          name: 'PlannerIntegration',
          type: 'module',
          content: '// Generated PlannerIntegration',
          path: 'src/plannerintegration.ts'
        },
        {
          name: 'ExecutorIntegration',
          type: 'module',
          content: '// Generated ExecutorIntegration',
          path: 'src/executorintegration.ts'
        },
        {
          name: 'index',
          type: 'module',
          content: '// Generated index',
          path: 'src/index.ts'
        }
      ],
      agents: ['Planner', 'Executor'],
      generatedAt: expect.any(String)
    });
  });
  
  test('should implement custom step types', async () => {
    const stepTypes = [
      {
        name: 'ApiCall',
        description: 'Makes an API call',
        implementation: 'console.log("API call step");'
      },
      {
        name: 'DataTransform',
        description: 'Transforms data',
        implementation: 'console.log("Data transform step");'
      }
    ];
    
    const result = await integration.implementCustomStepTypes(stepTypes);
    
    // Verify the number of component generations
    // 1 for each step type plus 1 for the registry file
    expect(builder.createComponent).toHaveBeenCalledTimes(3);
    
    // Verify the result structure
    expect(result).toEqual({
      steps: ['ApiCall', 'DataTransform'],
      files: [
        {
          name: 'ApiCallStep',
          type: 'module',
          content: '// Generated ApiCallStep',
          path: 'src/apicallstep.ts'
        },
        {
          name: 'DataTransformStep',
          type: 'module',
          content: '// Generated DataTransformStep',
          path: 'src/datatransformstep.ts'
        },
        {
          name: 'stepsRegistry',
          type: 'module',
          content: '// Generated stepsRegistry',
          path: 'src/stepsregistry.ts'
        }
      ],
      generatedAt: expect.any(String)
    });
  });
  
  test('should extend workflow capabilities', async () => {
    const capabilities = [
      {
        name: 'RemoteExecution',
        description: 'Executes code on remote systems',
        implementation: 'console.log("Remote execution capability");'
      },
      {
        name: 'DataValidation',
        description: 'Validates data structure and content',
        implementation: 'console.log("Data validation capability");'
      }
    ] as any[]; // Cast to any[] to match the implementation
    
    const result = await integration.extendWorkflowCapabilities(capabilities);
    
    // Verify the number of component generations
    // 1 for each capability plus 1 for the registry file
    expect(builder.createComponent).toHaveBeenCalledTimes(3);
    
    // Verify the result structure
    expect(result).toEqual({
      capabilities: ['RemoteExecution', 'DataValidation'],
      files: [
        {
          name: 'RemoteExecutionCapability',
          type: 'module',
          content: '// Generated RemoteExecutionCapability',
          path: 'src/remoteexecutioncapability.ts'
        },
        {
          name: 'DataValidationCapability',
          type: 'module',
          content: '// Generated DataValidationCapability',
          path: 'src/datavalidationcapability.ts'
        },
        {
          name: 'capabilitiesRegistry',
          type: 'module',
          content: '// Generated capabilitiesRegistry',
          path: 'src/capabilitiesregistry.ts'
        }
      ],
      generatedAt: expect.any(String)
    });
  });
});