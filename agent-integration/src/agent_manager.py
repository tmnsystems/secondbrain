"""
Agent Manager: Central coordination system for the SecondBrain multi-agent architecture.

This module provides the AgentManager class, which serves as the primary interface
for managing agent initialization, communication, and state tracking. It implements
the coordination layer of the SecondBrain Agent Integration component (BP-07).
"""

import logging
import uuid
import time
import json
import asyncio
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('agent_manager')

# Agent roles
class AgentRole(str, Enum):
    PLANNER = "planner"
    EXECUTOR = "executor"
    REVIEWER = "reviewer"
    NOTION = "notion"
    ORCHESTRATOR = "orchestrator"
    REFACTOR = "refactor"
    BUILD = "build"

# Agent states
class AgentState(str, Enum):
    IDLE = "idle"
    INITIALIZING = "initializing"
    PROCESSING = "processing"
    WAITING = "waiting"
    ERROR = "error"
    TERMINATED = "terminated"

# Message priority
class MessagePriority(int, Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

# Message structure
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
    ):
        self.id = str(uuid.uuid4())
        self.sender = sender
        self.recipient = recipient
        self.content = content
        self.priority = priority
        self.timestamp = time.time()
        self.trace_id = trace_id or str(uuid.uuid4())
        self.parent_id = parent_id
        self.timeout = timeout
        self.processed = False
        self.response_id = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary representation"""
        return {
            "id": self.id,
            "sender": self.sender,
            "recipient": self.recipient,
            "content": self.content,
            "priority": self.priority.value,
            "timestamp": self.timestamp,
            "trace_id": self.trace_id,
            "parent_id": self.parent_id,
            "timeout": self.timeout,
            "processed": self.processed,
            "response_id": self.response_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        """Create message from dictionary representation"""
        msg = cls(
            sender=data["sender"],
            recipient=data["recipient"],
            content=data["content"],
            priority=MessagePriority(data["priority"]),
            trace_id=data.get("trace_id"),
            parent_id=data.get("parent_id"),
            timeout=data.get("timeout"),
        )
        msg.id = data["id"]
        msg.timestamp = data["timestamp"]
        msg.processed = data["processed"]
        msg.response_id = data.get("response_id")
        return msg

    def create_response(self, content: Dict[str, Any]) -> 'Message':
        """Create a response message"""
        response = Message(
            sender=self.recipient,
            recipient=self.sender,
            content=content,
            priority=self.priority,
            trace_id=self.trace_id,
            parent_id=self.id,
        )
        self.response_id = response.id
        self.processed = True
        return response

class Agent:
    """Base Agent class that all specialized agents inherit from"""
    
    def __init__(
        self,
        agent_id: str,
        role: AgentRole,
        manager: 'AgentManager',
        config: Dict[str, Any] = None,
    ):
        self.id = agent_id
        self.role = role
        self.manager = manager
        self.config = config or {}
        self.state = AgentState.IDLE
        self.message_queue: List[Message] = []
        self._message_handlers: Dict[str, Callable] = {}
        self.context: Dict[str, Any] = {}
        self.logger = logging.getLogger(f'agent.{self.role}.{self.id}')
        
    async def initialize(self) -> bool:
        """Initialize the agent"""
        self.state = AgentState.INITIALIZING
        self.logger.info(f"Initializing agent {self.id} with role {self.role}")
        try:
            # Agent-specific initialization goes here
            self.state = AgentState.IDLE
            return True
        except Exception as e:
            self.logger.error(f"Initialization failed: {str(e)}")
            self.state = AgentState.ERROR
            return False
    
    async def process_message(self, message: Message) -> Optional[Message]:
        """Process an incoming message"""
        if message.processed:
            self.logger.warning(f"Message {message.id} already processed")
            return None
            
        self.state = AgentState.PROCESSING
        self.logger.info(f"Processing message {message.id} from {message.sender}")
        
        try:
            # Check for registered message handlers
            msg_type = message.content.get("type")
            if msg_type and msg_type in self._message_handlers:
                handler = self._message_handlers[msg_type]
                response_content = await handler(message.content)
            else:
                # Default message handling
                response_content = await self._default_message_handler(message.content)
                
            # Create response
            response = message.create_response(response_content)
            self.state = AgentState.IDLE
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            self.state = AgentState.ERROR
            
            # Create error response
            error_response = message.create_response({
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            })
            return error_response
    
    async def _default_message_handler(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Default message handler when no specific handler is registered"""
        self.logger.warning(f"No handler for message type: {content.get('type')}")
        return {
            "type": "response",
            "status": "unhandled",
            "message": f"No handler for message type: {content.get('type')}"
        }
    
    def register_message_handler(self, msg_type: str, handler: Callable) -> None:
        """Register a message handler for a specific message type"""
        self.logger.info(f"Registering handler for message type: {msg_type}")
        self._message_handlers[msg_type] = handler
    
    async def send_message(
        self,
        recipient: str,
        content: Dict[str, Any],
        priority: MessagePriority = MessagePriority.NORMAL,
        timeout: Optional[float] = None,
    ) -> Optional[Message]:
        """Send a message to another agent"""
        message = Message(
            sender=self.id,
            recipient=recipient,
            content=content,
            priority=priority,
            timeout=timeout,
        )
        self.logger.info(f"Sending message {message.id} to {recipient}")
        return await self.manager.route_message(message)
    
    def update_context(self, key: str, value: Any) -> None:
        """Update the agent's context"""
        self.context[key] = value
        
    def get_context(self, key: str, default: Any = None) -> Any:
        """Get a value from the agent's context"""
        return self.context.get(key, default)
    
    async def terminate(self) -> None:
        """Terminate the agent"""
        self.logger.info(f"Terminating agent {self.id}")
        self.state = AgentState.TERMINATED

class AgentManager:
    """
    Central coordination system for managing agents, routing messages,
    and maintaining system state.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.agents: Dict[str, Agent] = {}
        self.message_queue: List[Message] = []
        self.pending_responses: Dict[str, asyncio.Future] = {}
        self.config = self._load_config(config_path) if config_path else {}
        self.logger = logging.getLogger('agent_manager')
        self._running = False
        self._background_tasks = set()
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            self.logger.info(f"Loaded configuration from {config_path}")
            return config
        except Exception as e:
            self.logger.error(f"Error loading configuration: {str(e)}")
            return {}
            
    async def initialize(self) -> bool:
        """Initialize the agent manager and all registered agents"""
        self.logger.info("Initializing agent manager")
        try:
            # Initialize all agents
            for agent_id, agent in self.agents.items():
                if not await agent.initialize():
                    self.logger.error(f"Failed to initialize agent {agent_id}")
                    return False
            
            self.logger.info("Agent manager initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"Agent manager initialization failed: {str(e)}")
            return False
    
    def register_agent(self, agent: Agent) -> None:
        """Register an agent with the manager"""
        if agent.id in self.agents:
            self.logger.warning(f"Agent {agent.id} already registered, replacing")
        self.agents[agent.id] = agent
        self.logger.info(f"Registered agent {agent.id} with role {agent.role}")
    
    async def route_message(self, message: Message) -> Optional[Message]:
        """Route a message to the appropriate agent and wait for response"""
        if message.recipient not in self.agents:
            self.logger.error(f"Unknown recipient: {message.recipient}")
            return None
            
        # Create a future for the response
        response_future = asyncio.Future()
        self.pending_responses[message.id] = response_future
        
        # Add message to recipient's queue
        recipient = self.agents[message.recipient]
        recipient.message_queue.append(message)
        
        # Create background task to process the message
        task = asyncio.create_task(self._process_agent_message(recipient, message))
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)
        
        try:
            # Wait for response with timeout
            if message.timeout:
                response = await asyncio.wait_for(response_future, message.timeout)
            else:
                response = await response_future
            return response
        except asyncio.TimeoutError:
            self.logger.warning(f"Message {message.id} timed out")
            del self.pending_responses[message.id]
            return None
        
    async def _process_agent_message(self, agent: Agent, message: Message) -> None:
        """Process a message by an agent and handle the response"""
        try:
            response = await agent.process_message(message)
            
            # If we have a pending future for this message, resolve it
            if message.id in self.pending_responses:
                future = self.pending_responses[message.id]
                if not future.done():
                    future.set_result(response)
                del self.pending_responses[message.id]
        except Exception as e:
            self.logger.error(f"Error processing message {message.id}: {str(e)}")
            
            # If we have a pending future, resolve it with an error
            if message.id in self.pending_responses:
                future = self.pending_responses[message.id]
                if not future.done():
                    future.set_exception(e)
                del self.pending_responses[message.id]
    
    async def broadcast_message(
        self,
        sender: str,
        content: Dict[str, Any],
        recipients: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
    ) -> Dict[str, Optional[Message]]:
        """Broadcast a message to multiple agents"""
        exclude = exclude or []
        results = {}
        
        # Determine recipients
        if recipients is None:
            recipients = [agent_id for agent_id in self.agents if agent_id != sender and agent_id not in exclude]
        
        # Send messages in parallel
        tasks = []
        for recipient in recipients:
            if recipient not in self.agents:
                self.logger.warning(f"Unknown recipient: {recipient}")
                results[recipient] = None
                continue
                
            message = Message(
                sender=sender,
                recipient=recipient,
                content=content,
                priority=priority,
            )
            task = asyncio.create_task(self.route_message(message))
            tasks.append((recipient, task))
        
        # Wait for all messages to be processed
        for recipient, task in tasks:
            try:
                results[recipient] = await task
            except Exception as e:
                self.logger.error(f"Error sending message to {recipient}: {str(e)}")
                results[recipient] = None
                
        return results
    
    async def start(self) -> None:
        """Start the agent manager"""
        if self._running:
            self.logger.warning("Agent manager already running")
            return
            
        self.logger.info("Starting agent manager")
        self._running = True
        
        # Initialize the manager and all agents
        if not await self.initialize():
            self.logger.error("Failed to initialize agent manager")
            self._running = False
            return
    
    async def stop(self) -> None:
        """Stop the agent manager and terminate all agents"""
        if not self._running:
            self.logger.warning("Agent manager not running")
            return
            
        self.logger.info("Stopping agent manager")
        self._running = False
        
        # Terminate all agents
        for agent_id, agent in self.agents.items():
            try:
                await agent.terminate()
            except Exception as e:
                self.logger.error(f"Error terminating agent {agent_id}: {str(e)}")
        
        # Cancel all pending tasks
        for task in self._background_tasks:
            task.cancel()
            
        # Clear all pending responses
        for message_id, future in self.pending_responses.items():
            if not future.done():
                future.cancel()
        self.pending_responses.clear()
        
        self.logger.info("Agent manager stopped")
    
    async def get_agent_states(self) -> Dict[str, Dict[str, Any]]:
        """Get the current state of all agents"""
        states = {}
        for agent_id, agent in self.agents.items():
            states[agent_id] = {
                "role": agent.role.value,
                "state": agent.state.value,
                "queue_size": len(agent.message_queue),
            }
        return states