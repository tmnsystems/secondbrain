import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json
from datetime import datetime

# Add the src directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from context_persistence import (
    ContextType, StorageLayer, ContextMetadata, ContextObject,
    ContextPersistenceManager, RedisStorage, PostgreSQLStorage, PineconeStorage
)

class TestContextPersistence(unittest.TestCase):
    
    def setUp(self):
        # Mock the storage layers
        self.redis_mock = MagicMock()
        self.postgres_mock = MagicMock()
        self.pinecone_mock = MagicMock()
        
        # Create patches for the storage classes
        self.redis_patch = patch('context_persistence.RedisStorage', return_value=self.redis_mock)
        self.postgres_patch = patch('context_persistence.PostgreSQLStorage', return_value=self.postgres_mock)
        self.pinecone_patch = patch('context_persistence.PineconeStorage', return_value=self.pinecone_mock)
        
        # Start the patches
        self.redis_mock = self.redis_patch.start()
        self.postgres_mock = self.postgres_patch.start()
        self.pinecone_mock = self.pinecone_patch.start()
        
        # Create a context persistence manager with mocked storage layers
        self.manager = ContextPersistenceManager(
            redis_config={"host": "localhost", "port": 6379},
            postgres_config={"host": "localhost", "port": 5432, "user": "test", "password": "test", "database": "test"},
            pinecone_config={"api_key": "test_key", "environment": "test_env", "index_name": "test_index"}
        )
    
    def tearDown(self):
        # Stop the patches
        self.redis_patch.stop()
        self.postgres_patch.stop()
        self.pinecone_patch.stop()
    
    def test_create_context_object(self):
        # Test creating a context object
        metadata = ContextMetadata(
            context_id="test_id",
            context_type=ContextType.AGENT_STATE,
            source_agent="test_agent",
            target_agent=None,
            timestamp=datetime.now(),
            session_id="test_session",
            tags=["test", "context"]
        )
        
        content = {"state": "active", "messages": ["Hello", "World"]}
        context_object = ContextObject(metadata=metadata, content=content)
        
        self.assertEqual(context_object.metadata.context_id, "test_id")
        self.assertEqual(context_object.metadata.context_type, ContextType.AGENT_STATE)
        self.assertEqual(context_object.content, content)
    
    def test_store_context(self):
        # Test storing a context object
        context_object = ContextObject(
            metadata=ContextMetadata(
                context_id="test_store_id",
                context_type=ContextType.AGENT_STATE,
                source_agent="test_agent",
                target_agent=None,
                timestamp=datetime.now(),
                session_id="test_session",
                tags=["test", "store"]
            ),
            content={"state": "active", "messages": ["Hello", "Store"]}
        )
        
        # Store the context object
        self.manager.store_context(context_object)
        
        # Check that the store method was called on all storage layers
        self.redis_mock.store.assert_called_once()
        self.postgres_mock.store.assert_called_once()
        self.pinecone_mock.store.assert_called_once()
    
    def test_retrieve_context_by_id(self):
        # Mock the retrieve_by_id method of RedisStorage to return a context object
        redis_context = ContextObject(
            metadata=ContextMetadata(
                context_id="test_retrieve_id",
                context_type=ContextType.AGENT_STATE,
                source_agent="test_agent",
                target_agent=None,
                timestamp=datetime.now(),
                session_id="test_session",
                tags=["test", "retrieve"]
            ),
            content={"state": "active", "messages": ["Hello", "Retrieve"]}
        )
        self.redis_mock.retrieve_by_id.return_value = redis_context
        
        # Retrieve the context object by ID
        retrieved_context = self.manager.retrieve_context_by_id("test_retrieve_id")
        
        # Check that the retrieve_by_id method was called on RedisStorage
        self.redis_mock.retrieve_by_id.assert_called_once_with("test_retrieve_id")
        
        # Check that the retrieved context object is correct
        self.assertEqual(retrieved_context.metadata.context_id, "test_retrieve_id")
        self.assertEqual(retrieved_context.content["state"], "active")
    
    def test_retrieve_context_by_id_fallback(self):
        # Mock the retrieve_by_id method of RedisStorage to return None
        self.redis_mock.retrieve_by_id.return_value = None
        
        # Mock the retrieve_by_id method of PostgreSQLStorage to return a context object
        postgres_context = ContextObject(
            metadata=ContextMetadata(
                context_id="test_fallback_id",
                context_type=ContextType.AGENT_STATE,
                source_agent="test_agent",
                target_agent=None,
                timestamp=datetime.now(),
                session_id="test_session",
                tags=["test", "fallback"]
            ),
            content={"state": "active", "messages": ["Hello", "Fallback"]}
        )
        self.postgres_mock.retrieve_by_id.return_value = postgres_context
        
        # Retrieve the context object by ID
        retrieved_context = self.manager.retrieve_context_by_id("test_fallback_id")
        
        # Check that the retrieve_by_id method was called on RedisStorage and PostgreSQLStorage
        self.redis_mock.retrieve_by_id.assert_called_once_with("test_fallback_id")
        self.postgres_mock.retrieve_by_id.assert_called_once_with("test_fallback_id")
        
        # Check that the retrieved context object is correct
        self.assertEqual(retrieved_context.metadata.context_id, "test_fallback_id")
        self.assertEqual(retrieved_context.content["state"], "active")
    
    def test_search_context(self):
        # Test searching for context objects
        query = "test query"
        filters = {"session_id": "test_session", "context_type": ContextType.AGENT_STATE}
        
        # Mock the search method of PineconeStorage to return a list of context objects
        search_results = [
            ContextObject(
                metadata=ContextMetadata(
                    context_id=f"search_result_{i}",
                    context_type=ContextType.AGENT_STATE,
                    source_agent="test_agent",
                    target_agent=None,
                    timestamp=datetime.now(),
                    session_id="test_session",
                    tags=["test", "search"]
                ),
                content={"state": "active", "messages": [f"Hello {i}", "Search"]}
            )
            for i in range(3)
        ]
        self.pinecone_mock.search.return_value = search_results
        
        # Search for context objects
        results = self.manager.search_context(query, filters)
        
        # Check that the search method was called on PineconeStorage
        self.pinecone_mock.search.assert_called_once_with(query, filters)
        
        # Check that the search results are correct
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0].metadata.context_id, "search_result_0")
        self.assertEqual(results[1].metadata.context_id, "search_result_1")
        self.assertEqual(results[2].metadata.context_id, "search_result_2")
    
    def test_update_context(self):
        # Test updating a context object
        context_object = ContextObject(
            metadata=ContextMetadata(
                context_id="test_update_id",
                context_type=ContextType.AGENT_STATE,
                source_agent="test_agent",
                target_agent=None,
                timestamp=datetime.now(),
                session_id="test_session",
                tags=["test", "update"]
            ),
            content={"state": "active", "messages": ["Hello", "Update"]}
        )
        
        # Update the context object
        updated_content = {"state": "inactive", "messages": ["Hello", "Updated"]}
        self.manager.update_context("test_update_id", updated_content)
        
        # Check that the update method was called on all storage layers
        self.redis_mock.update.assert_called_once_with("test_update_id", updated_content)
        self.postgres_mock.update.assert_called_once_with("test_update_id", updated_content)
        self.pinecone_mock.update.assert_called_once_with("test_update_id", updated_content)
    
    def test_delete_context(self):
        # Test deleting a context object
        self.manager.delete_context("test_delete_id")
        
        # Check that the delete method was called on all storage layers
        self.redis_mock.delete.assert_called_once_with("test_delete_id")
        self.postgres_mock.delete.assert_called_once_with("test_delete_id")
        self.pinecone_mock.delete.assert_called_once_with("test_delete_id")
    
    def test_list_contexts_by_session(self):
        # Test listing context objects by session ID
        session_id = "test_list_session"
        
        # Mock the list_by_session method of PostgreSQLStorage to return a list of context objects
        session_contexts = [
            ContextObject(
                metadata=ContextMetadata(
                    context_id=f"list_result_{i}",
                    context_type=ContextType.AGENT_STATE,
                    source_agent="test_agent",
                    target_agent=None,
                    timestamp=datetime.now(),
                    session_id=session_id,
                    tags=["test", "list"]
                ),
                content={"state": "active", "messages": [f"Hello {i}", "List"]}
            )
            for i in range(3)
        ]
        self.postgres_mock.list_by_session.return_value = session_contexts
        
        # List context objects by session ID
        results = self.manager.list_contexts_by_session(session_id)
        
        # Check that the list_by_session method was called on PostgreSQLStorage
        self.postgres_mock.list_by_session.assert_called_once_with(session_id)
        
        # Check that the list results are correct
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0].metadata.context_id, "list_result_0")
        self.assertEqual(results[1].metadata.context_id, "list_result_1")
        self.assertEqual(results[2].metadata.context_id, "list_result_2")
    
    def test_bridge_sessions(self):
        # Test bridging two sessions
        source_session_id = "source_session"
        target_session_id = "target_session"
        
        # Bridge the sessions
        self.manager.bridge_sessions(source_session_id, target_session_id)
        
        # Check that the create_session_bridge method was called on PostgreSQLStorage
        self.postgres_mock.create_session_bridge.assert_called_once_with(source_session_id, target_session_id)
    
    def test_handle_compaction(self):
        # Test handling a compaction event
        session_id = "compaction_session"
        reason = "token_limit_exceeded"
        
        # Mock the list_by_session method of PostgreSQLStorage to return a list of context objects
        session_contexts = [
            ContextObject(
                metadata=ContextMetadata(
                    context_id=f"compaction_context_{i}",
                    context_type=ContextType.AGENT_STATE,
                    source_agent="test_agent",
                    target_agent=None,
                    timestamp=datetime.now(),
                    session_id=session_id,
                    tags=["test", "compaction"]
                ),
                content={"state": "active", "messages": [f"Hello {i}", "Compaction"]}
            )
            for i in range(5)
        ]
        self.postgres_mock.list_by_session.return_value = session_contexts
        
        # Handle the compaction event
        new_session_id = self.manager.handle_compaction(session_id, reason)
        
        # Check that the list_by_session method was called on PostgreSQLStorage
        self.postgres_mock.list_by_session.assert_called_once_with(session_id)
        
        # Check that the create_session_bridge method was called on PostgreSQLStorage
        self.postgres_mock.create_session_bridge.assert_called_once()
        
        # Check that the store method was called on all storage layers for each context object
        self.assertEqual(self.redis_mock.store.call_count, 5)
        self.assertEqual(self.postgres_mock.store.call_count, 5)
        self.assertEqual(self.pinecone_mock.store.call_count, 5)
        
        # Check that a new session ID was returned
        self.assertIsNotNone(new_session_id)
        self.assertNotEqual(new_session_id, session_id)

class TestRedisStorage(unittest.TestCase):
    
    def setUp(self):
        # Mock Redis client
        self.redis_client_mock = MagicMock()
        
        # Create a patch for the Redis client
        self.redis_client_patch = patch('context_persistence.redis.Redis', return_value=self.redis_client_mock)
        
        # Start the patch
        self.redis_client_mock = self.redis_client_patch.start()
        
        # Create a RedisStorage instance
        self.redis_storage = RedisStorage(config={"host": "localhost", "port": 6379})
    
    def tearDown(self):
        # Stop the patch
        self.redis_client_patch.stop()
    
    def test_store(self):
        # Test storing a context object in Redis
        context_object = ContextObject(
            metadata=ContextMetadata(
                context_id="test_redis_store_id",
                context_type=ContextType.AGENT_STATE,
                source_agent="test_agent",
                target_agent=None,
                timestamp=datetime.now(),
                session_id="test_session",
                tags=["test", "redis", "store"]
            ),
            content={"state": "active", "messages": ["Hello", "Redis Store"]}
        )
        
        # Store the context object
        self.redis_storage.store(context_object)
        
        # Check that the set method was called on the Redis client
        self.redis_client_mock.set.assert_called_once()
        
        # Verify the key and value of the set call
        args, kwargs = self.redis_client_mock.set.call_args
        self.assertEqual(args[0], "context:test_redis_store_id")
        
        # Decode the JSON value and verify the content
        stored_data = json.loads(args[1])
        self.assertEqual(stored_data["content"]["state"], "active")
        self.assertEqual(stored_data["content"]["messages"], ["Hello", "Redis Store"])
    
    def test_retrieve_by_id(self):
        # Test retrieving a context object from Redis by ID
        context_id = "test_redis_retrieve_id"
        
        # Mock the get method of the Redis client to return a JSON string
        stored_data = {
            "metadata": {
                "context_id": context_id,
                "context_type": ContextType.AGENT_STATE.value,
                "source_agent": "test_agent",
                "target_agent": None,
                "timestamp": datetime.now().isoformat(),
                "session_id": "test_session",
                "tags": ["test", "redis", "retrieve"]
            },
            "content": {
                "state": "active",
                "messages": ["Hello", "Redis Retrieve"]
            }
        }
        self.redis_client_mock.get.return_value = json.dumps(stored_data)
        
        # Retrieve the context object by ID
        retrieved_context = self.redis_storage.retrieve_by_id(context_id)
        
        # Check that the get method was called on the Redis client
        self.redis_client_mock.get.assert_called_once_with(f"context:{context_id}")
        
        # Check that the retrieved context object is correct
        self.assertEqual(retrieved_context.metadata.context_id, context_id)
        self.assertEqual(retrieved_context.content["state"], "active")
        self.assertEqual(retrieved_context.content["messages"], ["Hello", "Redis Retrieve"])
    
    def test_update(self):
        # Test updating a context object in Redis
        context_id = "test_redis_update_id"
        updated_content = {"state": "inactive", "messages": ["Hello", "Redis Updated"]}
        
        # Mock the get method of the Redis client to return a JSON string
        stored_data = {
            "metadata": {
                "context_id": context_id,
                "context_type": ContextType.AGENT_STATE.value,
                "source_agent": "test_agent",
                "target_agent": None,
                "timestamp": datetime.now().isoformat(),
                "session_id": "test_session",
                "tags": ["test", "redis", "update"]
            },
            "content": {
                "state": "active",
                "messages": ["Hello", "Redis Update"]
            }
        }
        self.redis_client_mock.get.return_value = json.dumps(stored_data)
        
        # Update the context object
        self.redis_storage.update(context_id, updated_content)
        
        # Check that the get and set methods were called on the Redis client
        self.redis_client_mock.get.assert_called_once_with(f"context:{context_id}")
        self.redis_client_mock.set.assert_called_once()
        
        # Verify the key and value of the set call
        args, kwargs = self.redis_client_mock.set.call_args
        self.assertEqual(args[0], f"context:{context_id}")
        
        # Decode the JSON value and verify the updated content
        updated_data = json.loads(args[1])
        self.assertEqual(updated_data["content"]["state"], "inactive")
        self.assertEqual(updated_data["content"]["messages"], ["Hello", "Redis Updated"])
    
    def test_delete(self):
        # Test deleting a context object from Redis
        context_id = "test_redis_delete_id"
        
        # Delete the context object
        self.redis_storage.delete(context_id)
        
        # Check that the delete method was called on the Redis client
        self.redis_client_mock.delete.assert_called_once_with(f"context:{context_id}")

class TestPostgreSQLStorage(unittest.TestCase):
    
    def setUp(self):
        # Mock psycopg2 connection and cursor
        self.cursor_mock = MagicMock()
        self.connection_mock = MagicMock()
        self.connection_mock.cursor.return_value = self.cursor_mock
        
        # Create a patch for psycopg2.connect
        self.connect_patch = patch('context_persistence.psycopg2.connect', return_value=self.connection_mock)
        
        # Start the patch
        self.connect_mock = self.connect_patch.start()
        
        # Create a PostgreSQLStorage instance
        self.postgres_storage = PostgreSQLStorage(config={
            "host": "localhost",
            "port": 5432,
            "user": "test",
            "password": "test",
            "database": "test"
        })
    
    def tearDown(self):
        # Stop the patch
        self.connect_patch.stop()
    
    def test_store(self):
        # Test storing a context object in PostgreSQL
        context_object = ContextObject(
            metadata=ContextMetadata(
                context_id="test_postgres_store_id",
                context_type=ContextType.AGENT_STATE,
                source_agent="test_agent",
                target_agent=None,
                timestamp=datetime.now(),
                session_id="test_session",
                tags=["test", "postgres", "store"]
            ),
            content={"state": "active", "messages": ["Hello", "PostgreSQL Store"]}
        )
        
        # Store the context object
        self.postgres_storage.store(context_object)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query and parameters of the execute call
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("INSERT INTO contexts" in args[0])
        self.assertEqual(args[1][0], "test_postgres_store_id")
        self.assertEqual(args[1][1], ContextType.AGENT_STATE.value)
        self.assertEqual(args[1][2], "test_agent")
        self.assertEqual(args[1][5], "test_session")
        self.assertEqual(args[1][6], ["test", "postgres", "store"])
        self.assertEqual(json.loads(args[1][7])["state"], "active")
        self.assertEqual(json.loads(args[1][7])["messages"], ["Hello", "PostgreSQL Store"])
        
        # Check that commit was called on the connection
        self.connection_mock.commit.assert_called_once()
    
    def test_retrieve_by_id(self):
        # Test retrieving a context object from PostgreSQL by ID
        context_id = "test_postgres_retrieve_id"
        timestamp = datetime.now()
        
        # Mock the fetchone method of the cursor to return a row
        row = (
            context_id,
            ContextType.AGENT_STATE.value,
            "test_agent",
            None,
            timestamp,
            "test_session",
            ["test", "postgres", "retrieve"],
            json.dumps({"state": "active", "messages": ["Hello", "PostgreSQL Retrieve"]})
        )
        self.cursor_mock.fetchone.return_value = row
        
        # Retrieve the context object by ID
        retrieved_context = self.postgres_storage.retrieve_by_id(context_id)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query and parameters of the execute call
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("SELECT * FROM contexts WHERE context_id = %s" in args[0])
        self.assertEqual(args[1][0], context_id)
        
        # Check that the retrieved context object is correct
        self.assertEqual(retrieved_context.metadata.context_id, context_id)
        self.assertEqual(retrieved_context.metadata.context_type, ContextType.AGENT_STATE)
        self.assertEqual(retrieved_context.metadata.source_agent, "test_agent")
        self.assertEqual(retrieved_context.metadata.target_agent, None)
        self.assertEqual(retrieved_context.metadata.session_id, "test_session")
        self.assertEqual(retrieved_context.metadata.tags, ["test", "postgres", "retrieve"])
        self.assertEqual(retrieved_context.content["state"], "active")
        self.assertEqual(retrieved_context.content["messages"], ["Hello", "PostgreSQL Retrieve"])
    
    def test_update(self):
        # Test updating a context object in PostgreSQL
        context_id = "test_postgres_update_id"
        updated_content = {"state": "inactive", "messages": ["Hello", "PostgreSQL Updated"]}
        
        # Update the context object
        self.postgres_storage.update(context_id, updated_content)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query and parameters of the execute call
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("UPDATE contexts SET content = %s WHERE context_id = %s" in args[0])
        self.assertEqual(args[1][0], json.dumps(updated_content))
        self.assertEqual(args[1][1], context_id)
        
        # Check that commit was called on the connection
        self.connection_mock.commit.assert_called_once()
    
    def test_delete(self):
        # Test deleting a context object from PostgreSQL
        context_id = "test_postgres_delete_id"
        
        # Delete the context object
        self.postgres_storage.delete(context_id)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query and parameters of the execute call
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("DELETE FROM contexts WHERE context_id = %s" in args[0])
        self.assertEqual(args[1][0], context_id)
        
        # Check that commit was called on the connection
        self.connection_mock.commit.assert_called_once()
    
    def test_list_by_session(self):
        # Test listing context objects by session ID
        session_id = "test_postgres_list_session"
        timestamp = datetime.now()
        
        # Mock the fetchall method of the cursor to return rows
        rows = [
            (
                f"test_postgres_list_id_{i}",
                ContextType.AGENT_STATE.value,
                "test_agent",
                None,
                timestamp,
                session_id,
                ["test", "postgres", "list"],
                json.dumps({"state": "active", "messages": [f"Hello {i}", "PostgreSQL List"]})
            )
            for i in range(3)
        ]
        self.cursor_mock.fetchall.return_value = rows
        
        # List context objects by session ID
        results = self.postgres_storage.list_by_session(session_id)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query and parameters of the execute call
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("SELECT * FROM contexts WHERE session_id = %s" in args[0])
        self.assertEqual(args[1][0], session_id)
        
        # Check that the list results are correct
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0].metadata.context_id, "test_postgres_list_id_0")
        self.assertEqual(results[1].metadata.context_id, "test_postgres_list_id_1")
        self.assertEqual(results[2].metadata.context_id, "test_postgres_list_id_2")
        
        for i, result in enumerate(results):
            self.assertEqual(result.metadata.session_id, session_id)
            self.assertEqual(result.content["state"], "active")
            self.assertEqual(result.content["messages"][0], f"Hello {i}")
            self.assertEqual(result.content["messages"][1], "PostgreSQL List")
    
    def test_create_session_bridge(self):
        # Test creating a session bridge in PostgreSQL
        source_session_id = "source_session"
        target_session_id = "target_session"
        
        # Create a session bridge
        self.postgres_storage.create_session_bridge(source_session_id, target_session_id)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query and parameters of the execute call
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("INSERT INTO session_bridges" in args[0])
        self.assertEqual(args[1][0], source_session_id)
        self.assertEqual(args[1][1], target_session_id)
        
        # Check that commit was called on the connection
        self.connection_mock.commit.assert_called_once()

class TestPineconeStorage(unittest.TestCase):
    
    def setUp(self):
        # Mock pinecone client and index
        self.index_mock = MagicMock()
        self.pinecone_mock = MagicMock()
        self.pinecone_mock.Index.return_value = self.index_mock
        
        # Create a patch for pinecone
        self.pinecone_patch = patch('context_persistence.pinecone', self.pinecone_mock)
        
        # Start the patch
        self.pinecone_mock = self.pinecone_patch.start()
        
        # Create a PineconeStorage instance
        self.pinecone_storage = PineconeStorage(config={
            "api_key": "test_key",
            "environment": "test_env",
            "index_name": "test_index"
        })
    
    def tearDown(self):
        # Stop the patch
        self.pinecone_patch.stop()
    
    def test_store(self):
        # Test storing a context object in Pinecone
        context_object = ContextObject(
            metadata=ContextMetadata(
                context_id="test_pinecone_store_id",
                context_type=ContextType.AGENT_STATE,
                source_agent="test_agent",
                target_agent=None,
                timestamp=datetime.now(),
                session_id="test_session",
                tags=["test", "pinecone", "store"]
            ),
            content={"state": "active", "messages": ["Hello", "Pinecone Store"]}
        )
        
        # Store the context object
        self.pinecone_storage.store(context_object)
        
        # Check that the upsert method was called on the index
        self.index_mock.upsert.assert_called_once()
        
        # Verify the vectors and metadata of the upsert call
        args, kwargs = self.index_mock.upsert.call_args
        self.assertEqual(kwargs["vectors"][0]["id"], "test_pinecone_store_id")
        self.assertEqual(kwargs["vectors"][0]["metadata"]["context_type"], ContextType.AGENT_STATE.value)
        self.assertEqual(kwargs["vectors"][0]["metadata"]["source_agent"], "test_agent")
        self.assertEqual(kwargs["vectors"][0]["metadata"]["session_id"], "test_session")
        self.assertEqual(kwargs["vectors"][0]["metadata"]["tags"], ["test", "pinecone", "store"])
        self.assertEqual(kwargs["vectors"][0]["metadata"]["content"], json.dumps({"state": "active", "messages": ["Hello", "Pinecone Store"]}))
    
    def test_retrieve_by_id(self):
        # Test retrieving a context object from Pinecone by ID
        context_id = "test_pinecone_retrieve_id"
        timestamp = datetime.now().isoformat()
        
        # Mock the fetch method of the index to return metadata
        fetch_response = {
            "vectors": {
                context_id: {
                    "id": context_id,
                    "metadata": {
                        "context_type": ContextType.AGENT_STATE.value,
                        "source_agent": "test_agent",
                        "target_agent": None,
                        "timestamp": timestamp,
                        "session_id": "test_session",
                        "tags": ["test", "pinecone", "retrieve"],
                        "content": json.dumps({"state": "active", "messages": ["Hello", "Pinecone Retrieve"]})
                    }
                }
            }
        }
        self.index_mock.fetch.return_value = fetch_response
        
        # Retrieve the context object by ID
        retrieved_context = self.pinecone_storage.retrieve_by_id(context_id)
        
        # Check that the fetch method was called on the index
        self.index_mock.fetch.assert_called_once_with(ids=[context_id])
        
        # Check that the retrieved context object is correct
        self.assertEqual(retrieved_context.metadata.context_id, context_id)
        self.assertEqual(retrieved_context.metadata.context_type, ContextType.AGENT_STATE)
        self.assertEqual(retrieved_context.metadata.source_agent, "test_agent")
        self.assertEqual(retrieved_context.metadata.session_id, "test_session")
        self.assertEqual(retrieved_context.metadata.tags, ["test", "pinecone", "retrieve"])
        self.assertEqual(retrieved_context.content["state"], "active")
        self.assertEqual(retrieved_context.content["messages"], ["Hello", "Pinecone Retrieve"])
    
    def test_update(self):
        # Test updating a context object in Pinecone
        context_id = "test_pinecone_update_id"
        updated_content = {"state": "inactive", "messages": ["Hello", "Pinecone Updated"]}
        timestamp = datetime.now().isoformat()
        
        # Mock the fetch method of the index to return metadata
        fetch_response = {
            "vectors": {
                context_id: {
                    "id": context_id,
                    "metadata": {
                        "context_type": ContextType.AGENT_STATE.value,
                        "source_agent": "test_agent",
                        "target_agent": None,
                        "timestamp": timestamp,
                        "session_id": "test_session",
                        "tags": ["test", "pinecone", "update"],
                        "content": json.dumps({"state": "active", "messages": ["Hello", "Pinecone Update"]})
                    }
                }
            }
        }
        self.index_mock.fetch.return_value = fetch_response
        
        # Update the context object
        self.pinecone_storage.update(context_id, updated_content)
        
        # Check that the fetch and upsert methods were called on the index
        self.index_mock.fetch.assert_called_once_with(ids=[context_id])
        self.index_mock.upsert.assert_called_once()
        
        # Verify the vectors and metadata of the upsert call
        args, kwargs = self.index_mock.upsert.call_args
        self.assertEqual(kwargs["vectors"][0]["id"], context_id)
        self.assertEqual(kwargs["vectors"][0]["metadata"]["context_type"], ContextType.AGENT_STATE.value)
        self.assertEqual(kwargs["vectors"][0]["metadata"]["source_agent"], "test_agent")
        self.assertEqual(kwargs["vectors"][0]["metadata"]["session_id"], "test_session")
        self.assertEqual(kwargs["vectors"][0]["metadata"]["tags"], ["test", "pinecone", "update"])
        self.assertEqual(kwargs["vectors"][0]["metadata"]["content"], json.dumps(updated_content))
    
    def test_delete(self):
        # Test deleting a context object from Pinecone
        context_id = "test_pinecone_delete_id"
        
        # Delete the context object
        self.pinecone_storage.delete(context_id)
        
        # Check that the delete method was called on the index
        self.index_mock.delete.assert_called_once_with(ids=[context_id])
    
    def test_search(self):
        # Test searching for context objects in Pinecone
        query = "test query"
        filters = {"session_id": "test_session", "context_type": ContextType.AGENT_STATE.value}
        timestamp = datetime.now().isoformat()
        
        # Mock the query method of the index to return matches
        query_response = {
            "matches": [
                {
                    "id": f"search_result_{i}",
                    "score": 0.9 - (i * 0.1),
                    "metadata": {
                        "context_type": ContextType.AGENT_STATE.value,
                        "source_agent": "test_agent",
                        "target_agent": None,
                        "timestamp": timestamp,
                        "session_id": "test_session",
                        "tags": ["test", "pinecone", "search"],
                        "content": json.dumps({"state": "active", "messages": [f"Hello {i}", "Pinecone Search"]})
                    }
                }
                for i in range(3)
            ]
        }
        self.index_mock.query.return_value = query_response
        
        # Search for context objects
        results = self.pinecone_storage.search(query, filters)
        
        # Check that the query method was called on the index
        self.index_mock.query.assert_called_once()
        
        # Verify the query and filter parameters of the query call
        args, kwargs = self.index_mock.query.call_args
        self.assertEqual(kwargs["vector"], [0.0] * 1536)  # Default vector dimensions
        self.assertEqual(kwargs["filter"], filters)
        self.assertEqual(kwargs["top_k"], 10)  # Default top_k
        
        # Check that the search results are correct
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0].metadata.context_id, "search_result_0")
        self.assertEqual(results[1].metadata.context_id, "search_result_1")
        self.assertEqual(results[2].metadata.context_id, "search_result_2")
        
        for i, result in enumerate(results):
            self.assertEqual(result.metadata.session_id, "test_session")
            self.assertEqual(result.content["state"], "active")
            self.assertEqual(result.content["messages"][0], f"Hello {i}")
            self.assertEqual(result.content["messages"][1], "Pinecone Search")

if __name__ == '__main__':
    unittest.main()