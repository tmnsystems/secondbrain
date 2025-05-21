# Blueprint 02: Sourcegraph Code Intelligence Cluster

## Overview
This blueprint establishes a comprehensive code intelligence fabric using Sourcegraph to provide semantic code navigation, search, and analysis capabilities for the SecondBrain codebase.

## Implementation Details

### Cluster Architecture
The Sourcegraph cluster consists of the following components:

| Node | Resources | Purpose |
|------|-----------|---------|
| Frontend | 2 vCPU, 4 GB RAM | UI & GraphQL API entry point |
| Precise-code-intel | 4 vCPU, 8 GB RAM | LSIF uploads for TS/Go/Python/JS |
| Searcher | 4 vCPU, 8 GB RAM | Regexp & structural search |
| Zoekt index | 4 vCPU, 8 GB NVMe | Lightning-fast trigram index |
| Database | PostgreSQL 15, 20 GB | Auth, settings, metadata |

### Deployment Options
- **Recommended**: Docker Compose for development/small deployments
- **Production**: Kubernetes for large-scale deployments
- **Command**: `sourcegraph deploy [docker-compose|k8s]`

### Language Support Configuration
```yaml
# sourcegraph.config.yaml
langServers:
  typescript:
    enabled: true
  python:
    enabled: true
  go:
    enabled: true
  javascript:
    enabled: true

codeIntel:
  uploads:
    enabled: true
  indexing:
    enabled: true
  autoIndexing:
    enabled: true
```

### Indexing Strategy
- **Initial Indexing**: Full repository index on deployment
- **Incremental Updates**: Post-commit hooks trigger focused reindexing
- **Schedule**: Weekly full reindex to eliminate drift
- **Configuration**:
  ```bash
  src code-intel upload -repo=secondbrain -commit=$(git rev-parse HEAD) -file=lsif.dump
  ```

### Integration Points
- **Git Hooks**: Post-commit hooks to trigger indexing
- **Web Interface**: Custom integration at port 7080
- **API Access**: GraphQL API for programmatic queries
- **Agent Access**: REST endpoints for LLM agent integration

## Benefits
- **Semantic Search**: Go beyond text search with structural queries
- **Code Navigation**: Jump to definitions and references
- **Batch Analysis**: Find patterns across the entire codebase
- **Agent Capabilities**: Empower LLMs with deep code understanding

## Next Steps
1. Provision cluster resources (16 vCPU, 24 GB RAM total)
2. Deploy Sourcegraph using Docker Compose or Kubernetes
3. Configure language servers and indexing
4. Set up initial repository indexing
5. Integrate with git workflow

<!-- BP-02_SOURCEGRAPH_CLUSTER v1.0 SHA:cd34ghi5 -->