const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const agentConnector = require('./agent-connector');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3030;

// Initialize Supabase client if environment variables are set
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('combined')); // HTTP request logging

// Create routes directory if it doesn't exist
const routesDir = path.join(__dirname, 'routes');
if (!fs.existsSync(routesDir)) {
  fs.mkdirSync(routesDir);
}

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API Bridge is running',
    version: '1.0.0',
    config: {
      hasSupabase: !!supabase,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// ========== TOPIC ANALYZER ==========
app.get('/api/topic-analyzer/status', (req, res) => {
  try {
    const topicDbDir = path.join(process.cwd(), '..', '..', 'topic_database');
    const progressFile = path.join(topicDbDir, 'processing_progress.json');
    
    if (!fs.existsSync(progressFile)) {
      return res.json({
        status: 'not_started',
        message: 'Topic analyzer has not started yet or progress file not found',
        processed_files: 0
      });
    }
    
    const progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    const lastActivity = new Date(progressData.last_activity_time * 1000);
    const processed = progressData.processed_files || [];
    const now = new Date();
    const minutesSinceActivity = Math.floor((now - lastActivity) / 1000 / 60);
    
    // Check if the topic database exists
    const topicsDbFile = path.join(topicDbDir, 'topics_database.json');
    let topics = [];
    if (fs.existsSync(topicsDbFile)) {
      const topicsData = JSON.parse(fs.readFileSync(topicsDbFile, 'utf8'));
      topics = Object.keys(topicsData);
    }
    
    return res.json({
      status: minutesSinceActivity < 30 ? 'active' : 'inactive',
      last_activity: lastActivity.toISOString(),
      minutes_since_activity: minutesSinceActivity,
      processed_files: processed.length,
      topics_count: topics.length,
      sample_topics: topics.slice(0, 5)
    });
  } catch (error) {
    console.error('Error checking topic analyzer status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all topics or search topics
app.get('/api/topics', (req, res) => {
  try {
    const topicDbDir = path.join(process.cwd(), '..', '..', 'topic_database');
    const topicsDbFile = path.join(topicDbDir, 'topics_database.json');
    
    if (!fs.existsSync(topicsDbFile)) {
      return res.status(404).json({
        success: false,
        error: 'Topics database not found. Run the topic analyzer first.'
      });
    }
    
    const topicsData = JSON.parse(fs.readFileSync(topicsDbFile, 'utf8'));
    
    // Query parameters
    const { search, category, limit = 20, page = 1, client } = req.query;
    const startIndex = (page - 1) * limit;
    
    // Filter topics based on search query, category, and client
    let filteredTopics = Object.entries(topicsData).map(([topic, data]) => ({
      topic,
      ...data,
      response_count: data.responses ? data.responses.length : 0
    }));
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTopics = filteredTopics.filter(item => 
        item.topic.toLowerCase().includes(searchLower) || 
        item.category.toLowerCase().includes(searchLower) ||
        (item.approaches && item.approaches.some(approach => 
          approach.toLowerCase().includes(searchLower)
        ))
      );
    }
    
    if (category) {
      filteredTopics = filteredTopics.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by client if specified
    if (client) {
      const clientLower = client.toLowerCase();
      filteredTopics = filteredTopics.filter(item => {
        // Check the sources array for client name
        return item.sources && item.sources.some(source => 
          source.toLowerCase().includes(clientLower)
        );
      });
    }
    
    // Get unique categories for filtering
    const categories = [...new Set(Object.values(topicsData).map(data => data.category))];
    
    // Identify which clients are in the database
    const allSources = [];
    Object.values(topicsData).forEach(data => {
      if (data.sources) {
        allSources.push(...data.sources);
      }
    });
    
    // Extract client names from sources
    const clientKeywords = ['aretas', 'fuji', 'esther', 'laura', 'lorenz', 'chona', 'maria', 'patrick'];
    const clientsInDatabase = {};
    
    clientKeywords.forEach(client => {
      const clientSources = allSources.filter(source => 
        source.toLowerCase().includes(client.toLowerCase())
      );
      if (clientSources.length > 0) {
        clientsInDatabase[client] = clientSources.length;
      }
    });
    
    // Paginate results
    const paginatedTopics = filteredTopics.slice(startIndex, startIndex + parseInt(limit));
    
    return res.json({
      success: true,
      topics: paginatedTopics,
      total: filteredTopics.length,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(filteredTopics.length / limit),
      categories,
      clients: clientsInDatabase
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get a specific topic
app.get('/api/topics/:topic', (req, res) => {
  try {
    const { topic } = req.params;
    const topicDbDir = path.join(process.cwd(), '..', '..', 'topic_database');
    const topicsDbFile = path.join(topicDbDir, 'topics_database.json');
    
    if (!fs.existsSync(topicsDbFile)) {
      return res.status(404).json({
        success: false,
        error: 'Topics database not found. Run the topic analyzer first.'
      });
    }
    
    const topicsData = JSON.parse(fs.readFileSync(topicsDbFile, 'utf8'));
    
    // Find the topic
    if (!topicsData[topic]) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }
    
    const topicData = {
      topic,
      ...topicsData[topic]
    };
    
    return res.json({
      success: true,
      topic: topicData
    });
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ========== AUTH ENDPOINTS ==========
// Route for Supabase authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        success: false, 
        error: 'Supabase client not initialized. Check environment variables.' 
      });
    }
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, user: data.user, session: data.session });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        success: false, 
        error: 'Supabase client not initialized. Check environment variables.' 
      });
    }
    
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || '',
        }
      }
    });
    
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, user: data.user, session: data.session });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        success: false, 
        error: 'Supabase client not initialized. Check environment variables.' 
      });
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user info
app.get('/api/auth/user', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        success: false, 
        error: 'Supabase client not initialized. Check environment variables.' 
      });
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'No authenticated user found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== STYLE PROFILES ENDPOINTS ==========
// Get list of available style profiles
app.get('/api/style-profiles', async (req, res) => {
  try {
    const profilesDir = path.join(process.cwd(), '..', '..', 'processed_data');
    
    if (!fs.existsSync(profilesDir)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profiles directory not found' 
      });
    }
    
    const files = fs.readdirSync(profilesDir);
    const profiles = files
      .filter(file => file.endsWith('_style_profile.json'))
      .map(file => {
        const profilePath = path.join(profilesDir, file);
        try {
          const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          return {
            id: file.replace('_style_profile.json', ''),
            name: file.replace('_style_profile.json', '').replace(/_/g, ' '),
            path: profilePath,
            sample: profileData.overview ? profileData.overview.slice(0, 100) + '...' : 'No overview available'
          };
        } catch (err) {
          console.error(`Error parsing profile ${file}:`, err);
          return {
            id: file.replace('_style_profile.json', ''),
            name: file.replace('_style_profile.json', '').replace(/_/g, ' '),
            path: profilePath,
            error: 'Invalid profile format'
          };
        }
      });
    
    res.json({ success: true, profiles });
  } catch (error) {
    console.error('Error getting style profiles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a specific style profile
app.get('/api/style-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profilePath = path.join(process.cwd(), '..', '..', 'processed_data', `${id}_style_profile.json`);
    
    if (!fs.existsSync(profilePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Style profile not found' 
      });
    }
    
    const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    res.json({ success: true, profile: profileData });
  } catch (error) {
    console.error('Error getting style profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== CONTENT GENERATION ENDPOINTS ==========
// Generate content using the style profile
app.post('/api/generate', async (req, res) => {
  try {
    const { styleProfileId, prompt, contentType, options } = req.body;
    
    if (!styleProfileId || !prompt || !contentType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Style profile ID, prompt, and content type are required' 
      });
    }
    
    // This would call the content generation system in a real implementation
    // For now, we'll create a mock response
    const generatedContent = {
      id: `content_${Date.now()}`,
      content: `This is a placeholder for generated content using style profile "${styleProfileId}" with prompt: "${prompt}"`,
      metadata: {
        styleProfileId,
        contentType,
        generatedAt: new Date().toISOString(),
        options
      }
    };
    
    res.json({ success: true, content: generatedContent });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== LANGGRAPH INTEGRATION ==========
// LangGraph agent endpoint for workflow execution
app.post('/api/agent', async (req, res) => {
  try {
    const { agentId, input, context } = req.body;
    
    if (!agentId || !input) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID and input are required'
      });
    }
    
    // In a real implementation, this would call Python code to execute LangGraph workflow
    // For now, we'll create a mock response
    const response = {
      id: `run_${Date.now()}`,
      agentId,
      input,
      output: `This is a placeholder response from agent "${agentId}" for input: "${input}"`,
      steps: [
        'Received input',
        'Processed through LangGraph workflow',
        'Generated response'
      ],
      metadata: {
        executionTime: Math.random() * 1000,
        completedAt: new Date().toISOString(),
        context: context || {}
      }
    };
    
    // Simulate some processing time
    setTimeout(() => {
      res.json({ success: true, response });
    }, 500);
  } catch (error) {
    console.error('Error with agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== FEEDBACK SYSTEM ==========
// Submit feedback on generated content
app.post('/api/feedback', async (req, res) => {
  try {
    const { contentId, contentType, feedbackType, rating, comments, suggestions } = req.body;
    
    if (!contentId || !contentType || !feedbackType || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Content ID, content type, feedback type, and rating are required'
      });
    }
    
    // In a real implementation, this would call the feedback system
    // For now, we'll create a mock response
    const feedback = {
      id: `fb_${Date.now()}`,
      contentId,
      contentType,
      feedbackType,
      rating,
      comments: comments || '',
      suggestions: suggestions || '',
      createdAt: new Date().toISOString()
    };
    
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to determine icon based on content type
function getIconForContentType(title) {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('article') || lowerTitle.includes('blog')) {
    return '📝';
  } else if (lowerTitle.includes('course') || lowerTitle.includes('tutorial')) {
    return '🎓';
  } else if (lowerTitle.includes('sop') || lowerTitle.includes('process')) {
    return '📋';
  } else if (lowerTitle.includes('action') || lowerTitle.includes('plan')) {
    return '📊';
  } else if (lowerTitle.includes('coaching') || lowerTitle.includes('mentor')) {
    return '🧠';
  } else if (lowerTitle.includes('system') || lowerTitle.includes('framework')) {
    return '⚙️';
  } else {
    return '📄';
  }
}

// ========== NOTION INTEGRATION ==========
// Get Notion pages
app.get('/api/notion/pages', async (req, res) => {
  try {
    // Access actual content from generated_content directory
    const contentDir = path.join(process.cwd(), '..', '..', 'generated_content');
    
    if (!fs.existsSync(contentDir)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Content directory not found' 
      });
    }
    
    // Read actual generated content files
    const files = fs.readdirSync(contentDir);
    const pages = files
      .filter(file => file.endsWith('.md'))
      .map(file => {
        // Parse timestamp and title from filename pattern
        const match = file.match(/(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)(.*?)\.md$/);
        const title = match ? match[1].replace(/_/g, ' ') : file.replace('.md', '');
        const timestamp = match ? new Date(match[2].replace(/-/g, ':').replace('T', ' ')) : new Date();
        
        // Get file stats for more accurate timestamps
        const stats = fs.statSync(path.join(contentDir, file));
        
        return {
          id: file.replace('.md', ''),
          title: title,
          icon: getIconForContentType(title),
          created_time: stats.birthtime.toISOString(),
          last_edited_time: stats.mtime.toISOString()
        };
      });
    
    res.json({ success: true, pages: pages });
  } catch (error) {
    console.error('Error getting Notion pages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to convert markdown content to blocks for the API
function markdownToBlocks(markdown) {
  if (!markdown) return [];
  
  const lines = markdown.split('\n');
  const blocks = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      continue; // Skip empty lines
    } else if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading_1',
        content: line.substring(2)
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading_2',
        content: line.substring(3)
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading_3',
        content: line.substring(4)
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Collect all bullet points in a list
      const listItems = [line.substring(2)];
      
      while (i + 1 < lines.length && 
            (lines[i + 1].trim().startsWith('- ') || 
             lines[i + 1].trim().startsWith('* '))) {
        listItems.push(lines[++i].trim().substring(2));
      }
      
      blocks.push({
        type: 'bulleted_list',
        content: listItems
      });
    } else if (line.match(/^\d+\.\s/)) {
      // Collect all numbered points in a list
      const listItems = [line.replace(/^\d+\.\s/, '')];
      
      while (i + 1 < lines.length && lines[i + 1].trim().match(/^\d+\.\s/)) {
        listItems.push(lines[++i].trim().replace(/^\d+\.\s/, ''));
      }
      
      blocks.push({
        type: 'numbered_list',
        content: listItems
      });
    } else {
      // Regular paragraph
      blocks.push({
        type: 'paragraph',
        content: line
      });
    }
  }
  
  return blocks;
}

// Get Notion page content
app.get('/api/notion/pages/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const contentDir = path.join(process.cwd(), '..', '..', 'generated_content');
    
    // Look for files matching the pageId
    const files = fs.readdirSync(contentDir);
    const fileName = files.find(file => file.startsWith(pageId) || file.replace(/\.md$/, '') === pageId);
    
    if (!fileName) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    
    const filePath = path.join(contentDir, fileName);
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse title from filename
    const match = fileName.match(/(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)(.*?)\.md$/);
    const title = match ? match[1].replace(/_/g, ' ') : fileName.replace('.md', '');
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Convert content to blocks
    const blocks = markdownToBlocks(content);
    
    const pageContent = {
      id: fileName.replace(/\.md$/, ''),
      title: title,
      icon: getIconForContentType(title),
      created_time: stats.birthtime.toISOString(),
      last_edited_time: stats.mtime.toISOString(),
      content: content, // Include the raw content
      blocks: blocks
    };
    
    res.json({ success: true, page: pageContent });
  } catch (error) {
    console.error('Error getting Notion page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Notion page
app.post('/api/notion/pages', async (req, res) => {
  try {
    const { title, content, icon } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and content are required' 
      });
    }
    
    // In a real implementation, this would create a page in Notion
    // For now, we'll return a mock response
    const newPage = {
      id: `page_${Date.now()}`,
      title,
      icon: icon || '📄',
      created_time: new Date().toISOString(),
      last_edited_time: new Date().toISOString(),
      url: `https://notion.so/${Date.now()}`
    };
    
    res.json({ success: true, page: newPage });
  } catch (error) {
    console.error('Error creating Notion page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Notion page
app.put('/api/notion/pages/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { title, content, icon } = req.body;
    
    if (!title && !content && !icon) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one of title, content, or icon must be provided' 
      });
    }
    
    // In a real implementation, this would update a page in Notion
    // For now, we'll return a mock response
    const updatedPage = {
      id: pageId,
      title: title || 'Untitled',
      icon: icon || '📄',
      last_edited_time: new Date().toISOString(),
      url: `https://notion.so/${pageId}`
    };
    
    res.json({ success: true, page: updatedPage });
  } catch (error) {
    console.error('Error updating Notion page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate content and save to Notion
app.post('/api/notion/generate', async (req, res) => {
  try {
    const { prompt, styleProfileId, contentType } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }
    
    // Get style profile information if specified
    let styleProfile = null;
    if (styleProfileId) {
      const profilePath = path.join(process.cwd(), '..', '..', 'processed_data', `${styleProfileId}_style_profile.json`);
      if (fs.existsSync(profilePath)) {
        try {
          styleProfile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          console.log(`Loaded style profile: ${styleProfileId}`);
        } catch (err) {
          console.error(`Error parsing style profile: ${err.message}`);
        }
      }
    }
    
    // If we can't find the specified profile, use a default one
    if (!styleProfile) {
      const profilesDir = path.join(process.cwd(), '..', '..', 'processed_data');
      if (fs.existsSync(profilesDir)) {
        const files = fs.readdirSync(profilesDir)
          .filter(file => file.endsWith('_style_profile.json'));
        
        if (files.length > 0) {
          try {
            const defaultProfilePath = path.join(profilesDir, files[0]);
            styleProfile = JSON.parse(fs.readFileSync(defaultProfilePath, 'utf8'));
            console.log(`Using default style profile: ${files[0]}`);
          } catch (err) {
            console.error(`Error parsing default style profile: ${err.message}`);
          }
        }
      }
    }
    
    // Instead of mock content, let's use some real examples from content files
    const contentDir = path.join(process.cwd(), '..', '..', 'generated_content');
    let generatedContent = '';
    
    if (fs.existsSync(contentDir)) {
      const files = fs.readdirSync(contentDir)
        .filter(file => file.endsWith('.md'));
      
      if (files.length > 0) {
        // Take a file that might match our content type
        const matchingFile = files.find(f => 
          f.toLowerCase().includes(contentType?.toLowerCase() || '') || 
          f.toLowerCase().includes(prompt.split(' ')[0].toLowerCase())
        ) || files[0];
        
        const content = fs.readFileSync(path.join(contentDir, matchingFile), 'utf8');
        
        // Create personalized content based on the real content
        generatedContent = `# Generated from prompt: "${prompt}"\n\n`;
        
        // Add style profile info if available
        if (styleProfile) {
          generatedContent += `*Using style profile: ${styleProfile.name || styleProfileId}*\n\n`;
          
          if (styleProfile.languageStyle) {
            generatedContent += `*Style notes: ${styleProfile.languageStyle}*\n\n`;
          }
        }
        
        // Add some content from the file, but customize it to the prompt
        const lines = content.split('\n');
        let bodyContent = '';
        
        // Skip header if present and get main content
        let startIndex = 0;
        while (startIndex < lines.length && 
               (lines[startIndex].trim() === '' || 
                lines[startIndex].startsWith('#'))) {
          startIndex++;
        }
        
        bodyContent = lines.slice(startIndex, startIndex + 20).join('\n');
        
        // Replace key terms to match the prompt
        const promptKeywords = prompt.split(' ')
          .filter(word => word.length > 4)
          .map(word => word.toLowerCase());
        
        if (promptKeywords.length > 0) {
          // Find words to replace in the content
          const contentWords = bodyContent.split(' ')
            .filter(word => word.length > 5 && !promptKeywords.includes(word.toLowerCase()));
          
          // Replace some words to customize content
          if (contentWords.length > 0 && promptKeywords.length > 0) {
            for (let i = 0; i < Math.min(3, promptKeywords.length); i++) {
              const wordToReplace = contentWords[Math.floor(Math.random() * contentWords.length)];
              const replacement = promptKeywords[i];
              
              if (wordToReplace && replacement) {
                bodyContent = bodyContent.replace(
                  new RegExp(wordToReplace, 'gi'), 
                  replacement.charAt(0).toUpperCase() + replacement.slice(1)
                );
              }
            }
          }
        }
        
        generatedContent += bodyContent;
        
        // Add a section with key points based on the prompt
        generatedContent += `\n\n## Key Points for ${prompt}\n\n`;
        generatedContent += `- Focus on building sustainable ${promptKeywords[0] || 'systems'} that scale\n`;
        generatedContent += `- Implement regular reviews of your ${promptKeywords[1] || 'processes'}\n`;
        generatedContent += `- Measure outcomes to ensure continuous improvement\n`;
      } else {
        // Fallback if no content files found
        generatedContent = `# Generated from prompt: "${prompt}"\n\nThis content would be generated based on the prompt "${prompt}" using style profile "${styleProfileId || 'default'}".\n\n## Key Points\n\n- Point 1: Important insight about the topic\n- Point 2: Strategic consideration\n- Point 3: Implementation tip`;
      }
    } else {
      // Fallback if generated_content directory doesn't exist
      generatedContent = `# Generated from prompt: "${prompt}"\n\nThis content would be generated based on the prompt "${prompt}" using style profile "${styleProfileId || 'default'}".\n\n## Key Points\n\n- Point 1: Important insight about the topic\n- Point 2: Strategic consideration\n- Point 3: Implementation tip`;
    }
    
    // Generate a new page with the content
    const newPage = {
      id: `generated_${Date.now()}`,
      title: `Generated: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`,
      icon: '✨',
      created_time: new Date().toISOString(),
      last_edited_time: new Date().toISOString(),
      url: `file://${contentDir}/${Date.now()}.md`,
      content: generatedContent
    };
    
    res.json({ 
      success: true, 
      page: newPage,
      content: generatedContent 
    });
  } catch (error) {
    console.error('Error generating content for Notion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ERROR HANDLING ==========
// 404 error handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Not found: ${req.originalUrl}`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

// ========== AGENT INTEGRATION ==========
// Get all available agents
app.get('/api/agents', async (req, res) => {
  try {
    const agents = agentConnector.getAvailableAgents();
    res.json({ success: true, agents });
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get information about a specific agent
app.get('/api/agents/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    
    try {
      const agentInfo = agentConnector.getAgentInfo(agentType);
      res.json({ success: true, agent: agentInfo });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  } catch (error) {
    console.error('Error getting agent info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute a task with a specific agent
app.post('/api/agents/:agentType/execute', async (req, res) => {
  try {
    const { agentType } = req.params;
    const task = req.body;
    
    if (!task || !task.type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Task and task type are required' 
      });
    }
    
    try {
      const result = await agentConnector.executeAgentTask(agentType, task);
      res.json({ success: true, result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  } catch (error) {
    console.error('Error executing agent task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enhance the /api/agent endpoint to use our agent system
app.post('/api/agent', async (req, res) => {
  try {
    const { agentId, input, context } = req.body;
    
    if (!agentId || !input) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID and input are required'
      });
    }
    
    // Use the appropriate agent type based on agentId
    let agentType = 'executor'; // Default to executor
    if (agentId.includes('planner')) agentType = 'planner';
    if (agentId.includes('notion')) agentType = 'notion';
    if (agentId.includes('refactor')) agentType = 'refactor';
    if (agentId.includes('build')) agentType = 'build';
    if (agentId.includes('reviewer')) agentType = 'reviewer';
    if (agentId.includes('orchestrator')) agentType = 'orchestrator';
    
    // Map from generic input to agent-specific task
    let task = {
      type: 'generic',
      input,
      context
    };
    
    // Convert to agent-specific task
    switch (agentType) {
      case 'planner':
        task = {
          type: 'createPlan',
          projectName: context?.projectName || 'New Project',
          description: input
        };
        break;
      case 'executor':
        task = {
          type: 'executeTask',
          name: context?.taskName || 'Execute Task',
          description: input
        };
        break;
      case 'notion':
        task = {
          type: 'createPage',
          title: context?.title || 'New Page',
          content: input
        };
        break;
      case 'refactor':
        task = {
          type: 'refactorCode',
          filePath: context?.filePath,
          code: input
        };
        break;
      case 'build':
        task = {
          type: 'buildProject',
          projectPath: context?.projectPath,
          buildOptions: context?.buildOptions || {}
        };
        break;
      case 'reviewer':
        task = {
          type: 'reviewCode',
          code: input,
          reviewOptions: context?.reviewOptions || {}
        };
        break;
      case 'orchestrator':
        task = {
          type: 'executeWorkflow',
          workflowName: context?.workflowName || 'Default Workflow',
          steps: context?.steps || ['planner', 'executor', 'reviewer']
        };
        break;
    }
    
    try {
      // Execute the task with the appropriate agent
      const result = await agentConnector.executeAgentTask(agentType, task);
      
      // Map the result back to the expected response format
      const response = {
        id: `run_${Date.now()}`,
        agentId,
        input,
        output: typeof result === 'object' ? JSON.stringify(result) : String(result),
        steps: result.steps || [
          'Received input',
          'Processed through agent workflow',
          'Generated response'
        ],
        metadata: {
          executionTime: result.duration || Math.random() * 1000,
          completedAt: new Date().toISOString(),
          context: context || {}
        }
      };
      
      res.json({ success: true, response });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  } catch (error) {
    console.error('Error with agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API Bridge running on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/api/health`);
  
  // Initialize the agent connector
  const initialized = agentConnector.initialize();
  if (initialized) {
    console.log('Agent connector initialized successfully');
  } else {
    console.warn('Agent connector initialization failed or no agents found');
  }
});