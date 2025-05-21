import { OrchestratorAgent } from '../orchestrator';
import { BuildAgent } from '../build';
import { AgentInfo } from '../orchestrator/types';

/**
 * Integration between Build Agent and Orchestrator Agent
 * Enables generation of workflow components, integration layers, and custom step types
 */
export class BuildOrchestratorIntegration {
  private orchestrator: OrchestratorAgent;
  private builder: BuildAgent;

  /**
   * Create a new BuildOrchestratorIntegration instance
   * @param orchestrator OrchestratorAgent instance
   * @param builder BuildAgent instance
   */
  constructor(orchestrator: OrchestratorAgent, builder: BuildAgent) {
    this.orchestrator = orchestrator;
    this.builder = builder;
  }

  /**
   * Generate workflow components based on specifications
   * @param spec Workflow component specifications
   * @returns Generated components
   */
  async generateWorkflowComponents(spec: any): Promise<any> {
    try {
      // Extract specification details
      const { name, components, targetPath } = spec;
      
      // Generate components for the workflow
      const generatedComponents = await Promise.all(
        components.map(async (component: any) => {
          // Extract the needed fields and properly call createComponent
          return this.builder.createComponent(component.name, component.type || 'module', component);
        })
      );
      
      // Return the generated components
      return {
        name,
        components: generatedComponents,
        path: targetPath,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating workflow components:', error);
      const err = error as Error;
      throw new Error(`Failed to generate workflow components: ${err.message}`);
    }
  }

  /**
   * Create an integration layer for agents
   * @param agents Array of agent info objects
   * @returns Generated integration code
   */
  async createIntegrationLayer(agents: AgentInfo[]): Promise<any> {
    try {
      // Group agents by type
      const agentsByType: Record<string, AgentInfo[]> = {};
      agents.forEach(agent => {
        if (!agentsByType[agent.type]) {
          agentsByType[agent.type] = [];
        }
        agentsByType[agent.type].push(agent);
      });
      
      // Generate integration files for each agent type
      const integrationFiles = await Promise.all(
        Object.entries(agentsByType).map(async ([type, agentsOfType]) => {
          // Create component spec for the integration
          const integrationSpec = {
            name: `${type}Integration`,
            type: 'module',
            language: 'typescript',
            framework: 'node',
            dependencies: [
              { name: `@local/agents/${type.toLowerCase()}`, version: 'latest' },
              { name: '@local/agents/orchestrator', version: 'latest' }
            ],
            exports: [
              { name: `${type}OrchestratorIntegration`, type: 'class' }
            ],
            methods: [
              // Generate methods based on agent capabilities
              ...this.getMethodsForAgentType(type, agentsOfType)
            ]
          };
          
          // Generate the integration file
          return this.builder.createComponent(integrationSpec.name, integrationSpec.type || 'module', integrationSpec);
        })
      );
      
      // Generate an index file that exports all integrations
      const indexSpec = {
        name: 'index',
        type: 'module',
        language: 'typescript',
        framework: 'node',
        imports: Object.keys(agentsByType).map(type => ({
          source: `./${type.toLowerCase()}-orchestrator`,
          exports: [`${type}OrchestratorIntegration`]
        })),
        exports: Object.keys(agentsByType).map(type => (
          { name: `${type}OrchestratorIntegration`, type: 'class' }
        ))
      };
      
      const indexFile = await this.builder.createComponent(indexSpec.name, indexSpec.type || 'module', indexSpec);
      
      return {
        files: [...integrationFiles, indexFile],
        agents: Object.keys(agentsByType),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating integration layer:', error);
      const err = error as Error;
      throw new Error(`Failed to create integration layer: ${err.message}`);
    }
  }

  /**
   * Implement custom step types for the orchestrator
   * @param stepTypes Array of custom step type definitions
   * @returns Step implementations
   */
  async implementCustomStepTypes(stepTypes: any[]): Promise<any> {
    try {
      // Generate implementation files for each custom step type
      const implementationFiles = await Promise.all(
        stepTypes.map(async (stepType) => {
          // Create component spec for the step type
          const stepSpec = {
            name: `${stepType.name}Step`,
            type: 'module',
            language: 'typescript',
            framework: 'node',
            dependencies: [
              { name: '@local/agents/orchestrator', version: 'latest' }
            ],
            imports: [
              { source: '../types', exports: ['WorkflowStep', 'StepExecution', 'ExecutionContext'] }
            ],
            exports: [
              { name: `process${stepType.name}Step`, type: 'function' }
            ],
            methods: [
              {
                name: `process${stepType.name}Step`,
                parameters: [
                  { name: 'execution', type: 'ExecutionContext' },
                  { name: 'step', type: 'StepExecution' },
                  { name: 'stepDefinition', type: 'WorkflowStep' }
                ],
                returnType: 'Promise<void>',
                implementation: stepType.implementation || `
                  // Default implementation for ${stepType.name} step
                  console.log('Processing ${stepType.name} step:', stepDefinition.name);
                  
                  // Update step status
                  step.status = 'running';
                  step.startTime = new Date().toISOString();
                  
                  // TODO: Implement ${stepType.name} step logic
                  
                  // Mark as completed
                  step.status = 'completed';
                  step.endTime = new Date().toISOString();
                  
                  // Update execution metrics
                  execution.metrics.completedSteps++;
                `
              }
            ]
          };
          
          // Generate the step implementation file
          return this.builder.createComponent(stepSpec.name, stepSpec.type || 'module', stepSpec);
        })
      );
      
      // Generate a steps registry file
      const registrySpec = {
        name: 'stepsRegistry',
        type: 'module',
        language: 'typescript',
        framework: 'node',
        imports: stepTypes.map(stepType => ({
          source: `./${stepType.name.toLowerCase()}-step`,
          exports: [`process${stepType.name}Step`]
        })),
        exports: [
          { name: 'stepsRegistry', type: 'const' }
        ],
        implementation: `
          // Steps registry
          export const stepsRegistry = {
            ${stepTypes.map(stepType => `'${stepType.name.toLowerCase()}': process${stepType.name}Step`).join(',\n')}
          };
        `
      };
      
      const registryFile = await this.builder.createComponent(registrySpec.name, registrySpec.type, registrySpec);
      
      return {
        steps: stepTypes.map(stepType => stepType.name),
        files: [...implementationFiles, registryFile],
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error implementing custom step types:', error);
      const err = error as Error;
      throw new Error(`Failed to implement custom step types: ${err.message}`);
    }
  }

  /**
   * Extend workflow capabilities with new features
   * @param capabilities Array of capabilities to implement
   * @returns Extension results
   */
  async extendWorkflowCapabilities(capabilities: any[]): Promise<any> {
    try {
      // Generate implementation files for each capability
      const implementationFiles = await Promise.all(
        capabilities.map(async (capability) => {
          // Create component spec for the capability
          const capabilitySpec = {
            name: `${capability.name}Capability`,
            type: 'module',
            language: 'typescript',
            framework: 'node',
            dependencies: [
              { name: '@local/agents/orchestrator', version: 'latest' }
            ],
            exports: [
              { name: capability.name, type: 'const' }
            ],
            implementation: capability.implementation || `
              // Default implementation for ${capability.name} capability
              export const ${capability.name} = {
                name: '${capability.name}',
                description: '${capability.description || 'No description'}',
                
                execute: async (input: any) => {
                  console.log('Executing ${capability.name} capability with input:', input);
                  
                  // TODO: Implement ${capability.name} capability logic
                  
                  return {
                    result: '${capability.name} capability executed successfully',
                    timestamp: new Date().toISOString()
                  };
                }
              };
            `
          };
          
          // Generate the capability implementation file
          return this.builder.createComponent(capabilitySpec.name, capabilitySpec.type || 'module', capabilitySpec);
        })
      );
      
      // Generate a capabilities registry file
      const registrySpec = {
        name: 'capabilitiesRegistry',
        type: 'module',
        language: 'typescript',
        framework: 'node',
        imports: capabilities.map(capability => ({
          source: `./${capability.name.toLowerCase()}-capability`,
          exports: [capability.name]
        })),
        exports: [
          { name: 'capabilitiesRegistry', type: 'const' }
        ],
        implementation: `
          // Capabilities registry
          export const capabilitiesRegistry = {
            ${capabilities.map(capability => `'${capability.name}': ${capability.name}`).join(',\n')}
          };
        `
      };
      
      const registryFile = await this.builder.createComponent(registrySpec.name, registrySpec.type, registrySpec);
      
      return {
        capabilities: capabilities.map(capability => capability.name),
        files: [...implementationFiles, registryFile],
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extending workflow capabilities:', error);
      const err = error as Error;
      throw new Error(`Failed to extend workflow capabilities: ${err.message}`);
    }
  }

  /**
   * Get methods for an agent type based on capabilities
   * @param type Agent type
   * @param agents Agents of this type
   * @returns Array of method definitions
   */
  private getMethodsForAgentType(type: string, agents: AgentInfo[]): any[] {
    // Collect all capabilities from agents of this type
    const capabilities = new Set<string>();
    agents.forEach(agent => {
      agent.capabilities.forEach(capability => {
        capabilities.add(capability);
      });
    });
    
    // Create methods based on capabilities
    return Array.from(capabilities).map(capability => {
      const methodName = this.camelCase(capability);
      
      return {
        name: methodName,
        parameters: [
          { name: 'input', type: 'any' }
        ],
        returnType: 'Promise<any>',
        implementation: `
          // Find an agent with this capability
          const agents = await this.orchestrator.findAgentsByCapability('${capability}');
          if (agents.length === 0) {
            throw new Error('No agents available with capability: ${capability}');
          }
          
          // Create a task
          const task = {
            id: uuid(),
            name: '${methodName}',
            capability: '${capability}',
            input,
            executionId: 'direct-call',
            stepId: 'direct-call'
          };
          
          // Assign and wait for the task
          const assignment = await this.orchestrator.assignTask(task);
          
          // Wait for completion
          return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
              try {
                const status = await this.orchestrator.getTaskStatus(task.id);
                
                if (status.status === 'completed') {
                  clearInterval(interval);
                  resolve(status.result);
                } else if (status.status === 'failed') {
                  clearInterval(interval);
                  reject(status.error);
                }
              } catch (error) {
                clearInterval(interval);
                reject(error);
              }
            }, 1000);
          });
        `
      };
    });
  }

  /**
   * Convert a string to camelCase
   * @param str String to convert
   * @returns Camel case string
   */
  private camelCase(str: string): string {
    return str
      .split('_')
      .map((word, index) => 
        index === 0 
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }
}