"""
SecondBrain Metaphor and Analogy Extractor Module

This module extracts metaphors and analogies from content, identifying
both business and life-based comparisons that make complex concepts
accessible. It captures the holistic approach where life principles
are connected to business concepts.
"""

import os
import json
import logging
import re
from typing import Dict, List, Optional, Union, Any, Tuple
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import optional dependencies for AI-assisted extraction
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic not available. Install with: pip install anthropic")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available. Install with: pip install openai")


class MetaphorExtractor:
    """Extracts metaphors and analogies from content."""
    
    def __init__(self, anthropic_api_key: Optional[str] = None,
                 openai_api_key: Optional[str] = None):
        """
        Initialize the metaphor extractor.
        
        Args:
            anthropic_api_key: Optional Anthropic API key for AI-assisted extraction
            openai_api_key: Optional OpenAI API key for AI-assisted extraction
        """
        # Set up AI clients if available
        self.anthropic_client = None
        self.openai_client = None
        
        if ANTHROPIC_AVAILABLE and (anthropic_api_key or os.environ.get('ANTHROPIC_API_KEY')):
            try:
                self.anthropic_client = anthropic.Anthropic(
                    api_key=anthropic_api_key or os.environ.get('ANTHROPIC_API_KEY')
                )
                logger.info("Initialized Anthropic client for metaphor extraction")
            except Exception as e:
                logger.error(f"Error initializing Anthropic client: {str(e)}")
        
        if OPENAI_AVAILABLE and (openai_api_key or os.environ.get('OPENAI_API_KEY')):
            try:
                self.openai_client = OpenAI(
                    api_key=openai_api_key or os.environ.get('OPENAI_API_KEY')
                )
                logger.info("Initialized OpenAI client for metaphor extraction")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {str(e)}")
        
        # Initialize metaphor indicators
        self.metaphor_indicators = [
            r'like a', r'like an', r'similar to', r'as if', r'imagine',
            r'think of it as', r'picture', r'it\'s like', r'it is like',
            r'comparable to', r'resembles', r'just as', r'same way that',
            r'think about', r'visualize', r'consider'
        ]
        
        # Initialize common analogy patterns
        self.analogy_patterns = [
            # Object-based analogies
            r'business is (like )?a[n]? (\w+)',
            r'your (\w+) is (like )?a[n]? (\w+)',
            r'think of your (\w+) as a[n]? (\w+)',
            
            # Process-based analogies
            r'(just like|similar to) how (\w+)',
            r'the same way that (\w+)',
            r'it\'s no different than (\w+)',
            
            # "Big rocks" and similar known analogies
            r'big rocks',
            r'jar (with|of) rocks',
            r'plate spinning',
            r'wearing( many)? hats',
            r'building blocks',
            r'foundation',
            r'journey',
            r'marathon, not a sprint'
        ]
        
        # Common domains for analogies
        self.analogy_domains = {
            'nature': ['tree', 'river', 'mountain', 'garden', 'seed', 'grow', 'ecosystem', 'forest'],
            'sports': ['game', 'team', 'coach', 'player', 'score', 'win', 'race', 'marathon', 'sprint'],
            'cooking': ['recipe', 'ingredient', 'cook', 'kitchen', 'bake', 'flavor', 'taste'],
            'building': ['foundation', 'blueprint', 'construct', 'architect', 'building', 'structure'],
            'journey': ['path', 'road', 'journey', 'destination', 'map', 'compass', 'guide'],
            'vehicle': ['car', 'engine', 'driver', 'wheel', 'fuel', 'vehicle', 'accelerator'],
            'health': ['muscle', 'body', 'exercise', 'health', 'doctor', 'diagnosis', 'prescription'],
            'relationships': ['marriage', 'dating', 'parent', 'child', 'family', 'partner', 'relationship'],
            'education': ['learn', 'student', 'teacher', 'lesson', 'classroom', 'school', 'education']
        }
    
    def extract_metaphors(self, content: Dict[str, Any], ai_assist: bool = True) -> Dict[str, Any]:
        """
        Extract metaphors and analogies from content.
        
        Args:
            content: Content dictionary
            ai_assist: Whether to use AI for enhanced extraction
            
        Returns:
            Dictionary of extraction results
        """
        content_text = content.get('content', '')
        if not content_text:
            return {'error': 'No content to analyze'}
        
        if ai_assist and (self.anthropic_client or self.openai_client):
            # Use AI-assisted extraction for better accuracy
            return self._extract_metaphors_ai(content)
        else:
            # Use rules-based extraction as fallback
            return self._extract_metaphors_rules(content)
    
    def _extract_metaphors_rules(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract metaphors using rules-based approach.
        
        Args:
            content: Content dictionary
            
        Returns:
            Dictionary of extraction results
        """
        content_text = content.get('content', '')
        content_id = content.get('id', 'unknown')
        
        # Split into paragraphs for context
        paragraphs = content_text.split('\n\n')
        
        metaphors = []
        
        # Scan paragraphs for metaphor indicators
        for i, para in enumerate(paragraphs):
            # Check for metaphor indicators
            for indicator in self.metaphor_indicators:
                matches = re.finditer(indicator, para, re.IGNORECASE)
                for match in matches:
                    # Extract the sentence containing the metaphor
                    start_pos = max(0, para.rfind('.', 0, match.start()) + 1)
                    end_pos = para.find('.', match.end())
                    if end_pos == -1:
                        end_pos = len(para)
                    
                    sentence = para[start_pos:end_pos].strip()
                    
                    # Skip if too short
                    if len(sentence) < 20:
                        continue
                    
                    # Determine domain (category)
                    domain = self._identify_domain(sentence)
                    
                    metaphor = {
                        'text': sentence,
                        'indicator': match.group(0),
                        'position': {
                            'paragraph': i,
                            'sentence_start': start_pos,
                            'sentence_end': end_pos
                        },
                        'category': domain,
                        'context': para[:100] + "..." if len(para) > 100 else para
                    }
                    
                    metaphors.append(metaphor)
            
            # Check for common analogy patterns
            for pattern in self.analogy_patterns:
                matches = re.finditer(pattern, para, re.IGNORECASE)
                for match in matches:
                    # Extract the sentence containing the analogy
                    start_pos = max(0, para.rfind('.', 0, match.start()) + 1)
                    end_pos = para.find('.', match.end())
                    if end_pos == -1:
                        end_pos = len(para)
                    
                    sentence = para[start_pos:end_pos].strip()
                    
                    # Skip if too short or already captured
                    if len(sentence) < 20 or any(m['text'] == sentence for m in metaphors):
                        continue
                    
                    # Determine domain (category)
                    domain = self._identify_domain(sentence)
                    
                    analogy = {
                        'text': sentence,
                        'pattern': pattern,
                        'position': {
                            'paragraph': i,
                            'sentence_start': start_pos,
                            'sentence_end': end_pos
                        },
                        'category': domain,
                        'context': para[:100] + "..." if len(para) > 100 else para
                    }
                    
                    metaphors.append(analogy)
        
        # Prepare result
        result = {
            'content_id': content_id,
            'metaphors': metaphors,
            'count': len(metaphors),
            'domains': self._summarize_domains(metaphors)
        }
        
        return result
    
    def _identify_domain(self, text: str) -> str:
        """Identify the domain or category of a metaphor/analogy."""
        text_lower = text.lower()
        
        # Check each domain for keywords
        domain_scores = {}
        for domain, keywords in self.analogy_domains.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                domain_scores[domain] = score
        
        # Return the domain with the highest score, or 'other' if none found
        if domain_scores:
            return max(domain_scores.items(), key=lambda x: x[1])[0]
        else:
            return 'other'
    
    def _summarize_domains(self, metaphors: List[Dict[str, Any]]) -> Dict[str, int]:
        """Summarize domains used in metaphors."""
        domains = {}
        for metaphor in metaphors:
            domain = metaphor.get('category', 'other')
            domains[domain] = domains.get(domain, 0) + 1
        
        return domains
    
    def _extract_metaphors_ai(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract metaphors using AI-assisted approach.
        
        Args:
            content: Content dictionary
            
        Returns:
            Dictionary of extraction results
        """
        content_text = content.get('content', '')
        content_id = content.get('id', 'unknown')
        
        # Create prompt for metaphor extraction
        prompt = f"""Analyze the following content and extract all metaphors, analogies, and comparisons used to explain concepts. Focus on both business-specific analogies and life-based comparisons that connect business concepts to everyday experiences.

For each metaphor or analogy found, extract:
1. The complete sentence or passage containing the metaphor
2. The concept being explained (what the metaphor helps understand)
3. The domain or category of the metaphor (e.g., nature, sports, building, relationships, etc.)
4. The emotional resonance or accessibility it provides

Pay special attention to holistic metaphors that connect business principles to broader life contexts, as these are core to the author's teaching style.

CONTENT:
{content_text[:4000]}  # Truncate to avoid token limits

Respond in JSON format:
```json
{{
  "metaphors": [
    {{
      "text": "Complete sentence or passage containing the metaphor",
      "concept_explained": "The business concept being explained",
      "domain": "Category of the metaphor",
      "emotional_resonance": "How it connects emotionally or makes complex ideas accessible",
      "life_connection": true/false
    }}
  ]
}}
```
"""
        
        # Use available AI service
        if self.anthropic_client:
            return self._extract_with_anthropic(prompt, content_id)
        elif self.openai_client:
            return self._extract_with_openai(prompt, content_id)
        else:
            logger.warning("No AI service available for metaphor extraction")
            return self._extract_metaphors_rules(content)
    
    def _extract_with_anthropic(self, prompt: str, content_id: str) -> Dict[str, Any]:
        """Extract metaphors using Anthropic."""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0,
                system="You are an expert at identifying metaphors, analogies, and comparisons in teaching content. Extract all examples that connect complex business concepts to relatable, everyday experiences.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract JSON from response
            content = response.content[0].text
            json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
            
            if json_match:
                json_str = json_match.group(1)
                result = json.loads(json_str)
                
                # Add additional metadata
                if 'metaphors' in result:
                    domains = {}
                    life_connections = 0
                    
                    for metaphor in result['metaphors']:
                        domain = metaphor.get('domain', 'other')
                        domains[domain] = domains.get(domain, 0) + 1
                        
                        if metaphor.get('life_connection', False):
                            life_connections += 1
                    
                    result['domains'] = domains
                    result['life_connections'] = life_connections
                    result['count'] = len(result['metaphors'])
                
                result['content_id'] = content_id
                return result
            else:
                logger.error("Failed to extract JSON from Anthropic response")
                return {'content_id': content_id, 'error': 'Failed to extract JSON', 'metaphors': []}
                
        except Exception as e:
            logger.error(f"Error in Anthropic extraction: {str(e)}")
            return {'content_id': content_id, 'error': str(e), 'metaphors': []}
    
    def _extract_with_openai(self, prompt: str, content_id: str) -> Dict[str, Any]:
        """Extract metaphors using OpenAI."""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                temperature=0,
                messages=[
                    {"role": "system", "content": "You are an expert at identifying metaphors, analogies, and comparisons in teaching content. Extract all examples that connect complex business concepts to relatable, everyday experiences."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract JSON from response
            content = response.choices[0].message.content
            json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
            
            if json_match:
                json_str = json_match.group(1)
                result = json.loads(json_str)
                
                # Add additional metadata
                if 'metaphors' in result:
                    domains = {}
                    life_connections = 0
                    
                    for metaphor in result['metaphors']:
                        domain = metaphor.get('domain', 'other')
                        domains[domain] = domains.get(domain, 0) + 1
                        
                        if metaphor.get('life_connection', False):
                            life_connections += 1
                    
                    result['domains'] = domains
                    result['life_connections'] = life_connections
                    result['count'] = len(result['metaphors'])
                
                result['content_id'] = content_id
                return result
            else:
                logger.error("Failed to extract JSON from OpenAI response")
                return {'content_id': content_id, 'error': 'Failed to extract JSON', 'metaphors': []}
                
        except Exception as e:
            logger.error(f"Error in OpenAI extraction: {str(e)}")
            return {'content_id': content_id, 'error': str(e), 'metaphors': []}


class MetaphorRepository:
    """Repository for storing and retrieving metaphors and analogies."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """
        Initialize the metaphor repository.
        
        Args:
            repo_path: Path to the repository storage directory
        """
        self.repo_path = repo_path if repo_path else os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'data',
            'metaphors'
        )
        
        # Create directory if it doesn't exist
        os.makedirs(self.repo_path, exist_ok=True)
        
        # Initialize metaphors dictionary
        self.metaphors = {}
        
        # Load metaphors
        self._load_metaphors()
    
    def _load_metaphors(self):
        """Load metaphors from repository."""
        try:
            for content_id_dir in os.listdir(self.repo_path):
                content_dir_path = os.path.join(self.repo_path, content_id_dir)
                if os.path.isdir(content_dir_path):
                    self.metaphors[content_id_dir] = []
                    
                    metaphor_files = list(Path(content_dir_path).glob('*.json'))
                    for file_path in metaphor_files:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            metaphor = json.load(f)
                            self.metaphors[content_id_dir].append(metaphor)
            
            # Count total metaphors
            total_metaphors = sum(len(metaphors) for metaphors in self.metaphors.values())
            logger.info(f"Loaded {total_metaphors} metaphors from {len(self.metaphors)} content items")
        except Exception as e:
            logger.error(f"Error loading metaphors: {str(e)}")
    
    def get_metaphors_by_content(self, content_id: str) -> List[Dict[str, Any]]:
        """
        Get all metaphors for a specific content item.
        
        Args:
            content_id: ID of content to get metaphors for
            
        Returns:
            List of metaphors
        """
        return self.metaphors.get(content_id, [])
    
    def get_metaphors_by_domain(self, domain: str) -> List[Dict[str, Any]]:
        """
        Get all metaphors in a specific domain.
        
        Args:
            domain: Domain to get metaphors for
            
        Returns:
            List of metaphors
        """
        all_metaphors = []
        
        for content_metaphors in self.metaphors.values():
            for metaphor in content_metaphors:
                if metaphor.get('domain', '') == domain or metaphor.get('category', '') == domain:
                    all_metaphors.append(metaphor)
        
        return all_metaphors
    
    def get_metaphors_by_concept(self, concept: str) -> List[Dict[str, Any]]:
        """
        Get all metaphors explaining a specific concept.
        
        Args:
            concept: Concept to get metaphors for
            
        Returns:
            List of metaphors
        """
        all_metaphors = []
        
        for content_metaphors in self.metaphors.values():
            for metaphor in content_metaphors:
                # Check concept explained field if available
                if 'concept_explained' in metaphor and concept.lower() in metaphor['concept_explained'].lower():
                    all_metaphors.append(metaphor)
                # Otherwise check text for concept
                elif concept.lower() in metaphor.get('text', '').lower():
                    all_metaphors.append(metaphor)
        
        return all_metaphors
    
    def get_life_connected_metaphors(self) -> List[Dict[str, Any]]:
        """
        Get all metaphors with life connections.
        
        Returns:
            List of metaphors with life connections
        """
        all_metaphors = []
        
        for content_metaphors in self.metaphors.values():
            for metaphor in content_metaphors:
                if metaphor.get('life_connection', False):
                    all_metaphors.append(metaphor)
        
        return all_metaphors
    
    def save_metaphors(self, extraction_results: Dict[str, Any]) -> int:
        """
        Save metaphors from extraction results.
        
        Args:
            extraction_results: Results from metaphor extraction
            
        Returns:
            Number of metaphors saved
        """
        try:
            content_id = extraction_results.get('content_id', 'unknown')
            metaphors = extraction_results.get('metaphors', [])
            
            if not metaphors:
                logger.warning(f"No metaphors to save for content {content_id}")
                return 0
            
            # Create content directory if it doesn't exist
            content_dir = os.path.join(self.repo_path, content_id)
            os.makedirs(content_dir, exist_ok=True)
            
            # Delete existing metaphors for this content
            existing_files = list(Path(content_dir).glob('*.json'))
            for file_path in existing_files:
                os.remove(file_path)
            
            # Save new metaphors
            count = 0
            for i, metaphor in enumerate(metaphors):
                # Generate unique ID for metaphor
                import hashlib
                text_hash = hashlib.md5(metaphor.get('text', '').encode()).hexdigest()[:8]
                metaphor_id = f"{content_id}_{text_hash}"
                
                # Add metadata
                metaphor['metaphor_id'] = metaphor_id
                metaphor['content_id'] = content_id
                
                # Save to file
                file_path = os.path.join(content_dir, f"metaphor_{i+1}.json")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(metaphor, f, indent=2)
                
                count += 1
            
            # Update in-memory dictionary
            self.metaphors[content_id] = metaphors
            
            logger.info(f"Saved {count} metaphors for content {content_id}")
            return count
        except Exception as e:
            logger.error(f"Error saving metaphors: {str(e)}")
            return 0
    
    def delete_metaphors_by_content(self, content_id: str) -> bool:
        """
        Delete all metaphors for a specific content item.
        
        Args:
            content_id: ID of content to delete metaphors for
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            # Check if content exists in repository
            if content_id not in self.metaphors:
                logger.warning(f"No metaphors found for content {content_id}")
                return False
            
            # Delete directory
            content_dir = os.path.join(self.repo_path, content_id)
            if os.path.exists(content_dir):
                import shutil
                shutil.rmtree(content_dir)
            
            # Remove from in-memory dictionary
            del self.metaphors[content_id]
            
            logger.info(f"Deleted metaphors for content {content_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting metaphors for content {content_id}: {str(e)}")
            return False


def main():
    """Example usage of the metaphor extractor."""
    import glob
    from pathlib import Path
    import sys
    
    # Get content path from command line if provided
    content_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Setup
    extractor = MetaphorExtractor()
    repository = MetaphorRepository()
    
    try:
        # If specific content path provided
        if content_path:
            if os.path.isfile(content_path):
                print(f"Analyzing file: {content_path}")
                
                # Read content
                with open(content_path, 'r', encoding='utf-8') as f:
                    if content_path.endswith('.json'):
                        content = json.load(f)
                    else:
                        content = {'id': os.path.basename(content_path), 'content': f.read()}
                
                # Extract metaphors
                results = extractor.extract_metaphors(content)
                
                # Store metaphors
                count = repository.save_metaphors(results)
                print(f"Extracted and stored {count} metaphors")
                
                # Print summary
                domains = results.get('domains', {})
                print("Metaphor domains:")
                for domain, count in domains.items():
                    print(f"- {domain}: {count}")
                
                # Print example metaphors
                print("\nExample metaphors:")
                for i, metaphor in enumerate(results.get('metaphors', [])[:3]):
                    print(f"{i+1}. {metaphor.get('text', '')[:100]}...")
            else:
                print(f"File not found: {content_path}")
        else:
            # Process sample directory
            sample_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'processed_content'
            )
            
            sample_files = glob.glob(os.path.join(sample_dir, '*.json'))[:3]  # Process first 3 files
            
            if not sample_files:
                print("No sample files found")
                return
                
            print(f"Processing {len(sample_files)} sample files")
            
            # Process each file
            for file_path in sample_files:
                print(f"Processing {os.path.basename(file_path)}")
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        content = json.load(f)
                    except json.JSONDecodeError:
                        print(f"Error decoding JSON from {file_path}")
                        continue
                
                # Extract metaphors
                results = extractor.extract_metaphors(content)
                
                # Store metaphors
                count = repository.save_metaphors(results)
                print(f"  Extracted and stored {count} metaphors")
                
                # Print summary
                domains = results.get('domains', {})
                if domains:
                    print("  Metaphor domains:")
                    for domain, count in domains.items():
                        print(f"  - {domain}: {count}")
    
    except Exception as e:
        print(f"Error in main processing: {str(e)}")
        raise


if __name__ == "__main__":
    main()