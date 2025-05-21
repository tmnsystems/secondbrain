# AI Model Abstraction Layer

The AI Model Abstraction Layer provides a unified interface for interacting with various AI models from different providers. It abstracts away the differences between model APIs, allowing you to easily switch between models and providers without changing your application code.

## Key Components

### ModelManager

The ModelManager is the central component of the abstraction layer. It manages model adapters, provides a unified API for model interactions, and helps with model selection based on capabilities and constraints.

```typescript
// Create a ModelManager
import { ModelManagerImpl } from '@secondbrain/future-proof-hatches';

const manager = new ModelManagerImpl();

// Initialize the manager
await manager.initialize();

// Generate text
const response = await manager.generateChatResponse({
  model: 'gpt-4',
  messages: [
    {
      role: 'user',
      content: 'Hello, world!'
    }
  ]
});

console.log(response.choices[0].message?.content);
```

### ModelRegistry

The ModelRegistry maintains a catalog of all available models, including their metadata, capabilities, and pricing information. It provides APIs for registering, unregistering, and querying models.

```typescript
// Get the ModelRegistry
const registry = manager.getRegistry();

// Get all available models
const allModels = registry.getModels();

// Find models by type
const chatModels = registry.findModelsByType(ModelType.CHAT);

// Find models by capability
const codeModels = registry.findModelsByCapability(ModelCapability.CODE_GENERATION);

// Find models by criteria
const cheapModels = registry.findModelsByCriteria({
  type: ModelType.CHAT,
  capabilities: [ModelCapability.TEXT_GENERATION],
  inputCostPer1KTokens: { $lt: 0.01 }
});
```

### ModelAdapter

ModelAdapters bridge the gap between the unified abstraction layer API and the specific APIs of model providers. Each adapter is responsible for translating requests and responses for a specific provider.

```typescript
// Create model adapters
import { OpenAIModelAdapter, AnthropicModelAdapter } from '@secondbrain/future-proof-hatches';

const openaiAdapter = new OpenAIModelAdapter('your-openai-api-key');
const anthropicAdapter = new AnthropicModelAdapter('your-anthropic-api-key');

// Register adapters with the manager
manager.registerAdapter(ModelProvider.OPENAI, openaiAdapter);
manager.registerAdapter(ModelProvider.ANTHROPIC, anthropicAdapter);
```

## Model Metadata

Models are represented with rich metadata, including:

- Basic information (ID, name, version, provider)
- Type (chat, text, embedding, image, etc.)
- Capabilities (text generation, embeddings, function calling, etc.)
- Context window size
- Pricing (input and output costs)
- Streaming support
- Deprecation status

```typescript
const modelMetadata = {
  id: 'gpt-4',
  name: 'GPT-4',
  version: '1',
  provider: ModelProvider.OPENAI,
  type: ModelType.CHAT,
  capabilities: [
    ModelCapability.CHAT,
    ModelCapability.TEXT_GENERATION,
    ModelCapability.CODE_GENERATION,
    ModelCapability.FUNCTION_CALLING
  ],
  contextWindow: 8192,
  inputCostPer1KTokens: 0.03,
  outputCostPer1KTokens: 0.06,
  supportsStreaming: true
};
```

## Key Features

### Unified API for Multiple Providers

The abstraction layer provides a consistent API for working with models from different providers:

```typescript
// Generate text with OpenAI
const openaiResponse = await manager.generateChatResponse({
  model: 'gpt-4',
  messages: [/* ... */]
});

// Generate text with Anthropic
const anthropicResponse = await manager.generateChatResponse({
  model: 'claude-3',
  messages: [/* ... */]
});
```

### Model Selection

The abstraction layer helps you select the most appropriate model for your use case:

```typescript
// Suggest a model for a specific task
const model = manager.suggestModel(
  ModelType.CHAT,
  [ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION],
  { contextWindow: { $gt: 8000 } }
);

if (model) {
  console.log(`Using model: ${model.id} (${model.name})`);
  
  // Use the suggested model
  const response = await manager.generateChatResponse({
    model: model.id,
    messages: [/* ... */]
  });
}
```

### Streaming Support

The abstraction layer supports streaming responses for real-time interactions:

```typescript
// Stream chat response
const stream = manager.streamChatResponse({
  model: 'gpt-4',
  messages: [/* ... */],
  parameters: {
    stream: true
  }
});

for await (const chunk of stream) {
  const content = chunk.choices[0].message?.content || '';
  process.stdout.write(content);
}
```

### Token Counting and Cost Estimation

The abstraction layer provides utilities for counting tokens and estimating costs:

```typescript
// Count tokens in text
const tokenCount = await manager.countTokens('Hello, world!', 'gpt-4');

// Count tokens in messages
const messageTokenCount = await manager.countMessageTokens([
  { role: 'user', content: 'Hello, world!' }
], 'gpt-4');

// Estimate cost
const inputCost = tokenCount * (model.inputCostPer1KTokens / 1000);
const outputCost = estimatedOutputTokens * (model.outputCostPer1KTokens / 1000);
const totalCost = inputCost + outputCost;
```

## Supported Providers

The abstraction layer currently supports the following providers:

- OpenAI (GPT-4, GPT-3.5 Turbo, Text Embedding models)
- Anthropic (Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku)
- (More providers can be added by implementing the ModelAdapter interface)

## Supported Operations

The abstraction layer supports the following operations:

- Text generation
- Chat response generation
- Embedding generation
- Image generation
- Streaming text and chat responses
- Token counting
- Model suggestion

## Use Cases

### Building Provider-Agnostic Applications

The abstraction layer allows you to build applications that can work with multiple model providers, making it easy to switch providers or use the best model for each task:

```typescript
function createAgnosticAssistant(manager, modelType, capabilities) {
  return async (prompt) => {
    // Select the best model for the task
    const model = manager.suggestModel(modelType, capabilities);
    
    if (!model) {
      throw new Error('No suitable model found');
    }
    
    // Generate a response using the selected model
    const response = await manager.generateChatResponse({
      model: model.id,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.choices[0].message?.content || '';
  };
}

// Create assistants for different tasks
const generalAssistant = createAgnosticAssistant(
  manager,
  ModelType.CHAT,
  [ModelCapability.TEXT_GENERATION]
);

const codeAssistant = createAgnosticAssistant(
  manager,
  ModelType.CHAT,
  [ModelCapability.CODE_GENERATION]
);
```

### Cost Optimization

The abstraction layer makes it easy to optimize costs by selecting models based on their pricing:

```typescript
function createCostAwareAssistant(manager, maxCostPer1KTokens) {
  return async (prompt) => {
    // Find models within the cost limit
    const models = manager.getRegistry().findModelsByCriteria({
      type: ModelType.CHAT,
      capabilities: [ModelCapability.TEXT_GENERATION],
      inputCostPer1KTokens: { $lte: maxCostPer1KTokens }
    });
    
    if (models.length === 0) {
      throw new Error('No models found within cost limit');
    }
    
    // Sort by input cost
    models.sort((a, b) => (a.inputCostPer1KTokens || 0) - (b.inputCostPer1KTokens || 0));
    
    // Use the cheapest model
    const model = models[0];
    
    // Generate a response
    const response = await manager.generateChatResponse({
      model: model.id,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.choices[0].message?.content || '';
  };
}

// Create assistants with different cost limits
const budgetAssistant = createCostAwareAssistant(manager, 0.001);
const premiumAssistant = createCostAwareAssistant(manager, 0.01);
```

### Fallback Chains

The abstraction layer makes it easy to implement fallback chains, where if one model fails, another is used as a backup:

```typescript
async function generateWithFallback(manager, prompt, modelIds) {
  let lastError = null;
  
  for (const modelId of modelIds) {
    try {
      const response = await manager.generateChatResponse({
        model: modelId,
        messages: [{ role: 'user', content: prompt }]
      });
      
      return response.choices[0].message?.content || '';
    } catch (error) {
      lastError = error;
      console.warn(`Failed to generate with model ${modelId}:`, error.message);
    }
  }
  
  throw new Error(`All models failed: ${lastError?.message}`);
}

// Use with a fallback chain
const result = await generateWithFallback(
  manager,
  'Hello, world!',
  ['gpt-4', 'claude-3', 'gpt-3.5-turbo']
);
```

## Best Practices

1. **Initialize Model Adapters Early**: Create and register model adapters early in your application lifecycle, preferably during initialization.

2. **Implement Error Handling**: Always implement proper error handling when working with AI models, as they can fail for various reasons (rate limits, API issues, etc.).

3. **Use Model Suggestion**: Use the `suggestModel` method to select the most appropriate model for each task, rather than hardcoding model IDs.

4. **Consider Costs**: Be mindful of the costs associated with different models, and optimize your usage accordingly.

5. **Use Streaming for Long Responses**: For longer responses, use streaming to provide real-time feedback to the user.

6. **Count Tokens Before Sending**: Use token counting methods to validate your inputs before sending them to the model, to avoid hitting context limits.

## Extending with Custom Adapters

You can extend the abstraction layer with custom adapters for new providers or custom models:

```typescript
import { BaseModelAdapter, ModelProvider } from '@secondbrain/future-proof-hatches';

// Create a custom adapter
class CustomModelAdapter extends BaseModelAdapter {
  constructor(apiKey, logger) {
    super(ModelProvider.CUSTOM, logger);
    // Initialize adapter
  }
  
  // Implement required methods
  protected async loadModels() {
    // Load and return models
  }
  
  async generateText(request) {
    // Implement text generation
  }
  
  // Implement other required methods
}

// Register the custom adapter
const customAdapter = new CustomModelAdapter('your-api-key');
manager.registerAdapter(ModelProvider.CUSTOM, customAdapter);
```

## API Reference

For detailed API documentation, please refer to the TypeScript definitions in the `types.ts` file.