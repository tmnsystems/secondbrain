"""
Pydantic models for the SecondBrain Slack-Notion integration.
"""

import uuid
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, validator

class AgentType(str):
    """Agent types in the system."""
    PLANNER = "planner"
    EXECUTOR = "executor"
    REVIEWER = "reviewer"
    NOTION = "notion"
    REFACTOR = "refactor"
    ORCHESTRATOR = "orchestrator"

class TaskStatus(str):
    """Task status options."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed" 
    NEEDS_REVIEW = "needs_review"
    FAILED = "failed"

class TaskPriority(str):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SlackMessage(BaseModel):
    """Model representing a Slack message."""
    message_id: str
    thread_ts: Optional[str] = None
    channel_id: str
    user_id: str
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
class TaskStep(BaseModel):
    """Model representing a single step in a task execution."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    agent: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "completed"
    result: Optional[Any] = None
    slack_message_id: Optional[str] = None
    error: Optional[str] = None

class Task(BaseModel):
    """Model representing a task in the system."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    agent: str
    status: str = TaskStatus.PENDING
    priority: str = TaskPriority.MEDIUM
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deadline: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    slack_thread_id: Optional[str] = None
    slack_channel_id: Optional[str] = None
    notion_page_id: Optional[str] = None
    steps: List[TaskStep] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    assigned_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    
    @validator('updated_at', always=True)
    def update_timestamp(cls, v, values):
        """Always update the updated_at field."""
        return datetime.utcnow()

class NotionPage(BaseModel):
    """Model representing a Notion page."""
    id: Optional[str] = None
    parent_id: Optional[str] = None
    title: str
    content: Any
    url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    
class AgentLog(BaseModel):
    """Model representing an agent log entry."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent: str
    task_id: Optional[str] = None
    action: str
    details: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    slack_message_id: Optional[str] = None
    notion_page_id: Optional[str] = None

class WorkflowState(BaseModel):
    """Model representing the state of a workflow."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tasks: List[Task] = Field(default_factory=list)
    current_task_id: Optional[str] = None
    logs: List[AgentLog] = Field(default_factory=list)
    status: str = "in_progress"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    initiated_by: Optional[str] = None