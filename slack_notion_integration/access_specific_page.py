"""
Script to access and modify a specific Notion page by ID.

This demonstrates our ability to access and modify the specific page
with ID 1e8f9e169eff812299cafb5d04576eed.
"""

import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables (for NOTION_API_KEY)
load_dotenv()

# Import our Notion client implementation
from src.notion.client import NotionClient

async def access_and_modify_specific_page():
    """
    Access and modify the specific Notion page by ID.
    
    Tries multiple formats of the page ID to ensure compatibility.
    """
    # Initialize our Notion client
    notion_client = NotionClient()
    
    # The specific page ID we want to access - try different formats
    page_id_variations = [
        "1e8f9e169eff812299cafb5d04576eed",  # Raw format from URL
        "1e8f9e16-9eff-8122-99ca-fb5d04576eed",  # Hyphenated format
        "1e8f9e16-9eff-8181-99ce-000cef5b189b"  # Alternative format from URL parameters
    ]
    
    success = False
    result = None
    
    # Try each page ID format
    for target_page_id in page_id_variations:
        print(f"\nTrying to access Notion page with ID: {target_page_id}")
        
        try:
            # First, retrieve the page to verify we can access it
            page = await notion_client.client.pages.retrieve(page_id=target_page_id)
            
            print(f"✅ Successfully accessed page: {page.get('id')}")
            print(f"Page URL: https://notion.so/{target_page_id.replace('-', '')}")
            
            # Get the page properties
            properties = page.get("properties", {})
            
            # Print some information about the page
            title = "No title found"
            if "title" in properties and properties["title"].get("title"):
                title_content = properties["title"].get("title", [])
                if title_content:
                    title = title_content[0].get("text", {}).get("content", "No title found")
            
            print(f"Page title: {title}")
            
            # Now add new content to the page to demonstrate modification
            timestamp = datetime.now().isoformat()
            
            # Create blocks to append
            blocks = [{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": f"🔄 PAGE ACCESSED AND MODIFIED: {timestamp}"}
                    }]
                }
            }, {
                "object": "block",
                "type": "callout",
                "callout": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "This modification demonstrates that we have successful access to this Notion page from the SecondBrain Slack+Notion integration."}
                    }],
                    "icon": {"emoji": "✅"},
                    "color": "green_background"
                }
            }]
            
            # Append the blocks to the page
            response = await notion_client.client.blocks.children.append(
                block_id=target_page_id,
                children=blocks
            )
            
            print(f"✅ Successfully modified page. Added {len(blocks)} blocks.")
            print(f"Response ID: {response.get('id')}")
            
            success = True
            result = {
                "success": True,
                "page_id": target_page_id,
                "page_url": f"https://notion.so/{target_page_id.replace('-', '')}",
                "timestamp": timestamp
            }
            
            # We found a working page ID, so break the loop
            break
        
        except Exception as e:
            print(f"❌ Error accessing or modifying Notion page: {str(e)}")
            result = {
                "success": False,
                "page_id": target_page_id,
                "error": str(e)
            }
    
    if not success:
        print("\n⚠️ Could not access the Notion page with any of the provided ID formats.")
        print("This could be due to one of the following reasons:")
        print("1. The Notion integration doesn't have access to this page")
        print("2. The Notion API key is invalid or expired")
        print("3. The page ID format is incorrect")
        print("4. The page may have been deleted or moved")
        
        # Try listing available databases to provide more context
        try:
            print("\nAttempting to list accessible databases...")
            response = await notion_client.client.search(filter={"property": "object", "value": "database"})
            databases = response.get("results", [])
            
            if databases:
                print(f"Found {len(databases)} accessible databases:")
                for idx, db in enumerate(databases):
                    db_id = db.get("id")
                    title = "Unnamed"
                    if "title" in db and db["title"]:
                        title_parts = [t.get("plain_text", "") for t in db["title"]]
                        title = "".join(title_parts)
                    
                    print(f"{idx+1}. {title} (ID: {db_id})")
            else:
                print("No accessible databases found.")
            
        except Exception as e:
            print(f"Error listing databases: {str(e)}")
    
    return result

if __name__ == "__main__":
    # Run the async function
    result = asyncio.run(access_and_modify_specific_page())
    
    # Print the result
    print("\nOperation result:")
    print(json.dumps(result, indent=2))