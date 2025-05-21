#!/usr/bin/env python3
"""
Setup script for creating the required Notion databases for the SecondBrain Slack+Notion integration.
This script creates the following databases:
1. CLI Sessions Database - For tracking CLI sessions
2. Slack Conversations Database - For tracking Slack conversations
3. Task Tracking Database - For tracking agent tasks and workflows

Usage:
    python setup_notion_databases.py [--debug]
"""

import os
import sys
import asyncio
import logging
import argparse
import json
from datetime import datetime
from notion_client import Client
from notion_client.errors import APIResponseError

# Configure argument parser
parser = argparse.ArgumentParser(description="Setup Notion databases for SecondBrain")
parser.add_argument("--debug", action="store_true", help="Enable debug logging")
parser.add_argument("--parent-page-id", type=str, help="Parent page ID for databases")
args = parser.parse_args()

# Configure logging
log_level = logging.DEBUG if args.debug else logging.INFO
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"notion_setup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
logger = logging.getLogger("notion_setup")

# Get Notion API key from environment
NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
if not NOTION_API_KEY:
    logger.error("NOTION_API_KEY environment variable is not set")
    sys.exit(1)

# Get parent page ID
PARENT_PAGE_ID = args.parent_page_id or os.environ.get("NOTION_PARENT_PAGE_ID")
if not PARENT_PAGE_ID:
    logger.error("Parent page ID not provided. Use --parent-page-id or set NOTION_PARENT_PAGE_ID environment variable")
    sys.exit(1)

# Initialize Notion client
notion = Client(auth=NOTION_API_KEY)

async def create_cli_sessions_database():
    """Create the CLI Sessions Database in Notion."""
    logger.info("Creating CLI Sessions Database...")
    try:
        response = notion.databases.create(
            parent={"type": "page_id", "page_id": PARENT_PAGE_ID},
            title=[{"type": "text", "text": {"content": "SecondBrain CLI Sessions"}}],
            properties={
                "Session ID": {
                    "type": "title",
                    "title": {}
                },
                "Status": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "Active", "color": "green"},
                            {"name": "Compacted", "color": "yellow"},
                            {"name": "Completed", "color": "blue"}
                        ]
                    }
                },
                "Start Time": {
                    "type": "date",
                    "date": {}
                },
                "End Time": {
                    "type": "date",
                    "date": {}
                },
                "Previous Session": {
                    "type": "relation",
                    "relation": {
                        "database_id": "",  # Will be updated after creation
                        "single_property": {}
                    }
                },
                "Next Session": {
                    "type": "relation",
                    "relation": {
                        "database_id": "",  # Will be updated after creation
                        "single_property": {}
                    }
                },
                "Compaction Reason": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "CONTEXT_LIMIT_REACHED", "color": "orange"},
                            {"name": "SESSION_TIMEOUT", "color": "red"},
                            {"name": "USER_REQUESTED", "color": "blue"},
                            {"name": "SYSTEM_ERROR", "color": "purple"}
                        ]
                    }
                },
                "Message Count": {
                    "type": "number",
                    "number": {"format": "number"}
                },
                "Related Slack Conversation": {
                    "type": "relation",
                    "relation": {
                        "database_id": "",  # Will be updated after creation
                        "single_property": {}
                    }
                }
            },
            icon={"type": "emoji", "emoji": "💬"}
        )
        logger.info(f"CLI Sessions Database created with ID: {response['id']}")
        return response["id"]
    except APIResponseError as e:
        logger.error(f"Error creating CLI Sessions Database: {e}")
        raise

async def create_slack_conversations_database(cli_sessions_db_id):
    """Create the Slack Conversations Database in Notion."""
    logger.info("Creating Slack Conversations Database...")
    try:
        response = notion.databases.create(
            parent={"type": "page_id", "page_id": PARENT_PAGE_ID},
            title=[{"type": "text", "text": {"content": "SecondBrain Slack Conversations"}}],
            properties={
                "Conversation ID": {
                    "type": "title",
                    "title": {}
                },
                "Channel": {
                    "type": "rich_text",
                    "rich_text": {}
                },
                "Start Time": {
                    "type": "date",
                    "date": {}
                },
                "End Time": {
                    "type": "date",
                    "date": {}
                },
                "Status": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "Active", "color": "green"},
                            {"name": "Completed", "color": "blue"},
                            {"name": "Archived", "color": "gray"}
                        ]
                    }
                },
                "Primary Agent": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "PlannerAgent", "color": "blue"},
                            {"name": "ExecutorAgent", "color": "green"},
                            {"name": "ReviewerAgent", "color": "orange"},
                            {"name": "NotionAgent", "color": "purple"}
                        ]
                    }
                },
                "Related CLI Sessions": {
                    "type": "relation",
                    "relation": {
                        "database_id": cli_sessions_db_id,
                        "single_property": {}
                    }
                },
                "Message Count": {
                    "type": "number",
                    "number": {"format": "number"}
                },
                "Thread Link": {
                    "type": "url",
                    "url": {}
                }
            },
            icon={"type": "emoji", "emoji": "🤖"}
        )
        logger.info(f"Slack Conversations Database created with ID: {response['id']}")
        return response["id"]
    except APIResponseError as e:
        logger.error(f"Error creating Slack Conversations Database: {e}")
        raise

async def create_task_tracking_database(cli_sessions_db_id, slack_conversations_db_id):
    """Create the Task Tracking Database in Notion."""
    logger.info("Creating Task Tracking Database...")
    try:
        response = notion.databases.create(
            parent={"type": "page_id", "page_id": PARENT_PAGE_ID},
            title=[{"type": "text", "text": {"content": "SecondBrain Task Tracking"}}],
            properties={
                "Task ID": {
                    "type": "title",
                    "title": {}
                },
                "Description": {
                    "type": "rich_text",
                    "rich_text": {}
                },
                "Status": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "Pending", "color": "gray"},
                            {"name": "In Progress", "color": "yellow"},
                            {"name": "Completed", "color": "green"},
                            {"name": "Cancelled", "color": "red"},
                            {"name": "Needs Review", "color": "orange"}
                        ]
                    }
                },
                "Priority": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "High", "color": "red"},
                            {"name": "Medium", "color": "yellow"},
                            {"name": "Low", "color": "blue"}
                        ]
                    }
                },
                "Assigned Agent": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "PlannerAgent", "color": "blue"},
                            {"name": "ExecutorAgent", "color": "green"},
                            {"name": "ReviewerAgent", "color": "orange"},
                            {"name": "NotionAgent", "color": "purple"}
                        ]
                    }
                },
                "Created At": {
                    "type": "date",
                    "date": {}
                },
                "Completed At": {
                    "type": "date",
                    "date": {}
                },
                "Related CLI Sessions": {
                    "type": "relation",
                    "relation": {
                        "database_id": cli_sessions_db_id,
                        "single_property": {}
                    }
                },
                "Related Slack Conversation": {
                    "type": "relation",
                    "relation": {
                        "database_id": slack_conversations_db_id,
                        "single_property": {}
                    }
                },
                "Dependencies": {
                    "type": "relation",
                    "relation": {
                        "database_id": "",  # Will be updated after creation
                        "single_property": {}
                    }
                },
                "Review Status": {
                    "type": "select",
                    "select": {
                        "options": [
                            {"name": "Not Reviewed", "color": "gray"},
                            {"name": "Under Review", "color": "yellow"},
                            {"name": "Approved", "color": "green"},
                            {"name": "Rejected", "color": "red"},
                            {"name": "Changes Requested", "color": "orange"}
                        ]
                    }
                }
            },
            icon={"type": "emoji", "emoji": "✅"}
        )
        logger.info(f"Task Tracking Database created with ID: {response['id']}")
        return response["id"]
    except APIResponseError as e:
        logger.error(f"Error creating Task Tracking Database: {e}")
        raise

async def update_database_relations(cli_sessions_db_id, slack_conversations_db_id, task_tracking_db_id):
    """Update database relations to link them together."""
    logger.info("Updating database relations...")
    try:
        # Update CLI Sessions Database
        notion.databases.update(
            database_id=cli_sessions_db_id,
            properties={
                "Previous Session": {
                    "type": "relation",
                    "relation": {
                        "database_id": cli_sessions_db_id,
                        "single_property": {}
                    }
                },
                "Next Session": {
                    "type": "relation",
                    "relation": {
                        "database_id": cli_sessions_db_id,
                        "single_property": {}
                    }
                },
                "Related Slack Conversation": {
                    "type": "relation",
                    "relation": {
                        "database_id": slack_conversations_db_id,
                        "single_property": {}
                    }
                }
            }
        )
        
        # Update Task Tracking Database
        notion.databases.update(
            database_id=task_tracking_db_id,
            properties={
                "Dependencies": {
                    "type": "relation",
                    "relation": {
                        "database_id": task_tracking_db_id,
                        "single_property": {}
                    }
                }
            }
        )
        
        logger.info("Database relations updated successfully")
    except APIResponseError as e:
        logger.error(f"Error updating database relations: {e}")
        raise

async def create_notion_ids_file(cli_sessions_db_id, slack_conversations_db_id, task_tracking_db_id):
    """Create a file with the Notion database IDs for later use."""
    logger.info("Creating Notion database IDs file...")
    
    notion_ids = {
        "CLI_SESSIONS_DB_ID": cli_sessions_db_id,
        "SLACK_CONVERSATIONS_DB_ID": slack_conversations_db_id,
        "TASK_TRACKING_DB_ID": task_tracking_db_id,
        "PARENT_PAGE_ID": PARENT_PAGE_ID,
        "created_at": datetime.now().isoformat()
    }
    
    # Ensure the config directory exists
    os.makedirs("src/config", exist_ok=True)
    
    # Write the IDs to a JSON file
    with open("src/config/notion_db_ids.json", "w") as f:
        json.dump(notion_ids, f, indent=2)
    
    logger.info("Notion database IDs saved to src/config/notion_db_ids.json")
    
    # Also output them to the console
    print("\nNotion Database IDs:")
    print(f"CLI_SESSIONS_DB_ID={cli_sessions_db_id}")
    print(f"SLACK_CONVERSATIONS_DB_ID={slack_conversations_db_id}")
    print(f"TASK_TRACKING_DB_ID={task_tracking_db_id}")
    print(f"PARENT_PAGE_ID={PARENT_PAGE_ID}")
    print("\nAdd these IDs to your environment variables or .env file")

async def create_welcome_page():
    """Create a welcome page in Notion with instructions."""
    logger.info("Creating welcome page...")
    
    try:
        response = notion.pages.create(
            parent={"type": "page_id", "page_id": PARENT_PAGE_ID},
            properties={
                "title": {
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": "Welcome to SecondBrain Context Persistence"
                            }
                        }
                    ]
                }
            },
            children=[
                {
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "SecondBrain Context Persistence System"
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
                                    "content": "This Notion workspace contains the databases used by the SecondBrain Context Persistence System. "
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": "All CLI sessions, Slack conversations, and agent tasks are logged here in real-time."
                                },
                                "annotations": {
                                    "bold": True
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Databases"
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
                                    "content": "1. "
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": "CLI Sessions Database"
                                },
                                "annotations": {
                                    "bold": True
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": " - Tracks all CLI sessions with real-time logging of user messages, system actions, assistant responses, and tool calls."
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
                                    "content": "2. "
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": "Slack Conversations Database"
                                },
                                "annotations": {
                                    "bold": True
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": " - Tracks all Slack conversations with agent identity and thread context."
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
                                    "content": "3. "
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": "Task Tracking Database"
                                },
                                "annotations": {
                                    "bold": True
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": " - Manages agent tasks and workflows with completion status and reviewer verification."
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Real-Time Context Logging"
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
                                    "content": "All interactions are logged to Notion "
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": "AS THEY HAPPEN",
                                    "link": None
                                },
                                "annotations": {
                                    "bold": True,
                                    "italic": False,
                                    "strikethrough": False,
                                    "underline": False,
                                    "code": False,
                                    "color": "red"
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": ", not after. This ensures that no context is ever lost during CLI sessions, Slack conversations, or system operations."
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
                                    "content": "The system follows the "
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": ""NEVER TRUNCATE" principle",
                                    "link": None
                                },
                                "annotations": {
                                    "bold": True,
                                    "italic": False,
                                    "strikethrough": False,
                                    "underline": False,
                                    "code": False,
                                    "color": "blue"
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": " to ensure that all context is preserved with full surrounding paragraphs, speaker identification, and emotional markers."
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "Setup Completed Successfully"
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
                                    "content": "The Notion databases have been successfully created and are ready to use. You can now start the SecondBrain context persistence system with the following commands:"
                                }
                            }
                        ]
                    }
                },
                {
                    "object": "block",
                    "type": "code",
                    "code": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": "# Start the enhanced Slack app\npython start_enhanced_slack_app.py\n\n# Start the multi-agent system\npython start_multi_agent_system.py"
                                }
                            }
                        ],
                        "language": "bash"
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
                                    "content": "Setup completed at: "
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                }
                            }
                        ]
                    }
                }
            ],
            icon={"type": "emoji", "emoji": "🧠"}
        )
        
        logger.info(f"Welcome page created with ID: {response['id']}")
        return response["id"]
    except APIResponseError as e:
        logger.error(f"Error creating welcome page: {e}")
        raise

async def main():
    """Main function to create the Notion databases."""
    logger.info("Starting Notion database setup...")
    
    try:
        # Create the databases
        cli_sessions_db_id = await create_cli_sessions_database()
        slack_conversations_db_id = await create_slack_conversations_database(cli_sessions_db_id)
        task_tracking_db_id = await create_task_tracking_database(cli_sessions_db_id, slack_conversations_db_id)
        
        # Update database relations
        await update_database_relations(cli_sessions_db_id, slack_conversations_db_id, task_tracking_db_id)
        
        # Create the Notion IDs file
        await create_notion_ids_file(cli_sessions_db_id, slack_conversations_db_id, task_tracking_db_id)
        
        # Create the welcome page
        await create_welcome_page()
        
        logger.info("Notion database setup completed successfully")
        print("\nNotion database setup completed successfully! 🎉")
        print("You can now start using the SecondBrain context persistence system.")
        
    except Exception as e:
        logger.error(f"Error during Notion database setup: {e}")
        print(f"\nError during Notion database setup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())