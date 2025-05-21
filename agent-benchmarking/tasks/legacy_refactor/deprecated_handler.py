#!/usr/bin/env python3
"""
Deprecated API Handler that needs to be refactored.

This module contains a legacy API handler that uses the deprecated
requests library for HTTP calls. It should be refactored to use 
the more modern httpx library with async/await patterns.
"""

import time
import json
import logging
from typing import Dict, Any, Optional, List, Union
import requests
from requests.exceptions import RequestException, Timeout

logger = logging.getLogger(__name__)

class DeprecatedAPIHandler:
    """
    Legacy API handler that needs to be updated to use httpx instead of requests.
    This class should be refactored to use async patterns with httpx.
    """
    
    def __init__(self, base_url: str, api_key: Optional[str] = None, timeout: int = 10):
        """
        Initialize the API handler.
        
        Args:
            base_url: The base URL for API requests
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds (default: 10)
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        
        # Configure headers
        self.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'
            
    def get_resource(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Get a resource from the API.
        
        Args:
            endpoint: API endpoint path
            params: Optional query parameters
            
        Returns:
            API response data as dictionary
            
        Raises:
            ValueError: If the request fails
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        logger.debug(f"Making GET request to {url}")
        
        try:
            response = self.session.get(
                url,
                params=params,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Timeout:
            logger.error(f"Request to {url} timed out after {self.timeout} seconds")
            raise ValueError(f"API request timed out: {url}")
        except RequestException as e:
            logger.error(f"Request to {url} failed: {str(e)}")
            raise ValueError(f"API request failed: {str(e)}")
            
    def create_resource(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a resource via the API.
        
        Args:
            endpoint: API endpoint path
            data: Data to send in the request body
            
        Returns:
            API response data as dictionary
            
        Raises:
            ValueError: If the request fails
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        logger.debug(f"Making POST request to {url}")
        
        try:
            response = self.session.post(
                url,
                json=data,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Timeout:
            logger.error(f"Request to {url} timed out after {self.timeout} seconds")
            raise ValueError(f"API request timed out: {url}")
        except RequestException as e:
            logger.error(f"Request to {url} failed: {str(e)}")
            raise ValueError(f"API request failed: {str(e)}")
            
    def update_resource(self, endpoint: str, resource_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a resource via the API.
        
        Args:
            endpoint: API endpoint path
            resource_id: ID of the resource to update
            data: Data to send in the request body
            
        Returns:
            API response data as dictionary
            
        Raises:
            ValueError: If the request fails
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}/{resource_id}"
        logger.debug(f"Making PUT request to {url}")
        
        try:
            response = self.session.put(
                url,
                json=data,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Timeout:
            logger.error(f"Request to {url} timed out after {self.timeout} seconds")
            raise ValueError(f"API request timed out: {url}")
        except RequestException as e:
            logger.error(f"Request to {url} failed: {str(e)}")
            raise ValueError(f"API request failed: {str(e)}")
            
    def delete_resource(self, endpoint: str, resource_id: str) -> bool:
        """
        Delete a resource via the API.
        
        Args:
            endpoint: API endpoint path
            resource_id: ID of the resource to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            ValueError: If the request fails
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}/{resource_id}"
        logger.debug(f"Making DELETE request to {url}")
        
        try:
            response = self.session.delete(
                url,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return True
        except Timeout:
            logger.error(f"Request to {url} timed out after {self.timeout} seconds")
            raise ValueError(f"API request timed out: {url}")
        except RequestException as e:
            logger.error(f"Request to {url} failed: {str(e)}")
            raise ValueError(f"API request failed: {str(e)}")
            
    def batch_get_resources(self, endpoint: str, resource_ids: List[str]) -> Dict[str, Any]:
        """
        Get multiple resources in a batch request.
        
        Args:
            endpoint: API endpoint path
            resource_ids: List of resource IDs to fetch
            
        Returns:
            Dictionary mapping resource IDs to their data
            
        Raises:
            ValueError: If the batch request fails
        """
        results = {}
        for resource_id in resource_ids:
            try:
                # Individual GET requests - could be optimized in a real API
                url = f"{self.base_url}/{endpoint.lstrip('/')}/{resource_id}"
                response = self.session.get(
                    url,
                    headers=self.headers,
                    timeout=self.timeout
                )
                response.raise_for_status()
                results[resource_id] = response.json()
            except RequestException as e:
                logger.warning(f"Failed to get resource {resource_id}: {str(e)}")
                results[resource_id] = None
                
        return results
        
    def search_resources(self, endpoint: str, query: str, 
                      filters: Optional[Dict[str, Any]] = None, 
                      max_results: int = 100) -> List[Dict[str, Any]]:
        """
        Search for resources matching query and filters.
        
        Args:
            endpoint: API endpoint path
            query: Search query string
            filters: Optional filters to apply
            max_results: Maximum number of results to return
            
        Returns:
            List of matching resources
            
        Raises:
            ValueError: If the search request fails
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}/search"
        params = {
            'q': query,
            'limit': max_results
        }
        
        if filters:
            params.update(filters)
            
        logger.debug(f"Making GET request to {url} with params {params}")
        
        try:
            response = self.session.get(
                url,
                params=params,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json().get('results', [])
        except Timeout:
            logger.error(f"Request to {url} timed out after {self.timeout} seconds")
            raise ValueError(f"API request timed out: {url}")
        except RequestException as e:
            logger.error(f"Request to {url} failed: {str(e)}")
            raise ValueError(f"API request failed: {str(e)}")
            
    def close(self):
        """Close the requests session."""
        self.session.close()
        
    def __enter__(self):
        """Support for context manager."""
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close session when exiting context."""
        self.close()


# Example usage
if __name__ == "__main__":
    # Example usage of the API handler
    handler = DeprecatedAPIHandler(
        base_url="https://api.example.com/v1",
        api_key="sample_key_123",
        timeout=5
    )
    
    try:
        # Example GET request
        users = handler.get_resource("users")
        print(f"Found {len(users)} users")
        
        # Example POST request
        new_user = handler.create_resource("users", {
            "name": "John Doe",
            "email": "john@example.com"
        })
        print(f"Created user with ID: {new_user['id']}")
        
        # Example PUT request
        updated_user = handler.update_resource("users", new_user['id'], {
            "name": "John Doe Jr",
            "email": "john@example.com"
        })
        print(f"Updated user: {updated_user['name']}")
        
        # Example search
        search_results = handler.search_resources("users", "john")
        print(f"Search found {len(search_results)} results")
        
    finally:
        # Close the session
        handler.close()