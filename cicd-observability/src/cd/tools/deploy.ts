#!/usr/bin/env ts-node

/**
 * Deployment CLI Tool
 * 
 * This script provides a command-line interface for managing deployments.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { 
  Deployer, 
  DeploymentEnvironment, 
  DeploymentStrategy, 
  DeploymentConfig 
} from '../deployer';

// Load deployment configuration
const loadConfig = async (): Promise<any> => {
  try {
    const configPath = path.resolve(__dirname, '../../../config/cd/deployment-config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(`Failed to load deployment configuration: ${error}`);
    process.exit(1);
  }
};

// Format deployment status with colors
const formatStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'success':
      return chalk.green(status);
    case 'failure':
      return chalk.red(status);
    case 'in_progress':
      return chalk.yellow(status);
    case 'pending':
      return chalk.blue(status);
    case 'rolled_back':
      return chalk.yellow(status);
    case 'cancelled':
      return chalk.gray(status);
    default:
      return status;
  }
};

// Create a deployer instance
const createDeployer = async (config: any): Promise<Deployer> => {
  const historyFile = path.resolve(
    __dirname, 
    '../../../', 
    config.deploymentHistory.historyFile
  );
  
  const deployer = new Deployer(historyFile);
  await deployer.loadDeploymentHistory();
  
  return deployer;
};

// Display a table of deployments
const displayDeployments = (deployments: any[]): void => {
  if (deployments.length === 0) {
    console.log(chalk.yellow('No deployments found'));
    return;
  }
  
  console.log('\nDeployments:');
  console.log('='.repeat(100));
  console.log(
    chalk.bold('ID'.padEnd(10)) +
    chalk.bold('Environment'.padEnd(15)) +
    chalk.bold('Version'.padEnd(15)) +
    chalk.bold('Status'.padEnd(15)) +
    chalk.bold('Start Time'.padEnd(25)) +
    chalk.bold('Duration'.padEnd(10)) +
    chalk.bold('Strategy'.padEnd(12))
  );
  console.log('-'.repeat(100));
  
  deployments.forEach(deployment => {
    const duration = deployment.duration 
      ? `${(deployment.duration / 1000).toFixed(1)}s` 
      : 'N/A';
    
    console.log(
      deployment.id.substring(0, 8).padEnd(10) +
      deployment.config.environment.padEnd(15) +
      deployment.version.padEnd(15) +
      formatStatus(deployment.status).padEnd(15) +
      new Date(deployment.startTime).toLocaleString().padEnd(25) +
      duration.padEnd(10) +
      deployment.config.strategy.padEnd(12)
    );
  });
  
  console.log('='.repeat(100));
};

// Display details of a single deployment
const displayDeploymentDetails = (deployment: any): void => {
  if (!deployment) {
    console.log(chalk.yellow('Deployment not found'));
    return;
  }
  
  console.log('\nDeployment Details:');
  console.log('='.repeat(100));
  console.log(chalk.bold('ID:'), deployment.id);
  console.log(chalk.bold('Environment:'), deployment.config.environment);
  console.log(chalk.bold('Strategy:'), deployment.config.strategy);
  console.log(chalk.bold('Version:'), deployment.version);
  console.log(chalk.bold('Status:'), formatStatus(deployment.status));
  console.log(chalk.bold('Start Time:'), new Date(deployment.startTime).toLocaleString());
  
  if (deployment.endTime) {
    console.log(chalk.bold('End Time:'), new Date(deployment.endTime).toLocaleString());
  }
  
  if (deployment.duration) {
    console.log(chalk.bold('Duration:'), `${(deployment.duration / 1000).toFixed(1)} seconds`);
  }
  
  if (deployment.commitHash) {
    console.log(chalk.bold('Commit Hash:'), deployment.commitHash);
  }
  
  if (deployment.buildId) {
    console.log(chalk.bold('Build ID:'), deployment.buildId);
  }
  
  if (deployment.rollbackDeploymentId) {
    console.log(chalk.bold('Rolled Back To:'), deployment.rollbackDeploymentId);
  }
  
  console.log(chalk.bold('\nConfiguration:'));
  console.log('-'.repeat(100));
  
  const { host, username, deploymentDir, composeFile, imageTag, healthCheckUrl } = deployment.config;
  
  console.log(chalk.bold('Host:'), host || 'localhost');
  console.log(chalk.bold('Username:'), username || 'N/A');
  console.log(chalk.bold('Deployment Directory:'), deploymentDir);
  console.log(chalk.bold('Compose File:'), composeFile);
  console.log(chalk.bold('Image Tag:'), imageTag);
  console.log(chalk.bold('Health Check URL:'), healthCheckUrl || 'N/A');
  console.log(chalk.bold('Rollback Enabled:'), deployment.config.rollbackEnabled ? 'Yes' : 'No');
  
  console.log(chalk.bold('\nLogs:'));
  console.log('-'.repeat(100));
  
  deployment.logs.forEach((log: string) => {
    if (log.toLowerCase().includes('error') || log.toLowerCase().includes('fail')) {
      console.log(chalk.red(log));
    } else if (log.toLowerCase().includes('warn')) {
      console.log(chalk.yellow(log));
    } else {
      console.log(log);
    }
  });
  
  if (deployment.error) {
    console.log(chalk.bold('\nError:'));
    console.log('-'.repeat(100));
    console.log(chalk.red(deployment.error));
  }
  
  console.log('='.repeat(100));
};

// Main function
const main = async (): Promise<void> => {
  const config = await loadConfig();
  const deployer = await createDeployer(config);
  
  program
    .name('deploy')
    .description('Deployment CLI tool for SecondBrain')
    .version('1.0.0');
  
  // List deployments command
  program
    .command('list')
    .description('List deployments')
    .option('-e, --environment <env>', 'Filter by environment')
    .option('-s, --status <status>', 'Filter by status')
    .option('-l, --limit <number>', 'Limit the number of results', '10')
    .action(async (options) => {
      const environment = options.environment ? options.environment.toUpperCase() as DeploymentEnvironment : undefined;
      const status = options.status ? options.status.toUpperCase() : undefined;
      const limit = parseInt(options.limit, 10);
      
      const deployments = deployer.listDeployments(environment, status, limit);
      displayDeployments(deployments);
    });
  
  // Show deployment details command
  program
    .command('show <id>')
    .description('Show details of a deployment')
    .action(async (id) => {
      const deployment = deployer.getDeployment(id);
      displayDeploymentDetails(deployment);
    });
  
  // Create a new deployment command
  program
    .command('create')
    .description('Create a new deployment')
    .option('-e, --environment <env>', 'Deployment environment')
    .option('-s, --strategy <strategy>', 'Deployment strategy')
    .option('-i, --image <image>', 'Docker image tag')
    .option('-v, --version <version>', 'Version to deploy')
    .option('-c, --commit <commit>', 'Commit hash')
    .option('-b, --build <build>', 'Build ID')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (options) => {
      try {
        // Prompt for missing options
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'environment',
            message: 'Select environment:',
            choices: Object.keys(config.environments),
            default: options.environment || 'development',
            when: !options.environment
          },
          {
            type: 'list',
            name: 'strategy',
            message: 'Select deployment strategy:',
            choices: ['direct', 'blue_green', 'canary', 'rolling'],
            default: options.strategy || config.default.strategy,
            when: !options.strategy
          },
          {
            type: 'input',
            name: 'imageTag',
            message: 'Enter Docker image tag:',
            default: options.image || `${config.environments[options.environment || 'development'].dockerRegistry}:latest`,
            when: !options.image
          },
          {
            type: 'input',
            name: 'version',
            message: 'Enter version:',
            default: options.version || '1.0.0',
            when: !options.version
          },
          {
            type: 'input',
            name: 'commitHash',
            message: 'Enter commit hash (optional):',
            default: options.commit || '',
            when: !options.commit
          },
          {
            type: 'input',
            name: 'buildId',
            message: 'Enter build ID (optional):',
            default: options.build || '',
            when: !options.build
          },
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Confirm deployment?',
            default: true,
            when: !options.yes
          }
        ]);
        
        // Combine CLI options and prompts
        const environment = (options.environment || answers.environment) as DeploymentEnvironment;
        const strategy = (options.strategy || answers.strategy) as DeploymentStrategy;
        const imageTag = options.image || answers.imageTag;
        const version = options.version || answers.version;
        const commitHash = options.commit || answers.commitHash;
        const buildId = options.build || answers.buildId;
        const confirmed = options.yes || answers.confirm;
        
        if (!confirmed) {
          console.log(chalk.yellow('Deployment cancelled'));
          return;
        }
        
        // Get environment-specific config
        const envConfig = config.environments[environment];
        
        if (!envConfig) {
          console.error(chalk.red(`Unknown environment: ${environment}`));
          return;
        }
        
        // Create deployment config
        const deploymentConfig: DeploymentConfig = {
          environment: environment as DeploymentEnvironment,
          strategy: strategy as DeploymentStrategy,
          imageTag,
          host: envConfig.host,
          username: envConfig.username,
          sshKeyPath: envConfig.sshKeyPath,
          deploymentDir: envConfig.deploymentDir || config.default.deploymentDir,
          composeFile: envConfig.composeFile || config.default.composeFile,
          healthCheckUrl: envConfig.healthCheckUrl,
          healthCheckTimeout: envConfig.healthCheckTimeout || config.default.healthCheckTimeout,
          rollbackEnabled: typeof envConfig.rollbackEnabled !== 'undefined' 
            ? envConfig.rollbackEnabled 
            : config.default.rollbackEnabled,
          postDeploymentCommands: envConfig.postDeploymentCommands,
          envVars: envConfig.envVars || config.default.envVars,
          notifyOnSuccess: config.notifications?.slack?.enabled || false,
          notifyOnFailure: config.notifications?.slack?.enabled || false,
          dockerRegistry: envConfig.dockerRegistry
        };
        
        // Create deployment
        const deployment = deployer.createDeployment(
          deploymentConfig,
          version,
          commitHash || undefined,
          buildId || undefined
        );
        
        console.log(chalk.green(`Created deployment: ${deployment.id}`));
        
        // Confirm execution
        const { executeNow } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'executeNow',
            message: 'Execute deployment now?',
            default: true
          }
        ]);
        
        if (executeNow) {
          const spinner = ora('Executing deployment...').start();
          
          try {
            const success = await deployer.executeDeployment(deployment.id);
            
            if (success) {
              spinner.succeed(chalk.green('Deployment completed successfully'));
              displayDeploymentDetails(deployer.getDeployment(deployment.id));
            } else {
              spinner.fail(chalk.red('Deployment failed'));
              displayDeploymentDetails(deployer.getDeployment(deployment.id));
            }
          } catch (error) {
            spinner.fail(chalk.red(`Deployment failed: ${error}`));
          }
        }
      } catch (error) {
        console.error(chalk.red(`Failed to create deployment: ${error}`));
      }
    });
  
  // Execute a deployment command
  program
    .command('execute <id>')
    .description('Execute a deployment')
    .action(async (id) => {
      const deployment = deployer.getDeployment(id);
      
      if (!deployment) {
        console.error(chalk.red(`Deployment ${id} not found`));
        return;
      }
      
      const spinner = ora('Executing deployment...').start();
      
      try {
        const success = await deployer.executeDeployment(id);
        
        if (success) {
          spinner.succeed(chalk.green('Deployment completed successfully'));
          displayDeploymentDetails(deployer.getDeployment(id));
        } else {
          spinner.fail(chalk.red('Deployment failed'));
          displayDeploymentDetails(deployer.getDeployment(id));
        }
      } catch (error) {
        spinner.fail(chalk.red(`Deployment failed: ${error}`));
      }
    });
  
  // Rollback a deployment command
  program
    .command('rollback <id>')
    .description('Rollback a deployment')
    .action(async (id) => {
      const deployment = deployer.getDeployment(id);
      
      if (!deployment) {
        console.error(chalk.red(`Deployment ${id} not found`));
        return;
      }
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to rollback deployment ${id}?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Rollback cancelled'));
        return;
      }
      
      const spinner = ora('Rolling back deployment...').start();
      
      try {
        const success = await deployer.rollbackDeployment(id);
        
        if (success) {
          spinner.succeed(chalk.green('Rollback completed successfully'));
          
          if (deployment.rollbackDeploymentId) {
            displayDeploymentDetails(deployer.getDeployment(deployment.rollbackDeploymentId));
          }
        } else {
          spinner.fail(chalk.red('Rollback failed'));
        }
      } catch (error) {
        spinner.fail(chalk.red(`Rollback failed: ${error}`));
      }
    });
  
  // Generate a report command
  program
    .command('report <id>')
    .description('Generate a deployment report')
    .option('-o, --output <file>', 'Output file for the report')
    .action(async (id, options) => {
      const deployment = deployer.getDeployment(id);
      
      if (!deployment) {
        console.error(chalk.red(`Deployment ${id} not found`));
        return;
      }
      
      const outputFile = options.output || `./deployment-report-${id}.html`;
      const spinner = ora('Generating deployment report...').start();
      
      try {
        const success = await deployer.generateReport(id, outputFile);
        
        if (success) {
          spinner.succeed(chalk.green(`Report generated successfully: ${outputFile}`));
        } else {
          spinner.fail(chalk.red('Failed to generate report'));
        }
      } catch (error) {
        spinner.fail(chalk.red(`Failed to generate report: ${error}`));
      }
    });
  
  await program.parseAsync(process.argv);
};

main().catch(error => {
  console.error(chalk.red(`Error: ${error}`));
  process.exit(1);
});