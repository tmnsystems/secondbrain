# SecondBrain Context System

> **IMPORTANT: This system requires Reviewer Agent approval for all operations**

This document describes the SecondBrain File Catalog System, which provides persistent context between sessions by maintaining a comprehensive record of all files, their strategic purpose, and their relationships.

## Purpose

The Catalog System addresses a critical issue in the SecondBrain ecosystem: **context loss between CLI sessions**. By creating a persistent, queryable record of all files and projects in Notion, we ensure that:

1. Strategic alignment is maintained across sessions
2. Duplicated or abandoned work is identified
3. File relationships and dependencies are documented
4. Refactoring and optimization opportunities are highlighted

## Components

### 1. Notion Database Structure

The system creates a structured Notion database (`SecondBrain File Catalog`) with the following key fields:

- **Basic Metadata**: Name, Path, Size, Last Modified date, Type
- **Strategic Fields**: 
  - Status: Active, In Progress, Abandoned, Duplicated, Unknown
  - Project: SecondBrain, TubeToTask, NymirAI, ClientManager, CoachTinaMarieAI
  - Strategic Relevance: Agent Logic, Context System, Embedding Config, etc.
  - Claude Integration: How the file connects to Claude (Prompt, Context Loader, etc.)
  - Storage Integration: Which persistence systems the file interacts with
  - Action Needed: Cleanup, Refactor, Merge, Delete, etc.
  - Business Alignment: How the file connects to business objectives

### 2. Scanning System

The `catalog-secondbrain-files.js` script scans the entire SecondBrain directory structure and:

- Analyzes each file for its strategic purpose
- Determines appropriate status and needed actions
- Identifies connections to Claude and storage systems
- Uploads all metadata to the Notion database

Key features of the scanning system:
- **Batch Processing**: Processes files in configurable batches to prevent API rate limits
- **Checkpoint System**: Saves progress regularly and can resume from interruptions
- **Large File Handling**: Special processing for very large files
- **Skip Patterns**: Ignores irrelevant directories (node_modules, .git, etc.)

### 3. Analysis System

The `analyze-catalog-results.js` script creates actionable insights from the catalog:

- Identifies potential duplicate files
- Highlights strategic drift (files that don't align with current architecture)
- Pinpoints abandoned work and incomplete features
- Provides statistics on project composition and health
- Creates a summary page in Notion with key findings

### 4. Maintenance Schedule

The `scheduled-catalog-maintenance.sh` script automates catalog updates:

- Can be scheduled to run on a regular basis (e.g., weekly)
- Logs all activity for audit purposes
- Ensures the catalog stays current as the codebase evolves

## Usage

### Initial Setup

```bash
# 1. Initialize session (REQUIRED)
node /Volumes/Envoy/SecondBrain/initialize-session.js

# 2. Create the Notion database (requires Reviewer Agent approval)
node setup-catalog-database.js

# 3. Run the full cataloging process (requires Reviewer Agent approval)
node catalog-secondbrain-files.js

# 4. Analyze the results
node analyze-catalog-results.js
```

### Scheduled Maintenance

```bash
# Run the maintenance script manually
./scheduled-catalog-maintenance.sh

# Or set up as a cron job for weekly updates
# 0 1 * * 0 /Volumes/Envoy/SecondBrain/context_system/scheduled-catalog-maintenance.sh
```

## Strategic Benefits

1. **Continuity Between Sessions**: Even if you lose context in a CLI session, the knowledge about the codebase persists in Notion.
2. **Strategic Alignment**: Easily identify which files don't align with the current architecture.
3. **Refactoring Prioritization**: Focus cleanup efforts on the most critical areas identified by analysis.
4. **Transparency**: All team members can see the state of the codebase and needed actions.
5. **Business Connection**: Understand how technical components map to business objectives.

## Future Enhancements

1. **Visualization**: Add graph visualization for file relationships and dependencies
2. **Automated PR Creation**: Generate pull requests for suggested cleanup actions
3. **Integration with LangGraph**: Connect catalog data to agent workflows
4. **Semantic Analysis**: Use Claude to analyze file contents more deeply
5. **Multi-repository Support**: Extend to catalog all related repositories

## Reviewer Agent Integration

As per the Prime Directive, all plans related to this system must be reviewed by the Reviewer Agent before implementation. This ensures strategic alignment and quality of the system.

### Verification Process

All scripts in this directory now include Reviewer Agent verification:

1. Scripts call `verifyReviewerApproval()` at the beginning of execution
2. If not approved, the script will exit and prompt for Reviewer Agent consultation
3. Approval records are stored in Notion and local logs
4. Completed operations report back to the Reviewer Agent

### Session Initialization

To prevent context loss between CLI sessions, a session initialization script has been added:

```bash
# Run at the beginning of each session
node /Volumes/Envoy/SecondBrain/initialize-session.js
```

This script ensures that the Reviewer Protocol is understood and followed in every session.

---

*This documentation was created following consultation with the Reviewer Agent as required by the SecondBrain Prime Directive.*