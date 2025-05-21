/**
 * Script to update Notion task status for completed executor agent tasks
 */

import { NotionTaskUpdater } from './libs/agents/executor/notionUpdater';
import * as fs from 'fs';
import * as path from 'path';

async function updateTaskStatus() {
  // Create Notion task updater
  const notionUpdater = new NotionTaskUpdater();
  
  // Update task SB-EXECUTOR-001
  await notionUpdater.updateTaskStatus(
    'SB-EXECUTOR-001',
    'Completed',
    'Successfully set up TypeScript environment and core infrastructure for the Executor Agent. ' +
    'Implemented all required components and verified the setup works correctly.'
  );
  
  // Update task SB-EXECUTOR-002
  await notionUpdater.updateTaskStatus(
    'SB-EXECUTOR-002',
    'Completed',
    'Implemented basic command execution framework with enhanced security, ' +
    'error handling, and retry mechanisms. All tests are passing.'
  );
  
  // Verify updates were logged
  const task001Updates = await notionUpdater.getTaskUpdates('SB-EXECUTOR-001');
  const task002Updates = await notionUpdater.getTaskUpdates('SB-EXECUTOR-002');
  
  console.log('Task SB-EXECUTOR-001 Updates:', task001Updates);
  console.log('Task SB-EXECUTOR-002 Updates:', task002Updates);
  
  // Create an execution summary
  const executionSummary = {
    executor: 'ExecutorAgent',
    executionDate: new Date().toISOString(),
    tasksCompleted: [
      {
        id: 'SB-EXECUTOR-001',
        name: 'Set up the TypeScript environment and core infrastructure',
        status: 'Completed',
        completionTime: task001Updates[task001Updates.length - 1].completionTime
      },
      {
        id: 'SB-EXECUTOR-002',
        name: 'Implement basic command execution framework',
        status: 'Completed',
        completionTime: task002Updates[task002Updates.length - 1].completionTime
      }
    ],
    summary: 'Both tasks were completed successfully. The Executor Agent now has a robust TypeScript ' +
             'environment and a secure command execution framework with enhanced error handling and ' +
             'retry mechanisms. All tests are passing.'
  };
  
  // Write execution summary to file
  const summaryPath = path.join(process.cwd(), 'executor-execution-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(executionSummary, null, 2), 'utf8');
  
  console.log(`Execution summary written to ${summaryPath}`);
}

// Run the update
updateTaskStatus()
  .then(() => console.log('Task status updates completed'))
  .catch(error => console.error('Error updating task status:', error));