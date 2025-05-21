"""
Enhanced Slack app with integrated real-time logging to Notion via CLI Session Logger.

This module extends the existing SlackAgentApp to integrate with the CLISessionLogger
to ensure all Slack interactions are logged to Notion in real-time.
"""

import os
import logging
import asyncio
import json
import uuid
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime

from slack_bolt import App, BoltContext
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_sdk.web import WebClient
from slack_sdk.errors import SlackApiError

from ..config.env import get_env_var
from ..models.schema import SlackMessage, Task, TaskStep
from ..notion.client import NotionClient
from ..context.manager import ContextManager
from ..utils.logger import get_logger
from ..cli.cli_session_logger import CLISessionLogger
from ..cli.session_manager import initialize_cli_session, handle_compaction, close_session

logger = get_logger(__name__)

class EnhancedSlackAgentApp:
    """
    Enhanced Slack agent application with real-time context logging to Notion.
    
    This class extends the functionality of SlackAgentApp to integrate with
    the CLISessionLogger for real-time logging of all interactions to Notion,
    ensuring context persistence across sessions.
    """
    
    def __init__(self, agent_name: str, notion_client: Optional[NotionClient] = None, 
                 context_manager: Optional[ContextManager] = None):
        """
        Initialize the enhanced Slack agent application.
        
        Args:
            agent_name: Name of the agent
            notion_client: Optional Notion client. If not provided, a new one will be created.
            context_manager: Optional context manager. If not provided, a new one will be created.
        """
        self.agent_name = agent_name
        self.agent_id = f"{agent_name.lower()}-{uuid.uuid4()}"
        self.token = get_env_var("SLACK_BOT_TOKEN")
        self.app_token = get_env_var("SLACK_APP_TOKEN")
        
        if not self.token or not self.app_token:
            raise ValueError("Slack API tokens are required")
        
        # Initialize the Slack app
        self.app = App(token=self.token)
        self.client = self.app.client
        
        # Initialize the Notion client
        self.notion_client = notion_client or NotionClient()
        
        # Initialize the context manager
        self.context_manager = context_manager or ContextManager()
        
        # Initialize the CLI Session Logger for real-time context logging
        asyncio.create_task(self._initialize_session_logger())
        
        # Store agent state
        self._initialize_agent_state()
        
        # Register default event handlers
        self._register_default_handlers()
    
    async def _initialize_session_logger(self):
        """Initialize the CLI Session Logger for real-time logging to Notion."""
        self.session_logger = await initialize_cli_session(
            session_id=f"slack-{self.agent_name.lower()}-{int(datetime.now().timestamp())}"
        )
        await self.session_logger.log_system_action("SLACK_AGENT_INITIALIZED", {
            "agent_name": self.agent_name,
            "agent_id": self.agent_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        logger.info(f"CLI Session Logger initialized for agent {self.agent_name}")
    
    def _initialize_agent_state(self) -> None:
        """Initialize agent state in context manager."""
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "created_at": datetime.utcnow().isoformat(),
            "model": self._get_agent_model()
        })
        logger.info(f"Initialized state for agent {self.agent_name} with ID {self.agent_id}")
    
    def _get_agent_model(self) -> str:
        """Get the model name for this agent type."""
        if self.agent_name == "PlannerAgent":
            return "claude-3.7-sonnet"
        elif self.agent_name == "ReviewerAgent":
            return "openai-o3"
        elif self.agent_name == "ExecutorAgent":
            return "gpt-4.1-mini"
        elif self.agent_name == "NotionAgent":
            return "gpt-4.1-mini"
        else:
            return "unknown"
    
    def _register_default_handlers(self) -> None:
        """Register default event handlers with real-time logging."""
        # Handler for app mentions
        @self.app.event("app_mention")
        async def handle_app_mention(body: Dict[str, Any], say: Callable, client: WebClient, context: BoltContext) -> None:
            """Handle app mention events with real-time logging."""
            event = body["event"]
            channel_id = event["channel"]
            user_id = event["user"]
            text = event["text"]
            thread_ts = event.get("thread_ts")
            
            # Log the incoming message to Notion in real-time
            await self.session_logger.log_user_message(f"Slack user {user_id} in {channel_id}: {text}")
            
            # Create a SlackMessage object
            message = SlackMessage(
                message_id=event["ts"],
                thread_ts=thread_ts,
                channel_id=channel_id,
                user_id=user_id,
                text=text
            )
            
            # Create or get session for this conversation
            session_id = await self._get_or_create_session(channel_id, user_id, thread_ts or event["ts"])
            
            # Store message in context manager
            self.context_manager.add_message(session_id, {
                "id": message.message_id,
                "role": "user",
                "content": message.text,
                "timestamp": datetime.utcnow().isoformat(),
                "channel_id": message.channel_id,
                "user_id": message.user_id,
                "thread_ts": message.thread_ts
            })
            
            # Acknowledge receipt immediately
            response = await say(f"{self.agent_name} received your message. Processing...", thread_ts=thread_ts or event["ts"])
            
            # Log the acknowledgment to Notion in real-time
            await self.session_logger.log_assistant_response(f"Sent acknowledgment: '{self.agent_name} received your message. Processing...'")
            
            # Store agent acknowledgment message
            self.context_manager.add_message(session_id, {
                "id": response["ts"],
                "role": "assistant",
                "agent": self.agent_name,
                "content": f"{self.agent_name} received your message. Processing...",
                "timestamp": datetime.utcnow().isoformat(),
                "channel_id": message.channel_id,
                "user_id": "bot",
                "thread_ts": message.thread_ts or message.message_id
            })
            
            # Process the message asynchronously
            asyncio.create_task(self._process_message(message, client, context, session_id))
        
        # Handler for messages in channels
        @self.app.event("message")
        async def handle_message(body: Dict[str, Any], say: Callable, client: WebClient, context: BoltContext) -> None:
            """Handle message events with real-time logging."""
            event = body["event"]
            
            # Ignore bot messages and message_changed events
            if event.get("bot_id") or event.get("subtype") == "message_changed":
                return
            
            channel_id = event["channel"]
            user_id = event["user"]
            text = event.get("text", "")
            thread_ts = event.get("thread_ts")
            
            # Process only if in a thread or contains specific trigger words
            if thread_ts or any(trigger in text.lower() for trigger in [f"@{self.agent_name}", self.agent_name.lower()]):
                # Log the incoming message to Notion in real-time
                await self.session_logger.log_user_message(f"Slack user {user_id} in {channel_id}: {text}")
                
                # Create a SlackMessage object
                message = SlackMessage(
                    message_id=event["ts"],
                    thread_ts=thread_ts,
                    channel_id=channel_id,
                    user_id=user_id,
                    text=text
                )
                
                # Create or get session for this conversation
                session_id = await self._get_or_create_session(channel_id, user_id, thread_ts or event["ts"])
                
                # Store message in context manager
                self.context_manager.add_message(session_id, {
                    "id": message.message_id,
                    "role": "user",
                    "content": message.text,
                    "timestamp": datetime.utcnow().isoformat(),
                    "channel_id": message.channel_id,
                    "user_id": message.user_id,
                    "thread_ts": message.thread_ts
                })
                
                # Process the message asynchronously
                asyncio.create_task(self._process_message(message, client, context, session_id))
        
        # Handler for reaction added events
        @self.app.event("reaction_added")
        async def handle_reaction_added(body: Dict[str, Any], say: Callable, client: WebClient, context: BoltContext) -> None:
            """Handle reaction added events with real-time logging."""
            event = body["event"]
            reaction = event["reaction"]
            item = event["item"]
            user_id = event["user"]
            
            # Log the reaction to Notion in real-time
            await self.session_logger.log_system_action("REACTION_ADDED", {
                "reaction": reaction,
                "user": user_id,
                "item": item
            })
            
            # Get channel and message details
            channel_id = item.get("channel")
            message_ts = item.get("ts")
            
            if channel_id and message_ts:
                # Try to find an existing session for this thread
                session_id = await self._find_session_for_thread(channel_id, message_ts)
                
                if session_id:
                    # Store reaction in context manager
                    self.context_manager.add_message(session_id, {
                        "id": f"reaction-{uuid.uuid4()}",
                        "role": "user",
                        "content": f"Reaction: {reaction}",
                        "timestamp": datetime.utcnow().isoformat(),
                        "channel_id": channel_id,
                        "user_id": event["user"],
                        "thread_ts": message_ts
                    })
            
            # Only process certain reactions (e.g., thumbsup, thumbsdown)
            if reaction in ["thumbsup", "thumbsdown", "eyes", "white_check_mark", "x"]:
                # Process the reaction asynchronously
                asyncio.create_task(self._process_reaction(reaction, item, client, context, session_id))
    
    async def _get_or_create_session(self, channel_id: str, user_id: str, thread_ts: str) -> str:
        """
        Get an existing session or create a new one for a Slack conversation.
        
        Args:
            channel_id: Slack channel ID
            user_id: Slack user ID
            thread_ts: Thread timestamp
            
        Returns:
            Session ID
        """
        # Try to find an existing session for this thread
        session_id = await self._find_session_for_thread(channel_id, thread_ts)
        
        if not session_id:
            # Create a new session
            session_id = self.context_manager.create_session(user_id, "slack")
            
            # Store session metadata
            await self.context_manager.redis.store_context(
                f"slack:thread:{channel_id}:{thread_ts}",
                {"session_id": session_id},
                86400  # 24 hour TTL
            )
            
            # Log creation of new session to Notion in real-time
            await self.session_logger.log_system_action("NEW_SLACK_SESSION", {
                "session_id": session_id,
                "channel_id": channel_id,
                "thread_ts": thread_ts,
                "user_id": user_id
            })
            
            logger.info(f"Created new session {session_id} for thread {thread_ts} in channel {channel_id}")
            
            # Create a bridge between CLI session and Slack session
            await self.session_logger.log_system_action("CREATE_CLI_SLACK_BRIDGE", {
                "cli_session_id": self.session_logger.session_id,
                "slack_session_id": session_id,
                "channel_id": channel_id,
                "thread_ts": thread_ts
            })
        
        return session_id
    
    async def _find_session_for_thread(self, channel_id: str, thread_ts: str) -> Optional[str]:
        """
        Find an existing session for a Slack thread.
        
        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp
            
        Returns:
            Session ID or None if not found
        """
        # Try to find session in Redis
        thread_context = await self.context_manager.redis.get_context(f"slack:thread:{channel_id}:{thread_ts}")
        
        if thread_context and "session_id" in thread_context:
            session_id = thread_context["session_id"]
            
            # Verify that the session exists
            if await self.context_manager.get_session(session_id):
                # Log finding existing session to Notion in real-time
                await self.session_logger.log_system_action("FOUND_SLACK_SESSION", {
                    "session_id": session_id,
                    "channel_id": channel_id,
                    "thread_ts": thread_ts
                })
                
                logger.info(f"Found existing session {session_id} for thread {thread_ts} in channel {channel_id}")
                return session_id
        
        return None
    
    async def _process_message(self, message: SlackMessage, client: WebClient, context: BoltContext, session_id: str) -> None:
        """
        Process a Slack message with real-time logging.
        
        Args:
            message: Slack message to process
            client: Slack WebClient
            context: Bolt context
            session_id: Context session ID
        """
        # Log the processing start to Notion in real-time
        await self.session_logger.log_system_action("PROCESSING_MESSAGE", {
            "message_id": message.message_id,
            "channel_id": message.channel_id,
            "user_id": message.user_id,
            "text": message.text[:100] + ("..." if len(message.text) > 100 else ""),
            "session_id": session_id
        })
        
        logger.info(f"Processing message: {message.text}")
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": message.text[:50],
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "current_session": session_id
        })
        
        # Send a default response
        try:
            response = await client.chat_postMessage(
                channel=message.channel_id,
                thread_ts=message.thread_ts or message.message_id,
                text=f"{self.agent_name} processed your message. This is a base implementation."
            )
            
            # Log the response to Notion in real-time
            await self.session_logger.log_assistant_response(
                f"Response sent to {message.channel_id}: {self.agent_name} processed your message."
            )
            
            # Store agent response in context
            self.context_manager.add_message(session_id, {
                "id": response["ts"],
                "role": "assistant",
                "agent": self.agent_name,
                "content": f"{self.agent_name} processed your message. This is a base implementation.",
                "timestamp": datetime.utcnow().isoformat(),
                "channel_id": message.channel_id,
                "user_id": "bot",
                "thread_ts": message.thread_ts or message.message_id
            })
        except SlackApiError as e:
            # Log the error to Notion in real-time
            await self.session_logger.log_system_action("SLACK_API_ERROR", {
                "error": str(e),
                "message_id": message.message_id,
                "channel_id": message.channel_id
            })
            logger.error(f"Slack API error: {str(e)}")
        
        # Update agent state back to idle
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "updated_at": datetime.utcnow().isoformat()
        })
        
        # Log completion of processing to Notion in real-time
        await self.session_logger.log_system_action("MESSAGE_PROCESSING_COMPLETED", {
            "message_id": message.message_id,
            "session_id": session_id,
            "duration_ms": int((datetime.utcnow() - datetime.fromisoformat(message.timestamp)).total_seconds() * 1000)
        })
    
    async def _process_reaction(self, reaction: str, item: Dict[str, Any], client: WebClient, 
                            context: BoltContext, session_id: Optional[str] = None) -> None:
        """
        Process a reaction with real-time logging.
        
        Args:
            reaction: Reaction emoji
            item: Item the reaction was added to
            client: Slack WebClient
            context: Bolt context
            session_id: Optional context session ID
        """
        # Log the reaction processing to Notion in real-time
        await self.session_logger.log_system_action("PROCESSING_REACTION", {
            "reaction": reaction,
            "item": item,
            "session_id": session_id
        })
        
        logger.info(f"Processing reaction: {reaction} on item: {item}")
        
        # Subclasses should override this method
    
    async def post_message(self, channel_id: str, text: str, thread_ts: Optional[str] = None, 
                      blocks: Optional[list] = None, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a message to Slack and store in context with real-time logging.
        
        Args:
            channel_id: Channel ID
            text: Message text
            thread_ts: Optional thread timestamp
            blocks: Optional blocks
            session_id: Optional context session ID
            
        Returns:
            Response from the Slack API
        """
        message_args = {
            "channel": channel_id,
            "text": text
        }
        
        if thread_ts:
            message_args["thread_ts"] = thread_ts
        
        if blocks:
            message_args["blocks"] = blocks
        
        # Log the message posting to Notion in real-time
        await self.session_logger.log_system_action("POSTING_SLACK_MESSAGE", {
            "channel_id": channel_id,
            "text": text[:100] + ("..." if len(text) > 100 else ""),
            "thread_ts": thread_ts,
            "has_blocks": blocks is not None,
            "session_id": session_id
        })
        
        try:
            # Send the message
            response = await self.client.chat_postMessage(**message_args)
            
            # Log the message posting success to Notion in real-time
            await self.session_logger.log_assistant_response(
                f"Sent message to {channel_id}: {text[:100]}..."
            )
            
            # Store in context if session_id is provided
            if session_id:
                self.context_manager.add_message(session_id, {
                    "id": response["ts"],
                    "role": "assistant",
                    "agent": self.agent_name,
                    "content": text,
                    "timestamp": datetime.utcnow().isoformat(),
                    "channel_id": channel_id,
                    "user_id": "bot",
                    "thread_ts": thread_ts or response["ts"]
                })
            
            return response
        except SlackApiError as e:
            # Log the error to Notion in real-time
            await self.session_logger.log_system_action("SLACK_API_ERROR", {
                "error": str(e),
                "channel_id": channel_id,
                "thread_ts": thread_ts
            })
            logger.error(f"Slack API error when posting message: {str(e)}")
            raise
    
    async def post_thinking_step(self, channel_id: str, thread_ts: str, step_text: str, 
                            session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a thinking step to a thread and store in context with real-time logging.
        
        Args:
            channel_id: Channel ID
            thread_ts: Thread timestamp
            step_text: Thinking step text
            session_id: Optional context session ID
            
        Returns:
            Response from the Slack API
        """
        text = f"🧠 *Thinking:* {step_text}"
        
        # Log the thinking step to Notion in real-time
        await self.session_logger.log_system_action("THINKING_STEP", {
            "step_text": step_text,
            "channel_id": channel_id,
            "thread_ts": thread_ts,
            "session_id": session_id
        })
        
        return await self.post_message(channel_id, text, thread_ts, session_id=session_id)
    
    async def post_conclusion(self, channel_id: str, thread_ts: str, conclusion_text: str,
                         session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a conclusion to a thread and store in context with real-time logging.
        
        Args:
            channel_id: Channel ID
            thread_ts: Thread timestamp
            conclusion_text: Conclusion text
            session_id: Optional context session ID
            
        Returns:
            Response from the Slack API
        """
        text = f"✅ *Conclusion:* {conclusion_text}"
        
        # Log the conclusion to Notion in real-time
        await self.session_logger.log_system_action("CONCLUSION", {
            "conclusion_text": conclusion_text,
            "channel_id": channel_id,
            "thread_ts": thread_ts,
            "session_id": session_id
        })
        
        return await self.post_message(channel_id, text, thread_ts, session_id=session_id)
    
    async def post_file(self, channel_id: str, file_path: str, thread_ts: Optional[str] = None, 
                    title: Optional[str] = None, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload a file to Slack and store in context with real-time logging.
        
        Args:
            channel_id: Channel ID
            file_path: Path to the file
            thread_ts: Optional thread timestamp
            title: Optional file title
            session_id: Optional context session ID
            
        Returns:
            Response from the Slack API
        """
        upload_args = {
            "channels": channel_id,
            "file": file_path
        }
        
        if thread_ts:
            upload_args["thread_ts"] = thread_ts
        
        if title:
            upload_args["title"] = title
        
        # Log the file upload to Notion in real-time
        await self.session_logger.log_system_action("UPLOADING_FILE", {
            "file_path": file_path,
            "title": title,
            "channel_id": channel_id,
            "thread_ts": thread_ts,
            "session_id": session_id
        })
        
        try:
            # Upload the file
            response = await self.client.files_upload_v2(**upload_args)
            
            # Log the file upload success to Notion in real-time
            await self.session_logger.log_system_action("FILE_UPLOADED", {
                "file_id": response["file"]["id"],
                "file_name": response["file"]["name"],
                "channel_id": channel_id,
                "thread_ts": thread_ts
            })
            
            # Store in context if session_id is provided
            if session_id:
                file_info = {
                    "id": response["file"]["id"],
                    "name": response["file"]["name"],
                    "type": response["file"]["filetype"],
                    "size": response["file"]["size"],
                    "url": response["file"].get("url_private")
                }
                
                self.context_manager.add_message(session_id, {
                    "id": f"file-{response['file']['id']}",
                    "role": "assistant",
                    "agent": self.agent_name,
                    "content": f"Uploaded file: {title or response['file']['name']}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "channel_id": channel_id,
                    "user_id": "bot",
                    "thread_ts": thread_ts,
                    "file": file_info
                })
            
            return response
        except SlackApiError as e:
            # Log the error to Notion in real-time
            await self.session_logger.log_system_action("SLACK_API_ERROR", {
                "error": str(e),
                "file_path": file_path,
                "channel_id": channel_id,
                "thread_ts": thread_ts
            })
            logger.error(f"Slack API error when uploading file: {str(e)}")
            raise
    
    async def handle_compaction(self, reason: str = "SESSION_SIZE_LIMIT_REACHED") -> None:
        """
        Handle compaction event by creating a new session that bridges to this one.
        
        Args:
            reason: Reason for compaction
        """
        # Log the compaction event to Notion in real-time
        await self.session_logger.log_system_action("COMPACTION_INITIATED", {
            "reason": reason,
            "session_id": self.session_logger.session_id,
            "agent_name": self.agent_name
        })
        
        # Handle compaction in the session logger
        new_session_logger = await handle_compaction(self.session_logger, reason)
        
        if new_session_logger:
            # Update our instance variable to use the new session logger
            self.session_logger = new_session_logger
            
            # Log the successful compaction to Notion in real-time
            await self.session_logger.log_system_action("COMPACTION_COMPLETED", {
                "new_session_id": new_session_logger.session_id,
                "agent_name": self.agent_name
            })
        else:
            # Log the failed compaction to Notion in real-time
            await self.session_logger.log_system_action("COMPACTION_FAILED", {
                "reason": "Failed to create new session logger",
                "agent_name": self.agent_name
            })
    
    async def close(self) -> None:
        """Close the Slack agent app and clean up resources."""
        # Log the closure to Notion in real-time
        await self.session_logger.log_system_action("SLACK_AGENT_CLOSING", {
            "agent_name": self.agent_name,
            "agent_id": self.agent_id,
            "session_id": self.session_logger.session_id
        })
        
        # Close the session logger
        await close_session(self.session_logger)
    
    def start(self) -> None:
        """Start the Slack app with Socket Mode."""
        # Log the start to Notion (has to be done synchronously here)
        logger.info(f"Starting {self.agent_name} Slack app")
        
        # Start the Socket Mode handler
        SocketModeHandler(self.app, self.app_token).start()


class EnhancedPlannerAgentApp(EnhancedSlackAgentApp):
    """Enhanced Slack app for the Planner agent with real-time context logging."""
    
    def __init__(self, notion_client: Optional[NotionClient] = None, 
                context_manager: Optional[ContextManager] = None):
        """
        Initialize the Enhanced Planner agent app.
        
        Args:
            notion_client: Optional Notion client. If not provided, a new one will be created.
            context_manager: Optional context manager. If not provided, a new one will be created.
        """
        super().__init__("PlannerAgent", notion_client, context_manager)
    
    async def _process_message(self, message: SlackMessage, client: WebClient, context: BoltContext, session_id: str) -> None:
        """
        Process a Slack message for the Planner agent with real-time logging.
        
        Args:
            message: Slack message to process
            client: Slack WebClient
            context: Bolt context
            session_id: Context session ID
        """
        logger.info(f"PlannerAgent processing message: {message.text}")
        
        # Log the planner agent processing to Notion in real-time
        await self.session_logger.log_system_action("PLANNER_PROCESSING", {
            "message_id": message.message_id,
            "text": message.text[:100] + ("..." if len(message.text) > 100 else ""),
            "channel_id": message.channel_id,
            "user_id": message.user_id,
            "session_id": session_id
        })
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": f"Planning: {message.text[:50]}...",
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "current_session": session_id
        })
        
        # Acknowledge receipt
        response = await self.post_message(
            message.channel_id,
            "PlannerAgent is analyzing your request...",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Add acknowledgment to context
        self.context_manager.add_message(session_id, {
            "id": response["ts"],
            "role": "assistant",
            "agent": self.agent_name,
            "content": "PlannerAgent is analyzing your request...",
            "timestamp": datetime.utcnow().isoformat(),
            "channel_id": message.channel_id,
            "user_id": "bot",
            "thread_ts": message.thread_ts or message.message_id
        })
        
        # Create a task
        task = Task(
            title=f"Plan for: {message.text[:50]}...",
            description=message.text,
            agent="planner",
            status="in_progress",
            slack_thread_id=message.thread_ts or message.message_id,
            slack_channel_id=message.channel_id,
            assigned_by=message.user_id
        )
        
        # Log the task creation to Notion in real-time
        await self.session_logger.log_system_action("CREATING_TASK", {
            "task_id": task.id,
            "title": task.title,
            "agent": task.agent,
            "status": task.status
        })
        
        # Add a thinking step
        thinking_step = TaskStep(
            description="Analyzing request to create a plan",
            agent="planner",
            status="in_progress"
        )
        task.steps.append(thinking_step)
        
        # Create the task in Notion
        notion_page = await self.notion_client.create_task_page(task)
        task.notion_page_id = notion_page["id"]
        
        # Log the Notion task creation to Notion in real-time
        await self.session_logger.log_system_action("NOTION_TASK_CREATED", {
            "task_id": task.id,
            "notion_page_id": task.notion_page_id,
            "title": task.title
        })
        
        # Store task in context
        workflow_id = str(uuid.uuid4())
        await self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat(),
            "current_step": "planning",
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Post thinking steps
        thinking_steps = [
            "Analyzing request and identifying key requirements",
            "Breaking down into manageable tasks",
            "Determining dependencies between tasks",
            "Identifying required agents for each task"
        ]
        
        for step_text in thinking_steps:
            # Log the thinking step to Notion in real-time
            await self.session_logger.log_system_action("THINKING_STEP", {
                "step": step_text,
                "task_id": task.id
            })
            
            step_response = await self.post_thinking_step(
                message.channel_id,
                message.thread_ts or message.message_id,
                step_text,
                session_id
            )
            
            # Add the step to the task
            step = TaskStep(
                description=step_text,
                agent="planner",
                status="completed",
                slack_message_id=step_response["ts"]
            )
            task.steps.append(step)
            
            # Add the step to Notion
            await self.notion_client.add_task_step(task.id, step)
            
            # Simulate some processing time
            await asyncio.sleep(0.5)
        
        # Generate a plan (in a real implementation, this would use OpenAI o3 to generate the plan)
        plan = {
            "tasks": [
                {
                    "title": "Research existing solutions",
                    "agent": "planner",
                    "priority": "high",
                    "description": "Analyze existing solutions to identify best practices and potential improvements"
                },
                {
                    "title": "Design system architecture",
                    "agent": "planner",
                    "priority": "high",
                    "description": "Create a comprehensive system architecture design"
                },
                {
                    "title": "Implement core functionality",
                    "agent": "executor",
                    "priority": "high",
                    "description": "Implement the core functionality based on the design"
                },
                {
                    "title": "Write tests",
                    "agent": "executor",
                    "priority": "medium",
                    "description": "Write tests for the implemented functionality"
                },
                {
                    "title": "Review implementation",
                    "agent": "reviewer",
                    "priority": "medium",
                    "description": "Review the implementation for correctness and quality"
                },
                {
                    "title": "Document the system",
                    "agent": "notion",
                    "priority": "low",
                    "description": "Create comprehensive documentation for the system"
                }
            ]
        }
        
        # Log the plan generation to Notion in real-time
        await self.session_logger.log_system_action("PLAN_GENERATED", {
            "task_id": task.id,
            "task_count": len(plan["tasks"]),
            "workflow_id": workflow_id
        })
        
        # Format the plan as a message
        plan_text = "I've created a plan for your request:\n\n"
        for i, t in enumerate(plan["tasks"]):
            plan_text += f"{i+1}. *{t['title']}* (Assigned to: {t['agent']}, Priority: {t['priority']})\n   {t['description']}\n\n"
        
        # Add next steps
        plan_text += "\nNext steps:\n1. Please approve this plan with a 👍 reaction\n2. Or request changes with a 👎 reaction"
        
        # Post the plan
        conclusion_response = await self.post_message(
            message.channel_id,
            plan_text,
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Update the task with the completed plan
        result_step = TaskStep(
            description="Generated project plan",
            agent="planner",
            status="completed",
            slack_message_id=conclusion_response["ts"],
            result=plan
        )
        task.steps.append(result_step)
        
        # Add the result step to Notion
        await self.notion_client.add_task_step(task.id, result_step)
        
        # Update the task status
        task.status = "needs_review"
        await self.notion_client.update_task_status(task.id, "needs_review")
        
        # Log the task completion to Notion in real-time
        await self.session_logger.log_system_action("TASK_COMPLETED", {
            "task_id": task.id,
            "status": task.status,
            "workflow_id": workflow_id
        })
        
        # Update workflow state
        await self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "needs_review",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "current_step": "awaiting_approval",
            "plan": plan,
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "updated_at": datetime.utcnow().isoformat()
        })
        
        # Log the completion of processing to Notion in real-time
        await self.session_logger.log_system_action("PLANNING_COMPLETED", {
            "task_id": task.id,
            "workflow_id": workflow_id,
            "duration_ms": int((datetime.utcnow() - datetime.fromisoformat(message.timestamp)).total_seconds() * 1000)
        })


# Main function to start enhanced agent apps
async def main():
    """Start all enhanced agent apps with real-time context logging."""
    # Create a Notion client
    notion_client = NotionClient()
    
    # Create a context manager
    context_manager = ContextManager()
    
    # Create the enhanced agent apps
    planner_app = EnhancedPlannerAgentApp(notion_client, context_manager)
    
    # Start the apps
    planner_app.start()
    
    logger.info("Enhanced Planner agent app started with real-time context logging.")
    
    # Keep the main thread alive
    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())