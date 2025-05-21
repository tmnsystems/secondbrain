/**
 * Feature Flag Provider
 * @module feature-flags/feature-flag-provider
 */

import { v4 as uuidv4 } from 'uuid';
import {
  FeatureFlagProvider,
  FeatureFlag,
  FeatureFlagStatus,
  FeatureFlagEvent,
  EvaluationContext,
  EvaluationResult,
  EvaluationSource,
  TargetingRule,
  RuleCondition,
  ConditionOperator
} from './types';

/**
 * In-memory implementation of the FeatureFlagProvider interface
 */
export class InMemoryFeatureFlagProvider implements FeatureFlagProvider {
  private flags: Map<string, FeatureFlag>;
  private eventListeners: ((event: FeatureFlagEvent) => void)[];
  private logger: any;
  private initialized: boolean;

  /**
   * Create a new InMemoryFeatureFlagProvider
   * @param initialFlags Optional initial flags
   * @param logger Optional logger
   */
  constructor(initialFlags: FeatureFlag[] = [], logger?: any) {
    this.flags = new Map();
    this.eventListeners = [];
    this.logger = logger || console;
    this.initialized = false;
    
    // Add initial flags
    for (const flag of initialFlags) {
      this.flags.set(flag.id, flag);
    }
  }

  /**
   * Initialize the feature flag provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    this.initialized = true;
    this.logger.info('In-memory feature flag provider initialized');
  }

  /**
   * Get all feature flags
   * @returns Promise resolving to an array of feature flags
   */
  async getFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific flag by ID
   * @param flagId The flag ID
   * @returns Promise resolving to the flag or null if not found
   */
  async getFlag(flagId: string): Promise<FeatureFlag | null> {
    return this.flags.get(flagId) || null;
  }

  /**
   * Evaluate a flag for a context
   * @param flagId The flag ID
   * @param context The evaluation context
   * @returns Promise resolving to the evaluation result
   */
  async evaluateFlag(flagId: string, context: EvaluationContext): Promise<EvaluationResult> {
    try {
      const flag = await this.getFlag(flagId);
      
      if (!flag) {
        const result = this.createErrorResult(flagId, `Flag ${flagId} not found`);
        this.trackEvent({
          type: 'error',
          flagId,
          value: null,
          context,
          result,
          timestamp: new Date()
        });
        return result;
      }
      
      // Check if flag is inactive or archived
      if (flag.status !== FeatureFlagStatus.ACTIVE) {
        const result = this.createResult(flagId, flag.defaultValue, EvaluationSource.DEFAULT);
        this.trackEvent({
          type: 'evaluation',
          flagId,
          value: result.value,
          context,
          result,
          timestamp: new Date()
        });
        return result;
      }
      
      // Check environment
      if (flag.environments && context.environment) {
        if (!flag.environments.includes(context.environment)) {
          const result = this.createResult(flagId, flag.defaultValue, EvaluationSource.DEFAULT);
          this.trackEvent({
            type: 'evaluation',
            flagId,
            value: result.value,
            context,
            result,
            timestamp: new Date()
          });
          return result;
        }
      }
      
      // Evaluate rules
      if (flag.rules && flag.rules.length > 0) {
        // Sort rules by priority
        const sortedRules = [...flag.rules].sort((a, b) => a.priority - b.priority);
        
        for (const rule of sortedRules) {
          const isMatch = this.evaluateRule(rule, context);
          
          if (isMatch) {
            // Apply rollout if specified
            if (rule.rollout !== undefined && rule.rollout < 100) {
              const userId = context.userId || context.sessionId;
              
              if (!userId) {
                continue; // Skip rollout for anonymous users
              }
              
              // Hash the user ID + flag ID to get a deterministic value
              const hash = this.hashString(`${userId}:${flagId}:${rule.id}`);
              const percentage = hash % 100;
              
              if (percentage >= rule.rollout) {
                continue; // User not in rollout
              }
            }
            
            const result = this.createResult(flagId, rule.value, EvaluationSource.RULE, rule.id);
            
            // Check for variant
            if (flag.variants && typeof rule.value === 'string' && flag.variants[rule.value]) {
              result.variant = rule.value;
            }
            
            this.trackEvent({
              type: 'evaluation',
              flagId,
              value: result.value,
              context,
              result,
              timestamp: new Date()
            });
            
            return result;
          }
        }
      }
      
      // No matching rules, return default value
      const result = this.createResult(flagId, flag.defaultValue, EvaluationSource.DEFAULT);
      this.trackEvent({
        type: 'evaluation',
        flagId,
        value: result.value,
        context,
        result,
        timestamp: new Date()
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result = this.createErrorResult(flagId, errorMessage);
      
      this.trackEvent({
        type: 'error',
        flagId,
        value: null,
        context,
        result,
        timestamp: new Date()
      });
      
      return result;
    }
  }

  /**
   * Evaluate all flags for a context
   * @param context The evaluation context
   * @returns Promise resolving to a record of flag IDs to evaluation results
   */
  async evaluateAllFlags(context: EvaluationContext): Promise<Record<string, EvaluationResult>> {
    const flags = await this.getFlags();
    const results: Record<string, EvaluationResult> = {};
    
    for (const flag of flags) {
      results[flag.id] = await this.evaluateFlag(flag.id, context);
    }
    
    return results;
  }

  /**
   * Update a flag's status
   * @param flagId The flag ID
   * @param status The new status
   */
  async updateFlagStatus(flagId: string, status: FeatureFlagStatus): Promise<void> {
    const flag = await this.getFlag(flagId);
    
    if (!flag) {
      throw new Error(`Flag ${flagId} not found`);
    }
    
    flag.status = status;
    flag.updatedAt = new Date();
    this.flags.set(flagId, flag);
  }

  /**
   * Create a new flag
   * @param flag The flag to create
   * @returns Promise resolving to the created flag
   */
  async createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const now = new Date();
    const id = flag.id || uuidv4();
    
    if (this.flags.has(id)) {
      throw new Error(`Flag with ID ${id} already exists`);
    }
    
    const newFlag: FeatureFlag = {
      ...flag as any,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.flags.set(id, newFlag);
    return newFlag;
  }

  /**
   * Update an existing flag
   * @param flagId The flag ID
   * @param flag The updated flag properties
   * @returns Promise resolving to the updated flag
   */
  async updateFlag(flagId: string, flag: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const existingFlag = await this.getFlag(flagId);
    
    if (!existingFlag) {
      throw new Error(`Flag ${flagId} not found`);
    }
    
    const updatedFlag: FeatureFlag = {
      ...existingFlag,
      ...flag,
      id: flagId, // Ensure ID doesn't change
      createdAt: existingFlag.createdAt, // Ensure createdAt doesn't change
      updatedAt: new Date()
    };
    
    this.flags.set(flagId, updatedFlag);
    return updatedFlag;
  }

  /**
   * Delete a flag
   * @param flagId The flag ID
   */
  async deleteFlag(flagId: string): Promise<void> {
    if (!this.flags.has(flagId)) {
      throw new Error(`Flag ${flagId} not found`);
    }
    
    this.flags.delete(flagId);
  }

  /**
   * Track a flag event
   * @param event The flag event
   */
  async trackEvent(event: FeatureFlagEvent): Promise<void> {
    // Notify listeners
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error('Error in feature flag event listener:', error);
      }
    }
  }

  /**
   * Register an event listener
   * @param listener The event listener
   */
  onEvent(listener: (event: FeatureFlagEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Unregister an event listener
   * @param listener The event listener
   */
  offEvent(listener: (event: FeatureFlagEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Create an evaluation result
   * @param flagId The flag ID
   * @param value The flag value
   * @param source The evaluation source
   * @param ruleId Optional rule ID
   * @returns The evaluation result
   */
  private createResult(
    flagId: string,
    value: any,
    source: EvaluationSource,
    ruleId?: string
  ): EvaluationResult {
    return {
      flagId,
      enabled: this.isTruthy(value),
      value,
      source,
      ruleId
    };
  }

  /**
   * Create an error evaluation result
   * @param flagId The flag ID
   * @param error The error message
   * @returns The evaluation result
   */
  private createErrorResult(flagId: string, error: string): EvaluationResult {
    return {
      flagId,
      enabled: false,
      value: null,
      source: EvaluationSource.ERROR,
      error
    };
  }

  /**
   * Evaluate if a rule matches a context
   * @param rule The targeting rule
   * @param context The evaluation context
   * @returns Whether the rule matches
   */
  private evaluateRule(rule: TargetingRule, context: EvaluationContext): boolean {
    // A rule matches if all conditions match
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Evaluate if a condition matches a context
   * @param condition The rule condition
   * @param context The evaluation context
   * @returns Whether the condition matches
   */
  private evaluateCondition(condition: RuleCondition, context: EvaluationContext): boolean {
    // Special operators AND/OR with nested conditions
    if (condition.operator === ConditionOperator.AND) {
      return condition.conditions?.every(c => this.evaluateCondition(c, context)) || false;
    }
    
    if (condition.operator === ConditionOperator.OR) {
      return condition.conditions?.some(c => this.evaluateCondition(c, context)) || false;
    }
    
    // For other operators, get the context value
    const contextValue = this.getContextValue(context, condition.attribute);
    
    // If the attribute doesn't exist, the condition doesn't match
    if (contextValue === undefined) {
      return false;
    }
    
    // Evaluate based on operator
    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return contextValue === condition.value;
      
      case ConditionOperator.NOT_EQUALS:
        return contextValue !== condition.value;
      
      case ConditionOperator.GREATER_THAN:
        return contextValue > condition.value;
      
      case ConditionOperator.LESS_THAN:
        return contextValue < condition.value;
      
      case ConditionOperator.GREATER_THAN_OR_EQUALS:
        return contextValue >= condition.value;
      
      case ConditionOperator.LESS_THAN_OR_EQUALS:
        return contextValue <= condition.value;
      
      case ConditionOperator.CONTAINS:
        if (typeof contextValue === 'string') {
          return contextValue.includes(String(condition.value));
        }
        if (Array.isArray(contextValue)) {
          return contextValue.includes(condition.value);
        }
        return false;
      
      case ConditionOperator.NOT_CONTAINS:
        if (typeof contextValue === 'string') {
          return !contextValue.includes(String(condition.value));
        }
        if (Array.isArray(contextValue)) {
          return !contextValue.includes(condition.value);
        }
        return true;
      
      case ConditionOperator.STARTS_WITH:
        return typeof contextValue === 'string' && contextValue.startsWith(String(condition.value));
      
      case ConditionOperator.ENDS_WITH:
        return typeof contextValue === 'string' && contextValue.endsWith(String(condition.value));
      
      case ConditionOperator.MATCHES:
        return typeof contextValue === 'string' && new RegExp(String(condition.value)).test(contextValue);
      
      case ConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      
      case ConditionOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      
      default:
        return false;
    }
  }

  /**
   * Get a value from the context by attribute path
   * @param context The evaluation context
   * @param attribute The attribute path
   * @returns The context value
   */
  private getContextValue(context: EvaluationContext, attribute: string): any {
    const parts = attribute.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      
      value = value[part];
    }
    
    return value;
  }

  /**
   * Determine if a value is truthy
   * @param value The value to check
   * @returns Whether the value is truthy
   */
  private isTruthy(value: any): boolean {
    if (value === undefined || value === null) {
      return false;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    if (typeof value === 'string') {
      const lowercaseValue = value.toLowerCase();
      return lowercaseValue !== '' && 
             lowercaseValue !== 'false' && 
             lowercaseValue !== '0' && 
             lowercaseValue !== 'no' && 
             lowercaseValue !== 'off';
    }
    
    return true;
  }

  /**
   * Generate a deterministic hash from a string
   * @param str The string to hash
   * @returns A number between 0 and 99
   */
  private hashString(str: string): number {
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    
    // Ensure positive and in range 0-99
    return Math.abs(hash) % 100;
  }
}

/**
 * Redis-based implementation of the FeatureFlagProvider interface
 */
export class RedisFeatureFlagProvider implements FeatureFlagProvider {
  private client: any; // Redis client
  private prefix: string;
  private eventListeners: ((event: FeatureFlagEvent) => void)[];
  private logger: any;
  private initialized: boolean;

  /**
   * Create a new RedisFeatureFlagProvider
   * @param client Redis client
   * @param options Optional configuration options
   */
  constructor(client: any, options: { prefix?: string; logger?: any } = {}) {
    this.client = client;
    this.prefix = options.prefix || 'feature-flags:';
    this.eventListeners = [];
    this.logger = options.logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the feature flag provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Verify Redis connection
    try {
      await this.client.ping();
      this.initialized = true;
      this.logger.info('Redis feature flag provider initialized');
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all feature flags
   * @returns Promise resolving to an array of feature flags
   */
  async getFlags(): Promise<FeatureFlag[]> {
    const keys = await this.client.keys(`${this.prefix}*`);
    const flags: FeatureFlag[] = [];
    
    for (const key of keys) {
      const value = await this.client.get(key);
      
      if (value) {
        try {
          const flag = JSON.parse(value);
          flags.push(this.deserializeFlag(flag));
        } catch (error) {
          this.logger.error(`Failed to parse flag from Redis: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    return flags;
  }

  /**
   * Get a specific flag by ID
   * @param flagId The flag ID
   * @returns Promise resolving to the flag or null if not found
   */
  async getFlag(flagId: string): Promise<FeatureFlag | null> {
    const value = await this.client.get(`${this.prefix}${flagId}`);
    
    if (!value) {
      return null;
    }
    
    try {
      const flag = JSON.parse(value);
      return this.deserializeFlag(flag);
    } catch (error) {
      this.logger.error(`Failed to parse flag from Redis: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Evaluate a flag for a context
   * @param flagId The flag ID
   * @param context The evaluation context
   * @returns Promise resolving to the evaluation result
   */
  async evaluateFlag(flagId: string, context: EvaluationContext): Promise<EvaluationResult> {
    // For Redis implementation, we'll delegate to an in-memory provider
    const flag = await this.getFlag(flagId);
    
    if (!flag) {
      const result = this.createErrorResult(flagId, `Flag ${flagId} not found`);
      this.trackEvent({
        type: 'error',
        flagId,
        value: null,
        context,
        result,
        timestamp: new Date()
      });
      return result;
    }
    
    const inMemoryProvider = new InMemoryFeatureFlagProvider([flag], this.logger);
    return inMemoryProvider.evaluateFlag(flagId, context);
  }

  /**
   * Evaluate all flags for a context
   * @param context The evaluation context
   * @returns Promise resolving to a record of flag IDs to evaluation results
   */
  async evaluateAllFlags(context: EvaluationContext): Promise<Record<string, EvaluationResult>> {
    const flags = await this.getFlags();
    const inMemoryProvider = new InMemoryFeatureFlagProvider(flags, this.logger);
    return inMemoryProvider.evaluateAllFlags(context);
  }

  /**
   * Update a flag's status
   * @param flagId The flag ID
   * @param status The new status
   */
  async updateFlagStatus(flagId: string, status: FeatureFlagStatus): Promise<void> {
    const flag = await this.getFlag(flagId);
    
    if (!flag) {
      throw new Error(`Flag ${flagId} not found`);
    }
    
    flag.status = status;
    flag.updatedAt = new Date();
    
    await this.client.set(`${this.prefix}${flagId}`, JSON.stringify(this.serializeFlag(flag)));
  }

  /**
   * Create a new flag
   * @param flag The flag to create
   * @returns Promise resolving to the created flag
   */
  async createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const now = new Date();
    const id = flag.id || uuidv4();
    
    // Check if flag already exists
    const existingFlag = await this.getFlag(id);
    if (existingFlag) {
      throw new Error(`Flag with ID ${id} already exists`);
    }
    
    const newFlag: FeatureFlag = {
      ...flag as any,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    await this.client.set(`${this.prefix}${id}`, JSON.stringify(this.serializeFlag(newFlag)));
    return newFlag;
  }

  /**
   * Update an existing flag
   * @param flagId The flag ID
   * @param flag The updated flag properties
   * @returns Promise resolving to the updated flag
   */
  async updateFlag(flagId: string, flag: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const existingFlag = await this.getFlag(flagId);
    
    if (!existingFlag) {
      throw new Error(`Flag ${flagId} not found`);
    }
    
    const updatedFlag: FeatureFlag = {
      ...existingFlag,
      ...flag,
      id: flagId, // Ensure ID doesn't change
      createdAt: existingFlag.createdAt, // Ensure createdAt doesn't change
      updatedAt: new Date()
    };
    
    await this.client.set(`${this.prefix}${flagId}`, JSON.stringify(this.serializeFlag(updatedFlag)));
    return updatedFlag;
  }

  /**
   * Delete a flag
   * @param flagId The flag ID
   */
  async deleteFlag(flagId: string): Promise<void> {
    await this.client.del(`${this.prefix}${flagId}`);
  }

  /**
   * Track a flag event
   * @param event The flag event
   */
  async trackEvent(event: FeatureFlagEvent): Promise<void> {
    // Store event in Redis
    const eventId = uuidv4();
    await this.client.set(
      `${this.prefix}events:${eventId}`,
      JSON.stringify(event),
      'EX',
      86400 // Expire after 24 hours
    );
    
    // Publish event to Redis channel
    await this.client.publish(
      `${this.prefix}events`,
      JSON.stringify(event)
    );
    
    // Notify listeners
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error('Error in feature flag event listener:', error);
      }
    }
  }

  /**
   * Register an event listener
   * @param listener The event listener
   */
  onEvent(listener: (event: FeatureFlagEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Unregister an event listener
   * @param listener The event listener
   */
  offEvent(listener: (event: FeatureFlagEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Create an evaluation result
   * @param flagId The flag ID
   * @param value The flag value
   * @param source The evaluation source
   * @param ruleId Optional rule ID
   * @returns The evaluation result
   */
  private createResult(
    flagId: string,
    value: any,
    source: EvaluationSource,
    ruleId?: string
  ): EvaluationResult {
    return {
      flagId,
      enabled: this.isTruthy(value),
      value,
      source,
      ruleId
    };
  }

  /**
   * Create an error evaluation result
   * @param flagId The flag ID
   * @param error The error message
   * @returns The evaluation result
   */
  private createErrorResult(flagId: string, error: string): EvaluationResult {
    return {
      flagId,
      enabled: false,
      value: null,
      source: EvaluationSource.ERROR,
      error
    };
  }

  /**
   * Determine if a value is truthy
   * @param value The value to check
   * @returns Whether the value is truthy
   */
  private isTruthy(value: any): boolean {
    if (value === undefined || value === null) {
      return false;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    if (typeof value === 'string') {
      const lowercaseValue = value.toLowerCase();
      return lowercaseValue !== '' && 
             lowercaseValue !== 'false' && 
             lowercaseValue !== '0' && 
             lowercaseValue !== 'no' && 
             lowercaseValue !== 'off';
    }
    
    return true;
  }

  /**
   * Serialize a feature flag for Redis storage
   * @param flag The flag to serialize
   * @returns The serialized flag
   */
  private serializeFlag(flag: FeatureFlag): any {
    return {
      ...flag,
      createdAt: flag.createdAt.toISOString(),
      updatedAt: flag.updatedAt.toISOString(),
      expiresAt: flag.expiresAt ? flag.expiresAt.toISOString() : undefined
    };
  }

  /**
   * Deserialize a feature flag from Redis storage
   * @param data The serialized flag data
   * @returns The deserialized flag
   */
  private deserializeFlag(data: any): FeatureFlag {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
    };
  }
}