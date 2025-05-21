/**
 * Enhanced Command Executor Module
 * 
 * Extends the basic command executor with additional security features,
 * retry mechanisms, and improved error handling.
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { CommandOptions, CommandResult } from './types';

const execPromise = promisify(exec);

// Expanded list of potentially dangerous commands
const DANGEROUS_COMMANDS = [
  'rm -rf /', 'rm -rf /*', 'rm -rf ~', 'rm -rf .', ':(){:|:&};:',
  '> /dev/sda', 'dd if=/dev/random', 'mv /* /dev/null',
  'wget', 'curl', '> /etc/passwd', 'chmod -R 777 /',
  'mkfs', 'dd if=/dev/zero', 'format', 'deltree',
  ';rm', '|rm', '||rm', '&&rm', 'sudo rm', 'sudo su',
  'eval', '$(', '`', 'nc -e', 'curl | bash',
  'wget | bash', 'wget -O- | bash', 'curl -s | bash'
];

// Expanded list of safe commands
const SAFE_COMMANDS = [
  'git', 'npm', 'node', 'ls', 'dir', 'echo', 'cd', 'mkdir', 'rmdir', 
  'cat', 'cp', 'mv', 'touch', 'pwd', 'test', 'find', 
  'pnpm', 'yarn', 'vercel', 'next', 'react-scripts',
  'jest', 'vite', 'tsx', 'ts-node', 'npm', 'npx',
  'tsc', 'prettier', 'eslint', 'docker', 'docker-compose',
  'aws', 'az', 'gcloud', 'kubectl', 'helm',
  'python', 'python3', 'pip', 'pip3', 'poetry',
  'bash', 'sh', 'zsh', 'ps', 'grep', 'sed', 'awk',
  'clear', 'exit', 'history', 'date', 'cal', 'env',
  'sleep', 'timeout', 'crontab', 'diff', 'patch',
  'ping', 'netstat', 'ss', 'nc', 'ssh', 'scp'
];

/**
 * Enhanced validation function for commands
 * 
 * @param command The command to validate
 * @param safeCommandsOnly Whether to restrict to only safe commands
 * @returns {boolean} True if the command is safe to execute
 */
export function validateCommand(command: string, safeCommandsOnly: boolean = true): boolean {
  // Check for dangerous commands
  if (DANGEROUS_COMMANDS.some(dangerous => 
    command.toLowerCase().includes(dangerous.toLowerCase()))) {
    return false;
  }
  
  if (safeCommandsOnly) {
    // In safe mode, only allow commands that start with one of the safe commands
    // This includes commands with paths like /usr/bin/git
    return SAFE_COMMANDS.some(safe => {
      const pattern = new RegExp(`(^|/)${safe}(\\s|$)`);
      return pattern.test(command);
    });
  }
  
  return true;
}

/**
 * Enhanced sanitization for commands to prevent injection
 * 
 * @param command The command to sanitize
 * @returns {string} The sanitized command
 */
export function sanitizeCommand(command: string): string {
  // Remove potentially dangerous characters and sequences
  return command
    .replace(/&&|\|\||;|`|\$/g, '') // Remove command chaining characters
    .replace(/\$\([^)]*\)/g, '') // Remove command substitution
    .replace(/`[^`]*`/g, '') // Remove backtick command substitution
    .trim();
}

/**
 * Executes a command with retry capability for transient errors
 * 
 * @param command The command to execute
 * @param options Command options including retry settings
 * @returns Promise resolving to command execution result
 */
export async function executeCommandWithRetry(
  command: string,
  options: CommandOptions & { 
    retries?: number, 
    retryDelay?: number,
    retryableErrors?: string[] 
  } = {}
): Promise<CommandResult> {
  const {
    retries = 3,
    retryDelay = 1000,
    retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'],
    ...commandOptions
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await executeEnhancedCommand(command, commandOptions);
    } catch (error: any) {
      lastError = error;
      
      // Check if this error is retryable
      const errorCode = error?.code || '';
      const isRetryable = retryableErrors.includes(errorCode);
      
      if (isRetryable && attempt < retries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      break;
    }
  }
  
  // All retries failed, return error result
  return {
    exitCode: -1,
    stdout: '',
    stderr: lastError?.message || 'Command execution failed after retries',
    duration: 0,
    timedOut: false,
    error: lastError?.message || 'Maximum retry attempts reached',
    command
  };
}

/**
 * Enhanced command execution with improved error handling and output capturing
 * 
 * @param command The command to execute
 * @param options Execution options
 * @returns Promise resolving to command execution result
 */
export async function executeEnhancedCommand(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  const startTime = Date.now();
  const {
    cwd = process.cwd(),
    timeoutMs = 30000,
    env = {},
    captureStdout = true,
    captureStderr = true,
    maxOutputSize = 1024 * 1024 * 5, // 5MB
    shell = false
  } = options;
  
  // Sanitize the command
  const sanitizedCommand = sanitizeCommand(command);
  
  // Validate the command (implement safety checks here)
  if (!validateCommand(sanitizedCommand, true)) {
    return {
      exitCode: -1,
      stdout: '',
      stderr: `Command rejected for security reasons: ${command}`,
      duration: Date.now() - startTime,
      timedOut: false,
      error: `Command rejected for security reasons: ${command}`,
      command
    };
  }
  
  return new Promise<CommandResult>((resolve) => {
    // Split command into parts if not using shell
    let cmd: string;
    let args: string[] = [];
    
    if (shell) {
      cmd = typeof shell === 'string' ? shell : '/bin/sh';
      args = ['-c', sanitizedCommand];
    } else {
      const parts = sanitizedCommand.split(' ');
      cmd = parts[0];
      args = parts.slice(1);
    }
    
    // Set up timeout
    let timeoutId: NodeJS.Timeout | undefined;
    let timedOut = false;
    
    // Start process
    const proc = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: !!shell
    });
    
    // Set up timeout if specified
    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        
        // Force kill after 2 seconds if SIGTERM doesn't work
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 2000);
      }, timeoutMs);
    }
    
    // Collect output
    let stdout = '';
    let stderr = '';
    
    if (captureStdout) {
      proc.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        if (stdout.length + chunk.length <= maxOutputSize) {
          stdout += chunk;
        }
      });
    }
    
    if (captureStderr) {
      proc.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        if (stderr.length + chunk.length <= maxOutputSize) {
          stderr += chunk;
        }
      });
    }
    
    // Handle completion
    proc.on('close', (code: number | null) => {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Calculate duration
      const duration = Date.now() - startTime;
      
      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
        duration,
        timedOut,
        command: sanitizedCommand
      });
    });
    
    // Handle errors
    proc.on('error', (error: Error) => {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Calculate duration
      const duration = Date.now() - startTime;
      
      resolve({
        exitCode: -1,
        stdout,
        stderr,
        duration,
        timedOut,
        error: error.message,
        command: sanitizedCommand
      });
    });
  });
}

/**
 * Executes multiple commands in sequence
 * 
 * @param commands Array of commands to execute
 * @param options Command options
 * @returns Promise resolving to array of command results
 */
export async function executeCommands(
  commands: string[],
  options: CommandOptions = {}
): Promise<CommandResult[]> {
  const results: CommandResult[] = [];
  
  for (const command of commands) {
    const result = await executeEnhancedCommand(command, options);
    results.push(result);
    
    // Stop execution if a command fails
    if (result.exitCode !== 0) {
      break;
    }
  }
  
  return results;
}

/**
 * Executes command and parses JSON output
 * 
 * @param command Command that outputs JSON
 * @param options Command options
 * @returns Promise resolving to parsed JSON output
 */
export async function executeJsonCommand<T = any>(
  command: string,
  options: CommandOptions = {}
): Promise<T> {
  const result = await executeEnhancedCommand(command, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
  }
  
  try {
    return JSON.parse(result.stdout) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON output: ${error}`);
  }
}