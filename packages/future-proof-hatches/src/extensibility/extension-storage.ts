/**
 * Extension Storage
 * @module extensibility/extension-storage
 */

import { ExtensionStorage } from './types';

/**
 * Memory-based implementation of ExtensionStorage
 */
export class MemoryExtensionStorage implements ExtensionStorage {
  private storage: Map<string, any>;
  private extensionId: string;
  
  /**
   * Create a new MemoryExtensionStorage
   * @param extensionId The extension ID
   */
  constructor(extensionId: string) {
    this.storage = new Map();
    this.extensionId = extensionId;
  }
  
  /**
   * Get a value from storage
   * @param key The storage key
   * @returns The stored value
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.storage.get(key) as T;
  }
  
  /**
   * Set a value in storage
   * @param key The storage key
   * @param value The value to store
   */
  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
  }
  
  /**
   * Delete a value from storage
   * @param key The storage key
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }
  
  /**
   * Clear all values from storage
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }
  
  /**
   * Get all keys in storage
   * @returns Array of storage keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

/**
 * Redis-based implementation of ExtensionStorage
 */
export class RedisExtensionStorage implements ExtensionStorage {
  private redis: any; // Redis client
  private extensionId: string;
  private prefix: string;
  
  /**
   * Create a new RedisExtensionStorage
   * @param redis Redis client
   * @param extensionId The extension ID
   */
  constructor(redis: any, extensionId: string) {
    this.redis = redis;
    this.extensionId = extensionId;
    this.prefix = `extension:${extensionId}:`;
  }
  
  /**
   * Get a value from storage
   * @param key The storage key
   * @returns The stored value
   */
  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(`${this.prefix}${key}`);
    if (value === null) {
      return undefined;
    }
    return JSON.parse(value) as T;
  }
  
  /**
   * Set a value in storage
   * @param key The storage key
   * @param value The value to store
   */
  async set<T>(key: string, value: T): Promise<void> {
    await this.redis.set(`${this.prefix}${key}`, JSON.stringify(value));
  }
  
  /**
   * Delete a value from storage
   * @param key The storage key
   */
  async delete(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
  
  /**
   * Clear all values from storage
   */
  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  /**
   * Get all keys in storage
   * @returns Array of storage keys
   */
  async keys(): Promise<string[]> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    return keys.map((key: string) => key.slice(this.prefix.length));
  }
}

/**
 * Factory for creating ExtensionStorage instances
 */
export class ExtensionStorageFactory {
  private redis?: any; // Redis client
  
  /**
   * Create a new ExtensionStorageFactory
   * @param redis Optional Redis client
   */
  constructor(redis?: any) {
    this.redis = redis;
  }
  
  /**
   * Create a new ExtensionStorage instance
   * @param extensionId The extension ID
   * @returns ExtensionStorage instance
   */
  create(extensionId: string): ExtensionStorage {
    if (this.redis) {
      return new RedisExtensionStorage(this.redis, extensionId);
    } else {
      return new MemoryExtensionStorage(extensionId);
    }
  }
}