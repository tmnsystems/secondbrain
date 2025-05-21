/**
 * Integration tests for the Roll-out Timeline component
 */

import { Timeline } from '../timeline';
import { Stage } from '../stage';
import { Milestone } from '../milestone';
import { DependencyResolver } from '../dependency-resolver';
import { NotificationService } from '../notification-service';
import { ProgressTracker, EqualWeightStrategy, PriorityBasedStrategy } from '../progress-tracker';
import { InMemoryTimelineRepository } from '../repositories/memory-repository';
import { 
  TimelineItemStatus, 
  TimelineItemPriority,
  DependencyType,
  NotificationChannel
} from '../types';

describe('Roll-out Timeline Integration Tests', () => {
  test('should coordinate stages, milestones, dependencies, notifications, and progress tracking', async () => {
    // Create timeline components
    const timeline = new Timeline({
      name: 'Product Launch',
      description: 'Timeline for launching a new product',
      version: '1.0.0'
    });

    // Create a notification service
    const notificationService = new NotificationService();
    
    // Add a test notification handler
    const notifications: string[] = [];
    notificationService.addHandler(NotificationChannel.CONSOLE, async (notification, item, timeline) => {
      notifications.push(notification.processedMessage);
      return true;
    });

    // Create stages
    const developmentStage = new Stage({
      name: 'Development',
      description: 'Product development phase',
      priority: TimelineItemPriority.HIGH,
      plannedStartDate: new Date('2025-01-01'),
      plannedEndDate: new Date('2025-02-28')
    });

    const testingStage = new Stage({
      name: 'Testing',
      description: 'Product testing phase',
      priority: TimelineItemPriority.HIGH,
      plannedStartDate: new Date('2025-03-01'),
      plannedEndDate: new Date('2025-03-31')
    });

    const marketingStage = new Stage({
      name: 'Marketing',
      description: 'Marketing campaign phase',
      priority: TimelineItemPriority.MEDIUM,
      plannedStartDate: new Date('2025-03-15'),
      plannedEndDate: new Date('2025-04-30')
    });

    const launchStage = new Stage({
      name: 'Launch',
      description: 'Product launch phase',
      priority: TimelineItemPriority.CRITICAL,
      plannedStartDate: new Date('2025-05-01'),
      plannedEndDate: new Date('2025-05-15')
    });

    // Create milestones
    const codeCompleteMilestone = new Milestone({
      name: 'Code Complete',
      description: 'All code is written and committed',
      plannedEndDate: new Date('2025-02-28')
    });

    const testingCompleteMilestone = new Milestone({
      name: 'Testing Complete',
      description: 'All tests have passed',
      plannedEndDate: new Date('2025-03-31')
    });

    const launchDateMilestone = new Milestone({
      name: 'Launch Date',
      description: 'The product is launched to customers',
      plannedEndDate: new Date('2025-05-15')
    });

    // Add stages and milestones to timeline
    timeline.addStage(developmentStage);
    timeline.addStage(testingStage);
    timeline.addStage(marketingStage);
    timeline.addStage(launchStage);
    timeline.addMilestone(codeCompleteMilestone);
    timeline.addMilestone(testingCompleteMilestone);
    timeline.addMilestone(launchDateMilestone);

    // Add tasks to stages
    developmentStage.addTask('Design database schema');
    developmentStage.addTask('Implement backend services');
    developmentStage.addTask('Develop frontend components');
    
    testingStage.addTask('Write unit tests');
    testingStage.addTask('Perform integration testing');
    testingStage.addTask('Conduct user acceptance testing');
    
    marketingStage.addTask('Create marketing materials');
    marketingStage.addTask('Plan social media campaign');
    marketingStage.addTask('Brief press contacts');
    
    launchStage.addTask('Finalize deployment plan');
    launchStage.addTask('Deploy to production');
    launchStage.addTask('Monitor initial usage');

    // Set up dependencies
    timeline.addDependency(
      testingStage.id, 
      developmentStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      launchStage.id, 
      testingStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      codeCompleteMilestone.id, 
      developmentStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      testingCompleteMilestone.id, 
      testingStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      launchDateMilestone.id, 
      launchStage.id, 
      DependencyType.FINISH_TO_START
    );

    // Add notification for milestone reached
    timeline.addNotification({
      trigger: 'milestone_reached',
      channel: NotificationChannel.CONSOLE,
      template: 'Milestone ${item.name} has been reached in the ${timeline.name} timeline.'
    });

    // Create a dependency resolver
    const dependencyResolver = new DependencyResolver(timeline);

    // Check for circular dependencies
    const circularDependencies = dependencyResolver.findCircularDependencies();
    expect(circularDependencies).toHaveLength(0);

    // Validate dependencies
    expect(dependencyResolver.validateDependencies()).toBe(true);

    // Get critical path
    const criticalPath = dependencyResolver.getCriticalPath();
    expect(criticalPath).toContain(developmentStage.id);
    expect(criticalPath).toContain(testingStage.id);
    expect(criticalPath).toContain(launchStage.id);

    // Get next items to work on
    const nextItems = dependencyResolver.getNextItems();
    expect(nextItems).toHaveLength(1);
    expect(nextItems[0].id).toBe(developmentStage.id);

    // Create a progress tracker
    const progressTracker = new ProgressTracker();

    // Start the timeline
    timeline.start();
    expect(timeline.status).toBe(TimelineItemStatus.IN_PROGRESS);

    // Get initial progress
    const initialProgress = progressTracker.calculateTimelineProgress(timeline);
    expect(initialProgress).toBe(0);

    // Start and complete development stage
    developmentStage.start();
    developmentStage.tasks.forEach(task => developmentStage.completeTask(task.id));
    developmentStage.complete();
    codeCompleteMilestone.reach();

    // Trigger notification for milestone
    await notificationService.sendNotification(
      timeline.notifications![0],
      codeCompleteMilestone,
      timeline
    );

    // Verify notification was sent
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toContain('Code Complete');

    // Check progress
    let progress = progressTracker.calculateTimelineProgress(timeline);
    expect(progress).toBe(25); // 1 of 4 stages completed

    // Start and complete testing stage
    expect(timeline.canItemStart(testingStage.id)).toBe(true);
    testingStage.start();
    testingStage.tasks.forEach(task => testingStage.completeTask(task.id));
    testingStage.complete();
    testingCompleteMilestone.reach();

    // Trigger notification for milestone
    await notificationService.sendNotification(
      timeline.notifications![0],
      testingCompleteMilestone,
      timeline
    );

    // Verify notification was sent
    expect(notifications).toHaveLength(2);
    expect(notifications[1]).toContain('Testing Complete');

    // Check progress
    progress = progressTracker.calculateTimelineProgress(timeline);
    expect(progress).toBe(50); // 2 of 4 stages completed

    // Start and complete marketing stage
    marketingStage.start();
    marketingStage.tasks.forEach(task => marketingStage.completeTask(task.id));
    marketingStage.complete();

    // Start and complete launch stage
    expect(timeline.canItemStart(launchStage.id)).toBe(true);
    launchStage.start();
    launchStage.tasks.forEach(task => launchStage.completeTask(task.id));
    launchStage.complete();
    launchDateMilestone.reach();

    // Trigger notification for milestone
    await notificationService.sendNotification(
      timeline.notifications![0],
      launchDateMilestone,
      timeline
    );

    // Verify notification was sent
    expect(notifications).toHaveLength(3);
    expect(notifications[2]).toContain('Launch Date');

    // Complete the timeline
    timeline.complete();

    // Check final progress
    progress = progressTracker.calculateTimelineProgress(timeline);
    expect(progress).toBe(100);

    // Try different progress strategy
    progressTracker.setStrategy(new PriorityBasedStrategy());
    progress = progressTracker.calculateTimelineProgress(timeline);
    expect(progress).toBe(100);

    // Get detailed progress
    const detailedProgress = progressTracker.getDetailedProgress(timeline);
    expect(detailedProgress.overall).toBe(100);
    expect(Object.keys(detailedProgress.stages)).toHaveLength(4);
    expect(Object.keys(detailedProgress.milestones)).toHaveLength(3);
    
    // Save timeline to repository
    const repository = new InMemoryTimelineRepository();
    await repository.saveTimeline(timeline);
    
    // Retrieve timeline from repository
    const retrievedTimeline = await repository.getTimeline(timeline.id);
    expect(retrievedTimeline).not.toBeNull();
    expect(retrievedTimeline!.id).toBe(timeline.id);
    expect(retrievedTimeline!.name).toBe(timeline.name);
    expect(retrievedTimeline!.status).toBe(TimelineItemStatus.COMPLETED);
  });
});

describe('Full Roll-out Timeline Workflow Test', () => {
  test('should handle a complete product release workflow', async () => {
    // Create timeline for a product release
    const timeline = new Timeline({
      name: 'Product Release',
      description: 'Timeline for releasing a new product version',
      version: '2.0.0'
    });
    
    // Create stages for the release process
    const planningStage = new Stage({
      name: 'Planning',
      description: 'Define scope and requirements',
      priority: TimelineItemPriority.HIGH,
      plannedStartDate: new Date('2025-06-01'),
      plannedEndDate: new Date('2025-06-15')
    });
    
    const developmentStage = new Stage({
      name: 'Development',
      description: 'Implement new features',
      priority: TimelineItemPriority.HIGH,
      plannedStartDate: new Date('2025-06-16'),
      plannedEndDate: new Date('2025-07-15')
    });
    
    const qaStage = new Stage({
      name: 'QA',
      description: 'Test and validate features',
      priority: TimelineItemPriority.HIGH,
      plannedStartDate: new Date('2025-07-16'),
      plannedEndDate: new Date('2025-07-31')
    });
    
    const betaStage = new Stage({
      name: 'Beta Release',
      description: 'Limited customer testing',
      priority: TimelineItemPriority.MEDIUM,
      plannedStartDate: new Date('2025-08-01'),
      plannedEndDate: new Date('2025-08-15')
    });
    
    const releaseStage = new Stage({
      name: 'General Release',
      description: 'Full production deployment',
      priority: TimelineItemPriority.CRITICAL,
      plannedStartDate: new Date('2025-08-16'),
      plannedEndDate: new Date('2025-08-20')
    });
    
    // Create milestones
    const requirementsSignoffMilestone = new Milestone({
      name: 'Requirements Signoff',
      description: 'Final approval of requirements',
      plannedEndDate: new Date('2025-06-15')
    });
    
    const featureFreezeMilestone = new Milestone({
      name: 'Feature Freeze',
      description: 'No new features after this point',
      plannedEndDate: new Date('2025-07-15')
    });
    
    const betaReleaseMilestone = new Milestone({
      name: 'Beta Release',
      description: 'Start of beta testing',
      plannedEndDate: new Date('2025-08-01')
    });
    
    const generalReleaseMilestone = new Milestone({
      name: 'General Release',
      description: 'Product available to all customers',
      plannedEndDate: new Date('2025-08-20')
    });
    
    // Add stages and milestones to timeline
    timeline.addStage(planningStage);
    timeline.addStage(developmentStage);
    timeline.addStage(qaStage);
    timeline.addStage(betaStage);
    timeline.addStage(releaseStage);
    
    timeline.addMilestone(requirementsSignoffMilestone);
    timeline.addMilestone(featureFreezeMilestone);
    timeline.addMilestone(betaReleaseMilestone);
    timeline.addMilestone(generalReleaseMilestone);
    
    // Set up dependencies
    timeline.addDependency(
      developmentStage.id, 
      planningStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      qaStage.id, 
      developmentStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      betaStage.id, 
      qaStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      releaseStage.id, 
      betaStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      requirementsSignoffMilestone.id, 
      planningStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      featureFreezeMilestone.id, 
      developmentStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      betaReleaseMilestone.id, 
      qaStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    timeline.addDependency(
      generalReleaseMilestone.id, 
      releaseStage.id, 
      DependencyType.FINISH_TO_START
    );
    
    // Add tasks to stages
    planningStage.addTask('Define requirements', { estimatedHours: 20 });
    planningStage.addTask('Stakeholder review', { estimatedHours: 10 });
    planningStage.addTask('Create technical specifications', { estimatedHours: 30 });
    
    developmentStage.addTask('Implement core features', { estimatedHours: 100 });
    developmentStage.addTask('Code review', { estimatedHours: 40 });
    developmentStage.addTask('Fix initial bugs', { estimatedHours: 30 });
    
    qaStage.addTask('Run automated tests', { estimatedHours: 20 });
    qaStage.addTask('Manual testing', { estimatedHours: 60 });
    qaStage.addTask('Fix bugs', { estimatedHours: 40 });
    
    betaStage.addTask('Deploy to beta environment', { estimatedHours: 10 });
    betaStage.addTask('Gather beta feedback', { estimatedHours: 40 });
    betaStage.addTask('Fix critical issues', { estimatedHours: 30 });
    
    releaseStage.addTask('Prepare release notes', { estimatedHours: 10 });
    releaseStage.addTask('Deploy to production', { estimatedHours: 20 });
    releaseStage.addTask('Post-release monitoring', { estimatedHours: 30 });
    
    // Add feature flags for beta and release stages
    betaStage.addFeatureFlag('new-ui', true);
    betaStage.addFeatureFlag('advanced-search', true);
    betaStage.addFeatureFlag('analytics-dashboard', false);
    
    releaseStage.addFeatureFlag('new-ui', true);
    releaseStage.addFeatureFlag('advanced-search', true);
    releaseStage.addFeatureFlag('analytics-dashboard', true);
    
    // Add A/B tests
    betaStage.addABTest('search-results-layout');
    releaseStage.addABTest('onboarding-flow');
    
    // Create supporting components
    const dependencyResolver = new DependencyResolver(timeline);
    const progressTracker = ProgressTracker.withStrategy(ProgressStrategy.TIME_BASED);
    const notificationService = new NotificationService();
    
    // Start and run through the timeline
    timeline.start();
    
    // Verify initial state
    expect(timeline.status).toBe(TimelineItemStatus.IN_PROGRESS);
    expect(progressTracker.calculateTimelineProgress(timeline)).toBe(0);
    expect(dependencyResolver.getNextItems(1)[0].id).toBe(planningStage.id);
    
    // Execute planning stage
    planningStage.start();
    planningStage.tasks.forEach(task => planningStage.completeTask(task.id));
    planningStage.complete();
    requirementsSignoffMilestone.reach();
    
    // Execute development stage
    developmentStage.start();
    developmentStage.tasks.forEach(task => developmentStage.completeTask(task.id));
    developmentStage.complete();
    featureFreezeMilestone.reach();
    
    // Calculate progress after development (should be around 43% based on estimated hours)
    const progressAfterDev = progressTracker.calculateTimelineProgress(timeline);
    expect(progressAfterDev).toBeGreaterThan(40);
    expect(progressAfterDev).toBeLessThan(50);
    
    // Execute QA stage
    qaStage.start();
    qaStage.tasks.forEach(task => qaStage.completeTask(task.id));
    qaStage.complete();
    betaReleaseMilestone.reach();
    
    // Execute beta stage (with feature flags)
    betaStage.start();
    betaStage.tasks.forEach(task => betaStage.completeTask(task.id));
    betaStage.complete();
    
    // Verify feature flags for beta stage
    expect(betaStage.featureFlags?.['new-ui']).toBe(true);
    expect(betaStage.featureFlags?.['advanced-search']).toBe(true);
    expect(betaStage.featureFlags?.['analytics-dashboard']).toBe(false);
    
    // Execute release stage
    releaseStage.start();
    releaseStage.tasks.forEach(task => releaseStage.completeTask(task.id));
    releaseStage.complete();
    generalReleaseMilestone.reach();
    
    // Verify feature flags for release stage
    expect(releaseStage.featureFlags?.['new-ui']).toBe(true);
    expect(releaseStage.featureFlags?.['advanced-search']).toBe(true);
    expect(releaseStage.featureFlags?.['analytics-dashboard']).toBe(true);
    
    // Complete the timeline
    timeline.complete();
    
    // Verify final state
    expect(timeline.status).toBe(TimelineItemStatus.COMPLETED);
    expect(progressTracker.calculateTimelineProgress(timeline)).toBe(100);
    
    // Verify critical path
    const criticalPath = dependencyResolver.getCriticalPath();
    expect(criticalPath).toContain(planningStage.id);
    expect(criticalPath).toContain(developmentStage.id);
    expect(criticalPath).toContain(qaStage.id);
    expect(criticalPath).toContain(betaStage.id);
    expect(criticalPath).toContain(releaseStage.id);
    
    // Test serialization and deserialization
    const json = timeline.toJSON();
    const repository = new InMemoryTimelineRepository();
    await repository.saveTimeline(timeline);
    
    // List and verify repository contents
    const timelineList = await repository.listTimelines();
    expect(timelineList).toHaveLength(1);
    expect(timelineList[0].id).toBe(timeline.id);
    
    // Search by name
    const searchResults = await repository.searchTimelinesByName('Product Release');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe(timeline.id);
    
    // Search by status
    const completedTimelines = await repository.searchTimelinesByStatus(TimelineItemStatus.COMPLETED);
    expect(completedTimelines).toHaveLength(1);
    expect(completedTimelines[0].id).toBe(timeline.id);
  });
});