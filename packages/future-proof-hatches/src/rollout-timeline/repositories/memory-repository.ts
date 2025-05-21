/**
 * In-Memory Timeline Repository
 * @module rollout-timeline/repositories/memory-repository
 * @description Stores timeline data in memory
 */

import { 
  Timeline,
  TimelineItem, 
  TimelineRepository
} from '../types';

/**
 * Stores timeline data in memory
 */
export class InMemoryTimelineRepository implements TimelineRepository {
  private timelines: Map<string, Timeline> = new Map();
  
  /**
   * Save a timeline
   * @param timeline The timeline to save
   * @returns The saved timeline
   */
  async saveTimeline(timeline: Timeline): Promise<Timeline> {
    // Make a deep copy to prevent reference issues
    const copy = JSON.parse(JSON.stringify(timeline));
    const savedTimeline = Timeline.fromJSON(copy);
    
    // Update the updatedAt timestamp
    savedTimeline.updatedAt = new Date();
    
    // Store in map
    this.timelines.set(savedTimeline.id, savedTimeline);
    
    return savedTimeline;
  }
  
  /**
   * Get a timeline by ID
   * @param id Timeline ID
   * @returns The timeline or null if not found
   */
  async getTimeline(id: string): Promise<Timeline | null> {
    const timeline = this.timelines.get(id);
    
    if (!timeline) {
      return null;
    }
    
    // Return a deep copy to prevent reference issues
    const copy = JSON.parse(JSON.stringify(timeline));
    return Timeline.fromJSON(copy);
  }
  
  /**
   * List all timelines
   * @returns Array of timelines
   */
  async listTimelines(): Promise<Timeline[]> {
    const timelines: Timeline[] = [];
    
    for (const timeline of this.timelines.values()) {
      // Return deep copies to prevent reference issues
      const copy = JSON.parse(JSON.stringify(timeline));
      timelines.push(Timeline.fromJSON(copy));
    }
    
    return timelines;
  }
  
  /**
   * Delete a timeline
   * @param id Timeline ID
   * @returns Success boolean
   */
  async deleteTimeline(id: string): Promise<boolean> {
    return this.timelines.delete(id);
  }
  
  /**
   * Update a timeline item (stage or milestone)
   * @param timelineId Timeline ID
   * @param item Timeline item to update
   * @returns The updated timeline item
   */
  async updateTimelineItem(timelineId: string, item: TimelineItem): Promise<TimelineItem> {
    const timeline = await this.getTimeline(timelineId);
    
    if (!timeline) {
      throw new Error(`Timeline with ID ${timelineId} not found`);
    }
    
    let updatedItem: TimelineItem | undefined;
    
    // Update the item based on its type
    if (item.type === 'stage') {
      const stageIndex = timeline.stages.findIndex(s => s.id === item.id);
      
      if (stageIndex === -1) {
        throw new Error(`Stage with ID ${item.id} not found in timeline ${timelineId}`);
      }
      
      // Update the stage
      timeline.stages[stageIndex] = {
        ...timeline.stages[stageIndex],
        ...item
      };
      
      updatedItem = timeline.stages[stageIndex];
    } else if (item.type === 'milestone') {
      const milestoneIndex = timeline.milestones.findIndex(m => m.id === item.id);
      
      if (milestoneIndex === -1) {
        throw new Error(`Milestone with ID ${item.id} not found in timeline ${timelineId}`);
      }
      
      // Update the milestone
      timeline.milestones[milestoneIndex] = {
        ...timeline.milestones[milestoneIndex],
        ...item
      };
      
      updatedItem = timeline.milestones[milestoneIndex];
    } else {
      throw new Error(`Unknown item type: ${item.type}`);
    }
    
    // Update the timeline
    await this.saveTimeline(timeline);
    
    return updatedItem;
  }
  
  /**
   * Get a timeline item by ID
   * @param timelineId Timeline ID
   * @param itemId Item ID
   * @returns The timeline item or null if not found
   */
  async getTimelineItem(timelineId: string, itemId: string): Promise<TimelineItem | null> {
    const timeline = await this.getTimeline(timelineId);
    
    if (!timeline) {
      return null;
    }
    
    // Look for the item in stages
    const stage = timeline.stages.find(s => s.id === itemId);
    if (stage) {
      return stage;
    }
    
    // Look for the item in milestones
    const milestone = timeline.milestones.find(m => m.id === itemId);
    if (milestone) {
      return milestone;
    }
    
    return null;
  }
}