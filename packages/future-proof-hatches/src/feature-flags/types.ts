/**
 * Feature Flags Types
 * @module feature-flags/types
 */

/**
 * Feature flag value type
 */
export enum FeatureFlagValueType {
  BOOLEAN = 'boolean',
  STRING = 'string',
  NUMBER = 'number',
  JSON = 'json',
}

/**
 * Feature flag status
 */
export enum FeatureFlagStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

/**
 * Environment type
 */
export enum EnvironmentType {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
  CUSTOM = 'custom',
}

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique identifier for the flag */
  id: string;
  /** Human-readable name for the flag */
  name: string;
  /** Description of what the flag controls */
  description: string;
  /** Type of the flag value */
  valueType: FeatureFlagValueType;
  /** Current status of the flag */
  status: FeatureFlagStatus;
  /** Default value if no rules match */
  defaultValue: any;
  /** When the flag was created */
  createdAt: Date;
  /** When the flag was last updated */
  updatedAt: Date;
  /** Tags for organizing flags */
  tags?: string[];
  /** Targeting rules for determining flag value */
  rules?: TargetingRule[];
  /** Flag metadata */
  metadata?: Record<string, any>;
  /** Whether the flag is temporary */
  temporary?: boolean;
  /** When the flag should be automatically archived */
  expiresAt?: Date;
  /** Environments where this flag is available */
  environments?: string[];
  /** Whether the flag value should be persisted for a user/context */
  sticky?: boolean;
  /** Associated variants for A/B testing */
  variants?: Record<string, any>;
}

/**
 * Targeting rule
 */
export interface TargetingRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name for the rule */
  name: string;
  /** Priority of the rule (lower number = higher priority) */
  priority: number;
  /** Conditions that must be met for the rule to apply */
  conditions: RuleCondition[];
  /** Value to return if the rule applies */
  value: any;
  /** Percentage rollout (0-100) */
  rollout?: number;
  /** If true, user assignment to this rule will be sticky */
  sticky?: boolean;
}

/**
 * Rule condition
 */
export interface RuleCondition {
  /** Context attribute to check */
  attribute: string;
  /** Operator to apply */
  operator: ConditionOperator;
  /** Value to compare against */
  value: any;
  /** Nested conditions (for AND/OR operators) */
  conditions?: RuleCondition[];
}

/**
 * Condition operator
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUALS = 'greater_than_or_equals',
  LESS_THAN_OR_EQUALS = 'less_than_or_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  MATCHES = 'matches',
  IN = 'in',
  NOT_IN = 'not_in',
  AND = 'and',
  OR = 'or',
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
  /** User ID */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Environment */
  environment?: string;
  /** Additional context attributes */
  [key: string]: any;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  /** Flag ID */
  flagId: string;
  /** Whether the flag is enabled */
  enabled: boolean;
  /** Flag value */
  value: any;
  /** Source of the evaluation result */
  source: EvaluationSource;
  /** Variant assigned (for A/B testing) */
  variant?: string;
  /** Rule ID that produced this result */
  ruleId?: string;
  /** Error if evaluation failed */
  error?: string;
}

/**
 * Evaluation source
 */
export enum EvaluationSource {
  DEFAULT = 'default',
  RULE = 'rule',
  OVERRIDE = 'override',
  CACHE = 'cache',
  ERROR = 'error',
}

/**
 * Feature flag event
 */
export interface FeatureFlagEvent {
  /** Event type */
  type: FeatureFlagEventType;
  /** Flag ID */
  flagId: string;
  /** Flag value */
  value: any;
  /** Evaluation context */
  context: EvaluationContext;
  /** Evaluation result */
  result: EvaluationResult;
  /** Timestamp */
  timestamp: Date;
  /** Client information */
  client?: {
    /** SDK name */
    name: string;
    /** SDK version */
    version: string;
  };
}

/**
 * Feature flag event type
 */
export enum FeatureFlagEventType {
  EVALUATION = 'evaluation',
  IMPRESSION = 'impression',
  ERROR = 'error',
}

/**
 * Feature flag provider interface
 */
export interface FeatureFlagProvider {
  /** Initialize the feature flag provider */
  initialize(): Promise<void>;
  /** Get all feature flags */
  getFlags(): Promise<FeatureFlag[]>;
  /** Get a specific flag by ID */
  getFlag(flagId: string): Promise<FeatureFlag | null>;
  /** Evaluate a flag for a context */
  evaluateFlag(flagId: string, context: EvaluationContext): Promise<EvaluationResult>;
  /** Evaluate all flags for a context */
  evaluateAllFlags(context: EvaluationContext): Promise<Record<string, EvaluationResult>>;
  /** Update a flag's status */
  updateFlagStatus(flagId: string, status: FeatureFlagStatus): Promise<void>;
  /** Create a new flag */
  createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;
  /** Update an existing flag */
  updateFlag(flagId: string, flag: Partial<FeatureFlag>): Promise<FeatureFlag>;
  /** Delete a flag */
  deleteFlag(flagId: string): Promise<void>;
  /** Track a flag event */
  trackEvent(event: FeatureFlagEvent): Promise<void>;
}

/**
 * Feature flag manager interface
 */
export interface FeatureFlagManager {
  /** Initialize the feature flag manager */
  initialize(): Promise<void>;
  /** Get the feature flag provider */
  getProvider(): FeatureFlagProvider;
  /** Set the feature flag provider */
  setProvider(provider: FeatureFlagProvider): void;
  /** Get all feature flags */
  getFlags(): Promise<FeatureFlag[]>;
  /** Get a specific flag by ID */
  getFlag(flagId: string): Promise<FeatureFlag | null>;
  /** Check if a feature is enabled */
  isEnabled(flagId: string, context?: EvaluationContext): Promise<boolean>;
  /** Get the value of a feature flag */
  getValue(flagId: string, defaultValue: any, context?: EvaluationContext): Promise<any>;
  /** Evaluate a flag for a context */
  evaluate(flagId: string, context?: EvaluationContext): Promise<EvaluationResult>;
  /** Evaluate all flags for a context */
  evaluateAll(context?: EvaluationContext): Promise<Record<string, EvaluationResult>>;
  /** Create a new flag */
  createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;
  /** Update an existing flag */
  updateFlag(flagId: string, flag: Partial<FeatureFlag>): Promise<FeatureFlag>;
  /** Update a flag's status */
  updateFlagStatus(flagId: string, status: FeatureFlagStatus): Promise<void>;
  /** Delete a flag */
  deleteFlag(flagId: string): Promise<void>;
  /** Register a flag event handler */
  onEvent(handler: (event: FeatureFlagEvent) => void): void;
  /** Unregister a flag event handler */
  offEvent(handler: (event: FeatureFlagEvent) => void): void;
}