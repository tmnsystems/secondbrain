/**
 * Model Adapter
 * @module ai-models/model-adapter
 */

import {
  ModelAdapter,
  ModelProvider,
  ModelMetadata,
  TextModelRequest,
  ChatModelRequest,
  EmbeddingModelRequest,
  ImageGenerationModelRequest,
  ModelResponse,
  Message,
  StreamingResponseChunk
} from './types';

/**
 * Base class for model adapters
 */
export abstract class BaseModelAdapter implements ModelAdapter {
  protected provider: ModelProvider;
  protected models: Map<string, ModelMetadata>;
  protected logger: any;

  /**
   * Create a new BaseModelAdapter
   * @param provider The provider
   * @param logger Optional logger
   */
  constructor(provider: ModelProvider, logger?: any) {
    this.provider = provider;
    this.models = new Map();
    this.logger = logger || console;
  }

  /**
   * Get the provider associated with this adapter
   * @returns The provider
   */
  getProvider(): ModelProvider {
    return this.provider;
  }

  /**
   * Get the models supported by this adapter
   * @returns Promise resolving to an array of model metadata
   */
  async getModels(): Promise<ModelMetadata[]> {
    // If the models are already loaded, return them
    if (this.models.size > 0) {
      return Array.from(this.models.values());
    }

    // Otherwise, load the models
    const models = await this.loadModels();

    // Store the models in the map
    for (const model of models) {
      this.models.set(model.id, model);
    }

    return models;
  }

  /**
   * Get a specific model by ID
   * @param modelId The model ID
   * @returns Promise resolving to the model or null if not found
   */
  async getModel(modelId: string): Promise<ModelMetadata | null> {
    // If the model is already loaded, return it
    if (this.models.has(modelId)) {
      return this.models.get(modelId) || null;
    }

    // Otherwise, load the models
    await this.getModels();

    // Return the model if it exists
    return this.models.get(modelId) || null;
  }

  /**
   * Load the models from the provider
   * @returns Promise resolving to an array of model metadata
   */
  protected abstract loadModels(): Promise<ModelMetadata[]>;

  /**
   * Generate text with a text model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  abstract generateText(request: TextModelRequest): Promise<ModelResponse>;

  /**
   * Generate chat response with a chat model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  abstract generateChatResponse(request: ChatModelRequest): Promise<ModelResponse>;

  /**
   * Generate embeddings with an embedding model
   * @param request The request
   * @returns Promise resolving to the embeddings
   */
  abstract generateEmbeddings(request: EmbeddingModelRequest): Promise<number[][]>;

  /**
   * Generate images with an image generation model
   * @param request The request
   * @returns Promise resolving to the image URLs
   */
  abstract generateImages(request: ImageGenerationModelRequest): Promise<string[]>;

  /**
   * Stream text generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  abstract streamText(request: TextModelRequest): AsyncIterableIterator<StreamingResponseChunk>;

  /**
   * Stream chat response generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  abstract streamChatResponse(request: ChatModelRequest): AsyncIterableIterator<StreamingResponseChunk>;

  /**
   * Count tokens in a text
   * @param text The text
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  abstract countTokens(text: string, modelId: string): Promise<number>;

  /**
   * Count tokens in messages
   * @param messages The messages
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  abstract countMessageTokens(messages: Message[], modelId: string): Promise<number>;
}

/**
 * OpenAI model adapter
 */
export class OpenAIModelAdapter extends BaseModelAdapter {
  private client: any;
  private apiKey: string;

  /**
   * Create a new OpenAIModelAdapter
   * @param apiKey OpenAI API key
   * @param logger Optional logger
   */
  constructor(apiKey: string, logger?: any) {
    super(ModelProvider.OPENAI, logger);
    this.apiKey = apiKey;
    
    // In a real implementation, we would use the OpenAI client
    this.client = {
      // Mock client for example purposes
    };
  }

  /**
   * Load the models from OpenAI
   * @returns Promise resolving to an array of model metadata
   */
  protected async loadModels(): Promise<ModelMetadata[]> {
    // In a real implementation, this would fetch the models from the OpenAI API
    // For this example, we'll return some predefined models
    return [
      // Text models
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        version: '2024-05-01',
        provider: ModelProvider.OPENAI,
        type: ModelType.CHAT,
        capabilities: [
          ModelCapability.CHAT,
          ModelCapability.TEXT_GENERATION,
          ModelCapability.SUMMARIZATION,
          ModelCapability.CLASSIFICATION,
          ModelCapability.CODE_GENERATION,
          ModelCapability.FUNCTION_CALLING,
          ModelCapability.TOOL_CALLING,
          ModelCapability.VISION,
        ],
        contextWindow: 128000,
        inputCostPer1KTokens: 0.005,
        outputCostPer1KTokens: 0.015,
        supportsStreaming: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        version: '2024-04-09',
        provider: ModelProvider.OPENAI,
        type: ModelType.CHAT,
        capabilities: [
          ModelCapability.CHAT,
          ModelCapability.TEXT_GENERATION,
          ModelCapability.SUMMARIZATION,
          ModelCapability.CLASSIFICATION,
          ModelCapability.CODE_GENERATION,
          ModelCapability.FUNCTION_CALLING,
          ModelCapability.TOOL_CALLING,
          ModelCapability.VISION,
        ],
        contextWindow: 128000,
        inputCostPer1KTokens: 0.01,
        outputCostPer1KTokens: 0.03,
        supportsStreaming: true,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        version: '2024-02-15',
        provider: ModelProvider.OPENAI,
        type: ModelType.CHAT,
        capabilities: [
          ModelCapability.CHAT,
          ModelCapability.TEXT_GENERATION,
          ModelCapability.SUMMARIZATION,
          ModelCapability.CLASSIFICATION,
          ModelCapability.CODE_GENERATION,
          ModelCapability.FUNCTION_CALLING,
          ModelCapability.TOOL_CALLING,
        ],
        contextWindow: 16385,
        inputCostPer1KTokens: 0.0005,
        outputCostPer1KTokens: 0.0015,
        supportsStreaming: true,
      },
      
      // Embedding models
      {
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        version: '1',
        provider: ModelProvider.OPENAI,
        type: ModelType.EMBEDDING,
        capabilities: [
          ModelCapability.EMBEDDINGS,
        ],
        contextWindow: 8191,
        inputCostPer1KTokens: 0.00013,
        supportsStreaming: false,
      },
    ];
  }

  /**
   * Generate text with a text model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  async generateText(request: TextModelRequest): Promise<ModelResponse> {
    // In a real implementation, this would call the OpenAI API
    // For this example, we'll return a mock response
    return {
      id: 'mock-response-id',
      object: 'text_completion',
      created: Date.now(),
      model: request.model,
      choices: [
        {
          text: 'This is a mock response from OpenAI.',
          index: 0,
          finishReason: 'stop',
        },
      ],
      usage: {
        inputTokens: 10,
        outputTokens: 8,
        totalTokens: 18,
      },
    };
  }

  /**
   * Generate chat response with a chat model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  async generateChatResponse(request: ChatModelRequest): Promise<ModelResponse> {
    // In a real implementation, this would call the OpenAI API
    // For this example, we'll return a mock response
    return {
      id: 'mock-response-id',
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a mock response from OpenAI.',
          },
          index: 0,
          finishReason: 'stop',
        },
      ],
      usage: {
        inputTokens: 20,
        outputTokens: 8,
        totalTokens: 28,
      },
    };
  }

  /**
   * Generate embeddings with an embedding model
   * @param request The request
   * @returns Promise resolving to the embeddings
   */
  async generateEmbeddings(request: EmbeddingModelRequest): Promise<number[][]> {
    // In a real implementation, this would call the OpenAI API
    // For this example, we'll return mock embeddings
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    return inputs.map(() => Array(1536).fill(0).map(() => Math.random() * 2 - 1));
  }

  /**
   * Generate images with an image generation model
   * @param request The request
   * @returns Promise resolving to the image URLs
   */
  async generateImages(request: ImageGenerationModelRequest): Promise<string[]> {
    // In a real implementation, this would call the OpenAI API
    // For this example, we'll return mock image URLs
    const n = request.n || 1;
    return Array(n).fill(0).map((_, i) => `https://example.com/mock-image-${i}.png`);
  }

  /**
   * Stream text generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  async *streamText(request: TextModelRequest): AsyncIterableIterator<StreamingResponseChunk> {
    // In a real implementation, this would stream responses from the OpenAI API
    // For this example, we'll yield mock chunks
    const chunks = ['This ', 'is ', 'a ', 'mock ', 'response ', 'from ', 'OpenAI.'];
    
    for (const [i, chunk] of chunks.entries()) {
      yield {
        id: `mock-chunk-${i}`,
        object: 'text_completion.chunk',
        created: Date.now(),
        model: request.model,
        choices: [
          {
            text: chunk,
            index: 0,
            finishReason: i === chunks.length - 1 ? 'stop' : null,
          },
        ],
        done: i === chunks.length - 1,
      };
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Stream chat response generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  async *streamChatResponse(request: ChatModelRequest): AsyncIterableIterator<StreamingResponseChunk> {
    // In a real implementation, this would stream responses from the OpenAI API
    // For this example, we'll yield mock chunks
    const chunks = ['This ', 'is ', 'a ', 'mock ', 'response ', 'from ', 'OpenAI.'];
    
    for (const [i, chunk] of chunks.entries()) {
      yield {
        id: `mock-chunk-${i}`,
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: request.model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: chunk,
            },
            index: 0,
            finishReason: i === chunks.length - 1 ? 'stop' : null,
          },
        ],
        done: i === chunks.length - 1,
      };
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Count tokens in a text
   * @param text The text
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  async countTokens(text: string, modelId: string): Promise<number> {
    // In a real implementation, this would use a tokenizer
    // For this example, we'll use a simple approximation
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in messages
   * @param messages The messages
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  async countMessageTokens(messages: Message[], modelId: string): Promise<number> {
    // In a real implementation, this would use a tokenizer and account for message format
    // For this example, we'll use a simple approximation
    let count = 0;
    
    for (const message of messages) {
      if (typeof message.content === 'string') {
        count += Math.ceil(message.content.length / 4);
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'text') {
            count += Math.ceil(part.content.length / 4);
          } else {
            // Image/other parts count as tokens too
            count += 100;
          }
        }
      }
    }
    
    return count;
  }
}

/**
 * Anthropic model adapter
 */
export class AnthropicModelAdapter extends BaseModelAdapter {
  private client: any;
  private apiKey: string;

  /**
   * Create a new AnthropicModelAdapter
   * @param apiKey Anthropic API key
   * @param logger Optional logger
   */
  constructor(apiKey: string, logger?: any) {
    super(ModelProvider.ANTHROPIC, logger);
    this.apiKey = apiKey;
    
    // In a real implementation, we would use the Anthropic client
    this.client = {
      // Mock client for example purposes
    };
  }

  /**
   * Load the models from Anthropic
   * @returns Promise resolving to an array of model metadata
   */
  protected async loadModels(): Promise<ModelMetadata[]> {
    // In a real implementation, this would fetch the models from the Anthropic API
    // For this example, we'll return some predefined models
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        version: '20240229',
        provider: ModelProvider.ANTHROPIC,
        type: ModelType.CHAT,
        capabilities: [
          ModelCapability.CHAT,
          ModelCapability.TEXT_GENERATION,
          ModelCapability.SUMMARIZATION,
          ModelCapability.CLASSIFICATION,
          ModelCapability.CODE_GENERATION,
          ModelCapability.TOOL_CALLING,
          ModelCapability.VISION,
        ],
        contextWindow: 200000,
        inputCostPer1KTokens: 0.015,
        outputCostPer1KTokens: 0.075,
        supportsStreaming: true,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        version: '20240229',
        provider: ModelProvider.ANTHROPIC,
        type: ModelType.CHAT,
        capabilities: [
          ModelCapability.CHAT,
          ModelCapability.TEXT_GENERATION,
          ModelCapability.SUMMARIZATION,
          ModelCapability.CLASSIFICATION,
          ModelCapability.CODE_GENERATION,
          ModelCapability.TOOL_CALLING,
          ModelCapability.VISION,
        ],
        contextWindow: 200000,
        inputCostPer1KTokens: 0.003,
        outputCostPer1KTokens: 0.015,
        supportsStreaming: true,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        version: '20240307',
        provider: ModelProvider.ANTHROPIC,
        type: ModelType.CHAT,
        capabilities: [
          ModelCapability.CHAT,
          ModelCapability.TEXT_GENERATION,
          ModelCapability.SUMMARIZATION,
          ModelCapability.CLASSIFICATION,
          ModelCapability.CODE_GENERATION,
          ModelCapability.TOOL_CALLING,
          ModelCapability.VISION,
        ],
        contextWindow: 200000,
        inputCostPer1KTokens: 0.00025,
        outputCostPer1KTokens: 0.00125,
        supportsStreaming: true,
      },
    ];
  }

  /**
   * Generate text with a text model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  async generateText(request: TextModelRequest): Promise<ModelResponse> {
    // Anthropic doesn't support text completion directly, so we'll wrap it as a chat
    return this.generateChatResponse({
      model: request.model,
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      parameters: request.parameters,
    });
  }

  /**
   * Generate chat response with a chat model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  async generateChatResponse(request: ChatModelRequest): Promise<ModelResponse> {
    // In a real implementation, this would call the Anthropic API
    // For this example, we'll return a mock response
    return {
      id: 'mock-response-id',
      object: 'message',
      created: Date.now(),
      model: request.model,
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a mock response from Anthropic.',
          },
          index: 0,
          finishReason: 'stop',
        },
      ],
      usage: {
        inputTokens: 20,
        outputTokens: 8,
        totalTokens: 28,
      },
    };
  }

  /**
   * Generate embeddings with an embedding model
   * @param request The request
   * @returns Promise resolving to the embeddings
   */
  async generateEmbeddings(request: EmbeddingModelRequest): Promise<number[][]> {
    // Anthropic doesn't provide embedding models yet
    throw new Error('Anthropic does not support embeddings');
  }

  /**
   * Generate images with an image generation model
   * @param request The request
   * @returns Promise resolving to the image URLs
   */
  async generateImages(request: ImageGenerationModelRequest): Promise<string[]> {
    // Anthropic doesn't provide image generation models yet
    throw new Error('Anthropic does not support image generation');
  }

  /**
   * Stream text generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  async *streamText(request: TextModelRequest): AsyncIterableIterator<StreamingResponseChunk> {
    // Anthropic doesn't support text completion directly, so we'll wrap it as a chat
    yield* this.streamChatResponse({
      model: request.model,
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      parameters: request.parameters,
    });
  }

  /**
   * Stream chat response generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  async *streamChatResponse(request: ChatModelRequest): AsyncIterableIterator<StreamingResponseChunk> {
    // In a real implementation, this would stream responses from the Anthropic API
    // For this example, we'll yield mock chunks
    const chunks = ['This ', 'is ', 'a ', 'mock ', 'response ', 'from ', 'Anthropic.'];
    
    for (const [i, chunk] of chunks.entries()) {
      yield {
        id: `mock-chunk-${i}`,
        object: 'message.delta',
        created: Date.now(),
        model: request.model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: chunk,
            },
            index: 0,
            finishReason: i === chunks.length - 1 ? 'stop' : null,
          },
        ],
        done: i === chunks.length - 1,
      };
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Count tokens in a text
   * @param text The text
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  async countTokens(text: string, modelId: string): Promise<number> {
    // In a real implementation, this would use the Anthropic tokenizer
    // For this example, we'll use a simple approximation
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in messages
   * @param messages The messages
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  async countMessageTokens(messages: Message[], modelId: string): Promise<number> {
    // In a real implementation, this would use the Anthropic tokenizer
    // For this example, we'll use a simple approximation
    let count = 0;
    
    for (const message of messages) {
      if (typeof message.content === 'string') {
        count += Math.ceil(message.content.length / 4);
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'text') {
            count += Math.ceil(part.content.length / 4);
          } else {
            // Image/other parts count as tokens too
            count += 100;
          }
        }
      }
    }
    
    return count;
  }
}