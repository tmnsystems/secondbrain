/**
 * A/B Testing Manager
 * @module ab-testing/ab-test-manager
 */

import { EventEmitter } from 'events';
import {
  ABTestingManager,
  ExperimentRepository,
  Experiment,
  ExperimentStatus,
  ExperimentEvent,
  ExperimentEventType,
  Variant,
  ExperimentResults,
  AssignmentOptions,
  AssignmentResult,
  AssignmentStrategy
} from './types';
import { ExperimentImpl } from './experiment';
import { FeatureFlagManager } from '../feature-flags/types';

/**
 * Events emitted by the ABTestingManagerImpl
 */
export enum ABTestingManagerEvents {
  INITIALIZED = 'ab-testing:initialized',
  EXPERIMENT_CREATED = 'ab-testing:experiment:created',
  EXPERIMENT_UPDATED = 'ab-testing:experiment:updated',
  EXPERIMENT_DELETED = 'ab-testing:experiment:deleted',
  EXPERIMENT_STARTED = 'ab-testing:experiment:started',
  EXPERIMENT_PAUSED = 'ab-testing:experiment:paused',
  EXPERIMENT_RESUMED = 'ab-testing:experiment:resumed',
  EXPERIMENT_ENDED = 'ab-testing:experiment:ended',
  EXPERIMENT_ARCHIVED = 'ab-testing:experiment:archived',
  VARIANT_ASSIGNED = 'ab-testing:variant:assigned',
  VARIANT_OVERRIDE = 'ab-testing:variant:override',
  METRIC_TRACKED = 'ab-testing:metric:tracked',
  EXPOSURE_TRACKED = 'ab-testing:exposure:tracked',
}

/**
 * In-memory experiment repository
 */
export class InMemoryExperimentRepository implements ExperimentRepository {
  private experiments: Map<string, Experiment>;
  private events: Map<string, ExperimentEvent[]>;
  private results: Map<string, ExperimentResults>;
  private logger: any;
  
  /**
   * Create a new InMemoryExperimentRepository
   * @param logger Optional logger
   */
  constructor(logger?: any) {
    this.experiments = new Map();
    this.events = new Map();
    this.results = new Map();
    this.logger = logger || console;
  }
  
  /**
   * Get all experiments
   * @returns Promise resolving to an array of experiments
   */
  async getExperiments(): Promise<Experiment[]> {
    return Array.from(this.experiments.values());
  }
  
  /**
   * Get a specific experiment by ID
   * @param experimentId The experiment ID
   * @returns Promise resolving to the experiment or null if not found
   */
  async getExperiment(experimentId: string): Promise<Experiment | null> {
    return this.experiments.get(experimentId) || null;
  }
  
  /**
   * Create a new experiment
   * @param experiment The experiment to create
   * @returns Promise resolving to the created experiment
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    const newExperiment = new ExperimentImpl(experiment);
    this.experiments.set(newExperiment.id, newExperiment);
    return newExperiment;
  }
  
  /**
   * Update an existing experiment
   * @param experimentId The experiment ID
   * @param experiment The updated experiment properties
   * @returns Promise resolving to the updated experiment
   */
  async updateExperiment(experimentId: string, experiment: Partial<Experiment>): Promise<Experiment> {
    const existingExperiment = await this.getExperiment(experimentId);
    
    if (!existingExperiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const updatedExperiment = ExperimentImpl.fromExisting(existingExperiment).update(experiment);
    this.experiments.set(experimentId, updatedExperiment);
    
    return updatedExperiment;
  }
  
  /**
   * Delete an experiment
   * @param experimentId The experiment ID
   */
  async deleteExperiment(experimentId: string): Promise<void> {
    this.experiments.delete(experimentId);
    this.events.delete(experimentId);
    this.results.delete(experimentId);
  }
  
  /**
   * Get the results for an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the experiment results or null if not found
   */
  async getExperimentResults(experimentId: string): Promise<ExperimentResults | null> {
    return this.results.get(experimentId) || null;
  }
  
  /**
   * Track an experiment event
   * @param event The experiment event to track
   * @returns Promise resolving to the tracked event
   */
  async trackEvent(event: Omit<ExperimentEvent, 'id' | 'timestamp'>): Promise<ExperimentEvent> {
    const newEvent: ExperimentEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    
    // Create events array for the experiment if it doesn't exist
    if (!this.events.has(event.experimentId)) {
      this.events.set(event.experimentId, []);
    }
    
    // Add the event to the array
    this.events.get(event.experimentId)!.push(newEvent);
    
    return newEvent;
  }
  
  /**
   * Get events for an experiment
   * @param experimentId The experiment ID
   * @param options Optional query options
   * @returns Promise resolving to an array of experiment events
   */
  async getEvents(experimentId: string, options?: any): Promise<ExperimentEvent[]> {
    if (!this.events.has(experimentId)) {
      return [];
    }
    
    let events = this.events.get(experimentId)!;
    
    // Apply filters
    if (options) {
      if (options.type) {
        events = events.filter(e => e.type === options.type);
      }
      
      if (options.variantId) {
        events = events.filter(e => e.variantId === options.variantId);
      }
      
      if (options.metricId) {
        events = events.filter(e => e.metricId === options.metricId);
      }
      
      if (options.userId) {
        events = events.filter(e => e.userId === options.userId);
      }
      
      if (options.startTime) {
        events = events.filter(e => e.timestamp >= options.startTime);
      }
      
      if (options.endTime) {
        events = events.filter(e => e.timestamp <= options.endTime);
      }
      
      // Apply pagination
      if (options.offset) {
        events = events.slice(options.offset);
      }
      
      if (options.limit) {
        events = events.slice(0, options.limit);
      }
    }
    
    return events;
  }
  
  /**
   * Set the results for an experiment
   * @param experimentId The experiment ID
   * @param results The experiment results
   */
  setExperimentResults(experimentId: string, results: ExperimentResults): void {
    this.results.set(experimentId, results);
  }
}

/**
 * Implementation of the ABTestingManager interface
 */
export class ABTestingManagerImpl implements ABTestingManager {
  private repository: ExperimentRepository;
  private featureFlagManager: FeatureFlagManager | null;
  private events: EventEmitter;
  private logger: any;
  private initialized: boolean;
  private variantAssignments: Map<string, Record<string, string>>;
  
  /**
   * Create a new ABTestingManagerImpl
   * @param repository Optional experiment repository
   * @param featureFlagManager Optional feature flag manager
   * @param logger Optional logger
   */
  constructor(
    repository?: ExperimentRepository,
    featureFlagManager?: FeatureFlagManager,
    logger?: any
  ) {
    this.repository = repository || new InMemoryExperimentRepository();
    this.featureFlagManager = featureFlagManager || null;
    this.events = new EventEmitter();
    this.logger = logger || console;
    this.initialized = false;
    this.variantAssignments = new Map();
  }
  
  /**
   * Initialize the A/B testing manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Initialize the feature flag manager if available
    if (this.featureFlagManager && !this.featureFlagManager['initialized']) {
      await this.featureFlagManager.initialize();
    }
    
    this.initialized = true;
    this.events.emit(ABTestingManagerEvents.INITIALIZED);
    this.logger.info('A/B testing manager initialized');
  }
  
  /**
   * Get the experiment repository
   * @returns The experiment repository
   */
  getRepository(): ExperimentRepository {
    return this.repository;
  }
  
  /**
   * Set the experiment repository
   * @param repository The repository to set
   */
  setRepository(repository: ExperimentRepository): void {
    this.repository = repository;
  }
  
  /**
   * Get the feature flag manager
   * @returns The feature flag manager
   */
  getFeatureFlagManager(): FeatureFlagManager | null {
    return this.featureFlagManager;
  }
  
  /**
   * Set the feature flag manager
   * @param manager The feature flag manager to set
   */
  setFeatureFlagManager(manager: FeatureFlagManager): void {
    this.featureFlagManager = manager;
  }
  
  /**
   * Get all experiments
   * @returns Promise resolving to an array of experiments
   */
  async getExperiments(): Promise<Experiment[]> {
    this.ensureInitialized();
    return this.repository.getExperiments();
  }
  
  /**
   * Get a specific experiment by ID
   * @param experimentId The experiment ID
   * @returns Promise resolving to the experiment or null if not found
   */
  async getExperiment(experimentId: string): Promise<Experiment | null> {
    this.ensureInitialized();
    return this.repository.getExperiment(experimentId);
  }
  
  /**
   * Create a new experiment
   * @param experiment The experiment to create
   * @returns Promise resolving to the created experiment
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    this.ensureInitialized();
    
    const newExperiment = await this.repository.createExperiment(experiment);
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_CREATED, newExperiment);
    
    return newExperiment;
  }
  
  /**
   * Update an existing experiment
   * @param experimentId The experiment ID
   * @param experiment The updated experiment properties
   * @returns Promise resolving to the updated experiment
   */
  async updateExperiment(experimentId: string, experiment: Partial<Experiment>): Promise<Experiment> {
    this.ensureInitialized();
    
    const updatedExperiment = await this.repository.updateExperiment(experimentId, experiment);
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_UPDATED, updatedExperiment);
    
    return updatedExperiment;
  }
  
  /**
   * Delete an experiment
   * @param experimentId The experiment ID
   */
  async deleteExperiment(experimentId: string): Promise<void> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    await this.repository.deleteExperiment(experimentId);
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_DELETED, experimentId, experiment);
    
    // Remove assignments for this experiment
    this.variantAssignments.delete(experimentId);
  }
  
  /**
   * Start an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the updated experiment
   */
  async startExperiment(experimentId: string): Promise<Experiment> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const updatedExperiment = ExperimentImpl.fromExisting(experiment).start();
    await this.repository.updateExperiment(experimentId, updatedExperiment);
    
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_STARTED, updatedExperiment);
    
    return updatedExperiment;
  }
  
  /**
   * Pause an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the updated experiment
   */
  async pauseExperiment(experimentId: string): Promise<Experiment> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const updatedExperiment = ExperimentImpl.fromExisting(experiment).pause();
    await this.repository.updateExperiment(experimentId, updatedExperiment);
    
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_PAUSED, updatedExperiment);
    
    return updatedExperiment;
  }
  
  /**
   * Resume an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the updated experiment
   */
  async resumeExperiment(experimentId: string): Promise<Experiment> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const updatedExperiment = ExperimentImpl.fromExisting(experiment).resume();
    await this.repository.updateExperiment(experimentId, updatedExperiment);
    
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_RESUMED, updatedExperiment);
    
    return updatedExperiment;
  }
  
  /**
   * End an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the updated experiment
   */
  async endExperiment(experimentId: string): Promise<Experiment> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const updatedExperiment = ExperimentImpl.fromExisting(experiment).end();
    await this.repository.updateExperiment(experimentId, updatedExperiment);
    
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_ENDED, updatedExperiment);
    
    return updatedExperiment;
  }
  
  /**
   * Archive an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the updated experiment
   */
  async archiveExperiment(experimentId: string): Promise<Experiment> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const updatedExperiment = ExperimentImpl.fromExisting(experiment).archive();
    await this.repository.updateExperiment(experimentId, updatedExperiment);
    
    this.events.emit(ABTestingManagerEvents.EXPERIMENT_ARCHIVED, updatedExperiment);
    
    return updatedExperiment;
  }
  
  /**
   * Assign a user to a variant
   * @param experimentId The experiment ID
   * @param userId The user ID
   * @param options Optional assignment options
   * @returns Promise resolving to the assignment result
   */
  async assignVariant(
    experimentId: string,
    userId: string,
    options: AssignmentOptions = {}
  ): Promise<AssignmentResult> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    // Get the current assignment if any
    const currentAssignment = this.getUserAssignment(experimentId, userId);
    
    // Use a sticky assignment by default
    const assignmentOptions: AssignmentOptions = {
      strategy: AssignmentStrategy.STICKY,
      currentAssignment,
      ...options
    };
    
    // Assign the variant
    const experimentImpl = ExperimentImpl.fromExisting(experiment);
    const result = experimentImpl.assignVariant(userId, assignmentOptions);
    
    // Store the assignment
    this.setUserAssignment(experimentId, userId, result.variantId);
    
    // Emit an event
    this.events.emit(ABTestingManagerEvents.VARIANT_ASSIGNED, result);
    
    // Track the exposure if this is a fresh assignment
    if (result.isFresh) {
      await this.trackExposure(experimentId, result.variantId, userId);
    }
    
    return result;
  }
  
  /**
   * Get the assigned variant for a user
   * @param experimentId The experiment ID
   * @param userId The user ID
   * @returns Promise resolving to the assigned variant or null if not assigned
   */
  async getAssignedVariant(experimentId: string, userId: string): Promise<Variant | null> {
    this.ensureInitialized();
    
    // Get the experiment
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    // Get the assignment
    const variantId = this.getUserAssignment(experimentId, userId);
    
    if (!variantId) {
      return null;
    }
    
    // Find the variant
    const variant = experiment.variants.find(v => v.id === variantId);
    
    return variant || null;
  }
  
  /**
   * Override a user's variant assignment
   * @param experimentId The experiment ID
   * @param userId The user ID
   * @param variantId The variant ID to assign
   * @returns Promise resolving to the assignment result
   */
  async overrideVariant(experimentId: string, userId: string, variantId: string): Promise<AssignmentResult> {
    this.ensureInitialized();
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const variant = experiment.variants.find(v => v.id === variantId);
    
    if (!variant) {
      throw new Error(`Variant ${variantId} not found in experiment ${experimentId}`);
    }
    
    // Override the assignment
    this.setUserAssignment(experimentId, userId, variantId);
    
    // Create the result
    const result: AssignmentResult = {
      experimentId,
      variantId,
      variant,
      isSticky: true,
      isFresh: true
    };
    
    // Emit an event
    this.events.emit(ABTestingManagerEvents.VARIANT_OVERRIDE, result);
    
    // Track the exposure
    await this.trackExposure(experimentId, variantId, userId);
    
    return result;
  }
  
  /**
   * Track a metric event
   * @param experimentId The experiment ID
   * @param metricId The metric ID
   * @param userId The user ID
   * @param value Optional value for the metric
   * @param metadata Optional metadata for the event
   * @returns Promise resolving to the tracked event
   */
  async trackMetric(
    experimentId: string,
    metricId: string,
    userId: string,
    value?: number,
    metadata?: Record<string, any>
  ): Promise<ExperimentEvent> {
    this.ensureInitialized();
    
    // Get the experiment
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    // Get the metric
    const metric = experiment.metrics.find(m => m.id === metricId);
    
    if (!metric) {
      throw new Error(`Metric ${metricId} not found in experiment ${experimentId}`);
    }
    
    // Get the variant assignment
    const variantId = this.getUserAssignment(experimentId, userId);
    
    // Track the event
    const event = await this.repository.trackEvent({
      type: ExperimentEventType.METRIC,
      experimentId,
      metricId,
      userId,
      variantId,
      value,
      metadata
    });
    
    // Emit an event
    this.events.emit(ABTestingManagerEvents.METRIC_TRACKED, event);
    
    return event;
  }
  
  /**
   * Track exposure to a variant
   * @param experimentId The experiment ID
   * @param variantId The variant ID
   * @param userId The user ID
   * @param metadata Optional metadata for the event
   * @returns Promise resolving to the tracked event
   */
  async trackExposure(
    experimentId: string,
    variantId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<ExperimentEvent> {
    this.ensureInitialized();
    
    // Get the experiment
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    // Get the variant
    const variant = experiment.variants.find(v => v.id === variantId);
    
    if (!variant) {
      throw new Error(`Variant ${variantId} not found in experiment ${experimentId}`);
    }
    
    // Track the event
    const event = await this.repository.trackEvent({
      type: ExperimentEventType.EXPOSURE,
      experimentId,
      variantId,
      userId,
      metadata
    });
    
    // Emit an event
    this.events.emit(ABTestingManagerEvents.EXPOSURE_TRACKED, event);
    
    return event;
  }
  
  /**
   * Get the results for an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the experiment results or null if not found
   */
  async getResults(experimentId: string): Promise<ExperimentResults | null> {
    this.ensureInitialized();
    return this.repository.getExperimentResults(experimentId);
  }
  
  /**
   * Check if a user is part of an experiment
   * @param experimentId The experiment ID
   * @param userId The user ID
   * @returns Promise resolving to whether the user is part of the experiment
   */
  async isInExperiment(experimentId: string, userId: string): Promise<boolean> {
    this.ensureInitialized();
    
    // Get the experiment
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    // Check if the user has been assigned to the experiment
    const variantId = this.getUserAssignment(experimentId, userId);
    
    if (variantId) {
      return true;
    }
    
    // Check if the user has been exposed to the experiment
    const events = await this.repository.getEvents(experimentId, {
      type: ExperimentEventType.EXPOSURE,
      userId
    });
    
    return events.length > 0;
  }
  
  /**
   * Check if an experiment has a winner
   * @param experimentId The experiment ID
   * @returns Promise resolving to whether the experiment has a winner
   */
  async hasWinner(experimentId: string): Promise<boolean> {
    this.ensureInitialized();
    
    const results = await this.repository.getExperimentResults(experimentId);
    
    return !!results?.hasWinner;
  }
  
  /**
   * Get the winner of an experiment
   * @param experimentId The experiment ID
   * @returns Promise resolving to the winning variant or null if no winner
   */
  async getWinner(experimentId: string): Promise<Variant | null> {
    this.ensureInitialized();
    
    const results = await this.repository.getExperimentResults(experimentId);
    
    if (!results?.hasWinner || !results.winningVariantId) {
      return null;
    }
    
    const experiment = await this.repository.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    const variant = experiment.variants.find(v => v.id === results.winningVariantId);
    
    return variant || null;
  }
  
  /**
   * Subscribe to manager events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: ABTestingManagerEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }
  
  /**
   * Unsubscribe from manager events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: ABTestingManagerEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
  
  /**
   * Get a user's assignment for an experiment
   * @param experimentId The experiment ID
   * @param userId The user ID
   * @returns The variant ID or undefined if not assigned
   */
  private getUserAssignment(experimentId: string, userId: string): string | undefined {
    const experimentAssignments = this.variantAssignments.get(experimentId);
    
    if (!experimentAssignments) {
      return undefined;
    }
    
    return experimentAssignments[userId];
  }
  
  /**
   * Set a user's assignment for an experiment
   * @param experimentId The experiment ID
   * @param userId The user ID
   * @param variantId The variant ID
   */
  private setUserAssignment(experimentId: string, userId: string, variantId: string): void {
    // Create assignments map for the experiment if it doesn't exist
    if (!this.variantAssignments.has(experimentId)) {
      this.variantAssignments.set(experimentId, {});
    }
    
    // Set the assignment
    this.variantAssignments.get(experimentId)![userId] = variantId;
  }
  
  /**
   * Ensure that the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('A/B testing manager is not initialized. Call initialize() first.');
    }
  }
}