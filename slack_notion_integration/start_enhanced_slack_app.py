#!/usr/bin/env python3
"""
Start script for the enhanced Slack app with real-time context logging to Notion.
This script initializes the Slack app with the CLI Session Logger for persistent
context management.

Usage:
    python start_enhanced_slack_app.py [--debug]
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
import argparse

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import required modules
from src.slack.enhanced_app import EnhancedSlackAgentApp
from src.cli.cli_session_logger import CLISessionLogger
from src.cli.session_manager import initialize_cli_session

async def main():
    """Initialize and start the enhanced Slack app with real-time context logging."""
    parser = argparse.ArgumentParser(description="Start the enhanced Slack app with real-time context logging")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    # Configure logging
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(f"slack_app_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        ]
    )
    logger = logging.getLogger("enhanced_slack_app")
    
    # Log startup information
    logger.info("Starting enhanced Slack app with real-time context logging")
    
    try:
        # Initialize a new CLI session for the Slack app
        session_id = f"slack-app-{int(datetime.now().timestamp())}"
        logger.info(f"Initializing CLI session with ID: {session_id}")
        
        # Create the CLI Session Logger for real-time logging to Notion
        cli_session_logger = await initialize_cli_session(session_id=session_id)
        
        # Log initialization to Notion in real-time
        await cli_session_logger.log_system_action("SLACK_APP_INIT", {
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "debug_mode": args.debug
        })
        
        # Create and initialize the enhanced Slack app
        logger.info("Creating enhanced Slack app")
        app = EnhancedSlackAgentApp(
            app_token=os.environ.get("SLACK_APP_TOKEN"),
            bot_token=os.environ.get("SLACK_BOT_TOKEN"),
            session_logger=cli_session_logger,
            name="SecondBrain",
            debug=args.debug
        )
        
        # Log the app creation to Notion
        await cli_session_logger.log_system_action("SLACK_APP_CREATED", {
            "app_name": "SecondBrain",
            "timestamp": datetime.now().isoformat()
        })
        
        # Start the Slack app
        logger.info("Starting Slack app")
        await app.start()
        
        # Log the app start to Notion
        await cli_session_logger.log_system_action("SLACK_APP_STARTED", {
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep the app running until interrupted
        logger.info("Slack app is running. Press Ctrl+C to stop.")
        
        # Wait indefinitely (until interrupted)
        while True:
            await asyncio.sleep(60)
            # Periodic health check
            await cli_session_logger.log_system_action("SLACK_APP_HEARTBEAT", {
                "timestamp": datetime.now().isoformat()
            })
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down")
        if 'cli_session_logger' in locals() and cli_session_logger:
            await cli_session_logger.log_system_action("SLACK_APP_SHUTDOWN", {
                "reason": "KEYBOARD_INTERRUPT",
                "timestamp": datetime.now().isoformat()
            })
        
    except Exception as e:
        logger.error(f"Error starting Slack app: {str(e)}", exc_info=True)
        if 'cli_session_logger' in locals() and cli_session_logger:
            await cli_session_logger.log_system_action("SLACK_APP_ERROR", {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
    finally:
        # Clean up and close the session
        if 'app' in locals() and app:
            logger.info("Stopping Slack app")
            await app.stop()
        
        if 'cli_session_logger' in locals() and cli_session_logger:
            logger.info("Closing CLI session")
            await cli_session_logger.close_session()
        
        logger.info("Slack app has been shut down")

if __name__ == "__main__":
    # Run the main async function
    asyncio.run(main())