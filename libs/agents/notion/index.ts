/**
 * Notion integration for the Planner Agent
 * Provides functionality for reading from and writing to Notion
 */

import { NotionAgent, NotionAgentConfig } from './agent';

export { NotionAgent, NotionAgentConfig };

// 🔄 Switched to relay—no direct Notion SDK in sandbox
import { createPageViaRelay } from '../../lib/relayNotion.js';
import { notionConfig } from '../common/config';
import type { Project, Task, Timeline, Specifications } from '../planner/types';

// Initialize Notion client
let notionClient: Client | null = null;

/**
 * Get the Notion client instance
 */
export function getNotionClient(): Client {
  if (!notionClient) {
    if (!notionConfig.apiKey) {
      throw new Error('Notion API key is not configured');
    }
    notionClient = new Client({ auth: notionConfig.apiKey });
  }
  return notionClient;
}

/**
 * Creates a new project in Notion
 */
export async function createProject(project: Project): Promise<string> {
  const notion = getNotionClient();
  
  try {
    // Check if project database exists
    if (!notionConfig.projectDatabaseId) {
      throw new Error('Notion project database ID is not configured');
    }
    
    // 🔄 Switched to relay—no direct Notion SDK in sandbox
    const projectId = await createPageViaRelay(
      notionConfig.projectDatabaseId,
      project.name,
      {
        Name: { title: [{ text: { content: project.name } }] },
        Status: { select: { name: 'Planning' } },
        Priority: { select: { name: project.priorities && project.priorities.length > 0 ? 'High' : 'Medium' } },
        'Start Date': { date: { start: new Date().toISOString().split('T')[0] } },
        Description: { rich_text: [{ text: { content: project.description.substring(0, 2000) } }] },
        Objectives: { rich_text: [{ text: { content: project.objectives.join('\n- ').substring(0, 2000) } }] },
        Constraints: { rich_text: project.constraints ? [{ text: { content: project.constraints.join('\n- ').substring(0, 2000) } }] : [] }
      }
    );
    return projectId;
  } catch (error) {
    console.error('Failed to create project in Notion:', error);
    throw new Error(`Notion project creation failed: ${error.message}`);
  }
}

/**
 * Create tasks in Notion for a project
 */
export async function createTasks(tasks: Task[], projectId: string): Promise<string[]> {
  const notion = getNotionClient();
  
  if (!notionConfig.taskDatabaseId) {
    throw new Error('Notion task database ID is not configured');
  }
  
  const taskIds: string[] = [];
  
  // Create each task
  for (const task of tasks) {
    try {
      // 🔄 Switched to relay—no direct Notion SDK in sandbox
      const taskId = await createPageViaRelay(
        notionConfig.taskDatabaseId,
        task.name,
        {
          Name: { title: [{ text: { content: task.name } }] },
          Status: { select: { name: 'Not Started' } },
          Priority: { select: { name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) } },
          Project: { relation: [{ id: projectId }] },
          Effort: { number: task.effort },
          Description: { rich_text: [{ text: { content: task.description.substring(0, 2000) } }] }
        }
      );
      taskIds.push(taskId);
      task.notionId = taskId;
    } catch (error) {
      console.error(`Failed to create task "${task.name}" in Notion:`, error);
    }
  }
  
  // Now create dependencies
  await createDependencies(tasks);
  
  return taskIds;
}

/**
 * Create dependencies in Notion
 */
export async function createDependencies(tasks: Task[]): Promise<void> {
  const notion = getNotionClient();
  
  if (!notionConfig.dependencyDatabaseId) {
    console.warn('Dependency database ID not configured, skipping dependencies');
    return;
  }
  
  // For each task with dependencies
  for (const task of tasks) {
    if (task.dependencies.length > 0 && task.notionId) {
      for (const depId of task.dependencies) {
        // Find the dependent task
        const depTask = tasks.find(t => t.id === depId);
        if (depTask?.notionId) {
          try {
            // 🔄 Switched to relay—no direct Notion SDK in sandbox
            await createPageViaRelay(
              notionConfig.dependencyDatabaseId,
              `${task.name} depends on ${depTask.name}`,
              {
                Name: { title: [{ text: { content: `${task.name} depends on ${depTask.name}` } }] },
                Task: { relation: [{ id: task.notionId }] },
                'Depends On': { relation: [{ id: depTask.notionId }] }
              }
            );
          } catch (error) {
            console.error(`Failed to create dependency for ${task.name} -> ${depTask.name}:`, error);
          }
        }
      }
    }
  }
}

/**
 * Create detailed specifications in Notion
 */
export async function createSpecifications(
  specifications: Specifications, 
  tasks: Task[], 
  projectId: string
): Promise<void> {
  const notion = getNotionClient();
  
  for (const [taskId, spec] of Object.entries(specifications)) {
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.notionId) {
      try {
        // Update the task with specifications
        await notion.pages.update({
          page_id: task.notionId,
          properties: {
            Specifications: {
              rich_text: [
                {
                  text: {
                    content: spec.substring(0, 2000) // Notion limits rich_text to 2000 chars
                  }
                }
              ]
            }
          }
        });
        
        // Also add specification as blocks to the page
        await notion.blocks.children.append({
          block_id: task.notionId,
          children: [
            {
              object: 'block',
              heading_2: {
                rich_text: [
                  {
                    text: {
                      content: 'Detailed Specifications'
                    }
                  }
                ]
              }
            },
            {
              object: 'block',
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: spec.substring(0, 2000)
                    }
                  }
                ]
              }
            }
          ]
        });
      } catch (error) {
        console.error(`Failed to update specifications for task "${task.name}" in Notion:`, error);
      }
    }
  }
}

/**
 * Create a timeline in Notion
 */
export async function createTimeline(
  timeline: Timeline, 
  tasks: Task[], 
  projectId: string
): Promise<void> {
  const notion = getNotionClient();
  
  try {
    // Create timeline blocks
    const timelineBlocks: any[] = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Project Timeline'
              }
            }
          ]
        }
      },
      {
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Estimated Duration: ${timeline.estimatedDuration}`
              }
            }
          ]
        }
      }
    ];
    
    // Add milestone sections
    for (const milestone of timeline.milestones) {
      // Add milestone header
      timelineBlocks.push({
        object: 'block',
        heading_2: {
          rich_text: [
            {
              text: {
                content: `${milestone.name} (${milestone.date})`
              }
            }
          ]
        }
      });
      
      // Add milestone description
      if (milestone.description) {
        timelineBlocks.push({
          object: 'block',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: milestone.description
                }
              }
            ]
          }
        });
      }
      
      // Add tasks in this milestone
      timelineBlocks.push({
        object: 'block',
        heading_3: {
          rich_text: [
            {
              text: {
                content: 'Tasks:'
              }
            }
          ]
        }
      });
      
      // Find task names for this milestone
      const milestoneTasks = milestone.tasks
        .map(taskId => tasks.find(t => t.id === taskId))
        .filter(Boolean)
        .map(task => task.name);
      
      // Add task list
      for (const taskName of milestoneTasks) {
        timelineBlocks.push({
          object: 'block',
          bulleted_list_item: {
            rich_text: [
              {
                text: {
                  content: taskName
                }
              }
            ]
          }
        });
      }
    }
    
    // Create a timeline page in the project
    await notion.blocks.children.append({
      block_id: projectId,
      children: timelineBlocks
    });
    
    // Update project end date based on final milestone
    if (timeline.milestones.length > 0) {
      const lastMilestone = timeline.milestones[timeline.milestones.length - 1];
      
      await notion.pages.update({
        page_id: projectId,
        properties: {
          'End Date': {
            date: {
              start: lastMilestone.date
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to create timeline in Notion:', error);
  }
}

/**
 * Save a complete plan to Notion
 */
export async function savePlanToNotion(
  project: Project,
  tasks: Task[],
  timeline?: Timeline,
  specifications?: Specifications
): Promise<{ projectId: string, taskIds: string[] }> {
  try {
    // 1. Create the project
    const projectId = await createProject(project);
    console.log(`Created project in Notion with ID: ${projectId}`);
    
    // 2. Create the tasks
    const taskIds = await createTasks(tasks, projectId);
    console.log(`Created ${taskIds.length} tasks in Notion`);
    
    // 3. Create specifications if available
    if (specifications) {
      await createSpecifications(specifications, tasks, projectId);
      console.log(`Added specifications to tasks in Notion`);
    }
    
    // 4. Create timeline if available
    if (timeline) {
      await createTimeline(timeline, tasks, projectId);
      console.log(`Added timeline to project in Notion`);
    }
    
    return { projectId, taskIds };
  } catch (error) {
    console.error('Failed to save plan to Notion:', error);
    throw new Error(`Notion plan creation failed: ${error.message}`);
  }
}