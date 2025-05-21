/**
 * JSON file storage implementation for timeline repository
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { TimelineRepository, TimelineInterface } from '../types';
import { Timeline } from '../timeline';
import { Stage } from '../stage';
import { Milestone } from '../milestone';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * Stores timeline data in JSON files
 */
export class JsonFileTimelineRepository implements TimelineRepository {
  private readonly directory: string;

  /**
   * Creates a new JsonFileTimelineRepository
   */
  constructor(directory: string) {
    this.directory = directory;
  }

  /**
   * Initialize the repository (create directory if needed)
   */
  async initialize(): Promise<void> {
    try {
      await access(this.directory, fs.constants.F_OK);
    } catch (error) {
      await mkdir(this.directory, { recursive: true });
    }
  }

  /**
   * Save a timeline to a JSON file
   */
  async saveTimeline(timeline: TimelineInterface): Promise<void> {
    await this.initialize();
    
    const filePath = this.getFilePath(timeline.id);
    const data = JSON.stringify(timeline.toJSON(), null, 2);
    
    await writeFile(filePath, data, 'utf8');
  }

  /**
   * Get a timeline from a JSON file
   */
  async getTimeline(id: string): Promise<TimelineInterface | null> {
    try {
      await this.initialize();
      
      const filePath = this.getFilePath(id);
      
      const data = await readFile(filePath, 'utf8');
      const json = JSON.parse(data);
      
      return this.deserializeTimeline(json);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist
        return null;
      }
      
      throw error;
    }
  }

  /**
   * List all timelines in the repository
   */
  async listTimelines(): Promise<TimelineInterface[]> {
    await this.initialize();
    
    const files = await readdir(this.directory);
    const timelineFiles = files.filter(file => file.endsWith('.json'));
    
    const timelines: TimelineInterface[] = [];
    
    for (const file of timelineFiles) {
      const filePath = path.join(this.directory, file);
      try {
        const data = await readFile(filePath, 'utf8');
        const json = JSON.parse(data);
        
        const timeline = await this.deserializeTimeline(json);
        if (timeline) {
          timelines.push(timeline);
        }
      } catch (error) {
        console.error(`Error reading timeline file ${file}:`, error);
      }
    }
    
    return timelines;
  }

  /**
   * Delete a timeline from the repository
   */
  async deleteTimeline(id: string): Promise<void> {
    await this.initialize();
    
    const filePath = this.getFilePath(id);
    
    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Search for timelines by name
   */
  async searchTimelinesByName(name: string): Promise<TimelineInterface[]> {
    const timelines = await this.listTimelines();
    const nameLower = name.toLowerCase();
    
    return timelines.filter(timeline => 
      timeline.name.toLowerCase().includes(nameLower)
    );
  }

  /**
   * Search for timelines by status
   */
  async searchTimelinesByStatus(status: string): Promise<TimelineInterface[]> {
    const timelines = await this.listTimelines();
    
    return timelines.filter(timeline => 
      timeline.status === status
    );
  }

  /**
   * Search for timelines by metadata
   */
  async searchTimelinesByMetadata(key: string, value: any): Promise<TimelineInterface[]> {
    const timelines = await this.listTimelines();
    
    return timelines.filter(timeline => 
      timeline.metadata && timeline.metadata[key] === value
    );
  }

  /**
   * Get the file path for a timeline ID
   */
  private getFilePath(id: string): string {
    return path.join(this.directory, `${id}.json`);
  }

  /**
   * Deserialize a timeline from JSON
   */
  private async deserializeTimeline(json: any): Promise<TimelineInterface | null> {
    try {
      return Timeline.fromJSON(json, {
        fromJSON: (stageJson: any) => Stage.fromJSON(stageJson)
      }, {
        fromJSON: (milestoneJson: any) => Milestone.fromJSON(milestoneJson)
      });
    } catch (error) {
      console.error('Error deserializing timeline:', error);
      return null;
    }
  }
}