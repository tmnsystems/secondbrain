/**
 * Notion Updater Module
 * 
 * This module simulates updating task status in Notion.
 * In a real implementation, this would connect to the Notion API.
 */

import * as fs from 'fs';
import * as path from 'path';

interface NotionTaskUpdate {
  taskId: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  lastUpdated: string;
  notes?: string;
  executedBy?: string;
  completionTime?: string;
}

/**
 * Class for updating Notion task status
 */
export class NotionTaskUpdater {
  private logDir: string;
  
  /**
   * Create a new NotionTaskUpdater
   * @param logDir Directory to store mock Notion updates
   */
  constructor(logDir: string = path.join(process.cwd(), 'notion-logs')) {
    this.logDir = logDir;
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  /**
   * Update a task in Notion
   * @param taskId The task ID to update
   * @param status New status
   * @param notes Optional notes
   */
  async updateTaskStatus(
    taskId: string, 
    status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked',
    notes?: string
  ): Promise<NotionTaskUpdate> {
    // In a real implementation, this would call the Notion API
    console.log(`Updating task ${taskId} to status: ${status}`);
    
    const update: NotionTaskUpdate = {
      taskId,
      status,
      lastUpdated: new Date().toISOString(),
      notes,
      executedBy: 'ExecutorAgent',
      ...(status === 'Completed' ? { completionTime: new Date().toISOString() } : {})
    };
    
    // Log the update to a file (simulating Notion API call)
    await this.logNotionUpdate(taskId, update);
    
    return update;
  }
  
  /**
   * Get task updates for a specific task
   * @param taskId Task ID to get updates for
   */
  async getTaskUpdates(taskId: string): Promise<NotionTaskUpdate[]> {
    const logFilePath = path.join(this.logDir, `${taskId}.json`);
    
    if (!fs.existsSync(logFilePath)) {
      return [];
    }
    
    try {
      const logData = fs.readFileSync(logFilePath, 'utf8');
      return JSON.parse(logData);
    } catch (error) {
      console.error(`Error reading task updates for ${taskId}:`, error);
      return [];
    }
  }
  
  /**
   * Log a Notion update to a file
   * @param taskId Task ID
   * @param update The update data
   */
  private async logNotionUpdate(taskId: string, update: NotionTaskUpdate): Promise<void> {
    const logFilePath = path.join(this.logDir, `${taskId}.json`);
    
    let updates: NotionTaskUpdate[] = [];
    
    // Load existing updates if they exist
    if (fs.existsSync(logFilePath)) {
      try {
        const existingData = fs.readFileSync(logFilePath, 'utf8');
        updates = JSON.parse(existingData);
      } catch (error) {
        console.error(`Error reading existing updates for ${taskId}:`, error);
      }
    }
    
    // Add the new update
    updates.push(update);
    
    // Write back to file
    fs.writeFileSync(logFilePath, JSON.stringify(updates, null, 2), 'utf8');
  }
}