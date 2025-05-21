/**
 * Model Manager
 * @module ai-models/model-manager
 */

import { EventEmitter } from 'events';
import {
  ModelManager,
  ModelRegistry,
  ModelAdapter,
  ModelProvider,
  ModelType,
  ModelCapability,
  ModelMetadata,
  TextModelRequest,
  ChatModelRequest,
  EmbeddingModelRequest,
  ImageGenerationModelRequest,
  ModelResponse,
  Message,
  StreamingResponseChunk
} from './types';
import { ModelRegistryImpl } from './model-registry';
import { OpenAIModelAdapter, AnthropicModelAdapter } from './model-adapter';

/**
 * Events emitted by the ModelManagerImpl
 */
export enum ModelManagerEvents {
  INITIALIZED = 'model-manager:initialized',
  ADAPTER_REGISTERED = 'model-manager:adapter:registered',
  MODEL_REGISTERED = 'model-manager:model:registered',
}

/**
 * Implementation of the ModelManager interface
 */
export class ModelManagerImpl implements ModelManager {
  private registry: ModelRegistry;
  private adapters: Map<ModelProvider, ModelAdapter>;
  private events: EventEmitter;
  private logger: any;
  private initialized: boolean;

  /**
   * Create a new ModelManagerImpl
   * @param registry Optional model registry
   * @param logger Optional logger
   */
  constructor(registry?: ModelRegistry, logger?: any) {
    this.registry = registry || new ModelRegistryImpl();
    this.adapters = new Map();
    this.events = new EventEmitter();
    this.logger = logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the model manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load models from all registered adapters
    for (const adapter of this.adapters.values()) {
      await this.loadModelsFromAdapter(adapter);
    }

    this.initialized = true;
    this.events.emit(ModelManagerEvents.INITIALIZED);
  }

  /**
   * Get the model registry
   * @returns The model registry
   */
  getRegistry(): ModelRegistry {
    return this.registry;
  }

  /**
   * Register a model adapter
   * @param provider The provider
   * @param adapter The adapter
   */
  registerAdapter(provider: ModelProvider, adapter: ModelAdapter): void {
    this.adapters.set(provider, adapter);
    this.events.emit(ModelManagerEvents.ADAPTER_REGISTERED, provider, adapter);

    // If already initialized, load models from the adapter
    if (this.initialized) {
      this.loadModelsFromAdapter(adapter).catch(error => {
        this.logger.error(`Failed to load models from adapter for provider ${provider}:`, error);
      });
    }
  }

  /**
   * Get a model adapter
   * @param provider The provider
   * @returns The adapter or null if not found
   */
  getAdapter(provider: ModelProvider): ModelAdapter | null {
    return this.adapters.get(provider) || null;
  }

  /**
   * Get a model adapter by model ID
   * @param modelId The model ID
   * @returns The adapter or null if not found
   */
  getAdapterForModel(modelId: string): ModelAdapter | null {
    const model = this.registry.getModel(modelId);
    
    if (!model) {
      return null;
    }
    
    return this.getAdapter(model.provider);
  }

  /**
   * Generate text with a text model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  async generateText(request: TextModelRequest): Promise<ModelResponse> {
    const adapter = this.getAdapterForModel(request.model);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${request.model}`);
    }
    
    return adapter.generateText(request);
  }

  /**
   * Generate chat response with a chat model
   * @param request The request
   * @returns Promise resolving to the model response
   */
  async generateChatResponse(request: ChatModelRequest): Promise<ModelResponse> {
    const adapter = this.getAdapterForModel(request.model);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${request.model}`);
    }
    
    return adapter.generateChatResponse(request);
  }

  /**
   * Generate embeddings with an embedding model
   * @param request The request
   * @returns Promise resolving to the embeddings
   */
  async generateEmbeddings(request: EmbeddingModelRequest): Promise<number[][]> {
    const adapter = this.getAdapterForModel(request.model);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${request.model}`);
    }
    
    return adapter.generateEmbeddings(request);
  }

  /**
   * Generate images with an image generation model
   * @param request The request
   * @returns Promise resolving to the image URLs
   */
  async generateImages(request: ImageGenerationModelRequest): Promise<string[]> {
    const adapter = this.getAdapterForModel(request.model);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${request.model}`);
    }
    
    return adapter.generateImages(request);
  }

  /**
   * Stream text generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  async *streamText(request: TextModelRequest): AsyncIterableIterator<StreamingResponseChunk> {
    const adapter = this.getAdapterForModel(request.model);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${request.model}`);
    }
    
    yield* adapter.streamText(request);
  }

  /**
   * Stream chat response generation
   * @param request The request
   * @returns Async iterable of streaming response chunks
   */
  async *streamChatResponse(request: ChatModelRequest): AsyncIterableIterator<StreamingResponseChunk> {
    const adapter = this.getAdapterForModel(request.model);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${request.model}`);
    }
    
    yield* adapter.streamChatResponse(request);
  }

  /**
   * Count tokens in a text
   * @param text The text
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  async countTokens(text: string, modelId: string): Promise<number> {
    const adapter = this.getAdapterForModel(modelId);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${modelId}`);
    }
    
    return adapter.countTokens(text, modelId);
  }

  /**
   * Count tokens in messages
   * @param messages The messages
   * @param modelId The model ID
   * @returns Promise resolving to the token count
   */
  async countMessageTokens(messages: Message[], modelId: string): Promise<number> {
    const adapter = this.getAdapterForModel(modelId);
    
    if (!adapter) {
      throw new Error(`No adapter found for model ${modelId}`);
    }
    
    return adapter.countMessageTokens(messages, modelId);
  }

  /**
   * Suggest the best model for a task
   * @param type The model type
   * @param capabilities The required capabilities
   * @param constraints Optional constraints
   * @returns The best model or null if none found
   */
  suggestModel(
    type: ModelType,
    capabilities: ModelCapability[],
    constraints?: Partial<ModelMetadata>
  ): ModelMetadata | null {
    // Build criteria
    const criteria: Partial<ModelMetadata> = {
      type,
      capabilities,
      ...constraints,
    };
    
    // Find models matching the criteria
    const models = this.registry.findModelsByCriteria(criteria);
    
    if (models.length === 0) {
      return null;
    }
    
    // Sort models by input cost (cheapest first)
    models.sort((a, b) => {
      const aCost = a.inputCostPer1KTokens || 0;
      const bCost = b.inputCostPer1KTokens || 0;
      return aCost - bCost;
    });
    
    // Return the cheapest model that meets the criteria
    return models[0];
  }

  /**
   * Create model adapters from configuration
   * @param config The configuration
   * @returns Promise resolving when adapters are created
   */
  async createAdaptersFromConfig(config: {
    openai?: {
      apiKey: string;
    };
    anthropic?: {
      apiKey: string;
    };
    // other providers...
  }): Promise<void> {
    // Create OpenAI adapter
    if (config.openai?.apiKey) {
      const openaiAdapter = new OpenAIModelAdapter(config.openai.apiKey, this.logger);
      this.registerAdapter(ModelProvider.OPENAI, openaiAdapter);
    }
    
    // Create Anthropic adapter
    if (config.anthropic?.apiKey) {
      const anthropicAdapter = new AnthropicModelAdapter(config.anthropic.apiKey, this.logger);
      this.registerAdapter(ModelProvider.ANTHROPIC, anthropicAdapter);
    }
    
    // Add other adapters as needed
  }

  /**
   * Load models from an adapter
   * @param adapter The adapter
   * @returns Promise resolving when models are loaded
   */
  private async loadModelsFromAdapter(adapter: ModelAdapter): Promise<void> {
    try {
      const models = await adapter.getModels();
      
      for (const model of models) {
        this.registry.registerModel(model);
        this.events.emit(ModelManagerEvents.MODEL_REGISTERED, model);
      }
    } catch (error) {
      this.logger.error(`Failed to load models from adapter for provider ${adapter.getProvider()}:`, error);
    }
  }

  /**
   * Subscribe to model manager events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: ModelManagerEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from model manager events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: ModelManagerEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}