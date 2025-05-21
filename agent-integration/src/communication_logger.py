"""
Communication Logger: Logs agent communication events and messages for auditing,
debugging, and analysis within the SecondBrain architecture.

This module provides the CommunicationLogger class, which captures and logs all
communication between agents, including message passing, agent transitions, and
workflow events. It supports multiple logging targets and formats.
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Set, TextIO
from enum import Enum
from dataclasses import dataclass, field, asdict
import datetime

from .agent_manager import AgentRole, Message, MessagePriority
from .communication_protocol import MessageType, MessageBus
from .context_persistence import ContextPersistenceManager, ContextType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('communication_logger')

# Log event types
class LogEventType(str, Enum):
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    AGENT_TRANSITION = "agent_transition"
    WORKFLOW_EVENT = "workflow_event"
    AGENT_ERROR = "agent_error"
    SYSTEM_EVENT = "system_event"

@dataclass
class LogEvent:
    """Represents a log event"""
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
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = asdict(self)
        # Convert enums to their values
        result["event_type"] = self.event_type.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogEvent':
        """Create from dictionary representation"""
        # Convert string values to enums
        if "event_type" in data:
            data["event_type"] = LogEventType(data["event_type"])
        
        return cls(**data)
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2)
    
    def to_log_line(self) -> str:
        """Convert to a single log line"""
        timestamp_str = datetime.datetime.fromtimestamp(self.timestamp).strftime("%Y-%m-%d %H:%M:%S.%f")
        source_target = f"{self.source} -> {self.target}" if self.target else self.source
        
        # Create basic log line
        log_line = f"[{timestamp_str}] [{self.event_type.value}] {source_target}"
        
        # Add additional context if available
        if self.message_id:
            log_line += f" | MsgID: {self.message_id}"
            
        if self.workflow_id:
            log_line += f" | WorkflowID: {self.workflow_id}"
            
        if self.task_id:
            log_line += f" | TaskID: {self.task_id}"
        
        return log_line

class CommunicationLogger:
    """
    Logs and captures all communication between agents, including messages, transitions,
    and workflow events. Supports multiple logging targets and formats.
    """
    
    def __init__(
        self,
        message_bus: Optional[MessageBus] = None,
        context_manager: Optional[ContextPersistenceManager] = None,
        config: Dict[str, Any] = None
    ):
        self.message_bus = message_bus
        self.context_manager = context_manager
        self.config = config or {}
        self.logger = logging.getLogger('communication_logger')
        
        # Log event storage
        self.events: List[LogEvent] = []
        self.events_by_id: Dict[str, LogEvent] = {}
        
        # File logging
        self.log_file: Optional[TextIO] = None
        self.json_log_file: Optional[TextIO] = None
        
        # Initialize logging targets
        self._initialize_logging_targets()
    
    def _initialize_logging_targets(self) -> None:
        """Initialize logging targets based on configuration"""
        # Initialize file logging if configured
        log_dir = self.config.get("log_dir", "logs")
        
        # Create log directory if it doesn't exist
        if not os.path.exists(log_dir):
            try:
                os.makedirs(log_dir)
                self.logger.info(f"Created log directory: {log_dir}")
            except Exception as e:
                self.logger.error(f"Error creating log directory: {str(e)}")
        
        # Initialize log file
        if self.config.get("log_to_file", True):
            log_filename = self.config.get("log_filename", f"agent_communication_{int(time.time())}.log")
            log_filepath = os.path.join(log_dir, log_filename)
            
            try:
                self.log_file = open(log_filepath, "a")
                self.logger.info(f"Initialized log file: {log_filepath}")
            except Exception as e:
                self.logger.error(f"Error initializing log file: {str(e)}")
        
        # Initialize JSON log file
        if self.config.get("log_to_json", True):
            json_log_filename = self.config.get("json_log_filename", f"agent_communication_{int(time.time())}.json")
            json_log_filepath = os.path.join(log_dir, json_log_filename)
            
            try:
                self.json_log_file = open(json_log_filepath, "a")
                self.json_log_file.write("[\n")  # Start JSON array
                self.logger.info(f"Initialized JSON log file: {json_log_filepath}")
            except Exception as e:
                self.logger.error(f"Error initializing JSON log file: {str(e)}")
        
        # Register message handler if message bus is available
        if self.message_bus:
            # Subscribe to all message types
            for msg_type in MessageType:
                self.message_bus.register_handler(
                    "communication_logger",
                    msg_type,
                    self._handle_message
                )
            
            self.logger.info("Registered message handlers with message bus")
    
    async def _handle_message(self, message: Message) -> None:
        """Handle a message from the message bus"""
        # Log the message
        await self.log_message_event(message, LogEventType.MESSAGE_SENT)
        
        # No response needed for logging
        return None
    
    async def log_message_event(
        self,
        message: Message,
        event_type: LogEventType,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent:
        """Log a message event"""
        import uuid
        
        event = LogEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            timestamp=time.time(),
            source=message.sender,
            target=message.recipient,
            message_id=message.id,
            workflow_id=message.content.get("workflow_id"),
            task_id=message.content.get("task_id"),
            content={
                "message_type": message.content.get("type", "unknown"),
                "priority": (
                    message.priority.value 
                    if hasattr(message.priority, "value") 
                    else message.priority
                ),
                "content": self._sanitize_content(message.content)
            },
            metadata=metadata or {}
        )
        
        await self._log_event(event)
        return event
    
    async def log_agent_transition(
        self,
        from_agent_id: str,
        to_agent_id: str,
        transition_type: str,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent:
        """Log an agent transition event"""
        import uuid
        
        event = LogEvent(
            event_id=str(uuid.uuid4()),
            event_type=LogEventType.AGENT_TRANSITION,
            timestamp=time.time(),
            source=from_agent_id,
            target=to_agent_id,
            workflow_id=workflow_id,
            task_id=task_id,
            content={
                "transition_type": transition_type,
                "content": content or {}
            },
            metadata=metadata or {}
        )
        
        await self._log_event(event)
        return event
    
    async def log_workflow_event(
        self,
        workflow_id: str,
        event_name: str,
        source: str,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent:
        """Log a workflow event"""
        import uuid
        
        event = LogEvent(
            event_id=str(uuid.uuid4()),
            event_type=LogEventType.WORKFLOW_EVENT,
            timestamp=time.time(),
            source=source,
            workflow_id=workflow_id,
            content={
                "event_name": event_name,
                "content": content or {}
            },
            metadata=metadata or {}
        )
        
        await self._log_event(event)
        return event
    
    async def log_error(
        self,
        source: str,
        error_message: str,
        error_type: str,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent:
        """Log an error event"""
        import uuid
        
        event = LogEvent(
            event_id=str(uuid.uuid4()),
            event_type=LogEventType.AGENT_ERROR,
            timestamp=time.time(),
            source=source,
            workflow_id=workflow_id,
            task_id=task_id,
            content={
                "error_message": error_message,
                "error_type": error_type,
                "content": content or {}
            },
            metadata=metadata or {}
        )
        
        await self._log_event(event)
        return event
    
    async def log_system_event(
        self,
        event_name: str,
        source: str,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LogEvent:
        """Log a system event"""
        import uuid
        
        event = LogEvent(
            event_id=str(uuid.uuid4()),
            event_type=LogEventType.SYSTEM_EVENT,
            timestamp=time.time(),
            source=source,
            content={
                "event_name": event_name,
                "content": content or {}
            },
            metadata=metadata or {}
        )
        
        await self._log_event(event)
        return event
    
    async def _log_event(self, event: LogEvent) -> None:
        """Log an event to all configured targets"""
        # Add to in-memory storage
        self.events.append(event)
        self.events_by_id[event.event_id] = event
        
        # Log to file
        if self.log_file:
            try:
                self.log_file.write(f"{event.to_log_line()}\n")
                self.log_file.flush()
            except Exception as e:
                self.logger.error(f"Error writing to log file: {str(e)}")
        
        # Log to JSON file
        if self.json_log_file:
            try:
                # Check if we need a separator (not the first entry)
                if self.json_log_file.tell() > 2:  # More than just the opening "[\n"
                    self.json_log_file.write(",\n")
                
                self.json_log_file.write(json.dumps(event.to_dict(), indent=2))
                self.json_log_file.flush()
            except Exception as e:
                self.logger.error(f"Error writing to JSON log file: {str(e)}")
        
        # Log to context manager if available
        if self.context_manager:
            try:
                await self._log_to_context_manager(event)
            except Exception as e:
                self.logger.error(f"Error logging to context manager: {str(e)}")
    
    async def _log_to_context_manager(self, event: LogEvent) -> None:
        """Log an event to the context manager"""
        if not self.context_manager:
            return
        
        # Create a context object for the event
        context = self.context_manager.ContextObject(
            metadata=self.context_manager.ContextMetadata(
                context_type=ContextType.MESSAGE if event.message_id else ContextType.SYSTEM_STATE,
                workflow_id=event.workflow_id,
                task_id=event.task_id,
                tags=["communication_log", event.event_type.value]
            ),
            content=event.to_dict()
        )
        
        # Store context
        await self.context_manager.store_context(context)
    
    def _sanitize_content(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize message content to remove sensitive information"""
        # Clone the content to avoid modifying the original
        result = content.copy()
        
        # Remove sensitive fields (API keys, credentials, etc.)
        sensitive_fields = [
            "api_key", "apikey", "key", "secret", "password", "token", "credential"
        ]
        
        def _sanitize_dict(d: Dict[str, Any]) -> Dict[str, Any]:
            """Recursively sanitize a dictionary"""
            result = {}
            for k, v in d.items():
                # Check if key contains a sensitive field name
                if any(field in k.lower() for field in sensitive_fields):
                    result[k] = "***REDACTED***"
                elif isinstance(v, dict):
                    result[k] = _sanitize_dict(v)
                elif isinstance(v, list):
                    result[k] = [
                        _sanitize_dict(item) if isinstance(item, dict) else item
                        for item in v
                    ]
                else:
                    result[k] = v
            return result
        
        return _sanitize_dict(result)
    
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
    ) -> List[LogEvent]:
        """Get log events matching specified criteria"""
        results = []
        
        for event in reversed(self.events):  # Most recent first
            # Apply filters
            if event_type and event.event_type != event_type:
                continue
                
            if source and event.source != source:
                continue
                
            if target and event.target != target:
                continue
                
            if workflow_id and event.workflow_id != workflow_id:
                continue
                
            if task_id and event.task_id != task_id:
                continue
                
            if message_id and event.message_id != message_id:
                continue
                
            if start_time and event.timestamp < start_time:
                continue
                
            if end_time and event.timestamp > end_time:
                continue
                
            results.append(event)
            
            if len(results) >= limit:
                break
        
        return results
    
    async def get_context_events(
        self,
        event_type: Optional[LogEventType] = None,
        source: Optional[str] = None,
        target: Optional[str] = None,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        limit: int = 100
    ) -> List[LogEvent]:
        """Get log events from context manager matching specified criteria"""
        if not self.context_manager:
            return []
            
        # Build query
        query = {
            "tags": ["communication_log"]
        }
        
        if event_type:
            query["tags"].append(event_type.value)
            
        if workflow_id:
            query["workflow_id"] = workflow_id
            
        if task_id:
            query["task_id"] = task_id
        
        # Find matching contexts
        contexts = await self.context_manager.find_contexts(query, limit=limit)
        
        # Convert to log events
        events = []
        for context in contexts:
            try:
                event = LogEvent.from_dict(context.content)
                
                # Apply additional filters
                if source and event.source != source:
                    continue
                    
                if target and event.target != target:
                    continue
                    
                events.append(event)
            except Exception as e:
                self.logger.error(f"Error converting context to log event: {str(e)}")
        
        return events
    
    def get_event_by_id(self, event_id: str) -> Optional[LogEvent]:
        """Get a log event by ID"""
        return self.events_by_id.get(event_id)
    
    def get_events_for_message(self, message_id: str) -> List[LogEvent]:
        """Get all events related to a specific message"""
        return [event for event in self.events if event.message_id == message_id]
    
    def get_events_for_workflow(self, workflow_id: str) -> List[LogEvent]:
        """Get all events related to a specific workflow"""
        return [event for event in self.events if event.workflow_id == workflow_id]
    
    def get_events_for_task(self, task_id: str) -> List[LogEvent]:
        """Get all events related to a specific task"""
        return [event for event in self.events if event.task_id == task_id]
    
    def get_agent_interactions(
        self,
        agent_id: str,
        limit: int = 100
    ) -> List[LogEvent]:
        """Get all interactions involving a specific agent"""
        results = []
        
        for event in reversed(self.events):  # Most recent first
            if event.source == agent_id or event.target == agent_id:
                results.append(event)
                
                if len(results) >= limit:
                    break
        
        return results
    
    def export_events_to_json(
        self,
        filepath: str,
        events: Optional[List[LogEvent]] = None
    ) -> bool:
        """Export events to a JSON file"""
        try:
            # Use provided events or all events
            export_events = events or self.events
            
            with open(filepath, "w") as f:
                json.dump([event.to_dict() for event in export_events], f, indent=2)
                
            self.logger.info(f"Exported {len(export_events)} events to {filepath}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error exporting events to JSON: {str(e)}")
            return False
    
    def close(self) -> None:
        """Close all log files and cleanup resources"""
        # Close log file
        if self.log_file:
            try:
                self.log_file.close()
                self.log_file = None
                self.logger.info("Closed log file")
            except Exception as e:
                self.logger.error(f"Error closing log file: {str(e)}")
        
        # Close JSON log file
        if self.json_log_file:
            try:
                self.json_log_file.write("\n]")  # Close JSON array
                self.json_log_file.close()
                self.json_log_file = None
                self.logger.info("Closed JSON log file")
            except Exception as e:
                self.logger.error(f"Error closing JSON log file: {str(e)}")

class LoggingMiddleware:
    """
    Middleware for intercepting and logging agent communication events.
    Can be used to wrap message passing and agent transitions.
    """
    
    def __init__(self, logger: CommunicationLogger):
        self.logger = logger
    
    async def log_message_send(
        self,
        message: Message,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """Log a message before sending"""
        await self.logger.log_message_event(
            message,
            LogEventType.MESSAGE_SENT,
            metadata
        )
        return message
    
    async def log_message_receive(
        self,
        message: Message,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """Log a message after receiving"""
        await self.logger.log_message_event(
            message,
            LogEventType.MESSAGE_RECEIVED,
            metadata
        )
        return message
    
    async def log_agent_transition(
        self,
        from_agent_id: str,
        to_agent_id: str,
        transition_type: str,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an agent transition"""
        await self.logger.log_agent_transition(
            from_agent_id,
            to_agent_id,
            transition_type,
            workflow_id,
            task_id,
            content,
            metadata
        )
    
    async def log_workflow_event(
        self,
        workflow_id: str,
        event_name: str,
        source: str,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a workflow event"""
        await self.logger.log_workflow_event(
            workflow_id,
            event_name,
            source,
            content,
            metadata
        )
    
    async def log_error(
        self,
        source: str,
        error_message: str,
        error_type: str,
        workflow_id: Optional[str] = None,
        task_id: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an error event"""
        await self.logger.log_error(
            source,
            error_message,
            error_type,
            workflow_id,
            task_id,
            content,
            metadata
        )