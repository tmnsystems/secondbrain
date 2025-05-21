/**
 * Progress Tracker
 * @module rollout-timeline/progress-tracker
 * @description Tracks and calculates progress for timeline items
 */

import {
  ProgressTracker as ProgressTrackerInterface,
  Timeline,
  Stage,
  Milestone,
  TimelineItem,
  TimelineItemStatus,
  TimelineItemType,
  PriorityLevel
} from './types';

/**
 * Interface for a progress calculation strategy
 */
interface ProgressStrategy {
  /**
   * Calculate progress for a timeline
   * @param timeline The timeline
   * @returns Progress percentage (0-100)
   */
  calculateTimelineProgress(timeline: Timeline): number;
  
  /**
   * Calculate progress for a stage
   * @param stage The stage
   * @returns Progress percentage (0-100)
   */
  calculateStageProgress(stage: Stage): number;
}

/**
 * Strategy for calculating progress based on equal weighting
 */
class EqualWeightStrategy implements ProgressStrategy {
  /**
   * Calculate timeline progress with equal weighting
   * @param timeline The timeline
   * @returns Progress percentage (0-100)
   */
  calculateTimelineProgress(timeline: Timeline): number {
    if (timeline.stages.length === 0 && timeline.milestones.length === 0) {
      return 0;
    }
    
    let totalItems = timeline.stages.length + timeline.milestones.length;
    let completedValue = 0;
    
    // Calculate stage contribution
    for (const stage of timeline.stages) {
      const stageProgress = this.calculateStageProgress(stage);
      completedValue += stageProgress / 100;
    }
    
    // Calculate milestone contribution
    for (const milestone of timeline.milestones) {
      if (milestone.status === TimelineItemStatus.COMPLETED) {
        completedValue += 1;
      }
    }
    
    return Math.round((completedValue / totalItems) * 100);
  }
  
  /**
   * Calculate stage progress with equal weighting
   * @param stage The stage
   * @returns Progress percentage (0-100)
   */
  calculateStageProgress(stage: Stage): number {
    if (stage.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    if (stage.status === TimelineItemStatus.PENDING || 
        stage.status === TimelineItemStatus.CANCELLED) {
      return 0;
    }
    
    // If progress already set, use it
    if (typeof stage.progress === 'number') {
      return stage.progress;
    }
    
    // Calculate based on tasks
    if (stage.tasks && stage.tasks.length > 0) {
      const completedTasks = stage.tasks.filter(task => task.completed).length;
      return Math.round((completedTasks / stage.tasks.length) * 100);
    }
    
    // Fallback to status-based calculation
    switch (stage.status) {
      case TimelineItemStatus.IN_PROGRESS:
        return 50;
      case TimelineItemStatus.FAILED:
        return 75; // Failed is considered partially complete
      default:
        return 0;
    }
  }
}

/**
 * Strategy for calculating progress based on priority weighting
 */
class PriorityWeightStrategy implements ProgressStrategy {
  // Priority weights
  private weights = {
    [PriorityLevel.CRITICAL]: 4,
    [PriorityLevel.HIGH]: 3,
    [PriorityLevel.MEDIUM]: 2,
    [PriorityLevel.LOW]: 1
  };
  
  /**
   * Calculate timeline progress with priority weighting
   * @param timeline The timeline
   * @returns Progress percentage (0-100)
   */
  calculateTimelineProgress(timeline: Timeline): number {
    let totalWeight = 0;
    let weightedProgress = 0;
    
    // Calculate stage contribution
    for (const stage of timeline.stages) {
      const weight = this.weights[stage.priority];
      totalWeight += weight;
      
      const stageProgress = this.calculateStageProgress(stage);
      weightedProgress += stageProgress * weight;
    }
    
    // Calculate milestone contribution
    for (const milestone of timeline.milestones) {
      const weight = this.weights[milestone.priority];
      totalWeight += weight;
      
      let milestoneProgress = 0;
      if (milestone.status === TimelineItemStatus.COMPLETED) {
        milestoneProgress = 100;
      } else if (milestone.status === TimelineItemStatus.IN_PROGRESS) {
        milestoneProgress = 50;
      }
      
      weightedProgress += milestoneProgress * weight;
    }
    
    if (totalWeight === 0) return 0;
    
    return Math.round(weightedProgress / totalWeight);
  }
  
  /**
   * Calculate stage progress with priority weighting
   * @param stage The stage
   * @returns Progress percentage (0-100)
   */
  calculateStageProgress(stage: Stage): number {
    if (stage.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    if (stage.status === TimelineItemStatus.PENDING || 
        stage.status === TimelineItemStatus.CANCELLED) {
      return 0;
    }
    
    // If progress already set, use it
    if (typeof stage.progress === 'number') {
      return stage.progress;
    }
    
    // Calculate based on tasks and their priorities
    if (stage.tasks && stage.tasks.length > 0) {
      // Simple implementation - in a real system, tasks might have priorities too
      const completedTasks = stage.tasks.filter(task => task.completed).length;
      return Math.round((completedTasks / stage.tasks.length) * 100);
    }
    
    // If stage has sub-stages, calculate weighted progress
    if (stage.subStages && stage.subStages.length > 0) {
      let totalWeight = 0;
      let weightedProgress = 0;
      
      for (const subStage of stage.subStages) {
        const weight = this.weights[subStage.priority];
        totalWeight += weight;
        
        const subProgress = this.calculateStageProgress(subStage);
        weightedProgress += subProgress * weight;
      }
      
      if (totalWeight === 0) return 0;
      
      return Math.round(weightedProgress / totalWeight);
    }
    
    // Fallback to status-based calculation
    switch (stage.status) {
      case TimelineItemStatus.IN_PROGRESS:
        return 50;
      case TimelineItemStatus.FAILED:
        return 75; // Failed is considered partially complete
      default:
        return 0;
    }
  }
}

/**
 * Strategy for calculating progress based on time elapsed
 */
class TimeBasedStrategy implements ProgressStrategy {
  /**
   * Calculate timeline progress based on time
   * @param timeline The timeline
   * @returns Progress percentage (0-100)
   */
  calculateTimelineProgress(timeline: Timeline): number {
    if (timeline.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    if (timeline.status === TimelineItemStatus.PENDING || 
        timeline.status === TimelineItemStatus.CANCELLED) {
      return 0;
    }
    
    // Find planned start and end dates for entire timeline
    const allItems = [...timeline.stages, ...timeline.milestones];
    if (allItems.length === 0) return 0;
    
    const startDates = allItems.map(item => item.plannedStart.getTime());
    const endDates = allItems
      .filter(item => item.plannedEnd)
      .map(item => item.plannedEnd!.getTime());
    
    const timelineStart = Math.min(...startDates);
    const timelineEnd = endDates.length > 0 ? Math.max(...endDates) : timelineStart;
    
    if (timelineStart === timelineEnd) return 0;
    
    const now = Date.now();
    
    if (now <= timelineStart) return 0;
    if (now >= timelineEnd) return 100;
    
    return Math.round(((now - timelineStart) / (timelineEnd - timelineStart)) * 100);
  }
  
  /**
   * Calculate stage progress based on time
   * @param stage The stage
   * @returns Progress percentage (0-100)
   */
  calculateStageProgress(stage: Stage): number {
    if (stage.status === TimelineItemStatus.COMPLETED) {
      return 100;
    }
    
    if (stage.status === TimelineItemStatus.PENDING || 
        stage.status === TimelineItemStatus.CANCELLED) {
      return 0;
    }
    
    // If progress already set, use it
    if (typeof stage.progress === 'number') {
      return stage.progress;
    }
    
    const now = Date.now();
    const startTime = stage.plannedStart.getTime();
    
    if (!stage.plannedEnd) {
      // If no end date, use status-based calculation
      switch (stage.status) {
        case TimelineItemStatus.IN_PROGRESS:
          return 50;
        case TimelineItemStatus.FAILED:
          return 75;
        default:
          return 0;
      }
    }
    
    const endTime = stage.plannedEnd.getTime();
    
    if (now <= startTime) return 0;
    if (now >= endTime) return 100;
    
    return Math.round(((now - startTime) / (endTime - startTime)) * 100);
  }
}

/**
 * Implementation of the progress tracker
 */
export class ProgressTracker implements ProgressTrackerInterface {
  private strategy: ProgressStrategy;
  
  /**
   * Create a new progress tracker
   * @param strategyType Type of progress calculation strategy to use
   */
  constructor(strategyType: 'equal' | 'priority' | 'time' = 'priority') {
    switch (strategyType) {
      case 'equal':
        this.strategy = new EqualWeightStrategy();
        break;
      case 'time':
        this.strategy = new TimeBasedStrategy();
        break;
      case 'priority':
      default:
        this.strategy = new PriorityWeightStrategy();
        break;
    }
  }
  
  /**
   * Set the progress calculation strategy
   * @param strategyType Type of strategy to use
   */
  setStrategy(strategyType: 'equal' | 'priority' | 'time'): void {
    switch (strategyType) {
      case 'equal':
        this.strategy = new EqualWeightStrategy();
        break;
      case 'time':
        this.strategy = new TimeBasedStrategy();
        break;
      case 'priority':
      default:
        this.strategy = new PriorityWeightStrategy();
        break;
    }
  }
  
  /**
   * Calculate the progress of a timeline
   * @param timeline The timeline
   * @returns Progress percentage (0-100)
   */
  calculateTimelineProgress(timeline: Timeline): number {
    return this.strategy.calculateTimelineProgress(timeline);
  }
  
  /**
   * Calculate the progress of a stage
   * @param stage The stage
   * @returns Progress percentage (0-100)
   */
  calculateStageProgress(stage: Stage): number {
    return this.strategy.calculateStageProgress(stage);
  }
  
  /**
   * Track a milestone completion
   * @param milestone The milestone
   */
  trackMilestoneCompletion(milestone: Milestone): void {
    if (milestone.status !== TimelineItemStatus.COMPLETED) {
      milestone.status = TimelineItemStatus.COMPLETED;
      milestone.actualEnd = new Date();
      
      if (!milestone.actualStart) {
        milestone.actualStart = milestone.actualEnd;
      }
    }
  }
  
  /**
   * Track a stage progress update
   * @param stage The stage
   * @param progress Progress percentage (0-100)
   */
  trackStageProgress(stage: Stage, progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    stage.progress = progress;
    
    // Update status based on progress
    if (progress === 0 && stage.status === TimelineItemStatus.PENDING) {
      // No change needed
    } else if (progress > 0 && progress < 100 && 
               stage.status !== TimelineItemStatus.IN_PROGRESS &&
               stage.status !== TimelineItemStatus.FAILED) {
      stage.status = TimelineItemStatus.IN_PROGRESS;
      if (!stage.actualStart) {
        stage.actualStart = new Date();
      }
    } else if (progress === 100 && stage.status !== TimelineItemStatus.COMPLETED) {
      stage.status = TimelineItemStatus.COMPLETED;
      stage.actualEnd = new Date();
      
      if (!stage.actualStart) {
        stage.actualStart = new Date(stage.actualEnd.getTime() - 1000); // 1 second before
      }
    }
  }
  
  /**
   * Get a summary of timeline progress
   * @param timeline The timeline
   * @returns Progress summary
   */
  getProgressSummary(timeline: Timeline): {
    overallProgress: number;
    stageProgress: { id: string; name: string; progress: number }[];
    completedMilestones: number;
    totalMilestones: number;
    estimatedCompletion: Date | null;
  } {
    const overallProgress = this.calculateTimelineProgress(timeline);
    
    const stageProgress = timeline.stages.map(stage => ({
      id: stage.id,
      name: stage.name,
      progress: this.calculateStageProgress(stage)
    }));
    
    const completedMilestones = timeline.milestones.filter(
      m => m.status === TimelineItemStatus.COMPLETED
    ).length;
    
    // Estimate completion date based on current progress
    let estimatedCompletion: Date | null = null;
    
    if (timeline.status === TimelineItemStatus.IN_PROGRESS && overallProgress > 0) {
      // Find the latest planned end date among all items
      const endDates = [...timeline.stages, ...timeline.milestones]
        .filter(item => item.plannedEnd)
        .map(item => item.plannedEnd!);
      
      if (endDates.length > 0) {
        const latestEndDate = new Date(Math.max(...endDates.map(d => d.getTime())));
        
        // If we have an actual start date for the timeline, use it for calculation
        if (timeline.actualStart) {
          const elapsedTime = Date.now() - timeline.actualStart.getTime();
          const estimatedTotalTime = elapsedTime / (overallProgress / 100);
          const remainingTime = estimatedTotalTime - elapsedTime;
          
          estimatedCompletion = new Date(Date.now() + remainingTime);
          
          // If the estimated completion is before the latest planned end,
          // we're ahead of schedule - use planned end as a more conservative estimate
          if (estimatedCompletion < latestEndDate) {
            estimatedCompletion = latestEndDate;
          }
        } else {
          // Without an actual start, just use the latest planned end
          estimatedCompletion = latestEndDate;
        }
      }
    }
    
    return {
      overallProgress,
      stageProgress,
      completedMilestones,
      totalMilestones: timeline.milestones.length,
      estimatedCompletion
    };
  }
  
  /**
   * Get critical items that may be at risk
   * @param timeline The timeline
   * @returns Array of at-risk items
   */
  getAtRiskItems(timeline: Timeline): TimelineItem[] {
    const now = new Date();
    const atRiskItems: TimelineItem[] = [];
    
    // Check all timeline items
    const allItems = [...timeline.stages, ...timeline.milestones];
    
    for (const item of allItems) {
      // Skip completed or cancelled items
      if (item.status === TimelineItemStatus.COMPLETED || 
          item.status === TimelineItemStatus.CANCELLED) {
        continue;
      }
      
      // Check if item is at risk
      let atRisk = false;
      
      // Past planned end date but not completed
      if (item.plannedEnd && item.plannedEnd < now && 
          item.status !== TimelineItemStatus.COMPLETED) {
        atRisk = true;
      }
      
      // For in-progress stages, check if progress is behind schedule
      if (item.type === TimelineItemType.STAGE && 
          item.status === TimelineItemStatus.IN_PROGRESS) {
        const stage = item as Stage;
        
        if (stage.plannedStart && stage.plannedEnd) {
          const totalDuration = stage.plannedEnd.getTime() - stage.plannedStart.getTime();
          const elapsed = now.getTime() - stage.plannedStart.getTime();
          const expectedProgress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
          
          // If actual progress is significantly less than expected
          if (stage.progress < expectedProgress * 0.7) {
            atRisk = true;
          }
        }
      }
      
      // For critical milestones that are approaching
      if (item.type === TimelineItemType.MILESTONE) {
        const milestone = item as Milestone;
        
        if (milestone.critical && milestone.status === TimelineItemStatus.PENDING) {
          // If approaching milestone (within 3 days) and dependencies not satisfied
          const daysUntil = Math.ceil((milestone.plannedStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil <= 3 && daysUntil >= 0) {
            // Check dependencies
            if (milestone.dependencies && milestone.dependencies.length > 0) {
              const anyUnsatisfied = milestone.dependencies.some(dep => !dep.satisfied);
              if (anyUnsatisfied) {
                atRisk = true;
              }
            }
          }
        }
      }
      
      if (atRisk) {
        atRiskItems.push(item);
      }
    }
    
    return atRiskItems;
  }
  
  /**
   * Update progress for all items in a timeline
   * @param timeline The timeline
   * @returns The updated timeline
   */
  updateAllProgress(timeline: Timeline): Timeline {
    // Update all stages
    for (const stage of timeline.stages) {
      this.updateStageProgressRecursive(stage);
    }
    
    return timeline;
  }
  
  /**
   * Recursively update progress for a stage and its sub-stages
   * @param stage The stage to update
   * @private
   */
  private updateStageProgressRecursive(stage: Stage): void {
    // Update progress for sub-stages first
    if (stage.subStages && stage.subStages.length > 0) {
      for (const subStage of stage.subStages) {
        this.updateStageProgressRecursive(subStage);
      }
    }
    
    // Calculate and update progress for this stage
    const progress = this.calculateStageProgress(stage);
    stage.progress = progress;
  }
}