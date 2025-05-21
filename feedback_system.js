/**
 * SecondBrain Feedback System
 * 
 * This module handles user feedback on generated content:
 * 1. Records feedback for future reference
 * 2. Analyzes feedback patterns
 * 3. Generates improvement suggestions
 * 4. Incorporates feedback into future content generation
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Environment variables check
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: Missing OPENAI_API_KEY in environment variables');
  console.error('Please ensure this is set in your .env file');
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants
const CHAT_MODEL = "gpt-4o";
const FEEDBACK_DIR = './feedback_data';
const GENERATED_CONTENT_DIR = './generated_content';

/**
 * Record feedback for generated content
 */
async function recordFeedback(contentPath, feedbackText, rating = null) {
  try {
    console.log(`Recording feedback for: ${path.basename(contentPath)}`);
    
    // Create feedback directory if it doesn't exist
    await fs.mkdir(FEEDBACK_DIR, { recursive: true });
    
    // Load generated content
    const content = await fs.readFile(contentPath, 'utf-8');
    const contentName = path.basename(contentPath);
    
    // Create feedback record
    const feedbackRecord = {
      timestamp: new Date().toISOString(),
      contentPath,
      contentName,
      rating: rating || 0, // 1-5 scale, 0 if not provided
      feedback: feedbackText,
      contentPreview: content.substring(0, 300) + '...'
    };
    
    // Save feedback record
    const feedbackPath = path.join(FEEDBACK_DIR, 
      contentName.replace('.md', '_feedback_record.json'));
    await fs.writeFile(feedbackPath, JSON.stringify(feedbackRecord, null, 2));
    
    // Also save human feedback as markdown
    const humanFeedbackPath = path.join(FEEDBACK_DIR,
      contentName.replace('.md', '_human_feedback.md'));
    await fs.writeFile(humanFeedbackPath, 
      `# Human Feedback on: ${contentName}\n\n${feedbackText}`);
    
    // Analyze feedback and generate suggestions
    await analyzeFeedback(contentPath, content, feedbackText, feedbackRecord);
    
    console.log(`Feedback saved to ${feedbackPath}`);
    
    return { 
      success: true,
      feedbackPath,
      contentName
    };
  } catch (error) {
    console.error("Error recording feedback:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze feedback and generate improvement suggestions
 */
async function analyzeFeedback(contentPath, content, feedbackText, feedbackRecord) {
  try {
    console.log(`Analyzing feedback for: ${path.basename(contentPath)}`);
    
    // Use GPT-4o to analyze feedback and generate suggestions
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { 
          role: "system", 
          content: `You are an expert content analyzer and feedback interpreter. Your task is to analyze human feedback 
on a piece of content, identify key improvement areas, and generate specific, actionable suggestions for improvement.` 
        },
        { 
          role: "user", 
          content: `I've received the following feedback on a piece of content. Please analyze it and provide:

1. A summary of the key points in the feedback
2. An analysis of strengths and weaknesses identified
3. Specific, actionable suggestions for improvement
4. A high-level strategy for incorporating this feedback into future content

Content:
\`\`\`
${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}
\`\`\`

Feedback:
\`\`\`
${feedbackText}
\`\`\`

Format your response in markdown with clear sections and bullet points.`
        }
      ],
      temperature: 0.3,
    });
    
    const analysis = response.choices[0].message.content;
    
    // Generate improvement suggestions
    const suggestionsResponse = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { 
          role: "system", 
          content: `You are an expert content creator specializing in implementing feedback. Your task is to provide specific,
detailed suggestions on how to improve content based on feedback received.` 
        },
        { 
          role: "user", 
          content: `Based on the following content and feedback, provide concrete, implementable suggestions for improvement.
Focus on actionable changes that would address the specific feedback points.

Content:
\`\`\`
${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}
\`\`\`

Feedback:
\`\`\`
${feedbackText}
\`\`\`

Analysis:
\`\`\`
${analysis}
\`\`\`

Format your response as a markdown list of specific, actionable suggestions with examples where appropriate.`
        }
      ],
      temperature: 0.4,
    });
    
    const suggestions = suggestionsResponse.choices[0].message.content;
    
    // Save analysis and suggestions
    const analysisPath = path.join(FEEDBACK_DIR,
      path.basename(contentPath).replace('.md', '_analysis.md'));
    await fs.writeFile(analysisPath, analysis);
    
    const suggestionsPath = path.join(FEEDBACK_DIR,
      path.basename(contentPath).replace('.md', '_suggestions.md'));
    await fs.writeFile(suggestionsPath, suggestions);
    
    console.log(`Feedback analysis saved to ${analysisPath}`);
    console.log(`Improvement suggestions saved to ${suggestionsPath}`);
    
    return { 
      success: true,
      analysisPath,
      suggestionsPath
    };
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate content incorporating previous feedback
 */
async function generateWithFeedback(topic, contentType = 'article', localContextSystem = null) {
  try {
    console.log(`Generating ${contentType} on "${topic}" with feedback incorporation`);
    
    // Get relevant feedback for this topic and content type
    const relevantFeedback = await findRelevantFeedback(topic, contentType);
    
    if (!relevantFeedback || relevantFeedback.length === 0) {
      console.log("No relevant feedback found, using standard generation");
      
      // Use the local context system for generation if provided
      if (localContextSystem) {
        return await localContextSystem.generateWithContext(topic, contentType);
      } else {
        throw new Error("Local context system not provided for standard generation");
      }
    }
    
    // Compile feedback insights
    const feedbackInsights = relevantFeedback.map(feedback => {
      return `
Feedback on: ${feedback.contentName}
Key points: ${feedback.analysis?.summary || "No analysis available"}
Suggestions: ${feedback.suggestions?.slice(0, 300) || "No suggestions available"}
---`;
    }).join("\n\n");
    
    // Get context using local context system if provided
    let contextTexts = "";
    if (localContextSystem) {
      const relevantContext = await localContextSystem.findRelevantContext(topic, 5, contentType);
      contextTexts = relevantContext.map(item => 
        `--- START CONTEXT (${item.type}) ---\nFrom: ${item.fileName}\n${item.content}\n--- END CONTEXT ---`
      ).join('\n\n');
    }
    
    // Create content generation prompt with feedback
    let systemPrompt, userPrompt;
    
    switch (contentType.toLowerCase()) {
      case 'sop':
        systemPrompt = `You are an expert content creator specializing in writing standard operating procedures. Use the provided context and feedback insights to create content that matches the requested style while addressing previous feedback.`;
        userPrompt = `Create a comprehensive SOP on "${topic}" that incorporates insights from previous feedback.
        
The SOP should:
- Be clear and actionable
- Include specific, detailed steps
- Explain the rationale behind each step
- Match the author's signature style and teaching approach
- Address the improvement areas identified in previous feedback

Previous feedback insights to incorporate:
${feedbackInsights}`;
        break;
        
      case 'course':
        systemPrompt = `You are an expert content creator specializing in designing course outlines. Use the provided context and feedback insights to create content that matches the requested style while addressing previous feedback.`;
        userPrompt = `Create a detailed course outline on "${topic}" that incorporates insights from previous feedback.

The course outline should include:
- A compelling course title and subtitle
- 5-7 modules with clear objectives
- Key lessons for each module
- Learning outcomes and action steps
- Match the author's signature teaching approach
- Address the improvement areas identified in previous feedback

Previous feedback insights to incorporate:
${feedbackInsights}`;
        break;
        
      case 'action_plan':
        systemPrompt = `You are an expert content creator specializing in creating action plans. Use the provided context and feedback insights to create content that matches the requested style while addressing previous feedback.`;
        userPrompt = `Create a comprehensive action plan for "${topic}" that incorporates insights from previous feedback.

The action plan should include:
- Clear, sequenced steps
- Rationales for each step
- Implementation guidance
- Success metrics
- Troubleshooting tips
- Match the author's signature strategic approach
- Address the improvement areas identified in previous feedback

Previous feedback insights to incorporate:
${feedbackInsights}`;
        break;
        
      case 'article':
      default:
        systemPrompt = `You are an expert content creator specializing in writing articles. Use the provided context and feedback insights to create content that matches the requested style while addressing previous feedback.`;
        userPrompt = `Write an article on "${topic}" that incorporates insights from previous feedback.

The article should:
- Match the author's unique voice, tone, and rhythm
- Include characteristic metaphors and analogies
- Follow the author's reasoning frameworks and teaching approach
- Reflect their values and decision-making style
- Be structured in their typical pattern
- Address the improvement areas identified in previous feedback

Previous feedback insights to incorporate:
${feedbackInsights}`;
        break;
    }
    
    // Add context if available
    if (contextTexts) {
      userPrompt += `\n\nHere is additional context to inform your writing:\n\n${contextTexts}`;
    }
    
    // Generate content using GPT-4o with feedback insights
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const generatedContent = response.choices[0].message.content;
    
    // Save the generated content
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopicName = topic.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
    const safeContentType = contentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Ensure output directory exists
    const outputDir = path.join(__dirname, 'generated_content');
    await fs.mkdir(outputDir, { recursive: true });
    
    const contentPath = path.join(outputDir, `${safeContentType}_${safeTopicName}_with_feedback_${timestamp}.md`);
    await fs.writeFile(contentPath, generatedContent);
    
    // Also save a brief about how it was generated
    const briefPath = path.join(outputDir, `${safeContentType}_${safeTopicName}_with_feedback_brief_${timestamp}.md`);
    await fs.writeFile(briefPath, 
      `# Content Generation with Feedback\n\n* Topic: ${topic}\n* Content Type: ${contentType}` +
      `\n* Generation Method: With Feedback Incorporation\n* Generated: ${new Date().toISOString()}` +
      `\n* Feedback Sources: ${relevantFeedback.length} relevant feedback items`);
    
    console.log(`Content saved to: ${contentPath}`);
    console.log(`Brief saved to: ${briefPath}`);
    
    return {
      success: true,
      content: generatedContent,
      contentPath,
      briefPath,
      feedbackSources: relevantFeedback.length
    };
  } catch (error) {
    console.error("Error generating with feedback:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Find relevant feedback for a topic and content type
 */
async function findRelevantFeedback(topic, contentType) {
  try {
    // Get all feedback files
    const feedbackFiles = await fs.readdir(FEEDBACK_DIR);
    const feedbackRecords = [];
    
    // Load each feedback record
    for (const file of feedbackFiles) {
      if (file.endsWith('_feedback_record.json')) {
        try {
          const filePath = path.join(FEEDBACK_DIR, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const record = JSON.parse(data);
          
          // Add the content name to help with relevance checking
          record.contentName = path.basename(record.contentPath);
          
          // Try to load analysis and suggestions if they exist
          try {
            const analysisPath = path.join(FEEDBACK_DIR, 
              record.contentName.replace('.md', '_analysis.md'));
            const suggestionsPath = path.join(FEEDBACK_DIR,
              record.contentName.replace('.md', '_suggestions.md'));
            
            if (await fileExists(analysisPath)) {
              record.analysis = await fs.readFile(analysisPath, 'utf-8');
            }
            
            if (await fileExists(suggestionsPath)) {
              record.suggestions = await fs.readFile(suggestionsPath, 'utf-8');
            }
          } catch (e) {
            // No analysis or suggestions, that's okay
          }
          
          feedbackRecords.push(record);
        } catch (error) {
          console.error(`Error loading feedback record ${file}:`, error);
        }
      }
    }
    
    // Filter by content type if applicable
    let filteredRecords = feedbackRecords;
    if (contentType) {
      filteredRecords = feedbackRecords.filter(record => 
        record.contentName.startsWith(contentType.toLowerCase()) ||
        record.contentName.includes(`_${contentType.toLowerCase()}_`)
      );
    }
    
    // Simple relevance scoring based on topic keywords
    const scoredRecords = filteredRecords.map(record => {
      // Calculate a simple relevance score
      let score = 0;
      
      // Split topic into keywords
      const keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      // Check content name
      keywords.forEach(keyword => {
        if (record.contentName.toLowerCase().includes(keyword)) {
          score += 0.5;
        }
      });
      
      // Check feedback text
      keywords.forEach(keyword => {
        if (record.feedback.toLowerCase().includes(keyword)) {
          score += 0.3;
        }
      });
      
      // Check content preview
      keywords.forEach(keyword => {
        if (record.contentPreview.toLowerCase().includes(keyword)) {
          score += 0.2;
        }
      });
      
      return { ...record, relevanceScore: score };
    });
    
    // Sort by relevance score and return top 3
    return scoredRecords
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
  } catch (error) {
    console.error("Error finding relevant feedback:", error);
    return [];
  }
}

/**
 * Helper function to check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Export the functions
module.exports = {
  recordFeedback,
  analyzeFeedback,
  generateWithFeedback,
  findRelevantFeedback
};

// If run directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === "feedback") {
    const contentPath = process.argv[3];
    const feedbackText = process.argv[4] || "No specific feedback provided.";
    const rating = parseInt(process.argv[5] || "0");
    
    if (!contentPath) {
      console.error("Error: Content path is required");
      process.exit(1);
    }
    
    recordFeedback(contentPath, feedbackText, rating)
      .then(() => console.log("Feedback recorded successfully"))
      .catch(err => console.error("Error recording feedback:", err));
  } else if (command === "generate") {
    const topic = process.argv[3] || "business systems for service businesses";
    const contentType = process.argv[4] || "article";
    
    // Try to load the local context system
    try {
      const localContextSystem = require('./local_context_system');
      generateWithFeedback(topic, contentType, localContextSystem)
        .then(() => console.log("Generation with feedback complete"))
        .catch(err => console.error("Error generating with feedback:", err));
    } catch (err) {
      console.error("Error loading local context system:", err);
      console.log("Attempting generation without context system...");
      generateWithFeedback(topic, contentType)
        .then(() => console.log("Generation with feedback complete"))
        .catch(err => console.error("Error generating with feedback:", err));
    }
  } else {
    console.log(`
SecondBrain Feedback System - Commands:
  node feedback_system.js feedback "path/to/content.md" "Your feedback text here" [rating]
      Record feedback for generated content and analyze it
      
  node feedback_system.js generate "Your topic" article|sop|course|action_plan
      Generate content incorporating previous feedback
    `);
  }
}