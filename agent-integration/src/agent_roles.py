"""
Agent Roles: Defines specialized agent roles and their routing for the SecondBrain architecture.

This module implements the different agent roles used in the SecondBrain multi-agent system,
including their specialized capabilities, model assignments, and routing logic.
"""

import logging
import json
import asyncio
import time
from typing import Dict, List, Any, Optional, Union, Callable, Type
from enum import Enum
from dataclasses import dataclass, field

from .agent_manager import Agent, AgentRole, AgentState, Message, MessagePriority, AgentManager
from .communication_protocol import MessageType, MessageBus
from .reviewer_agent import ReviewerAgent, ReviewRequest, ReviewType, ReviewStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('agent_roles')

# Model assignments
class ModelAssignment(str, Enum):
    CLAUDE_SONNET = "claude-3.7-sonnet"
    CLAUDE_OPUS = "claude-3-opus"
    GPT4_MINI = "gpt-4.1-mini"
    GPT4 = "gpt-4"
    OPENAI_O3 = "o3"

# Task complexity levels
class TaskComplexity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Task status
class TaskStatus(str, Enum):
    PENDING = "pending"
    PLANNING = "planning"
    REVIEWING = "reviewing"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Task:
    """Represents a task to be executed by an agent"""
    task_id: str
    title: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    complexity: TaskComplexity = TaskComplexity.MEDIUM
    assigned_agent_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    content: Dict[str, Any] = field(default_factory=dict)
    review_request_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    subtasks: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

class PlannerAgent(Agent):
    """
    Planner Agent is responsible for strategic planning and task decomposition.
    It uses the most sophisticated models available (Claude Sonnet/Opus) for
    creating comprehensive plans and evaluating strategic alignment.
    """
    
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ):
        super().__init__(agent_id, AgentRole.PLANNER, manager, config)
        self.message_bus = message_bus
        self.tasks: Dict[str, Task] = {}
        self.model = self._get_model_assignment()
        
        # Register message handlers
        self._register_message_handlers()
    
    def _get_model_assignment(self) -> ModelAssignment:
        """Get the model assignment for this agent based on config"""
        config_model = self.config.get("model", "")
        
        # Check if the model is specified in config
        try:
            return ModelAssignment(config_model) if config_model else ModelAssignment.CLAUDE_SONNET
        except ValueError:
            self.logger.warning(f"Invalid model {config_model}, using Claude Sonnet")
            return ModelAssignment.CLAUDE_SONNET
    
    def _register_message_handlers(self) -> None:
        """Register handlers for message types"""
        self.register_message_handler("plan_request", self._handle_plan_request)
        self.register_message_handler("task_status_update", self._handle_task_status_update)
        
        # Register with message bus if available
        if self.message_bus:
            self.message_bus.register_handler(
                self.id, 
                MessageType.WORKFLOW_START,
                self._handle_workflow_start_message
            )
    
    async def initialize(self) -> bool:
        """Initialize the Planner Agent"""
        self.state = AgentState.INITIALIZING
        self.logger.info(f"Initializing Planner Agent {self.id} with model {self.model}")
        
        try:
            # Subscribe to message types
            if self.message_bus:
                self.message_bus.subscribe(self.id, [
                    MessageType.WORKFLOW_START,
                    MessageType.TASK_STATUS,
                ])
            
            self.state = AgentState.IDLE
            self.logger.info(f"Planner Agent {self.id} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Planner Agent: {str(e)}")
            self.state = AgentState.ERROR
            return False
    
    async def create_plan(
        self,
        title: str,
        description: str,
        context: Dict[str, Any],
        complexity: TaskComplexity = TaskComplexity.MEDIUM,
    ) -> Task:
        """Create a plan for executing a task or job"""
        import uuid
        
        self.state = AgentState.PROCESSING
        self.logger.info(f"Creating plan: {title}")
        
        task_id = str(uuid.uuid4())
        
        # In a real implementation, this would use the model to generate a plan
        # For this example, we'll create a simple placeholder plan
        
        # Create the main task
        task = Task(
            task_id=task_id,
            title=title,
            description=description,
            status=TaskStatus.PLANNING,
            complexity=complexity,
            assigned_agent_id=self.id,
            content={
                "context": context,
                "plan": {
                    "steps": [
                        {
                            "step_id": "step1",
                            "title": f"Analyze requirements for {title}",
                            "description": "Analyze and understand the requirements",
                            "agent_role": AgentRole.PLANNER.value,
                        },
                        {
                            "step_id": "step2",
                            "title": f"Design solution for {title}",
                            "description": "Design a comprehensive solution",
                            "agent_role": AgentRole.PLANNER.value,
                        },
                        {
                            "step_id": "step3",
                            "title": f"Implement {title}",
                            "description": "Implement the designed solution",
                            "agent_role": AgentRole.EXECUTOR.value,
                        },
                        {
                            "step_id": "step4",
                            "title": f"Test {title}",
                            "description": "Test the implementation",
                            "agent_role": AgentRole.EXECUTOR.value,
                        },
                        {
                            "step_id": "step5",
                            "title": f"Document {title}",
                            "description": "Document the implementation",
                            "agent_role": AgentRole.NOTION.value,
                        }
                    ],
                    "dependencies": [
                        {"from": "step1", "to": "step2"},
                        {"from": "step2", "to": "step3"},
                        {"from": "step3", "to": "step4"},
                        {"from": "step4", "to": "step5"}
                    ]
                }
            }
        )
        
        # Store the task
        self.tasks[task_id] = task
        
        # Create subtasks for each step
        for step in task.content["plan"]["steps"]:
            subtask_id = f"{task_id}_{step['step_id']}"
            subtask = Task(
                task_id=subtask_id,
                title=step["title"],
                description=step["description"],
                status=TaskStatus.PENDING,
                complexity=complexity,
                assigned_agent_id=None,  # Will be assigned later
                parent_task_id=task_id,
                content={
                    "step_id": step["step_id"],
                    "agent_role": step["agent_role"],
                    "context": context
                }
            )
            self.tasks[subtask_id] = subtask
            task.subtasks.append(subtask_id)
        
        # Request review of the plan
        await self._request_plan_review(task)
        
        self.state = AgentState.IDLE
        return task
    
    async def _request_plan_review(self, task: Task) -> None:
        """Request a review of the plan from the Reviewer Agent"""
        if not self.manager:
            self.logger.warning("No manager available for review request")
            return
            
        # Find a Reviewer Agent
        reviewer_id = None
        for agent_id, agent in self.manager.agents.items():
            if agent.role == AgentRole.REVIEWER:
                reviewer_id = agent_id
                break
                
        if not reviewer_id:
            self.logger.warning("No Reviewer Agent available")
            return
            
        # Create a review request message
        review_message = Message(
            sender=self.id,
            recipient=reviewer_id,
            content={
                "type": "review_request",
                "title": f"Plan Review: {task.title}",
                "description": task.description,
                "review_type": ReviewType.PRE_IMPLEMENTATION.value,
                "content": {
                    "task_id": task.task_id,
                    "plan": task.content.get("plan", {}),
                    "context": task.content.get("context", {}),
                    "strategic_goals": task.content.get("context", {}).get("strategic_goals", "")
                },
                "requester_id": self.id,
                "process_now": True
            },
            priority=MessagePriority.HIGH
        )
        
        # Send the message
        self.logger.info(f"Requesting review for plan {task.task_id}")
        response = await self.manager.route_message(review_message)
        
        if response:
            # Update task with review request ID
            task.status = TaskStatus.REVIEWING
            task.review_request_id = response.content.get("request_id")
            task.updated_at = time.time()
            self.logger.info(f"Review request created: {task.review_request_id}")
        else:
            self.logger.warning(f"Failed to create review request for plan {task.task_id}")
    
    async def update_task_status(self, task_id: str, status: TaskStatus) -> Optional[Task]:
        """Update the status of a task"""
        if task_id not in self.tasks:
            self.logger.warning(f"Task {task_id} not found")
            return None
            
        task = self.tasks[task_id]
        task.status = status
        task.updated_at = time.time()
        
        self.logger.info(f"Updated task {task_id} status to {status.value}")
        return task
    
    async def assign_task(self, task_id: str, agent_id: str) -> Optional[Task]:
        """Assign a task to an agent"""
        if task_id not in self.tasks:
            self.logger.warning(f"Task {task_id} not found")
            return None
            
        task = self.tasks[task_id]
        task.assigned_agent_id = agent_id
        task.updated_at = time.time()
        
        self.logger.info(f"Assigned task {task_id} to agent {agent_id}")
        return task
    
    # Message handlers
    
    async def _handle_plan_request(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a plan request message"""
        try:
            # Extract request details
            title = content.get("title", "Untitled Plan")
            description = content.get("description", "")
            context = content.get("context", {})
            complexity_str = content.get("complexity", TaskComplexity.MEDIUM.value)
            
            # Create plan
            try:
                complexity = TaskComplexity(complexity_str)
            except ValueError:
                self.logger.warning(f"Invalid complexity: {complexity_str}, using MEDIUM")
                complexity = TaskComplexity.MEDIUM
                
            task = await self.create_plan(
                title=title,
                description=description,
                context=context,
                complexity=complexity
            )
            
            return {
                "type": "plan_response",
                "task_id": task.task_id,
                "status": task.status.value,
                "message": f"Plan created: {task.task_id}",
                "review_request_id": task.review_request_id
            }
            
        except Exception as e:
            self.logger.error(f"Error handling plan request: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_task_status_update(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a task status update message"""
        try:
            task_id = content.get("task_id")
            status_str = content.get("status")
            
            if not task_id or not status_str:
                return {
                    "type": "error",
                    "error": "task_id and status are required",
                    "error_type": "ValueError"
                }
                
            try:
                status = TaskStatus(status_str)
            except ValueError:
                return {
                    "type": "error",
                    "error": f"Invalid status: {status_str}",
                    "error_type": "ValueError"
                }
                
            task = await self.update_task_status(task_id, status)
            if not task:
                return {
                    "type": "error",
                    "error": f"Task {task_id} not found",
                    "error_type": "ValueError"
                }
                
            return {
                "type": "task_status_update_response",
                "task_id": task_id,
                "status": task.status.value,
                "message": f"Task status updated to {status.value}"
            }
            
        except Exception as e:
            self.logger.error(f"Error handling task status update: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_workflow_start_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a workflow start message from the message bus"""
        self.logger.info(f"Received workflow start message: {message.id}")
        
        try:
            content = message.content
            title = content.get("title", "Untitled Workflow")
            description = content.get("description", "")
            context = content.get("context", {})
            complexity_str = content.get("complexity", TaskComplexity.MEDIUM.value)
            
            try:
                complexity = TaskComplexity(complexity_str)
            except ValueError:
                complexity = TaskComplexity.MEDIUM
                
            task = await self.create_plan(
                title=title,
                description=description,
                context=context,
                complexity=complexity
            )
            
            return {
                "type": "workflow_start_response",
                "task_id": task.task_id,
                "status": task.status.value,
                "message": f"Workflow started: {task.task_id}",
                "review_request_id": task.review_request_id
            }
            
        except Exception as e:
            self.logger.error(f"Error handling workflow start message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }

class ExecutorAgent(Agent):
    """
    Executor Agent is responsible for implementing plans and executing tasks.
    It uses GPT-4.1 Mini (or similar) for efficient task execution and
    implementation details.
    """
    
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ):
        super().__init__(agent_id, AgentRole.EXECUTOR, manager, config)
        self.message_bus = message_bus
        self.tasks: Dict[str, Task] = {}
        self.model = self._get_model_assignment()
        
        # Register message handlers
        self._register_message_handlers()
    
    def _get_model_assignment(self) -> ModelAssignment:
        """Get the model assignment for this agent based on config"""
        config_model = self.config.get("model", "")
        
        # Check if the model is specified in config
        try:
            return ModelAssignment(config_model) if config_model else ModelAssignment.GPT4_MINI
        except ValueError:
            self.logger.warning(f"Invalid model {config_model}, using GPT-4.1 Mini")
            return ModelAssignment.GPT4_MINI
    
    def _register_message_handlers(self) -> None:
        """Register handlers for message types"""
        self.register_message_handler("execute_task", self._handle_execute_task)
        self.register_message_handler("task_status_update", self._handle_task_status_update)
        
        # Register with message bus if available
        if self.message_bus:
            self.message_bus.register_handler(
                self.id, 
                MessageType.TASK_REQUEST,
                self._handle_task_request_message
            )
    
    async def initialize(self) -> bool:
        """Initialize the Executor Agent"""
        self.state = AgentState.INITIALIZING
        self.logger.info(f"Initializing Executor Agent {self.id} with model {self.model}")
        
        try:
            # Subscribe to message types
            if self.message_bus:
                self.message_bus.subscribe(self.id, [
                    MessageType.TASK_REQUEST,
                    MessageType.TASK_CANCEL,
                ])
            
            self.state = AgentState.IDLE
            self.logger.info(f"Executor Agent {self.id} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Executor Agent: {str(e)}")
            self.state = AgentState.ERROR
            return False
    
    async def execute_task(self, task: Task) -> Task:
        """Execute a task based on its description and context"""
        self.state = AgentState.PROCESSING
        self.logger.info(f"Executing task: {task.title}")
        
        # Store the task if not already stored
        if task.task_id not in self.tasks:
            self.tasks[task.task_id] = task
        
        # Update task status
        task.status = TaskStatus.EXECUTING
        task.updated_at = time.time()
        
        # In a real implementation, this would use the model to execute the task
        # For this example, we'll create a simple placeholder implementation
        
        # Simulate task execution
        await asyncio.sleep(1)  # Simulated work
        
        # Update task with execution results
        task.content["execution_result"] = {
            "status": "success",
            "details": f"Executed task {task.title}",
            "timestamp": time.time()
        }
        
        task.status = TaskStatus.COMPLETED
        task.updated_at = time.time()
        
        # Request implementation review if configured
        if self.config.get("post_implementation_review", True):
            await self._request_implementation_review(task)
        
        self.state = AgentState.IDLE
        return task
    
    async def _request_implementation_review(self, task: Task) -> None:
        """Request a review of the implementation from the Reviewer Agent"""
        if not self.manager:
            self.logger.warning("No manager available for review request")
            return
            
        # Find a Reviewer Agent
        reviewer_id = None
        for agent_id, agent in self.manager.agents.items():
            if agent.role == AgentRole.REVIEWER:
                reviewer_id = agent_id
                break
                
        if not reviewer_id:
            self.logger.warning("No Reviewer Agent available")
            return
            
        # Create a review request message
        review_message = Message(
            sender=self.id,
            recipient=reviewer_id,
            content={
                "type": "review_request",
                "title": f"Implementation Review: {task.title}",
                "description": task.description,
                "review_type": ReviewType.POST_IMPLEMENTATION.value,
                "content": {
                    "task_id": task.task_id,
                    "implementation": task.content.get("execution_result", {}),
                    "implemented": True,
                    "implementation_details": task.content.get("execution_result", {}).get("details", "")
                },
                "requester_id": self.id,
                "process_now": True
            },
            priority=MessagePriority.NORMAL
        )
        
        # Send the message
        self.logger.info(f"Requesting review for implementation {task.task_id}")
        response = await self.manager.route_message(review_message)
        
        if response:
            # Update task with review request ID
            task.review_request_id = response.content.get("request_id")
            task.updated_at = time.time()
            self.logger.info(f"Review request created: {task.review_request_id}")
        else:
            self.logger.warning(f"Failed to create review request for implementation {task.task_id}")
    
    async def update_task_status(self, task_id: str, status: TaskStatus) -> Optional[Task]:
        """Update the status of a task"""
        if task_id not in self.tasks:
            self.logger.warning(f"Task {task_id} not found")
            return None
            
        task = self.tasks[task_id]
        task.status = status
        task.updated_at = time.time()
        
        self.logger.info(f"Updated task {task_id} status to {status.value}")
        return task
    
    # Message handlers
    
    async def _handle_execute_task(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle an execute task message"""
        try:
            # Extract task details
            task_id = content.get("task_id")
            title = content.get("title", "Untitled Task")
            description = content.get("description", "")
            task_content = content.get("content", {})
            
            if not task_id:
                return {
                    "type": "error",
                    "error": "task_id is required",
                    "error_type": "ValueError"
                }
            
            # Check if task already exists
            if task_id in self.tasks:
                task = self.tasks[task_id]
            else:
                # Create a new task
                task = Task(
                    task_id=task_id,
                    title=title,
                    description=description,
                    status=TaskStatus.PENDING,
                    complexity=TaskComplexity.MEDIUM,
                    assigned_agent_id=self.id,
                    content=task_content
                )
                self.tasks[task_id] = task
            
            # Execute the task
            task = await self.execute_task(task)
            
            return {
                "type": "execute_task_response",
                "task_id": task.task_id,
                "status": task.status.value,
                "message": f"Task executed: {task.task_id}",
                "result": task.content.get("execution_result", {})
            }
            
        except Exception as e:
            self.logger.error(f"Error handling execute task: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_task_status_update(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a task status update message"""
        try:
            task_id = content.get("task_id")
            status_str = content.get("status")
            
            if not task_id or not status_str:
                return {
                    "type": "error",
                    "error": "task_id and status are required",
                    "error_type": "ValueError"
                }
                
            try:
                status = TaskStatus(status_str)
            except ValueError:
                return {
                    "type": "error",
                    "error": f"Invalid status: {status_str}",
                    "error_type": "ValueError"
                }
                
            task = await self.update_task_status(task_id, status)
            if not task:
                return {
                    "type": "error",
                    "error": f"Task {task_id} not found",
                    "error_type": "ValueError"
                }
                
            return {
                "type": "task_status_update_response",
                "task_id": task_id,
                "status": task.status.value,
                "message": f"Task status updated to {status.value}"
            }
            
        except Exception as e:
            self.logger.error(f"Error handling task status update: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_task_request_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a task request message from the message bus"""
        self.logger.info(f"Received task request message: {message.id}")
        
        try:
            content = message.content
            return await self._handle_execute_task(content)
            
        except Exception as e:
            self.logger.error(f"Error handling task request message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }

class NotionAgent(Agent):
    """
    Notion Agent is responsible for documentation and persistence of context.
    It manages the Notion integration and ensures that all relevant information
    is properly documented and preserved.
    """
    
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ):
        super().__init__(agent_id, AgentRole.NOTION, manager, config)
        self.message_bus = message_bus
        self.model = self._get_model_assignment()
        self.notion_client = None
        
        # Register message handlers
        self._register_message_handlers()
    
    def _get_model_assignment(self) -> ModelAssignment:
        """Get the model assignment for this agent based on config"""
        config_model = self.config.get("model", "")
        
        # Check if the model is specified in config
        try:
            return ModelAssignment(config_model) if config_model else ModelAssignment.GPT4_MINI
        except ValueError:
            self.logger.warning(f"Invalid model {config_model}, using GPT-4.1 Mini")
            return ModelAssignment.GPT4_MINI
    
    def _register_message_handlers(self) -> None:
        """Register handlers for message types"""
        self.register_message_handler("document_task", self._handle_document_task)
        self.register_message_handler("log_cli_session", self._handle_log_cli_session)
        
        # Register with message bus if available
        if self.message_bus:
            self.message_bus.register_handler(
                self.id, 
                MessageType.NOTION_CREATE,
                self._handle_notion_create_message
            )
            self.message_bus.register_handler(
                self.id, 
                MessageType.NOTION_UPDATE,
                self._handle_notion_update_message
            )
            self.message_bus.register_handler(
                self.id, 
                MessageType.NOTION_QUERY,
                self._handle_notion_query_message
            )
    
    async def initialize(self) -> bool:
        """Initialize the Notion Agent"""
        self.state = AgentState.INITIALIZING
        self.logger.info(f"Initializing Notion Agent {self.id} with model {self.model}")
        
        try:
            # Initialize Notion client if configured
            if "notion" in self.config:
                await self._initialize_notion_client()
            
            # Subscribe to message types
            if self.message_bus:
                self.message_bus.subscribe(self.id, [
                    MessageType.NOTION_CREATE,
                    MessageType.NOTION_UPDATE,
                    MessageType.NOTION_QUERY,
                ])
            
            self.state = AgentState.IDLE
            self.logger.info(f"Notion Agent {self.id} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Notion Agent: {str(e)}")
            self.state = AgentState.ERROR
            return False
    
    async def _initialize_notion_client(self) -> None:
        """Initialize the Notion client"""
        try:
            from notion_client import AsyncClient
            
            notion_config = self.config.get("notion", {})
            api_key = notion_config.get("api_key")
            
            if not api_key:
                self.logger.warning("No Notion API key provided, Notion integration disabled")
                return
                
            self.notion_client = AsyncClient(auth=api_key)
            self.logger.info("Notion client initialized successfully")
            
        except ImportError:
            self.logger.warning("notion_client package not installed, Notion integration disabled")
            
        except Exception as e:
            self.logger.error(f"Error initializing Notion client: {str(e)}")
            raise
    
    async def document_task(
        self,
        task: Task,
        include_details: bool = True,
    ) -> Optional[str]:
        """Document a task in Notion"""
        if not self.notion_client:
            self.logger.warning("No Notion client available, skipping documentation")
            return None
            
        try:
            notion_config = self.config.get("notion", {})
            database_id = notion_config.get("task_database_id")
            
            if not database_id:
                self.logger.warning("No Notion database ID configured for tasks")
                return None
                
            self.logger.info(f"Documenting task {task.task_id} in Notion")
            
            # Create page properties
            properties = {
                "Title": {
                    "title": [
                        {
                            "text": {
                                "content": task.title
                            }
                        }
                    ]
                },
                "Status": {
                    "select": {
                        "name": task.status.value.title()
                    }
                },
                "ID": {
                    "rich_text": [
                        {
                            "text": {
                                "content": task.task_id
                            }
                        }
                    ]
                },
                "Created": {
                    "date": {
                        "start": time.strftime("%Y-%m-%d", time.localtime(task.created_at))
                    }
                },
                "Updated": {
                    "date": {
                        "start": time.strftime("%Y-%m-%d", time.localtime(task.updated_at))
                    }
                },
                "Complexity": {
                    "select": {
                        "name": task.complexity.value.title()
                    }
                }
            }
            
            # Add assigned agent if available
            if task.assigned_agent_id:
                properties["Assigned Agent"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": task.assigned_agent_id
                            }
                        }
                    ]
                }
            
            # Create page content
            children = [
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Description"
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": task.description
                                }
                            }
                        ]
                    }
                }
            ]
            
            # Add task details if requested
            if include_details and task.content:
                children.extend([
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Task Details"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "code",
                        "code": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": json.dumps(task.content, indent=2)
                                    }
                                }
                            ],
                            "language": "json"
                        }
                    }
                ])
            
            # Add execution result if available
            if "execution_result" in task.content:
                children.extend([
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Execution Result"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "code",
                        "code": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": json.dumps(task.content["execution_result"], indent=2)
                                    }
                                }
                            ],
                            "language": "json"
                        }
                    }
                ])
            
            # Create the page
            page = await self.notion_client.pages.create(
                parent={"database_id": database_id},
                properties=properties,
                children=children
            )
            
            self.logger.info(f"Task {task.task_id} documented in Notion page {page.id}")
            return page.id
            
        except Exception as e:
            self.logger.error(f"Error documenting task in Notion: {str(e)}")
            return None
    
    async def log_cli_session(
        self,
        session_id: str,
        messages: List[Dict[str, Any]],
        session_metadata: Dict[str, Any] = None,
    ) -> Optional[str]:
        """Log a CLI session in Notion for context persistence"""
        if not self.notion_client:
            self.logger.warning("No Notion client available, skipping CLI session logging")
            return None
            
        try:
            notion_config = self.config.get("notion", {})
            database_id = notion_config.get("cli_sessions_database_id")
            
            if not database_id:
                self.logger.warning("No Notion database ID configured for CLI sessions")
                return None
                
            self.logger.info(f"Logging CLI session {session_id} in Notion")
            
            # Create page properties
            properties = {
                "Title": {
                    "title": [
                        {
                            "text": {
                                "content": f"CLI Session {session_id}"
                            }
                        }
                    ]
                },
                "Session ID": {
                    "rich_text": [
                        {
                            "text": {
                                "content": session_id
                            }
                        }
                    ]
                },
                "Status": {
                    "select": {
                        "name": "Completed"
                    }
                },
                "Start Time": {
                    "date": {
                        "start": time.strftime("%Y-%m-%d", time.localtime(time.time()))
                    }
                },
                "Message Count": {
                    "number": len(messages)
                }
            }
            
            # Add metadata if available
            if session_metadata:
                if "previous_session" in session_metadata:
                    properties["Previous Session"] = {
                        "rich_text": [
                            {
                                "text": {
                                    "content": session_metadata["previous_session"]
                                }
                            }
                        ]
                    }
                
                if "compaction_reason" in session_metadata:
                    properties["Compaction Reason"] = {
                        "select": {
                            "name": session_metadata["compaction_reason"]
                        }
                    }
            
            # Create page content
            children = [
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Session Messages"
                                }
                            }
                        ]
                    }
                }
            ]
            
            # Add messages
            for i, message in enumerate(messages):
                role = message.get("role", "unknown")
                content = message.get("content", "")
                timestamp = message.get("timestamp", time.time())
                
                children.extend([
                    {
                        "object": "block",
                        "type": "heading_3",
                        "heading_3": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": f"Message {i+1} ({role})"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": f"Time: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))}"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": content
                                    }
                                }
                            ]
                        }
                    }
                ])
            
            # Create the page
            page = await self.notion_client.pages.create(
                parent={"database_id": database_id},
                properties=properties,
                children=children
            )
            
            self.logger.info(f"CLI session {session_id} logged in Notion page {page.id}")
            return page.id
            
        except Exception as e:
            self.logger.error(f"Error logging CLI session in Notion: {str(e)}")
            return None
    
    # Message handlers
    
    async def _handle_document_task(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a document task message"""
        try:
            # Extract task details
            task_dict = content.get("task", {})
            include_details = content.get("include_details", True)
            
            if not task_dict:
                return {
                    "type": "error",
                    "error": "task is required",
                    "error_type": "ValueError"
                }
            
            # Convert dict to Task object
            try:
                task = Task(
                    task_id=task_dict["task_id"],
                    title=task_dict["title"],
                    description=task_dict.get("description", ""),
                    status=TaskStatus(task_dict.get("status", TaskStatus.COMPLETED.value)),
                    complexity=TaskComplexity(task_dict.get("complexity", TaskComplexity.MEDIUM.value)),
                    assigned_agent_id=task_dict.get("assigned_agent_id"),
                    created_at=task_dict.get("created_at", time.time()),
                    updated_at=task_dict.get("updated_at", time.time()),
                    content=task_dict.get("content", {}),
                    review_request_id=task_dict.get("review_request_id"),
                    parent_task_id=task_dict.get("parent_task_id"),
                    subtasks=task_dict.get("subtasks", []),
                    metadata=task_dict.get("metadata", {})
                )
            except (ValueError, KeyError) as e:
                return {
                    "type": "error",
                    "error": f"Invalid task data: {str(e)}",
                    "error_type": type(e).__name__
                }
            
            # Document the task
            page_id = await self.document_task(task, include_details)
            
            if page_id:
                return {
                    "type": "document_task_response",
                    "task_id": task.task_id,
                    "page_id": page_id,
                    "message": f"Task documented in Notion: {page_id}"
                }
            else:
                return {
                    "type": "error",
                    "error": "Failed to document task in Notion",
                    "error_type": "NotionError"
                }
            
        except Exception as e:
            self.logger.error(f"Error handling document task: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_log_cli_session(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a log CLI session message"""
        try:
            # Extract session details
            session_id = content.get("session_id")
            messages = content.get("messages", [])
            session_metadata = content.get("metadata", {})
            
            if not session_id:
                return {
                    "type": "error",
                    "error": "session_id is required",
                    "error_type": "ValueError"
                }
            
            if not messages:
                return {
                    "type": "error",
                    "error": "messages list is required",
                    "error_type": "ValueError"
                }
            
            # Log the CLI session
            page_id = await self.log_cli_session(session_id, messages, session_metadata)
            
            if page_id:
                return {
                    "type": "log_cli_session_response",
                    "session_id": session_id,
                    "page_id": page_id,
                    "message": f"CLI session logged in Notion: {page_id}"
                }
            else:
                return {
                    "type": "error",
                    "error": "Failed to log CLI session in Notion",
                    "error_type": "NotionError"
                }
            
        except Exception as e:
            self.logger.error(f"Error handling log CLI session: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_notion_create_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a Notion create message from the message bus"""
        self.logger.info(f"Received Notion create message: {message.id}")
        
        try:
            content = message.content
            content_type = content.get("content_type")
            
            if content_type == "task":
                return await self._handle_document_task(content)
            elif content_type == "cli_session":
                return await self._handle_log_cli_session(content)
            else:
                return {
                    "type": "error",
                    "error": f"Unknown content type: {content_type}",
                    "error_type": "ValueError"
                }
            
        except Exception as e:
            self.logger.error(f"Error handling Notion create message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_notion_update_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a Notion update message from the message bus"""
        self.logger.info(f"Received Notion update message: {message.id}")
        
        try:
            content = message.content
            page_id = content.get("page_id")
            updates = content.get("updates", {})
            
            if not page_id:
                return {
                    "type": "error",
                    "error": "page_id is required",
                    "error_type": "ValueError"
                }
            
            if not updates:
                return {
                    "type": "error",
                    "error": "updates is required",
                    "error_type": "ValueError"
                }
            
            if not self.notion_client:
                return {
                    "type": "error",
                    "error": "Notion client not initialized",
                    "error_type": "NotionError"
                }
            
            # Update the page
            try:
                await self.notion_client.pages.update(
                    page_id=page_id,
                    properties=updates.get("properties", {}),
                    archived=updates.get("archived", False)
                )
                
                # Add children blocks if specified
                if "children" in updates:
                    await self.notion_client.blocks.children.append(
                        block_id=page_id,
                        children=updates["children"]
                    )
                
                return {
                    "type": "notion_update_response",
                    "page_id": page_id,
                    "message": f"Notion page updated: {page_id}"
                }
                
            except Exception as e:
                return {
                    "type": "error",
                    "error": f"Error updating Notion page: {str(e)}",
                    "error_type": type(e).__name__
                }
            
        except Exception as e:
            self.logger.error(f"Error handling Notion update message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_notion_query_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a Notion query message from the message bus"""
        self.logger.info(f"Received Notion query message: {message.id}")
        
        try:
            content = message.content
            database_id = content.get("database_id")
            query = content.get("query", {})
            
            if not database_id:
                return {
                    "type": "error",
                    "error": "database_id is required",
                    "error_type": "ValueError"
                }
            
            if not self.notion_client:
                return {
                    "type": "error",
                    "error": "Notion client not initialized",
                    "error_type": "NotionError"
                }
            
            # Query the database
            try:
                response = await self.notion_client.databases.query(
                    database_id=database_id,
                    **query
                )
                
                return {
                    "type": "notion_query_response",
                    "database_id": database_id,
                    "results": response["results"],
                    "has_more": response.get("has_more", False),
                    "next_cursor": response.get("next_cursor")
                }
                
            except Exception as e:
                return {
                    "type": "error",
                    "error": f"Error querying Notion database: {str(e)}",
                    "error_type": type(e).__name__
                }
            
        except Exception as e:
            self.logger.error(f"Error handling Notion query message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }

class OrchestratorAgent(Agent):
    """
    Orchestrator Agent is responsible for coordinating workflows among agents.
    It ensures that tasks flow properly between agents and handles the overall
    execution of multi-step workflows.
    """
    
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ):
        super().__init__(agent_id, AgentRole.ORCHESTRATOR, manager, config)
        self.message_bus = message_bus
        self.workflows: Dict[str, Dict[str, Any]] = {}
        self.model = self._get_model_assignment()
        
        # Register message handlers
        self._register_message_handlers()
    
    def _get_model_assignment(self) -> ModelAssignment:
        """Get the model assignment for this agent based on config"""
        config_model = self.config.get("model", "")
        
        # Check if the model is specified in config
        try:
            return ModelAssignment(config_model) if config_model else ModelAssignment.GPT4_MINI
        except ValueError:
            self.logger.warning(f"Invalid model {config_model}, using GPT-4.1 Mini")
            return ModelAssignment.GPT4_MINI
    
    def _register_message_handlers(self) -> None:
        """Register handlers for message types"""
        self.register_message_handler("start_workflow", self._handle_start_workflow)
        self.register_message_handler("workflow_step_complete", self._handle_workflow_step_complete)
        
        # Register with message bus if available
        if self.message_bus:
            self.message_bus.register_handler(
                self.id, 
                MessageType.WORKFLOW_START,
                self._handle_workflow_start_message
            )
            self.message_bus.register_handler(
                self.id, 
                MessageType.WORKFLOW_STEP,
                self._handle_workflow_step_message
            )
    
    async def initialize(self) -> bool:
        """Initialize the Orchestrator Agent"""
        self.state = AgentState.INITIALIZING
        self.logger.info(f"Initializing Orchestrator Agent {self.id} with model {self.model}")
        
        try:
            # Subscribe to message types
            if self.message_bus:
                self.message_bus.subscribe(self.id, [
                    MessageType.WORKFLOW_START,
                    MessageType.WORKFLOW_STEP,
                    MessageType.WORKFLOW_COMPLETE,
                    MessageType.WORKFLOW_ERROR,
                ])
            
            self.state = AgentState.IDLE
            self.logger.info(f"Orchestrator Agent {self.id} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Orchestrator Agent: {str(e)}")
            self.state = AgentState.ERROR
            return False
    
    async def start_workflow(
        self,
        workflow_type: str,
        title: str,
        description: str,
        initial_context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Start a new workflow"""
        import uuid
        
        self.state = AgentState.PROCESSING
        self.logger.info(f"Starting workflow {workflow_type}: {title}")
        
        workflow_id = str(uuid.uuid4())
        workflow = {
            "workflow_id": workflow_id,
            "workflow_type": workflow_type,
            "title": title,
            "description": description,
            "status": "started",
            "created_at": time.time(),
            "updated_at": time.time(),
            "context": initial_context or {},
            "steps": [],
            "current_step_index": -1,
            "agent_assignments": {}
        }
        
        # Initialize workflow based on type
        if workflow_type == "plan_execute_review":
            # A standard plan-execute-review workflow
            workflow["steps"] = [
                {
                    "step_id": "plan",
                    "title": "Create Plan",
                    "description": f"Create a plan for {title}",
                    "agent_role": AgentRole.PLANNER.value,
                    "status": "pending",
                    "dependencies": [],
                    "outputs": ["task_id", "plan"]
                },
                {
                    "step_id": "review_plan",
                    "title": "Review Plan",
                    "description": f"Review the plan for {title}",
                    "agent_role": AgentRole.REVIEWER.value,
                    "status": "pending",
                    "dependencies": ["plan"],
                    "outputs": ["review_request_id", "approval"]
                },
                {
                    "step_id": "execute",
                    "title": "Execute Plan",
                    "description": f"Execute the approved plan for {title}",
                    "agent_role": AgentRole.EXECUTOR.value,
                    "status": "pending",
                    "dependencies": ["review_plan"],
                    "outputs": ["execution_result"]
                },
                {
                    "step_id": "review_execution",
                    "title": "Review Execution",
                    "description": f"Review the execution of {title}",
                    "agent_role": AgentRole.REVIEWER.value,
                    "status": "pending",
                    "dependencies": ["execute"],
                    "outputs": ["review_request_id", "approval"]
                },
                {
                    "step_id": "document",
                    "title": "Document Results",
                    "description": f"Document the results of {title}",
                    "agent_role": AgentRole.NOTION.value,
                    "status": "pending",
                    "dependencies": ["review_execution"],
                    "outputs": ["page_id"]
                }
            ]
        elif workflow_type == "execute_only":
            # A simplified execute-only workflow
            workflow["steps"] = [
                {
                    "step_id": "execute",
                    "title": "Execute Task",
                    "description": f"Execute {title}",
                    "agent_role": AgentRole.EXECUTOR.value,
                    "status": "pending",
                    "dependencies": [],
                    "outputs": ["execution_result"]
                },
                {
                    "step_id": "review_execution",
                    "title": "Review Execution",
                    "description": f"Review the execution of {title}",
                    "agent_role": AgentRole.REVIEWER.value,
                    "status": "pending",
                    "dependencies": ["execute"],
                    "outputs": ["review_request_id", "approval"]
                },
                {
                    "step_id": "document",
                    "title": "Document Results",
                    "description": f"Document the results of {title}",
                    "agent_role": AgentRole.NOTION.value,
                    "status": "pending",
                    "dependencies": ["review_execution"],
                    "outputs": ["page_id"]
                }
            ]
        else:
            # Unknown workflow type
            self.logger.warning(f"Unknown workflow type: {workflow_type}")
            self.state = AgentState.IDLE
            return {
                "error": f"Unknown workflow type: {workflow_type}",
                "workflow_id": workflow_id,
                "status": "failed"
            }
        
        # Store the workflow
        self.workflows[workflow_id] = workflow
        
        # Start the first step
        await self._start_next_workflow_step(workflow_id)
        
        self.state = AgentState.IDLE
        return {
            "workflow_id": workflow_id,
            "status": "started",
            "workflow_type": workflow_type,
            "title": title,
            "step_count": len(workflow["steps"])
        }
    
    async def _start_next_workflow_step(self, workflow_id: str) -> None:
        """Start the next step in a workflow"""
        if workflow_id not in self.workflows:
            self.logger.warning(f"Workflow {workflow_id} not found")
            return
            
        workflow = self.workflows[workflow_id]
        current_index = workflow["current_step_index"]
        
        # Check if we're at the end of the workflow
        if current_index + 1 >= len(workflow["steps"]):
            workflow["status"] = "completed"
            workflow["updated_at"] = time.time()
            self.logger.info(f"Workflow {workflow_id} completed")
            return
        
        # Move to the next step
        next_index = current_index + 1
        workflow["current_step_index"] = next_index
        step = workflow["steps"][next_index]
        step["status"] = "in_progress"
        step["started_at"] = time.time()
        
        self.logger.info(f"Starting step {step['step_id']} in workflow {workflow_id}")
        
        # Check if dependencies are satisfied
        for dep_step_id in step["dependencies"]:
            dep_step_index = next(
                (i for i, s in enumerate(workflow["steps"]) if s["step_id"] == dep_step_id),
                None
            )
            
            if dep_step_index is None:
                self.logger.warning(f"Dependency {dep_step_id} not found in workflow {workflow_id}")
                step["status"] = "failed"
                step["error"] = f"Dependency {dep_step_id} not found"
                return
                
            dep_step = workflow["steps"][dep_step_index]
            if dep_step["status"] != "completed":
                self.logger.warning(f"Dependency {dep_step_id} not completed in workflow {workflow_id}")
                step["status"] = "blocked"
                step["error"] = f"Dependency {dep_step_id} not completed"
                return
        
        # Find an agent for this step
        agent_role = AgentRole(step["agent_role"])
        agent_id = await self._find_agent_for_role(agent_role)
        
        if not agent_id:
            self.logger.warning(f"No agent found for role {agent_role.value}")
            step["status"] = "failed"
            step["error"] = f"No agent found for role {agent_role.value}"
            return
            
        # Assign the agent
        workflow["agent_assignments"][step["step_id"]] = agent_id
        
        # Prepare the message content based on agent role
        content = {
            "workflow_id": workflow_id,
            "step_id": step["step_id"],
            "title": step["title"],
            "description": step["description"],
            "context": workflow["context"].copy()
        }
        
        # Add role-specific content
        if agent_role == AgentRole.PLANNER:
            content["type"] = "plan_request"
            content["complexity"] = "medium"
            
        elif agent_role == AgentRole.EXECUTOR:
            content["type"] = "execute_task"
            content["task_id"] = f"{workflow_id}_{step['step_id']}"
            
            # Add plan from planning step if this is an execution step
            if step["step_id"] == "execute" and "plan" in workflow["context"]:
                content["plan"] = workflow["context"]["plan"]
                
        elif agent_role == AgentRole.REVIEWER:
            content["type"] = "review_request"
            
            if step["step_id"] == "review_plan":
                content["review_type"] = ReviewType.PRE_IMPLEMENTATION.value
                content["content"] = {
                    "task_id": workflow["context"].get("task_id"),
                    "plan": workflow["context"].get("plan", {}),
                    "strategic_goals": workflow["context"].get("strategic_goals", "")
                }
                
            elif step["step_id"] == "review_execution":
                content["review_type"] = ReviewType.POST_IMPLEMENTATION.value
                content["content"] = {
                    "task_id": workflow["context"].get("task_id"),
                    "implementation": workflow["context"].get("execution_result", {}),
                    "implemented": True,
                    "implementation_details": workflow["context"].get("execution_result", {}).get("details", "")
                }
                
            content["process_now"] = True
            
        elif agent_role == AgentRole.NOTION:
            content["type"] = "document_task"
            content["content_type"] = "task"
            
            # Create a task object for documentation
            content["task"] = {
                "task_id": workflow["context"].get("task_id", f"{workflow_id}_{step['step_id']}"),
                "title": workflow["title"],
                "description": workflow["description"],
                "status": "completed",
                "content": {
                    "plan": workflow["context"].get("plan", {}),
                    "execution_result": workflow["context"].get("execution_result", {})
                }
            }
        
        # Send the message
        message = Message(
            sender=self.id,
            recipient=agent_id,
            content=content,
            priority=MessagePriority.NORMAL
        )
        
        self.logger.info(f"Sending message to agent {agent_id} for step {step['step_id']}")
        response = await self.manager.route_message(message)
        
        # Store the agent's response
        if response:
            step["agent_response"] = response.content
            
            # Update step status based on response
            if "error" in response.content:
                step["status"] = "failed"
                step["error"] = response.content["error"]
                self.logger.warning(f"Step {step['step_id']} failed: {step['error']}")
            else:
                # Extract outputs from response
                for output_key in step["outputs"]:
                    if output_key in response.content:
                        workflow["context"][output_key] = response.content[output_key]
                
                # Check for role-specific outputs
                if agent_role == AgentRole.PLANNER and "task_id" in response.content:
                    workflow["context"]["task_id"] = response.content["task_id"]
                    
                elif agent_role == AgentRole.REVIEWER:
                    if "request_id" in response.content:
                        workflow["context"]["review_request_id"] = response.content["request_id"]
                    if "approval" in response.content:
                        workflow["context"]["approval"] = response.content["approval"]
                        
                elif agent_role == AgentRole.EXECUTOR and "result" in response.content:
                    workflow["context"]["execution_result"] = response.content["result"]
                    
                elif agent_role == AgentRole.NOTION and "page_id" in response.content:
                    workflow["context"]["page_id"] = response.content["page_id"]
                
                step["status"] = "completed"
                step["completed_at"] = time.time()
                self.logger.info(f"Step {step['step_id']} completed")
        else:
            step["status"] = "failed"
            step["error"] = "No response from agent"
            self.logger.warning(f"No response from agent {agent_id} for step {step['step_id']}")
        
        # Update workflow
        workflow["updated_at"] = time.time()
        
        # Start the next step if this one completed
        if step["status"] == "completed":
            await self._start_next_workflow_step(workflow_id)
    
    async def _find_agent_for_role(self, role: AgentRole) -> Optional[str]:
        """Find an available agent for a specific role"""
        if not self.manager:
            return None
            
        for agent_id, agent in self.manager.agents.items():
            if agent.role == role and agent.state == AgentState.IDLE:
                return agent_id
                
        # If no idle agent, return any agent with the right role
        for agent_id, agent in self.manager.agents.items():
            if agent.role == role:
                return agent_id
                
        return None
    
    async def update_workflow_step(
        self,
        workflow_id: str,
        step_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Update the status of a workflow step"""
        if workflow_id not in self.workflows:
            self.logger.warning(f"Workflow {workflow_id} not found")
            return {
                "error": f"Workflow {workflow_id} not found",
                "status": "failed"
            }
            
        workflow = self.workflows[workflow_id]
        step_index = next(
            (i for i, step in enumerate(workflow["steps"]) if step["step_id"] == step_id),
            None
        )
        
        if step_index is None:
            self.logger.warning(f"Step {step_id} not found in workflow {workflow_id}")
            return {
                "error": f"Step {step_id} not found",
                "status": "failed"
            }
            
        step = workflow["steps"][step_index]
        step["status"] = status
        step["updated_at"] = time.time()
        
        if result:
            if "agent_response" not in step:
                step["agent_response"] = {}
            step["agent_response"].update(result)
            
            # Extract outputs from result
            for output_key in step["outputs"]:
                if output_key in result:
                    workflow["context"][output_key] = result[output_key]
        
        if status == "completed":
            step["completed_at"] = time.time()
            
            # If this is the current step, move to the next one
            if step_index == workflow["current_step_index"]:
                await self._start_next_workflow_step(workflow_id)
                
        elif status == "failed":
            step["error"] = result.get("error") if result else "Step failed"
            workflow["status"] = "failed"
            
        workflow["updated_at"] = time.time()
        
        self.logger.info(f"Updated step {step_id} in workflow {workflow_id} to {status}")
        return {
            "workflow_id": workflow_id,
            "step_id": step_id,
            "status": status,
            "updated": True
        }
    
    # Message handlers
    
    async def _handle_start_workflow(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a start workflow message"""
        try:
            # Extract workflow details
            workflow_type = content.get("workflow_type", "plan_execute_review")
            title = content.get("title", "Untitled Workflow")
            description = content.get("description", "")
            initial_context = content.get("context", {})
            
            # Start the workflow
            result = await self.start_workflow(
                workflow_type=workflow_type,
                title=title,
                description=description,
                initial_context=initial_context
            )
            
            return {
                "type": "start_workflow_response",
                **result
            }
            
        except Exception as e:
            self.logger.error(f"Error handling start workflow: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_workflow_step_complete(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a workflow step complete message"""
        try:
            # Extract step details
            workflow_id = content.get("workflow_id")
            step_id = content.get("step_id")
            status = content.get("status", "completed")
            result = content.get("result")
            
            if not workflow_id or not step_id:
                return {
                    "type": "error",
                    "error": "workflow_id and step_id are required",
                    "error_type": "ValueError"
                }
                
            # Update the workflow step
            update_result = await self.update_workflow_step(
                workflow_id=workflow_id,
                step_id=step_id,
                status=status,
                result=result
            )
            
            return {
                "type": "workflow_step_complete_response",
                **update_result
            }
            
        except Exception as e:
            self.logger.error(f"Error handling workflow step complete: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_workflow_start_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a workflow start message from the message bus"""
        self.logger.info(f"Received workflow start message: {message.id}")
        
        try:
            content = message.content
            return await self._handle_start_workflow(content)
            
        except Exception as e:
            self.logger.error(f"Error handling workflow start message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_workflow_step_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a workflow step message from the message bus"""
        self.logger.info(f"Received workflow step message: {message.id}")
        
        try:
            content = message.content
            return await self._handle_workflow_step_complete(content)
            
        except Exception as e:
            self.logger.error(f"Error handling workflow step message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }

# Factory function to create specialized agents based on role
def create_agent(
    role: AgentRole,
    agent_id: str,
    manager: AgentManager,
    config: Dict[str, Any] = None,
    message_bus: Optional[MessageBus] = None,
) -> Agent:
    """Create a specialized agent based on role"""
    if role == AgentRole.PLANNER:
        return PlannerAgent(agent_id, manager, config, message_bus)
    elif role == AgentRole.EXECUTOR:
        return ExecutorAgent(agent_id, manager, config, message_bus)
    elif role == AgentRole.REVIEWER:
        return ReviewerAgent(agent_id, manager, config, message_bus)
    elif role == AgentRole.NOTION:
        return NotionAgent(agent_id, manager, config, message_bus)
    elif role == AgentRole.ORCHESTRATOR:
        return OrchestratorAgent(agent_id, manager, config, message_bus)
    else:
        # Default to base Agent class for other roles
        return Agent(agent_id, role, manager, config)