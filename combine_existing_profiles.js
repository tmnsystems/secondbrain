/**
 * Combine Existing Style Profiles
 * 
 * This script combines all existing style profiles found in processed_data directory
 * without requiring a full analysis of all files
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const { OpenAI } = require('openai');

// Environment variables check
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: Missing OPENAI_API_KEY in environment variables');
  console.error('Please ensure this is set in your .env file');
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants
const CHAT_MODEL = "gpt-4o";
const PROCESSED_DATA_DIR = './processed_data';

/**
 * Create a combined style profile from existing individual profiles
 */
async function createCombinedProfile() {
  try {
    console.log("Starting combined profile creation...");
    
    // Load all individual profiles
    const profileFiles = glob.sync(path.join(PROCESSED_DATA_DIR, '*_style_profile.json'));
    console.log(`Found ${profileFiles.length} style profiles to combine`);
    
    if (profileFiles.length === 0) {
      console.error("No style profiles found. Run style analysis first.");
      return { success: false, error: "No style profiles found." };
    }
    
    // Load each profile
    const profiles = [];
    
    for (const profileFile of profileFiles) {
      try {
        const data = await fs.readFile(profileFile, 'utf-8');
        const profile = JSON.parse(data);
        profiles.push(profile);
        console.log(`Loaded profile: ${profileFile}`);
      } catch (error) {
        console.error(`Error loading profile ${profileFile}:`, error);
      }
    }
    
    console.log(`Successfully loaded ${profiles.length} profiles for combining`);
    
    // Convert profiles to a format that can be analyzed
    const profilesText = JSON.stringify(profiles, null, 2);
    
    // Generate a combined profile using GPT-4o
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { 
          role: "system", 
          content: `You are an expert at synthesizing stylistic analyses. Your task is to combine multiple content style profiles
into a unified, comprehensive style guide that captures the essence of the author's unique voice.` 
        },
        { 
          role: "user", 
          content: `I have ${profiles.length} style profile analyses from different content pieces by the same author.
Create a unified style profile that synthesizes these individual analyses into a comprehensive guide.

For each category:
1. Identify the most consistent and distinctive patterns across all profiles
2. Note any variations in style between different content types
3. Provide concrete examples for each element
4. Rank elements by distinctiveness and frequency

The unified profile should be usable as a style guide for generating new content that sounds
authentically like the original author.

Here are the individual profiles:
${profilesText}

Format your response as a detailed JSON object with the same categories as the input profiles, 
but with synthesized information and weighted importance for each element.`
        }
      ],
      temperature: 0.2,  // Slightly higher temperature for creative synthesis
      response_format: { type: "json_object" }
    });
    
    // Parse and return the combined profile
    const combinedProfile = JSON.parse(response.choices[0].message.content);
    
    // Add metadata
    const finalProfile = {
      created_at: new Date().toISOString(),
      source_profiles: profiles.length,
      source_types: [...new Set(profiles.map(p => p.type))],
      profile: combinedProfile
    };
    
    // Save the combined profile
    const combinedProfilePath = path.join(PROCESSED_DATA_DIR, 'combined_style_profile.json');
    await fs.writeFile(combinedProfilePath, JSON.stringify(finalProfile, null, 2));
    
    console.log(`Combined profile from ${profiles.length} individual profiles`);
    console.log(`Combined style profile saved to: ${combinedProfilePath}`);
    
    return { 
      success: true, 
      profileCount: profiles.length,
      combinedProfilePath 
    };
  } catch (error) {
    console.error("Error creating combined profile:", error);
    return { success: false, error: error.message };
  }
}

// If run directly
if (require.main === module) {
  createCombinedProfile()
    .then(result => {
      if (result.success) {
        console.log("Successfully created combined style profile.");
      } else {
        console.error("Failed to create combined style profile:", result.error);
      }
    })
    .catch(err => console.error("Error:", err));
}

module.exports = { createCombinedProfile };