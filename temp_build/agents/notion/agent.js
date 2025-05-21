"use strict";
/**
 * NotionAgent class that provides a comprehensive interface to the Notion API
 * based on the existing Notion integration functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionAgent = void 0;
const client_1 = require("@notionhq/client");
const config_1 = require("../common/config");
const agent_1 = require("../../common/agent");
class NotionAgent extends agent_1.AbstractAgent {
    constructor(config = {}) {
        super(config);
        this.client = null;
        this.config = {
            ...config_1.notionConfig,
            ...config
        };
    }
    /**
     * Initialize the Notion agent
     */
    async initialize() {
        if (!this.client) {
            if (!this.config.apiKey) {
                throw new Error('Notion API key is not configured');
            }
            this.client = new client_1.Client({ auth: this.config.apiKey });
        }
        this.logger.info('NotionAgent initialized successfully');
    }
    /**
     * Get the Notion client instance
     */
    getClient() {
        if (!this.client) {
            this.initialize();
        }
        return this.client;
    }
    /**
     * Create a new page in Notion
     */
    async createPage(params) {
        const client = this.getClient();
        try {
            const response = await client.pages.create(params);
            return response;
        }
        catch (error) {
            this.logger.error('Failed to create page in Notion:', error);
            throw error;
        }
    }
    /**
     * Create blocks in a page
     */
    async createBlocks(pageId, blocks) {
        const client = this.getClient();
        try {
            const response = await client.blocks.children.append({
                block_id: pageId,
                children: blocks
            });
            return response;
        }
        catch (error) {
            this.logger.error('Failed to create blocks in Notion:', error);
            throw error;
        }
    }
    /**
     * Query a database
     */
    async queryDatabase(databaseId, params = {}) {
        const client = this.getClient();
        try {
            const response = await client.databases.query({
                database_id: databaseId,
                ...params
            });
            return response;
        }
        catch (error) {
            this.logger.error('Failed to query database in Notion:', error);
            throw error;
        }
    }
    /**
     * Update a page
     */
    async updatePage(pageId, params) {
        const client = this.getClient();
        try {
            const response = await client.pages.update({
                page_id: pageId,
                ...params
            });
            return response;
        }
        catch (error) {
            this.logger.error('Failed to update page in Notion:', error);
            throw error;
        }
    }
    /**
     * Create a new project in Notion
     */
    async createProject(project) {
        try {
            // Check if project database exists
            if (!this.config.projectDatabaseId) {
                throw new Error('Notion project database ID is not configured');
            }
            // Create the project page
            const response = await this.createPage({
                parent: {
                    database_id: this.config.projectDatabaseId
                },
                properties: {
                    Name: {
                        title: [
                            {
                                text: {
                                    content: project.name
                                }
                            }
                        ]
                    },
                    Status: {
                        select: {
                            name: 'Planning'
                        }
                    },
                    Priority: {
                        select: {
                            name: project.priorities && project.priorities.length > 0 ? 'High' : 'Medium'
                        }
                    },
                    'Start Date': {
                        date: {
                            start: new Date().toISOString().split('T')[0]
                        }
                    },
                    Description: {
                        rich_text: [
                            {
                                text: {
                                    content: project.description.substring(0, 2000)
                                }
                            }
                        ]
                    },
                    Objectives: {
                        rich_text: [
                            {
                                text: {
                                    content: project.objectives.join('\n- ').substring(0, 2000)
                                }
                            }
                        ]
                    },
                    Constraints: {
                        rich_text: project.constraints ? [
                            {
                                text: {
                                    content: project.constraints.join('\n- ').substring(0, 2000)
                                }
                            }
                        ] : []
                    }
                },
                children: [
                    {
                        object: 'block',
                        heading_2: {
                            rich_text: [
                                {
                                    text: {
                                        content: 'Project Description'
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
                                        content: project.description
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        heading_2: {
                            rich_text: [
                                {
                                    text: {
                                        content: 'Objectives'
                                    }
                                }
                            ]
                        }
                    }
                ]
            });
            return response.id;
        }
        catch (error) {
            this.logger.error('Failed to create project in Notion:', error);
            throw new Error(`Notion project creation failed: ${error.message}`);
        }
    }
    /**
     * Create tasks in Notion for a project
     */
    async createTasks(tasks, projectId) {
        if (!this.config.taskDatabaseId) {
            throw new Error('Notion task database ID is not configured');
        }
        const taskIds = [];
        // Create each task
        for (const task of tasks) {
            try {
                // Create the task page
                const response = await this.createPage({
                    parent: {
                        database_id: this.config.taskDatabaseId
                    },
                    properties: {
                        Name: {
                            title: [
                                {
                                    text: {
                                        content: task.name
                                    }
                                }
                            ]
                        },
                        Status: {
                            select: {
                                name: 'Not Started'
                            }
                        },
                        Priority: {
                            select: {
                                name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
                            }
                        },
                        Project: {
                            relation: [
                                {
                                    id: projectId
                                }
                            ]
                        },
                        Effort: {
                            number: task.effort
                        },
                        Description: {
                            rich_text: [
                                {
                                    text: {
                                        content: task.description.substring(0, 2000)
                                    }
                                }
                            ]
                        }
                    },
                    children: [
                        {
                            object: 'block',
                            heading_2: {
                                rich_text: [
                                    {
                                        text: {
                                            content: 'Task Description'
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
                                            content: task.description
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                });
                // Store the created task ID along with our internal ID
                taskIds.push(response.id);
                // Update our task object with the Notion page ID
                task.notionId = response.id;
            }
            catch (error) {
                this.logger.error(`Failed to create task "${task.name}" in Notion:`, error);
            }
        }
        // Now create dependencies
        await this.createDependencies(tasks);
        return taskIds;
    }
    /**
     * Create dependencies in Notion
     */
    async createDependencies(tasks) {
        if (!this.config.dependencyDatabaseId) {
            this.logger.warn('Dependency database ID not configured, skipping dependencies');
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
                            // Create a dependency entry
                            await this.createPage({
                                parent: {
                                    database_id: this.config.dependencyDatabaseId
                                },
                                properties: {
                                    Name: {
                                        title: [
                                            {
                                                text: {
                                                    content: `${task.name} depends on ${depTask.name}`
                                                }
                                            }
                                        ]
                                    },
                                    'Task': {
                                        relation: [
                                            {
                                                id: task.notionId
                                            }
                                        ]
                                    },
                                    'Depends On': {
                                        relation: [
                                            {
                                                id: depTask.notionId
                                            }
                                        ]
                                    }
                                }
                            });
                        }
                        catch (error) {
                            this.logger.error(`Failed to create dependency for ${task.name} -> ${depTask.name}:`, error);
                        }
                    }
                }
            }
        }
    }
    /**
     * Create detailed specifications in Notion
     */
    async createSpecifications(specifications, tasks, projectId) {
        for (const [taskId, spec] of Object.entries(specifications)) {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.notionId) {
                try {
                    // Update the task with specifications
                    await this.updatePage(task.notionId, {
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
                    await this.createBlocks(task.notionId, [
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
                    ]);
                }
                catch (error) {
                    this.logger.error(`Failed to update specifications for task "${task.name}" in Notion:`, error);
                }
            }
        }
    }
    /**
     * Create a timeline in Notion
     */
    async createTimeline(timeline, tasks, projectId) {
        try {
            // Create timeline blocks
            const timelineBlocks = [
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
            await this.createBlocks(projectId, timelineBlocks);
            // Update project end date based on final milestone
            if (timeline.milestones.length > 0) {
                const lastMilestone = timeline.milestones[timeline.milestones.length - 1];
                await this.updatePage(projectId, {
                    properties: {
                        'End Date': {
                            date: {
                                start: lastMilestone.date
                            }
                        }
                    }
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to create timeline in Notion:', error);
        }
    }
    /**
     * Save a complete plan to Notion
     */
    async savePlanToNotion(project, tasks, timeline, specifications) {
        try {
            // 1. Create the project
            const projectId = await this.createProject(project);
            this.logger.info(`Created project in Notion with ID: ${projectId}`);
            // 2. Create the tasks
            const taskIds = await this.createTasks(tasks, projectId);
            this.logger.info(`Created ${taskIds.length} tasks in Notion`);
            // 3. Create specifications if available
            if (specifications) {
                await this.createSpecifications(specifications, tasks, projectId);
                this.logger.info(`Added specifications to tasks in Notion`);
            }
            // 4. Create timeline if available
            if (timeline) {
                await this.createTimeline(timeline, tasks, projectId);
                this.logger.info(`Added timeline to project in Notion`);
            }
            return { projectId, taskIds };
        }
        catch (error) {
            this.logger.error('Failed to save plan to Notion:', error);
            throw new Error(`Notion plan creation failed: ${error.message}`);
        }
    }
    /**
     * Execute a task on the agent
     */
    async executeTask(task) {
        this.logger.debug(`NotionAgent executing task: ${task.type}`);
        switch (task.type) {
            case 'createProject':
                return this.createProject(task.project);
            case 'createTasks':
                return this.createTasks(task.tasks, task.projectId);
            case 'savePlan':
                return this.savePlanToNotion(task.project, task.tasks, task.timeline, task.specifications);
            case 'createPage':
                return this.createPage(task.params);
            case 'createBlocks':
                return this.createBlocks(task.pageId, task.blocks);
            case 'queryDatabase':
                return this.queryDatabase(task.databaseId, task.params);
            case 'updatePage':
                return this.updatePage(task.pageId, task.params);
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    }
}
exports.NotionAgent = NotionAgent;
