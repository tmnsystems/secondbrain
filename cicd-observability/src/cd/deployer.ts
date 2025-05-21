/**
 * Deployment Utilities
 * 
 * This module provides utilities for managing deployments to various environments.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * Deployment environment types
 */
export enum DeploymentEnvironment {
  DEV = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Deployment status values
 */
export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCELLED = 'cancelled',
  ROLLED_BACK = 'rolled_back',
}

/**
 * Deployment strategy types
 */
export enum DeploymentStrategy {
  DIRECT = 'direct',
  BLUE_GREEN = 'blue_green',
  CANARY = 'canary',
  ROLLING = 'rolling',
}

/**
 * Interface for deployment configuration
 */
export interface DeploymentConfig {
  environment: DeploymentEnvironment;
  strategy: DeploymentStrategy;
  imageTag: string;
  host: string;
  username: string;
  sshKeyPath?: string;
  deploymentDir: string;
  composeFile: string;
  healthCheckUrl?: string;
  healthCheckTimeout?: number;
  rollbackEnabled: boolean;
  postDeploymentCommands?: string[];
  envVars?: Record<string, string>;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
  dockerRegistry?: string;
}

/**
 * Interface for a deployment
 */
export interface Deployment {
  id: string;
  config: DeploymentConfig;
  status: DeploymentStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  version: string;
  commitHash?: string;
  buildId?: string;
  logs: string[];
  error?: string;
  rollbackDeploymentId?: string;
}

/**
 * Class for managing deployments
 */
export class Deployer {
  private deployments: Map<string, Deployment> = new Map();
  private deploymentHistoryFile: string;
  
  /**
   * Create a new Deployer
   * @param historyFile - Path to the deployment history file
   */
  constructor(historyFile: string) {
    this.deploymentHistoryFile = historyFile;
  }
  
  /**
   * Load deployment history from disk
   */
  public async loadDeploymentHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.deploymentHistoryFile, 'utf-8');
      const history = JSON.parse(data);
      
      history.forEach((deployment: Deployment) => {
        this.deployments.set(deployment.id, {
          ...deployment,
          startTime: new Date(deployment.startTime),
          endTime: deployment.endTime ? new Date(deployment.endTime) : undefined,
        });
      });
      
      console.info(`Loaded ${this.deployments.size} deployments from history`);
    } catch (error) {
      console.warn(`Failed to load deployment history: ${error}`);
    }
  }
  
  /**
   * Save deployment history to disk
   */
  private async saveDeploymentHistory(): Promise<void> {
    try {
      const history = Array.from(this.deployments.values());
      await fs.mkdir(path.dirname(this.deploymentHistoryFile), { recursive: true });
      await fs.writeFile(
        this.deploymentHistoryFile,
        JSON.stringify(history, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(`Failed to save deployment history: ${error}`);
    }
  }
  
  /**
   * Create a new deployment
   * @param config - Deployment configuration
   * @param version - Version to deploy
   * @param commitHash - Commit hash of the deployed code
   * @param buildId - Build ID of the deployed code
   * @returns The new deployment
   */
  public createDeployment(
    config: DeploymentConfig,
    version: string,
    commitHash?: string,
    buildId?: string
  ): Deployment {
    const id = uuidv4();
    
    const deployment: Deployment = {
      id,
      config,
      status: DeploymentStatus.PENDING,
      startTime: new Date(),
      version,
      commitHash,
      buildId,
      logs: [],
    };
    
    this.deployments.set(id, deployment);
    this.saveDeploymentHistory().catch(error => {
      console.error(`Failed to save deployment history: ${error}`);
    });
    
    return deployment;
  }
  
  /**
   * Get a deployment by ID
   * @param id - Deployment ID
   * @returns The deployment or undefined if not found
   */
  public getDeployment(id: string): Deployment | undefined {
    return this.deployments.get(id);
  }
  
  /**
   * List all deployments
   * @param environment - Optional environment to filter by
   * @param status - Optional status to filter by
   * @param limit - Optional limit on the number of deployments to return
   * @returns Array of deployments
   */
  public listDeployments(
    environment?: DeploymentEnvironment,
    status?: DeploymentStatus,
    limit?: number
  ): Deployment[] {
    let deployments = Array.from(this.deployments.values());
    
    // Apply filters
    if (environment) {
      deployments = deployments.filter(d => d.config.environment === environment);
    }
    
    if (status) {
      deployments = deployments.filter(d => d.status === status);
    }
    
    // Sort by start time (newest first)
    deployments.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    // Apply limit
    if (limit && limit > 0) {
      deployments = deployments.slice(0, limit);
    }
    
    return deployments;
  }
  
  /**
   * Get the latest successful deployment for an environment
   * @param environment - Environment to check
   * @returns The latest successful deployment or undefined if none found
   */
  public getLatestSuccessfulDeployment(
    environment: DeploymentEnvironment
  ): Deployment | undefined {
    const deployments = this.listDeployments(environment, DeploymentStatus.SUCCESS, 1);
    return deployments.length > 0 ? deployments[0] : undefined;
  }
  
  /**
   * Execute a deployment
   * @param deploymentId - Deployment ID
   * @returns True if successful, false otherwise
   */
  public async executeDeployment(deploymentId: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    
    if (!deployment) {
      console.error(`Deployment ${deploymentId} not found`);
      return false;
    }
    
    // Update status
    deployment.status = DeploymentStatus.IN_PROGRESS;
    this.addDeploymentLog(deploymentId, `Starting deployment to ${deployment.config.environment}`);
    
    try {
      // Check if we need to run SSH commands
      if (deployment.config.host && deployment.config.username) {
        // Execute the appropriate deployment strategy
        switch (deployment.config.strategy) {
          case DeploymentStrategy.BLUE_GREEN:
            await this.executeBlueGreenDeployment(deployment);
            break;
            
          case DeploymentStrategy.CANARY:
            await this.executeCanaryDeployment(deployment);
            break;
            
          case DeploymentStrategy.ROLLING:
            await this.executeRollingDeployment(deployment);
            break;
            
          case DeploymentStrategy.DIRECT:
          default:
            await this.executeDirectDeployment(deployment);
            break;
        }
      } else {
        // Local deployment
        await this.executeLocalDeployment(deployment);
      }
      
      // Update deployment status and time
      deployment.status = DeploymentStatus.SUCCESS;
      deployment.endTime = new Date();
      
      if (deployment.startTime && deployment.endTime) {
        deployment.duration = deployment.endTime.getTime() - deployment.startTime.getTime();
      }
      
      this.addDeploymentLog(
        deploymentId,
        `Deployment completed successfully in ${deployment.duration ? deployment.duration / 1000 : '?'} seconds`
      );
      
      // Save history
      await this.saveDeploymentHistory();
      
      return true;
    } catch (error) {
      // Update deployment status and time
      deployment.status = DeploymentStatus.FAILURE;
      deployment.endTime = new Date();
      
      if (deployment.startTime && deployment.endTime) {
        deployment.duration = deployment.endTime.getTime() - deployment.startTime.getTime();
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      deployment.error = errorMessage;
      
      this.addDeploymentLog(deploymentId, `Deployment failed: ${errorMessage}`);
      
      // Handle rollback if enabled
      if (deployment.config.rollbackEnabled) {
        await this.rollbackDeployment(deploymentId);
      }
      
      // Save history
      await this.saveDeploymentHistory();
      
      return false;
    }
  }
  
  /**
   * Execute a direct deployment
   * @param deployment - Deployment to execute
   */
  private async executeDirectDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'Executing direct deployment strategy');
    
    const { host, username, sshKeyPath, deploymentDir, composeFile, imageTag } = deployment.config;
    
    // Build the SSH command
    const sshCommand = sshKeyPath
      ? `ssh -i ${sshKeyPath} ${username}@${host}`
      : `ssh ${username}@${host}`;
    
    // Pull the latest image
    this.addDeploymentLog(deployment.id, `Pulling image: ${imageTag}`);
    
    const pullCommand = `${sshCommand} "cd ${deploymentDir} && docker pull ${imageTag}"`;
    await this.executeCommand(deployment.id, pullCommand);
    
    // Stop the current service
    this.addDeploymentLog(deployment.id, 'Stopping current service');
    
    const stopCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} down"`;
    await this.executeCommand(deployment.id, stopCommand);
    
    // Set the new image tag in the environment
    this.addDeploymentLog(deployment.id, 'Updating image tag');
    
    const setEnvCommand = `${sshCommand} "cd ${deploymentDir} && echo 'IMAGE_TAG=${imageTag}' > .env"`;
    await this.executeCommand(deployment.id, setEnvCommand);
    
    // Start the new service
    this.addDeploymentLog(deployment.id, 'Starting new service');
    
    const startCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} up -d"`;
    await this.executeCommand(deployment.id, startCommand);
    
    // Check health if a health check URL is provided
    if (deployment.config.healthCheckUrl) {
      await this.checkHealth(deployment);
    }
    
    // Run post-deployment commands if provided
    if (deployment.config.postDeploymentCommands) {
      for (const command of deployment.config.postDeploymentCommands) {
        this.addDeploymentLog(deployment.id, `Running post-deployment command: ${command}`);
        
        const postDeployCommand = `${sshCommand} "cd ${deploymentDir} && ${command}"`;
        await this.executeCommand(deployment.id, postDeployCommand);
      }
    }
    
    // Clean up old images
    this.addDeploymentLog(deployment.id, 'Cleaning up old images');
    
    const cleanupCommand = `${sshCommand} "docker image prune -f"`;
    await this.executeCommand(deployment.id, cleanupCommand);
  }
  
  /**
   * Execute a blue-green deployment
   * @param deployment - Deployment to execute
   */
  private async executeBlueGreenDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'Executing blue-green deployment strategy');
    
    const { host, username, sshKeyPath, deploymentDir, composeFile, imageTag } = deployment.config;
    
    // Build the SSH command
    const sshCommand = sshKeyPath
      ? `ssh -i ${sshKeyPath} ${username}@${host}`
      : `ssh ${username}@${host}`;
    
    // Determine the current active color
    this.addDeploymentLog(deployment.id, 'Determining current active color');
    
    const getActiveColorCommand = `${sshCommand} "cd ${deploymentDir} && [ -f .active_color ] && cat .active_color || echo 'blue'"`;
    const { stdout: activeColorOutput } = await this.executeCommand(deployment.id, getActiveColorCommand);
    const activeColor = activeColorOutput.trim();
    const newColor = activeColor === 'blue' ? 'green' : 'blue';
    
    this.addDeploymentLog(deployment.id, `Current active color: ${activeColor}, deploying to: ${newColor}`);
    
    // Pull the latest image
    this.addDeploymentLog(deployment.id, `Pulling image: ${imageTag}`);
    
    const pullCommand = `${sshCommand} "cd ${deploymentDir} && docker pull ${imageTag}"`;
    await this.executeCommand(deployment.id, pullCommand);
    
    // Set the new image tag in the environment
    this.addDeploymentLog(deployment.id, 'Updating image tag');
    
    const setEnvCommand = `${sshCommand} "cd ${deploymentDir} && echo 'IMAGE_TAG=${imageTag}' > .env.${newColor}"`;
    await this.executeCommand(deployment.id, setEnvCommand);
    
    // Start the new instance
    this.addDeploymentLog(deployment.id, `Starting new ${newColor} instance`);
    
    const startCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} -f docker-compose.${newColor}.yml up -d"`;
    await this.executeCommand(deployment.id, startCommand);
    
    // Wait for the new instance to be healthy
    this.addDeploymentLog(deployment.id, 'Waiting for new instance to be healthy');
    
    if (deployment.config.healthCheckUrl) {
      const healthCheckUrl = deployment.config.healthCheckUrl.replace('INSTANCE_COLOR', newColor);
      await this.checkHealth(deployment, healthCheckUrl);
    } else {
      // Wait a fixed time if no health check URL is provided
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    // Switch traffic to the new instance
    this.addDeploymentLog(deployment.id, 'Switching traffic to new instance');
    
    const switchCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} -f docker-compose.proxy.yml up -d && echo '${newColor}' > .active_color"`;
    await this.executeCommand(deployment.id, switchCommand);
    
    // Stop the old instance
    this.addDeploymentLog(deployment.id, `Stopping old ${activeColor} instance`);
    
    const stopCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} -f docker-compose.${activeColor}.yml down"`;
    await this.executeCommand(deployment.id, stopCommand);
    
    // Run post-deployment commands if provided
    if (deployment.config.postDeploymentCommands) {
      for (const command of deployment.config.postDeploymentCommands) {
        this.addDeploymentLog(deployment.id, `Running post-deployment command: ${command}`);
        
        const postDeployCommand = `${sshCommand} "cd ${deploymentDir} && ${command}"`;
        await this.executeCommand(deployment.id, postDeployCommand);
      }
    }
    
    // Clean up old images
    this.addDeploymentLog(deployment.id, 'Cleaning up old images');
    
    const cleanupCommand = `${sshCommand} "docker image prune -f"`;
    await this.executeCommand(deployment.id, cleanupCommand);
  }
  
  /**
   * Execute a canary deployment
   * @param deployment - Deployment to execute
   */
  private async executeCanaryDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'Executing canary deployment strategy');
    
    const { host, username, sshKeyPath, deploymentDir, composeFile, imageTag } = deployment.config;
    
    // Build the SSH command
    const sshCommand = sshKeyPath
      ? `ssh -i ${sshKeyPath} ${username}@${host}`
      : `ssh ${username}@${host}`;
    
    // Pull the latest image
    this.addDeploymentLog(deployment.id, `Pulling image: ${imageTag}`);
    
    const pullCommand = `${sshCommand} "cd ${deploymentDir} && docker pull ${imageTag}"`;
    await this.executeCommand(deployment.id, pullCommand);
    
    // Set the new image tag in the environment
    this.addDeploymentLog(deployment.id, 'Updating canary image tag');
    
    const setEnvCommand = `${sshCommand} "cd ${deploymentDir} && echo 'CANARY_IMAGE_TAG=${imageTag}' > .env.canary"`;
    await this.executeCommand(deployment.id, setEnvCommand);
    
    // Start canary instance with 10% traffic
    this.addDeploymentLog(deployment.id, 'Starting canary instance with 10% traffic');
    
    const startCanaryCommand = `${sshCommand} "cd ${deploymentDir} && CANARY_WEIGHT=10 docker-compose -f ${composeFile} -f docker-compose.canary.yml up -d"`;
    await this.executeCommand(deployment.id, startCanaryCommand);
    
    // Wait for the canary instance to be healthy
    this.addDeploymentLog(deployment.id, 'Waiting for canary instance to be healthy');
    
    if (deployment.config.healthCheckUrl) {
      const healthCheckUrl = deployment.config.healthCheckUrl.replace('INSTANCE_TYPE', 'canary');
      await this.checkHealth(deployment, healthCheckUrl);
    } else {
      // Wait a fixed time if no health check URL is provided
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    // Increase canary traffic to 50%
    this.addDeploymentLog(deployment.id, 'Increasing canary traffic to 50%');
    
    const increaseTrafficCommand = `${sshCommand} "cd ${deploymentDir} && CANARY_WEIGHT=50 docker-compose -f ${composeFile} -f docker-compose.canary.yml up -d"`;
    await this.executeCommand(deployment.id, increaseTrafficCommand);
    
    // Wait to gather metrics
    this.addDeploymentLog(deployment.id, 'Waiting to gather metrics...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Complete the deployment
    this.addDeploymentLog(deployment.id, 'Completing canary deployment');
    
    // Update main instance to use new image
    const updateMainCommand = `${sshCommand} "cd ${deploymentDir} && echo 'IMAGE_TAG=${imageTag}' > .env && docker-compose -f ${composeFile} up -d"`;
    await this.executeCommand(deployment.id, updateMainCommand);
    
    // Remove canary instance
    this.addDeploymentLog(deployment.id, 'Removing canary instance');
    
    const removeCanaryCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} -f docker-compose.canary.yml down"`;
    await this.executeCommand(deployment.id, removeCanaryCommand);
    
    // Run post-deployment commands if provided
    if (deployment.config.postDeploymentCommands) {
      for (const command of deployment.config.postDeploymentCommands) {
        this.addDeploymentLog(deployment.id, `Running post-deployment command: ${command}`);
        
        const postDeployCommand = `${sshCommand} "cd ${deploymentDir} && ${command}"`;
        await this.executeCommand(deployment.id, postDeployCommand);
      }
    }
    
    // Clean up old images
    this.addDeploymentLog(deployment.id, 'Cleaning up old images');
    
    const cleanupCommand = `${sshCommand} "docker image prune -f"`;
    await this.executeCommand(deployment.id, cleanupCommand);
  }
  
  /**
   * Execute a rolling deployment
   * @param deployment - Deployment to execute
   */
  private async executeRollingDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'Executing rolling deployment strategy');
    
    const { host, username, sshKeyPath, deploymentDir, composeFile, imageTag } = deployment.config;
    
    // Build the SSH command
    const sshCommand = sshKeyPath
      ? `ssh -i ${sshKeyPath} ${username}@${host}`
      : `ssh ${username}@${host}`;
    
    // Pull the latest image
    this.addDeploymentLog(deployment.id, `Pulling image: ${imageTag}`);
    
    const pullCommand = `${sshCommand} "cd ${deploymentDir} && docker pull ${imageTag}"`;
    await this.executeCommand(deployment.id, pullCommand);
    
    // Get the current number of replicas
    this.addDeploymentLog(deployment.id, 'Getting current replicas');
    
    const getReplicasCommand = `${sshCommand} "cd ${deploymentDir} && grep -oP 'replicas:\\s*\\K\\d+' ${composeFile}"`;
    const { stdout: replicasOutput } = await this.executeCommand(deployment.id, getReplicasCommand);
    const replicas = parseInt(replicasOutput.trim(), 10) || 3; // Default to 3 if not found
    
    // Set the new image tag in the environment
    this.addDeploymentLog(deployment.id, 'Updating image tag');
    
    const setEnvCommand = `${sshCommand} "cd ${deploymentDir} && echo 'IMAGE_TAG=${imageTag}' > .env"`;
    await this.executeCommand(deployment.id, setEnvCommand);
    
    // Update instances one by one
    for (let i = 0; i < replicas; i++) {
      this.addDeploymentLog(deployment.id, `Updating instance ${i + 1}/${replicas}`);
      
      // Update one instance
      const updateCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} up -d --no-deps --scale app=${i + 1} --no-recreate app"`;
      await this.executeCommand(deployment.id, updateCommand);
      
      // Wait for the instance to be healthy
      this.addDeploymentLog(deployment.id, 'Waiting for instance to be healthy');
      
      if (deployment.config.healthCheckUrl) {
        await this.checkHealth(deployment);
      } else {
        // Wait a fixed time if no health check URL is provided
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
    
    // Ensure all instances are updated
    this.addDeploymentLog(deployment.id, 'Ensuring all instances are updated');
    
    const finalUpdateCommand = `${sshCommand} "cd ${deploymentDir} && docker-compose -f ${composeFile} up -d"`;
    await this.executeCommand(deployment.id, finalUpdateCommand);
    
    // Run post-deployment commands if provided
    if (deployment.config.postDeploymentCommands) {
      for (const command of deployment.config.postDeploymentCommands) {
        this.addDeploymentLog(deployment.id, `Running post-deployment command: ${command}`);
        
        const postDeployCommand = `${sshCommand} "cd ${deploymentDir} && ${command}"`;
        await this.executeCommand(deployment.id, postDeployCommand);
      }
    }
    
    // Clean up old images
    this.addDeploymentLog(deployment.id, 'Cleaning up old images');
    
    const cleanupCommand = `${sshCommand} "docker image prune -f"`;
    await this.executeCommand(deployment.id, cleanupCommand);
  }
  
  /**
   * Execute a local deployment
   * @param deployment - Deployment to execute
   */
  private async executeLocalDeployment(deployment: Deployment): Promise<void> {
    this.addDeploymentLog(deployment.id, 'Executing local deployment');
    
    const { deploymentDir, composeFile, imageTag } = deployment.config;
    
    // Pull the latest image
    this.addDeploymentLog(deployment.id, `Pulling image: ${imageTag}`);
    
    const pullCommand = `cd ${deploymentDir} && docker pull ${imageTag}`;
    await this.executeCommand(deployment.id, pullCommand);
    
    // Set the new image tag in the environment
    this.addDeploymentLog(deployment.id, 'Updating image tag');
    
    const setEnvCommand = `cd ${deploymentDir} && echo 'IMAGE_TAG=${imageTag}' > .env`;
    await this.executeCommand(deployment.id, setEnvCommand);
    
    // Stop the current service
    this.addDeploymentLog(deployment.id, 'Stopping current service');
    
    const stopCommand = `cd ${deploymentDir} && docker-compose -f ${composeFile} down`;
    await this.executeCommand(deployment.id, stopCommand);
    
    // Start the new service
    this.addDeploymentLog(deployment.id, 'Starting new service');
    
    const startCommand = `cd ${deploymentDir} && docker-compose -f ${composeFile} up -d`;
    await this.executeCommand(deployment.id, startCommand);
    
    // Check health if a health check URL is provided
    if (deployment.config.healthCheckUrl) {
      await this.checkHealth(deployment);
    }
    
    // Run post-deployment commands if provided
    if (deployment.config.postDeploymentCommands) {
      for (const command of deployment.config.postDeploymentCommands) {
        this.addDeploymentLog(deployment.id, `Running post-deployment command: ${command}`);
        
        const postDeployCommand = `cd ${deploymentDir} && ${command}`;
        await this.executeCommand(deployment.id, postDeployCommand);
      }
    }
    
    // Clean up old images
    this.addDeploymentLog(deployment.id, 'Cleaning up old images');
    
    const cleanupCommand = `docker image prune -f`;
    await this.executeCommand(deployment.id, cleanupCommand);
  }
  
  /**
   * Check if a deployed service is healthy
   * @param deployment - Deployment to check
   * @param customHealthCheckUrl - Optional custom health check URL
   */
  private async checkHealth(
    deployment: Deployment,
    customHealthCheckUrl?: string
  ): Promise<void> {
    const healthCheckUrl = customHealthCheckUrl || deployment.config.healthCheckUrl;
    
    if (!healthCheckUrl) {
      this.addDeploymentLog(deployment.id, 'No health check URL provided, skipping health check');
      return;
    }
    
    const timeout = deployment.config.healthCheckTimeout || 60; // Default to 60 seconds
    const maxAttempts = timeout / 5; // Check every 5 seconds
    
    this.addDeploymentLog(
      deployment.id,
      `Starting health check with URL: ${healthCheckUrl}, timeout: ${timeout}s`
    );
    
    const { host, username, sshKeyPath } = deployment.config;
    
    // Build the SSH command if needed
    const sshCommand = host && username
      ? (sshKeyPath
        ? `ssh -i ${sshKeyPath} ${username}@${host}`
        : `ssh ${username}@${host}`)
      : undefined;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.addDeploymentLog(
          deployment.id,
          `Health check attempt ${attempt}/${maxAttempts}`
        );
        
        let command: string;
        
        if (sshCommand) {
          // Remote health check using curl
          command = `${sshCommand} "curl -s -o /dev/null -w '%{http_code}' ${healthCheckUrl}"`;
        } else {
          // Local health check using curl
          command = `curl -s -o /dev/null -w '%{http_code}' ${healthCheckUrl}`;
        }
        
        const { stdout } = await this.executeCommand(deployment.id, command, false);
        const statusCode = parseInt(stdout.trim(), 10);
        
        if (statusCode >= 200 && statusCode < 300) {
          this.addDeploymentLog(
            deployment.id,
            `Health check successful with status code: ${statusCode}`
          );
          return;
        }
        
        this.addDeploymentLog(
          deployment.id,
          `Health check returned status code: ${statusCode}, waiting to retry...`
        );
      } catch (error) {
        this.addDeploymentLog(
          deployment.id,
          `Health check failed with error: ${error}, waiting to retry...`
        );
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // If we get here, the health check has failed
    throw new Error(`Health check failed after ${timeout} seconds`);
  }
  
  /**
   * Rollback a deployment
   * @param deploymentId - ID of the deployment to rollback
   * @returns True if successful, false otherwise
   */
  public async rollbackDeployment(deploymentId: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    
    if (!deployment) {
      console.error(`Deployment ${deploymentId} not found`);
      return false;
    }
    
    this.addDeploymentLog(deploymentId, 'Starting deployment rollback');
    
    // Find the latest successful deployment for this environment
    const latestSuccessful = this.getLatestSuccessfulDeployment(deployment.config.environment);
    
    if (!latestSuccessful) {
      this.addDeploymentLog(
        deploymentId,
        'No previous successful deployment found to rollback to'
      );
      return false;
    }
    
    // Create a new deployment with the same settings as the successful one
    const rollbackDeployment = this.createDeployment(
      latestSuccessful.config,
      latestSuccessful.version,
      latestSuccessful.commitHash,
      latestSuccessful.buildId
    );
    
    // Set rollback reference
    deployment.rollbackDeploymentId = rollbackDeployment.id;
    
    // Execute the rollback deployment
    const success = await this.executeDeployment(rollbackDeployment.id);
    
    if (success) {
      this.addDeploymentLog(
        deploymentId,
        `Rollback successful to version ${latestSuccessful.version}`
      );
      deployment.status = DeploymentStatus.ROLLED_BACK;
    } else {
      this.addDeploymentLog(deploymentId, 'Rollback failed');
    }
    
    await this.saveDeploymentHistory();
    
    return success;
  }
  
  /**
   * Add a log message to a deployment
   * @param deploymentId - Deployment ID
   * @param message - Log message
   */
  private addDeploymentLog(deploymentId: string, message: string): void {
    const deployment = this.deployments.get(deploymentId);
    
    if (!deployment) {
      console.error(`Deployment ${deploymentId} not found`);
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.info(logMessage);
    deployment.logs.push(logMessage);
  }
  
  /**
   * Execute a shell command
   * @param deploymentId - Deployment ID
   * @param command - Command to execute
   * @param logOutput - Whether to log the command output
   * @returns Command output
   */
  private async executeCommand(
    deploymentId: string,
    command: string,
    logOutput = true
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (logOutput && stdout) {
        this.addDeploymentLog(deploymentId, `Command output: ${stdout}`);
      }
      
      if (stderr) {
        this.addDeploymentLog(deploymentId, `Command error: ${stderr}`);
      }
      
      return { stdout, stderr };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addDeploymentLog(deploymentId, `Command failed: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Generate a deployment report
   * @param deploymentId - Deployment ID
   * @param outputPath - Path to write the report
   * @returns true if successful, false otherwise
   */
  public async generateReport(deploymentId: string, outputPath: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    
    if (!deployment) {
      console.error(`Deployment ${deploymentId} not found`);
      return false;
    }
    
    try {
      // Create the HTML report
      const html = this.generateHtmlReport(deployment);
      
      // Write the report to file
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, html, 'utf-8');
      
      return true;
    } catch (error) {
      console.error(`Failed to generate deployment report: ${error}`);
      return false;
    }
  }
  
  /**
   * Generate an HTML deployment report
   * @param deployment - Deployment to generate a report for
   * @returns HTML string
   */
  private generateHtmlReport(deployment: Deployment): string {
    const statusClass = deployment.status === DeploymentStatus.SUCCESS
      ? 'status-success'
      : deployment.status === DeploymentStatus.FAILURE
        ? 'status-failure'
        : deployment.status === DeploymentStatus.ROLLED_BACK
          ? 'status-rolled-back'
          : 'status-neutral';
    
    const duration = deployment.duration
      ? `${(deployment.duration / 1000).toFixed(2)}s`
      : 'N/A';
    
    const logs = deployment.logs.map(log => {
      // Highlight errors in logs
      const logClass = log.toLowerCase().includes('error') || log.toLowerCase().includes('fail')
        ? 'log-error'
        : log.toLowerCase().includes('warn')
          ? 'log-warning'
          : '';
      
      return `<div class="log-entry ${logClass}">${log}</div>`;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deployment Report - ${deployment.id}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .report-header {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .report-header h1 {
            margin-bottom: 5px;
          }
          
          .deployment-info {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .deployment-id {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
          }
          
          .info-item {
            background-color: #fff;
            padding: 15px;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          
          .info-label {
            font-weight: 600;
            color: #555;
            margin-bottom: 5px;
          }
          
          .info-value {
            font-size: 1.1em;
          }
          
          .status-badge {
            display: inline-block;
            padding: 5px 10px;
            font-weight: 600;
            border-radius: 20px;
            font-size: 0.9em;
          }
          
          .status-success {
            background-color: #d4edda;
            color: #155724;
          }
          
          .status-failure {
            background-color: #f8d7da;
            color: #721c24;
          }
          
          .status-rolled-back {
            background-color: #fff3cd;
            color: #856404;
          }
          
          .status-neutral {
            background-color: #e2e3e5;
            color: #383d41;
          }
          
          .deployment-config {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .config-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
          }
          
          .deployment-logs {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .logs-container {
            background-color: #282a36;
            color: #f8f8f2;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
            max-height: 500px;
            overflow-y: auto;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 14px;
            line-height: 1.5;
          }
          
          .log-entry {
            margin-bottom: 5px;
            white-space: pre-wrap;
            word-break: break-all;
          }
          
          .log-error {
            color: #ff5555;
          }
          
          .log-warning {
            color: #ffb86c;
          }
          
          .error-details {
            background-color: #f8d7da;
            color: #721c24;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
          }
          
          @media (max-width: 768px) {
            .info-grid,
            .config-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="report-header">
            <h1>Deployment Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="deployment-info">
            <div class="deployment-id">Deployment ID: ${deployment.id}</div>
            <h2>Deployment Information</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">
                  <span class="status-badge ${statusClass}">${deployment.status}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Environment</div>
                <div class="info-value">${deployment.config.environment}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Strategy</div>
                <div class="info-value">${deployment.config.strategy}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Version</div>
                <div class="info-value">${deployment.version}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Start Time</div>
                <div class="info-value">${deployment.startTime.toLocaleString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">End Time</div>
                <div class="info-value">${deployment.endTime ? deployment.endTime.toLocaleString() : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Duration</div>
                <div class="info-value">${duration}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Commit Hash</div>
                <div class="info-value">${deployment.commitHash || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Build ID</div>
                <div class="info-value">${deployment.buildId || 'N/A'}</div>
              </div>
              ${deployment.rollbackDeploymentId ? `
                <div class="info-item">
                  <div class="info-label">Rollback to</div>
                  <div class="info-value">${deployment.rollbackDeploymentId}</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="deployment-config">
            <h2>Deployment Configuration</h2>
            <div class="config-grid">
              <div class="info-item">
                <div class="info-label">Host</div>
                <div class="info-value">${deployment.config.host || 'localhost'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Username</div>
                <div class="info-value">${deployment.config.username || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Directory</div>
                <div class="info-value">${deployment.config.deploymentDir}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Compose File</div>
                <div class="info-value">${deployment.config.composeFile}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Image Tag</div>
                <div class="info-value">${deployment.config.imageTag}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Health Check</div>
                <div class="info-value">${deployment.config.healthCheckUrl || 'None'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Rollback Enabled</div>
                <div class="info-value">${deployment.config.rollbackEnabled ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
          
          <div class="deployment-logs">
            <h2>Deployment Logs</h2>
            <div class="logs-container">
              ${logs}
            </div>
          </div>
          
          ${deployment.error ? `
            <div class="error-details">
              <h2>Error Details</h2>
              <p>${deployment.error}</p>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  }
}