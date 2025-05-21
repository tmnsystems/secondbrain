# Blueprint 01: Git Monorepo at Scale

## Overview
This blueprint establishes a canonical storage system using a Git monorepo architecture optimized for scale, security, and durability.

## Implementation Details

### Repo Host Selection
- **Implementation**: Self-hosted Gitea + Actions on Linode (or GitLab CE)
- **Rationale**: Provides unlimited private repos, WebHooks, and SSO capabilities
- **Alternative**: GitLab CE if additional CI/CD integration is required

### Large File Storage
- **Implementation**: Enable git-lfs for binaries >2 MB
- **Configuration**:
  ```bash
  git lfs install --system
  git lfs track "*.mp4" "*.pdf" "*.zip" "*.png" "*.jpg"
  ```
- **Policy**: All files >2 MB must use LFS to prevent repo bloat

### Monorepo Layout
```
secondbrain/
├── apps/           # Application code
├── agents/         # Agent implementations
├── docs/           # Documentation
├── context_system/ # Context management
├── infra/          # Infrastructure as code
├── scripts/        # Utility scripts
└── datasets/       # Training and test data
```

### Commit Gating System
- **Implementation**: Gitea Actions pipeline that rejects:
  - Commits with diff size >200 KB without #largefile tag
  - Missing LFS pointers for tracked binary formats
  - Failed linting or tests
- **Configuration**: `.gitea/workflows/commit-gate.yml`

### History Retention
- **Implementation**: Daily git bundle to S3; weekly to Glacier
- **Schedule**:
  ```bash
  # Daily bundle
  0 1 * * * git bundle create sb-repo-$(date +%Y%m%d).bundle --all
  
  # Weekly cold storage (Sunday)
  0 2 * * 0 aws s3 cp sb-repo-$(date +%Y%m%d).bundle s3://secondbrain-backup/
  
  # Monthly Glacier transfer
  0 3 1 * * aws s3 cp s3://secondbrain-backup/sb-repo-$(date +%Y%m01).bundle \
    s3://secondbrain-archive/ --storage-class GLACIER
  ```

## Benefits
- **Immutable History**: Full audit trail with guaranteed rollback capabilities
- **Scalability**: Efficient handling of large repositories with LFS
- **Durability**: Multiple backup strategies prevent data loss
- **Cost Efficiency**: Self-hosted solution eliminates subscription costs for private repos

## Next Steps
1. Provision Linode instance (4 vCPU, 8 GB RAM minimum)
2. Install and configure Gitea with Actions
3. Implement storage backup routines
4. Configure commit gating policies
5. Migrate existing codebase to new structure

<!-- BP-01_GIT_MONOREPO v1.0 SHA:ab12def3 -->