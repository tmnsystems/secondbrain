/**
 * API Gateway Example
 */

import { Request, Response, NextFunction } from 'express';
import {
  ApiGatewayImpl,
  ApiRoute,
  ApiGatewayEvents
} from '../src/api-gateway';

// Create a simple logger for the example
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// Create the API gateway
const gateway = new ApiGatewayImpl(
  {
    basePath: '/api',
    corsEnabled: true,
    loggingEnabled: true,
    securityEnabled: true,
    versioningEnabled: true,
    versioningOptions: {
      defaultVersion: '1',
      versionHeader: 'X-API-Version',
      versionQueryParam: 'version'
    }
  },
  undefined,
  logger
);

// Subscribe to events
gateway.on(ApiGatewayEvents.INITIALIZED, () => {
  logger.info('API Gateway initialized');
});

gateway.on(ApiGatewayEvents.STARTED, (port) => {
  logger.info(`API Gateway started on port ${port}`);
});

gateway.on(ApiGatewayEvents.STOPPED, () => {
  logger.info('API Gateway stopped');
});

gateway.on(ApiGatewayEvents.ROUTE_REGISTERED, (route) => {
  logger.info(`Route registered: ${route.method.toUpperCase()} ${route.path}`);
});

// Create some example routes
const routes: ApiRoute[] = [
  {
    method: 'get',
    path: '/users',
    handler: async (req: Request, res: Response) => {
      // In a real implementation, this would query a database
      const users = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ];
      
      res.json(users);
    },
    metadata: {
      name: 'Get Users',
      description: 'Get a list of users',
      version: '1',
      tags: ['users'],
      public: true,
      requestSchema: {
        query: {
          limit: { type: 'number', optional: true },
          offset: { type: 'number', optional: true },
        }
      },
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          }
        }
      }
    }
  },
  {
    method: 'get',
    path: '/users/:id',
    handler: async (req: Request, res: Response) => {
      const userId = parseInt(req.params.id);
      
      // In a real implementation, this would query a database
      if (userId === 1) {
        res.json({ id: 1, name: 'User 1' });
      } else if (userId === 2) {
        res.json({ id: 2, name: 'User 2' });
      } else {
        res.status(404).json({
          error: 'Not Found',
          message: `User with ID ${userId} not found`
        });
      }
    },
    metadata: {
      name: 'Get User by ID',
      description: 'Get a user by their ID',
      version: '1',
      tags: ['users'],
      public: true,
      requestSchema: {
        params: {
          id: { type: 'number' }
        }
      },
      responseSchema: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        }
      }
    }
  },
  {
    method: 'post',
    path: '/users',
    handler: async (req: Request, res: Response) => {
      const { name } = req.body;
      
      // In a real implementation, this would create a new user in a database
      res.status(201).json({
        id: 3,
        name
      });
    },
    metadata: {
      name: 'Create User',
      description: 'Create a new user',
      version: '1',
      tags: ['users'],
      permissions: ['users:create'],
      requestSchema: {
        body: {
          name: { type: 'string' }
        }
      },
      responseSchema: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        }
      }
    }
  }
];

// Register middleware for request logging
gateway.registerMiddleware((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Request: ${req.method} ${req.path}`);
  next();
});

// Register routes
for (const route of routes) {
  gateway.registerRoute(route);
}

// Register error handler
gateway.registerErrorHandler((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Initialize and start the API gateway
async function startGateway() {
  await gateway.initialize();
  await gateway.start(3000);
  
  logger.info('API Gateway is available at http://localhost:3000/api');
  logger.info('Example routes:');
  logger.info('GET http://localhost:3000/api/users');
  logger.info('GET http://localhost:3000/api/users/1');
  logger.info('POST http://localhost:3000/api/users (with {"name": "New User"} body)');
  
  // For demonstration purposes, we'll stop the gateway after 1 minute
  setTimeout(async () => {
    logger.info('Stopping API Gateway...');
    await gateway.stop();
    process.exit(0);
  }, 60000);
}

// Run the example
startGateway().catch(error => {
  logger.error('Error starting API Gateway:', error);
  process.exit(1);
});