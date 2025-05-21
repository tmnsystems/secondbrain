import winston from 'winston';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Whether to log to console */
  console?: boolean;
  /** File to log to (if any) */
  file?: string;
  /** Service name for the logs */
  service?: string;
}

/**
 * Creates a new logger instance
 */
export function createLogger(config: LoggerConfig = {}) {
  const {
    level = 'info',
    console = true,
    file,
    service = 'secondbrain'
  } = config;

  const transports: winston.transport[] = [];

  // Add console transport if enabled
  if (console) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            return `${timestamp} [${service}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          })
        ),
      })
    );
  }

  // Add file transport if provided
  if (file) {
    transports.push(
      new winston.transports.File({
        filename: file,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  // Create and return logger instance
  return winston.createLogger({
    level,
    defaultMeta: { service },
    transports,
  });
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Creates a child logger with additional metadata
 * @param namespace The namespace for the logger
 * @param metadata Additional metadata
 */
export function getNamespacedLogger(namespace: string, metadata: Record<string, any> = {}) {
  return logger.child({
    namespace,
    ...metadata,
  });
}