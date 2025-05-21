"""
Redis client for the SecondBrain Slack-Notion integration.
Handles short-term context caching and session management.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union
import uuid
from datetime import datetime, timedelta

import redis
from redis.exceptions import RedisError

from ..utils.logger import get_logger

logger = get_logger(__name__)

class RedisClient:
    """Redis client for short-term context caching."""
    
    def __init__(self, 
                 host: Optional[str] = None, 
                 port: Optional[int] = None, 
                 password: Optional[str] = None, 
                 db: int = 0,
                 url: Optional[str] = None):
        """
        Initialize the Redis client.
        
        Args:
            host: Redis host
            port: Redis port
            password: Redis password
            db: Redis database number
            url: Redis connection URL (overrides other parameters if provided)
        """
        self.host = host or os.getenv("REDIS_HOST")
        self.port = port or int(os.getenv("REDIS_PORT", "6379"))
        self.password = password or os.getenv("REDIS_PASSWORD")
        self.db = db if db is not None else int(os.getenv("REDIS_DB", "0"))
        self.url = url or os.getenv("REDIS_URL")
        
        try:
            if self.url:
                logger.info(f"Connecting to Redis using URL")
                self.client = redis.from_url(self.url)
            else:
                logger.info(f"Connecting to Redis at {self.host}:{self.port}")
                self.client = redis.Redis(
                    host=self.host,
                    port=self.port,
                    password=self.password,
                    db=self.db,
                    decode_responses=True  # Auto decode responses to strings
                )
            
            # Test connection
            self.client.ping()
            logger.info("Successfully connected to Redis")
        except RedisError as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise
    
    # Session Management Methods
    
    def create_session(self, user_id: str, source: str = "cli") -> str:
        """
        Create a new session.
        
        Args:
            user_id: User ID
            source: Session source ('cli', 'slack', 'web')
            
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        metadata = {
            "user_id": user_id,
            "start_time": datetime.utcnow().isoformat(),
            "last_active": datetime.utcnow().isoformat(),
            "source": source,
            "agents": []
        }
        
        # Store session metadata
        self.client.set(
            f"session:{session_id}:metadata", 
            json.dumps(metadata),
            ex=3600  # 1 hour expiration
        )
        
        # Initialize empty message list
        self.client.lpush(f"session:{session_id}:messages", "[]")
        self.client.expire(f"session:{session_id}:messages", 3600)  # 1 hour expiration
        
        # Add to user's sessions
        self.client.lpush(f"user:{user_id}:sessions", session_id)
        self.client.expire(f"user:{user_id}:sessions", 86400)  # 24 hour expiration
        
        logger.info(f"Created session {session_id} for user {user_id}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session metadata.
        
        Args:
            session_id: Session ID
            
        Returns:
            Session metadata or None if not found
        """
        metadata_json = self.client.get(f"session:{session_id}:metadata")
        if not metadata_json:
            return None
        
        try:
            return json.loads(metadata_json)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode session metadata for {session_id}")
            return None
    
    def update_session(self, session_id: str, metadata: Dict[str, Any]) -> bool:
        """
        Update session metadata.
        
        Args:
            session_id: Session ID
            metadata: Updated metadata
            
        Returns:
            Success status
        """
        # Ensure last_active is updated
        metadata["last_active"] = datetime.utcnow().isoformat()
        
        try:
            # Update session metadata
            self.client.set(
                f"session:{session_id}:metadata", 
                json.dumps(metadata),
                ex=3600  # Reset expiration to 1 hour
            )
            
            # Reset message expiration
            self.client.expire(f"session:{session_id}:messages", 3600)
            
            return True
        except RedisError as e:
            logger.error(f"Failed to update session {session_id}: {str(e)}")
            return False
    
    def extend_session(self, session_id: str) -> bool:
        """
        Extend session expiration.
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        try:
            # Update last_active time
            metadata = self.get_session(session_id)
            if metadata:
                metadata["last_active"] = datetime.utcnow().isoformat()
                self.client.set(
                    f"session:{session_id}:metadata", 
                    json.dumps(metadata),
                    ex=3600  # Reset expiration to 1 hour
                )
            
            # Reset message expiration
            self.client.expire(f"session:{session_id}:messages", 3600)
            
            return True
        except RedisError as e:
            logger.error(f"Failed to extend session {session_id}: {str(e)}")
            return False
    
    def end_session(self, session_id: str) -> bool:
        """
        End a session but keep data for retrieval.
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        try:
            # Update metadata to mark session as ended
            metadata = self.get_session(session_id)
            if metadata:
                metadata["ended_at"] = datetime.utcnow().isoformat()
                metadata["status"] = "ended"
                self.client.set(
                    f"session:{session_id}:metadata", 
                    json.dumps(metadata),
                    ex=86400  # Keep for 24 hours after ending
                )
            
            # Keep messages for 24 hours
            self.client.expire(f"session:{session_id}:messages", 86400)
            
            return True
        except RedisError as e:
            logger.error(f"Failed to end session {session_id}: {str(e)}")
            return False
    
    # Message Management Methods
    
    def add_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        """
        Add a message to a session.
        
        Args:
            session_id: Session ID
            message: Message data
            
        Returns:
            Success status
        """
        try:
            # Ensure message has an ID
            if "id" not in message:
                message["id"] = str(uuid.uuid4())
            
            # Ensure message has a timestamp
            if "timestamp" not in message:
                message["timestamp"] = datetime.utcnow().isoformat()
            
            # Add message to session messages
            self.client.rpush(
                f"session:{session_id}:messages", 
                json.dumps(message)
            )
            
            # Extend session expiration
            self.extend_session(session_id)
            
            return True
        except RedisError as e:
            logger.error(f"Failed to add message to session {session_id}: {str(e)}")
            return False
    
    def get_messages(self, session_id: str, start: int = 0, end: int = -1) -> List[Dict[str, Any]]:
        """
        Get messages from a session.
        
        Args:
            session_id: Session ID
            start: Start index
            end: End index (-1 for all messages)
            
        Returns:
            List of messages
        """
        try:
            message_jsons = self.client.lrange(f"session:{session_id}:messages", start, end)
            messages = []
            
            for msg_json in message_jsons:
                try:
                    msg = json.loads(msg_json)
                    messages.append(msg)
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode message in session {session_id}")
            
            return messages
        except RedisError as e:
            logger.error(f"Failed to get messages for session {session_id}: {str(e)}")
            return []
    
    # Agent State Management Methods
    
    def set_agent_state(self, agent_id: str, state: Dict[str, Any]) -> bool:
        """
        Set agent state.
        
        Args:
            agent_id: Agent ID
            state: Agent state
            
        Returns:
            Success status
        """
        try:
            self.client.set(
                f"agent:{agent_id}:state", 
                json.dumps(state),
                ex=1800  # 30 minute expiration
            )
            return True
        except RedisError as e:
            logger.error(f"Failed to set state for agent {agent_id}: {str(e)}")
            return False
    
    def get_agent_state(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get agent state.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Agent state or None if not found
        """
        try:
            state_json = self.client.get(f"agent:{agent_id}:state")
            if not state_json:
                return None
            
            return json.loads(state_json)
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Failed to get state for agent {agent_id}: {str(e)}")
            return None
    
    # Workflow Management Methods
    
    def set_workflow_state(self, workflow_id: str, state: Dict[str, Any]) -> bool:
        """
        Set workflow state.
        
        Args:
            workflow_id: Workflow ID
            state: Workflow state
            
        Returns:
            Success status
        """
        try:
            self.client.set(
                f"workflow:{workflow_id}", 
                json.dumps(state),
                ex=86400  # 24 hour expiration
            )
            return True
        except RedisError as e:
            logger.error(f"Failed to set state for workflow {workflow_id}: {str(e)}")
            return False
    
    def get_workflow_state(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """
        Get workflow state.
        
        Args:
            workflow_id: Workflow ID
            
        Returns:
            Workflow state or None if not found
        """
        try:
            state_json = self.client.get(f"workflow:{workflow_id}")
            if not state_json:
                return None
            
            return json.loads(state_json)
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Failed to get state for workflow {workflow_id}: {str(e)}")
            return None
    
    # Context Management Methods
    
    def store_context(self, key: str, context: Dict[str, Any], ttl: int = 3600) -> bool:
        """
        Store arbitrary context data.
        
        Args:
            key: Context key
            context: Context data
            ttl: Time to live in seconds
            
        Returns:
            Success status
        """
        try:
            self.client.set(f"context:{key}", json.dumps(context), ex=ttl)
            return True
        except RedisError as e:
            logger.error(f"Failed to store context {key}: {str(e)}")
            return False
    
    def get_context(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get context data.
        
        Args:
            key: Context key
            
        Returns:
            Context data or None if not found
        """
        try:
            context_json = self.client.get(f"context:{key}")
            if not context_json:
                return None
            
            return json.loads(context_json)
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Failed to get context {key}: {str(e)}")
            return None
    
    # Bridge Context Methods
    
    def create_context_bridge(self, from_session_id: str, to_session_id: str,
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
        try:
            bridge_id = str(uuid.uuid4())
            bridge = {
                "id": bridge_id,
                "from_session_id": from_session_id,
                "to_session_id": to_session_id,
                "created_at": datetime.utcnow().isoformat(),
                "summary": summary,
                "data": data
            }
            
            # Store bridge
            self.client.set(f"bridge:{bridge_id}", json.dumps(bridge), ex=86400)  # 24 hour TTL
            
            # Add to session lists
            self.client.rpush(f"session:{from_session_id}:bridges_out", bridge_id)
            self.client.rpush(f"session:{to_session_id}:bridges_in", bridge_id)
            
            return bridge_id
        except RedisError as e:
            logger.error(f"Failed to create context bridge: {str(e)}")
            return None
    
    def get_session_bridges(self, session_id: str, direction: str = "in") -> List[Dict[str, Any]]:
        """
        Get context bridges for a session.
        
        Args:
            session_id: Session ID
            direction: 'in' for incoming bridges, 'out' for outgoing bridges
            
        Returns:
            List of bridges
        """
        try:
            key = f"session:{session_id}:bridges_{direction}"
            bridge_ids = self.client.lrange(key, 0, -1)
            
            bridges = []
            for bridge_id in bridge_ids:
                bridge_json = self.client.get(f"bridge:{bridge_id}")
                if bridge_json:
                    try:
                        bridge = json.loads(bridge_json)
                        bridges.append(bridge)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to decode bridge {bridge_id}")
            
            return bridges
        except RedisError as e:
            logger.error(f"Failed to get bridges for session {session_id}: {str(e)}")
            return []
    
    # Utility Methods
    
    def ping(self) -> bool:
        """
        Check Redis connection.
        
        Returns:
            True if connected, False otherwise
        """
        try:
            return self.client.ping()
        except RedisError:
            return False
    
    def clear_session_data(self, session_id: str) -> bool:
        """
        Clear all data for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        try:
            # Get keys matching session pattern
            keys = self.client.keys(f"session:{session_id}:*")
            
            # Delete all keys
            if keys:
                self.client.delete(*keys)
            
            return True
        except RedisError as e:
            logger.error(f"Failed to clear data for session {session_id}: {str(e)}")
            return False