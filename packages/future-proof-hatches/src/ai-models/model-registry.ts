/**
 * Model Registry
 * @module ai-models/model-registry
 */

import { EventEmitter } from 'events';
import {
  ModelRegistry,
  ModelMetadata,
  ModelProvider,
  ModelType,
  ModelCapability
} from './types';

/**
 * Events emitted by the ModelRegistryImpl
 */
export enum ModelRegistryEvents {
  MODEL_REGISTERED = 'model:registered',
  MODEL_UNREGISTERED = 'model:unregistered',
}

/**
 * Implementation of the ModelRegistry interface
 */
export class ModelRegistryImpl implements ModelRegistry {
  private models: Map<string, ModelMetadata>;
  private events: EventEmitter;

  /**
   * Create a new ModelRegistryImpl
   */
  constructor() {
    this.models = new Map();
    this.events = new EventEmitter();
  }

  /**
   * Register a model
   * @param model The model metadata
   */
  registerModel(model: ModelMetadata): void {
    if (this.models.has(model.id)) {
      throw new Error(`Model with ID ${model.id} is already registered`);
    }

    this.models.set(model.id, model);
    this.events.emit(ModelRegistryEvents.MODEL_REGISTERED, model);
  }

  /**
   * Unregister a model
   * @param modelId The model ID
   */
  unregisterModel(modelId: string): void {
    if (!this.models.has(modelId)) {
      throw new Error(`Model with ID ${modelId} is not registered`);
    }

    const model = this.models.get(modelId)!;
    this.models.delete(modelId);
    this.events.emit(ModelRegistryEvents.MODEL_UNREGISTERED, model);
  }

  /**
   * Get all registered models
   * @returns Array of registered models
   */
  getModels(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  /**
   * Get a specific model by ID
   * @param modelId The model ID
   * @returns The model or null if not found
   */
  getModel(modelId: string): ModelMetadata | null {
    return this.models.get(modelId) || null;
  }

  /**
   * Find models by provider
   * @param provider The provider to filter by
   * @returns Array of models with the specified provider
   */
  findModelsByProvider(provider: ModelProvider): ModelMetadata[] {
    return this.getModels().filter(model => model.provider === provider);
  }

  /**
   * Find models by type
   * @param type The type to filter by
   * @returns Array of models with the specified type
   */
  findModelsByType(type: ModelType): ModelMetadata[] {
    return this.getModels().filter(model => model.type === type);
  }

  /**
   * Find models by capability
   * @param capability The capability to filter by
   * @returns Array of models with the specified capability
   */
  findModelsByCapability(capability: ModelCapability): ModelMetadata[] {
    return this.getModels().filter(model => model.capabilities.includes(capability));
  }

  /**
   * Find models by criteria
   * @param criteria The criteria to filter by
   * @returns Array of models matching the criteria
   */
  findModelsByCriteria(criteria: Partial<ModelMetadata>): ModelMetadata[] {
    return this.getModels().filter(model => {
      for (const [key, value] of Object.entries(criteria)) {
        if (key === 'capabilities') {
          // For capabilities, check if the model has all the specified capabilities
          const requiredCapabilities = value as ModelCapability[];
          if (!requiredCapabilities.every(cap => model.capabilities.includes(cap))) {
            return false;
          }
        } else if ((model as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Subscribe to registry events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: ModelRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from registry events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: ModelRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}