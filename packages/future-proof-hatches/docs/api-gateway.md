# API Gateway

The API Gateway provides a centralized entry point for external systems to interact with SecondBrain. It handles routing, authentication, authorization, rate limiting, and other cross-cutting concerns, allowing service implementations to focus on business logic.

## Key Components

### ApiGateway

The ApiGateway is the central component that manages the HTTP server, routes, middleware, and other aspects of the API.

```typescript
// Create an ApiGateway
import { ApiGatewayImpl } from '@secondbrain/future-proof-hatches';

const gateway = new ApiGatewayImpl({
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
});

// Initialize and start the gateway
await gateway.initialize();
await gateway.start(3000);
```

### RouteRegistry

The RouteRegistry maintains a catalog of all registered routes, including their metadata and handlers. It provides APIs for registering, unregistering, and querying routes.

```typescript
// Get the RouteRegistry
const registry = gateway.getRegistry();

// Register a route
registry.register({
  method: 'get',
  path: '/users',
  handler: (req, res) => {
    // Handler implementation
  },
  metadata: {
    name: 'Get Users',
    description: 'Get a list of users',
    version: '1',
    tags: ['users'],
    public: true
  }
});

// Check if a route is registered
const isRegistered = registry.hasRoute('get', '/users');

// Get all registered routes
const routes = registry.getRoutes();
```

### Middleware

The API Gateway provides various middleware functions for common concerns such as authentication, authorization, rate limiting, validation, logging, CORS, security headers, tenant isolation, and versioning.

```typescript
// Register middleware
gateway.registerMiddleware((req, res, next) => {
  // Middleware implementation
  next();
});

// Register error handler
gateway.registerErrorHandler((err, req, res, next) => {
  // Error handler implementation
  res.status(500).json({ error: err.message });
});
```

## Route Definition

Routes are defined with a method, path, handler, optional middleware, and metadata:

```typescript
const route = {
  method: 'get',
  path: '/users/:id',
  handler: async (req, res) => {
    const userId = req.params.id;
    // Handler implementation
    res.json({ id: userId, name: 'User Name' });
  },
  middleware: [
    // Route-specific middleware
  ],
  metadata: {
    name: 'Get User by ID',
    description: 'Get a user by their ID',
    version: '1',
    tags: ['users'],
    public: true,
    requestSchema: {
      params: {
        id: { type: 'string' }
      }
    },
    responseSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' }
      }
    }
  }
};

// Register the route with the gateway
gateway.registerRoute(route);
```

## Features

### Authentication and Authorization

The API Gateway can be configured with authentication and authorization providers to secure routes:

```typescript
const gateway = new ApiGatewayImpl({
  authenticationEnabled: true,
  authenticationProvider: {
    authenticate: async (req) => {
      // Authentication logic
      return true;
    },
    getCurrentUser: async (req) => {
      // Get current user logic
      return { id: '123', name: 'User' };
    },
    createMiddleware: () => {
      // Authentication middleware
      return (req, res, next) => {
        // Implementation
        next();
      };
    }
  },
  authorizationEnabled: true,
  authorizationProvider: {
    hasPermission: async (user, permission) => {
      // Authorization logic
      return true;
    },
    createMiddleware: (permission) => {
      // Authorization middleware
      return (req, res, next) => {
        // Implementation
        next();
      };
    }
  }
});
```

### Rate Limiting

Rate limiting can be applied globally or to specific routes:

```typescript
const gateway = new ApiGatewayImpl({
  rateLimitingEnabled: true,
  rateLimitingOptions: {
    max: 100,
    windowMs: 60000 // 1 minute
  }
});

// Route with custom rate limiting
const route = {
  // Route definition
  metadata: {
    // Metadata
    rateLimit: {
      max: 10,
      windowMs: 60000 // 1 minute
    }
  }
};
```

### Request Validation

Routes can specify request schemas for validation:

```typescript
const route = {
  // Route definition
  metadata: {
    // Metadata
    requestSchema: {
      body: {
        name: { type: 'string', required: true },
        age: { type: 'number', optional: true }
      },
      params: {
        id: { type: 'string', required: true }
      },
      query: {
        include: { type: 'string', optional: true }
      }
    }
  }
};
```

### Versioning

API versioning is supported through headers, query parameters, or path parameters:

```typescript
const gateway = new ApiGatewayImpl({
  versioningEnabled: true,
  versioningOptions: {
    defaultVersion: '1',
    versionHeader: 'X-API-Version',
    versionQueryParam: 'version',
    versionPathParam: 'v',
    versionFormat: 'v'
  }
});
```

### Multi-Tenant Support

The API Gateway can be configured for multi-tenant applications:

```typescript
const gateway = new ApiGatewayImpl({
  multiTenantEnabled: true
});
```

### Documentation

API documentation can be automatically generated:

```typescript
const gateway = new ApiGatewayImpl({
  documentationEnabled: true,
  documentationOptions: {
    title: 'SecondBrain API',
    description: 'API for the SecondBrain system',
    version: '1.0.0',
    serverUrl: 'https://api.secondbrain.com'
  }
});
```

## Use Cases

### RESTful API

The API Gateway can be used to expose a RESTful API for CRUD operations:

```typescript
// Define routes for a resource
const routes = [
  {
    method: 'get',
    path: '/users',
    handler: async (req, res) => {
      // Get all users
      res.json([{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }]);
    },
    metadata: {
      name: 'Get Users',
      tags: ['users']
    }
  },
  {
    method: 'get',
    path: '/users/:id',
    handler: async (req, res) => {
      // Get a specific user
      res.json({ id: req.params.id, name: 'User Name' });
    },
    metadata: {
      name: 'Get User by ID',
      tags: ['users']
    }
  },
  {
    method: 'post',
    path: '/users',
    handler: async (req, res) => {
      // Create a new user
      res.status(201).json({ id: '3', name: req.body.name });
    },
    metadata: {
      name: 'Create User',
      tags: ['users']
    }
  },
  // PUT and DELETE routes for users
];

// Register the routes
for (const route of routes) {
  gateway.registerRoute(route);
}
```

### GraphQL API

The API Gateway can also be used to expose a GraphQL API:

```typescript
// Define a GraphQL route
const graphqlRoute = {
  method: 'post',
  path: '/graphql',
  handler: async (req, res) => {
    // GraphQL handler (using a library like Apollo Server)
    // Process the GraphQL query in req.body.query
    res.json({ data: { /* GraphQL response */ } });
  },
  metadata: {
    name: 'GraphQL API',
    tags: ['graphql'],
    public: true
  }
};

// Register the route
gateway.registerRoute(graphqlRoute);
```

### WebHooks

The API Gateway can be used to receive webhooks from external systems:

```typescript
// Define a webhook route
const webhookRoute = {
  method: 'post',
  path: '/webhooks/:provider',
  handler: async (req, res) => {
    const provider = req.params.provider;
    const payload = req.body;
    
    // Process the webhook based on the provider
    switch (provider) {
      case 'github':
        // Process GitHub webhook
        break;
      case 'slack':
        // Process Slack webhook
        break;
      default:
        return res.status(400).json({
          error: 'Bad Request',
          message: `Unknown webhook provider: ${provider}`
        });
    }
    
    res.status(200).end();
  },
  middleware: [
    // Webhook validation middleware
  ],
  metadata: {
    name: 'Webhook Receiver',
    tags: ['webhooks'],
    public: true
  }
};

// Register the route
gateway.registerRoute(webhookRoute);
```

## Best Practices

1. **Organize Routes by Resource**: Group routes related to the same resource together.

2. **Use Middleware for Cross-Cutting Concerns**: Extract common functionality into middleware to keep route handlers focused on business logic.

3. **Include Comprehensive Metadata**: Provide detailed metadata for routes to enable features like validation, documentation, and security.

4. **Use Versioning**: Implement API versioning from the beginning to support future changes.

5. **Implement Rate Limiting**: Protect your API from abuse by implementing rate limiting.

6. **Validate Requests**: Use request schemas to validate input and prevent invalid data from reaching your services.

7. **Handle Errors Consistently**: Implement a consistent error handling strategy for all routes.

8. **Document Your API**: Use metadata to automatically generate API documentation.

## API Reference

For detailed API documentation, please refer to the TypeScript definitions in the `types.ts` file.