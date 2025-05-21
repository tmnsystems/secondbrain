#!/usr/bin/env python3
"""
Tests for the DeprecatedAPIHandler class.

These tests should continue to pass when the handler is refactored
to use httpx instead of requests, ensuring compatibility.
"""

import unittest
import json
from unittest.mock import patch, MagicMock
from deprecated_handler import DeprecatedAPIHandler

class TestDeprecatedAPIHandler(unittest.TestCase):
    """Test cases for the DeprecatedAPIHandler class."""
    
    def setUp(self):
        """Set up test environment before each test."""
        self.base_url = "https://api.example.com/v1"
        self.api_key = "test_api_key"
        self.handler = DeprecatedAPIHandler(
            base_url=self.base_url,
            api_key=self.api_key,
            timeout=5
        )
        
    def tearDown(self):
        """Clean up after each test."""
        self.handler.close()
        
    @patch('requests.Session.get')
    def test_get_resource(self, mock_get):
        """Test getting a resource."""
        # Mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test Resource"}
        mock_get.return_value = mock_response
        
        # Call get_resource
        result = self.handler.get_resource("resources")
        
        # Verify the result
        self.assertEqual(result, {"id": "123", "name": "Test Resource"})
        
        # Verify the request was made correctly
        mock_get.assert_called_once_with(
            f"{self.base_url}/resources",
            params=None,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            },
            timeout=5
        )
        
    @patch('requests.Session.post')
    def test_create_resource(self, mock_post):
        """Test creating a resource."""
        # Mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "456", "name": "New Resource"}
        mock_post.return_value = mock_response
        
        # Data to create
        data = {"name": "New Resource"}
        
        # Call create_resource
        result = self.handler.create_resource("resources", data)
        
        # Verify the result
        self.assertEqual(result, {"id": "456", "name": "New Resource"})
        
        # Verify the request was made correctly
        mock_post.assert_called_once_with(
            f"{self.base_url}/resources",
            json=data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            },
            timeout=5
        )
        
    @patch('requests.Session.put')
    def test_update_resource(self, mock_put):
        """Test updating a resource."""
        # Mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "789", "name": "Updated Resource"}
        mock_put.return_value = mock_response
        
        # Data to update
        data = {"name": "Updated Resource"}
        
        # Call update_resource
        result = self.handler.update_resource("resources", "789", data)
        
        # Verify the result
        self.assertEqual(result, {"id": "789", "name": "Updated Resource"})
        
        # Verify the request was made correctly
        mock_put.assert_called_once_with(
            f"{self.base_url}/resources/789",
            json=data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            },
            timeout=5
        )
        
    @patch('requests.Session.delete')
    def test_delete_resource(self, mock_delete):
        """Test deleting a resource."""
        # Mock response
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        # Call delete_resource
        result = self.handler.delete_resource("resources", "123")
        
        # Verify the result
        self.assertTrue(result)
        
        # Verify the request was made correctly
        mock_delete.assert_called_once_with(
            f"{self.base_url}/resources/123",
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            },
            timeout=5
        )
        
    @patch('requests.Session.get')
    def test_batch_get_resources(self, mock_get):
        """Test batch getting resources."""
        # Mock responses for each resource
        mock_response1 = MagicMock()
        mock_response1.json.return_value = {"id": "1", "name": "Resource 1"}
        
        mock_response2 = MagicMock()
        mock_response2.json.return_value = {"id": "2", "name": "Resource 2"}
        
        # Set up the mock to return different responses for different URLs
        def side_effect(url, **kwargs):
            if url.endswith("1"):
                return mock_response1
            elif url.endswith("2"):
                return mock_response2
            else:
                raise ValueError("Unexpected URL")
                
        mock_get.side_effect = side_effect
        
        # Call batch_get_resources
        results = self.handler.batch_get_resources("resources", ["1", "2"])
        
        # Verify the results
        self.assertEqual(results, {
            "1": {"id": "1", "name": "Resource 1"},
            "2": {"id": "2", "name": "Resource 2"}
        })
        
        # Verify the requests were made correctly
        self.assertEqual(mock_get.call_count, 2)
        
    @patch('requests.Session.get')
    def test_search_resources(self, mock_get):
        """Test searching for resources."""
        # Mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {"id": "1", "name": "Result 1"},
                {"id": "2", "name": "Result 2"}
            ]
        }
        mock_get.return_value = mock_response
        
        # Call search_resources
        results = self.handler.search_resources("resources", "test query")
        
        # Verify the results
        self.assertEqual(results, [
            {"id": "1", "name": "Result 1"},
            {"id": "2", "name": "Result 2"}
        ])
        
        # Verify the request was made correctly
        mock_get.assert_called_once_with(
            f"{self.base_url}/resources/search",
            params={"q": "test query", "limit": 100},
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            },
            timeout=5
        )
        
    def test_context_manager(self):
        """Test the context manager protocol."""
        with patch.object(self.handler, 'close') as mock_close:
            with self.handler as handler:
                self.assertEqual(handler, self.handler)
            mock_close.assert_called_once()


if __name__ == "__main__":
    unittest.main()