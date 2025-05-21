/**
 * Progress tracking for timelines and stages
 */

import {
  ProgressTrackerInterface,
  ProgressCalculationStrategy,
  TimelineInterface,
  StageInterface,
  TimelineItemStatus,
  TimelineItemPriority,
  ProgressStrategy
} from './types';

/**
 * Implementation of the progress tracker
 */
export class ProgressTracker implements ProgressTrackerInterface {
  strategy: ProgressCalculationStrategy;

  /**
   * Create a new ProgressTracker
   */
  constructor(strategy?: ProgressCalculationStrategy) {
    this.strategy = strategy || new EqualWeightStrategy();
  }

  /**
   * Set the progress calculation strategy
   */
  setStrategy(strategy: ProgressCalculationStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Calculate the progress of a timeline
   */
  calculateTimelineProgress(timeline: TimelineInterface): number {
    return this.strategy.calculateTimelineProgress(timeline);
  }

  /**
   * Calculate the progress of a stage
   */
  calculateStageProgress(stage: StageInterface): number {
    return this.strategy.calculateStageProgress(stage);
  }

  /**
   * Get detailed progress information for a timeline
   */
  getDetailedProgress(timeline: TimelineInterface): {
    overall: number;
    stages: Record<string, number>;
    milestones: Record<string, boolean>;
  } {
    const stageProgress: Record<string, number> = {};
    const milestoneProgress: Record<string, boolean> = {};
    
    // Calculate progress for each stage
    timeline.stages.forEach(stage => {
      stageProgress[stage.id] = this.calculateStageProgress(stage);
    });
    
    // Calculate milestone completion
    timeline.milestones.forEach(milestone => {
      milestoneProgress[milestone.id] = milestone.status === TimelineItemStatus.COMPLETED;
    });
    
    // Calculate overall progress
    const overall = this.calculateTimelineProgress(timeline);
    
    return {
      overall,
      stages: stageProgress,
      milestones: milestoneProgress
    };
  }

  /**
   * Create a progress tracker with a specific strategy
   */
  static withStrategy(strategyType: ProgressStrategy): ProgressTracker {
    let strategy: ProgressCalculationStrategy;
    
    switch (strategyType) {
      case ProgressStrategy.PRIORITY_BASED:
        strategy = new PriorityBasedStrategy();
        break;
      case ProgressStrategy.TIME_BASED:
        strategy = new TimeBasedStrategy();
        break;
      case ProgressStrategy.EQUAL_WEIGHT:
      default:
        strategy = new EqualWeightStrategy();
        break;
    }
    
    return new ProgressTracker(strategy);
  }
}

/**
 * Strategy that weights all stages equally
 */
export class EqualWeightStrategy implements ProgressCalculationStrategy {
  /**
   * Calculate progress for a timeline where all stages have equal weight
   */
  calculateTimelineProgress(timeline: TimelineInterface): number {
    if (timeline.stages.length === 0) {
      return 0;
    }
    
    if (timeline.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    // Calculate average stage progress
    const totalStageProgress = timeline.stages.reduce(
      (sum, stage) => sum + this.calculateStageProgress(stage),
      0
    );
    
    return Math.round(totalStageProgress / timeline.stages.length);
  }

  /**
   * Calculate progress for a stage based on completed tasks
   */
  calculateStageProgress(stage: StageInterface): number {
    if (stage.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    if (stage.status === TimelineItemStatus.PENDING || 
        stage.status === TimelineItemStatus.WAITING) {
      return 0;
    }
    
    if (stage.tasks.length === 0) {
      // No tasks, estimate based on status
      switch (stage.status) {
        case TimelineItemStatus.IN_PROGRESS:
          return 50;
        case TimelineItemStatus.FAILED:
        case TimelineItemStatus.CANCELLED:
          return 0;
        default:
          return 0;
      }
    }
    
    // Calculate based on completed tasks
    const completedTasks = stage.tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / stage.tasks.length) * 100);
  }
}

/**
 * Strategy that weights stages by priority
 */
export class PriorityBasedStrategy implements ProgressCalculationStrategy {
  /**
   * Calculate progress for a timeline based on priority-weighted stages
   */
  calculateTimelineProgress(timeline: TimelineInterface): number {
    if (timeline.stages.length === 0) {
      return 0;
    }
    
    if (timeline.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    // Priority weights
    const weights = {
      [TimelineItemPriority.CRITICAL]: 4,
      [TimelineItemPriority.HIGH]: 3,
      [TimelineItemPriority.MEDIUM]: 2,
      [TimelineItemPriority.LOW]: 1
    };
    
    // Calculate weighted progress
    let totalProgress = 0;
    let totalWeight = 0;
    
    timeline.stages.forEach(stage => {
      const priority = stage.priority || TimelineItemPriority.MEDIUM;
      const weight = weights[priority];
      
      totalProgress += this.calculateStageProgress(stage) * weight;
      totalWeight += weight;
    });
    
    if (totalWeight === 0) {
      return 0;
    }
    
    return Math.round(totalProgress / totalWeight);
  }

  /**
   * Calculate progress for a stage based on completed tasks
   */
  calculateStageProgress(stage: StageInterface): number {
    // Use the same implementation as EqualWeightStrategy
    return new EqualWeightStrategy().calculateStageProgress(stage);
  }
}

/**
 * Strategy that weights stages by time/effort
 */
export class TimeBasedStrategy implements ProgressCalculationStrategy {
  /**
   * Calculate progress for a timeline based on time-weighted stages
   */
  calculateTimelineProgress(timeline: TimelineInterface): number {
    if (timeline.stages.length === 0) {
      return 0;
    }
    
    if (timeline.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    // Calculate total estimated hours across all stages
    let totalEstimatedHours = 0;
    let completedEstimatedHours = 0;
    
    timeline.stages.forEach(stage => {
      // Sum estimated hours for all tasks in the stage
      const stageEstimatedHours = stage.tasks.reduce(
        (sum, task) => sum + (task.estimatedHours || 1),
        0
      );
      
      totalEstimatedHours += stageEstimatedHours;
      
      // Calculate completed hours for this stage
      const stageProgress = this.calculateStageProgress(stage);
      completedEstimatedHours += (stageEstimatedHours * stageProgress / 100);
    });
    
    if (totalEstimatedHours === 0) {
      // Fallback to equal weight if no hours are estimated
      return new EqualWeightStrategy().calculateTimelineProgress(timeline);
    }
    
    return Math.round((completedEstimatedHours / totalEstimatedHours) * 100);
  }

  /**
   * Calculate progress for a stage based on completed task hours
   */
  calculateStageProgress(stage: StageInterface): number {
    if (stage.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    if (stage.status === TimelineItemStatus.PENDING || 
        stage.status === TimelineItemStatus.WAITING) {
      return 0;
    }
    
    if (stage.tasks.length === 0) {
      // No tasks, estimate based on status
      switch (stage.status) {
        case TimelineItemStatus.IN_PROGRESS:
          return 50;
        case TimelineItemStatus.FAILED:
        case TimelineItemStatus.CANCELLED:
          return 0;
        default:
          return 0;
      }
    }
    
    // Calculate based on estimated and completed task hours
    let totalEstimatedHours = 0;
    let completedEstimatedHours = 0;
    
    stage.tasks.forEach(task => {
      const estimatedHours = task.estimatedHours || 1;
      totalEstimatedHours += estimatedHours;
      
      if (task.completed) {
        completedEstimatedHours += estimatedHours;
      }
    });
    
    return Math.round((completedEstimatedHours / totalEstimatedHours) * 100);
  }
}