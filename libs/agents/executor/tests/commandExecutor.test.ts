/**
 * Command Executor Tests
 * 
 * Tests for the command execution engine of the Executor Agent.
 */

import { executeCommand } from '../commandExecutor';

describe('Command Executor', () => {
  test('should successfully execute a valid command', async () => {
    const result = await executeCommand('echo "Hello, Executor!"');
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe('Hello, Executor!');
    expect(result.exitCode).toBe(0);
  });

  test('should reject dangerous commands', async () => {
    const result = await executeCommand('rm -rf /');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Command rejected for security reasons');
    expect(result.exitCode).toBe(-1);
  });

  test('should sanitize commands with injection attempts', async () => {
    const result = await executeCommand('echo "test" && echo "injection"');
    expect(result.success).toBe(true);
    // The sanitizer should remove the && and only execute the first command
    expect(result.output.trim()).toBe('test echo injection');
  });

  test('should enforce safe commands only mode', async () => {
    const result = await executeCommand('custom-command', { safeCommandsOnly: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Command rejected for security reasons');
  });

  test('should allow custom commands when safe mode is disabled', async () => {
    // This test might fail if the command doesn't exist on the system
    // We're just testing the validation logic
    const result = await executeCommand('custom-command', { safeCommandsOnly: false });
    // Even if the command fails to execute, it should pass validation
    expect(result.error).not.toContain('Command rejected for security reasons');
  });
});