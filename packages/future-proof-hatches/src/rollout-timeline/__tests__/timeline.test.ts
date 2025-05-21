/**
 * Timeline Tests
 * @module rollout-timeline/__tests__/timeline.test
 * @description Tests for the Timeline class
 */

import { Timeline, TimelineItemStatus, TimelineItemType, PriorityLevel, DependencyType } from '../types';

describe('Timeline', () => {
  // Create a new timeline for each test
  let timeline: Timeline;
  
  beforeEach(() => {
    timeline = new Timeline(
      'Test Timeline',
      '1.0.0',
      {
        description: 'A test timeline',
        createdBy: 'Test User'
      }
    );
  });
  
  test('should create a new timeline with correct properties', () => {
    expect(timeline.name).toBe('Test Timeline');
    expect(timeline.version).toBe('1.0.0');
    expect(timeline.description).toBe('A test timeline');
    expect(timeline.createdBy).toBe('Test User');
    expect(timeline.status).toBe(TimelineItemStatus.PENDING);
    expect(timeline.stages).toEqual([]);
    expect(timeline.milestones).toEqual([]);
  });
  
  test('should add stages', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      description: 'A test stage',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-06-01'),
      plannedEnd: new Date('2025-06-30')
    });
    
    expect(timeline.stages.length).toBe(1);
    expect(timeline.stages[0]).toBe(stage);
    expect(stage.name).toBe('Test Stage');
    expect(stage.type).toBe(TimelineItemType.STAGE);
    expect(stage.progress).toBe(0);
  });
  
  test('should add milestones', () => {
    const milestone = timeline.addMilestone({
      name: 'Test Milestone',
      description: 'A test milestone',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-06-15')
    });
    
    expect(timeline.milestones.length).toBe(1);
    expect(timeline.milestones[0]).toBe(milestone);
    expect(milestone.name).toBe('Test Milestone');
    expect(milestone.type).toBe(TimelineItemType.MILESTONE);
  });
  
  test('should get all items sorted by planned start date', () => {
    const stage1 = timeline.addStage({
      name: 'Stage 1',
      plannedStart: new Date('2025-06-10')
    });
    
    const milestone1 = timeline.addMilestone({
      name: 'Milestone 1',
      plannedStart: new Date('2025-06-01')
    });
    
    const stage2 = timeline.addStage({
      name: 'Stage 2',
      plannedStart: new Date('2025-06-20')
    });
    
    const allItems = timeline.getAllItems();
    expect(allItems.length).toBe(3);
    expect(allItems[0]).toBe(milestone1);
    expect(allItems[1]).toBe(stage1);
    expect(allItems[2]).toBe(stage2);
  });
  
  test('should get item by ID', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    const milestone = timeline.addMilestone({
      name: 'Test Milestone',
      plannedStart: new Date('2025-06-15')
    });
    
    expect(timeline.getItem(stage.id)).toBe(stage);
    expect(timeline.getItem(milestone.id)).toBe(milestone);
    expect(timeline.getItem('non-existent-id')).toBeUndefined();
  });
  
  test('should update a stage', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    const updatedStage = timeline.updateStage(stage.id, {
      name: 'Updated Stage',
      description: 'Updated description'
    });
    
    expect(updatedStage).toBeDefined();
    expect(updatedStage!.name).toBe('Updated Stage');
    expect(updatedStage!.description).toBe('Updated description');
    expect(timeline.getStage(stage.id)).toBe(updatedStage);
  });
  
  test('should update a milestone', () => {
    const milestone = timeline.addMilestone({
      name: 'Test Milestone',
      plannedStart: new Date('2025-06-15')
    });
    
    const updatedMilestone = timeline.updateMilestone(milestone.id, {
      name: 'Updated Milestone',
      description: 'Updated description'
    });
    
    expect(updatedMilestone).toBeDefined();
    expect(updatedMilestone!.name).toBe('Updated Milestone');
    expect(updatedMilestone!.description).toBe('Updated description');
    expect(timeline.getMilestone(milestone.id)).toBe(updatedMilestone);
  });
  
  test('should remove a stage', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    const result = timeline.removeStage(stage.id);
    
    expect(result).toBe(true);
    expect(timeline.stages.length).toBe(0);
    expect(timeline.getStage(stage.id)).toBeUndefined();
  });
  
  test('should remove a milestone', () => {
    const milestone = timeline.addMilestone({
      name: 'Test Milestone',
      plannedStart: new Date('2025-06-15')
    });
    
    const result = timeline.removeMilestone(milestone.id);
    
    expect(result).toBe(true);
    expect(timeline.milestones.length).toBe(0);
    expect(timeline.getMilestone(milestone.id)).toBeUndefined();
  });
  
  test('should start the timeline', () => {
    timeline.start();
    
    expect(timeline.status).toBe(TimelineItemStatus.IN_PROGRESS);
  });
  
  test('should complete the timeline', () => {
    timeline.start();
    timeline.complete();
    
    expect(timeline.status).toBe(TimelineItemStatus.COMPLETED);
  });
  
  test('should fail the timeline', () => {
    timeline.start();
    timeline.fail('Test failure');
    
    expect(timeline.status).toBe(TimelineItemStatus.FAILED);
  });
  
  test('should start a stage', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    const updatedStage = timeline.startStage(stage.id);
    
    expect(updatedStage).toBeDefined();
    expect(updatedStage!.status).toBe(TimelineItemStatus.IN_PROGRESS);
    expect(updatedStage!.actualStart).toBeDefined();
  });
  
  test('should complete a stage', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    timeline.startStage(stage.id);
    const updatedStage = timeline.completeStage(stage.id);
    
    expect(updatedStage).toBeDefined();
    expect(updatedStage!.status).toBe(TimelineItemStatus.COMPLETED);
    expect(updatedStage!.actualEnd).toBeDefined();
    expect(updatedStage!.progress).toBe(100);
  });
  
  test('should fail a stage', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    timeline.startStage(stage.id);
    const updatedStage = timeline.failStage(stage.id, 'Test failure');
    
    expect(updatedStage).toBeDefined();
    expect(updatedStage!.status).toBe(TimelineItemStatus.FAILED);
    expect(updatedStage!.actualEnd).toBeDefined();
    expect(updatedStage!.metadata?.failureReason).toBe('Test failure');
  });
  
  test('should reach a milestone', () => {
    const milestone = timeline.addMilestone({
      name: 'Test Milestone',
      plannedStart: new Date('2025-06-15')
    });
    
    const updatedMilestone = timeline.reachMilestone(milestone.id);
    
    expect(updatedMilestone).toBeDefined();
    expect(updatedMilestone!.status).toBe(TimelineItemStatus.COMPLETED);
    expect(updatedMilestone!.actualEnd).toBeDefined();
  });
  
  test('should add a dependency between items', () => {
    const stage1 = timeline.addStage({
      name: 'Stage 1',
      plannedStart: new Date('2025-06-01')
    });
    
    const stage2 = timeline.addStage({
      name: 'Stage 2',
      plannedStart: new Date('2025-06-15')
    });
    
    const result = timeline.addDependency(
      stage2.id,
      stage1.id,
      DependencyType.COMPLETION
    );
    
    expect(result).toBe(true);
    expect(stage2.dependencies).toBeDefined();
    expect(stage2.dependencies!.length).toBe(1);
    expect(stage2.dependencies![0].dependsOn).toBe(stage1.id);
    expect(stage2.dependencies![0].type).toBe(DependencyType.COMPLETION);
    expect(stage2.dependencies![0].satisfied).toBe(false);
  });
  
  test('should check if dependencies are satisfied', () => {
    const stage1 = timeline.addStage({
      name: 'Stage 1',
      plannedStart: new Date('2025-06-01')
    });
    
    const stage2 = timeline.addStage({
      name: 'Stage 2',
      plannedStart: new Date('2025-06-15')
    });
    
    timeline.addDependency(
      stage2.id,
      stage1.id,
      DependencyType.COMPLETION
    );
    
    // Not satisfied initially
    expect(timeline.areDependenciesSatisfied(stage2.id)).toBe(false);
    
    // Complete stage1
    timeline.startStage(stage1.id);
    timeline.completeStage(stage1.id);
    
    // Should be satisfied now
    expect(timeline.areDependenciesSatisfied(stage2.id)).toBe(true);
  });
  
  test('should update stage progress', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    const result = timeline.updateStageProgress(stage.id, 50);
    
    expect(result).toBeDefined();
    expect(result!.progress).toBe(50);
  });
  
  test('should get items ready to start', () => {
    const stage1 = timeline.addStage({
      name: 'Stage 1',
      plannedStart: new Date('2025-06-01')
    });
    
    const stage2 = timeline.addStage({
      name: 'Stage 2',
      plannedStart: new Date('2025-06-15')
    });
    
    timeline.addDependency(
      stage2.id,
      stage1.id,
      DependencyType.COMPLETION
    );
    
    // Only stage1 should be ready initially
    const readyItems = timeline.getReadyToStartItems();
    expect(readyItems.length).toBe(1);
    expect(readyItems[0]).toBe(stage1);
    
    // Complete stage1
    timeline.startStage(stage1.id);
    timeline.completeStage(stage1.id);
    
    // Now both should be ready
    const updatedReadyItems = timeline.getReadyToStartItems();
    expect(updatedReadyItems.length).toBe(2);
    expect(updatedReadyItems).toContain(stage2);
  });
  
  test('should calculate overall progress', () => {
    const stage1 = timeline.addStage({
      name: 'Stage 1',
      priority: PriorityLevel.HIGH,
      plannedStart: new Date('2025-06-01')
    });
    
    const stage2 = timeline.addStage({
      name: 'Stage 2',
      priority: PriorityLevel.MEDIUM,
      plannedStart: new Date('2025-06-15')
    });
    
    // No progress initially
    expect(timeline.calculateOverallProgress()).toBe(0);
    
    // Update progress
    timeline.startStage(stage1.id);
    timeline.updateStageProgress(stage1.id, 50);
    
    // Weighted progress calculation
    const progress = timeline.calculateOverallProgress();
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(50); // Because stage2 has 0 progress
  });
  
  test('should convert to JSON and back', () => {
    const stage = timeline.addStage({
      name: 'Test Stage',
      plannedStart: new Date('2025-06-01')
    });
    
    const milestone = timeline.addMilestone({
      name: 'Test Milestone',
      plannedStart: new Date('2025-06-15')
    });
    
    const json = timeline.toJSON();
    const restored = Timeline.fromJSON(json);
    
    expect(restored.name).toBe(timeline.name);
    expect(restored.version).toBe(timeline.version);
    expect(restored.stages.length).toBe(1);
    expect(restored.milestones.length).toBe(1);
    expect(restored.stages[0].name).toBe(stage.name);
    expect(restored.milestones[0].name).toBe(milestone.name);
  });
});