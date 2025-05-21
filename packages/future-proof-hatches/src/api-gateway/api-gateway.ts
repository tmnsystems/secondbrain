/**
 * API Gateway
 * @module api-gateway/api-gateway
 */

import { EventEmitter } from 'events';
import * as express from 'express';
import { Express, Router, Request, Response, NextFunction } from 'express';
import * as http from 'http';
import {
  ApiGateway,
  ApiGatewayConfig,
  ApiRoute,
  RouteRegistry,
  RouteMiddleware,
  ErrorHandler
} from './types';
import { RouteRegistryImpl, RouteRegistryEvents } from './route-registry';
import {
  createAuthenticationMiddleware,
  createAuthorizationMiddleware,
  createRateLimitingMiddleware,
  createValidationMiddleware,
  createLoggingMiddleware,
  createErrorHandlingMiddleware,
  createCorsMiddleware,
  createSecurityHeadersMiddleware,
  createTenantIsolationMiddleware,
  createVersioningMiddleware
} from './middleware';

/**
 * Events emitted by the ApiGatewayImpl
 */
export enum ApiGatewayEvents {
  INITIALIZED = 'api-gateway:initialized',
  STARTED = 'api-gateway:started',
  STOPPED = 'api-gateway:stopped',
  ROUTE_REGISTERED = 'api-gateway:route:registered',
  ROUTE_UNREGISTERED = 'api-gateway:route:unregistered',
  MIDDLEWARE_REGISTERED = 'api-gateway:middleware:registered',
  ERROR_HANDLER_REGISTERED = 'api-gateway:error-handler:registered',
}

/**
 * Implementation of the ApiGateway interface
 */
export class ApiGatewayImpl implements ApiGateway {
  private registry: RouteRegistry;
  private app: Express;
  private router: Router;
  private server: http.Server | null;
  private events: EventEmitter;
  private config: ApiGatewayConfig;
  private logger: any;
  private middleware: RouteMiddleware[];
  private errorHandlers: ErrorHandler[];
  private initialized: boolean;

  /**
   * Create a new ApiGatewayImpl
   * @param config API gateway configuration
   * @param registry Optional route registry
   * @param logger Optional logger
   */
  constructor(
    config: ApiGatewayConfig = {},
    registry?: RouteRegistry,
    logger?: any
  ) {
    this.config = config;
    this.registry = registry || new RouteRegistryImpl();
    this.logger = logger || console;
    this.app = express();
    this.router = express.Router();
    this.server = null;
    this.events = new EventEmitter();
    this.middleware = [];
    this.errorHandlers = [];
    this.initialized = false;

    // Subscribe to registry events
    this.subscribeToRegistryEvents();
  }

  /**
   * Initialize the API gateway
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Apply global middleware
    this.applyGlobalMiddleware();

    // Apply routes
    this.applyRoutes();

    // Apply error handlers
    this.applyErrorHandlers();

    this.initialized = true;
    this.events.emit(ApiGatewayEvents.INITIALIZED);
  }

  /**
   * Get the Express router
   * @returns The Express router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get the route registry
   * @returns The route registry
   */
  getRegistry(): RouteRegistry {
    return this.registry;
  }

  /**
   * Register a route
   * @param route The route to register
   */
  registerRoute(route: ApiRoute): void {
    this.registry.register(route);
    this.events.emit(ApiGatewayEvents.ROUTE_REGISTERED, route);

    // If already initialized, apply the route immediately
    if (this.initialized) {
      this.applyRoute(route);
    }
  }

  /**
   * Unregister a route
   * @param method The HTTP method
   * @param path The route path
   */
  unregisterRoute(method: string, path: string): void {
    const route = this.registry.getRoute(method, path);
    
    if (route) {
      this.registry.unregister(method, path);
      this.events.emit(ApiGatewayEvents.ROUTE_UNREGISTERED, route);
      
      // Note: Express doesn't provide a direct way to remove routes,
      // so we would need to rebuild the router in a real implementation
    }
  }

  /**
   * Register middleware to apply to all routes
   * @param middleware The middleware function
   */
  registerMiddleware(middleware: RouteMiddleware): void {
    this.middleware.push(middleware);
    this.events.emit(ApiGatewayEvents.MIDDLEWARE_REGISTERED, middleware);
    
    // If already initialized, apply the middleware immediately
    if (this.initialized) {
      this.router.use(middleware);
    }
  }

  /**
   * Register error handling middleware
   * @param handler The error handler function
   */
  registerErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
    this.events.emit(ApiGatewayEvents.ERROR_HANDLER_REGISTERED, handler);
    
    // If already initialized, apply the error handler immediately
    if (this.initialized) {
      this.app.use(handler);
    }
  }

  /**
   * Start the API gateway server
   * @param port The port to listen on
   * @returns Promise resolving when the server starts
   */
  async start(port: number): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise<void>((resolve, reject) => {
      // Attach the router to the app
      const basePath = this.config.basePath || '/api';
      this.app.use(basePath, this.router);
      
      // Start the server
      this.server = this.app.listen(port, () => {
        this.logger.info(`API Gateway server started on port ${port}`);
        this.events.emit(ApiGatewayEvents.STARTED, port);
        resolve();
      });
      
      this.server.on('error', (error) => {
        this.logger.error(`Failed to start API Gateway server: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Stop the API gateway server
   * @returns Promise resolving when the server stops
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((error) => {
        if (error) {
          this.logger.error(`Failed to stop API Gateway server: ${error.message}`);
          reject(error);
          return;
        }
        
        this.logger.info('API Gateway server stopped');
        this.events.emit(ApiGatewayEvents.STOPPED);
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Subscribe to registry events
   */
  private subscribeToRegistryEvents(): void {
    if (this.registry instanceof RouteRegistryImpl) {
      (this.registry as RouteRegistryImpl).on(
        RouteRegistryEvents.ROUTE_REGISTERED,
        (route: ApiRoute) => {
          // If already initialized, apply the route immediately
          if (this.initialized) {
            this.applyRoute(route);
          }
        }
      );
    }
  }

  /**
   * Apply global middleware
   */
  private applyGlobalMiddleware(): void {
    // Apply body parsing middleware
    if (this.config.bodyParsingEnabled !== false) {
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));
    }
    
    // Apply CORS middleware
    if (this.config.corsEnabled !== false) {
      this.app.use(createCorsMiddleware(this.config.corsOptions));
    }
    
    // Apply security headers middleware
    if (this.config.securityEnabled !== false) {
      this.app.use(createSecurityHeadersMiddleware());
    }
    
    // Apply logging middleware
    if (this.config.loggingEnabled !== false) {
      this.app.use(createLoggingMiddleware(this.logger));
    }
    
    // Apply versioning middleware
    if (this.config.versioningEnabled !== false) {
      this.app.use(
        createVersioningMiddleware(
          this.config.versioningOptions || { defaultVersion: '1' }
        )
      );
    }
    
    // Apply multi-tenant middleware
    if (this.config.multiTenantEnabled !== false) {
      this.app.use(createTenantIsolationMiddleware());
    }
    
    // Apply custom middleware
    for (const middleware of this.middleware) {
      this.router.use(middleware);
    }
    
    // Apply monitoring middleware
    if (this.config.monitoringEnabled !== false && this.config.monitoringProvider) {
      this.app.use(this.config.monitoringProvider.getMiddleware());
    }
    
    // Apply documentation middleware
    if (this.config.documentationEnabled !== false && this.config.documentationOptions) {
      // This would typically use a library like Swagger/OpenAPI
    }
  }

  /**
   * Apply routes
   */
  private applyRoutes(): void {
    const routes = this.registry.getRoutes();
    
    for (const route of routes) {
      this.applyRoute(route);
    }
  }

  /**
   * Apply a route
   * @param route The route to apply
   */
  private applyRoute(route: ApiRoute): void {
    const { method, path, handler, middleware = [], metadata = {} } = route;
    
    // Build middleware stack
    const middlewareStack: RouteMiddleware[] = [];
    
    // Add route-specific middleware
    middlewareStack.push(...middleware);
    
    // Add authentication middleware if required
    if (
      this.config.authenticationEnabled !== false &&
      this.config.authenticationProvider &&
      metadata.public !== true
    ) {
      middlewareStack.push(
        createAuthenticationMiddleware(this.config.authenticationProvider)
      );
    }
    
    // Add authorization middleware if required
    if (
      this.config.authorizationEnabled !== false &&
      this.config.authorizationProvider &&
      metadata.permissions &&
      metadata.permissions.length > 0
    ) {
      for (const permission of metadata.permissions) {
        middlewareStack.push(
          createAuthorizationMiddleware(this.config.authorizationProvider, permission)
        );
      }
    }
    
    // Add rate limiting middleware if required
    if (
      this.config.rateLimitingEnabled !== false &&
      (metadata.rateLimit || this.config.rateLimitingOptions)
    ) {
      const rateLimitOptions = metadata.rateLimit || this.config.rateLimitingOptions;
      
      if (rateLimitOptions) {
        // This would typically use a library like express-rate-limit
      }
    }
    
    // Add validation middleware if required
    if (metadata.requestSchema) {
      middlewareStack.push(createValidationMiddleware(metadata.requestSchema));
    }
    
    // Register the route with Express
    (this.router as any)[method](path, ...middlewareStack, handler);
  }

  /**
   * Apply error handlers
   */
  private applyErrorHandlers(): void {
    // Apply custom error handlers
    for (const handler of this.errorHandlers) {
      this.app.use(handler);
    }
    
    // Apply default error handler
    this.app.use(createErrorHandlingMiddleware(this.logger));
  }

  /**
   * Subscribe to API gateway events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: ApiGatewayEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from API gateway events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: ApiGatewayEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}