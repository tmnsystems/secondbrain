import { OrchestratorAgent } from '../orchestrator';
import { PlannerAgent } from '../planner';
import { 
  Workflow, 
  WorkflowDefinition,
  WorkflowStep
} from '../orchestrator/types';

/**
 * Integration between Planner Agent and Orchestrator Agent
 * Enables workflow creation from plans and plan generation from requirements
 */
export class PlannerOrchestratorIntegration {
  private orchestrator: OrchestratorAgent;
  private planner: PlannerAgent;

  /**
   * Create a new PlannerOrchestratorIntegration instance
   * @param orchestrator OrchestratorAgent instance
   * @param planner PlannerAgent instance
   */
  constructor(orchestrator: OrchestratorAgent, planner: PlannerAgent) {
    this.orchestrator = orchestrator;
    this.planner = planner;
  }

  /**
   * Create a workflow from a project plan
   * @param plan Plan created by the Planner Agent
   * @returns Created workflow
   */
  async createWorkflowFromPlan(plan: any): Promise<Workflow> {
    try {
      // Extract plan data for workflow creation
      const { name, description, tasks } = plan;
      
      // Create a workflow definition
      const workflowDefinition: WorkflowDefinition = {
        name,
        description,
        steps: this.convertTasksToSteps(tasks),
        version: '1.0.0',
        tags: ['generated', 'planner']
      };
      
      // Define the workflow using the orchestrator
      return await this.orchestrator.defineWorkflow(name, workflowDefinition);
    } catch (error) {
      console.error('Error creating workflow from plan:', error);
      throw new Error(`Failed to create workflow from plan: ${error.message}`);
    }
  }

  /**
   * Update an existing workflow based on a plan
   * @param workflow Workflow to update
   * @param plan Plan with updated information
   * @returns Updated workflow
   */
  async updateWorkflowBasedOnPlan(workflow: Workflow, plan: any): Promise<Workflow> {
    try {
      // Create a new workflow definition based on the existing one
      const updatedWorkflow: Workflow = {
        ...workflow,
        description: plan.description || workflow.description,
        steps: this.convertTasksToSteps(plan.tasks),
        updatedAt: new Date().toISOString()
      };
      
      // Save the updated workflow
      await this.orchestrator.saveWorkflow(updatedWorkflow);
      
      return updatedWorkflow;
    } catch (error) {
      console.error('Error updating workflow based on plan:', error);
      throw new Error(`Failed to update workflow based on plan: ${error.message}`);
    }
  }

  /**
   * Generate an execution plan from requirements
   * @param requirements Requirements for the plan
   * @returns Generated execution plan
   */
  async generateExecutionPlan(requirements: any): Promise<any> {
    try {
      // Use the planner to analyze the requirements
      const analysis = await this.planner.analyzeProject({
        name: requirements.name || 'Execution Plan',
        description: requirements.description || '',
        objectives: requirements.objectives || [],
        constraints: requirements.constraints || [],
        priorities: requirements.priorities || []
      });
      
      // Generate tasks based on the analysis
      const tasks = await this.planner.generateTasks(analysis);
      
      // Create a timeline if requested
      let timeline = undefined;
      if (requirements.timeline) {
        timeline = await this.planner.createTimeline(tasks);
      }
      
      // Return the execution plan
      return {
        name: requirements.name || 'Execution Plan',
        analysis,
        tasks,
        timeline
      };
    } catch (error) {
      console.error('Error generating execution plan:', error);
      throw new Error(`Failed to generate execution plan: ${error.message}`);
    }
  }

  /**
   * Optimize a workflow for better execution performance
   * @param workflow Workflow to optimize
   * @returns Optimized workflow
   */
  async optimizeWorkflowExecution(workflow: Workflow): Promise<Workflow> {
    try {
      // This would use the planner to optimize the workflow
      // For now, we'll just return the original workflow
      
      return workflow;
    } catch (error) {
      console.error('Error optimizing workflow execution:', error);
      throw new Error(`Failed to optimize workflow execution: ${error.message}`);
    }
  }

  /**
   * Convert planner tasks to workflow steps
   * @param tasks Tasks from the planner
   * @returns Workflow steps
   */
  private convertTasksToSteps(tasks: any[]): WorkflowStep[] {
    // Create a map of tasks by ID for dependency resolution
    const taskMap = new Map();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
    });
    
    // Convert tasks to steps
    return tasks.map(task => {
      const step: WorkflowStep = {
        id: task.id,
        name: task.name,
        type: 'task',
        capability: this.mapTaskTypeToCapability(task.type),
        input: this.createInputFromTask(task)
      };
      
      // Add dependencies as next steps
      if (task.dependencies && task.dependencies.length > 0) {
        // In a real implementation, we would create proper step connections
        // For now, we'll just add the first dependency as the next step
        const nextTaskId = task.dependencies[0];
        if (taskMap.has(nextTaskId)) {
          step.next = nextTaskId;
        }
      }
      
      return step;
    });
  }

  /**
   * Map a task type to a capability
   * @param taskType Task type from the planner
   * @returns Capability name
   */
  private mapTaskTypeToCapability(taskType: string): string {
    // Map task types to capabilities
    const typeToCapability: Record<string, string> = {
      'analysis': 'project_analysis',
      'development': 'component_generation',
      'testing': 'test_execution',
      'documentation': 'page_operations',
      'deployment': 'deployment'
    };
    
    return typeToCapability[taskType] || 'command_execution';
  }

  /**
   * Create input mapping from a task
   * @param task Task from the planner
   * @returns Input mapping for the step
   */
  private createInputFromTask(task: any): any {
    // Convert task details to input mapping
    return {
      description: task.description,
      parameters: task.parameters || {},
      priority: task.priority
    };
  }
}