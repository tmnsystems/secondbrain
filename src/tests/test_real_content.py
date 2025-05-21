"""
Tests using real coaching content to verify metaphor and value extraction.
"""

import os
import sys
import json
import unittest

# Add proper import path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import modules to test
from src.core.metaphor_extractor import MetaphorExtractor
from src.core.values_extractor import ValuesExtractor


class TestWithRealContent(unittest.TestCase):
    """Test extractors with real coaching content."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Path to a real coaching transcript
        self.coaching_content_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'processed_content',
            'done_transcript_for_fuji_tina_coaching_1__txt.json'
        )
        
        # Load the content
        with open(self.coaching_content_path, 'r', encoding='utf-8') as f:
            self.coaching_content = json.load(f)
        
        # Initialize extractors
        self.metaphor_extractor = MetaphorExtractor()
        self.values_extractor = ValuesExtractor()
    
    def test_extract_holistic_metaphors(self):
        """Test extracting holistic metaphors from real coaching content."""
        result = self.metaphor_extractor._extract_metaphors_rules(self.coaching_content)
        
        # Verify that at least some metaphors were extracted
        self.assertGreaterEqual(len(result.get('metaphors', [])), 1)
        
        # Print some results for manual verification
        print(f"\nExtracted {len(result.get('metaphors', []))} metaphors:")
        for i, metaphor in enumerate(result.get('metaphors', [])[:3]):
            print(f"{i+1}. {metaphor.get('text', '')[:100]}...")
    
    def test_extract_holistic_values(self):
        """Test extracting holistic values from real coaching content."""
        result = self.values_extractor._extract_values_rules(self.coaching_content)
        
        # Verify that at least some value statements were extracted
        self.assertGreaterEqual(len(result.get('value_statements', [])), 1)
        
        # Print some results for manual verification
        print(f"\nExtracted {len(result.get('value_statements', []))} value statements:")
        for i, value in enumerate(result.get('value_statements', [])[:3]):
            print(f"{i+1}. {value.get('statement', '')[:100]}...")
            print(f"   Type: {value.get('value_type', '')}, Valence: {value.get('valence', '')}")


if __name__ == '__main__':
    unittest.main()