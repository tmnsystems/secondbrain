-- SecondBrain Slack-Notion Integration Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    source VARCHAR(50) -- 'cli', 'slack', 'web'
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'agent'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    agent_id UUID, -- NULL for user/assistant
    parent_id UUID REFERENCES messages(id) -- for threading
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    status VARCHAR(50) NOT NULL, -- 'active', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    workflow_type VARCHAR(100),
    metadata JSONB
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
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
    metadata JSONB
);

-- Task Steps table
CREATE TABLE IF NOT EXISTS task_steps (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    description TEXT NOT NULL,
    agent VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB
);

-- Context table (for bridging context between sessions)
CREATE TABLE IF NOT EXISTS context_bridges (
    id UUID PRIMARY KEY,
    from_session_id UUID REFERENCES sessions(id),
    to_session_id UUID REFERENCES sessions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context_summary TEXT,
    context_data JSONB
);

-- Notion sync table
CREATE TABLE IF NOT EXISTS notion_syncs (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    notion_page_id VARCHAR(255),
    notion_database_id VARCHAR(255),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50)
);

-- Vector embeddings table (for Pinecone sync)
CREATE TABLE IF NOT EXISTS vector_embeddings (
    id UUID PRIMARY KEY,
    source_type VARCHAR(50), -- 'message', 'task', 'document'
    source_id UUID,
    embedding_id VARCHAR(255), -- ID in Pinecone
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_workflows_session_id ON workflows(session_id);
CREATE INDEX IF NOT EXISTS idx_context_bridges_from_session_id ON context_bridges(from_session_id);
CREATE INDEX IF NOT EXISTS idx_context_bridges_to_session_id ON context_bridges(to_session_id);
CREATE INDEX IF NOT EXISTS idx_notion_syncs_task_id ON notion_syncs(task_id);
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_source ON vector_embeddings(source_type, source_id);

-- Add timestamp triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vector embeddings updated_at trigger
CREATE TRIGGER update_vector_embeddings_timestamp
BEFORE UPDATE ON vector_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();