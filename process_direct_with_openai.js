// Direct script to process a transcript using OpenAI instead of Claude

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { ChatOpenAI } = require("@langchain/openai");

// Sample transcript path
const SAMPLE_TRANSCRIPT = process.argv[2] || './transcripts/sweet_basis_tina_transcript.txt';
const OUTPUT_DIR = './processed_transcripts';

async function processTranscript() {
  try {
    console.log(`Processing transcript: ${SAMPLE_TRANSCRIPT}`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Make sure the transcript file exists
    try {
      await fs.access(SAMPLE_TRANSCRIPT);
    } catch (error) {
      // If the transcript doesn't exist at the specified path,
      // copy it from the Downloads folder to our transcripts directory
      const transcriptFileName = path.basename(SAMPLE_TRANSCRIPT);
      const downloadsPath = `/Users/tinamarie/Downloads/Mark Sweet + Basis + Tina's transcript (9).txt`;
      const localPath = `./transcripts/sweet_basis_tina_transcript.txt`;
      
      console.log(`Copying transcript from ${downloadsPath} to ${localPath}`);
      await fs.mkdir('./transcripts', { recursive: true });
      await fs.copyFile(downloadsPath, localPath);
      
      // Update the sample transcript path
      SAMPLE_TRANSCRIPT = localPath;
    }
    
    // Read the transcript
    const transcript = await fs.readFile(SAMPLE_TRANSCRIPT, 'utf-8');
    console.log(`Loaded transcript: ${transcript.length} characters`);
    
    // Set up model
    // Try to use OpenAI if Claude isn't working
    let model;
    
    if (process.env.OPENAI_API_KEY) {
      console.log('Using OpenAI for analysis...');
      model = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o",
        temperature: 0.3
      });
    } else {
      throw new Error('No API keys available for language models');
    }
    
    console.log('Analyzing transcript content...');
    const analysisResponse = await model.invoke([
      { 
        role: 'user', 
        content: `You are a content analysis agent specialized in understanding writing styles, voices, and teaching approaches. 
        Your task is to analyze the following transcript and extract the unique style and voice of the speaker named Tina.
        
        Transcript:
        ${transcript.slice(0, 100000)} 
        
        Extract the key concepts, themes, and unique language patterns from this transcript. 
        Focus on identifying Tina's unique voice, terminology, metaphors, and teaching approaches.`
      }
    ]);
    
    console.log('Creating style profile...');
    const styleResponse = await model.invoke([
      { 
        role: 'user', 
        content: `Based on the analysis you just performed on Tina's speaking style in the transcript, 
        create a comprehensive style profile that captures her unique voice, including tone, pacing, 
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
    ]);
    
    // Extract JSON from the response
    const responseText = styleResponse.content;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/{[\s\S]*}/);
    
    let styleProfile;
    if (jsonMatch) {
      try {
        styleProfile = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e) {
        console.warn("Failed to parse JSON from response, using raw text");
        styleProfile = { raw_profile: responseText };
      }
    } else {
      styleProfile = { raw_profile: responseText };
    }
    
    // Save the style profile
    const basename = path.basename(SAMPLE_TRANSCRIPT, path.extname(SAMPLE_TRANSCRIPT));
    const outputPath = path.join(OUTPUT_DIR, `${basename}_style_profile.json`);
    
    await fs.writeFile(outputPath, JSON.stringify(styleProfile, null, 2));
    console.log(`Style profile saved to: ${outputPath}`);
    console.log('Sample of style profile:');
    console.log(JSON.stringify(styleProfile, null, 2).slice(0, 500) + '...');
    
    console.log('\nProcess completed successfully!');
  } catch (error) {
    console.error('Error processing transcript:', error);
    process.exit(1);
  }
}

// Run the script
processTranscript();