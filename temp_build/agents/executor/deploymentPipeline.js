"use strict";
/**
 * Deployment Pipeline Module
 *
 * Handles deployment to various environments (Vercel, Netlify, custom servers)
 * based on project requirements and configurations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploymentPipeline = void 0;
const commandExecutor_1 = require("./commandExecutor");
/**
 * Deploy a project to the specified environment
 *
 * @param project The project path or name to deploy
 * @param environment The target environment (vercel, netlify, custom, local)
 * @param options Deployment options
 * @returns Promise with the deployment result
 */
async function deploymentPipeline(project, environment, options = {}) {
    const { cwd = process.cwd(), timeout = 180000, // Deployments can take a while
    env = {}, production = false, team, config, buildCommand } = options;
    // Determine the deployment command based on the environment
    let command;
    switch (environment) {
        case 'vercel':
            command = `vercel ${project} ${production ? '--prod' : ''} ${team ? `--scope ${team}` : ''} ${config ? `--local-config ${config}` : ''}`;
            break;
        case 'netlify':
            command = `netlify deploy ${production ? '--prod' : ''} ${config ? `--config ${config}` : ''}`;
            break;
        case 'local':
            // For local deployments, just run the build command
            command = buildCommand || `cd ${project} && npm run build`;
            break;
        case 'custom':
            // For custom deployments, expect a build command
            if (!buildCommand) {
                return {
                    success: false,
                    output: '',
                    error: 'Custom deployment requires a buildCommand option',
                    exitCode: -1,
                    executionTime: 0
                };
            }
            command = buildCommand;
            break;
        default:
            // Treat as a custom command
            command = `${environment} ${project}`;
    }
    // Execute the deployment command
    return (0, commandExecutor_1.executeCommand)(command, { cwd, timeout, env });
}
exports.deploymentPipeline = deploymentPipeline;
