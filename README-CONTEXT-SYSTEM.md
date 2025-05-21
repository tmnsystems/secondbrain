# SecondBrain Context Preservation System

## Overview

The Context Preservation System is a critical component of the SecondBrain platform that ensures comprehensive preservation of rich context throughout the system. It follows the fundamental principle of **NEVER truncating or simplifying context**.

This system allows the SecondBrain platform to maintain the full richness, interconnectedness, and nuanced nature of Tina's teaching methodology across all agents and interfaces.

## Core Principles

1. **NEVER truncate or simplify** - All content is preserved in its full form
2. **Full surrounding context** - Minimum ±5 paragraphs, extended for complete units
3. **Complete emotional context** - Preservation of emphasis, tone, pauses
4. **Chronological integrity** - Preservation of sequence and timestamps
5. **Associative connections** - Cross-references between related contexts
6. **Source identification** - Complete tracking of origins and participants

## System Architecture

The system uses a three-layer persistence architecture:

1. **Redis Layer** (Short-term) - High-speed access to active contexts
2. **PostgreSQL Layer** (Medium-term) - Comprehensive structured storage
3. **Pinecone Layer** (Long-term) - Semantic vector search capabilities

This layered approach provides both performance and comprehensive preservation.

## Components

### 1. Infrastructure Setup

The `setup-context-persistence.py` script configures the necessary infrastructure:

```bash
# Set up the complete infrastructure
python setup-context-persistence.py

# Test the infrastructure connections
python setup-context-persistence.py --test
```

### 2. Core Context System

The `context_persistence_system.py` module provides the core functionality:

```python
# Import the core system
from context_persistence_system import extract_with_full_context, retrieve_context_by_id

# Extract context from a text file
with open("transcript.txt", "r") as f:
    text = f.read()
    context_id = extract_with_full_context(text, ["important concept"])

# Retrieve the extracted context
context = retrieve_context_by_id(context_id)
print(context["full_context"])  # Never truncated
```

### 3. Agent Integration

The `agent_context_integration.py` module enables all SecondBrain agents to access the context system:

```python
# Import the agent integration
from agent_context_integration import create_agent_with_context, SessionContext

# Create an agent with context capabilities
agent = create_agent_with_context("planner")

# Get relevant context for a query
contexts = agent.get_context_for_query("business systems optimization")

# Format the context for a language model prompt
prompt = agent.format_contexts_as_prompt()
```

### 4. Notion Dashboard

The `notion_context_dashboard.py` module provides a rich human-readable view of all contexts:

```bash
# Set up the Notion dashboard
python notion_context_dashboard.py --setup

# Test with a sample context
python notion_context_dashboard.py --test
```

### 5. Verification Tests

The `context_verification_tests.py` module ensures the system meets all preservation requirements:

```bash
# Run all tests
python context_verification_tests.py

# Run specific test categories
python context_verification_tests.py context
python context_verification_tests.py end_to_end
```

## Usage Guide

### For Developers

1. Ensure you have the necessary environment variables set up in `secondbrain_api_keys.env`
2. Run the infrastructure setup script
3. Import the appropriate modules for your use case
4. Use the agent integration for most scenarios

Example integration with LangGraph:

```python
from agent_context_integration import create_langgraph_agent_state, get_context_for_langgraph_agent

# Create initial agent state
state = create_langgraph_agent_state("planner", session_id)

# Retrieve context based on a query
state = get_context_for_langgraph_agent(state, "business systems optimization")
```

### For Agents

Agents can access the context system through a clean API:

```python
# Get context for a query
contexts = agent.get_context_for_query("financial systems")

# Format contexts for different LLM interfaces
prompt = agent.format_contexts_as_prompt()  # For text completions
messages = agent.format_contexts_as_messages()  # For chat models
```

## Configuring Model Access

The system is configured to use the following models:

- **OpenAI** - For embeddings generation (text-embedding-ada-002)
- **Redis Cloud** - For short-term caching
- **Pinecone** - For vector storage and semantic search
- **Notion** - For human-readable context visibility

API keys for these services should be stored in `secondbrain_api_keys.env`.

## Maintenance and Monitoring

The system logs all context operations to ensure traceability and debugging:

- Redis caching operations are logged
- Pinecone vector operations are logged
- PostgreSQL database operations are logged
- Notion dashboard updates are logged

Monitoring tools will be added in a future update.

## Extending the System

To extend the context system with new capabilities:

1. Update the relevant module (e.g., `context_persistence_system.py` for core functionality)
2. Add tests in `context_verification_tests.py`
3. Update the agent integration if necessary
4. Ensure all changes adhere to the fundamental principle of NEVER truncating or simplifying

## Troubleshooting

If you encounter issues:

1. Check your API credentials in the environment variables
2. Verify Redis, PostgreSQL, and Pinecone connections
3. Run the verification tests to identify specific issues
4. Check the logs for error messages

## Important Notes

- NEVER modify the system to truncate or simplify context
- Always ensure proper preservation of emotional markers
- Maintain minimum ±5 paragraphs of surrounding context
- Preserve complete story/teaching units
- Always track source information comprehensively

---

For more details, see:
- CONTEXT_PERSISTENCE_IMPLEMENTATION_PLAN.md - Full implementation plan
- CONTEXT_SYSTEM.md - System overview and principles
- PRESERVATION_REQUIREMENTS.md - Detailed preservation requirements