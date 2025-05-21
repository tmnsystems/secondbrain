# Agents Directory Context

This CLAUDE.md file provides specific context for the agents directory, inheriting from the root CLAUDE.md file.

## Agent System Architecture

The SecondBrain agent system follows a multi-agent architecture with specialized roles:

1. **PlannerAgent** (Claude 3.7 Sonnet/Opus)
   - Analyzes requirements
   - Generates project plans
   - Creates task breakdowns
   - Develops specifications

2. **ExecutorAgent** (GPT-4.1 Mini)
   - Executes commands
   - Manages deployments
   - Handles system operations
   - Performs Git operations

3. **ReviewerAgent** (OpenAI o3)
   - Reviews code and content
   - Validates implementation
   - Checks for quality issues
   - Verifies against requirements

4. **NotionAgent** (GPT-4.1 Mini)
   - Creates and updates documentation
   - Manages knowledge base
   - Maintains task tracking
   - Provides audit trail

5. **RefactorAgent** (Claude 3)
   - Optimizes code
   - Improves performance
   - Modernizes implementations
   - Reduces complexity

6. **BuildAgent** (Claude 3)
   - Creates project scaffolding
   - Generates components
   - Implements templates
   - Produces code

7. **OrchestratorAgent** (GPT-4.1 Nano)
   - Manages workflow
   - Coordinates communication
   - Routes tasks
   - Handles errors

## Agent Communication Protocol

Agents communicate through a structured protocol:

1. **Message Format**
   ```json
   {
     "sender_id": "agent-id",
     "recipient_id": "agent-id",
     "message_type": "task|response|status|error",
     "timestamp": "ISO-8601",
     "content": {},
     "correlation_id": "message-chain-id"
   }
   ```

2. **Communication Flow**
   - Direct agent-to-agent communication for focused tasks
   - All communication logged through OrchestratorAgent
   - Status updates broadcasted to relevant agents
   - Error messages elevated to appropriate handlers

3. **Task Assignment**
   - Tasks are assigned with clear parameters
   - Expected outputs are explicitly defined
   - Dependencies are specified upfront
   - Completion criteria are included

## Implementation Details

1. **Core Agent Framework**
   - Located in `/Volumes/Envoy/SecondBrain/agents/framework/`
   - Implements base agent functionality
   - Provides common utilities
   - Enforces consistent interfaces

2. **Agent Implementations**
   - Each agent has its own subdirectory
   - Specialized capabilities are implemented in individual modules
   - Configuration is managed through environment variables
   - State persistence is handled through a common mechanism

3. **LangGraph Implementation**
   - Workflow definitions in `/Volumes/Envoy/SecondBrain/agents/workflows/`
   - Node implementations in `/Volumes/Envoy/SecondBrain/agents/nodes/`
   - State management in `/Volumes/Envoy/SecondBrain/agents/state/`
   - Tool integration in `/Volumes/Envoy/SecondBrain/agents/tools/`

## Development Guidelines

1. **Testing Requirements**
   - Each agent must have comprehensive unit tests
   - Integration tests for agent-to-agent communication
   - End-to-end tests for complete workflows
   - Performance tests for critical paths

2. **Documentation Standards**
   - All public interfaces must be documented
   - Implementation details should include explanations
   - Examples should be provided for complex operations
   - Configuration options must be documented

3. **Error Handling**
   - All errors must be properly categorized
   - Recovery mechanisms should be implemented
   - Fallback options should be available
   - Detailed error information should be logged

4. **Performance Considerations**
   - Token usage should be optimized
   - Response times should be minimized
   - Caching should be used where appropriate
   - Resource utilization should be monitored