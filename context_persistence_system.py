#!/usr/bin/env python3
"""
Context Persistence System for SecondBrain

This system implements the critical context persistence layer for SecondBrain
following the fundamental principle of NEVER TRUNCATE OR SIMPLIFY.

It uses a three-layer architecture:
1. Redis - Short-term caching (active sessions)
2. PostgreSQL - Structured storage (medium-term)
3. Pinecone - Semantic vector search (long-term)

Key features:
- Full context extraction with minimum ±5 paragraphs
- Complete preservation of emotional markers
- Speaker identification and tracking
- Chronological integrity maintenance
- Session bridging for continuity
"""

import os
import sys
import json
import uuid
import asyncio
import datetime
import re
from typing import List, Dict, Any, Optional, Tuple, Union

# Third-party imports - using try/except to handle potential missing dependencies
try:
    import redis.asyncio as redis
    import asyncpg
    import pinecone
except ImportError as e:
    print(f"Error importing dependencies: {e}")
    print("Please install required packages: pip install redis asyncpg pinecone-client")
    sys.exit(1)

class ContextSystem:
    """
    Core context persistence system with three-layer architecture.
    Implements the NEVER TRUNCATE OR SIMPLIFY principle for all operations.
    """
    
    def __init__(self, config_path: str = None):
        """Initialize the context system with configuration."""
        self.config = self._load_config(config_path)
        self.redis_client = None
        self.pg_pool = None
        self.pinecone_client = None
        
    async def initialize(self):
        """Initialize all connections asynchronously."""
        # Initialize Redis connection
        self.redis_client = redis.Redis(
            host=self.config.get('redis', {}).get('host', 'localhost'),
            port=self.config.get('redis', {}).get('port', 6379),
            password=self.config.get('redis', {}).get('password'),
            db=self.config.get('redis', {}).get('db', 0),
            decode_responses=True
        )
        
        # Initialize PostgreSQL connection
        self.pg_pool = await asyncpg.create_pool(
            user=self.config.get('postgres', {}).get('user', 'postgres'),
            password=self.config.get('postgres', {}).get('password'),
            database=self.config.get('postgres', {}).get('database', 'secondbrain'),
            host=self.config.get('postgres', {}).get('host', 'localhost'),
            port=self.config.get('postgres', {}).get('port', 5432),
            min_size=5,
            max_size=20
        )
        
        # Initialize Pinecone
        api_key = self.config.get('pinecone', {}).get('api_key')
        if api_key:
            pinecone.init(
                api_key=api_key,
                environment=self.config.get('pinecone', {}).get('environment', 'us-west1-gcp')
            )
            index_name = self.config.get('pinecone', {}).get('index_name', 'secondbrain-context')
            self.pinecone_client = pinecone.Index(index_name)
        
        # Ensure database structure is set up
        await self._ensure_database_structure()
    
    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load configuration from file or environment variables."""
        config = {
            'redis': {
                'host': os.environ.get('REDIS_HOST', 'localhost'),
                'port': int(os.environ.get('REDIS_PORT', 6379)),
                'password': os.environ.get('REDIS_PASSWORD', None),
                'db': int(os.environ.get('REDIS_DB', 0))
            },
            'postgres': {
                'host': os.environ.get('POSTGRES_HOST', 'localhost'),
                'port': int(os.environ.get('POSTGRES_PORT', 5432)),
                'user': os.environ.get('POSTGRES_USER', 'postgres'),
                'password': os.environ.get('POSTGRES_PASSWORD', None),
                'database': os.environ.get('POSTGRES_DB', 'secondbrain')
            },
            'pinecone': {
                'api_key': os.environ.get('PINECONE_API_KEY', None),
                'environment': os.environ.get('PINECONE_ENVIRONMENT', 'us-west1-gcp'),
                'index_name': os.environ.get('PINECONE_INDEX', 'secondbrain-context')
            }
        }
        
        # Override with file config if provided
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                    # Merge configurations
                    for key, value in file_config.items():
                        if key in config and isinstance(value, dict):
                            config[key].update(value)
                        else:
                            config[key] = value
            except Exception as e:
                print(f"Error loading config file: {e}")
        
        return config
    
    async def _ensure_database_structure(self):
        """Create database tables if they don't exist."""
        if not self.pg_pool:
            return False
            
        # Define the schema based on our comprehensive storage requirements
        schema = """
        -- Create schema if not exists
        CREATE SCHEMA IF NOT EXISTS context_system;
        
        -- Users table
        CREATE TABLE IF NOT EXISTS context_system.users (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sessions table
        CREATE TABLE IF NOT EXISTS context_system.sessions (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES context_system.users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            source VARCHAR(50), -- 'cli', 'slack', 'web'
            context_level VARCHAR(20) DEFAULT 'full' -- 'full', 'extended'
        );
        
        -- Messages table
        CREATE TABLE IF NOT EXISTS context_system.messages (
            id UUID PRIMARY KEY,
            session_id UUID REFERENCES context_system.sessions(id),
            role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'agent'
            content TEXT NOT NULL, -- Full message content, never truncated
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            agent_id UUID,  -- NULL for user/assistant
            parent_id UUID REFERENCES context_system.messages(id), -- for threading
            has_context BOOLEAN DEFAULT FALSE
        );
        
        -- Context table (comprehensive, never truncated)
        CREATE TABLE IF NOT EXISTS context_system.contexts (
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
        CREATE TABLE IF NOT EXISTS context_system.context_speakers (
            id UUID PRIMARY KEY,
            context_id UUID REFERENCES context_system.contexts(id),
            speaker_name VARCHAR(255) NOT NULL,
            text TEXT NOT NULL,
            position_start INTEGER,
            position_end INTEGER
        );
        
        -- Domain Tags relation
        CREATE TABLE IF NOT EXISTS context_system.context_domain_tags (
            id UUID REFERENCES context_system.contexts(id),
            tag VARCHAR(50) NOT NULL,
            PRIMARY KEY (id, tag)
        );
        
        -- Emotional Markers
        CREATE TABLE IF NOT EXISTS context_system.context_emotional_markers (
            id UUID PRIMARY KEY,
            context_id UUID REFERENCES context_system.contexts(id),
            marker_type VARCHAR(50) NOT NULL, -- 'emphasis', 'pause', 'tone_shift'
            position_start INTEGER,
            position_end INTEGER,
            description TEXT
        );
        
        -- Related Patterns
        CREATE TABLE IF NOT EXISTS context_system.related_patterns (
            source_context_id UUID REFERENCES context_system.contexts(id),
            target_context_id UUID REFERENCES context_system.contexts(id),
            relation_type VARCHAR(50), -- 'explicit', 'implicit', 'chronological'
            strength FLOAT, -- 0.0 to 1.0
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (source_context_id, target_context_id)
        );
        
        -- Message-Context relations
        CREATE TABLE IF NOT EXISTS context_system.message_contexts (
            message_id UUID REFERENCES context_system.messages(id),
            context_id UUID REFERENCES context_system.contexts(id),
            relevance_score FLOAT, -- 0.0 to 1.0
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (message_id, context_id)
        );
        
        -- Context Chronology
        CREATE TABLE IF NOT EXISTS context_system.context_chronology (
            id UUID PRIMARY KEY,
            context_id UUID REFERENCES context_system.contexts(id),
            sequence_position INTEGER,
            precedes_context_id UUID REFERENCES context_system.contexts(id),
            follows_context_id UUID REFERENCES context_system.contexts(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Context bridges (for bridging context between sessions)
        CREATE TABLE IF NOT EXISTS context_system.context_bridges (
            id UUID PRIMARY KEY,
            from_session_id UUID REFERENCES context_system.sessions(id),
            to_session_id UUID REFERENCES context_system.sessions(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            context_summary TEXT,
            context_data JSONB, -- Full context data, never truncated
            included_context_ids JSONB -- Array of context IDs included in bridge
        );
        
        -- Notion sync table
        CREATE TABLE IF NOT EXISTS context_system.notion_syncs (
            id UUID PRIMARY KEY,
            context_id UUID REFERENCES context_system.contexts(id),
            notion_page_id VARCHAR(255),
            notion_database_id VARCHAR(255),
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50)
        );
        
        -- Vector embeddings table (for Pinecone sync)
        CREATE TABLE IF NOT EXISTS context_system.vector_embeddings (
            id UUID PRIMARY KEY,
            source_type VARCHAR(50), -- 'message', 'context', 'task', 'document'
            source_id UUID,
            embedding_id VARCHAR(255), -- ID in Pinecone
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            metadata JSONB
        );
        """
        
        async with self.pg_pool.acquire() as conn:
            await conn.execute(schema)
        
        return True
    
    async def extract_with_full_context(self, text: str, pattern_indicators: List[str], source_info: Dict[str, Any] = None) -> List[str]:
        """
        Extract context around pattern indicators with the NEVER TRUNCATE OR SIMPLIFY principle.
        
        Args:
            text: The full text to extract context from
            pattern_indicators: List of patterns to identify in the text
            source_info: Additional information about the source
            
        Returns:
            List of context IDs for the extracted contexts
        """
        if not text or not pattern_indicators:
            return []
            
        # Split text into paragraphs (respecting various line endings)
        paragraphs = re.split(r'\n\s*\n', text)
        
        # Find all pattern indicators in the text
        context_ids = []
        for pattern in pattern_indicators:
            matches = self._find_pattern_matches(text, pattern)
            
            for match in matches:
                # Get paragraph containing the match
                containing_paragraph_idx, containing_paragraph = self._find_containing_paragraph(paragraphs, match)
                
                if containing_paragraph_idx is None:
                    continue
                
                # Get surrounding context (minimum ±5 paragraphs, NEVER truncate)
                # Start with minimum 5 paragraphs before
                start_idx = max(0, containing_paragraph_idx - 5)
                # Add minimum 5 paragraphs after
                end_idx = min(len(paragraphs), containing_paragraph_idx + 6)
                
                # Extend if needed for complete story/example
                # This ensures we never truncate in the middle of a coherent unit
                start_idx = self._extend_to_complete_unit(paragraphs, start_idx, "backward")
                end_idx = self._extend_to_complete_unit(paragraphs, end_idx, "forward")
                
                # Get the context paragraphs
                context_paragraphs = paragraphs[start_idx:end_idx]
                
                # Identify speakers and emotional markers
                speakers = self._identify_speakers(context_paragraphs)
                emotional_markers = self._extract_emotional_markers(context_paragraphs)
                
                # Build full context
                full_context = "\n\n".join(context_paragraphs)
                
                # Extend context if needed for complete understanding
                extended_context = None
                if self._needs_extended_context(full_context, pattern):
                    # Find more context that might be needed for complete understanding
                    extended_context = self._extract_additional_context(paragraphs, start_idx, end_idx)
                
                # Create context object
                context_id = str(uuid.uuid4())
                context_obj = {
                    "id": context_id,
                    "pattern_type": self._identify_pattern_type(pattern),
                    "match_text": match,
                    "full_context": full_context,
                    "extended_context": extended_context,
                    "speakers": speakers,
                    "source": source_info or {},
                    "domain_tags": self._identify_domain_tags(full_context),
                    "emotional_markers": emotional_markers,
                    "related_patterns": [],  # Will be populated later
                    "timestamps": {
                        "extracted": datetime.datetime.now().isoformat(),
                        "original": source_info.get("date") if source_info else None
                    }
                }
                
                # Store in all three layers
                await self.store_context(
                    context_id=context_id,
                    context_data=context_obj,
                    source_info=source_info
                )
                
                context_ids.append(context_id)
        
        return context_ids
    
    def _find_pattern_matches(self, text: str, pattern: str) -> List[str]:
        """Find all occurrences of pattern in text."""
        # Basic substring search
        matches = []
        start = 0
        while True:
            start = text.find(pattern, start)
            if start == -1:
                break
            # Extract a bit of surrounding context for the match
            match_start = max(0, start - 50)
            match_end = min(len(text), start + len(pattern) + 50)
            matches.append(text[match_start:match_end])
            start += len(pattern)
        
        # If no exact matches, try regex for more fuzzy matching
        if not matches:
            try:
                pattern_re = re.compile(pattern, re.IGNORECASE)
                for match in pattern_re.finditer(text):
                    match_start = max(0, match.start() - 50)
                    match_end = min(len(text), match.end() + 50)
                    matches.append(text[match_start:match_end])
            except re.error:
                # Not a valid regex, stick with string matching
                pass
        
        return matches
    
    def _find_containing_paragraph(self, paragraphs: List[str], match_text: str) -> Tuple[Optional[int], Optional[str]]:
        """Find the paragraph containing the match."""
        for i, paragraph in enumerate(paragraphs):
            if match_text in paragraph:
                return i, paragraph
        return None, None
    
    def _extend_to_complete_unit(self, paragraphs: List[str], idx: int, direction: str) -> int:
        """
        Extend the context range to include complete stories/examples.
        This ensures we never truncate in the middle of a coherent unit.
        """
        if direction == "backward":
            # Look for story beginning markers
            story_begin_markers = ["once upon a time", "let me tell you", "here's an example", 
                                   "for instance", "consider this", "let's say", "imagine"]
            i = idx
            while i > 0:
                # Check if this paragraph might be a beginning
                paragraph = paragraphs[i-1].lower()
                if any(marker in paragraph for marker in story_begin_markers):
                    idx = i - 1
                    i -= 1
                    continue
                
                # Check if we're already at a natural boundary
                if paragraph.strip() == "" or paragraph.strip().endswith((".", "!", "?")):
                    break
                
                # Otherwise include the previous paragraph
                idx = i - 1
                i -= 1
            
            return max(0, idx)
            
        elif direction == "forward":
            # Look for story ending markers
            story_end_markers = ["in conclusion", "to summarize", "that's how", "the end", 
                                "finally", "in the end", "so that's"]
            i = idx
            while i < len(paragraphs):
                # Check if we've found an ending
                paragraph = paragraphs[i-1].lower() if i > 0 else ""
                if any(marker in paragraph for marker in story_end_markers):
                    idx = i
                    i += 1
                    continue
                
                # Check if the next paragraph is a new topic
                if i < len(paragraphs) - 1:
                    next_paragraph = paragraphs[i].lower()
                    if next_paragraph.startswith(("now,", "next,", "moving on", "let's discuss")):
                        break
                
                # Otherwise include the next paragraph
                idx = i + 1
                i += 1
            
            return min(len(paragraphs), idx)
        
        return idx
    
    def _identify_speakers(self, paragraphs: List[str]) -> List[Dict[str, Any]]:
        """
        Identify speakers in the context.
        Returns a list of speakers with their name and segments.
        """
        speakers = {}
        
        # Look for common dialogue patterns
        dialogue_patterns = [
            r'(?P<name>[A-Z][a-z]+):\s+"(?P<text>.+?)"',  # Name: "Text"
            r'(?P<name>[A-Z][a-z]+):\s+(?P<text>.+)',     # Name: Text
            r'"(?P<text>.+?)" said (?P<name>[A-Z][a-z]+)', # "Text" said Name
            r'(?P<name>[A-Z][a-z]+) said, "(?P<text>.+?)"', # Name said, "Text"
        ]
        
        for i, paragraph in enumerate(paragraphs):
            for pattern in dialogue_patterns:
                for match in re.finditer(pattern, paragraph):
                    name = match.group('name')
                    text = match.group('text')
                    
                    if name not in speakers:
                        speakers[name] = {
                            "name": name,
                            "segments": []
                        }
                    
                    speakers[name]["segments"].append({
                        "text": text,
                        "position": [match.start(), match.end()]
                    })
        
        return list(speakers.values())
    
    def _extract_emotional_markers(self, paragraphs: List[str]) -> List[Dict[str, Any]]:
        """
        Extract emotional markers (emphasis, pauses, tone shifts) from the context.
        """
        markers = []
        
        # Patterns for emotional markers
        emphasis_patterns = [
            r'\*\*(?P<text>.+?)\*\*',         # **emphasized**
            r'_(?P<text>.+?)_',               # _emphasized_
            r'IMPORTANT:?\s+(?P<text>.+)',    # IMPORTANT: text
            r'NOTE:?\s+(?P<text>.+)',         # NOTE: text
            r'(?P<text>.+?)!'                 # text!
        ]
        
        pause_patterns = [
            r'\.\.\.+',                       # ...
            r'—',                             # em dash
            r'\(pause\)',                     # (pause)
            r'\(silence\)',                   # (silence)
        ]
        
        tone_shift_patterns = [
            r'\(laughs?\)',                   # (laugh)
            r'\(smiles?\)',                   # (smile)
            r'\(sighs?\)',                    # (sigh)
            r'\(frustrated\)',                # (frustrated)
            r'\(excited\)',                   # (excited)
        ]
        
        # Extract emphasis
        for i, paragraph in enumerate(paragraphs):
            # Look for emphasis
            for pattern in emphasis_patterns:
                for match in re.finditer(pattern, paragraph):
                    if 'text' in match.groupdict():
                        text = match.group('text')
                    else:
                        text = match.group(0)
                    
                    markers.append({
                        "type": "emphasis",
                        "position": [match.start(), match.end()],
                        "description": f"Emphasis on: {text}"
                    })
            
            # Look for pauses
            for pattern in pause_patterns:
                for match in re.finditer(pattern, paragraph):
                    markers.append({
                        "type": "pause",
                        "position": [match.start(), match.end()],
                        "description": "Pause or hesitation"
                    })
            
            # Look for tone shifts
            for pattern in tone_shift_patterns:
                for match in re.finditer(pattern, paragraph):
                    markers.append({
                        "type": "tone_shift",
                        "position": [match.start(), match.end()],
                        "description": f"Tone shift: {match.group(0)}"
                    })
        
        return markers
    
    def _needs_extended_context(self, context: str, pattern: str) -> bool:
        """Determine if the context needs additional context for complete understanding."""
        # Check for markers of incomplete stories
        incomplete_markers = [
            "as I mentioned earlier",
            "as we discussed",
            "going back to",
            "to continue from",
            "referencing",
            "previously",
        ]
        
        return any(marker in context.lower() for marker in incomplete_markers)
    
    def _extract_additional_context(self, paragraphs: List[str], start_idx: int, end_idx: int) -> Optional[str]:
        """Extract additional context if needed for complete understanding."""
        # Start with a wider range
        extended_start = max(0, start_idx - 10)
        extended_end = min(len(paragraphs), end_idx + 10)
        
        # Only include if significantly different from main context
        if extended_start < start_idx or extended_end > end_idx:
            return "\n\n".join(
                paragraphs[extended_start:start_idx] + 
                paragraphs[end_idx:extended_end]
            )
        
        return None
    
    def _identify_pattern_type(self, pattern: str) -> str:
        """Identify the type of pattern."""
        pattern_lower = pattern.lower()
        
        # Simple heuristic for pattern type
        if any(word in pattern_lower for word in ["like", "as if", "similar", "compare"]):
            return "metaphor"
        elif any(word in pattern_lower for word in ["value", "believe", "important", "matter"]):
            return "value"
        elif any(word in pattern_lower for word in ["framework", "structure", "system", "process"]):
            return "framework"
        elif any(word in pattern_lower for word in ["teach", "learn", "explain", "understand"]):
            return "teaching"
        else:
            return "general"
    
    def _identify_domain_tags(self, text: str) -> List[str]:
        """
        Identify domain tags for the context.
        Using a simple keyword-based approach.
        """
        domains = []
        domain_keywords = {
            "business": ["business", "company", "entrepreneur", "startup", "profit", "revenue"],
            "marketing": ["marketing", "advertising", "promotion", "audience", "customer"],
            "finance": ["finance", "money", "invest", "budget", "cash flow", "income"],
            "technology": ["technology", "software", "hardware", "code", "program", "app"],
            "leadership": ["leadership", "manage", "team", "delegate", "vision", "strategy"],
            "personal_development": ["growth", "mindset", "habit", "improve", "goal", "learn"],
            "productivity": ["productivity", "efficient", "system", "process", "optimize", "workflow"],
            "communication": ["communicate", "message", "speak", "listen", "conversation"],
        }
        
        text_lower = text.lower()
        for domain, keywords in domain_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                domains.append(domain)
        
        return domains
    
    async def store_context(self, context_id: str, context_data: Dict[str, Any], source_info: Dict[str, Any] = None) -> bool:
        """
        Store context in all three persistence layers.
        
        Args:
            context_id: Unique identifier for the context
            context_data: The full context data to store (NEVER truncated)
            source_info: Additional information about the source
            
        Returns:
            bool: Success status
        """
        # 1. Store in Redis (short-term cache)
        redis_key = f"context:{context_id}"
        if self.redis_client:
            await self.redis_client.set(
                redis_key, 
                json.dumps(context_data),
                ex=86400  # 24-hour expiration
            )
        
        # 2. Store in PostgreSQL (comprehensive storage)
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                # Begin transaction
                async with conn.transaction():
                    # Insert main context record
                    await conn.execute("""
                        INSERT INTO context_system.contexts (
                            id, pattern_type, match_text, full_context, extended_context,
                            source_file, recording_date, session_type, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """, 
                        context_id,
                        context_data.get("pattern_type", "general"),
                        context_data.get("match_text", ""),
                        context_data.get("full_context", ""),
                        context_data.get("extended_context"),
                        context_data.get("source", {}).get("file"),
                        context_data.get("source", {}).get("date"),
                        context_data.get("source", {}).get("session_type"),
                        datetime.datetime.now(),
                        datetime.datetime.now()
                    )
                    
                    # Store speakers
                    for speaker in context_data.get("speakers", []):
                        for segment in speaker.get("segments", []):
                            speaker_id = str(uuid.uuid4())
                            await conn.execute("""
                                INSERT INTO context_system.context_speakers (
                                    id, context_id, speaker_name, text, position_start, position_end
                                ) VALUES ($1, $2, $3, $4, $5, $6)
                            """,
                                speaker_id,
                                context_id,
                                speaker.get("name", ""),
                                segment.get("text", ""),
                                segment.get("position", [0, 0])[0],
                                segment.get("position", [0, 0])[1]
                            )
                    
                    # Store domain tags
                    for tag in context_data.get("domain_tags", []):
                        await conn.execute("""
                            INSERT INTO context_system.context_domain_tags (id, tag)
                            VALUES ($1, $2)
                            ON CONFLICT (id, tag) DO NOTHING
                        """, context_id, tag)
                    
                    # Store emotional markers
                    for marker in context_data.get("emotional_markers", []):
                        marker_id = str(uuid.uuid4())
                        await conn.execute("""
                            INSERT INTO context_system.context_emotional_markers (
                                id, context_id, marker_type, position_start, position_end, description
                            ) VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                            marker_id,
                            context_id,
                            marker.get("type", ""),
                            marker.get("position", [0, 0])[0],
                            marker.get("position", [0, 0])[1],
                            marker.get("description", "")
                        )
                    
                    # Store related patterns if any
                    for related in context_data.get("related_patterns", []):
                        await conn.execute("""
                            INSERT INTO context_system.related_patterns (
                                source_context_id, target_context_id, relation_type, strength, created_at
                            ) VALUES ($1, $2, $3, $4, $5)
                            ON CONFLICT (source_context_id, target_context_id) DO NOTHING
                        """,
                            context_id,
                            related.get("id", ""),
                            related.get("relation_type", "explicit"),
                            related.get("strength", 1.0),
                            datetime.datetime.now()
                        )
                    
                    # Store chronology if present
                    if "chronology" in context_data and context_data["chronology"]:
                        chron_id = str(uuid.uuid4())
                        await conn.execute("""
                            INSERT INTO context_system.context_chronology (
                                id, context_id, sequence_position, 
                                precedes_context_id, follows_context_id, created_at
                            ) VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                            chron_id,
                            context_id,
                            context_data["chronology"].get("sequence_position", 0),
                            context_data["chronology"].get("precedes"),
                            context_data["chronology"].get("follows"),
                            datetime.datetime.now()
                        )
        
        # 3. Store in Pinecone (for semantic search)
        if self.pinecone_client:
            try:
                # Generate embedding vector (simplified here, would use OpenAI or similar in prod)
                vector = self._generate_dummy_embedding(context_data.get("full_context", ""))
                
                # Prepare metadata (limited to Pinecone's metadata size limits)
                metadata = {
                    "id": context_id,
                    "type": context_data.get("pattern_type", "general"),
                    "source_type": source_info.get("type") if source_info else "unknown",
                    "timestamp": context_data.get("timestamps", {}).get("extracted"),
                    "domains": context_data.get("domain_tags", [])[:10],  # Limit for metadata size
                }
                
                # Store in Pinecone
                self.pinecone_client.upsert(
                    vectors=[(context_id, vector, metadata)],
                    namespace="contexts"
                )
            except Exception as e:
                print(f"Error storing in Pinecone: {e}")
                # Continue even if Pinecone fails, as we've stored in other layers
        
        return True
    
    def _generate_dummy_embedding(self, text: str) -> List[float]:
        """
        Generate a dummy embedding vector for testing.
        In production, this would use a proper embedding model.
        """
        import hashlib
        import numpy as np
        
        # Generate a simple hash-based embedding
        hash_obj = hashlib.md5(text.encode('utf-8'))
        hash_bytes = hash_obj.digest()
        
        # Convert bytes to floats in the range [-1, 1]
        vec = []
        for b in hash_bytes:
            vec.append((float(b) / 128.0) - 1.0)
        
        # Pad or truncate to 1536 dimensions (OpenAI's dimension size)
        while len(vec) < 1536:
            vec.extend(vec[:1536-len(vec)])
        
        return vec[:1536]
    
    async def retrieve_context_by_id(self, context_id: str) -> Dict[str, Any]:
        """
        Retrieve full context by ID from the persistence system.
        
        Args:
            context_id: ID of the context to retrieve
            
        Returns:
            The complete context object (NEVER truncated)
        """
        # 1. Try Redis first (fastest)
        if self.redis_client:
            redis_key = f"context:{context_id}"
            redis_result = await self.redis_client.get(redis_key)
            if redis_result:
                try:
                    return json.loads(redis_result)
                except json.JSONDecodeError:
                    pass
        
        # 2. Try PostgreSQL next (comprehensive)
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                # Get main context record
                context_record = await conn.fetchrow("""
                    SELECT * FROM context_system.contexts WHERE id = $1
                """, context_id)
                
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
                        "date": context_record["recording_date"].isoformat() if context_record["recording_date"] else None,
                        "session_type": context_record["session_type"]
                    },
                    "timestamps": {
                        "extracted": context_record["created_at"].isoformat(),
                        "updated": context_record["updated_at"].isoformat() if context_record["updated_at"] else None
                    }
                }
                
                # Get speakers
                speakers_records = await conn.fetch("""
                    SELECT * FROM context_system.context_speakers WHERE context_id = $1
                """, context_id)
                
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
                tags_records = await conn.fetch("""
                    SELECT tag FROM context_system.context_domain_tags WHERE id = $1
                """, context_id)
                
                context_obj["domain_tags"] = [record["tag"] for record in tags_records]
                
                # Get emotional markers
                markers_records = await conn.fetch("""
                    SELECT * FROM context_system.context_emotional_markers WHERE context_id = $1
                """, context_id)
                
                context_obj["emotional_markers"] = [{
                    "type": record["marker_type"],
                    "position": [record["position_start"], record["position_end"]],
                    "description": record["description"]
                } for record in markers_records]
                
                # Get related patterns
                related_records = await conn.fetch("""
                    SELECT * FROM context_system.related_patterns WHERE source_context_id = $1
                """, context_id)
                
                context_obj["related_patterns"] = [{
                    "id": record["target_context_id"],
                    "relation_type": record["relation_type"],
                    "strength": float(record["strength"])
                } for record in related_records]
                
                # Get chronology
                chronology_record = await conn.fetchrow("""
                    SELECT * FROM context_system.context_chronology WHERE context_id = $1
                """, context_id)
                
                if chronology_record:
                    context_obj["chronology"] = {
                        "sequence_position": chronology_record["sequence_position"],
                        "precedes": chronology_record["precedes_context_id"],
                        "follows": chronology_record["follows_context_id"]
                    }
                
                # Store in Redis for future fast access
                if self.redis_client:
                    redis_key = f"context:{context_id}"
                    await self.redis_client.set(
                        redis_key, 
                        json.dumps(context_obj),
                        ex=86400  # 24-hour expiration
                    )
                
                return context_obj
        
        return None
    
    async def search_contexts(self, query: str, limit: int = 5, filter_tags: List[str] = None) -> List[Dict[str, Any]]:
        """
        Search for contexts semantically related to the query.
        
        Args:
            query: The search query
            limit: Maximum number of results to return
            filter_tags: Optional list of domain tags to filter by
            
        Returns:
            List of context objects (NEVER truncated)
        """
        if not query:
            return []
        
        # 1. Try Pinecone for semantic search
        if self.pinecone_client:
            try:
                # Generate query embedding
                query_embedding = self._generate_dummy_embedding(query)
                
                # Prepare filter if tags provided
                filter_expr = None
                if filter_tags:
                    filter_expr = {"domains": {"$in": filter_tags}}
                
                # Search in Pinecone
                search_results = self.pinecone_client.query(
                    namespace="contexts",
                    vector=query_embedding,
                    top_k=limit,
                    filter=filter_expr,
                    include_metadata=True
                )
                
                # Get full contexts for top results
                contexts = []
                for match in search_results.get("matches", []):
                    context_id = match["id"]
                    # Get full context with all relations
                    context = await self.retrieve_context_by_id(context_id)
                    if context:
                        # Add match score to context
                        context["match_score"] = match["score"]
                        contexts.append(context)
                
                return contexts
            
            except Exception as e:
                print(f"Error searching Pinecone: {e}")
                # Fall back to PostgreSQL text search
        
        # 2. Fall back to PostgreSQL text search
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                # Simple text search using pattern matching
                query_pattern = f"%{query}%"
                
                # Build the WHERE clause
                where_clause = """
                    full_context ILIKE $1 OR
                    match_text ILIKE $1 OR
                    extended_context ILIKE $1
                """
                
                params = [query_pattern]
                
                # Add filter for tags if provided
                if filter_tags:
                    placeholders = []
                    for i, tag in enumerate(filter_tags):
                        placeholders.append(f"${i+2}")
                        params.append(tag)
                    
                    tag_filter = f"""
                        AND id IN (
                            SELECT id FROM context_system.context_domain_tags
                            WHERE tag IN ({','.join(placeholders)})
                        )
                    """
                    where_clause += tag_filter
                
                # Execute the query
                records = await conn.fetch(f"""
                    SELECT id FROM context_system.contexts
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT $%s
                """, *params, limit)
                
                # Get full contexts for results
                contexts = []
                for record in records:
                    context = await self.retrieve_context_by_id(record["id"])
                    if context:
                        contexts.append(context)
                
                return contexts
        
        return []
    
    async def create_session(self, source: str, user_id: str = None) -> str:
        """
        Create a new session for context tracking.
        
        Args:
            source: Source of the session ('cli', 'slack', 'web')
            user_id: Optional user ID
            
        Returns:
            session_id: ID of the created session
        """
        session_id = str(uuid.uuid4())
        
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                # Ensure user exists if provided
                if user_id:
                    user_exists = await conn.fetchval("""
                        SELECT COUNT(*) FROM context_system.users WHERE id = $1
                    """, user_id)
                    
                    if not user_exists:
                        user_id = None
                
                # Create session
                await conn.execute("""
                    INSERT INTO context_system.sessions (id, user_id, created_at, source)
                    VALUES ($1, $2, $3, $4)
                """, session_id, user_id, datetime.datetime.now(), source)
        
        # Cache in Redis
        if self.redis_client:
            session_data = {
                "id": session_id,
                "user_id": user_id,
                "created_at": datetime.datetime.now().isoformat(),
                "source": source
            }
            await self.redis_client.set(
                f"session:{session_id}",
                json.dumps(session_data),
                ex=86400  # 24-hour expiration
            )
        
        return session_id
    
    async def create_session_bridge(self, from_session_id: str, to_session_id: str) -> Dict[str, Any]:
        """
        Bridge context between sessions for continuity.
        This is CRITICAL for maintaining context between CLI sessions.
        
        Args:
            from_session_id: Source session ID
            to_session_id: Target session ID
            
        Returns:
            bridge_id: ID of the created bridge
        """
        bridge_id = str(uuid.uuid4())
        
        # Get contexts from source session
        context_ids = await self.get_session_context_ids(from_session_id)
        contexts = []
        
        for context_id in context_ids:
            context = await self.retrieve_context_by_id(context_id)
            if context:
                contexts.append(context)
        
        # Get messages from source session
        messages = await self.get_session_messages(from_session_id)
        
        # Create summary of session
        summary = self._summarize_session(messages, contexts)
        
        # Store bridge in database
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO context_system.context_bridges (
                        id, from_session_id, to_session_id, created_at,
                        context_summary, context_data, included_context_ids
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                    bridge_id,
                    from_session_id,
                    to_session_id,
                    datetime.datetime.now(),
                    summary,
                    json.dumps(messages),
                    json.dumps([c["id"] for c in contexts])
                )
        
        # Store in Redis for immediate access
        if self.redis_client:
            bridge_data = {
                "id": bridge_id,
                "from_session_id": from_session_id,
                "to_session_id": to_session_id,
                "created_at": datetime.datetime.now().isoformat(),
                "summary": summary,
                "context_ids": [c["id"] for c in contexts]
            }
            await self.redis_client.set(
                f"bridge:{bridge_id}",
                json.dumps(bridge_data),
                ex=86400  # 24-hour expiration
            )
        
        return {
            "bridge_id": bridge_id,
            "from_session_id": from_session_id,
            "to_session_id": to_session_id,
            "context_count": len(contexts),
            "summary": summary
        }
    
    async def get_session_context_ids(self, session_id: str) -> List[str]:
        """Get all context IDs associated with a session."""
        context_ids = []
        
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                # Get contexts from messages in this session
                records = await conn.fetch("""
                    SELECT DISTINCT context_id FROM context_system.message_contexts
                    WHERE message_id IN (
                        SELECT id FROM context_system.messages WHERE session_id = $1
                    )
                """, session_id)
                
                context_ids = [str(record["context_id"]) for record in records]
                
                # Also get contexts directly associated with session
                direct_records = await conn.fetch("""
                    SELECT id FROM context_system.contexts
                    WHERE source_file = $1 OR source_file LIKE $2
                """, session_id, f"%{session_id}%")
                
                for record in direct_records:
                    if str(record["id"]) not in context_ids:
                        context_ids.append(str(record["id"]))
                
                # Get contexts from bridges
                bridge_records = await conn.fetch("""
                    SELECT included_context_ids FROM context_system.context_bridges
                    WHERE to_session_id = $1
                """, session_id)
                
                for record in bridge_records:
                    if record["included_context_ids"]:
                        bridge_contexts = json.loads(record["included_context_ids"])
                        for ctx_id in bridge_contexts:
                            if ctx_id not in context_ids:
                                context_ids.append(ctx_id)
        
        return context_ids
    
    async def get_session_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all messages in a session."""
        messages = []
        
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                records = await conn.fetch("""
                    SELECT * FROM context_system.messages
                    WHERE session_id = $1
                    ORDER BY created_at ASC
                """, session_id)
                
                for record in records:
                    messages.append({
                        "id": str(record["id"]),
                        "role": record["role"],
                        "content": record["content"],  # NEVER truncate
                        "created_at": record["created_at"].isoformat(),
                        "agent_id": str(record["agent_id"]) if record["agent_id"] else None,
                        "parent_id": str(record["parent_id"]) if record["parent_id"] else None,
                    })
        
        return messages
    
    def _summarize_session(self, messages: List[Dict[str, Any]], contexts: List[Dict[str, Any]]) -> str:
        """
        Create a summary of the session for bridging.
        Note: In production, this would use an LLM for better summarization.
        """
        if not messages:
            return "No messages in session."
        
        # Extract key information
        user_messages = [m for m in messages if m["role"] == "user"]
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        
        summary = f"Session with {len(messages)} total messages ({len(user_messages)} user, {len(assistant_messages)} assistant).\n\n"
        
        if user_messages:
            # Summarize first user message
            first_user = user_messages[0]
            summary += f"Started with user query: {first_user['content'][:200]}...\n\n"
            
            # Summarize last user message
            last_user = user_messages[-1]
            summary += f"Ended with user query: {last_user['content'][:200]}...\n\n"
        
        # Summarize contexts
        if contexts:
            summary += f"Session includes {len(contexts)} context objects:\n"
            for i, context in enumerate(contexts[:5]):  # Limit to first 5
                summary += f"- {context['pattern_type']}: {context['match_text'][:100]}...\n"
            
            if len(contexts) > 5:
                summary += f"- And {len(contexts) - 5} more context objects...\n"
        
        return summary
    
    async def delete_context(self, context_id: str) -> bool:
        """
        Delete a context from all persistence layers.
        
        Args:
            context_id: ID of the context to delete
            
        Returns:
            bool: Success status
        """
        # Delete from Redis
        if self.redis_client:
            await self.redis_client.delete(f"context:{context_id}")
        
        # Delete from PostgreSQL
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                async with conn.transaction():
                    # Delete related records first
                    await conn.execute("""
                        DELETE FROM context_system.context_speakers
                        WHERE context_id = $1
                    """, context_id)
                    
                    await conn.execute("""
                        DELETE FROM context_system.context_domain_tags
                        WHERE id = $1
                    """, context_id)
                    
                    await conn.execute("""
                        DELETE FROM context_system.context_emotional_markers
                        WHERE context_id = $1
                    """, context_id)
                    
                    await conn.execute("""
                        DELETE FROM context_system.related_patterns
                        WHERE source_context_id = $1 OR target_context_id = $1
                    """, context_id)
                    
                    await conn.execute("""
                        DELETE FROM context_system.context_chronology
                        WHERE context_id = $1
                    """, context_id)
                    
                    await conn.execute("""
                        DELETE FROM context_system.message_contexts
                        WHERE context_id = $1
                    """, context_id)
                    
                    # Finally delete the main context record
                    await conn.execute("""
                        DELETE FROM context_system.contexts
                        WHERE id = $1
                    """, context_id)
        
        # Delete from Pinecone
        if self.pinecone_client:
            try:
                self.pinecone_client.delete(ids=[context_id], namespace="contexts")
            except Exception as e:
                print(f"Error deleting from Pinecone: {e}")
        
        return True
    
    async def close(self):
        """Close all connections properly."""
        if self.redis_client:
            await self.redis_client.close()
        
        if self.pg_pool:
            await self.pg_pool.close()

# Command-line interface
async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="SecondBrain Context Persistence System")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Extract command
    extract_parser = subparsers.add_parser("extract", help="Extract context from a file")
    extract_parser.add_argument("file", help="File to extract context from")
    extract_parser.add_argument("--patterns", nargs="+", help="Pattern indicators to search for")
    
    # Retrieve command
    retrieve_parser = subparsers.add_parser("retrieve", help="Retrieve context by ID")
    retrieve_parser.add_argument("context_id", help="Context ID to retrieve")
    
    # Search command
    search_parser = subparsers.add_parser("search", help="Search for contexts")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--tags", nargs="+", help="Domain tags to filter by")
    search_parser.add_argument("--limit", type=int, default=5, help="Maximum number of results")
    
    # Bridge command
    bridge_parser = subparsers.add_parser("bridge", help="Create a session bridge")
    bridge_parser.add_argument("from_session", help="Source session ID")
    bridge_parser.add_argument("to_session", help="Target session ID")
    
    # Parse args
    args = parser.parse_args()
    
    # Initialize context system
    context_system = ContextSystem()
    await context_system.initialize()
    
    try:
        # Execute command
        if args.command == "extract":
            if not args.file or not args.patterns:
                print("Error: File and patterns are required")
                return
                
            with open(args.file, "r") as f:
                text = f.read()
                
            source_info = {
                "file": args.file,
                "date": datetime.datetime.now().isoformat(),
                "type": "file"
            }
            
            context_ids = await context_system.extract_with_full_context(
                text, args.patterns, source_info
            )
            
            print(f"Extracted {len(context_ids)} contexts:")
            for context_id in context_ids:
                print(f"- {context_id}")
                
        elif args.command == "retrieve":
            context = await context_system.retrieve_context_by_id(args.context_id)
            if context:
                print(f"Context {args.context_id}:")
                print(f"Type: {context['pattern_type']}")
                print(f"Match: {context['match_text']}")
                print("\nFull context (NEVER truncated):")
                print(context['full_context'])
                
                if context.get('extended_context'):
                    print("\nExtended context:")
                    print(context['extended_context'])
                    
                if context.get('speakers'):
                    print("\nSpeakers:")
                    for speaker in context['speakers']:
                        print(f"- {speaker['name']}: {len(speaker['segments'])} segments")
                        
                if context.get('emotional_markers'):
                    print("\nEmotional markers:")
                    for marker in context['emotional_markers'][:5]:  # Show just a few
                        print(f"- {marker['type']}: {marker['description']}")
                    
                    if len(context.get('emotional_markers', [])) > 5:
                        print(f"  And {len(context['emotional_markers']) - 5} more...")
            else:
                print(f"Context {args.context_id} not found")
                
        elif args.command == "search":
            contexts = await context_system.search_contexts(
                args.query, 
                limit=args.limit,
                filter_tags=args.tags
            )
            
            print(f"Found {len(contexts)} matching contexts:")
            for i, context in enumerate(contexts):
                print(f"\n{i+1}. {context['pattern_type']}: {context['match_text'][:100]}...")
                print(f"   ID: {context['id']}")
                if 'match_score' in context:
                    print(f"   Score: {context['match_score']:.4f}")
                print(f"   Tags: {', '.join(context.get('domain_tags', []))}")
                
        elif args.command == "bridge":
            result = await context_system.create_session_bridge(
                args.from_session, args.to_session
            )
            
            print(f"Created bridge {result['bridge_id']}:")
            print(f"From session: {result['from_session_id']}")
            print(f"To session: {result['to_session_id']}")
            print(f"Contexts: {result['context_count']}")
            print("\nSummary:")
            print(result['summary'])
            
        else:
            parser.print_help()
            
    finally:
        # Clean up
        await context_system.close()

if __name__ == "__main__":
    asyncio.run(main())