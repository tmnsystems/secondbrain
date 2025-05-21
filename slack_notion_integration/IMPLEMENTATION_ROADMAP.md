# Slack-Notion Integration Implementation Roadmap

## Overview
This roadmap details the step-by-step implementation for the Slack-Notion integration with real-time context logging, following the approved implementation plan with the Reviewer Agent's recommendations.

## Phase 1: Core Real-Time Logging (Days 1-3)

### 1.1 Enhance SlackIntegration Class
- Update `src/slack/app.py` to integrate with CLISessionLogger
- Implement real-time logging of all Slack messages
- Add thread tracking and session bridging
- Implement multi-agent architecture

```python
# Example implementation
class SlackIntegration:
    def __init__(self, agent_role="assistant"):
        self.session_logger = CLISessionLogger(session_id=f"slack-{agent_role}-{int(time.time())}")
        self.agent_role = agent_role
        # Initialize Slack client
        self.slack_client = WebClient(token=os.environ.get("SLACK_BOT_TOKEN"))
        
    async def log_incoming_message(self, channel_id, user_id, message, thread_ts=None):
        # Log message to Notion in real-time
        await self.session_logger.log_user_message(f"Slack user {user_id}: {message}")
        # Store context in all three layers
        await context_manager.store_context({
            "source": "slack",
            "channel_id": channel_id,
            "user_id": user_id,
            "message": message,
            "thread_ts": thread_ts,
            "timestamp": datetime.now().isoformat()
        })
```

### 1.2 Implement CLI-Slack Bridge
- Enhance `cli_bridge.py` to support Slack integration
- Add context transfer between CLI and Slack
- Implement session continuation between platforms

```python
async def create_cli_slack_bridge(cli_session_id, slack_thread_ts):
    """Create a bridge between CLI session and Slack thread."""
    cli_logger = get_session_by_id(cli_session_id)
    slack_integration = SlackIntegration()
    
    # Create bridge in Notion
    await cli_logger.log_system_action("CREATE_SLACK_BRIDGE", {
        "slack_thread_ts": slack_thread_ts
    })
    
    # Update Slack thread with bridge information
    await slack_integration.add_bridge_message(
        thread_ts=slack_thread_ts,
        cli_session_id=cli_session_id
    )
    
    return {
        "success": True,
        "cli_session_id": cli_session_id,
        "slack_thread_ts": slack_thread_ts
    }
```

### 1.3 Add Enhanced Error Handling
- Implement robust recovery for API failures
- Add exponential backoff for rate limiting
- Implement transaction support for critical operations

```python
async def retry_with_backoff(func, *args, max_retries=5, **kwargs):
    """Execute a function with exponential backoff retry logic."""
    retry_count = 0
    while retry_count < max_retries:
        try:
            return await func(*args, **kwargs)
        except (RateLimitError, APIError) as e:
            retry_count += 1
            wait_time = (2 ** retry_count) + random.uniform(0, 1)
            logging.warning(f"API error: {str(e)}. Retrying in {wait_time:.2f} seconds...")
            await asyncio.sleep(wait_time)
    
    raise MaxRetriesExceeded(f"Failed after {max_retries} retries")
```

## Phase 2: Three-Layer Persistence System (Days 4-6)

### 2.1 Implement Redis Client
- Create `src/redis/client.py` for short-term context storage
- Add caching for active conversations
- Implement TTL-based expiration

```python
class RedisContextStore:
    def __init__(self):
        self.redis = redis.Redis(
            host=os.environ.get("REDIS_HOST", "localhost"),
            port=int(os.environ.get("REDIS_PORT", 6379)),
            password=os.environ.get("REDIS_PASSWORD", "")
        )
        self.ttl = 86400  # 24 hours
    
    async def store_context(self, context_id, context_data):
        """Store context in Redis with TTL."""
        serialized = json.dumps(context_data)
        await self.redis.set(f"context:{context_id}", serialized, ex=self.ttl)
    
    async def retrieve_context(self, context_id):
        """Retrieve context from Redis."""
        data = await self.redis.get(f"context:{context_id}")
        return json.loads(data) if data else None
```

### 2.2 Enhance PostgreSQL Integration
- Update `src/database/client.py` for medium-term storage
- Add comprehensive schema for conversations and threads
- Implement efficient query patterns

```python
class PostgresContextStore:
    def __init__(self):
        self.conn_string = os.environ.get("POSTGRES_CONNECTION_STRING")
        self.pool = asyncpg.create_pool(self.conn_string)
    
    async def store_context(self, context_data):
        """Store context in PostgreSQL for medium-term persistence."""
        async with self.pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO contexts (
                    context_id, source, user_id, content, metadata, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            ''', 
            context_data["id"],
            context_data["source"],
            context_data["user_id"],
            context_data["content"],
            json.dumps(context_data["metadata"]),
            datetime.now()
            )
```

### 2.3 Set Up Pinecone Integration
- Implement `src/vector/client.py` for long-term semantic search
- Add vector embedding for context objects
- Implement semantic search capabilities

```python
class PineconeContextStore:
    def __init__(self):
        pinecone.init(
            api_key=os.environ.get("PINECONE_API_KEY"),
            environment=os.environ.get("PINECONE_ENVIRONMENT")
        )
        self.index_name = os.environ.get("PINECONE_INDEX_NAME", "secondbrain-contexts")
        self.index = pinecone.Index(self.index_name)
        self.embedding_dimension = 1536  # For OpenAI embeddings
    
    async def store_context(self, context_id, text, metadata=None):
        """Store context in Pinecone for semantic search."""
        # Generate embedding
        embedding = await self._get_embedding(text)
        
        # Store in Pinecone
        await self.index.upsert(
            vectors=[{
                "id": context_id,
                "values": embedding,
                "metadata": metadata or {}
            }]
        )
```

## Phase 3: Multi-Agent Architecture (Days 7-9)

### 3.1 Implement Agent Identities
- Create separate agent configurations for each role
- Set up distinct Slack app instances for each agent
- Implement proper identity management

```python
class AgentFactory:
    """Factory for creating agent instances with proper identities."""
    
    @staticmethod
    def create_agent(agent_type):
        """Create a new agent instance with proper configuration."""
        if agent_type == "planner":
            return PlannerAgent(
                model="claude-3-7-sonnet",
                slack_token=os.environ.get("PLANNER_SLACK_TOKEN")
            )
        elif agent_type == "executor":
            return ExecutorAgent(
                model="gpt-4.1-mini",
                slack_token=os.environ.get("EXECUTOR_SLACK_TOKEN")
            )
        elif agent_type == "reviewer":
            return ReviewerAgent(
                model="o3",
                slack_token=os.environ.get("REVIEWER_SLACK_TOKEN")
            )
        elif agent_type == "notion":
            return NotionAgent(
                model="gpt-4.1-mini",
                slack_token=os.environ.get("NOTION_SLACK_TOKEN")
            )
        else:
            raise ValueError(f"Unknown agent type: {agent_type}")
```

### 3.2 Implement LangGraph Flows
- Update `src/langgraph/flows.py` for agent workflows
- Implement state machines for agent transitions
- Add logging for all state changes

```python
def create_agent_workflow():
    """Create a LangGraph workflow for the SecondBrain agents."""
    builder = StateGraph("SecondBrainAgents")
    
    # Define states
    builder.add_node("planner", planner_node)
    builder.add_node("reviewer", reviewer_node)
    builder.add_node("executor", executor_node)
    builder.add_node("notion", notion_node)
    
    # Define transitions
    builder.add_edge("planner", "reviewer")
    builder.add_edge("reviewer", "executor")
    builder.add_edge("executor", "reviewer")
    builder.add_edge("reviewer", "notion")
    
    # Add conditional edges
    builder.add_conditional_edges(
        "reviewer",
        review_decision,
        {
            "approved": "executor",
            "rejected": "planner",
            "completed": "notion"
        }
    )
    
    # Create graph
    workflow = builder.compile()
    return workflow
```

### 3.3 Implement NotionAgent
- Create `src/agents/notion_agent.py` for Notion operations
- Add task tracking and documentation capabilities
- Implement sign-off functionality with timestamps

```python
class NotionAgent:
    """Agent responsible for maintaining context in Notion."""
    
    def __init__(self, model="gpt-4.1-mini", slack_token=None):
        self.model = model
        self.notion = Client(auth=os.environ.get("NOTION_API_KEY"))
        self.session_logger = CLISessionLogger(session_id=f"notion-agent-{int(time.time())}")
        
    async def create_task(self, title, description, assigned_agent, priority="P2"):
        """Create a task in the SecondBrain Tasks database."""
        # Log creation in real-time
        await self.session_logger.log_system_action("CREATE_TASK", {
            "title": title,
            "assigned_agent": assigned_agent,
            "priority": priority
        })
        
        # Create task in Notion
        task = await retry_with_backoff(
            self.notion.pages.create,
            parent={"database_id": os.environ.get("NOTION_TASKS_DATABASE_ID")},
            properties={
                "Name": {"title": [{"text": {"content": title}}]},
                "Status": {"select": {"name": "Not Started"}},
                "Priority": {"select": {"name": priority}},
                "Assigned Agent": {"select": {"name": assigned_agent}},
                "Created": {"date": {"start": datetime.now().isoformat()}}
            }
        )
        
        return task
```

## Phase 4: Testing and Integration (Days 10-12)

### 4.1 Enhance Test Scripts
- Update `test_slack.py` for Slack integration testing
- Add comprehensive test cases for all components
- Implement automated CI/CD testing

```python
async def test_slack_notion_integration():
    """Test the complete Slack-Notion integration."""
    # Initialize components
    slack = SlackIntegration()
    notion_agent = NotionAgent()
    
    # Create test data
    test_message = f"Test message {uuid.uuid4()}"
    test_channel = "C01234567"
    test_user = "U01234567"
    
    # Send test message and verify logging
    await slack.handle_message(test_channel, test_user, test_message)
    
    # Verify message was logged to Notion
    tasks = await notion_agent.search_tasks(contains=test_message)
    assert len(tasks) > 0, "Message was not logged to Notion"
    
    # Verify context was stored in Redis
    redis_store = RedisContextStore()
    context = await redis_store.search_context(contains=test_message)
    assert context is not None, "Context was not stored in Redis"
    
    # Test compaction handling
    new_session = await slack.session_logger.handle_compaction("TEST_COMPACTION")
    assert new_session is not None, "Failed to handle compaction"
    
    # Verify context bridges work
    context = await new_session.load_most_recent_context()
    assert test_message in str(context), "Context bridge failed to preserve message"
```

### 4.2 Create Documentation
- Create comprehensive API documentation
- Add user guides for context persistence
- Create troubleshooting procedures

### 4.3 Final Integration and Verification
- Integrate all components into a cohesive system
- Run end-to-end testing
- Verify all success metrics are met

## Success Metrics Verification

1. **Real-Time Logging Performance**
   - Verify all user inputs logged to Notion within 500ms
   - Test with high-volume message streams

2. **Context Loss Prevention**
   - Simulate compaction events and verify no context is lost
   - Test automatic session bridging

3. **Multi-Agent Workflow**
   - Verify proper transitions between agent states
   - Test error handling and recovery

4. **Three-Layer Persistence**
   - Verify context is stored in all three layers
   - Test retrieval from each layer

5. **Security**
   - Verify API keys are securely managed
   - Test token rotation and authentication

## Implementation Timeline

| Phase | Tasks | Days | Status |
|-------|-------|------|--------|
| 1 | Core Real-Time Logging | 1-3 | Not Started |
| 2 | Three-Layer Persistence | 4-6 | Not Started |
| 3 | Multi-Agent Architecture | 7-9 | Not Started |
| 4 | Testing and Integration | 10-12 | Not Started |

## Next Steps

1. Begin implementation of Phase 1 (Core Real-Time Logging)
2. Set up development environment with required dependencies
3. Create detailed test cases for each component
4. Schedule regular reviews with the Reviewer Agent