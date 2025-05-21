# SecondBrain Slack+Notion Integration

A multi-agent system that interfaces cleanly with Slack and Notion, ensuring transparency, control, and strict alignment with the SecondBrain architecture. This integration now features real-time context logging to prevent context loss during CLI sessions, Slack conversations, or system operations.

## Overview

This integration implements an AI agent system where:

- Slack is the *accountability interface* where each agent acts like a team member, showing their work in threads
- Notion is the *permanent structured memory* and human-readable log
- ALL interactions are logged to Notion IN REAL-TIME (not after) to prevent context loss
- Agents follow the multi-agent assignment, execution, and reviewer loop:
  - **Planner**: Uses Claude 3.7 Sonnet/Opus for strategic planning
  - **Executor**: Uses GPT-4.1 Mini (1M context) for implementation
  - **Reviewer**: Uses OpenAI o3 for cost-effective review
  - **Notion**: Uses GPT-4.1 Mini for structured data management

## Core Features

- **Real-Time Context Logging**: All interactions are logged to Notion as they happen, not after.
- **Three-Layer Persistence**: Redis (short-term), PostgreSQL (medium-term), and Pinecone (long-term) storage.
- **Session Bridging**: Explicit linking between related CLI sessions and Slack conversations.
- **Compaction Handling**: Preserve context during auto-compaction events.
- **Context Restoration**: Load previous context at session start.
- **Separate Slack bot identity** for each agent
- **Complete transparency** in agent operations via Slack threads
- **"NEVER TRUNCATE" principle** ensures full context preservation
- **LangGraph-powered** agent workflows with real-time logging

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SecondBrain System                              │
├─────────────┬─────────────────────────────────────────┬─────────────────┤
│  Slack Layer│        LangGraph + Archon Layer         │  Notion Layer   │
├─────────────┤                                         ├─────────────────┤
│ ┌─────────┐ │ ┌─────────────────────────────────────┐ │ ┌─────────┐     │
│ │Planner  │ │ │            Orchestrator             │ │ │Document │     │
│ │Agent Bot│◄┼─┤  ┌─────────┐ ┌─────────┐ ┌─────────┐│◄┼─┤API      │     │
│ └────┬────┘ │ │  │LangGraph│ │Pydantic │ │Archon   ││ │ └─────────┘     │
│      │      │ │  │Workflow │ │Models   │ │Event Bus││ │ ┌─────────┐     │
│ ┌────┴────┐ │ │  └─────────┘ └─────────┘ └─────────┘│ │ │Database │     │
│ │Executor │ │ │                                     │ │ │API      │     │
│ │Agent Bot│◄┼─┤  ┌─────────┐    ┌─────────────────┐ │◄┼─┤         │     │
│ └────┬────┘ │ │  │Event    │    │Model Router     │ │ │ └─────────┘     │
│      │      │ │  │Queue    │    │o3/GPT-4.1/Claude│ │ │ ┌─────────┐     │
│ ┌────┴────┐ │ │  └─────────┘    └─────────────────┘ │ │ │CLI      │     │
│ │Reviewer │ │ │                                     │ │ │Session   │     │
│ │Agent Bot│◄┼─┤  ┌─────────────────────────────────┐│◄┼─┤Logger    │     │
│ └────┬────┘ │ │  │       Context Persistence       ││ │ └─────────┘     │
│      │      │ │  │ ┌─────┐   ┌──────┐   ┌────────┐ ││ │ ┌─────────┐     │
│ ┌────┴────┐ │ │  │ │Redis│   │Postgres│ │Pinecone│ ││ │ │Context  │     │
│ │Notion   │ │ │  │ │(24h)│   │(1yr)  │ │(∞)     │ ││◄┼─┤Manager   │     │
│ │Agent Bot│◄┼─┤  │ └─────┘   └──────┘   └────────┘ ││ │ └─────────┘     │
│ └─────────┘ │ │  └─────────────────────────────────┘│ │                 │
└─────────────┴─────────────────────────────────────────┴─────────────────┘
```

## Three-Layer Persistence

The system uses a three-layer persistence architecture:

1. **Redis (Short-term)**
   - High-speed access to active contexts
   - 100MB cache size (paid tier)
   - LRU eviction policy
   - TTL: 24 hours for context objects

2. **PostgreSQL (Medium-term)**
   - Comprehensive structured storage
   - Complete relationship tracking
   - Full text preservation
   - Enhanced schema with specialized tables

3. **Pinecone (Long-term)**
   - Semantic vector search capabilities
   - Complete metadata preservation
   - Chunk management for long contexts
   - Dimensions: 1536 (OpenAI) or 768 (smaller models)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/secondbrain-slack-notion.git
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your API keys:
   ```
   # Slack API Tokens
   SLACK_APP_TOKEN="xapp-..."
   SLACK_BOT_TOKEN="xoxb-..."
   SLACK_PLANNER_BOT_TOKEN="xoxb-..."
   SLACK_EXECUTOR_BOT_TOKEN="xoxb-..."
   SLACK_REVIEWER_BOT_TOKEN="xoxb-..."
   SLACK_NOTION_BOT_TOKEN="xoxb-..."
   
   # Notion API
   NOTION_API_KEY="secret_..."
   NOTION_CLI_SESSIONS_DB="..."
   NOTION_SLACK_CONVERSATIONS_DB="..."
   NOTION_TASK_TRACKING_DB="..."
   
   # Redis (for short-term storage)
   REDIS_URL="redis://..."
   
   # PostgreSQL (for medium-term storage)
   POSTGRES_URL="postgresql://..."
   
   # Pinecone (for long-term storage)
   PINECONE_API_KEY="..."
   PINECONE_ENVIRONMENT="..."
   PINECONE_INDEX="..."
   
   # AI API Keys
   ANTHROPIC_API_KEY="sk-ant-..."
   OPENAI_API_KEY="sk-..."
   ```

## Usage

### Setup Notion Databases

```bash
python setup_notion_databases.py
```

### CLI Context Logging

```bash
# Initialize a new CLI session
python cli_bridge.py init

# Log a user message
python cli_bridge.py log-user "User message here"

# Log a system action
python cli_bridge.py log-system "ACTION_TYPE" "key1=value1" "key2=value2"

# Log an assistant response
python cli_bridge.py log-assistant "Assistant response here"

# Handle compaction
python cli_bridge.py handle-compaction --reason "CONTEXT_LIMIT_REACHED"

# Close the current session
python cli_bridge.py close
```

### Start the Slack Apps

#### Enhanced Slack App

```bash
python start_enhanced_slack_app.py
```

#### Multi-Agent System

```bash
python start_multi_agent_system.py
```

#### Start a Specific Agent

```bash
python start_enhanced_slack_app.py --agent planner
```

### Integration with Claude CLI

Add this to your initialization script:

```bash
# Initialize CLI session when starting Claude
SESSION_ID=$(python cli_bridge.py init | grep "Initialized new CLI session" | awk '{print $5}')
echo "Using CLI session: $SESSION_ID"

# Set up compaction handler
claude_on_compaction() {
  echo "Handling compaction event..."
  python cli_bridge.py handle-compaction --reason "$1"
  echo "Compaction handled."
}

# Export handler for Claude to use
export -f claude_on_compaction
```

## Directory Structure

```
slack_notion_integration/
├── README.md                           # This file
├── CLAUDE.md                           # Integration-specific Claude context
├── IMPLEMENTATION_ROADMAP.md           # Step-by-step implementation plan
├── IMPLEMENTATION_SUMMARY.md           # Summary of implemented features
├── requirements.txt                    # Python dependencies
├── context_manager.py                  # Three-layer context persistence
├── cli_bridge.py                       # CLI interface for context operations
├── start_enhanced_slack_app.py         # Script to start the enhanced Slack app
├── start_multi_agent_system.py         # Script to start the multi-agent system
├── test_cli_context_persistence.py     # Test CLI context persistence
├── test_enhanced_slack_integration.py  # Test Slack integration
├── test_multi_agent_system.py          # Test multi-agent architecture
├── setup_notion_databases.py           # Setup Notion databases
├── src/
│   ├── config/
│   │   ├── env.py                      # Environment configuration
│   │   └── notion_db_ids.json          # Notion database IDs
│   ├── models/
│   │   └── schema.py                   # Pydantic models
│   ├── cli/
│   │   ├── cli_session_logger.py       # Core real-time logging to Notion
│   │   └── session_manager.py          # Session management API
│   ├── notion/
│   │   └── notion_integration.py       # Notion API client
│   ├── slack/
│   │   ├── app.py                      # Base Slack app 
│   │   ├── enhanced_app.py             # Enhanced Slack app with logging
│   │   └── multi_agent.py              # Multi-agent system implementation
│   ├── langgraph/
│   │   ├── flows.py                    # Base LangGraph workflows
│   │   └── enhanced_flows.py           # LangGraph with real-time logging
│   └── utils/
│       ├── logger.py                   # Logging utilities
│       └── api_helpers.py              # API helpers for external services
└── logs/                               # Log files
```

## Agent Workflow with Real-Time Context Logging

1. Tina sends a request to any agent in Slack
2. The agent immediately logs the request to Notion in real-time
3. The agent acknowledges the request and creates a thread
4. All subsequent steps are logged to Notion AS THEY HAPPEN
5. If sent to PlannerAgent, it:
   - Analyzes the request and breaks it down into tasks
   - Shows its reasoning steps in the thread and logs to Notion in real-time
   - Creates a plan with tasks assigned to appropriate agents
   - Logs everything to Notion
   - Waits for approval via a reaction

6. Once approved, tasks are sent to the appropriate agents
7. ExecutorAgent:
   - Logs the task receipt to Notion in real-time
   - Implements the solution
   - Shows reasoning steps in the thread and logs to Notion in real-time
   - Logs progress to Notion
   - Requests review when done

8. ReviewerAgent:
   - Logs the review request to Notion in real-time
   - Reviews the implementation
   - Shows reasoning steps in the thread and logs to Notion in real-time
   - Logs feedback to Notion
   - Approves or requests changes

9. NotionAgent:
   - Creates final documentation for the project
   - Ensures all logs are properly structured
   - Creates session bridges for continuity
   - Creates summary reports

Every action is visible in Slack, logged to Notion IN REAL-TIME (not after), and preserved across all three persistence layers.

## Notion Structure

The system creates and maintains the following in Notion:

1. **CLI Sessions Database**
   - Each session has its own page
   - Sessions are linked together with bidirectional bridges
   - Status is tracked (Active, Compacted, or Completed)
   - All interactions are logged chronologically

2. **Slack Conversations Database**
   - Tracks all Slack conversations
   - Links to related CLI sessions
   - Maintains agent identity and thread context
   - Preserves multi-agent interactions

3. **Task Tracking Database**
   - Manages agent tasks and workflows
   - Tracks completion status and timestamps
   - Links to relevant sessions and conversations
   - Provides audit trail for reviewer verification

4. **Session Page Content**
   - User messages (👤 USER)
   - System actions (⚙️ SYSTEM)
   - Assistant responses (🤖 ASSISTANT)
   - Tool calls (🔧 TOOL)
   - Compaction events (🔄 COMPACTION)
   - Session bridges (⛓️ CONTINUED FROM/IN)
   - Slack messages (💬 SLACK)
   - Agent transitions (🔄 AGENT)

## Requirements

- Python 3.9+
- Slack workspace with admin access
- Notion workspace with admin access
- API keys for OpenAI, Anthropic, Slack, and Notion
- Redis instance (for short-term storage)
- PostgreSQL database (for medium-term storage)
- Pinecone account (for long-term storage)

## Development Guidelines

### Context Preservation (NEVER TRUNCATE)

- NEVER truncate or simplify context
- Always preserve full surrounding context (±5 paragraphs minimum)
- Maintain speaker identification and emotional markers
- Preserve chronological integrity of content

### Real-Time Logging

- Log all interactions AS THEY HAPPEN, not after
- Use transactional logging for critical operations
- Implement background logging for non-critical operations
- Ensure fault tolerance with backup logging

### Security

- Store API keys in environment variables
- Never log sensitive information
- Use minimal permissions for Notion operations
- Implement secure storage for context data

## License

MIT