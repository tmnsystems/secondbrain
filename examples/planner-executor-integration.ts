/**
 * Planner-Executor Integration Example
 * 
 * This example demonstrates how the Planner Agent can create a project plan
 * and the Executor Agent can execute the tasks from that plan.
 */

import { PlannerAgent } from '../libs/agents/planner';
import { ExecutorAgent } from '../libs/agents/executor';
import { ExecutorPlannerIntegration } from '../libs/agents/integration/executor-planner';

async function runExample() {
  console.log('Planner-Executor Integration Example');
  console.log('====================================');
  
  // Create a Planner Agent instance
  const planner = new PlannerAgent({
    workingDirectory: process.cwd(),
    notionEnabled: true // Enable Notion integration if set up
  });
  
  // Create an Executor Agent instance
  const executor = new ExecutorAgent({
    workingDirectory: process.cwd(),
    safeCommandsOnly: true,
    logLevel: 'info',
    timeoutMs: 30000
  });
  
  // Create an integration instance
  const integration = new ExecutorPlannerIntegration(planner, executor);
  
  // Set up event listeners for task status updates
  integration.on('taskStarted', (task) => {
    console.log(`Started task: ${task.name}`);
  });
  
  integration.on('taskUpdated', (task) => {
    console.log(`Updated task: ${task.name} - Status: ${task.status}`);
    if (task.result) {
      console.log(`Output: ${task.result.output.substring(0, 100)}${task.result.output.length > 100 ? '...' : ''}`);
    }
  });
  
  integration.on('taskError', (task, error) => {
    console.error(`Error in task ${task.name}:`, error.message);
  });
  
  // Example 1: Create a simple project plan
  console.log('\nExample 1: Creating a project plan');
  console.log('-----------------------------------');
  
  const projectId = 'example-project';
  const projectSpec = {
    name: 'Example Project',
    description: 'A simple project to demonstrate Planner-Executor integration',
    tasks: [
      {
        id: 'task-1',
        name: 'List files in current directory',
        description: 'Show all files in the current working directory',
        type: 'shell',
        command: 'ls -la',
        status: 'pending',
        dependencies: []
      },
      {
        id: 'task-2',
        name: 'Check Git status',
        description: 'Show the current Git repository status',
        type: 'git',
        command: 'status',
        status: 'pending',
        dependencies: ['task-1'] // This task depends on task-1
      },
      {
        id: 'task-3',
        name: 'Show CPU usage',
        description: 'Monitor CPU usage',
        type: 'monitor',
        command: 'cpu',
        status: 'pending',
        dependencies: []
      }
    ]
  };
  
  // Create the project plan
  await planner.createPlan(projectId, projectSpec);
  console.log('Project plan created successfully');
  
  // Example 2: Execute the project plan
  console.log('\nExample 2: Executing the project plan');
  console.log('------------------------------------');
  
  // Configure execution options
  const executionOptions = {
    sequential: true, // Execute tasks one after another
    stopOnFailure: true // Stop if any task fails
  };
  
  // Run the plan
  try {
    const updatedPlan = await integration.runPlan(projectId, executionOptions);
    console.log('\nProject execution completed');
    
    // Show the updated plan with execution results
    console.log('\nUpdated project plan:');
    console.log('Tasks:');
    for (const task of updatedPlan.tasks) {
      console.log(`- ${task.name}: ${task.status}`);
      if (task.result) {
        console.log(`  Success: ${task.result.success}`);
        console.log(`  Execution time: ${task.result.executionTime}ms`);
      }
    }
  } catch (error) {
    console.error('Error executing project plan:', error.message);
  }
  
  console.log('\nPlanner-Executor Integration Example Completed');
}

// Run the example
runExample().catch(error => {
  console.error('Error running example:', error);
});