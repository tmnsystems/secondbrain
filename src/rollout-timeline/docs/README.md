# Roll-out Timeline

The Roll-out Timeline module provides a comprehensive system for managing deployment sequences and timelines. It allows you to plan, track, and manage complex deployment processes with dependencies, notifications, and progress tracking.

## Features

- **Structured Deployment Planning**: Define stages, milestones, tasks, and dependencies for your deployment process.
- **Dependency Management**: Manage dependencies between timeline items with support for different dependency types.
- **Critical Path Analysis**: Identify the critical path through your deployment timeline.
- **Progress Tracking**: Track progress of your deployment with various calculation strategies.
- **Notification System**: Receive notifications for important timeline events.
- **Resource Management**: Track resource allocations for each stage of your deployment.
- **Feature Flag Integration**: Manage feature flags for different deployment stages.
- **A/B Testing Integration**: Coordinate A/B tests with your deployment timeline.
- **Persistence**: Store timeline data in memory or in JSON files.

## Installation

```bash
npm install @secondbrain/rollout-timeline
```

## Quick Start

```typescript
import { 
  Timeline, 
  Stage, 
  Milestone, 
  TimelineItemStatus, 
  TimelineItemPriority,
  DependencyType
} from '@secondbrain/rollout-timeline';

// Create a timeline for your deployment
const timeline = new Timeline({
  name: 'Product Release',
  description: 'Timeline for releasing our new product',
  version: '1.0.0'
});

// Add stages to your timeline
const developmentStage = new Stage({
  name: 'Development',
  description: 'Implement new features',
  priority: TimelineItemPriority.HIGH,
  plannedStartDate: new Date('2025-01-01'),
  plannedEndDate: new Date('2025-02-28')
});

const testingStage = new Stage({
  name: 'Testing',
  description: 'Test all features',
  priority: TimelineItemPriority.HIGH,
  plannedStartDate: new Date('2025-03-01'),
  plannedEndDate: new Date('2025-03-31')
});

// Add milestones
const releaseReadyMilestone = new Milestone({
  name: 'Release Ready',
  description: 'Product is ready for release',
  plannedEndDate: new Date('2025-03-31')
});

// Add stages and milestones to timeline
timeline.addStage(developmentStage);
timeline.addStage(testingStage);
timeline.addMilestone(releaseReadyMilestone);

// Set up dependencies
timeline.addDependency(
  testingStage.id, 
  developmentStage.id, 
  DependencyType.FINISH_TO_START
);

timeline.addDependency(
  releaseReadyMilestone.id, 
  testingStage.id, 
  DependencyType.FINISH_TO_START
);

// Add tasks to stages
developmentStage.addTask('Implement feature X');
developmentStage.addTask('Implement feature Y');
testingStage.addTask('Test feature X');
testingStage.addTask('Test feature Y');

// Start the timeline
timeline.start();
```

## Core Components

### Timeline

The central component that manages the entire deployment sequence. It contains stages, milestones, and handles dependencies between them.

```typescript
const timeline = new Timeline({
  name: 'Product Launch',
  description: 'Timeline for launching our new product',
  version: '1.0.0'
});
```

### Stage

Represents a phase in the deployment process. Each stage can have tasks, resources, metrics, and feature flags.

```typescript
const stage = new Stage({
  name: 'Beta Release',
  description: 'Release to beta testers',
  priority: TimelineItemPriority.HIGH,
  plannedStartDate: new Date('2025-05-01'),
  plannedEndDate: new Date('2025-05-31')
});

// Add tasks to the stage
stage.addTask('Deploy to beta environment');
stage.addTask('Collect feedback');

// Add resources to the stage
stage.addResource('DevOps Engineer', 'Lead', 100);
stage.addResource('QA Engineers', 'Member', 50);

// Add metrics to track
stage.addMetric('User Satisfaction', 'Average satisfaction score', 4.5, 'out of 5');

// Add feature flags for this stage
stage.addFeatureFlag('new-ui', true);
stage.addFeatureFlag('advanced-search', false);

// Add A/B tests for this stage
stage.addABTest('onboarding-flow-test');
```

### Milestone

Represents a significant event or checkpoint in a timeline.

```typescript
const milestone = new Milestone({
  name: 'General Availability',
  description: 'Product is generally available to all users',
  plannedEndDate: new Date('2025-06-15')
});
```

### Dependency Resolver

Analyzes dependencies between timeline items, identifies circular dependencies, and calculates the critical path.

```typescript
import { DependencyResolver } from '@secondbrain/rollout-timeline';

const dependencyResolver = new DependencyResolver(timeline);

// Check for circular dependencies
const circularDependencies = dependencyResolver.findCircularDependencies();
if (circularDependencies.length > 0) {
  console.warn('Circular dependencies detected:', circularDependencies);
}

// Get the critical path
const criticalPath = dependencyResolver.getCriticalPath();
console.log('Critical path:', criticalPath);

// Get items that are ready to start
const readyItems = dependencyResolver.getItemsReadyToStart();
console.log('Items ready to start:', readyItems.map(item => item.name));

// Estimate completion date
const estimatedCompletionDate = dependencyResolver.estimateCompletionDate();
console.log('Estimated completion date:', estimatedCompletionDate);
```

### Notification Service

Sends notifications for timeline events.

```typescript
import { NotificationService, NotificationChannel } from '@secondbrain/rollout-timeline';

const notificationService = new NotificationService();

// Register notification handlers
notificationService.registerEmailHandler(async (to, subject, body, config) => {
  // Send email using your preferred email service
  console.log(`Sending email to ${to} with subject "${subject}"`);
  return true;
});

notificationService.registerSlackHandler(async (channel, message, config) => {
  // Send message to Slack
  console.log(`Sending message to Slack channel ${channel}`);
  return true;
});

// Add notification to timeline
timeline.addNotification({
  trigger: 'milestone_reached',
  channel: NotificationChannel.EMAIL,
  template: 'Milestone "${item.name}" has been reached in the ${timeline.name} timeline.',
  recipients: ['team@example.com']
});

// Send notification manually
await notificationService.sendNotification(
  timeline.notifications[0],
  milestone,
  timeline
);
```

### Progress Tracker

Tracks progress of timelines and stages using different calculation strategies.

```typescript
import { ProgressTracker, ProgressStrategy } from '@secondbrain/rollout-timeline';

// Create a progress tracker with a specific strategy
const progressTracker = ProgressTracker.withStrategy(ProgressStrategy.TIME_BASED);

// Calculate timeline progress
const progress = progressTracker.calculateTimelineProgress(timeline);
console.log(`Timeline progress: ${progress}%`);

// Calculate stage progress
const stageProgress = progressTracker.calculateStageProgress(stage);
console.log(`Stage progress: ${stageProgress}%`);

// Get detailed progress information
const detailedProgress = progressTracker.getDetailedProgress(timeline);
console.log('Detailed progress:', detailedProgress);
```

### Repositories

Store timeline data in memory or in JSON files.

```typescript
import { 
  InMemoryTimelineRepository, 
  JsonFileTimelineRepository 
} from '@secondbrain/rollout-timeline/repositories';

// In-memory repository
const memoryRepo = new InMemoryTimelineRepository();
await memoryRepo.saveTimeline(timeline);
const retrievedTimeline = await memoryRepo.getTimeline(timeline.id);

// JSON file repository
const fileRepo = new JsonFileTimelineRepository('./timelines');
await fileRepo.saveTimeline(timeline);
const savedTimeline = await fileRepo.getTimeline(timeline.id);

// Search for timelines
const searchResults = await fileRepo.searchTimelinesByName('Product');
```

## Integration with Feature Flags and A/B Testing

The Roll-out Timeline component integrates seamlessly with Feature Flags and A/B Testing components.

```typescript
// Create a timeline for a feature roll-out
const timeline = new Timeline({
  name: 'New UI Roll-out',
  description: 'Timeline for rolling out the new UI'
});

// Create stages for the roll-out
const betaStage = new Stage({
  name: 'Beta Release',
  description: 'Limited release to beta users'
});

const generalReleaseStage = new Stage({
  name: 'General Release',
  description: 'Release to all users'
});

// Add stages to timeline
timeline.addStage(betaStage);
timeline.addStage(generalReleaseStage);

// Add feature flags for beta stage
betaStage.addFeatureFlag('new-ui', true);
betaStage.addFeatureFlag('advanced-search', false);

// Add A/B test for beta stage
betaStage.addABTest('ui-variant-test');

// Add feature flags for general release stage
generalReleaseStage.addFeatureFlag('new-ui', true);
generalReleaseStage.addFeatureFlag('advanced-search', true);

// Add dependency
timeline.addDependency(
  generalReleaseStage.id, 
  betaStage.id, 
  DependencyType.FINISH_TO_START
);

// When each stage is started, update feature flags and A/B tests
betaStage.start();
// Update feature flags for beta stage
featureFlagService.updateFlags(betaStage.featureFlags);
// Start A/B tests for beta stage
abTestingService.startTests(betaStage.abTests);

// Later, when beta is complete and general release starts
betaStage.complete();
generalReleaseStage.start();
// Update feature flags for general release
featureFlagService.updateFlags(generalReleaseStage.featureFlags);
```

## Examples

See the [examples](../examples) directory for complete examples of using the Roll-out Timeline component:

- [Product Release Timeline](../examples/product-release-timeline.ts): A complete example of a product release timeline.

## API Reference

For a complete API reference, see the [API documentation](./API.md).