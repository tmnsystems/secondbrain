"""
Context management for the SecondBrain Slack-Notion integration.
Handles session context, message history, and context bridging.
"""

import os
import json
import logging
import uuid
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from ..redis.client import RedisClient
from ..database.client import PostgresClient
from ..vector.client import PineconeClient
from ..config.env import get_redis_config, get_postgres_config, get_pinecone_config
from ..utils.logger import get_logger

logger = get_logger(__name__)

class ContextManager:
    """Context manager for the SecondBrain system."""
    
    def __init__(self, redis_client: Optional[RedisClient] = None, 
                 postgres_client: Optional[PostgresClient] = None,
                 pinecone_client: Optional[PineconeClient] = None):
        """
        Initialize the context manager.
        
        Args:
            redis_client: Optional Redis client. If not provided, a new one will be created.
            postgres_client: Optional PostgreSQL client. If not provided, a new one will be created.
            pinecone_client: Optional Pinecone client. If not provided, a new one will be created.
        """
        # Initialize Redis client for short-term caching
        if redis_client:
            self.redis = redis_client
        else:
            redis_config = get_redis_config()
            if "url" in redis_config and redis_config["url"]:
                self.redis = RedisClient(url=redis_config["url"])
            else:
                self.redis = RedisClient(
                    host=redis_config.get("host"),
                    port=redis_config.get("port"),
                    password=redis_config.get("password"),
                    db=redis_config.get("db", 0)
                )
        
        # Initialize PostgreSQL client for structured storage
        if postgres_client:
            self.postgres = postgres_client
        else:
            postgres_config = get_postgres_config()
            if "url" in postgres_config and postgres_config["url"]:
                self.postgres = PostgresClient(url=postgres_config["url"])
            else:
                self.postgres = PostgresClient(
                    host=postgres_config.get("host"),
                    port=int(postgres_config.get("port", 5432)),
                    user=postgres_config.get("user"),
                    password=postgres_config.get("password"),
                    database=postgres_config.get("database")
                )
        
        # Initialize Pinecone client for semantic search
        self.pinecone = None
        try:
            if pinecone_client:
                self.pinecone = pinecone_client
            else:
                pinecone_config = get_pinecone_config()
                if pinecone_config.get("api_key") and pinecone_config.get("environment") and pinecone_config.get("index"):
                    self.pinecone = PineconeClient(
                        api_key=pinecone_config.get("api_key"),
                        environment=pinecone_config.get("environment"),
                        index_name=pinecone_config.get("index")
                    )
                    logger.info("Pinecone client initialized successfully")
                else:
                    logger.warning("Pinecone configuration incomplete. Semantic search will be unavailable.")
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone client: {str(e)}")
            logger.warning("Semantic search will be unavailable")
        
        logger.info("Context manager initialized with Redis, PostgreSQL, and optional Pinecone connections")
    
    def create_session(self, user_id: str, source: str = "cli") -> str:
        """
        Create a new session context.
        
        Args:
            user_id: User ID
            source: Session source ('cli', 'slack', 'web')
            
        Returns:
            Session ID
        """
        # Create Redis session for short-term caching
        session_id = self.redis.create_session(user_id, source)
        
        try:
            # Check if user exists in PostgreSQL
            user = self.postgres.get_user_by_email(user_id)
            if not user:
                # Create user if not exists (using email as name for now)
                pg_user_id = self.postgres.create_user(user_id, user_id)
            else:
                pg_user_id = user["id"]
            
            # Create PostgreSQL session for long-term storage
            self.postgres.create_session(pg_user_id, source)
            
            logger.info(f"Created session {session_id} for user {user_id} in both Redis and PostgreSQL")
        except Exception as e:
            logger.error(f"Failed to create PostgreSQL session: {str(e)}")
            logger.info(f"Session {session_id} created only in Redis")
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session metadata.
        
        Args:
            session_id: Session ID
            
        Returns:
            Session metadata or None if not found
        """
        # Try Redis first (faster)
        session = self.redis.get_session(session_id)
        
        if not session:
            # Try PostgreSQL if not in Redis
            try:
                pg_session = self.postgres.get_session(session_id)
                if pg_session:
                    # Convert PostgreSQL session to Redis format
                    session = {
                        "user_id": str(pg_session["user_id"]),
                        "start_time": pg_session["created_at"].isoformat(),
                        "last_active": pg_session["created_at"].isoformat(),
                        "source": pg_session["source"]
                    }
                    
                    # Cache in Redis for faster access next time
                    self.redis.set(
                        f"session:{session_id}:metadata", 
                        json.dumps(session),
                        ex=3600  # 1 hour expiration
                    )
            except Exception as e:
                logger.error(f"Failed to get PostgreSQL session {session_id}: {str(e)}")
        
        return session
    
    def add_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        """
        Add a message to the session history.
        
        Args:
            session_id: Session ID
            message: Message data
            
        Returns:
            Success status
        """
        # Add to Redis for short-term caching
        redis_success = self.redis.add_message(session_id, message)
        
        # Add to PostgreSQL for long-term storage
        try:
            self.postgres.add_message(session_id, message)
            logger.info(f"Added message to session {session_id} in both Redis and PostgreSQL")
        except Exception as e:
            logger.error(f"Failed to add message to PostgreSQL session {session_id}: {str(e)}")
            logger.info(f"Message added only to Redis")
        
        # Index in Pinecone for semantic search if available
        if self.pinecone:
            try:
                self.pinecone.index_message(message, session_id)
                logger.info(f"Indexed message in Pinecone for session {session_id}")
            except Exception as e:
                logger.error(f"Failed to index message in Pinecone: {str(e)}")
        
        return redis_success
    
    def get_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get messages from the session history.
        
        Args:
            session_id: Session ID
            limit: Maximum number of messages to return
            
        Returns:
            List of messages
        """
        # Try Redis first (faster)
        messages = self.redis.get_messages(session_id, 0, limit - 1)
        
        if not messages:
            # Try PostgreSQL if not in Redis
            try:
                messages = self.postgres.get_messages(session_id, limit)
            except Exception as e:
                logger.error(f"Failed to get messages for PostgreSQL session {session_id}: {str(e)}")
                messages = []
        
        return messages
    
    def store_agent_state(self, agent_id: str, state: Dict[str, Any]) -> bool:
        """
        Store agent state.
        
        Args:
            agent_id: Agent ID
            state: Agent state
            
        Returns:
            Success status
        """
        # Store in Redis only (short-lived data)
        return self.redis.set_agent_state(agent_id, state)
    
    def get_agent_state(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get agent state.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Agent state or None if not found
        """
        # Get from Redis only (short-lived data)
        return self.redis.get_agent_state(agent_id)
    
    def store_workflow_state(self, workflow_id: str, state: Dict[str, Any]) -> bool:
        """
        Store workflow state.
        
        Args:
            workflow_id: Workflow ID
            state: Workflow state
            
        Returns:
            Success status
        """
        # Store in Redis for short-term caching
        redis_success = self.redis.set_workflow_state(workflow_id, state)
        
        # Store in PostgreSQL for long-term storage
        try:
            # Check if workflow exists
            pg_workflow = self.postgres.get_workflow(workflow_id)
            
            if pg_workflow:
                # Update existing workflow
                self.postgres.update_workflow_status(workflow_id, state.get("status", "active"), state)
            else:
                # Create new workflow
                self.postgres.create_workflow(
                    state.get("session_id", "unknown"),
                    state.get("workflow_type", "default"),
                    state
                )
            
            logger.info(f"Stored workflow state for {workflow_id} in both Redis and PostgreSQL")
            return redis_success
        except Exception as e:
            logger.error(f"Failed to store workflow state in PostgreSQL: {str(e)}")
            logger.info(f"Workflow state stored only in Redis")
            return redis_success
    
    def get_workflow_state(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """
        Get workflow state.
        
        Args:
            workflow_id: Workflow ID
            
        Returns:
            Workflow state or None if not found
        """
        # Try Redis first (faster)
        workflow = self.redis.get_workflow_state(workflow_id)
        
        if not workflow:
            # Try PostgreSQL if not in Redis
            try:
                pg_workflow = self.postgres.get_workflow(workflow_id)
                if pg_workflow and pg_workflow.get("metadata"):
                    workflow = pg_workflow["metadata"]
                    
                    # Cache in Redis for faster access next time
                    self.redis.set_workflow_state(workflow_id, workflow)
            except Exception as e:
                logger.error(f"Failed to get workflow state from PostgreSQL: {str(e)}")
        
        return workflow
    
    def bridge_context(self, from_session_id: str, to_session_id: str, 
                       summary: str, data: Dict[str, Any]) -> Optional[str]:
        """
        Create a bridge between two sessions to maintain context.
        
        Args:
            from_session_id: Source session ID
            to_session_id: Target session ID
            summary: Context summary
            data: Context data
            
        Returns:
            Bridge ID or None if failed
        """
        # Create bridge in Redis for short-term caching
        bridge_id = self.redis.create_context_bridge(from_session_id, to_session_id, summary, data)
        
        # Create bridge in PostgreSQL for long-term storage
        try:
            self.postgres.create_context_bridge(from_session_id, to_session_id, summary, data)
            logger.info(f"Created context bridge {bridge_id} in both Redis and PostgreSQL")
            return bridge_id
        except Exception as e:
            logger.error(f"Failed to create context bridge in PostgreSQL: {str(e)}")
            logger.info(f"Context bridge created only in Redis")
            return bridge_id
    
    def get_session_bridges(self, session_id: str, direction: str = "in") -> List[Dict[str, Any]]:
        """
        Get context bridges for a session.
        
        Args:
            session_id: Session ID
            direction: 'in' for incoming bridges, 'out' for outgoing bridges
            
        Returns:
            List of bridges
        """
        # Try Redis first (faster)
        bridges = self.redis.get_session_bridges(session_id, direction)
        
        if not bridges:
            # Try PostgreSQL if not in Redis
            try:
                bridges = self.postgres.get_session_bridges(session_id, direction)
            except Exception as e:
                logger.error(f"Failed to get session bridges from PostgreSQL: {str(e)}")
                bridges = []
        
        return bridges
    
    def end_session(self, session_id: str) -> bool:
        """
        End a session but keep data for retrieval.
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        # End session in Redis
        redis_success = self.redis.end_session(session_id)
        
        # End session in PostgreSQL
        try:
            self.postgres.end_session(session_id)
            logger.info(f"Ended session {session_id} in both Redis and PostgreSQL")
            return redis_success
        except Exception as e:
            logger.error(f"Failed to end session in PostgreSQL: {str(e)}")
            logger.info(f"Session ended only in Redis")
            return redis_success
    
    def clear_session(self, session_id: str) -> bool:
        """
        Clear all data for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        # Only clear Redis data (PostgreSQL data is kept for historical purposes)
        redis_success = self.redis.clear_session_data(session_id)
        
        # If Pinecone is available, delete session data from Pinecone
        if self.pinecone:
            try:
                self.pinecone.delete_session_data(session_id)
            except Exception as e:
                logger.error(f"Failed to clear Pinecone data for session {session_id}: {str(e)}")
        
        return redis_success
    
    def index_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        """
        Index a message for semantic search.
        
        Args:
            session_id: Session ID
            message: Message to index
            
        Returns:
            Success status
        """
        if not self.pinecone:
            logger.warning("Pinecone client not available. Message not indexed.")
            return False
        
        try:
            return self.pinecone.index_message(message, session_id)
        except Exception as e:
            logger.error(f"Failed to index message in Pinecone: {str(e)}")
            return False
    
    def index_task(self, session_id: str, task: Dict[str, Any]) -> bool:
        """
        Index a task for semantic search.
        
        Args:
            session_id: Session ID
            task: Task to index
            
        Returns:
            Success status
        """
        if not self.pinecone:
            logger.warning("Pinecone client not available. Task not indexed.")
            return False
        
        try:
            return self.pinecone.index_task(task, session_id)
        except Exception as e:
            logger.error(f"Failed to index task in Pinecone: {str(e)}")
            return False
    
    def index_notion_page(self, session_id: str, page: Dict[str, Any]) -> bool:
        """
        Index a Notion page for semantic search.
        
        Args:
            session_id: Session ID
            page: Notion page to index
            
        Returns:
            Success status
        """
        if not self.pinecone:
            logger.warning("Pinecone client not available. Notion page not indexed.")
            return False
        
        try:
            return self.pinecone.index_notion_page(page, session_id)
        except Exception as e:
            logger.error(f"Failed to index Notion page in Pinecone: {str(e)}")
            return False
    
    def semantic_search(self, query: str, session_id: Optional[str] = None, 
                       limit: int = 5, filter_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Perform semantic search.
        
        Args:
            query: Search query
            session_id: Optional session ID to filter results
            limit: Maximum number of results to return
            filter_type: Optional type filter (message, task, notion_page)
            
        Returns:
            List of search results
        """
        if not self.pinecone:
            logger.warning("Pinecone client not available. Semantic search not possible.")
            return []
        
        try:
            return self.pinecone.search(query, session_id, limit, filter_type)
        except Exception as e:
            logger.error(f"Semantic search failed: {str(e)}")
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
        if not self.pinecone:
            logger.warning("Pinecone client not available. Related content search not possible.")
            return {"messages": [], "tasks": [], "notion_pages": []}
        
        try:
            return self.pinecone.find_related_content(text, session_id, limit)
        except Exception as e:
            logger.error(f"Find related content failed: {str(e)}")
            return {"messages": [], "tasks": [], "notion_pages": []}