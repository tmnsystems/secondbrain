#!/usr/bin/env python3
"""
Claude Context Bridge - CLI Tool for Session Context Preservation

This tool addresses the critical issue of context loss between Claude CLI sessions
by implementing a robust bridge that saves, loads, and manages session contexts
using the SecondBrain three-layer persistence system.

CORE PRINCIPLE: NEVER TRUNCATE OR SIMPLIFY - All context must be fully preserved.

Features:
- Save current session with full context preservation
- Load previous sessions with seamless context bridging
- List and manage saved sessions
- Extract messages from Claude CLI logs
- Generate human-readable session notes
- Import/export sessions for sharing

Usage:
    python3 claude-context-bridge.py save [--description DESC] [--log-file PATH]
    python3 claude-context-bridge.py load SESSION_ID
    python3 claude-context-bridge.py list [--detailed]
    python3 claude-context-bridge.py analyze LOG_FILE
    python3 claude-context-bridge.py bridge FROM_ID TO_ID
    python3 claude-context-bridge.py clean [--days DAYS]
    python3 claude-context-bridge.py export SESSION_ID [--output FILE]
    python3 claude-context-bridge.py import FILE

Examples:
    # Save current session
    python3 claude-context-bridge.py save --description "Project planning session"
    
    # List all saved sessions
    python3 claude-context-bridge.py list
    
    # Load a previous session
    python3 claude-context-bridge.py load 12345678-1234-5678-1234-567812345678
"""

import os
import sys
import json
import uuid
import time
import argparse
import asyncio
import re
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union

# Import the context persistence system
try:
    from context_persistence_system import ContextSystem
except ImportError:
    print("Error: Could not import ContextSystem. Make sure context_persistence_system.py is in the same directory.")
    sys.exit(1)

# Constants
SESSION_NOTES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "CLAUDE_SESSION_NOTES.md")
DEFAULT_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "CLI_CONVERSATION_LOG.md")
SESSION_INDEX_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "state", "session_index.json")
VERSION = "1.0.0"

# Message patterns for extraction
CLAUDE_MESSAGE_PATTERNS = [
    # Standard Claude CLI format
    r'(?P<role>Human|Assistant):\s(?P<content>[\s\S]*?)(?=\n(?:Human|Assistant):|$)',
    # Message with timestamp
    r'(\[(?P<timestamp>[^\]]+)\]\s)?(?P<role>Human|Assistant):\s(?P<content>[\s\S]*?)(?=\n(?:\[\d{4}-\d{2}-\d{2}|\s*(?:Human|Assistant)):|$)',
    # Alternative format with H/A indicators
    r'(?P<role>H|A):\s(?P<content>[\s\S]*?)(?=\n(?:H|A):|$)',
]

class ClaudeContextBridge:
    """
    Main class implementing the Claude Context Bridge functionality.
    Provides methods for saving, loading, and managing session contexts.
    """
    def __init__(self):
        """Initialize the Claude Context Bridge."""
        self.context_system = ContextSystem()
        self.ensure_directories()
        
    def ensure_directories(self):
        """Ensure all necessary directories exist."""
        os.makedirs(os.path.dirname(SESSION_INDEX_FILE), exist_ok=True)
        
        # Create session index if it doesn't exist
        if not os.path.exists(SESSION_INDEX_FILE):
            with open(SESSION_INDEX_FILE, 'w') as f:
                json.dump({"sessions": []}, f)
        
        # Create session notes file if it doesn't exist
        if not os.path.exists(SESSION_NOTES_FILE):
            with open(SESSION_NOTES_FILE, 'w') as f:
                f.write("# Claude Session Notes\n\nThis file contains notes about saved Claude CLI sessions.\n\n")

    async def save_session(self, description: str = None, log_file: str = None) -> str:
        """
        Save the current session to the context system.
        
        Args:
            description: Optional description of the session
            log_file: Path to the log file containing the session
            
        Returns:
            session_id: ID of the saved session
        """
        log_file = log_file or DEFAULT_LOG_FILE
        
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        timestamp = datetime.datetime.now().isoformat()
        
        try:
            # Extract messages from the log file
            messages = self.extract_messages_from_log(log_file)
            if not messages:
                print(f"Warning: No messages extracted from {log_file}")
            
            # Analyze content for summary if no description provided
            if not description and messages:
                description = await self.generate_session_description(messages)
            
            # Store the session in the context system
            session_data = {
                "id": session_id,
                "timestamp": timestamp,
                "description": description or "Claude CLI Session",
                "messages": messages,
                "source": "claude_cli",
                "log_file": os.path.abspath(log_file)
            }
            
            # Save to context system - Using all three layers (Redis, PostgreSQL, Pinecone)
            await self.context_system.store_context(
                context_id=session_id,
                context_data=session_data,
                source_info={"type": "claude_cli_session", "file": log_file}
            )
            
            # Update session index
            self.update_session_index(session_id, description, timestamp)
            
            # Update session notes with human-readable entry
            self.update_session_notes(session_id, description, messages)
            
            print(f"Session saved successfully with ID: {session_id}")
            print(f"Description: {description or 'No description provided'}")
            print(f"Timestamp: {timestamp}")
            print(f"Message count: {len(messages)}")
            
            return session_id
            
        except Exception as e:
            print(f"Error saving session: {str(e)}")
            raise
    
    async def load_session(self, session_id: str) -> Dict[str, Any]:
        """
        Load a session from the context system and create a bridge to the current session.
        
        Args:
            session_id: ID of the session to load
            
        Returns:
            retrieved_context: The retrieved context
        """
        try:
            # Retrieve the session from the context system
            retrieved_context = await self.context_system.retrieve_context_by_id(session_id)
            if not retrieved_context:
                print(f"Error: No session found with ID {session_id}")
                return None
                
            # Generate a new session ID for the current session
            current_session_id = str(uuid.uuid4())
            
            # Create a bridge between the previous and current session
            bridge_result = await self.context_system.create_session_bridge(
                from_session_id=session_id,
                to_session_id=current_session_id
            )
            
            # Update CLI log with session information
            self.update_cli_log(retrieved_context, current_session_id)
            
            print(f"Session {session_id} loaded successfully")
            print(f"Created bridge to new session ID: {current_session_id}")
            print(f"Context: {len(retrieved_context.get('messages', []))} messages")
            print(f"Description: {retrieved_context.get('description', 'No description')}")
            
            return retrieved_context
            
        except Exception as e:
            print(f"Error loading session: {str(e)}")
            raise
    
    async def create_session_bridge(self, from_session_id: str, to_session_id: str) -> Dict[str, Any]:
        """
        Create an explicit bridge between two existing sessions.
        
        Args:
            from_session_id: Source session ID
            to_session_id: Target session ID
            
        Returns:
            bridge_result: Result of the bridge operation
        """
        try:
            # Verify both sessions exist
            from_session = await self.context_system.retrieve_context_by_id(from_session_id)
            to_session = await self.context_system.retrieve_context_by_id(to_session_id)
            
            if not from_session:
                print(f"Error: Source session {from_session_id} not found")
                return None
                
            if not to_session:
                print(f"Error: Target session {to_session_id} not found")
                return None
            
            # Create the bridge
            bridge_result = await self.context_system.create_session_bridge(
                from_session_id=from_session_id,
                to_session_id=to_session_id
            )
            
            # Update session notes
            self.add_bridge_to_notes(from_session_id, to_session_id)
            
            print(f"Bridge created successfully from {from_session_id} to {to_session_id}")
            print(f"Transferred context: {len(from_session.get('messages', []))} messages")
            
            return bridge_result
            
        except Exception as e:
            print(f"Error creating session bridge: {str(e)}")
            raise
    
    async def list_sessions(self, detailed: bool = False) -> List[Dict[str, Any]]:
        """
        List all saved sessions with optional details.
        
        Args:
            detailed: Whether to include full session details
            
        Returns:
            sessions: List of session information
        """
        try:
            # Load session index
            with open(SESSION_INDEX_FILE, 'r') as f:
                index_data = json.load(f)
                
            sessions = index_data.get("sessions", [])
            
            if not sessions:
                print("No saved sessions found")
                return []
            
            # Sort sessions by timestamp (most recent first)
            sessions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            
            print(f"Found {len(sessions)} saved sessions:")
            for i, session in enumerate(sessions):
                session_id = session.get("id", "Unknown")
                description = session.get("description", "No description")
                timestamp = session.get("timestamp", "Unknown")
                
                # Format timestamp for display
                try:
                    dt = datetime.datetime.fromisoformat(timestamp)
                    formatted_time = dt.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    formatted_time = timestamp
                
                print(f"{i+1}. [{formatted_time}] {session_id}")
                print(f"   Description: {description}")
                
                if detailed:
                    # Retrieve full session details
                    full_session = await self.context_system.retrieve_context_by_id(session_id)
                    if full_session:
                        message_count = len(full_session.get("messages", []))
                        source = full_session.get("source", "Unknown")
                        print(f"   Messages: {message_count}")
                        print(f"   Source: {source}")
                        print(f"   Log file: {full_session.get('log_file', 'Unknown')}")
                    else:
                        print("   Full session details not available")
                print()
                
            return sessions
            
        except Exception as e:
            print(f"Error listing sessions: {str(e)}")
            raise
    
    async def clean_sessions(self, days: int = 30) -> int:
        """
        Clean up old sessions.
        
        Args:
            days: Remove sessions older than this many days
            
        Returns:
            count: Number of sessions removed
        """
        try:
            # Load session index
            with open(SESSION_INDEX_FILE, 'r') as f:
                index_data = json.load(f)
                
            sessions = index_data.get("sessions", [])
            if not sessions:
                print("No sessions to clean")
                return 0
            
            # Calculate cutoff date
            cutoff = datetime.datetime.now() - datetime.timedelta(days=days)
            cutoff_str = cutoff.isoformat()
            
            # Filter sessions to keep (newer than cutoff)
            sessions_to_keep = []
            sessions_to_remove = []
            
            for session in sessions:
                timestamp = session.get("timestamp", "")
                if timestamp < cutoff_str:
                    sessions_to_remove.append(session)
                else:
                    sessions_to_keep.append(session)
            
            if not sessions_to_remove:
                print(f"No sessions older than {days} days found")
                return 0
            
            # Remove sessions from context system
            for session in sessions_to_remove:
                session_id = session.get("id")
                if session_id:
                    await self.context_system.delete_context(session_id)
            
            # Update session index
            index_data["sessions"] = sessions_to_keep
            with open(SESSION_INDEX_FILE, 'w') as f:
                json.dump(index_data, f, indent=2)
            
            # Add note about cleaning to session notes
            with open(SESSION_NOTES_FILE, 'a') as f:
                f.write(f"\n## Session Cleanup - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write(f"Removed {len(sessions_to_remove)} sessions older than {days} days.\n\n")
            
            print(f"Removed {len(sessions_to_remove)} sessions older than {days} days")
            return len(sessions_to_remove)
            
        except Exception as e:
            print(f"Error cleaning sessions: {str(e)}")
            raise
    
    async def export_session(self, session_id: str, output_file: str = None) -> str:
        """
        Export a session to a file for sharing or archiving.
        
        Args:
            session_id: ID of the session to export
            output_file: Path to save the exported session
            
        Returns:
            output_file: Path to the exported file
        """
        try:
            # Retrieve the session
            session = await self.context_system.retrieve_context_by_id(session_id)
            if not session:
                print(f"Error: Session {session_id} not found")
                return None
            
            # Generate output filename if not provided
            if not output_file:
                description = session.get("description", "session")
                # Sanitize description for filename
                safe_desc = re.sub(r'[^\w\s-]', '', description).strip().replace(' ', '_')
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = f"claude_session_{safe_desc}_{timestamp}.json"
            
            # Add export metadata
            export_data = {
                "export_version": VERSION,
                "export_timestamp": datetime.datetime.now().isoformat(),
                "session": session
            }
            
            # Write to file
            with open(output_file, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            print(f"Session {session_id} exported successfully to {output_file}")
            print(f"Description: {session.get('description', 'No description')}")
            print(f"Messages: {len(session.get('messages', []))}")
            
            return output_file
            
        except Exception as e:
            print(f"Error exporting session: {str(e)}")
            raise
    
    async def import_session(self, file_path: str) -> str:
        """
        Import a session from an exported file.
        
        Args:
            file_path: Path to the exported session file
            
        Returns:
            session_id: ID of the imported session
        """
        try:
            # Read the exported file
            with open(file_path, 'r') as f:
                export_data = json.load(f)
            
            # Validate export format
            if "session" not in export_data:
                print(f"Error: Invalid export file format in {file_path}")
                return None
            
            session = export_data["session"]
            
            # Generate a new session ID to avoid conflicts
            original_id = session.get("id", "unknown")
            new_id = str(uuid.uuid4())
            
            # Update the session data
            session["id"] = new_id
            session["imported_from"] = original_id
            session["import_timestamp"] = datetime.datetime.now().isoformat()
            session["source"] = f"imported_from_{file_path}"
            
            # Store in context system
            await self.context_system.store_context(
                context_id=new_id,
                context_data=session,
                source_info={"type": "imported_session", "file": file_path}
            )
            
            # Update session index
            self.update_session_index(
                new_id,
                f"Imported: {session.get('description', 'No description')}",
                session.get("timestamp", datetime.datetime.now().isoformat())
            )
            
            # Update session notes
            self.update_session_notes(
                new_id,
                f"Imported from {original_id}",
                session.get("messages", []),
                imported=True
            )
            
            print(f"Session imported successfully with new ID: {new_id}")
            print(f"Original ID: {original_id}")
            print(f"Description: {session.get('description', 'No description')}")
            print(f"Messages: {len(session.get('messages', []))}")
            
            return new_id
            
        except Exception as e:
            print(f"Error importing session: {str(e)}")
            raise
    
    async def analyze_log(self, log_file: str) -> Dict[str, Any]:
        """
        Analyze a Claude CLI log file to extract key topics and information.
        
        Args:
            log_file: Path to the log file to analyze
            
        Returns:
            analysis: Analysis results
        """
        try:
            # Extract messages from the log
            messages = self.extract_messages_from_log(log_file)
            if not messages:
                print(f"Warning: No messages extracted from {log_file}")
                return {"error": "No messages found"}
            
            # Generate session description
            description = await self.generate_session_description(messages)
            
            # Extract code blocks for additional context
            code_blocks = self.extract_code_blocks(messages)
            
            # Identify key topics
            topics = await self.identify_key_topics(messages)
            
            # Perform basic stats
            human_messages = sum(1 for m in messages if m.get("role", "").lower() in ["human", "h"])
            assistant_messages = sum(1 for m in messages if m.get("role", "").lower() in ["assistant", "a"])
            
            # Compile analysis
            analysis = {
                "file": log_file,
                "message_count": len(messages),
                "human_messages": human_messages,
                "assistant_messages": assistant_messages,
                "description": description,
                "topics": topics,
                "code_block_count": len(code_blocks),
                "code_languages": list(set(block.get("language", "unknown") for block in code_blocks))
            }
            
            # Display analysis
            print(f"Analysis of {log_file}:")
            print(f"Messages: {len(messages)} ({human_messages} human, {assistant_messages} assistant)")
            print(f"Description: {description}")
            print(f"Key topics: {', '.join(topics)}")
            print(f"Code blocks: {len(code_blocks)} ({', '.join(analysis['code_languages'])})")
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing log: {str(e)}")
            raise
    
    def extract_messages_from_log(self, log_file: str) -> List[Dict[str, Any]]:
        """
        Extract messages from a Claude CLI log file.
        
        Args:
            log_file: Path to the log file
            
        Returns:
            messages: List of extracted messages
        """
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Try multiple message patterns for extraction
            messages = []
            for pattern in CLAUDE_MESSAGE_PATTERNS:
                matches = list(re.finditer(pattern, content, re.MULTILINE))
                if matches:
                    messages = []
                    for match in matches:
                        role = match.group('role').lower()
                        # Normalize role naming
                        if role in ['h', 'human']:
                            role = 'human'
                        elif role in ['a', 'assistant']:
                            role = 'assistant'
                            
                        msg = {
                            "role": role,
                            "content": match.group('content').strip()
                        }
                        
                        # Add timestamp if available
                        if 'timestamp' in match.groupdict() and match.group('timestamp'):
                            msg["timestamp"] = match.group('timestamp')
                            
                        messages.append(msg)
                    break
            
            # If no messages extracted with regex, try alternate approach
            if not messages:
                # Fallback to simple splitting
                sections = re.split(r'\n(?=Human:|Assistant:)', content)
                for section in sections:
                    if section.strip():
                        if section.startswith('Human:'):
                            role = 'human'
                            content = section[6:].strip()
                        elif section.startswith('Assistant:'):
                            role = 'assistant'
                            content = section[10:].strip()
                        else:
                            continue
                            
                        messages.append({
                            "role": role,
                            "content": content
                        })
            
            # NEVER TRUNCATE OR SIMPLIFY - ensure full content preservation
            for message in messages:
                if len(message["content"]) > 0:
                    # Ensure full content is preserved
                    message["full_content"] = message["content"]
                    # Add timestamp if not present
                    if "timestamp" not in message:
                        message["timestamp"] = datetime.datetime.now().isoformat()
            
            return messages
            
        except Exception as e:
            print(f"Error extracting messages from log: {str(e)}")
            return []
            
    def extract_code_blocks(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract code blocks from messages for additional context.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            code_blocks: List of extracted code blocks with metadata
        """
        code_blocks = []
        
        # Regex for code blocks with optional language
        pattern = r'```(\w*)\n([\s\S]*?)```'
        
        for message in messages:
            content = message.get("content", "")
            matches = re.finditer(pattern, content)
            
            for match in matches:
                language = match.group(1).strip() or "unknown"
                code = match.group(2).strip()
                if code:
                    code_blocks.append({
                        "language": language,
                        "code": code,
                        "from_role": message.get("role"),
                        "timestamp": message.get("timestamp", datetime.datetime.now().isoformat())
                    })
        
        return code_blocks
    
    async def generate_session_description(self, messages: List[Dict[str, Any]]) -> str:
        """
        Generate a description for a session based on its messages.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            description: A concise description of the session
        """
        # For simplicity in this implementation, we'll use a basic approach
        # In a full implementation, we might use the context system's capabilities
        
        if not messages:
            return "Empty session"
        
        # Get the first human message as a starting point
        first_human = next((m for m in messages if m.get("role") == "human"), None)
        
        if first_human:
            content = first_human.get("content", "")
            # Extract first line or first 50 characters
            first_line = content.split('\n')[0][:100].strip()
            if first_line:
                return first_line
        
        # Fallback to generic description with timestamp
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return f"Claude CLI session from {timestamp}"
    
    async def identify_key_topics(self, messages: List[Dict[str, Any]]) -> List[str]:
        """
        Identify key topics discussed in the session.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            topics: List of key topics
        """
        # For simplicity, extract likely keywords from content
        # In a full implementation, this would use more sophisticated NLP
        
        all_content = " ".join([m.get("content", "") for m in messages])
        
        # Basic keyword extraction with common technical terms
        keywords = [
            "context", "persistence", "implementation", "integration", 
            "slack", "notion", "cli", "bridge", "redis", "postgresql",
            "pinecone", "session", "analysis", "extraction", "secondbrain"
        ]
        
        topics = []
        for keyword in keywords:
            if keyword in all_content.lower():
                topics.append(keyword)
        
        # If we have too many topics, limit to the most frequent ones
        if len(topics) > 5:
            # Count occurrences
            topic_counts = {topic: all_content.lower().count(topic) for topic in topics}
            # Sort by frequency
            topics = sorted(topics, key=lambda t: topic_counts[t], reverse=True)[:5]
            
        return topics
    
    def update_session_index(self, session_id: str, description: str, timestamp: str):
        """Update the session index with a new or modified session."""
        try:
            # Load existing index
            with open(SESSION_INDEX_FILE, 'r') as f:
                index_data = json.load(f)
            
            # Add new session
            session_entry = {
                "id": session_id,
                "description": description,
                "timestamp": timestamp
            }
            
            # Remove existing entry with same ID if present
            index_data["sessions"] = [s for s in index_data.get("sessions", []) if s.get("id") != session_id]
            
            # Add new entry
            index_data["sessions"].append(session_entry)
            
            # Write updated index
            with open(SESSION_INDEX_FILE, 'w') as f:
                json.dump(index_data, f, indent=2)
                
        except Exception as e:
            print(f"Error updating session index: {str(e)}")
    
    def update_session_notes(self, session_id: str, description: str, messages: List[Dict[str, Any]], imported: bool = False):
        """Update the human-readable session notes with a new session."""
        try:
            # Format timestamp
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Prepare note content
            note = f"\n## Session {session_id}\n\n"
            note += f"**Time**: {timestamp}\n\n"
            note += f"**Description**: {description}\n\n"
            
            if imported:
                note += "**Note**: This session was imported from another file.\n\n"
                
            # Add message statistics
            human_msgs = sum(1 for m in messages if m.get("role") == "human")
            assistant_msgs = sum(1 for m in messages if m.get("role") == "assistant")
            note += f"**Messages**: {len(messages)} total ({human_msgs} human, {assistant_msgs} assistant)\n\n"
            
            # Add first exchange snippet if available
            if len(messages) >= 2:
                human = next((m for m in messages if m.get("role") == "human"), None)
                assistant = next((m for m in messages if m.get("role") == "assistant"), None)
                
                if human and assistant:
                    note += "**First exchange**:\n\n"
                    # Human message (first 100 chars)
                    human_content = human.get("content", "")
                    human_preview = human_content[:100] + ("..." if len(human_content) > 100 else "")
                    note += f"Human: {human_preview}\n\n"
                    # Assistant message (first 100 chars)
                    assistant_content = assistant.get("content", "")
                    assistant_preview = assistant_content[:100] + ("..." if len(assistant_content) > 100 else "")
                    note += f"Assistant: {assistant_preview}\n\n"
            
            # Append to notes file
            with open(SESSION_NOTES_FILE, 'a') as f:
                f.write(note)
                
        except Exception as e:
            print(f"Error updating session notes: {str(e)}")
    
    def add_bridge_to_notes(self, from_session_id: str, to_session_id: str):
        """Add a note about bridging two sessions."""
        try:
            # Format timestamp
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Prepare note content
            note = f"\n## Bridge: {from_session_id} → {to_session_id}\n\n"
            note += f"**Time**: {timestamp}\n\n"
            note += f"Created a context bridge from session {from_session_id} to session {to_session_id}.\n"
            note += "This ensures full context continuity between the two sessions.\n\n"
            
            # Append to notes file
            with open(SESSION_NOTES_FILE, 'a') as f:
                f.write(note)
                
        except Exception as e:
            print(f"Error adding bridge to notes: {str(e)}")
    
    def update_cli_log(self, session_context: Dict[str, Any], new_session_id: str):
        """Update the CLI log with loaded session information."""
        try:
            # Prepare note about loaded session
            note = "\n\n<!-- Session Context Loaded -->\n"
            note += f"<!-- Previous Session ID: {session_context.get('id')} -->\n"
            note += f"<!-- New Session ID: {new_session_id} -->\n"
            note += f"<!-- Description: {session_context.get('description')} -->\n"
            note += f"<!-- Messages: {len(session_context.get('messages', []))} -->\n"
            note += f"<!-- Timestamp: {datetime.datetime.now().isoformat()} -->\n"
            note += "<!-- CONTEXT PRESERVATION: NEVER TRUNCATE OR SIMPLIFY -->\n\n"
            
            # Add summary of loaded context
            note += "Session loaded with previous context:\n\n"
            note += f"Loaded session: {session_context.get('description')}\n"
            note += f"Previous messages: {len(session_context.get('messages', []))}\n"
            note += "Context continuity preserved with full context bridge\n\n"
            
            # Append to CLI log
            with open(DEFAULT_LOG_FILE, 'a') as f:
                f.write(note)
                
        except Exception as e:
            print(f"Error updating CLI log: {str(e)}")

# CLI entry point
async def main():
    parser = argparse.ArgumentParser(description="Claude Context Bridge - Session Context Preservation Tool")
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Save command
    save_parser = subparsers.add_parser('save', help='Save current session')
    save_parser.add_argument('--description', help='Session description')
    save_parser.add_argument('--log-file', help='Path to log file')
    
    # Load command
    load_parser = subparsers.add_parser('load', help='Load a session')
    load_parser.add_argument('session_id', help='Session ID to load')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List saved sessions')
    list_parser.add_argument('--detailed', action='store_true', help='Show detailed information')
    
    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Analyze a log file')
    analyze_parser.add_argument('log_file', help='Path to log file')
    
    # Bridge command
    bridge_parser = subparsers.add_parser('bridge', help='Create a bridge between two sessions')
    bridge_parser.add_argument('from_id', help='Source session ID')
    bridge_parser.add_argument('to_id', help='Target session ID')
    
    # Clean command
    clean_parser = subparsers.add_parser('clean', help='Clean old sessions')
    clean_parser.add_argument('--days', type=int, default=30, help='Remove sessions older than this many days')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export a session')
    export_parser.add_argument('session_id', help='Session ID to export')
    export_parser.add_argument('--output', help='Output file path')
    
    # Import command
    import_parser = subparsers.add_parser('import', help='Import a session')
    import_parser.add_argument('file', help='Path to exported session file')
    
    # Parse args
    args = parser.parse_args()
    
    # Create bridge instance
    bridge = ClaudeContextBridge()
    
    # Execute command
    if args.command == 'save':
        await bridge.save_session(args.description, args.log_file)
    elif args.command == 'load':
        await bridge.load_session(args.session_id)
    elif args.command == 'list':
        await bridge.list_sessions(args.detailed)
    elif args.command == 'analyze':
        await bridge.analyze_log(args.log_file)
    elif args.command == 'bridge':
        await bridge.create_session_bridge(args.from_id, args.to_id)
    elif args.command == 'clean':
        await bridge.clean_sessions(args.days)
    elif args.command == 'export':
        await bridge.export_session(args.session_id, args.output)
    elif args.command == 'import':
        await bridge.import_session(args.file)
    else:
        parser.print_help()

if __name__ == "__main__":
    asyncio.run(main())