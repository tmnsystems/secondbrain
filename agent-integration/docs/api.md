# Agent Integration API Reference

This document provides a comprehensive API reference for the Agent Integration component.

## Table of Contents

- [Agent Manager](#agent-manager)
- [Communication Protocol](#communication-protocol)
- [Agent Roles](#agent-roles)
- [Reviewer Agent](#reviewer-agent)
- [Context Persistence](#context-persistence)
- [LangGraph Integration](#langgraph-integration)
- [Security](#security)
- [Communication Logger](#communication-logger)

## Agent Manager

The Agent Manager provides centralized coordination for all agents in the system.

### Classes

#### `AgentState` (Enum)

Represents the possible states of an agent.

```python
class AgentState(str, Enum):
    IDLE = "idle"
    INITIALIZING = "initializing"
    PROCESSING = "processing"
    WAITING = "waiting"
    ERROR = "error"
    TERMINATED = "terminated"
```

#### `MessagePriority` (Enum)

Represents the priority levels for messages.

```python
class MessagePriority(int, Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3
```

#### `Message`

Represents a message exchanged between agents.

```python
class Message:
    def __init__(
        self,
        sender: str,
        recipient: str,
        content: Dict[str, Any],
        priority: MessagePriority = MessagePriority.NORMAL,
        trace_id: Optional[str] = None,
        parent_id: Optional[str] = None,
        timeout: Optional[float] = None,
    ): ...
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message': ...
    
    def create_response(self, content: Dict[str, Any]) -> 'Message': ...
```

#### `Agent`

Base class for all agent types.

```python
class Agent:
    def __init__(
        self,
        agent_id: str,
        role: AgentRole,
        manager: 'AgentManager',
        config: Dict[str, Any] = None,
    ): ...
    
    async def initialize(self) -> bool: ...
    
    async def process_message(self, message: Message) -> Optional[Message]: ...
    
    async def _default_message_handler(self, content: Dict[str, Any]) -> Dict[str, Any]: ...
    
    def register_message_handler(self, msg_type: str, handler: Callable) -> None: ...
    
    async def send_message(
        self,
        recipient: str,
        content: Dict[str, Any],
        priority: MessagePriority = MessagePriority.NORMAL,
        timeout: Optional[float] = None,
    ) -> Optional[Message]: ...
    
    async def terminate(self) -> None: ...
```

#### `AgentManager`

Central coordination system for managing agents.

```python
class AgentManager:
    def __init__(self, config_path: Optional[str] = None): ...
    
    async def initialize(self) -> bool: ...
    
    def register_agent(self, agent: Agent) -> None: ...
    
    async def route_message(self, message: Message) -> Optional[Message]: ...
    
    async def broadcast_message(
        self,
        sender: str,
        content: Dict[str, Any],
        recipients: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
    ) -> Dict[str, Optional[Message]]: ...
    
    async def start(self) -> None: ...
    
    async def stop(self) -> None: ...
    
    async def get_agent_states(self) -> Dict[str, Dict[str, Any]]: ...
```

### Usage Examples

```python
# Creating an agent manager
agent_manager = AgentManager()

# Registering an agent
agent_manager.register_agent(agent)

# Routing a message
response = await agent_manager.route_message(message)

# Broadcasting a message
results = await agent_manager.broadcast_message(
    sender="orchestrator",
    content={"type": "status_request"},
    recipients=["agent1", "agent2", "agent3"]
)
```

## Communication Protocol

The Communication Protocol defines standardized message formats and exchange mechanisms.

### Classes

#### `MessageType` (Enum)

Represents the different types of messages.

```python
class MessageType(str, Enum):
    # Control messages
    INITIALIZE = "initialize"
    TERMINATE = "terminate"
    HEARTBEAT = "heartbeat"
    ERROR = "error"
    
    # Task-related messages
    TASK_REQUEST = "task_request"
    TASK_RESPONSE = "task_response"
    TASK_STATUS = "task_status"
    TASK_CANCEL = "task_cancel"
    
    # Review-related messages
    REVIEW_REQUEST = "review_request"
    REVIEW_RESPONSE = "review_response"
    REVIEW_APPROVED = "review_approved"
    REVIEW_REJECTED = "review_rejected"
    
    # ...and more
```

#### `MessageStatus` (Enum)

Represents the status of a message.

```python
class MessageStatus(str, Enum):
    CREATED = "created"
    QUEUED = "queued"
    PROCESSING = "processing"
    DELIVERED = "delivered"
    RESPONDED = "responded"
    FAILED = "failed"
    TIMEOUT = "timeout"
```

#### `MessageMetadata`

Contains metadata for messages.

```python
@dataclass
class MessageMetadata:
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    retry_count: int = 0
    max_retries: int = 3
    tags: List[str] = field(default_factory=list)
    custom: Dict[str, Any] = field(default_factory=dict)
```

#### `Message`

Standard message format for agent communication.

```python
@dataclass
class Message:
    # Basic message properties
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    message_type: MessageType = MessageType.CUSTOM
    sender_id: str = ""
    recipient_id: str = ""
    content: Dict[str, Any] = field(default_factory=dict)
    
    # Message handling properties
    priority: MessagePriority = MessagePriority.NORMAL
    status: MessageStatus = MessageStatus.CREATED
    parent_id: Optional[str] = None
    response_to: Optional[str] = None
    
    # Timing properties
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    timeout: Optional[float] = None
    
    # Extended properties
    metadata: MessageMetadata = field(default_factory=MessageMetadata)
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message': ...
    
    def to_json(self) -> str: ...
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Message': ...
    
    def create_response(
        self, 
        content: Dict[str, Any], 
        message_type: Optional[MessageType] = None
    ) -> 'Message': ...
    
    def is_expired(self) -> bool: ...
    
    def should_retry(self) -> bool: ...
```

#### `MessageBus`

Message routing and delivery system.

```python
class MessageBus:
    def __init__(self): ...
    
    def subscribe(self, agent_id: str, message_types: List[MessageType]) -> None: ...
    
    def unsubscribe(self, agent_id: str, message_types: Optional[List[MessageType]] = None) -> None: ...
    
    def register_handler(
        self, 
        agent_id: str, 
        message_type: MessageType, 
        handler: Callable[[Message], Union[Dict[str, Any], None, asyncio.Future]]
    ) -> None: ...
    
    async def publish(self, message: Message) -> List[Optional[Message]]: ...
    
    async def send(self, message: Message) -> Optional[Message]: ...
    
    async def _deliver_to_agent(self, message: Message, agent_id: str) -> Optional[Message]: ...
    
    def get_message_history(self, trace_id: Optional[str] = None) -> List[Message]: ...
    
    def clear_message_history(self, older_than: Optional[float] = None) -> int: ...
```

### Usage Examples

```python
# Creating a message bus
message_bus = MessageBus()

# Subscribing to message types
message_bus.subscribe("agent1", [MessageType.TASK_REQUEST, MessageType.TASK_RESPONSE])

# Registering a message handler
message_bus.register_handler(
    "agent1",
    MessageType.TASK_REQUEST,
    handle_task_request
)

# Publishing a message
responses = await message_bus.publish(message)

# Sending a message
response = await message_bus.send(message)
```

## Agent Roles

The Agent Roles module implements specialized agent types.

### Classes

#### `AgentRole` (Enum)

Represents the different roles agents can have.

```python
class AgentRole(str, Enum):
    PLANNER = "planner"
    EXECUTOR = "executor"
    REVIEWER = "reviewer"
    NOTION = "notion"
    ORCHESTRATOR = "orchestrator"
    REFACTOR = "refactor"
    BUILD = "build"
```

#### `ModelAssignment` (Enum)

Represents the model assignments for different agent roles.

```python
class ModelAssignment(str, Enum):
    CLAUDE_SONNET = "claude-3.7-sonnet"
    CLAUDE_OPUS = "claude-3-opus"
    GPT4_MINI = "gpt-4.1-mini"
    GPT4 = "gpt-4"
    OPENAI_O3 = "o3"
```

#### `TaskComplexity` (Enum)

Represents the complexity levels for tasks.

```python
class TaskComplexity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
```

#### `TaskStatus` (Enum)

Represents the status of a task.

```python
class TaskStatus(str, Enum):
    PENDING = "pending"
    PLANNING = "planning"
    REVIEWING = "reviewing"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
```

#### `Task`

Represents a task to be executed by an agent.

```python
@dataclass
class Task:
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
```

#### `PlannerAgent`

Agent responsible for strategic planning and task decomposition.

```python
class PlannerAgent(Agent):
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ): ...
    
    async def create_plan(
        self,
        title: str,
        description: str,
        context: Dict[str, Any],
        complexity: TaskComplexity = TaskComplexity.MEDIUM,
    ) -> Task: ...
    
    async def update_task_status(self, task_id: str, status: TaskStatus) -> Optional[Task]: ...
    
    async def assign_task(self, task_id: str, agent_id: str) -> Optional[Task]: ...
```

#### `ExecutorAgent`

Agent responsible for implementing plans and executing tasks.

```python
class ExecutorAgent(Agent):
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ): ...
    
    async def execute_task(self, task: Task) -> Task: ...
    
    async def update_task_status(self, task_id: str, status: TaskStatus) -> Optional[Task]: ...
```

#### `NotionAgent`

Agent responsible for documentation and persistence.

```python
class NotionAgent(Agent):
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ): ...
    
    async def document_task(
        self,
        task: Task,
        include_details: bool = True,
    ) -> Optional[str]: ...
    
    async def log_cli_session(
        self,
        session_id: str,
        messages: List[Dict[str, Any]],
        session_metadata: Dict[str, Any] = None,
    ) -> Optional[str]: ...
```

#### `OrchestratorAgent`

Agent responsible for coordinating workflows among agents.

```python
class OrchestratorAgent(Agent):
    def __init__(
        self,
        agent_id: str,
        manager: AgentManager,
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ): ...
    
    async def start_workflow(
        self,
        workflow_type: str,
        title: str,
        description: str,
        initial_context: Dict[str, Any] = None,
    ) -> Dict[str, Any]: ...
    
    async def update_workflow_step(
        self,
        workflow_id: str,
        step_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]: ...
```

### Factory Function

```python
def create_agent(
    role: AgentRole,
    agent_id: str,
    manager: AgentManager,
    config: Dict[str, Any] = None,
    message_bus: Optional[MessageBus] = None,
) -> Agent: ...
```

### Usage Examples

```python
# Creating specialized agents
planner = create_agent(AgentRole.PLANNER, "planner_1", agent_manager, message_bus=message_bus)
executor = create_agent(AgentRole.EXECUTOR, "executor_1", agent_manager, message_bus=message_bus)
reviewer = create_agent(AgentRole.REVIEWER, "reviewer_1", agent_manager, message_bus=message_bus)
notion = create_agent(AgentRole.NOTION, "notion_1", agent_manager, message_bus=message_bus)

# Creating a plan
task = await planner.create_plan(
    title="Implement New Feature",
    description="Implement a new feature for the system",
    context={"requirements": [...]}
)

# Executing a task
executed_task = await executor.execute_task(task)

# Documenting a task
page_id = await notion.document_task(executed_task)
```

## Reviewer Agent

The Reviewer Agent implements the review protocol for quality assurance.

### Classes

#### `ReviewStatus` (Enum)

Represents the status of a review.

```python
class ReviewStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"
    CANCELLED = "cancelled"
```

#### `ReviewType` (Enum)

Represents the types of reviews.

```python
class ReviewType(str, Enum):
    PRE_IMPLEMENTATION = "pre_implementation"
    POST_IMPLEMENTATION = "post_implementation"
    STRATEGIC_ALIGNMENT = "strategic_alignment"
    CODE_QUALITY = "code_quality"
    SECURITY = "security"
    PERFORMANCE = "performance"
```

#### `ReviewRequest`

Represents a request for a review.

```python
@dataclass
class ReviewRequest:
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    review_type: ReviewType = ReviewType.PRE_IMPLEMENTATION
    requester_id: str = ""
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    status: ReviewStatus = ReviewStatus.PENDING
    priority: int = 1
    
    # Content to be reviewed
    content: Dict[str, Any] = field(default_factory=dict)
    
    # Review results
    reviewer_id: Optional[str] = None
    review_started_at: Optional[float] = None
    review_completed_at: Optional[float] = None
    feedback: List[Dict[str, Any]] = field(default_factory=list)
    approval: bool = False
    
    # Implementation tracking
    implementation_id: Optional[str] = None
    implemented_at: Optional[float] = None
    implementation_verified: bool = False
    
    # Related resources
    notion_page_id: Optional[str] = None
    slack_thread_id: Optional[str] = None
    related_request_ids: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ReviewRequest': ...
    
    def update_status(self, status: ReviewStatus) -> None: ...
    
    def add_feedback(self, feedback_item: Dict[str, Any]) -> None: ...
```

#### `ReviewerAgent`

Implements the SecondBrain Reviewer Agent protocol.

```python
class ReviewerAgent(Agent):
    def __init__(
        self,
        agent_id: str,
        manager: 'AgentManager',
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ): ...
    
    async def create_review_request(
        self,
        title: str,
        description: str,
        content: Dict[str, Any],
        review_type: ReviewType = ReviewType.PRE_IMPLEMENTATION,
        requester_id: str = "",
        priority: int = 1,
    ) -> ReviewRequest: ...
    
    async def process_next_review(self) -> Optional[ReviewRequest]: ...
    
    async def get_review_status(self, request_id: str) -> Optional[ReviewRequest]: ...
    
    async def notify_implementation(
        self, 
        request_id: str, 
        implementation_id: str
    ) -> Optional[ReviewRequest]: ...
    
    async def verify_implementation(
        self, 
        request_id: str,
        verification_result: bool,
        verification_notes: str = ""
    ) -> Optional[ReviewRequest]: ...
    
    async def cancel_review(self, request_id: str, reason: str = "") -> None: ...
```

### Usage Examples

```python
# Creating a review request
review_request = await reviewer.create_review_request(
    title="Feature Implementation Plan",
    description="Plan for implementing a new feature",
    content={
        "plan": {
            "steps": [...]
        }
    },
    review_type=ReviewType.PRE_IMPLEMENTATION,
    requester_id="planner_1"
)

# Processing the next review in the queue
processed_request = await reviewer.process_next_review()

# Getting review status
review_status = await reviewer.get_review_status(review_request.request_id)

# Notifying of implementation
updated_request = await reviewer.notify_implementation(
    request_id=review_request.request_id,
    implementation_id="impl_12345"
)

# Verifying implementation
verified_request = await reviewer.verify_implementation(
    request_id=review_request.request_id,
    verification_result=True,
    verification_notes="Implementation matches approved plan"
)
```

## Context Persistence

The Context Persistence system ensures context preservation across agent interactions.

### Classes

#### `ContextType` (Enum)

Represents the types of context objects.

```python
class ContextType(str, Enum):
    CLI_SESSION = "cli_session"
    AGENT_STATE = "agent_state"
    TASK = "task"
    WORKFLOW = "workflow"
    MESSAGE = "message"
    TOOL_CALL = "tool_call"
    USER_PROFILE = "user_profile"
    SYSTEM_STATE = "system_state"
```

#### `StorageLayer` (Enum)

Represents the different storage layers for context.

```python
class StorageLayer(str, Enum):
    SHORT_TERM = "short_term"  # Redis
    MEDIUM_TERM = "medium_term"  # PostgreSQL
    LONG_TERM = "long_term"  # Pinecone
```

#### `ContextMetadata`

Contains metadata for context objects.

```python
@dataclass
class ContextMetadata:
    context_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    context_type: ContextType = ContextType.CLI_SESSION
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    task_id: Optional[str] = None
    workflow_id: Optional[str] = None
    parent_context_id: Optional[str] = None
    related_context_ids: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    version: int = 1
    storage_layers: List[StorageLayer] = field(default_factory=list)
    notion_page_id: Optional[str] = None
    slack_thread_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ContextMetadata': ...
```

#### `ContextObject`

A context object that can be persisted across agent transitions and CLI sessions.

```python
@dataclass
class ContextObject:
    metadata: ContextMetadata
    content: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ContextObject': ...
    
    def to_json(self) -> str: ...
    
    @classmethod
    def from_json(cls, json_str: str) -> 'ContextObject': ...
```

#### `ContextPersistenceManager`

Manages context persistence across agent transitions and CLI sessions.

```python
class ContextPersistenceManager:
    def __init__(self, config: Dict[str, Any] = None): ...
    
    async def store_context(
        self,
        context: ContextObject,
        layers: List[StorageLayer] = None,
    ) -> bool: ...
    
    async def get_context(
        self,
        context_id: str,
        populate_related: bool = False
    ) -> Optional[ContextObject]: ...
    
    async def find_contexts(
        self,
        query: Dict[str, Any],
        limit: int = 10,
        search_type: str = "filter"
    ) -> List[ContextObject]: ...
    
    async def create_context_bridge(
        self,
        source_context_id: str,
        target_context_id: str,
        bidirectional: bool = True
    ) -> bool: ...
    
    async def create_cli_session_context(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        parent_session_id: Optional[str] = None,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> ContextObject: ...
    
    async def update_cli_session_context(
        self,
        session_id: str,
        updates: Dict[str, Any]
    ) -> Optional[ContextObject]: ...
    
    async def handle_session_compaction(
        self,
        old_session_id: str,
        new_session_id: str,
        compaction_reason: str,
        summary: Dict[str, Any]
    ) -> Optional[ContextObject]: ...
    
    async def log_agent_transition(
        self,
        from_agent_id: str,
        to_agent_id: str,
        task_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        session_id: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None
    ) -> ContextObject: ...
```

### Usage Examples

```python
# Creating a context manager
context_manager = ContextPersistenceManager()

# Creating a context object
context = ContextObject(
    metadata=ContextMetadata(
        context_type=ContextType.CLI_SESSION,
        session_id="session_12345"
    ),
    content={
        "user_query": "Implement a new feature",
        "system_response": "I'll help you implement that feature"
    }
)

# Storing context
await context_manager.store_context(context)

# Getting context
retrieved_context = await context_manager.get_context(context.metadata.context_id)

# Finding contexts
matching_contexts = await context_manager.find_contexts(
    query={"context_type": ContextType.CLI_SESSION, "session_id": "session_12345"}
)

# Creating a CLI session context
session_context = await context_manager.create_cli_session_context(
    session_id="session_12345",
    user_id="user_1",
    initial_context={"mode": "development"}
)

# Handling session compaction
new_context = await context_manager.handle_session_compaction(
    old_session_id="session_12345",
    new_session_id="session_67890",
    compaction_reason="token_limit",
    summary={"key_points": [...]}
)
```

## LangGraph Integration

The LangGraph Integration enables structured agent workflows.

### Classes

#### `WorkflowStatus` (Enum)

Represents the status of a workflow.

```python
class WorkflowStatus(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
```

#### `WorkflowState`

Represents the state of a workflow.

```python
@dataclass
class WorkflowState:
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
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkflowState': ...
    
    def update_status(self, status: WorkflowStatus) -> None: ...
    
    def add_step_to_history(
        self,
        step_name: str,
        inputs: Dict[str, Any],
        outputs: Optional[Dict[str, Any]] = None,
        status: str = "completed",
        error: Optional[str] = None
    ) -> None: ...
    
    def assign_agent(self, step_name: str, agent_id: str) -> None: ...
    
    def set_current_step(self, step_name: Optional[str]) -> None: ...
    
    def add_error(self, step_name: str, error_message: str, details: Any = None) -> None: ...
```

#### `LangGraphIntegration`

Integrates LangGraph for agent workflows.

```python
class LangGraphIntegration:
    def __init__(
        self,
        agent_manager: AgentManager,
        context_manager: Optional[ContextPersistenceManager] = None,
        message_bus: Optional[MessageBus] = None,
        config: Dict[str, Any] = None
    ): ...
    
    async def create_workflow(
        self,
        workflow_type: str,
        title: str,
        description: str,
        inputs: Dict[str, Any] = None
    ) -> WorkflowState: ...
    
    async def execute_workflow(self, workflow_id: str) -> WorkflowState: ...
    
    async def execute_workflow_step(
        self,
        workflow_id: str,
        step_name: str
    ) -> WorkflowState: ...
```

### Usage Examples

```python
# Creating a LangGraph integration
langgraph = LangGraphIntegration(
    agent_manager=agent_manager,
    context_manager=context_manager,
    message_bus=message_bus
)

# Creating a workflow
workflow = await langgraph.create_workflow(
    workflow_type="planner_executor_reviewer",
    title="Implement New Feature",
    description="Implement a new feature for the system",
    inputs={
        "feature_name": "Context Persistence",
        "requirements": [...]
    }
)

# Executing a workflow
result = await langgraph.execute_workflow(workflow.workflow_id)

# Executing a specific workflow step
step_result = await langgraph.execute_workflow_step(
    workflow_id=workflow.workflow_id,
    step_name="planner"
)
```

## Security

The Security module provides authentication, authorization, and message validation.

### Classes

#### `PermissionLevel` (Enum)

Represents permission levels for access control.

```python
class PermissionLevel(int, Enum):
    NONE = 0
    READ = 1
    WRITE = 2
    EXECUTE = 3
    ADMIN = 4
```

#### `ValidationResult` (Enum)

Represents message validation results.

```python
class ValidationResult(str, Enum):
    VALID = "valid"
    INVALID_SIGNATURE = "invalid_signature"
    EXPIRED = "expired"
    UNAUTHORIZED = "unauthorized"
    INVALID_FORMAT = "invalid_format"
    REJECTED = "rejected"
```

#### `AgentCredential`

Represents an agent's authentication credential.

```python
@dataclass
class AgentCredential:
    agent_id: str
    api_key: str
    secret_key: str
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    permissions: Dict[str, PermissionLevel] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentCredential': ...
    
    def is_expired(self) -> bool: ...
    
    def has_permission(self, resource: str, level: PermissionLevel) -> bool: ...
```

#### `AccessPolicy`

Represents an access control policy.

```python
@dataclass
class AccessPolicy:
    policy_id: str
    name: str
    resources: List[str]
    allowed_roles: List[AgentRole]
    permission_level: PermissionLevel
    conditions: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AccessPolicy': ...
```

#### `AgentSecurityManager`

Manages security for the agent system.

```python
class AgentSecurityManager:
    def __init__(self, config: Dict[str, Any] = None): ...
    
    def generate_agent_credential(
        self,
        agent_id: str,
        expires_in: Optional[float] = None,
        permissions: Optional[Dict[str, PermissionLevel]] = None
    ) -> AgentCredential: ...
    
    def register_agent_credential(self, credential: AgentCredential) -> None: ...
    
    def get_agent_credential(self, agent_id: str) -> Optional[AgentCredential]: ...
    
    def revoke_agent_credential(self, agent_id: str) -> bool: ...
    
    def create_access_policy(
        self,
        name: str,
        resources: List[str],
        allowed_roles: List[AgentRole],
        permission_level: PermissionLevel,
        conditions: Dict[str, Any] = None
    ) -> AccessPolicy: ...
    
    def check_permission(
        self,
        agent_id: str,
        resource: str,
        required_level: PermissionLevel
    ) -> bool: ...
    
    def sign_message(self, message: Message, agent_id: str) -> Message: ...
    
    def validate_message(self, message: Message) -> ValidationResult: ...
```

#### `SecureMessageBus`

A secure wrapper around the MessageBus.

```python
class SecureMessageBus:
    def __init__(
        self,
        message_bus: MessageBus,
        security_manager: AgentSecurityManager
    ): ...
    
    async def publish(self, message: Message) -> List[Optional[Message]]: ...
    
    async def send(self, message: Message) -> Optional[Message]: ...
    
    def subscribe(self, agent_id: str, message_types: List[MessageType]) -> None: ...
    
    def unsubscribe(self, agent_id: str, message_types: Optional[List[MessageType]] = None) -> None: ...
    
    def register_handler(
        self, 
        agent_id: str, 
        message_type: MessageType, 
        handler: Callable[[Message], Union[Dict[str, Any], None, asyncio.Future]]
    ) -> None: ...
```

#### `SecureAgentManager`

A secure wrapper around the AgentManager.

```python
class SecureAgentManager:
    def __init__(
        self,
        agent_manager: 'AgentManager',
        security_manager: AgentSecurityManager
    ): ...
    
    async def route_message(self, message: Message) -> Optional[Message]: ...
    
    async def broadcast_message(
        self,
        sender: str,
        content: Dict[str, Any],
        recipients: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
    ) -> Dict[str, Optional[Message]]: ...
    
    def register_agent(self, agent: Agent) -> None: ...
    
    async def initialize(self) -> bool: ...
    
    async def start(self) -> None: ...
    
    async def stop(self) -> None: ...
```

### Usage Examples

```python
# Creating a security manager
security_manager = AgentSecurityManager()

# Generating credentials
credential = security_manager.generate_agent_credential(
    agent_id="planner_1",
    expires_in=3600 * 24  # 24 hours
)

# Creating an access policy
policy = security_manager.create_access_policy(
    name="Planner Access",
    resources=["task.*", "workflow.*", "plan.*"],
    allowed_roles=[AgentRole.PLANNER],
    permission_level=PermissionLevel.WRITE
)

# Checking permissions
has_permission = security_manager.check_permission(
    agent_id="planner_1",
    resource="task.12345",
    required_level=PermissionLevel.WRITE
)

# Creating secure wrappers
secure_message_bus = SecureMessageBus(message_bus, security_manager)
secure_agent_manager = SecureAgentManager(agent_manager, security_manager)

# Using secure message bus
response = await secure_message_bus.send(message)

# Using secure agent manager
response = await secure_agent_manager.route_message(message)
```

## Communication Logger

The Communication Logger captures and logs agent communication events.

### Classes

#### `LogEventType` (Enum)

Represents the types of log events.

```python
class LogEventType(str, Enum):
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    AGENT_TRANSITION = "agent_transition"
    WORKFLOW_EVENT = "workflow_event"
    AGENT_ERROR = "agent_error"
    SYSTEM_EVENT = "system_event"
```

#### `LogEvent`

Represents a log event.

```python
@dataclass
class LogEvent:
    event_id: str
    event_type: LogEventType
    timestamp: float
    source: str
    target: Optional[str] = None
    message_id: Optional[str] = None
    workflow_id: Optional[str] = None
    task_id: Optional[str] = None
    content: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]: ...
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogEvent': ...
    
    def to_json(self) -> str: ...
    
    def to_log_line(self) -> str: ...
```

#### `CommunicationLogger`

Logs and captures all communication between agents.

```python
class CommunicationLogger:
    def __init__(
        self,
        message_bus: Optional[MessageBus] = None,
        context_manager: Optional[ContextPersistenceManager] = None,
        config: Dict[str, Any] = None
    ): ...
    
    async def log_message_event(
        self,
        message: Message,
        event_type: LogEventType,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent: ...
    
    async def log_agent_transition(
        self,
        from_agent_id: str,
        to_agent_id: str,
        transition_type: str,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent: ...
    
    async def log_workflow_event(
        self,
        workflow_id: str,
        event_name: str,
        source: str,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent: ...
    
    async def log_error(
        self,
        source: str,
        error_message: str,
        error_type: str,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent: ...
    
    async def log_system_event(
        self,
        event_name: str,
        source: str,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent: ...
    
    def get_events(
        self,
        event_type: Optional[LogEventType] = None,
        source: Optional[str] = None,
        target: Optional[str] = None,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        message_id: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: int = 100
    ) -> List[LogEvent]: ...
    
    def export_events_to_json(
        self,
        filepath: str,
        events: Optional[List[LogEvent]] = None
    ) -> bool: ...
    
    def close(self) -> None: ...
```

#### `LoggingMiddleware`

Middleware for intercepting and logging agent communication events.

```python
class LoggingMiddleware:
    def __init__(self, logger: CommunicationLogger): ...
    
    async def log_message_send(
        self,
        message: Message,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message: ...
    
    async def log_message_receive(
        self,
        message: Message,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message: ...
    
    async def log_agent_transition(
        self,
        from_agent_id: str,
        to_agent_id: str,
        transition_type: str,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None: ...
    
    async def log_workflow_event(
        self,
        workflow_id: str,
        event_name: str,
        source: str,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None: ...
```

### Usage Examples

```python
# Creating a communication logger
logger = CommunicationLogger(
    message_bus=message_bus,
    context_manager=context_manager
)

# Logging a message event
await logger.log_message_event(
    message=message,
    event_type=LogEventType.MESSAGE_SENT
)

# Logging an agent transition
await logger.log_agent_transition(
    from_agent_id="planner_1",
    to_agent_id="executor_1",
    transition_type="task_handoff",
    workflow_id="workflow_12345",
    task_id="task_67890"
)

# Logging a workflow event
await logger.log_workflow_event(
    workflow_id="workflow_12345",
    event_name="workflow_started",
    source="orchestrator_1"
)

# Getting filtered events
events = logger.get_events(
    event_type=LogEventType.WORKFLOW_EVENT,
    workflow_id="workflow_12345",
    limit=10
)

# Using logging middleware
middleware = LoggingMiddleware(logger)

# Log message sending
wrapped_message = await middleware.log_message_send(message)

# Log agent transition
await middleware.log_agent_transition(
    from_agent_id="planner_1",
    to_agent_id="executor_1",
    transition_type="task_handoff"
)
```