"""
SecondBrain Framework Extractor Module

This module extracts teaching frameworks and patterns from content.
It identifies, extracts, and documents the structure and components
of various teaching frameworks used in the content.
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


class FrameworkDefinition:
    """Defines the structure and components of a teaching framework."""
    
    def __init__(self, framework_id: str, name: str, description: str, 
                 indicators: List[str], components: List[Dict[str, Any]]):
        """
        Initialize a framework definition.
        
        Args:
            framework_id: Unique identifier for the framework
            name: Human-readable name
            description: Description of the framework
            indicators: List of regex patterns indicating the framework's presence
            components: List of component definitions
        """
        self.framework_id = framework_id
        self.name = name
        self.description = description
        self.indicators = indicators
        self.components = components
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'framework_id': self.framework_id,
            'name': self.name,
            'description': self.description,
            'indicators': self.indicators,
            'components': self.components
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FrameworkDefinition':
        """Create from dictionary representation."""
        return cls(
            framework_id=data['framework_id'],
            name=data['name'],
            description=data['description'],
            indicators=data['indicators'],
            components=data['components']
        )


class FrameworkRepository:
    """Repository for storing and retrieving framework definitions."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """
        Initialize the framework repository.
        
        Args:
            repo_path: Path to the repository storage directory
        """
        self.repo_path = repo_path if repo_path else os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'data',
            'frameworks'
        )
        
        # Create directory if it doesn't exist
        os.makedirs(self.repo_path, exist_ok=True)
        
        # Initialize frameworks dictionary
        self.frameworks = {}
        
        # Load frameworks
        self._load_frameworks()
        
        # Define default frameworks if none were loaded
        if not self.frameworks:
            self._define_default_frameworks()
    
    def _load_frameworks(self):
        """Load frameworks from repository."""
        try:
            framework_files = list(Path(self.repo_path).glob('*.json'))
            for file_path in framework_files:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    framework = FrameworkDefinition.from_dict(data)
                    self.frameworks[framework.framework_id] = framework
            
            logger.info(f"Loaded {len(self.frameworks)} frameworks from repository")
        except Exception as e:
            logger.error(f"Error loading frameworks: {str(e)}")
    
    def _define_default_frameworks(self):
        """Define default frameworks."""
        # Define Value Ladder Framework
        value_ladder = FrameworkDefinition(
            framework_id="value_ladder",
            name="Value Ladder Framework",
            description="A pricing and offer structure that guides customers through increasingly valuable products/services.",
            indicators=[
                r"value ladder",
                r"lead magnet",
                r"tripwire",
                r"core offer",
                r"upsell"
            ],
            components=[
                {
                    "component_id": "free_content",
                    "name": "Free Content",
                    "description": "Content that demonstrates value without cost",
                    "indicators": [
                        r"lead magnet",
                        r"free",
                        r"opt-in",
                        r"give away"
                    ]
                },
                {
                    "component_id": "low_level_offer",
                    "name": "Low-Level Offer (Tripwire)",
                    "description": "Low-cost offer to convert prospects to customers",
                    "indicators": [
                        r"tripwire",
                        r"low cost",
                        r"\$\d+-\$20",
                        r"low level offer"
                    ]
                },
                {
                    "component_id": "core_offer",
                    "name": "Core Offer",
                    "description": "Main product or service that provides primary revenue",
                    "indicators": [
                        r"core offer",
                        r"main product",
                        r"primary service",
                        r"brings the majority of your income"
                    ]
                },
                {
                    "component_id": "upsell",
                    "name": "Upsell",
                    "description": "Higher-value offers for existing customers",
                    "indicators": [
                        r"upsell",
                        r"higher level",
                        r"premium offer",
                        r"additional service"
                    ]
                }
            ]
        )
        
        # Define Three-Tier Service Model
        three_tier_service = FrameworkDefinition(
            framework_id="three_tier_service",
            name="Three-Tier Service Model",
            description="A service structure with three distinct tiers targeting different client segments.",
            indicators=[
                r"three[ -]tier",
                r"high[ -]level tier",
                r"mid[ -]level tier",
                r"entry[ -]level"
            ],
            components=[
                {
                    "component_id": "high_tier",
                    "name": "High-End Tier",
                    "description": "Premium, high-touch service for a small number of clients",
                    "indicators": [
                        r"high[ -]level tier",
                        r"premium",
                        r"high[ -]touch",
                        r"VIP"
                    ]
                },
                {
                    "component_id": "mid_tier",
                    "name": "Mid-Range Tier",
                    "description": "Core service offering for the majority of clients",
                    "indicators": [
                        r"mid[ -]level tier",
                        r"middle tier",
                        r"core service",
                        r"group program"
                    ]
                },
                {
                    "component_id": "low_tier",
                    "name": "Entry-Level Tier",
                    "description": "Accessible, scalable offering for a larger audience",
                    "indicators": [
                        r"entry[ -]level",
                        r"low[ -]level tier",
                        r"scalable",
                        r"digital product"
                    ]
                }
            ]
        )
        
        # Define 10% Rule Framework
        ten_percent_rule = FrameworkDefinition(
            framework_id="ten_percent_rule",
            name="10% Rule Framework",
            description="A pricing strategy that involves adding 10% to your comfort zone price.",
            indicators=[
                r"10%[ ]rule",
                r"ten percent",
                r"highest price",
                r"add 10%"
            ],
            components=[
                {
                    "component_id": "current_price",
                    "name": "Current Price Assessment",
                    "description": "Evaluation of current pricing",
                    "indicators": [
                        r"current price",
                        r"charging now",
                        r"comfort zone"
                    ]
                },
                {
                    "component_id": "comfort_zone",
                    "name": "Comfort Zone Identification",
                    "description": "Identifying maximum comfortable price",
                    "indicators": [
                        r"comfortable with",
                        r"highest price you're comfortable",
                        r"comfort zone"
                    ]
                },
                {
                    "component_id": "price_increase",
                    "name": "Price Increase",
                    "description": "Adding 10% to the comfortable price",
                    "indicators": [
                        r"add 10%",
                        r"increase by 10%",
                        r"ten percent more"
                    ]
                },
                {
                    "component_id": "market_testing",
                    "name": "Market Testing",
                    "description": "Testing the new price in the market",
                    "indicators": [
                        r"see if you get pushback",
                        r"let the market tell you",
                        r"until you stop getting conversions"
                    ]
                }
            ]
        )
        
        # Define Profit First Framework
        profit_first = FrameworkDefinition(
            framework_id="profit_first",
            name="Profit First Framework",
            description="A financial management approach that prioritizes profit allocations before expenses.",
            indicators=[
                r"profit first",
                r"income account",
                r"profit account",
                r"tax account",
                r"operating expense"
            ],
            components=[
                {
                    "component_id": "income_allocation",
                    "name": "Income Allocation",
                    "description": "Process of dividing income into specific accounts",
                    "indicators": [
                        r"allocate percentages",
                        r"divide income",
                        r"distribute revenue"
                    ]
                },
                {
                    "component_id": "profit_percentage",
                    "name": "Profit Percentage",
                    "description": "Percentage of income allocated to profit",
                    "indicators": [
                        r"profit percentage",
                        r"5%",
                        r"profit allocation"
                    ]
                },
                {
                    "component_id": "tax_percentage",
                    "name": "Tax Percentage",
                    "description": "Percentage of income allocated to taxes",
                    "indicators": [
                        r"tax percentage",
                        r"15%",
                        r"tax allocation"
                    ]
                },
                {
                    "component_id": "expense_percentage",
                    "name": "Expense Percentage",
                    "description": "Percentage of income allocated to operating expenses",
                    "indicators": [
                        r"expense percentage",
                        r"80%",
                        r"operating expenses"
                    ]
                }
            ]
        )
        
        # Define Effective Hourly Rate Framework
        effective_hourly_rate = FrameworkDefinition(
            framework_id="effective_hourly_rate",
            name="Effective Hourly Rate Framework",
            description="A calculation method to determine true hourly compensation for project work.",
            indicators=[
                r"effective hourly rate",
                r"hourly rate",
                r"project fee",
                r"hours spent"
            ],
            components=[
                {
                    "component_id": "calculation",
                    "name": "EHR Calculation",
                    "description": "Formula for calculating effective hourly rate",
                    "indicators": [
                        r"divide",
                        r"project fee.*hours",
                        r"total fee.*time"
                    ]
                },
                {
                    "component_id": "interpretation",
                    "name": "Result Interpretation",
                    "description": "Understanding what the EHR means for your business",
                    "indicators": [
                        r"shows you",
                        r"real hourly rate",
                        r"actual hourly rate"
                    ]
                },
                {
                    "component_id": "optimization",
                    "name": "Rate Optimization",
                    "description": "Strategies to improve effective hourly rate",
                    "indicators": [
                        r"increase your EHR",
                        r"charge more",
                        r"work faster",
                        r"optimize"
                    ]
                }
            ]
        )
        
        # Add frameworks to repository
        self.frameworks["value_ladder"] = value_ladder
        self.frameworks["three_tier_service"] = three_tier_service
        self.frameworks["ten_percent_rule"] = ten_percent_rule
        self.frameworks["profit_first"] = profit_first
        self.frameworks["effective_hourly_rate"] = effective_hourly_rate
        
        # Save frameworks to disk
        for framework in self.frameworks.values():
            self.save_framework(framework)
            
        logger.info(f"Defined {len(self.frameworks)} default frameworks")
    
    def get_framework(self, framework_id: str) -> Optional[FrameworkDefinition]:
        """
        Get a framework definition by ID.
        
        Args:
            framework_id: ID of framework to retrieve
            
        Returns:
            Framework definition or None if not found
        """
        return self.frameworks.get(framework_id)
    
    def get_all_frameworks(self) -> List[FrameworkDefinition]:
        """
        Get all framework definitions.
        
        Returns:
            List of all framework definitions
        """
        return list(self.frameworks.values())
    
    def save_framework(self, framework: FrameworkDefinition) -> bool:
        """
        Save a framework definition to the repository.
        
        Args:
            framework: Framework definition to save
            
        Returns:
            True if save was successful, False otherwise
        """
        try:
            # Create file path
            file_path = os.path.join(self.repo_path, f"{framework.framework_id}.json")
            
            # Convert to dict and save
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(framework.to_dict(), f, indent=2)
            
            # Update in-memory dictionary
            self.frameworks[framework.framework_id] = framework
            
            logger.info(f"Saved framework {framework.framework_id} to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving framework {framework.framework_id}: {str(e)}")
            return False
    
    def delete_framework(self, framework_id: str) -> bool:
        """
        Delete a framework definition from the repository.
        
        Args:
            framework_id: ID of framework to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            # Check if framework exists
            if framework_id not in self.frameworks:
                logger.warning(f"Framework {framework_id} not found for deletion")
                return False
            
            # Delete file
            file_path = os.path.join(self.repo_path, f"{framework_id}.json")
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Remove from in-memory dictionary
            del self.frameworks[framework_id]
            
            logger.info(f"Deleted framework {framework_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting framework {framework_id}: {str(e)}")
            return False


class FrameworkExtractor:
    """Extracts teaching frameworks from content."""
    
    def __init__(self, framework_repository: Optional[FrameworkRepository] = None,
                 anthropic_api_key: Optional[str] = None,
                 openai_api_key: Optional[str] = None):
        """
        Initialize the framework extractor.
        
        Args:
            framework_repository: Repository of framework definitions
            anthropic_api_key: Optional Anthropic API key for AI-assisted extraction
            openai_api_key: Optional OpenAI API key for AI-assisted extraction
        """
        self.framework_repo = framework_repository or FrameworkRepository()
        
        # Set up AI clients if available
        self.anthropic_client = None
        self.openai_client = None
        
        if ANTHROPIC_AVAILABLE and (anthropic_api_key or os.environ.get('ANTHROPIC_API_KEY')):
            try:
                self.anthropic_client = anthropic.Anthropic(
                    api_key=anthropic_api_key or os.environ.get('ANTHROPIC_API_KEY')
                )
                logger.info("Initialized Anthropic client")
            except Exception as e:
                logger.error(f"Error initializing Anthropic client: {str(e)}")
        
        if OPENAI_AVAILABLE and (openai_api_key or os.environ.get('OPENAI_API_KEY')):
            try:
                self.openai_client = OpenAI(
                    api_key=openai_api_key or os.environ.get('OPENAI_API_KEY')
                )
                logger.info("Initialized OpenAI client")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {str(e)}")
    
    def extract_frameworks(self, content: Dict[str, Any], ai_assist: bool = False) -> Dict[str, Any]:
        """
        Extract frameworks from content.
        
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
            # Use AI-assisted extraction
            return self._extract_frameworks_ai(content)
        else:
            # Use rules-based extraction
            return self._extract_frameworks_rules(content)
    
    def _extract_frameworks_rules(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract frameworks using rules-based approach.
        
        Args:
            content: Content dictionary
            
        Returns:
            Dictionary of extraction results
        """
        content_text = content.get('content', '')
        content_id = content.get('id', 'unknown')
        
        # Get all frameworks
        frameworks = self.framework_repo.get_all_frameworks()
        
        # Identify matching frameworks
        matches = []
        for framework in frameworks:
            # Check for framework indicators
            indicator_matches = []
            for indicator in framework.indicators:
                pattern = re.compile(indicator, re.IGNORECASE)
                text_matches = pattern.findall(content_text)
                if text_matches:
                    indicator_matches.append({
                        'indicator': indicator,
                        'count': len(text_matches),
                        'examples': text_matches[:3]  # Limit examples
                    })
            
            # Calculate confidence score
            confidence = len(indicator_matches) / len(framework.indicators) if framework.indicators else 0
            
            # Only include if we have some matches
            if indicator_matches:
                match = {
                    'framework_id': framework.framework_id,
                    'name': framework.name,
                    'confidence': confidence,
                    'indicator_matches': indicator_matches
                }
                matches.append(match)
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Extract framework instances for top matches
        instances = []
        for match in matches[:3]:  # Process top 3 matches
            framework = self.framework_repo.get_framework(match['framework_id'])
            if not framework:
                continue
                
            # Extract instances
            framework_instances = self._extract_instances(content_text, framework)
            
            if framework_instances:
                instances.append({
                    'framework_id': framework.framework_id,
                    'name': framework.name,
                    'instances': framework_instances
                })
        
        # Prepare result
        result = {
            'content_id': content_id,
            'matches': matches,
            'instances': instances
        }
        
        return result
    
    def _extract_instances(self, text: str, framework: FrameworkDefinition) -> List[Dict[str, Any]]:
        """
        Extract instances of a framework from text.
        
        Args:
            text: Content text
            framework: Framework definition
            
        Returns:
            List of framework instances
        """
        instances = []
        
        # Split text into paragraphs
        paragraphs = text.split('\n\n')
        
        # Scan paragraphs for framework indicators
        for i, para in enumerate(paragraphs):
            # Check for framework indicators
            has_indicator = False
            for indicator in framework.indicators:
                if re.search(indicator, para, re.IGNORECASE):
                    has_indicator = True
                    break
            
            if not has_indicator:
                continue
                
            # Found framework indicator, extract instance
            instance = {
                'start_paragraph': i,
                'text': para,
                'components': []
            }
            
            # Look ahead for components (up to 10 paragraphs)
            for j in range(i, min(i + 10, len(paragraphs))):
                para_j = paragraphs[j]
                
                # Check for component indicators
                for component in framework.components:
                    component_found = False
                    for indicator in component['indicators']:
                        if re.search(indicator, para_j, re.IGNORECASE):
                            component_found = True
                            break
                    
                    if component_found and j > i:
                        # Add paragraph to instance
                        instance['text'] += '\n\n' + para_j
                        instance['end_paragraph'] = j
                        
                        # Add component
                        if not any(c['component_id'] == component['component_id'] for c in instance['components']):
                            instance['components'].append({
                                'component_id': component['component_id'],
                                'name': component['name'],
                                'paragraph_index': j
                            })
            
            # Only include if we found some components
            if instance['components']:
                # Calculate completeness
                completeness = len(instance['components']) / len(framework.components)
                instance['completeness'] = completeness
                
                instances.append(instance)
                
                # Skip ahead to avoid overlapping instances
                i = instance.get('end_paragraph', i)
        
        return instances
    
    def _extract_frameworks_ai(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract frameworks using AI-assisted approach.
        
        Args:
            content: Content dictionary
            
        Returns:
            Dictionary of extraction results
        """
        content_text = content.get('content', '')
        content_id = content.get('id', 'unknown')
        
        # Get all frameworks for reference
        frameworks = self.framework_repo.get_all_frameworks()
        framework_info = "\n\n".join([
            f"FRAMEWORK: {f.name}\nDESCRIPTION: {f.description}\nINDICATORS: {', '.join(f.indicators)}\nCOMPONENTS: {', '.join(c['name'] for c in f.components)}"
            for f in frameworks
        ])
        
        # Create prompt
        prompt = f"""Analyze the following content and identify any teaching frameworks being used. Focus on these specific frameworks: Value Ladder, Three-Tier Service Model, 10% Rule, Profit First, and Effective Hourly Rate.

For each framework found, extract:
1. Which framework is being used
2. Confidence level (0.0-1.0)
3. The specific passage where it appears
4. Which components of the framework are present
5. How completely the framework is presented (0.0-1.0)

Reference information about the frameworks:
{framework_info}

CONTENT:
{content_text[:3000]}  # Truncate to avoid token limits

Respond in JSON format:
```json
{{
  "matches": [
    {{
      "framework_id": "framework_identifier",
      "name": "Framework Name",
      "confidence": 0.85,
      "passage": "text where framework appears...",
      "components": [
        {{
          "component_id": "component_identifier",
          "name": "Component Name",
          "text": "text where component appears..."
        }}
      ],
      "completeness": 0.75
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
            logger.warning("No AI service available for extraction")
            return self._extract_frameworks_rules(content)
    
    def _extract_with_anthropic(self, prompt: str, content_id: str) -> Dict[str, Any]:
        """Extract frameworks using Anthropic."""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0,
                system="You are an expert teaching framework analyzer. Extract frameworks accurately and precisely.",
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
                result['content_id'] = content_id
                return result
            else:
                logger.error("Failed to extract JSON from Anthropic response")
                return {'content_id': content_id, 'error': 'Failed to extract JSON', 'matches': []}
                
        except Exception as e:
            logger.error(f"Error in Anthropic extraction: {str(e)}")
            return {'content_id': content_id, 'error': str(e), 'matches': []}
    
    def _extract_with_openai(self, prompt: str, content_id: str) -> Dict[str, Any]:
        """Extract frameworks using OpenAI."""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                temperature=0,
                messages=[
                    {"role": "system", "content": "You are an expert teaching framework analyzer. Extract frameworks accurately and precisely."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract JSON from response
            content = response.choices[0].message.content
            json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
            
            if json_match:
                json_str = json_match.group(1)
                result = json.loads(json_str)
                result['content_id'] = content_id
                return result
            else:
                logger.error("Failed to extract JSON from OpenAI response")
                return {'content_id': content_id, 'error': 'Failed to extract JSON', 'matches': []}
                
        except Exception as e:
            logger.error(f"Error in OpenAI extraction: {str(e)}")
            return {'content_id': content_id, 'error': str(e), 'matches': []}


class FrameworkInstance:
    """
    Represents a specific instance of a framework found in content.
    Includes the framework definition, location, and components found.
    """
    
    def __init__(self, framework_id: str, content_id: str, 
                 text: str, components: List[Dict[str, Any]],
                 confidence: float = 0.0):
        """
        Initialize a framework instance.
        
        Args:
            framework_id: ID of the framework
            content_id: ID of the content the framework was found in
            text: Text of the framework instance
            components: List of components found in the instance
            confidence: Confidence level for the match
        """
        self.framework_id = framework_id
        self.content_id = content_id
        self.text = text
        self.components = components
        self.confidence = confidence
        self.instance_id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate a unique ID for this instance."""
        import hashlib
        text_hash = hashlib.md5(self.text.encode()).hexdigest()[:8]
        return f"{self.framework_id}_{self.content_id}_{text_hash}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'instance_id': self.instance_id,
            'framework_id': self.framework_id,
            'content_id': self.content_id,
            'text': self.text,
            'components': self.components,
            'confidence': self.confidence
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FrameworkInstance':
        """Create from dictionary representation."""
        instance = cls(
            framework_id=data['framework_id'],
            content_id=data['content_id'],
            text=data['text'],
            components=data['components'],
            confidence=data['confidence']
        )
        instance.instance_id = data['instance_id']
        return instance


class FrameworkInstanceRepository:
    """Repository for storing and retrieving framework instances."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """
        Initialize the framework instance repository.
        
        Args:
            repo_path: Path to the repository storage directory
        """
        self.repo_path = repo_path if repo_path else os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'data',
            'framework_instances'
        )
        
        # Create directory if it doesn't exist
        os.makedirs(self.repo_path, exist_ok=True)
        
        # Initialize instances dictionary
        self.instances = {}
        
        # Load instances
        self._load_instances()
    
    def _load_instances(self):
        """Load instances from repository."""
        try:
            instance_files = list(Path(self.repo_path).glob('*.json'))
            for file_path in instance_files:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    instance = FrameworkInstance.from_dict(data)
                    self.instances[instance.instance_id] = instance
            
            logger.info(f"Loaded {len(self.instances)} framework instances from repository")
        except Exception as e:
            logger.error(f"Error loading framework instances: {str(e)}")
    
    def get_instance(self, instance_id: str) -> Optional[FrameworkInstance]:
        """
        Get a framework instance by ID.
        
        Args:
            instance_id: ID of instance to retrieve
            
        Returns:
            Framework instance or None if not found
        """
        return self.instances.get(instance_id)
    
    def get_instances_by_framework(self, framework_id: str) -> List[FrameworkInstance]:
        """
        Get all instances of a specific framework.
        
        Args:
            framework_id: ID of framework to get instances for
            
        Returns:
            List of framework instances
        """
        return [
            instance for instance in self.instances.values()
            if instance.framework_id == framework_id
        ]
    
    def get_instances_by_content(self, content_id: str) -> List[FrameworkInstance]:
        """
        Get all instances found in specific content.
        
        Args:
            content_id: ID of content to get instances for
            
        Returns:
            List of framework instances
        """
        return [
            instance for instance in self.instances.values()
            if instance.content_id == content_id
        ]
    
    def save_instance(self, instance: FrameworkInstance) -> bool:
        """
        Save a framework instance to the repository.
        
        Args:
            instance: Framework instance to save
            
        Returns:
            True if save was successful, False otherwise
        """
        try:
            # Create file path
            file_path = os.path.join(self.repo_path, f"{instance.instance_id}.json")
            
            # Convert to dict and save
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(instance.to_dict(), f, indent=2)
            
            # Update in-memory dictionary
            self.instances[instance.instance_id] = instance
            
            logger.info(f"Saved framework instance {instance.instance_id} to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving framework instance {instance.instance_id}: {str(e)}")
            return False
    
    def delete_instance(self, instance_id: str) -> bool:
        """
        Delete a framework instance from the repository.
        
        Args:
            instance_id: ID of instance to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            # Check if instance exists
            if instance_id not in self.instances:
                logger.warning(f"Framework instance {instance_id} not found for deletion")
                return False
            
            # Delete file
            file_path = os.path.join(self.repo_path, f"{instance_id}.json")
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Remove from in-memory dictionary
            del self.instances[instance_id]
            
            logger.info(f"Deleted framework instance {instance_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting framework instance {instance_id}: {str(e)}")
            return False
    
    def delete_instances_by_content(self, content_id: str) -> int:
        """
        Delete all instances for a specific content.
        
        Args:
            content_id: ID of content to delete instances for
            
        Returns:
            Number of instances deleted
        """
        instances = self.get_instances_by_content(content_id)
        count = 0
        
        for instance in instances:
            if self.delete_instance(instance.instance_id):
                count += 1
        
        return count


def store_extraction_results(extraction_results: Dict[str, Any],
                            instance_repo: FrameworkInstanceRepository) -> int:
    """
    Store framework extraction results in the instance repository.
    
    Args:
        extraction_results: Results from framework extraction
        instance_repo: Repository to store instances in
        
    Returns:
        Number of instances stored
    """
    content_id = extraction_results.get('content_id', 'unknown')
    instances_data = extraction_results.get('instances', [])
    matches = extraction_results.get('matches', [])
    
    # Delete existing instances for this content
    instance_repo.delete_instances_by_content(content_id)
    
    # Create match lookup for confidence scores
    match_lookup = {match['framework_id']: match.get('confidence', 0) for match in matches}
    
    # Store new instances
    count = 0
    for instance_group in instances_data:
        framework_id = instance_group.get('framework_id')
        for instance_data in instance_group.get('instances', []):
            confidence = match_lookup.get(framework_id, 0)
            
            instance = FrameworkInstance(
                framework_id=framework_id,
                content_id=content_id,
                text=instance_data.get('text', ''),
                components=instance_data.get('components', []),
                confidence=confidence
            )
            
            if instance_repo.save_instance(instance):
                count += 1
    
    return count


def main():
    """Example usage of the framework extractor."""
    import glob
    from pathlib import Path
    import sys
    
    # Get content path from command line if provided
    content_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Setup
    framework_repo = FrameworkRepository()
    instance_repo = FrameworkInstanceRepository()
    extractor = FrameworkExtractor(framework_repo)
    
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
                
                # Extract frameworks
                results = extractor.extract_frameworks(content)
                
                # Store instances
                count = store_extraction_results(results, instance_repo)
                print(f"Extracted and stored {count} framework instances")
                
                # Print summary
                for match in results.get('matches', []):
                    print(f"- {match['name']} (confidence: {match['confidence']:.2f})")
            else:
                print(f"File not found: {content_path}")
        else:
            # Process sample directory
            sample_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'processed_content'
            )
            
            sample_files = glob.glob(os.path.join(sample_dir, '*.json'))[:5]  # Process first 5 files
            
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
                
                # Extract frameworks
                results = extractor.extract_frameworks(content)
                
                # Store instances
                count = store_extraction_results(results, instance_repo)
                print(f"  Extracted and stored {count} framework instances")
                
                # Print summary
                for match in results.get('matches', []):
                    print(f"  - {match['name']} (confidence: {match['confidence']:.2f})")
    
    except Exception as e:
        print(f"Error in main processing: {str(e)}")
        raise


if __name__ == "__main__":
    main()