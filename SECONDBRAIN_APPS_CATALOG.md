# SecondBrain Applications Catalog

This document serves as a centralized catalog of all applications, tools, and systems created for the SecondBrain ecosystem. It provides a comprehensive reference for what each app does, how it's built, where key files are located, and the current implementation status.

## 1. Style Analysis and Content Generation System

**Description:** Analyzes writing style across all content sources and generates new content that authentically matches your unique voice.

**Key Files & Locations:**
- Core system files: `/Volumes/Envoy/SecondBrain/`
- Style profiles: `/Volumes/Envoy/SecondBrain/processed_data/*style_profile.json`
- Master style profile: `/Volumes/Envoy/SecondBrain/processed_data/master_style_profile.json`
- System documentation: `/Volumes/Envoy/SecondBrain/STYLE_SYSTEM.md`

**Technology Stack:**
- JavaScript/Node.js for processing and analysis
- GPT-4 for content generation
- JSON for data storage and exchange

**Capabilities:**
- Analyze any content to extract style attributes
- Create individual style profiles per content piece
- Generate combined master style profile
- Create new content that mimics your authentic voice
- Support multiple content types (articles, SOPs, courses, etc.)

**Implementation Status:**
- ✅ Content processing and analysis
- ✅ Style profile generation
- ✅ Master profile compilation
- ✅ Content generation based on style profiles
- ✅ Incremental processing

**Usage Examples:**
```
npm run process             # Process new or modified content
npm run analyze-style       # Analyze all processed content
npm run combine-profiles    # Create master style profile
npm run master-article --topic="Your topic"  # Generate article
```

## 2. Slack+Notion Integration with Context Persistence

**Description:** A multi-agent system that integrates Slack and Notion with a sophisticated context persistence mechanism to maintain conversation history and task context across sessions.

**Key Files & Locations:**
- Core system files: `/Volumes/Envoy/SecondBrain/slack_notion_integration/`
- Implementation log: `/Volumes/Envoy/SecondBrain/SLACK_NOTION_IMPLEMENTATION_LOG.md`
- Configuration: `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env`
- Semantic search docs: `/Volumes/Envoy/SecondBrain/slack_notion_integration/SEMANTIC_SEARCH.md`

**Technology Stack:**
- Python for core functionality
- Redis for short-term caching
- PostgreSQL for structured storage
- Pinecone for semantic search
- Slack and Notion APIs for integration
- LangGraph for agent workflow orchestration

**Capabilities:**
- Multi-layered context persistence (Redis, PostgreSQL, Pinecone)
- Specialized agent roles (Planner, Executor, Reviewer, Notion)
- Model routing to specific LLMs
- Vercel/Linode deployment architecture
- JWT-based authentication for internal API calls
- Semantic search across conversation history

**Implementation Status:**
- ✅ Redis integration (short-term caching)
- ✅ PostgreSQL integration (structured storage)
- ✅ Pinecone integration (semantic search)
- ✅ Context manager implementation
- ✅ Slack message processing
- ⚠️ Vercel/Linode deployment (in progress)
- ⚠️ LangGraph integration (in progress)
- ⚠️ Web interface (planned)

**Usage Examples:**
```bash
python -m slack_notion_integration.src.main --test-context
python -m slack_notion_integration.src.main --test-semantic-search
python slack_notion_integration/topic_extraction.py --topic="business systems"
```

## 3. Topic Extraction System

**Description:** Extracts verbatim quotes on specific business topics from all processed transcripts and content, using semantic search to find relevant passages.

**Key Files & Locations:**
- Script: `/Volumes/Envoy/SecondBrain/slack_notion_integration/topic_extraction.py`
- Output directory: `/Volumes/Envoy/SecondBrain/topic_extracts/`

**Technology Stack:**
- Python
- Pinecone for semantic search
- Leverages the Slack+Notion context persistence system

**Capabilities:**
- Index all content for semantic search
- Extract verbatim quotes on specific topics
- Process all 9 pillar topics at once
- Save results to markdown files for easy reference
- Find variations of topics through semantic search

**Implementation Status:**
- ✅ Content indexing and searching
- ✅ Quote extraction and cleaning
- ✅ Support for pillar topics
- ✅ Markdown output generation
- ⚠️ Topic discovery (planned)

**Usage Examples:**
```bash
python slack_notion_integration/topic_extraction.py --topic="value ladder"
python slack_notion_integration/topic_extraction.py --all-pillars
python slack_notion_integration/topic_extraction.py --list-pillars
```

## 4. TubeToTask

**Description:** Automatically converts YouTube videos into Notion tasks and project boards.

**Key Files & Locations:**
- Core files: `/Volumes/Envoy/SecondBrain/apps/TubeToTask/`
- Documentation: `/Volumes/Envoy/SecondBrain/docs/`

**Technology Stack:**
- Python
- YouTube API
- Notion API
- Docker for containerization

**Capabilities:**
- Extract content from YouTube videos
- Create structured Notion pages and tasks
- Organize content into project boards
- Deploy as a standalone service

**Implementation Status:**
- ✅ YouTube integration
- ✅ Notion integration
- ✅ Docker containerization
- ⚠️ Full automation (in progress)

**Usage Examples:**
See `/Volumes/Envoy/SecondBrain/apps/TubeToTask/README.md` for usage instructions.

---

## Catalog Management

This catalog should be updated whenever:
1. A new application is created
2. Significant features are added to an existing application
3. The implementation status of an application changes
4. Documentation is updated or expanded

To maintain this catalog:
1. Add new applications as needed with all required sections
2. Update implementation status with either ✅ (complete), ⚠️ (in progress), or ❌ (planned)
3. Keep usage examples up-to-date and accurate
4. Verify file paths and ensure they're correct