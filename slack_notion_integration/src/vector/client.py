"""
Pinecone vector database client for semantic search capabilities.
"""

import os
import json
import uuid
import logging
import pinecone
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from ..utils.logger import get_logger
from ..models.schema import Task, NotionPage, SlackMessage

logger = get_logger("pinecone")

class PineconeClient:
    """
    Client for Pinecone vector database operations.
    """
    
    def __init__(self, api_key=None, environment=None, index_name=None):
        """
        Initialize the Pinecone client.
        
        Args:
            api_key: Pinecone API key
            environment: Pinecone environment
            index_name: Pinecone index name
        """
        self.api_key = api_key or os.getenv("PINECONE_API_KEY")
        self.environment = environment or os.getenv("PINECONE_ENVIRONMENT")
        self.index_name = index_name or os.getenv("PINECONE_INDEX")
        
        if not self.api_key:
            logger.error("Pinecone API key not found")
            raise ValueError("Pinecone API key is required")
            
        if not self.environment:
            logger.error("Pinecone environment not found")
            raise ValueError("Pinecone environment is required")
            
        if not self.index_name:
            logger.error("Pinecone index name not found")
            raise ValueError("Pinecone index name is required")
        
        # Initialize connection to Pinecone
        self._initialize_pinecone()
        
    def _initialize_pinecone(self) -> None:
        """
        Initialize connection to Pinecone.
        """
        try:
            pinecone.init(api_key=self.api_key, environment=self.environment)
            
            # Check if index exists, create if it doesn't
            if self.index_name not in pinecone.list_indexes():
                logger.info(f"Creating Pinecone index: {self.index_name}")
                pinecone.create_index(
                    name=self.index_name,
                    dimension=1536,  # OpenAI's embedding dimension
                    metric="cosine"
                )
                logger.info(f"Created Pinecone index: {self.index_name}")
            
            self.index = pinecone.Index(self.index_name)
            logger.info(f"Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {str(e)}")
            raise
    
    def _get_embedding(self, text: str) -> List[float]:
        """
        Get OpenAI embedding for text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        try:
            import openai
            response = openai.Embedding.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response["data"][0]["embedding"]
        except Exception as e:
            logger.error(f"Failed to get embedding: {str(e)}")
            # Return empty embedding in case of error
            return [0.0] * 1536
    
    def index_message(self, message: Dict[str, Any], session_id: str) -> bool:
        """
        Index a message for semantic search.
        
        Args:
            message: Message to index
            session_id: Session ID
            
        Returns:
            Success status
        """
        try:
            # Extract content based on role
            if message.get("role") == "user":
                content = message.get("content", "")
            elif message.get("role") == "assistant":
                content = message.get("content", "")
            elif message.get("role") == "agent":
                content = message.get("content", "")
                if isinstance(content, dict) and "text" in content:
                    content = content["text"]
            else:
                content = str(message.get("content", ""))
            
            # Skip empty content
            if not content:
                logger.warning("Skipping empty message content")
                return False
                
            # Generate embedding
            embedding = self._get_embedding(content)
            
            # Create metadata
            metadata = {
                "session_id": session_id,
                "message_id": message.get("id", str(uuid.uuid4())),
                "role": message.get("role", "unknown"),
                "timestamp": message.get("timestamp", datetime.utcnow().isoformat()),
                "content_preview": content[:100] + "..." if len(content) > 100 else content
            }
            
            # Add agent info if available
            if message.get("agent"):
                metadata["agent"] = message.get("agent")
                
            # Add task info if available
            if message.get("task_id"):
                metadata["task_id"] = message.get("task_id")
            
            # Add to Pinecone
            vector_id = f"{session_id}:{metadata['message_id']}"
            self.index.upsert(
                vectors=[(vector_id, embedding, metadata)]
            )
            
            logger.info(f"Indexed message {metadata['message_id']} in session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to index message: {str(e)}")
            return False
    
    def index_task(self, task: Task, session_id: str) -> bool:
        """
        Index a task for semantic search.
        
        Args:
            task: Task to index
            session_id: Session ID
            
        Returns:
            Success status
        """
        try:
            # Create combined text for embedding
            content = f"Task: {task.title}\n\nDescription: {task.description}"
            
            # Generate embedding
            embedding = self._get_embedding(content)
            
            # Create metadata
            metadata = {
                "session_id": session_id,
                "task_id": task.id,
                "title": task.title,
                "agent": task.agent,
                "status": task.status,
                "priority": task.priority,
                "created_at": task.created_at.isoformat(),
                "updated_at": task.updated_at.isoformat(),
                "type": "task"
            }
            
            # Add to Pinecone
            vector_id = f"task:{session_id}:{task.id}"
            self.index.upsert(
                vectors=[(vector_id, embedding, metadata)]
            )
            
            logger.info(f"Indexed task {task.id} in session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to index task: {str(e)}")
            return False
    
    def index_notion_page(self, page: NotionPage, session_id: str) -> bool:
        """
        Index a Notion page for semantic search.
        
        Args:
            page: Notion page to index
            session_id: Session ID
            
        Returns:
            Success status
        """
        try:
            # Create combined text for embedding
            content = f"Title: {page.title}\n\nContent: {page.content}"
            
            # Generate embedding
            embedding = self._get_embedding(content)
            
            # Create metadata
            metadata = {
                "session_id": session_id,
                "page_id": page.id,
                "title": page.title,
                "url": page.url,
                "created_at": page.created_at.isoformat(),
                "updated_at": page.updated_at.isoformat(),
                "created_by": page.created_by,
                "type": "notion_page"
            }
            
            # Add to Pinecone
            vector_id = f"notion:{session_id}:{page.id}"
            self.index.upsert(
                vectors=[(vector_id, embedding, metadata)]
            )
            
            logger.info(f"Indexed Notion page {page.id} in session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to index Notion page: {str(e)}")
            return False
    
    def search(self, query: str, session_id: Optional[str] = None, 
               limit: int = 5, filter_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Search for similar content.
        
        Args:
            query: Search query
            session_id: Optional session ID to filter results
            limit: Maximum number of results to return
            filter_type: Optional type filter (message, task, notion_page)
            
        Returns:
            List of search results with metadata
        """
        try:
            # Generate embedding for query
            embedding = self._get_embedding(query)
            
            # Build filter if needed
            filter_dict = {}
            if session_id:
                filter_dict["session_id"] = session_id
            if filter_type:
                filter_dict["type"] = filter_type
                
            # Execute search
            results = self.index.query(
                vector=embedding,
                top_k=limit,
                include_metadata=True,
                filter=filter_dict if filter_dict else None
            )
            
            # Process and return results
            processed_results = []
            for match in results.matches:
                processed_results.append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                })
            
            logger.info(f"Search for '{query[:20]}...' returned {len(processed_results)} results")
            return processed_results
            
        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            return []
    
    def find_related_content(self, text: str, session_id: Optional[str] = None, 
                            limit: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Find content related to given text across all content types.
        
        Args:
            text: Text to find related content for
            session_id: Optional session ID to filter results
            limit: Maximum number of results to return per type
            
        Returns:
            Dictionary of search results by type
        """
        try:
            # Generate embedding for query
            embedding = self._get_embedding(text)
            
            # Build base filter
            base_filter = {}
            if session_id:
                base_filter["session_id"] = session_id
                
            # Results container
            results = {
                "messages": [],
                "tasks": [],
                "notion_pages": []
            }
            
            # Search for messages
            message_filter = base_filter.copy()
            message_results = self.index.query(
                vector=embedding,
                top_k=limit,
                include_metadata=True,
                filter={**message_filter, "type": "message"} if message_filter else {"type": "message"}
            )
            
            for match in message_results.matches:
                results["messages"].append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                })
            
            # Search for tasks
            task_filter = base_filter.copy()
            task_results = self.index.query(
                vector=embedding,
                top_k=limit,
                include_metadata=True,
                filter={**task_filter, "type": "task"} if task_filter else {"type": "task"}
            )
            
            for match in task_results.matches:
                results["tasks"].append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                })
            
            # Search for Notion pages
            notion_filter = base_filter.copy()
            notion_results = self.index.query(
                vector=embedding,
                top_k=limit,
                include_metadata=True,
                filter={**notion_filter, "type": "notion_page"} if notion_filter else {"type": "notion_page"}
            )
            
            for match in notion_results.matches:
                results["notion_pages"].append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                })
            
            logger.info(f"Found related content for '{text[:20]}...': {len(results['messages'])} messages, {len(results['tasks'])} tasks, {len(results['notion_pages'])} Notion pages")
            return results
            
        except Exception as e:
            logger.error(f"Find related content failed: {str(e)}")
            return {"messages": [], "tasks": [], "notion_pages": []}
    
    def delete_session_data(self, session_id: str) -> bool:
        """
        Delete all data for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        try:
            # Build the filter
            filter_dict = {"session_id": session_id}
            
            # Delete vectors matching the filter
            self.index.delete(
                filter=filter_dict
            )
            
            logger.info(f"Deleted all data for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete session data: {str(e)}")
            return False