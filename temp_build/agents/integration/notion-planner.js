"use strict";
/**
 * Notion-Planner Integration
 *
 * This module integrates the Notion Agent with the Planner Agent to enable
 * storing and managing project plans, tasks, and dependencies in Notion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionPlannerIntegration = void 0;
class NotionPlannerIntegration {
    constructor(notion, planner, config) {
        this.notion = notion;
        this.planner = planner;
        this.config = config;
    }
    /**
     * Save a project plan to Notion
     */
    async saveProjectPlan(project) {
        try {
            // Create a page in the Projects database
            const projectPage = await this.notion.createPage({
                parent: { database_id: this.config.projectsDatabaseId },
                properties: {
                    Name: { title: [{ text: { content: project.name } }] },
                    Description: { rich_text: [{ text: { content: project.description || '' } }] },
                    Status: { select: { name: 'Planning' } },
                    Priority: { select: { name: project.priority || 'Medium' } }
                }
            });
            // Add project details as blocks
            await this.notion.createBlocks(projectPage.id, [
                {
                    type: 'heading_1',
                    heading_1: {
                        rich_text: [{ type: 'text', text: { content: project.name } }]
                    }
                },
                {
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: project.description || '' } }]
                    }
                },
                {
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ type: 'text', text: { content: 'Project Details' } }]
                    }
                }
            ]);
            // Save tasks
            const taskIds = {};
            for (const task of project.tasks || []) {
                const taskPage = await this.saveTask(task, projectPage.id);
                taskIds[task.id] = taskPage.id;
            }
            // Save dependencies
            for (const task of project.tasks || []) {
                if (task.dependencies && task.dependencies.length > 0) {
                    await this.saveDependencies(taskIds[task.id], task.dependencies.map(depId => taskIds[depId]));
                }
            }
            return {
                projectId: projectPage.id,
                taskIds
            };
        }
        catch (error) {
            console.error('Failed to save project plan to Notion:', error);
            throw error;
        }
    }
    /**
     * Save a task to Notion
     */
    async saveTask(task, projectId) {
        try {
            return await this.notion.createPage({
                parent: { database_id: this.config.tasksDatabaseId },
                properties: {
                    Name: { title: [{ text: { content: task.name } }] },
                    Description: { rich_text: [{ text: { content: task.description || '' } }] },
                    Status: { select: { name: task.status || 'Not Started' } },
                    Priority: { select: { name: task.priority || 'Medium' } },
                    Project: { relation: [{ id: projectId }] },
                    Type: { select: { name: task.type || 'Task' } }
                }
            });
        }
        catch (error) {
            console.error(`Failed to save task "${task.name}" to Notion:`, error);
            throw error;
        }
    }
    /**
     * Save task dependencies to Notion
     */
    async saveDependencies(taskId, dependencyIds) {
        try {
            // Update the task with its dependencies
            await this.notion.updatePage(taskId, {
                properties: {
                    Dependencies: {
                        relation: dependencyIds.map(id => ({ id }))
                    }
                }
            });
            // For each dependency, create an entry in the Dependencies database
            for (const dependencyId of dependencyIds) {
                await this.notion.createPage({
                    parent: { database_id: this.config.dependenciesDatabaseId },
                    properties: {
                        Name: { title: [{ text: { content: `Dependency ${taskId} -> ${dependencyId}` } }] },
                        Task: { relation: [{ id: taskId }] },
                        DependsOn: { relation: [{ id: dependencyId }] }
                    }
                });
            }
            return true;
        }
        catch (error) {
            console.error(`Failed to save dependencies for task ${taskId}:`, error);
            throw error;
        }
    }
    /**
     * Update task status in Notion
     */
    async updateTaskStatus(taskId, status) {
        try {
            await this.notion.updatePage(taskId, {
                properties: {
                    Status: { select: { name: status } }
                }
            });
            return true;
        }
        catch (error) {
            console.error(`Failed to update status for task ${taskId}:`, error);
            throw error;
        }
    }
    /**
     * Get all tasks for a project from Notion
     */
    async getProjectTasks(projectId) {
        try {
            const tasks = await this.notion.queryDatabase(this.config.tasksDatabaseId, {
                filter: {
                    property: 'Project',
                    relation: {
                        contains: projectId
                    }
                },
                sorts: [
                    {
                        property: 'Priority',
                        direction: 'descending'
                    }
                ]
            });
            return tasks.results;
        }
        catch (error) {
            console.error(`Failed to get tasks for project ${projectId}:`, error);
            throw error;
        }
    }
    /**
     * Generate a project report from Notion data
     */
    async generateProjectReport(projectId) {
        try {
            // Get the project page
            const project = await this.notion.getPage(projectId);
            // Get all tasks for the project
            const tasks = await this.getProjectTasks(projectId);
            // Extract project name
            // @ts-ignore - The properties typing is incomplete
            const projectName = project.properties.Name.title[0]?.plain_text || 'Unnamed Project';
            // Generate a report as markdown
            let report = `# ${projectName} - Project Report\n\n`;
            // Add project description
            // @ts-ignore - The properties typing is incomplete
            const description = project.properties.Description?.rich_text[0]?.plain_text || '';
            if (description) {
                report += `## Description\n\n${description}\n\n`;
            }
            // Add task summary
            report += `## Tasks\n\n`;
            // Group tasks by status
            const tasksByStatus = {};
            for (const task of tasks) {
                // @ts-ignore - The properties typing is incomplete
                const status = task.properties.Status?.select?.name || 'Unknown';
                // @ts-ignore - The properties typing is incomplete
                const name = task.properties.Name?.title[0]?.plain_text || 'Unnamed Task';
                if (!tasksByStatus[status]) {
                    tasksByStatus[status] = [];
                }
                tasksByStatus[status].push(name);
            }
            // Add tasks grouped by status
            for (const [status, taskNames] of Object.entries(tasksByStatus)) {
                report += `### ${status}\n\n`;
                for (const name of taskNames) {
                    report += `- ${name}\n`;
                }
                report += '\n';
            }
            return report;
        }
        catch (error) {
            console.error(`Failed to generate report for project ${projectId}:`, error);
            throw error;
        }
    }
}
exports.NotionPlannerIntegration = NotionPlannerIntegration;
exports.default = NotionPlannerIntegration;
