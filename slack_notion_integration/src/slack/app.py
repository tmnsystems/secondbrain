"""
Slack app configuration and event handlers for the SecondBrain Slack-Notion integration.
"""

import os
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime
import asyncio
import json
import uuid

from slack_bolt import App, BoltContext
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_sdk.web import WebClient

from ..config.env import get_env_var
from ..models.schema import SlackMessage, Task, TaskStep
from ..notion.client import NotionClient
from ..context.manager import ContextManager
from ..utils.logger import get_logger

logger = get_logger(__name__)

class SlackAgentApp:
    """Base class for Slack agent applications."""
    
    def __init__(self, agent_name: str, notion_client: Optional[NotionClient] = None, 
                 context_manager: Optional[ContextManager] = None):
        """
        Initialize the Slack agent application.
        
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
        
        # Store agent state
        self._initialize_agent_state()
        
        # Register default event handlers
        self._register_default_handlers()
    
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
        """Register default event handlers."""
        # Handler for app mentions
        @self.app.event("app_mention")
        def handle_app_mention(body: Dict[str, Any], say: Callable, client: WebClient, context: BoltContext) -> None:
            """Handle app mention events."""
            event = body["event"]
            channel_id = event["channel"]
            user_id = event["user"]
            text = event["text"]
            thread_ts = event.get("thread_ts")
            
            # Create a SlackMessage object
            message = SlackMessage(
                message_id=event["ts"],
                thread_ts=thread_ts,
                channel_id=channel_id,
                user_id=user_id,
                text=text
            )
            
            # Create or get session for this conversation
            session_id = self._get_or_create_session(channel_id, user_id, thread_ts or event["ts"])
            
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
            say(f"{self.agent_name} received your message. Processing...", thread_ts=thread_ts or event["ts"])
            
            # Store agent acknowledgment message
            self.context_manager.add_message(session_id, {
                "id": f"ack-{message.message_id}",
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
        def handle_message(body: Dict[str, Any], say: Callable, client: WebClient, context: BoltContext) -> None:
            """Handle message events."""
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
                # Create a SlackMessage object
                message = SlackMessage(
                    message_id=event["ts"],
                    thread_ts=thread_ts,
                    channel_id=channel_id,
                    user_id=user_id,
                    text=text
                )
                
                # Create or get session for this conversation
                session_id = self._get_or_create_session(channel_id, user_id, thread_ts or event["ts"])
                
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
        def handle_reaction_added(body: Dict[str, Any], say: Callable, client: WebClient, context: BoltContext) -> None:
            """Handle reaction added events."""
            event = body["event"]
            reaction = event["reaction"]
            item = event["item"]
            
            # Get channel and message details
            channel_id = item.get("channel")
            message_ts = item.get("ts")
            
            if channel_id and message_ts:
                # Try to find an existing session for this thread
                session_id = self._find_session_for_thread(channel_id, message_ts)
                
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
    
    def _get_or_create_session(self, channel_id: str, user_id: str, thread_ts: str) -> str:
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
        session_id = self._find_session_for_thread(channel_id, thread_ts)
        
        if not session_id:
            # Create a new session
            session_id = self.context_manager.create_session(user_id, "slack")
            
            # Store session metadata
            self.context_manager.redis.store_context(
                f"slack:thread:{channel_id}:{thread_ts}",
                {"session_id": session_id},
                86400  # 24 hour TTL
            )
            
            logger.info(f"Created new session {session_id} for thread {thread_ts} in channel {channel_id}")
        
        return session_id
    
    def _find_session_for_thread(self, channel_id: str, thread_ts: str) -> Optional[str]:
        """
        Find an existing session for a Slack thread.
        
        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp
            
        Returns:
            Session ID or None if not found
        """
        # Try to find session in Redis
        thread_context = self.context_manager.redis.get_context(f"slack:thread:{channel_id}:{thread_ts}")
        
        if thread_context and "session_id" in thread_context:
            session_id = thread_context["session_id"]
            
            # Verify that the session exists
            if self.context_manager.get_session(session_id):
                logger.info(f"Found existing session {session_id} for thread {thread_ts} in channel {channel_id}")
                return session_id
        
        return None
    
    async def _process_message(self, message: SlackMessage, client: WebClient, context: BoltContext, session_id: str) -> None:
        """
        Process a Slack message.
        
        Args:
            message: Slack message to process
            client: Slack WebClient
            context: Bolt context
            session_id: Context session ID
        """
        # Subclasses should override this method
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
        response = await client.chat_postMessage(
            channel=message.channel_id,
            thread_ts=message.thread_ts or message.message_id,
            text=f"{self.agent_name} processed your message. This is a base implementation."
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
        
        # Update agent state back to idle
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "updated_at": datetime.utcnow().isoformat()
        })
    
    async def _process_reaction(self, reaction: str, item: Dict[str, Any], client: WebClient, 
                               context: BoltContext, session_id: Optional[str] = None) -> None:
        """
        Process a reaction.
        
        Args:
            reaction: Reaction emoji
            item: Item the reaction was added to
            client: Slack WebClient
            context: Bolt context
            session_id: Optional context session ID
        """
        # Subclasses should override this method
        logger.info(f"Processing reaction: {reaction} on item: {item}")
    
    async def post_message(self, channel_id: str, text: str, thread_ts: Optional[str] = None, 
                         blocks: Optional[list] = None, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a message to Slack and store in context.
        
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
        
        # Send the message
        response = await self.client.chat_postMessage(**message_args)
        
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
    
    async def post_thinking_step(self, channel_id: str, thread_ts: str, step_text: str, 
                               session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a thinking step to a thread and store in context.
        
        Args:
            channel_id: Channel ID
            thread_ts: Thread timestamp
            step_text: Thinking step text
            session_id: Optional context session ID
            
        Returns:
            Response from the Slack API
        """
        text = f"🧠 *Thinking:* {step_text}"
        return await self.post_message(channel_id, text, thread_ts, session_id=session_id)
    
    async def post_conclusion(self, channel_id: str, thread_ts: str, conclusion_text: str,
                            session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a conclusion to a thread and store in context.
        
        Args:
            channel_id: Channel ID
            thread_ts: Thread timestamp
            conclusion_text: Conclusion text
            session_id: Optional context session ID
            
        Returns:
            Response from the Slack API
        """
        text = f"✅ *Conclusion:* {conclusion_text}"
        return await self.post_message(channel_id, text, thread_ts, session_id=session_id)
    
    async def post_file(self, channel_id: str, file_path: str, thread_ts: Optional[str] = None, 
                       title: Optional[str] = None, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload a file to Slack and store in context.
        
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
        
        # Upload the file
        response = await self.client.files_upload_v2(**upload_args)
        
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
    
    def start(self) -> None:
        """Start the Slack app."""
        SocketModeHandler(self.app, self.app_token).start()


class PlannerAgentApp(SlackAgentApp):
    """Slack app for the Planner agent."""
    
    def __init__(self, notion_client: Optional[NotionClient] = None, 
                context_manager: Optional[ContextManager] = None):
        """
        Initialize the Planner agent app.
        
        Args:
            notion_client: Optional Notion client. If not provided, a new one will be created.
            context_manager: Optional context manager. If not provided, a new one will be created.
        """
        super().__init__("PlannerAgent", notion_client, context_manager)
    
    async def _process_message(self, message: SlackMessage, client: WebClient, context: BoltContext, session_id: str) -> None:
        """
        Process a Slack message for the Planner agent.
        
        Args:
            message: Slack message to process
            client: Slack WebClient
            context: Bolt context
            session_id: Context session ID
        """
        logger.info(f"PlannerAgent processing message: {message.text}")
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": f"Planning: {message.text[:50]}...",
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "current_session": session_id
        })
        
        # Acknowledge receipt
        response = await client.chat_postMessage(
            channel=message.channel_id,
            thread_ts=message.thread_ts or message.message_id,
            text="PlannerAgent is analyzing your request..."
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
        
        # Add a thinking step
        thinking_step = TaskStep(
            description="Analyzing request to create a plan",
            agent="planner",
            status="in_progress"
        )
        task.steps.append(thinking_step)
        
        # Create the task in Notion
        notion_page = self.notion_client.create_task_page(task)
        task.notion_page_id = notion_page["id"]
        
        # Store task in context
        workflow_id = str(uuid.uuid4())
        self.context_manager.store_workflow_state(workflow_id, {
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
        for step_text in [
            "Analyzing request and identifying key requirements",
            "Breaking down into manageable tasks",
            "Determining dependencies between tasks",
            "Identifying required agents for each task"
        ]:
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
            self.notion_client.add_task_step(task.id, step)
            
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
        self.notion_client.add_task_step(task.id, result_step)
        
        # Update the task status
        task.status = "needs_review"
        self.notion_client.update_task_status(task.id, "needs_review")
        
        # Update workflow state
        self.context_manager.store_workflow_state(workflow_id, {
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
    
    async def _process_reaction(self, reaction: str, item: Dict[str, Any], client: WebClient, 
                               context: BoltContext, session_id: Optional[str] = None) -> None:
        """
        Process a reaction for the Planner agent.
        
        Args:
            reaction: Reaction emoji
            item: Item the reaction was added to
            client: Slack WebClient
            context: Bolt context
            session_id: Optional context session ID
        """
        logger.info(f"PlannerAgent processing reaction: {reaction} on item: {item}")
        
        # Find the session if not provided
        if not session_id:
            channel_id = item.get("channel")
            message_ts = item.get("ts")
            
            if channel_id and message_ts:
                session_id = self._find_session_for_thread(channel_id, message_ts)
        
        if not session_id:
            logger.warning("No session found for reaction")
            return
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": f"Processing reaction: {reaction}",
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "current_session": session_id
        })
        
        if reaction == "thumbsup":
            # Plan approved
            response = await client.chat_postMessage(
                channel=item["channel"],
                thread_ts=item["ts"],
                text="✅ Plan approved! Assigning tasks to appropriate agents."
            )
            
            # Store in context
            self.context_manager.add_message(session_id, {
                "id": response["ts"],
                "role": "assistant",
                "agent": self.agent_name,
                "content": "✅ Plan approved! Assigning tasks to appropriate agents.",
                "timestamp": datetime.utcnow().isoformat(),
                "channel_id": item["channel"],
                "user_id": "bot",
                "thread_ts": item["ts"]
            })
            
            # Update workflow state
            workflow_states = self._find_workflows_for_session(session_id)
            for workflow_id, workflow in workflow_states.items():
                if workflow["thread_ts"] == item["ts"] or workflow["channel_id"] == item["channel"]:
                    self.context_manager.store_workflow_state(workflow_id, {
                        **workflow,
                        "status": "in_progress",
                        "current_step": "execution",
                        "updated_at": datetime.utcnow().isoformat(),
                        "approved_at": datetime.utcnow().isoformat()
                    })
            
            # In a real implementation, this would create tasks for each agent and notify them
        
        elif reaction == "thumbsdown":
            # Plan rejected
            response = await client.chat_postMessage(
                channel=item["channel"],
                thread_ts=item["ts"],
                text="❌ Plan rejected. Please provide feedback on what needs to be changed."
            )
            
            # Store in context
            self.context_manager.add_message(session_id, {
                "id": response["ts"],
                "role": "assistant",
                "agent": self.agent_name,
                "content": "❌ Plan rejected. Please provide feedback on what needs to be changed.",
                "timestamp": datetime.utcnow().isoformat(),
                "channel_id": item["channel"],
                "user_id": "bot",
                "thread_ts": item["ts"]
            })
            
            # Update workflow state
            workflow_states = self._find_workflows_for_session(session_id)
            for workflow_id, workflow in workflow_states.items():
                if workflow["thread_ts"] == item["ts"] or workflow["channel_id"] == item["channel"]:
                    self.context_manager.store_workflow_state(workflow_id, {
                        **workflow,
                        "status": "rejected",
                        "current_step": "revision_needed",
                        "updated_at": datetime.utcnow().isoformat(),
                        "rejected_at": datetime.utcnow().isoformat()
                    })
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "updated_at": datetime.utcnow().isoformat()
        })
    
    def _find_workflows_for_session(self, session_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Find workflows for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Dictionary of workflow ID to workflow state
        """
        # In a real implementation, this would query the database
        # For now, just search all keys in Redis that start with "workflow:"
        keys = self.context_manager.redis.client.keys("workflow:*")
        workflows = {}
        
        for key in keys:
            workflow_id = key.replace("workflow:", "")
            workflow = self.context_manager.get_workflow_state(workflow_id)
            
            if workflow and workflow.get("session_id") == session_id:
                workflows[workflow_id] = workflow
        
        return workflows


class ExecutorAgentApp(SlackAgentApp):
    """Slack app for the Executor agent."""
    
    def __init__(self, notion_client: Optional[NotionClient] = None,
                context_manager: Optional[ContextManager] = None):
        """
        Initialize the Executor agent app.
        
        Args:
            notion_client: Optional Notion client. If not provided, a new one will be created.
            context_manager: Optional context manager. If not provided, a new one will be created.
        """
        super().__init__("ExecutorAgent", notion_client, context_manager)
    
    async def _process_message(self, message: SlackMessage, client: WebClient, context: BoltContext, session_id: str) -> None:
        """
        Process a Slack message for the Executor agent.
        
        Args:
            message: Slack message to process
            client: Slack WebClient
            context: Bolt context
            session_id: Context session ID
        """
        logger.info(f"ExecutorAgent processing message: {message.text}")
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": f"Executing: {message.text[:50]}...",
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "current_session": session_id
        })
        
        # Acknowledge receipt
        response = await self.post_message(
            message.channel_id,
            "ExecutorAgent is analyzing your request...",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Create a task
        task = Task(
            title=f"Execute: {message.text[:50]}...",
            description=message.text,
            agent="executor",
            status="in_progress",
            slack_thread_id=message.thread_ts or message.message_id,
            slack_channel_id=message.channel_id,
            assigned_by=message.user_id
        )
        
        # Add a thinking step
        thinking_step = TaskStep(
            description="Analyzing execution request",
            agent="executor",
            status="in_progress"
        )
        task.steps.append(thinking_step)
        
        # Create the task in Notion
        notion_page = self.notion_client.create_task_page(task)
        task.notion_page_id = notion_page["id"]
        
        # Store task in context
        workflow_id = str(uuid.uuid4())
        self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat(),
            "current_step": "execution",
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Post thinking steps
        for step_text in [
            "Analyzing request and identifying execution requirements",
            "Determining required resources and dependencies",
            "Planning execution steps",
            "Preparing execution environment"
        ]:
            step_response = await self.post_thinking_step(
                message.channel_id,
                message.thread_ts or message.message_id,
                step_text,
                session_id
            )
            
            # Add the step to the task
            step = TaskStep(
                description=step_text,
                agent="executor",
                status="completed",
                slack_message_id=step_response["ts"]
            )
            task.steps.append(step)
            
            # Add the step to Notion
            self.notion_client.add_task_step(task.id, step)
            
            # Simulate some processing time
            await asyncio.sleep(0.5)
        
        # Generate an execution result (in a real implementation, this would use GPT-4.1 Mini to generate the result)
        execution_result = {
            "status": "success",
            "output": "Executed the requested task successfully.",
            "details": "Implemented the functionality according to specifications.",
            "next_steps": [
                "Review the implementation",
                "Run tests to verify functionality",
                "Update documentation"
            ]
        }
        
        # Format the result as a message
        result_text = "I've executed your request:\n\n"
        result_text += f"*Status:* {execution_result['status']}\n"
        result_text += f"*Output:* {execution_result['output']}\n"
        result_text += f"*Details:* {execution_result['details']}\n\n"
        result_text += "*Next Steps:*\n"
        for i, step in enumerate(execution_result["next_steps"]):
            result_text += f"{i+1}. {step}\n"
        
        # Post the result
        conclusion_response = await self.post_message(
            message.channel_id,
            result_text,
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Update the task with the execution result
        result_step = TaskStep(
            description="Executed the task",
            agent="executor",
            status="completed",
            slack_message_id=conclusion_response["ts"],
            result=execution_result
        )
        task.steps.append(result_step)
        
        # Add the result step to Notion
        self.notion_client.add_task_step(task.id, result_step)
        
        # Update the task status
        task.status = "needs_review"
        self.notion_client.update_task_status(task.id, "needs_review")
        
        # Update workflow state
        self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "needs_review",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "current_step": "review",
            "execution_result": execution_result,
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Notify the reviewer (in a real implementation, this would tag the ReviewerAgent)
        await self.post_message(
            message.channel_id,
            "@ReviewerAgent Please review this execution.",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "updated_at": datetime.utcnow().isoformat()
        })


class ReviewerAgentApp(SlackAgentApp):
    """Slack app for the Reviewer agent."""
    
    def __init__(self, notion_client: Optional[NotionClient] = None,
                context_manager: Optional[ContextManager] = None):
        """
        Initialize the Reviewer agent app.
        
        Args:
            notion_client: Optional Notion client. If not provided, a new one will be created.
            context_manager: Optional context manager. If not provided, a new one will be created.
        """
        super().__init__("ReviewerAgent", notion_client, context_manager)
    
    async def _process_message(self, message: SlackMessage, client: WebClient, context: BoltContext, session_id: str) -> None:
        """
        Process a Slack message for the Reviewer agent.
        
        Args:
            message: Slack message to process
            client: Slack WebClient
            context: Bolt context
            session_id: Context session ID
        """
        logger.info(f"ReviewerAgent processing message: {message.text}")
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": f"Reviewing: {message.text[:50]}...",
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "current_session": session_id
        })
        
        # Acknowledge receipt
        response = await self.post_message(
            message.channel_id,
            "ReviewerAgent is analyzing your request...",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Create a task
        task = Task(
            title=f"Review: {message.text[:50]}...",
            description=message.text,
            agent="reviewer",
            status="in_progress",
            slack_thread_id=message.thread_ts or message.message_id,
            slack_channel_id=message.channel_id,
            assigned_by=message.user_id
        )
        
        # Add a thinking step
        thinking_step = TaskStep(
            description="Analyzing review request",
            agent="reviewer",
            status="in_progress"
        )
        task.steps.append(thinking_step)
        
        # Create the task in Notion
        notion_page = self.notion_client.create_task_page(task)
        task.notion_page_id = notion_page["id"]
        
        # Store task in context
        workflow_id = str(uuid.uuid4())
        self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat(),
            "current_step": "review",
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Post thinking steps
        for step_text in [
            "Analyzing execution results",
            "Checking against requirements",
            "Verifying correctness and quality",
            "Identifying potential issues"
        ]:
            step_response = await self.post_thinking_step(
                message.channel_id,
                message.thread_ts or message.message_id,
                step_text,
                session_id
            )
            
            # Add the step to the task
            step = TaskStep(
                description=step_text,
                agent="reviewer",
                status="completed",
                slack_message_id=step_response["ts"]
            )
            task.steps.append(step)
            
            # Add the step to Notion
            self.notion_client.add_task_step(task.id, step)
            
            # Simulate some processing time
            await asyncio.sleep(0.5)
        
        # Generate a review result (in a real implementation, this would use Claude 3.7 Sonnet to generate the result)
        review_result = {
            "status": "approved",
            "feedback": "The implementation meets the requirements and follows best practices.",
            "issues": [],
            "recommendations": [
                "Add more comprehensive tests",
                "Improve documentation with examples",
                "Consider performance optimization in the future"
            ]
        }
        
        # Format the result as a message
        result_text = "I've reviewed the execution:\n\n"
        result_text += f"*Status:* {review_result['status']}\n"
        result_text += f"*Feedback:* {review_result['feedback']}\n\n"
        
        if review_result["issues"]:
            result_text += "*Issues:*\n"
            for i, issue in enumerate(review_result["issues"]):
                result_text += f"{i+1}. {issue}\n"
            result_text += "\n"
        
        result_text += "*Recommendations:*\n"
        for i, rec in enumerate(review_result["recommendations"]):
            result_text += f"{i+1}. {rec}\n"
        
        # Post the result
        conclusion_response = await self.post_message(
            message.channel_id,
            result_text,
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Update the task with the review result
        result_step = TaskStep(
            description="Reviewed the execution",
            agent="reviewer",
            status="completed",
            slack_message_id=conclusion_response["ts"],
            result=review_result
        )
        task.steps.append(result_step)
        
        # Add the result step to Notion
        self.notion_client.add_task_step(task.id, result_step)
        
        # Update the task status
        task.status = "completed"
        self.notion_client.update_task_status(task.id, "completed")
        
        # Update workflow state
        self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "completed",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat(),
            "current_step": "documentation",
            "review_result": review_result,
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Notify the Notion agent for documentation
        await self.post_message(
            message.channel_id,
            "@NotionAgent Please document this implementation.",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Notify completion
        await self.post_message(
            message.channel_id,
            "✅ Review completed and approved.",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "updated_at": datetime.utcnow().isoformat()
        })


class NotionAgentApp(SlackAgentApp):
    """Slack app for the Notion agent."""
    
    def __init__(self, notion_client: Optional[NotionClient] = None,
                context_manager: Optional[ContextManager] = None):
        """
        Initialize the Notion agent app.
        
        Args:
            notion_client: Optional Notion client. If not provided, a new one will be created.
            context_manager: Optional context manager. If not provided, a new one will be created.
        """
        super().__init__("NotionAgent", notion_client, context_manager)
    
    async def _process_message(self, message: SlackMessage, client: WebClient, context: BoltContext, session_id: str) -> None:
        """
        Process a Slack message for the Notion agent.
        
        Args:
            message: Slack message to process
            client: Slack WebClient
            context: Bolt context
            session_id: Context session ID
        """
        logger.info(f"NotionAgent processing message: {message.text}")
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": f"Documenting: {message.text[:50]}...",
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "current_session": session_id
        })
        
        # Acknowledge receipt
        response = await self.post_message(
            message.channel_id,
            "NotionAgent is processing your request...",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Create a task
        task = Task(
            title=f"Document: {message.text[:50]}...",
            description=message.text,
            agent="notion",
            status="in_progress",
            slack_thread_id=message.thread_ts or message.message_id,
            slack_channel_id=message.channel_id,
            assigned_by=message.user_id
        )
        
        # Add a thinking step
        thinking_step = TaskStep(
            description="Analyzing documentation request",
            agent="notion",
            status="in_progress"
        )
        task.steps.append(thinking_step)
        
        # Create the task in Notion
        notion_page = self.notion_client.create_task_page(task)
        task.notion_page_id = notion_page["id"]
        
        # Store task in context
        workflow_id = str(uuid.uuid4())
        self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat(),
            "current_step": "documentation",
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Post thinking steps
        for step_text in [
            "Analyzing documentation requirements",
            "Gathering relevant information",
            "Structuring documentation content",
            "Preparing Notion page"
        ]:
            step_response = await self.post_thinking_step(
                message.channel_id,
                message.thread_ts or message.message_id,
                step_text,
                session_id
            )
            
            # Add the step to the task
            step = TaskStep(
                description=step_text,
                agent="notion",
                status="completed",
                slack_message_id=step_response["ts"]
            )
            task.steps.append(step)
            
            # Add the step to Notion
            self.notion_client.add_task_step(task.id, step)
            
            # Simulate some processing time
            await asyncio.sleep(0.5)
        
        # Generate a documentation result (in a real implementation, this would use GPT-4.1 Mini to generate the result)
        doc_result = {
            "status": "completed",
            "page_title": "Project Documentation",
            "page_url": "https://notion.so/example/project-documentation",
            "sections": [
                "Overview",
                "Architecture",
                "Implementation Details",
                "Usage Instructions",
                "Troubleshooting"
            ]
        }
        
        # Format the result as a message
        result_text = "I've created the documentation in Notion:\n\n"
        result_text += f"*Title:* {doc_result['page_title']}\n"
        result_text += f"*URL:* {doc_result['page_url']}\n\n"
        result_text += "*Sections:*\n"
        for i, section in enumerate(doc_result["sections"]):
            result_text += f"{i+1}. {section}\n"
        
        # Post the result
        conclusion_response = await self.post_message(
            message.channel_id,
            result_text,
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Update the task with the documentation result
        result_step = TaskStep(
            description="Created documentation in Notion",
            agent="notion",
            status="completed",
            slack_message_id=conclusion_response["ts"],
            result=doc_result
        )
        task.steps.append(result_step)
        
        # Add the result step to Notion
        self.notion_client.add_task_step(task.id, result_step)
        
        # Update the task status
        task.status = "completed"
        self.notion_client.update_task_status(task.id, "completed")
        
        # Update workflow state
        self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "task_id": task.id,
            "session_id": session_id,
            "status": "completed",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat(),
            "current_step": "completed",
            "documentation_result": doc_result,
            "thread_ts": message.thread_ts or message.message_id,
            "channel_id": message.channel_id
        })
        
        # Notify completion
        await self.post_message(
            message.channel_id,
            "✅ Documentation completed and available in Notion.",
            message.thread_ts or message.message_id,
            session_id=session_id
        )
        
        # Update agent state
        self.context_manager.store_agent_state(self.agent_id, {
            "name": self.agent_name,
            "current_task": None,
            "status": "idle",
            "updated_at": datetime.utcnow().isoformat()
        })
        
        # Create a context bridge to preserve this context for future conversations
        self.context_manager.bridge_context(
            session_id,
            session_id,  # We're bridging to the same session for now
            "Completed documentation for project",
            {
                "workflow_id": workflow_id,
                "documentation_url": doc_result["page_url"],
                "completed_at": datetime.utcnow().isoformat()
            }
        )


# Main function to start all agent apps
def main():
    """Start all agent apps."""
    # Create a Notion client
    notion_client = NotionClient()
    
    # Create a Redis client
    redis_client = RedisClient(url=os.getenv("REDIS_URL"))
    
    # Create a context manager
    context_manager = ContextManager(redis_client)
    
    # Create the agent apps
    planner_app = PlannerAgentApp(notion_client, context_manager)
    executor_app = ExecutorAgentApp(notion_client, context_manager)
    reviewer_app = ReviewerAgentApp(notion_client, context_manager)
    notion_app = NotionAgentApp(notion_client, context_manager)
    
    # Start the apps
    planner_app.start()
    executor_app.start()
    reviewer_app.start()
    notion_app.start()
    
    logger.info("All agent apps started.")
    
    # Keep the main thread alive
    import time
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()