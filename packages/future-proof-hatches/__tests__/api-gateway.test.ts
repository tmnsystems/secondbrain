/**
 * Tests for API Gateway
 */

import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import {
  ApiGatewayImpl,
  RouteRegistryImpl,
  ApiRoute,
  RouteRegistryEvents,
  ApiGatewayEvents
} from '../src/api-gateway';

// Mock express
jest.mock('express', () => {
  const mockRouter = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    options: jest.fn(),
    head: jest.fn(),
    all: jest.fn(),
    use: jest.fn()
  };
  
  const mockApp = {
    use: jest.fn(),
    listen: jest.fn().mockImplementation((port, cb) => {
      cb();
      return {
        on: jest.fn(),
        close: jest.fn().mockImplementation(cb => cb())
      };
    })
  };
  
  return {
    ...jest.requireActual('express'),
    Router: jest.fn().mockReturnValue(mockRouter),
    default: jest.fn().mockReturnValue(mockApp),
    json: jest.fn(),
    urlencoded: jest.fn()
  };
});

describe('API Gateway', () => {
  describe('RouteRegistry', () => {
    let registry: RouteRegistryImpl;
    let route: ApiRoute;

    beforeEach(() => {
      registry = new RouteRegistryImpl();
      route = {
        method: 'get',
        path: '/test',
        handler: jest.fn()
      };
    });

    test('register and getRoute', () => {
      registry.register(route);
      const foundRoute = registry.getRoute('get', '/test');
      expect(foundRoute).toBe(route);
    });

    test('hasRoute', () => {
      expect(registry.hasRoute('get', '/test')).toBe(false);
      registry.register(route);
      expect(registry.hasRoute('get', '/test')).toBe(true);
    });

    test('getRoutes', () => {
      registry.register(route);
      const routes = registry.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0]).toBe(route);
    });

    test('unregister', () => {
      registry.register(route);
      registry.unregister('get', '/test');
      expect(registry.hasRoute('get', '/test')).toBe(false);
    });

    test('getRoutesByTag', () => {
      const taggedRoute: ApiRoute = {
        method: 'get',
        path: '/tagged',
        handler: jest.fn(),
        metadata: {
          tags: ['test-tag']
        }
      };
      
      registry.register(route);
      registry.register(taggedRoute);
      
      const routes = registry.getRoutesByTag('test-tag');
      expect(routes).toHaveLength(1);
      expect(routes[0]).toBe(taggedRoute);
    });

    test('getRoutesByVersion', () => {
      const versionedRoute: ApiRoute = {
        method: 'get',
        path: '/versioned',
        handler: jest.fn(),
        metadata: {
          version: '1'
        }
      };
      
      registry.register(route);
      registry.register(versionedRoute);
      
      const routes = registry.getRoutesByVersion('1');
      expect(routes).toHaveLength(1);
      expect(routes[0]).toBe(versionedRoute);
    });

    test('emits events', () => {
      const registerListener = jest.fn();
      const unregisterListener = jest.fn();
      
      registry.on(RouteRegistryEvents.ROUTE_REGISTERED, registerListener);
      registry.on(RouteRegistryEvents.ROUTE_UNREGISTERED, unregisterListener);
      
      registry.register(route);
      expect(registerListener).toHaveBeenCalledWith(route);
      
      registry.unregister('get', '/test');
      expect(unregisterListener).toHaveBeenCalledWith(route);
    });
  });

  describe('ApiGateway', () => {
    let gateway: ApiGatewayImpl;
    let registry: RouteRegistryImpl;
    let route: ApiRoute;
    
    beforeEach(() => {
      registry = new RouteRegistryImpl();
      gateway = new ApiGatewayImpl({}, registry);
      
      route = {
        method: 'get',
        path: '/test',
        handler: jest.fn()
      };
    });
    
    test('initialize', async () => {
      const initListener = jest.fn();
      gateway.on(ApiGatewayEvents.INITIALIZED, initListener);
      
      await gateway.initialize();
      
      expect(gateway['initialized']).toBe(true);
      expect(initListener).toHaveBeenCalled();
    });
    
    test('getRouter', () => {
      expect(gateway.getRouter()).toBe(gateway['router']);
    });
    
    test('getRegistry', () => {
      expect(gateway.getRegistry()).toBe(registry);
    });
    
    test('registerRoute', () => {
      const routeListener = jest.fn();
      gateway.on(ApiGatewayEvents.ROUTE_REGISTERED, routeListener);
      
      gateway.registerRoute(route);
      
      expect(registry.hasRoute('get', '/test')).toBe(true);
      expect(routeListener).toHaveBeenCalledWith(route);
    });
    
    test('unregisterRoute', () => {
      gateway.registerRoute(route);
      
      const unregisterListener = jest.fn();
      gateway.on(ApiGatewayEvents.ROUTE_UNREGISTERED, unregisterListener);
      
      gateway.unregisterRoute('get', '/test');
      
      expect(registry.hasRoute('get', '/test')).toBe(false);
      expect(unregisterListener).toHaveBeenCalledWith(route);
    });
    
    test('registerMiddleware', () => {
      const middleware = jest.fn();
      
      const middlewareListener = jest.fn();
      gateway.on(ApiGatewayEvents.MIDDLEWARE_REGISTERED, middlewareListener);
      
      gateway.registerMiddleware(middleware);
      
      expect(gateway['middleware']).toContain(middleware);
      expect(middlewareListener).toHaveBeenCalledWith(middleware);
    });
    
    test('registerErrorHandler', () => {
      const errorHandler = jest.fn();
      
      const errorHandlerListener = jest.fn();
      gateway.on(ApiGatewayEvents.ERROR_HANDLER_REGISTERED, errorHandlerListener);
      
      gateway.registerErrorHandler(errorHandler);
      
      expect(gateway['errorHandlers']).toContain(errorHandler);
      expect(errorHandlerListener).toHaveBeenCalledWith(errorHandler);
    });
    
    test('start and stop', async () => {
      const startListener = jest.fn();
      const stopListener = jest.fn();
      
      gateway.on(ApiGatewayEvents.STARTED, startListener);
      gateway.on(ApiGatewayEvents.STOPPED, stopListener);
      
      await gateway.start(3000);
      
      expect(startListener).toHaveBeenCalledWith(3000);
      expect(gateway['app'].listen).toHaveBeenCalledWith(3000, expect.any(Function));
      
      await gateway.stop();
      
      expect(stopListener).toHaveBeenCalled();
      expect(gateway['server']).toBeNull();
    });
    
    test('applying routes', async () => {
      gateway.registerRoute(route);
      
      await gateway.initialize();
      
      // Express router get method should have been called for the route
      expect(gateway['router'].get).toHaveBeenCalledWith(
        route.path,
        expect.any(Array)
      );
    });
  });
});