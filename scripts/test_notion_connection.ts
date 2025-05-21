/**
 * Test script for Notion API connection
 * Helps diagnose issues with integrations and permissions
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Extract API key from arguments or environment
const notionApiKey = process.env.NOTION_API_KEY || process.argv[2];

if (!notionApiKey) {
  console.error('❌ No Notion API key provided');
  console.error('Usage: NOTION_API_KEY=your_key npx tsx scripts/test_notion_connection.ts');
  console.error('   or: npx tsx scripts/test_notion_connection.ts your_key');
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({ auth: notionApiKey });

/**
 * Main function to test Notion API connection
 */
async function testNotionConnection() {
  console.log('🔍 Testing Notion API connection...');
  
  try {
    // Step 1: Test basic connection by listing users
    console.log('\n📋 Step 1: Testing basic API connection...');
    const usersResponse = await notion.users.list({});
    console.log(`✅ Connection successful! Found ${usersResponse.results.length} users`);
    
    console.log('\nUser details:');
    usersResponse.results.forEach((user, index) => {
      console.log(`User ${index + 1}:`, user.name, `(${user.type})`);
    });
    
    // Step 2: Search for pages the integration can access
    console.log('\n📋 Step 2: Searching for accessible pages...');
    const pagesResponse = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      }
    });
    
    if (pagesResponse.results.length === 0) {
      console.log('⚠️ Warning: No pages found. Your integration may not have access to any pages.');
      console.log('Please share at least one page with your integration in Notion.');
    } else {
      console.log(`✅ Found ${pagesResponse.results.length} accessible pages`);
      
      console.log('\nAccessible pages:');
      pagesResponse.results.forEach((page: any, index) => {
        const title = page.properties?.title?.title?.[0]?.plain_text || 
                      page.properties?.Name?.title?.[0]?.plain_text || 
                      'Untitled';
        console.log(`Page ${index + 1}: ${title}`);
        console.log(`   ID: ${page.id}`);
        console.log(`   URL: ${page.url}`);
      });
      
      // Suggest using one of these pages
      if (pagesResponse.results.length > 0) {
        const firstPage = pagesResponse.results[0];
        console.log(`\n💡 Suggestion: Use the first page as your parent page:`);
        console.log(`NOTION_PAGE_ID=${firstPage.id}`);
      }
    }
    
    // Step 3: Test permission to a specific page (if provided)
    const testPageId = process.env.NOTION_PAGE_ID || process.argv[3];
    if (testPageId) {
      console.log(`\n📋 Step 3: Testing access to page ID: ${testPageId}...`);
      try {
        const pageResponse = await notion.pages.retrieve({ page_id: testPageId });
        console.log('✅ Success! Your integration has access to this page.');
        
        // Try to create a small test block to verify write permission
        try {
          console.log('Testing write permission...');
          const blockResponse = await notion.blocks.children.append({
            block_id: testPageId,
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      type: 'text',
                      text: {
                        content: '[Test] This is a test from the SecondBrain Planner Agent'
                      }
                    }
                  ]
                }
              }
            ]
          });
          console.log('✅ Write permission confirmed! Test block created successfully.');
        } catch (error) {
          console.error('❌ Your integration does not have write permission to this page');
          console.error('Error details:', error);
        }
      } catch (error) {
        console.error('❌ Your integration does not have access to this page');
        console.error('Error details:', error);
      }
    }
    
    console.log('\n🎉 Notion API test completed!');
  } catch (error) {
    console.error('❌ Notion API test failed:', error);
  }
}

// Run the test
testNotionConnection().catch(console.error);