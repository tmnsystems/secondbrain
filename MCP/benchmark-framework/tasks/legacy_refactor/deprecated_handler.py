#!/usr/bin/env python3
"""
Deprecated HTTP handler implementation that needs refactoring.
This module uses the legacy 'requests' library which should be 
replaced with the more modern async 'httpx' client.
"""

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
    """
    Legacy API handler that needs to be updated to use httpx instead of requests.
    This class should be refactored to use async patterns with httpx.
    """
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        """Initialize the API handler with base URL and optional API key."""
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
        """Build full URL from endpoint path."""
        endpoint = endpoint.lstrip('/')
        return f"{self.base_url}/{endpoint}"
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Process API response and handle errors."""
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
        """Send GET request to API endpoint."""
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
        """Send POST request with JSON data to API endpoint."""
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
        """Send PUT request with JSON data to API endpoint."""
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
        """Send DELETE request to API endpoint."""
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
        """Upload file to API endpoint with optional extra form data."""
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
    """Exception raised for API errors."""
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