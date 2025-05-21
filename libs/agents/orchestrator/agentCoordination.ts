import { v4 as uuidv4 } from 'uuid';
import { 
  OrchestratorAgentConfig,
  Agent,
  AgentInfo,
  Capability,
  Task,
  TaskAssignment,
  TaskStatus,
  AgentHealth
} from './types';

/**
 * Agent Coordination module for the Orchestrator Agent
 * Handles agent discovery, registration, task assignment, and load balancing
 */
export const agentCoordination = {
  // In-memory agent registry (would be replaced with persistent storage in production)
  agents: new Map<string, Agent>(),
  agentInfo: new Map<string, AgentInfo>(),
  capabilities: new Map<string, Set<string>>(),
  tasks: new Map<string, TaskAssignment>(),
  
  /**
   * Register an agent with the orchestrator
   * @param agent Agent to register
   * @param capabilities Array of agent capabilities
   * @param config Orchestrator agent configuration
   * @returns Agent ID
   */
  async registerAgent(
    agent: Agent, 
    capabilities: Capability[],
    config: OrchestratorAgentConfig
  ): Promise<string> {
    try {
      // Generate ID if not provided
      const agentId = agent.id || uuidv4();
      agent.id = agentId;
      
      // Store the agent
      this.agents.set(agentId, agent);
      
      // Extract capability names
      const capabilityNames = capabilities.map(c => c.name);
      
      // Update capability registry
      capabilityNames.forEach(capability => {
        if (!this.capabilities.has(capability)) {
          this.capabilities.set(capability, new Set());
        }
        this.capabilities.get(capability)?.add(agentId);
      });
      
      // Store agent info
      this.agentInfo.set(agentId, {
        id: agentId,
        name: agent.name,
        type: agent.type,
        status: 'online',
        capabilities: capabilityNames,
        loadFactor: 0,
        taskCount: 0,
        successRate: 1, // Start with perfect success rate
        averageTaskDuration: 0,
        lastSeenTime: new Date().toISOString()
      });
      
      console.log(`Agent registered: ${agent.name} (${agentId}) with capabilities: ${capabilityNames.join(', ')}`);
      
      return agentId;
    } catch (error) {
      console.error('Error registering agent:', error);
      throw new Error(`Failed to register agent: ${error.message}`);
    }
  },

  /**
   * Unregister an agent from the orchestrator
   * @param agentId ID of the agent to unregister
   * @param config Orchestrator agent configuration
   */
  async unregisterAgent(
    agentId: string,
    config: OrchestratorAgentConfig
  ): Promise<void> {
    try {
      // Check if agent exists
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Get agent info
      const info = this.agentInfo.get(agentId);
      if (!info) {
        throw new Error(`Agent info not found: ${agentId}`);
      }
      
      // Remove from capability registry
      info.capabilities.forEach(capability => {
        const agents = this.capabilities.get(capability);
        if (agents) {
          agents.delete(agentId);
          if (agents.size === 0) {
            this.capabilities.delete(capability);
          }
        }
      });
      
      // Remove agent
      this.agents.delete(agentId);
      this.agentInfo.delete(agentId);
      
      console.log(`Agent unregistered: ${agentId}`);
    } catch (error) {
      console.error('Error unregistering agent:', error);
      throw new Error(`Failed to unregister agent: ${error.message}`);
    }
  },

  /**
   * List all registered agents
   * @param config Orchestrator agent configuration
   * @returns Array of agent info objects
   */
  async listAgents(
    config: OrchestratorAgentConfig
  ): Promise<AgentInfo[]> {
    try {
      return Array.from(this.agentInfo.values());
    } catch (error) {
      console.error('Error listing agents:', error);
      throw new Error(`Failed to list agents: ${error.message}`);
    }
  },

  /**
   * Get the capabilities of an agent
   * @param agentId ID of the agent
   * @param config Orchestrator agent configuration
   * @returns Array of capability names
   */
  async getAgentCapabilities(
    agentId: string,
    config: OrchestratorAgentConfig
  ): Promise<string[]> {
    try {
      const info = this.agentInfo.get(agentId);
      if (!info) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      return info.capabilities;
    } catch (error) {
      console.error('Error getting agent capabilities:', error);
      throw new Error(`Failed to get agent capabilities: ${error.message}`);
    }
  },

  /**
   * Find agents with a specific capability
   * @param capability Capability to search for
   * @param config Orchestrator agent configuration
   * @returns Array of agent info objects
   */
  async findAgentsByCapability(
    capability: string,
    config: OrchestratorAgentConfig
  ): Promise<AgentInfo[]> {
    try {
      const agentIds = this.capabilities.get(capability);
      if (!agentIds || agentIds.size === 0) {
        return [];
      }
      
      const agents: AgentInfo[] = [];
      agentIds.forEach(id => {
        const info = this.agentInfo.get(id);
        if (info) {
          agents.push(info);
        }
      });
      
      return agents;
    } catch (error) {
      console.error('Error finding agents by capability:', error);
      throw new Error(`Failed to find agents by capability: ${error.message}`);
    }
  },

  /**
   * Assign a task to an agent
   * @param task Task to assign
   * @param config Orchestrator agent configuration
   * @returns Task assignment
   */
  async assignTask(
    task: Task,
    config: OrchestratorAgentConfig
  ): Promise<TaskAssignment> {
    try {
      // Find agents with the required capability
      const agents = await this.findAgentsByCapability(task.capability, config);
      if (agents.length === 0) {
        throw new Error(`No agents found with capability: ${task.capability}`);
      }
      
      // Select the best agent (simple load balancing for now)
      const agent = this.selectAgent(agents, task);
      
      // Create task assignment
      const assignment: TaskAssignment = {
        id: task.id,
        agentId: agent.id,
        taskName: task.name,
        input: task.input,
        status: 'assigned',
        assignedTime: new Date().toISOString(),
        retryCount: 0,
        executionId: task.executionId,
        stepId: task.stepId
      };
      
      // Store the assignment
      this.tasks.set(task.id, assignment);
      
      // Update agent info
      const agentInfo = this.agentInfo.get(agent.id);
      if (agentInfo) {
        agentInfo.taskCount += 1;
        agentInfo.loadFactor = Math.min(1, agentInfo.taskCount / 10); // Simple load calculation
        agentInfo.status = agentInfo.loadFactor >= 0.8 ? 'busy' : 'online';
        agentInfo.lastSeenTime = new Date().toISOString();
      }
      
      console.log(`Task assigned: ${task.name} (${task.id}) to agent ${agent.name} (${agent.id})`);
      
      // Execute the task
      this.executeTask(task, agent);
      
      return assignment;
    } catch (error) {
      console.error('Error assigning task:', error);
      throw new Error(`Failed to assign task: ${error.message}`);
    }
  },

  /**
   * Select the best agent for a task
   * @param agents Array of available agents
   * @param task Task to assign
   * @returns Selected agent info
   */
  selectAgent(
    agents: AgentInfo[], 
    task: Task
  ): AgentInfo {
    // Simple selection algorithm - choose the agent with the lowest load
    // In a real implementation, this would consider many more factors
    
    // Filter out offline and error agents
    const availableAgents = agents.filter(a => 
      a.status === 'online' || a.status === 'busy'
    );
    
    if (availableAgents.length === 0) {
      // If no available agents, use any agent
      return agents[0];
    }
    
    // Sort by load factor (lowest first)
    availableAgents.sort((a, b) => a.loadFactor - b.loadFactor);
    
    // Consider success rate and average duration as secondary factors
    // For simplicity, we'll just use load factor for now
    return availableAgents[0];
  },

  /**
   * Execute a task on an agent
   * @param task Task to execute
   * @param agent Agent to execute the task
   */
  async executeTask(
    task: Task,
    agent: Agent
  ): Promise<void> {
    try {
      // Get the task assignment
      const assignment = this.tasks.get(task.id);
      if (!assignment) {
        throw new Error(`Task assignment not found: ${task.id}`);
      }
      
      // Update assignment status
      assignment.status = 'running';
      assignment.startTime = new Date().toISOString();
      
      // Get the agent
      const agentImpl = this.agents.get(agent.id);
      if (!agentImpl) {
        throw new Error(`Agent not found: ${agent.id}`);
      }
      
      // Execute the task
      console.log(`Executing task ${task.name} (${task.id}) on agent ${agent.name} (${agent.id})`);
      
      // In a real implementation, this would have proper error handling and retries
      try {
        const result = await agentImpl.execute(task);
        
        // Update assignment with success
        assignment.status = 'completed';
        assignment.endTime = new Date().toISOString();
        assignment.result = result;
        
        // Update agent stats
        this.updateAgentStats(agent.id, true, 
          assignment.startTime ? new Date(assignment.endTime!).getTime() - new Date(assignment.startTime).getTime() : 0);
        
        console.log(`Task completed: ${task.name} (${task.id})`);
      } catch (error) {
        // Update assignment with failure
        assignment.status = 'failed';
        assignment.endTime = new Date().toISOString();
        assignment.error = error;
        
        // Update agent stats
        this.updateAgentStats(agent.id, false, 
          assignment.startTime ? new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime() : 0);
        
        console.error(`Task failed: ${task.name} (${task.id}): ${error.message}`);
        throw error; // Re-throw for higher-level error handling
      }
    } catch (error) {
      console.error('Error executing task:', error);
      throw new Error(`Failed to execute task: ${error.message}`);
    }
  },

  /**
   * Update agent statistics
   * @param agentId ID of the agent
   * @param success Whether the task was successful
   * @param duration Duration of the task in milliseconds
   */
  updateAgentStats(
    agentId: string,
    success: boolean,
    duration: number
  ): void {
    const info = this.agentInfo.get(agentId);
    if (!info) {
      return;
    }
    
    // Update task count
    info.taskCount = Math.max(0, info.taskCount - 1);
    
    // Update load factor
    info.loadFactor = Math.min(1, info.taskCount / 10);
    
    // Update status
    info.status = info.loadFactor >= 0.8 ? 'busy' : 'online';
    
    // Update success rate (weighted average)
    const weight = 0.9; // Weight for previous success rate
    info.successRate = weight * info.successRate + (1 - weight) * (success ? 1 : 0);
    
    // Update average duration (weighted average)
    if (duration > 0) {
      const durationWeight = 0.9; // Weight for previous average duration
      info.averageTaskDuration = info.averageTaskDuration === 0
        ? duration
        : durationWeight * info.averageTaskDuration + (1 - durationWeight) * duration;
    }
    
    // Update last seen time
    info.lastSeenTime = new Date().toISOString();
  },

  /**
   * Get the status of a task
   * @param taskId ID of the task
   * @param config Orchestrator agent configuration
   * @returns Task status
   */
  async getTaskStatus(
    taskId: string,
    config: OrchestratorAgentConfig
  ): Promise<TaskStatus> {
    try {
      const assignment = this.tasks.get(taskId);
      if (!assignment) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      return {
        id: assignment.id,
        status: assignment.status,
        agentId: assignment.agentId,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        result: assignment.result,
        error: assignment.error ? {
          message: assignment.error.message,
          stack: assignment.error.stack
        } : undefined,
        retryCount: assignment.retryCount,
        retryAllowed: assignment.status === 'failed' && 
          (config.maxRetries !== undefined ? assignment.retryCount < config.maxRetries : assignment.retryCount < 3)
      };
    } catch (error) {
      console.error('Error getting task status:', error);
      throw new Error(`Failed to get task status: ${error.message}`);
    }
  },

  /**
   * Complete a task with a result
   * @param taskId ID of the task
   * @param result Result of the task
   * @param config Orchestrator agent configuration
   */
  async completeTask(
    taskId: string,
    result: any,
    config: OrchestratorAgentConfig
  ): Promise<void> {
    try {
      const assignment = this.tasks.get(taskId);
      if (!assignment) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      // Update assignment
      assignment.status = 'completed';
      assignment.endTime = new Date().toISOString();
      assignment.result = result;
      
      // Update agent stats
      this.updateAgentStats(assignment.agentId, true, 
        assignment.startTime ? new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime() : 0);
      
      console.log(`Task manually completed: ${taskId}`);
    } catch (error) {
      console.error('Error completing task:', error);
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  },

  /**
   * Fail a task with an error
   * @param taskId ID of the task
   * @param error Error that caused the failure
   * @param config Orchestrator agent configuration
   */
  async failTask(
    taskId: string,
    error: Error,
    config: OrchestratorAgentConfig
  ): Promise<void> {
    try {
      const assignment = this.tasks.get(taskId);
      if (!assignment) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      // Update assignment
      assignment.status = 'failed';
      assignment.endTime = new Date().toISOString();
      assignment.error = error;
      
      // Update agent stats
      this.updateAgentStats(assignment.agentId, false, 
        assignment.startTime ? new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime() : 0);
      
      console.log(`Task manually failed: ${taskId} - ${error.message}`);
    } catch (error) {
      console.error('Error failing task:', error);
      throw new Error(`Failed to fail task: ${error.message}`);
    }
  },

  /**
   * Check the health of an agent
   * @param agentId ID of the agent to check
   * @param config Orchestrator agent configuration
   * @returns Agent health status
   */
  async checkAgentHealth(
    agentId: string,
    config: OrchestratorAgentConfig
  ): Promise<AgentHealth> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Check if the agent has a health method
      if (agent.health) {
        return await agent.health();
      }
      
      // Default health check based on agent info
      const info = this.agentInfo.get(agentId);
      if (!info) {
        return {
          status: 'unhealthy',
          message: 'Agent info not found'
        };
      }
      
      // Check if the agent is responsive (based on last seen time)
      const lastSeen = new Date(info.lastSeenTime);
      const now = new Date();
      const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
      
      if (timeSinceLastSeen > 5 * 60 * 1000) { // 5 minutes
        return {
          status: 'unhealthy',
          message: 'Agent has not been seen for 5 minutes',
          details: {
            taskCount: info.taskCount
          }
        };
      }
      
      if (info.successRate < 0.5) {
        return {
          status: 'degraded',
          message: 'Agent has a low success rate',
          details: {
            taskCount: info.taskCount,
            successRate: info.successRate
          }
        };
      }
      
      return {
        status: 'healthy',
        details: {
          taskCount: info.taskCount,
          successRate: info.successRate
        }
      };
    } catch (error) {
      console.error('Error checking agent health:', error);
      return {
        status: 'unhealthy',
        message: `Health check error: ${error.message}`
      };
    }
  },

  /**
   * Assign multiple tasks in bulk
   * @param tasks Array of tasks to assign
   * @param config Orchestrator agent configuration
   * @returns Array of task assignments
   */
  async bulkAssignTasks(
    tasks: Task[],
    config: OrchestratorAgentConfig
  ): Promise<TaskAssignment[]> {
    try {
      // Group tasks by capability for more efficient assignment
      const tasksByCapability: Record<string, Task[]> = {};
      tasks.forEach(task => {
        if (!tasksByCapability[task.capability]) {
          tasksByCapability[task.capability] = [];
        }
        tasksByCapability[task.capability].push(task);
      });
      
      // Assign tasks for each capability
      const assignments: TaskAssignment[] = [];
      
      for (const capability of Object.keys(tasksByCapability)) {
        // Get agents for this capability
        const agents = await this.findAgentsByCapability(capability, config);
        if (agents.length === 0) {
          throw new Error(`No agents found with capability: ${capability}`);
        }
        
        // Distribute tasks among agents
        const tasksForCapability = tasksByCapability[capability];
        const agentsArray = Array.from(agents);
        
        for (let i = 0; i < tasksForCapability.length; i++) {
          const task = tasksForCapability[i];
          // Round-robin distribution, can be replaced with more sophisticated balancing
          const agent = agentsArray[i % agentsArray.length];
          
          // Create and store assignment
          const assignment: TaskAssignment = {
            id: task.id,
            agentId: agent.id,
            taskName: task.name,
            input: task.input,
            status: 'assigned',
            assignedTime: new Date().toISOString(),
            retryCount: 0,
            executionId: task.executionId,
            stepId: task.stepId
          };
          
          this.tasks.set(task.id, assignment);
          assignments.push(assignment);
          
          // Update agent info
          const agentInfo = this.agentInfo.get(agent.id);
          if (agentInfo) {
            agentInfo.taskCount += 1;
            agentInfo.loadFactor = Math.min(1, agentInfo.taskCount / 10);
            agentInfo.status = agentInfo.loadFactor >= 0.8 ? 'busy' : 'online';
            agentInfo.lastSeenTime = new Date().toISOString();
          }
          
          // Execute the task
          const agentImpl = this.agents.get(agent.id);
          if (agentImpl) {
            this.executeTask(task, agentImpl);
          }
        }
      }
      
      return assignments;
    } catch (error) {
      console.error('Error bulk assigning tasks:', error);
      throw new Error(`Failed to bulk assign tasks: ${error.message}`);
    }
  }
};