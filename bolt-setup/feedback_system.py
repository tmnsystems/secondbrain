"""
Human-in-the-loop feedback system for SecondBrain.

This module provides a feedback collection and recommendation system
that allows humans to review and approve AI-generated content.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Literal
from enum import Enum
from pydantic import BaseModel, Field

class FeedbackType(str, Enum):
    STYLE = "style"
    CONTENT = "content"
    ACCURACY = "accuracy"
    TONE = "tone"
    STRUCTURE = "structure"
    OTHER = "other"

class FeedbackRating(int, Enum):
    POOR = 1
    NEEDS_IMPROVEMENT = 2
    ACCEPTABLE = 3
    GOOD = 4
    EXCELLENT = 5

class FeedbackStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"

class ContentType(str, Enum):
    ARTICLE = "article"
    EMAIL = "email"
    SOCIAL_POST = "social_post"
    COACHING_ADVICE = "coaching_advice"
    TRANSCRIPT_ANALYSIS = "transcript_analysis"
    OTHER = "other"

class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: f"fb_{int(time.time())}")
    content_id: str
    content_type: ContentType
    feedback_type: FeedbackType
    rating: FeedbackRating
    comments: str = ""
    suggestions: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ContentChange(BaseModel):
    id: str = Field(default_factory=lambda: f"chg_{int(time.time())}")
    content_id: str
    original_text: str
    new_text: str
    reason: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ContentMetadata(BaseModel):
    id: str
    type: ContentType
    title: str
    created_at: str
    model_used: str
    prompt: Optional[str] = None
    context: Optional[str] = None
    tags: List[str] = []

class ContentStatus(BaseModel):
    id: str
    status: FeedbackStatus
    version: int = 1
    last_updated: str = Field(default_factory=lambda: datetime.now().isoformat())
    approved_by: Optional[str] = None
    approval_date: Optional[str] = None
    rejection_reason: Optional[str] = None

class ContentWithFeedback(BaseModel):
    content: str
    metadata: ContentMetadata
    status: ContentStatus
    feedback: List[Feedback] = []
    changes: List[ContentChange] = []

class FeedbackRequest(BaseModel):
    content_id: str
    content_type: ContentType
    content_sample: str
    content_source: str
    current_settings: Dict[str, Any]
    session_id: str
    requested_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class FeedbackResponse(BaseModel):
    request_id: str
    content_id: str
    feedback_items: List[Feedback]
    approved: bool
    approval_notes: Optional[str] = None
    responded_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ModelAdjustment(BaseModel):
    id: str = Field(default_factory=lambda: f"adj_{int(time.time())}")
    parameter: str
    old_value: Any
    new_value: Any
    reason: str
    impact: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class AdjustmentRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: f"rec_{int(time.time())}")
    content_id: str
    feedback_ids: List[str]
    adjustments: List[ModelAdjustment]
    recommendation_text: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ApprovalRequest(BaseModel):
    recommendations: List[AdjustmentRecommendation]
    session_id: str
    requested_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ApprovalResponse(BaseModel):
    request_id: str
    approved_adjustments: List[str]
    rejected_adjustments: List[str]
    notes: Optional[str] = None
    responded_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# Storage for feedback, content, and adjustments
class FeedbackStorage:
    def __init__(self, base_dir: str = "./feedback_data"):
        self.base_dir = base_dir
        self.content_dir = os.path.join(base_dir, "content")
        self.feedback_dir = os.path.join(base_dir, "feedback")
        self.recommendations_dir = os.path.join(base_dir, "recommendations")
        
        # Create directories if they don't exist
        os.makedirs(self.content_dir, exist_ok=True)
        os.makedirs(self.feedback_dir, exist_ok=True)
        os.makedirs(self.recommendations_dir, exist_ok=True)
    
    def save_content(self, content: ContentWithFeedback) -> bool:
        """Save content to storage."""
        try:
            file_path = os.path.join(self.content_dir, f"{content.metadata.id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(content.dict(), f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving content: {str(e)}")
            return False
    
    def get_content(self, content_id: str) -> Optional[ContentWithFeedback]:
        """Get content from storage."""
        try:
            file_path = os.path.join(self.content_dir, f"{content_id}.json")
            if not os.path.exists(file_path):
                return None
                
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return ContentWithFeedback.parse_obj(data)
        except Exception as e:
            print(f"Error getting content: {str(e)}")
            return None
    
    def save_feedback(self, feedback: Feedback) -> bool:
        """Save feedback to storage."""
        try:
            file_path = os.path.join(self.feedback_dir, f"{feedback.id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(feedback.dict(), f, indent=2)
            
            # Update the content with the feedback
            content = self.get_content(feedback.content_id)
            if content:
                # Add feedback to content
                content.feedback.append(feedback)
                # Update the content
                self.save_content(content)
            
            return True
        except Exception as e:
            print(f"Error saving feedback: {str(e)}")
            return False
    
    def save_recommendation(self, recommendation: AdjustmentRecommendation) -> bool:
        """Save recommendation to storage."""
        try:
            file_path = os.path.join(self.recommendations_dir, f"{recommendation.id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(recommendation.dict(), f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving recommendation: {str(e)}")
            return False
    
    def get_recommendation(self, recommendation_id: str) -> Optional[AdjustmentRecommendation]:
        """Get recommendation from storage."""
        try:
            file_path = os.path.join(self.recommendations_dir, f"{recommendation_id}.json")
            if not os.path.exists(file_path):
                return None
                
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return AdjustmentRecommendation.parse_obj(data)
        except Exception as e:
            print(f"Error getting recommendation: {str(e)}")
            return None
    
    def update_content_status(self, content_id: str, status: FeedbackStatus, 
                             approved_by: Optional[str] = None,
                             rejection_reason: Optional[str] = None) -> bool:
        """Update content status."""
        try:
            content = self.get_content(content_id)
            if not content:
                return False
            
            # Update status
            content.status.status = status
            content.status.version += 1
            content.status.last_updated = datetime.now().isoformat()
            
            if status == FeedbackStatus.APPROVED and approved_by:
                content.status.approved_by = approved_by
                content.status.approval_date = datetime.now().isoformat()
            
            if status == FeedbackStatus.REJECTED and rejection_reason:
                content.status.rejection_reason = rejection_reason
            
            # Save updated content
            return self.save_content(content)
        except Exception as e:
            print(f"Error updating content status: {str(e)}")
            return False

# Function to generate adjustment recommendations based on feedback
def generate_adjustment_recommendations(feedback_response: FeedbackResponse, 
                                       content: ContentWithFeedback,
                                       current_settings: Dict[str, Any]) -> AdjustmentRecommendation:
    """Generate adjustment recommendations based on feedback."""
    # This is a placeholder function that would be implemented with an LLM in production
    
    # Example recommendation logic
    adjustments = []
    
    # Check feedback ratings
    low_ratings = [fb for fb in feedback_response.feedback_items if fb.rating <= FeedbackRating.NEEDS_IMPROVEMENT]
    
    if any(fb.feedback_type == FeedbackType.STYLE for fb in low_ratings):
        # Recommend style adjustment
        adjustments.append(ModelAdjustment(
            parameter="style_emphasis",
            old_value=current_settings.get("style_emphasis", 0.5),
            new_value=min(current_settings.get("style_emphasis", 0.5) + 0.2, 1.0),
            reason="Low ratings for style suggest increasing style emphasis",
            impact="Content will more closely match the coach's distinctive style"
        ))
    
    if any(fb.feedback_type == FeedbackType.TONE for fb in low_ratings):
        # Recommend tone adjustment
        adjustments.append(ModelAdjustment(
            parameter="formality",
            old_value=current_settings.get("formality", 0.5),
            new_value=max(current_settings.get("formality", 0.5) - 0.1, 0.0),
            reason="Low ratings for tone suggest reducing formality",
            impact="Content will have a more conversational, approachable tone"
        ))
    
    # Create recommendation
    recommendation = AdjustmentRecommendation(
        content_id=content.metadata.id,
        feedback_ids=[fb.id for fb in feedback_response.feedback_items],
        adjustments=adjustments,
        recommendation_text=f"Based on your feedback, we recommend {len(adjustments)} adjustments to improve future content generation."
    )
    
    return recommendation

# Main feedback workflow functions
def process_content_with_feedback_loop(content: str, 
                                      content_type: ContentType,
                                      title: str,
                                      model: str,
                                      prompt: Optional[str] = None,
                                      context: Optional[str] = None,
                                      initial_settings: Dict[str, Any] = None) -> Dict[str, Any]:
    """Process content with a human-in-the-loop feedback system."""
    # Initialize storage
    storage = FeedbackStorage()
    
    # Create content metadata
    content_id = f"content_{int(time.time())}"
    metadata = ContentMetadata(
        id=content_id,
        type=content_type,
        title=title,
        created_at=datetime.now().isoformat(),
        model_used=model,
        prompt=prompt,
        context=context,
        tags=[]
    )
    
    # Create content status
    status = ContentStatus(
        id=content_id,
        status=FeedbackStatus.PENDING
    )
    
    # Create content object
    content_obj = ContentWithFeedback(
        content=content,
        metadata=metadata,
        status=status
    )
    
    # Save content
    storage.save_content(content_obj)
    
    # Create feedback request
    session_id = f"session_{int(time.time())}"
    request = FeedbackRequest(
        content_id=content_id,
        content_type=content_type,
        content_sample=content[:500] + ("..." if len(content) > 500 else ""),
        content_source="initial_processing",
        current_settings=initial_settings or {},
        session_id=session_id
    )
    
    # In a real implementation, this would trigger a notification or UI update
    # For now, we'll simulate the response
    
    # Simulate feedback response (would come from a human in reality)
    feedback_items = [
        Feedback(
            id=f"fb_{int(time.time())}_1",
            content_id=content_id,
            content_type=content_type,
            feedback_type=FeedbackType.STYLE,
            rating=FeedbackRating.GOOD,
            comments="The style is close but could use more of my signature analogies."
        ),
        Feedback(
            id=f"fb_{int(time.time())}_2",
            content_id=content_id,
            content_type=content_type,
            feedback_type=FeedbackType.TONE,
            rating=FeedbackRating.EXCELLENT,
            comments="The tone is spot on, very conversational and approachable."
        )
    ]
    
    response = FeedbackResponse(
        request_id=f"req_{int(time.time())}",
        content_id=content_id,
        feedback_items=feedback_items,
        approved=True,
        approval_notes="Good first draft, just needs minor style adjustments."
    )
    
    # Save feedback
    for feedback in feedback_items:
        storage.save_feedback(feedback)
    
    # Update content status
    storage.update_content_status(
        content_id=content_id,
        status=FeedbackStatus.APPROVED if response.approved else FeedbackStatus.REJECTED,
        approved_by="user",
        rejection_reason=None if response.approved else response.approval_notes
    )
    
    # Generate recommendations
    if response.feedback_items:
        recommendation = generate_adjustment_recommendations(
            feedback_response=response,
            content=content_obj,
            current_settings=initial_settings or {}
        )
        
        # Save recommendation
        storage.save_recommendation(recommendation)
        
        # Create approval request
        approval_request = ApprovalRequest(
            recommendations=[recommendation],
            session_id=session_id
        )
        
        # In a real implementation, this would trigger a notification or UI update
        # For now, we'll simulate the response
        
        # Simulate approval response (would come from a human in reality)
        approval_response = ApprovalResponse(
            request_id=f"req_{int(time.time())}",
            approved_adjustments=[adj.id for adj in recommendation.adjustments],
            rejected_adjustments=[],
            notes="These adjustments look good, please apply them."
        )
        
        # Return the results
        return {
            "content_id": content_id,
            "status": "approved" if response.approved else "rejected",
            "feedback": [fb.dict() for fb in feedback_items],
            "recommendations": recommendation.dict(),
            "applied_adjustments": [adj.dict() for adj in recommendation.adjustments]
        }
    
    # Return the results if no adjustments needed
    return {
        "content_id": content_id,
        "status": "approved" if response.approved else "rejected",
        "feedback": [fb.dict() for fb in feedback_items],
        "recommendations": None,
        "applied_adjustments": []
    }

if __name__ == "__main__":
    # Example usage
    sample_content = """
    Strategic planning is essential for business growth. Without clear goals and metrics,
    companies often flounder in their execution. The first step is to define what success
    looks like for your specific business context, then work backwards to establish the
    key performance indicators that will measure progress.
    """
    
    result = process_content_with_feedback_loop(
        content=sample_content,
        content_type=ContentType.COACHING_ADVICE,
        title="Strategic Planning Fundamentals",
        model="claude-3",
        prompt="Generate coaching advice about strategic planning",
        initial_settings={
            "style_emphasis": 0.7,
            "formality": 0.4,
            "detail_level": 0.6
        }
    )
    
    print(json.dumps(result, indent=2))