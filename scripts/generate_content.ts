/**
 * Script to generate content using the GenerationAgent
 * 
 * Usage:
 *   npm run generate:content -- "Topic" path/to/style_profile.json
 */

import dotenv from 'dotenv';
import * as path from 'path';
import { initializeAgents } from '../libs/agents';

// Load environment variables
dotenv.config();

// Get arguments from command line
const topic = process.argv[2];
const styleProfilePath = process.argv[3];

if (!topic || !styleProfilePath) {
  console.error('Usage: npm run generate:content -- "Topic" path/to/style_profile.json');
  process.exit(1);
}

// Generate content
async function generateContent() {
  console.log(`Generating content on topic: ${topic}`);
  console.log(`Using style profile: ${styleProfilePath}`);
  
  // Initialize the agent system
  const system = await initializeAgents();
  
  // Generate content
  const result = await system.generationAgent.generateContent(topic, { styleProfilePath });
  
  if (result.success) {
    console.log('Content generated successfully!');
    console.log('Content brief:', result.content_brief);
    console.log('Generated content:', result.revised_draft || result.draft);
  } else {
    console.error('Error generating content:', result.error);
    process.exit(1);
  }
}

// Run the script
generateContent()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
