/**
 * Tests for AI Model Abstraction Layer
 */

import {
  ModelRegistryImpl,
  ModelManagerImpl,
  OpenAIModelAdapter,
  AnthropicModelAdapter,
  ModelProvider,
  ModelType,
  ModelCapability,
  ModelMetadata,
  ModelRegistryEvents,
  ModelManagerEvents
} from '../src/ai-models';

// Mock models for testing
const mockOpenAIModel: ModelMetadata = {
  id: 'gpt-4',
  name: 'GPT-4',
  version: '1',
  provider: ModelProvider.OPENAI,
  type: ModelType.CHAT,
  capabilities: [
    ModelCapability.CHAT,
    ModelCapability.TEXT_GENERATION,
    ModelCapability.CODE_GENERATION
  ],
  contextWindow: 8192,
  inputCostPer1KTokens: 0.03,
  outputCostPer1KTokens: 0.06,
  supportsStreaming: true
};

const mockAnthropicModel: ModelMetadata = {
  id: 'claude-3',
  name: 'Claude 3',
  version: '1',
  provider: ModelProvider.ANTHROPIC,
  type: ModelType.CHAT,
  capabilities: [
    ModelCapability.CHAT,
    ModelCapability.TEXT_GENERATION,
    ModelCapability.CODE_GENERATION
  ],
  contextWindow: 100000,
  inputCostPer1KTokens: 0.01,
  outputCostPer1KTokens: 0.03,
  supportsStreaming: true
};

// Mock OpenAI adapter
jest.mock('../src/ai-models/model-adapter', () => {
  const originalModule = jest.requireActual('../src/ai-models/model-adapter');
  
  return {
    ...originalModule,
    OpenAIModelAdapter: jest.fn().mockImplementation(() => ({
      getProvider: jest.fn().mockReturnValue(ModelProvider.OPENAI),
      getModels: jest.fn().mockResolvedValue([mockOpenAIModel]),
      getModel: jest.fn().mockResolvedValue(mockOpenAIModel),
      generateText: jest.fn().mockResolvedValue({
        id: 'mock-response-id',
        object: 'text_completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            text: 'Mock response from OpenAI',
            index: 0,
            finishReason: 'stop'
          }
        ],
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15
        }
      }),
      generateChatResponse: jest.fn().mockResolvedValue({
        id: 'mock-response-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Mock response from OpenAI'
            },
            index: 0,
            finishReason: 'stop'
          }
        ],
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15
        }
      }),
      generateEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      generateImages: jest.fn().mockResolvedValue(['https://example.com/image.png']),
      streamText: jest.fn().mockImplementation(function* () {
        yield {
          id: 'mock-chunk-1',
          object: 'text_completion.chunk',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              text: 'Mock response',
              index: 0,
              finishReason: null
            }
          ],
          done: false
        };
        yield {
          id: 'mock-chunk-2',
          object: 'text_completion.chunk',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              text: ' from OpenAI',
              index: 0,
              finishReason: 'stop'
            }
          ],
          done: true
        };
      }),
      streamChatResponse: jest.fn().mockImplementation(function* () {
        yield {
          id: 'mock-chunk-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Mock response'
              },
              index: 0,
              finishReason: null
            }
          ],
          done: false
        };
        yield {
          id: 'mock-chunk-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              message: {
                role: 'assistant',
                content: ' from OpenAI'
              },
              index: 0,
              finishReason: 'stop'
            }
          ],
          done: true
        };
      }),
      countTokens: jest.fn().mockResolvedValue(10),
      countMessageTokens: jest.fn().mockResolvedValue(20)
    }))
  };
});

// Mock Anthropic adapter
jest.mock('../src/ai-models/model-adapter', () => {
  const originalModule = jest.requireActual('../src/ai-models/model-adapter');
  
  return {
    ...originalModule,
    AnthropicModelAdapter: jest.fn().mockImplementation(() => ({
      getProvider: jest.fn().mockReturnValue(ModelProvider.ANTHROPIC),
      getModels: jest.fn().mockResolvedValue([mockAnthropicModel]),
      getModel: jest.fn().mockResolvedValue(mockAnthropicModel),
      generateText: jest.fn().mockResolvedValue({
        id: 'mock-response-id',
        object: 'text_completion',
        created: Date.now(),
        model: 'claude-3',
        choices: [
          {
            text: 'Mock response from Anthropic',
            index: 0,
            finishReason: 'stop'
          }
        ],
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15
        }
      }),
      generateChatResponse: jest.fn().mockResolvedValue({
        id: 'mock-response-id',
        object: 'message',
        created: Date.now(),
        model: 'claude-3',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Mock response from Anthropic'
            },
            index: 0,
            finishReason: 'stop'
          }
        ],
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15
        }
      }),
      generateEmbeddings: jest.fn().mockRejectedValue(new Error('Anthropic does not support embeddings')),
      generateImages: jest.fn().mockRejectedValue(new Error('Anthropic does not support image generation')),
      streamText: jest.fn().mockImplementation(function* () {
        yield {
          id: 'mock-chunk-1',
          object: 'message.delta',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Mock response'
              },
              index: 0,
              finishReason: null
            }
          ],
          done: false
        };
        yield {
          id: 'mock-chunk-2',
          object: 'message.delta',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              message: {
                role: 'assistant',
                content: ' from Anthropic'
              },
              index: 0,
              finishReason: 'stop'
            }
          ],
          done: true
        };
      }),
      streamChatResponse: jest.fn().mockImplementation(function* () {
        yield {
          id: 'mock-chunk-1',
          object: 'message.delta',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Mock response'
              },
              index: 0,
              finishReason: null
            }
          ],
          done: false
        };
        yield {
          id: 'mock-chunk-2',
          object: 'message.delta',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              message: {
                role: 'assistant',
                content: ' from Anthropic'
              },
              index: 0,
              finishReason: 'stop'
            }
          ],
          done: true
        };
      }),
      countTokens: jest.fn().mockResolvedValue(10),
      countMessageTokens: jest.fn().mockResolvedValue(20)
    }))
  };
});

describe('AI Model Abstraction Layer', () => {
  describe('ModelRegistry', () => {
    let registry: ModelRegistryImpl;
    
    beforeEach(() => {
      registry = new ModelRegistryImpl();
    });
    
    test('registerModel and getModel', () => {
      registry.registerModel(mockOpenAIModel);
      const model = registry.getModel(mockOpenAIModel.id);
      expect(model).toEqual(mockOpenAIModel);
    });
    
    test('getModels', () => {
      registry.registerModel(mockOpenAIModel);
      registry.registerModel(mockAnthropicModel);
      const models = registry.getModels();
      expect(models).toHaveLength(2);
      expect(models).toContainEqual(mockOpenAIModel);
      expect(models).toContainEqual(mockAnthropicModel);
    });
    
    test('unregisterModel', () => {
      registry.registerModel(mockOpenAIModel);
      registry.unregisterModel(mockOpenAIModel.id);
      const model = registry.getModel(mockOpenAIModel.id);
      expect(model).toBeNull();
    });
    
    test('findModelsByProvider', () => {
      registry.registerModel(mockOpenAIModel);
      registry.registerModel(mockAnthropicModel);
      const models = registry.findModelsByProvider(ModelProvider.OPENAI);
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual(mockOpenAIModel);
    });
    
    test('findModelsByType', () => {
      registry.registerModel(mockOpenAIModel);
      registry.registerModel(mockAnthropicModel);
      const models = registry.findModelsByType(ModelType.CHAT);
      expect(models).toHaveLength(2);
      expect(models).toContainEqual(mockOpenAIModel);
      expect(models).toContainEqual(mockAnthropicModel);
    });
    
    test('findModelsByCapability', () => {
      registry.registerModel(mockOpenAIModel);
      registry.registerModel(mockAnthropicModel);
      const models = registry.findModelsByCapability(ModelCapability.CODE_GENERATION);
      expect(models).toHaveLength(2);
      expect(models).toContainEqual(mockOpenAIModel);
      expect(models).toContainEqual(mockAnthropicModel);
    });
    
    test('findModelsByCriteria', () => {
      registry.registerModel(mockOpenAIModel);
      registry.registerModel(mockAnthropicModel);
      const models = registry.findModelsByCriteria({
        type: ModelType.CHAT,
        provider: ModelProvider.OPENAI
      });
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual(mockOpenAIModel);
    });
    
    test('emits events', () => {
      const registerListener = jest.fn();
      const unregisterListener = jest.fn();
      
      registry.on(ModelRegistryEvents.MODEL_REGISTERED, registerListener);
      registry.on(ModelRegistryEvents.MODEL_UNREGISTERED, unregisterListener);
      
      registry.registerModel(mockOpenAIModel);
      expect(registerListener).toHaveBeenCalledWith(mockOpenAIModel);
      
      registry.unregisterModel(mockOpenAIModel.id);
      expect(unregisterListener).toHaveBeenCalledWith(mockOpenAIModel);
    });
  });
  
  describe('ModelManager', () => {
    let manager: ModelManagerImpl;
    let registry: ModelRegistryImpl;
    let openaiAdapter: any;
    let anthropicAdapter: any;
    
    beforeEach(() => {
      registry = new ModelRegistryImpl();
      manager = new ModelManagerImpl(registry);
      
      // Create adapters
      openaiAdapter = new OpenAIModelAdapter('mock-api-key');
      anthropicAdapter = new AnthropicModelAdapter('mock-api-key');
      
      // Register adapters
      manager.registerAdapter(ModelProvider.OPENAI, openaiAdapter);
      manager.registerAdapter(ModelProvider.ANTHROPIC, anthropicAdapter);
    });
    
    test('initialize', async () => {
      const initListener = jest.fn();
      manager.on(ModelManagerEvents.INITIALIZED, initListener);
      
      await manager.initialize();
      
      expect(manager['initialized']).toBe(true);
      expect(initListener).toHaveBeenCalled();
      
      // Check if models are loaded
      const models = registry.getModels();
      expect(models).toHaveLength(2);
      expect(models).toContainEqual(mockOpenAIModel);
      expect(models).toContainEqual(mockAnthropicModel);
    });
    
    test('getRegistry', () => {
      expect(manager.getRegistry()).toBe(registry);
    });
    
    test('getAdapter', () => {
      expect(manager.getAdapter(ModelProvider.OPENAI)).toBe(openaiAdapter);
      expect(manager.getAdapter(ModelProvider.ANTHROPIC)).toBe(anthropicAdapter);
      expect(manager.getAdapter(ModelProvider.GOOGLE)).toBeNull();
    });
    
    test('getAdapterForModel', async () => {
      await manager.initialize();
      
      expect(manager.getAdapterForModel('gpt-4')).toBe(openaiAdapter);
      expect(manager.getAdapterForModel('claude-3')).toBe(anthropicAdapter);
      expect(manager.getAdapterForModel('unknown-model')).toBeNull();
    });
    
    test('generateText', async () => {
      await manager.initialize();
      
      const response = await manager.generateText({
        model: 'gpt-4',
        prompt: 'Hello, world!'
      });
      
      expect(openaiAdapter.generateText).toHaveBeenCalled();
      expect(response.choices[0].text).toBe('Mock response from OpenAI');
    });
    
    test('generateChatResponse', async () => {
      await manager.initialize();
      
      const response = await manager.generateChatResponse({
        model: 'claude-3',
        messages: [
          {
            role: 'user',
            content: 'Hello, world!'
          }
        ]
      });
      
      expect(anthropicAdapter.generateChatResponse).toHaveBeenCalled();
      expect(response.choices[0].message?.content).toBe('Mock response from Anthropic');
    });
    
    test('generateEmbeddings', async () => {
      await manager.initialize();
      
      const embeddings = await manager.generateEmbeddings({
        model: 'gpt-4',
        input: 'Hello, world!'
      });
      
      expect(openaiAdapter.generateEmbeddings).toHaveBeenCalled();
      expect(embeddings).toEqual([[0.1, 0.2, 0.3]]);
      
      // Anthropic doesn't support embeddings
      await expect(
        manager.generateEmbeddings({
          model: 'claude-3',
          input: 'Hello, world!'
        })
      ).rejects.toThrow('Anthropic does not support embeddings');
    });
    
    test('suggestModel', async () => {
      await manager.initialize();
      
      // First, add a cheaper model
      registry.registerModel({
        ...mockOpenAIModel,
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        inputCostPer1KTokens: 0.001,
        outputCostPer1KTokens: 0.002
      });
      
      // Should suggest the cheapest model that meets the criteria
      const model = manager.suggestModel(
        ModelType.CHAT,
        [ModelCapability.TEXT_GENERATION],
        { provider: ModelProvider.OPENAI }
      );
      
      expect(model?.id).toBe('gpt-3.5-turbo');
    });
  });
});