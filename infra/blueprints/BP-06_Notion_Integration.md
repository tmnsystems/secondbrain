# Blueprint 06: Notion as Single Source of Truth

## Overview
This blueprint establishes Notion as the definitive system of record for all SecondBrain metadata, providing a human-readable interface that synchronizes with the technical infrastructure.

## Implementation Details

### Database Structure
The system creates and maintains the following Notion databases:

| Database | Purpose | Key Properties |
|----------|---------|---------------|
| File Catalog | Tracks all repository files | SHA (PK), path, type, last_modified |
| Drift Board | Monitors content changes | file_id, strategic_component_id, drift_score |
| Tech-Debt | Tracks code quality issues | file_id, scanner_id, severity, status |
| CLI Sessions | Records CLI interactions | session_id, status, start_time, end_time |
| Slack Conversations | Logs Slack interactions | conversation_id, channel, participants |
| Task Tracking | Manages agent tasks | task_id, status, assigned_agent, priority |

### Synchronization Implementation
```typescript
// sync_to_notion.py - Core synchronization implementation
import { Client } from '@notionhq/client';
import { throttle } from 'lodash';

export class NotionSyncManager {
  private notion: Client;
  private batchSize = 25; // Notion API best practice
  
  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }
  
  // Rate-limited page upserter
  private upsertPage = throttle(async (
    databaseId: string, 
    primaryKey: string,
    primaryValue: string,
    properties: Record<string, any>
  ) => {
    try {
      // Check if page exists
      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: {
          property: primaryKey,
          [typeof primaryValue === 'string' ? 'rich_text' : 'number']: {
            equals: primaryValue
          }
        }
      });
      
      if (response.results.length > 0) {
        // Update existing page
        await this.notion.pages.update({
          page_id: response.results[0].id,
          properties
        });
      } else {
        // Create new page
        await this.notion.pages.create({
          parent: { database_id: databaseId },
          properties
        });
      }
    } catch (error) {
      if (error.code === 'rate_limited') {
        // Handle rate limiting with exponential backoff
        const retryAfter = error.headers['retry-after'] || 5;
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        return this.upsertPage(databaseId, primaryKey, primaryValue, properties);
      }
      throw error;
    }
  }, 350); // Rate limit: ~3 requests per second
  
  // Batch update files
  async syncFilesToNotion(files: Array<FileMetadata>) {
    const databaseId = process.env.NOTION_FILE_CATALOG_ID;
    
    // Process in batches to respect rate limits
    for (let i = 0; i < files.length; i += this.batchSize) {
      const batch = files.slice(i, i + this.batchSize);
      
      // Process batch concurrently with rate limiting
      await Promise.all(batch.map(file => 
        this.upsertPage(
          databaseId,
          'SHA',
          file.sha,
          {
            "SHA": { title: [{ text: { content: file.sha } }] },
            "Path": { rich_text: [{ text: { content: file.path } }] },
            "Size": { number: file.size },
            "Last Modified": { date: { start: new Date(file.lastModified).toISOString() } },
            "Type": { select: { name: getFileType(file.path) } },
            "Preview": { rich_text: [{ text: { content: file.preview.substring(0, 2000) } }] }
          }
        )
      ));
    }
  }
  
  // Update drift scores
  async syncDriftScores(driftReports: Array<DriftReport>) {
    const databaseId = process.env.NOTION_DRIFT_BOARD_ID;
    
    for (let i = 0; i < driftReports.length; i += this.batchSize) {
      const batch = driftReports.slice(i, i + this.batchSize);
      
      await Promise.all(batch.map(report => 
        this.upsertPage(
          databaseId,
          'File SHA',
          report.fileSha,
          {
            "File SHA": { title: [{ text: { content: report.fileSha } }] },
            "Component ID": { rich_text: [{ text: { content: report.componentId } }] },
            "Drift Score": { number: report.driftScore },
            "Last Check": { date: { start: new Date(report.checkTime).toISOString() } },
            "Status": { select: { name: getDriftStatusName(report.driftScore) } }
          }
        )
      ));
    }
  }
  
  // Sync tech debt issues
  async syncTechDebtIssues(issues: Array<TechDebtIssue>) {
    const databaseId = process.env.NOTION_TECH_DEBT_DB_ID;
    
    for (let i = 0; i < issues.length; i += this.batchSize) {
      const batch = issues.slice(i, i + this.batchSize);
      
      await Promise.all(batch.map(issue => 
        this.upsertPage(
          databaseId,
          'Issue ID',
          issue.id,
          {
            "Issue ID": { title: [{ text: { content: issue.id } }] },
            "File": { rich_text: [{ text: { content: issue.file } }] },
            "Line": { number: issue.line },
            "Tool": { select: { name: issue.tool } },
            "Severity": { select: { name: issue.severity } },
            "Message": { rich_text: [{ text: { content: issue.message } }] },
            "Status": { status: { name: "Open" } }
          }
        )
      ));
    }
  }
}
```

### Database Creation Script
```typescript
// setup_notion_databases.ts
import { Client } from '@notionhq/client';

export async function setupNotionDatabases() {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  
  // Create File Catalog Database
  await notion.databases.create({
    parent: { page_id: process.env.NOTION_PARENT_PAGE_ID },
    title: [{ text: { content: "SecondBrain File Catalog" } }],
    properties: {
      "SHA": { title: {} },
      "Path": { rich_text: {} },
      "Size": { number: { format: "number" } },
      "Last Modified": { date: {} },
      "Type": { select: { options: [
        { name: "Transcript", color: "blue" },
        { name: "Blog", color: "green" },
        { name: "Code", color: "purple" },
        { name: "Document", color: "yellow" },
        { name: "Binary", color: "gray" }
      ]}},
      "Preview": { rich_text: {} }
    }
  });
  
  // Create Drift Board Database
  await notion.databases.create({
    parent: { page_id: process.env.NOTION_PARENT_PAGE_ID },
    title: [{ text: { content: "Content Drift Monitor" } }],
    properties: {
      "File SHA": { title: {} },
      "Component ID": { rich_text: {} },
      "Drift Score": { number: { format: "percent" } },
      "Last Check": { date: {} },
      "Status": { select: { options: [
        { name: "✅ Minimal", color: "green" },
        { name: "⚠️ Moderate", color: "yellow" },
        { name: "🚨 Significant", color: "red" }
      ]}}
    }
  });
  
  // Additional database creation omitted for brevity
}
```

### Scheduled Sync Implementation
```typescript
// schedule_notion_sync.ts
import { syncFilesToNotion } from './sync_to_notion';
import { getAllFiles } from './file_scanner';
import { getDriftReports } from './drift_detector';
import { getTechDebtIssues } from './tech_debt_scanner';
import cron from 'node-cron';

// Daily full sync
cron.schedule('0 1 * * *', async () => {
  const files = await getAllFiles();
  await syncFilesToNotion(files);
  
  const driftReports = await getDriftReports();
  await syncDriftScores(driftReports);
  
  const techDebtIssues = await getTechDebtIssues();
  await syncTechDebtIssues(techDebtIssues);
  
  console.log(`Daily sync completed: ${files.length} files, ${driftReports.length} drift reports, ${techDebtIssues.length} issues`);
});

// Hourly incremental sync
cron.schedule('0 * * * *', async () => {
  const changedFiles = await getChangedFilesSince(Date.now() - 3600000);
  if (changedFiles.length > 0) {
    await syncFilesToNotion(changedFiles);
    console.log(`Hourly sync completed: ${changedFiles.length} files updated`);
  }
});
```

## Benefits
- **Human Readability**: Clean visual interface for system metadata
- **Centralized Access**: Single point of reference for all system state
- **Change Tracking**: Historical record of all system evolution
- **Collaboration**: Team visibility into system health and issues
- **Automation**: Scheduled synchronization maintains accuracy

## Next Steps
1. Set up core Notion databases with proper schemas
2. Implement synchronization management with rate limiting
3. Create scheduling for regular updates
4. Develop dashboards for key metrics visualization
5. Add notification system for critical changes

<!-- BP-06_NOTION_INTEGRATION v1.0 SHA:xy56zde7 -->