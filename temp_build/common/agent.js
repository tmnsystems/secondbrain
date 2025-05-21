"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractAgent = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
/**
 * Abstract base class that implements common agent functionality
 */
class AbstractAgent {
    /**
     * Create a new AbstractAgent
     * @param type The type of agent
     * @param config Agent configuration
     */
    constructor(type, config) {
        this.id = config.agentId || (0, uuid_1.v4)();
        this.type = type;
        this.name = `${type}-${this.id.substring(0, 8)}`;
        this.config = config;
        this.logger = (0, logger_1.createLogger)({
            level: config.logLevel || 'info',
            service: this.name
        });
        this.status = 'offline';
        this.metrics = {
            taskCount: 0,
            successfulTasks: 0,
            failedTasks: 0,
            totalDuration: 0
        };
        this.startTime = new Date();
        this.lastSeenTime = new Date().toISOString();
    }
    /**
     * Initialize the agent
     */
    async initialize() {
        this.status = 'online';
        this.logger.info(`Agent ${this.name} initialized`);
    }
    /**
     * Get information about the agent
     */
    getInfo() {
        this.lastSeenTime = new Date().toISOString();
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            status: this.status,
            capabilities: this.getCapabilities().map(c => c.name),
            loadFactor: this.calculateLoadFactor(),
            taskCount: this.metrics.taskCount,
            successRate: this.calculateSuccessRate(),
            averageTaskDuration: this.calculateAverageTaskDuration(),
            lastSeenTime: this.lastSeenTime
        };
    }
    /**
     * Get the agent's health status
     */
    async getHealth() {
        this.lastSeenTime = new Date().toISOString();
        return {
            status: 'healthy',
            details: {
                taskCount: this.metrics.taskCount,
                uptime: Date.now() - this.startTime.getTime()
            }
        };
    }
    /**
     * Execute a task using this agent
     * @param task The task to execute
     */
    async executeTask(task) {
        this.status = 'busy';
        this.metrics.taskCount++;
        this.lastSeenTime = new Date().toISOString();
        this.logger.info(`Executing task: ${task.id} - ${task.name}`);
        const startTime = Date.now();
        try {
            const result = await this.performTask(task);
            const duration = Date.now() - startTime;
            this.metrics.successfulTasks++;
            this.metrics.totalDuration += duration;
            this.status = 'online';
            return {
                taskId: task.id,
                success: true,
                data: result,
                duration
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.failedTasks++;
            this.metrics.totalDuration += duration;
            this.status = 'online';
            this.logger.error(`Task failed: ${task.id}`, { error });
            // Handle the error object safely
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = error instanceof Error && 'code' in error ? error.code : undefined;
            const errorStack = error instanceof Error ? error.stack : undefined;
            return {
                taskId: task.id,
                success: false,
                error: {
                    message: errorMessage || 'Unknown error',
                    code: errorCode,
                    stack: errorStack
                },
                duration
            };
        }
    }
    /**
     * Shutdown the agent
     */
    async shutdown() {
        this.status = 'offline';
        this.logger.info(`Agent ${this.name} shutdown`);
    }
    /**
     * Calculate the agent's load factor (0-1)
     */
    calculateLoadFactor() {
        // Default implementation - override in specific agents
        return this.status === 'busy' ? 1 : 0;
    }
    /**
     * Calculate the agent's success rate
     */
    calculateSuccessRate() {
        if (this.metrics.taskCount === 0)
            return 1;
        return this.metrics.successfulTasks / this.metrics.taskCount;
    }
    /**
     * Calculate the average task duration
     */
    calculateAverageTaskDuration() {
        if (this.metrics.taskCount === 0)
            return 0;
        return this.metrics.totalDuration / this.metrics.taskCount;
    }
}
exports.AbstractAgent = AbstractAgent;
