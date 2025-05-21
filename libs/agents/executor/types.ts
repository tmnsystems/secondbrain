import { AgentConfig, Task } from '../../common/types';

/**
 * Configuration for the Executor Agent
 */
export interface ExecutorAgentConfig extends AgentConfig {
  /**
   * Working directory for command execution
   */
  workingDir?: string;
  
  /**
   * Default timeout for commands in milliseconds
   */
  defaultTimeoutMs?: number;
  
  /**
   * Whether to capture stdout
   */
  captureStdout?: boolean;
  
  /**
   * Whether to capture stderr
   */
  captureStderr?: boolean;
  
  /**
   * Environment variables for command execution
   */
  env?: Record<string, string>;
  
  /**
   * Maximum output size in bytes
   */
  maxOutputSize?: number;
  
  /**
   * Whether to allow shell syntax
   */
  allowShell?: boolean;
}

/**
 * Command execution options
 */
export interface CommandOptions {
  /**
   * Working directory for the command
   */
  cwd?: string;
  
  /**
   * Timeout in milliseconds
   */
  timeoutMs?: number;
  
  /**
   * Environment variables
   */
  env?: Record<string, string>;
  
  /**
   * Whether to capture stdout
   */
  captureStdout?: boolean;
  
  /**
   * Whether to capture stderr
   */
  captureStderr?: boolean;
  
  /**
   * Maximum output size in bytes
   */
  maxOutputSize?: number;
  
  /**
   * Whether to allow shell syntax
   */
  shell?: boolean;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /**
   * Exit code of the command
   */
  exitCode: number;
  
  /**
   * Standard output
   */
  stdout: string;
  
  /**
   * Standard error
   */
  stderr: string;
  
  /**
   * Execution duration in milliseconds
   */
  duration: number;
  
  /**
   * Whether the command timed out
   */
  timedOut: boolean;
  
  /**
   * Error message if any
   */
  error?: string;
  
  /**
   * Command that was executed
   */
  command: string;
}

/**
 * Git operations supported by the executor
 */
export enum GitOperation {
  CLONE = 'clone',
  PULL = 'pull',
  PUSH = 'push',
  COMMIT = 'commit',
  CHECKOUT = 'checkout',
  BRANCH = 'branch',
  MERGE = 'merge',
  STATUS = 'status',
  ADD = 'add',
  INIT = 'init'
}

/**
 * Git operation options
 */
export interface GitOptions {
  /**
   * Path to the Git repository
   */
  repoPath?: string;
  
  /**
   * Repository URL for clone operations
   */
  repoUrl?: string;
  
  /**
   * Branch name for checkout/branch operations
   */
  branch?: string;
  
  /**
   * Commit message for commit operations
   */
  message?: string;
  
  /**
   * Files to add/commit
   */
  files?: string[];
  
  /**
   * Whether to force the operation
   */
  force?: boolean;
  
  /**
   * Remote name
   */
  remote?: string;
  
  /**
   * Git credentials (username:password or token)
   */
  credentials?: string;
  
  /**
   * Additional options for the Git command
   */
  additionalOptions?: string[];
}

/**
 * Git operation result
 */
export interface GitResult {
  /**
   * Success status
   */
  success: boolean;
  
  /**
   * Operation that was executed
   */
  operation: GitOperation;
  
  /**
   * Output from the Git command
   */
  output: string;
  
  /**
   * Error message if any
   */
  error?: string;
  
  /**
   * Repository path
   */
  repoPath: string;
}

/**
 * File operation types
 */
export enum FileOperation {
  READ = 'read',
  WRITE = 'write',
  APPEND = 'append',
  DELETE = 'delete',
  COPY = 'copy',
  MOVE = 'move',
  STAT = 'stat',
  LIST = 'list',
  MKDIR = 'mkdir',
  RMDIR = 'rmdir',
  EXISTS = 'exists'
}

/**
 * File operation options
 */
export interface FileOptions {
  /**
   * File path
   */
  path: string;
  
  /**
   * Destination path for copy/move operations
   */
  dest?: string;
  
  /**
   * Data for write/append operations
   */
  data?: string | Buffer;
  
  /**
   * Encoding for read/write operations
   */
  encoding?: string;
  
  /**
   * Whether to create parent directories
   */
  recursive?: boolean;
  
  /**
   * Whether to overwrite existing files
   */
  overwrite?: boolean;
  
  /**
   * Filter pattern for list operations
   */
  filter?: string;
  
  /**
   * Maximum depth for recursive operations
   */
  maxDepth?: number;
}

/**
 * File operation result
 */
export interface FileResult {
  /**
   * Success status
   */
  success: boolean;
  
  /**
   * Operation that was executed
   */
  operation: FileOperation;
  
  /**
   * File path
   */
  path: string;
  
  /**
   * Data for read operations
   */
  data?: string | Buffer;
  
  /**
   * File stats for stat operations
   */
  stats?: {
    size: number;
    isDirectory: boolean;
    isFile: boolean;
    created: Date;
    modified: Date;
    accessed: Date;
  };
  
  /**
   * File list for list operations
   */
  files?: string[];
  
  /**
   * Error message if any
   */
  error?: string;
}

/**
 * Extended task for executor
 */
export interface ExecutorTask extends Task {
  /**
   * Command to execute
   */
  command?: string;
  
  /**
   * Git operation to perform
   */
  gitOperation?: GitOperation;
  
  /**
   * Git options
   */
  gitOptions?: GitOptions;
  
  /**
   * File operation to perform
   */
  fileOperation?: FileOperation;
  
  /**
   * File options
   */
  fileOptions?: FileOptions;
  
  /**
   * Command options
   */
  commandOptions?: CommandOptions;
}