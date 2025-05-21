/**
 * Tests for Timeline functionality
 */

import { Timeline } from '../timeline';
import { Stage } from '../stage';
import { Milestone } from '../milestone';
import { 
  TimelineItemStatus, 
  TimelineItemPriority,
  DependencyType
} from '../types';

describe('Timeline', () => {
  let timeline: Timeline;

  beforeEach(() => {
    timeline = new Timeline({
      name: 'Test Timeline',
      description: 'Timeline for testing',
      version: '1.0.0',
      createdBy: 'tester'
    });
  });

  test('should create a new Timeline with correct default values', () => {
    expect(timeline.id).toBeDefined();
    expect(timeline.name).toBe('Test Timeline');
    expect(timeline.description).toBe('Timeline for testing');
    expect(timeline.status).toBe(TimelineItemStatus.PENDING);
    expect(timeline.version).toBe('1.0.0');
    expect(timeline.createdAt).toBeInstanceOf(Date);
    expect(timeline.updatedAt).toBeInstanceOf(Date);
    expect(timeline.createdBy).toBe('tester');
    expect(timeline.stages).toEqual([]);
    expect(timeline.milestones).toEqual([]);
  });

  test('should add a stage', () => {
    const stage = new Stage({
      name: 'Test Stage',
      description: 'Stage for testing'
    });

    timeline.addStage(stage);

    expect(timeline.stages).toHaveLength(1);
    expect(timeline.stages[0]).toBe(stage);
  });

  test('should add a milestone', () => {
    const milestone = new Milestone({
      name: 'Test Milestone',
      description: 'Milestone for testing'
    });

    timeline.addMilestone(milestone);

    expect(timeline.milestones).toHaveLength(1);
    expect(timeline.milestones[0]).toBe(milestone);
  });

  test('should get item by ID', () => {
    const stage = new Stage({
      name: 'Test Stage',
      description: 'Stage for testing'
    });

    const milestone = new Milestone({
      name: 'Test Milestone',
      description: 'Milestone for testing'
    });

    timeline.addStage(stage);
    timeline.addMilestone(milestone);

    expect(timeline.getItemById(stage.id)).toBe(stage);
    expect(timeline.getItemById(milestone.id)).toBe(milestone);
    expect(timeline.getItemById('non-existent-id')).toBeNull();
  });

  test('should get active stages', () => {
    const pendingStage = new Stage({
      name: 'Pending Stage',
      description: 'Stage that is pending'
    });

    const activeStage = new Stage({
      name: 'Active Stage',
      description: 'Stage that is in progress'
    });
    activeStage.start();

    const completedStage = new Stage({
      name: 'Completed Stage',
      description: 'Stage that is completed'
    });
    completedStage.start();
    completedStage.complete();

    timeline.addStage(pendingStage);
    timeline.addStage(activeStage);
    timeline.addStage(completedStage);

    const activeStages = timeline.getActiveStages();
    expect(activeStages).toHaveLength(1);
    expect(activeStages[0]).toBe(activeStage);
  });

  test('should start and complete timeline', () => {
    expect(timeline.status).toBe(TimelineItemStatus.PENDING);
    
    timeline.start();
    expect(timeline.status).toBe(TimelineItemStatus.IN_PROGRESS);
    
    timeline.complete();
    expect(timeline.status).toBe(TimelineItemStatus.COMPLETED);
  });

  test('should handle dependencies between timeline items', () => {
    const stage1 = new Stage({
      name: 'Stage 1',
      description: 'First stage'
    });

    const stage2 = new Stage({
      name: 'Stage 2',
      description: 'Second stage'
    });

    timeline.addStage(stage1);
    timeline.addStage(stage2);
    timeline.addDependency(stage2.id, stage1.id, DependencyType.FINISH_TO_START);

    // Stage 2 should not be able to start before Stage 1 is completed
    expect(timeline.canItemStart(stage1.id)).toBe(true);
    expect(timeline.canItemStart(stage2.id)).toBe(false);

    // After stage 1 is completed, stage 2 should be able to start
    stage1.start();
    stage1.complete();
    expect(timeline.canItemStart(stage2.id)).toBe(true);
  });

  test('should emit events when adding stages and milestones', () => {
    const stageAddedHandler = jest.fn();
    const milestoneAddedHandler = jest.fn();

    timeline.on('stage_added', stageAddedHandler);
    timeline.on('milestone_added', milestoneAddedHandler);

    const stage = new Stage({ name: 'Test Stage' });
    const milestone = new Milestone({ name: 'Test Milestone' });

    timeline.addStage(stage);
    timeline.addMilestone(milestone);

    expect(stageAddedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ timeline, stage })
    );

    expect(milestoneAddedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ timeline, milestone })
    );
  });

  test('should calculate progress', () => {
    // Add some stages
    const stage1 = new Stage({ name: 'Stage 1' });
    const stage2 = new Stage({ name: 'Stage 2' });
    const stage3 = new Stage({ name: 'Stage 3' });

    timeline.addStage(stage1);
    timeline.addStage(stage2);
    timeline.addStage(stage3);

    // Initially all stages are pending, so progress should be 0
    expect(timeline.calculateProgress()).toBe(0);

    // Complete the first stage
    stage1.start();
    stage1.complete();

    // Progress should be 33% (1/3 stages completed)
    expect(timeline.calculateProgress()).toBe(33);

    // Complete the second stage
    stage2.start();
    stage2.complete();

    // Progress should be 67% (2/3 stages completed)
    expect(timeline.calculateProgress()).toBe(67);

    // Complete the third stage
    stage3.start();
    stage3.complete();

    // Progress should be 100% (3/3 stages completed)
    expect(timeline.calculateProgress()).toBe(100);
  });

  test('should get dependencies and dependents', () => {
    const stage1 = new Stage({ name: 'Stage 1' });
    const stage2 = new Stage({ name: 'Stage 2' });
    const milestone = new Milestone({ name: 'Milestone' });

    timeline.addStage(stage1);
    timeline.addStage(stage2);
    timeline.addMilestone(milestone);

    // Add dependencies
    timeline.addDependency(stage2.id, stage1.id, DependencyType.FINISH_TO_START);
    timeline.addDependency(milestone.id, stage2.id, DependencyType.FINISH_TO_START);

    // Get dependencies for stage2
    const stage2Dependencies = timeline.getItemDependencies(stage2.id);
    expect(stage2Dependencies).toHaveLength(1);
    expect(stage2Dependencies[0].id).toBe(stage1.id);
    expect(stage2Dependencies[0].dependencyType).toBe(DependencyType.FINISH_TO_START);

    // Get dependents for stage1
    const stage1Dependents = timeline.getItemDependents(stage1.id);
    expect(stage1Dependents).toHaveLength(1);
    expect(stage1Dependents[0].id).toBe(stage2.id);
    expect(stage1Dependents[0].dependencyType).toBe(DependencyType.FINISH_TO_START);

    // Get dependents for stage2
    const stage2Dependents = timeline.getItemDependents(stage2.id);
    expect(stage2Dependents).toHaveLength(1);
    expect(stage2Dependents[0].id).toBe(milestone.id);
    expect(stage2Dependents[0].dependencyType).toBe(DependencyType.FINISH_TO_START);
  });

  test('should serialize and deserialize timeline', () => {
    // Create a timeline with stages and milestones
    const stage = new Stage({ 
      name: 'Test Stage',
      description: 'Stage for testing',
      priority: TimelineItemPriority.HIGH
    });
    
    const milestone = new Milestone({
      name: 'Test Milestone',
      description: 'Milestone for testing',
      plannedEndDate: new Date('2025-12-31')
    });

    timeline.addStage(stage);
    timeline.addMilestone(milestone);
    timeline.addDependency(milestone.id, stage.id, DependencyType.FINISH_TO_START);

    // Serialize to JSON
    const json = timeline.toJSON();

    // Deserialize from JSON
    const deserialized = Timeline.fromJSON(json, {
      fromJSON: Stage.fromJSON
    }, {
      fromJSON: Milestone.fromJSON
    });

    // Verify the deserialized timeline
    expect(deserialized.id).toBe(timeline.id);
    expect(deserialized.name).toBe(timeline.name);
    expect(deserialized.description).toBe(timeline.description);
    expect(deserialized.status).toBe(timeline.status);
    expect(deserialized.version).toBe(timeline.version);

    // Verify stages
    expect(deserialized.stages).toHaveLength(1);
    expect(deserialized.stages[0].id).toBe(stage.id);
    expect(deserialized.stages[0].name).toBe(stage.name);
    expect(deserialized.stages[0].priority).toBe(stage.priority);

    // Verify milestones
    expect(deserialized.milestones).toHaveLength(1);
    expect(deserialized.milestones[0].id).toBe(milestone.id);
    expect(deserialized.milestones[0].name).toBe(milestone.name);
    
    // Verify the milestone planned date (convert to ISO string for comparison)
    const deserializedDate = deserialized.milestones[0].plannedEndDate?.toISOString();
    const originalDate = milestone.plannedEndDate?.toISOString();
    expect(deserializedDate).toBe(originalDate);

    // Verify dependencies
    expect(deserialized.milestones[0].dependencies).toHaveLength(1);
    expect(deserialized.milestones[0].dependencies?.[0].dependsOnId).toBe(stage.id);
    expect(deserialized.milestones[0].dependencies?.[0].type).toBe(DependencyType.FINISH_TO_START);
  });
});