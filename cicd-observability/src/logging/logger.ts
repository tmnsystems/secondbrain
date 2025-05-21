/**
 * Logging System
 * 
 * This module provides centralized logging functionality with multiple 
 * transport targets, context enrichment, and integration with observability tools.
 */

import * as path from 'path';
import winston from 'winston';
import { LogEntry } from 'winston';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Log levels with numeric values for comparison
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  VERBOSE = 4,
  DEBUG = 5,
  SILLY = 6
}

// Interface for logger options
interface LoggerOptions {
  appName: string;
  environment: string;
  level: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  logDirectory?: string;
  maxFiles?: string;
  maxSize?: string;
  enableJson?: boolean;
  redactFields?: string[];
  defaultMeta?: Record<string, any>;
}

// Interface for request context logging
interface RequestContext {
  requestId: string;
  url: string;
  method: string;
  statusCode?: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  referer?: string;
  responseTime?: number;
  correlationId?: string;
}

// Class for managing logs with multiple transports
export class Logger {
  private logger: winston.Logger;
  private options: LoggerOptions;
  private requestMap: Map<string, RequestContext> = new Map();
  
  constructor(options: LoggerOptions) {
    this.options = {
      appName: 'secondbrain',
      environment: 'development',
      level: 'info',
      enableConsole: true,
      enableFile: false,
      logDirectory: 'logs',
      maxFiles: '14d',
      maxSize: '100m',
      enableJson: true,
      redactFields: ['password', 'token', 'secret', 'authorization', 'apiKey'],
      ...options
    };
    
    this.logger = this.createLogger();
  }
  
  // Create the winston logger instance
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];
    
    // Console transport
    if (this.options.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: this.options.enableJson
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, ...rest }) => {
                  const contextStr = Object.keys(rest).length > 0
                    ? ` ${JSON.stringify(rest)}`
                    : '';
                  
                  return `[${timestamp}] ${level}: ${message}${contextStr}`;
                })
              )
        })
      );
    }
    
    // File transport
    if (this.options.enableFile) {
      transports.push(
        new winston.transports.File({
          filename: path.join(this.options.logDirectory || 'logs', 'error.log'),
          level: 'error',
          maxFiles: this.options.maxFiles,
          maxsize: parseInt(this.options.maxSize || '104857600', 10),
          format: winston.format.json()
        }),
        new winston.transports.File({
          filename: path.join(this.options.logDirectory || 'logs', 'combined.log'),
          maxFiles: this.options.maxFiles,
          maxsize: parseInt(this.options.maxSize || '104857600', 10),
          format: winston.format.json()
        })
      );
    }
    
    return winston.createLogger({
      level: this.options.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format(this.redactSensitiveInfo)(),
        winston.format.json()
      ),
      defaultMeta: {
        service: this.options.appName,
        environment: this.options.environment,
        ...this.options.defaultMeta
      },
      transports
    });
  }
  
  // Redact sensitive information
  private redactSensitiveInfo = (info: LogEntry): LogEntry => {
    const redacted = { ...info };
    
    const redactField = (obj: any, field: string, replacement = '[REDACTED]') => {
      if (!obj) return;
      
      if (typeof obj === 'object') {
        for (const key in obj) {
          if (key.toLowerCase() === field.toLowerCase()) {
            obj[key] = replacement;
          } else if (typeof obj[key] === 'object') {
            redactField(obj[key], field, replacement);
          }
        }
      }
    };
    
    for (const field of this.options.redactFields || []) {
      redactField(redacted, field);
    }
    
    return redacted;
  };
  
  // Log methods for different levels
  public error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }
  
  public warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }
  
  public info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }
  
  public http(message: string, meta?: Record<string, any>): void {
    this.logger.http(message, meta);
  }
  
  public verbose(message: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, meta);
  }
  
  public debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }
  
  public silly(message: string, meta?: Record<string, any>): void {
    this.logger.silly(message, meta);
  }
  
  // Create a child logger with additional context
  public child(meta: Record<string, any>): Logger {
    const childOptions = { ...this.options, defaultMeta: { ...this.options.defaultMeta, ...meta } };
    return new Logger(childOptions);
  }
  
  // Express middleware for request logging
  public requestLogger() {
    return (req: Request, res: Response, next: Function) => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const correlationId = req.headers['x-correlation-id'] as string || requestId;
      const startTime = new Date().getTime();
      
      // Set headers for request tracking
      req.headers['x-request-id'] = requestId;
      req.headers['x-correlation-id'] = correlationId;
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Store request context for later use
      const requestContext: RequestContext = {
        requestId,
        correlationId,
        url: req.originalUrl || req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
        referer: req.headers.referer as string,
        userId: (req as any).user?.id
      };
      
      this.requestMap.set(requestId, requestContext);
      
      // Log the incoming request
      this.info('Request received', {
        request: {
          id: requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.socket.remoteAddress,
          correlationId
        }
      });
      
      // Log the response
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const responseTime = new Date().getTime() - startTime;
        const context = this.requestMap.get(requestId) || requestContext;
        
        context.statusCode = res.statusCode;
        context.responseTime = responseTime;
        
        // Remove the request context from the map
        this.requestMap.delete(requestId);
        
        // Log the response
        const logLevel = res.statusCode >= 500
          ? 'error'
          : res.statusCode >= 400
            ? 'warn'
            : 'info';
        
        this.logger[logLevel]('Request completed', {
          response: {
            id: requestId,
            statusCode: res.statusCode,
            responseTime,
            correlationId
          }
        });
        
        return originalEnd.apply(res, args);
      }.bind(this);
      
      next();
    };
  }
  
  // Add context to the request context
  public addRequestContext(requestId: string, context: Partial<RequestContext>): void {
    const existingContext = this.requestMap.get(requestId);
    
    if (existingContext) {
      this.requestMap.set(requestId, { ...existingContext, ...context });
    }
  }
  
  // Get the request context
  public getRequestContext(requestId: string): RequestContext | undefined {
    return this.requestMap.get(requestId);
  }
  
  // Create an error object with additional context
  public createError(message: string, details?: Record<string, any>): Error {
    const error = new Error(message);
    
    if (details) {
      Object.assign(error, details);
    }
    
    return error;
  }
  
  // Log an error with stack trace
  public logError(error: Error, meta?: Record<string, any>): void {
    this.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...meta
    });
  }
}

// Create a singleton logger instance
let defaultLogger: Logger | null = null;

// Get or create the default logger
export function getLogger(options?: Partial<LoggerOptions>): Logger {
  if (!defaultLogger) {
    const defaultOptions: LoggerOptions = {
      appName: process.env.APP_NAME || 'secondbrain',
      environment: process.env.NODE_ENV || 'development',
      level: process.env.LOG_LEVEL || 'info',
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      logDirectory: process.env.LOG_DIRECTORY || 'logs',
      enableJson: process.env.NODE_ENV === 'production',
      ...options
    };
    
    defaultLogger = new Logger(defaultOptions);
  } else if (options) {
    // Create a child logger with the provided options
    return defaultLogger.child(options);
  }
  
  return defaultLogger;
}