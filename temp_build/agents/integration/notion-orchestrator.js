"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionOrchestratorIntegration = void 0;
/**
 * Integration between Notion Agent and Orchestrator Agent
 * Enables documentation and tracking of workflow executions in Notion
 */
class NotionOrchestratorIntegration {
    /**
     * Create a new NotionOrchestratorIntegration instance
     * @param orchestrator OrchestratorAgent instance
     * @param notion NotionAgent instance
     */
    constructor(orchestrator, notion) {
        // Template IDs (would be configured in a real implementation)
        this.workflowTemplatePage = '';
        this.executionTemplatePage = '';
        this.dashboardPage = '';
        this.agentPerformancePage = '';
        this.orchestrator = orchestrator;
        this.notion = notion;
    }
    /**
     * Document a workflow execution in Notion
     * @param execution Execution context
     * @returns Documentation result
     */
    async documentWorkflowExecution(execution) {
        try {
            // Get execution status
            const status = await this.orchestrator.getExecutionStatus(execution.id);
            // Create the content
            const content = [
                {
                    type: 'heading_1',
                    content: `Workflow Execution: ${execution.workflowName}`
                },
                {
                    type: 'paragraph',
                    content: `Execution ID: ${execution.id}`
                },
                {
                    type: 'heading_2',
                    content: 'Status'
                },
                {
                    type: 'paragraph',
                    content: `Status: ${status.status}`
                },
                {
                    type: 'paragraph',
                    content: `Progress: ${Math.round(status.progress * 100)}%`
                },
                {
                    type: 'paragraph',
                    content: `Start Time: ${execution.startTime}`
                },
                {
                    type: 'paragraph',
                    content: execution.endTime ? `End Time: ${execution.endTime}` : 'End Time: Still running'
                },
                {
                    type: 'heading_2',
                    content: 'Steps'
                },
                ...execution.currentSteps.map(step => ({
                    type: 'paragraph',
                    content: `${step.stepName} (${step.status})`
                })),
                {
                    type: 'heading_2',
                    content: 'Input'
                },
                {
                    type: 'code',
                    language: 'json',
                    content: JSON.stringify(execution.input, null, 2)
                }
            ];
            // Add output if available
            if (execution.output) {
                content.push({
                    type: 'heading_2',
                    content: 'Output'
                }, {
                    type: 'code',
                    language: 'json',
                    content: JSON.stringify(execution.output, null, 2)
                });
            }
            // Add error if available
            if (execution.error) {
                content.push({
                    type: 'heading_2',
                    content: 'Error'
                }, {
                    type: 'paragraph',
                    content: execution.error.message
                }, {
                    type: 'code',
                    language: 'text',
                    content: execution.error.stack || 'No stack trace available'
                });
            }
            // Create a page using a template if available
            let page;
            if (this.executionTemplatePage) {
                page = await this.notion.pageOperations.createPageFromTemplate(this.executionTemplatePage, {
                    title: `Execution: ${execution.workflowName} (${execution.id.substr(0, 8)})`,
                    properties: {
                        'Status': status.status,
                        'Progress': `${Math.round(status.progress * 100)}%`,
                        'Start Time': execution.startTime,
                        'End Time': execution.endTime || 'Running',
                        'Duration': `${Math.round(status.duration / 1000)}s`
                    }
                });
                // Add content to the page
                for (const block of content) {
                    await this.notion.blockOperations.addBlock(page.id, block);
                }
            }
            else {
                // Create a new page directly
                page = await this.notion.pageOperations.createPage({
                    title: `Execution: ${execution.workflowName} (${execution.id.substr(0, 8)})`,
                    content
                });
            }
            return page;
        }
        catch (error) {
            console.error('Error documenting workflow execution:', error);
            throw new Error(`Failed to document workflow execution: ${error.message}`);
        }
    }
    /**
     * Store a workflow definition in Notion
     * @param workflow Workflow to store
     * @returns Notion page
     */
    async storeWorkflowDefinition(workflow) {
        try {
            // Create the content
            const content = [
                {
                    type: 'heading_1',
                    content: `Workflow: ${workflow.name}`
                },
                {
                    type: 'paragraph',
                    content: workflow.description || 'No description provided'
                },
                {
                    type: 'paragraph',
                    content: `Version: ${workflow.version || '1.0.0'}`
                },
                {
                    type: 'heading_2',
                    content: 'Steps'
                },
                ...workflow.steps.map(step => ({
                    type: 'heading_3',
                    content: `${step.name} (${step.type})`
                }))
            ];
            // Add steps details
            for (const step of workflow.steps) {
                content.push({
                    type: 'paragraph',
                    content: `ID: ${step.id}`
                }, {
                    type: 'paragraph',
                    content: `Type: ${step.type}`
                });
                if (step.capability) {
                    content.push({
                        type: 'paragraph',
                        content: `Capability: ${step.capability}`
                    });
                }
                if (step.next) {
                    content.push({
                        type: 'paragraph',
                        content: `Next: ${typeof step.next === 'string' ? step.next : 'Complex next expression'}`
                    });
                }
                // Add divider
                content.push({
                    type: 'divider'
                });
            }
            // Add full definition
            content.push({
                type: 'heading_2',
                content: 'Full Definition'
            }, {
                type: 'code',
                language: 'json',
                content: JSON.stringify(workflow, null, 2)
            });
            // Create a page using a template if available
            let page;
            if (this.workflowTemplatePage) {
                page = await this.notion.pageOperations.createPageFromTemplate(this.workflowTemplatePage, {
                    title: `Workflow: ${workflow.name}`,
                    properties: {
                        'Version': workflow.version || '1.0.0',
                        'Status': workflow.status,
                        'Created': workflow.createdAt,
                        'Updated': workflow.updatedAt,
                        'Steps': workflow.steps.length.toString()
                    }
                });
                // Add content to the page
                for (const block of content) {
                    await this.notion.blockOperations.addBlock(page.id, block);
                }
            }
            else {
                // Create a new page directly
                page = await this.notion.pageOperations.createPage({
                    title: `Workflow: ${workflow.name}`,
                    content
                });
            }
            return page;
        }
        catch (error) {
            console.error('Error storing workflow definition:', error);
            throw new Error(`Failed to store workflow definition: ${error.message}`);
        }
    }
    /**
     * Create an execution dashboard in Notion
     * @returns Dashboard page
     */
    async createExecutionDashboard() {
        try {
            // Get active executions
            const activeExecutions = await this.orchestrator.listActiveExecutions();
            // Get all workflows
            const workflows = await this.orchestrator.listWorkflows();
            // Create metrics tables
            const content = [
                {
                    type: 'heading_1',
                    content: 'Workflow Execution Dashboard'
                },
                {
                    type: 'paragraph',
                    content: `Last updated: ${new Date().toISOString()}`
                },
                {
                    type: 'heading_2',
                    content: 'Active Executions'
                },
                {
                    type: 'table',
                    headers: ['ID', 'Workflow', 'Status', 'Progress', 'Duration'],
                    rows: activeExecutions.map(exec => [
                        exec.id.substr(0, 8),
                        exec.workflowName,
                        exec.status,
                        `${Math.round(exec.progress * 100)}%`,
                        `${Math.round(exec.duration / 1000)}s`
                    ])
                },
                {
                    type: 'heading_2',
                    content: 'Workflows'
                },
                {
                    type: 'table',
                    headers: ['Name', 'Version', 'Status', 'Steps', 'Last Updated'],
                    rows: workflows.map(wf => [
                        wf.name,
                        wf.version || '1.0.0',
                        wf.status,
                        wf.stepCount.toString(),
                        wf.updatedAt
                    ])
                }
            ];
            // Create a page using a template if available
            let page;
            if (this.dashboardPage) {
                // Update existing dashboard
                page = { id: this.dashboardPage };
                // Clear existing content
                await this.notion.blockOperations.deleteAllChildren(this.dashboardPage);
                // Add new content
                for (const block of content) {
                    await this.notion.blockOperations.addBlock(this.dashboardPage, block);
                }
            }
            else {
                // Create a new dashboard page
                page = await this.notion.pageOperations.createPage({
                    title: 'Workflow Execution Dashboard',
                    content
                });
                // Store the dashboard page ID for future updates
                this.dashboardPage = page.id;
            }
            return page;
        }
        catch (error) {
            console.error('Error creating execution dashboard:', error);
            throw new Error(`Failed to create execution dashboard: ${error.message}`);
        }
    }
    /**
     * Track agent performance in Notion
     * @returns Performance tracking page
     */
    async trackAgentPerformance() {
        try {
            // Get all agents
            const agents = await this.orchestrator.listAgents();
            // Create content for the performance page
            const content = [
                {
                    type: 'heading_1',
                    content: 'Agent Performance Tracking'
                },
                {
                    type: 'paragraph',
                    content: `Last updated: ${new Date().toISOString()}`
                },
                {
                    type: 'heading_2',
                    content: 'Agent Status'
                },
                {
                    type: 'table',
                    headers: ['ID', 'Name', 'Type', 'Status', 'Load', 'Success Rate', 'Tasks', 'Last Seen'],
                    rows: agents.map(agent => [
                        agent.id.substr(0, 8),
                        agent.name,
                        agent.type,
                        agent.status,
                        `${Math.round(agent.loadFactor * 100)}%`,
                        `${Math.round(agent.successRate * 100)}%`,
                        agent.taskCount.toString(),
                        agent.lastSeenTime
                    ])
                }
            ];
            // Add per-agent sections
            for (const agent of agents) {
                content.push({
                    type: 'heading_2',
                    content: `${agent.name} Performance`
                }, {
                    type: 'paragraph',
                    content: `Type: ${agent.type}`
                }, {
                    type: 'paragraph',
                    content: `Status: ${agent.status}`
                }, {
                    type: 'paragraph',
                    content: `Load Factor: ${Math.round(agent.loadFactor * 100)}%`
                }, {
                    type: 'paragraph',
                    content: `Success Rate: ${Math.round(agent.successRate * 100)}%`
                }, {
                    type: 'paragraph',
                    content: `Task Count: ${agent.taskCount}`
                }, {
                    type: 'paragraph',
                    content: `Average Task Duration: ${Math.round(agent.averageTaskDuration / 1000)}s`
                }, {
                    type: 'paragraph',
                    content: `Last Seen: ${agent.lastSeenTime}`
                }, {
                    type: 'paragraph',
                    content: `Capabilities: ${agent.capabilities.join(', ')}`
                }, {
                    type: 'divider'
                });
            }
            // Create a page using a template if available
            let page;
            if (this.agentPerformancePage) {
                // Update existing page
                page = { id: this.agentPerformancePage };
                // Clear existing content
                await this.notion.blockOperations.deleteAllChildren(this.agentPerformancePage);
                // Add new content
                for (const block of content) {
                    await this.notion.blockOperations.addBlock(this.agentPerformancePage, block);
                }
            }
            else {
                // Create a new page
                page = await this.notion.pageOperations.createPage({
                    title: 'Agent Performance Tracking',
                    content
                });
                // Store the page ID for future updates
                this.agentPerformancePage = page.id;
            }
            return page;
        }
        catch (error) {
            console.error('Error tracking agent performance:', error);
            throw new Error(`Failed to track agent performance: ${error.message}`);
        }
    }
}
exports.NotionOrchestratorIntegration = NotionOrchestratorIntegration;
