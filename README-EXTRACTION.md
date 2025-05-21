# SecondBrain Full Extraction System

This system is designed to process all of Tina's content (~200 transcripts, articles, and interviews) to extract metaphors, values, frameworks, and teaching patterns while preserving the full context of each.

**IMPORTANT: This system is intentionally designed to be maximally inclusive, capturing ANYTHING that might potentially fall into these categories, even when they overlap. The system never excludes potential matches - all filtering power remains solely with Tina.**

## Purpose

The extraction system serves a critical purpose:
- Process ALL content files in the library
- Extract metaphors/analogies with full context
- Extract values statements with full context
- Extract teaching patterns with full context
- Generate comprehensive catalogs that maintain the emotional nuance and meaning of Tina's exact words

## Key Components

1. **Extraction System**: Core functionality for detecting and extracting patterns
   - `src/extraction_system.py`

2. **Extraction Server**: Persistent background process that handles all files
   - `src/extract_server.py`
   - Runs independently of terminal sessions
   - Maintains state between restarts
   - Processes files systematically
   - Generates comprehensive catalogs

3. **Start Script**: Easy way to launch the extraction process
   - `start_extraction.sh`

## How to Use

### Starting the Extraction Process

Start the full extraction process with:

```bash
./start_extraction.sh
```

This will:
1. Launch the extraction server as a background process
2. Show the initial status
3. Display the log file contents in real-time
4. Continue running even if you close the terminal

You can press Ctrl+C to stop watching the logs while the extraction continues in the background.

### Checking Status

Check the status of the extraction process with:

```bash
python3 src/extract_server.py status
```

This shows:
- Whether the server is running
- How many files have been processed
- How many patterns have been extracted
- What file is currently being processed

### Stopping the Process

Stop the extraction process with:

```bash
python3 src/extract_server.py stop
```

## Output

The extraction system generates several key outputs in the `/Volumes/Envoy/SecondBrain/extracted_content/` directory:

1. **Full Databases**:
   - `metaphors_database.json`: Complete database of all extracted metaphors
   - `values_database.json`: Complete database of all extracted values
   - `teaching_patterns_database.json`: Complete database of all extracted teaching patterns

2. **Comprehensive Catalogs**:
   - `COMPREHENSIVE_METAPHORS_CATALOG.md`: Human-readable catalog of metaphors
   - `COMPREHENSIVE_VALUES_CATALOG.md`: Human-readable catalog of values
   - `COMPREHENSIVE_TEACHING_PATTERNS_CATALOG.md`: Human-readable catalog of teaching patterns

## Important Notes

1. **Preserving Context**: The system preserves Tina's exact words and surrounding context to maintain the full emotional nuance.

2. **Background Processing**: The extraction server is designed to run persistently in the background, even if your terminal session ends.

3. **Log Files**: Detailed logs are available in `/Volumes/Envoy/SecondBrain/logs/`

4. **Fault Tolerance**: The system maintains state and can resume from where it left off if interrupted.

5. **Processing Time**: Processing all files may take significant time, but the system is designed to handle this robustly.

This system is designed to thoroughly process all content to build a comprehensive library of Tina's teaching patterns, metaphors, and values - preserving the full context required for authentic reproduction of her distinctive style.