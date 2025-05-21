/**
 * Product Release Timeline Example
 * @module rollout-timeline/examples/product-release-timeline
 * @description Example of using the Roll-out Timeline for a product release
 */

import {
  Timeline,
  Stage,
  Milestone,
  TimelineItemStatus,
  PriorityLevel,
  DependencyType,
  DependencyResolver,
  NotificationService,
  NotificationChannel,
  TimelineEvent,
  ProgressTracker,
  InMemoryTimelineRepository
} from '../';

/**
 * Create a product release timeline example
 */
export async function createProductReleaseExample(): Promise<void> {
  // Create a repository
  const repository = new InMemoryTimelineRepository();
  
  // Create a new timeline for the product release
  const timeline = new Timeline(
    'Product Release v2.0',
    '2.0.0',
    {
      description: 'Timeline for the release of version 2.0 of our product',
      createdBy: 'Release Manager',
      metadata: {
        department: 'Product',
        budget: 50000,
        priority: 'high'
      }
    }
  );
  
  // Add stages
  
  // 1. Planning Stage
  const planningStage = timeline.addStage({
    name: 'Planning',
    description: 'Define scope, timeline, and resources',
    priority: PriorityLevel.HIGH,
    plannedStart: new Date('2025-06-01'),
    plannedEnd: new Date('2025-06-15'),
    owner: 'Project Manager'
  });
  
  // 2. Development Stage
  const developmentStage = timeline.addStage({
    name: 'Development',
    description: 'Implement new features and improvements',
    priority: PriorityLevel.CRITICAL,
    plannedStart: new Date('2025-06-16'),
    plannedEnd: new Date('2025-07-31'),
    owner: 'Lead Developer'
  });
  
  // 3. Testing Stage
  const testingStage = timeline.addStage({
    name: 'Testing',
    description: 'Verify functionality and fix issues',
    priority: PriorityLevel.HIGH,
    plannedStart: new Date('2025-08-01'),
    plannedEnd: new Date('2025-08-15'),
    owner: 'QA Lead'
  });
  
  // 4. User Acceptance Testing (UAT) Stage
  const uatStage = timeline.addStage({
    name: 'User Acceptance Testing',
    description: 'Beta testing with selected users',
    priority: PriorityLevel.MEDIUM,
    plannedStart: new Date('2025-08-16'),
    plannedEnd: new Date('2025-08-31'),
    owner: 'Product Manager'
  });
  
  // 5. Deployment Stage
  const deploymentStage = timeline.addStage({
    name: 'Deployment',
    description: 'Release to production',
    priority: PriorityLevel.CRITICAL,
    plannedStart: new Date('2025-09-01'),
    plannedEnd: new Date('2025-09-05'),
    owner: 'DevOps Engineer',
    rollbackProcedure: 'Revert to the previous version using the automated rollback script'
  });
  
  // 6. Marketing Stage
  const marketingStage = timeline.addStage({
    name: 'Marketing Campaign',
    description: 'Launch marketing campaign for the new release',
    priority: PriorityLevel.MEDIUM,
    plannedStart: new Date('2025-08-15'),
    plannedEnd: new Date('2025-09-15'),
    owner: 'Marketing Director'
  });
  
  // Add sub-stages to Development
  developmentStage.addSubStage(
    new Stage(
      'Backend Development',
      new Date('2025-06-16'),
      {
        description: 'Implement new backend features',
        priority: PriorityLevel.HIGH,
        plannedEnd: new Date('2025-07-15'),
        owner: 'Backend Lead'
      }
    )
  );
  
  developmentStage.addSubStage(
    new Stage(
      'Frontend Development',
      new Date('2025-06-16'),
      {
        description: 'Implement new frontend features',
        priority: PriorityLevel.HIGH,
        plannedEnd: new Date('2025-07-15'),
        owner: 'Frontend Lead'
      }
    )
  );
  
  developmentStage.addSubStage(
    new Stage(
      'API Development',
      new Date('2025-06-20'),
      {
        description: 'Implement new API endpoints',
        priority: PriorityLevel.MEDIUM,
        plannedEnd: new Date('2025-07-10'),
        owner: 'API Lead'
      }
    )
  );
  
  developmentStage.addSubStage(
    new Stage(
      'Integration',
      new Date('2025-07-16'),
      {
        description: 'Integrate all components',
        priority: PriorityLevel.HIGH,
        plannedEnd: new Date('2025-07-31'),
        owner: 'Integration Lead'
      }
    )
  );
  
  // Add tasks to the Deployment Stage
  deploymentStage.addTask('Update database schema', {
    assignee: 'Database Admin',
    estimatedHours: 2
  });
  
  deploymentStage.addTask('Deploy backend services', {
    assignee: 'DevOps Engineer',
    estimatedHours: 1
  });
  
  deploymentStage.addTask('Deploy frontend applications', {
    assignee: 'DevOps Engineer',
    estimatedHours: 1
  });
  
  deploymentStage.addTask('Update CDN configuration', {
    assignee: 'Infrastructure Engineer',
    estimatedHours: 0.5
  });
  
  deploymentStage.addTask('Run smoke tests', {
    assignee: 'QA Engineer',
    estimatedHours: 1
  });
  
  // Add resource requirements to the Deployment Stage
  deploymentStage.addResource('Production Database', 'Database', { available: true });
  deploymentStage.addResource('Load Balancer', 'Infrastructure', { available: true });
  deploymentStage.addResource('CDN', 'Infrastructure', { available: true });
  deploymentStage.addResource('Deployment Pipeline', 'CI/CD', { available: true });
  
  // Add feature flags to the Deployment Stage
  deploymentStage.addFeatureFlag('new-ui', true, { percentage: 100 });
  deploymentStage.addFeatureFlag('advanced-search', true, { percentage: 50, segments: ['beta-users'] });
  deploymentStage.addFeatureFlag('recommendation-engine', false);
  
  // Add metrics to track during the Deployment Stage
  deploymentStage.addMetric('error-rate', 'SELECT COUNT(*) FROM errors WHERE timestamp > ${start} AND timestamp < ${end}', {
    description: 'Error rate during deployment',
    threshold: 10
  });
  
  deploymentStage.addMetric('response-time', 'SELECT AVG(response_time) FROM requests WHERE timestamp > ${start} AND timestamp < ${end}', {
    description: 'Average API response time',
    threshold: 200, // milliseconds
    currentValue: 180
  });
  
  // Add milestones
  
  // 1. Requirements Finalized
  const requirementsFinalized = timeline.addMilestone({
    name: 'Requirements Finalized',
    description: 'All requirements and specifications approved',
    priority: PriorityLevel.HIGH,
    critical: true,
    plannedStart: new Date('2025-06-15'),
    owner: 'Product Manager'
  });
  
  // 2. Feature Freeze
  const featureFreeze = timeline.addMilestone({
    name: 'Feature Freeze',
    description: 'No new features accepted after this point',
    priority: PriorityLevel.MEDIUM,
    critical: true,
    plannedStart: new Date('2025-07-15'),
    owner: 'Project Manager'
  });
  
  // 3. Beta Release
  const betaRelease = timeline.addMilestone({
    name: 'Beta Release',
    description: 'Release to beta users',
    priority: PriorityLevel.HIGH,
    critical: false,
    plannedStart: new Date('2025-08-15'),
    owner: 'Release Manager'
  });
  
  // 4. Go/No-Go Decision
  const goNoGoDecision = timeline.addMilestone({
    name: 'Go/No-Go Decision',
    description: 'Final decision on whether to proceed with the release',
    priority: PriorityLevel.CRITICAL,
    critical: true,
    plannedStart: new Date('2025-08-31'),
    owner: 'Steering Committee'
  });
  
  // 5. Public Release
  const publicRelease = timeline.addMilestone({
    name: 'Public Release',
    description: 'Product is publicly available',
    priority: PriorityLevel.CRITICAL,
    critical: true,
    plannedStart: new Date('2025-09-05'),
    owner: 'CEO'
  });
  
  // Add dependencies
  
  // Planning must be completed before Development can start
  timeline.addDependency(developmentStage.id, planningStage.id, DependencyType.COMPLETION);
  
  // Requirements must be finalized before Development can be completed
  timeline.addDependency(developmentStage.id, requirementsFinalized.id, DependencyType.COMPLETION);
  
  // Feature Freeze depends on Development reaching a certain progress
  timeline.addDependency(featureFreeze.id, developmentStage.id, DependencyType.COMPLETION, {
    condition: 'progress>=75'
  });
  
  // Testing depends on Development completion
  timeline.addDependency(testingStage.id, developmentStage.id, DependencyType.COMPLETION);
  
  // UAT depends on Testing completion
  timeline.addDependency(uatStage.id, testingStage.id, DependencyType.COMPLETION);
  
  // Beta Release depends on Testing start
  timeline.addDependency(betaRelease.id, testingStage.id, DependencyType.START);
  
  // Go/No-Go Decision depends on UAT completion
  timeline.addDependency(goNoGoDecision.id, uatStage.id, DependencyType.COMPLETION);
  
  // Deployment depends on Go/No-Go Decision
  timeline.addDependency(deploymentStage.id, goNoGoDecision.id, DependencyType.COMPLETION);
  
  // Public Release depends on Deployment completion
  timeline.addDependency(publicRelease.id, deploymentStage.id, DependencyType.COMPLETION);
  
  // Marketing can run in parallel with Testing and UAT
  timeline.addDependency(marketingStage.id, developmentStage.id, DependencyType.COMPLETION);
  
  // Save the timeline to the repository
  await repository.saveTimeline(timeline);
  
  // Create a dependency resolver
  const resolver = new DependencyResolver(timeline);
  
  // Start the timeline
  timeline.start();
  
  // Mark Planning as complete
  timeline.completeStage(planningStage.id);
  
  // Mark Requirements Finalized milestone as reached
  timeline.reachMilestone(requirementsFinalized.id);
  
  // Get items that can be started now
  const readyItems = resolver.getReadyToStartItems();
  console.log('Items ready to start:', readyItems.map(item => item.name));
  
  // Start Development stage
  timeline.startStage(developmentStage.id);
  
  // Update progress tracking
  const progressTracker = new ProgressTracker();
  
  // Track progress
  progressTracker.trackStageProgress(developmentStage, 30);
  
  // Check overall progress
  const overallProgress = progressTracker.calculateTimelineProgress(timeline);
  console.log(`Overall progress: ${overallProgress}%`);
  
  // Set up notification service
  const notificationService = new NotificationService();
  
  // Register event listener for milestone reached
  timeline.on(TimelineEvent.MILESTONE_REACHED, async (event) => {
    if (event.timelineItem) {
      await notificationService.processEvent(
        event.timelineItem,
        event.type,
        event.timeline
      );
    }
  });
  
  // Create a notification for Feature Freeze milestone
  if (featureFreeze.notifications === undefined) {
    featureFreeze.notifications = [];
  }
  
  featureFreeze.notifications.push({
    id: 'feature-freeze-notification',
    event: TimelineEvent.MILESTONE_REACHED,
    channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
    messageTemplate: 'Feature Freeze milestone has been reached for {{timeline.name}}. No new features will be accepted after this point.',
    sent: false,
    data: {
      recipients: ['dev-team@example.com', 'product-team@example.com']
    }
  });
  
  // Get the critical path
  const criticalPath = resolver.getCriticalPath();
  console.log('Critical path:', criticalPath.map(id => {
    const item = timeline.getItem(id);
    return item ? item.name : id;
  }));
  
  // Print detailed timeline information
  const summary = progressTracker.getProgressSummary(timeline);
  console.log('Timeline Summary:', {
    name: timeline.name,
    version: timeline.version,
    overallProgress: summary.overallProgress,
    completedMilestones: summary.completedMilestones,
    totalMilestones: summary.totalMilestones,
    estimatedCompletion: summary.estimatedCompletion
  });
}

// Execute the example if run directly
if (require.main === module) {
  createProductReleaseExample().catch(console.error);
}