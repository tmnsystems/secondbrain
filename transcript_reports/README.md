# Transcript Reports

This directory contains automatically generated reports from the ZoomTranscriptFetcher system.

Each report is created when new transcripts are fetched and processed, and contains:

1. A timestamp of when the processing occurred
2. The total number of transcripts processed
3. Details organized by client
4. Links to the processed transcripts
5. Processing status information

## Example Report Format

```markdown
# Transcript Processing Report

**Generated:** 2025-05-05 14:30:45

**Total Transcripts:** 3

## Client: ClientName

**Transcripts Processed:** 2

| Filename | Date | Status |
|----------|------|--------|
| 2025-05-05_MeetingName_123456789.txt | 2025-05-05 | Processed |
| 2025-05-05_AnotherMeeting_987654321.txt | 2025-05-05 | Processed |

## Client: AnotherClient

**Transcripts Processed:** 1

| Filename | Date | Status |
|----------|------|--------|
| 2025-05-04_ClientMeeting_456789123.txt | 2025-05-04 | Processed |
```

Reports are created automatically whenever new transcripts are fetched and processed by the system.