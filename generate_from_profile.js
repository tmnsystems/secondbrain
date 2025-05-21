// Simplified script to generate content from the combined style profile

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Paths
const COMBINED_PROFILE_PATH = './processed_data/combined_style_profile.json';
const OUTPUT_DIR = './generated_content';
const TOPIC = process.argv[2] || 'The importance of systems thinking in business';
const CONTENT_TYPE = process.argv[3] || 'article'; // article, sop, course, action_plan

async function generateContent() {
  try {
    console.log(`Generating ${CONTENT_TYPE} on topic: ${TOPIC}`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Check if combined profile exists
    let styleProfile;
    try {
      await fs.access(COMBINED_PROFILE_PATH);
      const styleProfileText = await fs.readFile(COMBINED_PROFILE_PATH, 'utf-8');
      styleProfile = JSON.parse(styleProfileText);
      console.log('Loaded combined style profile successfully');
    } catch (error) {
      console.log('Combined style profile not found, using default style profile');
      // Use a basic default profile if the combined one doesn't exist
      styleProfile = {
        tone: "Conversational, direct, enthusiastic",
        pacing: "Dynamic, varied, with natural pauses for emphasis",
        word_choice: "Clear, strategic, business-focused with occasional metaphors",
        sentence_structure: "Mix of short impactful statements and detailed explanations",
        rhetorical_devices: ["Metaphors", "Analogies", "Strategic questioning"],
        unique_patterns: ["Systems thinking approach", "Clarity-focused explanations", "10-year-old test"]
      };
    }
    
    // Check meta info if available
    if (styleProfile.meta) {
      console.log(`Profile created from ${styleProfile.meta.source_count} sources`);
      console.log('Source types:');
      Object.entries(styleProfile.meta.source_types).forEach(([type, count]) => {
        if (count > 0) console.log(`  - ${type}: ${count}`);
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
    
    // Generate the content directly
    console.log('Generating content...');
    const contentResponse = await openai.chat.completions.create({
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
    
    const generatedContent = contentResponse.choices[0].message.content;
    console.log('Content generated successfully!');
    
    // Save the content
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopicName = TOPIC.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
    const safeContentType = CONTENT_TYPE.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const contentPath = path.join(OUTPUT_DIR, `${safeContentType}_${safeTopicName}_${timestamp}.md`);
    await fs.writeFile(contentPath, generatedContent);
    console.log(`Content saved to: ${contentPath}`);
    
    // Print a preview
    console.log('\nContent Preview:');
    console.log('================\n');
    console.log(generatedContent.substring(0, 1000) + '...');
    console.log('\n================');
    
    console.log('\nContent generation completed successfully!');
  } catch (error) {
    console.error('Error generating content:', error);
    process.exit(1);
  }
}

// Run the script
generateContent();