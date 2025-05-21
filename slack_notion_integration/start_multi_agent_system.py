#!/usr/bin/env python3
"""
Start script for the SecondBrain multi-agent system with real-time context logging to Notion.
This script initializes the multi-agent architecture with PlannerAgent, ExecutorAgent,
ReviewerAgent, and NotionAgent, all connected to Slack with persistent context management.

Usage:
    python start_multi_agent_system.py [--debug]
"""

import os
import sys
import asyncio
import logging
import argparse
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import required modules
from src.slack.multi_agent import MultiAgentSystem
from context_manager import ContextManager
from src.cli.cli_session_logger import CLISessionLogger
from src.cli.session_manager import initialize_cli_session

async def main():
    """Initialize and start the SecondBrain multi-agent system with real-time context logging."""
    parser = argparse.ArgumentParser(description="Start the SecondBrain multi-agent system")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    # Configure logging
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(f"multi_agent_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        ]
    )
    logger = logging.getLogger("multi_agent_system")
    
    # Log startup information
    logger.info("Starting SecondBrain multi-agent system with real-time context logging")
    
    try:
        # Initialize the context manager for three-layer persistence
        logger.info("Initializing context manager")
        context_manager = ContextManager()
        await context_manager.initialize()
        
        # Initialize a new CLI session for the multi-agent system
        session_id = f"multi-agent-system-{int(datetime.now().timestamp())}"
        logger.info(f"Initializing CLI session with ID: {session_id}")
        
        # Create the CLI Session Logger for real-time logging to Notion
        cli_session_logger = await initialize_cli_session(session_id=session_id)
        
        # Log initialization to Notion in real-time
        await cli_session_logger.log_system_action("MULTI_AGENT_SYSTEM_INIT", {
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "debug_mode": args.debug
        })
        
        # Define the agent configuration
        agent_config = {
            "planner": {
                "model": "claude-3-7-sonnet-20250219",  # Use Claude 3.7 Sonnet for planning
                "token": os.environ.get("ANTHROPIC_API_KEY"),
                "app_token": os.environ.get("SLACK_PLANNER_APP_TOKEN"),
                "bot_token": os.environ.get("SLACK_PLANNER_BOT_TOKEN")
            },
            "executor": {
                "model": "gpt-4-1106-preview",  # GPT-4.1 Mini for implementation
                "token": os.environ.get("OPENAI_API_KEY"),
                "app_token": os.environ.get("SLACK_EXECUTOR_APP_TOKEN"),
                "bot_token": os.environ.get("SLACK_EXECUTOR_BOT_TOKEN")
            },
            "reviewer": {
                "model": "gpt-3.5-turbo",  # OpenAI o3 for cost-effective review
                "token": os.environ.get("OPENAI_API_KEY"),
                "app_token": os.environ.get("SLACK_REVIEWER_APP_TOKEN"),
                "bot_token": os.environ.get("SLACK_REVIEWER_BOT_TOKEN")
            },
            "notion": {
                "model": "gpt-4-1106-preview",  # GPT-4.1 Mini for structured data
                "token": os.environ.get("OPENAI_API_KEY"),
                "app_token": os.environ.get("SLACK_NOTION_APP_TOKEN"),
                "bot_token": os.environ.get("SLACK_NOTION_BOT_TOKEN"),
                "notion_token": os.environ.get("NOTION_API_KEY")
            }
        }
        
        # Log agent configuration to Notion
        await cli_session_logger.log_system_action("AGENT_CONFIG_LOADED", {
            "agent_roles": list(agent_config.keys()),
            "timestamp": datetime.now().isoformat()
        })
        
        # Create and initialize the multi-agent system
        logger.info("Creating multi-agent system")
        multi_agent = MultiAgentSystem(
            agent_config=agent_config,
            session_logger=cli_session_logger,
            context_manager=context_manager,
            debug=args.debug
        )
        
        # Initialize the multi-agent system
        logger.info("Initializing multi-agent system")
        await multi_agent.initialize()
        
        # Log the system initialization to Notion
        await cli_session_logger.log_system_action("MULTI_AGENT_SYSTEM_INITIALIZED", {
            "timestamp": datetime.now().isoformat()
        })
        
        # Start the multi-agent system
        logger.info("Starting multi-agent system")
        await multi_agent.start()
        
        # Log the system start to Notion
        await cli_session_logger.log_system_action("MULTI_AGENT_SYSTEM_STARTED", {
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep the system running until interrupted
        logger.info("Multi-agent system is running. Press Ctrl+C to stop.")
        
        # Wait indefinitely (until interrupted)
        while True:
            await asyncio.sleep(60)
            # Periodic health check
            await cli_session_logger.log_system_action("MULTI_AGENT_SYSTEM_HEARTBEAT", {
                "timestamp": datetime.now().isoformat()
            })
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down")
        if 'cli_session_logger' in locals() and cli_session_logger:
            await cli_session_logger.log_system_action("MULTI_AGENT_SYSTEM_SHUTDOWN", {
                "reason": "KEYBOARD_INTERRUPT",
                "timestamp": datetime.now().isoformat()
            })
        
    except Exception as e:
        logger.error(f"Error starting multi-agent system: {str(e)}", exc_info=True)
        if 'cli_session_logger' in locals() and cli_session_logger:
            await cli_session_logger.log_system_action("MULTI_AGENT_SYSTEM_ERROR", {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
    finally:
        # Clean up and close the session
        if 'multi_agent' in locals() and multi_agent:
            logger.info("Stopping multi-agent system")
            await multi_agent.stop()
        
        if 'context_manager' in locals() and context_manager:
            logger.info("Closing context manager")
            await context_manager.close()
        
        if 'cli_session_logger' in locals() and cli_session_logger:
            logger.info("Closing CLI session")
            await cli_session_logger.close_session()
        
        logger.info("Multi-agent system has been shut down")

if __name__ == "__main__":
    # Run the main async function
    asyncio.run(main())