"""
Pytest configuration file for SecondBrain tests.
"""

import os
import sys
import pytest

# Add src to path for importing modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture
def sample_content():
    """Provide sample content for testing."""
    return {
        'id': 'test_content',
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

@pytest.fixture
def value_content():
    """Provide sample content with value statements for testing."""
    return {
        'id': 'test_values',
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