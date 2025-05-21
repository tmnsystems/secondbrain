"""
SecondBrain Content Processor Module

This module handles the ingestion, normalization, and processing of various content types
in the SecondBrain system. It provides a unified interface for extracting structured content
from different formats including transcripts, blog posts, PDFs, and existing processed content.
"""

import os
import json
import logging
from typing import Dict, List, Optional, Union, Any
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ContentProcessor:
    """Base class for content processing functionality."""
    
    def __init__(self, content_dir: Optional[str] = None):
        """
        Initialize the ContentProcessor.
        
        Args:
            content_dir: Directory containing content files to process
        """
        self.content_dir = content_dir if content_dir else os.getenv('SECONDBRAIN_CONTENT_DIR', '/Volumes/Envoy/SecondBrain/processed_content')
        logger.info(f"Initialized ContentProcessor with content_dir: {self.content_dir}")
        
    def process_file(self, file_path: str) -> Dict[str, Any]:
        """
        Process a single file based on its extension.
        
        Args:
            file_path: Path to the file to process
            
        Returns:
            Processed content as a dictionary
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
            
        if file_path.suffix == '.json':
            return self._process_json_file(file_path)
        elif file_path.suffix == '.txt':
            return self._process_text_file(file_path)
        elif file_path.suffix == '.md':
            return self._process_markdown_file(file_path)
        elif file_path.suffix.lower() in ['.pdf']:
            return self._process_pdf_file(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_path.suffix}")
    
    def process_directory(self, dir_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Process all files in a directory.
        
        Args:
            dir_path: Directory to process. If None, uses the default content_dir.
            
        Returns:
            List of processed content dictionaries
        """
        dir_path = Path(dir_path) if dir_path else Path(self.content_dir)
        
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: {dir_path}")
            
        results = []
        
        for file_path in dir_path.glob('**/*'):
            if file_path.is_file() and file_path.suffix in ['.json', '.txt', '.md', '.pdf']:
                try:
                    processed_content = self.process_file(str(file_path))
                    results.append(processed_content)
                except Exception as e:
                    logger.error(f"Error processing file {file_path}: {str(e)}")
                    
        return results
    
    def _process_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Process a JSON file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                
            # Add metadata
            content['_metadata'] = {
                'source_file': str(file_path),
                'file_type': 'json',
                'processor': self.__class__.__name__
            }
            
            return content
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON file: {file_path}")
            raise
    
    def _process_text_file(self, file_path: Path) -> Dict[str, Any]:
        """Process a text file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
                
            # Create structured content
            content = {
                'content': text_content,
                '_metadata': {
                    'source_file': str(file_path),
                    'file_type': 'txt',
                    'processor': self.__class__.__name__
                }
            }
            
            return content
        except Exception as e:
            logger.error(f"Error processing text file {file_path}: {str(e)}")
            raise
    
    def _process_markdown_file(self, file_path: Path) -> Dict[str, Any]:
        """Process a Markdown file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                md_content = f.read()
                
            # Extract title from first heading if available
            title = None
            lines = md_content.split('\n')
            for line in lines:
                if line.startswith('# '):
                    title = line[2:].strip()
                    break
                    
            # Create structured content
            content = {
                'title': title,
                'content': md_content,
                '_metadata': {
                    'source_file': str(file_path),
                    'file_type': 'md',
                    'processor': self.__class__.__name__
                }
            }
            
            return content
        except Exception as e:
            logger.error(f"Error processing Markdown file {file_path}: {str(e)}")
            raise
    
    def _process_pdf_file(self, file_path: Path) -> Dict[str, Any]:
        """
        Process a PDF file.
        
        Note: This is a placeholder. For actual implementation, you'd need a PDF
        processing library like PyPDF2 or pdfminer.
        """
        try:
            # Placeholder for PDF processing
            # In a real implementation, you would use a PDF processing library
            content = {
                'content': f"PDF content extraction not implemented for {file_path}",
                '_metadata': {
                    'source_file': str(file_path),
                    'file_type': 'pdf',
                    'processor': self.__class__.__name__
                }
            }
            
            return content
        except Exception as e:
            logger.error(f"Error processing PDF file {file_path}: {str(e)}")
            raise


class TranscriptProcessor(ContentProcessor):
    """Specialized processor for transcript files."""
    
    def _process_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Process a transcript JSON file."""
        content = super()._process_json_file(file_path)
        
        # Extract transcript-specific data if available
        if isinstance(content, dict):
            # Identify if this is a transcript by filename pattern
            if 'transcript_for' in file_path.name or 'ranscript_for' in file_path.name:
                content['_metadata']['content_type'] = 'transcript'
                
                # Extract speakers if available in the content
                if 'speakers' not in content and 'content' in content:
                    # Simple speaker extraction logic - can be enhanced
                    speakers = set()
                    lines = content['content'].split('\n')
                    for line in lines:
                        if ': ' in line:
                            possible_speaker = line.split(':', 1)[0].strip()
                            if possible_speaker and len(possible_speaker) < 50:  # Reasonable speaker name length
                                speakers.add(possible_speaker)
                    
                    if speakers:
                        content['speakers'] = list(speakers)
        
        return content


class BlogPostProcessor(ContentProcessor):
    """Specialized processor for blog post files."""
    
    def _process_markdown_file(self, file_path: Path) -> Dict[str, Any]:
        """Process a blog post Markdown file."""
        content = super()._process_markdown_file(file_path)
        
        # Identify if this is a blog post
        if 'blog_posts' in str(file_path) or file_path.stem.endswith('_blog'):
            content['_metadata']['content_type'] = 'blog_post'
            
            # Extract metadata if available
            lines = content['content'].split('\n')
            metadata = {}
            in_metadata = False
            
            for i, line in enumerate(lines):
                if line.strip() == '---':
                    if not in_metadata:
                        in_metadata = True
                        continue
                    else:
                        in_metadata = False
                        break
                
                if in_metadata and ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip()
            
            if metadata:
                content['metadata'] = metadata
                
        return content


class ContentNormalizer:
    """Normalizes content from different sources into a standard format."""
    
    def normalize(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize content to a standard format.
        
        Args:
            content: Content dictionary to normalize
            
        Returns:
            Normalized content dictionary
        """
        normalized = {
            'id': self._generate_content_id(content),
            'title': self._extract_title(content),
            'content': self._extract_content(content),
            'metadata': self._extract_metadata(content),
            'segments': self._segment_content(content)
        }
        
        return normalized
    
    def _generate_content_id(self, content: Dict[str, Any]) -> str:
        """Generate a unique ID for the content."""
        if '_metadata' in content and 'source_file' in content['_metadata']:
            file_path = Path(content['_metadata']['source_file'])
            return f"{file_path.stem}"
        elif 'id' in content:
            return content['id']
        else:
            # Fallback to a hash of the content
            import hashlib
            content_str = json.dumps(content, sort_keys=True)
            return hashlib.md5(content_str.encode()).hexdigest()
    
    def _extract_title(self, content: Dict[str, Any]) -> Optional[str]:
        """Extract title from content."""
        # Try various common title fields
        for field in ['title', 'name', 'heading']:
            if field in content:
                return content[field]
        
        # Try to extract from filename if available
        if '_metadata' in content and 'source_file' in content['_metadata']:
            file_path = Path(content['_metadata']['source_file'])
            title = file_path.stem.replace('_', ' ').title()
            
            # Clean up common prefixes
            prefixes = ['Transcript For ', 'Done Transcript For ']
            for prefix in prefixes:
                if title.lower().startswith(prefix.lower()):
                    title = title[len(prefix):]
            
            return title
        
        return None
    
    def _extract_content(self, content: Dict[str, Any]) -> str:
        """Extract the main content text."""
        if 'content' in content:
            return content['content']
        elif 'text' in content:
            return content['text']
        elif 'body' in content:
            return content['body']
        else:
            # Try to concatenate all string values
            text_content = []
            for key, value in content.items():
                if isinstance(value, str) and key not in ['id', 'title', '_metadata']:
                    text_content.append(value)
            
            return '\n\n'.join(text_content) if text_content else ""
    
    def _extract_metadata(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and normalize metadata."""
        metadata = {}
        
        # Copy existing metadata
        if '_metadata' in content:
            metadata.update(content['_metadata'])
            
        if 'metadata' in content:
            metadata.update(content['metadata'])
            
        # Extract content type
        if 'content_type' not in metadata:
            metadata['content_type'] = self._determine_content_type(content)
            
        # Extract date if available
        for field in ['date', 'created_at', 'timestamp']:
            if field in content:
                metadata['date'] = content[field]
                break
                
        # Extract author if available
        for field in ['author', 'creator', 'speaker']:
            if field in content:
                metadata['author'] = content[field]
                break
        
        return metadata
    
    def _determine_content_type(self, content: Dict[str, Any]) -> str:
        """Determine the content type based on available data."""
        # Check metadata first
        if '_metadata' in content and 'content_type' in content['_metadata']:
            return content['_metadata']['content_type']
            
        # Check file type
        if '_metadata' in content and 'file_type' in content['_metadata']:
            file_type = content['_metadata']['file_type']
            if file_type == 'md':
                return 'blog_post'
                
        # Check filename patterns
        if '_metadata' in content and 'source_file' in content['_metadata']:
            file_path = content['_metadata']['source_file']
            if 'transcript' in file_path.lower():
                return 'transcript'
            if 'blog' in file_path.lower():
                return 'blog_post'
        
        # Default
        return 'unknown'
    
    def _segment_content(self, content: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Segment content into meaningful chunks.
        
        This is a basic implementation - would be enhanced with NLP in the full system.
        """
        segments = []
        content_text = self._extract_content(content)
        
        # Simple paragraph-based segmentation
        if content_text:
            paragraphs = content_text.split('\n\n')
            for i, paragraph in enumerate(paragraphs):
                if paragraph.strip():
                    segments.append({
                        'id': f"seg_{i}",
                        'content': paragraph.strip(),
                        'type': 'paragraph'
                    })
        
        return segments


class MetadataExtractor:
    """Extracts structured metadata from content."""
    
    def extract_metadata(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract rich metadata from content.
        
        Args:
            content: Content dictionary
            
        Returns:
            Dictionary of extracted metadata
        """
        base_metadata = content.get('metadata', {}).copy()
        
        # Extract topic information
        topic_info = self._extract_topic_info(content)
        if topic_info:
            base_metadata['topics'] = topic_info
            
        # Extract date information
        date_info = self._extract_date_info(content)
        if date_info:
            base_metadata['date'] = date_info
            
        # Extract people information
        people_info = self._extract_people_info(content)
        if people_info:
            base_metadata['people'] = people_info
        
        return base_metadata
    
    def _extract_topic_info(self, content: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract topic information from content."""
        topics = []
        content_text = content.get('content', '')
        title = content.get('title', '')
        
        # Simple keyword-based topic detection - would be enhanced with NLP
        pillar_keywords = {
            'principles_priorities': ['principles', 'priorities', 'values', 'big rocks'],
            'simple_finance': ['finance', 'money', 'pricing', 'revenue', 'profit'],
            'time_mastery': ['time', 'calendar', 'productivity', 'hours'],
            'business_management': ['management', 'process', 'workflow', 'systems'],
            'team_building': ['team', 'hiring', 'staff', 'employees', 'delegation'],
            'optimization': ['optimize', 'improve', 'efficiency', 'streamline'],
            'scaling': ['scale', 'growth', 'expand', 'bigger'],
            'skill_improvement': ['skills', 'learning', 'develop', 'improve'],
            'mindset': ['mindset', 'emotional', 'mental', 'psychology', 'feelings']
        }
        
        search_text = f"{title} {content_text}".lower()
        
        for pillar, keywords in pillar_keywords.items():
            for keyword in keywords:
                if keyword.lower() in search_text:
                    if any(t['pillar'] == pillar for t in topics):
                        continue
                    topics.append({
                        'pillar': pillar,
                        'confidence': 0.7,  # Placeholder - would be based on actual NLP
                        'detected_keywords': [keyword]
                    })
        
        return topics
    
    def _extract_date_info(self, content: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract date information from content."""
        # Check if date already exists in metadata
        base_metadata = content.get('metadata', {})
        if 'date' in base_metadata:
            return base_metadata['date']
            
        # Extract from filename if possible
        if 'source_file' in base_metadata:
            file_path = base_metadata['source_file']
            # Simple date extraction from filename (e.g., 2025-05-04)
            import re
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', file_path)
            if date_match:
                return {
                    'date_str': date_match.group(1),
                    'source': 'filename'
                }
        
        return None
    
    def _extract_people_info(self, content: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract information about people mentioned in the content."""
        people = []
        
        # Extract speakers if available
        if 'speakers' in content:
            for speaker in content['speakers']:
                people.append({
                    'name': speaker,
                    'role': 'speaker'
                })
                
        # Extract from content - simple name detection
        # This would be enhanced with NLP for named entity recognition
        content_text = content.get('content', '')
        common_names = ['Tina', 'Mark', 'Maria', 'Dan', 'Chris', 'Patrick', 'Seth', 'Laura']
        
        for name in common_names:
            if f" {name} " in f" {content_text} ":
                if not any(p['name'] == name for p in people):
                    people.append({
                        'name': name,
                        'role': 'mentioned'
                    })
        
        return people


def main():
    """Example usage of the content processing modules."""
    processor = ContentProcessor()
    normalizer = ContentNormalizer()
    metadata_extractor = MetadataExtractor()
    
    # Process a directory of content
    try:
        content_items = processor.process_directory()
        logger.info(f"Processed {len(content_items)} content items")
        
        # Normalize and extract metadata
        normalized_items = []
        for item in content_items:
            normalized = normalizer.normalize(item)
            normalized['metadata'] = metadata_extractor.extract_metadata(normalized)
            normalized_items.append(normalized)
            
        logger.info(f"Normalized {len(normalized_items)} content items")
        
        # Example: Save the first item to a file
        if normalized_items:
            sample_file = os.path.join(os.path.dirname(processor.content_dir), 'sample_processed.json')
            with open(sample_file, 'w', encoding='utf-8') as f:
                json.dump(normalized_items[0], f, indent=2)
            logger.info(f"Saved sample processed item to {sample_file}")
            
    except Exception as e:
        logger.error(f"Error in main processing: {str(e)}")
        raise


if __name__ == "__main__":
    main()