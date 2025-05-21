# SecondBrain Context System

## Overview

The SecondBrain Context System is a critical infrastructure component that ensures continuity, strategic alignment, and preservation of rich context throughout the entire SecondBrain ecosystem. This system addresses the challenge of context loss between CLI sessions and provides a comprehensive understanding of the system's components and their relationships.

## Core Components

### 1. Three-Layer Persistence Architecture

The foundation of our context system is the three-layer persistence architecture:

- **Redis Layer (Short-term)**: High-speed access to active contexts
- **PostgreSQL Layer (Medium-term)**: Comprehensive structured storage
- **Pinecone Layer (Long-term)**: Semantic vector search capabilities

Full documentation: [CONTEXT_SYSTEM.md](/Volumes/Envoy/SecondBrain/CONTEXT_SYSTEM.md)

### 2. Context Catalog System

Building on the persistence architecture, the Context Catalog System provides:

- Complete mapping of all code, documentation, and configuration files
- Comprehensive relationship tracking between components
- Strategic alignment analysis
- Visualization of system architecture
- Context prioritization for agents

Full documentation: [context_system/CONTEXT_CATALOG.md](/Volumes/Envoy/SecondBrain/context_system/CONTEXT_CATALOG.md)

## Architecture

The complete architecture integrates these systems to provide:

- **Never Truncate Principle**: Preserves all context in its full richness
- **Strategic Alignment**: Maps all technical components to business objectives
- **Relationship-Aware**: Maintains the complex web of relationships between components
- **Agent Empowerment**: Provides optimized but comprehensive context to agents
- **Human Oversight**: Maintains transparency through Notion integration

Architecture diagrams: [context_system/FULL_CONTEXT_ARCHITECTURE.md](/Volumes/Envoy/SecondBrain/context_system/FULL_CONTEXT_ARCHITECTURE.md)

## Implementation

The context system is implemented through several key files:

1. **Context System Core**: [context_system/README.md](/Volumes/Envoy/SecondBrain/context_system/README.md)
2. **Catalog Implementation**: [context_system/CONTEXT_CATALOG_IMPLEMENTATION.md](/Volumes/Envoy/SecondBrain/context_system/CONTEXT_CATALOG_IMPLEMENTATION.md)
3. **Integration Script**: [context_system/integrate_catalog_with_context.js](/Volumes/Envoy/SecondBrain/context_system/integrate_catalog_with_context.js)
4. **Catalog Scripts**:
   - [context_system/setup-catalog-database.js](/Volumes/Envoy/SecondBrain/context_system/setup-catalog-database.js)
   - [context_system/catalog-secondbrain-files.js](/Volumes/Envoy/SecondBrain/context_system/catalog-secondbrain-files.js)
   - [context_system/analyze-catalog-results.js](/Volumes/Envoy/SecondBrain/context_system/analyze-catalog-results.js)
   - [context_system/scheduled-catalog-maintenance.sh](/Volumes/Envoy/SecondBrain/context_system/scheduled-catalog-maintenance.sh)

## Usage

### CLI Commands

The context system is accessible through the CLI:

```bash
# Load context for current task
.cl/context load --task=<task_id> --depth=<1-5>

# Show file relationships
.cl/context map <file_path>

# Get strategic overview
.cl/context overview --project=<project>

# Report on duplicated or abandoned code
.cl/context audit --type=<duplicates|abandoned|gaps>

# Create visualization for a subsystem
.cl/context visualize --system=<system> --output=<notion|png>

# Run maintenance tasks
.cl/context maintain --full
```

### Agent API

Agents interact with the context system through a standardized API:

```javascript
// Load context for a specific task
const context = await contextSystem.getContextForAgent({
  agentId: 'planner-agent',
  taskId: 'implement-feature-x',
  sessionId: 'user-session-123'
});

// Update context based on changes
await contextSystem.updateAgentContext({
  agentId: 'executor-agent',
  taskId: 'implement-feature-x',
  updates: [{ filePath, changeDescription, impactAssessment }]
});
```

## Review and Approval

This implementation has been reviewed by the Reviewer Agent as required by the Prime Directive. The review verified that the system:

1. Fully complies with the "NEVER TRUNCATE" principle
2. Provides proper integration with the existing architecture
3. Maintains comprehensive relationship mapping
4. Ensures strategic alignment with business objectives
5. Supports the full agent workflow

## Conclusion

The SecondBrain Context System forms the foundation for maintaining coherence, continuity, and strategic alignment throughout the SecondBrain ecosystem. By preserving the full richness of context and relationships, it directly supports the Prime Directive's requirement to maintain the complex, comprehensive nature of the system without simplification or truncation.