"""
Reviewer Agent: Implements the critical review protocol for the SecondBrain architecture.

This module provides the ReviewerAgent class, which enforces the mandatory review
process for all tasks within the SecondBrain system. It ensures that all implementations
are reviewed and approved before execution, and that the results are verified after
execution, providing quality assurance and consistency checks.
"""

import logging
import json
import uuid
import time
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple, Callable
from enum import Enum
from dataclasses import dataclass, field

from .agent_manager import Agent, AgentRole, AgentState, Message, MessagePriority
from .communication_protocol import MessageType, MessageBus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('reviewer_agent')

# Review statuses
class ReviewStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"
    CANCELLED = "cancelled"

# Review types
class ReviewType(str, Enum):
    PRE_IMPLEMENTATION = "pre_implementation"
    POST_IMPLEMENTATION = "post_implementation"
    STRATEGIC_ALIGNMENT = "strategic_alignment"
    CODE_QUALITY = "code_quality"
    SECURITY = "security"
    PERFORMANCE = "performance"

@dataclass
class ReviewRequest:
    """Request for a review of a task or implementation"""
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
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = {
            "request_id": self.request_id,
            "title": self.title,
            "description": self.description,
            "review_type": self.review_type.value,
            "requester_id": self.requester_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "status": self.status.value,
            "priority": self.priority,
            "content": self.content,
            "reviewer_id": self.reviewer_id,
            "review_started_at": self.review_started_at,
            "review_completed_at": self.review_completed_at,
            "feedback": self.feedback,
            "approval": self.approval,
            "implementation_id": self.implementation_id,
            "implemented_at": self.implemented_at,
            "implementation_verified": self.implementation_verified,
            "notion_page_id": self.notion_page_id,
            "slack_thread_id": self.slack_thread_id,
            "related_request_ids": self.related_request_ids,
        }
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ReviewRequest':
        """Create from dictionary representation"""
        # Convert string values to enums
        if "review_type" in data:
            data["review_type"] = ReviewType(data["review_type"])
        if "status" in data:
            data["status"] = ReviewStatus(data["status"])
        
        return cls(**data)
    
    def update_status(self, status: ReviewStatus) -> None:
        """Update the status of the review request"""
        self.status = status
        self.updated_at = time.time()
        
        if status == ReviewStatus.IN_PROGRESS and self.review_started_at is None:
            self.review_started_at = time.time()
        elif status in [ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.CHANGES_REQUESTED]:
            self.review_completed_at = time.time()
    
    def add_feedback(self, feedback_item: Dict[str, Any]) -> None:
        """Add a feedback item to the review"""
        if "timestamp" not in feedback_item:
            feedback_item["timestamp"] = time.time()
        self.feedback.append(feedback_item)
        self.updated_at = time.time()

class ReviewerAgent(Agent):
    """
    Implements the SecondBrain Reviewer Agent protocol.
    
    The Reviewer Agent is responsible for:
    1. Pre-implementation review of all tasks and plans
    2. Post-implementation verification of completed tasks
    3. Ensuring strategic alignment with project goals
    4. Maintaining quality standards and consistency
    5. Documenting all reviews in Notion for transparency
    """
    
    def __init__(
        self,
        agent_id: str,
        manager: 'AgentManager',
        config: Dict[str, Any] = None,
        message_bus: Optional[MessageBus] = None,
    ):
        super().__init__(agent_id, AgentRole.REVIEWER, manager, config)
        self.message_bus = message_bus
        self.pending_reviews: Dict[str, ReviewRequest] = {}
        self.completed_reviews: Dict[str, ReviewRequest] = {}
        self.review_queue: List[str] = []
        self.notion_client = None  # Will be initialized later
        
        # Review criteria handlers mapped by review type
        self.review_criteria_handlers: Dict[ReviewType, List[Callable]] = {
            ReviewType.PRE_IMPLEMENTATION: [],
            ReviewType.POST_IMPLEMENTATION: [],
            ReviewType.STRATEGIC_ALIGNMENT: [],
            ReviewType.CODE_QUALITY: [],
            ReviewType.SECURITY: [],
            ReviewType.PERFORMANCE: [],
        }
        
        # Register message handlers
        self._register_message_handlers()
    
    def _register_message_handlers(self) -> None:
        """Register handlers for message types"""
        self.register_message_handler("review_request", self._handle_review_request)
        self.register_message_handler("review_status", self._handle_review_status)
        self.register_message_handler("implementation_notification", self._handle_implementation_notification)
        self.register_message_handler("review_cancel", self._handle_review_cancel)
        
        # Register with message bus if available
        if self.message_bus:
            self.message_bus.register_handler(
                self.id, 
                MessageType.REVIEW_REQUEST,
                self._handle_review_request_message
            )
    
    async def initialize(self) -> bool:
        """Initialize the Reviewer Agent"""
        self.state = AgentState.INITIALIZING
        self.logger.info(f"Initializing Reviewer Agent {self.id}")
        
        try:
            # Initialize Notion client if configured
            if "notion" in self.config:
                await self._initialize_notion_client()
            
            # Initialize review criteria handlers
            await self._initialize_review_criteria()
            
            # Subscribe to message types
            if self.message_bus:
                self.message_bus.subscribe(self.id, [
                    MessageType.REVIEW_REQUEST,
                    MessageType.TASK_STATUS,
                ])
            
            self.state = AgentState.IDLE
            self.logger.info(f"Reviewer Agent {self.id} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Reviewer Agent: {str(e)}")
            self.state = AgentState.ERROR
            return False
    
    async def _initialize_notion_client(self) -> None:
        """Initialize the Notion client for documentation"""
        try:
            from notion_client import AsyncClient
            
            notion_config = self.config.get("notion", {})
            api_key = notion_config.get("api_key")
            
            if not api_key:
                self.logger.warning("No Notion API key provided, Notion integration disabled")
                return
                
            self.notion_client = AsyncClient(auth=api_key)
            self.logger.info("Notion client initialized successfully")
            
        except ImportError:
            self.logger.warning("notion_client package not installed, Notion integration disabled")
            
        except Exception as e:
            self.logger.error(f"Error initializing Notion client: {str(e)}")
            raise
    
    async def _initialize_review_criteria(self) -> None:
        """Initialize review criteria handlers for different review types"""
        # Register default criteria handlers
        self.review_criteria_handlers[ReviewType.PRE_IMPLEMENTATION].append(self._check_strategic_alignment)
        self.review_criteria_handlers[ReviewType.PRE_IMPLEMENTATION].append(self._check_completeness)
        self.review_criteria_handlers[ReviewType.PRE_IMPLEMENTATION].append(self._check_feasibility)
        
        self.review_criteria_handlers[ReviewType.POST_IMPLEMENTATION].append(self._verify_implementation)
        self.review_criteria_handlers[ReviewType.POST_IMPLEMENTATION].append(self._check_quality)
        
        self.review_criteria_handlers[ReviewType.STRATEGIC_ALIGNMENT].append(self._check_strategic_alignment)
        
        self.review_criteria_handlers[ReviewType.CODE_QUALITY].append(self._check_code_quality)
        
        self.review_criteria_handlers[ReviewType.SECURITY].append(self._check_security)
        
        self.review_criteria_handlers[ReviewType.PERFORMANCE].append(self._check_performance)
        
        # Load custom criteria from config if available
        custom_criteria = self.config.get("review_criteria", {})
        for review_type_str, criteria_list in custom_criteria.items():
            try:
                review_type = ReviewType(review_type_str)
                for criterion in criteria_list:
                    if "name" in criterion and "prompt" in criterion:
                        self.review_criteria_handlers[review_type].append(
                            lambda content, criterion=criterion: self._check_custom_criterion(content, criterion)
                        )
            except (ValueError, KeyError) as e:
                self.logger.error(f"Error loading custom criteria for {review_type_str}: {str(e)}")
    
    async def create_review_request(
        self,
        title: str,
        description: str,
        content: Dict[str, Any],
        review_type: ReviewType = ReviewType.PRE_IMPLEMENTATION,
        requester_id: str = "",
        priority: int = 1,
    ) -> ReviewRequest:
        """Create a new review request"""
        request = ReviewRequest(
            title=title,
            description=description,
            review_type=review_type,
            requester_id=requester_id or "unknown",
            content=content,
            priority=priority
        )
        
        # Add to pending reviews and queue
        self.pending_reviews[request.request_id] = request
        self.review_queue.append(request.request_id)
        
        # Sort queue by priority
        self.review_queue.sort(
            key=lambda req_id: self.pending_reviews[req_id].priority,
            reverse=True
        )
        
        self.logger.info(f"Created review request {request.request_id}: {title}")
        
        # Document in Notion if client is available
        if self.notion_client:
            await self._document_review_request(request)
        
        return request
    
    async def _document_review_request(self, request: ReviewRequest) -> None:
        """Document a review request in Notion"""
        if not self.notion_client:
            return
            
        try:
            notion_config = self.config.get("notion", {})
            database_id = notion_config.get("review_database_id")
            
            if not database_id:
                self.logger.warning("No Notion database ID configured for reviews")
                return
                
            # Create a page in the reviews database
            page = await self.notion_client.pages.create(
                parent={"database_id": database_id},
                properties={
                    "Title": {
                        "title": [
                            {
                                "text": {
                                    "content": request.title
                                }
                            }
                        ]
                    },
                    "Status": {
                        "select": {
                            "name": request.status.value.title()
                        }
                    },
                    "Review Type": {
                        "select": {
                            "name": request.review_type.value.replace("_", " ").title()
                        }
                    },
                    "Requester": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": request.requester_id
                                }
                            }
                        ]
                    },
                    "Created": {
                        "date": {
                            "start": time.strftime("%Y-%m-%d", time.localtime(request.created_at))
                        }
                    },
                    "Priority": {
                        "number": request.priority
                    }
                },
                children=[
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Description"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": request.description
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Content to Review"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "code",
                        "code": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": json.dumps(request.content, indent=2)
                                    }
                                }
                            ],
                            "language": "json"
                        }
                    }
                ]
            )
            
            # Update the request with the Notion page ID
            request.notion_page_id = page.id
            self.logger.info(f"Documented review request {request.request_id} in Notion page {page.id}")
            
        except Exception as e:
            self.logger.error(f"Error documenting review request in Notion: {str(e)}")
    
    async def process_next_review(self) -> Optional[ReviewRequest]:
        """Process the next review in the queue"""
        if not self.review_queue:
            self.logger.info("No reviews in queue")
            return None
            
        # Get the next review request
        request_id = self.review_queue.pop(0)
        if request_id not in self.pending_reviews:
            self.logger.warning(f"Review request {request_id} not found in pending reviews")
            return None
            
        request = self.pending_reviews[request_id]
        self.logger.info(f"Processing review request {request_id}: {request.title}")
        
        # Update status
        request.update_status(ReviewStatus.IN_PROGRESS)
        request.reviewer_id = self.id
        
        # Apply review criteria based on review type
        feedback = []
        approval = True
        
        handlers = self.review_criteria_handlers.get(request.review_type, [])
        for handler in handlers:
            result = await handler(request.content)
            feedback.append(result)
            
            # If any criterion fails, the review is not approved
            if not result.get("passed", True):
                approval = False
        
        # Update request with results
        for item in feedback:
            request.add_feedback(item)
        
        request.approval = approval
        request.update_status(
            ReviewStatus.APPROVED if approval else ReviewStatus.CHANGES_REQUESTED
        )
        
        # Move to completed reviews
        del self.pending_reviews[request_id]
        self.completed_reviews[request_id] = request
        
        # Update Notion documentation
        if self.notion_client and request.notion_page_id:
            await self._update_review_documentation(request)
        
        self.logger.info(
            f"Completed review {request_id} with status: {request.status.value}"
        )
        
        return request
    
    async def _update_review_documentation(self, request: ReviewRequest) -> None:
        """Update the Notion documentation for a review request"""
        if not self.notion_client or not request.notion_page_id:
            return
            
        try:
            # Update the page properties
            await self.notion_client.pages.update(
                page_id=request.notion_page_id,
                properties={
                    "Status": {
                        "select": {
                            "name": request.status.value.title()
                        }
                    },
                    "Reviewer": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": request.reviewer_id or "Unknown"
                                }
                            }
                        ]
                    },
                    "Reviewed": {
                        "date": {
                            "start": time.strftime("%Y-%m-%d", time.localtime(request.review_completed_at or time.time()))
                        }
                    },
                    "Approved": {
                        "checkbox": request.approval
                    }
                }
            )
            
            # Add feedback as children blocks
            children = [
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Review Feedback"
                                }
                            }
                        ]
                    }
                }
            ]
            
            for i, feedback in enumerate(request.feedback):
                children.extend([
                    {
                        "object": "block",
                        "type": "heading_3",
                        "heading_3": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": f"Criterion {i+1}: {feedback.get('name', 'Unnamed')}"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": feedback.get('description', 'No description')
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "callout",
                        "callout": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": feedback.get('feedback', 'No feedback provided')
                                    }
                                }
                            ],
                            "icon": {
                                "type": "emoji",
                                "emoji": "✅" if feedback.get('passed', True) else "❌"
                            }
                        }
                    }
                ])
            
            # Add summary block
            children.extend([
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Summary"
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "callout",
                    "callout": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Review Approved ✓" if request.approval else "Changes Requested ✗"
                                }
                            }
                        ],
                        "icon": {
                            "type": "emoji",
                            "emoji": "✅" if request.approval else "❌"
                        }
                    }
                }
            ])
            
            # Append the blocks to the page
            await self.notion_client.blocks.children.append(
                block_id=request.notion_page_id,
                children=children
            )
            
            self.logger.info(f"Updated review documentation in Notion for request {request.request_id}")
            
        except Exception as e:
            self.logger.error(f"Error updating review documentation in Notion: {str(e)}")
    
    async def get_review_status(self, request_id: str) -> Optional[ReviewRequest]:
        """Get the status of a review request"""
        if request_id in self.pending_reviews:
            return self.pending_reviews[request_id]
        elif request_id in self.completed_reviews:
            return self.completed_reviews[request_id]
        else:
            self.logger.warning(f"Review request {request_id} not found")
            return None
    
    async def notify_implementation(
        self, 
        request_id: str, 
        implementation_id: str
    ) -> Optional[ReviewRequest]:
        """Notify that a reviewed request has been implemented"""
        request = None
        
        if request_id in self.completed_reviews:
            request = self.completed_reviews[request_id]
        else:
            self.logger.warning(f"Review request {request_id} not found in completed reviews")
            return None
            
        if not request.approval:
            self.logger.warning(f"Implementation of unapproved review {request_id}")
            
        # Update implementation info
        request.implementation_id = implementation_id
        request.implemented_at = time.time()
        request.implementation_verified = False
        request.updated_at = time.time()
        
        self.logger.info(f"Recorded implementation {implementation_id} for review {request_id}")
        
        # Update Notion documentation
        if self.notion_client and request.notion_page_id:
            await self._update_implementation_documentation(request)
            
        return request
    
    async def _update_implementation_documentation(self, request: ReviewRequest) -> None:
        """Update the Notion documentation with implementation details"""
        if not self.notion_client or not request.notion_page_id:
            return
            
        try:
            # Update the page properties
            await self.notion_client.pages.update(
                page_id=request.notion_page_id,
                properties={
                    "Implementation ID": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": request.implementation_id or "Unknown"
                                }
                            }
                        ]
                    },
                    "Implemented": {
                        "date": {
                            "start": time.strftime("%Y-%m-%d", time.localtime(request.implemented_at or time.time()))
                        }
                    },
                    "Verified": {
                        "checkbox": request.implementation_verified
                    }
                }
            )
            
            # Add implementation block
            await self.notion_client.blocks.children.append(
                block_id=request.notion_page_id,
                children=[
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Implementation"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": f"Implementation ID: {request.implementation_id}"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": f"Implemented at: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(request.implemented_at or time.time()))}"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Implementation verification pending."
                                    }
                                }
                            ]
                        }
                    }
                ]
            )
            
            self.logger.info(f"Updated implementation documentation in Notion for request {request.request_id}")
            
        except Exception as e:
            self.logger.error(f"Error updating implementation documentation in Notion: {str(e)}")
    
    async def verify_implementation(
        self, 
        request_id: str,
        verification_result: bool,
        verification_notes: str = ""
    ) -> Optional[ReviewRequest]:
        """Verify that an implementation matches the approved review"""
        if request_id not in self.completed_reviews:
            self.logger.warning(f"Review request {request_id} not found in completed reviews")
            return None
            
        request = self.completed_reviews[request_id]
        
        if not request.implementation_id:
            self.logger.warning(f"No implementation recorded for review {request_id}")
            return request
            
        # Update verification info
        request.implementation_verified = verification_result
        request.updated_at = time.time()
        
        # Add verification feedback
        request.add_feedback({
            "name": "Implementation Verification",
            "description": "Verify that the implementation matches the approved review",
            "passed": verification_result,
            "feedback": verification_notes,
            "timestamp": time.time()
        })
        
        self.logger.info(
            f"Verified implementation for review {request_id}: {'passed' if verification_result else 'failed'}"
        )
        
        # Update Notion documentation
        if self.notion_client and request.notion_page_id:
            await self._update_verification_documentation(request, verification_notes)
            
        return request
    
    async def _update_verification_documentation(
        self, 
        request: ReviewRequest,
        verification_notes: str
    ) -> None:
        """Update the Notion documentation with verification details"""
        if not self.notion_client or not request.notion_page_id:
            return
            
        try:
            # Update the page properties
            await self.notion_client.pages.update(
                page_id=request.notion_page_id,
                properties={
                    "Verified": {
                        "checkbox": request.implementation_verified
                    }
                }
            )
            
            # Add verification block
            await self.notion_client.blocks.children.append(
                block_id=request.notion_page_id,
                children=[
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Implementation Verification"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "callout",
                        "callout": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Implementation Verified ✓" if request.implementation_verified else "Implementation Verification Failed ✗"
                                    }
                                }
                            ],
                            "icon": {
                                "type": "emoji",
                                "emoji": "✅" if request.implementation_verified else "❌"
                            }
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": verification_notes or "No verification notes provided."
                                    }
                                }
                            ]
                        }
                    }
                ]
            )
            
            self.logger.info(f"Updated verification documentation in Notion for request {request.request_id}")
            
        except Exception as e:
            self.logger.error(f"Error updating verification documentation in Notion: {str(e)}")
    
    async def cancel_review(self, request_id: str, reason: str = "") -> None:
        """Cancel a pending review request"""
        if request_id not in self.pending_reviews:
            self.logger.warning(f"Review request {request_id} not found in pending reviews")
            return
            
        request = self.pending_reviews[request_id]
        request.update_status(ReviewStatus.CANCELLED)
        
        # Remove from queue if present
        if request_id in self.review_queue:
            self.review_queue.remove(request_id)
            
        # Move to completed reviews
        del self.pending_reviews[request_id]
        self.completed_reviews[request_id] = request
        
        self.logger.info(f"Cancelled review request {request_id}: {reason}")
        
        # Update Notion documentation
        if self.notion_client and request.notion_page_id:
            await self._update_cancellation_documentation(request, reason)
    
    async def _update_cancellation_documentation(
        self, 
        request: ReviewRequest,
        reason: str
    ) -> None:
        """Update the Notion documentation with cancellation details"""
        if not self.notion_client or not request.notion_page_id:
            return
            
        try:
            # Update the page properties
            await self.notion_client.pages.update(
                page_id=request.notion_page_id,
                properties={
                    "Status": {
                        "select": {
                            "name": "Cancelled"
                        }
                    }
                }
            )
            
            # Add cancellation block
            await self.notion_client.blocks.children.append(
                block_id=request.notion_page_id,
                children=[
                    {
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Cancellation"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "callout",
                        "callout": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "Review Cancelled"
                                    }
                                }
                            ],
                            "icon": {
                                "type": "emoji",
                                "emoji": "🚫"
                            }
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": reason or "No cancellation reason provided."
                                    }
                                }
                            ]
                        }
                    }
                ]
            )
            
            self.logger.info(f"Updated cancellation documentation in Notion for request {request.request_id}")
            
        except Exception as e:
            self.logger.error(f"Error updating cancellation documentation in Notion: {str(e)}")
    
    # Message handlers
    
    async def _handle_review_request(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a review request message"""
        try:
            # Extract request details
            title = content.get("title", "Untitled Review")
            description = content.get("description", "")
            review_content = content.get("content", {})
            review_type_str = content.get("review_type", ReviewType.PRE_IMPLEMENTATION.value)
            requester_id = content.get("requester_id", "")
            priority = content.get("priority", 1)
            
            # Create review request
            try:
                review_type = ReviewType(review_type_str)
            except ValueError:
                self.logger.warning(f"Invalid review type: {review_type_str}, using default")
                review_type = ReviewType.PRE_IMPLEMENTATION
                
            request = await self.create_review_request(
                title=title,
                description=description,
                content=review_content,
                review_type=review_type,
                requester_id=requester_id,
                priority=priority
            )
            
            # Process the review immediately if requested
            if content.get("process_now", False):
                request = await self.process_next_review()
                
            return {
                "type": "review_response",
                "request_id": request.request_id,
                "status": request.status.value,
                "message": f"Review request created: {request.request_id}"
            }
            
        except Exception as e:
            self.logger.error(f"Error handling review request: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_review_status(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a review status request"""
        try:
            request_id = content.get("request_id")
            if not request_id:
                return {
                    "type": "error",
                    "error": "No request_id provided",
                    "error_type": "ValueError"
                }
                
            request = await self.get_review_status(request_id)
            if not request:
                return {
                    "type": "error",
                    "error": f"Review request {request_id} not found",
                    "error_type": "ValueError"
                }
                
            return {
                "type": "review_status_response",
                "request_id": request_id,
                "status": request.status.value,
                "reviewer_id": request.reviewer_id,
                "approval": request.approval,
                "feedback_count": len(request.feedback),
                "implementation_id": request.implementation_id,
                "implementation_verified": request.implementation_verified
            }
            
        except Exception as e:
            self.logger.error(f"Error handling review status request: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_implementation_notification(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle an implementation notification"""
        try:
            request_id = content.get("request_id")
            implementation_id = content.get("implementation_id")
            
            if not request_id or not implementation_id:
                return {
                    "type": "error",
                    "error": "request_id and implementation_id are required",
                    "error_type": "ValueError"
                }
                
            request = await self.notify_implementation(request_id, implementation_id)
            if not request:
                return {
                    "type": "error",
                    "error": f"Review request {request_id} not found",
                    "error_type": "ValueError"
                }
                
            # Verify implementation if requested
            verification_result = None
            if content.get("verify_now", False):
                verification_result = await self._verify_implementation(request.content)
                await self.verify_implementation(
                    request_id,
                    verification_result.get("passed", False),
                    verification_result.get("feedback", "")
                )
                
            return {
                "type": "implementation_notification_response",
                "request_id": request_id,
                "implementation_id": implementation_id,
                "status": "recorded",
                "verification": verification_result
            }
            
        except Exception as e:
            self.logger.error(f"Error handling implementation notification: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_review_cancel(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a review cancellation request"""
        try:
            request_id = content.get("request_id")
            reason = content.get("reason", "")
            
            if not request_id:
                return {
                    "type": "error",
                    "error": "request_id is required",
                    "error_type": "ValueError"
                }
                
            await self.cancel_review(request_id, reason)
            
            return {
                "type": "review_cancel_response",
                "request_id": request_id,
                "status": "cancelled",
                "message": f"Review request {request_id} cancelled"
            }
            
        except Exception as e:
            self.logger.error(f"Error handling review cancellation: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _handle_review_request_message(self, message: "Message") -> Dict[str, Any]:
        """Handle a review request message from the message bus"""
        self.logger.info(f"Received review request message: {message.id}")
        
        try:
            content = message.content
            result = await self._handle_review_request(content)
            return result
        except Exception as e:
            self.logger.error(f"Error handling review request message: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    # Review criteria handlers
    
    async def _check_strategic_alignment(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Check if the content aligns with strategic goals"""
        # In a real implementation, this would use an LLM or other logic
        # For this example, we'll just check for a "strategy" field
        
        has_strategy = "strategy" in content or "strategic_goals" in content
        alignment_description = content.get("strategy", content.get("strategic_goals", ""))
        
        return {
            "name": "Strategic Alignment",
            "description": "Check if the content aligns with strategic goals",
            "passed": has_strategy,
            "feedback": (
                f"Strategic alignment confirmed: {alignment_description}" if has_strategy
                else "No strategy or strategic goals specified. Please include strategic context."
            ),
            "timestamp": time.time()
        }
    
    async def _check_completeness(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Check if the content is complete"""
        # In a real implementation, this would use an LLM or other logic
        # For this example, we'll check for required fields
        required_fields = ["title", "description", "steps"]
        missing_fields = [field for field in required_fields if field not in content]
        
        return {
            "name": "Completeness Check",
            "description": "Check if all required information is provided",
            "passed": len(missing_fields) == 0,
            "feedback": (
                "All required fields present." if len(missing_fields) == 0
                else f"Missing required fields: {', '.join(missing_fields)}"
            ),
            "timestamp": time.time()
        }
    
    async def _check_feasibility(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Check if the content is feasible to implement"""
        # In a real implementation, this would use an LLM or other logic
        # For this example, we'll check for a "feasibility" field
        has_feasibility = "feasibility" in content or "feasibility_assessment" in content
        feasibility_rating = content.get("feasibility", content.get("feasibility_assessment", 0))
        
        if isinstance(feasibility_rating, str):
            try:
                feasibility_rating = float(feasibility_rating)
            except ValueError:
                feasibility_rating = 0
        
        return {
            "name": "Feasibility Assessment",
            "description": "Check if the proposal is feasible to implement",
            "passed": has_feasibility and feasibility_rating >= 0.7,
            "feedback": (
                f"Feasibility confirmed with rating {feasibility_rating}" if has_feasibility and feasibility_rating >= 0.7
                else "Feasibility concerns or no feasibility assessment provided."
            ),
            "timestamp": time.time()
        }
    
    async def _verify_implementation(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Verify an implementation"""
        # In a real implementation, this would use an LLM or other logic
        # For this example, we'll check for an "implemented" field
        implemented = content.get("implemented", False)
        implementation_details = content.get("implementation_details", "")
        
        return {
            "name": "Implementation Verification",
            "description": "Verify that the implementation matches the approved plan",
            "passed": implemented,
            "feedback": (
                f"Implementation verified: {implementation_details}" if implemented
                else "Implementation not confirmed or details missing."
            ),
            "timestamp": time.time()
        }
    
    async def _check_quality(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Check the quality of the implementation"""
        # In a real implementation, this would use an LLM or other logic
        # For this example, we'll check for a "quality" field
        quality_score = content.get("quality_score", 0)
        quality_notes = content.get("quality_notes", "")
        
        if isinstance(quality_score, str):
            try:
                quality_score = float(quality_score)
            except ValueError:
                quality_score = 0
        
        return {
            "name": "Quality Assessment",
            "description": "Assess the quality of the implementation",
            "passed": quality_score >= 0.8,
            "feedback": (
                f"Quality meets standards ({quality_score}): {quality_notes}" if quality_score >= 0.8
                else f"Quality below standards ({quality_score}): {quality_notes or 'No quality notes provided.'}"
            ),
            "timestamp": time.time()
        }
    
    async def _check_code_quality(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Check code quality"""
        # In a real implementation, this would use static analysis tools
        code = content.get("code", "")
        if not code:
            return {
                "name": "Code Quality",
                "description": "Assess code quality using static analysis",
                "passed": False,
                "feedback": "No code provided for analysis.",
                "timestamp": time.time()
            }
        
        # Example checks (very simplified)
        issues = []
        
        # Check line length
        long_lines = [i+1 for i, line in enumerate(code.split("\n")) if len(line) > 100]
        if long_lines:
            issues.append(f"Lines exceeding 100 characters: {long_lines[:5]}")
        
        # Check for TODO comments
        if "TODO" in code or "FIXME" in code:
            issues.append("TODO or FIXME comments found in code")
            
        return {
            "name": "Code Quality",
            "description": "Assess code quality using static analysis",
            "passed": len(issues) == 0,
            "feedback": (
                "Code quality checks passed." if len(issues) == 0
                else f"Code quality issues found: {'; '.join(issues)}"
            ),
            "timestamp": time.time()
        }
    
    async def _check_security(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Check for security issues"""
        # In a real implementation, this would use security scanning tools
        code = content.get("code", "")
        security_scan = content.get("security_scan", {})
        
        if security_scan:
            passed = security_scan.get("passed", False)
            issues = security_scan.get("issues", [])
            
            return {
                "name": "Security Assessment",
                "description": "Check for security vulnerabilities",
                "passed": passed,
                "feedback": (
                    "Security scan passed." if passed
                    else f"Security issues found: {'; '.join(issues[:5])}"
                ),
                "timestamp": time.time()
            }
        
        if not code:
            return {
                "name": "Security Assessment",
                "description": "Check for security vulnerabilities",
                "passed": True,
                "feedback": "No code to scan for security issues.",
                "timestamp": time.time()
            }
        
        # Example checks (very simplified)
        issues = []
        
        # Check for hardcoded secrets
        if "password" in code.lower() or "secret" in code.lower() or "api_key" in code.lower():
            issues.append("Potential hardcoded secrets found")
            
        # Check for SQL injection vulnerabilities
        if "sql" in code.lower() and "%" in code and "'" in code:
            issues.append("Potential SQL injection vulnerability")
            
        return {
            "name": "Security Assessment",
            "description": "Check for security vulnerabilities",
            "passed": len(issues) == 0,
            "feedback": (
                "No obvious security issues found." if len(issues) == 0
                else f"Security concerns: {'; '.join(issues)}"
            ),
            "timestamp": time.time()
        }
    
    async def _check_performance(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Check for performance issues"""
        # In a real implementation, this would use performance analysis tools
        performance_metrics = content.get("performance_metrics", {})
        
        if performance_metrics:
            passed = performance_metrics.get("passed", False)
            issues = performance_metrics.get("issues", [])
            
            return {
                "name": "Performance Assessment",
                "description": "Analyze performance characteristics",
                "passed": passed,
                "feedback": (
                    "Performance metrics within acceptable ranges." if passed
                    else f"Performance concerns: {'; '.join(issues[:5])}"
                ),
                "timestamp": time.time()
            }
        
        # Default response if no metrics provided
        return {
            "name": "Performance Assessment",
            "description": "Analyze performance characteristics",
            "passed": True,
            "feedback": "No performance metrics provided for analysis.",
            "timestamp": time.time()
        }
    
    async def _check_custom_criterion(
        self, 
        content: Dict[str, Any],
        criterion: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check a custom criterion using an LLM"""
        # In a real implementation, this would use an LLM
        name = criterion.get("name", "Custom Criterion")
        prompt = criterion.get("prompt", "")
        
        # Here we'd call an LLM with the prompt and content
        # For this example, we'll just return a placeholder result
        return {
            "name": name,
            "description": prompt[:100] + "..." if len(prompt) > 100 else prompt,
            "passed": True,  # In a real implementation, this would be determined by the LLM
            "feedback": f"Custom criterion '{name}' evaluated (LLM integration placeholder).",
            "timestamp": time.time()
        }