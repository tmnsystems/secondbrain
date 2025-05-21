/**
 * Feature Flag System Example
 */

import {
  FeatureFlagManagerImpl,
  InMemoryFeatureFlagProvider,
  FeatureFlagValueType,
  FeatureFlagStatus,
  ConditionOperator,
  EvaluationContext,
  FeatureFlagManagerEvents
} from '../src/feature-flags';

// Create a simple logger for the example
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// Create and initialize feature flag manager
async function initializeFeatureFlags() {
  // Create a feature flag provider
  const provider = new InMemoryFeatureFlagProvider([], logger);
  
  // Create a feature flag manager
  const manager = new FeatureFlagManagerImpl(provider, {
    logger,
    defaultContext: {
      environment: 'development'
    }
  });
  
  // Subscribe to events
  manager.on(FeatureFlagManagerEvents.INITIALIZED, () => {
    logger.info('Feature flag manager initialized');
  });
  
  manager.on(FeatureFlagManagerEvents.FLAG_CREATED, (flag) => {
    logger.info(`Flag created: ${flag.id} (${flag.name})`);
  });
  
  manager.on(FeatureFlagManagerEvents.FLAG_EVALUATED, (flagId, result, context) => {
    logger.info(`Flag evaluated: ${flagId} = ${result.value} (${result.source})`);
  });
  
  manager.onEvent((event) => {
    logger.debug(`Event: ${event.type} for flag ${event.flagId}`);
  });
  
  // Initialize the manager
  await manager.initialize();
  
  // Create some feature flags
  await manager.createFlag({
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Enable dark mode theme',
    valueType: FeatureFlagValueType.BOOLEAN,
    status: FeatureFlagStatus.ACTIVE,
    defaultValue: false,
    rules: [
      {
        id: 'rule-1',
        name: 'Beta users get dark mode',
        priority: 1,
        conditions: [
          {
            attribute: 'userType',
            operator: ConditionOperator.EQUALS,
            value: 'beta'
          }
        ],
        value: true
      }
    ]
  });
  
  await manager.createFlag({
    id: 'max-file-size',
    name: 'Maximum File Size',
    description: 'Maximum file size that users can upload (in MB)',
    valueType: FeatureFlagValueType.NUMBER,
    status: FeatureFlagStatus.ACTIVE,
    defaultValue: 10,
    rules: [
      {
        id: 'rule-1',
        name: 'Premium users get larger file size',
        priority: 1,
        conditions: [
          {
            attribute: 'subscription',
            operator: ConditionOperator.EQUALS,
            value: 'premium'
          }
        ],
        value: 50
      },
      {
        id: 'rule-2',
        name: 'Enterprise users get unlimited file size',
        priority: 0, // Higher priority
        conditions: [
          {
            attribute: 'subscription',
            operator: ConditionOperator.EQUALS,
            value: 'enterprise'
          }
        ],
        value: 500
      }
    ]
  });
  
  await manager.createFlag({
    id: 'welcome-message',
    name: 'Welcome Message',
    description: 'The message shown to users when they first log in',
    valueType: FeatureFlagValueType.STRING,
    status: FeatureFlagStatus.ACTIVE,
    defaultValue: 'Welcome to our app!',
    rules: [
      {
        id: 'rule-1',
        name: 'New users get special message',
        priority: 1,
        conditions: [
          {
            attribute: 'daysActive',
            operator: ConditionOperator.LESS_THAN,
            value: 7
          }
        ],
        value: 'Welcome to our app! Here are some tips to get started...'
      },
      {
        id: 'rule-2',
        name: 'Returning users get different message',
        priority: 2,
        conditions: [
          {
            attribute: 'daysActive',
            operator: ConditionOperator.GREATER_THAN_OR_EQUALS,
            value: 7
          }
        ],
        value: 'Welcome back! Here\'s what\'s new...'
      }
    ]
  });
  
  await manager.createFlag({
    id: 'new-dashboard',
    name: 'New Dashboard',
    description: 'Enable the new dashboard experience',
    valueType: FeatureFlagValueType.BOOLEAN,
    status: FeatureFlagStatus.ACTIVE,
    defaultValue: false,
    rules: [
      {
        id: 'rule-1',
        name: '50% rollout',
        priority: 1,
        conditions: [
          {
            operator: ConditionOperator.AND,
            attribute: '',
            value: null,
            conditions: [
              {
                attribute: 'environment',
                operator: ConditionOperator.EQUALS,
                value: 'production'
              },
              {
                attribute: 'userType',
                operator: ConditionOperator.NOT_EQUALS,
                value: 'legacy'
              }
            ]
          }
        ],
        value: true,
        rollout: 50 // Only 50% of users get this feature
      }
    ]
  });
  
  // Log all registered flags
  const flags = await manager.getFlags();
  logger.info(`Registered flags (${flags.length}):`);
  for (const flag of flags) {
    logger.info(`  - ${flag.id} (${flag.name}): ${flag.valueType}, default=${flag.defaultValue}`);
  }
  
  // Evaluate flags for different users
  logger.info('\nEvaluating flags for different users:');
  
  // Regular user
  const regularUser: EvaluationContext = {
    userId: 'user-123',
    userType: 'regular',
    subscription: 'free',
    daysActive: 2
  };
  
  logger.info('\nRegular User:');
  logger.info(`Dark Mode: ${await manager.isEnabled('dark-mode', regularUser)}`);
  logger.info(`Max File Size: ${await manager.getValue('max-file-size', 5, regularUser)} MB`);
  logger.info(`Welcome Message: ${await manager.getValue('welcome-message', '', regularUser)}`);
  logger.info(`New Dashboard: ${await manager.isEnabled('new-dashboard', regularUser)}`);
  
  // Beta user
  const betaUser: EvaluationContext = {
    userId: 'user-456',
    userType: 'beta',
    subscription: 'free',
    daysActive: 30
  };
  
  logger.info('\nBeta User:');
  logger.info(`Dark Mode: ${await manager.isEnabled('dark-mode', betaUser)}`);
  logger.info(`Max File Size: ${await manager.getValue('max-file-size', 5, betaUser)} MB`);
  logger.info(`Welcome Message: ${await manager.getValue('welcome-message', '', betaUser)}`);
  logger.info(`New Dashboard: ${await manager.isEnabled('new-dashboard', betaUser)}`);
  
  // Premium user
  const premiumUser: EvaluationContext = {
    userId: 'user-789',
    userType: 'regular',
    subscription: 'premium',
    daysActive: 5
  };
  
  logger.info('\nPremium User:');
  logger.info(`Dark Mode: ${await manager.isEnabled('dark-mode', premiumUser)}`);
  logger.info(`Max File Size: ${await manager.getValue('max-file-size', 5, premiumUser)} MB`);
  logger.info(`Welcome Message: ${await manager.getValue('welcome-message', '', premiumUser)}`);
  logger.info(`New Dashboard: ${await manager.isEnabled('new-dashboard', premiumUser)}`);
  
  // Enterprise user
  const enterpriseUser: EvaluationContext = {
    userId: 'user-101112',
    userType: 'regular',
    subscription: 'enterprise',
    daysActive: 60,
    environment: 'production'
  };
  
  logger.info('\nEnterprise User:');
  logger.info(`Dark Mode: ${await manager.isEnabled('dark-mode', enterpriseUser)}`);
  logger.info(`Max File Size: ${await manager.getValue('max-file-size', 5, enterpriseUser)} MB`);
  logger.info(`Welcome Message: ${await manager.getValue('welcome-message', '', enterpriseUser)}`);
  logger.info(`New Dashboard: ${await manager.isEnabled('new-dashboard', enterpriseUser)}`);
  
  // Update a flag
  logger.info('\nUpdating Dark Mode flag to be enabled by default:');
  await manager.updateFlag('dark-mode', {
    defaultValue: true
  });
  
  logger.info(`Dark Mode for Regular User: ${await manager.isEnabled('dark-mode', regularUser)}`);
  
  // Disable a flag
  logger.info('\nDisabling the New Dashboard flag:');
  await manager.updateFlagStatus('new-dashboard', FeatureFlagStatus.INACTIVE);
  
  logger.info(`New Dashboard for Enterprise User: ${await manager.isEnabled('new-dashboard', enterpriseUser)}`);
  
  // Evaluate all flags for a user
  logger.info('\nEvaluating all flags for a premium user:');
  const allResults = await manager.evaluateAll(premiumUser);
  
  for (const [flagId, result] of Object.entries(allResults)) {
    logger.info(`  - ${flagId}: ${result.value} (${result.source})`);
  }
  
  return manager;
}

// Run the example
initializeFeatureFlags().catch(error => {
  logger.error('Error running example:', error);
});