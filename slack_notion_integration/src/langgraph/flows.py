"""
LangGraph workflows for the SecondBrain Slack-Notion integration.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Tuple, Union, TypeVar, Literal
from datetime import datetime
import uuid

from langgraph.graph import StateGraph, END
import openai
import anthropic

from ..models.schema import Task, WorkflowState, TaskStep
from ..notion.client import NotionClient

logger = logging.getLogger(__name__)

T = TypeVar('T')

class WorkflowManager:
    """Manager for LangGraph workflows."""
    
    def __init__(self, openai_api_key: Optional[str] = None, anthropic_api_key: Optional[str] = None,
                notion_client: Optional[NotionClient] = None):
        """
        Initialize the workflow manager.
        
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
    
    def build_task_workflow(self) -> StateGraph:
        """
        Build the task workflow.
        
        Returns:
            StateGraph for the task workflow
        """
        # Define the workflow graph
        workflow = StateGraph(WorkflowState)
        
        # Add nodes for each stage of the workflow
        workflow.add_node("start", self._start_workflow)
        workflow.add_node("plan", self._create_plan)
        workflow.add_node("execute", self._execute_task)
        workflow.add_node("review", self._review_task)
        workflow.add_node("document", self._document_task)
        workflow.add_node("complete", self._complete_workflow)
        
        # Add edges between nodes
        workflow.add_edge("start", "plan")
        
        # Conditional edges from plan based on plan status
        workflow.add_conditional_edges(
            "plan",
            self._route_after_plan,
            {
                "execute": "execute",
                "revise_plan": "plan",
                "end": END
            }
        )
        
        # Conditional edges from execute based on execution status
        workflow.add_conditional_edges(
            "execute",
            self._route_after_execution,
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
            self._route_after_review,
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
    
    def _start_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Start the workflow.
        
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
        
        return state
    
    def _create_plan(self, state: WorkflowState) -> WorkflowState:
        """
        Create a plan using the Planner agent.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Creating plan for workflow {state.id}")
        
        # In a real implementation, this would use the OpenAI o3 model to generate a plan
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
        
        # Mark the planning task as completed
        planning_task.status = "completed"
        planning_task.completed_at = datetime.utcnow()
        
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
            return "execute"
        
        # Check if there are tasks for other agents (except planner)
        other_tasks = [t for t in state.tasks if t.agent != "planner" and t.status == "pending"]
        
        if other_tasks:
            # We need to revise the plan to include executor tasks
            return "revise_plan"
        
        # No tasks to execute, end the workflow
        return "end"
    
    def _execute_task(self, state: WorkflowState) -> WorkflowState:
        """
        Execute a task using the Executor agent.
        
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
            return state
        
        # Update the current task
        state.current_task_id = executor_task.id
        executor_task.status = "in_progress"
        
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
        
        # Mark the execution task as needing review
        executor_task.status = "needs_review"
        
        return state
    
    def _route_after_execution(self, state: WorkflowState) -> Literal["review", "retry", "plan", "end"]:
        """
        Determine the next step after execution.
        
        Args:
            state: Current workflow state
            
        Returns:
            Next node to execute
        """
        # Get the current task
        current_task = next((t for t in state.tasks if t.id == state.current_task_id), None)
        
        if not current_task:
            # No current task, go back to planning
            return "plan"
        
        if current_task.status == "needs_review":
            # Task needs review
            return "review"
        
        if current_task.status == "failed":
            # Task failed, retry execution
            return "retry"
        
        # Check if there are more executor tasks
        more_executor_tasks = any(t.agent == "executor" and t.status == "pending" for t in state.tasks)
        
        if more_executor_tasks:
            # Execute the next task
            return "execute"
        
        # No more executor tasks, end execution phase
        return "review"
    
    def _review_task(self, state: WorkflowState) -> WorkflowState:
        """
        Review a task using the Reviewer agent.
        
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
            return state
        
        # Create a review task
        review_task = Task(
            title=f"Review: {current_task.title}",
            description=f"Review the execution of task: {current_task.title}",
            agent="reviewer",
            status="in_progress"
        )
        state.tasks.append(review_task)
        
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
        
        # Mark the review task as completed
        review_task.status = "completed"
        review_task.completed_at = datetime.utcnow()
        
        # Mark the original task as completed
        current_task.status = "completed"
        current_task.completed_at = datetime.utcnow()
        current_task.reviewed_by = "reviewer"
        
        return state
    
    def _route_after_review(self, state: WorkflowState) -> Literal["document", "execute", "end"]:
        """
        Determine the next step after review.
        
        Args:
            state: Current workflow state
            
        Returns:
            Next node to execute
        """
        # Check if there are more executor tasks
        more_executor_tasks = any(t.agent == "executor" and t.status == "pending" for t in state.tasks)
        
        if more_executor_tasks:
            # Execute the next task
            return "execute"
        
        # All execution tasks are done, proceed to documentation
        return "document"
    
    def _document_task(self, state: WorkflowState) -> WorkflowState:
        """
        Document tasks using the Notion agent.
        
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
        
        # Mark the documentation task as completed
        doc_task.status = "completed"
        doc_task.completed_at = datetime.utcnow()
        
        return state
    
    def _complete_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Complete the workflow.
        
        Args:
            state: Current workflow state
            
        Returns:
            Updated workflow state
        """
        logger.info(f"Completing workflow {state.id}")
        
        # Mark the workflow as completed
        state.status = "completed"
        
        return state
    
    def run_workflow(self, initial_state: Optional[WorkflowState] = None) -> WorkflowState:
        """
        Run the workflow.
        
        Args:
            initial_state: Optional initial state. If not provided, a new state will be created.
            
        Returns:
            Final workflow state
        """
        # Build the workflow
        workflow = self.build_task_workflow()
        
        # Create an initial state if not provided
        if not initial_state:
            initial_state = WorkflowState(
                id=str(uuid.uuid4()),
                tasks=[],
                logs=[]
            )
        
        # Run the workflow
        final_state = workflow.invoke(initial_state)
        
        return final_state