"""
Environment configuration loading module for the SecondBrain Slack-Notion integration.
"""

import os
import dotenv
from typing import Dict, Optional

def load_env() -> Dict[str, str]:
    """
    Load environment variables from .env file or environment.
    
    Returns:
        Dict of environment variables.
    """
    # Load from .env file if it exists
    dotenv.load_dotenv("/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env")
    
    # Required environment variables
    required_vars = [
        "SLACK_SIGNING_SECRET",
        "SLACK_APP_TOKEN",
        "SLACK_BOT_TOKEN",
        "NOTION_API_KEY",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY"
    ]
    
    # Optional environment variables with defaults
    optional_vars = {
        # Redis
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "REDIS_PASSWORD": None,
        "REDIS_USERNAME": None,
        "REDIS_DB": "0",
        "REDIS_URL": None,
        
        # PostgreSQL
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_USER": "postgres",
        "POSTGRES_PASSWORD": None,
        "POSTGRES_DB": "secondbrain",
        "DATABASE_URL": None,
        
        # Pinecone
        "PINECONE_API_KEY": None,
        "PINECONE_ENVIRONMENT": None,
        "PINECONE_INDEX": None
    }
    
    # Validate and collect all environment variables
    env_vars = {}
    missing_vars = []
    
    # Check required vars
    for var in required_vars:
        value = os.getenv(var)
        if value is None:
            missing_vars.append(var)
        else:
            env_vars[var] = value
    
    # Check optional vars and apply defaults if needed
    for var, default in optional_vars.items():
        value = os.getenv(var)
        if value is None:
            if default is not None:
                env_vars[var] = default
        else:
            env_vars[var] = value
    
    if missing_vars:
        raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    return env_vars

def get_env_var(name: str) -> Optional[str]:
    """
    Get a specific environment variable.
    
    Args:
        name: Name of the environment variable.
        
    Returns:
        Value of the environment variable or None if not found.
    """
    return os.getenv(name)

def get_redis_config() -> Dict[str, str]:
    """
    Get Redis configuration from environment variables.
    
    Returns:
        Dict with Redis configuration
    """
    redis_url = os.getenv("REDIS_URL")
    
    if redis_url:
        return {"url": redis_url}
    
    return {
        "host": os.getenv("REDIS_HOST", "localhost"),
        "port": int(os.getenv("REDIS_PORT", "6379")),
        "password": os.getenv("REDIS_PASSWORD"),
        "username": os.getenv("REDIS_USERNAME"),
        "db": int(os.getenv("REDIS_DB", "0"))
    }

def get_postgres_config() -> Dict[str, str]:
    """
    Get PostgreSQL configuration from environment variables.
    
    Returns:
        Dict with PostgreSQL configuration
    """
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        return {"url": database_url}
    
    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
        "user": os.getenv("POSTGRES_USER", "postgres"),
        "password": os.getenv("POSTGRES_PASSWORD", ""),
        "database": os.getenv("POSTGRES_DB", "secondbrain")
    }

def get_pinecone_config() -> Dict[str, str]:
    """
    Get Pinecone configuration from environment variables.
    
    Returns:
        Dict with Pinecone configuration
    """
    return {
        "api_key": os.getenv("PINECONE_API_KEY"),
        "environment": os.getenv("PINECONE_ENVIRONMENT"),
        "index": os.getenv("PINECONE_INDEX")
    }