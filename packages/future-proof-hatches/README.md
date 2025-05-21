# Future-Proof Hatches (BP-09)

This package provides a comprehensive set of modules designed to ensure that SecondBrain can adapt to future changes and requirements without significant architectural changes.

## Overview

The Future-Proof Hatches package includes several key components:

1. **Extensibility Framework**: A system that allows extending functionality through well-defined extension points.
2. **Plugin System**: A mechanism for loading, managing, and executing plugins from various sources.
3. **API Gateway**: A centralized entry point for external systems to interact with SecondBrain.
4. **AI Model Abstraction Layer**: A unified interface for interacting with different AI models from various providers.
5. **Feature Flag System**: A system for dynamically enabling or disabling features based on rules and contexts.
6. **A/B Testing Framework**: A framework for testing different variants of features with users.

These components work together to provide a flexible and adaptable architecture that can evolve over time.

## Installation

```bash
# Install the package
npm install @secondbrain/future-proof-hatches
```

## Usage

### Extensibility Framework

The Extensibility Framework provides a way to extend SecondBrain with new capabilities through extension points.

```typescript
import { 
  ExtensibilityManager, 
  ExtensionPointImpl, 
  Extension 
} from '@secondbrain/future-proof-hatches/extensibility';

// Create an extensibility manager
const extensibilityManager = new ExtensibilityManager();

// Define an extension point
const documentProcessorExtensionPoint = new ExtensionPointImpl<DocumentProcessor>('document-processor');
extensibilityManager.registerExtensionPoint(documentProcessorExtensionPoint);

// Register an extension
extensibilityManager.registerExtension({
  id: 'markdown-processor',
  extensionPointId: 'document-processor',
  implementation: new MarkdownProcessor(),
  metadata: {
    name: 'Markdown Processor',
    description: 'Processes Markdown documents',
    version: '1.0.0'
  }
});

// Get extensions for an extension point
const documentProcessors = extensibilityManager.getExtensions<DocumentProcessor>('document-processor');

// Execute extensions
for (const processor of documentProcessors) {
  processor.process(document);
}
```

### Plugin System

The Plugin System allows loading and managing plugins from various sources.

```typescript
import { 
  PluginManager, 
  FileSystemPluginLoader 
} from '@secondbrain/future-proof-hatches/plugin-system';

// Create a plugin manager
const pluginManager = new PluginManager();

// Add a plugin loader
pluginManager.addLoader(new FileSystemPluginLoader('/path/to/plugins'));

// Load plugins
await pluginManager.loadPlugins();

// Get all plugins
const plugins = pluginManager.getPlugins();

// Get plugins by type
const formatters = pluginManager.getPluginsByType('formatter');

// Execute a plugin
const plugin = pluginManager.getPlugin('markdown-formatter');
if (plugin) {
  plugin.execute(document);
}
```

### API Gateway

The API Gateway provides a centralized entry point for external systems to interact with SecondBrain.

```typescript
import { 
  ApiGateway, 
  AuthMiddleware 
} from '@secondbrain/future-proof-hatches/api-gateway';

// Create an API gateway
const apiGateway = new ApiGateway();

// Register middleware
apiGateway.useMiddleware(new AuthMiddleware());
apiGateway.useMiddleware(new LoggingMiddleware());

// Register routes
apiGateway.registerRoute({
  path: '/documents',
  method: 'GET',
  handler: async (req, res) => {
    const documents = await documentRepository.getAll();
    res.json(documents);
  }
});

// Start the gateway
apiGateway.start(3000);
```

### AI Model Abstraction Layer

The AI Model Abstraction Layer provides a unified interface for interacting with different AI models.

```typescript
import { 
  ModelManager, 
  OpenAIModelAdapter,
  AnthropicModelAdapter,
  ModelType 
} from '@secondbrain/future-proof-hatches/ai-models';

// Create a model manager
const modelManager = new ModelManager();

// Register model adapters
modelManager.registerAdapter(new OpenAIModelAdapter({
  apiKey: process.env.OPENAI_API_KEY
}));

modelManager.registerAdapter(new AnthropicModelAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY
}));

// Get a model
const textCompletionModel = await modelManager.getModel({
  type: ModelType.TEXT_COMPLETION,
  preferredProvider: 'openai'
});

// Use the model
const completion = await textCompletionModel.complete({
  prompt: 'Hello, world!',
  maxTokens: 100
});
```

### Feature Flag System

The Feature Flag System allows dynamically enabling or disabling features based on rules and contexts.

```typescript
import { 
  FeatureFlagManager, 
  InMemoryFeatureFlagProvider 
} from '@secondbrain/future-proof-hatches/feature-flags';

// Create a feature flag manager
const featureFlagManager = new FeatureFlagManager(new InMemoryFeatureFlagProvider());

// Register a feature flag
await featureFlagManager.registerFlag({
  name: 'new-ui',
  description: 'Enable the new UI',
  enabled: false,
  rules: [
    {
      condition: { userRole: 'admin' },
      value: true
    }
  ]
});

// Check if a feature is enabled
const isEnabled = await featureFlagManager.isEnabled('new-ui', { userId: '123', userRole: 'user' });
if (isEnabled) {
  // Show the new UI
}

// Update a feature flag
await featureFlagManager.updateFlag('new-ui', { enabled: true });
```

### A/B Testing Framework

The A/B Testing Framework provides a way to test different variants of features with users.

```typescript
import { 
  ABTestingManager, 
  InMemoryExperimentRepository,
  VariantAssignmentStrategy 
} from '@secondbrain/future-proof-hatches/ab-testing';

// Create an A/B testing manager
const abTestManager = new ABTestingManager(new InMemoryExperimentRepository());

// Create an experiment
const experiment = await abTestManager.createExperiment(
  'New UI Experiment',
  'Test the new UI',
  [
    { id: 'control', name: 'Current UI', isControl: true, weight: 50 },
    { id: 'treatment', name: 'New UI', isControl: false, weight: 50 }
  ],
  ['page_view', 'click', 'conversion'],
  {
    assignmentStrategy: VariantAssignmentStrategy.STICKY
  }
);

// Start the experiment
await abTestManager.startExperiment(experiment.id);

// Get the variant for a user
const variant = await abTestManager.getVariantAssignment(experiment.id, userId);
if (variant) {
  if (variant.id === 'treatment') {
    // Show the new UI
  } else {
    // Show the current UI
  }
  
  // Track a metric
  await abTestManager.recordMetricEvent('page_view', userId, 1);
}

// Analyze the experiment
const analysis = await abTestManager.analyzeExperiment(experiment.id);
console.log(analysis);
```

## Architectural Patterns

The Future-Proof Hatches package employs several architectural patterns:

1. **Extension Points**: Provides a mechanism for extending the system at well-defined points.
2. **Plugin Architecture**: Allows loading and execution of external code.
3. **Middleware Pattern**: Enables processing of requests/responses through a chain of handlers.
4. **Adapter Pattern**: Adapts different interfaces to a common one.
5. **Strategy Pattern**: Allows selecting an algorithm at runtime.
6. **Repository Pattern**: Provides a way to store and retrieve data entities.
7. **Factory Pattern**: Creates instances of objects without specifying their concrete classes.
8. **Event-Driven Architecture**: Uses events to communicate between components.

## Examples

Check out the examples in each module's directory:

- Extensibility Framework: `/src/extensibility/examples/`
- Plugin System: `/src/plugin-system/examples/`
- API Gateway: `/src/api-gateway/examples/`
- AI Model Abstraction Layer: `/src/ai-models/examples/`
- Feature Flag System: `/src/feature-flags/examples/`
- A/B Testing Framework: `/src/ab-testing/examples/`

## Documentation

Detailed documentation for each module can be found in their respective directories:

- Extensibility Framework: `/src/extensibility/docs/`
- Plugin System: `/src/plugin-system/docs/`
- API Gateway: `/src/api-gateway/docs/`
- AI Model Abstraction Layer: `/src/ai-models/docs/`
- Feature Flag System: `/src/feature-flags/docs/`
- A/B Testing Framework: `/src/ab-testing/docs/`

## Testing

Run tests for all modules:

```bash
npm test
```

Run tests for a specific module:

```bash
npm test -- --testPathPattern=src/extensibility
```

## License

This package is part of the SecondBrain project and is licensed under the same terms.

## Contributing

See the [CONTRIBUTING.md](../../CONTRIBUTING.md) file for details on how to contribute to this package.