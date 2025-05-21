/**
 * Roll-out Timeline module for managing deployment sequences
 */

// Export types
export * from './types';

// Export core classes
export { Timeline } from './timeline';
export { Stage } from './stage';
export { Milestone } from './milestone';
export { DependencyResolver } from './dependency-resolver';
export { NotificationService } from './notification-service';
export { 
  ProgressTracker, 
  EqualWeightStrategy,
  PriorityBasedStrategy,
  TimeBasedStrategy
} from './progress-tracker';

// Export repositories
export { InMemoryTimelineRepository } from './repositories/memory-repository';
export { JsonFileTimelineRepository } from './repositories/json-file-repository';

// Export examples
export { createProductReleaseExample } from './examples/product-release-timeline';