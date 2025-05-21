/**
 * Example of integrating the A/B Testing Framework with Feature Flags
 */

import { 
  ABTestingManagerImpl, 
  InMemoryExperimentRepository,
  ExperimentStatus,
  VariantAssignmentStrategy
} from '../';

import {
  FeatureFlagManagerImpl,
  InMemoryFeatureFlagProvider,
  FeatureFlag
} from '../../feature-flags';

async function runFeatureFlagIntegrationExample() {
  // Create feature flag manager
  const featureFlagProvider = new InMemoryFeatureFlagProvider();
  const featureFlagManager = new FeatureFlagManagerImpl(featureFlagProvider);

  // Create A/B testing manager
  const abTestRepository = new InMemoryExperimentRepository();
  const abTestManager = new ABTestingManagerImpl(abTestRepository);

  // Register feature flags
  await featureFlagManager.registerFlag({
    name: 'new_checkout_ui',
    description: 'New checkout UI',
    enabled: false,
    defaultValue: false
  });

  // Create an experiment
  const experiment = await abTestManager.createExperiment(
    'New Checkout UI Experiment',
    'Test the new checkout UI design',
    [
      { 
        id: 'control', 
        name: 'Current UI', 
        isControl: true, 
        weight: 50,
        config: { useNewUI: false }
      },
      { 
        id: 'treatment', 
        name: 'New UI', 
        isControl: false, 
        weight: 50,
        config: { useNewUI: true }
      }
    ],
    ['page_view', 'checkout_start', 'checkout_complete', 'checkout_time'],
    {
      assignmentStrategy: VariantAssignmentStrategy.STICKY,
      trafficAllocation: 0.5, // 50% of users
    }
  );

  console.log(`Created experiment: ${experiment.name} (${experiment.id})`);

  // Start the experiment
  await abTestManager.startExperiment(experiment.id);
  console.log(`Started experiment: ${experiment.name}`);

  // Create a function that integrates ab testing with feature flags
  async function getCheckoutUIConfig(userId: string) {
    // First, check if the user is part of the experiment
    const variant = await abTestManager.getVariantAssignment(experiment.id, userId);
    
    if (variant) {
      console.log(`User ${userId} assigned to variant: ${variant.name}`);
      // User is part of the experiment, use the variant config
      return {
        useNewUI: variant.config.useNewUI,
        source: 'experiment',
        variantName: variant.name
      };
    } else {
      console.log(`User ${userId} not in experiment, using feature flag`);
      // User is not part of the experiment, use the feature flag
      const flagValue = await featureFlagManager.getFlag('new_checkout_ui', userId);
      return {
        useNewUI: flagValue,
        source: 'feature_flag'
      };
    }
  }

  // Simulate some users accessing the checkout
  const users = ['user1', 'user2', 'user3', 'user4', 'user5'];

  for (const userId of users) {
    const config = await getCheckoutUIConfig(userId);
    console.log(`Checkout config for ${userId}:`, config);

    // Simulate some metrics
    if (config.source === 'experiment') {
      // Record view
      await abTestManager.recordMetricEvent('page_view', userId, 1);
      
      // Simulate checkout start
      await abTestManager.recordMetricEvent('checkout_start', userId, 1);
      
      // Simulate checkout time based on UI version
      const checkoutTime = config.useNewUI ? 
        Math.random() * 20 + 10 : // New UI: 10-30 seconds
        Math.random() * 40 + 20;  // Old UI: 20-60 seconds
      
      await abTestManager.recordMetricEvent('checkout_time', userId, checkoutTime);
      
      // Simulate completion rate based on UI version
      const completionRate = config.useNewUI ? 0.9 : 0.7; // New UI has higher completion rate
      
      if (Math.random() < completionRate) {
        await abTestManager.recordMetricEvent('checkout_complete', userId, 1);
        console.log(`  User ${userId} completed checkout in ${checkoutTime.toFixed(1)} seconds`);
      } else {
        console.log(`  User ${userId} abandoned checkout`);
      }
    }
  }

  // Wait a moment for events to process
  await new Promise(resolve => setTimeout(resolve, 100));

  // Analyze the experiment results
  const analysis = await abTestManager.analyzeExperiment(experiment.id);
  
  console.log('\nExperiment Analysis:');
  console.log(`Experiment: ${analysis.experimentName}`);
  console.log(`Total Users: ${analysis.totalUsers}`);
  console.log('\nVariant Results:');
  
  for (const variantAnalysis of analysis.variants) {
    console.log(`\n${variantAnalysis.variantName} (${variantAnalysis.isControl ? 'Control' : 'Treatment'}):`);
    console.log(`  Users: ${variantAnalysis.numberOfUsers}`);
    
    console.log('  Metrics:');
    for (const [metricId, metricData] of Object.entries(variantAnalysis.metrics)) {
      console.log(`    ${metricId}: Average = ${metricData.average.toFixed(2)}, Total = ${metricData.total.toFixed(2)}, Count = ${metricData.count}`);
    }
    
    if (variantAnalysis.comparisonToControl) {
      console.log('  Comparison to Control:');
      for (const [metricId, comparison] of Object.entries(variantAnalysis.comparisonToControl)) {
        console.log(`    ${metricId}: ${comparison.relativeImprovement.toFixed(2)}% improvement (p-value: ${comparison.pValue.toFixed(4)})`);
      }
    }
  }

  // Simulate ending the experiment and updating the feature flag based on the results
  const controlVariant = analysis.variants.find(v => v.isControl);
  const treatmentVariant = analysis.variants.find(v => !v.isControl);
  
  if (controlVariant && treatmentVariant && treatmentVariant.comparisonToControl) {
    // Check if the treatment significantly improved checkout time
    const checkoutTimeComparison = treatmentVariant.comparisonToControl['checkout_time'];
    
    if (checkoutTimeComparison && checkoutTimeComparison.relativeImprovement < 0 && checkoutTimeComparison.pValue < 0.05) {
      console.log('\nNew UI significantly reduces checkout time! Enabling for all users.');
      
      // Update the feature flag to enable the new UI for everyone
      await featureFlagManager.updateFlag('new_checkout_ui', {
        enabled: true,
        defaultValue: true
      });
    } else {
      console.log('\nNew UI did not significantly improve checkout time. Keeping the old UI.');
    }
  }

  // End the experiment
  await abTestManager.endExperiment(experiment.id);
  console.log(`\nEnded experiment: ${experiment.name}`);
}

// Run the feature flag integration example
runFeatureFlagIntegrationExample().catch(console.error);