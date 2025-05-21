# SecondBrain Context Persistence System Implementation Plan

## Overview

This document details the implementation plan for the SecondBrain context persistence system that enables comprehensive preservation of rich context between sessions. The system consists of three layers:

1. **Redis Layer** - Short-term caching (active sessions)
2. **PostgreSQL Layer** - Structured conversation storage (medium-term)
3. **Pinecone Layer** - Semantic vector search (long-term context)

## FUNDAMENTAL PRINCIPLE: NEVER TRUNCATE OR SIMPLIFY

SecondBrain is fundamentally designed to be complex and comprehensive - like an actual human brain. This system's value comes from preserving the rich, interconnected, and nuanced nature of Tina's teaching, not from simplified extracts.

## 1. Infrastructure Setup

### 1.1 Linode VM Configuration

We will set up the following VMs on Linode:

- **Main Orchestration VM**
  - Role: Hosts the orchestrator agent and manages workflow
  - Specs: 8GB RAM, 4 vCPUs, 160GB storage
  - OS: Ubuntu 22.04 LTS

- **Agent VMs (4)**
  - Roles: Planner, Executor, Reviewer, and Notion agents
  - Specs: 4GB RAM, 2 vCPUs, 80GB storage per VM
  - OS: Ubuntu 22.04 LTS

- **Database VM**
  - Role: Hosts PostgreSQL database
  - Specs: 16GB RAM, 8 vCPUs, 320GB storage
  - OS: Ubuntu 22.04 LTS
  - Notes: Increased specs to handle comprehensive context storage

### 1.2 Vercel Configuration

- **Frontend UI** hosted on Vercel
- **Edge Functions** for stateless API endpoint handlers
- **Edge Config** for API key storage

### 1.3 Redis Cloud Setup

- Managed Redis instance for session management
- 100MB cache size (paid tier)
- Configured for key eviction based on LRU policy
- Persistent storage enabled for critical context data

## 2. Persistence Layers

### 2.1 Redis Schema

```
# Session keys (TTL: 2 hours)
session:{session_id}:metadata = {
  user_id: string,
  start_time: timestamp,
  last_active: timestamp,
  agents: array,
  context_level: "full" | "extended"
}

# Message cache (TTL: 2 hours)
session:{session_id}:messages = [
  {
    id: string,
    role: "user" | "assistant" | "agent" | "system",
    content: string,
    timestamp: timestamp,
    agent_id: string (optional),
    context_refs: array (optional) # References to associated context
  },
  ...
]

# Agent state (TTL: 1 hour)
agent:{agent_id}:state = {
  current_task: string,
  memory: object,
  model: string,
  status: string
}

# Active workflows (TTL: 24 hours)
workflow:{workflow_id} = {
  state: object,
  current_step: string,
  history: array,
  context_references: array # References to associated context
}

# Context objects (TTL: 24 hours)
context:{context_id} = {
  id: string,
  pattern_type: string,
  match_text: string,
  full_context: string, # Never truncated
  extended_context: string, # Additional context if needed
  speakers: array,
  source: object,
  domain_tags: array,
  emotional_markers: array,
  related_patterns: array,
  timestamps: object,
  chronology: object
}
```

### 2.2 PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  source VARCHAR(50), -- 'cli', 'slack', 'web'
  context_level VARCHAR(20) DEFAULT 'full' -- 'full', 'extended'
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'agent'
  content TEXT NOT NULL, -- Full message content, never truncated
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  agent_id UUID,  -- NULL for user/assistant
  parent_id UUID REFERENCES messages(id), -- for threading
  has_context BOOLEAN DEFAULT FALSE
);

-- Context table (comprehensive, never truncated)
CREATE TABLE contexts (
  id UUID PRIMARY KEY,
  pattern_type VARCHAR(50) NOT NULL, -- 'metaphor', 'value', 'framework', 'teaching'
  match_text TEXT NOT NULL, -- The exact matched pattern text
  full_context TEXT NOT NULL, -- Minimum ±5 paragraphs, never truncated
  extended_context TEXT, -- Further context for complete stories/examples
  source_file VARCHAR(255),
  recording_date TIMESTAMP,
  session_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Context Speakers relation
CREATE TABLE context_speakers (
  id UUID PRIMARY KEY,
  context_id UUID REFERENCES contexts(id),
  speaker_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  position_start INTEGER,
  position_end INTEGER
);

-- Domain Tags relation
CREATE TABLE context_domain_tags (
  context_id UUID REFERENCES contexts(id),
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (context_id, tag)
);

-- Emotional Markers
CREATE TABLE context_emotional_markers (
  id UUID PRIMARY KEY,
  context_id UUID REFERENCES contexts(id),
  marker_type VARCHAR(50) NOT NULL, -- 'emphasis', 'pause', 'tone_shift'
  position_start INTEGER,
  position_end INTEGER,
  description TEXT
);

-- Related Patterns
CREATE TABLE related_patterns (
  source_context_id UUID REFERENCES contexts(id),
  target_context_id UUID REFERENCES contexts(id),
  relation_type VARCHAR(50), -- 'explicit', 'implicit', 'chronological'
  strength FLOAT, -- 0.0 to 1.0
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_context_id, target_context_id)
);

-- Message-Context relations
CREATE TABLE message_contexts (
  message_id UUID REFERENCES messages(id),
  context_id UUID REFERENCES contexts(id),
  relevance_score FLOAT, -- 0.0 to 1.0
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, context_id)
);

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  status VARCHAR(50) NOT NULL, -- 'active', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  workflow_type VARCHAR(100),
  metadata JSONB
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  agent VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  priority VARCHAR(20),
  metadata JSONB,
  context_ids JSONB -- Array of context IDs relevant to this task
);

-- Task Steps table
CREATE TABLE task_steps (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  description TEXT NOT NULL,
  agent VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  result JSONB,
  context_ids JSONB -- Array of context IDs relevant to this step
);

-- Context Chronology
CREATE TABLE context_chronology (
  id UUID PRIMARY KEY,
  context_id UUID REFERENCES contexts(id),
  sequence_position INTEGER,
  precedes_context_id UUID REFERENCES contexts(id),
  follows_context_id UUID REFERENCES contexts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Context bridges (for bridging context between sessions)
CREATE TABLE context_bridges (
  id UUID PRIMARY KEY,
  from_session_id UUID REFERENCES sessions(id),
  to_session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  context_summary TEXT,
  context_data JSONB, -- Full context data, never truncated
  included_context_ids JSONB -- Array of context IDs included in bridge
);

-- Notion sync table
CREATE TABLE notion_syncs (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  notion_page_id VARCHAR(255),
  notion_database_id VARCHAR(255),
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  context_ids JSONB -- Array of context IDs synced to Notion
);

-- Vector embeddings table (for Pinecone sync)
CREATE TABLE vector_embeddings (
  id UUID PRIMARY KEY,
  source_type VARCHAR(50), -- 'message', 'context', 'task', 'document'
  source_id UUID,
  embedding_id VARCHAR(255), -- ID in Pinecone
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  metadata JSONB
);
```

### 2.3 Pinecone Configuration

- Index Configuration:
  - Dimensions: 1536 (OpenAI embeddings) or 768 (smaller models)
  - Metric: Cosine similarity
  - Pod type: Standard (p1.x2 or higher)
  - Pod size: Increased to accommodate full context storage

- Metadata Structure:
  ```json
  {
    "source_id": "uuid",
    "source_type": "message|context|task|document",
    "pattern_type": "metaphor|value|framework|teaching",
    "timestamp": "ISO datetime",
    "agent": "agent_name",
    "session_id": "uuid",
    "chunk_id": "number",
    "total_chunks": "number",
    "domain_tags": ["tag1", "tag2"],
    "speakers": ["name1", "name2"],
    "emotional_markers": ["emphasis", "pause"],
    "source_file": "filename",
    "session_type": "coaching|consultation|course"
  }
  ```

## 3. Enhanced Context Preservation System

The context preservation system will:

1. Capture, store, and retrieve comprehensive context objects
2. Ensure no truncation or simplification of context
3. Preserve full associative connections between contexts
4. Maintain chronological integrity of context development
5. Store complete emotional context including tone and emphasis
6. Enable sophisticated cross-referencing across contexts

### 3.1 Context Extraction and Storage

```python
# Pseudocode for enhanced context extraction
def extract_with_full_context(text, pattern_indicators):
    # Find all potential pattern indicators
    matches = find_all_pattern_indicators(text, pattern_indicators)
    
    for match in matches:
        # Get paragraph containing the match
        containing_paragraph = get_paragraph(text, match.position)
        
        # Get 5 paragraphs before and after (or more if part of same story/teaching)
        pre_context = get_paragraphs_before(text, containing_paragraph.position, 5)
        post_context = get_paragraphs_after(text, containing_paragraph.position, 5)
        
        # Extend context if needed to include complete story/example
        pre_context = extend_to_complete_unit(text, pre_context, "backward")
        post_context = extend_to_complete_unit(text, post_context, "forward")
        
        # Extract speaker information
        speakers = identify_speakers(pre_context + containing_paragraph + post_context)
        
        # Extract emotional markers
        emotional_markers = extract_emotional_markers(pre_context + containing_paragraph + post_context)
        
        # Create full context object
        context_id = generate_unique_id()
        context_obj = {
            "id": context_id,
            "pattern_type": identify_pattern_type(match),
            "match_text": match.text,
            "full_context": pre_context + containing_paragraph + post_context,
            "extended_context": extract_additional_context(text, pre_context, post_context),
            "speakers": speakers,
            "source": extract_source_info(text),
            "domain_tags": identify_domain_tags(containing_paragraph),
            "emotional_markers": emotional_markers,
            "related_patterns": find_related_patterns(containing_paragraph),
            "timestamps": {
                "extracted": datetime.now().isoformat(),
                "original": extract_original_timestamp(text)
            },
            "chronology": identify_chronology(match, text)
        }
        
        # Store in all three persistence layers
        store_context_redis(context_obj)
        store_context_postgres(context_obj)
        store_context_pinecone(context_obj)
        
        return context_id
```

### 3.2 Context Storage Functions

```python
# Store in Redis (short-term, fast access)
def store_context_redis(context_obj):
    context_id = context_obj["id"]
    redis_client.set(f"context:{context_id}", json.dumps(context_obj))
    redis_client.expire(f"context:{context_id}", 86400)  # 24 hours TTL

# Store in PostgreSQL (comprehensive, structured storage)
def store_context_postgres(context_obj):
    with db_connection() as conn:
        # Insert main context record
        conn.execute("""
            INSERT INTO contexts (
                id, pattern_type, match_text, full_context, extended_context,
                source_file, recording_date, session_type, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            context_obj["id"], 
            context_obj["pattern_type"],
            context_obj["match_text"],
            context_obj["full_context"],
            context_obj["extended_context"],
            context_obj["source"].get("file"),
            context_obj["source"].get("date"),
            context_obj["source"].get("session_type"),
            datetime.now()
        ))
        
        # Store speakers
        for speaker in context_obj["speakers"]:
            for segment in speaker["segments"]:
                conn.execute("""
                    INSERT INTO context_speakers (
                        id, context_id, speaker_name, text, position_start, position_end
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    generate_unique_id(),
                    context_obj["id"],
                    speaker["name"],
                    segment["text"],
                    segment["position"][0],
                    segment["position"][1]
                ))
        
        # Store domain tags
        for tag in context_obj["domain_tags"]:
            conn.execute("""
                INSERT INTO context_domain_tags (context_id, tag)
                VALUES (%s, %s)
            """, (context_obj["id"], tag))
        
        # Store emotional markers
        for marker in context_obj["emotional_markers"]:
            conn.execute("""
                INSERT INTO context_emotional_markers (
                    id, context_id, marker_type, position_start, position_end, description
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                generate_unique_id(),
                context_obj["id"],
                marker["type"],
                marker["position"][0],
                marker["position"][1],
                marker["description"]
            ))
        
        # Store related patterns
        for related in context_obj["related_patterns"]:
            conn.execute("""
                INSERT INTO related_patterns (
                    source_context_id, target_context_id, relation_type, strength
                ) VALUES (%s, %s, %s, %s)
            """, (
                context_obj["id"],
                related["id"],
                related["relation_type"],
                related["strength"]
            ))
        
        # Store chronology
        if "chronology" in context_obj and context_obj["chronology"]:
            conn.execute("""
                INSERT INTO context_chronology (
                    id, context_id, sequence_position, 
                    precedes_context_id, follows_context_id
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                generate_unique_id(),
                context_obj["id"],
                context_obj["chronology"].get("sequence_position"),
                context_obj["chronology"].get("precedes"),
                context_obj["chronology"].get("follows")
            ))

# Store in Pinecone (vector search for semantic lookup)
def store_context_pinecone(context_obj):
    # Generate embeddings for the context
    embedding = generate_embedding(context_obj["full_context"])
    
    # Prepare metadata (limited to Pinecone's metadata size limits)
    metadata = {
        "source_id": context_obj["id"],
        "source_type": "context",
        "pattern_type": context_obj["pattern_type"],
        "timestamp": context_obj["timestamps"]["extracted"],
        "domain_tags": context_obj["domain_tags"][:10],  # Limit for metadata size
        "speakers": [s["name"] for s in context_obj["speakers"]][:5],
        "source_file": context_obj["source"].get("file", ""),
        "session_type": context_obj["source"].get("session_type", "")
    }
    
    # Store in Pinecone
    pinecone_client.upsert(
        vectors=[(context_obj["id"], embedding, metadata)],
        namespace="contexts"
    )
    
    # For long contexts, we may need to chunk and store multiple vectors
    if len(context_obj["full_context"]) > 8000:  # If context is very long
        chunks = chunk_text(context_obj["full_context"], chunk_size=4000, overlap=200)
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{context_obj['id']}_chunk_{i}"
            chunk_embedding = generate_embedding(chunk)
            
            chunk_metadata = {
                "source_id": context_obj["id"],
                "source_type": "context_chunk",
                "pattern_type": context_obj["pattern_type"],
                "chunk_id": i,
                "total_chunks": len(chunks),
                "timestamp": context_obj["timestamps"]["extracted"]
            }
            
            pinecone_client.upsert(
                vectors=[(chunk_id, chunk_embedding, chunk_metadata)],
                namespace="context_chunks"
            )
```

### 3.3 Context Retrieval with Full Preservation

```python
# Retrieve full context by ID
def retrieve_context_by_id(context_id):
    # Try Redis first (fastest)
    context = redis_client.get(f"context:{context_id}")
    if context:
        return json.loads(context)
    
    # If not in Redis, get from PostgreSQL with all relations
    with db_connection() as conn:
        # Get main context record
        context_record = conn.execute("""
            SELECT * FROM contexts WHERE id = %s
        """, (context_id,)).fetchone()
        
        if not context_record:
            return None
        
        # Build full context object
        context_obj = {
            "id": context_record["id"],
            "pattern_type": context_record["pattern_type"],
            "match_text": context_record["match_text"],
            "full_context": context_record["full_context"],
            "extended_context": context_record["extended_context"],
            "source": {
                "file": context_record["source_file"],
                "date": context_record["recording_date"],
                "session_type": context_record["session_type"]
            },
            "timestamps": {
                "extracted": context_record["created_at"].isoformat(),
                "updated": context_record["updated_at"].isoformat() if context_record["updated_at"] else None
            }
        }
        
        # Get speakers
        speakers_records = conn.execute("""
            SELECT * FROM context_speakers WHERE context_id = %s
        """, (context_id,)).fetchall()
        
        speakers_map = {}
        for record in speakers_records:
            name = record["speaker_name"]
            if name not in speakers_map:
                speakers_map[name] = {"name": name, "segments": []}
            
            speakers_map[name]["segments"].append({
                "text": record["text"],
                "position": [record["position_start"], record["position_end"]]
            })
        
        context_obj["speakers"] = list(speakers_map.values())
        
        # Get domain tags
        tags_records = conn.execute("""
            SELECT tag FROM context_domain_tags WHERE context_id = %s
        """, (context_id,)).fetchall()
        
        context_obj["domain_tags"] = [record["tag"] for record in tags_records]
        
        # Get emotional markers
        markers_records = conn.execute("""
            SELECT * FROM context_emotional_markers WHERE context_id = %s
        """, (context_id,)).fetchall()
        
        context_obj["emotional_markers"] = [{
            "type": record["marker_type"],
            "position": [record["position_start"], record["position_end"]],
            "description": record["description"]
        } for record in markers_records]
        
        # Get related patterns
        related_records = conn.execute("""
            SELECT * FROM related_patterns WHERE source_context_id = %s
        """, (context_id,)).fetchall()
        
        context_obj["related_patterns"] = [{
            "id": record["target_context_id"],
            "relation_type": record["relation_type"],
            "strength": record["strength"]
        } for record in related_records]
        
        # Get chronology
        chronology_record = conn.execute("""
            SELECT * FROM context_chronology WHERE context_id = %s
        """, (context_id,)).fetchone()
        
        if chronology_record:
            context_obj["chronology"] = {
                "sequence_position": chronology_record["sequence_position"],
                "precedes": chronology_record["precedes_context_id"],
                "follows": chronology_record["follows_context_id"]
            }
        
        # Store in Redis for future fast access
        redis_client.set(f"context:{context_id}", json.dumps(context_obj))
        redis_client.expire(f"context:{context_id}", 86400)  # 24 hour TTL
        
        return context_obj
```

### 3.4 Semantic Context Search

```python
# Search for contexts semantically
def search_contexts_semantic(query, limit=5, filter_tags=None):
    # Generate embedding for query
    query_embedding = generate_embedding(query)
    
    # Prepare filter if tags provided
    filter_expr = None
    if filter_tags:
        filter_expr = {"domain_tags": {"$in": filter_tags}}
    
    # Search in Pinecone
    search_results = pinecone_client.query(
        namespace="contexts",
        vector=query_embedding,
        top_k=limit,
        filter=filter_expr,
        include_metadata=True
    )
    
    # Get full contexts for top results
    contexts = []
    for match in search_results["matches"]:
        context_id = match["id"]
        # Get full context with all relations
        context = retrieve_context_by_id(context_id)
        if context:
            # Add match score to context
            context["match_score"] = match["score"]
            contexts.append(context)
    
    return contexts
```

### 3.5 Agent Context Integration

```python
# Provide context to agent for a given query
def provide_agent_context(agent_id, query, session_id=None):
    # Find relevant contexts using semantic search
    relevant_contexts = search_contexts_semantic(query, limit=3)
    
    # Get any session-specific contexts if session_id provided
    session_contexts = []
    if session_id:
        with db_connection() as conn:
            # Get contexts used in this session
            context_ids = conn.execute("""
                SELECT DISTINCT context_id FROM message_contexts
                WHERE message_id IN (
                    SELECT id FROM messages WHERE session_id = %s
                )
                ORDER BY MAX(relevance_score) DESC
                LIMIT 2
            """, (session_id,)).fetchall()
            
            for record in context_ids:
                context = retrieve_context_by_id(record["context_id"])
                if context:
                    session_contexts.append(context)
    
    # Combine contexts, removing duplicates
    all_contexts = session_contexts + [c for c in relevant_contexts 
                                      if c["id"] not in [sc["id"] for sc in session_contexts]]
    
    # Format contexts for agent consumption
    formatted_contexts = []
    for context in all_contexts:
        formatted_contexts.append({
            "id": context["id"],
            "type": context["pattern_type"],
            "content": context["full_context"],  # Never truncated
            "source": f"{context['source']['session_type']} - {context['source']['file']}",
            "speakers": [s["name"] for s in context["speakers"]],
            "tags": context["domain_tags"]
        })
    
    # Update agent state with contexts
    redis_client.hset(f"agent:{agent_id}:state", "contexts", json.dumps(formatted_contexts))
    
    return formatted_contexts
```

### 3.6 Session Context Bridging

```python
# Create context bridge between sessions
def create_context_bridge(from_session_id, to_session_id):
    with db_connection() as conn:
        # Get messages from source session
        messages = conn.execute("""
            SELECT * FROM messages
            WHERE session_id = %s
            ORDER BY created_at ASC
        """, (from_session_id,)).fetchall()
        
        # Get contexts used in source session
        context_ids = conn.execute("""
            SELECT DISTINCT context_id, MAX(relevance_score) as max_score
            FROM message_contexts
            WHERE message_id IN (
                SELECT id FROM messages WHERE session_id = %s
            )
            GROUP BY context_id
            ORDER BY max_score DESC
        """, (from_session_id,)).fetchall()
        
        # Get full context objects
        contexts = [retrieve_context_by_id(record["context_id"]) 
                   for record in context_ids]
        
        # Create summary of session (without truncation)
        summary = summarize_session_contexts(messages, contexts)
        
        # Store bridge in database
        bridge_id = generate_unique_id()
        conn.execute("""
            INSERT INTO context_bridges (
                id, from_session_id, to_session_id, created_at,
                context_summary, context_data, included_context_ids
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            bridge_id,
            from_session_id,
            to_session_id,
            datetime.now(),
            summary,
            json.dumps(messages),
            json.dumps([c["id"] for c in contexts])
        ))
        
        return {
            "bridge_id": bridge_id,
            "summary": summary,
            "context_count": len(contexts)
        }
```

## 4. Notion Integration for Full Context

Notion will serve as a human-readable log of all context, preserving the full richness of extracted content:

```python
# Store context in Notion with full preservation
def store_context_in_notion(context_obj):
    # Configure Notion client
    notion = NotionClient(auth=get_notion_token())
    
    # Create a new page in the Contexts database
    response = notion.pages.create(
        parent={"database_id": get_notion_contexts_database_id()},
        properties={
            "Name": {"title": [{"text": {"content": f"{context_obj['pattern_type']}: {context_obj['match_text'][:50]}..."}}]},
            "Pattern Type": {"select": {"name": context_obj["pattern_type"]}},
            "Source": {"rich_text": [{"text": {"content": context_obj["source"]["file"]}}]},
            "Session Type": {"select": {"name": context_obj["source"]["session_type"]}},
            "Extracted": {"date": {"start": context_obj["timestamps"]["extracted"]}},
            "Tags": {"multi_select": [{"name": tag} for tag in context_obj["domain_tags"]]}
        },
        # Full content in the page body - never truncated
        children=[
            {
                "object": "block",
                "type": "heading_1",
                "heading_1": {
                    "rich_text": [{"type": "text", "text": {"content": "Context Details"}}]
                }
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"ID: {context_obj['id']}"}}]
                }
            },
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Full Context (Never Truncated)"}}]
                }
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": context_obj["full_context"]}}]
                }
            },
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Speakers"}}]
                }
            },
            # Add blocks for each speaker's contributions
            *[{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {"type": "text", "text": {"content": f"{speaker['name']}: "}, "annotations": {"bold": True}},
                        {"type": "text", "text": {"content": segment["text"]}}
                    ]
                }
            } for speaker in context_obj["speakers"] for segment in speaker["segments"]],
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Emotional Markers"}}]
                }
            },
            # Add blocks for emotional markers
            *[{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"{marker['type']}: {marker['description']}"}}]
                }
            } for marker in context_obj["emotional_markers"]],
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Related Patterns"}}]
                }
            },
            # Add blocks for related patterns
            *[{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"ID: {related['id']}, Type: {related['relation_type']}, Strength: {related['strength']}"}}]
                }
            } for related in context_obj["related_patterns"]]
        ]
    )
    
    # Store Notion page ID in PostgreSQL for reference
    with db_connection() as conn:
        conn.execute("""
            INSERT INTO notion_syncs (
                id, task_id, notion_page_id, notion_database_id, 
                synced_at, status, context_ids
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            generate_unique_id(),
            None,  # No task associated
            response["id"],
            get_notion_contexts_database_id(),
            datetime.now(),
            "completed",
            json.dumps([context_obj["id"]])
        ))
    
    return response["id"]
```

## 5. Implementation Timeline

### Week 1: Enhanced Infrastructure Setup
- Day 1-2: Provision Linode VMs with increased specs for full context storage
- Day 3: Set up PostgreSQL database with enhanced schema for comprehensive context
- Day 4: Configure Redis Cloud paid tier with persistent storage
- Day 5: Set up Pinecone index with optimized configuration for context vectors

### Week 2: Context Preservation Implementation
- Day 1-2: Implement enhanced PostgreSQL schema with all relationship tables
- Day 3-4: Develop context extraction algorithm with full preservation guarantee
- Day 5: Implement emotional marker and speaker tracking systems

### Week 3: Persistence Layer Integration
- Day 1-2: Build Redis caching system for context objects
- Day 3: Implement PostgreSQL comprehensive storage
- Day 4-5: Develop Pinecone vector storage with complete metadata

### Week 4: Agent and Notion Integration
- Day 1-2: Update agent architecture for context-aware interactions
- Day 3-4: Implement Notion integration with full context preservation
- Day 5: Develop context bridging system between sessions

### Week 5: Testing and Verification
- Day 1-2: Test context extraction fidelity against preservation requirements
- Day 3: Test chronological and associative connection preservation
- Day 4: Verify emotional context preservation
- Day 5: End-to-end testing of the complete system

## 6. Verification Against Preservation Requirements

To ensure compliance with the fundamental principle of NEVER truncating or simplifying, we will implement the following test suite:

```python
# Test function to verify context preservation
def test_context_preservation():
    # Test 1: Verify context extraction maintains minimum ±5 paragraphs
    sample_text = load_sample_text()
    context_id = extract_with_full_context(sample_text, ["test pattern"])
    context = retrieve_context_by_id(context_id)
    
    # Count paragraphs before and after match
    paragraphs = split_into_paragraphs(context["full_context"])
    match_index = find_paragraph_with_match(paragraphs, context["match_text"])
    
    # Verify minimum context requirements
    assert match_index >= 5, "Not enough preceding paragraphs"
    assert len(paragraphs) - match_index - 1 >= 5, "Not enough following paragraphs"
    
    # Test 2: Verify complete story/example preservation
    story_sample = load_story_sample()
    story_context_id = extract_with_full_context(story_sample, ["story pattern"])
    story_context = retrieve_context_by_id(story_context_id)
    
    # Check if story boundaries are preserved
    assert story_context["full_context"].startswith(get_story_start(story_sample))
    assert story_context["full_context"].endswith(get_story_end(story_sample))
    
    # Test 3: Verify speaker identification
    conversation_sample = load_conversation_sample()
    conv_context_id = extract_with_full_context(conversation_sample, ["conversation pattern"])
    conv_context = retrieve_context_by_id(conv_context_id)
    
    # Verify all speakers are identified
    expected_speakers = get_speakers_in_sample(conversation_sample)
    actual_speakers = [s["name"] for s in conv_context["speakers"]]
    assert set(expected_speakers) == set(actual_speakers)
    
    # Test 4: Verify emotional markers preservation
    emotional_sample = load_emotional_sample()
    emotional_context_id = extract_with_full_context(emotional_sample, ["emotional pattern"])
    emotional_context = retrieve_context_by_id(emotional_context_id)
    
    # Verify emotional markers are preserved
    expected_markers = get_emotional_markers_in_sample(emotional_sample)
    actual_markers = [m["type"] for m in emotional_context["emotional_markers"]]
    assert set(expected_markers) == set(actual_markers)
    
    # Test 5: Verify chronological integrity
    sequential_samples = load_sequential_samples()
    context_ids = []
    for sample in sequential_samples:
        context_id = extract_with_full_context(sample["text"], ["sequential pattern"])
        context_ids.append(context_id)
    
    # Verify chronological links are established
    for i in range(1, len(context_ids)):
        current = retrieve_context_by_id(context_ids[i])
        previous = retrieve_context_by_id(context_ids[i-1])
        
        assert current["chronology"]["follows"] == previous["id"]
        assert previous["chronology"]["precedes"] == current["id"]
    
    # Test 6: Verify associative connections
    related_samples = load_related_samples()
    related_ids = []
    for sample in related_samples:
        context_id = extract_with_full_context(sample["text"], ["related pattern"])
        related_ids.append(context_id)
    
    # Verify connections are established
    for i in range(len(related_ids)):
        context = retrieve_context_by_id(related_ids[i])
        expected_relations = related_samples[i]["related_to"]
        actual_relations = [r["id"] for r in context["related_patterns"]]
        
        for expected in expected_relations:
            assert expected in actual_relations
    
    print("All preservation tests passed!")
```

## 7. Required API Credentials and Access

To implement this plan, we need:

1. **Redis Cloud**:
   - Redis Host URL
   - Redis Port
   - Redis Password
   - Redis Database Number

2. **Linode**:
   - Linode API token
   - SSH key for VM access
   - Preferred region for deployment

3. **Vercel**:
   - Vercel account access
   - Project ID or team ID
   - Deployment tokens

4. **API Keys**:
   - OpenAI API key
   - Anthropic API key
   - Slack API credentials
   - Notion API key
   - Pinecone API key

## 8. Security Considerations

- All API keys stored in Vercel Edge Config and SecondBrain API keys file
- JWT authentication for inter-agent communication
- VM-level firewall rules to restrict access
- Redis password protection and no public access
- PostgreSQL user permissions with limited scopes
- Regular database backups (at least daily)
- All network traffic encrypted using TLS
- VPC configuration for database communication

## 9. Reviewer Agent Approval Process

This implementation plan will be submitted to the Reviewer agent for approval. The Reviewer agent will evaluate:

1. Compliance with the Fundamental Principle of NEVER truncating or simplifying
2. Completeness of context preservation mechanisms
3. Integrity of emotional and chronological preservation
4. Scalability and performance considerations
5. Integration with the existing SecondBrain architecture

Upon approval, the implementation will proceed according to the timeline above, with regular check-ins with the Reviewer agent to ensure continued compliance with the preservation requirements.

## 10. Next Steps

1. Submit this plan to the Reviewer agent for approval
2. Upon approval, begin infrastructure provisioning
3. Implement the enhanced database schema
4. Develop the context extraction and storage system
5. Integrate with agents and Notion
6. Test thoroughly against preservation requirements
7. Deploy the complete system