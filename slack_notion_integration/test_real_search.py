#!/usr/bin/env python3
"""
Test script for semantic search on real content.
This script indexes and searches actual transcripts from the SecondBrain system.
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime

# Add the parent directory to the path to import the src modules
sys.path.append('/Volumes/Envoy/SecondBrain')

from slack_notion_integration.src.config.env import load_env
from slack_notion_integration.src.redis.client import RedisClient
from slack_notion_integration.src.database.client import PostgresClient
from slack_notion_integration.src.vector.client import PineconeClient
from slack_notion_integration.src.context.manager import ContextManager
from slack_notion_integration.src.utils.logger import setup_logger, get_logger

logger = get_logger(__name__)

def setup():
    """Set up the environment and clients."""
    # Load environment variables
    load_env()
    
    # Set up clients
    redis_client = RedisClient(
        host=os.getenv("REDIS_HOST"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        password=os.getenv("REDIS_PASSWORD"),
        username=os.getenv("REDIS_USERNAME"),
        db=int(os.getenv("REDIS_DB", "0"))
    )
    
    postgres_client = PostgresClient(
        host=os.getenv("POSTGRES_HOST"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        database=os.getenv("POSTGRES_DB")
    )
    
    pinecone_client = PineconeClient(
        api_key=os.getenv("PINECONE_API_KEY"),
        environment=os.getenv("PINECONE_ENVIRONMENT"),
        index_name=os.getenv("PINECONE_INDEX")
    )
    
    # Set up context manager
    context_manager = ContextManager(redis_client, postgres_client, pinecone_client)
    
    return context_manager

def load_transcript_files(transcript_dir='/Volumes/Envoy/SecondBrain/processed_content', limit=5):
    """Load transcript files from the given directory."""
    transcript_files = []
    for filename in os.listdir(transcript_dir):
        if filename.endswith('.json') and (
            'transcript_for_' in filename or 
            'done_transcript_for_' in filename
        ):
            transcript_files.append(os.path.join(transcript_dir, filename))
            if len(transcript_files) >= limit:
                break
    
    return transcript_files

def index_transcripts(context_manager, transcript_files):
    """Index transcript files into Pinecone."""
    print(f"Indexing {len(transcript_files)} transcript files...")
    
    session_id = f"transcript_indexing_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    context_manager.create_session("system", "cli")
    
    total_chunks = 0
    
    for file_path in transcript_files:
        try:
            with open(file_path, 'r') as f:
                transcript_data = json.load(f)
            
            # Extract the content
            content = transcript_data.get('content', '')
            
            # The content might be a raw transcript or processed data
            # Let's handle both cases
            if isinstance(content, str):
                # Convert large string into manageable chunks
                chunks = [content[i:i+2000] for i in range(0, len(content), 2000)]
            else:
                # If it's already structured, use it as is
                chunks = [str(content)]
            
            print(f"Processing {file_path} - {len(chunks)} chunks")
            
            # Index each chunk as a separate message
            for i, chunk in enumerate(chunks):
                message = {
                    "id": f"{os.path.basename(file_path)}_{i}",
                    "role": "system",
                    "content": chunk,
                    "timestamp": datetime.now().isoformat(),
                    "metadata": {
                        "source": os.path.basename(file_path),
                        "chunk": i
                    }
                }
                
                context_manager.add_message(session_id, message)
                total_chunks += 1
                
                # Small delay to prevent overloading the API
                time.sleep(0.1)
        
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
    
    print(f"Indexed {total_chunks} chunks from {len(transcript_files)} transcript files")
    print(f"Session ID: {session_id}")
    
    return session_id

def search_content(context_manager, session_id, query):
    """Perform a semantic search on indexed content."""
    print(f"\nSearching for: '{query}'")
    
    results = context_manager.semantic_search(query, session_id, limit=5)
    
    if not results:
        print("No results found.")
        return
    
    print(f"Found {len(results)} results:")
    for i, result in enumerate(results):
        print(f"\nResult {i+1} - Score: {result.get('score', 'N/A')}")
        
        metadata = result.get("metadata", {})
        source = metadata.get("source", "unknown")
        
        preview = metadata.get("content_preview", "")
        if len(preview) > 300:
            preview = preview[:300] + "..."
        
        print(f"Source: {source}")
        print(f"Preview: {preview}")

def find_related(context_manager, session_id, text):
    """Find content related to the given text."""
    print(f"\nFinding content related to: '{text}'")
    
    related = context_manager.find_related_content(text, session_id, limit=5)
    
    messages = related.get("messages", [])
    if not messages:
        print("No related content found.")
        return
    
    print(f"Found {len(messages)} related items:")
    for i, item in enumerate(messages):
        print(f"\nItem {i+1} - Score: {item.get('score', 'N/A')}")
        
        metadata = item.get("metadata", {})
        source = metadata.get("source", "unknown")
        
        preview = metadata.get("content_preview", "")
        if len(preview) > 300:
            preview = preview[:300] + "..."
        
        print(f"Source: {source}")
        print(f"Preview: {preview}")

def interactive_search(context_manager, session_id):
    """Run an interactive search session."""
    print("\n===== SecondBrain Semantic Search =====")
    print("Type 'exit' to quit the search.")
    print("Type 'related: [text]' to find related content.")
    
    while True:
        query = input("\nEnter search query: ")
        
        if query.lower() == 'exit':
            break
        
        if query.lower().startswith('related:'):
            text = query[8:].strip()
            find_related(context_manager, session_id, text)
        else:
            search_content(context_manager, session_id, query)

def main():
    """Main function for the search test."""
    setup_logger()
    
    parser = argparse.ArgumentParser(description="Test semantic search on real content")
    parser.add_argument("--limit", type=int, default=5, help="Number of transcript files to index")
    parser.add_argument("--session", type=str, help="Existing session ID to use (skips indexing)")
    parser.add_argument("--query", type=str, help="Single search query to run (non-interactive mode)")
    
    args = parser.parse_args()
    
    # Set up the context manager
    context_manager = setup()
    
    # Use existing session or create a new one
    if args.session:
        session_id = args.session
        print(f"Using existing session: {session_id}")
    else:
        # Load and index transcript files
        transcript_files = load_transcript_files(limit=args.limit)
        session_id = index_transcripts(context_manager, transcript_files)
    
    # Run a single query or interactive mode
    if args.query:
        search_content(context_manager, session_id, args.query)
    else:
        interactive_search(context_manager, session_id)

if __name__ == "__main__":
    main()