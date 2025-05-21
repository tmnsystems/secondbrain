#!/usr/bin/env python3
"""
SecondBrain Agent Context Integration Module

This module provides the interface between SecondBrain agents and the context persistence system.
It allows agents to:
1. Retrieve relevant context for any query
2. Update the context system with new extractions
3. Maintain context across multi-agent interactions
4. Preserve context between sessions

FUNDAMENTAL PRINCIPLE: NEVER TRUNCATE OR SIMPLIFY CONTEXT
"""

import os
import json
import uuid
import datetime
from typing import List, Dict, Any, Optional, Tuple, Union
from dotenv import load_dotenv

# Import the core context system
from context_persistence_system import (
    load_env,
    get_redis_client,
    get_pinecone_index,
    get_notion_headers,
    extract_with_full_context,
    retrieve_context_by_id,
    search_contexts_semantic,
    provide_agent_context,
    create_context_bridge
)

# Agent Type Definitions
AGENT_TYPES = {
    "planner": "PlannerAgent",
    "executor": "ExecutorAgent",
    "reviewer": "ReviewerAgent",
    "refactor": "RefactorAgent",
    "build": "BuildAgent",
    "orchestrator": "OrchestratorAgent",
    "notion": "NotionAgent"
}

class AgentContext:
    """
    Agent Context Manager
    
    Provides a clean interface for agents to interact with the context system.
    """
    
    def __init__(self, agent_id: str, agent_type: str, session_id: Optional[str] = None):
        """
        Initialize the agent context manager.
        
        Args:
            agent_id: Unique identifier for this agent instance
            agent_type: Type of agent (planner, executor, etc.)
            session_id: Current session ID if available
        """
        # Load environment variables
        load_env()
        
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.session_id = session_id
        self.redis = get_redis_client()
        
        # Initialize context state
        self.contexts = []
        self.load_context_state()
    
    def load_context_state(self) -> None:
        """Load any existing context state for this agent."""
        try:
            context_json = self.redis.hget(f"agent:{self.agent_id}:state", "contexts")
            if context_json:
                self.contexts = json.loads(context_json)
        except Exception as e:
            print(f"Error loading context state: {e}")
    
    def save_context_state(self) -> None:
        """Save the current context state for this agent."""
        try:
            self.redis.hset(
                f"agent:{self.agent_id}:state",
                "contexts",
                json.dumps(self.contexts)
            )
        except Exception as e:
            print(f"Error saving context state: {e}")
    
    def get_context_for_query(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Get relevant context for a query.
        
        Args:
            query: The query to find context for
            limit: Maximum number of contexts to return
            
        Returns:
            List of context objects relevant to the query
        """
        # Use the core context system to find relevant contexts
        formatted_contexts = provide_agent_context(
            self.agent_id,
            query,
            self.session_id
        )
        
        # Update our local state
        self.contexts = formatted_contexts
        self.save_context_state()
        
        return formatted_contexts
    
    def extract_and_store_context(self, text: str, pattern_indicators: List[str]) -> Optional[str]:
        """
        Extract and store new context from text.
        
        Args:
            text: The text to extract context from
            pattern_indicators: List of patterns to look for
            
        Returns:
            Context ID if extraction successful, None otherwise
        """
        context_id = extract_with_full_context(text, pattern_indicators)
        
        if context_id:
            # Add a reference to this context in the agent's state
            context = retrieve_context_by_id(context_id)
            if context:
                formatted_context = {
                    "id": context["id"],
                    "type": context["pattern_type"],
                    "content": context["full_context"],  # Never truncated
                    "source": f"{context['source'].get('session_type', 'unknown')} - {context['source'].get('file', 'unknown')}",
                    "speakers": [s["name"] for s in context.get("speakers", [])],
                    "tags": context.get("domain_tags", [])
                }
                
                self.contexts.append(formatted_context)
                self.save_context_state()
        
        return context_id
    
    def get_context_by_id(self, context_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific context by ID.
        
        Args:
            context_id: The ID of the context to retrieve
            
        Returns:
            Context object if found, None otherwise
        """
        return retrieve_context_by_id(context_id)
    
    def search_contexts(self, query: str, limit: int = 5, filter_tags: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Search for contexts semantically.
        
        Args:
            query: The search query
            limit: Maximum number of results
            filter_tags: Optional list of tags to filter by
            
        Returns:
            List of matching context objects
        """
        return search_contexts_semantic(query, limit, filter_tags)
    
    def create_session_bridge(self, from_session_id: str, to_session_id: str) -> Optional[Dict[str, Any]]:
        """
        Create a bridge between two sessions for context continuity.
        
        Args:
            from_session_id: Source session ID
            to_session_id: Target session ID
            
        Returns:
            Bridge information if successful, None otherwise
        """
        return create_context_bridge(from_session_id, to_session_id)
    
    def format_contexts_as_prompt(self, contexts: Optional[List[Dict[str, Any]]] = None) -> str:
        """
        Format contexts as a prompt string for a language model.
        
        Args:
            contexts: List of contexts to format, or current contexts if None
            
        Returns:
            Formatted prompt string with all contexts
        """
        contexts_to_format = contexts if contexts is not None else self.contexts
        
        if not contexts_to_format:
            return ""
        
        prompt_parts = ["# Relevant Context\n\n"]
        
        for i, context in enumerate(contexts_to_format):
            prompt_parts.append(f"## Context {i+1}: {context.get('type', 'Unknown').title()}\n\n")
            prompt_parts.append(f"{context.get('content', '')}\n\n")
            
            # Add source information if available
            if "source" in context:
                prompt_parts.append(f"Source: {context.get('source', 'Unknown')}\n\n")
            
            # Add speaker information if available
            if "speakers" in context and context["speakers"]:
                prompt_parts.append(f"Speakers: {', '.join(context['speakers'])}\n\n")
            
            # Add tags if available
            if "tags" in context and context["tags"]:
                prompt_parts.append(f"Tags: {', '.join(context['tags'])}\n\n")
        
        return "".join(prompt_parts)
    
    def format_contexts_as_messages(self, contexts: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, str]]:
        """
        Format contexts as a list of messages for a chat model.
        
        Args:
            contexts: List of contexts to format, or current contexts if None
            
        Returns:
            List of message objects with contexts as system messages
        """
        contexts_to_format = contexts if contexts is not None else self.contexts
        
        if not contexts_to_format:
            return []
        
        messages = []
        
        for context in contexts_to_format:
            content = f"# {context.get('type', 'Unknown').title()} Context\n\n{context.get('content', '')}"
            
            # Add source information if available
            if "source" in context:
                content += f"\n\nSource: {context.get('source', 'Unknown')}"
            
            # Add speaker information if available
            if "speakers" in context and context["speakers"]:
                content += f"\n\nSpeakers: {', '.join(context['speakers'])}"
            
            # Add tags if available
            if "tags" in context and context["tags"]:
                content += f"\n\nTags: {', '.join(context['tags'])}"
            
            messages.append({
                "role": "system",
                "content": content
            })
        
        return messages

# Agent Factory for creating appropriately configured agents
def create_agent_with_context(agent_type: str, session_id: Optional[str] = None) -> AgentContext:
    """
    Create an agent with context management.
    
    Args:
        agent_type: Type of agent to create
        session_id: Current session ID if available
        
    Returns:
        Configured AgentContext instance
    """
    if agent_type not in AGENT_TYPES:
        raise ValueError(f"Unknown agent type: {agent_type}")
    
    # Generate a unique ID for this agent instance
    agent_id = str(uuid.uuid4())
    
    # Create and return the agent context manager
    return AgentContext(agent_id, AGENT_TYPES[agent_type], session_id)

# Shared session context for multi-agent systems
class SessionContext:
    """
    Session Context Manager
    
    Manages the shared context for a multi-agent session.
    """
    
    def __init__(self, session_id: Optional[str] = None):
        """
        Initialize the session context manager.
        
        Args:
            session_id: Existing session ID or None to create a new one
        """
        # Load environment variables
        load_env()
        
        self.session_id = session_id or str(uuid.uuid4())
        self.redis = get_redis_client()
        self.agents = {}
        
        # Initialize session in Redis if it's new
        if not session_id:
            self.redis.hset(
                f"session:{self.session_id}:metadata",
                mapping={
                    "created_at": datetime.datetime.now().isoformat(),
                    "last_active": datetime.datetime.now().isoformat(),
                    "agents": json.dumps([])
                }
            )
    
    def add_agent(self, agent_type: str) -> AgentContext:
        """
        Add an agent to this session.
        
        Args:
            agent_type: Type of agent to add
            
        Returns:
            The created agent context manager
        """
        agent = create_agent_with_context(agent_type, self.session_id)
        
        # Register agent with the session
        self.agents[agent.agent_id] = agent
        
        # Update session metadata
        agents_json = self.redis.hget(f"session:{self.session_id}:metadata", "agents")
        agents_list = json.loads(agents_json) if agents_json else []
        agents_list.append({
            "id": agent.agent_id,
            "type": agent.agent_type,
            "added_at": datetime.datetime.now().isoformat()
        })
        
        self.redis.hset(
            f"session:{self.session_id}:metadata",
            "agents",
            json.dumps(agents_list)
        )
        
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[AgentContext]:
        """
        Get an agent by ID.
        
        Args:
            agent_id: ID of the agent to retrieve
            
        Returns:
            The agent context manager if found, None otherwise
        """
        return self.agents.get(agent_id)
    
    def get_agents_by_type(self, agent_type: str) -> List[AgentContext]:
        """
        Get all agents of a specific type.
        
        Args:
            agent_type: Type of agents to retrieve
            
        Returns:
            List of matching agent context managers
        """
        return [agent for agent in self.agents.values() if agent.agent_type == AGENT_TYPES.get(agent_type)]
    
    def update_last_active(self) -> None:
        """Update the last active timestamp for this session."""
        self.redis.hset(
            f"session:{self.session_id}:metadata",
            "last_active",
            datetime.datetime.now().isoformat()
        )
    
    def end_session(self) -> None:
        """End the session and mark it as completed."""
        self.redis.hset(
            f"session:{self.session_id}:metadata",
            "ended_at",
            datetime.datetime.now().isoformat()
        )
    
    def create_bridge_to(self, new_session_id: str) -> Optional[Dict[str, Any]]:
        """
        Create a bridge to a new session for context continuity.
        
        Args:
            new_session_id: ID of the new session
            
        Returns:
            Bridge information if successful, None otherwise
        """
        return create_context_bridge(self.session_id, new_session_id)
    
    @classmethod
    def resume_session(cls, session_id: str) -> 'SessionContext':
        """
        Resume an existing session.
        
        Args:
            session_id: ID of the session to resume
            
        Returns:
            The resumed session context manager
        """
        session = cls(session_id)
        
        # Update last active timestamp
        session.update_last_active()
        
        return session

# Context-enhanced LangGraph agent integration
def create_langgraph_agent_state(agent_type: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Create initial state for a LangGraph agent with context support.
    
    Args:
        agent_type: Type of agent to create
        session_id: Current session ID if available
        
    Returns:
        Initial state dict for the agent
    """
    agent = create_agent_with_context(agent_type, session_id)
    
    return {
        "agent_id": agent.agent_id,
        "agent_type": agent.agent_type,
        "session_id": agent.session_id,
        "contexts": agent.contexts,
        "created_at": datetime.datetime.now().isoformat(),
        "last_active": datetime.datetime.now().isoformat()
    }

def get_context_for_langgraph_agent(state: Dict[str, Any], query: str, limit: int = 3) -> Dict[str, Any]:
    """
    Get context for a LangGraph agent and update its state.
    
    Args:
        state: Current agent state
        query: The query to find context for
        limit: Maximum number of contexts to return
        
    Returns:
        Updated agent state with new contexts
    """
    agent = AgentContext(
        state["agent_id"],
        state["agent_type"],
        state.get("session_id")
    )
    
    contexts = agent.get_context_for_query(query, limit)
    
    # Update state
    return {
        **state,
        "contexts": contexts,
        "last_active": datetime.datetime.now().isoformat()
    }

def format_contexts_for_llm(state: Dict[str, Any], format_type: str = "prompt") -> Dict[str, Any]:
    """
    Format contexts for a language model and update agent state.
    
    Args:
        state: Current agent state
        format_type: "prompt" for text prompt or "messages" for chat format
        
    Returns:
        Updated agent state with formatted contexts
    """
    agent = AgentContext(
        state["agent_id"],
        state["agent_type"],
        state.get("session_id")
    )
    
    # Set contexts from state
    agent.contexts = state.get("contexts", [])
    
    if format_type == "prompt":
        formatted_contexts = agent.format_contexts_as_prompt()
        state["context_prompt"] = formatted_contexts
    else:  # messages format
        formatted_contexts = agent.format_contexts_as_messages()
        state["context_messages"] = formatted_contexts
    
    return state

# Main execution if run directly
if __name__ == "__main__":
    import sys
    
    print("SecondBrain Agent Context Integration Module")
    print("This module is meant to be imported, not run directly.")
    print("For examples, run with --examples flag.")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--examples":
        print("\nExample usage:")
        print("\n# Create an agent with context")
        print("agent = create_agent_with_context('planner')")
        print("contexts = agent.get_context_for_query('business systems optimization')")
        print("formatted_prompt = agent.format_contexts_as_prompt()")
        
        print("\n# Create a multi-agent session")
        print("session = SessionContext()")
        print("planner = session.add_agent('planner')")
        print("executor = session.add_agent('executor')")
        print("reviewer = session.add_agent('reviewer')")
        
        print("\n# LangGraph integration")
        print("from langgraph.graph import StateGraph")
        print("state = create_langgraph_agent_state('planner')")
        print("state = get_context_for_langgraph_agent(state, 'optimize business workflows')")
        print("state = format_contexts_for_llm(state, 'messages')")
        print("# Use state['context_messages'] in your LangGraph chain")