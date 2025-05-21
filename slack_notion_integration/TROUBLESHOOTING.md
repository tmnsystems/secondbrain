# SecondBrain Integration Troubleshooting Guide

## Testing the Integration Components

Before running the full integration, it's recommended to test each component separately to identify any issues:

### Test Notion Integration

Run the Notion test script:
```bash
python3 slack_notion_integration/test_notion.py
```

This will:
- Verify your Notion API key
- List users in your workspace
- Search for SecondBrain Project pages
- List available databases
- Create and archive a test page

### Test Slack Integration

Run the Slack test script:
```bash
python3 slack_notion_integration/test_slack.py
```

This will:
- Verify your Slack API tokens
- Connect to your Slack workspace using Socket Mode
- Listen for app mentions, messages, and reactions
- Respond to messages that mention the bot or contain "test"

After starting this script, go to your Slack workspace and tag the bot or send a message containing "test" to a channel the bot is in.

## Common Issues and Solutions

### Notion Integration Issues

#### 1. "No pages found. Please share at least one page with this integration."
- **Solution**: Go to your Notion workspace, open a page, click "..." in the top right, and select "Add connections" to share the page with your integration.

#### 2. "Error creating databases"
- **Solution**: Make sure your integration has "Insert Content" capabilities in the page settings.

#### 3. "Object Not Found"
- **Solution**: Verify the page or database ID you're trying to access exists and is shared with your integration.

### Slack Integration Issues

#### 1. "No response from bot in Slack"
- **Solution**: 
  - Make sure you've enabled Socket Mode
  - Verify your app has been installed to your workspace
  - Check that your bot has been invited to the channel
  - Ensure the bot has the correct event subscriptions (app_mention, message.channels, etc.)
  - Verify tokens start with the correct prefixes (xapp- for SLACK_APP_TOKEN, xoxb- for SLACK_BOT_TOKEN)

#### 2. "Invalid token format"
- **Solution**: Re-copy the tokens from the Slack API dashboard and update them in your environment variables.

#### 3. "Cannot connect to Slack"
- **Solution**: Check your internet connection and verify that Slack's services are up.

### Environment Variable Issues

1. Create or update your environment variables file at `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env`:
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

2. Verify the format of your tokens:
   - SLACK_APP_TOKEN should start with `xapp-`
   - SLACK_BOT_TOKEN should start with `xoxb-`
   - NOTION_API_KEY should start with `secret_` or `ntn_`

## Running in Debug Mode

For more verbose logging, set the log level to DEBUG in both test scripts:

```python
logging.basicConfig(level=logging.DEBUG)
```

## Starting From Scratch

If you're experiencing persistent issues, try these steps:

1. Create new integrations in both Slack and Notion
2. Update your environment variables with the new tokens
3. Run the setup process again:
   ```bash
   python3 -m slack_notion_integration.src.main --setup-notion
   ```
4. Test the components individually:
   ```bash
   python3 slack_notion_integration/test_notion.py
   python3 slack_notion_integration/test_slack.py
   ```
5. Start the full integration:
   ```bash
   python3 -m slack_notion_integration.src.main --start-agents
   ```

## Getting Help

If you're still experiencing issues, check:
- Slack API documentation: https://api.slack.com/docs
- Notion API documentation: https://developers.notion.com/docs
- LangGraph documentation: https://langchain-ai.github.io/langgraph/