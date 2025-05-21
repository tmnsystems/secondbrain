# SecondBrain Notion Integration

This document contains critical information about the Notion integration for the SecondBrain system. This information MUST persist between sessions to prevent context loss.

## Current Notion Databases

1. **SecondBrain Tasks Database**
   - Primary task tracking database for all agents
   - Database ID: [Check environment variable SECONDBRAIN_TASKS_DATABASE_ID]
   - Required Properties:
     - Name (title): Task name/description
     - Status (status): Not Started, In Progress, Completed, Cancelled
     - Priority (select): P1, P2, P3
     - Task ID (rich_text): Unique identifier for the task
     - Spec Link (url): Link to specifications or relevant file
     - Drift Score (number): Strategic alignment score (higher = more drift)
     - Assigned Agent (select): Planner, Executor, Reviewer, Refactor, Build, Orchestrator, Notion
     - Last Synced (date): When the task was last updated
   - Critical Views:
     - Kanban (Tasks by Status): Grouped by status, sorted by priority
     - Drift Watchlist: Filtered for high drift scores (>75)
     - Agent Queue: Grouped by assigned agent

2. **SecondBrain File Catalog Database**
   - Comprehensive catalog of all files in the SecondBrain system
   - Database ID: [Check environment variable NOTION_CATALOG_DB_ID]
   - Used for tracking file metadata, strategic relevance, and relationships
   - Connected to the Context Catalog System

3. **Strategic Insights Database (TubeToTask)**
   - Stores insights extracted from YouTube videos
   - Database ID: [Check environment variable NOTION_PROJECT_DATABASE_ID]
   - Connected to the TubeToTask workflow

4. **Strategic Tasks Database (TubeToTask)**
   - Stores tasks generated from video insights
   - Database ID: [Check environment variable NOTION_TASK_DATABASE_ID]
   - Connected to the TubeToTask workflow

## Integration Points

1. **Context Catalog System**
   - `/Volumes/Envoy/SecondBrain/context_system/catalog-secondbrain-files.js`
   - Scans all files and updates the File Catalog database
   - Creates tasks in SecondBrain Tasks for files that need attention
   - Updates task status based on file changes

2. **Drift Detection System**
   - `/Volumes/Envoy/SecondBrain/context_system/drift-detector.js`
   - Identifies misalignment between strategic intent and implementation
   - Creates tasks in SecondBrain Tasks for high drift scores
   - Updates drift scores in existing tasks

3. **Agent Assignment System**
   - Tasks are assigned to specific agents based on content
   - Agents update task status as they complete work
   - The Orchestrator agent manages task flow between agents

4. **Slack Notifications**
   - Slack receives notifications for high-priority tasks
   - New P1 tasks trigger immediate alerts
   - High drift scores (>80) trigger alerts
   - Weekly task digests are sent to the team

## Implementation Files

1. **Setup and Configuration**
   - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/setup-notion-database.js`: Creates TubeToTask databases
   - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/setup-catalog-database.js`: Creates File Catalog database
   - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/integrate-secondbrain-tasks.js`: Integrates with SecondBrain Tasks

2. **Core Integration Scripts**
   - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/catalog-secondbrain-files.js`: Updates File Catalog
   - `/Volumes/Envoy/SecondBrain/context_system/drift-detector.js`: Detects strategic drift
   - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/create-notion-tasks.js`: Creates tasks from insights

3. **API Integration**
   - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/src/integrations/notion.js`: Core Notion API client
   - `/Volumes/Envoy/SecondBrain/slack_notion_integration/test_notion.py`: Tests Notion connectivity

## Security Considerations

1. **API Keys**
   - Notion API Key stored in `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env`
   - In Vercel deployments, keys stored in Vercel Edge Config
   - Keys should be rotated regularly

2. **Access Control**
   - All databases have explicit permissions
   - Integration users have minimal required permissions
   - Production deployments use token-based authentication

3. **Rate Limiting**
   - All API calls implement exponential backoff
   - Batch operations include checkpoints to prevent data loss
   - Monitoring in place for excessive API usage

## Implementation Status

1. **Completed**
   - File Catalog Database setup and integration
   - TubeToTask Notion database setup
   - Basic Slack notifications

2. **In Progress**
   - Integration with SecondBrain Tasks database
   - Drift Detection integration
   - Advanced Slack automations

3. **Planned**
   - Full agent integration with task assignment
   - Automated metrics and reporting
   - Multi-workspace support