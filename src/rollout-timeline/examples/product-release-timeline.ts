/**
 * Example of using the Roll-out Timeline for a product release
 */

import { Timeline } from '../timeline';
import { Stage } from '../stage';
import { Milestone } from '../milestone';
import { DependencyResolver } from '../dependency-resolver';
import { NotificationService } from '../notification-service';
import { ProgressTracker } from '../progress-tracker';
import { JsonFileTimelineRepository } from '../repositories/json-file-repository';
import {
  TimelineItemStatus,
  TimelineItemPriority,
  DependencyType,
  NotificationChannel,
  ProgressStrategy
} from '../types';

/**
 * Create a product release timeline example
 */
export async function createProductReleaseExample(): Promise<void> {
  // Create timeline
  const timeline = new Timeline({
    name: 'Product Release v2.0',
    description: 'Timeline for releasing version 2.0 of our product',
    version: '1.0.0',
    createdBy: 'product-team'
  });

  // Create stages
  const planningStage = new Stage({
    name: 'Planning',
    description: 'Requirements gathering and planning',
    priority: TimelineItemPriority.HIGH,
    plannedStartDate: new Date('2025-01-01'),
    plannedEndDate: new Date('2025-01-31'),
    owner: 'product-manager'
  });

  const developmentStage = new Stage({
    name: 'Development',
    description: 'Implementation of features',
    priority: TimelineItemPriority.HIGH,
    plannedStartDate: new Date('2025-02-01'),
    plannedEndDate: new Date('2025-03-31'),
    owner: 'dev-team-lead'
  });

  const qaStage = new Stage({
    name: 'Quality Assurance',
    description: 'Testing and bug fixing',
    priority: TimelineItemPriority.HIGH,
    plannedStartDate: new Date('2025-04-01'),
    plannedEndDate: new Date('2025-04-30'),
    owner: 'qa-lead'
  });

  const betaStage = new Stage({
    name: 'Beta Testing',
    description: 'Early access for selected customers',
    priority: TimelineItemPriority.MEDIUM,
    plannedStartDate: new Date('2025-05-01'),
    plannedEndDate: new Date('2025-05-15'),
    owner: 'beta-coordinator'
  });

  const launchStage = new Stage({
    name: 'Launch',
    description: 'Public launch of the product',
    priority: TimelineItemPriority.CRITICAL,
    plannedStartDate: new Date('2025-05-16'),
    plannedEndDate: new Date('2025-05-31'),
    owner: 'product-manager'
  });

  // Create milestones
  const requirementsApprovedMilestone = new Milestone({
    name: 'Requirements Approved',
    description: 'All requirements are finalized and approved',
    plannedEndDate: new Date('2025-01-31'),
    owner: 'product-manager'
  });

  const alphaReleaseMilestone = new Milestone({
    name: 'Alpha Release',
    description: 'Internal release for testing',
    plannedEndDate: new Date('2025-03-15'),
    owner: 'dev-team-lead'
  });

  const featureFreezeMilestone = new Milestone({
    name: 'Feature Freeze',
    description: 'No more features to be added',
    plannedEndDate: new Date('2025-03-31'),
    owner: 'dev-team-lead'
  });

  const betaReleaseMilestone = new Milestone({
    name: 'Beta Release',
    description: 'Release to beta testers',
    plannedEndDate: new Date('2025-05-01'),
    owner: 'beta-coordinator'
  });

  const launchMilestone = new Milestone({
    name: 'Public Launch',
    description: 'Product is available to all customers',
    plannedEndDate: new Date('2025-05-31'),
    owner: 'marketing-lead'
  });

  // Add stages and milestones to timeline
  timeline.addStage(planningStage);
  timeline.addStage(developmentStage);
  timeline.addStage(qaStage);
  timeline.addStage(betaStage);
  timeline.addStage(launchStage);

  timeline.addMilestone(requirementsApprovedMilestone);
  timeline.addMilestone(alphaReleaseMilestone);
  timeline.addMilestone(featureFreezeMilestone);
  timeline.addMilestone(betaReleaseMilestone);
  timeline.addMilestone(launchMilestone);

  // Add dependencies
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
    launchStage.id,
    betaStage.id,
    DependencyType.FINISH_TO_START
  );

  timeline.addDependency(
    requirementsApprovedMilestone.id,
    planningStage.id,
    DependencyType.FINISH_TO_START
  );

  timeline.addDependency(
    alphaReleaseMilestone.id,
    developmentStage.id,
    DependencyType.START_TO_START,
    false
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
    launchMilestone.id,
    launchStage.id,
    DependencyType.FINISH_TO_START
  );

  // Add tasks to stages
  planningStage.addTask('Define scope and requirements', { estimatedHours: 20 });
  planningStage.addTask('Create user stories', { estimatedHours: 15 });
  planningStage.addTask('Prioritize features', { estimatedHours: 10 });
  planningStage.addTask('Create project plan', { estimatedHours: 15 });

  developmentStage.addTask('Set up development environment', { estimatedHours: 10 });
  developmentStage.addTask('Implement core features', { estimatedHours: 100 });
  developmentStage.addTask('Build API integrations', { estimatedHours: 50 });
  developmentStage.addTask('Create user interface', { estimatedHours: 80 });
  developmentStage.addTask('Code review', { estimatedHours: 40 });

  qaStage.addTask('Create test plan', { estimatedHours: 15 });
  qaStage.addTask('Write unit tests', { estimatedHours: 30 });
  qaStage.addTask('Run integration tests', { estimatedHours: 25 });
  qaStage.addTask('Perform user acceptance testing', { estimatedHours: 40 });
  qaStage.addTask('Fix bugs', { estimatedHours: 50 });

  betaStage.addTask('Select beta testers', { estimatedHours: 10 });
  betaStage.addTask('Prepare beta release notes', { estimatedHours: 5 });
  betaStage.addTask('Deploy to beta environment', { estimatedHours: 10 });
  betaStage.addTask('Gather and analyze feedback', { estimatedHours: 30 });
  betaStage.addTask('Fix critical issues', { estimatedHours: 20 });

  launchStage.addTask('Prepare marketing materials', { estimatedHours: 25 });
  launchStage.addTask('Update documentation', { estimatedHours: 20 });
  launchStage.addTask('Deploy to production', { estimatedHours: 15 });
  launchStage.addTask('Announce launch', { estimatedHours: 5 });
  launchStage.addTask('Monitor performance', { estimatedHours: 20 });

  // Add resources to stages
  planningStage.addResource('Product Manager', 'Lead', 100);
  planningStage.addResource('Business Analyst', 'Member', 100);
  planningStage.addResource('UX Designer', 'Member', 50);

  developmentStage.addResource('Dev Team Lead', 'Lead', 100);
  developmentStage.addResource('Backend Developers', 'Member', 400);
  developmentStage.addResource('Frontend Developers', 'Member', 300);
  developmentStage.addResource('DevOps Engineer', 'Member', 50);

  qaStage.addResource('QA Lead', 'Lead', 100);
  qaStage.addResource('QA Engineers', 'Member', 300);
  qaStage.addResource('Automation Engineer', 'Member', 100);

  betaStage.addResource('Beta Coordinator', 'Lead', 100);
  betaStage.addResource('Customer Success', 'Member', 100);
  betaStage.addResource('Developers', 'Member', 50);
  betaStage.addResource('QA Engineers', 'Member', 50);

  launchStage.addResource('Product Manager', 'Lead', 100);
  launchStage.addResource('Marketing Team', 'Member', 100);
  launchStage.addResource('DevOps Engineers', 'Member', 100);
  launchStage.addResource('Customer Support', 'Member', 100);

  // Add metrics to stages
  developmentStage.addMetric('Test Coverage', 'Code test coverage percentage', 90, '%');
  developmentStage.addMetric('Code Quality', 'SonarQube quality gate score', 80, '%');
  
  qaStage.addMetric('Open Bugs', 'Number of open bugs', 0, 'bugs');
  qaStage.addMetric('Test Pass Rate', 'Percentage of tests passing', 100, '%');
  
  betaStage.addMetric('User Satisfaction', 'Average user satisfaction score', 4.5, 'out of 5');
  betaStage.addMetric('Feature Usage', 'Percentage of features used', 80, '%');
  
  launchStage.addMetric('System Uptime', 'System uptime after launch', 99.9, '%');
  launchStage.addMetric('Conversion Rate', 'User conversion rate', 5, '%');

  // Add feature flags for different stages
  developmentStage.addFeatureFlag('new-ui', true);
  developmentStage.addFeatureFlag('advanced-search', true);
  developmentStage.addFeatureFlag('analytics-dashboard', false);
  
  betaStage.addFeatureFlag('new-ui', true);
  betaStage.addFeatureFlag('advanced-search', true);
  betaStage.addFeatureFlag('analytics-dashboard', true);
  
  launchStage.addFeatureFlag('new-ui', true);
  launchStage.addFeatureFlag('advanced-search', true);
  launchStage.addFeatureFlag('analytics-dashboard', true);

  // Add A/B tests for beta and launch stages
  betaStage.addABTest('new-ui-variant-test');
  betaStage.addABTest('search-results-layout-test');
  
  launchStage.addABTest('onboarding-flow-test');

  // Add notifications
  timeline.addNotification({
    trigger: 'milestone_reached',
    channel: NotificationChannel.EMAIL,
    template: 'Milestone "${item.name}" has been reached in the ${timeline.name} timeline.',
    recipients: ['team@example.com'],
    channelConfig: {
      subject: 'Timeline Milestone Reached'
    }
  });

  timeline.addNotification({
    trigger: 'stage_complete',
    channel: NotificationChannel.SLACK,
    template: 'Stage "${item.name}" has been completed in the ${timeline.name} timeline.',
    channelConfig: {
      channel: '#product-releases'
    }
  });

  // Create supporting components
  const dependencyResolver = new DependencyResolver(timeline);
  const progressTracker = ProgressTracker.withStrategy(ProgressStrategy.TIME_BASED);
  const notificationService = new NotificationService();
  
  // Register notification handlers
  notificationService.registerEmailHandler(async (to, subject, body, config) => {
    console.log(`[EMAIL] To: ${to.join(', ')}, Subject: ${subject}, Body: ${body}`);
    return true;
  });
  
  notificationService.registerSlackHandler(async (channel, message, config) => {
    console.log(`[SLACK] Channel: ${channel}, Message: ${message}`);
    return true;
  });

  // Save timeline to a JSON file repository
  const repository = new JsonFileTimelineRepository('./timelines');
  await repository.saveTimeline(timeline);

  // Print timeline information
  console.log('Product Release Timeline created:');
  console.log(`- Name: ${timeline.name}`);
  console.log(`- Stages: ${timeline.stages.length}`);
  console.log(`- Milestones: ${timeline.milestones.length}`);
  console.log(`- Total Tasks: ${timeline.stages.reduce((sum, stage) => sum + stage.tasks.length, 0)}`);
  
  console.log('\nCritical Path:');
  const criticalPath = dependencyResolver.getCriticalPath();
  for (const itemId of criticalPath) {
    const item = timeline.getItemById(itemId);
    if (item) {
      console.log(`- ${item.name}`);
    }
  }
  
  console.log('\nEstimated Completion:');
  const estimatedCompletionDate = dependencyResolver.estimateCompletionDate();
  console.log(`- ${estimatedCompletionDate?.toLocaleDateString() || 'Unknown'}`);
  
  console.log('\nTimeline saved to disk');
}

/**
 * Run the example if this file is executed directly
 */
if (require.main === module) {
  createProductReleaseExample().catch(console.error);
}