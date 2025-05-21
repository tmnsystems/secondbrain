"use strict";
/**
 * Notion integration for the Planner Agent
 * Provides functionality for reading from and writing to Notion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePlanToNotion = exports.createTimeline = exports.createSpecifications = exports.createDependencies = exports.createTasks = exports.createProject = exports.getNotionClient = exports.NotionAgent = void 0;
const agent_1 = require("./agent");
Object.defineProperty(exports, "NotionAgent", { enumerable: true, get: function () { return agent_1.NotionAgent; } });
const client_1 = require("@notionhq/client");
const config_1 = require("../common/config");
// Initialize Notion client
let notionClient = null;
/**
 * Get the Notion client instance
 */
function getNotionClient() {
    if (!notionClient) {
        if (!config_1.notionConfig.apiKey) {
            throw new Error('Notion API key is not configured');
        }
        notionClient = new client_1.Client({ auth: config_1.notionConfig.apiKey });
    }
    return notionClient;
}
exports.getNotionClient = getNotionClient;
/**
 * Creates a new project in Notion
 */
async function createProject(project) {
    const notion = getNotionClient();
    try {
        // Check if project database exists
        if (!config_1.notionConfig.projectDatabaseId) {
            throw new Error('Notion project database ID is not configured');
        }
        // Create the project page
        const response = await notion.pages.create({
            parent: {
                database_id: config_1.notionConfig.projectDatabaseId
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
        console.error('Failed to create project in Notion:', error);
        throw new Error(`Notion project creation failed: ${error.message}`);
    }
}
exports.createProject = createProject;
/**
 * Create tasks in Notion for a project
 */
async function createTasks(tasks, projectId) {
    const notion = getNotionClient();
    if (!config_1.notionConfig.taskDatabaseId) {
        throw new Error('Notion task database ID is not configured');
    }
    const taskIds = [];
    // Create each task
    for (const task of tasks) {
        try {
            // Create the task page
            const response = await notion.pages.create({
                parent: {
                    database_id: config_1.notionConfig.taskDatabaseId
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
            console.error(`Failed to create task "${task.name}" in Notion:`, error);
        }
    }
    // Now create dependencies
    await createDependencies(tasks);
    return taskIds;
}
exports.createTasks = createTasks;
/**
 * Create dependencies in Notion
 */
async function createDependencies(tasks) {
    const notion = getNotionClient();
    if (!config_1.notionConfig.dependencyDatabaseId) {
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
                        // Create a dependency entry
                        await notion.pages.create({
                            parent: {
                                database_id: config_1.notionConfig.dependencyDatabaseId
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
                        console.error(`Failed to create dependency for ${task.name} -> ${depTask.name}:`, error);
                    }
                }
            }
        }
    }
}
exports.createDependencies = createDependencies;
/**
 * Create detailed specifications in Notion
 */
async function createSpecifications(specifications, tasks, projectId) {
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
            }
            catch (error) {
                console.error(`Failed to update specifications for task "${task.name}" in Notion:`, error);
            }
        }
    }
}
exports.createSpecifications = createSpecifications;
/**
 * Create a timeline in Notion
 */
async function createTimeline(timeline, tasks, projectId) {
    const notion = getNotionClient();
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
    }
    catch (error) {
        console.error('Failed to create timeline in Notion:', error);
    }
}
exports.createTimeline = createTimeline;
/**
 * Save a complete plan to Notion
 */
async function savePlanToNotion(project, tasks, timeline, specifications) {
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
    }
    catch (error) {
        console.error('Failed to save plan to Notion:', error);
        throw new Error(`Notion plan creation failed: ${error.message}`);
    }
}
exports.savePlanToNotion = savePlanToNotion;
