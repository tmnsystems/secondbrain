"""
Test suite for the Agent Manager component.

This file contains unit tests for the AgentManager class and related functionality.
"""

import asyncio
import json
import os
import unittest
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.agent_manager import AgentManager, Agent, AgentRole, AgentState, Message, MessagePriority

class TestAgentManager(unittest.IsolatedAsyncioTestCase):
    """Test cases for the AgentManager class."""
    
    async def asyncSetUp(self):
        """Set up test fixtures."""
        self.agent_manager = AgentManager()
        
        # Create mock agents
        self.mock_planner = Agent("planner_1", AgentRole.PLANNER, self.agent_manager)
        self.mock_executor = Agent("executor_1", AgentRole.EXECUTOR, self.agent_manager)
        self.mock_reviewer = Agent("reviewer_1", AgentRole.REVIEWER, self.agent_manager)
        
        # Register mock agents
        self.agent_manager.register_agent(self.mock_planner)
        self.agent_manager.register_agent(self.mock_executor)
        self.agent_manager.register_agent(self.mock_reviewer)
        
        # Initialize agent manager
        await self.agent_manager.initialize()
    
    async def test_register_agent(self):
        """Test registering an agent."""
        # Create a new agent
        new_agent = Agent("notion_1", AgentRole.NOTION, self.agent_manager)
        
        # Register the agent
        self.agent_manager.register_agent(new_agent)
        
        # Check if agent was registered
        self.assertIn("notion_1", self.agent_manager.agents)
        self.assertEqual(self.agent_manager.agents["notion_1"], new_agent)
    
    async def test_route_message(self):
        """Test routing a message between agents."""
        # Patch the process_message method of the executor agent
        with patch.object(self.mock_executor, 'process_message') as mock_process:
            # Create a response message
            response = Message(
                sender="executor_1",
                recipient="planner_1",
                content={"type": "response", "status": "success"}
            )
            mock_process.return_value = asyncio.Future()
            mock_process.return_value.set_result(response)
            
            # Create a message
            message = Message(
                sender="planner_1",
                recipient="executor_1",
                content={"type": "request", "action": "execute_task"}
            )
            
            # Route the message
            result = await self.agent_manager.route_message(message)
            
            # Check if message was processed
            mock_process.assert_called_once()
            self.assertEqual(result, response)
    
    async def test_broadcast_message(self):
        """Test broadcasting a message to multiple agents."""
        # Patch the process_message method of all agents
        with patch.object(self.mock_planner, 'process_message') as mock_planner_process, \
             patch.object(self.mock_executor, 'process_message') as mock_executor_process, \
             patch.object(self.mock_reviewer, 'process_message') as mock_reviewer_process:
            
            # Create response messages
            planner_response = Message(
                sender="planner_1",
                recipient="orchestrator",
                content={"type": "response", "status": "success"}
            )
            executor_response = Message(
                sender="executor_1",
                recipient="orchestrator",
                content={"type": "response", "status": "success"}
            )
            reviewer_response = Message(
                sender="reviewer_1",
                recipient="orchestrator",
                content={"type": "response", "status": "success"}
            )
            
            # Set up mock return values
            mock_planner_process.return_value = asyncio.Future()
            mock_planner_process.return_value.set_result(planner_response)
            mock_executor_process.return_value = asyncio.Future()
            mock_executor_process.return_value.set_result(executor_response)
            mock_reviewer_process.return_value = asyncio.Future()
            mock_reviewer_process.return_value.set_result(reviewer_response)
            
            # Broadcast message
            results = await self.agent_manager.broadcast_message(
                sender="orchestrator",
                content={"type": "status_request"},
                recipients=["planner_1", "executor_1", "reviewer_1"]
            )
            
            # Check results
            self.assertEqual(len(results), 3)
            self.assertEqual(results["planner_1"], planner_response)
            self.assertEqual(results["executor_1"], executor_response)
            self.assertEqual(results["reviewer_1"], reviewer_response)
            
            # Check if all agents processed the message
            mock_planner_process.assert_called_once()
            mock_executor_process.assert_called_once()
            mock_reviewer_process.assert_called_once()
    
    async def test_get_agent_states(self):
        """Test getting agent states."""
        # Set up agent states
        self.mock_planner.state = AgentState.IDLE
        self.mock_executor.state = AgentState.PROCESSING
        self.mock_reviewer.state = AgentState.WAITING
        
        # Get agent states
        states = await self.agent_manager.get_agent_states()
        
        # Check states
        self.assertEqual(len(states), 3)
        self.assertEqual(states["planner_1"]["state"], "idle")
        self.assertEqual(states["executor_1"]["state"], "processing")
        self.assertEqual(states["reviewer_1"]["state"], "waiting")
    
    async def test_start_stop(self):
        """Test starting and stopping the agent manager."""
        # Start the agent manager
        await self.agent_manager.start()
        self.assertTrue(self.agent_manager._running)
        
        # Stop the agent manager
        await self.agent_manager.stop()
        self.assertFalse(self.agent_manager._running)

class TestAgent(unittest.IsolatedAsyncioTestCase):
    """Test cases for the Agent class."""
    
    async def asyncSetUp(self):
        """Set up test fixtures."""
        self.agent_manager = MagicMock()
        self.agent = Agent("test_agent", AgentRole.EXECUTOR, self.agent_manager)
    
    async def test_initialize(self):
        """Test initializing an agent."""
        # Initialize the agent
        result = await self.agent.initialize()
        
        # Check result
        self.assertTrue(result)
        self.assertEqual(self.agent.state, AgentState.IDLE)
    
    async def test_process_message(self):
        """Test processing a message."""
        # Register a message handler
        handler_mock = MagicMock()
        handler_mock.return_value = {"type": "response", "status": "success"}
        self.agent.register_message_handler("test_request", handler_mock)
        
        # Create a message
        message = Message(
            sender="sender",
            recipient="test_agent",
            content={"type": "test_request", "data": "test"}
        )
        
        # Process the message
        response = await self.agent.process_message(message)
        
        # Check if handler was called
        handler_mock.assert_called_once_with({"type": "test_request", "data": "test"})
        
        # Check response
        self.assertEqual(response.sender, "test_agent")
        self.assertEqual(response.recipient, "sender")
        self.assertEqual(response.content, {"type": "response", "status": "success"})
    
    async def test_send_message(self):
        """Test sending a message."""
        # Mock the agent manager's route_message method
        self.agent_manager.route_message = MagicMock()
        self.agent_manager.route_message.return_value = asyncio.Future()
        self.agent_manager.route_message.return_value.set_result(
            Message(
                sender="recipient",
                recipient="test_agent",
                content={"type": "response", "status": "received"}
            )
        )
        
        # Send a message
        response = await self.agent.send_message(
            recipient="recipient",
            content={"type": "request", "action": "test"}
        )
        
        # Check if agent manager was called
        self.agent_manager.route_message.assert_called_once()
        
        # Check the message sent
        sent_message = self.agent_manager.route_message.call_args[0][0]
        self.assertEqual(sent_message.sender, "test_agent")
        self.assertEqual(sent_message.recipient, "recipient")
        self.assertEqual(sent_message.content, {"type": "request", "action": "test"})
        
        # Check response
        self.assertEqual(response.sender, "recipient")
        self.assertEqual(response.recipient, "test_agent")
        self.assertEqual(response.content, {"type": "response", "status": "received"})
    
    async def test_terminate(self):
        """Test terminating an agent."""
        # Terminate the agent
        await self.agent.terminate()
        
        # Check state
        self.assertEqual(self.agent.state, AgentState.TERMINATED)

class TestMessage(unittest.TestCase):
    """Test cases for the Message class."""
    
    def test_create_message(self):
        """Test creating a message."""
        # Create a message
        message = Message(
            sender="sender",
            recipient="recipient",
            content={"type": "request", "action": "test"},
            priority=MessagePriority.HIGH
        )
        
        # Check properties
        self.assertEqual(message.sender, "sender")
        self.assertEqual(message.recipient, "recipient")
        self.assertEqual(message.content, {"type": "request", "action": "test"})
        self.assertEqual(message.priority, MessagePriority.HIGH)
        self.assertIsNotNone(message.id)
    
    def test_to_dict(self):
        """Test converting a message to dictionary."""
        # Create a message
        message = Message(
            sender="sender",
            recipient="recipient",
            content={"type": "request", "action": "test"},
            priority=MessagePriority.HIGH,
            trace_id="trace_123",
            parent_id="parent_456",
            timeout=30.0
        )
        
        # Convert to dictionary
        message_dict = message.to_dict()
        
        # Check dictionary
        self.assertEqual(message_dict["id"], message.id)
        self.assertEqual(message_dict["sender"], "sender")
        self.assertEqual(message_dict["recipient"], "recipient")
        self.assertEqual(message_dict["content"], {"type": "request", "action": "test"})
        self.assertEqual(message_dict["priority"], MessagePriority.HIGH.value)
        self.assertEqual(message_dict["trace_id"], "trace_123")
        self.assertEqual(message_dict["parent_id"], "parent_456")
        self.assertEqual(message_dict["timeout"], 30.0)
    
    def test_from_dict(self):
        """Test creating a message from dictionary."""
        # Create dictionary
        message_dict = {
            "id": "msg_123",
            "sender": "sender",
            "recipient": "recipient",
            "content": {"type": "request", "action": "test"},
            "priority": 2,
            "trace_id": "trace_123",
            "parent_id": "parent_456",
            "timeout": 30.0,
            "processed": False,
            "response_id": None
        }
        
        # Create message from dictionary
        message = Message.from_dict(message_dict)
        
        # Check properties
        self.assertEqual(message.id, "msg_123")
        self.assertEqual(message.sender, "sender")
        self.assertEqual(message.recipient, "recipient")
        self.assertEqual(message.content, {"type": "request", "action": "test"})
        self.assertEqual(message.priority, MessagePriority.HIGH)
        self.assertEqual(message.trace_id, "trace_123")
        self.assertEqual(message.parent_id, "parent_456")
        self.assertEqual(message.timeout, 30.0)
        self.assertFalse(message.processed)
        self.assertIsNone(message.response_id)
    
    def test_create_response(self):
        """Test creating a response message."""
        # Create a message
        message = Message(
            sender="sender",
            recipient="recipient",
            content={"type": "request", "action": "test"},
            priority=MessagePriority.HIGH,
            trace_id="trace_123"
        )
        
        # Create response
        response = message.create_response({"type": "response", "status": "success"})
        
        # Check response properties
        self.assertEqual(response.sender, "recipient")
        self.assertEqual(response.recipient, "sender")
        self.assertEqual(response.content, {"type": "response", "status": "success"})
        self.assertEqual(response.priority, MessagePriority.HIGH)
        self.assertEqual(response.trace_id, "trace_123")
        self.assertEqual(response.parent_id, message.id)
        
        # Check original message was updated
        self.assertTrue(message.processed)
        self.assertEqual(message.response_id, response.id)

if __name__ == '__main__':
    unittest.main()