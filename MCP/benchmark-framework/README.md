# SecondBrain Agent Benchmarking Framework

This framework provides tools to benchmark and compare different AI coding agents:
- Google's Jules (GitHub-integrated autonomous coding agent)
- Codex (via existing relay mechanisms)
- Claude (inline code generation)

## Setup Instructions

1. Connect this repository to Jules by:
   - Installing the Jules GitHub App on your repository
   - Setting up appropriate permissions

2. Configure benchmark metrics collection:
   - Time to completion
   - Code quality metrics
   - Test pass rates
   - Safety assessments

3. Run the benchmarking suite:
   ```
   python benchmark.py --task legacy_refactor
   ```

4. View results in the generated report:
   ```
   cat benchmark_results.md
   ```

## Benchmark Tasks

Each task contains:
- A clear objective
- Input files
- Expected output behavior
- Success criteria
- Test cases

## Available Tasks

### 1. Legacy API Refactor
Replaces deprecated `requests` implementation with modern `httpx` async client.

### 2. Multi-File Dependency Update
Updates imports across multiple files to use new module structure.

### 3. Security Enhancement
Adds proper input validation and error handling to API endpoints.

## Agent Configuration

Edit `agent_config.json` to customize settings for each agent.