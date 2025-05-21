# Notion SSoT (BP-06) Implementation

## Overview

The Notion Single Source of Truth (SSoT) component establishes Notion as the definitive system of record for all SecondBrain metadata, providing a human-readable interface that synchronizes with the technical infrastructure. This implementation ensures context persistence across CLI sessions, maintains comprehensive documentation, and serves as a centralized dashboard for system monitoring.

## Core Components

### 1. Database Structure

The SSoT creates and maintains the following Notion databases:

1. **File Catalog Database**
   - Tracks all repository files with metadata
   - Properties: SHA, path, type, last_modified, size, preview
   - Connected to the Context Catalog system (BP-05)

2. **Drift Board**
   - Monitors content changes and strategic alignment
   - Properties: file_id, component_id, drift_score, status
   - Integrated with the Drift Detection system

3. **Tech-Debt Database**
   - Tracks code quality issues
   - Properties: issue_id, file, line, tool, severity, message, status
   - Connected to the Static Analysis system (BP-04)

4. **CLI Sessions Database**
   - Records all CLI interactions for context persistence
   - Properties: session_id, status, start/end time, previous/next session
   - Implements session bridging for continuity

5. **Slack Conversations Database**
   - Logs all Slack interactions
   - Properties: conversation_id, channel, participants, message count
   - Connected to Slack integration

6. **Task Tracking Database**
   - Manages agent tasks and workflows
   - Properties: task_id, status, assigned_agent, priority, dependencies
   - Supports multi-agent architecture

7. **SecondBrain Tasks Database**
   - Primary task tracking for all agents
   - Properties: name, status, priority, assigned_agent, drift_score
   - Serves as the central task management system

### 2. Core Classes

#### NotionClient (`/src/core/notion_client.py`)

The `NotionClient` class provides a wrapper around the official Notion API client with enhanced features like rate limiting, retries, and error handling. It handles:

- API request throttling to respect Notion's rate limits
- Automatic retries with exponential backoff
- Error handling and validation
- Database, page, and block operations

```python
client = NotionClient()
response = client.create_database(
    parent_id="parent_page_id",
    title="Database Title",
    properties=schema
)
```

#### NotionSyncManager (`/src/core/notion_sync_manager.py`)

The `NotionSyncManager` class manages synchronization of data between SecondBrain and Notion, including:

- Queue management for batched operations
- Transaction handling for critical operations
- Priority-based processing
- Retry logic for failed operations

```python
sync_manager = NotionSyncManager()
sync_manager.add_file_catalog_entry(file_entry)
sync_manager.add_drift_entry(drift_entry)
```

#### CLISessionLogger (`/src/cli/cli_session_logger.py`)

The `CLISessionLogger` class provides real-time logging of CLI interactions to Notion, including:

- User messages, system actions, assistant responses, and tool calls
- Session bridging for continuity across compaction events
- Backup logs in the filesystem for redundancy
- Previous context loading at initialization

```python
logger = CLISessionLogger(session_id="cli-session-123")
logger.log_user_message("Help me with the implementation")
logger.log_system_action("LOAD_FILE", {"file": "config.py"})
```

#### DriftDetector (`/src/core/drift_detector.py`)

The `DriftDetector` class monitors strategic alignment of files, including:

- Scanning files for changes
- Calculating drift scores based on strategic intent
- Recording drift entries in Notion
- Component matching based on file paths and content

```python
detector = DriftDetector()
drift_entries = detector.detect_drift("/path/to/repo")
detector.record_drift(drift_entries)
```

#### TechDebtCollector (`/src/core/tech_debt_collector.py`)

The `TechDebtCollector` class collects code quality issues from static analysis tools, including:

- Running ESLint for JavaScript/TypeScript
- Running Pylint for Python
- Scanning for TODOs and FIXMEs
- Recording tech debt entries in Notion

```python
collector = TechDebtCollector()
entries = collector.collect_tech_debt("/path/to/repo")
collector.record_tech_debt(entries)
```

#### ScheduledSync (`/scripts/scheduled_sync.py`)

The `ScheduledSync` class manages scheduled synchronization, including:

- Daily full synchronization of all data
- Hourly incremental synchronization of changed data
- Task scheduling with configurable schedules
- Initial synchronization on startup

```python
scheduler = ScheduledSync()
scheduler.schedule_tasks()
scheduler.run_scheduler()
```

## Feature Implementation

### Real-Time Context Persistence

The Notion SSoT implements real-time context persistence through the CLI Session Logger, which:

1. Logs all CLI interactions to Notion AS THEY HAPPEN, not after the fact
2. Creates session bridges between related sessions to maintain continuity
3. Handles compaction events to preserve context during truncation
4. Maintains backup logs in the filesystem for redundancy
5. Loads previous context at session start to restore continuity

The implementation follows the "NEVER TRUNCATE" principle, ensuring that:

- Full surrounding context is always preserved (±5 paragraphs minimum)
- Speaker identification and emotional markers are maintained
- Chronological integrity of content is preserved

### Batch Processing with Rate Limits

The Notion API has strict rate limits (3 requests per second, 180 requests per minute), which the implementation handles through:

1. Queue-based batch processing with the `NotionSyncManager`
2. Priority-based processing (critical, high, medium, low)
3. Exponential backoff for rate limit errors
4. Transaction handling for critical operations
5. Persistent queue with checkpoints

The batch processor can be configured with:

```json
{
  "batch_processing": {
    "chunk_size": 10,
    "max_concurrency": 3,
    "priority_levels": ["critical", "high", "medium", "low"],
    "cooldown_period_ms": 1000
  }
}
```

### Strategic Drift Detection

The Drift Board monitors strategic alignment of files through the `DriftDetector`, which:

1. Scans files for changes based on their hash
2. Matches files to their intended components
3. Calculates drift scores based on path and content
4. Records drift entries in Notion with severity levels

The drift detection can be configured with component patterns and keywords:

```json
{
  "components": {
    "Notion SSoT": {
      "patterns": ["**/apps/notion-ssot/**"],
      "keywords": ["notion", "ssot", "persistence", "database"],
      "weight": 1.0
    }
  },
  "thresholds": {
    "minor_drift": 25.0,
    "major_drift": 50.0,
    "critical_drift": 75.0
  }
}
```

### Tech Debt Tracking

The Tech-Debt Database collects code quality issues through the `TechDebtCollector`, which:

1. Runs static analysis tools (ESLint, Pylint)
2. Scans for TODOs, FIXMEs, and other manual markers
3. Records issues with severity, file location, and message
4. Tracks the status of issues (open, in progress, fixed, won't fix)

The tech debt collection can be configured with tool settings:

```json
{
  "tools": {
    "eslint": {
      "enabled": true,
      "command": "npx eslint {path} -f json",
      "file_patterns": ["**/*.js", "**/*.ts"],
      "severity_mapping": {
        "2": "Major",
        "1": "Minor",
        "0": "Info"
      }
    }
  }
}
```

### Scheduled Synchronization

The implementation includes scheduled synchronization through the `ScheduledSync` class, which:

1. Runs daily full synchronization of all data
2. Runs hourly incremental synchronization of changed data
3. Manages task scheduling with configurable schedules
4. Performs initial synchronization on startup

The synchronization can be configured with:

```json
{
  "sync": {
    "full": {
      "schedule": "0 0 * * *",
      "max_duration_minutes": 60
    },
    "incremental": {
      "schedule": "0 * * * *",
      "max_duration_minutes": 15
    }
  }
}
```

## Integration with Existing Systems

### Context Catalog (BP-05)

The File Catalog Database is synchronized with the Context Catalog system, ensuring that:

1. All files tracked by the Context Catalog are also tracked in Notion
2. File metadata is kept in sync between the two systems
3. Changes in the Context Catalog are reflected in Notion
4. Search capabilities between systems are integrated

### Static Analysis (BP-04)

The Tech-Debt Database is integrated with the Static Analysis system, ensuring that:

1. All issues detected by static analysis tools are recorded in Notion
2. Issues can be tracked, assigned, and resolved through Notion
3. Static analysis configuration is managed through the SSoT
4. Code quality metrics are visualized in Notion

### CLI Session Context

The CLI Sessions Database provides persistence for CLI sessions, ensuring that:

1. All CLI interactions are logged in real-time to Notion
2. Context is preserved during compaction events
3. Related sessions are linked through bidirectional bridges
4. Previous context can be loaded at session start
5. Tools in the CLI can interact with the Notion SSoT

## Usage Guide

### Setup and Configuration

To set up the Notion SSoT component:

1. Ensure the API key is set in the environment:

```bash
export NOTION_API_KEY=your_notion_api_key
```

2. Create the Notion databases:

```bash
cd /Volumes/Envoy/SecondBrain
./apps/notion-ssot/notion-ssot.sh setup --parent-page-id=your_parent_page_id
```

3. Configure the components as needed by editing the configuration files in `apps/notion-ssot/config/`.

### CLI Session Logging

To enable CLI session logging in the SecondBrain CLI:

1. Initialize a new session:

```bash
./apps/notion-ssot/notion-ssot.sh cli-logger init
```

2. Log interactions during the session:

```bash
./apps/notion-ssot/src/cli/cli_session_bridge.py log-user "User message"
./apps/notion-ssot/src/cli/cli_session_bridge.py log-assistant "Assistant response"
```

3. Handle compaction events:

```bash
./apps/notion-ssot/src/cli/cli_session_bridge.py handle-compaction --reason "CONTEXT_LIMIT_REACHED"
```

### Drift Detection

To run drift detection:

```bash
./apps/notion-ssot/notion-ssot.sh detect-drift --root-dir=/Volumes/Envoy/SecondBrain
```

### Tech Debt Collection

To run tech debt collection:

```bash
./apps/notion-ssot/notion-ssot.sh collect-tech-debt --path=/Volumes/Envoy/SecondBrain
```

### Scheduled Synchronization

To start scheduled synchronization:

```bash
./apps/notion-ssot/notion-ssot.sh scheduled
```

To run a one-time synchronization:

```bash
./apps/notion-ssot/notion-ssot.sh sync --full
```

## Security Considerations

The implementation includes several security measures:

1. API keys are stored securely in environment variables
2. API calls are made using HTTPS with proper authentication
3. All API calls implement exponential backoff to prevent abuse
4. Token-based authentication is used for all API calls
5. Minimal permissions are requested from the API

## Performance Considerations

The implementation addresses performance in several ways:

1. Batch processing with chunk sizes of 10 items
2. Rate limit management to prevent throttling
3. Priority-based processing to ensure critical operations are processed first
4. Concurrent processing with configurable concurrency limits
5. Incremental synchronization to reduce processing time

## Future Improvements

The following improvements are planned for future iterations:

1. Integration with more static analysis tools
2. Enhanced visualization of drift and tech debt in Notion
3. More granular scheduling options for synchronization
4. Improved error handling and recovery
5. Integration with more SecondBrain components

## Verification Criteria

The implementation meets the following verification criteria:

1. **Zero Context Loss**: CLI sessions are preserved across compaction events and restarts
2. **Complete Database Structure**: All required databases are created and populated
3. **Real-Time Logging**: All interactions are logged to Notion as they happen
4. **Bidirectional Session Bridging**: Sessions are linked through bidirectional bridges
5. **Thorough Documentation**: Complete documentation of the implementation is provided

## Conclusion

The Notion SSoT component establishes Notion as the definitive system of record for all SecondBrain metadata, providing a human-readable interface that synchronizes with the technical infrastructure. It ensures context persistence across CLI sessions, maintains comprehensive documentation, and serves as a centralized dashboard for system monitoring.