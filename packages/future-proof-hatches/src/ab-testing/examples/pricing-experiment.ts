/**
 * Example of using the A/B Testing Framework for a pricing experiment
 */

import { 
  ABTestingManagerImpl, 
  InMemoryExperimentRepository,
  ExperimentStatus,
  VariantAssignmentStrategy,
  MetricType
} from '../';

async function runPricingExperiment() {
  // Create a repository and A/B testing manager
  const repository = new InMemoryExperimentRepository();
  const abTestManager = new ABTestingManagerImpl(repository);

  // Create an experiment to test different pricing tiers
  const experiment = await abTestManager.createExperiment(
    'Pricing Tier Experiment',
    'Test different pricing tiers for the subscription plan',
    [
      { 
        id: 'control', 
        name: 'Current Price', 
        isControl: true, 
        weight: 33,
        config: { price: 19.99, planName: 'Standard Plan' }
      },
      { 
        id: 'variant1', 
        name: 'Lower Price', 
        isControl: false, 
        weight: 33,
        config: { price: 14.99, planName: 'Special Offer' }
      },
      { 
        id: 'variant2', 
        name: 'Higher Price with Benefits', 
        isControl: false, 
        weight: 33,
        config: { price: 24.99, planName: 'Premium Plan' }
      }
    ],
    ['subscription_view', 'subscription_click', 'subscription_purchase', 'revenue'],
    {
      assignmentStrategy: VariantAssignmentStrategy.STICKY,
      trafficAllocation: 1.0, // 100% of users
      targetingConditions: { isLoggedIn: true } // Only show to logged-in users
    }
  );

  console.log(`Created experiment: ${experiment.name} (${experiment.id})`);

  // Start the experiment
  await abTestManager.startExperiment(experiment.id);
  console.log(`Started experiment: ${experiment.name}`);

  // Simulate users interacting with the pricing page
  const users = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'];

  for (const userId of users) {
    // Get the variant for this user
    const userContext = { isLoggedIn: true, country: 'US' };
    const variant = await abTestManager.getVariantAssignment(experiment.id, userId, userContext);

    if (!variant) {
      console.log(`User ${userId} not assigned to experiment`);
      continue;
    }

    console.log(`User ${userId} assigned to variant: ${variant.name}`);
    console.log(`  Price: $${variant.config.price} (${variant.config.planName})`);

    // Simulate user viewing the subscription page
    await abTestManager.recordMetricEvent('subscription_view', userId, 1);

    // Simulate user clicking on the subscription button (70% probability)
    if (Math.random() < 0.7) {
      await abTestManager.recordMetricEvent('subscription_click', userId, 1);
      
      // Simulate purchase behavior based on price point
      // Lower price = higher conversion, higher price = lower conversion
      let purchaseProbability = 0;
      
      if (variant.id === 'control') { // $19.99
        purchaseProbability = 0.3;
      } else if (variant.id === 'variant1') { // $14.99
        purchaseProbability = 0.5; // More likely to purchase at lower price
      } else if (variant.id === 'variant2') { // $24.99
        purchaseProbability = 0.2; // Less likely to purchase at higher price
      }
      
      // Simulate purchase
      if (Math.random() < purchaseProbability) {
        await abTestManager.recordMetricEvent('subscription_purchase', userId, 1);
        
        // Record revenue
        const price = variant.config.price;
        await abTestManager.recordMetricEvent('revenue', userId, price);
        
        console.log(`  User ${userId} purchased at $${price}!`);
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

  // End the experiment
  await abTestManager.endExperiment(experiment.id);
  console.log(`\nEnded experiment: ${experiment.name}`);
}

// Run the pricing experiment
runPricingExperiment().catch(console.error);