# Blueprint 09: Future-Proof Escape Hatches

## Overview
This blueprint establishes strategic escape hatches for all major system dependencies, ensuring that SecondBrain can easily migrate between technologies and vendors with minimal disruption.

## Implementation Details

### LLM Adapter Layer

```typescript
// llm_client.ts - Vendor-neutral LLM client
import { Configuration, OpenAIApi } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OllamaClient } from './ollama';

/**
 * Unified interface for LLM operations, abstracting vendor differences
 */
export class LLMClient {
  private openai: OpenAIApi | null = null;
  private anthropic: Anthropic | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private ollama: OllamaClient | null = null;
  private activeProvider: 'openai' | 'anthropic' | 'google' | 'ollama' = 'anthropic';
  
  constructor(config: LLMClientConfig) {
    // Initialize all supported providers if credentials available
    if (config.openaiApiKey) {
      this.openai = new OpenAIApi(
        new Configuration({ apiKey: config.openaiApiKey })
      );
    }
    
    if (config.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey
      });
    }
    
    if (config.googleApiKey) {
      this.gemini = new GoogleGenerativeAI(config.googleApiKey);
    }
    
    if (config.ollamaEndpoint) {
      this.ollama = new OllamaClient({
        endpoint: config.ollamaEndpoint,
        modelName: config.ollamaModel || 'llama2'
      });
    }
    
    // Set active provider based on config
    if (config.preferredProvider) {
      this.activeProvider = config.preferredProvider;
    }
  }
  
  /**
   * Generate text completion from prompt
   */
  async complete(params: CompletionParams): Promise<CompletionResult> {
    try {
      switch (this.activeProvider) {
        case 'anthropic':
          return await this.completeWithAnthropic(params);
        case 'openai':
          return await this.completeWithOpenAI(params);
        case 'google':
          return await this.completeWithGoogle(params);
        case 'ollama':
          return await this.completeWithOllama(params);
        default:
          throw new Error(`Unknown provider: ${this.activeProvider}`);
      }
    } catch (error) {
      // If primary provider fails, try fallback if available
      if (params.fallback && params.fallback !== this.activeProvider) {
        console.warn(`Primary provider ${this.activeProvider} failed, trying fallback ${params.fallback}`);
        const previousProvider = this.activeProvider;
        this.activeProvider = params.fallback;
        
        try {
          const result = await this.complete({
            ...params,
            fallback: null // Prevent recursive fallbacks
          });
          
          // Reset to original provider after fallback
          this.activeProvider = previousProvider;
          return result;
        } catch (fallbackError) {
          // Reset to original provider even if fallback fails
          this.activeProvider = previousProvider;
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Generate embeddings for text
   */
  async embed(params: EmbeddingParams): Promise<EmbeddingResult> {
    switch (this.activeProvider) {
      case 'anthropic':
        throw new Error('Embeddings not supported by Anthropic');
      case 'openai':
        return await this.embedWithOpenAI(params);
      case 'google':
        return await this.embedWithGoogle(params);
      case 'ollama':
        return await this.embedWithOllama(params);
      default:
        throw new Error(`Unknown provider: ${this.activeProvider}`);
    }
  }
  
  /**
   * Switch active provider at runtime
   */
  setProvider(provider: 'openai' | 'anthropic' | 'google' | 'ollama'): void {
    if (!this[provider]) {
      throw new Error(`Provider ${provider} not initialized`);
    }
    this.activeProvider = provider;
  }
  
  // Individual provider implementations omitted for brevity
  private async completeWithAnthropic(params: CompletionParams): Promise<CompletionResult> {
    // Implementation details omitted
    return { text: '' };
  }
  
  private async completeWithOpenAI(params: CompletionParams): Promise<CompletionResult> {
    // Implementation details omitted
    return { text: '' };
  }
  
  private async completeWithGoogle(params: CompletionParams): Promise<CompletionResult> {
    // Implementation details omitted
    return { text: '' };
  }
  
  private async completeWithOllama(params: CompletionParams): Promise<CompletionResult> {
    // Implementation details omitted
    return { text: '' };
  }
  
  private async embedWithOpenAI(params: EmbeddingParams): Promise<EmbeddingResult> {
    // Implementation details omitted
    return { embeddings: [] };
  }
  
  private async embedWithGoogle(params: EmbeddingParams): Promise<EmbeddingResult> {
    // Implementation details omitted
    return { embeddings: [] };
  }
  
  private async embedWithOllama(params: EmbeddingParams): Promise<EmbeddingResult> {
    // Implementation details omitted
    return { embeddings: [] };
  }
}

export interface LLMClientConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  preferredProvider?: 'openai' | 'anthropic' | 'google' | 'ollama';
}

export interface CompletionParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  fallback?: 'openai' | 'anthropic' | 'google' | 'ollama' | null;
}

export interface CompletionResult {
  text: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface EmbeddingParams {
  text: string | string[];
  model?: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  dimensions?: number;
}
```

### Vector Database Adapter

```python
# /Volumes/Envoy/SecondBrain/context_system/vector_client.py
import os
import pinecone
import qdrant_client
from qdrant_client.models import VectorParams, Distance
import weaviate
from typing import Dict, Any, List, Optional, Union, Tuple

class VectorClient:
    """Vendor-neutral vector database client with uniform API for all supported backends"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize vector database client"""
        self.provider = config.get("provider", "pinecone")
        self.dimension = config.get("dimension", 1536)
        self.client = None
        self.index_name = config.get("index_name", "secondbrain-context")
        
        # Initialize appropriate client based on provider
        if self.provider == "pinecone":
            self._init_pinecone(config)
        elif self.provider == "qdrant":
            self._init_qdrant(config)
        elif self.provider == "weaviate":
            self._init_weaviate(config)
        else:
            raise ValueError(f"Unsupported vector provider: {self.provider}")
    
    def _init_pinecone(self, config: Dict[str, Any]) -> None:
        """Initialize Pinecone client"""
        pinecone.init(
            api_key=config.get("api_key") or os.environ.get("PINECONE_API_KEY"),
            environment=config.get("environment") or os.environ.get("PINECONE_ENVIRONMENT")
        )
        
        # Create index if it doesn't exist
        if self.index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric=config.get("metric", "cosine")
            )
        
        self.client = pinecone.Index(self.index_name)
    
    def _init_qdrant(self, config: Dict[str, Any]) -> None:
        """Initialize Qdrant client"""
        if config.get("url"):
            self.client = qdrant_client.QdrantClient(
                url=config["url"],
                api_key=config.get("api_key")
            )
        else:
            # Use local instance
            self.client = qdrant_client.QdrantClient(
                location=config.get("location", "local"),
                port=config.get("port", 6333)
            )
        
        # Create collection if it doesn't exist
        collections = self.client.get_collections().collections
        collection_names = [c.name for c in collections]
        
        if self.index_name not in collection_names:
            self.client.create_collection(
                collection_name=self.index_name,
                vectors_config=VectorParams(
                    size=self.dimension,
                    distance=Distance.COSINE
                )
            )
    
    def _init_weaviate(self, config: Dict[str, Any]) -> None:
        """Initialize Weaviate client"""
        self.client = weaviate.Client(
            url=config.get("url") or os.environ.get("WEAVIATE_URL"),
            auth_client_secret=weaviate.AuthApiKey(
                api_key=config.get("api_key") or os.environ.get("WEAVIATE_API_KEY")
            ) if config.get("api_key") or os.environ.get("WEAVIATE_API_KEY") else None
        )
        
        # Create class if it doesn't exist
        if not self.client.schema.exists(self.index_name):
            class_obj = {
                "class": self.index_name,
                "description": "SecondBrain context vectors",
                "vectorizer": "none",  # We'll provide our own vectors
                "vectorIndexType": "hnsw",
                "vectorIndexConfig": {
                    "distance": "cosine"
                }
            }
            self.client.schema.create_class(class_obj)
    
    def store(self, id: str, vector: List[float], metadata: Dict[str, Any]) -> bool:
        """Store vector with metadata"""
        try:
            if self.provider == "pinecone":
                self.client.upsert(
                    vectors=[(id, vector, metadata)],
                    namespace=metadata.get("namespace", "default")
                )
            elif self.provider == "qdrant":
                self.client.upsert(
                    collection_name=self.index_name,
                    points=[
                        qdrant_client.models.PointStruct(
                            id=id,
                            vector=vector,
                            payload=metadata
                        )
                    ]
                )
            elif self.provider == "weaviate":
                self.client.data_object.create(
                    class_name=self.index_name,
                    data_object=metadata,
                    uuid=id,
                    vector=vector
                )
            return True
        except Exception as e:
            print(f"Error storing vector: {e}")
            return False
    
    def retrieve(self, id: str) -> Optional[Dict[str, Any]]:
        """Retrieve vector by ID"""
        try:
            if self.provider == "pinecone":
                response = self.client.fetch([id])
                if response and response.get("vectors") and id in response["vectors"]:
                    vector_data = response["vectors"][id]
                    return {
                        "id": id,
                        "vector": vector_data["values"],
                        "metadata": vector_data["metadata"]
                    }
            elif self.provider == "qdrant":
                response = self.client.retrieve(
                    collection_name=self.index_name,
                    ids=[id],
                    with_vectors=True,
                    with_payload=True
                )
                if response and len(response) > 0:
                    return {
                        "id": response[0].id,
                        "vector": response[0].vector,
                        "metadata": response[0].payload
                    }
            elif self.provider == "weaviate":
                response = self.client.data_object.get_by_id(
                    class_name=self.index_name,
                    uuid=id,
                    with_vector=True
                )
                if response:
                    return {
                        "id": id,
                        "vector": response["vector"],
                        "metadata": {k: v for k, v in response.items() 
                                   if k not in ["id", "vector", "class"]}
                    }
            return None
        except Exception as e:
            print(f"Error retrieving vector: {e}")
            return None
    
    def search(self, query_vector: List[float], top_k: int = 5, 
             filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search for similar vectors"""
        try:
            if self.provider == "pinecone":
                filter_dict = filter_metadata or {}
                response = self.client.query(
                    vector=query_vector,
                    top_k=top_k,
                    include_metadata=True,
                    filter=filter_dict,
                    namespace=filter_dict.pop("namespace", "default") if filter_dict else "default"
                )
                
                return [{
                    "id": match["id"],
                    "score": match["score"],
                    "metadata": match["metadata"]
                } for match in response["matches"]]
                
            elif self.provider == "qdrant":
                filter_query = None
                if filter_metadata:
                    filter_query = self._convert_filter_to_qdrant(filter_metadata)
                
                response = self.client.search(
                    collection_name=self.index_name,
                    query_vector=query_vector,
                    limit=top_k,
                    query_filter=filter_query
                )
                
                return [{
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.payload
                } for match in response]
                
            elif self.provider == "weaviate":
                filter_query = None
                if filter_metadata:
                    filter_query = self._convert_filter_to_weaviate(filter_metadata)
                
                response = (
                    self.client.query
                    .get(self.index_name, ["id"] + list(filter_metadata.keys() if filter_metadata else []))
                    .with_near_vector({
                        "vector": query_vector
                    })
                    .with_limit(top_k)
                )
                
                if filter_query:
                    response = response.with_where(filter_query)
                
                result = response.do()
                
                return [{
                    "id": item["id"],
                    "score": item.get("_additional", {}).get("score", 1.0),
                    "metadata": {k: v for k, v in item.items() if k != "id"}
                } for item in result["data"]["Get"][self.index_name]]
                
            return []
            
        except Exception as e:
            print(f"Error searching vectors: {e}")
            return []
    
    def delete(self, id: str) -> bool:
        """Delete vector by ID"""
        try:
            if self.provider == "pinecone":
                self.client.delete(ids=[id])
            elif self.provider == "qdrant":
                self.client.delete(
                    collection_name=self.index_name,
                    points_selector=[id]
                )
            elif self.provider == "weaviate":
                self.client.data_object.delete(
                    class_name=self.index_name,
                    uuid=id
                )
            return True
        except Exception as e:
            print(f"Error deleting vector: {e}")
            return False
    
    def _convert_filter_to_qdrant(self, filter_metadata: Dict[str, Any]):
        """Convert filter dictionary to Qdrant filter format"""
        # Implementation details omitted
        return {}
    
    def _convert_filter_to_weaviate(self, filter_metadata: Dict[str, Any]):
        """Convert filter dictionary to Weaviate filter format"""
        # Implementation details omitted
        return {}
```

### Code Intelligence Escape Hatch

```typescript
// code_intel_client.ts - Vendor-neutral code intelligence client
import axios from 'axios';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const exec = promisify(require('child_process').exec);

/**
 * Interface for all code intelligence operations
 */
export interface CodeIntelClient {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getDefinition(file: string, line: number, character: number): Promise<Location | null>;
  getReferences(file: string, line: number, character: number): Promise<Location[]>;
  getFileContent(path: string): Promise<string>;
}

/**
 * Factory for creating appropriate code intelligence client
 */
export class CodeIntelFactory {
  static createClient(type: 'sourcegraph' | 'livegrep' | 'opengrok', config: any): CodeIntelClient {
    switch (type) {
      case 'sourcegraph':
        return new SourcegraphClient(config);
      case 'livegrep':
        return new LivegrepClient(config);
      case 'opengrok':
        return new OpenGrokClient(config);
      default:
        throw new Error(`Unsupported code intelligence type: ${type}`);
    }
  }
}

/**
 * Sourcegraph implementation of code intelligence
 */
export class SourcegraphClient implements CodeIntelClient {
  private baseUrl: string;
  private apiToken?: string;
  
  constructor(config: { baseUrl: string, apiToken?: string }) {
    this.baseUrl = config.baseUrl;
    this.apiToken = config.apiToken;
  }
  
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const response = await this.makeRequest('/api/search/stream', {
      q: query,
      patternType: options?.patternType || 'regexp',
      limit: options?.limit || 20
    });
    
    return response.data.map((item: any) => ({
      path: item.file.path,
      repository: item.repository,
      lineNumber: item.lineMatches?.[0]?.lineNumber,
      preview: item.lineMatches?.[0]?.preview,
      matchCount: item.lineMatches?.length || 0
    }));
  }
  
  async getDefinition(file: string, line: number, character: number): Promise<Location | null> {
    const response = await this.makeRequest('/api/definitions', {
      file,
      line,
      character
    });
    
    if (response.data.definitions && response.data.definitions.length > 0) {
      const def = response.data.definitions[0];
      return {
        path: def.filePath,
        range: {
          start: { line: def.range.start.line, character: def.range.start.character },
          end: { line: def.range.end.line, character: def.range.end.character }
        }
      };
    }
    
    return null;
  }
  
  async getReferences(file: string, line: number, character: number): Promise<Location[]> {
    const response = await this.makeRequest('/api/references', {
      file,
      line,
      character
    });
    
    return (response.data.references || []).map((ref: any) => ({
      path: ref.filePath,
      range: {
        start: { line: ref.range.start.line, character: ref.range.start.character },
        end: { line: ref.range.end.line, character: ref.range.end.character }
      }
    }));
  }
  
  async getFileContent(path: string): Promise<string> {
    const response = await this.makeRequest('/api/blob', {
      path
    });
    
    return response.data.content;
  }
  
  private async makeRequest(endpoint: string, params: any): Promise<any> {
    const headers: Record<string, string> = {};
    if (this.apiToken) {
      headers['Authorization'] = `token ${this.apiToken}`;
    }
    
    return axios.get(`${this.baseUrl}${endpoint}`, {
      params,
      headers
    });
  }
}

/**
 * Livegrep implementation of code intelligence with API parity
 */
export class LivegrepClient implements CodeIntelClient {
  private baseUrl: string;
  private config: any;
  
  constructor(config: { baseUrl: string, [key: string]: any }) {
    this.baseUrl = config.baseUrl;
    this.config = config;
  }
  
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Livegrep only supports regex search
    const response = await axios.get(`${this.baseUrl}/api/v1/search`, {
      params: {
        q: query,
        limit: options?.limit || 20
      }
    });
    
    return response.data.results.map((item: any) => ({
      path: item.path,
      repository: item.repo || 'default',
      lineNumber: item.line_number,
      preview: item.line,
      matchCount: 1
    }));
  }
  
  // Livegrep doesn't have definition/reference support, so we use fallback local tools
  async getDefinition(file: string, line: number, character: number): Promise<Location | null> {
    // Fall back to ctags or other local tool
    try {
      // Use ctags to find definition
      const { stdout } = await exec(`ctags -x --_xformat="%{line} %{input}" ${file} | grep -A 1 "line:${line}" | tail -n 1`);
      const [defLine, defFile] = stdout.trim().split(' ');
      
      if (defLine && defFile) {
        return {
          path: defFile,
          range: {
            start: { line: parseInt(defLine), character: 0 },
            end: { line: parseInt(defLine), character: 1000 }
          }
        };
      }
    } catch (error) {
      console.error('Ctags fallback failed:', error);
    }
    
    return null;
  }
  
  async getReferences(file: string, line: number, character: number): Promise<Location[]> {
    // Fall back to grep
    try {
      // Extract the symbol at the given position
      const fileContent = await fs.promises.readFile(file, 'utf8');
      const lines = fileContent.split('\n');
      const targetLine = lines[line - 1];
      
      // Extract word at position
      const wordMatch = targetLine.substring(0, character).match(/[\w\d_]+$/);
      const symbol = wordMatch ? wordMatch[0] : '';
      
      if (!symbol) {
        return [];
      }
      
      // Search for references
      const { stdout } = await exec(`grep -r "\\b${symbol}\\b" --include="*.ts" --include="*.js" .`);
      
      return stdout.split('\n')
        .filter(Boolean)
        .map(line => {
          const [path, match] = line.split(':', 2);
          const lineNumber = parseInt(match.split(':', 1)[0]);
          
          return {
            path,
            range: {
              start: { line: lineNumber, character: 0 },
              end: { line: lineNumber, character: match.length }
            }
          };
        });
    } catch (error) {
      console.error('Grep fallback failed:', error);
      return [];
    }
  }
  
  async getFileContent(path: string): Promise<string> {
    try {
      return await fs.promises.readFile(path, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file: ${path}`);
    }
  }
}

/**
 * OpenGrok implementation of code intelligence
 */
export class OpenGrokClient implements CodeIntelClient {
  private baseUrl: string;
  
  constructor(config: { baseUrl: string }) {
    this.baseUrl = config.baseUrl;
  }
  
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const response = await axios.get(`${this.baseUrl}/api/v1/search`, {
      params: {
        q: query,
        maxResults: options?.limit || 20,
        type: options?.patternType === 'literal' ? 'full' : 'regexp'
      }
    });
    
    return response.data.results.map((item: any) => ({
      path: item.path,
      repository: item.project,
      lineNumber: item.line,
      preview: item.lineText,
      matchCount: 1
    }));
  }
  
  // OpenGrok partial implementations omitted for brevity
  async getDefinition(file: string, line: number, character: number): Promise<Location | null> {
    // Implementation details omitted
    return null;
  }
  
  async getReferences(file: string, line: number, character: number): Promise<Location[]> {
    // Implementation details omitted
    return [];
  }
  
  async getFileContent(path: string): Promise<string> {
    const response = await axios.get(`${this.baseUrl}/api/v1/raw${path}`);
    return response.data;
  }
}

// Types
export interface SearchOptions {
  patternType?: 'regexp' | 'literal' | 'structural';
  limit?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface SearchResult {
  path: string;
  repository: string;
  lineNumber?: number;
  preview?: string;
  matchCount: number;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  path: string;
  range: Range;
}
```

## Benefits
- **Vendor Independence**: Freedom to switch providers without code changes
- **Graceful Degradation**: System continues to function when services change
- **Cost Control**: Ability to optimize for cost vs. capabilities
- **Future Compatibility**: Ready for new AI models and services
- **Operational Flexibility**: Adapt to changing infrastructure needs

## Next Steps
1. Implement LLM adapter layer with support for Claude, GPT-4o, Gemini, Ollama
2. Create vector database adapter supporting Pinecone, Qdrant, Weaviate
3. Build code intelligence adapter for Sourcegraph, Livegrep, OpenGrok
4. Document migration paths and fallback strategies
5. Test all components with multiple providers

<!-- BP-09_FUTURE_PROOF v1.0 SHA:pq45rst6 -->