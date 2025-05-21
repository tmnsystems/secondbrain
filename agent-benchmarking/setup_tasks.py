#!/usr/bin/env python3
"""
Setup Tasks for Agent Benchmarking Framework

This script creates the directory structure and tasks for benchmarking
different AI coding agents.
"""

import os
import sys
import json
import shutil
import argparse

def create_task_directory(task_id, source_path=None):
    """
    Create a task directory with necessary files
    
    Args:
        task_id: The unique identifier for the task
        source_path: Path to source files if copying from existing directory
    """
    # Create base directory
    task_dir = os.path.join('tasks', task_id)
    os.makedirs(task_dir, exist_ok=True)
    
    # If copying from source, copy all files
    if source_path and os.path.exists(source_path):
        for file in os.listdir(source_path):
            src_file = os.path.join(source_path, file)
            dst_file = os.path.join(task_dir, file)
            if os.path.isfile(src_file):
                shutil.copy2(src_file, dst_file)
                print(f"Copied {file} to {task_dir}")
    else:
        # Create empty structure
        # Create __init__.py to make it a Python package
        with open(os.path.join(task_dir, '__init__.py'), 'w') as f:
            f.write("# Task package\n")
        
        print(f"Created task directory: {task_dir}")

def create_legacy_refactor_task():
    """Create the legacy refactor task"""
    task_id = 'legacy_refactor'
    task_dir = os.path.join('tasks', task_id)
    
    # Create directory
    create_task_directory(task_id)
    
    # Check if directory already has content
    if os.path.exists(os.path.join(task_dir, 'deprecated_handler.py')):
        print(f"Legacy refactor task already set up in {task_dir}")
        return
    
    # Create deprecated handler file
    deprecated_handler = """#!/usr/bin/env python3
\"\"\"
Deprecated HTTP handler implementation that needs refactoring.
This module uses the legacy 'requests' library which should be 
replaced with the more modern async 'httpx' client.
\"\"\"

import os
import json
import time
import requests
from typing import Dict, Any, Optional, List, Tuple

# Configuration
API_TIMEOUT = 30  # seconds
MAX_RETRIES = 3
DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "SecondBrain/1.0"
}


class DeprecatedAPIHandler:
    \"\"\"
    Legacy API handler that needs to be updated to use httpx instead of requests.
    This class should be refactored to use async patterns with httpx.
    \"\"\"
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        \"\"\"Initialize the API handler with base URL and optional API key.\"\"\"
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        
        # Apply default headers
        for key, value in DEFAULT_HEADERS.items():
            self.session.headers[key] = value
            
        # Add API key if provided
        if self.api_key:
            self.session.headers["Authorization"] = f"Bearer {self.api_key}"
    
    def _build_url(self, endpoint: str) -> str:
        \"\"\"Build full URL from endpoint path.\"\"\"
        endpoint = endpoint.lstrip('/')
        return f"{self.base_url}/{endpoint}"
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        \"\"\"Process API response and handle errors.\"\"\"
        try:
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Try to get error details from response
            error_msg = "Unknown error"
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_msg = error_data["error"]
                elif "message" in error_data:
                    error_msg = error_data["message"]
            except:
                error_msg = response.text or str(e)
                
            raise APIError(f"HTTP Error: {response.status_code} - {error_msg}")
        except requests.exceptions.RequestException as e:
            raise APIError(f"Request failed: {str(e)}")
        except json.JSONDecodeError:
            raise APIError(f"Invalid JSON response: {response.text[:100]}...")
    
    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        \"\"\"Send GET request to API endpoint.\"\"\"
        url = self._build_url(endpoint)
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.get(
                    url,
                    params=params,
                    timeout=API_TIMEOUT
                )
                return self._handle_response(response)
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt == MAX_RETRIES - 1:
                    raise APIError(f"Connection failed after {MAX_RETRIES} attempts: {str(e)}")
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"Send POST request with JSON data to API endpoint.\"\"\"
        url = self._build_url(endpoint)
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.post(
                    url,
                    json=data,
                    timeout=API_TIMEOUT
                )
                return self._handle_response(response)
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt == MAX_RETRIES - 1:
                    raise APIError(f"Connection failed after {MAX_RETRIES} attempts: {str(e)}")
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def put(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"Send PUT request with JSON data to API endpoint.\"\"\"
        url = self._build_url(endpoint)
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.put(
                    url,
                    json=data,
                    timeout=API_TIMEOUT
                )
                return self._handle_response(response)
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt == MAX_RETRIES - 1:
                    raise APIError(f"Connection failed after {MAX_RETRIES} attempts: {str(e)}")
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def delete(self, endpoint: str) -> Dict[str, Any]:
        \"\"\"Send DELETE request to API endpoint.\"\"\"
        url = self._build_url(endpoint)
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.delete(
                    url,
                    timeout=API_TIMEOUT
                )
                return self._handle_response(response)
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt == MAX_RETRIES - 1:
                    raise APIError(f"Connection failed after {MAX_RETRIES} attempts: {str(e)}")
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def upload_file(self, endpoint: str, file_path: str, 
                   extra_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        \"\"\"Upload file to API endpoint with optional extra form data.\"\"\"
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        url = self._build_url(endpoint)
        
        # Prepare multipart form data
        files = {'file': open(file_path, 'rb')}
        data = extra_data or {}
        
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.post(
                    url,
                    files=files,
                    data=data,
                    timeout=API_TIMEOUT * 2  # Double timeout for file uploads
                )
                return self._handle_response(response)
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt == MAX_RETRIES - 1:
                    raise APIError(f"Upload failed after {MAX_RETRIES} attempts: {str(e)}")
                time.sleep(2 ** attempt)  # Exponential backoff
            finally:
                files['file'].close()
    

class APIError(Exception):
    \"\"\"Exception raised for API errors.\"\"\"
    pass


# Example usage
if __name__ == "__main__":
    api = DeprecatedAPIHandler("https://api.example.com", api_key="test_key")
    try:
        # Get data example
        user_data = api.get("/users/me")
        print(f"User data: {user_data}")
        
        # Post data example
        result = api.post("/items", {"name": "New Item", "value": 100})
        print(f"Created item: {result}")
    except APIError as e:
        print(f"API Error: {e}")
"""
    
    # Create test file
    test_file = """#!/usr/bin/env python3
\"\"\"
Tests for the API handler implementation.
These tests should pass with both the original requests-based implementation
and the refactored httpx-based implementation.
\"\"\"

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
    \"\"\"Mock response object that simulates requests/httpx Response.\"\"\"
    
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
    \"\"\"Create a configured API handler for testing.\"\"\"
    return DeprecatedAPIHandler("https://api.example.com", api_key="test_api_key")


def test_init_api_handler():
    \"\"\"Test initialization of API handler.\"\"\"
    handler = DeprecatedAPIHandler("https://api.example.com", api_key="test_key")
    assert handler.base_url == "https://api.example.com"
    assert handler.api_key == "test_key"
    
    # Test URL normalization
    handler = DeprecatedAPIHandler("https://api.example.com/", api_key="test_key")
    assert handler.base_url == "https://api.example.com"


def test_build_url(api_handler):
    \"\"\"Test URL building logic.\"\"\"
    assert api_handler._build_url("users") == "https://api.example.com/users"
    assert api_handler._build_url("/users") == "https://api.example.com/users"


@patch("requests.Session", autospec=True)  # This will need to adapt for httpx
def test_get_request(mock_session, api_handler):
    \"\"\"Test GET request.\"\"\"
    # Configure mock
    mock_response = MockResponse(200, json_data={"key": "value"})
    mock_session.return_value.get.return_value = mock_response
    
    # Call method and check result
    result = api_handler.get("/test-endpoint", params={"param1": "value1"})
    
    assert result == {"key": "value"}
    mock_session.return_value.get.assert_called_once()


@patch("requests.Session", autospec=True)  # This will need to adapt for httpx
def test_post_request(mock_session, api_handler):
    \"\"\"Test POST request.\"\"\"
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
    \"\"\"Test error handling logic.\"\"\"
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
    \"\"\"Test that retries work properly for connection errors.\"\"\"
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
    \"\"\"Test file upload functionality.\"\"\"
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
"""
    
    # Create task specification
    task_spec = {
        "title": "Refactor deprecated API call",
        "file": "tasks/legacy_refactor/deprecated_handler.py",
        "target_file": "tasks/legacy_refactor/refactored_handler.py",
        "description": "Replace legacy `requests` logic with `httpx` async client",
        "criteria": [
            "Compiles cleanly with no syntax errors",
            "Passes all existing tests",
            "Uses httpx async client instead of requests",
            "Implements proper async/await patterns",
            "Maintains all existing functionality",
            "Handles errors and retries correctly",
            "Preserves API signatures where possible",
            "Includes appropriate type hints"
        ],
        "reference_docs": [
            "https://www.python-httpx.org/async/",
            "https://docs.python.org/3/library/asyncio.html"
        ],
        "difficulty": "medium",
        "expected_changes": [
            "Replace requests.Session with httpx.AsyncClient",
            "Convert methods to use async/await",
            "Update error handling for httpx exceptions",
            "Modify file upload logic to use httpx patterns"
        ]
    }
    
    # Write files
    with open(os.path.join(task_dir, 'deprecated_handler.py'), 'w') as f:
        f.write(deprecated_handler)
    
    with open(os.path.join(task_dir, 'test_deprecated_handler.py'), 'w') as f:
        f.write(test_file)
    
    with open(os.path.join(task_dir, 'task_spec.json'), 'w') as f:
        json.dump(task_spec, f, indent=2)
    
    print(f"Created legacy refactor task in {task_dir}")

def create_multi_file_update_task():
    """Create the multi-file update task"""
    task_id = 'multi_file_update'
    task_dir = os.path.join('tasks', task_id)
    
    # Create directory
    create_task_directory(task_id)
    
    # Check if directory already has content
    if os.path.exists(os.path.join(task_dir, 'module_a.py')):
        print(f"Multi-file update task already set up in {task_dir}")
        return
    
    # Create module files
    module_a = """#!/usr/bin/env python3
\"\"\"
Module A with old import structure that needs updating.
\"\"\"

# Legacy imports that need to be updated
from old_package import legacy_function, AnotherClass
from old_package.utils import helper_function
from old_package.constants import MAX_RETRIES, DEFAULT_TIMEOUT

class ModuleA:
    \"\"\"
    Example class that uses old imports.
    This needs to be updated to use new package structure.
    \"\"\"
    
    def __init__(self):
        self.max_retries = MAX_RETRIES
        self.timeout = DEFAULT_TIMEOUT
        
    def process_data(self, data):
        \"\"\"Process data using legacy functions\"\"\"
        # Using old package functions
        processed = legacy_function(data)
        helper = helper_function(processed)
        
        # Using old package class
        processor = AnotherClass()
        result = processor.process(helper)
        
        return result
"""
    
    module_b = """#!/usr/bin/env python3
\"\"\"
Module B with old import structure that needs updating.
\"\"\"

# Legacy imports that need to be updated
from old_package import legacy_function
from old_package.utils import helper_function, another_helper
from old_package.constants import (
    MAX_RETRIES,
    DEFAULT_TIMEOUT,
    ERROR_MESSAGES
)

def process_batch(items):
    \"\"\"Process a batch of items using legacy functions\"\"\"
    results = []
    
    for item in items:
        # Using old package functions
        processed = legacy_function(item)
        helper = helper_function(processed)
        extra = another_helper(helper, timeout=DEFAULT_TIMEOUT)
        
        if len(results) >= MAX_RETRIES:
            print(ERROR_MESSAGES['too_many_retries'])
            break
            
        results.append(extra)
        
    return results
"""
    
    module_c = """#!/usr/bin/env python3
\"\"\"
Module C with old import structure that needs updating.
\"\"\"

# Legacy imports that need to be updated
from old_package import legacy_function, AnotherClass
import old_package.utils as utils
from old_package.constants import ERROR_MESSAGES

class ModuleC:
    \"\"\"
    Another example class that uses old imports.
    This needs to be updated to use new package structure.
    \"\"\"
    
    def __init__(self):
        self.helper = utils.helper_function
        self.processor = AnotherClass()
        
    def complex_operation(self, data):
        \"\"\"Perform complex operation using legacy functions\"\"\"
        try:
            # Using old package functions
            step1 = legacy_function(data)
            step2 = self.helper(step1)
            step3 = utils.another_helper(step2)
            
            # Using old package class
            result = self.processor.process(step3)
            
            return result
        except Exception as e:
            for key, message in ERROR_MESSAGES.items():
                if str(e) in message:
                    return {"error": key, "message": message}
            
            return {"error": "unknown", "message": str(e)}
"""
    
    # Create readme with migration information
    readme = """# Module Migration Guide

The `old_package` module has been reorganized into a new structure.

## Migration Map

| Old Import | New Import |
|------------|------------|
| `from old_package import legacy_function` | `from new_package.core import legacy_function` |
| `from old_package import AnotherClass` | `from new_package.processors import AnotherClass` |
| `from old_package.utils import helper_function` | `from new_package.helpers import helper_function` |
| `from old_package.utils import another_helper` | `from new_package.helpers import another_helper` |
| `from old_package.constants import MAX_RETRIES` | `from new_package.config import MAX_RETRIES` |
| `from old_package.constants import DEFAULT_TIMEOUT` | `from new_package.config import DEFAULT_TIMEOUT` |
| `from old_package.constants import ERROR_MESSAGES` | `from new_package.config import ERROR_MESSAGES` |

## Example

Before:
```python
from old_package import legacy_function
from old_package.utils import helper_function
from old_package.constants import MAX_RETRIES

result = legacy_function(helper_function(data), max_retries=MAX_RETRIES)
```

After:
```python
from new_package.core import legacy_function
from new_package.helpers import helper_function
from new_package.config import MAX_RETRIES

result = legacy_function(helper_function(data), max_retries=MAX_RETRIES)
```
"""
    
    # Create test file
    test_file = """#!/usr/bin/env python3
\"\"\"
Tests for the modules with updated imports.
These tests should pass with both the old and new import structure.
\"\"\"

import pytest
from unittest.mock import patch, MagicMock

# Try to import modules (will fail if files don't exist)
try:
    # First try the refactored versions
    from tasks.multi_file_update.module_a_refactored import ModuleA
    from tasks.multi_file_update.module_b_refactored import process_batch
    from tasks.multi_file_update.module_c_refactored import ModuleC
    using_refactored = True
except ImportError:
    # Fall back to original versions
    try:
        from tasks.multi_file_update.module_a import ModuleA
        from tasks.multi_file_update.module_b import process_batch
        from tasks.multi_file_update.module_c import ModuleC
        using_refactored = False
    except ImportError:
        # For local development
        from module_a import ModuleA
        from module_b import process_batch
        from module_c import ModuleC
        using_refactored = False

# Create a consistent patching decorator based on which version we're using
if using_refactored:
    # Use patches for the new package structure
    patch_legacy_function = patch('new_package.core.legacy_function')
    patch_helper_function = patch('new_package.helpers.helper_function')
    patch_another_helper = patch('new_package.helpers.another_helper')
    patch_another_class = patch('new_package.processors.AnotherClass')
else:
    # Use patches for the old package structure
    patch_legacy_function = patch('old_package.legacy_function')
    patch_helper_function = patch('old_package.utils.helper_function')
    patch_another_helper = patch('old_package.utils.another_helper')
    patch_another_class = patch('old_package.AnotherClass')

# Tests for ModuleA
class TestModuleA:
    @patch_legacy_function
    @patch_helper_function
    @patch_another_class
    def test_process_data(self, mock_class, mock_helper, mock_legacy):
        # Set up mocks
        mock_legacy.return_value = "processed"
        mock_helper.return_value = "helped"
        
        mock_instance = MagicMock()
        mock_instance.process.return_value = "result"
        mock_class.return_value = mock_instance
        
        # Create instance and call method
        module_a = ModuleA()
        result = module_a.process_data("data")
        
        # Verify interactions
        mock_legacy.assert_called_once_with("data")
        mock_helper.assert_called_once_with("processed")
        mock_instance.process.assert_called_once_with("helped")
        
        # Verify result
        assert result == "result"

# Tests for module_b
@patch_legacy_function
@patch_helper_function
@patch_another_helper
def test_process_batch(mock_another, mock_helper, mock_legacy):
    # Set up mocks
    mock_legacy.side_effect = lambda x: f"processed_{x}"
    mock_helper.side_effect = lambda x: f"helped_{x}"
    mock_another.side_effect = lambda x, timeout: f"extra_{x}"
    
    # Call function
    result = process_batch(["a", "b"])
    
    # Verify interactions
    assert mock_legacy.call_count == 2
    assert mock_helper.call_count == 2
    assert mock_another.call_count == 2
    
    # Verify result
    assert result == ["extra_helped_processed_a", "extra_helped_processed_b"]

# Tests for ModuleC
class TestModuleC:
    @patch_legacy_function
    @patch_helper_function
    @patch_another_helper
    @patch_another_class
    def test_complex_operation(self, mock_class, mock_another, mock_helper, mock_legacy):
        # Set up mocks
        mock_legacy.return_value = "step1"
        mock_helper.return_value = "step2"
        mock_another.return_value = "step3"
        
        mock_instance = MagicMock()
        mock_instance.process.return_value = "result"
        mock_class.return_value = mock_instance
        
        # Create instance and call method
        module_c = ModuleC()
        
        # Need to override the helper reference after init
        if using_refactored:
            import new_package.helpers
            module_c.helper = new_package.helpers.helper_function
        else:
            import old_package.utils
            module_c.helper = old_package.utils.helper_function
            
        result = module_c.complex_operation("data")
        
        # Verify result
        assert result == "result"
        
    @patch_legacy_function
    def test_complex_operation_error(self, mock_legacy):
        # Set up mock to raise exception
        mock_legacy.side_effect = Exception("test error")
        
        # Create instance and call method
        module_c = ModuleC()
        result = module_c.complex_operation("data")
        
        # Verify error handling
        assert "error" in result
        assert "message" in result
"""
    
    # Create task specification
    task_spec = {
        "title": "Update module imports across multiple files",
        "file": [
            "tasks/multi_file_update/module_a.py",
            "tasks/multi_file_update/module_b.py",
            "tasks/multi_file_update/module_c.py"
        ],
        "target_files": [
            "tasks/multi_file_update/module_a_refactored.py",
            "tasks/multi_file_update/module_b_refactored.py",
            "tasks/multi_file_update/module_c_refactored.py"
        ],
        "description": "Update imports in multiple files to use the new package structure, following the migration guide",
        "criteria": [
            "All imports updated to use new package structure",
            "No references to old_package remain",
            "All functionality preserved",
            "All tests pass with the refactored code",
            "Code behavior is unchanged"
        ],
        "reference_docs": [
            "tasks/multi_file_update/README.md"
        ],
        "difficulty": "medium",
        "expected_changes": [
            "Replace all imports from old_package with corresponding new_package imports",
            "Update all module references to use the new structure",
            "Ensure all tests pass with the new structure"
        ]
    }
    
    # Write files
    with open(os.path.join(task_dir, 'module_a.py'), 'w') as f:
        f.write(module_a)
    
    with open(os.path.join(task_dir, 'module_b.py'), 'w') as f:
        f.write(module_b)
    
    with open(os.path.join(task_dir, 'module_c.py'), 'w') as f:
        f.write(module_c)
    
    with open(os.path.join(task_dir, 'README.md'), 'w') as f:
        f.write(readme)
    
    with open(os.path.join(task_dir, 'test_modules.py'), 'w') as f:
        f.write(test_file)
    
    with open(os.path.join(task_dir, 'task_spec.json'), 'w') as f:
        json.dump(task_spec, f, indent=2)
    
    print(f"Created multi-file update task in {task_dir}")

def create_security_enhancement_task():
    """Create the security enhancement task"""
    task_id = 'security_enhancement'
    task_dir = os.path.join('tasks', task_id)
    
    # Create directory
    create_task_directory(task_id)
    
    # Check if directory already has content
    if os.path.exists(os.path.join(task_dir, 'api_endpoint.py')):
        print(f"Security enhancement task already set up in {task_dir}")
        return
    
    # Create API endpoint file
    api_endpoint = """#!/usr/bin/env python3
\"\"\"
API endpoint with security vulnerabilities that need fixing.
This module has several security issues that need to be addressed.
\"\"\"

import os
import json
import subprocess
import sqlite3
from flask import Flask, request, jsonify

app = Flask(__name__)

# Database connection
def get_db_connection():
    \"\"\"Get a connection to the SQLite database\"\"\"
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# Vulnerable API endpoints
@app.route('/api/users', methods=['GET'])
def get_users():
    \"\"\"Get users by name (has SQL injection vulnerability)\"\"\"
    # Vulnerable code - directly interpolates user input into SQL query
    name = request.args.get('name', '')
    
    conn = get_db_connection()
    query = f"SELECT * FROM users WHERE name LIKE '%{name}%'"
    users = conn.execute(query).fetchall()
    conn.close()
    
    return jsonify([dict(user) for user in users])

@app.route('/api/execute', methods=['POST'])
def execute_command():
    \"\"\"Execute a command (has command injection vulnerability)\"\"\"
    # Vulnerable code - directly executes user input
    data = request.get_json()
    command = data.get('command', '')
    
    output = subprocess.check_output(command, shell=True)
    
    return jsonify({'output': output.decode()})

@app.route('/api/files/<path:filename>', methods=['GET'])
def get_file(filename):
    \"\"\"Get file contents (has path traversal vulnerability)\"\"\"
    # Vulnerable code - doesn't validate file path
    file_path = os.path.join('files', filename)
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    return jsonify({'filename': filename, 'content': content})

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    \"\"\"Update user (has no input validation)\"\"\"
    # Vulnerable code - no input validation
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    role = data.get('role')
    
    conn = get_db_connection()
    conn.execute(
        'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
        (name, email, role, user_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/login', methods=['POST'])
def login():
    \"\"\"Login endpoint (has authentication vulnerabilities)\"\"\"
    # Vulnerable code - insecure authentication
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    user = conn.execute(query).fetchone()
    conn.close()
    
    if user:
        # Vulnerable - creates session without proper security
        return jsonify({
            'success': True,
            'user_id': user['id'],
            'role': user['role'],
            'api_key': 'static-api-key-for-all-users'  # Insecure static API key
        })
    else:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@app.route('/api/logs', methods=['GET'])
def get_logs():
    \"\"\"Get application logs (has information disclosure vulnerability)\"\"\"
    # Vulnerable code - returns sensitive information
    level = request.args.get('level', 'info')
    
    logs = [
        {"level": "debug", "message": "Database password: dbpass123", "timestamp": "2025-01-01T00:00:01Z"},
        {"level": "info", "message": "User logged in", "timestamp": "2025-01-01T00:01:00Z"},
        {"level": "error", "message": "Failed login attempt", "timestamp": "2025-01-01T00:02:00Z"},
        {"level": "debug", "message": "API KEY: api123secret", "timestamp": "2025-01-01T00:03:00Z"}
    ]
    
    if level != 'all':
        logs = [log for log in logs if log['level'] == level]
    
    return jsonify(logs)

if __name__ == '__main__':
    app.run(debug=True)
"""
    
    # Create test file
    test_file = """#!/usr/bin/env python3
\"\"\"
Tests for the API endpoints security improvements.
These tests should pass with both the original and secured implementation.
\"\"\"

import pytest
import json
import sqlite3
import os
import tempfile
from unittest.mock import patch, MagicMock

# Try to import the module (will fail if file doesn't exist)
try:
    # Try the secured version first
    from tasks.security_enhancement.api_endpoint_secured import app, get_db_connection
    using_secured = True
except ImportError:
    # Fall back to original version
    try:
        from tasks.security_enhancement.api_endpoint import app, get_db_connection
        using_secured = False
    except ImportError:
        # For local development
        from api_endpoint import app, get_db_connection
        using_secured = False

@pytest.fixture
def client():
    \"\"\"Create a test client for the Flask app\"\"\"
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def mock_db():
    \"\"\"Mock the database connection and cursor\"\"\"
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.execute.return_value = mock_cursor
    mock_conn.cursor.return_value = mock_cursor
    
    with patch('sqlite3.connect') as mock_connect:
        mock_connect.return_value = mock_conn
        yield mock_conn, mock_cursor

def test_get_users(client, mock_db):
    \"\"\"Test the /api/users endpoint\"\"\"
    mock_conn, mock_cursor = mock_db
    
    # Mock the fetchall result
    mock_users = [
        {"id": 1, "name": "Alice", "email": "alice@example.com"},
        {"id": 2, "name": "Bob", "email": "bob@example.com"}
    ]
    mock_cursor.fetchall.return_value = mock_users
    
    # Test with normal input
    response = client.get('/api/users?name=Alice')
    assert response.status_code == 200
    
    # If using secured version, check for SQL injection prevention
    if using_secured:
        # The correct behavior is to use parameterized queries
        # Check if execute was called with parameters rather than f-string
        call_args = mock_conn.execute.call_args[0]
        assert "?" in call_args[0] or "%s" in call_args[0]
    
    # Test with SQL injection attempt
    response = client.get('/api/users?name=Alice\' OR \'1\'=\'1')
    assert response.status_code == 200  # Should still return 200
    
    # For secured version, this should not cause an exception or return all users
    # We can't fully test this without a real database, but we can check the query logic

def test_execute_command(client):
    \"\"\"Test the /api/execute endpoint\"\"\"
    with patch('subprocess.check_output') as mock_subprocess:
        mock_subprocess.return_value = b"command output"
        
        # Test with normal input
        response = client.post('/api/execute', 
                              json={"command": "echo hello"})
        assert response.status_code == 200
        
        # If using secured version, check for command injection prevention
        if using_secured:
            # Should validate or block dangerous commands
            response = client.post('/api/execute', 
                                  json={"command": "rm -rf /"})
            assert response.status_code != 200
            
            # Should reject shell metacharacters
            response = client.post('/api/execute', 
                                  json={"command": "echo hello; rm -rf /"})
            assert response.status_code != 200

@patch('os.path.join')
@patch('builtins.open', new_callable=MagicMock)
def test_get_file(mock_open, mock_join, client):
    \"\"\"Test the /api/files endpoint\"\"\"
    mock_file = MagicMock()
    mock_file.__enter__.return_value.read.return_value = "file content"
    mock_open.return_value = mock_file
    
    mock_join.return_value = "files/test.txt"
    
    # Test with normal input
    response = client.get('/api/files/test.txt')
    assert response.status_code == 200
    
    # If using secured version, check for path traversal prevention
    if using_secured:
        # Should prevent path traversal
        response = client.get('/api/files/../../../etc/passwd')
        assert response.status_code != 200

def test_update_user(client, mock_db):
    \"\"\"Test the /api/users/<id> endpoint\"\"\"
    mock_conn, mock_cursor = mock_db
    
    # Test with normal input
    response = client.put('/api/users/1', 
                         json={"name": "Alice", "email": "alice@example.com", "role": "user"})
    assert response.status_code == 200
    
    # If using secured version, check for input validation
    if using_secured:
        # Should validate email format
        response = client.put('/api/users/1', 
                             json={"name": "Alice", "email": "not-an-email", "role": "user"})
        assert response.status_code != 200
        
        # Should validate role
        response = client.put('/api/users/1', 
                             json={"name": "Alice", "email": "alice@example.com", "role": "admin"})
        # Should reject unauthorized role changes or validate role values
        # This test depends on specific implementation details
        pass

def test_login(client, mock_db):
    \"\"\"Test the /api/login endpoint\"\"\"
    mock_conn, mock_cursor = mock_db
    
    # Mock the fetchone result
    mock_user = {"id": 1, "username": "alice", "password": "hashed_password", "role": "user"}
    mock_cursor.fetchone.return_value = mock_user
    
    # Test with normal input
    response = client.post('/api/login', 
                          json={"username": "alice", "password": "password123"})
    assert response.status_code == 200
    
    # If using secured version, check for SQL injection prevention
    if using_secured:
        # The correct behavior is to use parameterized queries
        call_args = mock_conn.execute.call_args[0]
        assert "?" in call_args[0] or "%s" in call_args[0]
        
        # Should not return sensitive information
        result = json.loads(response.data)
        assert 'api_key' not in result or result['api_key'] != 'static-api-key-for-all-users'

def test_get_logs(client):
    \"\"\"Test the /api/logs endpoint\"\"\"
    # Test with normal input
    response = client.get('/api/logs?level=info')
    assert response.status_code == 200
    
    # If using secured version, check for information disclosure prevention
    if using_secured:
        # Should not return sensitive logs
        response = client.get('/api/logs?level=debug')
        result = json.loads(response.data)
        
        # Check that sensitive information is not leaked
        for log in result:
            assert 'password' not in log['message'].lower()
            assert 'api key' not in log['message'].lower()
"""
    
    # Create task specification
    task_spec = {
        "title": "Enhance API endpoint security",
        "file": "tasks/security_enhancement/api_endpoint.py",
        "target_file": "tasks/security_enhancement/api_endpoint_secured.py",
        "description": "Fix security vulnerabilities in the API endpoints",
        "criteria": [
            "Fix SQL injection vulnerabilities",
            "Fix command injection vulnerabilities",
            "Fix path traversal vulnerabilities",
            "Add input validation for all endpoints",
            "Fix authentication and authorization issues",
            "Prevent information disclosure",
            "Pass all security tests",
            "Maintain API compatibility where possible"
        ],
        "reference_docs": [
            "https://owasp.org/www-project-top-ten/",
            "https://flask.palletsprojects.com/en/2.0.x/security/"
        ],
        "difficulty": "hard",
        "expected_changes": [
            "Use parameterized queries instead of string interpolation",
            "Validate and sanitize all user input",
            "Implement proper authorization checks",
            "Fix file path handling to prevent traversal",
            "Secure command execution or remove if possible",
            "Remove sensitive information from logs",
            "Implement secure authentication practices"
        ]
    }
    
    # Write files
    with open(os.path.join(task_dir, 'api_endpoint.py'), 'w') as f:
        f.write(api_endpoint)
    
    with open(os.path.join(task_dir, 'test_api_endpoints.py'), 'w') as f:
        f.write(test_file)
    
    with open(os.path.join(task_dir, 'task_spec.json'), 'w') as f:
        json.dump(task_spec, f, indent=2)
    
    print(f"Created security enhancement task in {task_dir}")

def create_directories():
    """Create the basic directory structure"""
    # Create base directories
    os.makedirs('tasks', exist_ok=True)
    os.makedirs('reports', exist_ok=True)
    
    print("Created base directories")

def main():
    parser = argparse.ArgumentParser(description="Set up tasks for agent benchmarking")
    parser.add_argument('--task', help='Specific task to set up (all if not specified)')
    parser.add_argument('--source', help='Source directory to copy task from (optional)')
    
    args = parser.parse_args()
    
    # Create basic directory structure
    create_directories()
    
    if args.task:
        # Set up specific task
        if args.task == 'legacy_refactor':
            create_legacy_refactor_task()
        elif args.task == 'multi_file_update':
            create_multi_file_update_task()
        elif args.task == 'security_enhancement':
            create_security_enhancement_task()
        else:
            # Create custom task
            create_task_directory(args.task, args.source)
    else:
        # Set up all standard tasks
        create_legacy_refactor_task()
        create_multi_file_update_task()
        create_security_enhancement_task()
    
    print("\nTask setup complete!")
    print("To run benchmarks, use: python agent_benchmark.py --task <task_id>")

if __name__ == "__main__":
    main()