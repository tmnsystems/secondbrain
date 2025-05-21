/**
 * Three Agent Integration Example
 * 
 * This example demonstrates how the Planner, Executor, and Notion agents can work together
 * to create a project plan, execute tasks, and document everything in Notion.
 */

import { PlannerAgent } from '../libs/agents/planner';
import { ExecutorAgent } from '../libs/agents/executor';
import { NotionAgent } from '../libs/agents/notion';
import { NotionPlannerIntegration } from '../libs/agents/integration/notion-planner';
import { NotionExecutorIntegration } from '../libs/agents/integration/notion-executor';
import { ExecutorPlannerIntegration } from '../libs/agents/integration/executor-planner';

async function runExample() {
  console.log('Three Agent Integration Example');
  console.log('===============================');
  
  // Initialize the agents
  console.log('\nInitializing agents...');
  
  // Notion Agent
  const notion = new NotionAgent({
    apiKey: process.env.NOTION_API_KEY || '',
    logLevel: 'info'
  });
  
  // Planner Agent
  const planner = new PlannerAgent({
    workingDirectory: process.cwd(),
    notionEnabled: true
  });
  
  // Executor Agent
  const executor = new ExecutorAgent({
    workingDirectory: process.cwd(),
    safeCommandsOnly: true,
    logLevel: 'info',
    timeoutMs: 30000
  });
  
  // Set up integrations
  console.log('Setting up integrations...');
  
  // Notion-Planner Integration
  const notionPlanner = new NotionPlannerIntegration(notion, planner, {
    projectsDatabaseId: process.env.NOTION_PROJECTS_DATABASE_ID || '',
    tasksDatabaseId: process.env.NOTION_TASKS_DATABASE_ID || '',
    dependenciesDatabaseId: process.env.NOTION_DEPENDENCIES_DATABASE_ID || ''
  });
  
  // Notion-Executor Integration
  const notionExecutor = new NotionExecutorIntegration(notion, executor, {
    executionLogDatabaseId: process.env.NOTION_EXECUTION_LOG_DATABASE_ID || '',
    deploymentsLogDatabaseId: process.env.NOTION_DEPLOYMENTS_LOG_DATABASE_ID || '',
    systemMetricsDatabaseId: process.env.NOTION_SYSTEM_METRICS_DATABASE_ID || ''
  });
  
  // Executor-Planner Integration
  const executorPlanner = new ExecutorPlannerIntegration(planner, executor);
  
  // Example 1: Create a Project Plan
  console.log('\nExample 1: Creating a project plan...');
  const projectId = 'example-three-agent-project';
  const projectSpec = {
    name: 'Three Agent Demo Project',
    description: 'A demonstration of the integration between Planner, Executor, and Notion agents',
    tasks: [
      {
        id: 'task-1',
        name: 'List project directory files',
        description: 'Show all files in the project directory',
        type: 'shell',
        command: 'ls -la',
        status: 'pending',
        dependencies: []
      },
      {
        id: 'task-2',
        name: 'Create a demo directory',
        description: 'Create a directory for demo files',
        type: 'shell',
        command: 'mkdir -p demo',
        status: 'pending',
        dependencies: ['task-1']
      },
      {
        id: 'task-3',
        name: 'Create a demo file',
        description: 'Create a text file in the demo directory',
        type: 'shell',
        command: 'echo "Hello from Three Agent Integration!" > demo/hello.txt',
        status: 'pending',
        dependencies: ['task-2']
      },
      {
        id: 'task-4',
        name: 'Show system info',
        description: 'Display system information',
        type: 'monitor',
        command: 'cpu',
        status: 'pending',
        dependencies: []
      }
    ]
  };
  
  // Create the project plan using the Planner Agent
  await planner.createPlan(projectId, projectSpec);
  console.log('Project plan created successfully');
  
  // Example 2: Save the Project Plan to Notion
  console.log('\nExample 2: Saving project plan to Notion...');
  const planInNotion = await notionPlanner.saveProjectPlan(projectSpec);
  console.log('Project plan saved to Notion:', planInNotion.projectId);
  
  // Example 3: Execute the Project Plan
  console.log('\nExample 3: Executing the project plan...');
  
  // Set up event listeners
  executorPlanner.on('taskStarted', async (task) => {
    console.log(`Started task: ${task.name}`);
    
    // Update task status in Notion
    if (planInNotion.taskIds[task.id]) {
      await notionPlanner.updateTaskStatus(planInNotion.taskIds[task.id], 'In Progress');
    }
  });
  
  executorPlanner.on('taskUpdated', async (task) => {
    console.log(`Updated task: ${task.name} - Status: ${task.status}`);
    
    // Update task status in Notion
    if (planInNotion.taskIds[task.id]) {
      await notionPlanner.updateTaskStatus(
        planInNotion.taskIds[task.id], 
        task.status === 'completed' ? 'Completed' : 'Failed'
      );
    }
    
    // Log execution to Notion
    if (task.result) {
      await notionExecutor.logExecution({
        command: task.command,
        success: task.result.success,
        output: task.result.output,
        error: task.result.error,
        executionTime: task.result.executionTime
      });
    }
  });
  
  // Execute the plan
  const executionOptions = {
    sequential: true,
    stopOnFailure: false
  };
  
  await executorPlanner.runPlan(projectId, executionOptions);
  console.log('Project execution completed');
  
  // Example 4: Generate Reports
  console.log('\nExample 4: Generating reports...');
  
  // Generate a project report in Notion
  const projectReport = await notionPlanner.generateProjectReport(planInNotion.projectId);
  console.log('Project report generated');
  
  // Monitor system resources and log to Notion
  console.log('\nExample 5: Monitoring system resources...');
  const cpuResult = await executor.monitor('cpu');
  const memoryResult = await executor.monitor('memory');
  
  // Extract metrics from the output (this is a simplified example)
  const cpuUsage = cpuResult.output ? parseFloat(cpuResult.output.match(/\\d+\\.\\d+/)?.[0] || '0') : 0;
  const memoryUsage = memoryResult.output ? parseFloat(memoryResult.output.match(/\\d+\\.\\d+/)?.[0] || '0') : 0;
  
  // Log metrics to Notion
  await notionExecutor.logSystemMetrics({
    cpu: cpuUsage,
    memory: memoryUsage,
    timestamp: new Date(),
    notes: 'Metrics collected during three-agent integration example'
  });
  
  console.log('System metrics logged to Notion');
  
  console.log('\nThree Agent Integration Example Completed');
}

// Run the example
if (require.main === module) {
  runExample().catch(error => {
    console.error('Error running example:', error);
  });
}