# A/B Testing Framework

The A/B Testing Framework provides a comprehensive solution for testing different variants of features, pages, or configurations to determine which one performs better based on defined metrics.

## Overview

A/B testing (also known as split testing) is a method of comparing two or more versions of a feature or page to determine which one performs better based on predefined metrics. This framework enables you to create and manage experiments, assign users to different variants, track metrics, and analyze results.

## Key Features

- **Experiment Management**: Create, update, start, pause, resume, end, and archive experiments.
- **Variant Assignment**: Assign users to different variants of an experiment using various assignment strategies.
- **Metric Tracking**: Track metrics such as conversions, revenue, clicks, or custom metrics.
- **Statistical Analysis**: Analyze experiment results with statistical significance calculations.
- **Traffic Allocation**: Control what percentage of users are included in experiments.
- **User Targeting**: Target specific users based on attributes like country, role, or any custom attributes.
- **Feature Flag Integration**: Seamlessly integrate with the Feature Flags system.
- **Experiment Repositories**: Store experiment data in memory or Redis.
- **Event Tracking**: Track exposures, conversions, and other events.

## Core Components

### Experiment

An experiment represents a test of different variants of a feature, page, or configuration. Each experiment has:

- A unique identifier
- A name and description
- A set of variants to test
- Metrics to track
- Status (draft, running, paused, completed, archived)
- Assignment strategy
- Traffic allocation
- Targeting conditions

### Variant

A variant represents a version of a feature, page, or configuration. Each variant has:

- A unique identifier
- A name and description
- A weight (for weighted assignment)
- A flag indicating if it's the control variant
- Configuration values

### Metric

A metric represents a measurable outcome to track. Each metric has:

- A unique identifier
- A name and description
- A type (conversion, revenue, counter, timer, etc.)
- Options for how to aggregate values

### ABTestingManager

The `ABTestingManager` is the main entry point for interacting with the A/B Testing Framework. It provides methods for:

- Creating and managing experiments
- Assigning users to variants
- Tracking metrics and events
- Analyzing results

## Usage

### Creating an Experiment

```typescript
import { 
  ABTestingManagerImpl, 
  InMemoryExperimentRepository,
  VariantAssignmentStrategy 
} from '@secondbrain/future-proof-hatches/ab-testing';

// Create an A/B testing manager
const repository = new InMemoryExperimentRepository();
const abTestManager = new ABTestingManagerImpl(repository);

// Create an experiment
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

### Assigning Users to Variants

```typescript
// Assign a user to a variant
const userContext = { isLoggedIn: true, country: 'US' };
const variant = await abTestManager.getVariantAssignment(experiment.id, 'user123', userContext);

if (variant) {
  console.log(`User assigned to variant: ${variant.name}`);
  // Use the variant configuration
  if (variant.config.showNewFeature) {
    // Show the new feature
  }
}
```

### Tracking Metrics

```typescript
// Track a metric
await abTestManager.recordMetricEvent('page_view', 'user123', 1);

// Track a conversion
await abTestManager.recordMetricEvent('conversion', 'user123', 1);

// Track revenue
await abTestManager.recordMetricEvent('revenue', 'user123', 99.99);
```

### Analyzing Results

```typescript
// Analyze experiment results
const analysis = await abTestManager.analyzeExperiment(experiment.id);

console.log(`Experiment: ${analysis.experimentName}`);
console.log(`Total Users: ${analysis.totalUsers}`);

for (const variantAnalysis of analysis.variants) {
  console.log(`\n${variantAnalysis.variantName}:`);
  console.log(`  Users: ${variantAnalysis.numberOfUsers}`);
  
  for (const [metricId, metricData] of Object.entries(variantAnalysis.metrics)) {
    console.log(`  ${metricId}: ${metricData.average.toFixed(2)}`);
  }
  
  if (variantAnalysis.comparisonToControl) {
    for (const [metricId, comparison] of Object.entries(variantAnalysis.comparisonToControl)) {
      console.log(`  ${metricId}: ${comparison.relativeImprovement.toFixed(2)}% improvement (p-value: ${comparison.pValue.toFixed(4)})`);
    }
  }
}
```

### Ending an Experiment

```typescript
// End the experiment
await abTestManager.endExperiment(experiment.id);
```

## Advanced Features

### Traffic Allocation

Control what percentage of users are included in the experiment:

```typescript
const experiment = await abTestManager.createExperiment(
  'Feature Test',
  'Testing a new feature',
  variants,
  metrics,
  {
    trafficAllocation: 0.1 // Only 10% of users will be in the experiment
  }
);
```

### User Targeting

Target specific user segments:

```typescript
const experiment = await abTestManager.createExperiment(
  'Feature Test',
  'Testing a new feature',
  variants,
  metrics,
  {
    targetingConditions: {
      isLoggedIn: true,
      country: 'US',
      userRole: 'premium'
    }
  }
);
```

### Assignment Strategies

Choose how users are assigned to variants:

```typescript
// Random assignment (changes on each request)
const experiment = await abTestManager.createExperiment(
  'Feature Test',
  'Testing a new feature',
  variants,
  metrics,
  {
    assignmentStrategy: VariantAssignmentStrategy.RANDOM
  }
);

// Sticky assignment (consistent for each user)
const experiment = await abTestManager.createExperiment(
  'Feature Test',
  'Testing a new feature',
  variants,
  metrics,
  {
    assignmentStrategy: VariantAssignmentStrategy.STICKY
  }
);

// Weighted assignment (based on variant weights)
const experiment = await abTestManager.createExperiment(
  'Feature Test',
  'Testing a new feature',
  [
    { id: 'control', name: 'Control', isControl: true, weight: 75 },
    { id: 'treatment', name: 'Treatment', isControl: false, weight: 25 }
  ],
  metrics,
  {
    assignmentStrategy: VariantAssignmentStrategy.WEIGHTED
  }
);
```

### Redis Storage

Use Redis for experiment storage in production:

```typescript
import { RedisExperimentRepository } from '@secondbrain/future-proof-hatches/ab-testing';

const repository = new RedisExperimentRepository({
  host: 'localhost',
  port: 6379
});

const abTestManager = new ABTestingManagerImpl(repository);
```

### Event Handling

Subscribe to experiment events:

```typescript
import { ABTestingManagerEvents } from '@secondbrain/future-proof-hatches/ab-testing';

abTestManager.on(ABTestingManagerEvents.EXPERIMENT_STARTED, (experiment) => {
  console.log(`Experiment started: ${experiment.name}`);
});

abTestManager.on(ABTestingManagerEvents.VARIANT_ASSIGNED, (assignment) => {
  console.log(`User ${assignment.userId} assigned to variant ${assignment.variantId}`);
});
```

### Feature Flag Integration

Integrate with the Feature Flags system:

```typescript
import { 
  FeatureFlagManagerImpl,
  InMemoryFeatureFlagProvider
} from '@secondbrain/future-proof-hatches/feature-flags';

// Create feature flag manager
const featureFlagProvider = new InMemoryFeatureFlagProvider();
const featureFlagManager = new FeatureFlagManagerImpl(featureFlagProvider);

// Set as feature flag manager for the A/B testing manager
abTestManager.setFeatureFlagManager(featureFlagManager);

// After the experiment completes, update the feature flag
const analysis = await abTestManager.analyzeExperiment(experiment.id);
const treatmentVariant = analysis.variants.find(v => !v.isControl);

if (treatmentVariant && 
    treatmentVariant.comparisonToControl && 
    treatmentVariant.comparisonToControl['conversion'].relativeImprovement > 10 &&
    treatmentVariant.comparisonToControl['conversion'].pValue < 0.05) {
  // Treatment performed significantly better
  await featureFlagManager.updateFlag('new_feature', {
    enabled: true,
    defaultValue: true
  });
}
```

## Best Practices

1. **Define Clear Metrics**: Define clear, measurable metrics that align with your business goals.

2. **Use Control Variants**: Always include a control variant as a baseline for comparison.

3. **Adequate Sample Size**: Ensure you have a large enough sample size to achieve statistical significance.

4. **Minimize External Factors**: Try to control for external factors that might affect your results.

5. **Single Variable Changes**: Ideally, only test one variable at a time for clear cause-effect relationships.

6. **Statistical Significance**: Wait for statistical significance before making decisions.

7. **Proper Segmentation**: Segment your results to uncover insights that might be hidden in aggregate data.

8. **Combine with Feature Flags**: Use feature flags to deploy the winning variant to all users after the experiment concludes.

## Example Scenarios

1. **Pricing Strategy Testing**: Test different price points to maximize revenue.

2. **UI/UX Improvements**: Test different layouts or designs to improve user engagement.

3. **Feature Validation**: Validate new features with a small percentage of users before full release.

4. **Marketing Message Testing**: Test different marketing messages to improve conversion rates.

5. **Onboarding Flow Optimization**: Test different onboarding flows to improve user retention.

## Implementation Considerations

1. **Redis for Production**: Use RedisExperimentRepository for production environments for persistence and scalability.

2. **Memory Usage**: Be aware of memory usage when tracking many events, especially in the in-memory repository.

3. **Performance**: Consider performance implications when calculating experiment results for large datasets.

4. **Concurrent Experiments**: Be aware of interaction effects when running multiple experiments simultaneously.