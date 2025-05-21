# Blueprint 05: Context Catalog System

## Overview
This blueprint implements an enhanced version of the existing Context Catalog System that comprehensively indexes, relates, and provides access to all context elements within the SecondBrain repository.

## Implementation Details

### Enhanced Metadata Schema
```typescript
// Enhanced catalog schema
interface ContextCatalogItem {
  // Core identifiers
  sha: string;               // Content hash for deduplication
  path: string;              // File path within repository
  lastModified: number;      // Timestamp of last modification
  
  // Content metadata
  type: 'transcript' | 'blog' | 'framework' | 'style_profile' | 'agent_code' | 'documentation';
  size: number;              // Size in bytes
  preview: string;           // First 512 characters or summary
  
  // Semantic metadata
  topics: string[];          // Associated topics/domains
  relatedFiles: string[];    // Related file paths
  embeddingId?: string;      // Reference to Pinecone embedding (if applicable)
  
  // Context preservation
  preservationLevel: 'full' | 'partial' | 'reference';
  extractionDate: number;    // When context was extracted
  driftScore?: number;       // How much content has drifted from original
  
  // Access patterns
  accessCount: number;       // How often this context is accessed
  lastAccessed?: number;     // When context was last accessed
  agentAccessHistory: Array<{
    agentId: string;
    timestamp: number;
    purpose: string;
  }>;
}
```

### Postgres Integration
```typescript
// integrate_catalog_with_context.js - Enhanced for direct Postgres access
import { Client } from 'pg';

export async function updateCatalogFromPostgres() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL
  });
  
  await client.connect();
  
  // Query files table directly instead of reading JSON blobs
  const result = await client.query(`
    SELECT 
      sha, 
      path, 
      size, 
      last_modified,
      preview,
      metadata
    FROM files
    WHERE last_modified > $1
    ORDER BY last_modified DESC
  `, [lastSyncTimestamp]);
  
  // Process results
  for (const row of result.rows) {
    await updateCatalogItem({
      sha: row.sha,
      path: row.path,
      size: row.size,
      lastModified: row.last_modified,
      preview: row.preview,
      ...parseMetadata(row.metadata)
    });
  }
  
  await client.end();
}
```

### Drift Detection Implementation
```typescript
// drift-detector.js - New implementation
import { Client } from 'pg';
import { getPineconeClient } from './pinecone';

export async function detectContentDrift() {
  const pgClient = new Client({
    connectionString: process.env.POSTGRES_URL
  });
  await pgClient.connect();
  
  const pinecone = await getPineconeClient();
  
  // Get strategic components that need drift monitoring
  const strategicComponents = await pgClient.query(`
    SELECT * FROM strategic_components
    WHERE requires_drift_monitoring = true
  `);
  
  // Check each component
  for (const component of strategicComponents.rows) {
    // Get the most recent version from Git
    const fileContent = await getFileContent(component.path);
    
    // Generate new embedding
    const newEmbedding = await generateEmbedding(fileContent);
    
    // Compare with stored embedding in Pinecone
    const queryResponse = await pinecone.query({
      vector: newEmbedding,
      filter: { path: component.path },
      topK: 1,
      includeMetadata: true
    });
    
    if (queryResponse.matches.length > 0) {
      const storedEmbedding = queryResponse.matches[0];
      const driftScore = 1 - storedEmbedding.score; // Cosine distance
      
      // Update drift score in database
      await pgClient.query(`
        UPDATE strategic_components
        SET drift_score = $1, last_drift_check = NOW()
        WHERE id = $2
      `, [driftScore, component.id]);
      
      // Alert if drift exceeds threshold
      if (driftScore > 0.15) {
        await createDriftAlert(component, driftScore);
      }
    }
  }
  
  await pgClient.end();
}

// Run drift detection nightly
export function scheduleDriftDetection() {
  const cronSchedule = '0 1 * * *'; // 1 AM daily
  schedule(cronSchedule, detectContentDrift);
}
```

### Notion Integration for Drift Monitoring
```typescript
// sync_drift_to_notion.js
import { Client } from '@notionhq/client';
import { getDriftReports } from './drift-detector';

export async function syncDriftToNotion() {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const driftBoardId = process.env.NOTION_DRIFT_BOARD_ID;
  
  const driftReports = await getDriftReports();
  
  for (const report of driftReports) {
    // Upsert to Notion
    await notion.pages.create({
      parent: { database_id: driftBoardId },
      properties: {
        "File": { title: [{ text: { content: report.path } }] },
        "Drift Score": { number: report.driftScore },
        "Last Check": { date: { start: new Date(report.lastCheck).toISOString() } },
        "Status": { select: { name: getDriftStatusLabel(report.driftScore) } },
        "SHA": { rich_text: [{ text: { content: report.sha } }] }
      }
    });
  }
}

function getDriftStatusLabel(score) {
  if (score < 0.05) return "✅ Minimal";
  if (score < 0.15) return "⚠️ Moderate";
  return "🚨 Significant";
}
```

## Benefits
- **Comprehensive Tracking**: Every file is cataloged with rich metadata
- **Drift Detection**: Automatic monitoring of strategic component changes
- **Postgres Integration**: Direct database access for better performance
- **Pinecone Embeddings**: Semantic tracking of content evolution
- **Notion Visibility**: Human-readable dashboards for drift monitoring

## Next Steps
1. Enhance existing Context Catalog implementation
2. Implement drift detection with nightly runs
3. Create Notion board for drift visualization
4. Set up alerts for significant drift detection
5. Implement manual and automated drift resolution

<!-- BP-05_CONTEXT_CATALOG v1.0 SHA:st23uvw4 -->