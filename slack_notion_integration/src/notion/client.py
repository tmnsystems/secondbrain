"""
Notion API client for the SecondBrain Slack-Notion integration.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from notion_client import Client
from ..models.schema import Task, NotionPage, AgentLog, TaskStep
from ..config.env import get_env_var

logger = logging.getLogger(__name__)

class NotionClient:
    """Client for interacting with the Notion API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Notion client.
        
        Args:
            api_key: Optional API key. If not provided, will be loaded from environment.
        """
        self.api_key = api_key or get_env_var("NOTION_API_KEY")
        if not self.api_key:
            raise ValueError("Notion API key is required")
        
        self.client = Client(auth=self.api_key)
        
        # Database IDs - these would be created and stored in a configuration file
        self.db_ids = {
            "tasks": None,  # Will be set after database creation
            "logs": None,   # Will be set after database creation
            "projects": None  # Will be set after database creation
        }
    
    def create_databases(self) -> Dict[str, str]:
        """
        Create the necessary databases in Notion.
        
        Returns:
            Dictionary mapping database names to their IDs.
        """
        # Search for existing pages to use as parent
        search_results = self.client.search(query="SecondBrain Project")
        
        parent_page = None
        # If we find an existing page with our title, use it
        for result in search_results.get("results", []):
            if (result.get("object") == "page" and 
                result.get("properties", {}).get("title", {}).get("title", []) and 
                result.get("properties", {}).get("title", {}).get("title", [])[0].get("text", {}).get("content") == "SecondBrain Project"):
                parent_page = result
                logger.info(f"Found existing parent page: {parent_page['id']}")
                break
        
        # If no existing page found, create a new one in a database
        if not parent_page:
            logger.info("No existing parent page found. Creating a new one.")
            # First search for databases we can access
            search_results = self.client.search(filter={"property": "object", "value": "database"})
            
            if not search_results.get("results"):
                raise ValueError("No databases found. Please share at least one database with this integration.")
            
            # Use the first database as parent
            db_id = search_results["results"][0]["id"]
            logger.info(f"Using database {db_id} as parent")
            
            # Create a parent page in the database
            parent_page = self.client.pages.create(
                parent={"database_id": db_id},
                properties={
                    "title": {"title": [{"text": {"content": "SecondBrain Project"}}]}
                }
            )
        
        # Create Tasks database
        tasks_db = self.create_database(
            parent={"type": "page_id", "page_id": parent_page["id"]},
            title=[{"text": {"content": "Tasks"}}],
            properties={
                "Title": {"title": {}},
                "ID": {"rich_text": {}},
                "Description": {"rich_text": {}},
                "Agent": {"select": {
                    "options": [
                        {"name": "planner", "color": "blue"},
                        {"name": "executor", "color": "green"},
                        {"name": "reviewer", "color": "orange"},
                        {"name": "notion", "color": "purple"},
                        {"name": "refactor", "color": "red"},
                        {"name": "orchestrator", "color": "default"}
                    ]
                }},
                "Status": {"select": {
                    "options": [
                        {"name": "pending", "color": "gray"},
                        {"name": "in_progress", "color": "blue"},
                        {"name": "completed", "color": "green"},
                        {"name": "needs_review", "color": "yellow"},
                        {"name": "failed", "color": "red"}
                    ]
                }},
                "Priority": {"select": {
                    "options": [
                        {"name": "low", "color": "gray"},
                        {"name": "medium", "color": "yellow"},
                        {"name": "high", "color": "orange"},
                        {"name": "critical", "color": "red"}
                    ]
                }},
                "Created At": {"date": {}},
                "Updated At": {"date": {}},
                "Deadline": {"date": {}},
                "Completed At": {"date": {}},
                "Slack Thread": {"url": {}},
                "Assigned By": {"rich_text": {}},
                "Reviewed By": {"rich_text": {}}
            }
        )
        
        # Create Logs database
        logs_db = self.create_database(
            parent={"type": "page_id", "page_id": parent_page["id"]},
            title=[{"text": {"content": "Agent Logs"}}],
            properties={
                "Title": {"title": {}},
                "ID": {"rich_text": {}},
                "Agent": {"select": {
                    "options": [
                        {"name": "planner", "color": "blue"},
                        {"name": "executor", "color": "green"},
                        {"name": "reviewer", "color": "orange"},
                        {"name": "notion", "color": "purple"},
                        {"name": "refactor", "color": "red"},
                        {"name": "orchestrator", "color": "default"}
                    ]
                }},
                "Task ID": {"rich_text": {}},
                "Action": {"rich_text": {}},
                "Timestamp": {"date": {}},
                "Slack Message": {"url": {}}
            }
        )
        
        # Create Projects database
        projects_db = self.create_database(
            parent={"type": "page_id", "page_id": parent_page["id"]},
            title=[{"text": {"content": "Projects"}}],
            properties={
                "Title": {"title": {}},
                "ID": {"rich_text": {}},
                "Description": {"rich_text": {}},
                "Status": {"select": {
                    "options": [
                        {"name": "planning", "color": "gray"},
                        {"name": "in_progress", "color": "blue"},
                        {"name": "completed", "color": "green"},
                        {"name": "on_hold", "color": "yellow"}
                    ]
                }},
                "Created At": {"date": {}},
                "Updated At": {"date": {}}
            }
        )
        
        # Store database IDs
        self.db_ids = {
            "tasks": tasks_db["id"],
            "logs": logs_db["id"],
            "projects": projects_db["id"]
        }
        
        # Save database IDs to configuration
        self._save_database_ids()
        
        return self.db_ids
    
    def _save_database_ids(self) -> None:
        """Save database IDs to a configuration file."""
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'notion_db_ids.json')
        with open(config_path, 'w') as f:
            json.dump(self.db_ids, f)
    
    def _load_database_ids(self) -> None:
        """Load database IDs from a configuration file."""
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'notion_db_ids.json')
        try:
            with open(config_path, 'r') as f:
                self.db_ids = json.load(f)
        except FileNotFoundError:
            logger.warning("Database IDs configuration file not found. Run create_databases() first.")
    
    def create_database(self, parent: Dict[str, Any], title: List[Dict[str, Any]], 
                      properties: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a database in Notion.
        
        Args:
            parent: Parent page or workspace
            title: Database title
            properties: Database properties
            
        Returns:
            Created database object
        """
        return self.client.databases.create(
            parent=parent,
            title=title,
            properties=properties
        )
    
    def create_page(self, parent: Dict[str, Any], properties: Dict[str, Any], 
                  children: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create a page in Notion.
        
        Args:
            parent: Parent page, database, or workspace
            properties: Page properties
            children: Page content blocks
            
        Returns:
            Created page object
        """
        return self.client.pages.create(
            parent=parent,
            properties=properties,
            children=children
        )
    
    def add_blocks_to_page(self, page_id: str, blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Add blocks to a page.
        
        Args:
            page_id: ID of the page
            blocks: Blocks to add
            
        Returns:
            Response from the API
        """
        return self.client.blocks.children.append(
            block_id=page_id,
            children=blocks
        )
    
    def create_task_page(self, task: Task) -> Dict[str, Any]:
        """
        Create a page for a task in the Tasks database.
        
        Args:
            task: Task object
            
        Returns:
            Created page object
        """
        if not self.db_ids.get("tasks"):
            self._load_database_ids()
            if not self.db_ids.get("tasks"):
                raise ValueError("Tasks database ID not set. Run create_databases() first.")
        
        # Convert task to Notion page properties
        properties = {
            "Title": {"title": [{"text": {"content": task.title}}]},
            "ID": {"rich_text": [{"text": {"content": task.id}}]},
            "Description": {"rich_text": [{"text": {"content": task.description[:2000]}}]},
            "Agent": {"select": {"name": task.agent}},
            "Status": {"select": {"name": task.status}},
            "Priority": {"select": {"name": task.priority}},
            "Created At": {"date": {"start": task.created_at.isoformat()}},
            "Updated At": {"date": {"start": task.updated_at.isoformat()}}
        }
        
        if task.deadline:
            properties["Deadline"] = {"date": {"start": task.deadline.isoformat()}}
        
        if task.completed_at:
            properties["Completed At"] = {"date": {"start": task.completed_at.isoformat()}}
        
        if task.slack_thread_id:
            properties["Slack Thread"] = {"url": f"https://slack.com/archives/{task.slack_channel_id}/p{task.slack_thread_id.replace('.', '')}"}
        
        if task.assigned_by:
            properties["Assigned By"] = {"rich_text": [{"text": {"content": task.assigned_by}}]}
        
        if task.reviewed_by:
            properties["Reviewed By"] = {"rich_text": [{"text": {"content": task.reviewed_by}}]}
        
        # Create the page
        page = self.create_page(
            parent={"database_id": self.db_ids["tasks"]},
            properties=properties,
            children=[]
        )
        
        # Add steps as blocks if there are any
        if task.steps:
            self._add_task_steps_to_page(page["id"], task.steps)
        
        return page
    
    def _add_task_steps_to_page(self, page_id: str, steps: List[TaskStep]) -> None:
        """
        Add task steps as blocks to a page.
        
        Args:
            page_id: ID of the page
            steps: Task steps to add
        """
        blocks = []
        
        # Add a header for the steps section
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "Task Steps"}}]
            }
        })
        
        # Add each step as a toggle block
        for step in steps:
            # Create a toggle block for the step
            toggle_block = {
                "object": "block",
                "type": "toggle",
                "toggle": {
                    "rich_text": [{
                        "type": "text",
                        "text": {
                            "content": f"{step.agent} - {step.timestamp.isoformat()} - {step.status}"
                        }
                    }],
                    "children": [
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{
                                    "type": "text",
                                    "text": {"content": step.description}
                                }]
                            }
                        }
                    ]
                }
            }
            
            # Add result if available
            if step.result:
                result_content = str(step.result)
                toggle_block["toggle"]["children"].append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"Result: {result_content[:2000]}"}
                        }]
                    }
                })
            
            # Add error if available
            if step.error:
                toggle_block["toggle"]["children"].append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"Error: {step.error}"}
                        }]
                    }
                })
            
            blocks.append(toggle_block)
        
        # Add blocks to the page
        self.add_blocks_to_page(page_id, blocks)
    
    def update_task_status(self, task_id: str, status: str) -> Dict[str, Any]:
        """
        Update the status of a task.
        
        Args:
            task_id: ID of the task
            status: New status
            
        Returns:
            Updated page object
        """
        if not self.db_ids.get("tasks"):
            self._load_database_ids()
            if not self.db_ids.get("tasks"):
                raise ValueError("Tasks database ID not set. Run create_databases() first.")
        
        # Find the task page by its ID
        query_result = self.client.databases.query(
            database_id=self.db_ids["tasks"],
            filter={
                "property": "ID",
                "rich_text": {
                    "equals": task_id
                }
            }
        )
        
        if not query_result["results"]:
            raise ValueError(f"Task with ID {task_id} not found")
        
        page_id = query_result["results"][0]["id"]
        
        # Update the status
        return self.client.pages.update(
            page_id=page_id,
            properties={
                "Status": {"select": {"name": status}},
                "Updated At": {"date": {"start": datetime.utcnow().isoformat()}}
            }
        )
    
    def add_task_step(self, task_id: str, step: TaskStep) -> Dict[str, Any]:
        """
        Add a step to a task.
        
        Args:
            task_id: ID of the task
            step: Step to add
            
        Returns:
            Updated page object
        """
        if not self.db_ids.get("tasks"):
            self._load_database_ids()
            if not self.db_ids.get("tasks"):
                raise ValueError("Tasks database ID not set. Run create_databases() first.")
        
        # Find the task page by its ID
        query_result = self.client.databases.query(
            database_id=self.db_ids["tasks"],
            filter={
                "property": "ID",
                "rich_text": {
                    "equals": task_id
                }
            }
        )
        
        if not query_result["results"]:
            raise ValueError(f"Task with ID {task_id} not found")
        
        page_id = query_result["results"][0]["id"]
        
        # Add the step as a block
        blocks = [{
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [{
                    "type": "text",
                    "text": {
                        "content": f"{step.agent} - {step.timestamp.isoformat()} - {step.status}"
                    }
                }],
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{
                                "type": "text",
                                "text": {"content": step.description}
                            }]
                        }
                    }
                ]
            }
        }]
        
        # Add result if available
        if step.result:
            result_content = str(step.result)
            blocks[0]["toggle"]["children"].append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": f"Result: {result_content[:2000]}"}
                    }]
                }
            })
        
        # Add error if available
        if step.error:
            blocks[0]["toggle"]["children"].append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": f"Error: {step.error}"}
                    }]
                }
            })
        
        return self.add_blocks_to_page(page_id, blocks)
    
    def create_log_entry(self, log: AgentLog) -> Dict[str, Any]:
        """
        Create a log entry in the Logs database.
        
        Args:
            log: Log entry
            
        Returns:
            Created page object
        """
        if not self.db_ids.get("logs"):
            self._load_database_ids()
            if not self.db_ids.get("logs"):
                raise ValueError("Logs database ID not set. Run create_databases() first.")
        
        # Convert log to Notion page properties
        properties = {
            "Title": {"title": [{"text": {"content": log.action}}]},
            "ID": {"rich_text": [{"text": {"content": log.id}}]},
            "Agent": {"select": {"name": log.agent}},
            "Timestamp": {"date": {"start": log.timestamp.isoformat()}}
        }
        
        if log.task_id:
            properties["Task ID"] = {"rich_text": [{"text": {"content": log.task_id}}]}
        
        if log.slack_message_id:
            properties["Slack Message"] = {"url": f"https://slack.com/archives/channel/p{log.slack_message_id.replace('.', '')}"}
        
        # Create the page
        page = self.create_page(
            parent={"database_id": self.db_ids["logs"]},
            properties=properties,
            children=[
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": str(log.details)[:2000]}
                        }]
                    }
                }
            ]
        )
        
        return page

# Usage example
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    client = NotionClient()
    db_ids = client.create_databases()
    print(f"Created databases: {db_ids}")