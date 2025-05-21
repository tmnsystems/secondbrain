/**
 * Integration tests for the ExecutorAgent
 */
import { ExecutorAgent } from '../executor';
import { GitOperation } from '../types';
import * as path from 'path';
import * as fs from 'fs';

describe('ExecutorAgent Integration Tests', () => {
  let executor: ExecutorAgent;
  const testDir = path.join(process.cwd(), 'test-output', 'executor-tests');
  
  beforeAll(async () => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Initialize executor agent
    executor = new ExecutorAgent({
      workingDir: testDir,
      logLevel: 'debug'
    });
    
    await executor.initialize();
  });
  
  afterAll(async () => {
    await executor.shutdown();
    
    // Cleanup (uncomment to clean up after tests)
    // if (fs.existsSync(testDir)) {
    //   fs.rmSync(testDir, { recursive: true, force: true });
    // }
  });

  describe('Command Execution', () => {
    test('should execute simple echo command', async () => {
      const result = await executor.executeCommand('echo "Hello, World!"');
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('Hello, World!');
      expect(result.stderr).toBe('');
    });
    
    test('should handle command timeouts', async () => {
      const result = await executor.executeCommand('sleep 3', { timeoutMs: 1000 });
      
      expect(result.exitCode).not.toBe(0);
      expect(result.timedOut).toBe(true);
    });
    
    test('should reject potentially unsafe commands', async () => {
      const dangerousCommand = 'rm -rf /';
      const safeCommandsOnly = true;
      
      // Use internal validation
      const validateResult = await executor['validateCommand'](dangerousCommand, safeCommandsOnly);
      expect(validateResult).toBe(false);
    });
  });

  describe('File Operations', () => {
    test('should create and read a test file', async () => {
      const testFilePath = path.join(testDir, 'test-file.txt');
      const testContent = 'This is a test file';
      
      // Write file
      const writeResult = await executor.performFileOperation(
        'write',
        {
          path: testFilePath,
          data: testContent
        }
      );
      
      expect(writeResult.success).toBe(true);
      
      // Read file
      const readResult = await executor.performFileOperation(
        'read',
        {
          path: testFilePath
        }
      );
      
      expect(readResult.success).toBe(true);
      expect(readResult.data).toBe(testContent);
      
      // Clean up
      await executor.performFileOperation(
        'delete',
        {
          path: testFilePath
        }
      );
    });
  });

  describe('Git Operations', () => {
    test('should check git version', async () => {
      const result = await executor.performGitOperation(
        GitOperation.STATUS
      );
      
      // This test may fail if git is not installed
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle command not found errors', async () => {
      const result = await executor.executeCommand('non-existent-command');
      
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
    });
  });
});