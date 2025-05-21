"""
Test suite for the Communication Protocol component.

This file contains unit tests for the MessageBus and related communication components.
"""

import asyncio
import json
import os
import unittest
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.communication_protocol import MessageBus, Message, MessageType, MessageStatus, MessageMetadata

class TestMessageBus(unittest.IsolatedAsyncioTestCase):
    """Test cases for the MessageBus class."""
    
    async def asyncSetUp(self):
        """Set up test fixtures."""
        self.message_bus = MessageBus()
        
        # Set up mock handler
        self.handler1 = MagicMock()
        self.handler1.return_value = {"status": "success", "result": "processed"}
        
        self.handler2 = MagicMock()
        self.handler2.return_value = {"status": "success", "result": "processed2"}
        
        # Register subscribers and handlers
        self.message_bus.subscribe("agent1", [MessageType.TASK_REQUEST, MessageType.REVIEW_REQUEST])
        self.message_bus.subscribe("agent2", [MessageType.TASK_RESPONSE])
        
        self.message_bus.register_handler("agent1", MessageType.TASK_REQUEST, self.handler1)
        self.message_bus.register_handler("agent2", MessageType.TASK_RESPONSE, self.handler2)
    
    async def test_subscribe_unsubscribe(self):
        """Test subscribing and unsubscribing from message types."""
        # Check initial subscriptions
        self.assertIn("agent1", self.message_bus.subscriptions[MessageType.TASK_REQUEST.value])
        self.assertIn("agent1", self.message_bus.subscriptions[MessageType.REVIEW_REQUEST.value])
        self.assertIn("agent2", self.message_bus.subscriptions[MessageType.TASK_RESPONSE.value])
        
        # Unsubscribe from specific message type
        self.message_bus.unsubscribe("agent1", [MessageType.TASK_REQUEST])
        
        # Check subscriptions after unsubscribe
        self.assertNotIn("agent1", self.message_bus.subscriptions[MessageType.TASK_REQUEST.value])
        self.assertIn("agent1", self.message_bus.subscriptions[MessageType.REVIEW_REQUEST.value])
        
        # Unsubscribe from all message types
        self.message_bus.unsubscribe("agent1")
        
        # Check subscriptions after unsubscribe all
        self.assertNotIn("agent1", self.message_bus.subscriptions[MessageType.REVIEW_REQUEST.value])
    
    async def test_register_handler(self):
        """Test registering a message handler."""
        # Register a new handler
        new_handler = MagicMock()
        self.message_bus.register_handler("agent3", MessageType.ERROR, new_handler)
        
        # Check if handler was registered
        self.assertIn("agent3", self.message_bus.message_handlers)
        self.assertIn(MessageType.ERROR, self.message_bus.message_handlers["agent3"])
        self.assertEqual(self.message_bus.message_handlers["agent3"][MessageType.ERROR][0], new_handler)
    
    async def test_publish(self):
        """Test publishing a message to subscribers."""
        # Create a message
        message = Message(
            message_id="msg_123",
            message_type=MessageType.TASK_REQUEST,
            sender_id="publisher",
            recipient_id="",
            content={"action": "do_task", "payload": "test"}
        )
        
        # Set up handler to return a response
        response_content = {"status": "success", "result": "task_done"}
        self.handler1.return_value = response_content
        
        # Publish the message
        responses = await self.message_bus.publish(message)
        
        # Check if handler was called
        self.handler1.assert_called_once()
        
        # Check response
        self.assertEqual(len(responses), 1)
        self.assertEqual(responses[0].content, response_content)
        self.assertEqual(responses[0].sender_id, "agent1")
        self.assertEqual(responses[0].recipient_id, "publisher")
    
    async def test_send(self):
        """Test sending a message to a specific recipient."""
        # Create a message
        message = Message(
            message_id="msg_123",
            message_type=MessageType.TASK_RESPONSE,
            sender_id="sender",
            recipient_id="agent2",
            content={"status": "task_completed", "result": {"data": "output"}}
        )
        
        # Set up handler to return a response
        response_content = {"status": "received", "ack": True}
        self.handler2.return_value = response_content
        
        # Send the message
        response = await self.message_bus.send(message)
        
        # Check if handler was called
        self.handler2.assert_called_once()
        
        # Check response
        self.assertEqual(response.content, response_content)
        self.assertEqual(response.sender_id, "agent2")
        self.assertEqual(response.recipient_id, "sender")
    
    async def test_message_history(self):
        """Test message history tracking."""
        # Create and send messages
        message1 = Message(
            message_id="msg_1",
            message_type=MessageType.TASK_REQUEST,
            sender_id="sender",
            recipient_id="agent1",
            content={"action": "task1"}
        )
        
        message2 = Message(
            message_id="msg_2",
            message_type=MessageType.TASK_REQUEST,
            sender_id="sender",
            recipient_id="agent1",
            content={"action": "task2"}
        )
        
        # Set trace_id for message2
        message2.metadata.trace_id = "trace_123"
        
        # Send messages
        await self.message_bus.send(message1)
        await self.message_bus.send(message2)
        
        # Get all message history
        history = self.message_bus.get_message_history()
        self.assertEqual(len(history), 4)  # 2 messages + 2 responses
        
        # Get history by trace_id
        trace_history = self.message_bus.get_message_history("trace_123")
        self.assertEqual(len(trace_history), 2)  # message2 + its response
        self.assertEqual(trace_history[0].message_id, "msg_2")
        
        # Clear message history
        cleared = self.message_bus.clear_message_history()
        self.assertEqual(cleared, 4)
        self.assertEqual(len(self.message_bus.get_message_history()), 0)
    
    async def test_message_expiration(self):
        """Test message expiration."""
        # Create a message that is already expired
        message = Message(
            message_id="msg_exp",
            message_type=MessageType.TASK_REQUEST,
            sender_id="sender",
            recipient_id="agent1",
            content={"action": "expired_task"}
        )
        message.metadata.expires_at = time.time() - 10  # 10 seconds in the past
        
        # Check if message is expired
        self.assertTrue(message.is_expired())
    
    async def test_message_retry(self):
        """Test message retry logic."""
        # Create a message that failed but can be retried
        message = Message(
            message_id="msg_retry",
            message_type=MessageType.TASK_REQUEST,
            sender_id="sender",
            recipient_id="agent1",
            content={"action": "retry_task"}
        )
        message.status = MessageStatus.FAILED
        message.metadata.retry_count = 1
        message.metadata.max_retries = 3
        
        # Check if message should be retried
        self.assertTrue(message.should_retry())
        
        # Update retry count to max
        message.metadata.retry_count = 3
        
        # Check if message should not be retried anymore
        self.assertFalse(message.should_retry())

class TestMessage(unittest.TestCase):
    """Test cases for the Message class."""
    
    def test_message_creation(self):
        """Test creating a message."""
        # Create message
        message = Message(
            message_id="msg_123",
            message_type=MessageType.TASK_REQUEST,
            sender_id="sender",
            recipient_id="recipient",
            content={"action": "do_task", "payload": "test"},
            priority=MessagePriority.HIGH,
            status=MessageStatus.CREATED,
            parent_id="parent_123",
            response_to="resp_123",
            timeout=30.0
        )
        
        # Check properties
        self.assertEqual(message.message_id, "msg_123")
        self.assertEqual(message.message_type, MessageType.TASK_REQUEST)
        self.assertEqual(message.sender_id, "sender")
        self.assertEqual(message.recipient_id, "recipient")
        self.assertEqual(message.content, {"action": "do_task", "payload": "test"})
        self.assertEqual(message.priority, MessagePriority.HIGH)
        self.assertEqual(message.status, MessageStatus.CREATED)
        self.assertEqual(message.parent_id, "parent_123")
        self.assertEqual(message.response_to, "resp_123")
        self.assertEqual(message.timeout, 30.0)
    
    def test_to_from_dict(self):
        """Test converting message to and from dictionary."""
        # Create original message
        original = Message(
            message_id="msg_123",
            message_type=MessageType.TASK_REQUEST,
            sender_id="sender",
            recipient_id="recipient",
            content={"action": "do_task", "payload": "test"},
            priority=MessagePriority.HIGH,
            status=MessageStatus.CREATED,
            parent_id="parent_123",
            response_to="resp_123"
        )
        
        # Convert to dictionary
        message_dict = original.to_dict()
        
        # Convert back to message
        converted = Message.from_dict(message_dict)
        
        # Check properties match
        self.assertEqual(converted.message_id, original.message_id)
        self.assertEqual(converted.message_type, original.message_type)
        self.assertEqual(converted.sender_id, original.sender_id)
        self.assertEqual(converted.recipient_id, original.recipient_id)
        self.assertEqual(converted.content, original.content)
        self.assertEqual(converted.priority, original.priority)
        self.assertEqual(converted.status, original.status)
        self.assertEqual(converted.parent_id, original.parent_id)
        self.assertEqual(converted.response_to, original.response_to)
    
    def test_to_from_json(self):
        """Test converting message to and from JSON."""
        # Create original message
        original = Message(
            message_id="msg_123",
            message_type=MessageType.TASK_REQUEST,
            sender_id="sender",
            recipient_id="recipient",
            content={"action": "do_task", "payload": "test"},
            priority=MessagePriority.HIGH,
            status=MessageStatus.CREATED
        )
        
        # Convert to JSON
        json_str = original.to_json()
        
        # Convert back to message
        converted = Message.from_json(json_str)
        
        # Check properties match
        self.assertEqual(converted.message_id, original.message_id)
        self.assertEqual(converted.message_type, original.message_type)
        self.assertEqual(converted.sender_id, original.sender_id)
        self.assertEqual(converted.recipient_id, original.recipient_id)
        self.assertEqual(converted.content, original.content)
        self.assertEqual(converted.priority, original.priority)
        self.assertEqual(converted.status, original.status)
    
    def test_create_response(self):
        """Test creating a response message."""
        # Create original message
        request = Message(
            message_id="request_123",
            message_type=MessageType.TASK_REQUEST,
            sender_id="requester",
            recipient_id="processor",
            content={"action": "do_task", "payload": "test"},
            priority=MessagePriority.HIGH,
            metadata=MessageMetadata(trace_id="trace_abc", tags=["important"])
        )
        
        # Create response
        response = request.create_response(
            {"status": "success", "result": "done"}, 
            MessageType.TASK_RESPONSE
        )
        
        # Check response properties
        self.assertEqual(response.message_type, MessageType.TASK_RESPONSE)
        self.assertEqual(response.sender_id, "processor")
        self.assertEqual(response.recipient_id, "requester")
        self.assertEqual(response.content, {"status": "success", "result": "done"})
        self.assertEqual(response.priority, request.priority)
        self.assertEqual(response.parent_id, request.message_id)
        self.assertEqual(response.response_to, request.message_id)
        
        # Check metadata carried over
        self.assertEqual(response.metadata.trace_id, request.metadata.trace_id)
        self.assertEqual(response.metadata.tags, request.metadata.tags)

class TestMessageMetadata(unittest.TestCase):
    """Test cases for the MessageMetadata class."""
    
    def test_metadata_creation(self):
        """Test creating message metadata."""
        # Create metadata
        metadata = MessageMetadata(
            trace_id="trace_123",
            session_id="session_456",
            created_at=1625000000.0,
            expires_at=1625001000.0,
            retry_count=2,
            max_retries=5,
            tags=["important", "urgent"],
            custom={"source": "test", "priority": "high"}
        )
        
        # Check properties
        self.assertEqual(metadata.trace_id, "trace_123")
        self.assertEqual(metadata.session_id, "session_456")
        self.assertEqual(metadata.created_at, 1625000000.0)
        self.assertEqual(metadata.expires_at, 1625001000.0)
        self.assertEqual(metadata.retry_count, 2)
        self.assertEqual(metadata.max_retries, 5)
        self.assertEqual(metadata.tags, ["important", "urgent"])
        self.assertEqual(metadata.custom, {"source": "test", "priority": "high"})
    
    def test_default_values(self):
        """Test default values for metadata."""
        # Create metadata with defaults
        metadata = MessageMetadata()
        
        # Check default properties
        self.assertIsNotNone(metadata.trace_id)
        self.assertIsNone(metadata.session_id)
        self.assertIsNotNone(metadata.created_at)
        self.assertIsNone(metadata.expires_at)
        self.assertEqual(metadata.retry_count, 0)
        self.assertEqual(metadata.max_retries, 3)
        self.assertEqual(metadata.tags, [])
        self.assertEqual(metadata.custom, {})

if __name__ == '__main__':
    unittest.main()