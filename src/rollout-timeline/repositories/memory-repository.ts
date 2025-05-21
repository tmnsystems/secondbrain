/**
 * In-memory timeline repository implementation
 */

import { TimelineRepository, TimelineInterface } from '../types';
import { Timeline } from '../timeline';
import { Stage } from '../stage';
import { Milestone } from '../milestone';

/**
 * Stores timeline data in memory
 */
export class InMemoryTimelineRepository implements TimelineRepository {
  private timelines: Map<string, TimelineInterface> = new Map();

  /**
   * Save a timeline to the repository
   */
  async saveTimeline(timeline: TimelineInterface): Promise<void> {
    this.timelines.set(timeline.id, timeline);
  }

  /**
   * Get a timeline from the repository
   */
  async getTimeline(id: string): Promise<TimelineInterface | null> {
    return this.timelines.get(id) || null;
  }

  /**
   * List all timelines in the repository
   */
  async listTimelines(): Promise<TimelineInterface[]> {
    return Array.from(this.timelines.values());
  }

  /**
   * Delete a timeline from the repository
   */
  async deleteTimeline(id: string): Promise<void> {
    this.timelines.delete(id);
  }

  /**
   * Search for timelines with a given name
   */
  async searchTimelinesByName(name: string): Promise<TimelineInterface[]> {
    const nameLower = name.toLowerCase();
    return Array.from(this.timelines.values()).filter(
      timeline => timeline.name.toLowerCase().includes(nameLower)
    );
  }

  /**
   * Search for timelines by status
   */
  async searchTimelinesByStatus(status: string): Promise<TimelineInterface[]> {
    return Array.from(this.timelines.values()).filter(
      timeline => timeline.status === status
    );
  }

  /**
   * Search for timelines by metadata
   */
  async searchTimelinesByMetadata(key: string, value: any): Promise<TimelineInterface[]> {
    return Array.from(this.timelines.values()).filter(
      timeline => timeline.metadata && timeline.metadata[key] === value
    );
  }

  /**
   * Clear all timelines from the repository
   */
  async clear(): Promise<void> {
    this.timelines.clear();
  }

  /**
   * Get the number of timelines in the repository
   */
  async count(): Promise<number> {
    return this.timelines.size;
  }
}