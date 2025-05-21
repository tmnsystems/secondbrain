#!/usr/bin/env python3
"""
CLI Bridge for connecting SecondBrain CLI sessions to Notion for context persistence.

This script provides a bridge between the Claude CLI and Notion,
ensuring that all interactions are logged and context is preserved
between sessions, even during compaction events.

Usage:
    python cli_bridge.py --init                # Initialize a new CLI session
    python cli_bridge.py --log-user "message"  # Log a user message
    python cli_bridge.py --log-system "action" # Log a system action
    python cli_bridge.py --log-assistant "msg" # Log an assistant message
    python cli_bridge.py --log-tool "name" ... # Log a tool call
    python cli_bridge.py --handle-compaction   # Handle compaction event
    python cli_bridge.py --close               # Close the current session
"""

import os
import sys
import json
import argparse
import asyncio
from typing import Dict, Any, Optional, List

# Add parent directory to path so we can import from src
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.cli.session_manager import (
    initialize_cli_session,
    handle_compaction,
    close_session,
    get_active_sessions
)

# File to store the current session ID
SESSION_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "logs",
    "current_session.json"
)

async def get_current_session():
    """
    Get the current CLI session logger.
    
    Returns:
        Active session logger, or a new one if none exists
    """
    # Create logs directory if it doesn't exist
    os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)
    
    # Try to load from file
    session_id = None
    try:
        if os.path.exists(SESSION_FILE):
            with open(SESSION_FILE, "r") as f:
                session_data = json.load(f)
            session_id = session_data.get("session_id")
    except Exception as e:
        print(f"Error loading session data: {str(e)}", file=sys.stderr)
    
    # Initialize or load session
    session_logger = await initialize_cli_session(session_id=session_id)
    
    # Save session ID
    with open(SESSION_FILE, "w") as f:
        json.dump({
            "session_id": session_logger.session_id,
            "url": session_logger.get_session_url()
        }, f)
    
    return session_logger

async def init_session(args):
    """Initialize a new CLI session."""
    # Force a new session
    if os.path.exists(SESSION_FILE):
        os.remove(SESSION_FILE)
    
    session_logger = await get_current_session()
    print(f"Initialized new CLI session: {session_logger.session_id}")
    print(f"Session URL: {session_logger.get_session_url() or 'Not available'}")

async def log_user_message(args):
    """Log a user message."""
    session_logger = await get_current_session()
    await session_logger.log_user_message(args.message)
    print(f"Logged user message to Notion")

async def log_system_action(args):
    """Log a system action."""
    session_logger = await get_current_session()
    details = {}
    
    # Parse key=value parameters from command line
    if args.details:
        for item in args.details:
            if "=" in item:
                key, value = item.split("=", 1)
                details[key] = value
            else:
                details[item] = True
    
    await session_logger.log_system_action(args.action, details)
    print(f"Logged system action '{args.action}' to Notion")

async def log_assistant_response(args):
    """Log an assistant response."""
    session_logger = await get_current_session()
    await session_logger.log_assistant_response(args.message)
    print(f"Logged assistant response to Notion")

async def log_tool_call(args):
    """Log a tool call."""
    session_logger = await get_current_session()
    
    # Parse input data from key=value parameters
    input_data = {}
    if args.input:
        for item in args.input:
            if "=" in item:
                key, value = item.split("=", 1)
                input_data[key] = value
            else:
                input_data[item] = True
    
    # Parse output data from key=value parameters
    output_data = {}
    if args.output:
        for item in args.output:
            if "=" in item:
                key, value = item.split("=", 1)
                output_data[key] = value
            else:
                output_data[item] = True
    
    await session_logger.log_tool_call(args.name, input_data, output_data)
    print(f"Logged tool call '{args.name}' to Notion")

async def handle_compaction_event(args):
    """Handle a compaction event."""
    session_logger = await get_current_session()
    
    print(f"Handling compaction event for session: {session_logger.session_id}")
    new_session_logger = await handle_compaction(session_logger, args.reason)
    
    # Save new session ID
    with open(SESSION_FILE, "w") as f:
        json.dump({
            "session_id": new_session_logger.session_id,
            "url": new_session_logger.get_session_url()
        }, f)
    
    print(f"Compaction handled. New session: {new_session_logger.session_id}")
    print(f"Session URL: {new_session_logger.get_session_url() or 'Not available'}")

async def close_current_session(args):
    """Close the current session."""
    session_logger = await get_current_session()
    
    print(f"Closing session: {session_logger.session_id}")
    await close_session(session_logger)
    
    # Remove session file
    if os.path.exists(SESSION_FILE):
        os.remove(SESSION_FILE)
    
    print("Session closed")

async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="CLI Bridge for SecondBrain context persistence")
    
    # Subparsers for different commands
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Initialize command
    init_parser = subparsers.add_parser("init", help="Initialize a new CLI session")
    init_parser.set_defaults(func=init_session)
    
    # Log user message command
    user_parser = subparsers.add_parser("log-user", help="Log a user message")
    user_parser.add_argument("message", help="User message to log")
    user_parser.set_defaults(func=log_user_message)
    
    # Log system action command
    system_parser = subparsers.add_parser("log-system", help="Log a system action")
    system_parser.add_argument("action", help="System action to log")
    system_parser.add_argument("details", nargs="*", help="Action details as key=value pairs")
    system_parser.set_defaults(func=log_system_action)
    
    # Log assistant response command
    assistant_parser = subparsers.add_parser("log-assistant", help="Log an assistant response")
    assistant_parser.add_argument("message", help="Assistant response to log")
    assistant_parser.set_defaults(func=log_assistant_response)
    
    # Log tool call command
    tool_parser = subparsers.add_parser("log-tool", help="Log a tool call")
    tool_parser.add_argument("name", help="Tool name")
    tool_parser.add_argument("--input", "-i", nargs="*", help="Input data as key=value pairs")
    tool_parser.add_argument("--output", "-o", nargs="*", help="Output data as key=value pairs")
    tool_parser.set_defaults(func=log_tool_call)
    
    # Handle compaction command
    compaction_parser = subparsers.add_parser("handle-compaction", help="Handle compaction event")
    compaction_parser.add_argument("--reason", "-r", default="MANUAL_COMPACTION", 
                                help="Reason for compaction (default: MANUAL_COMPACTION)")
    compaction_parser.set_defaults(func=handle_compaction_event)
    
    # Close session command
    close_parser = subparsers.add_parser("close", help="Close the current session")
    close_parser.set_defaults(func=close_current_session)
    
    # Add some flags for the legacy interface
    parser.add_argument("--init", action="store_true", help="Initialize a new CLI session")
    parser.add_argument("--log-user", metavar="MESSAGE", help="Log a user message")
    parser.add_argument("--log-system", metavar="ACTION", help="Log a system action")
    parser.add_argument("--log-assistant", metavar="MESSAGE", help="Log an assistant response")
    parser.add_argument("--log-tool", metavar="NAME", help="Log a tool call")
    parser.add_argument("--input", "-i", nargs="*", help="Input data for tool call as key=value pairs")
    parser.add_argument("--output", "-o", nargs="*", help="Output data for tool call as key=value pairs")
    parser.add_argument("--handle-compaction", action="store_true", help="Handle compaction event")
    parser.add_argument("--reason", "-r", default="MANUAL_COMPACTION", help="Reason for compaction")
    parser.add_argument("--close", action="store_true", help="Close the current session")
    
    args = parser.parse_args()
    
    # Handle legacy interface
    if args.init:
        await init_session(args)
    elif args.log_user:
        args.message = args.log_user
        await log_user_message(args)
    elif args.log_system:
        args.action = args.log_system
        await log_system_action(args)
    elif args.log_assistant:
        args.message = args.log_assistant
        await log_assistant_response(args)
    elif args.log_tool:
        args.name = args.log_tool
        await log_tool_call(args)
    elif args.handle_compaction:
        await handle_compaction_event(args)
    elif args.close:
        await close_current_session(args)
    # Handle subparser commands
    elif hasattr(args, "func"):
        await args.func(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    asyncio.run(main())