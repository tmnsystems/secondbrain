// Direct script to process a transcript - fixed version

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Transcript and output paths
const TRANSCRIPT_PATH = '/Users/tinamarie/Downloads/Mark Sweet + Basis + Tina\'s transcript (9).txt';
const OUTPUT_DIR = './processed_transcripts';

async function processTranscript() {
  try {
    console.log(`Processing transcript: ${TRANSCRIPT_PATH}`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Read the transcript
    const transcript = await fs.readFile(TRANSCRIPT_PATH, 'utf-8');
    console.log(`Loaded transcript: ${transcript.length} characters`);
    
    // Initialize OpenAI
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
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('Analyzing transcript content...');
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content analysis agent specialized in understanding writing styles, voices, and teaching approaches."
        },
        {
          role: "user",
          content: `Analyze the following transcript and extract the unique style and voice of the speaker named Tina.
          
          Transcript:
          ${transcript.slice(0, 100000)} 
          
          Extract the key concepts, themes, and unique language patterns from this transcript. 
          Focus on identifying Tina's unique voice, terminology, metaphors, and teaching approaches.`
        }
      ],
      temperature: 0.3,
    });
    
    const analysis = analysisResponse.choices[0].message.content;
    console.log('Analysis complete!');
    
    console.log('Creating style profile...');
    const styleResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Create a style profile based on analysis of speaking patterns. Return valid JSON only."
        },
        {
          role: "user",
          content: `Based on this analysis of Tina's speaking style:
          
          ${analysis}
          
          Create a comprehensive style profile that captures her unique voice, including tone, pacing, 
          word choice, sentence structure, and rhetorical devices. 
          
          Structure this as a JSON object with the following keys: 
          - tone
          - pacing
          - word_choice
          - sentence_structure
          - rhetorical_devices
          - unique_patterns
          
          Return ONLY valid JSON without explanations or other text.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    // Extract the style profile
    const styleProfileText = styleResponse.choices[0].message.content;
    let styleProfile;
    
    try {
      styleProfile = JSON.parse(styleProfileText);
    } catch (e) {
      console.warn("Failed to parse JSON from response, using raw text");
      styleProfile = { raw_profile: styleProfileText };
    }
    
    // Save the style profile
    const basename = path.basename(TRANSCRIPT_PATH, path.extname(TRANSCRIPT_PATH))
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const outputPath = path.join(OUTPUT_DIR, `${basename}_style_profile.json`);
    
    await fs.writeFile(outputPath, JSON.stringify(styleProfile, null, 2));
    console.log(`Style profile saved to: ${outputPath}`);
    console.log('Sample of style profile:');
    console.log(JSON.stringify(styleProfile, null, 2).slice(0, 500) + '...');
    
    // Also save the analysis
    const analysisPath = path.join(OUTPUT_DIR, `${basename}_analysis.txt`);
    await fs.writeFile(analysisPath, analysis);
    console.log(`Analysis saved to: ${analysisPath}`);
    
    console.log('\nProcess completed successfully!');
  } catch (error) {
    console.error('Error processing transcript:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
processTranscript();