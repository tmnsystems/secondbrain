# SecondBrain Style Analysis and Content Generation System

## Overview

The SecondBrain Style Analysis and Content Generation System is designed to analyze your writing style across all content sources and generate new content that authentically matches your unique voice. The system processes every single file in your content library, extracts style patterns, and creates a comprehensive style profile that captures your distinctive communication patterns.

## Key Components

### 1. Comprehensive Content Processing

The system analyzes **ALL** of your content, including:
- Transcripts from coaching sessions and meetings
- Blog posts and marketing content
- Social media posts
- Written content and style guides

Every file is processed and analyzed to ensure that the complete range of your communication style is captured, with no content excluded.

### 2. Style Analysis

For each piece of content, the system extracts:
- Voice and tone patterns
- Characteristic phrases and expressions
- Metaphors and analogies
- Structural patterns and sentence construction
- Rhetorical devices
- Conceptual frameworks and teaching methodologies
- Value hierarchy
- Distinctive vocabulary

### 3. Individual and Combined Profiles

The system creates:
- Individual style profiles for each processed file
- A combined master profile that synthesizes all individual profiles

The master profile is weighted to prioritize style guides and high-quality content while still incorporating the full breadth of your communication style.

### 4. Content Generation

Using the master style profile, the system can generate various types of content:
- Articles and blog posts
- Standard Operating Procedures (SOPs)
- Course outlines
- Action plans

Each generated piece authentically captures your unique voice, teaching methodology, and communication style.

## How to Use

### Process Content
```
npm run process             # Process new or modified content
npm run process-force       # Force processing of all content
```

### Analyze Style
```
npm run analyze-style       # Analyze all processed content
npm run combine-profiles    # Create master style profile
```

### Generate Content
```
npm run master-article --topic="Your topic"     # Generate article
npm run master-sop --topic="Your topic"         # Generate SOP
npm run master-course --topic="Your topic"      # Generate course
npm run master-plan --topic="Your topic"        # Generate action plan
```

### Web Interface
```
npm run web                 # Start the web interface
```

## System Workflow

1. **Content Processing**: All content files are processed, identifying content types and extracting raw text.
2. **Incremental Processing**: The system tracks processed files and only reprocesses content that has changed.
3. **Style Analysis**: Individual style profiles are created for each content piece.
4. **Profile Combination**: Individual profiles are combined into a master profile.
5. **Content Generation**: New content is generated using the master profile.

## Benefits

- **Authentic Voice**: Generated content genuinely sounds like you wrote it.
- **Comprehensive Analysis**: By analyzing ALL content, the system captures the full range of your communication style.
- **Multiple Content Types**: Generate various content types with the same authentic voice.
- **Incremental Processing**: Only process new or modified content after the initial setup.
- **Web Interface**: Easy-to-use interface for generating content without command line knowledge.

## Notes

This system prioritizes COMPLETENESS over optimization. It analyzes every single file to ensure that your full communication style is captured, rather than taking shortcuts with representative samples. This approach ensures the most authentic and comprehensive style analysis possible.