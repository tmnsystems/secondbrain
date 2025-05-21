# Context Loading in SecondBrain

This document explains how context is loaded and managed across different projects within the SecondBrain system.

## Context Inheritance Model

SecondBrain uses a hierarchical context loading system:

1. **Root Context**: `/Volumes/Envoy/SecondBrain/CLAUDE.md` contains the Master Plan and global system information
2. **Directory-Specific Context**: Each project directory contains its own `CLAUDE.md` with specialized information

## How Context Loading Works

When working with any SecondBrain project, the context loading system ensures that:

1. The root `CLAUDE.md` is always loaded first, providing the Master Plan and global context
2. The directory-specific `CLAUDE.md` is loaded second, providing project-specific context
3. Both contexts are combined to give Claude complete information while maintaining priority on project-specific details

## Context Loading Tools

### .cl/load-context.sh

This script handles context loading, combining root and directory-specific context:

```bash
# Load context for a specific project
.cl/load-context.sh --context /Volumes/Envoy/SecondBrain/apps/TubeToTask/CLAUDE.md

# Save combined context to a specific file
.cl/load-context.sh --context /Volumes/Envoy/SecondBrain/apps/TubeToTask/CLAUDE.md --output /tmp/combined_context.md

# Show verbose output including token count
.cl/load-context.sh --context /Volumes/Envoy/SecondBrain/apps/TubeToTask/CLAUDE.md --verbose
```

### claw-enhanced CLI Tool

The headless CLI tool automatically handles context loading:

```bash
# Run command with TubeToTask context
.cl/claw-enhanced --context /Volumes/Envoy/SecondBrain/apps/TubeToTask --command "Analyze video transcript"

# Run a prompt file with processed_data context
.cl/claw-enhanced --context /Volumes/Envoy/SecondBrain/processed_data --prompt analysis_prompt.txt
```

## Working in Different Terminal Windows

When working on different projects in separate terminal windows, each session can have its own context:

1. In terminal window 1, working on TubeToTask:
   ```bash
   cd /Volumes/Envoy/SecondBrain
   .cl/claw-enhanced --context /Volumes/Envoy/SecondBrain/apps/TubeToTask [commands]
   ```

2. In terminal window 2, working on topic extraction:
   ```bash
   cd /Volumes/Envoy/SecondBrain
   .cl/claw-enhanced --context /Volumes/Envoy/SecondBrain/topic_extracts [commands]
   ```

This approach ensures:
- Each session has the full context (root + project-specific)
- No context overlap issues between projects
- Clear separation of tasks and todos per project
- Maximum efficiency of token usage by loading only what's needed

## Context Inheritance Markers

Each directory-specific `CLAUDE.md` file contains inheritance markers:

```markdown
<!-- @inherit: /Volumes/Envoy/SecondBrain/CLAUDE.md -->
<!-- IMPORTANT: Load the root CLAUDE.md file first before processing this context -->
```

These markers:
1. Provide explicit documentation of the inheritance
2. Serve as instructions for context loading tools
3. Help human readers understand the context structure

## Best Practices

1. Always use the context loading tools rather than loading files directly
2. When adding new project directories, create a specialized `CLAUDE.md` with inheritance markers
3. Keep project-specific context focused on that project to minimize token usage
4. Use the `--verbose` flag when loading context to monitor token usage