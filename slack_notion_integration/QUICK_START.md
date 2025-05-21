# SecondBrain Slack-Notion Integration - Quick Start Guide

This guide will help you quickly set up and run the SecondBrain Slack-Notion integration.

## Prerequisites

- Python 3.9+
- A Slack workspace with admin privileges
- A Notion account with admin privileges

## Installation

1. Clone this repository to your local machine
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Setting Up API Keys

1. Create or edit the file `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env` with the following structure:
   ```
   # Slack
   SLACK_SIGNING_SECRET=your_slack_signing_secret
   SLACK_APP_TOKEN=your_slack_app_token
   SLACK_BOT_TOKEN=your_slack_bot_token
   
   # Notion
   NOTION_API_KEY=your_notion_api_key
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Anthropic
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

## Setting Up Notion

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Give it a name like "SecondBrain Integration"
3. Copy the integration token and add it to your `.env` file
4. Create a new page in your Notion workspace called "SecondBrain Project"
5. Share the page with your integration by clicking "..." > "Add connections" > select your integration
6. Run the setup command to create the necessary databases:
   ```bash
   python3 -m slack_notion_integration.src.main --setup-notion
   ```

## Setting Up Slack

1. Create a Slack app at https://api.slack.com/apps
2. Click "Create New App" > "From scratch"
3. Give it a name like "SecondBrain Bot" and select your workspace
4. Under "OAuth & Permissions" add the following Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `files:read`
   - `files:write`
   - `reactions:read`
   - `reactions:write`
   - `channels:history`
   - `channels:read`
5. Under "Socket Mode", enable Socket Mode and create an app-level token with the `connections:write` scope
6. Install the app to your workspace
7. Copy the Bot Token from "OAuth & Permissions" and the App-Level Token from "Socket Mode" to your `.env` file

## Running the Integration

### Start All Agents

To start all agents:
```bash
python3 -m slack_notion_integration.src.main --start-agents
```

### Start a Specific Agent

To start a specific agent:
```bash
python3 -m slack_notion_integration.src.main --start-agents --agent planner
```

Available agents:
- `planner` - Planning and task breakdown using OpenAI o3
- `executor` - Task execution using GPT-4.1 Mini
- `reviewer` - Code and implementation review using Claude
- `notion` - Documentation and knowledge management

## Using the Integration

1. Invite the bot to a channel by typing `/invite @SecondBrainBot`
2. Tag the bot with a task, for example: 
   ```
   @SecondBrainBot I need a system for tracking client communications and follow-ups
   ```
3. The bot will analyze your request, create a plan, and respond in a thread
4. You can approve or reject the plan by adding 👍 or 👎 reactions
5. The bot will execute approved plans and take relevant agents through the workflow
6. All tasks and logs will be recorded in your Notion database

## Workflow

The integration follows this general workflow:

1. **Planning**: The Planner agent analyzes your request and creates a detailed plan
2. **Execution**: The Executor agent implements the plan's tasks
3. **Review**: The Reviewer agent checks the implementation for quality and correctness
4. **Documentation**: The Notion agent creates comprehensive documentation in Notion

## Checking Results in Notion

1. Go to your "SecondBrain Project" page in Notion
2. You'll see three databases:
   - **Tasks**: Lists all tasks and their status
   - **Agent Logs**: Detailed logs of agent activities
   - **Projects**: High-level project tracking

## Troubleshooting

If you encounter issues:

1. Check the logs in the `logs` directory
2. Verify all environment variables are set correctly
3. Make sure all the required API keys are valid
4. Verify the Slack app is properly installed to your workspace
5. Ensure your Notion integration has access to the necessary pages

For detailed status and next steps, refer to `STATUS_REPORT.md`.