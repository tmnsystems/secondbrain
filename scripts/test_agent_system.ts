/**
 * Test script for the SecondBrain agent system
 * 
 * This script tests the entire agent pipeline:
 * 1. ContentAgent: Processing a transcript and extracting style
 * 2. ReasoningAgent: Analyzing the style profile
 * 3. GenerationAgent: Creating content in the extracted style
 * 4. FeedbackAgent: Evaluating the generated content
 */

import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { initializeAgents } from '../libs/agents';

// Load environment variables
dotenv.config();

// Path to sample transcript (or use from commandline args)
const SAMPLE_TRANSCRIPT = process.argv[2] || './apps/ai-writing-system/writing_samples/transcripts/Done Transcript for Fuji_Tina Coaching.txt';

// Output directories
const PROCESSED_DIR = './processed_transcripts';
const GENERATED_DIR = './generated_content';
const FEEDBACK_DIR = './feedback_data';

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.mkdir(FEEDBACK_DIR, { recursive: true });
}

// Test the entire agent pipeline
async function testAgentSystem() {
  console.log('Starting SecondBrain agent system test...');
  console.log(`Using sample transcript: ${SAMPLE_TRANSCRIPT}`);
  
  // Ensure the sample transcript exists
  try {
    await fs.access(SAMPLE_TRANSCRIPT);
  } catch (error) {
    console.error(`Error: Sample transcript not found at ${SAMPLE_TRANSCRIPT}`);
    process.exit(1);
  }
  
  // Initialize the agent system
  console.log('Initializing agent system...');
  const system = await initializeAgents({
    paths: {
      transcripts: path.dirname(SAMPLE_TRANSCRIPT),
      processed: PROCESSED_DIR,
      generated: GENERATED_DIR,
      feedbackData: FEEDBACK_DIR
    }
  });
  
  console.log('Agent system initialized successfully:', system.agents);
  
  // Step 1: Process transcript with ContentAgent
  console.log('\n--- Step 1: Processing transcript with ContentAgent ---');
  const contentResult = await system.contentAgent.processTranscript(SAMPLE_TRANSCRIPT);
  
  if (!contentResult.success) {
    console.error('Error processing transcript:', contentResult.error);
    process.exit(1);
  }
  
  console.log('Transcript processed successfully!');
  console.log('Style profile extracted:', contentResult.style_profile);
  
  // Step 2: Analyze content with ReasoningAgent
  console.log('\n--- Step 2: Analyzing style with ReasoningAgent ---');
  const reasoningResult = await system.reasoningAgent.reason(
    'Analyze the communication style and teaching approach in the style profile'
  );
  
  if (!reasoningResult.success) {
    console.error('Error during reasoning analysis:', reasoningResult.error);
    process.exit(1);
  }
  
  console.log('Reasoning analysis completed!');
  console.log('Conclusion:', reasoningResult.conclusion);
  
  // Step 3: Generate content with GenerationAgent
  console.log('\n--- Step 3: Generating content with GenerationAgent ---');
  // Use the extracted style profile to generate new content
  const styleProfilePath = path.join(
    PROCESSED_DIR, 
    `${path.basename(SAMPLE_TRANSCRIPT, path.extname(SAMPLE_TRANSCRIPT))}_style_profile.json`
  );
  
  // Generate a simple business article using the extracted style
  const generationResult = await system.generationAgent.generateContent(
    'The importance of systems thinking in business', 
    { styleProfilePath }
  );
  
  if (!generationResult.success) {
    console.error('Error generating content:', generationResult.error);
    process.exit(1);
  }
  
  console.log('Content generated successfully!');
  console.log('Preview:', generationResult.revised_draft?.substring(0, 200) + '...');
  
  // Step 4: Evaluate content with FeedbackAgent
  console.log('\n--- Step 4: Evaluating content with FeedbackAgent ---');
  const feedbackResult = await system.feedbackAgent.evaluateContent(
    generationResult.revised_draft || generationResult.draft,
    contentResult.style_profile
  );
  
  if (!feedbackResult.success) {
    console.error('Error evaluating content:', feedbackResult.error);
    process.exit(1);
  }
  
  console.log('Content evaluation completed!');
  console.log('Feedback summary:', feedbackResult.feedback);
  
  if (feedbackResult.human_feedback) {
    console.log('Human feedback received:', feedbackResult.human_feedback);
  }
  
  if (feedbackResult.approved) {
    console.log('Content was approved!');
  } else {
    console.log('Content needs further revision.');
  }
  
  console.log('\n--- Full Agent Pipeline Test Completed Successfully! ---');
}

// Main execution
(async () => {
  try {
    await ensureDirectories();
    await testAgentSystem();
  } catch (error) {
    console.error('Error during agent system test:', error);
    process.exit(1);
  }
})();