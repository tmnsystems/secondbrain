/**
 * SecondBrain Web Interface
 * 
 * A simple web interface for the SecondBrain content generation system:
 * 1. Process content
 * 2. Generate content using different methods
 * 3. Provide feedback on generated content
 * 4. View generation history
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');

// Load the content systems
const localContextSystem = require('./local_context_system');
const styleAnalyzer = require('./style_analyzer');
const feedbackSystem = require('./feedback_system');
const contextSelector = require('./context_selector');

// Set up Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Constants
const GENERATED_CONTENT_DIR = './generated_content';
const FEEDBACK_DIR = './feedback_data';
const PROCESSED_CONTENT_DIR = './processed_content';
const PROCESSED_DATA_DIR = './processed_data';

// Create necessary directories
async function ensureDirectories() {
  try {
    await fs.mkdir('public', { recursive: true });
    await fs.mkdir(GENERATED_CONTENT_DIR, { recursive: true });
    await fs.mkdir(FEEDBACK_DIR, { recursive: true });
    await fs.mkdir(PROCESSED_CONTENT_DIR, { recursive: true });
    await fs.mkdir(PROCESSED_DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating directories:", error);
  }
}

// Create basic HTML page
async function createHtmlPage() {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecondBrain Content System</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      background-color: #f5f7fa;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 30px;
    }
    h1 {
      color: #2c3e50;
      margin-top: 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #eaeaea;
    }
    h2 {
      color: #3498db;
      margin-top: 30px;
    }
    .section {
      margin-bottom: 40px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #555;
    }
    input[type="text"], textarea, select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      font-family: inherit;
    }
    textarea {
      min-height: 120px;
    }
    button {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: #2980b9;
    }
    .card {
      border: 1px solid #eaeaea;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      background-color: white;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    .card h3 {
      margin-top: 0;
      color: #3498db;
    }
    .tab {
      overflow: hidden;
      border: 1px solid #ccc;
      background-color: #f1f1f1;
      border-radius: 4px 4px 0 0;
    }
    .tab button {
      background-color: inherit;
      float: left;
      border: none;
      outline: none;
      cursor: pointer;
      padding: 14px 16px;
      transition: 0.3s;
      font-size: 16px;
      color: #555;
    }
    .tab button:hover {
      background-color: #ddd;
    }
    .tab button.active {
      background-color: #3498db;
      color: white;
    }
    .tabcontent {
      display: none;
      padding: 20px;
      border: 1px solid #ccc;
      border-top: none;
      border-radius: 0 0 4px 4px;
      background-color: white;
    }
    .tabcontent.active {
      display: block;
    }
    #status {
      padding: 15px;
      margin-top: 20px;
      border-radius: 4px;
      display: none;
    }
    .success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    pre {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      overflow: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    #contentDisplay {
      border: 1px solid #eaeaea;
      border-radius: 4px;
      padding: 20px;
      margin-top: 20px;
      background-color: white;
      min-height: 200px;
    }
    .loader {
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 2s linear infinite;
      margin: 20px auto;
      display: none;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SecondBrain Content System</h1>
    
    <div class="tab">
      <button class="tablinks active" onclick="openTab(event, 'generate')">Generate Content</button>
      <button class="tablinks" onclick="openTab(event, 'process')">Process Content</button>
      <button class="tablinks" onclick="openTab(event, 'feedback')">Provide Feedback</button>
      <button class="tablinks" onclick="openTab(event, 'history')">Content History</button>
    </div>
    
    <div id="generate" class="tabcontent active">
      <h2>Generate Content</h2>
      <div class="form-group">
        <label for="topic">Topic:</label>
        <input type="text" id="topic" name="topic" placeholder="e.g., Business systems for service businesses">
      </div>
      
      <div class="form-group">
        <label for="contentType">Content Type:</label>
        <select id="contentType" name="contentType">
          <option value="article">Article</option>
          <option value="sop">Standard Operating Procedure</option>
          <option value="course">Course Outline</option>
          <option value="action_plan">Action Plan</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="generationMethod">Generation Method:</label>
        <select id="generationMethod" name="generationMethod">
          <option value="context">Context-Based (Default)</option>
          <option value="profile">Style Profile-Based</option>
          <option value="feedback">Feedback-Enhanced</option>
        </select>
      </div>
      
      <div class="form-group">
        <button onclick="generateContent()">Generate Content</button>
      </div>
      
      <div id="status" class=""></div>
      <div class="loader" id="generateLoader"></div>
      
      <div id="contentDisplay">
        <p>Generated content will appear here...</p>
      </div>
    </div>
    
    <div id="process" class="tabcontent">
      <h2>Process Content</h2>
      <div class="section">
        <h3>Process All Content</h3>
        <p>This will process all transcripts, blog posts, and other content for context-based generation.</p>
        <button onclick="processContent()">Process All Content</button>
        <div class="loader" id="processLoader"></div>
        <div id="processStatus" class=""></div>
      </div>
      
      <div class="section">
        <h3>Analyze Style</h3>
        <p>This will analyze the style patterns in your content to create a style profile.</p>
        <button onclick="analyzeStyle()">Analyze Style</button>
        <div class="loader" id="styleLoader"></div>
        <div id="styleStatus" class=""></div>
      </div>
    </div>
    
    <div id="feedback" class="tabcontent">
      <h2>Provide Feedback on Generated Content</h2>
      <div class="form-group">
        <label for="contentSelect">Select Generated Content:</label>
        <select id="contentSelect" name="contentSelect">
          <option value="">-- Select content --</option>
        </select>
        <button onclick="loadContentForFeedback()" style="margin-top: 10px;">Load Content</button>
      </div>
      
      <div id="feedbackContentPreview">
        <h3>Content Preview</h3>
        <pre id="contentPreview">Select content to see preview...</pre>
      </div>
      
      <div class="form-group">
        <label for="feedbackText">Your Feedback:</label>
        <textarea id="feedbackText" name="feedbackText" placeholder="Provide your feedback on the content..."></textarea>
      </div>
      
      <div class="form-group">
        <label for="rating">Rating (1-5):</label>
        <select id="rating" name="rating">
          <option value="1">1 - Poor</option>
          <option value="2">2 - Fair</option>
          <option value="3" selected>3 - Good</option>
          <option value="4">4 - Very Good</option>
          <option value="5">5 - Excellent</option>
        </select>
      </div>
      
      <div class="form-group">
        <button onclick="submitFeedback()">Submit Feedback</button>
      </div>
      
      <div class="loader" id="feedbackLoader"></div>
      <div id="feedbackStatus" class=""></div>
    </div>
    
    <div id="history" class="tabcontent">
      <h2>Content Generation History</h2>
      <button onclick="loadHistory()">Refresh History</button>
      <div id="historyContent" class="section">
        <p>Loading history...</p>
      </div>
    </div>
  </div>
  
  <script>
    // Tab functionality
    function openTab(evt, tabName) {
      var i, tabcontent, tablinks;
      tabcontent = document.getElementsByClassName("tabcontent");
      for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].className = tabcontent[i].className.replace(" active", "");
      }
      tablinks = document.getElementsByClassName("tablinks");
      for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
      }
      document.getElementById(tabName).className += " active";
      evt.currentTarget.className += " active";
      
      // Load content if needed
      if (tabName === 'history') {
        loadHistory();
      } else if (tabName === 'feedback') {
        loadContentList();
      }
    }
    
    // Generate content
    async function generateContent() {
      const topic = document.getElementById('topic').value;
      const contentType = document.getElementById('contentType').value;
      const generationMethod = document.getElementById('generationMethod').value;
      
      if (!topic) {
        showStatus('Please enter a topic', 'error');
        return;
      }
      
      showLoader('generateLoader');
      clearStatus();
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ topic, contentType, generationMethod })
        });
        
        const result = await response.json();
        
        if (result.success) {
          document.getElementById('contentDisplay').innerHTML = \`<h3>Generated Content</h3>
            <p><strong>File:</strong> \${result.contentPath}</p>
            <pre>\${result.content}</pre>\`;
          showStatus('Content generated successfully!', 'success');
        } else {
          showStatus('Error generating content: ' + result.error, 'error');
        }
      } catch (error) {
        showStatus('Error: ' + error.message, 'error');
      } finally {
        hideLoader('generateLoader');
      }
    }
    
    // Process content
    async function processContent() {
      showLoader('processLoader');
      clearStatus('processStatus');
      
      try {
        const response = await fetch('/api/process', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
          showStatus('Content processed successfully! Processed ' + result.files + ' files.', 'success', 'processStatus');
        } else {
          showStatus('Error processing content: ' + result.error, 'error', 'processStatus');
        }
      } catch (error) {
        showStatus('Error: ' + error.message, 'error', 'processStatus');
      } finally {
        hideLoader('processLoader');
      }
    }
    
    // Analyze style
    async function analyzeStyle() {
      showLoader('styleLoader');
      clearStatus('styleStatus');
      
      try {
        const response = await fetch('/api/analyze-style', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
          showStatus('Style analyzed successfully! Created profiles for ' + result.profiles + ' content items.', 'success', 'styleStatus');
        } else {
          showStatus('Error analyzing style: ' + result.error, 'error', 'styleStatus');
        }
      } catch (error) {
        showStatus('Error: ' + error.message, 'error', 'styleStatus');
      } finally {
        hideLoader('styleLoader');
      }
    }
    
    // Load content for feedback
    async function loadContentList() {
      try {
        const response = await fetch('/api/content-list');
        const result = await response.json();
        
        const selectElement = document.getElementById('contentSelect');
        // Clear existing options
        selectElement.innerHTML = '<option value="">-- Select content --</option>';
        
        if (result.success) {
          result.files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.path;
            option.textContent = file.name;
            selectElement.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading content list:', error);
      }
    }
    
    // Load content for feedback preview
    async function loadContentForFeedback() {
      const contentPath = document.getElementById('contentSelect').value;
      
      if (!contentPath) {
        return;
      }
      
      try {
        const response = await fetch(\`/api/content?path=\${encodeURIComponent(contentPath)}\`);
        const result = await response.json();
        
        if (result.success) {
          document.getElementById('contentPreview').textContent = result.content;
        } else {
          document.getElementById('contentPreview').textContent = 'Error loading content: ' + result.error;
        }
      } catch (error) {
        document.getElementById('contentPreview').textContent = 'Error: ' + error.message;
      }
    }
    
    // Submit feedback
    async function submitFeedback() {
      const contentPath = document.getElementById('contentSelect').value;
      const feedbackText = document.getElementById('feedbackText').value;
      const rating = document.getElementById('rating').value;
      
      if (!contentPath || !feedbackText) {
        showStatus('Please select content and provide feedback', 'error', 'feedbackStatus');
        return;
      }
      
      showLoader('feedbackLoader');
      clearStatus('feedbackStatus');
      
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ contentPath, feedbackText, rating })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showStatus('Feedback submitted successfully!', 'success', 'feedbackStatus');
          document.getElementById('feedbackText').value = '';
        } else {
          showStatus('Error submitting feedback: ' + result.error, 'error', 'feedbackStatus');
        }
      } catch (error) {
        showStatus('Error: ' + error.message, 'error', 'feedbackStatus');
      } finally {
        hideLoader('feedbackLoader');
      }
    }
    
    // Load history
    async function loadHistory() {
      const historyElement = document.getElementById('historyContent');
      historyElement.innerHTML = '<p>Loading history...</p>';
      
      try {
        const response = await fetch('/api/history');
        const result = await response.json();
        
        if (result.success) {
          if (result.files.length === 0) {
            historyElement.innerHTML = '<p>No generated content found.</p>';
            return;
          }
          
          let historyHtml = '<div class="section">';
          result.files.forEach(file => {
            historyHtml += \`
              <div class="card">
                <h3>\${file.name}</h3>
                <p><strong>Generated:</strong> \${new Date(file.date).toLocaleString()}</p>
                <p><strong>Type:</strong> \${file.type}</p>
                <p><strong>Path:</strong> \${file.path}</p>
                <button onclick="viewContent('\${file.path}')" style="margin-right: 10px;">View Content</button>
                <button onclick="provideFeedback('\${file.path}')">Provide Feedback</button>
              </div>
            \`;
          });
          historyHtml += '</div>';
          
          historyElement.innerHTML = historyHtml;
        } else {
          historyElement.innerHTML = '<p>Error loading history: ' + result.error + '</p>';
        }
      } catch (error) {
        historyElement.innerHTML = '<p>Error: ' + error.message + '</p>';
      }
    }
    
    // View content
    async function viewContent(contentPath) {
      try {
        const response = await fetch(\`/api/content?path=\${encodeURIComponent(contentPath)}\`);
        const result = await response.json();
        
        if (result.success) {
          // Switch to generate tab and show content
          openTab({ currentTarget: document.querySelector('.tablinks') }, 'generate');
          document.getElementById('contentDisplay').innerHTML = \`<h3>\${contentPath}</h3><pre>\${result.content}</pre>\`;
        } else {
          alert('Error loading content: ' + result.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    // Provide feedback
    function provideFeedback(contentPath) {
      // Switch to feedback tab
      openTab({ currentTarget: document.querySelectorAll('.tablinks')[2] }, 'feedback');
      
      // Set the selected content
      const selectElement = document.getElementById('contentSelect');
      for (let i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].value === contentPath) {
          selectElement.selectedIndex = i;
          break;
        }
      }
      
      // Load the content preview
      loadContentForFeedback();
    }
    
    // Helper functions
    function showStatus(message, type, elementId = 'status') {
      const statusElement = document.getElementById(elementId);
      statusElement.textContent = message;
      statusElement.className = type;
      statusElement.style.display = 'block';
    }
    
    function clearStatus(elementId = 'status') {
      const statusElement = document.getElementById(elementId);
      statusElement.textContent = '';
      statusElement.className = '';
      statusElement.style.display = 'none';
    }
    
    function showLoader(loaderId) {
      document.getElementById(loaderId).style.display = 'block';
    }
    
    function hideLoader(loaderId) {
      document.getElementById(loaderId).style.display = 'none';
    }
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
      // Show the generate tab by default
      document.getElementById('generate').className += " active";
    });
  </script>
</body>
</html>`;
  
  await fs.writeFile(path.join('public', 'index.html'), htmlContent);
}

// Routes
// Process all content
app.post('/api/process', async (req, res) => {
  try {
    const result = await localContextSystem.processAllContent();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Analyze style
app.post('/api/analyze-style', async (req, res) => {
  try {
    const result = await styleAnalyzer.analyzeContentStyle();
    res.json({
      success: true,
      profiles: result.individualProfiles || 0,
      combinedProfile: result.combinedProfilePath
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Generate content
app.post('/api/generate', async (req, res) => {
  try {
    const { topic, contentType, generationMethod } = req.body;
    
    if (!topic) {
      return res.json({ success: false, error: "Topic is required" });
    }
    
    let result;
    
    switch (generationMethod) {
      case 'profile':
        result = await styleAnalyzer.generateWithStyleProfile(topic, contentType);
        break;
      case 'feedback':
        result = await feedbackSystem.generateWithFeedback(topic, contentType, localContextSystem);
        break;
      case 'context':
      default:
        result = await localContextSystem.generateWithContext(topic, contentType);
        break;
    }
    
    if (result.success) {
      // Read the generated content for response
      const content = await fs.readFile(result.contentPath, 'utf-8');
      
      res.json({
        success: true,
        content,
        contentPath: path.basename(result.contentPath),
        method: generationMethod
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get content list for feedback
app.get('/api/content-list', async (req, res) => {
  try {
    const files = await fs.readdir(GENERATED_CONTENT_DIR);
    const contentFiles = files
      .filter(file => file.endsWith('.md') && !file.includes('brief') && !file.includes('context'))
      .map(file => ({
        name: file,
        path: path.join(GENERATED_CONTENT_DIR, file)
      }));
    
    res.json({ success: true, files: contentFiles });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get content
app.get('/api/content', async (req, res) => {
  try {
    const contentPath = req.query.path;
    
    if (!contentPath) {
      return res.json({ success: false, error: "Content path is required" });
    }
    
    const content = await fs.readFile(contentPath, 'utf-8');
    
    res.json({ success: true, content });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Submit feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { contentPath, feedbackText, rating } = req.body;
    
    if (!contentPath || !feedbackText) {
      return res.json({ success: false, error: "Content path and feedback text are required" });
    }
    
    const result = await feedbackSystem.recordFeedback(contentPath, feedbackText, parseInt(rating) || 0);
    
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get history
app.get('/api/history', async (req, res) => {
  try {
    const files = await fs.readdir(GENERATED_CONTENT_DIR);
    
    // Get details for each file
    const fileDetails = await Promise.all(
      files
        .filter(file => file.endsWith('.md') && !file.includes('brief') && !file.includes('context'))
        .map(async (file) => {
          const filePath = path.join(GENERATED_CONTENT_DIR, file);
          const stats = await fs.stat(filePath);
          
          // Extract content type from filename
          let type = 'article';
          if (file.includes('_sop_')) type = 'SOP';
          else if (file.includes('_course_')) type = 'Course';
          else if (file.includes('_action_plan_') || file.includes('_plan_')) type = 'Action Plan';
          
          return {
            name: file,
            path: filePath,
            date: stats.mtime,
            type
          };
        })
    );
    
    // Sort by date, newest first
    fileDetails.sort((a, b) => b.date - a.date);
    
    res.json({ success: true, files: fileDetails });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
async function startServer() {
  try {
    await ensureDirectories();
    await createHtmlPage();
    
    app.listen(port, () => {
      console.log(`SecondBrain Web Interface running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

// If run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };