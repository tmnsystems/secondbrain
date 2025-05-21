/**
 * PlannerAgent - Core module for project planning and task management
 * 
 * The Planner Agent is responsible for:
 * 1. Breaking down complex projects into actionable tasks
 * 2. Prioritizing work based on dependencies and business value
 * 3. Creating detailed specifications for implementation
 * 4. Tracking progress and updating project documentation
 * 5. Integrating with Notion for knowledge management
 */

import type { Project, Task, Timeline, PlannerOptions, PlannerResponse } from './types';
import { analyzeProject } from './analysis';
import { generateTasks } from './tasks';
import { createTimeline } from './timeline';
import { createSpecifications } from './specifications';
import { validatePlan } from './validation';
import { savePlanToNotion } from '../notion';

/**
 * Main entry point for the Planner Agent
 * Takes a project description and options, returns a comprehensive plan
 */
export async function planProject(
  project: Project,
  options: PlannerOptions = {}
): Promise<PlannerResponse> {
  try {
    // 1. Analyze the project to identify components and dependencies
    const analysis = await analyzeProject(project);
    
    // 2. Generate tasks based on the analysis
    const tasks = await generateTasks(analysis, project, options);
    
    // 3. Create a timeline with milestones if requested
    const timeline = options.timelineRequired 
      ? await createTimeline(tasks, project) 
      : undefined;
    
    // 4. Generate detailed specifications for high-priority tasks
    const specifications = options.detailLevel === 'high' 
      ? await createSpecifications(tasks, project) 
      : undefined;
    
    // 5. Validate the plan for completeness and consistency
    const validationResult = validatePlan({
      analysis,
      tasks,
      timeline,
      specifications
    });
    
    // 6. Save to Notion if requested
    let notionIntegration;
    if (options.saveToNotion) {
      try {
        const { projectId, taskIds } = await savePlanToNotion(
          project, 
          tasks, 
          timeline, 
          specifications
        );
        
        notionIntegration = {
          projectId,
          taskIds,
          // Generate Notion URL
          projectUrl: projectId ? `https://notion.so/${projectId.replace(/-/g, '')}` : undefined
        };
      } catch (error) {
        console.error('Failed to save plan to Notion:', error);
      }
    }
    
    // 7. Return the comprehensive plan
    return {
      analysis,
      tasks,
      timeline,
      specifications,
      validation: validationResult,
      notion: notionIntegration
    };
  } catch (error) {
    console.error('Error in Planner Agent:', error);
    throw new Error(`Planner Agent failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export main types and functions
export * from './types';
export { analyzeProject } from './analysis';
export { generateTasks } from './tasks';
export { createTimeline } from './timeline';
export { createSpecifications } from './specifications';