#!/usr/bin/env python3
"""
SecondBrain Slack+Notion+Context Integration

This module integrates the context persistence system with Slack and Notion,
providing full context preservation in all interactions.

Key features:
- Processes Slack messages through the context system
- Stores Notion content in the context system
- Provides context-aware agent interactions
- Bridges context between sessions for continuity
- Ensures all content follows the NEVER TRUNCATE OR SIMPLIFY principle

Usage:
    python context_integration.py [--start-server] [--process-slack] [--process-notion]
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add parent directory to path to import context_persistence_system
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from context_persistence_system import ContextSystem

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("/Volumes/Envoy/SecondBrain/logs/context_integration.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import Slack and Notion clients with error handling
try:
    from slack_client import SlackClient
    from notion_client import NotionClient
except ImportError:
    logger.error("Failed to import Slack or Notion clients. Creating placeholders.")
    
    class SlackClient:
        def __init__(self, **kwargs):
            self.connected = False
            logger.warning("Using placeholder SlackClient")
            
        async def send_message(self, channel: str, text: str, thread_ts: str = None) -> dict:
            logger.info(f"Would send to {channel}: {text[:50]}...")
            return {"ok": False, "error": "Placeholder client"}
            
        async def listen(self, callback):
            logger.info("Would listen for messages")
            return
    
    class NotionClient:
        def __init__(self, **kwargs):
            self.connected = False
            logger.warning("Using placeholder NotionClient")
            
        async def get_page(self, page_id: str) -> dict:
            logger.info(f"Would get page {page_id}")
            return {"id": page_id, "error": "Placeholder client"}
            
        async def create_page(self, parent: dict, properties: dict, children: list) -> dict:
            logger.info(f"Would create page in {parent.get('database_id', 'unknown')}")
            return {"id": "placeholder-page-id", "error": "Placeholder client"}

class ContextIntegration:
    """
    Main integration class that connects the context persistence system
    with Slack and Notion components.
    """
    
    def __init__(self):
        """Initialize the integration with all required components."""
        self.context_system = ContextSystem()
        
        # Initialize Slack client if available
        slack_bot_token = os.environ.get("SLACK_BOT_TOKEN")
        if slack_bot_token:
            self.slack = SlackClient(token=slack_bot_token)
            logger.info("Initialized Slack client")
        else:
            self.slack = None
            logger.warning("No Slack token found, Slack integration disabled")
        
        # Initialize Notion client if available
        notion_api_key = os.environ.get("NOTION_API_KEY")
        if notion_api_key:
            self.notion = NotionClient(auth=notion_api_key)
            logger.info("Initialized Notion client")
        else:
            self.notion = None
            logger.warning("No Notion API key found, Notion integration disabled")
        
        # Session mappings
        self.slack_sessions = {}  # Maps channel+thread to session_id
        self.notion_sessions = {}  # Maps database_id to session_id
        
        logger.info("Context integration initialized")
    
    async def process_slack_message(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a Slack message through the context system.
        
        Args:
            event: The Slack event data
            
        Returns:
            Processing result with context ID
        """
        if not self.slack:
            logger.error("Slack integration not available")
            return {"success": False, "error": "Slack integration not available"}
        
        try:
            # Extract message data
            channel_id = event.get("channel")
            user_id = event.get("user")
            text = event.get("text", "")
            thread_ts = event.get("thread_ts", event.get("ts"))
            
            logger.info(f"Processing Slack message from {user_id} in {channel_id}")
            
            # Process through context system
            context_obj = await self.context_system.process_slack_message(
                message=text,
                channel_id=channel_id,
                user_id=user_id,
                thread_ts=thread_ts
            )
            
            if not context_obj:
                return {
                    "success": False,
                    "error": "Failed to process message through context system"
                }
            
            # Store session mapping
            session_key = f"{channel_id}:{thread_ts}"
            self.slack_sessions[session_key] = context_obj.get("session_id")
            
            logger.info(f"Processed Slack message, context ID: {context_obj['id']}, " 
                       f"session ID: {context_obj.get('session_id')}")
            
            return {
                "success": True,
                "context_id": context_obj["id"],
                "session_id": context_obj.get("session_id")
            }
            
        except Exception as e:
            logger.error(f"Error processing Slack message: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def process_notion_page(self, page_id: str, database_id: str) -> Dict[str, Any]:
        """
        Process a Notion page through the context system.
        
        Args:
            page_id: The Notion page ID
            database_id: The Notion database ID
            
        Returns:
            Processing result with context ID
        """
        if not self.notion:
            logger.error("Notion integration not available")
            return {"success": False, "error": "Notion integration not available"}
        
        try:
            # Get page content from Notion
            page = await self.notion.get_page(page_id)
            
            # Get page title
            title = self._extract_notion_title(page)
            
            # Get page content
            content = await self._get_notion_page_content(page_id)
            
            # Get page metadata
            created_time = page.get("created_time")
            last_edited_time = page.get("last_edited_time")
            
            meta = {
                "created_time": created_time,
                "last_edited_time": last_edited_time
            }
            
            logger.info(f"Processing Notion page {title[:50]}... ({page_id})")
            
            # Store in context system
            context_id = await self.context_system.store_notion_page(
                page_id=page_id,
                database_id=database_id,
                title=title,
                content=content,
                meta=meta
            )
            
            if not context_id:
                return {
                    "success": False,
                    "error": "Failed to process page through context system"
                }
            
            # Store session mapping
            if database_id not in self.notion_sessions:
                self.notion_sessions[database_id] = str(datetime.now().timestamp())
            
            logger.info(f"Processed Notion page, context ID: {context_id}")
            
            return {
                "success": True,
                "context_id": context_id,
                "session_id": self.notion_sessions.get(database_id)
            }
            
        except Exception as e:
            logger.error(f"Error processing Notion page: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def provide_agent_context(self, agent_id: str, query: str, 
                                 channel_id: str = None, thread_ts: str = None,
                                 database_id: str = None) -> List[Dict[str, Any]]:
        """
        Provide relevant context to an agent for a specific query.
        
        Args:
            agent_id: The agent requesting context
            query: The query or task to find context for
            channel_id: Optional Slack channel ID
            thread_ts: Optional Slack thread timestamp
            database_id: Optional Notion database ID
            
        Returns:
            List of formatted context objects for agent consumption
        """
        try:
            # Determine session ID
            session_id = None
            
            if channel_id and thread_ts:
                # Slack session
                session_key = f"{channel_id}:{thread_ts}"
                session_id = self.slack_sessions.get(session_key)
                logger.info(f"Using Slack session {session_id} for agent context")
            elif database_id:
                # Notion session
                session_id = self.notion_sessions.get(database_id)
                logger.info(f"Using Notion session {session_id} for agent context")
            
            # Get context from the context system
            contexts = await self.context_system.provide_agent_context(
                agent_id=agent_id,
                query=query,
                session_id=session_id
            )
            
            logger.info(f"Provided {len(contexts)} contexts to agent {agent_id}")
            
            return contexts
            
        except Exception as e:
            logger.error(f"Error providing agent context: {str(e)}")
            return []
    
    async def create_session_bridge(self, from_session_id: str, to_session_id: str) -> Dict[str, Any]:
        """
        Bridge context between two sessions for continuity.
        
        Args:
            from_session_id: Source session ID
            to_session_id: Target session ID
            
        Returns:
            Bridge metadata
        """
        try:
            bridge = await self.context_system.create_session_bridge(
                from_session_id=from_session_id,
                to_session_id=to_session_id
            )
            
            logger.info(f"Created context bridge from {from_session_id} to {to_session_id}, " 
                       f"bridged {bridge.get('context_count', 0)} contexts")
            
            return bridge
            
        except Exception as e:
            logger.error(f"Error creating session bridge: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def store_cli_conversation(self, messages: List[Dict[str, Any]], 
                                  summary: str = None) -> Dict[str, Any]:
        """
        Store a CLI conversation in the context system.
        
        Args:
            messages: List of message objects with role and content
            summary: Optional session summary
            
        Returns:
            Session metadata
        """
        try:
            session = await self.context_system.store_cli_session(
                messages=messages,
                summary=summary
            )
            
            logger.info(f"Stored CLI conversation with {len(messages)} messages, " 
                       f"session ID: {session.get('id')}")
            
            return session
            
        except Exception as e:
            logger.error(f"Error storing CLI conversation: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def extract_from_file(self, file_path: str, 
                             patterns: List[str]) -> List[str]:
        """
        Extract context from a file using the context system.
        
        Args:
            file_path: Path to the file to process
            patterns: List of pattern indicators to look for
            
        Returns:
            List of extracted context IDs
        """
        try:
            # Read file
            with open(file_path, "r") as f:
                text = f.read()
            
            # Extract context
            source_info = {
                "file": os.path.basename(file_path),
                "date": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                "type": "file"
            }
            
            context_ids = await self.context_system.extract_with_full_context(
                text=text,
                pattern_indicators=patterns,
                source_info=source_info
            )
            
            logger.info(f"Extracted {len(context_ids)} contexts from file {file_path}")
            
            return context_ids
            
        except Exception as e:
            logger.error(f"Error extracting from file: {str(e)}")
            return []
    
    async def start_slack_listener(self):
        """Start listening for Slack messages."""
        if not self.slack:
            logger.error("Slack integration not available")
            return
        
        logger.info("Starting Slack listener")
        
        async def message_handler(event):
            """Handle incoming Slack messages."""
            # Skip bot messages
            if event.get("bot_id") or event.get("subtype") == "bot_message":
                return
            
            # Process message
            await self.process_slack_message(event)
        
        try:
            await self.slack.listen(message_handler)
        except Exception as e:
            logger.error(f"Error in Slack listener: {str(e)}")
    
    async def start_notion_sync(self, database_ids: List[str] = None, interval: int = 300):
        """
        Start syncing Notion databases periodically.
        
        Args:
            database_ids: List of database IDs to sync, or None for all
            interval: Sync interval in seconds (default: 300)
        """
        if not self.notion:
            logger.error("Notion integration not available")
            return
        
        logger.info(f"Starting Notion sync for {len(database_ids) if database_ids else 'all'} databases")
        
        while True:
            try:
                # Get databases to sync
                dbs = database_ids or await self._get_available_notion_databases()
                
                for db_id in dbs:
                    # Get pages in database
                    pages = await self._get_notion_database_pages(db_id)
                    
                    # Process each page
                    for page in pages:
                        await self.process_notion_page(page["id"], db_id)
                    
                    logger.info(f"Synced {len(pages)} pages from Notion database {db_id}")
                
                # Wait for next sync
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in Notion sync: {str(e)}")
                await asyncio.sleep(60)  # Shorter interval on error
    
    #
    # Helper methods
    #
    
    def _extract_notion_title(self, page: Dict[str, Any]) -> str:
        """Extract title from Notion page."""
        try:
            # Find title property
            properties = page.get("properties", {})
            for prop_name, prop_value in properties.items():
                if prop_value.get("type") == "title":
                    title_items = prop_value.get("title", [])
                    if title_items:
                        return title_items[0].get("plain_text", "Untitled")
            
            return "Untitled"
        except Exception as e:
            logger.error(f"Error extracting Notion title: {str(e)}")
            return "Untitled"
    
    async def _get_notion_page_content(self, page_id: str) -> str:
        """Get content from Notion page."""
        try:
            # Get page blocks
            blocks = await self.notion.get_block_children(page_id)
            
            # Extract text from blocks
            content = []
            for block in blocks.get("results", []):
                text = await self._extract_block_text(block)
                if text:
                    content.append(text)
            
            return "\n\n".join(content)
        except Exception as e:
            logger.error(f"Error getting Notion page content: {str(e)}")
            return ""
    
    async def _extract_block_text(self, block: Dict[str, Any]) -> str:
        """Extract text from a Notion block."""
        try:
            block_type = block.get("type")
            if not block_type:
                return ""
            
            block_data = block.get(block_type, {})
            
            # Handle rich text blocks
            if "rich_text" in block_data:
                text_parts = []
                for text_item in block_data.get("rich_text", []):
                    if "plain_text" in text_item:
                        text_parts.append(text_item["plain_text"])
                
                # Add appropriate formatting
                text = " ".join(text_parts)
                if block_type == "heading_1":
                    return f"# {text}"
                elif block_type == "heading_2":
                    return f"## {text}"
                elif block_type == "heading_3":
                    return f"### {text}"
                elif block_type == "bulleted_list_item":
                    return f"- {text}"
                elif block_type == "numbered_list_item":
                    return f"1. {text}"  # Simplified, doesn't handle actual numbers
                else:
                    return text
            
            # Handle child blocks
            if "children" in block:
                child_texts = []
                for child in block.get("children", []):
                    child_text = await self._extract_block_text(child)
                    if child_text:
                        child_texts.append(child_text)
                
                return "\n".join(child_texts)
            
            return ""
        except Exception as e:
            logger.error(f"Error extracting block text: {str(e)}")
            return ""
    
    async def _get_available_notion_databases(self) -> List[str]:
        """Get available Notion databases."""
        try:
            databases = await self.notion.search(filter={"property": "object", "value": "database"})
            return [db["id"] for db in databases.get("results", [])]
        except Exception as e:
            logger.error(f"Error getting Notion databases: {str(e)}")
            return []
    
    async def _get_notion_database_pages(self, database_id: str) -> List[Dict[str, Any]]:
        """Get pages from a Notion database."""
        try:
            query_result = await self.notion.query_database(database_id)
            return query_result.get("results", [])
        except Exception as e:
            logger.error(f"Error getting Notion database pages: {str(e)}")
            return []

async def main():
    """Main entry point for running the integration."""
    import argparse
    
    parser = argparse.ArgumentParser(description="SecondBrain Context Integration")
    parser.add_argument("--start-server", action="store_true", help="Start integration server")
    parser.add_argument("--process-slack", action="store_true", help="Process Slack messages")
    parser.add_argument("--process-notion", action="store_true", help="Process Notion pages")
    parser.add_argument("--extract-file", help="Extract context from a file")
    parser.add_argument("--patterns", nargs="+", help="Pattern indicators for extraction")
    parser.add_argument("--cli-file", help="Process a CLI conversation file")
    parser.add_argument("--bridge", nargs=2, help="Bridge two sessions (from_id to_id)")
    
    args = parser.parse_args()
    
    # Initialize integration
    integration = ContextIntegration()
    
    if args.extract_file:
        if not args.patterns:
            logger.error("No patterns specified for extraction")
            return
        
        # Extract from file
        context_ids = await integration.extract_from_file(args.extract_file, args.patterns)
        
        if context_ids:
            logger.info(f"Extracted {len(context_ids)} contexts from file {args.extract_file}")
            for i, context_id in enumerate(context_ids):
                logger.info(f"Context {i+1}: {context_id}")
        else:
            logger.error(f"No contexts extracted from file {args.extract_file}")
    
    elif args.cli_file:
        # Process CLI conversation
        try:
            with open(args.cli_file, "r") as f:
                data = json.load(f)
            
            if "messages" not in data:
                logger.error("Invalid CLI conversation file format")
                return
            
            session = await integration.store_cli_conversation(data["messages"])
            
            if session.get("success") == False:
                logger.error(f"Failed to process CLI conversation: {session.get('error')}")
            else:
                logger.info(f"Processed CLI conversation with {len(data['messages'])} messages, "
                          f"session ID: {session.get('id')}")
        except Exception as e:
            logger.error(f"Error processing CLI file: {str(e)}")
    
    elif args.bridge:
        # Bridge sessions
        from_id, to_id = args.bridge
        
        bridge = await integration.create_session_bridge(from_id, to_id)
        
        if bridge.get("success") == False:
            logger.error(f"Failed to create bridge: {bridge.get('error')}")
        else:
            logger.info(f"Created bridge from {from_id} to {to_id}, "
                      f"bridged {bridge.get('context_count', 0)} contexts")
    
    elif args.start_server or args.process_slack or args.process_notion:
        # Start integration services
        tasks = []
        
        if args.start_server or args.process_slack:
            tasks.append(integration.start_slack_listener())
        
        if args.start_server or args.process_notion:
            tasks.append(integration.start_notion_sync())
        
        if tasks:
            logger.info("Starting integration services")
            await asyncio.gather(*tasks)
    
    else:
        parser.print_help()

if __name__ == "__main__":
    asyncio.run(main())