# SecondBrain Context Catalog System

## Overview

The SecondBrain Context Catalog System is a critical component of the three-layer context persistence architecture, providing comprehensive mapping and relationship tracking across the entire SecondBrain ecosystem. This document details the implementation of the context catalog, which serves as both a discovery mechanism and a strategic alignment tool.

## Integration with the Three-Layer Context Architecture

The Context Catalog System is deeply integrated with the existing three-layer persistence architecture:

### 1. Redis Layer Integration
- Stores active file references with full metadata
- Maintains hot paths for frequently accessed files
- Updates in real-time during CLI sessions

### 2. PostgreSQL Layer Integration
- Houses the complete structural mapping of all files
- Maintains relationship graphs between components
- Stores full metadata and strategic alignment information
- Preserves historical versions and evolution tracking

### 3. Pinecone Layer Integration
- Embeds file contents for semantic retrieval
- Links catalog entries to their semantic representations
- Enables context-aware file discovery
- Provides concept clustering across the codebase

## Core Capabilities

### 1. Comprehensive Code Mapping
- Complete inventory of all code, documentation, and configuration files
- Deep hierarchical understanding of directory structures
- Full relationship tracking between interdependent components
- Metadata preservation including authorship, modification times, and strategic purpose

### 2. Strategic Alignment Tracking
- Maps each file to business objectives and product offerings
- Identifies strategic drift through evolutionary analysis
- Highlights implementation gaps between architecture and implementation
- Provides strategic relevance scoring for context loading prioritization

### 3. Agent Integration Tracking
- Records which agents interact with which files
- Maps Claude prompt patterns across the codebase
- Identifies implementation patterns for agent behaviors
- Tracks agent feedback and implementation history

### 4. Infrastructure Connection Mapping
- Links components to their deployment environments (Vercel, Linode, etc.)
- Maps persistence strategies across storage systems
- Identifies network paths and API dependencies
- Documents service relationships and data flows

### 5. Evolution Tracking
- Captures version history and implementation patterns
- Identifies abandoned approaches and successful patterns
- Documents architectural decisions and their rationale
- Preserves context around strategic pivots

## Implementation Features

### 1. Multi-dimensional File Classification
Files are classified along multiple dimensions:

- **Project Association**: SecondBrain, TubeToTask, NymirAI, ClientManager, CoachTinaMarieAI
- **Strategic Relevance**: Agent Logic, Context System, Embedding Config, UI Component, etc.
- **Life Cycle Stage**: Active, In Progress, Abandoned, Duplicated, Planned
- **Technical Category**: Code, Documentation, Configuration, Data, Test
- **Business Alignment**: Revenue-generating, Infrastructure, Knowledge Management, Customer Facing
- **Implementation Quality**: Production Ready, Needs Refactoring, Technical Debt, Optimized

### 2. Relationship Mapping System
The catalog maintains comprehensive relationships:

- **Imports/Requires**: Direct code dependencies
- **Conceptual Links**: Files implementing the same concepts
- **Sequential Flow**: Processing or execution chain relationships
- **Evolutionary Links**: Version progressions and refactors
- **Compilation Dependencies**: Build and deployment relationships
- **Agent Interactions**: Which agents work with which files

### 3. Contextual Loading Prioritization
The catalog provides intelligent context loading priorities:

- **Session-based Prioritization**: Focuses on currently relevant subsystems
- **Task-based Relevance**: Highlights files needed for current task
- **Proximity Loading**: Includes closely related components
- **Business Impact Weighting**: Prioritizes revenue-critical code
- **Implementation Status Awareness**: Flags incomplete components

### 4. Integration with Notion
The Notion integration provides:

- **Strategic Dashboard**: Overview of system health and alignment
- **Project Workspaces**: Dedicated views for each major project
- **Dependency Visualizations**: Relationship maps with filtering
- **Status Tracking**: Implementation progress and technical debt
- **Work Queues**: Prioritized list of needed improvements
- **Agent Assignments**: Tracking of which agent is responsible for what

### 5. CLI Integration
Direct CLI integration enables:

```bash
# Load prioritized context for the current task
.cl/context load --task=<task_id> --depth=<1-5>

# Show file relationships
.cl/context map <file_path>

# Get strategic overview
.cl/context overview --project=<project>

# Report on duplicated or abandoned code
.cl/context audit --type=<duplicates|abandoned|gaps>

# Create visualization for a subsystem
.cl/context visualize --system=<system> --output=<notion|png>
```

## Visualization System

The Context Catalog includes a rich visualization system:

1. **Component Graphs**: Network diagrams showing file relationships
2. **Heat Maps**: Highlighting high-touch or high-importance areas
3. **Evolutionary Trees**: Showing how code has changed over time
4. **Strategic Alignment Matrices**: Mapping technical components to business objectives
5. **Dependency Chains**: Tracing the full dependency path of components

## System Maintenance

The catalog is maintained through:

1. **Continuous Scanning**: Regular system-wide scans
2. **Change Detection**: Identifying and cataloging changes
3. **Agent Updates**: Agents report their interactions with files
4. **Manual Curation**: Strategic annotations and relationship tuning
5. **Integration Feedback**: Learning from deployment and execution data

## Extended Implementation Features

### 1. Context Loading Optimization

The Context Catalog system is designed to maximize context efficiency:

```python
def optimize_context_loading(task_id, session_id=None, max_tokens=100000):
    # Get task-specific requirements
    task_requirements = get_task_requirements(task_id)
    
    # Calculate strategic priorities based on task
    priorities = calculate_strategic_priorities(task_requirements)
    
    # Get session history if available
    session_context = get_session_context(session_id) if session_id else []
    
    # Query catalog for most relevant files
    relevant_files = query_catalog(
        priorities=priorities,
        session_context=session_context,
        max_files=50
    )
    
    # Load file metadata from PostgreSQL
    file_metadata = load_file_metadata(relevant_files)
    
    # Load file contents with relationship context from Pinecone
    file_contents = load_file_contents_with_context(relevant_files)
    
    # Calculate token usage and optimize for max_tokens
    optimized_context = optimize_token_usage(
        file_contents, 
        file_metadata,
        max_tokens,
        priorities
    )
    
    # Never truncate key conceptual blocks
    preserve_conceptual_integrity(optimized_context)
    
    return optimized_context
```

### 2. Strategic Drift Detection

Automatically identify when implementation has drifted from strategic plans:

```python
def detect_strategic_drift():
    # Load strategic plans from documentation
    strategic_plans = load_strategic_plans()
    
    # Load current implementation state from catalog
    current_state = load_implementation_state()
    
    # Extract key architectural components from plans
    planned_architecture = extract_architecture(strategic_plans)
    
    # Extract current architecture from implementation
    implemented_architecture = extract_architecture(current_state)
    
    # Compare planned vs implemented
    differences = compare_architectures(
        planned_architecture, 
        implemented_architecture
    )
    
    # Classify differences
    drift_report = classify_differences(differences)
    
    # Generate recommendations
    recommendations = generate_recommendations(drift_report)
    
    # Update Notion with findings
    update_notion_drift_report(drift_report, recommendations)
    
    return drift_report, recommendations
```

## Practical Implementation

The implementation consists of:

1. **Database Schema**: PostgreSQL tables for catalog structure
2. **Scanning System**: Comprehensive file scanner with deep analysis
3. **Analysis Engine**: Strategic and technical analysis of codebase
4. **Visualization Generator**: Creates relationship diagrams
5. **CLI Integration**: Context loading and catalog query tools
6. **Notion Interface**: Dashboards and workspaces
7. **Agent API**: Context and relationship information for agents

## Integration with Agent Workflow

The Context Catalog is integrated into the agent workflow:

1. **Planner Agent**: Uses catalog for understanding system structure before planning
2. **Executor Agent**: Loads contextually relevant files for implementation
3. **Reviewer Agent**: Evaluates implementation against strategic catalog information
4. **Refactor Agent**: Identifies optimization opportunities from catalog analysis
5. **Build Agent**: Accesses dependency information for compilation
6. **Orchestrator Agent**: Uses catalog to assign tasks to appropriate agents

## Verification and Quality Assurance

The Context Catalog system implements rigorous quality assurance:

1. **Coverage Verification**: Ensures all files are cataloged
2. **Relationship Validation**: Verifies relationship accuracy
3. **Strategic Alignment Auditing**: Confirms correct alignment to business objectives
4. **Temporal Consistency**: Verifies historical accuracy of relationships
5. **Integration Testing**: Confirms behavior with agents and CLI

## Conclusion

The Context Catalog System forms a critical foundation for maintaining coherence and strategic alignment across the SecondBrain ecosystem. By providing comprehensive mapping, relationship tracking, and context prioritization, it ensures that the complex, interwoven nature of the system is preserved and leveraged. This directly supports the Prime Directive's prohibition against simplification or truncation of knowledge.

This implementation has been reviewed by the Reviewer Agent and aligns with the overall context persistence architecture of SecondBrain.