import { ExecutorAgent } from '../libs/agents/executor';
import { GitOperation, FileOperation } from '../libs/agents/executor/types';

describe('ExecutorAgent', () => {
  let agent: ExecutorAgent;

  beforeEach(() => {
    agent = new ExecutorAgent({
      logLevel: 'error', // Minimize console output during tests
      allowShell: true, // Allow shell commands for testing
      workingDir: './test-output' // Use a test directory
    });
  });

  test('should initialize correctly', async () => {
    await agent.initialize();
    const info = agent.getInfo();
    
    expect(info.type).toBe('executor');
    expect(info.status).toBe('online');
    expect(info.capabilities).toContain('command_execution');
    expect(info.capabilities).toContain('git_operations');
    expect(info.capabilities).toContain('file_operations');
  });

  test('should execute simple commands', async () => {
    await agent.initialize();
    
    // This tests basic command execution - use a simpler command that should work on all platforms
    // We'll use 'pwd' which is commonly available on Unix-based systems
    // On Windows, we'd use 'echo %cd%' but we'll skip detailed testing for cross-platform for now
    const result = await agent.executeCommand('pwd');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toBe('');
    expect(result.command).toBe('pwd');
  });

  test('should handle command execution failures', async () => {
    await agent.initialize();
    
    // This tests command execution failure - use a non-existent command that should fail
    const result = await agent.executeCommand('thisisnotarealcommandthatwilleverexist');
    
    expect(result.exitCode).not.toBe(0);
    // Different platforms may handle errors differently, 
    // so we'll just check if something is present in stderr or error
    expect(result.stderr !== '' || result.error !== undefined).toBeTruthy();
  });

  test('should perform file operations', async () => {
    await agent.initialize();
    
    // Create a test directory
    const mkdirResult = await agent.performFileOperation(
      FileOperation.MKDIR,
      { path: './test-output', recursive: true }
    );
    
    expect(mkdirResult.success).toBe(true);
    
    // Write a file
    const writeResult = await agent.performFileOperation(
      FileOperation.WRITE,
      { 
        path: './test-output/test.txt', 
        data: 'Hello, world!', 
        recursive: true 
      }
    );
    
    expect(writeResult.success).toBe(true);
    
    // Read the file
    const readResult = await agent.performFileOperation(
      FileOperation.READ,
      { path: './test-output/test.txt' }
    );
    
    expect(readResult.success).toBe(true);
    expect(readResult.data).toBe('Hello, world!');
  });

  test('should simulate deployments', async () => {
    await agent.initialize();
    
    const result = await agent.deploy('development', {
      projectPath: './test-output'
    });
    
    expect(result.success).toBe(true);
    expect(result.target).toBe('development');
    expect(result.url).toBeDefined();
  });

  test('should simulate system monitoring', async () => {
    await agent.initialize();
    
    const result = await agent.monitorSystem(['cpu', 'memory']);
    
    expect(result.success).toBe(true);
    expect(result.resources.cpu).toBeDefined();
    expect(result.resources.memory).toBeDefined();
  });

  afterAll(async () => {
    // Clean up
    try {
      await agent.performFileOperation(
        FileOperation.RMDIR,
        { path: './test-output', recursive: true }
      );
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  });
});