import { ABTestingManagerImpl } from '../ab-test-manager';
import { InMemoryExperimentRepository } from '../repositories/memory-repository';
import { ExperimentStatus, VariantAssignmentStrategy } from '../types';

describe('ABTestingManager', () => {
  let manager: ABTestingManagerImpl;
  let repository: InMemoryExperimentRepository;
  
  beforeEach(() => {
    repository = new InMemoryExperimentRepository();
    manager = new ABTestingManagerImpl(repository);
  });
  
  const createTestExperiment = async () => {
    return manager.createExperiment(
      'Test Experiment',
      'A test experiment',
      [
        { id: 'control', name: 'Control', isControl: true, weight: 50 },
        { id: 'variant1', name: 'Variant 1', isControl: false, weight: 50 }
      ],
      ['metric1', 'metric2'],
      {
        assignmentStrategy: VariantAssignmentStrategy.RANDOM
      }
    );
  };
  
  test('should create an experiment', async () => {
    const experiment = await createTestExperiment();
    
    expect(experiment.id).toBeDefined();
    expect(experiment.name).toBe('Test Experiment');
    expect(experiment.description).toBe('A test experiment');
    expect(experiment.variants).toHaveLength(2);
    expect(experiment.variants[0].id).toBe('control');
    expect(experiment.variants[1].id).toBe('variant1');
    expect(experiment.metrics).toEqual(['metric1', 'metric2']);
    expect(experiment.status).toBe(ExperimentStatus.DRAFT);
    expect(experiment.assignmentStrategy).toBe(VariantAssignmentStrategy.RANDOM);
  });
  
  test('should get an experiment by ID', async () => {
    const created = await createTestExperiment();
    const retrieved = await manager.getExperiment(created.id);
    
    expect(retrieved).toEqual(created);
  });
  
  test('should list all experiments', async () => {
    await createTestExperiment();
    await createTestExperiment();
    
    const experiments = await manager.listExperiments();
    
    expect(experiments).toHaveLength(2);
  });
  
  test('should filter experiments by status', async () => {
    const exp1 = await createTestExperiment();
    const exp2 = await createTestExperiment();
    
    await manager.startExperiment(exp1.id);
    
    const draftExperiments = await manager.listExperiments({ status: ExperimentStatus.DRAFT });
    const runningExperiments = await manager.listExperiments({ status: ExperimentStatus.RUNNING });
    
    expect(draftExperiments).toHaveLength(1);
    expect(runningExperiments).toHaveLength(1);
    expect(draftExperiments[0].id).toBe(exp2.id);
    expect(runningExperiments[0].id).toBe(exp1.id);
  });
  
  test('should start an experiment', async () => {
    const experiment = await createTestExperiment();
    
    const started = await manager.startExperiment(experiment.id);
    
    expect(started.status).toBe(ExperimentStatus.RUNNING);
    expect(started.startDate).toBeDefined();
  });
  
  test('should pause an experiment', async () => {
    const experiment = await createTestExperiment();
    await manager.startExperiment(experiment.id);
    
    const paused = await manager.pauseExperiment(experiment.id);
    
    expect(paused.status).toBe(ExperimentStatus.PAUSED);
  });
  
  test('should end an experiment', async () => {
    const experiment = await createTestExperiment();
    await manager.startExperiment(experiment.id);
    
    const ended = await manager.endExperiment(experiment.id);
    
    expect(ended.status).toBe(ExperimentStatus.COMPLETED);
    expect(ended.endDate).toBeDefined();
  });
  
  test('should assign variants to users', async () => {
    const experiment = await createTestExperiment();
    await manager.startExperiment(experiment.id);
    
    const variant1 = await manager.getVariantAssignment(experiment.id, 'user1');
    const variant2 = await manager.getVariantAssignment(experiment.id, 'user2');
    
    expect(variant1).toBeDefined();
    expect(variant2).toBeDefined();
    expect(['control', 'variant1']).toContain(variant1!.id);
    expect(['control', 'variant1']).toContain(variant2!.id);
  });
  
  test('should maintain consistent variant assignments', async () => {
    const experiment = await createTestExperiment();
    await manager.startExperiment(experiment.id);
    
    const variant1 = await manager.getVariantAssignment(experiment.id, 'user1');
    const variant2 = await manager.getVariantAssignment(experiment.id, 'user1');
    
    expect(variant1!.id).toBe(variant2!.id);
  });
  
  test('should track metric events', async () => {
    const experiment = await createTestExperiment();
    await manager.startExperiment(experiment.id);
    
    const variant = await manager.getVariantAssignment(experiment.id, 'user1');
    
    const event = await manager.recordMetricEvent('metric1', 'user1', 5, { source: 'test' });
    
    expect(event.metricId).toBe('metric1');
    expect(event.userId).toBe('user1');
    expect(event.value).toBe(5);
    expect(event.context.source).toBe('test');
  });
  
  test('should analyze experiment results', async () => {
    const experiment = await createTestExperiment();
    await manager.startExperiment(experiment.id);
    
    // Assign users to variants
    await manager.getVariantAssignment(experiment.id, 'user1'); // Assign to some variant
    await manager.getVariantAssignment(experiment.id, 'user2'); // Assign to some variant
    await manager.getVariantAssignment(experiment.id, 'user3'); // Assign to some variant
    await manager.getVariantAssignment(experiment.id, 'user4'); // Assign to some variant
    
    // Record some metric events
    await manager.recordMetricEvent('metric1', 'user1', 5);
    await manager.recordMetricEvent('metric1', 'user2', 10);
    await manager.recordMetricEvent('metric1', 'user3', 7);
    await manager.recordMetricEvent('metric1', 'user4', 15);
    
    // Analyze the experiment
    const analysis = await manager.analyzeExperiment(experiment.id);
    
    expect(analysis.experimentId).toBe(experiment.id);
    expect(analysis.experimentName).toBe(experiment.name);
    expect(analysis.variants).toHaveLength(2);
    expect(analysis.totalUsers).toBeGreaterThan(0);
  });
  
  test('should handle user targeting conditions', async () => {
    const experiment = await manager.createExperiment(
      'Targeted Experiment',
      'An experiment with targeting',
      [
        { id: 'control', name: 'Control', isControl: true, weight: 50 },
        { id: 'variant1', name: 'Variant 1', isControl: false, weight: 50 }
      ],
      ['metric1'],
      {
        targetingConditions: { country: 'US' }
      }
    );
    
    await manager.startExperiment(experiment.id);
    
    // This user context doesn't match the targeting conditions
    const variant1 = await manager.getVariantAssignment(experiment.id, 'user1', { country: 'CA' });
    
    // This user context matches the targeting conditions
    const variant2 = await manager.getVariantAssignment(experiment.id, 'user2', { country: 'US' });
    
    expect(variant1).toBeNull(); // Should not be assigned
    expect(variant2).not.toBeNull(); // Should be assigned
  });
  
  test('should support traffic allocation', async () => {
    const experiment = await manager.createExperiment(
      'Traffic Allocation Experiment',
      'An experiment with traffic allocation',
      [
        { id: 'control', name: 'Control', isControl: true, weight: 50 },
        { id: 'variant1', name: 'Variant 1', isControl: false, weight: 50 }
      ],
      ['metric1'],
      {
        trafficAllocation: 0.5 // Only 50% of users should be included
      }
    );
    
    await manager.startExperiment(experiment.id);
    
    // Create enough assignments to validate traffic allocation
    const assignments = await Promise.all(Array.from({ length: 100 }).map((_, i) => 
      manager.getVariantAssignment(experiment.id, `user${i}`)
    ));
    
    const includedUsers = assignments.filter(a => a !== null).length;
    
    // Expect roughly 50% of users to be included
    // We allow a wide margin due to randomness in the test
    expect(includedUsers).toBeGreaterThanOrEqual(30);
    expect(includedUsers).toBeLessThanOrEqual(70);
  });
});