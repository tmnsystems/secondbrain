"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutorAgent = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const agent_1 = require("../../common/agent");
const reviewer_1 = require("../reviewer");
const types_1 = require("./types");
// Promisify fs functions
const fsPromises = fs.promises;
const existsAsync = util.promisify(fs.exists);
/**
 * ExecutorAgent is responsible for executing shell commands, Git operations,
 * and file system operations.
 */
class ExecutorAgent extends agent_1.AbstractAgent {
    /**
     * Create a new ExecutorAgent
     * @param config Configuration for the executor agent
     */
    constructor(config = {}) {
        super('executor', config);
        this.config = {
            ...config,
            workingDir: config.workingDir || process.cwd(),
            defaultTimeoutMs: config.defaultTimeoutMs || 30000,
            captureStdout: config.captureStdout !== false,
            captureStderr: config.captureStderr !== false,
            env: config.env || {},
            maxOutputSize: config.maxOutputSize || 1024 * 1024 * 5, // 5MB
            allowShell: config.allowShell || false
        };
        // Initialize ReviewerAgent for preflight checks
        this.reviewerAgent = new reviewer_1.ReviewerAgent();
    }
    /**
     * Get the capabilities provided by this agent
     */
    getCapabilities() {
        return [
            {
                name: 'command_execution',
                description: 'Execute shell commands',
                parameters: {
                    command: {
                        type: 'string',
                        description: 'Command to execute',
                        required: true
                    },
                    options: {
                        type: 'object',
                        description: 'Command execution options',
                        required: false
                    }
                },
                result: {
                    type: 'object',
                    description: 'Command execution result',
                    properties: {
                        exitCode: {
                            type: 'number',
                            description: 'Exit code of the command'
                        },
                        stdout: {
                            type: 'string',
                            description: 'Standard output'
                        },
                        stderr: {
                            type: 'string',
                            description: 'Standard error'
                        }
                    }
                }
            },
            {
                name: 'git_operations',
                description: 'Perform Git operations',
                parameters: {
                    operation: {
                        type: 'string',
                        description: 'Git operation to perform',
                        required: true
                    },
                    options: {
                        type: 'object',
                        description: 'Git operation options',
                        required: false
                    }
                },
                result: {
                    type: 'object',
                    description: 'Git operation result',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Whether the operation was successful'
                        },
                        output: {
                            type: 'string',
                            description: 'Output from the Git command'
                        }
                    }
                }
            },
            {
                name: 'file_operations',
                description: 'Perform file system operations',
                parameters: {
                    operation: {
                        type: 'string',
                        description: 'File operation to perform',
                        required: true
                    },
                    options: {
                        type: 'object',
                        description: 'File operation options',
                        required: true
                    }
                },
                result: {
                    type: 'object',
                    description: 'File operation result',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Whether the operation was successful'
                        },
                        data: {
                            type: 'string',
                            description: 'File data for read operations'
                        }
                    }
                }
            },
            {
                name: 'deployment',
                description: 'Deploy applications to various environments',
                parameters: {
                    target: {
                        type: 'string',
                        description: 'Deployment target',
                        required: true
                    },
                    options: {
                        type: 'object',
                        description: 'Deployment options',
                        required: false
                    }
                },
                result: {
                    type: 'object',
                    description: 'Deployment result',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Whether the deployment was successful'
                        },
                        url: {
                            type: 'string',
                            description: 'URL of the deployed application'
                        }
                    }
                }
            },
            {
                name: 'system_monitoring',
                description: 'Monitor system resources and processes',
                parameters: {
                    resources: {
                        type: 'array',
                        description: 'Resources to monitor',
                        required: false
                    }
                },
                result: {
                    type: 'object',
                    description: 'Monitoring result',
                    properties: {
                        cpu: {
                            type: 'number',
                            description: 'CPU usage percentage'
                        },
                        memory: {
                            type: 'object',
                            description: 'Memory usage statistics'
                        }
                    }
                }
            }
        ];
    }
    /**
     * Initialize the agent
     */
    async initialize() {
        await super.initialize();
        // Create working directory if it doesn't exist
        if (this.config.workingDir) {
            try {
                await fsPromises.mkdir(this.config.workingDir, { recursive: true });
                this.logger.info(`Working directory created: ${this.config.workingDir}`);
            }
            catch (error) {
                if (error instanceof Error) {
                    this.logger.warn(`Error creating working directory: ${error.message}`);
                }
            }
        }
        // Verify Git is installed
        try {
            await this.executeCommand('git --version');
            this.logger.info('Git is available');
        }
        catch (error) {
            this.logger.warn('Git is not available, Git operations will fail');
        }
    }
    /**
     * Execute a command
     * @param command Command to execute
     * @param options Command options
     * @returns Command result
     */
    async executeCommand(command, options) {
        // Preflight review by ReviewerAgent
        if (this.reviewerAgent) {
            const preflight = await this.reviewerAgent.preflightReview({
                agent: 'ExecutorAgent',
                action: 'executeCommand',
                details: { command }
            });
            if (!preflight.approved) {
                this.logger.error(`Preflight denied: ${preflight.reason || 'No reason provided'}`);
                throw new Error('Execution halted by ReviewerAgent preflight denial');
            }
        }
        this.logger.info(`Executing command: ${command}`);
        // Merge options with defaults
        const opts = {
            cwd: options?.cwd || this.config.workingDir,
            timeoutMs: options?.timeoutMs || this.config.defaultTimeoutMs,
            env: { ...this.cleanEnvironment(), ...this.config.env, ...options?.env },
            captureStdout: options?.captureStdout !== undefined ? options.captureStdout : this.config.captureStdout,
            captureStderr: options?.captureStderr !== undefined ? options.captureStderr : this.config.captureStderr,
            maxOutputSize: options?.maxOutputSize || this.config.maxOutputSize,
            shell: options?.shell !== undefined ? options.shell : this.config.allowShell
        };
        return new Promise((resolve, reject) => {
            // Split command into parts if not using shell
            let cmd;
            let args = [];
            if (opts.shell) {
                cmd = opts.shell === true ? '/bin/sh' : opts.shell;
                args = ['-c', command];
            }
            else {
                const parts = command.split(' ');
                cmd = parts[0];
                args = parts.slice(1);
            }
            // Start timing
            const startTime = Date.now();
            // Set up timeout
            let timeoutId;
            let timedOut = false;
            // Start process
            const proc = (0, child_process_1.spawn)(cmd, args, {
                cwd: opts.cwd,
                env: opts.env,
                shell: !!opts.shell
            });
            // Set up timeout if specified
            if (opts.timeoutMs) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    proc.kill('SIGTERM');
                    // Force kill after 2 seconds if SIGTERM doesn't work
                    setTimeout(() => {
                        if (!proc.killed) {
                            proc.kill('SIGKILL');
                        }
                    }, 2000);
                }, opts.timeoutMs);
            }
            // Collect output
            let stdout = '';
            let stderr = '';
            if (opts.captureStdout) {
                proc.stdout.on('data', (data) => {
                    const chunk = data.toString();
                    if (stdout.length + chunk.length <= opts.maxOutputSize) {
                        stdout += chunk;
                    }
                });
            }
            if (opts.captureStderr) {
                proc.stderr.on('data', (data) => {
                    const chunk = data.toString();
                    if (stderr.length + chunk.length <= opts.maxOutputSize) {
                        stderr += chunk;
                    }
                });
            }
            // Handle completion
            proc.on('close', (code) => {
                // Clear timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                // Calculate duration
                const duration = Date.now() - startTime;
                this.logger.info(`Command completed with exit code: ${code}`);
                resolve({
                    exitCode: code || 0,
                    stdout,
                    stderr,
                    duration,
                    timedOut,
                    command
                });
            });
            // Handle errors
            proc.on('error', (error) => {
                // Clear timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                // Calculate duration
                const duration = Date.now() - startTime;
                this.logger.error(`Command error: ${error.message}`);
                resolve({
                    exitCode: -1,
                    stdout,
                    stderr,
                    duration,
                    timedOut,
                    error: error.message,
                    command
                });
            });
        });
    }
    /**
     * Perform a Git operation
     * @param operation Git operation to perform
     * @param options Git options
     * @returns Git operation result
     */
    async performGitOperation(operation, options = {}) {
        this.logger.info(`Performing Git operation: ${operation}`);
        // Determine repository path
        const repoPath = options.repoPath || this.config.workingDir;
        // Build the Git command
        let command = '';
        let args = [];
        switch (operation) {
            case types_1.GitOperation.INIT:
                command = 'git init';
                if (options.branch) {
                    command += ` -b ${options.branch}`;
                }
                break;
            case types_1.GitOperation.CLONE:
                if (!options.repoUrl) {
                    throw new Error('Repository URL is required for clone operation');
                }
                command = `git clone ${options.repoUrl}`;
                if (options.branch) {
                    command += ` -b ${options.branch}`;
                }
                break;
            case types_1.GitOperation.PULL:
                command = 'git pull';
                if (options.remote) {
                    command += ` ${options.remote}`;
                }
                if (options.branch) {
                    command += ` ${options.branch}`;
                }
                break;
            case types_1.GitOperation.PUSH:
                command = 'git push';
                if (options.remote) {
                    command += ` ${options.remote}`;
                }
                if (options.branch) {
                    command += ` ${options.branch}`;
                }
                if (options.force) {
                    command += ' --force';
                }
                break;
            case types_1.GitOperation.COMMIT:
                command = 'git commit';
                if (options.message) {
                    command += ` -m "${options.message.replace(/"/g, '\\"')}"`;
                }
                break;
            case types_1.GitOperation.CHECKOUT:
                if (!options.branch) {
                    throw new Error('Branch name is required for checkout operation');
                }
                command = `git checkout ${options.branch}`;
                if (options.force) {
                    command += ' --force';
                }
                break;
            case types_1.GitOperation.BRANCH:
                command = 'git branch';
                if (options.branch) {
                    command += ` ${options.branch}`;
                }
                break;
            case types_1.GitOperation.MERGE:
                if (!options.branch) {
                    throw new Error('Branch name is required for merge operation');
                }
                command = `git merge ${options.branch}`;
                break;
            case types_1.GitOperation.STATUS:
                command = 'git status';
                break;
            case types_1.GitOperation.ADD:
                command = 'git add';
                if (options.files && options.files.length > 0) {
                    command += ` ${options.files.join(' ')}`;
                }
                else {
                    command += ' .';
                }
                break;
            default:
                throw new Error(`Unsupported Git operation: ${operation}`);
        }
        // Add additional options if provided
        if (options.additionalOptions && options.additionalOptions.length > 0) {
            command += ` ${options.additionalOptions.join(' ')}`;
        }
        try {
            // Execute the Git command
            const result = await this.executeCommand(command, {
                cwd: repoPath
            });
            return {
                success: result.exitCode === 0,
                operation,
                output: result.exitCode === 0 ? result.stdout : result.stderr,
                error: result.exitCode !== 0 ? result.stderr : undefined,
                repoPath: repoPath || ''
            };
        }
        catch (error) {
            if (error instanceof Error) {
                return {
                    success: false,
                    operation,
                    output: '',
                    error: error.message,
                    repoPath: repoPath || ''
                };
            }
            throw error;
        }
    }
    /**
     * Perform a file operation
     * @param operation File operation to perform
     * @param options File options
     * @returns File operation result
     */
    async performFileOperation(operation, options) {
        this.logger.info(`Performing file operation: ${operation} on ${options.path}`);
        // Resolve relative paths
        const resolvedPath = path.isAbsolute(options.path)
            ? options.path
            : path.resolve(this.config.workingDir || '', options.path);
        let resolvedDest = '';
        if (options.dest) {
            resolvedDest = path.isAbsolute(options.dest)
                ? options.dest
                : path.resolve(this.config.workingDir || '', options.dest);
        }
        try {
            switch (operation) {
                case types_1.FileOperation.READ:
                    const data = await fsPromises.readFile(resolvedPath, { encoding: options.encoding || 'utf8' });
                    return {
                        success: true,
                        operation,
                        path: resolvedPath,
                        data
                    };
                case types_1.FileOperation.WRITE:
                    if (!options.data) {
                        throw new Error('Data is required for write operation');
                    }
                    // Create parent directories if needed
                    if (options.recursive) {
                        await fsPromises.mkdir(path.dirname(resolvedPath), { recursive: true });
                    }
                    await fsPromises.writeFile(resolvedPath, options.data, { encoding: options.encoding || 'utf8' });
                    return {
                        success: true,
                        operation,
                        path: resolvedPath
                    };
                case types_1.FileOperation.APPEND:
                    if (!options.data) {
                        throw new Error('Data is required for append operation');
                    }
                    // Create parent directories if needed
                    if (options.recursive) {
                        await fsPromises.mkdir(path.dirname(resolvedPath), { recursive: true });
                    }
                    await fsPromises.appendFile(resolvedPath, options.data, { encoding: options.encoding || 'utf8' });
                    return {
                        success: true,
                        operation,
                        path: resolvedPath
                    };
                case types_1.FileOperation.DELETE:
                    await fsPromises.unlink(resolvedPath);
                    return {
                        success: true,
                        operation,
                        path: resolvedPath
                    };
                case types_1.FileOperation.COPY:
                    if (!options.dest) {
                        throw new Error('Destination path is required for copy operation');
                    }
                    // Create parent directories if needed
                    if (options.recursive) {
                        await fsPromises.mkdir(path.dirname(resolvedDest), { recursive: true });
                    }
                    await fsPromises.copyFile(resolvedPath, resolvedDest, options.overwrite ? 0 : fs.constants.COPYFILE_EXCL);
                    return {
                        success: true,
                        operation,
                        path: resolvedPath
                    };
                case types_1.FileOperation.MOVE:
                    if (!options.dest) {
                        throw new Error('Destination path is required for move operation');
                    }
                    // Create parent directories if needed
                    if (options.recursive) {
                        await fsPromises.mkdir(path.dirname(resolvedDest), { recursive: true });
                    }
                    await fsPromises.rename(resolvedPath, resolvedDest);
                    return {
                        success: true,
                        operation,
                        path: resolvedPath
                    };
                case types_1.FileOperation.STAT:
                    const stats = await fsPromises.stat(resolvedPath);
                    return {
                        success: true,
                        operation,
                        path: resolvedPath,
                        stats: {
                            size: stats.size,
                            isDirectory: stats.isDirectory(),
                            isFile: stats.isFile(),
                            created: new Date(stats.birthtime),
                            modified: new Date(stats.mtime),
                            accessed: new Date(stats.atime)
                        }
                    };
                case types_1.FileOperation.LIST:
                    const files = await fsPromises.readdir(resolvedPath);
                    // Apply filter if provided
                    let filteredFiles = files;
                    if (options.filter) {
                        const regex = new RegExp(options.filter);
                        filteredFiles = files.filter(file => regex.test(file));
                    }
                    return {
                        success: true,
                        operation,
                        path: resolvedPath,
                        files: filteredFiles
                    };
                case types_1.FileOperation.MKDIR:
                    await fsPromises.mkdir(resolvedPath, {
                        recursive: options.recursive !== false
                    });
                    return {
                        success: true,
                        operation,
                        path: resolvedPath
                    };
                case types_1.FileOperation.RMDIR:
                    await fsPromises.rmdir(resolvedPath, {
                        recursive: options.recursive !== false
                    });
                    return {
                        success: true,
                        operation,
                        path: resolvedPath
                    };
                case types_1.FileOperation.EXISTS:
                    const exists = await existsAsync(resolvedPath);
                    return {
                        success: true,
                        operation,
                        path: resolvedPath,
                        data: exists ? 'true' : 'false'
                    };
                default:
                    throw new Error(`Unsupported file operation: ${operation}`);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`File operation error: ${error.message}`);
                return {
                    success: false,
                    operation,
                    path: resolvedPath,
                    error: error.message
                };
            }
            throw error;
        }
    }
    /**
     * Deploy an application to an environment
     * @param target Deployment target
     * @param options Deployment options
     * @returns Deployment result
     */
    async deploy(target, options = {}) {
        this.logger.info(`Deploying to ${target}`);
        // This would be a more complex implementation in a real system
        // Here we'll just simulate a deployment by executing some commands
        try {
            switch (target.toLowerCase()) {
                case 'development':
                case 'dev':
                    // Simulate deployment to development environment
                    await this.executeCommand('echo "Deploying to development environment"');
                    // Package the application
                    await this.executeCommand('echo "Packaging application..."');
                    // Deploy to development server
                    await this.executeCommand('echo "Uploading to development server..."');
                    return {
                        success: true,
                        target: 'development',
                        url: 'https://dev.example.com',
                        message: 'Successfully deployed to development environment'
                    };
                case 'staging':
                case 'test':
                    // Simulate deployment to staging environment
                    await this.executeCommand('echo "Deploying to staging environment"');
                    // Run tests
                    await this.executeCommand('echo "Running tests..."');
                    // Package the application
                    await this.executeCommand('echo "Packaging application..."');
                    // Deploy to staging server
                    await this.executeCommand('echo "Uploading to staging server..."');
                    return {
                        success: true,
                        target: 'staging',
                        url: 'https://staging.example.com',
                        message: 'Successfully deployed to staging environment'
                    };
                case 'production':
                case 'prod':
                    // Simulate deployment to production environment
                    await this.executeCommand('echo "Deploying to production environment"');
                    // Run tests
                    await this.executeCommand('echo "Running tests..."');
                    // Package the application
                    await this.executeCommand('echo "Packaging application..."');
                    // Deploy to production server
                    await this.executeCommand('echo "Uploading to production server..."');
                    return {
                        success: true,
                        target: 'production',
                        url: 'https://example.com',
                        message: 'Successfully deployed to production environment'
                    };
                default:
                    throw new Error(`Unsupported deployment target: ${target}`);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Deployment error: ${error.message}`);
                return {
                    success: false,
                    target,
                    error: error.message
                };
            }
            throw error;
        }
    }
    /**
     * Monitor system resources
     * @param resources Resources to monitor
     * @returns Monitoring result
     */
    async monitorSystem(resources = ['cpu', 'memory', 'disk']) {
        this.logger.info(`Monitoring system resources: ${resources.join(', ')}`);
        // This would be a more complex implementation in a real system
        // Here we'll just simulate resource monitoring
        const result = {
            timestamp: new Date().toISOString(),
            resources: {}
        };
        try {
            // Monitor CPU if requested
            if (resources.includes('cpu')) {
                // Simulate CPU monitoring
                result.resources.cpu = {
                    usage: Math.random() * 100,
                    cores: 8,
                    load: [Math.random() * 8, Math.random() * 4, Math.random() * 2]
                };
            }
            // Monitor memory if requested
            if (resources.includes('memory')) {
                // Simulate memory monitoring
                const totalMemory = 16 * 1024 * 1024 * 1024; // 16GB
                const usedMemory = Math.random() * totalMemory;
                result.resources.memory = {
                    total: totalMemory,
                    used: usedMemory,
                    free: totalMemory - usedMemory,
                    usagePercentage: (usedMemory / totalMemory) * 100
                };
            }
            // Monitor disk if requested
            if (resources.includes('disk')) {
                // Simulate disk monitoring
                const totalDisk = 500 * 1024 * 1024 * 1024; // 500GB
                const usedDisk = Math.random() * totalDisk;
                result.resources.disk = {
                    total: totalDisk,
                    used: usedDisk,
                    free: totalDisk - usedDisk,
                    usagePercentage: (usedDisk / totalDisk) * 100
                };
            }
            return {
                success: true,
                ...result
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Monitoring error: ${error.message}`);
                return {
                    success: false,
                    error: error.message
                };
            }
            throw error;
        }
    }
    /**
     * Perform a task using this agent
     * @param task Task to perform
     * @returns Task result
     */
    async performTask(task) {
        const executorTask = task;
        const input = task.input || {};
        switch (task.type) {
            case 'command_execution':
                return this.executeCommand(executorTask.command || input.command, executorTask.commandOptions || input.options);
            case 'git_operations':
                return this.performGitOperation(executorTask.gitOperation || input.operation, executorTask.gitOptions || input.options);
            case 'file_operations':
                return this.performFileOperation(executorTask.fileOperation || input.operation, executorTask.fileOptions || input.options);
            case 'deployment':
                return this.deploy(input.target, input.options);
            case 'system_monitoring':
                return this.monitorSystem(input.resources);
            default:
                throw new Error(`Unsupported task type: ${task.type}`);
        }
    }
    /**
     * Helper method to clean the environment variables for command execution
     * @returns Clean environment record
     */
    cleanEnvironment() {
        const cleanEnv = {};
        // Copy only string values from process.env
        Object.entries(process.env).forEach(([key, value]) => {
            if (typeof value === 'string') {
                cleanEnv[key] = value;
            }
        });
        return cleanEnv;
    }
}
exports.ExecutorAgent = ExecutorAgent;
