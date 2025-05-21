"""
Multi-agent Slack integration with real-time context logging.

This module provides a multi-agent system for Slack that integrates with
the CLI Session Logger for real-time context logging to Notion.
"""

import os
import logging
import asyncio
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime

from slack_sdk.web import WebClient
from slack_sdk.errors import SlackApiError

from .enhanced_app import EnhancedSlackAgentApp
from ..models.schema import SlackMessage, Task, TaskStep
from ..notion.client import NotionClient
from ..context.manager import ContextManager
from ..cli.cli_session_logger import CLISessionLogger
from ..cli.session_manager import initialize_cli_session, handle_compaction
from ..utils.logger import get_logger
from ..langgraph.flows import create_agent_workflow

logger = get_logger(__name__)

class AgentFactory:
    """Factory for creating agent instances with proper identities."""
    
    @classmethod
    async def create_agent(cls, agent_type: str, notion_client: Optional[NotionClient] = None,
                      context_manager: Optional[ContextManager] = None) -> EnhancedSlackAgentApp:
        """
        Create a new agent instance with proper configuration.
        
        Args:
            agent_type: Type of agent to create
            notion_client: Optional Notion client
            context_manager: Optional context manager
            
        Returns:
            Initialized agent instance
            
        Raises:
            ValueError: If agent_type is unknown
        """
        # Default to shared clients if not provided
        notion_client = notion_client or NotionClient()
        context_manager = context_manager or ContextManager()
        
        if agent_type.lower() == "planner":
            from .enhanced_app import EnhancedPlannerAgentApp
            agent = EnhancedPlannerAgentApp(notion_client, context_manager)
            model = "claude-3-7-sonnet"
            await agent.session_logger.log_system_action("AGENT_CREATED", {
                "agent_type": agent_type,
                "model": model,
                "timestamp": datetime.utcnow().isoformat()
            })
            return agent
            
        elif agent_type.lower() == "executor":
            class EnhancedExecutorAgentApp(EnhancedSlackAgentApp):
                def __init__(self, notion_client=None, context_manager=None):
                    super().__init__("ExecutorAgent", notion_client, context_manager)
            
            agent = EnhancedExecutorAgentApp(notion_client, context_manager)
            model = "gpt-4.1-mini"
            await agent.session_logger.log_system_action("AGENT_CREATED", {
                "agent_type": agent_type,
                "model": model,
                "timestamp": datetime.utcnow().isoformat()
            })
            return agent
            
        elif agent_type.lower() == "reviewer":
            class EnhancedReviewerAgentApp(EnhancedSlackAgentApp):
                def __init__(self, notion_client=None, context_manager=None):
                    super().__init__("ReviewerAgent", notion_client, context_manager)
            
            agent = EnhancedReviewerAgentApp(notion_client, context_manager)
            model = "o3"
            await agent.session_logger.log_system_action("AGENT_CREATED", {
                "agent_type": agent_type,
                "model": model,
                "timestamp": datetime.utcnow().isoformat()
            })
            return agent
            
        elif agent_type.lower() == "notion":
            class EnhancedNotionAgentApp(EnhancedSlackAgentApp):
                def __init__(self, notion_client=None, context_manager=None):
                    super().__init__("NotionAgent", notion_client, context_manager)
            
            agent = EnhancedNotionAgentApp(notion_client, context_manager)
            model = "gpt-4.1-mini"
            await agent.session_logger.log_system_action("AGENT_CREATED", {
                "agent_type": agent_type,
                "model": model,
                "timestamp": datetime.utcnow().isoformat()
            })
            return agent
            
        else:
            raise ValueError(f"Unknown agent type: {agent_type}")


class MultiAgentSystem:
    """
    Multi-agent system for Slack with real-time context logging.
    
    This class manages a collection of agent apps that communicate with each other
    and with users through Slack, with all interactions logged to Notion in real-time.
    """
    
    def __init__(self):
        """Initialize the multi-agent system."""
        self.agents = {}
        self.notion_client = NotionClient()
        self.context_manager = ContextManager()
        self.session_logger = None
        self.workflow = None
    
    async def initialize(self):
        """Initialize the multi-agent system."""
        # Initialize the system-level CLI Session Logger
        self.session_logger = await initialize_cli_session(
            session_id=f"multi-agent-system-{int(datetime.now().timestamp())}"
        )
        
        await self.session_logger.log_system_action("MULTI_AGENT_SYSTEM_INIT", {
            "timestamp": datetime.utcnow().isoformat(),
            "system_id": f"mas-{uuid.uuid4()}"
        })
        
        # Initialize LangGraph workflow
        self.workflow = create_agent_workflow()
        
        await self.session_logger.log_system_action("LANGGRAPH_WORKFLOW_CREATED", {
            "states": ["planner", "reviewer", "executor", "notion"],
            "transitions": [
                "planner -> reviewer",
                "reviewer -> executor/planner/notion",
                "executor -> reviewer",
                "reviewer -> notion"
            ]
        })
        
        # Create agent instances
        for agent_type in ["planner", "executor", "reviewer", "notion"]:
            self.agents[agent_type] = await AgentFactory.create_agent(
                agent_type,
                self.notion_client,
                self.context_manager
            )
            
            # Log agent creation
            await self.session_logger.log_system_action(f"{agent_type.upper()}_AGENT_CREATED", {
                "agent_id": self.agents[agent_type].agent_id,
                "session_id": self.agents[agent_type].session_logger.session_id
            })
        
        # Register cross-agent references
        for agent_type, agent in self.agents.items():
            # Store references to other agents
            agent.other_agents = {k: v for k, v in self.agents.items() if k != agent_type}
            
            # Create bridges between agent sessions
            for other_type, other_agent in agent.other_agents.items():
                await agent.session_logger.log_system_action("AGENT_BRIDGE_CREATED", {
                    "from_agent": agent_type,
                    "to_agent": other_type,
                    "from_session_id": agent.session_logger.session_id,
                    "to_session_id": other_agent.session_logger.session_id
                })
    
    async def handle_compaction(self, reason: str = "SYSTEM_COMPACTION"):
        """
        Handle compaction across all agents.
        
        Args:
            reason: Reason for compaction
        """
        # Log the compaction event
        await self.session_logger.log_system_action("MULTI_AGENT_COMPACTION_INITIATED", {
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Handle compaction for the system logger
        new_system_logger = await handle_compaction(self.session_logger, reason)
        self.session_logger = new_system_logger
        
        # Handle compaction for each agent
        for agent_type, agent in self.agents.items():
            await agent.handle_compaction(f"{agent_type.upper()}_AGENT_{reason}")
        
        # Log completion of compaction
        await self.session_logger.log_system_action("MULTI_AGENT_COMPACTION_COMPLETED", {
            "timestamp": datetime.utcnow().isoformat(),
            "new_system_session_id": self.session_logger.session_id
        })
    
    async def handle_user_message(self, message: SlackMessage, agent_type: str = "planner"):
        """
        Handle an incoming user message by routing it to the appropriate agent.
        
        Args:
            message: The Slack message to handle
            agent_type: The type of agent to initially route the message to
            
        Returns:
            Result of handling the message
        """
        # Log the incoming message
        await self.session_logger.log_user_message(
            f"[{agent_type}] Slack user {message.user_id} in {message.channel_id}: {message.text}"
        )
        
        # Get the target agent
        agent = self.agents.get(agent_type.lower())
        if not agent:
            error_msg = f"Unknown agent type: {agent_type}"
            await self.session_logger.log_system_action("ERROR", {
                "error": error_msg,
                "timestamp": datetime.utcnow().isoformat()
            })
            return {"error": error_msg}
        
        # Create or get session for this conversation
        session_id = await agent._get_or_create_session(
            message.channel_id,
            message.user_id,
            message.thread_ts or message.message_id
        )
        
        # Create a workflow state for this conversation
        workflow_id = str(uuid.uuid4())
        await self.context_manager.store_workflow_state(workflow_id, {
            "id": workflow_id,
            "session_id": session_id,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat(),
            "current_agent": agent_type,
            "message_id": message.message_id,
            "channel_id": message.channel_id,
            "thread_ts": message.thread_ts or message.message_id
        })
        
        # Log the workflow creation
        await self.session_logger.log_system_action("WORKFLOW_CREATED", {
            "workflow_id": workflow_id,
            "session_id": session_id,
            "initial_agent": agent_type
        })
        
        # Process the message with the target agent
        await agent._process_message(message, agent.client, None, session_id)
        
        # Return the result
        return {
            "success": True,
            "workflow_id": workflow_id,
            "session_id": session_id,
            "agent": agent_type
        }
    
    async def transition_to_agent(self, workflow_id: str, from_agent: str, to_agent: str, message: str):
        """
        Transition a workflow from one agent to another.
        
        Args:
            workflow_id: The ID of the workflow to transition
            from_agent: The agent transitioning from
            to_agent: The agent transitioning to
            message: The message to send to the next agent
            
        Returns:
            Result of the transition
        """
        # Get workflow state
        workflow = await self.context_manager.get_workflow_state(workflow_id)
        if not workflow:
            error_msg = f"Unknown workflow: {workflow_id}"
            await self.session_logger.log_system_action("ERROR", {
                "error": error_msg,
                "timestamp": datetime.utcnow().isoformat()
            })
            return {"error": error_msg}
        
        # Get source and target agents
        source_agent = self.agents.get(from_agent.lower())
        target_agent = self.agents.get(to_agent.lower())
        
        if not source_agent or not target_agent:
            error_msg = f"Unknown agent: {from_agent if not source_agent else to_agent}"
            await self.session_logger.log_system_action("ERROR", {
                "error": error_msg,
                "timestamp": datetime.utcnow().isoformat()
            })
            return {"error": error_msg}
        
        # Log the transition
        await self.session_logger.log_system_action("AGENT_TRANSITION", {
            "workflow_id": workflow_id,
            "from_agent": from_agent,
            "to_agent": to_agent,
            "message": message[:100] + ("..." if len(message) > 100 else "")
        })
        
        # Update workflow state
        await self.context_manager.store_workflow_state(workflow_id, {
            **workflow,
            "current_agent": to_agent,
            "updated_at": datetime.utcnow().isoformat(),
            "previous_agent": from_agent
        })
        
        # Create message for next agent
        channel_id = workflow["channel_id"]
        thread_ts = workflow["thread_ts"]
        
        # Post message to Slack
        try:
            # Send message from source agent
            transition_msg = f"@{to_agent.capitalize()}Agent {message}"
            response = await source_agent.post_message(
                channel_id,
                transition_msg,
                thread_ts
            )
            
            # Log the transition message
            await source_agent.session_logger.log_system_action("TRANSITION_MESSAGE_SENT", {
                "to_agent": to_agent,
                "message_id": response["ts"],
                "workflow_id": workflow_id
            })
            
            # Create a message for the target agent to process
            next_message = SlackMessage(
                message_id=response["ts"],
                channel_id=channel_id,
                user_id=source_agent.agent_id,  # Source agent is the sender
                text=message,
                thread_ts=thread_ts,
                timestamp=datetime.utcnow().isoformat()
            )
            
            # Process the message with the target agent
            session_id = workflow["session_id"]
            await target_agent._process_message(next_message, target_agent.client, None, session_id)
            
            return {
                "success": True,
                "workflow_id": workflow_id,
                "from_agent": from_agent,
                "to_agent": to_agent,
                "message_id": response["ts"]
            }
            
        except SlackApiError as e:
            error_msg = f"Slack API error: {str(e)}"
            await self.session_logger.log_system_action("ERROR", {
                "error": error_msg,
                "workflow_id": workflow_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            return {"error": error_msg}
    
    async def complete_workflow(self, workflow_id: str, final_agent: str, summary: str):
        """
        Complete a workflow and clean up resources.
        
        Args:
            workflow_id: The ID of the workflow to complete
            final_agent: The agent completing the workflow
            summary: Summary of the workflow results
            
        Returns:
            Result of completing the workflow
        """
        # Get workflow state
        workflow = await self.context_manager.get_workflow_state(workflow_id)
        if not workflow:
            error_msg = f"Unknown workflow: {workflow_id}"
            await self.session_logger.log_system_action("ERROR", {
                "error": error_msg,
                "timestamp": datetime.utcnow().isoformat()
            })
            return {"error": error_msg}
        
        # Get the final agent
        agent = self.agents.get(final_agent.lower())
        if not agent:
            error_msg = f"Unknown agent: {final_agent}"
            await self.session_logger.log_system_action("ERROR", {
                "error": error_msg,
                "timestamp": datetime.utcnow().isoformat()
            })
            return {"error": error_msg}
        
        # Log the workflow completion
        await self.session_logger.log_system_action("WORKFLOW_COMPLETED", {
            "workflow_id": workflow_id,
            "final_agent": final_agent,
            "summary": summary[:100] + ("..." if len(summary) > 100 else ""),
            "duration_ms": int((datetime.utcnow() - datetime.fromisoformat(workflow["created_at"])).total_seconds() * 1000)
        })
        
        # Update workflow state
        await self.context_manager.store_workflow_state(workflow_id, {
            **workflow,
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "final_agent": final_agent,
            "summary": summary
        })
        
        # Post final message to Slack
        channel_id = workflow["channel_id"]
        thread_ts = workflow["thread_ts"]
        
        try:
            # Send completion message
            completion_msg = f"✅ Workflow completed:\n\n{summary}"
            response = await agent.post_message(
                channel_id,
                completion_msg,
                thread_ts
            )
            
            # Log the completion message
            await agent.session_logger.log_system_action("COMPLETION_MESSAGE_SENT", {
                "message_id": response["ts"],
                "workflow_id": workflow_id
            })
            
            return {
                "success": True,
                "workflow_id": workflow_id,
                "final_agent": final_agent,
                "message_id": response["ts"]
            }
            
        except SlackApiError as e:
            error_msg = f"Slack API error: {str(e)}"
            await self.session_logger.log_system_action("ERROR", {
                "error": error_msg,
                "workflow_id": workflow_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            return {"error": error_msg}
    
    def start(self):
        """Start all agents."""
        for agent_type, agent in self.agents.items():
            agent.start()
            logger.info(f"Started {agent_type} agent")
    
    async def close(self):
        """Close all agents and clean up resources."""
        # Log system shutdown
        await self.session_logger.log_system_action("MULTI_AGENT_SYSTEM_SHUTDOWN", {
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Close all agents
        for agent_type, agent in self.agents.items():
            await agent.close()
            logger.info(f"Closed {agent_type} agent")
        
        # Close system logger
        await self.session_logger.close_session()


# Main function to start the multi-agent system
async def main():
    """Start the multi-agent system."""
    # Create and initialize the multi-agent system
    system = MultiAgentSystem()
    await system.initialize()
    
    # Start all agents
    system.start()
    
    logger.info("Multi-agent system started")
    
    # Keep the main thread alive
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down multi-agent system")
        await system.close()


if __name__ == "__main__":
    asyncio.run(main())