import { spawn } from 'child_process';
import * as path from 'path';
import { AbstractAgent } from '../../common/agent';
import { Task, TaskResult } from '../../common/types';

/**
 * DeerFlowAgent - Bridges to the Deer-Flow multi-agent orchestration system
 */
export class DeerFlowAgent extends AbstractAgent {
  private scriptPath: string;

  /**
   * Create a new DeerFlowAgent
   * @param config Configuration object (optional)
   */
  constructor(config: Record<string, any> = {}) {
    super('deerflow', config);
    // Path to the Deer-Flow main.py entrypoint
    this.scriptPath = config.scriptPath || path.resolve(process.cwd(), 'deer-flow', 'main.py');
  }

  /**
   * Returns capabilities provided by DeerFlowAgent
   */
  getCapabilities() {
    return [
      {
        name: 'workflow_orchestration',
        description: 'Orchestrate complex workflows via Deer-Flow'
      }
    ];
  }

  /**
   * Execute a task by invoking Deer-Flow
   * @param task Task details with description used as query
   */
  async performTask(task: Task): Promise<any> {
    this.logger.info(`🦌 DeerFlowAgent executing task: ${task.id}`);
    return new Promise((resolve, reject) => {
      const command = 'python3';
      const args = [this.scriptPath, '--max_plan_iterations', String(task.options?.maxPlan || 1), '--max_step_num', String(task.options?.maxStep || 3), task.description || task.id];
      const proc = spawn(command, args, { cwd: process.cwd(), env: process.env });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', data => { stdout += data.toString(); });
      proc.stderr.on('data', data => { stderr += data.toString(); });
      proc.on('close', code => {
        if (code === 0) {
          this.logger.info(`🦌 DeerFlowAgent completed task: ${task.id}`);
          resolve(stdout.trim());
        } else {
          this.logger.error(`🦌 DeerFlowAgent error: ${stderr.trim()}`);
          reject(new Error(stderr.trim() || `DeerFlow exit code ${code}`));
        }
      });
    });
  }
}