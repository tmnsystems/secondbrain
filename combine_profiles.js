/**
 * SecondBrain Combined Profile Generator
 * 
 * This module analyzes all existing style profiles and creates a comprehensive combined profile:
 * 1. Loads individual style profiles
 * 2. Identifies consistent patterns across profiles 
 * 3. Weights elements by frequency and importance
 * 4. Creates a unified profile that captures the author's unique style
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const glob = require('glob');

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
const PROFILES_DIR = './processed_data';
const MASTER_PROFILE_PATH = './processed_data/master_style_profile.json';
const COMBINED_PROFILE_PATH = './processed_data/combined_style_profile.json';
const GENERATED_CONTENT_DIR = './generated_content';

/**
 * Main function to create a combined style profile
 */
async function createCombinedProfile() {
  try {
    console.log("Starting combined profile creation...");
    
    // Load all individual profiles
    const profileFiles = glob.sync(path.join(PROFILES_DIR, '*_style_profile.json'));
    console.log(`Found ${profileFiles.length} style profiles to combine`);
    
    if (profileFiles.length === 0) {
      console.error("No style profiles found. Run style analysis first.");
      return { success: false, error: "No style profiles found" };
    }
    
    // Load all profiles
    const profiles = [];
    for (const file of profileFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const profile = JSON.parse(content);
        profiles.push(profile);
        
        // Try to determine content type and priority if not present
        if (!profile.content_type && profile.type) {
          profile.content_type = profile.type;
        }
        
        if (!profile.priority) {
          // Assign priority based on type
          if (profile.type === 'style_guide' || profile.content_type === 'style_guide') {
            profile.priority = 'very_high';
          } else if (profile.type === 'blog_posts' || profile.content_type === 'blog_posts') {
            profile.priority = 'high';
          } else if (profile.type === 'transcript' || profile.content_type === 'transcript') {
            profile.priority = 'medium';
          } else {
            profile.priority = 'low';
          }
        }
        
        console.log(`Loaded profile from ${file} (${profile.content_type || profile.type}, priority: ${profile.priority})`);
      } catch (error) {
        console.error(`Error loading profile ${file}:`, error);
      }
    }
    
    if (profiles.length === 0) {
      console.error('Failed to load any valid profiles.');
      return { success: false, error: "Failed to load any valid profiles" };
    }
    
    // Use OpenAI to create a combined profile
    const combinedResponse = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a style analysis expert who can combine multiple style profiles into a comprehensive unified profile."
        },
        {
          role: "user",
          content: `Combine these ${profiles.length} style profiles into a single, comprehensive style profile:
          
          ${JSON.stringify(profiles, null, 2)}
          
          Create a unified profile that captures the essence across all profiles, weighted by priority.
          Prioritization should be:
          1. "very_high" priority documents (style guide) get highest weight
          2. "high" priority documents (blog posts, coaching transcripts) get second highest
          3. "medium" and lower priority documents get less weight
          
          Include all ten categories: tone, pacing, word_choice, sentence_structure, rhetorical_devices, 
          unique_patterns, reasoning_frameworks, teaching_methodologies, decision_making_heuristics, and value_hierarchy.
          
          For each category, provide:
          - A concise description of the pattern
          - 5-7 specific examples or characteristics
          - How this element contributes to Tina's effectiveness
          
          Return ONLY valid JSON without explanations or other text.`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    // Extract the combined profile
    const combinedProfileText = combinedResponse.choices[0].message.content;
    
    try {
      const combinedProfile = JSON.parse(combinedProfileText);
      
      // Add metadata
      combinedProfile.meta = {
        created_at: new Date().toISOString(),
        source_count: profiles.length,
        source_types: {
          style_guide: profiles.filter(p => (p.content_type === 'style_guide' || p.type === 'style_guide')).length,
          blog_posts: profiles.filter(p => (p.content_type === 'blog_posts' || p.type === 'blog_posts')).length,
          social_media: profiles.filter(p => (p.content_type === 'social_media' || p.type === 'social_media')).length,
          transcript: profiles.filter(p => (p.content_type === 'transcript' || p.type === 'transcript')).length
        },
        priority_distribution: {
          very_high: profiles.filter(p => p.priority === 'very_high').length,
          high: profiles.filter(p => p.priority === 'high').length,
          medium: profiles.filter(p => p.priority === 'medium').length,
          low: profiles.filter(p => p.priority === 'low').length
        }
      };
      
      // Save the combined profile
      await fs.writeFile(COMBINED_PROFILE_PATH, JSON.stringify(combinedProfile, null, 2));
      console.log(`Combined style profile saved to: ${COMBINED_PROFILE_PATH}`);
      
      // Also save as the master profile
      await fs.writeFile(MASTER_PROFILE_PATH, JSON.stringify(combinedProfile, null, 2));
      console.log(`Master style profile saved to: ${MASTER_PROFILE_PATH}`);
      
      // Preview
      console.log('\nCombined Profile Preview:');
      console.log('========================');
      console.log(JSON.stringify(combinedProfile, null, 2).slice(0, 500) + '...');
      console.log('========================');
      
      return { 
        success: true, 
        profilePath: MASTER_PROFILE_PATH,
        sourceProfiles: profiles.length
      };
    } catch (e) {
      console.error("Failed to parse combined profile JSON:", e);
      const rawPath = COMBINED_PROFILE_PATH + ".raw";
      await fs.writeFile(rawPath, combinedProfileText);
      console.log(`Raw combined profile saved to: ${rawPath}`);
      
      return { success: false, error: e.message, path: rawPath };
    }
  } catch (error) {
    console.error("Error creating combined profile:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate content using the master style profile
 */
async function generateWithMasterProfile(topic, contentType = 'article') {
  try {
    console.log(`Generating ${contentType} on topic: "${topic}" with master style profile`);
    
    // Load the master style profile
    const profilePath = MASTER_PROFILE_PATH;
    const profileData = await fs.readFile(profilePath, 'utf-8');
    const styleProfile = JSON.parse(profileData);
    
    // Ensure output directory exists
    await fs.mkdir(GENERATED_CONTENT_DIR, { recursive: true });
    
    // Create prompt based on style profile
    const styleGuidance = JSON.stringify(styleProfile, null, 2);
    
    // Create content generation prompt based on type
    let systemPrompt, userPrompt;
    
    switch (contentType.toLowerCase()) {
      case 'sop':
        systemPrompt = `You are an expert content creator specializing in writing standard operating procedures in a specific author's distinctive style. Use the provided master style profile to perfectly match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns.`;
        userPrompt = `Create a comprehensive SOP on "${topic}" that sounds exactly like the original author wrote it.
        
The SOP should:
- Be clear and actionable
- Include specific, detailed steps
- Explain the rationale behind each step
- Use the author's signature metaphors and teaching style
- Follow their value hierarchy and decision frameworks

Use this comprehensive master style profile to precisely match the author's unique voice:
${styleGuidance}`;
        break;
        
      case 'course':
        systemPrompt = `You are an expert content creator specializing in designing course outlines in a specific author's distinctive style. Use the provided master style profile to perfectly match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns.`;
        userPrompt = `Create a detailed course outline on "${topic}" that sounds exactly like the original author designed it.

The course outline should include:
- A compelling course title and subtitle
- 5-7 modules with clear objectives
- Key lessons for each module
- Learning outcomes and action steps
- The author's signature teaching approaches

Use this comprehensive master style profile to precisely match the author's unique voice:
${styleGuidance}`;
        break;
        
      case 'action_plan':
        systemPrompt = `You are an expert content creator specializing in creating action plans in a specific author's distinctive style. Use the provided master style profile to perfectly match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns.`;
        userPrompt = `Create a comprehensive action plan for "${topic}" that sounds exactly like the original author created it.

The action plan should include:
- Clear, sequenced steps
- Rationales for each step
- Implementation guidance
- Success metrics
- Troubleshooting tips

Use this comprehensive master style profile to precisely match the author's unique voice:
${styleGuidance}`;
        break;
        
      case 'article':
      default:
        systemPrompt = `You are an expert content creator specializing in writing articles in a specific author's distinctive style. Use the provided master style profile to perfectly match their tone, reasoning frameworks, teaching methodologies, and unique communication patterns.`;
        userPrompt = `Write an article on "${topic}" that sounds exactly like the original author wrote it.

The article should:
- Use their unique voice, tone, and rhythm
- Include their characteristic metaphors and analogies
- Follow their reasoning frameworks and teaching approach
- Reflect their values and decision-making style
- Be structured in their typical pattern

Use this comprehensive master style profile to precisely match the author's unique voice:
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
    
    const contentPath = path.join(GENERATED_CONTENT_DIR, `${safeContentType}_${safeTopicName}_master_${timestamp}.md`);
    await fs.writeFile(contentPath, generatedContent);
    
    // Also save a brief about how it was generated
    const briefPath = path.join(GENERATED_CONTENT_DIR, `${safeContentType}_${safeTopicName}_master_brief_${timestamp}.md`);
    await fs.writeFile(briefPath, `# Content Generation Details\n\n* Topic: ${topic}\n* Content Type: ${contentType}\n* Generation Method: Master Style Profile\n* Generated: ${new Date().toISOString()}\n* Profile Source: ${profilePath}\n* Profile Analysis: ${styleProfile.meta?.source_count || 'unknown'} source documents`);
    
    console.log(`Content saved to: ${contentPath}`);
    console.log(`Brief saved to: ${briefPath}`);
    
    return {
      success: true,
      content: generatedContent,
      contentPath,
      briefPath
    };
  } catch (error) {
    console.error("Error generating with master profile:", error);
    return { success: false, error: error.message };
  }
}

// Export the functions
module.exports = {
  createCombinedProfile,
  generateWithMasterProfile
};

// If run directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === "create") {
    createCombinedProfile()
      .then(() => console.log("Combined profile creation complete"))
      .catch(err => console.error("Combined profile creation failed:", err));
  } else if (command === "generate") {
    const topic = process.argv[3] || "The importance of systems thinking in business";
    const contentType = process.argv[4] || "article";
    generateWithMasterProfile(topic, contentType)
      .then(() => console.log("Generation complete"))
      .catch(err => console.error("Generation failed:", err));
  } else {
    console.log(`
SecondBrain Combined Profile Generator - Commands:
  node combine_profiles.js create
      Create a master style profile from all individual profiles
      
  node combine_profiles.js generate "Your topic" article|sop|course|action_plan
      Generate content using the master style profile
    `);
  }
}