# Document Upload Guide for SecondBrain

This guide explains how to add documents to the SecondBrain system for processing and style analysis.

## Upload Directories

Place your documents in the appropriate subdirectory under `/uploads/`:

1. **By File Type**
   - `/uploads/txt/` - Plain text files
   - `/uploads/md/` - Markdown files
   - `/uploads/json/` - JSON files (including existing style profiles)

2. **By Content Type**
   - `/uploads/transcripts/` - Call, podcast, or video transcripts
   - `/uploads/blog_posts/` - Blog posts and articles
   - `/uploads/frameworks/` - Business frameworks and methodologies
   - `/uploads/sops/` - Standard Operating Procedures
   - `/uploads/courses/` - Course content and lessons
   - `/uploads/social_media/` - Social media posts and threads

The system will prioritize and weight documents differently based on their location.

## Processing Documents

After uploading your documents, run:

```bash
node process_all_docs.js
```

This will:
1. Find all `.txt`, `.md`, and `.json` files in the upload directories
2. Process each file to extract your unique style
3. Save individual style profiles to `/processed_transcripts/`
4. Create a combined style profile at `/processed_transcripts/combined_style_profile.json`

## Style Extraction Process

For each document, the system:

1. Analyzes content to identify your unique:
   - Voice and tone
   - Word choice and terminology
   - Sentence structures
   - Rhetorical devices
   - Metaphors and analogies
   - Teaching approaches
   - Reasoning frameworks
   - Decision-making heuristics
   - Value hierarchies

2. Creates a comprehensive style profile with 10 key dimensions

3. Weights different source types in the combined profile:
   - Blog posts, frameworks and SOPs receive highest weight
   - Transcripts receive medium weight
   - Social media posts receive lower weight

## Generating Content With Your Style

After processing documents, you can generate new content matching your style:

```bash
node generate_with_combined_profile.js "Your content topic"
```

## Adding More Documents Later

You can add more documents at any time and rerun the processing script. The system will:
1. Process the new documents
2. Create new individual style profiles
3. Update the combined style profile with the new information

## Format Requirements

- **Text (.txt) files**: Plain text with no special formatting
- **Markdown (.md) files**: Standard markdown format
- **JSON (.json) files**: Valid JSON format, can include existing style profiles

## Best Practices

1. **Diverse Documents**: Include a mix of written and transcribed content
2. **Complete Documents**: Upload full transcripts, not just snippets
3. **Labeled Files**: Use descriptive filenames (e.g., `coaching_call_framework.txt`)
4. **Original Content**: Focus on your original content, not client responses in transcripts