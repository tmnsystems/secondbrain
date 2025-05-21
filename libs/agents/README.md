# SecondBrain Agent System

This directory contains the implementation of the multi-agent architecture for the SecondBrain ecosystem.

## Current Agents

### Planner Agent
The Planner Agent is responsible for breaking down complex projects into actionable tasks, prioritizing work, and creating detailed specifications for implementation.

**Key Features:**
- Project analysis to identify components and dependencies
- Task generation with effort estimation and prioritization
- Timeline creation with milestones
- Detailed specification generation for high-priority tasks
- Plan validation for completeness and consistency

### Executor Agent
The Executor Agent is responsible for command execution, environment management, deployments, and system operations.

**Key Features:**
- Secure command execution with validation and sanitization
- Git operations management
- Test execution and result processing
- Deployment pipeline management
- System monitoring and health checks

### Notion Agent
The Notion Agent provides seamless integration with Notion for documentation, planning, and knowledge management.

**Key Features:**
- Page and block operations
- Database querying and manipulation
- Content extraction and transformation
- Template-based document generation
- Notion search integration

### Build Agent
The Build Agent handles code generation, project scaffolding, and component creation.

**Key Features:**
- Project scaffolding with various frameworks
- Component and module generation
- File and directory operations
- Template-based code generation
- Integration with version control

### Reviewer Agent
The Reviewer Agent focuses on code quality assurance, testing, and analysis.

**Key Features:**
- Static code analysis (linting, type checking, complexity analysis)
- Test management and execution
- Performance analysis
- Documentation review
- Code review automation

## Usage

### Using the Planner Agent

```typescript
import { planProject } from '../libs/agents/planner';

// Define a project
const project = {
  name: 'Implement Notion Integration',
  description: 'Create a seamless integration with the Notion API for project planning and documentation.',
  objectives: [
    'Allow reading from Notion databases and pages',
    'Enable writing to Notion with proper formatting',
    'Implement synchronization between local plans and Notion'
  ],
  constraints: [
    'Must work with Notion API rate limits',
    'Should handle connection interruptions gracefully'
  ],
  priorities: [
    'Security of API credentials',
    'Robust error handling',
    'Performance with large documents'
  ]
};

// Generate a plan
const plan = await planProject(project, {
  detailLevel: 'high',
  timelineRequired: true,
  riskAssessment: true
});

// Access the generated plan
console.log(`Plan for ${project.name}:`);
console.log(`Summary: ${plan.analysis.summary}`);
console.log(`Tasks: ${plan.tasks.length}`);
plan.tasks.forEach(task => {
  console.log(`- ${task.name} (Priority: ${task.priority}, Effort: ${task.effort})`);
});
```

### Using the Reviewer Agent

```typescript
import { ReviewerAgent } from '../libs/agents/reviewer';

// Initialize the Reviewer Agent
const reviewer = new ReviewerAgent({
  projectRoot: '/path/to/project',
  lintConfig: '.eslintrc.json',
  stylePreference: 'airbnb'
});

// Run a static analysis on specific files
async function analyzeCode() {
  const files = [
    '/path/to/project/src/components/Button.tsx',
    '/path/to/project/src/utils/format.ts'
  ];
  
  // Lint the files
  const lintResult = await reviewer.lintCode(files);
  console.log(`Found ${lintResult.errorCount} errors and ${lintResult.warningCount} warnings`);
  
  // Type check the files
  const typeResult = await reviewer.checkTypes(files);
  
  // Run a complete project review
  const projectReview = await reviewer.reviewProject({
    linting: true,
    typeChecking: true,
    testing: true,
    coverage: true,
    documentation: true
  });
  
  console.log(`Project review score: ${projectReview.score} (Grade: ${projectReview.grade})`);
}
```

## Architecture

The agent system follows a modular architecture with clear separation of concerns:

- **Common** - Shared utilities and services used by all agents
- **Planner** - Project planning and task management
- **Executor** - DevOps and system operations
- **Notion** - Documentation and knowledge management
- **Build** - Code generation and scaffolding
- **Reviewer** - Code quality assurance
- **Refactor** - (Coming soon) Code optimization and maintenance
- **Orchestrator** - (Coming soon) Coordination of other agents

## Future Development

The agent system is actively under development with the following priorities:

1. Complete the Reviewer Agent implementation with real functionality
2. Develop the Refactor Agent for code optimization
3. Implement the Orchestrator Agent for coordination
4. Enhance inter-agent communication and workflows
5. Add advanced ML-based analysis capabilities