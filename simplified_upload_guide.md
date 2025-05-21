# Simplified Document Upload Guide

## Just Put Your Files In One Place

For a more streamlined experience, simply place all your files in a single directory:

```
/uploads/content/
```

You can add **any file type** (.txt, .md, .json) to this directory. The system will:
1. Automatically detect file types (.txt, .md, .json)
2. Process them appropriately
3. Extract your unique style patterns

## Optional: Categorize By Content Type (Not Required)

If you prefer to organize by content type (completely optional), you can use these subdirectories:

```
/uploads/content/
├── transcripts/       # Call/podcast transcripts (any format)
├── blog_posts/        # Blog posts (any format) 
├── frameworks/        # Business frameworks (any format)
├── courses/           # Course content (any format)
└── uncategorized/     # Any other content (any format)
```

The style extraction will work regardless of which folder you use, but categorization helps the system recognize context and weight content appropriately.

## Process All Your Content

To process everything at once:

```bash
node process_content.js
```

This single command will:
- Find all your files (.txt, .md, .json) in the content directories
- Process everything in one go
- Create a combined style profile that captures your unique voice and thought patterns

## No Sorting Required

You don't need to:
- Sort files by file type
- Manually categorize content (unless you want to)
- Process different formats separately

Just add files and run the processor!