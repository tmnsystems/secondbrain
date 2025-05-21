"""
Basic test to verify the metaphor and values extraction modules.
"""

import os
import sys
import unittest
import tempfile
import shutil

# Add proper import path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import modules to test
from src.core.metaphor_extractor import MetaphorExtractor
from src.core.values_extractor import ValuesExtractor


class TestExtractors(unittest.TestCase):
    """Simple test for extractors."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Sample content for testing
        self.metaphor_content = {
            'id': 'test_metaphor',
            'content': (
                "Think of your business like a garden. You need to plant the right seeds, "
                "nurture them daily, and remove weeds that could choke your growth. "
                "It's important to remember that just like in a garden, some seasons are for planting, "
                "some are for growing, and some are for harvesting."
            )
        }
        
        self.values_content = {
            'id': 'test_values',
            'content': (
                "What really matters in business is not just profit, but creating value "
                "for your customers and maintaining integrity in everything you do. "
                "You should always prioritize building relationships over quick sales, "
                "because in the long run, those relationships are your business foundation."
            )
        }
        
        # Initialize extractors
        self.metaphor_extractor = MetaphorExtractor()
        self.values_extractor = ValuesExtractor()
    
    def test_metaphor_extraction(self):
        """Test metaphor extraction."""
        result = self.metaphor_extractor._extract_metaphors_rules(self.metaphor_content)
        self.assertGreater(len(result.get('metaphors', [])), 0)
        self.assertIn('garden', str(result).lower())
    
    def test_value_extraction(self):
        """Test value extraction."""
        result = self.values_extractor._extract_values_rules(self.values_content)
        self.assertGreater(len(result.get('value_statements', [])), 0)
        self.assertIn('matters', str(result).lower())


if __name__ == '__main__':
    unittest.main()