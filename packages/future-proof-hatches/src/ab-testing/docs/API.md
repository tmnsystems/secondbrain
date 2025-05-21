# A/B Testing Framework API Reference

This document provides detailed API reference for the A/B Testing Framework.

## Core Interfaces

### ABTestingManager

The main entry point for interacting with the A/B Testing Framework.

```typescript
interface ABTestingManager {
  // Experiment Management
  createExperiment(
    name: string,
    description: string,
    variants: Variant[],
    metrics: string[],
    options?: {
      assignmentStrategy?: VariantAssignmentStrategy;
      endDate?: Date;
      id?: string;
      trafficAllocation?: number;
      requiredUserContext?: string[];
      targetingConditions?: Record<string, any>;
    }
  ): Promise<Experiment>;
  
  getExperiment(id: string): Promise<Experiment | null>;
  
  updateExperiment(experiment: Experiment): Promise<Experiment>;
  
  deleteExperiment(id: string): Promise<boolean>;
  
  listExperiments(filter?: { status?: ExperimentStatus }): Promise<Experiment[]>;
  
  // Experiment Lifecycle
  startExperiment(id: string): Promise<Experiment>;
  
  pauseExperiment(id: string): Promise<Experiment>;
  
  endExperiment(id: string): Promise<Experiment>;
  
  // Variant Assignment
  getVariantAssignment(
    experimentId: string,
    userId: string,
    context?: UserContext
  ): Promise<Variant | null>;
  
  getUserAssignment(experimentId: string, userId: string): Promise<UserAssignment | null>;
  
  getUserAssignments(userId: string): Promise<UserAssignment[]>;
  
  // Metrics
  recordMetricEvent(
    metricId: string,
    userId: string,
    value: number,
    context?: Record<string, any>
  ): Promise<MetricEventData>;
  
  recordConversion(
    metricId: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<MetricEventData>;
  
  trackAction(
    userId: string,
    actionName: string,
    value?: number,
    context?: Record<string, any>
  ): Promise<boolean>;
  
  // Analysis
  analyzeExperiment(
    experimentId: string,
    timeframe?: AnalysisTimeframe
  ): Promise<ExperimentAnalysis>;
  
  // Events
  on(event: string, handler: (...args: any[]) => void): void;
  
  off(event: string, handler: (...args: any[]) => void): void;
  
  // Context
  addUserContextProvider(provider: (userId: string) => Promise<UserContext>): void;
  
  clearCache(): void;
}
```

### Experiment

Represents an A/B test experiment.

```typescript
interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  variants: Variant[];
  metrics: string[];
  startDate?: Date;
  endDate?: Date;
  assignmentStrategy: VariantAssignmentStrategy;
  trafficAllocation: number;
  requiredUserContext: string[];
  targetingConditions: Record<string, any>;
}
```

### Variant

Represents a version to test in an experiment.

```typescript
interface Variant {
  id: string;
  name: string;
  isControl: boolean;
  weight: number;
  config?: Record<string, any>;
}
```

### Metric

Represents a measurable outcome for an experiment.

```typescript
interface Metric {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  isCumulative: boolean;
  isCounter: boolean;
  unit?: string;
  
  record(userId: string, value: number, context?: Record<string, any>): MetricEventData;
  
  getEventsForUser(userId: string): MetricEventData[];
  
  getAllEvents(): MetricEventData[];
  
  getTotalForUser(userId: string): number;
  
  getAverageForUser(userId: string): number;
}
```

### ExperimentRepository

Interface for storing experiment data.

```typescript
interface ExperimentRepository {
  createExperiment(experiment: Experiment): Promise<Experiment>;
  
  getExperiment(id: string): Promise<Experiment | null>;
  
  updateExperiment(experiment: Experiment): Promise<Experiment>;
  
  deleteExperiment(id: string): Promise<boolean>;
  
  listExperiments(filter?: { status?: ExperimentStatus }): Promise<Experiment[]>;
  
  recordMetricEvent(event: MetricEventData): Promise<void>;
  
  getMetricEvents(metricId: string): Promise<MetricEventData[]>;
  
  getMetricEventsForUser(metricId: string, userId: string): Promise<MetricEventData[]>;
  
  recordUserAssignment(assignment: UserAssignment): Promise<void>;
  
  getUserAssignment(experimentId: string, userId: string): Promise<UserAssignment | null>;
  
  getUserAssignments(userId: string): Promise<UserAssignment[]>;
  
  getExperimentAssignments(experimentId: string): Promise<UserAssignment[]>;
  
  getVariantAssignments(experimentId: string, variantId: string): Promise<UserAssignment[]>;
}
```

### ExperimentAnalysis

Represents the results of an experiment analysis.

```typescript
interface ExperimentAnalysis {
  experimentId: string;
  experimentName: string;
  startDate?: Date;
  endDate?: Date;
  status: ExperimentStatus;
  totalUsers: number;
  variants: VariantAnalysis[];
  timeframe: AnalysisTimeframe;
  analysisDate: Date;
}
```

### VariantAnalysis

Represents the analysis results for a specific variant.

```typescript
interface VariantAnalysis {
  variantId: string;
  variantName: string;
  isControl: boolean;
  numberOfUsers: number;
  metrics: Record<string, {
    average: number;
    total: number;
    count: number;
    confidenceInterval: ConfidenceInterval;
  }>;
  comparisonToControl: Record<string, {
    relativeImprovement: number;
    absoluteImprovement: number;
    significance: StatisticalSignificance;
    pValue: number;
  }> | null;
}
```

## Enums

### ExperimentStatus

```typescript
enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}
```

### VariantAssignmentStrategy

```typescript
enum VariantAssignmentStrategy {
  RANDOM = 'random',
  STICKY = 'sticky',
  WEIGHTED = 'weighted',
  USER_ATTRIBUTE = 'user_attribute'
}
```

### MetricType

```typescript
enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  TIMER = 'timer',
  CONVERSION = 'conversion',
  REVENUE = 'revenue'
}
```

### AnalysisTimeframe

```typescript
enum AnalysisTimeframe {
  ALL_TIME = 'all_time',
  LAST_DAY = 'last_day',
  LAST_WEEK = 'last_week',
  LAST_MONTH = 'last_month'
}
```

### StatisticalSignificance

```typescript
enum StatisticalSignificance {
  NOT_SIGNIFICANT = 'not_significant',
  MARGINALLY_SIGNIFICANT = 'marginally_significant',
  SIGNIFICANT = 'significant',
  HIGHLY_SIGNIFICANT = 'highly_significant'
}
```

## Events

Events emitted by the ABTestingManager:

```typescript
// When an experiment is created
abTestManager.on('experimentCreated', (experiment: Experiment) => {});

// When an experiment is updated
abTestManager.on('experimentUpdated', (experiment: Experiment) => {});

// When an experiment is deleted
abTestManager.on('experimentDeleted', (experiment: Experiment) => {});

// When an experiment is started
abTestManager.on('experimentStarted', (experiment: Experiment) => {});

// When an experiment is paused
abTestManager.on('experimentPaused', (experiment: Experiment) => {});

// When an experiment is ended
abTestManager.on('experimentEnded', (experiment: Experiment) => {});

// When a user is assigned to a variant
abTestManager.on('userAssigned', (assignment: UserAssignment) => {});

// When a metric is recorded
abTestManager.on('metricRecorded', (event: MetricEventData) => {});
```

## Implementations

### ABTestingManagerImpl

The default implementation of ABTestingManager.

```typescript
class ABTestingManagerImpl implements ABTestingManager {
  constructor(repository: ExperimentRepository);
  
  // Implements all methods from ABTestingManager
}
```

### InMemoryExperimentRepository

An in-memory implementation of ExperimentRepository, suitable for development and testing.

```typescript
class InMemoryExperimentRepository implements ExperimentRepository {
  constructor();
  
  // Implements all methods from ExperimentRepository
}
```

### RedisExperimentRepository

A Redis-based implementation of ExperimentRepository, suitable for production use.

```typescript
class RedisExperimentRepository implements ExperimentRepository {
  constructor(options: Redis.RedisOptions, keyPrefix?: string);
  
  close(): Promise<void>;
  
  // Implements all methods from ExperimentRepository
}
```

### MetricImpl

The default implementation of Metric.

```typescript
class MetricImpl implements Metric {
  constructor(
    name: string,
    description: string,
    type: MetricType,
    options?: {
      isCumulative?: boolean;
      isCounter?: boolean;
      id?: string;
      unit?: string;
    }
  );
  
  // Implements all methods from Metric
  
  // Factory methods
  static createCounter(name: string, description: string): MetricImpl;
  static createGauge(name: string, description: string, unit?: string): MetricImpl;
  static createTimer(name: string, description: string): MetricImpl;
  static createConversion(name: string, description: string): MetricImpl;
  static createRevenue(name: string, description: string, currencyUnit?: string): MetricImpl;
}
```

### ExperimentImpl

The default implementation of Experiment.

```typescript
class ExperimentImpl implements Experiment {
  constructor(
    name: string,
    description: string,
    variants: Variant[],
    metrics: string[],
    options?: {
      assignmentStrategy?: VariantAssignmentStrategy;
      endDate?: Date;
      id?: string;
      trafficAllocation?: number;
      requiredUserContext?: string[];
      targetingConditions?: Record<string, any>;
    }
  );
  
  // Lifecycle methods
  start(): Experiment;
  pause(): Experiment;
  resume(): Experiment;
  end(): Experiment;
  archive(): Experiment;
}
```

### ExperimentAnalyzer

Utility class for analyzing experiment results.

```typescript
class ExperimentAnalyzer {
  static analyzeExperiment(
    experiment: Experiment,
    variants: Variant[],
    assignments: UserAssignment[],
    metricEvents: Map<string, MetricEventData[]>,
    timeframe?: AnalysisTimeframe
  ): ExperimentAnalysis;
  
  static analyzeVariant(
    experiment: Experiment,
    variant: Variant,
    assignments: UserAssignment[],
    metricEvents: Map<string, MetricEventData[]>,
    timeframe: AnalysisTimeframe
  ): VariantAnalysis;
  
  static compareVariants(
    controlAnalysis: VariantAnalysis,
    treatmentAnalysis: VariantAnalysis
  ): Record<string, {
    relativeImprovement: number;
    absoluteImprovement: number;
    significance: StatisticalSignificance;
    pValue: number;
  }>;
}
```

## Usage Examples

### Creating an Experiment

```typescript
const abTestManager = new ABTestingManagerImpl(new InMemoryExperimentRepository());

const experiment = await abTestManager.createExperiment(
  'New Feature Experiment',
  'Test the new feature',
  [
    { id: 'control', name: 'Control', isControl: true, weight: 50 },
    { id: 'treatment', name: 'Treatment', isControl: false, weight: 50 }
  ],
  ['page_view', 'feature_click', 'conversion'],
  {
    assignmentStrategy: VariantAssignmentStrategy.STICKY,
    trafficAllocation: 0.5, // 50% of users
    targetingConditions: { isLoggedIn: true } // Only show to logged-in users
  }
);

// Start the experiment
await abTestManager.startExperiment(experiment.id);
```

### Getting a Variant Assignment

```typescript
// Get the variant for a user
const variant = await abTestManager.getVariantAssignment(
  experimentId,
  userId,
  { isLoggedIn: true, country: 'US' }
);

if (variant) {
  console.log(`Assigned to variant: ${variant.name}`);
  // Use the variant configuration
  if (variant.config.showNewFeature) {
    // Show the new feature
  }
} else {
  console.log('User not included in experiment');
}
```

### Recording Metrics

```typescript
// Record a page view
await abTestManager.recordMetricEvent('page_view', userId, 1);

// Record a feature click
await abTestManager.recordMetricEvent('feature_click', userId, 1);

// Record a conversion
await abTestManager.recordConversion('conversion', userId);

// Record a transaction amount
await abTestManager.recordMetricEvent('purchase_amount', userId, 99.99);

// Record a metric with context
await abTestManager.recordMetricEvent('feature_click', userId, 1, {
  source: 'homepage',
  device: 'mobile'
});
```

### Analyzing Results

```typescript
// Analyze experiment results
const analysis = await abTestManager.analyzeExperiment(experimentId);

// Check if there's a significant improvement
const treatmentVariant = analysis.variants.find(v => !v.isControl);

if (treatmentVariant && treatmentVariant.comparisonToControl) {
  const conversionComparison = treatmentVariant.comparisonToControl['conversion'];
  
  if (conversionComparison.relativeImprovement > 0 && conversionComparison.pValue < 0.05) {
    console.log('Treatment significantly improved conversion!');
    console.log(`Improvement: ${conversionComparison.relativeImprovement.toFixed(2)}%`);
    console.log(`p-value: ${conversionComparison.pValue.toFixed(4)}`);
  } else {
    console.log('No significant improvement in conversion');
  }
}
```

### Ending an Experiment

```typescript
// End the experiment
await abTestManager.endExperiment(experimentId);
```

### Using Redis Repository

```typescript
// Create Redis repository
const redisRepository = new RedisExperimentRepository({
  host: 'localhost',
  port: 6379,
  password: 'password'
});

// Create A/B testing manager with Redis repository
const abTestManager = new ABTestingManagerImpl(redisRepository);

// Use as normal
const experiment = await abTestManager.createExperiment(...);

// Close Redis connection when done
await redisRepository.close();
```

### Adding a User Context Provider

```typescript
// Add a user context provider that fetches user data
abTestManager.addUserContextProvider(async (userId) => {
  // Fetch user data from database
  const user = await userService.getUser(userId);
  
  // Return user context
  return {
    isLoggedIn: !!user,
    isPremium: user?.isPremium || false,
    country: user?.country || 'unknown',
    joinDate: user?.joinDate
  };
});

// Now this context will be available when getting variant assignments
const variant = await abTestManager.getVariantAssignment(experimentId, userId);
// No need to pass context manually, it's fetched automatically
```

### Subscribing to Events

```typescript
// Listen for variant assignments
abTestManager.on('userAssigned', (assignment) => {
  console.log(`User ${assignment.userId} assigned to variant ${assignment.variantId}`);
});

// Listen for metric events
abTestManager.on('metricRecorded', (event) => {
  console.log(`Metric ${event.metricId} recorded for user ${event.userId}: ${event.value}`);
});
```

## Advanced Use Cases

### Multi-Armed Bandit Testing

```typescript
// Create an experiment with multiple variants
const experiment = await abTestManager.createExperiment(
  'Multi-Armed Bandit Test',
  'Test multiple variants with dynamic allocation',
  [
    { id: 'control', name: 'Control', isControl: true, weight: 25 },
    { id: 'variant1', name: 'Variant 1', isControl: false, weight: 25 },
    { id: 'variant2', name: 'Variant 2', isControl: false, weight: 25 },
    { id: 'variant3', name: 'Variant 3', isControl: false, weight: 25 }
  ],
  ['conversion'],
  {
    assignmentStrategy: VariantAssignmentStrategy.WEIGHTED
  }
);

// Start the experiment
await abTestManager.startExperiment(experiment.id);

// Periodically update variant weights based on performance
async function updateVariantWeights() {
  const analysis = await abTestManager.analyzeExperiment(experiment.id);
  
  // Calculate new weights based on conversion rates
  const totalConversions = analysis.variants.reduce((sum, variant) => {
    return sum + (variant.metrics['conversion']?.total || 0);
  }, 0);
  
  if (totalConversions > 0) {
    const newVariants = analysis.variants.map(variant => {
      const conversions = variant.metrics['conversion']?.total || 0;
      const weight = Math.max(10, Math.round((conversions / totalConversions) * 100));
      
      return {
        ...variant,
        weight
      };
    });
    
    // Update the experiment with new variant weights
    await abTestManager.updateExperiment({
      ...experiment,
      variants: newVariants
    });
  }
}

// Run weight update every hour
setInterval(updateVariantWeights, 60 * 60 * 1000);
```

### Feature Rollout with A/B Testing

```typescript
// Create an experiment for feature rollout
const experiment = await abTestManager.createExperiment(
  'New Feature Rollout',
  'Gradual rollout of new feature',
  [
    { id: 'control', name: 'Current Version', isControl: true, weight: 90 },
    { id: 'treatment', name: 'New Feature', isControl: false, weight: 10 }
  ],
  ['usage', 'errors', 'satisfaction'],
  {
    assignmentStrategy: VariantAssignmentStrategy.STICKY
  }
);

// Start the experiment
await abTestManager.startExperiment(experiment.id);

// Gradually increase the traffic to the new feature
async function increaseFeatureRollout() {
  const currentExperiment = await abTestManager.getExperiment(experiment.id);
  
  if (!currentExperiment) return;
  
  const controlVariant = currentExperiment.variants.find(v => v.isControl);
  const treatmentVariant = currentExperiment.variants.find(v => !v.isControl);
  
  if (!controlVariant || !treatmentVariant) return;
  
  // Calculate new weights (gradually increase treatment, decrease control)
  const newControlWeight = Math.max(0, controlVariant.weight - 10);
  const newTreatmentWeight = 100 - newControlWeight;
  
  // Update variant weights
  const updatedVariants = currentExperiment.variants.map(v => {
    if (v.isControl) {
      return { ...v, weight: newControlWeight };
    } else {
      return { ...v, weight: newTreatmentWeight };
    }
  });
  
  // Update the experiment
  await abTestManager.updateExperiment({
    ...currentExperiment,
    variants: updatedVariants
  });
  
  console.log(`Rollout updated: ${newTreatmentWeight}% of users now see the new feature`);
  
  // If rollout is complete, end the experiment
  if (newControlWeight === 0) {
    await abTestManager.endExperiment(experiment.id);
    console.log('Rollout complete, experiment ended');
  }
}

// Increase rollout every week if no significant issues
setInterval(async () => {
  const analysis = await abTestManager.analyzeExperiment(experiment.id);
  const treatmentVariant = analysis.variants.find(v => !v.isControl);
  
  if (treatmentVariant && treatmentVariant.comparisonToControl) {
    const errorComparison = treatmentVariant.comparisonToControl['errors'];
    
    // Only continue rollout if errors are not significantly worse
    if (!errorComparison || errorComparison.relativeImprovement >= 0 || errorComparison.pValue >= 0.05) {
      increaseFeatureRollout();
    } else {
      console.log('Rollout paused due to significant increase in errors');
    }
  }
}, 7 * 24 * 60 * 60 * 1000); // Weekly
```