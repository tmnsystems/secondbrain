// Script to process a single file from writing_samples directory
// This avoids timeouts by processing one file at a time

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// File to process - change this to process different files
const FILE_TO_PROCESS = process.argv[2] || './apps/ai-writing-system/writing_samples/tina_style.md';
const FILE_TYPE = process.argv[3] || 'style_guide';
const PRIORITY = process.argv[4] || 'very_high';

const OUTPUT_DIR = './processed_data';

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

// Process a single file
async function processSingleFile() {
  try {
    console.log(`Processing file: ${FILE_TO_PROCESS} (${FILE_TYPE}, priority: ${PRIORITY})`);
    
    // Create output directory
    await ensureDirectories();
    
    // Initialize OpenAI
    const openai = await initOpenAI();
    
    // Check if file exists
    try {
      await fs.access(FILE_TO_PROCESS);
    } catch (error) {
      console.error(`File not found: ${FILE_TO_PROCESS}`);
      process.exit(1);
    }
    
    // Read the file
    const content = await fs.readFile(FILE_TO_PROCESS, 'utf-8');
    console.log(`Read ${content.length} characters from file`);
    
    // Truncate content if very large
    const truncatedContent = content.length > 100000 
      ? content.slice(0, 100000) + '... [content truncated for processing]' 
      : content;
    
    console.log("Analyzing content...");
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
          content: `Analyze this ${FILE_TYPE} by Tina Marie Hilton. Extract her unique style, thought patterns, reasoning approaches, and teaching methods.
          
          ${FILE_TYPE.toUpperCase()}:
          ${truncatedContent} 
          
          Focus on identifying:
          1. Her unique voice, tone, and communication style
          2. Terminology, metaphors, and analogies she uses
          3. Her teaching approaches and methodologies
          4. Reasoning frameworks and thought patterns
          5. Decision-making heuristics
          6. Value hierarchy and principles she emphasizes
          
          This is a priority "${PRIORITY}" document for understanding her style.`
        }
      ],
      temperature: 0.3,
    });
    
    const analysis = analysisResponse.choices[0].message.content;
    console.log("Analysis complete, creating style profile...");
    
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
          content: `Based on this analysis of Tina's ${FILE_TYPE}:
          
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
    console.log("Style profile created, saving...");
    
    try {
      const styleProfile = JSON.parse(styleProfileText);
      
      // Add metadata
      const finalProfile = {
        ...styleProfile,
        source_file: FILE_TO_PROCESS,
        content_type: FILE_TYPE,
        priority: PRIORITY
      };
      
      // Save the profile
      const baseName = path.basename(FILE_TO_PROCESS, path.extname(FILE_TO_PROCESS))
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      const outputPath = path.join(OUTPUT_DIR, `${baseName}_style_profile.json`);
      
      await fs.writeFile(outputPath, JSON.stringify(finalProfile, null, 2));
      console.log(`Style profile saved to: ${outputPath}`);
      
      // Also save the analysis for reference
      const analysisPath = path.join(OUTPUT_DIR, `${baseName}_analysis.txt`);
      await fs.writeFile(analysisPath, analysis);
      console.log(`Analysis saved to: ${analysisPath}`);
      
      return { success: true, path: outputPath };
      
    } catch (e) {
      console.error("Failed to parse style profile JSON:", e);
      
      // Save the raw response
      const baseName = path.basename(FILE_TO_PROCESS, path.extname(FILE_TO_PROCESS))
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      const rawPath = path.join(OUTPUT_DIR, `${baseName}_raw.txt`);
      await fs.writeFile(rawPath, styleProfileText);
      console.log(`Raw style profile saved to: ${rawPath}`);
      
      return { success: false, error: e.message, path: rawPath };
    }
    
  } catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
  }
}

// Run the script
processSingleFile();