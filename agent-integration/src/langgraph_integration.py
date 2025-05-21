"""
LangGraph Integration: Integrates LangGraph for agent workflows and structured multi-agent
interactions within the SecondBrain architecture.

This module provides the LangGraphIntegration class, which enables the creation and
execution of structured agent workflows using LangGraph. It supports agent
transitions, state management, and persistence of workflow context.
"""

import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Callable, Type, Set, Tuple
from enum import Enum
from dataclasses import dataclass, field, asdict

from .agent_manager import Agent, AgentRole, AgentState, Message, MessagePriority, AgentManager
from .agent_roles import PlannerAgent, ExecutorAgent, ReviewerAgent, NotionAgent, OrchestratorAgent
from .communication_protocol import MessageType, MessageBus
from .context_persistence import ContextPersistenceManager, ContextObject, ContextType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('langgraph_integration')

# Try to import LangGraph
try:
    import langgraph.graph as lg
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    logger.warning("LangGraph package not installed, LangGraph integration disabled")
    LANGGRAPH_AVAILABLE = False
    # Create dummy classes for type hints
    class StateGraph:
        def __init__(self, *args, **kwargs):
            pass
    END = "END"

# Workflow state status
class WorkflowStatus(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class WorkflowState:
    """Represents the state of a workflow"""
    workflow_id: str
    workflow_type: str
    title: str
    description: str
    status: WorkflowStatus = WorkflowStatus.CREATED
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    current_step: Optional[str] = None
    step_history: List[Dict[str, Any]] = field(default_factory=list)
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    agent_assignments: Dict[str, str] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)
    errors: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = asdict(self)
        # Convert enums to their values
        result["status"] = self.status.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkflowState':
        """Create from dictionary representation"""
        # Convert string values to enums
        if "status" in data:
            data["status"] = WorkflowStatus(data["status"])
        
        return cls(**data)
    
    def update_status(self, status: WorkflowStatus) -> None:
        """Update workflow status"""
        self.status = status
        self.updated_at = time.time()
        
        if status == WorkflowStatus.COMPLETED:
            self.completed_at = time.time()
    
    def add_step_to_history(
        self,
        step_name: str,
        inputs: Dict[str, Any],
        outputs: Optional[Dict[str, Any]] = None,
        status: str = "completed",
        error: Optional[str] = None
    ) -> None:
        """Add a step to the workflow history"""
        step = {
            "step_name": step_name,
            "inputs": inputs,
            "outputs": outputs or {},
            "status": status,
            "started_at": time.time(),
            "completed_at": time.time() if status in ["completed", "failed"] else None
        }
        
        if error:
            step["error"] = error
            
        self.step_history.append(step)
        self.updated_at = time.time()
    
    def assign_agent(self, step_name: str, agent_id: str) -> None:
        """Assign an agent to a workflow step"""
        self.agent_assignments[step_name] = agent_id
        self.updated_at = time.time()
    
    def set_current_step(self, step_name: Optional[str]) -> None:
        """Set the current workflow step"""
        self.current_step = step_name
        self.updated_at = time.time()
    
    def add_error(self, step_name: str, error_message: str, details: Any = None) -> None:
        """Add an error to the workflow"""
        error = {
            "step": step_name,
            "message": error_message,
            "timestamp": time.time()
        }
        
        if details:
            error["details"] = details
            
        self.errors.append(error)
        self.updated_at = time.time()

class LangGraphIntegration:
    """
    Integrates LangGraph for agent workflows and graph-based agent coordination.
    Provides structured workflows for agent interactions and state management.
    """
    
    def __init__(
        self,
        agent_manager: AgentManager,
        context_manager: Optional[ContextPersistenceManager] = None,
        message_bus: Optional[MessageBus] = None,
        config: Dict[str, Any] = None
    ):
        self.agent_manager = agent_manager
        self.context_manager = context_manager
        self.message_bus = message_bus
        self.config = config or {}
        self.logger = logging.getLogger('langgraph_integration')
        
        # Workflow registry
        self.workflows: Dict[str, Dict[str, Any]] = {}
        self.workflow_states: Dict[str, WorkflowState] = {}
        self.workflow_graphs: Dict[str, StateGraph] = {}
        
        # Check if LangGraph is available
        if not LANGGRAPH_AVAILABLE:
            self.logger.warning("LangGraph package not installed, LangGraph integration disabled")
    
    async def create_workflow(
        self,
        workflow_type: str,
        title: str,
        description: str,
        inputs: Dict[str, Any] = None
    ) -> WorkflowState:
        """Create a new workflow"""
        import uuid
        
        if not LANGGRAPH_AVAILABLE:
            raise ImportError("LangGraph package not installed, cannot create workflow")
            
        workflow_id = str(uuid.uuid4())
        
        # Create workflow state
        workflow_state = WorkflowState(
            workflow_id=workflow_id,
            workflow_type=workflow_type,
            title=title,
            description=description,
            inputs=inputs or {}
        )
        
        # Register workflow
        self.workflow_states[workflow_id] = workflow_state
        
        self.logger.info(f"Created workflow {workflow_id} of type {workflow_type}: {title}")
        
        # Create workflow graph based on type
        if workflow_type == "planner_executor_reviewer":
            await self._create_planner_executor_reviewer_workflow(workflow_id)
        elif workflow_type == "executor_reviewer":
            await self._create_executor_reviewer_workflow(workflow_id)
        elif workflow_type == "documentation_workflow":
            await self._create_documentation_workflow(workflow_id)
        else:
            self.logger.warning(f"Unknown workflow type: {workflow_type}")
            workflow_state.add_error("create_workflow", f"Unknown workflow type: {workflow_type}")
            workflow_state.update_status(WorkflowStatus.FAILED)
        
        # Persist workflow state if context manager is available
        if self.context_manager:
            await self._persist_workflow_state(workflow_state)
        
        return workflow_state
    
    async def _create_planner_executor_reviewer_workflow(self, workflow_id: str) -> None:
        """Create a planner-executor-reviewer workflow"""
        workflow_state = self.workflow_states[workflow_id]
        
        # Define workflow steps
        steps = {
            "planner": self._create_planner_node,
            "reviewer_plan": self._create_reviewer_plan_node,
            "executor": self._create_executor_node,
            "reviewer_execution": self._create_reviewer_execution_node,
            "notion": self._create_notion_node
        }
        
        # Define workflow graph
        workflow_config = {
            "steps": steps,
            "transitions": {
                "planner": lambda state: "reviewer_plan",
                "reviewer_plan": lambda state: "executor" if state.get("plan_approved", False) else "planner",
                "executor": lambda state: "reviewer_execution",
                "reviewer_execution": lambda state: "notion" if state.get("execution_approved", False) else "executor",
                "notion": lambda state: END
            },
            "initial_step": "planner"
        }
        
        # Store workflow configuration
        self.workflows[workflow_id] = workflow_config
        
        # Build graph (will be compiled when needed)
        builder = lg.StateGraph(WorkflowState)
        
        # Add nodes
        for step_name, step_fn in workflow_config["steps"].items():
            # Create a wrapper that binds the workflow_id
            node_fn = lambda state, step_name=step_name, step_fn=step_fn: step_fn(workflow_id, state, step_name)
            builder.add_node(step_name, node_fn)
        
        # Add edges
        for step_name, transition_fn in workflow_config["transitions"].items():
            if transition_fn({"dummy": "state"}) == END:
                builder.add_edge(step_name, END)
            else:
                builder.add_conditional_edges(
                    step_name,
                    lambda state, transition_fn=transition_fn: transition_fn(state)
                )
        
        # Set entry point
        builder.set_entry_point(workflow_config["initial_step"])
        
        # Compile graph
        graph = builder.compile()
        
        # Store graph
        self.workflow_graphs[workflow_id] = graph
        
        workflow_state.status = WorkflowStatus.CREATED
        self.logger.info(f"Created planner-executor-reviewer workflow graph for {workflow_id}")
    
    async def _create_executor_reviewer_workflow(self, workflow_id: str) -> None:
        """Create an executor-reviewer workflow"""
        workflow_state = self.workflow_states[workflow_id]
        
        # Define workflow steps
        steps = {
            "executor": self._create_executor_node,
            "reviewer": self._create_reviewer_execution_node,
            "notion": self._create_notion_node
        }
        
        # Define workflow graph
        workflow_config = {
            "steps": steps,
            "transitions": {
                "executor": lambda state: "reviewer",
                "reviewer": lambda state: "notion" if state.get("execution_approved", False) else "executor",
                "notion": lambda state: END
            },
            "initial_step": "executor"
        }
        
        # Store workflow configuration
        self.workflows[workflow_id] = workflow_config
        
        # Build graph (will be compiled when needed)
        builder = lg.StateGraph(WorkflowState)
        
        # Add nodes
        for step_name, step_fn in workflow_config["steps"].items():
            # Create a wrapper that binds the workflow_id
            node_fn = lambda state, step_name=step_name, step_fn=step_fn: step_fn(workflow_id, state, step_name)
            builder.add_node(step_name, node_fn)
        
        # Add edges
        for step_name, transition_fn in workflow_config["transitions"].items():
            if transition_fn({"dummy": "state"}) == END:
                builder.add_edge(step_name, END)
            else:
                builder.add_conditional_edges(
                    step_name,
                    lambda state, transition_fn=transition_fn: transition_fn(state)
                )
        
        # Set entry point
        builder.set_entry_point(workflow_config["initial_step"])
        
        # Compile graph
        graph = builder.compile()
        
        # Store graph
        self.workflow_graphs[workflow_id] = graph
        
        workflow_state.status = WorkflowStatus.CREATED
        self.logger.info(f"Created executor-reviewer workflow graph for {workflow_id}")
    
    async def _create_documentation_workflow(self, workflow_id: str) -> None:
        """Create a documentation workflow"""
        workflow_state = self.workflow_states[workflow_id]
        
        # Define workflow steps
        steps = {
            "notion": self._create_notion_node
        }
        
        # Define workflow graph
        workflow_config = {
            "steps": steps,
            "transitions": {
                "notion": lambda state: END
            },
            "initial_step": "notion"
        }
        
        # Store workflow configuration
        self.workflows[workflow_id] = workflow_config
        
        # Build graph (will be compiled when needed)
        builder = lg.StateGraph(WorkflowState)
        
        # Add nodes
        for step_name, step_fn in workflow_config["steps"].items():
            # Create a wrapper that binds the workflow_id
            node_fn = lambda state, step_name=step_name, step_fn=step_fn: step_fn(workflow_id, state, step_name)
            builder.add_node(step_name, node_fn)
        
        # Add edges
        for step_name, transition_fn in workflow_config["transitions"].items():
            builder.add_edge(step_name, END)
        
        # Set entry point
        builder.set_entry_point(workflow_config["initial_step"])
        
        # Compile graph
        graph = builder.compile()
        
        # Store graph
        self.workflow_graphs[workflow_id] = graph
        
        workflow_state.status = WorkflowStatus.CREATED
        self.logger.info(f"Created documentation workflow graph for {workflow_id}")
    
    async def _persist_workflow_state(self, workflow_state: WorkflowState) -> None:
        """Persist workflow state using context manager"""
        if not self.context_manager:
            return
            
        try:
            # Create context object for workflow state
            context = ContextObject(
                metadata=self.context_manager.ContextMetadata(
                    context_type=ContextType.WORKFLOW,
                    workflow_id=workflow_state.workflow_id
                ),
                content=workflow_state.to_dict()
            )
            
            # Store context
            await self.context_manager.store_context(context)
            self.logger.info(f"Persisted workflow state for {workflow_state.workflow_id}")
            
        except Exception as e:
            self.logger.error(f"Error persisting workflow state: {str(e)}")
    
    async def execute_workflow(self, workflow_id: str) -> WorkflowState:
        """Execute a workflow"""
        if not LANGGRAPH_AVAILABLE:
            raise ImportError("LangGraph package not installed, cannot execute workflow")
            
        if workflow_id not in self.workflow_states or workflow_id not in self.workflow_graphs:
            raise ValueError(f"Workflow {workflow_id} not found")
            
        workflow_state = self.workflow_states[workflow_id]
        graph = self.workflow_graphs[workflow_id]
        
        try:
            # Update workflow status
            workflow_state.update_status(WorkflowStatus.RUNNING)
            
            # Execute the workflow graph with the initial state
            self.logger.info(f"Executing workflow {workflow_id}")
            
            # LangGraph execution is synchronous, so run it in a thread
            loop = asyncio.get_event_loop()
            final_state = await loop.run_in_executor(
                None,
                lambda: graph.run(workflow_state)
            )
            
            # Update workflow state from final state
            for key, value in final_state.items():
                setattr(workflow_state, key, value)
            
            # Update workflow status
            workflow_state.update_status(WorkflowStatus.COMPLETED)
            
            # Persist workflow state
            if self.context_manager:
                await self._persist_workflow_state(workflow_state)
            
            self.logger.info(f"Workflow {workflow_id} completed successfully")
            return workflow_state
            
        except Exception as e:
            self.logger.error(f"Error executing workflow {workflow_id}: {str(e)}")
            workflow_state.add_error("execute_workflow", str(e))
            workflow_state.update_status(WorkflowStatus.FAILED)
            
            # Persist workflow state
            if self.context_manager:
                await self._persist_workflow_state(workflow_state)
                
            return workflow_state
    
    async def execute_workflow_step(
        self,
        workflow_id: str,
        step_name: str
    ) -> WorkflowState:
        """Execute a single step of a workflow"""
        if not LANGGRAPH_AVAILABLE:
            raise ImportError("LangGraph package not installed, cannot execute workflow step")
            
        if workflow_id not in self.workflow_states or workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
            
        workflow_state = self.workflow_states[workflow_id]
        workflow_config = self.workflows[workflow_id]
        
        if step_name not in workflow_config["steps"]:
            raise ValueError(f"Step {step_name} not found in workflow {workflow_id}")
            
        try:
            # Get the step function
            step_fn = workflow_config["steps"][step_name]
            
            # Update workflow state
            workflow_state.set_current_step(step_name)
            if workflow_state.status != WorkflowStatus.RUNNING:
                workflow_state.update_status(WorkflowStatus.RUNNING)
            
            # Execute the step
            self.logger.info(f"Executing workflow {workflow_id} step {step_name}")
            
            # Step execution
            try:
                updated_state = await step_fn(workflow_id, workflow_state, step_name)
                
                # Update workflow state
                workflow_state.add_step_to_history(
                    step_name,
                    workflow_state.inputs,
                    updated_state.outputs,
                    "completed"
                )
                
                # Copy attributes from updated state
                for key, value in asdict(updated_state).items():
                    if key not in ["step_history", "errors"]:
                        setattr(workflow_state, key, value)
                
            except Exception as e:
                self.logger.error(f"Error executing step {step_name}: {str(e)}")
                workflow_state.add_step_to_history(
                    step_name,
                    workflow_state.inputs,
                    None,
                    "failed",
                    str(e)
                )
                workflow_state.add_error(step_name, str(e))
            
            # Determine next step
            next_step = None
            if step_name in workflow_config["transitions"]:
                transition_fn = workflow_config["transitions"][step_name]
                next_step_name = transition_fn(asdict(workflow_state))
                
                if next_step_name != END:
                    next_step = next_step_name
            
            # Update workflow state
            if next_step:
                workflow_state.set_current_step(next_step)
            else:
                workflow_state.set_current_step(None)
                workflow_state.update_status(WorkflowStatus.COMPLETED)
            
            # Persist workflow state
            if self.context_manager:
                await self._persist_workflow_state(workflow_state)
            
            return workflow_state
            
        except Exception as e:
            self.logger.error(f"Error executing workflow step: {str(e)}")
            workflow_state.add_error("execute_workflow_step", str(e))
            workflow_state.update_status(WorkflowStatus.FAILED)
            
            # Persist workflow state
            if self.context_manager:
                await self._persist_workflow_state(workflow_state)
                
            return workflow_state
    
    # Node implementations
    
    async def _create_planner_node(
        self,
        workflow_id: str,
        state: WorkflowState,
        step_name: str
    ) -> WorkflowState:
        """Create a planner node for the workflow"""
        # Find a planner agent
        planner_agent = self._find_agent_by_role(AgentRole.PLANNER)
        if not planner_agent:
            raise ValueError("No planner agent available")
            
        # Assign agent to step
        state.assign_agent(step_name, planner_agent.id)
        
        # Extract inputs from state
        title = state.title
        description = state.description
        context = state.inputs.get("context", {})
        
        # Create message for planner
        message = Message(
            sender="langgraph",
            recipient=planner_agent.id,
            content={
                "type": "plan_request",
                "title": title,
                "description": description,
                "context": context,
                "workflow_id": workflow_id
            },
            priority=MessagePriority.HIGH
        )
        
        # Send message and wait for response
        self.logger.info(f"Sending plan request to agent {planner_agent.id}")
        response = await self.agent_manager.route_message(message)
        
        if not response:
            raise ValueError(f"No response from planner agent {planner_agent.id}")
            
        # Process response
        response_content = response.content
        
        if "error" in response_content:
            raise ValueError(f"Error from planner agent: {response_content['error']}")
            
        # Extract task ID and plan
        task_id = response_content.get("task_id")
        plan = response_content.get("plan", {})
        review_request_id = response_content.get("review_request_id")
        
        # Update state
        state.outputs["task_id"] = task_id
        state.outputs["plan"] = plan
        state.outputs["review_request_id"] = review_request_id
        state.context["task_id"] = task_id
        state.context["plan"] = plan
        state.context["review_request_id"] = review_request_id
        
        self.logger.info(f"Planner created plan for workflow {workflow_id}")
        return state
    
    async def _create_reviewer_plan_node(
        self,
        workflow_id: str,
        state: WorkflowState,
        step_name: str
    ) -> WorkflowState:
        """Create a reviewer node for plan review"""
        # Find a reviewer agent
        reviewer_agent = self._find_agent_by_role(AgentRole.REVIEWER)
        if not reviewer_agent:
            raise ValueError("No reviewer agent available")
            
        # Assign agent to step
        state.assign_agent(step_name, reviewer_agent.id)
        
        # Extract inputs from state
        review_request_id = state.context.get("review_request_id")
        
        if not review_request_id:
            # If no review request ID, create a new review request
            task_id = state.context.get("task_id")
            plan = state.context.get("plan", {})
            
            if not task_id or not plan:
                raise ValueError("No task ID or plan available for review")
                
            # Create message for reviewer
            message = Message(
                sender="langgraph",
                recipient=reviewer_agent.id,
                content={
                    "type": "review_request",
                    "title": f"Plan Review: {state.title}",
                    "description": state.description,
                    "review_type": "pre_implementation",
                    "content": {
                        "task_id": task_id,
                        "plan": plan,
                        "strategic_goals": state.inputs.get("strategic_goals", "")
                    },
                    "requester_id": "langgraph",
                    "process_now": True
                },
                priority=MessagePriority.HIGH
            )
            
            # Send message and wait for response
            self.logger.info(f"Sending review request to agent {reviewer_agent.id}")
            response = await self.agent_manager.route_message(message)
            
            if not response:
                raise ValueError(f"No response from reviewer agent {reviewer_agent.id}")
                
            # Process response
            response_content = response.content
            
            if "error" in response_content:
                raise ValueError(f"Error from reviewer agent: {response_content['error']}")
                
            # Extract review request ID
            review_request_id = response_content.get("request_id")
            state.context["review_request_id"] = review_request_id
            
        # Get review status
        message = Message(
            sender="langgraph",
            recipient=reviewer_agent.id,
            content={
                "type": "review_status",
                "request_id": review_request_id
            },
            priority=MessagePriority.NORMAL
        )
        
        # Send message and wait for response
        self.logger.info(f"Checking review status for request {review_request_id}")
        response = await self.agent_manager.route_message(message)
        
        if not response:
            raise ValueError(f"No response from reviewer agent {reviewer_agent.id}")
            
        # Process response
        response_content = response.content
        
        if "error" in response_content:
            raise ValueError(f"Error from reviewer agent: {response_content['error']}")
            
        # Extract review status and approval
        status = response_content.get("status")
        approval = response_content.get("approval", False)
        
        # Update state
        state.outputs["review_status"] = status
        state.outputs["plan_approved"] = approval
        state.context["review_status"] = status
        state.context["plan_approved"] = approval
        
        self.logger.info(f"Plan review completed for workflow {workflow_id} with approval: {approval}")
        return state
    
    async def _create_executor_node(
        self,
        workflow_id: str,
        state: WorkflowState,
        step_name: str
    ) -> WorkflowState:
        """Create an executor node for the workflow"""
        # Find an executor agent
        executor_agent = self._find_agent_by_role(AgentRole.EXECUTOR)
        if not executor_agent:
            raise ValueError("No executor agent available")
            
        # Assign agent to step
        state.assign_agent(step_name, executor_agent.id)
        
        # Extract inputs from state
        task_id = state.context.get("task_id")
        plan = state.context.get("plan", {})
        
        if not task_id:
            # Generate a task ID if not available
            import uuid
            task_id = f"{workflow_id}_{uuid.uuid4()}"
            state.context["task_id"] = task_id
        
        # Create message for executor
        message = Message(
            sender="langgraph",
            recipient=executor_agent.id,
            content={
                "type": "execute_task",
                "task_id": task_id,
                "title": state.title,
                "description": state.description,
                "content": {
                    "plan": plan,
                    "workflow_id": workflow_id,
                    "inputs": state.inputs
                }
            },
            priority=MessagePriority.HIGH
        )
        
        # Send message and wait for response
        self.logger.info(f"Sending execute task request to agent {executor_agent.id}")
        response = await self.agent_manager.route_message(message)
        
        if not response:
            raise ValueError(f"No response from executor agent {executor_agent.id}")
            
        # Process response
        response_content = response.content
        
        if "error" in response_content:
            raise ValueError(f"Error from executor agent: {response_content['error']}")
            
        # Extract execution result
        execution_result = response_content.get("result", {})
        review_request_id = response_content.get("review_request_id")
        
        # Update state
        state.outputs["execution_result"] = execution_result
        state.outputs["review_request_id"] = review_request_id
        state.context["execution_result"] = execution_result
        state.context["review_request_id"] = review_request_id
        
        self.logger.info(f"Executor executed task for workflow {workflow_id}")
        return state
    
    async def _create_reviewer_execution_node(
        self,
        workflow_id: str,
        state: WorkflowState,
        step_name: str
    ) -> WorkflowState:
        """Create a reviewer node for execution review"""
        # Find a reviewer agent
        reviewer_agent = self._find_agent_by_role(AgentRole.REVIEWER)
        if not reviewer_agent:
            raise ValueError("No reviewer agent available")
            
        # Assign agent to step
        state.assign_agent(step_name, reviewer_agent.id)
        
        # Extract inputs from state
        review_request_id = state.context.get("review_request_id")
        
        if not review_request_id:
            # If no review request ID, create a new review request
            task_id = state.context.get("task_id")
            execution_result = state.context.get("execution_result", {})
            
            if not task_id or not execution_result:
                raise ValueError("No task ID or execution result available for review")
                
            # Create message for reviewer
            message = Message(
                sender="langgraph",
                recipient=reviewer_agent.id,
                content={
                    "type": "review_request",
                    "title": f"Execution Review: {state.title}",
                    "description": state.description,
                    "review_type": "post_implementation",
                    "content": {
                        "task_id": task_id,
                        "implementation": execution_result,
                        "implemented": True,
                        "implementation_details": str(execution_result)
                    },
                    "requester_id": "langgraph",
                    "process_now": True
                },
                priority=MessagePriority.HIGH
            )
            
            # Send message and wait for response
            self.logger.info(f"Sending review request to agent {reviewer_agent.id}")
            response = await self.agent_manager.route_message(message)
            
            if not response:
                raise ValueError(f"No response from reviewer agent {reviewer_agent.id}")
                
            # Process response
            response_content = response.content
            
            if "error" in response_content:
                raise ValueError(f"Error from reviewer agent: {response_content['error']}")
                
            # Extract review request ID
            review_request_id = response_content.get("request_id")
            state.context["review_request_id"] = review_request_id
            
        # Get review status
        message = Message(
            sender="langgraph",
            recipient=reviewer_agent.id,
            content={
                "type": "review_status",
                "request_id": review_request_id
            },
            priority=MessagePriority.NORMAL
        )
        
        # Send message and wait for response
        self.logger.info(f"Checking review status for request {review_request_id}")
        response = await self.agent_manager.route_message(message)
        
        if not response:
            raise ValueError(f"No response from reviewer agent {reviewer_agent.id}")
            
        # Process response
        response_content = response.content
        
        if "error" in response_content:
            raise ValueError(f"Error from reviewer agent: {response_content['error']}")
            
        # Extract review status and approval
        status = response_content.get("status")
        approval = response_content.get("approval", False)
        
        # Update state
        state.outputs["review_status"] = status
        state.outputs["execution_approved"] = approval
        state.context["review_status"] = status
        state.context["execution_approved"] = approval
        
        self.logger.info(f"Execution review completed for workflow {workflow_id} with approval: {approval}")
        return state
    
    async def _create_notion_node(
        self,
        workflow_id: str,
        state: WorkflowState,
        step_name: str
    ) -> WorkflowState:
        """Create a notion node for the workflow"""
        # Find a notion agent
        notion_agent = self._find_agent_by_role(AgentRole.NOTION)
        if not notion_agent:
            raise ValueError("No notion agent available")
            
        # Assign agent to step
        state.assign_agent(step_name, notion_agent.id)
        
        # Extract inputs from state
        task_id = state.context.get("task_id")
        execution_result = state.context.get("execution_result", {})
        
        if not task_id:
            # Generate a task ID if not available
            import uuid
            task_id = f"{workflow_id}_{uuid.uuid4()}"
            state.context["task_id"] = task_id
        
        # Create message for notion agent
        message = Message(
            sender="langgraph",
            recipient=notion_agent.id,
            content={
                "type": "document_task",
                "task": {
                    "task_id": task_id,
                    "title": state.title,
                    "description": state.description,
                    "status": "completed",
                    "content": {
                        "workflow_id": workflow_id,
                        "plan": state.context.get("plan", {}),
                        "execution_result": execution_result,
                        "inputs": state.inputs,
                        "outputs": state.outputs
                    }
                },
                "include_details": True
            },
            priority=MessagePriority.NORMAL
        )
        
        # Send message and wait for response
        self.logger.info(f"Sending document task request to agent {notion_agent.id}")
        response = await self.agent_manager.route_message(message)
        
        if not response:
            raise ValueError(f"No response from notion agent {notion_agent.id}")
            
        # Process response
        response_content = response.content
        
        if "error" in response_content:
            raise ValueError(f"Error from notion agent: {response_content['error']}")
            
        # Extract page ID
        page_id = response_content.get("page_id")
        
        # Update state
        state.outputs["notion_page_id"] = page_id
        state.context["notion_page_id"] = page_id
        
        self.logger.info(f"Notion agent documented task for workflow {workflow_id}")
        return state
    
    # Helper methods
    
    def _find_agent_by_role(self, role: AgentRole) -> Optional[Agent]:
        """Find an agent by role"""
        for agent_id, agent in self.agent_manager.agents.items():
            if agent.role == role and agent.state != AgentState.ERROR:
                return agent
        return None