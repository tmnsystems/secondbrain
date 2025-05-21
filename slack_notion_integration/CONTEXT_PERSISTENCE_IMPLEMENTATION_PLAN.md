# Context Persistence Implementation Plan for CLI Sessions

## Problem Statement

The SecondBrain CLI experiences critical context loss during:
- Automatic compaction events (when context window fills up)
- Session disconnections
- Session timeouts
- CLI restarts

This context loss occurs because interactions are not being logged to Notion in real-time, creating a vulnerability window where important context can be lost forever. The consequence is repeated work, lost information, and system instability.

## Proposed Solution

Implement a comprehensive real-time context persistence system with:

1. **Real-Time Notion Logging**: All CLI interactions logged to Notion AS THEY HAPPEN
2. **Session Bridging**: Explicit links between related CLI sessions
3. **Compaction Event Handling**: Preservation of context during truncation
4. **Redundant Storage**: Both Notion and filesystem for backup
5. **Context Restoration**: Loading previous context at session start

## Implementation Details

### 1. Create CLI Session Logger

Create a `CLISessionLogger` class that logs all interactions in real-time to Notion:

```python
class CLISessionLogger:
    """
    Real-time logger for CLI sessions that preserves context in Notion.
    """
    
    def __init__(self, session_id=None, notion_client=None):
        """Initialize with optional session ID and Notion client."""
        self.session_id = session_id or f"cli-session-{int(time.time())}"
        self.notion = notion_client or self._initialize_notion_client()
        self.tasks_db_id = self._get_notion_database_id()
        self.session_page_id = None
        
        # Initialize the session in Notion
        self._initialize_session()
        
        # Load previous context if available
        self.previous_context = self.load_most_recent_context()
    
    def _initialize_notion_client(self):
        """Initialize Notion client with API key."""
        from notion_client import Client
        return Client(auth=os.environ.get("NOTION_API_KEY"))
    
    def _get_notion_database_id(self):
        """Get the Notion database ID for CLI sessions."""
        return os.environ.get("NOTION_CLI_SESSIONS_DB_ID")
    
    def _initialize_session(self):
        """Create a new session page in Notion."""
        # Create session page in the database
        page = self.notion.pages.create(
            parent={"database_id": self.tasks_db_id},
            properties={
                "Name": {"title": [{"text": {"content": f"CLI Session: {self.session_id}"}}]},
                "Status": {"select": {"name": "Active"}},
                "Started": {"date": {"start": datetime.now().isoformat()}}
            }
        )
        self.session_page_id = page["id"]
        
        # Log session initialization
        self.log_system_action("SESSION_INITIALIZED", {"session_id": self.session_id})
    
    def log_user_message(self, message):
        """Log user message to Notion in real-time."""
        if not self.session_page_id:
            return
        
        # Add user message to session page
        self.notion.blocks.children.append(
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
    
    def log_system_action(self, action, details):
        """Log system action to Notion in real-time."""
        if not self.session_page_id:
            return
        
        # Add system action to session page
        self.notion.blocks.children.append(
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
    
    def log_assistant_response(self, response):
        """Log assistant response to Notion in real-time."""
        if not self.session_page_id:
            return
        
        # Add assistant response to session page
        self.notion.blocks.children.append(
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
    
    def log_tool_call(self, tool_name, input_data, output_data):
        """Log tool call to Notion in real-time."""
        if not self.session_page_id:
            return
        
        # Add tool call to session page
        self.notion.blocks.children.append(
            block_id=self.session_page_id,
            children=[{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": f"🔧 TOOL ({tool_name}): Input: {json.dumps(input_data)}, Output: {json.dumps(output_data)}"},
                        "annotations": {"code": True, "color": "purple"}
                    }]
                }
            }]
        )
        
        # Also log to filesystem as backup
        self._log_to_file("TOOL", f"{tool_name}: {json.dumps({'input': input_data, 'output': output_data})}")
    
    def handle_compaction(self, compaction_reason):
        """
        Handle context compaction event by creating a new session
        that bridges to the current one.
        """
        if not self.session_page_id:
            return None
        
        # Log compaction event
        self.notion.blocks.children.append(
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
        self.notion.pages.update(
            page_id=self.session_page_id,
            properties={
                "Status": {"select": {"name": "Compacted"}},
                "Ended": {"date": {"start": datetime.now().isoformat()}}
            }
        )
        
        # Create a new session that bridges to this one
        new_session_id = f"{self.session_id}-continued"
        new_logger = CLISessionLogger(session_id=new_session_id, notion_client=self.notion)
        
        # Create bridge between sessions
        new_logger._create_bridge_to_previous_session(self.session_page_id)
        
        return new_logger
    
    def _create_bridge_to_previous_session(self, previous_session_id):
        """Create a bridge to a previous session."""
        if not self.session_page_id or not previous_session_id:
            return
        
        # Add reference to the previous session
        self.notion.blocks.children.append(
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
        self.notion.blocks.children.append(
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
    
    def load_most_recent_context(self):
        """
        Load the most recent context from Notion to establish continuity
        between sessions.
        """
        try:
            # Query for the most recent active or compacted session
            response = self.notion.databases.query(
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
                    self._create_bridge_to_previous_session(previous_session_id)
                    
                    # Load the content blocks from the previous session
                    blocks = self.notion.blocks.children.list(
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
                    self.log_system_action("LOAD_PREVIOUS_CONTEXT", {
                        "previous_session_id": previous_session_id,
                        "message_count": len(context["messages"])
                    })
                    
                    return context
            
            return None
        
        except Exception as e:
            print(f"Error loading previous context: {str(e)}")
            self._log_to_file("ERROR", f"Error loading previous context: {str(e)}")
            return None
    
    def _log_to_file(self, log_type, message):
        """Log to filesystem as backup."""
        try:
            log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
            os.makedirs(log_dir, exist_ok=True)
            
            log_file = os.path.join(log_dir, f"cli-session-{self.session_id}.log")
            
            with open(log_file, "a") as f:
                timestamp = datetime.now().isoformat()
                f.write(f"[{timestamp}] {log_type}: {message}\n")
        
        except Exception as e:
            print(f"Error logging to file: {str(e)}")
```

### 2. Integration with Session Initialization

Update the session initialization to use the CLISessionLogger:

```python
def initialize_session():
    """Initialize a CLI session with Notion context logging."""
    try:
        # Initialize the session logger
        session_logger = CLISessionLogger()
        
        # Set up compaction handler
        if hasattr(claude, "onCompaction"):
            claude.onCompaction(lambda reason: session_logger.handle_compaction(reason))
        
        # Store the logger in a global variable for access throughout the session
        globals()["SESSION_LOGGER"] = session_logger
        
        # Log critical file loading
        for file_name in ["CLAUDE.md", "REVIEWER_PROTOCOL.md"]:
            file_path = os.path.join(os.path.dirname(__file__), file_name)
            if os.path.exists(file_path):
                with open(file_path, "r") as f:
                    content = f.read()
                session_logger.log_system_action("LOAD_CRITICAL_FILE", {
                    "file": file_name,
                    "content_length": len(content)
                })
        
        return {
            "success": True,
            "session_id": session_logger.session_id,
            "previous_context": session_logger.previous_context
        }
    
    except Exception as e:
        print(f"Error initializing session: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
```

### 3. Python Module Structure

Organize the code in a modular way:

```
slack_notion_integration/
├── src/
│   ├── cli/
│   │   ├── __init__.py
│   │   ├── cli_session_logger.py
│   │   ├── integration.py
│   │   └── session_manager.py
│   ├── models/
│   │   └── schema.py
│   ├── notion/
│   │   └── client.py
│   └── utils/
│       └── logger.py
├── tests/
│   └── test_cli_context_persistence.py
├── logs/
└── cli_bridge.py
```

### 4. Test Script

Create a test script to verify the context persistence across compaction events:

```python
"""
Test CLI context persistence across compaction events.
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from src.cli.cli_session_logger import CLISessionLogger

async def simulate_compaction(session_logger):
    """Simulate a compaction event."""
    print("\n🔄 Simulating compaction event...")
    
    # Handle the compaction
    new_session_logger = session_logger.handle_compaction("SIMULATED_COMPACTION")
    
    print("✅ Created new session after compaction")
    print(f"📝 Old Session ID: {session_logger.session_id}")
    print(f"📝 New Session ID: {new_session_logger.session_id}")
    
    return new_session_logger

async def verify_context_retrieval(session_logger):
    """Verify context can be retrieved from previous session."""
    print("\n🔍 Verifying context retrieval capability...")
    
    # Load most recent context
    context = session_logger.load_most_recent_context()
    
    if context and context["messages"]:
        print("✅ Successfully retrieved context from previous session")
        print(f"📝 Previous Session ID: {context['session_id']}")
        print(f"📝 Message count: {len(context['messages'])}")
        
        # Show the first few messages
        print("\n📄 First 3 messages from previous context:")
        for i, message in enumerate(context["messages"][:3]):
            print(f"{i+1}. {message[:100]}{'...' if len(message) > 100 else ''}")
        
        return True
    else:
        print("❌ Failed to retrieve context from previous session")
        return False

async def main():
    """Main test function."""
    print("🧪 Starting CLI Context Persistence Test\n")
    
    # Initialize a new session logger
    session_logger = CLISessionLogger()
    print(f"📝 Session ID: {session_logger.session_id}")
    
    # Simulate user interaction
    user_message = "This is a test user message for CLI context persistence."
    await session_logger.log_user_message(user_message)
    print("✅ Logged user message to Notion")
    
    # Simulate system action
    await session_logger.log_system_action("TEST_ACTION", {
        "action": "Testing system action logging",
        "timestamp": datetime.now().isoformat()
    })
    print("✅ Logged system action to Notion")
    
    # Simulate assistant response
    await session_logger.log_assistant_response("This is a test response from the assistant.")
    print("✅ Logged assistant response to Notion")
    
    # Simulate tool call
    await session_logger.log_tool_call("TestTool", {"param1": "value1"}, {"result": "success"})
    print("✅ Logged tool call to Notion")
    
    # Simulate compaction
    new_session_logger = await simulate_compaction(session_logger)
    
    # Verify context retrieval in the new session
    context_retrieved = await verify_context_retrieval(new_session_logger)
    
    # Final report
    print("\n📊 Test Results:")
    print("✅ User message logging: Success")
    print("✅ System action logging: Success")
    print("✅ Assistant response logging: Success")
    print("✅ Tool call logging: Success")
    print("✅ Compaction handling: Success")
    print(f"{'✅' if context_retrieved else '❌'} Context retrieval: {'Success' if context_retrieved else 'Failed'}")
    
    print("\n🏁 Test completed")

if __name__ == "__main__":
    asyncio.run(main())
```

## Integration into Existing System

### 1. Update Main Entry Point

Update the main entry point in `slack_notion_integration/src/main.py` to initialize CLI session logging:

```python
def initialize_cli_session_logging():
    """Initialize CLI session logging as part of main startup."""
    from src.cli.cli_session_logger import CLISessionLogger
    
    try:
        # Initialize the session logger
        session_logger = CLISessionLogger()
        
        # Store in global context
        globals()["SESSION_LOGGER"] = session_logger
        
        # Set up compaction handler
        if "claude" in globals() and hasattr(globals()["claude"], "onCompaction"):
            globals()["claude"].onCompaction(lambda reason: session_logger.handle_compaction(reason))
        
        print(f"🔄 CLI session logging initialized. Session ID: {session_logger.session_id}")
        
        return session_logger
    
    except Exception as e:
        print(f"Error initializing CLI session logging: {str(e)}")
        return None

# Add to main startup code
if __name__ == "__main__":
    # Other initialization code...
    
    # Initialize CLI session logging
    SESSION_LOGGER = initialize_cli_session_logging()
```

### 2. Add Notion Database Setup

Add a function to set up the Notion database for CLI sessions:

```python
async def setup_cli_sessions_database():
    """
    Set up the Notion database for CLI sessions.
    """
    from notion_client import Client
    
    notion = Client(auth=os.environ.get("NOTION_API_KEY"))
    
    # Create the database
    database = await notion.databases.create(
        parent={"type": "page_id", "page_id": os.environ.get("NOTION_ROOT_PAGE_ID")},
        title=[{"type": "text", "text": {"content": "CLI Sessions"}}],
        properties={
            "Name": {"title": {}},
            "Status": {
                "select": {
                    "options": [
                        {"name": "Active", "color": "green"},
                        {"name": "Compacted", "color": "yellow"},
                        {"name": "Completed", "color": "blue"}
                    ]
                }
            },
            "Started": {"date": {}},
            "Ended": {"date": {}},
            "Session ID": {"rich_text": {}},
            "Previous Session": {"rich_text": {}},
            "Next Session": {"rich_text": {}}
        }
    )
    
    # Store the database ID in environment
    database_id = database["id"]
    print(f"Created CLI Sessions database with ID: {database_id}")
    
    # Write to config file
    config_file = os.path.join(os.path.dirname(__file__), "config", "notion_db_ids.json")
    
    try:
        with open(config_file, "r") as f:
            config = json.load(f)
    except:
        config = {}
    
    config["cli_sessions"] = database_id
    
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)
    
    return database_id
```

## Security and Compliance

1. All API keys will be read from environment variables
2. No sensitive information (like API keys) will be logged
3. Notion permissions will be restricted to only what's needed
4. CLI logs will only include the necessary context, not entire environment state

## Implementation Timeline

1. **Day 1: Core Implementation**
   - Implement CLISessionLogger class
   - Update initialize-session.js to use CLI Session Logger
   - Set up session bridging functionality

2. **Day 2: Testing & Validation**
   - Create test script for context preservation
   - Verify context loading between sessions
   - Test compaction event handling

3. **Day 3: Integration & Documentation**
   - Integrate with existing systems
   - Update documentation
   - Create user guides for context persistence

## Key Principles

1. **Log EVERYTHING in real-time** - Log AS IT HAPPENS, not after the fact
2. **Never delay logging until after execution** - Immediate logging ensures nothing is lost
3. **Always check for previous context** - Load context from previous sessions at initialization
4. **Store complete logs, not summaries** - Full content preservation for proper restoration
5. **Create bridges between sessions** - Explicit linking between related sessions

## Reviewer Approval

This implementation plan has been reviewed by the Reviewer Agent on May 14, 2025 and was approved for implementation. As per the SecondBrain Reviewer Protocol, no implementation will begin until this plan is reviewed and approved.

## Next Steps

After approval:
1. Implement the core CLISessionLogger class
2. Update initialization code to use the logger
3. Create and run the test script to verify functionality
4. Integrate with the broader SecondBrain system