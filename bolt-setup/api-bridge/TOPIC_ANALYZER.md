# Topic Analyzer System

The Topic Analyzer is a system designed to process transcripts in the SecondBrain system to extract topics and Coach Tina Marie's responses. It creates a comprehensive database of topics with associated approaches, analogies, and strategies.

## Overview

The Topic Analyzer uses OpenAI's o4-mini model with its large context window to analyze transcripts and extract:

1. Topics discussed in coaching sessions
2. Coach Tina's specific responses to each topic
3. Analogies, metaphors, and strategies used
4. Categories for each topic

The system includes:
- A processor script that analyzes transcripts
- A monitoring script that checks progress every 15 minutes
- API endpoints to check status and query topics

## Getting Started

### Prerequisites

- OpenAI API key
- Python 3.7+
- Node.js (for API Bridge)

### Starting the Topic Analyzer

#### Process Specific Clients Only

To process only specific clients (Aretas, Fuji, Esther) first to review results:

1. Set your OpenAI API key as an environment variable:
   ```
   export OPENAI_API_KEY=your_openai_api_key
   ```

2. Run the specific clients script:
   ```
   bash process-specific-clients.sh
   ```

3. View progress in the logs:
   ```
   tail -f api-bridge/transcript_analyzer.log
   ```

4. After processing completes, review the results through the API:
   ```
   curl "http://localhost:3030/api/topics?client=aretas"
   curl "http://localhost:3030/api/topics?client=fuji"
   curl "http://localhost:3030/api/topics?client=esther"
   ```

#### Process All Transcripts 

To process the entire collection of transcripts:

1. Set your OpenAI API key as an environment variable:
   ```
   export OPENAI_API_KEY=your_openai_api_key
   ```

2. Run the full starter script:
   ```
   bash start-topic-analyzer.sh
   ```

3. The analyzer will run in the background with monitoring. View progress in the logs:
   ```
   tail -f api-bridge/monitor_analyzer.log
   tail -f api-bridge/transcript_analyzer.log
   ```

## API Endpoints

### Check Analysis Status

```
GET /api/topic-analyzer/status
```

Response:
```json
{
  "status": "active",
  "last_activity": "2023-05-04T12:34:56.789Z",
  "minutes_since_activity": 5,
  "processed_files": 42,
  "topics_count": 128,
  "sample_topics": ["Strategic Planning", "Client Acquisition", "Team Management", "Productivity Systems", "Business Growth"]
}
```

### Get All Topics

```
GET /api/topics?search=planning&category=Strategy&client=aretas&page=1&limit=20
```

Query Parameters:
- `search`: Search term for topics, categories, or approaches
- `category`: Filter by category
- `client`: Filter by client name (e.g., aretas, fuji, esther)
- `page`: Page number (default: 1)
- `limit`: Number of topics per page (default: 20)

Response:
```json
{
  "success": true,
  "topics": [
    {
      "topic": "Strategic Planning",
      "category": "Strategy",
      "response_count": 8,
      "approaches": ["Garden analogy", "Blueprint metaphor", "River banks comparison"],
      "sources": ["transcript_123.json", "transcript_456.json"]
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "total_pages": 3,
  "categories": ["Strategy", "Operations", "Marketing", "Leadership"],
  "clients": {
    "aretas": 15,
    "fuji": 23,
    "esther": 8
  }
}
```

### Get a Specific Topic

```
GET /api/topics/Strategic%20Planning
```

Response:
```json
{
  "success": true,
  "topic": {
    "topic": "Strategic Planning",
    "category": "Strategy",
    "approaches": ["Garden analogy", "Blueprint metaphor", "River banks comparison"],
    "sources": ["transcript_123.json", "transcript_456.json"],
    "responses": [
      {
        "text": "Business is like a garden. You can't just plant seeds and walk away. You need to water them, provide the right nutrients, pull weeds, and pay attention to what's growing and what's not. Strategic planning is your gardening schedule - it tells you when to do each task so everything flourishes.",
        "source": "transcript_123.json",
        "context": "Explaining the importance of regular strategic planning"
      }
    ]
  }
}
```

## Monitoring Progress

The system includes a monitoring script that checks progress every 15 minutes. If there's no activity detected for 30 minutes, it will restart the analyzer automatically.

You can view the current status using the API endpoint or by checking the logs.

## Output Files

The analyzer creates several output files in the `topic_database` directory:

- `processing_progress.json`: Tracks the progress of the analysis
- `topics_database.json`: Contains the full database of topics and responses
- `notion_import.json`: Formatted for import into Notion

## Troubleshooting

If the analyzer stops working:

1. Check the logs for errors:
   ```
   cat api-bridge/transcript_analyzer.log
   ```

2. Verify your OpenAI API key is valid

3. Restart the monitor:
   ```
   bash start-topic-analyzer.sh
   ```

If data is incorrect or missing:

1. Remove the specific transcript analysis file from the `topic_database` directory
2. Remove the file path from `processing_progress.json`
3. Restart the analyzer to reprocess the file