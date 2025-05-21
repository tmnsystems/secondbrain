# Slack+Notion Integration Context

This CLAUDE.md file provides specific context for the Slack+Notion integration directory, inheriting from the root CLAUDE.md file.

## Integration Architecture

The Slack+Notion integration provides a robust multi-agent system with three-layer context persistence:

1. **Redis Layer (Short-term)**
   - High-speed access to active contexts
   - 100MB cache size (paid tier)
   - LRU eviction policy
   - TTL: 24 hours for context objects

2. **PostgreSQL Layer (Medium-term)**
   - Comprehensive structured storage
   - Complete relationship tracking
   - Full text preservation
   - Enhanced schema with specialized tables

3. **Pinecone Layer (Long-term)**
   - Semantic vector search capabilities
   - Complete metadata preservation
   - Chunk management for long contexts
   - Dimensions: 1536 (OpenAI) or 768 (smaller models)

## Key Components

1. **Context Manager**
   - Located in `/Volumes/Envoy/SecondBrain/slack_notion_integration/context_manager.py`
   - Manages context across all three persistence layers
   - Ensures "NEVER TRUNCATE" principle is followed
   - Provides unified API for context operations

2. **Slack Integration**
   - Located in `/Volumes/Envoy/SecondBrain/slack_notion_integration/slack_integration.py`
   - Handles Slack message processing
   - Manages agent identity in Slack
   - Provides thread-based context management

3. **Notion Integration**
   - Located in `/Volumes/Envoy/SecondBrain/slack_notion_integration/notion_integration.py`
   - Creates and updates Notion databases
   - Manages task tracking and documentation
   - Provides human-readable audit trail

4. **CLI Context Bridge**
   - Located in `/Volumes/Envoy/SecondBrain/slack_notion_integration/cli_bridge.py`
   - Bridges context between CLI sessions
   - Manages session state persistence
   - Creates session summaries for review

## Implementation Details

1. **Context Extraction**
   - Context is extracted with minimum ±5 paragraphs
   - Full stories and examples are preserved intact
   - Speaker identification is maintained
   - Emotional markers and tone indicators are preserved

2. **Context Storage**
   - Redis stores active context with fast access
   - PostgreSQL maintains structured relationships
   - Pinecone enables semantic search capabilities
   - All storage follows "NEVER TRUNCATE" principle

3. **Context Retrieval**
   - Multi-level retrieval strategy (Redis → PostgreSQL → Pinecone)
   - Semantic search for relevant context
   - Session-specific context retrieval
   - Agent-specific context formatting

4. **Session Bridging**
   - Sessions are logged with comprehensive metadata
   - Context objects are linked between sessions
   - Bridges enable continuity across time
   - Summary generation supports compaction

## API Usage

1. **Context Management API**
   ```python
   # Store context across all layers
   context_id = await context_manager.store_context(context_obj)
   
   # Retrieve context by ID
   context = await context_manager.retrieve_context(context_id=context_id)
   
   # Retrieve context by semantic search
   contexts = await context_manager.retrieve_context(query="business systems")
   
   # Get agent-specific context
   formatted_context = await context_manager.get_agent_context(
       agent_id="planner",
       query="value ladder",
       session_id=current_session
   )
   ```

2. **Session Management API**
   ```python
   # Create session bridge
   bridge_id = await cli_bridge.create_session_bridge(
       from_session_id=previous_session,
       to_session_id=current_session
   )
   
   # Save session context
   await cli_bridge.save_session_context(
       session_id=current_session,
       conversation=messages,
       summary=session_summary
   )
   
   # Load session context
   context = await cli_bridge.load_session_context(new_session_id=current_session)
   ```

## Development Guidelines

1. **Context Preservation**
   - NEVER truncate or simplify context
   - Always preserve full surrounding context (±5 paragraphs minimum)
   - Maintain speaker identification and emotional markers
   - Preserve chronological integrity of content

2. **Performance Optimization**
   - Use appropriate storage layer for access patterns
   - Implement caching for frequently accessed content
   - Manage token usage with selective context loading
   - Monitor resource utilization across persistence layers

3. **Integration Testing**
   - Test context preservation across all layers
   - Verify session bridging functionality
   - Validate semantic search capabilities
   - Ensure persistence mechanisms are reliable