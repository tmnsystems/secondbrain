import { ExecutorAgent } from '../libs/agents/executor';
import { FileOperation } from '../libs/agents/executor/types';
import { PlannerExecutorIntegration } from '../libs/agents/integration/planner-executor';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

describe('PlannerExecutorIntegration', () => {
  let executor: ExecutorAgent;
  let integration: PlannerExecutorIntegration;
  const testDir = path.join(process.cwd(), 'test-output', 'planner-executor-test');
  
  beforeEach(async () => {
    // Create executor agent
    executor = new ExecutorAgent({
      logLevel: 'error', // Minimize console output during tests
      allowShell: true, // Allow shell commands for testing
      workingDir: testDir // Use a test directory
    });
    
    // Initialize executor
    await executor.initialize();
    
    // Create integration
    integration = new PlannerExecutorIntegration(executor);
    
    // Create test directory
    await executor.performFileOperation(FileOperation.MKDIR, {
      path: testDir,
      recursive: true
    });
  });
  
  test('should execute setup task', async () => {
    // Create a simple setup task
    const task = {
      id: uuidv4(),
      name: 'Project Setup',
      description: 'Initialize project repository and structure',
      type: 'setup' as const, // Cast to literal type
      priority: 'high' as const, // Cast to literal type
      estimatedDuration: 60, // 1 hour
      dependencies: []
    };
    
    // Execute the task
    const result = await integration.executeTask(task, testDir);
    
    // Check results
    expect(result).toBeDefined();
    expect(result.message).toContain('Setup completed');
    
    // Verify directory was created
    const dirExists = await fs.promises.stat(testDir).then(
      () => true,
      () => false
    );
    expect(dirExists).toBe(true);
  });
  
  test('should execute implementation task', async () => {
    // Create component ID
    const componentId = uuidv4();
    
    // Create an implementation task
    const task = {
      id: uuidv4(),
      name: 'Core Component',
      description: 'Implement core component functionality',
      type: 'implementation' as const, // Cast to literal type
      priority: 'high' as const, // Cast to literal type
      estimatedDuration: 120, // 2 hours
      components: [componentId],
      dependencies: []
    };
    
    // Execute the task
    const result = await integration.executeTask(task, testDir);
    
    // Check results
    expect(result).toBeDefined();
    expect(result.message).toContain('Implementation completed');
    expect(result.files).toBeDefined();
    expect(result.files.length).toBeGreaterThan(0);
    
    // Verify files were created
    const componentDir = path.join(testDir, 'src', 'core');
    const indexPath = path.join(componentDir, 'index.ts');
    
    const indexExists = await fs.promises.stat(indexPath).then(
      () => true,
      () => false
    );
    expect(indexExists).toBe(true);
  });
  
  test('should execute documentation task', async () => {
    // Create component ID
    const componentId = uuidv4();
    
    // Create a documentation task
    const task = {
      id: uuidv4(),
      name: 'Component Documentation',
      description: 'Create documentation for the component',
      type: 'documentation' as const, // Cast to literal type
      priority: 'medium' as const, // Cast to literal type
      estimatedDuration: 90, // 1.5 hours
      components: [componentId],
      dependencies: []
    };
    
    // Execute the task
    const result = await integration.executeTask(task, testDir);
    
    // Check results
    expect(result).toBeDefined();
    expect(result.message).toContain('Documentation completed');
    
    // Verify documentation directory and files were created
    const docsDir = path.join(testDir, 'docs');
    
    const docsDirExists = await fs.promises.stat(docsDir).then(
      () => true,
      () => false
    );
    expect(docsDirExists).toBe(true);
  });
  
  afterAll(async () => {
    // Clean up
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  });
});