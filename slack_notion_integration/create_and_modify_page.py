"""
Script to create, access, and modify a Notion page.

This demonstrates our capability to create, access, and modify Notion pages
using the SecondBrain Slack+Notion integration.
"""

import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables (for NOTION_API_KEY)
load_dotenv()

# Directly use notion-client
from notion_client import AsyncClient as NotionClient

async def create_and_modify_page():
    """
    Create a new Notion page, then access and modify it.
    
    This demonstrates our full capability to work with Notion pages.
    """
    # Get Notion API key
    notion_api_key = os.environ.get("NOTION_API_KEY")
    
    if not notion_api_key:
        print("❌ No NOTION_API_KEY found in environment variables")
        return {
            "success": False,
            "error": "No NOTION_API_KEY found in environment"
        }
    
    # Initialize Notion client directly
    notion = NotionClient(auth=notion_api_key)
    
    try:
        # Step 1: Find a parent database to create our page in
        print("Searching for a suitable parent database...")
        response = await notion.search(
            query="SecondBrain", 
            filter={"property": "object", "value": "database"}
        )
        
        databases = response.get("results", [])
        if not databases:
            print("❌ No suitable parent database found")
            return {
                "success": False,
                "error": "No suitable parent database found"
            }
        
        # Get the first SecondBrain related database
        parent_db = databases[0]
        db_id = parent_db.get("id")
        
        db_title = "Unnamed Database"
        if "title" in parent_db and parent_db["title"]:
            title_parts = [t.get("plain_text", "") for t in parent_db["title"]]
            db_title = "".join(title_parts)
        
        print(f"✅ Found parent database: {db_title} (ID: {db_id})")
        
        # Step 2: Create a new page in the database
        timestamp = datetime.now().isoformat()
        page_title = f"SecondBrain Page Demonstration {timestamp}"
        
        print(f"Creating new page: {page_title}")
        
        # Query the database to understand its schema
        db_schema = await notion.databases.retrieve(database_id=db_id)
        db_properties = db_schema.get("properties", {})
        
        # Prepare properties based on database schema
        properties = {}
        
        # Find the title property
        title_prop_name = next((name for name, prop in db_properties.items() 
                               if prop.get("type") == "title"), "Name")
        
        # Add title property
        properties[title_prop_name] = {
            "title": [{"text": {"content": page_title}}]
        }
        
        # Add other properties based on schema
        for prop_name, prop_schema in db_properties.items():
            prop_type = prop_schema.get("type")
            
            # Skip title as we already added it
            if prop_type == "title" or prop_name == title_prop_name:
                continue
                
            # Add other property types
            if prop_type == "rich_text":
                properties[prop_name] = {
                    "rich_text": [{"text": {"content": "SecondBrain demonstration"}}]
                }
            elif prop_type == "select" and "select" in prop_schema and "options" in prop_schema["select"]:
                # Select the first option if available
                options = prop_schema["select"]["options"]
                if options:
                    properties[prop_name] = {
                        "select": {"name": options[0]["name"]}
                    }
            elif prop_type == "date":
                properties[prop_name] = {
                    "date": {"start": timestamp}
                }
        
        # Create the page with initial content
        new_page = await notion.pages.create(
            parent={"database_id": db_id},
            properties=properties,
            children=[
                {
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "SecondBrain Notion Integration Demo"}
                        }]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "This page was created by the SecondBrain Slack+Notion integration to demonstrate our ability to create, access, and modify Notion pages."}
                        }]
                    }
                },
                {
                    "object": "block",
                    "type": "callout",
                    "callout": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": f"Page created at: {timestamp}"}
                        }],
                        "icon": {"emoji": "🆕"},
                        "color": "blue_background"
                    }
                }
            ]
        )
        
        # Get the ID of the newly created page
        new_page_id = new_page.get("id")
        print(f"✅ Successfully created page with ID: {new_page_id}")
        print(f"Page URL: https://notion.so/{new_page_id.replace('-', '')}")
        
        # Step 3: Access the page we just created
        print("\nAccessing the newly created page...")
        page = await notion.pages.retrieve(page_id=new_page_id)
        
        print(f"✅ Successfully accessed page: {page.get('id')}")
        
        # Step 4: Modify the page by adding new content
        print("\nModifying the page with new content...")
        
        # Add new blocks to the page
        new_blocks = [
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "Page Modification Demo"}
                    }]
                }
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "This section was added to demonstrate our ability to modify existing Notion pages."}
                    }]
                }
            },
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "We can create new pages"}
                    }]
                }
            },
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "We can access existing pages"}
                    }]
                }
            },
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "We can modify pages by adding new content"}
                    }]
                }
            },
            {
                "object": "block",
                "type": "callout",
                "callout": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": f"Page modified at: {datetime.now().isoformat()}"}
                    }],
                    "icon": {"emoji": "✅"},
                    "color": "green_background"
                }
            }
        ]
        
        response = await notion.blocks.children.append(
            block_id=new_page_id,
            children=new_blocks
        )
        
        print(f"✅ Successfully modified page. Added {len(new_blocks)} blocks.")
        
        # Step 5: List the blocks on the page to verify our changes
        print("\nListing blocks on the page to verify changes...")
        blocks = await notion.blocks.children.list(block_id=new_page_id)
        
        print(f"Total blocks on page: {len(blocks.get('results', []))}")
        
        # Return success with page details
        return {
            "success": True,
            "page_id": new_page_id,
            "page_url": f"https://notion.so/{new_page_id.replace('-', '')}",
            "page_title": page_title,
            "created_at": timestamp,
            "parent_database_id": db_id,
            "parent_database_title": db_title
        }
        
    except Exception as e:
        print(f"❌ Error creating or modifying Notion page: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # Run the async function
    result = asyncio.run(create_and_modify_page())
    
    # Print the result
    print("\nOperation result:")
    print(json.dumps(result, indent=2))