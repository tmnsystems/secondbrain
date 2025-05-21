"""
Test suite for the Reviewer Agent component.

This file contains unit tests for the ReviewerAgent class and related functionality.
"""

import asyncio
import json
import os
import unittest
from unittest.mock import patch, MagicMock, AsyncMock

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.agent_manager import AgentManager, AgentRole, Message
from src.reviewer_agent import ReviewerAgent, ReviewRequest, ReviewType, ReviewStatus

class TestReviewerAgent(unittest.IsolatedAsyncioTestCase):
    """Test cases for the ReviewerAgent class."""
    
    async def asyncSetUp(self):
        """Set up test fixtures."""
        # Mock agent manager
        self.agent_manager = MagicMock()
        self.agent_manager.route_message = AsyncMock()
        
        # Mock message bus
        self.message_bus = MagicMock()
        self.message_bus.register_handler = MagicMock()
        self.message_bus.subscribe = MagicMock()
        
        # Create reviewer agent
        self.reviewer_agent = ReviewerAgent(
            "reviewer_1",
            self.agent_manager,
            config={"notion": {"api_key": "fake_key"}},
            message_bus=self.message_bus
        )
        
        # Mock notion client
        self.reviewer_agent.notion_client = MagicMock()
        self.reviewer_agent.notion_client.pages = MagicMock()
        self.reviewer_agent.notion_client.pages.create = AsyncMock()
        self.reviewer_agent.notion_client.pages.update = AsyncMock()
        self.reviewer_agent.notion_client.blocks = MagicMock()
        self.reviewer_agent.notion_client.blocks.children = MagicMock()
        self.reviewer_agent.notion_client.blocks.children.append = AsyncMock()
        
        # Initialize agent
        await self.reviewer_agent.initialize()
    
    async def test_create_review_request(self):
        """Test creating a review request."""
        # Create a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={
                "plan": {
                    "steps": ["Step 1", "Step 2", "Step 3"]
                },
                "strategic_goals": "Test strategic goals"
            },
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1",
            priority=2
        )
        
        # Check request properties
        self.assertEqual(request.title, "Test Review")
        self.assertEqual(request.description, "Review test plan")
        self.assertEqual(request.review_type, ReviewType.PRE_IMPLEMENTATION)
        self.assertEqual(request.requester_id, "planner_1")
        self.assertEqual(request.priority, 2)
        self.assertEqual(request.status, ReviewStatus.PENDING)
        self.assertFalse(request.approval)
        
        # Check if request was added to pending reviews
        self.assertIn(request.request_id, self.reviewer_agent.pending_reviews)
        
        # Check if request was added to review queue
        self.assertIn(request.request_id, self.reviewer_agent.review_queue)
        
        # Check if Notion documentation was created
        self.reviewer_agent.notion_client.pages.create.assert_called_once()
    
    async def test_process_next_review(self):
        """Test processing the next review in the queue."""
        # Create a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={
                "plan": {
                    "steps": ["Step 1", "Step 2", "Step 3"],
                    "strategic_goals": "Test strategic goals"
                },
                "strategic_goals": "Test strategic goals"
            },
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1"
        )
        
        # Process the review
        processed_request = await self.reviewer_agent.process_next_review()
        
        # Check if request was processed
        self.assertEqual(processed_request.request_id, request.request_id)
        self.assertNotEqual(processed_request.status, ReviewStatus.PENDING)
        self.assertIsNotNone(processed_request.review_completed_at)
        
        # Check if request was moved from pending to completed
        self.assertNotIn(request.request_id, self.reviewer_agent.pending_reviews)
        self.assertIn(request.request_id, self.reviewer_agent.completed_reviews)
        
        # Check if feedback was added
        self.assertGreater(len(processed_request.feedback), 0)
        
        # Check if Notion documentation was updated
        self.reviewer_agent.notion_client.pages.update.assert_called_once()
        self.reviewer_agent.notion_client.blocks.children.append.assert_called_once()
    
    async def test_get_review_status(self):
        """Test getting review status."""
        # Create a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={"plan": {"steps": ["Step 1"]}},
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1"
        )
        
        # Get status
        status = await self.reviewer_agent.get_review_status(request.request_id)
        
        # Check status
        self.assertEqual(status, request)
        self.assertEqual(status.status, ReviewStatus.PENDING)
        
        # Process the review
        await self.reviewer_agent.process_next_review()
        
        # Get status again
        status = await self.reviewer_agent.get_review_status(request.request_id)
        
        # Check updated status
        self.assertNotEqual(status.status, ReviewStatus.PENDING)
    
    async def test_notify_implementation(self):
        """Test notifying of implementation."""
        # Create and process a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={"plan": {"steps": ["Step 1"]}},
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1"
        )
        await self.reviewer_agent.process_next_review()
        
        # Notify implementation
        implementation_id = "impl_123"
        updated_request = await self.reviewer_agent.notify_implementation(
            request.request_id,
            implementation_id
        )
        
        # Check if implementation was recorded
        self.assertEqual(updated_request.implementation_id, implementation_id)
        self.assertIsNotNone(updated_request.implemented_at)
        self.assertFalse(updated_request.implementation_verified)
        
        # Check if Notion documentation was updated
        self.assertEqual(self.reviewer_agent.notion_client.pages.update.call_count, 2)
        self.assertEqual(self.reviewer_agent.notion_client.blocks.children.append.call_count, 2)
    
    async def test_verify_implementation(self):
        """Test verifying implementation."""
        # Create, process, and implement a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={"plan": {"steps": ["Step 1"]}},
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1"
        )
        await self.reviewer_agent.process_next_review()
        await self.reviewer_agent.notify_implementation(request.request_id, "impl_123")
        
        # Verify implementation
        verification_notes = "Implementation matches the approved plan"
        verified_request = await self.reviewer_agent.verify_implementation(
            request.request_id,
            True,
            verification_notes
        )
        
        # Check if verification was recorded
        self.assertTrue(verified_request.implementation_verified)
        
        # Check if feedback was added
        self.assertEqual(len(verified_request.feedback), 2)  # Initial review + verification
        self.assertEqual(verified_request.feedback[1]["name"], "Implementation Verification")
        self.assertEqual(verified_request.feedback[1]["feedback"], verification_notes)
        
        # Check if Notion documentation was updated
        self.assertEqual(self.reviewer_agent.notion_client.pages.update.call_count, 3)
        self.assertEqual(self.reviewer_agent.notion_client.blocks.children.append.call_count, 3)
    
    async def test_cancel_review(self):
        """Test cancelling a review."""
        # Create a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={"plan": {"steps": ["Step 1"]}},
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1"
        )
        
        # Cancel the review
        cancellation_reason = "No longer needed"
        await self.reviewer_agent.cancel_review(request.request_id, cancellation_reason)
        
        # Check if request was cancelled
        cancelled_request = self.reviewer_agent.completed_reviews[request.request_id]
        self.assertEqual(cancelled_request.status, ReviewStatus.CANCELLED)
        
        # Check if request was moved from pending to completed
        self.assertNotIn(request.request_id, self.reviewer_agent.pending_reviews)
        self.assertIn(request.request_id, self.reviewer_agent.completed_reviews)
        
        # Check if request was removed from queue
        self.assertNotIn(request.request_id, self.reviewer_agent.review_queue)
        
        # Check if Notion documentation was updated
        self.reviewer_agent.notion_client.pages.update.assert_called_once()
        self.reviewer_agent.notion_client.blocks.children.append.assert_called_once()
    
    async def test_handle_review_request(self):
        """Test handling a review request message."""
        # Create review request content
        content = {
            "title": "Message Review",
            "description": "Review from message",
            "content": {
                "plan": {"steps": ["Step 1", "Step 2"]},
                "strategic_goals": "Test goals"
            },
            "review_type": ReviewType.PRE_IMPLEMENTATION.value,
            "requester_id": "planner_1",
            "process_now": True
        }
        
        # Handle the request
        response = await self.reviewer_agent._handle_review_request(content)
        
        # Check response
        self.assertEqual(response["type"], "review_response")
        self.assertIn("request_id", response)
        self.assertEqual(response["status"], ReviewStatus.APPROVED.value)
        
        # Check if request was processed (due to process_now=True)
        self.assertIn(response["request_id"], self.reviewer_agent.completed_reviews)
    
    async def test_handle_review_status(self):
        """Test handling a review status message."""
        # Create and process a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={"plan": {"steps": ["Step 1"]}},
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1"
        )
        await self.reviewer_agent.process_next_review()
        
        # Create status request content
        content = {
            "request_id": request.request_id
        }
        
        # Handle the request
        response = await self.reviewer_agent._handle_review_status(content)
        
        # Check response
        self.assertEqual(response["type"], "review_status_response")
        self.assertEqual(response["request_id"], request.request_id)
        self.assertEqual(response["status"], request.status.value)
        self.assertEqual(response["approval"], request.approval)
        self.assertEqual(response["feedback_count"], len(request.feedback))
    
    async def test_handle_implementation_notification(self):
        """Test handling an implementation notification message."""
        # Create and process a review request
        request = await self.reviewer_agent.create_review_request(
            title="Test Review",
            description="Review test plan",
            content={"plan": {"steps": ["Step 1"]}},
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1"
        )
        await self.reviewer_agent.process_next_review()
        
        # Create implementation notification content
        content = {
            "request_id": request.request_id,
            "implementation_id": "impl_123",
            "verify_now": True
        }
        
        # Handle the notification
        response = await self.reviewer_agent._handle_implementation_notification(content)
        
        # Check response
        self.assertEqual(response["type"], "implementation_notification_response")
        self.assertEqual(response["request_id"], request.request_id)
        self.assertEqual(response["implementation_id"], "impl_123")
        self.assertEqual(response["status"], "recorded")
        self.assertIn("verification", response)
        
        # Check if implementation was recorded and verified
        updated_request = self.reviewer_agent.completed_reviews[request.request_id]
        self.assertEqual(updated_request.implementation_id, "impl_123")
        self.assertTrue(updated_request.implementation_verified)

class TestReviewRequest(unittest.TestCase):
    """Test cases for the ReviewRequest class."""
    
    def test_create_review_request(self):
        """Test creating a review request."""
        # Create a review request
        request = ReviewRequest(
            request_id="req_123",
            title="Test Review",
            description="Review test plan",
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1",
            status=ReviewStatus.PENDING,
            priority=2,
            content={"plan": {"steps": ["Step 1", "Step 2"]}}
        )
        
        # Check properties
        self.assertEqual(request.request_id, "req_123")
        self.assertEqual(request.title, "Test Review")
        self.assertEqual(request.description, "Review test plan")
        self.assertEqual(request.review_type, ReviewType.PRE_IMPLEMENTATION)
        self.assertEqual(request.requester_id, "planner_1")
        self.assertEqual(request.status, ReviewStatus.PENDING)
        self.assertEqual(request.priority, 2)
        self.assertEqual(request.content, {"plan": {"steps": ["Step 1", "Step 2"]}})
        self.assertFalse(request.approval)
        self.assertIsNone(request.reviewer_id)
        self.assertIsNone(request.review_started_at)
        self.assertIsNone(request.review_completed_at)
        self.assertEqual(request.feedback, [])
    
    def test_to_from_dict(self):
        """Test converting review request to and from dictionary."""
        # Create original request
        original = ReviewRequest(
            request_id="req_123",
            title="Test Review",
            description="Review test plan",
            review_type=ReviewType.PRE_IMPLEMENTATION,
            requester_id="planner_1",
            status=ReviewStatus.PENDING,
            priority=2,
            content={"plan": {"steps": ["Step 1", "Step 2"]}},
            reviewer_id="reviewer_1",
            feedback=[{"name": "Test", "feedback": "Good plan"}],
            approval=True,
            notion_page_id="page_123"
        )
        
        # Convert to dictionary
        request_dict = original.to_dict()
        
        # Convert back to review request
        converted = ReviewRequest.from_dict(request_dict)
        
        # Check properties match
        self.assertEqual(converted.request_id, original.request_id)
        self.assertEqual(converted.title, original.title)
        self.assertEqual(converted.description, original.description)
        self.assertEqual(converted.review_type, original.review_type)
        self.assertEqual(converted.requester_id, original.requester_id)
        self.assertEqual(converted.status, original.status)
        self.assertEqual(converted.priority, original.priority)
        self.assertEqual(converted.content, original.content)
        self.assertEqual(converted.reviewer_id, original.reviewer_id)
        self.assertEqual(converted.feedback, original.feedback)
        self.assertEqual(converted.approval, original.approval)
        self.assertEqual(converted.notion_page_id, original.notion_page_id)
    
    def test_update_status(self):
        """Test updating review request status."""
        # Create a review request
        request = ReviewRequest(
            request_id="req_123",
            title="Test Review",
            status=ReviewStatus.PENDING
        )
        
        # Update status to in_progress
        original_updated_at = request.updated_at
        request.update_status(ReviewStatus.IN_PROGRESS)
        
        # Check status and timestamps
        self.assertEqual(request.status, ReviewStatus.IN_PROGRESS)
        self.assertGreater(request.updated_at, original_updated_at)
        self.assertIsNotNone(request.review_started_at)
        
        # Update status to approved
        request.update_status(ReviewStatus.APPROVED)
        
        # Check status and timestamps
        self.assertEqual(request.status, ReviewStatus.APPROVED)
        self.assertIsNotNone(request.review_completed_at)
    
    def test_add_feedback(self):
        """Test adding feedback to a review request."""
        # Create a review request
        request = ReviewRequest(
            request_id="req_123",
            title="Test Review"
        )
        
        # Add feedback
        feedback_item = {
            "name": "Strategic Alignment",
            "description": "Check strategic alignment",
            "passed": True,
            "feedback": "Plan aligns with strategic goals"
        }
        original_updated_at = request.updated_at
        request.add_feedback(feedback_item)
        
        # Check feedback was added
        self.assertEqual(len(request.feedback), 1)
        self.assertEqual(request.feedback[0]["name"], "Strategic Alignment")
        self.assertEqual(request.feedback[0]["feedback"], "Plan aligns with strategic goals")
        self.assertIn("timestamp", request.feedback[0])
        self.assertGreater(request.updated_at, original_updated_at)
        
        # Add another feedback item
        request.add_feedback({
            "name": "Completeness",
            "passed": False,
            "feedback": "Missing implementation details"
        })
        
        # Check feedback count
        self.assertEqual(len(request.feedback), 2)

if __name__ == '__main__':
    unittest.main()