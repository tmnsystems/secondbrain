import { ErrorTracker, ErrorEvent, ErrorLevel, ErrorTrackerOptions } from './errorTracker';
import { ErrorReporter, ErrorReporterOptions } from './errorReporter';
import { Logger } from '../logging/logger';

/**
 * Error management system for tracking and reporting errors
 */
export class ErrorManagementSystem {
  private errorTracker: ErrorTracker;
  private errorReporter: ErrorReporter;
  private logger: Logger;

  /**
   * Creates a new error management system instance
   * 
   * @param {Object} options - Error management system options
   * @param {ErrorTrackerOptions} options.trackerOptions - Error tracker options
   * @param {ErrorReporterOptions} options.reporterOptions - Error reporter options
   * @param {Logger} options.logger - Logger instance
   */
  constructor(options: {
    trackerOptions: ErrorTrackerOptions;
    reporterOptions: ErrorReporterOptions;
    logger?: Logger;
  }) {
    this.logger = options.logger || new Logger({ service: options.trackerOptions.serviceName });
    this.errorTracker = new ErrorTracker({ ...options.trackerOptions, logger: this.logger });
    this.errorReporter = new ErrorReporter({ ...options.reporterOptions, logger: this.logger });

    this.logger.info('Error management system initialized', {
      serviceName: options.trackerOptions.serviceName,
      serviceVersion: options.trackerOptions.serviceVersion,
      environment: options.trackerOptions.environment
    });
  }

  /**
   * Captures an exception and sends it to the error tracking and reporting services
   * 
   * @param {Error} error - Error object
   * @param {Object} [options] - Additional options
   * @returns {Promise<void>}
   */
  async captureException(error: Error, options?: any): Promise<void> {
    await this.errorTracker.captureException(error, options);
    
    // Get the last error event from the tracker
    const lastError = this.errorTracker.getLastError();
    
    if (lastError === error) {
      // Create an error event for the reporter
      const errorEvent: ErrorEvent = {
        message: error.message,
        level: options?.level || ErrorLevel.ERROR,
        timestamp: new Date().toISOString(),
        context: options?.context || {},
        tags: options?.tags || {},
        user: options?.user,
        exception: {
          type: error.name,
          value: error.message,
          stacktrace: error.stack
        },
        request: options?.request,
        fingerprint: options?.fingerprint
      };
      
      // Report the error
      await this.errorReporter.reportError(errorEvent);
    }
  }

  /**
   * Captures a message and sends it to the error tracking and reporting services
   * 
   * @param {string} message - Message to capture
   * @param {Object} [options] - Additional options
   * @returns {Promise<void>}
   */
  async captureMessage(message: string, options?: any): Promise<void> {
    await this.errorTracker.captureMessage(message, options);
    
    // Create an error event for the reporter
    const errorEvent: ErrorEvent = {
      message,
      level: options?.level || ErrorLevel.INFO,
      timestamp: new Date().toISOString(),
      context: options?.context || {},
      tags: options?.tags || {},
      user: options?.user
    };
    
    // Report the error
    await this.errorReporter.reportError(errorEvent);
  }

  /**
   * Adds a breadcrumb to the error tracker
   * 
   * @param {Object} breadcrumb - Breadcrumb object
   * @returns {void}
   */
  addBreadcrumb(breadcrumb: {
    type: string;
    category: string;
    message: string;
    data?: Record<string, any>;
  }): void {
    this.errorTracker.addBreadcrumb(breadcrumb);
  }

  /**
   * Gets the error tracker instance
   * 
   * @returns {ErrorTracker} Error tracker instance
   */
  getErrorTracker(): ErrorTracker {
    return this.errorTracker;
  }

  /**
   * Gets the error reporter instance
   * 
   * @returns {ErrorReporter} Error reporter instance
   */
  getErrorReporter(): ErrorReporter {
    return this.errorReporter;
  }

  /**
   * Creates an Express middleware for error management
   * 
   * @returns {Function} Express middleware
   */
  expressMiddleware() {
    return this.errorTracker.expressMiddleware();
  }
}

export {
  ErrorTracker,
  ErrorReporter,
  ErrorEvent,
  ErrorLevel,
  ErrorTrackerOptions,
  ErrorReporterOptions
};