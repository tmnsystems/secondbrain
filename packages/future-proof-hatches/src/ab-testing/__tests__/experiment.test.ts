import { ExperimentImpl } from '../experiment';
import { ExperimentStatus, VariantAssignmentStrategy } from '../types';

describe('Experiment class', () => {
  const createTestExperiment = () => {
    return new ExperimentImpl(
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

  test('should create a valid experiment', () => {
    const experiment = createTestExperiment();
    
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

  test('should start an experiment', () => {
    const experiment = createTestExperiment();
    
    const started = experiment.start();
    
    expect(started.status).toBe(ExperimentStatus.RUNNING);
    expect(started.startDate).toBeDefined();
  });

  test('should not start an already running experiment', () => {
    const experiment = createTestExperiment();
    experiment.start();
    
    expect(() => experiment.start()).toThrow('Cannot start experiment that is not in DRAFT or PAUSED status');
  });

  test('should pause a running experiment', () => {
    const experiment = createTestExperiment();
    experiment.start();
    
    const paused = experiment.pause();
    
    expect(paused.status).toBe(ExperimentStatus.PAUSED);
  });

  test('should not pause an experiment that is not running', () => {
    const experiment = createTestExperiment();
    
    expect(() => experiment.pause()).toThrow('Cannot pause experiment that is not in RUNNING status');
  });

  test('should resume a paused experiment', () => {
    const experiment = createTestExperiment();
    experiment.start();
    experiment.pause();
    
    const resumed = experiment.resume();
    
    expect(resumed.status).toBe(ExperimentStatus.RUNNING);
  });

  test('should not resume an experiment that is not paused', () => {
    const experiment = createTestExperiment();
    
    expect(() => experiment.resume()).toThrow('Cannot resume experiment that is not in PAUSED status');
  });

  test('should end a running experiment', () => {
    const experiment = createTestExperiment();
    experiment.start();
    
    const ended = experiment.end();
    
    expect(ended.status).toBe(ExperimentStatus.COMPLETED);
    expect(ended.endDate).toBeDefined();
  });

  test('should end a paused experiment', () => {
    const experiment = createTestExperiment();
    experiment.start();
    experiment.pause();
    
    const ended = experiment.end();
    
    expect(ended.status).toBe(ExperimentStatus.COMPLETED);
    expect(ended.endDate).toBeDefined();
  });

  test('should not end an experiment that is not running or paused', () => {
    const experiment = createTestExperiment();
    
    expect(() => experiment.end()).toThrow('Cannot end experiment that is not in RUNNING or PAUSED status');
  });

  test('should archive a completed experiment', () => {
    const experiment = createTestExperiment();
    experiment.start();
    experiment.end();
    
    const archived = experiment.archive();
    
    expect(archived.status).toBe(ExperimentStatus.ARCHIVED);
  });

  test('should not archive an experiment that is not completed', () => {
    const experiment = createTestExperiment();
    
    expect(() => experiment.archive()).toThrow('Cannot archive experiment that is not in COMPLETED status');
  });

  test('should handle custom variants', () => {
    const experiment = new ExperimentImpl(
      'Test Experiment',
      'A test experiment',
      [
        { id: 'control', name: 'Control', isControl: true, weight: 33 },
        { id: 'variant1', name: 'Variant 1', isControl: false, weight: 33 },
        { id: 'variant2', name: 'Variant 2', isControl: false, weight: 33 }
      ],
      ['metric1']
    );
    
    expect(experiment.variants).toHaveLength(3);
    expect(experiment.variants[0].id).toBe('control');
    expect(experiment.variants[1].id).toBe('variant1');
    expect(experiment.variants[2].id).toBe('variant2');
  });

  test('should validate experiment configuration', () => {
    expect(() => {
      new ExperimentImpl('', 'Description', [], ['metric1']);
    }).toThrow('Experiment name is required');

    expect(() => {
      new ExperimentImpl('Name', '', [], ['metric1']);
    }).toThrow('Experiment description is required');

    expect(() => {
      new ExperimentImpl('Name', 'Description', [], ['metric1']);
    }).toThrow('At least one variant is required');

    expect(() => {
      new ExperimentImpl('Name', 'Description', [{ id: 'variant1', name: 'Variant 1', isControl: false, weight: 100 }], ['metric1']);
    }).toThrow('At least one control variant is required');

    expect(() => {
      new ExperimentImpl('Name', 'Description', [{ id: 'control', name: 'Control', isControl: true, weight: 100 }], []);
    }).toThrow('At least one metric is required');
  });
});