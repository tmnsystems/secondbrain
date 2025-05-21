/**
 * Command Executor Module
 * 
 * Safely executes shell commands with proper validation, sanitization,
 * and security measures to prevent abuse.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface CommandExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
}

export interface CommandExecutionOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  safeCommandsOnly?: boolean;
}

// List of potentially dangerous commands that should be blocked
const DANGEROUS_COMMANDS = [
  'rm -rf /', 'rm -rf /*', 'rm -rf ~', 'rm -rf .', ':(){:|:&};:',
  '> /dev/sda', 'dd if=/dev/random', 'mv /* /dev/null',
  'wget', 'curl', '> /etc/passwd', 'chmod -R 777 /',
  'mkfs', 'dd if=/dev/zero'
];

// Commands that are allowed when safeCommandsOnly is true
const SAFE_COMMANDS = [
  'git', 'npm', 'node', 'ls', 'dir', 'echo', 'cd', 'mkdir', 'rmdir', 
  'cat', 'cp', 'mv', 'touch', 'pwd', 'test', 'find', 
  'pnpm', 'yarn', 'vercel', 'next', 'react-scripts',
  'jest', 'vite', 'tsx', 'ts-node'
];

/**
 * Validates if a command is safe to execute
 * 
 * @param command The command to validate
 * @param safeCommandsOnly Whether to restrict to only safe commands
 * @returns {boolean} True if the command is safe to execute
 */
function validateCommand(command: string, safeCommandsOnly: boolean = true): boolean {
  // Check for dangerous commands
  if (DANGEROUS_COMMANDS.some(dangerous => command.includes(dangerous))) {
    return false;
  }
  
  if (safeCommandsOnly) {
    // In safe mode, only allow commands that start with one of the safe commands
    return SAFE_COMMANDS.some(safe => 
      command.startsWith(safe + ' ') || command === safe);
  }
  
  return true;
}

/**
 * Sanitizes a command to prevent command injection
 * 
 * @param command The command to sanitize
 * @returns {string} The sanitized command
 */
function sanitizeCommand(command: string): string {
  // Basic sanitization - remove dangerous characters and sequences
  return command
    .replace(/&&|;|\|\||`|\$/g, '') // Remove command chaining characters
    .trim();
}

/**
 * Executes a shell command safely
 * 
 * @param command The command to execute
 * @param options Execution options
 * @returns Promise that resolves with the command execution result
 */
export async function executeCommand(
  command: string, 
  options: CommandExecutionOptions = {}
): Promise<CommandExecutionResult> {
  const startTime = Date.now();
  const {
    cwd = process.cwd(),
    timeout = 30000,
    env = {},
    safeCommandsOnly = true
  } = options;
  
  // Sanitize the command
  const sanitizedCommand = sanitizeCommand(command);
  
  // Validate the command
  if (!validateCommand(sanitizedCommand, safeCommandsOnly)) {
    return {
      success: false,
      output: '',
      error: `Command rejected for security reasons: ${command}`,
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
  
  try {
    // Execute the command with the specified options
    const { stdout, stderr } = await execPromise(sanitizedCommand, {
      cwd,
      timeout,
      env: { ...process.env, ...env }
    });
    
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      exitCode: 0,
      executionTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      exitCode: error.code || -1,
      executionTime: Date.now() - startTime
    };
  }
}
