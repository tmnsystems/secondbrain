/**
 * Demonstration of the Executor Agent capabilities
 * 
 * This script demonstrates the executor agent's capabilities for:
 * 1. Command execution
 * 2. File operations
 * 3. Git operations
 * 4. Task status updates
 */

import { ExecutorAgent } from './libs/agents/executor';
import { NotionTaskUpdater } from './libs/agents/executor/notionUpdater';
import { executeCommands } from './libs/agents/executor/enhancedCommandExecutor';
import { FileOperation, GitOperation } from './libs/agents/executor/types';
import * as path from 'path';
import * as fs from 'fs';

async function demonstrateExecutorAgent() {
  console.log('▶️ Starting Executor Agent Demonstration');
  
  // Create output directory for demonstration
  const demoDir = path.join(process.cwd(), 'executor-demo');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }
  
  // Initialize executor agent
  console.log('⚙️ Initializing Executor Agent...');
  const executor = new ExecutorAgent({
    workingDir: demoDir,
    logLevel: 'info'
  });
  
  await executor.initialize();
  console.log('✅ Executor Agent initialized');
  
  // 1. Demonstrate command execution
  console.log('\n📋 DEMONSTRATING COMMAND EXECUTION');
  
  console.log('  ▶️ Simple echo command:');
  const echoResult = await executor.executeCommand('echo "Hello from Executor Agent!"');
  console.log(`  ✅ Result (exit code ${echoResult.exitCode}): ${echoResult.stdout.trim()}`);
  
  console.log('  ▶️ Multiple commands in sequence:');
  const commands = [
    'echo "Step 1: Creating directory structure"',
    'mkdir -p subdir1/nesteddir',
    'echo "Step 2: Creating test files"',
    'touch test-file.txt',
    'echo "Step 3: Listing directory contents"',
    'ls -la'
  ];
  
  const multiCommandResults = await executeCommands(commands, { cwd: demoDir });
  multiCommandResults.forEach((result, index) => {
    console.log(`  ✅ Command ${index + 1} (exit code ${result.exitCode}): ${result.stdout.trim()}`);
  });
  
  // 2. Demonstrate file operations
  console.log('\n📂 DEMONSTRATING FILE OPERATIONS');
  
  console.log('  ▶️ Writing file:');
  const writeResult = await executor.performFileOperation(
    FileOperation.WRITE,
    {
      path: path.join(demoDir, 'executor-info.txt'),
      data: 'The Executor Agent is responsible for running system commands, managing deployments, handling Git operations, and executing tests.'
    }
  );
  console.log(`  ✅ Write operation ${writeResult.success ? 'succeeded' : 'failed'}`);
  
  console.log('  ▶️ Reading file:');
  const readResult = await executor.performFileOperation(
    FileOperation.READ,
    {
      path: path.join(demoDir, 'executor-info.txt')
    }
  );
  console.log(`  ✅ Read operation ${readResult.success ? 'succeeded' : 'failed'}: "${readResult.data}"`);
  
  console.log('  ▶️ Listing directory:');
  const listResult = await executor.performFileOperation(
    FileOperation.LIST,
    {
      path: demoDir
    }
  );
  console.log(`  ✅ List operation ${listResult.success ? 'succeeded' : 'failed'}: Found ${listResult.files?.length} files/directories`);
  console.log(`    📄 ${listResult.files?.join('\n    📄 ')}`);
  
  // 3. Demonstrate Git operations
  console.log('\n🔄 DEMONSTRATING GIT OPERATIONS');
  
  console.log('  ▶️ Checking Git version:');
  const gitVersionResult = await executor.executeCommand('git --version');
  console.log(`  ✅ Git version: ${gitVersionResult.stdout.trim()}`);
  
  console.log('  ▶️ Initializing Git repository:');
  const gitInitResult = await executor.performGitOperation(
    GitOperation.INIT,
    {
      repoPath: demoDir
    }
  );
  console.log(`  ✅ Git init ${gitInitResult.success ? 'succeeded' : 'failed'}: ${gitInitResult.output.trim()}`);
  
  console.log('  ▶️ Adding files to Git:');
  const gitAddResult = await executor.performGitOperation(
    GitOperation.ADD,
    {
      repoPath: demoDir,
      files: ['.']
    }
  );
  console.log(`  ✅ Git add ${gitAddResult.success ? 'succeeded' : 'failed'}: ${gitAddResult.output.trim()}`);
  
  console.log('  ▶️ Checking Git status:');
  const gitStatusResult = await executor.performGitOperation(
    GitOperation.STATUS,
    {
      repoPath: demoDir
    }
  );
  console.log(`  ✅ Git status:\n${gitStatusResult.output.trim()}`);
  
  // 4. Demonstrate task status updates
  console.log('\n📝 DEMONSTRATING TASK STATUS UPDATES');
  
  const notionUpdater = new NotionTaskUpdater();
  
  console.log('  ▶️ Updating task SB-EXECUTOR-001 to Completed:');
  const task001Update = await notionUpdater.updateTaskStatus(
    'SB-EXECUTOR-001',
    'Completed',
    'Successfully set up TypeScript environment and core infrastructure'
  );
  console.log(`  ✅ Task updated: ${task001Update.taskId} - ${task001Update.status} at ${task001Update.lastUpdated}`);
  
  console.log('  ▶️ Updating task SB-EXECUTOR-002 to Completed:');
  const task002Update = await notionUpdater.updateTaskStatus(
    'SB-EXECUTOR-002',
    'Completed',
    'Implemented basic command execution framework'
  );
  console.log(`  ✅ Task updated: ${task002Update.taskId} - ${task002Update.status} at ${task002Update.lastUpdated}`);
  
  console.log('\n✅ EXECUTOR AGENT DEMONSTRATION COMPLETED');
  
  // Shutdown executor agent
  await executor.shutdown();
}

// Run the demonstration
demonstrateExecutorAgent()
  .then(() => console.log('Demonstration completed successfully'))
  .catch(error => console.error('Error during demonstration:', error));