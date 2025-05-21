import { OrchestratorAgent } from '../orchestrator';
import { ReviewerAgent } from '../reviewer';
import { 
  Workflow, 
  WorkflowMetrics,
  ValidationResult
} from '../orchestrator/types';

/**
 * Integration between Reviewer Agent and Orchestrator Agent
 * Enables workflow quality validation, performance analysis, and security checks
 */
export class ReviewerOrchestratorIntegration {
  private orchestrator: OrchestratorAgent;
  private reviewer: ReviewerAgent;

  /**
   * Create a new ReviewerOrchestratorIntegration instance
   * @param orchestrator OrchestratorAgent instance
   * @param reviewer ReviewerAgent instance
   */
  constructor(orchestrator: OrchestratorAgent, reviewer: ReviewerAgent) {
    this.orchestrator = orchestrator;
    this.reviewer = reviewer;
  }

  /**
   * Validate the quality of a workflow
   * @param workflow Workflow to validate
   * @returns Validation results with recommendations
   */
  async validateWorkflowQuality(workflow: Workflow): Promise<ValidationResult & { recommendations: string[] }> {
    try {
      // Validate workflow structure
      const validationResult = await this.orchestrator.validateWorkflow(workflow);
      
      // If there are structural issues, return them immediately
      if (!validationResult.valid) {
        return {
          ...validationResult,
          recommendations: [
            'Fix structural issues before continuing with deeper validation',
            ...validationResult.errors.map(err => `Fix issue at ${err.path}: ${err.message}`)
          ]
        };
      }
      
      // Analyze workflow steps for complexity and best practices
      const recommendations: string[] = [];
      
      // Check step naming conventions
      const stepNameIssues = workflow.steps.filter(step => 
        !step.name || step.name.length < 3 || /[^a-zA-Z0-9_\- ]/.test(step.name)
      );
      if (stepNameIssues.length > 0) {
        recommendations.push('Improve step naming: use clear, descriptive names without special characters');
      }
      
      // Check for proper error handling
      const missingErrorHandling = workflow.steps.filter(step => !step.onError && step.type !== 'wait');
      if (missingErrorHandling.length > 0) {
        recommendations.push('Add error handling to steps that lack it');
      }
      
      // Check for proper timeouts
      const missingTimeouts = workflow.steps.filter(step => 
        !step.timeout && !workflow.timeoutMs && step.type !== 'wait'
      );
      if (missingTimeouts.length > 0) {
        recommendations.push('Set appropriate timeouts for steps to prevent indefinite hangs');
      }
      
      // Check for potential step execution bottlenecks
      const complexSteps = workflow.steps.filter(step =>
        step.type === 'parallel' && step.parallel && 
        step.parallel.branches && step.parallel.branches.length > 5
      );
      if (complexSteps.length > 0) {
        recommendations.push('Consider splitting very large parallel branches into smaller units');
      }
      
      return {
        ...validationResult,
        recommendations
      };
    } catch (error) {
      console.error('Error validating workflow quality:', error);
      const err = error as Error;
      throw new Error(`Failed to validate workflow quality: ${err.message}`);
    }
  }

  /**
   * Analyze workflow performance using metrics
   * @param metrics Workflow execution metrics
   * @returns Analysis results and optimization recommendations
   */
  async analyzeWorkflowPerformance(metrics: WorkflowMetrics): Promise<any> {
    try {
      // Analyze step performance metrics
      const slowSteps: string[] = [];
      const highErrorSteps: string[] = [];
      const highRetrySteps: string[] = [];
      
      Object.entries(metrics.stepMetrics).forEach(([stepName, stepMetric]) => {
        if (stepMetric.averageDuration > metrics.averageDuration * 1.5) {
          slowSteps.push(stepName);
        }
        
        if (stepMetric.errorRate > 0.1) {
          highErrorSteps.push(stepName);
        }
        
        if (stepMetric.retryRate > 0.2) {
          highRetrySteps.push(stepName);
        }
      });
      
      // Generate recommendations based on analysis
      const recommendations: string[] = [];
      
      if (slowSteps.length > 0) {
        recommendations.push(`Optimize slow steps: ${slowSteps.join(', ')}`);
      }
      
      if (highErrorSteps.length > 0) {
        recommendations.push(`Improve error handling for steps with high error rates: ${highErrorSteps.join(', ')}`);
      }
      
      if (highRetrySteps.length > 0) {
        recommendations.push(`Investigate steps with high retry rates: ${highRetrySteps.join(', ')}`);
      }
      
      // Check overall workflow health
      if (metrics.successRate < 0.9) {
        recommendations.push('Workflow success rate is below 90%, consider review and improvement');
      }
      
      if (metrics.errorRate > 0.1) {
        recommendations.push('Workflow error rate is above 10%, investigate and resolve recurring issues');
      }
      
      // Check resource usage
      if (metrics.resourceUsage.cpu > 0.8) {
        recommendations.push('CPU usage is high, consider optimizing computationally intensive steps');
      }
      
      if (metrics.resourceUsage.memory > 0.8) {
        recommendations.push('Memory usage is high, check for memory leaks or high consumption steps');
      }
      
      // Analyze agent utilization
      const highUtilizationAgents: string[] = [];
      const lowUtilizationAgents: string[] = [];
      
      Object.entries(metrics.agentUtilization).forEach(([agent, utilization]) => {
        if (utilization > 0.9) {
          highUtilizationAgents.push(agent);
        } else if (utilization < 0.3) {
          lowUtilizationAgents.push(agent);
        }
      });
      
      if (highUtilizationAgents.length > 0) {
        recommendations.push(`Agent(s) with high utilization may be bottlenecks: ${highUtilizationAgents.join(', ')}`);
      }
      
      if (lowUtilizationAgents.length > 0) {
        recommendations.push(`Consider redistributing tasks from high to low utilization agents: ${lowUtilizationAgents.join(', ')}`);
      }
      
      return {
        workflowName: metrics.workflowName,
        performanceScore: this.calculatePerformanceScore(metrics),
        bottlenecks: {
          slowSteps,
          highErrorSteps,
          highRetrySteps,
          resourceIssues: this.identifyResourceIssues(metrics)
        },
        recommendations,
        improvementPotential: recommendations.length > 0 ? 'high' : 'low'
      };
    } catch (error) {
      console.error('Error analyzing workflow performance:', error);
      const err = error as Error;
      throw new Error(`Failed to analyze workflow performance: ${err.message}`);
    }
  }

  /**
   * Verify the integration between agents
   * @param integration Integration configuration to verify
   * @returns Validation results and improvement suggestions
   */
  async verifyAgentIntegration(integration: any): Promise<any> {
    try {
      // Verify that the agent types are registered
      const sourceAgentType = integration.sourceAgent;
      const targetAgentType = integration.targetAgent;
      
      // Check if the agents exist
      const sourceAgents = await this.orchestrator.findAgentsByType(sourceAgentType);
      const targetAgents = await this.orchestrator.findAgentsByType(targetAgentType);
      
      const issues: string[] = [];
      
      if (sourceAgents.length === 0) {
        issues.push(`Source agent type '${sourceAgentType}' not found in registry`);
      }
      
      if (targetAgents.length === 0) {
        issues.push(`Target agent type '${targetAgentType}' not found in registry`);
      }
      
      // If either agent doesn't exist, return the issues
      if (issues.length > 0) {
        return {
          valid: false,
          issues,
          recommendations: ['Register missing agent types before attempting integration']
        };
      }
      
      // Verify capability compatibility
      const sourceCapabilities = new Set<string>();
      const targetCapabilities = new Set<string>();
      
      sourceAgents.forEach((agent: any) => {
        agent.capabilities.forEach((capability: string) => {
          sourceCapabilities.add(capability);
        });
      });
      
      targetAgents.forEach((agent: any) => {
        agent.capabilities.forEach((capability: string) => {
          targetCapabilities.add(capability);
        });
      });
      
      // Check if required capabilities are present
      const missingCapabilities: string[] = [];
      
      if (integration.requiredCapabilities) {
        integration.requiredCapabilities.forEach((capability: string) => {
          const isSourceCapability = sourceCapabilities.has(capability);
          const isTargetCapability = targetCapabilities.has(capability);
          
          if (!isSourceCapability && !isTargetCapability) {
            missingCapabilities.push(capability);
          }
        });
      }
      
      if (missingCapabilities.length > 0) {
        issues.push(`Missing required capabilities: ${missingCapabilities.join(', ')}`);
      }
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (missingCapabilities.length > 0) {
        recommendations.push('Add missing capabilities to one of the agent types');
      }
      
      // Return validation results
      return {
        valid: issues.length === 0,
        issues,
        agentTypes: {
          source: sourceAgentType,
          target: targetAgentType
        },
        capabilities: {
          source: Array.from(sourceCapabilities),
          target: Array.from(targetCapabilities),
          missing: missingCapabilities
        },
        recommendations
      };
    } catch (error) {
      console.error('Error verifying agent integration:', error);
      const err = error as Error;
      throw new Error(`Failed to verify agent integration: ${err.message}`);
    }
  }

  /**
   * Check workflow for security issues
   * @param workflow Workflow to check
   * @returns Security analysis results
   */
  async checkWorkflowSecurity(workflow: Workflow): Promise<any> {
    try {
      const securityIssues: Array<{
        severity: 'critical' | 'high' | 'medium' | 'low',
        issue: string,
        location: string,
        recommendation: string
      }> = [];
      
      // Check for input validation
      workflow.steps.forEach(step => {
        if (step.input && workflow.input && workflow.input.properties) {
          // Check if step inputs are properly validated by workflow schema
          const inputKeys = Object.keys(step.input);
          
          // For each input used by the step, check if it's defined in the workflow input schema
          inputKeys.forEach(key => {
            const inputPath = key.split('.');
            const workflowInputKey = inputPath[0];
            
            if (!workflow.input?.properties?.[workflowInputKey]) {
              securityIssues.push({
                severity: 'medium',
                issue: `Step "${step.name}" uses input "${key}" which is not validated in workflow input schema`,
                location: `steps[id=${step.id}].input.${key}`,
                recommendation: `Add validation for "${workflowInputKey}" in workflow input schema`
              });
            }
          });
        }
      });
      
      // Check for error handling
      workflow.steps.forEach(step => {
        if (!step.onError && step.type !== 'wait') {
          securityIssues.push({
            severity: 'medium',
            issue: `Step "${step.name}" does not have error handling`,
            location: `steps[id=${step.id}]`,
            recommendation: 'Add proper error handling using the onError property'
          });
        }
      });
      
      // Check for timeouts
      workflow.steps.forEach(step => {
        if (!step.timeout && !workflow.timeoutMs && step.type !== 'wait') {
          securityIssues.push({
            severity: 'low',
            issue: `Step "${step.name}" does not have a timeout specified`,
            location: `steps[id=${step.id}]`,
            recommendation: 'Add a timeout to prevent indefinite execution'
          });
        }
      });
      
      // Check for agent type restrictions if any sensitive operations
      const sensitiveOperations = ['deployment', 'database', 'file_write', 'api_call'];
      workflow.steps.forEach(step => {
        if (step.capability && sensitiveOperations.some(op => step.capability?.includes(op))) {
          if (!step.agent) {
            securityIssues.push({
              severity: 'high',
              issue: `Step "${step.name}" performs sensitive operation "${step.capability}" without agent restriction`,
              location: `steps[id=${step.id}]`,
              recommendation: 'Restrict execution to specific trusted agent using the agent property'
            });
          }
        }
      });
      
      // Generate overall security score and recommendations
      const criticalCount = securityIssues.filter(issue => issue.severity === 'critical').length;
      const highCount = securityIssues.filter(issue => issue.severity === 'high').length;
      const mediumCount = securityIssues.filter(issue => issue.severity === 'medium').length;
      const lowCount = securityIssues.filter(issue => issue.severity === 'low').length;
      
      // Calculate security score (0-100)
      const securityScore = 100 - 
        (criticalCount * 25) - 
        (highCount * 10) - 
        (mediumCount * 5) - 
        (lowCount * 1);
      
      // Determine security rating
      let securityRating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      
      if (securityScore >= 90) {
        securityRating = 'excellent';
      } else if (securityScore >= 75) {
        securityRating = 'good';
      } else if (securityScore >= 60) {
        securityRating = 'fair';
      } else if (securityScore >= 40) {
        securityRating = 'poor';
      } else {
        securityRating = 'critical';
      }
      
      // Generate recommendations
      const recommendations = securityIssues.map(issue => issue.recommendation);
      
      return {
        workflowName: workflow.name,
        securityScore,
        securityRating,
        issues: {
          total: securityIssues.length,
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount
        },
        securityIssues,
        recommendations: Array.from(new Set(recommendations)) // Remove duplicates
      };
    } catch (error) {
      console.error('Error checking workflow security:', error);
      const err = error as Error;
      throw new Error(`Failed to check workflow security: ${err.message}`);
    }
  }

  /**
   * Calculate performance score based on metrics
   * @param metrics Workflow metrics
   * @returns Performance score (0-100)
   */
  private calculatePerformanceScore(metrics: WorkflowMetrics): number {
    // Success rate: 40% of score
    const successRateScore = metrics.successRate * 40;
    
    // Error rate: 30% of score (inverse, lower is better)
    const errorRateScore = (1 - metrics.errorRate) * 30;
    
    // Duration: 15% of score (inverse, using arbitrary normalization)
    // Assume 5 minutes (300000ms) is average duration
    const averageDurationMs = 300000;
    const durationScore = Math.max(0, Math.min(15, 15 * (averageDurationMs / (metrics.averageDuration || averageDurationMs))));
    
    // Resource usage: 15% of score (inverse, lower is better)
    const cpuScore = (1 - metrics.resourceUsage.cpu) * 7.5;
    const memoryScore = (1 - metrics.resourceUsage.memory) * 7.5;
    
    // Total score
    return Math.min(100, successRateScore + errorRateScore + durationScore + cpuScore + memoryScore);
  }

  /**
   * Identify resource issues from metrics
   * @param metrics Workflow metrics
   * @returns Resource issues
   */
  private identifyResourceIssues(metrics: WorkflowMetrics): string[] {
    const issues: string[] = [];
    
    if (metrics.resourceUsage.cpu > 0.8) {
      issues.push('High CPU utilization');
    }
    
    if (metrics.resourceUsage.memory > 0.8) {
      issues.push('High memory utilization');
    }
    
    if (metrics.resourceUsage.network > 0.8) {
      issues.push('High network utilization');
    }
    
    return issues;
  }
}