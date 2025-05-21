#!/usr/bin/env python3
"""
SecondBrain Notion Context Dashboard

This module provides a comprehensive Notion integration for the context persistence system:
1. Creates a rich, human-readable view of all extracted contexts
2. Builds relationship visualizations between connected contexts
3. Enables filtering and searching across the context database
4. Tracks context usage by different agents

FUNDAMENTAL PRINCIPLE: NEVER TRUNCATE OR SIMPLIFY CONTEXT IN NOTION
"""

import os
import json
import uuid
import datetime
import requests
from typing import List, Dict, Any, Optional, Tuple, Union
from dotenv import load_dotenv

# Import core context functionality
from context_persistence_system import (
    load_env,
    get_notion_headers,
    retrieve_context_by_id,
    search_contexts_semantic
)

# Constants
NOTION_API_BASE = "https://api.notion.com/v1"

class NotionContextDashboard:
    """
    Notion Dashboard for Context Visualization
    
    Creates and manages a comprehensive Notion workspace for context visibility.
    """
    
    def __init__(self):
        """Initialize the Notion Context Dashboard."""
        # Load environment variables
        load_env()
        
        self.headers = get_notion_headers()
        self.parent_page_id = os.getenv('NOTION_PARENT_PAGE_ID')
        self.context_db_id = os.getenv('NOTION_CONTEXT_DB_ID')
        
        # Ensure we have the necessary IDs
        if not self.parent_page_id or not self.context_db_id:
            raise ValueError("Missing Notion parent page ID or context database ID")
    
    def setup_dashboard(self) -> Dict[str, str]:
        """
        Set up the complete dashboard structure in Notion.
        
        Returns:
            Dictionary mapping dashboard component names to their Notion IDs
        """
        dashboard_ids = {}
        
        # 1. Create the dashboard overview page
        overview_page_id = self._create_overview_page()
        dashboard_ids["overview"] = overview_page_id
        
        # 2. Create the context relationship database
        relationships_db_id = self._create_relationships_database(overview_page_id)
        dashboard_ids["relationships"] = relationships_db_id
        
        # 3. Create the context usage database (which agents used which contexts)
        usage_db_id = self._create_usage_database(overview_page_id)
        dashboard_ids["usage"] = usage_db_id
        
        # 4. Create the context statistics database
        stats_db_id = self._create_stats_database(overview_page_id)
        dashboard_ids["stats"] = stats_db_id
        
        # 5. Add views to the main context database
        self._enhance_context_database_views()
        
        # Store the dashboard IDs in environment for future use
        self._update_env_file("NOTION_CONTEXT_DASHBOARD", json.dumps(dashboard_ids))
        
        return dashboard_ids
    
    def _create_overview_page(self) -> str:
        """
        Create the dashboard overview page.
        
        Returns:
            Notion page ID
        """
        page_data = {
            "parent": {"page_id": self.parent_page_id},
            "properties": {
                "title": [{"text": {"content": "SecondBrain Context Dashboard"}}]
            },
            "children": [
                {
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": [{"type": "text", "text": {"content": "Context Preservation System"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": "This dashboard provides a comprehensive view of the SecondBrain context preservation system. It shows all extracted contexts with their full richness preserved, never truncated or simplified."}}]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": "FUNDAMENTAL PRINCIPLE: NEVER TRUNCATE OR SIMPLIFY CONTEXT"}}],
                    }
                },
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": "Dashboard Components"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": "Context Database: All extracted contexts with full preservation"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": "Relationships: Connections between related contexts"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": "Usage Tracking: Which agents accessed which contexts"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": "Statistics: Metrics about the context system"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": "Context Database"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": "Below is the full context database with all extracted contexts:"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "link_to_page",
                    "link_to_page": {
                        "type": "database_id",
                        "database_id": self.context_db_id
                    }
                }
            ]
        }
        
        response = requests.post(
            f"{NOTION_API_BASE}/pages",
            headers=self.headers,
            json=page_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create overview page: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def _create_relationships_database(self, parent_page_id: str) -> str:
        """
        Create the context relationships database.
        
        Args:
            parent_page_id: Parent page to create the database in
            
        Returns:
            Notion database ID
        """
        db_data = {
            "parent": {"page_id": parent_page_id},
            "title": [{"type": "text", "text": {"content": "Context Relationships"}}],
            "properties": {
                "Name": {"title": {}},
                "Source Context": {
                    "relation": {
                        "database_id": self.context_db_id,
                        "single_property": {}
                    }
                },
                "Target Context": {
                    "relation": {
                        "database_id": self.context_db_id,
                        "single_property": {}
                    }
                },
                "Relation Type": {
                    "select": {
                        "options": [
                            {"name": "explicit", "color": "blue"},
                            {"name": "implicit", "color": "green"},
                            {"name": "chronological", "color": "yellow"},
                            {"name": "semantic", "color": "purple"}
                        ]
                    }
                },
                "Strength": {"number": {"format": "percent"}},
                "Created At": {"date": {}}
            }
        }
        
        response = requests.post(
            f"{NOTION_API_BASE}/databases",
            headers=self.headers,
            json=db_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create relationships database: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def _create_usage_database(self, parent_page_id: str) -> str:
        """
        Create the context usage tracking database.
        
        Args:
            parent_page_id: Parent page to create the database in
            
        Returns:
            Notion database ID
        """
        db_data = {
            "parent": {"page_id": parent_page_id},
            "title": [{"type": "text", "text": {"content": "Context Usage Tracking"}}],
            "properties": {
                "Name": {"title": {}},
                "Context": {
                    "relation": {
                        "database_id": self.context_db_id,
                        "single_property": {}
                    }
                },
                "Agent Type": {
                    "select": {
                        "options": [
                            {"name": "PlannerAgent", "color": "blue"},
                            {"name": "ExecutorAgent", "color": "green"},
                            {"name": "ReviewerAgent", "color": "yellow"},
                            {"name": "BuildAgent", "color": "purple"},
                            {"name": "RefactorAgent", "color": "pink"},
                            {"name": "OrchestratorAgent", "color": "orange"},
                            {"name": "NotionAgent", "color": "red"}
                        ]
                    }
                },
                "Session ID": {"rich_text": {}},
                "Agent ID": {"rich_text": {}},
                "Query": {"rich_text": {}},
                "Relevance Score": {"number": {"format": "percent"}},
                "Accessed At": {"date": {}}
            }
        }
        
        response = requests.post(
            f"{NOTION_API_BASE}/databases",
            headers=self.headers,
            json=db_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create usage database: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def _create_stats_database(self, parent_page_id: str) -> str:
        """
        Create the context statistics database.
        
        Args:
            parent_page_id: Parent page to create the database in
            
        Returns:
            Notion database ID
        """
        db_data = {
            "parent": {"page_id": parent_page_id},
            "title": [{"type": "text", "text": {"content": "Context System Statistics"}}],
            "properties": {
                "Name": {"title": {}},
                "Date": {"date": {}},
                "Total Contexts": {"number": {}},
                "Metaphors": {"number": {}},
                "Values": {"number": {}},
                "Frameworks": {"number": {}},
                "Teachings": {"number": {}},
                "Most Used Context": {
                    "relation": {
                        "database_id": self.context_db_id,
                        "single_property": {}
                    }
                },
                "Most Active Agent": {
                    "select": {
                        "options": [
                            {"name": "PlannerAgent", "color": "blue"},
                            {"name": "ExecutorAgent", "color": "green"},
                            {"name": "ReviewerAgent", "color": "yellow"},
                            {"name": "BuildAgent", "color": "purple"},
                            {"name": "RefactorAgent", "color": "pink"},
                            {"name": "OrchestratorAgent", "color": "orange"},
                            {"name": "NotionAgent", "color": "red"}
                        ]
                    }
                },
                "Notes": {"rich_text": {}}
            }
        }
        
        response = requests.post(
            f"{NOTION_API_BASE}/databases",
            headers=self.headers,
            json=db_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create stats database: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def _enhance_context_database_views(self) -> None:
        """Enhance the main context database with additional views."""
        # Unfortunately, Notion API doesn't currently support creating or modifying views
        # This would need to be done manually in the Notion UI
        pass
    
    def _update_env_file(self, key: str, value: str) -> None:
        """
        Update a value in the .env file.
        
        Args:
            key: Environment variable key
            value: Environment variable value
        """
        env_path = "/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env"
        updated_lines = []
        key_exists = False
        
        # Read the existing file
        with open(env_path, 'r') as f:
            lines = f.readlines()
            
        # Update or add the key
        for line in lines:
            if line.strip().startswith(f"{key}="):
                updated_lines.append(f"{key}={value}\n")
                key_exists = True
            else:
                updated_lines.append(line)
        
        # Add the key if it doesn't exist
        if not key_exists:
            updated_lines.append(f"{key}={value}\n")
        
        # Write back to the file
        with open(env_path, 'w') as f:
            f.writelines(updated_lines)
            
        print(f"Updated {env_path} with {key}={value}")
    
    def create_context_page(self, context_obj: Dict[str, Any]) -> str:
        """
        Create a Notion page for a context object.
        
        Args:
            context_obj: The context object to create a page for
            
        Returns:
            Notion page ID
        """
        # Create a page in the contexts database
        page_data = {
            "parent": {"database_id": self.context_db_id},
            "properties": {
                "Name": {"title": [{"text": {"content": f"{context_obj['pattern_type']}: {context_obj['match_text'][:50]}..."}}]},
                "Pattern Type": {"select": {"name": context_obj["pattern_type"]}},
                "Source": {"rich_text": [{"text": {"content": context_obj["source"].get("file", "Unknown")}}]},
                "Session Type": {"select": {"name": context_obj["source"].get("session_type", "unknown")}},
                "Extracted": {"date": {"start": context_obj["timestamps"]["extracted"]}},
                "Tags": {"multi_select": [{"name": tag} for tag in context_obj["domain_tags"]]}
            },
            # Page content with full context preservation
            "children": self._format_context_page_content(context_obj)
        }
        
        response = requests.post(
            f"{NOTION_API_BASE}/pages",
            headers=self.headers,
            json=page_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create context page: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def _format_context_page_content(self, context_obj: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Format the content for a context page.
        
        Args:
            context_obj: The context object to format
            
        Returns:
            List of Notion block objects
        """
        blocks = [
            # Context Details heading
            {
                "object": "block",
                "type": "heading_1",
                "heading_1": {
                    "rich_text": [{"type": "text", "text": {"content": "Context Details"}}]
                }
            },
            # Context ID
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"ID: {context_obj['id']}"}}]
                }
            },
            # Full Context heading
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Full Context (Never Truncated)"}}]
                }
            },
            # Full context content
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": context_obj["full_context"]}}]
                }
            },
            # Speakers heading
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Speakers"}}]
                }
            }
        ]
        
        # Add blocks for each speaker's contributions
        for speaker in context_obj.get("speakers", []):
            for segment in speaker.get("segments", []):
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {"type": "text", "text": {"content": f"{speaker['name']}: "}, "annotations": {"bold": True}},
                            {"type": "text", "text": {"content": segment.get("text", "")}}
                        ]
                    }
                })
        
        # Add emotional markers section
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "Emotional Markers"}}]
            }
        })
        
        # Add blocks for emotional markers
        for marker in context_obj.get("emotional_markers", []):
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": f"{marker.get('type', 'unknown')}: {marker.get('description', '')}"}}]
                }
            })
        
        # Add related patterns section
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "Related Patterns"}}]
            }
        })
        
        # Add blocks for related patterns
        related_patterns = context_obj.get("related_patterns", [])
        if related_patterns:
            for related in related_patterns:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": f"ID: {related.get('id', 'unknown')}, Type: {related.get('relation_type', 'Unknown')}, Strength: {related.get('strength', 0)}"}}]
                    }
                })
        else:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": "No related patterns identified."}}]
                }
            })
        
        # Add metadata section
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "Metadata"}}]
            }
        })
        
        # Add source information
        source_info = context_obj.get("source", {})
        metadata_text = f"File: {source_info.get('file', 'Unknown')}\n"
        
        if source_info.get("date"):
            metadata_text += f"Date: {source_info.get('date')}\n"
            
        if source_info.get("session_type"):
            metadata_text += f"Session Type: {source_info.get('session_type')}\n"
            
        if source_info.get("participants"):
            metadata_text += f"Participants: {', '.join(source_info.get('participants', []))}\n"
        
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": metadata_text}}]
            }
        })
        
        return blocks
    
    def record_relationship(self, 
                           source_context_id: str, 
                           target_context_id: str, 
                           relation_type: str, 
                           strength: float) -> str:
        """
        Record a relationship between two contexts in Notion.
        
        Args:
            source_context_id: ID of the source context
            target_context_id: ID of the target context
            relation_type: Type of relationship
            strength: Relationship strength (0.0 to 1.0)
            
        Returns:
            Notion page ID for the relationship
        """
        dashboard_ids = json.loads(os.getenv('NOTION_CONTEXT_DASHBOARD', '{}'))
        relationships_db_id = dashboard_ids.get('relationships')
        
        if not relationships_db_id:
            raise ValueError("Relationships database ID not found")
        
        # Get context page IDs from the context database
        source_notion_id = self._get_notion_page_id_for_context(source_context_id)
        target_notion_id = self._get_notion_page_id_for_context(target_context_id)
        
        if not source_notion_id or not target_notion_id:
            raise ValueError("Could not find Notion page IDs for contexts")
        
        # Create a relationship page
        page_data = {
            "parent": {"database_id": relationships_db_id},
            "properties": {
                "Name": {"title": [{"text": {"content": f"Relationship: {relation_type}"}}]},
                "Source Context": {"relation": [{"id": source_notion_id}]},
                "Target Context": {"relation": [{"id": target_notion_id}]},
                "Relation Type": {"select": {"name": relation_type}},
                "Strength": {"number": strength},
                "Created At": {"date": {"start": datetime.datetime.now().isoformat()}}
            }
        }
        
        response = requests.post(
            f"{NOTION_API_BASE}/pages",
            headers=self.headers,
            json=page_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create relationship: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def record_context_usage(self,
                            context_id: str,
                            agent_type: str,
                            agent_id: str,
                            session_id: Optional[str],
                            query: str,
                            relevance_score: float) -> str:
        """
        Record context usage by an agent in Notion.
        
        Args:
            context_id: ID of the used context
            agent_type: Type of agent
            agent_id: ID of the agent instance
            session_id: ID of the session or None
            query: Query that triggered the context
            relevance_score: How relevant the context was (0.0 to 1.0)
            
        Returns:
            Notion page ID for the usage record
        """
        dashboard_ids = json.loads(os.getenv('NOTION_CONTEXT_DASHBOARD', '{}'))
        usage_db_id = dashboard_ids.get('usage')
        
        if not usage_db_id:
            raise ValueError("Usage database ID not found")
        
        # Get context page ID from the context database
        context_notion_id = self._get_notion_page_id_for_context(context_id)
        
        if not context_notion_id:
            raise ValueError(f"Could not find Notion page ID for context {context_id}")
        
        # Create a usage tracking page
        page_data = {
            "parent": {"database_id": usage_db_id},
            "properties": {
                "Name": {"title": [{"text": {"content": f"Usage: {agent_type}"}}]},
                "Context": {"relation": [{"id": context_notion_id}]},
                "Agent Type": {"select": {"name": agent_type}},
                "Agent ID": {"rich_text": [{"text": {"content": agent_id}}]},
                "Relevance Score": {"number": relevance_score},
                "Accessed At": {"date": {"start": datetime.datetime.now().isoformat()}}
            }
        }
        
        # Add session ID if provided
        if session_id:
            page_data["properties"]["Session ID"] = {"rich_text": [{"text": {"content": session_id}}]}
        
        # Add query if it's not too long (Notion has a limit for rich_text)
        if len(query) > 2000:
            query = query[:1997] + "..."
            
        page_data["properties"]["Query"] = {"rich_text": [{"text": {"content": query}}]}
        
        response = requests.post(
            f"{NOTION_API_BASE}/pages",
            headers=self.headers,
            json=page_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create usage record: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def update_statistics(self) -> str:
        """
        Update context system statistics in Notion.
        
        Returns:
            Notion page ID for the statistics record
        """
        dashboard_ids = json.loads(os.getenv('NOTION_CONTEXT_DASHBOARD', '{}'))
        stats_db_id = dashboard_ids.get('stats')
        
        if not stats_db_id:
            raise ValueError("Statistics database ID not found")
        
        # Count contexts by type
        context_counts = self._count_contexts_by_type()
        
        # Find most used context
        most_used_context = self._find_most_used_context()
        
        # Find most active agent
        most_active_agent = self._find_most_active_agent()
        
        # Create a statistics page
        page_data = {
            "parent": {"database_id": stats_db_id},
            "properties": {
                "Name": {"title": [{"text": {"content": f"Stats: {datetime.datetime.now().strftime('%Y-%m-%d')}"}}]},
                "Date": {"date": {"start": datetime.datetime.now().strftime('%Y-%m-%d')}},
                "Total Contexts": {"number": sum(context_counts.values())},
                "Metaphors": {"number": context_counts.get("metaphor", 0)},
                "Values": {"number": context_counts.get("value", 0)},
                "Frameworks": {"number": context_counts.get("framework", 0)},
                "Teachings": {"number": context_counts.get("teaching", 0)}
            }
        }
        
        # Add most used context if found
        if most_used_context:
            page_data["properties"]["Most Used Context"] = {"relation": [{"id": most_used_context}]}
        
        # Add most active agent if found
        if most_active_agent:
            page_data["properties"]["Most Active Agent"] = {"select": {"name": most_active_agent}}
        
        response = requests.post(
            f"{NOTION_API_BASE}/pages",
            headers=self.headers,
            json=page_data
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to create statistics record: {response.status_code} - {response.text}")
            
        return response.json()["id"]
    
    def _get_notion_page_id_for_context(self, context_id: str) -> Optional[str]:
        """
        Get the Notion page ID for a context.
        
        Args:
            context_id: The ID of the context
            
        Returns:
            Notion page ID if found, None otherwise
        """
        # Query the context database to find the page for this context
        query_data = {
            "filter": {
                "property": "Name",
                "rich_text": {
                    "contains": context_id
                }
            }
        }
        
        response = requests.post(
            f"{NOTION_API_BASE}/databases/{self.context_db_id}/query",
            headers=self.headers,
            json=query_data
        )
        
        if response.status_code != 200:
            print(f"Error querying context database: {response.status_code} - {response.text}")
            return None
            
        results = response.json().get("results", [])
        
        if not results:
            # Try checking in Redis for a cached mapping
            try:
                import redis
                from context_persistence_system import get_redis_client
                
                redis_client = get_redis_client()
                notion_page_id = redis_client.get(f"context:notion:{context_id}")
                
                if notion_page_id:
                    return notion_page_id.decode('utf-8') if isinstance(notion_page_id, bytes) else notion_page_id
            except Exception as e:
                print(f"Error checking Redis for Notion page ID: {e}")
            
            return None
            
        return results[0]["id"]
    
    def _count_contexts_by_type(self) -> Dict[str, int]:
        """
        Count contexts by type in Notion.
        
        Returns:
            Dictionary mapping context types to counts
        """
        counts = {"metaphor": 0, "value": 0, "framework": 0, "teaching": 0}
        
        # Query the context database to count by type
        for pattern_type in counts.keys():
            query_data = {
                "filter": {
                    "property": "Pattern Type",
                    "select": {
                        "equals": pattern_type
                    }
                }
            }
            
            response = requests.post(
                f"{NOTION_API_BASE}/databases/{self.context_db_id}/query",
                headers=self.headers,
                json=query_data
            )
            
            if response.status_code == 200:
                results = response.json().get("results", [])
                counts[pattern_type] = len(results)
        
        return counts
    
    def _find_most_used_context(self) -> Optional[str]:
        """
        Find the most used context in Notion.
        
        Returns:
            Notion page ID of the most used context or None
        """
        dashboard_ids = json.loads(os.getenv('NOTION_CONTEXT_DASHBOARD', '{}'))
        usage_db_id = dashboard_ids.get('usage')
        
        if not usage_db_id:
            return None
            
        # Unfortunately, the Notion API doesn't support aggregations
        # This would need to be calculated by fetching all usage records
        # and counting them - which could be very inefficient for large databases
        
        # For now, we'll just return None
        return None
    
    def _find_most_active_agent(self) -> Optional[str]:
        """
        Find the most active agent in Notion.
        
        Returns:
            Agent type of the most active agent or None
        """
        # Similar to most used context, this would need to be calculated
        # by fetching all usage records and counting them
        
        # For now, we'll just return None
        return None

# Generate a dummy context for testing
def generate_test_context() -> Dict[str, Any]:
    """
    Generate a test context object for dashboard testing.
    
    Returns:
        A test context object
    """
    return {
        "id": str(uuid.uuid4()),
        "pattern_type": "metaphor",
        "match_text": "business is like a garden",
        "full_context": """
When I talk about business systems, I often say that building a business is like tending a garden. You don't just plant seeds and walk away. You need to create the right conditions. You need good soil - that's your foundation, your principles and priorities. You need to water regularly - that's your consistent actions, the habits that move the business forward day by day.

And just like a garden, you can't rush it. You can't plant a seed today and pull on the sprout tomorrow expecting it to grow faster. Systems take time to establish. But once they're established, they create an ecosystem that can sustain itself with just the right amount of tending.

The beautiful thing about good business systems is that they continue to produce value even when you're not directly working on them. Just like how a well-established garden will continue to grow and produce while you're away on vacation - as long as you've set up the right systems for watering and maintenance.

This is why I always stress the importance of building systems that don't rely on your constant presence. Your business should be able to run without you being there every minute, just like a garden should be able to thrive even if you go away for a week or two.

Of course, this doesn't mean you can abandon your business entirely. Even the most self-sufficient garden needs weeding and pruning from time to time. But the goal is to create systems that handle the day-to-day operations, so you can focus on strategic growth and improvement.
        """,
        "extended_context": None,
        "speakers": [
            {
                "name": "Tina",
                "segments": [
                    {
                        "text": "When I talk about business systems, I often say that building a business is like tending a garden. You don't just plant seeds and walk away. You need to create the right conditions.",
                        "position": [1, 180]
                    }
                ]
            }
        ],
        "source": {
            "file": "transcript_for_business_systems_workshop.txt",
            "date": "2024-12-15",
            "session_type": "course",
            "participants": ["Tina", "Participants"]
        },
        "domain_tags": ["business", "systems"],
        "emotional_markers": [
            {
                "type": "emphasis",
                "position": [120, 130],
                "text": "consistent actions",
                "description": "Emphasized importance of consistency"
            }
        ],
        "related_patterns": [],
        "timestamps": {
            "extracted": datetime.datetime.now().isoformat(),
            "original": "2024-12-15"
        },
        "chronology": {}
    }

# Main execution
if __name__ == "__main__":
    import sys
    
    print("SecondBrain Notion Context Dashboard")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--setup":
        # Set up the dashboard
        dashboard = NotionContextDashboard()
        dashboard_ids = dashboard.setup_dashboard()
        print(f"Dashboard setup complete. Component IDs: {dashboard_ids}")
        
    elif len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Test the dashboard with a dummy context
        dashboard = NotionContextDashboard()
        
        # Generate a test context
        test_context = generate_test_context()
        
        # Create a context page
        print("Creating test context page...")
        page_id = dashboard.create_context_page(test_context)
        print(f"Context page created with ID: {page_id}")
        
        # Add a relationship (self-referential for testing)
        print("Creating test relationship...")
        rel_id = dashboard.record_relationship(
            test_context["id"],
            test_context["id"],
            "explicit",
            0.95
        )
        print(f"Relationship created with ID: {rel_id}")
        
        # Record usage
        print("Recording test usage...")
        usage_id = dashboard.record_context_usage(
            test_context["id"],
            "PlannerAgent",
            str(uuid.uuid4()),
            str(uuid.uuid4()),  # Fake session ID
            "How do I create sustainable business systems?",
            0.87
        )
        print(f"Usage record created with ID: {usage_id}")
        
        # Update statistics
        print("Updating statistics...")
        stats_id = dashboard.update_statistics()
        print(f"Statistics updated with ID: {stats_id}")
        
    else:
        print("Usage:")
        print("  --setup   Set up the Notion dashboard")
        print("  --test    Test the dashboard with a dummy context")