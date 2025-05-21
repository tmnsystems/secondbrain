// Script to generate content using the extracted style profile

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Paths
const STYLE_PROFILE_PATH = './processed_transcripts/mark_sweet___basis___tina_s_transcript__9__style_profile.json';
const OUTPUT_DIR = './generated_content';
const TOPIC = process.argv[2] || 'The importance of systems thinking in business';

async function generateContent() {
  try {
    console.log(`Generating content on topic: ${TOPIC}`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Read the style profile
    const styleProfileText = await fs.readFile(STYLE_PROFILE_PATH, 'utf-8');
    const styleProfile = JSON.parse(styleProfileText);
    console.log('Loaded style profile successfully');
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // First, create a content brief
    console.log('Creating content brief...');
    const briefResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a specialized content strategy agent. Create detailed content briefs based on style profiles."
        },
        {
          role: "user",
          content: `Create a detailed content brief for a piece about "${TOPIC}". 
          
          Use this style profile to inform the structure, tone, language patterns, and approach:
          ${JSON.stringify(styleProfile, null, 2)}
          
          The brief should include:
          - Key points to cover
          - Structure recommendation
          - Tone guidance
          - Specific style elements to incorporate
          - Examples of language patterns to use
          
          This brief will be used to generate content that authentically matches the voice in the style profile.`
        }
      ],
      temperature: 0.5,
    });
    
    const contentBrief = briefResponse.choices[0].message.content;
    console.log('Content brief created successfully');
    
    // Generate the content based on the brief
    console.log('Generating initial draft...');
    const draftResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a content generation agent that perfectly mimics specific writing and speaking styles.
          Your goal is to create content that's indistinguishable from the original author's style.`
        },
        {
          role: "user",
          content: `Generate content that exactly matches this style profile:
          ${JSON.stringify(styleProfile, null, 2)}
          
          Content Brief:
          ${contentBrief}
          
          Topic: ${TOPIC}
          
          Generate the content in markdown format. Focus on perfectly matching the voice, tone, pacing, 
          word choice, and sentence structures described in the style profile. The goal is to make this 
          content indistinguishable from content that would be created by the person whose style profile 
          is provided.`
        }
      ],
      temperature: 0.7,
    });
    
    const initialDraft = draftResponse.choices[0].message.content;
    console.log('Initial draft generated!');
    
    // Refine the content to better match the style
    console.log('Refining content to perfect style match...');
    const refinementResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a style editor who specializes in refining content to perfectly match a target style.
          Your goal is to make subtle but important adjustments to ensure content authentically matches a specific voice.`
        },
        {
          role: "user",
          content: `Refine this draft to perfect the style match with this profile:
          ${JSON.stringify(styleProfile, null, 2)}
          
          Draft:
          ${initialDraft}
          
          Specifically:
          1. Adjust the tone to more precisely match: ${JSON.stringify(styleProfile.tone)}
          2. Revise sentence structures to match: ${JSON.stringify(styleProfile.sentence_structure)}
          3. Replace words/phrases to better align with: ${JSON.stringify(styleProfile.word_choice)}
          4. Ensure pacing matches: ${JSON.stringify(styleProfile.pacing)}
          5. Incorporate more of these unique patterns: ${JSON.stringify(styleProfile.unique_patterns)}
          
          Don't explain your changes - just provide the refined content in markdown format.`
        }
      ],
      temperature: 0.5,
    });
    
    const refinedContent = refinementResponse.choices[0].message.content;
    console.log('Content successfully refined!');
    
    // Save the content and brief
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopicName = TOPIC.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
    
    const contentPath = path.join(OUTPUT_DIR, `${safeTopicName}_${timestamp}.md`);
    await fs.writeFile(contentPath, refinedContent);
    console.log(`Content saved to: ${contentPath}`);
    
    const briefPath = path.join(OUTPUT_DIR, `${safeTopicName}_brief_${timestamp}.md`);
    await fs.writeFile(briefPath, contentBrief);
    console.log(`Content brief saved to: ${briefPath}`);
    
    // Print a preview
    console.log('\nContent Preview:');
    console.log('================\n');
    console.log(refinedContent.substring(0, 1000) + '...');
    console.log('\n================');
    
    console.log('\nContent generation completed successfully!');
  } catch (error) {
    console.error('Error generating content:', error);
    process.exit(1);
  }
}

// Run the script
generateContent();