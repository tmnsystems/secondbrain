"""
Enhanced LangGraph workflows with real-time context logging to Notion.

This module provides enhanced LangGraph workflows that integrate with the
CLI Session Logger for real-time context persistence.
"""

import os
import json
import uuid
from typing import Dict, List, Any, Optional, Literal, TypeVar, Callable, Union
from datetime import datetime

from langgraph.graph import StateGraph, END
import openai
import anthropic

from ..models.schema import Task, WorkflowState, TaskStep
from ..notion.client import NotionClient
from ..cli.cli_session_logger import CLISessionLogger
from ..cli.session_manager import initialize_cli_session
from ..utils.logger import get_logger

logger = get_logger(__name__)

T = TypeVar('T')

class EnhancedWorkflowManager:
    """
    Enhanced workflow manager with real-time context logging to Notion.
    
    This class extends the base WorkflowManager to integrate with the CLI Session Logger
    for real-time logging of all workflow events to Notion.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None, anthropic_api_key: Optional[str] = None,
                notion_client: Optional[NotionClient] = None):
        """
        Initialize the enhanced workflow manager.
        
        Args:
            openai_api_key: Optional OpenAI API key
            anthropic_api_key: Optional Anthropic API key
            notion_client: Optional Notion client
        """
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.notion_client = notion_client or NotionClient()
        
        # Initialize API clients
        if self.openai_api_key:
            self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
        
        if self.anthropic_api_key:
            self.anthropic_client = anthropic.Anthropic(api_key=self.anthropic_api_key)
        
        # Initialize the CLI Session Logger for real-time context logging
        self.session_logger = None
        self._initialize_session_logger()
    
    async def _initialize_session_logger(self):
        """Initialize the CLI Session Logger for real-time context logging."""
        self.session_logger = await initialize_cli_session(
            session_id=f"langgraph-workflow-{int(datetime.now().timestamp())}"
        )
        await self.session_logger.log_system_action("LANGGRAPH_WORKFLOW_INITIALIZED", {
            "timestamp": datetime.utcnow().isoformat(),
            "manager_id": f"workflow-{uuid.uuid4()}"
        })
        logger.info("CLI Session Logger initialized for LangGraph workflow")
    
    def build_task_workflow(self) -> StateGraph:
        """
        Build the enhanced task workflow with real-time context logging.
        
        Returns:
            StateGraph for the task workflow
        """
        # Define the workflow graph
        workflow = StateGraph(WorkflowState)
        
        # Add nodes for each stage of the workflow
        workflow.add_node("start", self.with_logging(self._start_workflow, "START_WORKFLOW"))
        workflow.add_node("plan", self.with_logging(self._create_plan, "CREATE_PLAN"))
        workflow.add_node("execute", self.with_logging(self._execute_task, "EXECUTE_TASK"))
        workflow.add_node("review", self.with_logging(self._review_task, "REVIEW_TASK"))
        workflow.add_node("document", self.with_logging(self._document_task, "DOCUMENT_TASK"))
        workflow.add_node("complete", self.with_logging(self._complete_workflow, "COMPLETE_WORKFLOW"))
        
        # Add edges between nodes
        workflow.add_edge("start", "plan")
        
        # Conditional edges from plan based on plan status
        workflow.add_conditional_edges(
            "plan",
            self.with_routing_logging(self._route_after_plan, "ROUTE_AFTER_PLAN"),
            {
                "execute": "execute",
                "revise_plan": "plan",
                "end": END
            }
        )
        
        # Conditional edges from execute based on execution status
        workflow.add_conditional_edges(
            "execute",
            self.with_routing_logging(self._route_after_execution, "ROUTE_AFTER_EXECUTION"),
            {
                "review": "review",
                "retry": "execute",
                "plan": "plan",
                "end": END
            }
        )
        
        # Conditional edges from review based on review status
        workflow.add_conditional_edges(
            "review",
            self.with_routing_logging(self._route_after_review, "ROUTE_AFTER_REVIEW"),
            {
                "document": "document",
                "execute": "execute",
                "end": END
            }
        )
        
        # Edge from document to complete
        workflow.add_edge("document", "complete")
        
        # Edge from complete to end
        workflow.add_edge("complete", END)
        
        # Set the entry point
        workflow.set_entry_point("start")
        
        return workflow
    
    def with_logging(self, func: Callable[[WorkflowState], WorkflowState], action_name: str) -> Callable[[WorkflowState], WorkflowState]:
        """
        Wrap a workflow function with real-time logging to Notion.
        
        Args:
            func: The function to wrap
            action_name: The name of the action being performed
            
        Returns:
            Wrapped function with real-time logging
        """
        async def log_action(state: WorkflowState, action: str, details: Dict[str, Any]):
            """Log a workflow action to Notion in real-time."""
            if not self.session_logger:
                await self._initialize_session_logger()
            
            await self.session_logger.log_system_action(action, {
                "workflow_id": state.id,
                "current_task_id": state.current_task_id,
                "status": state.status,
                **details
            })
        
        def wrapped(state: WorkflowState) -> WorkflowState:
            """Wrapped function with real-time logging."""
            # Log the action start
            import asyncio
            asyncio.create_task(log_action(state, f"{action_name}_STARTED", {
                "timestamp": datetime.utcnow().isoformat()
            }))
            
            # Call the original function
            result = func(state)
            
            # Log the action completion
            asyncio.create_task(log_action(result, f"{action_name}_COMPLETED", {
                "timestamp": datetime.utcnow().isoformat(),
                "task_count": len(result.tasks)
            }))
            
            return result
        
        return wrapped
    
    def with_routing_logging(self, func: Callable[[WorkflowState], str], action_name: str) -> Callable[[WorkflowState], str]:
        """
        Wrap a routing function with real-time logging to Notion.
        
        Args:
            func: The routing function to wrap
            action_name: The name of the routing action being performed
            
        Returns:
            Wrapped routing function with real-time logging
        """
        async def log_routing(state: WorkflowState, action: str, destination: str):
            """Log a routing decision to Notion in real-time."""
            if not self.session_logger:
                await self._initialize_session_logger()
            
            await self.session_logger.log_system_action(action, {
                "workflow_id": state.id,
                "current_task_id": state.current_task_id,
                "destination": destination,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        def wrapped(state: WorkflowState) -> str:
            """Wrapped routing function with real-time logging."""
            # Call the original function
            destination = func(state)
            
            # Log the routing decision
            import asyncio
            asyncio.create_task(log_routing(state, action_name, destination))
            
            return destination
        
        return wrapped
    
    def _start_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Start the workflow with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Starting workflow {state.id}")
        
        # Initialize the state if needed
        if not state.tasks:
            state.tasks = []
        
        if not state.logs:
            state.logs = []
        
        # Add a log entry
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "START_WORKFLOW",
            "details": {
                "workflow_id": state.id
            }
        })
        
        return state
    
    def _create_plan(self, state: WorkflowState) -> WorkflowState:
        """
        Create a plan using the Planner agent with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Creating plan for workflow {state.id}")
        
        # In a real implementation, this would use Claude Sonnet to generate a plan
        # For simplicity, we'll create a mock plan
        
        # Create a planning task if one doesn't exist
        planning_task = None
        for task in state.tasks:
            if task.agent == "planner" and task.status != "completed":
                planning_task = task
                break
        
        if not planning_task:
            planning_task = Task(
                title="Create project plan",
                description="Generate a comprehensive plan for the project",
                agent="planner",
                status="in_progress"
            )
            state.tasks.append(planning_task)
            state.current_task_id = planning_task.id
        
        # Add a log entry
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "CREATE_PLANNING_TASK",
            "details": {
                "task_id": planning_task.id,
                "title": planning_task.title
            }
        })
        
        # Add planning steps
        planning_steps = [
            "Analyzing project requirements",
            "Identifying key tasks and dependencies",
            "Assigning tasks to appropriate agents",
            "Estimating timelines"
        ]
        
        for step_desc in planning_steps:
            step = TaskStep(
                description=step_desc,
                agent="planner",
                status="completed"
            )
            planning_task.steps.append(step)
            
            # Add a log entry for each step
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "PLANNING_STEP",
                "details": {
                    "task_id": planning_task.id,
                    "step_id": step.id,
                    "description": step.description
                }
            })
        
        # Generate a plan
        plan = {
            "title": "Project Implementation Plan",
            "tasks": [
                {
                    "title": "Research and analysis",
                    "agent": "planner",
                    "description": "Research existing solutions and analyze requirements",
                    "priority": "high"
                },
                {
                    "title": "System architecture design",
                    "agent": "planner",
                    "description": "Design the system architecture including components and interactions",
                    "priority": "high"
                },
                {
                    "title": "Core functionality implementation",
                    "agent": "executor",
                    "description": "Implement the core functionality of the system",
                    "priority": "high"
                },
                {
                    "title": "Testing and validation",
                    "agent": "executor",
                    "description": "Test the implementation and validate against requirements",
                    "priority": "medium"
                },
                {
                    "title": "Code review and optimization",
                    "agent": "reviewer",
                    "description": "Review the code for quality and optimize as needed",
                    "priority": "medium"
                },
                {
                    "title": "Documentation",
                    "agent": "notion",
                    "description": "Create comprehensive documentation for the system",
                    "priority": "low"
                }
            ]
        }
        
        # Add the plan to the task result
        result_step = TaskStep(
            description="Generated project plan",
            agent="planner",
            status="completed",
            result=plan
        )
        planning_task.steps.append(result_step)
        
        # Add a log entry for the plan generation
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "PLAN_GENERATED",
            "details": {
                "task_id": planning_task.id,
                "step_id": result_step.id,
                "plan_title": plan["title"],
                "task_count": len(plan["tasks"])
            }
        })
        
        # Mark the planning task as completed
        planning_task.status = "completed"
        planning_task.completed_at = datetime.utcnow()
        
        # Add a log entry for task completion
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "PLANNING_TASK_COMPLETED",
            "details": {
                "task_id": planning_task.id,
                "title": planning_task.title
            }
        })
        
        # Convert plan tasks to actual tasks in the workflow
        for plan_task in plan["tasks"]:
            if plan_task["agent"] != "planner":  # Skip planner tasks, we've already done those
                task = Task(
                    title=plan_task["title"],
                    description=plan_task["description"],
                    agent=plan_task["agent"],
                    priority=plan_task["priority"],
                    status="pending"
                )
                state.tasks.append(task)
                
                # Add a log entry for each task
                state.logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "action": "TASK_CREATED",
                    "details": {
                        "task_id": task.id,
                        "title": task.title,
                        "agent": task.agent,
                        "priority": task.priority
                    }
                })
        
        return state
    
    def _route_after_plan(self, state: WorkflowState) -> Literal["execute", "revise_plan", "end"]:
        """
        Determine the next step after planning.
        
        Args:
            state: Current workflow state
            
        Returns:
            Next node to execute
        """
        # Check if there are tasks for the executor
        executor_tasks = [t for t in state.tasks if t.agent == "executor" and t.status == "pending"]
        
        if executor_tasks:
            # Add a log entry
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "ROUTE_AFTER_PLAN",
                "details": {
                    "destination": "execute",
                    "reason": f"Found {len(executor_tasks)} pending executor tasks"
                }
            })
            return "execute"
        
        # Check if there are tasks for other agents (except planner)
        other_tasks = [t for t in state.tasks if t.agent != "planner" and t.status == "pending"]
        
        if other_tasks:
            # We need to revise the plan to include executor tasks
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "ROUTE_AFTER_PLAN",
                "details": {
                    "destination": "revise_plan",
                    "reason": "Found non-executor tasks that need execution tasks"
                }
            })
            return "revise_plan"
        
        # No tasks to execute, end the workflow
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "ROUTE_AFTER_PLAN",
            "details": {
                "destination": "end",
                "reason": "No pending tasks to execute"
            }
        })
        return "end"
    
    def _execute_task(self, state: WorkflowState) -> WorkflowState:
        """
        Execute a task using the Executor agent with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Executing task for workflow {state.id}")
        
        # Find the next executor task to execute
        executor_task = None
        for task in state.tasks:
            if task.agent == "executor" and task.status == "pending":
                executor_task = task
                break
        
        if not executor_task:
            # No executor tasks to execute
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "EXECUTE_TASK_SKIPPED",
                "details": {
                    "reason": "No pending executor tasks found"
                }
            })
            return state
        
        # Update the current task
        state.current_task_id = executor_task.id
        executor_task.status = "in_progress"
        
        # Add a log entry
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "EXECUTE_TASK_STARTED",
            "details": {
                "task_id": executor_task.id,
                "title": executor_task.title
            }
        })
        
        # Add execution steps
        execution_steps = [
            "Analyzing task requirements",
            "Setting up execution environment",
            "Implementing functionality",
            "Testing implementation"
        ]
        
        for step_desc in execution_steps:
            step = TaskStep(
                description=step_desc,
                agent="executor",
                status="completed"
            )
            executor_task.steps.append(step)
            
            # Add a log entry for each step
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "EXECUTION_STEP",
                "details": {
                    "task_id": executor_task.id,
                    "step_id": step.id,
                    "description": step.description
                }
            })
        
        # Generate an execution result
        execution_result = {
            "status": "success",
            "details": "Successfully implemented the requested functionality according to specifications.",
            "artifacts": [
                {
                    "type": "code",
                    "name": "implementation.py",
                    "content": "# Implementation code\ndef main():\n    print('Hello, world!')\n\nif __name__ == '__main__':\n    main()"
                },
                {
                    "type": "test",
                    "name": "test_implementation.py",
                    "content": "# Test code\ndef test_main():\n    assert True"
                }
            ]
        }
        
        # Add the execution result to the task
        result_step = TaskStep(
            description="Implemented and tested functionality",
            agent="executor",
            status="completed",
            result=execution_result
        )
        executor_task.steps.append(result_step)
        
        # Add a log entry for the execution result
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "EXECUTION_COMPLETED",
            "details": {
                "task_id": executor_task.id,
                "step_id": result_step.id,
                "status": execution_result["status"],
                "artifact_count": len(execution_result["artifacts"])
            }
        })
        
        # Mark the execution task as needing review
        executor_task.status = "needs_review"
        
        # Add a log entry for task status update
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "TASK_STATUS_UPDATED",
            "details": {
                "task_id": executor_task.id,
                "status": executor_task.status
            }
        })
        
        return state
    
    def _route_after_execution(self, state: WorkflowState) -> Literal["review", "retry", "plan", "end"]:
        """
        Determine the next step after execution with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Next node to execute
        """
        # Get the current task
        current_task = next((t for t in state.tasks if t.id == state.current_task_id), None)
        
        if not current_task:
            # No current task, go back to planning
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "ROUTE_AFTER_EXECUTION",
                "details": {
                    "destination": "plan",
                    "reason": "No current task found"
                }
            })
            return "plan"
        
        if current_task.status == "needs_review":
            # Task needs review
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "ROUTE_AFTER_EXECUTION",
                "details": {
                    "destination": "review",
                    "reason": f"Task {current_task.id} needs review"
                }
            })
            return "review"
        
        if current_task.status == "failed":
            # Task failed, retry execution
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "ROUTE_AFTER_EXECUTION",
                "details": {
                    "destination": "retry",
                    "reason": f"Task {current_task.id} failed, retrying"
                }
            })
            return "retry"
        
        # Check if there are more executor tasks
        more_executor_tasks = any(t.agent == "executor" and t.status == "pending" for t in state.tasks)
        
        if more_executor_tasks:
            # Execute the next task
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "ROUTE_AFTER_EXECUTION",
                "details": {
                    "destination": "execute",
                    "reason": "Found more pending executor tasks"
                }
            })
            return "execute"
        
        # No more executor tasks, end execution phase
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "ROUTE_AFTER_EXECUTION",
            "details": {
                "destination": "review",
                "reason": "No more pending executor tasks, proceeding to review"
                }
        })
        return "review"
    
    def _review_task(self, state: WorkflowState) -> WorkflowState:
        """
        Review a task using the Reviewer agent with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Reviewing task for workflow {state.id}")
        
        # Get the current task
        current_task = next((t for t in state.tasks if t.id == state.current_task_id), None)
        
        if not current_task or current_task.status != "needs_review":
            # No task to review
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "REVIEW_TASK_SKIPPED",
                "details": {
                    "reason": "No task needing review found"
                }
            })
            return state
        
        # Create a review task
        review_task = Task(
            title=f"Review: {current_task.title}",
            description=f"Review the execution of task: {current_task.title}",
            agent="reviewer",
            status="in_progress"
        )
        state.tasks.append(review_task)
        
        # Add a log entry
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "REVIEW_TASK_STARTED",
            "details": {
                "review_task_id": review_task.id,
                "original_task_id": current_task.id,
                "title": review_task.title
            }
        })
        
        # Add review steps
        review_steps = [
            "Analyzing execution results",
            "Checking implementation against requirements",
            "Validating code quality",
            "Verifying tests"
        ]
        
        for step_desc in review_steps:
            step = TaskStep(
                description=step_desc,
                agent="reviewer",
                status="completed"
            )
            review_task.steps.append(step)
            
            # Add a log entry for each step
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "REVIEW_STEP",
                "details": {
                    "task_id": review_task.id,
                    "step_id": step.id,
                    "description": step.description
                }
            })
        
        # Generate a review result
        review_result = {
            "status": "approved",
            "feedback": "The implementation meets the requirements and follows best practices.",
            "issues": [],
            "recommendations": [
                "Add more comprehensive tests",
                "Consider documenting edge cases",
                "Optimize performance in critical sections"
            ]
        }
        
        # Add the review result to the task
        result_step = TaskStep(
            description="Completed review of implementation",
            agent="reviewer",
            status="completed",
            result=review_result
        )
        review_task.steps.append(result_step)
        
        # Add a log entry for the review result
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "REVIEW_COMPLETED",
            "details": {
                "task_id": review_task.id,
                "step_id": result_step.id,
                "status": review_result["status"],
                "recommendation_count": len(review_result["recommendations"])
            }
        })
        
        # Mark the review task as completed
        review_task.status = "completed"
        review_task.completed_at = datetime.utcnow()
        
        # Mark the original task as completed
        current_task.status = "completed"
        current_task.completed_at = datetime.utcnow()
        current_task.reviewed_by = "reviewer"
        
        # Add a log entry for task completion
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "TASKS_COMPLETED",
            "details": {
                "review_task_id": review_task.id,
                "original_task_id": current_task.id
            }
        })
        
        return state
    
    def _route_after_review(self, state: WorkflowState) -> Literal["document", "execute", "end"]:
        """
        Determine the next step after review with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Next node to execute
        """
        # Check if there are more executor tasks
        more_executor_tasks = any(t.agent == "executor" and t.status == "pending" for t in state.tasks)
        
        if more_executor_tasks:
            # Execute the next task
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "ROUTE_AFTER_REVIEW",
                "details": {
                    "destination": "execute",
                    "reason": "Found more pending executor tasks"
                }
            })
            return "execute"
        
        # All execution tasks are done, proceed to documentation
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "ROUTE_AFTER_REVIEW",
            "details": {
                "destination": "document",
                "reason": "All execution tasks completed, proceeding to documentation"
            }
        })
        return "document"
    
    def _document_task(self, state: WorkflowState) -> WorkflowState:
        """
        Document tasks using the Notion agent with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Documenting tasks for workflow {state.id}")
        
        # Create a documentation task
        doc_task = Task(
            title="Document project",
            description="Create comprehensive documentation for the project",
            agent="notion",
            status="in_progress"
        )
        state.tasks.append(doc_task)
        state.current_task_id = doc_task.id
        
        # Add a log entry
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "DOCUMENTATION_TASK_STARTED",
            "details": {
                "task_id": doc_task.id,
                "title": doc_task.title
            }
        })
        
        # Add documentation steps
        doc_steps = [
            "Gathering information from completed tasks",
            "Organizing documentation structure",
            "Creating comprehensive documentation",
            "Adding examples and references"
        ]
        
        for step_desc in doc_steps:
            step = TaskStep(
                description=step_desc,
                agent="notion",
                status="completed"
            )
            doc_task.steps.append(step)
            
            # Add a log entry for each step
            state.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "DOCUMENTATION_STEP",
                "details": {
                    "task_id": doc_task.id,
                    "step_id": step.id,
                    "description": step.description
                }
            })
        
        # Generate a documentation result
        doc_result = {
            "title": "Project Documentation",
            "url": "https://notion.so/example/project-documentation",
            "sections": [
                "Overview",
                "Architecture",
                "Implementation",
                "Testing",
                "Usage Examples",
                "API Reference",
                "Troubleshooting"
            ]
        }
        
        # Add the documentation result to the task
        result_step = TaskStep(
            description="Created comprehensive project documentation",
            agent="notion",
            status="completed",
            result=doc_result
        )
        doc_task.steps.append(result_step)
        
        # Add a log entry for the documentation result
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "DOCUMENTATION_COMPLETED",
            "details": {
                "task_id": doc_task.id,
                "step_id": result_step.id,
                "url": doc_result["url"],
                "section_count": len(doc_result["sections"])
            }
        })
        
        # Mark the documentation task as completed
        doc_task.status = "completed"
        doc_task.completed_at = datetime.utcnow()
        
        # Add a log entry for task completion
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "DOCUMENTATION_TASK_COMPLETED",
            "details": {
                "task_id": doc_task.id,
                "title": doc_task.title
            }
        })
        
        return state
    
    def _complete_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Complete the workflow with real-time logging.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Completing workflow {state.id}")
        
        # Mark the workflow as completed
        state.status = "completed"
        
        # Add a log entry
        state.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "WORKFLOW_COMPLETED",
            "details": {
                "workflow_id": state.id,
                "task_count": len(state.tasks),
                "completed_tasks": sum(1 for t in state.tasks if t.status == "completed")
            }
        })
        
        return state
    
    async def run_workflow(self, initial_state: Optional[WorkflowState] = None) -> WorkflowState:
        """
        Run the workflow with real-time logging to Notion.
        
        Args:
            initial_state: Optional initial state. If not provided, a new state will be created.
            
        Returns:
            Final workflow state
        """
        # Make sure the session logger is initialized
        if not self.session_logger:
            await self._initialize_session_logger()
        
        # Log workflow start
        workflow_id = initial_state.id if initial_state else str(uuid.uuid4())
        await self.session_logger.log_system_action("WORKFLOW_STARTING", {
            "workflow_id": workflow_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Build the workflow
        workflow = self.build_task_workflow()
        
        # Create an initial state if not provided
        if not initial_state:
            initial_state = WorkflowState(
                id=workflow_id,
                tasks=[],
                logs=[]
            )
        
        # Run the workflow
        final_state = workflow.invoke(initial_state)
        
        # Log workflow completion
        await self.session_logger.log_system_action("WORKFLOW_FINISHED", {
            "workflow_id": workflow_id,
            "task_count": len(final_state.tasks),
            "completed_tasks": sum(1 for t in final_state.tasks if t.status == "completed"),
            "status": final_state.status,
            "log_count": len(final_state.logs),
            "duration_ms": int((datetime.utcnow() - datetime.fromisoformat(final_state.logs[0]["timestamp"])).total_seconds() * 1000)
        })
        
        return final_state


def create_agent_workflow() -> StateGraph:
    """
    Create an agent workflow for use with the multi-agent system.
    
    Returns:
        StateGraph for the agent workflow
    """
    # This is a simplified version that would be replaced with actual LangGraph nodes
    from langgraph.graph import StateGraph
    
    # Define the state type for the workflow
    class AgentState(dict):
        """State type for agent workflows."""
        pass
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes for each agent
    workflow.add_node("planner", lambda x: {**x, "status": "planner_done"})
    workflow.add_node("reviewer", lambda x: {**x, "status": "reviewer_done"})
    workflow.add_node("executor", lambda x: {**x, "status": "executor_done"})
    workflow.add_node("notion", lambda x: {**x, "status": "notion_done"})
    
    # Define conditional routing based on state
    def route_from_planner(state):
        """Route from planner to reviewer."""
        return "reviewer"
    
    def route_from_reviewer(state):
        """Route from reviewer based on review result."""
        if state.get("review_result") == "approved":
            return "executor"
        elif state.get("review_result") == "revision_needed":
            return "planner"
        else:
            return "notion"
    
    def route_from_executor(state):
        """Route from executor back to reviewer."""
        return "reviewer"
    
    # Add conditional edges
    workflow.add_edge("planner", "reviewer")
    workflow.add_conditional_edges(
        "reviewer",
        route_from_reviewer,
        {
            "executor": "executor",
            "planner": "planner",
            "notion": "notion"
        }
    )
    workflow.add_edge("executor", "reviewer")
    workflow.add_edge("notion", END)
    
    # Set entry point
    workflow.set_entry_point("planner")
    
    return workflow