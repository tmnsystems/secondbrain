import { NotionAgent } from '../libs/agents/notion';
import { ExecutorAgent } from '../libs/agents/executor';
import { NotionExecutorIntegration, NotionExecutorConfig } from '../libs/agents/integration/notion-executor';

// Mock the NotionAgent
jest.mock('../libs/agents/notion', () => {
  return {
    NotionAgent: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        createPage: jest.fn().mockImplementation(async (params) => ({
          id: 'mock-page-id',
          ...params
        })),
        createBlocks: jest.fn().mockResolvedValue({ results: [] }),
        queryDatabase: jest.fn().mockImplementation(async (databaseId, params) => ({
          results: [
            {
              id: 'test-page-1',
              properties: {
                Timestamp: { date: { start: new Date().toISOString() } },
                Success: { checkbox: true },
                Environment: { select: { name: 'production' } },
                Version: { rich_text: [{ plain_text: '1.0.0' }] }
              }
            },
            {
              id: 'test-page-2',
              properties: {
                Timestamp: { date: { start: new Date().toISOString() } },
                Success: { checkbox: false },
                Environment: { select: { name: 'staging' } },
                Version: { rich_text: [{ plain_text: '0.9.0' }] }
              }
            }
          ]
        }))
      };
    })
  };
});

// Mock the ExecutorAgent
jest.mock('../libs/agents/executor', () => {
  return {
    ExecutorAgent: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe('NotionExecutorIntegration', () => {
  let notion: jest.Mocked<NotionAgent>;
  let executor: jest.Mocked<ExecutorAgent>;
  let integration: NotionExecutorIntegration;
  const config: NotionExecutorConfig = {
    executionLogDatabaseId: 'mock-execution-db',
    deploymentsLogDatabaseId: 'mock-deployments-db',
    systemMetricsDatabaseId: 'mock-metrics-db'
  };
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create instances
    notion = new NotionAgent() as jest.Mocked<NotionAgent>;
    executor = new ExecutorAgent() as jest.Mocked<ExecutorAgent>;
    
    // Create integration
    integration = new NotionExecutorIntegration(notion, executor, config);
  });
  
  test('should log command execution in Notion', async () => {
    // Execute the method
    const result = await integration.logExecution({
      command: 'npm run build',
      success: true,
      output: 'Build completed successfully',
      executionTime: 2500,
      timestamp: new Date()
    });
    
    // Check the result
    expect(result).toBeDefined();
    expect(result.id).toBe('mock-page-id');
    
    // Verify that createPage was called
    expect(notion.createPage).toHaveBeenCalledTimes(1);
    expect(notion.createPage).toHaveBeenCalledWith(expect.objectContaining({
      parent: { database_id: config.executionLogDatabaseId }
    }));
    
    // Verify that createBlocks was called
    expect(notion.createBlocks).toHaveBeenCalledTimes(1);
    expect(notion.createBlocks).toHaveBeenCalledWith('mock-page-id', expect.any(Array));
  });
  
  test('should log command execution with error in Notion', async () => {
    // Execute the method
    const result = await integration.logExecution({
      command: 'npm run build',
      success: false,
      output: '',
      error: 'Build failed: TypeScript error',
      executionTime: 1500,
      timestamp: new Date()
    });
    
    // Check the result
    expect(result).toBeDefined();
    expect(result.id).toBe('mock-page-id');
    
    // Verify that createPage was called
    expect(notion.createPage).toHaveBeenCalledTimes(1);
    expect(notion.createPage).toHaveBeenCalledWith(expect.objectContaining({
      parent: { database_id: config.executionLogDatabaseId }
    }));
    
    // Verify that createBlocks was called twice (once for output, once for error)
    expect(notion.createBlocks).toHaveBeenCalledTimes(2);
    expect(notion.createBlocks).toHaveBeenCalledWith('mock-page-id', expect.any(Array));
  });
  
  test('should log deployment in Notion', async () => {
    // Execute the method
    const result = await integration.logDeployment({
      project: 'SecondBrain',
      environment: 'production',
      success: true,
      logs: 'Deployment completed successfully',
      deploymentTime: 45000,
      version: '1.0.0',
      timestamp: new Date()
    });
    
    // Check the result
    expect(result).toBeDefined();
    expect(result.id).toBe('mock-page-id');
    
    // Verify that createPage was called
    expect(notion.createPage).toHaveBeenCalledTimes(1);
    expect(notion.createPage).toHaveBeenCalledWith(expect.objectContaining({
      parent: { database_id: config.deploymentsLogDatabaseId }
    }));
    
    // Verify that createBlocks was called
    expect(notion.createBlocks).toHaveBeenCalledTimes(1);
    expect(notion.createBlocks).toHaveBeenCalledWith('mock-page-id', expect.any(Array));
  });
  
  test('should log system metrics in Notion', async () => {
    // Execute the method
    const result = await integration.logSystemMetrics({
      cpu: 45.2,
      memory: 75.8,
      disk: 62.3,
      network: 25.4,
      processes: 128,
      notes: 'System is running normally',
      timestamp: new Date()
    });
    
    // Check the result
    expect(result).toBeDefined();
    expect(result.id).toBe('mock-page-id');
    
    // Verify that createPage was called
    expect(notion.createPage).toHaveBeenCalledTimes(1);
    expect(notion.createPage).toHaveBeenCalledWith(expect.objectContaining({
      parent: { database_id: config.systemMetricsDatabaseId }
    }));
    
    // Verify that createBlocks was called (for notes)
    expect(notion.createBlocks).toHaveBeenCalledTimes(1);
    expect(notion.createBlocks).toHaveBeenCalledWith('mock-page-id', expect.any(Array));
  });
  
  test('should create system health report in Notion', async () => {
    // Execute the method
    const result = await integration.createSystemHealthReport();
    
    // Check the result
    expect(result).toBeDefined();
    expect(result.id).toBe('mock-page-id');
    
    // Verify that queryDatabase was called twice
    expect(notion.queryDatabase).toHaveBeenCalledTimes(2);
    expect(notion.queryDatabase).toHaveBeenCalledWith(config.systemMetricsDatabaseId, expect.anything());
    expect(notion.queryDatabase).toHaveBeenCalledWith(config.deploymentsLogDatabaseId, expect.anything());
    
    // Verify that createPage was called
    expect(notion.createPage).toHaveBeenCalledTimes(1);
    expect(notion.createPage).toHaveBeenCalledWith(expect.objectContaining({
      parent: { database_id: config.systemMetricsDatabaseId }
    }));
    
    // Verify that createBlocks was called
    expect(notion.createBlocks).toHaveBeenCalledTimes(1);
    expect(notion.createBlocks).toHaveBeenCalledWith('mock-page-id', expect.any(Array));
  });
  
  test('should create deployment history report in Notion', async () => {
    // Execute the method
    const result = await integration.createDeploymentHistoryReport('SecondBrain');
    
    // Check the result
    expect(result).toBeDefined();
    expect(result.id).toBe('mock-page-id');
    
    // Verify that queryDatabase was called
    expect(notion.queryDatabase).toHaveBeenCalledTimes(1);
    expect(notion.queryDatabase).toHaveBeenCalledWith(config.deploymentsLogDatabaseId, expect.objectContaining({
      filter: expect.objectContaining({
        property: 'Project',
        title: expect.objectContaining({
          equals: 'SecondBrain'
        })
      })
    }));
    
    // Verify that createPage was called
    expect(notion.createPage).toHaveBeenCalledTimes(1);
    expect(notion.createPage).toHaveBeenCalledWith(expect.objectContaining({
      parent: { database_id: config.deploymentsLogDatabaseId }
    }));
    
    // Verify that createBlocks was called at least once
    expect(notion.createBlocks).toHaveBeenCalled();
    expect(notion.createBlocks).toHaveBeenCalledWith('mock-page-id', expect.any(Array));
  });
});