/**
 * Route Registry
 * @module api-gateway/route-registry
 */

import { EventEmitter } from 'events';
import { ApiRoute, RouteRegistry } from './types';

/**
 * Events emitted by the RouteRegistryImpl
 */
export enum RouteRegistryEvents {
  ROUTE_REGISTERED = 'route:registered',
  ROUTE_UNREGISTERED = 'route:unregistered',
}

/**
 * Implementation of the RouteRegistry interface
 */
export class RouteRegistryImpl implements RouteRegistry {
  private routes: Map<string, ApiRoute>;
  private events: EventEmitter;

  /**
   * Create a new RouteRegistryImpl
   */
  constructor() {
    this.routes = new Map();
    this.events = new EventEmitter();
  }

  /**
   * Register a route
   * @param route The route to register
   */
  register(route: ApiRoute): void {
    const key = this.getRouteKey(route.method, route.path);
    
    if (this.routes.has(key)) {
      throw new Error(`Route ${route.method.toUpperCase()} ${route.path} is already registered`);
    }
    
    this.routes.set(key, route);
    this.events.emit(RouteRegistryEvents.ROUTE_REGISTERED, route);
  }

  /**
   * Unregister a route
   * @param method The HTTP method
   * @param path The route path
   */
  unregister(method: string, path: string): void {
    const key = this.getRouteKey(method, path);
    
    if (!this.routes.has(key)) {
      throw new Error(`Route ${method.toUpperCase()} ${path} is not registered`);
    }
    
    const route = this.routes.get(key)!;
    this.routes.delete(key);
    this.events.emit(RouteRegistryEvents.ROUTE_UNREGISTERED, route);
  }

  /**
   * Get all registered routes
   * @returns Array of registered routes
   */
  getRoutes(): ApiRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get a specific route
   * @param method The HTTP method
   * @param path The route path
   * @returns The route or undefined if not found
   */
  getRoute(method: string, path: string): ApiRoute | undefined {
    const key = this.getRouteKey(method, path);
    return this.routes.get(key);
  }

  /**
   * Check if a route is registered
   * @param method The HTTP method
   * @param path The route path
   * @returns Whether the route is registered
   */
  hasRoute(method: string, path: string): boolean {
    const key = this.getRouteKey(method, path);
    return this.routes.has(key);
  }

  /**
   * Get routes by tag
   * @param tag The tag to filter by
   * @returns Array of routes with the specified tag
   */
  getRoutesByTag(tag: string): ApiRoute[] {
    return this.getRoutes().filter(route => {
      return route.metadata?.tags?.includes(tag) || false;
    });
  }

  /**
   * Get routes by version
   * @param version The version to filter by
   * @returns Array of routes with the specified version
   */
  getRoutesByVersion(version: string): ApiRoute[] {
    return this.getRoutes().filter(route => {
      return route.metadata?.version === version;
    });
  }

  /**
   * Subscribe to registry events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: RouteRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from registry events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: RouteRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }

  /**
   * Get a unique key for a route
   * @param method The HTTP method
   * @param path The route path
   * @returns The route key
   */
  private getRouteKey(method: string, path: string): string {
    return `${method.toLowerCase()}:${path}`;
  }
}