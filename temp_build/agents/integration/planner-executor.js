"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerExecutorIntegration = void 0;
const types_1 = require("../executor/types");
const path = __importStar(require("path"));
/**
 * PlannerExecutorIntegration is responsible for translating planning tasks
 * into executable commands and operations.
 */
class PlannerExecutorIntegration {
    /**
     * Create a new PlannerExecutorIntegration instance
     * @param executor ExecutorAgent instance
     */
    constructor(executor) {
        this.executor = executor;
    }
    /**
     * Execute a planning task using the executor
     * @param task Planning task to execute
     * @param projectRoot Project root directory
     * @returns Execution result
     */
    async executeTask(task, projectRoot) {
        // Handle different task types
        switch (task.type) {
            case 'setup':
                return this.executeSetupTask(task, projectRoot);
            case 'implementation':
                return this.executeImplementationTask(task, projectRoot);
            case 'feature':
                return this.executeFeatureTask(task, projectRoot);
            case 'integration':
                return this.executeIntegrationTask(task, projectRoot);
            case 'testing':
                return this.executeTestingTask(task, projectRoot);
            case 'documentation':
                return this.executeDocumentationTask(task, projectRoot);
            case 'deployment':
                return this.executeDeploymentTask(task, projectRoot);
            default:
                return this.executeGenericTask(task, projectRoot);
        }
    }
    /**
     * Execute all tasks in a plan
     * @param tasks Planning tasks to execute
     * @param projectRoot Project root directory
     * @returns Execution results
     */
    async executePlan(tasks, projectRoot) {
        // Sort tasks by dependencies
        const sortedTasks = this.sortTasksByDependencies(tasks);
        // Execute tasks sequentially
        const results = [];
        for (const task of sortedTasks) {
            try {
                const result = await this.executeTask(task, projectRoot);
                results.push({
                    taskId: task.id,
                    success: true,
                    result
                });
            }
            catch (error) {
                results.push({
                    taskId: task.id,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
                // Stop execution on failure if the task is critical
                if (task.priority === 'critical' || task.priority === 'high') {
                    break;
                }
            }
        }
        return results;
    }
    // Private helper methods for task execution
    async executeSetupTask(task, projectRoot) {
        // Setup tasks typically involve creating directories and initializing repositories
        // Create project directory if needed
        await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
            path: projectRoot,
            recursive: true
        });
        // Initialize Git repository if project setup
        if (task.name.toLowerCase().includes('project setup')) {
            await this.executor.performGitOperation(types_1.GitOperation.INIT, {
                repoPath: projectRoot
            });
        }
        // Create component directories if component setup
        if (task.name.toLowerCase().includes('setup') && task.components && task.components.length > 0) {
            // Determine directory name from component type
            const componentDir = this.getComponentDirectory(task, projectRoot);
            // Create component directory
            await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
                path: componentDir,
                recursive: true
            });
            // Create initial files based on component type
            await this.createInitialComponentFiles(task, componentDir);
        }
        return {
            message: `Setup completed for ${task.name}`
        };
    }
    async executeImplementationTask(task, projectRoot) {
        // Implementation tasks typically involve writing code
        // Determine component directory
        const componentDir = this.getComponentDirectory(task, projectRoot);
        // Create component directory if it doesn't exist
        await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
            path: componentDir,
            recursive: true
        });
        // Create or update component files
        await this.updateComponentFiles(task, componentDir);
        return {
            message: `Implementation completed for ${task.name}`,
            files: [`${componentDir}/index.ts`]
        };
    }
    async executeFeatureTask(task, projectRoot) {
        // Feature tasks typically involve implementing specific functionality
        // Collect all component directories related to this feature
        const componentDirs = [];
        if (task.components) {
            for (const componentId of task.components) {
                componentDirs.push(this.getComponentDirectoryById(componentId, projectRoot));
            }
        }
        // Update or create files for each component
        for (const componentDir of componentDirs) {
            await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
                path: componentDir,
                recursive: true
            });
            // Create component files based on feature requirements
            await this.createFeatureFiles(task, componentDir);
        }
        return {
            message: `Feature implementation completed for ${task.name}`,
            components: componentDirs
        };
    }
    async executeIntegrationTask(task, projectRoot) {
        // Integration tasks typically involve connecting components
        // Determine integration directory
        const integrationDir = path.join(projectRoot, 'integration');
        // Create integration directory if it doesn't exist
        await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
            path: integrationDir,
            recursive: true
        });
        // Create integration module
        if (task.components && task.components.length >= 2) {
            const sourceComponentId = task.components[0];
            const targetComponentId = task.components[1];
            const sourceComponentName = this.getComponentNameById(sourceComponentId);
            const targetComponentName = this.getComponentNameById(targetComponentId);
            const integrationFileName = `${sourceComponentName.toLowerCase()}-${targetComponentName.toLowerCase()}.ts`;
            const integrationFilePath = path.join(integrationDir, integrationFileName);
            // Create integration file
            await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                path: integrationFilePath,
                data: this.generateIntegrationFileContent(sourceComponentName, targetComponentName),
                recursive: true
            });
        }
        return {
            message: `Integration completed for ${task.name}`
        };
    }
    async executeTestingTask(task, projectRoot) {
        // Testing tasks typically involve creating and running tests
        // Determine test directory
        const testDir = path.join(projectRoot, 'tests');
        // Create test directory if it doesn't exist
        await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
            path: testDir,
            recursive: true
        });
        // Create test files
        if (task.components) {
            for (const componentId of task.components) {
                const componentName = this.getComponentNameById(componentId);
                const testFileName = `${componentName.toLowerCase()}.test.ts`;
                const testFilePath = path.join(testDir, testFileName);
                // Create test file
                await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                    path: testFilePath,
                    data: this.generateTestFileContent(componentName),
                    recursive: true
                });
            }
        }
        if (task.features) {
            for (const featureId of task.features) {
                const featureName = this.getFeatureNameById(featureId);
                const testFileName = `${featureName.toLowerCase().replace(/\s+/g, '-')}.test.ts`;
                const testFilePath = path.join(testDir, testFileName);
                // Create test file
                await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                    path: testFilePath,
                    data: this.generateFeatureTestContent(featureName),
                    recursive: true
                });
            }
        }
        return {
            message: `Testing completed for ${task.name}`
        };
    }
    async executeDocumentationTask(task, projectRoot) {
        // Documentation tasks typically involve creating markdown files
        // Determine documentation directory
        const docsDir = path.join(projectRoot, 'docs');
        // Create documentation directory if it doesn't exist
        await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
            path: docsDir,
            recursive: true
        });
        // Create documentation files
        if (task.components) {
            for (const componentId of task.components) {
                const componentName = this.getComponentNameById(componentId);
                const docFileName = `${componentName.toLowerCase()}.md`;
                const docFilePath = path.join(docsDir, docFileName);
                // Create documentation file
                await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                    path: docFilePath,
                    data: this.generateComponentDocContent(componentName),
                    recursive: true
                });
            }
        }
        if (task.name.includes('API Documentation')) {
            const apiDocPath = path.join(docsDir, 'api.md');
            // Create API documentation file
            await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                path: apiDocPath,
                data: this.generateApiDocContent(),
                recursive: true
            });
        }
        if (task.name.includes('User Documentation')) {
            const userDocPath = path.join(docsDir, 'user-guide.md');
            // Create user documentation file
            await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                path: userDocPath,
                data: this.generateUserDocContent(),
                recursive: true
            });
        }
        return {
            message: `Documentation completed for ${task.name}`
        };
    }
    async executeDeploymentTask(task, projectRoot) {
        // Deployment tasks typically involve deploying to environments
        if (task.name.includes('Setup Deployment Pipeline')) {
            // Create pipeline configuration
            const pipelineDir = path.join(projectRoot, '.github', 'workflows');
            // Create directory
            await this.executor.performFileOperation(types_1.FileOperation.MKDIR, {
                path: pipelineDir,
                recursive: true
            });
            // Create pipeline file
            const pipelineFilePath = path.join(pipelineDir, 'main.yml');
            await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                path: pipelineFilePath,
                data: this.generatePipelineContent(),
                recursive: true
            });
            return {
                message: 'Deployment pipeline configured'
            };
        }
        else if (task.name.includes('Deploy to')) {
            // Determine deployment environment
            let environment = '';
            if (task.name.includes('Development') || task.name.includes('development')) {
                environment = 'development';
            }
            else if (task.name.includes('Staging') || task.name.includes('staging')) {
                environment = 'staging';
            }
            else if (task.name.includes('Production') || task.name.includes('production')) {
                environment = 'production';
            }
            // Deploy to environment
            const deployResult = await this.executor.deploy(environment, {
                projectPath: projectRoot
            });
            return deployResult;
        }
        return {
            message: `Deployment task completed for ${task.name}`
        };
    }
    async executeGenericTask(task, projectRoot) {
        // Generic task execution for other task types
        // Simply log the task
        await this.executor.executeCommand(`echo "Executing task: ${task.name}"`, {
            cwd: projectRoot
        });
        return {
            message: `Task completed: ${task.name}`
        };
    }
    // Helper methods
    sortTasksByDependencies(tasks) {
        // Create a map of task IDs to tasks
        const taskMap = new Map();
        tasks.forEach(task => {
            taskMap.set(task.id, task);
        });
        // Create a dependency graph
        const graph = {};
        tasks.forEach(task => {
            graph[task.id] = task.dependencies || [];
        });
        // Create a visited set
        const visited = new Set();
        const temp = new Set();
        const result = [];
        // Topological sort
        const visit = (taskId) => {
            if (temp.has(taskId)) {
                // Circular dependency detected
                throw new Error(`Circular dependency detected in task ${taskId}`);
            }
            if (visited.has(taskId)) {
                return;
            }
            temp.add(taskId);
            // Visit dependencies
            (graph[taskId] || []).forEach(depId => {
                visit(depId);
            });
            temp.delete(taskId);
            visited.add(taskId);
            // Add task to result
            const task = taskMap.get(taskId);
            if (task) {
                result.push(task);
            }
        };
        // Visit all tasks
        tasks.forEach(task => {
            if (!visited.has(task.id)) {
                visit(task.id);
            }
        });
        return result;
    }
    getComponentDirectory(task, projectRoot) {
        let componentType = '';
        if (task.components && task.components.length > 0) {
            // Use the first component ID to determine type
            componentType = this.getComponentTypeById(task.components[0]);
        }
        else if (task.name.toLowerCase().includes('frontend')) {
            componentType = 'frontend';
        }
        else if (task.name.toLowerCase().includes('backend')) {
            componentType = 'backend';
        }
        else if (task.name.toLowerCase().includes('database')) {
            componentType = 'database';
        }
        else {
            componentType = 'core';
        }
        return path.join(projectRoot, 'src', componentType);
    }
    getComponentDirectoryById(componentId, projectRoot) {
        const componentType = this.getComponentTypeById(componentId);
        return path.join(projectRoot, 'src', componentType);
    }
    getComponentTypeById(componentId) {
        // This would normally look up the component type from a registry
        // For demonstration purposes, we'll infer it from the ID
        if (componentId.includes('frontend'))
            return 'frontend';
        if (componentId.includes('backend'))
            return 'backend';
        if (componentId.includes('database'))
            return 'database';
        if (componentId.includes('infra'))
            return 'infrastructure';
        return 'core';
    }
    getComponentNameById(componentId) {
        // This would normally look up the component name from a registry
        // For demonstration purposes, we'll generate a name from the ID
        const parts = componentId.split('-');
        const name = parts[parts.length - 1] || 'Component';
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
    getFeatureNameById(featureId) {
        // This would normally look up the feature name from a registry
        // For demonstration purposes, we'll generate a name from the ID
        const parts = featureId.split('-');
        const name = parts[parts.length - 1] || 'Feature';
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
    async createInitialComponentFiles(task, componentDir) {
        // Create index.ts
        await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
            path: path.join(componentDir, 'index.ts'),
            data: `/**
 * ${task.name}
 * 
 * ${task.description || 'Component implementation'}
 */

// Export component functionality
export * from './types';
`,
            recursive: true
        });
        // Create types.ts
        await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
            path: path.join(componentDir, 'types.ts'),
            data: `/**
 * Type definitions for ${task.name}
 */

// Core types
export interface Config {
  // Configuration options
}

// Exported interfaces
export interface ComponentInterface {
  // Component methods and properties
}
`,
            recursive: true
        });
    }
    async updateComponentFiles(task, componentDir) {
        // Update or create implementation file
        const implFileName = `${task.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.ts`;
        await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
            path: path.join(componentDir, implFileName),
            data: `/**
 * Implementation of ${task.name}
 * 
 * ${task.description || 'Component implementation'}
 */

import { Config, ComponentInterface } from './types';

/**
 * ${task.name} implementation
 */
export class Component implements ComponentInterface {
  private config: Config;
  
  /**
   * Create a new component instance
   * @param config Configuration options
   */
  constructor(config: Config = {}) {
    this.config = config;
  }
  
  /**
   * Initialize the component
   */
  async initialize(): Promise<void> {
    // Implementation
  }
  
  /**
   * Core component functionality
   */
  async process(input: any): Promise<any> {
    // Implementation
    return {
      result: 'Processed',
      timestamp: new Date().toISOString()
    };
  }
}
`,
            recursive: true
        });
        // Update index.ts to export the new implementation
        const indexPath = path.join(componentDir, 'index.ts');
        let indexContent = '';
        try {
            const readResult = await this.executor.performFileOperation(types_1.FileOperation.READ, {
                path: indexPath
            });
            if (typeof readResult.data === 'string') {
                indexContent = readResult.data;
            }
        }
        catch (error) {
            // File doesn't exist yet, create basic content
            indexContent = `/**
 * ${task.name}
 * 
 * ${task.description || 'Component implementation'}
 */

// Export component functionality
export * from './types';
`;
        }
        // Add export for the new implementation file if not already present
        const exportLine = `export * from './${implFileName.replace('.ts', '')}';`;
        if (!indexContent.includes(exportLine)) {
            indexContent += `\n${exportLine}\n`;
            await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                path: indexPath,
                data: indexContent
            });
        }
    }
    async createFeatureFiles(task, componentDir) {
        // Create feature implementation file
        const featureFileName = `${task.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.ts`;
        await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
            path: path.join(componentDir, featureFileName),
            data: `/**
 * Implementation of ${task.name}
 * 
 * ${task.description || 'Feature implementation'}
 */

/**
 * ${task.name} functionality
 */
export const ${this.camelCase(task.name)} = {
  /**
   * Initialize the feature
   */
  initialize: async (): Promise<void> => {
    // Implementation
  },
  
  /**
   * Core feature functionality
   */
  process: async (input: any): Promise<any> => {
    // Implementation
    return {
      result: 'Feature processed',
      timestamp: new Date().toISOString()
    };
  }
};
`,
            recursive: true
        });
        // Update index.ts to export the new feature
        const indexPath = path.join(componentDir, 'index.ts');
        let indexContent = '';
        try {
            const readResult = await this.executor.performFileOperation(types_1.FileOperation.READ, {
                path: indexPath
            });
            if (typeof readResult.data === 'string') {
                indexContent = readResult.data;
            }
        }
        catch (error) {
            // File doesn't exist yet, create basic content
            indexContent = `/**
 * Component with ${task.name} feature
 */

// Export feature functionality
`;
        }
        // Add export for the new feature file if not already present
        const exportLine = `export * from './${featureFileName.replace('.ts', '')}';`;
        if (!indexContent.includes(exportLine)) {
            indexContent += `\n${exportLine}\n`;
            await this.executor.performFileOperation(types_1.FileOperation.WRITE, {
                path: indexPath,
                data: indexContent
            });
        }
    }
    generateIntegrationFileContent(sourceComponent, targetComponent) {
        return `/**
 * Integration between ${sourceComponent} and ${targetComponent}
 * 
 * This module provides integration between the ${sourceComponent} and ${targetComponent} components.
 */

import { ${sourceComponent} } from '../src/${sourceComponent.toLowerCase()}';
import { ${targetComponent} } from '../src/${targetComponent.toLowerCase()}';

/**
 * Integration between ${sourceComponent} and ${targetComponent}
 */
export class ${sourceComponent}${targetComponent}Integration {
  private ${this.camelCase(sourceComponent)}: ${sourceComponent};
  private ${this.camelCase(targetComponent)}: ${targetComponent};
  
  /**
   * Create a new integration instance
   * @param ${this.camelCase(sourceComponent)} ${sourceComponent} instance
   * @param ${this.camelCase(targetComponent)} ${targetComponent} instance
   */
  constructor(
    ${this.camelCase(sourceComponent)}: ${sourceComponent},
    ${this.camelCase(targetComponent)}: ${targetComponent}
  ) {
    this.${this.camelCase(sourceComponent)} = ${this.camelCase(sourceComponent)};
    this.${this.camelCase(targetComponent)} = ${this.camelCase(targetComponent)};
  }
  
  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    // Implementation
  }
  
  /**
   * Integrate data from ${sourceComponent} to ${targetComponent}
   * @param data Data from ${sourceComponent}
   * @returns Processed data in ${targetComponent}
   */
  async processData(data: any): Promise<any> {
    // Implementation
    return {
      result: 'Integrated',
      timestamp: new Date().toISOString()
    };
  }
}
`;
    }
    generateTestFileContent(componentName) {
        return `/**
 * Tests for ${componentName}
 */

import { ${componentName} } from '../src/${componentName.toLowerCase()}';

describe('${componentName}', () => {
  let component: ${componentName};
  
  beforeEach(() => {
    component = new ${componentName}();
  });
  
  test('should initialize correctly', async () => {
    await component.initialize();
    // Assertions
  });
  
  test('should process data correctly', async () => {
    const result = await component.process({ test: true });
    expect(result).toBeDefined();
    // Additional assertions
  });
});
`;
    }
    generateFeatureTestContent(featureName) {
        const featureVariable = this.camelCase(featureName);
        return `/**
 * Tests for ${featureName} feature
 */

import { ${featureVariable} } from '../src/features/${featureName.toLowerCase().replace(/\s+/g, '-')}';

describe('${featureName}', () => {
  beforeEach(() => {
    // Setup
  });
  
  test('should initialize correctly', async () => {
    await ${featureVariable}.initialize();
    // Assertions
  });
  
  test('should process data correctly', async () => {
    const result = await ${featureVariable}.process({ test: true });
    expect(result).toBeDefined();
    // Additional assertions
  });
});
`;
    }
    generateComponentDocContent(componentName) {
        return `# ${componentName}

## Overview

The ${componentName} component is responsible for handling specific functionality in the system.

## Installation

\`\`\`bash
npm install @secondbrain/${componentName.toLowerCase()}
\`\`\`

## Usage

\`\`\`typescript
import { ${componentName} } from '@secondbrain/${componentName.toLowerCase()}';

const component = new ${componentName}();
await component.initialize();

const result = await component.process({ /* input data */ });
console.log(result);
\`\`\`

## API Reference

### Constructor

\`\`\`typescript
new ${componentName}(config?: Config)
\`\`\`

### Methods

#### initialize()

Initializes the component.

\`\`\`typescript
async initialize(): Promise<void>
\`\`\`

#### process(input)

Processes input data.

\`\`\`typescript
async process(input: any): Promise<any>
\`\`\`

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| option1 | string | Description of option | 'default' |
| option2 | number | Description of option | 0 |

## Examples

### Basic Example

\`\`\`typescript
import { ${componentName} } from '@secondbrain/${componentName.toLowerCase()}';

async function example() {
  const component = new ${componentName}();
  await component.initialize();
  
  const result = await component.process({ 
    data: 'example'
  });
  
  console.log(result);
}
\`\`\`

## License

MIT
`;
    }
    generateApiDocContent() {
        return `# API Documentation

## Overview

This document describes the API endpoints provided by the system.

## Authentication

All API endpoints require authentication using bearer tokens.

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Endpoints

### GET /api/v1/resources

Returns a list of resources.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| page | number | Page number (optional, default: 1) |
| limit | number | Number of items per page (optional, default: 20) |

#### Response

\`\`\`json
{
  "data": [
    {
      "id": "123",
      "name": "Resource Name",
      "description": "Resource Description"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
\`\`\`

### POST /api/v1/resources

Creates a new resource.

#### Request

\`\`\`json
{
  "name": "New Resource",
  "description": "Resource Description"
}
\`\`\`

#### Response

\`\`\`json
{
  "id": "456",
  "name": "New Resource",
  "description": "Resource Description",
  "createdAt": "2023-01-01T00:00:00Z"
}
\`\`\`

### GET /api/v1/resources/:id

Returns a specific resource.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| id | string | Resource ID |

#### Response

\`\`\`json
{
  "id": "123",
  "name": "Resource Name",
  "description": "Resource Description",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-02T00:00:00Z"
}
\`\`\`

### PUT /api/v1/resources/:id

Updates a specific resource.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| id | string | Resource ID |

#### Request

\`\`\`json
{
  "name": "Updated Resource",
  "description": "Updated Description"
}
\`\`\`

#### Response

\`\`\`json
{
  "id": "123",
  "name": "Updated Resource",
  "description": "Updated Description",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-03T00:00:00Z"
}
\`\`\`

### DELETE /api/v1/resources/:id

Deletes a specific resource.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| id | string | Resource ID |

#### Response

\`\`\`
204 No Content
\`\`\`

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request.

### Error Response Format

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
\`\`\`

### Common Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED | Authentication required |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Invalid request data |
| INTERNAL_ERROR | Server error |

## Rate Limiting

The API enforces rate limiting to prevent abuse. The following headers are included in all responses:

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum number of requests per hour |
| X-RateLimit-Remaining | Number of requests remaining in the current window |
| X-RateLimit-Reset | Time (in seconds) until the rate limit resets |

## Changelog

### v1.0.0 - 2023-01-01

- Initial API release
`;
    }
    generateUserDocContent() {
        return `# User Guide

## Introduction

Welcome to the system! This guide will walk you through the features and functionality of the application.

## Getting Started

### Account Creation

To get started, you'll need to create an account:

1. Click on the "Sign Up" button on the homepage
2. Enter your email address and create a password
3. Verify your email address by clicking the link in the verification email
4. Complete your profile information

### Logging In

Once your account is created, you can log in:

1. Click on the "Log In" button on the homepage
2. Enter your email address and password
3. Click "Log In"

## Dashboard

After logging in, you'll be taken to your dashboard, which shows an overview of your account and recent activity.

### Navigation

The main navigation menu is located on the left side of the screen and includes the following sections:

- Dashboard
- Projects
- Tasks
- Reports
- Settings

## Projects

### Creating a Project

To create a new project:

1. Click on "Projects" in the navigation menu
2. Click the "New Project" button
3. Enter a name and description for your project
4. Select any relevant categories or tags
5. Click "Create Project"

### Managing Projects

On the Projects page, you can:

- View all your projects
- Filter projects by status, category, or date
- Search for specific projects
- Edit project details
- Archive or delete projects

## Tasks

### Creating Tasks

To create a new task:

1. Navigate to the Tasks page
2. Click the "New Task" button
3. Enter a title and description
4. Select a project to associate with the task
5. Set a due date and priority
6. Assign the task to team members
7. Click "Create Task"

### Managing Tasks

On the Tasks page, you can:

- View all tasks across projects
- Filter tasks by status, priority, due date, or assignee
- Search for specific tasks
- Edit task details
- Mark tasks as complete
- Delete tasks

## Reports

The Reports section provides analytics and insights about your projects and tasks.

### Available Reports

- Project Progress: Shows completion percentage for each project
- Task Distribution: Breaks down tasks by status, priority, or assignee
- Time Tracking: Displays hours spent on different projects or tasks
- Activity Timeline: Shows a chronological view of all activity

### Generating Reports

To generate a report:

1. Navigate to the Reports page
2. Select the type of report you want to generate
3. Set any filters or parameters
4. Click "Generate Report"
5. View the report or export it as CSV or PDF

## Settings

The Settings page allows you to customize your account preferences.

### Available Settings

- Profile: Update your name, email, or password
- Notifications: Configure email and in-app notifications
- Teams: Manage team members and permissions
- Integrations: Connect with other tools and services
- Billing: Manage subscription and payment information

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| N | Create new item (project or task) |
| / | Search |
| ? | Show keyboard shortcuts |
| Ctrl+S | Save changes |
| Esc | Cancel or close dialog |

## Troubleshooting

### Common Issues

#### Can't Log In

- Ensure you're using the correct email address and password
- Check if Caps Lock is enabled
- Try resetting your password using the "Forgot Password" link

#### Missing Data

- Refresh the page to ensure you have the latest data
- Check your internet connection
- Verify you have the necessary permissions to access the data

### Getting Help

If you encounter any issues or have questions:

1. Visit our Help Center at help.example.com
2. Contact support at support@example.com
3. Call our support line at 1-800-EXAMPLE

## FAQ

### Frequently Asked Questions

**Q: How do I change my password?**
A: Go to Settings > Profile and click the "Change Password" button.

**Q: Can I transfer a task to another project?**
A: Yes, edit the task and select a different project from the dropdown menu.

**Q: How many projects can I create?**
A: The number of projects depends on your subscription plan. Basic plans allow up to 5 projects, while Premium plans have unlimited projects.
`;
    }
    generatePipelineContent() {
        return `name: CI/CD Pipeline

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Build
      run: npm run build
    
    - name: Test
      run: npm test
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build
        path: dist

  deploy-dev:
    needs: build
    if: github.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build
        path: dist
    
    - name: Deploy to Development
      run: echo "Deploying to development environment"
      # In a real deployment, you would have deployment commands here
    
    - name: Notify successful deployment
      run: echo "Deployment to development successful"

  deploy-prod:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build
        path: dist
    
    - name: Deploy to Production
      run: echo "Deploying to production environment"
      # In a real deployment, you would have deployment commands here
    
    - name: Notify successful deployment
      run: echo "Deployment to production successful"
`;
    }
    camelCase(input) {
        return input
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
            .replace(/\s+/g, '')
            .replace(/[^a-zA-Z0-9]/g, '');
    }
}
exports.PlannerExecutorIntegration = PlannerExecutorIntegration;
