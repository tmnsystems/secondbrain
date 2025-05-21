/**
 * Tests for Feature Flag System
 */

import {
  InMemoryFeatureFlagProvider,
  FeatureFlagManagerImpl,
  FeatureFlag,
  FeatureFlagStatus,
  FeatureFlagValueType,
  EvaluationContext,
  EvaluationSource,
  ConditionOperator,
  FeatureFlagManagerEvents
} from '../src/feature-flags';

describe('Feature Flag System', () => {
  describe('InMemoryFeatureFlagProvider', () => {
    let provider: InMemoryFeatureFlagProvider;
    let sampleFlag: FeatureFlag;
    
    beforeEach(() => {
      provider = new InMemoryFeatureFlagProvider();
      
      // Create a sample flag
      sampleFlag = {
        id: 'test-flag',
        name: 'Test Flag',
        description: 'A test feature flag',
        valueType: FeatureFlagValueType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        rules: [
          {
            id: 'rule-1',
            name: 'Admin rule',
            priority: 1,
            conditions: [
              {
                attribute: 'role',
                operator: ConditionOperator.EQUALS,
                value: 'admin'
              }
            ],
            value: true
          }
        ]
      };
    });
    
    test('initialize', async () => {
      await provider.initialize();
      expect(provider['initialized']).toBe(true);
    });
    
    test('createFlag and getFlag', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      
      const createdFlag = await provider.createFlag(flagData);
      
      expect(createdFlag.id).toBe(sampleFlag.id);
      expect(createdFlag.name).toBe(sampleFlag.name);
      expect(createdFlag.createdAt).toBeInstanceOf(Date);
      expect(createdFlag.updatedAt).toBeInstanceOf(Date);
      
      const retrievedFlag = await provider.getFlag(sampleFlag.id);
      expect(retrievedFlag).toEqual(createdFlag);
    });
    
    test('getFlags', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await provider.createFlag(flagData);
      
      const flags = await provider.getFlags();
      expect(flags).toHaveLength(1);
      expect(flags[0].id).toBe(sampleFlag.id);
    });
    
    test('updateFlag', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      const createdFlag = await provider.createFlag(flagData);
      
      const updatedFlag = await provider.updateFlag(sampleFlag.id, {
        name: 'Updated Flag Name',
        description: 'Updated description'
      });
      
      expect(updatedFlag.id).toBe(sampleFlag.id);
      expect(updatedFlag.name).toBe('Updated Flag Name');
      expect(updatedFlag.description).toBe('Updated description');
      
      // Created date should not change
      expect(updatedFlag.createdAt).toEqual(createdFlag.createdAt);
      
      // Updated date should change
      expect(updatedFlag.updatedAt.getTime()).toBeGreaterThan(createdFlag.updatedAt.getTime());
    });
    
    test('updateFlagStatus', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await provider.createFlag(flagData);
      
      await provider.updateFlagStatus(sampleFlag.id, FeatureFlagStatus.INACTIVE);
      
      const flag = await provider.getFlag(sampleFlag.id);
      expect(flag?.status).toBe(FeatureFlagStatus.INACTIVE);
    });
    
    test('deleteFlag', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await provider.createFlag(flagData);
      
      await provider.deleteFlag(sampleFlag.id);
      
      const flag = await provider.getFlag(sampleFlag.id);
      expect(flag).toBeNull();
    });
    
    test('evaluateFlag with matching rule', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await provider.createFlag(flagData);
      
      const context: EvaluationContext = {
        userId: 'user-1',
        role: 'admin'
      };
      
      const result = await provider.evaluateFlag(sampleFlag.id, context);
      
      expect(result.flagId).toBe(sampleFlag.id);
      expect(result.enabled).toBe(true);
      expect(result.value).toBe(true);
      expect(result.source).toBe(EvaluationSource.RULE);
      expect(result.ruleId).toBe('rule-1');
    });
    
    test('evaluateFlag with non-matching rule', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await provider.createFlag(flagData);
      
      const context: EvaluationContext = {
        userId: 'user-1',
        role: 'user'
      };
      
      const result = await provider.evaluateFlag(sampleFlag.id, context);
      
      expect(result.flagId).toBe(sampleFlag.id);
      expect(result.enabled).toBe(false);
      expect(result.value).toBe(false);
      expect(result.source).toBe(EvaluationSource.DEFAULT);
      expect(result.ruleId).toBeUndefined();
    });
    
    test('evaluateFlag with inactive flag', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      const flag = await provider.createFlag(flagData);
      
      await provider.updateFlagStatus(flag.id, FeatureFlagStatus.INACTIVE);
      
      const context: EvaluationContext = {
        userId: 'user-1',
        role: 'admin'
      };
      
      const result = await provider.evaluateFlag(flag.id, context);
      
      expect(result.flagId).toBe(flag.id);
      expect(result.enabled).toBe(false);
      expect(result.value).toBe(false);
      expect(result.source).toBe(EvaluationSource.DEFAULT);
    });
    
    test('evaluateFlag with non-existent flag', async () => {
      const result = await provider.evaluateFlag('non-existent-flag', {});
      
      expect(result.flagId).toBe('non-existent-flag');
      expect(result.enabled).toBe(false);
      expect(result.value).toBeNull();
      expect(result.source).toBe(EvaluationSource.ERROR);
      expect(result.error).toBeDefined();
    });
    
    test('evaluateAllFlags', async () => {
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await provider.createFlag(flagData);
      
      // Create a second flag
      await provider.createFlag({
        ...flagData,
        id: 'test-flag-2',
        name: 'Test Flag 2',
        defaultValue: true
      });
      
      const context: EvaluationContext = {
        userId: 'user-1',
        role: 'admin'
      };
      
      const results = await provider.evaluateAllFlags(context);
      
      expect(Object.keys(results)).toHaveLength(2);
      expect(results['test-flag'].enabled).toBe(true);
      expect(results['test-flag-2'].enabled).toBe(true);
    });
    
    test('complex rule conditions', async () => {
      // Create a flag with complex nested conditions
      const complexFlag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Complex Flag',
        description: 'A flag with complex conditions',
        valueType: FeatureFlagValueType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: false,
        rules: [
          {
            id: 'rule-complex',
            name: 'Complex rule',
            priority: 1,
            conditions: [
              {
                operator: ConditionOperator.AND,
                attribute: '', // Not used for AND/OR
                value: null, // Not used for AND/OR
                conditions: [
                  {
                    attribute: 'role',
                    operator: ConditionOperator.EQUALS,
                    value: 'admin'
                  },
                  {
                    attribute: 'country',
                    operator: ConditionOperator.IN,
                    value: ['US', 'CA', 'UK']
                  },
                  {
                    operator: ConditionOperator.OR,
                    attribute: '', // Not used for AND/OR
                    value: null, // Not used for AND/OR
                    conditions: [
                      {
                        attribute: 'betaUser',
                        operator: ConditionOperator.EQUALS,
                        value: true
                      },
                      {
                        attribute: 'userGroup',
                        operator: ConditionOperator.EQUALS,
                        value: 'early-adopter'
                      }
                    ]
                  }
                ]
              }
            ],
            value: true
          }
        ]
      };
      
      await provider.createFlag({
        ...complexFlag,
        id: 'complex-flag'
      });
      
      // Test with context that matches all conditions
      const matchingContext: EvaluationContext = {
        userId: 'user-1',
        role: 'admin',
        country: 'US',
        betaUser: true,
        userGroup: 'regular'
      };
      
      const matchingResult = await provider.evaluateFlag('complex-flag', matchingContext);
      expect(matchingResult.enabled).toBe(true);
      
      // Test with context that doesn't match all conditions
      const nonMatchingContext: EvaluationContext = {
        userId: 'user-1',
        role: 'admin',
        country: 'FR', // Not in the allowed countries
        betaUser: false,
        userGroup: 'regular'
      };
      
      const nonMatchingResult = await provider.evaluateFlag('complex-flag', nonMatchingContext);
      expect(nonMatchingResult.enabled).toBe(false);
    });
    
    test('tracking events', async () => {
      const eventListener = jest.fn();
      provider.onEvent(eventListener);
      
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await provider.createFlag(flagData);
      
      const context: EvaluationContext = {
        userId: 'user-1',
        role: 'admin'
      };
      
      await provider.evaluateFlag(sampleFlag.id, context);
      
      expect(eventListener).toHaveBeenCalled();
      const event = eventListener.mock.calls[0][0];
      expect(event.type).toBe('evaluation');
      expect(event.flagId).toBe(sampleFlag.id);
    });
  });
  
  describe('FeatureFlagManager', () => {
    let provider: InMemoryFeatureFlagProvider;
    let manager: FeatureFlagManagerImpl;
    let sampleFlag: FeatureFlag;
    
    beforeEach(async () => {
      provider = new InMemoryFeatureFlagProvider();
      manager = new FeatureFlagManagerImpl(provider);
      
      // Create a sample flag
      sampleFlag = {
        id: 'test-flag',
        name: 'Test Flag',
        description: 'A test feature flag',
        valueType: FeatureFlagValueType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        rules: [
          {
            id: 'rule-1',
            name: 'Admin rule',
            priority: 1,
            conditions: [
              {
                attribute: 'role',
                operator: ConditionOperator.EQUALS,
                value: 'admin'
              }
            ],
            value: true
          }
        ]
      };
      
      // Initialize
      await manager.initialize();
      
      // Create the sample flag
      const { id, createdAt, updatedAt, ...flagData } = sampleFlag;
      await manager.createFlag(flagData);
    });
    
    test('initialize', async () => {
      // Create a new manager
      const newManager = new FeatureFlagManagerImpl(provider);
      
      const initListener = jest.fn();
      newManager.on(FeatureFlagManagerEvents.INITIALIZED, initListener);
      
      await newManager.initialize();
      
      expect(initListener).toHaveBeenCalled();
      expect(newManager['initialized']).toBe(true);
    });
    
    test('getProvider', () => {
      expect(manager.getProvider()).toBe(provider);
    });
    
    test('setProvider', () => {
      const newProvider = new InMemoryFeatureFlagProvider();
      manager.setProvider(newProvider);
      
      expect(manager.getProvider()).toBe(newProvider);
      expect(manager['initialized']).toBe(false);
    });
    
    test('getFlags', async () => {
      const flags = await manager.getFlags();
      expect(flags).toHaveLength(1);
      expect(flags[0].id).toBe(sampleFlag.id);
    });
    
    test('getFlag', async () => {
      const flag = await manager.getFlag(sampleFlag.id);
      expect(flag).toBeDefined();
      expect(flag?.id).toBe(sampleFlag.id);
    });
    
    test('isEnabled with default context', async () => {
      // Should return false with default context
      expect(await manager.isEnabled(sampleFlag.id)).toBe(false);
      
      // Set default context
      manager.setDefaultContext({ role: 'admin' });
      
      // Should now return true with the default context
      expect(await manager.isEnabled(sampleFlag.id)).toBe(true);
    });
    
    test('isEnabled with provided context', async () => {
      // Should return true with admin context
      expect(await manager.isEnabled(sampleFlag.id, { role: 'admin' })).toBe(true);
      
      // Should return false with user context
      expect(await manager.isEnabled(sampleFlag.id, { role: 'user' })).toBe(false);
    });
    
    test('getValue with default', async () => {
      // Should return custom default for non-existent flag
      expect(await manager.getValue('non-existent', 'default-value', {})).toBe('default-value');
      
      // Should return flag value for existing flag
      expect(await manager.getValue(sampleFlag.id, 'default-value', { role: 'admin' })).toBe(true);
    });
    
    test('evaluate', async () => {
      const result = await manager.evaluate(sampleFlag.id, { role: 'admin' });
      
      expect(result.flagId).toBe(sampleFlag.id);
      expect(result.enabled).toBe(true);
      expect(result.value).toBe(true);
      expect(result.source).toBe(EvaluationSource.RULE);
    });
    
    test('evaluateAll', async () => {
      // Create a second flag
      await manager.createFlag({
        id: 'test-flag-2',
        name: 'Test Flag 2',
        description: 'Another test feature flag',
        valueType: FeatureFlagValueType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: true
      });
      
      const results = await manager.evaluateAll({ role: 'admin' });
      
      expect(Object.keys(results)).toHaveLength(2);
      expect(results['test-flag'].enabled).toBe(true);
      expect(results['test-flag-2'].enabled).toBe(true);
    });
    
    test('createFlag', async () => {
      const newFlag = await manager.createFlag({
        id: 'new-flag',
        name: 'New Flag',
        description: 'A new feature flag',
        valueType: FeatureFlagValueType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: true
      });
      
      expect(newFlag.id).toBe('new-flag');
      expect(newFlag.name).toBe('New Flag');
      
      // Verify it was created in the provider
      const flag = await provider.getFlag('new-flag');
      expect(flag).toBeDefined();
    });
    
    test('updateFlag', async () => {
      const updatedFlag = await manager.updateFlag(sampleFlag.id, {
        name: 'Updated Flag',
        description: 'Updated description'
      });
      
      expect(updatedFlag.id).toBe(sampleFlag.id);
      expect(updatedFlag.name).toBe('Updated Flag');
      expect(updatedFlag.description).toBe('Updated description');
      
      // Verify it was updated in the provider
      const flag = await provider.getFlag(sampleFlag.id);
      expect(flag?.name).toBe('Updated Flag');
    });
    
    test('updateFlagStatus', async () => {
      await manager.updateFlagStatus(sampleFlag.id, FeatureFlagStatus.INACTIVE);
      
      // Verify it was updated in the provider
      const flag = await provider.getFlag(sampleFlag.id);
      expect(flag?.status).toBe(FeatureFlagStatus.INACTIVE);
    });
    
    test('deleteFlag', async () => {
      await manager.deleteFlag(sampleFlag.id);
      
      // Verify it was deleted in the provider
      const flag = await provider.getFlag(sampleFlag.id);
      expect(flag).toBeNull();
    });
    
    test('events', async () => {
      const flagEventListener = jest.fn();
      const flagEvaluatedListener = jest.fn();
      
      manager.onEvent(flagEventListener);
      manager.on(FeatureFlagManagerEvents.FLAG_EVALUATED, flagEvaluatedListener);
      
      await manager.evaluate(sampleFlag.id, { role: 'admin' });
      
      expect(flagEventListener).toHaveBeenCalled();
      expect(flagEvaluatedListener).toHaveBeenCalled();
      
      // Check flag event
      const event = flagEventListener.mock.calls[0][0];
      expect(event.flagId).toBe(sampleFlag.id);
      expect(event.type).toBe('evaluation');
      
      // Check flag evaluated event
      const evaluatedArgs = flagEvaluatedListener.mock.calls[0];
      expect(evaluatedArgs[0]).toBe(sampleFlag.id);
      expect(evaluatedArgs[1].enabled).toBe(true);
    });
  });
});