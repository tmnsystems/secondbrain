# Executor Agent

The Executor Agent is responsible for executing system-level operations, managing deployments, handling Git operations, running tests, and monitoring system resources based on plans from the Planner Agent.

## Core Components

- **Command Execution Engine** - Safely executes shell commands with validation and sanitization
- **Git Operations** - Handles Git-specific operations (commit, push, pull, etc.)
- **Deployment Pipeline** - Manages deployments to various environments (Vercel, Netlify, etc.)
- **Testing Framework** - Runs tests using different testing frameworks (Jest, Vitest, etc.)
- **System Monitor** - Monitors system resources and running processes

## Usage

```typescript
import { ExecutorAgent } from '../libs/agents/executor';

// Create an executor agent instance
const executor = new ExecutorAgent({
  workingDirectory: '/path/to/project',
  safeCommandsOnly: true,
  logLevel: 'info',
  timeoutMs: 30000
});

// Execute a command
await executor.executeCommand('npm install');

// Run a Git operation
await executor.git('commit', {
  message: 'Update dependencies',
  files: ['package.json', 'package-lock.json']
});

// Deploy a project
await executor.deploy('my-app', 'vercel', { production: true });

// Run tests
await executor.runTests('src', {
  framework: 'jest',
  coverage: true
});

// Monitor system
await executor.monitor('cpu');
```

## Security

The Executor Agent implements several security measures:

1. Command validation and sanitization
2. Restrict to safe commands by default
3. Block potentially dangerous operations
4. Timeout limits for all operations
5. Working directory restrictions

## Integration with Other Agents

The Executor Agent is designed to work closely with:

- **Planner Agent** - Receives tasks and project plans to execute
- **Builder Agent** - Executes build commands for projects
- **Reviewer Agent** - Runs tests and quality checks
- **Refactor Agent** - Executes code refactoring operations
