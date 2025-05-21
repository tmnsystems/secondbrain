import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json
import tempfile
from datetime import datetime

# Add the src directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from communication_logger import (
    LogEventType, LogEvent, LogLevel, CommunicationLogger,
    LoggingMiddleware, FileLogTarget, DatabaseLogTarget, NotionLogTarget
)

class TestCommunicationLogger(unittest.TestCase):
    
    def setUp(self):
        # Create mock log targets
        self.file_target_mock = MagicMock(spec=FileLogTarget)
        self.db_target_mock = MagicMock(spec=DatabaseLogTarget)
        self.notion_target_mock = MagicMock(spec=NotionLogTarget)
        
        # Create a logger with mock targets
        self.logger = CommunicationLogger(
            targets=[self.file_target_mock, self.db_target_mock, self.notion_target_mock],
            min_level=LogLevel.INFO
        )
    
    def test_log_message(self):
        # Test logging a message
        source_agent = "agent1"
        target_agent = "agent2"
        message_type = LogEventType.MESSAGE_SENT
        message_content = {"text": "Hello, world!"}
        
        # Log a message
        self.logger.log_message(source_agent, target_agent, message_type, message_content)
        
        # Check that log_event was called on each target
        self.file_target_mock.log_event.assert_called_once()
        self.db_target_mock.log_event.assert_called_once()
        self.notion_target_mock.log_event.assert_called_once()
        
        # Verify the log event
        log_event = self.file_target_mock.log_event.call_args[0][0]
        self.assertEqual(log_event.source_agent, source_agent)
        self.assertEqual(log_event.target_agent, target_agent)
        self.assertEqual(log_event.event_type, message_type)
        self.assertEqual(log_event.content, message_content)
        self.assertEqual(log_event.level, LogLevel.INFO)  # Default level
    
    def test_log_level_filtering(self):
        # Test that log events are filtered by level
        
        # Create a logger with a minimum level of WARNING
        logger = CommunicationLogger(
            targets=[self.file_target_mock, self.db_target_mock],
            min_level=LogLevel.WARNING
        )
        
        # Log an INFO-level message (should be filtered out)
        logger.log_message(
            source_agent="agent1",
            target_agent="agent2",
            message_type=LogEventType.MESSAGE_SENT,
            message_content={"text": "Info message"},
            level=LogLevel.INFO
        )
        
        # Check that no targets were called
        self.file_target_mock.log_event.assert_not_called()
        self.db_target_mock.log_event.assert_not_called()
        
        # Log a WARNING-level message (should be logged)
        logger.log_message(
            source_agent="agent1",
            target_agent="agent2",
            message_type=LogEventType.MESSAGE_SENT,
            message_content={"text": "Warning message"},
            level=LogLevel.WARNING
        )
        
        # Check that all targets were called
        self.file_target_mock.log_event.assert_called_once()
        self.db_target_mock.log_event.assert_called_once()
    
    def test_log_with_metadata(self):
        # Test logging a message with metadata
        source_agent = "agent1"
        target_agent = "agent2"
        message_type = LogEventType.MESSAGE_SENT
        message_content = {"text": "Hello, world!"}
        metadata = {"session_id": "test_session", "request_id": "12345"}
        
        # Log a message with metadata
        self.logger.log_message(
            source_agent=source_agent,
            target_agent=target_agent,
            message_type=message_type,
            message_content=message_content,
            metadata=metadata
        )
        
        # Check that log_event was called on each target
        self.file_target_mock.log_event.assert_called_once()
        self.db_target_mock.log_event.assert_called_once()
        self.notion_target_mock.log_event.assert_called_once()
        
        # Verify the log event
        log_event = self.file_target_mock.log_event.call_args[0][0]
        self.assertEqual(log_event.source_agent, source_agent)
        self.assertEqual(log_event.target_agent, target_agent)
        self.assertEqual(log_event.event_type, message_type)
        self.assertEqual(log_event.content, message_content)
        self.assertEqual(log_event.metadata, metadata)
    
    def test_log_agent_state_change(self):
        # Test logging an agent state change
        agent_id = "agent1"
        old_state = {"status": "idle"}
        new_state = {"status": "busy", "task": "processing request"}
        
        # Log a state change
        self.logger.log_agent_state_change(agent_id, old_state, new_state)
        
        # Check that log_event was called on each target
        self.file_target_mock.log_event.assert_called_once()
        self.db_target_mock.log_event.assert_called_once()
        self.notion_target_mock.log_event.assert_called_once()
        
        # Verify the log event
        log_event = self.file_target_mock.log_event.call_args[0][0]
        self.assertEqual(log_event.source_agent, agent_id)
        self.assertEqual(log_event.target_agent, None)
        self.assertEqual(log_event.event_type, LogEventType.AGENT_STATE_CHANGED)
        self.assertEqual(log_event.content, {"old_state": old_state, "new_state": new_state})
    
    def test_log_workflow_event(self):
        # Test logging a workflow event
        workflow_id = "workflow1"
        node_id = "node1"
        event_type = LogEventType.WORKFLOW_NODE_STARTED
        node_input = {"task": "Process data"}
        
        # Log a workflow event
        self.logger.log_workflow_event(workflow_id, node_id, event_type, node_input)
        
        # Check that log_event was called on each target
        self.file_target_mock.log_event.assert_called_once()
        self.db_target_mock.log_event.assert_called_once()
        self.notion_target_mock.log_event.assert_called_once()
        
        # Verify the log event
        log_event = self.file_target_mock.log_event.call_args[0][0]
        self.assertEqual(log_event.source_agent, node_id)
        self.assertEqual(log_event.target_agent, None)
        self.assertEqual(log_event.event_type, event_type)
        self.assertEqual(log_event.content, node_input)
        self.assertEqual(log_event.metadata, {"workflow_id": workflow_id})
    
    def test_log_system_event(self):
        # Test logging a system event
        event_type = LogEventType.SYSTEM_STARTUP
        details = {"version": "1.0.0", "environment": "production"}
        
        # Log a system event
        self.logger.log_system_event(event_type, details)
        
        # Check that log_event was called on each target
        self.file_target_mock.log_event.assert_called_once()
        self.db_target_mock.log_event.assert_called_once()
        self.notion_target_mock.log_event.assert_called_once()
        
        # Verify the log event
        log_event = self.file_target_mock.log_event.call_args[0][0]
        self.assertEqual(log_event.source_agent, "system")
        self.assertEqual(log_event.target_agent, None)
        self.assertEqual(log_event.event_type, event_type)
        self.assertEqual(log_event.content, details)
    
    def test_get_logs(self):
        # Mock log events
        log_events = [
            LogEvent(
                id=f"event_{i}",
                timestamp=datetime.now(),
                source_agent="agent1",
                target_agent="agent2",
                event_type=LogEventType.MESSAGE_SENT,
                content={"text": f"Message {i}"},
                level=LogLevel.INFO,
                metadata={"session_id": "test_session"}
            )
            for i in range(5)
        ]
        
        # Mock the get_logs method of the file target
        self.file_target_mock.get_logs.return_value = log_events
        
        # Get logs from the logger
        filters = {"source_agent": "agent1", "event_type": LogEventType.MESSAGE_SENT}
        retrieved_logs = self.logger.get_logs(filters, target_index=0)  # Get from file target
        
        # Check that get_logs was called on the file target
        self.file_target_mock.get_logs.assert_called_once_with(filters)
        
        # Check that the logs were retrieved
        self.assertEqual(len(retrieved_logs), 5)
        for i, log in enumerate(retrieved_logs):
            self.assertEqual(log.id, f"event_{i}")
            self.assertEqual(log.source_agent, "agent1")
            self.assertEqual(log.target_agent, "agent2")
            self.assertEqual(log.event_type, LogEventType.MESSAGE_SENT)
            self.assertEqual(log.content, {"text": f"Message {i}"})
    
    def test_log_event_init(self):
        # Test creating a LogEvent
        timestamp = datetime.now()
        log_event = LogEvent(
            id="test_event",
            timestamp=timestamp,
            source_agent="agent1",
            target_agent="agent2",
            event_type=LogEventType.MESSAGE_SENT,
            content={"text": "Hello, world!"},
            level=LogLevel.INFO,
            metadata={"session_id": "test_session"}
        )
        
        # Check that the LogEvent was created correctly
        self.assertEqual(log_event.id, "test_event")
        self.assertEqual(log_event.timestamp, timestamp)
        self.assertEqual(log_event.source_agent, "agent1")
        self.assertEqual(log_event.target_agent, "agent2")
        self.assertEqual(log_event.event_type, LogEventType.MESSAGE_SENT)
        self.assertEqual(log_event.content, {"text": "Hello, world!"})
        self.assertEqual(log_event.level, LogLevel.INFO)
        self.assertEqual(log_event.metadata, {"session_id": "test_session"})
    
    def test_log_event_to_dict(self):
        # Create a LogEvent
        timestamp = datetime(2025, 5, 1, 12, 0, 0)
        log_event = LogEvent(
            id="test_to_dict_event",
            timestamp=timestamp,
            source_agent="agent1",
            target_agent="agent2",
            event_type=LogEventType.MESSAGE_SENT,
            content={"text": "Hello, world!"},
            level=LogLevel.INFO,
            metadata={"session_id": "test_session"}
        )
        
        # Convert the LogEvent to a dictionary
        event_dict = log_event.to_dict()
        
        # Check that the dictionary representation is correct
        self.assertEqual(event_dict["id"], "test_to_dict_event")
        self.assertEqual(event_dict["timestamp"], "2025-05-01T12:00:00")
        self.assertEqual(event_dict["source_agent"], "agent1")
        self.assertEqual(event_dict["target_agent"], "agent2")
        self.assertEqual(event_dict["event_type"], LogEventType.MESSAGE_SENT.value)
        self.assertEqual(event_dict["content"], {"text": "Hello, world!"})
        self.assertEqual(event_dict["level"], LogLevel.INFO.value)
        self.assertEqual(event_dict["metadata"], {"session_id": "test_session"})
    
    def test_log_event_from_dict(self):
        # Create a LogEvent dictionary
        event_dict = {
            "id": "test_from_dict_event",
            "timestamp": "2025-05-01T12:00:00",
            "source_agent": "agent1",
            "target_agent": "agent2",
            "event_type": LogEventType.MESSAGE_SENT.value,
            "content": {"text": "Hello, world!"},
            "level": LogLevel.INFO.value,
            "metadata": {"session_id": "test_session"}
        }
        
        # Create a LogEvent from the dictionary
        log_event = LogEvent.from_dict(event_dict)
        
        # Check that the LogEvent was created correctly
        self.assertEqual(log_event.id, "test_from_dict_event")
        self.assertEqual(log_event.timestamp, datetime(2025, 5, 1, 12, 0, 0))
        self.assertEqual(log_event.source_agent, "agent1")
        self.assertEqual(log_event.target_agent, "agent2")
        self.assertEqual(log_event.event_type, LogEventType.MESSAGE_SENT)
        self.assertEqual(log_event.content, {"text": "Hello, world!"})
        self.assertEqual(log_event.level, LogLevel.INFO)
        self.assertEqual(log_event.metadata, {"session_id": "test_session"})

class TestLoggingMiddleware(unittest.TestCase):
    
    def setUp(self):
        # Create a mock logger
        self.logger_mock = MagicMock(spec=CommunicationLogger)
        
        # Create a middleware with the mock logger
        self.middleware = LoggingMiddleware(logger=self.logger_mock)
    
    def test_intercept_message(self):
        # Test intercepting a message
        source_agent = "agent1"
        target_agent = "agent2"
        message = {"text": "Hello, world!"}
        
        # Intercept a message
        result = self.middleware.intercept_message(source_agent, target_agent, message)
        
        # Check that log_message was called on the logger
        self.logger_mock.log_message.assert_called_once_with(
            source_agent=source_agent,
            target_agent=target_agent,
            message_type=LogEventType.MESSAGE_SENT,
            message_content=message,
            level=LogLevel.INFO
        )
        
        # Check that the message was returned unchanged
        self.assertEqual(result, message)
    
    def test_intercept_response(self):
        # Test intercepting a response
        source_agent = "agent1"
        target_agent = "agent2"
        response = {"text": "Hello, world!", "status": "success"}
        
        # Intercept a response
        result = self.middleware.intercept_response(source_agent, target_agent, response)
        
        # Check that log_message was called on the logger
        self.logger_mock.log_message.assert_called_once_with(
            source_agent=source_agent,
            target_agent=target_agent,
            message_type=LogEventType.RESPONSE_RECEIVED,
            message_content=response,
            level=LogLevel.INFO
        )
        
        # Check that the response was returned unchanged
        self.assertEqual(result, response)
    
    def test_intercept_error(self):
        # Test intercepting an error
        source_agent = "agent1"
        target_agent = "agent2"
        error = {"error": "Something went wrong", "code": 500}
        
        # Intercept an error
        result = self.middleware.intercept_error(source_agent, target_agent, error)
        
        # Check that log_message was called on the logger with ERROR level
        self.logger_mock.log_message.assert_called_once_with(
            source_agent=source_agent,
            target_agent=target_agent,
            message_type=LogEventType.ERROR_OCCURRED,
            message_content=error,
            level=LogLevel.ERROR
        )
        
        # Check that the error was returned unchanged
        self.assertEqual(result, error)
    
    def test_intercept_workflow_event(self):
        # Test intercepting a workflow event
        workflow_id = "workflow1"
        node_id = "node1"
        event_type = LogEventType.WORKFLOW_NODE_STARTED
        node_input = {"task": "Process data"}
        
        # Intercept a workflow event
        self.middleware.intercept_workflow_event(workflow_id, node_id, event_type, node_input)
        
        # Check that log_workflow_event was called on the logger
        self.logger_mock.log_workflow_event.assert_called_once_with(
            workflow_id, node_id, event_type, node_input
        )

class TestFileLogTarget(unittest.TestCase):
    
    def setUp(self):
        # Create a temporary log file
        self.temp_file = tempfile.NamedTemporaryFile(delete=False)
        self.temp_file.close()
        
        # Create a FileLogTarget with the temporary file
        self.log_target = FileLogTarget(log_file_path=self.temp_file.name)
    
    def tearDown(self):
        # Remove the temporary log file
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)
    
    def test_log_event(self):
        # Create a log event
        log_event = LogEvent(
            id="test_file_event",
            timestamp=datetime.now(),
            source_agent="agent1",
            target_agent="agent2",
            event_type=LogEventType.MESSAGE_SENT,
            content={"text": "Hello, world!"},
            level=LogLevel.INFO,
            metadata={"session_id": "test_session"}
        )
        
        # Log the event
        self.log_target.log_event(log_event)
        
        # Read the log file
        with open(self.temp_file.name, 'r') as f:
            log_lines = f.readlines()
        
        # Check that the event was logged
        self.assertEqual(len(log_lines), 1)
        
        # Parse the logged event
        logged_event = json.loads(log_lines[0])
        self.assertEqual(logged_event["id"], "test_file_event")
        self.assertEqual(logged_event["source_agent"], "agent1")
        self.assertEqual(logged_event["target_agent"], "agent2")
        self.assertEqual(logged_event["event_type"], LogEventType.MESSAGE_SENT.value)
        self.assertEqual(logged_event["content"], {"text": "Hello, world!"})
        self.assertEqual(logged_event["level"], LogLevel.INFO.value)
        self.assertEqual(logged_event["metadata"], {"session_id": "test_session"})
    
    def test_get_logs(self):
        # Create several log events
        log_events = [
            LogEvent(
                id=f"file_event_{i}",
                timestamp=datetime.now(),
                source_agent="agent1" if i % 2 == 0 else "agent3",
                target_agent="agent2",
                event_type=LogEventType.MESSAGE_SENT if i % 2 == 0 else LogEventType.RESPONSE_RECEIVED,
                content={"text": f"Message {i}"},
                level=LogLevel.INFO,
                metadata={"session_id": "test_session"}
            )
            for i in range(5)
        ]
        
        # Log the events
        for event in log_events:
            self.log_target.log_event(event)
        
        # Get logs with filters
        filters = {"source_agent": "agent1", "event_type": LogEventType.MESSAGE_SENT}
        retrieved_logs = self.log_target.get_logs(filters)
        
        # Check that only matching logs were retrieved
        self.assertEqual(len(retrieved_logs), 3)  # Events 0, 2, 4
        for log in retrieved_logs:
            self.assertEqual(log.source_agent, "agent1")
            self.assertEqual(log.event_type, LogEventType.MESSAGE_SENT)
        
        # Get all logs
        all_logs = self.log_target.get_logs({})
        self.assertEqual(len(all_logs), 5)

class TestDatabaseLogTarget(unittest.TestCase):
    
    def setUp(self):
        # Mock psycopg2 connection and cursor
        self.cursor_mock = MagicMock()
        self.connection_mock = MagicMock()
        self.connection_mock.cursor.return_value = self.cursor_mock
        
        # Create a patch for psycopg2.connect
        self.connect_patch = patch('communication_logger.psycopg2.connect', return_value=self.connection_mock)
        
        # Start the patch
        self.connect_mock = self.connect_patch.start()
        
        # Create a DatabaseLogTarget
        self.log_target = DatabaseLogTarget(
            db_config={
                "host": "localhost",
                "port": 5432,
                "database": "test_db",
                "user": "test_user",
                "password": "test_password"
            }
        )
    
    def tearDown(self):
        # Stop all patches
        self.connect_patch.stop()
    
    def test_log_event(self):
        # Create a log event
        log_event = LogEvent(
            id="test_db_event",
            timestamp=datetime.now(),
            source_agent="agent1",
            target_agent="agent2",
            event_type=LogEventType.MESSAGE_SENT,
            content={"text": "Hello, world!"},
            level=LogLevel.INFO,
            metadata={"session_id": "test_session"}
        )
        
        # Log the event
        self.log_target.log_event(log_event)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query and parameters
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("INSERT INTO log_events" in args[0])
        self.assertEqual(args[1][0], "test_db_event")
        self.assertEqual(args[1][2], "agent1")
        self.assertEqual(args[1][3], "agent2")
        self.assertEqual(args[1][4], LogEventType.MESSAGE_SENT.value)
        self.assertEqual(json.loads(args[1][5]), {"text": "Hello, world!"})
        self.assertEqual(args[1][6], LogLevel.INFO.value)
        self.assertEqual(json.loads(args[1][7]), {"session_id": "test_session"})
        
        # Check that commit was called on the connection
        self.connection_mock.commit.assert_called_once()
    
    def test_get_logs(self):
        # Create a timestamp
        timestamp = datetime.now()
        
        # Mock the fetchall method of the cursor to return rows
        rows = [
            (
                f"db_event_{i}",
                timestamp.isoformat(),
                "agent1" if i % 2 == 0 else "agent3",
                "agent2",
                LogEventType.MESSAGE_SENT.value if i % 2 == 0 else LogEventType.RESPONSE_RECEIVED.value,
                json.dumps({"text": f"Message {i}"}),
                LogLevel.INFO.value,
                json.dumps({"session_id": "test_session"})
            )
            for i in range(5)
        ]
        self.cursor_mock.fetchall.return_value = rows
        
        # Get logs with filters
        filters = {"source_agent": "agent1", "event_type": LogEventType.MESSAGE_SENT}
        retrieved_logs = self.log_target.get_logs(filters)
        
        # Check that the execute method was called on the cursor
        self.cursor_mock.execute.assert_called_once()
        
        # Verify the SQL query
        args, kwargs = self.cursor_mock.execute.call_args
        self.assertTrue("SELECT * FROM log_events WHERE" in args[0])
        self.assertTrue("source_agent = %s" in args[0])
        self.assertTrue("event_type = %s" in args[0])
        
        # Check that all rows were returned
        self.assertEqual(len(retrieved_logs), 5)
        
        # Check the content of the retrieved logs
        for i, log in enumerate(retrieved_logs):
            self.assertEqual(log.id, f"db_event_{i}")
            self.assertEqual(log.timestamp, timestamp)
            self.assertEqual(log.source_agent, "agent1" if i % 2 == 0 else "agent3")
            self.assertEqual(log.target_agent, "agent2")
            self.assertEqual(log.event_type, LogEventType.MESSAGE_SENT if i % 2 == 0 else LogEventType.RESPONSE_RECEIVED)
            self.assertEqual(log.content, {"text": f"Message {i}"})
            self.assertEqual(log.level, LogLevel.INFO)
            self.assertEqual(log.metadata, {"session_id": "test_session"})

class TestNotionLogTarget(unittest.TestCase):
    
    def setUp(self):
        # Mock the notion_client.Client
        self.notion_client_mock = MagicMock()
        
        # Create a patch for notion_client.Client
        self.notion_patch = patch('communication_logger.notion_client.Client', return_value=self.notion_client_mock)
        
        # Start the patch
        self.notion_client_mock = self.notion_patch.start()
        
        # Create a NotionLogTarget
        self.log_target = NotionLogTarget(
            notion_api_key="test_api_key",
            database_id="test_database_id"
        )
    
    def tearDown(self):
        # Stop all patches
        self.notion_patch.stop()
    
    def test_log_event(self):
        # Create a log event
        log_event = LogEvent(
            id="test_notion_event",
            timestamp=datetime.now(),
            source_agent="agent1",
            target_agent="agent2",
            event_type=LogEventType.MESSAGE_SENT,
            content={"text": "Hello, world!"},
            level=LogLevel.INFO,
            metadata={"session_id": "test_session"}
        )
        
        # Log the event
        self.log_target.log_event(log_event)
        
        # Check that pages.create was called on the notion client
        self.notion_client_mock.pages.create.assert_called_once()
        
        # Verify the page properties
        args, kwargs = self.notion_client_mock.pages.create.call_args
        self.assertEqual(kwargs["parent"]["database_id"], "test_database_id")
        self.assertEqual(kwargs["properties"]["ID"]["title"][0]["text"]["content"], "test_notion_event")
        self.assertEqual(kwargs["properties"]["Source Agent"]["rich_text"][0]["text"]["content"], "agent1")
        self.assertEqual(kwargs["properties"]["Target Agent"]["rich_text"][0]["text"]["content"], "agent2")
        self.assertEqual(kwargs["properties"]["Event Type"]["select"]["name"], LogEventType.MESSAGE_SENT.value)
        self.assertEqual(kwargs["properties"]["Level"]["select"]["name"], LogLevel.INFO.value)
    
    def test_get_logs(self):
        # Mock the databases.query method of the notion client
        self.notion_client_mock.databases.query.return_value = {
            "results": [
                {
                    "id": f"page_{i}",
                    "properties": {
                        "ID": {"title": [{"text": {"content": f"notion_event_{i}"}}]},
                        "Timestamp": {"date": {"start": datetime.now().isoformat()}},
                        "Source Agent": {"rich_text": [{"text": {"content": "agent1" if i % 2 == 0 else "agent3"}}]},
                        "Target Agent": {"rich_text": [{"text": {"content": "agent2"}}]},
                        "Event Type": {"select": {"name": LogEventType.MESSAGE_SENT.value if i % 2 == 0 else LogEventType.RESPONSE_RECEIVED.value}},
                        "Content": {"rich_text": [{"text": {"content": json.dumps({"text": f"Message {i}"})}}]},
                        "Level": {"select": {"name": LogLevel.INFO.value}},
                        "Metadata": {"rich_text": [{"text": {"content": json.dumps({"session_id": "test_session"})}}]}
                    }
                }
                for i in range(5)
            ]
        }
        
        # Get logs with filters
        filters = {"source_agent": "agent1", "event_type": LogEventType.MESSAGE_SENT}
        retrieved_logs = self.log_target.get_logs(filters)
        
        # Check that databases.query was called on the notion client
        self.notion_client_mock.databases.query.assert_called_once()
        
        # Verify the query filter
        args, kwargs = self.notion_client_mock.databases.query.call_args
        self.assertEqual(kwargs["database_id"], "test_database_id")
        self.assertEqual(len(kwargs["filter"]["and"]), 2)
        
        # Check that logs were parsed correctly
        self.assertEqual(len(retrieved_logs), 5)
        
        # Check the content of the retrieved logs
        for i, log in enumerate(retrieved_logs):
            self.assertEqual(log.id, f"notion_event_{i}")
            self.assertEqual(log.source_agent, "agent1" if i % 2 == 0 else "agent3")
            self.assertEqual(log.target_agent, "agent2")
            self.assertEqual(log.event_type, LogEventType.MESSAGE_SENT if i % 2 == 0 else LogEventType.RESPONSE_RECEIVED)
            self.assertEqual(log.content, {"text": f"Message {i}"})
            self.assertEqual(log.level, LogLevel.INFO)
            self.assertEqual(log.metadata, {"session_id": "test_session"})

if __name__ == '__main__':
    unittest.main()