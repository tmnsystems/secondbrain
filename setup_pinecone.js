/**
 * Setup Pinecone for SecondBrain
 * 
 * This script:
 * 1. Creates a Pinecone index if it doesn't exist
 * 2. Configures it properly for OpenAI embeddings
 * 3. Tests the connection
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

// Environment variables check
const requiredEnvVars = ['PINECONE_API_KEY', 'PINECONE_ENVIRONMENT'];
const missingVars = requiredEnvVars.filter(name => !process.env[name]);
if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please ensure these are set in your .env file');
  process.exit(1);
}

// Configuration
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'secondbrain-index';
const DIMENSION = 3072; // For text-embedding-3-large
const METRIC = 'cosine';

async function setupPinecone() {
  try {
    console.log('Connecting to Pinecone...');
    
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });
    
    console.log('Connected to Pinecone successfully');
    
    // List existing indexes
    const indexes = await pinecone.listIndexes();
    console.log('Current indexes:', indexes.map(index => index.name));
    
    // Check if our index already exists
    const indexExists = indexes.some(index => index.name === INDEX_NAME);
    
    if (indexExists) {
      console.log(`Index '${INDEX_NAME}' already exists`);
      
      // Check if we need to update the .env file
      if (!process.env.PINECONE_INDEX_NAME) {
        await updateEnvFile('PINECONE_INDEX_NAME', INDEX_NAME);
        console.log(`Updated .env file with PINECONE_INDEX_NAME=${INDEX_NAME}`);
      }
    } else {
      console.log(`Creating new index '${INDEX_NAME}'...`);
      
      // Create the index
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: DIMENSION,
        metric: METRIC,
      });
      
      console.log(`Index '${INDEX_NAME}' created successfully`);
      
      // Update .env file
      await updateEnvFile('PINECONE_INDEX_NAME', INDEX_NAME);
      console.log(`Updated .env file with PINECONE_INDEX_NAME=${INDEX_NAME}`);
      
      // Wait for index to initialize
      console.log('Waiting for index to initialize (this may take a minute)...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    // Describe the index
    const index = pinecone.index(INDEX_NAME);
    const stats = await index.describeIndexStats();
    
    console.log('Index statistics:', stats);
    console.log(`\nPinecone setup complete! Index '${INDEX_NAME}' is ready to use.`);
    console.log('\nNext step: Run "node true_context_system.js ingest" to ingest your content');
    
    return { success: true, indexName: INDEX_NAME };
  } catch (error) {
    console.error('Error setting up Pinecone:', error);
    return { success: false, error: error.message };
  }
}

// Update .env file with new values
async function updateEnvFile(key, value) {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(process.cwd(), '.env');
  
  // Read the current .env file
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (error) {
    console.warn(`Warning: Could not read .env file: ${error.message}`);
    envContent = '';
  }
  
  // Check if the key already exists
  const keyRegex = new RegExp(`^${key}=.*`, 'm');
  if (keyRegex.test(envContent)) {
    // Update the existing key
    envContent = envContent.replace(keyRegex, `${key}=${value}`);
  } else {
    // Add the key
    envContent += `\n${key}=${value}`;
  }
  
  // Write the updated content back to the .env file
  try {
    fs.writeFileSync(envPath, envContent);
  } catch (error) {
    console.error(`Error updating .env file: ${error.message}`);
    throw error;
  }
}

// Run the setup
if (require.main === module) {
  setupPinecone()
    .then(result => {
      if (result.success) {
        console.log(`\nSuccess! Pinecone index '${result.indexName}' is ready.`);
      } else {
        console.error(`\nSetup failed: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error during setup:', err);
      process.exit(1);
    });
}