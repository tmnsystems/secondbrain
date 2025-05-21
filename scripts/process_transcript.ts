/**
 * Script to process a transcript with the ContentAgent
 * 
 * Usage: 
 *   npm run process:transcript -- path/to/transcript.txt
 */

import dotenv from 'dotenv';
import * as path from 'path';
import { initializeAgents } from '../libs/agents';

// Load environment variables
dotenv.config();

// Get transcript path from command line args
const transcriptPath = process.argv[2];

if (!transcriptPath) {
  console.error('Please provide a transcript path as an argument');
  process.exit(1);
}

// Process the transcript
async function processTranscript() {
  console.log(`Processing transcript: ${transcriptPath}`);
  
  // Initialize the agent system
  const system = await initializeAgents();
  
  // Process the transcript
  const result = await system.contentAgent.processTranscript(transcriptPath);
  
  if (result.success) {
    console.log('Transcript processed successfully!');
    console.log('Style profile:', result.style_profile);
  } else {
    console.error('Error processing transcript:', result.error);
    process.exit(1);
  }
}

// Run the script
processTranscript()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
