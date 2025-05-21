# Feature Flag System

The Feature Flag System provides a robust and flexible framework for enabling or disabling features at runtime, allowing for controlled rollouts, A/B testing, and feature targeting based on user segments or other criteria.

## Key Components

### FeatureFlagManager

The FeatureFlagManager is the central component of the system. It manages feature flags, evaluates their values for specific contexts, and provides a unified API for feature flag operations.

```typescript
// Create a feature flag manager
import { FeatureFlagManagerImpl, InMemoryFeatureFlagProvider } from '@secondbrain/future-proof-hatches';

// Create an in-memory provider
const provider = new InMemoryFeatureFlagProvider();

// Create a manager with default context
const manager = new FeatureFlagManagerImpl(provider, {
  defaultContext: {
    environment: 'development'
  }
});

// Initialize the manager
await manager.initialize();

// Check if a feature is enabled
const isEnabled = await manager.isEnabled('my-feature', {
  userId: 'user-123',
  role: 'admin'
});

// Get a feature value
const maxFileSize = await manager.getValue('max-file-size', 10, {
  userId: 'user-123',
  subscription: 'premium'
});
```

### FeatureFlagProvider

The FeatureFlagProvider is responsible for storing, retrieving, and evaluating feature flags. Multiple provider implementations are available for different storage backends.

```typescript
// In-memory provider (default)
const inMemoryProvider = new InMemoryFeatureFlagProvider();

// Redis provider
import Redis from 'ioredis';
const redisClient = new Redis('redis://localhost:6379');
const redisProvider = new RedisFeatureFlagProvider(redisClient);

// Switch providers
manager.setProvider(redisProvider);
```

## Feature Flag Definition

Feature flags are defined with rich metadata, targeting rules, and default values:

```typescript
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
```

## Flag Value Types

The system supports multiple flag value types:

- **Boolean**: Simple on/off toggles
- **String**: Text values that can be different for different users
- **Number**: Numeric values for configurable limits, thresholds, etc.
- **JSON**: Complex structured data for advanced configurations

## Targeting Rules

Targeting rules determine when a specific flag value should be applied. Rules are evaluated in order of priority (lower number = higher priority):

```typescript
// Rule with simple condition
const simpleRule = {
  id: 'rule-1',
  name: 'Premium users',
  priority: 1,
  conditions: [
    {
      attribute: 'subscription',
      operator: ConditionOperator.EQUALS,
      value: 'premium'
    }
  ],
  value: true
};

// Rule with complex nested conditions
const complexRule = {
  id: 'rule-2',
  name: 'Beta users in US',
  priority: 0, // Higher priority
  conditions: [
    {
      operator: ConditionOperator.AND,
      attribute: '', // Not used for AND/OR
      value: null, // Not used for AND/OR
      conditions: [
        {
          attribute: 'userType',
          operator: ConditionOperator.EQUALS,
          value: 'beta'
        },
        {
          attribute: 'country',
          operator: ConditionOperator.EQUALS,
          value: 'US'
        }
      ]
    }
  ],
  value: true
};
```

## Gradual Rollouts

The system supports gradual rollouts with the `rollout` property on rules:

```typescript
// 50% rollout rule
const rolloutRule = {
  id: 'rule-1',
  name: '50% rollout',
  priority: 1,
  conditions: [
    {
      attribute: 'environment',
      operator: ConditionOperator.EQUALS,
      value: 'production'
    }
  ],
  value: true,
  rollout: 50 // Only 50% of users get this feature
};
```

The user assignment for rollouts is deterministic based on the user ID and flag ID, ensuring consistent experiences for individual users.

## Evaluation Context

The evaluation context contains user information and other attributes used to evaluate targeting rules:

```typescript
const context = {
  userId: 'user-123',
  sessionId: 'session-456',
  environment: 'production',
  userType: 'regular',
  subscription: 'premium',
  country: 'US',
  device: 'mobile',
  // Any other attributes...
};

const isEnabled = await manager.isEnabled('my-feature', context);
```

## Default Context

You can set a default context that will be used for all evaluations:

```typescript
manager.setDefaultContext({
  environment: 'development',
  companyId: 'company-123'
});

// This will use the default context
const isEnabled = await manager.isEnabled('my-feature');

// This will merge with the default context
const isEnabledForUser = await manager.isEnabled('my-feature', {
  userId: 'user-123',
  role: 'admin'
});
```

## Event Handling

The system emits events for various operations:

```typescript
// Subscribe to specific events
manager.on(FeatureFlagManagerEvents.FLAG_EVALUATED, (flagId, result, context) => {
  console.log(`Flag ${flagId} evaluated: ${result.value} (${result.source})`);
});

manager.on(FeatureFlagManagerEvents.FLAG_CREATED, (flag) => {
  console.log(`Flag created: ${flag.id} (${flag.name})`);
});

// Subscribe to all flag events
manager.onEvent((event) => {
  console.log(`Event: ${event.type} for flag ${event.flagId}`);
});
```

## Flag Management

The system provides APIs for managing feature flags:

```typescript
// Create a flag
const newFlag = await manager.createFlag({
  id: 'my-feature',
  name: 'My Feature',
  description: 'A test feature',
  valueType: FeatureFlagValueType.BOOLEAN,
  status: FeatureFlagStatus.ACTIVE,
  defaultValue: false
});

// Update a flag
await manager.updateFlag('my-feature', {
  name: 'Updated Feature Name',
  description: 'Updated description',
  defaultValue: true
});

// Update flag status
await manager.updateFlagStatus('my-feature', FeatureFlagStatus.INACTIVE);

// Delete a flag
await manager.deleteFlag('my-feature');
```

## Use Cases

### Feature Toggles

Use feature flags as toggles to enable or disable features:

```typescript
if (await manager.isEnabled('dark-mode', userContext)) {
  // Enable dark mode
  applyDarkTheme();
} else {
  // Use light mode
  applyLightTheme();
}
```

### Configuration Values

Use feature flags for configuration values that can be changed at runtime:

```typescript
const maxFileSize = await manager.getValue('max-file-size', 10, userContext);
const welcomeMessage = await manager.getValue('welcome-message', 'Welcome!', userContext);

console.log(`Maximum file size: ${maxFileSize} MB`);
displayMessage(welcomeMessage);
```

### Gradual Rollouts

Use the rollout property to gradually release features to users:

```typescript
// Create a flag with gradual rollout
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
      name: 'Day 1: 10% rollout',
      priority: 1,
      conditions: [],
      value: true,
      rollout: 10 // Start with 10% of users
    }
  ]
});

// Later, update the rollout to 25%
await manager.updateFlag('new-dashboard', {
  rules: [
    {
      id: 'rule-1',
      name: 'Day 2: 25% rollout',
      priority: 1,
      conditions: [],
      value: true,
      rollout: 25 // Increase to 25% of users
    }
  ]
});

// Finally, enable for all users
await manager.updateFlag('new-dashboard', {
  defaultValue: true
});
```

### User Segmentation

Use targeting rules to segment users and provide different experiences:

```typescript
// Create a flag with user segmentation
await manager.createFlag({
  id: 'homepage-variant',
  name: 'Homepage Variant',
  description: 'Which homepage variant to show',
  valueType: FeatureFlagValueType.STRING,
  status: FeatureFlagStatus.ACTIVE,
  defaultValue: 'control',
  rules: [
    {
      id: 'rule-1',
      name: 'New users see variant-a',
      priority: 1,
      conditions: [
        {
          attribute: 'daysActive',
          operator: ConditionOperator.LESS_THAN,
          value: 7
        }
      ],
      value: 'variant-a'
    },
    {
      id: 'rule-2',
      name: 'Power users see variant-b',
      priority: 1,
      conditions: [
        {
          attribute: 'userType',
          operator: ConditionOperator.EQUALS,
          value: 'power'
        }
      ],
      value: 'variant-b'
    }
  ]
});

// Use the flag value
const variant = await manager.getValue('homepage-variant', 'control', userContext);
showHomepage(variant);
```

### Feature Dependencies

Use feature flags to manage dependencies between features:

```typescript
// Create a flag for a base feature
await manager.createFlag({
  id: 'new-editor',
  name: 'New Editor',
  description: 'Enable the new editor',
  valueType: FeatureFlagValueType.BOOLEAN,
  status: FeatureFlagStatus.ACTIVE,
  defaultValue: false
});

// Create a flag for a dependent feature
await manager.createFlag({
  id: 'new-editor-highlighting',
  name: 'New Editor Syntax Highlighting',
  description: 'Enable syntax highlighting in the new editor',
  valueType: FeatureFlagValueType.BOOLEAN,
  status: FeatureFlagStatus.ACTIVE,
  defaultValue: false,
  rules: [
    {
      id: 'rule-1',
      name: 'Only enable if new editor is enabled',
      priority: 1,
      conditions: [
        {
          // This requires the code to provide the base feature's value in the context
          attribute: 'features.new-editor',
          operator: ConditionOperator.EQUALS,
          value: true
        }
      ],
      value: true
    }
  ]
});

// In your application code
const isNewEditorEnabled = await manager.isEnabled('new-editor', userContext);

// Add the base feature's value to the context for the dependent feature
const enhancedContext = {
  ...userContext,
  features: {
    'new-editor': isNewEditorEnabled
  }
};

const isHighlightingEnabled = await manager.isEnabled('new-editor-highlighting', enhancedContext);
```

## Best Practices

1. **Use Meaningful IDs**: Choose descriptive IDs for your feature flags that reflect their purpose.

2. **Provide Default Values**: Always specify a sensible default value for when no targeting rules match.

3. **Use Targeting Rules Carefully**: Design your targeting rules to be simple, specific, and maintainable.

4. **Set Rule Priorities**: Use rule priorities to ensure the right rule is evaluated first when multiple might match.

5. **Clean Up Unused Flags**: Archive or delete feature flags that are no longer needed to keep your system clean.

6. **Document Your Flags**: Use the name and description fields to clearly document the purpose and behavior of each flag.

7. **Monitor Flag Usage**: Subscribe to flag events to monitor and log how your flags are being used.

8. **Implement Gradual Rollouts**: Use the rollout property to gradually release new features to users.

9. **Set Default Context**: Use the default context to provide environment-specific values that apply to all evaluations.

10. **Handle Errors Gracefully**: Always provide a default value when getting flag values to handle errors gracefully.

## API Reference

For detailed API documentation, please refer to the TypeScript definitions in the `types.ts` file.