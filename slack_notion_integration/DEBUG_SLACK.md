# Debugging Slack Integration

To fully set up the Slack integration, you need to complete these steps:

## 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" > "From scratch"
3. Give it a name (e.g., "SecondBrain Bot") and select your workspace
4. Click "Create App"

## 2. Configure App Features

### Basic Information
- Under "Display Information", add a description and icon for your app

### Socket Mode
- Enable Socket Mode
- Create an App-Level Token with the `connections:write` scope
- Save the token to your `.env` file as `SLACK_APP_TOKEN`

### OAuth & Permissions
- Add the following Bot Token Scopes:
  - `app_mentions:read`
  - `chat:write`
  - `files:read`
  - `files:write`
  - `reactions:read`
  - `reactions:write`
  - `channels:history`
  - `channels:read`
- Click "Install to Workspace"
- Save the Bot User OAuth Token to your `.env` file as `SLACK_BOT_TOKEN`

### Event Subscriptions
- Enable Events
- Subscribe to bot events:
  - `app_mention`
  - `message.channels`
  - `reaction_added`

### App Home
- Enable "Allow users to send Slash commands and messages from the messages tab"

## 3. Install the App to Your Workspace
- Go to "Install App" and click "Install to Workspace"
- Authorize the app

## 4. Invite the Bot to a Channel
- In Slack, type `/invite @YourBotName` in the channel you want to add it to

## 5. Test the Connection
- Tag the bot with a message: `@YourBotName hello`
- If the bot doesn't respond, check the logs for errors

## Troubleshooting

### Check Environment Variables
Make sure these environment variables are correctly set in your `.env` file:
```
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_APP_TOKEN=xapp-1-...  (starts with xapp-)
SLACK_BOT_TOKEN=xoxb-...    (starts with xoxb-)
```

### Verify Socket Mode
Socket mode must be enabled for the bot to receive events without a public endpoint.

### Check Bot Permissions
Make sure the bot has the necessary permissions in your Slack workspace.

### Test with Simple Response
Edit the `app.py` file to add a simple response to any message for testing:

```python
@app.event("app_mention")
def handle_app_mention(body, say, client):
    say("I received your message!")
```

This will help verify if the bot is properly connected to Slack.