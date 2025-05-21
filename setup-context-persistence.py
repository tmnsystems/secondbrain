#!/usr/bin/env python3
"""
SecondBrain Context Persistence System - Infrastructure Setup Script
This script configures the three-layer persistence architecture:
1. Redis Cloud (already configured)
2. Pinecone (already configured)
3. PostgreSQL (needs to be set up)

The script validates existing credentials and creates the necessary schemas.
"""

import os
import sys
import json
import time
import redis
import pinecone
import requests
from dotenv import load_dotenv

# Load environment variables
def load_env():
    """Load API keys from environment file."""
    env_path = "/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env"
    if os.path.exists(env_path):
        print(f"Loading API keys from {env_path}")
        load_dotenv(env_path)
        return True
    else:
        print(f"Error: API keys file not found at {env_path}")
        return False

# Validate Redis connection
def validate_redis():
    """Test Redis connection and validate credentials."""
    print("\n=== Validating Redis Cloud Connection ===")
    try:
        redis_host = os.getenv('REDIS_HOST')
        redis_port = os.getenv('REDIS_PORT')
        redis_password = os.getenv('REDIS_PASSWORD')
        redis_username = os.getenv('REDIS_USERNAME', 'default')
        
        # If no password explicitly defined, try to extract from URL
        if not redis_password and os.getenv('REDIS_URL'):
            # Parse from redis://default:password@host:port format
            url_parts = os.getenv('REDIS_URL').split('@')
            if len(url_parts) > 1:
                auth_parts = url_parts[0].split(':')
                if len(auth_parts) > 2:
                    redis_password = auth_parts[2]
        
        if not redis_host or not redis_port:
            print("Error: Missing Redis host or port configuration")
            return False
            
        print(f"Connecting to Redis at {redis_host}:{redis_port}...")
        
        # Create Redis client with detailed connection info for better error reporting
        r = redis.Redis(
            host=redis_host,
            port=redis_port,
            username=redis_username,
            password=redis_password,
            socket_timeout=5,
            decode_responses=True
        )
        
        # Test connection with ping
        response = r.ping()
        if response:
            print("✅ Successfully connected to Redis Cloud")
            
            # Create test key to verify write access
            test_key = "secondbrain:context:test"
            r.set(test_key, "Context persistence test successful")
            test_result = r.get(test_key)
            
            if test_result == "Context persistence test successful":
                print("✅ Redis write/read test successful")
                r.delete(test_key)
                return True
            else:
                print("❌ Redis write/read test failed")
                return False
        else:
            print("❌ Failed to ping Redis server")
            return False
    except Exception as e:
        print(f"❌ Redis connection error: {e}")
        return False

# Validate Pinecone connection
def validate_pinecone():
    """Test Pinecone connection and validate index."""
    print("\n=== Validating Pinecone Connection ===")
    try:
        pinecone_api_key = os.getenv('PINECONE_API_KEY')
        pinecone_environment = os.getenv('PINECONE_ENVIRONMENT')
        pinecone_index = os.getenv('PINECONE_INDEX')
        
        if not pinecone_api_key or not pinecone_environment:
            print("Error: Missing Pinecone API key or environment")
            return False
            
        print(f"Initializing Pinecone with environment {pinecone_environment}...")
        pinecone.init(api_key=pinecone_api_key, environment=pinecone_environment)
        
        # Check if our index exists
        available_indexes = pinecone.list_indexes()
        print(f"Available Pinecone indexes: {available_indexes}")
        
        if pinecone_index in available_indexes:
            print(f"✅ Found existing index: {pinecone_index}")
            
            # Connect to the index
            index = pinecone.Index(pinecone_index)
            stats = index.describe_index_stats()
            print(f"Index stats: {json.dumps(stats, indent=2)}")
            
            # Create context namespaces if they don't exist
            # Note: In Pinecone, namespaces are created implicitly when vectors are inserted
            required_namespaces = ['contexts', 'context_chunks']
            print(f"Will use namespaces: {', '.join(required_namespaces)}")
            
            return True
        else:
            print(f"❌ Pinecone index '{pinecone_index}' not found")
            print("Creating a new Pinecone index for context storage...")
            
            # Create a new index for context storage with the right dimensions for OpenAI embeddings
            pinecone.create_index(
                name="secondbrain-context",
                dimension=1536,  # OpenAI's text-embedding-ada-002 is 1536 dimensions
                metric="cosine",
                pod_type="p1.x1"  # Starting with the smallest pod type
            )
            
            # Wait for the index to be ready
            while not "secondbrain-context" in pinecone.list_indexes():
                print("Waiting for index to be ready...")
                time.sleep(5)
                
            print("✅ Created new Pinecone index: secondbrain-context")
            
            # Update the .env file with the new index name
            update_env_file("PINECONE_INDEX", "secondbrain-context")
            
            return True
    except Exception as e:
        print(f"❌ Pinecone error: {e}")
        return False

# Helper function to update environment variables
def update_env_file(key, value):
    """Update a value in the .env file."""
    env_path = "/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env"
    updated_lines = []
    key_exists = False
    
    # Read the existing file
    with open(env_path, 'r') as f:
        lines = f.readlines()
        
    # Update or add the key
    for line in lines:
        if line.strip().startswith(f"{key}="):
            updated_lines.append(f"{key}={value}\n")
            key_exists = True
        else:
            updated_lines.append(line)
    
    # Add the key if it doesn't exist
    if not key_exists:
        updated_lines.append(f"{key}={value}\n")
    
    # Write back to the file
    with open(env_path, 'w') as f:
        f.writelines(updated_lines)
        
    print(f"Updated {env_path} with {key}={value}")

# Configure PostgreSQL (this would typically be on a remote server)
def configure_postgresql():
    """Configure PostgreSQL database schema for context storage."""
    print("\n=== PostgreSQL Setup ===")
    print("Since PostgreSQL is not installed locally, we'll create the schema definition file.")
    
    schema_path = "/Volumes/Envoy/SecondBrain/context_database_schema.sql"
    
    # Define the schema based on our implementation plan
    schema_sql = """
-- Context Persistence System PostgreSQL Schema
-- NEVER TRUNCATE OR SIMPLIFY: This schema is designed to preserve the full context of all content

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  source VARCHAR(50), -- 'cli', 'slack', 'web'
  context_level VARCHAR(20) DEFAULT 'full' -- 'full', 'extended'
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'agent'
  content TEXT NOT NULL, -- Full message content, never truncated
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  agent_id UUID,  -- NULL for user/assistant
  parent_id UUID REFERENCES messages(id), -- for threading
  has_context BOOLEAN DEFAULT FALSE
);

-- Context table (comprehensive, never truncated)
CREATE TABLE contexts (
  id UUID PRIMARY KEY,
  pattern_type VARCHAR(50) NOT NULL, -- 'metaphor', 'value', 'framework', 'teaching'
  match_text TEXT NOT NULL, -- The exact matched pattern text
  full_context TEXT NOT NULL, -- Minimum ±5 paragraphs, never truncated
  extended_context TEXT, -- Further context for complete stories/examples
  source_file VARCHAR(255),
  recording_date TIMESTAMP,
  session_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Context Speakers relation
CREATE TABLE context_speakers (
  id UUID PRIMARY KEY,
  context_id UUID REFERENCES contexts(id),
  speaker_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  position_start INTEGER,
  position_end INTEGER
);

-- Domain Tags relation
CREATE TABLE context_domain_tags (
  context_id UUID REFERENCES contexts(id),
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (context_id, tag)
);

-- Emotional Markers
CREATE TABLE context_emotional_markers (
  id UUID PRIMARY KEY,
  context_id UUID REFERENCES contexts(id),
  marker_type VARCHAR(50) NOT NULL, -- 'emphasis', 'pause', 'tone_shift'
  position_start INTEGER,
  position_end INTEGER,
  description TEXT
);

-- Related Patterns
CREATE TABLE related_patterns (
  source_context_id UUID REFERENCES contexts(id),
  target_context_id UUID REFERENCES contexts(id),
  relation_type VARCHAR(50), -- 'explicit', 'implicit', 'chronological'
  strength FLOAT, -- 0.0 to 1.0
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_context_id, target_context_id)
);

-- Message-Context relations
CREATE TABLE message_contexts (
  message_id UUID REFERENCES messages(id),
  context_id UUID REFERENCES contexts(id),
  relevance_score FLOAT, -- 0.0 to 1.0
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, context_id)
);

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  status VARCHAR(50) NOT NULL, -- 'active', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  workflow_type VARCHAR(100),
  metadata JSONB
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  agent VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  priority VARCHAR(20),
  metadata JSONB,
  context_ids JSONB -- Array of context IDs relevant to this task
);

-- Task Steps table
CREATE TABLE task_steps (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  description TEXT NOT NULL,
  agent VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  result JSONB,
  context_ids JSONB -- Array of context IDs relevant to this step
);

-- Context Chronology
CREATE TABLE context_chronology (
  id UUID PRIMARY KEY,
  context_id UUID REFERENCES contexts(id),
  sequence_position INTEGER,
  precedes_context_id UUID REFERENCES contexts(id),
  follows_context_id UUID REFERENCES contexts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Context bridges (for bridging context between sessions)
CREATE TABLE context_bridges (
  id UUID PRIMARY KEY,
  from_session_id UUID REFERENCES sessions(id),
  to_session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  context_summary TEXT,
  context_data JSONB, -- Full context data, never truncated
  included_context_ids JSONB -- Array of context IDs included in bridge
);

-- Notion sync table
CREATE TABLE notion_syncs (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  notion_page_id VARCHAR(255),
  notion_database_id VARCHAR(255),
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  context_ids JSONB -- Array of context IDs synced to Notion
);

-- Vector embeddings table (for Pinecone sync)
CREATE TABLE vector_embeddings (
  id UUID PRIMARY KEY,
  source_type VARCHAR(50), -- 'message', 'context', 'task', 'document'
  source_id UUID,
  embedding_id VARCHAR(255), -- ID in Pinecone
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  metadata JSONB
);

-- Index creation for performance
CREATE INDEX idx_contexts_pattern_type ON contexts(pattern_type);
CREATE INDEX idx_contexts_source_file ON contexts(source_file);
CREATE INDEX idx_contexts_recording_date ON contexts(recording_date);
CREATE INDEX idx_context_speakers_context_id ON context_speakers(context_id);
CREATE INDEX idx_context_domain_tags_context_id ON context_domain_tags(context_id);
CREATE INDEX idx_context_domain_tags_tag ON context_domain_tags(tag);
CREATE INDEX idx_context_emotional_markers_context_id ON context_emotional_markers(context_id);
CREATE INDEX idx_related_patterns_source_context_id ON related_patterns(source_context_id);
CREATE INDEX idx_related_patterns_target_context_id ON related_patterns(target_context_id);
CREATE INDEX idx_message_contexts_message_id ON message_contexts(message_id);
CREATE INDEX idx_message_contexts_context_id ON message_contexts(context_id);
CREATE INDEX idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX idx_context_chronology_context_id ON context_chronology(context_id);
CREATE INDEX idx_context_bridges_from_session_id ON context_bridges(from_session_id);
CREATE INDEX idx_context_bridges_to_session_id ON context_bridges(to_session_id);
CREATE INDEX idx_notion_syncs_task_id ON notion_syncs(task_id);
CREATE INDEX idx_vector_embeddings_source_id ON vector_embeddings(source_id);
CREATE INDEX idx_vector_embeddings_source_type ON vector_embeddings(source_type);

-- Common search pattern optimizations
CREATE INDEX idx_full_text_search ON contexts USING gin(to_tsvector('english', full_context));
CREATE INDEX idx_messages_session_id_created_at ON messages(session_id, created_at);
"""
    
    # Write the schema to a file
    with open(schema_path, 'w') as f:
        f.write(schema_sql)
    
    print(f"✅ PostgreSQL schema created at {schema_path}")
    print("To apply this schema to a PostgreSQL database:")
    print("1. Install PostgreSQL if not already installed")
    print("2. Create a database: createdb secondbrain_context")
    print(f"3. Apply the schema: psql -d secondbrain_context -f {schema_path}")
    
    # Also create connection configuration
    db_config = {
        "host": "localhost",  # Placeholder - would be remote host in production
        "port": 5432,
        "database": "secondbrain_context",
        "user": "postgres",   # Placeholder - would be secure user in production
        "password": ""        # Placeholder - would be secure password in production
    }
    
    db_config_path = "/Volumes/Envoy/SecondBrain/context_db_config.json"
    with open(db_config_path, 'w') as f:
        json.dump(db_config, f, indent=2)
    
    print(f"✅ Database configuration template created at {db_config_path}")
    return True

# Validate Notion API connection
def validate_notion():
    """Test Notion API connection."""
    print("\n=== Validating Notion API Connection ===")
    try:
        notion_api_key = os.getenv('NOTION_API_KEY')
        
        if not notion_api_key:
            print("Error: Missing Notion API key")
            return False
            
        # Simple validation of the API key format
        if not notion_api_key.startswith('ntn_'):
            print("❌ Invalid Notion API key format. Should start with 'ntn_'")
            return False
            
        # Test the API with a users/me request
        headers = {
            "Authorization": f"Bearer {notion_api_key}",
            "Notion-Version": "2022-06-28"
        }
        
        response = requests.get("https://api.notion.com/v1/users/me", headers=headers)
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ Successfully connected to Notion API as {user_data.get('name', 'Unknown User')}")
            return True
        else:
            print(f"❌ Failed to connect to Notion API: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Notion API validation error: {e}")
        return False

# Create Notion database for context management
def setup_notion_context_db():
    """Create a Notion database for context management."""
    print("\n=== Setting Up Notion Context Database ===")
    try:
        notion_api_key = os.getenv('NOTION_API_KEY')
        
        if not notion_api_key:
            print("Error: Missing Notion API key")
            return False
            
        headers = {
            "Authorization": f"Bearer {notion_api_key}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }
        
        # Check if we already have the parent page ID in environment
        parent_page_id = os.getenv('NOTION_PARENT_PAGE_ID')
        
        if not parent_page_id:
            print("No parent page ID found. Searching for a suitable parent page...")
            
            # Search for pages with "SecondBrain" in the title
            search_data = {
                "query": "SecondBrain",
                "filter": {
                    "value": "page",
                    "property": "object"
                }
            }
            
            search_response = requests.post(
                "https://api.notion.com/v1/search", 
                headers=headers,
                json=search_data
            )
            
            if search_response.status_code != 200:
                print(f"❌ Failed to search Notion: {search_response.status_code} - {search_response.text}")
                return False
                
            search_results = search_response.json().get('results', [])
            
            if not search_results:
                print("No suitable parent page found. Creating a new page...")
                
                # Create a new page in the user's workspace
                page_data = {
                    "parent": {"type": "workspace"},
                    "properties": {
                        "title": [{"text": {"content": "SecondBrain Context System"}}]
                    }
                }
                
                page_response = requests.post(
                    "https://api.notion.com/v1/pages",
                    headers=headers,
                    json=page_data
                )
                
                if page_response.status_code != 200:
                    print(f"❌ Failed to create parent page: {page_response.status_code} - {page_response.text}")
                    return False
                    
                parent_page_id = page_response.json().get('id')
                print(f"✅ Created new parent page with ID: {parent_page_id}")
                
                # Update env file with the new page ID
                update_env_file("NOTION_PARENT_PAGE_ID", parent_page_id)
            else:
                parent_page_id = search_results[0].get('id')
                print(f"✅ Found existing page with ID: {parent_page_id}")
                
                # Update env file with the found page ID
                update_env_file("NOTION_PARENT_PAGE_ID", parent_page_id)
        else:
            print(f"Using existing parent page ID: {parent_page_id}")
        
        # Check if we already have a context database ID in environment
        context_db_id = os.getenv('NOTION_CONTEXT_DB_ID')
        
        if not context_db_id:
            print("Creating new Context database in Notion...")
            
            # Create a new database for contexts
            db_data = {
                "parent": {"type": "page_id", "page_id": parent_page_id},
                "title": [{"type": "text", "text": {"content": "SecondBrain Context Database"}}],
                "properties": {
                    "Name": {"title": {}},
                    "Pattern Type": {
                        "select": {
                            "options": [
                                {"name": "metaphor", "color": "blue"},
                                {"name": "value", "color": "green"},
                                {"name": "framework", "color": "purple"},
                                {"name": "teaching", "color": "orange"}
                            ]
                        }
                    },
                    "Source": {"rich_text": {}},
                    "Session Type": {
                        "select": {
                            "options": [
                                {"name": "coaching", "color": "red"},
                                {"name": "consultation", "color": "yellow"},
                                {"name": "course", "color": "green"}
                            ]
                        }
                    },
                    "Extracted": {"date": {}},
                    "Tags": {
                        "multi_select": {
                            "options": [
                                {"name": "business", "color": "blue"},
                                {"name": "personal", "color": "green"},
                                {"name": "spiritual", "color": "purple"},
                                {"name": "relationships", "color": "pink"}
                            ]
                        }
                    }
                }
            }
            
            db_response = requests.post(
                "https://api.notion.com/v1/databases",
                headers=headers,
                json=db_data
            )
            
            if db_response.status_code != 200:
                print(f"❌ Failed to create context database: {db_response.status_code} - {db_response.text}")
                return False
                
            context_db_id = db_response.json().get('id')
            print(f"✅ Created new context database with ID: {context_db_id}")
            
            # Update env file with the new database ID
            update_env_file("NOTION_CONTEXT_DB_ID", context_db_id)
        else:
            print(f"Using existing context database ID: {context_db_id}")
        
        print("✅ Notion setup complete")
        return True
    except Exception as e:
        print(f"❌ Notion setup error: {e}")
        return False

# Main function
def main():
    """Main function to set up the context persistence infrastructure."""
    print("=== SecondBrain Context Persistence System - Infrastructure Setup ===")
    
    # Load environment variables
    if not load_env():
        sys.exit(1)
        
    # Validate existing connections
    redis_ok = validate_redis()
    pinecone_ok = validate_pinecone()
    notion_ok = validate_notion()
    
    # Set up PostgreSQL schema
    postgres_ok = configure_postgresql()
    
    # Set up Notion database for context management
    notion_db_ok = setup_notion_context_db()
    
    # Final status
    print("\n=== Setup Summary ===")
    print(f"Redis Cloud Connection: {'✅ Connected' if redis_ok else '❌ Failed'}")
    print(f"Pinecone Connection: {'✅ Connected' if pinecone_ok else '❌ Failed'}")
    print(f"PostgreSQL Schema: {'✅ Created' if postgres_ok else '❌ Failed'}")
    print(f"Notion API Connection: {'✅ Connected' if notion_ok else '❌ Failed'}")
    print(f"Notion Context Database: {'✅ Set Up' if notion_db_ok else '❌ Failed'}")
    
    if redis_ok and pinecone_ok and postgres_ok and notion_ok and notion_db_ok:
        print("\n✅ Context Persistence System infrastructure is ready!")
        print("\nNext steps:")
        print("1. Create the context extraction and storage system")
        print("2. Implement agent integration")
        print("3. Set up Notion full context visibility")
        print("4. Create verification tests")
    else:
        print("\n❌ Some components failed to set up. Please check the logs and try again.")
    
if __name__ == "__main__":
    main()