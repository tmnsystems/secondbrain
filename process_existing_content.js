// Script to process existing content from writing_samples directory

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const glob = require('glob');

// Source directories
const WRITING_SAMPLES_DIR = './apps/ai-writing-system/writing_samples';
const OUTPUT_DIR = './processed_data';
const COMBINED_PROFILE_PATH = './processed_data/combined_style_profile.json';

// Ensure directories exists
async function ensureDirectories() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

// Initialize OpenAI
async function initOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not found in .env, uncommenting it...');
    // When the key is commented out in .env, let's uncomment it
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    // Uncomment the OpenAI key
    const updatedEnvContent = envContent.replace('# OPENAI_API_KEY=', 'OPENAI_API_KEY=');
    await fs.writeFile(envPath, updatedEnvContent);
    
    // Reload environment variables
    require('dotenv').config({ override: true });
    console.log('OpenAI API key has been uncommented and loaded.');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Process key content samples
async function processExistingContent() {
  try {
    console.log('Starting to process existing content from writing_samples...');
    
    // Create output directory
    await ensureDirectories();
    
    // Initialize OpenAI
    const openai = await initOpenAI();
    
    // Find content to process
    const contentToProcess = [
      // Key style document
      {
        file: path.join(WRITING_SAMPLES_DIR, 'tina_style.md'),
        type: 'style_guide',
        priority: 'very_high'
      },
      
      // Blog posts
      {
        file: path.join(WRITING_SAMPLES_DIR, 'written_content/Blog Posts .txt'),
        type: 'blog_posts',
        priority: 'high'
      },
      
      // Facebook posts
      {
        file: path.join(WRITING_SAMPLES_DIR, 'facebook/facebookposts2015-21725.md'),
        type: 'social_media',
        priority: 'medium'
      },
      
      // Selected transcripts - coaching sessions where Tina is speaking
      {
        file: path.join(WRITING_SAMPLES_DIR, 'transcripts/Done Transcript for Fuji_Tina Coaching.txt'),
        type: 'transcript',
        priority: 'high'
      },
      {
        file: path.join(WRITING_SAMPLES_DIR, 'transcripts/Done Transcript for Maria & Tina🪄.txt'),
        type: 'transcript',
        priority: 'high'
      },
      {
        file: path.join(WRITING_SAMPLES_DIR, 'transcripts/Done Transcript for Laura + Tina.txt'),
        type: 'transcript',
        priority: 'high'
      }
    ];
    
    console.log(`Processing ${contentToProcess.length} key content samples...`);
    
    // Process each file
    const profiles = [];
    for (const item of contentToProcess) {
      try {
        console.log(`Processing ${item.file} (${item.type}, priority: ${item.priority})...`);
        
        // Check if file exists
        try {
          await fs.access(item.file);
        } catch (error) {
          console.error(`File not found: ${item.file}`);
          continue;
        }
        
        // Read the file
        const content = await fs.readFile(item.file, 'utf-8');
        
        // Truncate content if very large
        const truncatedContent = content.length > 100000 
          ? content.slice(0, 100000) + '... [content truncated for processing]' 
          : content;
        
        // Extract style profile
        const styleProfile = await extractStyleProfile(openai, truncatedContent, item.file, item.type, item.priority);
        
        // Save individual profile
        const baseName = path.basename(item.file, path.extname(item.file))
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();
        const outputPath = path.join(OUTPUT_DIR, `${baseName}_style_profile.json`);
        
        await fs.writeFile(outputPath, JSON.stringify(styleProfile, null, 2));
        console.log(`Style profile saved to: ${outputPath}`);
        
        profiles.push(styleProfile);
        
      } catch (error) {
        console.error(`Error processing file ${item.file}:`, error);
      }
    }
    
    // Create a combined profile
    if (profiles.length > 0) {
      await createCombinedProfile(openai, profiles);
      console.log(`All ${profiles.length} documents have been processed and combined profile created.`);
    } else {
      console.log('No documents were successfully processed.');
    }
    
  } catch (error) {
    console.error('Error processing content:', error);
    process.exit(1);
  }
}

// Extract style profile from content
async function extractStyleProfile(openai, content, filePath, contentType, priority) {
  try {
    // First, analyze the content
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content analysis agent specialized in understanding writing styles, voices, thought patterns, and teaching approaches."
        },
        {
          role: "user",
          content: `Analyze this ${contentType} by Tina Marie Hilton. Extract her unique style, thought patterns, reasoning approaches, and teaching methods.
          
          ${contentType.toUpperCase()}:
          ${content} 
          
          Focus on identifying:
          1. Her unique voice, tone, and communication style
          2. Terminology, metaphors, and analogies she uses
          3. Her teaching approaches and methodologies
          4. Reasoning frameworks and thought patterns
          5. Decision-making heuristics
          6. Value hierarchy and principles she emphasizes
          
          This is a priority "${priority}" document for understanding her style.`
        }
      ],
      temperature: 0.3,
    });
    
    const analysis = analysisResponse.choices[0].message.content;
    
    // Then, create a style profile
    const styleResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Create a comprehensive style profile based on analysis of writing and speaking patterns. Return valid JSON only."
        },
        {
          role: "user",
          content: `Based on this analysis of Tina's ${contentType}:
          
          ${analysis}
          
          Create a comprehensive style profile that captures her unique voice, including these categories:
          
          1. tone - Emotional quality and attitude in communication
          2. pacing - Rhythm and flow of ideas
          3. word_choice - Vocabulary patterns and terminology
          4. sentence_structure - How sentences are constructed and varied
          5. rhetorical_devices - Persuasive techniques and figures of speech
          6. unique_patterns - Signature elements that distinguish her style
          7. reasoning_frameworks - How she structures thinking and problem-solving
          8. teaching_methodologies - Approaches to instruction and explanation
          9. decision_making_heuristics - Mental shortcuts and rules of thumb
          10. value_hierarchy - Principles and priorities that guide her approach
          
          For each category, provide:
          - A concise description of the pattern
          - 3-5 specific examples or characteristics
          - How this element contributes to her effectiveness
          
          Structure this as a valid JSON object with the categories as keys.
          Return ONLY valid JSON without explanations or other text.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    // Extract the style profile
    const styleProfileText = styleResponse.choices[0].message.content;
    
    try {
      const styleProfile = JSON.parse(styleProfileText);
      return {
        ...styleProfile,
        source_file: filePath,
        content_type: contentType,
        priority: priority
      };
    } catch (e) {
      console.warn(`Failed to parse JSON from response for ${filePath}, using raw text`);
      return { 
        raw_profile: styleProfileText, 
        source_file: filePath,
        content_type: contentType,
        priority: priority 
      };
    }
  } catch (error) {
    console.error(`Error extracting style profile from ${filePath}:`, error);
    return { 
      error: error.message, 
      source_file: filePath,
      content_type: contentType,
      priority: priority 
    };
  }
}

// Create a combined profile from all individual profiles
async function createCombinedProfile(openai, profiles) {
  try {
    // Use OpenAI to combine profiles with proper weighting
    const combinedResponse = await openai.chat.completions.create({
      model: "gpt-4o",
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
          style_guide: profiles.filter(p => p.content_type === 'style_guide').length,
          blog_posts: profiles.filter(p => p.content_type === 'blog_posts').length,
          social_media: profiles.filter(p => p.content_type === 'social_media').length,
          transcript: profiles.filter(p => p.content_type === 'transcript').length
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
      
      return combinedProfile;
    } catch (e) {
      console.error("Failed to parse combined profile JSON:", e);
      await fs.writeFile(COMBINED_PROFILE_PATH + ".raw", combinedProfileText);
      console.log(`Raw combined profile text saved to: ${COMBINED_PROFILE_PATH}.raw`);
    }
  } catch (error) {
    console.error('Error creating combined profile:', error);
  }
}

// Run the script
processExistingContent();