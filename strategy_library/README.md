# Strategy Library

This directory contains strategic insights derived from external content sources, primarily YouTube videos, that have been analyzed for their relevance to the SecondBrain Master Plan.

## Structure

- **insights/**: Individual insight documents with standardized frontmatter
- **templates/**: Templates for creating new insights
- **_index.json**: Searchable index of all insights
- **channels.json**: Configuration for tracked YouTube channels and playlists

## Frontmatter Schema

Each insight document includes YAML frontmatter with the following fields:

```yaml
---
title: "Title of the content"
source_url: "https://youtube.com/watch?v=VIDEO_ID"
channel: "Channel Name"
date_processed: "YYYY-MM-DD"
date_published: "YYYY-MM-DD"
tags: ["tag1", "tag2", "tag3"]
pillars: ["Pillar1", "Pillar2"]
alignment_score: 0-100
master_plan_impact: "high|medium|low"
implementation_priority: "high|medium|low"
summary: "Brief 1-2 sentence summary"
---
```

## Usage

### Loading Insights in Claude Sessions

To load an insight into a Claude session, use:

```bash
.cl/insights/load_insight.sh --id 2025-05-13_craft_framework_for_prompt_architecture
```

Or load by tag:

```bash
.cl/insights/load_insight.sh --tag CRAFT
```

### Integration with Task System

In todo definitions, reference relevant insights:

```json
{
  "id": "task-001",
  "description": "Implement CRAFT framework across agent prompts",
  "insights": [
    {
      "id": "2025-05-13_craft_framework_for_prompt_architecture",
      "relevance": "high"
    }
  ]
}
```

### Querying Insights

Use the Node.js utility to find relevant insights:

```bash
node .cl/insights/query_insights.js search "prompt engineering" 5
node .cl/insights/query_insights.js tag CRAFT 3
node .cl/insights/query_insights.js pillar "Business + Project Management" 10
```

## Automated Processing

The system automatically processes new videos from configured channels and playlists:

1. New videos are detected every 6 hours
2. Transcripts are fetched and processed
3. Strategic insights are generated using Claude
4. Insights are reviewed by the reviewer agent
5. Approved insights are added to the library

## Manual Addition

To manually add a video:

```bash
cd /Volumes/Envoy/SecondBrain/apps/TubeToTask
node src/cli.js process-video --video-id VIDEO_ID
```

## Best Practices

1. **Use Standardized Templates**: Start with templates in the templates/ directory
2. **Tag Consistently**: Use existing tags where possible for better organization
3. **Link to Master Plan**: Always connect insights to specific Master Plan pillars
4. **Prioritize Implementation**: Focus on actionable recommendations
5. **Include Verbatim Quotes**: Direct quotes help preserve the original insight