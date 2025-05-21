#!/usr/bin/env python3
"""
Topic Extraction Tool for SecondBrain

This script extracts verbatim quotes on specific business topics from all processed
transcripts and content, using semantic search to find relevant passages.
"""

import os
import sys
import json
import uuid
import time
import argparse
import re
from typing import List, Dict, Any, Optional
from datetime import datetime

# Add the parent directory to the path to import the src modules
sys.path.append('/Volumes/Envoy/SecondBrain')

from slack_notion_integration.src.config.env import load_env
from slack_notion_integration.src.redis.client import RedisClient
from slack_notion_integration.src.database.client import PostgresClient
from slack_notion_integration.src.vector.client import PineconeClient
from slack_notion_integration.src.context.manager import ContextManager
from slack_notion_integration.src.utils.logger import setup_logger, get_logger

# Configure logging
setup_logger()
logger = get_logger(__name__)

# Define the 9 pillar topics from Profit Drivers - Mastering the Fundamentals Course
PILLAR_TOPICS = [
    "principles and priorities",
    "simple finance systems",
    "simple time mastery",
    "business and project management",
    "dream team building and hiring",
    "optimization and iterative improvement",
    "scaling business without imploding",
    "skill improvement and development",
    "mindset and emotional wellbeing"
]

# Alternative search terms for each pillar to improve semantic search results
PILLAR_ALTERNATIVES = {
    "principles and priorities": [
        "defining what matters most", 
        "values in business", 
        "business priorities",
        "core principles",
        "mission statement",
        "business values"
    ],
    "simple finance systems": [
        "cash flow management", 
        "financial systems", 
        "income exceeding expenses",
        "revenue generation",
        "profit optimization",
        "bookkeeping systems"
    ],
    "simple time mastery": [
        "time management", 
        "productivity systems", 
        "making the most of your hours",
        "calendar management",
        "maximizing productivity",
        "time blocking techniques"
    ],
    "business and project management": [
        "organization techniques", 
        "project management systems", 
        "business organization",
        "task management",
        "workflow optimization",
        "project tracking"
    ],
    "dream team building and hiring": [
        "team building", 
        "hiring process", 
        "finding good employees",
        "delegation systems",
        "team management",
        "hiring the right people"
    ],
    "optimization and iterative improvement": [
        "continuous improvement", 
        "testing and optimization", 
        "refining systems",
        "A/B testing",
        "performance optimization",
        "process improvement"
    ],
    "scaling business without imploding": [
        "business growth", 
        "sustainable scaling", 
        "expansion strategies",
        "systems for growth",
        "sustainable business scaling",
        "growing without breaking"
    ],
    "skill improvement and development": [
        "personal development", 
        "improving your skills", 
        "sharpening your saw",
        "professional growth",
        "continuous learning",
        "developing expertise"
    ],
    "mindset and emotional wellbeing": [
        "mindset strategies", 
        "emotional intelligence", 
        "mental health for entrepreneurs",
        "resilience building",
        "fortifying yourself",
        "entrepreneur psychology"
    ]
}

class TopicExtractor:
    """Class to extract topics from content using semantic search."""
    
    def __init__(self):
        """Initialize the topic extractor."""
        # Load environment variables
        load_env()
        
        # Initialize clients
        self.redis_client = RedisClient(
            host=os.getenv("REDIS_HOST"), 
            port=int(os.getenv("REDIS_PORT", "6379")),
            password=os.getenv("REDIS_PASSWORD"),
            username=os.getenv("REDIS_USERNAME"),
            db=int(os.getenv("REDIS_DB", "0"))
        )
        
        self.postgres_client = PostgresClient(
            host=os.getenv("POSTGRES_HOST"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            database=os.getenv("POSTGRES_DB")
        )
        
        self.pinecone_client = PineconeClient(
            api_key=os.getenv("PINECONE_API_KEY"),
            environment=os.getenv("PINECONE_ENVIRONMENT"),
            index_name=os.getenv("PINECONE_INDEX")
        )
        
        # Initialize context manager
        self.context_manager = ContextManager(
            self.redis_client, 
            self.postgres_client, 
            self.pinecone_client
        )
        
        # Session ID for semantic search
        self.session_id = f"topic_extraction_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Directory for processed content
        self.content_dir = '/Volumes/Envoy/SecondBrain/processed_content'
        self.output_dir = '/Volumes/Envoy/SecondBrain/topic_extracts'
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        print(f"Topic Extractor initialized with session ID: {self.session_id}")
    
    def load_content_files(self) -> List[str]:
        """Load all content files from the processed content directory."""
        content_files = []
        
        # Get all JSON files from the processed content directory
        for filename in os.listdir(self.content_dir):
            if filename.endswith('.json'):
                content_files.append(os.path.join(self.content_dir, filename))
        
        print(f"Found {len(content_files)} content files")
        return content_files
    
    def index_content(self, content_files: List[str], limit: Optional[int] = None) -> None:
        """Index content files for semantic search."""
        print(f"Indexing content for semantic search...")
        
        # Create a session
        self.context_manager.create_session("system", "cli")
        
        total_chunks = 0
        indexed_files = 0
        
        # If limit is provided, only index that number of files
        if limit:
            content_files = content_files[:limit]
        
        for file_path in content_files:
            try:
                with open(file_path, 'r') as f:
                    content_data = json.load(f)
                
                # Extract content - it could be a string or a complex object
                content = content_data.get('content', '')
                
                # If content is a string, process it directly
                if isinstance(content, str):
                    # Split into manageable chunks (3000 chars each with overlap)
                    chunks = []
                    chunk_size = 3000
                    overlap = 500
                    
                    for i in range(0, len(content), chunk_size - overlap):
                        chunk = content[i:i + chunk_size]
                        chunks.append(chunk)
                else:
                    # If it's structured data, convert to string first
                    content_str = json.dumps(content)
                    chunks = [content_str]
                
                print(f"Processing {os.path.basename(file_path)} - {len(chunks)} chunks")
                
                # Index each chunk with metadata about its source
                for i, chunk in enumerate(chunks):
                    message = {
                        "id": f"{os.path.basename(file_path)}_{i}",
                        "role": "system",
                        "content": chunk,
                        "timestamp": datetime.now().isoformat(),
                        "metadata": {
                            "file_path": file_path,
                            "source": os.path.basename(file_path),
                            "chunk_index": i,
                            "total_chunks": len(chunks)
                        }
                    }
                    
                    self.context_manager.add_message(self.session_id, message)
                    total_chunks += 1
                
                indexed_files += 1
                
                # Every 10 files, print progress
                if indexed_files % 10 == 0:
                    print(f"Indexed {indexed_files}/{len(content_files)} files, {total_chunks} total chunks")
                
                # Small delay to prevent overwhelming the API
                time.sleep(0.1)
            
            except Exception as e:
                print(f"Error processing {file_path}: {str(e)}")
        
        print(f"Indexed {total_chunks} chunks from {indexed_files} files")
    
    def extract_quotes_for_topic(self, topic: str, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Extract quotes related to a specific topic using semantic search.
        
        Args:
            topic: The topic to search for
            limit: Maximum number of results to return
            
        Returns:
            List of quotes with metadata
        """
        print(f"\nExtracting quotes for topic: '{topic}'")
        
        # Start with standard search variations
        search_queries = [
            topic,
            f"advice about {topic}",
            f"{topic} strategy",
            f"{topic} best practices",
            f"how to improve {topic}",
            f"{topic} examples",
            f"{topic} process"
        ]
        
        # Add alternative search terms if this is one of our pillar topics
        if topic.lower() in PILLAR_ALTERNATIVES:
            alternative_terms = PILLAR_ALTERNATIVES[topic.lower()]
            for alt_term in alternative_terms:
                search_queries.append(alt_term)
                # Also add some common prefixes to the alternative terms
                search_queries.append(f"advice about {alt_term}")
                search_queries.append(f"strategies for {alt_term}")
        
        print(f"Using {len(search_queries)} search variations to find content on '{topic}'")
        
        all_results = []
        
        # Search with each query variation
        for query in search_queries:
            results = self.context_manager.semantic_search(
                query=query,
                session_id=self.session_id,
                limit=10  # Adjust based on how many results each query should return
            )
            
            # Add query info to results and extend all_results
            for result in results:
                result['query'] = query
                
                # Check if we already have a similar result
                is_duplicate = False
                for existing in all_results:
                    if (
                        existing.get('metadata', {}).get('file_path') == 
                        result.get('metadata', {}).get('file_path') and
                        existing.get('metadata', {}).get('chunk_index') == 
                        result.get('metadata', {}).get('chunk_index')
                    ):
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    all_results.append(result)
        
        # Sort by relevance (score)
        all_results = sorted(all_results, key=lambda x: x.get('score', 0), reverse=True)
        
        # Limit the number of results
        if len(all_results) > limit:
            all_results = all_results[:limit]
        
        processed_quotes = []
        
        # Process each result to extract clean quotes
        for result in all_results:
            metadata = result.get('metadata', {})
            score = result.get('score', 0)
            
            # Get the content and clean it up
            content = metadata.get('content_preview', '')
            
            # Extract the full content from the file
            file_path = metadata.get('file_path', '')
            chunk_index = metadata.get('chunk_index', 0)
            
            if file_path and os.path.exists(file_path):
                try:
                    with open(file_path, 'r') as f:
                        file_data = json.load(f)
                    
                    full_content = file_data.get('content', '')
                    
                    # If it's a string, try to extract a better quote
                    if isinstance(full_content, str):
                        # Get the original search query and any alternative terms
                        search_terms = [topic.lower()]
                        original_query = result.get('query', '').lower()
                        if original_query:
                            search_terms.append(original_query)
                        
                        # Add alternative terms if this is a pillar topic
                        if topic.lower() in PILLAR_ALTERNATIVES:
                            for alt_term in PILLAR_ALTERNATIVES[topic.lower()]:
                                search_terms.append(alt_term.lower())
                        
                        # First try to extract complete paragraphs
                        paragraphs = re.split(r'\n\s*\n', full_content)
                        relevant_paragraphs = []
                        
                        # Score each paragraph by how many search terms it contains
                        paragraph_scores = []
                        for i, paragraph in enumerate(paragraphs):
                            paragraph = paragraph.strip()
                            if not paragraph:
                                continue
                                
                            # Skip very short paragraphs (likely headers)
                            if len(paragraph) < 40:
                                continue
                                
                            # Count how many of our search terms appear in this paragraph
                            paragraph_lower = paragraph.lower()
                            term_count = 0
                            for term in search_terms:
                                term_parts = term.split()
                                # For multi-word terms, check if all parts appear in the paragraph
                                if len(term_parts) > 1:
                                    if all(part in paragraph_lower for part in term_parts):
                                        term_count += 3  # Weight multi-word matches higher
                                elif term in paragraph_lower:
                                    term_count += 1
                            
                            if term_count > 0:
                                paragraph_scores.append((i, term_count, paragraph))
                        
                        # Sort paragraphs by relevance score
                        paragraph_scores.sort(key=lambda x: x[1], reverse=True)
                        
                        # Get top paragraphs
                        if paragraph_scores:
                            # Either take the highest scoring paragraph or combine a few nearby ones
                            if len(paragraph_scores) >= 3 and paragraph_scores[0][1] > 2:
                                # If we have a strong match, just use that paragraph
                                quote = paragraph_scores[0][2]
                            else:
                                # Otherwise combine up to 3 of the best paragraphs
                                # But limit total length to 1000 chars
                                combined = ""
                                for _, _, para in paragraph_scores[:3]:
                                    if len(combined) + len(para) < 1000:
                                        if combined:
                                            combined += "\n\n"
                                        combined += para
                                    else:
                                        break
                                quote = combined
                        else:
                            # If no relevant paragraphs, fall back to sentence-based approach
                            sentences = re.split(r'(?<=[.!?])\s+', full_content)
                            
                            # Look for sentences containing our search terms
                            relevant_sentences = []
                            for sentence in sentences:
                                sentence_lower = sentence.lower()
                                for term in search_terms:
                                    if term in sentence_lower:
                                        relevant_sentences.append(sentence)
                                        break
                            
                            # Join relevant sentences to form a quote
                            if relevant_sentences:
                                # Try to find consecutive sentences for better context
                                consecutive_groups = []
                                current_group = []
                                for i, sentence in enumerate(sentences):
                                    if sentence in relevant_sentences:
                                        # Add this and the surrounding sentences for context
                                        start_idx = max(0, i-1)  # Include one sentence before
                                        end_idx = min(len(sentences), i+2)  # And one after
                                        for j in range(start_idx, end_idx):
                                            if sentences[j] not in current_group:
                                                current_group.append(sentences[j])
                                    elif current_group:
                                        consecutive_groups.append(current_group)
                                        current_group = []
                                
                                if current_group:
                                    consecutive_groups.append(current_group)
                                
                                # Use the group with the most relevant sentences
                                if consecutive_groups:
                                    best_group = max(consecutive_groups, key=len)
                                    quote = ' '.join(best_group)
                                else:
                                    # Fallback: just use the top relevant sentences
                                    quote = ' '.join(relevant_sentences[:5])
                            else:
                                # If no relevant sentences found, use a chunk of the content
                                chunk_size = 2000
                                start = chunk_index * chunk_size
                                end = start + chunk_size
                                if start < len(full_content):
                                    quote = full_content[start:min(end, len(full_content))]
                                else:
                                    quote = content
                    else:
                        # For structured content, use the preview
                        quote = content
                except Exception as e:
                    print(f"Error extracting quote from {file_path}: {str(e)}")
                    quote = content
            else:
                quote = content
            
            # Clean up the quote
            quote = quote.strip()
            if len(quote) > 1000:
                quote = quote[:997] + "..."
            
            source = metadata.get('source', 'Unknown')
            
            processed_quotes.append({
                'quote': quote,
                'source': source,
                'relevance_score': score,
                'query': result.get('query', topic)
            })
        
        print(f"Extracted {len(processed_quotes)} quotes for topic '{topic}'")
        return processed_quotes
    
    def save_topic_quotes(self, topic: str, quotes: List[Dict[str, Any]]) -> str:
        """
        Save extracted quotes to a markdown file.
        
        Args:
            topic: The topic the quotes are related to
            quotes: List of quotes with metadata
            
        Returns:
            Path to the saved file
        """
        # Create a filename based on the topic
        safe_topic = topic.replace(' ', '_').replace('/', '_').lower()
        filename = f"{safe_topic}_quotes.md"
        file_path = os.path.join(self.output_dir, filename)
        
        with open(file_path, 'w') as f:
            f.write(f"# Quotes on {topic.title()}\n\n")
            f.write(f"*Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
            
            for i, quote_data in enumerate(quotes, 1):
                quote = quote_data.get('quote', '')
                source = quote_data.get('source', 'Unknown')
                score = quote_data.get('relevance_score', 0)
                query = quote_data.get('query', topic)
                
                f.write(f"## Quote {i}\n\n")
                f.write(f"> {quote}\n\n")
                f.write(f"**Source:** {source}  \n")
                f.write(f"**Relevance:** {score:.2f}  \n")
                f.write(f"**Found with query:** {query}\n\n")
                f.write("---\n\n")
        
        print(f"Saved quotes to {file_path}")
        return file_path
    
    def process_all_pillar_topics(self) -> List[str]:
        """
        Process all pillar topics and save quotes for each.
        
        Returns:
            List of paths to saved files
        """
        saved_files = []
        
        for topic in PILLAR_TOPICS:
            quotes = self.extract_quotes_for_topic(topic)
            file_path = self.save_topic_quotes(topic, quotes)
            saved_files.append(file_path)
            
            # Short delay between topics
            time.sleep(1)
        
        return saved_files
    
    def extract_custom_topic(self, topic: str) -> str:
        """
        Extract quotes for a custom topic.
        
        Args:
            topic: The custom topic to extract quotes for
            
        Returns:
            Path to the saved file
        """
        quotes = self.extract_quotes_for_topic(topic)
        file_path = self.save_topic_quotes(topic, quotes)
        return file_path

def main():
    """Main function to run the topic extractor."""
    parser = argparse.ArgumentParser(description="Extract quotes on specific business topics")
    parser.add_argument("--topic", type=str, help="Custom topic to extract quotes for")
    parser.add_argument("--all-pillars", action="store_true", help="Extract quotes for all pillar topics")
    parser.add_argument("--list-pillars", action="store_true", help="List all pillar topics")
    parser.add_argument("--limit", type=int, default=None, help="Limit the number of files to index")
    parser.add_argument("--discover", action="store_true", help="Discover additional topics in content")
    
    args = parser.parse_args()
    
    # Initialize the topic extractor
    extractor = TopicExtractor()
    
    # List pillar topics if requested
    if args.list_pillars:
        print("\nPillar Topics:")
        for topic in PILLAR_TOPICS:
            print(f"- {topic}")
        return
    
    # Load content files
    content_files = extractor.load_content_files()
    
    # Index content for semantic search
    extractor.index_content(content_files, args.limit)
    
    if args.topic:
        # Extract quotes for a custom topic
        file_path = extractor.extract_custom_topic(args.topic)
        print(f"\nQuotes for '{args.topic}' saved to {file_path}")
    
    elif args.all_pillars:
        # Extract quotes for all pillar topics
        saved_files = extractor.process_all_pillar_topics()
        print(f"\nProcessed all pillar topics. Files saved:")
        for file_path in saved_files:
            print(f"- {file_path}")
    
    elif args.discover:
        # This would be a more complex feature to implement
        print("\nTopic discovery is not yet implemented. Please specify a topic with --topic or use --all-pillars.")
    
    else:
        print("\nPlease specify a topic with --topic or use --all-pillars to process all pillar topics.")
        print("Use --list-pillars to see all pillar topics.")

if __name__ == "__main__":
    main()