# Agent Benchmarking Framework

This framework allows benchmarking of Jules, Codex, and Claude as coding agents within the SecondBrain ecosystem.

## Overview

This benchmark suite compares:
- **Jules**: Google's asynchronous GitHub-integrated coding agent 
- **Codex**: Existing relay mechanism in SecondBrain
- **Claude**: Inline code generation

## Metrics Measured

| Metric | Description |
|--------|-------------|
| Speed | Time to complete tasks |
| Output quality | Code quality assessment |  
| File safety | Prevention of unintended file operations |
| Test pass rate | Percentage of tests passing |
| Error handling | Robustness in handling edge cases |

## Setup Instructions

1. Configure GitHub repository:
   - Create a new repository or use existing SecondBrain repo
   - Enable GitHub Apps needed for Jules integration
   - Set up appropriate permissions

2. Configure local environment:
   - Ensure Codex relay configuration is set up
   - Configure Claude API access
   - Set up test framework dependencies

3. Run the benchmark:
   ```
   python agent_benchmark.py --task legacy_refactor
   ```

## Test Tasks

### Legacy Refactor Task

This task involves replacing deprecated `requests` logic with `httpx` async client in an API handler:

```json
{
  "title": "Refactor deprecated API call",
  "file": "tasks/legacy_refactor/deprecated_handler.py",
  "target_file": "tasks/legacy_refactor/refactored_handler.py",
  "description": "Replace legacy `requests` logic with `httpx` async client",
  "criteria": [
    "Compiles cleanly with no syntax errors",
    "Passes all existing tests",
    "Uses httpx async client instead of requests",
    "Implements proper async/await patterns",
    "Maintains all existing functionality",
    "Handles errors and retries correctly",
    "Preserves API signatures where possible",
    "Includes appropriate type hints"
  ]
}
```

## Smart Agent Router

The framework includes a smart agent router that selects the best agent for each task type:

```python
def select_best_agent(task_type):
    if task_type in ["legacy", "deep refactor", "multi-file"]:
        return "Jules"
    elif task_type == "sensitive" or "sandbox":
        return "Claude"
    else:
        return "Codex"
```

## Integration with SecondBrain

This framework is designed to work seamlessly with the SecondBrain ecosystem:
- Uses the existing Notion integration for task tracking
- Works with the MCP architecture for reliable API access
- Follows the agent workflow defined in the SecondBrain master plan

## Getting Started

1. Clone the repository (if not already done)
2. Configure GitHub integration for Jules
3. Set up the necessary API keys and tokens
4. Run your first benchmark

See the [Setup Guide](setup.md) for detailed instructions.