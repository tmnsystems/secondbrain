"use strict";
/**
 * Notion-Executor Integration
 *
 * This module integrates the Notion Agent with the Executor Agent to enable
 * logging execution results, system operations, and deployment status in Notion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionExecutorIntegration = void 0;
class NotionExecutorIntegration {
    constructor(notion, executor, config) {
        this.notion = notion;
        this.executor = executor;
        this.config = config;
    }
    /**
     * Log command execution in Notion
     */
    async logExecution(execution) {
        try {
            const timestamp = execution.timestamp || new Date();
            // Create a log entry in the Execution Log database
            const logEntry = await this.notion.createPage({
                parent: { database_id: this.config.executionLogDatabaseId },
                properties: {
                    Command: { title: [{ text: { content: execution.command } }] },
                    Success: { checkbox: execution.success },
                    ExecutionTime: { number: execution.executionTime },
                    Timestamp: { date: { start: timestamp.toISOString() } }
                }
            });
            // Add output and error as blocks
            await this.notion.createBlocks(logEntry.id, [
                {
                    type: 'heading_3',
                    heading_3: {
                        rich_text: [{ type: 'text', text: { content: 'Output' } }]
                    }
                },
                {
                    type: 'code',
                    code: {
                        rich_text: [{ type: 'text', text: { content: execution.output || 'No output' } }],
                        language: 'bash'
                    }
                }
            ]);
            // Add error if present
            if (execution.error) {
                await this.notion.createBlocks(logEntry.id, [
                    {
                        type: 'heading_3',
                        heading_3: {
                            rich_text: [{ type: 'text', text: { content: 'Error' } }]
                        }
                    },
                    {
                        type: 'code',
                        code: {
                            rich_text: [{ type: 'text', text: { content: execution.error } }],
                            language: 'bash'
                        }
                    }
                ]);
            }
            return logEntry;
        }
        catch (error) {
            console.error('Failed to log execution to Notion:', error);
            throw error;
        }
    }
    /**
     * Log deployment in Notion
     */
    async logDeployment(deployment) {
        try {
            const timestamp = deployment.timestamp || new Date();
            // Create a log entry in the Deployments Log database
            const deploymentEntry = await this.notion.createPage({
                parent: { database_id: this.config.deploymentsLogDatabaseId },
                properties: {
                    Project: { title: [{ text: { content: deployment.project } }] },
                    Environment: { select: { name: deployment.environment } },
                    Success: { checkbox: deployment.success },
                    DeploymentTime: { number: deployment.deploymentTime },
                    Timestamp: { date: { start: timestamp.toISOString() } },
                    Version: { rich_text: [{ text: { content: deployment.version || 'Unknown' } }] }
                }
            });
            // Add logs and error as blocks
            await this.notion.createBlocks(deploymentEntry.id, [
                {
                    type: 'heading_3',
                    heading_3: {
                        rich_text: [{ type: 'text', text: { content: 'Deployment Logs' } }]
                    }
                },
                {
                    type: 'code',
                    code: {
                        rich_text: [{ type: 'text', text: { content: deployment.logs || 'No logs available' } }],
                        language: 'bash'
                    }
                }
            ]);
            // Add error if present
            if (deployment.error) {
                await this.notion.createBlocks(deploymentEntry.id, [
                    {
                        type: 'heading_3',
                        heading_3: {
                            rich_text: [{ type: 'text', text: { content: 'Error' } }]
                        }
                    },
                    {
                        type: 'code',
                        code: {
                            rich_text: [{ type: 'text', text: { content: deployment.error } }],
                            language: 'bash'
                        }
                    }
                ]);
            }
            return deploymentEntry;
        }
        catch (error) {
            console.error('Failed to log deployment to Notion:', error);
            throw error;
        }
    }
    /**
     * Log system metrics in Notion
     */
    async logSystemMetrics(metrics) {
        try {
            const timestamp = metrics.timestamp || new Date();
            // Create a log entry in the System Metrics database
            const metricsEntry = await this.notion.createPage({
                parent: { database_id: this.config.systemMetricsDatabaseId },
                properties: {
                    Timestamp: { title: [{ text: { content: timestamp.toISOString() } }] },
                    CPU: { number: metrics.cpu !== undefined ? metrics.cpu : null },
                    Memory: { number: metrics.memory !== undefined ? metrics.memory : null },
                    Disk: { number: metrics.disk !== undefined ? metrics.disk : null },
                    Network: { number: metrics.network !== undefined ? metrics.network : null },
                    Processes: { number: metrics.processes !== undefined ? metrics.processes : null }
                }
            });
            // Add notes if present
            if (metrics.notes) {
                await this.notion.createBlocks(metricsEntry.id, [
                    {
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [{ type: 'text', text: { content: metrics.notes } }]
                        }
                    }
                ]);
            }
            return metricsEntry;
        }
        catch (error) {
            console.error('Failed to log system metrics to Notion:', error);
            throw error;
        }
    }
    /**
     * Create a system health report in Notion
     */
    async createSystemHealthReport() {
        try {
            // Get the latest system metrics
            const latestMetrics = await this.notion.queryDatabase(this.config.systemMetricsDatabaseId, {
                sorts: [
                    {
                        property: 'Timestamp',
                        direction: 'descending'
                    }
                ],
                page_size: 10
            });
            // Get the latest deployments
            const latestDeployments = await this.notion.queryDatabase(this.config.deploymentsLogDatabaseId, {
                sorts: [
                    {
                        property: 'Timestamp',
                        direction: 'descending'
                    }
                ],
                page_size: 5
            });
            // Create a new page for the report
            const reportPage = await this.notion.createPage({
                parent: { database_id: this.config.systemMetricsDatabaseId },
                properties: {
                    Timestamp: { title: [{ text: { content: `System Health Report - ${new Date().toISOString()}` } }] }
                }
            });
            // Add report content
            await this.notion.createBlocks(reportPage.id, [
                {
                    type: 'heading_1',
                    heading_1: {
                        rich_text: [{ type: 'text', text: { content: 'System Health Report' } }]
                    }
                },
                {
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: `Generated on ${new Date().toLocaleString()}` } }]
                    }
                },
                {
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ type: 'text', text: { content: 'Recent System Metrics' } }]
                    }
                },
                {
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: `Showing the ${latestMetrics.results.length} most recent metrics` } }]
                    }
                },
                {
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ type: 'text', text: { content: 'Recent Deployments' } }]
                    }
                },
                {
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: `Showing the ${latestDeployments.results.length} most recent deployments` } }]
                    }
                }
            ]);
            return reportPage;
        }
        catch (error) {
            console.error('Failed to create system health report in Notion:', error);
            throw error;
        }
    }
    /**
     * Create a deployment history report for a project
     */
    async createDeploymentHistoryReport(project) {
        try {
            // Get all deployments for the project
            const deployments = await this.notion.queryDatabase(this.config.deploymentsLogDatabaseId, {
                filter: {
                    property: 'Project',
                    title: {
                        equals: project
                    }
                },
                sorts: [
                    {
                        property: 'Timestamp',
                        direction: 'descending'
                    }
                ]
            });
            // Create a new page for the report
            const reportPage = await this.notion.createPage({
                parent: { database_id: this.config.deploymentsLogDatabaseId },
                properties: {
                    Project: { title: [{ text: { content: `${project} - Deployment History` } }] }
                }
            });
            // Add report content
            await this.notion.createBlocks(reportPage.id, [
                {
                    type: 'heading_1',
                    heading_1: {
                        rich_text: [{ type: 'text', text: { content: `${project} - Deployment History` } }]
                    }
                },
                {
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: `Generated on ${new Date().toLocaleString()}` } }]
                    }
                },
                {
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ type: 'text', text: { content: 'Deployment Summary' } }]
                    }
                },
                {
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: `Total deployments: ${deployments.results.length}` } }]
                    }
                },
                {
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ type: 'text', text: { content: 'Recent Deployments' } }]
                    }
                }
            ]);
            // Add a section for each deployment
            for (const deployment of deployments.results.slice(0, 5)) {
                // @ts-ignore - The properties typing is incomplete
                const timestamp = deployment.properties.Timestamp?.date?.start || 'Unknown';
                // @ts-ignore - The properties typing is incomplete
                const environment = deployment.properties.Environment?.select?.name || 'Unknown';
                // @ts-ignore - The properties typing is incomplete
                const success = deployment.properties.Success?.checkbox || false;
                // @ts-ignore - The properties typing is incomplete
                const version = deployment.properties.Version?.rich_text[0]?.plain_text || 'Unknown';
                await this.notion.createBlocks(reportPage.id, [
                    {
                        type: 'heading_3',
                        heading_3: {
                            rich_text: [{ type: 'text', text: { content: `Deployment to ${environment} on ${new Date(timestamp).toLocaleString()}` } }]
                        }
                    },
                    {
                        type: 'bulleted_list_item',
                        bulleted_list_item: {
                            rich_text: [{ type: 'text', text: { content: `Status: ${success ? 'Success' : 'Failed'}` } }]
                        }
                    },
                    {
                        type: 'bulleted_list_item',
                        bulleted_list_item: {
                            rich_text: [{ type: 'text', text: { content: `Version: ${version}` } }]
                        }
                    }
                ]);
            }
            return reportPage;
        }
        catch (error) {
            console.error(`Failed to create deployment history report for ${project} in Notion:`, error);
            throw error;
        }
    }
}
exports.NotionExecutorIntegration = NotionExecutorIntegration;
exports.default = NotionExecutorIntegration;
