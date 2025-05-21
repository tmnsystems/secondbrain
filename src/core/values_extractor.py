"""
SecondBrain Values Extractor Module

This module extracts value statements from content - the principles and priorities
that guide decision-making, both explicit and implicit. It captures what is presented
as important or unimportant, revealing the holistic philosophy underlying the teaching.
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


class ValueStatement:
    """Represents a value statement found in content."""
    
    def __init__(self, statement: str, value_type: str, context: str, 
                 position: Dict[str, Any], content_id: str, 
                 valence: str = 'positive', strength: float = 1.0):
        """
        Initialize a value statement.
        
        Args:
            statement: The value statement text
            value_type: Category or type of value (e.g., freedom, authenticity)
            context: Surrounding context for the statement
            position: Location information in the content
            content_id: ID of the content containing the statement
            valence: Whether the value is framed positively or negatively
            strength: Strength or emphasis of the value (0.0 to 1.0)
        """
        self.statement = statement
        self.value_type = value_type
        self.context = context
        self.position = position
        self.content_id = content_id
        self.valence = valence  # 'positive', 'negative', or 'neutral'
        self.strength = strength  # 0.0 to 1.0
        self.value_id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate a unique ID for this value statement."""
        import hashlib
        text_hash = hashlib.md5(self.statement.encode()).hexdigest()[:8]
        return f"{self.content_id}_{text_hash}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'value_id': self.value_id,
            'statement': self.statement,
            'value_type': self.value_type,
            'context': self.context,
            'position': self.position,
            'content_id': self.content_id,
            'valence': self.valence,
            'strength': self.strength
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValueStatement':
        """Create from dictionary representation."""
        statement = cls(
            statement=data['statement'],
            value_type=data['value_type'],
            context=data['context'],
            position=data['position'],
            content_id=data['content_id'],
            valence=data.get('valence', 'positive'),
            strength=data.get('strength', 1.0)
        )
        statement.value_id = data['value_id']
        return statement


class ValuesExtractor:
    """Extracts value statements from content."""
    
    def __init__(self, anthropic_api_key: Optional[str] = None,
                 openai_api_key: Optional[str] = None):
        """
        Initialize the values extractor.
        
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
                logger.info("Initialized Anthropic client for values extraction")
            except Exception as e:
                logger.error(f"Error initializing Anthropic client: {str(e)}")
        
        if OPENAI_AVAILABLE and (openai_api_key or os.environ.get('OPENAI_API_KEY')):
            try:
                self.openai_client = OpenAI(
                    api_key=openai_api_key or os.environ.get('OPENAI_API_KEY')
                )
                logger.info("Initialized OpenAI client for values extraction")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {str(e)}")
        
        # Initialize value indicators
        self.value_indicators = {
            'importance_indicators': [
                r'what( really)? matters( most)?',
                r'important',
                r'essential',
                r'critical',
                r'key',
                r'crucial',
                r'vital',
                r'significant',
                r'valuable',
                r'cornerstone',
                r'foundation',
                r'priority',
                r'priorities',
                r'principles',
                r'values',
                r'what I care about',
                r'what you should care about'
            ],
            'unimportance_indicators': [
                r'doesn\'t matter',
                r'not important',
                r'less important',
                r'overrated',
                r'waste of time',
                r'distraction',
                r'nobody cares',
                r'nobody actually cares',
                r'shouldn\'t worry about',
                r'doesn\'t actually matter',
                r'not worth',
                r'doesn\'t count',
                r'irrelevant'
            ],
            'should_indicators': [
                r'should',
                r'must',
                r'need to',
                r'have to',
                r'ought to',
                r'better',
                r'important to'
            ],
            'value_categories': {
                'freedom': [
                    r'freedom', r'autonomy', r'independence', r'flexibility', 
                    r'liberation', r'choice', r'options', r'constraints',
                    r'free'
                ],
                'authenticity': [
                    r'authentic', r'real', r'genuine', r'true to yourself',
                    r'integrity', r'aligned', r'congruent', r'honest'
                ],
                'quality_of_life': [
                    r'quality of life', r'lifestyle', r'well-being', r'happiness',
                    r'fulfillment', r'joy', r'satisfaction', r'balance',
                    r'enjoying', r'enjoy'
                ],
                'financial_success': [
                    r'money', r'profit', r'revenue', r'income', r'wealth',
                    r'financial', r'earnings', r'profitable', r'cash'
                ],
                'time': [
                    r'time', r'hours', r'schedule', r'calendar', r'availability',
                    r'present', r'now', r'attention', r'focus'
                ],
                'relationships': [
                    r'relationship', r'connection', r'people', r'network',
                    r'family', r'friends', r'clients', r'community'
                ],
                'growth': [
                    r'growth', r'learn', r'develop', r'improve', r'progress',
                    r'evolve', r'better', r'advancement', r'transformation'
                ],
                'impact': [
                    r'impact', r'difference', r'contribution', r'legacy', r'change',
                    r'influence', r'effect', r'results', r'outcome'
                ]
            }
        }
    
    def extract_values(self, content: Dict[str, Any], ai_assist: bool = True) -> Dict[str, Any]:
        """
        Extract value statements from content.
        
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
            return self._extract_values_ai(content)
        else:
            # Use rules-based extraction as fallback
            return self._extract_values_rules(content)
    
    def _extract_values_rules(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract values using rules-based approach.
        
        Args:
            content: Content dictionary
            
        Returns:
            Dictionary of extraction results
        """
        content_text = content.get('content', '')
        content_id = content.get('id', 'unknown')
        
        # Split into paragraphs for context
        paragraphs = content_text.split('\n\n')
        
        values = []
        
        # Scan paragraphs for value indicators
        for i, para in enumerate(paragraphs):
            # Check for importance indicators
            for indicator in self.value_indicators['importance_indicators']:
                matches = re.finditer(indicator, para, re.IGNORECASE)
                for match in matches:
                    # Extract the sentence containing the value statement
                    start_pos = max(0, para.rfind('.', 0, match.start()) + 1)
                    end_pos = para.find('.', match.end())
                    if end_pos == -1:
                        end_pos = len(para)
                    
                    sentence = para[start_pos:end_pos].strip()
                    
                    # Skip if too short
                    if len(sentence) < 15:
                        continue
                    
                    # Determine value category
                    value_type = self._identify_value_type(sentence)
                    
                    # Determine valence (positive, negative, neutral)
                    valence = self._determine_valence(sentence)
                    
                    # Estimate strength
                    strength = self._estimate_strength(sentence)
                    
                    value = ValueStatement(
                        statement=sentence,
                        value_type=value_type,
                        context=para[:100] + "..." if len(para) > 100 else para,
                        position={
                            'paragraph': i,
                            'sentence_start': start_pos,
                            'sentence_end': end_pos
                        },
                        content_id=content_id,
                        valence=valence,
                        strength=strength
                    )
                    
                    values.append(value)
            
            # Check for unimportance indicators
            for indicator in self.value_indicators['unimportance_indicators']:
                matches = re.finditer(indicator, para, re.IGNORECASE)
                for match in matches:
                    # Extract the sentence containing the value statement
                    start_pos = max(0, para.rfind('.', 0, match.start()) + 1)
                    end_pos = para.find('.', match.end())
                    if end_pos == -1:
                        end_pos = len(para)
                    
                    sentence = para[start_pos:end_pos].strip()
                    
                    # Skip if too short
                    if len(sentence) < 15:
                        continue
                    
                    # Determine value category (what is being dismissed)
                    value_type = self._identify_value_type(sentence)
                    
                    value = ValueStatement(
                        statement=sentence,
                        value_type=value_type,
                        context=para[:100] + "..." if len(para) > 100 else para,
                        position={
                            'paragraph': i,
                            'sentence_start': start_pos,
                            'sentence_end': end_pos
                        },
                        content_id=content_id,
                        valence='negative',
                        strength=0.8  # Generally strong when dismissing something
                    )
                    
                    values.append(value)
            
            # Check for should indicators (normative statements)
            for indicator in self.value_indicators['should_indicators']:
                matches = re.finditer(r'\b' + indicator + r'\b', para, re.IGNORECASE)
                for match in matches:
                    # Extract the sentence containing the value statement
                    start_pos = max(0, para.rfind('.', 0, match.start()) + 1)
                    end_pos = para.find('.', match.end())
                    if end_pos == -1:
                        end_pos = len(para)
                    
                    sentence = para[start_pos:end_pos].strip()
                    
                    # Skip if too short or not containing a clear value
                    if len(sentence) < 20 or not self._contains_value_indicator(sentence):
                        continue
                    
                    # Determine value category
                    value_type = self._identify_value_type(sentence)
                    
                    # Determine valence (positive, negative, neutral)
                    valence = self._determine_valence(sentence)
                    
                    # Estimate strength
                    strength = self._estimate_strength(sentence)
                    
                    value = ValueStatement(
                        statement=sentence,
                        value_type=value_type,
                        context=para[:100] + "..." if len(para) > 100 else para,
                        position={
                            'paragraph': i,
                            'sentence_start': start_pos,
                            'sentence_end': end_pos
                        },
                        content_id=content_id,
                        valence=valence,
                        strength=strength
                    )
                    
                    values.append(value)
        
        # Filter duplicates (same text)
        unique_values = []
        statements = set()
        for value in values:
            if value.statement not in statements:
                statements.add(value.statement)
                unique_values.append(value)
        
        # Prepare result with value statements converted to dictionaries
        value_statements = [value.to_dict() for value in unique_values]
        
        # Compute value summary
        value_summary = self._summarize_values(unique_values)
        
        result = {
            'content_id': content_id,
            'value_statements': value_statements,
            'count': len(value_statements),
            'value_summary': value_summary
        }
        
        return result
    
    def _contains_value_indicator(self, text: str) -> bool:
        """Check if text contains indicators of values."""
        text_lower = text.lower()
        
        # Check for value category keywords
        for category, keywords in self.value_indicators['value_categories'].items():
            if any(re.search(r'\b' + keyword + r'\b', text_lower) for keyword in keywords):
                return True
        
        # Check for importance indicators
        for indicator in self.value_indicators['importance_indicators']:
            if re.search(indicator, text_lower):
                return True
        
        return False
    
    def _identify_value_type(self, text: str) -> str:
        """Identify the type or category of a value statement."""
        text_lower = text.lower()
        
        # Check each value category for keywords
        category_scores = {}
        for category, keywords in self.value_indicators['value_categories'].items():
            score = sum(1 for keyword in keywords if re.search(r'\b' + keyword + r'\b', text_lower))
            if score > 0:
                category_scores[category] = score
        
        # Return the category with the highest score, or 'other' if none found
        if category_scores:
            return max(category_scores.items(), key=lambda x: x[1])[0]
        else:
            return 'other'
    
    def _determine_valence(self, text: str) -> str:
        """Determine the valence (positive, negative, neutral) of a value statement."""
        text_lower = text.lower()
        
        # Check for negative markers
        negative_markers = [
            r'not', r'don\'t', r'doesn\'t', r'isn\'t', r'aren\'t', r'won\'t',
            r'never', r'no one', r'nobody', r'nothing', r'nowhere', r'neither',
            r'barely', r'hardly', r'rarely', r'seldom'
        ]
        
        negative_count = sum(1 for marker in negative_markers if re.search(r'\b' + marker + r'\b', text_lower))
        
        # Check for dismissive indicators
        for indicator in self.value_indicators['unimportance_indicators']:
            if re.search(indicator, text_lower):
                return 'negative'
        
        # Even number of negatives cancel out, odd number means statement is negative
        if negative_count % 2 == 1:
            return 'negative'
        
        # Check for positive markers
        positive_markers = [
            r'important', r'essential', r'critical', r'key', r'crucial',
            r'vital', r'significant', r'valuable', r'better', r'best',
            r'good', r'great', r'excellent', r'amazing', r'wonderful'
        ]
        
        for marker in positive_markers:
            if re.search(r'\b' + marker + r'\b', text_lower):
                return 'positive'
        
        # Default to neutral if no clear indicators
        return 'neutral'
    
    def _estimate_strength(self, text: str) -> float:
        """Estimate the strength or emphasis of a value statement (0.0 to 1.0)."""
        text_lower = text.lower()
        
        # Check for strength amplifiers
        amplifiers = [
            r'very', r'extremely', r'incredibly', r'absolutely', r'definitely',
            r'certainly', r'always', r'must', r'essential', r'critical',
            r'crucial', r'vital', r'most', r'all', r'every', r'never'
        ]
        
        amplifier_count = sum(1 for amp in amplifiers if re.search(r'\b' + amp + r'\b', text_lower))
        
        # Check for mitigators
        mitigators = [
            r'somewhat', r'rather', r'quite', r'fairly', r'relatively',
            r'sometimes', r'occasionally', r'perhaps', r'maybe', r'possibly',
            r'could', r'might', r'can', r'should'
        ]
        
        mitigator_count = sum(1 for mit in mitigators if re.search(r'\b' + mit + r'\b', text_lower))
        
        # Base strength starts at middle (0.5)
        strength = 0.5
        
        # Add for amplifiers, subtract for mitigators
        strength += (amplifier_count * 0.1)
        strength -= (mitigator_count * 0.1)
        
        # Ensure within bounds
        return max(0.1, min(1.0, strength))
    
    def _summarize_values(self, values: List[ValueStatement]) -> Dict[str, Any]:
        """Create a summary of values from the list of value statements."""
        # Count by type
        type_counts = {}
        for value in values:
            value_type = value.value_type
            type_counts[value_type] = type_counts.get(value_type, 0) + 1
        
        # Count by valence
        valence_counts = {
            'positive': sum(1 for v in values if v.valence == 'positive'),
            'negative': sum(1 for v in values if v.valence == 'negative'),
            'neutral': sum(1 for v in values if v.valence == 'neutral')
        }
        
        # Calculate average strength
        avg_strength = sum(v.strength for v in values) / len(values) if values else 0
        
        # Find dominant value types
        dominant_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Find strongest values
        strongest_values = sorted(values, key=lambda v: v.strength, reverse=True)[:3]
        strongest = [
            {
                'statement': v.statement,
                'value_type': v.value_type,
                'strength': v.strength,
                'valence': v.valence
            }
            for v in strongest_values
        ]
        
        return {
            'type_counts': type_counts,
            'valence_counts': valence_counts,
            'average_strength': avg_strength,
            'dominant_types': [t[0] for t in dominant_types],
            'strongest_values': strongest
        }
    
    def _extract_values_ai(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract values using AI-assisted approach.
        
        Args:
            content: Content dictionary
            
        Returns:
            Dictionary of extraction results
        """
        content_text = content.get('content', '')
        content_id = content.get('id', 'unknown')
        
        # Create prompt for value extraction
        prompt = f"""Analyze the following content and extract all statements about values, principles, and priorities. Focus on:

1. Explicit statements about what is important or should be prioritized 
2. Implicit values shown through what is emphasized or dismissed
3. Statements about what doesn't matter or is overrated
4. Claims about what should guide decision-making
5. Assertions about the right approach to business or life

For each value statement found, extract:
1. The complete sentence containing the value statement
2. The type of value (e.g., freedom, authenticity, quality of life, financial success, time, relationships, growth, impact, etc.)
3. Whether it's framed positively (something to value) or negatively (something to avoid valuing)
4. The relative strength or emphasis placed on the value (0.0-1.0 scale)

Pay special attention to holistic values that connect business success to broader life principles, as these reflect the author's core philosophy.

CONTENT:
{content_text[:4000]}  # Truncate to avoid token limits

Respond in JSON format:
```json
{{
  "value_statements": [
    {{
      "statement": "Complete sentence containing the value statement",
      "value_type": "Category of value",
      "valence": "positive/negative/neutral",
      "strength": 0.8,
      "context": "Brief surrounding context"
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
            logger.warning("No AI service available for value extraction")
            return self._extract_values_rules(content)
    
    def _extract_with_anthropic(self, prompt: str, content_id: str) -> Dict[str, Any]:
        """Extract values using Anthropic."""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0,
                system="You are an expert at identifying value statements and principles in teaching content. Extract explicit and implicit statements about what matters and what should guide decisions.",
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
                
                # Add positions based on statement information
                if 'value_statements' in result:
                    for i, statement in enumerate(result['value_statements']):
                        statement['position'] = {
                            'index': i,
                            'sentence_start': 0,
                            'sentence_end': 0
                        }
                        statement['content_id'] = content_id
                
                # Add summary
                value_statements = [
                    ValueStatement(
                        statement=s['statement'],
                        value_type=s['value_type'],
                        context=s.get('context', ''),
                        position=s['position'],
                        content_id=content_id,
                        valence=s.get('valence', 'positive'),
                        strength=s.get('strength', 1.0)
                    )
                    for s in result.get('value_statements', [])
                ]
                
                result['value_summary'] = self._summarize_values(value_statements)
                result['count'] = len(result.get('value_statements', []))
                result['content_id'] = content_id
                
                return result
            else:
                logger.error("Failed to extract JSON from Anthropic response")
                return {'content_id': content_id, 'error': 'Failed to extract JSON', 'value_statements': []}
                
        except Exception as e:
            logger.error(f"Error in Anthropic extraction: {str(e)}")
            return {'content_id': content_id, 'error': str(e), 'value_statements': []}
    
    def _extract_with_openai(self, prompt: str, content_id: str) -> Dict[str, Any]:
        """Extract values using OpenAI."""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                temperature=0,
                messages=[
                    {"role": "system", "content": "You are an expert at identifying value statements and principles in teaching content. Extract explicit and implicit statements about what matters and what should guide decisions."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract JSON from response
            content = response.choices[0].message.content
            json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
            
            if json_match:
                json_str = json_match.group(1)
                result = json.loads(json_str)
                
                # Add positions based on statement information
                if 'value_statements' in result:
                    for i, statement in enumerate(result['value_statements']):
                        statement['position'] = {
                            'index': i,
                            'sentence_start': 0,
                            'sentence_end': 0
                        }
                        statement['content_id'] = content_id
                
                # Add summary
                value_statements = [
                    ValueStatement(
                        statement=s['statement'],
                        value_type=s['value_type'],
                        context=s.get('context', ''),
                        position=s['position'],
                        content_id=content_id,
                        valence=s.get('valence', 'positive'),
                        strength=s.get('strength', 1.0)
                    )
                    for s in result.get('value_statements', [])
                ]
                
                result['value_summary'] = self._summarize_values(value_statements)
                result['count'] = len(result.get('value_statements', []))
                result['content_id'] = content_id
                
                return result
            else:
                logger.error("Failed to extract JSON from OpenAI response")
                return {'content_id': content_id, 'error': 'Failed to extract JSON', 'value_statements': []}
                
        except Exception as e:
            logger.error(f"Error in OpenAI extraction: {str(e)}")
            return {'content_id': content_id, 'error': str(e), 'value_statements': []}


class ValuesRepository:
    """Repository for storing and retrieving value statements."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """
        Initialize the values repository.
        
        Args:
            repo_path: Path to the repository storage directory
        """
        self.repo_path = repo_path if repo_path else os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'data',
            'values'
        )
        
        # Create directory if it doesn't exist
        os.makedirs(self.repo_path, exist_ok=True)
        
        # Initialize values dictionary
        self.values = {}
        
        # Load values
        self._load_values()
    
    def _load_values(self):
        """Load values from repository."""
        try:
            for content_id_dir in os.listdir(self.repo_path):
                content_dir_path = os.path.join(self.repo_path, content_id_dir)
                if os.path.isdir(content_dir_path):
                    self.values[content_id_dir] = []
                    
                    value_files = list(Path(content_dir_path).glob('*.json'))
                    for file_path in value_files:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            value_data = json.load(f)
                            if 'value_statements' in value_data:
                                # Handle extraction results format
                                self.values[content_id_dir].extend(value_data['value_statements'])
                            else:
                                # Handle individual value statement
                                self.values[content_id_dir].append(value_data)
            
            # Count total values
            total_values = sum(len(values) for values in self.values.values())
            logger.info(f"Loaded {total_values} value statements from {len(self.values)} content items")
        except Exception as e:
            logger.error(f"Error loading values: {str(e)}")
    
    def get_values_by_content(self, content_id: str) -> List[Dict[str, Any]]:
        """
        Get all value statements for a specific content item.
        
        Args:
            content_id: ID of content to get values for
            
        Returns:
            List of value statements
        """
        return self.values.get(content_id, [])
    
    def get_values_by_type(self, value_type: str) -> List[Dict[str, Any]]:
        """
        Get all value statements of a specific type.
        
        Args:
            value_type: Type of values to get
            
        Returns:
            List of value statements
        """
        all_values = []
        
        for content_values in self.values.values():
            for value in content_values:
                if value.get('value_type', '') == value_type:
                    all_values.append(value)
        
        return all_values
    
    def get_values_by_valence(self, valence: str) -> List[Dict[str, Any]]:
        """
        Get all value statements with a specific valence.
        
        Args:
            valence: Valence to filter by (positive, negative, neutral)
            
        Returns:
            List of value statements
        """
        all_values = []
        
        for content_values in self.values.values():
            for value in content_values:
                if value.get('valence', '') == valence:
                    all_values.append(value)
        
        return all_values
    
    def get_strongest_values(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the strongest value statements.
        
        Args:
            limit: Maximum number of statements to return
            
        Returns:
            List of strongest value statements
        """
        all_values = []
        
        for content_values in self.values.values():
            all_values.extend(content_values)
        
        # Sort by strength (descending)
        sorted_values = sorted(all_values, key=lambda v: v.get('strength', 0), reverse=True)
        
        return sorted_values[:limit]
    
    def save_values(self, extraction_results: Dict[str, Any]) -> int:
        """
        Save value statements from extraction results.
        
        Args:
            extraction_results: Results from value extraction
            
        Returns:
            Number of value statements saved
        """
        try:
            content_id = extraction_results.get('content_id', 'unknown')
            value_statements = extraction_results.get('value_statements', [])
            
            if not value_statements:
                logger.warning(f"No value statements to save for content {content_id}")
                return 0
            
            # Create content directory if it doesn't exist
            content_dir = os.path.join(self.repo_path, content_id)
            os.makedirs(content_dir, exist_ok=True)
            
            # Save extraction results
            results_path = os.path.join(content_dir, f"values_extraction.json")
            with open(results_path, 'w', encoding='utf-8') as f:
                json.dump(extraction_results, f, indent=2)
            
            # Update in-memory dictionary
            self.values[content_id] = value_statements
            
            logger.info(f"Saved {len(value_statements)} value statements for content {content_id}")
            return len(value_statements)
        except Exception as e:
            logger.error(f"Error saving value statements: {str(e)}")
            return 0
    
    def delete_values_by_content(self, content_id: str) -> bool:
        """
        Delete all value statements for a specific content item.
        
        Args:
            content_id: ID of content to delete values for
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            # Check if content exists in repository
            if content_id not in self.values:
                logger.warning(f"No value statements found for content {content_id}")
                return False
            
            # Delete directory
            content_dir = os.path.join(self.repo_path, content_id)
            if os.path.exists(content_dir):
                import shutil
                shutil.rmtree(content_dir)
            
            # Remove from in-memory dictionary
            del self.values[content_id]
            
            logger.info(f"Deleted value statements for content {content_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting value statements for content {content_id}: {str(e)}")
            return False


def main():
    """Example usage of the values extractor."""
    import glob
    from pathlib import Path
    import sys
    
    # Get content path from command line if provided
    content_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Setup
    extractor = ValuesExtractor()
    repository = ValuesRepository()
    
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
                
                # Extract values
                results = extractor.extract_values(content)
                
                # Store values
                count = repository.save_values(results)
                print(f"Extracted and stored {count} value statements")
                
                # Print summary
                value_summary = results.get('value_summary', {})
                if 'dominant_types' in value_summary:
                    print("Dominant value types:")
                    for value_type in value_summary['dominant_types']:
                        print(f"- {value_type}")
                
                # Print example values
                print("\nExample value statements:")
                for i, value in enumerate(results.get('value_statements', [])[:3]):
                    print(f"{i+1}. [{value.get('value_type')}] {value.get('statement', '')[:100]}...")
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
                
                # Extract values
                results = extractor.extract_values(content)
                
                # Store values
                count = repository.save_values(results)
                print(f"  Extracted and stored {count} value statements")
                
                # Print summary
                value_summary = results.get('value_summary', {})
                if 'dominant_types' in value_summary:
                    print("  Dominant value types:")
                    for value_type in value_summary['dominant_types']:
                        print(f"  - {value_type}")
    
    except Exception as e:
        print(f"Error in main processing: {str(e)}")
        raise


if __name__ == "__main__":
    main()