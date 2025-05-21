/**
 * Timeline creation functionality for the Planner Agent
 * Creates a project timeline with milestones based on tasks
 */

import type { Project, Task, Timeline, Milestone } from './types';
import { modelRequest } from '../common/claude';

/**
 * Creates a timeline with milestones based on tasks
 */
export async function createTimeline(
  tasks: Task[], 
  project: Project
): Promise<Timeline> {
  try {
    // Create a detailed timeline generation prompt for Claude
    const timelinePrompt = createTimelinePrompt(tasks, project);
    
    // Get timeline from Claude
    const timelineResult = await modelRequest({
      model: 'claude-3-sonnet-20240229',
      prompt: timelinePrompt,
      temperature: 0.1,
      maxTokens: 3000,
    });
    
    // Parse the response into a structured timeline
    return parseTimelineResponse(timelineResult);
  } catch (error) {
    console.error('Timeline creation failed:', error);
    throw new Error(`Timeline creation failed: ${error.message}`);
  }
}

/**
 * Creates a detailed prompt for timeline generation
 */
function createTimelinePrompt(tasks: Task[], project: Project): string {
  // Organize tasks by priority and dependencies
  const highPriorityTasks = tasks.filter(t => t.priority === 'high');
  const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium');
  const lowPriorityTasks = tasks.filter(t => t.priority === 'low');
  
  // Generate detailed task list with priorities and dependencies
  const taskList = tasks.map(task => 
    `- ${task.id}: ${task.name} (Priority: ${task.priority}, Effort: ${task.effort})
    Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}
    ${task.description}`
  ).join('\n\n');

  return `
You are an expert project planner specializing in creating realistic project timelines. Based on the project details and tasks below, create a comprehensive timeline with milestones.

PROJECT NAME: ${project.name}

PROJECT DESCRIPTION:
${project.description}

TASK LIST:
${taskList}

TIMELINE GENERATION REQUIREMENTS:
- Create a realistic timeline with milestones based on task dependencies and effort
- Consider that high priority tasks should generally be completed earlier
- Group related tasks into logical milestones
- Each milestone should have a descriptive name and target date
- Consider that 1 story point is roughly equivalent to half a day of work
- Account for parallel work where dependencies allow
- The timeline should cover the entire project from start to completion

Please provide the timeline in JSON format with the following properties:
- estimatedDuration: Total project duration estimate (string, e.g., "6 weeks")
- milestones: Array of milestone objects, each with:
  - name: Descriptive milestone name (string)
  - date: Target date in YYYY-MM-DD format (string)
  - tasks: Array of task IDs included in this milestone (array of strings)
  - description: Brief description of this milestone's significance (string)

Return only valid JSON without explanations or markdown formatting.
`;
}

/**
 * Parses the Claude response into a structured Timeline object
 */
function parseTimelineResponse(response: string): Timeline {
  try {
    // Extract JSON from the response (handling potential text wrapping)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                     response.match(/```\s*([\s\S]*?)\s*```/) ||
                     response.match(/({[\s\S]*})/);
    
    const jsonString = jsonMatch ? jsonMatch[1] : response;
    
    // Parse the JSON
    const parsedTimeline = JSON.parse(jsonString);
    
    // Validate and structure the response
    const timeline: Timeline = {
      estimatedDuration: parsedTimeline.estimatedDuration || 'Unknown',
      milestones: (parsedTimeline.milestones || []).map((milestone: any) => ({
        name: milestone.name,
        date: milestone.date,
        tasks: milestone.tasks || [],
        description: milestone.description,
      })),
    };
    
    return timeline;
  } catch (error) {
    console.error('Failed to parse timeline response:', error);
    console.debug('Raw response:', response);
    
    // Generate current date + 1 month in YYYY-MM-DD format
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    const dateString = nextMonth.toISOString().split('T')[0];
    
    // Return a minimal valid timeline
    return {
      estimatedDuration: 'Timeline parsing failed',
      milestones: [{
        name: 'Project completion',
        date: dateString,
        tasks: [],
        description: 'Timeline generation failed, manual planning required'
      }]
    };
  }
}