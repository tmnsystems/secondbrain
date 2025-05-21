"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpecifications = exports.createTimeline = exports.generateTasks = exports.analyzeProject = exports.planProject = void 0;
const analysis_1 = require("./analysis");
const tasks_1 = require("./tasks");
const timeline_1 = require("./timeline");
const specifications_1 = require("./specifications");
const validation_1 = require("./validation");
const notion_1 = require("../notion");
/**
 * Main entry point for the Planner Agent
 * Takes a project description and options, returns a comprehensive plan
 */
async function planProject(project, options = {}) {
    try {
        // 1. Analyze the project to identify components and dependencies
        const analysis = await (0, analysis_1.analyzeProject)(project);
        // 2. Generate tasks based on the analysis
        const tasks = await (0, tasks_1.generateTasks)(analysis, project, options);
        // 3. Create a timeline with milestones if requested
        const timeline = options.timelineRequired
            ? await (0, timeline_1.createTimeline)(tasks, project)
            : undefined;
        // 4. Generate detailed specifications for high-priority tasks
        const specifications = options.detailLevel === 'high'
            ? await (0, specifications_1.createSpecifications)(tasks, project)
            : undefined;
        // 5. Validate the plan for completeness and consistency
        const validationResult = (0, validation_1.validatePlan)({
            analysis,
            tasks,
            timeline,
            specifications
        });
        // 6. Save to Notion if requested
        let notionIntegration;
        if (options.saveToNotion) {
            try {
                const { projectId, taskIds } = await (0, notion_1.savePlanToNotion)(project, tasks, timeline, specifications);
                notionIntegration = {
                    projectId,
                    taskIds,
                    // Generate Notion URL
                    projectUrl: projectId ? `https://notion.so/${projectId.replace(/-/g, '')}` : undefined
                };
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Error in Planner Agent:', error);
        throw new Error(`Planner Agent failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
exports.planProject = planProject;
// Export main types and functions
__exportStar(require("./types"), exports);
var analysis_2 = require("./analysis");
Object.defineProperty(exports, "analyzeProject", { enumerable: true, get: function () { return analysis_2.analyzeProject; } });
var tasks_2 = require("./tasks");
Object.defineProperty(exports, "generateTasks", { enumerable: true, get: function () { return tasks_2.generateTasks; } });
var timeline_2 = require("./timeline");
Object.defineProperty(exports, "createTimeline", { enumerable: true, get: function () { return timeline_2.createTimeline; } });
var specifications_2 = require("./specifications");
Object.defineProperty(exports, "createSpecifications", { enumerable: true, get: function () { return specifications_2.createSpecifications; } });
