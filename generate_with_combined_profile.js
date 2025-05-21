// Script to generate content using the combined style profile

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Paths
const COMBINED_PROFILE_PATH = './processed_transcripts/combined_style_profile.json';
const OUTPUT_DIR = './generated_content';
const TOPIC = process.argv[2] || 'The importance of systems thinking in business';
const CONTENT_TYPE = process.argv[3] || 'article'; // article, sop, course, action_plan

async function generateContent() {
  try {
    console.log(`Generating ${CONTENT_TYPE} on topic: ${TOPIC}`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Check if combined profile exists
    try {
      await fs.access(COMBINED_PROFILE_PATH);
    } catch (error) {
      console.error(`Combined style profile not found at ${COMBINED_PROFILE_PATH}`);
      console.error('Please run "node process_all_docs.js" first to create a combined profile.');
      process.exit(1);
    }
    
    // Read the combined style profile
    const styleProfileText = await fs.readFile(COMBINED_PROFILE_PATH, 'utf-8');
    const styleProfile = JSON.parse(styleProfileText);
    console.log('Loaded combined style profile successfully');
    
    // Check meta info if available
    if (styleProfile.meta) {
      console.log(`Profile created from ${styleProfile.meta.source_count} sources`);
      console.log('Source types:');
      Object.entries(styleProfile.meta.source_types).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    }
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Create different prompts based on content type
    let systemPrompt, userPrompt;
    
    switch (CONTENT_TYPE.toLowerCase()) {
      case 'sop':
        systemPrompt = `You are an SOP generator that creates clear, actionable standard operating procedures in Tina's exact style.`;
        userPrompt = `Create a comprehensive SOP on "${TOPIC}" following the style profile below. The SOP should be clear enough for a 10-year-old to understand, yet detailed enough for a professional to implement. Include specific steps, examples, and rationales.`;
        break;
        
      case 'course':
        systemPrompt = `You are a course designer who creates educational content in Tina's exact style and teaching methodology.`;
        userPrompt = `Create a detailed course outline on "${TOPIC}" following the style profile below. Include:
1. Course title and subtitle
2. Module structure (5-7 modules)
3. Key lessons for each module
4. Learning outcomes
5. Action steps for students

Make sure the course structure reflects Tina's teaching approach and reasoning framework.`;
        break;
        
      case 'action_plan':
        systemPrompt = `You are an action plan creator who develops clear, sequenced plans in Tina's exact style and strategic approach.`;
        userPrompt = `Create a comprehensive action plan for "${TOPIC}" following the style profile below. Include:
1. Clear, sequenced steps
2. Rationales for each step
3. Implementation guidance
4. Success metrics
5. Troubleshooting tips

The plan should reflect Tina's strategic approach and decision-making heuristics.`;
        break;
        
      case 'article':
      default:
        systemPrompt = `You are a content generation agent that perfectly mimics Tina's writing and speaking style.
Your goal is to create content that's indistinguishable from her original work.`;
        userPrompt = `Generate an article on "${TOPIC}" that exactly matches Tina's style profile.`;
        break;
    }
    
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
          content: `Create a detailed content brief for a ${CONTENT_TYPE} about "${TOPIC}". 
          
          Use this style profile to inform the structure, tone, language patterns, approach, and thought framework:
          ${JSON.stringify(styleProfile, null, 2)}
          
          The brief should include:
          - Key points to cover
          - Structure recommendation
          - Tone and voice guidance
          - Specific style elements to incorporate
          - Examples of language patterns to use
          - Reasoning frameworks to employ
          - Decision-making approach to demonstrate
          
          This brief will be used to generate content that authentically matches Tina's voice, thought process, and teaching style.`
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
          content: systemPrompt
        },
        {
          role: "user",
          content: `${userPrompt}
          
          Style Profile:
          ${JSON.stringify(styleProfile, null, 2)}
          
          Content Brief:
          ${contentBrief}
          
          Generate the content in markdown format. Focus on perfectly matching:
          1. Voice, tone, and pacing
          2. Word choice and terminology
          3. Sentence structures and rhetorical devices
          4. Reasoning frameworks and thought patterns
          5. Teaching methods and metaphors
          6. Decision-making heuristics
          7. Value hierarchies
          
          The goal is to make this content indistinguishable from content that Tina would create herself.`
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
          content: `You are a style editor who specializes in refining content to perfectly match Tina's voice and thought patterns.
          Your goal is to make subtle but important adjustments to ensure content authentically matches her specific style.`
        },
        {
          role: "user",
          content: `Refine this draft to perfect the style match with this profile:
          ${JSON.stringify(styleProfile, null, 2)}
          
          Draft:
          ${initialDraft}
          
          Specifically:
          1. Adjust the tone to more precisely match: ${JSON.stringify(styleProfile.tone || {})}
          2. Revise sentence structures to match: ${JSON.stringify(styleProfile.sentence_structure || {})}
          3. Replace words/phrases to better align with: ${JSON.stringify(styleProfile.word_choice || {})}
          4. Ensure pacing matches: ${JSON.stringify(styleProfile.pacing || {})}
          5. Incorporate more of these unique patterns: ${JSON.stringify(styleProfile.unique_patterns || {})}
          6. Apply these reasoning frameworks: ${JSON.stringify(styleProfile.reasoning_frameworks || {})}
          7. Use these teaching methodologies: ${JSON.stringify(styleProfile.teaching_methodologies || {})}
          
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
    const safeContentType = CONTENT_TYPE.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const contentPath = path.join(OUTPUT_DIR, `${safeContentType}_${safeTopicName}_${timestamp}.md`);
    await fs.writeFile(contentPath, refinedContent);
    console.log(`Content saved to: ${contentPath}`);
    
    const briefPath = path.join(OUTPUT_DIR, `${safeContentType}_${safeTopicName}_brief_${timestamp}.md`);
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