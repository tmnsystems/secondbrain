/**
 * API Gateway Middleware
 * @module api-gateway/middleware
 */

import { Request, Response, NextFunction } from 'express';
import { RouteMiddleware, AuthenticationProvider, AuthorizationProvider, RateLimiter } from './types';

/**
 * Create middleware for authentication
 * @param provider The authentication provider
 * @returns Authentication middleware
 */
export function createAuthenticationMiddleware(provider: AuthenticationProvider): RouteMiddleware {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAuthenticated = await provider.authenticate(req);
      
      if (!isAuthenticated) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create middleware for authorization
 * @param provider The authorization provider
 * @param permission The required permission
 * @returns Authorization middleware
 */
export function createAuthorizationMiddleware(
  provider: AuthorizationProvider,
  permission: string
): RouteMiddleware {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }
      
      const hasPermission = await provider.hasPermission(user, permission);
      
      if (!hasPermission) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Permission ${permission} required`
        });
        return;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create middleware for rate limiting
 * @param limiter The rate limiter
 * @param options Rate limiting options
 * @returns Rate limiting middleware
 */
export function createRateLimitingMiddleware(
  limiter: RateLimiter,
  options: {
    max: number;
    windowMs: number;
    keyGenerator?: (req: Request) => string;
  }
): RouteMiddleware {
  return limiter.createMiddleware(options);
}

/**
 * Create middleware for request validation
 * @param schema The request schema
 * @returns Request validation middleware
 */
export function createValidationMiddleware(schema: any): RouteMiddleware {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real implementation, this would use a validation library like Joi, Yup, or Zod
      // For simplicity, we're using a placeholder implementation
      
      const errors: string[] = [];
      
      // Validate request body if schema has a body property
      if (schema.body && req.body) {
        // Validate body
      }
      
      // Validate request params if schema has a params property
      if (schema.params && req.params) {
        // Validate params
      }
      
      // Validate request query if schema has a query property
      if (schema.query && req.query) {
        // Validate query
      }
      
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid request data',
          errors
        });
        return;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create middleware for request logging
 * @param logger The logger instance
 * @returns Request logging middleware
 */
export function createLoggingMiddleware(logger: any): RouteMiddleware {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Log the request
    logger.info({
      type: 'request',
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log the response when it's sent
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info({
        type: 'response',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        ip: req.ip
      });
    });
    
    next();
  };
}

/**
 * Create middleware for error handling
 * @param logger The logger instance
 * @returns Error handling middleware
 */
export function createErrorHandlingMiddleware(logger: any): RouteMiddleware {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error({
      type: 'error',
      method: req.method,
      url: req.url,
      error: err.message,
      stack: err.stack,
      ip: req.ip
    });
    
    // Determine the status code
    const statusCode = err.statusCode || 500;
    
    // Send the error response
    res.status(statusCode).json({
      error: err.name || 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
      // Only include the stack trace in development
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };
}

/**
 * Create middleware for CORS
 * @param options CORS options
 * @returns CORS middleware
 */
export function createCorsMiddleware(options?: any): RouteMiddleware {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', options?.origin || '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      options?.methods || 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      options?.allowedHeaders || 'Content-Type, Authorization'
    );
    res.setHeader('Access-Control-Allow-Credentials', options?.credentials || 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    next();
  };
}

/**
 * Create middleware for security headers
 * @returns Security headers middleware
 */
export function createSecurityHeadersMiddleware(): RouteMiddleware {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Feature-Policy', "camera 'none'; microphone 'none'");
    
    next();
  };
}

/**
 * Create middleware for tenant isolation
 * @returns Tenant isolation middleware
 */
export function createTenantIsolationMiddleware(): RouteMiddleware {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get the tenant ID from the request
    const tenantId = req.get('X-Tenant-ID') || req.query.tenantId;
    
    if (!tenantId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Tenant ID is required'
      });
      return;
    }
    
    // Set the tenant ID in the request
    (req as any).tenantId = tenantId;
    
    next();
  };
}

/**
 * Create middleware for versioning
 * @param options Versioning options
 * @returns Versioning middleware
 */
export function createVersioningMiddleware(options: {
  defaultVersion: string;
  versionHeader?: string;
  versionQueryParam?: string;
  versionPathParam?: string;
  versionFormat?: string;
}): RouteMiddleware {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get the version from the request
    let version = options.defaultVersion;
    
    if (options.versionHeader && req.get(options.versionHeader)) {
      version = req.get(options.versionHeader) || version;
    } else if (options.versionQueryParam && req.query[options.versionQueryParam]) {
      version = req.query[options.versionQueryParam] as string || version;
    } else if (options.versionPathParam && req.params[options.versionPathParam]) {
      version = req.params[options.versionPathParam] || version;
    }
    
    // Format the version if necessary
    if (options.versionFormat && version) {
      // Apply formatting (e.g., add 'v' prefix)
      if (options.versionFormat === 'v' && !version.startsWith('v')) {
        version = `v${version}`;
      }
    }
    
    // Set the version in the request
    (req as any).version = version;
    
    next();
  };
}