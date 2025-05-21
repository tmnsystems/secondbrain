# SecondBrain Shortcuts

## Quick Commands

| Command | Description |
|---------|-------------|
| `./init-session.sh` | Initialize a new Claude session (REQUIRED at start) |
| `./setup-shortcuts.sh` | Set up shell aliases (run once) |

After running `setup-shortcuts.sh`, you can use these aliases:

| Alias | Description |
|-------|-------------|
| `init-session` | Initialize a new Claude session |
| `catalog-files` | Catalog all files in SecondBrain |
| `analyze-catalog` | Analyze the catalog results |

## Setup Instructions

1. One-time setup:
   ```bash
   cd /Volumes/Envoy/SecondBrain
   ./setup-shortcuts.sh
   source ~/.zshrc  # or ~/.bashrc depending on your shell
   ```

2. At the beginning of every Claude session:
   ```bash
   init-session
   ```

## Why This Is Important

The initialization script:
1. Enforces the Reviewer Protocol
2. Ensures context persistence between sessions
3. Prevents unauthorized changes
4. Documents session starts in Notion

**ALWAYS run `init-session` at the beginning of every Claude session!**