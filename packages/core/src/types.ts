/**
 * Core type definitions for SecondBrain project
 */

export interface BaseConfig {
  logLevel: LogLevel;
  environment: 'development' | 'production' | 'test';
}

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

export interface LLMProvider {
  name: string;
  sendMessage(prompt: string, options?: any): Promise<string>;
  getUsage(): Promise<any>;
}

export interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface VectorStoreProvider {
  addDocuments(documents: Document[]): Promise<void>;
  search(query: string, limit?: number): Promise<Document[]>;
  delete(ids: string[]): Promise<void>;
}