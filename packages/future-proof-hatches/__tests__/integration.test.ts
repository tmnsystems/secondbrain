/**
 * Integration tests for the Future-Proof Hatches package
 * 
 * This file contains tests that verify the interactions between
 * the different components of the Future-Proof Hatches package.
 */

import { 
  ExtensibilityManager, 
  ExtensionPointImpl 
} from '../src/extensibility';

import { 
  PluginManager, 
  InMemoryPluginLoader 
} from '../src/plugin-system';

import { 
  ApiGateway, 
  RouteRegistry 
} from '../src/api-gateway';

import { 
  ModelManager, 
  InMemoryModelRegistry 
} from '../src/ai-models';

import { 
  FeatureFlagManager, 
  InMemoryFeatureFlagProvider 
} from '../src/feature-flags';

import { 
  ABTestingManagerImpl, 
  InMemoryExperimentRepository,
  ExperimentStatus,
  VariantAssignmentStrategy 
} from '../src/ab-testing';

import {
  Timeline,
  Stage,
  Milestone,
  TimelineItemStatus,
  PriorityLevel,
  DependencyType,
  DependencyResolver,
  InMemoryTimelineRepository
} from '../src/rollout-timeline';

describe('Future-Proof Hatches Integration', () => {
  // Create instances of all components
  let extensibilityManager: ExtensibilityManager;
  let pluginManager: PluginManager;
  let apiGateway: ApiGateway;
  let modelManager: ModelManager;
  let featureFlagManager: FeatureFlagManager;
  let abTestManager: ABTestingManagerImpl;
  let timelineRepository: InMemoryTimelineRepository;
  
  beforeEach(() => {
    // Initialize all components
    extensibilityManager = new ExtensibilityManager();
    pluginManager = new PluginManager();
    apiGateway = new ApiGateway();
    modelManager = new ModelManager(new InMemoryModelRegistry());
    featureFlagManager = new FeatureFlagManager(new InMemoryFeatureFlagProvider());
    abTestManager = new ABTestingManagerImpl(new InMemoryExperimentRepository());
    timelineRepository = new InMemoryTimelineRepository();
  });
  
  describe('Feature Flag and A/B Testing Integration', () => {
    test('should use A/B testing for users in experiment and feature flags for others', async () => {
      // Register a feature flag
      await featureFlagManager.registerFlag({
        name: 'new-ui',
        description: 'Enable the new UI',
        enabled: false,
        defaultValue: false
      });
      
      // Create an experiment
      const experiment = await abTestManager.createExperiment(
        'New UI Experiment',
        'Test the new UI',
        [
          { id: 'control', name: 'Current UI', isControl: true, weight: 50, config: { useNewUI: false } },
          { id: 'treatment', name: 'New UI', isControl: false, weight: 50, config: { useNewUI: true } }
        ],
        ['page_view', 'click', 'conversion'],
        {
          assignmentStrategy: VariantAssignmentStrategy.STICKY,
          trafficAllocation: 0.5 // 50% of users
        }
      );
      
      // Start the experiment
      await abTestManager.startExperiment(experiment.id);
      
      // Mock a function that integrates both systems
      const getUIConfig = async (userId: string) => {
        // Check if user is in experiment
        const variant = await abTestManager.getVariantAssignment(experiment.id, userId);
        
        if (variant) {
          // User is in experiment, use variant config
          return {
            useNewUI: variant.config.useNewUI,
            source: 'experiment'
          };
        } else {
          // User is not in experiment, use feature flag
          const isEnabled = await featureFlagManager.isEnabled('new-ui', { userId });
          return {
            useNewUI: isEnabled,
            source: 'feature_flag'
          };
        }
      };
      
      // Test multiple users to ensure some get the feature from the experiment and some from feature flags
      const usersConfigs = await Promise.all(
        Array.from({ length: 50 }).map((_, i) => getUIConfig(`user${i}`))
      );
      
      // Some users should be in the experiment
      const experimentUsers = usersConfigs.filter(config => config.source === 'experiment');
      expect(experimentUsers.length).toBeGreaterThan(0);
      
      // Some users should fall back to feature flags
      const featureFlagUsers = usersConfigs.filter(config => config.source === 'feature_flag');
      expect(featureFlagUsers.length).toBeGreaterThan(0);
      
      // All feature flag users should have useNewUI=false (default value)
      expect(featureFlagUsers.every(config => config.useNewUI === false)).toBe(true);
      
      // Update the feature flag to true
      await featureFlagManager.updateFlag('new-ui', { defaultValue: true });
      
      // Get config for a user not in the experiment
      const nonExperimentUser = 'non-experiment-user';
      const configAfterUpdate = await getUIConfig(nonExperimentUser);
      
      // The user should get the feature flag value
      expect(configAfterUpdate.source).toBe('feature_flag');
      expect(configAfterUpdate.useNewUI).toBe(true);
    });
  });
  
  describe('Extensibility and Plugin Integration', () => {
    test('should allow plugins to provide extensions', async () => {
      // Create an extension point
      const documentProcessorExtensionPoint = new ExtensionPointImpl<(doc: any) => any>('document-processor');
      extensibilityManager.registerExtensionPoint(documentProcessorExtensionPoint);
      
      // Create a plugin that provides an extension
      const markdownPlugin = {
        id: 'markdown-plugin',
        name: 'Markdown Plugin',
        version: '1.0.0',
        initialize: async () => {
          // Register an extension with the extensibility manager
          extensibilityManager.registerExtension({
            id: 'markdown-processor',
            extensionPointId: 'document-processor',
            implementation: (doc: any) => ({ ...doc, processed: true, format: 'markdown' }),
            metadata: {
              name: 'Markdown Processor',
              description: 'Processes Markdown documents',
              version: '1.0.0'
            }
          });
          
          return { success: true };
        }
      };
      
      // Register the plugin loader
      pluginManager.addLoader(new InMemoryPluginLoader([markdownPlugin]));
      
      // Load plugins
      await pluginManager.loadPlugins();
      
      // Get extensions for the extension point
      const processors = extensibilityManager.getExtensions<(doc: any) => any>('document-processor');
      
      // Should have one processor
      expect(processors).toHaveLength(1);
      
      // Process a document
      const document = { content: '# Heading', type: 'markdown' };
      const processedDocument = processors[0](document);
      
      // Document should be processed
      expect(processedDocument.processed).toBe(true);
      expect(processedDocument.format).toBe('markdown');
    });
  });
  
  describe('API Gateway and AI Model Integration', () => {
    test('should provide AI models through API routes', async () => {
      // Register a model adapter
      const mockAdapter = {
        getModels: jest.fn().mockResolvedValue([{
          id: 'mock-model',
          name: 'Mock Model',
          provider: 'mock',
          type: 'text-completion'
        }]),
        complete: jest.fn().mockResolvedValue({
          text: 'Mocked completion'
        })
      };
      
      modelManager.registerAdapter(mockAdapter, 'mock');
      
      // Register API routes for models
      apiGateway.registerRoute({
        path: '/models',
        method: 'GET',
        handler: async (req, res) => {
          const models = await modelManager.getAvailableModels();
          return { models };
        }
      });
      
      apiGateway.registerRoute({
        path: '/complete',
        method: 'POST',
        handler: async (req, res) => {
          const { prompt, modelId } = req.body;
          const model = await modelManager.getModelById(modelId);
          
          if (!model) {
            throw new Error(`Model ${modelId} not found`);
          }
          
          const completion = await model.complete({ prompt });
          return { completion };
        }
      });
      
      // Mock request handlers
      const mockRes = {
        json: jest.fn()
      };
      
      // Call the /models route
      await apiGateway.getRouteHandler('/models', 'GET')({}, mockRes as any);
      
      // Should return the models
      expect(mockRes.json).toHaveBeenCalledWith({
        models: [{
          id: 'mock-model',
          name: 'Mock Model',
          provider: 'mock',
          type: 'text-completion'
        }]
      });
      
      // Call the /complete route
      await apiGateway.getRouteHandler('/complete', 'POST')({
        body: {
          prompt: 'Hello',
          modelId: 'mock-model'
        }
      }, mockRes as any);
      
      // Should return the completion
      expect(mockRes.json).toHaveBeenCalledWith({
        completion: {
          text: 'Mocked completion'
        }
      });
    });
  });
  
  describe('Feature Flag and API Gateway Integration', () => {
    test('should use feature flags to enable/disable API routes', async () => {
      // Register a feature flag for experimental API
      await featureFlagManager.registerFlag({
        name: 'experimental-api',
        description: 'Enable experimental API endpoints',
        enabled: false,
        defaultValue: false
      });
      
      // Create a middleware that checks feature flags
      const featureFlagMiddleware = (flagName: string) => async (req: any, res: any, next: () => Promise<any>) => {
        const userId = req.headers?.['user-id'];
        const isEnabled = await featureFlagManager.isEnabled(flagName, { userId });
        
        if (isEnabled) {
          return next();
        } else {
          return { error: 'Feature not enabled', status: 403 };
        }
      };
      
      // Register API routes
      apiGateway.registerRoute({
        path: '/stable-api',
        method: 'GET',
        handler: async (req, res) => {
          return { message: 'This is a stable API' };
        }
      });
      
      apiGateway.registerRoute({
        path: '/experimental-api',
        method: 'GET',
        middleware: [featureFlagMiddleware('experimental-api')],
        handler: async (req, res) => {
          return { message: 'This is an experimental API' };
        }
      });
      
      // Mock request handlers
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      // Call the stable API route
      await apiGateway.getRouteHandler('/stable-api', 'GET')({}, mockRes as any);
      
      // Should return the message
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'This is a stable API'
      });
      
      // Call the experimental API route with user not allowed
      const result1 = await apiGateway.getRouteHandler('/experimental-api', 'GET')({
        headers: { 'user-id': 'user1' }
      }, mockRes as any);
      
      // Should be blocked by middleware
      expect(result1).toEqual({
        error: 'Feature not enabled',
        status: 403
      });
      
      // Enable the feature flag for a specific user
      await featureFlagManager.updateFlag('experimental-api', {
        rules: [
          {
            condition: { userId: 'user2' },
            value: true
          }
        ]
      });
      
      // Call the experimental API route with allowed user
      await apiGateway.getRouteHandler('/experimental-api', 'GET')({
        headers: { 'user-id': 'user2' }
      }, mockRes as any);
      
      // Should return the message
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'This is an experimental API'
      });
    });
  });
  
  describe('Feature Flags, A/B Testing and Roll-out Timeline Integration', () => {
    test('should use roll-out timeline to manage feature flag and A/B test deployment', async () => {
      // Create a deployment timeline
      const timeline = new Timeline(
        'Feature Rollout',
        '1.0.0',
        {
          description: 'Rollout plan for new features',
          createdBy: 'Release Manager'
        }
      );
      
      // Add stages
      const betaStage = timeline.addStage({
        name: 'Beta Release',
        description: 'Release to beta users',
        priority: PriorityLevel.HIGH,
        plannedStart: new Date('2025-06-01'),
        plannedEnd: new Date('2025-06-15'),
        owner: 'Product Manager'
      });
      
      const generalReleaseStage = timeline.addStage({
        name: 'General Release',
        description: 'Release to all users',
        priority: PriorityLevel.CRITICAL,
        plannedStart: new Date('2025-06-16'),
        plannedEnd: new Date('2025-06-17'),
        owner: 'Release Manager'
      });
      
      // Add milestones
      const betaFeedbackComplete = timeline.addMilestone({
        name: 'Beta Feedback Complete',
        description: 'All beta feedback collected and analyzed',
        priority: PriorityLevel.HIGH,
        plannedStart: new Date('2025-06-15'),
        owner: 'Product Manager',
        critical: true
      });
      
      // Add dependencies
      timeline.addDependency(generalReleaseStage.id, betaStage.id, DependencyType.COMPLETION);
      timeline.addDependency(generalReleaseStage.id, betaFeedbackComplete.id, DependencyType.COMPLETION);
      
      // Add feature flags to the beta stage
      betaStage.addFeatureFlag('new-ui', true, { percentage: 30, segments: ['beta-users'] });
      betaStage.addFeatureFlag('advanced-search', true, { percentage: 20 });
      
      // Add feature flags to the general release stage
      generalReleaseStage.addFeatureFlag('new-ui', true, { percentage: 100 });
      generalReleaseStage.addFeatureFlag('advanced-search', true, { percentage: 100 });
      
      // Save the timeline
      await timelineRepository.saveTimeline(timeline);
      
      // Create the feature flags in the feature flag manager
      await featureFlagManager.registerFlag({
        name: 'new-ui',
        description: 'Enable the new UI',
        enabled: false,
        defaultValue: false
      });
      
      await featureFlagManager.registerFlag({
        name: 'advanced-search',
        description: 'Enable advanced search features',
        enabled: false,
        defaultValue: false
      });
      
      // Create an A/B test for the new UI
      const experiment = await abTestManager.createExperiment(
        'New UI Beta Test',
        'Test the new UI with beta users',
        [
          { id: 'control', name: 'Current UI', isControl: true, weight: 70, config: { useNewUI: false } },
          { id: 'treatment', name: 'New UI', isControl: false, weight: 30, config: { useNewUI: true } }
        ],
        ['page_view', 'click', 'conversion'],
        {
          assignmentStrategy: VariantAssignmentStrategy.STICKY,
          trafficAllocation: 0.3, // 30% of users
          targetSegments: ['beta-users']
        }
      );
      
      // Mock function to update feature flags based on timeline
      const deployStage = async (stage: Stage) => {
        // Update feature flags based on stage configuration
        if (stage.featureFlags) {
          for (const flagConfig of stage.featureFlags) {
            // Update the feature flag
            await featureFlagManager.updateFlag(flagConfig.name, {
              enabled: flagConfig.enabled,
              defaultValue: flagConfig.enabled,
              percentage: flagConfig.percentage,
              segments: flagConfig.segments
            });
            
            // If this is the beta stage, also start A/B test
            if (stage.name === 'Beta Release' && flagConfig.name === 'new-ui') {
              await abTestManager.startExperiment(experiment.id);
            }
            
            // If this is the general release stage, end A/B test
            if (stage.name === 'General Release' && flagConfig.name === 'new-ui') {
              await abTestManager.completeExperiment(experiment.id);
            }
          }
        }
      };
      
      // Start the timeline
      timeline.start();
      
      // Start and complete the beta stage
      timeline.startStage(betaStage.id);
      await deployStage(betaStage);
      
      // Check that the feature flags are configured correctly for beta
      const newUiBeta = await featureFlagManager.getFlag('new-ui');
      expect(newUiBeta.enabled).toBe(true);
      expect(newUiBeta.percentage).toBe(30);
      expect(newUiBeta.segments).toContain('beta-users');
      
      // Check that the A/B test is running
      const experimentStatus = await abTestManager.getExperimentStatus(experiment.id);
      expect(experimentStatus).toBe(ExperimentStatus.RUNNING);
      
      // Complete the beta stage
      timeline.completeStage(betaStage.id);
      timeline.reachMilestone(betaFeedbackComplete.id);
      
      // Start and complete the general release stage
      timeline.startStage(generalReleaseStage.id);
      await deployStage(generalReleaseStage);
      
      // Check that the feature flags are configured correctly for general release
      const newUiGeneral = await featureFlagManager.getFlag('new-ui');
      expect(newUiGeneral.enabled).toBe(true);
      expect(newUiGeneral.percentage).toBe(100);
      
      // Check that the A/B test is completed
      const finalExperimentStatus = await abTestManager.getExperimentStatus(experiment.id);
      expect(finalExperimentStatus).toBe(ExperimentStatus.COMPLETED);
      
      // Complete the general release stage
      timeline.completeStage(generalReleaseStage.id);
      
      // Complete the timeline
      timeline.complete();
      
      // Verify the timeline is completed
      expect(timeline.status).toBe(TimelineItemStatus.COMPLETED);
    });
  });
});