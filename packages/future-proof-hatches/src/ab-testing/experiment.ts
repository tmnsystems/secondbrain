/**
 * Experiment Class
 * @module ab-testing/experiment
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Experiment,
  ExperimentStatus,
  ExperimentType,
  Variant,
  Metric,
  TargetingCondition,
  AssignmentStrategy,
  AssignmentOptions,
  AssignmentResult
} from './types';

/**
 * Implementation of the Experiment interface
 */
export class ExperimentImpl implements Experiment {
  /** Unique identifier for the experiment */
  id: string;
  /** Human-readable name for the experiment */
  name: string;
  /** Description of the experiment */
  description: string;
  /** Type of experiment */
  type: ExperimentType;
  /** Current status of the experiment */
  status: ExperimentStatus;
  /** When the experiment was created */
  createdAt: Date;
  /** When the experiment was last updated */
  updatedAt: Date;
  /** When the experiment started running */
  startedAt?: Date;
  /** When the experiment ended */
  endedAt?: Date;
  /** Variants in the experiment */
  variants: Variant[];
  /** Feature flag ID associated with the experiment */
  featureFlagId?: string;
  /** Metrics being tracked */
  metrics: Metric[];
  /** Targeting conditions */
  targeting?: TargetingCondition;
  /** Experiment metadata */
  metadata?: Record<string, any>;
  
  /**
   * Create a new ExperimentImpl
   * @param params Experiment parameters
   */
  constructor(params: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    
    this.id = uuidv4();
    this.name = params.name;
    this.description = params.description;
    this.type = params.type;
    this.status = params.status || ExperimentStatus.DRAFT;
    this.createdAt = now;
    this.updatedAt = now;
    this.startedAt = params.startedAt;
    this.endedAt = params.endedAt;
    this.variants = params.variants;
    this.featureFlagId = params.featureFlagId;
    this.metrics = params.metrics;
    this.targeting = params.targeting;
    this.metadata = params.metadata;
    
    // Validate the experiment
    this.validate();
  }
  
  /**
   * Validate the experiment
   * @throws Error if the experiment is invalid
   */
  validate(): void {
    // Experiment must have a name
    if (!this.name) {
      throw new Error('Experiment must have a name');
    }
    
    // Experiment must have at least one variant
    if (!this.variants || this.variants.length < 1) {
      throw new Error('Experiment must have at least one variant');
    }
    
    // A/B and A/B/n experiments must have at least two variants
    if ((this.type === ExperimentType.A_B || this.type === ExperimentType.A_B_N) && this.variants.length < 2) {
      throw new Error(`${this.type} experiments must have at least two variants`);
    }
    
    // Experiment must have at least one metric
    if (!this.metrics || this.metrics.length < 1) {
      throw new Error('Experiment must have at least one metric');
    }
    
    // Check for control variant
    const controlVariants = this.variants.filter(v => v.isControl);
    if (controlVariants.length === 0) {
      throw new Error('Experiment must have a control variant');
    }
    if (controlVariants.length > 1) {
      throw new Error('Experiment cannot have more than one control variant');
    }
    
    // Check variant weights sum to 100%
    const totalWeight = this.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) { // Allow for small floating point errors
      throw new Error(`Variant weights must sum to 100%, but got ${totalWeight}%`);
    }
    
    // Feature flag experiments must have a feature flag ID
    if (this.type === ExperimentType.FEATURE_FLAG && !this.featureFlagId) {
      throw new Error('Feature flag experiments must have a feature flag ID');
    }
  }
  
  /**
   * Start the experiment
   * @returns The updated experiment
   */
  start(): Experiment {
    if (this.status === ExperimentStatus.RUNNING) {
      return this;
    }
    
    if (this.status === ExperimentStatus.COMPLETED || this.status === ExperimentStatus.ARCHIVED) {
      throw new Error(`Cannot start experiment in ${this.status} status`);
    }
    
    this.status = ExperimentStatus.RUNNING;
    this.startedAt = new Date();
    this.updatedAt = new Date();
    
    return this;
  }
  
  /**
   * Pause the experiment
   * @returns The updated experiment
   */
  pause(): Experiment {
    if (this.status === ExperimentStatus.PAUSED) {
      return this;
    }
    
    if (this.status !== ExperimentStatus.RUNNING) {
      throw new Error(`Cannot pause experiment in ${this.status} status`);
    }
    
    this.status = ExperimentStatus.PAUSED;
    this.updatedAt = new Date();
    
    return this;
  }
  
  /**
   * Resume the experiment
   * @returns The updated experiment
   */
  resume(): Experiment {
    if (this.status === ExperimentStatus.RUNNING) {
      return this;
    }
    
    if (this.status !== ExperimentStatus.PAUSED) {
      throw new Error(`Cannot resume experiment in ${this.status} status`);
    }
    
    this.status = ExperimentStatus.RUNNING;
    this.updatedAt = new Date();
    
    return this;
  }
  
  /**
   * End the experiment
   * @returns The updated experiment
   */
  end(): Experiment {
    if (this.status === ExperimentStatus.COMPLETED) {
      return this;
    }
    
    if (this.status !== ExperimentStatus.RUNNING && this.status !== ExperimentStatus.PAUSED) {
      throw new Error(`Cannot end experiment in ${this.status} status`);
    }
    
    this.status = ExperimentStatus.COMPLETED;
    this.endedAt = new Date();
    this.updatedAt = new Date();
    
    return this;
  }
  
  /**
   * Archive the experiment
   * @returns The updated experiment
   */
  archive(): Experiment {
    if (this.status === ExperimentStatus.ARCHIVED) {
      return this;
    }
    
    if (this.status !== ExperimentStatus.COMPLETED && this.status !== ExperimentStatus.DRAFT) {
      throw new Error(`Cannot archive experiment in ${this.status} status`);
    }
    
    this.status = ExperimentStatus.ARCHIVED;
    this.updatedAt = new Date();
    
    return this;
  }
  
  /**
   * Update the experiment
   * @param updates The updates to apply
   * @returns The updated experiment
   */
  update(updates: Partial<Experiment>): Experiment {
    // Update basic properties
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.description !== undefined) this.description = updates.description;
    if (updates.type !== undefined) this.type = updates.type;
    if (updates.featureFlagId !== undefined) this.featureFlagId = updates.featureFlagId;
    if (updates.targeting !== undefined) this.targeting = updates.targeting;
    if (updates.metadata !== undefined) this.metadata = { ...this.metadata, ...updates.metadata };
    
    // Update variants
    if (updates.variants !== undefined) {
      this.variants = updates.variants;
    }
    
    // Update metrics
    if (updates.metrics !== undefined) {
      this.metrics = updates.metrics;
    }
    
    // Update timestamps
    this.updatedAt = new Date();
    
    // Validate the updated experiment
    this.validate();
    
    return this;
  }
  
  /**
   * Assign a user to a variant
   * @param userId The user ID
   * @param options Assignment options
   * @returns The assignment result
   */
  assignVariant(userId: string, options: AssignmentOptions = {}): AssignmentResult {
    // If experiment is not running or paused, use the control variant
    if (this.status !== ExperimentStatus.RUNNING && this.status !== ExperimentStatus.PAUSED) {
      const controlVariant = this.variants.find(v => v.isControl)!;
      
      return {
        experimentId: this.id,
        variantId: controlVariant.id,
        variant: controlVariant,
        isSticky: false,
        isFresh: true
      };
    }
    
    const strategy = options.strategy || AssignmentStrategy.DETERMINISTIC;
    
    switch (strategy) {
      case AssignmentStrategy.RANDOM:
        return this.assignRandomly(userId, options);
      
      case AssignmentStrategy.DETERMINISTIC:
        return this.assignDeterministically(userId, options);
      
      case AssignmentStrategy.WEIGHTED:
        return this.assignWeighted(userId, options);
      
      case AssignmentStrategy.STICKY:
        return this.assignSticky(userId, options);
      
      default:
        throw new Error(`Unknown assignment strategy: ${strategy}`);
    }
  }
  
  /**
   * Assign a user randomly
   * @param userId The user ID
   * @param options Assignment options
   * @returns The assignment result
   */
  private assignRandomly(userId: string, options: AssignmentOptions): AssignmentResult {
    // Get eligible variants
    const eligibleVariants = this.getEligibleVariants(options);
    
    // Choose a random variant
    const randomIndex = Math.floor(Math.random() * eligibleVariants.length);
    const variant = eligibleVariants[randomIndex];
    
    return {
      experimentId: this.id,
      variantId: variant.id,
      variant,
      isSticky: false,
      isFresh: true
    };
  }
  
  /**
   * Assign a user deterministically
   * @param userId The user ID
   * @param options Assignment options
   * @returns The assignment result
   */
  private assignDeterministically(userId: string, options: AssignmentOptions): AssignmentResult {
    // Get eligible variants
    const eligibleVariants = this.getEligibleVariants(options);
    
    // Hash the user ID + experiment ID
    const hash = this.hashString(`${userId}:${this.id}`);
    
    // Use the hash to deterministically select a variant
    const index = hash % eligibleVariants.length;
    const variant = eligibleVariants[index];
    
    return {
      experimentId: this.id,
      variantId: variant.id,
      variant,
      isSticky: true,
      isFresh: options.currentAssignment !== variant.id
    };
  }
  
  /**
   * Assign a user based on variant weights
   * @param userId The user ID
   * @param options Assignment options
   * @returns The assignment result
   */
  private assignWeighted(userId: string, options: AssignmentOptions): AssignmentResult {
    // Get eligible variants
    const eligibleVariants = this.getEligibleVariants(options);
    
    // Get variant weights
    const weights = eligibleVariants.map(v => v.weight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // Normalize weights if they don't sum to 100%
    const normalizedWeights = weights.map(weight => (weight / totalWeight) * 100);
    
    // Generate a random number between 0 and 100
    let randomValue: number;
    
    if (options.equalDistribution) {
      // For equal distribution, use a deterministic hash
      const hash = this.hashString(`${userId}:${this.id}`);
      randomValue = hash % 100;
    } else {
      // Otherwise, use random selection
      randomValue = Math.random() * 100;
    }
    
    // Find the variant based on weighted random selection
    let cumulativeWeight = 0;
    
    for (let i = 0; i < eligibleVariants.length; i++) {
      cumulativeWeight += normalizedWeights[i];
      
      if (randomValue <= cumulativeWeight) {
        return {
          experimentId: this.id,
          variantId: eligibleVariants[i].id,
          variant: eligibleVariants[i],
          isSticky: options.equalDistribution,
          isFresh: options.currentAssignment !== eligibleVariants[i].id
        };
      }
    }
    
    // If we somehow got here, return the last variant
    const lastVariant = eligibleVariants[eligibleVariants.length - 1];
    
    return {
      experimentId: this.id,
      variantId: lastVariant.id,
      variant: lastVariant,
      isSticky: options.equalDistribution,
      isFresh: options.currentAssignment !== lastVariant.id
    };
  }
  
  /**
   * Assign a user while respecting the current assignment
   * @param userId The user ID
   * @param options Assignment options
   * @returns The assignment result
   */
  private assignSticky(userId: string, options: AssignmentOptions): AssignmentResult {
    // If the user already has an assignment, return it
    if (options.currentAssignment) {
      const currentVariant = this.variants.find(v => v.id === options.currentAssignment);
      
      if (currentVariant) {
        return {
          experimentId: this.id,
          variantId: currentVariant.id,
          variant: currentVariant,
          isSticky: true,
          isFresh: false
        };
      }
    }
    
    // Otherwise, assign them deterministically
    return this.assignDeterministically(userId, options);
  }
  
  /**
   * Get eligible variants for assignment
   * @param options Assignment options
   * @returns Array of eligible variants
   */
  private getEligibleVariants(options: AssignmentOptions): Variant[] {
    let eligibleVariants = [...this.variants];
    
    // Filter out excluded variants
    if (options.excludePrevious && options.currentAssignment) {
      eligibleVariants = eligibleVariants.filter(v => v.id !== options.currentAssignment);
    }
    
    // If no eligible variants, return all variants
    if (eligibleVariants.length === 0) {
      eligibleVariants = [...this.variants];
    }
    
    return eligibleVariants;
  }
  
  /**
   * Generate a deterministic hash from a string
   * @param str The string to hash
   * @returns A number between 0 and 2^32 - 1
   */
  private hashString(str: string): number {
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }
  
  /**
   * Create an experiment from an existing experiment object
   * @param experiment The experiment to create from
   * @returns A new experiment instance
   */
  static fromExisting(experiment: Experiment): ExperimentImpl {
    const instance = new ExperimentImpl({
      name: experiment.name,
      description: experiment.description,
      type: experiment.type,
      status: experiment.status,
      variants: experiment.variants,
      metrics: experiment.metrics,
      featureFlagId: experiment.featureFlagId,
      targeting: experiment.targeting,
      metadata: experiment.metadata,
      startedAt: experiment.startedAt,
      endedAt: experiment.endedAt
    });
    
    // Override the generated properties
    instance.id = experiment.id;
    instance.createdAt = experiment.createdAt;
    instance.updatedAt = experiment.updatedAt;
    
    return instance;
  }
}