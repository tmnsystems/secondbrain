import axios from 'axios';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logging/logger';

/**
 * Error tracking levels
 */
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Interface for error event
 */
export interface ErrorEvent {
  message: string;
  level: ErrorLevel;
  timestamp: string;
  context?: Record<string, any>;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  exception?: {
    type?: string;
    value?: string;
    stacktrace?: string;
  };
  breadcrumbs?: {
    type: string;
    category: string;
    message: string;
    timestamp: string;
    data?: Record<string, any>;
  }[];
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    query?: Record<string, string>;
  };
  fingerprint?: string[];
}

/**
 * Interface for error tracker options
 */
export interface ErrorTrackerOptions {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  release?: string;
  dsn?: string;
  sampleRate?: number;
  maxBreadcrumbs?: number;
  captureCodeContext?: boolean;
  captureUnhandledRejections?: boolean;
  captureUncaughtExceptions?: boolean;
  logger?: Logger;
}

/**
 * Error tracker service for tracking and reporting errors
 */
export class ErrorTracker {
  private options: ErrorTrackerOptions;
  private logger: Logger;
  private breadcrumbs: any[] = [];
  private lastError: Error | null = null;
  private errorCache: Map<string, number> = new Map();
  private hostname: string;
  private reportEndpoint: string | null = null;

  /**
   * Creates a new error tracker instance
   * 
   * @param {ErrorTrackerOptions} options - Error tracker options
   */
  constructor(options: ErrorTrackerOptions) {
    this.options = {
      serviceName: 'unknown',
      serviceVersion: '1.0.0',
      environment: 'development',
      sampleRate: 1.0,
      maxBreadcrumbs: 100,
      captureCodeContext: true,
      captureUnhandledRejections: true,
      captureUncaughtExceptions: true,
      ...options
    };

    this.logger = options.logger || new Logger({ service: this.options.serviceName });
    this.hostname = os.hostname();

    if (this.options.dsn) {
      this.reportEndpoint = this.extractEndpointFromDsn(this.options.dsn);
    }

    // Set up global error handlers
    this.setupGlobalHandlers();

    this.logger.info('Error tracker initialized', {
      serviceName: this.options.serviceName,
      serviceVersion: this.options.serviceVersion,
      environment: this.options.environment
    });
  }

  /**
   * Extracts the reporting endpoint from the DSN
   * 
   * @param {string} dsn - Data Source Name (DSN)
   * @returns {string} Reporting endpoint
   * @private
   */
  private extractEndpointFromDsn(dsn: string): string {
    try {
      const parsedDsn = new URL(dsn);
      const projectId = parsedDsn.pathname.split('/').pop();
      return `${parsedDsn.protocol}//${parsedDsn.host}/api/${projectId}/store/`;
    } catch (error) {
      this.logger.error('Invalid DSN format', { dsn, error });
      return '';
    }
  }

  /**
   * Sets up global error handlers
   * @private
   */
  private setupGlobalHandlers(): void {
    if (this.options.captureUncaughtExceptions) {
      process.on('uncaughtException', (error) => {
        this.captureException(error, { level: ErrorLevel.FATAL });
        
        // Don't exit the process, just log it
        this.logger.error('Uncaught exception', { error });
      });
    }

    if (this.options.captureUnhandledRejections) {
      process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.captureException(error, { level: ErrorLevel.ERROR });
        
        // Don't exit the process, just log it
        this.logger.error('Unhandled rejection', { error });
      });
    }
  }

  /**
   * Adds a breadcrumb to the breadcrumb trail
   * 
   * @param {Object} breadcrumb - Breadcrumb object
   * @param {string} breadcrumb.type - Breadcrumb type (e.g., 'http', 'user', 'navigation')
   * @param {string} breadcrumb.category - Breadcrumb category
   * @param {string} breadcrumb.message - Breadcrumb message
   * @param {Object} [breadcrumb.data] - Additional data
   * @returns {void}
   */
  addBreadcrumb(breadcrumb: {
    type: string;
    category: string;
    message: string;
    data?: Record<string, any>;
  }): void {
    // Ensure breadcrumbs array doesn't exceed max size
    if (this.breadcrumbs.length >= (this.options.maxBreadcrumbs || 100)) {
      this.breadcrumbs.shift();
    }

    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Captures an exception and sends it to the error tracking service
   * 
   * @param {Error} error - Error object
   * @param {Object} [options] - Additional options
   * @param {ErrorLevel} [options.level] - Error level
   * @param {Record<string, any>} [options.context] - Additional context
   * @param {Record<string, string>} [options.tags] - Error tags
   * @param {Object} [options.user] - User information
   * @param {Object} [options.request] - Request information
   * @param {string[]} [options.fingerprint] - Error fingerprint
   * @returns {Promise<void>}
   */
  async captureException(
    error: Error,
    options?: {
      level?: ErrorLevel;
      context?: Record<string, any>;
      tags?: Record<string, string>;
      user?: {
        id?: string;
        email?: string;
        username?: string;
      };
      request?: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        params?: Record<string, string>;
        query?: Record<string, string>;
      };
      fingerprint?: string[];
    }
  ): Promise<void> {
    this.lastError = error;
    
    // Create error event
    const errorEvent: ErrorEvent = {
      message: error.message,
      level: options?.level || ErrorLevel.ERROR,
      timestamp: new Date().toISOString(),
      context: options?.context || {},
      tags: {
        ...options?.tags,
        service: this.options.serviceName,
        version: this.options.serviceVersion,
        environment: this.options.environment,
        hostname: this.hostname
      },
      user: options?.user,
      exception: {
        type: error.name,
        value: error.message,
        stacktrace: error.stack
      },
      breadcrumbs: [...this.breadcrumbs],
      request: options?.request,
      fingerprint: options?.fingerprint || [error.name, error.message]
    };

    // Apply sampling
    if (Math.random() > (this.options.sampleRate || 1.0)) {
      this.logger.debug('Error sampled out', { errorEvent });
      return;
    }

    // Add code context if enabled
    if (this.options.captureCodeContext) {
      this.addCodeContext(errorEvent, error);
    }

    // Apply rate limiting using fingerprint
    const fingerprint = this.getErrorFingerprint(errorEvent);
    const now = Date.now();
    const lastSeen = this.errorCache.get(fingerprint) || 0;
    
    if (now - lastSeen < 60000) { // 1 minute rate limit
      this.logger.debug('Error rate limited', { fingerprint });
      return;
    }
    
    this.errorCache.set(fingerprint, now);

    // Log the error
    this.logger.error('Error captured', {
      message: error.message,
      stack: error.stack,
      context: options?.context
    });

    // Send to error tracking service if DSN is provided
    if (this.reportEndpoint) {
      try {
        await this.sendErrorEvent(errorEvent);
      } catch (sendError) {
        this.logger.error('Failed to send error to tracking service', { sendError });
      }
    }

    // Write to local file
    this.writeErrorToFile(errorEvent);
  }

  /**
   * Captures a message and sends it to the error tracking service
   * 
   * @param {string} message - Message to capture
   * @param {Object} [options] - Additional options
   * @param {ErrorLevel} [options.level] - Error level
   * @param {Record<string, any>} [options.context] - Additional context
   * @param {Record<string, string>} [options.tags] - Error tags
   * @param {Object} [options.user] - User information
   * @returns {Promise<void>}
   */
  async captureMessage(
    message: string,
    options?: {
      level?: ErrorLevel;
      context?: Record<string, any>;
      tags?: Record<string, string>;
      user?: {
        id?: string;
        email?: string;
        username?: string;
      };
    }
  ): Promise<void> {
    // Create error event
    const errorEvent: ErrorEvent = {
      message,
      level: options?.level || ErrorLevel.INFO,
      timestamp: new Date().toISOString(),
      context: options?.context || {},
      tags: {
        ...options?.tags,
        service: this.options.serviceName,
        version: this.options.serviceVersion,
        environment: this.options.environment,
        hostname: this.hostname
      },
      user: options?.user,
      breadcrumbs: [...this.breadcrumbs]
    };

    // Apply sampling
    if (Math.random() > (this.options.sampleRate || 1.0)) {
      this.logger.debug('Message sampled out', { errorEvent });
      return;
    }

    // Log the message
    this.logger.log(options?.level || 'info', message, {
      context: options?.context
    });

    // Send to error tracking service if DSN is provided
    if (this.reportEndpoint) {
      try {
        await this.sendErrorEvent(errorEvent);
      } catch (sendError) {
        this.logger.error('Failed to send message to tracking service', { sendError });
      }
    }

    // Write to local file for info level and above
    if (
      errorEvent.level === ErrorLevel.INFO ||
      errorEvent.level === ErrorLevel.WARNING ||
      errorEvent.level === ErrorLevel.ERROR ||
      errorEvent.level === ErrorLevel.FATAL
    ) {
      this.writeErrorToFile(errorEvent);
    }
  }

  /**
   * Gets the last error captured
   * @returns {Error | null} Last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Clears all breadcrumbs
   * @returns {void}
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Gets a unique fingerprint for an error event
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {string} Error fingerprint
   * @private
   */
  private getErrorFingerprint(errorEvent: ErrorEvent): string {
    if (errorEvent.fingerprint && errorEvent.fingerprint.length > 0) {
      return errorEvent.fingerprint.join('|');
    }

    return `${errorEvent.exception?.type}|${errorEvent.message}`;
  }

  /**
   * Adds code context to an error event
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @param {Error} error - Error object
   * @private
   */
  private addCodeContext(errorEvent: ErrorEvent, error: Error): void {
    if (!error.stack) {
      return;
    }

    // Parse the stack trace to find the file and line number
    const stackLines = error.stack.split('\n');
    for (const line of stackLines) {
      const match = line.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/);
      if (!match) continue;

      const [, functionName, filePath, lineNumber, columnNumber] = match;
      
      if (!filePath || !lineNumber) continue;
      
      try {
        // Skip node_modules and built-in modules
        if (filePath.includes('node_modules') || !filePath.startsWith('/')) {
          continue;
        }

        // Read the file and extract the lines around the error
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');
        const errorLine = parseInt(lineNumber, 10) - 1;

        // Get a window of code around the error
        const startLine = Math.max(0, errorLine - 5);
        const endLine = Math.min(lines.length - 1, errorLine + 5);
        const codeContext: Record<number, string> = {};

        for (let i = startLine; i <= endLine; i++) {
          codeContext[i + 1] = lines[i];
        }

        // Add code context to the error event
        if (!errorEvent.context) {
          errorEvent.context = {};
        }

        errorEvent.context.codeContext = {
          filePath,
          lineNumber: parseInt(lineNumber, 10),
          columnNumber: columnNumber ? parseInt(columnNumber, 10) : undefined,
          functionName,
          code: codeContext
        };

        break;
      } catch (readError) {
        this.logger.debug('Failed to read file for code context', { readError });
      }
    }
  }

  /**
   * Sends an error event to the error tracking service
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {Promise<void>}
   * @private
   */
  private async sendErrorEvent(errorEvent: ErrorEvent): Promise<void> {
    if (!this.reportEndpoint) {
      return;
    }

    try {
      await axios.post(this.reportEndpoint, errorEvent, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.debug('Error sent to tracking service', {
        message: errorEvent.message,
        level: errorEvent.level
      });
    } catch (error) {
      this.logger.error('Failed to send error to tracking service', { error });
    }
  }

  /**
   * Writes an error event to a local file
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @private
   */
  private writeErrorToFile(errorEvent: ErrorEvent): void {
    try {
      const logsDir = path.join(process.cwd(), 'logs', 'errors');
      
      // Ensure the logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Create a filename based on the date
      const date = new Date();
      const filename = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.log`;
      const filePath = path.join(logsDir, filename);

      // Append to the file
      fs.appendFileSync(
        filePath,
        `${JSON.stringify(errorEvent)}\n`,
        'utf8'
      );
    } catch (error) {
      this.logger.error('Failed to write error to file', { error });
    }
  }

  /**
   * Creates an Express middleware for error tracking
   * 
   * @returns {Function} Express middleware
   */
  expressMiddleware() {
    return (req: any, res: any, next: any) => {
      // Add a breadcrumb for the request
      this.addBreadcrumb({
        type: 'http',
        category: 'request',
        message: `${req.method} ${req.path}`,
        data: {
          method: req.method,
          url: req.url,
          query: req.query,
          headers: this.sanitizeHeaders(req.headers)
        }
      });

      // Track response
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        // Add a breadcrumb for the response
        this.addBreadcrumb({
          type: 'http',
          category: 'response',
          message: `${res.statusCode} ${req.method} ${req.path}`,
          data: {
            statusCode: res.statusCode,
            headers: this.sanitizeHeaders(res.getHeaders ? res.getHeaders() : {})
          }
        });

        // Capture errors for 5xx responses
        if (res.statusCode >= 500) {
          this.captureMessage(`Server Error: ${res.statusCode} ${req.method} ${req.path}`, {
            level: ErrorLevel.ERROR,
            context: {
              request: {
                method: req.method,
                url: req.url,
                query: req.query,
                headers: this.sanitizeHeaders(req.headers),
                body: this.sanitizeBody(req.body)
              },
              response: {
                statusCode: res.statusCode,
                headers: this.sanitizeHeaders(res.getHeaders ? res.getHeaders() : {})
              }
            }
          });
        }

        originalEnd.apply(res, args);
      };

      // Handle errors
      const errorHandler = (err: Error) => {
        this.captureException(err, {
          level: ErrorLevel.ERROR,
          request: {
            url: req.url,
            method: req.method,
            headers: this.sanitizeHeaders(req.headers),
            params: req.params,
            query: req.query
          }
        });
      };

      // Track domain errors
      if (process.domain) {
        process.domain.on('error', errorHandler);
      }

      next();
    };
  }

  /**
   * Sanitizes request/response headers by removing sensitive information
   * 
   * @param {Record<string, any>} headers - Headers object
   * @returns {Record<string, any>} Sanitized headers
   * @private
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      // Skip sensitive headers
      if (
        key.toLowerCase() === 'authorization' ||
        key.toLowerCase() === 'cookie' ||
        key.toLowerCase() === 'set-cookie' ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('passwd')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitizes request body by removing sensitive information
   * 
   * @param {any} body - Request body
   * @returns {any} Sanitized body
   * @private
   */
  private sanitizeBody(body: any): any {
    if (!body) {
      return body;
    }

    if (typeof body !== 'object') {
      return body;
    }

    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(body)) {
      // Skip sensitive fields
      if (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('passwd') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('auth') ||
        key.toLowerCase().includes('credential')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}