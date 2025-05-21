/**
 * API Gateway Types
 * @module api-gateway/types
 */

import { Request, Response, NextFunction, Router } from 'express';

/**
 * API route definition
 */
export interface ApiRoute {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'all';
  /** Route path (e.g., /users/:id) */
  path: string;
  /** Route handler function */
  handler: RouteHandler;
  /** Middleware functions to apply to this route */
  middleware?: RouteMiddleware[];
  /** Route metadata */
  metadata?: ApiRouteMetadata;
}

/**
 * API route handler function
 */
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

/**
 * API route middleware function
 */
export type RouteMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

/**
 * API route metadata
 */
export interface ApiRouteMetadata {
  /** Route name */
  name?: string;
  /** Route description */
  description?: string;
  /** Route version */
  version?: string;
  /** Route tags */
  tags?: string[];
  /** Whether the route is deprecated */
  deprecated?: boolean;
  /** Whether the route is public (no authentication required) */
  public?: boolean;
  /** Required permissions for this route */
  permissions?: string[];
  /** Rate limiting settings */
  rateLimit?: {
    /** Maximum number of requests */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
  };
  /** Request body schema */
  requestSchema?: any;
  /** Response schema */
  responseSchema?: any;
  /** Supported response formats */
  formats?: string[];
}

/**
 * API route registry interface
 */
export interface RouteRegistry {
  /** Register a route */
  register(route: ApiRoute): void;
  /** Unregister a route */
  unregister(method: string, path: string): void;
  /** Get all registered routes */
  getRoutes(): ApiRoute[];
  /** Get a specific route */
  getRoute(method: string, path: string): ApiRoute | undefined;
  /** Check if a route is registered */
  hasRoute(method: string, path: string): boolean;
  /** Get routes by tag */
  getRoutesByTag(tag: string): ApiRoute[];
  /** Get routes by version */
  getRoutesByVersion(version: string): ApiRoute[];
}

/**
 * API gateway interface
 */
export interface ApiGateway {
  /** Initialize the API gateway */
  initialize(): Promise<void>;
  /** Get the Express router */
  getRouter(): Router;
  /** Get the route registry */
  getRegistry(): RouteRegistry;
  /** Register a route */
  registerRoute(route: ApiRoute): void;
  /** Unregister a route */
  unregisterRoute(method: string, path: string): void;
  /** Register middleware to apply to all routes */
  registerMiddleware(middleware: RouteMiddleware): void;
  /** Register error handling middleware */
  registerErrorHandler(handler: ErrorHandler): void;
  /** Start the API gateway server */
  start(port: number): Promise<void>;
  /** Stop the API gateway server */
  stop(): Promise<void>;
}

/**
 * Error handler function
 */
export type ErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Authentication provider interface
 */
export interface AuthenticationProvider {
  /** Authenticate a request */
  authenticate(req: Request): Promise<boolean>;
  /** Get the current user from a request */
  getCurrentUser(req: Request): Promise<any>;
  /** Create middleware for authentication */
  createMiddleware(): RouteMiddleware;
}

/**
 * Authorization provider interface
 */
export interface AuthorizationProvider {
  /** Check if a user has permission to access a route */
  hasPermission(user: any, permission: string): Promise<boolean>;
  /** Create middleware for authorization */
  createMiddleware(permission: string): RouteMiddleware;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /** Create middleware for rate limiting */
  createMiddleware(options: {
    /** Maximum number of requests */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Key generator function */
    keyGenerator?: (req: Request) => string;
  }): RouteMiddleware;
}

/**
 * Documentation generator interface
 */
export interface DocumentationGenerator {
  /** Generate API documentation */
  generate(): Promise<any>;
  /** Get middleware for serving documentation */
  getMiddleware(): RouteMiddleware;
}

/**
 * API monitoring interface
 */
export interface ApiMonitoring {
  /** Start monitoring */
  start(): void;
  /** Stop monitoring */
  stop(): void;
  /** Get middleware for monitoring */
  getMiddleware(): RouteMiddleware;
  /** Get metrics */
  getMetrics(): Promise<any>;
}

/**
 * API gateway configuration
 */
export interface ApiGatewayConfig {
  /** Base path for all routes */
  basePath?: string;
  /** Whether to enable CORS */
  corsEnabled?: boolean;
  /** CORS options */
  corsOptions?: any;
  /** Whether to enable compression */
  compressionEnabled?: boolean;
  /** Whether to enable request logging */
  loggingEnabled?: boolean;
  /** Whether to enable body parsing */
  bodyParsingEnabled?: boolean;
  /** Whether to enable security headers */
  securityEnabled?: boolean;
  /** Whether to enable rate limiting */
  rateLimitingEnabled?: boolean;
  /** Default rate limiting options */
  rateLimitingOptions?: {
    /** Maximum number of requests */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
  };
  /** Whether to enable API documentation */
  documentationEnabled?: boolean;
  /** Documentation options */
  documentationOptions?: {
    /** Title of the API */
    title: string;
    /** Description of the API */
    description?: string;
    /** Version of the API */
    version: string;
    /** API server URL */
    serverUrl: string;
  };
  /** Whether to enable authentication */
  authenticationEnabled?: boolean;
  /** Authentication provider */
  authenticationProvider?: AuthenticationProvider;
  /** Whether to enable authorization */
  authorizationEnabled?: boolean;
  /** Authorization provider */
  authorizationProvider?: AuthorizationProvider;
  /** Whether to enable monitoring */
  monitoringEnabled?: boolean;
  /** Monitoring provider */
  monitoringProvider?: ApiMonitoring;
  /** Whether to enable multi-tenant support */
  multiTenantEnabled?: boolean;
  /** Whether to enable versioning */
  versioningEnabled?: boolean;
  /** Versioning options */
  versioningOptions?: {
    /** Default version */
    defaultVersion: string;
    /** Version header name */
    versionHeader?: string;
    /** Version query parameter name */
    versionQueryParam?: string;
    /** Version path parameter name */
    versionPathParam?: string;
    /** Version format (e.g., v1, v1.0, etc.) */
    versionFormat?: string;
  };
}