"""
CLI Session Logger for the SecondBrain system.

This module provides real-time logging to Notion for CLI sessions to ensure
context is never lost during automatic compaction events, session disconnections,
or other failure modes.

Key features:
- Logs all CLI interactions to Notion AS THEY HAPPEN
- Creates bridges between related CLI sessions
- Handles compaction events properly
- Stores logs redundantly in both Notion and the filesystem
- Loads previous context at the start of each session

Example usage:
    # Initialize the session logger
    session_logger = CLISessionLogger()
    
    # Log a user message
    await session_logger.log_user_message("User message here")
    
    # Log a system action
    await session_logger.log_system_action("ACTION_TYPE", {"details": "here"})
    
    # Log an assistant response
    await session_logger.log_assistant_response("Assistant response here")
    
    # Log a tool call
    await session_logger.log_tool_call("ToolName", input_data, output_data)
    
    # Handle compaction
    new_logger = await session_logger.handle_compaction("CONTEXT_LIMIT_REACHED")
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

# Import Notion client if available
try:
    from notion_client import Client as NotionClient
except ImportError:
    # Create a placeholder for offline development
    class NotionClient:
        def __init__(self, **kwargs):
            self.auth = kwargs.get("auth")
            self.connected = False
            print("WARNING: Using placeholder NotionClient")
            
        async def pages_create(self, **kwargs):
            print("Would create page:", json.dumps(kwargs, indent=2)[:100] + "...")
            return {"id": f"page-{int(time.time())}"}
            
        async def blocks_children_append(self, **kwargs):
            print("Would append blocks:", json.dumps(kwargs, indent=2)[:100] + "...")
            return {"id": kwargs.get("block_id")}
            
        async def pages_update(self, **kwargs):
            print("Would update page:", json.dumps(kwargs, indent=2)[:100] + "...")
            return {"id": kwargs.get("page_id")}
            
        async def databases_query(self, **kwargs):
            print("Would query database:", json.dumps(kwargs, indent=2)[:100] + "...")
            return {"results": []}
            
        async def blocks_children_list(self, **kwargs):
            print("Would list blocks:", json.dumps(kwargs, indent=2)[:100] + "...")
            return {"results": []}

class CLISessionLogger:
    """
    Real-time logger for CLI sessions that preserves context in Notion.
    
    This class implements a comprehensive logging system that:
    1. Logs all CLI interactions to Notion AS THEY HAPPEN
    2. Creates bridges between related sessions
    3. Handles compaction events properly
    4. Maintains redundant storage in Notion and filesystem
    5. Loads previous context at session initialization
    
    Following the "NEVER TRUNCATE" principle, all context is preserved
    with full surrounding paragraphs.
    """
    
    def __init__(self, 
                 session_id: Optional[str] = None,
                 notion_client: Optional[NotionClient] = None,
                 log_directory: Optional[str] = None):
        """
        Initialize the CLI Session Logger.
        
        Args:
            session_id: Optional custom session ID, generated if not provided
            notion_client: Optional pre-configured Notion client
            log_directory: Optional custom log directory
        """
        self.session_id = session_id or f"cli-session-{int(time.time())}"
        self.notion = notion_client or self._initialize_notion_client()
        self.tasks_db_id = self._get_notion_database_id()
        self.session_page_id = None
        self.log_directory = log_directory or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "logs"
        )
        
        # Make sure log directory exists
        os.makedirs(self.log_directory, exist_ok=True)
        
        # Initialize the session in Notion
        self._initialize_session()
        
        # Load previous context if available
        self.previous_context = None
        self.load_most_recent_context()
        
        # Log initialization
        self._log_to_file("SYSTEM", f"Session initialized with ID: {self.session_id}")
    
    def _initialize_notion_client(self) -> NotionClient:
        """
        Initialize the Notion client with API key from environment.
        
        Returns:
            Configured Notion client
        """
        # Get API key from environment
        notion_api_key = os.environ.get("NOTION_API_KEY")
        
        if not notion_api_key:
            print("WARNING: No NOTION_API_KEY found in environment. Using placeholder client.")
            return NotionClient(auth="placeholder")
        
        # Create and return the client
        return NotionClient(auth=notion_api_key)
    
    def _get_notion_database_id(self) -> str:
        """
        Get the Notion database ID for CLI sessions.
        
        First checks environment variable, then config file.
        
        Returns:
            Notion database ID
        """
        # Try environment variable first
        db_id = os.environ.get("NOTION_CLI_SESSIONS_DB_ID")
        
        if db_id:
            return db_id
            
        # Try config file
        try:
            config_file = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "config",
                "notion_db_ids.json"
            )
            
            if os.path.exists(config_file):
                with open(config_file, "r") as f:
                    config = json.load(f)
                
                if "cli_sessions" in config:
                    return config["cli_sessions"]
                elif "tasks" in config:
                    # Fall back to tasks database if cli_sessions not found
                    return config["tasks"]
        except Exception as e:
            self._log_to_file("ERROR", f"Error reading config file: {str(e)}")
        
        # Fall back to tasks database ID if available
        db_id = os.environ.get("NOTION_TASKS_DATABASE_ID")
        if db_id:
            return db_id
            
        # Last resort - hardcoded ID from recent Notion database IDs in code
        return "1eef9e16-9eff-815e-8f0d-cdebf4b29ad4"  # Default to tasks database
    
    async def _initialize_session(self):
        """
        Create a new session page in Notion.
        
        This creates a dedicated page for the current CLI session
        and sets up initial metadata.
        """
        try:
            # Create session page in the database
            page = await self.notion.pages.create(
                parent={"database_id": self.tasks_db_id},
                properties={
                    "Name": {"title": [{"text": {"content": f"CLI Session: {self.session_id}"}}]},
                    "Status": {"select": {"name": "Active"}},
                    "Started": {"date": {"start": datetime.now().isoformat()}},
                    "Session ID": {"rich_text": [{"text": {"content": self.session_id}}]}
                }
            )
            self.session_page_id = page["id"]
            
            # Log session initialization
            await self.log_system_action("SESSION_INITIALIZED", {"session_id": self.session_id})
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error initializing Notion session: {str(e)}")
            print(f"Error initializing Notion session: {str(e)}")
    
    async def log_user_message(self, message: str):
        """
        Log a user message to Notion in real-time.
        
        Args:
            message: The user message to log
        """
        if not self.session_page_id:
            self._log_to_file("ERROR", "Cannot log user message - no session page ID")
            return
        
        try:
            # Add user message to session page
            await self.notion.blocks.children.append(
                block_id=self.session_page_id,
                children=[{
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"👤 USER: {message}"},
                            "annotations": {"bold": True, "color": "blue"}
                        }]
                    }
                }]
            )
            
            # Also log to filesystem as backup
            self._log_to_file("USER", message)
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error logging user message: {str(e)}")
            print(f"Error logging user message: {str(e)}")
    
    async def log_system_action(self, action: str, details: Dict[str, Any]):
        """
        Log a system action to Notion in real-time.
        
        Args:
            action: The type of system action
            details: Dictionary with action details
        """
        if not self.session_page_id:
            self._log_to_file("ERROR", "Cannot log system action - no session page ID")
            return
        
        try:
            # Add system action to session page
            await self.notion.blocks.children.append(
                block_id=self.session_page_id,
                children=[{
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"⚙️ SYSTEM ({action}): {json.dumps(details)}"},
                            "annotations": {"code": True, "color": "gray"}
                        }]
                    }
                }]
            )
            
            # Also log to filesystem as backup
            self._log_to_file("SYSTEM", f"{action}: {json.dumps(details)}")
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error logging system action: {str(e)}")
            print(f"Error logging system action: {str(e)}")
    
    async def log_assistant_response(self, response: str):
        """
        Log an assistant response to Notion in real-time.
        
        Args:
            response: The assistant's response to log
        """
        if not self.session_page_id:
            self._log_to_file("ERROR", "Cannot log assistant response - no session page ID")
            return
        
        try:
            # Add assistant response to session page
            await self.notion.blocks.children.append(
                block_id=self.session_page_id,
                children=[{
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"🤖 ASSISTANT: {response}"},
                            "annotations": {"color": "green"}
                        }]
                    }
                }]
            )
            
            # Also log to filesystem as backup
            self._log_to_file("ASSISTANT", response)
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error logging assistant response: {str(e)}")
            print(f"Error logging assistant response: {str(e)}")
    
    async def log_tool_call(self, tool_name: str, input_data: Any, output_data: Any):
        """
        Log a tool call to Notion in real-time.
        
        Args:
            tool_name: Name of the tool being called
            input_data: Input provided to the tool
            output_data: Output returned by the tool
        """
        if not self.session_page_id:
            self._log_to_file("ERROR", "Cannot log tool call - no session page ID")
            return
        
        try:
            # Convert input/output to JSON strings safely
            input_json = json.dumps(input_data) if input_data is not None else "null"
            output_json = json.dumps(output_data) if output_data is not None else "null"
            
            # Add tool call to session page
            await self.notion.blocks.children.append(
                block_id=self.session_page_id,
                children=[{
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"🔧 TOOL ({tool_name}): Input: {input_json}, Output: {output_json}"},
                            "annotations": {"code": True, "color": "purple"}
                        }]
                    }
                }]
            )
            
            # Also log to filesystem as backup
            self._log_to_file("TOOL", f"{tool_name}: {json.dumps({'input': input_data, 'output': output_data})}")
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error logging tool call: {str(e)}")
            print(f"Error logging tool call: {str(e)}")
    
    async def handle_compaction(self, compaction_reason: str) -> 'CLISessionLogger':
        """
        Handle context compaction event by creating a new session
        that bridges to the current one.
        
        Args:
            compaction_reason: Reason for the compaction event
            
        Returns:
            New CLISessionLogger instance with bridge to this session
        """
        if not self.session_page_id:
            self._log_to_file("ERROR", "Cannot handle compaction - no session page ID")
            return None
        
        try:
            # Log compaction event
            await self.notion.blocks.children.append(
                block_id=self.session_page_id,
                children=[{
                    "object": "block",
                    "type": "callout",
                    "callout": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"🔄 COMPACTION EVENT: {compaction_reason}"}
                        }],
                        "icon": {"emoji": "⚠️"},
                        "color": "yellow_background"
                    }
                }]
            )
            
            # Update session status
            await self.notion.pages.update(
                page_id=self.session_page_id,
                properties={
                    "Status": {"select": {"name": "Compacted"}},
                    "Ended": {"date": {"start": datetime.now().isoformat()}}
                }
            )
            
            # Create a new session that bridges to this one
            new_session_id = f"{self.session_id}-continued"
            new_logger = CLISessionLogger(
                session_id=new_session_id,
                notion_client=self.notion,
                log_directory=self.log_directory
            )
            
            # Create bridge between sessions
            await new_logger._create_bridge_to_previous_session(self.session_page_id)
            
            # Log to filesystem
            self._log_to_file("COMPACTION", f"Session compacted due to: {compaction_reason}")
            self._log_to_file("BRIDGE", f"Continued in session: {new_session_id}")
            
            return new_logger
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error handling compaction: {str(e)}")
            print(f"Error handling compaction: {str(e)}")
            return None
    
    async def _create_bridge_to_previous_session(self, previous_session_id: str):
        """
        Create a bridge to a previous session.
        
        Args:
            previous_session_id: ID of the previous session to bridge to
        """
        if not self.session_page_id or not previous_session_id:
            self._log_to_file("ERROR", "Cannot create bridge - missing session page ID")
            return
        
        try:
            # Add reference to the previous session
            await self.notion.blocks.children.append(
                block_id=self.session_page_id,
                children=[{
                    "object": "block",
                    "type": "callout",
                    "callout": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"⛓️ CONTINUED FROM PREVIOUS SESSION: {previous_session_id}"}
                        }],
                        "icon": {"emoji": "🔄"},
                        "color": "blue_background"
                    }
                }]
            )
            
            # Update previous session to link to this one
            await self.notion.blocks.children.append(
                block_id=previous_session_id,
                children=[{
                    "object": "block",
                    "type": "callout",
                    "callout": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"⛓️ CONTINUED IN NEXT SESSION: {self.session_page_id}"}
                        }],
                        "icon": {"emoji": "🔄"},
                        "color": "blue_background"
                    }
                }]
            )
            
            # Update session properties
            await self.notion.pages.update(
                page_id=self.session_page_id,
                properties={
                    "Previous Session": {"rich_text": [{"text": {"content": previous_session_id}}]}
                }
            )
            
            await self.notion.pages.update(
                page_id=previous_session_id,
                properties={
                    "Next Session": {"rich_text": [{"text": {"content": self.session_page_id}}]}
                }
            )
            
            # Log to filesystem
            self._log_to_file("BRIDGE", f"Continued from session: {previous_session_id}")
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error creating session bridge: {str(e)}")
            print(f"Error creating session bridge: {str(e)}")
    
    async def load_most_recent_context(self) -> Optional[Dict[str, Any]]:
        """
        Load the most recent context from Notion to establish continuity
        between sessions.
        
        Returns:
            Context dictionary with session_id and messages, or None if not found
        """
        try:
            # Query for the most recent active or compacted session
            response = await self.notion.databases.query(
                database_id=self.tasks_db_id,
                sorts=[{"property": "Started", "direction": "descending"}],
                filter={
                    "or": [
                        {"property": "Status", "select": {"equals": "Active"}},
                        {"property": "Status", "select": {"equals": "Compacted"}}
                    ]
                },
                page_size=5  # Get the most recent 5 sessions
            )
            
            # Find the most recent session that's not the current one
            for result in response.get("results", []):
                if result["id"] != self.session_page_id:
                    previous_session_id = result["id"]
                    
                    # Create a bridge to the previous session
                    await self._create_bridge_to_previous_session(previous_session_id)
                    
                    # Load the content blocks from the previous session
                    blocks = await self.notion.blocks.children.list(
                        block_id=previous_session_id
                    )
                    
                    # Process and store the context
                    context = {
                        "session_id": previous_session_id,
                        "messages": []
                    }
                    
                    for block in blocks.get("results", []):
                        if block["type"] == "paragraph" and block["paragraph"]["rich_text"]:
                            text = block["paragraph"]["rich_text"][0]["text"]["content"]
                            context["messages"].append(text)
                    
                    # Log that we've loaded previous context
                    await self.log_system_action("LOAD_PREVIOUS_CONTEXT", {
                        "previous_session_id": previous_session_id,
                        "message_count": len(context["messages"])
                    })
                    
                    # Store in instance variable
                    self.previous_context = context
                    
                    return context
            
            # If we get here, there's no previous context
            self._log_to_file("SYSTEM", "No previous context found")
            return None
        
        except Exception as e:
            self._log_to_file("ERROR", f"Error loading previous context: {str(e)}")
            print(f"Error loading previous context: {str(e)}")
            return None
    
    def _log_to_file(self, log_type: str, message: str):
        """
        Log to filesystem as backup.
        
        Args:
            log_type: Type of log entry (USER, SYSTEM, etc.)
            message: Message to log
        """
        try:
            # Create log file path
            log_file = os.path.join(self.log_directory, f"cli-session-{self.session_id}.log")
            
            # Append log entry
            with open(log_file, "a") as f:
                timestamp = datetime.now().isoformat()
                f.write(f"[{timestamp}] {log_type}: {message}\n")
        
        except Exception as e:
            print(f"Error logging to file: {str(e)}")
    
    async def close_session(self):
        """
        Close the current session properly.
        
        This marks the session as completed in Notion and logs the closure.
        """
        if not self.session_page_id:
            self._log_to_file("ERROR", "Cannot close session - no session page ID")
            return
        
        try:
            # Update session status
            await self.notion.pages.update(
                page_id=self.session_page_id,
                properties={
                    "Status": {"select": {"name": "Completed"}},
                    "Ended": {"date": {"start": datetime.now().isoformat()}}
                }
            )
            
            # Log session closure
            await self.notion.blocks.children.append(
                block_id=self.session_page_id,
                children=[{
                    "object": "block",
                    "type": "callout",
                    "callout": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "✅ SESSION COMPLETED NORMALLY"}
                        }],
                        "icon": {"emoji": "✅"},
                        "color": "green_background"
                    }
                }]
            )
            
            # Log to filesystem
            self._log_to_file("SYSTEM", "Session closed normally")
            
        except Exception as e:
            self._log_to_file("ERROR", f"Error closing session: {str(e)}")
            print(f"Error closing session: {str(e)}")
    
    def get_session_url(self) -> Optional[str]:
        """
        Get the Notion URL for this session.
        
        Returns:
            URL to the Notion page for this session, or None if not available
        """
        if not self.session_page_id:
            return None
        
        return f"https://notion.so/{self.session_page_id.replace('-', '')}"
    
    def __del__(self):
        """Cleanup when the object is destroyed."""
        self._log_to_file("SYSTEM", "Logger instance destroyed")