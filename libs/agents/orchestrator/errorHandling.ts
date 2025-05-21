import { 
  OrchestratorAgentConfig,
  ExecutionContext,
  WorkflowStep,
  StepExecution,
  ErrorHandler,
  RetryPolicy
} from './types';

/**
 * Error Handling module for the Orchestrator Agent
 * Handles error detection, retry strategies, fallback mechanisms,
 * and recovery procedures
 */
export const errorHandling = {
  /**
   * Handle a step execution error
   * @param error Error that occurred
   * @param execution Execution context
   * @param stepExecution Step execution that failed
   * @param step Workflow step definition
   * @param config Orchestrator agent configuration
   * @returns Modified execution context and next action
   */
  async handleStepError(
    error: Error,
    execution: ExecutionContext,
    stepExecution: StepExecution,
    step: WorkflowStep,
    config: OrchestratorAgentConfig
  ): Promise<{ 
    execution: ExecutionContext; 
    action: 'retry' | 'fallback' | 'error-handler' | 'continue' | 'fail';
    targetStepId?: string;
  }> {
    try {
      console.error(`Error in step ${step.name} (${step.id}): ${error.message}`);
      
      // Update metrics
      execution.metrics.errorCount += 1;
      
      // Update step execution
      stepExecution.status = 'failed';
      stepExecution.error = error;
      stepExecution.endTime = new Date().toISOString();
      
      // If the step has a specific error handler
      if (step.onError) {
        if (typeof step.onError === 'string') {
          // It's a step ID to jump to
          return {
            execution,
            action: 'error-handler',
            targetStepId: step.onError
          };
        } else {
          // It's an error action
          const errorAction = step.onError;
          
          if (errorAction.action === 'retry') {
            // Check if we should retry
            if (this.shouldRetry(stepExecution, errorAction.retry || this.getDefaultRetryPolicy(config))) {
              return {
                execution,
                action: 'retry'
              };
            }
          } else if (errorAction.action === 'fallback' && errorAction.fallback) {
            // Use fallback step
            return {
              execution,
              action: 'fallback',
              targetStepId: errorAction.fallback
            };
          } else if (errorAction.action === 'continue') {
            // Continue to next step if any
            if (step.next) {
              const nextStepId = typeof step.next === 'string' 
                ? step.next 
                : this.determineNextStep(step.next, execution);
                
              if (nextStepId) {
                return {
                  execution,
                  action: 'continue',
                  targetStepId: nextStepId
                };
              }
            }
          }
          // If we get here, we'll fall through to the global handlers
        }
      }
      
      // Check global error handlers
      const handler = this.findMatchingErrorHandler(error, execution.workflowName);
      if (handler) {
        // Check if we should retry first
        if (handler.retry && this.shouldRetry(stepExecution, handler.retry)) {
          return {
            execution,
            action: 'retry'
          };
        }
        
        // Otherwise, use the error handler step
        return {
          execution,
          action: 'error-handler',
          targetStepId: handler.handler
        };
      }
      
      // No handler found, fail the execution
      execution.status = 'failed';
      execution.error = error;
      execution.endTime = new Date().toISOString();
      
      return {
        execution,
        action: 'fail'
      };
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
      
      // If the error handler itself fails, fail the execution
      execution.status = 'failed';
      execution.error = error; // Use the original error
      execution.endTime = new Date().toISOString();
      
      return {
        execution,
        action: 'fail'
      };
    }
  },

  /**
   * Determine if a step should be retried
   * @param stepExecution Step execution that failed
   * @param retryPolicy Retry policy to apply
   * @returns Whether the step should be retried
   */
  shouldRetry(
    stepExecution: StepExecution,
    retryPolicy: RetryPolicy
  ): boolean {
    return stepExecution.retryCount < retryPolicy.maxAttempts;
  },

  /**
   * Get the default retry policy based on configuration
   * @param config Orchestrator agent configuration
   * @returns Default retry policy
   */
  getDefaultRetryPolicy(
    config: OrchestratorAgentConfig
  ): RetryPolicy {
    return {
      maxAttempts: config.maxRetries || 3,
      backoffRate: config.retryStrategy === 'exponential' ? 2 : 1,
      interval: 1000
    };
  },

  /**
   * Calculate the retry delay based on retry count and policy
   * @param retryCount Current retry count
   * @param retryPolicy Retry policy to apply
   * @returns Delay in milliseconds
   */
  calculateRetryDelay(
    retryCount: number,
    retryPolicy: RetryPolicy
  ): number {
    if (retryPolicy.backoffRate <= 1) {
      // Linear backoff
      return retryPolicy.interval * (retryCount + 1);
    } else {
      // Exponential backoff
      return retryPolicy.interval * Math.pow(retryPolicy.backoffRate, retryCount);
    }
  },

  /**
   * Find a matching error handler for an error
   * @param error Error that occurred
   * @param workflowName Name of the workflow
   * @returns Matching error handler or undefined
   */
  findMatchingErrorHandler(
    error: Error,
    workflowName: string
  ): ErrorHandler | undefined {
    // This would be replaced with an actual lookup in the workflow definition
    // For now, we'll just return a mock handler for demonstration
    
    // In a real implementation, we would:
    // 1. Load the workflow definition
    // 2. Check the errorHandlers array
    // 3. Find the most specific handler that matches the error
    
    return {
      error: '*',
      handler: 'global_error_handler',
      retry: {
        maxAttempts: 3,
        backoffRate: 2,
        interval: 1000
      }
    };
  },

  /**
   * Determine the next step based on a next expression
   * @param nextExpression Next expression from a step
   * @param execution Current execution context
   * @returns ID of the next step
   */
  determineNextStep(
    nextExpression: any,
    execution: ExecutionContext
  ): string | undefined {
    // This would evaluate the expression against the execution context
    // For now, we'll just return the default case for demonstration
    
    // In a real implementation, we would:
    // 1. Evaluate the expression against the execution context
    // 2. Find the matching case
    // 3. Return the corresponding step ID
    
    return nextExpression.default;
  },

  /**
   * Prepare a step for retry
   * @param stepExecution Step execution to retry
   * @param retryPolicy Retry policy to apply
   * @returns Modified step execution ready for retry
   */
  prepareStepForRetry(
    stepExecution: StepExecution,
    retryPolicy: RetryPolicy
  ): StepExecution {
    // Update retry count
    stepExecution.retryCount += 1;
    
    // Reset status
    stepExecution.status = 'pending';
    stepExecution.error = undefined;
    stepExecution.startTime = undefined;
    stepExecution.endTime = undefined;
    
    return stepExecution;
  },

  /**
   * Record error metrics for analysis
   * @param error Error that occurred
   * @param execution Execution context
   * @param step Workflow step
   * @param config Orchestrator agent configuration
   */
  recordErrorMetrics(
    error: Error,
    execution: ExecutionContext,
    step: WorkflowStep,
    config: OrchestratorAgentConfig
  ): void {
    // This would record detailed error metrics for analysis
    // For now, we'll just log the error for demonstration
    
    console.log(`[METRIC] Error in workflow ${execution.workflowName}, step ${step.name}: ${error.message}`);
    
    // In a real implementation, we would:
    // 1. Record the error type
    // 2. Record the step that failed
    // 3. Record the number of retries
    // 4. Record whether recovery was successful
    // 5. Store the metrics for later analysis
  },

  /**
   * Create a compensation transaction for rollback
   * @param execution Execution context
   * @param failedStepId ID of the failed step
   * @param config Orchestrator agent configuration
   * @returns Compensation plan
   */
  createCompensationPlan(
    execution: ExecutionContext,
    failedStepId: string,
    config: OrchestratorAgentConfig
  ): any {
    // This would create a plan to undo changes made by the workflow
    // For now, we'll just return a placeholder for demonstration
    
    return {
      executionId: execution.id,
      failedStepId,
      stepsToCompensate: execution.currentSteps
        .filter(s => s.status === 'completed')
        .map(s => s.stepId)
    };
  }
};