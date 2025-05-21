// Script to evaluate the quality of generated content against the style profile

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Paths
const STYLE_PROFILE_PATH = './processed_transcripts/mark_sweet___basis___tina_s_transcript__9__style_profile.json';
const CONTENT_PATH = './generated_content/how_to_create_effective_business_systems_that_scal_2025-05-04T02-19-27-998Z.md';
const OUTPUT_DIR = './feedback_data';

async function evaluateContent() {
  try {
    console.log(`Evaluating content: ${CONTENT_PATH}`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Read the style profile and content
    const styleProfileText = await fs.readFile(STYLE_PROFILE_PATH, 'utf-8');
    const styleProfile = JSON.parse(styleProfileText);
    
    const content = await fs.readFile(CONTENT_PATH, 'utf-8');
    console.log('Loaded files successfully');
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Analyze content against style profile
    console.log('Analyzing content against style profile...');
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a style and content evaluator who provides detailed feedback on how well content matches a specific style profile."
        },
        {
          role: "user",
          content: `Analyze the provided content against this style profile. Focus on:
          1. Tone and voice consistency
          2. Language pattern adherence
          3. Sentence structure alignment
          4. Word choice appropriateness
          5. Overall authenticity to the original style
          
          Style Profile:
          ${JSON.stringify(styleProfile, null, 2)}
          
          Content to analyze:
          ${content}
          
          Provide your analysis as a structured evaluation with clear ratings (1-10) for each area and specific examples.`
        }
      ],
      temperature: 0.2,
    });
    
    const analysisResult = analysisResponse.choices[0].message.content;
    console.log('Content analysis complete!');
    
    // Generate revision suggestions
    console.log('Generating revision suggestions...');
    const suggestionsResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a style improvement expert who provides specific, actionable revision suggestions."
        },
        {
          role: "user",
          content: `Based on this analysis:
          ${analysisResult}
          
          Provide specific, actionable revision suggestions to better align the content with the target style. For each suggestion:
          1. Quote the specific text that needs revision
          2. Explain why it doesn't match the style
          3. Provide a rewritten version that better matches the style
          
          Organize your suggestions by priority (critical, important, minor).`
        }
      ],
      temperature: 0.3,
    });
    
    const revisionSuggestions = suggestionsResponse.choices[0].message.content;
    console.log('Revision suggestions generated!');
    
    // Simulate human feedback
    console.log('Simulating human feedback...');
    const humanFeedbackResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are simulating Tina giving feedback on content written in her style. Be specific and constructive, pointing out both strengths and areas for improvement."
        },
        {
          role: "user",
          content: `You are Tina. This content was written to match your speaking and writing style:
          ${content}
          
          Provide your feedback as if you were reviewing it. What works well? What doesn't sound like you? 
          How can it be improved to better match your voice? Be specific and constructive.
          
          Base your feedback on this style profile of your communication:
          ${JSON.stringify(styleProfile, null, 2)}`
        }
      ],
      temperature: 0.7,
    });
    
    const humanFeedback = humanFeedbackResponse.choices[0].message.content;
    console.log('Human feedback simulation complete!');
    
    // Save all feedback
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(CONTENT_PATH, path.extname(CONTENT_PATH));
    
    // Save analysis
    const analysisPath = path.join(OUTPUT_DIR, `${baseName}_analysis.md`);
    await fs.writeFile(analysisPath, analysisResult);
    console.log(`Analysis saved to: ${analysisPath}`);
    
    // Save revision suggestions
    const suggestionsPath = path.join(OUTPUT_DIR, `${baseName}_suggestions.md`);
    await fs.writeFile(suggestionsPath, revisionSuggestions);
    console.log(`Revision suggestions saved to: ${suggestionsPath}`);
    
    // Save human feedback
    const feedbackPath = path.join(OUTPUT_DIR, `${baseName}_human_feedback.md`);
    await fs.writeFile(feedbackPath, humanFeedback);
    console.log(`Human feedback saved to: ${feedbackPath}`);
    
    // Save complete feedback record
    const feedbackRecord = {
      timestamp: new Date().toISOString(),
      content_path: CONTENT_PATH,
      style_profile_path: STYLE_PROFILE_PATH,
      analysis: analysisResult,
      suggestions: revisionSuggestions,
      human_feedback: humanFeedback,
      approved: false // Would be set based on real human feedback
    };
    
    const recordPath = path.join(OUTPUT_DIR, `${baseName}_feedback_record.json`);
    await fs.writeFile(recordPath, JSON.stringify(feedbackRecord, null, 2));
    console.log(`Complete feedback record saved to: ${recordPath}`);
    
    // Print a summary
    console.log('\nFeedback Summary:');
    console.log('================\n');
    console.log('Analysis Overview:');
    console.log(analysisResult.substring(0, 500) + '...\n');
    
    console.log('Human Feedback:');
    console.log(humanFeedback.substring(0, 500) + '...\n');
    console.log('================');
    
    console.log('\nContent evaluation completed successfully!');
  } catch (error) {
    console.error('Error evaluating content:', error);
    process.exit(1);
  }
}

// Run the script
evaluateContent();