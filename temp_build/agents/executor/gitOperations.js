"use strict";
/**
 * Git Operations Module
 *
 * Handles Git-specific operations like commit, push, pull, checkout, etc.
 * Provides a higher-level interface on top of the command executor.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitOperations = void 0;
const commandExecutor_1 = require("./commandExecutor");
/**
 * Execute Git operations with proper validation and formatting
 *
 * @param operation The Git operation to perform
 * @param options Options for the Git operation
 * @returns Promise with the operation result
 */
async function gitOperations(operation, options = {}) {
    const { cwd = process.cwd(), remote = 'origin', branch = 'main', message = 'Update from ExecutorAgent', files = ['.'], force = false, timeout = 60000 // Git operations might take longer
     } = options;
    // Build the git command based on the operation
    let command;
    switch (operation) {
        case 'status':
            command = 'git status';
            break;
        case 'commit':
            // First add files, then commit
            const filesStr = files.join(' ');
            command = `git add ${filesStr} && git commit -m "${message}"`;
            break;
        case 'push':
            command = `git push ${remote} ${branch}${force ? ' --force' : ''}`;
            break;
        case 'pull':
            command = `git pull ${remote} ${branch}`;
            break;
        case 'checkout':
            command = `git checkout ${branch}`;
            break;
        case 'branch':
            command = 'git branch';
            break;
        case 'clone':
            if (!options.message) {
                return {
                    success: false,
                    output: '',
                    error: 'Repository URL is required for clone operation',
                    exitCode: -1,
                    executionTime: 0
                };
            }
            command = `git clone ${options.message}`;
            break;
        case 'fetch':
            command = `git fetch ${remote}`;
            break;
        default:
            // For custom git commands
            command = `git ${operation}`;
    }
    // Execute the command
    return (0, commandExecutor_1.executeCommand)(command, { cwd, timeout });
}
exports.gitOperations = gitOperations;
