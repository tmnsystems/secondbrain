"""
Communication Protocol: Standardized message format and exchange mechanisms 
for the SecondBrain multi-agent architecture.

This module defines the communication protocol used by agents to exchange
messages, including message structures, serialization, and transport mechanisms.
It supports both synchronous and asynchronous communication patterns.
"""

import json
import time
import uuid
import asyncio
import logging
from typing import Dict, List, Any, Optional, Union, Callable, Set
from enum import Enum
from dataclasses import dataclass, field, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('communication_protocol')

# Message types
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
    
    # Context-related messages
    CONTEXT_REQUEST = "context_request"
    CONTEXT_RESPONSE = "context_response"
    CONTEXT_UPDATE = "context_update"
    
    # Notion-related messages
    NOTION_CREATE = "notion_create"
    NOTION_UPDATE = "notion_update"
    NOTION_QUERY = "notion_query"
    NOTION_RESPONSE = "notion_response"
    
    # Orchestration messages
    WORKFLOW_START = "workflow_start"
    WORKFLOW_STEP = "workflow_step"
    WORKFLOW_COMPLETE = "workflow_complete"
    WORKFLOW_ERROR = "workflow_error"
    
    # Tool-related messages
    TOOL_REQUEST = "tool_request"
    TOOL_RESPONSE = "tool_response"
    
    # Custom message type
    CUSTOM = "custom"

# Message priority levels
class MessagePriority(int, Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

# Message status
class MessageStatus(str, Enum):
    CREATED = "created"
    QUEUED = "queued"
    PROCESSING = "processing"
    DELIVERED = "delivered"
    RESPONDED = "responded"
    FAILED = "failed"
    TIMEOUT = "timeout"

@dataclass
class MessageMetadata:
    """Metadata for messages"""
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    retry_count: int = 0
    max_retries: int = 3
    tags: List[str] = field(default_factory=list)
    custom: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Message:
    """
    Standard message format for agent communication.
    Messages are the primary means of communication between agents.
    """
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
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary representation"""
        result = asdict(self)
        # Convert enums to their values
        result["message_type"] = self.message_type.value
        result["priority"] = self.priority.value
        result["status"] = self.status.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        """Create message from dictionary representation"""
        # Convert string values to enums
        if "message_type" in data:
            data["message_type"] = MessageType(data["message_type"])
        if "priority" in data:
            data["priority"] = MessagePriority(data["priority"])
        if "status" in data:
            data["status"] = MessageStatus(data["status"])
        
        # Convert metadata dict to MessageMetadata if needed
        if "metadata" in data and isinstance(data["metadata"], dict):
            data["metadata"] = MessageMetadata(**data["metadata"])
            
        return cls(**data)
    
    def to_json(self) -> str:
        """Convert message to JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Message':
        """Create message from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def create_response(
        self, 
        content: Dict[str, Any], 
        message_type: Optional[MessageType] = None
    ) -> 'Message':
        """Create a response to this message"""
        response_type = message_type or self._get_response_type()
        
        return Message(
            message_type=response_type,
            sender_id=self.recipient_id,
            recipient_id=self.sender_id,
            content=content,
            priority=self.priority,
            parent_id=self.message_id,
            response_to=self.message_id,
            metadata=MessageMetadata(
                trace_id=self.metadata.trace_id,
                session_id=self.metadata.session_id,
                tags=self.metadata.tags.copy()
            )
        )
    
    def _get_response_type(self) -> MessageType:
        """Get the appropriate response type for this message type"""
        response_types = {
            MessageType.TASK_REQUEST: MessageType.TASK_RESPONSE,
            MessageType.REVIEW_REQUEST: MessageType.REVIEW_RESPONSE,
            MessageType.CONTEXT_REQUEST: MessageType.CONTEXT_RESPONSE,
            MessageType.NOTION_QUERY: MessageType.NOTION_RESPONSE,
            MessageType.TOOL_REQUEST: MessageType.TOOL_RESPONSE,
        }
        return response_types.get(self.message_type, MessageType.CUSTOM)
    
    def is_expired(self) -> bool:
        """Check if message has expired"""
        if self.metadata.expires_at is None:
            return False
        return time.time() > self.metadata.expires_at
    
    def should_retry(self) -> bool:
        """Check if message should be retried"""
        if self.status not in [MessageStatus.FAILED, MessageStatus.TIMEOUT]:
            return False
        return self.metadata.retry_count < self.metadata.max_retries

class MessageBus:
    """
    Message bus for routing messages between agents.
    Provides both synchronous and asynchronous message delivery.
    """
    
    def __init__(self):
        self.subscriptions: Dict[str, Set[str]] = {}
        self.message_handlers: Dict[str, Dict[MessageType, List[Callable]]] = {}
        self.pending_responses: Dict[str, asyncio.Future] = {}
        self.message_history: Dict[str, Message] = {}
        self.logger = logging.getLogger('message_bus')
        
    def subscribe(self, agent_id: str, message_types: List[MessageType]) -> None:
        """Subscribe an agent to specific message types"""
        for msg_type in message_types:
            if msg_type.value not in self.subscriptions:
                self.subscriptions[msg_type.value] = set()
            self.subscriptions[msg_type.value].add(agent_id)
            self.logger.info(f"Agent {agent_id} subscribed to {msg_type.value} messages")
    
    def unsubscribe(self, agent_id: str, message_types: Optional[List[MessageType]] = None) -> None:
        """Unsubscribe an agent from specific message types or all if not specified"""
        if message_types is None:
            # Unsubscribe from all message types
            for subscribers in self.subscriptions.values():
                if agent_id in subscribers:
                    subscribers.remove(agent_id)
            self.logger.info(f"Agent {agent_id} unsubscribed from all message types")
        else:
            # Unsubscribe from specific message types
            for msg_type in message_types:
                if msg_type.value in self.subscriptions and agent_id in self.subscriptions[msg_type.value]:
                    self.subscriptions[msg_type.value].remove(agent_id)
                    self.logger.info(f"Agent {agent_id} unsubscribed from {msg_type.value} messages")
    
    def register_handler(
        self, 
        agent_id: str, 
        message_type: MessageType, 
        handler: Callable[[Message], Union[Dict[str, Any], None, asyncio.Future]]
    ) -> None:
        """Register a handler for a specific message type"""
        if agent_id not in self.message_handlers:
            self.message_handlers[agent_id] = {}
        
        if message_type not in self.message_handlers[agent_id]:
            self.message_handlers[agent_id][message_type] = []
            
        self.message_handlers[agent_id][message_type].append(handler)
        self.logger.info(f"Registered handler for {message_type.value} messages for agent {agent_id}")
    
    async def publish(self, message: Message) -> List[Optional[Message]]:
        """
        Publish a message to all subscribers of its type.
        Returns a list of response messages from handlers.
        """
        message.status = MessageStatus.QUEUED
        self.message_history[message.message_id] = message
        
        responses = []
        msg_type = message.message_type.value
        
        if msg_type in self.subscriptions:
            subscribers = self.subscriptions[msg_type]
            self.logger.info(f"Publishing {msg_type} message to {len(subscribers)} subscribers")
            
            # Create tasks for all subscribers
            tasks = []
            for subscriber_id in subscribers:
                task = asyncio.create_task(self._deliver_to_agent(message, subscriber_id))
                tasks.append(task)
            
            # Wait for all deliveries to complete
            completed_tasks = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for result in completed_tasks:
                if isinstance(result, Exception):
                    self.logger.error(f"Error delivering message: {str(result)}")
                    responses.append(None)
                else:
                    responses.append(result)
        else:
            self.logger.warning(f"No subscribers for message type {msg_type}")
        
        return [r for r in responses if r is not None]
    
    async def send(self, message: Message) -> Optional[Message]:
        """
        Send a message to a specific recipient and wait for response.
        This is a synchronous operation that returns the response message.
        """
        if not message.recipient_id:
            self.logger.error("Cannot send message without recipient_id")
            return None
        
        message.status = MessageStatus.QUEUED
        self.message_history[message.message_id] = message
        
        # Create a future for the response
        response_future = asyncio.Future()
        self.pending_responses[message.message_id] = response_future
        
        # Deliver the message
        try:
            await self._deliver_to_agent(message, message.recipient_id)
            
            # Wait for response with timeout
            if message.timeout:
                try:
                    response = await asyncio.wait_for(response_future, message.timeout)
                    return response
                except asyncio.TimeoutError:
                    message.status = MessageStatus.TIMEOUT
                    self.logger.warning(f"Message {message.message_id} timed out")
                    del self.pending_responses[message.message_id]
                    return None
            else:
                response = await response_future
                return response
                
        except Exception as e:
            self.logger.error(f"Error sending message to {message.recipient_id}: {str(e)}")
            message.status = MessageStatus.FAILED
            
            if message.message_id in self.pending_responses:
                future = self.pending_responses[message.message_id]
                if not future.done():
                    future.set_exception(e)
                del self.pending_responses[message.message_id]
            
            return None
    
    async def _deliver_to_agent(self, message: Message, agent_id: str) -> Optional[Message]:
        """Deliver a message to a specific agent and process handlers"""
        try:
            message.status = MessageStatus.PROCESSING
            
            # Find handlers for this message type
            if agent_id in self.message_handlers and message.message_type in self.message_handlers[agent_id]:
                handlers = self.message_handlers[agent_id][message.message_type]
                
                # Execute all handlers
                for handler in handlers:
                    result = handler(message)
                    
                    # Handle both synchronous and asynchronous results
                    if asyncio.iscoroutine(result) or isinstance(result, asyncio.Future):
                        result = await result
                    
                    # If handler returned a dict, create a response message
                    if isinstance(result, dict):
                        response = message.create_response(result)
                        response.status = MessageStatus.DELIVERED
                        self.message_history[response.message_id] = response
                        
                        # If there's a pending future for this message, resolve it
                        if message.message_id in self.pending_responses:
                            future = self.pending_responses[message.message_id]
                            if not future.done():
                                future.set_result(response)
                            del self.pending_responses[message.message_id]
                        
                        message.status = MessageStatus.RESPONDED
                        return response
                    
                    # If handler returned a Message object directly
                    elif isinstance(result, Message):
                        response = result
                        response.status = MessageStatus.DELIVERED
                        self.message_history[response.message_id] = response
                        
                        # If there's a pending future for this message, resolve it
                        if message.message_id in self.pending_responses:
                            future = self.pending_responses[message.message_id]
                            if not future.done():
                                future.set_result(response)
                            del self.pending_responses[message.message_id]
                        
                        message.status = MessageStatus.RESPONDED
                        return response
            
            # If we got here, either there were no handlers or none returned a response
            message.status = MessageStatus.DELIVERED
            self.logger.warning(f"No response generated for message {message.message_id}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error delivering message {message.message_id} to {agent_id}: {str(e)}")
            message.status = MessageStatus.FAILED
            
            # If there's a pending future for this message, resolve it with an error
            if message.message_id in self.pending_responses:
                future = self.pending_responses[message.message_id]
                if not future.done():
                    future.set_exception(e)
                del self.pending_responses[message.message_id]
            
            return None
    
    def get_message_history(self, trace_id: Optional[str] = None) -> List[Message]:
        """Get the message history, optionally filtered by trace_id"""
        if trace_id:
            return [
                msg for msg in self.message_history.values() 
                if msg.metadata.trace_id == trace_id
            ]
        return list(self.message_history.values())
    
    def clear_message_history(self, older_than: Optional[float] = None) -> int:
        """Clear message history, optionally only messages older than a timestamp"""
        if older_than is None:
            count = len(self.message_history)
            self.message_history.clear()
            return count
        
        to_remove = [
            msg_id for msg_id, msg in self.message_history.items()
            if msg.created_at < older_than
        ]
        
        for msg_id in to_remove:
            del self.message_history[msg_id]
            
        return len(to_remove)