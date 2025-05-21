#!/usr/bin/env python3
"""
Tests for the API handler implementation.
These tests should pass with both the original requests-based implementation
and the refactored httpx-based implementation.
"""

import os
import pytest
import json
from unittest.mock import MagicMock, patch, mock_open

# Import the module to test
# The import is intentionally flexible to work with both the old and new implementation
try:
    from tasks.legacy_refactor.deprecated_handler import DeprecatedAPIHandler, APIError
except ImportError:
    # Try the refactored path
    try:
        from tasks.legacy_refactor.refactored_handler import APIHandler as DeprecatedAPIHandler, APIError
    except ImportError:
        from deprecated_handler import DeprecatedAPIHandler, APIError


class MockResponse:
    """Mock response object that simulates requests/httpx Response."""
    
    def __init__(self, status_code, json_data=None, text="", headers=None, is_error=False):
        self.status_code = status_code
        self._json_data = json_data or {}
        self.text = text
        self.headers = headers or {"Content-Type": "application/json"}
        self.is_error = is_error
        
    def json(self):
        return self._json_data
        
    def raise_for_status(self):
        if self.is_error:
            raise Exception(f"HTTP Error: {self.status_code}")


@pytest.fixture
def api_handler():
    """Create a configured API handler for testing."""
    return DeprecatedAPIHandler("https://api.example.com", api_key="test_api_key")


def test_init_api_handler():
    """Test initialization of API handler."""
    handler = DeprecatedAPIHandler("https://api.example.com", api_key="test_key")
    assert handler.base_url == "https://api.example.com"
    assert handler.api_key == "test_key"
    
    # Test URL normalization
    handler = DeprecatedAPIHandler("https://api.example.com/", api_key="test_key")
    assert handler.base_url == "https://api.example.com"


def test_build_url(api_handler):
    """Test URL building logic."""
    assert api_handler._build_url("users") == "https://api.example.com/users"
    assert api_handler._build_url("/users") == "https://api.example.com/users"


@patch("requests.Session", autospec=True)  # This will need to adapt for httpx
def test_get_request(mock_session, api_handler):
    """Test GET request."""
    # Configure mock
    mock_response = MockResponse(200, json_data={"key": "value"})
    mock_session.return_value.get.return_value = mock_response
    
    # Call method and check result
    result = api_handler.get("/test-endpoint", params={"param1": "value1"})
    
    assert result == {"key": "value"}
    mock_session.return_value.get.assert_called_once()


@patch("requests.Session", autospec=True)  # This will need to adapt for httpx
def test_post_request(mock_session, api_handler):
    """Test POST request."""
    # Configure mock
    mock_response = MockResponse(201, json_data={"id": 123})
    mock_session.return_value.post.return_value = mock_response
    
    # Call method and check result
    data = {"name": "Test", "value": 42}
    result = api_handler.post("/test-endpoint", data=data)
    
    assert result == {"id": 123}
    mock_session.return_value.post.assert_called_once()


@patch("requests.Session", autospec=True)  # This will need to adapt for httpx
def test_error_handling(mock_session, api_handler):
    """Test error handling logic."""
    # Configure mock for a client error
    mock_response = MockResponse(
        400,
        json_data={"error": "Bad request"},
        is_error=True
    )
    mock_session.return_value.get.return_value = mock_response
    
    # Call method and check exception
    with pytest.raises(APIError) as exc_info:
        api_handler.get("/test-endpoint")
    
    assert "Bad request" in str(exc_info.value)


@patch("requests.Session", autospec=True)  # This will need to adapt for httpx
def test_retry_logic(mock_session, api_handler):
    """Test that retries work properly for connection errors."""
    # Configure mock to raise ConnectionError twice then succeed
    mock_session.return_value.get.side_effect = [
        ConnectionError("Connection failed"),
        ConnectionError("Connection failed again"),
        MockResponse(200, json_data={"success": True})
    ]
    
    # Call method
    result = api_handler.get("/test-endpoint")
    
    # Check retry behavior
    assert mock_session.return_value.get.call_count == 3
    assert result == {"success": True}


@patch("requests.Session", autospec=True)  # This will need to adapt for httpx
@patch("builtins.open", new_callable=mock_open, read_data=b"test file content")
def test_file_upload(mock_file, mock_session, api_handler):
    """Test file upload functionality."""
    # Configure mock
    mock_response = MockResponse(200, json_data={"file_id": "abc123"})
    mock_session.return_value.post.return_value = mock_response
    
    # Mock os.path.isfile to return True
    with patch("os.path.isfile", return_value=True):
        result = api_handler.upload_file(
            "/upload",
            "test.txt",
            extra_data={"description": "Test file"}
        )
    
    assert result == {"file_id": "abc123"}
    mock_session.return_value.post.assert_called_once()
    mock_file.assert_called_once_with("test.txt", "rb")