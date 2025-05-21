/**
 * Integration Tests for Roll-out Timeline
 * @module rollout-timeline/__tests__/integration.test
 * @description Integration tests for the Roll-out Timeline component
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
  InMemoryTimelineRepository,
  JsonFileTimelineRepository
} from '../';

import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

// Promisify fs.mkdir and fs.rm
const mkdir = promisify(fs.mkdir);
const rm = promisify(fs.rm);

describe('Roll-out Timeline Integration Tests', () => {
  // Test data directory for JSON repository
  const testDataDir = path.join(__dirname, 'test-data');
  
  // Setup test data directory
  beforeAll(async () => {
    try {
      await mkdir(testDataDir, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
    }
  });
  
  // Clean up test data directory
  afterAll(async () => {
    try {
      await rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  // Test basic timeline operations
  test('should create and manage a timeline with stages and milestones', async () => {
    // Create a timeline
    const timeline = new Timeline(
      'Test Release',
      '1.0.0',
      {
        description: 'Test release timeline',
        createdBy: 'Test User'
      }
    );
    
    // Add stages
    const stage1 = timeline.addStage({
      name: 'Planning',
      description: 'Planning phase',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-06-01'),
      plannedEnd: new Date('2025-06-15'),
      owner: 'Project Manager'
    });
    
    const stage2 = timeline.addStage({
      name: 'Development',
      description: 'Development phase',
      priority: PriorityLevel.CRITICAL,
      plannedStart: new Date('2025-06-16'),
      plannedEnd: new Date('2025-07-15'),
      owner: 'Lead Developer'
    });
    
    // Add a milestone
    const milestone = timeline.addMilestone({
      name: 'Requirements Complete',
      description: 'All requirements finalized',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-06-15'),
      owner: 'Product Manager',
      critical: true
    });
    
    // Add tasks to a stage
    stage1.addTask('Define scope', { assignee: 'Product Manager' });
    stage1.addTask('Estimate resources', { assignee: 'Project Manager' });
    
    // Add resources to a stage
    stage2.addResource('Development Server', 'Infrastructure', { available: true });
    stage2.addResource('Test Environment', 'Infrastructure', { available: false });
    
    // Add dependencies
    timeline.addDependency(stage2.id, stage1.id, DependencyType.COMPLETION);
    timeline.addDependency(stage2.id, milestone.id, DependencyType.COMPLETION);
    
    // Start the timeline
    timeline.start();
    expect(timeline.status).toBe(TimelineItemStatus.IN_PROGRESS);
    
    // Start and complete the first stage
    timeline.startStage(stage1.id);
    expect(stage1.status).toBe(TimelineItemStatus.IN_PROGRESS);
    
    // Complete tasks
    stage1.completeTask(stage1.tasks![0].id);
    stage1.completeTask(stage1.tasks![1].id);
    
    // Complete the stage
    timeline.completeStage(stage1.id);
    expect(stage1.status).toBe(TimelineItemStatus.COMPLETED);
    
    // Reach the milestone
    timeline.reachMilestone(milestone.id);
    expect(milestone.status).toBe(TimelineItemStatus.COMPLETED);
    
    // Check dependencies
    const resolver = new DependencyResolver(timeline);
    expect(resolver.areDependenciesSatisfied(stage2.id)).toBe(true);
    
    // Start the second stage
    timeline.startStage(stage2.id);
    expect(stage2.status).toBe(TimelineItemStatus.IN_PROGRESS);
    
    // Update progress
    timeline.updateStageProgress(stage2.id, 50);
    expect(stage2.progress).toBe(50);
    
    // Calculate overall progress
    const progress = timeline.calculateOverallProgress();
    expect(progress).toBeGreaterThan(0);
    
    // Complete the timeline
    timeline.completeStage(stage2.id);
    timeline.complete();
    expect(timeline.status).toBe(TimelineItemStatus.COMPLETED);
  });
  
  // Test dependency resolution
  test('should handle complex dependencies', () => {
    // Create a timeline
    const timeline = new Timeline('Dependency Test', '1.0.0');
    
    // Add stages
    const stage1 = timeline.addStage({
      name: 'Stage 1',
      plannedStart: new Date('2025-06-01')
    });
    
    const stage2 = timeline.addStage({
      name: 'Stage 2',
      plannedStart: new Date('2025-06-05')
    });
    
    const stage3 = timeline.addStage({
      name: 'Stage 3',
      plannedStart: new Date('2025-06-10')
    });
    
    const stage4 = timeline.addStage({
      name: 'Stage 4',
      plannedStart: new Date('2025-06-15')
    });
    
    // Add dependencies
    timeline.addDependency(stage2.id, stage1.id, DependencyType.COMPLETION);
    timeline.addDependency(stage3.id, stage2.id, DependencyType.START);
    timeline.addDependency(stage4.id, stage3.id, DependencyType.COMPLETION);
    timeline.addDependency(stage4.id, stage1.id, DependencyType.COMPLETION); // Multiple dependencies
    
    // Create resolver
    const resolver = new DependencyResolver(timeline);
    
    // Initially only stage1 should be ready
    let readyItems = resolver.getReadyToStartItems();
    expect(readyItems.length).toBe(1);
    expect(readyItems[0].id).toBe(stage1.id);
    
    // Complete stage1
    timeline.startStage(stage1.id);
    timeline.completeStage(stage1.id);
    
    // Now stage2 should be ready
    readyItems = resolver.getReadyToStartItems();
    expect(readyItems.length).toBe(1);
    expect(readyItems[0].id).toBe(stage2.id);
    
    // Start stage2
    timeline.startStage(stage2.id);
    
    // Now stage3 should be ready because it depends on stage2 starting
    readyItems = resolver.getReadyToStartItems();
    expect(readyItems.length).toBe(1);
    expect(readyItems[0].id).toBe(stage3.id);
    
    // Start stage3
    timeline.startStage(stage3.id);
    
    // Complete stage2 and stage3
    timeline.completeStage(stage2.id);
    timeline.completeStage(stage3.id);
    
    // Now stage4 should be ready
    readyItems = resolver.getReadyToStartItems();
    expect(readyItems.length).toBe(1);
    expect(readyItems[0].id).toBe(stage4.id);
    
    // Test circular dependency detection
    const willCreateCycle = resolver.addDependency(
      stage1.id,
      stage4.id,
      DependencyType.COMPLETION
    );
    
    // Adding this dependency would create a cycle, so it should fail
    expect(willCreateCycle).toBe(false);
    
    // Get the critical path
    const criticalPath = resolver.getCriticalPath();
    expect(criticalPath.length).toBeGreaterThan(0);
  });
  
  // Test notification system
  test('should send notifications for timeline events', async () => {
    // Create a timeline
    const timeline = new Timeline('Notification Test', '1.0.0');
    
    // Add a stage
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    // Create a notification service
    const notificationService = new NotificationService();
    
    // Mock notification handlers
    const mockHandlers = {
      email: jest.fn().mockResolvedValue(true),
      slack: jest.fn().mockResolvedValue(true)
    };
    
    // Register mock handlers
    notificationService.registerChannel('email', mockHandlers.email);
    notificationService.registerChannel('slack', mockHandlers.slack);
    
    // Add a notification to the stage
    if (!stage.notifications) {
      stage.notifications = [];
    }
    
    stage.notifications.push({
      id: 'test-notification',
      event: TimelineEvent.STAGE_STARTED,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
      messageTemplate: 'Stage {{item.name}} has started in timeline {{timeline.name}}',
      sent: false,
      data: {
        recipients: ['test@example.com']
      }
    });
    
    // Register event listener
    timeline.on(TimelineEvent.STAGE_STARTED, async (event) => {
      if (event.timelineItem) {
        await notificationService.processEvent(
          event.timelineItem,
          event.type,
          event.timeline
        );
      }
    });
    
    // Start the stage (which should trigger the notification)
    timeline.startStage(stage.id);
    
    // Wait for async handlers
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verify notifications were sent
    expect(mockHandlers.email).toHaveBeenCalled();
    expect(mockHandlers.slack).toHaveBeenCalled();
    
    // Check that notification is marked as sent
    expect(stage.notifications[0].sent).toBe(true);
    expect(stage.notifications[0].sentAt).toBeDefined();
  });
  
  // Test progress tracking
  test('should track progress using different strategies', () => {
    // Create a timeline
    const timeline = new Timeline('Progress Test', '1.0.0');
    
    // Add stages with different priorities
    const stage1 = timeline.addStage({
      name: 'Critical Stage',
      priority: PriorityLevel.CRITICAL,
      plannedStart: new Date('2025-06-01'),
      plannedEnd: new Date('2025-06-15')
    });
    
    const stage2 = timeline.addStage({
      name: 'High Priority Stage',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-06-16'),
      plannedEnd: new Date('2025-06-30')
    });
    
    const stage3 = timeline.addStage({
      name: 'Medium Priority Stage',
      priority: PriorityLevel.MEDIUM,
      plannedStart: new Date('2025-07-01'),
      plannedEnd: new Date('2025-07-15')
    });
    
    // Start stages
    timeline.startStage(stage1.id);
    timeline.startStage(stage2.id);
    
    // Set progress on stages
    timeline.updateStageProgress(stage1.id, 75);
    timeline.updateStageProgress(stage2.id, 50);
    
    // Create progress trackers with different strategies
    const priorityTracker = new ProgressTracker('priority');
    const equalTracker = new ProgressTracker('equal');
    const timeTracker = new ProgressTracker('time');
    
    // Calculate progress using different strategies
    const priorityProgress = priorityTracker.calculateTimelineProgress(timeline);
    const equalProgress = equalTracker.calculateTimelineProgress(timeline);
    const timeProgress = timeTracker.calculateTimelineProgress(timeline);
    
    // Priority progress should weight the critical stage higher
    expect(priorityProgress).toBeGreaterThan(0);
    
    // Equal progress should treat all stages equally
    expect(equalProgress).toBeGreaterThan(0);
    
    // Time progress should be based on elapsed time
    expect(timeProgress).toBeGreaterThanOrEqual(0);
    
    // Get progress summary
    const summary = priorityTracker.getProgressSummary(timeline);
    expect(summary.overallProgress).toBe(priorityProgress);
    expect(summary.stageProgress).toHaveLength(3);
    
    // Get at-risk items (nothing should be at risk yet)
    const atRiskItems = priorityTracker.getAtRiskItems(timeline);
    expect(atRiskItems.length).toBe(0);
    
    // Update all progress at once
    priorityTracker.updateAllProgress(timeline);
  });
  
  // Test repositories
  test('should store and retrieve timelines from repositories', async () => {
    // Create a timeline
    const timeline = new Timeline(
      'Repository Test',
      '1.0.0',
      {
        description: 'Test repository storage'
      }
    );
    
    // Add a stage and milestone
    timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    timeline.addMilestone({
      name: 'Test Milestone',
      plannedStart: new Date('2025-06-15')
    });
    
    // Test in-memory repository
    const memoryRepo = new InMemoryTimelineRepository();
    
    // Save timeline
    const savedTimeline = await memoryRepo.saveTimeline(timeline);
    expect(savedTimeline.id).toBe(timeline.id);
    
    // Get timeline
    const retrievedTimeline = await memoryRepo.getTimeline(timeline.id);
    expect(retrievedTimeline).not.toBeNull();
    expect(retrievedTimeline!.name).toBe('Repository Test');
    expect(retrievedTimeline!.stages).toHaveLength(1);
    expect(retrievedTimeline!.milestones).toHaveLength(1);
    
    // List timelines
    const timelineList = await memoryRepo.listTimelines();
    expect(timelineList).toHaveLength(1);
    
    // Test JSON file repository
    const jsonRepo = new JsonFileTimelineRepository(testDataDir);
    
    // Save timeline
    const jsonSavedTimeline = await jsonRepo.saveTimeline(timeline);
    expect(jsonSavedTimeline.id).toBe(timeline.id);
    
    // Get timeline
    const jsonRetrievedTimeline = await jsonRepo.getTimeline(timeline.id);
    expect(jsonRetrievedTimeline).not.toBeNull();
    expect(jsonRetrievedTimeline!.name).toBe('Repository Test');
    expect(jsonRetrievedTimeline!.stages).toHaveLength(1);
    expect(jsonRetrievedTimeline!.milestones).toHaveLength(1);
    
    // Delete timeline
    const deleted = await jsonRepo.deleteTimeline(timeline.id);
    expect(deleted).toBe(true);
    
    // Verify deletion
    const deletedTimeline = await jsonRepo.getTimeline(timeline.id);
    expect(deletedTimeline).toBeNull();
  });
  
  // Test integration with other Future-Proof Hatches components
  test('should integrate with Feature Flags', () => {
    // Create a timeline
    const timeline = new Timeline('Feature Flag Integration', '1.0.0');
    
    // Add a deployment stage
    const deploymentStage = timeline.addStage({
      name: 'Deployment',
      plannedStart: new Date('2025-06-01'),
      plannedEnd: new Date('2025-06-02')
    });
    
    // Add feature flags to the deployment stage
    deploymentStage.addFeatureFlag('new-ui', true, { percentage: 100 });
    deploymentStage.addFeatureFlag('advanced-search', true, { percentage: 50, segments: ['beta-users'] });
    deploymentStage.addFeatureFlag('experimental-feature', false);
    
    // Verify feature flags
    expect(deploymentStage.featureFlags).toHaveLength(3);
    
    // Enable feature flags when stage is completed
    timeline.startStage(deploymentStage.id);
    timeline.completeStage(deploymentStage.id);
    
    // Verify feature flags status
    const newUiFlag = deploymentStage.featureFlags!.find(f => f.name === 'new-ui');
    const advancedSearchFlag = deploymentStage.featureFlags!.find(f => f.name === 'advanced-search');
    const experimentalFlag = deploymentStage.featureFlags!.find(f => f.name === 'experimental-feature');
    
    expect(newUiFlag!.enabled).toBe(true);
    expect(newUiFlag!.percentage).toBe(100);
    
    expect(advancedSearchFlag!.enabled).toBe(true);
    expect(advancedSearchFlag!.percentage).toBe(50);
    expect(advancedSearchFlag!.segments).toContain('beta-users');
    
    expect(experimentalFlag!.enabled).toBe(false);
  });
});

describe('Full Roll-out Timeline Workflow Test', () => {
  test('should handle a complete product release workflow', async () => {
    // Create a timeline
    const timeline = new Timeline(
      'Product Release v2.0',
      '2.0.0',
      {
        description: 'Timeline for the release of version 2.0 of our product',
        createdBy: 'Release Manager'
      }
    );
    
    // Add stages
    const planningStage = timeline.addStage({
      name: 'Planning',
      description: 'Define scope, timeline, and resources',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-06-01'),
      plannedEnd: new Date('2025-06-15'),
      owner: 'Project Manager'
    });
    
    const developmentStage = timeline.addStage({
      name: 'Development',
      description: 'Implement new features and improvements',
      priority: PriorityLevel.CRITICAL,
      plannedStart: new Date('2025-06-16'),
      plannedEnd: new Date('2025-07-31'),
      owner: 'Lead Developer'
    });
    
    const testingStage = timeline.addStage({
      name: 'Testing',
      description: 'Verify functionality and fix issues',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-08-01'),
      plannedEnd: new Date('2025-08-15'),
      owner: 'QA Lead'
    });
    
    const deploymentStage = timeline.addStage({
      name: 'Deployment',
      description: 'Release to production',
      priority: PriorityLevel.CRITICAL,
      plannedStart: new Date('2025-09-01'),
      plannedEnd: new Date('2025-09-05'),
      owner: 'DevOps Engineer'
    });
    
    // Add milestones
    const requirementsFinalized = timeline.addMilestone({
      name: 'Requirements Finalized',
      description: 'All requirements and specifications approved',
      priority: PriorityLevel.HIGH,
      critical: true,
      plannedStart: new Date('2025-06-15'),
      owner: 'Product Manager'
    });
    
    const featureFreeze = timeline.addMilestone({
      name: 'Feature Freeze',
      description: 'No new features accepted after this point',
      priority: PriorityLevel.MEDIUM,
      critical: true,
      plannedStart: new Date('2025-07-15'),
      owner: 'Project Manager'
    });
    
    const publicRelease = timeline.addMilestone({
      name: 'Public Release',
      description: 'Product is publicly available',
      priority: PriorityLevel.CRITICAL,
      critical: true,
      plannedStart: new Date('2025-09-05'),
      owner: 'CEO'
    });
    
    // Add dependencies
    timeline.addDependency(developmentStage.id, planningStage.id, DependencyType.COMPLETION);
    timeline.addDependency(developmentStage.id, requirementsFinalized.id, DependencyType.COMPLETION);
    timeline.addDependency(featureFreeze.id, developmentStage.id, DependencyType.COMPLETION, {
      condition: 'progress>=75'
    });
    timeline.addDependency(testingStage.id, developmentStage.id, DependencyType.COMPLETION);
    timeline.addDependency(deploymentStage.id, testingStage.id, DependencyType.COMPLETION);
    timeline.addDependency(publicRelease.id, deploymentStage.id, DependencyType.COMPLETION);
    
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
    
    // Add tasks to the Deployment Stage
    deploymentStage.addTask('Update database schema', {
      assignee: 'Database Admin',
      estimatedHours: 2
    });
    
    deploymentStage.addTask('Deploy backend services', {
      assignee: 'DevOps Engineer',
      estimatedHours: 1
    });
    
    // Add feature flags to the Deployment Stage
    deploymentStage.addFeatureFlag('new-ui', true, { percentage: 100 });
    deploymentStage.addFeatureFlag('advanced-search', true, { percentage: 50, segments: ['beta-users'] });
    
    // Create dependency resolver and progress tracker
    const resolver = new DependencyResolver(timeline);
    const progressTracker = new ProgressTracker();
    
    // Start the timeline
    timeline.start();
    expect(timeline.status).toBe(TimelineItemStatus.IN_PROGRESS);
    
    // Complete Planning stage and Requirements milestone
    timeline.startStage(planningStage.id);
    timeline.completeStage(planningStage.id);
    timeline.reachMilestone(requirementsFinalized.id);
    
    // Start Development
    const readyItems = resolver.getReadyToStartItems();
    expect(readyItems).toContainEqual(expect.objectContaining({
      id: developmentStage.id
    }));
    
    timeline.startStage(developmentStage.id);
    
    // Update progress on Development and its sub-stages
    timeline.updateStageProgress(developmentStage.id, 80);
    
    // Now Feature Freeze milestone should be reachable
    const featureFreezeReady = resolver.areDependenciesSatisfied(featureFreeze.id);
    expect(featureFreezeReady).toBe(true);
    
    // Reach Feature Freeze milestone
    timeline.reachMilestone(featureFreeze.id);
    
    // Complete Development stage
    timeline.completeStage(developmentStage.id);
    
    // Start and complete Testing stage
    timeline.startStage(testingStage.id);
    timeline.completeStage(testingStage.id);
    
    // Start and complete Deployment stage
    timeline.startStage(deploymentStage.id);
    
    // Complete Deployment tasks
    deploymentStage.completeTask(deploymentStage.tasks![0].id);
    deploymentStage.completeTask(deploymentStage.tasks![1].id);
    
    // Complete Deployment stage
    timeline.completeStage(deploymentStage.id);
    
    // Reach Public Release milestone
    timeline.reachMilestone(publicRelease.id);
    
    // Complete timeline
    timeline.complete();
    expect(timeline.status).toBe(TimelineItemStatus.COMPLETED);
    
    // Verify final progress is 100%
    const finalProgress = progressTracker.calculateTimelineProgress(timeline);
    expect(finalProgress).toBe(100);
    
    // Save timeline to repository
    const repository = new InMemoryTimelineRepository();
    const savedTimeline = await repository.saveTimeline(timeline);
    
    // Verify saved timeline
    expect(savedTimeline.id).toBe(timeline.id);
    expect(savedTimeline.status).toBe(TimelineItemStatus.COMPLETED);
  });
});