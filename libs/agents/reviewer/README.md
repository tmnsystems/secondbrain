# Reviewer Agent

## Overview

The Reviewer Agent is a core component in the Multi-Claude-Persona (MCP) architecture, focusing on code quality assurance, testing, and analysis. It serves as the quality control layer, ensuring that code meets standards and passes tests before deployment.

## Key Features

- **Static Code Analysis**: Linting, type checking, complexity analysis, and security scanning
- **Test Management**: Test discovery, execution, coverage analysis, and test generation
- **Performance Analysis**: Bundle size analysis, runtime performance metrics, memory usage evaluation
- **Documentation Review**: Documentation completeness, API documentation validation, README assessment
- **Code Review Automation**: Pull request analysis, code diff evaluation, refactoring suggestions

## Usage

### Basic Usage

```typescript
import { ReviewerAgent } from '../libs/agents/reviewer';

// Initialize the agent
const reviewer = new ReviewerAgent({
  projectRoot: '/path/to/project',
  lintConfig: '.eslintrc.json',
  stylePreference: 'airbnb'
});

// Lint code
const lintResults = await reviewer.lintCode(['src/components/Button.tsx']);

// Run tests
const testResults = await reviewer.runTests('src/**/*.test.ts', { 
  collectCoverage: true 
});

// Analyze a pull request
const prAnalysis = await reviewer.analyzePullRequest('123');

// Perform a complete project review
const projectReview = await reviewer.reviewProject();
```

### Integration with Build Agent

```typescript
import { ReviewerAgent } from '../libs/agents/reviewer';
import { BuildAgent } from '../libs/agents/build';
import { BuildReviewerIntegration } from '../libs/agents/integration/build-reviewer';

// Initialize agents
const reviewer = new ReviewerAgent({ projectRoot: '/path/to/project' });
const builder = new BuildAgent({ projectRoot: '/path/to/project' });

// Create integration
const integration = new BuildReviewerIntegration(reviewer, builder);

// Review generated files
const generatedFiles = await builder.generateComponent({
  name: 'Button',
  type: 'component'
});

const reviewResults = await integration.reviewGenerated(generatedFiles);

// Validate a component before generation
const component = {
  name: 'UserProfile',
  type: 'component',
  props: ['user', 'editable']
};

const validationResults = await integration.validateComponent(component);
```

## Configuration Options

The Reviewer Agent can be configured with various options:

```typescript
interface ReviewerAgentConfig {
  projectRoot: string;         // Root directory of the project
  testDir?: string;            // Directory containing tests
  coverageThreshold?: number;  // Minimum coverage percentage
  lintConfig?: string;         // Path to linting config
  stylePreference?: 'airbnb' | 'google' | 'standard' | 'custom';
  ignorePatterns?: string[];   // Files/directories to ignore
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

## Future Enhancements

- Machine learning-based code quality prediction
- Advanced semantic code understanding
- Collaborative review workflow
- Custom rule development