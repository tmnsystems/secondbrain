"""
Context Persistence System: Manages context preservation between agent transitions and
CLI sessions within the SecondBrain architecture.

This module provides the ContextPersistenceManager class, which ensures that context
is properly preserved during agent handoffs, CLI session transitions, and system 
operations. It implements a three-layer persistence architecture (short-term, medium-term,
and long-term) for robust context management.
"""

import json
import time
import uuid
import logging
import asyncio
import hashlib
from typing import Dict, List, Any, Optional, Union, Tuple, Set
from enum import Enum
from dataclasses import dataclass, field, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('context_persistence')

# Context types
class ContextType(str, Enum):
    CLI_SESSION = "cli_session"
    AGENT_STATE = "agent_state"
    TASK = "task"
    WORKFLOW = "workflow"
    MESSAGE = "message"
    TOOL_CALL = "tool_call"
    USER_PROFILE = "user_profile"
    SYSTEM_STATE = "system_state"

# Storage layers
class StorageLayer(str, Enum):
    SHORT_TERM = "short_term"  # Redis
    MEDIUM_TERM = "medium_term"  # PostgreSQL
    LONG_TERM = "long_term"  # Pinecone

@dataclass
class ContextMetadata:
    """Metadata for context objects"""
    context_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    context_type: ContextType = ContextType.CLI_SESSION
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    task_id: Optional[str] = None
    workflow_id: Optional[str] = None
    parent_context_id: Optional[str] = None
    related_context_ids: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    version: int = 1
    storage_layers: List[StorageLayer] = field(default_factory=list)
    notion_page_id: Optional[str] = None
    slack_thread_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = asdict(self)
        # Convert enums to their values
        result["context_type"] = self.context_type.value
        result["storage_layers"] = [layer.value for layer in self.storage_layers]
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ContextMetadata':
        """Create from dictionary representation"""
        # Convert string values to enums
        if "context_type" in data:
            data["context_type"] = ContextType(data["context_type"])
        if "storage_layers" in data:
            data["storage_layers"] = [StorageLayer(layer) for layer in data["storage_layers"]]
        
        return cls(**data)

@dataclass
class ContextObject:
    """A context object that can be persisted across agent transitions and CLI sessions"""
    metadata: ContextMetadata
    content: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        return {
            "metadata": self.metadata.to_dict(),
            "content": self.content
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ContextObject':
        """Create from dictionary representation"""
        metadata = ContextMetadata.from_dict(data["metadata"])
        return cls(metadata=metadata, content=data["content"])
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_json(cls, json_str: str) -> 'ContextObject':
        """Create from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)

class ContextPersistenceManager:
    """
    Manages context persistence across agent transitions and CLI sessions.
    Implements a three-layer persistence architecture:
    1. Short-term (Redis): High-speed access to active contexts
    2. Medium-term (PostgreSQL): Comprehensive structured storage
    3. Long-term (Pinecone): Semantic vector search capabilities
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.logger = logging.getLogger('context_persistence')
        
        # Storage layer clients
        self.redis_client = None
        self.postgres_client = None
        self.pinecone_client = None
        self.notion_client = None
        
        # Context cache
        self.context_cache: Dict[str, ContextObject] = {}
        
        # Initialize clients
        self._initialize_clients()
    
    def _initialize_clients(self) -> None:
        """Initialize storage layer clients"""
        # Initialize Redis client if configured
        if "redis" in self.config:
            try:
                self._initialize_redis_client()
            except Exception as e:
                self.logger.error(f"Failed to initialize Redis client: {str(e)}")
        
        # Initialize PostgreSQL client if configured
        if "postgres" in self.config:
            try:
                self._initialize_postgres_client()
            except Exception as e:
                self.logger.error(f"Failed to initialize PostgreSQL client: {str(e)}")
        
        # Initialize Pinecone client if configured
        if "pinecone" in self.config:
            try:
                self._initialize_pinecone_client()
            except Exception as e:
                self.logger.error(f"Failed to initialize Pinecone client: {str(e)}")
        
        # Initialize Notion client if configured
        if "notion" in self.config:
            try:
                self._initialize_notion_client()
            except Exception as e:
                self.logger.error(f"Failed to initialize Notion client: {str(e)}")
    
    def _initialize_redis_client(self) -> None:
        """Initialize Redis client"""
        try:
            import redis
            
            redis_config = self.config.get("redis", {})
            host = redis_config.get("host", "localhost")
            port = redis_config.get("port", 6379)
            db = redis_config.get("db", 0)
            password = redis_config.get("password")
            
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True
            )
            
            # Test connection
            self.redis_client.ping()
            self.logger.info("Redis client initialized successfully")
            
        except ImportError:
            self.logger.warning("redis package not installed, Redis layer disabled")
            
        except Exception as e:
            self.logger.error(f"Error initializing Redis client: {str(e)}")
            self.redis_client = None
            raise
    
    def _initialize_postgres_client(self) -> None:
        """Initialize PostgreSQL client"""
        try:
            import psycopg2
            
            postgres_config = self.config.get("postgres", {})
            host = postgres_config.get("host", "localhost")
            port = postgres_config.get("port", 5432)
            dbname = postgres_config.get("dbname", "secondbrain")
            user = postgres_config.get("user", "postgres")
            password = postgres_config.get("password", "")
            
            self.postgres_client = psycopg2.connect(
                host=host,
                port=port,
                dbname=dbname,
                user=user,
                password=password
            )
            
            # Initialize tables if they don't exist
            self._initialize_postgres_tables()
            
            self.logger.info("PostgreSQL client initialized successfully")
            
        except ImportError:
            self.logger.warning("psycopg2 package not installed, PostgreSQL layer disabled")
            
        except Exception as e:
            self.logger.error(f"Error initializing PostgreSQL client: {str(e)}")
            self.postgres_client = None
            raise
    
    def _initialize_postgres_tables(self) -> None:
        """Initialize PostgreSQL tables"""
        if not self.postgres_client:
            return
            
        try:
            cursor = self.postgres_client.cursor()
            
            # Create context_metadata table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS context_metadata (
                    context_id VARCHAR(255) PRIMARY KEY,
                    context_type VARCHAR(50) NOT NULL,
                    created_at FLOAT NOT NULL,
                    updated_at FLOAT NOT NULL,
                    expires_at FLOAT,
                    user_id VARCHAR(255),
                    session_id VARCHAR(255),
                    agent_id VARCHAR(255),
                    task_id VARCHAR(255),
                    workflow_id VARCHAR(255),
                    parent_context_id VARCHAR(255),
                    tags JSONB,
                    version INTEGER,
                    notion_page_id VARCHAR(255),
                    slack_thread_id VARCHAR(255)
                )
            """)
            
            # Create context_relationships table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS context_relationships (
                    source_context_id VARCHAR(255) NOT NULL,
                    target_context_id VARCHAR(255) NOT NULL,
                    relationship_type VARCHAR(50),
                    created_at FLOAT NOT NULL,
                    PRIMARY KEY (source_context_id, target_context_id),
                    FOREIGN KEY (source_context_id) REFERENCES context_metadata(context_id),
                    FOREIGN KEY (target_context_id) REFERENCES context_metadata(context_id)
                )
            """)
            
            # Create context_content table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS context_content (
                    context_id VARCHAR(255) PRIMARY KEY,
                    content JSONB NOT NULL,
                    content_hash VARCHAR(64) NOT NULL,
                    FOREIGN KEY (context_id) REFERENCES context_metadata(context_id)
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_context_metadata_context_type ON context_metadata(context_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_context_metadata_session_id ON context_metadata(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_context_metadata_agent_id ON context_metadata(agent_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_context_metadata_task_id ON context_metadata(task_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_context_metadata_workflow_id ON context_metadata(workflow_id)")
            
            self.postgres_client.commit()
            self.logger.info("PostgreSQL tables initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Error initializing PostgreSQL tables: {str(e)}")
            self.postgres_client.rollback()
            raise
    
    def _initialize_pinecone_client(self) -> None:
        """Initialize Pinecone client"""
        try:
            import pinecone
            
            pinecone_config = self.config.get("pinecone", {})
            api_key = pinecone_config.get("api_key")
            environment = pinecone_config.get("environment")
            
            if not api_key or not environment:
                self.logger.warning("Pinecone API key or environment not provided, Pinecone layer disabled")
                return
                
            pinecone.init(api_key=api_key, environment=environment)
            
            # Get or create index
            index_name = pinecone_config.get("index_name", "secondbrain-context")
            dimension = pinecone_config.get("dimension", 1536)  # Default to OpenAI embedding dimension
            
            # Check if index exists
            if index_name not in pinecone.list_indexes():
                # Create index
                pinecone.create_index(
                    name=index_name,
                    dimension=dimension,
                    metric="cosine"
                )
                self.logger.info(f"Created Pinecone index: {index_name}")
            
            # Connect to index
            self.pinecone_client = pinecone.Index(index_name)
            self.logger.info("Pinecone client initialized successfully")
            
        except ImportError:
            self.logger.warning("pinecone-client package not installed, Pinecone layer disabled")
            
        except Exception as e:
            self.logger.error(f"Error initializing Pinecone client: {str(e)}")
            self.pinecone_client = None
            raise
    
    def _initialize_notion_client(self) -> None:
        """Initialize Notion client"""
        try:
            from notion_client import Client
            
            notion_config = self.config.get("notion", {})
            api_key = notion_config.get("api_key")
            
            if not api_key:
                self.logger.warning("Notion API key not provided, Notion integration disabled")
                return
                
            self.notion_client = Client(auth=api_key)
            self.logger.info("Notion client initialized successfully")
            
        except ImportError:
            self.logger.warning("notion_client package not installed, Notion integration disabled")
            
        except Exception as e:
            self.logger.error(f"Error initializing Notion client: {str(e)}")
            self.notion_client = None
            raise
    
    async def store_context(
        self,
        context: ContextObject,
        layers: List[StorageLayer] = None,
    ) -> bool:
        """Store a context object in the specified layers"""
        # Default to all available layers
        if layers is None:
            layers = []
            if self.redis_client:
                layers.append(StorageLayer.SHORT_TERM)
            if self.postgres_client:
                layers.append(StorageLayer.MEDIUM_TERM)
            if self.pinecone_client:
                layers.append(StorageLayer.LONG_TERM)
        
        # Update metadata
        context.metadata.updated_at = time.time()
        context.metadata.storage_layers = layers
        
        # Add to in-memory cache
        self.context_cache[context.metadata.context_id] = context
        
        # Store in each layer
        success = True
        
        if StorageLayer.SHORT_TERM in layers and self.redis_client:
            short_term_success = await self._store_in_redis(context)
            success = success and short_term_success
        
        if StorageLayer.MEDIUM_TERM in layers and self.postgres_client:
            medium_term_success = await self._store_in_postgres(context)
            success = success and medium_term_success
        
        if StorageLayer.LONG_TERM in layers and self.pinecone_client:
            long_term_success = await self._store_in_pinecone(context)
            success = success and long_term_success
        
        # Document in Notion if configured
        if self.notion_client and context.metadata.notion_page_id is None:
            notion_success = await self._document_in_notion(context)
            if notion_success:
                # Update cache with Notion page ID
                self.context_cache[context.metadata.context_id] = context
        
        self.logger.info(
            f"Stored context {context.metadata.context_id} in layers: {[layer.value for layer in layers]}"
        )
        return success
    
    async def _store_in_redis(self, context: ContextObject) -> bool:
        """Store a context object in Redis"""
        if not self.redis_client:
            return False
            
        try:
            context_id = context.metadata.context_id
            context_json = context.to_json()
            
            # Store the context object
            self.redis_client.set(f"context:{context_id}", context_json)
            
            # Set expiry if specified
            if context.metadata.expires_at:
                ttl = max(1, int(context.metadata.expires_at - time.time()))
                self.redis_client.expire(f"context:{context_id}", ttl)
            
            # Add to indices
            self.redis_client.sadd(f"context_type:{context.metadata.context_type.value}", context_id)
            
            if context.metadata.session_id:
                self.redis_client.sadd(f"session:{context.metadata.session_id}", context_id)
                
            if context.metadata.agent_id:
                self.redis_client.sadd(f"agent:{context.metadata.agent_id}", context_id)
                
            if context.metadata.task_id:
                self.redis_client.sadd(f"task:{context.metadata.task_id}", context_id)
                
            if context.metadata.workflow_id:
                self.redis_client.sadd(f"workflow:{context.metadata.workflow_id}", context_id)
                
            # Add tags
            for tag in context.metadata.tags:
                self.redis_client.sadd(f"tag:{tag}", context_id)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing context in Redis: {str(e)}")
            return False
    
    async def _store_in_postgres(self, context: ContextObject) -> bool:
        """Store a context object in PostgreSQL"""
        if not self.postgres_client:
            return False
            
        try:
            cursor = self.postgres_client.cursor()
            metadata = context.metadata
            content_json = json.dumps(context.content)
            content_hash = hashlib.sha256(content_json.encode()).hexdigest()
            
            # Insert or update metadata
            cursor.execute("""
                INSERT INTO context_metadata (
                    context_id, context_type, created_at, updated_at, expires_at,
                    user_id, session_id, agent_id, task_id, workflow_id,
                    parent_context_id, tags, version, notion_page_id, slack_thread_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (context_id) DO UPDATE SET
                    updated_at = EXCLUDED.updated_at,
                    expires_at = EXCLUDED.expires_at,
                    version = EXCLUDED.version,
                    tags = EXCLUDED.tags,
                    notion_page_id = EXCLUDED.notion_page_id,
                    slack_thread_id = EXCLUDED.slack_thread_id
            """, (
                metadata.context_id, metadata.context_type.value, metadata.created_at,
                metadata.updated_at, metadata.expires_at, metadata.user_id,
                metadata.session_id, metadata.agent_id, metadata.task_id,
                metadata.workflow_id, metadata.parent_context_id,
                json.dumps(metadata.tags), metadata.version,
                metadata.notion_page_id, metadata.slack_thread_id
            ))
            
            # Insert or update content
            cursor.execute("""
                INSERT INTO context_content (context_id, content, content_hash)
                VALUES (%s, %s, %s)
                ON CONFLICT (context_id) DO UPDATE SET
                    content = EXCLUDED.content,
                    content_hash = EXCLUDED.content_hash
            """, (
                metadata.context_id, content_json, content_hash
            ))
            
            # Insert relationships
            for related_id in metadata.related_context_ids:
                cursor.execute("""
                    INSERT INTO context_relationships (
                        source_context_id, target_context_id, relationship_type, created_at
                    ) VALUES (%s, %s, %s, %s)
                    ON CONFLICT (source_context_id, target_context_id) DO NOTHING
                """, (
                    metadata.context_id, related_id, "related", time.time()
                ))
            
            # Commit changes
            self.postgres_client.commit()
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing context in PostgreSQL: {str(e)}")
            self.postgres_client.rollback()
            return False
    
    async def _store_in_pinecone(self, context: ContextObject) -> bool:
        """Store a context object in Pinecone"""
        if not self.pinecone_client:
            return False
            
        try:
            # Convert content to vector embedding
            vector_embedding = await self._get_embedding_for_context(context)
            
            if not vector_embedding:
                self.logger.warning(f"No embedding available for context {context.metadata.context_id}")
                return False
            
            # Prepare metadata
            metadata = {
                "context_id": context.metadata.context_id,
                "context_type": context.metadata.context_type.value,
                "created_at": context.metadata.created_at,
                "updated_at": context.metadata.updated_at,
                "user_id": context.metadata.user_id,
                "session_id": context.metadata.session_id,
                "agent_id": context.metadata.agent_id,
                "task_id": context.metadata.task_id,
                "workflow_id": context.metadata.workflow_id,
                "parent_context_id": context.metadata.parent_context_id,
                "tags": context.metadata.tags,
                "version": context.metadata.version,
                "notion_page_id": context.metadata.notion_page_id,
                "slack_thread_id": context.metadata.slack_thread_id,
                # Truncate content to avoid metadata size limits
                "summary": json.dumps(context.content)[:500] if context.content else ""
            }
            
            # Clean up metadata by removing None values
            metadata = {k: v for k, v in metadata.items() if v is not None}
            
            # Upsert the vector
            self.pinecone_client.upsert(
                vectors=[(context.metadata.context_id, vector_embedding, metadata)]
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing context in Pinecone: {str(e)}")
            return False
    
    async def _get_embedding_for_context(self, context: ContextObject) -> Optional[List[float]]:
        """Get a vector embedding for a context object"""
        try:
            import openai
            
            # Check if OpenAI API key is configured
            openai_config = self.config.get("openai", {})
            api_key = openai_config.get("api_key")
            
            if not api_key:
                self.logger.warning("OpenAI API key not provided, cannot generate embeddings")
                return None
                
            openai.api_key = api_key
            
            # Prepare text for embedding
            text_parts = [
                f"Type: {context.metadata.context_type.value}",
                f"ID: {context.metadata.context_id}"
            ]
            
            # Add relevant metadata fields
            if context.metadata.session_id:
                text_parts.append(f"Session: {context.metadata.session_id}")
            if context.metadata.agent_id:
                text_parts.append(f"Agent: {context.metadata.agent_id}")
            if context.metadata.task_id:
                text_parts.append(f"Task: {context.metadata.task_id}")
            if context.metadata.workflow_id:
                text_parts.append(f"Workflow: {context.metadata.workflow_id}")
            
            # Add tags
            if context.metadata.tags:
                text_parts.append(f"Tags: {', '.join(context.metadata.tags)}")
            
            # Add content summary
            if context.content:
                # Convert content to string representation, limiting size
                content_str = json.dumps(context.content)[:1000]
                text_parts.append(f"Content: {content_str}")
            
            # Combine text parts
            text = "\n".join(text_parts)
            
            # Generate embedding
            response = openai.Embedding.create(
                model="text-embedding-ada-002",
                input=text
            )
            
            embedding = response["data"][0]["embedding"]
            return embedding
            
        except ImportError:
            self.logger.warning("openai package not installed, cannot generate embeddings")
            return None
            
        except Exception as e:
            self.logger.error(f"Error generating embedding: {str(e)}")
            return None
    
    async def _document_in_notion(self, context: ContextObject) -> bool:
        """Document a context object in Notion"""
        if not self.notion_client:
            return False
            
        try:
            notion_config = self.config.get("notion", {})
            database_id = notion_config.get("context_database_id")
            
            if not database_id:
                self.logger.warning("No Notion database ID configured for context objects")
                return False
                
            metadata = context.metadata
            
            # Create page properties
            properties = {
                "Title": {
                    "title": [
                        {
                            "text": {
                                "content": f"Context: {metadata.context_id[:8]}"
                            }
                        }
                    ]
                },
                "Type": {
                    "select": {
                        "name": metadata.context_type.value.replace("_", " ").title()
                    }
                },
                "Context ID": {
                    "rich_text": [
                        {
                            "text": {
                                "content": metadata.context_id
                            }
                        }
                    ]
                },
                "Created": {
                    "date": {
                        "start": time.strftime("%Y-%m-%d", time.localtime(metadata.created_at))
                    }
                },
                "Updated": {
                    "date": {
                        "start": time.strftime("%Y-%m-%d", time.localtime(metadata.updated_at))
                    }
                }
            }
            
            # Add optional properties
            if metadata.session_id:
                properties["Session ID"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": metadata.session_id
                            }
                        }
                    ]
                }
                
            if metadata.agent_id:
                properties["Agent ID"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": metadata.agent_id
                            }
                        }
                    ]
                }
                
            if metadata.task_id:
                properties["Task ID"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": metadata.task_id
                            }
                        }
                    ]
                }
                
            if metadata.workflow_id:
                properties["Workflow ID"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": metadata.workflow_id
                            }
                        }
                    ]
                }
                
            if metadata.parent_context_id:
                properties["Parent Context ID"] = {
                    "rich_text": [
                        {
                            "text": {
                                "content": metadata.parent_context_id
                            }
                        }
                    ]
                }
            
            # Create page content
            children = [
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Context Metadata"
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
                                    "content": f"Context ID: {metadata.context_id}"
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
                                    "content": f"Context Type: {metadata.context_type.value}"
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
                                    "content": f"Created: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(metadata.created_at))}"
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
                                    "content": f"Updated: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(metadata.updated_at))}"
                                }
                            }
                        ]
                    }
                }
            ]
            
            # Add relationship information
            if metadata.parent_context_id or metadata.related_context_ids:
                children.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Relationships"
                                }
                            }
                        ]
                    }
                })
                
                if metadata.parent_context_id:
                    children.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": f"Parent Context: {metadata.parent_context_id}"
                                    }
                                }
                            ]
                        }
                    })
                    
                if metadata.related_context_ids:
                    children.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": f"Related Contexts: {', '.join(metadata.related_context_ids)}"
                                    }
                                }
                            ]
                        }
                    })
            
            # Add tags
            if metadata.tags:
                children.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Tags"
                                }
                            }
                        ]
                    }
                })
                
                children.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": ", ".join(metadata.tags)
                                }
                            }
                        ]
                    }
                })
            
            # Add content
            if context.content:
                children.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Content"
                                }
                            }
                        ]
                    }
                })
                
                children.append({
                    "object": "block",
                    "type": "code",
                    "code": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": json.dumps(context.content, indent=2)
                                }
                            }
                        ],
                        "language": "json"
                    }
                })
            
            # Create the page
            page = self.notion_client.pages.create(
                parent={"database_id": database_id},
                properties=properties,
                children=children
            )
            
            # Update metadata with Notion page ID
            context.metadata.notion_page_id = page.id
            self.logger.info(f"Documented context {metadata.context_id} in Notion page {page.id}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error documenting context in Notion: {str(e)}")
            return False
    
    async def get_context(
        self,
        context_id: str,
        populate_related: bool = False
    ) -> Optional[ContextObject]:
        """Get a context object by ID"""
        # Check in-memory cache first
        if context_id in self.context_cache:
            self.logger.info(f"Retrieved context {context_id} from cache")
            return self.context_cache[context_id]
        
        # Try getting from short-term storage (Redis)
        if self.redis_client:
            context = await self._get_from_redis(context_id)
            if context:
                self.context_cache[context_id] = context
                self.logger.info(f"Retrieved context {context_id} from Redis")
                
                # Populate related contexts if requested
                if populate_related and context.metadata.related_context_ids:
                    await self._populate_related_contexts(context)
                    
                return context
        
        # Try getting from medium-term storage (PostgreSQL)
        if self.postgres_client:
            context = await self._get_from_postgres(context_id)
            if context:
                self.context_cache[context_id] = context
                self.logger.info(f"Retrieved context {context_id} from PostgreSQL")
                
                # Store in Redis for faster access next time
                if self.redis_client:
                    await self._store_in_redis(context)
                
                # Populate related contexts if requested
                if populate_related and context.metadata.related_context_ids:
                    await self._populate_related_contexts(context)
                    
                return context
        
        # Try getting from long-term storage (Pinecone)
        if self.pinecone_client:
            context = await self._get_from_pinecone(context_id)
            if context:
                self.context_cache[context_id] = context
                self.logger.info(f"Retrieved context {context_id} from Pinecone")
                
                # Store in Redis and PostgreSQL for faster access next time
                if self.redis_client:
                    await self._store_in_redis(context)
                if self.postgres_client:
                    await self._store_in_postgres(context)
                
                # Populate related contexts if requested
                if populate_related and context.metadata.related_context_ids:
                    await self._populate_related_contexts(context)
                    
                return context
        
        self.logger.warning(f"Context {context_id} not found in any storage layer")
        return None
    
    async def _get_from_redis(self, context_id: str) -> Optional[ContextObject]:
        """Get a context object from Redis"""
        if not self.redis_client:
            return None
            
        try:
            context_json = self.redis_client.get(f"context:{context_id}")
            if not context_json:
                return None
                
            return ContextObject.from_json(context_json)
            
        except Exception as e:
            self.logger.error(f"Error getting context from Redis: {str(e)}")
            return None
    
    async def _get_from_postgres(self, context_id: str) -> Optional[ContextObject]:
        """Get a context object from PostgreSQL"""
        if not self.postgres_client:
            return None
            
        try:
            cursor = self.postgres_client.cursor()
            
            # Get metadata
            cursor.execute("""
                SELECT context_type, created_at, updated_at, expires_at,
                       user_id, session_id, agent_id, task_id, workflow_id,
                       parent_context_id, tags, version, notion_page_id, slack_thread_id
                FROM context_metadata
                WHERE context_id = %s
            """, (context_id,))
            
            metadata_row = cursor.fetchone()
            if not metadata_row:
                return None
                
            # Create metadata object
            metadata = ContextMetadata(
                context_id=context_id,
                context_type=ContextType(metadata_row[0]),
                created_at=metadata_row[1],
                updated_at=metadata_row[2],
                expires_at=metadata_row[3],
                user_id=metadata_row[4],
                session_id=metadata_row[5],
                agent_id=metadata_row[6],
                task_id=metadata_row[7],
                workflow_id=metadata_row[8],
                parent_context_id=metadata_row[9],
                tags=json.loads(metadata_row[10]) if metadata_row[10] else [],
                version=metadata_row[11],
                notion_page_id=metadata_row[12],
                slack_thread_id=metadata_row[13]
            )
            
            # Get content
            cursor.execute("""
                SELECT content
                FROM context_content
                WHERE context_id = %s
            """, (context_id,))
            
            content_row = cursor.fetchone()
            if not content_row:
                # Create context with empty content
                return ContextObject(metadata=metadata)
                
            content = json.loads(content_row[0])
            
            # Get related context IDs
            cursor.execute("""
                SELECT target_context_id
                FROM context_relationships
                WHERE source_context_id = %s
            """, (context_id,))
            
            related_ids = [row[0] for row in cursor.fetchall()]
            metadata.related_context_ids = related_ids
            
            return ContextObject(metadata=metadata, content=content)
            
        except Exception as e:
            self.logger.error(f"Error getting context from PostgreSQL: {str(e)}")
            return None
    
    async def _get_from_pinecone(self, context_id: str) -> Optional[ContextObject]:
        """Get a context object from Pinecone"""
        if not self.pinecone_client:
            return None
            
        try:
            # Query the vector by ID
            response = self.pinecone_client.fetch(ids=[context_id])
            
            if not response or not response.get("vectors") or context_id not in response["vectors"]:
                return None
                
            vector_data = response["vectors"][context_id]
            metadata = vector_data.get("metadata", {})
            
            # Create metadata object
            context_metadata = ContextMetadata(
                context_id=context_id,
                context_type=ContextType(metadata.get("context_type", ContextType.CLI_SESSION.value)),
                created_at=metadata.get("created_at", time.time()),
                updated_at=metadata.get("updated_at", time.time()),
                user_id=metadata.get("user_id"),
                session_id=metadata.get("session_id"),
                agent_id=metadata.get("agent_id"),
                task_id=metadata.get("task_id"),
                workflow_id=metadata.get("workflow_id"),
                parent_context_id=metadata.get("parent_context_id"),
                tags=metadata.get("tags", []),
                version=metadata.get("version", 1),
                notion_page_id=metadata.get("notion_page_id"),
                slack_thread_id=metadata.get("slack_thread_id")
            )
            
            # Extract content from summary if available
            content = {}
            if "summary" in metadata:
                try:
                    content = json.loads(metadata["summary"])
                except json.JSONDecodeError:
                    # Use summary as a string if it can't be parsed as JSON
                    content = {"summary": metadata["summary"]}
            
            return ContextObject(metadata=context_metadata, content=content)
            
        except Exception as e:
            self.logger.error(f"Error getting context from Pinecone: {str(e)}")
            return None
    
    async def _populate_related_contexts(self, context: ContextObject) -> None:
        """Populate related contexts for a context object"""
        related_ids = context.metadata.related_context_ids.copy()
        related_contexts = {}
        
        for related_id in related_ids:
            related_context = await self.get_context(related_id, populate_related=False)
            if related_context:
                related_contexts[related_id] = related_context
        
        # Add related contexts to the content
        if related_contexts:
            if "related_contexts" not in context.content:
                context.content["related_contexts"] = {}
                
            for related_id, related_context in related_contexts.items():
                context.content["related_contexts"][related_id] = {
                    "context_type": related_context.metadata.context_type.value,
                    "created_at": related_context.metadata.created_at,
                    "updated_at": related_context.metadata.updated_at,
                    "summary": related_context.content.get("summary", "")
                }
    
    async def find_contexts(
        self,
        query: Dict[str, Any],
        limit: int = 10,
        search_type: str = "filter"
    ) -> List[ContextObject]:
        """Find context objects matching a query"""
        results = []
        
        if search_type == "filter":
            # Use filter-based search
            
            # Try medium-term storage first (PostgreSQL)
            if self.postgres_client:
                postgres_results = await self._find_in_postgres(query, limit)
                results.extend(postgres_results)
                
                if len(results) >= limit:
                    return results[:limit]
            
            # Try short-term storage (Redis)
            if self.redis_client and len(results) < limit:
                redis_results = await self._find_in_redis(query, limit - len(results))
                
                # Add unique results
                existing_ids = {ctx.metadata.context_id for ctx in results}
                for ctx in redis_results:
                    if ctx.metadata.context_id not in existing_ids:
                        results.append(ctx)
                        existing_ids.add(ctx.metadata.context_id)
                
                if len(results) >= limit:
                    return results[:limit]
            
            # Try long-term storage (Pinecone)
            if self.pinecone_client and len(results) < limit:
                pinecone_results = await self._find_in_pinecone_filter(query, limit - len(results))
                
                # Add unique results
                existing_ids = {ctx.metadata.context_id for ctx in results}
                for ctx in pinecone_results:
                    if ctx.metadata.context_id not in existing_ids:
                        results.append(ctx)
                        existing_ids.add(ctx.metadata.context_id)
        
        elif search_type == "semantic":
            # Use semantic search (vector similarity)
            if self.pinecone_client:
                semantic_results = await self._find_in_pinecone_semantic(query, limit)
                results.extend(semantic_results)
        
        else:
            self.logger.warning(f"Unknown search type: {search_type}")
        
        return results[:limit]
    
    async def _find_in_redis(self, query: Dict[str, Any], limit: int) -> List[ContextObject]:
        """Find context objects in Redis matching a query"""
        if not self.redis_client:
            return []
            
        try:
            # Build sets of matching IDs for each query parameter
            matching_sets = []
            
            if "context_type" in query:
                context_type = query["context_type"]
                if isinstance(context_type, ContextType):
                    context_type = context_type.value
                matching_sets.append(f"context_type:{context_type}")
            
            if "session_id" in query:
                matching_sets.append(f"session:{query['session_id']}")
                
            if "agent_id" in query:
                matching_sets.append(f"agent:{query['agent_id']}")
                
            if "task_id" in query:
                matching_sets.append(f"task:{query['task_id']}")
                
            if "workflow_id" in query:
                matching_sets.append(f"workflow:{query['workflow_id']}")
                
            if "tags" in query and query["tags"]:
                for tag in query["tags"]:
                    matching_sets.append(f"tag:{tag}")
            
            # Intersect the sets to find matching IDs
            if not matching_sets:
                return []
                
            if len(matching_sets) == 1:
                matching_ids = self.redis_client.smembers(matching_sets[0])
            else:
                matching_ids = self.redis_client.sinter(*matching_sets)
            
            # Get context objects for matching IDs
            results = []
            for context_id in list(matching_ids)[:limit]:
                context = await self._get_from_redis(context_id)
                if context:
                    results.append(context)
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error finding contexts in Redis: {str(e)}")
            return []
    
    async def _find_in_postgres(self, query: Dict[str, Any], limit: int) -> List[ContextObject]:
        """Find context objects in PostgreSQL matching a query"""
        if not self.postgres_client:
            return []
            
        try:
            cursor = self.postgres_client.cursor()
            
            # Build query conditions
            conditions = []
            params = []
            
            if "context_type" in query:
                context_type = query["context_type"]
                if isinstance(context_type, ContextType):
                    context_type = context_type.value
                conditions.append("context_type = %s")
                params.append(context_type)
            
            if "session_id" in query:
                conditions.append("session_id = %s")
                params.append(query["session_id"])
                
            if "agent_id" in query:
                conditions.append("agent_id = %s")
                params.append(query["agent_id"])
                
            if "task_id" in query:
                conditions.append("task_id = %s")
                params.append(query["task_id"])
                
            if "workflow_id" in query:
                conditions.append("workflow_id = %s")
                params.append(query["workflow_id"])
                
            if "parent_context_id" in query:
                conditions.append("parent_context_id = %s")
                params.append(query["parent_context_id"])
                
            if "tags" in query and query["tags"]:
                conditions.append("tags @> %s")
                params.append(json.dumps(query["tags"]))
                
            if "created_after" in query:
                conditions.append("created_at >= %s")
                params.append(query["created_after"])
                
            if "created_before" in query:
                conditions.append("created_at <= %s")
                params.append(query["created_before"])
                
            if "updated_after" in query:
                conditions.append("updated_at >= %s")
                params.append(query["updated_after"])
                
            if "updated_before" in query:
                conditions.append("updated_at <= %s")
                params.append(query["updated_before"])
            
            # Build the SQL query
            sql = """
                SELECT cm.context_id, cm.context_type, cm.created_at, cm.updated_at, cm.expires_at,
                       cm.user_id, cm.session_id, cm.agent_id, cm.task_id, cm.workflow_id,
                       cm.parent_context_id, cm.tags, cm.version, cm.notion_page_id, cm.slack_thread_id,
                       cc.content
                FROM context_metadata cm
                LEFT JOIN context_content cc ON cm.context_id = cc.context_id
            """
            
            if conditions:
                sql += " WHERE " + " AND ".join(conditions)
                
            sql += " ORDER BY cm.updated_at DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            # Get related context IDs for each result
            results = []
            for row in rows:
                context_id = row[0]
                
                # Create metadata object
                metadata = ContextMetadata(
                    context_id=context_id,
                    context_type=ContextType(row[1]),
                    created_at=row[2],
                    updated_at=row[3],
                    expires_at=row[4],
                    user_id=row[5],
                    session_id=row[6],
                    agent_id=row[7],
                    task_id=row[8],
                    workflow_id=row[9],
                    parent_context_id=row[10],
                    tags=json.loads(row[11]) if row[11] else [],
                    version=row[12],
                    notion_page_id=row[13],
                    slack_thread_id=row[14]
                )
                
                # Get content
                content = json.loads(row[15]) if row[15] else {}
                
                # Get related context IDs
                cursor.execute("""
                    SELECT target_context_id
                    FROM context_relationships
                    WHERE source_context_id = %s
                """, (context_id,))
                
                related_ids = [rel_row[0] for rel_row in cursor.fetchall()]
                metadata.related_context_ids = related_ids
                
                # Create context object
                context = ContextObject(metadata=metadata, content=content)
                results.append(context)
                
                # Add to cache
                self.context_cache[context_id] = context
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error finding contexts in PostgreSQL: {str(e)}")
            return []
    
    async def _find_in_pinecone_filter(self, query: Dict[str, Any], limit: int) -> List[ContextObject]:
        """Find context objects in Pinecone using metadata filters"""
        if not self.pinecone_client:
            return []
            
        try:
            # Build filter conditions
            filter_dict = {}
            
            if "context_type" in query:
                context_type = query["context_type"]
                if isinstance(context_type, ContextType):
                    context_type = context_type.value
                filter_dict["context_type"] = {"$eq": context_type}
            
            if "session_id" in query:
                filter_dict["session_id"] = {"$eq": query["session_id"]}
                
            if "agent_id" in query:
                filter_dict["agent_id"] = {"$eq": query["agent_id"]}
                
            if "task_id" in query:
                filter_dict["task_id"] = {"$eq": query["task_id"]}
                
            if "workflow_id" in query:
                filter_dict["workflow_id"] = {"$eq": query["workflow_id"]}
                
            if "parent_context_id" in query:
                filter_dict["parent_context_id"] = {"$eq": query["parent_context_id"]}
                
            if "tags" in query and query["tags"]:
                filter_dict["tags"] = {"$in": query["tags"]}
                
            if "created_after" in query:
                filter_dict["created_at"] = {"$gte": query["created_after"]}
                
            if "created_before" in query:
                if "created_at" in filter_dict:
                    filter_dict["created_at"]["$lte"] = query["created_before"]
                else:
                    filter_dict["created_at"] = {"$lte": query["created_before"]}
                
            if "updated_after" in query:
                filter_dict["updated_at"] = {"$gte": query["updated_after"]}
                
            if "updated_before" in query:
                if "updated_at" in filter_dict:
                    filter_dict["updated_at"]["$lte"] = query["updated_before"]
                else:
                    filter_dict["updated_at"] = {"$lte": query["updated_before"]}
            
            # Run a query with a dummy vector but metadata filtering
            # Create a placeholder vector of the right dimension
            dimension = self.config.get("pinecone", {}).get("dimension", 1536)
            dummy_vector = [0.0] * dimension
            
            response = self.pinecone_client.query(
                vector=dummy_vector,
                filter=filter_dict,
                top_k=limit,
                include_metadata=True
            )
            
            # Process results
            results = []
            for match in response.get("matches", []):
                context_id = match["id"]
                metadata = match.get("metadata", {})
                
                # Create metadata object
                context_metadata = ContextMetadata(
                    context_id=context_id,
                    context_type=ContextType(metadata.get("context_type", ContextType.CLI_SESSION.value)),
                    created_at=metadata.get("created_at", time.time()),
                    updated_at=metadata.get("updated_at", time.time()),
                    user_id=metadata.get("user_id"),
                    session_id=metadata.get("session_id"),
                    agent_id=metadata.get("agent_id"),
                    task_id=metadata.get("task_id"),
                    workflow_id=metadata.get("workflow_id"),
                    parent_context_id=metadata.get("parent_context_id"),
                    tags=metadata.get("tags", []),
                    version=metadata.get("version", 1),
                    notion_page_id=metadata.get("notion_page_id"),
                    slack_thread_id=metadata.get("slack_thread_id")
                )
                
                # Extract content from summary if available
                content = {}
                if "summary" in metadata:
                    try:
                        content = json.loads(metadata["summary"])
                    except json.JSONDecodeError:
                        # Use summary as a string if it can't be parsed as JSON
                        content = {"summary": metadata["summary"]}
                
                # Create context object
                context = ContextObject(metadata=context_metadata, content=content)
                results.append(context)
                
                # Add to cache
                self.context_cache[context_id] = context
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error finding contexts in Pinecone (filter): {str(e)}")
            return []
    
    async def _find_in_pinecone_semantic(self, query: Dict[str, Any], limit: int) -> List[ContextObject]:
        """Find context objects in Pinecone using semantic search"""
        if not self.pinecone_client:
            return []
            
        try:
            # Get query text and filters
            query_text = query.get("text", "")
            if not query_text:
                return []
                
            # Generate embedding for query text
            embedding = await self._get_embedding_for_text(query_text)
            if not embedding:
                self.logger.warning("No embedding available for query text")
                return []
            
            # Build filter conditions
            filter_dict = {}
            
            if "context_type" in query:
                context_type = query["context_type"]
                if isinstance(context_type, ContextType):
                    context_type = context_type.value
                filter_dict["context_type"] = {"$eq": context_type}
            
            if "session_id" in query:
                filter_dict["session_id"] = {"$eq": query["session_id"]}
                
            if "agent_id" in query:
                filter_dict["agent_id"] = {"$eq": query["agent_id"]}
                
            if "task_id" in query:
                filter_dict["task_id"] = {"$eq": query["task_id"]}
                
            if "workflow_id" in query:
                filter_dict["workflow_id"] = {"$eq": query["workflow_id"]}
                
            if "tags" in query and query["tags"]:
                filter_dict["tags"] = {"$in": query["tags"]}
            
            # Run the query
            response = self.pinecone_client.query(
                vector=embedding,
                filter=filter_dict if filter_dict else None,
                top_k=limit,
                include_metadata=True
            )
            
            # Process results
            results = []
            for match in response.get("matches", []):
                context_id = match["id"]
                metadata = match.get("metadata", {})
                score = match.get("score", 0.0)
                
                # Create metadata object
                context_metadata = ContextMetadata(
                    context_id=context_id,
                    context_type=ContextType(metadata.get("context_type", ContextType.CLI_SESSION.value)),
                    created_at=metadata.get("created_at", time.time()),
                    updated_at=metadata.get("updated_at", time.time()),
                    user_id=metadata.get("user_id"),
                    session_id=metadata.get("session_id"),
                    agent_id=metadata.get("agent_id"),
                    task_id=metadata.get("task_id"),
                    workflow_id=metadata.get("workflow_id"),
                    parent_context_id=metadata.get("parent_context_id"),
                    tags=metadata.get("tags", []),
                    version=metadata.get("version", 1),
                    notion_page_id=metadata.get("notion_page_id"),
                    slack_thread_id=metadata.get("slack_thread_id")
                )
                
                # Extract content from summary if available
                content = {
                    "_search_score": score,
                    "_search_query": query_text
                }
                
                if "summary" in metadata:
                    try:
                        summary_content = json.loads(metadata["summary"])
                        content.update(summary_content)
                    except json.JSONDecodeError:
                        # Use summary as a string if it can't be parsed as JSON
                        content["summary"] = metadata["summary"]
                
                # Create context object
                context = ContextObject(metadata=context_metadata, content=content)
                results.append(context)
                
                # Add to cache
                self.context_cache[context_id] = context
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error finding contexts in Pinecone (semantic): {str(e)}")
            return []
    
    async def _get_embedding_for_text(self, text: str) -> Optional[List[float]]:
        """Get a vector embedding for text"""
        try:
            import openai
            
            # Check if OpenAI API key is configured
            openai_config = self.config.get("openai", {})
            api_key = openai_config.get("api_key")
            
            if not api_key:
                self.logger.warning("OpenAI API key not provided, cannot generate embeddings")
                return None
                
            openai.api_key = api_key
            
            # Generate embedding
            response = openai.Embedding.create(
                model="text-embedding-ada-002",
                input=text
            )
            
            embedding = response["data"][0]["embedding"]
            return embedding
            
        except ImportError:
            self.logger.warning("openai package not installed, cannot generate embeddings")
            return None
            
        except Exception as e:
            self.logger.error(f"Error generating embedding: {str(e)}")
            return None
    
    async def create_context_bridge(
        self,
        source_context_id: str,
        target_context_id: str,
        bidirectional: bool = True
    ) -> bool:
        """Create a bridge between two context objects"""
        # Get the source and target contexts
        source_context = await self.get_context(source_context_id)
        target_context = await self.get_context(target_context_id)
        
        if not source_context or not target_context:
            self.logger.warning(f"Cannot create bridge: source or target context not found")
            return False
        
        # Add relationship to source context
        if target_context_id not in source_context.metadata.related_context_ids:
            source_context.metadata.related_context_ids.append(target_context_id)
            source_context.metadata.updated_at = time.time()
            
            # Update in storage
            await self.store_context(source_context)
        
        # Add relationship to target context if bidirectional
        if bidirectional and source_context_id not in target_context.metadata.related_context_ids:
            target_context.metadata.related_context_ids.append(source_context_id)
            target_context.metadata.updated_at = time.time()
            
            # Update in storage
            await self.store_context(target_context)
        
        # Create relationship in PostgreSQL
        if self.postgres_client:
            try:
                cursor = self.postgres_client.cursor()
                
                # Insert source -> target relationship
                cursor.execute("""
                    INSERT INTO context_relationships (
                        source_context_id, target_context_id, relationship_type, created_at
                    ) VALUES (%s, %s, %s, %s)
                    ON CONFLICT (source_context_id, target_context_id) DO NOTHING
                """, (
                    source_context_id, target_context_id, "related", time.time()
                ))
                
                # Insert target -> source relationship if bidirectional
                if bidirectional:
                    cursor.execute("""
                        INSERT INTO context_relationships (
                            source_context_id, target_context_id, relationship_type, created_at
                        ) VALUES (%s, %s, %s, %s)
                        ON CONFLICT (source_context_id, target_context_id) DO NOTHING
                    """, (
                        target_context_id, source_context_id, "related", time.time()
                    ))
                
                self.postgres_client.commit()
                
            except Exception as e:
                self.logger.error(f"Error creating relationship in PostgreSQL: {str(e)}")
                self.postgres_client.rollback()
        
        self.logger.info(f"Created bridge between contexts {source_context_id} and {target_context_id}")
        return True
    
    async def create_cli_session_context(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        parent_session_id: Optional[str] = None,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> ContextObject:
        """Create a new CLI session context"""
        # Create metadata
        metadata = ContextMetadata(
            context_type=ContextType.CLI_SESSION,
            session_id=session_id,
            user_id=user_id,
            parent_context_id=parent_session_id
        )
        
        # Create context object
        context = ContextObject(
            metadata=metadata,
            content=initial_context or {}
        )
        
        # Store in all available layers
        await self.store_context(context)
        
        # Create bridge to parent session if specified
        if parent_session_id:
            await self.create_context_bridge(parent_session_id, context.metadata.context_id)
        
        self.logger.info(f"Created CLI session context {context.metadata.context_id} for session {session_id}")
        return context
    
    async def update_cli_session_context(
        self,
        session_id: str,
        updates: Dict[str, Any]
    ) -> Optional[ContextObject]:
        """Update a CLI session context"""
        # Find the context for this session
        results = await self.find_contexts({
            "context_type": ContextType.CLI_SESSION,
            "session_id": session_id
        }, limit=1)
        
        if not results:
            self.logger.warning(f"No context found for CLI session {session_id}")
            return None
            
        context = results[0]
        
        # Update content
        context.content.update(updates)
        context.metadata.updated_at = time.time()
        
        # Store updates
        await self.store_context(context)
        
        self.logger.info(f"Updated CLI session context for session {session_id}")
        return context
    
    async def handle_session_compaction(
        self,
        old_session_id: str,
        new_session_id: str,
        compaction_reason: str,
        summary: Dict[str, Any]
    ) -> Optional[ContextObject]:
        """Handle a CLI session compaction event"""
        # Find the context for the old session
        old_results = await self.find_contexts({
            "context_type": ContextType.CLI_SESSION,
            "session_id": old_session_id
        }, limit=1)
        
        if not old_results:
            self.logger.warning(f"No context found for old CLI session {old_session_id}")
            return None
            
        old_context = old_results[0]
        
        # Create a new context for the new session
        new_metadata = ContextMetadata(
            context_type=ContextType.CLI_SESSION,
            session_id=new_session_id,
            user_id=old_context.metadata.user_id,
            parent_context_id=old_context.metadata.context_id,
            tags=old_context.metadata.tags + ["compaction"]
        )
        
        # Combine the old context with the summary
        new_content = {
            "previous_session": old_session_id,
            "compaction_reason": compaction_reason,
            "compaction_time": time.time(),
            "summary": summary
        }
        
        # Copy important content from the old context
        if "tasks" in old_context.content:
            new_content["tasks"] = old_context.content["tasks"]
            
        if "context" in old_context.content:
            new_content["context"] = old_context.content["context"]
            
        if "agent_state" in old_context.content:
            new_content["agent_state"] = old_context.content["agent_state"]
        
        # Create the new context
        new_context = ContextObject(
            metadata=new_metadata,
            content=new_content
        )
        
        # Store in all available layers
        await self.store_context(new_context)
        
        # Create bidirectional bridge between old and new contexts
        await self.create_context_bridge(
            old_context.metadata.context_id,
            new_context.metadata.context_id
        )
        
        self.logger.info(
            f"Handled session compaction from {old_session_id} to {new_session_id}"
        )
        return new_context
    
    async def log_agent_transition(
        self,
        from_agent_id: str,
        to_agent_id: str,
        task_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        session_id: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None
    ) -> ContextObject:
        """Log an agent transition for context preservation"""
        # Create a context for the transition
        transition_id = str(uuid.uuid4())
        
        metadata = ContextMetadata(
            context_id=transition_id,
            context_type=ContextType.AGENT_STATE,
            agent_id=to_agent_id,  # Target agent
            task_id=task_id,
            workflow_id=workflow_id,
            session_id=session_id,
            tags=["agent_transition"]
        )
        
        content = {
            "transition_type": "agent_handoff",
            "from_agent": from_agent_id,
            "to_agent": to_agent_id,
            "transition_time": time.time(),
            "data": context_data or {}
        }
        
        context = ContextObject(
            metadata=metadata,
            content=content
        )
        
        # Store in all available layers
        await self.store_context(context)
        
        # Find contexts for both agents
        from_contexts = await self.find_contexts({
            "agent_id": from_agent_id,
            "context_type": ContextType.AGENT_STATE
        }, limit=1)
        
        to_contexts = await self.find_contexts({
            "agent_id": to_agent_id,
            "context_type": ContextType.AGENT_STATE
        }, limit=1)
        
        # Create bridges between transition and agent contexts
        if from_contexts:
            await self.create_context_bridge(
                from_contexts[0].metadata.context_id,
                context.metadata.context_id
            )
            
        if to_contexts:
            await self.create_context_bridge(
                context.metadata.context_id,
                to_contexts[0].metadata.context_id
            )
            
        self.logger.info(f"Logged agent transition from {from_agent_id} to {to_agent_id}")
        return context