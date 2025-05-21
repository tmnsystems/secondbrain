# Semantic Search for SecondBrain Slack-Notion Integration

This document explains how to set up and use the semantic search feature in the SecondBrain integration. Semantic search allows you to find content based on meaning rather than exact keyword matches.

## Setup

### 1. Create a Pinecone Account

1. Sign up for a free account at [Pinecone](https://www.pinecone.io/)
2. Create a new project in Pinecone
3. Create a new index with the following settings:
   - Dimensions: 1536 (for OpenAI embeddings)
   - Metric: cosine
   - Pod Type: p1.x1 (for free tier)

### 2. Get Your API Keys

After creating your index, you'll need the following information:
- Pinecone API Key
- Pinecone Environment (e.g., "us-west1-gcp-free")
- Pinecone Index Name

### 3. Add to Environment File

Add the following variables to your `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env` file:

```
PINECONE_API_KEY=your-api-key-here
PINECONE_ENVIRONMENT=your-environment-here
PINECONE_INDEX=your-index-name-here
```

## Testing the Setup

To test if your semantic search is working correctly:

```bash
python -m slack_notion_integration.src.main --test-semantic-search
```

This will:
1. Create a test session
2. Add sample messages and tasks
3. Index them in Pinecone
4. Run various semantic search queries
5. Show the results
6. Clean up the test data

## Using Semantic Search in Your Code

The `ContextManager` class provides these semantic search methods:

### 1. Index Content

Content is automatically indexed when added through the `add_message` method. You can also manually index:

```python
# Index a message
context_manager.index_message(session_id, message)

# Index a task
context_manager.index_task(session_id, task)

# Index a Notion page
context_manager.index_notion_page(session_id, page)
```

### 2. Search Content

```python
# Search across all content types
results = context_manager.semantic_search(
    query="database integration issues",
    session_id="optional-session-id",  # Limit to specific session
    limit=5,  # Number of results
    filter_type="message"  # Optional filter: "message", "task", or "notion_page"
)

# Find related content across types
related = context_manager.find_related_content(
    text="Need to implement Redis caching for better performance",
    session_id="optional-session-id",
    limit=5  # Per type
)
```

## Architecture

The semantic search implementation uses a three-layer architecture:

1. **Short-term caching (Redis)**
   - Fast access to recent conversations
   - Temporary storage for active sessions
   
2. **Structured storage (PostgreSQL)**
   - Persistent storage of all conversations and metadata
   - Relational data like users, sessions, and tasks
   
3. **Semantic search (Pinecone)**
   - Vector embeddings for semantic understanding
   - Similarity-based search across all content

## Best Practices

1. Use specific, meaningful queries for best results
2. Combine semantic search with structured queries for precise filtering
3. Consider session context to limit scope when appropriate
4. Use related content search for discovering connections between different content types

## Troubleshooting

If semantic search is not working:

1. Check that your API keys are correct in the env file
2. Ensure your Pinecone index is properly configured (1536 dimensions)
3. Verify network connectivity to Pinecone
4. Check the logs for specific error messages
5. Run the test with `--test-semantic-search` flag to diagnose issues