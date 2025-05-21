import { AbstractAgent, Task, TaskResult, Capability } from '../libs/common';

// Create a concrete implementation of AbstractAgent for testing
class TestAgent extends AbstractAgent {
  constructor(config = {}) {
    super('test', config);
  }

  getCapabilities(): Capability[] {
    return [
      {
        name: 'test_capability',
        description: 'A test capability',
        parameters: {
          input: {
            type: 'string',
            description: 'Test input',
            required: true
          }
        },
        result: {
          type: 'string',
          description: 'Test result'
        }
      }
    ];
  }

  protected async performTask(task: Task): Promise<any> {
    if (task.type === 'test_capability') {
      return `Processed: ${task.input?.value}`;
    } else {
      throw new Error(`Unsupported task type: ${task.type}`);
    }
  }
}

describe('AbstractAgent', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent({
      logLevel: 'error' // Minimize console output during tests
    });
  });

  test('should initialize correctly', async () => {
    await agent.initialize();
    const info = agent.getInfo();
    
    expect(info.type).toBe('test');
    expect(info.status).toBe('online');
    expect(info.capabilities).toContain('test_capability');
  });

  test('should execute task successfully', async () => {
    await agent.initialize();
    
    const task: Task = {
      id: '123',
      name: 'Test Task',
      type: 'test_capability',
      input: { value: 'test_value' }
    };
    
    const result = await agent.executeTask(task);
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('Processed: test_value');
    expect(result.taskId).toBe('123');
  });

  test('should handle task execution failure', async () => {
    await agent.initialize();
    
    const task: Task = {
      id: '123',
      name: 'Test Task',
      type: 'unsupported_capability',
      input: { value: 'test_value' }
    };
    
    const result = await agent.executeTask(task);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Unsupported task type');
  });

  test('should return health status', async () => {
    await agent.initialize();
    
    const health = await agent.getHealth();
    
    expect(health.status).toBe('healthy');
    expect(health.details).toBeDefined();
  });

  test('should shutdown correctly', async () => {
    await agent.initialize();
    await agent.shutdown();
    
    const info = agent.getInfo();
    expect(info.status).toBe('offline');
  });
});