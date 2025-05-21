/**
 * Specification generation functionality for the Planner Agent
 * Creates detailed specifications for tasks or components
 */

import type { Project, Task, Specifications } from './types';
import { modelRequest } from '../common/claude';

/**
 * Creates detailed specifications for high-priority tasks
 */
export async function createSpecifications(
  tasks: Task[], 
  project: Project
): Promise<Specifications> {
  // Filter for high-priority tasks that need specifications
  const highPriorityTasks = tasks.filter(t => t.priority === 'high');
  
  if (highPriorityTasks.length === 0) {
    return {}; // No high-priority tasks to create specifications for
  }
  
  // Create specifications for each high-priority task
  const specifications: Specifications = {};
  
  for (const task of highPriorityTasks) {
    try {
      // Create a specification prompt for this task
      const specPrompt = createSpecificationPrompt(task, tasks, project);
      
      // Get specification from Claude
      const specResult = await modelRequest({
        model: 'claude-3-sonnet-20240229',
        prompt: specPrompt,
        temperature: 0.1,
        maxTokens: 4000,
      });
      
      // Add the specification to the result
      specifications[task.id] = cleanSpecificationResponse(specResult);
    } catch (error) {
      console.error(`Specification creation failed for task ${task.id}:`, error);
      specifications[task.id] = `Specification generation failed: ${error.message}`;
    }
  }
  
  return specifications;
}

/**
 * Creates a detailed prompt for specification generation
 */
function createSpecificationPrompt(task: Task, allTasks: Task[], project: Project): string {
  // Find direct dependencies for this task
  const dependencies = allTasks.filter(t => task.dependencies.includes(t.id));
  
  // Find tasks that depend on this task
  const dependents = allTasks.filter(t => t.dependencies.includes(task.id));
  
  return `
You are an expert system architect and technical specification writer. Create a detailed specification for the following task in the context of the project.

PROJECT NAME: ${project.name}

PROJECT DESCRIPTION:
${project.description}

TASK TO SPECIFY:
ID: ${task.id}
Name: ${task.name}
Description: ${task.description}
Priority: ${task.priority}
Effort: ${task.effort} story points

${dependencies.length > 0 ? 
  `DEPENDENCIES (Tasks this task depends on):
${dependencies.map(t => `- ${t.id}: ${t.name} - ${t.description}`).join('\n')}` : ''}

${dependents.length > 0 ? 
  `DEPENDENTS (Tasks that depend on this task):
${dependents.map(t => `- ${t.id}: ${t.name} - ${t.description}`).join('\n')}` : ''}

Create a comprehensive technical specification that covers:
1. Detailed requirements and acceptance criteria
2. Technical approach and implementation details
3. Interface definitions (API, UI, data models, etc. as applicable)
4. Testing considerations
5. Any assumptions or constraints

The specification should be detailed enough that a developer could implement the task based solely on this document.

Return the specification in a clear, structured format without any explanations or markdown formatting prefixes. Begin immediately with the specification content.
`;
}

/**
 * Cleans and formats the specification response
 */
function cleanSpecificationResponse(response: string): string {
  // Remove any potential markdown code block formatting
  const cleanedResponse = response
    .replace(/```\w*\n/g, '')  // Remove opening code block markers
    .replace(/```$/gm, '')     // Remove closing code block markers
    .trim();
  
  return cleanedResponse;
}