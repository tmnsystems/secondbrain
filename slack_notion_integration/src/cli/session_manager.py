"""
Session Manager for CLI sessions.

This module integrates the CLI Session Logger with the broader system,
providing a simple API for initialization, compaction handling,
and context persistence.

Example usage:
    # Initialize the session
    session_manager = await initialize_cli_session()
    
    # Log a user message
    await session_manager.log_user_message("User message")
    
    # When compaction occurs
    session_manager = await handle_compaction(session_manager, reason="CONTEXT_LIMIT")
"""

import os
import json
import asyncio
from typing import Dict, Any, Optional, List

from .cli_session_logger import CLISessionLogger

# Global registry of session managers to ensure only one per session
_SESSION_MANAGERS = {}

async def initialize_cli_session(
    session_id: Optional[str] = None,
    load_previous_context: bool = True
) -> CLISessionLogger:
    """
    Initialize a CLI session with context persistence.
    
    Args:
        session_id: Optional custom session ID
        load_previous_context: Whether to try loading previous context
        
    Returns:
        Initialized CLISessionLogger instance
    """
    # Check if we already have a session manager for this ID
    if session_id and session_id in _SESSION_MANAGERS:
        return _SESSION_MANAGERS[session_id]
    
    # Create a new session manager
    session_logger = CLISessionLogger(session_id=session_id)
    
    # Store in global registry
    _SESSION_MANAGERS[session_logger.session_id] = session_logger
    
    # Load critical files and log them
    await _load_critical_files(session_logger)
    
    # Set up compaction handler if possible
    _setup_compaction_handler(session_logger)
    
    # Load previous context if requested
    if load_previous_context:
        await session_logger.load_most_recent_context()
    
    return session_logger

async def _load_critical_files(session_logger: CLISessionLogger) -> None:
    """
    Load critical files and log them to the session.
    
    Args:
        session_logger: The active session logger
    """
    # Define critical files to load
    critical_files = [
        ("CLAUDE.md", "/Volumes/Envoy/SecondBrain/CLAUDE.md"),
        ("REVIEWER_PROTOCOL.md", "/Volumes/Envoy/SecondBrain/REVIEWER_PROTOCOL.md"),
        ("SLACK_NOTION_INTEGRATION_LOG.md", "/Volumes/Envoy/SecondBrain/SLACK_NOTION_IMPLEMENTATION_LOG.md")
    ]
    
    # Load and log each file
    for name, path in critical_files:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    content = f.read()
                
                # Log loading the file (not the content, just metadata)
                await session_logger.log_system_action("LOAD_CRITICAL_FILE", {
                    "file": name,
                    "path": path,
                    "size": len(content),
                    "exists": True
                })
            except Exception as e:
                await session_logger.log_system_action("ERROR_LOADING_FILE", {
                    "file": name,
                    "path": path,
                    "error": str(e)
                })
        else:
            await session_logger.log_system_action("CRITICAL_FILE_MISSING", {
                "file": name,
                "path": path,
                "exists": False
            })

def _setup_compaction_handler(session_logger: CLISessionLogger) -> None:
    """
    Set up the compaction handler for Claude or other LLM systems.
    
    Args:
        session_logger: The active session logger
    """
    # Try to set up compaction handler in different ways
    
    # Method 1: Using claude global variable
    try:
        if "claude" in globals() and hasattr(globals()["claude"], "onCompaction"):
            globals()["claude"].onCompaction(
                lambda reason: _handle_compaction_callback(session_logger, reason)
            )
            return
    except Exception:
        pass
    
    # Method 2: Using Claude package if available
    try:
        import claude
        if hasattr(claude, "onCompaction"):
            claude.onCompaction(
                lambda reason: _handle_compaction_callback(session_logger, reason)
            )
            return
    except ImportError:
        pass
    
    # Log that we couldn't set up a compaction handler
    session_logger._log_to_file(
        "WARNING", 
        "Could not set up compaction handler. Manual handling required."
    )

async def _handle_compaction_callback(session_logger: CLISessionLogger, reason: str) -> CLISessionLogger:
    """
    Handle compaction event from Claude or other LLM systems.
    
    This is designed to be called as a callback from Claude's onCompaction.
    
    Args:
        session_logger: The active session logger
        reason: Reason for compaction
        
    Returns:
        New session logger instance
    """
    # Log start of compaction
    session_logger._log_to_file("COMPACTION", f"Compaction started: {reason}")
    
    # Handle compaction
    new_logger = await session_logger.handle_compaction(reason)
    
    if new_logger:
        # Update global registry
        _SESSION_MANAGERS[new_logger.session_id] = new_logger
        
        # Remove old session from registry if it was registered
        if session_logger.session_id in _SESSION_MANAGERS:
            del _SESSION_MANAGERS[session_logger.session_id]
        
        # Log completion
        new_logger._log_to_file("COMPACTION", "Compaction completed successfully")
        
        return new_logger
    else:
        # Log failure
        session_logger._log_to_file("ERROR", "Compaction failed, continuing with original session")
        return session_logger

async def handle_compaction(
    session_logger: CLISessionLogger,
    reason: str = "MANUAL_COMPACTION"
) -> CLISessionLogger:
    """
    Manually handle compaction for a CLI session.
    
    This can be called directly when automatic compaction detection
    is not available or when manual compaction is desired.
    
    Args:
        session_logger: The active session logger
        reason: Reason for compaction
        
    Returns:
        New session logger instance
    """
    return await _handle_compaction_callback(session_logger, reason)

async def close_session(session_logger: CLISessionLogger) -> None:
    """
    Properly close a CLI session.
    
    Args:
        session_logger: The session logger to close
    """
    # Close the session
    await session_logger.close_session()
    
    # Remove from global registry
    if session_logger.session_id in _SESSION_MANAGERS:
        del _SESSION_MANAGERS[session_logger.session_id]

def get_active_sessions() -> List[str]:
    """
    Get a list of all active session IDs.
    
    Returns:
        List of active session IDs
    """
    return list(_SESSION_MANAGERS.keys())