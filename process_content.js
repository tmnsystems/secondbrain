// Simplified script to process all content in one go, handling any file type

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const glob = require('glob');

// Single content directory
const CONTENT_DIR = './uploads/content';
const OUTPUT_DIR = './processed_data';
const COMBINED_PROFILE_PATH = './processed_data/combined_style_profile.json';

// Initialize OpenAI
let openai;

async function initOpenAI() {
  // Check if OpenAI key is available/uncommented
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

// Process all content
async function processAllContent() {
  try {
    console.log('Starting content processing...');
    
    // Initialize directories
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Initialize OpenAI
    openai = await initOpenAI();
    
    // Find all supported files in the content directory
    const files = await getAllContentFiles();
    
    console.log(`Found ${files.length} files to process`);
    
    // Process each file
    const profiles = [];
    for (const file of files) {
      try {
        console.log(`Processing ${file}...`);
        
        // Determine file type
        const fileExt = path.extname(file).toLowerCase();
        
        // Read the file
        const content = await fs.readFile(file, 'utf-8');
        
        // Handle JSON files specially
        if (fileExt === '.json') {
          try {
            // If it's already a JSON file, try to parse it directly
            const jsonData = JSON.parse(content);
            
            // Check if it's already a style profile
            if (jsonData.tone || jsonData.pacing || jsonData.word_choice) {
              console.log(`File ${file} appears to be a style profile already, adding to profiles.`);
              profiles.push({
                ...jsonData,
                source_file: file,
                content_type: getContentType(file)
              });
              continue;
            }
          } catch (e) {
            console.log(`Could not parse ${file} as JSON, will process as text.`);
          }
        }
        
        // Process as regular content
        const styleProfile = await extractStyleProfile(content, file);
        
        // Save individual profile
        const baseName = path.basename(file, path.extname(file))
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();
        const outputPath = path.join(OUTPUT_DIR, `${baseName}_style_profile.json`);
        
        await fs.writeFile(outputPath, JSON.stringify(styleProfile, null, 2));
        console.log(`Style profile saved to: ${outputPath}`);
        
        profiles.push(styleProfile);
        
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    // Create a combined profile
    if (profiles.length > 0) {
      await createCombinedProfile(profiles);
      console.log(`All ${profiles.length} documents have been processed and combined profile created.`);
    } else {
      console.log('No documents found to process.');
    }
    
  } catch (error) {
    console.error('Error processing content:', error);
    process.exit(1);
  }
}

// Get all files from the content directory
async function getAllContentFiles() {
  const files = [];
  
  // Get all txt, md, and json files recursively
  const pattern = path.join(CONTENT_DIR, '**/*.{txt,md,json}');
  const matches = glob.sync(pattern);
  files.push(...matches);
  
  return files;
}

// Determine content type based on path
function getContentType(filePath) {
  if (filePath.includes('transcript')) {
    return 'transcript';
  } else if (filePath.includes('blog_post')) {
    return 'blog_post';
  } else if (filePath.includes('framework')) {
    return 'framework';
  } else if (filePath.includes('course')) {
    return 'course';
  } else if (filePath.includes('sop')) {
    return 'sop';
  } else {
    return 'uncategorized';
  }
}

// Extract style profile from content
async function extractStyleProfile(content, filePath) {
  // Determine context based on file path
  const contentType = getContentType(filePath);
  
  // Truncate content if very large
  const truncatedContent = content.length > 100000 
    ? content.slice(0, 100000) + '... [content truncated for processing]' 
    : content;
  
  try {
    // First, analyze the content
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content analysis agent specialized in understanding writing styles, voices, and thought patterns."
        },
        {
          role: "user",
          content: `Analyze this ${contentType} written by Tina. Extract her unique style, thought patterns, reasoning approaches, and teaching methods.
          
          ${contentType.toUpperCase()}:
          ${truncatedContent} 
          
          Extract the key concepts, themes, unique language patterns, and reasoning approaches. 
          Focus on identifying Tina's unique voice, terminology, metaphors, teaching approaches, and thought frameworks.`
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
          
          Create a comprehensive style profile that captures her unique voice, including:
          
          1. Tone and emotional qualities
          2. Pacing and rhythm of communication
          3. Word choice and vocabulary patterns
          4. Sentence structure preferences
          5. Rhetorical devices and persuasion techniques
          6. Unique patterns or signature elements
          7. Reasoning frameworks and thought patterns
          8. Teaching methodologies
          9. Decision-making heuristics
          10. Value hierarchies implied in communication
          
          Structure this as a JSON object with these keys. For each key, provide detailed descriptions and examples.
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
        content_type: contentType
      };
    } catch (e) {
      console.warn(`Failed to parse JSON from response for ${filePath}, using raw text`);
      return { 
        raw_profile: styleProfileText, 
        source_file: filePath,
        content_type: contentType 
      };
    }
  } catch (error) {
    console.error(`Error extracting style profile from ${filePath}:`, error);
    return { 
      error: error.message, 
      source_file: filePath,
      content_type: contentType 
    };
  }
}

// Create a combined profile from all individual profiles
async function createCombinedProfile(profiles) {
  try {
    // Use OpenAI to combine profiles
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
          
          Create a unified profile that captures the essence across all profiles. 
          Prioritize consistent patterns that appear across multiple sources.
          For contradictions, weigh frameworks and blog posts higher than social media posts.
          Include all ten categories: tone, pacing, word_choice, sentence_structure, rhetorical_devices, 
          unique_patterns, reasoning_frameworks, teaching_methodologies, decision_making_heuristics, and value_hierarchy.
          
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
          transcript: profiles.filter(p => p.content_type === 'transcript').length,
          blog_post: profiles.filter(p => p.content_type === 'blog_post').length,
          framework: profiles.filter(p => p.content_type === 'framework').length,
          course: profiles.filter(p => p.content_type === 'course').length,
          sop: profiles.filter(p => p.content_type === 'sop').length,
          uncategorized: profiles.filter(p => p.content_type === 'uncategorized').length
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
processAllContent();