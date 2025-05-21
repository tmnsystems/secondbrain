#!/usr/bin/env python3
"""
Enhanced Topic Extraction Tool for SecondBrain

This script extracts higher quality verbatim quotes on specific business topics
by filtering out transcripts that don't contain substantive content and focusing
on paragraphs with higher relevance scores.
"""

import os
import sys
import json
import re
import hashlib
import string
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import argparse

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

# Alternative search terms for each pillar
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

class EnhancedTopicExtractor:
    """Class to extract high-quality topics from content using advanced filtering."""
    
    def __init__(self):
        """Initialize the topic extractor."""
        # Directory for processed content
        self.content_dir = '/Volumes/Envoy/SecondBrain/processed_content'
        self.output_dir = '/Volumes/Envoy/SecondBrain/topic_extracts'
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        print(f"Enhanced Topic Extractor initialized")
    
    def load_content_files(self) -> list:
        """Load all content files from the processed content directory."""
        content_files = []
        
        # Get all JSON files from the processed content directory
        for filename in os.listdir(self.content_dir):
            if filename.endswith('.json') and not filename == "content_index.json":
                content_files.append(os.path.join(self.content_dir, filename))
        
        print(f"Found {len(content_files)} content files")
        return content_files
    
    def get_search_terms(self, topic: str) -> list:
        """Get all search terms for a topic, including alternatives."""
        search_terms = [topic.lower()]
        
        # Add alternative terms if this is a pillar topic
        if topic.lower() in PILLAR_ALTERNATIVES:
            for alt_term in PILLAR_ALTERNATIVES[topic.lower()]:
                search_terms.append(alt_term.lower())
        
        return search_terms
    
    def clean_text(self, text: str) -> str:
        """
        Clean text by removing timestamps, speaker names, and other formatting.
        """
        # Remove timestamp patterns like 00:00:00
        text = re.sub(r'\d{2}:\d{2}:\d{2}', '', text)
        
        # Remove speaker attribution patterns like "Name (email.com)"
        text = re.sub(r'\w+\'s iPhone \([^)]+\)', '', text)
        text = re.sub(r'[A-Za-z]+ [A-Za-z]+ \([^)]+\)', '', text)
        text = re.sub(r'\([^)]+\.com\)', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def is_paragraph_relevant(self, paragraph: str, search_terms: list) -> int:
        """
        Check if a paragraph is relevant to any of the search terms.
        
        Returns:
            Relevance score (0 if not relevant)
        """
        paragraph_lower = paragraph.lower()
        score = 0
        
        for term in search_terms:
            term_parts = term.split()
            # For multi-word terms, check if all parts appear in the paragraph
            if len(term_parts) > 1:
                if all(part in paragraph_lower for part in term_parts):
                    score += 3  # Weight multi-word matches higher
            elif term in paragraph_lower:
                score += 1
        
        # Additional scoring for coherence - prefer paragraphs with good sentence structure
        sentences = re.split(r'(?<=[.!?])\s+', paragraph)
        if len(sentences) >= 3:
            score += 1  # Bonus for paragraphs with multiple sentences
        
        # Penalize very short paragraphs
        if len(paragraph) < 50:
            score -= 1
            
        # Penalize paragraphs with too many non-alphanumeric characters (like chat logs)
        non_alnum_count = sum(1 for c in paragraph if c not in string.ascii_letters + string.digits + string.whitespace + string.punctuation)
        if non_alnum_count > len(paragraph) * 0.1:  # If more than 10% are special characters
            score -= 2
            
        # Penalize paragraphs containing "hello" or greetings near the start (likely chat openings)
        if re.search(r'\b(hello|hi|hey|good morning|morning|morning!)\b', paragraph_lower[:50]):
            score -= 2
            
        # Bonus for paragraphs with business-related terms
        business_terms = ["business", "system", "process", "strategy", "client", "customer", 
                         "revenue", "profit", "growth", "team", "management", "leadership"]
        for term in business_terms:
            if term in paragraph_lower:
                score += 0.5
        
        return max(0, score)  # Don't return negative scores
    
    def is_high_quality_paragraph(self, paragraph: str) -> bool:
        """
        Determine if a paragraph is high quality content (not chat fragments).
        """
        # Skip very short paragraphs
        if len(paragraph) < 100:
            return False
            
        # Check for full sentences with proper structure
        sentences = re.split(r'(?<=[.!?])\s+', paragraph)
        if len(sentences) < 2:
            return False
            
        # Check for coherent structure
        words = paragraph.split()
        if len(words) < 15:
            return False
            
        # Check for obvious chat patterns
        chat_patterns = [
            r'^\s*hello',
            r'^\s*hi\s+',
            r'^\s*hey\s+',
            r'how are you',
            r'good morning',
            r'can you hear me',
            r'nice to meet you',
            r'let me know'
        ]
        
        for pattern in chat_patterns:
            if re.search(pattern, paragraph.lower()):
                return False
                
        return True
    
    def extract_quotes_for_topic(self, topic: str, content_files: list, limit: int = 30) -> list:
        """
        Extract quotes related to a specific topic.
        
        Args:
            topic: The topic to search for
            content_files: List of content files to search
            limit: Maximum number of results to return
            
        Returns:
            List of quotes with metadata
        """
        print(f"\nExtracting quotes for topic: '{topic}'")
        
        # Get search terms for this topic
        search_terms = self.get_search_terms(topic)
        print(f"Using {len(search_terms)} search terms: {', '.join(search_terms)}")
        
        # Results container
        quotes = []
        
        # Process each content file
        for file_path in content_files:
            try:
                with open(file_path, 'r') as f:
                    content_data = json.load(f)
                
                # Extract content - it could be a string or a complex object
                content = content_data.get('content', '')
                
                # Skip if no content
                if not content:
                    continue
                
                # If content is not a string, convert it
                if not isinstance(content, str):
                    content = json.dumps(content)
                
                # Skip very short content
                if len(content) < 500:
                    continue
                
                # Split into paragraphs, using a more robust method
                paragraphs = []
                
                # Try several paragraph splitting methods
                paragraph_candidates = re.split(r'\n\s*\n', content)
                
                # If we got very few paragraphs, try alternative splitting
                if len(paragraph_candidates) < 3:
                    # Try splitting by double line breaks
                    paragraph_candidates = re.split(r'\n\n', content)
                    
                    # If still few paragraphs, try splitting by single line breaks
                    if len(paragraph_candidates) < 3:
                        paragraph_candidates = re.split(r'\n', content)
                
                # Clean and filter paragraphs
                for para in paragraph_candidates:
                    para = para.strip()
                    if para and len(para) > 50:
                        # Clean the paragraph
                        cleaned_para = self.clean_text(para)
                        if cleaned_para and len(cleaned_para) > 50:
                            paragraphs.append(cleaned_para)
                
                # Score each paragraph
                paragraph_scores = []
                for i, paragraph in enumerate(paragraphs):
                    # Calculate relevance score
                    score = self.is_paragraph_relevant(paragraph, search_terms)
                    
                    if score > 0 and self.is_high_quality_paragraph(paragraph):
                        paragraph_scores.append((i, score, paragraph))
                
                # Add relevant paragraphs to results
                for i, score, paragraph in paragraph_scores:
                    quote = {
                        'quote': paragraph,
                        'source': os.path.basename(file_path),
                        'file_path': file_path,
                        'relevance_score': score
                    }
                    quotes.append(quote)
            
            except Exception as e:
                print(f"Error processing {file_path}: {str(e)}")
        
        # Sort by relevance score
        quotes.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Limit the number of quotes
        if len(quotes) > limit:
            quotes = quotes[:limit]
        
        print(f"Found {len(quotes)} relevant quotes for '{topic}'")
        return quotes
    
    def save_topic_quotes(self, topic: str, quotes: list) -> str:
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
        filename = f"{safe_topic}_high_quality_quotes.md"
        file_path = os.path.join(self.output_dir, filename)
        
        with open(file_path, 'w') as f:
            f.write(f"# High-Quality Quotes on {topic.title()}\n\n")
            f.write(f"*Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
            
            for i, quote_data in enumerate(quotes, 1):
                quote = quote_data.get('quote', '')
                source = quote_data.get('source', 'Unknown')
                score = quote_data.get('relevance_score', 0)
                
                f.write(f"## Quote {i}\n\n")
                f.write(f"> {quote}\n\n")
                f.write(f"**Source:** {source}  \n")
                f.write(f"**Relevance Score:** {score}\n\n")
                f.write("---\n\n")
        
        print(f"Saved quotes to {file_path}")
        return file_path
    
    def process_all_pillar_topics(self, limit_per_topic: int = 30, limit_files: int = None) -> list:
        """
        Process all pillar topics and save quotes for each.
        
        Args:
            limit_per_topic: Maximum number of quotes per topic
            limit_files: Limit the number of files to process (optional)
            
        Returns:
            List of paths to saved files
        """
        # Load content files
        all_content_files = self.load_content_files()
        
        # Limit files if requested
        if limit_files:
            content_files = all_content_files[:limit_files]
            print(f"Limiting to {len(content_files)} out of {len(all_content_files)} files")
        else:
            content_files = all_content_files
        
        saved_files = []
        
        for topic in PILLAR_TOPICS:
            quotes = self.extract_quotes_for_topic(topic, content_files, limit_per_topic)
            file_path = self.save_topic_quotes(topic, quotes)
            saved_files.append(file_path)
        
        return saved_files
    
    def extract_custom_topic(self, topic: str, limit_per_topic: int = 30, limit_files: int = None) -> str:
        """
        Extract quotes for a custom topic.
        
        Args:
            topic: The custom topic to extract quotes for
            limit_per_topic: Maximum number of quotes per topic
            limit_files: Limit the number of files to process (optional)
            
        Returns:
            Path to the saved file
        """
        # Load content files
        all_content_files = self.load_content_files()
        
        # Limit files if requested
        if limit_files:
            content_files = all_content_files[:limit_files]
            print(f"Limiting to {len(content_files)} out of {len(all_content_files)} files")
        else:
            content_files = all_content_files
        
        quotes = self.extract_quotes_for_topic(topic, content_files, limit_per_topic)
        file_path = self.save_topic_quotes(topic, quotes)
        return file_path

def main():
    """Main function to run the topic extractor."""
    parser = argparse.ArgumentParser(description="Extract high-quality quotes on specific business topics")
    parser.add_argument("--topic", type=str, help="Custom topic to extract quotes for")
    parser.add_argument("--all-pillars", action="store_true", help="Extract quotes for all pillar topics")
    parser.add_argument("--list-pillars", action="store_true", help="List all pillar topics")
    parser.add_argument("--limit", type=int, default=30, help="Limit the number of quotes per topic")
    parser.add_argument("--limit-files", type=int, default=None, help="Limit the number of files to process")
    
    args = parser.parse_args()
    
    # Initialize the topic extractor
    extractor = EnhancedTopicExtractor()
    
    # List pillar topics if requested
    if args.list_pillars:
        print("\nPillar Topics:")
        for topic in PILLAR_TOPICS:
            print(f"- {topic}")
        return
    
    if args.topic:
        # Extract quotes for a custom topic
        file_path = extractor.extract_custom_topic(args.topic, args.limit, args.limit_files)
        print(f"\nHigh-quality quotes for '{args.topic}' saved to {file_path}")
    
    elif args.all_pillars:
        # Extract quotes for all pillar topics
        saved_files = extractor.process_all_pillar_topics(args.limit, args.limit_files)
        print(f"\nProcessed all pillar topics. Files saved:")
        for file_path in saved_files:
            print(f"- {file_path}")
    
    else:
        print("\nPlease specify a topic with --topic or use --all-pillars to process all pillar topics.")
        print("Use --list-pillars to see all pillar topics.")

if __name__ == "__main__":
    main()