/**
 * A/B Testing Framework Types
 * @module ab-testing/types
 */

import { FeatureFlagManager } from '../feature-flags/types';

/**
 * Experiment status
 */
export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Experiment type
 */
export enum ExperimentType {
  A_B = 'a_b',
  A_B_N = 'a_b_n',
  MULTIVARIATE = 'multivariate',
  SPLIT_URL = 'split_url',
  FEATURE_FLAG = 'feature_flag',
}

/**
 * Metric type
 */
export enum MetricType {
  REVENUE = 'revenue',
  CONVERSION = 'conversion',
  CLICK = 'click',
  PAGE_VIEW = 'page_view',
  CUSTOM = 'custom',
}

/**
 * Experiment definition
 */
export interface Experiment {
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
}

/**
 * Variant in an experiment
 */
export interface Variant {
  /** Unique identifier for the variant */
  id: string;
  /** Human-readable name for the variant */
  name: string;
  /** Whether this is the control variant */
  isControl: boolean;
  /** Weight of the variant (for distribution) */
  weight: number;
  /** Value of the variant */
  value: any;
  /** Configuration specific to this variant */
  config?: Record<string, any>;
}

/**
 * Metric definition
 */
export interface Metric {
  /** Unique identifier for the metric */
  id: string;
  /** Human-readable name for the metric */
  name: string;
  /** Type of metric */
  type: MetricType;
  /** Unit of measurement */
  unit?: string;
  /** Description of the metric */
  description?: string;
  /** Goal direction (higher values are better?) */
  higherIsBetter: boolean;
  /** Minimum improvement to be considered significant */
  minDetectableEffect?: number;
  /** Custom event name (for CUSTOM metric type) */
  eventName?: string;
  /** Goal value (for CONVERSION metrics) */
  goalValue?: number;
  /** Metadata for the metric */
  metadata?: Record<string, any>;
}

/**
 * Targeting condition
 */
export interface TargetingCondition {
  /** Audience segments to include */
  segments?: string[];
  /** Minimum percentage of users to include */
  minPercentage?: number;
  /** Maximum percentage of users to include */
  maxPercentage?: number;
  /** Attributes to target */
  attributes?: Record<string, any>;
}

/**
 * Experiment event
 */
export interface ExperimentEvent {
  /** Unique identifier for the event */
  id: string;
  /** Time the event occurred */
  timestamp: Date;
  /** Type of event */
  type: ExperimentEventType;
  /** Experiment ID */
  experimentId: string;
  /** Variant ID */
  variantId?: string;
  /** Metric ID */
  metricId?: string;
  /** User ID */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Value associated with the event */
  value?: number;
  /** Metadata for the event */
  metadata?: Record<string, any>;
}

/**
 * Experiment event type
 */
export enum ExperimentEventType {
  EXPOSURE = 'exposure',
  CONVERSION = 'conversion',
  METRIC = 'metric',
  REVENUE = 'revenue',
  CUSTOM = 'custom',
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  /** Experiment ID */
  experimentId: string;
  /** Time the results were calculated */
  calculatedAt: Date;
  /** Results by variant */
  variants: VariantResults[];
  /** Results by metric */
  metrics: MetricResults[];
  /** Whether the experiment has a winner */
  hasWinner: boolean;
  /** The winning variant (if there is one) */
  winningVariantId?: string;
  /** Statistical significance level */
  significanceLevel: number;
  /** Sample size */
  sampleSize: number;
  /** How close the experiment is to completion (0-1) */
  progress: number;
}

/**
 * Variant results
 */
export interface VariantResults {
  /** Variant ID */
  variantId: string;
  /** Variant name */
  variantName: string;
  /** Number of users exposed to the variant */
  exposure: number;
  /** Results by metric */
  metrics: Record<string, {
    /** Metric value */
    value: number;
    /** Improvement over control (%) */
    improvement: number;
    /** Confidence level (0-1) */
    confidence: number;
    /** Whether the difference is statistically significant */
    isSignificant: boolean;
  }>;
}

/**
 * Metric results
 */
export interface MetricResults {
  /** Metric ID */
  metricId: string;
  /** Metric name */
  metricName: string;
  /** Best-performing variant for this metric */
  bestVariantId: string;
  /** Results by variant */
  variants: Record<string, {
    /** Metric value */
    value: number;
    /** Improvement over control (%) */
    improvement: number;
    /** Confidence level (0-1) */
    confidence: number;
    /** Whether the difference is statistically significant */
    isSignificant: boolean;
  }>;
}

/**
 * Experiment repository interface
 */
export interface ExperimentRepository {
  /** Get all experiments */
  getExperiments(): Promise<Experiment[]>;
  /** Get a specific experiment by ID */
  getExperiment(experimentId: string): Promise<Experiment | null>;
  /** Create a new experiment */
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment>;
  /** Update an existing experiment */
  updateExperiment(experimentId: string, experiment: Partial<Experiment>): Promise<Experiment>;
  /** Delete an experiment */
  deleteExperiment(experimentId: string): Promise<void>;
  /** Get the results for an experiment */
  getExperimentResults(experimentId: string): Promise<ExperimentResults | null>;
  /** Track an experiment event */
  trackEvent(event: Omit<ExperimentEvent, 'id' | 'timestamp'>): Promise<ExperimentEvent>;
  /** Get events for an experiment */
  getEvents(experimentId: string, options?: EventQueryOptions): Promise<ExperimentEvent[]>;
}

/**
 * Event query options
 */
export interface EventQueryOptions {
  /** Type of events to retrieve */
  type?: ExperimentEventType;
  /** Variant ID to filter by */
  variantId?: string;
  /** Metric ID to filter by */
  metricId?: string;
  /** User ID to filter by */
  userId?: string;
  /** Start time for the query */
  startTime?: Date;
  /** End time for the query */
  endTime?: Date;
  /** Maximum number of events to retrieve */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Assignment strategy
 */
export enum AssignmentStrategy {
  RANDOM = 'random',
  DETERMINISTIC = 'deterministic',
  WEIGHTED = 'weighted',
  STICKY = 'sticky',
}

/**
 * Assignment options
 */
export interface AssignmentOptions {
  /** Assignment strategy */
  strategy?: AssignmentStrategy;
  /** User attributes */
  attributes?: Record<string, any>;
  /** Whether to ensure equal distribution */
  equalDistribution?: boolean;
  /** Exclude previously assigned variants */
  excludePrevious?: boolean;
  /** Current assignment (for sticky assignments) */
  currentAssignment?: string;
}

/**
 * Assignment result
 */
export interface AssignmentResult {
  /** Experiment ID */
  experimentId: string;
  /** Assigned variant ID */
  variantId: string;
  /** Assigned variant */
  variant: Variant;
  /** Whether the assignment was sticky */
  isSticky: boolean;
  /** Whether this is a fresh assignment */
  isFresh: boolean;
}

/**
 * A/B testing manager interface
 */
export interface ABTestingManager {
  /** Initialize the A/B testing manager */
  initialize(): Promise<void>;
  /** Get the experiment repository */
  getRepository(): ExperimentRepository;
  /** Set the experiment repository */
  setRepository(repository: ExperimentRepository): void;
  /** Get the feature flag manager */
  getFeatureFlagManager(): FeatureFlagManager | null;
  /** Set the feature flag manager */
  setFeatureFlagManager(manager: FeatureFlagManager): void;
  /** Get all experiments */
  getExperiments(): Promise<Experiment[]>;
  /** Get a specific experiment by ID */
  getExperiment(experimentId: string): Promise<Experiment | null>;
  /** Create a new experiment */
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment>;
  /** Update an existing experiment */
  updateExperiment(experimentId: string, experiment: Partial<Experiment>): Promise<Experiment>;
  /** Delete an experiment */
  deleteExperiment(experimentId: string): Promise<void>;
  /** Start an experiment */
  startExperiment(experimentId: string): Promise<Experiment>;
  /** Pause an experiment */
  pauseExperiment(experimentId: string): Promise<Experiment>;
  /** Resume an experiment */
  resumeExperiment(experimentId: string): Promise<Experiment>;
  /** End an experiment */
  endExperiment(experimentId: string): Promise<Experiment>;
  /** Archive an experiment */
  archiveExperiment(experimentId: string): Promise<Experiment>;
  /** Assign a user to a variant */
  assignVariant(experimentId: string, userId: string, options?: AssignmentOptions): Promise<AssignmentResult>;
  /** Get the assigned variant for a user */
  getAssignedVariant(experimentId: string, userId: string): Promise<Variant | null>;
  /** Override a user's variant assignment */
  overrideVariant(experimentId: string, userId: string, variantId: string): Promise<AssignmentResult>;
  /** Track a metric event */
  trackMetric(experimentId: string, metricId: string, userId: string, value?: number, metadata?: Record<string, any>): Promise<ExperimentEvent>;
  /** Track exposure to a variant */
  trackExposure(experimentId: string, variantId: string, userId: string, metadata?: Record<string, any>): Promise<ExperimentEvent>;
  /** Get the results for an experiment */
  getResults(experimentId: string): Promise<ExperimentResults | null>;
  /** Check if a user is part of an experiment */
  isInExperiment(experimentId: string, userId: string): Promise<boolean>;
  /** Check if an experiment has a winner */
  hasWinner(experimentId: string): Promise<boolean>;
  /** Get the winner of an experiment */
  getWinner(experimentId: string): Promise<Variant | null>;
}