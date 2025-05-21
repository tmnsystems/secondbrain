/**
 * AI Model Abstraction Layer Types
 * @module ai-models/types
 */

/**
 * Model provider type
 */
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  COHERE = 'cohere',
  GOOGLE = 'google',
  TOGETHER = 'together',
  LLAMA = 'llama',
  MISTRAL = 'mistral',
  CUSTOM = 'custom',
}

/**
 * Model type
 */
export enum ModelType {
  TEXT = 'text',
  CHAT = 'chat',
  EMBEDDING = 'embedding',
  IMAGE = 'image',
  AUDIO = 'audio',
  MULTIMODAL = 'multimodal',
}

/**
 * Model capabilities
 */
export enum ModelCapability {
  TEXT_GENERATION = 'text-generation',
  CHAT = 'chat',
  COMPLETION = 'completion',
  SUMMARIZATION = 'summarization',
  CLASSIFICATION = 'classification',
  EMBEDDINGS = 'embeddings',
  CODE_GENERATION = 'code-generation',
  FUNCTION_CALLING = 'function-calling',
  TOOL_CALLING = 'tool-calling',
  IMAGE_GENERATION = 'image-generation',
  IMAGE_UNDERSTANDING = 'image-understanding',
  AUDIO_TRANSCRIPTION = 'audio-transcription',
  AUDIO_GENERATION = 'audio-generation',
  VISION = 'vision',
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  /** Unique model ID */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Model version */
  version: string;
  /** Model provider */
  provider: ModelProvider;
  /** Model type */
  type: ModelType;
  /** Model capabilities */
  capabilities: ModelCapability[];
  /** Model context window size (in tokens) */
  contextWindow: number;
  /** Model input cost per 1K tokens */
  inputCostPer1KTokens?: number;
  /** Model output cost per 1K tokens */
  outputCostPer1KTokens?: number;
  /** Maximum number of concurrent requests */
  maxConcurrentRequests?: number;
  /** Supported languages */
  supportedLanguages?: string[];
  /** Whether the model is deprecated */
  deprecated?: boolean;
  /** When the model will be deprecated */
  deprecationDate?: string;
  /** Whether the model supports streaming */
  supportsStreaming?: boolean;
  /** API version required for this model */
  apiVersion?: string;
}

/**
 * Generic model parameters
 */
export interface ModelParameters {
  /** Temperature parameter (0-2) */
  temperature?: number;
  /** Top-p parameter (0-1) */
  topP?: number;
  /** Top-k parameter */
  topK?: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Whether to stream the response */
  stream?: boolean;
  /** Function definitions for function calling */
  functions?: any[];
  /** Tools for tool calling */
  tools?: any[];
  /** System message for chat models */
  systemMessage?: string;
  /** Response format */
  responseFormat?: string | Record<string, any>;
  /** Presence penalty */
  presencePenalty?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Logit bias */
  logitBias?: Record<string, number>;
  /** Random seed */
  seed?: number;
  /** Additional model-specific parameters */
  [key: string]: any;
}

/**
 * Message role
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
  FUNCTION = 'function',
}

/**
 * Message content part type
 */
export enum ContentPartType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

/**
 * Message content part
 */
export interface ContentPart {
  /** Content part type */
  type: ContentPartType;
  /** Content or URL */
  content: string;
  /** Media type (for non-text content) */
  mediaType?: string;
  /** Additional part-specific parameters */
  [key: string]: any;
}

/**
 * Message for chat models
 */
export interface Message {
  /** Message role */
  role: MessageRole;
  /** Message content (string or ContentPart[]) */
  content: string | ContentPart[];
  /** Message name (for function/tool) */
  name?: string;
  /** Message ID */
  id?: string;
  /** Additional message-specific parameters */
  [key: string]: any;
}

/**
 * Model request for text-based models
 */
export interface TextModelRequest {
  /** Model to use */
  model: string;
  /** Input prompt */
  prompt: string;
  /** Model parameters */
  parameters?: ModelParameters;
}

/**
 * Model request for chat models
 */
export interface ChatModelRequest {
  /** Model to use */
  model: string;
  /** Input messages */
  messages: Message[];
  /** Model parameters */
  parameters?: ModelParameters;
}

/**
 * Model request for embedding models
 */
export interface EmbeddingModelRequest {
  /** Model to use */
  model: string;
  /** Input text */
  input: string | string[];
  /** Model parameters */
  parameters?: ModelParameters;
}

/**
 * Model request for image generation models
 */
export interface ImageGenerationModelRequest {
  /** Model to use */
  model: string;
  /** Input prompt */
  prompt: string;
  /** Number of images to generate */
  n?: number;
  /** Image size */
  size?: string;
  /** Image format */
  format?: string;
  /** Model parameters */
  parameters?: ModelParameters;
}

/**
 * Generic model request type
 */
export type ModelRequest =
  | TextModelRequest
  | ChatModelRequest
  | EmbeddingModelRequest
  | ImageGenerationModelRequest;

/**
 * Model usage information
 */
export interface ModelUsage {
  /** Number of input tokens */
  inputTokens: number;
  /** Number of output tokens */
  outputTokens: number;
  /** Total number of tokens */
  totalTokens: number;
  /** Input cost */
  inputCost?: number;
  /** Output cost */
  outputCost?: number;
  /** Total cost */
  totalCost?: number;
}

/**
 * Function call result
 */
export interface FunctionCall {
  /** Function name */
  name: string;
  /** Function arguments (as JSON string) */
  arguments: string;
}

/**
 * Tool call result
 */
export interface ToolCall {
  /** Tool call ID */
  id: string;
  /** Tool name */
  name: string;
  /** Tool arguments (as JSON string) */
  arguments: string;
}

/**
 * Choice in a model response
 */
export interface ResponseChoice {
  /** Generated text */
  text?: string;
  /** Generated message */
  message?: Message;
  /** Index of this choice */
  index: number;
  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'function_call' | 'tool_call' | 'content_filter' | null;
  /** Function call */
  functionCall?: FunctionCall;
  /** Tool calls */
  toolCalls?: ToolCall[];
}

/**
 * Model response
 */
export interface ModelResponse {
  /** Response ID */
  id: string;
  /** Response object */
  object: string;
  /** Created timestamp */
  created: number;
  /** Model used */
  model: string;
  /** Response choices */
  choices: ResponseChoice[];
  /** Usage statistics */
  usage?: ModelUsage;
  /** Provider-specific fields */
  [key: string]: any;
}

/**
 * Chunk in a streaming response
 */
export interface StreamingResponseChunk {
  /** Chunk ID */
  id: string;
  /** Chunk object */
  object: string;
  /** Created timestamp */
  created: number;
  /** Model used */
  model: string;
  /** Chunk choices */
  choices: ResponseChoice[];
  /** Whether this is the last chunk */
  done: boolean;
}

/**
 * Model adapter interface
 */
export interface ModelAdapter {
  /** Get the provider associated with this adapter */
  getProvider(): ModelProvider;
  /** Get the models supported by this adapter */
  getModels(): Promise<ModelMetadata[]>;
  /** Get a specific model by ID */
  getModel(modelId: string): Promise<ModelMetadata | null>;
  /** Generate text with a text model */
  generateText(request: TextModelRequest): Promise<ModelResponse>;
  /** Generate chat response with a chat model */
  generateChatResponse(request: ChatModelRequest): Promise<ModelResponse>;
  /** Generate embeddings with an embedding model */
  generateEmbeddings(request: EmbeddingModelRequest): Promise<number[][]>;
  /** Generate images with an image generation model */
  generateImages(request: ImageGenerationModelRequest): Promise<string[]>;
  /** Stream text generation */
  streamText(request: TextModelRequest): AsyncIterableIterator<StreamingResponseChunk>;
  /** Stream chat response generation */
  streamChatResponse(request: ChatModelRequest): AsyncIterableIterator<StreamingResponseChunk>;
  /** Count tokens in a text */
  countTokens(text: string, modelId: string): Promise<number>;
  /** Count tokens in messages */
  countMessageTokens(messages: Message[], modelId: string): Promise<number>;
}

/**
 * Model registry interface
 */
export interface ModelRegistry {
  /** Register a model */
  registerModel(model: ModelMetadata): void;
  /** Unregister a model */
  unregisterModel(modelId: string): void;
  /** Get all registered models */
  getModels(): ModelMetadata[];
  /** Get a specific model by ID */
  getModel(modelId: string): ModelMetadata | null;
  /** Find models by provider */
  findModelsByProvider(provider: ModelProvider): ModelMetadata[];
  /** Find models by type */
  findModelsByType(type: ModelType): ModelMetadata[];
  /** Find models by capability */
  findModelsByCapability(capability: ModelCapability): ModelMetadata[];
  /** Find models by criteria */
  findModelsByCriteria(criteria: Partial<ModelMetadata>): ModelMetadata[];
}

/**
 * Model adapter factory interface
 */
export interface ModelAdapterFactory {
  /** Create a model adapter for a provider */
  createAdapter(provider: ModelProvider, config?: any): Promise<ModelAdapter>;
  /** Get supported providers */
  getSupportedProviders(): ModelProvider[];
}

/**
 * Model manager interface
 */
export interface ModelManager {
  /** Initialize the model manager */
  initialize(): Promise<void>;
  /** Get the model registry */
  getRegistry(): ModelRegistry;
  /** Register a model adapter */
  registerAdapter(provider: ModelProvider, adapter: ModelAdapter): void;
  /** Get a model adapter */
  getAdapter(provider: ModelProvider): ModelAdapter | null;
  /** Get a model adapter by model ID */
  getAdapterForModel(modelId: string): ModelAdapter | null;
  /** Generate text with a text model */
  generateText(request: TextModelRequest): Promise<ModelResponse>;
  /** Generate chat response with a chat model */
  generateChatResponse(request: ChatModelRequest): Promise<ModelResponse>;
  /** Generate embeddings with an embedding model */
  generateEmbeddings(request: EmbeddingModelRequest): Promise<number[][]>;
  /** Generate images with an image generation model */
  generateImages(request: ImageGenerationModelRequest): Promise<string[]>;
  /** Stream text generation */
  streamText(request: TextModelRequest): AsyncIterableIterator<StreamingResponseChunk>;
  /** Stream chat response generation */
  streamChatResponse(request: ChatModelRequest): AsyncIterableIterator<StreamingResponseChunk>;
  /** Count tokens in a text */
  countTokens(text: string, modelId: string): Promise<number>;
  /** Count tokens in messages */
  countMessageTokens(messages: Message[], modelId: string): Promise<number>;
  /** Suggest the best model for a task */
  suggestModel(type: ModelType, capabilities: ModelCapability[], constraints?: Partial<ModelMetadata>): ModelMetadata | null;
}