/**
 * Test script for the API Bridge
 * 
 * This script performs a series of tests on the API Bridge endpoints to ensure
 * that they are working correctly with actual content and agents.
 */

const axios = require('axios');

// API Bridge URL
const API_URL = 'http://localhost:3030/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test suite
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}===== API BRIDGE TEST SUITE =====${colors.reset}\n`);
  
  try {
    // Test 1: Health Check
    console.log(`${colors.yellow}[TEST 1]${colors.reset} Health Check`);
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log(`  Status: ${healthResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
    console.log(`  Response: ${JSON.stringify(healthResponse.data, null, 2)}`);
    console.log();
    
    // Test 2: Get Available Agents
    console.log(`${colors.yellow}[TEST 2]${colors.reset} Get Available Agents`);
    try {
      const agentsResponse = await axios.get(`${API_URL}/agents`);
      console.log(`  Status: ${agentsResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      console.log(`  Found ${agentsResponse.data.agents.length} agents`);
      agentsResponse.data.agents.forEach(agent => {
        console.log(`    - ${colors.cyan}${agent.type}${colors.reset} (${agent.status}): ${agent.capabilities.join(', ')}`);
      });
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
    // Test 3: Execute Planner Agent
    console.log(`${colors.yellow}[TEST 3]${colors.reset} Execute Planner Agent`);
    try {
      const plannerPayload = {
        agentId: 'planner_agent',
        input: 'Create a plan for building a content management system for coaching business',
        context: {
          projectName: 'Coaching CMS',
          priority: 'high'
        }
      };
      
      const plannerResponse = await axios.post(`${API_URL}/agent`, plannerPayload);
      console.log(`  Status: ${plannerResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      console.log(`  Agent ID: ${plannerResponse.data.response.agentId}`);
      console.log(`  Output Preview: ${plannerResponse.data.response.output.substring(0, 150)}...`);
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
    // Test 4: Get Style Profiles
    console.log(`${colors.yellow}[TEST 4]${colors.reset} Get Style Profiles`);
    try {
      const profilesResponse = await axios.get(`${API_URL}/style-profiles`);
      console.log(`  Status: ${profilesResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      if (profilesResponse.data.profiles) {
        console.log(`  Found ${profilesResponse.data.profiles.length} style profiles`);
        profilesResponse.data.profiles.slice(0, 3).forEach(profile => {
          console.log(`    - ${colors.cyan}${profile.name}${colors.reset} (${profile.id})`);
          if (profile.sample) {
            console.log(`      Sample: ${profile.sample.substring(0, 50)}...`);
          }
        });
        
        if (profilesResponse.data.profiles.length > 3) {
          console.log(`    ... and ${profilesResponse.data.profiles.length - 3} more`);
        }
      } else {
        console.log(`  ${colors.yellow}No profiles found or unauthorized${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
    // Test 5: Generate Content with Integration
    console.log(`${colors.yellow}[TEST 5]${colors.reset} Generate Content with Notion Integration`);
    try {
      const generatePayload = {
        prompt: 'Create a guide on effective business systems',
        styleProfileId: 'tina_style',
        contentType: 'documentation'
      };
      
      const generateResponse = await axios.post(`${API_URL}/notion/generate`, generatePayload);
      console.log(`  Status: ${generateResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      console.log(`  Generated Title: ${generateResponse.data.page.title}`);
      console.log(`  Content Preview: ${generateResponse.data.content.substring(0, 150)}...`);
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
    // Test 6: Get Notion Pages
    console.log(`${colors.yellow}[TEST 6]${colors.reset} Get Notion Pages`);
    try {
      const pagesResponse = await axios.get(`${API_URL}/notion/pages`);
      console.log(`  Status: ${pagesResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      if (pagesResponse.data.pages) {
        console.log(`  Found ${pagesResponse.data.pages.length} pages`);
        pagesResponse.data.pages.slice(0, 3).forEach(page => {
          console.log(`    - ${colors.cyan}${page.title}${colors.reset} (${page.icon})`);
          console.log(`      Created: ${page.created_time}`);
        });
        
        if (pagesResponse.data.pages.length > 3) {
          console.log(`    ... and ${pagesResponse.data.pages.length - 3} more`);
        }
      } else {
        console.log(`  ${colors.yellow}No pages found${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
    // Test 7: Get Topic Analyzer Status
    console.log(`${colors.yellow}[TEST 7]${colors.reset} Get Topic Analyzer Status`);
    try {
      const statusResponse = await axios.get(`${API_URL}/topic-analyzer/status`);
      console.log(`  Status: ${statusResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      console.log(`  Response: ${JSON.stringify(statusResponse.data, null, 2)}`);
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
    // Test 8: Get Topics
    console.log(`${colors.yellow}[TEST 8]${colors.reset} Get Topics`);
    try {
      const topicsResponse = await axios.get(`${API_URL}/topics`);
      console.log(`  Status: ${topicsResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      if (topicsResponse.data.topics) {
        console.log(`  Found ${topicsResponse.data.topics.length} topics of ${topicsResponse.data.total} total`);
        topicsResponse.data.topics.slice(0, 3).forEach(topic => {
          console.log(`    - ${colors.cyan}${topic.topic}${colors.reset} (${topic.category})`);
          console.log(`      Sources: ${topic.sources.join(', ')}`);
          console.log(`      Approaches: ${topic.approaches.join(', ')}`);
        });
        
        if (topicsResponse.data.topics.length > 3) {
          console.log(`    ... and ${topicsResponse.data.topics.length - 3} more`);
        }
        
        // Get categories list
        if (topicsResponse.data.categories) {
          console.log(`  Categories: ${topicsResponse.data.categories.join(', ')}`);
        }
        
        // Get clients list
        if (topicsResponse.data.clients) {
          console.log(`  Clients: ${Object.keys(topicsResponse.data.clients).join(', ')}`);
        }
      } else {
        console.log(`  ${colors.yellow}No topics found${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
    // Test 9: Get Topics with Filtering
    console.log(`${colors.yellow}[TEST 9]${colors.reset} Get Topics with Filtering (client=fuji)`);
    try {
      const filteredTopicsResponse = await axios.get(`${API_URL}/topics?client=fuji`);
      console.log(`  Status: ${filteredTopicsResponse.status === 200 ? colors.green + 'OK' : colors.red + 'FAILED'}`);
      if (filteredTopicsResponse.data.topics) {
        console.log(`  Found ${filteredTopicsResponse.data.topics.length} topics of ${filteredTopicsResponse.data.total} total`);
        filteredTopicsResponse.data.topics.slice(0, 3).forEach(topic => {
          console.log(`    - ${colors.cyan}${topic.topic}${colors.reset} (${topic.category})`);
        });
      } else {
        console.log(`  ${colors.yellow}No topics found with filter${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
      if (error.response) {
        console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log();
    
  } catch (error) {
    console.error(`${colors.red}Error running tests:${colors.reset}`, error.message);
  }
  
  console.log(`${colors.bright}${colors.cyan}===== TEST SUITE COMPLETE =====${colors.reset}`);
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
});