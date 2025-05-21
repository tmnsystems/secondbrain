# Agent Integration Component (BP-07)

The Agent Integration component provides a robust framework for coordinating multiple AI agents within the SecondBrain architecture. This component enables structured communication between specialized agents, ensures context preservation between agent interactions, and implements the Reviewer Agent protocol for quality assurance.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Components](#components)
- [Integration with SecondBrain](#integration-with-secondbrain)
- [Setup and Configuration](#setup-and-configuration)
- [Testing](#testing)
- [Usage Examples](#usage-examples)
- [Security Considerations](#security-considerations)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)

## Overview

The Agent Integration component is a critical part of the SecondBrain architecture that enables coordinated multi-agent workflows. It provides the infrastructure for agents to communicate effectively, maintain context across interactions, and ensure high-quality outcomes through structured review processes.

This component implements the BP-07 specification of the SecondBrain architecture blueprint, focusing on the integration and coordination of specialized AI agents.

## Architecture

The Agent Integration component follows a layered architecture:

1. **Core Layer**: Agent Manager, Message Bus, and Security Manager
2. **Protocol Layer**: Communication Protocol, Context Persistence, and Reviewer Protocol
3. **Integration Layer**: LangGraph Integration, Workflow Management
4. **Utility Layer**: Logging, Security, and Testing

The system is designed to be modular, allowing for easy extension and customization of agent behavior while maintaining a consistent communication and coordination framework.

![Agent Integration Architecture](docs/architecture_diagram.png)

## Key Features

- **Multi-Agent Communication**: Structured message passing between specialized agents
- **Context Persistence**: Preservation of context across agent transitions and CLI sessions
- **Workflow Management**: LangGraph-based workflows for coordinating complex multi-agent tasks
- **Reviewer Protocol**: Mandatory review process for quality assurance
- **Security**: Authentication, authorization, and secure message passing
- **Logging**: Comprehensive logging of agent communications and actions
- **Model Routing**: Intelligent routing of tasks to appropriate AI models

## Components

### Agent Manager

The Agent Manager (`agent_manager.py`) serves as the central coordination system for all agents. It handles agent registration, message routing, and state management. Key features include:

- Agent lifecycle management (initialization, execution, termination)
- Message routing between agents
- State tracking and synchronization
- Support for agent discovery and registration

### Communication Protocol

The Communication Protocol (`communication_protocol.py`) defines the standardized message format and exchange mechanisms for agent communication. It supports:

- Structured message format with metadata
- Synchronous and asynchronous communication patterns
- Message prioritization and routing
- Message history and tracing

### Agent Roles

The Agent Roles module (`agent_roles.py`) implements specialized agent roles with specific capabilities:

- **Planner Agent**: Strategic planning and task decomposition (using Claude Sonnet/Opus)
- **Executor Agent**: Implementation and execution (using GPT-4.1 Mini)
- **Reviewer Agent**: Quality assurance and verification (using o3)
- **Notion Agent**: Documentation and persistence
- **Orchestrator Agent**: Workflow coordination

### Reviewer Agent

The Reviewer Agent (`reviewer_agent.py`) implements the mandatory review process for all tasks within the SecondBrain system. It ensures:

- Pre-implementation review of plans
- Post-implementation verification
- Strategic alignment checks
- Documentation of all reviews in Notion

### Context Persistence

The Context Persistence system (`context_persistence.py`) ensures that context is properly preserved during agent handoffs, CLI session transitions, and system operations. It provides:

- Three-layer persistence architecture (Redis, PostgreSQL, Pinecone)
- Context bridging between sessions
- Session compaction handling
- Semantic search capabilities

### LangGraph Integration

The LangGraph Integration (`langgraph_integration.py`) enables the creation and execution of structured agent workflows using LangGraph. Features include:

- Workflow definition and state management
- Node implementation for different agent roles
- Workflow execution and monitoring
- State persistence and recovery

### Security

The Security system (`agent_security.py`) provides authentication, authorization, and message validation for the agent system. It includes:

- Agent credential management
- Access control policies
- Message signing and validation
- Secure wrappers for message bus and agent manager

### Communication Logger

The Communication Logger (`communication_logger.py`) captures and logs all communication between agents. Key features:

- Event-based logging architecture
- Multiple logging targets (file, JSON, context manager)
- Filtering and query capabilities
- Middleware for intercepting and logging events

## Integration with SecondBrain

The Agent Integration component integrates with other SecondBrain components:

- **Notion SSoT (BP-06)**: For documentation and persistence of agent activities
- **Context System (BP-03)**: For maintaining context across agent interactions
- **CLI Integration (BP-02)**: For seamless integration with the command-line interface

## Setup and Configuration

### Prerequisites

- Python 3.9+
- LangGraph
- Redis (optional, for short-term context storage)
- PostgreSQL (optional, for medium-term context storage)
- Pinecone (optional, for long-term context storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/secondbrain.git
cd secondbrain

# Install dependencies
pip install -r agent-integration/requirements.txt
```

### Configuration

Create a configuration file `agent_config.json` with the following structure:

```json
{
  "agent_manager": {
    "log_level": "INFO"
  },
  "communication": {
    "message_history_size": 1000,
    "default_timeout": 30
  },
  "security": {
    "enabled": true,
    "max_message_age": 300,
    "credentials_path": "credentials.json",
    "policies_path": "policies.json"
  },
  "context_persistence": {
    "redis": {
      "host": "localhost",
      "port": 6379,
      "db": 0
    },
    "postgres": {
      "host": "localhost",
      "port": 5432,
      "dbname": "secondbrain",
      "user": "postgres",
      "password": ""
    },
    "pinecone": {
      "api_key": "your-api-key",
      "environment": "your-environment",
      "index_name": "secondbrain-context",
      "dimension": 1536
    }
  },
  "logging": {
    "log_dir": "logs",
    "log_to_file": true,
    "log_to_json": true
  },
  "agents": {
    "planner": {
      "model": "claude-3.7-sonnet",
      "max_tokens": 100000
    },
    "executor": {
      "model": "gpt-4.1-mini",
      "max_tokens": 50000
    },
    "reviewer": {
      "model": "o3",
      "max_tokens": 50000
    }
  }
}
```

## Testing

The Agent Integration component comes with comprehensive unit tests for all major components. These tests ensure that the system works correctly and can handle various edge cases.

### Running Tests

To run all tests:

```bash
cd agent-integration
python -m unittest discover tests
```

To run tests for a specific component:

```bash
python -m unittest tests/test_agent_manager.py
python -m unittest tests/test_communication_protocol.py
python -m unittest tests/test_reviewer_agent.py
python -m unittest tests/test_context_persistence.py
python -m unittest tests/test_langgraph_integration.py
python -m unittest tests/test_communication_logger.py
python -m unittest tests/test_agent_security.py
```

### Test Coverage

The test suite covers the following components:

1. **Agent Manager Tests** (`test_agent_manager.py`)
   - Agent creation and registration
   - Message routing and broadcasting
   - Agent state management
   - Error handling

2. **Communication Protocol Tests** (`test_communication_protocol.py`)
   - Message creation and validation
   - Message subscription and publication
   - Message history tracking
   - Asynchronous communication patterns

3. **Reviewer Agent Tests** (`test_reviewer_agent.py`)
   - Creating review requests
   - Processing reviews
   - Review feedback and approval
   - Review notification handling

4. **Context Persistence Tests** (`test_context_persistence.py`)
   - Context storage and retrieval
   - Multi-layer persistence (Redis, PostgreSQL, Pinecone)
   - Session bridging
   - Compaction handling

5. **LangGraph Integration Tests** (`test_langgraph_integration.py`)
   - Workflow creation and management
   - Node implementation
   - Workflow execution and state management
   - Conditional routing

6. **Communication Logger Tests** (`test_communication_logger.py`)
   - Event logging to different targets
   - Log filtering and retrieval
   - Middleware integration
   - Log level management

7. **Security Tests** (`test_agent_security.py`)
   - Credential management
   - Message signing and validation
   - Access control policies
   - Token generation and verification

### Mock Integration

Many tests use mock objects to isolate components and ensure they can be tested independently. This approach allows for faster tests and more targeted bug detection.

## Usage Examples

### Basic Setup

```python
from agent_integration.src.agent_manager import AgentManager
from agent_integration.src.communication_protocol import MessageBus
from agent_integration.src.agent_roles import create_agent, AgentRole
from agent_integration.src.context_persistence import ContextPersistenceManager
from agent_integration.src.agent_security import AgentSecurityManager, SecureAgentManager

# Create components
message_bus = MessageBus()
agent_manager = AgentManager()
context_manager = ContextPersistenceManager()
security_manager = AgentSecurityManager()

# Secure the agent manager
secure_agent_manager = SecureAgentManager(agent_manager, security_manager)

# Create agents
planner = create_agent(AgentRole.PLANNER, "planner_1", secure_agent_manager, message_bus=message_bus)
executor = create_agent(AgentRole.EXECUTOR, "executor_1", secure_agent_manager, message_bus=message_bus)
reviewer = create_agent(AgentRole.REVIEWER, "reviewer_1", secure_agent_manager, message_bus=message_bus)
notion = create_agent(AgentRole.NOTION, "notion_1", secure_agent_manager, message_bus=message_bus)

# Register agents
secure_agent_manager.register_agent(planner)
secure_agent_manager.register_agent(executor)
secure_agent_manager.register_agent(reviewer)
secure_agent_manager.register_agent(notion)

# Initialize and start
await secure_agent_manager.initialize()
await secure_agent_manager.start()
```

### Creating and Executing a Workflow

```python
from agent_integration.src.langgraph_integration import LangGraphIntegration

# Create LangGraph integration
langgraph = LangGraphIntegration(
    agent_manager=secure_agent_manager,
    context_manager=context_manager,
    message_bus=message_bus
)

# Create a workflow
workflow = await langgraph.create_workflow(
    workflow_type="planner_executor_reviewer",
    title="Implement New Feature",
    description="Implement a new feature for the SecondBrain system",
    inputs={
        "feature_name": "Context Persistence",
        "requirements": [
            "Store context in Redis for short-term access",
            "Store context in PostgreSQL for medium-term access",
            "Store context in Pinecone for long-term access"
        ],
        "strategic_goals": "Ensure no context is lost during CLI sessions"
    }
)

# Execute the workflow
result = await langgraph.execute_workflow(workflow.workflow_id)

# Check workflow status
print(f"Workflow status: {result.status}")
print(f"Notion documentation: {result.outputs.get('notion_page_id')}")
```

### Using the Reviewer Agent Directly

```python
from agent_integration.src.reviewer_agent import ReviewType, ReviewStatus

# Create a review request
review_request = await reviewer.create_review_request(
    title="Feature Implementation Plan",
    description="Plan for implementing the Context Persistence feature",
    content={
        "plan": {
            "steps": [
                "Design database schema",
                "Implement Redis layer",
                "Implement PostgreSQL layer",
                "Implement Pinecone layer",
                "Create context bridges",
                "Handle session compaction"
            ]
        },
        "strategic_goals": "Ensure no context is lost during CLI sessions"
    },
    review_type=ReviewType.PRE_IMPLEMENTATION,
    requester_id="planner_1"
)

# Process the review
processed_request = await reviewer.process_next_review()

# Check review status
if processed_request.approval:
    print("Plan approved!")
else:
    print("Plan needs changes:")
    for feedback in processed_request.feedback:
        print(f"- {feedback['name']}: {feedback['feedback']}")
```

## Security Considerations

The Agent Integration component implements several security measures:

1. **Authentication**: Agent credentials with API keys and secret keys
2. **Authorization**: Role-based access control with fine-grained permissions
3. **Message Validation**: Signature verification and authorization checks
4. **Secure Storage**: Protection of sensitive information and credentials
5. **Audit Logging**: Comprehensive logging of all security-related events

For production deployments, it's recommended to:

- Store credentials securely (not in version control)
- Rotate credentials regularly
- Use HTTPS for all external communications
- Implement network isolation for agent components
- Enable comprehensive audit logging

## Advanced Features

### Custom Agent Implementation

You can create custom agent types by extending the base Agent class:

```python
from agent_integration.src.agent_manager import Agent, AgentRole, AgentState

class CustomAgent(Agent):
    """A custom agent implementation"""
    
    def __init__(self, agent_id, manager, config=None, message_bus=None):
        super().__init__(agent_id, AgentRole.EXECUTOR, manager, config)
        self.message_bus = message_bus
        
    async def initialize(self):
        # Custom initialization
        self.state = AgentState.INITIALIZING
        # ...
        self.state = AgentState.IDLE
        return True
        
    async def process_message(self, message):
        # Custom message processing
        # ...
        return response
```

### Custom Workflow Definition

You can create custom workflow types by extending the LangGraph integration:

```python
from agent_integration.src.langgraph_integration import LangGraphIntegration

class CustomWorkflows(LangGraphIntegration):
    """Custom workflow definitions"""
    
    async def _create_custom_workflow(self, workflow_id):
        """Create a custom workflow"""
        workflow_state = self.workflow_states[workflow_id]
        
        # Define workflow steps
        steps = {
            "custom_step": self._create_custom_step,
            # ...
        }
        
        # Define workflow transitions
        transitions = {
            "custom_step": lambda state: "next_step",
            # ...
        }
        
        # Create workflow
        # ...
```

## API Reference

For detailed API reference, see the [API Documentation](docs/api.md).

## Contributing

Contributions to the Agent Integration component are welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- The SecondBrain architecture team
- LangGraph developers
- Claude, GPT, and other model providers