const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Create a simple Express app
const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const topicDbDir = path.join(__dirname, '..', '..', 'topic_database');
const topicsDbFile = path.join(topicDbDir, 'topics_database.json');

// Define routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Topics API is running' });
});

app.get('/topics', (req, res) => {
  try {
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

app.get('/topics/:topic', (req, res) => {
  try {
    const { topic } = req.params;
    
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

app.get('/topic-analyzer/status', (req, res) => {
  try {
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

// Start the server on a different port
const port = 3031;
app.listen(port, () => {
  console.log(`Topics API running on port ${port}`);
  console.log(`Test the API at: http://localhost:${port}/topics`);
});