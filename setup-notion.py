#!/usr/bin/env python3
"""
SecondBrain Notion Setup Script

This script sets up the necessary Notion databases for SecondBrain:
1. Projects Database
2. Tasks Database
3. Dependency Database

It creates a new page in your Notion workspace with these databases
and updates your .env file with the correct IDs.
"""

import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Notion API key
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
if not NOTION_API_KEY:
    print("Error: NOTION_API_KEY not found in .env file")
    print("Please add your Notion API key to your .env file:")
    print("NOTION_API_KEY=your_notion_api_key_here")
    sys.exit(1)

# Notion API endpoints
NOTION_API_BASE = "https://api.notion.com/v1"
SEARCH_ENDPOINT = f"{NOTION_API_BASE}/search"
PAGES_ENDPOINT = f"{NOTION_API_BASE}/pages"
DATABASES_ENDPOINT = f"{NOTION_API_BASE}/databases"

# Headers for Notion API
HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}

def search_pages(query=""):
    """Search for pages in Notion workspace."""
    data = {
        "query": query,
        "filter": {
            "value": "page",
            "property": "object"
        },
        "sort": {
            "direction": "descending",
            "timestamp": "last_edited_time"
        }
    }
    response = requests.post(SEARCH_ENDPOINT, headers=HEADERS, json=data)
    if response.status_code != 200:
        print(f"Error searching pages: {response.status_code}")
        print(response.text)
        return None
    return response.json()

def create_page(title):
    """Create a new page in the root workspace."""
    data = {
        "parent": {"type": "workspace"},
        "properties": {
            "title": [
                {
                    "text": {
                        "content": title
                    }
                }
            ]
        },
        "children": [
            {
                "object": "block",
                "paragraph": {
                    "rich_text": [
                        {
                            "text": {
                                "content": "This page contains databases for the SecondBrain project."
                            }
                        }
                    ]
                }
            }
        ]
    }
    response = requests.post(PAGES_ENDPOINT, headers=HEADERS, json=data)
    if response.status_code != 200:
        print(f"Error creating page: {response.status_code}")
        print(response.text)
        return None
    return response.json()

def create_database(parent_id, title, schema):
    """Create a database in a parent page."""
    data = {
        "parent": {
            "type": "page_id",
            "page_id": parent_id
        },
        "title": [
            {
                "type": "text",
                "text": {
                    "content": title
                }
            }
        ],
        "properties": schema
    }
    response = requests.post(DATABASES_ENDPOINT, headers=HEADERS, json=data)
    if response.status_code != 200:
        print(f"Error creating database: {response.status_code}")
        print(response.text)
        return None
    return response.json()

def get_project_schema():
    """Define schema for Projects database."""
    return {
        "Name": {
            "title": {}
        },
        "Status": {
            "select": {
                "options": [
                    {"name": "Not Started", "color": "gray"},
                    {"name": "In Progress", "color": "blue"},
                    {"name": "Completed", "color": "green"},
                    {"name": "On Hold", "color": "yellow"}
                ]
            }
        },
        "Priority": {
            "select": {
                "options": [
                    {"name": "Low", "color": "gray"},
                    {"name": "Medium", "color": "yellow"},
                    {"name": "High", "color": "orange"},
                    {"name": "Critical", "color": "red"}
                ]
            }
        },
        "Deadline": {
            "date": {}
        },
        "Description": {
            "rich_text": {}
        },
        "Tags": {
            "multi_select": {
                "options": [
                    {"name": "AI", "color": "blue"},
                    {"name": "Content", "color": "green"},
                    {"name": "Infrastructure", "color": "red"},
                    {"name": "Research", "color": "purple"}
                ]
            }
        }
    }

def get_task_schema():
    """Define schema for Tasks database."""
    return {
        "Name": {
            "title": {}
        },
        "Status": {
            "select": {
                "options": [
                    {"name": "Not Started", "color": "gray"},
                    {"name": "In Progress", "color": "blue"},
                    {"name": "Completed", "color": "green"},
                    {"name": "Blocked", "color": "red"}
                ]
            }
        },
        "Priority": {
            "select": {
                "options": [
                    {"name": "Low", "color": "gray"},
                    {"name": "Medium", "color": "yellow"},
                    {"name": "High", "color": "orange"},
                    {"name": "Critical", "color": "red"}
                ]
            }
        },
        "Due Date": {
            "date": {}
        },
        "Project": {
            "relation": {}
        },
        "Assigned To": {
            "rich_text": {}
        },
        "Description": {
            "rich_text": {}
        },
        "Estimated Hours": {
            "number": {}
        }
    }

def get_dependency_schema():
    """Define schema for Dependencies database."""
    return {
        "Name": {
            "title": {}
        },
        "Type": {
            "select": {
                "options": [
                    {"name": "API Key", "color": "blue"},
                    {"name": "Service", "color": "green"},
                    {"name": "Software", "color": "purple"},
                    {"name": "Hardware", "color": "yellow"},
                    {"name": "Library", "color": "orange"}
                ]
            }
        },
        "Status": {
            "select": {
                "options": [
                    {"name": "Available", "color": "green"},
                    {"name": "Pending", "color": "yellow"},
                    {"name": "Unavailable", "color": "red"}
                ]
            }
        },
        "Projects": {
            "relation": {}
        },
        "Notes": {
            "rich_text": {}
        },
        "Expiration": {
            "date": {}
        }
    }

def update_env_file(root_page_id, project_db_id, task_db_id, dependency_db_id):
    """Update the .env file with Notion IDs."""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(env_path):
        print(f"Warning: .env file not found at {env_path}")
        return
    
    with open(env_path, "r") as f:
        env_content = f.read()
    
    # Update IDs
    env_content = env_content.replace("NOTION_ROOT_PAGE_ID=1acf9e16-9eff-807b-9645-e1e033498201", f"NOTION_ROOT_PAGE_ID={root_page_id}")
    env_content = env_content.replace("NOTION_PROJECT_DB_ID=1e8f9e16-9eff-816f-8fce-f5facef58c63", f"NOTION_PROJECT_DB_ID={project_db_id}")
    env_content = env_content.replace("NOTION_TASK_DB_ID=1e8f9e16-9eff-8122-99ca-fb5d04576eed", f"NOTION_TASK_DB_ID={task_db_id}")
    
    # Check if dependency DB ID exists, add if not
    if "NOTION_DEPENDENCY_DB_ID" not in env_content:
        env_content += f"\nNOTION_DEPENDENCY_DB_ID={dependency_db_id}"
    else:
        env_content = env_content.replace("NOTION_DEPENDENCY_DB_ID=1e8f9e16-9eff-8172-82c7-f1972f5ad39b", f"NOTION_DEPENDENCY_DB_ID={dependency_db_id}")
    
    # Add USE_NOTION_INTEGRATION if not exists
    if "USE_NOTION_INTEGRATION" not in env_content:
        env_content += "\nUSE_NOTION_INTEGRATION=true"
    
    with open(env_path, "w") as f:
        f.write(env_content)
    
    print(f"Updated .env file with Notion IDs")

def main():
    """Main function to set up Notion databases."""
    print("Setting up Notion for SecondBrain...")
    
    # Create root page
    print("Creating root page in Notion...")
    root_page = create_page("SecondBrain Project Hub")
    if not root_page:
        print("Failed to create root page. Exiting.")
        return
    
    root_page_id = root_page["id"]
    print(f"Created root page with ID: {root_page_id}")
    
    # Wait a moment for Notion to process
    time.sleep(1)
    
    # Create Projects database
    print("Creating Projects database...")
    projects_db = create_database(
        root_page_id,
        "Projects",
        get_project_schema()
    )
    if not projects_db:
        print("Failed to create Projects database. Exiting.")
        return
    
    project_db_id = projects_db["id"]
    print(f"Created Projects database with ID: {project_db_id}")
    
    # Wait a moment for Notion to process
    time.sleep(1)
    
    # Create Tasks database
    print("Creating Tasks database...")
    tasks_db = create_database(
        root_page_id,
        "Tasks",
        get_task_schema()
    )
    if not tasks_db:
        print("Failed to create Tasks database. Exiting.")
        return
    
    task_db_id = tasks_db["id"]
    print(f"Created Tasks database with ID: {task_db_id}")
    
    # Wait a moment for Notion to process
    time.sleep(1)
    
    # Create Dependencies database
    print("Creating Dependencies database...")
    dependencies_db = create_database(
        root_page_id,
        "Dependencies",
        get_dependency_schema()
    )
    if not dependencies_db:
        print("Failed to create Dependencies database. Exiting.")
        return
    
    dependency_db_id = dependencies_db["id"]
    print(f"Created Dependencies database with ID: {dependency_db_id}")
    
    # Update .env file
    update_env_file(root_page_id, project_db_id, task_db_id, dependency_db_id)
    
    # Print success message with link
    print("\n===== SETUP COMPLETE =====")
    print(f"Notion page created: https://notion.so/{root_page_id.replace('-', '')}")
    print("\nDatabase IDs:")
    print(f"Root Page ID: {root_page_id}")
    print(f"Projects DB ID: {project_db_id}")
    print(f"Tasks DB ID: {task_db_id}")
    print(f"Dependencies DB ID: {dependency_db_id}")
    print("\nThese IDs have been added to your .env file.")
    print("You can now use Notion with SecondBrain!")

if __name__ == "__main__":
    main()