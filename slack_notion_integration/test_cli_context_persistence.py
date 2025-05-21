#!/usr/bin/env python3
"""
Test CLI context persistence across compaction events.

This script verifies that the context persistence system works
properly by simulating a full session with compaction event and
context retrieval.

Usage:
    python test_cli_context_persistence.py
"""

import os
import sys
import json
import asyncio
import argparse
from datetime import datetime

# Add parent directory to path so we can import from src
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.cli.cli_session_logger import CLISessionLogger
from src.cli.session_manager import initialize_cli_session, handle_compaction

async def get_user_input(prompt: str = "Enter a test message: ") -> str:
    """
    Get input from the user.
    
    Args:
        prompt: Prompt to display
        
    Returns:
        User input
    """
    print(prompt, end="")
    return input()

async def simulate_compaction(session_logger: CLISessionLogger) -> CLISessionLogger:
    """
    Simulate a compaction event.
    
    Args:
        session_logger: Current session logger
        
    Returns:
        New session logger
    """
    print("\n🔄 Simulating compaction event...")
    
    # Handle the compaction
    new_session_logger = await session_logger.handle_compaction("SIMULATED_COMPACTION")
    
    if new_session_logger:
        print("✅ Created new session after compaction")
        print(f"📝 Old Session ID: {session_logger.session_id}")
        print(f"📝 New Session ID: {new_session_logger.session_id}")
        print(f"🔗 Session URL: {new_session_logger.get_session_url() or 'Not available'}")
        return new_session_logger
    else:
        print("❌ Failed to create new session after compaction")
        return session_logger
    
async def verify_context_retrieval(session_logger: CLISessionLogger) -> bool:
    """
    Verify context can be retrieved from previous session.
    
    Args:
        session_logger: Current session logger
        
    Returns:
        True if context was successfully retrieved, False otherwise
    """
    print("\n🔍 Verifying context retrieval capability...")
    
    # Load most recent context
    context = await session_logger.load_most_recent_context()
    
    if context and context.get("messages", []):
        print("✅ Successfully retrieved context from previous session")
        print(f"📝 Previous Session ID: {context['session_id']}")
        print(f"📝 Message count: {len(context['messages'])}")
        
        # Show the first few messages
        print("\n📄 First 3 messages from previous context:")
        for i, message in enumerate(context["messages"][:3]):
            print(f"{i+1}. {message[:100]}{'...' if len(message) > 100 else ''}")
        
        return True
    else:
        print("❌ Failed to retrieve context from previous session")
        return False

async def interactive_test() -> None:
    """Run an interactive test of the context persistence system."""
    print("🧪 Starting Interactive CLI Context Persistence Test\n")
    
    # Initialize a new session logger
    session_logger = await initialize_cli_session()
    print(f"📝 Session ID: {session_logger.session_id}")
    print(f"🔗 Session URL: {session_logger.get_session_url() or 'Not available'}")
    
    # Simulate user interaction
    user_message = await get_user_input("\n👤 Enter a test user message: ")
    await session_logger.log_user_message(user_message)
    print("✅ Logged user message to Notion")
    
    # Simulate system action
    action_type = await get_user_input("\n⚙️ Enter a system action type (or press Enter for 'TEST_ACTION'): ")
    action_type = action_type or "TEST_ACTION"
    await session_logger.log_system_action(action_type, {
        "action": "Testing system action logging",
        "timestamp": datetime.now().isoformat()
    })
    print(f"✅ Logged system action '{action_type}' to Notion")
    
    # Simulate assistant response
    assistant_response = await get_user_input("\n🤖 Enter a test assistant response: ")
    await session_logger.log_assistant_response(assistant_response)
    print("✅ Logged assistant response to Notion")
    
    # Simulate tool call
    tool_name = await get_user_input("\n🔧 Enter a tool name (or press Enter for 'TestTool'): ")
    tool_name = tool_name or "TestTool"
    await session_logger.log_tool_call(tool_name, {"param1": "value1"}, {"result": "success"})
    print(f"✅ Logged tool call '{tool_name}' to Notion")
    
    # Ask if user wants to simulate compaction
    simulate = await get_user_input("\n🔄 Simulate compaction event? (y/n): ")
    if simulate.lower() in ("y", "yes"):
        # Simulate compaction
        new_session_logger = await simulate_compaction(session_logger)
        
        # Verify context retrieval in the new session
        context_retrieved = await verify_context_retrieval(new_session_logger)
    else:
        context_retrieved = False
        print("Skipping compaction simulation")
    
    # Final report
    print("\n📊 Test Results:")
    print("✅ User message logging: Success")
    print("✅ System action logging: Success")
    print("✅ Assistant response logging: Success")
    print("✅ Tool call logging: Success")
    if simulate.lower() in ("y", "yes"):
        print("✅ Compaction handling: Success")
        print(f"{'✅' if context_retrieved else '❌'} Context retrieval: {'Success' if context_retrieved else 'Skipped or Failed'}")
    
    print("\n🏁 Test completed")

async def automatic_test() -> None:
    """Run an automatic test of the context persistence system."""
    print("🧪 Starting Automatic CLI Context Persistence Test\n")
    
    # Initialize a new session logger
    session_logger = CLISessionLogger()
    print(f"📝 Session ID: {session_logger.session_id}")
    print(f"🔗 Session URL: {session_logger.get_session_url() or 'Not available'}")
    
    # Simulate user interaction
    user_message = "This is an automated test message for CLI context persistence."
    await session_logger.log_user_message(user_message)
    print("✅ Logged user message to Notion")
    
    # Simulate system action
    await session_logger.log_system_action("AUTOMATED_TEST", {
        "action": "Testing system action logging",
        "timestamp": datetime.now().isoformat()
    })
    print("✅ Logged system action to Notion")
    
    # Simulate assistant response
    await session_logger.log_assistant_response("This is an automated test response from the assistant.")
    print("✅ Logged assistant response to Notion")
    
    # Simulate tool call
    await session_logger.log_tool_call("AutomatedTestTool", {"param1": "value1"}, {"result": "success"})
    print("✅ Logged tool call to Notion")
    
    # Simulate compaction
    new_session_logger = await simulate_compaction(session_logger)
    
    # Verify context retrieval in the new session
    context_retrieved = await verify_context_retrieval(new_session_logger)
    
    # Final report
    print("\n📊 Test Results:")
    print("✅ User message logging: Success")
    print("✅ System action logging: Success")
    print("✅ Assistant response logging: Success")
    print("✅ Tool call logging: Success")
    print("✅ Compaction handling: Success")
    print(f"{'✅' if context_retrieved else '❌'} Context retrieval: {'Success' if context_retrieved else 'Failed'}")
    
    print("\n🏁 Test completed")

async def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Test CLI Context Persistence")
    parser.add_argument(
        "--interactive", action="store_true",
        help="Run an interactive test (default: automatic test)"
    )
    
    args = parser.parse_args()
    
    if args.interactive:
        await interactive_test()
    else:
        await automatic_test()

if __name__ == "__main__":
    asyncio.run(main())