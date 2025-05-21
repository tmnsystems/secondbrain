# Strategic Insights Implementation Plan

This document outlines a comprehensive plan for implementing a strategic insights system within SecondBrain, leveraging the existing TubeToTask application framework to automatically process, summarize, and integrate YouTube content into the Master Plan.

## 1. System Architecture Overview

```
/Volumes/Envoy/SecondBrain/
├── strategy_library/             # Strategic insights repository
│   ├── README.md                 # Documentation and usage guide
│   ├── _index.json               # Searchable index of all insights
│   ├── insights/                 # Individual insight documents
│   │   ├── YYYY-MM-DD_title.md   # Date-stamped insight files
│   │   └── ...
│   ├── channels.json             # YouTube channels configuration
│   └── templates/                # Templates for different insight types
│       ├── video_summary.md      # YouTube video summary template
│       ├── masterplan_update.md  # Master Plan alignment template
│       └── implementation.md     # Implementation recommendation template
├── apps/TubeToTask/              # Enhanced TubeToTask application
│   ├── CLAUDE.md                 # TubeToTask context file (already created)
│   ├── src/                      # Source code
│   │   ├── api/                  # API integrations
│   │   │   ├── youtube.js        # YouTube API client
│   │   │   └── notion.js         # Notion API client
│   │   ├── processors/           # Content processors
│   │   │   ├── transcript.js     # Transcript extraction and cleaning
│   │   │   ├── summarizer.js     # Content summarization engine
│   │   │   └── tagger.js         # Semantic tagging system
│   │   ├── integrations/         # SecondBrain integrations
│   │   │   ├── strategy_lib.js   # Strategy library integration
│   │   │   ├── claude_agent.js   # Claude agent interface
│   │   │   └── master_plan.js    # Master Plan integration
│   │   └── schedulers/           # Automated scheduling
│   │       ├── fetcher.js        # Periodic content fetching
│   │       └── processor.js      # Processing queue manager
│   └── config/                   # Configuration files
│       ├── prompts/              # LLM prompts for different tasks
│       │   ├── summary.prompt    # Summary generation prompt
│       │   ├── insight.prompt    # Strategic insight extraction
│       │   └── recommendation.prompt # Recommendation generation
│       └── default.json          # Default configuration
└── .cl/                          # Context management system
    ├── todos/                    # Enhanced task system with insights
    │   └── schema.json           # Updated schema with insights integration
    ├── insights/                 # Insight loading utilities
    │   ├── load_insight.sh       # Bash script to load insights
    │   └── query_insights.js     # Node utility to search insights
    └── agents/                   # Specialized insight agents
        ├── insight_reviewer.json # Insight reviewer agent configuration
        └── strategy_advisor.json # Strategy advisor agent configuration
```

## 2. Key Components and Implementation Steps

### 2.1 Strategy Library Structure

The strategy library will be a structured repository of strategic insights derived from YouTube videos and other sources, designed for easy integration with the Master Plan.

**Step 1: Create directory structure**
```bash
mkdir -p /Volumes/Envoy/SecondBrain/strategy_library/{insights,templates}
touch /Volumes/Envoy/SecondBrain/strategy_library/_index.json
touch /Volumes/Envoy/SecondBrain/strategy_library/channels.json
```

**Step 2: Implement frontmatter schema in templates**
Create template files with structured frontmatter:

```yaml
---
title: "Video Title"
source_url: "https://youtube.com/watch?v=VIDEO_ID"
channel: "Channel Name"
date_processed: "YYYY-MM-DD"
date_published: "YYYY-MM-DD"
tags: ["tag1", "tag2", "tag3"]
pillars: ["Principles and Priorities", "Simple Finance Systems"]
alignment_score: 85
master_plan_impact: "high|medium|low"
implementation_priority: "high|medium|low"
summary: >
  A brief 1-2 sentence summary of the key insight
---

# Strategic Insight: {{title}}

## Key Points

- Point 1
- Point 2
- Point 3

## Master Plan Alignments

This content aligns with the following aspects of the Master Plan:

1. **{{pillar}}**: How this insight supports or enhances this pillar
2. **{{another_pillar}}**: Potential integration points

## Implementation Recommendations

Based on this insight, consider the following additions or modifications to the Master Plan:

1. **{{recommendation}}**: Implementation details and benefits

## Action Items

- [ ] Action 1
- [ ] Action 2
- [ ] Action 3

## Verbatim Quotes

> "Exact quote from the video that captures a key insight"

> "Another powerful quote that demonstrates the concept"
```

**Step 3: Create index system**
Implement `_index.json` schema for efficient querying:

```json
{
  "last_updated": "2025-05-13T12:34:56Z",
  "insights": [
    {
      "id": "2025-05-13_craft_prompt_architecture",
      "file_path": "insights/2025-05-13_craft_prompt_architecture.md",
      "title": "CRAFT Prompt Architecture",
      "tags": ["prompt-engineering", "meta-prompt", "CRAFT"],
      "pillars": ["Business + Project Management"],
      "alignment_score": 95,
      "master_plan_impact": "high",
      "implementation_priority": "high",
      "summary": "A structured approach to prompt engineering using Context, Role, Action, Format, and Target audience components."
    }
  ],
  "tags": {
    "prompt-engineering": ["2025-05-13_craft_prompt_architecture"],
    "meta-prompt": ["2025-05-13_craft_prompt_architecture"],
    "CRAFT": ["2025-05-13_craft_prompt_architecture"]
  },
  "pillars": {
    "Business + Project Management": ["2025-05-13_craft_prompt_architecture"]
  }
}
```

**Step 4: Configure channels.json**
Set up tracked YouTube channels:

```json
{
  "channels": [
    {
      "id": "UCrVRL8Y8LQsTMmHJxQU1UJg",
      "name": "PromptEngineering",
      "url": "https://www.youtube.com/channel/UCrVRL8Y8LQsTMmHJxQU1UJg",
      "tags": ["prompt-engineering", "llm", "ai"],
      "master_plan_relevance": "high",
      "last_checked": "2025-05-13T00:00:00Z"
    }
  ],
  "playlists": [
    {
      "id": "PL4HJwLVdKLyt-lVRT4v7Fz6fAZTXWjfud",
      "name": "Prompt Engineering Techniques",
      "url": "https://www.youtube.com/playlist?list=PL4HJwLVdKLyt-lVRT4v7Fz6fAZTXWjfud",
      "tags": ["prompt-engineering", "techniques"],
      "master_plan_relevance": "high",
      "last_checked": "2025-05-13T00:00:00Z"
    }
  ]
}
```

### 2.2 TubeToTask Enhancement

Enhance the existing TubeToTask application to support automated insight generation.

**Step 1: Implement YouTube API integration**
Create a robust YouTube API client:

```javascript
// apps/TubeToTask/src/api/youtube.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class YouTubeAPI {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  }

  async getVideoTranscript(videoId) {
    // Implementation using YouTube transcript API
    // This requires external library or service like youtube-transcript-api
  }

  async getLatestVideosFromChannel(channelId, maxResults = 10, publishedAfter = null) {
    try {
      const response = await this.youtube.search.list({
        part: 'snippet',
        channelId,
        maxResults,
        order: 'date',
        type: 'video',
        publishedAfter
      });
      
      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high.url
      }));
    } catch (error) {
      console.error('Error fetching videos from channel:', error);
      return [];
    }
  }

  async getVideoDetails(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: 'snippet,contentDetails,statistics',
        id: videoId
      });
      
      if (response.data.items.length === 0) {
        throw new Error(`No video found with ID: ${videoId}`);
      }
      
      const video = response.data.items[0];
      return {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        channelTitle: video.snippet.channelTitle,
        tags: video.snippet.tags || [],
        duration: video.contentDetails.duration,
        viewCount: video.statistics.viewCount,
        likeCount: video.statistics.likeCount
      };
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  }
}

module.exports = new YouTubeAPI();
```

**Step 2: Create transcript processor**
Implement transcript extraction and cleaning:

```javascript
// apps/TubeToTask/src/processors/transcript.js
const youtubeAPI = require('../api/youtube');
const fs = require('fs');
const path = require('path');

class TranscriptProcessor {
  constructor() {
    this.cacheDir = path.join(__dirname, '../../cache/transcripts');
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async getTranscript(videoId) {
    const cachePath = path.join(this.cacheDir, `${videoId}.json`);
    
    // Check cache first
    if (fs.existsSync(cachePath)) {
      const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return cachedData;
    }
    
    // Fetch transcript from YouTube
    const transcript = await youtubeAPI.getVideoTranscript(videoId);
    
    // Clean and format transcript
    const cleanedTranscript = this.cleanTranscript(transcript);
    
    // Cache the result
    fs.writeFileSync(cachePath, JSON.stringify(cleanedTranscript));
    
    return cleanedTranscript;
  }
  
  cleanTranscript(transcript) {
    // Basic cleaning operations:
    // 1. Join adjacent segments from same speaker
    // 2. Fix common transcription errors
    // 3. Remove filler words
    // 4. Normalize formatting
    
    // Implementation details would go here
    return transcript;
  }
  
  extractKeySegments(transcript) {
    // Identify key segments in the transcript:
    // 1. Segments with high information density
    // 2. Segments that mention specific concepts
    // 3. Segments with clear action items
    
    // Implementation details would go here
    return keySegments;
  }
}

module.exports = new TranscriptProcessor();
```

**Step 3: Implement summarizer with Claude integration**
Create a summarization engine using Claude:

```javascript
// apps/TubeToTask/src/processors/summarizer.js
const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class Summarizer {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.promptsDir = path.join(__dirname, '../../config/prompts');
    this.summaryPrompt = fs.readFileSync(
      path.join(this.promptsDir, 'summary.prompt'), 
      'utf8'
    );
    this.insightPrompt = fs.readFileSync(
      path.join(this.promptsDir, 'insight.prompt'), 
      'utf8'
    );
  }

  async generateSummary(transcript, videoDetails) {
    const fullPrompt = this.summaryPrompt
      .replace('{{TRANSCRIPT}}', transcript)
      .replace('{{VIDEO_TITLE}}', videoDetails.title)
      .replace('{{CHANNEL_NAME}}', videoDetails.channelTitle)
      .replace('{{PUBLISHED_DATE}}', videoDetails.publishedAt);
    
    const response = await this.anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
    });
    
    return response.content[0].text;
  }

  async generateStrategicInsight(summary, videoDetails, masterPlan) {
    const fullPrompt = this.insightPrompt
      .replace('{{SUMMARY}}', summary)
      .replace('{{VIDEO_TITLE}}', videoDetails.title)
      .replace('{{CHANNEL_NAME}}', videoDetails.channelTitle)
      .replace('{{PUBLISHED_DATE}}', videoDetails.publishedAt)
      .replace('{{MASTER_PLAN}}', masterPlan);
    
    const response = await this.anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
    });
    
    return response.content[0].text;
  }
}

module.exports = new Summarizer();
```

**Step 4: Create scheduler for automated processing**
Implement automated fetching and processing:

```javascript
// apps/TubeToTask/src/schedulers/fetcher.js
const cron = require('node-cron');
const youtubeAPI = require('../api/youtube');
const channelsConfig = require('../../config/channels.json');
const fs = require('fs');
const path = require('path');
const { processVideo } = require('./processor');

// Schedule to run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled YouTube channel check:', new Date());
  
  // Process each channel
  for (const channel of channelsConfig.channels) {
    console.log(`Checking channel: ${channel.name}`);
    
    const lastChecked = new Date(channel.last_checked || '2000-01-01');
    const videos = await youtubeAPI.getLatestVideosFromChannel(
      channel.id, 
      10, 
      lastChecked.toISOString()
    );
    
    console.log(`Found ${videos.length} new videos for ${channel.name}`);
    
    // Queue each video for processing
    for (const video of videos) {
      await processVideo(video.id, channel);
    }
    
    // Update last checked timestamp
    channelsConfig.channels.find(c => c.id === channel.id).last_checked = new Date().toISOString();
    
    // Save updated configuration
    fs.writeFileSync(
      path.join(__dirname, '../../config/channels.json'),
      JSON.stringify(channelsConfig, null, 2)
    );
  }
  
  // Similarly process playlists
  // Implementation details would go here
  
  console.log('Scheduled YouTube check completed:', new Date());
});

// Allow manual triggering for testing
async function checkNow() {
  // Implementation for manual triggering
}

module.exports = {
  checkNow
};
```

**Step 5: Implement integration with strategy library**
Create the integration layer:

```javascript
// apps/TubeToTask/src/integrations/strategy_lib.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const STRATEGY_LIB_PATH = '/Volumes/Envoy/SecondBrain/strategy_library';
const INSIGHTS_PATH = path.join(STRATEGY_LIB_PATH, 'insights');
const INDEX_PATH = path.join(STRATEGY_LIB_PATH, '_index.json');

class StrategyLibrary {
  constructor() {
    // Ensure strategy library exists
    if (!fs.existsSync(INSIGHTS_PATH)) {
      fs.mkdirSync(INSIGHTS_PATH, { recursive: true });
    }
    
    // Initialize index if it doesn't exist
    if (!fs.existsSync(INDEX_PATH)) {
      fs.writeFileSync(INDEX_PATH, JSON.stringify({
        last_updated: new Date().toISOString(),
        insights: [],
        tags: {},
        pillars: {}
      }, null, 2));
    }
    
    this.index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  }
  
  async saveInsight(insight, videoDetails) {
    // Generate unique ID based on date and title
    const date = new Date().toISOString().split('T')[0];
    const slug = videoDetails.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const id = `${date}_${slug}`;
    
    // Extract frontmatter from insight
    const frontmatter = this.extractFrontmatter(insight);
    frontmatter.title = videoDetails.title;
    frontmatter.source_url = `https://youtube.com/watch?v=${videoDetails.id}`;
    frontmatter.channel = videoDetails.channelTitle;
    frontmatter.date_processed = new Date().toISOString().split('T')[0];
    frontmatter.date_published = new Date(videoDetails.publishedAt).toISOString().split('T')[0];
    
    // Create file path
    const filePath = path.join(INSIGHTS_PATH, `${id}.md`);
    
    // Build markdown file with frontmatter
    const content = `---\n${yaml.dump(frontmatter)}---\n\n${insight}`;
    
    // Write to file
    fs.writeFileSync(filePath, content);
    
    // Update index
    this.updateIndex(id, filePath, frontmatter);
    
    return {
      id,
      filePath,
      frontmatter
    };
  }
  
  extractFrontmatter(insight) {
    // Extract tags, pillars, etc. from the insight
    // Implementation would use regex or parsing to extract metadat
    // For now, return a placeholder
    return {
      tags: [],
      pillars: [],
      alignment_score: 0,
      master_plan_impact: "low",
      implementation_priority: "low",
      summary: ""
    };
  }
  
  updateIndex(id, filePath, frontmatter) {
    // Add insight to index
    this.index.insights.push({
      id,
      file_path: path.relative(STRATEGY_LIB_PATH, filePath),
      title: frontmatter.title,
      tags: frontmatter.tags,
      pillars: frontmatter.pillars,
      alignment_score: frontmatter.alignment_score,
      master_plan_impact: frontmatter.master_plan_impact,
      implementation_priority: frontmatter.implementation_priority,
      summary: frontmatter.summary
    });
    
    // Update tag index
    for (const tag of frontmatter.tags) {
      if (!this.index.tags[tag]) {
        this.index.tags[tag] = [];
      }
      if (!this.index.tags[tag].includes(id)) {
        this.index.tags[tag].push(id);
      }
    }
    
    // Update pillar index
    for (const pillar of frontmatter.pillars) {
      if (!this.index.pillars[pillar]) {
        this.index.pillars[pillar] = [];
      }
      if (!this.index.pillars[pillar].includes(id)) {
        this.index.pillars[pillar].push(id);
      }
    }
    
    // Update last_updated timestamp
    this.index.last_updated = new Date().toISOString();
    
    // Save index
    fs.writeFileSync(INDEX_PATH, JSON.stringify(this.index, null, 2));
  }
}

module.exports = new StrategyLibrary();
```

### 2.3 Context Management Integration

Extend the Context Management System to integrate with the strategy library.

**Step 1: Create insight loading utilities**
Implement insight loading scripts:

```bash
#!/bin/bash
# /Volumes/Envoy/SecondBrain/.cl/insights/load_insight.sh

set -e

# Default values
VERBOSE=false
OUTPUT_FILE=""
INSIGHT_ID=""
TAG=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--id)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        INSIGHT_ID=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -t|--tag)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        TAG=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -o|--output)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        OUTPUT_FILE=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -i, --id <insight-id>  ID of the specific insight to load"
      echo "  -t, --tag <tag>        Tag to filter insights (returns the most recent)"
      echo "  -o, --output <path>    Path to output combined context"
      echo "  -v, --verbose          Enable verbose output"
      echo "  -h, --help             Show this help message"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create .cl directory if it doesn't exist
mkdir -p "/Volumes/Envoy/SecondBrain/.cl/insights/cache"

# Default output file if not specified
if [ -z "$OUTPUT_FILE" ]; then
  TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
  OUTPUT_FILE="/Volumes/Envoy/SecondBrain/.cl/insights/cache/insight_${TIMESTAMP}.md"
fi

STRATEGY_LIB="/Volumes/Envoy/SecondBrain/strategy_library"
INDEX_FILE="${STRATEGY_LIB}/_index.json"

if [ ! -f "$INDEX_FILE" ]; then
  echo "Error: Index file not found at $INDEX_FILE" >&2
  exit 1
fi

# Determine which insight to load
if [ -n "$INSIGHT_ID" ]; then
  # Find insight by ID
  INSIGHT_PATH=$(jq -r ".insights[] | select(.id == \"$INSIGHT_ID\") | .file_path" "$INDEX_FILE")
  if [ -z "$INSIGHT_PATH" ] || [ "$INSIGHT_PATH" == "null" ]; then
    echo "Error: No insight found with ID $INSIGHT_ID" >&2
    exit 1
  fi
elif [ -n "$TAG" ]; then
  # Find most recent insight by tag
  # Assumes insights are sorted by date in ID (YYYY-MM-DD_*)
  INSIGHT_ID=$(jq -r ".tags[\"$TAG\"] | sort | reverse | .[0]" "$INDEX_FILE")
  if [ -z "$INSIGHT_ID" ] || [ "$INSIGHT_ID" == "null" ]; then
    echo "Error: No insights found with tag $TAG" >&2
    exit 1
  fi
  INSIGHT_PATH=$(jq -r ".insights[] | select(.id == \"$INSIGHT_ID\") | .file_path" "$INDEX_FILE")
else
  echo "Error: Either --id or --tag must be specified" >&2
  exit 1
fi

# Full path to insight
FULL_INSIGHT_PATH="${STRATEGY_LIB}/${INSIGHT_PATH}"

if [ ! -f "$FULL_INSIGHT_PATH" ]; then
  echo "Error: Insight file not found at $FULL_INSIGHT_PATH" >&2
  exit 1
fi

# Load insight
if $VERBOSE; then
  echo "Loading insight from $FULL_INSIGHT_PATH"
fi

# Copy insight to output file
cp "$FULL_INSIGHT_PATH" "$OUTPUT_FILE"

if $VERBOSE; then
  echo "Insight saved to $OUTPUT_FILE"
  WORD_COUNT=$(wc -w < "$OUTPUT_FILE")
  echo "Word count: $WORD_COUNT"
fi

# Return the path to the insight file
echo "$OUTPUT_FILE"
```

**Step 2: Create Node.js utility for insight queries**
Implement a more powerful query tool:

```javascript
// /Volumes/Envoy/SecondBrain/.cl/insights/query_insights.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const STRATEGY_LIB_PATH = '/Volumes/Envoy/SecondBrain/strategy_library';
const INDEX_PATH = path.join(STRATEGY_LIB_PATH, '_index.json');

class InsightQuery {
  constructor() {
    if (!fs.existsSync(INDEX_PATH)) {
      throw new Error(`Index file not found at ${INDEX_PATH}`);
    }
    
    this.index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  }
  
  findByTag(tag, limit = 5) {
    if (!this.index.tags[tag]) {
      return [];
    }
    
    const insightIds = this.index.tags[tag].sort().reverse().slice(0, limit);
    return this.getInsightsByIds(insightIds);
  }
  
  findByPillar(pillar, limit = 5) {
    if (!this.index.pillars[pillar]) {
      return [];
    }
    
    const insightIds = this.index.pillars[pillar].sort().reverse().slice(0, limit);
    return this.getInsightsByIds(insightIds);
  }
  
  findByImpact(impact, limit = 5) {
    const matchingInsights = this.index.insights
      .filter(insight => insight.master_plan_impact === impact)
      .sort((a, b) => {
        // Sort by date (assuming ID format YYYY-MM-DD_*)
        const dateA = a.id.split('_')[0];
        const dateB = b.id.split('_')[0];
        return dateB.localeCompare(dateA);
      })
      .slice(0, limit);
    
    return matchingInsights.map(insight => ({
      id: insight.id,
      title: insight.title,
      summary: insight.summary,
      file_path: path.join(STRATEGY_LIB_PATH, insight.file_path)
    }));
  }
  
  search(query, limit = 5) {
    // Simple search based on title and summary
    const matchingInsights = this.index.insights
      .filter(insight => {
        const titleMatch = insight.title.toLowerCase().includes(query.toLowerCase());
        const summaryMatch = insight.summary.toLowerCase().includes(query.toLowerCase());
        return titleMatch || summaryMatch;
      })
      .sort((a, b) => {
        // Sort by date (assuming ID format YYYY-MM-DD_*)
        const dateA = a.id.split('_')[0];
        const dateB = b.id.split('_')[0];
        return dateB.localeCompare(dateA);
      })
      .slice(0, limit);
    
    return matchingInsights.map(insight => ({
      id: insight.id,
      title: insight.title,
      summary: insight.summary,
      file_path: path.join(STRATEGY_LIB_PATH, insight.file_path)
    }));
  }
  
  getInsightsByIds(insightIds) {
    return insightIds.map(id => {
      const insight = this.index.insights.find(i => i.id === id);
      if (!insight) return null;
      
      return {
        id: insight.id,
        title: insight.title,
        summary: insight.summary,
        file_path: path.join(STRATEGY_LIB_PATH, insight.file_path)
      };
    }).filter(Boolean);
  }
  
  getFullInsight(insightId) {
    const insight = this.index.insights.find(i => i.id === insightId);
    if (!insight) return null;
    
    const filePath = path.join(STRATEGY_LIB_PATH, insight.file_path);
    if (!fs.existsSync(filePath)) return null;
    
    return fs.readFileSync(filePath, 'utf8');
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const queryType = args[0];
  const queryValue = args[1];
  const limit = args[2] ? parseInt(args[2]) : 5;
  
  const insightQuery = new InsightQuery();
  let results;
  
  switch (queryType) {
    case 'tag':
      results = insightQuery.findByTag(queryValue, limit);
      break;
    case 'pillar':
      results = insightQuery.findByPillar(queryValue, limit);
      break;
    case 'impact':
      results = insightQuery.findByImpact(queryValue, limit);
      break;
    case 'search':
      results = insightQuery.search(queryValue, limit);
      break;
    case 'get':
      results = insightQuery.getFullInsight(queryValue);
      break;
    default:
      console.error('Unknown query type. Use tag, pillar, impact, search, or get.');
      process.exit(1);
  }
  
  console.log(JSON.stringify(results, null, 2));
}

module.exports = InsightQuery;
```

**Step 3: Update todo schema to include insights**
Enhance the task tracking system:

```json
// /Volumes/Envoy/SecondBrain/.cl/todos/schema.json
{
  "schema_version": "1.1",
  "last_updated": "2025-05-13T20:00:00Z",
  "tasks": [
    {
      "id": "task-001",
      "description": "Implement context management system with claude.md hierarchy",
      "status": "in_progress",
      "priority": "high",
      "created_at": "2025-05-13T12:00:00Z",
      "updated_at": "2025-05-13T14:30:00Z",
      "insights": [
        {
          "id": "2025-05-13_craft_prompt_architecture",
          "relevance": "high"
        }
      ],
      "steps": [
        {
          "id": "step-001-1",
          "description": "Update root CLAUDE.md with context management section",
          "status": "completed"
        }
      ]
    }
  ]
}
```

**Step 4: Create insight reviewer agent configuration**
Configure specialized agents:

```json
// /Volumes/Envoy/SecondBrain/.cl/agents/insight_reviewer.json
{
  "name": "InsightReviewer",
  "description": "Evaluates strategic insights and their alignment with Master Plan",
  "model": "claude-3-7-sonnet-20250219",
  "temperature": 0.2,
  "context_behavior": {
    "load_master_plan": true,
    "load_insight_details": true
  },
  "prompt_template": "You are the Strategic Insight Reviewer for SecondBrain. Your job is to evaluate the quality, relevance, and accuracy of insights derived from external content.\n\nYou should:\n1. Evaluate how well the insight aligns with the Master Plan\n2. Identify any contradictions or potential conflicts\n3. Suggest improvements to the insight formatting or content\n4. Recommend implementation priority\n\nMaster Plan:\n{{MASTER_PLAN}}\n\nInsight to review:\n{{INSIGHT}}\n\nProvide your evaluation in this format:\n\n## Alignment Score: [0-100]\n\n## Strengths\n- [List of strengths]\n\n## Areas for Improvement\n- [List of suggestions]\n\n## Implementation Recommendations\n- [List of actionable recommendations]\n\n## Priority: [high|medium|low]",
  "output_format": "markdown",
  "tools_enabled": [
    "read_master_plan",
    "read_insight",
    "update_insight_metadata"
  ]
}
```

### 2.4 Implementation Example: CRAFT Prompt Architecture

As a proof of concept, implement the first strategic insight about the CRAFT prompt architecture.

**Step 1: Create the insight file**
Create the insight document:

```markdown
---
title: "CRAFT Framework for Prompt Architecture"
source_url: "https://youtube.com/watch?v=ABCqfaTjNd4"
channel: "PromptEngineering"
date_processed: "2025-05-13"
date_published: "2025-05-10"
tags: ["prompt-engineering", "meta-prompt", "CRAFT", "training-data"]
pillars: ["Business + Project Management", "Optimize, Optimize, Optimize"]
alignment_score: 95
master_plan_impact: "high"
implementation_priority: "high"
summary: >
  The CRAFT framework provides a structured approach to prompt engineering using Context, Role, Action, Format, and Target audience components, enabling consistent high-quality prompts across agents.
---

# Strategic Insight: CRAFT Framework for Prompt Architecture

## Key Points

- The CRAFT framework provides a structured, repeatable approach to prompt engineering
- Components: Context, Role, Action, Format, Target audience
- Eliminates the need to reinvent prompts for similar tasks
- Ensures consistency across different AI models and agents
- Significantly reduces token usage by being precise and structured

## Master Plan Alignments

This content aligns with the following aspects of the Master Plan:

1. **Agent Behavior Guidelines**: The CRAFT framework directly enhances the existing agent guidelines by providing a structured approach to prompt engineering, improving consistency and effectiveness.

2. **Multi-Agent Architecture**: By standardizing prompt structure, CRAFT enables better communication between different specialized agents, supporting the Planner, Executor, Reviewer pattern.

3. **Optimization & Iterative Improvement**: Aligns with "Optimize, Optimize, Optimize" pillar by providing a framework for continuous prompt refinement and improvement.

## Implementation Recommendations

Based on this insight, consider the following additions or modifications to the Master Plan:

1. **Standardize Agent Prompts**: Implement CRAFT framework across all agent prompts in the SecondBrain system to ensure consistency and quality.

2. **Create Prompt Templates**: Develop a library of CRAFT-based prompt templates for common tasks (summarization, analysis, code generation, etc.) to accelerate development.

3. **Add Prompt Testing**: Implement automated testing for prompts to verify they follow the CRAFT framework and produce expected results.

4. **Token Optimization**: Use the CRAFT structure to audit and optimize token usage across all system prompts.

## Action Items

- [ ] Refactor existing prompts in TubeToTask to follow CRAFT framework
- [ ] Create a prompt template library in the strategy_library directory
- [ ] Implement CRAFT validation in the insight reviewer agent
- [ ] Document CRAFT framework in the system documentation

## Verbatim Quotes

> "If you're building AI systems at scale, you need a consistent framework for your prompts. CRAFT gives you that structure without sacrificing flexibility."

> "Context primes the model with relevant information, Role establishes identity and expertise, Action defines the specific task, Format structures the output, and Target audience tailors the content appropriately."

> "By separating these components, you can easily modify one element without rewriting the entire prompt. It's modular prompt engineering."
```

**Step 2: Update index.json**
Add the insight to the index:

```json
{
  "last_updated": "2025-05-13T12:34:56Z",
  "insights": [
    {
      "id": "2025-05-13_craft_framework_for_prompt_architecture",
      "file_path": "insights/2025-05-13_craft_framework_for_prompt_architecture.md",
      "title": "CRAFT Framework for Prompt Architecture",
      "tags": ["prompt-engineering", "meta-prompt", "CRAFT", "training-data"],
      "pillars": ["Business + Project Management", "Optimize, Optimize, Optimize"],
      "alignment_score": 95,
      "master_plan_impact": "high",
      "implementation_priority": "high",
      "summary": "The CRAFT framework provides a structured approach to prompt engineering using Context, Role, Action, Format, and Target audience components, enabling consistent high-quality prompts across agents."
    }
  ],
  "tags": {
    "prompt-engineering": ["2025-05-13_craft_framework_for_prompt_architecture"],
    "meta-prompt": ["2025-05-13_craft_framework_for_prompt_architecture"],
    "CRAFT": ["2025-05-13_craft_framework_for_prompt_architecture"],
    "training-data": ["2025-05-13_craft_framework_for_prompt_architecture"]
  },
  "pillars": {
    "Business + Project Management": ["2025-05-13_craft_framework_for_prompt_architecture"],
    "Optimize, Optimize, Optimize": ["2025-05-13_craft_framework_for_prompt_architecture"]
  }
}
```

**Step 3: Create a CRAFT template**
Add a template for creating CRAFT-based prompts:

```markdown
# CRAFT Prompt Template

## Context
[Provide relevant background information, constraints, and knowledge the AI needs]

## Role
[Define who/what the AI should act as, including expertise level and perspective]

## Action
[Specify exactly what the AI should do, with clear steps if needed]

## Format
[Describe how the output should be structured and formatted]

## Target Audience
[Specify who will consume this output and their needs/level]

---

## Example: Strategic Insight Generation

### Context
You have access to a YouTube transcript about [TOPIC]. The Master Plan prioritizes practical, actionable insights that can be implemented in the SecondBrain system. Focus on concrete patterns and techniques rather than theoretical concepts.

### Role
You are a Strategic Insight Analyst for SecondBrain, specializing in extracting actionable patterns and implementation recommendations from content. You have deep expertise in systems thinking, software architecture, and business strategy.

### Action
1. Analyze the transcript to identify the core techniques, frameworks, or methodologies presented
2. Extract 3-5 key points that summarize the main insights
3. Evaluate how these insights align with the Master Plan
4. Generate specific implementation recommendations
5. Identify direct quotes that capture the essence of key insights

### Format
Structure your response with these sections:
- **Key Points**: Bullet list of 3-5 main insights
- **Master Plan Alignments**: How this content supports specific aspects of the Master Plan
- **Implementation Recommendations**: Specific, actionable changes to consider
- **Action Items**: Concrete next steps as a checklist
- **Verbatim Quotes**: 2-3 direct quotes with citation

### Target Audience
The insight will be reviewed by the Strategy Advisor agent and then by Tina, who needs practical, implementation-focused recommendations rather than theoretical analysis. Focus on execution rather than explanation.
```

### 2.5 Documentation and User Guidelines

**Step 1: Create README.md for strategy_library**
Document the structure and usage:

```markdown
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
```

**Step 2: Create guide for Claude integration**
Document how to use insights with Claude:

```markdown
# Using Strategic Insights with Claude

This guide explains how to effectively use the strategic insights library with Claude and other agents in the SecondBrain system.

## 1. Loading Insights Directly

The most direct way to use insights is to load them explicitly:

```
To provide context for my next task, please load the CRAFT prompt architecture insight.

claude-cli:
.cl/insights/load_insight.sh --tag CRAFT
```

## 2. Task Context Integration

When defining tasks in the todo system, reference relevant insights:

```json
{
  "id": "task-001",
  "description": "Refactor agent prompts using CRAFT framework",
  "insights": [
    {
      "id": "2025-05-13_craft_framework_for_prompt_architecture",
      "relevance": "high"
    }
  ]
}
```

Claude will automatically load these insights when working on the task.

## 3. Prompt Integration

Use special directives in prompts to dynamically load insights:

```
You are tasked with creating a new prompt for the YouTube summarizer.

@load_insight{tag:CRAFT}

Using the CRAFT framework outlined in the insight above, design a prompt that...
```

## 4. Insight Discovery

When you're not sure which insights might be relevant:

```
claude-cli:
node .cl/insights/query_insights.js search "prompt engineering" 5
```

Or ask Claude to help:

```
What insights do we have related to prompt engineering best practices?

claude-cli:
node .cl/insights/query_insights.js search "prompt engineering" 5
```

## 5. Insight Review and Feedback

To improve the quality of insights, provide feedback:

```
This insight about CRAFT prompting is useful, but it's missing implementation examples. Please enhance it.

claude-cli:
.cl/agents/insight_reviewer.js enhance 2025-05-13_craft_framework_for_prompt_architecture
```

## 6. Creating New Insights Manually

For important content you've consumed:

```
I just watched a video about system prompting techniques. Please help me create an insight for it.

claude-cli:
.cl/agents/insight_creator.js
```

Claude will guide you through the process of creating a new strategic insight.

## 7. Best Practices

- **Be Specific**: Reference insights by ID or specific tags when possible
- **Combine Insights**: Load multiple relevant insights for complex tasks
- **Update Regularly**: Insights evolve - check for newer versions
- **Provide Feedback**: Help improve insights by suggesting enhancements
- **Prioritize Implementation**: Focus on how to apply insights in practice
```

## 3. Reviewer Agent Analysis

The implementation plan has been designed to fulfill all requirements while maintaining alignment with the Master Plan. Let's analyze the key aspects:

### 3.1 Alignment with Master Plan

The proposal aligns strongly with the Master Plan in these areas:

1. **Prime Directive**: The system preserves all knowledge without truncation, using structured storage and comprehensive metadata.

2. **Foundation-First Approach**: Builds hierarchically from existing TubeToTask framework to a complete strategic insights system.

3. **MVP-First Approach**: Each component is designed to be immediately useful while supporting further iteration.

4. **Tool-Oriented Development**: Creates tools needed internally (insight loading, querying) that can be productized.

5. **Agent Transparency & Traceability**: All processes are visible and traceable through logs and structured metadata.

6. **Execution-First Stack**: Prioritizes execution through automation and clear processing pipelines.

7. **Autonomous Operation**: Designed to run without Tina's intervention, with automated scheduling and processing.

### 3.2 Integration with Context Management System

The proposal integrates cleanly with the Context Management System:

1. **Claude.md Hierarchy**: Leverages the existing context hierarchy pattern for loading insights.

2. **Task Planning & Persistence**: Extends the todo schema to include insights, creating a direct connection.

3. **Memory Compaction**: Supports selective loading of insights to optimize token usage.

4. **Test-Driven Development**: Includes validation mechanisms for insights and their processing.

### 3.3 Implementation Considerations

Key considerations for successful implementation:

1. **Progressive Rollout**: Start with manual insight creation and review before full automation.

2. **Testing & Validation**: Thoroughly test YouTube API integration to handle rate limits and errors.

3. **Documentation**: Maintain clear documentation for all components to ensure usability.

4. **User Experience**: Focus on making insight discovery and application seamless.

## 4. Next Steps and Timeline

### Immediate (1-2 days)

1. Create the strategy_library directory structure
2. Implement the first CRAFT prompt architecture insight
3. Create the basic CLI tools for insight management

### Short-term (3-7 days)

1. Enhance TubeToTask with transcript processing and summarization
2. Implement integration with the context management system
3. Create initial documentation and examples

### Medium-term (1-2 weeks)

1. Implement automated YouTube channel monitoring
2. Develop insight reviewer agent
3. Create comprehensive testing and validation

### Long-term (2-4 weeks)

1. Refine through real-world usage
2. Expand to additional content sources
3. Develop visualization and discovery tools

## 5. Conclusion

This implementation plan provides a comprehensive approach to integrating YouTube content processing, strategic insight extraction, and Master Plan alignment into the SecondBrain system. By leveraging the existing TubeToTask framework and context management system, it creates a powerful capability to automatically process, analyze, and apply insights from external content.

The system maintains full alignment with the Prime Directive by preserving all knowledge in structured, searchable formats while optimizing for Claude's context limitations through selective loading and structured frontmatter.

This implementation will enable Tina to efficiently:
1. Stay updated on the latest relevant content
2. Extract strategic insights automatically
3. Apply these insights to the Master Plan
4. Track the source and context of all strategic decisions

With this system in place, SecondBrain will continually evolve and improve based on external knowledge while maintaining its core principles and focus.