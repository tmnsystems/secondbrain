/**
 * Executor Agent Usage Example
 * 
 * This example demonstrates how to use the Executor Agent to run various commands.
 */

import { ExecutorAgent } from '../libs/agents/executor';

async function runExample() {
  console.log('Executor Agent Example');
  console.log('=======================');
  
  // Create an executor agent instance
  const executor = new ExecutorAgent({
    workingDirectory: process.cwd(),
    safeCommandsOnly: true,
    logLevel: 'info',
    timeoutMs: 30000
  });
  
  // Example 1: Run a simple shell command
  console.log('\nExample 1: Running a simple command');
  console.log('-----------------------------------');
  const echoResult = await executor.executeCommand('echo "Hello from Executor Agent!"');
  console.log(`Command success: ${echoResult.success}`);
  console.log(`Command output: ${echoResult.output.trim()}`);
  console.log(`Execution time: ${echoResult.executionTime}ms`);
  
  // Example 2: Run a Git operation
  console.log('\nExample 2: Running a Git operation');
  console.log('----------------------------------');
  const gitResult = await executor.git('status');
  console.log(`Git success: ${gitResult.success}`);
  console.log('Git output:');
  console.log(gitResult.output);
  
  // Example 3: Test command validation
  console.log('\nExample 3: Testing command validation');
  console.log('-------------------------------------');
  const invalidResult = await executor.executeCommand('rm -rf /');
  console.log(`Command rejected: ${!invalidResult.success}`);
  console.log(`Error message: ${invalidResult.error}`);
  
  // Example 4: Run system monitoring
  console.log('\nExample 4: System monitoring');
  console.log('---------------------------');
  const cpuResult = await executor.monitor('cpu');
  console.log(`Monitoring success: ${cpuResult.success}`);
  console.log('CPU usage:');
  console.log(cpuResult.output);
  
  // Example 5: Execute with customized configuration
  console.log('\nExample 5: Execute with custom config');
  console.log('------------------------------------');
  const lsResult = await executor.executeCommand('ls -la', {
    cwd: '../',
    timeout: 5000,
    env: { CUSTOM_VAR: 'test-value' }
  });
  console.log(`Command success: ${lsResult.success}`);
  console.log(`Files found: ${lsResult.output.split('\n').length - 1}`);
  
  console.log('\nExecutor Agent Example Completed');
}

// Run the example
runExample().catch(error => {
  console.error('Error running example:', error);
});