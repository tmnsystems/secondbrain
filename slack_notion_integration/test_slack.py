"""
Simple test script for the Slack connection.
"""

import os
import logging
from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv("/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env")

# Initialize the Slack app
app = App(token=os.environ.get("SLACK_BOT_TOKEN"))

@app.event("app_mention")
def handle_app_mention(body, say, client):
    """Handle app mention events."""
    event = body["event"]
    user = event["user"]
    text = event["text"]
    
    logger.info(f"Received mention from {user}: {text}")
    say(f"Hello <@{user}>! I received your message: {text}")

@app.event("message")
def handle_message(body, say, client):
    """Handle message events."""
    event = body.get("event", {})
    
    # Skip bot messages
    if event.get("bot_id"):
        return
    
    user = event.get("user")
    text = event.get("text", "")
    channel = event.get("channel")
    
    logger.info(f"Received message in {channel} from {user}: {text}")
    
    # Only respond to direct messages or messages that mention the bot
    if channel.startswith("D") or "test" in text.lower():
        say(f"Hello <@{user}>! I received your message in a direct channel or with 'test' keyword.")

@app.event("reaction_added")
def handle_reaction(body, say, client):
    """Handle reaction added events."""
    event = body["event"]
    reaction = event["reaction"]
    user = event["user"]
    item = event["item"]
    
    logger.info(f"Received reaction :{reaction}: from {user}")
    
    # Get the channel ID from the item
    channel_id = item.get("channel")
    if channel_id:
        say(f"Thanks for the :{reaction}: reaction, <@{user}>!", channel=channel_id)

if __name__ == "__main__":
    # Get the app-level token
    app_token = os.environ.get("SLACK_APP_TOKEN")
    
    if not app_token:
        logger.error("SLACK_APP_TOKEN is not set in the environment variables!")
        exit(1)
    
    if not app_token.startswith("xapp-"):
        logger.warning("SLACK_APP_TOKEN doesn't seem to be valid (should start with 'xapp-')")
    
    bot_token = os.environ.get("SLACK_BOT_TOKEN")
    if not bot_token:
        logger.error("SLACK_BOT_TOKEN is not set in the environment variables!")
        exit(1)
    
    if not bot_token.startswith("xoxb-"):
        logger.warning("SLACK_BOT_TOKEN doesn't seem to be valid (should start with 'xoxb-')")
    
    logger.info("Starting Slack app in Socket Mode...")
    logger.info(f"App Token: {app_token[:10]}...")
    logger.info(f"Bot Token: {bot_token[:10]}...")
    
    # Start the app in Socket Mode
    handler = SocketModeHandler(app, app_token)
    handler.start()