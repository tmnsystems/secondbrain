"""
PostgreSQL client for the SecondBrain Slack-Notion integration.
Handles structured data storage for conversations, tasks, and agent activities.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
import uuid
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor, Json
from psycopg2.extensions import connection, cursor

from ..utils.logger import get_logger

logger = get_logger(__name__)

class PostgresClient:
    """PostgreSQL client for structured data storage."""
    
    def __init__(self, 
                 host: Optional[str] = None, 
                 port: Optional[int] = None, 
                 user: Optional[str] = None, 
                 password: Optional[str] = None, 
                 database: Optional[str] = None,
                 url: Optional[str] = None):
        """
        Initialize the PostgreSQL client.
        
        Args:
            host: PostgreSQL host
            port: PostgreSQL port
            user: PostgreSQL user
            password: PostgreSQL password
            database: PostgreSQL database
            url: PostgreSQL connection URL (overrides other parameters if provided)
        """
        self.host = host or os.getenv("POSTGRES_HOST", "localhost")
        self.port = port or int(os.getenv("POSTGRES_PORT", "5432"))
        self.user = user or os.getenv("POSTGRES_USER", "postgres")
        self.password = password or os.getenv("POSTGRES_PASSWORD", "")
        self.database = database or os.getenv("POSTGRES_DB", "secondbrain")
        self.url = url or os.getenv("DATABASE_URL")
        
        # Connection pool
        self._conn = None
    
    def _get_connection(self) -> connection:
        """
        Get a connection to the PostgreSQL database.
        
        Returns:
            Connection to the PostgreSQL database
        """
        if self._conn is None or self._conn.closed:
            try:
                if self.url:
                    logger.info(f"Connecting to PostgreSQL using URL")
                    self._conn = psycopg2.connect(self.url)
                else:
                    logger.info(f"Connecting to PostgreSQL at {self.host}:{self.port}")
                    self._conn = psycopg2.connect(
                        host=self.host,
                        port=self.port,
                        user=self.user,
                        password=self.password,
                        database=self.database
                    )
                self._conn.autocommit = False
                logger.info("Successfully connected to PostgreSQL")
            except Exception as e:
                logger.error(f"Failed to connect to PostgreSQL: {str(e)}")
                raise
        
        return self._conn
    
    def execute(self, query: str, params: Optional[tuple] = None, 
                fetch: bool = False, fetch_one: bool = False) -> Optional[List[Dict[str, Any]]]:
        """
        Execute a SQL query.
        
        Args:
            query: SQL query
            params: Query parameters
            fetch: Whether to fetch the results
            fetch_one: Whether to fetch a single result
            
        Returns:
            Query results if fetch is True, otherwise None
        """
        conn = self._get_connection()
        cursor_obj = None
        
        try:
            cursor_obj = conn.cursor(cursor_factory=RealDictCursor)
            cursor_obj.execute(query, params)
            
            if fetch:
                if fetch_one:
                    result = cursor_obj.fetchone()
                    return dict(result) if result else None
                else:
                    return [dict(row) for row in cursor_obj.fetchall()]
            
            conn.commit()
            return None
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to execute query: {str(e)}")
            raise
        finally:
            if cursor_obj:
                cursor_obj.close()
    
    def initialize_schema(self) -> None:
        """
        Initialize the database schema.
        """
        # Create users table
        self.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create sessions table
        self.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                source VARCHAR(50)
            )
        """)
        
        # Create messages table
        self.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY,
                session_id UUID REFERENCES sessions(id),
                role VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                agent_id UUID,
                parent_id UUID REFERENCES messages(id)
            )
        """)
        
        # Create workflows table
        self.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                id UUID PRIMARY KEY,
                session_id UUID REFERENCES sessions(id),
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                workflow_type VARCHAR(100),
                metadata JSONB
            )
        """)
        
        # Create tasks table
        self.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id UUID PRIMARY KEY,
                workflow_id UUID REFERENCES workflows(id),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                agent VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                priority VARCHAR(20),
                metadata JSONB
            )
        """)
        
        # Create task_steps table
        self.execute("""
            CREATE TABLE IF NOT EXISTS task_steps (
                id UUID PRIMARY KEY,
                task_id UUID REFERENCES tasks(id),
                description TEXT NOT NULL,
                agent VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                result JSONB
            )
        """)
        
        # Create context_bridges table
        self.execute("""
            CREATE TABLE IF NOT EXISTS context_bridges (
                id UUID PRIMARY KEY,
                from_session_id UUID REFERENCES sessions(id),
                to_session_id UUID REFERENCES sessions(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                context_summary TEXT,
                context_data JSONB
            )
        """)
        
        # Create notion_syncs table
        self.execute("""
            CREATE TABLE IF NOT EXISTS notion_syncs (
                id UUID PRIMARY KEY,
                task_id UUID REFERENCES tasks(id),
                notion_page_id VARCHAR(255),
                notion_database_id VARCHAR(255),
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50)
            )
        """)
        
        # Create vector_embeddings table
        self.execute("""
            CREATE TABLE IF NOT EXISTS vector_embeddings (
                id UUID PRIMARY KEY,
                source_type VARCHAR(50),
                source_id UUID,
                embedding_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                metadata JSONB
            )
        """)
        
        logger.info("Database schema initialized")
    
    # User Management Methods
    
    def create_user(self, name: str, email: Optional[str] = None) -> int:
        """
        Create a new user.
        
        Args:
            name: User name
            email: Optional user email
            
        Returns:
            User ID
        """
        query = """
            INSERT INTO users (name, email)
            VALUES (%s, %s)
            RETURNING id
        """
        
        result = self.execute(query, (name, email), fetch=True, fetch_one=True)
        user_id = result['id']
        
        logger.info(f"Created user {name} with ID {user_id}")
        
        return user_id
    
    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User data or None if not found
        """
        query = """
            SELECT * FROM users
            WHERE id = %s
        """
        
        return self.execute(query, (user_id,), fetch=True, fetch_one=True)
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get a user by email.
        
        Args:
            email: User email
            
        Returns:
            User data or None if not found
        """
        query = """
            SELECT * FROM users
            WHERE email = %s
        """
        
        return self.execute(query, (email,), fetch=True, fetch_one=True)
    
    # Session Management Methods
    
    def create_session(self, user_id: int, source: str = "cli") -> str:
        """
        Create a new session.
        
        Args:
            user_id: User ID
            source: Session source ('cli', 'slack', 'web')
            
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        
        query = """
            INSERT INTO sessions (id, user_id, source)
            VALUES (%s, %s, %s)
        """
        
        self.execute(query, (session_id, user_id, source))
        
        logger.info(f"Created session {session_id} for user {user_id}")
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a session by ID.
        
        Args:
            session_id: Session ID
            
        Returns:
            Session data or None if not found
        """
        query = """
            SELECT * FROM sessions
            WHERE id = %s
        """
        
        return self.execute(query, (session_id,), fetch=True, fetch_one=True)
    
    def end_session(self, session_id: str) -> bool:
        """
        End a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        query = """
            UPDATE sessions
            SET ended_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        
        try:
            self.execute(query, (session_id,))
            logger.info(f"Ended session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to end session {session_id}: {str(e)}")
            return False
    
    def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get all sessions for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of session data
        """
        query = """
            SELECT * FROM sessions
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        
        return self.execute(query, (user_id,), fetch=True) or []
    
    # Message Management Methods
    
    def add_message(self, session_id: str, message: Dict[str, Any]) -> str:
        """
        Add a message to a session.
        
        Args:
            session_id: Session ID
            message: Message data
            
        Returns:
            Message ID
        """
        message_id = message.get("id") or str(uuid.uuid4())
        role = message.get("role", "user")
        content = message.get("content", "")
        agent_id = message.get("agent_id")
        parent_id = message.get("parent_id")
        
        query = """
            INSERT INTO messages (id, session_id, role, content, agent_id, parent_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        self.execute(query, (message_id, session_id, role, content, agent_id, parent_id))
        
        logger.info(f"Added message {message_id} to session {session_id}")
        
        return message_id
    
    def get_messages(self, session_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get messages from a session.
        
        Args:
            session_id: Session ID
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List of messages
        """
        query = """
            SELECT * FROM messages
            WHERE session_id = %s
            ORDER BY created_at ASC
            LIMIT %s OFFSET %s
        """
        
        return self.execute(query, (session_id, limit, offset), fetch=True) or []
    
    def get_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a message by ID.
        
        Args:
            message_id: Message ID
            
        Returns:
            Message data or None if not found
        """
        query = """
            SELECT * FROM messages
            WHERE id = %s
        """
        
        return self.execute(query, (message_id,), fetch=True, fetch_one=True)
    
    # Workflow Management Methods
    
    def create_workflow(self, session_id: str, workflow_type: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a new workflow.
        
        Args:
            session_id: Session ID
            workflow_type: Workflow type
            metadata: Optional workflow metadata
            
        Returns:
            Workflow ID
        """
        workflow_id = str(uuid.uuid4())
        status = "created"
        
        query = """
            INSERT INTO workflows (id, session_id, status, workflow_type, metadata)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        self.execute(query, (workflow_id, session_id, status, workflow_type, Json(metadata or {})))
        
        logger.info(f"Created workflow {workflow_id} for session {session_id}")
        
        return workflow_id
    
    def update_workflow_status(self, workflow_id: str, status: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update workflow status.
        
        Args:
            workflow_id: Workflow ID
            status: New status
            metadata: Optional updated metadata
            
        Returns:
            Success status
        """
        if metadata:
            query = """
                UPDATE workflows
                SET status = %s, metadata = metadata || %s
                WHERE id = %s
            """
            
            try:
                self.execute(query, (status, Json(metadata), workflow_id))
                logger.info(f"Updated workflow {workflow_id} status to {status} with metadata")
                return True
            except Exception as e:
                logger.error(f"Failed to update workflow {workflow_id}: {str(e)}")
                return False
        else:
            query = """
                UPDATE workflows
                SET status = %s
                WHERE id = %s
            """
            
            try:
                self.execute(query, (status, workflow_id))
                logger.info(f"Updated workflow {workflow_id} status to {status}")
                return True
            except Exception as e:
                logger.error(f"Failed to update workflow {workflow_id}: {str(e)}")
                return False
    
    def complete_workflow(self, workflow_id: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Mark a workflow as completed.
        
        Args:
            workflow_id: Workflow ID
            metadata: Optional completion metadata
            
        Returns:
            Success status
        """
        if metadata:
            query = """
                UPDATE workflows
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP, metadata = metadata || %s
                WHERE id = %s
            """
            
            try:
                self.execute(query, (Json(metadata), workflow_id))
                logger.info(f"Completed workflow {workflow_id} with metadata")
                return True
            except Exception as e:
                logger.error(f"Failed to complete workflow {workflow_id}: {str(e)}")
                return False
        else:
            query = """
                UPDATE workflows
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            
            try:
                self.execute(query, (workflow_id,))
                logger.info(f"Completed workflow {workflow_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to complete workflow {workflow_id}: {str(e)}")
                return False
    
    def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a workflow by ID.
        
        Args:
            workflow_id: Workflow ID
            
        Returns:
            Workflow data or None if not found
        """
        query = """
            SELECT * FROM workflows
            WHERE id = %s
        """
        
        return self.execute(query, (workflow_id,), fetch=True, fetch_one=True)
    
    def get_session_workflows(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get all workflows for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            List of workflow data
        """
        query = """
            SELECT * FROM workflows
            WHERE session_id = %s
            ORDER BY created_at DESC
        """
        
        return self.execute(query, (session_id,), fetch=True) or []
    
    # Task Management Methods
    
    def create_task(self, workflow_id: str, task: Dict[str, Any]) -> str:
        """
        Create a new task.
        
        Args:
            workflow_id: Workflow ID
            task: Task data
            
        Returns:
            Task ID
        """
        task_id = task.get("id") or str(uuid.uuid4())
        title = task.get("title", "")
        description = task.get("description", "")
        agent = task.get("agent", "")
        status = task.get("status", "pending")
        priority = task.get("priority", "medium")
        metadata = task.get("metadata", {})
        
        query = """
            INSERT INTO tasks (id, workflow_id, title, description, agent, status, priority, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        self.execute(query, (task_id, workflow_id, title, description, agent, status, priority, Json(metadata)))
        
        logger.info(f"Created task {task_id} for workflow {workflow_id}")
        
        return task_id
    
    def update_task_status(self, task_id: str, status: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update task status.
        
        Args:
            task_id: Task ID
            status: New status
            metadata: Optional updated metadata
            
        Returns:
            Success status
        """
        # Update timestamps based on status
        timestamp_fields = ""
        if status == "in_progress":
            timestamp_fields = ", started_at = CURRENT_TIMESTAMP"
        elif status in ["completed", "failed", "cancelled"]:
            timestamp_fields = ", completed_at = CURRENT_TIMESTAMP"
        
        if metadata:
            query = f"""
                UPDATE tasks
                SET status = %s{timestamp_fields}, metadata = metadata || %s
                WHERE id = %s
            """
            
            try:
                self.execute(query, (status, Json(metadata), task_id))
                logger.info(f"Updated task {task_id} status to {status} with metadata")
                return True
            except Exception as e:
                logger.error(f"Failed to update task {task_id}: {str(e)}")
                return False
        else:
            query = f"""
                UPDATE tasks
                SET status = %s{timestamp_fields}
                WHERE id = %s
            """
            
            try:
                self.execute(query, (status, task_id))
                logger.info(f"Updated task {task_id} status to {status}")
                return True
            except Exception as e:
                logger.error(f"Failed to update task {task_id}: {str(e)}")
                return False
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a task by ID.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task data or None if not found
        """
        query = """
            SELECT * FROM tasks
            WHERE id = %s
        """
        
        return self.execute(query, (task_id,), fetch=True, fetch_one=True)
    
    def get_workflow_tasks(self, workflow_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a workflow.
        
        Args:
            workflow_id: Workflow ID
            
        Returns:
            List of task data
        """
        query = """
            SELECT * FROM tasks
            WHERE workflow_id = %s
            ORDER BY created_at ASC
        """
        
        return self.execute(query, (workflow_id,), fetch=True) or []
    
    def get_agent_tasks(self, agent: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all tasks for an agent.
        
        Args:
            agent: Agent name
            status: Optional status filter
            
        Returns:
            List of task data
        """
        if status:
            query = """
                SELECT * FROM tasks
                WHERE agent = %s AND status = %s
                ORDER BY created_at ASC
            """
            
            return self.execute(query, (agent, status), fetch=True) or []
        else:
            query = """
                SELECT * FROM tasks
                WHERE agent = %s
                ORDER BY created_at ASC
            """
            
            return self.execute(query, (agent,), fetch=True) or []
    
    # Task Step Management Methods
    
    def add_task_step(self, task_id: str, step: Dict[str, Any]) -> str:
        """
        Add a step to a task.
        
        Args:
            task_id: Task ID
            step: Step data
            
        Returns:
            Step ID
        """
        step_id = step.get("id") or str(uuid.uuid4())
        description = step.get("description", "")
        agent = step.get("agent", "")
        status = step.get("status", "pending")
        result = step.get("result")
        
        query = """
            INSERT INTO task_steps (id, task_id, description, agent, status, result)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        self.execute(query, (step_id, task_id, description, agent, status, Json(result) if result else None))
        
        logger.info(f"Added step {step_id} to task {task_id}")
        
        return step_id
    
    def update_task_step_status(self, step_id: str, status: str, result: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update task step status.
        
        Args:
            step_id: Step ID
            status: New status
            result: Optional step result
            
        Returns:
            Success status
        """
        if status == "completed":
            if result:
                query = """
                    UPDATE task_steps
                    SET status = %s, completed_at = CURRENT_TIMESTAMP, result = %s
                    WHERE id = %s
                """
                
                try:
                    self.execute(query, (status, Json(result), step_id))
                    logger.info(f"Updated step {step_id} status to {status} with result")
                    return True
                except Exception as e:
                    logger.error(f"Failed to update step {step_id}: {str(e)}")
                    return False
            else:
                query = """
                    UPDATE task_steps
                    SET status = %s, completed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """
                
                try:
                    self.execute(query, (status, step_id))
                    logger.info(f"Updated step {step_id} status to {status}")
                    return True
                except Exception as e:
                    logger.error(f"Failed to update step {step_id}: {str(e)}")
                    return False
        else:
            query = """
                UPDATE task_steps
                SET status = %s
                WHERE id = %s
            """
            
            try:
                self.execute(query, (status, step_id))
                logger.info(f"Updated step {step_id} status to {status}")
                return True
            except Exception as e:
                logger.error(f"Failed to update step {step_id}: {str(e)}")
                return False
    
    def get_task_steps(self, task_id: str) -> List[Dict[str, Any]]:
        """
        Get all steps for a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            List of step data
        """
        query = """
            SELECT * FROM task_steps
            WHERE task_id = %s
            ORDER BY created_at ASC
        """
        
        return self.execute(query, (task_id,), fetch=True) or []
    
    # Context Bridge Methods
    
    def create_context_bridge(self, from_session_id: str, to_session_id: str, 
                            summary: str, data: Dict[str, Any]) -> str:
        """
        Create a bridge between two sessions to maintain context.
        
        Args:
            from_session_id: Source session ID
            to_session_id: Target session ID
            summary: Context summary
            data: Context data
            
        Returns:
            Bridge ID
        """
        bridge_id = str(uuid.uuid4())
        
        query = """
            INSERT INTO context_bridges (id, from_session_id, to_session_id, context_summary, context_data)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        self.execute(query, (bridge_id, from_session_id, to_session_id, summary, Json(data)))
        
        logger.info(f"Created context bridge {bridge_id} from {from_session_id} to {to_session_id}")
        
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
        if direction == "in":
            query = """
                SELECT * FROM context_bridges
                WHERE to_session_id = %s
                ORDER BY created_at DESC
            """
        else:
            query = """
                SELECT * FROM context_bridges
                WHERE from_session_id = %s
                ORDER BY created_at DESC
            """
        
        return self.execute(query, (session_id,), fetch=True) or []
    
    # Notion Sync Methods
    
    def create_notion_sync(self, task_id: str, notion_page_id: str, 
                         notion_database_id: Optional[str] = None) -> str:
        """
        Create a Notion sync record.
        
        Args:
            task_id: Task ID
            notion_page_id: Notion page ID
            notion_database_id: Optional Notion database ID
            
        Returns:
            Sync ID
        """
        sync_id = str(uuid.uuid4())
        status = "synced"
        
        query = """
            INSERT INTO notion_syncs (id, task_id, notion_page_id, notion_database_id, status)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        self.execute(query, (sync_id, task_id, notion_page_id, notion_database_id, status))
        
        logger.info(f"Created Notion sync {sync_id} for task {task_id}")
        
        return sync_id
    
    def get_task_notion_sync(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get Notion sync record for a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            Sync record or None if not found
        """
        query = """
            SELECT * FROM notion_syncs
            WHERE task_id = %s
            ORDER BY synced_at DESC
            LIMIT 1
        """
        
        return self.execute(query, (task_id,), fetch=True, fetch_one=True)
    
    # Vector Embedding Methods
    
    def store_embedding(self, source_type: str, source_id: str, embedding_id: str, 
                      metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Store a vector embedding reference.
        
        Args:
            source_type: Source type ('message', 'task', 'document')
            source_id: Source ID
            embedding_id: Embedding ID in the vector database
            metadata: Optional metadata
            
        Returns:
            Record ID
        """
        record_id = str(uuid.uuid4())
        
        query = """
            INSERT INTO vector_embeddings (id, source_type, source_id, embedding_id, metadata)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        self.execute(query, (record_id, source_type, source_id, embedding_id, Json(metadata or {})))
        
        logger.info(f"Stored embedding {embedding_id} for {source_type} {source_id}")
        
        return record_id
    
    def get_embedding(self, source_type: str, source_id: str) -> Optional[Dict[str, Any]]:
        """
        Get vector embedding reference for a source.
        
        Args:
            source_type: Source type ('message', 'task', 'document')
            source_id: Source ID
            
        Returns:
            Embedding reference or None if not found
        """
        query = """
            SELECT * FROM vector_embeddings
            WHERE source_type = %s AND source_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """
        
        return self.execute(query, (source_type, source_id), fetch=True, fetch_one=True)
    
    # Utility Methods
    
    def ping(self) -> bool:
        """
        Check PostgreSQL connection.
        
        Returns:
            True if connected, False otherwise
        """
        try:
            conn = self._get_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                return result[0] == 1
        except Exception:
            return False
    
    def close(self) -> None:
        """Close the connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()
            self._conn = None
            logger.info("Closed PostgreSQL connection")
    
    def __del__(self) -> None:
        """Destructor."""
        self.close()