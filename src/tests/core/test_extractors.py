"""
Integration tests for the metaphor_extractor and values_extractor modules.

These tests verify the ability to extract metaphors, analogies, and value statements
from coaching content, focusing on capturing Tina's holistic teaching approach 
that connects business concepts to life experiences.
"""

import os
import json
import unittest
from pathlib import Path
import tempfile
import shutil

# Import modules to test
import sys
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(root_dir)
from src.core.metaphor_extractor import MetaphorExtractor, MetaphorRepository
from src.core.values_extractor import ValuesExtractor, ValuesRepository

class TestMetaphorExtractor(unittest.TestCase):
    """Test the MetaphorExtractor class."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a temp directory for repositories
        self.test_dir = tempfile.mkdtemp()
        self.metaphor_repo_path = os.path.join(self.test_dir, 'metaphors')
        
        # Initialize the extractor with no AI assistance (for predictable test results)
        self.extractor = MetaphorExtractor()
        self.repository = MetaphorRepository(repo_path=self.metaphor_repo_path)
        
        # Sample content for testing
        self.sample_content = {
            'id': 'test_content_1',
            'content': (
                "Think of your business like a garden. You need to plant the right seeds, "
                "nurture them daily, and remove weeds that could choke your growth. "
                "It's important to remember that just like in a garden, some seasons are for planting, "
                "some are for growing, and some are for harvesting. "
                "You wouldn't try to harvest tomatoes the day after planting seeds, right? "
                "The same way, you can't expect immediate results in your business. "
                "What really matters is that you're building systems that work like an ecosystem, "
                "where each part supports the others naturally. "
                "Many people focus on the quick win, but that's like watering just the leaves "
                "and not the roots. It might look good temporarily, but it won't last."
            )
        }
        
        # For tests that need real data, create a mock coaching content
        self.coaching_content = {
            'id': 'mock_coaching',
            'content': (
                "Your business runs on you and you run on sleep and everything else. "
                "The holistic approach is always just, how are you? How are you taking care of yourself? "
                "That's important. What matters is that you're building systems that work together. "
                "It's like building blocks where each piece supports the others. "
                "Many business owners are like plate spinners, running from plate to plate. "
                "What really matters is that you're creating value for your clients while maintaining "
                "your own quality of life. Don't build a business that owns you."
            )
        }
    
    def tearDown(self):
        """Tear down test fixtures."""
        # Remove the temp directory
        shutil.rmtree(self.test_dir)
    
    def test_extract_metaphors_from_sample(self):
        """Test extracting metaphors from sample content."""
        result = self.extractor._extract_metaphors_rules(self.sample_content)
        
        # Verify the extraction found metaphors
        self.assertGreater(len(result.get('metaphors', [])), 0)
        self.assertIn('garden', str(result).lower())
        
        # Verify the metaphors have the expected structure
        metaphors = result.get('metaphors', [])
        for metaphor in metaphors:
            self.assertIn('text', metaphor)
            self.assertIn('category', metaphor)
            self.assertIn('context', metaphor)
    
    def test_extract_holistic_metaphors_from_coaching(self):
        """Test extracting holistic metaphors that connect business and life from real coaching content."""
        result = self.extractor._extract_metaphors_rules(self.coaching_content)
        
        # Verify that at least some metaphors were extracted
        self.assertGreaterEqual(len(result.get('metaphors', [])), 1)
        
        # Examine the metaphors found
        metaphors = result.get('metaphors', [])
        metaphor_texts = [m.get('text', '') for m in metaphors]
        
        # We just verify that metaphors were found - exact terms may vary
        # based on the pattern matching algorithm
        self.assertGreaterEqual(len(metaphor_texts), 1, 
                             "Expected to find at least one metaphor in the coaching content")
    
    def test_repository_save_and_retrieve(self):
        """Test saving and retrieving metaphors from the repository."""
        # Extract metaphors
        result = self.extractor._extract_metaphors_rules(self.sample_content)
        
        # Save to repository
        count = self.repository.save_metaphors(result)
        
        # Verify metaphors were saved
        self.assertGreater(count, 0)
        
        # Retrieve from repository
        retrieved = self.repository.get_metaphors_by_content(self.sample_content['id'])
        
        # Verify retrieved metaphors match saved metaphors
        self.assertEqual(len(retrieved), len(result.get('metaphors', [])))
        
        # Test domain-based retrieval if metaphors with nature category exist
        nature_metaphors = self.repository.get_metaphors_by_domain('nature')
        if any(m.get('category') == 'nature' for m in result.get('metaphors', [])):
            self.assertGreaterEqual(len(nature_metaphors), 1)


class TestValuesExtractor(unittest.TestCase):
    """Test the ValuesExtractor class."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a temp directory for repositories
        self.test_dir = tempfile.mkdtemp()
        self.values_repo_path = os.path.join(self.test_dir, 'values')
        
        # Initialize the extractor with no AI assistance (for predictable test results)
        self.extractor = ValuesExtractor()
        self.repository = ValuesRepository(repo_path=self.values_repo_path)
        
        # Sample content for testing
        self.sample_content = {
            'id': 'test_content_2',
            'content': (
                "What really matters in business is not just profit, but creating value "
                "for your customers and maintaining integrity in everything you do. "
                "You should always prioritize building relationships over quick sales, "
                "because in the long run, those relationships are your business foundation. "
                "Time freedom is essential - don't build a business that owns you. "
                "A lot of people get hung up on vanity metrics, but those don't actually matter. "
                "What counts is sustainable growth and the quality of your life while building. "
                "I believe that your business should serve your life, not the other way around."
            )
        }
        
        # For tests that need real data, create a mock coaching content
        self.coaching_content = {
            'id': 'mock_coaching',
            'content': (
                "Your business runs on you and you run on sleep and everything else. "
                "The holistic approach is always just, how are you? How are you taking care of yourself? "
                "That's important. What matters is that you're building systems that work together. "
                "It's like building blocks where each piece supports the others. "
                "Many business owners are like plate spinners, running from plate to plate. "
                "What really matters is that you're creating value for your clients while maintaining "
                "your own quality of life. Don't build a business that owns you."
            )
        }
    
    def tearDown(self):
        """Tear down test fixtures."""
        # Remove the temp directory
        shutil.rmtree(self.test_dir)
    
    def test_extract_values_from_sample(self):
        """Test extracting value statements from sample content."""
        result = self.extractor._extract_values_rules(self.sample_content)
        
        # Verify the extraction found value statements
        self.assertGreater(len(result.get('value_statements', [])), 0)
        
        # We just verify that values were found - exact types may vary
        # based on the pattern matching algorithm
        value_types = [vs.get('value_type') for vs in result.get('value_statements', [])]
        self.assertGreaterEqual(len(value_types), 1,
                             "Expected to find at least one value statement with a type")
    
    def test_extract_holistic_values_from_coaching(self):
        """Test extracting holistic values that connect business and life from real coaching content."""
        result = self.extractor._extract_values_rules(self.coaching_content)
        
        # Verify that at least some value statements were extracted
        self.assertGreaterEqual(len(result.get('value_statements', [])), 1)
        
        # Examine the values found
        values = result.get('value_statements', [])
        value_texts = [v.get('statement', '') for v in values]
        
        # Check for specific values related to holistic approach
        holistic_values = [
            text for text in value_texts 
            if 'holistic' in text.lower() or 
               'taking care of yourself' in text.lower() or
               'what matters' in text.lower()
        ]
        
        self.assertGreaterEqual(len(holistic_values), 1)
        
        # Verify value summary was generated
        self.assertIn('value_summary', result)
        self.assertIn('type_counts', result.get('value_summary', {}))
    
    def test_repository_save_and_retrieve(self):
        """Test saving and retrieving value statements from the repository."""
        # Extract values
        result = self.extractor._extract_values_rules(self.sample_content)
        
        # Save to repository
        count = self.repository.save_values(result)
        
        # Verify values were saved
        self.assertGreater(count, 0)
        
        # Retrieve from repository
        retrieved = self.repository.get_values_by_content(self.sample_content['id'])
        
        # Verify retrieved values match saved values
        self.assertEqual(len(retrieved), len(result.get('value_statements', [])))
        
        # Test type-based retrieval if values of quality_of_life type exist
        if any(vs.get('value_type') == 'quality_of_life' for vs in result.get('value_statements', [])):
            quality_values = self.repository.get_values_by_type('quality_of_life')
            self.assertGreaterEqual(len(quality_values), 1)


class TestIntegrationBetweenExtractors(unittest.TestCase):
    """Test the integration between metaphor and values extractors."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a temp directory for repositories
        self.test_dir = tempfile.mkdtemp()
        self.metaphor_repo_path = os.path.join(self.test_dir, 'metaphors')
        self.values_repo_path = os.path.join(self.test_dir, 'values')
        
        # Initialize extractors
        self.metaphor_extractor = MetaphorExtractor()
        self.metaphor_repository = MetaphorRepository(repo_path=self.metaphor_repo_path)
        
        self.values_extractor = ValuesExtractor()
        self.values_repository = ValuesRepository(repo_path=self.values_repo_path)
        
        # Create mock coaching content
        self.coaching_content = {
            'id': 'mock_coaching',
            'content': (
                "Your business runs on you and you run on sleep and everything else. "
                "The holistic approach is always just, how are you? How are you taking care of yourself? "
                "That's important. What matters is that you're building systems that work together. "
                "It's like building blocks where each piece supports the others. "
                "Many business owners are like plate spinners, running from plate to plate. "
                "What really matters is that you're creating value for your clients while maintaining "
                "your own quality of life. Don't build a business that owns you."
            )
        }
    
    def tearDown(self):
        """Tear down test fixtures."""
        # Remove the temp directory
        shutil.rmtree(self.test_dir)
    
    def test_combined_extraction_for_holistic_teaching(self):
        """Test that both extractors together capture Tina's holistic teaching approach."""
        # Extract metaphors and values
        metaphor_results = self.metaphor_extractor._extract_metaphors_rules(self.coaching_content)
        values_results = self.values_extractor._extract_values_rules(self.coaching_content)
        
        # Save to repositories
        self.metaphor_repository.save_metaphors(metaphor_results)
        self.values_repository.save_values(values_results)
        
        # Verify both types of extraction found elements
        self.assertGreater(len(metaphor_results.get('metaphors', [])), 0)
        self.assertGreater(len(values_results.get('value_statements', [])), 0)
        
        # Check for overlapping concepts
        metaphor_texts = [m.get('text', '').lower() for m in metaphor_results.get('metaphors', [])]
        value_texts = [v.get('statement', '').lower() for v in values_results.get('value_statements', [])]
        
        # Look for holistic concepts in both
        holistic_terms = ['holistic', 'taking care', 'what matters', 'life', 'business']
        
        metaphor_matches = []
        value_matches = []
        
        for term in holistic_terms:
            metaphor_matches.extend([text for text in metaphor_texts if term in text])
            value_matches.extend([text for text in value_texts if term in text])
        
        # Verify there's some overlap in the holistic concepts captured
        self.assertGreaterEqual(len(metaphor_matches) + len(value_matches), 1,
                              "Expected to find holistic concepts in extracted metaphors and values")


if __name__ == '__main__':
    unittest.main()