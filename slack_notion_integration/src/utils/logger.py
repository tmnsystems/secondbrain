"""
Logging utilities for the SecondBrain Slack-Notion integration.
"""

import os
import logging
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class SecondBrainLogger:
    """Logger for the SecondBrain integration with file and console output."""
    
    def __init__(self, log_dir: str = "logs", log_level: int = logging.INFO):
        """
        Initialize the logger.
        
        Args:
            log_dir: Directory to store log files
            log_level: Logging level
        """
        self.log_dir = log_dir
        
        # Create log directory if it doesn't exist
        os.makedirs(log_dir, exist_ok=True)
        
        # Get the current date for log file naming
        current_date = datetime.now().strftime("%Y-%m-%d")
        self.log_file = os.path.join(log_dir, f"secondbrain_{current_date}.log")
        
        # Configure logger
        self.logger = logging.getLogger("secondbrain")
        self.logger.setLevel(log_level)
        
        # Add file handler
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(log_level)
        file_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
        
        # Add console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
    
    def log(self, level: int, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a message with optional context.
        
        Args:
            level: Logging level
            message: Message to log
            context: Optional context information
        """
        if context:
            message = f"{message} - Context: {json.dumps(context)}"
        
        self.logger.log(level, message)
    
    def debug(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a debug message.
        
        Args:
            message: Message to log
            context: Optional context information
        """
        self.log(logging.DEBUG, message, context)
    
    def info(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log an info message.
        
        Args:
            message: Message to log
            context: Optional context information
        """
        self.log(logging.INFO, message, context)
    
    def warning(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a warning message.
        
        Args:
            message: Message to log
            context: Optional context information
        """
        self.log(logging.WARNING, message, context)
    
    def error(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log an error message.
        
        Args:
            message: Message to log
            context: Optional context information
        """
        self.log(logging.ERROR, message, context)
    
    def critical(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a critical message.
        
        Args:
            message: Message to log
            context: Optional context information
        """
        self.log(logging.CRITICAL, message, context)
    
    def log_agent_action(self, agent: str, action: str, details: Any) -> None:
        """
        Log an agent action.
        
        Args:
            agent: Agent name
            action: Action performed
            details: Action details
        """
        context = {
            "agent": agent,
            "action": action,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if isinstance(details, dict):
            context.update(details)
        else:
            context["details"] = str(details)
        
        self.info(f"Agent {agent} performed {action}", context)

# Create a default logger instance
default_logger = SecondBrainLogger()

# Setup function for initializing the logger
def setup_logger(level: int = logging.INFO, log_file: Optional[str] = None) -> SecondBrainLogger:
    """
    Set up the logger.
    
    Args:
        level: Logging level
        log_file: Optional log file path
        
    Returns:
        Configured logger
    """
    global default_logger
    
    # Create the logs directory if it doesn't exist
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # If log_file is provided, use it, otherwise use the default
    if log_file:
        default_logger = SecondBrainLogger(log_dir=os.path.dirname(log_file), log_level=level)
    else:
        default_logger = SecondBrainLogger(log_level=level)
    
    return default_logger

# Function to get module-specific logger
def get_logger(name: str) -> logging.Logger:
    """
    Get a logger for a specific module.
    
    Args:
        name: Module name
        
    Returns:
        Logger for the module
    """
    logger = logging.getLogger(name)
    
    # If logger doesn't have handlers, add default handlers
    if not logger.handlers:
        # Use the same handlers as the default logger
        for handler in default_logger.logger.handlers:
            logger.addHandler(handler)
        
        # Set the level to the same as the default logger
        logger.setLevel(default_logger.logger.level)
    
    return logger

# Convenience functions for using the default logger
def debug(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log a debug message to the default logger."""
    default_logger.debug(message, context)

def info(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log an info message to the default logger."""
    default_logger.info(message, context)

def warning(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log a warning message to the default logger."""
    default_logger.warning(message, context)

def error(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log an error message to the default logger."""
    default_logger.error(message, context)

def critical(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log a critical message to the default logger."""
    default_logger.critical(message, context)

def log_agent_action(agent: str, action: str, details: Any) -> None:
    """Log an agent action to the default logger."""
    default_logger.log_agent_action(agent, action, details)