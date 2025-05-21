# Refactor Agent

## Overview

The Refactor Agent is a core component in the Multi-Claude-Persona (MCP) architecture, focusing on code optimization, maintenance, and technical debt reduction. It serves as the code improvement layer, analyzing existing codebases and transforming them to improve performance, maintainability, and adaptability.

## Key Features

- **Code Analysis**: AST parsing, dependency graph generation, dead code detection, duplication finding
- **Transformation Engine**: Pattern-based refactoring, function extraction, symbol renaming, code style normalization
- **Performance Optimization**: Algorithm improvements, memory usage, async pattern optimization, loop enhancement
- **Modernization**: Legacy code updates, framework migration, language feature upgrades, API replacement
- **Impact Analysis**: Test impact prediction, breaking change detection, API compatibility verification

## Usage

### Basic Usage

```typescript
import { RefactorAgent } from '../libs/agents/refactor';

// Initialize the agent
const refactor = new RefactorAgent({
  projectRoot: '/path/to/project',
  languageTarget: 'typescript@4.5',
  refactoringLevel: 'balanced'
});

// Analyze code for refactoring opportunities
const analysisResult = await refactor.analyzeCode([
  '/path/to/project/src/components/UserProfile.tsx',
  '/path/to/project/src/utils/formatters.ts'
]);

// Find complex functions
const complexFunctions = analysisResult.functions
  .filter(fn => fn.complexity > 10)
  .sort((a, b) => b.complexity - a.complexity);

// Check for dead code
const deadCodeResult = await refactor.detectDeadCode([
  '/path/to/project/src/components/UserProfile.tsx'
]);

// Extract a method
const extractionResult = await refactor.extractFunction(
  '/path/to/project/src/components/UserProfile.tsx',
  { 
    start: { line: 45, column: 2 }, 
    end: { line: 60, column: 4 } 
  },
  { 
    name: 'renderUserDetails',
    visibility: 'private',
    parameters: ['user', 'showDetails']
  }
);

// Perform a complete project refactoring
const refactoringResult = await refactor.refactorProject({
  codeStyle: true,
  deadCodeRemoval: true,
  performanceOptimization: true,
  modernization: {
    languageLevel: 'es2022'
  }
});
```

### Integration with Reviewer Agent

```typescript
import { RefactorAgent } from '../libs/agents/refactor';
import { ReviewerAgent } from '../libs/agents/reviewer';
import { ReviewerRefactorIntegration } from '../libs/agents/integration/reviewer-refactor';

// Initialize agents
const reviewer = new ReviewerAgent({ projectRoot: '/path/to/project' });
const refactor = new RefactorAgent({ projectRoot: '/path/to/project' });

// Create integration
const integration = new ReviewerRefactorIntegration(reviewer, refactor);

// Apply refactoring and review changes
const refactoringResult = await refactor.extractFunction(
  '/path/to/project/src/components/UserProfile.tsx',
  { 
    start: { line: 45, column: 2 }, 
    end: { line: 60, column: 4 } 
  },
  { name: 'renderUserDetails' }
);

const reviewResult = await integration.reviewRefactoring(refactoringResult);

// Get suggestions based on code analysis
const analysisResult = await refactor.analyzeCode([
  '/path/to/project/src/components/UserProfile.tsx'
]);

const suggestions = await integration.suggestRefactorings(analysisResult);
```

## Configuration Options

The Refactor Agent can be configured with various options:

```typescript
interface RefactorAgentConfig {
  projectRoot: string;               // Root directory of the project
  languageTarget?: string;           // Target language version (e.g., 'typescript@4.5')
  frameworkTarget?: string;          // Target framework version (e.g., 'react@18')
  styleGuide?: string;               // Preferred code style guide
  refactoringLevel?: 'safe' | 'balanced' | 'aggressive';  // Refactoring aggressiveness
  ignorePatterns?: string[];         // Patterns to ignore during refactoring
  testDir?: string;                  // Directory where tests are located
  preserveComments?: boolean;        // Whether to preserve comments
  generateSourceMaps?: boolean;      // Whether to generate source maps
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

## Refactoring Strategies

The agent supports multiple refactoring strategies:

1. **Safe Refactoring**:
   - Focus on non-functional changes
   - Maintain complete behavioral equivalence
   - Ensure tests pass before and after
   - Avoid potential breaking changes

2. **Balanced Refactoring**:
   - Combination of safe and impactful changes
   - Limited behavioral changes with clear benefits
   - Moderate architectural improvements
   - Test-verified changes

3. **Aggressive Refactoring**:
   - Significant architectural changes
   - API improvements even with breaking changes
   - Major code reorganization
   - Focus on long-term maintainability

## Future Enhancements

- Machine learning-based refactoring suggestions
- Interactive visualization of code transformations
- Complete framework migration assistance
- Multi-project refactoring coordination
- Custom refactoring rule development