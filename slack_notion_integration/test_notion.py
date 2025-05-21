"""
Simple test script for the Notion connection.
"""

import os
import logging
from dotenv import load_dotenv
from notion_client import Client

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv("/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env")

def test_notion_connection():
    """Test the Notion API connection."""
    # Get the Notion API key
    notion_api_key = os.environ.get("NOTION_API_KEY")
    
    if not notion_api_key:
        logger.error("NOTION_API_KEY is not set in the environment variables!")
        return False
    
    logger.info(f"Using Notion API Key: {notion_api_key[:10]}...")
    
    try:
        # Initialize the Notion client
        notion = Client(auth=notion_api_key)
        
        # Test the connection by listing users
        users = notion.users.list()
        logger.info(f"Successfully connected to Notion API!")
        logger.info(f"Found {len(users.get('results', []))} users")
        
        # List the first few users
        for user in users.get("results", [])[:3]:
            logger.info(f"User: {user.get('name')} ({user.get('type')})")
        
        # Test searching for pages
        search_results = notion.search(
            query="SecondBrain Project",
            filter={"property": "object", "value": "page"}
        )
        
        logger.info(f"Found {len(search_results.get('results', []))} pages matching 'SecondBrain Project'")
        
        # Display the page details if found
        for page in search_results.get("results", [])[:3]:
            page_id = page.get("id")
            page_title = "Untitled"
            
            # Try to get the page title
            properties = page.get("properties", {})
            title_property = properties.get("title", {})
            title_array = title_property.get("title", [])
            
            if title_array and len(title_array) > 0:
                title_text = title_array[0].get("text", {})
                page_title = title_text.get("content", "Untitled")
            
            logger.info(f"Page: {page_title} (ID: {page_id})")
        
        # List the databases
        search_results = notion.search(
            filter={"property": "object", "value": "database"}
        )
        
        logger.info(f"Found {len(search_results.get('results', []))} databases")
        
        # Display database details
        for db in search_results.get("results", [])[:3]:
            db_id = db.get("id")
            db_title = "Untitled"
            
            # Try to get the database title
            title_array = db.get("title", [])
            if title_array and len(title_array) > 0:
                title_text = title_array[0].get("text", {})
                db_title = title_text.get("content", "Untitled")
            
            logger.info(f"Database: {db_title} (ID: {db_id})")
        
        # Test creating a test page
        if search_results.get("results"):
            db_id = search_results.get("results")[0].get("id")
            
            logger.info(f"Creating a test page in database {db_id}")
            
            try:
                new_page = notion.pages.create(
                    parent={"database_id": db_id},
                    properties={
                        "title": {"title": [{"text": {"content": "Test Page from API"}}]}
                    }
                )
                
                logger.info(f"Created test page with ID: {new_page.get('id')}")
                
                # Delete the test page
                logger.info("Archiving the test page...")
                notion.pages.update(
                    page_id=new_page.get("id"),
                    archived=True
                )
                
                logger.info("Test page archived successfully")
                
            except Exception as page_error:
                logger.error(f"Error creating test page: {str(page_error)}")
        
        return True
    
    except Exception as e:
        logger.error(f"Error connecting to Notion API: {str(e)}")
        
        # Provide troubleshooting steps
        logger.info("\nTroubleshooting steps:")
        logger.info("1. Verify your API key is correct")
        logger.info("2. Make sure your integration has been added to at least one page in your workspace")
        logger.info("3. Check that your integration has the necessary capabilities")
        logger.info("4. Ensure your API key has not expired")
        
        return False

if __name__ == "__main__":
    logger.info("Testing Notion API connection...")
    success = test_notion_connection()
    
    if success:
        logger.info("Notion API connection test completed successfully!")
    else:
        logger.error("Notion API connection test failed!")