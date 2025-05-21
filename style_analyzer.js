/**
 * SecondBrain Style Analyzer
 * 
 * This module analyzes content to extract style elements:
 * 1. Tone and voice patterns
 * 2. Common metaphors and analogies
 * 3. Sentence structure and rhythms
 * 4. Teaching frameworks and methodologies
 * 5. Recurring themes and topics
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
const PROCESSED_CONTENT_DIR = './processed_content';
const PROCESSED_DATA_DIR = './processed_data';

/**
 * Main function to analyze the style from processed content
 */
async function analyzeContentStyle() {
  try {
    console.log("Starting style analysis...");
    
    // Create output directory if it doesn't exist
    await fs.mkdir(PROCESSED_DATA_DIR, { recursive: true });
    
    // Load the content index
    const indexPath = path.join(PROCESSED_CONTENT_DIR, 'content_index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const contentIndex = JSON.parse(indexData);
    
    console.log(`Found ${contentIndex.length} processed content items to analyze`);
    
    // Get ALL files for comprehensive analysis
    const styleAnalysisFiles = getRepresentativeFiles(contentIndex);
    console.log(`Analyzing ALL ${styleAnalysisFiles.length} processed content files for complete style analysis`);
    
    // Process each selected file
    const styleProfiles = [];
    
    for (const file of styleAnalysisFiles) {
      console.log(`Analyzing style for: ${file.fileName} (${file.type})`);
      
      // Load the full content
      const contentData = await fs.readFile(file.cachePath, 'utf-8');
      const contentItem = JSON.parse(contentData);
      
      // Generate a style profile for this content
      const profile = await generateStyleProfile(contentItem);
      
      // Save the individual style profile
      const profileFileName = path.basename(file.fileName, path.extname(file.fileName))
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase() + '_style_profile.json';
      const profilePath = path.join(PROCESSED_DATA_DIR, profileFileName);
      await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
      
      styleProfiles.push(profile);
      console.log(`Saved style profile to ${profilePath}`);
    }
    
    // Create combined style profile
    const combinedProfile = await createCombinedProfile(styleProfiles);
    const combinedProfilePath = path.join(PROCESSED_DATA_DIR, 'combined_style_profile.json');
    await fs.writeFile(combinedProfilePath, JSON.stringify(combinedProfile, null, 2));
    
    console.log(`Completed style analysis: ${styleProfiles.length} profiles created`);
    console.log(`Combined style profile saved to: ${combinedProfilePath}`);
    
    return { 
      success: true, 
      individualProfiles: styleProfiles.length,
      combinedProfilePath
    };
  } catch (error) {
    console.error("Error in style analysis:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all files for comprehensive style analysis
 */
function getRepresentativeFiles(contentIndex) {
  // Return ALL files for comprehensive analysis
  // This will analyze every single processed file to capture complete style patterns
  return contentIndex;
}

/**
 * Generate a style profile for a piece of content
 */
async function generateStyleProfile(contentItem) {
  try {
    // Analyze the content using GPT-4o
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { 
          role: "system", 
          content: `You are an expert stylistic analyzer and content profiler. Your task is to deeply analyze the writing style, 
tone, rhetorical devices, and unique patterns of the provided content. Extract the author's distinctive voice elements 
that make their content recognizable and unique.` 
        },
        { 
          role: "user", 
          content: `Analyze this content (${contentItem.type}) and create a comprehensive style profile.
Extract the following elements:

1. Voice and Tone: Identify the overall tone (formal, conversational, direct, etc.) and distinctive voice patterns.
2. Characteristic Phrases: Extract unique phrases, idioms, or expressions that the author frequently uses.
3. Metaphors and Analogies: Identify common metaphors, analogies, and comparative devices.
4. Structural Patterns: Analyze how content is typically structured, including paragraph length, transitions, and overall organization.
5. Rhetorical Devices: Identify recurring rhetorical techniques like questions, repetition, lists, emphasis, etc.
6. Conceptual Frameworks: Extract any recognizable thinking frameworks, decision models, or teaching methodologies.
7. Value Hierarchy: Determine what the author seems to value most based on emphasis and repetition.
8. Distinctive Vocabulary: Extract unusual, distinctive, or frequent word choices.

Content to analyze:
${contentItem.content}

Format your response as a JSON object with these categories. Include specific examples for each element where possible.`
        }
      ],
      temperature: 0.1,  // Lower temperature for more consistent analysis
      response_format: { type: "json_object" }
    });
    
    // Parse and return the profile
    const profileData = JSON.parse(response.choices[0].message.content);
    
    // Add metadata
    return {
      source: contentItem.fileName,
      type: contentItem.type,
      analyzed_at: new Date().toISOString(),
      profile: profileData
    };
  } catch (error) {
    console.error(`Error generating style profile for ${contentItem.fileName}:`, error);
    // Return basic metadata with error
    return {
      source: contentItem.fileName,
      type: contentItem.type,
      analyzed_at: new Date().toISOString(),
      error: error.message,
      profile: {
        note: "Analysis failed. See error message."
      }
    };
  }
}

/**
 * Create a combined style profile from multiple content profiles
 */
async function createCombinedProfile(profiles) {
  try {
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
    return {
      created_at: new Date().toISOString(),
      source_profiles: profiles.length,
      source_types: [...new Set(profiles.map(p => p.type))],
      profile: combinedProfile
    };
  } catch (error) {
    console.error("Error creating combined profile:", error);
    // Return basic metadata with error
    return {
      created_at: new Date().toISOString(),
      source_profiles: profiles.length,
      error: error.message,
      profile: {
        note: "Combined analysis failed. See error message."
      }
    };
  }
}

/**
 * Generate content using the combined style profile
 */
async function generateWithStyleProfile(topic, contentType = 'article') {
  try {
    console.log(`Generating ${contentType} on topic: "${topic}" with style profile`);
    
    // Load the combined style profile
    const profilePath = path.join(PROCESSED_DATA_DIR, 'combined_style_profile.json');
    const profileData = await fs.readFile(profilePath, 'utf-8');
    const styleProfile = JSON.parse(profileData);
    
    // Ensure output directory exists
    const outputDir = path.join(__dirname, 'generated_content');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create prompt based on style profile
    const styleGuidance = JSON.stringify(styleProfile.profile, null, 2);
    
    // Create content generation prompt based on type
    let systemPrompt, userPrompt;
    
    switch (contentType.toLowerCase()) {
      case 'sop':
        systemPrompt = `You are an expert content creator specializing in writing standard operating procedures in a specific author's distinctive style. Use the provided style profile to match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Create a comprehensive SOP on "${topic}" that sounds exactly like the original author wrote it.
        
The SOP should:
- Be clear and actionable
- Include specific, detailed steps
- Explain the rationale behind each step
- Use the author's signature metaphors and teaching style
- Follow their value hierarchy and decision frameworks

Use the detailed style profile to inform your writing:
${styleGuidance}`;
        break;
        
      case 'course':
        systemPrompt = `You are an expert content creator specializing in designing course outlines in a specific author's distinctive style. Use the provided style profile to match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Create a detailed course outline on "${topic}" that sounds exactly like the original author designed it.

The course outline should include:
- A compelling course title and subtitle
- 5-7 modules with clear objectives
- Key lessons for each module
- Learning outcomes and action steps
- The author's signature teaching approaches

Use the detailed style profile to inform your writing:
${styleGuidance}`;
        break;
        
      case 'action_plan':
        systemPrompt = `You are an expert content creator specializing in creating action plans in a specific author's distinctive style. Use the provided style profile to match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Create a comprehensive action plan for "${topic}" that sounds exactly like the original author created it.

The action plan should include:
- Clear, sequenced steps
- Rationales for each step
- Implementation guidance
- Success metrics
- Troubleshooting tips

Use the detailed style profile to inform your writing:
${styleGuidance}`;
        break;
        
      case 'article':
      default:
        systemPrompt = `You are an expert content creator specializing in writing articles in a specific author's distinctive style. Use the provided style profile to match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns perfectly.`;
        userPrompt = `Write an article on "${topic}" that sounds exactly like the original author wrote it.

The article should:
- Use their unique voice, tone, and rhythm
- Include their characteristic metaphors and analogies
- Follow their reasoning frameworks and teaching approach
- Reflect their values and decision-making style
- Be structured in their typical pattern

Use the detailed style profile to inform your writing:
${styleGuidance}`;
        break;
    }
    
    // Generate content using GPT-4o with style profile
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const generatedContent = response.choices[0].message.content;
    
    // Save the generated content
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopicName = topic.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
    const safeContentType = contentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const contentPath = path.join(outputDir, `${safeContentType}_${safeTopicName}_profile_${timestamp}.md`);
    await fs.writeFile(contentPath, generatedContent);
    
    // Also save a brief about how it was generated
    const briefPath = path.join(outputDir, `${safeContentType}_${safeTopicName}_profile_brief_${timestamp}.md`);
    await fs.writeFile(briefPath, `# Content Generation Details\n\n* Topic: ${topic}\n* Content Type: ${contentType}\n* Generation Method: Style Profile\n* Generated: ${new Date().toISOString()}\n* Profile Source: ${profilePath}\n* Profile Analysis: ${styleProfile.source_profiles} source documents`);
    
    console.log(`Content saved to: ${contentPath}`);
    console.log(`Brief saved to: ${briefPath}`);
    
    return {
      success: true,
      content: generatedContent,
      contentPath,
      briefPath
    };
  } catch (error) {
    console.error("Error generating with style profile:", error);
    return { success: false, error: error.message };
  }
}

// Export the functions
module.exports = {
  analyzeContentStyle,
  generateWithStyleProfile
};

// If run directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === "analyze") {
    analyzeContentStyle()
      .then(() => console.log("Style analysis complete"))
      .catch(err => console.error("Style analysis failed:", err));
  } else if (command === "generate") {
    const topic = process.argv[3] || "The importance of systems thinking in business";
    const contentType = process.argv[4] || "article";
    generateWithStyleProfile(topic, contentType)
      .then(() => console.log("Generation complete"))
      .catch(err => console.error("Generation failed:", err));
  } else {
    console.log(`
SecondBrain Style Analyzer - Commands:
  node style_analyzer.js analyze
      Analyze processed content to create style profiles
      
  node style_analyzer.js generate "Your topic" article|sop|course|action_plan
      Generate content using the combined style profile
    `);
  }
}