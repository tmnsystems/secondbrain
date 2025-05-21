/**
 * JSON File Timeline Repository
 * @module rollout-timeline/repositories/json-file-repository
 * @description Stores timeline data in JSON files
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { 
  Timeline,
  TimelineItem, 
  TimelineRepository
} from '../types';

// Promisify Node.js file system functions
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

/**
 * Stores timeline data in JSON files
 */
export class JsonFileTimelineRepository implements TimelineRepository {
  private basePath: string;
  
  /**
   * Create a new JSON file repository
   * @param basePath Base directory for storing files
   */
  constructor(basePath: string) {
    this.basePath = basePath;
  }
  
  /**
   * Initialize the repository
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    // Create directory structure if it doesn't exist
    try {
      await this.ensureDirectoryExists(this.basePath);
      await this.ensureDirectoryExists(path.join(this.basePath, 'timelines'));
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error}`);
    }
  }
  
  /**
   * Save a timeline
   * @param timeline The timeline to save
   * @returns The saved timeline
   */
  async saveTimeline(timeline: Timeline): Promise<Timeline> {
    await this.initialize();
    
    // Update the updatedAt timestamp
    timeline.updatedAt = new Date();
    
    // Convert to JSON
    const timelineJson = JSON.stringify(timeline, null, 2);
    
    // Write to file
    const filePath = this.getTimelineFilePath(timeline.id);
    await writeFile(filePath, timelineJson, 'utf8');
    
    return timeline;
  }
  
  /**
   * Get a timeline by ID
   * @param id Timeline ID
   * @returns The timeline or null if not found
   */
  async getTimeline(id: string): Promise<Timeline | null> {
    await this.initialize();
    
    const filePath = this.getTimelineFilePath(id);
    
    try {
      // Check if file exists
      await stat(filePath);
      
      // Read file
      const timelineJson = await readFile(filePath, 'utf8');
      
      // Parse JSON
      const timelineData = JSON.parse(timelineJson);
      
      // Convert to Timeline object
      return Timeline.fromJSON(timelineData);
    } catch (error) {
      // If file doesn't exist, return null
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      
      throw new Error(`Failed to get timeline: ${error}`);
    }
  }
  
  /**
   * List all timelines
   * @returns Array of timelines
   */
  async listTimelines(): Promise<Timeline[]> {
    await this.initialize();
    
    const timelinesDir = path.join(this.basePath, 'timelines');
    
    try {
      // Read directory
      const files = await readdir(timelinesDir);
      
      // Filter JSON files
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      // Read each file
      const timelines: Timeline[] = [];
      
      for (const file of jsonFiles) {
        const filePath = path.join(timelinesDir, file);
        const timelineJson = await readFile(filePath, 'utf8');
        const timelineData = JSON.parse(timelineJson);
        timelines.push(Timeline.fromJSON(timelineData));
      }
      
      return timelines;
    } catch (error) {
      throw new Error(`Failed to list timelines: ${error}`);
    }
  }
  
  /**
   * Delete a timeline
   * @param id Timeline ID
   * @returns Success boolean
   */
  async deleteTimeline(id: string): Promise<boolean> {
    await this.initialize();
    
    const filePath = this.getTimelineFilePath(id);
    
    try {
      // Check if file exists
      await stat(filePath);
      
      // Delete file
      await unlink(filePath);
      
      return true;
    } catch (error) {
      // If file doesn't exist, return false
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      
      throw new Error(`Failed to delete timeline: ${error}`);
    }
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
  
  /**
   * Get the file path for a timeline
   * @param id Timeline ID
   * @returns File path
   * @private
   */
  private getTimelineFilePath(id: string): string {
    return path.join(this.basePath, 'timelines', `${id}.json`);
  }
  
  /**
   * Ensure a directory exists
   * @param dir Directory path
   * @private
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await stat(dir);
    } catch (error) {
      // Directory doesn't exist, create it
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await mkdir(dir, { recursive: true });
      } else {
        throw error;
      }
    }
  }
}