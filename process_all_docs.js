// Script to process all document types (.txt, .md, .json) for style profile extraction

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const glob = require('glob');

// Paths
const UPLOAD_DIR = './uploads';
const OUTPUT_DIR = './processed_transcripts';
const COMBINED_PROFILE_PATH = './processed_transcripts/combined_style_profile.json';

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

// Process all documents
async function processAllDocuments() {
  try {
    console.log('Starting document processing...');
    
    // Initialize directories
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Initialize OpenAI
    openai = await initOpenAI();
    
    // Get all documents
    const txtFiles = await getFilesOfType('txt');
    const mdFiles = await getFilesOfType('md');
    const jsonFiles = await getFilesOfType('json');
    
    console.log(`Found ${txtFiles.length} .txt files`);
    console.log(`Found ${mdFiles.length} .md files`);
    console.log(`Found ${jsonFiles.length} .json files`);
    
    // Process each document type
    const txtProfiles = await processFiles(txtFiles, 'txt');
    const mdProfiles = await processFiles(mdFiles, 'md');
    const jsonProfiles = await processFiles(jsonFiles, 'json');
    
    // Combine all profiles
    const allProfiles = [...txtProfiles, ...mdProfiles, ...jsonProfiles];
    
    // Create a combined profile
    if (allProfiles.length > 0) {
      await createCombinedProfile(allProfiles);
      console.log(`All ${allProfiles.length} documents have been processed and combined profile created.`);
    } else {
      console.log('No documents found to process.');
    }
    
  } catch (error) {
    console.error('Error processing documents:', error);
    process.exit(1);
  }
}

// Get files of a specific type
async function getFilesOfType(extension) {
  // Check specific subdirectories first
  const subDirs = [
    extension,
    'transcripts',
    'blog_posts',
    'frameworks',
    'sops',
    'courses',
    'social_media'
  ];
  
  let files = [];
  
  for (const dir of subDirs) {
    const pattern = path.join(UPLOAD_DIR, dir, `**/*.${extension}`);
    const matches = glob.sync(pattern);
    files = files.concat(matches);
  }
  
  // Also check the root uploads directory
  const rootPattern = path.join(UPLOAD_DIR, `*.${extension}`);
  const rootMatches = glob.sync(rootPattern);
  files = files.concat(rootMatches);
  
  return files;
}

// Process a list of files
async function processFiles(files, type) {
  const profiles = [];
  
  for (const file of files) {
    try {
      console.log(`Processing ${file}...`);
      
      // Read the file
      const content = await fs.readFile(file, 'utf-8');
      
      // Process content based on file type
      let jsonData;
      if (type === 'json') {
        try {
          // If it's already a JSON file, try to parse it directly
          jsonData = JSON.parse(content);
          
          // Check if it's already a style profile
          if (jsonData.tone || jsonData.pacing || jsonData.word_choice) {
            console.log(`File ${file} appears to be a style profile already, adding to profiles.`);
            profiles.push(jsonData);
            continue;
          }
        } catch (e) {
          console.log(`Could not parse ${file} as JSON, will process as text.`);
        }
      }
      
      // Process as text content
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
  
  return profiles;
}

// Extract style profile from content
async function extractStyleProfile(content, filePath) {
  // Determine context based on file path
  let context = "document";
  if (filePath.includes('transcript')) {
    context = "transcript";
  } else if (filePath.includes('blog_post')) {
    context = "blog post";
  } else if (filePath.includes('framework')) {
    context = "framework";
  } else if (filePath.includes('sop')) {
    context = "SOP";
  } else if (filePath.includes('course')) {
    context = "course material";
  } else if (filePath.includes('social_media')) {
    context = "social media post";
  }
  
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
          content: `Analyze this ${context} written by Tina. Extract her unique style, thought patterns, reasoning approaches, and teaching methods.
          
          ${context.toUpperCase()}:
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
          content: `Based on this analysis of Tina's ${context}:
          
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
      return JSON.parse(styleProfileText);
    } catch (e) {
      console.warn(`Failed to parse JSON from response for ${filePath}, using raw text`);
      return { raw_profile: styleProfileText, source_file: filePath };
    }
  } catch (error) {
    console.error(`Error extracting style profile from ${filePath}:`, error);
    return { error: error.message, source_file: filePath };
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
          For contradictions, weigh blog posts and frameworks higher than social media posts.
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
          transcripts: profiles.filter(p => p.source_file && p.source_file.includes('transcript')).length,
          blog_posts: profiles.filter(p => p.source_file && p.source_file.includes('blog_post')).length,
          frameworks: profiles.filter(p => p.source_file && p.source_file.includes('framework')).length,
          sops: profiles.filter(p => p.source_file && p.source_file.includes('sop')).length,
          courses: profiles.filter(p => p.source_file && p.source_file.includes('course')).length,
          social_media: profiles.filter(p => p.source_file && p.source_file.includes('social_media')).length,
          other: profiles.filter(p => !p.source_file || 
            (!p.source_file.includes('transcript') && 
             !p.source_file.includes('blog_post') && 
             !p.source_file.includes('framework') && 
             !p.source_file.includes('sop') && 
             !p.source_file.includes('course') && 
             !p.source_file.includes('social_media'))).length
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
processAllDocuments();