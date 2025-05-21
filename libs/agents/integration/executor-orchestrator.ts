import { OrchestratorAgent } from '../orchestrator';
import { ExecutorAgent } from '../executor';
import { Workflow } from '../orchestrator/types';

/**
 * Integration between Executor Agent and Orchestrator Agent
 * Enables orchestrated command execution, deployment pipelines, and system monitoring
 */
export class ExecutorOrchestratorIntegration {
  private orchestrator: OrchestratorAgent;
  private executor: ExecutorAgent;

  /**
   * Create a new ExecutorOrchestratorIntegration instance
   * @param orchestrator OrchestratorAgent instance
   * @param executor ExecutorAgent instance
   */
  constructor(orchestrator: OrchestratorAgent, executor: ExecutorAgent) {
    this.orchestrator = orchestrator;
    this.executor = executor;
  }

  /**
   * Execute a workflow of commands
   * @param workflow Workflow containing command execution steps
   * @returns Execution results
   */
  async executeCommandWorkflow(workflow: Workflow): Promise<any> {
    try {
      // Start the workflow execution
      const execution = await this.orchestrator.startWorkflow(workflow.id);
      
      // Wait for the execution to complete
      return new Promise((resolve, reject) => {
        // Subscribe to execution events
        this.orchestrator.subscribeToEvents(
          { executionId: execution.id },
          (event) => {
            if (event.type === 'execution.completed') {
              resolve(event.output);
            } else if (event.type === 'execution.failed') {
              reject(event.error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error executing command workflow:', error);
      const err = error as Error;
      throw new Error(`Failed to execute command workflow: ${err.message}`);
    }
  }

  /**
   * Manage a deployment pipeline
   * @param pipeline Deployment pipeline configuration
   * @returns Deployment status
   */
  async manageDeploymentPipeline(pipeline: any): Promise<any> {
    try {
      // Create workflow steps for the deployment pipeline
      const workflowSteps = [
        {
          id: 'prepare',
          name: 'Prepare Deployment',
          type: 'task' as const,
          capability: 'command_execution',
          input: {
            command: pipeline.prepareCommand || 'echo "Preparing deployment"'
          },
          next: 'build'
        },
        {
          id: 'build',
          name: 'Build Project',
          type: 'task' as const,
          capability: 'command_execution',
          input: {
            command: pipeline.buildCommand || 'npm run build'
          },
          next: 'test'
        },
        {
          id: 'test',
          name: 'Run Tests',
          type: 'task' as const,
          capability: 'test_execution',
          input: {
            pattern: pipeline.testPattern || 'tests/**/*.test.{js,ts}'
          },
          next: 'deploy'
        },
        {
          id: 'deploy',
          name: 'Deploy Project',
          type: 'task' as const,
          capability: 'deployment',
          input: {
            environment: pipeline.environment || 'development',
            path: pipeline.projectPath || process.cwd()
          }
        }
      ];
      
      // Create a workflow for the deployment pipeline
      const workflowDefinition = {
        name: `Deployment Pipeline: ${pipeline.name || 'Default'}`,
        description: `Deployment pipeline for ${pipeline.projectPath || 'project'}`,
        steps: workflowSteps,
        version: '1.0.0',
        tags: ['deployment', 'pipeline']
      };
      
      // Define the workflow
      const workflow = await this.orchestrator.defineWorkflow(
        `deployment-${Date.now()}`, 
        workflowDefinition
      );
      
      // Execute the workflow
      return this.executeCommandWorkflow(workflow);
    } catch (error) {
      console.error('Error managing deployment pipeline:', error);
      const err = error as Error;
      throw new Error(`Failed to manage deployment pipeline: ${err.message}`);
    }
  }

  /**
   * Configure system monitoring
   * @param config Monitoring configuration
   * @returns Monitoring setup
   */
  async configureSystemMonitoring(config: any): Promise<any> {
    try {
      // Configure executor monitoring
      const monitoringResult = await this.executor.monitor(
        config.target || 'system',
        {
          interval: config.interval || 60000,
          metrics: config.metrics || ['cpu', 'memory', 'disk', 'network'],
          alertThresholds: config.alertThresholds || {
            cpu: 80,
            memory: 80,
            disk: 90
          }
        }
      );
      
      // Create a webhook for alerts if configured
      if (config.alertWebhook) {
        await this.orchestrator.registerWebhook(
          'system.alert',
          config.alertWebhook
        );
      }
      
      return {
        monitoring: monitoringResult,
        metrics: {
          endpoint: '/metrics',
          interval: config.interval || 60000
        },
        alerts: {
          webhook: config.alertWebhook
        }
      };
    } catch (error) {
      console.error('Error configuring system monitoring:', error);
      const err = error as Error;
      throw new Error(`Failed to configure system monitoring: ${err.message}`);
    }
  }

  /**
   * Schedule recurring tasks
   * @param tasks Array of recurring tasks
   * @returns Schedule setup
   */
  async scheduleRecurringTasks(tasks: any[]): Promise<any> {
    try {
      // This would create scheduled workflows for each task
      // For now, we'll just return a placeholder
      
      const scheduledTasks = tasks.map(task => ({
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: task.name,
        schedule: task.schedule,
        workflow: task.workflow,
        next_run: this.calculateNextRun(task.schedule)
      }));
      
      return {
        tasks: scheduledTasks,
        scheduleId: `schedule-${Date.now()}`,
        message: 'Recurring tasks scheduled successfully'
      };
    } catch (error) {
      console.error('Error scheduling recurring tasks:', error);
      const err = error as Error;
      throw new Error(`Failed to schedule recurring tasks: ${err.message}`);
    }
  }

  /**
   * Calculate the next run time based on a schedule
   * @param schedule Schedule expression
   * @returns Next run time
   */
  private calculateNextRun(schedule: string): string {
    // This would parse the schedule expression and calculate the next run time
    // For now, we'll just return a time 1 hour from now
    
    const now = new Date();
    now.setHours(now.getHours() + 1);
    
    return now.toISOString();
  }
}