"""
Script to verify Notion API access and check available pages and databases.

This script helps diagnose issues with Notion API access and lists
all accessible pages and databases for the current API key.
"""

import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables (for NOTION_API_KEY)
load_dotenv()

# Directly use notion-client rather than our wrapper
from notion_client import AsyncClient as NotionClient

async def verify_notion_access():
    """
    Verify access to the Notion API and list accessible resources.
    """
    # Get Notion API key
    notion_api_key = os.environ.get("NOTION_API_KEY")
    
    if not notion_api_key:
        print("❌ No NOTION_API_KEY found in environment variables")
        return {
            "success": False,
            "error": "No NOTION_API_KEY found in environment"
        }
    
    # Mask the API key for secure logging
    masked_key = notion_api_key[:4] + "*" * (len(notion_api_key) - 8) + notion_api_key[-4:]
    print(f"Using Notion API key: {masked_key}")
    
    # Initialize Notion client directly
    notion = NotionClient(auth=notion_api_key)
    
    try:
        # Check connection and list users
        print("\nVerifying API connection...")
        users = await notion.users.list()
        
        # Extract bot user info
        bot_user = users.get("bot", {})
        bot_owner = users.get("results", [])[0] if users.get("results") else {}
        
        print(f"✅ Successfully connected to Notion API")
        print(f"Bot name: {bot_user.get('name', 'Unknown')}")
        print(f"Bot ID: {bot_user.get('id', 'Unknown')}")
        print(f"Owner: {bot_owner.get('name', 'Unknown')}")
        
        # List accessible databases
        print("\nListing accessible databases...")
        response = await notion.search(filter={"property": "object", "value": "database"})
        databases = response.get("results", [])
        
        if databases:
            print(f"Found {len(databases)} accessible databases:")
            for idx, db in enumerate(databases):
                db_id = db.get("id")
                title = "Unnamed"
                
                # Extract title from database properties
                if "title" in db and db["title"]:
                    title_parts = [t.get("plain_text", "") for t in db["title"]]
                    title = "".join(title_parts)
                
                print(f"{idx+1}. {title} (ID: {db_id})")
                
                # Try to query the database to verify access
                try:
                    query_result = await notion.databases.query(database_id=db_id, page_size=1)
                    page_count = len(query_result.get("results", []))
                    print(f"   ✓ Can query database ({page_count} pages found in sample)")
                except Exception as e:
                    print(f"   ✗ Cannot query database: {str(e)}")
        else:
            print("No accessible databases found.")
        
        # List accessible pages
        print("\nListing accessible pages...")
        response = await notion.search(filter={"property": "object", "value": "page"}, page_size=10)
        pages = response.get("results", [])
        
        if pages:
            print(f"Found {len(pages)} accessible pages:")
            for idx, page in enumerate(pages):
                page_id = page.get("id")
                
                # Try to extract title
                title = "Unnamed"
                if "properties" in page and "title" in page["properties"]:
                    title_obj = page["properties"]["title"].get("title", [])
                    if title_obj:
                        title = title_obj[0].get("plain_text", "Unnamed")
                
                print(f"{idx+1}. {title} (ID: {page_id})")
                print(f"   URL: https://notion.so/{page_id.replace('-', '')}")
                
                # Check if this matches our target page ID
                target_id = "1e8f9e169eff812299cafb5d04576eed"
                formatted_target = "1e8f9e16-9eff-8122-99ca-fb5d04576eed"
                
                if page_id == formatted_target or page_id.replace("-", "") == target_id:
                    print(f"   ✓ THIS IS THE TARGET PAGE WE'RE LOOKING FOR!")
                    
                # Try to access the page blocks to verify access
                try:
                    blocks = await notion.blocks.children.list(block_id=page_id, page_size=1)
                    block_count = len(blocks.get("results", []))
                    print(f"   ✓ Can access page blocks ({block_count} blocks found in sample)")
                except Exception as e:
                    print(f"   ✗ Cannot access page blocks: {str(e)}")
        else:
            print("No accessible pages found.")
        
        # Try to access our specific target page directly
        print("\nTrying to access the specific target page...")
        target_ids = [
            "1e8f9e169eff812299cafb5d04576eed",
            "1e8f9e16-9eff-8122-99ca-fb5d04576eed",
            "1e8f9e16-9eff-8181-99ce-000cef5b189b"
        ]
        
        for target_id in target_ids:
            try:
                print(f"Trying ID: {target_id}")
                page = await notion.pages.retrieve(page_id=target_id)
                print(f"✅ Successfully accessed target page with ID: {target_id}")
                print(f"Page URL: https://notion.so/{target_id.replace('-', '')}")
                
                # Try to add a block to verify write access
                try:
                    response = await notion.blocks.children.append(
                        block_id=target_id,
                        children=[{
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{
                                    "type": "text",
                                    "text": {"content": f"Access verified: {datetime.now().isoformat()}"}
                                }]
                            }
                        }]
                    )
                    print("✅ Successfully modified the page - we have write access!")
                except Exception as e:
                    print(f"❌ Cannot modify the page: {str(e)}")
                
                break
            except Exception as e:
                print(f"❌ Cannot access page with ID {target_id}: {str(e)}")
        
        return {
            "success": True,
            "bot_name": bot_user.get("name"),
            "databases": [{"id": db.get("id"), "title": "".join([t.get("plain_text", "") for t in db.get("title", [])])} for db in databases],
            "pages": [{"id": page.get("id"), "url": f"https://notion.so/{page.get('id').replace('-', '')}"} for page in pages],
        }
        
    except Exception as e:
        print(f"❌ Error verifying Notion access: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # Run the async function
    result = asyncio.run(verify_notion_access())
    
    # Print the result summary
    print("\nOperation summary:")
    print(json.dumps({"success": result.get("success"), "error": result.get("error", None)}, indent=2))
    
    # Save detailed results to file for reference
    with open("notion_access_report.json", "w") as f:
        json.dump(result, f, indent=2)
        print(f"\nDetailed results saved to notion_access_report.json")