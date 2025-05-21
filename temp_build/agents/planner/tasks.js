"use strict";
/**
 * Task generation functionality for the Planner Agent
 * Generates actionable tasks based on project analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTasks = void 0;
const uuid_1 = require("uuid");
const claude_1 = require("../common/claude");
/**
 * Generates a list of actionable tasks based on project analysis
 */
async function generateTasks(analysis, project, options = {}) {
    try {
        // Create a detailed task generation prompt for Claude
        const taskPrompt = createTaskGenerationPrompt(analysis, project, options);
        // Get task list from Claude
        const taskResult = await (0, claude_1.modelRequest)({
            model: 'claude-3-sonnet-20240229',
            prompt: taskPrompt,
            temperature: 0.1,
            maxTokens: 4000,
        });
        // Parse the response into structured tasks
        return parseTaskResponse(taskResult);
    }
    catch (error) {
        console.error('Task generation failed:', error);
        throw new Error(`Task generation failed: ${error.message}`);
    }
}
exports.generateTasks = generateTasks;
/**
 * Creates a detailed prompt for task generation
 */
function createTaskGenerationPrompt(analysis, project, options) {
    return `
You are an expert project planner specializing in breaking down projects into clear, actionable tasks. Based on the project details and analysis below, generate a comprehensive list of tasks.

PROJECT NAME: ${project.name}

PROJECT DESCRIPTION:
${project.description}

PROJECT OBJECTIVES:
${project.objectives.map(obj => `- ${obj}`).join('\n')}

PROJECT ANALYSIS:
- Summary: ${analysis.summary}
- Components: ${analysis.components.join(', ')}
${analysis.dependencies.length > 0 ?
        `- Dependencies:\n${analysis.dependencies.map(d => `  * ${d.from} → ${d.to}${d.description ? `: ${d.description}` : ''}`).join('\n')}` : ''}
${analysis.risks ?
        `- Risks:\n${analysis.risks.map(r => `  * ${r.description} (Impact: ${r.impact}, Probability: ${r.probability})`).join('\n')}` : ''}

TASK GENERATION REQUIREMENTS:
- Create ${options.maxTaskCount || 'around 10-15'} well-defined, actionable tasks
- Each task should have a clear outcome and be completable in 1-3 days
- Prioritize tasks based on dependencies and business value
- Assign story points using the Fibonacci scale (1, 2, 3, 5, 8, 13) based on complexity
- Consider both technical implementation and business objectives
${options.detailLevel === 'high' ? '- Include detailed specifications for high-priority tasks' : ''}

Please provide the tasks in JSON format as an array of objects with the following properties:
- id: A unique identifier (string)
- name: Short, descriptive task name (string)
- description: Detailed description of what needs to be done (string)
- priority: "high", "medium", or "low" (string)
- effort: Story points (number: 1, 2, 3, 5, 8, or 13)
- dependencies: Array of task IDs that must be completed before this task (array of strings)
${options.detailLevel === 'high' ? '- specifications: Detailed implementation notes (string)' : ''}

Return only valid JSON without explanations or markdown formatting.
`;
}
/**
 * Parses the Claude response into structured Task objects
 */
function parseTaskResponse(response) {
    try {
        // Extract JSON from the response (handling potential text wrapping)
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
            response.match(/```\s*([\s\S]*?)\s*```/) ||
            response.match(/(\[[\s\S]*\])/);
        const jsonString = jsonMatch ? jsonMatch[1] : response;
        // Parse the JSON
        const parsedTasks = JSON.parse(jsonString);
        // Validate and structure the response
        const tasks = parsedTasks.map((task) => ({
            id: task.id || (0, uuid_1.v4)(),
            name: task.name,
            description: task.description,
            priority: task.priority || 'medium',
            effort: task.effort || 3,
            dependencies: task.dependencies || [],
            assignedTo: task.assignedTo,
            specifications: task.specifications,
            status: task.status || 'pending',
        }));
        return tasks;
    }
    catch (error) {
        console.error('Failed to parse task response:', error);
        console.debug('Raw response:', response);
        // Return a minimal valid task list
        return [{
                id: (0, uuid_1.v4)(),
                name: 'Review project and generate tasks manually',
                description: 'The automated task generation failed. Please review the project and generate tasks manually.',
                priority: 'high',
                effort: 5,
                dependencies: [],
                status: 'pending'
            }];
    }
}
