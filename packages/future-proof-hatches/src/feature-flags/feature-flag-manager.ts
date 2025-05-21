/**
 * Feature Flag Manager
 * @module feature-flags/feature-flag-manager
 */

import { EventEmitter } from 'events';
import {
  FeatureFlagManager,
  FeatureFlagProvider,
  FeatureFlag,
  FeatureFlagStatus,
  FeatureFlagEvent,
  EvaluationContext,
  EvaluationResult
} from './types';
import { InMemoryFeatureFlagProvider } from './feature-flag-provider';

/**
 * Events emitted by the FeatureFlagManagerImpl
 */
export enum FeatureFlagManagerEvents {
  INITIALIZED = 'feature-flags:initialized',
  FLAG_CREATED = 'feature-flags:flag:created',
  FLAG_UPDATED = 'feature-flags:flag:updated',
  FLAG_DELETED = 'feature-flags:flag:deleted',
  FLAG_STATUS_UPDATED = 'feature-flags:flag:status:updated',
  FLAG_EVALUATED = 'feature-flags:flag:evaluated',
  FLAG_EVENT = 'feature-flags:flag:event',
}

/**
 * Implementation of the FeatureFlagManager interface
 */
export class FeatureFlagManagerImpl implements FeatureFlagManager {
  private provider: FeatureFlagProvider;
  private events: EventEmitter;
  private logger: any;
  private defaultContext: EvaluationContext;
  private initialized: boolean;

  /**
   * Create a new FeatureFlagManagerImpl
   * @param provider Optional feature flag provider
   * @param options Optional configuration options
   */
  constructor(
    provider?: FeatureFlagProvider,
    options: {
      logger?: any;
      defaultContext?: EvaluationContext;
    } = {}
  ) {
    this.provider = provider || new InMemoryFeatureFlagProvider();
    this.events = new EventEmitter();
    this.logger = options.logger || console;
    this.defaultContext = options.defaultContext || {};
    this.initialized = false;
    
    // Listen for provider events
    this.provider.onEvent(this.handleProviderEvent.bind(this));
  }

  /**
   * Initialize the feature flag manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    await this.provider.initialize();
    this.initialized = true;
    
    this.events.emit(FeatureFlagManagerEvents.INITIALIZED);
    this.logger.info('Feature flag manager initialized');
  }

  /**
   * Get the feature flag provider
   * @returns The feature flag provider
   */
  getProvider(): FeatureFlagProvider {
    return this.provider;
  }

  /**
   * Set the feature flag provider
   * @param provider The feature flag provider
   */
  setProvider(provider: FeatureFlagProvider): void {
    // Remove event listener from old provider
    if (this.provider) {
      this.provider.offEvent(this.handleProviderEvent.bind(this));
    }
    
    this.provider = provider;
    
    // Add event listener to new provider
    this.provider.onEvent(this.handleProviderEvent.bind(this));
    
    // Reset initialization flag
    this.initialized = false;
  }

  /**
   * Get all feature flags
   * @returns Promise resolving to an array of feature flags
   */
  async getFlags(): Promise<FeatureFlag[]> {
    this.ensureInitialized();
    return this.provider.getFlags();
  }

  /**
   * Get a specific flag by ID
   * @param flagId The flag ID
   * @returns Promise resolving to the flag or null if not found
   */
  async getFlag(flagId: string): Promise<FeatureFlag | null> {
    this.ensureInitialized();
    return this.provider.getFlag(flagId);
  }

  /**
   * Check if a feature is enabled
   * @param flagId The flag ID
   * @param context Optional evaluation context
   * @returns Promise resolving to whether the feature is enabled
   */
  async isEnabled(flagId: string, context?: EvaluationContext): Promise<boolean> {
    const result = await this.evaluate(flagId, context);
    return result.enabled;
  }

  /**
   * Get the value of a feature flag
   * @param flagId The flag ID
   * @param defaultValue The default value to return if the flag is not found
   * @param context Optional evaluation context
   * @returns Promise resolving to the flag value
   */
  async getValue(flagId: string, defaultValue: any, context?: EvaluationContext): Promise<any> {
    try {
      const result = await this.evaluate(flagId, context);
      
      if (result.error) {
        return defaultValue;
      }
      
      return result.value !== null ? result.value : defaultValue;
    } catch (error) {
      this.logger.error(`Error getting value for flag ${flagId}:`, error);
      return defaultValue;
    }
  }

  /**
   * Evaluate a flag for a context
   * @param flagId The flag ID
   * @param context Optional evaluation context
   * @returns Promise resolving to the evaluation result
   */
  async evaluate(flagId: string, context?: EvaluationContext): Promise<EvaluationResult> {
    this.ensureInitialized();
    
    const mergedContext = this.mergeContexts(context);
    const result = await this.provider.evaluateFlag(flagId, mergedContext);
    
    this.events.emit(FeatureFlagManagerEvents.FLAG_EVALUATED, flagId, result, mergedContext);
    
    return result;
  }

  /**
   * Evaluate all flags for a context
   * @param context Optional evaluation context
   * @returns Promise resolving to a record of flag IDs to evaluation results
   */
  async evaluateAll(context?: EvaluationContext): Promise<Record<string, EvaluationResult>> {
    this.ensureInitialized();
    
    const mergedContext = this.mergeContexts(context);
    const results = await this.provider.evaluateAllFlags(mergedContext);
    
    for (const [flagId, result] of Object.entries(results)) {
      this.events.emit(FeatureFlagManagerEvents.FLAG_EVALUATED, flagId, result, mergedContext);
    }
    
    return results;
  }

  /**
   * Create a new flag
   * @param flag The flag to create
   * @returns Promise resolving to the created flag
   */
  async createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    this.ensureInitialized();
    
    const createdFlag = await this.provider.createFlag(flag);
    this.events.emit(FeatureFlagManagerEvents.FLAG_CREATED, createdFlag);
    
    return createdFlag;
  }

  /**
   * Update an existing flag
   * @param flagId The flag ID
   * @param flag The updated flag properties
   * @returns Promise resolving to the updated flag
   */
  async updateFlag(flagId: string, flag: Partial<FeatureFlag>): Promise<FeatureFlag> {
    this.ensureInitialized();
    
    const updatedFlag = await this.provider.updateFlag(flagId, flag);
    this.events.emit(FeatureFlagManagerEvents.FLAG_UPDATED, updatedFlag);
    
    return updatedFlag;
  }

  /**
   * Update a flag's status
   * @param flagId The flag ID
   * @param status The new status
   */
  async updateFlagStatus(flagId: string, status: FeatureFlagStatus): Promise<void> {
    this.ensureInitialized();
    
    await this.provider.updateFlagStatus(flagId, status);
    
    const flag = await this.provider.getFlag(flagId);
    if (flag) {
      this.events.emit(FeatureFlagManagerEvents.FLAG_STATUS_UPDATED, flagId, status, flag);
    }
  }

  /**
   * Delete a flag
   * @param flagId The flag ID
   */
  async deleteFlag(flagId: string): Promise<void> {
    this.ensureInitialized();
    
    const flag = await this.provider.getFlag(flagId);
    await this.provider.deleteFlag(flagId);
    
    if (flag) {
      this.events.emit(FeatureFlagManagerEvents.FLAG_DELETED, flagId, flag);
    }
  }

  /**
   * Register a flag event handler
   * @param handler The event handler
   */
  onEvent(handler: (event: FeatureFlagEvent) => void): void {
    this.events.on(FeatureFlagManagerEvents.FLAG_EVENT, handler);
  }

  /**
   * Unregister a flag event handler
   * @param handler The event handler
   */
  offEvent(handler: (event: FeatureFlagEvent) => void): void {
    this.events.off(FeatureFlagManagerEvents.FLAG_EVENT, handler);
  }

  /**
   * Subscribe to manager events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: FeatureFlagManagerEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from manager events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: FeatureFlagManagerEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }

  /**
   * Set the default evaluation context
   * @param context The default context
   */
  setDefaultContext(context: EvaluationContext): void {
    this.defaultContext = context;
  }

  /**
   * Get the default evaluation context
   * @returns The default context
   */
  getDefaultContext(): EvaluationContext {
    return this.defaultContext;
  }

  /**
   * Handle events from the provider
   * @param event The feature flag event
   */
  private handleProviderEvent(event: FeatureFlagEvent): void {
    this.events.emit(FeatureFlagManagerEvents.FLAG_EVENT, event);
  }

  /**
   * Merge the provided context with the default context
   * @param context The context to merge
   * @returns The merged context
   */
  private mergeContexts(context?: EvaluationContext): EvaluationContext {
    return {
      ...this.defaultContext,
      ...context
    };
  }

  /**
   * Ensure that the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Feature flag manager is not initialized. Call initialize() first.');
    }
  }
}