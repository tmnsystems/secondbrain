# Executor Agent Implementation Guide

This guide outlines how to implement, use, and extend the Executor Agent within the SecondBrain system.

## Integration with Other Agents

The Executor Agent is designed to work with other agents in the SecondBrain system, particularly the Planner Agent. The typical workflow is:

1. **Planner Agent** creates project plans and tasks
2. **Executor Agent** receives tasks from the Planner and executes them
3. **Results and logs** are sent back to the Planner or other consuming agents

## Implementation Steps

### 1. Basic Setup

```typescript
import { ExecutorAgent } from '../libs/agents/executor';

// Create an executor agent instance
const executor = new ExecutorAgent({
  workingDirectory: '/path/to/project',
  safeCommandsOnly: true,
  logLevel: 'info',
  timeoutMs: 30000
});
```

### 2. Executing Tasks from the Planner

```typescript
// Assuming plannerTask is received from the Planner Agent
async function executeTask(plannerTask) {
  const { command, type, options } = plannerTask;
  
  let result;
  
  switch (type) {
    case 'shell':
      result = await executor.executeCommand(command, options);
      break;
      
    case 'git':
      result = await executor.git(command, options);
      break;
      
    case 'deploy':
      result = await executor.deploy(command, options.environment, options);
      break;
      
    case 'test':
      result = await executor.runTests(command, options);
      break;
      
    case 'monitor':
      result = await executor.monitor(command, options);
      break;
      
    default:
      throw new Error(`Unknown task type: ${type}`);
  }
  
  return {
    taskId: plannerTask.id,
    success: result.success,
    output: result.output,
    error: result.error,
    executionTime: result.executionTime
  };
}
```

### 3. Handling Secured Resources

For tasks that require secure credentials:

```typescript
import { getCredentials } from '../libs/security';

async function executeSecureTask(task) {
  // Get credentials for the task from secure storage
  const credentials = await getCredentials(task.resource);
  
  // Add credentials to environment variables
  const env = {
    ...task.options.env,
    ...credentials
  };
  
  // Execute the task with credentials
  return executor.executeCommand(task.command, {
    ...task.options,
    env
  });
}
```

### 4. Batch Execution

For executing multiple related tasks:

```typescript
async function executeBatch(tasks) {
  const results = [];
  
  for (const task of tasks) {
    try {
      const result = await executeTask(task);
      results.push(result);
      
      // Stop batch on failure if configured
      if (!result.success && task.stopOnFailure) {
        break;
      }
    } catch (error) {
      results.push({
        taskId: task.id,
        success: false,
        error: error.message,
        executionTime: 0
      });
      
      if (task.stopOnFailure) {
        break;
      }
    }
  }
  
  return results;
}
```

### 5. Extending with New Capabilities

To add custom execution capabilities:

```typescript
// Example: Adding database migration functionality
import { executeCommand } from '../libs/agents/executor/commandExecutor';

async function executeMigration(database, migrationFile, options = {}) {
  const command = `npx prisma migrate deploy --schema=${migrationFile}`;
  
  // Set database URL in environment
  const env = {
    DATABASE_URL: database.connectionString,
    ...options.env
  };
  
  return executeCommand(command, {
    ...options,
    env
  });
}

// Add method to ExecutorAgent class
ExecutorAgent.prototype.migrate = executeMigration;
```

## Security Considerations

1. **Command Injection** - All commands are sanitized and validated
2. **Credentials Management** - Never log or expose sensitive credentials
3. **Resource Limits** - Set timeouts for all operations
4. **Permission Scoping** - Limit operations to specific directories
5. **Audit Logging** - Log all executed commands for security review

## Error Handling

Implement robust error handling:

```typescript
try {
  const result = await executor.executeCommand('npm install');
  if (!result.success) {
    // Handle command failure
    console.error(`Command failed: ${result.error}`);
    // Attempt recovery or notify user
  }
} catch (error) {
  // Handle unexpected errors
  console.error(`Execution error: ${error.message}`);
}
```

## Monitoring and Logging

Set up comprehensive logging:

```typescript
// Configure log level based on environment
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const executor = new ExecutorAgent({
  logLevel,
  // other options
});

// Add custom logging middleware
const originalExecute = executor.executeCommand;
executor.executeCommand = async (command, options) => {
  console.log(`Executing command: ${command}`);
  const startTime = Date.now();
  
  try {
    const result = await originalExecute.call(executor, command, options);
    console.log(`Command completed in ${Date.now() - startTime}ms with exit code ${result.exitCode}`);
    return result;
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    throw error;
  }
};
```

## Testing

Use the provided test suite to verify functionality:

```bash
# Run executor agent tests
npm test -- libs/agents/executor
```

Add custom tests for integration with the Planner Agent:

```typescript
// tests/integration/executor-planner.test.ts
test('should execute tasks from planner', async () => {
  const planner = new PlannerAgent();
  const executor = new ExecutorAgent();
  
  // Create a plan with the planner
  const plan = await planner.createPlan('Test project');
  
  // Execute tasks from the plan
  const results = await Promise.all(
    plan.tasks.map(task => executor.executeTask(task))
  );
  
  // Verify all tasks completed successfully
  expect(results.every(result => result.success)).toBe(true);
});
```