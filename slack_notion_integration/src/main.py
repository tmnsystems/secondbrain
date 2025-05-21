"""
Main entry point for the SecondBrain Slack-Notion integration.
"""

import os
import sys
import uuid
import time
import argparse
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from dotenv import load_dotenv

from .config.env import load_env, get_pinecone_config
from .notion.client import NotionClient
from .redis.client import RedisClient
from .database.client import PostgresClient
from .vector.client import PineconeClient
from .context.manager import ContextManager
from .slack.app import PlannerAgentApp, ExecutorAgentApp, ReviewerAgentApp, NotionAgentApp
from .utils.logger import setup_logger, get_logger

logger = get_logger(__name__)

def setup() -> Dict[str, Any]:
    """
    Set up the environment and configuration.
    
    Returns:
        Dict of environment variables and configuration
    """
    # Set up logging
    setup_logger()
    
    # Load environment variables
    load_dotenv("/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env")
    
    try:
        env_vars = load_env()
    except Exception as e:
        logger.critical(f"Failed to load environment variables: {str(e)}")
        sys.exit(1)
    
    logger.info("Environment variables loaded successfully")
    
    return env_vars

def setup_redis() -> RedisClient:
    """
    Set up the Redis client.
    
    Returns:
        Configured Redis client
    """
    try:
        # First try with URL
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            logger.info("Setting up Redis client with URL")
            redis_client = RedisClient(url=redis_url)
        else:
            # Then try with individual params
            logger.info("Setting up Redis client with parameters")
            redis_client = RedisClient(
                host=os.getenv("REDIS_HOST"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                password=os.getenv("REDIS_PASSWORD"),
                db=int(os.getenv("REDIS_DB", "0"))
            )
        
        # Test connection
        if redis_client.ping():
            logger.info("Redis connection successful")
        else:
            logger.error("Failed to connect to Redis")
            raise Exception("Redis connection test failed")
        
        return redis_client
    except Exception as e:
        logger.critical(f"Failed to set up Redis client: {str(e)}")
        sys.exit(1)

def setup_postgres(initialize_schema: bool = False) -> PostgresClient:
    """
    Set up the PostgreSQL client.
    
    Args:
        initialize_schema: Whether to initialize the database schema
        
    Returns:
        Configured PostgreSQL client
    """
    try:
        # First try with URL
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            logger.info("Setting up PostgreSQL client with URL")
            postgres_client = PostgresClient(url=database_url)
        else:
            # Then try with individual params
            logger.info("Setting up PostgreSQL client with parameters")
            postgres_client = PostgresClient(
                host=os.getenv("POSTGRES_HOST"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                user=os.getenv("POSTGRES_USER"),
                password=os.getenv("POSTGRES_PASSWORD"),
                database=os.getenv("POSTGRES_DB")
            )
        
        # Test connection
        if postgres_client.ping():
            logger.info("PostgreSQL connection successful")
            
            # Initialize schema if requested
            if initialize_schema:
                logger.info("Initializing PostgreSQL schema")
                postgres_client.initialize_schema()
                logger.info("PostgreSQL schema initialized successfully")
        else:
            logger.error("Failed to connect to PostgreSQL")
            raise Exception("PostgreSQL connection test failed")
        
        return postgres_client
    except Exception as e:
        logger.critical(f"Failed to set up PostgreSQL client: {str(e)}")
        sys.exit(1)

def setup_pinecone() -> Optional[PineconeClient]:
    """
    Set up the Pinecone client for semantic search.
    
    Returns:
        Configured Pinecone client or None if not configured
    """
    try:
        pinecone_config = get_pinecone_config()
        
        # Check if we have all required configuration values
        if not pinecone_config.get("api_key"):
            logger.warning("Pinecone API key not found. Semantic search will be unavailable.")
            return None
            
        if not pinecone_config.get("environment"):
            logger.warning("Pinecone environment not found. Semantic search will be unavailable.")
            return None
            
        if not pinecone_config.get("index"):
            logger.warning("Pinecone index name not found. Semantic search will be unavailable.")
            return None
        
        # Create Pinecone client
        pinecone_client = PineconeClient(
            api_key=pinecone_config.get("api_key"),
            environment=pinecone_config.get("environment"),
            index_name=pinecone_config.get("index")
        )
        
        logger.info("Pinecone client initialized successfully")
        return pinecone_client
    except Exception as e:
        logger.error(f"Failed to set up Pinecone client: {str(e)}")
        logger.warning("Semantic search will be unavailable")
        return None

def setup_notion(api_key: str, create_db: bool = False) -> NotionClient:
    """
    Set up the Notion client.
    
    Args:
        api_key: Notion API key
        create_db: Whether to create the databases in Notion
        
    Returns:
        Configured Notion client
    """
    try:
        notion_client = NotionClient(api_key)
        
        if create_db:
            logger.info("Creating Notion databases")
            
            # First check if we have access to the necessary pages
            try:
                logger.info("Checking Notion API access...")
                search_results = notion_client.client.search(limit=1)
                logger.info(f"Found {len(search_results.get('results', []))} results from search")
                
                if not search_results.get("results"):
                    logger.warning("No pages found. Please share at least one page with this integration.")
                    print("\n====== IMPORTANT NOTICE ======")
                    print("Your Notion integration doesn't have access to any pages yet.")
                    print("Please follow these steps:")
                    print("1. Go to https://www.notion.so/ and open your workspace")
                    print("2. Create a new page called 'SecondBrain Project'")
                    print("3. Click the '...' menu in the top right of the page")
                    print("4. Select 'Add connections' and find your integration")
                    print("5. Run this setup command again\n")
                    logger.info("Setup aborted - integration needs page access")
                    sys.exit(0)
                    
                # Try to create the databases
                db_ids = notion_client.create_databases()
                logger.info(f"Created Notion databases: {db_ids}")
                
            except Exception as api_error:
                logger.error(f"Error accessing Notion API: {str(api_error)}")
                print("\n====== NOTION API ERROR ======")
                print(f"Error: {str(api_error)}")
                print("\nPlease verify:")
                print("1. Your Notion API key is correct")
                print("2. Your integration has been shared with at least one page")
                print("3. Your integration has the right permissions")
                print("\nFor more information, visit: https://developers.notion.com/docs/getting-started\n")
                raise
        
        return notion_client
    except Exception as e:
        logger.critical(f"Failed to set up Notion client: {str(e)}")
        sys.exit(1)

def setup_context(redis_client: RedisClient, postgres_client: PostgresClient, 
                pinecone_client: Optional[PineconeClient] = None) -> ContextManager:
    """
    Set up the context manager.
    
    Args:
        redis_client: Redis client
        postgres_client: PostgreSQL client
        pinecone_client: Optional Pinecone client
        
    Returns:
        Configured context manager
    """
    try:
        context_manager = ContextManager(redis_client, postgres_client, pinecone_client)
        logger.info("Context manager initialized")
        return context_manager
    except Exception as e:
        logger.critical(f"Failed to set up context manager: {str(e)}")
        sys.exit(1)

def main():
    """Main entry point for the application."""
    parser = argparse.ArgumentParser(description="SecondBrain Slack-Notion Integration")
    parser.add_argument("--setup-notion", action="store_true", help="Create Notion databases")
    parser.add_argument("--setup-db", action="store_true", help="Initialize PostgreSQL schema")
    parser.add_argument("--start-agents", action="store_true", help="Start Slack agent apps")
    parser.add_argument("--agent", type=str, choices=["planner", "executor", "reviewer", "notion", "all"], 
                      default="all", help="Which agent to start")
    parser.add_argument("--test-context", action="store_true", help="Test context persistence")
    parser.add_argument("--test-semantic-search", action="store_true", help="Test semantic search with Pinecone")
    
    args = parser.parse_args()
    
    # Set up the environment
    env_vars = setup()
    
    # Set up Redis client
    redis_client = setup_redis()
    
    # Set up PostgreSQL client
    postgres_client = setup_postgres(args.setup_db)
    
    # Set up Pinecone client for semantic search
    pinecone_client = setup_pinecone()
    
    # Set up context manager
    context_manager = setup_context(redis_client, postgres_client, pinecone_client)
    
    # Set up Notion client
    notion_client = setup_notion(env_vars["NOTION_API_KEY"], args.setup_notion)
    
    # Test semantic search specifically if requested
    if args.test_semantic_search:
        if not pinecone_client:
            logger.error("Pinecone client not available. Semantic search test cannot be performed.")
            print("\n====== ERROR ======")
            print("Pinecone client not available. Please ensure PINECONE_API_KEY, PINECONE_ENVIRONMENT, and PINECONE_INDEX are set.")
            print("Aborting semantic search test.")
            sys.exit(1)
            
        logger.info("Testing standalone semantic search functionality")
        
        # Create a test session
        session_id = context_manager.create_session("semantic_test_user", "cli")
        logger.info(f"Created test session for semantic search: {session_id}")
        
        # Add test messages with varied content for better semantic search testing
        test_messages = [
            {
                "role": "user",
                "content": "I need help integrating our new database with the existing API endpoints",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            },
            {
                "role": "assistant", 
                "content": "I'll help you integrate the database with the API. What database system are you using? MongoDB, PostgreSQL, or something else?",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            },
            {
                "role": "user",
                "content": "We're using PostgreSQL for structured data and Pinecone for vector embeddings in our semantic search feature",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            },
            {
                "role": "assistant",
                "content": "Great! For PostgreSQL and Pinecone integration with your API, we'll need to create connection pools and handle transaction management properly.",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            },
            {
                "role": "user",
                "content": "Can you help me implement a context persistence system that uses Redis for short-term caching?",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            }
        ]
        
        for message in test_messages:
            context_manager.add_message(session_id, message)
            # Small delay to ensure proper indexing
            time.sleep(0.5)
            
        logger.info(f"Added {len(test_messages)} test messages to session for semantic search testing")
        
        # Create a test task for semantic search
        task = {
            "id": str(uuid.uuid4()),
            "title": "Implement multi-layer context persistence",
            "description": "Create a system that uses Redis for short-term caching, PostgreSQL for structured storage, and Pinecone for semantic search",
            "agent": "executor",
            "status": "in_progress",
            "priority": "high",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Index the task
        context_manager.index_task(session_id, task)
        logger.info("Added test task for semantic search testing")
        
        # Wait for indexing to complete
        logger.info("Waiting for indexes to update...")
        time.sleep(3)
        
        # Perform various semantic searches
        search_queries = [
            "database integration",
            "context persistence system",
            "Redis caching implementation",
            "PostgreSQL and API"
        ]
        
        print("\n====== SEMANTIC SEARCH TEST RESULTS ======")
        for query in search_queries:
            results = context_manager.semantic_search(query, session_id, limit=2)
            print(f"\nQuery: '{query}'")
            print(f"Found {len(results)} results")
            
            for i, result in enumerate(results):
                print(f"  Result {i+1}: Score {result.get('score', 'N/A')}")
                metadata = result.get("metadata", {})
                print(f"  Content preview: {metadata.get('content_preview', 'N/A')}")
        
        # Test related content functionality
        related = context_manager.find_related_content(
            "Need to implement Redis caching for better performance", 
            session_id
        )
        
        print("\n====== RELATED CONTENT TEST RESULTS ======")
        print(f"Related messages: {len(related.get('messages', []))} items")
        print(f"Related tasks: {len(related.get('tasks', []))} items")
        print(f"Related Notion pages: {len(related.get('notion_pages', []))} items")
        
        # Clean up
        context_manager.clear_session(session_id)
        logger.info("Cleared semantic search test session")
        print("\nSemantic search test completed. Indexes and test data have been cleaned up.")
        
    # Test context persistence if requested
    if args.test_context:
        logger.info("Testing context persistence")
        
        # Create a test session
        session_id = context_manager.create_session("test_user", "cli")
        logger.info(f"Created test session: {session_id}")
        
        # Add test messages with content suitable for semantic search
        messages = [
            {
                "role": "user",
                "content": "I need to schedule a meeting to discuss the database schema redesign",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            },
            {
                "role": "assistant",
                "content": "I'll help you schedule that meeting. What day works best for you to discuss the database schema redesign?",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            },
            {
                "role": "user",
                "content": "Let's plan the meeting for tomorrow at 2pm. We should invite the entire development team.",
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4())
            }
        ]
        
        for message in messages:
            context_manager.add_message(session_id, message)
        logger.info(f"Added {len(messages)} test messages to session")
        
        # Create a test workflow
        workflow_id = str(uuid.uuid4())
        workflow_state = {
            "id": workflow_id,
            "session_id": session_id,
            "status": "active",
            "current_step": "test",
            "created_at": datetime.now().isoformat(),
            "test_data": {"key": "value"}
        }
        context_manager.store_workflow_state(workflow_id, workflow_state)
        logger.info(f"Created test workflow: {workflow_id}")
        
        # Create a test context bridge
        bridge_id = context_manager.bridge_context(
            session_id, session_id,
            "Test context bridge",
            {"test_key": "test_value"}
        )
        logger.info(f"Created test context bridge: {bridge_id}")
        
        # Retrieve session messages
        messages = context_manager.get_messages(session_id)
        logger.info(f"Retrieved {len(messages)} messages from session")
        
        # Retrieve workflow state
        retrieved_workflow = context_manager.get_workflow_state(workflow_id)
        logger.info(f"Retrieved workflow state: {retrieved_workflow}")
        
        # Retrieve context bridges
        bridges = context_manager.get_session_bridges(session_id)
        logger.info(f"Retrieved {len(bridges)} context bridges")
        
        # End session
        context_manager.end_session(session_id)
        logger.info(f"Ended test session: {session_id}")
        
        print("\n====== CONTEXT PERSISTENCE TEST ======")
        print(f"Session ID: {session_id}")
        print(f"Messages: {len(messages)} messages retrieved")
        print(f"Workflow: {retrieved_workflow is not None}")
        print(f"Bridges: {len(bridges)} bridges retrieved")
        print("Context persistence test completed successfully")
        
        # Test semantic search if Pinecone is available
        if pinecone_client:
            logger.info("Testing semantic search with Pinecone")
            
            # Give a moment for indexes to process
            import time
            time.sleep(3)
            
            # Perform a semantic search
            search_query = "meeting schedule database"
            search_results = context_manager.semantic_search(search_query, session_id, limit=2)
            
            # Find related content
            related_content = context_manager.find_related_content(
                "Need to discuss database schema changes with the team", 
                session_id,
                limit=2
            )
            
            print("\n====== SEMANTIC SEARCH TEST ======")
            print(f"Search query: '{search_query}'")
            print(f"Results: {len(search_results)} items found")
            
            print("\n====== RELATED CONTENT TEST ======")
            print(f"Related messages: {len(related_content.get('messages', []))} items")
            print(f"Related tasks: {len(related_content.get('tasks', []))} items")
            print(f"Related Notion pages: {len(related_content.get('notion_pages', []))} items")
            print("Semantic search test completed successfully")
        else:
            print("\n====== SEMANTIC SEARCH TEST SKIPPED ======")
            print("Pinecone client not available. Semantic search test skipped.")
    
    if args.start_agents:
        logger.info(f"Starting agent(s): {args.agent}")
        
        try:
            # Create agent apps
            agents = {}
            
            if args.agent in ["planner", "all"]:
                agents["planner"] = PlannerAgentApp(notion_client, context_manager)
                logger.info("Created PlannerAgent app")
            
            if args.agent in ["executor", "all"]:
                agents["executor"] = ExecutorAgentApp(notion_client, context_manager)
                logger.info("Created ExecutorAgent app")
            
            if args.agent in ["reviewer", "all"]:
                agents["reviewer"] = ReviewerAgentApp(notion_client, context_manager)
                logger.info("Created ReviewerAgent app")
            
            if args.agent in ["notion", "all"]:
                agents["notion"] = NotionAgentApp(notion_client, context_manager)
                logger.info("Created NotionAgent app")
            
            # Start agent apps
            for agent_name, agent_app in agents.items():
                logger.info(f"Starting {agent_name} app")
                agent_app.start()
            
            logger.info(f"Started agent(s): {args.agent}")
            
            # Keep the main thread alive (this is handled by each agent's event loop)
            import time
            while True:
                time.sleep(1)
        
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt, shutting down")
        except Exception as e:
            logger.critical(f"Error starting agent apps: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    main()