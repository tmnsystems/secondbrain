# SecondBrain Monorepo Setup Documentation

## Directory Structure

The SecondBrain project follows a TypeScript monorepo structure, organizing code into separate packages with clear boundaries and dependencies. This structure is designed to support the agent architecture outlined in the Master Plan.

```
/
├── packages/
│   ├── tsconfig.base.json       # Base TypeScript configuration
│   ├── core/                    # Core functionality and services
│   │   ├── src/
│   │   │   ├── services/        # Core services (logger, config, LLM, vector store)
│   │   │   ├── types.ts         # Core type definitions
│   │   │   └── index.ts         # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/                  # Shared utilities and types
│   │   ├── src/
│   │   │   ├── types/           # Shared type definitions
│   │   │   ├── utils/           # Shared utility functions
│   │   │   └── index.ts         # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── agents/                  # Agent implementations
│   │   ├── build/               # Build agent
│   │   ├── executor/            # Executor agent
│   │   ├── notion/              # Notion agent
│   │   ├── orchestrator/        # Orchestrator agent
│   │   ├── planner/             # Planner agent
│   │   ├── refactor/            # Refactor agent
│   │   └── reviewer/            # Reviewer agent
│   ├── ui/                      # UI components and interfaces
│   ├── api/                     # API endpoints and services
│   └── utils/                   # Utility packages
```

## Design Decisions

### 1. Package Structure

The monorepo is organized into several key packages with clear responsibilities:

- **core**: Contains essential services and utilities used across the project, including LLM integration, vector storage, configuration, and logging.
- **shared**: Houses common types, interfaces, and utility functions shared between multiple packages.
- **agents**: Contains the implementation of each agent type (build, executor, notion, etc.) with their own package boundaries.
- **ui**: Will contain UI components for web interfaces and dashboards.
- **api**: Will provide API endpoints and services for external integration.
- **utils**: Additional utility packages for specific functionality.

### 2. Dependency Management

Dependencies flow in a controlled, hierarchical manner:

- **core** has minimal external dependencies and is not dependent on other packages.
- **shared** depends only on core types and utilities.
- **agent** packages depend on core and shared, but not on each other directly.
- Integrations between agents are managed through the orchestrator package.

This structure prevents circular dependencies and allows packages to be developed, tested, and deployed independently.

### 3. TypeScript Configuration

The monorepo uses a base TypeScript configuration (`tsconfig.base.json`) that is extended by each package. This ensures consistency across the codebase while allowing package-specific configurations when needed.

Key TypeScript features:

- Strict type checking
- ES2020 target for modern JavaScript features
- Source maps for debugging
- Declaration files for type definitions
- Path aliases for improved imports

### 4. Package Architecture

Each package follows a consistent internal architecture:

- **src/index.ts**: Public API and exports
- **src/types.ts**: Type definitions specific to the package
- **src/services/**: Service implementations
- **src/utils/**: Utility functions
- **src/__tests__/**: Unit and integration tests

## Agent Architecture Support

The monorepo structure directly supports the Seven-Stage Build Flow outlined in the Master Plan:

1. **Planner Agent**: Implemented as its own package with clear interfaces for task planning.
2. **Executor Agent**: Separate package responsible for executing tasks.
3. **Reviewer Agent**: Independent package for code and document review.
4. **Refactor Agent**: Dedicated package for code refactoring.
5. **Build Agent**: Specialized package for implementing features.
6. **Orchestrator Agent**: Coordinates between agents and workflow management.
7. **Notion Agent**: Handles content management and documentation.

### Key Architecture Features

1. **Agent Isolation**: Each agent operates as an independent module with well-defined interfaces.
2. **Workflow Management**: The orchestrator agent manages the flow of tasks between agents.
3. **Type Safety**: Strong typing across package boundaries ensures reliable integration.
4. **Shared Utilities**: Common functionality is abstracted into shared packages to avoid duplication.
5. **Testing Support**: The architecture facilitates unit testing of individual agents and integration testing of workflows.

## Next Steps

1. Implement unit tests for each package
2. Set up continuous integration and deployment
3. Add workflow orchestration
4. Implement Notion integration for task management
5. Develop specific agent functionality based on the Master Plan
6. Create documentation for each agent's capabilities and interface

## Maintenance Guidelines

1. Keep dependencies up to date
2. Maintain clear package boundaries
3. Ensure comprehensive test coverage
4. Document public APIs
5. Follow the Seven-Stage Build Flow process for all new features

This structure provides a solid foundation for the SecondBrain project, enabling scalable development and clear separation of concerns between different agent types and functionality.