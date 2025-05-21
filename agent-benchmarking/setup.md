# Agent Benchmarking Setup Guide

This guide provides step-by-step instructions for setting up the agent benchmarking framework.

## Prerequisites

- Python 3.8+
- Git
- GitHub account with repository access
- Notion API access (optional but recommended)
- OpenAI API key (for Codex)
- Anthropic API key (for Claude)

## Installation Steps

### 1. Clone the Repository

If you haven't already, clone the SecondBrain repository and set up the MCP directory:

```bash
git clone https://github.com/your-username/SecondBrain.git
cd SecondBrain
mkdir -p MCP/agent-benchmarking
```

### 2. Configure GitHub for Jules

Jules operates through GitHub integration. To set it up:

1. Create or use an existing GitHub repository for testing
2. Install the Jules GitHub App (when available in public beta)
3. Configure appropriate permissions for the repo

### 3. Environment Setup

Create a `.env` file in the agent-benchmarking directory:

```bash
touch agent-benchmarking/.env
```

Add the following environment variables:

```
# API Keys
NOTION_API_KEY=your_notion_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database IDs
NOTION_BENCHMARK_DB_ID=your_notion_database_id

# GitHub Configuration
GITHUB_TOKEN=your_github_token
GITHUB_REPO=username/repository
```

### 4. Install Required Packages

Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install required packages:

```bash
pip install httpx asyncio pytest pygithub pytest-asyncio notion-client
```

### 5. Configure Notion (Optional)

If you're using Notion for results tracking:

1. Create a new database in Notion for benchmark results
2. Get the database ID from the URL
3. Add it to your `.env` file as `NOTION_BENCHMARK_DB_ID`

### 6. Configure Agent Settings

Edit `config.json` to customize your benchmark:

- Enable/disable specific agents
- Add custom tasks
- Configure GitHub settings for Jules
- Adjust logging and report settings

## Running Your First Benchmark

Once everything is set up, run your first benchmark:

```bash
python agent_benchmark.py --task legacy_refactor
```

This will:
1. Run the legacy refactor task on all enabled agents
2. Measure performance metrics
3. Generate a detailed report
4. Log results to Notion (if configured)

## Troubleshooting

### Jules Integration Issues

- Ensure the Jules GitHub App is properly installed
- Check GitHub permissions for the repository
- Verify the `assign-to-jules` label exists

### Codex Relay Problems

- Ensure OpenAI API credentials are valid
- Check the relay configuration in SecondBrain
- Verify your API usage limits

### Claude API Errors

- Confirm your Anthropic API key is correct
- Check Claude API availability
- Verify rate limits and usage quotas

### Notion Integration

- Ensure the Notion API key has the correct permissions
- Verify the database ID is correct
- Check that the database schema matches expectations

## Custom Task Creation

To create a custom benchmark task:

1. Create a new directory under `tasks/`
2. Add a `task_spec.json` file with task details
3. Include necessary source files and tests
4. Update `config.json` to include the new task

```json
{
  "title": "Your Custom Task",
  "file": "tasks/your_custom_task/source_file.py",
  "description": "Description of what needs to be done",
  "criteria": [
    "Success criterion 1",
    "Success criterion 2"
  ]
}
```

## Next Steps

After running your initial benchmarks:

1. Analyze the results to understand agent strengths and weaknesses
2. Tune the smart router logic based on observed performance
3. Create additional benchmark tasks to test specific capabilities
4. Integrate with your CI/CD pipeline for automated benchmarking