"use strict";
/**
 * Project analysis functionality for the Planner Agent
 * Analyzes a project to identify components, dependencies, and risks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProject = void 0;
const claude_1 = require("../common/claude");
/**
 * Analyzes a project to identify components, dependencies, and potential risks
 */
async function analyzeProject(project) {
    try {
        // Create a detailed analysis prompt for Claude
        const analysisPrompt = createAnalysisPrompt(project);
        // Get analysis from Claude
        const analysisResult = await (0, claude_1.modelRequest)({
            model: 'claude-3-sonnet-20240229',
            prompt: analysisPrompt,
            temperature: 0.2,
            maxTokens: 4000,
        });
        // Parse the response into structured analysis
        return parseAnalysisResponse(analysisResult);
    }
    catch (error) {
        console.error('Project analysis failed:', error);
        throw new Error(`Project analysis failed: ${error.message}`);
    }
}
exports.analyzeProject = analyzeProject;
/**
 * Creates a detailed prompt for project analysis
 */
function createAnalysisPrompt(project) {
    return `
You are an expert project planner and system architect. Analyze the following project and identify its main components, dependencies between components, and potential risks.

PROJECT NAME: ${project.name}

PROJECT DESCRIPTION:
${project.description}

PROJECT OBJECTIVES:
${project.objectives.map(obj => `- ${obj}`).join('\n')}

${project.constraints ? `CONSTRAINTS:\n${project.constraints.map(c => `- ${c}`).join('\n')}\n` : ''}
${project.priorities ? `PRIORITIES:\n${project.priorities.map(p => `- ${p}`).join('\n')}\n` : ''}
${project.context?.currentStatus ? `CURRENT STATUS:\n${project.context.currentStatus}\n` : ''}
${project.context?.relatedProjects ? `RELATED PROJECTS:\n${project.context.relatedProjects.map(p => `- ${p}`).join('\n')}\n` : ''}
${project.context?.availableResources ? `AVAILABLE RESOURCES:\n${project.context.availableResources.map(r => `- ${r}`).join('\n')}\n` : ''}

Please provide a structured analysis in JSON format with the following sections:
1. summary: A concise summary of the project
2. components: An array of main components or work areas identified in the project
3. dependencies: An array of dependencies between components, each with "from" and "to" properties
4. risks: An array of potential risks, each with "description", "impact" (high/medium/low), and "probability" (high/medium/low)

Return only valid JSON without explanations or markdown formatting.
`;
}
/**
 * Parses the Claude response into a structured Analysis object
 */
function parseAnalysisResponse(response) {
    try {
        // Extract JSON from the response (handling potential text wrapping)
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
            response.match(/```\s*([\s\S]*?)\s*```/) ||
            response.match(/({[\s\S]*})/);
        const jsonString = jsonMatch ? jsonMatch[1] : response;
        // Parse the JSON
        const parsedAnalysis = JSON.parse(jsonString);
        // Validate and structure the response
        const analysis = {
            summary: parsedAnalysis.summary || 'No summary provided',
            components: parsedAnalysis.components || [],
            dependencies: (parsedAnalysis.dependencies || []).map((dep) => ({
                from: dep.from,
                to: dep.to,
                type: dep.type || 'hard',
                description: dep.description,
            })),
            risks: parsedAnalysis.risks ? (parsedAnalysis.risks || []).map((risk) => ({
                description: risk.description,
                impact: risk.impact || 'medium',
                probability: risk.probability || 'medium',
                mitigation: risk.mitigation,
            })) : undefined,
        };
        return analysis;
    }
    catch (error) {
        console.error('Failed to parse analysis response:', error);
        console.debug('Raw response:', response);
        // Return a minimal valid analysis
        return {
            summary: 'Failed to parse analysis response',
            components: ['Error component'],
            dependencies: [],
            risks: [{
                    description: 'Analysis parsing failed',
                    impact: 'high',
                    probability: 'high',
                    mitigation: 'Manual review required'
                }]
        };
    }
}
