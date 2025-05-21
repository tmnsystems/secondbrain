/**
 * AI Model Abstraction Layer Example
 */

import {
  ModelManagerImpl,
  OpenAIModelAdapter,
  AnthropicModelAdapter,
  ModelProvider,
  ModelType,
  ModelCapability,
  ModelManagerEvents
} from '../src/ai-models';

// Create a simple logger for the example
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// Create the model manager
const manager = new ModelManagerImpl(undefined, logger);

// Subscribe to events
manager.on(ModelManagerEvents.INITIALIZED, () => {
  logger.info('Model manager initialized');
});

manager.on(ModelManagerEvents.ADAPTER_REGISTERED, (provider, adapter) => {
  logger.info(`Model adapter registered for provider: ${provider}`);
});

manager.on(ModelManagerEvents.MODEL_REGISTERED, (model) => {
  logger.info(`Model registered: ${model.id} (${model.name})`);
});

// Create and register model adapters
async function initializeModelManager() {
  // Create OpenAI adapter
  // Note: In a real application, you would pass in your actual API keys
  const openaiAdapter = new OpenAIModelAdapter('OPENAI_API_KEY', logger);
  manager.registerAdapter(ModelProvider.OPENAI, openaiAdapter);
  
  // Create Anthropic adapter
  const anthropicAdapter = new AnthropicModelAdapter('ANTHROPIC_API_KEY', logger);
  manager.registerAdapter(ModelProvider.ANTHROPIC, anthropicAdapter);
  
  // Initialize the model manager
  await manager.initialize();
  
  // Log the available models
  const registry = manager.getRegistry();
  const models = registry.getModels();
  
  logger.info(`Available models (${models.length}):`);
  for (const model of models) {
    logger.info(`  - ${model.id} (${model.name}): ${model.type}, ${model.capabilities.join(', ')}`);
  }
  
  // Compare models
  logger.info('\nComparing models by cost:');
  const chatModels = registry.findModelsByType(ModelType.CHAT);
  chatModels.sort((a, b) => {
    const aCost = a.inputCostPer1KTokens || 0;
    const bCost = b.inputCostPer1KTokens || 0;
    return aCost - bCost;
  });
  
  for (const model of chatModels) {
    logger.info(`  - ${model.id} (${model.name}): $${model.inputCostPer1KTokens} / $${model.outputCostPer1KTokens} per 1K tokens`);
  }
  
  // Generate text
  logger.info('\nGenerating text:');
  
  try {
    // Find the cheapest model for text generation
    const suggestedModel = manager.suggestModel(
      ModelType.CHAT,
      [ModelCapability.TEXT_GENERATION],
      {}
    );
    
    if (!suggestedModel) {
      throw new Error('No suitable model found for text generation');
    }
    
    logger.info(`Using model: ${suggestedModel.id} (${suggestedModel.name})`);
    
    const response = await manager.generateChatResponse({
      model: suggestedModel.id,
      messages: [
        {
          role: 'user',
          content: 'Hello! Can you give me a short introduction to AI model abstraction layers?'
        }
      ],
      parameters: {
        temperature: 0.7,
        maxTokens: 200
      }
    });
    
    logger.info('Response:');
    logger.info(response.choices[0].message?.content);
    logger.info(`Tokens: ${response.usage?.totalTokens || 'unknown'} (input: ${response.usage?.inputTokens || 'unknown'}, output: ${response.usage?.outputTokens || 'unknown'})`);
  } catch (error) {
    logger.error('Error generating text:', error);
  }
  
  // Stream chat response
  logger.info('\nStreaming chat response:');
  
  try {
    const streamingModel = manager.suggestModel(
      ModelType.CHAT,
      [ModelCapability.CHAT],
      { supportsStreaming: true }
    );
    
    if (!streamingModel) {
      throw new Error('No suitable model found for streaming');
    }
    
    logger.info(`Using model: ${streamingModel.id} (${streamingModel.name})`);
    
    const stream = manager.streamChatResponse({
      model: streamingModel.id,
      messages: [
        {
          role: 'user',
          content: 'Write a haiku about artificial intelligence.'
        }
      ],
      parameters: {
        temperature: 0.7,
        maxTokens: 100,
        stream: true
      }
    });
    
    process.stdout.write('Response: ');
    
    for await (const chunk of stream) {
      const content = chunk.choices[0].message?.content || '';
      process.stdout.write(content);
    }
    
    process.stdout.write('\n\n');
  } catch (error) {
    logger.error('Error streaming chat response:', error);
  }
  
  // Generate embeddings
  logger.info('\nGenerating embeddings:');
  
  try {
    const embeddingModel = manager.suggestModel(
      ModelType.EMBEDDING,
      [ModelCapability.EMBEDDINGS],
      {}
    );
    
    if (!embeddingModel) {
      throw new Error('No suitable model found for embeddings');
    }
    
    logger.info(`Using model: ${embeddingModel.id} (${embeddingModel.name})`);
    
    const embeddings = await manager.generateEmbeddings({
      model: embeddingModel.id,
      input: 'Hello, world!'
    });
    
    logger.info(`Embeddings: ${embeddings[0].length} dimensions`);
    logger.info(`First few dimensions: ${embeddings[0].slice(0, 5).join(', ')}...`);
  } catch (error) {
    logger.error('Error generating embeddings:', error);
  }
  
  // Count tokens
  logger.info('\nCounting tokens:');
  
  try {
    const model = registry.getModels()[0];
    const text = 'This is a sample text for token counting. It should be around 15-20 tokens.';
    
    const tokenCount = await manager.countTokens(text, model.id);
    logger.info(`Text: "${text}"`);
    logger.info(`Token count: ${tokenCount}`);
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'Hello, how are you?'
      },
      {
        role: 'assistant',
        content: 'I\'m doing well, thank you for asking! How can I help you today?'
      }
    ];
    
    const messageTokenCount = await manager.countMessageTokens(messages, model.id);
    logger.info(`Messages token count: ${messageTokenCount}`);
  } catch (error) {
    logger.error('Error counting tokens:', error);
  }
}

// Run the example
initializeModelManager().catch(error => {
  logger.error('Error running example:', error);
});