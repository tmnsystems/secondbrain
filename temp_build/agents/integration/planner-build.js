"use strict";
/**
 * Planner-Build Integration
 *
 * This module integrates the Planner Agent with the Build Agent to automate
 * code generation from project specifications.
 */
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
exports.PlannerBuildIntegration = void 0;
const path = __importStar(require("path"));
class PlannerBuildIntegration {
    constructor(planner, builder, config, executor) {
        this.planner = planner;
        this.builder = builder;
        this.executor = executor;
        this.config = config;
    }
    /**
     * Generate code from a project specification
     */
    async generateFromSpec(projectSpec) {
        try {
            console.log(`Generating project from specification: ${projectSpec.name}`);
            // Extract project details
            const { name, type, framework, features = [], components = [], apis = [], models = [] } = projectSpec;
            // Create the project
            const project = await this.builder.createProject(name, {
                framework,
                typescript: true,
                cssFramework: features.includes('tailwind') ? 'tailwind' : 'css',
                features
            });
            console.log(`Project created at: ${project.root}`);
            // Track all generated files
            const generatedFiles = [...project.files];
            // Generate components
            for (const componentSpec of components) {
                const component = await this.builder.createComponent(componentSpec.name, componentSpec.type || 'react-component', {
                    props: componentSpec.props,
                    hooks: componentSpec.hooks,
                    styles: componentSpec.styles || 'css',
                    directory: path.join(project.root, 'src', 'components')
                });
                generatedFiles.push(...component.files);
            }
            // Generate API endpoints
            for (const apiSpec of apis) {
                const endpoint = await this.builder.createAPIEndpoint(apiSpec.path, apiSpec.method, {
                    parameters: apiSpec.parameters,
                    requestBody: apiSpec.requestBody,
                    response: apiSpec.response,
                    middleware: apiSpec.middleware,
                    directory: path.join(project.root, 'src', 'api')
                });
                generatedFiles.push(endpoint.file);
            }
            // Generate models
            for (const modelSpec of models) {
                const model = await this.builder.createModel(modelSpec.name, {
                    fields: modelSpec.fields,
                    relations: modelSpec.relations,
                    indexes: modelSpec.indexes
                });
                generatedFiles.push(model.file);
            }
            // Install dependencies if executor is available
            if (this.executor) {
                console.log('Installing dependencies...');
                const installResult = await this.executor.executeCommand('npm install', {
                    cwd: project.root
                });
                if (installResult.success) {
                    console.log('Dependencies installed successfully');
                }
                else {
                    console.error('Failed to install dependencies:', installResult.error);
                }
            }
            return {
                project,
                generatedFiles
            };
        }
        catch (error) {
            console.error('Error generating from spec:', error);
            throw error;
        }
    }
    /**
     * Implement a feature based on a specification
     */
    async implementFeature(featureSpec) {
        try {
            console.log(`Implementing feature: ${featureSpec.name}`);
            // Extract feature details
            const { name, type, components = [], apis = [], models = [], projectRoot } = featureSpec;
            // Determine the project root
            const root = projectRoot || this.config.projectRoot;
            // Track all generated components
            const generatedComponents = [];
            // Generate components
            for (const componentSpec of components) {
                const component = await this.builder.createComponent(componentSpec.name, componentSpec.type || 'react-component', {
                    props: componentSpec.props,
                    hooks: componentSpec.hooks,
                    styles: componentSpec.styles || 'css',
                    directory: path.join(root, 'src', 'components')
                });
                generatedComponents.push(component);
            }
            // Track all generated APIs
            const generatedApis = [];
            // Generate API endpoints
            for (const apiSpec of apis) {
                const endpoint = await this.builder.createAPIEndpoint(apiSpec.path, apiSpec.method, {
                    parameters: apiSpec.parameters,
                    requestBody: apiSpec.requestBody,
                    response: apiSpec.response,
                    middleware: apiSpec.middleware,
                    directory: path.join(root, 'src', 'api')
                });
                generatedApis.push(endpoint);
            }
            // Track all generated models
            const generatedModels = [];
            // Generate models
            for (const modelSpec of models) {
                const model = await this.builder.createModel(modelSpec.name, {
                    fields: modelSpec.fields,
                    relations: modelSpec.relations,
                    indexes: modelSpec.indexes
                });
                generatedModels.push(model);
            }
            return {
                name,
                type,
                components: generatedComponents,
                apis: generatedApis,
                models: generatedModels
            };
        }
        catch (error) {
            console.error('Error implementing feature:', error);
            throw error;
        }
    }
    /**
     * Create a component from a specification
     */
    async createComponentFromSpec(componentSpec) {
        try {
            console.log(`Creating component from spec: ${componentSpec.name}`);
            // Extract component details
            const { name, type, props = [], hooks = [], styles = 'css', projectRoot, directory } = componentSpec;
            // Determine the project root and directory
            const root = projectRoot || this.config.projectRoot;
            const componentDir = directory || path.join(root, 'src', 'components');
            // Create the component
            const component = await this.builder.createComponent(name, type || 'react-component', {
                props,
                hooks,
                styles,
                directory: componentDir
            });
            return component;
        }
        catch (error) {
            console.error('Error creating component from spec:', error);
            throw error;
        }
    }
    /**
     * Get a task from the Planner Agent and implement it
     */
    async implementTask(taskId) {
        try {
            console.log(`Implementing task: ${taskId}`);
            // Get the task from the Planner Agent
            const task = await this.planner.getTask(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }
            // Check if the task is a build task
            if (task.type !== 'build') {
                throw new Error(`Task is not a build task: ${task.type}`);
            }
            // Extract task details
            const { spec, projectId } = task;
            // Get the project from the Planner Agent
            const project = await this.planner.getProject(projectId);
            if (!project) {
                throw new Error(`Project not found: ${projectId}`);
            }
            // Implement the task based on the spec type
            let result;
            switch (spec.type) {
                case 'project':
                    result = await this.generateFromSpec(spec);
                    break;
                case 'feature':
                    result = await this.implementFeature(spec);
                    break;
                case 'component':
                    result = await this.createComponentFromSpec(spec);
                    break;
                default:
                    throw new Error(`Unknown spec type: ${spec.type}`);
            }
            // Update the task status
            await this.planner.updateTaskStatus(taskId, 'completed');
            return {
                task,
                result
            };
        }
        catch (error) {
            console.error('Error implementing task:', error);
            // Update the task status
            await this.planner.updateTaskStatus(taskId, 'failed');
            throw error;
        }
    }
}
exports.PlannerBuildIntegration = PlannerBuildIntegration;
exports.default = PlannerBuildIntegration;
